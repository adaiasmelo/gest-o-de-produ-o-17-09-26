import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, AlertTriangle, CheckCircle2, XCircle, Clock, FileText, 
  Calendar, Filter, Search, Plus, Trash2, ArrowLeft,
  ShieldAlert, FileCheck, Users, Printer, ChevronDown, 
  X, Info, Layers, AlertOctagon, HelpCircle, FileSpreadsheet,
  SlidersHorizontal, HardHat, Briefcase, Palmtree, Download,
  ExternalLink, Check, DollarSign, Activity, Zap,
  Timer, Gauge, Scale, Sparkles, CheckSquare, Wrench, PlayCircle, LogOut, MonitorPlay
} from 'lucide-react';
import { Employee, RibbonCuttingEntry } from '../types';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BiAnalyticsView } from './BiAnalyticsView';
import { BonusRulesPresentationModal } from './BonusRulesPresentationModal';
import { 
  parseStopsFromField, 
  evaluateCleaningStoppages, 
  isCleaningStoppageReason,
  calculateTapeLostM2,
  evaluateTapeProductivityAndLosses
} from '../utils/bonusRuleHelpers';

export type BonusIncidentType = 
  | 'atestado' 
  | 'falta_injustificada' 
  | 'falta_justificada' 
  | 'advertencia_escrita'
  | 'atraso_10min'
  | 'hora_extra_nao_autorizada'
  | 'atraso_injustificado' 
  | 'atraso_justificado' 
  | 'saida_mais_cedo'
  | 'saida_nao_comunicada'
  | 'uso_celular'
  | 'uso_celular_reincidente'
  | 'fumar_trabalho'
  | 'fumar_reincidente'
  | 'nao_uso_epi'
  | 'nao_uso_epi_reincidente'
  | 'devolucao_externa'
  | 'reclamacao_interna'
  | 'mau_preenchimento'
  | 'materia_prima_molhada'
  | 'parada_limpeza_nao_realizada'
  | 'limpeza_excessiva'
  | 'partida_demorada'
  | 'meta_maquina_nao_atingida'
  | 'informacao_falsa'
  | 'outra';

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
  notifiedManager?: boolean; // Se comunicou o gestor direto ou saiu sem avisar
  targetMachine?: string; // Se a ocorrência foi por máquina (ex: 'Cast 1', 'Cast 2')
  targetShift?: string; // Se for para turno específico (ex: 'Diurno', 'Noturno' ou 'Todos')
  penaltyRatePercent?: number; // Desconto imposto (ex: 10% para saída comunicada, 35% sem avisar, 100% atestado)
  registeredBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MachineGoalConfig {
  id: string; // ex: "Cast 1_Diurno_2026-10" ou "Cast 1_2026-10"
  machine: string; // "Cast 1", "Cast 2", "Erema 1", "Ghezzi", "Lintech", "Wutec"
  shift: string; // "Todos", "Diurno", "Noturno", "Comercial"
  cyclePeriod: string;
  targetKgPerHour?: number; // Quilo-hora nominal configurado (ex: 1000 kg/h)
  shiftHours?: number; // Duração do turno de referência (padrão 12h)
  targetShiftNetKg?: number; // Meta calculada em 12 horas (ex: 1000 * 12 = 12.000 kg)
  materialType?: string; // Material em produção (ex: "LC3 (1000 kg/h)", "LC2 (900 kg/h)", "ATX (850 kg/h)")
  maxCleaningMin?: number; // Tolerância máxima de parada de limpeza (padrão 30 min)
  maxStartupMin?: number; // Tolerância máxima de partida de máquina (padrão 45 min)
  maxLossPercent?: number; // Tolerância máxima de perdas (padrão 3.5%)
  goalMet: boolean; // Se a meta de produção do turno foi cumprida
  abatementPercent: number; // Percentual a abater da equipe (padrão 30%)
  notes?: string;
  updatedAt?: string;
}

