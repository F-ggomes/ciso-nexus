import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Search } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Policy, PolicyCreate, PolicyTemplate } from '../api/types';
import DataTable, { type Column } from '../components/DataTable';
import Markdown from '../components/Markdown';
import Modal from '../components/Modal';
import { Alert, Field, PageHeader, Spinner, errorMessage, fmtDate } from '../components/common';
import { useI18n } from '../i18n';

export const DOC_KINDS = ['policy', 'standard', 'procedure', 'guideline', 'plan', 'record', 'other'];

export function PolicyStatusBadge({ status }: { status: string }) {
  const s = (status ?? '').toLowerCase();
  const cls =
    s === 'approved' ? 'badge-pass' : s === 'in_review' ? 'badge bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : s === 'retired' ? 'badge-neutral' : 'badge-info';
  return <span className={cls}>{s.replace(/_/g, ' ') || '—'}</span>;
}

const TEMPLATE_KIND_ORDER = ['policy', 'procedure', 'process'];

function groupTemplates(templates: PolicyTemplate[]) {
  const kinds = Array.from(new Set([...TEMPLATE_KIND_ORDER, ...templates.map((t) => t.kind)]));
  return kinds.map((kind) => ({ kind, items: templates.filter((t) => t.kind === kind) })).filter((g) => g.items.length > 0);
}

function TemplatePreview({ file }: { file: string | null }) {
  const tpl = useQuery({ queryKey: ['policies', 'templates', file], queryFn: () => api.policies.template(file!), enabled: !!file });
  if (!file) return <p className="text-xs text-slate-500">Select a template to preview its content.</p>;
  if (tpl.isLoading) return <Spinner label="Loading template…" />;
  if (tpl.isError) return <Alert>{errorMessage(tpl.error)}</Alert>;
  if (!tpl.data) return null;
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1 text-2xs text-slate-500">
        <span className="badge-neutral">{tpl.data.kind}</span>
        {tpl.data.code && <span className="mono">{tpl.data.code}</span>}
        <span>{tpl.data.language}</span>
        {tpl.data.generic && <span className="badge-info">generic</span>}
        <span className="mono ml-auto">{tpl.data.file}</span>
      </div>
      <Markdown source={tpl.data.body} className="text-xs" />
    </div>
  );
}

