import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Clock, Calendar, User, Users, FileText, CheckCircle2, AlertCircle, 
  Plus, Trash2, Edit2, Search, Filter, ArrowLeft, Loader2, 
  Printer, Check, X, Building2, Briefcase, ChevronRight, ChevronDown,
  Download, Eye, AlertTriangle, ShieldCheck, History, Info,
  Share2, Copy, Percent, Sparkles, UserCheck, RefreshCw, FileSpreadsheet,
  Sun, Moon
} from 'lucide-react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../lib/firebase';
import { Employee, OvertimeEntry, OvertimeMode, SystemUser } from '../types';
import ConfirmDialog from './ConfirmDialog';
import {
  PAYROLL_CUTOFF_DAY,
  COMMERCIAL_DURATION_MINUTES,
  COMMERCIAL_FLEXIBLE_DURATION_MINUTES,
  SHIFT_RULES,
  getCanonicalShiftCategory,
  calculateCommercialFlexibleEnd,
  calculateOvertimeHoursDetailed,
  formatOvertimeDisplay,
  getPayrollCycleFromDate,
  getCurrentPayrollCycle,
  getCurrentPayrollCycleKey,
  getPayrollCycleByKey,
  isDateInPayrollCycle,
  formatPayrollMonthLabel,
  PayrollCycle,
  timeStringToMinutes,
  minutesToTimeString
} from '../utils/shiftUtils';

interface OvertimeEntriesProps {
  employees: Employee[];
  loggedUser: SystemUser | null;
  onClose: () => void;
  canManage: boolean;
  isReadOnly?: boolean;
  onBlockedAction?: (title?: string, message?: string) => void;
  onNavigateToRequests?: () => void;
}

const SECTORS_LIST = [
  'Extrusão',
  'Corte de Fita',
  'Reciclagem',
  'Liderança',
  'Manutenção',
  'Expedição',
  'Qualidade',
  'Outro'
];

const QUICK_REASONS = [
  'Atendimento de demanda de produção',
  'Manutenção corretiva ou intervenção emergencial',
  'Continuidade de processo e setup',
  'Carregamento ou expedição prioritária',
  'Inventário de fábrica e galpão',
  'Cobertura de ausência / atestado',
  'Atrasos ou ocorrências operacionais',
  'Outras atividades extraordinárias'
];

