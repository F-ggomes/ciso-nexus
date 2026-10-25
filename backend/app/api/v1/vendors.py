from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response

from app.ai.agents import TPRMAnalyst
from app.api.deps import DB, Org, Who
from app.api.schemas import VendorAssessIn, VendorIn, VendorUpdate
from app.core.security import require_roles
from app.db.models import Evidence, Vendor
from app.services.reporting import roi_rows, to_csv, to_xlsx

router = APIRouter(prefix="/vendors", tags=["third-party risk"])
_REASSESS_MONTHS = {1: 12, 2: 12, 3: 24, 4: 36}


def _out(v: Vendor) -> dict:
    return {"id": v.id, "name": v.name, "lei": v.lei, "country": v.country, "tier": v.tier, "supports_critical_function": v.supports_critical_function,
            "service_type": v.service_type, "sub_outsourcing": v.sub_outsourcing, "subcontractors": v.subcontractors, "data_location": v.data_location,
            "personal_data": v.personal_data, "contract_ref": v.contract_ref, "contract_start": v.contract_start, "contract_end": v.contract_end,
            "notice_period_days": v.notice_period_days, "art30_provisions": v.art30_provisions, "exit_strategy": v.exit_strategy,
            "substitutable": v.substitutable, "inherent_score": v.inherent_score, "residual_score": v.residual_score,
            "last_assessment_at": v.last_assessment_at, "next_assessment_at": v.next_assessment_at, "external_rating": v.external_rating,
            "external_system": v.external_system, "external_id": v.external_id}


@router.get("")
def list_vendors(db: DB, org: Org, tier: int | None = None):
    q = db.query(Vendor).filter_by(org_id=org.id)
    if tier:
        q = q.filter_by(tier=tier)
    return [_out(v) for v in q.order_by(Vendor.tier, Vendor.name).all()]


@router.post("", status_code=201, dependencies=[Depends(require_roles("ciso", "analyst"))])
def create_vendor(db: DB, org: Org, body: VendorIn):
    v = Vendor(org_id=org.id, **body.model_dump())
    v.next_assessment_at = datetime.now(timezone.utc) + timedelta(days=30)
    db.add(v)
    db.commit()
    return _out(v)


@router.patch("/{vendor_id}", dependencies=[Depends(require_roles("ciso", "analyst"))])
def update_vendor(db: DB, org: Org, vendor_id: str, body: VendorUpdate):
    v = db.query(Vendor).filter_by(org_id=org.id, id=vendor_id).first()
    if not v:
        raise HTTPException(404, "Not found")
    for k, val in body.model_dump(exclude_unset=True).items():
        setattr(v, k, val)
    db.commit()
    return _out(v)


@router.post("/{vendor_id}/assess", dependencies=[Depends(require_roles("ciso", "analyst"))])
async def assess(db: DB, org: Org, who: Who, vendor_id: str, body: VendorAssessIn):
    v = db.query(Vendor).filter_by(org_id=org.id, id=vendor_id).first()
    if not v:
        raise HTTPException(404, "Not found")
    content = body.assessment_content
    if not content:
        # fall back to uploaded evidence linked to this vendor (questionnaires, SOC 2, ISO certificates)
        docs = db.query(Evidence).filter(Evidence.org_id == org.id, Evidence.source == "upload",
                                         Evidence.payload["vendor_id"].as_string() == v.id).limit(10).all()
        content = "\n\n".join(d.extracted_text[:30_000] for d in docs)
    result = await TPRMAnalyst().assess(db, _out(v), content, who.sub, org_id=org.id)
    if body.apply and result:
        v.tier = int(result.get("tier") or v.tier)
        v.supports_critical_function = bool(result.get("supports_critical_function", v.supports_critical_function))
        v.inherent_score = result.get("inherent_score") or v.inherent_score
        v.residual_score = result.get("residual_score") or v.residual_score
        v.art30_provisions = {p["provision"]: p.get("status", "unknown") for p in result.get("art30_provisions", []) if "provision" in p}
        v.last_assessment_at = datetime.now(timezone.utc)
        v.next_assessment_at = v.last_assessment_at + timedelta(days=30 * _REASSESS_MONTHS.get(v.tier, 12))
        db.commit()
    return result


@router.get("/register-of-information.csv")
def roi_csv(db: DB, org: Org):
    return Response(to_csv(roi_rows(db, org.id)), media_type="text/csv",
                    headers={"Content-Disposition": 'attachment; filename="register-of-information.csv"'})


@router.get("/register-of-information.xlsx")
def roi_xlsx(db: DB, org: Org):
    return Response(to_xlsx(roi_rows(db, org.id), "Register of Information"),
                    media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    headers={"Content-Disposition": 'attachment; filename="register-of-information.xlsx"'})
