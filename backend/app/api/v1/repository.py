"""Standards repository: frameworks, requirements, knowledge documents, content-pack reload, regulatory watch."""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import FileResponse

from app.api.deps import DB, Org, Who
from app.api.schemas import KnowledgeDocIn
from app.core.security import require_roles
from app.db.models import Framework, KnowledgeDocument, Requirement
from app.db.session import SessionLocal
from app.services.library import DOC_TYPE as LIBRARY, import_library, library_tree, resolve
from app.services.repository import framework_summary, load_content_packs, regulatory_watch

router = APIRouter(tags=["repository"])


@router.get("/frameworks")
def frameworks(db: DB, who: Who):
    return framework_summary(db)


@router.get("/frameworks/{framework_id}/requirements")
def requirements(db: DB, who: Who, framework_id: str, domain: str | None = None):
    fw = db.get(Framework, framework_id)
    if not fw:
        raise HTTPException(404, "Framework not found")
    rows = [r for r in fw.requirements if not domain or r.domain == domain]
    return [{"id": r.id, "ref": r.ref, "title": r.title, "text": r.text, "domain": r.domain, "kind": r.kind, "crosswalk": r.crosswalk} for r in rows]


@router.get("/repository/search")
def search(db: DB, org: Org, q: str = Query(min_length=2), limit: int = 30):
    from app.ai.agents.skills import retrieve

    return retrieve(db, q, limit=limit, org_id=org.id)


@router.post("/repository/reload", dependencies=[Depends(require_roles("ciso"))])
def reload(db: DB, force: bool = False):
    return load_content_packs(db, force=force)


@router.post("/repository/watch", dependencies=[Depends(require_roles("ciso", "analyst"))])
async def watch(db: DB, org: Org):
    return {"changes": await regulatory_watch(db, org.id)}


@router.get("/repository/documents")
def documents(db: DB, org: Org, framework_id: str | None = None):
    q = db.query(KnowledgeDocument).filter((KnowledgeDocument.org_id == org.id) | (KnowledgeDocument.org_id.is_(None)),
                                           KnowledgeDocument.doc_type != LIBRARY)
    if framework_id:
        q = q.filter_by(framework_id=framework_id)
    return [{"id": d.id, "title": d.title, "doc_type": d.doc_type, "language": d.language, "framework_id": d.framework_id,
             "source_url": d.source_url, "tags": d.tags, "chars": len(d.text), "updated_at": d.updated_at} for d in q.all()]


@router.post("/repository/documents", status_code=201, dependencies=[Depends(require_roles("ciso", "analyst"))])
def add_document(db: DB, org: Org, who: Who, body: KnowledgeDocIn, global_scope: bool = False):
    import hashlib

    d = KnowledgeDocument(org_id=None if (global_scope and who.role == "ciso") else org.id, **body.model_dump(),
                          sha256=hashlib.sha256(body.text.encode()).hexdigest())
    db.add(d)
    db.commit()
    return {"id": d.id}


@router.get("/repository/documents/{doc_id}")
def get_document(db: DB, org: Org, doc_id: str):
    d = db.get(KnowledgeDocument, doc_id)
    if not d or (d.org_id and d.org_id != org.id):
        raise HTTPException(404, "Not found")
    return {"id": d.id, "title": d.title, "text": d.text, "framework_id": d.framework_id, "source_url": d.source_url, "tags": d.tags,
            "doc_type": d.doc_type, "file_path": d.file_path if d.doc_type == LIBRARY else None}


# ---- document library (local folder mounted read-only, see app.services.library)
@router.get("/repository/library/tree")
def library_folders(db: DB, who: Who):
    return library_tree(db)


@router.get("/repository/library/documents")
def library_documents(db: DB, who: Who, folder: str = "", q: str = "", offset: int = 0, limit: int = Query(100, le=500)):
    query = db.query(KnowledgeDocument).filter(KnowledgeDocument.doc_type == LIBRARY, KnowledgeDocument.org_id.is_(None))
    if folder:
        query = query.filter(KnowledgeDocument.file_path.like(folder.replace("%", r"\%").replace("_", r"\_") + "/%", escape="\\"))
    if q:
        query = query.filter(KnowledgeDocument.title.ilike(f"%{q}%") | KnowledgeDocument.text.ilike(f"%{q}%"))
    total = query.count()
    rows = query.order_by(KnowledgeDocument.file_path).offset(offset).limit(limit).all()
    return {"total": total, "items": [{"id": d.id, "title": d.title, "path": d.file_path, "language": d.language, "tags": d.tags,
                                       "chars": len(d.text)} for d in rows]}


