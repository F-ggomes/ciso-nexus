import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  Bug,
  Building2,
  Clock,
  FileCheck2,
  FileSignature,
  FileText,
  KanbanSquare,
  Plug,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, getOrg, setOrg } from '../api/client';
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
  return [...rows].sort((a, b) => new Date(a.deadline.due).getTime() - new Date(b.deadline.due).getTime());
}

function coverageColor(pct: number) {
  if (pct >= 80) return '#0d9488';
  if (pct >= 50) return '#f59e0b';
  return '#e11d48';
}

function formatCountdown(targetDue: string): string {
  const diff = Math.max(0, Math.floor((new Date(targetDue).getTime() - Date.now()) / 1000));
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function OverviewPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const currentOrgId = getOrg();
  const isConsolidated = currentOrgId === 'all';

  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Single org queries
  const summary = useQuery({ queryKey: ['dashboard', 'summary', currentOrgId], queryFn: api.dashboard.summary, enabled: !isConsolidated });
  const incidents = useQuery({ queryKey: ['incidents', currentOrgId], queryFn: api.incidents.list, enabled: !isConsolidated });
  const [briefOpen, setBriefOpen] = useState(false);
  const brief = useQuery({ queryKey: ['reports', 'ciso-brief', currentOrgId], queryFn: api.reports.cisoBrief, enabled: briefOpen });

  // Multi-org consolidated query
  const cisoSummary = useQuery({
    queryKey: ['dashboard', 'cisoServiceSummary'],
    queryFn: api.dashboard.cisoServiceSummary,
    enabled: isConsolidated,
    refetchInterval: 15_000,
  });

  const selectClient = (orgId: string) => {
    setOrg(orgId);
    qc.invalidateQueries();
  };

  // --- Render Consolidated Cockpit ---
  if (isConsolidated) {
    const cs = cisoSummary.data;
    return (
      <div className="space-y-4">
        <PageHeader
          title="Torre Consolidada CISO-as-a-Service"
          subtitle="Cockpit executivo e operacional em tempo real para o Operador e todas as entidades clientes assistidas."
          actions={
            <div className="flex gap-2">
              <button className="btn-secondary" onClick={() => cisoSummary.refetch()}>
                <RefreshCw className="h-3.5 w-3.5" />
                {t('common.refresh')}
              </button>
              {cs?.organizations?.[0] && (
                <button className="btn-primary" onClick={() => selectClient(cs.organizations[0].organization.id)}>
                  Ver [A Nossa Empresa]
                </button>
              )}
            </div>
          }
        />

        {cisoSummary.isError && <Alert>{errorMessage(cisoSummary.error)}</Alert>}
        {cisoSummary.isLoading && <div className="py-12 flex justify-center"><Spinner label="A calcular métricas consolidadas CISOaaS..." /></div>}

        {cs && (
          <>
            {/* Clocks Row */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="card border-l-4 border-l-rose-500 p-4 bg-slate-900/60 dark:bg-navy-900/80">
                <div className="flex items-center justify-between text-2xs font-semibold uppercase tracking-wider text-rose-400">
                  <span>DORA Art. 19(4)(a) · Notificação Inicial</span>
                  <Clock className="h-4 w-4" />
                </div>
                <div className="mt-1 text-sm font-bold text-white">[Banco Alfa] Incidente Grave TIC (DDoS Gateway)</div>
                <div className="mt-2 font-mono text-2xl font-extrabold text-rose-300">
                  {cs.active_clocks?.[0] ? formatCountdown(cs.active_clocks[0].due) : '01:42:18'}{' '}
                  <span className="text-xs font-normal text-slate-400">restantes (prazo 4h)</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-2xs text-slate-400">
                  <span>Detetado: 08:30 UTC</span>
                  <span className="font-semibold text-rose-400">Destinatário: Banco de Portugal / BCE</span>
                </div>
              </div>

              <div className="card border-l-4 border-l-amber-500 p-4 bg-slate-900/60 dark:bg-navy-900/80">
                <div className="flex items-center justify-between text-2xs font-semibold uppercase tracking-wider text-amber-400">
                  <span>NIS2 / DL 125/2025 · Alerta Precoce</span>
                  <Clock className="h-4 w-4" />
                </div>
                <div className="mt-1 text-sm font-bold text-white">[HealthBeta] Anomalia em Base de Dados Clínica</div>
                <div className="mt-2 font-mono text-2xl font-extrabold text-amber-300">
                  {cs.active_clocks?.[1] ? formatCountdown(cs.active_clocks[1].due) : '14:10:45'}{' '}
                  <span className="text-xs font-normal text-slate-400">restantes (prazo 24h)</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-2xs text-slate-400">
                  <span>Detetado: 20:00 UTC</span>
                  <span className="font-semibold text-amber-400">Destinatário: CNCS</span>
                </div>
              </div>

              <div className="card border-l-4 border-l-sky-500 p-4 bg-slate-900/60 dark:bg-navy-900/80">
                <div className="flex items-center justify-between text-2xs font-semibold uppercase tracking-wider text-sky-400">
                  <span>RGPD Art. 33 / Lei 22/11 · Fuga de Dados</span>
                  <Clock className="h-4 w-4" />
                </div>
                <div className="mt-1 text-sm font-bold text-white">[LuandaFin] Acesso Não Autorizado</div>
                <div className="mt-2 font-mono text-2xl font-extrabold text-sky-300">
                  48:22:00 <span className="text-xs font-normal text-slate-400">restantes (prazo 72h)</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-2xs text-slate-400">
                  <span>Detetado: Ontem</span>
                  <span className="font-semibold text-sky-400">Destinatário: APD Angola</span>
                </div>
              </div>
            </div>

            {/* Quick KPI stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="card p-3">
                <div className="text-2xs text-slate-400 uppercase font-semibold">Organizações Monitorizadas</div>
                <div className="text-2xl font-extrabold text-white mt-1">{cs.total_organizations}</div>
                <div className="text-2xs text-teal-400 mt-1">1 Operador · {cs.total_organizations - 1} Clientes Ativos</div>
              </div>
              <div className="card p-3">
                <div className="text-2xs text-slate-400 uppercase font-semibold">Riscos Críticos Totais</div>
                <div className="text-2xl font-extrabold text-rose-400 mt-1">{cs.totals.critical_risks}</div>
                <div className="text-2xs text-slate-400 mt-1">Sob mitigação ativa</div>
              </div>
              <div className="card p-3">
                <div className="text-2xs text-slate-400 uppercase font-semibold">Vulnerabilidades Críticas</div>
                <div className="text-2xl font-extrabold text-amber-400 mt-1">{cs.totals.critical_vulnerabilities}</div>
                <div className="text-2xs text-slate-400 mt-1">Wazuh / Defender KEV</div>
              </div>
              <div className="card p-3">
                <div className="text-2xs text-slate-400 uppercase font-semibold">Contratos a Expirar &lt; 60d</div>
                <div className="text-2xl font-extrabold text-rose-400 mt-1">{cs.totals.expiring_contracts}</div>
                <div className="text-2xs text-rose-400 mt-1">Avisos DORA ativos</div>
              </div>
            </div>

            {/* Consolidated Multi-Client Matrix Table */}
            <div className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="section-title">Matriz Consolidada de Governação, Testes & SOC/SIEM</h2>
                  <p className="text-xs text-slate-400">Acompanhamento contínuo de cada cliente com transição direta em 1 clique</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-700 bg-slate-800/40 text-slate-400 uppercase text-2xs font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Organização / Inquilino</th>
                      <th className="py-2.5 px-3">País & Setor</th>
                      <th className="py-2.5 px-3">Risco SOC/SIEM</th>
                      <th className="py-2.5 px-3">Vulnerabilidades</th>
                      <th className="py-2.5 px-3">Políticas SGSI</th>
                      <th className="py-2.5 px-3">Fornecedores DORA</th>
                      <th className="py-2.5 px-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {cs.organizations.map((orgRow: any) => (
                      <tr key={orgRow.organization.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-white text-sm">{orgRow.organization.name}</div>
                          <div className="text-2xs text-slate-400 capitalize">{orgRow.organization.kind}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 font-medium">
                            <span className="badge-neutral">{orgRow.organization.country}</span>
                            <span className="capitalize text-slate-300">{orgRow.organization.sector}</span>
                          </div>
                          {orgRow.organization.regulated_entity && (
                            <div className="text-2xs text-teal-400 mt-0.5">Entidade Regulada</div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {orgRow.risks.critical > 0 ? (
                            <span className="badge-fail">{orgRow.risks.critical} Críticos</span>
                          ) : (
                            <span className="badge-pass">Controlado</span>
                          )}
                          <div className="text-2xs text-slate-400 mt-0.5">Resid. Médio: {orgRow.risks.avg_residual}</div>
                        </td>
                        <td className="py-3 px-3">
                          {orgRow.vulnerabilities.critical > 0 ? (
                            <span className="badge-fail">{orgRow.vulnerabilities.critical} Críticas</span>
                          ) : (
                            <span className="badge-pass">0 Críticas</span>
                          )}
                          <div className="text-2xs text-slate-400 mt-0.5">{orgRow.vulnerabilities.open} abertas</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-teal-500 h-full rounded-full"
                                style={{ width: `${orgRow.policies.percentage}%` }}
                              />
                            </div>
                            <span className="font-medium text-slate-200">{orgRow.policies.percentage}%</span>
                          </div>
                          <div className="text-2xs text-slate-400 mt-0.5">
                            {orgRow.policies.approved}/{orgRow.policies.total} Aprovadas
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-slate-200 font-medium">{orgRow.vendors.critical} Críticos</div>
                          {orgRow.vendors.expiring_soon > 0 && (
                            <div className="text-2xs text-rose-400 font-semibold">
                              ⚠️ {orgRow.vendors.expiring_soon} a expirar &lt; 60d
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            className="btn-secondary py-1 px-2.5 text-2xs inline-flex items-center gap-1"
                            onClick={() => selectClient(orgRow.organization.id)}
                          >
                            <span>Abrir Cockpit</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // --- Render Single Organization Detailed View ---
  const s = summary.data;
  const overdue = overdueDeadlines(incidents.data);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('nav.overview')}
        subtitle={
          s?.organization
            ? `${s.organization.name} · ${s.organization.kind} · ${s.organization.country}`
            : 'Postura contínua de governação, riscos, incidentes, fornecedores e controlos.'
        }
        actions={
          <>
            <button className="btn-secondary" onClick={() => selectClient('all')}>
              🌐 Visão Consolidada CISOaaS
            </button>
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
            <span className="text-2xs text-slate-500">% de controlos com evidência mapeada</span>
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
                    formatter={(value) => [`${value}%`, 'Cobertura']}
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
            <div className="flex h-64 items-center justify-center text-xs text-slate-500">
              {summary.isLoading ? <Spinner /> : 'Sem dados de frameworks para este inquilino.'}
            </div>
          )}
        </section>

        <section className="card p-3 xl:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="section-title">{t('overview.deadlines')}</h2>
            <span className="badge-fail">{overdue.length}</span>
          </div>
          {incidents.isLoading && <Spinner />}
          {incidents.isError && <Alert>{errorMessage(incidents.error)}</Alert>}
          {!incidents.isLoading && overdue.length === 0 && (
            <p className="py-6 text-center text-xs text-slate-500">{t('overview.noDeadlines')}</p>
          )}
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
              Regenerar
            </button>
            <button className="btn-primary" onClick={() => setBriefOpen(false)}>
              {t('common.close')}
            </button>
          </>
        }
      >
        {brief.isLoading && <Spinner label="A gerar resumo executivo do CISO…" />}
        {brief.isError && <Alert>{errorMessage(brief.error)}</Alert>}
        {brief.data && (
          <>
            <p className="mb-2 text-2xs text-slate-500">Gerado a {fmtDate(brief.data.generated_at)}</p>
            <Markdown source={brief.data.markdown} />
          </>
        )}
      </Modal>
    </div>
  );
}
