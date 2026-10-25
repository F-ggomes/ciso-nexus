"""Microsoft 365 connector (Intune, Purview, Secure Score) via Microsoft Graph.

Shares the Entra app registration with the Azure connector; additional application permissions:
  DeviceManagementManagedDevices.Read.All, DeviceManagementConfiguration.Read.All (Intune),
  InformationProtectionPolicy.Read.All (Purview sensitivity labels), SecurityEvents.Read.All (Secure Score).
Purview DLP alerts are read from the Graph security alerts feed with serviceSource = 'microsoftDataLossPrevention'.
"""
from __future__ import annotations

from app.connectors.base import EvidenceArtefact, HealthStatus, SecurityConnector
from app.connectors.registry import register
from app.connectors.security.azure import AzureConnector


@register
class Microsoft365Connector(SecurityConnector):
    key = "m365"
    display_name = "Microsoft 365 / Intune / Purview"
    capabilities = {"evidence", "assets"}
    config_schema = AzureConnector.config_schema

    def __init__(self, cfg=None):
        super().__init__(cfg)
        self._az = AzureConnector(cfg)

    def configured(self) -> bool:
        return self._az.configured()

    async def health(self) -> HealthStatus:
        return await self._az.health()

    async def evidence(self) -> list[EvidenceArtefact]:
        g = self._az._graph()
        artefacts: list[EvidenceArtefact] = []
        try:
            devices = await self._az._graph_all(
                g, "/deviceManagement/managedDevices?$select=id,deviceName,operatingSystem,osVersion,complianceState,isEncrypted,lastSyncDateTime&$top=999")
            compliant = [d for d in devices if d.get("complianceState") == "compliant"]
            encrypted = [d for d in devices if d.get("isEncrypted")]
            ratio = len(compliant) / len(devices) if devices else 0
            artefacts.append(EvidenceArtefact(
                source=self.key, source_ref="intune-compliance",
                title=f"Intune: {len(compliant)}/{len(devices)} devices compliant, {len(encrypted)} encrypted",
                payload={"devices": devices}, result="pass" if devices and ratio >= 0.95 else "fail",
                candidate_control_refs=["A.8.1", "A.8.24", "A.8.9", "CIS-1", "CIS-3.6"]))
            labels = await self._az._graph_all(g, "/security/informationProtection/sensitivityLabels")
            artefacts.append(EvidenceArtefact(
                source=self.key, source_ref="purview-labels",
                title=f"Purview sensitivity labels: {len(labels)} published",
                payload={"labels": labels}, result="pass" if labels else "fail",
                candidate_control_refs=["A.5.12", "A.5.13", "CIS-3.7"]))
            scores = await g.get_json("/security/secureScores?$top=1")
            top = (scores.get("value") or [{}])[0]
            cur, mx = top.get("currentScore", 0), top.get("maxScore", 1) or 1
            artefacts.append(EvidenceArtefact(
                source=self.key, source_ref="m365-secure-score",
                title=f"Microsoft Secure Score {cur}/{mx} ({cur / mx * 100:.0f}%)",
                payload=top, result="pass" if cur / mx >= 0.6 else "fail",
                candidate_control_refs=["A.8.8", "A.5.36", "DORA-Art9"]))
        finally:
            await g.aclose()
        return artefacts

    async def assets(self) -> list[dict]:
        g = self._az._graph()
        try:
            return await self._az._graph_all(
                g, "/deviceManagement/managedDevices?$select=id,deviceName,operatingSystem,osVersion,userPrincipalName,complianceState&$top=999")
        finally:
            await g.aclose()
