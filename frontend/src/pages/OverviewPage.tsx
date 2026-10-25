import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Bug, Building2, FileCheck2, FileSignature, FileText, KanbanSquare, Plug, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api/client';
import type { Incident, NotificationDeadline } from '../api/types';
import KpiTile from '../components/KpiTile';
import Markdown from '../components/Markdown';
import Modal from '../components/Modal';
import SeverityBadge from '../components/SeverityBadge';
import { Alert, PageHeader, Spinner, errorMessage, fmtDate, fmtNum } from '../components/common';
import { useI18n } from '../i18n';

interface OverdueRow {
  incident: Incident;
  deadline: NotificationDeadline;
}

function normaliseDeadlines(inc: Incident): NotificationDeadline[] {
  const d = inc.notification_deadlines;
  if (!d) return [];
  if (Array.isArray(d)) return d;
  return Object.entries(d).map(([regime, due]) => ({ regime, due: String(due), basis: '' }));
}

function overdueDeadlines(incidents: Incident[] | undefined): OverdueRow[] {
  if (!incidents) return [];
  const now = Date.now();
  const rows: OverdueRow[] = [];
  for (const inc of incidents) {
    if ((inc.status ?? '').toLowerCase() === 'closed') continue;
    for (const dl of normaliseDeadlines(inc)) {
      const t = new Date(dl.due).getTime();
      if (!Number.isNaN(t) && t < now) rows.push({ incident: inc, deadline: dl });
    }
  }
  return rows.sort((a, b) => new Date(a.deadline.due).getTime() - new Date(b.deadline.due).getTime());
}

function coverageColor(pct: number) {
  if (pct >= 80) return '#0d9488';
  if (pct >= 50) return '#f59e0b';
  return '#e11d48';
}

