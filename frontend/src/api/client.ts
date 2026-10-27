import type {
  AiAuditEntry,
  Asset,
  AssetInput,
  Attestation,
  ConnectorConfigRequest,
  ConnectorExt,
  ConnectorProposal,
  ControlPatch,
  DashboardSummaryExt,
  FrameworkFull,
  GapDetail,
  GapSummary,
  IsmsBootstrapRequest,
  IsmsBootstrapResult,
  IsmsControl,
  IsmsRecommendation,
  IsmsScope,
  Me,
  Notification,
  Policy,
  PolicyCreate,
  PolicyDetail,
  PolicyDraftResult,
  PolicyTemplate,
  PolicyTemplateDetail,
  ReportHistoryEntry,
  ReportKinds,
  RepositoryDocument,
  RepositoryDocumentCreate,
  RepositoryHit,
  RepositoryWatchResult,
  Requirement,
  RiskAcceptRequest,
  RiskHeatmap,
  SkillAnswer,
  SkillAskRequest,
  SkillInfo,
  Task,
  TaskBoard,
  TaskCreate,
  VendorAssessRequest,
  Vulnerability,
  ChatMessage,
  CisoBrief,
  ConnectorHealth,
  ConnectorSyncResponse,
  CopilotProvider,
  CopilotResponse,
  Evidence,
  EvidenceMapResponse,
  Incident,
  IncidentClassification,
  IncidentCreate,
  Risk,
  RiskDraft,
  TicketResponse,
  TokenResponse,
  Vendor,
  VendorAssessment,
  VendorCreate,
} from './types';

export const API_BASE = '/api/v1';
const TOKEN_KEY = 'nexus_token';
const ROLE_KEY = 'nexus_role';
const ORG_KEY = 'nexus_org';

// ---- auth state (memory + localStorage) ----
let memoryToken: string | null = null;
let memoryRole: string | null = null;

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function getToken(): string | null {
  if (memoryToken) return memoryToken;
  memoryToken = safeGet(TOKEN_KEY);
  return memoryToken;
}
export function getRole(): string | null {
  if (memoryRole) return memoryRole;
  memoryRole = safeGet(ROLE_KEY);
  return memoryRole;
}
export function setAuth(token: string | null, role: string | null) {
  memoryToken = token;
  memoryRole = role;
  safeSet(TOKEN_KEY, token);
  safeSet(ROLE_KEY, role);
  window.dispatchEvent(new Event('nexus-auth'));
}
export function clearAuth() {
  setAuth(null, null);
}

