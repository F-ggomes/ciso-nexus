import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Play, Save, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { ControlPatch, ControlStatus, GapItem, IsmsControl, IsmsScope, RiskAppetite } from '../api/types';
import DataTable, { type Column } from '../components/DataTable';
import Drawer from '../components/Drawer';
import SeverityBadge from '../components/SeverityBadge';
import { Alert, Field, KV, PageHeader, Spinner, errorMessage, fmtDate, fmtNum } from '../components/common';
import { useI18n } from '../i18n';

type Tab = 'scope' | 'controls' | 'gap';

const CONTROL_STATUSES: ControlStatus[] = ['not_implemented', 'partially_implemented', 'implemented', 'not_applicable'];

function statusBadge(s: string) {
  switch (s) {
    case 'implemented':
      return 'badge-pass';
    case 'partially_implemented':
      return 'badge bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
    case 'not_applicable':
      return 'badge-neutral';
    default:
      return 'badge-fail';
  }
}

// ---------------------------------------------------------------- Scope / wizard
function AppetiteSliders({ value, onChange }: { value: RiskAppetite; onChange: (v: RiskAppetite) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="block text-xs">
        <span className="label">Accept below (score 1–25)</span>
        <input type="range" min={1} max={25} value={value.accept_below} onChange={(e) => onChange({ ...value, accept_below: Number(e.target.value) })} className="w-full" />
        <span className="font-semibold tabular-nums">{value.accept_below}</span> — risks under this score are accepted without treatment
      </label>
      <label className="block text-xs">
        <span className="label">Escalate at (score 1–25)</span>
        <input type="range" min={1} max={25} value={value.escalate_at} onChange={(e) => onChange({ ...value, escalate_at: Number(e.target.value) })} className="w-full" />
        <span className="font-semibold tabular-nums">{value.escalate_at}</span> — risks at or above this score go to the board / CISO
      </label>
    </div>
  );
}

