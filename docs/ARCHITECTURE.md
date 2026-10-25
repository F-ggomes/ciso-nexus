# CISO Nexus - Architecture

## 1. Positioning

CISO Nexus is an orchestration and ISMS layer, not a replacement for every GRC tool. It owns what the
CISO must control directly (scope, SoA, policies, evidence integrity, AI audit, work and reminders) and
mirrors or drives everything else through connectors. It is multi-tenant so one CISO can run the operator
group (Tobe | Selenium: software, cloud infrastructure for clients, CISO-as-a-Service) and each client
as a separate organisation with its own connectors, scope, risks and reports.

```
+-------------------------- Web UI (React) --------------------------+
|  Overview · Risks · Incidents · Third parties · Evidence · Tasks    |
|  Policies · Connectors · Copilot · Skills · AI audit               |
+------------------------------+-------------------------------------+
                               | REST /api/v1  (JWT, RBAC, X-Org-Id)
+------------------------------v-------------------------------------+
|  FastAPI                                                           |
|  services: isms · gap_analysis · risk_engine · policy_generator    |
|            evidence · sync · reminders · reporting · repository    |
|  ai: router (Claude | Gemini, PII redaction, audit) · agents       |
|      copilot · evidence_mapper · risk_analyst · incident_classifier|
|      tprm_analyst · policy_writer · skills · config_assistant      |
|  connectors: grc (CISO Assistant, SimpleRisk, Eramba, OneTrust,    |
|      Archer) · security (Wazuh, Azure/Entra/Defender, M365/Intune/ |
|      Purview) · itsm (Jira, ServiceNow, Teams)                     |
|  workers: APScheduler (sync, reminders, regulatory watch)          |
|  mcp: FastMCP server (read tools + create_task)                    |
+------------------------------+-------------------------------------+
                               | SQLAlchemy
+------------------------------v-------------------------------------+
|  PostgreSQL  +  file store (evidence, reports)                     |
+--------------------------------------------------------------------+
```

## 2. Data model (owned vs mirrored)

Owned: Organization, User, ISMSScope, Framework/Requirement (repository), KnowledgeDocument, Control (SoA line),
GapAssessment/GapItem, Policy/PolicyVersion/PolicyAttestation, Evidence (+file), Task, Notification, Report,
AIAuditLog, SecurityAuditLog, ConnectorConfig (encrypted secrets).

Mirrored with (external_system, external_id): Risk, Vendor, Incident, Asset, Vulnerability. Sync is idempotent;
the external system remains the system of record where one is configured, and CISO Nexus can push back
(risks and vendors) through the GRC adapters.

## 3. AI design

* Provider-neutral interface (`ai/base.py`); Anthropic and Gemini adapters translate messages and tools.
* Routing: regulatory interpretation and drafting prefer Claude; very long context prefers Gemini; `auto` falls back.
* Every call passes through PII redaction (emails, IPs, NIF PT/AO, IBAN, phones) and is written to `ai_audit_log`
  with prompt/output SHA-256, token counts, latency and the later human decision.
* Agents draft, classify and recommend; a named role approves (CISO, owner, DPO). Deterministic logic owns the
  clocks and scores: regulatory deadlines are computed in code from `detected_at`, risk scores from the 5x5 matrix
  and appetite thresholds. The model never computes a deadline.
* Skill agents retrieve from the repository (keyword retrieval; swap for pgvector when needed) and must cite refs.
* The configuration assistant proposes connector settings but secrets are entered only in the UI.

## 4. Connector contract

`SecurityConnector` -> findings(), evidence(), vulnerabilities(), assets(); `GRCConnector` -> pull(kind), push(kind);
`ITSMConnector` -> create_ticket(), notify(). Each class declares `config_schema` (used by the UI and the AI
assistant) and `capabilities`. Instances are built per organisation from `ConnectorConfig` (settings + Fernet
secrets) with environment fallback for the operator organisation. HTTP goes through `BaseHTTP` with retries.

## 5. Threat model and hardening checklist

| Threat | Control in this codebase | Deployment hardening |
|---|---|---|
| Credential theft from the platform | Fernet encryption at rest, secrets never logged (structlog redaction), never sent to models | KMS-backed `NEXUS_ENCRYPTION_KEY`, rotate quarterly |
| Cross-tenant data access | `org_id` on every table, `current_org` dependency, user `org_ids` allow-list | Separate DB schemas per client for the highest-tier clients |
| Account compromise | bcrypt, lockout after 5 failures, JWT expiry, role checks on every write | Entra ID / OIDC SSO + MFA (add `authlib` OIDC provider), short token TTL |
| Prompt injection via evidence or connector data | Agents receive JSON context, tools are allow-listed and read-only except `create_task`, output is JSON-parsed and validated | Separate model keys per environment; review AI audit weekly |
| Data exfiltration to model providers | Redaction, token caps, no file bytes sent (only extracted excerpts) | Use EU endpoints / private endpoints; DPA with providers; disable AI for client orgs that have not consented |
| Evidence tampering | SHA-256 per artefact, de-duplication by hash, connector payload hashing | WORM object storage for `/data`, periodic hash re-verification job |
| API abuse | Rate limiting per client IP, security headers, CSP, upload size/type limits | WAF, TLS termination, HSTS in `prod`, `ENVIRONMENT=prod` disables docs |
| Supply chain | Pinned minimum versions, no dynamic code loading | Pin exact versions and SBOM (`pip-audit`, `npm audit`) in CI |
| Insider misuse | Security audit log (logins, config changes, risk acceptances), segregation of duties for acceptance | Export logs to the SIEM (Wazuh) via the audit endpoints |

## 6. Roadmap (next increments)

1. OIDC SSO (Entra ID) and SCIM provisioning; per-tenant AI consent flag.
2. pgvector retrieval for the repository and evidence; document chunking.
3. Workflow engine for approvals (policy, risk acceptance, vendor onboarding) with e-signature.
4. Additional connectors: Microsoft Sentinel, Google SecOps, Tenable, Qualys, CrowdStrike, BitSight/SecurityScorecard,
   SAP Ariba, DocuSign CLM; RTS 2024/1772 incident report ITS templates; Register of Information XBRL/CSV per ESA package.
5. Client portal for CISO-as-a-Service (read-only dashboards, evidence requests, attestations).
6. Full-text BNA and DL 125/2025 article packs after primary-source verification.
