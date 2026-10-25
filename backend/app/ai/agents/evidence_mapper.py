from __future__ import annotations

import json

from sqlalchemy.orm import Session

from app.ai.agents.prompts import EVIDENCE_MAPPER
from app.ai.base import Message
from app.ai.router import parse_json, router


class EvidenceMapper:
    agent = "evidence_mapper"

    async def map(self, db: Session | None, evidence: dict, candidate_controls: list[dict], actor: str = "system",
                  org_id: str | None = None) -> dict:
        payload = {"evidence": evidence, "candidate_controls": candidate_controls}
        completion = await router.run(
            db,
            agent=self.agent,
            purpose="evidence_mapping",
            system=EVIDENCE_MAPPER,
            messages=[Message("user", json.dumps(payload, default=str))],
            json_mode=True,
            actor=actor,
            related_object=f"evidence:{evidence.get('source_ref')}",
            org_id=org_id,
        )
        return parse_json(completion.text)
