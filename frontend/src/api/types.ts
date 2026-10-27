// API contract types for CISO Nexus backend (base /api/v1)

export type Role = string;

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: Role;
}

export type Severity = 'low' | 'medium' | 'high' | 'critical' | string;

export interface FrameworkCoverage {
  id: string;
  name: string;
  jurisdiction: string;
  coverage_pct: number;
}

export interface DashboardSummary {
  risks: { total: number; open: number; high: number; critical_avg_score: number };
  incidents: { open: number; dora_major: number; overdue_notifications: number };
  vendors: { total: number; tier1: number; critical_function: number; no_exit_strategy: number };
  evidence: { total: number; pass: number; fail: number; unmapped: number };
  connectors: { configured: number; healthy: number; total: number };
  frameworks: FrameworkCoverage[];
}

export type ConnectorCategory = 'grc' | 'security' | 'itsm' | string;

export interface Connector {
  key: string;
  display_name: string;
  category: ConnectorCategory;
  configured: boolean;
  enabled: boolean;
  last_status: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  capabilities: string[];
}

export interface ConnectorHealth {
  ok: boolean;
  detail: string;
  version: string | null;
}

export interface ConnectorSyncResponse {
  queued: boolean;
  job: string;
}

export type Treatment = 'mitigate' | 'accept' | 'transfer' | 'avoid' | 'open' | string;

export interface Risk {
  id: string;
  title: string;
  category: string;
  likelihood: number;
  impact: number;
  inherent_score: number;
  residual_score: number;
  treatment: Treatment;
  owner: string | null;
  external_system: string | null;
  external_id: string | null;
  vendor_id: string | null;
  created_at: string;
}

export interface RiskDraft {
  title: string;
  description: string;
  likelihood: number;
  impact: number;
  treatment: Treatment;
  actions?: string[];
  category?: string;
  owner?: string;
  [key: string]: unknown;
}

export type IncidentStatus = 'open' | 'investigating' | 'contained' | 'closed' | string;

export interface NotificationDeadline {
  regime: string;
  due: string;
  basis: string;
}

export interface Incident {
  id: string;
  title: string;
  status: IncidentStatus;
  severity: Severity;
  source: string;
  detected_at: string;
  dora_major: boolean | null;
  nis2_significant: boolean | null;
  notification_deadlines: NotificationDeadline[] | Record<string, string> | null;
  ticket_ref: string | null;
}

export interface IncidentCreate {
  title: string;
  description: string;
  detected_at: string;
  severity: Severity;
  source: string;
}

export interface IncidentClassification {
  dora_major: boolean;
  dora_criteria: string[] | Record<string, unknown>;
  nis2_significant: boolean;
  personal_data_breach: boolean;
  deadlines: NotificationDeadline[];
  severity: Severity;
  summary: string;
  questions_for_handler: string[];
  approver: string;
}

export interface TicketResponse {
  ticket_ref: string;
}

export interface Vendor {
  id: string;
  name: string;
  country: string;
  tier: number | string | null;
  supports_critical_function: boolean;
  service_type: string;
  sub_outsourcing: boolean | null;
  data_location: string | null;
  contract_end: string | null;
  exit_strategy: boolean | string | null;
  inherent_score: number | null;
  residual_score: number | null;
  last_assessment_at: string | null;
}

export interface VendorCreate {
  name: string;
  country: string;
  service_type: string;
  supports_critical_function?: boolean;
  data_location?: string;
  contract_end?: string;
}

export interface Art30Provision {
  provision: string;
  status: string;
}

export interface VendorAssessment {
  tier: number | string;
  supports_critical_function: boolean;
  tier_rationale: string;
  inherent_score: number;
  residual_score: number;
  art30_provisions: Art30Provision[];
  roi_missing_fields: string[];
  concerns: string[];
  next_action: string;
  approver: string;
}

export type EvidenceResult = 'pass' | 'fail' | 'info' | string;

export interface Evidence {
  id: string;
  source: string;
  source_ref: string;
  title: string;
  collected_at: string;
  result: EvidenceResult;
  sha256: string;
  control_id: string | null;
  ai_mapping_confidence: number | null;
}

export interface EvidenceMapping {
  control_ref: string;
  framework: string;
  result: string;
  confidence: number;
  rationale: string;
}

export interface EvidenceMapResponse {
  mappings: EvidenceMapping[];
}

export interface Framework {
  id: string;
  name: string;
  jurisdiction: string;
  version: string;
}

export type CopilotProvider = 'anthropic' | 'gemini';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ToolTrace {
  tool: string;
  input: unknown;
  result_preview: string;
}

export interface CopilotResponse {
  answer: string;
  trace: ToolTrace[];
  provider: string;
  model: string;
}

