"""Eramba connector (Enterprise API; community API availability varies by release).

Auth: `Authorization: Bearer <api key>` created under Settings > API. Endpoints follow Eramba's
JSON API (/api/v1/...). Object names: risk-management/risks, compliance-management/compliance-packages,
third-party-management/third-parties, security-incidents.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from app.connectors.base import BaseHTTP, ExternalRecord, GRCConnector, HealthStatus
from app.connectors.registry import register

_PATHS = {
    "risk": "/api/v1/risk-management/risks",
    "control": "/api/v1/control-catalogue/security-services",
    "vendor": "/api/v1/third-party-management/third-parties",
    "incident": "/api/v1/security-incidents",
    "framework": "/api/v1/compliance-management/compliance-packages",
}


@register
class ErambaConnector(GRCConnector):
    key = "eramba"
    display_name = "Eramba"
    capabilities = {"pull", "push"}
    config_schema = {"url": "Base URL, e.g. https://eramba.example.com", "api_key": "API key (Settings > API)"}

    def configured(self) -> bool:
        return bool(self.opt("url", "eramba_url") and self.opt("api_key", "eramba_api_key"))

    def _http(self) -> BaseHTTP:
        return BaseHTTP(self.opt("url", "eramba_url"),
                        headers={"Authorization": f"Bearer {self.opt('api_key', 'eramba_api_key')}", "Accept": "application/json"})

    async def health(self) -> HealthStatus:
        try:
            h = self._http()
            await h.request("GET", _PATHS["risk"], params={"limit": 1})
            await h.aclose()
            return HealthStatus(ok=True, detail="ok")
        except Exception as exc:
            return HealthStatus(ok=False, detail=str(exc)[:300])

    async def pull(self, kind: str, since: datetime | None = None) -> list[ExternalRecord]:
        if kind not in _PATHS:
            return []
        h = self._http()
        try:
            data = await h.get_json(_PATHS[kind], params={"limit": 500})
            items = data.get("data", data) if isinstance(data, dict) else data
            return [ExternalRecord(kind=kind, external_id=str(i.get("id")), data=i) for i in items]
        finally:
            await h.aclose()

    async def push(self, kind: str, data: dict[str, Any], external_id: str | None = None) -> str:
        if kind not in _PATHS:
            raise NotImplementedError(kind)
        h = self._http()
        try:
            method, path = ("PUT", f"{_PATHS[kind]}/{external_id}") if external_id else ("POST", _PATHS[kind])
            r = await h.request(method, path, json={"data": data})
            d = r.json()
            return str((d.get("data") or {}).get("id") or external_id)
        finally:
            await h.aclose()

    @staticmethod
    def to_risk(rec: ExternalRecord) -> dict:
        d = rec.data
        return {"title": d.get("title", ""), "description": d.get("description", ""),
                "external_system": "eramba", "external_id": rec.external_id}
