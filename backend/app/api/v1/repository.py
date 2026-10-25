"""Standards repository: frameworks, requirements, knowledge documents, content-pack reload, regulatory watch."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import DB, Org, Who
from app.api.schemas import KnowledgeDocIn
from app.core.security import require_roles
from app.db.models import Framework, KnowledgeDocument, Requirement
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
    q = db.query(KnowledgeDocument).filter((KnowledgeDocument.org_id == org.id) | (KnowledgeDocument.org_id.is_(None)))
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
    return {"id": d.id, "title": d.title, "text": d.text, "framework_id": d.framework_id, "source_url": d.source_url, "tags": d.tags}
