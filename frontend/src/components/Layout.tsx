import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Bot,
  Boxes,
  Building2,
  Bug,
  ChevronDown,
  Compass,
  FileBarChart,
  FileCheck2,
  FileSignature,
  Globe,
  GraduationCap,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  RotateCcw,
  ScrollText,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api, clearAuth, getOrg, getRole, setOrg, setRole } from '../api/client';
import { useI18n, type I18nKey, type Lang } from '../i18n';
import CommandPalette from './CommandPalette';
import { fmtDate } from './common';

interface NavCounts {
  activeClocks: number;
  criticalRisks: number;
  openIncidents: number;
  criticalVulns: number;
  expiringContracts: number;
}

type BadgeVariant = 'rose' | 'amber' | 'teal' | 'neutral' | 'accent';

export interface SubItem {
  to: string;
  label: string;
  badge?: string;
}

export type NavItem = {
  to: string;
  key: I18nKey;
  icon: typeof LayoutDashboard;
  badge?: (counts: NavCounts) => { text: string; variant: BadgeVariant } | null;
  subItems?: SubItem[];
  allowedRoles?: ('ciso' | 'admin' | 'auditor' | 'lead' | 'staff')[];
};

const groups: { key: I18nKey; items: NavItem[] }[] = [
  {
    key: 'nav.group.command',
    items: [
      {
        to: '/',
        key: 'nav.overview',
        icon: LayoutDashboard,
        allowedRoles: ['ciso', 'admin'],
        badge: (c) =>
          c.activeClocks > 0
            ? { text: `${c.activeClocks} Prazos`, variant: 'rose' }
            : { text: 'Torre CISO', variant: 'teal' },
      },
      {
        to: '/repository',
        key: 'nav.repository',
        icon: BookOpen,
        allowedRoles: ['ciso', 'admin', 'auditor'],
        badge: () => ({ text: '322 Normas', variant: 'teal' }),
        subItems: [
          { to: '/repository?j=PT', label: '🇵🇹 Portugal (DL 125/2025, CNCS, BdP)', badge: '4' },
          { to: '/repository?j=EU', label: '🇪🇺 União Europeia (DORA, NIS2, RGPD)', badge: '6' },
          { to: '/repository?j=AO', label: '🇦🇴 Angola (Lei 22/11, BNA Avisos)', badge: '3' },
          { to: '/repository?j=INTL', label: '🌐 Internacional (ISO 27001, 22301)', badge: '8' },
          { to: '/repository?j=US', label: '🇺🇸 Estados Unidos (NIST CSF 2.0)', badge: '3' },
        ],
      },
      {
        to: '/grc-library',
        key: 'nav.grc_library',
        icon: Compass,
        allowedRoles: ['ciso', 'admin', 'auditor', 'lead'],
        badge: () => ({ text: 'Viewer', variant: 'teal' }),
        subItems: [
          { to: '/grc-library', label: '🧭 Visualizador GRC Integrado', badge: '302' },
          { to: '/grc-library', label: '⚖️ 1.484 Obrigações Regulamentares', badge: '1.4k' },
          { to: '/grc-library', label: '🔗 28.757 Crosswalks ISO / NIST / DORA', badge: '28k' },
          { to: '/grc-library', label: '📁 5.452 Documentos Google Drive', badge: '5.4k' },
          { to: '/viewer.html', label: '↗️ Abrir Viewer em Nova Janela' },
        ],
      },
      {
        to: '/compliance',
        key: 'nav.compliance_matrix',
        icon: ShieldCheck,
        allowedRoles: ['ciso', 'admin', 'auditor', 'lead'],
        badge: () => ({ text: 'Gap Analysis', variant: 'teal' }),
        subItems: [
          { to: '/compliance', label: '📊 Cobertura Global de Conformidade' },
          { to: '/compliance?reg=DORA', label: '🏦 Conformidade DORA (Banca & TIC)' },
          { to: '/compliance?reg=NIS2', label: '🛡️ Conformidade NIS2 / DL 125/2025' },
          { to: '/compliance?reg=RGPD', label: '🔒 Proteção de Dados RGPD' },
          { to: '/compliance?reg=BNA', label: '🇦🇴 Conformidade BNA Angola' },
        ],
      },
      {
        to: '/policies',
        key: 'nav.policies',
        icon: FileSignature,
        allowedRoles: ['ciso', 'admin', 'auditor', 'lead'],
        badge: () => ({ text: '60 Modelos', variant: 'neutral' }),
        subItems: [
          { to: '/policies?tab=templates', label: '📜 Biblioteca de Modelos (60)', badge: '60' },
          { to: '/policies?tab=templates&filter=fintech', label: '🏦 FinTech & Banca (DORA/PCI)', badge: '12' },
          { to: '/policies?tab=templates&filter=software', label: '💻 Software & Cloud (ISO/SDLC)', badge: '14' },
          { to: '/policies?tab=documents', label: '📑 Políticas em Vigor da Empresa', badge: '330' },
        ],
      },
    ],
  },
  {
    key: 'nav.group.realtime',
    items: [
      {
        to: '/risks',
        key: 'nav.risks',
        icon: ShieldAlert,
        allowedRoles: ['ciso', 'admin', 'lead'],
        badge: (c) =>
          c.criticalRisks > 0
            ? { text: `${c.criticalRisks} Críticos`, variant: 'rose' }
            : null,
        subItems: [
          { to: '/risks', label: '📊 Matriz 5x5 Probabilidade/Impacto' },
          { to: '/risks?critical=1', label: '⚠️ Riscos Críticos & Elevados' },
        ],
      },
      {
        to: '/incidents',
        key: 'nav.incidents',
        icon: AlertTriangle,
        allowedRoles: ['ciso', 'admin', 'lead'],
        badge: (c) =>
          c.openIncidents > 0
            ? { text: `${c.openIncidents} Ativos`, variant: 'rose' }
            : null,
        subItems: [
          { to: '/incidents', label: '🚨 Registo de Incidentes Ativos' },
          { to: '/incidents?dora=1', label: '⏱️ Prazos Regulatórios DORA (4h/24h)' },
        ],
      },
      {
        to: '/vulnerabilities',
        key: 'nav.vulnerabilities',
        icon: Bug,
        allowedRoles: ['ciso', 'admin', 'lead', 'staff'],
        badge: (c) =>
          c.criticalVulns > 0
            ? { text: `${c.criticalVulns} KEV`, variant: 'amber' }
            : { text: 'Wazuh/EDR', variant: 'neutral' },
        subItems: [
          { to: '/vulnerabilities', label: '🐛 Telemetria Wazuh & SIEM' },
          { to: '/vulnerabilities?kev=1', label: '🎯 CVEs Conhecidas (CISA KEV)' },
        ],
      },
    ],
  },
  {
    key: 'nav.group.governance',
    items: [
      {
        to: '/easm',
        key: 'nav.easm',
        icon: Globe,
        allowedRoles: ['ciso', 'admin', 'lead'],
        badge: () => ({ text: 'EASM', variant: 'teal' }),
      },
      {
        to: '/vendors',
        key: 'nav.vendors',
        icon: Building2,
        allowedRoles: ['ciso', 'admin', 'lead'],
        badge: (c) =>
          c.expiringContracts > 0
            ? { text: `${c.expiringContracts} Expirar`, variant: 'rose' }
            : { text: 'DORA', variant: 'neutral' },
        subItems: [
          { to: '/vendors', label: '🏢 Registo de Informação TIC DORA' },
          { to: '/vendors?tier=1', label: '🚨 Fornecedores Críticos (Tier 1)' },
          { to: '/vendors?expiring=1', label: '⏳ Contratos a Expirar' },
        ],
      },
      { to: '/isms', key: 'nav.isms', icon: ShieldCheck, allowedRoles: ['ciso', 'admin', 'auditor', 'lead'] },
      { to: '/assets', key: 'nav.assets', icon: Boxes, allowedRoles: ['ciso', 'admin', 'lead', 'staff'] },
      { to: '/tasks', key: 'nav.tasks', icon: KanbanSquare, allowedRoles: ['ciso', 'admin', 'lead', 'staff'] },
      { to: '/evidence', key: 'nav.evidence', icon: FileCheck2, allowedRoles: ['ciso', 'admin', 'auditor', 'lead', 'staff'] },
      { to: '/reports', key: 'nav.reports', icon: FileBarChart, allowedRoles: ['ciso', 'admin', 'auditor'] },
    ],
  },
  {
    key: 'nav.group.ai',
    items: [
      {
        to: '/copilot',
        key: 'nav.copilot',
        icon: Bot,
        allowedRoles: ['ciso', 'admin'],
        badge: () => ({ text: 'FastMCP', variant: 'accent' }),
      },
      { to: '/skills', key: 'nav.skills', icon: GraduationCap, allowedRoles: ['ciso', 'admin'] },
      { to: '/audit', key: 'nav.audit', icon: ScrollText, allowedRoles: ['ciso', 'admin', 'auditor'] },
    ],
  },
  {
    key: 'nav.group.platform',
    items: [
      { to: '/connectors', key: 'nav.connectors', icon: Plug, allowedRoles: ['ciso', 'admin'] },
    ],
  },
];