let memoryOrg: string | null = null;
export function getOrg(): string | null {
  if (memoryOrg) return memoryOrg;
  memoryOrg = safeGet(ORG_KEY);
  return memoryOrg;
}
export function setOrg(orgId: string | null) {
  memoryOrg = orgId;
  safeSet(ORG_KEY, orgId);
  window.dispatchEvent(new Event('nexus-org'));
}
export function isAuthenticated(): boolean {
  return !!getToken();
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function redirectToLogin() {
  clearAuth();
  if (!window.location.pathname.startsWith('/login')) {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.assign(`/login?next=${next}`);
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  raw?: boolean; // return Response instead of parsed JSON
  auth?: boolean; // default true
}

function buildQuery(query?: RequestOptions['query']): string {
  if (!query) return '';
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    params.set(k, String(v));
  });
  const s = params.toString();
  return s ? `?${s}` : '';
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = getToken();
  if (opts.auth !== false && token) headers.Authorization = `Bearer ${token}`;
  const org = getOrg();
  if (org) headers['X-Org-Id'] = org;
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    if (opts.body instanceof URLSearchParams || opts.body instanceof FormData) {
      body = opts.body;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
  }
  const res = await fetch(`${API_BASE}${path}${buildQuery(opts.query)}`, {
    method: opts.method ?? 'GET',
    headers,
    body,
  });

  if (res.status === 401) {
    redirectToLogin();
    throw new ApiError(401, 'Unauthorized');
  }
  if (!res.ok) {
    let detail: unknown = undefined;
    let message = `${res.status} ${res.statusText}`;
    try {
      detail = await res.json();
      const d = detail as { detail?: unknown; message?: unknown };
      if (typeof d.detail === 'string') message = d.detail;
      else if (typeof d.message === 'string') message = d.message;
      else if (d.detail) message = JSON.stringify(d.detail);
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message, detail);
  }
  if (opts.raw) return res as unknown as T;
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ---- Auth ----
export async function login(username: string, password: string): Promise<TokenResponse> {
  const form = new URLSearchParams();
  form.set('username', username);
  form.set('password', password);
  const res = await fetch(`${API_BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: form,
  });
  if (!res.ok) {
    let message = 'Invalid credentials';
    try {
      const j = (await res.json()) as { detail?: unknown };
      if (typeof j.detail === 'string') message = j.detail;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message);
  }
  const data = (await res.json()) as TokenResponse;
  setAuth(data.access_token, data.role);
  return data;
}

// ---- Dashboard ----
export const api = {
  dashboard: {
    summary: () => request<DashboardSummaryExt>('/dashboard/summary'),
    cisoServiceSummary: () => request<any>('/dashboard/ciso-service-summary'),
  },
  easm: {
    overview: () => request<any>('/easm/overview'),
    scan: (domain: string) => request<any>('/easm/scan', { method: 'POST', body: { domain } }),
  },
  connectors: {
    list: () => request<ConnectorExt[]>('/connectors'),
    configure: (key: string, body: ConnectorConfigRequest) =>
      request<ConnectorExt>(`/connectors/${encodeURIComponent(key)}`, { method: 'PUT', body }),
    propose: (description: string, provider?: CopilotProvider) =>
      request<ConnectorProposal>('/connectors/ai/propose', { method: 'POST', body: { description, provider } }),
    health: (key: string) => request<ConnectorHealth>(`/connectors/${encodeURIComponent(key)}/health`, { method: 'POST' }),
    sync: (key: string) => request<ConnectorSyncResponse>(`/connectors/${encodeURIComponent(key)}/sync`, { method: 'POST' }),
  },
  risks: {
    list: (params: { treatment?: string; limit?: number } = {}) => request<Risk[]>('/risks', { query: params }),
    fromFinding: (finding: unknown) => request<RiskDraft>('/risks/from-finding', { method: 'POST', body: { finding } }),
    create: (draft: RiskDraft) => request<Risk>('/risks', { method: 'POST', body: draft }),
    accept: (id: string, body: RiskAcceptRequest) => request<Risk>(`/risks/${encodeURIComponent(id)}/accept`, { method: 'POST', body }),
    heatmap: () => request<RiskHeatmap>('/risks/heatmap'),
  },
  incidents: {
    list: () => request<Incident[]>('/incidents'),
    create: (payload: IncidentCreate) => request<Incident>('/incidents', { method: 'POST', body: payload }),
    classify: (id: string) =>
      request<IncidentClassification>(`/incidents/${encodeURIComponent(id)}/classify`, { method: 'POST' }),
    ticket: (id: string) => request<TicketResponse>(`/incidents/${encodeURIComponent(id)}/ticket`, { method: 'POST' }),
  },
  vendors: {
    list: () => request<Vendor[]>('/vendors'),
    create: (payload: VendorCreate) => request<Vendor>('/vendors', { method: 'POST', body: payload }),
    assess: (id: string, body: VendorAssessRequest) =>
      request<VendorAssessment>(`/vendors/${encodeURIComponent(id)}/assess`, {
        method: 'POST',
        body: { ...body, assessment_content: body.assessment_content || undefined },
      }),
    registerOfInformation: async (fmt: 'csv' | 'xlsx'): Promise<Blob> => {
      const res = await request<Response>(`/vendors/register-of-information.${fmt}`, { raw: true });
      return res.blob();
    },
  },
  evidence: {
    list: (params: { result?: string; source?: string } = {}) => request<Evidence[]>('/evidence', { query: params }),
    map: (id: string) => request<EvidenceMapResponse>(`/evidence/${encodeURIComponent(id)}/map`, { method: 'POST' }),
  },
  frameworks: {
    list: () => request<FrameworkFull[]>('/frameworks'),
    requirements: (id: string) => request<Requirement[]>(`/frameworks/${encodeURIComponent(id)}/requirements`),
  },
  auth: {
    me: () => request<Me>('/auth/me'),
  },
  isms: {
    scope: () => request<IsmsScope | null>('/isms/scope'),
    recommend: () => request<IsmsRecommendation>('/isms/recommend'),
    bootstrap: (body: IsmsBootstrapRequest) => request<IsmsBootstrapResult>('/isms/bootstrap', { method: 'POST', body }),
    patchScope: (body: Partial<Pick<IsmsScope, 'statement' | 'boundaries' | 'interested_parties' | 'risk_appetite'>>) =>
      request<IsmsScope>('/isms/scope', { method: 'PATCH', body }),
    approveScope: () => request<IsmsScope>('/isms/scope/approve', { method: 'POST' }),
    controls: (params: { framework_id?: string; status?: string } = {}) => request<IsmsControl[]>('/isms/controls', { query: params }),
    patchControl: (id: string, body: ControlPatch) => request<IsmsControl>(`/isms/controls/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
    runGap: (frameworkId: string) => request<GapSummary>(`/isms/gap/${encodeURIComponent(frameworkId)}`, { method: 'POST' }),
    gaps: () => request<GapSummary[]>('/isms/gap'),
    gap: (id: string) => request<GapDetail>(`/isms/gap/${encodeURIComponent(id)}`),
    assets: () => request<Asset[]>('/isms/assets'),
    createAsset: (body: AssetInput) => request<Asset>('/isms/assets', { method: 'POST', body }),
    patchAsset: (id: string, body: Partial<AssetInput>) => request<Asset>(`/isms/assets/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  },
  policies: {
    list: (params: { doc_kind?: string; status?: string } = {}) => request<Policy[]>('/policies', { query: params }),
    create: (body: PolicyCreate) => request<Policy>('/policies', { method: 'POST', body }),
    get: (id: string) => request<PolicyDetail>(`/policies/${encodeURIComponent(id)}`),
    draft: (id: string, instructions: string, provider?: CopilotProvider) =>
      request<PolicyDraftResult>(`/policies/${encodeURIComponent(id)}/draft`, { method: 'POST', body: { instructions, provider } }),
    addVersion: (id: string, content_md: string, change_note: string) =>
      request<PolicyDetail>(`/policies/${encodeURIComponent(id)}/versions`, { method: 'POST', body: { content_md, change_note } }),
    submit: (id: string) => request<Policy>(`/policies/${encodeURIComponent(id)}/submit`, { method: 'POST' }),
    approve: (id: string) => request<Policy>(`/policies/${encodeURIComponent(id)}/approve`, { method: 'POST' }),
    attest: (id: string) => request<Attestation>(`/policies/${encodeURIComponent(id)}/attest`, { method: 'POST' }),
    attestations: (id: string) => request<Attestation[]>(`/policies/${encodeURIComponent(id)}/attestations`),
    templates: () => request<PolicyTemplate[]>('/policies/templates'),
    template: (file: string) => request<PolicyTemplateDetail>(`/policies/templates/${encodeURIComponent(file)}`),
  },
  tasks: {
    board: (sprint?: string) => request<TaskBoard>('/tasks/board', { query: { sprint } }),
    create: (body: TaskCreate) => request<Task>('/tasks', { method: 'POST', body }),
    patch: (id: string, body: Partial<TaskCreate>) => request<Task>(`/tasks/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  },
  notifications: {
    list: (unreadOnly = true) => request<Notification[]>('/notifications', { query: { unread_only: unreadOnly } }),
    read: (id: string) => request<Notification>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' }),
    run: () => request<unknown>('/notifications/run', { method: 'POST' }),
  },
  repository: {
    search: (q: string) => request<RepositoryHit[] | { hits: RepositoryHit[] }>('/repository/search', { query: { q } }),
    reload: () => request<unknown>('/repository/reload', { method: 'POST' }),
    watch: () => request<RepositoryWatchResult>('/repository/watch', { method: 'POST' }),
    documents: () => request<RepositoryDocument[]>('/repository/documents'),
    document: (id: string) => request<RepositoryDocument>(`/repository/documents/${id}`),
    createDocument: (body: RepositoryDocumentCreate) => request<RepositoryDocument>('/repository/documents', { method: 'POST', body }),
  },
  skills: {
    list: () => request<SkillInfo[]>('/skills'),
    ask: (body: SkillAskRequest) => request<SkillAnswer>('/skills/ask', { method: 'POST', body }),
  },
  vulnerabilities: {
    list: (params: { status?: string; severity?: string } = {}) => request<Vulnerability[]>('/vulnerabilities', { query: params }),
    setStatus: (id: string, status: string) =>
      request<Vulnerability>(`/vulnerabilities/${encodeURIComponent(id)}`, { method: 'PATCH', query: { status } }),
  },
  copilot: {
    chat: (messages: ChatMessage[], provider?: CopilotProvider) =>
      request<CopilotResponse>('/copilot/chat', { method: 'POST', body: { messages, provider } }),
  },
  ai: {
    audit: (limit = 200) => request<AiAuditEntry[]>('/ai/audit', { query: { limit } }),
  },
  reports: {
    cisoBrief: () => request<CisoBrief>('/reports/ciso-brief'),
    kinds: () => request<ReportKinds>('/reports/kinds'),
    history: () => request<ReportHistoryEntry[]>('/reports'),
    download: async (kind: string, fmt: string): Promise<Blob> => {
      const res = await request<Response>(`/reports/${encodeURIComponent(kind)}.${encodeURIComponent(fmt)}`, { raw: true });
      return res.blob();
    },
  },
};

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
