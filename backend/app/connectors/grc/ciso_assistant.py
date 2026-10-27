"""CISO Assistant (intuitem) connector.

REST API with Personal Access Token: header `Authorization: Token <PAT>`.
Endpoints used (community edition, /api/): risk-assessments, risk-scenarios, applied-controls,
compliance-assessments, requirement-assessments, folders, tprm/entities, incidents.
Swagger: <base>/api/schema/swagger/ when DJANGO_DEBUG=True.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, ClassVar, cast

import httpx

from app.connectors.base import BaseHTTP, ExternalRecord, GRCConnector, HealthStatus, RecordKind
from app.connectors.registry import register

_KIND_PATHS = {
    "risk": "/api/risk-scenarios/",
    "control": "/api/applied-controls/",
    "vendor": "/api/tprm/entities/",
    "incident": "/api/incidents/",
    "framework": "/api/frameworks/",
}


@register
class CISOAssistantConnector(GRCConnector):
    key = "ciso_assistant"
    display_name = "CISO Assistant (intuitem)"
    capabilities: ClassVar[set[str]] = {"pull", "push", "frameworks", "tprm", "dora_roi"}
    config_schema: ClassVar[dict[str, str]] = {"url": "Base URL, e.g. https://ciso.example.com", "token": "Personal Access Token",
                     "folder_id": "Default domain/folder id for created objects"}

    def configured(self) -> bool:
        return bool(self.opt("url", "ciso_assistant_url") and self.opt("token", "ciso_assistant_token"))

    def _http(self) -> BaseHTTP:
        return BaseHTTP(self.opt("url", "ciso_assistant_url"),
                        headers={"Authorization": f"Token {self.opt('token', 'ciso_assistant_token')}"})

    async def health(self) -> HealthStatus:
        try:
            h = self._http()
            data = await h.get_json("/api/build/")
            await h.aclose()
            return HealthStatus(ok=True, detail="ok", version=str(data.get("version")))
        except (httpx.HTTPError, OSError, ValueError, KeyError, RuntimeError) as exc:
            return HealthStatus(ok=False, detail=str(exc)[:300])

    async def pull(self, kind: str, since: datetime | None = None) -> list[ExternalRecord]:
        path = _KIND_PATHS.get(kind)
        if not path:
            return []
        h = self._http()
        out: list[ExternalRecord] = []
        try:
            url: str | None = path
            rk = cast(RecordKind, kind)
            while url:
                data = await h.get_json(url, params={"limit": 200} if url == path else None)
                for item in data.get("results", data if isinstance(data, list) else []):
                    out.append(ExternalRecord(kind=rk, external_id=str(item["id"]), data=item))
                nxt = data.get("next") if isinstance(data, dict) else None
                url = nxt.replace(self.opt("url", "ciso_assistant_url"), "") if nxt else None
        finally:
            await h.aclose()
        return out

    async def push(self, kind: str, data: dict[str, Any], external_id: str | None = None) -> str:
        path = _KIND_PATHS[kind]
        h = self._http()
        try:
            body = dict(data)
            if "folder" not in body and self.opt("folder_id"):
                body["folder"] = self.opt("folder_id")
            if external_id:
                resp = await h.request("PATCH", f"{path}{external_id}/", json=body)
            else:
                resp = await h.request("POST", path, json=body)
            return str(resp.json()["id"])
        finally:
            await h.aclose()

    @staticmethod
    def to_risk(rec: ExternalRecord) -> dict:
        d = rec.data
        return {"title": d.get("name", ""), "description": d.get("description", ""),
                "likelihood": (d.get("current_proba") or 2) + 1, "impact": (d.get("current_impact") or 2) + 1,
                "treatment": {"open": "open", "mitigate": "mitigate", "accept": "accept", "transfer": "transfer", "avoid": "avoid"}.get(d.get("treatment", "open"), "open"),
                "external_system": "ciso_assistant", "external_id": rec.external_id}

    @staticmethod
    def to_vendor(rec: ExternalRecord) -> dict:
        d = rec.data
        return {"name": d.get("name", ""), "external_system": "ciso_assistant", "external_id": rec.external_id,
                "service_type": d.get("mission", ""), "external_rating": {"reference_link": d.get("reference_link")}}
