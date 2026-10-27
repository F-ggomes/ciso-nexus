import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Plus, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { api, getRole } from '../api/client';
import type { FrameworkFull, Requirement, RepositoryDocument, RepositoryDocumentCreate, RepositoryHit } from '../api/types';
import Drawer from '../components/Drawer';
import Markdown from '../components/Markdown';
import Modal from '../components/Modal';
import { Alert, Field, PageHeader, Spinner, errorMessage, fmtDate } from '../components/common';
import { useI18n } from '../i18n';

const JURISDICTION_ORDER = ['PT', 'EU', 'AO', 'INTL', 'US'];
const JURISDICTION_LABEL: Record<string, string> = {
  PT: 'Portugal (DL 125/2025, Lei 58/2019, BdP Aviso 3/2020)',
  EU: 'União Europeia (DORA, NIS2, RGPD, EU AI Act, CRA)',
  AO: 'Angola (Lei 22/11, Lei 7/17, BNA Avisos)',
  INTL: 'Internacional (ISO 27001, 22301, 27701, 42001, PCI-DSS)',
  US: 'Estados Unidos (NIST CSF 2.0, CIS v8.1)',
};
const JURISDICTION_FLAGS: Record<string, string> = {
  PT: '🇵🇹',
  EU: '🇪🇺',
  AO: '🇦🇴',
  INTL: '🌐',
  US: '🇺🇸',
};

function KindBadge({ kind }: { kind: string }) {
  const k = (kind ?? '').toLowerCase();
  const cls =
    k === 'regulation' || k === 'law'
      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
      : k === 'standard'
        ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'
        : 'bg-slate-100 text-slate-700 dark:bg-navy-800 dark:text-slate-300';
  return <span className={`badge ${cls}`}>{k || 'other'}</span>;
}

