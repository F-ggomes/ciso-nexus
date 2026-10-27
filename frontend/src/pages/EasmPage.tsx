import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Globe, Lock, Play, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { api } from '../api/client';
import { Alert, PageHeader, Spinner, errorMessage } from '../components/common';
import Modal from '../components/Modal';

interface EasmAsset {
  domain: string;
  scanned_at?: string;
  ip_addresses?: string[];
  tls?: {
    valid: boolean;
    days_remaining: number;
    issuer: string;
    grade: string;
    expires_at?: string;
  };
  dns_email?: {
    spf: boolean;
    dmarc: boolean;
    dmarc_policy: string;
    grade: string;
  };
  ports?: Array<{ port: number; service: string; state: string }>;
  overall_grade?: string;
  findings?: string[];
}

export default function EasmPage() {
  const qc = useQueryClient();
  const [scanDomainInput, setScanDomainInput] = useState('');
  const [selectedScanResult, setSelectedScanResult] = useState<EasmAsset | null>(null);

  const overview = useQuery({
    queryKey: ['easm', 'overview'],
    queryFn: api.easm.overview,
  });

  const scanMutation = useMutation({
    mutationFn: (domain: string) => api.easm.scan(domain),
    onSuccess: (data: EasmAsset) => {
      setSelectedScanResult(data);
      qc.invalidateQueries({ queryKey: ['easm', 'overview'] });
    },
  });

  const handleScanSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!scanDomainInput.trim()) return;
    scanMutation.mutate(scanDomainInput.trim());
  };

  const assets: EasmAsset[] = overview.data?.assets ?? [];
  const totalAssets = assets.length;
  const expiringTls = assets.filter((a) => (a.tls?.days_remaining ?? 999) <= 30).length;
  const adminPortsExposed = assets.filter((a) => (a.ports ?? []).some((p) => p.port === 22 || p.port === 3389)).length;
  const dmarcEnforced = assets.filter((a) => a.dns_email?.dmarc_policy === 'reject' || a.dns_email?.dmarc_policy === 'p=reject').length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Superfície de Ataque Externa (EASM)"
        subtitle="Monitorização contínua do perímetro externo: certificados TLS, higiene DNS (SPF/DMARC), cabeçalhos de segurança e portas expostas."
        actions={
          <button
            type="button"
            className="btn-secondary"
            onClick={() => qc.invalidateQueries({ queryKey: ['easm', 'overview'] })}
            disabled={overview.isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${overview.isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card p-3">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Globe className="h-4 w-4 text-sky-500" />
            <span className="text-xs font-medium">Ativos no Perímetro</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-navy-900 dark:text-white">{totalAssets}</div>
          <div className="text-2xs text-slate-500">Domínios & APIs inventariados</div>
        </div>

        <div className="card p-3">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Lock className={`h-4 w-4 ${expiringTls > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
            <span className="text-xs font-medium">TLS &lt; 30 Dias</span>
          </div>
          <div className={`mt-2 text-2xl font-bold ${expiringTls > 0 ? 'text-amber-600' : 'text-navy-900 dark:text-white'}`}>
            {expiringTls}
          </div>
          <div className="text-2xs text-slate-500">Risco iminente de expiração</div>
        </div>

        <div className="card p-3">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <ShieldAlert className={`h-4 w-4 ${adminPortsExposed > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
            <span className="text-xs font-medium">Portas Admin Expostas</span>
          </div>
          <div className={`mt-2 text-2xl font-bold ${adminPortsExposed > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {adminPortsExposed}
          </div>
          <div className="text-2xs text-slate-500">SSH (22) ou RDP (3389) abertos</div>
        </div>

        <div className="card p-3">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium">Higiene DMARC</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-navy-900 dark:text-white">
            {totalAssets > 0 ? Math.round((dmarcEnforced / totalAssets) * 100) : 100}%
          </div>
          <div className="text-2xs text-slate-500">Política p=reject implementada</div>
        </div>
      </div>

      {/* On-Demand Scan Card */}
      <div className="card p-4">
        <h3 className="section-title mb-2">Análise de Perímetro On-Demand</h3>
        <form onSubmit={handleScanSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Globe className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="input pl-8"
              placeholder="Introduza domínio ou subdomínio (ex: portal.bancoalfa.pt, api.healthbeta.pt)"
              value={scanDomainInput}
              onChange={(e) => setScanDomainInput(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary flex items-center gap-1.5" disabled={scanMutation.isPending}>
            <Play className={`h-3.5 w-3.5 ${scanMutation.isPending ? 'animate-spin' : ''}`} />
            {scanMutation.isPending ? 'A Analisar…' : 'Analisar Perímetro'}
          </button>
        </form>
        {scanMutation.isError && (
          <div className="mt-3">
            <Alert>{errorMessage(scanMutation.error)}</Alert>
          </div>
        )}
      </div>

      {/* Perimeter Assets Table */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-navy-800 flex justify-between items-center">
          <h3 className="section-title">Inventário de Perímetro Externo &amp; Postura Contínua</h3>
          <span className="text-2xs text-slate-400">Organização Ativa: {overview.data?.org_name ?? '—'}</span>
        </div>

        {overview.isLoading && <div className="p-6 text-center"><Spinner /></div>}
        {overview.isError && <div className="p-4"><Alert>{errorMessage(overview.error)}</Alert></div>}

        {!overview.isLoading && assets.length === 0 && (
          <div className="py-8 text-center text-xs text-slate-500">
            Nenhum ativo externo registado para esta organização. Use a análise on-demand acima para auditar novos domínios.
          </div>
        )}

        {assets.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 dark:border-navy-800 dark:bg-navy-900/60 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Ativo / Domínio</th>
                  <th className="px-4 py-2.5 font-semibold">Endereço IP</th>
                  <th className="px-4 py-2.5 font-semibold">Certificado TLS</th>
                  <th className="px-4 py-2.5 font-semibold">Postura DNS &amp; Email</th>
                  <th className="px-4 py-2.5 font-semibold">Portas Expostas</th>
                  <th className="px-4 py-2.5 font-semibold">Avaliação</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
                {assets.map((asset, idx) => {
                  const days = asset.tls?.days_remaining ?? 0;
                  const tlsBadge = !asset.tls?.valid
                    ? 'badge-fail'
                    : days <= 15
                      ? 'badge-fail'
                      : days <= 30
                        ? 'badge-warn'
                        : 'badge-pass';

                  const hasAdminPorts = (asset.ports ?? []).some((p) => p.port === 22 || p.port === 3389);

                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-navy-800/30">
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-navy-900 dark:text-white flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 text-accent-500" />
                          <span>{asset.domain}</span>
                          {hasAdminPorts && <span className="badge-fail font-mono">SSH/RDP Exposto</span>}
                        </div>
                        {asset.findings && asset.findings.length > 0 && (
                          <div className="mt-1 text-2xs text-rose-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-xs">{asset.findings[0]}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-2xs text-slate-500">
                        {asset.ip_addresses && asset.ip_addresses.length > 0
                          ? asset.ip_addresses.join(', ')
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className={tlsBadge}>
                            {asset.tls?.valid ? `${days} dias restantes` : 'Inválido / Inexistente'}
                          </span>
                        </div>
                        <div className="text-2xs text-slate-400 mt-0.5">{asset.tls?.issuer || '—'}</div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <span className="badge-neutral font-mono">SPF: {asset.dns_email?.spf ? 'Sim' : 'Não'}</span>
                          <span className="badge-accent font-mono">{asset.dns_email?.dmarc_policy || 'DMARC'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {(asset.ports ?? []).map((p) => {
                            const isDanger = p.port === 22 || p.port === 3389;
                            return (
                              <span
                                key={p.port}
                                className={`rounded px-1.5 py-0.5 text-2xs font-mono font-medium ${
                                  isDanger
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                                    : 'bg-slate-100 text-slate-700 dark:bg-navy-800 dark:text-slate-300'
                                }`}
                              >
                                {p.port}/{p.service}
                              </span>
                            );
                          })}
                          {(asset.ports ?? []).length === 0 && <span className="text-2xs text-slate-400">Nenhuma porta detetada</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            asset.overall_grade === 'A'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : asset.overall_grade === 'B'
                                ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                          }`}
                        >
                          Grade {asset.overall_grade ?? 'B'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          className="btn-ghost text-2xs"
                          onClick={() => {
                            scanMutation.mutate(asset.domain);
                          }}
                          disabled={scanMutation.isPending}
                        >
                          Re-analisar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Result Modal */}
      {selectedScanResult && (
        <Modal
          open={!!selectedScanResult}
          onClose={() => setSelectedScanResult(null)}
          title={`Resultado da Análise de Perímetro: ${selectedScanResult.domain}`}
          width="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-navy-800">
              <span className="text-slate-500">Classificação Geral de Segurança:</span>
              <span className="badge-pass font-bold text-sm">Grade {selectedScanResult.overall_grade || 'A'}</span>
            </div>

            <div>
              <div className="font-semibold text-navy-900 dark:text-slate-100 mb-1">Certificado TLS &amp; Cifragem</div>
              <div className="rounded border border-slate-200 p-2.5 dark:border-navy-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Validade:</span>
                  <span className="font-medium text-emerald-600">{selectedScanResult.tls?.days_remaining} dias restantes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Autoridade Emissora (CA):</span>
                  <span className="font-medium">{selectedScanResult.tls?.issuer}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="font-semibold text-navy-900 dark:text-slate-100 mb-1">Portas &amp; Superfície Exposta</div>
              <div className="rounded border border-slate-200 p-2.5 dark:border-navy-800">
                <div className="flex flex-wrap gap-1.5">
                  {(selectedScanResult.ports ?? []).map((p) => (
                    <span key={p.port} className="badge-neutral font-mono">
                      {p.port}/{p.service} ({p.state})
                    </span>
                  ))}
                  {(selectedScanResult.ports ?? []).length === 0 && (
                    <span className="text-slate-400">Nenhuma porta aberta detetada no perímetro externo.</span>
                  )}
                </div>
              </div>
            </div>

            {selectedScanResult.findings && selectedScanResult.findings.length > 0 && (
              <div>
                <div className="font-semibold text-rose-700 dark:text-rose-400 mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Alertas e Recomendações
                </div>
                <ul className="list-inside list-disc space-y-1 rounded bg-rose-50 p-2.5 text-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
                  {selectedScanResult.findings.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button type="button" className="btn-primary" onClick={() => setSelectedScanResult(null)}>
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
