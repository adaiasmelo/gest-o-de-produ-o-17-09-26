import React, { useState, useMemo } from 'react';
import {
  Activity,
  Factory,
  Users,
  Clock,
  Wrench,
  ShieldCheck,
  Flame,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calculator,
  Tv,
  FileText,
  UserPlus,
  Plus,
  Presentation,
  Copy,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  LayoutGrid,
  Sparkles,
  Smartphone,
  Download,
  Info,
  Scissors
} from 'lucide-react';
import { ProductionEntry, RibbonCuttingEntry, Employee, Collaborator } from '../types';
import { GOAL_VALUE } from '../constants';
import { getRibbonTotalGoal, calcJumboUnits, formatJumboUnits } from '../utils/ribbonGoalsUtils';

export interface IndustrialBentoGridProps {
  productionData: ProductionEntry[];
  ribbonEntries: RibbonCuttingEntry[];
  goals: Record<string, number>;
  ribbonGoals?: Record<string, any>;
  dashboardMonth: string;
  filterDay?: string;
  collaborators: Collaborator[];
  employees: Employee[];
  isAdmin: boolean;
  userPerms: any;
  isReadOnlyAccount: boolean;
  canViewWeeklySummary: boolean;
  isOnline: boolean;
  isStandalone: boolean;
  systemCoverImage: string | null;
  onNavigateTab: (
    tab: 'home' | 'extrusion' | 'ribbon' | 'personnel' | 'evaluations' | 'maintenance' | 'projection',
    subTab?: string,
    subSubTab?: string
  ) => void;
  onOpenModal: (modalName: string, payload?: any) => void;
  onInstallClick?: () => void;
  setMaintenanceSubTab: (subTab: 'requests' | 'causes') => void;
  setMaintenanceInitialCreateOpen: (val: boolean) => void;
}