export interface AiAuditEntry {
  id: string;
  at: string;
  actor: string;
  agent: string;
  provider: string;
  model: string;
  purpose: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  pii_redacted: boolean;
  human_decision: string | null;
}

export interface CisoBrief {
  generated_at: string;
  markdown: string;
}

// ===================== Extended capabilities =====================

export interface Organization {
  id: string;
  name: string;
  kind: string;
  country: string;
  sector?: string;
  parent_id?: string | null;
  size_band?: string;
  services_provided?: string[];
  regulated_entity?: boolean;
  nis2_category?: string;
}

export interface Me {
  email: string;
  role: Role;
  org_ids: string[];
  organizations: Organization[];
}

export interface RiskAppetite {
  accept_below: number;
  escalate_at: number;
  matrix?: number[][] | string | null;
}

export interface IsmsScope {
  id: string;
  statement: string;
  boundaries: Record<string, string[]> | null;
  applicable_frameworks: string[];
  interested_parties: string[];
  risk_appetite: RiskAppetite;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
}

export interface IsmsRecommendation {
  organization: Organization | string;
  recommended: { id: string; reason: string }[];
}

export interface IsmsBootstrapRequest {
  framework_ids: string[];
  scope_statement: string;
  language: string;
}

export interface IsmsBootstrapResult {
  scope_id: string;
  controls_created: number;
  documents_created: number;
  tasks_created: number;
  frameworks: string[];
}

export type ControlStatus = 'not_implemented' | 'partially_implemented' | 'implemented' | 'not_applicable';

export interface IsmsControl {
  id: string;
  framework_id: string;
  ref: string;
  title: string;
  domain: string;
  applicable: boolean;
  justification: string | null;
  status: ControlStatus;
  maturity: number;
  owner: string | null;
  evidence_count: number;
  last_reviewed_at: string | null;
  implementation_notes?: string | null;
}

export interface ControlPatch {
  applicable?: boolean;
  justification?: string;
  status?: ControlStatus;
  maturity?: number;
  owner?: string;
  implementation_notes?: string;
}

export interface GapSummary {
  id: string;
  framework_id?: string;
  title?: string;
  coverage_pct: number;
  summary: unknown;
  items?: GapItem[];
  created_at?: string;
}

export interface GapItem {
  ref: string;
  title: string;
  domain: string;
  status: string;
  severity: Severity;
  recommendation: string;
  task_id: string | null;
}

export interface GapDetail {
  id?: string;
  title: string;
  coverage_pct: number;
  summary: { by_status?: Record<string, number>; [k: string]: unknown };
  items: GapItem[];
}

export interface Asset {
  id: string;
  name: string;
  asset_type: string;
  owner: string | null;
  classification: string;
  cia: { c: number; i: number; a: number };
  criticality: string | number;
  supports_critical_function: boolean;
  location: string | null;
  external_system: string | null;
  external_id: string | null;
}

export type AssetInput = Omit<Asset, 'id' | 'external_system' | 'external_id'>;

export type PolicyStatus = 'draft' | 'in_review' | 'approved' | 'retired' | string;

export interface RequirementRef {
  framework_id: string;
  ref: string;
}

export interface Policy {
  id: string;
  code: string;
  title: string;
  doc_kind: string;
  language: string;
  owner: string | null;
  status: PolicyStatus;
  current_version: string | number | null;
  review_cycle_months: number;
  next_review_at: string | null;
  requirement_refs: RequirementRef[];
}

export interface PolicyVersionMeta {
  version: string | number;
  author: string;
  ai_generated: boolean;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
  sha256: string;
  change_note: string | null;
}

export interface PolicyDetail extends Policy {
  content_md: string;
  version_meta: PolicyVersionMeta | null;
  versions: PolicyVersionMeta[];
}

export interface PolicyCreate {
  code: string;
  title: string;
  doc_kind: string;
  language: string;
  owner: string;
  review_cycle_months: number;
  requirement_refs: RequirementRef[];
}

export interface PolicyDraftResult {
  version: string | number;
  content_md: string;
  sha256: string;
}

export interface Attestation {
  id?: string;
  user?: string;
  actor?: string;
  email?: string;
  at?: string;
  attested_at?: string;
  version?: string | number;
  [k: string]: unknown;
}

export type TaskStatus = 'backlog' | 'todo' | 'doing' | 'review' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: string;
  assignee: string | null;
  sprint: string | null;
  story_points: number | null;
  due_at: string | null;
  recurrence: string | null;
  related_kind: string | null;
  related_id: string | null;
  ticket_ref: string | null;
  overdue: boolean;
}

export interface TaskBoard {
  columns: Record<TaskStatus, Task[]>;
  sprints: string[];
}

