import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Download, Plus } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { api, downloadBlob } from '../api/client';
import type { CopilotProvider, Vendor, VendorAssessment, VendorCreate } from '../api/types';
import DataTable, { type Column } from '../components/DataTable';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import SeverityBadge, { severityFromScore } from '../components/SeverityBadge';
import { Alert, BoolBadge, Field, KV, PageHeader, Spinner, errorMessage, fmtDate, fmtNum } from '../components/common';
import { useI18n } from '../i18n';

function TierBadge({ tier }: { tier: Vendor['tier'] }) {
  if (tier === null || tier === undefined || tier === '') return <span className="badge-neutral">unrated</span>;
  const n = Number(String(tier).replace(/\D/g, ''));
  const cls =
    n === 1
      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
      : n === 2
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
        : 'bg-slate-100 text-slate-700 dark:bg-navy-800 dark:text-slate-300';
  return <span className={`badge ${cls}`}>Tier {Number.isNaN(n) ? String(tier) : n}</span>;
}

function provisionBadge(status: string) {
  const s = status.toLowerCase();
  if (['present', 'ok', 'compliant', 'yes', 'met', 'covered'].some((x) => s.includes(x))) return 'badge-pass';
  if (['missing', 'absent', 'no', 'gap', 'fail'].some((x) => s.includes(x))) return 'badge-fail';
  return 'badge-info';
}

