from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request

from app.api.deps import DB, Org, Who, audit
from app.api.schemas import ConfigProposeIn, ConnectorConfigIn
from app.connectors.registry import registry
from app.core.crypto import decrypt_secrets, encrypt_secrets
from app.core.security import require_roles
from app.db.models import ConnectorConfig, Organization
from app.db.session import SessionLocal
from app.services.sync import sync_all, sync_connector

router = APIRouter(prefix="/connectors", tags=["connectors"])


@router.get("")
def list_connectors(db: DB, org: Org):
    rows = {r.key: r for r in db.query(ConnectorConfig).filter_by(org_id=org.id).all()}
    out = []
    for key, conn in registry.for_org(db, org.id).items():
        row = rows.get(key)
        out.append({"key": key, "display_name": conn.display_name, "category": conn.category, "configured": conn.configured(),
                    "enabled": row.enabled if row else conn.configured(), "last_status": row.last_status if row else "never",
                    "last_sync_at": row.last_sync_at if row else None, "last_error": row.last_error if row else None,
                    "capabilities": sorted(conn.capabilities), "config_schema": conn.config_schema,
                    "settings": row.settings if row else {}, "secrets_set": sorted(decrypt_secrets(row.secret_blob).keys()) if row else []})
    return out


@router.put("/{key}", dependencies=[Depends(require_roles("ciso", "analyst"))])
def configure(db: DB, org: Org, who: Who, request: Request, key: str, body: ConnectorConfigIn):
    try:
        cls = registry.build(key).__class__
    except KeyError:
        raise HTTPException(404, "Unknown connector")
    allowed = set(cls.config_schema.keys())
    bad = [k for k in {**body.settings, **body.secrets} if k not in allowed]
    if bad:
        raise HTTPException(422, f"Unknown fields for {key}: {bad}")
    row = db.query(ConnectorConfig).filter_by(org_id=org.id, key=key).first() or ConnectorConfig(org_id=org.id, key=key, category=cls.category)
    existing_secrets = decrypt_secrets(row.secret_blob)
    row.settings = body.settings
    row.secret_blob = encrypt_secrets({**existing_secrets, **body.secrets}) if (body.secrets or existing_secrets) else None
    row.enabled = body.enabled
    db.add(row)
    db.commit()
    audit(db, request, who.sub, "connector.configured", org_id=org.id, key=key, fields=sorted(body.settings.keys()), secrets=sorted(body.secrets.keys()))
    return {"key": key, "configured": registry.for_org(db, org.id)[key].configured()}


@router.post("/{key}/health")
async def health(db: DB, org: Org, key: str):
    conns = registry.for_org(db, org.id)
    if key not in conns:
        raise HTTPException(404, "Unknown connector")
    if not conns[key].configured():
        return {"ok": False, "detail": "not configured"}
    h = await conns[key].health()
    return {"ok": h.ok, "detail": h.detail, "version": h.version}


def _run_sync(org_id: str, key: str | None):
    import asyncio

    db = SessionLocal()
    try:
        asyncio.run(sync_connector(db, org_id, key) if key else sync_all(db, org_id))
    finally:
        db.close()


@router.post("/{key}/sync", dependencies=[Depends(require_roles("ciso", "analyst"))])
def sync(db: DB, org: Org, key: str, bg: BackgroundTasks):
    if key not in registry.for_org(db, org.id):
        raise HTTPException(404, "Unknown connector")
    bg.add_task(_run_sync, org.id, key)
    return {"queued": True, "job": f"sync:{org.id}:{key}"}


@router.post("/sync-all", dependencies=[Depends(require_roles("ciso", "analyst"))])
def sync_everything(org: Org, bg: BackgroundTasks):
    bg.add_task(_run_sync, org.id, None)
    return {"queued": True, "job": f"sync:{org.id}:all"}


@router.post("/ai/propose", dependencies=[Depends(require_roles("ciso", "analyst"))])
async def ai_propose(db: DB, org: Org, who: Who, body: ConfigProposeIn):
    from app.ai.agents.config_assistant import ConfigAssistant

    facts = {"name": org.name, "country": org.country, "sector": org.sector, "services": org.services_provided,
             "regulated_entity": org.regulated_entity, "nis2_category": org.nis2_category, "size_band": org.size_band}
    return await ConfigAssistant().propose(db, body.description, who.sub, facts, preferred=body.provider, org_id=org.id)
