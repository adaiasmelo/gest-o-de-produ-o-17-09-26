import React from 'react';
import {
  ChevronRight,
  Home,
  Factory,
  Scissors,
  Users,
  Award,
  Wrench,
  Tv,
  Calendar,
  Clock,
  FileText,
  Activity,
  Layers,
  Calculator,
  BarChart3
} from 'lucide-react';

export interface InteractiveBreadcrumbsProps {
  activeTab: 'home' | 'extrusion' | 'ribbon' | 'personnel' | 'evaluations' | 'maintenance' | 'projection';
  extrusionSubTab?: string;
  dashboardSubTab?: string;
  ribbonSubTab?: string;
  ribbonDashboardSubTab?: string;
  personnelSubView?: string;
  maintenanceSubTab?: string;
  onNavigateTab: (
    tab: 'home' | 'extrusion' | 'ribbon' | 'personnel' | 'evaluations' | 'maintenance' | 'projection',
    subTab?: string,
    subSubTab?: string
  ) => void;
}

interface CrumbItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  isCurrent?: boolean;
}

export const InteractiveBreadcrumbs: React.FC<InteractiveBreadcrumbsProps> = ({
  activeTab,
  extrusionSubTab = 'dashboard',
  dashboardSubTab = 'summary',
  ribbonSubTab = 'dashboard',
  ribbonDashboardSubTab = 'summary',
  personnelSubView = 'board',
  maintenanceSubTab = 'requests',
  onNavigateTab
}) => {
  const crumbs: CrumbItem[] = [
    {
      label: 'Início',
      icon: <Home size={13} className="text-slate-500 group-hover:text-blue-600 transition-colors" />,
      onClick: () => onNavigateTab('home'),
      isCurrent: activeTab === 'home'
    }
  ];

  if (activeTab === 'extrusion') {
    crumbs.push({
      label: 'Extrusão',
      icon: <Factory size={13} className="text-blue-600" />,
      onClick: () => onNavigateTab('extrusion', 'dashboard', 'summary'),
      isCurrent: !extrusionSubTab || extrusionSubTab === 'dashboard'
    });

    if (extrusionSubTab === 'dashboard') {
      const subLabels: Record<string, string> = {
        summary: 'Painel Resumo',
        comparison: 'Comparativo de Metas',
        shift: 'Produção por Turno',
        ranking: 'Ranking de Produtividade'
      };
      if (dashboardSubTab && dashboardSubTab !== 'summary') {
        crumbs.push({
          label: subLabels[dashboardSubTab] || dashboardSubTab,
          isCurrent: true
        });
      }
    } else if (extrusionSubTab === 'charts') {
      crumbs.push({ label: 'Gráficos de Produção', icon: <BarChart3 size={13} />, isCurrent: true });
    } else if (extrusionSubTab === 'stops') {
      crumbs.push({ label: 'Paradas de Máquina', icon: <Activity size={13} />, isCurrent: true });
    } else if (extrusionSubTab === 'entries') {
      crumbs.push({ label: 'Histórico de Apontamentos', icon: <Layers size={13} />, isCurrent: true });
    } else if (extrusionSubTab === 'calculator') {
      crumbs.push({ label: 'Calculadora CAST 1', icon: <Calculator size={13} />, isCurrent: true });
    }
  } else if (activeTab === 'ribbon') {
    crumbs.push({
      label: 'Corte de Fita',
      icon: <Scissors size={13} className="text-cyan-600" />,
      onClick: () => onNavigateTab('ribbon', 'dashboard', 'summary'),
      isCurrent: !ribbonSubTab || ribbonSubTab === 'dashboard'
    });

    if (ribbonSubTab === 'dashboard') {
      const ribbonSubLabels: Record<string, string> = {
        summary: 'Resumo Geral',
        comparison: 'Comparativo Máquinas',
        shift: 'Turnos',
        bi: 'Painel BI & Desempenho'
      };
      if (ribbonDashboardSubTab && ribbonDashboardSubTab !== 'summary') {
        crumbs.push({
          label: ribbonSubLabels[ribbonDashboardSubTab] || ribbonDashboardSubTab,
          isCurrent: true
        });
      }
    } else if (ribbonSubTab === 'productivity') {
      crumbs.push({ label: 'Produtividade Operador', isCurrent: true });
    } else if (ribbonSubTab === 'charts') {
      crumbs.push({ label: 'Gráficos & Métricas', isCurrent: true });
    } else if (ribbonSubTab === 'stops') {
      crumbs.push({ label: 'Paradas & Motivos', isCurrent: true });
    } else if (ribbonSubTab === 'entries') {
      crumbs.push({ label: 'Apontamentos Registrados', isCurrent: true });
    }
  } else if (activeTab === 'personnel') {
    crumbs.push({
      label: 'Pessoal',
      icon: <Users size={13} className="text-emerald-600" />,
      onClick: () => onNavigateTab('personnel', 'board'),
      isCurrent: personnelSubView === 'board'
    });

    const personnelLabels: Record<string, { label: string; icon: React.ReactNode }> = {
      vacations: { label: 'Programação de Férias', icon: <Calendar size={13} /> },
      training: { label: 'Treinamento Operacional', icon: <FileText size={13} /> },
      lunch: { label: 'Escala de Almoço', icon: <Clock size={13} /> },
      overtime: { label: 'Solicitação de Horas Extras (DOC 076)', icon: <Clock size={13} /> },
      evaluations: { label: 'Avaliação de Desempenho', icon: <Award size={13} /> }
    };

    if (personnelSubView && personnelSubView !== 'board' && personnelLabels[personnelSubView]) {
      crumbs.push({
        label: personnelLabels[personnelSubView].label,
        icon: personnelLabels[personnelSubView].icon,
        isCurrent: true
      });
    }
  } else if (activeTab === 'evaluations') {
    crumbs.push({
      label: 'Avaliações de Desempenho',
      icon: <Award size={13} className="text-purple-600" />,
      isCurrent: true
    });
  } else if (activeTab === 'maintenance') {
    crumbs.push({
      label: 'Manutenção',
      icon: <Wrench size={13} className="text-orange-600" />,
      onClick: () => onNavigateTab('maintenance', 'requests'),
      isCurrent: maintenanceSubTab === 'requests'
    });

    if (maintenanceSubTab === 'causes') {
      crumbs.push({
        label: 'Causas & Indicadores de Quebra',
        icon: <Activity size={13} />,
        isCurrent: true
      });
    }
  } else if (activeTab === 'projection') {
    crumbs.push({
      label: 'Projeção TV Industrial',
      icon: <Tv size={13} className="text-indigo-600" />,
      isCurrent: true
    });
  }

  return (
    <nav
      aria-label="Trilha de Navegação"
      className="w-full flex items-center justify-between py-0.5 sm:py-1 px-1 sm:px-1.5 text-xs select-none no-print overflow-hidden"
    >
      <ol className="flex items-center flex-wrap gap-1 sm:gap-1.5 min-w-0">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <li key={idx} className="flex items-center gap-1 sm:gap-1.5 min-w-0">
              {idx > 0 && (
                <ChevronRight size={12} className="text-slate-300 shrink-0 select-none" />
              )}
              {isLast || !crumb.onClick ? (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black tracking-tight truncate ${
                    isLast
                      ? 'bg-blue-50 text-blue-800 border border-blue-200/80 shadow-2xs font-extrabold'
                      : 'text-slate-600 font-bold'
                  }`}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {crumb.icon}
                  <span className="truncate">{crumb.label}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={crumb.onClick}
                  className="group inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer truncate active:scale-95"
                  title={`Ir para ${crumb.label}`}
                >
                  {crumb.icon}
                  <span className="truncate">{crumb.label}</span>
                </button>
              )}
            </li>
          );
        })}
      </ol>

      <div className="hidden sm:flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 ml-3">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="hidden md:inline">Painel Conectado</span>
      </div>
    </nav>
  );
};