function OrgSwitcher() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['auth', 'me'], queryFn: api.auth.me, staleTime: 5 * 60_000 });
  const [org, setOrgState] = useState<string | null>(getOrg());

  useEffect(() => {
    const orgs = me.data?.organizations ?? [];
    if (orgs.length === 0) return;
    const current = getOrg();
    if (current === 'all') {
      setOrgState('all');
      return;
    }
    if (!current || !orgs.some((o) => o.id === current)) {
      setOrg(orgs[0].id);
      setOrgState(orgs[0].id);
    }
  }, [me.data]);

  const change = (id: string) => {
    setOrg(id);
    setOrgState(id);
    qc.invalidateQueries();
  };

  const orgs = me.data?.organizations ?? [];
  const isCiso = me.data?.role === 'ciso' || !me.data?.org_ids || me.data.org_ids.length === 0;
  const selected = org === 'all' ? null : orgs.find((o) => o.id === org);

  const getOrgLabel = (o: { name: string; kind: string; country: string }) => {
    if (o.kind === 'operator') return `🏢 [A Nossa Empresa] — ${o.name} (Operador)`;
    if (o.name.toLowerCase().includes('banco') || o.name.toLowerCase().includes('fintech'))
      return `🏦 [Cliente ${o.name}] — Fintech & DORA (${o.country})`;
    if (o.name.toLowerCase().includes('health') || o.name.toLowerCase().includes('saúde'))
      return `🏥 [Cliente ${o.name}] — Infraestrutura NIS2 (${o.country})`;
    if (o.country === 'AO' || o.name.toLowerCase().includes('luanda') || o.name.toLowerCase().includes('angola'))
      return `🇦🇴 [Cliente ${o.name}] — Entidade BNA (${o.country})`;
    return `🛒 [Cliente ${o.name}] — Software & CRA (${o.country})`;
  };

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="hidden font-semibold text-slate-500 dark:text-slate-400 sm:inline">
        {t('top.organization')}:
      </span>
      <select
        className="input w-auto py-1 text-xs font-medium cursor-pointer"
        value={org ?? ''}
        onChange={(e) => change(e.target.value)}
        disabled={orgs.length === 0}
      >
        {isCiso && <option value="all">🌐 Visão Consolidada CISOaaS (Todos os Clientes)</option>}
        {orgs.length === 0 && <option value="">—</option>}
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {getOrgLabel(o)}
          </option>
        ))}
      </select>
      {org === 'all' ? (
        <span className="badge-teal hidden md:inline font-mono font-bold">Consolidado CISOaaS</span>
      ) : selected?.kind === 'operator' ? (
        <span className="badge-pass hidden md:inline font-mono font-bold">Operador Principal</span>
      ) : selected ? (
        <span className="badge-neutral hidden md:inline font-mono font-medium">
          Cliente {selected.country}
        </span>
      ) : null}
    </div>
  );
}

