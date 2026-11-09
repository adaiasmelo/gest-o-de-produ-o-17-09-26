import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowUpRight, ArrowDownRight, Info, Calendar, Users, AlertCircle, 
  TrendingUp, TrendingDown, Clock, Scale, Sliders, Award, Activity, 
  ChevronDown, Zap, Minimize2, CheckCircle, Layers, HelpCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, Line, ComposedChart
} from 'recharts';
import { RibbonCuttingEntry, Employee } from '../types';

interface RibbonBiAnalyticsViewProps {
  ribbonEntries: RibbonCuttingEntry[];
  ribbonGoals: Record<string, any>;
  employees?: Employee[];
}

// "em todo o sistema sempre que o valor for igual o maior que mil deve ser apresentado com T se for menor que mil deve ser apresentado com Kg."
const formatWeight = (val: number | null | undefined) => {
  const num = Number(val);
  if (isNaN(num)) return '0 Kg';
  const absVal = Math.abs(num);
  if (absVal >= 1000) {
    return (num / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).replace(',', '.') + ' T';
  }
  return num.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' Kg';
};

const formatM2 = (val: number | null | undefined) => {
  const num = Number(val);
  if (isNaN(num)) return '0 m²';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' m²';
};

const formatPercent = (val: number | null | undefined) => {
  const num = Number(val);
  if (isNaN(num)) return '0,00%';
  return `${num.toFixed(2).replace('.', ',')}%`;
};

const formatMinutes = (val: number) => {
  if (val >= 60) {
    const hrs = Math.floor(val / 60);
    const mins = val % 60;
    return `${hrs}h ${mins}m`;
  }
  return `${val} min`;
};

const JUMBO_MICRAS_MAP: Record<string, number> = {
  'AR9': 45,
  'AA 38': 38,
  'AS 50': 50,
  'HOTMAILT': 38,
};

const getJumboMicras = (jumboType: string): number => {
  if (!jumboType) return 0;
  const clean = jumboType.toUpperCase().replace(/\s+/g, '').trim();
  if (clean.includes('AR9')) return 45;
  if (clean.includes('AA38') || clean.includes('AA40')) return 38;
  if (clean.includes('AS50')) return 50;
  if (clean.includes('HOTMALT') || clean.includes('HOTMAILT')) return 38;
  
  const exactKey = jumboType.toUpperCase().trim();
  if (JUMBO_MICRAS_MAP[exactKey]) {
    return JUMBO_MICRAS_MAP[exactKey];
  }
  return 0;
};

const calculateLostM2 = (weightKg: number, jumboType: string) => {
  if (!weightKg || !jumboType) return 0;
  const micras = getJumboMicras(jumboType);
  if (!micras) return 0;
  const gr = micras * 0.92;
  return (weightKg * 1000) / gr;
};

const translateMonthYear = (monthStr: string) => {
  if (!monthStr || !monthStr.includes('-')) return monthStr;
  const [year, month] = monthStr.split('-');
  const monthsPt = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const monthIdx = parseInt(month, 10) - 1;
  return `${monthsPt[monthIdx] || month} de ${year}`;
};

