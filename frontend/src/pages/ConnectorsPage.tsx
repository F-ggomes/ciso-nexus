import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, CheckCircle2, CircleDashed, RefreshCw, Settings, Sparkles, XCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { ConnectorConfigField, ConnectorExt, ConnectorHealth, ConnectorProposal, CopilotProvider } from '../api/types';
import Drawer from '../components/Drawer';
import { Alert, Field, KV, PageHeader, Spinner, errorMessage, fmtDate } from '../components/common';
import { useI18n } from '../i18n';

const CATEGORY_LABEL: Record<string, string> = {
  grc: 'GRC platforms',
  security: 'Security tooling',
  itsm: 'ITSM / ticketing',
};
const CATEGORY_ORDER = ['grc', 'security', 'itsm'];
const SECRET_RE = /(password|secret|token|api_key|apikey|private_key|client_secret)/i;

export function isSecretField(f: ConnectorConfigField): boolean {
  return !!f.secret || SECRET_RE.test(f.name) || (f.type ?? '').toLowerCase() === 'password';
}

/** Normalise config_schema (array or object map) to a field list. */
export function schemaFields(c: ConnectorExt): ConnectorConfigField[] {
  const s = c.config_schema;
  if (!s) return [];
  if (Array.isArray(s)) return s;
  return Object.entries(s).map(([name, v]) => (typeof v === 'string' ? { name, type: v } : { ...v, name: v.name ?? name }));
}

function StatusIcon({ c }: { c: ConnectorExt }) {
  if (!c.configured) return <CircleDashed className="h-4 w-4 text-slate-400" />;
  const s = (c.last_status ?? '').toLowerCase();
  if (s === 'ok' || s === 'healthy' || s === 'success') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (s === 'error' || s === 'failed' || c.last_error) return <XCircle className="h-4 w-4 text-rose-600" />;
  return <Activity className="h-4 w-4 text-amber-500" />;
}

interface ConfigureState {
  connector: ConnectorExt;
  presetSettings?: Record<string, unknown>;
}

function ConfigureDrawer({ state, onClose }: { state: ConfigureState | null; onClose: () => void }) {
  const qc = useQueryClient();
  const c = state?.connector ?? null;
  const fields = useMemo(() => (c ? schemaFields(c) : []), [c]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!c) return;
    const init: Record<string, string> = {};
    for (const f of fields) {
      if (isSecretField(f)) continue;
      const preset = state?.presetSettings?.[f.name];
      const existing = c.settings?.[f.name];
      const v = preset ?? existing ?? f.default ?? '';
      init[f.name] = typeof v === 'string' ? v : JSON.stringify(v);
    }
    setSettings(init);
    setSecrets({});
    setEnabled(c.enabled ?? true);
  }, [c, fields, state?.presetSettings]);

  const save = useMutation({
    mutationFn: () => {
      const parsed: Record<string, unknown> = {};
      for (const f of fields) {
        if (isSecretField(f)) continue;
        const raw = settings[f.name] ?? '';
        const type = (f.type ?? 'string').toLowerCase();
        if (type === 'boolean' || type === 'bool') parsed[f.name] = raw === 'true';
        else if (type === 'number' || type === 'integer' || type === 'int') parsed[f.name] = raw === '' ? null : Number(raw);
        else if (type === 'json' || type === 'object' || type === 'array') {
          try {
            parsed[f.name] = raw ? JSON.parse(raw) : null;
          } catch {
            parsed[f.name] = raw;
          }
        } else parsed[f.name] = raw;
      }
      const sec: Record<string, string> = {};
      Object.entries(secrets).forEach(([k, v]) => {
        if (v) sec[k] = v;
      });
      return api.connectors.configure(c!.key, { settings: parsed, secrets: sec, enabled });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connectors'] });
      onClose();
    },
  });

  return (
    <Drawer
      open={!!c}
      onClose={onClose}
      title={c ? `Configure · ${c.display_name}` : ''}
      subtitle={c ? `${c.key} · ${c.category} · secrets are stored encrypted server-side and never shown again` : undefined}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save configuration'}
          </button>
        </>
      }
    >
      {c && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Enabled (scheduled sync and evidence collection)
          </label>
          {fields.length === 0 && <p className="text-xs text-slate-500">This connector exposes no configuration schema.</p>}
          {fields.filter((f) => !isSecretField(f)).length > 0 && <h3 className="section-title">Settings</h3>}
          {fields
            .filter((f) => !isSecretField(f))
            .map((f) => {
              const type = (f.type ?? 'string').toLowerCase();
              return (
                <Field key={f.name} label={`${f.label ?? f.name}${f.required ? ' *' : ''}`} hint={f.description}>
                  {f.options && f.options.length > 0 ? (
                    <select className="input" value={settings[f.name] ?? ''} onChange={(e) => setSettings((s) => ({ ...s, [f.name]: e.target.value }))}>
                      <option value="">—</option>
                      {f.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : type === 'boolean' || type === 'bool' ? (
                    <select className="input" value={settings[f.name] ?? 'false'} onChange={(e) => setSettings((s) => ({ ...s, [f.name]: e.target.value }))}>
                      <option value="true">true</option>
                      <option value="false">false</option>
                    </select>
                  ) : type === 'json' || type === 'object' || type === 'array' ? (
                    <textarea className="input mono h-20" value={settings[f.name] ?? ''} onChange={(e) => setSettings((s) => ({ ...s, [f.name]: e.target.value }))} />
                  ) : (
                    <input
                      className="input"
                      type={type === 'number' || type === 'integer' || type === 'int' ? 'number' : type === 'url' ? 'url' : 'text'}
                      value={settings[f.name] ?? ''}
                      onChange={(e) => setSettings((s) => ({ ...s, [f.name]: e.target.value }))}
                      placeholder={f.default !== undefined && f.default !== null ? String(f.default) : undefined}
                    />
                  )}
                </Field>
              );
            })}
          {fields.some(isSecretField) && <h3 className="section-title pt-2">Secrets</h3>}
          {fields.filter(isSecretField).map((f) => (
            <Field key={f.name} label={`${f.label ?? f.name}${f.required ? ' *' : ''}`} hint={f.description ?? 'Leave blank to keep the existing value.'}>
              <input className="input" type="password" autoComplete="new-password" value={secrets[f.name] ?? ''} onChange={(e) => setSecrets((s) => ({ ...s, [f.name]: e.target.value }))} />
            </Field>
          ))}
          {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
        </div>
      )}
    </Drawer>
  );
}

