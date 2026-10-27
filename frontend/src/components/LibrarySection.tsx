import { useMutation, useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Download, FileText, Folder, RefreshCw, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { api, downloadBlob, getRole } from '../api/client';
import type { LibraryFolder, LibraryItem } from '../api/types';
import Drawer from './Drawer';
import { Alert, Spinner, errorMessage } from './common';

const PAGE = 100;

function LibraryReader({ item, onClose }: { item: LibraryItem | null; onClose: () => void }) {
  const full = useQuery({ queryKey: ['repository', 'document', item?.id], queryFn: () => api.repository.document(item!.id), enabled: !!item });
  const download = useMutation({
    mutationFn: () => api.repository.libraryFile(item!.id),
    onSuccess: (blob) => downloadBlob(blob, item!.title),
  });
  return (
    <Drawer open={!!item} onClose={onClose} title={item?.title ?? ''} subtitle={item?.path} width="max-w-4xl">
      <div className="mb-3 flex items-center gap-2">
        <button type="button" className="btn-secondary" onClick={() => download.mutate()} disabled={download.isPending}>
          <Download className="h-3.5 w-3.5" /> Descarregar original
        </button>
        {download.isError && <Alert>{errorMessage(download.error)}</Alert>}
      </div>
      {full.isLoading && <Spinner />}
      {full.isError && <Alert>{errorMessage(full.error)}</Alert>}
      {full.data && !full.data.text && <p className="text-xs text-slate-500">Sem texto extraível (digitalização, ficheiro protegido ou formato não suportado). Descarregue o original.</p>}
      {full.data?.text && <pre className="whitespace-pre-wrap break-words font-sans text-sm text-slate-700 dark:text-slate-200">{full.data.text}</pre>}
    </Drawer>
  );
}

function FolderTree({ folders, selected, onSelect }: { folders: LibraryFolder[]; selected: string; onSelect: (path: string) => void }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const hasChildren = useMemo(() => new Set(folders.filter((f) => f.depth > 0).map((f) => f.path.slice(0, f.path.lastIndexOf('/')))), [folders]);
  const visible = folders.filter((f) => {
    const parts = f.path.split('/');
    return parts.slice(0, -1).every((_, i) => open.has(parts.slice(0, i + 1).join('/')));
  });
  const toggle = (p: string) => setOpen((s) => {
    const n = new Set(s);
    if (n.has(p)) n.delete(p);
    else n.add(p);
    return n;
  });
  return (
    <ul className="space-y-0.5 text-xs">
      <li>
        <button type="button" onClick={() => onSelect('')} className={`w-full rounded px-2 py-1 text-left ${selected === '' ? 'bg-accent-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-navy-800'}`}>
          Toda a biblioteca
        </button>
      </li>
      {visible.map((f) => (
        <li key={f.path} className="flex items-center" style={{ paddingLeft: f.depth * 12 }}>
          <button type="button" className="p-0.5 text-slate-400" onClick={() => toggle(f.path)} aria-label="expand" disabled={!hasChildren.has(f.path)}>
            {hasChildren.has(f.path) ? (open.has(f.path) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />) : <span className="inline-block w-3" />}
          </button>
          <button type="button" onClick={() => onSelect(f.path)} className={`flex flex-1 items-center gap-1 truncate rounded px-1.5 py-1 text-left ${selected === f.path ? 'bg-accent-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-navy-800'}`} title={f.path}>
            <Folder className="h-3 w-3 shrink-0" />
            <span className="truncate">{f.name}</span>
            <span className="ml-auto pl-1 text-2xs opacity-70">{f.documents}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function LibrarySection() {
  const [folder, setFolder] = useState('');
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [offset, setOffset] = useState(0);
  const [reading, setReading] = useState<LibraryItem | null>(null);
  const tree = useQuery({ queryKey: ['library', 'tree'], queryFn: api.repository.libraryTree });
  const page = useQuery({
    queryKey: ['library', 'documents', folder, submitted, offset],
    queryFn: () => api.repository.libraryDocuments({ folder: folder || undefined, q: submitted || undefined, offset, limit: PAGE }),
  });
  const importLib = useMutation({ mutationFn: api.repository.libraryImport });
  const select = (p: string) => {
    setFolder(p);
    setOffset(0);
  };
  const total = page.data?.total ?? 0;

  return (
    <section id="library">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="section-title">
          Biblioteca <span className="ml-1 text-slate-400">({tree.data?.filter((f) => f.depth === 0).reduce((n, f) => n + f.documents, 0) ?? 0})</span>
        </h2>
        {getRole() === 'ciso' && (
          <button type="button" className="btn-secondary ml-auto" onClick={() => importLib.mutate()} disabled={importLib.isPending}>
            <RefreshCw className="h-3.5 w-3.5" /> {importLib.isSuccess ? 'Importação iniciada' : 'Importar / actualizar'}
          </button>
        )}
      </div>
      {importLib.isError && <Alert>{errorMessage(importLib.error)}</Alert>}
      {tree.isError && <Alert>{errorMessage(tree.error)}</Alert>}
      {tree.data && tree.data.length === 0 && (
        <p className="card px-3 py-4 text-xs text-slate-500">
          A biblioteca está vazia. Defina NEXUS_LIBRARY_HOST no .env com a pasta local a importar e use “Importar / actualizar”.
        </p>
      )}
      {!!tree.data?.length && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[18rem_1fr]">
          <div className="card max-h-[32rem] overflow-y-auto p-2">
            <FolderTree folders={tree.data} selected={folder} onSelect={select} />
          </div>
          <div className="card flex min-w-0 flex-col">
            <form
              className="flex items-center gap-2 border-b border-slate-100 p-2 dark:border-navy-800"
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(q.trim());
                setOffset(0);
              }}
            >
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input className="input flex-1" placeholder="Pesquisar no nome e no texto…" value={q} onChange={(e) => setQ(e.target.value)} />
              {q && (
                <button
                  type="button"
                  onClick={() => {
                    setQ('');
                    setSubmitted('');
                    setOffset(0);
                  }}
                  className="btn-ghost p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Limpar pesquisa"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <span className="text-2xs text-slate-500 shrink-0">{total} documentos</span>
            </form>
            {page.isLoading && <Spinner />}
            {page.isError && <Alert>{errorMessage(page.error)}</Alert>}
            <ul className="max-h-[28rem] divide-y divide-slate-100 overflow-y-auto dark:divide-navy-800">
              {(page.data?.items ?? []).map((d) => (
                <li key={d.id}>
                  <button type="button" onClick={() => setReading(d)} className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-navy-800">
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{d.title}</span>
                      <span className="block truncate text-2xs text-slate-500">{d.path.slice(0, d.path.lastIndexOf('/') + 1) || '/'}</span>
                    </span>
                    <span className="ml-auto shrink-0 text-2xs text-slate-500">{d.chars ? `${d.language} · ${Math.max(1, Math.round(d.chars / 1000))}k` : 'sem texto'}</span>
                  </button>
                </li>
              ))}
            </ul>
            {total > PAGE && (
              <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-2xs dark:border-navy-800">
                <button type="button" className="btn-secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Anterior</button>
                <span>{offset + 1}–{Math.min(offset + PAGE, total)} de {total}</span>
                <button type="button" className="btn-secondary" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>Seguinte</button>
              </div>
            )}
          </div>
        </div>
      )}
      <LibraryReader item={reading} onClose={() => setReading(null)} />
    </section>
  );
}