export const RibbonBiAnalyticsView: React.FC<RibbonBiAnalyticsViewProps> = ({ 
  ribbonEntries, 
  ribbonGoals, 
  employees 
}) => {
  // Available list of months with valid data
  const monthsList = useMemo(() => {
    if (!Array.isArray(ribbonEntries)) return [];
    const months = new Set<string>();
    ribbonEntries.forEach(e => {
      if (e && e.date && e.date.length >= 7) {
        months.add(e.date.substring(0, 7));
      }
    });
    return Array.from(months).sort();
  }, [ribbonEntries]);

  // Selected periods for A and B deep comparative analysis
  const [periodA, setPeriodA] = useState<string>(() => monthsList[monthsList.length - 2] || monthsList[0] || '');
  const [periodB, setPeriodB] = useState<string>(() => monthsList[monthsList.length - 1] || monthsList[0] || '');

  // Active section inside Ribbon BI
  const [biActiveSection, setBiActiveSection] = useState<'matrix' | 'mom_yoy' | 'stoppages' | 'operators' | 'dynamic'>('matrix');

  // Dynamic ranking & metrics variables for Ribbon Cutting
  const [ribbonBiDynamicGroup, setRibbonBiDynamicGroup] = useState<'operator' | 'shift' | 'machine' | 'jumboType'>('operator');
  const [ribbonBiDynamicMetric, setRibbonBiDynamicMetric] = useState<string>('producedM2');

  // State for matrix filter mode: 'all' (Todos), 'related' (Qualquer relação com A/B), 'active' (Apenas A vs B)
  const [matrixFilterMode, setMatrixFilterMode] = useState<'all' | 'related' | 'active'>('related');

  // Search details
  const [combinationSearch, setCombinationSearch] = useState('');
  const [operatorSearch, setOperatorSearch] = useState('');

  // Operator monthly bonus (single meta of R$ 250)
  const [metaMensalBonus, setMetaMensalBonus] = useState<number>(250);

  // Helper to extract operator level and corresponding bonus reference from employees allocations database
  const getOperatorDetails = (opName?: string) => {
    if (!opName) {
      return { level: 1, roleName: 'Operador 1', bonusRef: metaMensalBonus };
    }
    const listEmps = employees || [];
    const targetName = String(opName).trim().toLowerCase();
    const emp = listEmps.find(e => e && e.name && String(e.name).trim().toLowerCase() === targetName);
    if (!emp) {
      return { level: 1, roleName: 'Operador 1', bonusRef: metaMensalBonus };
    }
    
    const roleStr = String(emp.role || '').toLowerCase();
    let level = 1;
    let roleDisplay = emp.role || 'Operador 1';
    
    if (roleStr.includes('3') || roleStr.includes('iii') || roleStr.includes('operador 3')) {
      level = 3;
    } else if (roleStr.includes('2') || roleStr.includes('ii') || roleStr.includes('operador 2')) {
      level = 2;
    } else if (roleStr.includes('1') || roleStr.includes('i') || roleStr.includes('operador 1')) {
      level = 1;
    } else {
      level = 1;
    }

    return { level, roleName: roleDisplay, bonusRef: metaMensalBonus };
  };

  // Group metrics by Month
  const monthlyMetrics = useMemo(() => {
    const acc: Record<string, {
      monthStr: string;
      producedM2: number;
      wasteWeight: number;
      wasteM2: number;
      jumboM2: number;
      stoppedMinutes: number;
      rejectedM2: number;
      yieldPercent: number;
      lossPercent: number;
      manutencaoMin: number;
      processoMin: number;
      outrosMin: number;
      totalStoppage: number;
      jumboBreakdown: Record<string, { used: number; waste: number; rolls: number }>;
    }> = {};

    if (!Array.isArray(ribbonEntries)) return acc;

    ribbonEntries.forEach(e => {
      const m = e.date.substring(0, 7);
      if (!acc[m]) {
        acc[m] = {
          monthStr: m,
          producedM2: 0,
          wasteWeight: 0,
          wasteM2: 0,
          jumboM2: 0,
          stoppedMinutes: 0,
          rejectedM2: 0,
          yieldPercent: 100,
          lossPercent: 0,
          manutencaoMin: 0,
          processoMin: 0,
          outrosMin: 0,
          totalStoppage: 0,
          jumboBreakdown: {}
        };
      }

      acc[m].producedM2 += (e.producedM2 || 0);
      acc[m].wasteWeight += (e.wasteWeight || 0);
      acc[m].jumboM2 += (e.jumboM2 || 0);
      acc[m].rejectedM2 += (e.rejectedM2 || 0);

      if (e.jumboItems && e.jumboItems.length > 0) {
        e.jumboItems.forEach(item => {
          acc[m].wasteM2 += calculateLostM2(item.wasteWeight || 0, item.jumboType || '');
        });
      } else {
        acc[m].wasteM2 += calculateLostM2(e.wasteWeight || 0, e.jumboType || '');
      }

      const mMin = e.manutencaoMin || 0;
      const pMin = e.processoMin || 0;
      const oMin = e.outrosMin || 0;
      const entryTotalStoppage = (mMin || pMin || oMin) ? (mMin + pMin + oMin) : (e.stoppedMinutes || 0);

      acc[m].manutencaoMin += mMin;
      acc[m].processoMin += pMin;
      acc[m].outrosMin += oMin;
      acc[m].totalStoppage += entryTotalStoppage;
      acc[m].stoppedMinutes += entryTotalStoppage;

      // Handle items-specific jumbo items list
      if (e.jumboItems && e.jumboItems.length > 0) {
        e.jumboItems.forEach(item => {
          const type = item.jumboType || 'Outros';
          if (!acc[m].jumboBreakdown[type]) {
            acc[m].jumboBreakdown[type] = { used: 0, waste: 0, rolls: 0 };
          }
          acc[m].jumboBreakdown[type].used += (item.jumboM2 || 0);
          acc[m].jumboBreakdown[type].waste += (item.wasteWeight || 0);
          acc[m].jumboBreakdown[type].rolls += (item.rollsCount || 0);
        });
      } else {
        const type = e.jumboType || 'Outros';
        if (!acc[m].jumboBreakdown[type]) {
          acc[m].jumboBreakdown[type] = { used: 0, waste: 0, rolls: 0 };
        }
        acc[m].jumboBreakdown[type].used += (e.jumboM2 || 0);
        acc[m].jumboBreakdown[type].waste += (e.wasteWeight || 0);
        acc[m].jumboBreakdown[type].rolls += (e.rollsCount || 0);
      }
    });

    // Recompute percentage indices
    Object.keys(acc).forEach(mStr => {
      const data = acc[mStr];
      data.yieldPercent = data.producedM2 > 0 ? ((data.producedM2 - data.rejectedM2) / data.producedM2) * 100 : 100;
      data.lossPercent = data.producedM2 > 0 ? (data.rejectedM2 / data.producedM2) * 100 : 0;
    });

    return acc;
  }, [ribbonEntries]);

  // Selected periods metrics
  const statsA = useMemo(() => {
    return monthlyMetrics[periodA] || {
      monthStr: periodA, producedM2: 0, wasteWeight: 0, wasteM2: 0, jumboM2: 0, stoppedMinutes: 0,
      rejectedM2: 0, yieldPercent: 100, lossPercent: 0, manutencaoMin: 0, processoMin: 0,
      outrosMin: 0, totalStoppage: 0, jumboBreakdown: {}
    };
  }, [monthlyMetrics, periodA]);

  const statsB = useMemo(() => {
    return monthlyMetrics[periodB] || {
      monthStr: periodB, producedM2: 0, wasteWeight: 0, wasteM2: 0, jumboM2: 0, stoppedMinutes: 0,
      rejectedM2: 0, yieldPercent: 100, lossPercent: 0, manutencaoMin: 0, processoMin: 0,
      outrosMin: 0, totalStoppage: 0, jumboBreakdown: {}
    };
  }, [monthlyMetrics, periodB]);

  // Comparative analysis results
  const comparisonResults = useMemo(() => {
    const getPctChange = (a: number, b: number) => {
      if (a === 0) return b > 0 ? 100 : 0;
      return ((b - a) / a) * 100;
    };

    return {
      producedM2A: statsA.producedM2,
      producedM2B: statsB.producedM2,
      producedChange: getPctChange(statsA.producedM2, statsB.producedM2),
      producedAbs: statsB.producedM2 - statsA.producedM2,

      wasteA: statsA.wasteWeight,
      wasteB: statsB.wasteWeight,
      wasteM2A: statsA.wasteM2 || 0,
      wasteM2B: statsB.wasteM2 || 0,
      wasteChange: getPctChange(statsA.wasteWeight, statsB.wasteWeight),
      wasteAbs: statsB.wasteWeight - statsA.wasteWeight,

      yieldA: statsA.yieldPercent,
      yieldB: statsB.yieldPercent,
      yieldChange: statsB.yieldPercent - statsA.yieldPercent,

      lossPercentA: statsA.lossPercent,
      lossPercentB: statsB.lossPercent,
      lossPercentChange: statsB.lossPercent - statsA.lossPercent,

      stoppedA: statsA.totalStoppage,
      stoppedB: statsB.totalStoppage,
      stoppedChange: getPctChange(statsA.totalStoppage, statsB.totalStoppage),
      stoppedAbs: statsB.totalStoppage - statsA.totalStoppage,

      jumboA: statsA.jumboM2,
      jumboB: statsB.jumboM2,
      jumboChange: getPctChange(statsA.jumboM2, statsB.jumboM2),
      jumboAbs: statsB.jumboM2 - statsA.jumboM2,

      maintMinutesA: statsA.manutencaoMin,
      maintMinutesB: statsB.manutencaoMin,
      maintChange: statsB.manutencaoMin - statsA.manutencaoMin,

      procMinutesA: statsA.processoMin,
      procMinutesB: statsB.processoMin,
      procChange: statsB.processoMin - statsA.processoMin,

      otherMinutesA: statsA.outrosMin,
      otherMinutesB: statsB.outrosMin,
      otherChange: statsB.outrosMin - statsA.outrosMin,
    };
  }, [statsA, statsB]);

  // List of all monthly combinations
  const monthlyCombinations = useMemo(() => {
    const list: any[] = [];
    const keys = Object.keys(monthlyMetrics).sort();

    for (let i = 0; i < keys.length; i++) {
      for (let j = 0; j < keys.length; j++) {
        if (i === j) continue;
        const mA = keys[i];
        const mB = keys[j];
        const sA = monthlyMetrics[mA];
        const sB = monthlyMetrics[mB];

        const prodVarPct = sA.producedM2 === 0 ? 0 : ((sB.producedM2 - sA.producedM2) / sA.producedM2) * 100;
        const yieldVar = sB.yieldPercent - sA.yieldPercent;
        const lossVar = sB.lossPercent - sA.lossPercent;
        const wasteVarPct = sA.wasteWeight === 0 ? 0 : ((sB.wasteWeight - sA.wasteWeight) / sA.wasteWeight) * 100;
        const stoppagesVarPct = sA.totalStoppage === 0 ? 0 : ((sB.totalStoppage - sA.totalStoppage) / sA.totalStoppage) * 100;

        list.push({
          id: `${mA}-vs-${mB}`,
          monthA: mA,
          monthB: mB,
          label: `${translateMonthYear(mA)} vs ${translateMonthYear(mB)}`,
          prodA: sA.producedM2,
          prodB: sB.producedM2,
          prodVarPct,
          yieldVar,
          lossA: sA.lossPercent,
          lossB: sB.lossPercent,
          lossVar,
          wasteA: sA.wasteWeight,
          wasteB: sB.wasteWeight,
          wasteVarPct,
          stopA: sA.totalStoppage,
          stopB: sB.totalStoppage,
          stoppagesVarPct
        });
      }
    }
    return list;
  }, [monthlyMetrics]);

  // Filtered combinations
  const filteredCombinations = useMemo(() => {
    let result = monthlyCombinations;

    if (matrixFilterMode === 'active') {
      result = result.filter(c => c.monthA === periodA && c.monthB === periodB);
    } else if (matrixFilterMode === 'related') {
      result = result.filter(c => c.monthA === periodA || c.monthA === periodB || c.monthB === periodA || c.monthB === periodB);
    }

    if (combinationSearch.trim()) {
      const term = combinationSearch.toLowerCase();
      result = result.filter(c => c.label.toLowerCase().includes(term));
    }

    return result;
  }, [monthlyCombinations, matrixFilterMode, periodA, periodB, combinationSearch]);

  // Timeline trend graph data
  const chartTimelineData = useMemo(() => {
    return monthsList.map(m => {
      const s = monthlyMetrics[m];
      return {
        month: m,
        label: m.split('-').reverse().join('/'),
        fullLabel: translateMonthYear(m),
        producao: s.producedM2,
        perdaPerc: parseFloat(s.lossPercent.toFixed(2)),
        yieldPercent: parseFloat(s.yieldPercent.toFixed(2)),
        lixoPeso: s.wasteWeight,
        manutencao: s.manutencaoMin,
        processo: s.processoMin,
        outros: s.outrosMin,
        paradasTotal: s.totalStoppage
      };
    });
  }, [monthsList, monthlyMetrics]);

  // Dynamic metrics choices and computational logic for Ribbon
  const ribbonDynamicMetricsList = useMemo(() => [
    { id: 'producedM2', label: 'Produção Bruta (m²)', getValue: (e: RibbonCuttingEntry) => e.producedM2 || 0, formatter: (val: number) => val.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' m²' },
    { id: 'rejectedM2', label: 'Não Conforme (m²)', getValue: (e: RibbonCuttingEntry) => e.rejectedM2 || 0, formatter: (val: number) => val.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' m²' },
    { id: 'wasteWeight', label: 'Lixo', getValue: (e: RibbonCuttingEntry) => e.wasteWeight || 0, formatter: formatWeight },
    { id: 'jumboM2', label: 'Jumbo Consumido (m²)', getValue: (e: RibbonCuttingEntry) => e.jumboM2 || 0, formatter: (val: number) => val.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' m²' },
    { id: 'rollsCount', label: 'Quantidade de Rolos Produzidos', getValue: (e: RibbonCuttingEntry) => e.rollsCount || 0, formatter: (val: number) => val.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' un' },
    { id: 'stoppedMinutes', label: 'Tempo sob Paradas (min)', getValue: (e: RibbonCuttingEntry) => {
      const mMin = e.manutencaoMin || 0;
      const pMin = e.processoMin || 0;
      const oMin = e.outrosMin || 0;
      return (mMin + pMin + oMin) > 0 ? (mMin + pMin + oMin) : (e.stoppedMinutes || 0);
    }, formatter: formatMinutes },
    { id: 'rate_rejeito', label: 'Índice de Não Conforme (%)', getValue: null, formatter: (val: number) => `${val.toFixed(2).replace('.', ',')}%` },
    { id: 'rate_yield', label: 'Rendimento / Aproveitamento (%)', getValue: null, formatter: (val: number) => `${val.toFixed(2).replace('.', ',')}%` },
  ], []);

  const ribbonDynamicGroups = useMemo(() => [
    { id: 'operator', label: 'Operador', key: 'operator' },
    { id: 'shift', label: 'Turno', key: 'shift' },
    { id: 'machine', label: 'Máquina', key: 'machine' },
    { id: 'jumboType', label: 'Tipo de Jumbo usado', key: 'jumboType' },
  ], []);

  const ribbonDynamicChartData = useMemo(() => {
    if (!Array.isArray(ribbonEntries)) return [];
    
    const map: Record<string, { name: string; value: number; totalM2: number; totalRejected: number }> = {};
    const currentMetric = ribbonDynamicMetricsList.find(m => m.id === ribbonBiDynamicMetric) || ribbonDynamicMetricsList[0];
    const groupKeyAttr = ribbonBiDynamicGroup;

    ribbonEntries.forEach(e => {
      let groupValue = '';
      if (groupKeyAttr === 'operator') groupValue = e.operator || 'N/A';
      else if (groupKeyAttr === 'shift') groupValue = e.shift || 'N/A';
      else if (groupKeyAttr === 'machine') groupValue = e.machine || 'N/A';
      else if (groupKeyAttr === 'jumboType') groupValue = e.jumboType || 'Outros';
      else groupValue = 'N/A';

      if (!groupValue) groupValue = 'N/A';

      if (!map[groupValue]) {
        map[groupValue] = { name: groupValue, value: 0, totalM2: 0, totalRejected: 0 };
      }

      map[groupValue].totalM2 += (e.producedM2 || 0);
      map[groupValue].totalRejected += (e.rejectedM2 || 0);

      if (currentMetric.getValue) {
        map[groupValue].value += currentMetric.getValue(e);
      }
    });

    return Object.values(map).map(item => {
      let finalVal = 0;
      if (ribbonBiDynamicMetric === 'rate_rejeito') {
        finalVal = item.totalM2 > 0 ? (item.totalRejected / item.totalM2) * 100 : 0;
      } else if (ribbonBiDynamicMetric === 'rate_yield') {
        finalVal = item.totalM2 > 0 ? ((item.totalM2 - item.totalRejected) / item.totalM2) * 100 : 100;
      } else {
        finalVal = item.value;
      }
      return {
        name: item.name,
        value: Number(finalVal.toFixed(2))
      };
    }).sort((a, b) => b.value - a.value);
  }, [ribbonEntries, ribbonBiDynamicGroup, ribbonBiDynamicMetric, ribbonDynamicMetricsList]);

  // Aggregate Stoppages by Reason
  const stoppagesDetails = useMemo(() => {
    const retrievePeriodStoppages = (mStr: string) => {
      const reasons: Record<string, number> = {};
      const machines: Record<string, number> = {};
      let totalMinutes = 0;

      ribbonEntries.filter(e => e.date.startsWith(mStr)).forEach(e => {
        const mMin = e.manutencaoMin || 0;
        const pMin = e.processoMin || 0;
        const oMin = e.outrosMin || 0;
        const entryTotal = (mMin || pMin || oMin) ? (mMin + pMin + oMin) : (e.stoppedMinutes || 0);

        if (entryTotal > 0) {
          totalMinutes += entryTotal;
          if (mMin > 0) {
            const r = e.manutencaoMotivo || 'Manutenção Corretiva / Ajuste';
            reasons[r] = (reasons[r] || 0) + mMin;
          }
          if (pMin > 0) {
            const r = e.processoMotivo || 'Processo / Regulagem do Cabeçote';
            reasons[r] = (reasons[r] || 0) + pMin;
          }
          if (oMin > 0) {
            const r = e.outrosMotivo || 'Outros Motivos Operacionais';
            reasons[r] = (reasons[r] || 0) + oMin;
          }
          if (!mMin && !pMin && !oMin) {
            const r = e.stoppedReason || 'Não justificado';
            reasons[r] = (reasons[r] || 0) + entryTotal;
          }

          const mach = e.machine || 'Cortadeira Padrão';
          machines[mach] = (machines[mach] || 0) + entryTotal;
        }
      });

      return {
        totalMinutes,
        reasons: Object.entries(reasons).map(([reason, value]) => ({ reason, value, percent: totalMinutes > 0 ? (value / totalMinutes) * 100 : 0 })).sort((a,b)=>b.value - a.value),
        machines: Object.entries(machines).map(([machine, value]) => ({ machine, value, percent: totalMinutes > 0 ? (value / totalMinutes) * 100 : 0 })).sort((a,b)=>b.value - a.value)
      };
    };

    return {
      periodA: retrievePeriodStoppages(periodA),
      periodB: retrievePeriodStoppages(periodB)
    };
  }, [ribbonEntries, periodA, periodB]);

  // Operator stability and performance trackers (Calculated across selected range: periodA to periodB)
  const operatorMetrics = useMemo(() => {
    const acc: Record<string, Record<string, {
      operator: string;
      month: string;
      producedM2: number;
      rejectedM2: number;
      wasteWeight: number;
      logsCount: number;
    }>> = {};

    const minMonth = periodA <= periodB ? periodA : periodB;
    const maxMonth = periodA >= periodB ? periodA : periodB;

    ribbonEntries.forEach(e => {
      if (!e.operator) return;
      const m = e.date.substring(0, 7);
      if (m < minMonth || m > maxMonth) return;
      if (!acc[e.operator]) {
        acc[e.operator] = {};
      }
      if (!acc[e.operator][m]) {
        acc[e.operator][m] = {
          operator: e.operator,
          month: m,
          producedM2: 0,
          rejectedM2: 0,
          wasteWeight: 0,
          logsCount: 0
        };
      }

      acc[e.operator][m].producedM2 += (e.producedM2 || 0);
      acc[e.operator][m].rejectedM2 += (e.rejectedM2 || 0);
      acc[e.operator][m].wasteWeight += (e.wasteWeight || 0);
      acc[e.operator][m].logsCount += 1;
    });

    const list: any[] = [];
    Object.keys(acc).forEach(op => {
      const monthRecords = acc[op];
      const sortedMonths = Object.keys(monthRecords).sort();

      let totalProd = 0;
      let totalRejected = 0;
      let totalWaste = 0;
      const history: any[] = [];

      sortedMonths.forEach(m => {
        const item = monthRecords[m];
        totalProd += item.producedM2;
        totalRejected += item.rejectedM2;
        totalWaste += item.wasteWeight;
        const lossIdx = item.producedM2 === 0 ? 0 : (item.rejectedM2 / item.producedM2) * 100;

        history.push({
          month: m,
          producedM2: item.producedM2,
          rejectedM2: item.rejectedM2,
          wasteWeight: item.wasteWeight,
          lossIdx
        });
      });

      // Standard Deviation volatility
      let sumDiffSq = 0;
      let count = 0;
      const averageLoss = totalProd === 0 ? 0 : (totalRejected / totalProd) * 100;

      history.forEach(h => {
        sumDiffSq += (h.lossIdx - averageLoss) * (h.lossIdx - averageLoss);
        count++;
      });
      const volatility = count > 0 ? Math.sqrt(sumDiffSq / count) : 0;

      list.push({
        operator: op,
        history,
        totalProd,
        totalRejected,
        totalWaste,
        averageWasteIdx: averageLoss,
        volatility,
        monthsActive: sortedMonths.length
      });
    });

    return list.sort((a,b) => b.totalProd - a.totalProd);
  }, [ribbonEntries, periodA, periodB]);

  const filteredOperators = useMemo(() => {
    if (!operatorSearch.trim()) return operatorMetrics;
    const term = operatorSearch.toLowerCase();
    return operatorMetrics.filter(o => (o.operator || '').toLowerCase().includes(term));
  }, [operatorMetrics, operatorSearch]);

  const { minWaste, maxWaste, wasteRange } = useMemo(() => {
    const wasteIndexes = operatorMetrics.map(o => o.averageWasteIdx);
    const minW = wasteIndexes.length > 0 ? Math.min(...wasteIndexes) : 0;
    const maxW = wasteIndexes.length > 0 ? Math.max(...wasteIndexes) : 0;
    return {
      minWaste: minW,
      maxWaste: maxW,
      wasteRange: maxW - minW
    };
  }, [operatorMetrics]);

  return (
    <div id="ribbon-bi-analytics" className="space-y-6">
      {/* Top Selector Welcome Header */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-[2rem] shadow-xl relative overflow-hidden flex flex-col justify-between border border-slate-800">
        <div className="absolute right-0 top-0 -mr-12 -mt-12 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl" />
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse inline-block" />
              <span className="text-[10px] uppercase font-black text-slate-300 tracking-widest block bg-slate-800 px-3 py-1 rounded-full border border-slate-700">Painel de Parâmetros de Comparação</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mb-2">BI Comparativos & Performance • Fita</h1>
            <p className="text-slate-400 text-xs font-semibold max-w-2xl leading-relaxed uppercase">
              Acompanhamento inteligente de m², controle absoluto do lixo gerado em Kg/T e análise detalhada do tempo improdutivo de corte por operador.
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-3 rounded-2xl border border-slate-700/60 max-w-sm shrink-0">
            <Scale className="text-blue-400 shrink-0" size={20} />
            <div className="leading-tight">
              <span className="text-[9px] uppercase font-black text-slate-400 block tracking-widest">Base de BI</span>
              <span className="text-xs font-black text-white">{monthsList.length} meses apurados</span>
            </div>
          </div>
        </div>
      </div>

      {/* Slicers / Interactive Selectors Panel */}
      <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm flex flex-col gap-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Sliders size={16} className="text-blue-600" />
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Painel de Parâmetros de Comparação</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1.5">Mês de Referência Inicial (Período A)</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <select 
                value={periodA} 
                onChange={e => setPeriodA(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-black uppercase text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none border-b-2"
              >
                {monthsList.map(m => (
                  <option key={m} value={m}>{translateMonthYear(m)} ({m})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wide text-slate-400 mb-1.5">Mês de Comparação Alvo (Período B)</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <select 
                value={periodB} 
                onChange={e => setPeriodB(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-black uppercase text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none border-b-2"
              >
                {monthsList.map(m => (
                  <option key={m} value={m}>{translateMonthYear(m)} ({m})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>
          </div>
        </div>

        {periodA === periodB && (
          <div className="bg-amber-50 text-amber-800 text-[10.5px] font-bold uppercase tracking-wider p-3 rounded-2xl border border-amber-100 flex items-center gap-2">
            <Info size={14} className="text-amber-500 shrink-0" />
            Dica: Selecione meses diferentes para calcular os índices acumulados MoM e deltas de volume.
          </div>
        )}
      </div>

      {/* KPI Cards section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: M2 Produzido */}
        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1">
                Volume Produzido M²
                <span className="group relative inline-block cursor-help align-middle">
                  <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                  <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                    Área útil total produzida pelas cortadeiras de fita, livre de perdas e rejeitos físicos.
                  </span>
                </span>
              </span>
              <h4 className="text-[10px] font-black text-blue-600 block mt-0.5">PERÍODO A vs PERÍODO B</h4>
            </div>
            <div className="bg-blue-50 text-blue-600 p-2 rounded-xl border border-blue-100">
              <Activity size={16} />
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>{periodA.split('-').reverse().join('/')}:</span>
              <span className="font-extrabold">{formatM2(comparisonResults.producedM2A)}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-slate-800 border-b border-slate-100 pb-1.5">
              <span>{periodB.split('-').reverse().join('/')}:</span>
              <span className="font-black">{formatM2(comparisonResults.producedM2B)}</span>
            </div>
            <div className="flex justify-between items-center pt-1 text-[11px] font-black">
              <span>Var. Absoluta:</span>
              <span className={comparisonResults.producedAbs >= 0 ? "text-emerald-600" : "text-rose-600"}>
                {comparisonResults.producedAbs >= 0 ? '+' : ''}{formatM2(comparisonResults.producedAbs)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-black">
              <span>Var. Percentual (MoM):</span>
              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] ${comparisonResults.producedChange >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {comparisonResults.producedChange >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                {comparisonResults.producedChange >= 0 ? '+' : ''}{comparisonResults.producedChange.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Quality/Rejected m2 percent */}
        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1">
                Índice de Não Conforme M²
                <span className="group relative inline-block cursor-help align-middle">
                  <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                  <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                    Percentual de não conforme total em m² em relação à metragem útil produzida. Menores índices representam maior eficiência.
                  </span>
                </span>
              </span>
              <h4 className="text-[10px] font-black text-amber-600 block mt-0.5">MENOR É MELHOR</h4>
            </div>
            <div className={`p-2 rounded-xl border ${comparisonResults.lossPercentChange <= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
              <AlertCircle size={16} />
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>{periodA.split('-').reverse().join('/')}:</span>
              <span className="font-extrabold">{formatPercent(comparisonResults.lossPercentA)}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-slate-800 border-b border-slate-100 pb-1.5">
              <span>{periodB.split('-').reverse().join('/')}:</span>
              <span className="font-black">{formatPercent(comparisonResults.lossPercentB)}</span>
            </div>
            <div className="flex justify-between items-center pt-1 text-[11px] font-black">
              <span>Aproveitamento B:</span>
              <span className="text-emerald-700 font-extrabold">{formatPercent(comparisonResults.yieldB)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-black">
              <span>Variação Delta P.P.:</span>
              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] ${comparisonResults.lossPercentChange <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {comparisonResults.lossPercentChange <= 0 ? <ArrowDownRight size={12}/> : <ArrowUpRight size={12}/>}
                {comparisonResults.lossPercentChange <= 0 ? '' : '+'}{comparisonResults.lossPercentChange.toFixed(2)} p.p.
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Lixo em peso (Kg / T) e Area (m2) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1">
                Lixo (Kg/T e m²)
                <span className="group relative inline-block cursor-help align-middle">
                  <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                  <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                    Peso acumulado de descarte físico e lixo industrial das fitas no período selecionado e equivalente convertido em metros quadrados de área de perdas.
                  </span>
                </span>
              </span>
              <h4 className="text-[10px] font-black text-red-600 block mt-0.5">CONTROLE DE PESO & ÁREA</h4>
            </div>
            <div className={`p-2 rounded-xl border ${comparisonResults.wasteChange <= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
              <Scale size={16} />
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>{periodA.split('-').reverse().join('/')}:</span>
              <span className="font-extrabold text-right">
                {formatWeight(comparisonResults.wasteA)}
                <span className="block text-[9px] font-medium text-slate-400">({formatM2(comparisonResults.wasteM2A)})</span>
              </span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-slate-800 border-b border-slate-100 pb-1.5">
              <span>{periodB.split('-').reverse().join('/')}:</span>
              <span className="font-black text-right">
                {formatWeight(comparisonResults.wasteB)}
                <span className="block text-[9px] font-medium text-slate-400">({formatM2(comparisonResults.wasteM2B)})</span>
              </span>
            </div>
            <div className="flex justify-between items-center pt-1 text-[11px] font-black">
              <span>Diferença Peso:</span>
              <span className={comparisonResults.wasteAbs <= 0 ? "text-emerald-600" : "text-rose-600"}>
                {comparisonResults.wasteAbs >= 0 ? '+' : ''}{formatWeight(comparisonResults.wasteAbs)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-black">
              <span>Var. Lixo Gerado:</span>
              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] ${comparisonResults.wasteChange <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {comparisonResults.wasteChange <= 0 ? <ArrowDownRight size={12}/> : <ArrowUpRight size={12}/>}
                {comparisonResults.wasteChange >= 0 ? '+' : ''}{comparisonResults.wasteChange.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Downtime paradas */}
        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1">
                Indisponibilidade Máquina
                <span className="group relative inline-block cursor-help align-middle">
                  <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                  <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                    Preenchimento do tempo acumulado de paradas registradas para manutenção, processo ou outros fatores operacionais.
                  </span>
                </span>
              </span>
              <h4 className="text-[10px] font-black text-rose-600 block mt-0.5">TEMPO DE STOP</h4>
            </div>
            <div className={`p-2 rounded-xl border ${comparisonResults.stoppedAbs <= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>{periodA.split('-').reverse().join('/')}:</span>
              <span className="font-extrabold">{formatMinutes(comparisonResults.stoppedA)}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-slate-800 border-b border-slate-100 pb-1.5">
              <span>{periodB.split('-').reverse().join('/')}:</span>
              <span className="font-black">{formatMinutes(comparisonResults.stoppedB)}</span>
            </div>
            <div className="flex justify-between items-center pt-1 text-[11px] font-black">
              <span>Diferença Líquida:</span>
              <span className={comparisonResults.stoppedAbs <= 0 ? "text-emerald-600 font-extrabold" : "text-rose-600 font-extrabold"}>
                {comparisonResults.stoppedAbs >= 0 ? '+' : ''}{formatMinutes(comparisonResults.stoppedAbs)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-black">
              <span>Variação de Tempo de Parada:</span>
              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] ${comparisonResults.stoppedChange <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {comparisonResults.stoppedChange <= 0 ? <ArrowDownRight size={12}/> : <ArrowUpRight size={12}/>}
                {comparisonResults.stoppedChange >= 0 ? '+' : ''}{comparisonResults.stoppedChange.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Internal Navigation tabs - MIRRORED FROM EXTRUSÃO */}
      <div className="flex border-b border-slate-200">
        <button 
          onClick={() => setBiActiveSection('matrix')}
          className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all -mb-px flex items-center gap-1.5 ${biActiveSection === 'matrix' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <Sliders size={14} /> 1. Matriz Combinatória Flexível
        </button>
        <button 
          onClick={() => setBiActiveSection('mom_yoy')}
          className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all -mb-px flex items-center gap-1.5 ${biActiveSection === 'mom_yoy' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <TrendingUp size={14} /> 2. Inteligência de Tempo (MoM / YoY)
        </button>
        <button 
          onClick={() => setBiActiveSection('stoppages')}
          className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all -mb-px flex items-center gap-1.5 ${biActiveSection === 'stoppages' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <Clock size={14} /> 3. Perfil de Gargalos & Paradas
        </button>
        <button 
          onClick={() => setBiActiveSection('operators')}
          className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all -mb-px flex items-center gap-1.5 ${biActiveSection === 'operators' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <Users size={14} /> 4. Evolução Histórica das Equipes
        </button>
        <button 
          onClick={() => setBiActiveSection('dynamic')}
          className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all -mb-px flex items-center gap-1.5 ${biActiveSection === 'dynamic' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <Activity size={14} /> 5. Ranking & Métricas Dinâmicas
        </button>
      </div>

      {/* Renders Section Content */}
      <AnimatePresence mode="wait">
        {biActiveSection === 'matrix' && (
          <motion.div 
            key="matrix" 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }} 
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-6">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Sliders className="text-slate-500" size={16} /> Matriz de Filtros Cruzados Combinados
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">Cruzamento matricial refinado e correlacionado às seleções ativas do painel</p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 text-[9px] font-black uppercase tracking-wider shrink-0">
                    <button
                      onClick={() => setMatrixFilterMode('related')}
                      className={`px-3 py-2 rounded-xl transition-all ${matrixFilterMode === 'related' ? 'bg-white text-blue-600 shadow-sm font-black' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Relacionados (A ou B)
                    </button>
                    <button
                      onClick={() => setMatrixFilterMode('active')}
                      className={`px-3 py-2 rounded-xl transition-all ${matrixFilterMode === 'active' ? 'bg-white text-blue-600 shadow-sm font-black' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Apenas Ativos (A vs B)
                    </button>
                    <button
                      onClick={() => setMatrixFilterMode('all')}
                      className={`px-3 py-2 rounded-xl transition-all ${matrixFilterMode === 'all' ? 'bg-white text-blue-600 shadow-sm font-black' : 'text-slate-500 hover:text-slate-705'}`}
                    >
                      Todos os Períodos
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Filtrar períodos..." 
                      value={combinationSearch} 
                      onChange={e => setCombinationSearch(e.target.value)} 
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 w-full sm:w-40"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-150">
                <table className="w-full text-left border-collapse text-[11px] min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-55/50 text-slate-500 font-black uppercase tracking-wider border-b border-slate-300 divide-x divide-slate-100">
                      <th className="px-5 py-3">Combinação Comparativa</th>
                      <th className="px-4 py-3 text-right">Prod. Base (A)</th>
                      <th className="px-4 py-3 text-right">Prod. Meta (B)</th>
                      <th className="px-4 py-3 text-center">▲ Produção % (MoM)</th>
                      <th className="px-4 py-3 text-right">Não Conforme A (%)</th>
                      <th className="px-4 py-3 text-right">Não Conforme B (%)</th>
                      <th className="px-4 py-3 text-center">▲ Não Conforme pp Delta</th>
                      <th className="px-4 py-3 text-right">Lixo Peso A</th>
                      <th className="px-4 py-3 text-right">Lixo Peso B</th>
                      <th className="px-4 py-3 text-center">▲ Lixo Var %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                    {filteredCombinations.length > 0 ? (
                      filteredCombinations.map((c) => {
                        const isActiveCombination = (c.monthA === periodA && c.monthB === periodB);
                        return (
                          <tr 
                            key={c.id} 
                            className={`divide-x divide-slate-100 transition-colors ${
                              isActiveCombination 
                                ? 'bg-blue-50/70 hover:bg-blue-100/50 border-l-4 border-l-blue-600' 
                                : 'hover:bg-slate-50/60'
                            }`}
                          >
                            <td className="px-5 py-3.5 text-slate-900 font-black uppercase">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span>{c.label}</span>
                                {isActiveCombination && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-blue-600 text-white tracking-wider shadow-sm border border-blue-500 leading-none">
                                    Filtro Ativo
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right font-medium">{formatM2(c.prodA)}</td>
                            <td className="px-4 py-3.5 text-right font-black">{formatM2(c.prodB)}</td>
                            <td className="px-4 py-3.5 text-center">
                              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg font-black text-[10px] ${c.prodVarPct >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {c.prodVarPct >= 0 ? '+' : ''}{c.prodVarPct.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right text-slate-500 font-mono">{formatPercent(c.lossA)}</td>
                            <td className="px-4 py-3.5 text-right font-black font-mono">{formatPercent(c.lossB)}</td>
                            <td className="px-4 py-3.5 text-center font-mono">
                              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[9px] font-black ${c.lossVar <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {c.lossVar <= 0 ? '' : '+'}{c.lossVar.toFixed(2)} pp
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono text-slate-550">{formatWeight(c.wasteA)}</td>
                            <td className="px-4 py-3.5 text-right font-mono font-black">{formatWeight(c.wasteB)}</td>
                            <td className="px-4 py-3.5 text-center">
                              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[9px] font-black ${c.wasteVarPct <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {c.wasteVarPct >= 0 ? '+' : ''}{c.wasteVarPct.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={10} className="px-5 py-8 text-center text-slate-300 font-bold uppercase tracking-wider">
                          Nenhuma combinação comparativa encontrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {biActiveSection === 'mom_yoy' && (
          <motion.div 
            key="mom_yoy" 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }} 
            className="space-y-6"
          >
            {/* Timeline trend graphs */}
            <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                    <TrendingUp size={16} className="text-blue-600" /> Tendência Evolutiva de Filtro de Tempo (MoM / YoY)
                    <span className="group relative inline-block cursor-help align-middle">
                      <Info size={14} className="text-slate-400 hover:text-blue-600 transition-colors" />
                      <span className="pointer-events-none absolute left-0 top-full mt-2 w-80 bg-slate-900 border border-slate-800 text-white text-[10px] font-medium p-3 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-left normal-case tracking-normal leading-relaxed">
                        <strong className="block text-blue-400 font-black uppercase text-[9px] mb-1.5 tracking-wider">Histórico de Performance Temporal</strong>
                        Este gráfico compara o volume físico total de produção mensal (barras azuis em m², eixo à esquerda) com os indicadores de refugo e perdas em metros quadrados (linhas em %, eixo à direita):
                        <span className="block mt-1.5 font-bold text-rose-300">• Índice de Não Conforme (%):</span> Proporção entre a metragem de perda física não conforme no processo versus a metragem produzida liguida. Recomenda-se manter o mais baixo possível.
                        <span className="block mt-1 font-bold text-emerald-300">• Aproveitamento (%):</span> Proporção líquida aproveitável após descontos físicos de qualidade.
                      </span>
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">Evolução física da produção ao longo do tempo correlacionada aos índices de aproveitamento de matéria-prima.</p>
                </div>
              </div>

              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartTimelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" stroke="#64748b" style={{ fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis yAxisId="left" stroke="#3b82f6" style={{ fontSize: 10, fontWeight: 'bold' }} label={{ value: 'Produção Líquida m²', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fontWeight: 'bold' } }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#f43f5e" style={{ fontSize: 10, fontWeight: 'bold' }} label={{ value: 'Índice de Não Conforme (%)', angle: 90, position: 'insideRight', offset: 10, style: { fontSize: 10, fontWeight: 'bold' } }} />
                    <RechartsTooltip 
                      formatter={(value: any, name: string) => {
                        if (name.includes('Produção') || name.includes('m²')) {
                          return [formatM2(Number(value)), name];
                        }
                        if (name.includes('%')) {
                          return [`${Number(value).toFixed(2).replace('.', ',')}%`, name];
                        }
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="producao" name="Produção Líquida (m²)" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={50} />
                    <Line yAxisId="right" type="monotone" dataKey="perdaPerc" name="Não Conforme (%)" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                    <Line yAxisId="right" type="monotone" dataKey="yieldPercent" name="Aproveitamento (%)" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="5 5" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Micro Details Table of Time Intelligence Month Over Month */}
            <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 font-black">Métricas Consolidadas de Crescimento MoM e YoY</h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-150">
                <table className="w-full text-left text-[11px] border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-500 font-black uppercase tracking-wider border-b border-slate-200">
                      <th className="px-5 py-3">Mês Fiscal</th>
                      <th className="px-4 py-3 text-right">Produção Líquida</th>
                      <th className="px-4 py-3 text-right">Crescimento MoM Produção</th>
                      <th className="px-4 py-3 text-right">Tempo Paradas</th>
                      <th className="px-4 py-3 text-right">Var. MoM Paradas</th>
                      <th className="px-4 py-3 text-right">Índice Não Conforme (%)</th>
                      <th className="px-4 py-3 text-right">Comp. YoY Produção</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-705">
                    {chartTimelineData.map((data, idx) => {
                      let prodMom = '-';
                      let stopsMom = '-';
                      if (idx > 0) {
                        const prev = chartTimelineData[idx - 1];
                        const pVar = prev.producao === 0 ? 0 : ((data.producao - prev.producao) / prev.producao) * 100;
                        const sVar = prev.paradasTotal === 0 ? 0 : ((data.paradasTotal - prev.paradasTotal)/ prev.paradasTotal) * 100;
                        prodMom = `${pVar >= 0 ? '+' : ''}${pVar.toFixed(1)}%`;
                        stopsMom = `${sVar >= 0 ? '+' : ''}${sVar.toFixed(1)}%`;
                      }

                      const [yr, mth] = data.month.split('-');
                      const prevYearStr = `${parseInt(yr, 10) - 1}-${mth}`;
                      const lastYearMatch = chartTimelineData.find(x => x.month === prevYearStr);
                      let yoyStr = 'Sem Histórico';
                      if (lastYearMatch) {
                        const yVar = lastYearMatch.producao === 0 ? 0 : ((data.producao - lastYearMatch.producao) / lastYearMatch.producao) * 100;
                        yoyStr = `${yVar >= 0 ? '+' : ''}${yVar.toFixed(1)}% YoY`;
                      }

                      return (
                        <tr key={data.month} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5 text-slate-900 font-black uppercase">{data.fullLabel}</td>
                          <td className="px-4 py-3.5 text-right font-medium">{formatM2(data.producao)}</td>
                          <td className="px-4 py-3.5 text-right">
                            {prodMom !== '-' ? (
                              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] ${prodMom.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {prodMom}
                              </span>
                            ) : (
                              <span className="text-slate-350 font-medium">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium">{formatMinutes(data.paradasTotal)}</td>
                          <td className="px-4 py-3.5 text-right">
                            {stopsMom !== '-' ? (
                              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] ${stopsMom.startsWith('-') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {stopsMom}
                              </span>
                            ) : (
                              <span className="text-slate-355 font-medium">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right font-black text-rose-600">{data.perdaPerc}%</td>
                          <td className="px-4 py-3.5 text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${yoyStr === 'Sem Histórico' ? 'bg-slate-100 text-slate-400' : yoyStr.startsWith('+') ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                              {yoyStr}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {biActiveSection === 'stoppages' && (
          <motion.div 
            key="stoppages" 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }} 
            className="space-y-6"
          >
            {/* Stoppages profiles, side-by-side villains and chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stacked operational bar chart */}
              <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock size={16} className="text-rose-500" /> Histórico Operacional de Indisponibilidade (min)
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">Evolução dos tipos de indisponibilidade por período</p>
                </div>
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartTimelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" stroke="#64748b" style={{ fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis stroke="#64748b" style={{ fontSize: 10, fontWeight: 'bold' }} unit=" min" />
                      <RechartsTooltip />
                      <Legend />
                      <Bar dataKey="manutencao" name="Manutenção (Min)" fill="#f97316" stackId="stoppage" />
                      <Bar dataKey="processo" name="Processo (Min)" fill="#3b82f6" stackId="stoppage" />
                      <Bar dataKey="outros" name="Outros (Min)" fill="#64748b" stackId="stoppage" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Side-by-side villain downtime analysis */}
              <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3 mb-4">
                    <AlertCircle className="text-orange-500" size={18} />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                      Análise de Gargalos Periódicos (A vs B)
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="bg-orange-50/40 p-3.5 rounded-2xl border border-orange-100/50">
                      <span className="text-[9px] uppercase font-black text-slate-400 block tracking-widest">PERÍODO A ({periodA.split('-').reverse().join('/')})</span>
                      <p className="text-lg font-black text-slate-800 mt-1">{formatMinutes(comparisonResults.stoppedA)}</p>
                      <div className="text-[10px] text-slate-500 font-semibold mt-1">
                        <div>Manut: <span className="font-extrabold text-slate-700">{formatMinutes(comparisonResults.maintMinutesA)}</span></div>
                        <div>Proc: <span className="font-extrabold text-slate-700">{formatMinutes(comparisonResults.procMinutesA)}</span></div>
                        <div>Outros: <span className="font-extrabold text-slate-700">{formatMinutes(comparisonResults.otherMinutesA)}</span></div>
                      </div>
                    </div>

                    <div className="bg-blue-50/40 p-3.5 rounded-2xl border border-blue-100/50">
                      <span className="text-[9px] uppercase font-black text-slate-400 block tracking-widest">PERÍODO B ({periodB.split('-').reverse().join('/')})</span>
                      <p className="text-lg font-black text-slate-800 mt-1">{formatMinutes(comparisonResults.stoppedB)}</p>
                      <div className="text-[10px] text-slate-500 font-semibold mt-1">
                        <div>Manut: <span className="font-extrabold text-slate-700">{formatMinutes(comparisonResults.maintMinutesB)}</span></div>
                        <div>Proc: <span className="font-extrabold text-slate-700">{formatMinutes(comparisonResults.procMinutesB)}</span></div>
                        <div>Outros: <span className="font-extrabold text-slate-700">{formatMinutes(comparisonResults.otherMinutesB)}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Factual comparison summaries */}
                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Variações Consolidadas no Período</h4>
                    <ul className="text-xs space-y-2 text-slate-600 font-semibold">
                      <li className="flex items-start gap-2">
                        <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-extrabold text-slate-800 block">Tempo de Manutenção:</span>
                          {comparisonResults.maintChange < 0 ? (
                            <span className="text-emerald-600 font-bold">Redução de {formatMinutes(Math.abs(comparisonResults.maintChange))} no tempo total de paradas por manutenção.</span>
                          ) : comparisonResults.maintChange > 0 ? (
                            <span className="text-rose-600 font-bold">Aumento de {formatMinutes(comparisonResults.maintChange)} nas ocorrências de manutenção.</span>
                          ) : (
                            <span className="text-slate-500">Manteve-se idêntico em ambos os períodos de corte.</span>
                          )}
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-extrabold text-slate-800 block">Tempo de Processo:</span>
                          {comparisonResults.procChange < 0 ? (
                            <span className="text-emerald-600 font-bold">Redução de {formatMinutes(Math.abs(comparisonResults.procChange))} no tempo de ajustes e adequações.</span>
                          ) : comparisonResults.procChange > 0 ? (
                            <span className="text-rose-600 font-bold">Aumento de {formatMinutes(comparisonResults.procChange)} nos tempos de adequações de corte.</span>
                          ) : (
                            <span className="text-slate-500">Manteve-se estável.</span>
                          )}
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase leading-snug">
                  <Info size={12} className="text-blue-500 shrink-0" />
                  Comparativo de registros reais de paradas por manutenção e processo.
                </div>
              </div>
            </div>

            {/* List of Reasons Ranking */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-black uppercase text-indigo-950">Relação Completa de Motivos e Justificativas</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Mês de Referência Ativo selecionado: {translateMonthYear(periodB)}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stoppagesDetails.periodB.reasons.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl hover:border-slate-200 transition-all">
                    <div className="space-y-1">
                      <span className="text-[11px] font-black text-slate-800 uppercase block tracking-tight">{r.reason}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{r.percent.toFixed(1)}% do total parado do mês</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black text-slate-900 font-mono block">{formatMinutes(r.value)}</span>
                    </div>
                  </div>
                ))}
                {stoppagesDetails.periodB.reasons.length === 0 && (
                  <div className="col-span-2 py-8 text-center text-slate-400 font-medium">Sem motivos de paradas gravadas para o período de referência B.</div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {biActiveSection === 'operators' && (
          <motion.div 
            key="operators" 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }} 
            className="space-y-6"
          >
            {/* Operator stability and performance trackers */}
            <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Users className="text-blue-600" size={16} /> Evolução Histórica de Desempenho e Consistência de Operadores
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {/* Meta Mensal Única de R$ 250 com bolinha explicativa da regra */}
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-1.5 shadow-2xs">
                    <Award className="text-amber-500 shrink-0" size={16} />
                    <div className="flex flex-col min-w-[125px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider leading-none">Meta Mensal</span>
                        {/* Bolinha explicativa interativa ao passar o mouse */}
                        <div className="group relative inline-flex items-center cursor-help">
                          <span className="w-3.5 h-3.5 rounded-full bg-slate-200 hover:bg-blue-600 text-slate-600 hover:text-white flex items-center justify-center text-[9px] font-black transition-colors" title="Como funciona o cálculo da meta e bônus">
                            ?
                          </span>
                          <div className="pointer-events-none absolute right-0 top-full mt-2 w-80 sm:w-96 p-4 bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white text-[10px] font-medium rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] normal-case tracking-normal space-y-2.5 leading-relaxed">
                            <div className="flex items-center gap-2 text-amber-400 font-black uppercase text-[11px] pb-1 border-b border-slate-800">
                              <Award size={14} className="text-amber-400" />
                              <span>Cálculo da Regra de Bônus (Meta R$ {metaMensalBonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span>
                            </div>
                            <p className="text-slate-300">
                              O bônus individual é calculado com base na <strong>Meta Mensal de R$ {metaMensalBonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> por operador, aplicando a regra de <strong>tolerância de 8,0% de perda</strong> e <strong>desconto linear de R$ 5,00 por décimo (0,10%) excedente</strong>:
                            </p>
                            <div className="space-y-1.5">
                              <div className="p-2 bg-emerald-950/60 border border-emerald-500/30 rounded-xl">
                                <span className="font-bold text-emerald-400 block text-[10.5px]">Perda até 8,00% (Meta Mantida):</span>
                                <span className="text-slate-300 text-[9.5px]">Aplica <strong>0% de desconto (R$ 0,00)</strong>. O operador recebe 100% da meta: <strong>R$ {metaMensalBonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> + Cesta Básica.</span>
                              </div>
                              <div className="p-2 bg-amber-950/60 border border-amber-500/30 rounded-xl">
                                <span className="font-bold text-amber-400 block text-[10.5px]">Excedeu 8,00% (Desconto Linear por Décimo):</span>
                                <span className="text-slate-300 text-[9.5px]">A cada <strong>0,10% (1 décimo)</strong> que passar do limite, desconta exatamente <strong>R$ 5,00</strong> da bonificação (R$ 50 a cada 1,0%).</span>
                              </div>
                              <div className="p-2 bg-rose-950/60 border border-rose-500/30 rounded-xl">
                                <span className="font-bold text-rose-400 block text-[10.5px]">Perda ≥ 14,00% (Teto de Desconto):</span>
                                <span className="text-slate-300 text-[9.5px]">Atinge <strong>100% de desconto no bônus (R$ 0,00)</strong>, preservando integralmente o valor fixo da cesta básica.</span>
                              </div>
                            </div>
                            <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-800 flex justify-between font-mono">
                              <span>Fórmula:</span>
                              <span className="text-slate-200">Desconto = (Perda - 8%) ÷ 0,1% × R$ 5,00</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] font-bold text-slate-500">R$</span>
                        <input 
                          type="number" 
                          min={0}
                          value={metaMensalBonus} 
                          onChange={e => setMetaMensalBonus(Number(e.target.value) || 0)} 
                          className="bg-transparent font-black text-xs text-slate-800 outline-none w-16 p-0 border-none focus:ring-0 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <input 
                      type="text" 
                      placeholder="Pesquisar operador..." 
                      value={operatorSearch} 
                      onChange={e => setOperatorSearch(e.target.value)} 
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 w-full sm:w-52"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-150">
                <table className="w-full text-left text-[11px] border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-500 font-black uppercase tracking-wider border-b border-slate-200">
                      <th className="px-5 py-3">Operador de Produção</th>
                      <th className="px-4 py-3 text-right">Produção Acumulada (m²)</th>
                      <th className="px-4 py-3 text-right">Lixo Acumulado Peso (Kg/T)</th>
                      <th className="px-4 py-3 text-right">Média Coeficiente de Perda</th>
                      <th className="px-4 py-3 text-right text-amber-600">Desconto Linear</th>
                      <th className="px-4 py-3 text-right text-emerald-600">Bônus Estimado</th>
                      <th className="px-4 py-3 text-right">Volatilidade (▲ MoM SD)</th>
                      <th className="px-4 py-3 text-right">Atividades (Meses)</th>
                      <th className="px-5 py-3 text-right">Classificação Operacional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                    {filteredOperators.length > 0 ? (
                      filteredOperators.map((op) => {
                        let badgeColor = 'bg-slate-100 text-slate-500';
                        let label = 'Médio Produtor';

                        if (op.totalProd > 50000 && op.averageWasteIdx <= 4.0) {
                          badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                          label = 'Alta Performance e Baixo Não Conforme';
                        } else if (op.volatility > 15 && op.averageWasteIdx > 8.0) {
                          badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
                          label = 'Forte Instabilidade / Alto Não Conforme';
                        } else if (op.averageWasteIdx <= 3.5) {
                          badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
                          label = 'Corte Limpo e Consistente';
                        } else if (op.totalProd > 60000) {
                          badgeColor = 'bg-purple-100 text-purple-800 border-purple-200';
                          label = 'Alto Volume M² Cortado';
                        }

                        const opDetails = getOperatorDetails(op.operator);

                        return (
                          <tr key={op.operator} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-4 text-slate-900 font-black uppercase">
                              <div>
                                <div className="flex items-center gap-2">
                                  {op.operator}
                                  {op.totalProd > 80000 && (
                                    <Zap className="text-amber-500 fill-amber-500" size={13} title="Destaque de Produtividade" />
                                  )}
                                </div>
                                <div className="text-[9px] text-indigo-505 font-black mt-0.5 tracking-wider uppercase">
                                  {opDetails.roleName}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right font-medium">{formatM2(op.totalProd)}</td>
                            <td className="px-4 py-4 text-right">
                              <div className="font-extrabold text-slate-800">{formatWeight(op.totalWaste)}</div>
                              <div className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                                Não Conforme: {formatM2(op.totalRejected)}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right text-rose-550 font-black">{formatPercent(op.averageWasteIdx)}</td>
                            <td className="px-4 py-4 text-right">
                              {(() => {
                                const targetIdx = op.averageWasteIdx;
                                let discountPct = 0;
                                let lossAmt = 0;
                                if (targetIdx > 8.0) {
                                  const excessPoints = targetIdx - 8.0;
                                  const tenths = excessPoints / 0.1;
                                  lossAmt = Math.min(opDetails.bonusRef, tenths * 5.0);
                                  discountPct = opDetails.bonusRef > 0 ? (lossAmt / opDetails.bonusRef) * 100 : 0;
                                }
                                if (discountPct === 0) {
                                  return <span className="text-emerald-700 font-black bg-emerald-50 px-2 py-1 rounded-lg">0,0% (≤8%)</span>;
                                }
                                if (discountPct >= 100) {
                                  return <span className="text-rose-550 font-black bg-rose-50 px-2 py-1 rounded-lg">100,0% (-R$ {opDetails.bonusRef})</span>;
                                }
                                return <span className="text-amber-700 font-bold">{discountPct.toFixed(1).replace('.', ',')}% (-R$ {lossAmt.toFixed(2).replace('.', ',')})</span>;
                              })()}
                            </td>
                            <td className="px-4 py-4 text-right">
                              {(() => {
                                const targetIdx = op.averageWasteIdx;
                                let lossAmt = 0;
                                if (targetIdx > 8.0) {
                                  const excessPoints = targetIdx - 8.0;
                                  const tenths = excessPoints / 0.1;
                                  lossAmt = Math.min(opDetails.bonusRef, tenths * 5.0);
                                }
                                const bonusAmt = Math.max(0, opDetails.bonusRef - lossAmt);
                                if (lossAmt === 0) {
                                  return (
                                    <div className="flex justify-end items-center gap-1">
                                      <span className="text-emerald-700 font-black text-xs flex flex-col items-end bg-emerald-50 px-2.5 py-1 rounded-xl">
                                        <span className="flex items-center gap-0.5"><Award size={12} className="text-amber-500 fill-amber-500 inline mr-0.5" /> R$ {bonusAmt.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        <span className="text-[8px] text-emerald-500 font-bold block mt-0.5">100% da Meta (Perda ≤8%)</span>
                                      </span>
                                    </div>
                                  );
                                }
                                if (bonusAmt === 0) {
                                  return (
                                    <div className="flex flex-col items-end">
                                      <span className="text-slate-400 font-normal">R$ 0,00</span>
                                      <span className="text-[8px] text-rose-400 font-bold block mt-0.5">100% desc. (Perda ≥14%)</span>
                                    </div>
                                  );
                                }
                                return (
                                  <div className="flex flex-col items-end">
                                    <span className="text-slate-705 font-extrabold text-xs">R$ {bonusAmt.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    <span className="text-[8px] text-amber-700 font-semibold">-R$ {lossAmt.toFixed(2).replace('.', ',')}</span>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <span className={op.volatility > 12 ? "text-rose-500" : "text-emerald-600"}>
                                {op.volatility === 0 ? 'Estável' : `± ${op.volatility.toFixed(1)}%`}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right text-slate-500">{op.monthsActive} {op.monthsActive === 1 ? 'Mês' : 'Meses'}</td>
                            <td className="px-5 py-4 text-right">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${badgeColor}`}>
                                {label}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="px-5 py-8 text-center text-slate-300 font-bold uppercase tracking-wider">
                          Nenhum operador com dados cadastrados ou termo encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {biActiveSection === 'dynamic' && (
          <motion.div
            key="dynamic"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-6">
              {/* Header com os controles de agrupamento e de métrica */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Activity className="text-blue-500 animate-pulse" size={16} /> 5. Ranking & Métricas Dinâmicas da Fita
                  </h3>
                  <p className="text-[10px] font-semibold text-slate-400 mt-1">
                    Selecione o eixo de agrupamento e a métrica desejada para redesenhar o gráfico.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Seletor do Eixo */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Agrupar por (Eixo)</span>
                    <div className="flex p-1 bg-slate-50 border border-slate-150 rounded-xl">
                      {ribbonDynamicGroups.map(group => (
                        <button
                          key={group.id}
                          onClick={() => setRibbonBiDynamicGroup(group.id as any)}
                          className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${
                            ribbonBiDynamicGroup === group.id
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {group.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Seletor da Métrica */}
                  <div className="flex flex-col gap-1 min-w-[200px]">
                    <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Métrica Desejada</span>
                    <div className="relative">
                      <select
                        value={ribbonBiDynamicMetric}
                        onChange={(e) => setRibbonBiDynamicMetric(e.target.value)}
                        className="w-full pl-3 pr-8 py-2 text-[10px] font-black uppercase tracking-wider bg-slate-50 border border-slate-150 rounded-xl focus:border-blue-500 text-slate-700 outline-none appearance-none cursor-pointer"
                      >
                        {ribbonDynamicMetricsList.map(metric => (
                          <option key={metric.id} value={metric.id}>
                            {metric.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Corpo de exibição dividido: Gráfico à esquerda, Tabela de Ranking à direita */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Gráfico */}
                <div className="xl:col-span-2 space-y-3">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Visualização Gráfica</span>
                  <div className="h-[360px] bg-slate-50/50 rounded-2xl border border-slate-100 p-4">
                    {ribbonDynamicChartData.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <AlertCircle size={32} className="text-slate-300 stroke-[1.5] mb-2" />
                        <span className="text-xs font-bold uppercase tracking-wider">Aguardando dados...</span>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={ribbonDynamicChartData}
                          margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                          <XAxis
                            dataKey="name"
                            stroke="#94A3B8"
                            fontSize={9}
                            fontWeight={800}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            stroke="#94A3B8"
                            fontSize={9}
                            fontWeight={800}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(val) => {
                              const formatter = (ribbonDynamicMetricsList.find(m => m.id === ribbonBiDynamicMetric) || ribbonDynamicMetricsList[0]).formatter;
                              return formatter(val);
                            }}
                          />
                          <RechartsTooltip
                            cursor={{ fill: 'rgba(226, 232, 240, 0.4)' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                const metricDef = ribbonDynamicMetricsList.find(m => m.id === ribbonBiDynamicMetric) || ribbonDynamicMetricsList[0];
                                return (
                                  <div className="bg-white/95 backdrop-blur-md p-3 border border-slate-150 rounded-xl shadow-xl">
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-1">{data.name}</p>
                                    <p className="text-xs font-black text-slate-800">
                                      <span className="text-blue-600 mr-1">●</span>
                                      {metricDef.label}: <span className="font-extrabold text-indigo-950 font-mono">{metricDef.formatter(data.value)}</span>
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar
                            dataKey="value"
                            fill="#3B82F6"
                            radius={[8, 8, 0, 0]}
                            maxBarSize={45}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Tabela de Ranking */}
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Lista Ordenada (Min ao Máx / Ranking)</span>
                  <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[360px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                          <th className="py-2.5 px-3 text-center w-12">Pos</th>
                          <th className="py-2.5 px-3">Eixo</th>
                          <th className="py-2.5 px-3 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-600 font-mono">
                        {ribbonDynamicChartData.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-8 text-center text-slate-300 font-bold uppercase tracking-wider font-sans">
                              Nenhum registro encontrado.
                            </td>
                          </tr>
                        ) : (
                          ribbonDynamicChartData.map((item, idx) => {
                            const isTop1 = idx === 0;
                            const isTop2 = idx === 1;
                            const isTop3 = idx === 2;
                            const metricDef = ribbonDynamicMetricsList.find(m => m.id === ribbonBiDynamicMetric) || ribbonDynamicMetricsList[0];

                            let badgeBg = 'bg-slate-100 text-slate-500';
                            if (isTop1) badgeBg = 'bg-amber-50 text-amber-700 border-amber-200 border';
                            else if (isTop2) badgeBg = 'bg-slate-200 text-slate-700 border-slate-300 border';
                            else if (isTop3) badgeBg = 'bg-orange-50 text-orange-700 border-orange-200 border';

                            return (
                              <tr key={item.name} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-2 px-3 text-center">
                                  <span className={`w-5 h-5 inline-flex items-center justify-center rounded-full text-[9px] font-black ${badgeBg}`}>
                                    {idx + 1}
                                  </span>
                                </td>
                                <td className="py-2 px-3 font-sans font-extrabold text-slate-700">
                                  {item.name}
                                </td>
                                <td className="py-2 px-3 text-right font-semibold text-slate-900">
                                  {metricDef.formatter(item.value)}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
