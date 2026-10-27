import { createContext, useContext } from 'react';

export type Lang = 'en' | 'pt';

const en = {
  // nav
  'nav.overview': 'Overview',
  'nav.risks': 'Risks',
  'nav.incidents': 'Incidents',
  'nav.vendors': 'Third parties',
  'nav.evidence': 'Evidence',
  'nav.connectors': 'Connectors',
  'nav.copilot': 'Copilot',
  'nav.audit': 'AI Audit',
  'nav.isms': 'ISMS',
  'nav.assets': 'Assets',
  'nav.policies': 'Policies',
  'nav.tasks': 'Tasks',
  'nav.repository': 'Repository',
  'nav.skills': 'Skills',
  'nav.vulnerabilities': 'Vulnerabilities',
  'nav.easm': 'Perimeter (EASM)',
  'nav.reports': 'Reports',
  'nav.group.govern': 'Govern',
  'nav.group.operate': 'Operate',
  'nav.group.knowledge': 'Knowledge',
  'nav.group.platform': 'Platform',
  'nav.logout': 'Sign out',
  // top bar
  'top.tenant': 'Grupo | PT · EU · AO',
  'top.role': 'Role',
  'top.language': 'Language',
  'top.organization': 'Organisation',
  'top.notifications': 'Notifications',
  'top.markRead': 'Mark read',
  'top.runNotifications': 'Run checks',
  'top.noNotifications': 'No unread notifications.',
  // tiles
  'tile.risks': 'Risks',
  'tile.risks.open': 'Open',
  'tile.risks.high': 'High / critical',
  'tile.risks.avg': 'Avg. critical score',
  'tile.incidents': 'Incidents',
  'tile.incidents.open': 'Open',
  'tile.incidents.dora': 'DORA major',
  'tile.incidents.overdue': 'Overdue notifications',
  'tile.vendors': 'Third parties',
  'tile.vendors.tier1': 'Tier 1',
  'tile.vendors.cif': 'Critical / important function',
  'tile.vendors.noexit': 'No exit strategy',
  'tile.evidence': 'Evidence',
  'tile.evidence.pass': 'Pass',
  'tile.evidence.fail': 'Fail',
  'tile.evidence.unmapped': 'Unmapped',
  'tile.connectors': 'Connectors',
  'tile.connectors.configured': 'Configured',
  'tile.connectors.healthy': 'Healthy',
  'tile.controls': 'Controls',
  'tile.controls.implemented': 'Implemented',
  'tile.controls.partial': 'Partial',
  'tile.controls.maturity': 'Avg. maturity',
  'tile.vulns': 'Vulnerabilities',
  'tile.vulns.critical': 'Critical',
  'tile.vulns.sla': 'SLA breached',
  'tile.tasks': 'Tasks',
  'tile.tasks.overdue': 'Overdue',
  'tile.policies': 'Policies',
  'tile.policies.approved': 'Approved',
  'tile.policies.reviewDue': 'Review due',
  'overview.coverage': 'Framework coverage',
  'overview.deadlines': 'Overdue notification deadlines',
  'overview.brief': 'CISO Brief',
  'overview.noDeadlines': 'No overdue notification deadlines.',
  // common
  'common.loading': 'Loading…',
  'common.error': 'Something went wrong',
  'common.refresh': 'Refresh',
  'common.close': 'Close',
  'common.cancel': 'Cancel',
  'common.approve': 'Approve',
  'common.create': 'Create',
  'common.all': 'All',
  'common.total': 'Total',
};

