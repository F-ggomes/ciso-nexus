from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import DB, Org, Who
from app.api.schemas import PolicyDraftIn, PolicyIn, PolicyVersionIn
from app.core.security import require_roles
from app.db.models import Policy, PolicyAttestation, PolicyVersion
from app.services.policy_generator import approve, draft_policy
from app.services.templates import list_templates, render_for_policy

router = APIRouter(prefix="/policies", tags=["policies"])


def _out(p: Policy) -> dict:
    return {"id": p.id, "code": p.code, "title": p.title, "doc_kind": p.doc_kind, "language": p.language, "owner": p.owner, "status": p.status,
            "current_version": p.current_version, "review_cycle_months": p.review_cycle_months, "next_review_at": p.next_review_at,
            "requirement_refs": p.requirement_refs, "updated_at": p.updated_at}


@router.get("/templates")
def templates(who: Who):
    """Available document templates (generic per kind and code-specific), pt-PT."""
    return [{"file": t["file"], "kind": t["kind"], "code": t["code"], "title": t["title"], "language": t["language"], "generic": t["generic"],
             "preview": t["body"][:400]} for t in list_templates()]


@router.get("/templates/{file}")
def template_body(who: Who, file: str):
    t = next((x for x in list_templates() if x["file"] == file), None)
    if not t:
        raise HTTPException(404, "Template not found")
    return t


@router.get("")
def list_policies(db: DB, org: Org, doc_kind: str | None = None, status: str | None = None):
    q = db.query(Policy).filter_by(org_id=org.id)
    if doc_kind:
        q = q.filter_by(doc_kind=doc_kind)
    if status:
        q = q.filter_by(status=status)
    return [_out(p) for p in q.order_by(Policy.code).all()]


@router.post("", status_code=201, dependencies=[Depends(require_roles("ciso", "analyst"))])
def create_policy(db: DB, org: Org, who: Who, body: PolicyIn):
    if db.query(Policy).filter_by(org_id=org.id, code=body.code).first():
        raise HTTPException(409, "Code already exists")
    p = Policy(org_id=org.id, **body.model_dump())
    db.add(p)
    db.flush()
    content = render_for_policy(db, org, p, author=who.sub)
    db.add(PolicyVersion(policy_id=p.id, version=1, content_md=content, change_note="created from template", author=who.sub,
                         sha256=hashlib.sha256(content.encode()).hexdigest()))
    db.commit()
    return _out(p)


@router.get("/{policy_id}")
def get_policy(db: DB, org: Org, policy_id: str, version: int | None = None):
    p = db.query(Policy).filter_by(org_id=org.id, id=policy_id).first()
    if not p:
        raise HTTPException(404, "Not found")
    v = next((x for x in p.versions if x.version == (version or p.current_version)), None)
    return {**_out(p), "content_md": v.content_md if v else "", "version_meta": {
        "version": v.version, "author": v.author, "ai_generated": v.ai_generated, "created_at": v.created_at, "approved_by": v.approved_by,
        "approved_at": v.approved_at, "sha256": v.sha256, "change_note": v.change_note} if v else None,
        "versions": [{"version": x.version, "created_at": x.created_at, "author": x.author, "ai_generated": x.ai_generated,
                      "approved_at": x.approved_at, "change_note": x.change_note} for x in sorted(p.versions, key=lambda x: x.version)]}


@router.post("/{policy_id}/draft", dependencies=[Depends(require_roles("ciso", "analyst"))])
async def ai_draft(db: DB, org: Org, who: Who, policy_id: str, body: PolicyDraftIn):
    p = db.query(Policy).filter_by(org_id=org.id, id=policy_id).first()
    if not p:
        raise HTTPException(404, "Not found")
    v = await draft_policy(db, org, p, who.sub, body.instructions, preferred=body.provider)
    return {"version": v.version, "content_md": v.content_md, "sha256": v.sha256}


@router.post("/{policy_id}/versions", dependencies=[Depends(require_roles("ciso", "analyst"))])
def new_version(db: DB, org: Org, who: Who, policy_id: str, body: PolicyVersionIn):
    p = db.query(Policy).filter_by(org_id=org.id, id=policy_id).first()
    if not p:
        raise HTTPException(404, "Not found")
    v = PolicyVersion(policy_id=p.id, version=p.current_version + 1, content_md=body.content_md, change_note=body.change_note, author=who.sub,
                      sha256=hashlib.sha256(body.content_md.encode()).hexdigest())
    p.current_version = v.version
    p.status = "in_review" if p.status == "approved" else p.status
    db.add(v)
    db.commit()
    return {"version": v.version}


@router.post("/{policy_id}/submit", dependencies=[Depends(require_roles("ciso", "analyst"))])
def submit(db: DB, org: Org, policy_id: str):
    p = db.query(Policy).filter_by(org_id=org.id, id=policy_id).first()
    if not p:
        raise HTTPException(404, "Not found")
    p.status = "in_review"
    db.commit()
    return {"status": p.status}


@router.post("/{policy_id}/approve", dependencies=[Depends(require_roles("ciso"))])
def approve_policy(db: DB, org: Org, who: Who, policy_id: str):
    p = db.query(Policy).filter_by(org_id=org.id, id=policy_id).first()
    if not p:
        raise HTTPException(404, "Not found")
    approve(db, p, who.sub)
    return _out(p)


@router.post("/{policy_id}/attest")
def attest(db: DB, org: Org, who: Who, policy_id: str):
    p = db.query(Policy).filter_by(org_id=org.id, id=policy_id).first()
    if not p or p.status != "approved":
        raise HTTPException(400, "Only approved policies can be attested")
    db.add(PolicyAttestation(policy_id=p.id, version=p.current_version, user_email=who.sub))
    db.commit()
    return {"attested_at": datetime.now(timezone.utc)}


@router.get("/{policy_id}/attestations")
def attestations(db: DB, org: Org, policy_id: str):
    p = db.query(Policy).filter_by(org_id=org.id, id=policy_id).first()
    if not p:
        raise HTTPException(404, "Not found")
    return [{"user": a.user_email, "version": a.version, "attested_at": a.attested_at}
            for a in db.query(PolicyAttestation).filter_by(policy_id=p.id).all()]
