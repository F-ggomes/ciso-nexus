"""SimpleRisk connector (API Extra required on the SimpleRisk side).

Auth: header `X-Api-Key`. Endpoints: /api/v2/risks, /api/v2/risk/{id}, /api/v2/governance/frameworks,
/api/v2/compliance/audits. Field names follow SimpleRisk's API v2 (subject, risk_assessment,
likelihood, impact, calculated_risk, mitigation_planned, owner).
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, ClassVar, cast

import httpx

from app.connectors.base import BaseHTTP, ExternalRecord, GRCConnector, HealthStatus, RecordKind
from app.connectors.registry import register


@register
class SimpleRiskConnector(GRCConnector):
    key = "simplerisk"
    display_name = "SimpleRisk"
    capabilities: ClassVar[set[str]] = {"pull", "push", "frameworks"}
    config_schema: ClassVar[dict[str, str]] = {"url": "Base URL, e.g. https://simplerisk.example.com", "api_key": "API key (API Extra)"}

    def configured(self) -> bool:
        return bool(self.opt("url", "simplerisk_url") and self.opt("api_key", "simplerisk_api_key"))

    def _http(self) -> BaseHTTP:
        return BaseHTTP(self.opt("url", "simplerisk_url"), headers={"X-Api-Key": self.opt("api_key", "simplerisk_api_key")})

    async def health(self) -> HealthStatus:
        try:
            h = self._http()
            await h.get_json("/api/v2/version")
            await h.aclose()
            return HealthStatus(ok=True, detail="ok")
        except (httpx.HTTPError, OSError, ValueError, KeyError, RuntimeError) as exc:
            return HealthStatus(ok=False, detail=str(exc)[:300])

    async def pull(self, kind: str, since: datetime | None = None) -> list[ExternalRecord]:
        paths = {"risk": "/api/v2/risks", "framework": "/api/v2/governance/frameworks", "control": "/api/v2/governance/controls"}
        if kind not in paths:
            return []
        h = self._http()
        try:
            data = await h.get_json(paths[kind])
            items = data.get("data", data) if isinstance(data, dict) else data
            items = items.get("risks", items) if isinstance(items, dict) else items
            rk = cast(RecordKind, kind)
            return [ExternalRecord(kind=rk, external_id=str(i.get("id")), data=i) for i in items]
        finally:
            await h.aclose()

    async def push(self, kind: str, data: dict[str, Any], external_id: str | None = None) -> str:
        if kind != "risk":
            raise NotImplementedError("SimpleRisk push supports risks only")
        body = {"subject": data.get("title"), "risk_assessment": data.get("description", ""),
                "likelihood": data.get("likelihood"), "impact": data.get("impact"), "owner": data.get("owner")}
        h = self._http()
        try:
            if external_id:
                r = await h.request("PUT", f"/api/v2/risk/{external_id}", json=body)
            else:
                r = await h.request("POST", "/api/v2/risk", json=body)
            d = r.json()
            return str(d.get("data", {}).get("risk_id") or d.get("risk_id") or external_id)
        finally:
            await h.aclose()

    @staticmethod
    def to_risk(rec: ExternalRecord) -> dict:
        d = rec.data
        return {"title": d.get("subject", ""), "description": d.get("risk_assessment", ""),
                "likelihood": int(d.get("likelihood") or 3), "impact": int(d.get("impact") or 3),
                "owner": d.get("owner"), "external_system": "simplerisk", "external_id": rec.external_id}
