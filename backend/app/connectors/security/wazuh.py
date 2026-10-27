"""Wazuh connector.

Two endpoints are used:
  * Wazuh Manager REST API (port 55000): authentication, agent inventory, vulnerability detector,
    SCA (CIS benchmark) results.  https://documentation.wazuh.com/current/user-manual/api/reference.html
  * Wazuh Indexer (OpenSearch, port 9200): alerts (wazuh-alerts-*) and vulnerability state
    (wazuh-states-vulnerabilities-*) for the client's or the operator's infrastructure.

Evidence produced maps naturally to ISO 27001:2022 A.8.8 (technical vulnerabilities), A.8.9
(configuration management, via SCA), A.8.15/A.8.16 (logging, monitoring), DORA Art. 9-10 and
CIS v8.1 controls 7, 8, 13.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import ClassVar

import httpx

from app.connectors.base import BaseHTTP, EvidenceArtefact, Finding, HealthStatus, SecurityConnector
from app.connectors.registry import register

_SEVERITY_BY_LEVEL = [(15, "critical"), (12, "high"), (7, "medium"), (0, "low")]


def _sev_from_level(level: int) -> str:
    for threshold, name in _SEVERITY_BY_LEVEL:
        if level >= threshold:
            return name
    return "low"


@register
class WazuhConnector(SecurityConnector):
    key = "wazuh"
    display_name = "Wazuh SIEM/XDR"
    capabilities: ClassVar[set[str]] = {"findings", "evidence", "vulnerabilities", "assets"}
    config_schema: ClassVar[dict[str, str]] = {
        "url": "Wazuh manager API base URL, e.g. https://wazuh.example.com:55000",
        "user": "API user (read-only role recommended)",
        "password": "API password",
        "indexer_url": "Wazuh indexer (OpenSearch) URL, e.g. https://wazuh.example.com:9200",
        "indexer_user": "Indexer user",
        "indexer_password": "Indexer password",
        "verify_tls": "true|false - verify TLS certificates (keep true in production)",
    }

    def configured(self) -> bool:
        return bool(self.opt("url", "wazuh_url") and self.opt("user", "wazuh_user") and self.opt("password", "wazuh_password"))

    def _verify(self) -> bool:
        v = self.opt("verify_tls", "wazuh_verify_tls", True)
        return str(v).lower() not in ("false", "0", "no")

    async def _manager(self) -> BaseHTTP:
        base = self.opt("url", "wazuh_url")
        async with httpx.AsyncClient(base_url=base, verify=self._verify(), timeout=20) as c:
            r = await c.post("/security/user/authenticate", auth=(self.opt("user", "wazuh_user"), self.opt("password", "wazuh_password")))
            r.raise_for_status()
            token = r.json()["data"]["token"]
        return BaseHTTP(base, headers={"Authorization": f"Bearer {token}"}, verify=self._verify())

    def _indexer(self) -> BaseHTTP | None:
        url = self.opt("indexer_url", "wazuh_indexer_url")
        if not url:
            return None
        return BaseHTTP(url, auth=(self.opt("indexer_user", "wazuh_indexer_user"),
                                   self.opt("indexer_password", "wazuh_indexer_password")), verify=self._verify())

    async def health(self) -> HealthStatus:
        try:
            m = await self._manager()
            info = await m.get_json("/")
            await m.aclose()
            return HealthStatus(ok=True, detail="manager reachable", version=info.get("data", {}).get("api_version"))
        except (httpx.HTTPError, OSError, ValueError, KeyError) as exc:
            return HealthStatus(ok=False, detail=str(exc)[:300])

    async def agents(self) -> list[dict]:
        m = await self._manager()
        try:
            data = await m.get_json("/agents", params={"limit": 1000, "select": "id,name,ip,os.name,status,version,group"})
            return data.get("data", {}).get("affected_items", [])
        finally:
            await m.aclose()

    async def findings(self, since: datetime | None = None, limit: int = 500) -> list[Finding]:
        """High-level alerts (rule.level >= 10) from the indexer."""
        idx = self._indexer()
        if not idx:
            return []
        since = since or datetime.now(UTC) - timedelta(hours=24)
        query = {
            "size": limit,
            "sort": [{"timestamp": "desc"}],
            "query": {"bool": {"filter": [
                {"range": {"timestamp": {"gte": since.isoformat()}}},
                {"range": {"rule.level": {"gte": 10}}},
            ]}},
        }
        try:
            data = await idx.post_json("/wazuh-alerts-*/_search", query)
        finally:
            await idx.aclose()
        out: list[Finding] = []
        for hit in data.get("hits", {}).get("hits", []):
            s = hit["_source"]
            rule = s.get("rule", {})
            out.append(Finding(
                source=self.key, source_ref=hit["_id"], title=rule.get("description", "Wazuh alert"),
                severity=_sev_from_level(int(rule.get("level", 0))),
                detected_at=datetime.fromisoformat(s["timestamp"]),
                asset=s.get("agent", {}).get("name"), rule_id=str(rule.get("id")),
                tags=[*rule.get("groups", []), *[f"mitre:{t}" for t in rule.get("mitre", {}).get("id", [])]],
                description=s.get("full_log", "")[:2000], raw=s,
            ))
        return out

    async def vulnerabilities(self, limit: int = 2000) -> list[dict]:
        """Vulnerability state per agent (Wazuh 4.8+ indexer states index; falls back to manager API)."""
        idx = self._indexer()
        if idx:
            try:
                data = await idx.post_json("/wazuh-states-vulnerabilities-*/_search", {
                    "size": limit, "query": {"match_all": {}}})
                return [h["_source"] for h in data.get("hits", {}).get("hits", [])]
            except httpx.HTTPStatusError:
                pass
            finally:
                await idx.aclose()
        m = await self._manager()
        try:
            agents = await self.agents()
            out = []
            for a in agents[:200]:
                try:
                    d = await m.get_json(f"/vulnerability/{a['id']}", params={"limit": 500})
                    for v in d.get("data", {}).get("affected_items", []):
                        v["agent"] = {"id": a["id"], "name": a.get("name")}
                        out.append(v)
                except httpx.HTTPStatusError:
                    continue
            return out
        finally:
            await m.aclose()

    async def sca_results(self) -> list[dict]:
        """Security Configuration Assessment (CIS benchmarks) summaries per agent."""
        m = await self._manager()
        try:
            out = []
            for a in (await self.agents())[:200]:
                try:
                    d = await m.get_json(f"/sca/{a['id']}")
                    for policy in d.get("data", {}).get("affected_items", []):
                        policy["agent"] = {"id": a["id"], "name": a.get("name")}
                        out.append(policy)
                except httpx.HTTPStatusError:
                    continue
            return out
        finally:
            await m.aclose()

    async def evidence(self) -> list[EvidenceArtefact]:
        agents = await self.agents()
        sca = await self.sca_results()
        active = [a for a in agents if a.get("status") == "active"]
        artefacts = [
            EvidenceArtefact(
                source=self.key, source_ref="agents-inventory",
                title=f"Wazuh agent inventory: {len(active)}/{len(agents)} active",
                payload={"agents": agents}, result="pass" if agents and len(active) / len(agents) >= 0.9 else "fail",
                candidate_control_refs=["A.8.16", "A.8.15", "A.5.9", "CIS-1", "CIS-8"],
            )
        ]
        for p in sca:
            score = float(p.get("score", 0))
            artefacts.append(EvidenceArtefact(
                source=self.key, source_ref=f"sca:{p['agent']['id']}:{p.get('policy_id')}",
                title=f"SCA {p.get('name')} on {p['agent']['name']}: {score:.0f}%",
                payload=p, result="pass" if score >= 80 else "fail",
                candidate_control_refs=["A.8.9", "A.8.8", "CIS-4", "CIS-7"],
            ))
        return artefacts
