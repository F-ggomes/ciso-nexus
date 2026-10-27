import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Copy,
  ExternalLink,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  FolderGit2,
  Layers,
  Maximize2,
  Minimize2,
  RefreshCw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import DataTable, { Column } from '../components/DataTable';
import Drawer from '../components/Drawer';
import { PageHeader } from '../components/common';

type MainTab = 'viewer' | 'obligations' | 'drive' | 'frameworks' | 'timelines';

export default function GrcLibraryViewerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Tab state synced with URL search params
  const tabParam = searchParams.get('tab') as MainTab | null;
  const initialTab: MainTab = tabParam && ['viewer', 'obligations', 'drive', 'frameworks', 'timelines'].includes(tabParam)
    ? tabParam
    : 'viewer';
  const [mainTab, setMainTabState] = useState<MainTab>(initialTab);
  const [viewerSubView, setViewerSubView] = useState('overview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewerSearch, setViewerSearch] = useState('');

  // Obligations state
  const [selectedLaw, setSelectedLaw] = useState(() => searchParams.get('law') || '');
  const [oblSearch, setOblSearch] = useState(() => (tabParam === 'obligations' ? searchParams.get('q') || '' : ''));
  const [oblPage, setOblPage] = useState(0);
  const [selectedObligation, setSelectedObligation] = useState<(string | number | null)[] | null>(null);

  // Drive state
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get('cat') || '');
  const [selectedFileType, setSelectedFileType] = useState(() => searchParams.get('type') || '');
  const [driveSearch, setDriveSearch] = useState(() => (tabParam === 'drive' ? searchParams.get('q') || '' : ''));
  const [drivePage, setDrivePage] = useState(0);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [selectedDriveFile, setSelectedDriveFile] = useState<(string | number | null)[] | null>(null);

  // Frameworks state
  const [selectedJurisdiction, setSelectedJurisdiction] = useState(() => searchParams.get('j') || '');
  const [fwSearch, setFwSearch] = useState(() => (tabParam === 'frameworks' ? searchParams.get('q') || '' : ''));
  const [fwPage, setFwPage] = useState(0);

  const PAGE_SIZE = 25;

  const setMainTab = (newTab: MainTab) => {
    setMainTabState(newTab);
    const next = new URLSearchParams(searchParams);
    next.set('tab', newTab);
    setSearchParams(next, { replace: true });
  };

  // Sync state if URL search parameters change externally
  useEffect(() => {
    const currentTab = searchParams.get('tab') as MainTab | null;
    if (currentTab && ['viewer', 'obligations', 'drive', 'frameworks', 'timelines'].includes(currentTab)) {
      setMainTabState(currentTab);
    }
    const qParam = searchParams.get('q');
    if (qParam !== null) {
      if (currentTab === 'drive') setDriveSearch(qParam);
      else if (currentTab === 'obligations') setOblSearch(qParam);
      else if (currentTab === 'frameworks') setFwSearch(qParam);
    }
    const lawParam = searchParams.get('law');
    if (lawParam !== null) setSelectedLaw(lawParam);
    const catParam = searchParams.get('cat');
    if (catParam !== null) setSelectedCategory(catParam);
    const typeParam = searchParams.get('type');
    if (typeParam !== null) setSelectedFileType(typeParam);
  }, [searchParams]);

  // Metadata query
  const metaQuery = useQuery({
    queryKey: ['grc', 'meta'],
    queryFn: () => api.repository.grcMeta(),
  });

  // Obligations query
  const oblQuery = useQuery({
    queryKey: ['grc', 'obligations', oblSearch, selectedLaw, oblPage],
    queryFn: () =>
      api.repository.grcObligations({
        q: oblSearch || undefined,
        law: selectedLaw || undefined,
        offset: oblPage * PAGE_SIZE,
        limit: PAGE_SIZE,
      }),
  });

  // Drive query with file_type support
  const driveQuery = useQuery({
    queryKey: ['grc', 'drive', driveSearch, selectedCategory, selectedFileType, drivePage],
    queryFn: () =>
      api.repository.grcDrive({
        q: driveSearch || undefined,
        category: selectedCategory || undefined,
        file_type: selectedFileType || undefined,
        offset: drivePage * PAGE_SIZE,
        limit: PAGE_SIZE,
      }),
  });

  // Frameworks query
  const frameworksQuery = useQuery({
    queryKey: ['grc', 'frameworks', fwSearch, selectedJurisdiction, fwPage],
    queryFn: () =>
      api.repository.grcFrameworks({
        q: fwSearch || undefined,
        jurisdiction: selectedJurisdiction || undefined,
        offset: fwPage * PAGE_SIZE,
        limit: PAGE_SIZE,
      }),
  });

  // Timelines query
  const timelinesQuery = useQuery({
    queryKey: ['grc', 'timelines'],
    queryFn: () => api.repository.grcTimelines(),
    enabled: mainTab === 'timelines',
  });

  // Send message to embedded viewer
  const sendToViewer = (msg: { type: string; [key: string]: unknown }) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(msg, '*');
    } catch {
      // Ignore cross-origin error
    }
  };

  // Sync theme with iframe
  const syncTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    sendToViewer({ type: 'SET_THEME', theme: isDark ? 'dark' : 'light' });
  };

  useEffect(() => {
    const observer = new MutationObserver(() => syncTheme());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handleIframeLoad = () => {
    syncTheme();
    sendToViewer({ type: 'SET_VIEW', view: viewerSubView });
  };

  const switchViewerSubView = (viewId: string) => {
    setViewerSubView(viewId);
    sendToViewer({ type: 'SET_VIEW', view: viewId });
  };

  const handleViewerSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (viewerSearch) {
      switchViewerSubView('search');
      sendToViewer({ type: 'SEARCH', query: viewerSearch });
    }
  };

  const jumpToFrameworkInViewer = (fwId: string) => {
    setMainTab('viewer');
    setViewerSubView('library');
    setTimeout(() => {
      sendToViewer({ type: 'SET_VIEW', view: 'library' });
      sendToViewer({ type: 'SELECT_FW', fwId });
    }, 150);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const m = metaQuery.data ?? {
    frameworks_count: 322,
    obligations_count: 1484,
    drive_count: 5452,
    crosswalks_pairs_count: 28757,
  };

  // Obligations columns
  const oblCols = oblQuery.data?.cols ?? [];
  const colIndex = (name: string) => oblCols.indexOf(name);

  const obligationsColumns: Column<(string | number | null)[]>[] = [
    {
      key: 'id',
      header: 'ID / Artigo',
      width: '130px',
      render: (r) => (
        <div>
          <div className="font-semibold text-teal-600 dark:text-teal-400">{String(r[colIndex('obligation_id')] || '')}</div>
          <div className="text-2xs text-slate-500">{String(r[colIndex('article')] || '')}</div>
        </div>
      ),
    },
    {
      key: 'law',
      header: 'Lei / Regulamento',
      width: '180px',
      render: (r) => {
        const law = String(r[colIndex('law')] || '');
        const isDora = law.toLowerCase().includes('dora');
        const isNis2 = law.toLowerCase().includes('nis2');
        const isGdpr = law.toLowerCase().includes('gdpr') || law.toLowerCase().includes('rgpd');
        const isBna = law.toLowerCase().includes('bna') || law.toLowerCase().includes('angola');
        return (
          <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-2xs font-medium ${
              isDora
                ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
                : isNis2
                ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300'
                : isGdpr
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : isBna
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                : 'bg-slate-100 text-slate-700 dark:bg-navy-800 dark:text-slate-300'
            }`}
          >
            {law}
          </span>
        );
      },
    },
    {
      key: 'topic',
      header: 'Tópico & Destinatário',
      width: '160px',
      render: (r) => (
        <div>
          <div className="font-medium text-slate-800 dark:text-slate-200">{String(r[colIndex('topic')] || '')}</div>
          <div className="text-2xs text-slate-500 capitalize">{String(r[colIndex('addressee')] || '')}</div>
        </div>
      ),
    },
    {
      key: 'obligation',
      header: 'Obrigação Regulamentar',
      render: (r) => {
        const text = String(r[colIndex('obligation')] || '');
        return <div className="line-clamp-2 text-xs text-slate-700 dark:text-slate-300">{text}</div>;
      },
    },
    {
      key: 'mapping',
      header: 'Mapeamento ISO / NIST',
      width: '180px',
      render: (r) => {
        const iso = String(r[colIndex('mapping_iso27001')] || '');
        const nist = String(r[colIndex('mapping_nist_csf')] || '');
        return (
          <div className="flex flex-wrap gap-1">
            {iso && <span className="rounded bg-sky-500/10 px-1 py-0.5 text-2xs font-mono text-sky-700 dark:text-sky-300">ISO: {iso}</span>}
            {nist && <span className="rounded bg-indigo-500/10 px-1 py-0.5 text-2xs font-mono text-indigo-700 dark:text-indigo-300">NIST: {nist}</span>}
          </div>
        );
      },
    },
    {
      key: 'penalties',
      header: 'Penalidades',
      width: '160px',
      render: (r) => {
        const p = String(r[colIndex('penalty_ref')] || '');
        return p ? (
          <span className="line-clamp-1 text-2xs text-amber-600 dark:text-amber-400" title={p}>
            ⚠️ {p}
          </span>
        ) : (
          <span className="text-2xs text-slate-400">—</span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '90px',
      className: 'text-right',
      render: (r) => (
        <button
          className="btn-ghost px-2 py-1 text-2xs font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedObligation(r);
          }}
        >
          Ver Detalhes
        </button>
      ),
    },
  ];

  // Drive columns
  const driveColumns: Column<(string | number | null)[]>[] = [
    {
      key: 'name',
      header: 'Ficheiro / Documento',
      render: (r) => {
        const name = String(r[0] || '');
        const ext = String(r[5] || name.split('.').pop() || '').toLowerCase();
        const tag = r[3] ? String(r[3]) : '';
        return (
          <div className="flex items-center gap-2">
            <div className="rounded p-1.5 bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 shrink-0">
              {ext === 'pdf' ? (
                <FileText className="h-4 w-4 text-red-500" />
              ) : ext === 'xlsx' || ext === 'xls' || ext === 'csv' || ext.includes('sheet') ? (
                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              ) : ext === 'docx' || ext === 'doc' || ext.includes('document') ? (
                <FileCheck className="h-4 w-4 text-blue-500" />
              ) : (
                <FolderGit2 className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium text-slate-900 dark:text-white" title={name}>
                {name}
              </div>
              <div className="text-2xs text-slate-500 flex items-center gap-1.5">
                <span>{String(r[6] || '—')}</span>
                {tag && (
                  <span className="rounded bg-teal-500/10 px-1 py-0.2 text-2xs font-medium text-teal-700 dark:text-teal-300">
                    {tag}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'category',
      header: 'Categoria',
      width: '190px',
      render: (r) => (
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-2xs font-medium text-slate-700 dark:bg-navy-800 dark:text-slate-300">
          {String(r[2] || 'Geral')}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Formato',
      width: '90px',
      render: (r) => (
        <span className="uppercase text-2xs font-mono font-medium text-slate-600 dark:text-slate-400">
          {String(r[5] || 'DOC')}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Acesso Google Drive',
      width: '210px',
      className: 'text-right',
      render: (r) => {
        const url = String(r[1] || '');
        const id = `${String(r[0] || '')}-${url}`;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(url, id);
              }}
              className="btn-ghost p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
              title="Copiar Link do Google Drive"
            >
              {copiedLink === id ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDriveFile(r);
              }}
              className="btn-ghost p-1 text-slate-500 hover:text-teal-600 dark:hover:text-teal-400"
              title="Inspecionar detalhes do ficheiro"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 rounded bg-teal-500/10 px-2 py-1 text-2xs font-medium text-teal-700 hover:bg-teal-500/20 dark:text-teal-300"
            >
              <ExternalLink className="h-3 w-3" />
              Abrir no Drive
            </a>
          </div>
        );
      },
    },
  ];

  return (
    <div className={`space-y-3 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-900/95 p-4 backdrop-blur-md overflow-hidden' : ''}`}>
      <PageHeader
        title="Biblioteca GRC & Repositório Universal"
        subtitle="Visualizador interativo universal e catálogo integrado de 322 normas, 1.484 obrigações legais, 5.452 ficheiros do Google Drive e 28.757 crosswalks."
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              className="btn-secondary text-xs"
              onClick={() => {
                if (iframeRef.current) iframeRef.current.src = '/viewer.html?embed=1';
                metaQuery.refetch();
                oblQuery.refetch();
                driveQuery.refetch();
                frameworksQuery.refetch();
              }}
              title="Recarregar dados"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Recarregar
            </button>
            <button
              className="btn-secondary text-xs"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Restaurar vista' : 'Ecrã inteiro'}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              {isFullscreen ? 'Restaurar' : 'Ecrã Inteiro'}
            </button>
            <a
              href="/viewer.html"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-xs"
              title="Abrir o visualizador em janela independente"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Janela Externa
            </a>
          </div>
        }
      />

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div
          onClick={() => setMainTab('frameworks')}
          className="cursor-pointer rounded-lg border border-slate-200 bg-white p-2.5 transition hover:border-teal-500/50 dark:border-navy-800 dark:bg-navy-900"
        >
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-teal-500/10 p-1.5 text-teal-600 dark:text-teal-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="text-2xs font-medium uppercase text-slate-500 dark:text-slate-400">Normas & Frameworks</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                {m.frameworks_count} <span className="text-2xs font-normal text-slate-500">normas</span>
              </div>
            </div>
          </div>
        </div>

        <div
          onClick={() => setMainTab('obligations')}
          className="cursor-pointer rounded-lg border border-slate-200 bg-white p-2.5 transition hover:border-indigo-500/50 dark:border-navy-800 dark:bg-navy-900"
        >
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-indigo-500/10 p-1.5 text-indigo-600 dark:text-indigo-400">
              <Scale className="h-4 w-4" />
            </div>
            <div>
              <div className="text-2xs font-medium uppercase text-slate-500 dark:text-slate-400">Obrigações Regulamentares</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                {m.obligations_count} <span className="text-2xs font-normal text-slate-500">artigos</span>
              </div>
            </div>
          </div>
        </div>

        <div
          onClick={() => setMainTab('drive')}
          className="cursor-pointer rounded-lg border border-slate-200 bg-white p-2.5 transition hover:border-sky-500/50 dark:border-navy-800 dark:bg-navy-900"
        >
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-sky-500/10 p-1.5 text-sky-600 dark:text-sky-400">
              <FolderGit2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-2xs font-medium uppercase text-slate-500 dark:text-slate-400">Google Drive Biblioteca</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                {m.drive_count} <span className="text-2xs font-normal text-slate-500">ficheiros</span>
              </div>
            </div>
          </div>
        </div>

        <div
          onClick={() => {
            setMainTab('viewer');
            switchViewerSubView('crosswalks');
          }}
          className="cursor-pointer rounded-lg border border-slate-200 bg-white p-2.5 transition hover:border-amber-500/50 dark:border-navy-800 dark:bg-navy-900"
        >
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-amber-500/10 p-1.5 text-amber-600 dark:text-amber-400">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <div className="text-2xs font-medium uppercase text-slate-500 dark:text-slate-400">Crosswalks Mapeados</div>
              <div className="text-base font-bold text-slate-900 dark:text-white">
                {m.crosswalks_pairs_count} <span className="text-2xs font-normal text-slate-500">pares</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Feature Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2 dark:border-navy-800">
        <nav className="flex space-x-1" aria-label="Tabs">
          {[
            { id: 'viewer', label: 'Visualizador Interativo', icon: Compass },
            { id: 'obligations', label: '1.484 Obrigações Legais', icon: Scale },
            { id: 'drive', label: '5.452 Documentos Google Drive', icon: FolderGit2 },
            { id: 'frameworks', label: 'Catálogo de 322 Normas', icon: BookOpen },
            { id: 'timelines', label: 'Prazos & Calendário de Incidentes', icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = mainTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setMainTab(tab.id as MainTab)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-teal-500 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-navy-800 dark:hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TAB 1: VISUALIZADOR INTERATIVO */}
      {mainTab === 'viewer' && (
        <div className="space-y-2">
          {/* Sub-navigation inside viewer */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-navy-800 dark:bg-navy-900">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-2xs font-semibold uppercase tracking-wider text-slate-400">Vistas do Visualizador:</span>
              {[
                { id: 'overview', label: 'Visão Geral' },
                { id: 'library', label: '302 Normas' },
                { id: 'obligations', label: 'Obrigações' },
                { id: 'crosswalks', label: 'Crosswalks ISO/NIST' },
                { id: 'reporting', label: 'Prazos' },
                { id: 'drive', label: 'Drive' },
                { id: 'sources', label: 'Fontes' },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => switchViewerSubView(sub.id)}
                  className={`rounded-md px-2.5 py-1 text-2xs font-medium transition ${
                    viewerSubView === sub.id
                      ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 font-bold'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-navy-800'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* Quick search forwarder */}
            <form onSubmit={handleViewerSearchSubmit} className="flex items-center gap-1">
              <div className="relative">
                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar artigos e controlos…"
                  value={viewerSearch}
                  onChange={(e) => setViewerSearch(e.target.value)}
                  className="rounded-md border border-slate-200 bg-slate-50 py-1 pl-7 pr-2 text-xs dark:border-navy-700 dark:bg-navy-800 dark:text-white"
                />
              </div>
              <button type="submit" className="btn-secondary py-1 text-xs">
                Pesquisar
              </button>
            </form>
          </div>

          {/* Embedded Container */}
          <div
            className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-navy-800 dark:bg-navy-950 ${
              isFullscreen ? 'h-[calc(100vh-175px)]' : 'h-[calc(100vh-250px)] min-h-[660px]'
            }`}
          >
            <iframe
              ref={iframeRef}
              src="/viewer.html?embed=1"
              title="GRC Universal Viewer"
              className="h-full w-full border-0"
              onLoad={handleIframeLoad}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
            />
          </div>
        </div>
      )}

      {/* TAB 2: OBRIGAÇÕES REGULAMENTARES */}
      {mainTab === 'obligations' && (
        <div className="space-y-3">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-navy-800 dark:bg-navy-900">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Filtrar por Diploma:</span>
              <div className="flex flex-wrap gap-1">
                {['', 'DORA', 'NIS2', 'GDPR', 'AI Act', 'BNA', 'CRA', 'EBA'].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => {
                      setSelectedLaw(l);
                      setOblPage(0);
                    }}
                    className={`rounded-md px-2.5 py-1 text-2xs font-medium transition ${
                      selectedLaw === l
                        ? 'bg-teal-500 text-white font-bold shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-navy-800 dark:text-slate-300 dark:hover:bg-navy-700'
                    }`}
                  >
                    {l === '' ? 'Todas as Leis' : l}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-72">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por artigo, texto, sanção..."
                  value={oblSearch}
                  onChange={(e) => {
                    setOblSearch(e.target.value);
                    setOblPage(0);
                  }}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-7 text-xs dark:border-navy-700 dark:bg-navy-800 dark:text-white"
                />
                {oblSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setOblSearch('');
                      setOblPage(0);
                    }}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Limpar pesquisa"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {(selectedLaw || oblSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLaw('');
                    setOblSearch('');
                    setOblPage(0);
                  }}
                  className="btn-ghost text-2xs text-rose-600 hover:text-rose-700 flex items-center gap-0.5 px-2 py-1"
                >
                  <X className="h-3 w-3" /> Limpar
                </button>
              )}
            </div>
          </div>

          {/* Obligations Data Table */}
          <DataTable
            columns={obligationsColumns}
            rows={oblQuery.data?.rows ?? []}
            rowKey={(r) => String(r[colIndex('obligation_id')] || Math.random())}
            loading={oblQuery.isLoading}
            error={oblQuery.isError ? 'Erro ao carregar obrigações' : null}
            onRowClick={(r) => setSelectedObligation(r)}
            maxHeight="calc(100vh - 310px)"
          />

          {/* Pagination */}
          <div className="flex items-center justify-between px-2 text-xs text-slate-500">
            <div>
              A apresentar{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {oblQuery.data?.total ? oblPage * PAGE_SIZE + 1 : 0} - {Math.min((oblPage + 1) * PAGE_SIZE, oblQuery.data?.total || 0)}
              </span>{' '}
              de <span className="font-semibold text-slate-900 dark:text-white">{oblQuery.data?.total || 0}</span> obrigações
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-2xs text-slate-400 mr-1">
                Página {oblPage + 1} de {Math.max(1, Math.ceil((oblQuery.data?.total || 0) / PAGE_SIZE))}
              </span>
              <button
                type="button"
                className="btn-secondary py-1 text-xs"
                disabled={oblPage === 0}
                onClick={() => setOblPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Anterior
              </button>
              <button
                type="button"
                className="btn-secondary py-1 text-xs"
                disabled={(oblPage + 1) * PAGE_SIZE >= (oblQuery.data?.total || 0)}
                onClick={() => setOblPage((p) => p + 1)}
              >
                Seguinte <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GOOGLE DRIVE REPOSITORY */}
      {mainTab === 'drive' && (
        <div className="space-y-3">
          {/* Filters Bar */}
          <div className="flex flex-col gap-2.5 rounded-lg border border-slate-200 bg-white p-3 dark:border-navy-800 dark:bg-navy-900">
            {/* Top row: Search and Format selector */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 min-w-[260px] max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, norma, autor ou extensão nos 5.452 ficheiros..."
                  value={driveSearch}
                  onChange={(e) => {
                    setDriveSearch(e.target.value);
                    setDrivePage(0);
                  }}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-7 text-xs dark:border-navy-700 dark:bg-navy-800 dark:text-white"
                />
                {driveSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setDriveSearch('');
                      setDrivePage(0);
                    }}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Limpar pesquisa"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Formats chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400">Formato:</span>
                {[
                  { id: '', label: 'Todos' },
                  { id: 'pdf', label: 'PDFs' },
                  { id: 'document', label: 'Docs' },
                  { id: 'sheet', label: 'Excel/Sheets' },
                  { id: 'zip', label: 'ZIP/Pacotes' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => {
                      setSelectedFileType(fmt.id);
                      setDrivePage(0);
                    }}
                    className={`rounded-md px-2 py-1 text-2xs font-medium transition ${
                      selectedFileType === fmt.id
                        ? 'bg-sky-600 text-white font-bold shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-navy-800 dark:text-slate-300 dark:hover:bg-navy-700'
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>

              {(driveSearch || selectedCategory || selectedFileType) && (
                <button
                  type="button"
                  onClick={() => {
                    setDriveSearch('');
                    setSelectedCategory('');
                    setSelectedFileType('');
                    setDrivePage(0);
                  }}
                  className="btn-ghost text-2xs text-rose-600 hover:text-rose-700 flex items-center gap-1 px-2 py-1"
                >
                  <X className="h-3 w-3" /> Limpar Filtros
                </button>
              )}
            </div>

            {/* Bottom row: Categories */}
            <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2 dark:border-navy-800">
              <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Categoria:
              </span>
              <div className="flex flex-wrap gap-1">
                {[
                  { id: '', label: 'Todas as Categorias' },
                  { id: 'Persona (Prozorov)', label: 'Repositório CISO (4.2k)' },
                  { id: 'Regulator / official text', label: 'Textos Oficiais & Reguladores (377)' },
                  { id: 'Standards body publication', label: 'Normas & Publicações (375)' },
                  { id: 'Certification-body material', label: 'Certificações (240)' },
                  { id: 'Vendor / consultancy guide', label: 'Guias de Consultoria (206)' },
                  { id: 'User-authored', label: 'Minutas Internas (23)' },
                  { id: 'Training / course', label: 'Cursos & Formação (10)' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setDrivePage(0);
                    }}
                    className={`rounded-md px-2 py-0.5 text-2xs font-medium transition ${
                      selectedCategory === cat.id
                        ? 'bg-teal-600 text-white font-bold shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-navy-800 dark:text-slate-300 dark:hover:bg-navy-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Drive Data Table */}
          <DataTable
            columns={driveColumns}
            rows={driveQuery.data?.items ?? []}
            rowKey={(r) => String(r[0] || Math.random())}
            loading={driveQuery.isLoading}
            error={driveQuery.isError ? 'Erro ao carregar ficheiros Drive' : null}
            onRowClick={(r) => setSelectedDriveFile(r)}
            maxHeight="calc(100vh - 310px)"
          />

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-2 text-xs text-slate-500">
            <div>
              A apresentar{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {driveQuery.data?.total ? drivePage * PAGE_SIZE + 1 : 0} - {Math.min((drivePage + 1) * PAGE_SIZE, driveQuery.data?.total || 0)}
              </span>{' '}
              de <span className="font-semibold text-slate-900 dark:text-white">{driveQuery.data?.total || 0}</span> ficheiros
              {(selectedCategory || selectedFileType || driveSearch) && (
                <span className="ml-1 text-2xs text-teal-600 dark:text-teal-400 font-medium">(filtrado de 5.452)</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-2xs text-slate-400 mr-1">
                Página {drivePage + 1} de {Math.max(1, Math.ceil((driveQuery.data?.total || 0) / PAGE_SIZE))}
              </span>
              <button
                type="button"
                className="btn-secondary py-1 text-xs"
                disabled={drivePage === 0}
                onClick={() => setDrivePage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Anterior
              </button>
              <button
                type="button"
                className="btn-secondary py-1 text-xs"
                disabled={(drivePage + 1) * PAGE_SIZE >= (driveQuery.data?.total || 0)}
                onClick={() => setDrivePage((p) => p + 1)}
              >
                Seguinte <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CATÁLOGO DE 322 NORMAS */}
      {mainTab === 'frameworks' && (
        <div className="space-y-3">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-navy-800 dark:bg-navy-900">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Jurisdição:</span>
              <div className="flex flex-wrap gap-1">
                {['', 'Portugal', 'European Union', 'Angola', 'International', 'United States'].map((j) => (
                  <button
                    key={j}
                    type="button"
                    onClick={() => {
                      setSelectedJurisdiction(j);
                      setFwPage(0);
                    }}
                    className={`rounded-md px-2.5 py-1 text-2xs font-medium transition ${
                      selectedJurisdiction === j
                        ? 'bg-teal-500 text-white font-bold shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-navy-800 dark:text-slate-300 dark:hover:bg-navy-700'
                    }`}
                  >
                    {j === '' ? 'Todas as Jurisdições' : j}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-72">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar norma por código ou nome..."
                  value={fwSearch}
                  onChange={(e) => {
                    setFwSearch(e.target.value);
                    setFwPage(0);
                  }}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-7 text-xs dark:border-navy-700 dark:bg-navy-800 dark:text-white"
                />
                {fwSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setFwSearch('');
                      setFwPage(0);
                    }}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Limpar pesquisa"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {(selectedJurisdiction || fwSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedJurisdiction('');
                    setFwSearch('');
                    setFwPage(0);
                  }}
                  className="btn-ghost text-2xs text-rose-600 hover:text-rose-700 flex items-center gap-0.5 px-2 py-1"
                >
                  <X className="h-3 w-3" /> Limpar
                </button>
              )}
            </div>
          </div>

          {/* Frameworks Grid */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 310px)' }}>
            {frameworksQuery.data?.items.map((fw) => (
              <div
                key={fw.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-teal-500 hover:shadow-md dark:border-navy-800 dark:bg-navy-900"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded bg-teal-500/10 px-2 py-0.5 text-xs font-bold text-teal-700 dark:text-teal-300">
                      {fw.id}
                    </span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-2xs font-medium text-slate-600 dark:bg-navy-800 dark:text-slate-400">
                      {fw.jurisdiction}
                    </span>
                  </div>
                  <h3 className="mt-2 text-xs font-semibold text-slate-900 dark:text-white line-clamp-2" title={fw.name}>
                    {fw.name}
                  </h3>
                  <p className="mt-1 text-2xs text-slate-500 line-clamp-2">{fw.notes || 'Sem descrição adicional.'}</p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-navy-800 text-2xs">
                  <span className="text-slate-400">Emissor: {fw.issuer || 'N/A'}</span>
                  <button
                    onClick={() => jumpToFrameworkInViewer(fw.id)}
                    className="inline-flex items-center gap-1 font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400"
                  >
                    Explorar Estrutura →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-2 text-xs text-slate-500">
            <div>
              A apresentar{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {fwPage * PAGE_SIZE + 1} - {Math.min((fwPage + 1) * PAGE_SIZE, frameworksQuery.data?.total || 0)}
              </span>{' '}
              de <span className="font-semibold text-slate-900 dark:text-white">{frameworksQuery.data?.total || 0}</span> normas
            </div>
            <div className="flex items-center gap-1">
              <button
                className="btn-secondary py-1 text-xs"
                disabled={fwPage === 0}
                onClick={() => setFwPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Anterior
              </button>
              <button
                className="btn-secondary py-1 text-xs"
                disabled={(fwPage + 1) * PAGE_SIZE >= (frameworksQuery.data?.total || 0)}
                onClick={() => setFwPage((p) => p + 1)}
              >
                Seguinte <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: TIMELINES & CALENDAR */}
      {mainTab === 'timelines' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-navy-800 dark:bg-navy-900">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Clock className="h-5 w-5" />
                <h3 className="font-bold text-sm">DORA (Regulamento UE 2022/2554)</h3>
              </div>
              <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li>• <strong>4 Horas:</strong> Notificação inicial de incidente TIC grave após classificação.</li>
                <li>• <strong>24 Horas:</strong> Relatório intermédio atualizado com impacto e mitigação.</li>
                <li>• <strong>1 Mês:</strong> Relatório final completo com causa-raiz e custos estimados.</li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-navy-800 dark:bg-navy-900">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                <Clock className="h-5 w-5" />
                <h3 className="font-bold text-sm">NIS2 (Diretiva UE 2022/2555)</h3>
              </div>
              <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li>• <strong>24 Horas:</strong> Alerta precoce ao CSIRT nacional (suspeita de causa maliciosa).</li>
                <li>• <strong>72 Horas:</strong> Notificação formal com avaliação preliminar e indicadores de compromisso.</li>
                <li>• <strong>1 Mês:</strong> Relatório final detalhado com lições aprendidas e impacto.</li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-navy-800 dark:bg-navy-900">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Clock className="h-5 w-5" />
                <h3 className="font-bold text-sm">RGPD & BNA Angola</h3>
              </div>
              <ul className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <li>• <strong>72 Horas (RGPD):</strong> Notificação de violação de dados à autoridade de controlo (CNPD / APD).</li>
                <li>• <strong>24-48 Horas (BNA):</strong> Comunicação de incidentes operacionais graves de cibersegurança ao BNA.</li>
                <li>• <strong>Sem demora injustificada:</strong> Notificação aos titulares quando houver risco elevado.</li>
              </ul>
            </div>
          </div>

          {/* Render raw timelines & calendar content */}
          {timelinesQuery.data?.timelines && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-navy-800 dark:bg-navy-900 prose prose-slate dark:prose-invert max-w-none text-xs">
              <div dangerouslySetInnerHTML={{ __html: timelinesQuery.data.timelines }} />
              <hr className="my-4 border-slate-200 dark:border-navy-800" />
              <div dangerouslySetInnerHTML={{ __html: timelinesQuery.data.calendar }} />
            </div>
          )}
        </div>
      )}

      {/* DRAWER FOR OBLIGATION DETAILS */}
      <Drawer
        open={Boolean(selectedObligation)}
        onClose={() => setSelectedObligation(null)}
        title={
          selectedObligation ? (
            <div className="flex items-center gap-2">
              <span className="rounded bg-teal-500/10 px-2 py-0.5 text-xs font-bold text-teal-700 dark:text-teal-300">
                {String(selectedObligation[colIndex('obligation_id')] || '')}
              </span>
              <span>{String(selectedObligation[colIndex('article')] || '')}</span>
            </div>
          ) : (
            'Detalhes da Obrigação'
          )
        }
        subtitle={selectedObligation ? String(selectedObligation[colIndex('law')] || '') : ''}
        width="max-w-2xl"
      >
        {selectedObligation && (
          <div className="space-y-4 text-xs">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-2xs text-slate-400">
                Requisito Legal &amp; Obrigação
              </h4>
              <p className="mt-1.5 rounded-lg bg-slate-50 p-3 leading-relaxed text-slate-800 dark:bg-navy-950 dark:text-slate-200">
                {String(selectedObligation[colIndex('obligation')] || '')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 p-2.5 dark:border-navy-800">
                <span className="text-2xs font-semibold uppercase text-slate-400">Tópico Regulamentar</span>
                <div className="mt-1 font-medium text-slate-800 dark:text-slate-200">
                  {String(selectedObligation[colIndex('topic')] || 'N/A')}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 p-2.5 dark:border-navy-800">
                <span className="text-2xs font-semibold uppercase text-slate-400">Destinatário / Sujeito</span>
                <div className="mt-1 font-medium capitalize text-slate-800 dark:text-slate-200">
                  {String(selectedObligation[colIndex('addressee')] || 'N/A')}
                </div>
              </div>
            </div>

            {selectedObligation[colIndex('penalty_ref')] && (
              <div className="rounded-lg border border-amber-200 bg-amber-500/10 p-3 dark:border-amber-800/50">
                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold">
                  <ShieldAlert className="h-4 w-4" />
                  Quadro Sancionatório &amp; Penalidades
                </div>
                <div className="mt-1 text-slate-700 dark:text-slate-300">
                  {String(selectedObligation[colIndex('penalty_ref')])}
                </div>
              </div>
            )}

            {selectedObligation[colIndex('evidence_examples')] && (
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-2xs text-slate-400">
                  Evidências Práticas de Conformidade (Audit Ready)
                </h4>
                <div className="mt-1.5 rounded-lg bg-teal-500/5 border border-teal-500/20 p-3 text-slate-700 dark:text-slate-300">
                  {String(selectedObligation[colIndex('evidence_examples')])}
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
                    {String(selectedObligation[colIndex('mapping_iso27001')] || '—')}
                  </div>
                </div>
                <div>
                  <span className="text-2xs text-slate-500">NIST CSF 2.0:</span>
                  <div className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    {String(selectedObligation[colIndex('mapping_nist_csf')] || '—')}
                  </div>
                </div>
              </div>
            </div>

            {selectedObligation[colIndex('source')] && (
              <div>
                <span className="text-2xs text-slate-400 uppercase tracking-wider font-semibold">Fonte Oficial &amp; Referência</span>
                <p className="mt-1 truncate font-mono text-2xs text-slate-500">
                  {String(selectedObligation[colIndex('source')])}
                </p>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Drawer: Detalhes do Ficheiro Drive */}
      <Drawer
        open={!!selectedDriveFile}
        onClose={() => setSelectedDriveFile(null)}
        title={selectedDriveFile ? String(selectedDriveFile[0] || 'Ficheiro Google Drive') : ''}
        subtitle={
          selectedDriveFile
            ? `Formato: ${String(selectedDriveFile[5] || 'DOC').toUpperCase()} · Categoria: ${String(selectedDriveFile[2] || 'Geral')}`
            : undefined
        }
        width="max-w-xl"
      >
        {selectedDriveFile && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-2.5 rounded-lg bg-teal-500/10 p-3 text-teal-800 dark:text-teal-300">
              <FolderGit2 className="h-5 w-5 shrink-0 text-teal-600 dark:text-teal-400" />
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 dark:text-white truncate">{String(selectedDriveFile[0])}</div>
                <div className="text-2xs text-slate-500 dark:text-slate-400">
                  {selectedDriveFile[6] ? `Modificado: ${String(selectedDriveFile[6])}` : 'Repositório Central'}
                  {selectedDriveFile[8] ? ` · ${String(selectedDriveFile[8])}` : ''}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 p-3 dark:border-navy-800">
              <div>
                <span className="text-2xs font-semibold uppercase text-slate-400">Categoria</span>
                <p className="mt-0.5 font-medium text-slate-900 dark:text-white">{String(selectedDriveFile[2] || 'Geral')}</p>
              </div>
              <div>
                <span className="text-2xs font-semibold uppercase text-slate-400">Formato / Tipo</span>
                <p className="mt-0.5 font-mono uppercase text-slate-900 dark:text-white">{String(selectedDriveFile[5] || 'doc')}</p>
              </div>
              {selectedDriveFile[3] && (
                <div className="col-span-2">
                  <span className="text-2xs font-semibold uppercase text-slate-400">Norma / Tag Associada</span>
                  <p className="mt-0.5 font-medium text-slate-900 dark:text-white">{String(selectedDriveFile[3])}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href={String(selectedDriveFile[1] || '')}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex items-center justify-center gap-1.5 py-2 text-xs"
              >
                <ExternalLink className="h-4 w-4" />
                Abrir Documento no Google Drive
              </a>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => copyToClipboard(String(selectedDriveFile[1] || ''), 'drawer-drive')}
                  className="btn-secondary flex-1 py-1.5 text-xs flex items-center justify-center gap-1"
                >
                  {copiedLink === 'drawer-drive' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedLink === 'drawer-drive' ? 'Link Copiado!' : 'Copiar Link'}
                </button>
                {selectedDriveFile[3] && (
                  <button
                    type="button"
                    onClick={() => {
                      const fw = String(selectedDriveFile[3]);
                      setSelectedDriveFile(null);
                      setMainTab('obligations');
                      setOblSearch(fw);
                    }}
                    className="btn-secondary flex-1 py-1.5 text-xs flex items-center justify-center gap-1"
                  >
                    <Scale className="h-3.5 w-3.5 text-teal-600" />
                    Ver Obrigações
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
