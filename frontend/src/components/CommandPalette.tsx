import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Search,
  BookOpen,
  FileSignature,
  ShieldAlert,
  AlertTriangle,
  Bug,
  Globe,
  Building2,
  ShieldCheck,
  Boxes,
  KanbanSquare,
  FileCheck2,
  FileBarChart,
  Bot,
  GraduationCap,
  ScrollText,
  Plug,
  LayoutDashboard,
  Building,
  Sparkles,
  CornerDownLeft,
} from 'lucide-react';
import { setOrg } from '../api/client';

export interface CommandItem {
  id: string;
  title: string;
  category: 'module' | 'standard' | 'template' | 'client' | 'action';
  categoryLabel: string;
  description?: string;
  keywords?: string[];
  to?: string;
  icon: any;
  action?: () => void;
  badge?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onOpenBriefing?: () => void;
}

export default function CommandPalette({ open, onClose, onOpenBriefing }: CommandPaletteProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const allItems: CommandItem[] = useMemo(() => [
    // Modules
    {
      id: 'mod-overview',
      title: 'Torre CISOaaS Consolidada',
      category: 'module',
      categoryLabel: 'Centro de Comando',
      description: 'Painel executivo multi-inquilino com prazos de auditoria e incidentes DORA',
      keywords: ['cockpit', 'dashboard', 'overview', 'torre', 'resumo', 'prazos', 'página inicial'],
      to: '/',
      icon: LayoutDashboard,
      badge: 'Cockpit',
    },
    {
      id: 'mod-repository',
      title: 'Normas & Leis por País',
      category: 'module',
      categoryLabel: 'Repositório Regulatório',
      description: '24 Content packs: ISO, DORA, NIS2, DL 125/2025, Aviso BNA',
      keywords: ['normas', 'leis', 'jurisdições', 'portugal', 'angola', 'dora', 'nis2', 'iso', 'rgpd'],
      to: '/repository',
      icon: BookOpen,
      badge: '24 Packs',
    },
    {
      id: 'mod-policies',
      title: 'Modelos & Minutas pt-PT',
      category: 'module',
      categoryLabel: 'Governação Documental',
      description: '32 Templates prontos em português: políticas, procedimentos e processos',
      keywords: ['minutas', 'templates', 'modelos', 'politicas', 'procedimentos', 'documentos', 'sgsi'],
      to: '/policies',
      icon: FileSignature,
      badge: '32 Docs',
    },
    {
      id: 'mod-risks',
      title: 'Riscos & Matriz 5x5',
      category: 'module',
      categoryLabel: 'Gestão de Risco',
      description: 'Matriz de probabilidade e impacto, riscos por cliente e tratamentos',
      keywords: ['riscos', 'matriz', '5x5', 'impacto', 'probabilidade', 'ameacas', 'vulnerabilidades'],
      to: '/risks',
      icon: ShieldAlert,
      badge: 'Matriz 5x5',
    },
    {
      id: 'mod-incidents',
      title: 'Incidentes & Prazos DORA',
      category: 'module',
      categoryLabel: 'Operações de Segurança',
      description: 'Relatórios de incidentes graves DORA com contagem decrescente 4h, 24h e 1 mês',
      keywords: ['incidentes', 'dora', 'prazos', 'notificacoes', 'relatorios', 'clock', 'tempo'],
      to: '/incidents',
      icon: AlertTriangle,
      badge: 'DORA Clocks',
    },
    {
      id: 'mod-vulns',
      title: 'Vulnerabilidades & SOC/SIEM',
      category: 'module',
      categoryLabel: 'Operações de Segurança',
      description: 'Feed CISA KEV, correlação SIEM, Wazuh EDR e tracking de SLAs',
      keywords: ['vulnerabilidades', 'kev', 'cve', 'soc', 'siem', 'wazuh', 'edr', 'patch'],
      to: '/vulnerabilities',
      icon: Bug,
      badge: 'KEV / SIEM',
    },
    {
      id: 'mod-easm',
      title: 'Radar Perímetro Externo (EASM)',
      category: 'module',
      categoryLabel: 'Superfície de Ataque',
      description: 'Descoberta contínua de IPs, certificados SSL, portas expostas e DNS',
      keywords: ['easm', 'perimetro', 'externo', 'shodan', 'censys', 'certificados', 'dns', 'superficie'],
      to: '/easm',
      icon: Globe,
      badge: 'Radar EASM',
    },
    {
      id: 'mod-vendors',
      title: 'TPRM & Fornecedores DORA',
      category: 'module',
      categoryLabel: 'Risco de Terceiros',
      description: 'Registo de Informação DORA, contratos a expirar, concentração ICT',
      keywords: ['tprm', 'fornecedores', 'terceiros', 'vendors', 'dora', 'contratos', 'concentracao'],
      to: '/vendors',
      icon: Building2,
      badge: 'TPRM DORA',
    },
    {
      id: 'mod-isms',
      title: 'SGSI & 93 Controlos ISO 27001',
      category: 'module',
      categoryLabel: 'Conformidade ISO',
      description: 'Cláusulas 4-10 e Anexo A (Organizacionais, Pessoas, Físicos, Tecnológicos)',
      keywords: ['isms', 'sgsi', 'iso', '27001', 'controlos', 'anexo a', 'soas', 'escopo'],
      to: '/isms',
      icon: ShieldCheck,
      badge: 'ISO 27001',
    },
    {
      id: 'mod-assets',
      title: 'Ativos & Jóias da Coroa',
      category: 'module',
      categoryLabel: 'Inventário de Ativos',
      description: 'Classificação de criticidade, donos de ativos e mapeamento de dependências',
      keywords: ['ativos', 'joias da coroa', 'assets', 'servidores', 'bases de dados', 'inventario'],
      to: '/assets',
      icon: Boxes,
    },
    {
      id: 'mod-tasks',
      title: 'Tarefas & Planos de Ação',
      category: 'module',
      categoryLabel: 'Gestão de Tarefas',
      description: 'Kanban board, prazos de remediação e atribuição de responsabilidades',
      keywords: ['tarefas', 'kanban', 'planos de acao', 'remediacao', 'prazos'],
      to: '/tasks',
      icon: KanbanSquare,
    },
    {
      id: 'mod-evidence',
      title: 'Evidências & Auditoria',
      category: 'module',
      categoryLabel: 'Auditoria & Provas',
      description: 'Repositório de evidências rastreáveis, testes de auditoria e validações',
      keywords: ['evidencias', 'auditoria', 'provas', 'amostras', 'inspecao'],
      to: '/evidence',
      icon: FileCheck2,
    },
    {
      id: 'mod-reports',
      title: 'Relatórios & Dossiês CISO',
      category: 'module',
      categoryLabel: 'Relatórios Executivos',
      description: 'Geração de dossiês de auditoria, declarações de aplicabilidade e briefings',
      keywords: ['relatorios', 'dossies', 'executivo', 'board', 'ciso', 'pdf', 'declaracao'],
      to: '/reports',
      icon: FileBarChart,
    },
    {
      id: 'mod-copilot',
      title: 'CISO Copilot AI (FastMCP)',
      category: 'module',
      categoryLabel: 'Inteligência Artificial',
      description: 'Assistente CISO multi-provedor (Claude, Gemini, Ollama) com ferramentas locais',
      keywords: ['copilot', 'ai', 'chat', 'fastmcp', 'claude', 'gemini', 'ollama', 'agente'],
      to: '/copilot',
      icon: Bot,
      badge: 'FastMCP',
    },
    {
      id: 'mod-skills',
      title: 'Competências & Agentes Especializados',
      category: 'module',
      categoryLabel: 'Inteligência Artificial',
      description: 'Perfis de agentes autónomos (CISO, Auditor, Engenheiro Cloud, Especialista DORA)',
      keywords: ['skills', 'competencias', 'agentes', 'papeis', 'funcoes', 'autonomos'],
      to: '/skills',
      icon: GraduationCap,
    },
    {
      id: 'mod-audit',
      title: 'AI Audit Trail',
      category: 'module',
      categoryLabel: 'Segurança & Auditoria',
      description: 'Registo imutável de todas as chamadas de modelos IA, prompts e evidências geradas',
      keywords: ['audit', 'trail', 'logs', 'ai audit', 'rastreio', 'prompts'],
      to: '/audit',
      icon: ScrollText,
    },
    {
      id: 'mod-connectors',
      title: 'Conectores & Telemetria',
      category: 'module',
      categoryLabel: 'Integrações',
      description: 'Conectores nativos: AWS, Azure, GCP, GitHub, Jira, Wazuh, Shodan',
      keywords: ['conectores', 'integracoes', 'cloud', 'aws', 'azure', 'gcp', 'github', 'jira'],
      to: '/connectors',
      icon: Plug,
    },

    // Jurisdictions / Standards
    {
      id: 'std-pt',
      title: '🇵🇹 Portugal: Cibersegurança & Proteção de Dados',
      category: 'standard',
      categoryLabel: 'Normas & Leis por País',
      description: 'Decreto-Lei 125/2025, CNCS Quadro Nacional, Banco de Portugal Aviso 3/2020',
      keywords: ['portugal', 'dl 125/2025', 'cncs', 'bdp', 'banco de portugal', 'lei 58/2019', 'pt'],
      to: '/repository?j=PT',
      icon: BookOpen,
      badge: '🇵🇹 Portugal',
    },
    {
      id: 'std-eu',
      title: '🇪🇺 União Europeia: DORA, NIS2 & RGPD',
      category: 'standard',
      categoryLabel: 'Normas & Leis por País',
      description: 'Regulamento DORA (UE 2022/2554), Diretiva NIS2, RGPD, EU AI Act, CRA',
      keywords: ['uniao europeia', 'ue', 'dora', 'nis2', 'rgpd', 'gdpr', 'ai act', 'cra', 'eu'],
      to: '/repository?j=EU',
      icon: BookOpen,
      badge: '🇪🇺 EU',
    },
    {
      id: 'std-ao',
      title: '🇦🇴 Angola: Lei 22/11 & Avisos BNA',
      category: 'standard',
      categoryLabel: 'Normas & Leis por País',
      description: 'Lei 22/11 de Protecção de Dados, Lei 7/17 Redes Informáticas, Regulamentação BNA',
      keywords: ['angola', 'bna', 'lei 22/11', 'lei 7/17', 'banco nacional de angola', 'ao'],
      to: '/repository?j=AO',
      icon: BookOpen,
      badge: '🇦🇴 Angola',
    },
    {
      id: 'std-intl',
      title: '🌐 Internacional: ISO 27001, 22301, 27701, PCI-DSS',
      category: 'standard',
      categoryLabel: 'Normas & Leis por País',
      description: 'ISO/IEC 27001:2022, ISO 22301, ISO 27701, ISO 42001 (IA), PCI-DSS v4.0',
      keywords: ['iso', '27001', '22301', '27701', '42001', 'pci-dss', 'internacional', 'intl'],
      to: '/repository?j=INTL',
      icon: BookOpen,
      badge: '🌐 Global',
    },
    {
      id: 'std-us',
      title: '🇺🇸 Estados Unidos: NIST CSF 2.0 & CIS Controls',
      category: 'standard',
      categoryLabel: 'Normas & Leis por País',
      description: 'NIST Cybersecurity Framework 2.0 e CIS Critical Security Controls v8.1',
      keywords: ['eua', 'estados unidos', 'nist', 'csf', 'cis', 'us'],
      to: '/repository?j=US',
      icon: BookOpen,
      badge: '🇺🇸 EUA',
    },

    // Templates pt-PT
    {
      id: 'tpl-all',
      title: '📜 Biblioteca Completa de Modelos (32 Templates)',
      category: 'template',
      categoryLabel: 'Modelos & Minutas pt-PT',
      description: 'Políticas, procedimentos e processos estruturados para auditoria',
      keywords: ['biblioteca', 'modelos', 'minutas', 'templates', 'todos'],
      to: '/policies?tab=templates',
      icon: FileSignature,
      badge: '32 Modelos',
    },
    {
      id: 'tpl-fintech',
      title: '🏦 Modelos para FinTech & Banca (DORA / PCI)',
      category: 'template',
      categoryLabel: 'Modelos & Minutas pt-PT',
      description: 'Políticas de resiliência operacional, relatórios DORA e gestão de terceiros',
      keywords: ['fintech', 'banca', 'financeiro', 'dora', 'pci', 'pagamentos'],
      to: '/policies?tab=templates&filter=fintech',
      icon: FileSignature,
      badge: 'FinTech',
    },
    {
      id: 'tpl-software',
      title: '💻 Modelos para Software & Cloud (ISO 27001 / SDLC)',
      category: 'template',
      categoryLabel: 'Modelos & Minutas pt-PT',
      description: 'Desenvolvimento seguro (SSDLC), controlo de acessos, vulnerabilidades e cloud',
      keywords: ['software', 'cloud', 'sdlc', 'desenvolvimento', 'devops', 'vulnerabilidades'],
      to: '/policies?tab=templates&filter=software',
      icon: FileSignature,
      badge: 'Software',
    },

    // Clients / Tenants
    {
      id: 'client-op',
      title: '🏢 [A Nossa Empresa] — Software Financeiro & Cloud (Operador)',
      category: 'client',
      categoryLabel: 'Inquilino / Cliente',
      description: 'Operador Principal · Portugal · Software Financeiro & Cloud',
      keywords: ['nossa empresa', 'operador', 'empresa-mae', 'tobe', 'selenium', 'operador principal'],
      action: () => {
        setOrg('00000000-0000-0000-0000-000000000001');
        qc.invalidateQueries();
      },
      icon: Building,
      badge: 'Operador',
    },
    {
      id: 'client-alfa',
      title: '🏦 [Cliente Banco Alfa] — Instituição Financeira / FinTech',
      category: 'client',
      categoryLabel: 'Inquilino / Cliente',
      description: 'Cliente FinTech DORA · Portugal / UE · Pagamentos e Core Banking',
      keywords: ['banco alfa', 'alfa', 'banco', 'fintech', 'cliente'],
      action: () => {
        setOrg('11111111-1111-1111-1111-111111111111');
        qc.invalidateQueries();
      },
      icon: Building,
      badge: 'Cliente FinTech',
    },
    {
      id: 'client-health',
      title: '🏥 [Cliente HealthBeta] — Saúde Digital & RGPD',
      category: 'client',
      categoryLabel: 'Inquilino / Cliente',
      description: 'Cliente Saúde · Dados Clínicos Sensíveis · RGPD Art. 9º',
      keywords: ['healthbeta', 'saude', 'hospital', 'clinica', 'rgpd'],
      action: () => {
        setOrg('22222222-2222-2222-2222-222222222222');
        qc.invalidateQueries();
      },
      icon: Building,
      badge: 'Cliente Saúde',
    },
    {
      id: 'client-luanda',
      title: '🇦🇴 [Cliente LuandaFin] — Finanças & Microcrédito Angola',
      category: 'client',
      categoryLabel: 'Inquilino / Cliente',
      description: 'Cliente Instituição Financeira · Angola · Regulamentação BNA & Lei 22/11',
      keywords: ['luandafin', 'angola', 'luanda', 'bna', 'banco angola'],
      action: () => {
        setOrg('33333333-3333-3333-3333-333333333333');
        qc.invalidateQueries();
      },
      icon: Building,
      badge: 'Cliente Angola',
    },
    {
      id: 'client-retail',
      title: '🛒 [Cliente RetailSaaS] — Plataforma E-Commerce',
      category: 'client',
      categoryLabel: 'Inquilino / Cliente',
      description: 'Cliente E-Commerce · PCI-DSS & RGPD · Cloud Nativa',
      keywords: ['retailsaas', 'retail', 'ecommerce', 'comercio', 'loja'],
      action: () => {
        setOrg('44444444-4444-4444-4444-444444444444');
        qc.invalidateQueries();
      },
      icon: Building,
      badge: 'Cliente Retail',
    },

    // Actions
    {
      id: 'act-briefing',
      title: '⚡ Gerar Briefing Executivo CISO com IA',
      category: 'action',
      categoryLabel: 'Ações Rápidas',
      description: 'Gera sumário executivo instantâneo dos clientes, prazos DORA e riscos críticos',
      keywords: ['briefing', 'ia', 'ciso brief', 'sumario', 'gerar relatorio'],
      action: () => {
        if (onOpenBriefing) onOpenBriefing();
        else navigate('/reports');
      },
      icon: Sparkles,
      badge: 'IA FastMCP',
    },
  ], [navigate, qc, onOpenBriefing]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase().trim();
    return allItems.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q) ?? false;
      const matchKeywords = item.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false;
      const matchCat = item.categoryLabel.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchKeywords || matchCat;
    });
  }, [allItems, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredItems[selectedIndex];
        if (selected) {
          executeItem(selected);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, filteredItems, selectedIndex, onClose]);

  const executeItem = (item: CommandItem) => {
    onClose();
    if (item.action) {
      item.action();
    } else if (item.to) {
      navigate(item.to);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-navy-950/80 backdrop-blur-md transition-opacity"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="presentation"
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-teal-500/30 bg-[#0c1322] text-slate-200 shadow-[0_25px_60px_rgba(0,0,0,0.85)] ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Search header */}
        <div className="flex items-center gap-3 border-b border-slate-800/80 px-4 py-3.5 bg-navy-900/60">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-sm font-medium text-white placeholder-slate-400 focus:outline-none"
            placeholder="Pesquisar módulos, normas por país, minutas pt-PT, fornecedores ou clientes… (Ex: DORA, ISO 27001, Portugal, Matriz)"
            aria-label="Pesquisar comandos e recursos"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-1.5 text-2xs text-slate-400">
            <kbd className="rounded bg-slate-800/90 px-1.5 py-0.5 font-mono text-[10px] text-slate-300 border border-slate-700">ESC</kbd>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-[55vh] overflow-y-auto p-2 divide-y divide-slate-800/40">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="mx-auto h-8 w-8 text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-400">Nenhum resultado encontrado para &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-slate-500 mt-1">Tente pesquisar por país (ex: Portugal), norma (ex: DORA, ISO), ou cliente.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => executeItem(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        executeItem(item);
                      }
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-teal-500/20 via-teal-500/10 to-transparent text-white border-l-2 border-teal-400'
                        : 'text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 transition-colors ${
                          isSelected ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-800/80 text-slate-400'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{item.title}</span>
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9.5px] font-medium text-slate-400 border border-slate-700">
                            {item.categoryLabel}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-[11.5px] text-slate-400 truncate mt-0.5">{item.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.badge && (
                        <span className="rounded-full bg-teal-500/15 border border-teal-500/30 px-2 py-0.5 text-[10px] font-bold text-teal-300">
                          {item.badge}
                        </span>
                      )}
                      {isSelected && (
                        <CornerDownLeft className="h-3.5 w-3.5 text-teal-400 animate-pulse" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between border-t border-slate-800/80 bg-navy-950/80 px-4 py-2.5 text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-slate-300 border border-slate-700">↑</kbd>
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-slate-300 border border-slate-700">↓</kbd>
              <span className="text-slate-500 ml-0.5">Navegar</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-slate-300 border border-slate-700">↵</kbd>
              <span className="text-slate-500 ml-0.5">Abrir</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-2xs text-slate-500">
            <span>CISO Nexus Command Engine</span>
            <span>·</span>
            <span className="text-teal-400 font-mono">⌘K</span>
          </div>
        </div>
      </div>
    </div>
  );
}
