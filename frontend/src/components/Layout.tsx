import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Bot,
  Boxes,
  Building2,
  Bug,
  FileBarChart,
  FileCheck2,
  FileSignature,
  Globe,
  GraduationCap,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  Plug,
  ScrollText,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api, clearAuth, getOrg, getRole, setOrg } from '../api/client';
import { useI18n, type I18nKey, type Lang } from '../i18n';
import { fmtDate } from './common';

interface NavCounts {
  activeClocks: number;
  criticalRisks: number;
  openIncidents: number;
  criticalVulns: number;
  expiringContracts: number;
}

type BadgeVariant = 'rose' | 'amber' | 'teal' | 'neutral' | 'accent';

type NavItem = {
  to: string;
  key: I18nKey;
  icon: typeof LayoutDashboard;
  badge?: (counts: NavCounts) => { text: string; variant: BadgeVariant } | null;
};

const groups: { key: I18nKey; items: NavItem[] }[] = [
  {
    key: 'nav.group.command',
    items: [
      {
        to: '/',
        key: 'nav.overview',
        icon: LayoutDashboard,
        badge: (c) =>
          c.activeClocks > 0
            ? { text: `${c.activeClocks} Prazos`, variant: 'rose' }
            : { text: 'Torre CISO', variant: 'teal' },
      },
      {
        to: '/repository',
        key: 'nav.repository',
        icon: BookOpen,
        badge: () => ({ text: '24 Packs', variant: 'teal' }),
      },
      {
        to: '/policies',
        key: 'nav.policies',
        icon: FileSignature,
        badge: () => ({ text: '32 Docs', variant: 'neutral' }),
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
        badge: (c) =>
          c.criticalRisks > 0
            ? { text: `${c.criticalRisks} Críticos`, variant: 'rose' }
            : null,
      },
      {
        to: '/incidents',
        key: 'nav.incidents',
        icon: AlertTriangle,
        badge: (c) =>
          c.openIncidents > 0
            ? { text: `${c.openIncidents} Ativos`, variant: 'rose' }
            : null,
      },
      {
        to: '/vulnerabilities',
        key: 'nav.vulnerabilities',
        icon: Bug,
        badge: (c) =>
          c.criticalVulns > 0
            ? { text: `${c.criticalVulns} KEV`, variant: 'amber' }
            : { text: 'Wazuh/EDR', variant: 'neutral' },
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
        badge: () => ({ text: 'EASM', variant: 'teal' }),
      },
      {
        to: '/vendors',
        key: 'nav.vendors',
        icon: Building2,
        badge: (c) =>
          c.expiringContracts > 0
            ? { text: `${c.expiringContracts} Expirar`, variant: 'rose' }
            : { text: 'DORA', variant: 'neutral' },
      },
      { to: '/isms', key: 'nav.isms', icon: ShieldCheck },
      { to: '/assets', key: 'nav.assets', icon: Boxes },
      { to: '/tasks', key: 'nav.tasks', icon: KanbanSquare },
      { to: '/evidence', key: 'nav.evidence', icon: FileCheck2 },
      { to: '/reports', key: 'nav.reports', icon: FileBarChart },
    ],
  },
  {
    key: 'nav.group.ai',
    items: [
      {
        to: '/copilot',
        key: 'nav.copilot',
        icon: Bot,
        badge: () => ({ text: 'FastMCP', variant: 'accent' }),
      },
      { to: '/skills', key: 'nav.skills', icon: GraduationCap },
      { to: '/audit', key: 'nav.audit', icon: ScrollText },
    ],
  },
  {
    key: 'nav.group.platform',
    items: [
      { to: '/connectors', key: 'nav.connectors', icon: Plug },
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
  const role = getRole() ?? 'user';

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

  return (
    <div className="flex h-full min-h-screen">
      <aside className="flex w-[315px] shrink-0 flex-col border-r border-slate-800 bg-[#090f1d] text-slate-300">
        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3.5 bg-navy-950/60">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 text-white shadow-[0_0_20px_rgba(20,184,166,0.35)] shrink-0">
            <Shield className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-bold tracking-tight text-white text-sm">
              <span>CISO NEXUS</span>
              <span className="rounded bg-teal-500/20 px-1.5 py-0.5 text-[9px] font-bold text-teal-300 border border-teal-500/30">v4.2</span>
            </div>
            <div className="text-[11px] text-slate-400 truncate">AI GRC &amp; Multi-Tenant Engine</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-3">
          {groups.map((g, gi) => (
            <div key={gi}>
              <div className="px-2.5 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400/90 flex items-center justify-between">
                <span>{t(g.key)}</span>
              </div>
              <div className="space-y-0.5">
                {g.items.map(({ to, key, icon: Icon, badge }) => {
                  const b = badge ? badge(counts) : null;
                  return (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === '/'}
                      className={({ isActive }) =>
                        `group flex items-center justify-between gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
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
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-3 space-y-2 bg-navy-950/60">
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
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 dark:border-navy-800 dark:bg-navy-900">
          <div className="flex items-center gap-3 text-xs">
            <span className="rounded-sm bg-navy-100 px-2 py-0.5 font-semibold text-navy-800 dark:bg-navy-800 dark:text-slate-200">{t('top.tenant')}</span>
            <OrgSwitcher />
          </div>
          <div className="flex items-center gap-3 text-xs">
            <NotificationsBell />
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
            <span className="text-slate-500 dark:text-slate-400">
              {t('top.role')}: <span className="badge-accent">{role}</span>
            </span>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
