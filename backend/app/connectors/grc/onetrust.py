"""OneTrust connector (Third-Party Risk / Vendor Risk Management and Assessments APIs).

Auth: OAuth2 client credentials or API key, `Authorization: Bearer <token>`.
Endpoints (public API, https://developer.onetrust.com): /api/vendor/v2/vendors,
/api/assessment/v2/assessments, /api/risk/v2/risks, /api/inventory/v2/inventories/assets.
Rate limits apply; pagination uses page/size.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from app.connectors.base import BaseHTTP, ExternalRecord, GRCConnector, HealthStatus
from app.connectors.registry import register

_PATHS = {
    "vendor": "/api/vendor/v2/vendors",
    "risk": "/api/risk/v2/risks",
    "control": "/api/inventory/v2/inventories/assets",  # assets/inventories; controls live inside assessments
    "incident": "/api/incident/v2/incidents",
}


@register
class OneTrustConnector(GRCConnector):
    key = "onetrust"
    display_name = "OneTrust (Vendor Risk / Assessments)"
    capabilities = {"pull", "push", "tprm", "assessments"}
    config_schema = {"url": "Tenant base URL, e.g. https://app-eu.onetrust.com", "api_key": "OAuth bearer token or API key"}

    def configured(self) -> bool:
        return bool(self.opt("url", "onetrust_url") and self.opt("api_key", "onetrust_api_key"))

    def _http(self) -> BaseHTTP:
        return BaseHTTP(self.opt("url", "onetrust_url"), headers={"Authorization": f"Bearer {self.opt('api_key', 'onetrust_api_key')}"})

    async def health(self) -> HealthStatus:
        try:
            h = self._http()
            await h.get_json(_PATHS["vendor"], params={"size": 1})
            await h.aclose()
            return HealthStatus(ok=True, detail="ok")
        except Exception as exc:
            return HealthStatus(ok=False, detail=str(exc)[:300])

    async def pull(self, kind: str, since: datetime | None = None) -> list[ExternalRecord]:
        if kind not in _PATHS:
            return []
        h = self._http()
        out: list[ExternalRecord] = []
        try:
            page = 0
            while page < 50:
                data = await h.get_json(_PATHS[kind], params={"page": page, "size": 200})
                items = data.get("content", [])
                out.extend(ExternalRecord(kind=kind, external_id=str(i.get("id")), data=i) for i in items)
                if data.get("last", True) or not items:
                    break
                page += 1
        finally:
            await h.aclose()
        return out

    async def push(self, kind: str, data: dict[str, Any], external_id: str | None = None) -> str:
        if kind not in _PATHS:
            raise NotImplementedError(kind)
        h = self._http()
        try:
            method, path = ("PUT", f"{_PATHS[kind]}/{external_id}") if external_id else ("POST", _PATHS[kind])
            r = await h.request(method, path, json=data)
            return str(r.json().get("id") or external_id)
        finally:
            await h.aclose()

    async def assessments(self, vendor_id: str | None = None) -> list[dict]:
        h = self._http()
        try:
            params = {"size": 200}
            if vendor_id:
                params["inventoryId"] = vendor_id
            data = await h.get_json("/api/assessment/v2/assessments", params=params)
            return data.get("content", [])
        finally:
            await h.aclose()

    @staticmethod
    def to_vendor(rec: ExternalRecord) -> dict:
        d = rec.data
        return {"name": d.get("name", ""), "external_system": "onetrust", "external_id": rec.external_id,
                "country": (d.get("country") or {}).get("code", "PT") if isinstance(d.get("country"), dict) else "PT",
                "service_type": ", ".join(d.get("serviceTypes", [])) if isinstance(d.get("serviceTypes"), list) else "",
                "external_rating": {"onetrust_risk_level": d.get("riskLevel"), "status": d.get("status")}}
