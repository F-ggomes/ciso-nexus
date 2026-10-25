from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.ai.agents import IncidentClassifier
from app.api.deps import DB, Org, Who
from app.api.schemas import IncidentIn, IncidentUpdate
from app.connectors.base import ITSMConnector
from app.connectors.registry import registry
from app.core.security import require_roles
from app.db.models import Incident, Vulnerability

router = APIRouter(tags=["incidents & vulnerabilities"])


def _out(i: Incident) -> dict:
    return {"id": i.id, "title": i.title, "description": i.description, "detected_at": i.detected_at, "status": i.status, "severity": i.severity,
            "source": i.source, "source_ref": i.source_ref, "asset_id": i.asset_id, "vendor_id": i.vendor_id, "dora_major": i.dora_major,
            "dora_criteria": i.dora_criteria, "nis2_significant": i.nis2_significant, "personal_data_breach": i.personal_data_breach,
            "notification_deadlines": i.notification_deadlines, "root_cause": i.root_cause, "ticket_ref": i.ticket_ref, "updated_at": i.updated_at}


@router.get("/incidents")
def list_incidents(db: DB, org: Org, status: str | None = None):
    q = db.query(Incident).filter_by(org_id=org.id)
    if status:
        q = q.filter_by(status=status)
    return [_out(i) for i in q.order_by(Incident.detected_at.desc()).all()]


@router.post("/incidents", status_code=201, dependencies=[Depends(require_roles("ciso", "analyst"))])
def create_incident(db: DB, org: Org, body: IncidentIn):
    data = body.model_dump()
    data["detected_at"] = data["detected_at"] or datetime.now(timezone.utc)
    i = Incident(org_id=org.id, **data)
    db.add(i)
    db.commit()
    return _out(i)


@router.patch("/incidents/{incident_id}", dependencies=[Depends(require_roles("ciso", "analyst"))])
def update_incident(db: DB, org: Org, incident_id: str, body: IncidentUpdate):
    i = db.query(Incident).filter_by(org_id=org.id, id=incident_id).first()
    if not i:
        raise HTTPException(404, "Not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(i, k, v)
    db.commit()
    return _out(i)


@router.post("/incidents/{incident_id}/classify", dependencies=[Depends(require_roles("ciso", "analyst"))])
async def classify(db: DB, org: Org, who: Who, incident_id: str, apply: bool = True):
    i = db.query(Incident).filter_by(org_id=org.id, id=incident_id).first()
    if not i:
        raise HTTPException(404, "Not found")
    payload = {**_out(i), "organization": {"name": org.name, "country": org.country, "regulated_entity": org.regulated_entity,
                                           "nis2_category": org.nis2_category, "sector": org.sector}}
    result = await IncidentClassifier().classify(db, payload, who.sub, org_id=org.id)
    if apply:
        i.dora_major = result.get("dora_major")
        i.dora_criteria = result.get("dora_criteria", {})
        i.nis2_significant = result.get("nis2_significant")
        i.personal_data_breach = result.get("personal_data_breach")
        i.notification_deadlines = result.get("deadlines", [])
        if result.get("severity"):
            i.severity = result["severity"]
        db.commit()
    return result


@router.post("/incidents/{incident_id}/ticket", dependencies=[Depends(require_roles("ciso", "analyst"))])
async def ticket(db: DB, org: Org, incident_id: str, system: str = "jira"):
    i = db.query(Incident).filter_by(org_id=org.id, id=incident_id).first()
    if not i:
        raise HTTPException(404, "Not found")
    conn = registry.for_org(db, org.id).get(system)
    if not isinstance(conn, ITSMConnector) or not conn.configured():
        raise HTTPException(400, f"{system} not configured")
    desc = f"{i.description}\n\nDetected: {i.detected_at}\nSeverity: {i.severity}\nDORA major: {i.dora_major}\nNIS2 significant: {i.nis2_significant}\n" + \
           "\n".join(f"- {d['regime']}: {d['due']}" for d in (i.notification_deadlines or []))
    i.ticket_ref = await conn.create_ticket(f"[SEC] {i.title}", desc, i.severity, ["incident"])
    db.commit()
    return {"ticket_ref": i.ticket_ref}


@router.get("/vulnerabilities")
def list_vulns(db: DB, org: Org, status: str = "open", severity: str | None = None, limit: int = 500):
    q = db.query(Vulnerability).filter_by(org_id=org.id, status=status)
    if severity:
        q = q.filter_by(severity=severity)
    return [{"id": v.id, "cve": v.cve, "title": v.title, "severity": v.severity, "cvss": v.cvss, "asset_name": v.asset_name, "status": v.status,
             "source": v.source, "detected_at": v.detected_at, "due_at": v.due_at, "risk_id": v.risk_id} for v in q.limit(limit).all()]


@router.patch("/vulnerabilities/{vuln_id}", dependencies=[Depends(require_roles("ciso", "analyst", "owner"))])
def update_vuln(db: DB, org: Org, vuln_id: str, status: str):
    v = db.query(Vulnerability).filter_by(org_id=org.id, id=vuln_id).first()
    if not v:
        raise HTTPException(404, "Not found")
    if status not in ("open", "mitigated", "accepted", "false_positive"):
        raise HTTPException(422, "bad status")
    v.status = status
    db.commit()
    return {"ok": True}
