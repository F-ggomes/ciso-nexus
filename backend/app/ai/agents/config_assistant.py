"""AI configuration assistant: turns a natural-language description into validated connector and ISMS configuration.

Flow: describe -> the model proposes {connector_key: {settings, secrets_needed}} and ISMS recommendations ->
the platform validates against each connector's config_schema -> the user supplies secrets through the UI (never
through the model) -> health check -> save encrypted. The model never sees secret values.
"""
from __future__ import annotations

import json

from typing import TYPE_CHECKING

from app.ai.agents.prompts import BASE_FRAME
from app.connectors.schemas import connector_schemas

if TYPE_CHECKING:  # pragma: no cover
    from sqlalchemy.orm import Session

CONFIG_SYSTEM = BASE_FRAME + """
Role: Configuration Assistant. From the user's description of their environment (tools in use, cloud tenants, ticketing,
GRC tools, jurisdictions, services provided) produce a configuration proposal. Use only connector keys and field names
from the provided schemas. Never ask for or echo secret values; list which secret fields the user must enter in the UI.
Return JSON:
{"connectors":[{"key":"wazuh","settings":{"url":"...","verify_tls":"true"},"secrets_needed":["user","password"],
  "permissions_to_grant":["..."],"why":"..."}],
 "isms":{"suggested_frameworks":["iso27001-2022", ...],"scope_statement_draft":"...","risk_appetite":{"accept_below":6,"escalate_at":15}},
 "schedule":{"evidence_sync_cron":"0 */6 * * *","alert_triage_cron":"*/15 * * * *"},
 "open_questions":["..."]}
"""


class ConfigAssistant:
    agent = "config_assistant"

    async def propose(self, db: "Session | None", description: str, actor: str, org_facts: dict | None = None, preferred=None,
                      org_id: str | None = None) -> dict:
        from app.ai.base import Message
        from app.ai.router import parse_json, router

        payload = {"description": description, "organization": org_facts or {}, "connector_schemas": connector_schemas()}
        completion = await router.run(db, agent=self.agent, purpose="config_proposal", system=CONFIG_SYSTEM,
                                      messages=[Message("user", json.dumps(payload, ensure_ascii=False))], json_mode=True, actor=actor,
                                      preferred=preferred, org_id=org_id)
        proposal = parse_json(completion.text)
        return self.validate(proposal)

    @staticmethod
    def validate(proposal: dict) -> dict:
        schemas = connector_schemas()
        problems: list[str] = []
        for c in proposal.get("connectors", []):
            key = c.get("key")
            if key not in schemas:
                problems.append(f"unknown connector '{key}'")
                continue
            allowed = set(schemas[key]["config"].keys())
            for field in list(c.get("settings", {}).keys()):
                if field not in allowed:
                    problems.append(f"{key}: unknown field '{field}' removed")
                    c["settings"].pop(field)
            secret_like = {f for f in allowed if any(s in f for s in ("password", "secret", "token", "api_key"))}
            for field in list(c.get("settings", {}).keys()):
                if field in secret_like:
                    problems.append(f"{key}: secret field '{field}' must be entered in the UI, value discarded")
                    c["settings"].pop(field)
                    c.setdefault("secrets_needed", []).append(field)
        proposal["validation"] = {"ok": not problems, "notes": problems}
        return proposal
