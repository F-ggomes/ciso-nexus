import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileBarChart } from 'lucide-react';
import { useState } from 'react';
import { api, downloadBlob } from '../api/client';
import type { ReportHistoryEntry } from '../api/types';
import DataTable, { type Column } from '../components/DataTable';
import { Alert, PageHeader, Spinner, errorMessage, fmtDate } from '../components/common';
import { useI18n } from '../i18n';

const KIND_LABEL: Record<string, string> = {
  'ciso-brief': 'CISO brief',
  'board-report': 'Board report',
  'register-of-information': 'Register of Information (DORA)',
  soa: 'Statement of Applicability',
  'gap-analysis': 'Gap analysis',
  'risk-register': 'Risk register',
  'incident-log': 'Incident log',
  'vendor-register': 'Third-party register',
  'policy-pack': 'Policy pack',
  'audit-trail': 'AI audit trail',
};

export default function ReportsPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const kinds = useQuery({ queryKey: ['reports', 'kinds'], queryFn: api.reports.kinds });
  const history = useQuery({ queryKey: ['reports', 'history'], queryFn: api.reports.history });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const download = useMutation({
    mutationFn: async (args: { kind: string; fmt: string }) => {
      setBusy(`${args.kind}.${args.fmt}`);
      const blob = await api.reports.download(args.kind, args.fmt);
      downloadBlob(blob, `${args.kind}-${new Date().toISOString().slice(0, 10)}.${args.fmt}`);
    },
    onSuccess: () => {
      setError(null);
      qc.invalidateQueries({ queryKey: ['reports', 'history'] });
    },
    onError: (e) => setError(errorMessage(e)),
    onSettled: () => setBusy(null),
  });

  const columns: Column<ReportHistoryEntry>[] = [
    { key: 'at', header: 'Generated', render: (r) => <span className="whitespace-nowrap text-slate-500">{fmtDate(r.generated_at)}</span> },
    { key: 'kind', header: 'Kind', render: (r) => <span className="badge-accent normal-case">{KIND_LABEL[r.kind] ?? r.kind}</span> },
    { key: 'title', header: 'Title', render: (r) => <span className="font-medium">{r.title}</span> },
    { key: 'fmt', header: 'Format', render: (r) => <span className="badge-neutral">{r.fmt}</span> },
    { key: 'by', header: 'By', render: (r) => r.generated_by },
    { key: 'sha', header: 'SHA-256', render: (r) => <span className="mono text-2xs text-slate-500">{r.sha256?.slice(0, 16)}…</span> },
    {
      key: 'dl',
      header: '',
      render: (r) => (
        <button className="btn-secondary py-0.5" onClick={() => download.mutate({ kind: r.kind, fmt: r.fmt })} disabled={download.isPending}>
          <Download className="h-3 w-3" />
          Again
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title={t('nav.reports')} subtitle="Generate regulator- and board-ready documents. Every export is hashed and recorded." />
      {error && <Alert>{error}</Alert>}
      {kinds.isLoading && <Spinner />}
      {kinds.isError && <Alert>{errorMessage(kinds.error)}</Alert>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(kinds.data?.kinds ?? []).map((kind) => {
          const fmts = kinds.data?.formats[kind] ?? ['pdf'];
          return (
            <div key={kind} className="card flex flex-col gap-2 p-3">
              <div className="flex items-center gap-2">
                <FileBarChart className="h-4 w-4 text-accent-600" />
                <span className="text-sm font-semibold text-navy-900 dark:text-slate-100">{KIND_LABEL[kind] ?? kind}</span>
              </div>
              <div className="mono text-2xs text-slate-500">{kind}</div>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                {fmts.map((fmt) => (
                  <button key={fmt} className="btn-secondary" onClick={() => download.mutate({ kind, fmt })} disabled={download.isPending}>
                    <Download className="h-3 w-3" />
                    {busy === `${kind}.${fmt}` ? '…' : fmt.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <section>
        <h2 className="section-title mb-2">History</h2>
        <DataTable columns={columns} rows={history.data ?? []} rowKey={(r) => r.id} loading={history.isLoading} error={history.isError ? errorMessage(history.error) : null} maxHeight="50vh" />
      </section>
    </div>
  );
}
