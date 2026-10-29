import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, AlertTriangle, CheckCircle2, XCircle, Clock, FileText, 
  Calendar, Filter, Search, Plus, Trash2, ArrowLeft,
  ShieldAlert, FileCheck, Users, Printer, ChevronDown, 
  X, Info, Layers, AlertOctagon, HelpCircle, FileSpreadsheet,
  SlidersHorizontal, HardHat, Briefcase, Palmtree, Download,
  ExternalLink, Check, DollarSign, Activity, Zap
} from 'lucide-react';
import { Employee } from '../types';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type BonusIncidentType = 
  | 'atestado' 
  | 'falta_injustificada' 
  | 'falta_justificada' 
  | 'atraso_injustificado' 
  | 'atraso_justificado' 
  | 'meta_maquina_nao_atingida';

export interface BonusIncident {
  id: string;
  employeeId?: string; // Colaborador individual (se aplicável)
  employeeName: string;
  registration?: string;
  sector: string;
  machine?: string;
  shift?: string;
  type: BonusIncidentType;
  date: string; // YYYY-MM-DD
  cyclePeriod: string; // ex: "2026-10"
  description: string;
  documentNumber?: string; // Número do atestado, CID ou protocolo
  documentDetails?: string; // Nome da instituição, médico ou observação de documento
  isJustified: boolean;
  targetMachine?: string; // Se a ocorrência foi por máquina (ex: 'Cast 1', 'Cast 2')
  targetShift?: string; // Se for para turno específico (ex: 'Diurno 1', 'Noturno 1' ou 'Todos')
  penaltyRatePercent?: number; // Desconto imposto (ex: 100% para atestado/falta; ou % específico para meta de máquina)
  registeredBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MachineGoalConfig {
  id: string; // ex: "Cast 1_Diurno 1_2026-10" ou "Cast 1_2026-10"
  machine: string; // "Cast 1", "Cast 2", "Erema 1", "Cortadeiras"
  shift: string; // "Todos", "Diurno 1", "Noturno 1", "Diurno 2", "Noturno 2"
  cyclePeriod: string;
  goalMet: boolean; // Se a meta de produção foi cumprida
  abatementPercent: number; // Percentual a abater da equipe (ex: 30%, 50%, 100%)
  notes?: string;
  updatedAt?: string;
}

interface ProductionBonusManagerProps {
  employees: Employee[];
  productionData?: any[];
  onClose: () => void;
  canManage: boolean;
  isReadOnly?: boolean;
  onBlockedAction?: () => void;
  loggedUser?: { username?: string; name?: string; role?: string } | null;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const DEFAULT_MACHINES = ["Cast 1", "Cast 2", "Erema 1", "Ghezzi", "Lintech", "Wutec"];
const DEFAULT_SHIFTS = ["Todos", "Diurno 1", "Noturno 1", "Diurno 2", "Noturno 2", "Comercial"];

// Helper formats identical to BiAnalyticsView
const formatWeight = (val: number | null | undefined) => {
  const num = Number(val);
  if (isNaN(num)) return '0 Kg';
  const absVal = Math.abs(num);
  if (absVal >= 1000) {
    return (num / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).replace(',', '.') + ' T';
  }
  return num.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' Kg';
};

const formatPercent = (val: number | null | undefined) => {
  const num = Number(val);
  if (isNaN(num)) return '0,00%';
  return `${num.toFixed(2).replace('.', ',')}%`;
};

export const ProductionBonusManager: React.FC<ProductionBonusManagerProps> = ({
  employees = [],
  productionData = [],
  onClose,
  canManage = true,
  isReadOnly = false,
  onBlockedAction,
  loggedUser
}) => {
  // Navigation tabs: 'overview' | 'teams_evolution' | 'payroll' | 'incidents' | 'machine_goals' | 'settings'
  const [activeTab, setActiveTab] = useState<'overview' | 'teams_evolution' | 'payroll' | 'incidents' | 'machine_goals' | 'settings'>('overview');

  // Cycle period state (defaults to October 2026 or current active cycle)
  const [selectedCycle, setSelectedCycle] = useState<string>(() => {
    return localStorage.getItem('manupackaging_bonus_cycle') || '2026-10';
  });

  useEffect(() => {
    localStorage.setItem('manupackaging_bonus_cycle', selectedCycle);
  }, [selectedCycle]);

  // Base bonus configurations by role
  const [baseBonusValues, setBaseBonusValues] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('manupackaging_bonus_base_values');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      'Operador 1': 300,
      'Operador 2': 300,
      'Operador I': 300,
      'Operador II': 300,
      'Operador Líder': 350,
      'Auxiliar 1': 250,
      'Auxiliar 2': 250,
      'Auxiliar de Produção': 250,
      'Líder': 350,
      'Supervisor': 400,
      'default': 250
    };
  });

  const getBaseBonus = (roleName: string): number => {
    return baseBonusValues[roleName] || baseBonusValues['default'] || 250;
  };

  // State: Incidents and Machine Goals
  const [incidents, setIncidents] = useState<BonusIncident[]>(() => {
    try {
      const saved = localStorage.getItem('manupackaging_bonus_incidents');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [machineGoals, setMachineGoals] = useState<MachineGoalConfig[]>(() => {
    try {
      const saved = localStorage.getItem('manupackaging_bonus_machine_goals');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Filter states
  const [searchFilter, setSearchFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'full' | 'partial' | 'zero'>('all');

  // Modals
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState<BonusIncident | null>(null);
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState<Employee | null>(null);

  // Form State for Incident
  const [formMode, setFormMode] = useState<'individual' | 'machine'>('individual');
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [incidentType, setIncidentType] = useState<BonusIncidentType>('atestado');
  const [incidentDate, setIncidentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [incidentDescription, setIncidentDescription] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [documentDetails, setDocumentDetails] = useState('');
  const [isJustified, setIsJustified] = useState(true);
  const [targetMachine, setTargetMachine] = useState('Cast 1');
  const [targetShift, setTargetShift] = useState('Todos');
  const [customPenaltyPercent, setCustomPenaltyPercent] = useState<number>(100);

  // Firestore synchronization
  useEffect(() => {
    const unsubIncidents = onSnapshot(collection(db, 'bonus_incidents'), (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as BonusIncident));
        setIncidents(list);
        localStorage.setItem('manupackaging_bonus_incidents', JSON.stringify(list));
      }
    }, () => {});

    const unsubMachineGoals = onSnapshot(collection(db, 'machine_goal_configs'), (snapshot) => {
      if (!snapshot.empty) {
        const list = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as MachineGoalConfig));
        setMachineGoals(list);
        localStorage.setItem('manupackaging_bonus_machine_goals', JSON.stringify(list));
      }
    }, () => {});

    return () => {
      unsubIncidents();
      unsubMachineGoals();
    };
  }, []);

  const persistIncidents = async (list: BonusIncident[]) => {
    setIncidents(list);
    localStorage.setItem('manupackaging_bonus_incidents', JSON.stringify(list));
    try {
      for (const item of list) {
        await setDoc(doc(db, 'bonus_incidents', item.id), item);
      }
    } catch {}
  };

  const persistMachineGoals = async (list: MachineGoalConfig[]) => {
    setMachineGoals(list);
    localStorage.setItem('manupackaging_bonus_machine_goals', JSON.stringify(list));
    try {
      for (const item of list) {
        await setDoc(doc(db, 'machine_goal_configs', item.id), item);
      }
    } catch {}
  };

  // Reference value for operator monthly bonus (single meta of R$ 250, editable)
  const [metaMensalBonus, setMetaMensalBonus] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('manupackaging_bonus_base_meta');
      if (saved) return Number(saved) || 250;
    } catch {}
    return 250;
  });

  const [operatorSearch, setOperatorSearch] = useState('');

  // 100% Consistent Filter replicating App.tsx / BiAnalyticsView logic for data validity
  const processedDataFiltered = useMemo(() => {
    if (!Array.isArray(productionData)) return [];
    return productionData.filter(e => {
      if (!e || !e.date) return false;
      const year = parseInt(e.date.split('-')[0], 10);
      if (isNaN(year) || year < 2026) return false;
      const isExcludedMonth = e.date.substring(5, 7) === '05' || e.date.substring(5, 7) === '06';
      const isExistingPastEntry = !e.updatedAt || e.updatedAt < '2026-06-12T17:44:00Z';
      if (isExcludedMonth && (e.machine || '').toLowerCase().includes('cast 2') && isExistingPastEntry) {
        return false;
      }
      return true;
    });
  }, [productionData]);

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

    processedDataFiltered.forEach(e => {
      if (!e.operator || (e.machine || '').toLowerCase().includes('erema')) return;
      const m = e.date.substring(0, 7);
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

      // Calculate MoM stability / volatility
      let sumDiffSq = 0;
      let count = 0;
      for (let i = 1; i < history.length; i++) {
        const prev = history[i - 1].netProd;
        const curr = history[i].netProd;
        const varPct = prev === 0 ? 0 : ((curr - prev) / prev) * 100;
        sumDiffSq += (varPct * varPct);
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

    return list.sort((a,b) => b.totalProd - a.totalProd);
  }, [processedDataFiltered]);

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

  // Helper to extract operator level and corresponding bonus reference
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
    }
    return { level, roleName: roleDisplay, bonusRef: metaMensalBonus };
  };

  // Helper to match an employee with their operator metrics
  const findOperatorPerformance = (empName?: string, reg?: string) => {
    if (!empName) return null;
    const normEmp = empName.trim().toLowerCase();
    const parts = normEmp.split(/\s+/).filter(Boolean);
    const firstName = parts[0] || '';
    const lastName = parts.length > 1 ? parts[parts.length - 1] : '';

    const found = operatorMetrics.find(o => {
      const normOp = o.operator.trim().toLowerCase();
      if (normOp === normEmp) return true;
      if (normOp.includes(normEmp) || normEmp.includes(normOp)) return true;
      if (firstName && lastName && normOp.includes(firstName) && normOp.includes(lastName)) return true;
      if (parts.length === 1 && normOp === firstName) return true;
      return false;
    });

    if (!found) return null;

    const discountPct = wasteRange === 0 ? 0 : ((found.averageWasteIdx - minWaste) / wasteRange) * 100;
    const bonusAmt = metaMensalBonus * (1 - (discountPct / 100));
    const lossAmt = metaMensalBonus * (discountPct / 100);

    return {
      ...found,
      discountPct,
      bonusAmt,
      lossAmt
    };
  };

  // Cycle incidents and machine goals
  const cycleIncidents = useMemo(() => {
    return incidents.filter(i => i.cyclePeriod === selectedCycle);
  }, [incidents, selectedCycle]);

  const cycleMachineGoals = useMemo(() => {
    return machineGoals.filter(g => g.cyclePeriod === selectedCycle);
  }, [machineGoals, selectedCycle]);

  // Active production employees
  const activeEmployees = useMemo(() => {
    return employees.filter(e => e.status === 'Ativo');
  }, [employees]);

  // Format currency
  const formatBRL = (val: number | null | undefined) => {
    const num = Number(val) || 0;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Calculation per employee with Performance Deductions Interlinked
  const payrollData = useMemo(() => {
    return activeEmployees.map(emp => {
      const baseAmount = getBaseBonus(emp.role);

      // Find operator metric from historical performance
      const perf = findOperatorPerformance(emp.name, emp.registration);

      // Direct personal incidents
      const personalIncidents = cycleIncidents.filter(
        i => i.employeeId === emp.id || (i.registration && i.registration === emp.registration)
      );

      // Machine goal incidents / penalties affecting this employee's sector/machine/shift
      const machineIncidents = cycleIncidents.filter(i => {
        if (i.type !== 'meta_maquina_nao_atingida') return false;
        const matchesMachine = !i.targetMachine || i.targetMachine === emp.machine;
        const matchesShift = !i.targetShift || i.targetShift === 'Todos' || i.targetShift === emp.shift;
        return matchesMachine && matchesShift;
      });

      // Check machine goals config for the cycle
      const unfulfilledGoals = cycleMachineGoals.filter(g => {
        if (g.goalMet) return false;
        const matchesMachine = g.machine === emp.machine;
        const matchesShift = g.shift === 'Todos' || g.shift === emp.shift;
        return matchesMachine && matchesShift;
      });

      // Total deduction calculation
      let totalDeductionPercent = 0;
      const reasonsList: string[] = [];

      personalIncidents.forEach(inc => {
        let pct = inc.penaltyRatePercent ?? 100;
        if (inc.type === 'atestado' || inc.type === 'falta_injustificada' || inc.type === 'falta_justificada') {
          pct = inc.penaltyRatePercent !== undefined ? inc.penaltyRatePercent : 100;
        } else if (inc.type === 'atraso_injustificado') {
          pct = inc.penaltyRatePercent !== undefined ? inc.penaltyRatePercent : 20;
        } else if (inc.type === 'atraso_justificado') {
          pct = inc.penaltyRatePercent !== undefined ? inc.penaltyRatePercent : 5;
        }
        totalDeductionPercent += pct;
        reasonsList.push(`${inc.type.replace('_', ' ').toUpperCase()} (${pct}%)`);
      });

      machineIncidents.forEach(inc => {
        const pct = inc.penaltyRatePercent ?? 30;
        totalDeductionPercent += pct;
        reasonsList.push(`Meta Máquina Não Atingida [${inc.targetMachine}] (${pct}%)`);
      });

      unfulfilledGoals.forEach(g => {
        const pct = g.abatementPercent ?? 30;
        totalDeductionPercent += pct;
        reasonsList.push(`Meta Não Batida (${g.machine} - ${g.shift}) (${pct}%)`);
      });

      // Performance linear discount deduction from historical teams evolution
      let perfDiscountPct = 0;
      let perfLossAmount = 0;
      if (perf && perf.discountPct > 0) {
        perfDiscountPct = perf.discountPct;
        perfLossAmount = (baseAmount * perfDiscountPct) / 100;
        totalDeductionPercent += perfDiscountPct;
        reasonsList.push(`Desconto Linear Desempenho Extrusão (${perf.discountPct.toFixed(1)}% - Perda: ${perf.averageWasteIdx.toFixed(2)}% | -${formatBRL(perfLossAmount)})`);
      }

      totalDeductionPercent = Math.min(100, Math.max(0, totalDeductionPercent));
      const deductionAmount = (baseAmount * totalDeductionPercent) / 100;
      const finalAmount = Math.max(0, baseAmount - deductionAmount);
      const isEligible = finalAmount > 0;
      const status: 'full' | 'partial' | 'zero' = 
        totalDeductionPercent === 0 ? 'full' : totalDeductionPercent < 100 ? 'partial' : 'zero';

      return {
        employee: emp,
        baseAmount,
        totalDeductionPercent,
        deductionAmount,
        finalAmount,
        isEligible,
        status,
        personalIncidents,
        perf,
        perfDiscountPct,
        perfLossAmount,
        reasonsText: reasonsList.join(' • ') || 'Sem ocorrências (100% da meta)'
      };
    });
  }, [activeEmployees, cycleIncidents, cycleMachineGoals, baseBonusValues, operatorMetrics, wasteRange, minWaste, metaMensalBonus]);

  // Automatically generate incident records for operators with linear performance deductions
  const autoPerformanceIncidents = useMemo(() => {
    return payrollData
      .filter(item => item.perf && item.perf.discountPct > 0)
      .map(item => ({
        id: `auto_perf_${item.employee.id}_${selectedCycle}`,
        employeeId: item.employee.id,
        employeeName: item.employee.name,
        registration: item.employee.registration,
        sector: item.employee.sector || 'Extrusão',
        machine: item.employee.machine || 'Cast',
        shift: item.employee.shift || 'Todos',
        type: 'meta_maquina_nao_atingida' as BonusIncidentType,
        date: `${selectedCycle}-01`,
        cyclePeriod: selectedCycle,
        description: `Desconto Linear Histórico de Equipe: Coeficiente de Perda de ${item.perf!.averageWasteIdx.toFixed(2)}% (Descarte Acum.: ${formatWeight(item.perf!.totalWaste)} | Borra: ${formatWeight(item.perf!.totalBorra)}) gerando perda de ${formatBRL(item.perfLossAmount)} (${item.perf!.discountPct.toFixed(1)}% de desconto).`,
        documentNumber: 'BI-DESEMPENHO',
        documentDetails: `Produção: ${formatWeight(item.perf!.totalProd)} | Histórico: ${item.perf!.monthsActive} meses`,
        isJustified: false,
        penaltyRatePercent: Number(item.perf!.discountPct.toFixed(1)),
        registeredBy: 'Automático (Evolução Histórica BI)',
        isAutomatic: true,
        createdAt: new Date().toISOString()
      }));
  }, [payrollData, selectedCycle]);

  const combinedIncidents = useMemo(() => {
    return [...cycleIncidents, ...autoPerformanceIncidents];
  }, [cycleIncidents, autoPerformanceIncidents]);

  // Filtered payroll rows
  const filteredPayroll = useMemo(() => {
    return payrollData.filter(item => {
      const emp = item.employee;
      const matchesSearch = !searchFilter || 
        emp.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        emp.registration.toLowerCase().includes(searchFilter.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchFilter.toLowerCase());
      const matchesSector = sectorFilter === 'all' || emp.sector === sectorFilter;
      const matchesShift = shiftFilter === 'all' || emp.shift === shiftFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesSector && matchesShift && matchesStatus;
    });
  }, [payrollData, searchFilter, sectorFilter, shiftFilter, statusFilter]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalCount = payrollData.length;
    const fullBonusCount = payrollData.filter(d => d.status === 'full').length;
    const partialCount = payrollData.filter(d => d.status === 'partial').length;
    const zeroCount = payrollData.filter(d => d.status === 'zero').length;

    const totalBaseBudget = payrollData.reduce((acc, d) => acc + d.baseAmount, 0);
    const totalDeductions = payrollData.reduce((acc, d) => acc + d.deductionAmount, 0);
    const totalFinalPayout = payrollData.reduce((acc, d) => acc + d.finalAmount, 0);

    const overallAttainment = totalBaseBudget > 0 ? (totalFinalPayout / totalBaseBudget) * 100 : 100;

    return {
      totalCount,
      fullBonusCount,
      partialCount,
      zeroCount,
      totalBaseBudget,
      totalDeductions,
      totalFinalPayout,
      overallAttainment
    };
  }, [payrollData]);


  // Open incident registration modal
  const handleOpenAddIncident = (emp?: Employee) => {
    if (isReadOnly && onBlockedAction) {
      onBlockedAction();
      return;
    }
    setEditingIncident(null);
    if (emp) {
      setFormMode('individual');
      setTargetEmployeeId(emp.id);
      setTargetMachine(emp.machine || 'Cast 1');
      setTargetShift(emp.shift || 'Todos');
    } else {
      setFormMode('individual');
      setTargetEmployeeId(activeEmployees[0]?.id || '');
    }
    setIncidentType('atestado');
    setIncidentDate(new Date().toISOString().split('T')[0]);
    setIncidentDescription('');
    setDocumentNumber('');
    setDocumentDetails('');
    setIsJustified(true);
    setCustomPenaltyPercent(100);
    setIsIncidentModalOpen(true);
  };

  // Save Incident
  const handleSaveIncident = () => {
    if (isReadOnly && onBlockedAction) {
      onBlockedAction();
      return;
    }

    if (formMode === 'individual') {
      const emp = activeEmployees.find(e => e.id === targetEmployeeId);
      if (!emp) {
        alert('Selecione um colaborador válido.');
        return;
      }

      const newInc: BonusIncident = {
        id: editingIncident ? editingIncident.id : `inc_${Date.now()}`,
        employeeId: emp.id,
        employeeName: emp.name,
        registration: emp.registration,
        sector: emp.sector,
        machine: emp.machine,
        shift: emp.shift,
        type: incidentType,
        date: incidentDate,
        cyclePeriod: selectedCycle,
        description: incidentDescription || `Ocorrência de ${incidentType.replace('_', ' ')}`,
        documentNumber: documentNumber || undefined,
        documentDetails: documentDetails || undefined,
        isJustified,
        penaltyRatePercent: customPenaltyPercent,
        registeredBy: loggedUser?.name || 'Gestão de Produção',
        createdAt: editingIncident ? editingIncident.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingIncident) {
        persistIncidents(incidents.map(i => i.id === newInc.id ? newInc : i));
      } else {
        persistIncidents([newInc, ...incidents]);
      }
    } else {
      // Machine mode
      const newInc: BonusIncident = {
        id: editingIncident ? editingIncident.id : `inc_mach_${Date.now()}`,
        employeeName: `Equipe da Máquina: ${targetMachine}`,
        sector: 'Extrusão',
        machine: targetMachine,
        shift: targetShift,
        targetMachine,
        targetShift,
        type: 'meta_maquina_nao_atingida',
        date: incidentDate,
        cyclePeriod: selectedCycle,
        description: incidentDescription || `Meta de Produção Não Atingida - ${targetMachine} (${targetShift})`,
        isJustified: false,
        penaltyRatePercent: customPenaltyPercent || 30,
        registeredBy: loggedUser?.name || 'Gestão de Produção',
        createdAt: editingIncident ? editingIncident.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (editingIncident) {
        persistIncidents(incidents.map(i => i.id === newInc.id ? newInc : i));
      } else {
        persistIncidents([newInc, ...incidents]);
      }
    }

    setIsIncidentModalOpen(false);
  };

  // Delete incident
  const handleDeleteIncident = (id: string) => {
    if (isReadOnly && onBlockedAction) {
      onBlockedAction();
      return;
    }
    if (confirm('Deseja excluir este lançamento de ocorrência?')) {
      const updated = incidents.filter(i => i.id !== id);
      persistIncidents(updated);
      try {
        deleteDoc(doc(db, 'bonus_incidents', id));
      } catch {}
    }
  };

  // Toggle machine goal
  const handleToggleMachineGoal = (machine: string, shift: string) => {
    if (isReadOnly && onBlockedAction) {
      onBlockedAction();
      return;
    }
    const goalId = `${machine}_${shift}_${selectedCycle}`;
    const existing = machineGoals.find(g => g.id === goalId);
    let updated: MachineGoalConfig[];

    if (existing) {
      updated = machineGoals.map(g => g.id === goalId ? { ...g, goalMet: !g.goalMet, updatedAt: new Date().toISOString() } : g);
    } else {
      const newGoal: MachineGoalConfig = {
        id: goalId,
        machine,
        shift,
        cyclePeriod: selectedCycle,
        goalMet: false, // defaulted to not met if toggling from unset
        abatementPercent: 30,
        updatedAt: new Date().toISOString()
      };
      updated = [...machineGoals, newGoal];
    }
    persistMachineGoals(updated);
  };

  // PDF Generation for Individual Employee Statement
  const generateEmployeeStatementPDF = (item: typeof payrollData[0]) => {
    const doc = new jsPDF();
    const emp = item.employee;

    // Header bar
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('EXTRATO DE BONIFICAÇÃO E METAS DE PRODUÇÃO', 14, 17);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${selectedCycle}`, 160, 17);

    // Employee Data Box
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO COLABORADOR', 14, 36);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nome: ${emp.name}`, 14, 43);
    doc.text(`Matrícula: ${emp.registration}`, 14, 49);
    doc.text(`Cargo / Função: ${emp.role}`, 14, 55);
    doc.text(`Setor: ${emp.sector}`, 120, 43);
    doc.text(`Máquina / Turno: ${emp.machine || '—'} / ${emp.shift || '—'}`, 120, 49);
    doc.text(`Base de Bonificação: ${formatBRL(item.baseAmount)}`, 120, 55);

    // Incidents Table
    const incidentRows = item.personalIncidents.map(inc => [
      inc.date,
      inc.type.replace('_', ' ').toUpperCase(),
      inc.description + (inc.documentNumber ? ` (Doc: ${inc.documentNumber})` : ''),
      `${inc.penaltyRatePercent ?? 100}%`
    ]);

    if (item.perf && item.perf.discountPct > 0) {
      incidentRows.push([
        `${selectedCycle}-01`,
        'DESCONTO LINEAR HISTÓRICO',
        `Evolução de Equipe (Perda Média: ${item.perf.averageWasteIdx.toFixed(2)}% | Descarte: ${formatWeight(item.perf.totalWaste)})`,
        `-${item.perf.discountPct.toFixed(1)}% (- ${formatBRL(item.perfLossAmount)})`
      ]);
    }

    if (incidentRows.length === 0) {
      incidentRows.push(['—', 'REGULAR', 'Nenhuma ocorrência ou desconto registrado no período', '0%']);
    }

    autoTable(doc, {
      startY: 65,
      head: [['Data', 'Tipo de Ocorrência', 'Descrição / Documento', 'Desconto']],
      body: incidentRows,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8 }
    });

    // @ts-ignore
    const finalY = (doc as any).lastAutoTable?.finalY || 120;

    // Calculation summary
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, finalY + 10, 182, 38, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, finalY + 10, 182, 38, 3, 3, 'D');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('RESUMO DO CÁLCULO DE FECHAMENTO', 20, finalY + 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Valor Base Estipulado: ${formatBRL(item.baseAmount)}`, 20, finalY + 26);
    
    if (item.perf && item.perf.discountPct > 0) {
      doc.text(`Desconto Linear de Desempenho (BI): - ${formatBRL(item.perfLossAmount)} (${item.perf.discountPct.toFixed(1)}% desc. | Perda: ${item.perf.averageWasteIdx.toFixed(2)}%)`, 20, finalY + 31);
      doc.text(`Percentual de Desconto Total: ${item.totalDeductionPercent.toFixed(1)}% (- ${formatBRL(item.deductionAmount)})`, 20, finalY + 36);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Valor Final a Receber: ${formatBRL(item.finalAmount)}`, 20, finalY + 42);
    } else {
      doc.text(`Percentual de Desconto Total: ${item.totalDeductionPercent.toFixed(1)}% (- ${formatBRL(item.deductionAmount)})`, 20, finalY + 32);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Valor Final a Receber: ${formatBRL(item.finalAmount)}`, 20, finalY + 38);
    }

    // Signatures
    doc.line(20, finalY + 65, 80, finalY + 65);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Assinatura do Colaborador', 25, finalY + 70);

    doc.line(130, finalY + 65, 190, finalY + 65);
    doc.text('Gestão de Produção / RH', 135, finalY + 70);

    doc.save(`Extrato_Bonus_${emp.name.replace(/\s+/g, '_')}_${selectedCycle}.pdf`);
  };

  // Full Month Summary PDF
  const generateMonthSummaryPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 297, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO GERAL DE FECHAMENTO DE BÔNUS DE PRODUÇÃO', 14, 16);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período de Referência: ${selectedCycle} | Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 190, 16);

    const rows = filteredPayroll.map(d => [
      d.employee.registration,
      d.employee.name,
      d.employee.role,
      d.employee.sector,
      d.employee.machine || '—',
      d.employee.shift || '—',
      formatBRL(d.baseAmount),
      `${d.totalDeductionPercent.toFixed(1)}%`,
      `- ${formatBRL(d.deductionAmount)}`,
      formatBRL(d.finalAmount),
      d.status === 'full' ? 'Integral' : d.status === 'partial' ? 'Parcial' : 'Sem Bônus'
    ]);

    autoTable(doc, {
      startY: 32,
      head: [['Matrícula', 'Colaborador', 'Cargo', 'Setor', 'Máq', 'Turno', 'Base', 'Desc %', 'Desc R$', 'Final R$', 'Situação']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 7 }
    });

    doc.save(`Fechamento_Geral_Bonus_${selectedCycle}.pdf`);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Matrícula', 'Colaborador', 'Cargo', 'Setor', 'Máquina', 'Turno', 'Base R$', 'Desconto %', 'Desconto R$', 'Final R$', 'Situação', 'Motivos'];
    const rows = filteredPayroll.map(d => [
      `"${d.employee.registration}"`,
      `"${d.employee.name}"`,
      `"${d.employee.role}"`,
      `"${d.employee.sector}"`,
      `"${d.employee.machine || ''}"`,
      `"${d.employee.shift || ''}"`,
      d.baseAmount.toFixed(2),
      d.totalDeductionPercent.toFixed(1),
      d.deductionAmount.toFixed(2),
      d.finalAmount.toFixed(2),
      d.status === 'full' ? 'Integral' : d.status === 'partial' ? 'Parcial' : 'Sem Bônus',
      `"${d.reasonsText.replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Fechamento_Bonus_${selectedCycle}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ======================================================== */}
      {/* HEADER & TOP CONTROLS                                    */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-3 hover:bg-slate-100 rounded-2xl text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Voltar ao Quadro Geral"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700">
                RH & Operação
              </span>
              <span className="text-xs text-slate-400 font-semibold">• Módulo Integrado</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2 mt-0.5">
              <Award className="w-6 h-6 text-amber-500" />
              Gestão de Bônus de Produção
            </h2>
          </div>
        </div>

        {/* Cycle & Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Cycle Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 shadow-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ciclo:</span>
            <input
              type="month"
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
            />
          </div>

          {/* New Incident Button */}
          {canManage && (
            <button
              onClick={() => handleOpenAddIncident()}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Lançar Ocorrência</span>
            </button>
          )}

          {/* Export PDF Summary */}
          <button
            onClick={generateMonthSummaryPDF}
            className="px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Exportar Relatório PDF Consolidado"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Relatório</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Exportar CSV para Excel"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* NAVIGATION TABS BAR                                      */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl max-w-fit shadow-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Visão Geral & KPIs</span>
        </button>

        <button
          onClick={() => setActiveTab('teams_evolution')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'teams_evolution'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-blue-600" />
          <span>Evolução Histórica das Equipes</span>
        </button>

        <button
          onClick={() => setActiveTab('payroll')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'payroll'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Extrato de Colaboradores</span>
        </button>

        <button
          onClick={() => setActiveTab('incidents')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'incidents'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Apontamentos ({combinedIncidents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('machine_goals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'machine_goals'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Metas por Máquina</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: OVERVIEW & KPIS                                   */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Avaliados</div>
              <div className="text-3xl font-black text-slate-800">{stats.totalCount}</div>
              <div className="text-xs text-slate-500 font-semibold">{stats.fullBonusCount} com 100% da meta</div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Orçamento Previsto</div>
              <div className="text-3xl font-black text-slate-800">{formatBRL(stats.totalBaseBudget)}</div>
              <div className="text-xs text-slate-500 font-semibold">Teto máximo sem descontos</div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-600">Total de Descontos</div>
              <div className="text-3xl font-black text-amber-600">{formatBRL(stats.totalDeductions)}</div>
              <div className="text-xs text-amber-600 font-semibold">{stats.partialCount + stats.zeroCount} colaboradores com abatimento</div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Montante Final a Pagar</div>
              <div className="text-3xl font-black text-emerald-600">{formatBRL(stats.totalFinalPayout)}</div>
              <div className="text-xs text-slate-500 font-semibold">{stats.overallAttainment.toFixed(1)}% do orçamento atingido</div>
            </div>
          </div>

          {/* Breakdown Rows */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status distribution */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Distribuição de Elegibilidade
              </h3>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="text-slate-700">Bonificação Integral (100%)</span>
                    <span className="text-emerald-600">{stats.fullBonusCount} ({stats.totalCount > 0 ? ((stats.fullBonusCount/stats.totalCount)*100).toFixed(0) : 0}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${stats.totalCount > 0 ? (stats.fullBonusCount/stats.totalCount)*100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="text-slate-700">Desconto Parcial (&gt; 0% e &lt; 100%)</span>
                    <span className="text-amber-600">{stats.partialCount} ({stats.totalCount > 0 ? ((stats.partialCount/stats.totalCount)*100).toFixed(0) : 0}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${stats.totalCount > 0 ? (stats.partialCount/stats.totalCount)*100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="text-slate-700">Perda Total (100% de Desconto)</span>
                    <span className="text-rose-600">{stats.zeroCount} ({stats.totalCount > 0 ? ((stats.zeroCount/stats.totalCount)*100).toFixed(0) : 0}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${stats.totalCount > 0 ? (stats.zeroCount/stats.totalCount)*100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action & Information Box */}
            <div className="bg-gradient-to-br from-amber-50 via-white to-amber-50/30 border border-amber-200/60 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-amber-800 font-black text-sm">
                  <Info className="w-5 h-5 text-amber-600" />
                  Regras Gerais da Bonificação Operacional
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  O bônus de produção premia a assiduidade e o cumprimento das metas por máquina. Apresentação de <strong>atestados médicos</strong> ou <strong>faltas injustificadas</strong> acarreta desconto integral (100%) conforme diretriz corporativa. Metas de máquina não atingidas abatem percentual da equipe daquela linha/turno.
                </p>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('payroll')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Ver Extrato Completo
                </button>
                <button
                  onClick={() => setActiveTab('incidents')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Gerenciar Ocorrências
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: EVOLUÇÃO HISTÓRICA DAS EQUIPES (EXATA DO BI)       */}
      {/* ======================================================== */}
      {activeTab === 'teams_evolution' && (
        <motion.div 
          key="teams_evolution" 
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
                            O bônus individual é calculado com base na <strong>Meta Mensal de R$ {metaMensalBonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> por operador, aplicando o modelo de <strong>Desconto Linear Proporcional</strong> conforme o coeficiente de perda de cada colaborador:
                          </p>
                          <div className="space-y-1.5">
                            <div className="p-2 bg-emerald-950/60 border border-emerald-500/30 rounded-xl">
                              <span className="font-bold text-emerald-400 block text-[10.5px]">Melhor Perda (Mínimo Desperdício):</span>
                              <span className="text-slate-300 text-[9.5px]">Aplica <strong>0% de desconto</strong>. O operador recebe 100% da meta: <strong>R$ {metaMensalBonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>.</span>
                            </div>
                            <div className="p-2 bg-rose-950/60 border border-rose-500/30 rounded-xl">
                              <span className="font-bold text-rose-400 block text-[10.5px]">Pior Perda (Máximo Desperdício):</span>
                              <span className="text-slate-300 text-[9.5px]">Aplica <strong>100% de desconto</strong>, resultando em <strong>R$ 0,00</strong>.</span>
                            </div>
                            <div className="p-2 bg-blue-950/60 border border-blue-500/30 rounded-xl">
                              <span className="font-bold text-blue-400 block text-[10.5px]">Desempenho Intermediário:</span>
                              <span className="text-slate-300 text-[9.5px]">O desconto varia linearmente entre 0% e 100% conforme a posição relativa entre a melhor e pior perda.</span>
                            </div>
                          </div>
                          <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-800 flex justify-between font-mono">
                            <span>Fórmula:</span>
                            <span className="text-slate-200">Bônus = R$ {metaMensalBonus} × (1 - Desconto% / 100)</span>
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
                        onChange={e => {
                          const val = Number(e.target.value) || 0;
                          setMetaMensalBonus(val);
                          try {
                            localStorage.setItem('manupackaging_bonus_base_meta', String(val));
                          } catch {}
                        }} 
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
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 w-full sm:w-52"
                  />
                </div>
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

                      const discountPct = wasteRange === 0 ? 0 : ((op.averageWasteIdx - minWaste) / wasteRange) * 100;
                      const bonusAmt = metaMensalBonus * (1 - (discountPct / 100));
                      const lossAmt = metaMensalBonus * (discountPct / 100);

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
                              if (discountPct === 0) {
                                return <span className="text-emerald-600 font-black bg-emerald-50 px-2 py-1 rounded-lg">0,0% (Melhor)</span>;
                              }
                              if (discountPct === 100) {
                                return (
                                  <div className="flex flex-col items-end">
                                    <span className="text-rose-500 font-black bg-rose-50 px-2 py-1 rounded-lg">100,0% (Máx.)</span>
                                    <span className="text-[9px] text-rose-500 font-bold mt-0.5">- {formatBRL(lossAmt)}</span>
                                  </div>
                                );
                              }
                              return (
                                <div className="flex flex-col items-end">
                                  <span className="text-slate-600 font-bold">{discountPct.toFixed(1).replace('.', ',')}%</span>
                                  <span className="text-[9px] text-rose-500 font-bold mt-0.5">- {formatBRL(lossAmt)}</span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {(() => {
                              if (discountPct === 0) {
                                return (
                                  <div className="flex justify-end items-center gap-1">
                                    <span className="text-emerald-600 font-black text-xs flex flex-col items-end bg-emerald-50 px-2.5 py-1 rounded-xl">
                                      <span className="flex items-center gap-0.5"><Award size={12} className="text-amber-500 fill-amber-500 inline mr-0.5" /> {formatBRL(bonusAmt)}</span>
                                      <span className="text-[8px] text-emerald-500 font-bold block mt-0.5">Sem desconto (Meta R$ {metaMensalBonus})</span>
                                    </span>
                                  </div>
                                );
                              }
                              if (discountPct === 100) {
                                return (
                                  <div className="flex flex-col items-end">
                                    <span className="text-slate-400 font-normal">R$ 0,00</span>
                                    <span className="text-[8px] text-rose-400 font-bold block mt-0.5">100% desconto (Pior perda)</span>
                                  </div>
                                );
                              }
                              return (
                                <div className="flex flex-col items-end">
                                  <span className="text-slate-700 font-extrabold text-xs">{formatBRL(bonusAmt)}</span>
                                  <span className="text-[8px] text-slate-400 font-semibold">Meta: {formatBRL(metaMensalBonus)}</span>
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

      {/* ======================================================== */}
      {/* TAB 2: PAYROLL & COLLABORATORS TABLE                     */}
      {/* ======================================================== */}
      {activeTab === 'payroll' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Pesquisar por colaborador, matrícula ou função..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
              >
                <option value="all">Todos Setores</option>
                <option value="Extrusão">Extrusão</option>
                <option value="Fita Adesiva">Fita Adesiva</option>
                <option value="Corte de Fita">Corte de Fita</option>
                <option value="Reciclagem">Reciclagem</option>
              </select>

              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
              >
                <option value="all">Todos Turnos</option>
                <option value="Diurno 1">Diurno 1</option>
                <option value="Noturno 1">Noturno 1</option>
                <option value="Diurno 2">Diurno 2</option>
                <option value="Noturno 2">Noturno 2</option>
                <option value="Comercial">Comercial</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
              >
                <option value="all">Todas Situações</option>
                <option value="full">100% Integral</option>
                <option value="partial">Com Desconto</option>
                <option value="zero">Sem Bônus</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4">Matrícula</th>
                    <th className="py-3 px-4">Função</th>
                    <th className="py-3 px-4">Alocação</th>
                    <th className="py-3 px-4 text-right">Meta Base</th>
                    <th className="py-3 px-4 text-center">Desconto</th>
                    <th className="py-3 px-4 text-right">Valor Final</th>
                    <th className="py-3 px-4 text-center">Situação</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayroll.length > 0 ? (
                    filteredPayroll.map(item => {
                      const emp = item.employee;
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {emp.name}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-500">
                            {emp.registration}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {emp.role}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <span className="font-semibold text-slate-700">{emp.sector}</span>
                            <span className="text-slate-400 text-[10px] block">{emp.machine || '—'} • {emp.shift || '—'}</span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-800">
                            {formatBRL(item.baseAmount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {item.totalDeductionPercent > 0 ? (
                              <div className="flex flex-col items-center">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700">
                                  -{item.totalDeductionPercent.toFixed(0)}% ({formatBRL(item.deductionAmount)})
                                </span>
                                {item.perf && item.perf.discountPct > 0 && (
                                  <span className="text-[9px] text-rose-500 font-bold mt-0.5 whitespace-nowrap" title={`Perda Média: ${item.perf.averageWasteIdx.toFixed(2)}% | Descarte: ${formatWeight(item.perf.totalWaste)}`}>
                                    Perda Linear: -{formatBRL(item.perfLossAmount)} ({item.perf.discountPct.toFixed(1)}%)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-semibold">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-sm text-slate-900">
                            {formatBRL(item.finalAmount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {item.status === 'full' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700">
                                Integral
                              </span>
                            )}
                            {item.status === 'partial' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700">
                                Parcial
                              </span>
                            )}
                            {item.status === 'zero' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700">
                                Zerado
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => generateEmployeeStatementPDF(item)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              title="Gerar Extrato Individual PDF"
                            >
                              PDF
                            </button>
                            {canManage && (
                              <button
                                onClick={() => handleOpenAddIncident(emp)}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                title="Lançar Ocorrência para este Colaborador"
                              >
                                + Ocorrência
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-xs text-slate-400 font-semibold">
                        Nenhum colaborador encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: INCIDENTS / OCORRÊNCIAS                           */}
      {/* ======================================================== */}
      {activeTab === 'incidents' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-800 tracking-tight">
              Histórico de Apontamentos do Ciclo ({selectedCycle})
            </h3>
            {canManage && (
              <button
                onClick={() => handleOpenAddIncident()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Apontamento</span>
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Alvo / Colaborador</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Descrição / Justificativa</th>
                    <th className="py-3 px-4">Doc / Atestado</th>
                    <th className="py-3 px-4 text-center">Desconto</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {combinedIncidents.length > 0 ? (
                    combinedIncidents.map(inc => {
                      const isAuto = (inc as any).isAutomatic;
                      return (
                        <tr key={inc.id} className={`hover:bg-slate-50/80 transition-colors ${isAuto ? 'bg-blue-50/20' : ''}`}>
                          <td className="py-3 px-4 font-semibold text-slate-600">
                            {inc.date}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-800 block">{inc.employeeName}</span>
                            {inc.registration && (
                              <span className="text-[10px] text-slate-400 font-mono">Mat. {inc.registration}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {isAuto ? (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-100 text-blue-800 border border-blue-200">
                                Perda Linear BI
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                                {inc.type.replace('_', ' ')}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {inc.description}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {isAuto ? (
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Automático</span>
                            ) : (
                              inc.documentNumber ? `Nº ${inc.documentNumber}` : '—'
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-rose-600">
                            -{inc.penaltyRatePercent ?? 100}%
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isAuto ? (
                              <span className="text-[10px] text-slate-400 font-bold italic">Integrado BI</span>
                            ) : (
                              canManage && (
                                <button
                                  onClick={() => handleDeleteIncident(inc.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                  title="Excluir Ocorrência"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-slate-400 font-semibold">
                        Nenhum apontamento registrado para o ciclo {selectedCycle}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: METAS POR MÁQUINA                                 */}
      {/* ======================================================== */}
      {activeTab === 'machine_goals' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight">
                Metas Operacionais por Máquina & Turno ({selectedCycle})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                O cumprimento das metas da máquina impacta diretamente a bonificação da equipe alocada na linha.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEFAULT_MACHINES.map(mach => (
              <div key={mach} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-800 text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    {mach}
                  </h4>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Ciclo {selectedCycle}</span>
                </div>

                <div className="space-y-2.5">
                  {['Diurno 1', 'Noturno 1', 'Diurno 2', 'Noturno 2'].map(shift => {
                    const goalId = `${mach}_${shift}_${selectedCycle}`;
                    const config = machineGoals.find(g => g.id === goalId);
                    const isMet = config ? config.goalMet : true; // Default is met unless toggled

                    return (
                      <div key={shift} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-700">{shift}</span>
                        <button
                          onClick={() => handleToggleMachineGoal(mach, shift)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                            isMet
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                          }`}
                        >
                          {isMet ? 'Meta Cumprida' : 'Não Atingida (-30%)'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: REGISTRAR OCORRÊNCIA / APONTAMENTO                 */}
      {/* ======================================================== */}
      {isIncidentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">
                  Lançar Ocorrência / Apontamento
                </h3>
                <p className="text-xs text-slate-500 font-semibold">Ciclo: {selectedCycle}</p>
              </div>
              <button
                onClick={() => setIsIncidentModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Mode switch: individual vs machine */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Escopo da Ocorrência</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormMode('individual')}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      formMode === 'individual'
                        ? 'border-amber-500 bg-amber-50 text-amber-800'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Individual (Colaborador)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormMode('machine')}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      formMode === 'machine'
                        ? 'border-amber-500 bg-amber-50 text-amber-800'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Por Máquina / Turno
                  </button>
                </div>
              </div>

              {formMode === 'individual' ? (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Colaborador</label>
                  <select
                    value={targetEmployeeId}
                    onChange={(e) => setTargetEmployeeId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {activeEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} (Mat. {emp.registration}) • {emp.sector}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Máquina Alvo</label>
                    <select
                      value={targetMachine}
                      onChange={(e) => setTargetMachine(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold outline-none"
                    >
                      {DEFAULT_MACHINES.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Turno Alvo</label>
                    <select
                      value={targetShift}
                      onChange={(e) => setTargetShift(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold outline-none"
                    >
                      {DEFAULT_SHIFTS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Type */}
              {formMode === 'individual' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tipo de Ocorrência</label>
                  <select
                    value={incidentType}
                    onChange={(e) => {
                      const t = e.target.value as BonusIncidentType;
                      setIncidentType(t);
                      if (t === 'atestado' || t === 'falta_injustificada' || t === 'falta_justificada') {
                        setCustomPenaltyPercent(100);
                      } else if (t === 'atraso_injustificado') {
                        setCustomPenaltyPercent(20);
                      } else if (t === 'atraso_justificado') {
                        setCustomPenaltyPercent(5);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold outline-none"
                  >
                    <option value="atestado">Atestado Médico (-100%)</option>
                    <option value="falta_injustificada">Falta Injustificada (-100%)</option>
                    <option value="falta_justificada">Falta Justificada (-100%)</option>
                    <option value="atraso_injustificado">Atraso Injustificado (-20%)</option>
                    <option value="atraso_justificado">Atraso Justificado (-5%)</option>
                  </select>
                </div>
              )}

              {/* Date & Penalty % */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Data da Ocorrência</label>
                  <input
                    type="date"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Desconto Aplicado (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={customPenaltyPercent}
                    onChange={(e) => setCustomPenaltyPercent(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold outline-none"
                  />
                </div>
              </div>

              {/* Document number / CID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nº Doc / Protocolo / CID</label>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="Ex: CID Z76.0 ou Nº 1042"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Instituição / Médico</label>
                  <input
                    type="text"
                    value={documentDetails}
                    onChange={(e) => setDocumentDetails(e.target.value)}
                    placeholder="Ex: Pronto Atendimento / Dr. Silva"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Observações / Motivo</label>
                <textarea
                  value={incidentDescription}
                  onChange={(e) => setIncidentDescription(e.target.value)}
                  placeholder="Descreva detalhes relevantes sobre este apontamento..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsIncidentModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveIncident}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Salvar Lançamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
