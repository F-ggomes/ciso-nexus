"""Connector configuration schemas (importable without the ORM)."""
from __future__ import annotations


def connector_schemas() -> dict[str, dict]:
    from app.connectors.registry import CONNECTOR_CLASSES, load_default_connectors

    load_default_connectors()
    return {k: {"display_name": c.display_name, "category": c.category, "capabilities": sorted(c.capabilities),
                "config": c.config_schema, "doc": (c.__doc__ or "").strip()} for k, c in CONNECTOR_CLASSES.items()}
