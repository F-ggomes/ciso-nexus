"""Synchronisation workflows: pull findings, vulnerabilities, evidence and GRC records per organization.

Each sync is idempotent (keyed on source + source_ref) and records status on ConnectorConfig.
Findings become Incident candidates (severity >= high) and Vulnerability rows; evidence artefacts
are stored and auto-linked; GRC records are mirrored with external ids.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.connectors.base import GRCConnector, SecurityConnector
from app.connectors.registry import registry
from app.core.logging import get_logger
from app.db.models import Asset, ConnectorConfig, Incident, Risk, Vendor, Vulnerability
from app.services.evidence import store_artefacts
from app.services.risk_engine import appetite_for, compute

log = get_logger(__name__)
_SEV_ORDER = {"low": 0, "medium": 1, "high": 2, "critical": 3}


def _mark(db: Session, org_id: str, key: str, category: str, ok: bool, error: str | None = None) -> None:
    row = db.query(ConnectorConfig).filter_by(org_id=org_id, key=key).first()
    if not row:
        row = ConnectorConfig(org_id=org_id, key=key, category=category, enabled=True)
        db.add(row)
    row.last_sync_at = datetime.now(timezone.utc)
    row.last_status = "ok" if ok else "error"
    row.last_error = (error or "")[:2000] if not ok else None
    db.commit()


async def sync_connector(db: Session, org_id: str, key: str) -> dict:
    conn = registry.for_org(db, org_id)[key]
    if not conn.configured():
        return {"key": key, "status": "not_configured"}
    if not conn.enabled():
        return {"key": key, "status": "disabled"}
    summary: dict = {"key": key}
    try:
        if isinstance(conn, SecurityConnector):
            summary.update(await _sync_security(db, org_id, conn))
        elif isinstance(conn, GRCConnector):
            summary.update(await _sync_grc(db, org_id, conn))
        _mark(db, org_id, key, conn.category, True)
        summary["status"] = "ok"
    except Exception as exc:
        log.error("sync.failed", key=key, org=org_id, error=str(exc)[:300])
        _mark(db, org_id, key, conn.category, False, str(exc))
        summary.update({"status": "error", "error": str(exc)[:300]})
    return summary


async def _sync_security(db: Session, org_id: str, conn: SecurityConnector) -> dict:
    out = {"findings": 0, "incidents_created": 0, "vulnerabilities": 0, "evidence": 0, "assets": 0}
    if "findings" in conn.capabilities:
        findings = await conn.findings(since=datetime.now(timezone.utc) - timedelta(days=1))
        out["findings"] = len(findings)
        for f in findings:
            if _SEV_ORDER.get(f.severity, 0) < 2:
                continue
            if db.query(Incident).filter_by(org_id=org_id, source=f.source, source_ref=f.source_ref).first():
                continue
            db.add(Incident(org_id=org_id, title=f.title[:512], description=f.description, detected_at=f.detected_at,
                            severity=f.severity, source=f.source, source_ref=f.source_ref, status="open"))
            out["incidents_created"] += 1
    if "vulnerabilities" in conn.capabilities and hasattr(conn, "vulnerabilities"):
        vulns = await conn.vulnerabilities()
        for v in vulns:
            cve = v.get("cve") or v.get("vulnerability", {}).get("id") or v.get("name")
            agent = v.get("agent", {}) if isinstance(v.get("agent"), dict) else {}
            ref = f"{agent.get('id', '?')}:{cve}:{v.get('name') or v.get('package', {}).get('name', '')}"
            if db.query(Vulnerability).filter_by(org_id=org_id, source=conn.key, source_ref=ref).first():
                continue
            sev = str(v.get("severity") or v.get("vulnerability", {}).get("severity") or "medium").lower()
            score = v.get("cvss3_score") or v.get("vulnerability", {}).get("score", {}).get("base")
            db.add(Vulnerability(org_id=org_id, source=conn.key, source_ref=ref[:255], cve=str(cve)[:32] if cve else None,
                                 title=str(v.get("title") or v.get("vulnerability", {}).get("description") or cve)[:512],
                                 severity=sev if sev in _SEV_ORDER else "medium", cvss=float(score) if score else None,
                                 asset_name=str(agent.get("name") or v.get("agent", {}).get("name", ""))[:255],
                                 due_at=datetime.now(timezone.utc) + timedelta(days={"critical": 7, "high": 30, "medium": 90, "low": 180}.get(sev, 90)),
                                 raw=v))
            out["vulnerabilities"] += 1
    if "evidence" in conn.capabilities:
        artefacts = await conn.evidence()
        out["evidence"] = len(store_artefacts(db, org_id, artefacts))
    if "assets" in conn.capabilities and hasattr(conn, "assets"):
        for a in await conn.assets():
            ext_id = str(a.get("id") or a.get("name"))
            if db.query(Asset).filter_by(org_id=org_id, external_system=conn.key, external_id=ext_id).first():
                continue
            db.add(Asset(org_id=org_id, name=str(a.get("name") or a.get("deviceName") or ext_id)[:255], asset_type="system",
                         external_system=conn.key, external_id=ext_id, location=str(a.get("location") or "")[:128],
                         attributes={k: v for k, v in a.items() if isinstance(v, (str, int, float, bool))}))
            out["assets"] += 1
    db.commit()
    return out


async def _sync_grc(db: Session, org_id: str, conn: GRCConnector) -> dict:
    out = {"risks": 0, "vendors": 0}
    appetite = appetite_for(db, org_id)
    for rec in await conn.pull("risk"):
        mapper = getattr(conn, "to_risk", None)
        data = mapper(rec) if mapper else {"title": str(rec.data)[:200], "external_system": conn.key, "external_id": rec.external_id}
        row = db.query(Risk).filter_by(org_id=org_id, external_system=conn.key, external_id=rec.external_id).first()
        if not row:
            row = Risk(org_id=org_id)
            db.add(row)
            out["risks"] += 1
        for k, v in data.items():
            setattr(row, k, v)
        compute(row, appetite)
    if "tprm" in conn.capabilities:
        for rec in await conn.pull("vendor"):
            mapper = getattr(conn, "to_vendor", None)
            data = mapper(rec) if mapper else {"name": str(rec.data.get("name", rec.external_id)), "external_system": conn.key, "external_id": rec.external_id}
            row = db.query(Vendor).filter_by(org_id=org_id, external_system=conn.key, external_id=rec.external_id).first()
            if not row:
                row = Vendor(org_id=org_id)
                db.add(row)
                out["vendors"] += 1
            for k, v in data.items():
                setattr(row, k, v)
    db.commit()
    return out


async def sync_all(db: Session, org_id: str) -> list[dict]:
    results = []
    for conn in registry.configured(db, org_id):
        if isinstance(conn, (SecurityConnector, GRCConnector)):
            results.append(await sync_connector(db, org_id, conn.key))
    return results