export const OvertimeEntries: React.FC<OvertimeEntriesProps> = ({
  employees,
  loggedUser,
  onClose,
  canManage,
  isReadOnly = false,
  onBlockedAction,
  onNavigateToRequests
}) => {
  const [entries, setEntries] = useState<OvertimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modais
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingEntry, setEditingEntry] = useState<OvertimeEntry | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterSector, setFilterSector] = useState<string>('todos');
  const [filterShift, setFilterShift] = useState<string>('todos');
  const [filterMode, setFilterMode] = useState<string>('todos');
  const [filterMonth, setFilterMonth] = useState<string>(() => getCurrentPayrollCycleKey());

  // Campos do Formulário de Lançamento
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [registration, setRegistration] = useState<string>('');
  const [employeeName, setEmployeeName] = useState<string>('');
  const [employeeSearchText, setEmployeeSearchText] = useState<string>('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState<boolean>(false);
  const [role, setRole] = useState<string>('');
  const [sector, setSector] = useState<string>('Extrusão');
  const [machine, setMachine] = useState<string>('');
  const [shift, setShift] = useState<string>('Comercial');
  
  // Data (padrão hoje, totalmente editável)
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // PARÂMETROS OFICIAIS DE PROGRAMAÇÃO E REGRA DE TURNO
  const [overtimeMode, setOvertimeMode] = useState<OvertimeMode>('pos_turno');
  const [shiftTypeChoice, setShiftTypeChoice] = useState<'Comercial' | 'Diurno' | 'Noturno'>('Comercial');
  const [isCommercialFlexible, setIsCommercialFlexible] = useState<boolean>(false);
  const [customFlexibleStart, setCustomFlexibleStart] = useState<string>('07:30');
  const [calculatedNormalEnd, setCalculatedNormalEnd] = useState<string>('17:18');
  const [overtimeExplanation, setOvertimeExplanation] = useState<string>('');
  const [autoCalculateHours, setAutoCalculateHours] = useState<boolean>(true);

  // Horários de Início e Término
  const [startTime, setStartTime] = useState<string>('07:30');
  const [endTime, setEndTime] = useState<string>('19:18');

  // Cálculos automáticos
  const [workingHours, setWorkingHours] = useState<number>(11.8);
  const [workingHoursFormatted, setWorkingHoursFormatted] = useState<string>('11h 48min');
  const [overtimeHours, setOvertimeHours] = useState<number>(2);
  const [overtimeMinutes, setOvertimeMinutes] = useState<number>(120);
  const [displayOvertimeValue, setDisplayOvertimeValue] = useState<string>('2,00');
  const [overtimeUnit, setOvertimeUnit] = useState<'minutos' | 'horas'>('horas');
  const [overtimeHoursFormatted, setOvertimeHoursFormatted] = useState<string>('2h 00min');
  const [overtimePercentage, setOvertimePercentage] = useState<number>(50);
  const [equivalentHours, setEquivalentHours] = useState<number>(3);

  // Justificativa e observações
  const [reason, setReason] = useState<string>('');
  const [requestedBy, setRequestedBy] = useState<string>(() => loggedUser?.name || 'Líder de Produção');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Relação de motivos customizados gravados no sistema
  const [customReasons, setCustomReasons] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('overtime_custom_reasons');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      // ignore
    }
    return [];
  });
  const [showReasonDropdown, setShowReasonDropdown] = useState<boolean>(false);

  // Escuta em tempo real no Firestore da coleção `overtime_reasons`
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'overtime_reasons'),
      (snapshot) => {
        const list = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            return (data.reason || '').trim();
          })
          .filter((r) => r.length > 0);

        if (list.length > 0) {
          setCustomReasons((prev) => {
            const combined = Array.from(new Set([...prev, ...list]));
            try {
              localStorage.setItem('overtime_custom_reasons', JSON.stringify(combined));
            } catch (e) {}
            return combined;
          });
        }
      },
      (err) => {
        console.warn('Erro ao sincronizar overtime_reasons:', err);
      }
    );
    return () => unsub();
  }, []);

  // Escuta em tempo real no Firestore da coleção `overtime_entries`
  useEffect(() => {
    setIsLoading(true);
    const unsub = onSnapshot(
      collection(db, 'overtime_entries'),
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        })) as OvertimeEntry[];

        // Ordenar decrescente por data e criação
        list.sort((a, b) => {
          const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateDiff !== 0) return dateDiff;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });

        setEntries(list);
        setIsLoading(false);
      },
      (err) => {
        console.error('Erro ao sincronizar overtime_entries:', err);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Lista de colaboradores reais da fábrica para autocompletar e busca rápida
  const activePersonnelEmployees = useMemo(() => {
    const normalize = (str: string | undefined | null) =>
      (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    const empMap = new Map<string, Employee>();
    employees.forEach((emp) => {
      if (!emp.name || !emp.name.trim()) return;
      const n = normalize(emp.name);
      const st = normalize(emp.status);
      if (
        n.includes('excluid') || st.includes('excluid') ||
        n.includes('contratacao') || st.includes('contratacao') ||
        n.includes('desligad') || st.includes('desligad') ||
        emp.isSilenced || n.startsWith('vaga') || n.length < 3
      ) {
        return;
      }

      const key = emp.registration?.trim() ? `reg_${normalize(emp.registration)}` : `name_${n}`;
      if (!empMap.has(key)) {
        empMap.set(key, emp);
      }
    });

    return Array.from(empMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);

  // Ciclos disponíveis da Folha (fechamento dia 24)
  const availablePayrollCycles = useMemo(() => {
    const keysSet = new Set<string>();
    const currentCycle = getCurrentPayrollCycle();
    keysSet.add(currentCycle.key);

    const prevDate = new Date();
    prevDate.setDate(prevDate.getDate() - 32);
    const prevCycle = getPayrollCycleFromDate(prevDate);
    keysSet.add(prevCycle.key);

    entries.forEach((e) => {
      if (e.date) {
        const c = getPayrollCycleFromDate(e.date);
        keysSet.add(c.key);
      }
    });

    const sortedKeys = Array.from(keysSet).sort().reverse();
    return sortedKeys.map((key) => getPayrollCycleByKey(key));
  }, [entries]);

  const activePayrollCycle = useMemo(() => {
    return getPayrollCycleByKey(filterMonth);
  }, [filterMonth]);

  const formDatePayrollCycle = useMemo(() => {
    return getPayrollCycleFromDate(date || new Date().toISOString().split('T')[0]);
  }, [date]);

  // Identificação do dia da semana a partir da data informada
  const dateDayInfo = useMemo(() => {
    if (!date) return { dayName: '', isSunday: false, isSaturday: false };
    const parts = date.split('-').map(Number);
    if (parts.length !== 3) return { dayName: '', isSunday: false, isSaturday: false };
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const dayOfWeek = d.getDay(); // 0 = Domingo, 6 = Sábado
    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return {
      dayName: dayNames[dayOfWeek],
      isSunday: dayOfWeek === 0,
      isSaturday: dayOfWeek === 6
    };
  }, [date]);

  // Atualização automática de % de HE conforme o dia da semana (Domingo/Feriado = 100%, Dias Úteis/Sábado = 50%)
  // Apenas quando não estiver editando registro existente já gravado
  useEffect(() => {
    if (!isFormOpen) return;
    if (editingEntry) return;

    if (dateDayInfo.isSunday) {
      setOvertimePercentage(100);
    } else {
      setOvertimePercentage(50);
    }
  }, [date, dateDayInfo.isSunday, isFormOpen, editingEntry]);

  // CÁLCULO AUTOMÁTICO OFICIAL DAS HORAS EXTRAS (BASEADO NO TURNO E MODALIDADE)
  useEffect(() => {
    if (!autoCalculateHours || !startTime || !endTime) return;

    try {
      // 1. Cálculo das Horas Extras conforme a regra do turno aplicada
      const result = calculateOvertimeHoursDetailed({
        mode: overtimeMode,
        shiftCategory: shiftTypeChoice,
        isCommercialFlexible: shiftTypeChoice === 'Comercial' && isCommercialFlexible,
        actualStartTime: startTime,
        actualEndTime: endTime,
        customNormalStartTime: isCommercialFlexible ? (customFlexibleStart || startTime) : undefined
      });

      setOvertimeHours(result.estimatedHours);
      setOvertimeMinutes(result.overtimeMinutes);
      setDisplayOvertimeValue(result.displayValue);
      setOvertimeUnit(result.unit);
      setCalculatedNormalEnd(result.normalEndTime);
      setOvertimeExplanation(result.explanation);
      setOvertimeHoursFormatted(result.formattedOvertime);

      // 2. Horas Trabalhando (Permanência efetiva total no período)
      const startMin = timeStringToMinutes(startTime);
      let endMin = timeStringToMinutes(endTime);
      if (endMin <= startMin) {
        endMin += 1440;
      }
      const rawDiff = endMin - startMin;
      const netWorkingMin = rawDiff;
      const workH = Math.floor(netWorkingMin / 60);
      const workM = netWorkingMin % 60;
      setWorkingHours(Number((netWorkingMin / 60).toFixed(2)));
      setWorkingHoursFormatted(`${workH}h ${String(workM).padStart(2, '0')}min`);

      // 3. Horas Equivalentes calculadas com a porcentagem
      const equiv = Number((result.estimatedHours * (1 + (overtimePercentage || 50) / 100)).toFixed(2));
      setEquivalentHours(equiv);
    } catch (err) {
      // Mantém valores anteriores caso haja dado momentaneamente incompleto
    }
  }, [
    startTime,
    endTime,
    autoCalculateHours,
    overtimeMode,
    shiftTypeChoice,
    isCommercialFlexible,
    customFlexibleStart,
    overtimePercentage
  ]);

  // ALTERAR MODALIDADE (Passando do Horário Normal vs Turno Integral)
  const handleToggleOvertimeMode = (newMode: OvertimeMode) => {
    setOvertimeMode(newMode);
    setAutoCalculateHours(true);

    if (newMode === 'integral') {
      // Turno integral: 100% das horas trabalhadas são extras
      if (shiftTypeChoice === 'Comercial') {
        setStartTime('07:30');
        setEndTime('17:18');
      } else if (shiftTypeChoice === 'Noturno') {
        setStartTime('18:00');
        setEndTime('06:00');
      } else {
        setStartTime('06:00');
        setEndTime('18:00');
      }
    } else {
      // Passando do horário: cumpre jornada normal e estende
      if (shiftTypeChoice === 'Comercial') {
        const start = isCommercialFlexible ? customFlexibleStart : '07:30';
        setStartTime(start);
        setEndTime('19:18');
      } else if (shiftTypeChoice === 'Noturno') {
        setStartTime('18:00');
        setEndTime('08:00');
      } else {
        setStartTime('06:00');
        setEndTime('20:00');
      }
    }
  };

  // ALTERAR REGRA DE TURNO (Comercial Padrão, Comercial Flexível, Diurno, Noturno)
  const handleSelectShiftChoice = (cat: 'Comercial' | 'Diurno' | 'Noturno', isFlex = false) => {
    setShiftTypeChoice(cat);
    setIsCommercialFlexible(isFlex);
    const shiftLabel = cat === 'Comercial' ? (isFlex ? 'Comercial Flexível' : 'Comercial') : cat;
    setShift(shiftLabel);
    setAutoCalculateHours(true);

    if (overtimeMode === 'pos_turno') {
      if (cat === 'Comercial') {
        const start = isFlex ? (customFlexibleStart || '06:00') : '07:30';
        setStartTime(start);
        if (isFlex) {
          // Em Comercial Flexível, a jornada normal é de 10h de permanência. Ex: 06:00 às 16:00.
          // Inicializa com 45min ou 1h de hora extra (17:00)
          const [sh, sm] = start.split(':').map(Number);
          const endTotalM = sh * 60 + sm + 600 + 45;
          const endH = Math.floor(endTotalM / 60) % 24;
          const endMin = endTotalM % 60;
          setEndTime(`${String(endH).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`);
        } else {
          setEndTime('19:18');
        }
      } else if (cat === 'Noturno') {
        setStartTime('18:00');
        setEndTime('08:00');
      } else {
        setStartTime('06:00');
        setEndTime('20:00');
      }
    } else {
      // integral
      if (cat === 'Comercial') {
        setStartTime('07:30');
        setEndTime('17:18');
      } else if (cat === 'Noturno') {
        setStartTime('18:00');
        setEndTime('06:00');
      } else {
        setStartTime('06:00');
        setEndTime('18:00');
      }
    }
  };

  // SELEÇÃO POR MATRÍCULA:
  // Preenche operador, setor cadastrado no banco, turno oficial e data
  const handleRegistrationChange = (regValue: string) => {
    setRegistration(regValue);
    if (!regValue.trim()) return;

    const cleanReg = regValue.trim().toLowerCase();
    const found = activePersonnelEmployees.find(
      (e) => (e.registration || '').trim().toLowerCase() === cleanReg
    );

    if (found) {
      applyEmployeeData(found);
    }
  };

  // SELEÇÃO POR NOME DE FUNCIONÁRIO:
  // Preenche matrícula, setor oficial, cargo, turno oficial e data
  const handleSelectEmployee = (emp: Employee) => {
    applyEmployeeData(emp);
    setShowEmployeeDropdown(false);
  };

  // Aplicação dos dados do colaborador com detecção do turno oficial
  const applyEmployeeData = (emp: Employee) => {
    setSelectedEmployeeId(emp.id);
    setRegistration(emp.registration || '');
    setEmployeeName(emp.name);
    setEmployeeSearchText(emp.name);
    setSector(emp.sector || 'Extrusão');
    setRole(emp.role || '');
    setMachine(emp.machine || '');

    // Detecção do turno oficial do colaborador
    const detectedCategory = getCanonicalShiftCategory(emp.shift, emp.sector);
    const isFlex = (emp.shift || '').toLowerCase().includes('flex');
    setShiftTypeChoice(detectedCategory);
    setIsCommercialFlexible(isFlex);
    setShift(emp.shift || (detectedCategory === 'Comercial' ? (isFlex ? 'Comercial Flexível' : 'Comercial') : detectedCategory));

    // Ajusta horários com base no turno detectado
    if (overtimeMode === 'pos_turno') {
      if (detectedCategory === 'Comercial') {
        const start = isFlex ? '07:30' : '07:30';
        setStartTime(start);
        setEndTime(isFlex ? '18:15' : '19:18');
      } else if (detectedCategory === 'Noturno') {
        setStartTime('18:00');
        setEndTime('08:00');
      } else {
        setStartTime('06:00');
        setEndTime('20:00');
      }
    }

    if (!date) {
      setDate(new Date().toISOString().split('T')[0]);
    }
  };

  // Filtragem de funcionários para o dropdown de busca
  const filteredEmployeeSuggestions = useMemo(() => {
    if (!employeeSearchText.trim()) return activePersonnelEmployees.slice(0, 15);
    const searchNorm = employeeSearchText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return activePersonnelEmployees
      .filter((e) => {
        const nameNorm = (e.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const regNorm = (e.registration || '').toLowerCase();
        return nameNorm.includes(searchNorm) || regNorm.includes(searchNorm);
      })
      .slice(0, 15);
  }, [employeeSearchText, activePersonnelEmployees]);

  // Relação unificada de todos os motivos conhecidos (padrões + customizados salvos + histórico)
  const allAvailableReasons = useMemo(() => {
    const set = new Set<string>();
    QUICK_REASONS.forEach((r) => set.add(r));
    customReasons.forEach((r) => {
      if (r && r.trim()) set.add(r.trim());
    });
    entries.forEach((e) => {
      if (e.reason && e.reason.trim()) {
        set.add(e.reason.trim());
      }
    });
    return Array.from(set);
  }, [customReasons, entries]);

  // Sugestões inteligentes de motivos conforme o usuário digita
  const filteredReasonSuggestions = useMemo(() => {
    const normalize = (str: string) =>
      (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    const query = normalize(reason);
    if (!query) {
      return allAvailableReasons;
    }

    const queryTokens = query.split(/\s+/).filter(Boolean);

    // Ranqueamento por similaridade
    const exactMatches: string[] = [];
    const prefixMatches: string[] = [];
    const phraseMatches: string[] = [];
    const allTokensMatches: string[] = [];
    const partialTokenMatches: string[] = [];

    allAvailableReasons.forEach((item) => {
      const normItem = normalize(item);
      if (normItem === query) {
        exactMatches.push(item);
      } else if (normItem.startsWith(query)) {
        prefixMatches.push(item);
      } else if (normItem.includes(query)) {
        phraseMatches.push(item);
      } else if (queryTokens.length > 0 && queryTokens.every((token) => normItem.includes(token))) {
        allTokensMatches.push(item);
      } else if (queryTokens.some((token) => token.length >= 3 && normItem.includes(token))) {
        partialTokenMatches.push(item);
      }
    });

    return Array.from(
      new Set([
        ...exactMatches,
        ...prefixMatches,
        ...phraseMatches,
        ...allTokensMatches,
        ...partialTokenMatches
      ])
    );
  }, [reason, allAvailableReasons]);

  // Verifica se o motivo digitado é novo (não existe na relação)
  const isReasonNew = useMemo(() => {
    const trimmed = reason.trim();
    if (!trimmed) return false;
    const normalize = (str: string) =>
      (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const query = normalize(trimmed);
    return !allAvailableReasons.some((r) => normalize(r) === query);
  }, [reason, allAvailableReasons]);

  // Salva um novo motivo no Firestore e atualiza a relação do sistema
  const saveNewReasonToDatabase = async (newReason: string) => {
    const trimmed = newReason.trim();
    if (!trimmed) return;
    const normalize = (str: string) =>
      (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const query = normalize(trimmed);
    const alreadyExists = allAvailableReasons.some((r) => normalize(r) === query);
    if (alreadyExists) return;

    // Atualiza imediatamente estado local e cache
    setCustomReasons((prev) => {
      const next = Array.from(new Set([...prev, trimmed]));
      try {
        localStorage.setItem('overtime_custom_reasons', JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // Salva no Firestore na coleção overtime_reasons
    try {
      await addDoc(collection(db, 'overtime_reasons'), {
        reason: trimmed,
        createdAt: new Date().toISOString(),
        createdBy: loggedUser?.name || 'Sistema'
      });
    } catch (err) {
      console.warn('Erro ao salvar novo motivo no Firestore:', err);
    }
  };

  // Abertura do formulário de novo lançamento
  const handleOpenCreateModal = () => {
    if (isReadOnly) {
      onBlockedAction?.('Ação Bloqueada', 'Sua conta está em modo Somente Leitura.');
      return;
    }

    setEditingEntry(null);
    setSelectedEmployeeId('');
    setRegistration('');
    setEmployeeName('');
    setEmployeeSearchText('');
    setRole('');
    setSector('Extrusão');
    setMachine('');
    setShift('Comercial');
    
    // Parâmetros de Turno e Programação
    setOvertimeMode('pos_turno');
    setShiftTypeChoice('Comercial');
    setIsCommercialFlexible(false);
    setCustomFlexibleStart('07:30');
    setCalculatedNormalEnd('17:18');
    setAutoCalculateHours(true);

    // Data atual
    const todayStr = new Date().toISOString().split('T')[0];
    setDate(todayStr);
    
    // Horários padrão Comercial
    setStartTime('07:30');
    setEndTime('19:18');
    
    // Dia da semana de hoje
    const todayDay = new Date().getDay();
    setOvertimePercentage(todayDay === 0 ? 100 : 50);

    setReason('');
    setShowReasonDropdown(false);
    setRequestedBy(loggedUser?.name || 'Líder de Produção');
    setNotes('');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Abertura para edição
  const handleOpenEditModal = (entry: OvertimeEntry) => {
    if (isReadOnly) {
      onBlockedAction?.('Ação Bloqueada', 'Sua conta está em modo Somente Leitura.');
      return;
    }

    setEditingEntry(entry);
    setSelectedEmployeeId(entry.employeeId || '');
    setRegistration(entry.registration || '');
    setEmployeeName(entry.employeeName || '');
    setEmployeeSearchText(entry.employeeName || '');
    setRole(entry.role || '');
    setSector(entry.sector || 'Extrusão');
    setMachine(entry.machine || '');
    setShift(entry.shift || '');

    // Recupera turno e modalidade gravados
    setOvertimeMode(entry.overtimeMode || 'pos_turno');
    const detectedCategory = entry.shiftTypeChoice || getCanonicalShiftCategory(entry.shift, entry.sector);
    setShiftTypeChoice(detectedCategory);
    const isFlex = entry.isCommercialFlexible !== undefined 
      ? entry.isCommercialFlexible 
      : ((entry.shift || '').toLowerCase().includes('flex'));
    setIsCommercialFlexible(isFlex);
    if (entry.normalShiftStartTime) {
      setCustomFlexibleStart(entry.normalShiftStartTime);
    }

    setDate(entry.date || new Date().toISOString().split('T')[0]);
    setStartTime(entry.startTime || '07:30');
    setEndTime(entry.endTime || '19:18');
    setOvertimePercentage(entry.overtimePercentage || 50);
    setReason(entry.reason || '');
    setShowReasonDropdown(false);
    setRequestedBy(entry.requestedBy || loggedUser?.name || 'Líder de Produção');
    setNotes(entry.notes || '');
    setAutoCalculateHours(false);
    setFormError(null);
    setIsFormOpen(true);
  };

  // Salvar no Firestore
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      onBlockedAction?.('Ação Bloqueada', 'Sua conta está em modo Somente Leitura.');
      return;
    }

    if (!employeeName.trim()) {
      setFormError('Por favor, selecione ou informe o nome do operador.');
      return;
    }
    if (!date) {
      setFormError('Por favor, selecione a data do lançamento.');
      return;
    }
    if (!startTime || !endTime) {
      setFormError('Por favor, informe os horários de início e término.');
      return;
    }
    if (overtimeHours <= 0) {
      setFormError('Os horários informados não geram horas extras conforme a regra do turno.');
      return;
    }
    if (!reason.trim()) {
      setFormError('Por favor, informe ou selecione o motivo / atividade realizada.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    // Determina o horário normal de referência do turno
    let normalStart = '07:30';
    let normalEnd = '17:18';
    if (shiftTypeChoice === 'Comercial') {
      if (isCommercialFlexible) {
        normalStart = customFlexibleStart || startTime;
        normalEnd = calculatedNormalEnd;
      } else {
        normalStart = '07:30';
        normalEnd = '17:18';
      }
    } else if (shiftTypeChoice === 'Noturno') {
      normalStart = '18:00';
      normalEnd = '06:00';
    } else {
      normalStart = '06:00';
      normalEnd = '18:00';
    }

    try {
      const payload: Omit<OvertimeEntry, 'id'> = {
        employeeId: selectedEmployeeId || undefined,
        registration: registration.trim(),
        employeeName: employeeName.trim(),
        role: role.trim(),
        sector: sector.trim(),
        machine: machine.trim(),
        shift: shift.trim() || shiftTypeChoice,
        date,
        overtimeMode,
        shiftTypeChoice,
        isCommercialFlexible: shiftTypeChoice === 'Comercial' && isCommercialFlexible,
        normalShiftStartTime: normalStart,
        normalShiftEndTime: normalEnd,
        startTime,
        endTime,
        workingHours,
        workingHoursFormatted,
        overtimeHours,
        overtimeMinutes,
        overtimeHoursFormatted: displayOvertimeValue ? `${displayOvertimeValue} ${overtimeUnit}` : overtimeHoursFormatted,
        overtimePercentage: Number(overtimePercentage) || 50,
        overtimePercentageLabel: `${overtimePercentage}%`,
        equivalentHours,
        overtimeExplanation: overtimeExplanation.trim(),
        reason: reason.trim(),
        requestedBy: requestedBy.trim(),
        notes: notes.trim(),
        createdAt: editingEntry ? editingEntry.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: loggedUser?.id || 'anon',
        userName: loggedUser?.name || 'Sistema'
      };

      if (editingEntry) {
        await updateDoc(doc(db, 'overtime_entries', editingEntry.id), payload);
      } else {
        await addDoc(collection(db, 'overtime_entries'), payload);
      }

      // Se for um novo motivo digitado que não está na relação, salva automaticamente no sistema
      if (isReasonNew && reason.trim()) {
        await saveNewReasonToDatabase(reason.trim());
      }

      setIsFormOpen(false);
      setEditingEntry(null);
    } catch (err: any) {
      console.error('Erro ao salvar lançamento de hora extra:', err);
      setFormError(`Erro ao salvar no banco de dados: ${err?.message || 'Tente novamente'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Exclusão
  const handleDeleteEntry = async () => {
    if (!deleteConfirmId || isReadOnly) return;
    try {
      await deleteDoc(doc(db, 'overtime_entries', deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Erro ao excluir lançamento de hora extra:', err);
    }
  };

  // Filtragem da listagem
  const filteredEntries = useMemo(() => {
    return entries.filter((item) => {
      // 1. Filtro por Ciclo de Folha (fechamento dia 24)
      if (filterMonth !== 'todos') {
        if (!isDateInPayrollCycle(item.date, filterMonth)) {
          return false;
        }
      }

      // 2. Filtro por Setor
      if (filterSector !== 'todos') {
        const itemSec = (item.sector || '').toLowerCase();
        const filtSec = filterSector.toLowerCase();
        if (!itemSec.includes(filtSec)) {
          return false;
        }
      }

      // 3. Filtro por Turno
      if (filterShift !== 'todos') {
        const itemShift = (item.shiftTypeChoice || item.shift || '').toLowerCase();
        const isFlex = !!item.isCommercialFlexible;
        if (filterShift === 'Comercial Padrão' && (itemShift.includes('flex') || isFlex || !itemShift.includes('comercial'))) return false;
        if (filterShift === 'Comercial Flexível' && (!itemShift.includes('flex') && !isFlex)) return false;
        if (filterShift === 'Diurno' && !itemShift.includes('diurno')) return false;
        if (filterShift === 'Noturno' && !itemShift.includes('noturno')) return false;
      }

      // 4. Filtro por Modalidade
      if (filterMode !== 'todos') {
        if (item.overtimeMode && item.overtimeMode !== filterMode) {
          return false;
        }
      }

      // 5. Busca livre por texto
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const nameNorm = (item.employeeName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const regNorm = (item.registration || '').toLowerCase();
        const secNorm = (item.sector || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const reasonNorm = (item.reason || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const explNorm = (item.overtimeExplanation || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        const matches =
          nameNorm.includes(q) ||
          regNorm.includes(q) ||
          secNorm.includes(q) ||
          reasonNorm.includes(q) ||
          explNorm.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [entries, filterMonth, filterSector, filterShift, filterMode, searchTerm]);

  // Estatísticas dos Lançamentos Filtrados
  const stats = useMemo(() => {
    let totalOvertimeHours = 0;
    let totalWorkingHours = 0;
    let totalEquivalentHours = 0;
    let count50 = 0;
    let count100 = 0;
    let hours50 = 0;
    let hours100 = 0;
    const uniqueEmp = new Set<string>();
    const sectorHoursMap: Record<string, number> = {};

    filteredEntries.forEach((item) => {
      const otH = Number(item.overtimeHours) || 0;
      const wkH = Number(item.workingHours) || otH;
      const eqH = Number(item.equivalentHours) || (otH * (1 + (item.overtimePercentage || 50) / 100));

      totalOvertimeHours += otH;
      totalWorkingHours += wkH;
      totalEquivalentHours += eqH;

      if ((item.overtimePercentage || 50) >= 100) {
        count100++;
        hours100 += otH;
      } else {
        count50++;
        hours50 += otH;
      }

      const empKey = (item.registration || item.employeeName || '').trim().toLowerCase();
      if (empKey) uniqueEmp.add(empKey);

      const secKey = item.sector || 'Outro';
      sectorHoursMap[secKey] = (sectorHoursMap[secKey] || 0) + otH;
    });

    let topSector = '-';
    let topSectorHours = 0;
    Object.entries(sectorHoursMap).forEach(([sec, h]) => {
      if (h > topSectorHours) {
        topSectorHours = h;
        topSector = sec;
      }
    });

    return {
      totalOvertimeHours: Number(totalOvertimeHours.toFixed(2)),
      totalWorkingHours: Number(totalWorkingHours.toFixed(2)),
      totalEquivalentHours: Number(totalEquivalentHours.toFixed(2)),
      totalLaunches: filteredEntries.length,
      uniqueEmployees: uniqueEmp.size,
      hours50: Number(hours50.toFixed(2)),
      hours100: Number(hours100.toFixed(2)),
      count50,
      count100,
      topSector,
      topSectorHours: Number(topSectorHours.toFixed(2))
    };
  }, [filteredEntries]);

  // Exportar para CSV / Excel (Base Mensal)
  const exportToCSV = () => {
    if (filteredEntries.length === 0) {
      alert('Não há dados filtrados para exportar.');
      return;
    }

    const headers = [
      'Matrícula',
      'Nome do Operador',
      'Setor',
      'Cargo',
      'Turno Aplicado',
      'Modalidade',
      'Horário Normal',
      'Data',
      'Dia da Semana',
      'Início Efetivo',
      'Término Efetivo',
      'Horas Trabalhando',
      'Horas Extras (dec)',
      'Horas Extras (formatado)',
      '% HE',
      'Horas Equivalentes',
      'Regra / Cálculo Aplicado',
      'Motivo / Justificativa',
      'Líder Solicitante'
    ];

    const rows = filteredEntries.map((item) => {
      const parts = (item.date || '').split('-').map(Number);
      let dayName = '';
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        dayName = dayNames[d.getDay()] || '';
      }

      const modeLabel = item.overtimeMode === 'integral' ? 'Turno Extra Integral' : 'Passando do Horário';
      const normalRange = item.normalShiftStartTime && item.normalShiftEndTime ? `${item.normalShiftStartTime} às ${item.normalShiftEndTime}` : '-';

      return [
        item.registration || '',
        `"${(item.employeeName || '').replace(/"/g, '""')}"`,
        `"${(item.sector || '').replace(/"/g, '""')}"`,
        `"${(item.role || '').replace(/"/g, '""')}"`,
        `"${(item.shift || item.shiftTypeChoice || '').replace(/"/g, '""')}"`,
        `"${modeLabel}"`,
        `"${normalRange}"`,
        (item.date || '').split('-').reverse().join('/'),
        dayName,
        item.startTime || '',
        item.endTime || '',
        (item.workingHours || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        (item.overtimeHours || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        item.overtimeHoursFormatted || '',
        `${item.overtimePercentage || 50}%`,
        (item.equivalentHours || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        `"${(item.overtimeExplanation || '').replace(/"/g, '""')}"`,
        `"${(item.reason || '').replace(/"/g, '""')}"`,
        `"${(item.requestedBy || '').replace(/"/g, '""')}"`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Base_Mensal_Horas_Extras_${filterMonth}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Exportar Relatório em PDF
  const exportToPDF = () => {
    if (filteredEntries.length === 0) {
      alert('Não há dados filtrados para gerar PDF.');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = 297;
    const margin = 10;

    // Cabeçalho
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, 8, pageWidth - margin * 2, 16, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('MANUPACKAGING FITASA & AMAZÔNIA • APONTAMENTO DE HORAS EXTRAS (BASE MENSAL)', margin + 6, 15);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(
      `Período: ${activePayrollCycle.shortLabel} (${activePayrollCycle.intervalLabel}) • Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
      margin + 6,
      20
    );

    // Tabela
    const tableBody = filteredEntries.map((item, idx) => [
      String(idx + 1),
      item.registration || '-',
      item.employeeName || '-',
      item.sector || '-',
      item.shift || item.shiftTypeChoice || 'Comercial',
      item.overtimeMode === 'integral' ? 'Integral' : 'Extensão',
      item.date ? item.date.split('-').reverse().join('/') : '-',
      item.startTime || '-',
      item.endTime || '-',
      item.workingHoursFormatted || `${item.workingHours}h`,
      `${item.overtimeHours.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}h`,
      `${item.overtimePercentage || 50}%`,
      `${(item.equivalentHours || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}h`,
      item.overtimeExplanation || item.reason || '-'
    ]);

    autoTable(doc, {
      startY: 28,
      margin: { left: margin, right: margin },
      head: [
        ['#', 'Matr.', 'Colaborador', 'Setor', 'Turno', 'Modo', 'Data', 'Início', 'Fim', 'Trabalhando', 'HE', '% HE', 'Equiv.', 'Regra / Justificativa']
      ],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 6.8,
        textColor: [15, 23, 42]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center' },
        1: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 42, fontStyle: 'bold' },
        3: { cellWidth: 20 },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 16, halign: 'center' },
        6: { cellWidth: 17, halign: 'center' },
        7: { cellWidth: 12, halign: 'center' },
        8: { cellWidth: 12, halign: 'center' },
        9: { cellWidth: 18, halign: 'center' },
        10: { cellWidth: 15, halign: 'center', fontStyle: 'bold', textColor: [180, 83, 9] },
        11: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
        12: { cellWidth: 15, halign: 'center' },
        13: { cellWidth: 'auto' }
      }
    });

    // Rodapé de Totais
    const finalY = (doc as any).lastAutoTable?.finalY || 180;
    if (finalY + 22 < 200) {
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, finalY + 4, pageWidth - margin * 2, 13, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `TOTAL GERAL: ${stats.totalOvertimeHours.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}h de Horas Extras  •  ${stats.totalWorkingHours.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}h Trabalhando  •  ${stats.totalEquivalentHours.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}h Equivalentes  •  ${stats.totalLaunches} Lançamentos`,
        margin + 6,
        finalY + 11
      );
    }

    doc.save(`Apontamento_Horas_Extras_${filterMonth}.pdf`);
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-[2.5rem] w-full flex flex-col overflow-hidden shadow-xl animate-in fade-in duration-500 text-slate-800">
      
      {/* ============================================================== */}
      {/* CABEÇALHO SUPERIOR */}
      {/* ============================================================== */}
      <div className="px-6 sm:px-8 py-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-200 shadow-sm shrink-0">
            <Clock size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                Lançamento de Horas Extras
              </h2>
              <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider border border-blue-200">
                Base Mensal • Regras de Turno
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em] mt-0.5">
              Apontamento Oficial de Horas Extras Efetivas • Parâmetros de Turno (Comercial, Flexível, Diurno, Noturno e Integral)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onNavigateToRequests && (
            <button
              onClick={onNavigateToRequests}
              className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-wider shadow-sm cursor-pointer"
              title="Ir para a tela de Solicitação de Horas Extras (DOC 076)"
            >
              <FileText size={15} className="text-amber-600" />
              Solicitações (DOC 076)
            </button>
          )}

          <button
            onClick={exportToCSV}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-wider shadow-sm cursor-pointer"
            title="Exportar dados para Excel (.CSV)"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            Excel (CSV)
          </button>

          <button
            onClick={exportToPDF}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-wider shadow-sm cursor-pointer"
            title="Exportar relatório consolidado em PDF"
          >
            <Printer size={15} className="text-blue-600" />
            Relatório PDF
          </button>

          {canManage && (
            <button
              onClick={handleOpenCreateModal}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Plus size={15} />
              Novo Lançamento
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-[10px] font-black uppercase tracking-wider shadow-sm"
          >
            <ArrowLeft size={15} />
            Voltar
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* CARDS DE RESUMO E INDICADORES */}
      {/* ============================================================== */}
      <div className="p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Card 1: Total Horas Extras */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horas Extras</span>
              <Clock size={16} className="text-blue-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {stats.totalOvertimeHours.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}h
            </div>
            <p className="text-[10px] text-blue-700 font-extrabold mt-1">
              {filterMonth === 'todos' ? 'Período Completo' : activePayrollCycle.shortLabel}
            </p>
          </div>

          {/* Card 2: Horas Trabalhando */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horas Trabalhando</span>
              <UserCheck size={16} className="text-indigo-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {stats.totalWorkingHours.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}h
            </div>
            <p className="text-[10px] text-slate-500 font-bold mt-1">
              Duração efetiva total
            </p>
          </div>

          {/* Card 3: % HE (50% vs 100%) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faixa HE (% HE)</span>
              <Percent size={16} className="text-amber-500" />
            </div>
            <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              50%: <span className="text-blue-600">{stats.hours50}h</span> • 100%: <span className="text-amber-600">{stats.hours100}h</span>
            </div>
            <p className="text-[10px] text-slate-500 font-bold mt-1">
              {stats.count50} a 50% • {stats.count100} a 100%
            </p>
          </div>

          {/* Card 4: Colaboradores & Lançamentos */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lançamentos</span>
              <FileText size={16} className="text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {stats.totalLaunches}
            </div>
            <p className="text-[10px] text-emerald-700 font-bold mt-1">
              {stats.uniqueEmployees} colaboradores
            </p>
          </div>

          {/* Card 5: Setor com Maior Volume */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Maior Setor</span>
              <Building2 size={16} className="text-purple-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-700 tracking-tight truncate">
              {stats.topSector}
            </div>
            <p className="text-[10px] text-slate-500 font-bold mt-1">
              {stats.topSectorHours}h acumuladas
            </p>
          </div>
        </div>

        {/* ============================================================== */}
        {/* BARRA DE FILTROS & BUSCA */}
        {/* ============================================================== */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Input de Busca */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por operador, matrícula, turno ou regra..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            {/* Filtro de Ciclo de Folha (Fechamento dia 24) */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Calendar size={14} className="text-blue-600 shrink-0" />
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="todos">Todos os Períodos</option>
                {availablePayrollCycles.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.fullLabel} {c.isCurrent ? '⭐ (Vigente)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro de Setor */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Filter size={14} className="text-slate-500 shrink-0" />
              <select
                value={filterSector}
                onChange={(e) => setFilterSector(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="todos">Todos os Setores</option>
                {SECTORS_LIST.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Filtro de Turno */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Briefcase size={14} className="text-slate-500 shrink-0" />
              <select
                value={filterShift}
                onChange={(e) => setFilterShift(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="todos">Todos os Turnos</option>
                <option value="Comercial Padrão">Comercial Padrão</option>
                <option value="Comercial Flexível">Comercial Flexível</option>
                <option value="Diurno">Turno Diurno</option>
                <option value="Noturno">Turno Noturno</option>
              </select>
            </div>

            {/* Filtro de Modalidade */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Clock size={14} className="text-slate-500 shrink-0" />
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="todos">Todas Modalidades</option>
                <option value="pos_turno">Passando do Horário (Extensão)</option>
                <option value="integral">Turno Extra Integral</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-black text-slate-400">
            <span>{filteredEntries.length} lançamento(s)</span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* TABELA DE LANÇAMENTOS */}
        {/* ============================================================== */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <p className="text-xs font-bold uppercase tracking-wider">Carregando lançamentos de horas extras...</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
                <Clock size={32} />
              </div>
              <h3 className="text-base font-black text-slate-800 uppercase">Nenhum lançamento encontrado</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Não há registros de horas extras lançadas no filtro selecionado. Clique em "Novo Lançamento" para cadastrar o apontamento com os parâmetros oficiais de turno.
              </p>
              {canManage && (
                <button
                  onClick={handleOpenCreateModal}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase hover:bg-blue-700 transition-all cursor-pointer shadow-md shadow-blue-600/20"
                >
                  <Plus size={14} />
                  Criar Primeiro Lançamento
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-black">
                    <th className="px-4 py-3.5">Data</th>
                    <th className="px-4 py-3.5">Matrícula</th>
                    <th className="px-4 py-3.5">Colaborador / Operador</th>
                    <th className="px-4 py-3.5">Setor & Turno</th>
                    <th className="px-4 py-3.5 text-center">Modalidade & Horários</th>
                    <th className="px-4 py-3.5 text-center">Horas Trabalhando</th>
                    <th className="px-4 py-3.5 text-center">Horas Extras</th>
                    <th className="px-4 py-3.5 text-center">% HE</th>
                    <th className="px-4 py-3.5">Cálculo Aplicado / Motivo</th>
                    <th className="px-4 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredEntries.map((item) => {
                    const dateFormatted = item.date ? item.date.split('-').reverse().join('/') : '-';
                    const parts = (item.date || '').split('-').map(Number);
                    let dayAbbr = '';
                    if (parts.length === 3) {
                      const d = new Date(parts[0], parts[1] - 1, parts[2]);
                      const abbrs = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
                      dayAbbr = abbrs[d.getDay()] || '';
                    }

                    const isHighPercent = (item.overtimePercentage || 50) >= 100;
                    const isIntegral = item.overtimeMode === 'integral';

                    return (
                      <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                        {/* Data */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-800">{dateFormatted}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                              dayAbbr === 'DOM' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {dayAbbr}
                            </span>
                          </div>
                        </td>

                        {/* Matrícula */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-mono font-black text-[11px] border border-slate-200">
                            {item.registration || '-'}
                          </span>
                        </td>

                        {/* Colaborador */}
                        <td className="px-4 py-3.5">
                          <div>
                            <div className="font-black text-slate-900">{item.employeeName}</div>
                            {item.role && (
                              <div className="text-[10px] text-slate-400 font-semibold">{item.role}</div>
                            )}
                          </div>
                        </td>

                        {/* Setor & Turno */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <div>
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                              {item.sector || 'Geral'}
                            </span>
                            <div className="text-[10px] font-bold text-slate-500 mt-1 flex items-center gap-1">
                              {item.shiftTypeChoice === 'Noturno' ? '🌙 Noturno' : item.shiftTypeChoice === 'Diurno' ? '☀️ Diurno' : item.isCommercialFlexible ? '🏢 Comercial Flex' : '🏢 Comercial'}
                            </div>
                          </div>
                        </td>

                        {/* Modalidade & Horários */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={`text-[9px] px-2 py-0.5 rounded-md font-black uppercase ${
                              isIntegral 
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {isIntegral ? 'Turno Integral' : 'Passando do Horário'}
                            </span>
                            <div className="font-bold text-slate-800 font-mono text-[11px] mt-0.5">
                              {item.startTime} às {item.endTime}
                            </div>
                            {item.normalShiftStartTime && item.normalShiftEndTime && !isIntegral && (
                              <div className="text-[9px] text-slate-400 font-medium">
                                (Turno normal: {item.normalShiftStartTime} - {item.normalShiftEndTime})
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Horas Trabalhando */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <div className="font-black text-indigo-700">
                            {item.workingHoursFormatted || `${item.workingHours}h`}
                          </div>
                          <div className="text-[9px] text-slate-400 font-semibold">
                            {item.workingHours.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}h dec.
                          </div>
                        </td>

                        {/* Horas Extras */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 font-black text-blue-900 font-mono">
                            <Clock size={12} className="text-blue-600" />
                            <span>{item.overtimeHoursFormatted || `${item.overtimeHours.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}h`}</span>
                          </div>
                          <div className="text-[9px] text-slate-400 font-semibold mt-0.5">
                            {item.overtimeHours.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}h dec.
                          </div>
                        </td>

                        {/* % HE */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full font-black text-[10px] uppercase border ${
                            isHighPercent
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                          }`}>
                            {item.overtimePercentage || 50}%
                          </span>
                          {item.equivalentHours ? (
                            <div className="text-[9px] text-slate-400 font-bold mt-0.5" title="Horas calculadas com adicional">
                              = {item.equivalentHours.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}h eq.
                            </div>
                          ) : null}
                        </td>

                        {/* Cálculo Aplicado & Motivo */}
                        <td className="px-4 py-3.5 max-w-[260px]">
                          {item.overtimeExplanation ? (
                            <div className="text-[10px] text-slate-600 line-clamp-2 font-medium" title={item.overtimeExplanation}>
                              {item.overtimeExplanation}
                            </div>
                          ) : null}
                          <div className="text-[10px] text-slate-400 truncate mt-0.5 font-semibold" title={item.reason || item.notes}>
                            Motivo: {item.reason || item.notes || '-'}
                          </div>
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {canManage && (
                              <>
                                <button
                                  onClick={() => handleOpenEditModal(item)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="Editar lançamento"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Excluir lançamento"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL DE NOVO LANÇAMENTO / EDIÇÃO (COM OS PARÂMETROS DA SOLICITAÇÃO) */}
      {/* ============================================================== */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6">
            
            {/* Cabeçalho do Modal */}
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    {editingEntry ? 'Editar Lançamento de Hora Extra' : 'Novo Lançamento de Hora Extra'}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Apontamento Direto • Base Mensal • Parâmetros Oficiais de Turno
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSaveEntry} className="p-6 space-y-6">
              {formError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* SEÇÃO 1: IDENTIFICAÇÃO DO COLABORADOR */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <User size={16} className="text-blue-600" />
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    1. Identificação do Colaborador
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Matrícula */}
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                      Matrícula *
                    </label>
                    <input
                      type="text"
                      value={registration}
                      onChange={(e) => handleRegistrationChange(e.target.value)}
                      placeholder="Ex: 0023"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono"
                    />
                    <p className="text-[9px] text-slate-400 mt-1">Ao digitar, busca operador e turno cadastrado</p>
                  </div>

                  {/* Nome do Operador com Busca / Autocomplete */}
                  <div className="sm:col-span-2 relative">
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                      Nome do Operador / Colaborador *
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        type="text"
                        value={employeeSearchText}
                        onChange={(e) => {
                          setEmployeeSearchText(e.target.value);
                          setEmployeeName(e.target.value);
                          setShowEmployeeDropdown(true);
                        }}
                        onFocus={() => setShowEmployeeDropdown(true)}
                        placeholder="Pesquisar por nome ou matrícula..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                      />
                    </div>

                    {/* Dropdown de sugestões */}
                    {showEmployeeDropdown && filteredEmployeeSuggestions.length > 0 && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowEmployeeDropdown(false)} />
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-20 py-1 divide-y divide-slate-50">
                          {filteredEmployeeSuggestions.map((emp) => (
                            <button
                              key={emp.id}
                              type="button"
                              onClick={() => handleSelectEmployee(emp)}
                              className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center justify-between text-xs cursor-pointer transition-colors"
                            >
                              <div>
                                <div className="font-black text-slate-800">{emp.name}</div>
                                <div className="text-[10px] text-slate-400 font-semibold">
                                  {emp.role || 'Sem cargo'} • {emp.sector || 'Extrusão'} • Turno: {emp.shift || 'Comercial'}
                                </div>
                              </div>
                              <span className="text-[10px] font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                Matr: {emp.registration || '-'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                      Setor Cadastrado *
                    </label>
                    <select
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
                    >
                      {SECTORS_LIST.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Data da Realização *</span>
                      {dateDayInfo.dayName && (
                        <span className={`text-[10px] font-black ${
                          dateDayInfo.isSunday ? 'text-amber-600' : 'text-blue-600'
                        }`}>
                          {dateDayInfo.dayName}
                        </span>
                      )}
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: PROGRAMAÇÃO, TURNO E PREVISÃO DE HORÁRIOS (OS MESMOS PARÂMETROS DA SOLICITAÇÃO) */}
              <div className="space-y-4 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-amber-600" />
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      2. Programação, Turno e Previsão de Horários
                    </h4>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    Turno Atual: {shiftTypeChoice === 'Comercial' ? (isCommercialFlexible ? 'Comercial Flexível (10h)' : 'Comercial Padrão (07:30 - 17:18)') : shiftTypeChoice === 'Noturno' ? 'Noturno (18:00 - 06:00)' : 'Diurno (06:00 - 18:00)'}
                  </span>
                </div>

                {/* MODALIDADE DA HORA EXTRA: PASSANDO DO HORÁRIO vs TURNO EXTRA INTEGRAL */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleOvertimeMode('pos_turno')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      overtimeMode === 'pos_turno'
                        ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 text-slate-900 shadow-sm'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black flex items-center gap-1.5 uppercase tracking-wide">
                        <Clock size={14} className={overtimeMode === 'pos_turno' ? 'text-amber-600' : 'text-slate-400'} />
                        Passando do Horário Normal
                      </span>
                      {overtimeMode === 'pos_turno' && (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed">
                      O colaborador cumpre seu horário de expediente normal e estende a jornada. <strong>Apenas o tempo excedente</strong> além do término do turno é contabilizado como hora extra.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleOvertimeMode('integral')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      overtimeMode === 'integral'
                        ? 'bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/20 text-slate-900 shadow-sm'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black flex items-center gap-1.5 uppercase tracking-wide">
                        <Calendar size={14} className={overtimeMode === 'integral' ? 'text-indigo-600' : 'text-slate-400'} />
                        Turno Extra Integral (Plantão / Folga)
                      </span>
                      {overtimeMode === 'integral' && (
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed">
                      Trabalho em dia de folga ou turno adicional. <strong>100% das horas trabalhadas</strong> no período são contabilizadas integralmente como horas extras.
                    </p>
                  </button>
                </div>

                {/* PAINEL DE DEFINIÇÃO DO TURNO DO COLABORADOR */}
                <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase size={13} className="text-amber-600" />
                      Regra de Turno Aplicável *
                    </label>
                    {sector === 'Liderança' && (
                      <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                        Toda a liderança cumpre Turno Comercial
                      </span>
                    )}
                  </div>

                  {/* Seletor com 4 opções de turno padronizadas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectShiftChoice('Comercial', false)}
                      className={`px-3 py-2 rounded-xl text-left border transition-all cursor-pointer ${
                        shiftTypeChoice === 'Comercial' && !isCommercialFlexible
                          ? 'bg-white border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                          : 'bg-white/70 border-slate-200 hover:bg-white text-slate-600'
                      }`}
                    >
                      <div className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                        <span>🏢</span> Comercial Padrão
                      </div>
                      <div className="text-[9.5px] font-bold text-slate-500 mt-0.5">
                        07:30 às 17:18 (9h48m)
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectShiftChoice('Comercial', true)}
                      className={`px-3 py-2 rounded-xl text-left border transition-all cursor-pointer ${
                        shiftTypeChoice === 'Comercial' && isCommercialFlexible
                          ? 'bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                          : 'bg-white/70 border-slate-200 hover:bg-white text-slate-600'
                      }`}
                    >
                      <div className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                        <span>🏢</span> Comercial Flexível
                      </div>
                      <div className="text-[9.5px] font-bold text-slate-500 mt-0.5">
                        Jornada de 10h de permanência
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectShiftChoice('Diurno', false)}
                      className={`px-3 py-2 rounded-xl text-left border transition-all cursor-pointer ${
                        shiftTypeChoice === 'Diurno'
                          ? 'bg-white border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                          : 'bg-white/70 border-slate-200 hover:bg-white text-slate-600'
                      }`}
                    >
                      <div className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                        <span>☀️</span> Turno Diurno (1 ou 2)
                      </div>
                      <div className="text-[9.5px] font-bold text-slate-500 mt-0.5">
                        06:00 às 18:00 (12h)
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectShiftChoice('Noturno', false)}
                      className={`px-3 py-2 rounded-xl text-left border transition-all cursor-pointer ${
                        shiftTypeChoice === 'Noturno'
                          ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'bg-white/70 border-slate-200 hover:bg-white text-slate-600'
                      }`}
                    >
                      <div className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                        <span>🌙</span> Turno Noturno (1 ou 2)
                      </div>
                      <div className="text-[9.5px] font-bold text-slate-500 mt-0.5">
                        18:00 às 06:00 (12h)
                      </div>
                    </button>
                  </div>
                </div>

                {/* HORÁRIOS: INÍCIO E TÉRMINO EFETIVO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">
                      {overtimeMode === 'pos_turno' ? 'Início do Expediente *' : 'Horário de Entrada *'}
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        if (isCommercialFlexible) {
                          setCustomFlexibleStart(e.target.value);
                        }
                      }}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono"
                    />
                    <p className="text-[9px] text-slate-400 font-medium mt-1">
                      {overtimeMode === 'pos_turno' 
                        ? (isCommercialFlexible ? 'Entrada flexível (jornada de 10h a partir deste horário)' : 'Início da jornada normal')
                        : 'Início do plantão extraordinário'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase tracking-wider mb-1">
                      {overtimeMode === 'pos_turno' ? 'Saída Efetiva (Passando) *' : 'Horário de Término *'}
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono"
                    />
                    {/* Botões de ajuste rápido */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const [eh, em] = endTime.split(':').map(Number);
                          const totalM = eh * 60 + em + 30;
                          const newH = Math.floor(totalM / 60) % 24;
                          const newM = totalM % 60;
                          setEndTime(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
                        }}
                        className="text-[9px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded cursor-pointer"
                        title="Acrescentar 30 minutos de saída"
                      >
                        +30m
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const [eh, em] = endTime.split(':').map(Number);
                          const totalM = eh * 60 + em + 60;
                          const newH = Math.floor(totalM / 60) % 24;
                          const newM = totalM % 60;
                          setEndTime(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
                        }}
                        className="text-[9px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded cursor-pointer"
                        title="Acrescentar 1 hora de saída"
                      >
                        +1h
                      </button>
                    </div>
                  </div>
                </div>

                {/* PAINEL DE RESULTADOS AUTOMÁTICOS */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Horas Trabalhando</span>
                      <span className="text-base font-black text-indigo-700 font-mono">{workingHoursFormatted}</span>
                      <span className="text-[9px] text-slate-400 font-bold block">{workingHours.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}h dec.</span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Horas Extras</span>
                      <span className="text-base font-black text-blue-600 font-mono">
                        {displayOvertimeValue ? `${displayOvertimeValue} ${overtimeUnit}` : overtimeHoursFormatted}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold block">{overtimeHours.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}h dec.</span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">HE (% HE)</span>
                      <span className="text-base font-black text-amber-600 font-mono">{overtimePercentage}%</span>
                      <span className="text-[9px] text-slate-400 font-bold block">{equivalentHours.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}h equiv.</span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Competência Folha</span>
                      <span className="text-xs font-black text-slate-800 block mt-1">Folha {formDatePayrollCycle.monthName}</span>
                      <span className="text-[8.5px] text-slate-400 font-bold block">{formDatePayrollCycle.intervalLabel}</span>
                    </div>
                  </div>

                  {/* EXPLICAÇÃO DO CÁLCULO DA REGRA DO TURNO APLICADA */}
                  {overtimeExplanation && (
                    <div className="p-3 bg-white rounded-xl border border-slate-200 text-[10.5px] space-y-1">
                      <div className="flex items-center gap-1.5 font-black text-slate-800">
                        <Sparkles size={13} className="text-blue-600" />
                        <span>Regra do Turno Aplicada:</span>
                      </div>
                      <p className="text-slate-600 font-medium leading-relaxed">
                        {overtimeExplanation}
                      </p>
                    </div>
                  )}

                  {/* SELEÇÃO RÁPIDA DE % HE */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                      Ajustar Porcentagem (% HE):
                    </span>
                    <div className="flex items-center gap-1.5">
                      {[50, 60, 70, 100].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setOvertimePercentage(p)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            overtimePercentage === p
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: MOTIVO E OBSERVAÇÕES */}
              <div className="space-y-3 pt-1">
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
                      Motivo / Atividade Realizada *
                    </label>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {isReasonNew && reason.trim().length > 0 ? (
                        <span className="text-amber-600 font-bold flex items-center gap-1">
                          <Sparkles size={11} /> Novo motivo
                        </span>
                      ) : (
                        'Escreva ou selecione da lista'
                      )}
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={reason}
                      onChange={(e) => {
                        setReason(e.target.value);
                        setShowReasonDropdown(true);
                      }}
                      onFocus={() => setShowReasonDropdown(true)}
                      placeholder="Escreva o motivo da hora extra ou busque na relação..."
                      className={`w-full pl-3 pr-20 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all ${
                        isReasonNew && reason.trim().length > 0
                          ? 'border-amber-400 bg-amber-50/20'
                          : 'border-slate-200'
                      }`}
                    />

                    {/* Botões de ação rápida à direita do input */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {reason && (
                        <button
                          type="button"
                          onClick={() => {
                            setReason('');
                            setShowReasonDropdown(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/80 transition-colors"
                          title="Limpar texto"
                        >
                          <X size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowReasonDropdown((prev) => !prev)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          showReasonDropdown
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                        }`}
                        title="Ver relação de motivos disponíveis"
                      >
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-200 ${
                            showReasonDropdown ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Informação sobre novo motivo a ser salvo */}
                  {isReasonNew && reason.trim().length > 0 && (
                    <div className="mt-1.5 p-2.5 bg-amber-50/90 border border-amber-200/80 rounded-xl flex items-center justify-between gap-2 text-[11px] text-amber-900">
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={14} className="text-amber-600 shrink-0" />
                        <span>
                          <strong>Novo motivo:</strong> Ao salvar o lançamento, este motivo será registrado na relação para aparecer nas próximas buscas.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await saveNewReasonToDatabase(reason.trim());
                        }}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer shadow-sm"
                        title="Salvar agora na relação de motivos"
                      >
                        Salvar na Relação
                      </button>
                    </div>
                  )}

                  {/* Dropdown de motivos e sugestões dinâmicas */}
                  {showReasonDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowReasonDropdown(false)}
                      />
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto z-20 py-1 divide-y divide-slate-100">
                        {/* Se o usuário digitou algo novo, opção explícita no topo */}
                        {isReasonNew && reason.trim().length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowReasonDropdown(false)}
                            className="w-full px-3 py-2 text-left bg-amber-50/80 hover:bg-amber-100/80 flex items-center justify-between text-xs cursor-pointer transition-colors border-b border-amber-100"
                          >
                            <div className="flex items-center gap-2 pr-2">
                              <Sparkles size={14} className="text-amber-600 shrink-0" />
                              <div>
                                <div className="font-black text-amber-900">
                                  Usar novo motivo: "{reason.trim()}"
                                </div>
                                <div className="text-[10px] text-amber-700">
                                  Será salvo na relação e sugerido nas próximas vezes
                                </div>
                              </div>
                            </div>
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-200 text-amber-800 rounded-md shrink-0">
                              Novo
                            </span>
                          </button>
                        )}

                        {/* Lista de motivos cadastrados e sugestões filtradas */}
                        {filteredReasonSuggestions.length > 0 ? (
                          filteredReasonSuggestions.map((item) => {
                            const isSelected = item.toLowerCase() === reason.trim().toLowerCase();
                            const isDefault = QUICK_REASONS.includes(item);

                            return (
                              <button
                                key={item}
                                type="button"
                                onClick={() => {
                                  setReason(item);
                                  setShowReasonDropdown(false);
                                }}
                                className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-blue-50 text-blue-900 font-black'
                                    : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-2 pr-2">
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      isSelected
                                        ? 'bg-blue-600'
                                        : isDefault
                                        ? 'bg-slate-300'
                                        : 'bg-emerald-500'
                                    }`}
                                  />
                                  <span className="leading-snug">{item}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {!isDefault && (
                                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                      Cadastrado
                                    </span>
                                  )}
                                  {isSelected && <Check size={14} className="text-blue-600" />}
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-3 py-4 text-center text-xs text-slate-400">
                            Nenhum motivo parecido encontrado na relação. O motivo digitado será salvo automaticamente como um novo motivo.
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                    Observações Adicionais (Opcional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Cobriu turno do operador Pedro / Conclusão de setup prioritário"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Botões do Rodapé do Modal */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-blue-600/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>{editingEntry ? 'Atualizar Lançamento' : 'Salvar Lançamento'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        title="Excluir Lançamento de Hora Extra"
        message="Tem certeza que deseja excluir permanentemente este lançamento de hora extra? Esta ação não pode ser desfeita."
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        confirmVariant="danger"
        onConfirm={handleDeleteEntry}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
};

export default OvertimeEntries;
