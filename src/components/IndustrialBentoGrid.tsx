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

export interface IndustrialBentoGridProps {
  productionData: ProductionEntry[];
  ribbonEntries: RibbonCuttingEntry[];
  goals: Record<string, number>;
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

  // Data atual local (ano-mês-dia em fuso local)
  const activeDay = useMemo(() => {
    if (filterDay && filterDay.trim()) {
      return filterDay.trim();
    }
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [filterDay]);

  const activeDayFormatted = useMemo(() => {
    if (!activeDay) return '';
    const parts = activeDay.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return activeDay;
  }, [activeDay]);

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Cálculos de Produção Real & Métricas
  const metrics = useMemo(() => {
    let todayNet = 0;
    let yesterdayNet = 0;
    let monthNet = 0;
    let eremaMonthNet = 0;
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

    // Processar Extrusão
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

      // Produção de Ontem (para cálculo de tendência)
      if (entry.date === yesterdayStr) {
        if (!isErema) {
          yesterdayNet += net;
        }
      }
    });

    // Processar Corte de Fita no Dia Ativo
    let ribbonTodayNet = 0;
    ribbonEntries.forEach((r) => {
      if (r.date === activeDay) {
        const m2 = r.producedM2 || 0;
        const rolls = r.rollsCount || 0;
        ribbonTodayNet += m2;

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
          // Se não especificada, agrupa como Lintech ou distribui conforme apontamento
          ribbonMachineToday['Lintech'].m2 += m2;
          ribbonMachineToday['Lintech'].rolls += rolls;
        }
      }
    });

    // Metas (Garantir valor padrão de 1.200.000 kg se a meta ainda não estiver cadastrada no mês)
    const currentMonthGoal = goals[dashboardMonth] || GOAL_VALUE || 1200000;
    const goalPercentage = currentMonthGoal > 0 ? (monthNet / currentMonthGoal) * 100 : 0;

    // Tendência vs Ontem
    let trendPercent = 0;
    if (yesterdayNet > 0) {
      trendPercent = ((todayNet - yesterdayNet) / yesterdayNet) * 100;
    }

    // % Refugo hoje
    const wastePercent = todayGross > 0 ? (todayWastes / todayGross) * 100 : 0;