function TemplatesTab({ initialFilter = '' }: { initialFilter?: string }) {
  const templates = useQuery({ queryKey: ['policies', 'templates'], queryFn: api.policies.templates });
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState(initialFilter);

  useEffect(() => {
    if (initialFilter !== undefined) setFilter(initialFilter);
  }, [initialFilter]);

  const allItems = templates.data ?? [];
  const filteredItems = allItems.filter((t) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    if (q === 'fintech') {
      return (
        t.file.includes('dora') ||
        t.file.includes('financial') ||
        t.file.includes('pci') ||
        (t.title ?? '').toLowerCase().includes('dora') ||
        (t.title ?? '').toLowerCase().includes('banc') ||
        (t.title ?? '').toLowerCase().includes('financeir')
      );
    }
    if (q === 'software') {
      return (
        t.file.includes('software') ||
        t.file.includes('development') ||
        t.file.includes('access') ||
        t.file.includes('vulnerability') ||
        (t.title ?? '').toLowerCase().includes('software') ||
        (t.title ?? '').toLowerCase().includes('desenvolvimento') ||
        (t.title ?? '').toLowerCase().includes('vulnerabil')
      );
    }
    return (
      (t.title ?? '').toLowerCase().includes(q) ||
      t.file.toLowerCase().includes(q) ||
      (t.code ?? '').toLowerCase().includes(q) ||
      (t.preview ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-navy-800 dark:bg-navy-900">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            className="input w-full pl-8 py-1 text-xs"
            placeholder="Filtrar modelos pt-PT por título, código ou palavra-chave…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            className={`btn-ghost py-1 px-2.5 text-2xs rounded-full ${!filter ? 'bg-teal-500/15 text-teal-600 dark:text-teal-300 font-bold border border-teal-500/30' : ''}`}
            onClick={() => setFilter('')}
          >
            Todos ({allItems.length})
          </button>
          <button
            type="button"
            className={`btn-ghost py-1 px-2.5 text-2xs rounded-full ${filter === 'fintech' ? 'bg-teal-500/15 text-teal-600 dark:text-teal-300 font-bold border border-teal-500/30' : ''}`}
            onClick={() => setFilter('fintech')}
          >
            🏦 FinTech & Banca
          </button>
          <button
            type="button"
            className={`btn-ghost py-1 px-2.5 text-2xs rounded-full ${filter === 'software' ? 'bg-teal-500/15 text-teal-600 dark:text-teal-300 font-bold border border-teal-500/30' : ''}`}
            onClick={() => setFilter('software')}
          >
            💻 Software & Cloud
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
        <div className="card overflow-hidden xl:col-span-2">
          {templates.isLoading && (
            <div className="p-3">
              <Spinner />
            </div>
          )}
          {templates.isError && (
            <div className="p-3">
              <Alert>{errorMessage(templates.error)}</Alert>
            </div>
          )}
          {groupTemplates(filteredItems).map((g) => (
            <div key={g.kind}>
              <div className="bg-slate-50 px-3 py-1 text-2xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-navy-800 dark:text-slate-400">
                {g.kind} <span className="ml-1 text-slate-400">({g.items.length})</span>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-navy-800">
                {g.items.map((t) => (
                  <li key={t.file}>
                    <button
                      onClick={() => setSelected(t.file)}
                      className={`flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-navy-800/60 ${selected === t.file ? 'bg-teal-500/10 border-l-2 border-teal-500' : ''}`}
                    >
                      <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
                      <div className="min-w-0">
                        <div className="font-medium text-slate-800 dark:text-slate-100">
                          {t.code && <span className="mono mr-1 text-slate-500">{t.code}</span>}
                          {t.title ?? t.file}
                        </div>
                        <div className="text-2xs text-slate-500">
                          {t.language} {t.generic && <span className="badge-info ml-1">generic</span>}
                          {t.preview && <span className="ml-1 line-clamp-1">{t.preview}</span>}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {!templates.isLoading && filteredItems.length === 0 && (
            <p className="p-4 text-center text-xs text-slate-500">Nenhum modelo encontrado para o filtro aplicado.</p>
          )}
        </div>
        <div className="card max-h-[calc(100vh-230px)] overflow-y-auto p-4 xl:col-span-3">
          <TemplatePreview file={selected ?? filteredItems[0]?.file ?? null} />
        </div>
      </div>
    </div>
  );
}

function CreatePolicyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<PolicyCreate>({ code: '', title: '', doc_kind: 'policy', language: 'pt-PT', owner: '', review_cycle_months: 12, requirement_refs: [] });
  const [refs, setRefs] = useState('');
  const [templateFile, setTemplateFile] = useState('');
  const templates = useQuery({ queryKey: ['policies', 'templates'], queryFn: api.policies.templates, enabled: open });

  const pickTemplate = (file: string) => {
    setTemplateFile(file);
    const t = (templates.data ?? []).find((x) => x.file === file);
    if (!t) return;
    setForm((f) => ({
      ...f,
      doc_kind: DOC_KINDS.includes(t.kind) ? t.kind : f.doc_kind,
      language: t.language || f.language,
      ...(t.generic ? {} : { code: t.code ?? f.code, title: t.title ?? f.title }),
    }));
  };
  const create = useMutation({
    mutationFn: () =>
      api.policies.create({
        ...form,
        requirement_refs: refs
          .split(/[,\n]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => {
            const [framework_id, ...rest] = s.split(':');
            return { framework_id: framework_id.trim(), ref: rest.join(':').trim() };
          })
          .filter((r) => r.framework_id && r.ref),
      }),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['policies'] });
      onClose();
      navigate(`/policies/${p.id}`);
    },
  });
  const set = <K extends keyof PolicyCreate>(k: K, v: PolicyCreate[K]) => setForm((f) => ({ ...f, [k]: v }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };
  return (
    <Modal open={open} onClose={onClose} title="New document" width="max-w-4xl">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Start from template" hint="Code-specific templates pre-fill code, title and kind; generic ones only the kind. Version 1 is seeded from the matching template on the server.">
          <select className="input" value={templateFile} onChange={(e) => pickTemplate(e.target.value)}>
            <option value="">— blank —</option>
            {groupTemplates(templates.data ?? []).map((g) => (
              <optgroup key={g.kind} label={g.kind}>
                {g.items.map((t) => (
                  <option key={t.file} value={t.file}>
                    {t.generic ? `Generic ${t.kind}` : `${t.code ?? ''} ${t.title ?? t.file}`.trim()} ({t.language})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Code">
            <input className="input mono" required value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="POL-SI-001" />
          </Field>
          <Field label="Kind">
            <select className="input" value={form.doc_kind} onChange={(e) => set('doc_kind', e.target.value)}>
              {DOC_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Language">
            <select className="input" value={form.language} onChange={(e) => set('language', e.target.value)}>
              <option value="pt-PT">pt-PT</option>
              <option value="en">en</option>
            </select>
          </Field>
        </div>
        <Field label="Title">
          <input className="input" required value={form.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Owner">
            <input className="input" value={form.owner} onChange={(e) => set('owner', e.target.value)} />
          </Field>
          <Field label="Review cycle (months)">
            <input className="input" type="number" min={1} max={60} value={form.review_cycle_months} onChange={(e) => set('review_cycle_months', Number(e.target.value))} />
          </Field>
        </div>
        <Field label="Requirement references" hint="One per line or comma separated, as framework_id:ref — e.g. iso27001:5.1, dora:art.5">
          <textarea className="input h-16 mono" value={refs} onChange={(e) => setRefs(e.target.value)} />
        </Field>
        {create.isError && <Alert>{errorMessage(create.error)}</Alert>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
      <div className="max-h-[65vh] overflow-y-auto rounded-sm border border-slate-200 p-3 dark:border-navy-800">
        <span className="label">Template preview</span>
        <TemplatePreview file={templateFile || null} />
      </div>
      </div>
    </Modal>
  );
}

export default function PoliciesPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [create, setCreate] = useState(false);
  const initialTab = (searchParams.get('tab') as 'documents' | 'templates') || 'documents';
  const [tab, setTab] = useState<'documents' | 'templates'>(initialTab);
  const filterTag = searchParams.get('filter') ?? '';

  useEffect(() => {
    const t = searchParams.get('tab') as 'documents' | 'templates';
    if (t && t !== tab) {
      setTab(t);
    }
  }, [searchParams]);

  const policies = useQuery({ queryKey: ['policies', kind, status], queryFn: () => api.policies.list({ doc_kind: kind || undefined, status: status || undefined }) });

  const columns: Column<Policy>[] = [
    { key: 'code', header: 'Code', render: (p) => <span className="mono text-2xs">{p.code}</span>, width: '110px' },
    { key: 'title', header: 'Title', render: (p) => <span className="font-medium text-slate-800 dark:text-slate-100">{p.title}</span> },
    { key: 'kind', header: 'Kind', render: (p) => <span className="badge-neutral">{p.doc_kind}</span> },
    { key: 'lang', header: 'Lang', render: (p) => p.language },
    { key: 'owner', header: 'Owner', render: (p) => p.owner ?? '—' },
    { key: 'status', header: 'Status', render: (p) => <PolicyStatusBadge status={p.status} /> },
    { key: 'version', header: 'Version', render: (p) => <span className="mono text-2xs">{p.current_version ?? '—'}</span> },
    {
      key: 'review',
      header: 'Next review',
      render: (p) => {
        const overdue = p.next_review_at && new Date(p.next_review_at).getTime() < Date.now();
        return <span className={`whitespace-nowrap ${overdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>{fmtDate(p.next_review_at, false)}</span>;
      },
    },
    {
      key: 'refs',
      header: 'Requirements',
      render: (p) => (
        <span className="flex flex-wrap gap-1">
          {(p.requirement_refs ?? []).slice(0, 4).map((r, i) => (
            <span key={i} className="badge-accent normal-case">
              {r.framework_id}:{r.ref}
            </span>
          ))}
          {(p.requirement_refs ?? []).length > 4 && <span className="text-2xs text-slate-500">+{p.requirement_refs.length - 4}</span>}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <PageHeader
        title={t('nav.policies')}
        subtitle="Policy and document lifecycle: AI drafting, versioning, review, approval and staff attestation."
        actions={
          <>
            <select className="input w-auto" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">{t('common.all')} kinds</option>
              {DOC_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{t('common.all')} statuses</option>
              {['draft', 'in_review', 'approved', 'retired'].map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <button className="btn-primary" onClick={() => setCreate(true)}>
              <Plus className="h-3.5 w-3.5" />
              New document
            </button>
          </>
        }
      />
      <div className="flex gap-1 border-b border-slate-200 dark:border-navy-800">
        {(['documents', 'templates'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-3 py-1.5 text-xs font-medium capitalize ${tab === k ? 'border-accent-600 text-navy-900 dark:text-slate-100' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            {k}
          </button>
        ))}
      </div>
      {tab === 'documents' ? (
        <DataTable columns={columns} rows={policies.data ?? []} rowKey={(p) => p.id} loading={policies.isLoading} error={policies.isError ? errorMessage(policies.error) : null} onRowClick={(p) => navigate(`/policies/${p.id}`)} />
      ) : (
        <TemplatesTab initialFilter={filterTag} />
      )}
      <CreatePolicyModal open={create} onClose={() => setCreate(false)} />
    </div>
  );
}