function ConnectorCard({ c, onConfigure }: { c: ConnectorExt; onConfigure: (c: ConnectorExt) => void }) {
  const qc = useQueryClient();
  const [health, setHealth] = useState<ConnectorHealth | null>(null);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);
  const fields = schemaFields(c);

  const healthM = useMutation({
    mutationFn: () => api.connectors.health(c.key),
    onSuccess: (h) => {
      setHealth(h);
      setMsg({ kind: h.ok ? 'success' : 'error', text: `${h.detail}${h.version ? ` · v${h.version}` : ''}` });
      qc.invalidateQueries({ queryKey: ['connectors'] });
    },
    onError: (e) => setMsg({ kind: 'error', text: errorMessage(e) }),
  });
  const syncM = useMutation({
    mutationFn: () => api.connectors.sync(c.key),
    onSuccess: (r) => {
      setMsg({ kind: 'info', text: r.queued ? `Sync queued · job ${r.job}` : `Sync response: ${JSON.stringify(r)}` });
      qc.invalidateQueries({ queryKey: ['connectors'] });
      qc.invalidateQueries({ queryKey: ['evidence'] });
    },
    onError: (e) => setMsg({ kind: 'error', text: errorMessage(e) }),
  });

  return (
    <div className={`card flex flex-col gap-2 p-3 ${!c.configured ? 'opacity-80' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <StatusIcon c={c} />
            <span className="truncate text-sm font-semibold text-navy-900 dark:text-slate-100">{c.display_name}</span>
          </div>
          <div className="mono text-2xs text-slate-500">{c.key}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={c.configured ? 'badge-pass' : 'badge-neutral'}>{c.configured ? 'configured' : 'not configured'}</span>
          {!c.enabled && <span className="badge-neutral">disabled</span>}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 text-2xs">
        <dt className="text-slate-500">Last status</dt>
        <dd className="text-right font-medium">{health ? (health.ok ? 'ok' : 'error') : (c.last_status ?? '—')}</dd>
        <dt className="text-slate-500">Last sync</dt>
        <dd className="text-right font-medium">{fmtDate(c.last_sync_at)}</dd>
      </dl>
      {c.last_error && (
        <p className="truncate text-2xs text-rose-600 dark:text-rose-400" title={c.last_error}>
          {c.last_error}
        </p>
      )}
      <div className="flex flex-wrap gap-1">
        {c.capabilities.map((cap) => (
          <span key={cap} className="badge-neutral normal-case">
            {cap}
          </span>
        ))}
      </div>
      {fields.length > 0 && (
        <div className="text-2xs text-slate-500">
          <span className="font-semibold">Config:</span>{' '}
          {fields.map((f, i) => (
            <span key={f.name}>
              <span className={`mono ${isSecretField(f) ? 'text-amber-700 dark:text-amber-400' : ''}`} title={isSecretField(f) ? 'secret' : f.type ?? 'string'}>
                {f.name}
                {f.required ? '*' : ''}
              </span>
              {i < fields.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
      )}
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <div className="mt-auto flex gap-2 pt-1">
        <button className="btn-secondary justify-center" onClick={() => onConfigure(c)} title="Configure">
          <Settings className="h-3.5 w-3.5" />
        </button>
        <button className="btn-secondary flex-1 justify-center" onClick={() => healthM.mutate()} disabled={healthM.isPending || !c.configured}>
          <Activity className="h-3.5 w-3.5" />
          {healthM.isPending ? 'Checking…' : 'Health'}
        </button>
        <button className="btn-primary flex-1 justify-center" onClick={() => syncM.mutate()} disabled={syncM.isPending || !c.configured || !c.enabled}>
          <RefreshCw className={`h-3.5 w-3.5 ${syncM.isPending ? 'animate-spin' : ''}`} />
          {syncM.isPending ? 'Queuing…' : 'Sync'}
        </button>
      </div>
    </div>
  );
}

function AiSetupAssistant({ connectors, onApply }: { connectors: ConnectorExt[]; onApply: (state: ConfigureState) => void }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState<CopilotProvider>('anthropic');
  const propose = useMutation({ mutationFn: () => api.connectors.propose(description, provider) });
  const p: ConnectorProposal | undefined = propose.data;

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent-600" />
          <h2 className="text-sm font-semibold text-navy-900 dark:text-slate-100">AI setup assistant</h2>
        </div>
        <button className="btn-secondary" onClick={() => setOpen((o) => !o)}>
          {open ? 'Hide' : 'Open'}
        </button>
      </div>
      {open && (
        <div className="mt-3 space-y-3">
          <Field label="Describe your environment" hint="Tools, platforms, hosting, jurisdictions and what you want monitored. The assistant proposes connector settings and a starting ISMS; secrets are never generated.">
            <textarea className="input h-24" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="We run OneTrust for GRC, Wazuh and Microsoft Defender for security, Jira Service Management for tickets, Azure in West Europe, offices in Coimbra and Luanda; regulated by Banco de Portugal and BNA…" />
          </Field>
          <div className="flex items-center justify-between">
            <div className="flex items-center overflow-hidden rounded border border-slate-300 text-xs dark:border-navy-700">
              {(
                [
                  ['anthropic', 'Claude'],
                  ['gemini', 'Gemini'],
                ] as [CopilotProvider, string][]
              ).map(([k, label]) => (
                <button key={k} onClick={() => setProvider(k)} className={`px-3 py-1 font-medium ${provider === k ? 'bg-navy-800 text-white dark:bg-accent-600' : 'bg-white text-slate-600 dark:bg-navy-900 dark:text-slate-300'}`}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              {propose.isPending && <Spinner label={`Proposing with ${provider === 'anthropic' ? 'Claude' : 'Gemini'}…`} />}
              <button className="btn-primary" onClick={() => propose.mutate()} disabled={propose.isPending || description.trim().length < 10}>
                <Sparkles className="h-3.5 w-3.5" />
                Propose setup
              </button>
            </div>
          </div>
          {propose.isError && <Alert>{errorMessage(propose.error)}</Alert>}
          {p && (
            <div className="space-y-3">
              <Alert kind={p.validation?.ok ? 'success' : 'info'}>
                {p.validation?.ok ? 'Proposal validated.' : 'Proposal has notes to review.'}
                {p.validation?.notes?.length > 0 && (
                  <ul className="mt-1 list-disc pl-4">
                    {p.validation.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                )}
              </Alert>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {p.connectors.map((pc) => {
                  const known = connectors.find((c) => c.key === pc.key);
                  return (
                    <div key={pc.key} className="rounded border border-slate-200 p-3 text-xs dark:border-navy-800">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold">{known?.display_name ?? pc.key}</span> <span className="mono text-2xs text-slate-500">{pc.key}</span>
                        </div>
                        <button className="btn-primary py-0.5" disabled={!known} title={known ? '' : 'Unknown connector key'} onClick={() => known && onApply({ connector: known, presetSettings: pc.settings })}>
                          Apply settings
                        </button>
                      </div>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">{pc.why}</p>
                      <div className="mt-2">
                        {Object.entries(pc.settings ?? {}).map(([k, v]) => (
                          <KV key={k} k={k} v={<span className="mono">{typeof v === 'string' ? v : JSON.stringify(v)}</span>} />
                        ))}
                      </div>
                      {pc.secrets_needed?.length > 0 && (
                        <div className="mt-2">
                          <span className="label">Secrets you will need to enter</span>
                          <div className="flex flex-wrap gap-1">
                            {pc.secrets_needed.map((s) => (
                              <span key={s} className="badge bg-amber-100 text-amber-800 normal-case dark:bg-amber-900/40 dark:text-amber-300">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {pc.permissions_to_grant?.length > 0 && (
                        <div className="mt-2">
                          <span className="label">Permissions to grant</span>
                          <ul className="list-disc pl-4 text-slate-600 dark:text-slate-300">
                            {pc.permissions_to_grant.map((s) => (
                              <li key={s}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="rounded border border-slate-200 p-3 text-xs dark:border-navy-800">
                  <h3 className="section-title mb-1">Suggested ISMS</h3>
                  <div className="mb-1 flex flex-wrap gap-1">
                    {(p.isms?.suggested_frameworks ?? []).map((f) => (
                      <span key={f} className="badge-accent normal-case">
                        {f}
                      </span>
                    ))}
                  </div>
                  <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">{p.isms?.scope_statement_draft}</p>
                  {p.isms?.risk_appetite && <p className="mono mt-1 text-2xs text-slate-500">{JSON.stringify(p.isms.risk_appetite)}</p>}
                  <p className="mt-2 text-2xs text-slate-500">Use the ISMS page to bootstrap with these values.</p>
                </div>
                <div className="rounded border border-slate-200 p-3 text-xs dark:border-navy-800">
                  <h3 className="section-title mb-1">Schedule</h3>
                  <pre className="mono whitespace-pre-wrap text-2xs text-slate-600 dark:text-slate-300">{typeof p.schedule === 'string' ? p.schedule : JSON.stringify(p.schedule, null, 2)}</pre>
                  {p.open_questions?.length > 0 && (
                    <>
                      <h3 className="section-title mt-2 mb-1">Open questions</h3>
                      <ol className="list-decimal pl-4 text-slate-600 dark:text-slate-300">
                        {p.open_questions.map((q, i) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ol>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ConnectorsPage() {
  const { t } = useI18n();
  const connectors = useQuery({ queryKey: ['connectors'], queryFn: api.connectors.list });
  const data = connectors.data ?? [];
  const categories = Array.from(new Set([...CATEGORY_ORDER, ...data.map((c) => c.category)])).filter((cat) => data.some((c) => c.category === cat));
  const [configure, setConfigure] = useState<ConfigureState | null>(null);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('nav.connectors')}
        subtitle="Integrations feeding risks, evidence, incidents and tickets. Secrets are written once and stored server-side."
        actions={
          <button className="btn-secondary" onClick={() => connectors.refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
            {t('common.refresh')}
          </button>
        }
      />
      <AiSetupAssistant connectors={data} onApply={setConfigure} />
      {connectors.isError && <Alert>{errorMessage(connectors.error)}</Alert>}
      {connectors.isLoading && <p className="text-xs text-slate-500">{t('common.loading')}</p>}
      {categories.map((cat) => (
        <section key={cat}>
          <h2 className="section-title mb-2">
            {CATEGORY_LABEL[cat] ?? cat} <span className="ml-1 text-slate-400">({data.filter((c) => c.category === cat).length})</span>
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {data
              .filter((c) => c.category === cat)
              .map((c) => (
                <ConnectorCard key={c.key} c={c} onConfigure={(conn) => setConfigure({ connector: conn })} />
              ))}
          </div>
        </section>
      ))}
      <ConfigureDrawer state={configure} onClose={() => setConfigure(null)} />
    </div>
  );
}
