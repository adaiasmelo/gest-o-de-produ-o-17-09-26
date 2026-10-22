import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Award, AlertTriangle, CheckCircle2, XCircle, Clock, FileText, 
  Calendar, Filter, Search, Plus, Trash2, ArrowLeft,
  ShieldAlert, FileCheck, Users, Printer, ChevronDown, 
  X, Info, Layers, AlertOctagon, HelpCircle, FileSpreadsheet,
  SlidersHorizontal, HardHat, Briefcase, Palmtree
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
  onClose: () => void;
  canManage: boolean;
  isReadOnly?: boolean;
  onBlockedAction?: (title?: string, message?: string) => void;
  loggedUser?: any;
}

// Helpers de Períodos da Folha (Ciclos de Fechamento dia 24)
const getAvailablePayrollCycles = () => {
  return [
    { key: '2026-10', label: 'Outubro/2026 (25/09 a 24/10)', shortLabel: 'Out/2026', isCurrent: true },
    { key: '2026-09', label: 'Setembro/2026 (25/08 a 24/09)', shortLabel: 'Set/2026', isCurrent: false },
    { key: '2026-08', label: 'Agosto/2026 (25/07 a 24/08)', shortLabel: 'Ago/2026', isCurrent: false },
    { key: '2026-11', label: 'Novembro/2026 (25/10 a 24/11)', shortLabel: 'Nov/2026', isCurrent: false },
  ];
};

const STANDARD_MACHINES = ['Cast 1', 'Cast 2', 'Erema 1', 'Ghezzi', 'Lintech', 'Wultec'];
const STANDARD_SHIFTS = ['Todos os Turnos', 'Diurno 1', 'Noturno 1', 'Diurno 2', 'Noturno 2', 'Comercial'];

