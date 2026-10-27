import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GitBranch } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Evidence, EvidenceMapping } from '../api/types';
import DataTable, { type Column } from '../components/DataTable';
import Drawer from '../components/Drawer';
import { Alert, KV, PageHeader, Spinner, errorMessage, fmtDate } from '../components/common';
import { useI18n } from '../i18n';

function ResultBadge({ result }: { result: string }) {
  const r = (result ?? '').toLowerCase();
  const cls = r === 'pass' ? 'badge-pass' : r === 'fail' ? 'badge-fail' : 'badge-info';
  return <span className={cls}>{r || 'info'}</span>;
}

function Confidence({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="text-slate-400">—</span>;
  const pct = value <= 1 ? Math.round(value * 100) : Math.round(value);
  const tone = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-1.5 w-16 overflow-hidden rounded-sm bg-slate-200 dark:bg-navy-800">
        <span className={`block h-full ${tone}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="tabular-nums text-2xs">{pct}%</span>
    </span>
  );
}

function MapDrawer({ evidence, onClose }: { evidence: Evidence | null; onClose: () => void }) {
  const qc = useQueryClient();
  const map = useMutation({
    mutationFn: (id: string) => api.evidence.map(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evidence'] }),
  });
  const mappings: EvidenceMapping[] = map.data?.mappings ?? [];
  const evidenceId = evidence?.id ?? null;
  const { mutate: runMap, reset: resetMap } = map;
  useEffect(() => {
    resetMap();
    if (evidenceId) runMap(evidenceId);
  }, [evidenceId, runMap, resetMap]);
  const run = () => evidenceId && runMap(evidenceId);

  return (
    <Drawer
      open={!!evidence}
      onClose={onClose}
      title={evidence ? `Map · ${evidence.title}` : ''}
      subtitle={evidence ? `${evidence.source} · ${evidence.source_ref}` : undefined}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn-primary" onClick={run} disabled={map.isPending}>
            <GitBranch className="h-3.5 w-3.5" />
            {map.isPending ? 'Mapping…' : 'Re-map'}
          </button>
        </>
      }
    >
      {evidence && (
        <div className="space-y-4">
          <div>
            <KV k="Result" v={<ResultBadge result={evidence.result} />} />
            <KV k="Collected" v={fmtDate(evidence.collected_at)} />
            <KV k="Current control" v={evidence.control_id ?? <span className="badge-neutral">unmapped</span>} />
            <KV k="SHA-256" v={<span className="mono break-all text-2xs">{evidence.sha256}</span>} />
          </div>
          {map.isPending && <Spinner label="Mapping evidence to controls…" />}
          {map.isError && <Alert>{errorMessage(map.error)}</Alert>}
          {map.isSuccess && (
            <section>
              <h3 className="section-title mb-1">AI control mappings ({mappings.length})</h3>
              {mappings.length === 0 && <p className="text-xs text-slate-500">No confident mappings proposed.</p>}
              <ul className="space-y-2">
                {mappings.map((m, i) => (
                  <li key={`${m.framework}-${m.control_ref}-${i}`} className="rounded-sm border border-slate-200 p-2 text-xs dark:border-navy-800">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">
                        <span className="badge-accent mr-1.5">{m.framework}</span>
                        <span className="mono">{m.control_ref}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ResultBadge result={m.result} />
                        <Confidence value={m.confidence} />
                      </div>
                    </div>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">{m.rationale}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
}

export default function EvidencePage() {
  const { t } = useI18n();
  const [result, setResult] = useState('');
  const [source, setSource] = useState('');
  const evidence = useQuery({
    queryKey: ['evidence', result, source],
    queryFn: () => api.evidence.list({ result: result || undefined, source: source || undefined }),
  });
  const allEvidence = useQuery({ queryKey: ['evidence', '', ''], queryFn: () => api.evidence.list() });
  const sources = useMemo(() => Array.from(new Set((allEvidence.data ?? []).map((e) => e.source))).toSorted(), [allEvidence.data]);
  const [selected, setSelected] = useState<Evidence | null>(null);

  const columns: Column<Evidence>[] = [
    { key: 'result', header: 'Result', render: (e) => <ResultBadge result={e.result} />, width: '70px' },
    {
      key: 'title',
      header: 'Evidence',
      render: (e) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-100">{e.title}</div>
          <div className="mono text-2xs text-slate-500">{e.source_ref}</div>
        </div>
      ),
    },
    { key: 'source', header: 'Source', render: (e) => <span className="badge-neutral">{e.source}</span> },
    { key: 'collected', header: 'Collected', render: (e) => <span className="whitespace-nowrap text-slate-500">{fmtDate(e.collected_at)}</span> },
    { key: 'control', header: 'Control', render: (e) => (e.control_id ? <span className="mono">{e.control_id}</span> : <span className="badge-neutral">unmapped</span>) },
    { key: 'conf', header: 'AI confidence', render: (e) => <Confidence value={e.ai_mapping_confidence} /> },
    { key: 'sha', header: 'SHA-256', render: (e) => <span className="mono text-2xs text-slate-500">{e.sha256?.slice(0, 12)}…</span> },
    {
      key: 'actions',
      header: '',
      render: (e) => (
        <button
          type="button"
          className="btn-secondary py-0.5"
          onClick={(ev) => {
            ev.stopPropagation();
            setSelected(e);
          }}
        >
          <GitBranch className="h-3 w-3" />
          Map
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title={t('nav.evidence')}
        subtitle="Immutable evidence items collected from connectors, hashed and mapped to framework controls."
        actions={
          <>
            <select aria-label="Filter by result" className="input w-auto" value={result} onChange={(e) => setResult(e.target.value)}>
              <option value="">{t('common.all')} results</option>
              <option value="pass">pass</option>
              <option value="fail">fail</option>
              <option value="info">info</option>
            </select>
            <select aria-label="Filter by source" className="input w-auto" value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">{t('common.all')} sources</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </>
        }
      />
      <DataTable columns={columns} rows={evidence.data ?? []} rowKey={(e) => e.id} loading={evidence.isLoading} error={evidence.isError ? errorMessage(evidence.error) : null} />
      <MapDrawer evidence={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
