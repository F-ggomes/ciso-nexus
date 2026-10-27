"""ISMS scope, assets, controls (SoA) and gap assessments."""
from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request

from app.api.deps import DB, Org, Who, audit
from app.api.schemas import AssetIn, AssetUpdate, ControlUpdate, ISMSBootstrapIn, ScopeUpdate
from app.core.security import require_roles
from app.db.models import Asset, Control, GapAssessment, ISMSScope, Requirement
from app.services.gap_analysis import run_gap_assessment
from app.services.isms import bootstrap, recommend_frameworks

router = APIRouter(prefix="/isms", tags=["isms"])


@router.get("/recommend")
def recommend(org: Org):
    return {"organization": org.name, "recommended": recommend_frameworks(org)}


@router.post("/bootstrap", dependencies=[Depends(require_roles("ciso"))])
def do_bootstrap(db: DB, org: Org, who: Who, request: Request, body: ISMSBootstrapIn):
    result = bootstrap(db, org, body.framework_ids, body.scope_statement, who.sub, body.language)
    audit(db, request, who.sub, "isms.bootstrap", org_id=org.id, **{k: v for k, v in result.items() if k != "frameworks"})
    return result


@router.get("/scope")
def get_scope(db: DB, org: Org):
    s = db.query(ISMSScope).filter_by(org_id=org.id).first()
    if not s:
        return None
    return {"id": s.id, "statement": s.statement, "boundaries": s.boundaries, "applicable_frameworks": s.applicable_frameworks,
            "interested_parties": s.interested_parties, "risk_appetite": s.risk_appetite, "status": s.status,
            "approved_by": s.approved_by, "approved_at": s.approved_at}


@router.patch("/scope", dependencies=[Depends(require_roles("ciso", "analyst"))])
def update_scope(db: DB, org: Org, body: ScopeUpdate):
    s = db.query(ISMSScope).filter_by(org_id=org.id).first()
    if not s:
        raise HTTPException(404, "Run /isms/bootstrap first")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(s, k, v)
    s.status = "draft"
    db.commit()
    return {"ok": True}


@router.post("/scope/approve", dependencies=[Depends(require_roles("ciso"))])
def approve_scope(db: DB, org: Org, who: Who):
    s = db.query(ISMSScope).filter_by(org_id=org.id).first()
    if not s:
        raise HTTPException(404, "No scope")
    s.status, s.approved_by, s.approved_at = "approved", who.sub, datetime.now(UTC)
    db.commit()
    return {"ok": True}


# ---- assets
@router.get("/assets")
def assets(db: DB, org: Org, asset_type: str | None = None):
    q = db.query(Asset).filter_by(org_id=org.id)
    if asset_type:
        q = q.filter_by(asset_type=asset_type)
    return [{"id": a.id, "name": a.name, "asset_type": a.asset_type, "owner": a.owner, "classification": a.classification, "cia": a.cia,
             "criticality": a.criticality, "supports_critical_function": a.supports_critical_function, "location": a.location,
             "external_system": a.external_system, "external_id": a.external_id, "updated_at": a.updated_at} for a in q.all()]


@router.post("/assets", status_code=201, dependencies=[Depends(require_roles("ciso", "analyst", "owner"))])
def create_asset(db: DB, org: Org, body: AssetIn):
    a = Asset(org_id=org.id, **body.model_dump())
    db.add(a)
    db.commit()
    return {"id": a.id}


@router.patch("/assets/{asset_id}", dependencies=[Depends(require_roles("ciso", "analyst", "owner"))])
def update_asset(db: DB, org: Org, asset_id: str, body: AssetUpdate):
    a = db.query(Asset).filter_by(org_id=org.id, id=asset_id).first()
    if not a:
        raise HTTPException(404, "Asset not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(a, k, v)
    db.commit()
    return {"ok": True}


# ---- controls / SoA
@router.get("/controls")
def controls(db: DB, org: Org, framework_id: str | None = None, status: str | None = None):
    q = db.query(Control).filter_by(org_id=org.id)
    if status:
        q = q.filter_by(status=status)
    rows = q.all()
    out = []
    for c in rows:
        if framework_id and c.requirement.framework_id != framework_id:
            continue
        out.append({"id": c.id, "framework_id": c.requirement.framework_id, "ref": c.requirement.ref, "title": c.requirement.title,
                    "domain": c.requirement.domain, "applicable": c.applicable, "justification": c.justification, "status": c.status,
                    "maturity": c.maturity, "owner": c.owner, "evidence_count": len(c.evidence), "last_reviewed_at": c.last_reviewed_at})
    return out


@router.patch("/controls/{control_id}", dependencies=[Depends(require_roles("ciso", "analyst", "owner"))])
def update_control(db: DB, org: Org, control_id: str, body: ControlUpdate):
    c = db.query(Control).filter_by(org_id=org.id, id=control_id).first()
    if not c:
        raise HTTPException(404, "Control not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(c, k, v)
    c.last_reviewed_at = datetime.now(UTC)
    db.commit()
    return {"ok": True}


# ---- gap assessments
@router.post("/gap/{framework_id}", dependencies=[Depends(require_roles("ciso", "analyst"))])
def run_gap(db: DB, org: Org, framework_id: str, create_tasks: bool = True):
    try:
        ga = run_gap_assessment(db, org.id, framework_id, create_tasks=create_tasks)
    except ValueError as exc:
        raise HTTPException(404, str(exc))
    return {"id": ga.id, "coverage_pct": ga.coverage_pct, "summary": ga.summary, "items": len(ga.items)}


@router.get("/gap")
def list_gaps(db: DB, org: Org):
    return [{"id": g.id, "framework_id": g.framework_id, "title": g.title, "coverage_pct": g.coverage_pct, "summary": g.summary,
             "created_at": g.created_at, "items": len(g.items)} for g in
            db.query(GapAssessment).filter_by(org_id=org.id).order_by(GapAssessment.created_at.desc()).all()]


@router.get("/gap/{assessment_id}")
def gap_detail(db: DB, org: Org, assessment_id: str):
    g = db.query(GapAssessment).filter_by(org_id=org.id, id=assessment_id).first()
    if not g:
        raise HTTPException(404, "Not found")
    items = []
    for it in g.items:
        req = db.get(Requirement, it.requirement_id)
        if not req:
            continue
        items.append({"ref": req.ref, "title": req.title, "domain": req.domain, "status": it.current_status, "severity": it.gap_severity,
                      "recommendation": it.recommendation, "task_id": it.task_id})
    return {"id": g.id, "title": g.title, "coverage_pct": g.coverage_pct, "summary": g.summary, "items": items}
