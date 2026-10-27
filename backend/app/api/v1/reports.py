from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Response

from app.api.deps import DB, Org, Who
from app.db.models import Report
from app.services.reporting import BUILDERS, ciso_brief_markdown, generate, kpis

router = APIRouter(tags=["dashboard & reports"])


@router.get("/dashboard/summary")
def summary(db: DB, org: Org):
    k = kpis(db, org.id)
    from app.connectors.registry import registry
    from app.db.models import ConnectorConfig

    conns = registry.for_org(db, org.id)
    rows = {r.key: r for r in db.query(ConnectorConfig).filter_by(org_id=org.id).all()}
    configured = [c for c in conns.values() if c.configured()]
    healthy = [c for c in configured if rows.get(c.key) and rows[c.key].last_status == "ok"]
    k["connectors"] = {"configured": len(configured), "healthy": len(healthy), "total": len(conns)}
    k["organization"] = {"id": org.id, "name": org.name, "kind": org.kind, "country": org.country}
    return k


@router.get("/dashboard/ciso-service-summary")
def ciso_service_summary(db: DB, who: Who):
    """Consolidated CISO-as-a-Service matrix aggregating all client organizations and the operator.
    Accessible by operator CISOs with access to all orgs (org_ids == []) or multi-org analysts.
    """
    from datetime import timedelta

    from app.db.models import Incident, Organization, Risk, User, Vendor
    user = db.query(User).filter_by(email=who.sub).first()
    allowed_ids = user.org_ids if user else []
    
    orgs_query = db.query(Organization)
    if allowed_ids:
        orgs_query = orgs_query.filter(Organization.id.in_(allowed_ids))
    all_orgs = orgs_query.all()
    
    now = datetime.now(UTC)
    org_summaries = []
    imminent_clocks = []
    
    for o in all_orgs:
        org_kpis = kpis(db, o.id)
        incidents = db.query(Incident).filter_by(org_id=o.id).all()
        open_inc = [i for i in incidents if i.status != "closed"]
        
        for inc in open_inc:
            for dl in inc.notification_deadlines or []:
                try:
                    due_dt = datetime.fromisoformat(dl["due"])
                    diff_seconds = (due_dt - now).total_seconds()
                    imminent_clocks.append({
                        "org_id": o.id,
                        "org_name": o.name,
                        "incident_id": inc.id,
                        "incident_title": inc.title,
                        "regime": dl.get("regime", "DORA"),
                        "stage": dl.get("stage", "initial"),
                        "due": dl["due"],
                        "seconds_remaining": max(0, int(diff_seconds)),
                        "overdue": diff_seconds < 0,
                        "recipient": dl.get("recipient", "Banco de Portugal / CNCS")
                    })
                except (ValueError, TypeError, KeyError):
                    pass

        pol_total = org_kpis["policies"]["total"]
        pol_approved = org_kpis["policies"]["approved"]
        pol_pct = round((pol_approved / max(1, pol_total)) * 100) if pol_total > 0 else 0

        soon = now + timedelta(days=60)
        expiring_vendors = db.query(Vendor).filter(Vendor.org_id == o.id, Vendor.contract_end.isnot(None), Vendor.contract_end <= soon).count()
        
        org_summaries.append({
            "organization": {
                "id": o.id,
                "name": o.name,
                "kind": o.kind,
                "country": o.country,
                "sector": o.sector,
                "nis2_category": o.nis2_category,
                "regulated_entity": o.regulated_entity,
            },
            "risks": {
                "total": org_kpis["risks"]["total"],
                "critical": len([r for r in db.query(Risk).filter_by(org_id=o.id).all() if r.level == "critical"]),
                "high": org_kpis["risks"]["high"],
                "avg_residual": org_kpis["risks"]["critical_avg_score"],
            },
            "vulnerabilities": {
                "open": org_kpis["vulnerabilities"]["open"],
                "critical": org_kpis["vulnerabilities"]["critical"],
                "sla_breached": org_kpis["vulnerabilities"]["sla_breached"],
            },
            "incidents": {
                "open": org_kpis["incidents"]["open"],
                "dora_major": org_kpis["incidents"]["dora_major"],
                "overdue_notifications": org_kpis["incidents"]["overdue_notifications"],
            },
            "policies": {
                "total": pol_total,
                "approved": pol_approved,
                "percentage": pol_pct,
            },
            "vendors": {
                "total": org_kpis["vendors"]["total"],
                "critical": org_kpis["vendors"]["critical_function"],
                "expiring_soon": expiring_vendors,
            },
            "tasks": {
                "open": org_kpis["tasks"]["open"],
                "overdue": org_kpis["tasks"]["overdue"],
            }
        })
    
    imminent_clocks.sort(key=lambda c: c["seconds_remaining"])
    
    return {
        "generated_at": now.isoformat(),
        "total_organizations": len(all_orgs),
        "organizations": org_summaries,
        "active_clocks": imminent_clocks[:10],
        "totals": {
            "critical_risks": sum(s["risks"]["critical"] for s in org_summaries),
            "open_incidents": sum(s["incidents"]["open"] for s in org_summaries),
            "critical_vulnerabilities": sum(s["vulnerabilities"]["critical"] for s in org_summaries),
            "expiring_contracts": sum(s["vendors"]["expiring_soon"] for s in org_summaries),
        }
    }


@router.get("/reports/kinds")
def kinds(who: Who):
    return {"kinds": ["ciso_brief", "kpi", *BUILDERS.keys()],
            "formats": {"ciso_brief": ["md", "json", "docx", "pdf"], "kpi": ["md", "json", "docx", "pdf"],
                        **{k: ["csv", "xlsx", "json", "md"] for k in BUILDERS}}}


@router.get("/reports/ciso-brief")
def ciso_brief(db: DB, org: Org):
    return {"generated_at": datetime.now(UTC), "markdown": ciso_brief_markdown(db, org.id)}


@router.get("/reports/{kind}.{fmt}")
def report(db: DB, org: Org, who: Who, kind: str, fmt: str, assessment_id: str | None = None):
    try:
        data, media, rep = generate(db, org.id, kind, fmt, who.sub, **({"assessment_id": assessment_id} if kind == "gap" and assessment_id else {}))
    except (KeyError, ValueError) as exc:
        raise HTTPException(422, f"Unsupported report/format: {exc}")
    return Response(data, media_type=media, headers={"Content-Disposition": f'attachment; filename="{kind}.{fmt}"', "X-Report-Id": rep.id,
                                                      "X-Report-SHA256": rep.sha256 or ""})


@router.get("/reports")
def history(db: DB, org: Org, limit: int = 50):
    return [{"id": r.id, "kind": r.kind, "fmt": r.fmt, "title": r.title, "generated_at": r.generated_at, "generated_by": r.generated_by,
             "sha256": r.sha256} for r in db.query(Report).filter_by(org_id=org.id).order_by(Report.generated_at.desc()).limit(limit).all()]
