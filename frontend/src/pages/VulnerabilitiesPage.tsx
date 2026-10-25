import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '../api/client';
import type { Vulnerability } from '../api/types';
import DataTable, { type Column } from '../components/DataTable';
import SeverityBadge from '../components/SeverityBadge';
import { Alert, PageHeader, errorMessage, fmtDate, fmtNum } from '../components/common';
import { useI18n } from '../i18n';

const STATUSES = ['open', 'mitigated', 'accepted', 'false_positive'];

export default function VulnerabilitiesPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [status, setStatus] = useState('open');
  const [severity, setSeverity] = useState('');
  const vulns = useQuery({ queryKey: ['vulnerabilities', status, severity], queryFn: () => api.vulnerabilities.list({ status: status || undefined, severity: severity || undefined }) });
  const setStatusM = useMutation({
    mutationFn: (args: { id: string; status: string }) => api.vulnerabilities.setStatus(args.id, args.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vulnerabilities'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const now = Date.now();
  const isOverdue = (v: Vulnerability) => v.status === 'open' && !!v.due_at && new Date(v.due_at).getTime() < now;
  const rows = vulns.data ?? [];
  const overdue = rows.filter(isOverdue).length;

  const columns: Column<Vulnerability>[] = [
    { key: 'sev', header: 'Severity', render: (v) => <SeverityBadge severity={v.severity} />, width: '80px' },
    {
      key: 'title',
      header: 'Vulnerability',
      render: (v) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-100">{v.title}</div>
          <div className="mono text-2xs text-slate-500">{v.cve ?? '—'}</div>
        </div>
      ),
    },
    { key: 'cvss', header: 'CVSS', render: (v) => <span className="tabular-nums">{fmtNum(v.cvss, 1)}</span>, className: 'text-right' },
    { key: 'asset', header: 'Asset', render: (v) => v.asset_name ?? '—' },
    { key: 'source', header: 'Source', render: (v) => <span className="badge-neutral">{v.source}</span> },
    { key: 'detected', header: 'Detected', render: (v) => <span className="whitespace-nowrap text-slate-500">{fmtDate(v.detected_at, false)}</span> },
    {
      key: 'due',
      header: 'SLA due',
      render: (v) => (
        <span className={`whitespace-nowrap ${isOverdue(v) ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
          {fmtDate(v.due_at, false)}
          {isOverdue(v) && <span className="badge-fail ml-1">SLA breached</span>}
        </span>
      ),
    },
    { key: 'risk', header: 'Risk', render: (v) => (v.risk_id ? <span className="mono text-2xs">{v.risk_id}</span> : '—') },
    {
      key: 'status',
      header: 'Status',
      render: (v) => (
        <select className="input w-auto py-0.5" value={v.status} onChange={(e) => setStatusM.mutate({ id: v.id, status: e.target.value })} disabled={setStatusM.isPending}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title={t('nav.vulnerabilities')}
        subtitle={`Findings from scanners and connectors with remediation SLAs. ${rows.length} shown${overdue ? ` · ${overdue} past SLA` : ''}.`}
        actions={
          <>
            <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{t('common.all')} statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <select className="input w-auto" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="">{t('common.all')} severities</option>
              {['low', 'medium', 'high', 'critical'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </>
        }
      />
      {setStatusM.isError && <Alert>{errorMessage(setStatusM.error)}</Alert>}
      <DataTable columns={columns} rows={rows} rowKey={(v) => v.id} loading={vulns.isLoading} error={vulns.isError ? errorMessage(vulns.error) : null} />
    </div>
  );
}