export default function OverviewPage() {
  const { t } = useI18n();
  const summary = useQuery({ queryKey: ['dashboard', 'summary'], queryFn: api.dashboard.summary });
  const incidents = useQuery({ queryKey: ['incidents'], queryFn: api.incidents.list });
  const [briefOpen, setBriefOpen] = useState(false);
  const brief = useQuery({ queryKey: ['reports', 'ciso-brief'], queryFn: api.reports.cisoBrief, enabled: briefOpen });

  const s = summary.data;
  const overdue = overdueDeadlines(incidents.data);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('nav.overview')}
        subtitle={s?.organization ? `${s.organization.name} · ${s.organization.kind} · ${s.organization.country}` : 'Live posture across risks, incidents, third parties, evidence and integrations.'}
        actions={
          <>
            <button className="btn-secondary" onClick={() => summary.refetch()}>
              {t('common.refresh')}
            </button>
            <button className="btn-primary" onClick={() => setBriefOpen(true)}>
              <FileText className="h-3.5 w-3.5" />
              {t('overview.brief')}
            </button>
          </>
        }
      />

      {summary.isError && <Alert>{errorMessage(summary.error)}</Alert>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiTile
          title={t('tile.risks')}
          icon={ShieldAlert}
          value={s ? s.risks.total : '…'}
          subs={[
            { label: t('tile.risks.open'), value: s?.risks.open ?? '—' },
            { label: t('tile.risks.high'), value: s?.risks.high ?? '—', tone: s && s.risks.high > 0 ? 'bad' : 'neutral' },
            { label: t('tile.risks.avg'), value: fmtNum(s?.risks.critical_avg_score, 1) },
          ]}
        />
        <KpiTile
          title={t('tile.incidents')}
          icon={AlertTriangle}
          value={s ? s.incidents.open : '…'}
          subs={[
            { label: t('tile.incidents.dora'), value: s?.incidents.dora_major ?? '—', tone: s && s.incidents.dora_major > 0 ? 'bad' : 'neutral' },
            { label: t('tile.incidents.overdue'), value: s?.incidents.overdue_notifications ?? '—', tone: s && s.incidents.overdue_notifications > 0 ? 'bad' : 'good' },
          ]}
        />
        <KpiTile
          title={t('tile.vendors')}
          icon={Building2}
          value={s ? s.vendors.total : '…'}
          subs={[
            { label: t('tile.vendors.tier1'), value: s?.vendors.tier1 ?? '—' },
            { label: t('tile.vendors.cif'), value: s?.vendors.critical_function ?? '—' },
            { label: t('tile.vendors.noexit'), value: s?.vendors.no_exit_strategy ?? '—', tone: s && s.vendors.no_exit_strategy > 0 ? 'warn' : 'good' },
          ]}
        />
        <KpiTile
          title={t('tile.evidence')}
          icon={FileCheck2}
          value={s ? s.evidence.total : '…'}
          subs={[
            { label: t('tile.evidence.pass'), value: s?.evidence.pass ?? '—', tone: 'good' },
            { label: t('tile.evidence.fail'), value: s?.evidence.fail ?? '—', tone: s && s.evidence.fail > 0 ? 'bad' : 'neutral' },
            { label: t('tile.evidence.unmapped'), value: s?.evidence.unmapped ?? '—', tone: s && s.evidence.unmapped > 0 ? 'warn' : 'neutral' },
          ]}
        />
        <KpiTile
          title={t('tile.connectors')}
          icon={Plug}
          value={s ? `${s.connectors.healthy}/${s.connectors.total}` : '…'}
          subs={[
            { label: t('tile.connectors.configured'), value: s?.connectors.configured ?? '—' },
            { label: t('tile.connectors.healthy'), value: s?.connectors.healthy ?? '—', tone: s && s.connectors.healthy < s.connectors.configured ? 'warn' : 'good' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          title={t('tile.controls')}
          icon={ShieldCheck}
          value={s?.controls ? s.controls.total : '…'}
          subs={[
            { label: t('tile.controls.implemented'), value: s?.controls?.implemented ?? '—', tone: 'good' },
            { label: t('tile.controls.partial'), value: s?.controls?.partial ?? '—', tone: 'warn' },
            { label: t('tile.controls.maturity'), value: fmtNum(s?.controls?.avg_maturity, 1) },
          ]}
        />
        <KpiTile
          title={t('tile.vulns')}
          icon={Bug}
          value={s?.vulnerabilities ? s.vulnerabilities.open : '…'}
          subs={[
            { label: t('tile.vulns.critical'), value: s?.vulnerabilities?.critical ?? '—', tone: s?.vulnerabilities && s.vulnerabilities.critical > 0 ? 'bad' : 'neutral' },
            { label: t('tile.vulns.sla'), value: s?.vulnerabilities?.sla_breached ?? '—', tone: s?.vulnerabilities && s.vulnerabilities.sla_breached > 0 ? 'bad' : 'good' },
          ]}
        />
        <KpiTile
          title={t('tile.tasks')}
          icon={KanbanSquare}
          value={s?.tasks ? s.tasks.open : '…'}
          subs={[
            { label: t('tile.tasks.overdue'), value: s?.tasks?.overdue ?? '—', tone: s?.tasks && s.tasks.overdue > 0 ? 'bad' : 'good' },
            ...Object.entries(s?.tasks?.by_status ?? {})
              .filter(([k]) => k !== 'done')
              .slice(0, 3)
              .map(([k, v]) => ({ label: k, value: v })),
          ]}
        />
        <KpiTile
          title={t('tile.policies')}
          icon={FileSignature}
          value={s?.policies ? s.policies.total : '…'}
          subs={[
            { label: t('tile.policies.approved'), value: s?.policies?.approved ?? '—', tone: 'good' },
            { label: t('tile.policies.reviewDue'), value: s?.policies?.review_due ?? '—', tone: s?.policies && s.policies.review_due > 0 ? 'warn' : 'neutral' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
        <section className="card p-3 xl:col-span-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="section-title">{t('overview.coverage')}</h2>
            <span className="text-2xs text-slate-500">% of controls with mapped evidence</span>
          </div>
          {s && s.frameworks.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.frameworks} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-navy-800" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(20,184,166,0.08)' }}
                    contentStyle={{ fontSize: 12, borderRadius: 4 }}
                    formatter={(value) => [`${value}%`, 'Coverage']}
                    labelFormatter={(label, payload) => {
                      const p = payload && payload[0] ? (payload[0].payload as { jurisdiction?: string }) : undefined;
                      return p?.jurisdiction ? `${label} · ${p.jurisdiction}` : String(label);
                    }}
                  />
                  <Bar dataKey="coverage_pct" radius={[3, 3, 0, 0]} maxBarSize={48}>
                    {s.frameworks.map((f) => (
                      <Cell key={f.id} fill={coverageColor(f.coverage_pct)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-xs text-slate-500">{summary.isLoading ? <Spinner /> : 'No framework data.'}</div>
          )}
        </section>

        <section className="card p-3 xl:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="section-title">{t('overview.deadlines')}</h2>
            <span className="badge-fail">{overdue.length}</span>
          </div>
          {incidents.isLoading && <Spinner />}
          {incidents.isError && <Alert>{errorMessage(incidents.error)}</Alert>}
          {!incidents.isLoading && overdue.length === 0 && <p className="py-6 text-center text-xs text-slate-500">{t('overview.noDeadlines')}</p>}
          <ul className="divide-y divide-slate-100 dark:divide-navy-800">
            {overdue.slice(0, 12).map(({ incident, deadline }, i) => (
              <li key={`${incident.id}-${deadline.regime}-${i}`} className="flex items-start justify-between gap-2 py-1.5 text-xs">
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-800 dark:text-slate-200">{incident.title}</div>
                  <div className="text-2xs text-slate-500">
                    <span className="badge-neutral mr-1">{deadline.regime}</span>
                    {deadline.basis}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-medium text-rose-600 dark:text-rose-400">{fmtDate(deadline.due)}</div>
                  <SeverityBadge severity={incident.severity} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Modal
        open={briefOpen}
        onClose={() => setBriefOpen(false)}
        title={t('overview.brief')}
        width="max-w-3xl"
        footer={
          <>
            <button className="btn-secondary" onClick={() => brief.refetch()} disabled={brief.isFetching}>
              Regenerate
            </button>
            <button className="btn-primary" onClick={() => setBriefOpen(false)}>
              {t('common.close')}
            </button>
          </>
        }
      >
        {brief.isLoading && <Spinner label="Generating brief…" />}
        {brief.isError && <Alert>{errorMessage(brief.error)}</Alert>}
        {brief.data && (
          <>
            <p className="mb-2 text-2xs text-slate-500">Generated {fmtDate(brief.data.generated_at)}</p>
            <Markdown source={brief.data.markdown} />
          </>
        )}
      </Modal>
    </div>
  );
}