const ROLE_OPTIONS = [
  { id: 'ciso', label: '👑 CISO Executivo', desc: 'Acesso total a todos os inquilinos e módulos' },
  { id: 'auditor', label: '🔍 Auditor Externo', desc: 'Apenas leitura: Normas, SGSI, Evidências e Dossiês' },
  { id: 'lead', label: '🏢 Gestor do Cliente', desc: 'Operações de risco, incidentes e fornecedores da organização' },
  { id: 'staff', label: '💻 Técnico / Dev', desc: 'Gestão de tarefas, vulnerabilidades KEV e ativos' },
];

function RoleSelector({ currentRole, onChange }: { currentRole: string; onChange: (r: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeOption = ROLE_OPTIONS.find((r) => r.id === currentRole) || ROLE_OPTIONS[0];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-900 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-200 hover:border-teal-500/50 transition-colors"
      >
        <UserCheck className="h-3 w-3 text-teal-500" />
        <span className="font-semibold text-2xs">{activeOption.label}</span>
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-64 rounded-xl border border-slate-700 bg-[#0c1322] p-1.5 shadow-2xl text-slate-200">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Alternar Perfil RBAC
          </div>
          <div className="space-y-0.5">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                }}
                className={`w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition-all flex flex-col ${
                  opt.id === currentRole
                    ? 'bg-teal-500/20 text-white border-l-2 border-teal-400'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <span className="font-semibold">{opt.label}</span>
                <span className="text-[10px] text-slate-400 leading-tight mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationsBell() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const notifications = useQuery({ queryKey: ['notifications', 'unread'], queryFn: () => api.notifications.list(true), refetchInterval: 60_000 });
  const markRead = useMutation({ mutationFn: (id: string) => api.notifications.read(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) });
  const run = useMutation({ mutationFn: api.notifications.run, onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const items = notifications.data ?? [];
  return (
    <div className="relative" ref={ref}>
      <button className="btn-ghost relative p-1" onClick={() => setOpen((o) => !o)} aria-label={t('top.notifications')}>
        <Bell className="h-4 w-4" />
        {items.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{items.length}</span>
        )}
      </button>
      {open && (
        <div className="card absolute right-0 z-50 mt-1 w-80 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-navy-800">
            <span className="text-xs font-semibold">{t('top.notifications')}</span>
            <button className="btn-ghost py-0.5 text-2xs" onClick={() => run.mutate()} disabled={run.isPending}>
              {run.isPending ? '…' : t('top.runNotifications')}
            </button>
          </div>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto dark:divide-navy-800">
            {items.length === 0 && <li className="px-3 py-4 text-center text-xs text-slate-500">{t('top.noNotifications')}</li>}
            {items.map((n) => (
              <li key={n.id} className="px-3 py-2 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="badge-neutral">{n.kind}</span>
                      <span className="truncate font-medium">{n.title}</span>
                    </div>
                    {n.body && <p className="mt-0.5 text-slate-600 dark:text-slate-300">{n.body}</p>}
                    <div className="mt-0.5 text-2xs text-slate-400">
                      {fmtDate(n.created_at)}
                      {n.related_kind && ` · ${n.related_kind} ${n.related_id ?? ''}`}
                    </div>
                  </div>
                  <button className="btn-ghost shrink-0 py-0.5 text-2xs" onClick={() => markRead.mutate(n.id)}>
                    {t('top.markRead')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeRole, setActiveRole] = useState<string>(() => (getRole() ?? 'ciso').toLowerCase());
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ciso_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [commandOpen, setCommandOpen] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (location.pathname.startsWith('/repository')) initial['/repository'] = true;
    if (location.pathname.startsWith('/policies')) initial['/policies'] = true;
    if (location.pathname.startsWith('/vendors')) initial['/vendors'] = true;
    if (location.pathname.startsWith('/risks')) initial['/risks'] = true;
    if (location.pathname.startsWith('/incidents')) initial['/incidents'] = true;
    if (location.pathname.startsWith('/vulnerabilities')) initial['/vulnerabilities'] = true;
    return initial;
  });

  useEffect(() => {
    const handleAuth = () => {
      setActiveRole((getRole() ?? 'ciso').toLowerCase());
    };
    window.addEventListener('nexus-auth', handleAuth);
    return () => window.removeEventListener('nexus-auth', handleAuth);
  }, []);

  // Global keydown for Command Palette (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ciso_sidebar_collapsed', String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const handleRoleChange = (newRole: string) => {
    setActiveRole(newRole);
    setRole(newRole);
  };

  const toggleSubmenu = (to: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenSubmenus((prev) => ({ ...prev, [to]: !prev[to] }));
  };

  const cisoSummary = useQuery({
    queryKey: ['dashboard', 'cisoServiceSummary'],
    queryFn: api.dashboard.cisoServiceSummary,
    refetchInterval: 30_000,
  });

  const counts: NavCounts = {
    activeClocks: cisoSummary.data?.active_clocks?.length ?? 0,
    criticalRisks: cisoSummary.data?.totals?.critical_risks ?? 0,
    openIncidents: cisoSummary.data?.totals?.open_incidents ?? 0,
    criticalVulns: cisoSummary.data?.totals?.critical_vulnerabilities ?? 0,
    expiringContracts: cisoSummary.data?.totals?.expiring_contracts ?? 0,
  };

  const logout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  // Filter groups and items based on active role RBAC
  const filteredGroups = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
        if (activeRole === 'ciso' || activeRole === 'admin') return true;
        return item.allowedRoles.includes(activeRole as any);
      }),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="flex h-full min-h-screen">
      {/* Command Palette */}
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />

      {/* Sidebar */}
      <aside
        className={`flex shrink-0 flex-col border-r border-slate-800 bg-[#090f1d] text-slate-300 transition-all duration-300 ease-in-out ${
          collapsed ? 'w-[72px]' : 'w-[315px]'
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-3.5 bg-navy-950/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 text-white shadow-[0_0_20px_rgba(20,184,166,0.35)] shrink-0">
              <Shield className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-bold tracking-tight text-white text-sm">
                  <span>CISO NEXUS</span>
                  <span className="rounded bg-teal-500/20 px-1.5 py-0.5 text-[9px] font-bold text-teal-300 border border-teal-500/30">
                    v4.2
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">AI GRC &amp; Multi-Tenant Engine</div>
              </div>
            )}
          </div>

          <button
            onClick={toggleCollapse}
            title={collapsed ? t('nav.expand') : t('nav.collapse')}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4 text-teal-400" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* Quick Search Button (Command Palette trigger) */}
        <div className="px-3 pt-2.5 pb-1">
          {collapsed ? (
            <button
              onClick={() => setCommandOpen(true)}
              title="Pesquisar (⌘K)"
              className="flex h-9 w-full items-center justify-center rounded-xl border border-slate-800/80 bg-slate-900/60 text-slate-400 hover:border-teal-500/40 hover:text-teal-300 transition-all"
            >
              <Search className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => setCommandOpen(true)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400 hover:border-teal-500/40 hover:text-white transition-all group shadow-inner"
            >
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-slate-500 group-hover:text-teal-400 transition-colors" />
                <span className="text-[11.5px]">{t('nav.search')}</span>
              </div>
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-slate-400 border border-slate-700">
                ⌘K
              </kbd>
            </button>
          )}
        </div>

        {/* RBAC Role Indicator Alert if non-ciso */}
        {!collapsed && activeRole !== 'ciso' && activeRole !== 'admin' && (
          <div className="mx-3 mt-1.5 flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-[11px] text-amber-300">
            <span className="truncate">Modo RBAC: {ROLE_OPTIONS.find((r) => r.id === activeRole)?.label}</span>
            <button
              onClick={() => handleRoleChange('ciso')}
              title="Restaurar modo CISO Executivo"
              className="ml-1 p-0.5 text-amber-400 hover:text-white"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-2 space-y-3">
          {filteredGroups.map((g, gi) => (
            <div key={gi}>
              {!collapsed ? (
                <div className="px-2.5 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400/90 flex items-center justify-between">
                  <span>{t(g.key)}</span>
                </div>
              ) : (
                <div className="my-2 border-t border-slate-800/80" />
              )}

              <div className="space-y-0.5">
                {g.items.map(({ to, key, icon: Icon, badge, subItems }) => {
                  const b = badge ? badge(counts) : null;
                  const hasSubmenu = Boolean(subItems && subItems.length > 0);
                  const isSubOpen = Boolean(openSubmenus[to]);

                  if (collapsed) {
                    // Collapsed mode: Centered icon with flyout popover
                    return (
                      <div key={to} className="group relative">
                        <NavLink
                          to={to}
                          end={to === '/'}
                          className={({ isActive }) =>
                            `flex h-10 w-full items-center justify-center rounded-xl transition-all ${
                              isActive
                                ? 'bg-gradient-to-r from-teal-500/25 to-blue-500/15 text-teal-300 font-bold border-l-2 border-teal-400 shadow-[0_0_12px_rgba(20,184,166,0.2)]'
                                : 'text-slate-400 hover:bg-slate-800/70 hover:text-white'
                            }`
                          }
                        >
                          <div className="relative flex items-center justify-center">
                            <Icon className="h-5 w-5" />
                            {b && (
                              <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-teal-400 ring-2 ring-[#090f1d]" />
                            )}
                          </div>
                        </NavLink>

                        {/* Flyout popover on hover */}
                        <div className="invisible group-hover:visible absolute left-full top-0 ml-2 z-50 w-60 rounded-xl border border-slate-700 bg-[#0c1322] p-2.5 shadow-2xl text-slate-200">
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5 mb-1.5">
                            <div className="flex items-center gap-2 font-semibold text-xs text-white">
                              <Icon className="h-3.5 w-3.5 text-teal-400" />
                              <span>{t(key)}</span>
                            </div>
                            {b && (
                              <span className="rounded-full bg-teal-500/20 border border-teal-500/30 px-1.5 py-0.2 text-[9px] font-bold text-teal-300">
                                {b.text}
                              </span>
                            )}
                          </div>
                          {hasSubmenu && (
                            <div className="space-y-1">
                              {subItems!.map((sub) => (
                                <NavLink
                                  key={sub.to}
                                  to={sub.to}
                                  className="flex items-center justify-between rounded-lg px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                                >
                                  <span className="truncate">{sub.label}</span>
                                  {sub.badge && (
                                    <span className="rounded bg-slate-800 px-1 py-0.5 text-[9px] text-slate-400">
                                      {sub.badge}
                                    </span>
                                  )}
                                </NavLink>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Expanded mode: Full item with accordion submenu
                  return (
                    <div key={to} className="space-y-0.5">
                      <div className="flex items-center">
                        <NavLink
                          to={to}
                          end={to === '/'}
                          className={({ isActive }) =>
                            `group flex flex-1 items-center justify-between gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                              isActive
                                ? 'bg-gradient-to-r from-teal-500/20 via-teal-500/5 to-transparent text-white font-semibold shadow-[inset_3px_0_0_0_#14b8a6]'
                                : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                            }`
                          }
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <Icon className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-teal-300 transition-colors" />
                            <span className="truncate text-[12px]">{t(key)}</span>
                          </div>
                          {b && (
                            <span
                              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold ${
                                b.variant === 'rose'
                                  ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40 animate-pulse'
                                  : b.variant === 'amber'
                                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                                    : b.variant === 'teal'
                                      ? 'bg-teal-500/25 text-teal-300 border border-teal-500/40'
                                      : b.variant === 'accent'
                                        ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/40'
                                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {b.text}
                            </span>
                          )}
                        </NavLink>

                        {hasSubmenu && (
                          <button
                            onClick={(e) => toggleSubmenu(to, e)}
                            title={isSubOpen ? 'Recolher submenu' : 'Expandir submenu'}
                            className="p-1.5 text-slate-400 hover:text-teal-300 transition-colors"
                          >
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform duration-200 ${
                                isSubOpen ? 'rotate-180 text-teal-400' : ''
                              }`}
                            />
                          </button>
                        )}
                      </div>

                      {/* Submenu items */}
                      {hasSubmenu && isSubOpen && (
                        <div className="ml-5 my-1 space-y-0.5 border-l border-slate-800/80 pl-2.5 animate-in slide-in-from-top-1 duration-150">
                          {subItems!.map((sub) => {
                            const isCurrentSub = location.pathname + location.search === sub.to;
                            return (
                              <NavLink
                                key={sub.to}
                                to={sub.to}
                                className={`flex items-center justify-between rounded-md px-2 py-1 text-[11px] transition-colors ${
                                  isCurrentSub
                                    ? 'bg-teal-500/15 text-teal-300 font-semibold'
                                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                }`}
                              >
                                <span className="truncate">{sub.label}</span>
                                {sub.badge && (
                                  <span className="rounded bg-slate-800/80 px-1 py-0.5 text-[9px] text-slate-400 border border-slate-700">
                                    {sub.badge}
                                  </span>
                                )}
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-800 p-2.5 space-y-2 bg-navy-950/60">
          {!collapsed ? (
            <>
              <div className="flex items-center justify-between rounded-lg bg-navy-900/90 px-2.5 py-1.5 text-[11px] border border-emerald-900/40 text-slate-300">
                <span className="flex items-center gap-2 text-emerald-400 font-medium">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  VPN Tailscale
                </span>
                <span className="font-mono text-2xs text-slate-400">100.85.12.34</span>
              </div>
              <div className="text-[10px] text-slate-500 text-center font-mono">
                Apple M1 Pro · Metal GPU · Zero-Trust
              </div>
              <button
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                onClick={logout}
              >
                <LogOut className="h-3.5 w-3.5 text-rose-400" />
                {t('nav.logout')}
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div title="VPN Tailscale Conectada (100.85.12.34)" className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-navy-900 border border-emerald-900/50">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <button
                title={t('nav.logout')}
                onClick={logout}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 dark:border-navy-800 dark:bg-navy-900">
          <div className="flex items-center gap-3 text-xs">
            <span className="rounded-sm bg-navy-100 px-2 py-0.5 font-semibold text-navy-800 dark:bg-navy-800 dark:text-slate-200">
              {t('top.tenant')}
            </span>
            <OrgSwitcher />
          </div>

          <div className="flex items-center gap-3 text-xs">
            {/* Quick Command trigger in top bar */}
            <button
              onClick={() => setCommandOpen(true)}
              className="hidden lg:flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-500 hover:border-teal-500/40 hover:text-slate-800 dark:border-navy-700 dark:bg-navy-800/60 dark:text-slate-300 dark:hover:text-white transition-all text-xs"
            >
              <Search className="h-3 w-3 text-teal-500" />
              <span>Pesquisar</span>
              <kbd className="rounded bg-slate-200 dark:bg-navy-900 px-1 font-mono text-[9px] text-slate-600 dark:text-slate-300">
                ⌘K
              </kbd>
            </button>

            <NotificationsBell />

            {/* Language toggle */}
            <div className="flex items-center overflow-hidden rounded-sm border border-slate-300 dark:border-navy-700" aria-label={t('top.language')}>
              {(['en', 'pt'] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2 py-0.5 text-2xs font-semibold uppercase ${
                    lang === l ? 'bg-navy-800 text-white dark:bg-accent-600' : 'bg-white text-slate-600 dark:bg-navy-900 dark:text-slate-300'
                  }`}
                >
                  {l === 'en' ? 'EN' : 'PT'}
                </button>
              ))}
            </div>

            {/* Interactive RBAC Role Switcher */}
            <RoleSelector currentRole={activeRole} onChange={handleRoleChange} />
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