export const ProductionBonusManager: React.FC<ProductionBonusManagerProps> = ({
  employees,
  onClose,
  canManage,
  isReadOnly = false,
  onBlockedAction,
  loggedUser
}) => {
  // Estado de Período e Metas
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-10');
  const [baseBonusAmount, setBaseBonusAmount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('manupack_bonus_base_value');
      return saved ? Number(saved) : 250;
    } catch {
      return 250;
    }
  });

  // Ocorrências e Metas de Máquinas do Firestore/Local
  const [incidents, setIncidents] = useState<BonusIncident[]>([]);
  const [machineGoals, setMachineGoals] = useState<Record<string, MachineGoalConfig>>({});
  const [, setIsLoading] = useState<boolean>(true);

  // Filtros de visualização
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterSector, setFilterSector] = useState<string>('todos');
  const [filterMachine, setFilterMachine] = useState<string>('todas');
  const [filterShift, setFilterShift] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'integral' | 'parcial' | 'zerado'>('todos');
  const [activeTab, setActiveTab] = useState<'ranking' | 'incidents' | 'machines'>('ranking');

  // Menu de Ações e Exportações Dropdown
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState<boolean>(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Modais
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState<boolean>(false);
  const [editingIncident, setEditingIncident] = useState<BonusIncident | null>(null);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState<boolean>(false);
  const [viewEmployeeHistory, setViewEmployeeHistory] = useState<Employee | null>(null);

  // Formulário de Incidência
  const [formEmployeeId, setFormEmployeeId] = useState<string>('');
  const [formType, setFormType] = useState<BonusIncidentType>('atestado');
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().substring(0, 10));
  const [formDescription, setFormDescription] = useState<string>('');
  const [formDocNumber, setFormDocNumber] = useState<string>('');
  const [formDocDetails, setFormDocDetails] = useState<string>('');
  const [formIsJustified, setFormIsJustified] = useState<boolean>(false);
  const [formTargetMachine, setFormTargetMachine] = useState<string>('Cast 1');
  const [formTargetShift, setFormTargetShift] = useState<string>('Todos os Turnos');
  const [formPenaltyRate, setFormPenaltyRate] = useState<number>(100);

  // Fecha menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setIsActionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Salvar baseBonusAmount em localStorage
  useEffect(() => {
    try {
      localStorage.setItem('manupack_bonus_base_value', String(baseBonusAmount));
    } catch {
      // ignore
    }
  }, [baseBonusAmount]);

  // Sincronização em tempo real do Firestore: Incidências
  useEffect(() => {
    setIsLoading(true);
    let unsubIncidents: () => void = () => {};
    let unsubMachineGoals: () => void = () => {};

    try {
      const incidentsCol = collection(db, 'bonus_incidents');
      unsubIncidents = onSnapshot(incidentsCol, (snap) => {
        const loaded: BonusIncident[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as BonusIncident));
        setIncidents(loaded);
        setIsLoading(false);
      }, (err) => {
        console.warn('Erro ao carregar do Firestore bonus_incidents, usando cache local:', err);
        try {
          const cached = localStorage.getItem('cached_bonus_incidents');
          if (cached) setIncidents(JSON.parse(cached));
        } catch {
          // ignore
        }
        setIsLoading(false);
      });

      const goalsCol = collection(db, 'bonus_machine_goals');
      unsubMachineGoals = onSnapshot(goalsCol, (snap) => {
        const dict: Record<string, MachineGoalConfig> = {};
        snap.docs.forEach(d => {
          const data = d.data() as MachineGoalConfig;
          dict[d.id] = { ...data, id: d.id };
        });
        setMachineGoals(dict);
      }, (err) => {
        console.warn('Erro ao carregar do Firestore bonus_machine_goals:', err);
        try {
          const cached = localStorage.getItem('cached_bonus_machine_goals');
          if (cached) setMachineGoals(JSON.parse(cached));
        } catch {
          // ignore
        }
      });
    } catch (e) {
      console.warn('Falha na inicialização Firestore:', e);
      setIsLoading(false);
    }

    return () => {
      unsubIncidents();
      unsubMachineGoals();
    };
  }, []);

  // REGRA DO USUÁRIO: FILTRAGEM ESTRITA DOS COLABORADORES EFETIVOS DO QUADRO GERAL
  // "ele deve estar linkado somente a todos aqueles que estão na tela quadro geral de pessoal...
  // 16 operadores, 22 auxiliares, um está de férias, então somente nesses 37 colaboradores.
  // Não deve se aplicar ao cargo de liderança, mas deve se aplicar ao setor de extrusão dividido por máquina e turno"
  const eligibleBoardCollaborators = useMemo(() => {
    return employees.filter(emp => {
      if (!emp || !emp.name) return false;
      const nameNorm = emp.name.toLowerCase().trim();
      if (!nameNorm || nameNorm.includes('vaga') || nameNorm.includes('aberto')) return false;

      // Status permitidos: Ativo, Férias ou Atestado (exclui Desligado, Vaga Excluída)
      const statusNorm = (emp.status || 'Ativo').toLowerCase().trim();
      const isEmployed = ['ativo', 'ferias', 'atestado'].includes(statusNorm);
      if (!isEmployed) return false;

      // Exclui colaboradores silenciados
      if (emp.isSilenced) return false;

      const sectorNorm = (emp.sector || '').toLowerCase().trim();
      const roleNorm = (emp.role || '').toLowerCase().trim();

      // Regra estrita: NÃO SE APLICA AO CARGO DE LIDERANÇA (Gerente, Supervisor, Líder)
      if (sectorNorm === 'lideranca' || sectorNorm === 'liderança') return false;
      if (roleNorm.includes('gerente') || roleNorm.includes('supervisor') || roleNorm === 'líder' || roleNorm === 'lider') return false;

      return true;
    });
  }, [employees]);

  // Lista de setores dos colaboradores elegíveis
  const availableSectors = useMemo(() => {
    const set = new Set<string>();
    eligibleBoardCollaborators.forEach(e => {
      if (e.sector && e.sector.trim()) set.add(e.sector.trim());
    });
    return Array.from(set).sort();
  }, [eligibleBoardCollaborators]);

  // Lista de máquinas dos colaboradores elegíveis
  const availableMachines = useMemo(() => {
    const set = new Set<string>(STANDARD_MACHINES);
    eligibleBoardCollaborators.forEach(e => {
      if (e.machine && e.machine.trim()) set.add(e.machine.trim());
    });
    return Array.from(set).sort();
  }, [eligibleBoardCollaborators]);

  // Lista de turnos dos colaboradores elegíveis
  const availableShifts = useMemo(() => {
    const set = new Set<string>();
    eligibleBoardCollaborators.forEach(e => {
      if (e.shift && e.shift.trim()) set.add(e.shift.trim());
    });
    return Array.from(set).sort();
  }, [eligibleBoardCollaborators]);

  // REGRA DO USUÁRIO: EXTRAÇÃO DINÂMICA DE MÁQUINAS E TURNOS DIRETAMENTE DO QUADRO GERAL (PESSOAL / EMPLOYEES)
  // Erema: Diurno 1, Noturno 1, Diurno 2, Noturno 2 (4 turnos)
  // Ghezzi, Lintech, Wultec: Comercial
  // Cast 1, Cast 2: Diurno 1, Noturno 1, Diurno 2, Noturno 2
  const dynamicMachineShiftPairs = useMemo(() => {
    const pairsMap = new Map<string, { machine: string; shift: string }>();

    // 1. Extração direta de todos os colaboradores do Quadro Geral (employees)
    employees.forEach(emp => {
      const machine = (emp.machine || '').trim();
      const shift = (emp.shift || '').trim();
      if (!machine || machine.toLowerCase() === 'geral' || machine.toLowerCase() === 'nenhuma') return;
      if (!shift || shift.toLowerCase() === 'todos' || shift.toLowerCase() === 'todos os turnos') return;
      if (emp.name && emp.name.toLowerCase().includes('vaga excluída')) return;

      let normMachine = machine;
      if (/^ghezzi$/i.test(machine) || /^ghezz$/i.test(machine)) normMachine = 'Ghezzi';
      else if (/^wultec$/i.test(machine) || /^wutec$/i.test(machine)) normMachine = 'Wultec';
      else if (/^lintech$/i.test(machine)) normMachine = 'Lintech';
      else if (/^erema$/i.test(machine) || /^erema\s*1$/i.test(machine)) normMachine = 'Erema 1';
      else if (/^cast\s*1$/i.test(machine)) normMachine = 'Cast 1';
      else if (/^cast\s*2$/i.test(machine)) normMachine = 'Cast 2';

      let normShift = shift;
      if (/^comercial$/i.test(shift)) normShift = 'Comercial';
      else if (/^diurno\s*1$/i.test(shift)) normShift = 'Diurno 1';
      else if (/^noturno\s*1$/i.test(shift)) normShift = 'Noturno 1';
      else if (/^diurno\s*2$/i.test(shift)) normShift = 'Diurno 2';
      else if (/^noturno\s*2$/i.test(shift)) normShift = 'Noturno 2';

      const key = `${normMachine}___${normShift}`;
      if (!pairsMap.has(key)) {
        pairsMap.set(key, { machine: normMachine, shift: normShift });
      }
    });

    // 2. Garantir todos os turnos e máquinas da fábrica definidos no Quadro Geral:
    // Cast 1 e Cast 2 com 4 turnos; Erema 1 com 4 turnos (Diurno 1/2 e Noturno 1/2); Ghezzi, Lintech e Wultec Comercial
    const factoryStandardPairs = [
      { machine: 'Cast 1', shift: 'Diurno 1' },
      { machine: 'Cast 1', shift: 'Noturno 1' },
      { machine: 'Cast 1', shift: 'Diurno 2' },
      { machine: 'Cast 1', shift: 'Noturno 2' },
      { machine: 'Cast 2', shift: 'Diurno 1' },
      { machine: 'Cast 2', shift: 'Noturno 1' },
      { machine: 'Cast 2', shift: 'Diurno 2' },
      { machine: 'Cast 2', shift: 'Noturno 2' },
      { machine: 'Erema 1', shift: 'Diurno 1' },
      { machine: 'Erema 1', shift: 'Noturno 1' },
      { machine: 'Erema 1', shift: 'Diurno 2' },
      { machine: 'Erema 1', shift: 'Noturno 2' },
      { machine: 'Ghezzi', shift: 'Comercial' },
      { machine: 'Lintech', shift: 'Comercial' },
      { machine: 'Wultec', shift: 'Comercial' },
    ];

    factoryStandardPairs.forEach(p => {
      const key = `${p.machine}___${p.shift}`;
      if (!pairsMap.has(key)) {
        pairsMap.set(key, p);
      }
    });

    const machineOrder: Record<string, number> = {
      'Cast 1': 1,
      'Cast 2': 2,
      'Erema 1': 3,
      'Ghezzi': 4,
      'Lintech': 5,
      'Wultec': 6,
    };

    const shiftOrder: Record<string, number> = {
      'Diurno 1': 1,
      'Noturno 1': 2,
      'Diurno 2': 3,
      'Noturno 2': 4,
      'Comercial': 5,
      'Diurno': 6,
      'Noturno': 7,
    };

    return Array.from(pairsMap.values()).sort((a, b) => {
      const ordM1 = machineOrder[a.machine] || 99;
      const ordM2 = machineOrder[b.machine] || 99;
      if (ordM1 !== ordM2) return ordM1 - ordM2;
      const ordS1 = shiftOrder[a.shift] || 99;
      const ordS2 = shiftOrder[b.shift] || 99;
      if (ordS1 !== ordS2) return ordS1 - ordS2;
      return a.machine.localeCompare(b.machine) || a.shift.localeCompare(b.shift);
    });
  }, [employees]);

  // Incidências filtradas pelo período selecionado
  const periodIncidents = useMemo(() => {
    return incidents.filter(inc => inc.cyclePeriod === selectedPeriod);
  }, [incidents, selectedPeriod]);

  // Cálculo individual do Bônus para cada um dos colaboradores elegíveis do Quadro Geral
  const collaboratorsBonusCalculations = useMemo(() => {
    return eligibleBoardCollaborators.map(emp => {
      const empId = emp.id;
      const empName = emp.name;
      const empMachine = emp.machine ? emp.machine.trim() : '';
      const empShift = emp.shift ? emp.shift.trim() : '';

      // Ocorrências individuais deste colaborador
      const empIncidents = periodIncidents.filter(inc => 
        inc.employeeId === empId || 
        (inc.registration && emp.registration && inc.registration.trim() === emp.registration.trim()) ||
        (!inc.employeeId && inc.employeeName.trim().toLowerCase() === empName.trim().toLowerCase())
      );

      // REGRA DO USUÁRIO: PENALIDADE DE MÁQUINA DIVIDIDA POR MÁQUINA E TURNO
      // "se houver diminuição no bônus por conta do Cast 1 Diurno 1, então essa diminuição vai se aplicar ao Marcelo,
      // ao Railan, ao Maxi e ao Márcio, somente a esses. Somente a esses, por máquina e turno."
      const machineIncidents = empMachine ? periodIncidents.filter(inc => {
        if (inc.type !== 'meta_maquina_nao_atingida') return false;
        const matchesMachine = inc.targetMachine && inc.targetMachine.trim().toLowerCase() === empMachine.toLowerCase();
        if (!matchesMachine) return false;

        // Se a penalidade for para um turno específico, checa se bate com o turno do colaborador
        if (inc.targetShift && inc.targetShift !== 'Todos os Turnos' && inc.targetShift !== 'Todos') {
          return inc.targetShift.trim().toLowerCase() === empShift.toLowerCase();
        }
        return true;
      }) : [];

      // Checa configuração direta de meta por máquina e turno
      const machineSpecificShiftGoalKey = `${empMachine}_${empShift}_${selectedPeriod}`;
      const machineGeneralGoalKey = `${empMachine}_${selectedPeriod}`;
      const machineGoalCfg = machineGoals[machineSpecificShiftGoalKey] || machineGoals[machineGeneralGoalKey];

      // Contagem de eventos desqualificadores
      const atestados = empIncidents.filter(i => i.type === 'atestado');
      const faltasInjustificadas = empIncidents.filter(i => i.type === 'falta_injustificada' && !i.isJustified);
      const faltasJustificadas = empIncidents.filter(i => i.type === 'falta_justificada' || (i.type === 'falta_injustificada' && i.isJustified));
      const atrasosInjustificados = empIncidents.filter(i => i.type === 'atraso_injustificado' && !i.isJustified);
      const atrasosJustificados = empIncidents.filter(i => i.type === 'atraso_justificado' || (i.type === 'atraso_injustificado' && i.isJustified));

      // Aplicação estrita das Regras do Usuário:
      // 1. Apresentou atestado -> CORTA TODO O BÔNUS (100% de desconto)
      // 2. Falta não justificada -> CORTA O BÔNUS (100% de desconto)
      // 3. Atrasos sucessivos no mesmo mês (2 ou mais) -> CORTA O BÔNUS (100% de desconto)
      //    1 atraso injustificado -> tolerância/aviso com abatimento leve de 25%
      // 4. Se a máquina/turno não cumpriu a meta de produção -> abatimento proporcional para a equipe específica
      let isZeroed = false;
      let zeroReason = '';
      let discountRate = 0; // em %

      if (atestados.length > 0) {
        isZeroed = true;
        discountRate = 100;
        zeroReason = `Atestado Médico apresentado (${atestados.length}x)`;
      } else if (faltasInjustificadas.length > 0) {
        isZeroed = true;
        discountRate = 100;
        zeroReason = `Falta Injustificada (${faltasInjustificadas.length}x)`;
      } else if (atrasosInjustificados.length >= 2) {
        isZeroed = true;
        discountRate = 100;
        zeroReason = `Atrasos Sucessivos no Mês (${atrasosInjustificados.length}x sem justificativa)`;
      } else if (atrasosInjustificados.length === 1) {
        discountRate += 25; // Abatimento parcial de 25% pelo 1º atraso
      }

      // Se não estiver zerado por conduta, avalia meta da máquina/turno do colaborador
      let machinePenaltyApplied = 0;
      let machinePenaltyReason = '';

      if (!isZeroed && empMachine) {
        if (machineGoalCfg && !machineGoalCfg.goalMet) {
          machinePenaltyApplied = machineGoalCfg.abatementPercent || 50;
          machinePenaltyReason = `Meta da Máquina ${empMachine} (${machineGoalCfg.shift || 'Geral'}) não atingida (-${machinePenaltyApplied}%)`;
        } else if (machineIncidents.length > 0) {
          const maxPenalty = Math.max(...machineIncidents.map(m => m.penaltyRatePercent || 50));
          machinePenaltyApplied = maxPenalty;
          const incidentShift = machineIncidents[0].targetShift;
          machinePenaltyReason = `Penalidade de equipe: ${empMachine} ${incidentShift && incidentShift !== 'Todos os Turnos' ? `(${incidentShift})` : ''} (-${machinePenaltyApplied}%)`;
        }
      }

      // Soma dos descontos limitando a 100%
      const totalDiscountPercent = isZeroed ? 100 : Math.min(100, discountRate + machinePenaltyApplied);
      const finalBonusAmount = isZeroed 
        ? 0 
        : Number((baseBonusAmount * (1 - totalDiscountPercent / 100)).toFixed(2));

      let statusBadge: 'integral' | 'parcial' | 'zerado' = 'integral';
      if (finalBonusAmount === 0 || totalDiscountPercent >= 100) {
        statusBadge = 'zerado';
      } else if (finalBonusAmount < baseBonusAmount) {
        statusBadge = 'parcial';
      }

      return {
        employee: emp,
        empIncidents,
        atestadosCount: atestados.length,
        faltasInjustificadasCount: faltasInjustificadas.length,
        faltasJustificadasCount: faltasJustificadas.length,
        atrasosInjustificadosCount: atrasosInjustificados.length,
        atrasosJustificadosCount: atrasosJustificados.length,
        isZeroed,
        zeroReason,
        discountRate,
        machinePenaltyApplied,
        machinePenaltyReason,
        totalDiscountPercent,
        baseBonusAmount,
        finalBonusAmount,
        statusBadge
      };
    });
  }, [eligibleBoardCollaborators, periodIncidents, machineGoals, selectedPeriod, baseBonusAmount]);

  // Lista de colaboradores filtrada para a tabela
  const filteredCalculations = useMemo(() => {
    return collaboratorsBonusCalculations.filter(item => {
      const emp = item.employee;
      const matchSearch = 
        !searchTerm || 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.registration && emp.registration.includes(searchTerm)) ||
        (emp.role && emp.role.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchSector = filterSector === 'todos' || emp.sector === filterSector;
      const matchMachine = filterMachine === 'todas' || emp.machine === filterMachine;
      const matchShift = filterShift === 'todos' || emp.shift === filterShift;
      const matchStatus = filterStatus === 'todos' || item.statusBadge === filterStatus;

      return matchSearch && matchSector && matchMachine && matchShift && matchStatus;
    });
  }, [collaboratorsBonusCalculations, searchTerm, filterSector, filterMachine, filterShift, filterStatus]);

  // Estatísticas executivas do bônus
  const summaryStats = useMemo(() => {
    const totalCount = eligibleBoardCollaborators.length;
    const operadoresCount = eligibleBoardCollaborators.filter(c => (c.role || '').toLowerCase().includes('operador')).length;
    const auxiliaresCount = eligibleBoardCollaborators.filter(c => (c.role || '').toLowerCase().includes('auxiliar')).length;
    const feriasCount = eligibleBoardCollaborators.filter(c => (c.status || '').toLowerCase() === 'férias' || (c.status || '').toLowerCase() === 'ferias').length;

    const integralCount = collaboratorsBonusCalculations.filter(c => c.statusBadge === 'integral').length;
    const parcialCount = collaboratorsBonusCalculations.filter(c => c.statusBadge === 'parcial').length;
    const zeradoCount = collaboratorsBonusCalculations.filter(c => c.statusBadge === 'zerado').length;
    
    const totalPayable = collaboratorsBonusCalculations.reduce((acc, c) => acc + c.finalBonusAmount, 0);

    return {
      totalCount,
      operadoresCount,
      auxiliaresCount,
      feriasCount,
      integralCount,
      parcialCount,
      zeradoCount,
      totalPayable
    };
  }, [eligibleBoardCollaborators, collaboratorsBonusCalculations]);

  // Abertura do formulário de Incidência
  const handleOpenIncidentModal = (employee?: Employee) => {
    if (isReadOnly) {
      onBlockedAction?.('Ação Bloqueada', 'Usuário com perfil somente leitura não pode registrar ocorrências.');
      return;
    }
    setEditingIncident(null);
    if (employee) {
      setFormEmployeeId(employee.id);
      setFormTargetMachine(employee.machine || 'Cast 1');
      setFormTargetShift(employee.shift || 'Todos os Turnos');
    } else {
      setFormEmployeeId('');
      setFormTargetMachine('Cast 1');
      setFormTargetShift('Todos os Turnos');
    }
    setFormType('atestado');
    setFormDate(new Date().toISOString().substring(0, 10));
    setFormDescription('');
    setFormDocNumber('');
    setFormDocDetails('');
    setFormIsJustified(false);
    setFormPenaltyRate(100);
    setIsIncidentModalOpen(true);
  };

  // Salvar Incidência no Firestore
  const handleSaveIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    let targetEmp: Employee | undefined;
    if (formType !== 'meta_maquina_nao_atingida') {
      targetEmp = eligibleBoardCollaborators.find(emp => emp.id === formEmployeeId);
      if (!targetEmp) {
        alert('Por favor, selecione um colaborador válido do Quadro Geral.');
        return;
      }
    }

    const incidentId = editingIncident ? editingIncident.id : `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    const payload: BonusIncident = {
      id: incidentId,
      employeeId: targetEmp ? targetEmp.id : '',
      employeeName: targetEmp ? targetEmp.name : `Equipe Máquina ${formTargetMachine} (${formTargetShift})`,
      registration: targetEmp?.registration || '',
      sector: targetEmp?.sector || 'Extrusão',
      machine: targetEmp?.machine || formTargetMachine,
      shift: targetEmp?.shift || formTargetShift,
      type: formType,
      date: formDate,
      cyclePeriod: selectedPeriod,
      description: formDescription.trim() || 'Ocorrência registrada no ciclo de apuração.',
      documentNumber: formDocNumber.trim(),
      documentDetails: formDocDetails.trim(),
      isJustified: formIsJustified || formType === 'atraso_justificado' || formType === 'falta_justificada',
      targetMachine: formType === 'meta_maquina_nao_atingida' ? formTargetMachine : targetEmp?.machine,
      targetShift: formType === 'meta_maquina_nao_atingida' ? formTargetShift : targetEmp?.shift,
      penaltyRatePercent: formType === 'meta_maquina_nao_atingida' ? Number(formPenaltyRate) : (formType === 'atraso_injustificado' ? 25 : 100),
      registeredBy: loggedUser?.name || 'Administração RH',
      createdAt: editingIncident?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'bonus_incidents', incidentId), payload);
      const updated = incidents.filter(i => i.id !== incidentId);
      updated.push(payload);
      setIncidents(updated);
      try {
        localStorage.setItem('cached_bonus_incidents', JSON.stringify(updated));
      } catch {
        // ignore
      }
      setIsIncidentModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar ocorrência:', err);
      const updated = incidents.filter(i => i.id !== incidentId);
      updated.push(payload);
      setIncidents(updated);
      localStorage.setItem('cached_bonus_incidents', JSON.stringify(updated));
      setIsIncidentModalOpen(false);
    }
  };

  // Excluir Incidência
  const handleDeleteIncident = async (incidentId: string) => {
    if (isReadOnly) return;
    if (!confirm('Deseja realmente remover esta ocorrência de bônus?')) return;

    try {
      await deleteDoc(doc(db, 'bonus_incidents', incidentId));
      const updated = incidents.filter(i => i.id !== incidentId);
      setIncidents(updated);
      localStorage.setItem('cached_bonus_incidents', JSON.stringify(updated));
    } catch (err) {
      console.error('Erro ao remover incidência:', err);
      const updated = incidents.filter(i => i.id !== incidentId);
      setIncidents(updated);
      localStorage.setItem('cached_bonus_incidents', JSON.stringify(updated));
    }
  };

  // Salvar Status de Meta da Máquina e Turno (Cast 1, Cast 2, etc.)
  const handleSaveMachineGoal = async (machineName: string, shiftName: string, goalMet: boolean, abatementPercent: number) => {
    if (isReadOnly) return;
    const goalId = `${machineName}_${shiftName}_${selectedPeriod}`;
    const payload: MachineGoalConfig = {
      id: goalId,
      machine: machineName,
      shift: shiftName,
      cyclePeriod: selectedPeriod,
      goalMet,
      abatementPercent,
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'bonus_machine_goals', goalId), payload);
      setMachineGoals(prev => ({ ...prev, [goalId]: payload }));
      try {
        localStorage.setItem('cached_bonus_machine_goals', JSON.stringify({ ...machineGoals, [goalId]: payload }));
      } catch {
        // ignore
      }
    } catch (err) {
      console.error('Erro ao salvar meta de máquina:', err);
      setMachineGoals(prev => ({ ...prev, [goalId]: payload }));
      localStorage.setItem('cached_bonus_machine_goals', JSON.stringify({ ...machineGoals, [goalId]: payload }));
    }
  };

  // Exportar Relatório em PDF
  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    const cycleInfo = getAvailablePayrollCycles().find(c => c.key === selectedPeriod);

    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('MANUPACKAGING DA AMAZÔNIA - APURAÇÃO DE BÔNUS DE PRODUÇÃO', 14, 14);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Período: ${cycleInfo ? cycleInfo.label : selectedPeriod} | Meta Base: R$ ${baseBonusAmount.toFixed(2)} | Total Colaboradores do Quadro: ${summaryStats.totalCount}`, 14, 20);
    doc.text(`Aptos (100%): ${summaryStats.integralCount} | Parciais: ${summaryStats.parcialCount} | Zerados: ${summaryStats.zeradoCount} | Total Folha: R$ ${summaryStats.totalPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, 25);

    const tableRows = filteredCalculations.map(item => [
      item.employee.registration || '-',
      item.employee.name,
      item.employee.sector || 'Geral',
      item.employee.machine || '-',
      item.employee.shift || 'Padrão',
      item.employee.role || '-',
      item.atestadosCount > 0 ? `Sim (${item.atestadosCount})` : 'Não',
      item.faltasInjustificadasCount > 0 ? `${item.faltasInjustificadasCount}` : '0',
      item.atrasosInjustificadosCount > 0 ? `${item.atrasosInjustificadosCount}` : '0',
      item.machinePenaltyApplied > 0 ? `-${item.machinePenaltyApplied}%` : 'Ok',
      item.statusBadge === 'zerado' ? 'ZERADO (0%)' : item.statusBadge === 'parcial' ? `PARCIAL (${100 - item.totalDiscountPercent}%)` : 'INTEGRAL (100%)',
      `R$ ${item.finalBonusAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: 30,
      head: [['Matrícula', 'Colaborador', 'Setor', 'Máquina', 'Turno', 'Cargo', 'Atestado', 'Faltas', 'Atrasos', 'Meta Equipe', 'Status', 'Valor Final']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 1.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    doc.save(`Relatorio_Bonus_Producao_${selectedPeriod}.pdf`);
  };

  // Exportar CSV
  const handleExportCSV = () => {
    const headers = ['Matrícula', 'Colaborador', 'Setor', 'Máquina', 'Turno', 'Cargo', 'Atestados', 'Faltas Injustificadas', 'Atrasos Injustificados', 'Desconto %', 'Status', 'Valor Bônus (R$)'];
    
    const rows = filteredCalculations.map(item => [
      `"${item.employee.registration || ''}"`,
      `"${item.employee.name}"`,
      `"${item.employee.sector || ''}"`,
      `"${item.employee.machine || ''}"`,
      `"${item.employee.shift || ''}"`,
      `"${item.employee.role || ''}"`,
      item.atestadosCount,
      item.faltasInjustificadasCount,
      item.atrasosInjustificadosCount,
      `${item.totalDiscountPercent}%`,
      `"${item.statusBadge.toUpperCase()}"`,
      item.finalBonusAmount.toFixed(2).replace('.', ',')
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bonus_Producao_${selectedPeriod}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Impressão Direta da Apuração Oficial
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-2.5 pb-6 animate-in fade-in duration-200 font-sans">
      
      {/* ============================================================== */}
      {/* ============================================================== */}
      {/* CABEÇALHO COMPACTO E LIMPO COM APENAS ELEMENTOS ESSENCIAIS */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl p-3 sm:p-3.5 border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-xs shadow-amber-500/20 shrink-0">
            <Award size={18} />
          </div>
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">
              Gestão de Bônus de Produção
            </h2>
            <button
              type="button"
              onClick={() => setIsRulesModalOpen(true)}
              className="w-5 h-5 rounded-full bg-slate-100 hover:bg-amber-100 text-slate-400 hover:text-amber-700 flex items-center justify-center transition-all cursor-pointer shrink-0"
              title="Ver regras oficiais de corte e abatimento do bônus"
              aria-label="Regras do Bônus"
            >
              <HelpCircle size={12} />
            </button>
          </div>
        </div>

        {/* Grupo de Ações Essenciais: Menu, Data, Meta e Ocorrência */}
        <div className="flex flex-wrap items-center gap-2">
          {/* MENU SUSPENSO DE AÇÕES (IMPRESSÃO, PDF, CSV) */}
          <div className="relative" ref={actionsMenuRef}>
            <button
              type="button"
              onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
              className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider border cursor-pointer active:scale-95 shadow-2xs ${
                isActionsMenuOpen
                  ? 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-500/20'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
              title="Menu de opções: Impressão, Relatório PDF e Excel CSV"
            >
              <SlidersHorizontal size={13} className="text-slate-600" />
              <span>Menu</span>
              <ChevronDown size={12} className={`text-slate-400 transition-transform ${isActionsMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isActionsMenuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* 1. Impressão */}
                <button
                  type="button"
                  onClick={() => {
                    setIsActionsMenuOpen(false);
                    handlePrint();
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Printer size={15} className="text-slate-700 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-black uppercase text-[11px]">Impressão</span>
                    <span className="text-[9px] text-slate-400 font-normal">Imprimir apuração em papel</span>
                  </div>
                </button>

                {/* 2. Relatório PDF */}
                <button
                  type="button"
                  onClick={() => {
                    setIsActionsMenuOpen(false);
                    handleExportPDF();
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FileText size={15} className="text-blue-600 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-black uppercase text-[11px]">Relatório PDF</span>
                    <span className="text-[9px] text-slate-400 font-normal">Baixar folha oficial consolidada</span>
                  </div>
                </button>

                {/* 3. Exportar Excel CSV */}
                <button
                  type="button"
                  onClick={() => {
                    setIsActionsMenuOpen(false);
                    handleExportCSV();
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet size={15} className="text-emerald-600 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-black uppercase text-[11px]">Excel (CSV)</span>
                    <span className="text-[9px] text-slate-400 font-normal">Exportar dados tabulados</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Seletor de Período da Folha */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <Calendar size={13} className="text-blue-600 shrink-0" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-transparent text-[11px] font-black text-slate-700 outline-none cursor-pointer"
            >
              {getAvailablePayrollCycles().map(c => (
                <option key={c.key} value={c.key}>
                  {c.shortLabel} {c.isCurrent ? '⭐' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Configuração da Meta Base R$ 250 */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <span className="text-[9.5px] font-black text-slate-400 uppercase">Meta:</span>
            <span className="text-[11px] font-bold text-slate-500">R$</span>
            <input
              type="number"
              min={0}
              value={baseBonusAmount}
              onChange={(e) => setBaseBonusAmount(Number(e.target.value) || 0)}
              className="w-12 bg-transparent font-black text-[11px] text-slate-800 outline-none p-0 border-none"
              title="Valor estimado da meta mensal de bônus por colaborador"
            />
          </div>

          {/* Botão Registrar Ocorrência */}
          {canManage && (
            <button
              type="button"
              onClick={() => handleOpenIncidentModal()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1 text-[11px] font-black uppercase tracking-wider shadow-xs shadow-blue-600/20 shrink-0"
              title="Lançar Atestado, Falta, Atraso ou Penalidade de Meta"
            >
              <Plus size={13} />
              <span>Ocorrência</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* CARDS DE INDICADORES EXECUTIVOS (COMPACTOS E DIRECIONADOS) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-2.5">
        
        {/* Card 1: Total da Folha & Colaboradores do Quadro */}
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Folha de Bônus</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Award size={13} />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
            R$ {summaryStats.totalPayable.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[9px]">
            <span className="text-slate-500 font-bold">{summaryStats.totalCount} no Quadro Geral</span>
            <span className="text-emerald-700 font-black">{summaryStats.operadoresCount} Op. • {summaryStats.auxiliaresCount} Aux.</span>
          </div>
        </div>

        {/* Card 2: Bônus Integral (100%) */}
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Bônus Integral (100%)</span>
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <CheckCircle2 size={13} />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-blue-600 tracking-tight mt-0.5">
            {summaryStats.integralCount} <span className="text-[11px] text-slate-400 font-semibold">colab.</span>
          </div>
          <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[9px]">
            <span className="text-slate-500 font-bold">Sem faltas ou atestados</span>
            <span className="text-blue-700 font-black">R$ {baseBonusAmount.toFixed(2)}/cada</span>
          </div>
        </div>

        {/* Card 3: Bônus Parcial (Abatimento de Meta) */}
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Bônus Parcial</span>
            <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <AlertTriangle size={13} />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-amber-600 tracking-tight mt-0.5">
            {summaryStats.parcialCount} <span className="text-[11px] text-slate-400 font-semibold">colab.</span>
          </div>
          <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[9px]">
            <span className="text-slate-500 font-bold">1 atraso ou meta máq.</span>
            <span className="text-amber-700 font-black">Abatido</span>
          </div>
        </div>

        {/* Card 4: Bônus Zerados (0%) */}
        <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Bônus Zerados (0%)</span>
            <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <XCircle size={13} />
            </div>
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-600 tracking-tight mt-0.5">
            {summaryStats.zeradoCount} <span className="text-[11px] text-slate-400 font-semibold">colab.</span>
          </div>
          <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[9px]">
            <span className="text-slate-500 font-bold">Atestado, falta ou atrasos</span>
            <span className="text-rose-700 font-black">Corte 100%</span>
          </div>
        </div>

      </div>

      {/* ============================================================== */}
      {/* SELETOR DE SUB-ABAS (COMPACTO) */}
      {/* ============================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('ranking')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'ranking'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users size={14} />
            <span>Apuração do Quadro Geral ({filteredCalculations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('machines')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'machines'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers size={14} />
            <span>Metas por Máquina & Turno</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('incidents')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'incidents'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldAlert size={14} />
            <span>Ocorrências ({periodIncidents.length})</span>
          </button>
        </div>

        <div className="text-[10px] text-slate-400 font-bold px-2 hidden md:block">
          {summaryStats.feriasCount > 0 ? `* ${summaryStats.feriasCount} colaborador em férias incluso no quadro` : ''}
        </div>
      </div>

      {/* ============================================================== */}
      {/* ABA 1: TABELA GERAL DE APURAÇÃO (APENAS QUADRO GERAL DE PESSOAL) */}
      {/* ============================================================== */}
      {activeTab === 'ranking' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-3 p-4">
          
          {/* BARRA DE FILTROS INTEGRADOS E COMPACTOS */}
          <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-100">
            {/* Campo de Busca */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por colaborador, matrícula..."
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filtro de Máquina */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
              <Layers size={13} className="text-slate-500 shrink-0" />
              <select
                value={filterMachine}
                onChange={(e) => setFilterMachine(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer"
              >
                <option value="todas">Todas Máquinas</option>
                {availableMachines.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Filtro de Turno */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
              <Clock size={13} className="text-slate-500 shrink-0" />
              <select
                value={filterShift}
                onChange={(e) => setFilterShift(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer"
              >
                <option value="todos">Todos Turnos</option>
                {availableShifts.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Filtro de Setor */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
              <Filter size={13} className="text-slate-500 shrink-0" />
              <select
                value={filterSector}
                onChange={(e) => setFilterSector(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer"
              >
                <option value="todos">Todos Setores</option>
                {availableSectors.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Filtro de Status de Bônus */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
              <Award size={13} className="text-amber-500 shrink-0" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer"
              >
                <option value="todos">Todos Status</option>
                <option value="integral">Integral (100%)</option>
                <option value="parcial">Parcial (Abatido)</option>
                <option value="zerado">Zerado (0%)</option>
              </select>
            </div>

            {/* Limpar Filtros */}
            {(searchTerm || filterSector !== 'todos' || filterMachine !== 'todas' || filterShift !== 'todos' || filterStatus !== 'todos') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterSector('todos');
                  setFilterMachine('todas');
                  setFilterShift('todos');
                  setFilterStatus('todos');
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <X size={11} />
                <span>Limpar</span>
              </button>
            )}
          </div>

          {/* TABELA DE APURAÇÃO COMPACTA */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[9.5px] font-black border-b border-slate-200">
                  <th className="px-3 py-2.5">Colaborador / Matrícula</th>
                  <th className="px-2.5 py-2.5">Máquina & Turno</th>
                  <th className="px-2.5 py-2.5">Função</th>
                  <th className="px-2 py-2.5 text-center">Atestados</th>
                  <th className="px-2 py-2.5 text-center">Faltas</th>
                  <th className="px-2 py-2.5 text-center">Atrasos</th>
                  <th className="px-2.5 py-2.5 text-center">Meta Equipe</th>
                  <th className="px-3 py-2.5 text-right">Desconto</th>
                  <th className="px-3 py-2.5 text-right">Bônus a Receber</th>
                  <th className="px-2.5 py-2.5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredCalculations.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                      Nenhum colaborador encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredCalculations.map((item) => {
                    const emp = item.employee;
                    const isOp = (emp.role || '').toLowerCase().includes('operador');
                    const isAux = (emp.role || '').toLowerCase().includes('auxiliar');
                    const isFerias = (emp.status || '').toLowerCase().includes('férias') || (emp.status || '').toLowerCase().includes('ferias');

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                        
                        {/* Colaborador */}
                        <td className="px-3 py-2">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-slate-900 uppercase text-xs">
                                {emp.name}
                              </span>
                              {isFerias && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 text-[8px] font-black uppercase border border-amber-200">
                                  Férias
                                </span>
                              )}
                            </div>
                            <span className="text-[9.5px] text-slate-400 font-semibold">
                              Matrícula: {emp.registration || '-'} • {emp.sector || 'Geral'}
                            </span>
                          </div>
                        </td>

                        {/* Máquina & Turno */}
                        <td className="px-2.5 py-2">
                          <div className="flex flex-col">
                            {emp.machine ? (
                              <span className="font-black text-blue-700 text-[11px] uppercase">
                                {emp.machine}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">Geral</span>
                            )}
                            <span className="text-[9.5px] text-slate-500 font-bold">
                              {emp.shift || 'Padrão'}
                            </span>
                          </div>
                        </td>

                        {/* Cargo */}
                        <td className="px-2.5 py-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            isOp 
                              ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                              : isAux 
                              ? 'bg-orange-50 text-orange-700 border border-orange-200' 
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {isOp ? <HardHat size={10} /> : <Briefcase size={10} />}
                            {emp.role || 'Colaborador'}
                          </span>
                        </td>

                        {/* Atestados */}
                        <td className="px-2 py-2 text-center">
                          {item.atestadosCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                              <ShieldAlert size={10} /> {item.atestadosCount}x
                            </span>
                          ) : (
                            <span className="text-slate-300 font-semibold text-[11px]">-</span>
                          )}
                        </td>

                        {/* Faltas */}
                        <td className="px-2 py-2 text-center">
                          {item.faltasInjustificadasCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                              <XCircle size={10} /> {item.faltasInjustificadasCount}x
                            </span>
                          ) : item.faltasJustificadasCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              <FileCheck size={10} className="text-emerald-600" /> {item.faltasJustificadasCount}x
                            </span>
                          ) : (
                            <span className="text-slate-300 font-semibold text-[11px]">-</span>
                          )}
                        </td>

                        {/* Atrasos */}
                        <td className="px-2 py-2 text-center">
                          {item.atrasosInjustificadosCount >= 2 ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-black bg-rose-100 text-rose-800 border border-rose-200" title="Atrasos sucessivos cortam 100% do bônus">
                              <AlertOctagon size={10} /> {item.atrasosInjustificadosCount}x
                            </span>
                          ) : item.atrasosInjustificadosCount === 1 ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200" title="1º atraso injustificado (-25%)">
                              <Clock size={10} /> 1x
                            </span>
                          ) : item.atrasosJustificadosCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              <FileCheck size={10} className="text-blue-500" /> {item.atrasosJustificadosCount}x
                            </span>
                          ) : (
                            <span className="text-slate-300 font-semibold text-[11px]">-</span>
                          )}
                        </td>

                        {/* Meta da Equipe / Máquina */}
                        <td className="px-2.5 py-2 text-center">
                          {item.machinePenaltyApplied > 0 ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-black bg-purple-100 text-purple-800 border border-purple-200" title={item.machinePenaltyReason}>
                              <Layers size={10} /> -{item.machinePenaltyApplied}%
                            </span>
                          ) : emp.machine ? (
                            <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-600">
                              <CheckCircle2 size={11} /> Ok
                            </span>
                          ) : (
                            <span className="text-slate-300 text-[9.5px]">-</span>
                          )}
                        </td>

                        {/* Desconto */}
                        <td className="px-3 py-2 text-right">
                          {item.totalDiscountPercent === 0 ? (
                            <span className="text-emerald-700 font-black text-xs">
                              0%
                            </span>
                          ) : (
                            <div className="flex flex-col items-end">
                              <span className={`font-black text-xs ${item.totalDiscountPercent >= 100 ? 'text-rose-600' : 'text-amber-600'}`}>
                                -{item.totalDiscountPercent}%
                              </span>
                              {item.zeroReason && (
                                <span className="text-[8.5px] text-rose-500 font-bold max-w-[120px] truncate" title={item.zeroReason}>
                                  {item.zeroReason}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Bônus Final */}
                        <td className="px-3 py-2 text-right">
                          {item.statusBadge === 'zerado' ? (
                            <div className="flex flex-col items-end">
                              <span className="text-xs font-black text-rose-600">
                                R$ 0,00
                              </span>
                              <span className="text-[8px] text-rose-400 font-bold uppercase">
                                Zerado
                              </span>
                            </div>
                          ) : item.statusBadge === 'parcial' ? (
                            <div className="flex flex-col items-end">
                              <span className="text-xs font-black text-amber-700">
                                R$ {item.finalBonusAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[8px] text-amber-500 font-bold uppercase">
                                Parcial
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-end">
                              <span className="text-xs font-black text-emerald-700">
                                R$ {item.finalBonusAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[8px] text-emerald-500 font-bold uppercase">
                                Integral (100%)
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Ações */}
                        <td className="px-2.5 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setViewEmployeeHistory(emp)}
                              className="p-1 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-md transition-colors cursor-pointer"
                              title="Ver histórico de ocorrências"
                            >
                              <FileText size={13} />
                            </button>
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => handleOpenIncidentModal(emp)}
                                className="p-1 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-md transition-colors cursor-pointer"
                                title="Lançar Atestado, Falta ou Atraso"
                              >
                                <Plus size={13} />
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 2: METAS POR MÁQUINA E TURNO (REGRA DO USUÁRIO) */}
      {/* ============================================================== */}
      {activeTab === 'machines' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-4">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
              <Layers size={15} className="text-blue-600" />
              Metas de Produção por Máquina & Turno
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Conforme a regra industrial, quando uma máquina e turno não atingem a meta de produção, o abatimento se aplica exclusivamente à equipe escalada naquele turno e máquina (ex: Cast 1 - Diurno 1 com Marcelo, Railan, Maxi e Márcio).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dynamicMachineShiftPairs.map(({ machine, shift }) => {
              const goalKey = `${machine}_${shift}_${selectedPeriod}`;
              const goalCfg = machineGoals[goalKey] || {
                id: goalKey,
                machine,
                shift,
                cyclePeriod: selectedPeriod,
                goalMet: true,
                abatementPercent: 30
              };

              // Colaboradores específicos escalados nesta máquina e turno do Quadro Geral
              const teamMembers = eligibleBoardCollaborators.filter(e => {
                const m = (e.machine || '').trim().toLowerCase();
                const s = (e.shift || '').trim().toLowerCase();
                const targetM = machine.toLowerCase();
                const targetS = shift.toLowerCase();
                const matchM = m === targetM || 
                  (targetM === 'ghezzi' && (m === 'ghezz' || m === 'ghezzi')) ||
                  (targetM === 'wultec' && (m === 'wutec' || m === 'wultec')) ||
                  (targetM === 'erema 1' && (m === 'erema' || m === 'erema 1'));
                return matchM && s === targetS;
              });

              return (
                <div key={`${machine}_${shift}`} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                        {machine} • {shift}
                      </h4>
                      <span className="text-[9.5px] text-slate-400 font-bold uppercase">
                        {teamMembers.length} colaborador(es) nesta equipe
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                      goalCfg.goalMet ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {goalCfg.goalMet ? 'Meta Cumprida' : `Abatimento (-${goalCfg.abatementPercent}%)`}
                    </span>
                  </div>

                  {/* Lista de colaboradores da equipe */}
                  <div className="bg-white p-2.5 rounded-xl border border-slate-150 text-[10px] space-y-1">
                    <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block">Equipe Escalada:</span>
                    <div className="flex flex-wrap gap-1">
                      {teamMembers.length === 0 ? (
                        <span className="text-slate-400 text-[10px]">Sem operadores alocados neste turno</span>
                      ) : (
                        teamMembers.map(m => {
                          const isOperator = m.role && /operador/i.test(m.role) && !/auxiliar/i.test(m.role);
                          const roleTag = isOperator ? 'Op' : 'Aux';
                          return (
                            <span key={m.id} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[9.5px]">
                              {m.name.split(' ')[0]} ({roleTag})
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Controles para Alternar Cumprimento de Meta */}
                  {canManage && (
                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-[10px] font-bold text-slate-600">Status:</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSaveMachineGoal(machine, shift, true, 0)}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase cursor-pointer transition-all ${
                            goalCfg.goalMet
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          100% Ok
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveMachineGoal(machine, shift, false, goalCfg.abatementPercent || 30)}
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase cursor-pointer transition-all ${
                            !goalCfg.goalMet
                              ? 'bg-rose-600 text-white shadow-2xs'
                              : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          Não Atingida
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 3: HISTÓRICO DE OCORRÊNCIAS LANÇADAS */}
      {/* ============================================================== */}
      {activeTab === 'incidents' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                <ShieldAlert size={15} className="text-amber-600" />
                Histórico de Ocorrências • Ciclo {selectedPeriod}
              </h3>
              <p className="text-[10.5px] text-slate-500">
                Atestados médicos, faltas e atrasos registrados no período.
              </p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => handleOpenIncidentModal()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer flex items-center gap-1 shadow-xs transition-all"
              >
                <Plus size={13} />
                <span>Nova Ocorrência</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[9.5px] font-black border-b border-slate-200">
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Colaborador / Alvo</th>
                  <th className="px-2.5 py-2">Tipo</th>
                  <th className="px-3 py-2">Justificativa / Documento</th>
                  <th className="px-3 py-2">Motivo / Descrição</th>
                  <th className="px-2 py-2 text-center">Impacto</th>
                  {canManage && <th className="px-2 py-2 text-center">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periodIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Nenhuma ocorrência registrada para o período selecionado.
                    </td>
                  </tr>
                ) : (
                  periodIncidents.map(inc => (
                    <tr key={inc.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-3 py-2 font-mono font-bold text-slate-700 text-xs">
                        {inc.date ? inc.date.split('-').reverse().join('/') : '-'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 uppercase text-xs">
                            {inc.employeeName}
                          </span>
                          <span className="text-[9.5px] text-slate-400">
                            {inc.sector} {inc.machine ? `• ${inc.machine}` : ''} {inc.shift ? `(${inc.shift})` : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-2.5 py-2">
                        {inc.type === 'atestado' && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                            Atestado Médico
                          </span>
                        )}
                        {inc.type === 'falta_injustificada' && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                            Falta Injustificada
                          </span>
                        )}
                        {inc.type === 'falta_justificada' && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Falta Justificada
                          </span>
                        )}
                        {inc.type === 'atraso_injustificado' && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Atraso Injustificado
                          </span>
                        )}
                        {inc.type === 'atraso_justificado' && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            Atraso Justificado
                          </span>
                        )}
                        {inc.type === 'meta_maquina_nao_atingida' && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                            Meta {inc.targetMachine} {inc.targetShift ? `(${inc.targetShift})` : ''}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {inc.isJustified ? (
                          <div className="flex flex-col text-emerald-700">
                            <span className="font-bold flex items-center gap-1 text-[10px]">
                              <FileCheck size={11} /> Justificado com Doc
                            </span>
                            {inc.documentNumber && (
                              <span className="text-[9.5px] text-slate-500 font-mono">
                                {inc.documentNumber} {inc.documentDetails ? `• ${inc.documentDetails}` : ''}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-rose-600 font-bold text-[10px] flex items-center gap-1">
                            <XCircle size={11} /> Sem Justificativa
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-700 font-medium text-xs">
                        {inc.description}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {inc.type === 'atestado' || inc.type === 'falta_injustificada' ? (
                          <span className="font-black text-rose-600 text-xs">Corta 100%</span>
                        ) : inc.type === 'atraso_injustificado' ? (
                          <span className="font-bold text-amber-600 text-xs">-25% (ou 100% se 2+)</span>
                        ) : inc.type === 'meta_maquina_nao_atingida' ? (
                          <span className="font-black text-purple-700 text-xs">-{inc.penaltyRatePercent || 50}%</span>
                        ) : (
                          <span className="font-bold text-emerald-600 text-xs">Abonado</span>
                        )}
                      </td>
                      {canManage && (
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteIncident(inc.id)}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                            title="Remover ocorrência"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: REGISTRAR NOVA OCORRÊNCIA */}
      {/* ============================================================== */}
      {isIncidentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <ShieldAlert size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">
                    Registrar Ocorrência de Bônus
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Ciclo: {selectedPeriod}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsIncidentModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveIncident} className="space-y-3 mt-3">
              
              {/* Tipo de Ocorrência */}
              <div>
                <label className="block text-[10.5px] font-black uppercase text-slate-700 tracking-wider mb-1">
                  Tipo de Ocorrência
                </label>
                <select
                  value={formType}
                  onChange={(e) => {
                    const val = e.target.value as BonusIncidentType;
                    setFormType(val);
                    if (val === 'atestado' || val === 'falta_injustificada') {
                      setFormIsJustified(false);
                      setFormPenaltyRate(100);
                    } else if (val === 'atraso_injustificado') {
                      setFormIsJustified(false);
                      setFormPenaltyRate(25);
                    } else if (val === 'atraso_justificado' || val === 'falta_justificada') {
                      setFormIsJustified(true);
                      setFormPenaltyRate(0);
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="atestado">🏥 Atestado Médico (Corta 100% do bônus)</option>
                  <option value="falta_injustificada">🚫 Falta Não Justificada (Corta 100% do bônus)</option>
                  <option value="falta_justificada">📄 Falta Justificada com Documento (Abonado)</option>
                  <option value="atraso_injustificado">⏰ Atraso Sem Justificativa (Sucessivos zeram o bônus)</option>
                  <option value="atraso_justificado">📑 Atraso Justificado com Documento (Abonado)</option>
                  <option value="meta_maquina_nao_atingida">⚙️ Meta Não Atingida por Máquina & Turno</option>
                </select>
              </div>

              {/* Seleção do Colaborador do Quadro Geral */}
              {formType !== 'meta_maquina_nao_atingida' ? (
                <div>
                  <label className="block text-[10.5px] font-black uppercase text-slate-700 tracking-wider mb-1">
                    Colaborador do Quadro Geral ({eligibleBoardCollaborators.length} aptos)
                  </label>
                  <select
                    value={formEmployeeId}
                    onChange={(e) => setFormEmployeeId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">-- Selecione o Colaborador --</option>
                    {eligibleBoardCollaborators.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role || 'Colaborador'} • {emp.machine ? `${emp.machine} • ` : ''}{emp.shift || 'Padrão'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10.5px] font-black uppercase text-slate-700 tracking-wider mb-1">
                      Máquina Alvo
                    </label>
                    <select
                      value={formTargetMachine}
                      onChange={(e) => setFormTargetMachine(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 outline-none cursor-pointer"
                    >
                      {availableMachines.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-black uppercase text-slate-700 tracking-wider mb-1">
                      Turno Alvo
                    </label>
                    <select
                      value={formTargetShift}
                      onChange={(e) => setFormTargetShift(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 outline-none cursor-pointer"
                    >
                      {STANDARD_SHIFTS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Data e Desconto */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10.5px] font-black uppercase text-slate-700 tracking-wider mb-1">
                    Data da Ocorrência
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10.5px] font-black uppercase text-slate-700 tracking-wider mb-1">
                    % Abatimento / Penalidade
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formPenaltyRate}
                    onChange={(e) => setFormPenaltyRate(Number(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-black text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Documento / Comprovante */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-black uppercase text-slate-700">
                    Comprovante Oficial / Documento
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formIsJustified}
                      onChange={(e) => setFormIsJustified(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Possui Documento Válido</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formDocNumber}
                    onChange={(e) => setFormDocNumber(e.target.value)}
                    placeholder="Nº Atestado / CRM / Protocolo"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none"
                  />
                  <input
                    type="text"
                    value={formDocDetails}
                    onChange={(e) => setFormDocDetails(e.target.value)}
                    placeholder="Clínica / Emissor / CID"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-[10.5px] font-black uppercase text-slate-700 tracking-wider mb-1">
                  Observações Detalhadas
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Descreva o motivo da ausência, atraso ou não cumprimento de meta..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 outline-none resize-none"
                />
              </div>

              {/* Botões do Formulário */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsIncidentModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-xs transition-all cursor-pointer"
                >
                  Salvar Ocorrência
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: HISTÓRICO DO COLABORADOR */}
      {/* ============================================================== */}
      {viewEmployeeHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 space-y-3">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">
                  {viewEmployeeHistory.name}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase">
                  Matrícula: {viewEmployeeHistory.registration || '-'} • {viewEmployeeHistory.machine ? `${viewEmployeeHistory.machine} • ` : ''}{viewEmployeeHistory.shift || 'Padrão'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewEmployeeHistory(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 block">
                Ocorrências no Ciclo {selectedPeriod}:
              </span>
              {periodIncidents.filter(i => 
                i.employeeId === viewEmployeeHistory.id || 
                (i.registration && viewEmployeeHistory.registration && i.registration === viewEmployeeHistory.registration)
              ).length === 0 ? (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold text-center">
                  ✅ Nenhuma ocorrência! Bônus integral de 100% (R$ {baseBonusAmount.toFixed(2)}).
                </div>
              ) : (
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {periodIncidents.filter(i => 
                    i.employeeId === viewEmployeeHistory.id || 
                    (i.registration && viewEmployeeHistory.registration && i.registration === viewEmployeeHistory.registration)
                  ).map(inc => (
                    <div key={inc.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 font-mono text-[10.5px]">
                          {inc.date ? inc.date.split('-').reverse().join('/') : '-'}
                        </span>
                        <span className={`px-2 py-0.2 rounded-full text-[8.5px] font-black uppercase ${
                          inc.type === 'atestado' || inc.type === 'falta_injustificada' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {inc.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">{inc.description}</p>
                      {inc.documentNumber && (
                        <div className="text-[9.5px] text-slate-500 font-mono pt-1">
                          Doc: {inc.documentNumber}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewEmployeeHistory(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: REGRAS DO BÔNUS */}
      {/* ============================================================== */}
      {isRulesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 space-y-3">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Award size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">
                    Regulamento Oficial do Bônus
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">
                    Meta Base: R$ {baseBonusAmount.toFixed(2)} • Quadro Geral de Pessoal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRulesModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-0.5">
                <span className="font-black text-blue-900 uppercase text-[10.5px]">
                  Público-Alvo
                </span>
                <p className="text-slate-700 text-[11px]">
                  Aplica-se aos colaboradores efetivos do Quadro Geral (operadores e auxiliares). Cargos de gestão e liderança não participam deste bônus de produção.
                </p>
              </div>

              <div className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-0.5">
                <span className="font-black text-rose-800 uppercase text-[10.5px]">
                  Atestados e Faltas Não Justificadas
                </span>
                <p className="text-slate-700 text-[11px]">
                  Qualquer apresentação de atestado médico ou falta injustificada no mês <strong>corta 100% do bônus</strong> (R$ 0,00). Faltas comprovadas com documento legal são abonadas.
                </p>
              </div>

              <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-0.5">
                <span className="font-black text-amber-800 uppercase text-[10.5px]">
                  Atrasos Sucessivos
                </span>
                <p className="text-slate-700 text-[11px]">
                  2 ou mais atrasos não justificados no mesmo mês <strong>cortam 100% do bônus</strong>. 1 atraso isolado acarreta abatimento de 25%. Atrasos documentados são abonados.
                </p>
              </div>

              <div className="p-2.5 bg-purple-50/70 border border-purple-200 rounded-xl space-y-0.5">
                <span className="font-black text-purple-800 uppercase text-[10.5px]">
                  Regra de Equipe por Máquina & Turno
                </span>
                <p className="text-slate-700 text-[11px]">
                  Se a máquina e turno não atingirem a meta produtiva, o desconto aplica-se exclusivamente aos colaboradores escalados naquele turno e máquina (ex: Cast 1 Diurno 1 com Marcelo, Railan, Maxi e Márcio).
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsRulesModalOpen(false)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase cursor-pointer"
              >
                Entendido
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
