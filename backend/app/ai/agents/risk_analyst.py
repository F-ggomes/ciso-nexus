from __future__ import annotations

import json

from sqlalchemy.orm import Session

from app.ai.agents.prompts import RISK_ANALYST
from app.ai.base import Message
from app.ai.router import parse_json, router


class RiskAnalyst:
    agent = "risk_analyst"

    async def from_finding(self, db: Session | None, finding: dict, context: dict | None = None, actor: str = "system",
                           org_id: str | None = None) -> dict:
        payload = {"finding": finding, "context": context or {}}
        completion = await router.run(
            db,
            agent=self.agent,
            purpose="risk_from_finding",
            system=RISK_ANALYST,
            messages=[Message("user", json.dumps(payload, default=str))],
            json_mode=True,
            actor=actor,
            related_object=f"finding:{finding.get('id') or finding.get('rule_id')}",
            org_id=org_id,
        )
        data = parse_json(completion.text)
        if "likelihood" in data and "impact" in data:
            data["inherent_score"] = int(data["likelihood"]) * int(data["impact"])
        return data