export const IndustrialBentoGrid: React.FC<IndustrialBentoGridProps> = ({
  productionData,
  ribbonEntries,
  goals,
  ribbonGoals,
  dashboardMonth,
  filterDay,
  collaborators,
  employees,
  isAdmin,
  userPerms,
  isReadOnlyAccount,
  canViewWeeklySummary,
  isOnline,
  isStandalone,
  systemCoverImage,
  onNavigateTab,
  onOpenModal,
  onInstallClick,
  setMaintenanceSubTab,
  setMaintenanceInitialCreateOpen
}) => {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Data de referência do Dia: sempre a produção do dia anterior (ontem) por padrão,
  // pois a fábrica opera com apontamentos lançados no dia posterior (ex: se hoje é dia 28, a referência é dia 27).
  const activeDay = useMemo(() => {
    if (filterDay && filterDay.trim()) {
      return filterDay.trim();
    }
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, [filterDay]);

  const activeDayFormatted = useMemo(() => {
    if (!activeDay) return '';
    const parts = activeDay.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return activeDay;
  }, [activeDay]);

  // Dia anterior à data de referência (para cálculo de tendência percentual diária)
  const previousDayStr = useMemo(() => {
    if (!activeDay) return '';
    const parts = activeDay.split('-');
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      d.setDate(d.getDate() - 1);
      const prevY = d.getFullYear();
      const prevM = String(d.getMonth() + 1).padStart(2, '0');
      const prevD = String(d.getDate()).padStart(2, '0');
      return `${prevY}-${prevM}-${prevD}`;
    }
    return '';
  }, [activeDay]);

  // Cálculos de Produção Real & Métricas
  const metrics = useMemo(() => {
    let todayNet = 0;
    let yesterdayNet = 0;
    let monthNet = 0;
    let eremaMonthNet = 0;
    let eremaYesterdayNet = 0;
    let todayWastes = 0;
    let todayGross = 0;
    let todayStopsMin = 0;

    // Máquinas de Extrusão (Apenas CAST 1 e CAST 2 - não existe CAST 3)
    const machineTodayNet: Record<string, number> = {
      'CAST 1': 0,
      'CAST 2': 0,
      'Erema': 0
    };

    // Máquinas de Corte de Fita (Lintech, Ghezzi, Wultec)
    const ribbonMachineToday: Record<string, { m2: number; rolls: number }> = {
      'Lintech': { m2: 0, rolls: 0 },
      'Ghezzi': { m2: 0, rolls: 0 },
      'Wultec': { m2: 0, rolls: 0 }
    };

    // Processar Extrusão & Reciclagem Erema
    productionData.forEach((entry) => {
      const net = entry.netWeight || 0;
      const waste = (entry.ecoA || 0) + (entry.ecoBP || 0) + (entry.ecoBM || 0) + (entry.borraTotal || 0);
      const gross = entry.grossWeight || (net + waste);
      const stops = (entry.manutencaoMin || 0) + (entry.processoMin || 0) + (entry.outrosMin || 0);
      const isErema = (entry.machine || '').toLowerCase().includes('erema');

      // Produção do Mês
      if (entry.date && entry.date.startsWith(dashboardMonth)) {
        if (!isErema) {
          monthNet += net;
        } else {
          eremaMonthNet += net;
        }
      }

      // Produção do Dia Ativo
      if (entry.date === activeDay) {
        if (!isErema) {
          todayNet += net;
        }
        todayWastes += waste;
        todayGross += gross;
        todayStopsMin += stops;

        const mNorm = (entry.machine || '').toUpperCase();
        if (mNorm.includes('CAST 1') || mNorm.includes('CAST1')) {
          machineTodayNet['CAST 1'] += net;
        } else if (mNorm.includes('CAST 2') || mNorm.includes('CAST2')) {
          machineTodayNet['CAST 2'] += net;
        } else if (isErema) {
          machineTodayNet['Erema'] += net;
        }
      }

      // Produção do dia anterior (para cálculo de evolução/tendência)
      if (entry.date === previousDayStr) {
        if (!isErema) {
          yesterdayNet += net;
        } else {
          eremaYesterdayNet += net;
        }
      }
    });

    // Processar Corte de Fita (Dia, Mês e Tendência - Independente de Máquina e Consolidado Geral)
    let ribbonTodayNet = 0;
    let ribbonTodayRolls = 0;
    let ribbonYesterdayNet = 0;
    let ribbonMonthNet = 0;
    let ribbonMonthRolls = 0;

    ribbonEntries.forEach((r) => {
      const m2 = r.producedM2 || 0;
      const rolls = r.rollsCount || 0;

      // Acumulado do Mês (independente da máquina)
      if (r.date && r.date.startsWith(dashboardMonth)) {
        ribbonMonthNet += m2;
        ribbonMonthRolls += rolls;
      }

      // Produção do Dia Ativo (independente da máquina)
      if (r.date === activeDay) {
        ribbonTodayNet += m2;
        ribbonTodayRolls += rolls;

        const m = (r.machine || '').toLowerCase();
        if (m.includes('lintech') || m.includes('lintec')) {
          ribbonMachineToday['Lintech'].m2 += m2;
          ribbonMachineToday['Lintech'].rolls += rolls;
        } else if (m.includes('ghezzi') || m.includes('ghezze') || m.includes('gehl')) {
          ribbonMachineToday['Ghezzi'].m2 += m2;
          ribbonMachineToday['Ghezzi'].rolls += rolls;
        } else if (m.includes('wultec') || m.includes('wutec')) {
          ribbonMachineToday['Wultec'].m2 += m2;
          ribbonMachineToday['Wultec'].rolls += rolls;
        } else {
          ribbonMachineToday['Lintech'].m2 += m2;
          ribbonMachineToday['Lintech'].rolls += rolls;
        }
      }

      // Produção do dia anterior (para cálculo de evolução/tendência)
      if (r.date === previousDayStr) {
        ribbonYesterdayNet += m2;
      }
    });

    // Metas de Extrusão (Garantir valor padrão de 1.200.000 kg se a meta ainda não estiver cadastrada no mês)
    const currentMonthGoal = goals[dashboardMonth] || GOAL_VALUE || 1200000;
    const goalPercentage = currentMonthGoal > 0 ? (monthNet / currentMonthGoal) * 100 : 0;

    // Tendência vs Dia Anterior (Extrusão)
    let trendPercent = 0;
    if (yesterdayNet > 0) {
      trendPercent = ((todayNet - yesterdayNet) / yesterdayNet) * 100;
    }

    // Metas de Corte de Fita (Consolidado Global de Todas as Cortadeiras)
    const ribbonMonthGoal = getRibbonTotalGoal(ribbonGoals, dashboardMonth);
    const ribbonGoalPercentage = ribbonMonthGoal > 0 ? (ribbonMonthNet / ribbonMonthGoal) * 100 : 0;

    // Tendência vs Dia Anterior (Corte de Fita)
    let ribbonTrendPercent = 0;
    if (ribbonYesterdayNet > 0) {
      ribbonTrendPercent = ((ribbonTodayNet - ribbonYesterdayNet) / ribbonYesterdayNet) * 100;
    }

    // Tendência vs Dia Anterior (Erema)
    let eremaTrendPercent = 0;
    if (eremaYesterdayNet > 0) {
      eremaTrendPercent = ((machineTodayNet['Erema'] - eremaYesterdayNet) / eremaYesterdayNet) * 100;
    }

    // % Refugo hoje
    const wastePercent = todayGross > 0 ? (todayWastes / todayGross) * 100 : 0;

    return {
      todayNet,
      yesterdayNet,
      monthNet,
      eremaMonthNet,
      eremaYesterdayNet,
      eremaTrendPercent,
      todayWastes,
      wastePercent,
      todayStopsMin,
      currentMonthGoal,
      goalPercentage,
      trendPercent,
      machineTodayNet,
      ribbonMachineToday,
      ribbonTodayNet,
      ribbonTodayRolls,
      ribbonYesterdayNet,
      ribbonMonthNet,
      ribbonMonthRolls,
      ribbonMonthGoal,
      ribbonGoalPercentage,
      ribbonTrendPercent
    };
  }, [productionData, ribbonEntries, goals, ribbonGoals, dashboardMonth, activeDay, previousDayStr]);

  // Contagem de Colaboradores Reais
  const workforce = useMemo(() => {
    const activeEmps = employees.filter((e) => {
      const s = (e.status || '').toLowerCase();
      return !s.includes('excluid') && !s.includes('desligad') && !s.includes('vaga');
    });

    const brigadistas = collaborators.filter((c) => c.isBrigadista).length;

    return {
      totalActive: activeEmps.length,
      brigadistas
    };
  }, [employees, collaborators]);

  const copyToClipboard = (link: string, key: string, label: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(link).then(() => {
        setCopiedLink(key);
        setTimeout(() => setCopiedLink(null), 3000);
      });
    } else {
      window.prompt(`Copie o link de ${label} abaixo:`, link);
    }
  };

  // Formatação de peso para máquinas de extrusão/reciclagem:
  // Se < 1000 kg: exibe em quilos com a sigla 'kg' (ex: 850 kg ou 0 kg)
  // Se >= 1000 kg: exibe em toneladas com a sigla 't' (ex: 1 t, 1,25 t, 18,234 t)
  const formatMachineWeight = (weightKg: number): string => {
    if (!weightKg || weightKg <= 0) return '0 kg';
    if (weightKg < 1000) {
      return `${weightKg.toLocaleString('pt-BR')} kg`;
    }
    const tons = weightKg / 1000;
    return `${tons.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} t`;
  };

  return (
    <div className="space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
      {/* Barra Superior Centro de Comando */}
      <div className="bg-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-blue-200">
            <LayoutGrid size={16} />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-black uppercase text-slate-800 tracking-tight flex items-center gap-2">
              Centro de Comando Industrial
              <span className="hidden sm:inline px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
                Geral & Chão de Fábrica
              </span>
            </h2>
            <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider leading-none mt-0.5">
              Painel Integrado • Fábrica em Tempo Real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[9.5px] sm:text-[10px] font-black uppercase text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            Referência: {activeDayFormatted} • Mês: {dashboardMonth.split('-').reverse().join('/')}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BENTO GRID INDUSTRIAL V2                                                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4.5 items-start">
        {/* ======================================================================= */}
        {/* COLUNA ESQUERDA: CARD 1 PRODUÇÃO DIÁRIA & MENSAL (DIVIDIDO AO MEIO)     */}
        {/* ======================================================================= */}
        <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white p-3.5 sm:p-4.5 rounded-3xl shadow-lg shadow-blue-500/15 border border-blue-400/40 relative overflow-hidden flex flex-col space-y-3">
          <div className="absolute -right-8 -bottom-8 w-56 h-56 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          {/* Cabeçalho Superior do Card */}
          <div className="flex items-center justify-between gap-2 border-b border-white/20 pb-2">
            <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 text-white border border-white/20 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              Produção Diária & Mensal Consolidada
            </span>
            <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-black uppercase text-blue-100">
              <span>Dia: {activeDayFormatted}</span>
              <span>•</span>
              <span>Mês: {dashboardMonth.split('-').reverse().join('/')}</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PARTE 1 (METADE SUPERIOR): SETOR DE EXTRUSÃO & RECICLAGEM EREMA           */}
          {/* ========================================================================= */}
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-white/20 space-y-2.5 shadow-xs">
            {/* Header Extrusão */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0">
                  <Factory size={13} />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5 truncate">
                    Setor de Extrusão Stretch
                    <span className="text-[9px] font-bold text-blue-100 normal-case">(Cast 1 & Cast 2)</span>
                  </span>
                </div>
              </div>
              <span className="text-[9px] sm:text-[10px] font-black uppercase text-blue-900 bg-white/90 px-2 py-0.5 rounded-full shadow-xs whitespace-nowrap">
                Meta: {(metrics.currentMonthGoal / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} t
              </span>
            </div>

            {/* Métricas Extrusão: Dia e Mês */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
              {/* Dia Extrusão */}
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-blue-100 truncate">
                  Produção do Dia
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg sm:text-2xl font-black tracking-tight text-white truncate">
                    {metrics.todayNet < 1000
                      ? `${metrics.todayNet.toLocaleString('pt-BR')} `
                      : `${(metrics.todayNet / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} `}
                  </span>
                  <span className="text-xs font-bold text-blue-100">
                    {metrics.todayNet < 1000 ? 'kg' : 't'}
                  </span>
                </div>
                {metrics.yesterdayNet > 0 && (
                  <div className="flex items-center gap-1 mt-0.5 text-[9px] font-black">
                    {metrics.trendPercent >= 0 ? (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-emerald-400/30 text-emerald-100 border border-emerald-300/30">
                        <TrendingUp size={10} /> +{metrics.trendPercent.toFixed(1)}% vs dia ant.
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-400/30 text-amber-100 border border-amber-300/30">
                        <TrendingDown size={10} /> {metrics.trendPercent.toFixed(1)}% vs dia ant.
                      </span>
                    )}
                  </div>
                )}
                <p className="text-[9px] text-blue-100 font-semibold mt-1 truncate">
                  Cast 1: {formatMachineWeight(metrics.machineTodayNet['CAST 1'])} • Cast 2: {formatMachineWeight(metrics.machineTodayNet['CAST 2'])}
                </p>
              </div>

              {/* Mês Extrusão */}
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-blue-100 truncate">
                  Acumulado do Mês
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg sm:text-2xl font-black tracking-tight text-white truncate">
                    {(metrics.monthNet / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                  </span>
                  <span className="text-xs font-bold text-blue-100">t</span>
                </div>
              </div>
            </div>

            {/* Barra de Progresso Meta Extrusão */}
            <div className="pt-1.5 border-t border-white/20">
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-black uppercase tracking-wider mb-1">
                <span className="text-blue-100">Atingimento da Meta Extrusão</span>
                <span className="text-emerald-200 font-extrabold text-[10px] sm:text-xs">
                  {metrics.goalPercentage.toFixed(1)}% de {(metrics.currentMonthGoal / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} t
                </span>
              </div>
              <div className="w-full h-2 bg-black/25 rounded-full overflow-hidden p-0.5 border border-white/25">
                <div
                  className="h-full bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-200 rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${Math.min(metrics.goalPercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Linha Erema (Reciclagem & Recuperadora) */}
            <div className="bg-emerald-950/25 border border-emerald-300/30 rounded-xl p-2 sm:p-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-5 h-5 rounded-md bg-emerald-400/30 border border-emerald-300/40 flex items-center justify-center text-emerald-200 shrink-0">
                  <Flame size={11} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase text-emerald-100 truncate block">
                    Erema • Reciclagem & Recuperação
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:gap-4 shrink-0 text-right">
                <div>
                  <span className="text-[8px] sm:text-[9px] font-bold text-emerald-200 uppercase block">Dia</span>
                  <span className="text-xs sm:text-sm font-extrabold text-white">
                    {formatMachineWeight(metrics.machineTodayNet['Erema'])}
                  </span>
                </div>
                <div className="h-5 w-px bg-emerald-400/30" />
                <div>
                  <span className="text-[8px] sm:text-[9px] font-bold text-emerald-200 uppercase block">Mês</span>
                  <span className="text-xs sm:text-sm font-extrabold text-emerald-200">
                    {formatMachineWeight(metrics.eremaMonthNet)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PARTE 2 (METADE INFERIOR): SETOR DE CORTE DE FITA (TODAS AS MÁQUINAS)     */}
          {/* ========================================================================= */}
          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-white/20 space-y-2.5 shadow-xs">
            {/* Header Corte de Fita */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-cyan-400/30 border border-cyan-300/40 flex items-center justify-center text-cyan-100 shrink-0">
                  <Scissors size={13} />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5 truncate">
                    Setor de Corte de Fita
                    <span className="text-[9px] font-bold text-cyan-100 normal-case">(Consolidado - Todas as Máquinas)</span>
                  </span>
                </div>
              </div>
              <span className="text-[9px] sm:text-[10px] font-black uppercase text-cyan-900 bg-white/90 px-2 py-0.5 rounded-full shadow-xs whitespace-nowrap">
                Meta: {metrics.ribbonMonthGoal.toLocaleString('pt-BR')} m²
              </span>
            </div>

            {/* Métricas Corte de Fita: Dia e Mês */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
              {/* Dia Fita */}
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-cyan-100 truncate">
                  Produção do Dia
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg sm:text-2xl font-black tracking-tight text-white truncate">
                    {metrics.ribbonTodayNet.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                  </span>
                  <span className="text-xs font-bold text-cyan-100">m²</span>
                </div>
                {metrics.ribbonYesterdayNet > 0 && (
                  <div className="flex items-center gap-1 mt-0.5 text-[9px] font-black">
                    {metrics.ribbonTrendPercent >= 0 ? (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-emerald-400/30 text-emerald-100 border border-emerald-300/30">
                        <TrendingUp size={10} /> +{metrics.ribbonTrendPercent.toFixed(1)}% vs dia ant.
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-400/30 text-amber-100 border border-amber-300/30">
                        <TrendingDown size={10} /> {metrics.ribbonTrendPercent.toFixed(1)}% vs dia ant.
                      </span>
                    )}
                  </div>
                )}
                <p className="text-[9px] text-cyan-100 font-semibold mt-1 truncate">
                  {metrics.ribbonTodayRolls.toLocaleString('pt-BR')} rolos • {formatJumboUnits(calcJumboUnits(metrics.ribbonTodayNet))}
                </p>
              </div>

              {/* Mês Fita */}
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-cyan-100 truncate">
                  Acumulado do Mês
                </p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-lg sm:text-2xl font-black tracking-tight text-white truncate">
                    {metrics.ribbonMonthNet.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-xs font-bold text-cyan-100">m²</span>
                </div>
                <p className="text-[9px] sm:text-[10px] font-bold text-cyan-100 mt-1 truncate">
                  {metrics.ribbonMonthRolls.toLocaleString('pt-BR')} rolos • {formatJumboUnits(calcJumboUnits(metrics.ribbonMonthNet))}
                </p>
              </div>
            </div>

            {/* Barra de Progresso Meta Fita */}
            <div className="pt-1.5 border-t border-white/20">
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-black uppercase tracking-wider mb-1">
                <span className="text-cyan-100">Atingimento da Meta Fita</span>
                <span className="text-cyan-200 font-extrabold text-[10px] sm:text-xs">
                  {metrics.ribbonGoalPercentage.toFixed(1)}% de {metrics.ribbonMonthGoal.toLocaleString('pt-BR')} m²
                </span>
              </div>
              <div className="w-full h-2 bg-black/25 rounded-full overflow-hidden p-0.5 border border-white/25">
                <div
                  className="h-full bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-200 rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${Math.min(metrics.ribbonGoalPercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Detalhamento compacto das cortadeiras no dia */}
            <div className="flex items-center justify-between text-[8px] sm:text-[9px] text-cyan-100 font-semibold pt-0.5">
              <span>Lintech: {metrics.ribbonMachineToday['Lintech']?.m2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m²</span>
              <span>•</span>
              <span>Ghezzi: {metrics.ribbonMachineToday['Ghezzi']?.m2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m²</span>
              <span>•</span>
              <span>Wultec: {metrics.ribbonMachineToday['Wultec']?.m2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m²</span>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* COLUNA DIREITA: CARD MÁQUINAS + 2 CARDS PEQUENOS EMBAIXO               */}
        {/* ======================================================================= */}
        <div className="flex flex-col space-y-3.5 sm:space-y-4">
          {/* CARD DE MÁQUINAS (ALTURA NATURAL, HARMONIOSA) */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Factory size={16} className="text-blue-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Máquinas em Operação
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
                    Dia: {activeDayFormatted}
                  </span>
                </div>
              </div>

              {/* Lista em 2 Colunas (3 máquinas na coluna 1 e 3 máquinas na coluna 2) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                {/* COLUNA 1: EXTRUSÃO & RECICLAGEM (CAST 1, CAST 2, EREMA) */}
                <div className="space-y-2">
                  {/* CAST 1 */}
                  <div
                    onClick={() => onNavigateTab('extrusion', 'dashboard', 'summary')}
                    className="p-2 sm:p-2.5 rounded-2xl bg-slate-50 hover:bg-blue-50/70 border border-slate-100 transition-all cursor-pointer flex items-center justify-between active:scale-98"
                    title="Extrusora CAST 1 • Clique para ver apontamentos"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          metrics.machineTodayNet['CAST 1'] > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 leading-tight">CAST 1</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Extrusora Stretch</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-blue-700 whitespace-nowrap ml-2">
                      {formatMachineWeight(metrics.machineTodayNet['CAST 1'])}
                    </span>
                  </div>

                  {/* CAST 2 */}
                  <div
                    onClick={() => onNavigateTab('extrusion', 'dashboard', 'summary')}
                    className="p-2 sm:p-2.5 rounded-2xl bg-slate-50 hover:bg-blue-50/70 border border-slate-100 transition-all cursor-pointer flex items-center justify-between active:scale-98"
                    title="Extrusora CAST 2 • Clique para ver apontamentos"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          metrics.machineTodayNet['CAST 2'] > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 leading-tight">CAST 2</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Extrusora Stretch</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-blue-700 whitespace-nowrap ml-2">
                      {formatMachineWeight(metrics.machineTodayNet['CAST 2'])}
                    </span>
                  </div>

                  {/* Erema */}
                  <div
                    onClick={() => onNavigateTab('extrusion', 'dashboard', 'summary')}
                    className="p-2 sm:p-2.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-100 transition-all cursor-pointer flex items-center justify-between active:scale-98"
                    title="Recuperadora Erema • Clique para ver balanço de massa e ciclo Eco B"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          metrics.machineTodayNet['Erema'] > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 leading-tight">Erema</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Reciclagem</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-700 whitespace-nowrap ml-2">
                      {formatMachineWeight(metrics.machineTodayNet['Erema'])}
                    </span>
                  </div>
                </div>

                {/* COLUNA 2: CORTE DE FITA (LINTECH, GHEZZI, WULTEC) */}
                <div className="space-y-2">
                  {/* Lintech */}
                  <div
                    onClick={() => onNavigateTab('ribbon', 'dashboard', 'summary')}
                    className="p-2 sm:p-2.5 rounded-2xl bg-slate-50 hover:bg-cyan-50/70 border border-slate-100 transition-all cursor-pointer flex items-center justify-between active:scale-98"
                    title="Cortadeira Lintech • Clique para ver corte de fita"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          metrics.ribbonMachineToday['Lintech']?.m2 > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 leading-tight">Lintech</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Corte de Fita</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-cyan-700 whitespace-nowrap ml-2">
                      {metrics.ribbonMachineToday['Lintech']?.m2 > 0
                        ? `${metrics.ribbonMachineToday['Lintech'].m2.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m²`
                        : '0 m²'}
                    </span>
                  </div>

                  {/* Ghezzi */}
                  <div
                    onClick={() => onNavigateTab('ribbon', 'dashboard', 'summary')}
                    className="p-2 sm:p-2.5 rounded-2xl bg-slate-50 hover:bg-cyan-50/70 border border-slate-100 transition-all cursor-pointer flex items-center justify-between active:scale-98"
                    title="Cortadeira Ghezzi • Clique para ver corte de fita"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          metrics.ribbonMachineToday['Ghezzi']?.m2 > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 leading-tight">Ghezzi</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Corte de Fita</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-cyan-700 whitespace-nowrap ml-2">
                      {metrics.ribbonMachineToday['Ghezzi']?.m2 > 0
                        ? `${metrics.ribbonMachineToday['Ghezzi'].m2.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m²`
                        : '0 m²'}
                    </span>
                  </div>

                  {/* Wultec */}
                  <div
                    onClick={() => onNavigateTab('ribbon', 'dashboard', 'summary')}
                    className="p-2 sm:p-2.5 rounded-2xl bg-slate-50 hover:bg-cyan-50/70 border border-slate-100 transition-all cursor-pointer flex items-center justify-between active:scale-98"
                    title="Cortadeira Wultec • Clique para ver corte de fita"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          metrics.ribbonMachineToday['Wultec']?.m2 > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 leading-tight">Wultec</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Corte de Fita</p>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-cyan-700 whitespace-nowrap ml-2">
                      {metrics.ribbonMachineToday['Wultec']?.m2 > 0
                        ? `${metrics.ribbonMachineToday['Wultec'].m2.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m²`
                        : '0 m²'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onOpenModal('cast1_calculator')}
                className="py-2 px-1.5 sm:px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
              >
                <Calculator size={12} />
                <span className="truncate">Calc CAST 1</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('extrusion', 'dashboard', 'summary')}
                className="py-2 px-1.5 sm:px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
              >
                <Factory size={12} />
                <span className="truncate">Extrusão</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('ribbon', 'dashboard', 'summary')}
                className="py-2 px-1.5 sm:px-2 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
              >
                <Scissors size={12} />
                <span className="truncate">Corte de Fita</span>
              </button>
            </div>
          </div>

          {/* DOIS CARDS EMBAIXO DO CARD DE MÁQUINAS: REFUGOS & PERDAS + PARADAS DE MÁQUINA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* CARD: REFUGOS & BALANÇO DE MASSA */}
            <div className="bg-white p-4 sm:p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Refugo & Perdas
                  </span>
                  <Flame size={15} className="text-rose-500" />
                </div>

                <div className="my-1.5">
                  <p className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                    {metrics.todayWastes.toLocaleString('pt-BR')}{' '}
                    <span className="text-xs font-bold text-slate-400">kg</span>
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        metrics.wastePercent <= 5
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : metrics.wastePercent <= 8
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      Índice: {metrics.wastePercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigateTab('extrusion', 'charts')}
                className="mt-2.5 w-full py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
              >
                <BarChart3 size={12} />
                <span>Ver Balanço BI</span>
              </button>
            </div>

            {/* CARD: PARADAS DE MÁQUINA */}
            <div className="bg-white p-4 sm:p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">
                    Paradas ({activeDayFormatted})
                  </span>
                  <Wrench size={15} className="text-orange-500 shrink-0" />
                </div>

                <div className="my-1.5">
                  <p className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                    {metrics.todayStopsMin}{' '}
                    <span className="text-xs font-bold text-slate-400">min</span>
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                    {(metrics.todayStopsMin / 60).toFixed(1)}h no dia
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setMaintenanceSubTab('requests');
                    setMaintenanceInitialCreateOpen(false);
                    onNavigateTab('maintenance');
                  }}
                  className="flex-1 py-1.5 px-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center cursor-pointer active:scale-95 border border-orange-200"
                >
                  Abrir OS
                </button>
                <button
                  type="button"
                  onClick={() => onOpenModal('downtime_analytics')}
                  className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center cursor-pointer active:scale-95 shadow-sm"
                >
                  BI Paradas
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LINHA SECUNDÁRIA: EQUIPE & CORTE DE FITA RESUMO                           */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4.5">
        {/* CARD: FORÇA DE TRABALHO & RH (Colaboradores & DOC 076) */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Equipe & DOC 076
              </span>
              <Users size={16} className="text-emerald-600" />
            </div>

            <div className="flex items-center justify-between gap-3 my-2">
              <div>
                <p className="text-2xl font-black text-slate-800 tracking-tight">
                  {workforce.totalActive}{' '}
                  <span className="text-xs font-bold text-slate-400">Ativos</span>
                </p>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                  {workforce.brigadistas} brigadistas no quadro geral
                </p>
              </div>

              {/* Destaque DOC 076 com Fechamento dia 24 */}
              <div className="p-2.5 px-3 bg-amber-50 rounded-2xl border border-amber-200/70 text-amber-900">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase">
                  <Clock size={12} className="text-amber-700" />
                  <span>Horas Extras (DOC 076)</span>
                </div>
                <p className="text-[9px] font-bold text-amber-700/80 mt-0.5">
                  Fechamento automático no dia 24.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onNavigateTab('personnel', 'board')}
              className="flex-1 py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center cursor-pointer active:scale-95"
            >
              Quadro Geral
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('personnel', 'overtime')}
              className="flex-1 py-2 px-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center cursor-pointer active:scale-95 shadow-sm"
            >
              DOC 076
            </button>
          </div>
        </div>

        {/* CARD: CORTE DE FITA (Resumo Rápido) */}
        <div className="bg-white p-4.5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Corte de Fita do Dia
              </span>
              <span className="text-[9px] font-black bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full border border-cyan-200">
                Lintech • Ghezzi • Wultec
              </span>
            </div>

            <div className="my-2">
              <p className="text-2xl font-black text-slate-800 tracking-tight">
                {metrics.ribbonTodayNet.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{' '}
                <span className="text-xs font-bold text-slate-400">m²</span>
              </p>
              <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                Produção total registrada no dia {activeDayFormatted}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('ribbon', 'dashboard', 'summary')}
            className="mt-2 w-full py-2 px-3 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 border border-cyan-200/60"
          >
            <span>Ver Painel Corte de Fita</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* AÇÕES OPERACIONAIS DE CHÃO DE FÁBRICA (Fixo junto com Geral Executivo)    */}
      {/* ========================================================================= */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">
              Ações Operacionais de Chão de Fábrica
            </span>
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            Acesso Rápido Integrado
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {(isAdmin || (userPerms.personnel.enabled && userPerms.personnel.manage && !isReadOnlyAccount)) && (
              <button
                onClick={() => onOpenModal('collaborator')}
                className="bg-blue-600 p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] text-white flex flex-col items-center gap-2 sm:gap-3 md:gap-4 shadow-lg shadow-blue-100 active:scale-95 transition-all group cursor-pointer"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserPlus className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-widest text-center leading-snug">
                  Cadastrar Colaborador
                </span>
              </button>
            )}

            {(isAdmin || (userPerms.personnel.enabled && userPerms.personnel.overtime)) && (
              <button
                onClick={() => onNavigateTab('personnel', 'overtime')}
                className="bg-white p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] border border-slate-100 text-slate-800 flex flex-col items-center gap-2 sm:gap-3 md:gap-4 shadow-sm active:scale-95 transition-all group cursor-pointer hover:border-amber-200"
                title="Abrir Solicitação de Hora Extra (DOC 076)"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-amber-50 text-amber-600 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-amber-600" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-widest text-slate-500 text-center leading-snug">
                  Solicitação de Hora Extra
                </span>
              </button>
            )}

            {(isAdmin || (userPerms.maintenance.enabled && (userPerms.maintenance.requests || userPerms.maintenance.newRequest))) && (
              <button
                onClick={() => {
                  setMaintenanceSubTab('requests');
                  setMaintenanceInitialCreateOpen(false);
                  onNavigateTab('maintenance');
                }}
                className="bg-white p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] border border-slate-100 text-slate-800 flex flex-col items-center gap-2 sm:gap-3 md:gap-4 shadow-sm active:scale-95 transition-all group cursor-pointer hover:border-blue-200"
                title="Abrir Novo Fluxo de Solicitação de Manutenção"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-blue-50 text-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Wrench className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-blue-600" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-widest text-slate-500 text-center leading-snug">
                  Solicitação de Manutenção
                </span>
              </button>
            )}

            {(isAdmin || (userPerms.personnel.enabled && userPerms.personnel.training)) && (
              <button
                onClick={() => onOpenModal('training')}
                className="bg-white p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] border border-slate-100 text-slate-800 flex flex-col items-center gap-2 sm:gap-3 md:gap-4 shadow-sm active:scale-95 transition-all group cursor-pointer"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-slate-50 text-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-widest text-slate-500 text-center leading-snug">
                  Treinamento / DDP
                </span>
              </button>
            )}

            {(isAdmin || ((userPerms.extrusion.enabled || userPerms.ribbon.enabled) && canViewWeeklySummary)) && (
              <button
                onClick={() => onOpenModal('weekly_summary')}
                className="bg-gradient-to-br from-blue-600 to-indigo-700 p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] text-white flex flex-col items-center gap-2 sm:gap-3 md:gap-4 shadow-lg shadow-blue-200/50 border border-blue-400/30 active:scale-95 transition-all group cursor-pointer"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Presentation className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-amber-300 animate-pulse" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-widest text-center leading-snug">
                  Resumo Semanal (Reunião)
                </span>
              </button>
            )}

            {(isAdmin || ((userPerms.extrusion.enabled && userPerms.extrusion.comparison) || (userPerms.maintenance.enabled && userPerms.maintenance.causes))) && (
              <button
                onClick={() => onOpenModal('downtime_analytics')}
                className="bg-gradient-to-br from-slate-900 to-blue-950 p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] text-white flex flex-col items-center gap-2 sm:gap-3 md:gap-4 shadow-lg shadow-slate-900/20 border border-blue-500/30 active:scale-95 transition-all group cursor-pointer"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-blue-500/20 text-blue-400 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-widest text-center leading-snug">
                  Análise BI de Paradas
                </span>
              </button>
            )}

            {(isAdmin || userPerms.extrusion.enabled) && (
              <div className="bg-gradient-to-br from-indigo-900 to-blue-900 p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] text-white flex flex-col items-center justify-between gap-2.5 sm:gap-4 shadow-lg shadow-indigo-900/20 border border-indigo-400/30 group">
                <div
                  onClick={() => onOpenModal('cast1_calculator')}
                  className="flex flex-col items-center gap-2 sm:gap-3 md:gap-4 cursor-pointer active:scale-95 transition-transform w-full"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-indigo-500/20 text-indigo-300 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Calculator className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-widest text-center leading-snug">
                    Calculadora CAST 1
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    let link = 'https://gest-o-de-produ-o-2026.pages.dev/calculadora.html';
                    if (
                      typeof window !== 'undefined' &&
                      (window.location.origin.includes('gest-o-de-produ-o-2026.pages.dev') ||
                        window.location.origin.includes('pages.dev'))
                    ) {
                      link = `${window.location.origin}/calculadora.html`;
                    }
                    copyToClipboard(link, 'calc', 'Calculadora CAST 1');
                  }}
                  className="w-full py-1.5 px-2 bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-tight sm:tracking-wider flex items-center justify-center gap-1 transition-all border border-white/10 active:scale-95 cursor-pointer"
                >
                  <Copy size={11} />
                  <span>{copiedLink === 'calc' ? 'Copiado!' : 'Copiar Link Externo'}</span>
                </button>
              </div>
            )}

            {(isAdmin || userPerms.projection.enabled) && (
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] text-white flex flex-col items-center justify-between gap-2.5 sm:gap-4 shadow-lg shadow-indigo-950/30 border border-indigo-500/30 group">
                <div
                  onClick={() => onNavigateTab('projection')}
                  className="flex flex-col items-center gap-2 sm:gap-3 md:gap-4 cursor-pointer active:scale-95 transition-transform w-full"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-indigo-500/20 text-indigo-300 rounded-xl sm:rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Tv className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 animate-pulse" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tight sm:tracking-widest text-center leading-snug">
                    Projeção TV (Smart TV)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    let link = 'https://gest-o-de-produ-o-2026.pages.dev/tv';
                    if (
                      typeof window !== 'undefined' &&
                      (window.location.origin.includes('gest-o-de-produ-o-2026.pages.dev') ||
                        window.location.origin.includes('pages.dev'))
                    ) {
                      link = `${window.location.origin}/tv`;
                    }
                    copyToClipboard(link, 'tv2', 'Smart TV');
                  }}
                  className="w-full py-1.5 px-2 bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white rounded-lg sm:rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-tight sm:tracking-wider flex items-center justify-center gap-1 transition-all border border-white/10 active:scale-95 cursor-pointer"
                >
                  <Copy size={11} />
                  <span>{copiedLink === 'tv2' ? 'Copiado!' : 'Copiar Link Smart TV'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

      {/* Card Experiência App / PWA */}
      <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl sm:rounded-[2.5rem] text-white overflow-hidden relative group">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <Smartphone size={16} />
            </div>
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight">Experiência PWA</h3>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-3">
          Sistema industrial otimizado para tablets e celulares. Instale para acesso instantâneo em 1 toque.
        </p>
        {isStandalone ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black uppercase border border-emerald-500/20">
            <ShieldCheck size={13} /> Modo Aplicativo Ativo
          </div>
        ) : onInstallClick ? (
          <button
            onClick={onInstallClick}
            className="py-2.5 px-4 bg-white text-slate-900 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <Download size={13} /> Instalar Aplicativo
          </button>
        ) : null}
      </div>
    </div>
  );
};