function RequirementBrowser({ framework, onClose }: { framework: FrameworkFull | null; onClose: () => void }) {
  const reqs = useQuery({ queryKey: ['frameworks', framework?.id, 'requirements'], queryFn: () => api.frameworks.requirements(framework!.id), enabled: !!framework });
  const [domain, setDomain] = useState('');
  const [q, setQ] = useState('');
  const domains = useMemo(() => Array.from(new Set((reqs.data ?? []).map((r) => r.domain))).sort(), [reqs.data]);
  const rows: Requirement[] = (reqs.data ?? []).filter((r) => (!domain || r.domain === domain) && (!q || `${r.ref} ${r.title} ${r.text}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <Drawer open={!!framework} onClose={onClose} title={framework ? `${framework.name} · requirements` : ''} subtitle={framework ? `${framework.jurisdiction} · ${framework.version} · ${framework.requirements} requirements` : undefined} width="max-w-3xl">
      <div className="mb-3 flex flex-wrap gap-2">
        <input className="input w-auto flex-1" placeholder="Filter by text or ref…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-auto" value={domain} onChange={(e) => setDomain(e.target.value)}>
          <option value="">All domains</option>
          {domains.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      {reqs.isLoading && <Spinner />}
      {reqs.isError && <Alert>{errorMessage(reqs.error)}</Alert>}
      <ul className="divide-y divide-slate-100 dark:divide-navy-800">
        {rows.map((r) => (
          <li key={r.id} className="py-2 text-xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="mono mr-2 font-semibold text-accent-700 dark:text-accent-400">{r.ref}</span>
                <span className="font-medium text-slate-800 dark:text-slate-100">{r.title}</span>
              </div>
              <div className="flex shrink-0 gap-1">
                <span className="badge-neutral">{r.kind}</span>
                <span className="badge-neutral normal-case">{r.domain}</span>
              </div>
            </div>
            {r.text && <p className="mt-1 whitespace-pre-wrap text-slate-600 dark:text-slate-300">{r.text}</p>}
            {r.crosswalk?.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                <span className="text-2xs text-slate-500">Crosswalk:</span>
                {r.crosswalk.map((c, i) => (
                  <span key={i} className="badge-accent normal-case">
                    {c.framework_id}:{c.ref}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
        {!reqs.isLoading && rows.length === 0 && <li className="py-4 text-center text-xs text-slate-500">No requirements match.</li>}
      </ul>
    </Drawer>
  );
}

function DocumentReader({ doc, onClose }: { doc: RepositoryDocument | null; onClose: () => void }) {
  const full = useQuery({ queryKey: ['repository', 'document', doc?.id], queryFn: () => api.repository.document(doc!.id), enabled: !!doc });
  return (
    <Drawer open={!!doc} onClose={onClose} title={doc?.title ?? ''} subtitle={doc ? `${doc.doc_type} · ${doc.language} · ${doc.framework_id ?? ''}` : undefined} width="max-w-4xl">
      {full.isLoading && <Spinner />}
      {full.isError && <Alert>{errorMessage(full.error)}</Alert>}
      {full.data?.text && <Markdown source={full.data.text.replace(/^## \[[^\]]+\] /gm, '## ')} className="text-sm" />}
    </Drawer>
  );
}

function AddDocumentModal({ open, onClose, frameworks }: { open: boolean; onClose: () => void; frameworks: FrameworkFull[] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<RepositoryDocumentCreate>({ title: '', doc_type: 'guidance', language: 'pt-PT', text: '', framework_id: '', source_url: '', tags: [] });
  const [tags, setTags] = useState('');
  const create = useMutation({
    mutationFn: () =>
      api.repository.createDocument({
        ...form,
        framework_id: form.framework_id || undefined,
        source_url: form.source_url || undefined,
        tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['repository', 'documents'] });
      onClose();
    },
  });
  const set = <K extends keyof RepositoryDocumentCreate>(k: K, v: RepositoryDocumentCreate[K]) => setForm((f) => ({ ...f, [k]: v }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };
  return (
    <Modal open={open} onClose={onClose} title="Add repository document" width="max-w-2xl">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Title">
          <input className="input" required value={form.title} onChange={(e) => set('title', e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Type">
            <select className="input" value={form.doc_type} onChange={(e) => set('doc_type', e.target.value)}>
              {['guidance', 'regulation', 'standard', 'law', 'circular', 'template', 'internal', 'other'].map((x) => (
                <option key={x} value={x}>
                  {x}
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
          <Field label="Framework">
            <select className="input" value={form.framework_id ?? ''} onChange={(e) => set('framework_id', e.target.value)}>
              <option value="">—</option>
              {frameworks.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Source URL">
          <input className="input" type="url" value={form.source_url ?? ''} onChange={(e) => set('source_url', e.target.value)} />
        </Field>
        <Field label="Tags (comma separated)">
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
        </Field>
        <Field label="Text">
          <textarea className="input h-40" required value={form.text} onChange={(e) => set('text', e.target.value)} />
        </Field>
        {create.isError && <Alert>{errorMessage(create.error)}</Alert>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={create.isPending}>
            {create.isPending ? 'Saving…' : 'Add document'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function RepositoryPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const role = (getRole() ?? '').toLowerCase();
  const frameworks = useQuery({ queryKey: ['frameworks'], queryFn: api.frameworks.list });
  const documents = useQuery({ queryKey: ['repository', 'documents'], queryFn: api.repository.documents });
  const [selected, setSelected] = useState<FrameworkFull | null>(null);
  const [addDoc, setAddDoc] = useState(false);
  const [reading, setReading] = useState<RepositoryDocument | null>(null);
  const [q, setQ] = useState('');
  const [submittedQ, setSubmittedQ] = useState('');
  const search = useQuery({ queryKey: ['repository', 'search', submittedQ], queryFn: () => api.repository.search(submittedQ), enabled: submittedQ.length > 1 });
  const watch = useMutation({ mutationFn: api.repository.watch, onSuccess: () => qc.invalidateQueries({ queryKey: ['frameworks'] }) });
  const reload = useMutation({ mutationFn: api.repository.reload, onSuccess: () => qc.invalidateQueries({ queryKey: ['frameworks'] }) });

  const hits: RepositoryHit[] = search.data ? (Array.isArray(search.data) ? search.data : search.data.hits ?? []) : [];
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>('ALL');

  const countsByJurisdiction = useMemo(() => {
    const data = frameworks.data ?? [];
    const counts: Record<string, number> = { ALL: data.length };
    for (const f of data) {
      const j = (f.jurisdiction ?? 'INTL').toUpperCase();
      counts[j] = (counts[j] || 0) + 1;
    }
    return counts;
  }, [frameworks.data]);

  const grouped = useMemo(() => {
    const data = frameworks.data ?? [];
    const keys = Array.from(new Set([...JURISDICTION_ORDER, ...data.map((f) => (f.jurisdiction ?? 'INTL').toUpperCase())]));
    return keys.map((j) => ({ j, items: data.filter((f) => (f.jurisdiction ?? 'INTL').toUpperCase() === j) })).filter((g) => g.items.length > 0);
  }, [frameworks.data]);

  const filteredGrouped = useMemo(() => {
    if (selectedJurisdiction === 'ALL') return grouped;
    return grouped.filter((g) => g.j === selectedJurisdiction);
  }, [grouped, selectedJurisdiction]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('nav.repository')}
        subtitle="Regulatory and standards knowledge base: frameworks, requirements with crosswalks, and supporting documents."
        actions={
          <>
            <button className="btn-secondary" onClick={() => watch.mutate()} disabled={watch.isPending}>
              <RefreshCw className={`h-3.5 w-3.5 ${watch.isPending ? 'animate-spin' : ''}`} />
              Check for updates
            </button>
            {(role === 'ciso' || role === 'admin') && (
              <button className="btn-secondary" onClick={() => reload.mutate()} disabled={reload.isPending}>
                Reload packs
              </button>
            )}
            <button className="btn-primary" onClick={() => setAddDoc(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add document
            </button>
          </>
        }
      />
      {watch.data && (
        <Alert kind={watch.data.changes.length ? 'info' : 'success'}>
          {watch.data.changes.length ? `${watch.data.changes.length} change(s) detected: ${watch.data.changes.map((c) => (typeof c === 'string' ? c : JSON.stringify(c))).join('; ')}` : 'All framework packs are up to date.'}
        </Alert>
      )}
      {(watch.isError || reload.isError) && <Alert>{errorMessage(watch.error ?? reload.error)}</Alert>}
      {reload.isSuccess && <Alert kind="success">Repository reloaded.</Alert>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmittedQ(q.trim());
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input className="input pl-7" placeholder="Search requirements and documents (e.g. 'incident notification 24 hours', 'subcontratação')" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary">
          Search
        </button>
      </form>
      {submittedQ && (
        <div className="card p-3">
          <h2 className="section-title mb-2">
            Results for “{submittedQ}” {search.data && <span className="text-slate-400">({hits.length})</span>}
          </h2>
          {search.isLoading && <Spinner />}
          {search.isError && <Alert>{errorMessage(search.error)}</Alert>}
          <ul className="divide-y divide-slate-100 dark:divide-navy-800">
            {hits.map((h, i) => (
              <li key={h.id ?? i} className="py-2 text-xs">
                <div className="flex items-center gap-2">
                  {(h.framework_id || h.framework) && <span className="badge-accent normal-case">{h.framework_id ?? h.framework}</span>}
                  {h.ref && <span className="mono font-semibold">{h.ref}</span>}
                  <span className="font-medium">{h.title}</span>
                  {h.doc_type && <span className="badge-neutral">{h.doc_type}</span>}
                  {typeof h.score === 'number' && <span className="ml-auto text-2xs text-slate-400">score {h.score.toFixed(2)}</span>}
                </div>
                {(h.snippet || h.text) && <p className="mt-0.5 line-clamp-3 text-slate-600 dark:text-slate-300">{h.snippet ?? h.text}</p>}
              </li>
            ))}
            {search.data && hits.length === 0 && <li className="py-3 text-center text-slate-500">No results.</li>}
          </ul>
        </div>
      )}

      {frameworks.isLoading && <Spinner />}
      {frameworks.isError && <Alert>{errorMessage(frameworks.error)}</Alert>}

      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">Jurisdição:</span>
          <button
            type="button"
            onClick={() => setSelectedJurisdiction('ALL')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
              selectedJurisdiction === 'ALL'
                ? 'bg-accent-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-navy-800 dark:text-slate-300'
            }`}
          >
            <span>🌐 Todas as Jurisdições</span>
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-2xs">{countsByJurisdiction['ALL'] ?? 0}</span>
          </button>
          {JURISDICTION_ORDER.map((code) => {
            const count = countsByJurisdiction[code] ?? 0;
            const active = selectedJurisdiction === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => setSelectedJurisdiction(code)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  active
                    ? 'bg-accent-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-navy-800 dark:text-slate-300'
                }`}
              >
                <span>{JURISDICTION_FLAGS[code] || '🌐'} {code === 'INTL' ? 'Internacional' : code === 'US' ? 'EUA' : code === 'PT' ? 'Portugal' : code === 'EU' ? 'União Europeia' : 'Angola'}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-2xs ${active ? 'bg-white/20' : 'bg-black/10 dark:bg-white/10'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {filteredGrouped.map(({ j, items }) => (
        <section key={j}>
          <h2 className="section-title mb-2">
            {JURISDICTION_LABEL[j] ?? j} <span className="ml-1 text-slate-400">({items.length})</span>
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {items.map((f) => (
              <button key={f.id} onClick={() => setSelected(f)} className="card flex flex-col gap-1.5 p-3 text-left hover:border-accent-500">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-navy-900 dark:text-slate-100">{f.name}</span>
                  <KindBadge kind={f.kind} />
                </div>
                <div className="text-2xs text-slate-500">
                  {f.issuer ?? '—'} · v{f.version}
                  {f.effective_date && ` · effective ${fmtDate(f.effective_date, false)}`}
                </div>
                <div className="flex flex-wrap items-center gap-1 text-2xs">
                  <span className="badge-neutral">{f.requirements} req.</span>
                  {f.licensed_text ? <span className="badge-pass">licensed text</span> : <span className="badge-neutral">summary only</span>}
                  {f.pack_version && <span className="badge-neutral normal-case">pack {f.pack_version}</span>}
                </div>
                <div className="mt-auto flex items-center justify-between text-2xs text-slate-400">
                  <span>checked {fmtDate(f.last_checked_at, false)}</span>
                  {f.source_url && (
                    <a href={f.source_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-0.5 hover:text-accent-600">
                      source <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}

      <section>
        <h2 className="section-title mb-2">
          Documents <span className="ml-1 text-slate-400">({documents.data?.length ?? 0})</span>
        </h2>
        {documents.isError && <Alert>{errorMessage(documents.error)}</Alert>}
        <div className="card divide-y divide-slate-100 dark:divide-navy-800">
          {(documents.data ?? []).map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
              <span className="badge-neutral">{d.doc_type}</span>
              <button type="button" className="font-medium hover:text-accent-600 hover:underline" onClick={() => setReading(d)}>
                {d.title}
              </button>
              <span className="text-2xs text-slate-500">{d.language}</span>
              {d.framework_id && <span className="badge-accent normal-case">{d.framework_id}</span>}
              {(d.tags ?? []).map((tg) => (
                <span key={tg} className="rounded-sm bg-slate-100 px-1 text-2xs dark:bg-navy-800">
                  {tg}
                </span>
              ))}
              {d.source_url && (
                <a href={d.source_url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-0.5 text-2xs text-slate-500 hover:text-accent-600">
                  source <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
          {!documents.isLoading && (documents.data ?? []).length === 0 && <p className="px-3 py-4 text-center text-xs text-slate-500">No documents yet.</p>}
        </div>
      </section>

      <RequirementBrowser framework={selected} onClose={() => setSelected(null)} />
      <DocumentReader doc={reading} onClose={() => setReading(null)} />
      <AddDocumentModal open={addDoc} onClose={() => setAddDoc(false)} frameworks={frameworks.data ?? []} />
    </div>
  );
}
