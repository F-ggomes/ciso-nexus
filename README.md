# CISO Nexus

AI-driven ISMS, GRC and TPRM orchestration platform for a CISO operating across Portugal, the EU and Angola,
including CISO-as-a-Service for client organisations. Claude and Gemini agents sit on top of your own
systems of record (CISO Assistant, SimpleRisk, Eramba, OneTrust, Archer) and your security tooling
(Wazuh, Azure/Entra/Defender, Microsoft 365/Intune/Purview, Jira, ServiceNow, Teams).

**What it does**

| Capability | Where |
|---|---|
| Standards repository: ISO 27001/27002/27005/22301/27701/27017/27018/42001, DORA + RTS/ITS, NIS2 + DL 125/2025, GDPR + Lei 58/2019, EU AI Act, NIST CSF 2.0, CIS v8.1, Banco de Portugal Aviso 3/2020, EBA GL 2019/02, Angola Lei 22/11, Lei 7/17, BNA | `backend/app/content/packs`, `/api/v1/frameworks`, regulatory watch job |
| ISMS set-up per organisation scope (recommend frameworks, scope, SoA lines, baseline policies, 90-day backlog) | `/api/v1/isms/recommend`, `/isms/bootstrap` |
| Asset inventory (manual + synced from Azure/Intune/Wazuh) | `/api/v1/isms/assets` |
| Gap analysis with crosswalks and evidence freshness; auto-created remediation tasks | `/api/v1/isms/gap/{framework}` |
| Risk register: ISO 27005 5x5, appetite thresholds, residual via control effectiveness, acceptance segregation of duties, heat map, AI risk drafting from findings | `/api/v1/risks` |
| Policies, procedures, processes: AI drafting aligned to selected requirements, versions, approval, attestations, review reminders | `/api/v1/policies` |
| TPRM: DORA Register of Information fields, tiering, Art. 30 provisions, AI assessment, CSV/XLSX export | `/api/v1/vendors` |
| Incidents: DORA / NIS2 / GDPR / Angola classification with deterministic deadline clocks, ticket creation | `/api/v1/incidents` |
| Vulnerabilities from the organisation's or clients' infrastructure (Wazuh, Defender) with SLAs | `/api/v1/vulnerabilities` |
| Evidence: connector artefacts and uploads (PDF, DOCX, XLSX, CSV, logs, JSON, images) with SHA-256, text extraction, AI mapping | `/api/v1/evidence` |
| Agile work: Kanban board, sprints, recurrence, reminders (in-app, Teams, Jira) | `/api/v1/tasks`, `/notifications` |
| Dashboards and KPIs; reports in MD/JSON/CSV/XLSX/DOCX/PDF (CISO brief, SoA, risk register, RoI, gap, incidents, vulnerabilities, assets, policies, evidence index) | `/api/v1/dashboard/summary`, `/reports/{kind}.{fmt}` |
| CISO Copilot (tool-using chat), skill agents (standards, regulation, risk & controls, GRC-AI, integrations), AI configuration assistant | `/api/v1/copilot/chat`, `/skills/ask`, `/connectors/ai/propose` |
| MCP server for external agents | `python -m app.mcp.server` |

## Quick start

```bash
cp .env.example .env            # set SECRET_KEY, NEXUS_ENCRYPTION_KEY and at least one AI key
docker compose up -d --build    # API on :8000, web UI on :8080
docker compose exec backend python -m app.cli seed-demo
# optional self-hosted GRC system of record:
docker compose --profile grc up -d
```

Demo login: `ciso@example.com` with the password printed by `seed-demo` (set `NEXUS_BOOTSTRAP_PASSWORD` first).
API docs: http://localhost:8000/api/docs (disabled when `ENVIRONMENT=prod`).

Local development without Docker:

```bash
cd backend && pip install -e ".[dev]" && uvicorn app.main:app --reload      # DATABASE_URL=sqlite:///./dev.db works
cd frontend && npm install && npm run dev                                  # http://localhost:5173
```

## First hour with a new organisation (operator or CISO-as-a-Service client)

1. `POST /orgs` with country, sector, services (`cloud_infrastructure`, `ciso_as_a_service`, `software_development`, ...) and NIS2 category.
2. `GET /isms/recommend` and review the applicable frameworks; `POST /isms/bootstrap` with the scope statement.
3. Connectors page: describe your environment to the AI configuration assistant, enter secrets in the UI (encrypted at rest), run Health, then Sync.
4. Run a gap assessment per framework; the backlog and sprint `ISMS-90d` are now populated.
5. Generate policies with "Draft with AI", review, submit, approve; staff attest.
6. Register ICT third parties; run AI assessments; export the Register of Information.
7. Read the CISO brief; schedule the weekly review from the dashboard.

## Security design

JWT bearer auth with role-based access (ciso, analyst, auditor, owner); account lockout after 5 failures;
per-organisation data scoping; connector secrets encrypted at rest with Fernet (`NEXUS_ENCRYPTION_KEY`);
PII redaction before every model call; AI audit log with prompt/output hashes, tokens and human decision;
security audit log for logins, config and acceptances; security headers and per-client rate limiting;
upload type and size limits with content hashing; the model never receives secret values; MCP server
is read-only except task creation. See `docs/ARCHITECTURE.md` for the threat model and hardening checklist.

## Keeping the repository accurate

Content packs are versioned JSON (`pack_version`). The weekly regulatory-watch job hashes each source URL and
opens a review task when a page changes; nothing is auto-edited. Add your own frameworks in `NEXUS_CONTENT_DIR`.
ISO texts are licensed: packs carry clause/control references and titles only.

## Tests

```bash
cd backend && pytest                                  # unit + API tests (SQLite)
```
