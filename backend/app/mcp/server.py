"""MCP server exposing CISO Nexus to external agents (Claude Desktop, Copilot Studio, an ENX-style gateway).

Run: `python -m app.mcp.server` (stdio). Tools are read-only except create_task. Scope: NEXUS_MCP_ORG_ID.
"""
from __future__ import annotations

import json
import os

from mcp.server.fastmcp import FastMCP

from app.ai.agents.skills import retrieve
from app.db.models import Organization
from app.db.session import SessionLocal, init_db
from app.services.gap_analysis import coverage_by_framework
from app.services.reporting import ciso_brief_markdown, kpis, risk_rows, roi_rows

mcp = FastMCP("ciso-nexus")


def _org_id(db) -> str:
    org_id = os.getenv("NEXUS_MCP_ORG_ID")
    if org_id:
        return org_id
    op = db.query(Organization).filter_by(kind="operator").first() or db.query(Organization).first()
    if not op:
        raise RuntimeError("No organization configured")
    return op.id


@mcp.tool()
def get_kpis() -> str:
    """Current GRC KPIs (risks, incidents, vendors, evidence, controls, vulnerabilities, tasks, framework coverage)."""
    db = SessionLocal()
    try:
        return json.dumps(kpis(db, _org_id(db)), default=str)
    finally:
        db.close()


@mcp.tool()
def ciso_brief() -> str:
    """Markdown CISO brief for the organization."""
    db = SessionLocal()
    try:
        return ciso_brief_markdown(db, _org_id(db))
    finally:
        db.close()


@mcp.tool()
def risk_register(limit: int = 50) -> str:
    """Risk register rows ordered by inherent score."""
    db = SessionLocal()
    try:
        return json.dumps(risk_rows(db, _org_id(db))[:limit], default=str)
    finally:
        db.close()


@mcp.tool()
def register_of_information() -> str:
    """DORA Register of Information rows (ITS 2024/2956 aligned fields)."""
    db = SessionLocal()
    try:
        return json.dumps(roi_rows(db, _org_id(db)), default=str)
    finally:
        db.close()


@mcp.tool()
def framework_coverage() -> str:
    """Implementation coverage per framework."""
    db = SessionLocal()
    try:
        return json.dumps(coverage_by_framework(db, _org_id(db)), default=str)
    finally:
        db.close()


@mcp.tool()
def search_standards(query: str) -> str:
    """Search the standards, frameworks, regulations and laws repository."""
    db = SessionLocal()
    try:
        return json.dumps(retrieve(db, query, org_id=_org_id(db)), default=str)
    finally:
        db.close()


if __name__ == "__main__":
    init_db()
    mcp.run()
