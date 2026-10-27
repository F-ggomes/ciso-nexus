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
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import DataTable, { Column } from '../components/DataTable';
import Drawer from '../components/Drawer';
import { PageHeader } from '../components/common';

type MainTab = 'viewer' | 'obligations' | 'drive' | 'frameworks' | 'timelines';

export default function GrcLibraryViewerPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mainTab, setMainTab] = useState<MainTab>('viewer');
  const [viewerSubView, setViewerSubView] = useState('overview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewerSearch, setViewerSearch] = useState('');

  // Obligations state
  const [selectedLaw, setSelectedLaw] = useState('');
  const [oblSearch, setOblSearch] = useState('');
  const [oblPage, setOblPage] = useState(0);
  const [selectedObligation, setSelectedObligation] = useState<(string | number | null)[] | null>(null);

  // Drive state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [driveSearch, setDriveSearch] = useState('');
  const [drivePage, setDrivePage] = useState(0);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Frameworks state
  const [selectedJurisdiction, setSelectedJurisdiction] = useState('');
  const [fwSearch, setFwSearch] = useState('');
  const [fwPage, setFwPage] = useState(0);

  const PAGE_SIZE = 25;

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

  // Drive query
  const driveQuery = useQuery({
    queryKey: ['grc', 'drive', driveSearch, selectedCategory, drivePage],
    queryFn: () =>
      api.repository.grcDrive({
        q: driveSearch || undefined,
        category: selectedCategory || undefined,
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
        return (
          <div className="flex items-center gap-2">
            <div className="rounded p-1 bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300">
              {ext === 'pdf' ? (
                <FileText className="h-4 w-4 text-red-500" />
              ) : ext === 'xlsx' || ext === 'xls' || ext === 'csv' ? (
                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              ) : ext === 'docx' || ext === 'doc' ? (
                <FileCheck className="h-4 w-4 text-blue-500" />
              ) : (
                <FolderGit2 className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium text-slate-900 dark:text-white" title={name}>
                {name}
              </div>
              <div className="text-2xs text-slate-500">{String(r[6] || '')}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'category',
      header: 'Categoria',
      width: '180px',
      render: (r) => (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-medium text-slate-700 dark:bg-navy-800 dark:text-slate-300">
          {String(r[2] || 'Geral')}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Formato',
      width: '90px',
      render: (r) => <span className="uppercase text-2xs font-mono text-slate-500">{String(r[5] || 'DOC')}</span>,
    },
    {
      key: 'action',
      header: 'Acesso Google Drive',
      width: '190px',
      className: 'text-right',
      render: (r) => {
        const url = String(r[1] || '');
        const id = String(r[0] || '');
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => copyToClipboard(url, id)}
              className="btn-ghost p-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
              title="Copiar Link do Google Drive"
            >
              {copiedLink === id ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
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
                    onClick={() => {
                      setSelectedLaw(l);
                      setOblPage(0);
                    }}
                    className={`rounded-md px-2.5 py-1 text-2xs font-medium transition ${
                      selectedLaw === l
                        ? 'bg-teal-500 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-navy-800 dark:text-slate-300 dark:hover:bg-navy-700'
                    }`}
                  >
                    {l === '' ? 'Todas as Leis' : l}
                  </button>
                ))}
              </div>
            </div>

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
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs dark:border-navy-700 dark:bg-navy-800 dark:text-white"
              />
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
                {oblPage * PAGE_SIZE + 1} - {Math.min((oblPage + 1) * PAGE_SIZE, oblQuery.data?.total || 0)}
              </span>{' '}
              de <span className="font-semibold text-slate-900 dark:text-white">{oblQuery.data?.total || 0}</span> obrigações
            </div>
            <div className="flex items-center gap-1">
              <button
                className="btn-secondary py-1 text-xs"
                disabled={oblPage === 0}
                onClick={() => setOblPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Anterior
              </button>
              <button
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
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-navy-800 dark:bg-navy-900">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Filtrar Categoria:</span>
              <div className="flex flex-wrap gap-1">
                {['', 'Policy', 'Procedure', 'Manual', 'Audit', 'Training'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setDrivePage(0);
                    }}
                    className={`rounded-md px-2.5 py-1 text-2xs font-medium transition ${
                      selectedCategory === cat
                        ? 'bg-sky-500 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-navy-800 dark:text-slate-300 dark:hover:bg-navy-700'
                    }`}
                  >
                    {cat === '' ? 'Todos os Ficheiros' : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar nos 5.452 ficheiros Drive..."
                value={driveSearch}
                onChange={(e) => {
                  setDriveSearch(e.target.value);
                  setDrivePage(0);
                }}
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs dark:border-navy-700 dark:bg-navy-800 dark:text-white"
              />
            </div>
          </div>

          {/* Drive Data Table */}
          <DataTable
            columns={driveColumns}
            rows={driveQuery.data?.items ?? []}
            rowKey={(r) => String(r[0] || Math.random())}
            loading={driveQuery.isLoading}
            error={driveQuery.isError ? 'Erro ao carregar ficheiros Drive' : null}
            maxHeight="calc(100vh - 310px)"
          />

          {/* Pagination */}
          <div className="flex items-center justify-between px-2 text-xs text-slate-500">
            <div>
              A apresentar{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {drivePage * PAGE_SIZE + 1} - {Math.min((drivePage + 1) * PAGE_SIZE, driveQuery.data?.total || 0)}
              </span>{' '}
              de <span className="font-semibold text-slate-900 dark:text-white">{driveQuery.data?.total || 0}</span> ficheiros
            </div>
            <div className="flex items-center gap-1">
              <button
                className="btn-secondary py-1 text-xs"
                disabled={drivePage === 0}
                onClick={() => setDrivePage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Anterior
              </button>
              <button
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
                    onClick={() => {
                      setSelectedJurisdiction(j);
                      setFwPage(0);
                    }}
                    className={`rounded-md px-2.5 py-1 text-2xs font-medium transition ${
                      selectedJurisdiction === j
                        ? 'bg-teal-500 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-navy-800 dark:text-slate-300 dark:hover:bg-navy-700'
                    }`}
                  >
                    {j === '' ? 'Todas as Jurisdições' : j}
                  </button>
                ))}
              </div>
            </div>

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
                className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs dark:border-navy-700 dark:bg-navy-800 dark:text-white"
              />
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
    </div>
  );
}
