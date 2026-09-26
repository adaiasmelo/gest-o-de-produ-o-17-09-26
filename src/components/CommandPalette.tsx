import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Command,
  ArrowRight,
  Clock,
  User,
  Users,
  Factory,
  BarChart3,
  Wrench,
  Tv,
  Calendar,
  Calculator,
  FileText,
  CheckCircle2,
  Sparkles,
  Settings,
  ShieldCheck,
  Database,
  Plus,
  MessageCircle,
  X,
  ChevronRight,
  CornerDownLeft,
  Activity,
  Layers,
  Flame,
  Home,
  Briefcase,
  ExternalLink,
  Award
} from 'lucide-react';
import { Employee } from '../types';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (
    tab: 'home' | 'extrusion' | 'ribbon' | 'personnel' | 'evaluations' | 'maintenance' | 'projection',
    subTab?: string,
    subSubTab?: string
  ) => void;
  onOpenModal: (modalName: string, payload?: any) => void;
  employees: Employee[];
  isAdmin: boolean;
  canManage: boolean;
  onFilterEmployee?: (employeeName: string) => void;
}

type CommandCategory = 'all' | 'actions' | 'navigation' | 'employees' | 'machines' | 'documents';

interface PaletteItem {
  id: string;
  category: 'actions' | 'navigation' | 'employees' | 'machines' | 'documents';
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  keywords: string[];
  action: () => void;
  quickButtons?: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: (e: React.MouseEvent) => void;
    title?: string;
  }>;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenModal,
  employees,
  isAdmin,
  canManage,
  onFilterEmployee
}) => {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CommandCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Foco automático e reset ao abrir
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveCategory('all');
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Lista mestre de ações, telas, máquinas e procedimentos
  const allItems = useMemo<PaletteItem[]>(() => {
    const list: PaletteItem[] = [
      // ==========================================
      // AÇÕES RÁPIDAS
      // ==========================================
      {
        id: 'action-launch-prod',
        category: 'actions',
        title: 'Lançar Apontamento de Produção',
        subtitle: 'Registrar bobina, peso ou metragem na Extrusão ou Corte de Fita',
        badge: 'Operação',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Plus size={18} />,
        iconBg: 'bg-blue-500/10 text-blue-600',
        iconColor: 'text-blue-600',
        keywords: ['novo', 'apontamento', 'lancamento', 'producao', 'bobina', 'peso', 'metro', 'adicionar'],
        action: () => {
          onClose();
          onOpenModal('launch_production');
        }
      },
      {
        id: 'action-new-overtime',
        category: 'actions',
        title: 'Nova Solicitação de Horas Extras (DOC 076)',
        subtitle: 'Lançar hora extra com fechamento automático no dia 24 para o RH',
        badge: 'DOC 076 • RH',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: <Clock size={18} />,
        iconBg: 'bg-amber-500/10 text-amber-600',
        iconColor: 'text-amber-600',
        keywords: ['hora extra', 'horas extras', 'doc 076', 'doc076', 'rh', 'fechamento 24', 'extra', 'solicitacao', 'plantao'],
        action: () => {
          onClose();
          onNavigateTab('personnel', 'overtime');
        }
      },
      {
        id: 'action-new-training',
        category: 'actions',
        title: 'Novo Treinamento / DDP (Diálogo de Produção)',
        subtitle: 'Registrar presença, conteúdo programático ou duplicar ficha',
        badge: 'DDP • Treinamento',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: <Award size={18} />,
        iconBg: 'bg-emerald-500/10 text-emerald-600',
        iconColor: 'text-emerald-600',
        keywords: ['ddp', 'treinamento', 'dialogo', 'capacitacao', 'seguranca', 'duplicar ddp', 'ficha'],
        action: () => {
          onClose();
          onOpenModal('training');
        }
      },
      {
        id: 'action-cast1-calc',
        category: 'actions',
        title: 'Calculadora de Bobinas & Metragem CAST 1',
        subtitle: 'Calcular diâmetro, peso, micragem e metragem estimada da bobina',
        badge: 'Ferramenta',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: <Calculator size={18} />,
        iconBg: 'bg-purple-500/10 text-purple-600',
        iconColor: 'text-purple-600',
        keywords: ['calculadora', 'cast 1', 'cast1', 'diametro', 'metragem', 'peso', 'bobina', 'micra', 'micragem'],
        action: () => {
          onClose();
          onOpenModal('cast1_calculator');
        }
      },
      {
        id: 'action-weekly-summary',
        category: 'actions',
        title: 'Resumo Semanal Consolidado de Produção',
        subtitle: 'Visualizar fechamento semanal da Extrusão e Corte com metas e comparativos',
        badge: 'Relatório Executivo',
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        icon: <Activity size={18} />,
        iconBg: 'bg-indigo-500/10 text-indigo-600',
        iconColor: 'text-indigo-600',
        keywords: ['resumo semanal', 'semana', 'semanal', 'fechamento', 'consolidado', 'relatorio semanal'],
        action: () => {
          onClose();
          onOpenModal('weekly_summary');
        }
      },
      {
        id: 'action-tv-projection',
        category: 'actions',
        title: 'Ativar Projeção em TV / Painel Industrial',
        subtitle: 'Modo automático em tela cheia com alternância de métricas de fábrica',
        badge: 'Modo TV',
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        icon: <Tv size={18} />,
        iconBg: 'bg-indigo-500/10 text-indigo-600',
        iconColor: 'text-indigo-600',
        keywords: ['tv', 'projecao', 'painel', 'telao', 'fullscreen', 'tela cheia', 'dashboard tv'],
        action: () => {
          onClose();
          onNavigateTab('projection');
        }
      },
      {
        id: 'action-downtime-analytics',
        category: 'actions',
        title: 'Análise de Paradas de Máquina & Motivos',
        subtitle: 'Visualizar tempos de parada mecânica, elétrica e trocas de turno',
        badge: 'OEE • Paradas',
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
        icon: <Activity size={18} />,
        iconBg: 'bg-rose-500/10 text-rose-600',
        iconColor: 'text-rose-600',
        keywords: ['parada', 'paradas', 'downtime', 'manutencao', 'motivos', 'oee', 'quebra'],
        action: () => {
          onClose();
          onOpenModal('downtime_analytics');
        }
      },

      // ==========================================
      // NAVEGAÇÃO ENTRE TELAS E MÓDULOS
      // ==========================================
      {
        id: 'nav-home',
        category: 'navigation',
        title: 'Início • Painel Geral da Fábrica',
        subtitle: 'Visão consolidada de todas as linhas de produção e status geral',
        badge: 'Aba Início',
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: <Home size={18} />,
        iconBg: 'bg-slate-500/10 text-slate-700',
        iconColor: 'text-slate-700',
        keywords: ['inicio', 'home', 'painel geral', 'dashboard geral', 'principal'],
        action: () => {
          onClose();
          onNavigateTab('home');
        }
      },
      {
        id: 'nav-extrusion-dashboard',
        category: 'navigation',
        title: 'Extrusão > Painel Resumo',
        subtitle: 'Metas diárias, produção horária e eficiência das extrusoras CAST 1, 2 e 3',
        badge: 'Extrusão',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Factory size={18} />,
        iconBg: 'bg-blue-500/10 text-blue-600',
        iconColor: 'text-blue-600',
        keywords: ['extrusao', 'extrusoras', 'cast', 'resumo extrusao', 'filme stretch'],
        action: () => {
          onClose();
          onNavigateTab('extrusion', 'dashboard', 'summary');
        }
      },
      {
        id: 'nav-extrusion-charts',
        category: 'navigation',
        title: 'Extrusão > Gráficos de Produção',
        subtitle: 'Curvas de produção, tendências temporais e comparativos',
        badge: 'Gráficos',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <BarChart3 size={18} />,
        iconBg: 'bg-blue-500/10 text-blue-600',
        iconColor: 'text-blue-600',
        keywords: ['graficos extrusao', 'desempenho extrusao', 'historico grafico'],
        action: () => {
          onClose();
          onNavigateTab('extrusion', 'dashboard', 'charts');
        }
      },
      {
        id: 'nav-extrusion-comparison',
        category: 'navigation',
        title: 'Extrusão > Comparativo de Turnos',
        subtitle: 'Análise cruzada de produção entre Turno A, Turno B, Turno C e Turno D',
        badge: 'Turnos',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Layers size={18} />,
        iconBg: 'bg-blue-500/10 text-blue-600',
        iconColor: 'text-blue-600',
        keywords: ['comparativo turnos', 'turnos extrusao', 'turno a', 'turno b', 'turno c', 'turno d'],
        action: () => {
          onClose();
          onNavigateTab('extrusion', 'dashboard', 'comparison');
        }
      },
      {
        id: 'nav-extrusion-reports',
        category: 'navigation',
        title: 'Extrusão > Relatórios & Exportação',
        subtitle: 'Tabela analítica de apontamentos e filtros avançados com download',
        badge: 'Relatórios',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <FileText size={18} />,
        iconBg: 'bg-blue-500/10 text-blue-600',
        iconColor: 'text-blue-600',
        keywords: ['relatorios extrusao', 'exportar extrusao', 'tabela extrusao', 'historico'],
        action: () => {
          onClose();
          onNavigateTab('extrusion', 'reports');
        }
      },
      {
        id: 'nav-extrusion-stock',
        category: 'navigation',
        title: 'Extrusão > Controle de Estoque de Bobinas',
        subtitle: 'Status de bobinas mães e produtos acabados no estoque',
        badge: 'Estoque',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Layers size={18} />,
        iconBg: 'bg-blue-500/10 text-blue-600',
        iconColor: 'text-blue-600',
        keywords: ['estoque', 'bobinas', 'materia prima', 'saldo estoque', 'armazem'],
        action: () => {
          onClose();
          onNavigateTab('extrusion', 'stock');
        }
      },
      {
        id: 'nav-ribbon-dashboard',
        category: 'navigation',
        title: 'Corte de Fita > Painel Resumo',
        subtitle: 'Produção diária de caixas e rolos de fita adesiva',
        badge: 'Corte de Fita',
        badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
        icon: <BarChart3 size={18} />,
        iconBg: 'bg-cyan-500/10 text-cyan-600',
        iconColor: 'text-cyan-600',
        keywords: ['corte de fita', 'fita', 'fitas', 'cortadeira', 'caixas', 'rolos'],
        action: () => {
          onClose();
          onNavigateTab('ribbon', 'dashboard', 'summary');
        }
      },
      {
        id: 'nav-ribbon-productivity',
        category: 'navigation',
        title: 'Corte de Fita > Produtividade por Máquina',
        subtitle: 'Eficiência de cortadeiras Ghezzi, Lintech, Wultec e rebobinadeiras',
        badge: 'Produtividade',
        badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
        icon: <Activity size={18} />,
        iconBg: 'bg-cyan-500/10 text-cyan-600',
        iconColor: 'text-cyan-600',
        keywords: ['produtividade fita', 'cortadeiras', 'ghezzi', 'lintech', 'wultec', 'maquinas corte'],
        action: () => {
          onClose();
          onNavigateTab('ribbon', 'productivity');
        }
      },
      {
        id: 'nav-personnel-board',
        category: 'navigation',
        title: 'Pessoal > Quadro Geral de Alocação',
        subtitle: 'Matriz visual de operadores alocados por máquina, setor e turno',
        badge: 'Aba Pessoal',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: <Users size={18} />,
        iconBg: 'bg-emerald-500/10 text-emerald-600',
        iconColor: 'text-emerald-600',
        keywords: ['pessoal', 'quadro pessoal', 'alocacao', 'colaboradores', 'equipe', 'escala'],
        action: () => {
          onClose();
          onNavigateTab('personnel', 'board');
        }
      },
      {
        id: 'nav-personnel-overtime',
        category: 'navigation',
        title: 'Pessoal > Solicitação de Horas Extras (DOC 076)',
        subtitle: 'Controle de horas extras com fechamento dia 24 e envio diário ao RH',
        badge: 'DOC 076',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: <Clock size={18} />,
        iconBg: 'bg-amber-500/10 text-amber-600',
        iconColor: 'text-amber-600',
        keywords: ['horas extras', 'banco de horas', 'folha fechamento 24', 'doc 076', 'rh'],
        action: () => {
          onClose();
          onNavigateTab('personnel', 'overtime');
        }
      },
      {
        id: 'nav-personnel-vacations',
        category: 'navigation',
        title: 'Pessoal > Programação Anual de Férias',
        subtitle: 'Grade anual de férias dos colaboradores de Extrusão, Fita e Reciclagem',
        badge: 'Férias',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: <Calendar size={18} />,
        iconBg: 'bg-emerald-500/10 text-emerald-600',
        iconColor: 'text-emerald-600',
        keywords: ['ferias', 'programacao de ferias', 'calendario de ferias', 'descanso'],
        action: () => {
          onClose();
          onNavigateTab('personnel', 'vacations');
        }
      },
      {
        id: 'nav-personnel-lunch',
        category: 'navigation',
        title: 'Pessoal > Escala de Almoço & Intervalos',
        subtitle: 'Horários de saída para almoço sem interrupção das linhas',
        badge: 'Refeições',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: <Clock size={18} />,
        iconBg: 'bg-emerald-500/10 text-emerald-600',
        iconColor: 'text-emerald-600',
        keywords: ['almoco', 'intervalo', 'escala almoco', 'refeicao', 'pausa'],
        action: () => {
          onClose();
          onNavigateTab('personnel', 'lunch');
        }
      },
      {
        id: 'nav-personnel-evaluations',
        category: 'navigation',
        title: 'Pessoal > Avaliação de Desempenho & Promoção',
        subtitle: 'Critérios técnicos, histórico de evolução e aptidão para promoção',
        badge: 'Avaliações',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: <Award size={18} />,
        iconBg: 'bg-emerald-500/10 text-emerald-600',
        iconColor: 'text-emerald-600',
        keywords: ['avaliacao', 'desempenho', 'promocao', 'matriz', 'competencia', 'operador lider'],
        action: () => {
          onClose();
          onNavigateTab('personnel', 'evaluations');
        }
      },
      {
        id: 'nav-maintenance',
        category: 'navigation',
        title: 'Manutenção > Ordens de Serviço & Intervenções',
        subtitle: 'Chamados técnicos, corretivas, preventivas e status das máquinas',
        badge: 'Manutenção',
        badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: <Wrench size={18} />,
        iconBg: 'bg-orange-500/10 text-orange-600',
        iconColor: 'text-orange-600',
        keywords: ['manutencao', 'ordem de servico', 'os', 'corretiva', 'preventiva', 'mecanica', 'eletrica'],
        action: () => {
          onClose();
          onNavigateTab('maintenance');
        }
      },

      // ==========================================
      // MÁQUINAS & EQUIPAMENTOS
      // ==========================================
      {
        id: 'mach-cast-1',
        category: 'machines',
        title: 'CAST 1 • Extrusora de Filme Stretch',
        subtitle: 'Setor de Extrusão • Filtrar apontamentos, paradas ou calcular bobina',
        badge: 'Extrusora CAST',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Factory size={18} />,
        iconBg: 'bg-blue-500/10 text-blue-600',
        iconColor: 'text-blue-600',
        keywords: ['cast 1', 'cast1', 'extrusora 1', 'linha 1'],
        action: () => {
          onClose();
          onNavigateTab('extrusion', 'dashboard', 'summary');
        },
        quickButtons: [
          {
            label: 'Calculadora',
            icon: <Calculator size={12} />,
            title: 'Abrir Calculadora de Bobina CAST 1',
            onClick: (e) => {
              e.stopPropagation();
              onClose();
              onOpenModal('cast1_calculator');
            }
          },
          {
            label: 'Ver Extrusão',
            icon: <ArrowRight size={12} />,
            title: 'Ir para o painel de Extrusão',
            onClick: (e) => {
              e.stopPropagation();
              onClose();
              onNavigateTab('extrusion', 'dashboard', 'summary');
            }
          }
        ]
      },
      {
        id: 'mach-cast-2',
        category: 'machines',
        title: 'CAST 2 • Extrusora de Filme Stretch',
        subtitle: 'Setor de Extrusão • Filtrar apontamentos e produtividade da CAST 2',
        badge: 'Extrusora CAST',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Factory size={18} />,
        iconBg: 'bg-blue-500/10 text-blue-600',
        iconColor: 'text-blue-600',
        keywords: ['cast 2', 'cast2', 'extrusora 2', 'linha 2'],
        action: () => {
          onClose();
          onNavigateTab('extrusion', 'dashboard', 'summary');
        }
      },
      {
        id: 'mach-cast-3',
        category: 'machines',
        title: 'CAST 3 • Extrusora de Filme Stretch',
        subtitle: 'Setor de Extrusão • Filtrar apontamentos e produtividade da CAST 3',
        badge: 'Extrusora CAST',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Factory size={18} />,
        iconBg: 'bg-blue-500/10 text-blue-600',
        iconColor: 'text-blue-600',
        keywords: ['cast 3', 'cast3', 'extrusora 3', 'linha 3'],
        action: () => {
          onClose();
          onNavigateTab('extrusion', 'dashboard', 'summary');
        }
      },
      {
        id: 'mach-reciclagem',
        category: 'machines',
        title: 'Reciclagem • Granulação & Recuperação',
        subtitle: 'Setor de Reciclagem • Moagem, recuperação de aparas e pellets',
        badge: 'Reciclagem',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: <Flame size={18} />,
        iconBg: 'bg-emerald-500/10 text-emerald-600',
        iconColor: 'text-emerald-600',
        keywords: ['reciclagem', 'granulador', 'aparas', 'recuperacao', 'pellet'],
        action: () => {
          onClose();
          onNavigateTab('extrusion', 'dashboard', 'summary');
        }
      },
      {
        id: 'mach-cortadeiras',
        category: 'machines',
        title: 'Linhas de Corte de Fita Adesiva',
        subtitle: 'Cortadeiras Ghezzi, Lintech, Wultec e Rebobinadeiras',
        badge: 'Corte de Fita',
        badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-200',
        icon: <BarChart3 size={18} />,
        iconBg: 'bg-cyan-500/10 text-cyan-600',
        iconColor: 'text-cyan-600',
        keywords: ['cortadeira', 'cortadeiras', 'ghezzi', 'lintech', 'wultec', 'rebobinadeira', 'fita adesiva'],
        action: () => {
          onClose();
          onNavigateTab('ribbon', 'productivity');
        }
      },

      // ==========================================
      // DOCUMENTOS & PROCEDIMENTOS OPERACIONAIS
      // ==========================================
      {
        id: 'doc-076',
        category: 'documents',
        title: 'DOC 076 • Procedimento de Horas Extras ao RH',
        subtitle: 'Etapas oficiais 1 a 6: Solicitação, aprovação prévia e fechamento no dia 24',
        badge: 'Norma RH',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: <FileText size={18} />,
        iconBg: 'bg-amber-500/10 text-amber-600',
        iconColor: 'text-amber-600',
        keywords: ['doc 076', 'doc076', 'procedimento', 'norma', 'rh', 'fechamento 24', 'horas extras'],
        action: () => {
          onClose();
          onNavigateTab('personnel', 'overtime');
        }
      },
      {
        id: 'doc-ddp',
        category: 'documents',
        title: 'Ficha de Treinamento / DDP (Com Duplicação)',
        subtitle: 'Geração de PDF oficial de capacitação, instrutor e lista de participantes',
        badge: 'DOC DDP',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: <FileText size={18} />,
        iconBg: 'bg-emerald-500/10 text-emerald-600',
        iconColor: 'text-emerald-600',
        keywords: ['ddp', 'ficha ddp', 'treinamento pdf', 'duplicar ddp', 'capacitacao'],
        action: () => {
          onClose();
          onOpenModal('training');
        }
      },
      {
        id: 'doc-database',
        category: 'documents',
        title: 'Gestão de Banco de Dados & Backup',
        subtitle: 'Exportar cópias de segurança, auditar registros e sincronizar Firestore',
        badge: 'Admin',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: <Database size={18} />,
        iconBg: 'bg-purple-500/10 text-purple-600',
        iconColor: 'text-purple-600',
        keywords: ['banco de dados', 'backup', 'firestore', 'exportar dados', 'restaurar'],
        action: () => {
          onClose();
          onOpenModal('database');
        }
      },
      {
        id: 'doc-permissions',
        category: 'documents',
        title: 'Gerenciador Granular de Permissões',
        subtitle: 'Configurar permissões de leitura, gravação e liderança por usuário',
        badge: 'Segurança',
        badgeColor: 'bg-red-100 text-red-800 border-red-200',
        icon: <ShieldCheck size={18} />,
        iconBg: 'bg-red-500/10 text-red-600',
        iconColor: 'text-red-600',
        keywords: ['permissoes', 'usuarios', 'acesso', 'seguranca', 'regras', 'perfis'],
        action: () => {
          onClose();
          onOpenModal('permissions');
        }
      }
    ];

    // ==========================================
    // ADICIONAR COLABORADORES REAIS DO SISTEMA
    // ==========================================
    const normalize = (str: string | undefined | null) =>
      (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // Deduplicação dos colaboradores
    const seenNames = new Set<string>();
    const validEmployees = employees.filter((emp) => {
      if (!emp.name || !emp.name.trim()) return false;
      const n = normalize(emp.name);
      if (n.startsWith('vaga') || n.includes('excluid') || n.includes('contratacao') || n.length < 3) return false;
      if (seenNames.has(n)) return false;
      seenNames.add(n);
      return true;
    });

    validEmployees.forEach((emp) => {
      const cleanName = emp.name.trim();
      const sector = emp.sector || 'Operação';
      const role = emp.role || 'Colaborador';
      const reg = emp.registration ? `Matrícula ${emp.registration}` : '';
      const machine = emp.machine ? `Máq: ${emp.machine}` : '';
      const shift = emp.shift ? `Turno: ${emp.shift}` : '';
      const phone = emp.phone || emp.whatsapp || '';

      const detailParts = [role, sector, reg, machine, shift].filter(Boolean);

      list.push({
        id: `emp-${emp.id}`,
        category: 'employees',
        title: cleanName,
        subtitle: detailParts.join(' • '),
        badge: sector,
        badgeColor: sector.toLowerCase().includes('extrus')
          ? 'bg-blue-100 text-blue-800 border-blue-200'
          : sector.toLowerCase().includes('fita')
          ? 'bg-cyan-100 text-cyan-800 border-cyan-200'
          : sector.toLowerCase().includes('lideran')
          ? 'bg-purple-100 text-purple-800 border-purple-200'
          : 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: <User size={18} />,
        iconBg: 'bg-emerald-500/10 text-emerald-600',
        iconColor: 'text-emerald-600',
        keywords: [
          cleanName.toLowerCase(),
          normalize(cleanName),
          emp.registration ? emp.registration.toLowerCase() : '',
          role.toLowerCase(),
          sector.toLowerCase(),
          emp.machine ? emp.machine.toLowerCase() : '',
          emp.shift ? emp.shift.toLowerCase() : ''
        ],
        action: () => {
          onClose();
          if (onFilterEmployee) {
            onFilterEmployee(cleanName);
          }
          onNavigateTab('personnel', 'board');
        },
        quickButtons: [
          {
            label: 'Horas Extras',
            icon: <Clock size={12} />,
            title: `Lançar Hora Extra DOC 076 para ${cleanName}`,
            onClick: (e) => {
              e.stopPropagation();
              onClose();
              onNavigateTab('personnel', 'overtime');
            }
          },
          {
            label: 'Quadro',
            icon: <Users size={12} />,
            title: `Localizar ${cleanName} no Quadro Pessoal`,
            onClick: (e) => {
              e.stopPropagation();
              onClose();
              if (onFilterEmployee) onFilterEmployee(cleanName);
              onNavigateTab('personnel', 'board');
            }
          },
          ...(phone
            ? [
                {
                  label: 'WhatsApp',
                  icon: <MessageCircle size={12} className="text-emerald-600" />,
                  title: `Enviar mensagem no WhatsApp de ${cleanName}`,
                  onClick: (e: React.MouseEvent) => {
                    e.stopPropagation();
                    const cleanPhone = phone.replace(/\D/g, '');
                    const phoneWithDDI = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
                    const a = document.createElement('a');
                    a.href = `https://wa.me/${phoneWithDDI}`;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }
                }
              ]
            : [])
        ]
      });
    });

    return list;
  }, [employees, onNavigateTab, onOpenModal, onClose, onFilterEmployee]);

  // Filtragem inteligente por busca e categoria
  const filteredItems = useMemo(() => {
    const normalize = (str: string) =>
      str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    const cleanQuery = normalize(query);

    return allItems.filter((item) => {
      // Filtro de aba/categoria ativa
      if (activeCategory !== 'all' && item.category !== activeCategory) {
        return false;
      }

      // Se não houver texto de busca, exibe os itens da categoria
      if (!cleanQuery) {
        return true;
      }

      // Busca por título, subtítulo ou palavras-chave
      const titleMatch = normalize(item.title).includes(cleanQuery);
      const subMatch = item.subtitle ? normalize(item.subtitle).includes(cleanQuery) : false;
      const kwMatch = item.keywords.some((kw) => normalize(kw).includes(cleanQuery));

      return titleMatch || subMatch || kwMatch;
    });
  }, [allItems, query, activeCategory]);

  // Ajusta o índice selecionado quando a lista muda
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length, activeCategory]);

  // Navegação via teclado (ArrowDown, ArrowUp, Enter, Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1 >= filteredItems.length ? 0 : prev + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 < 0 ? Math.max(0, filteredItems.length - 1) : prev - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  // Rolagem automática para manter o item selecionado em foco
  useEffect(() => {
    if (!listContainerRef.current) return;
    const selectedElement = listContainerRef.current.querySelector(
      `[data-palette-index="${selectedIndex}"]`
    ) as HTMLElement;
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[500] flex items-start justify-center p-3 sm:p-6 md:p-12 overflow-y-auto">
        {/* Backdrop escuro com desfoque de alta resolução */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Spotlight Futurista */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -16 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col z-10 max-h-[85vh] text-slate-800"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Barra Superior de Busca */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              <Command size={20} />
            </div>

            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Digite para buscar: colaborador, máquina, ação ou DOC 076..."
                className="w-full bg-transparent text-sm sm:text-base font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none tracking-tight"
              />
            </div>

            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-all text-xs font-bold"
                title="Limpar busca"
              >
                <X size={16} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-2 py-1 bg-slate-200/70 hover:bg-slate-300 text-slate-600 text-[10px] font-black rounded-lg uppercase tracking-wider transition-all"
              title="Fechar (Esc)"
            >
              ESC
            </button>
          </div>

          {/* Filtros em Chips por Categoria */}
          <div className="px-4 py-2 bg-slate-100/50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px] font-bold">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 shrink-0">
              Filtro:
            </span>

            {[
              { id: 'all', label: 'Tudo', count: allItems.length },
              { id: 'actions', label: '⚡ Ações', count: allItems.filter((i) => i.category === 'actions').length },
              { id: 'employees', label: '👤 Pessoal', count: allItems.filter((i) => i.category === 'employees').length },
              { id: 'navigation', label: '🏢 Telas', count: allItems.filter((i) => i.category === 'navigation').length },
              { id: 'machines', label: '🏭 Máquinas', count: allItems.filter((i) => i.category === 'machines').length },
              { id: 'documents', label: '📄 Documentos', count: allItems.filter((i) => i.category === 'documents').length }
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id as CommandCategory)}
                className={`px-2.5 py-1 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 text-white shadow-xs font-black'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200/60'
                }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Lista de Resultados Rolável */}
          <div ref={listContainerRef} className="overflow-y-auto p-2 sm:p-3 divide-y divide-slate-50 flex-1">
            {filteredItems.length === 0 ? (
              <div className="py-16 text-center px-4 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
                  <Search size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                    Nenhum resultado encontrado
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Não encontramos correspondências para &ldquo;{query}&rdquo;.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setActiveCategory('actions');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-all cursor-pointer"
                  >
                    Ver Ações Rápidas
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setActiveCategory('employees');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-all cursor-pointer"
                  >
                    Ver Colaboradores
                  </button>
                </div>
              </div>
            ) : (
              filteredItems.map((item, index) => {
                const isSelected = index === selectedIndex;

                return (
                  <div
                    key={item.id}
                    data-palette-index={index}
                    onClick={() => item.action()}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`group w-full p-2.5 sm:p-3 rounded-2xl transition-all flex items-center justify-between gap-3 cursor-pointer text-left select-none ${
                      isSelected
                        ? 'bg-blue-50/90 ring-1 ring-blue-500/30 shadow-xs'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform ${
                          item.iconBg
                        } ${isSelected ? 'scale-110 shadow-xs' : ''}`}
                      >
                        {item.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs font-black tracking-tight truncate ${
                              isSelected ? 'text-blue-900 font-black' : 'text-slate-800'
                            }`}
                          >
                            {item.title}
                          </span>

                          {item.badge && (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border shrink-0 ${
                                item.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>

                        {item.subtitle && (
                          <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Botões Rápidos ou Indicador de Seleção */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.quickButtons && item.quickButtons.length > 0 ? (
                        <div className="flex items-center gap-1">
                          {item.quickButtons.map((btn, bIdx) => (
                            <button
                              key={bIdx}
                              type="button"
                              onClick={btn.onClick}
                              title={btn.title}
                              className="px-2 py-1 bg-white hover:bg-blue-600 hover:text-white text-slate-700 text-[10px] font-black rounded-lg border border-slate-200 shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                            >
                              {btn.icon}
                              <span>{btn.label}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-300 group-hover:text-slate-600'
                          }`}
                        >
                          <CornerDownLeft size={13} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Rodapé Informativo de Atalhos */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 font-bold">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-mono shadow-2xs">
                  ↑
                </kbd>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-mono shadow-2xs">
                  ↓
                </kbd>
                <span>Navegar</span>
              </span>

              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-mono shadow-2xs">
                  ↵
                </kbd>
                <span>Abrir</span>
              </span>

              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-mono shadow-2xs">
                  Esc
                </kbd>
                <span>Sair</span>
              </span>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <Sparkles size={11} className="text-amber-500" />
              <span>Navegação Instantânea • {filteredItems.length} opções disponíveis</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