function AssessDrawer({ vendor, onClose }: { vendor: Vendor | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [content, setContent] = useState('');
  const [provider, setProvider] = useState<CopilotProvider>('anthropic');
  const [apply, setApply] = useState(false);
  const assess = useMutation({
    mutationFn: (args: { id: string; content?: string }) => api.vendors.assess(args.id, { assessment_content: args.content, provider, apply }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
  const vendorId = vendor?.id ?? null;
  const { reset } = assess;
  useEffect(() => {
    reset();
    setContent('');
  }, [vendorId, reset]);

  const a: VendorAssessment | undefined = assess.data;

  return (
    <Drawer
      open={!!vendor}
      onClose={onClose}
      title={vendor ? `Assess · ${vendor.name}` : ''}
      subtitle={vendor ? `${vendor.country} · ${vendor.service_type} · contract ends ${fmtDate(vendor.contract_end, false)}` : undefined}
      width="max-w-2xl"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn-primary" onClick={() => vendor && assess.mutate({ id: vendor.id, content })} disabled={assess.isPending}>
            <ClipboardCheck className="h-3.5 w-3.5" />
            {assess.isPending ? 'Assessing…' : a ? 'Re-assess' : 'Run AI assessment'}
          </button>
        </>
      }
    >
      {vendor && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-6">
            <div>
              <KV k="Current tier" v={<TierBadge tier={vendor.tier} />} />
              <KV k="Critical / important function" v={<BoolBadge value={vendor.supports_critical_function} yes="CIF" no="no" />} />
              <KV k="Sub-outsourcing" v={<BoolBadge value={vendor.sub_outsourcing} />} />
            </div>
            <div>
              <KV k="Data location" v={vendor.data_location ?? '—'} />
              <KV k="Exit strategy" v={vendor.exit_strategy ? String(vendor.exit_strategy) : <span className="badge-fail">missing</span>} />
              <KV k="Last assessment" v={fmtDate(vendor.last_assessment_at, false)} />
            </div>
          </div>

          <Field label="Assessment input (optional: paste questionnaire, SOC 2 summary, contract extract)">
            <textarea className="input h-24" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Leave empty to assess from the vendor record only." />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center overflow-hidden rounded-sm border border-slate-300 dark:border-navy-700">
              {(
                [
                  ['anthropic', 'Claude'],
                  ['gemini', 'Gemini'],
                ] as [CopilotProvider, string][]
              ).map(([k, label]) => (
                <button key={k} onClick={() => setProvider(k)} className={`px-3 py-1 font-medium ${provider === k ? 'bg-navy-800 text-white dark:bg-accent-600' : 'bg-white text-slate-600 dark:bg-navy-900 dark:text-slate-300'}`}>
                  {label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={apply} onChange={(e) => setApply(e.target.checked)} />
              Apply result to the vendor record (tier, CIF, scores)
            </label>
          </div>

          {assess.isError && <Alert>{errorMessage(assess.error)}</Alert>}
          {assess.isPending && <Spinner label="Running TPRM assessment agent…" />}

          {a && (
            <div className="space-y-4 rounded-sm border border-slate-200 p-3 dark:border-navy-800">
              <div className="flex flex-wrap items-center gap-2">
                <TierBadge tier={a.tier} />
                {a.supports_critical_function && <span className="badge-fail">supports CIF</span>}
                <span className="text-xs text-slate-500">
                  Inherent {fmtNum(a.inherent_score, 1)} <SeverityBadge severity={severityFromScore(a.inherent_score)} /> · Residual {fmtNum(a.residual_score, 1)}{' '}
                  <SeverityBadge severity={severityFromScore(a.residual_score)} />
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">{a.tier_rationale}</p>

              <section>
                <h3 className="section-title mb-1">DORA Art. 30 contractual provisions</h3>
                <ul className="divide-y divide-slate-100 dark:divide-navy-800">
                  {a.art30_provisions.map((p, i) => (
                    <li key={i} className="flex items-start justify-between gap-2 py-1 text-xs">
                      <span>{p.provision}</span>
                      <span className={`${provisionBadge(p.status)} shrink-0`}>{p.status}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {a.roi_missing_fields.length > 0 && (
                <section>
                  <h3 className="section-title mb-1">Register of Information: missing fields</h3>
                  <div className="flex flex-wrap gap-1">
                    {a.roi_missing_fields.map((f) => (
                      <span key={f} className="badge-fail mono normal-case">
                        {f}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {a.concerns.length > 0 && (
                <section>
                  <h3 className="section-title mb-1">Concerns</h3>
                  <ul className="list-disc space-y-0.5 pl-4 text-xs">
                    {a.concerns.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </section>
              )}

              <div>
                <KV k="Next action" v={a.next_action} />
                <KV k="Approver" v={a.approver} />
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

function CreateVendorModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<VendorCreate>({ name: '', country: 'PT', service_type: 'cloud', supports_critical_function: false, data_location: 'EU' });
  const create = useMutation({
    mutationFn: (p: VendorCreate) => api.vendors.create({ ...p, contract_end: p.contract_end || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] });
      onClose();
    },
  });
  const set = <K extends keyof VendorCreate>(k: K, v: VendorCreate[K]) => setForm((f) => ({ ...f, [k]: v }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate(form);
  };
  return (
    <Modal open={open} onClose={onClose} title="Onboard third party" width="max-w-lg">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name">
          <input className="input" required value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Country (ISO)">
            <input className="input uppercase" required maxLength={2} value={form.country} onChange={(e) => set('country', e.target.value.toUpperCase())} />
          </Field>
          <Field label="Service type">
            <select className="input" value={form.service_type} onChange={(e) => set('service_type', e.target.value)}>
              {['cloud', 'saas', 'software', 'managed-service', 'data-centre', 'network', 'payments', 'consulting', 'other'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Data location">
            <input className="input" value={form.data_location ?? ''} onChange={(e) => set('data_location', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contract end">
            <input className="input" type="date" value={form.contract_end ?? ''} onChange={(e) => set('contract_end', e.target.value)} />
          </Field>
          <label className="flex items-end gap-2 pb-2 text-xs">
            <input type="checkbox" checked={!!form.supports_critical_function} onChange={(e) => set('supports_critical_function', e.target.checked)} />
            Supports critical or important function
          </label>
        </div>
        {create.isError && <Alert>{errorMessage(create.error)}</Alert>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={create.isPending}>
            {create.isPending ? 'Saving…' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function VendorsPage() {
  const { t } = useI18n();
  const vendors = useQuery({ queryKey: ['vendors'], queryFn: api.vendors.list });
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [create, setCreate] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportRoi = useMutation({
    mutationFn: (fmt: 'csv' | 'xlsx') => api.vendors.registerOfInformation(fmt),
    onSuccess: (blob, fmt) => {
      setExportError(null);
      downloadBlob(blob, `register-of-information-${new Date().toISOString().slice(0, 10)}.${fmt}`);
    },
    onError: (e) => setExportError(errorMessage(e)),
  });

  const columns: Column<Vendor>[] = [
    { key: 'name', header: 'Third party', render: (v) => <span className="font-medium text-slate-800 dark:text-slate-100">{v.name}</span> },
    { key: 'country', header: 'Country', render: (v) => v.country },
    { key: 'tier', header: 'Tier', render: (v) => <TierBadge tier={v.tier} /> },
    { key: 'cif', header: 'CIF', render: (v) => <BoolBadge value={v.supports_critical_function} yes="CIF" no="no" /> },
    { key: 'service', header: 'Service', render: (v) => v.service_type },
    { key: 'sub', header: 'Sub-outsourcing', render: (v) => <BoolBadge value={v.sub_outsourcing} /> },
    { key: 'data', header: 'Data location', render: (v) => v.data_location ?? '—' },
    { key: 'contract', header: 'Contract end', render: (v) => <span className="whitespace-nowrap">{fmtDate(v.contract_end, false)}</span> },
    { key: 'exit', header: 'Exit strategy', render: (v) => (v.exit_strategy ? <span className="badge-pass">yes</span> : <span className="badge-fail">missing</span>) },
    {
      key: 'score',
      header: 'Inherent / residual',
      render: (v) => (
        <span className="inline-flex items-center gap-1 tabular-nums">
          {fmtNum(v.inherent_score, 1)} / {fmtNum(v.residual_score, 1)} <SeverityBadge severity={severityFromScore(v.residual_score)} />
        </span>
      ),
    },
    { key: 'last', header: 'Last assessed', render: (v) => <span className="whitespace-nowrap text-slate-500">{fmtDate(v.last_assessment_at, false)}</span> },
    {
      key: 'actions',
      header: '',
      render: (v) => (
        <button
          className="btn-secondary py-0.5"
          onClick={(e) => {
            e.stopPropagation();
            setSelected(v);
          }}
        >
          <ClipboardCheck className="h-3 w-3" />
          Assess
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title={t('nav.vendors')}
        subtitle="ICT third-party register (DORA Art. 28–30, EBA outsourcing GL) with AI-assisted tiering."
        actions={
          <>
            <button className="btn-secondary" onClick={() => exportRoi.mutate('csv')} disabled={exportRoi.isPending}>
              <Download className="h-3.5 w-3.5" />
              {exportRoi.isPending ? 'Exporting…' : 'Register of Information (CSV)'}
            </button>
            <button className="btn-secondary" onClick={() => exportRoi.mutate('xlsx')} disabled={exportRoi.isPending}>
              <Download className="h-3.5 w-3.5" />
              XLSX
            </button>
            <button className="btn-primary" onClick={() => setCreate(true)}>
              <Plus className="h-3.5 w-3.5" />
              Onboard
            </button>
          </>
        }
      />
      {exportError && <Alert>{exportError}</Alert>}
      <DataTable columns={columns} rows={vendors.data ?? []} rowKey={(v) => v.id} loading={vendors.isLoading} error={vendors.isError ? errorMessage(vendors.error) : null} />
      <AssessDrawer vendor={selected} onClose={() => setSelected(null)} />
      <CreateVendorModal open={create} onClose={() => setCreate(false)} />
    </div>
  );
}
