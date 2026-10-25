import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api/client';
import type { AiAuditEntry } from '../api/types';
import DataTable, { type Column } from '../components/DataTable';
import { PageHeader, errorMessage, fmtDate } from '../components/common';
import { useI18n } from '../i18n';

export default function AiAuditPage() {
  const { t } = useI18n();
  const [limit, setLimit] = useState(200);
  const audit = useQuery({ queryKey: ['ai', 'audit', limit], queryFn: () => api.ai.audit(limit) });

  const rows = audit.data ?? [];
  const totalIn = rows.reduce((s, r) => s + (r.input_tokens || 0), 0);
  const totalOut = rows.reduce((s, r) => s + (r.output_tokens || 0), 0);

  const columns: Column<AiAuditEntry>[] = [
    { key: 'at', header: 'When', render: (r) => <span className="whitespace-nowrap text-slate-500">{fmtDate(r.at)}</span> },
    { key: 'actor', header: 'Actor', render: (r) => r.actor },
    { key: 'agent', header: 'Agent', render: (r) => <span className="badge-accent normal-case">{r.agent}</span> },
    {
      key: 'model',
      header: 'Provider / model',
      render: (r) => (
        <span>
          <span className="badge-neutral mr-1">{r.provider}</span>
          <span className="mono text-2xs">{r.model}</span>
        </span>
      ),
    },
    { key: 'purpose', header: 'Purpose', render: (r) => <span className="text-slate-700 dark:text-slate-300">{r.purpose}</span> },
    { key: 'in', header: 'In', render: (r) => <span className="tabular-nums">{r.input_tokens}</span>, className: 'text-right' },
    { key: 'out', header: 'Out', render: (r) => <span className="tabular-nums">{r.output_tokens}</span>, className: 'text-right' },
    { key: 'lat', header: 'Latency', render: (r) => <span className="tabular-nums">{r.latency_ms} ms</span>, className: 'text-right' },
    { key: 'pii', header: 'PII redacted', render: (r) => (r.pii_redacted ? <span className="badge-pass">yes</span> : <span className="badge-neutral">no</span>) },
    {
      key: 'decision',
      header: 'Human decision',
      render: (r) => {
        if (!r.human_decision) return <span className="badge-neutral">pending</span>;
        const d = r.human_decision.toLowerCase();
        const cls = d.includes('approv') || d.includes('accept') ? 'badge-pass' : d.includes('reject') ? 'badge-fail' : 'badge-info';
        return <span className={cls}>{r.human_decision}</span>;
      },
    },
    { key: 'id', header: 'ID', render: (r) => <span className="mono text-2xs text-slate-400">{r.id}</span> },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title={t('nav.audit')}
        subtitle={`Every model call with provider, tokens, latency, PII redaction and the human decision (EU AI Act Art. 12/14 logging). ${rows.length} entries · ${totalIn.toLocaleString()} in / ${totalOut.toLocaleString()} out tokens.`}
        actions={
          <>
            <select className="input w-auto" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
              {[50, 200, 500, 1000].map((n) => (
                <option key={n} value={n}>
                  last {n}
                </option>
              ))}
            </select>
            <button className="btn-secondary" onClick={() => audit.refetch()}>
              <RefreshCw className="h-3.5 w-3.5" />
              {t('common.refresh')}
            </button>
          </>
        }
      />
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} loading={audit.isLoading} error={audit.isError ? errorMessage(audit.error) : null} />
    </div>
  );
}
