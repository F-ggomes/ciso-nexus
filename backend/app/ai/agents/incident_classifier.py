from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover
    from sqlalchemy.orm import Session


def regulatory_deadlines(detected_at: datetime, dora_major: bool | None, nis2: bool | None, pdb: bool | None) -> list[dict]:
    """Deterministic deadline computation; the model proposes classification, code computes clocks."""
    out: list[dict] = []
    if dora_major:
        out += [
            {"regime": "DORA initial notification", "due": (detected_at + timedelta(hours=4)).isoformat(),
             "basis": "DORA Art. 19(4)(a); RTS 2024/1772 - 4h from classification, max 24h from detection"},
            {"regime": "DORA intermediate report", "due": (detected_at + timedelta(hours=72)).isoformat(),
             "basis": "Art. 19(4)(b) - 72h from initial notification"},
            {"regime": "DORA final report", "due": (detected_at + timedelta(days=30)).isoformat(),
             "basis": "Art. 19(4)(c) - 1 month from intermediate report"},
        ]
    if nis2:
        out += [
            {"regime": "NIS2 / DL 125/2025 early warning (CNCS)", "due": (detected_at + timedelta(hours=24)).isoformat(),
             "basis": "NIS2 Art. 23(4)(a); DL 125/2025"},
            {"regime": "NIS2 / DL 125/2025 incident notification", "due": (detected_at + timedelta(hours=72)).isoformat(),
             "basis": "NIS2 Art. 23(4)(b)"},
            {"regime": "NIS2 / DL 125/2025 final report", "due": (detected_at + timedelta(days=30)).isoformat(),
             "basis": "NIS2 Art. 23(4)(d)"},
        ]
    if pdb:
        out += [
            {"regime": "GDPR Art. 33 notification to CNPD", "due": (detected_at + timedelta(hours=72)).isoformat(),
             "basis": "GDPR Art. 33(1); Lei 58/2019"},
        ]
    return out


class IncidentClassifier:
    agent = "incident_classifier"

    async def classify(self, db: Session | None, incident: dict, actor: str = "system", org_id: str | None = None) -> dict:
        from app.ai.agents.prompts import INCIDENT_CLASSIFIER
        from app.ai.base import Message
        from app.ai.router import parse_json, router

        completion = await router.run(
            db,
            agent=self.agent,
            purpose="incident_classification",
            system=INCIDENT_CLASSIFIER,
            messages=[Message("user", json.dumps(incident, default=str))],
            json_mode=True,
            actor=actor,
            related_object=f"incident:{incident.get('id')}",
            org_id=org_id,
        )
        data = parse_json(completion.text)
        detected = incident.get("detected_at")
        if isinstance(detected, str):
            detected = datetime.fromisoformat(detected)
        if detected:
            data["deadlines"] = regulatory_deadlines(
                detected, data.get("dora_major"), data.get("nis2_significant"), data.get("personal_data_breach")
            )
        return data