export interface TaskCreate {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: string;
  assignee?: string;
  sprint?: string;
  story_points?: number;
  due_at?: string;
  recurrence?: string;
  related_kind?: string;
  related_id?: string;
  reminder_days_before?: number[];
}

export interface Notification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  related_kind: string | null;
  related_id: string | null;
  created_at: string;
  read_at: string | null;
}

export interface FrameworkFull extends Framework {
  kind: string;
  issuer: string | null;
  effective_date: string | null;
  source_url: string | null;
  requirements: number;
  licensed_text: boolean;
  pack_version: string | null;
  last_checked_at: string | null;
}

export interface Requirement {
  id: string;
  ref: string;
  title: string;
  text: string;
  domain: string;
  kind: string;
  crosswalk: RequirementRef[];
}

export interface RepositoryHit {
  id?: string;
  framework_id?: string;
  framework?: string;
  ref?: string;
  title?: string;
  text?: string;
  snippet?: string;
  score?: number;
  doc_type?: string;
  [k: string]: unknown;
}

export interface LibraryFolder {
  path: string;
  name: string;
  depth: number;
  documents: number;
}

export interface LibraryItem {
  id: string;
  title: string;
  path: string;
  language: string;
  tags: string[];
  chars: number;
}

export interface LibraryPage {
  total: number;
  items: LibraryItem[];
}

export interface RepositoryDocument {
  id: string;
  title: string;
  doc_type: string;
  language: string;
  framework_id: string | null;
  source_url: string | null;
  tags: string[];
  created_at?: string;
  text?: string;
  file_path?: string | null;
}

export interface RepositoryDocumentCreate {
  title: string;
  doc_type: string;
  language: string;
  text: string;
  framework_id?: string;
  source_url?: string;
  tags: string[];
}

export interface RepositoryWatchResult {
  changes: unknown[];
}

export interface SkillInfo {
  skill: string;
  description: string;
}

export interface SkillAskRequest {
  skill: string;
  question: string;
  framework_ids?: string[];
  provider?: CopilotProvider;
  history: ChatMessage[];
}

export interface SkillAnswer {
  answer: string;
  skill: string;
  provider: string;
  model: string;
  sources: { framework: string; ref: string; title: string }[];
}

export type VulnStatus = 'open' | 'mitigated' | 'accepted' | 'false_positive';

export interface Vulnerability {
  id: string;
  cve: string | null;
  title: string;
  severity: Severity;
  cvss: number | null;
  asset_name: string | null;
  status: VulnStatus | string;
  source: string;
  detected_at: string;
  due_at: string | null;
  risk_id: string | null;
}

export interface ConnectorConfigField {
  name: string;
  type?: string;
  label?: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  secret?: boolean;
  options?: string[];
}

export interface ConnectorExt extends Connector {
  config_schema?: ConnectorConfigField[] | Record<string, ConnectorConfigField | string> | null;
  settings?: Record<string, unknown> | null;
}

export interface ConnectorConfigRequest {
  settings: Record<string, unknown>;
  secrets: Record<string, string>;
  enabled: boolean;
}

export interface ConnectorProposal {
  connectors: {
    key: string;
    settings: Record<string, unknown>;
    secrets_needed: string[];
    permissions_to_grant: string[];
    why: string;
  }[];
  isms: {
    suggested_frameworks: string[];
    scope_statement_draft: string;
    risk_appetite: RiskAppetite | Record<string, unknown>;
  };
  schedule: unknown;
  open_questions: string[];
  validation: { ok: boolean; notes: string[] };
}

export interface ReportKinds {
  kinds: string[];
  formats: Record<string, string[]>;
}

export interface ReportHistoryEntry {
  id: string;
  kind: string;
  fmt: string;
  title: string;
  generated_at: string;
  generated_by: string;
  sha256: string;
}

export interface RiskAcceptRequest {
  justification: string;
  accepted_until?: string;
}

export interface RiskHeatmap {
  matrix: number[][];
  appetite: RiskAppetite | null;
}

export interface VendorAssessRequest {
  assessment_content?: string;
  provider?: CopilotProvider;
  apply: boolean;
}

export interface DashboardSummaryExt extends DashboardSummary {
  risks: DashboardSummary['risks'] & { heatmap?: number[][] };
  controls?: { total: number; implemented: number; partial: number; avg_maturity: number };
  vulnerabilities?: { open: number; critical: number; sla_breached: number };
  tasks?: { open: number; overdue: number; by_status: Record<string, number> };
  policies?: { total: number; approved: number; review_due: number };
  organization?: Organization;
}

export interface PolicyTemplate {
  file: string;
  kind: string;
  code: string | null;
  title: string | null;
  language: string;
  generic: boolean;
  preview: string | null;
}

export interface PolicyTemplateDetail extends Omit<PolicyTemplate, 'preview'> {
  body: string;
}
