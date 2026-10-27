import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Calendar,
  Compass,
  ExternalLink,
  FileSearch,
  FolderGit2,
  Layers,
  Maximize2,
  Minimize2,
  RefreshCw,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { PageHeader } from '../components/common';

export default function GrcLibraryViewerPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const meta = useQuery({
    queryKey: ['grc', 'meta'],
    queryFn: () => api.repository.grcMeta(),
  });

  // Keep theme in sync with the iframe
  const syncTheme = () => {
    try {
      const isDark = document.documentElement.classList.contains('dark');
      const iframeDoc = iframeRef.current?.contentDocument;
      if (iframeDoc) {
        iframeDoc.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      }
    } catch {
      // Ignore cross-origin issues if any
    }
  };

  useEffect(() => {
    const observer = new MutationObserver(() => syncTheme());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handleIframeLoad = () => {
    syncTheme();
    // Set initial view if needed
    switchView(activeTab);
  };

  const switchView = (viewId: string) => {
    setActiveTab(viewId);
    try {
      const iframeDoc = iframeRef.current?.contentDocument;
      if (iframeDoc) {
        const btn = iframeDoc.querySelector<HTMLButtonElement>(`button[data-v="${viewId}"]`);
        if (btn) {
          btn.click();
        }
      }
    } catch {
      // Fallback
      if (iframeRef.current) {
        iframeRef.current.src = `/viewer.html#${viewId}`;
      }
    }
  };

  const reloadViewer = () => {
    if (iframeRef.current) {
      iframeRef.current.src = '/viewer.html';
    }
  };

  const m = meta.data ?? {
    frameworks_count: 322,
    obligations_count: 1484,
    drive_count: 5452,
    crosswalks_pairs_count: 28757,
  };

  return (
    <div className={`space-y-2.5 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-900/90 p-4 backdrop-blur-md' : ''}`}>
      <PageHeader
        title="Biblioteca GRC & Repositório Universal"
        subtitle="Visualizador universal integrado e catálogo unificado de 302 normas, 1.484 obrigações legais, 5.452 ficheiros do Google Drive e 28.757 crosswalks."
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              className="btn-secondary text-xs"
              onClick={reloadViewer}
              title="Recarregar o visualizador GRC"
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
              Abrir Noutra Janela
            </a>
          </div>
        }
      />

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-navy-800 dark:bg-navy-900">
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

        <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-navy-800 dark:bg-navy-900">
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

        <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-navy-800 dark:bg-navy-900">
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

        <div className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-navy-800 dark:bg-navy-900">
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

      {/* Quick View Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2 text-xs dark:border-navy-800 dark:bg-navy-900">
        <span className="mr-1 text-2xs font-semibold uppercase tracking-wider text-slate-400">Vistas Rápidas:</span>
        {[
          { id: 'overview', label: 'Visão Geral', icon: Compass },
          { id: 'library', label: '302 Normas', icon: BookOpen },
          { id: 'search', label: 'Pesquisa Global', icon: FileSearch },
          { id: 'obligations', label: '1.484 Obrigações', icon: Scale },
          { id: 'crosswalks', label: 'Crosswalks ISO/NIST/DORA', icon: Layers },
          { id: 'reporting', label: 'Calendário & Prazos', icon: Calendar },
          { id: 'drive', label: 'Google Drive (5.4k Docs)', icon: FolderGit2 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => switchView(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-2xs font-medium transition-all ${
                isActive
                  ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 font-bold'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-navy-800'
              }`}
            >
              <Icon className="h-3 w-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Embedded Iframe Container */}
      <div
        className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-navy-800 dark:bg-navy-950 ${
          isFullscreen ? 'h-[calc(100vh-140px)]' : 'h-[calc(100vh-215px)] min-h-[640px]'
        }`}
      >
        <iframe
          ref={iframeRef}
          src="/viewer.html"
          title="GRC Library Universal Viewer"
          className="h-full w-full border-0"
          onLoad={handleIframeLoad}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
        />
      </div>
    </div>
  );
}
