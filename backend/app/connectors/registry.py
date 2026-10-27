"""Connector registry.

Connector classes are registered once. Instances are built per organization from
ConnectorConfig rows (settings + decrypted secrets); when a row is absent for the operator
organization, the connector falls back to environment variables, so a single-tenant deployment
needs no database configuration at all.
"""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

from app.connectors.base import Connector

if TYPE_CHECKING:  # pragma: no cover
    from sqlalchemy.orm import Session

CONNECTOR_CLASSES: dict[str, type[Connector]] = {}


def register(cls: type[Connector]) -> type[Connector]:
    CONNECTOR_CLASSES[cls.key] = cls
    return cls


def load_default_connectors() -> dict[str, type[Connector]]:
    # Importing the modules registers the classes via the decorator.
    from app.connectors.grc import archer, ciso_assistant, eramba, onetrust, simplerisk  # noqa: F401
    from app.connectors.itsm import jira, servicenow, teams  # noqa: F401
    from app.connectors.security import azure, m365, wazuh  # noqa: F401

    return CONNECTOR_CLASSES


class ConnectorRegistry:
    def __init__(self) -> None:
        load_default_connectors()

    def classes(self) -> list[type[Connector]]:
        return list(CONNECTOR_CLASSES.values())

    def build(self, key: str, cfg: dict[str, Any] | None = None) -> Connector:
        if key not in CONNECTOR_CLASSES:
            raise KeyError(f"Unknown connector '{key}'")
        return CONNECTOR_CLASSES[key](cfg or {})

    def for_org(self, db: Session, org_id: str) -> dict[str, Connector]:
        from app.core.crypto import decrypt_secrets
        from app.db.models import ConnectorConfig, Organization

        org = db.get(Organization, org_id)
        env_fallback = bool(org and org.kind == "operator")
        rows = {r.key: r for r in db.query(ConnectorConfig).filter_by(org_id=org_id).all()}
        out: dict[str, Connector] = {}
        for key, cls in CONNECTOR_CLASSES.items():
            row = rows.get(key)
            cfg: dict[str, Any] = {"_env_fallback": env_fallback}
            if row:
                cfg = {**(row.settings or {}), **decrypt_secrets(row.secret_blob), "_enabled": row.enabled, "_env_fallback": env_fallback}
            out[key] = cls(cfg)
        return out

    def configured(self, db: Session, org_id: str, category: str | None = None) -> list[Connector]:
        return [c for c in self.for_org(db, org_id).values()
                if c.configured() and c.enabled() and (category is None or c.category == category)]


registry = ConnectorRegistry()
