from __future__ import annotations

from datetime import datetime, timezone

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


@router.get("/reports/kinds")
def kinds(who: Who):
    return {"kinds": ["ciso_brief", "kpi", *BUILDERS.keys()],
            "formats": {"ciso_brief": ["md", "json", "docx", "pdf"], "kpi": ["md", "json", "docx", "pdf"],
                        **{k: ["csv", "xlsx", "json", "md"] for k in BUILDERS}}}


@router.get("/reports/ciso-brief")
def ciso_brief(db: DB, org: Org):
    return {"generated_at": datetime.now(timezone.utc), "markdown": ciso_brief_markdown(db, org.id)}


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
