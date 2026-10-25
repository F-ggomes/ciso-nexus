"""Azure / Entra ID connector via Microsoft Graph and Azure Resource Manager.

App registration (client credentials) with these application permissions:
  Graph:  Directory.Read.All, Policy.Read.All, AuditLog.Read.All, SecurityEvents.Read.All,
          IdentityRiskyUser.Read.All, DeviceManagementManagedDevices.Read.All (Intune),
          InformationProtectionPolicy.Read.All (Purview labels)
  ARM:    Reader on target subscriptions (Policy compliance, Defender for Cloud secure score, Activity log)

Evidence maps to ISO 27001:2022 A.5.15-A.5.18, A.8.2, A.8.5 (identity, MFA, privileged access),
A.8.8 (Defender recommendations), A.8.15 (activity logs); DORA Art. 9; CIS v8.1 controls 5, 6.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.connectors.base import BaseHTTP, EvidenceArtefact, Finding, HealthStatus, SecurityConnector
from app.connectors.registry import register

GRAPH = "https://graph.microsoft.com/v1.0"
ARM = "https://management.azure.com"


@register
class AzureConnector(SecurityConnector):
    key = "azure"
    display_name = "Microsoft Azure / Entra ID / Defender"
    capabilities = {"findings", "evidence", "assets", "identity"}
    config_schema = {
        "tenant_id": "Entra tenant id",
        "client_id": "App registration client id",
        "client_secret": "App registration client secret (or use certificate in production)",
        "subscription_ids": "Comma-separated subscription ids for ARM queries",
    }

    def configured(self) -> bool:
        return bool(self.opt("tenant_id", "azure_tenant_id") and self.opt("client_id", "azure_client_id")
                    and self.opt("client_secret", "azure_client_secret"))

    def _subs(self) -> list[str]:
        v = self.opt("subscription_ids", "azure_subscription_ids", [])
        return [s.strip() for s in v.split(",")] if isinstance(v, str) else list(v)

    def _token(self, scope: str) -> str:
        import msal

        app = msal.ConfidentialClientApplication(
            self.opt("client_id", "azure_client_id"),
            authority=f"https://login.microsoftonline.com/{self.opt('tenant_id', 'azure_tenant_id')}",
            client_credential=self.opt("client_secret", "azure_client_secret"),
        )
        result = app.acquire_token_for_client(scopes=[scope])
        if "access_token" not in result:
            raise RuntimeError(result.get("error_description", "token error"))
        return result["access_token"]

    def _graph(self) -> BaseHTTP:
        return BaseHTTP(GRAPH, headers={"Authorization": f"Bearer {self._token('https://graph.microsoft.com/.default')}"})

    def _arm(self) -> BaseHTTP:
        return BaseHTTP(ARM, headers={"Authorization": f"Bearer {self._token('https://management.azure.com/.default')}"})

    async def health(self) -> HealthStatus:
        try:
            g = self._graph()
            org = await g.get_json("/organization")
            await g.aclose()
            name = (org.get("value") or [{}])[0].get("displayName")
            return HealthStatus(ok=True, detail=f"tenant {name}")
        except Exception as exc:
            return HealthStatus(ok=False, detail=str(exc)[:300])

    async def _graph_all(self, g: BaseHTTP, path: str, max_pages: int = 20) -> list[dict]:
        out: list[dict] = []
        url: str | None = path
        for _ in range(max_pages):
            if not url:
                break
            data = await g.get_json(url)
            out.extend(data.get("value", []))
            url = data.get("@odata.nextLink")
            if url and url.startswith(GRAPH):
                url = url[len(GRAPH):]
        return out

    async def findings(self, since: datetime | None = None, limit: int = 500) -> list[Finding]:
        """Defender security alerts (Graph security API v2) and Entra risky users."""
        g = self._graph()
        since = since or datetime.now(timezone.utc) - timedelta(hours=24)
        out: list[Finding] = []
        try:
            alerts = await self._graph_all(
                g, f"/security/alerts_v2?$filter=createdDateTime ge {since.strftime('%Y-%m-%dT%H:%M:%SZ')}&$top=200")
            for a in alerts[:limit]:
                out.append(Finding(
                    source=self.key, source_ref=a["id"], title=a.get("title", "Defender alert"),
                    severity=(a.get("severity") or "medium").lower(),
                    detected_at=datetime.fromisoformat(a["createdDateTime"].replace("Z", "+00:00")),
                    asset=(a.get("evidence") or [{}])[0].get("deviceDnsName") if a.get("evidence") else None,
                    description=a.get("description", "")[:2000], rule_id=a.get("detectorId"),
                    tags=[a.get("serviceSource", ""), *(a.get("mitreTechniques") or [])], raw=a))
            risky = await self._graph_all(g, "/identityProtection/riskyUsers?$filter=riskState eq 'atRisk'&$top=200")
            for u in risky:
                out.append(Finding(
                    source=self.key, source_ref=f"riskyUser:{u['id']}", title=f"Risky user: {u.get('userPrincipalName')}",
                    severity=(u.get("riskLevel") or "medium").lower(),
                    detected_at=datetime.fromisoformat(u["riskLastUpdatedDateTime"].replace("Z", "+00:00")),
                    tags=["identity-protection"], raw=u))
        finally:
            await g.aclose()
        return out

    async def evidence(self) -> list[EvidenceArtefact]:
        g = self._graph()
        artefacts: list[EvidenceArtefact] = []
        try:
            # Conditional Access policies (MFA enforcement design evidence)
            ca = await self._graph_all(g, "/identity/conditionalAccess/policies")
            enabled = [p for p in ca if p.get("state") == "enabled"]
            mfa = [p for p in enabled if "mfa" in str(p.get("grantControls", {})).lower()]
            artefacts.append(EvidenceArtefact(
                source=self.key, source_ref="conditional-access",
                title=f"Conditional Access: {len(enabled)} enabled policies, {len(mfa)} enforcing MFA",
                payload={"policies": ca}, result="pass" if mfa else "fail",
                candidate_control_refs=["A.5.17", "A.8.5", "CIS-6.3", "CIS-6.5"]))
            # Privileged role members (A.8.2)
            roles = await self._graph_all(g, "/directoryRoles")
            privileged = {}
            for r in roles:
                if r.get("displayName") in ("Global Administrator", "Privileged Role Administrator", "Security Administrator"):
                    members = await self._graph_all(g, f"/directoryRoles/{r['id']}/members")
                    privileged[r["displayName"]] = [m.get("userPrincipalName") or m.get("displayName") for m in members]
            ga = len(privileged.get("Global Administrator", []))
            artefacts.append(EvidenceArtefact(
                source=self.key, source_ref="privileged-roles",
                title=f"Privileged roles: {ga} Global Administrators",
                payload=privileged, result="pass" if 2 <= ga <= 5 else "fail",
                candidate_control_refs=["A.8.2", "A.5.18", "CIS-5.4"]))
            # Guest and stale accounts (A.5.18)
            users = await self._graph_all(g, "/users?$select=id,userPrincipalName,accountEnabled,userType,signInActivity&$top=999", max_pages=10)
            guests = [u for u in users if u.get("userType") == "Guest"]
            artefacts.append(EvidenceArtefact(
                source=self.key, source_ref="user-inventory",
                title=f"Entra users: {len(users)} total, {len(guests)} guests",
                payload={"total": len(users), "guests": len(guests), "sample": users[:50]}, result="info",
                candidate_control_refs=["A.5.16", "A.5.18", "CIS-5.1", "CIS-5.3"]))
        finally:
            await g.aclose()
        # Defender for Cloud secure score + Azure Policy compliance per subscription
        if self._subs():
            arm = self._arm()
            try:
                for sub in self._subs():
                    try:
                        ss = await arm.get_json(f"/subscriptions/{sub}/providers/Microsoft.Security/secureScores/ascScore",
                                                params={"api-version": "2020-01-01"})
                        props = ss.get("properties", {})
                        pct = float(props.get("score", {}).get("percentage", 0)) * 100
                        artefacts.append(EvidenceArtefact(
                            source=self.key, source_ref=f"secure-score:{sub}",
                            title=f"Defender for Cloud secure score {pct:.0f}% ({sub[:8]})",
                            payload=ss, result="pass" if pct >= 70 else "fail",
                            candidate_control_refs=["A.8.8", "A.8.9", "DORA-Art9", "CIS-7"]))
                        pol = await arm.post_json(
                            f"/subscriptions/{sub}/providers/Microsoft.PolicyInsights/policyStates/latest/summarize",
                            {}, params={"api-version": "2019-10-01"})
                        results = (pol.get("value") or [{}])[0].get("results", {})
                        nc = results.get("nonCompliantResources", 0)
                        artefacts.append(EvidenceArtefact(
                            source=self.key, source_ref=f"policy-compliance:{sub}",
                            title=f"Azure Policy: {nc} non-compliant resources ({sub[:8]})",
                            payload=pol, result="pass" if nc == 0 else "fail",
                            candidate_control_refs=["A.8.9", "A.5.36", "CIS-4"]))
                    except Exception as exc:  # one subscription failing must not hide the others
                        artefacts.append(EvidenceArtefact(source=self.key, source_ref=f"arm-error:{sub}",
                                                          title=f"ARM query failed for {sub[:8]}", payload={"error": str(exc)[:300]}))
            finally:
                await arm.aclose()
        return artefacts

    async def assets(self) -> list[dict]:
        """Azure resources (ARM) as asset inventory candidates."""
        out: list[dict] = []
        if not self._subs():
            return out
        arm = self._arm()
        try:
            for sub in self._subs():
                data = await arm.get_json(f"/subscriptions/{sub}/resources", params={"api-version": "2021-04-01", "$top": 1000})
                out.extend(data.get("value", []))
        finally:
            await arm.aclose()
        return out
