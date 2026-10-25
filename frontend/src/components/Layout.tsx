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

type NavItem = { to: string; key: I18nKey; icon: typeof LayoutDashboard };
const groups: { key: I18nKey | null; items: NavItem[] }[] = [
  { key: null, items: [{ to: '/', key: 'nav.overview', icon: LayoutDashboard }] },
  {
    key: 'nav.group.govern',
    items: [
      { to: '/isms', key: 'nav.isms', icon: ShieldCheck },
      { to: '/policies', key: 'nav.policies', icon: FileSignature },
      { to: '/risks', key: 'nav.risks', icon: ShieldAlert },
      { to: '/assets', key: 'nav.assets', icon: Boxes },
      { to: '/vendors', key: 'nav.vendors', icon: Building2 },
    ],
  },
  {
    key: 'nav.group.operate',
    items: [
      { to: '/incidents', key: 'nav.incidents', icon: AlertTriangle },
      { to: '/vulnerabilities', key: 'nav.vulnerabilities', icon: Bug },
      { to: '/tasks', key: 'nav.tasks', icon: KanbanSquare },
      { to: '/evidence', key: 'nav.evidence', icon: FileCheck2 },
      { to: '/reports', key: 'nav.reports', icon: FileBarChart },
    ],
  },
  {
    key: 'nav.group.knowledge',
    items: [
      { to: '/repository', key: 'nav.repository', icon: BookOpen },
      { to: '/skills', key: 'nav.skills', icon: GraduationCap },
      { to: '/copilot', key: 'nav.copilot', icon: Bot },
    ],
  },
  {
    key: 'nav.group.platform',
    items: [
      { to: '/connectors', key: 'nav.connectors', icon: Plug },
      { to: '/audit', key: 'nav.audit', icon: ScrollText },
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
  const selected = orgs.find((o) => o.id === org);
  return (
    <label className="flex items-center gap-1.5 text-xs">
      <span className="hidden text-slate-500 dark:text-slate-400 sm:inline">{t('top.organization')}</span>
      <select className="input w-auto py-0.5" value={org ?? ''} onChange={(e) => change(e.target.value)} disabled={orgs.length === 0}>
        {orgs.length === 0 && <option value="">—</option>}
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} · {o.country}
          </option>
        ))}
      </select>
      {selected && <span className="badge-neutral hidden md:inline">{selected.kind}</span>}
    </label>
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

  const logout = () => {
    clearAuth();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-full min-h-screen">
      <aside className="flex w-52 shrink-0 flex-col border-r border-navy-800 bg-navy-900 text-slate-300">
        <div className="flex items-center gap-2 border-b border-navy-800 px-4 py-3">
          <Shield className="h-5 w-5 text-accent-400" />
          <div>
            <div className="text-sm font-semibold tracking-tight text-white">CISO Nexus</div>
            <div className="text-2xs text-slate-400">AI GRC orchestration</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {groups.map((g, gi) => (
            <div key={gi} className="mb-2">
              {g.key && <div className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t(g.key)}</div>}
              <div className="space-y-0.5">
                {g.items.map(({ to, key, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        isActive ? 'bg-navy-800 text-white shadow-[inset_2px_0_0_0_#14b8a6]' : 'text-slate-300 hover:bg-navy-800/60 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{t(key)}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-navy-800 p-2">
          <button className="flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs text-slate-300 hover:bg-navy-800/60 hover:text-white" onClick={logout}>
            <LogOut className="h-4 w-4" />
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
