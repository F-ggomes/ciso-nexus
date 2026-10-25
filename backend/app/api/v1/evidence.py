from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.ai.agents import EvidenceMapper
from app.api.deps import DB, Org, Who
from app.core.security import require_roles
from app.db.models import Control, Evidence, Vendor
from app.services.evidence import candidate_controls, store_upload

router = APIRouter(prefix="/evidence", tags=["evidence"])


def _out(e: Evidence) -> dict:
    return {"id": e.id, "source": e.source, "source_ref": e.source_ref, "title": e.title, "collected_at": e.collected_at, "result": e.result,
            "sha256": e.sha256, "control_id": e.control_id, "control_ref": e.control.requirement.ref if e.control else None,
            "mime_type": e.mime_type, "size_bytes": e.size_bytes, "has_file": bool(e.file_path), "valid_until": e.valid_until,
            "ai_mapping_confidence": e.ai_mapping_confidence}


@router.get("")
def list_evidence(db: DB, org: Org, result: str | None = None, source: str | None = None, control_id: str | None = None, limit: int = 500):
    q = db.query(Evidence).filter_by(org_id=org.id)
    if result:
        q = q.filter_by(result=result)
    if source:
        q = q.filter_by(source=source)
    if control_id:
        q = q.filter_by(control_id=control_id)
    return [_out(e) for e in q.order_by(Evidence.collected_at.desc()).limit(limit).all()]


@router.post("/upload", status_code=201, dependencies=[Depends(require_roles("ciso", "analyst", "owner"))])
async def upload(db: DB, org: Org, file: Annotated[UploadFile, File()], title: Annotated[str | None, Form()] = None,
                 control_id: Annotated[str | None, Form()] = None, result: Annotated[str, Form()] = "info",
                 vendor_id: Annotated[str | None, Form()] = None):
    if control_id and not db.query(Control).filter_by(org_id=org.id, id=control_id).first():
        raise HTTPException(404, "Control not found")
    if vendor_id and not db.query(Vendor).filter_by(org_id=org.id, id=vendor_id).first():
        raise HTTPException(404, "Vendor not found")
    data = await file.read()
    try:
        ev = store_upload(db, org.id, file.filename or "upload", file.content_type or "application/octet-stream", data, title, control_id, result)
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    if vendor_id:
        ev.payload = {**ev.payload, "vendor_id": vendor_id}
        db.commit()
    return _out(ev)


@router.get("/{evidence_id}")
def get_evidence(db: DB, org: Org, evidence_id: str):
    e = db.query(Evidence).filter_by(org_id=org.id, id=evidence_id).first()
    if not e:
        raise HTTPException(404, "Not found")
    return {**_out(e), "payload": e.payload, "extracted_text": e.extracted_text[:20_000]}


@router.get("/{evidence_id}/file", dependencies=[Depends(require_roles("ciso", "analyst", "auditor", "owner"))])
def download(db: DB, org: Org, evidence_id: str):
    e = db.query(Evidence).filter_by(org_id=org.id, id=evidence_id).first()
    if not e or not e.file_path:
        raise HTTPException(404, "No file")
    return FileResponse(e.file_path, media_type=e.mime_type or "application/octet-stream", filename=e.payload.get("original_name", "evidence"))


@router.post("/{evidence_id}/map", dependencies=[Depends(require_roles("ciso", "analyst"))])
async def ai_map(db: DB, org: Org, who: Who, evidence_id: str, apply: bool = False):
    e = db.query(Evidence).filter_by(org_id=org.id, id=evidence_id).first()
    if not e:
        raise HTTPException(404, "Not found")
    ev = {"source": e.source, "source_ref": e.source_ref, "title": e.title, "result": e.result,
          "payload_excerpt": (e.extracted_text or "")[:12_000]}
    result = await EvidenceMapper().map(db, ev, candidate_controls(db, org.id), who.sub, org_id=org.id)
    mappings = result.get("mappings", [])
    if apply and mappings:
        best = max(mappings, key=lambda m: m.get("confidence", 0))
        ctrl = next((c for c in db.query(Control).filter_by(org_id=org.id).all()
                     if c.requirement.ref == best.get("control_ref") and c.requirement.framework_id == best.get("framework")), None)
        if ctrl:
            e.control_id, e.ai_mapping_confidence, e.result = ctrl.id, float(best.get("confidence", 0)), best.get("result", e.result)
            db.commit()
    return result
