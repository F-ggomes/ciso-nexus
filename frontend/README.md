# CISO Nexus — Frontend

Single-page web client for the CISO Nexus AI GRC orchestration platform.

Stack: Vite 5 · React 18 · TypeScript · react-router-dom v6 · TanStack Query v5 · Tailwind CSS v3 · recharts · lucide-react.

## Pages

| Route         | Page          | What it does                                                                                   |
|---------------|---------------|------------------------------------------------------------------------------------------------|
| `/login`      | Login         | `POST /api/v1/auth/token` (form `username`/`password`), stores JWT in memory + `localStorage.nexus_token` |
| `/`           | Overview      | KPI tiles, framework-coverage bar chart, overdue notification deadlines, **CISO Brief** (markdown) |
| `/risks`      | Risks         | Register table, treatment filter, 5×5 heat map, **New from finding** (AI draft → Approve → `POST /risks`) |
| `/incidents`  | Incidents     | Table, report form, **Classify** drawer (DORA / NIS2 / GDPR, deadlines, Create ticket)           |
| `/vendors`    | Third parties | Tier badges, CIF flag, **Assess** drawer (Art. 30 provisions, RoI gaps), **Export Register of Information** |
| `/evidence`   | Evidence      | Result badges, filters, **Map** drawer with AI control mappings and confidence                   |
| `/connectors` | Connectors    | Cards by category (grc / security / itsm) with config schema, **Configure** drawer (settings vs. secrets), Health, Sync and the **AI setup assistant** (`POST /connectors/ai/propose`) |
| `/copilot`    | Copilot       | Chat with Claude / Gemini provider toggle and collapsible tool trace                             |
| `/audit`      | AI Audit      | Model-call audit trail (provider, tokens, latency, PII redaction, human decision)                |
| `/isms`       | ISMS          | Bootstrap wizard (recommended frameworks → scope → appetite), scope editing/approval, Controls (SoA) with inline status/maturity edits, Gap analysis with coverage gauge |
| `/assets`     | Assets        | Asset inventory with CIA ratings, classification and CIF flag; create/edit drawer               |
| `/policies`   | Policies      | Document lifecycle list with Documents / **Templates** sub-tabs (`GET /policies/templates`, preview rendered as markdown); New document modal with "Start from template" grouped by kind; detail page with markdown render, editor, **Draft with AI**, versions, submit/approve (CISO)/attest |
| `/tasks`      | Tasks         | Kanban board (native HTML5 drag-and-drop), sprint filter, overdue highlight, quick-add, full task form |
| `/vulnerabilities` | Vulnerabilities | Findings table with SLA-breach highlight and inline status change                        |
| `/reports`    | Reports       | Report kinds × formats as downloads (blob), generation history                                   |
| `/repository` | Repository    | Framework cards grouped by jurisdiction (PT, EU, AO, INTL, US), requirement browser with crosswalks, search, documents, **Check for updates** |
| `/skills`     | Skills        | Specialised Q&A (standards, regulation, risk_controls, grc_ai, integrations) with cited sources and framework scoping |

The top bar shows the tenant (`Grupo | PT · EU · AO`), an **organisation switcher** (fed by `GET /auth/me`; the selection is kept in `localStorage.nexus_org` and sent as `X-Org-Id` on every request), a **notifications bell** (`GET /notifications?unread_only=true`, mark-read, run checks), the user role, and an EN / PT-PT language toggle (`src/i18n.ts`). Dark mode follows `prefers-color-scheme`.

Risks additionally support **Accept** (`POST /risks/{id}/accept`, 403 surfaced as a role message) and a server-side heat map (`GET /risks/heatmap`) coloured by the ISMS risk appetite. Third parties can be exported as CSV or XLSX and assessed with a provider toggle and an "apply to record" switch.

## Develop

Requires Node 22 and a backend listening on `http://localhost:8000`.

```bash
npm install
npm run dev          # http://localhost:5173 — /api is proxied to http://localhost:8000
```

## Build

```bash
npm run build        # runs tsc -b (zero-error type check) then vite build → dist/
npm run preview      # serve dist/ locally
```

## Docker

Multi-stage image: Node builds the bundle, nginx serves it and proxies `/api/` to the `backend:8000` service (see `nginx.conf`).

```bash
docker build -t ciso-nexus-frontend .
docker run --rm -p 8080:80 --network <compose-network> ciso-nexus-frontend
```

In docker-compose, name the API service `backend` or edit `proxy_pass` in `nginx.conf`.

## Project layout

```
src/
  api/client.ts      fetch wrapper (bearer token, X-Org-Id, 401 → /login), typed endpoint helpers
  api/types.ts       API contract types
  components/        Layout, KpiTile, SeverityBadge, DataTable, Drawer, Modal, Markdown, common
  pages/             one file per route
  i18n.ts            EN / PT-PT dictionary + context
  App.tsx            router + auth guard
```