interface ProductionBonusManagerProps {
  employees: Employee[];
  productionData?: any[];
  ribbonEntries?: RibbonCuttingEntry[];
  goals?: Record<string, number>;
  onClose: () => void;
  canManage: boolean;
  isReadOnly?: boolean;
  onBlockedAction?: () => void;
  loggedUser?: { username?: string; name?: string; role?: string } | null;
  dashboardMonth?: string;
  onMonthChange?: (month: string) => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const DEFAULT_MACHINES = ["Cast 1", "Cast 2", "Erema 1", "Ghezzi", "Lintech", "Wutec"];
export const DEFAULT_SHIFTS = ["Todos", "Diurno", "Noturno", "Comercial", "Diurno 1", "Noturno 1", "Diurno 2", "Noturno 2"];

export const DEFAULT_MACHINE_TARGETS: Record<string, { 
  kgPerHour: number; 
  material: string; 
  shiftHours: number;
  maxCleaningMin: number; 
  maxStartupMin: number; 
  maxLossPercent: number;
  recommendedAbatement: number;
}> = {
  'Cast 1': { kgPerHour: 1000, material: 'Stretch LC3 (1.000 kg/h)', shiftHours: 12, maxCleaningMin: 30, maxStartupMin: 45, maxLossPercent: 3.5, recommendedAbatement: 30 },
  'Cast 2': { kgPerHour: 850, material: 'Stretch LC2 (850 kg/h)', shiftHours: 12, maxCleaningMin: 30, maxStartupMin: 45, maxLossPercent: 3.5, recommendedAbatement: 30 },
  'Erema 1': { kgPerHour: 350, material: 'Recuperado Erema (350 kg/h)', shiftHours: 12, maxCleaningMin: 30, maxStartupMin: 60, maxLossPercent: 4.0, recommendedAbatement: 25 },
  'Ghezzi': { kgPerHour: 500, material: 'Fita Stretch Comercial (500 kg/h)', shiftHours: 12, maxCleaningMin: 30, maxStartupMin: 30, maxLossPercent: 2.5, recommendedAbatement: 30 },
  'Lintech': { kgPerHour: 450, material: 'Fita Lintech Comercial (450 kg/h)', shiftHours: 12, maxCleaningMin: 30, maxStartupMin: 30, maxLossPercent: 2.5, recommendedAbatement: 30 },
  'Wutec': { kgPerHour: 400, material: 'Fita Wutec Comercial (400 kg/h)', shiftHours: 12, maxCleaningMin: 30, maxStartupMin: 30, maxLossPercent: 2.5, recommendedAbatement: 30 }
};

export const MATERIAL_PRESETS = [
  { name: 'Stretch LC3 (Alta Velocidade)', defaultKgH: 1000, machine: 'Cast 1' },
  { name: 'Stretch LC2 (Padrão)', defaultKgH: 900, machine: 'Cast 1 / Cast 2' },
  { name: 'Stretch ATX (Especial)', defaultKgH: 850, machine: 'Cast 2' },
  { name: 'Stretch ATX Plus', defaultKgH: 800, machine: 'Cast 2' },
  { name: 'Recuperado Erema', defaultKgH: 350, machine: 'Erema 1' },
  { name: 'Corte de Fita Bobina Grossa', defaultKgH: 500, machine: 'Cortadeiras' },
  { name: 'Corte de Fita Manual', defaultKgH: 420, machine: 'Cortadeiras' }
];

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
  ribbonEntries = [],
  goals = {},
  onClose,
  canManage = true,
  isReadOnly = false,
  onBlockedAction,
  loggedUser,
  dashboardMonth,
  onMonthChange
}) => {
  // Navigation tabs: 'overview' | 'teams_evolution' | 'payroll' | 'incidents'
  const [activeTab, setActiveTab] = useState<'overview' | 'teams_evolution' | 'payroll' | 'incidents'>('overview');

  // Cycle period state (synced with dashboardMonth from settings)
  const [selectedCycle, setSelectedCycle] = useState<string>(() => {
    return dashboardMonth || localStorage.getItem('manupackaging_bonus_cycle') || '2026-10';
  });

  useEffect(() => {
    if (dashboardMonth && dashboardMonth !== selectedCycle) {
      setSelectedCycle(dashboardMonth);
    }
  }, [dashboardMonth]);

  useEffect(() => {
    localStorage.setItem('manupackaging_bonus_cycle', selectedCycle);
  }, [selectedCycle]);

  const handleCycleChange = (newCycle: string) => {
    setSelectedCycle(newCycle);
    onMonthChange?.(newCycle);
  };

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
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);

  // Form State for Incident
  const [formMode, setFormMode] = useState<'individual' | 'machine'>('individual');
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [incidentType, setIncidentType] = useState<BonusIncidentType>('atestado');
  const [incidentDate, setIncidentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [incidentDescription, setIncidentDescription] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [documentDetails, setDocumentDetails] = useState('');
  const [isJustified, setIsJustified] = useState(true);
  const [notifiedManager, setNotifiedManager] = useState<boolean>(true);
  const [targetMachine, setTargetMachine] = useState('Cast 1');
  const [targetShift, setTargetShift] = useState('Todos');
  const [customPenaltyPercent, setCustomPenaltyPercent] = useState<number>(100);

  // Interactive 12-Hour Shift Simulator State (kg/h, paradas e perdas)
  const [simMachine, setSimMachine] = useState<string>('Cast 1');
  const [simMaterial, setSimMaterial] = useState<string>('Stretch LC3 (1.000 kg/h)');
  const [simKgPerHour, setSimKgPerHour] = useState<number>(1000);
  const [simShiftHours, setSimShiftHours] = useState<number>(12);
  const [simActualNetKg, setSimActualNetKg] = useState<number>(11600);
  const [simLossKg, setSimLossKg] = useState<number>(340);
  const [simCleaningMin, setSimCleaningMin] = useState<number>(25);
  const [simStartupMin, setSimStartupMin] = useState<number>(35);
  const [simEarlyDeparture, setSimEarlyDeparture] = useState<'none' | 'communicated' | 'unnotified'>('none');

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

  // Shift production and stoppage audit per machine and shift for the selected cycle
  const shiftAudits = useMemo(() => {
    const map: Record<string, {
      machine: string;
      shift: string;
      entriesCount: number;
      totalNet: number;
      avgNetPerShift: number;
      effectiveKgPerHour: number;
      totalLoss: number;
      lossPercent: number;
      cleaningMin: number;
      cleaningOver30Count: number;
      maxCleaningRecorded: number;
      startupMin: number;
      startupOver45Count: number;
      otherStopsMin: number;
    }> = {};

    processedDataFiltered.forEach(e => {
      const m = e.date ? e.date.substring(0, 7) : '';
      if (m !== selectedCycle) return;
      if (!e.machine) return;

      const mach = e.machine;
      const sRaw = (e.shift || '').trim().toUpperCase();
      let shiftKey = 'Diurno';
      if (sRaw.includes('NOTURNO') || sRaw.includes('NOITE') || sRaw === 'N1' || sRaw === 'N2') {
        shiftKey = 'Noturno';
      } else if (sRaw.includes('COMERCIAL')) {
        shiftKey = 'Comercial';
      } else if (sRaw.includes('DIURNO') || sRaw.includes('DIA') || sRaw === 'D1' || sRaw === 'D2') {
        shiftKey = 'Diurno';
      } else {
        shiftKey = e.shift || 'Diurno';
      }

      const key = `${mach}_${shiftKey}`;
      if (!map[key]) {
        map[key] = {
          machine: mach,
          shift: shiftKey,
          entriesCount: 0,
          totalNet: 0,
          avgNetPerShift: 0,
          effectiveKgPerHour: 0,
          totalLoss: 0,
          lossPercent: 0,
          cleaningMin: 0,
          cleaningOver30Count: 0,
          maxCleaningRecorded: 0,
          startupMin: 0,
          startupOver45Count: 0,
          otherStopsMin: 0
        };
      }

      map[key].entriesCount += 1;
      map[key].totalNet += (e.netWeight || 0);
      // Regra ECOA: O ECOA terá perda de bônus somente se ultrapassar 8% no dia.
      // Se não ultrapassar 8% da produção do dia, não haverá perda nenhuma e não gerará perda percentual.
      const dayProd = Number(e.grossWeight) || Number(e.netWeight) || 0;
      const rawEcoA = Number(e.ecoA) || 0;
      const ecoAPct = dayProd > 0 ? (rawEcoA / dayProd) * 100 : 0;
      const evaluatedEcoA = ecoAPct > 8 ? rawEcoA : 0;

      // Regra: ECOBM (Manutenção) é isento e NÃO conta como refugo do operador na meta!
      const evaluatedLoss = (Number(e.borraTotal) || 0) + evaluatedEcoA + (Number(e.ecoBP) || 0);
      map[key].totalLoss += evaluatedLoss;

      // Avaliação de Paradas:
      // A ÚNICA parada que contabiliza para perda de meta é limpeza de máquina/matriz.
      // O limite de 30 min NÃO é a soma; é 30 min por parada individual.
      // Paradas de manutenção não contabilizam perda de meta.
      const procStops = parseStopsFromField(e.processoMotivo, Number(e.processoMin) || 0);
      const outStops = parseStopsFromField(e.outrosMotivo, Number(e.outrosMin) || 0);
      const allShiftStops = [...procStops, ...outStops];

      allShiftStops.forEach(stop => {
        const minutes = stop.durationMinutes;
        if (!minutes || minutes <= 0) return;
        const isCleaning = isCleaningStoppageReason(stop.motivo);
        const text = (stop.motivo || '').toLowerCase();
        const isStartup = text.includes('partida') || text.includes('start') || text.includes('aquec') || text.includes('inicializ');

        if (isCleaning) {
          map[key].cleaningMin += minutes;
          if (minutes > map[key].maxCleaningRecorded) {
            map[key].maxCleaningRecorded = minutes;
          }
          // Regra: Não pode exceder 30 minutos POR PARADA individual!
          if (minutes > 30) {
            map[key].cleaningOver30Count += 1;
          }
        } else if (isStartup) {
          map[key].startupMin += minutes;
          if (minutes > 45) {
            map[key].startupOver45Count += 1;
          }
        } else {
          map[key].otherStopsMin += minutes;
        }
      });
    });

    // Compute averages
    Object.keys(map).forEach(k => {
      const item = map[k];
      item.avgNetPerShift = item.entriesCount > 0 ? item.totalNet / item.entriesCount : 0;
      item.effectiveKgPerHour = item.entriesCount > 0 ? item.totalNet / (item.entriesCount * 12) : 0;
      const totalVolume = item.totalNet + item.totalLoss;
      item.lossPercent = totalVolume > 0 ? (item.totalLoss / totalVolume) * 100 : 0;
    });

    return map;
  }, [processedDataFiltered, selectedCycle]);

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
      if (m !== selectedCycle) return;
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
      // Regra: ECOBM (Manutenção) é isento e NÃO conta como refugo do operador na meta!
      const entryEcoB = e.ecoBP || 0; // apenas ECOBP de produção
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
  }, [processedDataFiltered, selectedCycle]);

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

  // Helper to match an employee with their operator metrics strictly
  const findOperatorPerformance = (empName?: string, reg?: string) => {
    if (!empName) return null;
    const normEmp = empName.trim().toLowerCase();

    const found = operatorMetrics.find(o => {
      const normOp = o.operator.trim().toLowerCase();
      return normOp === normEmp;
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

  // Cycle incidents and machine goals (filtered strictly by selected reference month)
  const cycleIncidents = useMemo(() => {
    return incidents.filter(i => (i.cyclePeriod === selectedCycle) || (i.date && i.date.startsWith(selectedCycle)));
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
        i => i.employeeId === emp.id || 
             (i.registration && i.registration === emp.registration) ||
             (i.employeeName && emp.name && i.employeeName.toLowerCase().trim() === emp.name.toLowerCase().trim())
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
        const matchesMachine = !g.machine || g.machine === emp.machine;
        const sRaw = (emp.shift || '').toUpperCase();
        let empNormShift = emp.shift || '';
        if (sRaw.includes('NOTURNO') || sRaw.includes('NOITE') || sRaw === 'N1' || sRaw === 'N2') empNormShift = 'Noturno';
        else if (sRaw.includes('DIURNO') || sRaw.includes('DIA') || sRaw === 'D1' || sRaw === 'D2') empNormShift = 'Diurno';
        else if (sRaw.includes('COMERCIAL')) empNormShift = 'Comercial';

        const matchesShift = g.shift === 'Todos' || g.shift === emp.shift || g.shift === empNormShift;
        return matchesMachine && matchesShift;
      });

      // Total deduction calculation
      let totalDeductionPercent = 0;
      const reasonsList: string[] = [];

      personalIncidents.forEach(inc => {
        let pct = inc.penaltyRatePercent ?? 100;
        let label = inc.type.replace(/_/g, ' ').toUpperCase();

        if (inc.type === 'informacao_falsa') {
          pct = inc.penaltyRatePercent !== undefined ? inc.penaltyRatePercent : 100;
          label = 'INFORMAÇÃO FALSA / FRAUDE DE APONTAMENTO';
        } else if (inc.type === 'atestado' || inc.type === 'falta_injustificada' || inc.type === 'falta_justificada') {
          pct = inc.penaltyRatePercent !== undefined ? inc.penaltyRatePercent : 100;
        } else if (inc.type === 'atraso_injustificado') {
          pct = inc.penaltyRatePercent !== undefined ? inc.penaltyRatePercent : 20;
        } else if (inc.type === 'atraso_justificado') {
          pct = inc.penaltyRatePercent !== undefined ? inc.penaltyRatePercent : 5;
        } else if (inc.type === 'saida_mais_cedo') {
          pct = inc.penaltyRatePercent !== undefined ? inc.penaltyRatePercent : 10;
          label = 'SAÍDA MAIS CEDO (COMUNICADA)';
        } else if (inc.type === 'saida_nao_comunicada') {
          pct = inc.penaltyRatePercent !== undefined ? inc.penaltyRatePercent : 35;
          label = 'SAÍDA SEM AVISAR GESTOR';
        } else if (inc.type === 'limpeza_excessiva') {
          pct = inc.penaltyRatePercent !== undefined ? inc.penaltyRatePercent : 15;
          label = 'LIMPEZA EXCEDEU 30 MIN';
        } else if (inc.type === 'partida_demorada') {
          pct = inc.penaltyRatePercent !== undefined ? inc.penaltyRatePercent : 15;
          label = 'PARTIDA DEMORADA';
        }

        totalDeductionPercent += pct;
        reasonsList.push(`${label} (${pct}%)`);
      });

      machineIncidents.forEach(inc => {
        const pct = inc.penaltyRatePercent ?? 30;
        totalDeductionPercent += pct;
        reasonsList.push(`Meta Máquina Não Atingida [${inc.targetMachine}] (${pct}%)`);
      });

      unfulfilledGoals.forEach(g => {
        const pct = g.abatementPercent ?? 30;
        totalDeductionPercent += pct;
        const targetKgH = g.targetKgPerHour ? ` [${g.targetKgPerHour} kg/h]` : '';
        reasonsList.push(`Meta Não Batida (${g.machine} - ${g.shift}${targetKgH}) (${pct}%)`);
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
    setNotifiedManager(true);
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
        description: incidentDescription || `Ocorrência de ${incidentType.replace(/_/g, ' ')}`,
        documentNumber: documentNumber || undefined,
        documentDetails: documentDetails || undefined,
        isJustified,
        notifiedManager,
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

  // Update machine goal configuration (kg/h, shift hours, tolerances, status)
  const handleUpdateMachineGoal = (machine: string, shift: string, updates: Partial<MachineGoalConfig>) => {
    if (isReadOnly && onBlockedAction) {
      onBlockedAction();
      return;
    }
    const goalId = `${machine}_${shift}_${selectedCycle}`;
    const existing = machineGoals.find(g => g.id === goalId);
    let updated: MachineGoalConfig[];

    const defaultKgH = DEFAULT_MACHINE_TARGETS[machine]?.kgPerHour || 1000;
    const defaultMat = DEFAULT_MACHINE_TARGETS[machine]?.material || 'Stretch Padrão';
    const defaultAbatement = DEFAULT_MACHINE_TARGETS[machine]?.recommendedAbatement || 30;

    if (existing) {
      updated = machineGoals.map(g => g.id === goalId ? { 
        ...g, 
        ...updates, 
        targetShiftNetKg: (updates.targetKgPerHour || g.targetKgPerHour || defaultKgH) * (updates.shiftHours || g.shiftHours || 12),
        updatedAt: new Date().toISOString() 
      } : g);
    } else {
      const targetKgPerHour = updates.targetKgPerHour !== undefined ? updates.targetKgPerHour : defaultKgH;
      const shiftHours = updates.shiftHours !== undefined ? updates.shiftHours : 12;
      const newGoal: MachineGoalConfig = {
        id: goalId,
        machine,
        shift,
        cyclePeriod: selectedCycle,
        targetKgPerHour,
        shiftHours,
        targetShiftNetKg: targetKgPerHour * shiftHours,
        materialType: updates.materialType || defaultMat,
        maxCleaningMin: 30,
        maxStartupMin: 45,
        maxLossPercent: 3.5,
        goalMet: updates.goalMet !== undefined ? updates.goalMet : true,
        abatementPercent: updates.abatementPercent !== undefined ? updates.abatementPercent : defaultAbatement,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      updated = [...machineGoals, newGoal];
    }
    persistMachineGoals(updated);
  };

  // Toggle machine goal met status
  const handleToggleMachineGoal = (machine: string, shift: string) => {
    const goalId = `${machine}_${shift}_${selectedCycle}`;
    const existing = machineGoals.find(g => g.id === goalId);
    const currentlyMet = existing ? existing.goalMet : true;
    handleUpdateMachineGoal(machine, shift, { goalMet: !currentlyMet });
  };

  // PDF Generation for Individual Employee Statement with Daily kg/h Breakdown
  const generateEmployeeStatementPDF = (item: typeof payrollData[0]) => {
    const doc = new jsPDF();
    const emp = item.employee;

    // Header bar
    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 210, 26, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('EXTRATO INDIVIDUAL DE BONIFICAÇÃO E METAS', 14, 17);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período de Referência: ${selectedCycle}`, 150, 17);

    // Employee Data Box
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO COLABORADOR', 14, 34);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nome: ${emp.name}`, 14, 41);
    doc.text(`Matrícula: ${emp.registration}`, 14, 46);
    doc.text(`Cargo / Função: ${emp.role}`, 14, 51);
    doc.text(`Setor: ${emp.sector}`, 120, 41);
    doc.text(`Máquina / Turno: ${emp.machine || '—'} / ${emp.shift || '—'}`, 120, 46);
    doc.text(`Base de Bonificação: ${formatBRL(item.baseAmount)}`, 120, 51);

    // 1. Daily Production Table (with kg/h or m², 12h goal and goal achievement per day)
    const rawProdList = (productionData || []).map((p: any) => ({ ...p, isTapeSector: false }));
    const rawRibbonList = (ribbonEntries || []).map((r: any) => ({ ...r, isTapeSector: true }));
    const combinedEntries = [...rawProdList, ...rawRibbonList];

    const empProdEntries = combinedEntries.filter(entry => {
      if (!entry || !entry.date) return false;
      if (!entry.date.startsWith(selectedCycle)) return false;
      const opName = (entry.operator || '').trim().toLowerCase();
      const empName = (emp.name || '').trim().toLowerCase();
      return opName === empName;
    }).sort((a, b) => a.date.localeCompare(b.date));

    const dailyProductionRows = empProdEntries.map(e => {
      const machStr = (e.machine || '').toLowerCase();
      const isCast = machStr.includes('cast') || machStr.includes('k1') || machStr.includes('k2');
      const isFita = e.isTapeSector || machStr.includes('ghez') || machStr.includes('lintec') || machStr.includes('wutec') || machStr.includes('fita');

      let speedStr = '—';
      let toleranceStr = '—';
      let meta12hStr = '—';
      let statusGoal = 'Concluído';
      let actualProdDisplay = formatWeight(e.netWeight);
      let lossDisplay = '0 Kg';

      // Regra ECOA: O ECOA terá perda de bônus somente se ultrapassar 8% no dia.
      // Se não ultrapassar 8% da produção do dia, não haverá perda nenhuma e não gerará perda percentual.
      const dayProd = Number(e.grossWeight) || Number(e.netWeight) || 0;
      const rawEcoA = Number(e.ecoA) || 0;
      const ecoAPct = dayProd > 0 ? (rawEcoA / dayProd) * 100 : 0;
      const evaluatedEcoA = ecoAPct > 8 ? rawEcoA : 0;

      // Regra estrita: ECOBM (Manutenção) é isento e NÃO conta como refugo do operador na meta!
      const evaluatedLosses = evaluatedEcoA + (Number(e.ecoBP) || 0) + (Number(e.borraTotal) || 0);
      const ecoBM = Number(e.ecoBM) || 0;

      // Avaliação de Paradas:
      // A ÚNICA parada que contabiliza para perda de meta é limpeza da máquina/matriz.
      // O tempo de 30 min NÃO é a soma de todas as paradas; é 30 min por parada de máquina individual.
      // Paradas de manutenção são expressamente isentas.
      const procStops = parseStopsFromField(e.processoMotivo, Number(e.processoMin) || 0);
      const outStops = parseStopsFromField(e.outrosMotivo, Number(e.outrosMin) || 0);
      const manStops = parseStopsFromField(e.manutencaoMotivo, Number(e.manutencaoMin) || 0);
      const allStops = [...procStops, ...outStops, ...manStops];
      const cleaningEval = evaluateCleaningStoppages(allStops);
      const maintMins = manStops.reduce((sum, s) => sum + s.durationMinutes, 0);

      let stopsSummaryStr = '0 min';
      if (cleaningEval.cleaningStops.length > 0) {
        if (cleaningEval.hasCleaningOver30) {
          const excessTxt = cleaningEval.cleaningStopsOver30.map(s => `${s.durationMinutes}m`).join(', ');
          stopsSummaryStr = `Limp: ${excessTxt} (! >30m)`;
        } else {
          stopsSummaryStr = `Limp: ${cleaningEval.maxCleaningRecorded}m (≤30m OK)`;
        }
      } else if (maintMins > 0) {
        stopsSummaryStr = `Manut: ${maintMins}m (Isenta)`;
      }

      if (isCast) {
        const kgH = Number(e.kgPerHour) || (machStr.includes('cast 2') || machStr.includes('k2') ? 850 : 1000);
        const theoretical12h = kgH * 12;
        const tolPct = Number(e.lossTolerancePercent) > 0 ? Number(e.lossTolerancePercent) : 3.5;
        const maxAllowedLoss = theoretical12h * (tolPct / 100);
        const targetNetKg = Math.max(0, theoretical12h - maxAllowedLoss);
        const net = Number(e.netWeight) || 0;

        speedStr = `${kgH} kg/h`;
        toleranceStr = `${tolPct}% (≤ ${formatWeight(maxAllowedLoss)})`;
        meta12hStr = formatWeight(targetNetKg);
        actualProdDisplay = formatWeight(e.netWeight);
        lossDisplay = formatWeight(evaluatedLosses) + 
          (rawEcoA > 0 && ecoAPct <= 8 ? ` (EcoA ${ecoAPct.toFixed(1)}% ≤ 8% Isento)` : '') +
          (ecoBM > 0 ? ` (+${formatWeight(ecoBM)} EcoBM Isento)` : '');

        const isNetMet = net >= targetNetKg;
        const isLossOk = evaluatedLosses <= maxAllowedLoss;
        const isCleaningOk = !cleaningEval.hasCleaningOver30;
        const netPct = targetNetKg > 0 ? (net / targetNetKg) * 100 : 0;

        if (isNetMet && isLossOk && isCleaningOk) {
          statusGoal = `BATEU META ✅ (${netPct.toFixed(0)}%)`;
        } else if (cleaningEval.hasCleaningOver30) {
          statusGoal = `EXC. LIMPEZA ⚠️ (>30m)`;
        } else if (isNetMet && !isLossOk) {
          statusGoal = `EXC. PERDA ⚠️ (+${formatWeight(evaluatedLosses - maxAllowedLoss)})`;
        } else if (!isNetMet && isLossOk) {
          statusGoal = `ABAIXO LÍQ. (${netPct.toFixed(0)}%)`;
        } else {
          statusGoal = `NÃO BATEU ❌ (${netPct.toFixed(0)}%)`;
        }
      } else if (isFita) {
        const tapeEval = evaluateTapeProductivityAndLosses(e);
        speedStr = `${tapeEval.targetDailyM2.toLocaleString('pt-BR')} m²/dia`;
        toleranceStr = `Perdas: ${tapeEval.totalLossM2.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m² (T1+T2+Lixo)`;
        meta12hStr = `${tapeEval.targetDailyM2.toLocaleString('pt-BR')} m²`;
        actualProdDisplay = `${tapeEval.producedM2.toLocaleString('pt-BR')} m²`;
        lossDisplay = `${tapeEval.totalLossM2.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m²`;
        statusGoal = tapeEval.statusBadge;
      } else {
        const kgH = Number(e.kgPerHour) || 350;
        const theoretical12h = kgH * 12;
        const targetNetKg = theoretical12h * 0.96;
        const net = Number(e.netWeight) || 0;
        speedStr = `${kgH} kg/h`;
        toleranceStr = '4.0%';
        meta12hStr = formatWeight(targetNetKg);
        actualProdDisplay = formatWeight(e.netWeight);
        lossDisplay = formatWeight(evaluatedLosses) + (ecoBM > 0 ? ` (+${formatWeight(ecoBM)} EcoBM Isento)` : '');
        statusGoal = net >= targetNetKg ? 'BATEU ✅' : 'NÃO BATEU ❌';
      }

      return [
        e.date,
        `${e.machine || '—'} (${e.shift || '—'})`,
        speedStr,
        toleranceStr,
        meta12hStr,
        actualProdDisplay,
        lossDisplay,
        stopsSummaryStr,
        statusGoal
      ];
    });

    if (dailyProductionRows.length === 0) {
      dailyProductionRows.push(['—', 'Sem apontamentos', '—', '—', '—', '0 Kg', '0 Kg', '0 min', 'Sem registros no ciclo']);
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('1. APONTAMENTOS DIÁRIOS DE PRODUÇÃO, TOLERÂNCIA DE PERDAS E METAS (12H)', 14, 59);

    autoTable(doc, {
      startY: 62,
      head: [['Data', 'Máquina / Turno', 'Velocidade', 'Tolerância Perda', 'Meta Líq. (12h)', 'Prod. Líq.', 'Perdas Reais (Refugo)', 'Paradas Limpeza', 'Status Meta & Parada']],
      body: dailyProductionRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      styles: { fontSize: 6.5, cellPadding: 1.2 }
    });

    // @ts-ignore
    const prodFinalY = (doc as any).lastAutoTable?.finalY || 110;

    // 2. Incidents & Deductions Table
    const incidentRows = item.personalIncidents.map(inc => {
      let typeLabel = inc.type.replace(/_/g, ' ').toUpperCase();
      if (inc.type === 'informacao_falsa') typeLabel = 'INFORMAÇÃO FALSA / FRAUDE (-100%)';
      if (inc.type === 'saida_mais_cedo') typeLabel = 'SAÍDA MAIS CEDO (COMUNICADA)';
      if (inc.type === 'saida_nao_comunicada') typeLabel = 'SAÍDA SEM AVISAR GESTOR';
      if (inc.type === 'limpeza_excessiva') typeLabel = 'LIMPEZA EXCEDEU 30 MIN';
      if (inc.type === 'partida_demorada') typeLabel = 'PARTIDA DEMORADA';
      return [
        inc.date,
        typeLabel,
        inc.description + (inc.documentNumber ? ` (Doc: ${inc.documentNumber})` : ''),
        `-${inc.penaltyRatePercent ?? 100}%`
      ];
    });

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

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('2. OCORRÊNCIAS, DISPONIBILIDADE E ABATIMENTOS DISCIPLINARES', 14, prodFinalY + 7);

    autoTable(doc, {
      startY: prodFinalY + 10,
      head: [['Data', 'Tipo de Ocorrência', 'Descrição / Documento', 'Desconto']],
      body: incidentRows,
      theme: 'striped',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      styles: { fontSize: 7, cellPadding: 1.5 }
    });

    // @ts-ignore
    const incFinalY = (doc as any).lastAutoTable?.finalY || 160;

    // Check if we need a new page for the summary and signatures
    if (incFinalY > 220) {
      doc.addPage();
    }
    const summaryStartY = incFinalY > 220 ? 20 : incFinalY + 7;

    // 3. Calculation summary box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, summaryStartY, 182, 34, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, summaryStartY, 182, 34, 3, 3, 'D');

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('RESUMO DO CÁLCULO DE FECHAMENTO', 20, summaryStartY + 7);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Valor Base Estipulado: ${formatBRL(item.baseAmount)}`, 20, summaryStartY + 14);
    
    if (item.perf && item.perf.discountPct > 0) {
      doc.text(`Desconto Linear de Desempenho (BI): - ${formatBRL(item.perfLossAmount)} (${item.perf.discountPct.toFixed(1)}% desc. | Perda: ${item.perf.averageWasteIdx.toFixed(2)}%)`, 20, summaryStartY + 19);
      doc.text(`Percentual de Desconto Total: ${item.totalDeductionPercent.toFixed(1)}% (- ${formatBRL(item.deductionAmount)})`, 20, summaryStartY + 24);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Valor Final a Receber: ${formatBRL(item.finalAmount)}`, 20, summaryStartY + 29);
    } else {
      doc.text(`Percentual de Desconto Total: ${item.totalDeductionPercent.toFixed(1)}% (- ${formatBRL(item.deductionAmount)})`, 20, summaryStartY + 20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Valor Final a Receber: ${formatBRL(item.finalAmount)}`, 20, summaryStartY + 27);
    }

    // Signatures
    const sigY = summaryStartY + 45;
    doc.line(20, sigY, 80, sigY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Assinatura do Colaborador', 25, sigY + 5);

    doc.line(130, sigY, 190, sigY);
    doc.text('Gestão de Produção / RH', 135, sigY + 5);

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
          {/* Cycle Selector (Mês de Referência) */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 shadow-xs" title="Mês de Referência sincronizado com as Configurações de Filtro">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mês:</span>
            <input
              type="month"
              value={selectedCycle}
              onChange={(e) => handleCycleChange(e.target.value)}
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

          {/* Apresentação Interativa (Modo PowerPoint) */}
          <button
            onClick={() => setIsPresentationOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer"
            title="Apresentação em Tela Cheia das Regras de Bônus de Produção (Estilo PowerPoint)"
          >
            <MonitorPlay className="w-4 h-4 text-indigo-200" />
            <span>Apresentação</span>
          </button>

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

          {/* Banner Interativo: Apresentação das Regras (PowerPoint) */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-amber-500 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20 text-slate-950 font-black">
                <MonitorPlay className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[11px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  Modo Apresentação Slide a Slide
                </div>
                <h3 className="text-lg font-black text-white tracking-tight">
                  Apresentação Completa das Regras de Bônus de Produção
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Apresente em tela cheia como um PowerPoint para os operadores e supervisores: todas as regras explicadas detalhadamente, cálculo por kg/h e m², tolerâncias de perda, isenção de ECOBM, paradas de limpeza e conduta.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsPresentationOpen(true)}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2.5 shadow-md shadow-amber-500/20 active:scale-95 transition-all shrink-0 cursor-pointer"
            >
              <MonitorPlay className="w-4 h-4 text-slate-950" />
              <span>Abrir Apresentação</span>
            </button>
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
          <BiAnalyticsView 
            productionData={productionData}
            goals={goals}
            employees={employees}
            standaloneSection="operators"
            dashboardMonth={selectedCycle}
            targetMonth={selectedCycle}
          />
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
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700">
                                  -{item.totalDeductionPercent.toFixed(0)}% ({formatBRL(item.deductionAmount)})
                                </span>
                                {item.personalIncidents.map(inc => (
                                  <span 
                                    key={inc.id} 
                                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded mt-0.5 whitespace-nowrap ${
                                      inc.type === 'saida_nao_comunicada' 
                                        ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                                        : inc.type === 'saida_mais_cedo' 
                                          ? 'bg-amber-100 text-amber-800'
                                          : inc.type === 'limpeza_excessiva'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {inc.type === 'informacao_falsa' && '🚨 Informação Falsa (-100%)'}
                                    {inc.type === 'saida_mais_cedo' && 'Saída Comunicada (-10%)'}
                                    {inc.type === 'saida_nao_comunicada' && 'Saída SEM Avisar (-35%)'}
                                    {inc.type === 'limpeza_excessiva' && 'Limpeza > 30 min (-30%)'}
                                    {inc.type === 'partida_demorada' && 'Partida Demorada (-20%)'}
                                    {inc.type === 'atestado' && 'Atestado (-100%)'}
                                    {inc.type === 'atraso_injustificado' && 'Atraso (-15%)'}
                                    {inc.type === 'atraso_justificado' && 'Atraso (-10%)'}
                                    {inc.type === 'falta_injustificada' && 'Falta Injustificada (-100%)'}
                                    {inc.type === 'falta_justificada' && 'Falta Justificada (-100%)'}
                                    {inc.type === 'meta_maquina_nao_atingida' && 'Meta Máquina (-30%)'}
                                    {!['informacao_falsa', 'saida_mais_cedo', 'saida_nao_comunicada', 'limpeza_excessiva', 'partida_demorada', 'atestado', 'atraso_injustificado', 'atraso_justificado', 'falta_injustificada', 'falta_justificada', 'meta_maquina_nao_atingida'].includes(inc.type) && `${inc.type.replace(/_/g, ' ')} (-${inc.penaltyRatePercent || 0}%)`}
                                  </span>
                                ))}
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
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                                inc.type === 'saida_nao_comunicada'
                                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                                  : inc.type === 'saida_mais_cedo'
                                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                                    : inc.type === 'limpeza_excessiva'
                                      ? 'bg-blue-100 text-blue-800 border-blue-200'
                                      : inc.type === 'atestado'
                                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                                        : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                {inc.type === 'saida_mais_cedo' && 'Saída Comunicada'}
                                {inc.type === 'saida_nao_comunicada' && 'Saída SEM Avisar'}
                                {inc.type === 'limpeza_excessiva' && 'Limpeza > 30 min'}
                                {inc.type === 'partida_demorada' && 'Partida Demorada'}
                                {inc.type === 'atestado' && 'Atestado'}
                                {inc.type === 'atraso_injustificado' && 'Atraso Injust.'}
                                {inc.type === 'atraso_justificado' && 'Atraso Just.'}
                                {inc.type === 'falta_injustificada' && 'Falta Injust.'}
                                {inc.type === 'falta_justificada' && 'Falta Just.'}
                                {inc.type === 'meta_maquina_nao_atingida' && 'Meta Máquina'}
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
                <div className="space-y-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tipo de Ocorrência</label>
                    <select
                      value={incidentType}
                      onChange={(e) => {
                        const t = e.target.value as BonusIncidentType;
                        setIncidentType(t);
                        if (t === 'informacao_falsa' || t === 'atestado' || t === 'falta_injustificada' || t === 'falta_justificada' || t === 'advertencia_escrita' || t === 'uso_celular_reincidente' || t === 'fumar_reincidente' || t === 'nao_uso_epi_reincidente') {
                          setCustomPenaltyPercent(100);
                          setIsJustified(false);
                        } else if (t === 'parada_limpeza_nao_realizada') {
                          setCustomPenaltyPercent(50);
                        } else if (t === 'saida_nao_comunicada') {
                          setCustomPenaltyPercent(35);
                          setNotifiedManager(false);
                        } else if (t === 'meta_maquina_nao_atingida') {
                          setCustomPenaltyPercent(30);
                        } else if (t === 'devolucao_externa' || t === 'reclamacao_interna' || t === 'materia_prima_molhada' || t === 'uso_celular' || t === 'fumar_trabalho' || t === 'nao_uso_epi' || t === 'atraso_injustificado' || t === 'partida_demorada') {
                          setCustomPenaltyPercent(20);
                        } else if (t === 'limpeza_excessiva') {
                          setCustomPenaltyPercent(15);
                        } else if (t === 'mau_preenchimento' || t === 'saida_mais_cedo') {
                          setCustomPenaltyPercent(10);
                          if (t === 'saida_mais_cedo') setNotifiedManager(true);
                        } else if (t === 'atraso_justificado') {
                          setCustomPenaltyPercent(5);
                        } else if (t === 'atraso_10min' || t === 'hora_extra_nao_autorizada') {
                          setCustomPenaltyPercent(1);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-semibold outline-none"
                    >
                      <optgroup label="1. Qualidade">
                        <option value="devolucao_externa">📦 Erro Operacional / Devolução Externa (-20%)</option>
                        <option value="reclamacao_interna">⚠️ Reclamação Interna (-20%)</option>
                        <option value="materia_prima_molhada">💧 Abastecimento com Matéria-Prima Molhada (-20%)</option>
                        <option value="mau_preenchimento">📝 Mau Preenchimento de Apontamento (-10%)</option>
                      </optgroup>
                      <optgroup label="2. Assiduidade & Comportamento">
                        <option value="atestado">🏥 Atestado Médico (-100%)</option>
                        <option value="falta_injustificada">❌ Falta sem Justificativa (-100%)</option>
                        <option value="advertencia_escrita">⚠️ Advertência por Escrito (-100%)</option>
                        <option value="atraso_10min">⏰ Atraso (-1% a cada 10 min)</option>
                        <option value="hora_extra_nao_autorizada">⏱️ Hora Extra Não Autorizada (-1% a cada 10 min)</option>
                        <option value="uso_celular">📱 Uso de Celular no Trabalho (-20%)</option>
                        <option value="uso_celular_reincidente">📱 Uso de Celular Reincidente (-100%)</option>
                        <option value="fumar_trabalho">🚬 Fumar no Trabalho (-20%)</option>
                        <option value="fumar_reincidente">🚬 Fumar no Trabalho Reincidente (-100%)</option>
                        <option value="nao_uso_epi">🦺 Não Uso de EPIs (-20%)</option>
                        <option value="nao_uso_epi_reincidente">🦺 Não Uso de EPIs Reincidente (-100%)</option>
                        <option value="saida_mais_cedo">🚪 Saída Comunicada ao Gestor (-10%)</option>
                        <option value="saida_nao_comunicada">🚪 Saída Não Comunicada (-35%)</option>
                      </optgroup>
                      <optgroup label="3. Operacional & Paradas de Máquina">
                        <option value="parada_limpeza_nao_realizada">🛑 Parada de Limpeza Não Realizada (50% Desc. no Ranking)</option>
                        <option value="informacao_falsa">🚨 Informação Falsa / Fraude de Apontamento (-100%)</option>
                        <option value="limpeza_excessiva">⏱️ Parada de Limpeza Excedeu 30 Minutos (-15%)</option>
                        <option value="partida_demorada">⏳ Partida de Máquina com Demora Excessiva (-20%)</option>
                        <option value="meta_maquina_nao_atingida">📉 Meta de Máquina/kg-h Não Atingida (-30%)</option>
                        <option value="outra">📝 Outra Ocorrência Personalizada...</option>
                      </optgroup>
                    </select>
                  </div>

                  {incidentType === 'informacao_falsa' && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-1">
                      <div className="font-black uppercase flex items-center gap-1.5 text-red-700">
                        <ShieldAlert className="w-4 h-4 text-red-600" />
                        Penalidade Gravíssima: Desconto de 100%
                      </div>
                      <p className="text-[11px] text-red-700 leading-snug">
                        Lançamento de informação falsa (ex: desvio de refugo de produção para manutenção, justificar quebra inverídica desmentida por câmeras, adulteração de dados) acarreta perda total (100%) da bonificação do período.
                      </p>
                    </div>
                  )}

                  {/* Contextual warning / helper for exits */}
                  {(incidentType === 'saida_mais_cedo' || incidentType === 'saida_nao_comunicada') && (
                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                          <LogOut className="w-3.5 h-3.5 text-amber-600" />
                          Houve comunicação prévia ao gestor direto?
                        </span>
                        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                          <button
                            type="button"
                            onClick={() => {
                              setNotifiedManager(true);
                              setIncidentType('saida_mais_cedo');
                              setCustomPenaltyPercent(10);
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              notifiedManager ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Sim (Comunicou)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNotifiedManager(false);
                              setIncidentType('saida_nao_comunicada');
                              setCustomPenaltyPercent(35);
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              !notifiedManager ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            Não (Sem Avisar)
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-amber-700 leading-relaxed">
                        {notifiedManager
                          ? 'Saída antecipada ou fora do horário comunicada com antecedência acarreta desconto leve (padrão 10%).'
                          : 'Atenção: Saída sem aviso prévio à liderança ou sem comunicar ninguém constitui infração grave com desconto disciplinar majorado (padrão 35%).'}
                      </p>
                    </div>
                  )}

                  {/* Contextual helper for cleaning > 30 min */}
                  {incidentType === 'limpeza_excessiva' && (
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800 flex items-start gap-2">
                      <Timer className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Regra de 30 minutos:</strong> A tolerância padrão de parada de máquina para limpeza de matriz/troca é de até 30 min. Tempo excedente desconta na avaliação do turno.
                      </span>
                    </div>
                  )}
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

      {/* Modal de Apresentação em Tela Cheia (Estilo PowerPoint) */}
      <BonusRulesPresentationModal
        isOpen={isPresentationOpen}
        onClose={() => setIsPresentationOpen(false)}
      />
    </div>
  );
};
