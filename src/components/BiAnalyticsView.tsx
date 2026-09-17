import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowUpRight, ArrowDownRight, Info, Calendar, Users, AlertCircle, 
  TrendingUp, TrendingDown, Clock, Scale, Sliders, Award, Activity, 
  ChevronDown, Zap, BarChart3, Minimize2, CheckCircle, RefreshCw,
  Search, FileText
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, LineChart, Line, ComposedChart, Area, LabelList
} from 'recharts';
import { Employee } from '../types';

interface BiAnalyticsViewProps {
  productionData: any[];
  goals: Record<string, number>;
  employees?: Employee[];
  onOpenDowntimeAnalytics?: () => void;
  onOpenDowntimeReasons?: () => void;
}

// Helper formats
const formatWeight = (val: number) => {
  const absVal = Math.abs(val);
  if (absVal >= 1000) {
    return (val / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).replace(',', '.') + ' T';
  }
  return val.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' Kg';
};

const formatPercent = (val: number) => {
  return `${val.toFixed(2).replace('.', ',')}%`;
};

const formatMinutes = (val: number) => {
  if (val >= 60) {
    const hrs = Math.floor(val / 60);
    const mins = val % 60;
    return `${hrs}h ${mins}m`;
  }
  return `${val} min`;
};

// Translates "YYYY-MM" to readable Portuguese "Mes / Ano"
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

