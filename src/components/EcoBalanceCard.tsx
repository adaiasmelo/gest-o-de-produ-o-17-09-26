import React, { useState, useMemo } from 'react';
import { 
  Scale, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  RotateCcw, 
  Settings2, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Layers, 
  Equal, 
  Plus, 
  Minus, 
  Save, 
  X, 
  Edit3,
  Building2,
  Warehouse,
  Calendar,
  CalendarDays,
  Check,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { ProductionEntry, EcoBalanceSettings } from '../types';

interface DailyEcoBreakdown {
  date: string;
  dayLabel: string;
  ecoBCast1: number;
  ecoBCast2: number;
  totalEcoB: number;
  eremaRecycled: number;
  recycledUsed: number;
  netGenerated: number;
}

interface EcoBalanceCardProps {
  productionData: ProductionEntry[];
  dashboardMonth: string;
  filterDay?: string;
  ecoBalanceSettings: EcoBalanceSettings;
  onSaveEcoBalanceSettings: (newSettings: EcoBalanceSettings) => Promise<void>;
  formatWeight: (val: number) => string;
  isReadOnly?: boolean;
}

export const EcoBalanceCard: React.FC<EcoBalanceCardProps> = ({
  productionData,
  dashboardMonth,
  filterDay,
  ecoBalanceSettings,
  onSaveEcoBalanceSettings,
  formatWeight,
  isReadOnly
}) => {
  // Modos de visualização:
  // 'period' -> Ciclo de Apuração dos dias 25, 26 e 27 (Padrão Oficial Solicitado)
  // 'day'    -> Visão de um único dia (targetDay / filterDay)
  // 'month'  -> Consolidado do Mês
  const [viewMode, setViewMode] = useState<'period' | 'day' | 'month'>('period');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Estados de edição rápida inline
  const [quickEditingField, setQuickEditingField] = useState<
    'initialMatriz' | 'initialGalpao' | 'physicalMatriz' | 'physicalGalpao' | 'initialRecycled' | null
  >(null);
  const [quickTemp, setQuickTemp] = useState<string>('');

  // Formulário do modal completo
  const [formInitialMatriz, setFormInitialMatriz] = useState<string>('');
  const [formInitialGalpao, setFormInitialGalpao] = useState<string>('');
  const [formPhysicalMatriz, setFormPhysicalMatriz] = useState<string>('');
  const [formPhysicalGalpao, setFormPhysicalGalpao] = useState<string>('');
  const [formInitialRecycled, setFormInitialRecycled] = useState<string>('');
  const [formBaseDate, setFormBaseDate] = useState<string>('');
  const [formPhysicalDate, setFormPhysicalDate] = useState<string>('');
  const [formSelectedDays, setFormSelectedDays] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Valores base padronizados com fallback para os valores oficiais do usuário:
  // Última contagem (dia 25 ref. 24): Matriz 18.071 kg, Galpão 111.991 kg
  // Contagem hoje: Matriz 20.385 kg, Galpão 111.991 kg
  const initialMatriz = useMemo(() => {
    return ecoBalanceSettings.initialMatrizStock !== undefined 
      ? Number(ecoBalanceSettings.initialMatrizStock) 
      : 18071;
  }, [ecoBalanceSettings.initialMatrizStock]);

  const initialGalpao = useMemo(() => {
    return ecoBalanceSettings.initialGalpaoStock !== undefined 
      ? Number(ecoBalanceSettings.initialGalpaoStock) 
      : 111991;
  }, [ecoBalanceSettings.initialGalpaoStock]);

  const totalInitialEcoB = useMemo(() => {
    return initialMatriz + initialGalpao; // 18.071 + 111.991 = 130.062 kg
  }, [initialMatriz, initialGalpao]);

  const physicalMatriz = useMemo(() => {
    return ecoBalanceSettings.physicalMatrizStock !== undefined 
      ? Number(ecoBalanceSettings.physicalMatrizStock) 
      : 20385;
  }, [ecoBalanceSettings.physicalMatrizStock]);

  const physicalGalpao = useMemo(() => {
    return ecoBalanceSettings.physicalGalpaoStock !== undefined 
      ? Number(ecoBalanceSettings.physicalGalpaoStock) 
      : 111991;
  }, [ecoBalanceSettings.physicalGalpaoStock]);

  const totalPhysicalEcoB = useMemo(() => {
    return physicalMatriz + physicalGalpao; // 20.385 + 111.991 = 132.376 kg
  }, [physicalMatriz, physicalGalpao]);

  const initialRecycled = useMemo(() => {
    return Number(ecoBalanceSettings.initialRecycledStock) || 0;
  }, [ecoBalanceSettings.initialRecycledStock]);

  // Dias configurados para o cálculo do ciclo (dias 25, 26 e 27 por padrão)
  const calculationDays = useMemo(() => {
    if (ecoBalanceSettings.calculationPeriodDays && ecoBalanceSettings.calculationPeriodDays.length > 0) {
      return ecoBalanceSettings.calculationPeriodDays;
    }
    // Mês atual ou dashboardMonth
    const [y, m] = dashboardMonth.split('-');
    const yearMonth = `${y}-${m}`;
    return [`${yearMonth}-25`, `${yearMonth}-26`, `${yearMonth}-27`];
  }, [ecoBalanceSettings.calculationPeriodDays, dashboardMonth]);

  // Data alvo para o modo diário
  const targetDay = useMemo(() => {
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

  // =========================================================================
  // PROCESSAMENTO DE PRODUÇÃO & BALANÇO DE MASSA
  // =========================================================================
  const metrics = useMemo(() => {
    // 1. Métricas do Período (dias 25, 26 e 27)
    let periodEcoB = 0;
    let periodEcoBCast1 = 0;
    let periodEcoBCast2 = 0;
    let periodErema = 0;
    let periodRecycledUsed = 0;

    // Detalhamento dia a dia para o período
    const dailyBreakdown: Record<string, {
      date: string;
      dayLabel: string;
      ecoBCast1: number;
      ecoBCast2: number;
      totalEcoB: number;
      eremaRecycled: number;
      recycledUsed: number;
      netGenerated: number; // Eco B gerado - Erema reciclado
    }> = {};

    calculationDays.forEach(dayStr => {
      const parts = dayStr.split('-');
      const dNum = parts[parts.length - 1] || dayStr;
      dailyBreakdown[dayStr] = {
        date: dayStr,
        dayLabel: `Dia ${dNum}`,
        ecoBCast1: 0,
        ecoBCast2: 0,
        totalEcoB: 0,
        eremaRecycled: 0,
        recycledUsed: 0,
        netGenerated: 0
      };
    });

    // 2. Métricas do Dia Único (targetDay)
    let dayEcoB = 0;
    let dayEcoBCast1 = 0;
    let dayEcoBCast2 = 0;
    let dayErema = 0;
    let dayRecycledUsed = 0;

    // 3. Métricas do Mês Inteiro
    let monthEcoB = 0;
    let monthEcoBCast1 = 0;
    let monthEcoBCast2 = 0;
    let monthErema = 0;
    let monthRecycledUsed = 0;

    productionData.forEach(entry => {
      if (!entry.date) return;
      const entryDate = entry.date.trim();
      const isErema = (entry.machine || '').toLowerCase().includes('erema');
      const ecoB = (entry.ecoBP || 0) + (entry.ecoBM || 0);
      const eremaNet = isErema ? (entry.netWeight || 0) : 0;
      const recUsed = !isErema ? (entry.recycledUsed || 0) : 0;
      const isCast1 = (entry.machine || '').toUpperCase().includes('CAST 1') || (entry.machine || '').toUpperCase().includes('CAST1');
      const isCast2 = (entry.machine || '').toUpperCase().includes('CAST 2') || (entry.machine || '').toUpperCase().includes('CAST2');

      // 1. Checa se o registro pertence ao período de cálculo (dias 25, 26, 27)
      const matchedPeriodDay = calculationDays.find(d => {
        if (entryDate === d) return true;
        // Correspondência flexível: ex. se d for '2026-09-25' e entryDate terminar com '-25' no dashboardMonth
        const dDay = d.split('-')[2];
        if (dDay && entryDate.startsWith(dashboardMonth) && entryDate.endsWith(`-${dDay}`)) return true;
        return false;
      });

      if (matchedPeriodDay) {
        if (!isErema) {
          periodEcoB += ecoB;
          if (isCast1) periodEcoBCast1 += ecoB;
          if (isCast2) periodEcoBCast2 += ecoB;
          periodRecycledUsed += recUsed;

          if (dailyBreakdown[matchedPeriodDay]) {
            dailyBreakdown[matchedPeriodDay].totalEcoB += ecoB;
            if (isCast1) dailyBreakdown[matchedPeriodDay].ecoBCast1 += ecoB;
            if (isCast2) dailyBreakdown[matchedPeriodDay].ecoBCast2 += ecoB;
            dailyBreakdown[matchedPeriodDay].recycledUsed += recUsed;
          }
        } else {
          periodErema += eremaNet;
          if (dailyBreakdown[matchedPeriodDay]) {
            dailyBreakdown[matchedPeriodDay].eremaRecycled += eremaNet;
          }
        }
      }

      // 2. Dia Único (targetDay)
      if (entryDate === targetDay) {
        if (!isErema) {
          dayEcoB += ecoB;
          if (isCast1) dayEcoBCast1 += ecoB;
          if (isCast2) dayEcoBCast2 += ecoB;
          dayRecycledUsed += recUsed;
        } else {
          dayErema += eremaNet;
        }
      }

      // 3. Mês Inteiro
      if (entryDate.startsWith(dashboardMonth)) {
        if (!isErema) {
          monthEcoB += ecoB;
          if (isCast1) monthEcoBCast1 += ecoB;
          if (isCast2) monthEcoBCast2 += ecoB;
          monthRecycledUsed += recUsed;
        } else {
          monthErema += eremaNet;
        }
      }
    });

    // Calcula saldo líquido diário (Eco B gerado - Erema reciclado)
    Object.values(dailyBreakdown).forEach(item => {
      item.netGenerated = item.totalEcoB - item.eremaRecycled;
    });

    // =========================================================================
    // CÁLCULO OFICIAL DA FÓRMULA:
    // ESTOQUE INICIAL DE ECO B + PRODUÇÃO DE ECO B - PRODUÇÃO DA EREMA = TOTAL QUE DEVE TER
    // =========================================================================
    
    // Período (dias 25, 26 e 27)
    const expectedStockPeriod = Math.max(0, totalInitialEcoB + periodEcoB - periodErema);
    const differencePeriod = totalPhysicalEcoB - expectedStockPeriod;

    // Dia Único
    const expectedStockDay = Math.max(0, totalInitialEcoB + dayEcoB - dayErema);
    const differenceDay = totalPhysicalEcoB - expectedStockDay;

    // Mês
    const expectedStockMonth = Math.max(0, totalInitialEcoB + monthEcoB - monthErema);
    const differenceMonth = totalPhysicalEcoB - expectedStockMonth;

    // Variação física observada entre contagens (Hoje vs Base)
    const physicalMatrizDelta = physicalMatriz - initialMatriz;   // 20.385 - 18.071 = +2.314 kg
    const physicalGalpaoDelta = physicalGalpao - initialGalpao;   // 111.991 - 111.991 = 0 kg
    const physicalTotalDelta = totalPhysicalEcoB - totalInitialEcoB; // 132.376 - 130.062 = +2.314 kg

    return {
      // Período
      periodEcoB,
      periodEcoBCast1,
      periodEcoBCast2,
      periodErema,
      periodRecycledUsed,
      expectedStockPeriod,
      differencePeriod,
      dailyBreakdown,
      // Dia
      dayEcoB,
      dayEcoBCast1,
      dayEcoBCast2,
      dayErema,
      dayRecycledUsed,
      expectedStockDay,
      differenceDay,
      // Mês
      monthEcoB,
      monthEcoBCast1,
      monthEcoBCast2,
      monthErema,
      monthRecycledUsed,
      expectedStockMonth,
      differenceMonth,
      // Variações Físicas
      physicalMatrizDelta,
      physicalGalpaoDelta,
      physicalTotalDelta
    };
  }, [
    productionData, 
    calculationDays, 
    targetDay, 
    dashboardMonth, 
    totalInitialEcoB, 
    totalPhysicalEcoB,
    initialMatriz,
    initialGalpao,
    physicalMatriz,
    physicalGalpao
  ]);

  // Valores ativos conforme o viewMode
  const activeView = useMemo(() => {
    if (viewMode === 'period') {
      return {
        mode: 'period' as const,
        title: 'Ciclo de Apuração (Dias 25, 26 e 27)',
        subtitle: 'Última contagem base dia 25 (ref. 24) • Movimentação dos dias 25, 26 e 27',
        badge: 'Ciclo Oficial (25 a 27)',
        startingStock: totalInitialEcoB,
        producedEcoB: metrics.periodEcoB,
        producedEcoBCast1: metrics.periodEcoBCast1,
        producedEcoBCast2: metrics.periodEcoBCast2,
        eremaProduced: metrics.periodErema,
        expectedStock: metrics.expectedStockPeriod,
        difference: metrics.differencePeriod,
        recycledUsed: metrics.periodRecycledUsed,
        availableRecycled: Math.max(0, initialRecycled + metrics.periodErema - metrics.periodRecycledUsed)
      };
    } else if (viewMode === 'day') {
      const parts = targetDay.split('-');
      const formatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : targetDay;
      return {
        mode: 'day' as const,
        title: `Visão Operacional do Dia: ${formatted}`,
        subtitle: `Produção diária individual em ${formatted}`,
        badge: 'Diário Operacional',
        startingStock: totalInitialEcoB,
        producedEcoB: metrics.dayEcoB,
        producedEcoBCast1: metrics.dayEcoBCast1,
        producedEcoBCast2: metrics.dayEcoBCast2,
        eremaProduced: metrics.dayErema,
        expectedStock: metrics.expectedStockDay,
        difference: metrics.differenceDay,
        recycledUsed: metrics.dayRecycledUsed,
        availableRecycled: Math.max(0, initialRecycled + metrics.dayErema - metrics.dayRecycledUsed)
      };
    } else {
      const parts = dashboardMonth.split('-');
      const formatted = parts.length === 2 ? `${parts[1]}/${parts[0]}` : dashboardMonth;
      return {
        mode: 'month' as const,
        title: `Consolidado Mensal: ${formatted}`,
        subtitle: `Acumulado total de produção no mês ${formatted}`,
        badge: 'Consolidado Mensal',
        startingStock: totalInitialEcoB,
        producedEcoB: metrics.monthEcoB,
        producedEcoBCast1: metrics.monthEcoBCast1,
        producedEcoBCast2: metrics.monthEcoBCast2,
        eremaProduced: metrics.monthErema,
        expectedStock: metrics.expectedStockMonth,
        difference: metrics.differenceMonth,
        recycledUsed: metrics.monthRecycledUsed,
        availableRecycled: Math.max(0, initialRecycled + metrics.monthErema - metrics.monthRecycledUsed)
      };
    }
  }, [viewMode, metrics, totalInitialEcoB, initialRecycled, targetDay, dashboardMonth]);

  // =========================================================================
  // SALVAMENTOS RÁPIDOS INLINE (Matriz / Galpão / etc.)
  // =========================================================================
  const handleStartQuickEdit = (field: 'initialMatriz' | 'initialGalpao' | 'physicalMatriz' | 'physicalGalpao' | 'initialRecycled') => {
    if (isReadOnly) return;
    setQuickEditingField(field);
    if (field === 'initialMatriz') setQuickTemp(String(initialMatriz));
    else if (field === 'initialGalpao') setQuickTemp(String(initialGalpao));
    else if (field === 'physicalMatriz') setQuickTemp(String(physicalMatriz));
    else if (field === 'physicalGalpao') setQuickTemp(String(physicalGalpao));
    else if (field === 'initialRecycled') setQuickTemp(String(initialRecycled));
  };

  const handleSaveQuickEdit = async () => {
    if (!quickEditingField) return;
    const val = Math.max(0, Number(quickTemp) || 0);
    const updated: EcoBalanceSettings = { ...ecoBalanceSettings };

    if (quickEditingField === 'initialMatriz') {
      updated.initialMatrizStock = val;
      updated.initialEcoBStock = val + initialGalpao;
    } else if (quickEditingField === 'initialGalpao') {
      updated.initialGalpaoStock = val;
      updated.initialEcoBStock = initialMatriz + val;
    } else if (quickEditingField === 'physicalMatriz') {
      updated.physicalMatrizStock = val;
      updated.physicalEcoBStock = val + physicalGalpao;
      updated.physicalInventoryDate = new Date().toISOString();
    } else if (quickEditingField === 'physicalGalpao') {
      updated.physicalGalpaoStock = val;
      updated.physicalEcoBStock = physicalMatriz + val;
      updated.physicalInventoryDate = new Date().toISOString();
    } else if (quickEditingField === 'initialRecycled') {
      updated.initialRecycledStock = val;
    }

    updated.updatedAt = new Date().toISOString();
    await onSaveEcoBalanceSettings(updated);
    setQuickEditingField(null);
  };

  // Alternar um dia no período de cálculo
  const handleToggleDay = async (dayStr: string) => {
    if (isReadOnly) return;
    let nextDays: string[];
    if (calculationDays.includes(dayStr)) {
      if (calculationDays.length === 1) return; // Não deixar vazio
      nextDays = calculationDays.filter(d => d !== dayStr);
    } else {
      nextDays = [...calculationDays, dayStr].sort();
    }
    const updated: EcoBalanceSettings = {
      ...ecoBalanceSettings,
      calculationPeriodDays: nextDays,
      updatedAt: new Date().toISOString()
    };
    await onSaveEcoBalanceSettings(updated);
  };

  // Restaurar padrão oficial do ciclo: dias 25, 26 e 27
  const handleResetDefaultDays = async () => {
    if (isReadOnly) return;
    const [y, m] = dashboardMonth.split('-');
    const defaultDays = [`${y}-${m}-25`, `${y}-${m}-26`, `${y}-${m}-27`];
    const updated: EcoBalanceSettings = {
      ...ecoBalanceSettings,
      calculationPeriodDays: defaultDays,
      updatedAt: new Date().toISOString()
    };
    await onSaveEcoBalanceSettings(updated);
  };

  // Modal completo de configuração
  const handleOpenConfigModal = () => {
    setFormInitialMatriz(String(initialMatriz));
    setFormInitialGalpao(String(initialGalpao));
    setFormPhysicalMatriz(String(physicalMatriz));
    setFormPhysicalGalpao(String(physicalGalpao));
    setFormInitialRecycled(String(initialRecycled));
    setFormBaseDate(ecoBalanceSettings.baseCountDate || '2026-09-25');
    setFormPhysicalDate(ecoBalanceSettings.physicalInventoryDate ? ecoBalanceSettings.physicalInventoryDate.slice(0, 10) : '2026-09-28');
    setFormSelectedDays([...calculationDays]);
    setFormNotes(ecoBalanceSettings.notes || '');
    setIsConfigModalOpen(true);
  };

  const handleSaveConfigModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const initM = Math.max(0, Number(formInitialMatriz) || 0);
      const initG = Math.max(0, Number(formInitialGalpao) || 0);
      const physM = Math.max(0, Number(formPhysicalMatriz) || 0);
      const physG = Math.max(0, Number(formPhysicalGalpao) || 0);
      const initRec = Math.max(0, Number(formInitialRecycled) || 0);

      const updated: EcoBalanceSettings = {
        initialMatrizStock: initM,
        initialGalpaoStock: initG,
        initialEcoBStock: initM + initG,
        initialRecycledStock: initRec,
        baseCountDate: formBaseDate,
        physicalMatrizStock: physM,
        physicalGalpaoStock: physG,
        physicalEcoBStock: physM + physG,
        physicalInventoryDate: formPhysicalDate,
        calculationPeriodDays: formSelectedDays.length > 0 ? formSelectedDays : calculationDays,
        notes: formNotes.trim(),
        updatedAt: new Date().toISOString()
      };

      await onSaveEcoBalanceSettings(updated);
      setIsConfigModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar configurações do balanço:', err);
      alert('Erro ao salvar as configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-5 sm:p-7 md:p-8 rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200/90 shadow-sm flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO COM TÍTULO, SELETORES E BOTÃO DE CONFIGURAÇÃO                */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-150 pb-5">
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 text-slate-800">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-2xl flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
            <Scale size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-xl font-black uppercase tracking-tight text-slate-900 leading-tight">
                Ciclo do Balanço de Eco B & Reciclagem
              </h3>
              <span className="bg-orange-100 text-orange-800 text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-full border border-orange-200">
                {activeView.badge}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 tracking-wide mt-1">
              {activeView.subtitle}
            </p>
          </div>
        </div>

        {/* Controles de visualização e configuração */}
        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center">
          {/* Seletor de Modo */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('period')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'period'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <CalendarDays size={13} />
              <span>Ciclo Dias 25 a 27</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'day'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Calendar size={13} />
              <span>Visão do Dia</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'month'
                  ? 'bg-white text-emerald-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Layers size={13} />
              <span>Mês</span>
            </button>
          </div>

          {/* Botão de Configuração de Saldos Base */}
          {!isReadOnly && (
            <button
              type="button"
              onClick={handleOpenConfigModal}
              className="py-1.5 px-3.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              title="Ajustar estoques da Matriz, Galpão e parâmetros do ciclo"
            >
              <Settings2 size={14} />
              <span>Ajustar Parâmetros</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DIFERENCIAÇÃO EXPLÍCITA: MATRIZ vs GALPÃO                             */}
      {/* "inclusive fazendo essa diferenciação do que tem na matriz e do que      */}
      {/* tem no galpão"                                                           */}
      {/* ========================================================================= */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Warehouse size={16} className="text-orange-600" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              Posição Física de Eco B por Localidade: Matriz vs. Galpão
            </span>
          </div>
          <span className="text-[9.5px] font-bold uppercase text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            Base: Contagem dia 25 (ref. dia 24) • Atual: Contagem Hoje
          </span>
        </div>

        {/* Grid com Matriz, Galpão e Total Consolidado */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* CARD 1: MATRIZ */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-600 border-b border-slate-100 pb-2 mb-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 text-slate-800">
                <Building2 size={14} className="text-orange-500" />
                Matriz (Estoque Local)
              </span>
              <span className="text-[8.5px] font-bold uppercase bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">
                Cast 1 & 2
              </span>
            </div>

            {/* Linha 1: Última Contagem (Base) */}
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-slate-500 font-bold text-[10px] uppercase">
                Última Contagem (Dia 25):
              </span>
              <div className="flex items-center gap-1.5">
                {quickEditingField === 'initialMatriz' ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="any"
                      autoFocus
                      value={quickTemp}
                      onChange={e => setQuickTemp(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveQuickEdit(); }}
                      className="w-24 px-1.5 py-0.5 text-xs font-black border border-orange-400 rounded outline-none"
                    />
                    <button onClick={handleSaveQuickEdit} className="p-1 bg-orange-600 text-white rounded cursor-pointer"><Save size={10}/></button>
                    <button onClick={() => setQuickEditingField(null)} className="p-1 bg-slate-200 text-slate-700 rounded cursor-pointer"><X size={10}/></button>
                  </div>
                ) : (
                  <>
                    <span className="font-black text-slate-700">{formatWeight(initialMatriz)}</span>
                    {!isReadOnly && (
                      <button
                        onClick={() => handleStartQuickEdit('initialMatriz')}
                        className="text-orange-600 hover:text-orange-800 text-[8.5px] font-black uppercase ml-1 cursor-pointer"
                        title="Ajustar contagem base da matriz"
                      >
                        [Ajustar]
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Linha 2: Contagem Hoje */}
            <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100">
              <span className="text-slate-500 font-bold text-[10px] uppercase">
                Contagem Hoje:
              </span>
              <div className="flex items-center gap-1.5">
                {quickEditingField === 'physicalMatriz' ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="any"
                      autoFocus
                      value={quickTemp}
                      onChange={e => setQuickTemp(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveQuickEdit(); }}
                      className="w-24 px-1.5 py-0.5 text-xs font-black border border-blue-400 rounded outline-none"
                    />
                    <button onClick={handleSaveQuickEdit} className="p-1 bg-blue-600 text-white rounded cursor-pointer"><Save size={10}/></button>
                    <button onClick={() => setQuickEditingField(null)} className="p-1 bg-slate-200 text-slate-700 rounded cursor-pointer"><X size={10}/></button>
                  </div>
                ) : (
                  <>
                    <span className="font-black text-blue-700">{formatWeight(physicalMatriz)}</span>
                    {!isReadOnly && (
                      <button
                        onClick={() => handleStartQuickEdit('physicalMatriz')}
                        className="text-blue-600 hover:text-blue-800 text-[8.5px] font-black uppercase ml-1 cursor-pointer"
                        title="Aferir contagem física atual da matriz"
                      >
                        [Aferir]
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Linha 3: Variação Física na Matriz */}
            <div className="mt-2 pt-2 border-t border-slate-150 flex items-center justify-between text-xs bg-slate-50 -mx-1 -mb-1 p-2 rounded-lg">
              <span className="text-[9.5px] font-black uppercase text-slate-500">
                Variação na Matriz:
              </span>
              <span className={`font-black text-xs ${metrics.physicalMatrizDelta > 0 ? 'text-orange-600' : metrics.physicalMatrizDelta < 0 ? 'text-blue-600' : 'text-slate-600'}`}>
                {metrics.physicalMatrizDelta > 0 ? '+' : ''}{formatWeight(metrics.physicalMatrizDelta)}
              </span>
            </div>
          </div>

          {/* CARD 2: GALPÃO */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-600 border-b border-slate-100 pb-2 mb-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 text-slate-800">
                <Warehouse size={14} className="text-amber-500" />
                Galpão (Armazenagem Externa)
              </span>
              <span className="text-[8.5px] font-bold uppercase bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                Estoque Principal
              </span>
            </div>

            {/* Linha 1: Última Contagem (Base) */}
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-slate-500 font-bold text-[10px] uppercase">
                Última Contagem (Dia 25):
              </span>
              <div className="flex items-center gap-1.5">
                {quickEditingField === 'initialGalpao' ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="any"
                      autoFocus
                      value={quickTemp}
                      onChange={e => setQuickTemp(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveQuickEdit(); }}
                      className="w-24 px-1.5 py-0.5 text-xs font-black border border-amber-400 rounded outline-none"
                    />
                    <button onClick={handleSaveQuickEdit} className="p-1 bg-amber-600 text-white rounded cursor-pointer"><Save size={10}/></button>
                    <button onClick={() => setQuickEditingField(null)} className="p-1 bg-slate-200 text-slate-700 rounded cursor-pointer"><X size={10}/></button>
                  </div>
                ) : (
                  <>
                    <span className="font-black text-slate-700">{formatWeight(initialGalpao)}</span>
                    {!isReadOnly && (
                      <button
                        onClick={() => handleStartQuickEdit('initialGalpao')}
                        className="text-amber-600 hover:text-amber-800 text-[8.5px] font-black uppercase ml-1 cursor-pointer"
                        title="Ajustar contagem base do galpão"
                      >
                        [Ajustar]
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Linha 2: Contagem Hoje */}
            <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100">
              <span className="text-slate-500 font-bold text-[10px] uppercase">
                Contagem Hoje:
              </span>
              <div className="flex items-center gap-1.5">
                {quickEditingField === 'physicalGalpao' ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="any"
                      autoFocus
                      value={quickTemp}
                      onChange={e => setQuickTemp(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveQuickEdit(); }}
                      className="w-24 px-1.5 py-0.5 text-xs font-black border border-blue-400 rounded outline-none"
                    />
                    <button onClick={handleSaveQuickEdit} className="p-1 bg-blue-600 text-white rounded cursor-pointer"><Save size={10}/></button>
                    <button onClick={() => setQuickEditingField(null)} className="p-1 bg-slate-200 text-slate-700 rounded cursor-pointer"><X size={10}/></button>
                  </div>
                ) : (
                  <>
                    <span className="font-black text-blue-700">{formatWeight(physicalGalpao)}</span>
                    {!isReadOnly && (
                      <button
                        onClick={() => handleStartQuickEdit('physicalGalpao')}
                        className="text-blue-600 hover:text-blue-800 text-[8.5px] font-black uppercase ml-1 cursor-pointer"
                        title="Aferir contagem física atual do galpão"
                      >
                        [Aferir]
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Linha 3: Variação Física no Galpão */}
            <div className="mt-2 pt-2 border-t border-slate-150 flex items-center justify-between text-xs bg-slate-50 -mx-1 -mb-1 p-2 rounded-lg">
              <span className="text-[9.5px] font-black uppercase text-slate-500">
                Variação no Galpão:
              </span>
              <span className="font-black text-xs text-slate-600">
                {metrics.physicalGalpaoDelta === 0 ? '0 kg (Estável)' : `${metrics.physicalGalpaoDelta > 0 ? '+' : ''}${formatWeight(metrics.physicalGalpaoDelta)}`}
              </span>
            </div>
          </div>

          {/* CARD 3: TOTAL INTEGRADO (MATRIZ + GALPÃO) */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-xl border border-slate-700 shadow-md flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 text-amber-300">
                <Scale size={14} />
                Total Integrado (Matriz + Galpão)
              </span>
              <span className="text-[8.5px] font-bold uppercase bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">
                Soma Geral
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold text-[10px] uppercase">Base (Dia 25 ref. 24):</span>
                <span className="font-black text-slate-200">{formatWeight(totalInitialEcoB)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-700/60 pt-1">
                <span className="text-slate-300 font-bold text-[10px] uppercase">Hoje (Contagem Real):</span>
                <span className="font-black text-emerald-300 text-sm">{formatWeight(totalPhysicalEcoB)}</span>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-700 flex items-center justify-between text-xs bg-slate-800/80 -mx-1 -mb-1 p-2 rounded-lg">
              <span className="text-[9.5px] font-black uppercase text-slate-400">
                Variação Total Observada:
              </span>
              <span className="font-black text-xs text-amber-300">
                {metrics.physicalTotalDelta > 0 ? '+' : ''}{formatWeight(metrics.physicalTotalDelta)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. DIAS CONSIDERADOS NO CÁLCULO (DIAS 25, 26 E 27)                       */}
      {/* "O cálculo precisa ser feito baseado nos dias 26 e 27. No caso, é 25,     */}
      {/* 26 e 27, porque a contagem do 25 é referente a 24."                      */}
      {/* ========================================================================= */}
      {viewMode === 'period' && (
        <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <CalendarDays size={16} className="text-amber-700" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                Período de Movimentação Considerado no Balanço
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleResetDefaultDays}
                className="text-[9px] font-black uppercase text-amber-700 hover:text-amber-900 bg-amber-100/70 hover:bg-amber-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                title="Restaurar seleção dos dias 25, 26 e 27"
              >
                Padrão (Dias 25, 26 e 27)
              </button>
            </div>
          </div>

          <p className="text-[11px] font-medium text-amber-800/90 leading-relaxed">
            Como a contagem do dia 25 refere-se ao saldo fechado do dia 24, todo o refugo gerado e processado nos dias <strong>25</strong>, <strong>26</strong> e <strong>27</strong> compõe a movimentação exata até a contagem de hoje.
          </p>

          {/* Chips interativos dos dias do ciclo com dados dia a dia */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {(Object.values(metrics.dailyBreakdown) as DailyEcoBreakdown[]).map(item => {
              const parts = item.date.split('-');
              const dayNum = parts[parts.length - 1];
              const isIncluded = calculationDays.includes(item.date);

              return (
                <div 
                  key={item.date}
                  className={`p-3 rounded-xl border transition-all ${
                    isIncluded 
                      ? 'bg-white border-amber-300 shadow-xs' 
                      : 'bg-slate-100/70 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-slate-800 uppercase flex items-center gap-1">
                      <span>Dia {dayNum}</span>
                      <span className="text-[9px] font-bold text-slate-400">({parts[1]}/{parts[0]})</span>
                    </span>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => handleToggleDay(item.date)}
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded cursor-pointer ${
                          isIncluded ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
                        }`}
                        title={isIncluded ? 'Desativar este dia do cálculo' : 'Incluir este dia no cálculo'}
                      >
                        {isIncluded ? 'Incluído' : 'Excluído'}
                      </button>
                    )}
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="flex items-center justify-between text-orange-600 font-bold">
                      <span>+ Eco B (Cast 1/2):</span>
                      <span>+{formatWeight(item.totalEcoB)}</span>
                    </div>
                    <div className="flex items-center justify-between text-amber-700 font-bold">
                      <span>- Erema Reciclado:</span>
                      <span>-{formatWeight(item.eremaRecycled)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700 font-black border-t border-slate-100 pt-1 text-xs">
                      <span>Saldo Líquido Dia:</span>
                      <span className={item.netGenerated >= 0 ? 'text-orange-600' : 'text-emerald-600'}>
                        {item.netGenerated >= 0 ? '+' : ''}{formatWeight(item.netGenerated)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SEÇÃO PRINCIPAL DA FÓRMULA OFICIAL                                     */}
      {/* ESTOQUE DE ECO B + PRODUÇÃO DE ECO B - PRODUÇÃO DA EREMA                  */}
      {/* = TOTAL DE ECO B QUE DEVE TER NO ESTOQUE FÍSICO                           */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-orange-600 font-black text-xs uppercase tracking-wider">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
            <span>Fórmula Oficial do Balanço de Massa de Eco B</span>
          </div>
          <span className="text-[9.5px] sm:text-[10px] font-black text-slate-600 uppercase bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            ESTOQUE DE ECO B + PRODUÇÃO DE ECO B - PRODUÇÃO DA EREMA = TOTAL QUE DEVE TER NO ESTOQUE FÍSICO
          </span>
        </div>

        {/* Grid Visual da Fórmula com Operadores Matemáticos (+ , - , =) */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2.5 sm:gap-3 items-center">
          
          {/* TERMO 1: ESTOQUE DE ECO B (O que já temos em estoque) */}
          <div className="md:col-span-2 bg-slate-50/90 p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between min-h-[105px]">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Package size={14} className="text-slate-500" />
                Estoque de Eco B
              </span>
              <span className="text-[8.5px] font-bold uppercase bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">
                Saldo Inicial
              </span>
            </div>
            <div className="mt-2">
              <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {formatWeight(activeView.startingStock)}
              </p>
              <p className="text-[9.5px] font-semibold text-slate-500 mt-0.5 truncate">
                Matriz ({formatWeight(initialMatriz)}) + Galpão ({formatWeight(initialGalpao)})
              </p>
            </div>
          </div>

          {/* SINAL + */}
          <div className="hidden md:flex justify-center text-slate-400">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-700 border border-slate-200 shadow-xs">
              <Plus size={16} />
            </div>
          </div>

          {/* TERMO 2: PRODUÇÃO DE ECO B (Cast 1 e 2 no período/dia) */}
          <div className="md:col-span-2 bg-orange-50/70 p-4 rounded-2xl border border-orange-200 shadow-xs flex flex-col justify-between min-h-[105px]">
            <div className="flex items-center justify-between text-orange-700">
              <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={14} />
                {viewMode === 'period' ? 'Produção Eco B (25 a 27)' : viewMode === 'day' ? 'Produção Eco B do Dia' : 'Produção Eco B do Mês'}
              </span>
              <span className="text-[8.5px] font-bold uppercase bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">
                Cast 1 & 2
              </span>
            </div>
            <div className="mt-2">
              <p className="text-xl sm:text-2xl font-black text-orange-600 tracking-tight">
                +{formatWeight(activeView.producedEcoB)}
              </p>
              <p className="text-[9.5px] font-semibold text-orange-700/80 mt-0.5 truncate">
                Cast 1: {formatWeight(activeView.producedEcoBCast1)} • Cast 2: {formatWeight(activeView.producedEcoBCast2)}
              </p>
            </div>
          </div>

          {/* SINAL - */}
          <div className="hidden md:flex justify-center text-slate-400">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-700 border border-slate-200 shadow-xs">
              <Minus size={16} />
            </div>
          </div>

          {/* TERMO 3: PRODUÇÃO DA EREMA (Refugo Reciclado) */}
          <div className="md:col-span-2 bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between min-h-[105px]">
            <div className="flex items-center justify-between text-amber-700">
              <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <RotateCcw size={14} />
                {viewMode === 'period' ? 'Produção Erema (25 a 27)' : viewMode === 'day' ? 'Produção Erema do Dia' : 'Produção Erema do Mês'}
              </span>
              <span className="text-[8.5px] font-bold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                Reciclado
              </span>
            </div>
            <div className="mt-2">
              <p className="text-xl sm:text-2xl font-black text-amber-600 tracking-tight">
                -{formatWeight(activeView.eremaProduced)}
              </p>
              <p className="text-[9.5px] font-semibold text-amber-700/80 mt-0.5 truncate">
                Refugo reprocessado e convertido em pellets
              </p>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* RESULTADO DA FÓRMULA (= TOTAL DE ECO B QUE DEVE TER NO ESTOQUE FÍSICO)*/}
        {/* ===================================================================== */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-5 rounded-2xl sm:rounded-3xl border border-slate-700 shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-black uppercase tracking-wider">
              <Equal size={18} />
              <span>Total de Eco B que Deve Ter no Estoque Físico</span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium">
              Cálculo teórico: Estoque Inicial ({formatWeight(activeView.startingStock)}) + Produção de Eco B (+{formatWeight(activeView.producedEcoB)}) - Produção Erema (-{formatWeight(activeView.eremaProduced)}).
            </p>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <span className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-300 block">
              {formatWeight(activeView.expectedStock)}
            </span>
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
              {(activeView.expectedStock / 1100).toFixed(1).replace('.', ',')} bags de ~1.100kg
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. CONFERÊNCIA COM ESTOQUE FÍSICO REAL & DIFERENÇA APURADA                */}
      {/* "se a contagem do estoque fisico der diferente do resultado essa          */}
      {/* diferença deve ser mostrada."                                            */}
      {/* ========================================================================= */}
      <div className="bg-slate-50/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 space-y-3.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-blue-600" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              Conferência & Divergência com o Estoque Físico Real
            </span>
          </div>
          <span className="text-[9px] font-bold uppercase text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
            Contagem Física Real Aferida vs. Total que Deve Ter
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-stretch">
          
          {/* Caixa 1: Estoque Físico Contado */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                Estoque Físico Real Aferido
              </span>
              <span className="text-[9px] font-bold text-blue-700 uppercase bg-blue-50 px-1.5 py-0.5 rounded">
                Hoje
              </span>
            </div>

            <div className="mt-2">
              <p className="text-2xl font-black text-blue-800 tracking-tight">
                {formatWeight(totalPhysicalEcoB)}
              </p>
              <p className="text-[9.5px] text-slate-500 font-semibold mt-1">
                Matriz: {formatWeight(physicalMatriz)} • Galpão: {formatWeight(physicalGalpao)}
              </p>
            </div>
          </div>

          {/* Caixa 2: Total Teórico que Deve Ter */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
              Total Teórico que Deve Ter
            </span>
            <div className="mt-2">
              <p className="text-2xl font-black text-slate-800 tracking-tight">
                {formatWeight(activeView.expectedStock)}
              </p>
              <p className="text-[9.5px] text-slate-400 font-semibold mt-1">
                Resultado exato da fórmula do balanço de massa
              </p>
            </div>
          </div>

          {/* Caixa 3: Diferença Apurada (Divergência) */}
          <div
            className={`p-4 rounded-2xl border shadow-xs flex flex-col justify-between transition-all ${
              activeView.difference === 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : activeView.difference > 0
                ? 'bg-sky-50 border-sky-300 text-sky-950'
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider">
                Diferença Apurada
              </span>
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded shadow-2xs ${
                activeView.difference === 0
                  ? 'bg-emerald-600 text-white'
                  : activeView.difference > 0
                  ? 'bg-sky-600 text-white'
                  : 'bg-rose-600 text-white'
              }`}>
                {activeView.difference === 0
                  ? '100% Conciliado'
                  : activeView.difference > 0
                  ? 'Sobra no Estoque Físico'
                  : 'Falta no Estoque Físico'}
              </span>
            </div>

            <div className="mt-2">
              <p className="text-2xl font-black tracking-tight flex items-center gap-1.5">
                {activeView.difference === 0 ? (
                  <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                ) : activeView.difference > 0 ? (
                  <TrendingUp size={24} className="text-sky-600 shrink-0" />
                ) : (
                  <AlertTriangle size={24} className="text-rose-600 shrink-0" />
                )}
                <span>
                  {activeView.difference > 0 ? '+' : ''}
                  {formatWeight(activeView.difference)}
                </span>
              </p>
              <p className="text-[10px] font-bold mt-1 opacity-90 leading-snug">
                {activeView.difference === 0
                  ? 'Estoque perfeitamente conciliado! Nenhuma divergência física.'
                  : activeView.difference > 0
                  ? `Sobra de ${formatWeight(activeView.difference)} a mais no estoque físico do que o previsto pelo cálculo.`
                  : `Falta de ${formatWeight(Math.abs(activeView.difference))} a menos no estoque físico em relação ao previsto.`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. RETORNO À EXTRUSÃO (PELLETS RECICLADOS EREMA)                           */}
      {/* ========================================================================= */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-wider">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Retorno à Extrusão (Pellets Reciclados Erema)</span>
          </div>
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase">
            Reciclado Inicial + Produção Erema - Consumido Cast = Estoque de Pellets
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Caixa 1: Estoque Inicial de Reciclado */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                Reciclado de Partida
              </span>
              <Package size={13} className="text-slate-400" />
            </div>
            <div className="mt-1.5">
              <p className="text-lg sm:text-xl font-black text-slate-800">
                {formatWeight(initialRecycled)}
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                {(initialRecycled / 1100).toFixed(1).replace('.', ',')} bags de pellets
              </p>
            </div>
          </div>

          {/* Caixa 2: Produzido Erema */}
          <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                + Produzido Erema
              </span>
              <TrendingUp size={13} className="text-emerald-600" />
            </div>
            <div className="mt-1.5">
              <p className="text-lg sm:text-xl font-black text-emerald-700">
                +{formatWeight(activeView.eremaProduced)}
              </p>
              <p className="text-[9px] font-bold text-emerald-600/80 uppercase mt-0.5">
                {(activeView.eremaProduced / 1100).toFixed(1).replace('.', ',')} bags produzidas
              </p>
            </div>
          </div>

          {/* Caixa 3: Abatido Cast 1 e 2 */}
          <div className="bg-rose-50/50 p-3.5 rounded-2xl border border-rose-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-rose-700">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                - Consumido Cast 1/2
              </span>
              <TrendingDown size={13} className="text-rose-600" />
            </div>
            <div className="mt-1.5">
              <p className="text-lg sm:text-xl font-black text-rose-700">
                -{formatWeight(activeView.recycledUsed)}
              </p>
              <p className="text-[9px] font-bold text-rose-600/80 uppercase mt-0.5">
                {(activeView.recycledUsed / 1100).toFixed(1).replace('.', ',')} bags consumidas
              </p>
            </div>
          </div>

          {/* Caixa 4: Estoque Atual de Pellets Reciclados */}
          <div className="bg-emerald-800 text-emerald-100 p-3.5 rounded-2xl border border-emerald-700 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-200">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                Pellets Disponíveis
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            </div>
            <div className="mt-1.5">
              <p className="text-xl sm:text-2xl font-black text-white">
                {formatWeight(activeView.availableRecycled)}
              </p>
              <p className="text-[9px] font-bold text-emerald-200 uppercase mt-0.5">
                {(activeView.availableRecycled / 1100).toFixed(1).replace('.', ',')} bags em estoque
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. MODAL COMPLETO DE CONFIGURAÇÃO E AJUSTES DE MATRIZ E GALPÃO            */}
      {/* ========================================================================= */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header Modal */}
            <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-400/30 flex items-center justify-center">
                  <Scale size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-tight">
                    Ajustar Parâmetros do Balanço de Eco B
                  </h3>
                  <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Diferenciação Matriz & Galpão • Ciclo Dias 25, 26 e 27
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveConfigModal} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-blue-900 text-xs">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <Info size={14} className="text-blue-600 shrink-0" />
                  <span>Configurações Oficiais de Estoque e Ciclo</span>
                </p>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Informe as contagens físicas separadas por localidade (Matriz e Galpão) e os dias considerados na movimentação do balanço.
                </p>
              </div>

              {/* SEÇÃO 1: ÚLTIMA CONTAGEM BASE (DIA 25 REF. 24) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-[10.5px] font-black uppercase text-slate-800 block">
                  1. Última Contagem Base (Dia 25 referente ao dia 24)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9.5px] font-black uppercase text-slate-600 block mb-1">
                      Matriz (kg)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formInitialMatriz}
                      onChange={e => setFormInitialMatriz(e.target.value)}
                      placeholder="Ex: 18071"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-800 outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-[9.5px] font-black uppercase text-slate-600 block mb-1">
                      Galpão (kg)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formInitialGalpao}
                      onChange={e => setFormInitialGalpao(e.target.value)}
                      placeholder="Ex: 111991"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-800 outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="text-[10px] font-bold text-slate-500 flex items-center justify-between border-t border-slate-200 pt-2">
                  <span>Total Base Calculado:</span>
                  <span className="text-slate-800 font-black">
                    {formatWeight((Number(formInitialMatriz) || 0) + (Number(formInitialGalpao) || 0))}
                  </span>
                </div>
              </div>

              {/* SEÇÃO 2: CONTAGEM FÍSICA REAL HOJE */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-[10.5px] font-black uppercase text-slate-800 block">
                  2. Contagem Física Real Aferida Hoje
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9.5px] font-black uppercase text-slate-600 block mb-1">
                      Matriz Hoje (kg)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formPhysicalMatriz}
                      onChange={e => setFormPhysicalMatriz(e.target.value)}
                      placeholder="Ex: 20385"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[9.5px] font-black uppercase text-slate-600 block mb-1">
                      Galpão Hoje (kg)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formPhysicalGalpao}
                      onChange={e => setFormPhysicalGalpao(e.target.value)}
                      placeholder="Ex: 111991"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="text-[10px] font-bold text-slate-500 flex items-center justify-between border-t border-slate-200 pt-2">
                  <span>Total Físico Real Hoje:</span>
                  <span className="text-blue-700 font-black">
                    {formatWeight((Number(formPhysicalMatriz) || 0) + (Number(formPhysicalGalpao) || 0))}
                  </span>
                </div>
              </div>

              {/* SEÇÃO 3: PELLETS RECICLADOS DE PARTIDA */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                  3. Estoque de Início de Pellets Reciclados Erema (kg)
                </label>
                <input
                  type="number"
                  step="any"
                  value={formInitialRecycled}
                  onChange={e => setFormInitialRecycled(e.target.value)}
                  placeholder="Ex: 0"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* SEÇÃO 4: OBSERVAÇÕES */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">
                  4. Observações / Anotações
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Ex: Contagem base dia 25 (ref. 24). Movimentação apurada nos dias 25, 26 e 27."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none resize-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>Salvar Parâmetros</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
