import React, { useState, useMemo } from 'react';
import { 
  X, BarChart3, AlertCircle, Clock, Calendar, Filter, 
  Search, Download, CheckCircle, RefreshCw, Layers, ChevronRight, 
  TrendingUp, Award, ArrowUpRight, FileText, ChevronDown, Wrench, Settings, Package, Sliders
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell, ComposedChart, Area, Line
} from 'recharts';
import { ProductionEntry, RibbonCuttingEntry } from '../types';

interface DowntimeAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionData: ProductionEntry[];
  ribbonEntries?: RibbonCuttingEntry[];
}

interface StoppageOccurrence {
  id: string;
  reason: string;
  category: 'Manutenção' | 'Processo' | 'Outros';
  minutes: number;
  date: string;
  year: string;
  month: string;
  machine: string;
  shift: string;
  operator: string;
  de?: string;
  ate?: string;
}

interface AggregatedReason {
  reason: string;
  category: 'Manutenção' | 'Processo' | 'Outros';
  count: number;
  totalMinutes: number;
  avgMinutes: number;
  pctOfTotalTime: number;
  pctOfTotalCount: number;
  machinesMap: Record<string, number>;
  topMachine: string;
  occurrences: StoppageOccurrence[];
}

const CATEGORY_COLORS = {
  'Manutenção': '#f97316', // Orange
  'Processo': '#3b82f6',   // Blue
  'Outros': '#64748b'     // Slate
};