@router.get("/repository/library/file/{doc_id}")
def library_file(db: DB, who: Who, doc_id: str):
    d = db.get(KnowledgeDocument, doc_id)
    path = resolve(d.file_path) if d and d.doc_type == LIBRARY else None
    if not path:
        raise HTTPException(404, "File not available")
    return FileResponse(path, filename=path.name)


def _import_job() -> None:
    db = SessionLocal()
    try:
        import_library(db)
    finally:
        db.close()


@router.post("/repository/library/import", status_code=202, dependencies=[Depends(require_roles("ciso"))])
def library_import(bg: BackgroundTasks):
    bg.add_task(_import_job)
    return {"status": "started"}


# ---- GRC Library & Viewer integration
@router.get("/repository/viewer.html")
def get_viewer_html():
    content_dir = Path("/Users/fgpaulos/CISO PROJECT/ciso-nexus/backend/app/content")
    viewer_path = content_dir / "viewer.html"
    if not viewer_path.is_file():
        viewer_path = Path("/Users/fgpaulos/CISO PROJECT/viewer.html")
    if not viewer_path.is_file():
        raise HTTPException(404, "viewer.html not found")
    return FileResponse(viewer_path, media_type="text/html")


@router.get("/repository/grc/meta")
def grc_meta():
    content_dir = Path("/Users/fgpaulos/CISO PROJECT/ciso-nexus/backend/app/content")
    meta_path = content_dir / "grc_meta.json"
    if meta_path.is_file():
        return json.loads(meta_path.read_text(encoding="utf-8"))
    return {"built": "2026-10-27", "frameworks_count": 322, "drive_count": 5452, "obligations_count": 1484}


@router.get("/repository/grc/obligations")
def grc_obligations(q: str = "", law: str = "", topic: str = "", offset: int = 0, limit: int = Query(50, le=200)):
    content_dir = Path("/Users/fgpaulos/CISO PROJECT/ciso-nexus/backend/app/content")
    obl_path = content_dir / "grc_obligations.json"
    if not obl_path.is_file():
        return {"cols": [], "rows": [], "total": 0}
    data = json.loads(obl_path.read_text(encoding="utf-8"))
    cols = data.get("cols", [])
    rows = data.get("rows", [])
    col_idx = {c: i for i, c in enumerate(cols)}

    filtered = rows
    if law:
        l_idx = col_idx.get("law", 1)
        filtered = [r for r in filtered if law.lower() in str(r[l_idx]).lower()]
    if topic:
        t_idx = col_idx.get("topic", 4)
        filtered = [r for r in filtered if topic.lower() in str(r[t_idx]).lower()]
    if q:
        q_lower = q.lower()
        filtered = [r for r in filtered if any(q_lower in str(cell).lower() for cell in r)]

    total = len(filtered)
    page_rows = filtered[offset : offset + limit]
    return {"cols": cols, "rows": page_rows, "total": total}


@router.get("/repository/grc/drive")
def grc_drive(q: str = "", category: str = "", offset: int = 0, limit: int = Query(50, le=200)):
    content_dir = Path("/Users/fgpaulos/CISO PROJECT/ciso-nexus/backend/app/content")
    drive_path = content_dir / "grc_drive.json"
    if not drive_path.is_file():
        return {"items": [], "total": 0}
    items = json.loads(drive_path.read_text(encoding="utf-8"))

    filtered = items
    if category:
        c_lower = category.lower()
        filtered = [it for it in filtered if len(it) > 2 and c_lower in str(it[2]).lower()]
    if q:
        q_lower = q.lower()
        filtered = [it for it in filtered if any(q_lower in str(cell).lower() for cell in it)]

    total = len(filtered)
    page_items = filtered[offset : offset + limit]
    return {"items": page_items, "total": total}
