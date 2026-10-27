"""EASM API router for continuous external perimeter monitoring."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.deps import DB, Org, Who
from app.services.easm import scan_domain, scan_org_perimeter

router = APIRouter(prefix="/easm", tags=["easm"])


class ScanDomainRequest(BaseModel):
    domain: str


@router.get("/overview")
def easm_overview(db: DB, org: Org, who: Who):
    """Return external attack surface scan results for the active organization."""
    results = scan_org_perimeter(db, org.id)
    return {
        "org_id": org.id,
        "org_name": org.name,
        "scanned_assets": len(results),
        "assets": results,
    }


@router.post("/scan")
def easm_scan_domain(body: ScanDomainRequest, org: Org, who: Who):
    """Trigger an on-demand external perimeter scan for a specific domain."""
    if not body.domain or "." not in body.domain:
        raise HTTPException(400, "Domínio inválido para análise de perímetro")
    return scan_domain(body.domain)