export const DowntimeAnalyticsModal: React.FC<DowntimeAnalyticsModalProps> = ({
  isOpen,
  onClose,
  productionData = [],
  ribbonEntries = []
}) => {
  // Filter States
  const [selectedMachine, setSelectedMachine] = useState<string>('Todas');
  const [selectedShift, setSelectedShift] = useState<string>('Todos');
  const [selectedYear, setSelectedYear] = useState<string>('Todos');
  const [selectedMonth, setSelectedMonth] = useState<string>('Todos');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Drilldown Modal State for inspecting specific reason launches
  const [drilldownReason, setDrilldownReason] = useState<AggregatedReason | null>(null);

  // 1. Flatten all stoppage entries into a uniform list of occurrences
  const rawOccurrences = useMemo(() => {
    const list: StoppageOccurrence[] = [];

    const parseStopsJSON = (raw: string | undefined): { de: string; ate: string; motivo: string }[] => {
      if (!raw) return [];
      const trimmed = raw.trim();
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => {
            const de = (item.de || '').trim();
            const ate = (item.ate || '').trim();
            const motivo = (item.motivo || item.keyword || '').trim();
            const explicacao = (item.explicacao || item.justification || item.observacao || item.observacoes || item.descricao || '').trim();
            let desc = '';
            if (motivo && explicacao && motivo.toLowerCase() !== explicacao.toLowerCase()) {
              desc = `${motivo} (${explicacao})`;
            } else {
              desc = explicacao || motivo || '';
            }
            return {
              de,
              ate,
              motivo: desc
            };
          }).filter(item => item.de || item.ate || item.motivo);
        }
      } catch (e) {
        if (trimmed) {
          return [{ de: '', ate: '', motivo: trimmed }];
        }
      }
      return [];
    };

    const getDiffMin = (de: string, ate: string): number => {
      if (!de || !ate) return 0;
      const [h1, m1] = de.split(':').map(Number);
      const [h2, m2] = ate.split(':').map(Number);
      if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
      let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diff < 0) diff += 1440; // overnight
      return diff;
    };

    // Process Production Entries (Extrusão)
    productionData.forEach(e => {
      if (!e || !e.date) return;
      const year = e.date.substring(0, 4);
      const month = e.date.substring(5, 7);
      const machine = e.machine || 'Sem Máquina';
      const shift = e.shift || 'Sem Turno';
      const operator = e.operator || 'Sem Operador';

      // Manutenção
      const mList = parseStopsJSON(e.manutencaoMotivo);
      if (mList.length > 0) {
        mList.forEach((item, idx) => {
          const min = getDiffMin(item.de, item.ate) || Number(e.manutencaoMin || 0) / mList.length;
          list.push({
            id: `${e.id}-manut-${idx}`,
            reason: item.motivo || 'Manutenção Corretiva / Ajustes',
            category: 'Manutenção',
            minutes: Math.round(min),
            date: e.date,
            year,
            month,
            machine,
            shift,
            operator,
            de: item.de,
            ate: item.ate
          });
        });
      } else if (Number(e.manutencaoMin || 0) > 0) {
        list.push({
          id: `${e.id}-manut-single`,
          reason: e.manutencaoMotivo?.trim() || 'Manutenção Corretiva / Ajustes',
          category: 'Manutenção',
          minutes: Number(e.manutencaoMin),
          date: e.date,
          year,
          month,
          machine,
          shift,
          operator
        });
      }

      // Processo
      const pList = parseStopsJSON(e.processoMotivo);
      if (pList.length > 0) {
        pList.forEach((item, idx) => {
          const min = getDiffMin(item.de, item.ate) || Number(e.processoMin || 0) / pList.length;
          list.push({
            id: `${e.id}-proc-${idx}`,
            reason: item.motivo || 'Regulagem de Processo',
            category: 'Processo',
            minutes: Math.round(min),
            date: e.date,
            year,
            month,
            machine,
            shift,
            operator,
            de: item.de,
            ate: item.ate
          });
        });
      } else if (Number(e.processoMin || 0) > 0) {
        list.push({
          id: `${e.id}-proc-single`,
          reason: e.processoMotivo?.trim() || 'Regulagem de Processo',
          category: 'Processo',
          minutes: Number(e.processoMin),
          date: e.date,
          year,
          month,
          machine,
          shift,
          operator
        });
      }

      // Outros
      const oList = parseStopsJSON(e.outrosMotivo);
      if (oList.length > 0) {
        oList.forEach((item, idx) => {
          const min = getDiffMin(item.de, item.ate) || Number(e.outrosMin || 0) / oList.length;
          list.push({
            id: `${e.id}-outr-${idx}`,
            reason: item.motivo || 'Outras Ocorrências Operacionais',
            category: 'Outros',
            minutes: Math.round(min),
            date: e.date,
            year,
            month,
            machine,
            shift,
            operator,
            de: item.de,
            ate: item.ate
          });
        });
      } else if (Number(e.outrosMin || 0) > 0) {
        list.push({
          id: `${e.id}-outr-single`,
          reason: e.outrosMotivo?.trim() || 'Outras Ocorrências Operacionais',
          category: 'Outros',
          minutes: Number(e.outrosMin),
          date: e.date,
          year,
          month,
          machine,
          shift,
          operator
        });
      }
    });

    // Process Ribbon Cutting Entries (Corte de Fita)
    ribbonEntries.forEach(e => {
      if (!e || !e.date) return;
      const year = e.date.substring(0, 4);
      const month = e.date.substring(5, 7);
      const machine = 'Corte de Fita';
      const shift = e.shift || 'Sem Turno';
      const operator = e.operator || 'Sem Operador';

      if (e.stoppedReason && e.stoppedReason.trim()) {
        list.push({
          id: `ribbon-${e.id}-stop`,
          reason: e.stoppedReason.trim(),
          category: 'Outros',
          minutes: Number(e.stoppedMinutes || 0),
          date: e.date,
          year,
          month,
          machine,
          shift,
          operator
        });
      }
    });

    return list;
  }, [productionData, ribbonEntries]);

  // Extract list of machines, shifts, years, months for filters
  const availableMachines = useMemo(() => {
    const set = new Set<string>();
    rawOccurrences.forEach(o => set.add(o.machine));
    return Array.from(set).sort();
  }, [rawOccurrences]);

  const availableShifts = useMemo(() => {
    const set = new Set<string>();
    rawOccurrences.forEach(o => set.add(o.shift));
    return Array.from(set).sort();
  }, [rawOccurrences]);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    rawOccurrences.forEach(o => set.add(o.year));
    return Array.from(set).sort().reverse();
  }, [rawOccurrences]);

  // 2. Filter Occurrences based on user selection
  const filteredOccurrences = useMemo(() => {
    return rawOccurrences.filter(item => {
      if (selectedMachine !== 'Todas' && item.machine !== selectedMachine) return false;
      if (selectedShift !== 'Todos' && item.shift !== selectedShift) return false;
      if (selectedYear !== 'Todos' && item.year !== selectedYear) return false;
      if (selectedMonth !== 'Todos' && item.month !== selectedMonth) return false;
      if (selectedCategory !== 'Todas' && item.category !== selectedCategory) return false;

      if (startDate && item.date < startDate) return false;
      if (endDate && item.date > endDate) return false;

      if (searchTerm) {
        const query = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normReason = item.reason.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normOp = item.operator.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normMac = item.machine.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normCat = item.category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const matchesReason = normReason.includes(query);
        const matchesOp = normOp.includes(query);
        const matchesMac = normMac.includes(query);
        const matchesCat = normCat.includes(query);
        if (!matchesReason && !matchesOp && !matchesMac && !matchesCat) return false;
      }

      return true;
    });
  }, [
    rawOccurrences, selectedMachine, selectedShift, selectedYear, 
    selectedMonth, selectedCategory, startDate, endDate, searchTerm
  ]);

  // 3. Aggregate Occurrences by Reason Name
  const aggregatedReasons = useMemo<AggregatedReason[]>(() => {
    const map: Record<string, {
      category: 'Manutenção' | 'Processo' | 'Outros';
      count: number;
      totalMinutes: number;
      machinesMap: Record<string, number>;
      occurrences: StoppageOccurrence[];
    }> = {};

    let grandTotalMin = 0;
    let grandTotalCount = filteredOccurrences.length;

    filteredOccurrences.forEach(item => {
      grandTotalMin += item.minutes;
      if (!map[item.reason]) {
        map[item.reason] = {
          category: item.category,
          count: 0,
          totalMinutes: 0,
          machinesMap: {},
          occurrences: []
        };
      }

      map[item.reason].count += 1;
      map[item.reason].totalMinutes += item.minutes;
      map[item.reason].machinesMap[item.machine] = (map[item.reason].machinesMap[item.machine] || 0) + 1;
      map[item.reason].occurrences.push(item);
    });

    const result: AggregatedReason[] = Object.keys(map).map(reasonKey => {
      const item = map[reasonKey];
      const count = item.count;
      const totalMinutes = item.totalMinutes;
      const avgMinutes = count > 0 ? Math.round(totalMinutes / count) : 0;
      const pctOfTotalTime = grandTotalMin > 0 ? (totalMinutes / grandTotalMin) * 100 : 0;
      const pctOfTotalCount = grandTotalCount > 0 ? (count / grandTotalCount) * 100 : 0;

      let topMachine = '-';
      let maxMacCount = 0;
      Object.entries(item.machinesMap).forEach(([mac, macCount]) => {
        if (macCount > maxMacCount) {
          maxMacCount = macCount;
          topMachine = mac;
        }
      });

      return {
        reason: reasonKey,
        category: item.category,
        count,
        totalMinutes,
        avgMinutes,
        pctOfTotalTime,
        pctOfTotalCount,
        machinesMap: item.machinesMap,
        topMachine,
        occurrences: item.occurrences.sort((a, b) => b.date.localeCompare(a.date))
      };
    });

    // Default sort by frequency (most recurrent first)
    return result.sort((a, b) => b.count - a.count);
  }, [filteredOccurrences]);

  // KPI Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalOccurrences = filteredOccurrences.length;
    const totalMinutes = filteredOccurrences.reduce((acc, o) => acc + o.minutes, 0);
    const avgMinutes = totalOccurrences > 0 ? Math.round(totalMinutes / totalOccurrences) : 0;

    const sortedByCount = [...aggregatedReasons].sort((a, b) => b.count - a.count);
    const sortedByTime = [...aggregatedReasons].sort((a, b) => b.totalMinutes - a.totalMinutes);

    const topFrequencyReason = sortedByCount[0] || null;
    const topDurationReason = sortedByTime[0] || null;

    return {
      totalOccurrences,
      totalMinutes,
      avgMinutes,
      topFrequencyReason,
      topDurationReason
    };
  }, [filteredOccurrences, aggregatedReasons]);

  // Chart Data: Top 8 Most Recurrent Reasons
  const chartTopOccurrences = useMemo(() => {
    return aggregatedReasons.slice(0, 8).map(r => ({
      name: r.reason.length > 28 ? r.reason.substring(0, 26) + '...' : r.reason,
      fullName: r.reason,
      ocorrencias: r.count,
      minutos: r.totalMinutes,
      mediaMin: r.avgMinutes,
      categoria: r.category
    }));
  }, [aggregatedReasons]);

  // Chart Data: Top 8 Longest Lost Duration
  const chartTopDuration = useMemo(() => {
    return [...aggregatedReasons].sort((a, b) => b.totalMinutes - a.totalMinutes).slice(0, 8).map(r => ({
      name: r.reason.length > 28 ? r.reason.substring(0, 26) + '...' : r.reason,
      fullName: r.reason,
      horas: Number((r.totalMinutes / 60).toFixed(1)),
      minutos: r.totalMinutes,
      ocorrencias: r.count,
      categoria: r.category
    }));
  }, [aggregatedReasons]);

  // Chart Data: Category Breakdown
  const chartCategoryBreakdown = useMemo(() => {
    const map = { 'Manutenção': 0, 'Processo': 0, 'Outros': 0 };
    filteredOccurrences.forEach(o => {
      map[o.category] += o.minutes;
    });
    return [
      { name: 'Manutenção', value: map['Manutenção'], color: CATEGORY_COLORS['Manutenção'] },
      { name: 'Processo', value: map['Processo'], color: CATEGORY_COLORS['Processo'] },
      { name: 'Outros', value: map['Outros'], color: CATEGORY_COLORS['Outros'] },
    ].filter(c => c.value > 0);
  }, [filteredOccurrences]);

  const formatMinutes = (val: number) => {
    if (val >= 60) {
      const h = Math.floor(val / 60);
      const m = val % 60;
      return `${h}h ${m}m`;
    }
    return `${val} min`;
  };

  if (!isOpen) return null;

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Rank;Motivo;Categoria;Ocorrencias;Tempo_Total_Min;Tempo_Total_Horas;Tempo_Medio_Min;Pct_Tempo_Total;Maquina_Mais_Afetada\n";

    aggregatedReasons.forEach((item, index) => {
      const row = [
        index + 1,
        `"${item.reason.replace(/"/g, '""')}"`,
        item.category,
        item.count,
        item.totalMinutes,
        (item.totalMinutes / 60).toFixed(2),
        item.avgMinutes,
        `${item.pctOfTotalTime.toFixed(2)}%`,
        `"${item.topMachine}"`
      ].join(";");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Analise_Paradas_BI_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-2 md:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-slate-900 text-white rounded-[2rem] md:rounded-[3rem] w-full max-w-7xl shadow-2xl relative overflow-hidden flex flex-col max-h-[96vh] border border-slate-800" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 md:px-8 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600/20 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/30 shadow-inner">
              <BarChart3 size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">Análise BI de Paradas de Máquina</h3>
                <span className="bg-blue-600 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-widest">BI Intelligence</span>
              </div>
              <p className="text-[10px] md:text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">
                Ranking de ocorrências, causas mais frequentes e impacto no tempo inativo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-2xl text-xs font-black uppercase transition-all"
            >
              <Download size={16} /> Exportar CSV
            </button>
            <button onClick={onClose} className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl transition-all active:scale-95">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-slate-950 p-4 md:p-6 border-b border-slate-800/80 shrink-0 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            
            {/* Máquina */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Máquina</label>
              <select
                value={selectedMachine}
                onChange={e => setSelectedMachine(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Todas">Todas as Máquinas</option>
                {availableMachines.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Turno */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Turno</label>
              <select
                value={selectedShift}
                onChange={e => setSelectedShift(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Todos">Todos os Turnos</option>
                {availableShifts.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Ano */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Ano</label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Todos">Todos os Anos</option>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Mês */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Mês</label>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Todos">Todos os Meses</option>
                <option value="01">Janeiro</option>
                <option value="02">Fevereiro</option>
                <option value="03">Março</option>
                <option value="04">Abril</option>
                <option value="05">Maio</option>
                <option value="06">Junho</option>
                <option value="07">Julho</option>
                <option value="08">Agosto</option>
                <option value="09">Setembro</option>
                <option value="10">Outubro</option>
                <option value="11">Novembro</option>
                <option value="12">Dezembro</option>
              </select>
            </div>

            {/* Categoria */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Categoria</label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Todas">Todas as Categorias</option>
                <option value="Manutenção">🛠️ Manutenção</option>
                <option value="Processo">⚙️ Processo</option>
                <option value="Outros">📦 Outros</option>
              </select>
            </div>

            {/* Free Search */}
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Buscar Motivo / Op</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              </div>
            </div>

          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-8 custom-scrollbar">

          {/* 1. KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Occurrences */}
            <div className="bg-slate-800/80 p-5 rounded-3xl border border-slate-700/80 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Total de Ocorrências</span>
                <p className="text-3xl font-black text-white mt-1">{summaryMetrics.totalOccurrences}</p>
              </div>
              <p className="text-[10px] font-extrabold text-blue-400 uppercase mt-3 flex items-center gap-1">
                <AlertCircle size={12} /> {aggregatedReasons.length} motivos distintos
              </p>
            </div>

            {/* Total Minutes / Hours */}
            <div className="bg-slate-800/80 p-5 rounded-3xl border border-slate-700/80 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">Tempo Total Inativo</span>
                <p className="text-3xl font-black text-amber-400 mt-1">{formatMinutes(summaryMetrics.totalMinutes)}</p>
              </div>
              <p className="text-[10px] font-extrabold text-slate-400 uppercase mt-3">
                Média por parada: <span className="text-white font-black">{summaryMetrics.avgMinutes} min</span>
              </p>
            </div>

            {/* Most Recurrent Problem (Vilão de Frequência) */}
            <div className="bg-slate-800/80 p-5 rounded-3xl border border-rose-500/30 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 rounded-bl-full pointer-events-none"></div>
              <div>
                <span className="text-[9px] font-black uppercase text-rose-400 tracking-widest block">Vilão de Frequência (Mais Recorrente)</span>
                <p className="text-xs font-black text-white mt-2 line-clamp-2 leading-tight">
                  {summaryMetrics.topFrequencyReason?.reason || 'Nenhuma parada registrada'}
                </p>
              </div>
              {summaryMetrics.topFrequencyReason && (
                <div className="text-[10px] font-extrabold text-rose-300 uppercase mt-3 flex justify-between">
                  <span>{summaryMetrics.topFrequencyReason.count} vezes ocorrido</span>
                  <span>{formatMinutes(summaryMetrics.topFrequencyReason.totalMinutes)}</span>
                </div>
              )}
            </div>

            {/* Longest Duration Problem (Vilão do OEE) */}
            <div className="bg-slate-800/80 p-5 rounded-3xl border border-orange-500/30 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-bl-full pointer-events-none"></div>
              <div>
                <span className="text-[9px] font-black uppercase text-orange-400 tracking-widest block">Maior Impacto de Tempo Perdido</span>
                <p className="text-xs font-black text-white mt-2 line-clamp-2 leading-tight">
                  {summaryMetrics.topDurationReason?.reason || 'Nenhuma parada registrada'}
                </p>
              </div>
              {summaryMetrics.topDurationReason && (
                <div className="text-[10px] font-extrabold text-orange-300 uppercase mt-3 flex justify-between">
                  <span>{formatMinutes(summaryMetrics.topDurationReason.totalMinutes)} perdidos</span>
                  <span>{summaryMetrics.topDurationReason.count} ocorrências</span>
                </div>
              )}
            </div>

          </div>

          {/* 2. Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Ranking dos Motivos Mais Recorrentes (Frequência) */}
            <div className="bg-slate-800/60 p-6 rounded-3xl border border-slate-700/80 space-y-4">
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-400" /> Motivos Mais Recorrentes (Top 8 Frequência)
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Quantas vezes o mesmo problema se repetiu no período</p>
              </div>

              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartTopOccurrences} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                    <XAxis type="number" stroke="#94a3b8" style={{ fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" style={{ fontSize: 9, fontWeight: 'bold' }} width={160} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '1rem', color: '#fff' }}
                      formatter={(val: any) => [`${val} ocorrências`, 'Frequência']}
                    />
                    <Bar dataKey="ocorrencias" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Top Horas Perdidas (Impacto Inativo) */}
            <div className="bg-slate-800/60 p-6 rounded-3xl border border-slate-700/80 space-y-4">
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Clock size={16} className="text-amber-400" /> Top Motivos por Horas Perdidas (Impacto Inativo)
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Total de horas acumuladas de paralisação por motivo</p>
              </div>

              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartTopDuration} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: 9, fontWeight: 'bold' }} />
                    <YAxis stroke="#94a3b8" style={{ fontSize: 10, fontWeight: 'bold' }} unit=" h" />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '1rem', color: '#fff' }}
                      formatter={(val: any) => [`${val} Horas`, 'Duração Perdida']}
                    />
                    <Bar dataKey="horas" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* 3. Detailed Interactive Table */}
          <div className="bg-slate-800/60 rounded-3xl border border-slate-700/80 overflow-hidden shadow-lg">
            <div className="px-6 py-5 bg-slate-800 border-b border-slate-700 flex justify-between items-center flex-wrap gap-3">
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers size={18} className="text-blue-400" /> Tabela Detalhada de Motivos & Ocorrências
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                  Clique em qualquer motivo para visualizar o histórico individual de lançamentos
                </p>
              </div>

              <span className="text-xs font-black text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
                {aggregatedReasons.length} motivos na filtragem
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/80 text-[10px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-700">
                    <th className="py-3.5 px-4 text-center"># Rank</th>
                    <th className="py-3.5 px-6">Motivo de Parada</th>
                    <th className="py-3.5 px-4">Categoria</th>
                    <th className="py-3.5 px-4 text-center">Ocorrências</th>
                    <th className="py-3.5 px-4 text-right">Tempo Total</th>
                    <th className="py-3.5 px-4 text-right">% do Tempo</th>
                    <th className="py-3.5 px-4 text-right">Média / Parada</th>
                    <th className="py-3.5 px-4">Máq. Mais Afetada</th>
                    <th className="py-3.5 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 text-xs font-bold text-slate-200">
                  {aggregatedReasons.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400 font-extrabold uppercase">
                        Nenhuma parada encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    aggregatedReasons.map((item, index) => {
                      const badgeColor = item.category === 'Manutenção'
                        ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                        : item.category === 'Processo'
                          ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                          : 'bg-slate-500/20 text-slate-300 border-slate-500/30';

                      return (
                        <tr 
                          key={index} 
                          onClick={() => setDrilldownReason(item)}
                          className="hover:bg-slate-700/50 cursor-pointer transition-colors group"
                        >
                          <td className="py-3.5 px-4 text-center font-black text-slate-400 group-hover:text-white">
                            {index + 1}º
                          </td>

                          <td className="py-3.5 px-6 font-extrabold text-white group-hover:text-blue-300 transition-colors">
                            {item.reason}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${badgeColor}`}>
                              {item.category}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center font-black text-blue-400 text-sm">
                            {item.count}x
                          </td>

                          <td className="py-3.5 px-4 text-right font-black text-amber-400 whitespace-nowrap">
                            {formatMinutes(item.totalMinutes)}
                          </td>

                          <td className="py-3.5 px-4 text-right font-black text-slate-300">
                            {item.pctOfTotalTime.toFixed(1)}%
                          </td>

                          <td className="py-3.5 px-4 text-right font-bold text-slate-400 whitespace-nowrap">
                            {item.avgMinutes} min
                          </td>

                          <td className="py-3.5 px-4 font-extrabold text-slate-300 whitespace-nowrap">
                            {item.topMachine}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDrilldownReason(item);
                              }}
                              className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-xl text-[10px] font-black uppercase border border-blue-500/30 transition-all"
                            >
                              Ver Lançamentos
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 md:px-8 py-4 bg-slate-950 border-t border-slate-800 flex justify-between items-center shrink-0">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
            Análise consolidada em tempo real com base nos registros do sistema.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 text-white rounded-2xl text-xs font-black uppercase hover:bg-slate-700 transition-all shadow-md"
          >
            Fechar
          </button>
        </div>

      </div>

      {/* Drilldown Sub-Modal: Individual Launches for Selected Reason */}
      {drilldownReason && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setDrilldownReason(null)}>
          <div className="bg-slate-900 text-white rounded-[2rem] w-full max-w-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] border border-slate-700" onClick={e => e.stopPropagation()}>
            
            <div className="px-6 py-5 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black uppercase text-blue-400 tracking-widest block">Detalhamento de Ocorrências</span>
                <h4 className="text-lg font-black text-white mt-0.5">{drilldownReason.reason}</h4>
              </div>
              <button onClick={() => setDrilldownReason(null)} className="p-2 text-slate-400 hover:text-white rounded-xl">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 bg-slate-950 border-b border-slate-800 grid grid-cols-3 gap-2 text-center text-xs font-bold">
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[9px] uppercase text-slate-500 block">Total Ocorrências</span>
                <span className="text-base font-black text-blue-400">{drilldownReason.count} vezes</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[9px] uppercase text-slate-500 block">Tempo Total</span>
                <span className="text-base font-black text-amber-400">{formatMinutes(drilldownReason.totalMinutes)}</span>
              </div>
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[9px] uppercase text-slate-500 block">Média por Parada</span>
                <span className="text-base font-black text-slate-300">{drilldownReason.avgMinutes} min</span>
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {drilldownReason.occurrences.map((occ, idx) => (
                <div key={idx} className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 flex justify-between items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">{occ.date.split('-').reverse().join('/')}</span>
                      <span className="text-[10px] font-extrabold bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{occ.machine}</span>
                      <span className="text-[10px] font-extrabold bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded-full">{occ.shift}</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 mt-1">
                      Operador: <span className="text-slate-200 font-extrabold">{occ.operator}</span>
                      {occ.de && occ.ate && <span className="ml-2 text-slate-400">({occ.de} às {occ.ate})</span>}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-amber-400 block">{occ.minutes} min</span>
                    <span className="text-[9px] font-extrabold text-slate-500 uppercase">{occ.category}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 text-right">
              <button
                onClick={() => setDrilldownReason(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase"
              >
                Voltar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
