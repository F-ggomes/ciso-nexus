"""RSA Archer / Archer IRM connector (RESTful API + content API).

Auth: POST /api/core/security/login {InstanceName, Username, UserDomain, Password} -> session token,
then header `Authorization: Archer session-id=<token>`. Content via /api/core/content and
/api/core/system/application. Application and field ids are instance-specific: set them in `settings`
(risk_app_id, vendor_app_id, incident_app_id) after discovery with `applications()`.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, ClassVar, cast

import httpx

from app.connectors.base import BaseHTTP, ExternalRecord, GRCConnector, HealthStatus, RecordKind
from app.connectors.registry import register


@register
class ArcherConnector(GRCConnector):
    key = "archer"
    display_name = "Archer IRM"
    capabilities: ClassVar[set[str]] = {"pull", "push"}
    config_schema: ClassVar[dict[str, str]] = {"url": "Base URL, e.g. https://archer.example.com", "instance": "Instance name",
                     "username": "API user", "password": "API password",
                     "risk_app_id": "Archer application id holding risks", "vendor_app_id": "...vendors",
                     "incident_app_id": "...incidents"}

    def configured(self) -> bool:
        return bool(self.opt("url", "archer_url") and self.opt("instance", "archer_instance")
                    and self.opt("username", "archer_username") and self.opt("password", "archer_password"))

    async def _http(self) -> BaseHTTP:
        base = self.opt("url", "archer_url")
        h = BaseHTTP(base, headers={"Content-Type": "application/json"})
        r = await h.post_json("/api/core/security/login", {
            "InstanceName": self.opt("instance", "archer_instance"), "Username": self.opt("username", "archer_username"),
            "UserDomain": self.opt("user_domain", default=""), "Password": self.opt("password", "archer_password")})
        token = r["RequestedObject"]["SessionToken"]
        h._client.headers["Authorization"] = f"Archer session-id={token}"
        return h

    async def health(self) -> HealthStatus:
        try:
            h = await self._http()
            await h.aclose()
            return HealthStatus(ok=True, detail="session established")
        except (httpx.HTTPError, OSError, ValueError, KeyError, RuntimeError) as exc:
            return HealthStatus(ok=False, detail=str(exc)[:300])

    async def applications(self) -> list[dict]:
        h = await self._http()
        try:
            data = await h.get_json("/api/core/system/application")
            return [i["RequestedObject"] for i in data]
        finally:
            await h.aclose()

    def _app_id(self, kind: str) -> str | None:
        return self.opt(f"{kind}_app_id")

    async def pull(self, kind: str, since: datetime | None = None) -> list[ExternalRecord]:
        app_id = self._app_id(kind)
        if not app_id:
            return []
        h = await self._http()
        try:
            data = await h.get_json(f"/api/core/content/applicationcontent/{app_id}")
            items = [i["RequestedObject"] for i in data] if isinstance(data, list) else []
            rk = cast(RecordKind, kind)
            return [ExternalRecord(kind=rk, external_id=str(i.get("Id")), data=i) for i in items]
        finally:
            await h.aclose()

    async def push(self, kind: str, data: dict[str, Any], external_id: str | None = None) -> str:
        app_id = self._app_id(kind)
        if not app_id:
            raise RuntimeError(f"Archer {kind}_app_id not configured")
        h = await self._http()
        try:
            body = {"Content": {"LevelId": app_id, "FieldContents": data.get("FieldContents", {})}}
            if external_id:
                body["Content"]["Id"] = int(external_id)
                r = await h.request("PUT", "/api/core/content", json=body)
            else:
                r = await h.request("POST", "/api/core/content", json=body)
            return str(r.json().get("RequestedObject", {}).get("Id") or external_id)
        finally:
            await h.aclose()
