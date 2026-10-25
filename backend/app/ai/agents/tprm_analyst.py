from __future__ import annotations

import json

from sqlalchemy.orm import Session

from app.ai.agents.prompts import TPRM_ANALYST
from app.ai.base import Message
from app.ai.router import parse_json, router

DORA_ART30_PROVISIONS = [
    "Description of functions and services (Art. 30(2)(a))",
    "Locations of data processing and storage (Art. 30(2)(b))",
    "Data protection, integrity, availability provisions (Art. 30(2)(c))",
    "Access, recovery and return of data on insolvency/termination (Art. 30(2)(d))",
    "Service level descriptions with quantitative targets (Art. 30(2)(e))",
    "Obligation to assist on ICT incidents (Art. 30(2)(f))",
    "Cooperation with competent authorities (Art. 30(2)(g))",
    "Termination rights and minimum notice (Art. 30(2)(h))",
    "Participation in awareness and resilience training (Art. 30(2)(i))",
    "For CIF: full SLAs, incident notice, right to audit and access (Art. 30(3))",
    "For CIF: exit strategies and transition periods (Art. 30(3)(f))",
    "Sub-outsourcing conditions (Art. 30(2)(a), RTS on subcontracting)",
]


class TPRMAnalyst:
    agent = "tprm_analyst"

    async def assess(self, db: Session | None, vendor: dict, assessment_content: str = "", actor: str = "system",
                     org_id: str | None = None) -> dict:
        payload = {"vendor": vendor, "assessment_content": assessment_content[:200_000],
                   "art30_checklist": DORA_ART30_PROVISIONS}
        completion = await router.run(
            db,
            agent=self.agent,
            purpose="questionnaire_bulk" if len(assessment_content) > 60_000 else "tprm_assessment",
            system=TPRM_ANALYST,
            messages=[Message("user", json.dumps(payload, default=str))],
            json_mode=True,
            actor=actor,
            related_object=f"vendor:{vendor.get('id')}",
            org_id=org_id,
        )
        return parse_json(completion.text)
