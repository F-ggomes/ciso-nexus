import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileCheck,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { api } from '../api/client';
import DataTable, { Column } from '../components/DataTable';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import { PageHeader } from '../components/common';

export default function ComplianceCoveragePage() {
  const qc = useQueryClient();
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedRegulation, setSelectedRegulation] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'gap' | 'compliant' | 'partial'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedObligation, setSelectedObligation] = useState<any | null>(null);
  const [remediationTarget, setRemediationTarget] = useState<any | null>(null);
  const [customClause, setCustomClause] = useState<string>('');

  // Fetch all organizations for tenant switcher
  const orgsQuery = useQuery({
    queryKey: ['orgs'],
    queryFn: () => api.orgs.list(),
  });

  const activeOrgId = selectedOrgId || orgsQuery.data?.[0]?.id || '';

  // Fetch coverage data
  const coverageQuery = useQuery({
    queryKey: ['compliance', 'coverage', activeOrgId, selectedRegulation],
    queryFn: () =>
      api.compliance.coverage({
        org_id: activeOrgId,
        regulation: selectedRegulation === 'all' ? undefined : selectedRegulation,
      }),
    enabled: !!activeOrgId,
  });

  // Fetch remediation clause
  const remediationQuery = useQuery({
    queryKey: ['compliance', 'remediation', remediationTarget?.obligation_id, activeOrgId],
    queryFn: () => api.compliance.remediation(remediationTarget.obligation_id, activeOrgId),
    enabled: !!remediationTarget,
  });

  // Apply remediation mutation
  const applyRemediation = useMutation({
    mutationFn: (body: { policy_id: string; clause_text: string; change_note?: string }) =>
      api.compliance.applyRemediation(remediationTarget.obligation_id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compliance', 'coverage'] });
      qc.invalidateQueries({ queryKey: ['policies'] });
      setRemediationTarget(null);
    },
  });

  const cData = coverageQuery.data;

  // Filter items
  const filteredItems = useMemo(() => {
    let items = cData?.items ?? [];
    if (statusFilter !== 'all') {
      items = items.filter((it) => it.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (it) =>
          it.obligation_id.toLowerCase().includes(q) ||
          it.article.toLowerCase().includes(q) ||
          it.law.toLowerCase().includes(q) ||
          it.topic.toLowerCase().includes(q) ||
          it.obligation.toLowerCase().includes(q) ||
          it.policy?.code.toLowerCase().includes(q) ||
          it.policy?.title.toLowerCase().includes(q),
      );
    }
    return items;
  }, [cData?.items, statusFilter, searchQuery]);

  const columns: Column<any>[] = [
    {
      key: 'id',
      header: 'Obrigação & Artigo',
      width: '160px',
      render: (r) => (
        <div>
          <div className="font-bold text-teal-600 dark:text-teal-400">{r.obligation_id}</div>
          <div className="font-semibold text-slate-900 dark:text-white">{r.article}</div>
          <div className="text-2xs text-slate-500 truncate max-w-[150px]" title={r.law}>
            {r.law}
          </div>
        </div>
      ),
    },
    {
      key: 'topic',
      header: 'Tópico & Diploma',
      width: '180px',
      render: (r) => (
        <div>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-2xs font-semibold text-slate-700 dark:bg-navy-800 dark:text-slate-300">
            {r.family}
          </span>
          <div className="mt-1 font-medium text-slate-800 dark:text-slate-200 text-xs">{r.topic}</div>
        </div>
      ),
    },
    {
      key: 'obligation',
      header: 'Requisito Legal',
      render: (r) => (
        <div className="line-clamp-2 text-xs text-slate-700 dark:text-slate-300" title={r.obligation}>
          {r.obligation}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado de Cobertura',
      width: '170px',
      render: (r) => {
        if (r.status === 'compliant') {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-2xs font-semibold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-3 w-3" />
              Conforme (Política Aprovada)
            </span>
          );
        }
        if (r.status === 'partial') {
          return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-2xs font-semibold text-amber-700 dark:text-amber-300">
              <Clock className="h-3 w-3" />
              Parcial (Em Revisão)
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-2xs font-semibold text-rose-700 dark:text-rose-300">
            <AlertTriangle className="h-3 w-3" />
            Lacuna Identificada (Gap)
          </span>
        );
      },
    },
    {
      key: 'policy',
      header: 'Política Vinculada',
      width: '180px',
      render: (r) => {
        if (r.policy) {
          return (
            <div>
              <span className="font-mono text-2xs font-bold text-sky-700 dark:text-sky-300">{r.policy.code}</span>
              <div className="truncate text-2xs text-slate-600 dark:text-slate-400" title={r.policy.title}>
                {r.policy.title}
              </div>
            </div>
          );
        }
        return <span className="text-2xs italic text-slate-400">Nenhuma política associada</span>;
      },
    },
    {
      key: 'penalties',
      header: 'Risco Sancionatório',
      width: '140px',
      render: (r) => {
        if (r.severity === 'critical') {
          return (
            <span className="inline-flex items-center gap-1 text-2xs font-bold text-rose-600 dark:text-rose-400" title={r.penalty_ref}>
              <ShieldAlert className="h-3.5 w-3.5" />
              Crítico (&gt;10M€ / 4%)
            </span>
          );
        }
        if (r.penalty_ref) {
          return (
            <span className="text-2xs text-amber-600 dark:text-amber-400 truncate max-w-[130px] block" title={r.penalty_ref}>
              {r.penalty_ref}
            </span>
          );
        }
        return <span className="text-2xs text-slate-400">—</span>;
      },
    },
    {
      key: 'actions',
      header: '',
      width: '150px',
      className: 'text-right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          {r.status === 'gap' ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setRemediationTarget(r);
              }}
              className="inline-flex items-center gap-1 rounded bg-teal-500/15 px-2 py-1 text-2xs font-bold text-teal-700 hover:bg-teal-500/25 dark:text-teal-300"
            >
              <Sparkles className="h-3 w-3" />
              Remediar com IA
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedObligation(r);
              }}
              className="btn-ghost py-1 text-2xs font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400"
            >
              Ver Detalhes
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Matriz de Conformidade & Gap Analysis Regulamentar"
        subtitle="Cruzamento automatizado entre as 1.484 obrigações legais (DORA, NIS2, RGPD, BNA, AI Act) e o acervo documental de políticas e controlos do cliente."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Organization Selector */}
            <select
              aria-label="Selecionar Organização"
              value={activeOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm dark:border-navy-800 dark:bg-navy-900 dark:text-white"
            >
              {orgsQuery.data?.map((o) => (
                <option key={o.id} value={o.id}>
                  🏢 {o.name} ({o.sector} · {o.country})
                </option>
              ))}
            </select>

            <button
              type="button"
              className="btn-secondary text-xs"
              onClick={() => coverageQuery.refetch()}
              title="Recarregar matriz de cobertura"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Recarregar
            </button>

            <a
              href="/reports"
              className="btn-primary text-xs"
              title="Ir para o gerador de relatórios e dossiês de auditoria"
            >
              <FileCheck className="h-3.5 w-3.5" />
              Exportar Dossiê de Auditoria
            </a>
          </div>
        }
      />

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Coverage Gauge Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-navy-800 dark:bg-navy-900">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400">Score de Cobertura Global</span>
            <span
              className={`rounded-full px-2 py-0.5 text-2xs font-bold ${
                (cData?.coverage_pct ?? 0) >= 70
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : (cData?.coverage_pct ?? 0) >= 40
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}
            >
              {(cData?.coverage_pct ?? 0) >= 70 ? 'Audit-Ready' : 'Revisão Recomendada'}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="text-2xl font-black text-slate-900 dark:text-white">{cData?.coverage_pct ?? 0}%</div>
            <span className="text-xs text-slate-500">conformidade ponderada</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-navy-800">
            <div
              className={`h-full transition-all duration-500 ${
                (cData?.coverage_pct ?? 0) >= 70 ? 'bg-emerald-500' : (cData?.coverage_pct ?? 0) >= 40 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${cData?.coverage_pct ?? 0}%` }}
            />
          </div>
        </div>

        {/* Compliant Obligations */}
        <div
          onClick={() => setStatusFilter('compliant')}
          className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-emerald-500 dark:border-navy-800 dark:bg-navy-900"
        >
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-2xs font-medium uppercase text-slate-400">Obrigações em Conformidade</div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {cData?.compliant_count ?? 0}{' '}
                <span className="text-2xs font-normal text-slate-400">/ {cData?.total_obligations ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Total Gaps */}
        <div
          onClick={() => setStatusFilter('gap')}
          className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-rose-500 dark:border-navy-800 dark:bg-navy-900"
        >
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <div className="text-2xs font-medium uppercase text-slate-400">Lacunas de Conformidade (Gaps)</div>
              <div className="text-xl font-bold text-rose-600 dark:text-rose-400">
                {cData?.gaps_count ?? 0} <span className="text-2xs font-normal text-slate-400">por colmatar</span>
              </div>
            </div>
          </div>
        </div>

        {/* Critical Sanctions */}
        <div
          onClick={() => {
            setStatusFilter('gap');
            setSearchQuery('20m');
          }}
          className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-amber-500 dark:border-navy-800 dark:bg-navy-900"
        >
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <div className="text-2xs font-medium uppercase text-slate-400">Gaps com Sanções Críticas</div>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {cData?.critical_gaps_count ?? 0} <span className="text-2xs font-normal text-slate-400">alto impacto</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Regulation Breakdown Cards */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cobertura por Diploma Legal &amp; Regulamento:</span>
          {selectedRegulation !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedRegulation('all')}
              className="text-2xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400"
            >
              Mostrar Todos os Regulamentos
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(cData?.regulations ?? {}).map(([reg, st]) => {
            const isSelected = selectedRegulation.toLowerCase() === reg.toLowerCase();
            return (
              <div
                key={reg}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedRegulation(isSelected ? 'all' : reg)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setSelectedRegulation(isSelected ? 'all' : reg);
                  }
                }}
                className={`cursor-pointer rounded-xl border p-2.5 transition ${
                  isSelected
                    ? 'border-teal-500 bg-teal-500/5 shadow-sm dark:bg-navy-800'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-navy-800 dark:bg-navy-900'
                }`}
              >
                <div className="flex items-center justify-between text-2xs">
                  <span className="font-bold truncate text-slate-800 dark:text-slate-200" title={reg}>
                    {reg}
                  </span>
                  <span className="font-black text-teal-600 dark:text-teal-400">{st.coverage_pct}%</span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-2xs text-slate-500">
                  <span>{st.compliant} conformes</span>
                  <span className="text-rose-500 font-semibold">{st.gaps} gaps</span>
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-navy-800">
                  <div className="h-full bg-teal-500" style={{ width: `${st.coverage_pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-navy-800 dark:bg-navy-900">
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="mr-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Estado:</span>
          {[
            { id: 'all', label: `Todos (${cData?.total_obligations ?? 0})` },
            { id: 'gap', label: `⚠️ Lacunas / Gaps (${cData?.gaps_count ?? 0})` },
            { id: 'compliant', label: `✅ Em Conformidade (${cData?.compliant_count ?? 0})` },
            { id: 'partial', label: `⏳ Parcial (${cData?.partial_count ?? 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                statusFilter === tab.id
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-navy-800 dark:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por artigo, lei, requisito, política..."
            aria-label="Pesquisar por artigo, lei, requisito ou política"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs dark:border-navy-700 dark:bg-navy-800 dark:text-white"
          />
        </div>
      </div>

      {/* Main Compliance Matrix Table */}
      <DataTable
        columns={columns}
        rows={filteredItems}
        rowKey={(r) => r.obligation_id}
        loading={coverageQuery.isLoading}
        error={coverageQuery.isError ? 'Erro ao carregar matriz de conformidade' : null}
        onRowClick={(r) => setSelectedObligation(r)}
        maxHeight="calc(100vh - 350px)"
      />

      {/* DRAWER FOR OBLIGATION DETAILS */}
      <Drawer
        open={Boolean(selectedObligation)}
        onClose={() => setSelectedObligation(null)}
        title={
          selectedObligation ? (
            <div className="flex items-center gap-2">
              <span className="rounded bg-teal-500/10 px-2 py-0.5 text-xs font-bold text-teal-700 dark:text-teal-300">
                {selectedObligation.obligation_id}
              </span>
              <span>{selectedObligation.article}</span>
            </div>
          ) : (
            'Detalhes'
          )
        }
        subtitle={selectedObligation?.law}
        width="max-w-2xl"
      >
        {selectedObligation && (
          <div className="space-y-4 text-xs">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-2xs text-slate-400">
                Requisito Legal &amp; Obrigação
              </h4>
              <p className="mt-1.5 rounded-lg bg-slate-50 p-3 leading-relaxed text-slate-800 dark:bg-navy-950 dark:text-slate-200">
                {selectedObligation.obligation}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 p-2.5 dark:border-navy-800">
                <span className="text-2xs font-semibold uppercase text-slate-400">Tópico Regulamentar</span>
                <div className="mt-1 font-medium text-slate-800 dark:text-slate-200">{selectedObligation.topic}</div>
              </div>
              <div className="rounded-lg border border-slate-200 p-2.5 dark:border-navy-800">
                <span className="text-2xs font-semibold uppercase text-slate-400">Estado de Cobertura</span>
                <div className="mt-1 font-bold text-teal-600 dark:text-teal-400">{selectedObligation.status_label}</div>
              </div>
            </div>

            {selectedObligation.policy && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                <span className="text-2xs font-bold uppercase text-emerald-600 dark:text-emerald-400">
                  Política Interna Vinculada
                </span>
                <div className="mt-1 font-bold text-slate-900 dark:text-white">
                  {selectedObligation.policy.code} — {selectedObligation.policy.title}
                </div>
                <div className="mt-1 text-2xs text-slate-500">
                  Estado: <span className="font-semibold capitalize text-emerald-600">{selectedObligation.policy.status}</span> ·
                  Correspondência: {selectedObligation.match_type}
                </div>
              </div>
            )}

            {selectedObligation.penalty_ref && (
              <div className="rounded-lg border border-amber-200 bg-amber-500/10 p-3 dark:border-amber-800/50">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold">
                  <ShieldAlert className="h-4 w-4" />
                  Quadro Sancionatório &amp; Penalidades
                </div>
                <div className="mt-1 text-slate-700 dark:text-slate-300">{selectedObligation.penalty_ref}</div>
              </div>
            )}

            {selectedObligation.evidence_examples && (
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-2xs text-slate-400">
                  Evidências Práticas de Conformidade (Audit-Ready)
                </h4>
                <div className="mt-1.5 rounded-lg bg-teal-500/5 border border-teal-500/20 p-3 text-slate-700 dark:text-slate-300">
                  {selectedObligation.evidence_examples}
                </div>
              </div>
            )}

            <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-navy-800">
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-2xs text-slate-400">
                Mapeamento Cruzado (Crosswalks)
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-2xs text-slate-500">ISO/IEC 27001:2022:</span>
                  <div className="font-mono text-xs font-semibold text-sky-600 dark:text-sky-400">
                    {selectedObligation.mapping_iso27001 || '—'}
                  </div>
                </div>
                <div>
                  <span className="text-2xs text-slate-500">NIST CSF 2.0:</span>
                  <div className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    {selectedObligation.mapping_nist_csf || '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* AI REMEDIATION MODAL */}
      <Modal
        open={Boolean(remediationTarget)}
        onClose={() => setRemediationTarget(null)}
        title={
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
            <Sparkles className="h-5 w-5" />
            <span>Remediação Automatizada com IA ({remediationTarget?.obligation_id})</span>
          </div>
        }
      >
        <div className="space-y-3 text-xs">
          <p className="text-slate-600 dark:text-slate-300">
            O assistente de IA identificou esta lacuna em <strong>{remediationTarget?.law}</strong> (
            <em>{remediationTarget?.article}</em>) e gerou a redação técnica para integrar na política interna da organização.
          </p>

          <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-navy-950">
            <span className="text-2xs font-bold uppercase text-slate-400">Obrigação Legal em Falta:</span>
            <div className="mt-1 text-slate-800 dark:text-slate-200 font-medium">{remediationTarget?.obligation}</div>
          </div>

          <div>
            <div className="text-2xs font-bold uppercase text-slate-500 mb-1">
              Política de Destino Recomendada:
            </div>
            <div className="rounded-lg border border-slate-200 p-2 bg-white dark:border-navy-700 dark:bg-navy-800 font-medium">
              📄{' '}
              {remediationQuery.data?.candidate_policy ? (
                <span>
                  <strong>{remediationQuery.data.candidate_policy.code}</strong> —{' '}
                  {remediationQuery.data.candidate_policy.title}
                </span>
              ) : (
                <span className="italic text-slate-400">A carregar política recomendada…</span>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="compliance-suggested-clause" className="block text-2xs font-bold uppercase text-slate-500 mb-1">
              Redação da Cláusula de Conformidade Proposta:
            </label>
            <textarea
              id="compliance-suggested-clause"
              rows={8}
              value={customClause || remediationQuery.data?.suggested_clause || ''}
              onChange={(e) => setCustomClause(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs dark:border-navy-700 dark:bg-navy-950 dark:text-white"
            />
          </div>

          {applyRemediation.isError && (
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-600 text-xs">
              Erro ao aplicar remediação: {String(applyRemediation.error)}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary text-xs" onClick={() => setRemediationTarget(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary text-xs"
              disabled={applyRemediation.isPending || !remediationQuery.data?.candidate_policy}
              onClick={() => {
                if (remediationQuery.data?.candidate_policy) {
                  applyRemediation.mutate({
                    policy_id: remediationQuery.data.candidate_policy.id,
                    clause_text: customClause || remediationQuery.data.suggested_clause,
                  });
                }
              }}
            >
              {applyRemediation.isPending ? 'A Aplicar…' : 'Inserir e Atualizar Política'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
