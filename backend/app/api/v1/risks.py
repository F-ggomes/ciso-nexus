from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request

from app.ai.agents import RiskAnalyst
from app.api.deps import DB, Org, Who, audit
from app.api.schemas import FindingIn, RiskAcceptIn, RiskIn, RiskUpdate
from app.core.security import require_roles
from app.db.models import Risk, Task
from app.services.risk_engine import acceptance_allowed, appetite_for, compute, heatmap

router = APIRouter(prefix="/risks", tags=["risks"])


def _out(r: Risk) -> dict:
    return {"id": r.id, "title": r.title, "description": r.description, "category": r.category, "asset_id": r.asset_id, "threat": r.threat,
            "vulnerability": r.vulnerability, "likelihood": r.likelihood, "impact": r.impact, "inherent_score": r.inherent_score,
            "residual_likelihood": r.residual_likelihood, "residual_impact": r.residual_impact, "residual_score": r.residual_score,
            "level": r.level, "treatment": r.treatment, "treatment_plan": r.treatment_plan, "control_ids": r.control_ids, "owner": r.owner,
            "vendor_id": r.vendor_id, "external_system": r.external_system, "external_id": r.external_id, "accepted_by": r.accepted_by,
            "accepted_until": r.accepted_until, "review_at": r.review_at, "created_at": r.created_at}


@router.get("")
def list_risks(db: DB, org: Org, treatment: str | None = None, level: str | None = None, limit: int = 500):
    q = db.query(Risk).filter_by(org_id=org.id)
    if treatment:
        q = q.filter_by(treatment=treatment)
    if level:
        q = q.filter_by(level=level)
    return [_out(r) for r in q.order_by(Risk.inherent_score.desc()).limit(limit).all()]


@router.get("/heatmap")
def risk_heatmap(db: DB, org: Org):
    rows = db.query(Risk).filter(Risk.org_id == org.id, Risk.treatment != "closed").all()
    return {"matrix": heatmap(rows), "appetite": appetite_for(db, org.id)}


@router.post("", status_code=201, dependencies=[Depends(require_roles("ciso", "analyst", "owner"))])
def create_risk(db: DB, org: Org, who: Who, body: RiskIn):
    data = body.model_dump()
    actions = data.pop("actions") or []
    r = compute(Risk(org_id=org.id, **data), appetite_for(db, org.id))
    db.add(r)
    db.flush()
    for a in actions:
        db.add(Task(org_id=org.id, title=str(a.get("action", "Treatment action"))[:500], description=f"Risk: {r.title}. Owner role: {a.get('owner_role', '')}",
                    status="todo", priority="high" if r.level in ("high", "critical") else "medium", related_kind="risk", related_id=r.id,
                    due_at=datetime.now(UTC) + timedelta(days=int(a.get("due_days", 30)))))
    db.commit()
    return _out(r)


@router.patch("/{risk_id}", dependencies=[Depends(require_roles("ciso", "analyst", "owner"))])
def update_risk(db: DB, org: Org, risk_id: str, body: RiskUpdate):
    r = db.query(Risk).filter_by(org_id=org.id, id=risk_id).first()
    if not r:
        raise HTTPException(404, "Not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(r, k, v)
    compute(r, appetite_for(db, org.id))
    db.commit()
    return _out(r)


@router.post("/{risk_id}/accept", dependencies=[Depends(require_roles("ciso", "analyst", "owner"))])
def accept_risk(db: DB, org: Org, who: Who, request: Request, risk_id: str, body: RiskAcceptIn):
    r = db.query(Risk).filter_by(org_id=org.id, id=risk_id).first()
    if not r:
        raise HTTPException(404, "Not found")
    ok, why = acceptance_allowed(r, appetite_for(db, org.id), who.role)
    if not ok:
        raise HTTPException(403, why)
    r.treatment, r.accepted_by = "accept", who.sub
    r.accepted_until = body.accepted_until or datetime.now(UTC) + timedelta(days=365)
    r.treatment_plan = (r.treatment_plan + "\n" if r.treatment_plan else "") + f"Accepted by {who.sub}: {body.justification}"
    db.commit()
    audit(db, request, who.sub, "risk.accepted", org_id=org.id, risk_id=r.id, level=r.level)
    return _out(r)


@router.post("/from-finding", dependencies=[Depends(require_roles("ciso", "analyst"))])
async def from_finding(db: DB, org: Org, who: Who, body: FindingIn):
    appetite = appetite_for(db, org.id)
    draft = await RiskAnalyst().from_finding(db, body.finding, {"organization": org.name, "sector": org.sector, "appetite": appetite}, who.sub, org_id=org.id)
    return draft
