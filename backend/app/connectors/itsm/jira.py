"""Jira Cloud connector (REST API v3, basic auth with email + API token)."""
from __future__ import annotations

from typing import ClassVar

import httpx

from app.connectors.base import BaseHTTP, HealthStatus, ITSMConnector
from app.connectors.registry import register

_PRIORITY = {"critical": "Highest", "high": "High", "medium": "Medium", "low": "Low"}


@register
class JiraConnector(ITSMConnector):
    key = "jira"
    display_name = "Jira"
    capabilities: ClassVar[set[str]] = {"tickets"}
    config_schema: ClassVar[dict[str, str]] = {"url": "https://<site>.atlassian.net", "email": "Atlassian account email",
                     "api_token": "API token", "project_key": "Project key, e.g. SEC", "issue_type": "Task"}

    def configured(self) -> bool:
        return bool(self.opt("url", "jira_url") and self.opt("email", "jira_email") and self.opt("api_token", "jira_api_token"))

    def _http(self) -> BaseHTTP:
        return BaseHTTP(self.opt("url", "jira_url"), auth=(self.opt("email", "jira_email"), self.opt("api_token", "jira_api_token")))

    async def health(self) -> HealthStatus:
        try:
            h = self._http()
            me = await h.get_json("/rest/api/3/myself")
            await h.aclose()
            return HealthStatus(ok=True, detail=f"as {me.get('displayName')}")
        except (httpx.HTTPError, OSError, ValueError, KeyError, RuntimeError) as exc:
            return HealthStatus(ok=False, detail=str(exc)[:300])

    async def create_ticket(self, title, description, severity, labels=None) -> str:
        h = self._http()
        try:
            body = {"fields": {
                "project": {"key": self.opt("project_key", "jira_project_key", "SEC")},
                "summary": title[:250],
                "description": {"type": "doc", "version": 1, "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": description[:30000] or "-"}]}]},
                "issuetype": {"name": self.opt("issue_type", default="Task")},
                "labels": [*(labels or []), "ciso-nexus"],
                "priority": {"name": _PRIORITY.get(severity, "Medium")},
            }}
            r = await h.post_json("/rest/api/3/issue", body)
            return r["key"]
        finally:
            await h.aclose()

    async def transition(self, key: str, status_name: str) -> None:
        h = self._http()
        try:
            t = await h.get_json(f"/rest/api/3/issue/{key}/transitions")
            for tr in t.get("transitions", []):
                if tr["name"].lower() == status_name.lower():
                    await h.request("POST", f"/rest/api/3/issue/{key}/transitions", json={"transition": {"id": tr["id"]}})
                    return
        finally:
            await h.aclose()

    async def notify(self, title, text, severity="info") -> None:  # Jira is not a notification channel
        return None
