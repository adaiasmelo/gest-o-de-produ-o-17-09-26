import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Clock, Calendar, User, Users, FileText, CheckCircle2, AlertCircle, 
  Plus, Trash2, Edit2, Search, Filter, ArrowLeft, Loader2, 
  Printer, Check, X, Building2, Briefcase, ChevronRight, ChevronDown,
  Download, Eye, AlertTriangle, ShieldCheck, History, Info,
  Share2, Copy, Percent, Sparkles, UserCheck, RefreshCw, FileSpreadsheet,
  Sun, Moon, TrendingUp, BarChart3, PieChart as PieChartIcon, Activity,
  Award, Flame, Layers, Hash, Zap, Factory, CheckSquare
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../lib/firebase';
import { Employee, OvertimeEntry, OvertimeMode, SystemUser } from '../types';
import { INITIAL_OVERTIME_ENTRIES } from '../data/initialOvertimeEntries';
import ConfirmDialog from './ConfirmDialog';
import { ReasonInputWithSave } from './ReasonInputWithSave';
import { triggerHaptic } from '../utils/haptics';
import { logAuditEvent } from '../services/auditLogger';
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

export const BRAZILIAN_HOLIDAYS_MAP: Record<string, string> = {
  '01-01': 'Ano Novo / Confraternização',
  '04-21': 'Tiradentes',
  '05-01': 'Dia do Trabalho',
  '09-07': 'Independência do Brasil',
  '10-12': 'Nossa Sra. Aparecida',
  '11-02': 'Finados',
  '11-15': 'Proclamação da República',
  '11-20': 'Dia da Consciência Negra',
  '12-25': 'Natal'
};

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

  // Sub-Aba ativa: Dashboard & Análise vs Tabela de Apontamentos
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'records'>('dashboard');

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

  // Cálculos automáticos (60% dias normais seg a sáb, 110% domingos e feriados)
  const [workingHours, setWorkingHours] = useState<number>(11.8);
  const [workingHoursFormatted, setWorkingHoursFormatted] = useState<string>('11h 48min');
  const [overtimeHours, setOvertimeHours] = useState<number>(2);
  const [overtimeMinutes, setOvertimeMinutes] = useState<number>(120);
  const [displayOvertimeValue, setDisplayOvertimeValue] = useState<string>('2,00');
  const [overtimeUnit, setOvertimeUnit] = useState<'minutos' | 'horas'>('horas');
  const [overtimeHoursFormatted, setOvertimeHoursFormatted] = useState<string>('2h 00min');
  const [overtimePercentage, setOvertimePercentage] = useState<number>(60);
  const [equivalentHours, setEquivalentHours] = useState<number>(3.2);

  // Estados para as melhorias de usabilidade, batch, filtros e conformidade
  const [quickFilter, setQuickFilter] = useState<'all' | 'cycle' | 'this_week' | 'sun_holiday' | 'weekdays' | 'over_2h' | 'pending' | 'fatigue'>('all');
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [batchSearchTerm, setBatchSearchTerm] = useState<string>('');
  const [batchSectorFilter, setBatchSectorFilter] = useState<string>('all');
  const [rejectionModalId, setRejectionModalId] = useState<string | null>(null);
  const [rejectionReasonText, setRejectionReasonText] = useState<string>('');

  // Seleção de lançamentos para Exclusão Geral e Ações em Massa
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState<boolean>(false);
  const [bulkDeleteScope, setBulkDeleteScope] = useState<'selected' | 'filtered'>('selected');
  const [isDeletingBulk, setIsDeletingBulk] = useState<boolean>(false);

  // Justificativa e observações
  const [reason, setReason] = useState<string>('');
  const [requestedBy, setRequestedBy] = useState<string>(() => loggedUser?.name || 'Líder de Produção');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSeedingTests, setIsSeedingTests] = useState<boolean>(false);

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

  // Controle de rolagem por arrasto na Tabela de Apontamentos sem seleção acidental de texto
  const appointmentsTableRef = useRef<HTMLDivElement>(null);
  const [isTableDragging, setIsTableDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  const handleTableMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, a, textarea')) return;
    // Impede o aparecimento do cursor de texto ("pauzinho de texto") e seleção acidental ao arrastar a tabela
    e.preventDefault();
    try {
      window.getSelection()?.removeAllRanges();
    } catch (_) {}
    if (!appointmentsTableRef.current) return;
    setIsTableDragging(true);
    setDragStartX(e.pageX - appointmentsTableRef.current.offsetLeft);
    setDragScrollLeft(appointmentsTableRef.current.scrollLeft);
  };

  const handleTableMouseLeave = () => {
    setIsTableDragging(false);
    try {
      window.getSelection()?.removeAllRanges();
    } catch (_) {}
  };

  const handleTableMouseUp = () => {
    setIsTableDragging(false);
    try {
      window.getSelection()?.removeAllRanges();
    } catch (_) {}
  };

  const handleTableMouseMove = (e: React.MouseEvent) => {
    if (!isTableDragging || !appointmentsTableRef.current) return;
    e.preventDefault();
    try {
      window.getSelection()?.removeAllRanges();
    } catch (_) {}
    const x = e.pageX - appointmentsTableRef.current.offsetLeft;
    const walk = (x - dragStartX) * 1.5;
    appointmentsTableRef.current.scrollLeft = dragScrollLeft - walk;
  };

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
    let isMounted = true;
    const unsub = onSnapshot(
      collection(db, 'overtime_entries'),
      async (snapshot) => {
        if (!isMounted) return;
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        })) as OvertimeEntry[];

        if (list.length === 0) {
          // Se não houver lançamentos no Firestore, inicializa com os 22 lançamentos oficiais de teste
          setEntries(INITIAL_OVERTIME_ENTRIES);
          setIsLoading(false);
          try {
            for (const item of INITIAL_OVERTIME_ENTRIES) {
              await setDoc(doc(db, 'overtime_entries', item.id), item);
            }
          } catch (e) {
            console.warn('Erro ao auto-semear overtime_entries:', e);
          }
          return;
        }

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
        if (isMounted) {
          setEntries(INITIAL_OVERTIME_ENTRIES);
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMounted = false;
      unsub();
    };
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

  // Identificação do dia da semana e feriados nacionais a partir da data informada
  const dateDayInfo = useMemo(() => {
    if (!date) return { dayName: '', isSunday: false, isSaturday: false, isHoliday: false, holidayName: '', isSundayOrHoliday: false };
    const parts = date.split('-').map(Number);
    if (parts.length !== 3) return { dayName: '', isSunday: false, isSaturday: false, isHoliday: false, holidayName: '', isSundayOrHoliday: false };
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const dayOfWeek = d.getDay(); // 0 = Domingo, 6 = Sábado
    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const monthDay = `${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
    const holidayName = BRAZILIAN_HOLIDAYS_MAP[monthDay] || '';
    const isHoliday = Boolean(holidayName);
    const isSunday = dayOfWeek === 0;

    return {
      dayName: dayNames[dayOfWeek],
      isSunday,
      isSaturday: dayOfWeek === 6,
      isHoliday,
      holidayName,
      isSundayOrHoliday: isSunday || isHoliday
    };
  }, [date]);

  // Atualização automática de % de HE conforme regra da fábrica:
  // Domingo e Feriados = 110%, Segunda a Sábado (Dias Normais) = 60%
  useEffect(() => {
    if (!isFormOpen) return;
    if (editingEntry) return;

    if (dateDayInfo.isSundayOrHoliday) {
      setOvertimePercentage(110);
    } else {
      setOvertimePercentage(60);
    }
  }, [date, dateDayInfo.isSundayOrHoliday, isFormOpen, editingEntry]);

  // Cálculo de sobreposição com horário noturno (faixa das 22h00 às 05h00)
  const nightOverlapMinutes = useMemo(() => {
    if (!startTime || !endTime) return 0;
    try {
      const startM = timeStringToMinutes(startTime);
      let endM = timeStringToMinutes(endTime);
      if (endM <= startM) endM += 1440;

      let nightMin = 0;
      for (let m = startM; m < endM; m++) {
        const norm = m % 1440;
        if (norm >= 1320 || norm < 300) {
          nightMin++;
        }
      }
      return nightMin;
    } catch {
      return 0;
    }
  }, [startTime, endTime]);

  // Conversão de horário HH:MM para decimal (0 a 24)
  const timeToDecimal = (t: string) => {
    if (!t) return 0;
    const parts = t.split(':').map(Number);
    const h = isNaN(parts[0]) ? 0 : parts[0];
    const m = isNaN(parts[1]) ? 0 : parts[1];
    return h + m / 60;
  };

  // Farol de Conformidade e Alertas de Limites (CLT / Fadiga Operacional)
  const complianceAlerts = useMemo(() => {
    const alerts: { type: 'warning' | 'danger' | 'info'; title: string; message: string }[] = [];

    // 1. Limite Diário CLT (> 2 horas extras)
    if (overtimeHours > 2.0) {
      alerts.push({
        type: 'warning',
        title: 'Alerta de Limite Diário (CLT)',
        message: `O apontamento prevê ${overtimeHoursFormatted} de horas extras, excedendo o limite padrão de 2h00min diárias. Exige justificativa operacional relevante.`
      });
    }

    // 2. Fadiga / Descanso Interjornada (> 12h de permanência total)
    if (workingHours > 12.0) {
      alerts.push({
        type: 'danger',
        title: 'Alerta de Fadiga & Interjornada',
        message: `Jornada total de permanência estendida (${workingHoursFormatted}). É obrigatório assegurar o intervalo interjornada mínimo legal de 11 horas de descanso antes do próximo turno.`
      });
    }

    // 3. Adicional Noturno
    if (nightOverlapMinutes > 0) {
      const nightH = Math.floor(nightOverlapMinutes / 60);
      const nightM = nightOverlapMinutes % 60;
      alerts.push({
        type: 'info',
        title: 'Incidência de Horário Noturno',
        message: `Foram detectados ${nightH > 0 ? `${nightH}h ` : ''}${nightM}min de trabalho na faixa noturna (22h00 às 05h00), gerando adicional noturno.`
      });
    }

    // 4. Farol de Acúmulo no Ciclo (> 30 horas no ciclo atual)
    if (selectedEmployeeId && formDatePayrollCycle) {
      const pastCycleHours = entries
        .filter(e => e.employeeId === selectedEmployeeId && e.date >= formDatePayrollCycle.startDate && e.date <= formDatePayrollCycle.endDate && (!editingEntry || e.id !== editingEntry.id))
        .reduce((sum, e) => sum + (e.overtimeHours || 0), 0);

      const totalCycleAccumulated = pastCycleHours + overtimeHours;
      if (totalCycleAccumulated > 30) {
        alerts.push({
          type: 'danger',
          title: 'Farol Crítico de Acúmulo no Ciclo',
          message: `Este colaborador já possui ${pastCycleHours.toFixed(1)}h extras acumuladas neste ciclo da folha. Com este lançamento, atingirá ${totalCycleAccumulated.toFixed(1)}h. Recomenda-se rodízio de equipe.`
        });
      }
    }

    return alerts;
  }, [overtimeHours, overtimeHoursFormatted, workingHours, workingHoursFormatted, nightOverlapMinutes, selectedEmployeeId, formDatePayrollCycle, entries, editingEntry]);

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

      // 3. Horas Equivalentes calculadas com a porcentagem (60% ou 110%)
      const equiv = Number((result.estimatedHours * (1 + (overtimePercentage || 60) / 100)).toFixed(2));
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
    
    // Dia da semana e feriado de hoje (60% Seg a Sáb, 110% Dom e Feriados)
    const todayDay = new Date().getDay();
    const todayMD = `${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    const isTodayHolidayOrSun = todayDay === 0 || Boolean(BRAZILIAN_HOLIDAYS_MAP[todayMD]);
    setOvertimePercentage(isTodayHolidayOrSun ? 110 : 60);

    // Reseta modo lote
    setIsBatchMode(false);
    setSelectedEmployeeIds([]);
    setBatchSearchTerm('');
    setBatchSectorFilter('all');

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

    setIsBatchMode(false);
    setSelectedEmployeeIds([]);
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
    setOvertimePercentage(entry.overtimePercentage || 60);
    setReason(entry.reason || '');
    setShowReasonDropdown(false);
    setRequestedBy(entry.requestedBy || loggedUser?.name || 'Líder de Produção');
    setNotes(entry.notes || '');
    setAutoCalculateHours(false);
    setFormError(null);
    setIsFormOpen(true);
  };

  // Salvar no Firestore (Individual ou em Lote)
  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      triggerHaptic('error');
      onBlockedAction?.('Ação Bloqueada', 'Sua conta está em modo Somente Leitura.');
      return;
    }

    if (!isBatchMode && !employeeName.trim()) {
      triggerHaptic('warning');
      setFormError('Por favor, selecione ou informe o nome do operador.');
      return;
    }
    if (isBatchMode && selectedEmployeeIds.length === 0) {
      triggerHaptic('warning');
      setFormError('Por favor, selecione pelo menos um colaborador para o lançamento em grupo/lote.');
      return;
    }
    if (!date) {
      triggerHaptic('warning');
      setFormError('Por favor, selecione a data do lançamento.');
      return;
    }
    if (!startTime || !endTime) {
      triggerHaptic('warning');
      setFormError('Por favor, informe os horários de início e término.');
      return;
    }
    if (overtimeHours <= 0) {
      triggerHaptic('warning');
      setFormError('Os horários informados não geram horas extras conforme a regra do turno.');
      return;
    }
    if (!reason.trim()) {
      triggerHaptic('warning');
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
      // 1. LANÇAMENTO EM LOTE (MÚLTIPLOS OPERADORES)
      if (isBatchMode && !editingEntry) {
        const batchGroupId = `batch_${Date.now()}`;
        const selectedEmps = activePersonnelEmployees.filter((emp) => selectedEmployeeIds.includes(emp.id));

        for (const emp of selectedEmps) {
          const empCategory = getCanonicalShiftCategory(emp.shift, emp.sector);
          const empShift = emp.shift || (empCategory === 'Comercial' ? 'Comercial' : empCategory);
          
          const batchPayload: Omit<OvertimeEntry, 'id'> = {
            employeeId: emp.id,
            registration: (emp.registration || '').trim(),
            employeeName: emp.name.trim(),
            role: (emp.role || role || '').trim(),
            sector: (emp.sector || sector || 'Extrusão').trim(),
            machine: machine.trim(),
            shift: empShift,
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
            overtimePercentage: Number(overtimePercentage) || 60,
            overtimePercentageLabel: `${overtimePercentage}%`,
            equivalentHours,
            overtimeExplanation: overtimeExplanation.trim(),
            reason: reason.trim(),
            requestedBy: requestedBy.trim(),
            notes: notes.trim(),
            status: 'approved',
            batchGroupId,
            isNightShiftOvertime: nightOverlapMinutes > 0,
            nightMinutes: nightOverlapMinutes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: loggedUser?.id || 'anon',
            userName: loggedUser?.name || 'Sistema'
          };
          await addDoc(collection(db, 'overtime_entries'), batchPayload);
        }

        if (isReasonNew && reason.trim()) {
          await saveNewReasonToDatabase(reason.trim());
        }

        setIsFormOpen(false);
        setIsBatchMode(false);
        setSelectedEmployeeIds([]);
        return;
      }

      // 2. LANÇAMENTO INDIVIDUAL (1 OPERADOR)
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
        overtimePercentage: Number(overtimePercentage) || 60,
        overtimePercentageLabel: `${overtimePercentage}%`,
        equivalentHours,
        overtimeExplanation: overtimeExplanation.trim(),
        reason: reason.trim(),
        requestedBy: requestedBy.trim(),
        notes: notes.trim(),
        status: editingEntry ? (editingEntry.status || 'approved') : 'approved',
        isNightShiftOvertime: nightOverlapMinutes > 0,
        nightMinutes: nightOverlapMinutes,
        createdAt: editingEntry ? editingEntry.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: loggedUser?.id || 'anon',
        userName: loggedUser?.name || 'Sistema'
      };

      if (editingEntry) {
        await updateDoc(doc(db, 'overtime_entries', editingEntry.id), payload);
        logAuditEvent({
          action: 'UPDATE',
          module: 'Horas Extras',
          targetTitle: `Hora Extra - ${payload.employeeName} (${payload.overtimeHours}h)`,
          targetId: editingEntry.id,
          userName: loggedUser?.name || 'Sistema',
          userRole: loggedUser?.role,
          oldState: editingEntry,
          newState: { ...payload, id: editingEntry.id },
          reason: payload.notes || payload.reason,
        });
      } else {
        const docRef = await addDoc(collection(db, 'overtime_entries'), payload);
        logAuditEvent({
          action: 'CREATE',
          module: 'Horas Extras',
          targetTitle: `Hora Extra - ${payload.employeeName} (${payload.overtimeHours}h)`,
          targetId: docRef.id,
          userName: loggedUser?.name || 'Sistema',
          userRole: loggedUser?.role,
          newState: { ...payload, id: docRef.id },
          reason: payload.notes || payload.reason,
        });
      }

      triggerHaptic('success');

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

  // Aprovação em 1 clique
  const handleApproveEntry = async (entry: OvertimeEntry) => {
    if (isReadOnly) {
      onBlockedAction?.('Ação Bloqueada', 'Usuário com perfil somente leitura.');
      return;
    }
    try {
      await updateDoc(doc(db, 'overtime_entries', entry.id), {
        status: 'approved',
        approvedBy: loggedUser?.name || 'Supervisão de Produção',
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Erro ao aprovar hora extra:', err);
    }
  };

  // Rejeição com justificativa
  const handleOpenRejectModal = (entryId: string) => {
    if (isReadOnly) {
      onBlockedAction?.('Ação Bloqueada', 'Usuário com perfil somente leitura.');
      return;
    }
    setRejectionModalId(entryId);
    setRejectionReasonText('');
  };

  const handleConfirmReject = async () => {
    if (!rejectionModalId || !rejectionReasonText.trim()) return;
    try {
      await updateDoc(doc(db, 'overtime_entries', rejectionModalId), {
        status: 'rejected',
        rejectionReason: rejectionReasonText.trim(),
        approvedBy: loggedUser?.name || 'Supervisão de Produção',
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setRejectionModalId(null);
      setRejectionReasonText('');
    } catch (err) {
      console.error('Erro ao rejeitar hora extra:', err);
    }
  };

  // Exclusão Individual
  const handleDeleteEntry = async () => {
    if (!deleteConfirmId || isReadOnly) return;
    try {
      await deleteDoc(doc(db, 'overtime_entries', deleteConfirmId));
      setSelectedEntryIds((prev) => prev.filter((id) => id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Erro ao excluir lançamento de hora extra:', err);
    }
  };

  // Função para carregar ou restaurar os 22 lançamentos de teste oficiais no sistema
  const handleLoadTestEntries = async () => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Ação Bloqueada', 'Usuário com perfil somente leitura não tem permissão para cadastrar horas extras.');
      } else {
        alert('Usuário com perfil somente leitura não tem permissão para cadastrar horas extras.');
      }
      return;
    }

    setIsSeedingTests(true);
    try {
      for (const item of INITIAL_OVERTIME_ENTRIES) {
        await setDoc(doc(db, 'overtime_entries', item.id), item);
      }
      // Grava também os novos motivos na coleção overtime_reasons
      const newReasons = [
        'Troca emergencial de matriz e anel de ar Cast 2',
        'Apoio no fechamento de lote para auditoria ISO 9001',
        'Retrabalho de bobinas stretch para expedição imediata'
      ];
      for (const r of newReasons) {
        const slug = r.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
        await setDoc(doc(db, 'overtime_reasons', slug), { reason: r, createdAt: new Date().toISOString() }, { merge: true });
      }

      setEntries(INITIAL_OVERTIME_ENTRIES);
    } catch (err: any) {
      console.error('Erro ao semear lançamentos de teste:', err);
      setEntries(INITIAL_OVERTIME_ENTRIES);
    } finally {
      setIsSeedingTests(false);
    }
  };

  // Filtragem da listagem
  const filteredEntries = useMemo(() => {
    return entries.filter((item) => {
      // 1. Quick Filters de 1 Toque
      if (quickFilter === 'cycle') {
        const currentKey = getCurrentPayrollCycleKey();
        if (!isDateInPayrollCycle(item.date, currentKey)) return false;
      } else if (quickFilter === 'this_week') {
        if (!item.date) return false;
        const itemDate = new Date(item.date).getTime();
        const now = Date.now();
        const diffDays = (now - itemDate) / (1000 * 3600 * 24);
        if (diffDays < 0 || diffDays > 7) return false;
      } else if (quickFilter === 'sun_holiday') {
        const parts = (item.date || '').split('-').map(Number);
        if (parts.length === 3) {
          const d = new Date(parts[0], parts[1] - 1, parts[2]);
          const md = `${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
          const isSunOrHoliday = d.getDay() === 0 || Boolean(BRAZILIAN_HOLIDAYS_MAP[md]) || (item.overtimePercentage || 60) >= 100;
          if (!isSunOrHoliday) return false;
        }
      } else if (quickFilter === 'weekdays') {
        const parts = (item.date || '').split('-').map(Number);
        if (parts.length === 3) {
          const d = new Date(parts[0], parts[1] - 1, parts[2]);
          const md = `${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
          const isSunOrHoliday = d.getDay() === 0 || Boolean(BRAZILIAN_HOLIDAYS_MAP[md]) || (item.overtimePercentage || 60) >= 100;
          if (isSunOrHoliday) return false;
        }
      } else if (quickFilter === 'pending') {
        if (item.status && item.status !== 'pending') return false;
      } else if (quickFilter === 'over_2h') {
        if ((item.overtimeHours || 0) < 2.0) return false;
      }

      // 2. Filtro por Ciclo de Folha (fechamento dia 24)
      if (filterMonth !== 'todos') {
        if (!isDateInPayrollCycle(item.date, filterMonth)) {
          return false;
        }
      }

      // 3. Filtro por Setor
      if (filterSector !== 'todos') {
        const itemSec = (item.sector || '').toLowerCase();
        const filtSec = filterSector.toLowerCase();
        if (!itemSec.includes(filtSec)) {
          return false;
        }
      }

      // 4. Filtro por Turno
      if (filterShift !== 'todos') {
        const itemShift = (item.shiftTypeChoice || item.shift || '').toLowerCase();
        const isFlex = Boolean(item.isCommercialFlexible);
        if (filterShift === 'Comercial Padrão' && (itemShift.includes('flex') || isFlex || !itemShift.includes('comercial'))) return false;
        if (filterShift === 'Comercial Flexível' && (!itemShift.includes('flex') && !isFlex)) return false;
        if (filterShift === 'Diurno' && !itemShift.includes('diurno')) return false;
        if (filterShift === 'Noturno' && !itemShift.includes('noturno')) return false;
      }

      // 5. Filtro por Modalidade
      if (filterMode !== 'todos') {
        if (item.overtimeMode && item.overtimeMode !== filterMode) {
          return false;
        }
      }

      // 6. Busca livre por texto
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
  }, [entries, filterMonth, filterSector, filterShift, filterMode, searchTerm, quickFilter]);

  // Helpers de Seleção Múltipla e Exclusão Geral
  const isAllSelected = useMemo(() => {
    if (filteredEntries.length === 0) return false;
    return filteredEntries.every((item) => selectedEntryIds.includes(item.id));
  }, [filteredEntries, selectedEntryIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedEntryIds([]);
    } else {
      setSelectedEntryIds(filteredEntries.map((item) => item.id));
    }
  };

  const toggleSelectEntry = (id: string) => {
    setSelectedEntryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const entryToDelete = useMemo(() => {
    return entries.find((item) => item.id === deleteConfirmId);
  }, [entries, deleteConfirmId]);

  // Exclusão Geral (Selecionados ou Todos os Filtrados)
  const handleConfirmBulkDelete = async () => {
    if (isReadOnly) {
      onBlockedAction?.('Ação Bloqueada', 'Usuário com perfil somente leitura não tem permissão para excluir lançamentos.');
      return;
    }

    const idsToDelete = bulkDeleteScope === 'selected'
      ? selectedEntryIds
      : filteredEntries.map((item) => item.id);

    if (idsToDelete.length === 0) {
      setIsBulkDeleteModalOpen(false);
      return;
    }

    setIsDeletingBulk(true);
    try {
      for (const id of idsToDelete) {
        await deleteDoc(doc(db, 'overtime_entries', id));
      }
      setSelectedEntryIds([]);
      setIsBulkDeleteModalOpen(false);
    } catch (err) {
      console.error('Erro ao realizar exclusão geral:', err);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  // Estatísticas dos Lançamentos Filtrados (Oficial 60% dias normais seg a sáb, 110% domingos e feriados)
  const stats = useMemo(() => {
    let totalOvertimeHours = 0;
    let totalWorkingHours = 0;
    let totalEquivalentHours = 0;
    let count60 = 0;
    let count110 = 0;
    let hours60 = 0;
    let hours110 = 0;
    let pendingCount = 0;
    let approvedCount = 0;
    const uniqueEmp = new Set<string>();
    const sectorHoursMap: Record<string, number> = {};

    filteredEntries.forEach((item) => {
      const otH = Number(item.overtimeHours) || 0;
      const wkH = Number(item.workingHours) || otH;
      const is110 = (item.overtimePercentage || 60) >= 100;
      const eqH = Number(item.equivalentHours) || (otH * (1 + (item.overtimePercentage || (is110 ? 110 : 60)) / 100));

      totalOvertimeHours += otH;
      totalWorkingHours += wkH;
      totalEquivalentHours += eqH;

      if (is110) {
        count110++;
        hours110 += otH;
      } else {
        count60++;
        hours60 += otH;
      }

      if (item.status === 'pending') {
        pendingCount++;
      } else {
        approvedCount++;
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
      hours60: Number(hours60.toFixed(2)),
      hours110: Number(hours110.toFixed(2)),
      count60,
      count110,
      pendingCount,
      approvedCount,
      topSector,
      topSectorHours: Number(topSectorHours.toFixed(2))
    };
  }, [filteredEntries]);

  // Inteligência de Dados e Analytics para o Dashboard de Horas Extras
  const dashboardAnalytics = useMemo(() => {
    const dailyMap: Record<string, { date: string; dateLabel: string; dayOfWeek: string; hours60: number; hours110: number; totalHours: number; launches: number; employees: Set<string> }> = {};
    const sectorMap: Record<string, { sector: string; hours: number; hours60: number; hours110: number; launches: number; employees: Set<string> }> = {};
    const shiftMap: Record<string, { shift: string; hours: number; launches: number }> = {};
    const modeMap: Record<string, { mode: string; label: string; hours: number; launches: number }> = {
      pos_turno: { mode: 'pos_turno', label: 'Passando do Horário (Extensão)', hours: 0, launches: 0 },
      integral: { mode: 'integral', label: 'Turno Extra Integral', hours: 0, launches: 0 }
    };
    const reasonMap: Record<string, { reason: string; hours: number; launches: number }> = {};
    
    const dayOfWeekNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const dayOfWeekShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const weekdayMap = dayOfWeekNames.map((name, idx) => ({
      dayIndex: idx,
      name,
      short: dayOfWeekShort[idx],
      hours60: 0,
      hours110: 0,
      totalHours: 0,
      launches: 0
    }));

    const employeeMap: Record<string, {
      id: string;
      name: string;
      registration: string;
      sector: string;
      role: string;
      shift: string;
      hours60: number;
      hours110: number;
      totalHours: number;
      workingHours: number;
      equivalentHours: number;
      launches: number;
      dates: string[];
    }> = {};

    const machineMap: Record<string, { machine: string; hours: number; launches: number }> = {};
    const requesterMap: Record<string, { requester: string; hours: number; launches: number }> = {};

    const timeSlots = [
      { key: 'madrugada', label: 'Madrugada (00h-06h)', hours: 0, count: 0 },
      { key: 'manha', label: 'Manhã (06h-12h)', hours: 0, count: 0 },
      { key: 'tarde', label: 'Tarde (12h-18h)', hours: 0, count: 0 },
      { key: 'noite', label: 'Noite (18h-24h)', hours: 0, count: 0 }
    ];

    let totalOtHours = 0;
    let totalWkHours = 0;
    let totalEqHours = 0;
    let sum60 = 0;
    let sum110 = 0;

    filteredEntries.forEach((entry) => {
      const otH = Number(entry.overtimeHours) || 0;
      const wkH = Number(entry.workingHours) || otH;
      const is110 = (entry.overtimePercentage || 60) >= 100;
      const eqH = Number(entry.equivalentHours) || (otH * (1 + (entry.overtimePercentage || (is110 ? 110 : 60)) / 100));

      totalOtHours += otH;
      totalWkHours += wkH;
      totalEqHours += eqH;

      if (is110) sum110 += otH;
      else sum60 += otH;

      const dateStr = entry.date || '';
      if (dateStr) {
        if (!dailyMap[dateStr]) {
          const parts = dateStr.split('-').map(Number);
          const d = new Date(parts[0], parts[1] - 1, parts[2]);
          const dayName = dayOfWeekNames[d.getDay()] || '';
          const label = `${String(parts[2]).padStart(2, '0')}/${String(parts[1]).padStart(2, '0')}`;
          dailyMap[dateStr] = {
            date: dateStr,
            dateLabel: label,
            dayOfWeek: dayName,
            hours60: 0,
            hours110: 0,
            totalHours: 0,
            launches: 0,
            employees: new Set<string>()
          };
        }
        if (is110) dailyMap[dateStr].hours110 += otH;
        else dailyMap[dateStr].hours60 += otH;
        dailyMap[dateStr].totalHours += otH;
        dailyMap[dateStr].launches += 1;
        if (entry.employeeName) dailyMap[dateStr].employees.add(entry.employeeName);

        const parts = dateStr.split('-').map(Number);
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        const dayIdx = d.getDay();
        if (weekdayMap[dayIdx]) {
          if (is110) weekdayMap[dayIdx].hours110 += otH;
          else weekdayMap[dayIdx].hours60 += otH;
          weekdayMap[dayIdx].totalHours += otH;
          weekdayMap[dayIdx].launches += 1;
        }
      }

      const sec = entry.sector || 'Outro';
      if (!sectorMap[sec]) {
        sectorMap[sec] = { sector: sec, hours: 0, hours60: 0, hours110: 0, launches: 0, employees: new Set<string>() };
      }
      sectorMap[sec].hours += otH;
      if (is110) sectorMap[sec].hours110 += otH;
      else sectorMap[sec].hours60 += otH;
      sectorMap[sec].launches += 1;
      if (entry.employeeName) sectorMap[sec].employees.add(entry.employeeName);

      const sh = entry.shift || entry.shiftTypeChoice || 'Comercial';
      if (!shiftMap[sh]) {
        shiftMap[sh] = { shift: sh, hours: 0, launches: 0 };
      }
      shiftMap[sh].hours += otH;
      shiftMap[sh].launches += 1;

      const m = entry.overtimeMode === 'integral' ? 'integral' : 'pos_turno';
      modeMap[m].hours += otH;
      modeMap[m].launches += 1;

      const r = (entry.reason || 'Demanda de produção').trim();
      if (!reasonMap[r]) {
        reasonMap[r] = { reason: r, hours: 0, launches: 0 };
      }
      reasonMap[r].hours += otH;
      reasonMap[r].launches += 1;

      if (entry.machine && entry.machine.trim()) {
        const mac = entry.machine.trim();
        if (!machineMap[mac]) {
          machineMap[mac] = { machine: mac, hours: 0, launches: 0 };
        }
        machineMap[mac].hours += otH;
        machineMap[mac].launches += 1;
      }

      const req = (entry.requestedBy || 'Líder de Turno').trim();
      if (!requesterMap[req]) {
        requesterMap[req] = { requester: req, hours: 0, launches: 0 };
      }
      requesterMap[req].hours += otH;
      requesterMap[req].launches += 1;

      const st = (entry.startTime || '07:30').split(':').map(Number);
      const startHour = isNaN(st[0]) ? 7 : st[0];
      if (startHour >= 0 && startHour < 6) {
        timeSlots[0].hours += otH;
        timeSlots[0].count += 1;
      } else if (startHour >= 6 && startHour < 12) {
        timeSlots[1].hours += otH;
        timeSlots[1].count += 1;
      } else if (startHour >= 12 && startHour < 18) {
        timeSlots[2].hours += otH;
        timeSlots[2].count += 1;
      } else {
        timeSlots[3].hours += otH;
        timeSlots[3].count += 1;
      }

      const empKey = (entry.registration || entry.employeeName || 'Desconhecido').trim().toLowerCase();
      if (!employeeMap[empKey]) {
        employeeMap[empKey] = {
          id: entry.employeeId || empKey,
          name: entry.employeeName || 'Sem Nome',
          registration: entry.registration || '-',
          sector: entry.sector || '-',
          role: entry.role || 'Operador',
          shift: entry.shift || entry.shiftTypeChoice || '-',
          hours60: 0,
          hours110: 0,
          totalHours: 0,
          workingHours: 0,
          equivalentHours: 0,
          launches: 0,
          dates: []
        };
      }
      if (is110) employeeMap[empKey].hours110 += otH;
      else employeeMap[empKey].hours60 += otH;
      employeeMap[empKey].totalHours += otH;
      employeeMap[empKey].workingHours += wkH;
      employeeMap[empKey].equivalentHours += eqH;
      employeeMap[empKey].launches += 1;
      if (entry.date && !employeeMap[empKey].dates.includes(entry.date)) {
        employeeMap[empKey].dates.push(entry.date);
      }
    });

    const timelineList = Object.values(dailyMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(item => ({
        ...item,
        hours60: Number(item.hours60.toFixed(2)),
        hours110: Number(item.hours110.toFixed(2)),
        totalHours: Number(item.totalHours.toFixed(2)),
        employeesCount: item.employees.size
      }));

    const sectorList = Object.values(sectorMap)
      .map(s => ({
        sector: s.sector,
        hours: Number(s.hours.toFixed(2)),
        hours60: Number(s.hours60.toFixed(2)),
        hours110: Number(s.hours110.toFixed(2)),
        launches: s.launches,
        employeesCount: s.employees.size,
        percentage: totalOtHours > 0 ? Number(((s.hours / totalOtHours) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.hours - a.hours);

    const shiftList = Object.values(shiftMap)
      .map(s => ({
        shift: s.shift,
        hours: Number(s.hours.toFixed(2)),
        launches: s.launches,
        percentage: totalOtHours > 0 ? Number(((s.hours / totalOtHours) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.hours - a.hours);

    const reasonList = Object.values(reasonMap)
      .map(r => ({
        reason: r.reason,
        hours: Number(r.hours.toFixed(2)),
        launches: r.launches,
        percentage: totalOtHours > 0 ? Number(((r.hours / totalOtHours) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.hours - a.hours);

    // Análise de Causa-Raiz (Pareto 80/20)
    let cumulativeH = 0;
    const paretoReasonList = reasonList.map((r) => {
      cumulativeH += r.hours;
      const cumPct = totalOtHours > 0 ? Number(((cumulativeH / totalOtHours) * 100).toFixed(1)) : 0;
      return {
        ...r,
        cumulativeHours: Number(cumulativeH.toFixed(2)),
        cumulativePercentage: Math.min(cumPct, 100)
      };
    });

    const rankedEmployees = Object.values(employeeMap)
      .map(e => ({
        ...e,
        hours60: Number(e.hours60.toFixed(2)),
        hours110: Number(e.hours110.toFixed(2)),
        totalHours: Number(e.totalHours.toFixed(2)),
        workingHours: Number(e.workingHours.toFixed(2)),
        equivalentHours: Number(e.equivalentHours.toFixed(2)),
        percentageOfTotal: totalOtHours > 0 ? Number(((e.totalHours / totalOtHours) * 100).toFixed(1)) : 0,
        averagePerLaunch: e.launches > 0 ? Number((e.totalHours / e.launches).toFixed(1)) : 0
      }))
      .sort((a, b) => b.totalHours - a.totalHours);

    // Contadores de alerta de fadiga (>30h e >40h no ciclo)
    const criticalEmployeesCount = rankedEmployees.filter(e => e.totalHours >= 30).length;
    const severeEmployeesCount = rankedEmployees.filter(e => e.totalHours >= 40).length;

    const machineList = Object.values(machineMap)
      .map(m => ({
        machine: m.machine,
        hours: Number(m.hours.toFixed(2)),
        launches: m.launches
      }))
      .sort((a, b) => b.hours - a.hours);

    const requesterList = Object.values(requesterMap)
      .map(r => ({
        requester: r.requester,
        hours: Number(r.hours.toFixed(2)),
        launches: r.launches
      }))
      .sort((a, b) => b.hours - a.hours);

    const averagePerEmployee = Object.keys(employeeMap).length > 0
      ? Number((totalOtHours / Object.keys(employeeMap).length).toFixed(1))
      : 0;

    return {
      totalOtHours: Number(totalOtHours.toFixed(2)),
      totalWkHours: Number(totalWkHours.toFixed(2)),
      totalEqHours: Number(totalEqHours.toFixed(2)),
      sum60: Number(sum60.toFixed(2)),
      sum110: Number(sum110.toFixed(2)),
      averagePerEmployee,
      uniqueEmployeesCount: Object.keys(employeeMap).length,
      criticalEmployeesCount,
      severeEmployeesCount,
      timelineList,
      sectorList,
      shiftList,
      reasonList,
      paretoReasonList,
      rankedEmployees,
      machineList,
      requesterList,
      weekdayList: weekdayMap.map(w => ({
        ...w,
        hours60: Number(w.hours60.toFixed(2)),
        hours110: Number(w.hours110.toFixed(2)),
        totalHours: Number(w.totalHours.toFixed(2))
      })),
      modeList: [
        {
          label: 'Passando do Horário (Extensão)',
          hours: Number(modeMap.pos_turno.hours.toFixed(2)),
          launches: modeMap.pos_turno.launches,
          percentage: totalOtHours > 0 ? Number(((modeMap.pos_turno.hours / totalOtHours) * 100).toFixed(1)) : 0
        },
        {
          label: 'Turno Extra Integral (100% Extra)',
          hours: Number(modeMap.integral.hours.toFixed(2)),
          launches: modeMap.integral.launches,
          percentage: totalOtHours > 0 ? Number(((modeMap.integral.hours / totalOtHours) * 100).toFixed(1)) : 0
        }
      ],
      timeSlots: timeSlots.map(t => ({
        ...t,
        hours: Number(t.hours.toFixed(2)),
        percentage: totalOtHours > 0 ? Number(((t.hours / totalOtHours) * 100).toFixed(1)) : 0
      }))
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
      'Status de Validação',
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
      const statusLabel = item.status === 'approved' ? 'Aprovado' : item.status === 'rejected' ? 'Rejeitado' : 'Pendente';

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
        `${item.overtimePercentage || 60}%`,
        (item.equivalentHours || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        statusLabel,
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
      `${item.overtimePercentage || 60}%`,
      `${(item.equivalentHours || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}h`,
      item.status === 'approved' ? 'Aprovado' : item.status === 'rejected' ? 'Rejeitado' : 'Pendente',
      item.overtimeExplanation || item.reason || '-'
    ]);

    autoTable(doc, {
      startY: 28,
      margin: { left: margin, right: margin },
      head: [
        ['#', 'Matr.', 'Colaborador', 'Setor', 'Turno', 'Modo', 'Data', 'Início', 'Fim', 'Trabalhando', 'HE', '% HE', 'Equiv.', 'Status', 'Regra / Justificativa']
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
      {/* CABEÇALHO SUPERIOR ORGANIZADO */}
      {/* ============================================================== */}
      <div className="px-6 sm:px-8 py-5 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-200 shadow-xs shrink-0">
            <Clock size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                Lançamento de Horas Extras
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider border border-blue-200">
                Folha: Fechamento Dia 24
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider border border-slate-200">
                {filterMonth === 'todos' ? 'Todos os Períodos' : activePayrollCycle.shortLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
              Apontamento mensal, apuração oficial e controle de horas extras conforme regras de turno.
            </p>
          </div>
        </div>

        {/* GRUPO DE BOTÕES DE AÇÃO: ORGANIZADOS E PADRONIZADOS */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Grupo de Exportação (Excel + Relatório PDF) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={exportToCSV}
              className="px-3.5 py-2 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-xl transition-all flex items-center gap-1.5 text-xs font-black uppercase tracking-wider shadow-2xs border border-transparent hover:border-emerald-200 cursor-pointer active:scale-95"
              title="Exportar dados da planilha para Excel (.CSV)"
            >
              <FileSpreadsheet size={15} className="text-emerald-600 shrink-0" />
              <span>Excel (CSV)</span>
            </button>

            <button
              type="button"
              onClick={exportToPDF}
              className="px-3.5 py-2 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-800 rounded-xl transition-all flex items-center gap-1.5 text-xs font-black uppercase tracking-wider shadow-2xs border border-transparent hover:border-blue-200 cursor-pointer active:scale-95 ml-1"
              title="Exportar relatório consolidado oficial em PDF"
            >
              <Printer size={15} className="text-blue-600 shrink-0" />
              <span>Relatório PDF</span>
            </button>
          </div>

          {/* Botão Exclusão Geral */}
          {(!isReadOnly || canManage) && (
            <button
              type="button"
              onClick={() => {
                if (selectedEntryIds.length > 0) {
                  setBulkDeleteScope('selected');
                } else {
                  setBulkDeleteScope('filtered');
                }
                setIsBulkDeleteModalOpen(true);
              }}
              disabled={filteredEntries.length === 0}
              className={`px-3.5 py-2.5 rounded-2xl transition-all flex items-center gap-2 text-xs font-black uppercase tracking-wider border cursor-pointer active:scale-95 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed ${
                selectedEntryIds.length > 0
                  ? 'bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-600/20 hover:bg-rose-700'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border-rose-200'
              }`}
              title="Exclusão geral de apontamentos (selecionados ou todos os filtrados)"
            >
              <Trash2 size={15} className={selectedEntryIds.length > 0 ? 'text-white' : 'text-rose-600'} />
              <span>Exclusão Geral</span>
              {selectedEntryIds.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/30 text-[10px] font-black">
                  {selectedEntryIds.length}
                </span>
              )}
            </button>
          )}

          {/* Botão Novo Lançamento (Ação Primária Principal) */}
          {(!isReadOnly || canManage) && (
            <button
              type="button"
              onClick={() => {
                if (isReadOnly) {
                  if (onBlockedAction) onBlockedAction('Ação Bloqueada', 'Usuário com perfil somente leitura não tem permissão para cadastrar horas extras.');
                  else alert('Usuário com perfil somente leitura não tem permissão para cadastrar horas extras.');
                  return;
                }
                handleOpenCreateModal();
              }}
              className="px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer shrink-0"
              title="Cadastrar Novo Lançamento de Hora Extra"
            >
              <Plus size={16} />
              <span>Novo Lançamento</span>
            </button>
          )}

          {/* Botão Voltar */}
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-black uppercase tracking-wider shadow-2xs active:scale-95"
            title="Voltar ao Quadro Geral de Pessoal"
          >
            <ArrowLeft size={15} />
            <span>Voltar</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* SELETOR DE TELAS: DASHBOARD vs TABELA */}
      {/* ============================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 sm:px-8 py-3">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveSubTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <BarChart3 size={15} />
            Indicadores & Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('records')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'records'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <FileText size={15} />
            Tabela de Apontamentos ({filteredEntries.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 text-[10px] font-black uppercase border border-blue-200">
            <Clock size={13} className="text-blue-600" />
            <span>Total Filtrado: {stats.totalOvertimeHours.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}h extras</span>
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
            {filteredEntries.length} lançamento(s)
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* CONTEÚDO PRINCIPAL (DASHBOARD OU TABELA DE LANÇAMENTOS) */}
      {/* ============================================================== */}
      <div className="p-6 sm:p-8 space-y-6">

        {/* ============================================================== */}
        {/* BARRA DE FILTROS & BUSCA INTEGRADA E COMPACTA */}
        {/* ============================================================== */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Input de Busca */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por colaborador, matrícula, cargo ou motivo..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
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

            {/* Botão Limpar Filtros se houver algum ativo */}
            {(searchTerm || filterSector !== 'todos' || filterShift !== 'todos' || quickFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFilterSector('todos');
                  setFilterShift('todos');
                  setQuickFilter('all');
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <X size={12} />
                <span>Limpar Filtros</span>
              </button>
            )}
          </div>

          {/* Atalhos Rápidos de Filtro */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-100 no-scrollbar">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 shrink-0 mr-1">
              <Zap size={13} className="text-amber-500" /> Atalhos:
            </span>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'cycle', label: 'Ciclo Vigente (25 a 24)' },
              { id: 'this_week', label: 'Esta Semana' },
              { id: 'sun_holiday', label: 'Domingos / Feriados (110%)' },
              { id: 'weekdays', label: 'Dias Normais (60%)' },
              { id: 'pending', label: 'Pendentes' },
              { id: 'over_2h', label: 'Acima de 2h/dia' },
              { id: 'fatigue', label: 'Alerta Fadiga (>30h)' },
            ].map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setQuickFilter(pill.id as any)}
                className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                  quickFilter === pill.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* ============================================================== */}
        {/* VISUALIZAÇÃO 1: DASHBOARD COMPLETO & ANÁLISE DE DADOS */}
        {/* ============================================================== */}
        {activeSubTab === 'dashboard' ? (
          <div className="space-y-6">
            
            {/* Cards de KPIs Executivos */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Horas Extras */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Horas Extras</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <Clock size={16} />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">
                  {stats.totalOvertimeHours.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}h
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="text-blue-700 font-extrabold">{filterMonth === 'todos' ? 'Base Completa' : activePayrollCycle.shortLabel}</span>
                  <span className="text-slate-400 font-semibold">{Math.round(stats.totalOvertimeHours * 60)} min</span>
                </div>
              </div>

              {/* Card 2: Horas Trabalhando */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horas Trabalhando</span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <UserCheck size={16} />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">
                  {stats.totalWorkingHours.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}h
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-bold">Permanência Efetiva</span>
                  <span className="text-indigo-600 font-black">Presencial</span>
                </div>
              </div>

              {/* Card 3: Horas Equivalentes (+60% e +110%) */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horas Equivalentes</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Percent size={16} />
                  </div>
                </div>
                <div className="text-3xl font-black text-amber-600 tracking-tight">
                  {stats.totalEquivalentHours.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}h
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-bold">Ponderado c/ Adicional</span>
                  <span className="text-amber-700 font-extrabold">+60% e +110%</span>
                </div>
              </div>

              {/* Card 4: Colaboradores & Média */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Equipe com HE</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Users size={16} />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">
                  {stats.uniqueEmployees} <span className="text-xs text-slate-400 font-semibold">colab.</span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-bold">Média por Colaborador</span>
                  <span className="text-emerald-700 font-extrabold">{dashboardAnalytics.averagePerEmployee}h/pes.</span>
                </div>
              </div>

              {/* Card 5: Divisão 60% vs 110% */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faixa de HE (% HE)</span>
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                    <Zap size={16} />
                  </div>
                </div>
                <div className="text-xl font-black text-slate-900 tracking-tight">
                  <span className="text-blue-600">{stats.hours60}h</span> <span className="text-xs text-slate-400 font-medium">(60%)</span> • <span className="text-amber-600">{stats.hours110}h</span> <span className="text-xs text-slate-400 font-medium">(110%)</span>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-bold">{stats.count60} laç. a 60% (Seg-Sáb)</span>
                  <span className="text-amber-700 font-extrabold">{stats.count110} laç. a 110% (Dom/Fer)</span>
                </div>
              </div>

              {/* Card 6: Setor Principal */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Setor Mais Demandado</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <Building2 size={16} />
                  </div>
                </div>
                <div className="text-xl font-black text-purple-700 tracking-tight truncate">
                  {stats.topSector}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-bold">{stats.topSectorHours}h acumuladas</span>
                  <span className="text-purple-700 font-extrabold">
                    {stats.totalOvertimeHours > 0 ? ((stats.topSectorHours / stats.totalOvertimeHours) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>

              {/* Card 7: Alerta de Fadiga & Sobrecarga */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alerta de Fadiga & Limites</span>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                    dashboardAnalytics.criticalEmployeesCount > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    <AlertTriangle size={16} />
                  </div>
                </div>
                <div className="text-lg font-black text-slate-800 tracking-tight truncate">
                  {dashboardAnalytics.criticalEmployeesCount > 0 ? (
                    <span className="text-red-600 font-black">{dashboardAnalytics.criticalEmployeesCount} em Alerta (&gt;30h)</span>
                  ) : (
                    <span className="text-emerald-600 font-black">Operação Segura</span>
                  )}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-bold">&gt;40h: {dashboardAnalytics.severeEmployeesCount} crítico(s)</span>
                  <button
                    type="button"
                    onClick={() => setQuickFilter('fatigue')}
                    className="text-red-700 font-black hover:underline cursor-pointer"
                  >
                    Filtrar Alertas
                  </button>
                </div>
              </div>

              {/* Card 8: Total de Lançamentos */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Lançamentos</span>
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
                    <FileText size={16} />
                  </div>
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">
                  {stats.totalLaunches}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 font-bold">{stats.pendingCount} pendente(s)</span>
                  <span className="text-blue-600 font-extrabold">{stats.approvedCount} aprovado(s)</span>
                </div>
              </div>
            </div>

            {/* Banner de Alerta Crítico de Fadiga (Sugestão 3) */}
            {dashboardAnalytics.criticalEmployeesCount > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-900 uppercase">
                      Alerta Operacional: {dashboardAnalytics.criticalEmployeesCount} colaborador(es) com acúmulo excessivo de horas extras (&gt;30h no ciclo)
                    </h4>
                    <p className="text-[11px] text-amber-800 font-medium">
                      Recomenda-se aos líderes de turno realizar rodízio nas escalas e priorizar folgas para prevenir fadiga e sobrecarga de jornada.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setQuickFilter('fatigue')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase transition-all shadow-sm shrink-0 cursor-pointer"
                >
                  Ver Colaboradores
                </button>
              </div>
            )}

            {/* Banner de Ação Rápida */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-6 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <Sparkles size={18} className="text-amber-300" />
                  <h3 className="text-base font-black uppercase tracking-tight">
                    Painel Geral de Horas Extras • Manupackaging Fitasa & Amazônia
                  </h3>
                </div>
                <p className="text-xs text-blue-100 max-w-2xl font-medium">
                  Controle analítico de sobrejornada em conformidade com as regras oficiais de turno: Comercial Padrão (9h48m), Comercial Flexível (10h), Diurno (12h), Noturno (12h) e Turno Integral.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isReadOnly) {
                    if (onBlockedAction) onBlockedAction('Ação Bloqueada', 'Usuário com perfil somente leitura.');
                    else alert('Usuário com perfil somente leitura.');
                    return;
                  }
                  handleOpenCreateModal();
                }}
                className="px-5 py-3 bg-white text-blue-700 hover:bg-blue-50 active:scale-95 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center gap-2 shrink-0"
              >
                <Plus size={16} />
                Fazer Novo Lançamento
              </button>
            </div>

            {/* Grid de Gráficos Analíticos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Gráfico 1: Evolução Diária no Período */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <TrendingUp size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                        Evolução Diária de Horas Extras (Linha Temporal)
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Distribuição cronológica no ciclo ({stats.totalOvertimeHours}h acumuladas)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-bold">
                    <span className="flex items-center gap-1.5 text-blue-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> 60% (Seg-Sáb)
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> 110% (Dom/Fer)
                    </span>
                  </div>
                </div>

                <div className="h-64 w-full">
                  {dashboardAnalytics.timelineList.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                      <Clock size={24} className="mb-2 opacity-50" />
                      Sem dados cronológicos no filtro selecionado
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dashboardAnalytics.timelineList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorOt60" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                          </linearGradient>
                          <linearGradient id="colorOt110" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} unit="h" />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                                <div className="font-black text-amber-300">{d.dateLabel} • {d.dayOfWeek}</div>
                                <div className="text-[11px] text-slate-300">Total: <span className="font-bold text-white">{d.totalHours}h extras</span></div>
                                <div className="text-[10px] text-blue-300">HE 60%: {d.hours60}h</div>
                                <div className="text-[10px] text-amber-300">HE 110%: {d.hours110}h</div>
                                <div className="text-[10px] text-emerald-300 pt-1 border-t border-slate-700">
                                  {d.employeesCount} colaborador(es) • {d.launches} lançamento(s)
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Area type="monotone" dataKey="hours60" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorOt60)" name="60%" />
                        <Area type="monotone" dataKey="hours110" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorOt110)" name="110%" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Gráfico 2: Horas Extras por Setor */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                      <Building2 size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                        Horas Extras por Setor da Fábrica
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Volume acumulado (Divisão 60% e 110%)
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200">
                    {dashboardAnalytics.sectorList.length} setores ativos
                  </span>
                </div>

                <div className="h-64 w-full">
                  {dashboardAnalytics.sectorList.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                      <Building2 size={24} className="mb-2 opacity-50" />
                      Sem dados por setor
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardAnalytics.sectorList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="sector" tick={{ fontSize: 9.5, fill: '#475569', fontWeight: 600 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} unit="h" />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length) return null;
                            const s = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                                <div className="font-black text-purple-300">{s.sector}</div>
                                <div className="text-[11px] text-slate-300">Total: <span className="font-bold text-white">{s.hours}h ({s.percentage}%)</span></div>
                                <div className="text-[10px] text-blue-300">60%: {s.hours60}h • 110%: {s.hours110}h</div>
                                <div className="text-[10px] text-emerald-300">{s.employeesCount} colaboradores envolvidos</div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="hours60" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} name="60%" />
                        <Bar dataKey="hours110" fill="#f59e0b" stackId="a" radius={[6, 6, 0, 0]} name="110%" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Gráfico 3: Distribuição por Dia da Semana */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                        Distribuição por Dia da Semana (Seg a Dom)
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Dias Normais 60% vs Domingos e Feriados 110%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dashboardAnalytics.weekdayList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="short" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} unit="h" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const w = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1">
                              <div className="font-black text-emerald-300">{w.name}</div>
                              <div className="text-[11px] text-slate-300">Total: <span className="font-bold text-white">{w.totalHours}h</span></div>
                              <div className="text-[10px] text-blue-300">60%: {w.hours60}h</div>
                              <div className="text-[10px] text-amber-300">110%: {w.hours110}h</div>
                              <div className="text-[10px] text-slate-400">{w.launches} lançamento(s)</div>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="hours60" fill="#3b82f6" stackId="w" name="60%" />
                      <Bar dataKey="hours110" fill="#f59e0b" stackId="w" radius={[6, 6, 0, 0]} name="110%" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico 4: Análise de Causa-Raiz (Pareto 80/20 de Motivos de HE) */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                      <FileText size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                          Análise de Causa-Raiz (Pareto de Motivos)
                        </h4>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-black uppercase">
                          Regra 80/20
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Causas prioritárias geradoras de sobrejornada industrial
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-64 pr-2">
                  {dashboardAnalytics.paretoReasonList.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-xs">
                      Sem motivos registrados
                    </div>
                  ) : (
                    dashboardAnalytics.paretoReasonList.map((r, idx) => {
                      const isVitalFew = r.cumulativePercentage <= 80;
                      return (
                        <div key={idx} className="p-2 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 truncate max-w-[260px] sm:max-w-xs">
                              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                                isVitalFew ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                              }`}>
                                {idx + 1}
                              </span>
                              <span className="font-bold text-slate-800 truncate" title={r.reason}>
                                {r.reason}
                              </span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[11px] font-black text-slate-800">{r.hours}h</span>
                              <span className="text-[9px] text-slate-400 font-semibold ml-1">({r.percentage}%)</span>
                              <span className="text-[9px] text-amber-700 font-bold ml-1.5 bg-amber-50 px-1 rounded">
                                Acum: {r.cumulativePercentage}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isVitalFew ? 'bg-amber-500' : 'bg-slate-400'
                              }`}
                              style={{ width: `${Math.min(r.percentage, 100)}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-medium">
                            <span>{r.launches} apontamento(s)</span>
                            {isVitalFew && (
                              <span className="text-amber-700 font-black flex items-center gap-0.5">
                                ★ Causa Vital (80/20)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Gráfico 5: Turnos & Modalidades */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold">
                      <Briefcase size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                        Distribuição por Turnos de Trabalho
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Comercial (Padrão/Flexível), Diurno e Noturno
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  {dashboardAnalytics.shiftList.map((s, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight truncate">{s.shift}</span>
                      <div className="text-lg font-black text-slate-900 mt-1">
                        {s.hours}h
                      </div>
                      <div className="text-[9px] text-slate-400 font-semibold mt-0.5">
                        {s.percentage}% • {s.launches} lanç.
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="font-bold text-slate-700">Passando do Horário: {dashboardAnalytics.modeList[0].hours}h</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    <span className="font-bold text-slate-700">Turno Integral: {dashboardAnalytics.modeList[1].hours}h</span>
                  </div>
                </div>
              </div>

              {/* Gráfico 6: Faixas de Horário de Início */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                      <Clock size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                        Faixa de Horário de Início da Hora Extra
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Madrugada, Manhã, Tarde e Noite
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {dashboardAnalytics.timeSlots.map((ts, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase">
                        <span>{ts.label}</span>
                        {idx === 0 ? <Moon size={13} className="text-indigo-500" /> : idx === 1 ? <Sun size={13} className="text-amber-500" /> : idx === 2 ? <Sun size={13} className="text-orange-500" /> : <Moon size={13} className="text-blue-500" />}
                      </div>
                      <div className="text-xl font-black text-slate-900 mt-1">
                        {ts.hours}h
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold mt-0.5">
                        {ts.count} lançamentos • {ts.percentage}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* TABELA DETALHADA: RANKING DE COLABORADORES */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Award size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                      Ranking Completo de Colaboradores com Horas Extras
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Lista ordenada por volume acumulado de horas extras no ciclo
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black text-slate-500 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-xs">
                  {dashboardAnalytics.rankedEmployees.length} colaboradores listados
                </span>
              </div>

              <div 
                className="overflow-x-auto custom-scrollbar select-none" 
                onSelectStart={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
              >
                <table 
                  onSelectStart={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                  className="w-full text-left text-xs border-collapse select-none cursor-default [&_*]:select-none [&_*]:cursor-default"
                >
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-black">
                      <th className="px-4 py-3 text-center">Rank</th>
                      <th className="px-4 py-3">Matrícula</th>
                      <th className="px-4 py-3">Colaborador / Operador</th>
                      <th className="px-4 py-3">Setor & Cargo</th>
                      <th className="px-4 py-3">Turno</th>
                      <th className="px-4 py-3 text-center">Lançamentos</th>
                      <th className="px-4 py-3 text-center">HE 60% (Seg-Sáb)</th>
                      <th className="px-4 py-3 text-center">HE 110% (Dom/Fer)</th>
                      <th className="px-4 py-3 text-center">Total HE</th>
                      <th className="px-4 py-3 text-center">Média/Lanç.</th>
                      <th className="px-4 py-3">% Fábrica</th>
                      <th className="px-4 py-3 text-center">Alerta de Sobrecarga</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {dashboardAnalytics.rankedEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="px-4 py-8 text-center text-slate-400 text-xs">
                          Nenhum apontamento encontrado no filtro selecionado.
                        </td>
                      </tr>
                    ) : (
                      dashboardAnalytics.rankedEmployees.map((emp, idx) => {
                        const isOverLimit = emp.totalHours >= 30;
                        const isWarning = emp.totalHours >= 20 && emp.totalHours < 30;
                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black ${
                                idx === 0 
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-xs' 
                                  : idx === 1 
                                    ? 'bg-slate-200 text-slate-700 border border-slate-300' 
                                    : idx === 2 
                                      ? 'bg-orange-100 text-orange-800 border border-orange-300' 
                                      : 'text-slate-400 font-bold'
                              }`}>
                                #{idx + 1}
                              </span>
                            </td>

                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="font-mono font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[10px]">
                                {emp.registration}
                              </span>
                            </td>

                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-black text-slate-900">{emp.name}</div>
                            </td>

                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="font-bold text-slate-700">{emp.sector}</span>
                              <span className="text-[10px] text-slate-400 block">{emp.role}</span>
                            </td>

                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                                {emp.shift}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-center whitespace-nowrap font-bold text-slate-700">
                              {emp.launches}x
                            </td>

                            <td className="px-4 py-3 text-center whitespace-nowrap font-bold text-blue-600">
                              {emp.hours60}h
                            </td>

                            <td className="px-4 py-3 text-center whitespace-nowrap font-bold text-amber-600">
                              {emp.hours110}h
                            </td>

                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span className="font-black text-slate-900 text-sm">
                                {emp.totalHours}h
                              </span>
                            </td>

                            <td className="px-4 py-3 text-center whitespace-nowrap text-slate-500 font-bold">
                              {emp.averagePerLaunch}h
                            </td>

                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                                  <div
                                    className="bg-blue-600 h-full rounded-full"
                                    style={{ width: `${Math.min(emp.percentageOfTotal * 3, 100)}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-slate-600">{emp.percentageOfTotal}%</span>
                              </div>
                            </td>

                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              {isOverLimit ? (
                                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[9px] font-black uppercase tracking-wider border border-red-200 flex items-center justify-center gap-1 mx-auto w-fit">
                                  <AlertTriangle size={11} /> Limite Crítico (&gt;30h)
                                </span>
                              ) : isWarning ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-black uppercase tracking-wider border border-amber-200 flex items-center justify-center gap-1 mx-auto w-fit">
                                  <AlertCircle size={11} /> Atenção (&gt;20h)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-wider border border-emerald-200">
                                  Normal
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SEÇÃO COMPLEMENTAR: MÁQUINAS & LIDERANÇAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Máquinas com Horas Extras */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <Factory size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                        Horas Extras por Máquina / Equipamento
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Equipamentos industriais com apontamentos
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {dashboardAnalytics.machineList.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs font-medium">
                      Nenhuma máquina informada nos lançamentos
                    </div>
                  ) : (
                    dashboardAnalytics.machineList.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                          <span className="font-black text-slate-800 text-xs">{m.machine}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-slate-900 text-xs">{m.hours}h</span>
                          <span className="text-[10px] text-slate-400 block font-bold">{m.launches} apontamentos</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Líderes Solicitantes */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <User size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                        Supervisão / Líder Solicitante
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Volume autorizado por liderança
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {dashboardAnalytics.requesterList.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs font-medium">
                      Nenhum líder especificado
                    </div>
                  ) : (
                    dashboardAnalytics.requesterList.map((req, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="font-black text-slate-800 text-xs">{req.requester}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-slate-900 text-xs">{req.hours}h</span>
                          <span className="text-[10px] text-slate-400 block font-bold">{req.launches} solicitações</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        ) : (
        /* ============================================================== */
        /* TABELA DE LANÇAMENTOS */
        /* ============================================================== */
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
              {(!isReadOnly || canManage) && (
                <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3">
                  <button
                    onClick={handleOpenCreateModal}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase hover:bg-blue-700 transition-all cursor-pointer shadow-md shadow-blue-600/20"
                  >
                    <Plus size={15} />
                    Novo Lançamento
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* BARRA DE AÇÃO EM LOTE SELECIONADOS */}
              {selectedEntryIds.length > 0 ? (
                <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-inner">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-wider">
                      {selectedEntryIds.length} {selectedEntryIds.length === 1 ? 'lançamento selecionado' : 'lançamentos selecionados'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(!isReadOnly || canManage) && (
                      <button
                        type="button"
                        onClick={() => {
                          setBulkDeleteScope('selected');
                          setIsBulkDeleteModalOpen(true);
                        }}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                        title="Excluir lançamentos selecionados"
                      >
                        <Trash2 size={13} />
                        <span>Excluir Selecionados ({selectedEntryIds.length})</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedEntryIds([])}
                      className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Desmarcar Todos
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-6 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <FileText size={15} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                        Relação Oficial de Apontamentos de Horas Extras
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {filteredEntries.length} lançamento(s) exibido(s) no filtro ativo
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-2xs"
                    >
                      {isAllSelected ? 'Desmarcar Todos' : `Selecionar Todos (${filteredEntries.length})`}
                    </button>

                    {(!isReadOnly || canManage) && (
                      <button
                        type="button"
                        onClick={() => {
                          setBulkDeleteScope('filtered');
                          setIsBulkDeleteModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="Excluir todos os registros que estão filtrados na tela"
                      >
                        <Trash2 size={12} className="text-rose-600" />
                        <span>Exclusão Geral</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Estilos específicos para garantir que nenhum texto seja selecionado ou exiba cursor de texto ao arrastar */}
              <style>{`
                .overtime-appointments-table,
                .overtime-appointments-table *,
                .overtime-appointments-table tr,
                .overtime-appointments-table th,
                .overtime-appointments-table td,
                .overtime-appointments-table span,
                .overtime-appointments-table div,
                .overtime-appointments-table p {
                  -webkit-user-select: none !important;
                  -moz-user-select: none !important;
                  -ms-user-select: none !important;
                  user-select: none !important;
                  -webkit-user-drag: none !important;
                  cursor: default;
                }
                .overtime-appointments-table button,
                .overtime-appointments-table button *,
                .overtime-appointments-table input,
                .overtime-appointments-table select {
                  cursor: pointer !important;
                }
                .overtime-appointments-table-dragging,
                .overtime-appointments-table-dragging * {
                  cursor: grabbing !important;
                  -webkit-user-select: none !important;
                  user-select: none !important;
                }
              `}</style>

              <div 
                ref={appointmentsTableRef}
                onMouseDown={handleTableMouseDown}
                onMouseLeave={handleTableMouseLeave}
                onMouseUp={handleTableMouseUp}
                onMouseMove={handleTableMouseMove}
                onSelectStart={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                className={`overflow-x-auto custom-scrollbar select-none overtime-appointments-table ${isTableDragging ? 'cursor-grabbing select-none overtime-appointments-table-dragging' : 'cursor-default'}`}
                style={{
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  touchAction: 'pan-x pan-y'
                }}
              >
                <table 
                  onSelectStart={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                  className="w-full text-left text-xs border-collapse select-none cursor-default [&_*]:select-none"
                >
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-black select-none">
                    <th className="px-3.5 py-3.5 whitespace-nowrap text-left select-none">
                      <div className="flex items-center gap-2 select-none">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer shrink-0"
                          title="Selecionar / Desmarcar todos os visíveis"
                        />
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0 select-none"
                          title="Selecionar ou desmarcar múltiplos apontamentos para exclusão"
                        >
                          <CheckSquare size={12} className="text-blue-600" />
                          <span>{isAllSelected ? 'Desmarcar' : 'Selecionar Vários'}</span>
                        </button>
                      </div>
                    </th>
                    <th className="px-4 py-3.5 whitespace-nowrap select-none">Data</th>
                    <th className="px-4 py-3.5 whitespace-nowrap select-none">Matrícula</th>
                    <th className="px-4 py-3.5 select-none">Colaborador / Operador</th>
                    <th className="px-4 py-3.5 whitespace-nowrap select-none">Setor & Turno</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap select-none">Modalidade & Horários</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap select-none">Horas Trab.</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap select-none">Horas Extras</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap select-none">% HE</th>
                    <th className="px-4 py-3.5 text-center whitespace-nowrap select-none">Status</th>
                    <th className="px-4 py-3.5 select-none">Cálculo & Motivo</th>
                    <th className="px-4 py-3.5 text-right whitespace-nowrap select-none">Excluir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredEntries.map((item) => {
                    const isSelected = selectedEntryIds.includes(item.id);
                    const dateFormatted = item.date ? item.date.split('-').reverse().join('/') : '-';
                    const parts = (item.date || '').split('-').map(Number);
                    let dayAbbr = '';
                    if (parts.length === 3) {
                      const d = new Date(parts[0], parts[1] - 1, parts[2]);
                      const abbrs = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
                      dayAbbr = abbrs[d.getDay()] || '';
                    }

                    const isHighPercent = (item.overtimePercentage || 60) >= 100;
                    const isIntegral = item.overtimeMode === 'integral';

                    // Estatísticas de horas do colaborador no ciclo para alerta de fadiga
                    const empStats = dashboardAnalytics.rankedEmployees.find(e => 
                      (item.registration && e.registration === item.registration) || 
                      e.name.toLowerCase() === (item.employeeName || '').toLowerCase()
                    );
                    const empHours = empStats ? empStats.totalHours : 0;

                    return (
                      <tr
                        key={item.id}
                        onSelectStart={(e) => e.preventDefault()}
                        className={`transition-colors select-none cursor-default ${
                          isSelected ? 'bg-blue-50/50 hover:bg-blue-50/80' : 'hover:bg-blue-50/30'
                        }`}
                      >
                        {/* Checkbox de seleção para excluir + Botão Editar logo na frente ao lado de Data */}
                        <td className="px-3.5 py-3.5 whitespace-nowrap select-none" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2 select-none">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectEntry(item.id)}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer shrink-0"
                              title="Selecionar este apontamento para exclusão em lote"
                            />
                            {(!isReadOnly || canManage) && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(item)}
                                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl transition-all text-[11px] font-black uppercase flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0 select-none"
                                title="Editar informações deste apontamento de hora extra"
                              >
                                <Edit2 size={12} className="text-white" />
                                <span>Editar</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Data */}
                        <td className="px-4 py-3.5 whitespace-nowrap select-none">
                          <div className="flex items-center gap-1.5 select-none">
                            <span className="font-black text-slate-800 select-none">{dateFormatted}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-black select-none ${
                              dayAbbr === 'DOM' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {dayAbbr}
                            </span>
                          </div>
                        </td>

                        {/* Matrícula */}
                        <td className="px-4 py-3.5 whitespace-nowrap select-none">
                          <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-mono font-black text-[11px] border border-slate-200 select-none">
                            {item.registration || '-'}
                          </span>
                        </td>

                        {/* Colaborador */}
                        <td className="px-4 py-3.5 select-none">
                          <div className="select-none">
                            <div className="flex items-center gap-1.5 flex-wrap select-none">
                              <span className="font-black text-slate-900 select-none">{item.employeeName}</span>
                              {empHours >= 40 ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8.5px] font-black bg-red-100 text-red-700 border border-red-200 select-none" title={`Acúmulo crítico: ${empHours}h no ciclo`}>
                                  🚨 Crítico ({empHours}h)
                                </span>
                              ) : empHours >= 30 ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8.5px] font-black bg-amber-100 text-amber-800 border border-amber-200 select-none" title={`Alerta de fadiga: ${empHours}h no ciclo`}>
                                  ⚠️ Alerta ({empHours}h)
                                </span>
                              ) : null}
                            </div>
                            {item.role && (
                              <div className="text-[10px] text-slate-400 font-semibold select-none">{item.role}</div>
                            )}
                          </div>
                        </td>

                        {/* Setor & Turno */}
                        <td className="px-4 py-3.5 whitespace-nowrap select-none">
                          <div className="select-none">
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] select-none">
                              {item.sector || 'Geral'}
                            </span>
                            <div className="text-[10px] font-bold text-slate-500 mt-1 flex items-center gap-1 select-none">
                              {item.shiftTypeChoice === 'Noturno' ? '🌙 Noturno' : item.shiftTypeChoice === 'Diurno' ? '☀️ Diurno' : item.isCommercialFlexible ? '🏢 Comercial Flex' : '🏢 Comercial'}
                            </div>
                          </div>
                        </td>

                        {/* Modalidade & Horários */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap select-none">
                          <div className="flex flex-col items-center gap-0.5 select-none">
                            <span className={`text-[9px] px-2 py-0.5 rounded-md font-black uppercase select-none ${
                              isIntegral 
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {isIntegral ? 'Turno Integral' : 'Passando do Horário'}
                            </span>
                            <div className="font-bold text-slate-800 font-mono text-[11px] mt-0.5 select-none">
                              {item.startTime} às {item.endTime}
                            </div>
                            {item.normalShiftStartTime && item.normalShiftEndTime && !isIntegral && (
                              <div className="text-[9px] text-slate-400 font-medium select-none">
                                (Turno normal: {item.normalShiftStartTime} - {item.normalShiftEndTime})
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Horas Trabalhando */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap select-none">
                          <div className="font-black text-indigo-700 select-none">
                            {item.workingHoursFormatted || `${item.workingHours}h`}
                          </div>
                          <div className="text-[9px] text-slate-400 font-semibold select-none">
                            {item.workingHours.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}h dec.
                          </div>
                        </td>

                        {/* Horas Extras */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap select-none">
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 font-black text-blue-900 font-mono select-none">
                            <Clock size={12} className="text-blue-600" />
                            <span>{item.overtimeHoursFormatted || `${item.overtimeHours.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}h`}</span>
                          </div>
                          <div className="text-[9px] text-slate-400 font-semibold mt-0.5 select-none">
                            {item.overtimeHours.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}h dec.
                          </div>
                        </td>

                        {/* % HE */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap select-none">
                          <span className={`px-2.5 py-1 rounded-full font-black text-[10px] uppercase border select-none ${
                            isHighPercent
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                          }`}>
                            {item.overtimePercentage || 60}%
                          </span>
                          {item.equivalentHours ? (
                            <div className="text-[9px] text-slate-400 font-bold mt-0.5 select-none" title="Horas calculadas com adicional">
                              = {item.equivalentHours.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}h eq.
                            </div>
                          ) : null}
                        </td>

                        {/* Status / Validação */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap select-none">
                          <div className="flex flex-col items-center gap-1 select-none">
                            {item.status === 'approved' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 select-none" title={`Aprovado por ${item.approvedBy || 'Liderança'}`}>
                                <Check size={11} className="text-emerald-700" />
                                Aprovado
                              </span>
                            ) : item.status === 'rejected' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 border border-red-300 select-none" title={item.rejectionReason || 'Rejeitado pela liderança'}>
                                <X size={11} className="text-red-700" />
                                Rejeitado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 select-none">
                                <Clock size={11} className="text-amber-700" />
                                Pendente
                              </span>
                            )}

                            {(!isReadOnly || canManage) && item.status !== 'approved' && (
                              <div className="flex items-center gap-1 mt-0.5 select-none">
                                <button
                                  type="button"
                                  onClick={() => handleApproveEntry(item)}
                                  className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase transition-colors cursor-pointer flex items-center gap-0.5 select-none"
                                  title="Aprovar hora extra em 1 clique"
                                >
                                  <Check size={10} /> Aprovar
                                </button>
                                {item.status !== 'rejected' && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRejectModal(item.id)}
                                    className="px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[9px] font-black uppercase transition-colors cursor-pointer flex items-center gap-0.5 select-none"
                                    title="Rejeitar com justificativa"
                                  >
                                    <X size={10} /> Rejeitar
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Cálculo Aplicado & Motivo */}
                        <td className="px-4 py-3.5 max-w-[260px] select-none">
                          {item.overtimeExplanation ? (
                            <div className="text-[10px] text-slate-600 line-clamp-2 font-medium select-none" title={item.overtimeExplanation}>
                              {item.overtimeExplanation}
                            </div>
                          ) : null}
                          <div className="text-[10px] text-slate-400 truncate mt-0.5 font-semibold select-none" title={item.reason || item.notes}>
                            Motivo: {item.reason || item.notes || '-'}
                          </div>
                        </td>

                        {/* Ações (Exclusão individual) */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap select-none">
                          <div className="flex items-center justify-end gap-1.5 select-none">
                            {(!isReadOnly || canManage) && (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(item.id)}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition-all text-[11px] font-black uppercase flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs hover:shadow-xs select-none"
                                title="Excluir este lançamento individualmente"
                              >
                                <Trash2 size={12} className="text-rose-600" />
                                <span>Excluir</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL DE NOVO LANÇAMENTO / EDIÇÃO (COM OS PARÂMETROS DA SOLICITAÇÃO) */}
      {/* ============================================================== */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200">
          {/* Backdrop click to close */}
          <div className="absolute inset-0" onClick={() => setIsFormOpen(false)} />

          <div className="relative bg-white rounded-none sm:rounded-[2rem] max-w-5xl xl:max-w-6xl w-full h-full sm:h-auto sm:max-h-[92vh] flex flex-col border-0 sm:border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 z-10">
            
            {/* Cabeçalho do Modal: FIXO NO TOPO */}
            <div className="shrink-0 px-4 sm:px-8 py-4 sm:py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/95 backdrop-blur-xs">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 shadow-xs border border-blue-200">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                    {editingEntry ? 'Editar Lançamento de Hora Extra' : 'Novo Lançamento de Hora Extra'}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider">
                    Apontamento Direto • Base Mensal • Parâmetros Oficiais de Turno
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="w-10 h-10 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                title="Fechar (Esc)"
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulário com Área Rolável e Rodapé Fixo */}
            <form onSubmit={handleSaveEntry} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 custom-scrollbar overscroll-contain">
                {formError && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

              {/* SEÇÃO 1: IDENTIFICAÇÃO DO COLABORADOR OU TURMA */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-blue-600" />
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      1. Identificação do Colaborador / Turma
                    </h4>
                  </div>
                  {!editingEntry && (
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setIsBatchMode(false)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          !isBatchMode
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Individual
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsBatchMode(true)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                          isBatchMode
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Users size={12} />
                        Em Lote / Turma
                      </button>
                    </div>
                  )}
                </div>

                {!isBatchMode ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Matrícula */}
                    <div className="md:col-span-1">
                      <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                        Matrícula *
                      </label>
                      <input
                        type="text"
                        value={registration}
                        onChange={(e) => handleRegistrationChange(e.target.value)}
                        placeholder="Ex: 0023"
                        className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono shadow-2xs"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Busca automática por matrícula</p>
                    </div>

                    {/* Nome do Operador com Busca / Autocomplete */}
                    <div className="md:col-span-3 relative">
                      <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                        Nome do Operador / Colaborador *
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
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
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white shadow-2xs"
                        />
                      </div>

                      {/* Dropdown de sugestões */}
                      {showEmployeeDropdown && filteredEmployeeSuggestions.length > 0 && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowEmployeeDropdown(false)} />
                          <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-56 overflow-y-auto z-20 py-1.5 divide-y divide-slate-100">
                            {filteredEmployeeSuggestions.map((emp) => (
                              <button
                                key={emp.id}
                                type="button"
                                onClick={() => handleSelectEmployee(emp)}
                                className="w-full px-4 py-2.5 text-left hover:bg-blue-50 flex items-center justify-between text-xs cursor-pointer transition-colors"
                              >
                                <div>
                                  <div className="font-black text-slate-800 text-sm">{emp.name}</div>
                                  <div className="text-[11px] text-slate-500 font-semibold">
                                    {emp.role || 'Sem cargo'} • {emp.sector || 'Extrusão'} • Turno: {emp.shift || 'Comercial'}
                                  </div>
                                </div>
                                <span className="text-xs font-mono font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                                  Matr: {emp.registration || '-'}
                                </span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Users size={15} className="text-blue-600" />
                        <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
                          Seleção de Múltiplos Colaboradores ({selectedEmployeeIds.length} selecionado(s))
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const available = activePersonnelEmployees.filter(emp => 
                              emp.status !== 'inactive' &&
                              (batchSectorFilter === 'all' || emp.sector === batchSectorFilter)
                            );
                            setSelectedEmployeeIds(available.map(e => e.id));
                          }}
                          className="text-[10px] font-black text-blue-700 hover:bg-blue-100 px-2 py-1 rounded cursor-pointer transition-colors"
                        >
                          Selecionar Todos do Filtro
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedEmployeeIds([])}
                          className="text-[10px] font-black text-slate-500 hover:bg-slate-200 px-2 py-1 rounded cursor-pointer transition-colors"
                        >
                          Desmarcar Todos
                        </button>
                      </div>
                    </div>

                    {/* Filtros da Turma: Setor e Busca */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                        <input
                          type="text"
                          value={batchSearchTerm}
                          onChange={(e) => setBatchSearchTerm(e.target.value)}
                          placeholder="Buscar operador na turma..."
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <select
                        value={batchSectorFilter}
                        onChange={(e) => setBatchSectorFilter(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-700 focus:outline-none cursor-pointer"
                      >
                        <option value="all">Todos os Setores</option>
                        {SECTORS_LIST.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {/* Lista com checkboxes para seleção */}
                    <div className="max-h-48 overflow-y-auto bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 p-1">
                      {activePersonnelEmployees
                        .filter((emp) => {
                          if (emp.status === 'inactive') return false;
                          if (batchSectorFilter !== 'all' && emp.sector !== batchSectorFilter) return false;
                          if (batchSearchTerm.trim()) {
                            const term = batchSearchTerm.toLowerCase();
                            return emp.name.toLowerCase().includes(term) || (emp.registration && emp.registration.includes(term));
                          }
                          return true;
                        })
                        .map((emp) => {
                          const isSelected = selectedEmployeeIds.includes(emp.id);
                          return (
                            <label
                              key={emp.id}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                                isSelected ? 'bg-blue-50/70 text-blue-900 font-black' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      setSelectedEmployeeIds(prev => prev.filter(id => id !== emp.id));
                                    } else {
                                      setSelectedEmployeeIds(prev => [...prev, emp.id]);
                                    }
                                  }}
                                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                />
                                <div>
                                  <div className="text-xs font-black">{emp.name}</div>
                                  <div className="text-[10px] text-slate-400 font-semibold">
                                    {emp.role || 'Operador'} • {emp.sector || 'Extrusão'} • {emp.shift || 'Comercial'}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                Matr: {emp.registration || '-'}
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                      Setor Cadastrado *
                    </label>
                    <select
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer shadow-2xs"
                    >
                      {SECTORS_LIST.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Data da Realização *</span>
                      {dateDayInfo.dayName && (
                        <span className={`text-[11px] font-black ${
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
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white shadow-2xs"
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
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
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
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono shadow-2xs"
                    />
                    <p className="text-[10px] text-slate-400 font-medium mt-1">
                      {overtimeMode === 'pos_turno' 
                        ? (isCommercialFlexible ? 'Entrada flexível (jornada de 10h a partir deste horário)' : 'Início da jornada normal')
                        : 'Início do plantão extraordinário'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                      {overtimeMode === 'pos_turno' ? 'Saída Efetiva (Passando) *' : 'Horário de Término *'}
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono shadow-2xs"
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
                        className="text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg cursor-pointer"
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
                        className="text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg cursor-pointer"
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

                  {/* SIMULADOR VISUAL DE LINHA DO TEMPO HORIZONTAL (SUGESTÃO 1) */}
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-2 mt-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Clock size={13} className="text-blue-600" />
                        <span className="text-[10.5px] font-black text-slate-800 uppercase tracking-wider">
                          Simulador Visual da Jornada (00:00 às 24:00)
                        </span>
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                        dateDayInfo.isSundayOrHoliday
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-blue-100 text-blue-800 border-blue-200'
                      }`}>
                        {dateDayInfo.isHoliday 
                          ? `🎉 Feriado: ${dateDayInfo.holidayName} (HE 110%)` 
                          : dateDayInfo.isSunday 
                            ? '☀️ Domingo Oficial (HE 110%)' 
                            : '📅 Dia Normal (Seg a Sáb • HE 60%)'}
                      </span>
                    </div>

                    {/* Barra da Linha do Tempo 24h */}
                    <div className="relative w-full bg-slate-100 h-6 rounded-xl overflow-hidden border border-slate-200 flex">
                      {/* Faixa Noturna 00:00 - 05:00 */}
                      <div className="h-full bg-indigo-900/10 border-r border-indigo-200/50 flex items-center justify-center text-[7.5px] font-black text-indigo-500 uppercase tracking-tighter shrink-0" style={{ width: '20.83%' }} title="Adicional Noturno (00:00 - 05:00)">
                        🌙 Noturno
                      </div>
                      {/* Faixa Diurna 05:00 - 22:00 */}
                      <div className="h-full bg-slate-50 relative flex-1">
                        {overtimeMode === 'pos_turno' ? (
                          <>
                            <div
                              className="absolute top-1 bottom-1 bg-slate-300 rounded-l-md"
                              style={{
                                left: `${Math.max(0, Math.min(100, ((timeToDecimal(startTime) - 5) / 17) * 100))}%`,
                                width: `${Math.max(2, Math.min(100, ((timeToDecimal(calculatedNormalEnd || '17:18') - timeToDecimal(startTime)) / 17) * 100))}%`
                              }}
                              title={`Jornada Normal: ${startTime} às ${calculatedNormalEnd || '17:18'}`}
                            />
                            <div
                              className={`absolute top-1 bottom-1 ${dateDayInfo.isSundayOrHoliday ? 'bg-amber-500' : 'bg-blue-600'} rounded-r-md shadow-xs`}
                              style={{
                                left: `${Math.max(0, Math.min(100, ((timeToDecimal(calculatedNormalEnd || '17:18') - 5) / 17) * 100))}%`,
                                width: `${Math.max(3, Math.min(100, (overtimeHours / 17) * 100))}%`
                              }}
                              title={`Horas Extras: +${overtimeHoursFormatted} (${overtimePercentage}%)`}
                            />
                          </>
                        ) : (
                          <div
                            className={`absolute top-1 bottom-1 ${dateDayInfo.isSundayOrHoliday ? 'bg-amber-500' : 'bg-indigo-600'} rounded-md shadow-xs`}
                            style={{
                              left: `${Math.max(0, Math.min(100, ((timeToDecimal(startTime) - 5) / 17) * 100))}%`,
                              width: `${Math.max(4, Math.min(100, (overtimeHours / 17) * 100))}%`
                            }}
                            title={`Plantão Extra Integral: ${startTime} às ${endTime} (${overtimeHoursFormatted})`}
                          />
                        )}
                      </div>
                      {/* Faixa Noturna 22:00 - 24:00 */}
                      <div className="h-full bg-indigo-900/10 border-l border-indigo-200/50 flex items-center justify-center text-[7.5px] font-black text-indigo-500 uppercase tracking-tighter shrink-0" style={{ width: '8.33%' }} title="Adicional Noturno (22:00 - 24:00)">
                        🌙
                      </div>
                    </div>

                    {/* Legenda dos Marcadores */}
                    <div className="flex flex-wrap items-center justify-between text-[9px] font-bold text-slate-500 pt-0.5">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <span className="w-2.5 h-2.5 rounded bg-slate-300 inline-block" /> Normal
                        </span>
                        <span className="flex items-center gap-1 text-slate-800 font-black">
                          <span className={`w-2.5 h-2.5 rounded ${dateDayInfo.isSundayOrHoliday ? 'bg-amber-500' : 'bg-blue-600'} inline-block`} /> HE ({overtimePercentage}%)
                        </span>
                        <span className="flex items-center gap-1 text-indigo-600">
                          <span className="w-2.5 h-2.5 rounded bg-indigo-200 inline-block" /> Faixa Noturna
                        </span>
                      </div>
                      <span className="font-mono text-slate-600">
                        {startTime} ➔ {endTime} ({workingHoursFormatted} trab.)
                      </span>
                    </div>
                  </div>

                  {/* SELEÇÃO OFICIAL DE % HE (60% SEG A SÁB / 110% DOMINGOS E FERIADOS) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200">
                    <div>
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                        Porcentagem de Hora Extra (% HE):
                      </span>
                      <span className="text-[9px] text-slate-400 font-semibold">
                        Regra oficial da empresa: 60% dias normais e 110% domingos/feriados
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setOvertimePercentage(60)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                          overtimePercentage === 60
                            ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20'
                            : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        <span>60%</span>
                        <span className="text-[9px] font-semibold opacity-90">(Seg a Sáb)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOvertimePercentage(110)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                          overtimePercentage === 110
                            ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/20'
                            : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        <span>110%</span>
                        <span className="text-[9px] font-semibold opacity-90">(Dom / Feriado)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: MOTIVO E OBSERVAÇÕES */}
              <div className="space-y-4 pt-1">
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <FileText size={16} className="text-blue-600" />
                      <span>Motivo / Atividade Realizada *</span>
                    </label>
                    <span className="text-xs font-semibold text-slate-400">
                      {isReasonNew && reason.trim().length > 0 ? (
                        <span className="text-amber-600 font-bold flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                          <Sparkles size={13} /> Novo motivo
                        </span>
                      ) : (
                        'Escreva detalhadamente ou selecione da relação'
                      )}
                    </span>
                  </div>

                  <div className="relative">
                    <textarea
                      rows={3}
                      value={reason}
                      onChange={(e) => {
                        setReason(e.target.value);
                        setShowReasonDropdown(true);
                      }}
                      onFocus={() => setShowReasonDropdown(true)}
                      placeholder="Descreva com clareza a atividade realizada ou o motivo da convocação para a hora extra (ou clique na seta ao lado para escolher na relação cadastrada)..."
                      className={`w-full pl-4 pr-24 py-3 bg-slate-50 border rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-2xs resize-none ${
                        isReasonNew && reason.trim().length > 0
                          ? 'border-amber-400 bg-amber-50/20'
                          : 'border-slate-200'
                      }`}
                    />

                    {/* Botões de ação rápida à direita do input */}
                    <div className="absolute right-3 top-3 flex items-center gap-1.5">
                      {reason && (
                        <button
                          type="button"
                          onClick={() => {
                            setReason('');
                            setShowReasonDropdown(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/80 transition-colors"
                          title="Limpar texto"
                        >
                          <X size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowReasonDropdown((prev) => !prev)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer shadow-xs ${
                          showReasonDropdown
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                        }`}
                        title="Ver relação de motivos disponíveis"
                      >
                        <ChevronDown
                          size={15}
                          className={`transition-transform duration-200 ${
                            showReasonDropdown ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Informação sobre novo motivo a ser salvo */}
                  {isReasonNew && reason.trim().length > 0 && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-900 animate-in fade-in duration-150">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-amber-600 shrink-0" />
                        <span className="leading-snug">
                          <strong>Novo motivo identificado:</strong> Deseja registrar agora na relação oficial para sugestões futuras?
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await saveNewReasonToDatabase(reason.trim());
                        }}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1"
                        title="Salvar agora na relação de motivos"
                      >
                        <Plus size={13} />
                        <span>Salvar na Relação</span>
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
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-64 overflow-y-auto z-20 py-1.5 divide-y divide-slate-100 custom-scrollbar">
                        {/* Se o usuário digitou algo novo, opção explícita no topo */}
                        {isReasonNew && reason.trim().length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowReasonDropdown(false)}
                            className="w-full px-4 py-2.5 text-left bg-amber-50 hover:bg-amber-100 flex items-center justify-between text-xs cursor-pointer transition-colors border-b border-amber-100"
                          >
                            <div className="flex items-center gap-2.5 pr-2">
                              <Sparkles size={15} className="text-amber-600 shrink-0" />
                              <div>
                                <div className="font-black text-amber-900 text-xs">
                                  Usar novo motivo: "{reason.trim()}"
                                </div>
                                <div className="text-[10.5px] text-amber-700">
                                  Será salvo na relação e sugerido nas próximas vezes
                                </div>
                              </div>
                            </div>
                            <span className="text-[9.5px] font-black uppercase px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md shrink-0">
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
                                className={`w-full px-4 py-2.5 text-left flex items-center justify-between text-xs cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-blue-50 text-blue-900 font-black'
                                    : 'hover:bg-slate-50 text-slate-700 font-medium'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 pr-2 min-w-0">
                                  <span
                                    className={`w-2 h-2 rounded-full shrink-0 ${
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
                    className="w-full px-4 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-base font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-2xs"
                  />
                </div>
              </div>

              </div>

              {/* Botões do Rodapé do Modal: FIXO NO FUNDO */}
              <div className="shrink-0 px-4 sm:px-8 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 bg-slate-50/95 backdrop-blur-xs z-10">
                <div className="text-xs sm:text-sm font-bold text-slate-600 text-center sm:text-left">
                  {isBatchMode && !editingEntry ? (
                    <span className="flex items-center justify-center sm:justify-start gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                      Lote: <strong>{selectedEmployeeIds.length}</strong> colaborador(es) selecionado(s)
                    </span>
                  ) : (
                    <span>
                      Total Calculado:{' '}
                      <strong className="text-blue-700 font-black">
                        {overtimeHours.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}h
                      </strong>{' '}
                      extras ({overtimePercentage}%)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 sm:flex-none px-5 py-3 sm:py-3.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl text-xs sm:text-sm font-black uppercase transition-all cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 sm:flex-none px-7 py-3 sm:py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Check size={18} />
                        <span>{editingEntry ? 'Atualizar Lançamento' : 'Salvar Lançamento'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Justificativa de Rejeição */}
      {rejectionModalId && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150">
          <div className="absolute inset-0" onClick={() => {
            setRejectionModalId(null);
            setRejectionReasonText('');
          }} />
          <div className="relative bg-white rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col border border-slate-200 shadow-2xl p-6 space-y-4 overflow-y-auto custom-scrollbar z-10 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0 font-bold">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  Rejeitar Apontamento de Hora Extra
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Informe o motivo da não aprovação deste lançamento.
                </p>
              </div>
            </div>

            <div>
              <ReasonInputWithSave
                label="Motivo da Rejeição"
                value={rejectionReasonText}
                onChange={(val) => setRejectionReasonText(val)}
                category="motivo_rejeicao_hora_extra"
                placeholder="Ex: Não autorizado previamente pela gerência / Intervalo não compatível com a escala..."
                multiline={true}
                rows={3}
                required={true}
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setRejectionModalId(null);
                  setRejectionReasonText('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={!rejectionReasonText.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase transition-all shadow-md shadow-red-600/20 cursor-pointer disabled:opacity-50"
              >
                Confirmar Rejeição
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL DE EXCLUSÃO GERAL (SELECIONADOS OU FILTRADOS) */}
      {/* ============================================================== */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden animate-in fade-in duration-150">
          <div className="absolute inset-0" onClick={() => !isDeletingBulk && setIsBulkDeleteModalOpen(false)} />
          <div className="relative bg-white rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col border border-slate-200 shadow-2xl p-6 space-y-5 overflow-y-auto custom-scrollbar z-10 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200 shadow-xs">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Exclusão Geral de Horas Extras
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Selecione o escopo da exclusão abaixo. Os lançamentos serão excluídos definitivamente do sistema.
                </p>
              </div>
            </div>

            {/* Opções de Escopo */}
            <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <label
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  bulkDeleteScope === 'selected'
                    ? 'bg-rose-50 border-rose-300 text-rose-950 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                } ${selectedEntryIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="bulkScope"
                    value="selected"
                    disabled={selectedEntryIds.length === 0}
                    checked={bulkDeleteScope === 'selected'}
                    onChange={() => setBulkDeleteScope('selected')}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-xs font-black uppercase">Excluir Lançamentos Selecionados</span>
                    <span className="text-[11px] block text-slate-500 font-medium">
                      {selectedEntryIds.length > 0 ? `${selectedEntryIds.length} item(ns) marcados na tabela` : 'Nenhum item marcado'}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono font-black px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                  {selectedEntryIds.length}
                </span>
              </label>

              <label
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  bulkDeleteScope === 'filtered'
                    ? 'bg-rose-50 border-rose-300 text-rose-950 font-bold'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="bulkScope"
                    value="filtered"
                    checked={bulkDeleteScope === 'filtered'}
                    onChange={() => setBulkDeleteScope('filtered')}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-xs font-black uppercase">Excluir Todos os Filtrados</span>
                    <span className="text-[11px] block text-slate-500 font-medium">
                      {filteredEntries.length} lançamento(s) exibidos na tela ({filterMonth === 'todos' ? 'Todos os Períodos' : activePayrollCycle.shortLabel})
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono font-black px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                  {filteredEntries.length}
                </span>
              </label>
            </div>

            <div className="p-3 bg-rose-50/80 border border-rose-200/80 rounded-xl text-[11px] font-bold text-rose-800 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <span>
                Total a excluir permanentemente:{' '}
                <strong>
                  {bulkDeleteScope === 'selected' ? selectedEntryIds.length : filteredEntries.length} registro(s)
                </strong>
                . Esta ação é irreversível.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                disabled={isDeletingBulk}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                disabled={
                  isDeletingBulk ||
                  (bulkDeleteScope === 'selected' && selectedEntryIds.length === 0) ||
                  filteredEntries.length === 0
                }
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-rose-600/25 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isDeletingBulk ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Confirmar Exclusão Geral</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de Exclusão Individual */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        title="Excluir Lançamento Individual"
        message={
          entryToDelete
            ? `Tem certeza que deseja excluir permanentemente o lançamento de "${entryToDelete.employeeName}" do dia ${
                entryToDelete.date ? entryToDelete.date.split('-').reverse().join('/') : ''
              } (${entryToDelete.overtimeHoursFormatted || `${entryToDelete.overtimeHours}h`})? Esta ação não pode ser desfeita.`
            : 'Tem certeza que deseja excluir permanentemente este lançamento de hora extra? Esta ação não pode ser desfeita.'
        }
        confirmText="Sim, Excluir Lançamento"
        cancelText="Cancelar"
        confirmVariant="danger"
        onConfirm={handleDeleteEntry}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
};

export default OvertimeEntries;