    return {
      todayNet,
      yesterdayNet,
      monthNet,
      eremaMonthNet,
      todayWastes,
      wastePercent,
      todayStopsMin,
      currentMonthGoal,
      goalPercentage,
      trendPercent,
      machineTodayNet,
      ribbonMachineToday,
      ribbonTodayNet
    };
  }, [productionData, ribbonEntries, goals, dashboardMonth, activeDay, yesterdayStr]);

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
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      {/* Imagem de Capa se configurada */}
      {systemCoverImage && (
        <div className="w-full h-32 sm:h-48 md:h-64 rounded-2xl sm:rounded-[2.5rem] md:rounded-[3rem] overflow-hidden border border-slate-100 shadow-md sm:shadow-xl animate-in zoom-in-95 duration-500">
          <img src={systemCoverImage} alt="Imagem de Capa" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Barra Superior Centro de Comando */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-200">
            <LayoutGrid size={18} />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-black uppercase text-slate-800 tracking-tight flex items-center gap-2">
              Centro de Comando Industrial
              <span className="hidden sm:inline px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
                Geral & Chão de Fábrica
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Painel Integrado • Fábrica em Tempo Real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10px] font-black uppercase text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            Referência: {activeDayFormatted} • Mês: {dashboardMonth.split('-').reverse().join('/')}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BENTO GRID INDUSTRIAL V2                                                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4.5">
          {/* ===================================================================== */}
          {/* CARD 1: STATUS GERAL DA FÁBRICA & METAS (Grande - 2 Colunas)          */}
          {/* ===================================================================== */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-4 sm:p-5 md:p-6 rounded-3xl shadow-lg shadow-blue-200/50 border border-blue-400/30 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -right-6 -bottom-6 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Produção Diária & Mensal
                </span>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-blue-100">
                  Referência: {activeDayFormatted}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 my-2">
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-blue-100/80 truncate">
                    Produção do Dia ({activeDayFormatted})
                  </p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight mt-0.5 truncate">
                    {metrics.todayNet < 1000
                      ? `${metrics.todayNet.toLocaleString('pt-BR')} `
                      : `${(metrics.todayNet / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} `}
                    <span className="text-xs sm:text-sm font-bold opacity-80">
                      {metrics.todayNet < 1000 ? 'kg' : 't'}
                    </span>
                  </p>
                  {metrics.yesterdayNet > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-[9px] sm:text-[10px] font-black">
                      {metrics.trendPercent >= 0 ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200">
                          <TrendingUp size={11} /> +{metrics.trendPercent.toFixed(1)}% vs ontem
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200">
                          <TrendingDown size={11} /> {metrics.trendPercent.toFixed(1)}% vs ontem
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-blue-100/80 truncate">
                    Acumulado do Mês ({dashboardMonth.split('-').reverse().join('/')})
                  </p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight mt-0.5 truncate">
                    {(metrics.monthNet / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}{' '}
                    <span className="text-xs sm:text-sm font-bold opacity-80">t</span>
                  </p>
                  <p className="text-[9px] sm:text-[10px] font-bold text-blue-100/80 mt-1 truncate">
                    Meta: {metrics.currentMonthGoal.toLocaleString('pt-BR')} kg ({(metrics.currentMonthGoal / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} t)
                  </p>
                </div>
              </div>
            </div>

            {/* Barra de Progresso da Meta com Cálculo Corrigido */}
            <div className="mt-4 pt-3 border-t border-white/15">
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-black uppercase tracking-wider mb-1.5">
                <span>Atingimento da Meta Mensal</span>
                <span className="text-emerald-300 font-extrabold text-[11px] sm:text-xs">
                  {metrics.goalPercentage.toFixed(1)}% de {metrics.currentMonthGoal.toLocaleString('pt-BR')} kg
                </span>
              </div>
              <div className="w-full h-2.5 sm:h-3 bg-black/25 rounded-full overflow-hidden p-0.5 border border-white/20">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-cyan-300 rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${Math.min(metrics.goalPercentage, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* CARD 2: MÁQUINAS (2 COLUNAS: CAST 1, CAST 2, EREMA | LINTECH, GHEZZI, WULTEC) */}
          {/* ===================================================================== */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Factory size={16} className="text-blue-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Máquinas
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
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

                  {/* Erema (Sempre presente, exatamente como solicitado) */}
                  <div
                    onClick={() => onNavigateTab('extrusion', 'charts')}
                    className="p-2 sm:p-2.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-100 transition-all cursor-pointer flex items-center justify-between active:scale-98"
                    title="Recuperadora Erema • Clique para ver balanço de massa"
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

            <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-slate-100">
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

          {/* ===================================================================== */}
          {/* CARD 3: FORÇA DE TRABALHO & RH (Colaboradores & DOC 076)               */}
          {/* ===================================================================== */}
          <div className="col-span-1 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Equipe & DOC 076
                </span>
                <Users size={16} className="text-emerald-600" />
              </div>

              <div className="my-2">
                <p className="text-2xl font-black text-slate-800 tracking-tight">
                  {workforce.totalActive}{' '}
                  <span className="text-xs font-bold text-slate-400">Ativos</span>
                </p>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                  {workforce.brigadistas} brigadistas no quadro geral
                </p>
              </div>

              {/* Destaque DOC 076 com Fechamento dia 24 */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/70 text-amber-900 mt-2">
                <div className="flex items-center justify-between text-[10px] font-black uppercase">
                  <span>Horas Extras (DOC 076)</span>
                  <Clock size={12} className="text-amber-700" />
                </div>
                <p className="text-[9px] font-bold text-amber-700/80 mt-1 leading-snug">
                  Folha com fechamento automático no dia 24.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-3">
              <button
                type="button"
                onClick={() => onNavigateTab('personnel', 'board')}
                className="flex-1 py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center cursor-pointer active:scale-95"
              >
                Quadro
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

          {/* ===================================================================== */}
          {/* CARD 4: REFUGOS & BALANÇO DE MASSA                                    */}
          {/* ===================================================================== */}
          <div className="col-span-1 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Refugo & Perdas do Dia
                </span>
                <Flame size={16} className="text-rose-500" />
              </div>

              <div className="my-2">
                <p className="text-2xl font-black text-slate-800 tracking-tight">
                  {metrics.todayWastes.toLocaleString('pt-BR')}{' '}
                  <span className="text-xs font-bold text-slate-400">kg</span>
                </p>
                <div className="flex items-center gap-1.5 mt-1">
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
                  <span className="text-[9px] font-bold text-slate-400">
                    {metrics.wastePercent <= 5 ? 'Dentro da meta' : 'Alerta refugo'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('extrusion', 'charts')}
              className="mt-3 w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95"
            >
              <BarChart3 size={13} />
              <span>Ver Gráficos BI</span>
            </button>
          </div>

          {/* ===================================================================== */}
          {/* CARD 5: PARADAS DE MÁQUINA & MANUTENÇÃO                               */}
          {/* ===================================================================== */}
          <div className="col-span-1 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Paradas Registradas ({activeDayFormatted})
                </span>
                <Wrench size={16} className="text-orange-500" />
              </div>

              <div className="my-2">
                <p className="text-2xl font-black text-slate-800 tracking-tight">
                  {metrics.todayStopsMin}{' '}
                  <span className="text-xs font-bold text-slate-400">min</span>
                </p>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                  {(metrics.todayStopsMin / 60).toFixed(1)}h paradas no dia
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-3">
              <button
                type="button"
                onClick={() => {
                  setMaintenanceSubTab('requests');
                  setMaintenanceInitialCreateOpen(false);
                  onNavigateTab('maintenance');
                }}
                className="flex-1 py-2 px-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center cursor-pointer active:scale-95 border border-orange-200"
              >
                Abrir OS
              </button>
              <button
                type="button"
                onClick={() => onOpenModal('downtime_analytics')}
                className="flex-1 py-2 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center cursor-pointer active:scale-95 shadow-sm"
              >
                BI Paradas
              </button>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* CARD 6: CORTE DE FITA (Resumo Rápido)                                 */}
          {/* ===================================================================== */}
          <div className="col-span-1 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
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
                  Produção registrada em {activeDayFormatted}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('ribbon', 'dashboard', 'summary')}
              className="mt-3 w-full py-2 px-3 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 border border-cyan-200/60"
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
