import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, Plus, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ApiError } from '../api/client';
import { api } from '../api/client';
import type { Risk, RiskAppetite, RiskDraft } from '../api/types';
import DataTable, { type Column } from '../components/DataTable';
import Modal from '../components/Modal';
import SeverityBadge, { severityFromScore } from '../components/SeverityBadge';
import { Alert, Field, KV, PageHeader, Spinner, errorMessage, fmtDate } from '../components/common';
import { useI18n } from '../i18n';

const TREATMENTS = ['mitigate', 'accept', 'transfer', 'avoid'];

function HeatMap({ risks, matrix, appetite }: { risks: Risk[]; matrix?: number[][] | null; appetite?: RiskAppetite | null }) {
  // Server matrix is expected as matrix[likelihood-1][impact-1]; fall back to client-side counts.
  const counts = useMemo(() => {
    if (matrix && matrix.length === 5 && matrix.every((r) => Array.isArray(r) && r.length === 5)) {
      return Array.from({ length: 5 }, (_, ri) => Array.from({ length: 5 }, (_, ci) => Number(matrix[4 - ri][ci]) || 0));
    }
    const m: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0) as number[]);
    for (const r of risks) {
      const l = Math.min(5, Math.max(1, Math.round(r.likelihood)));
      const i = Math.min(5, Math.max(1, Math.round(r.impact)));
      m[5 - l][i - 1] += 1;
    }
    return m;
  }, [risks, matrix]);

  const cellTone = (l: number, i: number) => {
    const score = l * i;
    if (appetite) {
      if (score >= appetite.escalate_at) return 'bg-rose-500/80 text-white';
      if (score < appetite.accept_below) return 'bg-emerald-300/70 text-navy-900';
      return 'bg-amber-300/80 text-navy-900';
    }
    if (score >= 20) return 'bg-rose-500/80 text-white';
    if (score >= 12) return 'bg-orange-400/80 text-white';
    if (score >= 6) return 'bg-amber-300/80 text-navy-900';
    return 'bg-emerald-300/70 text-navy-900';
  };

  return (
    <div className="card p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="section-title">Heat map (likelihood × impact)</h2>
        {appetite && (
          <span className="text-2xs text-slate-500" title="Risk appetite from the ISMS scope">
            accept &lt; {appetite.accept_below} · escalate ≥ {appetite.escalate_at}
          </span>
        )}
      </div>
      <div className="flex gap-1">
        <div className="flex flex-col justify-between py-0.5 pr-1 text-2xs text-slate-500">
          {[5, 4, 3, 2, 1].map((l) => (
            <span key={l} className="flex h-9 items-center">
              L{l}
            </span>
          ))}
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-5 gap-1">
            {counts.map((row, ri) =>
              row.map((count, ci) => {
                const l = 5 - ri;
                const i = ci + 1;
                return (
                  <div
                    key={`${ri}-${ci}`}
                    title={`Likelihood ${l} × Impact ${i} = ${l * i} · ${count} risk(s)`}
                    className={`flex h-9 items-center justify-center rounded text-sm font-semibold tabular-nums ${cellTone(l, i)} ${count === 0 ? 'opacity-40' : ''}`}
                  >
                    {count || ''}
                  </div>
                );
              }),
            )}
          </div>
          <div className="mt-1 grid grid-cols-5 gap-1 text-center text-2xs text-slate-500">
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i}>I{i}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AcceptRiskModal({ risk, onClose }: { risk: Risk | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [justification, setJustification] = useState('');
  const [until, setUntil] = useState('');
  const accept = useMutation({
    mutationFn: () => api.risks.accept(risk!.id, { justification, accepted_until: until ? new Date(until).toISOString() : undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['risks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setJustification('');
      setUntil('');
      onClose();
    },
  });
  const forbidden = accept.error instanceof ApiError && accept.error.status === 403;
  return (
    <Modal
      open={!!risk}
      onClose={onClose}
      title={risk ? `Accept risk · ${risk.title}` : ''}
      width="max-w-lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={() => accept.mutate()} disabled={accept.isPending || justification.trim().length < 10}>
            <CheckCheck className="h-3.5 w-3.5" />
            {accept.isPending ? 'Accepting…' : 'Accept risk'}
          </button>
        </>
      }
    >
      {risk && (
        <div className="space-y-3">
          <div className="rounded border border-slate-200 p-2 text-xs dark:border-navy-800">
            <KV k="Inherent / residual" v={`${risk.inherent_score} / ${risk.residual_score}`} />
            <KV k="Current treatment" v={risk.treatment} />
            <KV k="Owner" v={risk.owner ?? '—'} />
          </div>
          <Field label="Justification (min. 10 characters)" hint="Recorded in the risk register and the AI audit trail; acceptance above appetite requires the CISO role.">
            <textarea className="input h-24" value={justification} onChange={(e) => setJustification(e.target.value)} />
          </Field>
          <Field label="Accepted until (optional)">
            <input className="input" type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
          </Field>
          {accept.isError && (
            <Alert>
              {forbidden ? 'Not permitted: this risk is above the acceptance threshold for your role. Ask the CISO to accept it or lower the residual score via treatment.' : errorMessage(accept.error)}
            </Alert>
          )}
        </div>
      )}
    </Modal>
  );
}

const SAMPLE_FINDING = JSON.stringify(
  {
    source: 'wazuh',
    rule_id: '5712',
    title: 'Multiple SSH authentication failures from external IP',
    asset: 'srv-pay-01',
    severity: 'high',
    description: 'Brute-force pattern detected against payment gateway host; no MFA on SSH.',
  },
  null,
  2,
);

function NewFromFindingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [json, setJson] = useState(SAMPLE_FINDING);
  const [parseError, setParseError] = useState<string | null>(null);

  const draft = useMutation({
    mutationFn: (finding: unknown) => api.risks.fromFinding(finding),
  });
  const approve = useMutation({
    mutationFn: (d: RiskDraft) => api.risks.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['risks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
      draft.reset();
    },
  });

  const generate = () => {
    setParseError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (e) {
      setParseError(`Invalid JSON: ${(e as Error).message}`);
      return;
    }
    draft.mutate(parsed);
  };

  const d = draft.data;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New risk from finding"
      width="max-w-3xl"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          {d && (
            <button className="btn-primary" onClick={() => approve.mutate(d)} disabled={approve.isPending}>
              {approve.isPending ? 'Saving…' : 'Approve & create risk'}
            </button>
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <span className="label">Finding (JSON)</span>
          <textarea className="input mono h-64 resize-y" value={json} onChange={(e) => setJson(e.target.value)} spellCheck={false} />
          {parseError && <p className="mt-1 text-2xs text-rose-600">{parseError}</p>}
          <button className="btn-primary mt-2" onClick={generate} disabled={draft.isPending}>
            <Sparkles className="h-3.5 w-3.5" />
            {draft.isPending ? 'Drafting…' : 'Generate AI draft'}
          </button>
          {draft.isError && (
            <div className="mt-2">
              <Alert>{errorMessage(draft.error)}</Alert>
            </div>
          )}
        </div>
        <div>
          <span className="label">AI draft (human approval required)</span>
          {!d && !draft.isPending && <p className="text-xs text-slate-500">Paste a finding and generate a draft. Nothing is saved until you approve.</p>}
          {draft.isPending && <Spinner label="Asking the risk agent…" />}
          {d && (
            <div className="space-y-2 rounded border border-slate-200 p-3 dark:border-navy-800">
              <div className="text-sm font-semibold text-navy-900 dark:text-slate-100">{d.title}</div>
              <p className="text-xs text-slate-600 dark:text-slate-300">{d.description}</p>
              <div>
                <KV k="Likelihood" v={d.likelihood} />
                <KV k="Impact" v={d.impact} />
                <KV k="Inherent score" v={<SeverityBadge severity={severityFromScore(d.likelihood * d.impact)} />} />
                <KV k="Treatment" v={<span className="badge-neutral">{d.treatment}</span>} />
                {d.category && <KV k="Category" v={String(d.category)} />}
                {d.owner && <KV k="Owner" v={String(d.owner)} />}
              </div>
              {Array.isArray(d.actions) && d.actions.length > 0 && (
                <div>
                  <span className="label">Proposed actions</span>
                  <ul className="list-disc space-y-0.5 pl-4 text-xs">
                    {d.actions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {approve.isError && <Alert>{errorMessage(approve.error)}</Alert>}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function RisksPage() {
  const { t } = useI18n();
  const [treatment, setTreatment] = useState('');
  const [modal, setModal] = useState(false);
  const [accepting, setAccepting] = useState<Risk | null>(null);
  const heatmap = useQuery({ queryKey: ['risks', 'heatmap'], queryFn: api.risks.heatmap });
  const risks = useQuery({
    queryKey: ['risks', treatment],
    queryFn: () => api.risks.list({ treatment: treatment || undefined, limit: 500 }),
  });

  const columns: Column<Risk>[] = [
    { key: 'id', header: 'ID', render: (r) => <span className="mono text-2xs text-slate-500">{r.id}</span>, width: '90px' },
    {
      key: 'title',
      header: 'Title',
      render: (r) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-100">{r.title}</div>
          <div className="text-2xs text-slate-500">{r.category}</div>
        </div>
      ),
    },
    { key: 'l', header: 'L', render: (r) => <span className="tabular-nums">{r.likelihood}</span>, className: 'text-center', width: '40px' },
    { key: 'i', header: 'I', render: (r) => <span className="tabular-nums">{r.impact}</span>, className: 'text-center', width: '40px' },
    {
      key: 'inherent',
      header: 'Inherent',
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="tabular-nums">{r.inherent_score}</span>
          <SeverityBadge severity={severityFromScore(r.inherent_score)} />
        </span>
      ),
    },
    {
      key: 'residual',
      header: 'Residual',
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="tabular-nums">{r.residual_score}</span>
          <SeverityBadge severity={severityFromScore(r.residual_score)} />
        </span>
      ),
    },
    { key: 'treatment', header: 'Treatment', render: (r) => <span className="badge-neutral">{r.treatment}</span> },
    { key: 'owner', header: 'Owner', render: (r) => r.owner ?? '—' },
    {
      key: 'ext',
      header: 'External ref',
      render: (r) => (r.external_system ? <span className="mono text-2xs">{r.external_system}:{r.external_id}</span> : '—'),
    },
    { key: 'vendor', header: 'Vendor', render: (r) => r.vendor_id ?? '—' },
    { key: 'created', header: 'Created', render: (r) => <span className="whitespace-nowrap text-slate-500">{fmtDate(r.created_at, false)}</span> },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <button
          className="btn-secondary py-0.5"
          disabled={r.treatment === 'accept'}
          onClick={(e) => {
            e.stopPropagation();
            setAccepting(r);
          }}
        >
          <CheckCheck className="h-3 w-3" />
          Accept
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title={t('nav.risks')}
        subtitle="Risk register with AI-assisted intake. Scores are likelihood × impact on a 1–5 scale."
        actions={
          <>
            <select className="input w-auto" value={treatment} onChange={(e) => setTreatment(e.target.value)}>
              <option value="">{t('common.all')} treatments</option>
              {TREATMENTS.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
            <button className="btn-primary" onClick={() => setModal(true)}>
              <Plus className="h-3.5 w-3.5" />
              New from finding
            </button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
        <div className="xl:col-span-3">
          <DataTable columns={columns} rows={risks.data ?? []} rowKey={(r) => r.id} loading={risks.isLoading} error={risks.isError ? errorMessage(risks.error) : null} />
        </div>
        <div className="space-y-3">
          <HeatMap risks={risks.data ?? []} matrix={heatmap.data?.matrix} appetite={heatmap.data?.appetite} />
          <div className="card p-3 text-xs">
            <h2 className="section-title mb-1">{t('common.total')}</h2>
            <div className="text-2xl font-semibold tabular-nums">{risks.data?.length ?? '…'}</div>
          </div>
        </div>
      </div>
      <NewFromFindingModal open={modal} onClose={() => setModal(false)} />
      <AcceptRiskModal risk={accepting} onClose={() => setAccepting(null)} />
    </div>
  );
}
