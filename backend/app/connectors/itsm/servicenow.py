"""ServiceNow connector (Table API). Creates incidents or security incidents (sn_si_incident when SIR is licensed)."""
from __future__ import annotations

from app.connectors.base import BaseHTTP, HealthStatus, ITSMConnector
from app.connectors.registry import register

_URGENCY = {"critical": "1", "high": "2", "medium": "3", "low": "3"}


@register
class ServiceNowConnector(ITSMConnector):
    key = "servicenow"
    display_name = "ServiceNow"
    capabilities = {"tickets"}
    config_schema = {"url": "https://<instance>.service-now.com", "user": "Integration user", "password": "Password",
                     "table": "incident or sn_si_incident", "assignment_group": "Assignment group name"}

    def configured(self) -> bool:
        return bool(self.opt("url", "servicenow_url") and self.opt("user", "servicenow_user") and self.opt("password", "servicenow_password"))

    def _http(self) -> BaseHTTP:
        return BaseHTTP(self.opt("url", "servicenow_url"), auth=(self.opt("user", "servicenow_user"), self.opt("password", "servicenow_password")),
                        headers={"Accept": "application/json"})

    async def health(self) -> HealthStatus:
        try:
            h = self._http()
            await h.get_json("/api/now/table/sys_user", params={"sysparm_limit": 1})
            await h.aclose()
            return HealthStatus(ok=True, detail="ok")
        except Exception as exc:
            return HealthStatus(ok=False, detail=str(exc)[:300])

    async def create_ticket(self, title, description, severity, labels=None) -> str:
        table = self.opt("table", default="incident")
        h = self._http()
        try:
            body = {"short_description": title[:160], "description": description[:4000],
                    "urgency": _URGENCY.get(severity, "3"), "impact": _URGENCY.get(severity, "3"),
                    "category": "security", "u_source": "CISO Nexus"}
            if self.opt("assignment_group"):
                body["assignment_group"] = self.opt("assignment_group")
            r = await h.post_json(f"/api/now/table/{table}", body)
            return r["result"]["number"]
        finally:
            await h.aclose()

    async def notify(self, title, text, severity="info") -> None:
        return None