const pt: Record<keyof typeof en, string> = {
  'nav.overview': 'Visão geral',
  'nav.risks': 'Riscos',
  'nav.incidents': 'Incidentes',
  'nav.vendors': 'Terceiros',
  'nav.evidence': 'Evidências',
  'nav.connectors': 'Conectores',
  'nav.copilot': 'Copiloto',
  'nav.audit': 'Auditoria de IA',
  'nav.isms': 'SGSI',
  'nav.assets': 'Activos',
  'nav.policies': 'Políticas',
  'nav.tasks': 'Tarefas',
  'nav.repository': 'Repositório',
  'nav.skills': 'Competências',
  'nav.vulnerabilities': 'Vulnerabilidades',
  'nav.easm': 'Superfície Externa (EASM)',
  'nav.reports': 'Relatórios',
  'nav.group.govern': 'Governar',
  'nav.group.operate': 'Operar',
  'nav.group.knowledge': 'Conhecimento',
  'nav.group.platform': 'Plataforma',
  'nav.logout': 'Terminar sessão',
  'top.tenant': 'Grupo | PT · EU · AO',
  'top.role': 'Perfil',
  'top.language': 'Idioma',
  'top.organization': 'Organização',
  'top.notifications': 'Notificações',
  'top.markRead': 'Marcar como lida',
  'top.runNotifications': 'Executar verificações',
  'top.noNotifications': 'Sem notificações por ler.',
  'tile.risks': 'Riscos',
  'tile.risks.open': 'Abertos',
  'tile.risks.high': 'Elevados / críticos',
  'tile.risks.avg': 'Pontuação média crítica',
  'tile.incidents': 'Incidentes',
  'tile.incidents.open': 'Abertos',
  'tile.incidents.dora': 'DORA graves',
  'tile.incidents.overdue': 'Notificações em atraso',
  'tile.vendors': 'Terceiros',
  'tile.vendors.tier1': 'Nível 1',
  'tile.vendors.cif': 'Função crítica / importante',
  'tile.vendors.noexit': 'Sem estratégia de saída',
  'tile.evidence': 'Evidências',
  'tile.evidence.pass': 'Conformes',
  'tile.evidence.fail': 'Não conformes',
  'tile.evidence.unmapped': 'Sem mapeamento',
  'tile.connectors': 'Conectores',
  'tile.connectors.configured': 'Configurados',
  'tile.connectors.healthy': 'Saudáveis',
  'tile.controls': 'Controlos',
  'tile.controls.implemented': 'Implementados',
  'tile.controls.partial': 'Parciais',
  'tile.controls.maturity': 'Maturidade média',
  'tile.vulns': 'Vulnerabilidades',
  'tile.vulns.critical': 'Críticas',
  'tile.vulns.sla': 'SLA ultrapassado',
  'tile.tasks': 'Tarefas',
  'tile.tasks.overdue': 'Em atraso',
  'tile.policies': 'Políticas',
  'tile.policies.approved': 'Aprovadas',
  'tile.policies.reviewDue': 'Revisão pendente',
  'overview.coverage': 'Cobertura por referencial',
  'overview.deadlines': 'Prazos de notificação em atraso',
  'overview.brief': 'Briefing do CISO',
  'overview.noDeadlines': 'Sem prazos de notificação em atraso.',
  'common.loading': 'A carregar…',
  'common.error': 'Ocorreu um erro',
  'common.refresh': 'Actualizar',
  'common.close': 'Fechar',
  'common.cancel': 'Cancelar',
  'common.approve': 'Aprovar',
  'common.create': 'Criar',
  'common.all': 'Todos',
  'common.total': 'Total',
};

export type I18nKey = keyof typeof en;

export const dictionaries: Record<Lang, Record<I18nKey, string>> = { en, pt };

export function translate(lang: Lang, key: I18nKey): string {
  return dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
}

export interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: I18nKey) => string;
}

export const I18nContext = createContext<I18nContextValue>({
  lang: 'en',
  setLang: () => undefined,
  t: (k) => translate('en', k),
});

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

const LANG_KEY = 'nexus_lang';
export function loadLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return v === 'pt' ? 'pt' : 'en';
  } catch {
    return 'en';
  }
}
export function saveLang(l: Lang) {
  try {
    localStorage.setItem(LANG_KEY, l);
  } catch {
    /* ignore */
  }
}