export const BiAnalyticsView: React.FC<BiAnalyticsViewProps> = ({ 
  productionData, 
  goals, 
  employees,
  onOpenDowntimeAnalytics,
  onOpenDowntimeReasons
}) => {
  // 100% Consistent Filter replicating App.tsx logic for data validity
  const processedDataFiltered = useMemo(() => {
    if (!Array.isArray(productionData)) return [];
    return productionData.filter(e => {
      if (!e || !e.date) return false;
      
      // Exclui qualquer dado ou lançamento falso de anos anteriores a 2026
      const year = parseInt(e.date.split('-')[0], 10);
      if (isNaN(year) || year < 2026) {
        return false;
      }

      // Exclui lançamentos antigos e em desuso do Cast 2 de Maio/Junho
      const isExcludedMonth = e.date.substring(5, 7) === '05' || e.date.substring(5, 7) === '06';
      const isExistingPastEntry = !e.updatedAt || e.updatedAt < '2026-06-12T17:44:00Z';
      if (isExcludedMonth && e.machine.toLowerCase().includes('cast 2') && isExistingPastEntry) {
        return false;
      }
      return true;
    });
  }, [productionData]);

  // Available list of months with valid data
  const monthsList = useMemo(() => {
    if (!Array.isArray(processedDataFiltered)) return [];
    const months = new Set<string>();
    processedDataFiltered.forEach(e => {
      if (e && e.date && e.date.length >= 7) {
        months.add(e.date.substring(0, 7));
      }
    });
    return Array.from(months).sort();
  }, [processedDataFiltered]);

  // Selected periods for side-by-side deep comparative inspection
  const [periodA, setPeriodA] = useState<string>(() => monthsList[monthsList.length - 2] || monthsList[0] || '');
  const [periodB, setPeriodB] = useState<string>(() => monthsList[monthsList.length - 1] || monthsList[0] || '');
  
  // Tab for BI subsections
  const [biActiveSection, setBiActiveSection] = useState<'matrix' | 'mom_yoy' | 'stoppages' | 'operators' | 'eco_b_vs_tubetes'>('matrix');

  // State for matrix filter mode: 'all' (Todos), 'related' (Qualquer relação com A/B), 'active' (Apenas A vs B)
  const [matrixFilterMode, setMatrixFilterMode] = useState<'all' | 'related' | 'active'>('related');

  // Search filter for combinatorial list
  const [combinationsSearch, setCombinationsSearch] = useState('');
  
  // Operator performance search
  const [operatorSearch, setOperatorSearch] = useState('');

  // Eco B vs Tubetes Search & Filters
  const [ecoBOperatorSearch, setEcoBOperatorSearch] = useState('');
  const [ecoBMachineFilter, setEcoBMachineFilter] = useState('all');
  const [ecoBShiftFilter, setEcoBShiftFilter] = useState('all');
  const [ecoBSortField, setEcoBSortField] = useState<'operator' | 'totalEcoB' | 'totalTubetesEcoB' | 'averageRatio'>('totalEcoB');
  const [ecoBSortAsc, setEcoBSortAsc] = useState(false);

  // Metricas de comparacao entre Eco B e Tubetes Eco B
  const ecoBTubetesMetrics = useMemo(() => {
    let totalEcoB = 0;
    let totalTubetesEcoB = 0;
    
    const operatorDict: Record<string, {
      operator: string;
      totalEcoB: number;
      totalTubetesEcoB: number;
      entriesCount: number;
      byDate: Record<string, {
        date: string;
        ecoB: number;
        tubetesEcoB: number;
        machine: string;
        shift: string;
      }>;
    }> = {};

    const machineDict: Record<string, {
      machine: string;
      totalEcoB: number;
      totalTubetesEcoB: number;
    }> = {};

    const shiftDict: Record<string, {
      shift: string;
      totalEcoB: number;
      totalTubetesEcoB: number;
    }> = {};

    const dailyGridList: Array<{
      id: string;
      date: string;
      operator: string;
      machine: string;
      shift: string;
      ecoB: number;
      tubetesEcoB: number;
    }> = [];

    processedDataFiltered.forEach(e => {
      const ecoBVal = (e.ecoBP || 0) + (e.ecoBM || 0);
      const tubetesVal = e.tubetesEcoB || (e.materials ? e.materials.reduce((acc: number, m: any) => acc + (m.tubetesEcoB || 0), 0) : 0);

      totalEcoB += ecoBVal;
      totalTubetesEcoB += tubetesVal;

      const op = e.operator || 'Sem Operador';
      if (!operatorDict[op]) {
        operatorDict[op] = {
          operator: op,
          totalEcoB: 0,
          totalTubetesEcoB: 0,
          entriesCount: 0,
          byDate: {}
        };
      }
      operatorDict[op].totalEcoB += ecoBVal;
      operatorDict[op].totalTubetesEcoB += tubetesVal;
      operatorDict[op].entriesCount += 1;

      const dayStr = e.date;
      if (!operatorDict[op].byDate[dayStr]) {
        operatorDict[op].byDate[dayStr] = {
          date: dayStr,
          ecoB: 0,
          tubetesEcoB: 0,
          machine: e.machine || 'N/A',
          shift: e.shift || 'N/A'
        };
      }
      operatorDict[op].byDate[dayStr].ecoB += ecoBVal;
      operatorDict[op].byDate[dayStr].tubetesEcoB += tubetesVal;

      const mach = e.machine || 'Sem Máquina';
      if (!machineDict[mach]) {
        machineDict[mach] = { machine: mach, totalEcoB: 0, totalTubetesEcoB: 0 };
      }
      machineDict[mach].totalEcoB += ecoBVal;
      machineDict[mach].totalTubetesEcoB += tubetesVal;

      const sh = e.shift || 'Sem Turno';
      if (!shiftDict[sh]) {
        shiftDict[sh] = { shift: sh, totalEcoB: 0, totalTubetesEcoB: 0 };
      }
      shiftDict[sh].totalEcoB += ecoBVal;
      shiftDict[sh].totalTubetesEcoB += tubetesVal;

      dailyGridList.push({
        id: e.id,
        date: e.date,
        operator: op,
        machine: e.machine || 'N/A',
        shift: e.shift || 'N/A',
        ecoB: ecoBVal,
        tubetesEcoB: tubetesVal
      });
    });

    const operatorsList = Object.values(operatorDict).map(op => {
      const datesKeys = Object.keys(op.byDate);
      return {
        ...op,
        shiftsCount: datesKeys.length,
        averageRatio: op.totalTubetesEcoB > 0 ? op.totalEcoB / op.totalTubetesEcoB : 0,
        averageEcoBPerDay: datesKeys.length > 0 ? op.totalEcoB / datesKeys.length : 0,
        averageTubetesPerDay: datesKeys.length > 0 ? op.totalTubetesEcoB / datesKeys.length : 0
      };
    });

    const machinesList = Object.values(machineDict)
      .filter(m => {
        const nameLower = m.machine.toLowerCase();
        return nameLower === 'cast 1' || nameLower === 'cast 2';
      })
      .map(m => ({
        ...m,
        ratio: m.totalTubetesEcoB > 0 ? m.totalEcoB / m.totalTubetesEcoB : 0
      }));

    const shiftsList = Object.values(shiftDict).map(s => ({
      ...s,
      ratio: s.totalTubetesEcoB > 0 ? s.totalEcoB / s.totalTubetesEcoB : 0
    }));

    return {
      totalEcoB,
      totalTubetesEcoB,
      overallRatio: totalTubetesEcoB > 0 ? totalEcoB / totalTubetesEcoB : 0,
      operatorsList,
      machinesList,
      shiftsList,
      dailyGridList: dailyGridList.sort((a, b) => b.date.localeCompare(a.date))
    };
  }, [processedDataFiltered]);

  // Daily Chart Data for Eco B vs Tubetes
  const dailyChartData = useMemo(() => {
    const dailyDict: Record<string, { date: string; dateBR: string; ecoB: number; tubetesEcoB: number }> = {};
    processedDataFiltered.forEach(e => {
      const d = e.date;
      const ecoBVal = (e.ecoBP || 0) + (e.ecoBM || 0);
      const tubetesVal = e.tubetesEcoB || (e.materials ? e.materials.reduce((acc: number, m: any) => acc + (m.tubetesEcoB || 0), 0) : 0);
      
      if (!dailyDict[d]) {
        const parts = d.split('-');
        const dateBR = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
        dailyDict[d] = { date: d, dateBR, ecoB: 0, tubetesEcoB: 0 };
      }
      dailyDict[d].ecoB += ecoBVal;
      dailyDict[d].tubetesEcoB += tubetesVal;
    });
    return Object.values(dailyDict).sort((a, b) => a.date.localeCompare(b.date));
  }, [processedDataFiltered]);

  // Reference values for operator monthly bonus by level (for Desconto Linear Proporcional calculation)
  const [bonusRefOp1, setBonusRefOp1] = useState<number>(1000);
  const [bonusRefOp2, setBonusRefOp2] = useState<number>(1200);
  const [bonusRefOp3, setBonusRefOp3] = useState<number>(1500);

  // Helper to extract operator level and corresponding bonus reference from employees allocations database
  const getOperatorDetails = (opName: string) => {
    const listEmps = employees || [];
    const emp = listEmps.find(e => e.name.toLowerCase().trim() === opName.toLowerCase().trim());
    if (!emp) {
      // Default to level 1 if not found in allocations database
      return { level: 1, roleName: 'Operador 1', bonusRef: bonusRefOp1 };
    }
    
    // Extract level from employee.role
    const roleStr = (emp.role || '').toLowerCase();
    let level = 1;
    let roleDisplay = emp.role || 'Operador 1';
    
    // Strong matching for level/rank or custom role
    if (roleStr.includes('3') || roleStr.includes('iii') || roleStr.includes('operador 3')) {
      level = 3;
    } else if (roleStr.includes('2') || roleStr.includes('ii') || roleStr.includes('operador 2')) {
      level = 2;
    } else if (roleStr.includes('1') || roleStr.includes('i') || roleStr.includes('operador 1')) {
      level = 1;
    } else {
      level = 1;
    }
    
    let bonusRef = bonusRefOp1;
    if (level === 2) bonusRef = bonusRefOp2;
    if (level === 3) bonusRef = bonusRefOp3;

    return { level, roleName: roleDisplay, bonusRef };
  };

  // Aggregate monthly data for analytics computations
  const monthlyMetrics = useMemo(() => {
    const acc: Record<string, {
      monthStr: string;
      netWeightCast: number;
      ecoA: number;
      ecoB: number;
      borra: number;
      wasteTotal: number;
      manutencaoMin: number;
      processoMin: number;
      outrosMin: number;
      totalStoppage: number;
    }> = {};

    processedDataFiltered.forEach(e => {
      const m = e.date.substring(0, 7);
      if (!acc[m]) {
        acc[m] = {
          monthStr: m,
          netWeightCast: 0,
          ecoA: 0,
          ecoB: 0,
          borra: 0,
          wasteTotal: 0,
          manutencaoMin: 0,
          processoMin: 0,
          outrosMin: 0,
          totalStoppage: 0
        };
      }

      const isErema = e.machine && e.machine.toLowerCase().includes('erema');
      const isCast = !isErema;

      if (isCast) {
        acc[m].netWeightCast += (e.netWeight || 0);
      }
      acc[m].ecoA += (e.ecoA || 0);
      const ecoB_entry = (e.ecoBP || 0) + (e.ecoBM || 0);
      acc[m].ecoB += ecoB_entry;
      acc[m].borra += (e.borraTotal || 0);
      acc[m].wasteTotal += (ecoB_entry + (e.borraTotal || 0));

      acc[m].manutencaoMin += (e.manutencaoMin || 0);
      acc[m].processoMin += (e.processoMin || 0);
      acc[m].outrosMin += (e.outrosMin || 0);
      acc[m].totalStoppage += ((e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0));
    });

    return acc;
  }, [processedDataFiltered]);

  // Compute stats for selected period A and period B
  const statsA = useMemo(() => {
    return monthlyMetrics[periodA] || {
      monthStr: periodA, netWeightCast: 0, ecoA: 0, ecoB: 0, borra: 0,
      wasteTotal: 0, manutencaoMin: 0, processoMin: 0, outrosMin: 0, totalStoppage: 0
    };
  }, [monthlyMetrics, periodA]);

  const statsB = useMemo(() => {
    return monthlyMetrics[periodB] || {
      monthStr: periodB, netWeightCast: 0, ecoA: 0, ecoB: 0, borra: 0,
      wasteTotal: 0, manutencaoMin: 0, processoMin: 0, outrosMin: 0, totalStoppage: 0
    };
  }, [monthlyMetrics, periodB]);

  // Computes variations delta between stats A and B
  const comparisonResults = useMemo(() => {
    const getRatio = (val: number, den: number) => den === 0 ? 0 : (val / den) * 100;
    
    const wasteIndexA = getRatio(statsA.wasteTotal, statsA.netWeightCast + statsA.wasteTotal);
    const wasteIndexB = getRatio(statsB.wasteTotal, statsB.netWeightCast + statsB.wasteTotal);

    const ecoARateA = getRatio(statsA.ecoA, statsA.netWeightCast);
    const ecoARateB = getRatio(statsB.ecoA, statsB.netWeightCast);

    // Dynamic percent variation dax-like formula
    const getPctChange = (a: number, b: number) => {
      if (a === 0) return b > 0 ? 100 : 0;
      return ((b - a) / a) * 100;
    };

    return {
      productionA: statsA.netWeightCast,
      productionB: statsB.netWeightCast,
      productionChange: getPctChange(statsA.netWeightCast, statsB.netWeightCast),
      productionAbs: statsB.netWeightCast - statsA.netWeightCast,

      wasteA: statsA.wasteTotal,
      wasteB: statsB.wasteTotal,
      wasteChange: getPctChange(statsA.wasteTotal, statsB.wasteTotal),
      wasteAbs: statsB.wasteTotal - statsA.wasteTotal,

      wasteIndexA,
      wasteIndexB,
      wasteIndexChange: wasteIndexB - wasteIndexA, // Percentage points differences

      ecoAA: statsA.ecoA,
      ecoAB: statsB.ecoA,
      ecoAChange: getPctChange(statsA.ecoA, statsB.ecoA),
      ecoAAbs: statsB.ecoA - statsA.ecoA,

      ecoARateA,
      ecoARateB,
      ecoARateChange: ecoARateB - ecoARateA,

      stoppageMinutesA: statsA.totalStoppage,
      stoppageMinutesB: statsB.totalStoppage,
      stoppageChange: getPctChange(statsA.totalStoppage, statsB.totalStoppage),
      stoppageAbs: statsB.totalStoppage - statsA.totalStoppage,

      maintMinutesA: statsA.manutencaoMin,
      maintMinutesB: statsB.manutencaoMin,
      maintChange: statsB.manutencaoMin - statsA.manutencaoMin,

      procMinutesA: statsA.processoMin,
      procMinutesB: statsB.processoMin,
      procChange: statsB.processoMin - statsA.processoMin,

      otherMinutesA: statsA.outrosMin,
      otherMinutesB: statsB.outrosMin,
      otherChange: statsB.outrosMin - statsA.outrosMin
    };
  }, [statsA, statsB]);

  // Generates Combinatorics matrix - All month permutations (Month X vs Month Y)
  const monthlyCombinations = useMemo(() => {
    const list: any[] = [];
    const keys = Object.keys(monthlyMetrics).sort();
    
    for (let i = 0; i < keys.length; i++) {
      for (let j = 0; j < keys.length; j++) {
        if (i === j) continue; // Skip identical
        const mA = keys[i];
        const mB = keys[j];
        const sA = monthlyMetrics[mA];
        const sB = monthlyMetrics[mB];

        const prodVarPct = sA.netWeightCast === 0 ? 0 : ((sB.netWeightCast - sA.netWeightCast) / sA.netWeightCast) * 100;
        const wasteIdxA = sA.netWeightCast + sA.wasteTotal === 0 ? 0 : (sA.wasteTotal / (sA.netWeightCast + sA.wasteTotal)) * 100;
        const wasteIdxB = sB.netWeightCast + sB.wasteTotal === 0 ? 0 : (sB.wasteTotal / (sB.netWeightCast + sB.wasteTotal)) * 100;
        const wasteIdxVar = wasteIdxB - wasteIdxA;

        const ecoARateA = sA.netWeightCast === 0 ? 0 : (sA.ecoA / sA.netWeightCast) * 100;
        const ecoARateB = sB.netWeightCast === 0 ? 0 : (sB.ecoA / sB.netWeightCast) * 100;
        const ecoARateVar = ecoARateB - ecoARateA;

        const stopMinutesVarPct = sA.totalStoppage === 0 ? 0 : ((sB.totalStoppage - sA.totalStoppage) / sA.totalStoppage) * 100;

        list.push({
          id: `${mA}-vs-${mB}`,
          monthA: mA,
          monthB: mB,
          label: `${translateMonthYear(mA)} vs ${translateMonthYear(mB)}`,
          prodA: sA.netWeightCast,
          prodB: sB.netWeightCast,
          prodVarPct,
          wasteIdxA,
          wasteIdxB,
          wasteIdxVar,
          ecoARateA,
          ecoARateB,
          ecoARateVar,
          stopMinutesVarPct,
          stopsA: sA.totalStoppage,
          stopsB: sB.totalStoppage
        });
      }
    }
    return list;
  }, [monthlyMetrics]);

  // Filter combinations by search bar and selected periods from Comparison Panel
  const filteredCombinations = useMemo(() => {
    let list = monthlyCombinations;
    if (matrixFilterMode === 'related') {
      list = monthlyCombinations.filter(c => 
        c.monthA === periodA || 
        c.monthA === periodB || 
        c.monthB === periodA || 
        c.monthB === periodB
      );
    } else if (matrixFilterMode === 'active') {
      list = monthlyCombinations.filter(c => 
        (c.monthA === periodA && c.monthB === periodB) ||
        (c.monthA === periodB && c.monthB === periodA)
      );
    }

    if (!combinationsSearch.trim()) return list;
    const term = combinationsSearch.toLowerCase();
    return list.filter(c => c.label.toLowerCase().includes(term));
  }, [monthlyCombinations, matrixFilterMode, periodA, periodB, combinationsSearch]);

  // Recharts Line and Area series dynamic dataset
  const chartTimelineData = useMemo(() => {
    return Object.keys(monthlyMetrics).sort().map(m => {
      const s = monthlyMetrics[m];
      const wasteIdx = s.netWeightCast + s.wasteTotal === 0 ? 0 : (s.wasteTotal / (s.netWeightCast + s.wasteTotal)) * 100;
      return {
        month: m,
        label: m.split('-').reverse().join('/'),
        fullLabel: translateMonthYear(m),
        producao: Math.round(s.netWeightCast),
        perdaPerc: parseFloat(wasteIdx.toFixed(2)),
        ecoAPerc: s.netWeightCast === 0 ? 0 : parseFloat(((s.ecoA / s.netWeightCast) * 100).toFixed(2)),
        manutencao: s.manutencaoMin,
        processo: s.processoMin,
        outros: s.outrosMin,
        paradasTotal: s.totalStoppage
      };
    });
  }, [monthlyMetrics]);

  // Operator Consistency database
  const operatorMetrics = useMemo(() => {
    const acc: Record<string, Record<string, {
      operator: string;
      month: string;
      netProd: number;
      waste: number;
      ecoA: number;
      ecoB: number;
      borra: number;
      logsCount: number;
    }>> = {};

    const minMonth = periodA <= periodB ? periodA : periodB;
    const maxMonth = periodA >= periodB ? periodA : periodB;

    processedDataFiltered.forEach(e => {
      if (!e.operator || e.machine.toLowerCase().includes('erema')) return;
      const m = e.date.substring(0, 7);
      if (m < minMonth || m > maxMonth) return;
      if (!acc[e.operator]) {
        acc[e.operator] = {};
      }
      if (!acc[e.operator][m]) {
        acc[e.operator][m] = {
          operator: e.operator,
          month: m,
          netProd: 0,
          waste: 0,
          ecoA: 0,
          ecoB: 0,
          borra: 0,
          logsCount: 0
        };
      }

      acc[e.operator][m].netProd += (e.netWeight || 0);
      const entryEcoA = e.ecoA || 0;
      const entryEcoB = (e.ecoBP || 0) + (e.ecoBM || 0);
      const entryBorra = e.borraTotal || 0;
      acc[e.operator][m].waste += (entryEcoA + entryEcoB + entryBorra);
      acc[e.operator][m].ecoA += entryEcoA;
      acc[e.operator][m].ecoB += entryEcoB;
      acc[e.operator][m].borra += entryBorra;
      acc[e.operator][m].logsCount += 1;
    });

    const list: any[] = [];
    Object.keys(acc).forEach(op => {
      const monthRecords = acc[op];
      const sortedMonths = Object.keys(monthRecords).sort();
      
      let totalProd = 0;
      let totalWaste = 0;
      let totalEcoA = 0;
      let totalEcoB = 0;
      let totalBorra = 0;
      const history: any[] = [];

      sortedMonths.forEach(m => {
        const item = monthRecords[m];
        totalProd += item.netProd;
        totalWaste += item.waste;
        totalEcoA += item.ecoA;
        totalEcoB += item.ecoB;
        totalBorra += item.borra;
        const wasteIdx = item.netProd + item.waste === 0 ? 0 : (item.waste / (item.netProd + item.waste)) * 100;
        
        history.push({
          month: m,
          netProd: item.netProd,
          waste: item.waste,
          ecoA: item.ecoA,
          ecoB: item.ecoB,
          borra: item.borra,
          wasteIdx
        });
      });

      // Calculate MoM stability / volatility (standard deviation of Waste% or Production variation)
      let sumDiffSq = 0;
      let count = 0;
      for (let i = 1; i < history.length; i++) {
        const prev = history[i - 1].netProd;
        const curr = history[i].netProd;
        const varPct = prev === 0 ? 0 : ((curr - prev) / prev) * 100;
        sumDiffSq += varSq(varPct);
        count++;
      }
      const volatility = count > 0 ? Math.sqrt(sumDiffSq / count) : 0;

      list.push({
        operator: op,
        history,
        totalProd,
        totalWaste,
        totalEcoA,
        totalEcoB,
        totalBorra,
        averageWasteIdx: totalProd + totalWaste === 0 ? 0 : (totalWaste / (totalProd + totalWaste)) * 100,
        volatility,
        monthsActive: sortedMonths.length
      });
    });

    function varSq(v: number) { return v * v; }

    return list.sort((a,b) => b.totalProd - a.totalProd);
  }, [processedDataFiltered, periodA, periodB]);

  const filteredOperators = useMemo(() => {
    if (!operatorSearch.trim()) return operatorMetrics;
    const term = operatorSearch.toLowerCase();
    return operatorMetrics.filter(o => o.operator.toLowerCase().includes(term));
  }, [operatorMetrics, operatorSearch]);

  const { minWaste, maxWaste, wasteRange } = useMemo(() => {
    // We calculate min/max among operatorMetrics so it's consistent across filtering/searching
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
    <div className="space-y-6">
      {/* Upper Welcome Header */}
      <div className="bg-[#1e293b] text-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl relative overflow-hidden flex flex-col justify-between border border-slate-700/40">
        <div className="absolute right-0 top-0 -mr-12 -mt-12 w-64 h-64 bg-blue-500/15 rounded-full blur-3xl" />
        <div className="absolute left-1/3 bottom-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-[0.2em] text-blue-400 mb-1">
              <Activity size={12} className="animate-pulse" /> Inteligência Operacional de BI
            </div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Analytics de Comparação Periódica</h2>
            <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed max-w-2xl">
              Compare e cruze diferentes períodos produtivos combinatoriamente. Avalie a eficiência física de descarte, o aproveitamento do Eco A, o perfil de indisponibilidade de paradas de forma análoga aos cálculos DAX de Time Intelligence.
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-3 rounded-2xl border border-slate-700/60 max-w-sm shrink-0">
            <Scale className="text-emerald-400 shrink-0" size={20} />
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
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-black uppercase text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
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
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-black uppercase text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
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

      {/* Side-by-Side Quick Summary cards with micro variance indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Produção Líquida Cast */}
        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1">
                Produção Líquida Cast
                <span className="group relative inline-block cursor-help align-middle">
                  <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                  <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                    Total de material acabado e embalado produzido pelas extrusoras Cast, livre de perdas e rejeitos.
                  </span>
                </span>
              </span>
              <h4 className="text-[10px] font-black text-blue-600 block mt-0.5">PERÍODO A vs PERÍODO B</h4>
            </div>
            <div className="bg-blue-50 text-blue-600 p-2 rounded-xl border border-blue-100">
              <Scale size={16} />
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>{periodA.split('-').reverse().join('/')}:</span>
              <span className="font-extrabold">{formatWeight(comparisonResults.productionA)}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-slate-800 border-b border-slate-100 pb-1.5">
              <span>{periodB.split('-').reverse().join('/')}:</span>
              <span className="font-black">{formatWeight(comparisonResults.productionB)}</span>
            </div>
            <div className="flex justify-between items-center pt-1 text-[11px] font-black">
              <span>Var. Absoluta:</span>
              <span className={comparisonResults.productionAbs >= 0 ? "text-emerald-600" : "text-rose-600"}>
                {comparisonResults.productionAbs >= 0 ? '+' : ''}{formatWeight(comparisonResults.productionAbs)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-black">
              <span>Var. Percentual (MoM):</span>
              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] ${comparisonResults.productionChange >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {comparisonResults.productionChange >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                {comparisonResults.productionChange >= 0 ? '+' : ''}{comparisonResults.productionChange.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Eficiência de Descarte (Loss Coef) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1">
                Índice Perda (Eco B+Borra)
                <span className="group relative inline-block cursor-help align-middle">
                  <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                  <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                    Percentual de perda não reaproveitada na extrusão (soma do resíduo Borra com rebarba Eco B). Menores coeficientes indicam alta eficiência industrial.
                  </span>
                </span>
              </span>
              <h4 className="text-[10px] font-black text-amber-600 block mt-0.5">MENOR É MELHOR</h4>
            </div>
            <div className={`p-2 rounded-xl border ${comparisonResults.wasteIndexChange <= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
              <AlertCircle size={16} />
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>{periodA.split('-').reverse().join('/')}:</span>
              <span className="font-extrabold">{formatPercent(comparisonResults.wasteIndexA)}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-slate-800 border-b border-slate-100 pb-1.5">
              <span>{periodB.split('-').reverse().join('/')}:</span>
              <span className="font-black">{formatPercent(comparisonResults.wasteIndexB)}</span>
            </div>
            <div className="flex justify-between items-center pt-1 text-[11px] font-black">
              <span>Desperdício Acumulado B:</span>
              <span className="text-slate-800 font-extrabold">{formatWeight(comparisonResults.wasteB)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-black">
              <span>Variação Delta P.P.:</span>
              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] ${comparisonResults.wasteIndexChange <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {comparisonResults.wasteIndexChange <= 0 ? <ArrowDownRight size={12}/> : <ArrowUpRight size={12}/>}
                {comparisonResults.wasteIndexChange <= 0 ? '' : '+'}{comparisonResults.wasteIndexChange.toFixed(2)} p.p.
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Geração/Envio de Eco A */}
        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1">
                Geração Eco A %
                <span className="group relative inline-block cursor-help align-middle">
                  <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                  <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                    Percentual de bobinas Eco A com variação enviadas para a Sede em Curitiba para rebobinamento e venda.
                  </span>
                </span>
              </span>
              <h4 className="text-[10px] font-black text-blue-600 block mt-0.5">ENVIO DE NOBRES (CURITIBA)</h4>
            </div>
            <div className="bg-amber-50 text-amber-600 p-2 rounded-xl border border-amber-100">
              <Award size={16} />
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>{periodA.split('-').reverse().join('/')}:</span>
              <span className="font-extrabold">{formatPercent(comparisonResults.ecoARateA)}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-slate-800 border-b border-slate-100 pb-1.5">
              <span>{periodB.split('-').reverse().join('/')}:</span>
              <span className="font-black">{formatPercent(comparisonResults.ecoARateB)}</span>
            </div>
            <div className="flex justify-between items-center pt-1 text-[11px] font-black">
              <span>Peso Eco A Período B:</span>
              <span className="text-slate-800 font-extrabold">{formatWeight(comparisonResults.ecoAB)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-black">
              <span>Var. Geração Eco A Delta:</span>
              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] ${comparisonResults.ecoARateChange >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {comparisonResults.ecoARateChange >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                {comparisonResults.ecoARateChange >= 0 ? '+' : ''}{comparisonResults.ecoARateChange.toFixed(2)} p.p.
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Horas ociosas / Paradas */}
        <div className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1">
                Tempo Total de Paradas
                <span className="group relative inline-block cursor-help align-middle">
                  <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                  <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                    Soma de todos os minutos em que o maquinário esteve inativo por manutenção, setup ou problemas operacionais no período selecionado.
                  </span>
                </span>
              </span>
              <h4 className="text-[10px] font-black text-rose-600 block mt-0.5">INDISPONIBILIDADE TOTAL</h4>
            </div>
            <div className={`p-2 rounded-xl border ${comparisonResults.stoppageAbs <= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-slate-600">
              <span>{periodA.split('-').reverse().join('/')}:</span>
              <span className="font-extrabold">{formatMinutes(comparisonResults.stoppageMinutesA)}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold text-slate-800 border-b border-slate-100 pb-1.5">
              <span>{periodB.split('-').reverse().join('/')}:</span>
              <span className="font-black">{formatMinutes(comparisonResults.stoppageMinutesB)}</span>
            </div>
            <div className="flex justify-between items-center pt-1 text-[11px] font-black">
              <span>Diferença Líquida:</span>
              <span className={comparisonResults.stoppageAbs <= 0 ? "text-emerald-600 font-extrabold" : "text-rose-600 font-extrabold"}>
                {comparisonResults.stoppageAbs >= 0 ? '+' : ''}{formatMinutes(comparisonResults.stoppageAbs)}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] font-black">
              <span>Var. Tempo de Parada:</span>
              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[10px] ${comparisonResults.stoppageChange <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {comparisonResults.stoppageChange <= 0 ? <ArrowDownRight size={12}/> : <ArrowUpRight size={12}/>}
                {comparisonResults.stoppageChange >= 0 ? '+' : ''}{comparisonResults.stoppageChange.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Internal Navigation tabs for comparison features */}
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
          onClick={() => setBiActiveSection('eco_b_vs_tubetes')}
          className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all -mb-px flex items-center gap-1.5 ${biActiveSection === 'eco_b_vs_tubetes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <Scale size={14} /> 5. Eco B vs Tubetes Eco B
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
                      className={`px-3 py-2 rounded-xl transition-all ${matrixFilterMode === 'all' ? 'bg-white text-blue-600 shadow-sm font-black' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Todos os Períodos
                    </button>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Filtrar períodos..." 
                      value={combinationsSearch} 
                      onChange={e => setCombinationsSearch(e.target.value)} 
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 w-full sm:w-40"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-150">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-500 font-black uppercase tracking-wider border-b border-slate-200 divide-x divide-slate-100">
                      <th className="px-5 py-3 select-none">
                        <div className="flex items-center gap-1">
                          Combinação Comparativa
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full left-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Diferença entre o mês e máquina/operador selecionados.
                            </span>
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right select-none">
                        <div className="flex items-center justify-end gap-1">
                          Prod. Base (A)
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Produção líquida total obtida durante o Período Inicial (A).
                            </span>
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right select-none">
                        <div className="flex items-center justify-end gap-1">
                          Prod. Meta (B)
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Produção líquida total obtida no Período Final Comparado (B).
                            </span>
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right select-none">
                        <div className="flex items-center justify-end gap-1">
                          ▲ Produção % (MoM)
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Crescimento ou queda percentual de produção líquida entre Período A e B.
                            </span>
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right select-none">
                        <div className="flex items-center justify-end gap-1">
                          Índice Perda A
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Percentual de perdas acumuladas (Eco B + Borra) no Período A.
                            </span>
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right select-none">
                        <div className="flex items-center justify-end gap-1">
                          Índice Perda B
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Percentual de perdas acumuladas (Eco B + Borra) no Período B.
                            </span>
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right select-none">
                        <div className="flex items-center justify-end gap-1">
                          ▲ Perda Delta (P.P.)
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Diferença absoluta em pontos percentuais entre os índices de perda. Negativo indica melhora operacional.
                            </span>
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right select-none">
                        <div className="flex items-center justify-end gap-1">
                          Envio Eco A (A) %
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Percentual de bobinas Eco A com variação enviadas para a Sede (Curitiba) no Período A.
                            </span>
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right select-none">
                        <div className="flex items-center justify-end gap-1">
                          Envio Eco A (B) %
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Percentual de bobinas Eco A com variação enviadas para a Sede (Curitiba) no Período B.
                            </span>
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right select-none">
                        <div className="flex items-center justify-end gap-1">
                          ▲ Eco A Delta
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Variação delta no índice de geração/envio de Eco A para a Sede (Curitiba).
                            </span>
                          </span>
                        </div>
                      </th>
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
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-blue-600 text-white tracking-wider shadow-sm leading-none shrink-0 border border-blue-500">
                                    Filtro Ativo
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right font-medium">{formatWeight(c.prodA)}</td>
                            <td className="px-4 py-3.5 text-right font-black">{formatWeight(c.prodB)}</td>
                            <td className="px-4 py-3.5 text-right">
                              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg font-black text-[10px] ${c.prodVarPct >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {c.prodVarPct >= 0 ? '+' : ''}{c.prodVarPct.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right text-slate-500">{formatPercent(c.wasteIdxA)}</td>
                            <td className="px-4 py-3.5 text-right font-black">{formatPercent(c.wasteIdxB)}</td>
                            <td className="px-4 py-3.5 text-right">
                              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[9px] font-black ${c.wasteIdxVar <= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {c.wasteIdxVar <= 0 ? '' : '+'}{c.wasteIdxVar.toFixed(2)} p.p.
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right text-slate-500">{formatPercent(c.ecoARateA)}</td>
                            <td className="px-4 py-3.5 text-right font-black">{formatPercent(c.ecoARateB)}</td>
                            <td className="px-4 py-3.5 text-right">
                              <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[9px] font-black ${c.ecoARateVar >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {c.ecoARateVar >= 0 ? '+' : ''}{c.ecoARateVar.toFixed(2)} p.p.
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={10} className="px-5 py-8 text-center text-slate-300 font-bold uppercase tracking-wider">
                          Nenhuma combinação encontrada para o termo pesquisado.
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
                        Este gráfico de eixos múltiplos compara o volume físico total de produção mensal (barras azuis em kg, eixo à esquerda) com os indicadores de qualidade e desperdício do período (eixo percentual à direita):
                        <span className="block mt-1.5 font-bold text-rose-300">• Descarte / Perda (%):</span> Proporção entre o descarte inutilizável Eco B (Produção + Manutenção) mais borras versus o peso líquido total produzido. Recomenda-se manter o mais baixo possível.
                        <span className="block mt-1 font-bold text-emerald-300">• Envio Eco A (%):</span> Proporção de bobinas com variação que foram geradas e enviadas para reaproveitamento (rebobinamento) na Sede em Curitiba.
                      </span>
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">Evolução física da produção ao longo do tempo correlacionada aos índices de descarte (Eco A + Eco B + Borra).</p>
                </div>
              </div>

              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartTimelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" stroke="#64748b" style={{ fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis yAxisId="left" stroke="#3b82f6" style={{ fontSize: 10, fontWeight: 'bold' }} label={{ value: 'Produção Líquida Cast (kg)', angle: -90, position: 'insideLeft', offset: 0, style: { fontSize: 10, fontWeight: 'bold' } }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#f43f5e" style={{ fontSize: 10, fontWeight: 'bold' }} label={{ value: 'Índice de Descarte/Perda (%)', angle: 90, position: 'insideRight', offset: 0, style: { fontSize: 10, fontWeight: 'bold' } }} />
                    <RechartsTooltip 
                      formatter={(value: any, name: string) => {
                        if (name.includes('Produção') || name.includes('kg') || name.toLowerCase().includes('producao')) {
                          return [formatWeight(Number(value)), name];
                        }
                        if (name.includes('%')) {
                          return [`${Number(value).toFixed(2).replace('.', ',')}%`, name];
                        }
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="producao" name="Produção Líquida Cast (kg)" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={50} />
                    <Line yAxisId="right" type="monotone" dataKey="perdaPerc" name="Descarte / Perda (%)" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                    <Line yAxisId="right" type="monotone" dataKey="ecoAPerc" name="Envio Eco A (%)" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} strokeDasharray="5 5" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Micro Details Table of Time Intelligence Month Over Month */}
            <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">Métricas Consolidadas de Crescimento MoM e YoY</h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-150">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-500 font-black uppercase tracking-wider border-b border-slate-200">
                      <th className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          Mês Fiscal
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full left-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Período de apuração da produção (Ano-Mês).
                            </span>
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          Produção Líquida
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Volume acumulado do mês, deduzindo perdas físicas.
                            </span>
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          Crescimento MoM Produção
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Variação percentual de volume produzido em relação ao mês anterior (Month over Month).
                            </span>
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          Tempo Paradas
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Horas/minutos totais de interrupções operacionais acumuladas no mês.
                            </span>
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          Var. MoM Paradas
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Incremento ou redução do tempo de paradas em relação ao mês anterior (Mês sobre Mês).
                            </span>
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          Índice Perda
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Percentual médio mensal de descarte e desperdício (Eco B + Borra) gerado.
                            </span>
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          Comp. YoY Produção
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Comparação de volume físico atual contra o mesmo mês do ano anterior (Year over Year).
                            </span>
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                    {chartTimelineData.map((data, idx) => {
                      // MoM calculations
                      let prodMom = '-';
                      let stopsMom = '-';
                      if (idx > 0) {
                        const prev = chartTimelineData[idx - 1];
                        const pVar = prev.producao === 0 ? 0 : ((data.producao - prev.producao) / prev.producao) * 100;
                        const sVar = prev.paradasTotal === 0 ? 0 : ((data.paradasTotal - prev.paradasTotal)/ prev.paradasTotal) * 100;
                        prodMom = `${pVar >= 0 ? '+' : ''}${pVar.toFixed(1)}%`;
                        stopsMom = `${sVar >= 0 ? '+' : ''}${sVar.toFixed(1)}%`;
                      }

                      // YoY calculations (matches same month on the previous year, e.g. YYYY - 1)
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
                          <td className="px-4 py-3.5 text-right font-medium">{formatWeight(data.producao)}</td>
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
                              <span className="text-slate-350 font-medium">-</span>
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
            {/* Banner to open full Downtime BI Analysis */}
            <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 rounded-3xl border border-blue-500/30 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-blue-600 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full">Módulo Inteligência BI</span>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white">Análise Detalhada de Motivos & Recorrência de Paradas</h3>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  Consulte rankings dos motivos mais recorrentes, tempo perdido por equipamento/turno/período e histórico detalhado por lançamento.
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                {onOpenDowntimeReasons && (
                  <button
                    type="button"
                    onClick={onOpenDowntimeReasons}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-black uppercase border border-slate-700 transition-all flex items-center gap-1.5 shadow-md"
                  >
                    <Sliders size={16} className="text-blue-400" /> Gerenciar Motivos
                  </button>
                )}
                {onOpenDowntimeAnalytics && (
                  <button
                    type="button"
                    onClick={onOpenDowntimeAnalytics}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black uppercase shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
                  >
                    <BarChart3 size={18} /> Abrir Painel BI de Paradas
                  </button>
                )}
              </div>
            </div>

            {/* Stoppage profiles comparisons */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stacked Bar Charts of Stoppage profiles */}
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

              {/* In-depth side-by-side stoppage villain analysis */}
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
                      <p className="text-lg font-black text-slate-800 mt-1">{formatMinutes(comparisonResults.stoppageMinutesA)}</p>
                      <div className="text-[10px] text-slate-500 font-semibold mt-1">
                        <div>Manut: <span className="font-extrabold text-slate-700">{formatMinutes(comparisonResults.maintMinutesA)}</span></div>
                        <div>Proc: <span className="font-extrabold text-slate-700">{formatMinutes(comparisonResults.procMinutesA)}</span></div>
                        <div>Outros: <span className="font-extrabold text-slate-700">{formatMinutes(comparisonResults.otherMinutesA)}</span></div>
                      </div>
                    </div>

                    <div className="bg-blue-50/40 p-3.5 rounded-2xl border border-blue-100/50">
                      <span className="text-[9px] uppercase font-black text-slate-400 block tracking-widest">PERÍODO B ({periodB.split('-').reverse().join('/')})</span>
                      <p className="text-lg font-black text-slate-800 mt-1">{formatMinutes(comparisonResults.stoppageMinutesB)}</p>
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
                            <span className="text-emerald-600">Redução de {formatMinutes(Math.abs(comparisonResults.maintChange))} no tempo total registrado para manutenção no período.</span>
                          ) : comparisonResults.maintChange > 0 ? (
                            <span className="text-rose-600 font-bold">Aumento de {formatMinutes(comparisonResults.maintChange)} no tempo total registrado para manutenção no período.</span>
                          ) : (
                            <span className="text-slate-500">Manteve-se idêntico em ambos os períodos.</span>
                          )}
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                        <div>
                          <span className="font-extrabold text-slate-800 block">Tempo de Processo:</span>
                          {comparisonResults.procChange < 0 ? (
                            <span className="text-emerald-600">Redução de {formatMinutes(Math.abs(comparisonResults.procChange))} no tempo de paradas de processo.</span>
                          ) : comparisonResults.procChange > 0 ? (
                            <span className="text-rose-600 font-bold font-semibold">Aumento de {formatMinutes(comparisonResults.procChange)} no tempo de paradas de processo.</span>
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
                  <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">Comparação cruzada de volume individual produzido versus volatilidade de desperdício (Eco A/Eco B/Borra)</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {/* Operador 1 */}
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
                    <Award className="text-blue-500 shrink-0" size={14} />
                    <div className="flex flex-col min-w-[85px]">
                      <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider leading-none">Ref. Operador 1</span>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <span className="text-[9px] font-bold text-slate-500">R$</span>
                        <input 
                          type="number" 
                          min={0}
                          value={bonusRefOp1} 
                          onChange={e => setBonusRefOp1(Number(e.target.value) || 0)} 
                          className="bg-transparent font-black text-[11px] text-slate-800 outline-none w-14 p-0 border-none focus:ring-0 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Operador 2 */}
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
                    <Award className="text-indigo-500 shrink-0" size={14} />
                    <div className="flex flex-col min-w-[85px]">
                      <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider leading-none">Ref. Operador 2</span>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <span className="text-[9px] font-bold text-slate-500">R$</span>
                        <input 
                          type="number" 
                          min={0}
                          value={bonusRefOp2} 
                          onChange={e => setBonusRefOp2(Number(e.target.value) || 0)} 
                          className="bg-transparent font-black text-[11px] text-slate-800 outline-none w-14 p-0 border-none focus:ring-0 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Operador 3 */}
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
                    <Award className="text-amber-500 shrink-0" size={14} />
                    <div className="flex flex-col min-w-[85px]">
                      <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider leading-none">Ref. Operador 3</span>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <span className="text-[9px] font-bold text-slate-500">R$</span>
                        <input 
                          type="number" 
                          min={0}
                          value={bonusRefOp3} 
                          onChange={e => setBonusRefOp3(Number(e.target.value) || 0)} 
                          className="bg-transparent font-black text-[11px] text-slate-800 outline-none w-14 p-0 border-none focus:ring-0 focus:outline-none"
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

              {/* Informational banner about the Linear Proportional Discount Bonus system */}
              <div className="bg-gradient-to-r from-emerald-50/70 to-teal-50/70 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3.5 shadow-sm">
                <Award className="text-emerald-500 mt-1 shrink-0" size={18} />
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider">Regra de Bônus: Desconto Linear Proporcional por Nível</h4>
                  <p className="text-[10px] text-slate-600 font-semibold leading-relaxed">
                    Cálculo individual contínuo onde o operador com o <strong>melhor (menor) coeficiente de perda ({formatPercent(minWaste)})</strong> recebe 100% do bônus completo correspondente ao seu nível com 0% de desconto. O operador com o <strong>pior (maior) coeficiente de perda ({formatPercent(maxWaste)})</strong> recebe 100% de desconto, resultando em <strong>R$ 0,00</strong>. Os valores de bônus base variam por nível de operador (<strong>Operador 1: R$ {bonusRefOp1.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, Operador 2: R$ {bonusRefOp2.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, Operador 3: R$ {bonusRefOp3.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>).
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-150">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-500 font-black uppercase tracking-wider border-b border-slate-200">
                      <th className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          Operador de Produção
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full left-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Nome do operador encarregado do apontamento de produção.
                            </span>
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          Produção Acumulada Cast
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Soma total de peso líquido gerado pelo respectivo profissional.
                            </span>
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          Descarte Acumulado
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Peso total de refugo e borra não aproveitado, bem como a discriminação individualizada de cada tipo de descarte.
                            </span>
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          Média Coeficiente de Perda
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Coeficiente médio de desperdício em relação ao volume bruto produzido (Menor é melhor).
                            </span>
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right text-amber-600">
                        <div className="flex items-center justify-end gap-1">
                          Desconto Linear
                          <span className="group relative inline-block cursor-help align-middle text-slate-400">
                            <Info size={10} className="hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Desconto aplicado de forma proporcional linear, variando de 0% (Melhor Média de Perdas do período) até 100% (Pior Média de Perdas).
                            </span>
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right text-emerald-600">
                        <div className="flex items-center justify-end gap-1">
                          Bônus Estimado
                          <span className="group relative inline-block cursor-help align-middle text-slate-400">
                            <Info size={10} className="hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Valor final do bônus proporcional recebido após o desconto proporcional linear do mês com base no valor de referência.
                            </span>
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          Volatilidade Evolutiva (▲ MoM SD)
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Desvio padrão das variações mensais (Sinaliza coerência ou se o operador possui ciclos de extrema oscilação).
                            </span>
                          </span>
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          Atividades (Meses)
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Número de meses em que o operador possui pelo menos um apontamento registrado.
                            </span>
                          </span>
                        </div>
                      </th>
                      <th className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          Classificação Operacional
                          <span className="group relative inline-block cursor-help align-middle">
                            <Info size={10} className="text-slate-400 hover:text-slate-600 inline" />
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 w-56 bg-slate-900 border border-slate-700 text-white text-[9px] font-semibold py-1.5 px-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] text-center normal-case tracking-normal">
                              Diagnóstico automatizado baseado no cruzamento de volume entregue e estabilidade de perda.
                            </span>
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                    {filteredOperators.length > 0 ? (
                      filteredOperators.map((op) => {
                        // Classify operator consistency profile
                        let badgeColor = 'bg-slate-100 text-slate-500';
                        let label = 'Médio Produtor';

                        if (op.totalProd > 25000 && op.averageWasteIdx <= 4.0) {
                          badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                          label = 'Alta Performance e Baixa Perda';
                        } else if (op.volatility > 15 && op.averageWasteIdx > 5.5) {
                          badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
                          label = 'Forte Instabilidade / Alta Perda';
                        } else if (op.averageWasteIdx <= 3.5) {
                          badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
                          label = 'Operação Limpa e Consistente';
                        } else if (op.totalProd > 30000) {
                          badgeColor = 'bg-purple-100 text-purple-800 border-purple-200';
                          label = 'Alto Volume Gerado';
                        }

                        return (
                          <tr key={op.operator} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-4 text-slate-900 font-black uppercase flex items-center gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  {op.operator}
                                  {op.totalProd > 35000 && (
                                    <Zap className="text-amber-500 fill-amber-500" size={13} title="Destaque de Produtividade" />
                                  )}
                                </div>
                                <div className="text-[9px] text-indigo-500 font-black mt-0.5 tracking-wider uppercase">
                                  {getOperatorDetails(op.operator).roleName}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right font-medium">{formatWeight(op.totalProd)}</td>
                            <td className="px-4 py-4 text-right">
                              <div className="font-extrabold text-slate-800">{formatWeight(op.totalWaste)}</div>
                              <div className="text-[9px] text-slate-400 font-bold uppercase mt-1 space-y-0.5">
                                <div>Eco A: {formatWeight(op.totalEcoA)}</div>
                                <div>Eco B: {formatWeight(op.totalEcoB)}</div>
                                <div>Borra: {formatWeight(op.totalBorra)}</div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right text-rose-500 font-black">{formatPercent(op.averageWasteIdx)}</td>
                            <td className="px-4 py-4 text-right">
                              {(() => {
                                const discountPct = wasteRange === 0 ? 0 : ((op.averageWasteIdx - minWaste) / wasteRange) * 100;
                                if (discountPct === 0) {
                                  return <span className="text-emerald-600 font-black bg-emerald-50 px-2 py-1 rounded-lg">0,0% (Melhor)</span>;
                                }
                                if (discountPct === 100) {
                                  return <span className="text-rose-500 font-black bg-rose-50 px-2 py-1 rounded-lg">100,0% (Máx.)</span>;
                                }
                                return <span className="text-slate-600 font-bold">{discountPct.toFixed(1).replace('.', ',')}%</span>;
                              })()}
                            </td>
                            <td className="px-4 py-4 text-right">
                              {(() => {
                                const details = getOperatorDetails(op.operator);
                                const discountPct = wasteRange === 0 ? 0 : ((op.averageWasteIdx - minWaste) / wasteRange) * 100;
                                const bonusAmt = details.bonusRef * (1 - (discountPct / 100));
                                if (discountPct === 0) {
                                  return (
                                    <div className="flex justify-end items-center gap-1">
                                      <span className="text-emerald-600 font-black text-xs flex flex-col items-end bg-emerald-50 px-2.5 py-1 rounded-xl">
                                        <span className="flex items-center gap-0.5"><Award size={12} className="text-amber-500 fill-amber-500 inline mr-0.5" /> R$ {bonusAmt.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        <span className="text-[8px] text-emerald-500 font-bold block mt-0.5">Sem desconto ({details.roleName})</span>
                                      </span>
                                    </div>
                                  );
                                }
                                if (discountPct === 100) {
                                  return (
                                    <div className="flex flex-col items-end">
                                      <span className="text-slate-400 font-normal">R$ 0,00</span>
                                      <span className="text-[8px] text-rose-400 font-bold block mt-0.5">Pior média ({details.roleName})</span>
                                    </div>
                                  );
                                }
                                return (
                                  <div className="flex flex-col items-end">
                                    <span className="text-slate-700 font-extrabold text-xs">R$ {bonusAmt.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    <span className="text-[8px] text-slate-400 font-semibold">Base: R$ {details.bonusRef} ({details.roleName})</span>
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
                            <td className="px-5 py-4">
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
                          Nenhum operador encontrado com esse nome.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {biActiveSection === 'eco_b_vs_tubetes' && (() => {
          // Local helper memos for Eco B vs Tubetes
          const sortedEcoBOperators = [...ecoBTubetesMetrics.operatorsList];
          if (ecoBOperatorSearch.trim()) {
            const s = ecoBOperatorSearch.toLowerCase();
            sortedEcoBOperators.sort((a, b) => {
              const matchA = a.operator.toLowerCase().includes(s) ? 1 : 0;
              const matchB = b.operator.toLowerCase().includes(s) ? 1 : 0;
              if (matchA !== matchB) return matchB - matchA;
              return 0;
            });
          }
          sortedEcoBOperators.sort((a, b) => {
            let valA: any = a[ecoBSortField as keyof typeof a];
            let valB: any = b[ecoBSortField as keyof typeof b];
            if (typeof valA === 'string') {
              return ecoBSortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return ecoBSortAsc ? (valA - valB) : (valB - valA);
          });

          const filteredDailyGrid = ecoBTubetesMetrics.dailyGridList.filter(entry => {
            if (ecoBOperatorSearch.trim()) {
              if (!entry.operator.toLowerCase().includes(ecoBOperatorSearch.toLowerCase())) return false;
            }
            if (ecoBMachineFilter !== 'all') {
              if (entry.machine.toLowerCase() !== ecoBMachineFilter.toLowerCase()) return false;
            }
            if (ecoBShiftFilter !== 'all') {
              if (entry.shift.toLowerCase() !== ecoBShiftFilter.toLowerCase()) return false;
            }
            return true;
          });

          // Toggle sorting
          const handleSort = (field: typeof ecoBSortField) => {
            if (ecoBSortField === field) {
              setEcoBSortAsc(!ecoBSortAsc);
            } else {
              setEcoBSortField(field);
              setEcoBSortAsc(false);
            }
          };

          return (
            <motion.div 
              key="eco_b_vs_tubetes" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              className="space-y-6"
            >
              {/* Header Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-sm space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                      <Scale className="text-blue-600 animate-pulse" size={16} /> 5. Correlação Estruturada: Eco B vs Tubetes Eco B
                    </h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">
                      Métricas integradas de volume, controle de tubetes de papelão por operador e cruzamento de eficiências por dia
                    </p>
                  </div>
                  
                  {/* Filters Header Block */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Operator search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                      <input 
                        type="text" 
                        placeholder="Filtrar operador..." 
                        value={ecoBOperatorSearch} 
                        onChange={e => setEcoBOperatorSearch(e.target.value)} 
                        className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 w-full sm:w-44"
                      />
                    </div>

                    {/* Machine dropdown */}
                    <select 
                      value={ecoBMachineFilter} 
                      onChange={e => setEcoBMachineFilter(e.target.value)} 
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-slate-600"
                    >
                      <option value="all">Todas Máquinas</option>
                      <option value="cast 1">Cast 1</option>
                      <option value="cast 2">Cast 2</option>
                    </select>

                    {/* Shift dropdown */}
                    <select 
                      value={ecoBShiftFilter} 
                      onChange={e => setEcoBShiftFilter(e.target.value)} 
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-slate-600"
                    >
                      <option value="all">Todos Turnos</option>
                      <option value="diurno 1">Diurno 1</option>
                      <option value="noturno 1">Noturno 1</option>
                      <option value="diurno 2">Diurno 2</option>
                      <option value="noturno 2">Noturno 2</option>
                    </select>
                  </div>
                </div>

                {/* KPI Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 border border-blue-100 rounded-2xl p-5 shadow-sm space-y-1 hover:shadow-md transition-all">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-wider">Geração Total de Eco B</p>
                    <h4 className="text-2xl font-black text-blue-900 font-mono">
                      {formatWeight(ecoBTubetesMetrics.totalEcoB)}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Volume total acumulado gerado de sobras Eco B (P + M)</p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-orange-50/30 border border-amber-100 rounded-2xl p-5 shadow-sm space-y-1 hover:shadow-md transition-all">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Tubetes Eco B Consumidos</p>
                    <h4 className="text-2xl font-black text-amber-900 font-mono">
                      {ecoBTubetesMetrics.totalTubetesEcoB.toLocaleString('pt-BR')} <span className="text-xs font-bold text-amber-700">unidades</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Quantidade total de cilindros/tubetes gastos no processo</p>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50/30 border border-emerald-100 rounded-2xl p-5 shadow-sm space-y-1 hover:shadow-md transition-all">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Relação Média por Tubete</p>
                    <h4 className="text-2xl font-black text-emerald-900 font-mono">
                      {formatWeight(ecoBTubetesMetrics.overallRatio)} <span className="text-xs font-bold text-emerald-700">/ Tubete</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Densidade média de Eco B enrolado por cilindro</p>
                  </div>
                </div>

                {/* Daily Correlation Chart */}
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Histórico de Correlação Diária</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Eco B (Barras, Eixo Esquerdo) vs Tubetes (Linha, Eixo Direito)</p>
                    </div>
                  </div>

                  <div className="h-64 sm:h-72">
                    {dailyChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={dailyChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="dateBR" tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#94a3b8" />
                          <YAxis 
                            yAxisId="left" 
                            tickFormatter={(v) => formatWeight(v)} 
                            tick={{ fontSize: 9, fontWeight: 'bold' }} 
                            stroke="#3b82f6" 
                          />
                          <YAxis 
                            yAxisId="right" 
                            orientation="right" 
                            tick={{ fontSize: 9, fontWeight: 'bold' }} 
                            stroke="#f59e0b" 
                          />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                            labelStyle={{ fontWeight: 'bold', fontSize: '10px', color: '#94a3b8' }}
                            formatter={(value: any, name: any) => {
                              if (name === 'Eco B') return [formatWeight(Number(value)), 'Eco B Gerado'];
                              return [`${Number(value).toLocaleString('pt-BR')} un`, 'Tubetes Usados'];
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                          <Bar yAxisId="left" dataKey="ecoB" name="Eco B" fill="#3b82f6" opacity={0.8} radius={[4, 4, 0, 0]} />
                          <Line yAxisId="right" type="monotone" dataKey="tubetesEcoB" name="Tubetes" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }}>
                            <LabelList
                              dataKey="tubetesEcoB"
                              position="top"
                              formatter={(val: number) => (val > 0 ? `${val} un` : '')}
                              style={{ fontSize: 9, fontWeight: 800, fill: '#d97706' }}
                            />
                          </Line>
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-300">
                        <p className="text-xs font-black uppercase tracking-widest">Sem dados diários disponíveis para gráfico</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Comparative Bento Grid for Machine and Shifts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
                  {/* Machine performance bento */}
                  <div className="border border-slate-150 rounded-2xl p-5 space-y-3 bg-white">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                      🏢 Comparativo por Equipamento (Máquina)
                    </h4>
                    <div className="space-y-3">
                      {ecoBTubetesMetrics.machinesList.map(m => (
                        <div key={m.machine} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100/50 transition-all border border-slate-100">
                          <div>
                            <span className="text-xs font-black text-slate-700 uppercase">{m.machine}</span>
                            <div className="text-[9.5px] text-slate-400 font-bold uppercase mt-0.5">
                              {m.totalTubetesEcoB} tubetes utilizados
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-blue-600 font-mono block">
                              {formatWeight(m.totalEcoB)}
                            </span>
                            <span className="text-[9.5px] text-emerald-600 font-bold uppercase">
                              {formatWeight(m.ratio)} / tubete
                            </span>
                          </div>
                        </div>
                      ))}
                      {ecoBTubetesMetrics.machinesList.length === 0 && (
                        <p className="text-[10px] font-bold text-slate-400 uppercase text-center py-4">Sem registros por equipamento</p>
                      )}
                    </div>
                  </div>

                  {/* Shifts performance bento */}
                  <div className="border border-slate-150 rounded-2xl p-5 space-y-3 bg-white">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                      ⏰ Comparativo por Turno de Trabalho
                    </h4>
                    <div className="space-y-3">
                      {ecoBTubetesMetrics.shiftsList.map(s => (
                        <div key={s.shift} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100/50 transition-all border border-slate-100">
                          <div>
                            <span className="text-xs font-black text-slate-700 uppercase">{s.shift}</span>
                            <div className="text-[9.5px] text-slate-400 font-bold uppercase mt-0.5">
                              {s.totalTubetesEcoB} tubetes utilizados
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-indigo-600 font-mono block">
                              {formatWeight(s.totalEcoB)}
                            </span>
                            <span className="text-[9.5px] text-emerald-600 font-bold uppercase">
                              {formatWeight(s.ratio)} / tubete
                            </span>
                          </div>
                        </div>
                      ))}
                      {ecoBTubetesMetrics.shiftsList.length === 0 && (
                        <p className="text-[10px] font-bold text-slate-400 uppercase text-center py-4">Sem registros por turno</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Operators Leaderboard */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        👤 Comparação Geral por Operador
                      </h4>
                      <p className="text-[9.5px] text-slate-400 font-bold uppercase">
                        Geração de Eco B, cilindros de tubete consumidos, e a eficiência média de peso por tubete de cada profissional
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-150">
                    <table className="w-full text-left border-collapse bg-white">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-150 select-none">
                          <th className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('operator')}>
                            Operador {ecoBSortField === 'operator' && (ecoBSortAsc ? '▲' : '▼')}
                          </th>
                          <th className="px-5 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('totalEcoB')}>
                            Eco B Total {ecoBSortField === 'totalEcoB' && (ecoBSortAsc ? '▲' : '▼')}
                          </th>
                          <th className="px-5 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('totalTubetesEcoB')}>
                            Tubetes Usados {ecoBSortField === 'totalTubetesEcoB' && (ecoBSortAsc ? '▲' : '▼')}
                          </th>
                          <th className="px-5 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('averageRatio')}>
                            Kg / Tubete {ecoBSortField === 'averageRatio' && (ecoBSortAsc ? '▲' : '▼')}
                          </th>
                          <th className="px-5 py-3 text-center">Dias Registrados</th>
                          <th className="px-5 py-3 text-right">Média Eco B / Dia</th>
                          <th className="px-5 py-3 text-right">Média Tubetes / Dia</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                        {sortedEcoBOperators.map(op => (
                          <tr key={op.operator} className="hover:bg-slate-50/40 transition-colors">
                            <td className="px-5 py-4 text-slate-900 font-black uppercase">
                              {op.operator}
                            </td>
                            <td className="px-5 py-4 text-right font-mono text-blue-600 font-black">
                              {formatWeight(op.totalEcoB)}
                            </td>
                            <td className="px-5 py-4 text-right font-mono text-amber-600">
                              {op.totalTubetesEcoB.toLocaleString('pt-BR')} un
                            </td>
                            <td className="px-5 py-4 text-right font-mono text-emerald-600 font-extrabold">
                              {formatWeight(op.averageRatio)}
                            </td>
                            <td className="px-5 py-4 text-center text-slate-500">
                              {op.shiftsCount} {op.shiftsCount === 1 ? 'dia' : 'dias'}
                            </td>
                            <td className="px-5 py-4 text-right font-mono text-slate-500">
                              {formatWeight(op.averageEcoBPerDay)}
                            </td>
                            <td className="px-5 py-4 text-right font-mono text-slate-500">
                              {op.averageTubetesPerDay.toFixed(1).replace('.', ',')} un
                            </td>
                          </tr>
                        ))}
                        {sortedEcoBOperators.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-5 py-8 text-center text-slate-300 font-bold uppercase tracking-wider">
                              Nenhum operador encontrado com o filtro atual
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Daily Detailed Grid: Operator comparison by Day */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText size={14} className="text-indigo-500" /> Grade de Comparação por Operador por Dia
                      </h4>
                      <p className="text-[9.5px] text-slate-400 font-bold uppercase">
                        Detalhamento completo data por data, correlacionando operador, máquina, turno e a proporção pontual de peso por tubete
                      </p>
                    </div>
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl uppercase">
                      {filteredDailyGrid.length} lançamentos encontrados
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-150">
                    <table className="w-full text-left border-collapse bg-white">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-150">
                          <th className="px-5 py-3">Data</th>
                          <th className="px-5 py-3">Operador</th>
                          <th className="px-5 py-3">Equipamento</th>
                          <th className="px-5 py-3">Turno</th>
                          <th className="px-5 py-3 text-right">Peso Eco B</th>
                          <th className="px-5 py-3 text-right">Tubetes Eco B</th>
                          <th className="px-5 py-3 text-right">Proporção (Kg / Tubete)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                        {filteredDailyGrid.slice(0, 100).map(entry => {
                          const ratio = entry.tubetesEcoB > 0 ? entry.ecoB / entry.tubetesEcoB : 0;
                          return (
                            <tr key={entry.id} className="hover:bg-slate-50/40 transition-colors">
                              <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                                {entry.date.split('-').reverse().join('/')}
                              </td>
                              <td className="px-5 py-3.5 font-black text-slate-800 uppercase">
                                {entry.operator}
                              </td>
                              <td className="px-5 py-3.5 uppercase font-medium">
                                {entry.machine}
                              </td>
                              <td className="px-5 py-3.5 uppercase font-medium">
                                {entry.shift}
                              </td>
                              <td className="px-5 py-3.5 text-right font-mono text-blue-600 font-extrabold">
                                {formatWeight(entry.ecoB)}
                              </td>
                              <td className="px-5 py-3.5 text-right font-mono text-slate-700 font-bold">
                                {entry.tubetesEcoB.toLocaleString('pt-BR')} un
                              </td>
                              <td className="px-5 py-3.5 text-right font-mono text-emerald-600 font-extrabold">
                                {entry.tubetesEcoB > 0 ? formatWeight(ratio) : '-'}
                              </td>
                            </tr>
                          );
                        })}
                        {filteredDailyGrid.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-5 py-8 text-center text-slate-300 font-bold uppercase tracking-wider">
                              Nenhum registro encontrado com os filtros atuais
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {filteredDailyGrid.length > 100 && (
                    <p className="text-[10px] text-center text-slate-400 font-bold uppercase pt-1">
                      Exibindo os primeiros 100 lançamentos. Refine os filtros acima para pesquisar datas específicas.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};
