"""Microsoft Teams notifications via Workflows/incoming webhook (Adaptive Card)."""
from __future__ import annotations

from typing import ClassVar

import httpx

from app.connectors.base import HealthStatus, ITSMConnector
from app.connectors.registry import register

_COLOUR = {"critical": "Attention", "high": "Attention", "medium": "Warning", "low": "Good", "info": "Accent"}


@register
class TeamsConnector(ITSMConnector):
    key = "teams"
    display_name = "Microsoft Teams"
    capabilities: ClassVar[set[str]] = {"notify"}
    config_schema: ClassVar[dict[str, str]] = {"webhook_url": "Teams Workflows incoming webhook URL"}

    def configured(self) -> bool:
        return bool(self.opt("webhook_url", "teams_webhook_url"))

    async def health(self) -> HealthStatus:
        return HealthStatus(ok=self.configured(), detail="webhook configured" if self.configured() else "no webhook")

    async def create_ticket(self, title, description, severity, labels=None) -> str:
        await self.notify(title, description, severity)
        return "teams:notified"

    async def notify(self, title, text, severity="info") -> None:
        card = {"type": "message", "attachments": [{"contentType": "application/vnd.microsoft.card.adaptive", "content": {
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json", "type": "AdaptiveCard", "version": "1.4",
            "body": [{"type": "TextBlock", "size": "Medium", "weight": "Bolder", "text": title[:200],
                      "color": _COLOUR.get(severity, "Default")},
                     {"type": "TextBlock", "wrap": True, "text": text[:3000]},
                     {"type": "TextBlock", "size": "Small", "isSubtle": True, "text": "CISO Nexus"}]}}]}
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(self.opt("webhook_url", "teams_webhook_url"), json=card)
            r.raise_for_status()