function BootstrapWizard({ onDone }: { onDone: () => void }) {
  const recommend = useQuery({ queryKey: ['isms', 'recommend'], queryFn: api.isms.recommend });
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [statement, setStatement] = useState('');
  const [language, setLanguage] = useState('pt-PT');
  const [appetite, setAppetite] = useState<RiskAppetite>({ accept_below: 6, escalate_at: 15 });

  useEffect(() => {
    if (recommend.data && selected.length === 0) setSelected(recommend.data.recommended.map((r) => r.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommend.data]);

  const bootstrap = useMutation({
    mutationFn: () => api.isms.bootstrap({ framework_ids: selected, scope_statement: statement, language }),
    onSuccess: async () => {
      try {
        await api.isms.patchScope({ risk_appetite: appetite });
      } catch {
        /* appetite patch is best-effort */
      }
      onDone();
    },
  });

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const orgName = typeof recommend.data?.organization === 'string' ? recommend.data?.organization : recommend.data?.organization?.name;

  return (
    <div className="card p-4">
      <div className="mb-4 flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${step >= n ? 'bg-accent-600 text-white' : 'bg-slate-200 text-slate-600 dark:bg-navy-800 dark:text-slate-300'}`}>{n}</span>
            <span className={`text-xs ${step === n ? 'font-semibold' : 'text-slate-500'}`}>{['Frameworks', 'Scope statement', 'Risk appetite'][n - 1]}</span>
            {n < 3 && <span className="mx-1 h-px w-8 bg-slate-300 dark:bg-navy-700" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Recommended frameworks for <span className="font-semibold">{orgName ?? 'this organisation'}</span>. Untick anything that does not apply.
          </p>
          {recommend.isLoading && <Spinner label="Analysing organisation…" />}
          {recommend.isError && <Alert>{errorMessage(recommend.error)}</Alert>}
          <ul className="divide-y divide-slate-100 dark:divide-navy-800">
            {recommend.data?.recommended.map((r) => (
              <li key={r.id} className="flex items-start gap-3 py-2">
                <input type="checkbox" className="mt-0.5" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} />
                <div>
                  <div className="text-xs font-semibold">{r.id}</div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">{r.reason}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <Field label="Scope statement" hint="Describe the organisational units, locations, services and systems covered by the ISMS (ISO/IEC 27001 cl. 4.3).">
            <textarea className="input h-40" value={statement} onChange={(e) => setStatement(e.target.value)} placeholder="The ISMS covers the design, development, hosting and support of financial software products delivered from Coimbra and Luanda…" />
          </Field>
          <Field label="Document language">
            <select className="input w-auto" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="pt-PT">Português (PT)</option>
              <option value="en">English</option>
            </select>
          </Field>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <AppetiteSliders value={appetite} onChange={setAppetite} />
          {appetite.accept_below >= appetite.escalate_at && <Alert kind="info">"Accept below" should be lower than "Escalate at".</Alert>}
          <div className="rounded-sm border border-slate-200 p-3 text-xs dark:border-navy-800">
            <KV k="Frameworks" v={selected.join(', ') || '—'} />
            <KV k="Language" v={language} />
            <KV k="Scope statement" v={<span className="line-clamp-3 text-left">{statement || '—'}</span>} />
          </div>
          {bootstrap.isError && <Alert>{errorMessage(bootstrap.error)}</Alert>}
        </div>
      )}

      <div className="mt-4 flex justify-between">
        <button className="btn-secondary" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
          Back
        </button>
        {step < 3 ? (
          <button className="btn-primary" onClick={() => setStep((s) => s + 1)} disabled={(step === 1 && selected.length === 0) || (step === 2 && statement.trim().length < 10)}>
            Next
          </button>
        ) : (
          <button className="btn-primary" onClick={() => bootstrap.mutate()} disabled={bootstrap.isPending || selected.length === 0}>
            <Wand2 className="h-3.5 w-3.5" />
            {bootstrap.isPending ? 'Bootstrapping…' : 'Run bootstrap'}
          </button>
        )}
      </div>
      {bootstrap.data && (
        <div className="mt-3">
          <Alert kind="success">
            Scope {bootstrap.data.scope_id} created: {bootstrap.data.controls_created} controls, {bootstrap.data.documents_created} documents, {bootstrap.data.tasks_created} tasks across{' '}
            {bootstrap.data.frameworks.join(', ')}.
          </Alert>
        </div>
      )}
    </div>
  );
}

const boundariesToText = (b: IsmsScope['boundaries']) =>
  Object.entries(b ?? {})
    .map(([k, v]) => `${k}: ${(v ?? []).join(', ')}`)
    .join('\n');

const textToBoundaries = (text: string): Record<string, string[]> =>
  Object.fromEntries(
    text
      .split('\n')
      .map((line) => line.split(':'))
      .filter(([k]) => k.trim())
      .map(([k, ...v]) => [k.trim(), v.join(':').split(',').map((s) => s.trim()).filter(Boolean)]),
  );

function ScopeView({ scope }: { scope: IsmsScope }) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState(false);
  const [statement, setStatement] = useState(scope.statement);
  const [boundaries, setBoundaries] = useState(boundariesToText(scope.boundaries));
  const [parties, setParties] = useState((scope.interested_parties ?? []).join(', '));
  const [appetite, setAppetite] = useState<RiskAppetite>(scope.risk_appetite ?? { accept_below: 6, escalate_at: 15 });

  const save = useMutation({
    mutationFn: () =>
      api.isms.patchScope({
        statement,
        boundaries: textToBoundaries(boundaries),
        interested_parties: parties.split(',').map((s) => s.trim()).filter(Boolean),
        risk_appetite: appetite,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['isms', 'scope'] });
      setEdit(false);
    },
  });
  const approve = useMutation({ mutationFn: api.isms.approveScope, onSuccess: () => qc.invalidateQueries({ queryKey: ['isms', 'scope'] }) });

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
      <div className="card p-4 xl:col-span-2">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="section-title">Scope statement</h2>
          <div className="flex items-center gap-2">
            <span className={scope.status === 'approved' ? 'badge-pass' : 'badge-info'}>{scope.status}</span>
            {!edit && (
              <button className="btn-secondary" onClick={() => setEdit(true)}>
                Edit
              </button>
            )}
          </div>
        </div>
        {!edit ? (
          <>
            <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{scope.statement}</p>
            {boundariesToText(scope.boundaries) && (
              <>
                <h3 className="section-title mt-3 mb-1">Boundaries</h3>
                <p className="whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300">{boundariesToText(scope.boundaries)}</p>
              </>
            )}
            <h3 className="section-title mt-3 mb-1">Interested parties</h3>
            <div className="flex flex-wrap gap-1">
              {(scope.interested_parties ?? []).map((p) => (
                <span key={p} className="badge-neutral normal-case">
                  {p}
                </span>
              ))}
              {(scope.interested_parties ?? []).length === 0 && <span className="text-xs text-slate-500">—</span>}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <Field label="Statement">
              <textarea className="input h-32" value={statement} onChange={(e) => setStatement(e.target.value)} />
            </Field>
            <Field label="Boundaries">
              <textarea className="input h-20" value={boundaries} onChange={(e) => setBoundaries(e.target.value)} />
            </Field>
            <Field label="Interested parties (comma separated)">
              <input className="input" value={parties} onChange={(e) => setParties(e.target.value)} />
            </Field>
            <AppetiteSliders value={appetite} onChange={setAppetite} />
            {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setEdit(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>
                <Save className="h-3.5 w-3.5" />
                {save.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="space-y-3">
        <div className="card p-4">
          <h2 className="section-title mb-2">Risk appetite</h2>
          <KV k="Accept below" v={scope.risk_appetite?.accept_below ?? '—'} />
          <KV k="Escalate at" v={scope.risk_appetite?.escalate_at ?? '—'} />
          <KV k="Matrix" v={typeof scope.risk_appetite?.matrix === 'string' ? scope.risk_appetite.matrix : scope.risk_appetite?.matrix ? '5×5 custom' : 'default 5×5'} />
        </div>
        <div className="card p-4">
          <h2 className="section-title mb-2">Applicable frameworks</h2>
          <div className="flex flex-wrap gap-1">
            {scope.applicable_frameworks.map((f) => (
              <span key={f} className="badge-accent normal-case">
                {f}
              </span>
            ))}
          </div>
        </div>
        <div className="card p-4">
          <h2 className="section-title mb-2">Approval</h2>
          <KV k="Approved by" v={scope.approved_by ?? '—'} />
          <KV k="Approved at" v={fmtDate(scope.approved_at)} />
          {approve.isError && (
            <div className="mt-2">
              <Alert>{errorMessage(approve.error)}</Alert>
            </div>
          )}
          <button className="btn-primary mt-3 w-full justify-center" onClick={() => approve.mutate()} disabled={approve.isPending || scope.status === 'approved'}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            {scope.status === 'approved' ? 'Approved' : approve.isPending ? 'Approving…' : 'Approve scope (CISO)'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Controls
function ControlEditor({ control, onClose }: { control: IsmsControl | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ControlPatch>({});
  useEffect(() => {
    if (control)
      setForm({
        applicable: control.applicable,
        justification: control.justification ?? '',
        status: control.status,
        maturity: control.maturity,
        owner: control.owner ?? '',
        implementation_notes: control.implementation_notes ?? '',
      });
  }, [control]);
  const save = useMutation({
    mutationFn: () => api.isms.patchControl(control!.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['isms', 'controls'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
  });
  return (
    <Drawer
      open={!!control}
      onClose={onClose}
      title={control ? `${control.ref} · ${control.title}` : ''}
      subtitle={control ? `${control.framework_id} · ${control.domain} · ${control.evidence_count} evidence item(s)` : undefined}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="h-3.5 w-3.5" />
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      {control && (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={!!form.applicable} onChange={(e) => setForm((f) => ({ ...f, applicable: e.target.checked, status: e.target.checked ? f.status : 'not_applicable' }))} />
            Applicable to this organisation
          </label>
          <Field label="Justification (SoA)">
            <textarea className="input h-20" value={form.justification ?? ''} onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ControlStatus }))}>
                {CONTROL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`Maturity (${form.maturity ?? 0}/5)`}>
              <input type="range" min={0} max={5} className="w-full" value={form.maturity ?? 0} onChange={(e) => setForm((f) => ({ ...f, maturity: Number(e.target.value) }))} />
            </Field>
          </div>
          <Field label="Owner">
            <input className="input" value={form.owner ?? ''} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} />
          </Field>
          <Field label="Implementation notes">
            <textarea className="input h-24" value={form.implementation_notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, implementation_notes: e.target.value }))} />
          </Field>
          <KV k="Last reviewed" v={fmtDate(control.last_reviewed_at)} />
          {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
        </div>
      )}
    </Drawer>
  );
}

function MaturityDots({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" title={`Maturity ${value}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`h-2 w-2 rounded-full ${n <= value ? 'bg-accent-600' : 'bg-slate-200 dark:bg-navy-700'}`} />
      ))}
    </span>
  );
}

function ControlsTab({ frameworks }: { frameworks: string[] }) {
  const qc = useQueryClient();
  const [framework, setFramework] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<IsmsControl | null>(null);
  const controls = useQuery({ queryKey: ['isms', 'controls', framework, status], queryFn: () => api.isms.controls({ framework_id: framework || undefined, status: status || undefined }) });
  const quick = useMutation({
    mutationFn: (args: { id: string; body: ControlPatch }) => api.isms.patchControl(args.id, args.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['isms', 'controls'] }),
  });

  const columns: Column<IsmsControl>[] = [
    { key: 'ref', header: 'Ref', render: (c) => <span className="mono text-2xs">{c.ref}</span>, width: '90px' },
    { key: 'fw', header: 'Framework', render: (c) => <span className="badge-accent normal-case">{c.framework_id}</span> },
    {
      key: 'title',
      header: 'Control',
      render: (c) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-100">{c.title}</div>
          <div className="text-2xs text-slate-500">{c.domain}</div>
        </div>
      ),
    },
    {
      key: 'applicable',
      header: 'Applicable',
      render: (c) => (
        <input type="checkbox" checked={c.applicable} onChange={(e) => quick.mutate({ id: c.id, body: { applicable: e.target.checked, status: e.target.checked ? undefined : 'not_applicable' } })} onClick={(e) => e.stopPropagation()} />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <select
          className={`${statusBadge(c.status)} cursor-pointer border-0 bg-transparent`}
          value={c.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => quick.mutate({ id: c.id, body: { status: e.target.value as ControlStatus } })}
        >
          {CONTROL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      ),
    },
    { key: 'maturity', header: 'Maturity', render: (c) => <MaturityDots value={c.maturity} /> },
    { key: 'owner', header: 'Owner', render: (c) => c.owner ?? <span className="text-slate-400">unassigned</span> },
    { key: 'evidence', header: 'Evidence', render: (c) => <span className="tabular-nums">{c.evidence_count}</span>, className: 'text-right' },
    { key: 'reviewed', header: 'Reviewed', render: (c) => <span className="whitespace-nowrap text-slate-500">{fmtDate(c.last_reviewed_at, false)}</span> },
  ];

  const data = controls.data ?? [];
  const implemented = data.filter((c) => c.status === 'implemented').length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-auto" value={framework} onChange={(e) => setFramework(e.target.value)}>
          <option value="">All frameworks</option>
          {frameworks.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {CONTROL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-slate-500">
          {data.length} controls · {implemented} implemented ({data.length ? Math.round((implemented / data.length) * 100) : 0}%) · click a row to edit
        </span>
      </div>
      {quick.isError && <Alert>{errorMessage(quick.error)}</Alert>}
      <DataTable columns={columns} rows={data} rowKey={(c) => c.id} loading={controls.isLoading} error={controls.isError ? errorMessage(controls.error) : null} onRowClick={setEditing} maxHeight="calc(100vh - 290px)" />
      <ControlEditor control={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

// ---------------------------------------------------------------- Gap analysis
function Gauge({ pct }: { pct: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * c;
  const color = pct >= 80 ? '#0d9488' : pct >= 50 ? '#f59e0b' : '#e11d48';
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28">
      <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" className="text-slate-200 dark:text-navy-800" strokeWidth="10" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="10" strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round" transform="rotate(-90 50 50)" />
      <text x="50" y="55" textAnchor="middle" className="fill-navy-900 text-[20px] font-semibold dark:fill-slate-100">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

function GapTab({ frameworks }: { frameworks: string[] }) {
  const qc = useQueryClient();
  const gaps = useQuery({ queryKey: ['isms', 'gaps'], queryFn: api.isms.gaps });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [framework, setFramework] = useState(frameworks[0] ?? '');
  const [severity, setSeverity] = useState('');
  const detail = useQuery({ queryKey: ['isms', 'gap', selectedId], queryFn: () => api.isms.gap(selectedId!), enabled: !!selectedId });
  const run = useMutation({
    mutationFn: (fw: string) => api.isms.runGap(fw),
    onSuccess: (g) => {
      qc.invalidateQueries({ queryKey: ['isms', 'gaps'] });
      setSelectedId(g.id);
    },
  });

  useEffect(() => {
    if (!selectedId && gaps.data && gaps.data.length > 0) setSelectedId(gaps.data[0].id);
  }, [gaps.data, selectedId]);
  useEffect(() => {
    if (!framework && frameworks.length > 0) setFramework(frameworks[0]);
  }, [frameworks, framework]);

  const items = useMemo(() => (detail.data?.items ?? []).filter((i) => !severity || (i.severity ?? '').toLowerCase() === severity), [detail.data, severity]);

  const columns: Column<GapItem>[] = [
    { key: 'ref', header: 'Ref', render: (i) => <span className="mono text-2xs">{i.ref}</span>, width: '90px' },
    {
      key: 'title',
      header: 'Requirement',
      render: (i) => (
        <div>
          <div className="font-medium">{i.title}</div>
          <div className="text-2xs text-slate-500">{i.domain}</div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (i) => <span className={statusBadge(i.status)}>{i.status.replace(/_/g, ' ')}</span> },
    { key: 'sev', header: 'Severity', render: (i) => <SeverityBadge severity={i.severity} /> },
    { key: 'rec', header: 'Recommendation', render: (i) => <span className="text-slate-700 dark:text-slate-300">{i.recommendation}</span> },
    { key: 'task', header: 'Task', render: (i) => (i.task_id ? <span className="mono text-2xs">{i.task_id}</span> : '—') },
  ];

  const byStatus = detail.data?.summary?.by_status ?? {};

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-auto" value={framework} onChange={(e) => setFramework(e.target.value)}>
          {frameworks.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <button className="btn-primary" onClick={() => run.mutate(framework)} disabled={run.isPending || !framework}>
          <Play className="h-3.5 w-3.5" />
          {run.isPending ? 'Analysing…' : 'Run gap analysis'}
        </button>
        <select className="input w-auto" value={selectedId ?? ''} onChange={(e) => setSelectedId(e.target.value || null)}>
          <option value="">Select a past analysis…</option>
          {(gaps.data ?? []).map((g) => (
            <option key={g.id} value={g.id}>
              {g.title ?? g.framework_id ?? g.id} · {fmtNum(g.coverage_pct, 0)}% {g.created_at ? `· ${fmtDate(g.created_at, false)}` : ''}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={severity} onChange={(e) => setSeverity(e.target.value)}>
          <option value="">All severities</option>
          {['low', 'medium', 'high', 'critical'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {run.isError && <Alert>{errorMessage(run.error)}</Alert>}
      {detail.isError && <Alert>{errorMessage(detail.error)}</Alert>}
      {detail.isLoading && <Spinner label="Loading analysis…" />}
      {detail.data && (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
          <div className="card flex items-center gap-4 p-4">
            <Gauge pct={detail.data.coverage_pct} />
            <div className="text-xs">
              <div className="text-sm font-semibold">{detail.data.title}</div>
              <div className="text-slate-500">coverage</div>
              <dl className="mt-2 space-y-0.5">
                {Object.entries(byStatus).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-slate-500">{k.replace(/_/g, ' ')}</dt>
                    <dd className="font-semibold tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div className="xl:col-span-3">
            <DataTable columns={columns} rows={items} rowKey={(i) => `${i.ref}-${i.title}`} maxHeight="calc(100vh - 300px)" empty="No gaps for this filter." />
          </div>
        </div>
      )}
      {!detail.data && !detail.isLoading && (gaps.data ?? []).length === 0 && <p className="text-xs text-slate-500">No gap analysis yet. Pick a framework and run one.</p>}
    </div>
  );
}

// ---------------------------------------------------------------- Page
export default function IsmsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('scope');
  const scope = useQuery({ queryKey: ['isms', 'scope'], queryFn: api.isms.scope });
  const frameworks = scope.data?.applicable_frameworks ?? [];

  return (
    <div className="space-y-3">
      <PageHeader title={t('nav.isms')} subtitle="Information security management system: scope, Statement of Applicability, control status and gap analysis." />
      <div className="flex gap-1 border-b border-slate-200 dark:border-navy-800">
        {(['scope', 'controls', 'gap'] as Tab[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-3 py-1.5 text-xs font-medium ${tab === k ? 'border-accent-600 text-navy-900 dark:text-slate-100' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            {k === 'scope' ? 'Scope & appetite' : k === 'controls' ? 'Controls (SoA)' : 'Gap analysis'}
          </button>
        ))}
      </div>
      {scope.isError && <Alert>{errorMessage(scope.error)}</Alert>}
      {tab === 'scope' && (scope.isLoading ? <Spinner /> : scope.data ? <ScopeView scope={scope.data} /> : <BootstrapWizard onDone={() => qc.invalidateQueries({ queryKey: ['isms'] })} />)}
      {tab === 'controls' && <ControlsTab frameworks={frameworks} />}
      {tab === 'gap' && <GapTab frameworks={frameworks} />}
    </div>
  );
}
