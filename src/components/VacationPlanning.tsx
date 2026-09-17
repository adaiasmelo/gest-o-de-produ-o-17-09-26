import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Sparkles, AlertCircle, AlertTriangle, Calendar as CalendarIcon, User, Trash2, Edit2, 
  ChevronRight, ChevronLeft, CalendarDays, RefreshCw, CheckCircle2, UserPlus, Info,
  Search, ShieldAlert, ArrowRightLeft, HelpCircle, Columns, Filter, Check, ArrowLeft,
  Move, Download, LayoutGrid, CalendarRange, Table as TableIcon, Layers, BarChart3,
  Users, Clock, ShieldCheck, Factory, Gauge, GripVertical, CheckCircle, Plus
} from 'lucide-react';
import { Employee, Vacation } from '../types';
import ConfirmDialog from './ConfirmDialog';

interface VacationPlanningProps {
  employees: Employee[];
  vacations: Vacation[];
  onSaveVacation: (vacation: Vacation) => Promise<void>;
  onDeleteVacation: (vacationId: string) => Promise<void>;
  onGeneratePlan: (generatedVacations: Vacation[]) => Promise<void>;
  onUpdateEmployee?: (employeeId: string, updates: Partial<Employee>) => Promise<void>;
  onClose: () => void;
  canManage: boolean;
  isReadOnly?: boolean;
  onBlockedAction?: (title?: string, message?: string) => void;
}

const MONTHS = [
  { value: 1, name: 'Janeiro', short: 'Jan', q: 'Q1', sem: 1, color: 'border-blue-200 bg-blue-50/30' },
  { value: 2, name: 'Fevereiro', short: 'Fev', q: 'Q1', sem: 1, color: 'border-indigo-200 bg-indigo-50/30' },
  { value: 3, name: 'Março', short: 'Mar', q: 'Q1', sem: 1, color: 'border-cyan-200 bg-cyan-50/30' },
  { value: 4, name: 'Abril', short: 'Abr', q: 'Q2', sem: 1, color: 'border-teal-200 bg-teal-50/30' },
  { value: 5, name: 'Maio', short: 'Mai', q: 'Q2', sem: 1, color: 'border-emerald-200 bg-emerald-50/30' },
  { value: 6, name: 'Junho', short: 'Jun', q: 'Q2', sem: 1, color: 'border-green-200 bg-green-50/30' },
  { value: 7, name: 'Julho', short: 'Jul', q: 'Q3', sem: 2, color: 'border-amber-200 bg-amber-50/30' },
  { value: 8, name: 'Agosto', short: 'Ago', q: 'Q3', sem: 2, color: 'border-orange-200 bg-orange-50/30' },
  { value: 9, name: 'Setembro', short: 'Set', q: 'Q3', sem: 2, color: 'border-rose-200 bg-rose-50/30' },
  { value: 10, name: 'Outubro', short: 'Out', q: 'Q4', sem: 2, color: 'border-purple-200 bg-purple-50/30' },
  { value: 11, name: 'Novembro', short: 'Nov', q: 'Q4', sem: 2, color: 'border-fuchsia-200 bg-fuchsia-50/30' },
  { value: 12, name: 'Dezembro', short: 'Dez', q: 'Q4', sem: 2, color: 'border-violet-200 bg-violet-50/30' }
];

// Helper to parse string dates (YYYY-MM-DD, DD/MM/YYYY or ISO)
function parseCustomDate(dateStr: any): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  const str = String(dateStr).trim();
  if (!str) return null;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  }
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
    const parts = str.split('/');
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }

  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatDateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateToShow(dateStr?: string): string {
  if (!dateStr) return '-';
  const d = parseCustomDate(dateStr);
  if (!d) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDisplayName(name?: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 2) return name.toUpperCase();
  return `${parts[0]} ${parts[parts.length - 1]}`.toUpperCase();
}

function calculateVencPeriodo(inicioPeriodoStr: string): string {
  const date = parseCustomDate(inicioPeriodoStr);
  if (!date) return '';
  const newDate = new Date(date);
  newDate.setFullYear(newDate.getFullYear() + 1);
  return formatDateString(newDate);
}

function calculateDataLimiteGozo(vencPeriodoStr: string): string {
  const date = parseCustomDate(vencPeriodoStr);
  if (!date) return '';
  const newDate = new Date(date);
  newDate.setMonth(newDate.getMonth() + 11);
  return formatDateString(newDate);
}

function calculatePrazoStatus(dataLimiteGozoStr: string): 'Vencido' | 'Crítico' | 'No Prazo' {
  const limitDate = parseCustomDate(dataLimiteGozoStr);
  if (!limitDate) return 'No Prazo';
  
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  limitDate.setHours(0, 0, 0, 0);

  if (currentDate.getTime() > limitDate.getTime()) {
    return 'Vencido';
  }

  const diffTime = limitDate.getTime() - currentDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 60) {
    return 'Crítico';
  }

  return 'No Prazo';
}

function getEmployeeField(emp: any, field: string): any {
  if (!emp) return undefined;
  if (field === 'inicioPeriodo') {
    return emp.inicioPeriodo ?? emp['Inicio Periodo'] ?? emp.inicio_periodo ?? emp.inicioAquisitivo ?? emp['Início Período'];
  }
  if (field === 'vencPeriodo') {
    return emp.vencPeriodo ?? emp['Venc do Periodo'] ?? emp.venc_periodo ?? emp.vencDoPeriodo ?? emp['Venc. Período'] ?? emp['Vencimento do Período'];
  }
  if (field === 'dataLimiteGozo') {
    return emp.dataLimiteGozo ?? emp['Data Limite Gozo'] ?? emp.data_limite_gozo ?? emp['Data Limite'] ?? emp.limiteGozo;
  }
  if (field === 'sldVenc') {
    return emp.sldVenc ?? emp['Sld Venc'] ?? emp.sld_venc ?? emp.saldoVencido ?? emp['Saldo Vencido'];
  }
  if (field === 'inicioGozoPrevisto') {
    return emp.inicioGozoPrevisto ?? emp['Inicio Gozo e Previsto'] ?? emp.inicio_gozo_previsto ?? emp.inicioGozo ?? emp['Início Gozo e Previsto'];
  }
  return emp[field];
}

function parseGozoMonth(gozo: any): number | null {
  if (!gozo) return null;
  if (typeof gozo === 'number') {
    if (gozo >= 1 && gozo <= 12) return gozo;
    return null;
  }
  const str = String(gozo).trim().toLowerCase();
  if (!str) return null;

  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1 && num <= 12 && String(num) === str) return num;

  if (str.startsWith('jan') || str === '01' || str === '1') return 1;
  if (str.startsWith('fev') || str === '02' || str === '2') return 2;
  if (str.startsWith('mar') || str === '03' || str === '3') return 3;
  if (str.startsWith('abr') || str === '04' || str === '4') return 4;
  if (str.startsWith('mai') || str === '05' || str === '5') return 5;
  if (str.startsWith('jun') || str === '06' || str === '6') return 6;
  if (str.startsWith('jul') || str === '07' || str === '7') return 7;
  if (str.startsWith('ago') || str === '08' || str === '8') return 8;
  if (str.startsWith('set') || str === '09' || str === '9') return 9;
  if (str.startsWith('out') || str === '10') return 10;
  if (str.startsWith('nov') || str === '11') return 11;
  if (str.startsWith('dez') || str === '12') return 12;

  const dateObj = parseCustomDate(str);
  if (dateObj) return dateObj.getMonth() + 1;

  return null;
}

function getCanonicalSector(sec?: string): string {
  if (!sec) return 'Extrusão';
  const s = sec.trim().toLowerCase();
  if (s.includes('extrus')) return 'Extrusão';
  if (s.includes('recicla') || s.includes('erema')) return 'Reciclagem';
  if (s.includes('fita')) return 'Fita';
  if (s.includes('lideran') || s.includes('lider')) return 'Liderança';
  if (s.includes('logist') || s.includes('estoque')) return 'Logística';
  if (s.includes('manuten')) return 'Manutenção';
  if (s.includes('qualidade')) return 'Qualidade';
  return sec.trim();
}

function isOperatorRole(role?: string): boolean {
  if (!role) return false;
  const r = role.toLowerCase();
  return r.includes('operador') || r.includes('ope');
}

export function VacationPlanning({
  employees,
  vacations,
  onSaveVacation,
  onDeleteVacation,
  onGeneratePlan,
  onUpdateEmployee,
  onClose,
  canManage,
  isReadOnly,
  onBlockedAction
}: VacationPlanningProps) {
  // Navigation & View Modes
  const [activeView, setActiveView] = useState<'matrix' | 'machine' | 'kanban' | 'table'>('matrix');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [periodFilter, setPeriodFilter] = useState<'all' | 'sem1' | 'sem2' | 'q1' | 'q2' | 'q3' | 'q4'>('all');
  
  // Power BI Filters
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string>('all');
  const [selectedMachineFilter, setSelectedMachineFilter] = useState<string>('all');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [prazoFilter, setPrazoFilter] = useState<'all' | 'vencido' | 'critico' | 'noprazo' | 'sem_agendamento' | 'com_conflito'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Drag and Drop States
  const [draggingVacation, setDraggingVacation] = useState<{ id: string; employeeId: string; employeeName: string; fromMonth: number } | null>(null);
  const [dragOverMonth, setDragOverMonth] = useState<number | null>(null);
  const [dragOverGroupKey, setDragOverGroupKey] = useState<string | null>(null);

  // Modals & Editing
  const [isEditingVacation, setIsEditingVacation] = useState<boolean>(false);
  const [editingVacationData, setEditingVacationData] = useState<Partial<Vacation> | null>(null);
  const [selectedEmpForScheduler, setSelectedEmpForScheduler] = useState<Employee | null>(null);
  const [formInicioPeriodo, setFormInicioPeriodo] = useState<string>('');
  const [formSldVenc, setFormSldVenc] = useState<number>(0);
  const [formInicioGozoPrevisto, setFormInicioGozoPrevisto] = useState<string>('');
  const [showConfirmDeleteId, setShowConfirmDeleteId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [addVacationTarget, setAddVacationTarget] = useState<{ sector: string; machine?: string; shift?: string; month: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' | 'info' } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Keyboard shortcut Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isEditingVacation && !addVacationTarget && !showConfirmDeleteId) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditingVacation, addVacationTarget, showConfirmDeleteId, onClose]);

  // Filter active employees who are on the active roster
  const activeEmployees = useMemo(() => {
    return employees.filter(e => 
      !e.isSilenced &&
      e.status !== 'Vaga Excluída' && 
      e.status !== 'Desligado' &&
      e.status !== 'Silenciado' &&
      !(e.name || '').toLowerCase().includes('silenciad')
    );
  }, [employees]);

  // List of unique Sectors, Machines, Shifts
  const sectors = useMemo(() => {
    const list = Array.from(new Set(activeEmployees.map(e => getCanonicalSector(e.sector)).filter(Boolean))) as string[];
    return list.sort((a, b) => {
      if (a === 'Extrusão') return -1;
      if (b === 'Extrusão') return 1;
      if (a.toLowerCase().includes('lideran')) return -1;
      if (b.toLowerCase().includes('lideran')) return 1;
      return a.localeCompare(b);
    });
  }, [activeEmployees]);

  const machines = useMemo(() => {
    const list = Array.from(new Set(activeEmployees.map(e => e.machine).filter(Boolean))) as string[];
    return list.sort();
  }, [activeEmployees]);

  const shifts = useMemo(() => {
    const list = Array.from(new Set(activeEmployees.map(e => e.shift).filter(Boolean))) as string[];
    return list.sort((a, b) => {
      const order = ['Diurno 1', 'Diurno 2', 'Noturno 1', 'Noturno 2', 'Comercial', 'Integral'];
      const idxA = order.indexOf(a);
      const idxB = order.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [activeEmployees]);

  // Active months based on period filter
  const visibleMonths = useMemo(() => {
    if (periodFilter === 'sem1') return MONTHS.slice(0, 6);
    if (periodFilter === 'sem2') return MONTHS.slice(6, 12);
    if (periodFilter === 'q1') return MONTHS.slice(0, 3);
    if (periodFilter === 'q2') return MONTHS.slice(3, 6);
    if (periodFilter === 'q3') return MONTHS.slice(6, 9);
    if (periodFilter === 'q4') return MONTHS.slice(9, 12);
    return MONTHS;
  }, [periodFilter]);

  // Comprehensive Vacation Mapping & Virtual Vacations
  const unifiedVacations = useMemo(() => {
    const map = new Map<string, Vacation>();

    // 1. Explicit vacations from props
    vacations.forEach(v => {
      if (v.year === selectedYear) {
        const emp = activeEmployees.find(e => e.id === v.employeeId);
        map.set(v.employeeId, {
          ...v,
          employeeName: emp?.name || v.employeeName,
          sector: emp?.sector || v.sector,
          machine: emp?.machine || v.machine || 'Cast 1',
          shift: emp?.shift || v.shift || 'Diurno 1',
          role: emp?.role || v.role
        });
      }
    });

    // 2. Virtual vacations from employee record `inicioGozoPrevisto` if not explicitly in vacations list
    activeEmployees.forEach(emp => {
      if (map.has(emp.id)) return;
      const gozoField = getEmployeeField(emp, 'inicioGozoPrevisto');
      const m = parseGozoMonth(gozoField);
      if (m) {
        const startDate = `${selectedYear}-${String(m).padStart(2, '0')}-01`;
        const endDate = `${selectedYear}-${String(m).padStart(2, '0')}-30`;
        map.set(emp.id, {
          id: `virtual-${emp.id}`,
          employeeId: emp.id,
          employeeName: emp.name,
          registration: emp.registration || '',
          sector: emp.sector || 'Extrusão',
          role: emp.role,
          machine: emp.machine || 'Cast 1',
          shift: emp.shift || 'Diurno 1',
          year: selectedYear,
          month: m,
          durationDays: 30,
          startDate,
          endDate,
          updatedAt: emp.updatedAt || new Date().toISOString()
        });
      }
    });

    return Array.from(map.values());
  }, [vacations, activeEmployees, selectedYear]);

  // Operator Conflict Detector (Identifies if >1 operator from same machine & shift is in the same month)
  const conflictsMap = useMemo(() => {
    // Key: `${machine}|${shift}|${month}` -> Array of operator vacations
    const map = new Map<string, Vacation[]>();
    unifiedVacations.forEach(v => {
      if (isOperatorRole(v.role)) {
        const key = `${(v.machine || '').trim().toLowerCase()}|${(v.shift || '').trim().toLowerCase()}|${v.month}`;
        const existing = map.get(key) || [];
        existing.push(v);
        map.set(key, existing);
      }
    });

    // Return only keys with conflicts (>1 operator in the same month)
    const conflictKeys = new Set<string>();
    map.forEach((vacs, key) => {
      if (vacs.length > 1) {
        conflictKeys.add(key);
      }
    });

    return { groupConflicts: map, conflictKeys };
  }, [unifiedVacations]);

  // Employee Metrics & Deadlines
  const employeeMetricsMap = useMemo(() => {
    const map = new Map<string, {
      inicioPeriodo: string;
      vencPeriodo: string;
      dataLimiteGozo: string;
      sldVenc: number;
      prazoStatus: 'Vencido' | 'Crítico' | 'No Prazo';
      scheduledVacation?: Vacation;
      hasConflict?: boolean;
    }>();

    activeEmployees.forEach(emp => {
      const inicio = getEmployeeField(emp, 'inicioPeriodo') || '';
      const venc = inicio ? calculateVencPeriodo(inicio) : (getEmployeeField(emp, 'vencPeriodo') || '');
      const lim = venc ? calculateDataLimiteGozo(venc) : (getEmployeeField(emp, 'dataLimiteGozo') || '');
      const sld = typeof getEmployeeField(emp, 'sldVenc') === 'number' ? getEmployeeField(emp, 'sldVenc') : 0;
      const status = lim ? calculatePrazoStatus(lim) : 'No Prazo';
      
      const vac = unifiedVacations.find(v => v.employeeId === emp.id);
      let hasConflict = false;
      if (vac && isOperatorRole(emp.role)) {
        const key = `${(emp.machine || '').trim().toLowerCase()}|${(emp.shift || '').trim().toLowerCase()}|${vac.month}`;
        hasConflict = conflictsMap.conflictKeys.has(key);
      }

      map.set(emp.id, {
        inicioPeriodo: inicio,
        vencPeriodo: venc,
        dataLimiteGozo: lim,
        sldVenc: sld,
        prazoStatus: status,
        scheduledVacation: vac,
        hasConflict
      });
    });

    return map;
  }, [activeEmployees, unifiedVacations, conflictsMap]);

  // Filtered employees list based on search and Power BI slicers
  const filteredEmployees = useMemo(() => {
    return activeEmployees.filter(emp => {
      // Sector filter
      if (selectedSectorFilter !== 'all' && getCanonicalSector(emp.sector) !== selectedSectorFilter) {
        return false;
      }
      // Machine filter
      if (selectedMachineFilter !== 'all' && (emp.machine || '').trim().toLowerCase() !== selectedMachineFilter.trim().toLowerCase()) {
        return false;
      }
      // Shift filter
      if (selectedShiftFilter !== 'all' && (emp.shift || '').trim().toLowerCase() !== selectedShiftFilter.trim().toLowerCase()) {
        return false;
      }
      // Role filter
      if (selectedRoleFilter === 'operadores' && !isOperatorRole(emp.role)) return false;
      if (selectedRoleFilter === 'auxiliares' && isOperatorRole(emp.role)) return false;
      if (selectedRoleFilter === 'lideres' && !emp.role.toLowerCase().includes('lider')) return false;

      // Status / Prazo filter
      const metric = employeeMetricsMap.get(emp.id);
      if (prazoFilter === 'vencido' && metric?.prazoStatus !== 'Vencido') return false;
      if (prazoFilter === 'critico' && metric?.prazoStatus !== 'Crítico') return false;
      if (prazoFilter === 'noprazo' && metric?.prazoStatus !== 'No Prazo') return false;
      if (prazoFilter === 'sem_agendamento' && metric?.scheduledVacation) return false;
      if (prazoFilter === 'com_conflito' && !metric?.hasConflict) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = emp.name.toLowerCase().includes(q);
        const matchReg = (emp.registration || '').toLowerCase().includes(q);
        const matchRole = (emp.role || '').toLowerCase().includes(q);
        const matchMach = (emp.machine || '').toLowerCase().includes(q);
        if (!matchName && !matchReg && !matchRole && !matchMach) return false;
      }

      return true;
    });
  }, [activeEmployees, selectedSectorFilter, selectedMachineFilter, selectedShiftFilter, selectedRoleFilter, prazoFilter, searchQuery, employeeMetricsMap]);

  // Overall Statistics for KPIs
  const stats = useMemo(() => {
    const total = activeEmployees.length;
    const scheduled = unifiedVacations.length;
    const unscheduled = Math.max(0, total - scheduled);
    const conflicts = conflictsMap.conflictKeys.size;
    
    let vencidos = 0;
    let criticos = 0;
    employeeMetricsMap.forEach(m => {
      if (m.prazoStatus === 'Vencido') vencidos++;
      if (m.prazoStatus === 'Crítico') criticos++;
    });

    const percentScheduled = total > 0 ? Math.round((scheduled / total) * 100) : 0;

    return {
      total,
      scheduled,
      unscheduled,
      conflicts,
      vencidos,
      criticos,
      percentScheduled
    };
  }, [activeEmployees, unifiedVacations, conflictsMap, employeeMetricsMap]);

  // Extrusão Production Groups (Machine & Shift hierarchy)
  const extrusionMachineGroups = useMemo(() => {
    const groups: Array<{
      sector: string;
      machine: string;
      shift: string;
      key: string;
      employees: Employee[];
    }> = [];

    const extrusaoEmps = filteredEmployees.filter(e => getCanonicalSector(e.sector) === 'Extrusão');
    
    // Distinct machines in Extrusão
    const extrusaoMachines = ['Cast 1', 'Cast 2', 'Cast 3'].filter(m => 
      extrusaoEmps.some(e => (e.machine || '').toLowerCase().includes(m.toLowerCase()))
    );
    if (extrusaoMachines.length === 0) extrusaoMachines.push('Cast 1', 'Cast 2');

    const extrusaoShifts = ['Diurno 1', 'Diurno 2', 'Noturno 1', 'Noturno 2'];

    extrusaoMachines.forEach(mach => {
      extrusaoShifts.forEach(sh => {
        const emps = extrusaoEmps.filter(e => 
          (e.machine || '').trim().toLowerCase() === mach.toLowerCase() &&
          (e.shift || '').trim().toLowerCase() === sh.toLowerCase()
        ).sort((a, b) => {
          const rankA = isOperatorRole(a.role) ? 0 : 1;
          const rankB = isOperatorRole(b.role) ? 0 : 1;
          return rankA - rankB;
        });

        if (emps.length > 0 || (selectedMachineFilter === 'all' && selectedShiftFilter === 'all')) {
          groups.push({
            sector: 'Extrusão',
            machine: mach,
            shift: sh,
            key: `${mach}-${sh}`,
            employees: emps
          });
        }
      });
    });

    // Other sectors groups (Reciclagem, Fita, etc.)
    const otherSectors = sectors.filter(s => s !== 'Extrusão');
    otherSectors.forEach(sec => {
      const emps = filteredEmployees.filter(e => getCanonicalSector(e.sector) === sec);
      if (emps.length > 0) {
        groups.push({
          sector: sec,
          machine: 'Geral',
          shift: 'Geral',
          key: `${sec}-geral`,
          employees: emps
        });
      }
    });

    return groups;
  }, [filteredEmployees, sectors, selectedMachineFilter, selectedShiftFilter]);

  // Handle Drag & Drop move to another month
  const handleDropToMonth = async (targetMonth: number, targetGroup?: { sector: string; machine?: string; shift?: string }) => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Modificação Bloqueada', 'O reagendamento de férias por arrastar e soltar não é permitido no Modo de Leitura.');
      }
      setDragOverMonth(null);
      setDragOverGroupKey(null);
      setDraggingVacation(null);
      return;
    }
    if (!draggingVacation || !canManage) return;
    const { employeeId, employeeName } = draggingVacation;
    const emp = activeEmployees.find(e => e.id === employeeId);
    if (!emp) return;

    setDragOverMonth(null);
    setDragOverGroupKey(null);
    setDraggingVacation(null);

    const isOperator = isOperatorRole(emp.role);
    const targetMach = targetGroup?.machine || emp.machine || 'Cast 1';
    const targetSh = targetGroup?.shift || emp.shift || 'Diurno 1';
    const targetSec = targetGroup?.sector || emp.sector || 'Extrusão';

    // Check operator conflict
    if (isOperator) {
      const conflictKey = `${targetMach.trim().toLowerCase()}|${targetSh.trim().toLowerCase()}|${targetMonth}`;
      const existingInMonth = conflictsMap.groupConflicts.get(conflictKey) || [];
      const hasOtherOperator = existingInMonth.some(v => v.employeeId !== emp.id);

      if (hasOtherOperator) {
        setToastMessage({
          text: `⚠️ Atenção: Já existe outro operador em férias em ${MONTHS[targetMonth - 1].name} para ${targetMach} (${targetSh}). A escala terá alerta de conflito.`,
          type: 'warning'
        });
      }
    }

    const startDate = `${selectedYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const endDate = `${selectedYear}-${String(targetMonth).padStart(2, '0')}-30`;

    const updatedVacation: Vacation = {
      id: `vac-${emp.id}-${selectedYear}`,
      employeeId: emp.id,
      employeeName: emp.name,
      registration: emp.registration || '',
      sector: targetSec,
      machine: targetMach,
      shift: targetSh,
      role: emp.role,
      year: selectedYear,
      month: targetMonth,
      durationDays: 30,
      startDate,
      endDate,
      updatedAt: new Date().toISOString()
    };

    try {
      await onSaveVacation(updatedVacation);
      if (onUpdateEmployee) {
        await onUpdateEmployee(emp.id, {
          inicioGozoPrevisto: String(targetMonth)
        });
      }
      setToastMessage({
        text: `✅ Férias de ${formatDisplayName(emp.name)} movidas com sucesso para ${MONTHS[targetMonth - 1].name}/${selectedYear}!`,
        type: 'success'
      });
    } catch (err) {
      console.error('Erro ao mover férias:', err);
      setToastMessage({
        text: '❌ Erro ao salvar movimentação de férias.',
        type: 'warning'
      });
    }
  };

  // Start Edit Modal
  const handleStartEdit = (vac: Vacation) => {
    setEditingVacationData({ ...vac });
    const emp = activeEmployees.find(e => e.id === vac.employeeId);
    if (emp) {
      setFormInicioPeriodo(getEmployeeField(emp, 'inicioPeriodo') || '');
      setFormSldVenc(typeof getEmployeeField(emp, 'sldVenc') === 'number' ? getEmployeeField(emp, 'sldVenc') : 0);
      setFormInicioGozoPrevisto(String(getEmployeeField(emp, 'inicioGozoPrevisto') || vac.month));
    }
    setIsEditingVacation(true);
  };

  // Save Edit Modal
  const handleSaveEditModal = async () => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Edição Bloqueada', 'A alteração de agendamento de férias não é permitida no Modo de Leitura.');
      }
      setIsEditingVacation(false);
      setEditingVacationData(null);
      return;
    }
    if (!editingVacationData || !editingVacationData.employeeId) return;

    const start = editingVacationData.startDate || `${selectedYear}-01-01`;
    const duration = editingVacationData.durationDays || 30;
    const startObj = parseCustomDate(start) || new Date(selectedYear, 0, 1);
    const endObj = new Date(startObj.getTime() + (duration - 1) * 24 * 60 * 60 * 1000);
    const endStr = formatDateString(endObj);
    const targetMonth = startObj.getMonth() + 1;

    const finalVacation: Vacation = {
      ...editingVacationData as Vacation,
      month: targetMonth,
      year: selectedYear,
      startDate: start,
      endDate: endStr,
      updatedAt: new Date().toISOString()
    };

    try {
      if (onUpdateEmployee && editingVacationData.employeeId) {
        let vencPeriodo = '';
        let dataLimiteGozo = '';
        if (formInicioPeriodo) {
          vencPeriodo = calculateVencPeriodo(formInicioPeriodo);
          dataLimiteGozo = calculateDataLimiteGozo(vencPeriodo);
        }
        await onUpdateEmployee(editingVacationData.employeeId, {
          inicioPeriodo: formInicioPeriodo,
          vencPeriodo,
          dataLimiteGozo,
          sldVenc: formSldVenc,
          inicioGozoPrevisto: String(targetMonth)
        });
      }

      await onSaveVacation(finalVacation);
      setIsEditingVacation(false);
      setEditingVacationData(null);
      setToastMessage({
        text: `✅ Férias de ${formatDisplayName(finalVacation.employeeName)} atualizadas com sucesso!`,
        type: 'success'
      });
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar ajustes de férias.');
    }
  };

  // Handle Quick Add into a Month
  const handleSaveQuickAdd = async (emp: Employee, month: number, duration: 20 | 30, startDateStr: string) => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Agendamento Bloqueado', 'O agendamento de férias não é permitido no Modo de Leitura.');
      }
      setAddVacationTarget(null);
      setSelectedEmpForScheduler(null);
      return;
    }
    const startObj = parseCustomDate(startDateStr) || new Date(selectedYear, month - 1, 1);
    const endObj = new Date(startObj.getTime() + (duration - 1) * 24 * 60 * 60 * 1000);
    const endStr = formatDateString(endObj);

    const newVac: Vacation = {
      id: `vac-${emp.id}-${selectedYear}`,
      employeeId: emp.id,
      employeeName: emp.name,
      registration: emp.registration || '',
      sector: emp.sector || 'Extrusão',
      machine: emp.machine || 'Cast 1',
      shift: emp.shift || 'Diurno 1',
      role: emp.role,
      year: selectedYear,
      month: month,
      durationDays: duration,
      startDate: startDateStr,
      endDate: endStr,
      updatedAt: new Date().toISOString()
    };

    try {
      if (onUpdateEmployee) {
        let vencPeriodo = '';
        let dataLimiteGozo = '';
        if (formInicioPeriodo) {
          vencPeriodo = calculateVencPeriodo(formInicioPeriodo);
          dataLimiteGozo = calculateDataLimiteGozo(vencPeriodo);
        }
        await onUpdateEmployee(emp.id, {
          inicioPeriodo: formInicioPeriodo || undefined,
          vencPeriodo: vencPeriodo || undefined,
          dataLimiteGozo: dataLimiteGozo || undefined,
          sldVenc: formSldVenc,
          inicioGozoPrevisto: String(month)
        });
      }

      await onSaveVacation(newVac);
      setAddVacationTarget(null);
      setSelectedEmpForScheduler(null);
      setToastMessage({
        text: `✅ Férias de ${formatDisplayName(emp.name)} agendadas para ${MONTHS[month - 1].name}/${selectedYear}!`,
        type: 'success'
      });
    } catch (err) {
      console.error(err);
      alert('Erro ao agendar férias.');
    }
  };

  // Delete vacation confirmation
  const handleConfirmDelete = async () => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Exclusão Bloqueada', 'A exclusão de férias da escala não é permitida no Modo de Leitura.');
      }
      setShowConfirmDeleteId(null);
      return;
    }
    if (!showConfirmDeleteId) return;
    try {
      await onDeleteVacation(showConfirmDeleteId);
      setShowConfirmDeleteId(null);
      setToastMessage({
        text: '✅ Férias removidas da escala.',
        type: 'info'
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Intelligent Smart-Distribution Auto-Generator (Strict adherence to user prompt rule: 1 operator per shift in active production, auxiliaries distributed throughout the year)
  const handleRunSmartAutoGeneration = async () => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Geração Bloqueada', 'A geração automática de escala não é permitida no Modo de Leitura.');
      }
      return;
    }
    if (!window.confirm('Deseja criar a Escala Inteligente 2026 automaticamente?\n\nEsta regra garantirá:\n1. 1 Operador ativo por turno em cada máquina (sem sobreposição de operadores no mesmo turno).\n2. Auxiliares de produção distribuídos harmoniosamente ao longo dos 12 meses do ano.\n3. Preservação dos dados dos colaboradores.')) {
      return;
    }

    setIsGenerating(true);
    try {
      const generated: Vacation[] = [];
      const scheduledEmpIds = new Set<string>();

      // Group employees by machine & shift for Extrusão
      const extrusaoEmps = activeEmployees.filter(e => getCanonicalSector(e.sector) === 'Extrusão');
      const machList = ['Cast 1', 'Cast 2', 'Cast 3'];
      const shiftList = ['Diurno 1', 'Diurno 2', 'Noturno 1', 'Noturno 2'];

      // Assign operators across the 12 months for each machine & shift
      machList.forEach((mach, mIdx) => {
        shiftList.forEach((sh, sIdx) => {
          const shiftEmps = extrusaoEmps.filter(e => 
            (e.machine || '').trim().toLowerCase() === mach.toLowerCase() &&
            (e.shift || '').trim().toLowerCase() === sh.toLowerCase()
          );

          const operators = shiftEmps.filter(e => isOperatorRole(e.role));
          const auxiliaries = shiftEmps.filter(e => !isOperatorRole(e.role));

          // Base month offset so machines/shifts don't all start in January
          let opMonth = ((mIdx * 2 + sIdx * 3) % 12) + 1;
          operators.forEach((op) => {
            if (scheduledEmpIds.has(op.id)) return;
            const m = opMonth > 12 ? (opMonth % 12) || 12 : opMonth;
            const startDate = `${selectedYear}-${String(m).padStart(2, '0')}-01`;
            const endDate = `${selectedYear}-${String(m).padStart(2, '0')}-30`;

            generated.push({
              id: `vac-${op.id}-${selectedYear}`,
              employeeId: op.id,
              employeeName: op.name,
              registration: op.registration || '',
              sector: op.sector || 'Extrusão',
              role: op.role,
              machine: mach,
              shift: sh,
              year: selectedYear,
              month: m,
              durationDays: 30,
              startDate,
              endDate,
              updatedAt: new Date().toISOString()
            });

            scheduledEmpIds.add(op.id);
            opMonth = (opMonth + 4 > 12) ? ((opMonth + 4) % 12) || 12 : opMonth + 4;
          });

          // Spread auxiliaries in different months
          let auxMonth = ((mIdx * 3 + sIdx * 2 + 1) % 12) + 1;
          auxiliaries.forEach((aux) => {
            if (scheduledEmpIds.has(aux.id)) return;
            const m = auxMonth > 12 ? (auxMonth % 12) || 12 : auxMonth;
            const startDate = `${selectedYear}-${String(m).padStart(2, '0')}-01`;
            const endDate = `${selectedYear}-${String(m).padStart(2, '0')}-30`;

            generated.push({
              id: `vac-${aux.id}-${selectedYear}`,
              employeeId: aux.id,
              employeeName: aux.name,
              registration: aux.registration || '',
              sector: aux.sector || 'Extrusão',
              role: aux.role,
              machine: mach,
              shift: sh,
              year: selectedYear,
              month: m,
              durationDays: 30,
              startDate,
              endDate,
              updatedAt: new Date().toISOString()
            });

            scheduledEmpIds.add(aux.id);
            auxMonth = (auxMonth + 2 > 12) ? ((auxMonth + 2) % 12) || 12 : auxMonth + 2;
          });
        });
      });

      // Distribute remaining employees from other sectors evenly
      const otherEmps = activeEmployees.filter(e => !scheduledEmpIds.has(e.id));
      let generalMonth = 1;
      otherEmps.forEach((emp) => {
        const m = generalMonth > 12 ? (generalMonth % 12) || 12 : generalMonth;
        const startDate = `${selectedYear}-${String(m).padStart(2, '0')}-01`;
        const endDate = `${selectedYear}-${String(m).padStart(2, '0')}-30`;

        generated.push({
          id: `vac-${emp.id}-${selectedYear}`,
          employeeId: emp.id,
          employeeName: emp.name,
          registration: emp.registration || '',
          sector: emp.sector || 'Geral',
          role: emp.role,
          machine: emp.machine || 'Geral',
          shift: emp.shift || 'Geral',
          year: selectedYear,
          month: m,
          durationDays: 30,
          startDate,
          endDate,
          updatedAt: new Date().toISOString()
        });
        generalMonth++;
      });

      await onGeneratePlan(generated);
      setToastMessage({
        text: `✨ Escala Inteligente ${selectedYear} gerada com sucesso para ${generated.length} colaboradores!`,
        type: 'success'
      });
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar escala automática.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-md flex flex-col w-screen h-screen overflow-hidden text-slate-800 animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-6 right-24 z-[150] px-5 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${
          toastMessage.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' :
          toastMessage.type === 'warning' ? 'bg-amber-600 text-white border-amber-500' :
          'bg-blue-600 text-white border-blue-500'
        }`}>
          {toastMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span className="text-xs font-bold uppercase tracking-tight">{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-70 p-1">
            <X size={14} />
          </button>
        </div>
      )}

      {/* TOP HEADER: Power BI Executive Bar */}
      <header className="bg-slate-900 text-white px-6 py-3.5 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0 shadow-lg select-none">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-gradient-to-tr from-violet-600 to-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-md shadow-violet-900/40">
            <CalendarDays size={24} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                Planejamento de Férias {selectedYear}
                <span className="text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 rounded-full font-extrabold uppercase">
                  Tela Cheia Integrada
                </span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-400 font-semibold tracking-wide flex items-center gap-2">
              <span>Setor Extrusão (Cast 1 & 2), Reciclagem & Apoio</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-bold">1 Operador por Turno Garantido</span>
            </p>
          </div>
        </div>

        {/* Center Actions: Year Selector & View Switcher */}
        <div className="flex items-center gap-3">
          {/* Year Slicer */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-1 flex items-center gap-1 shadow-inner">
            {[2025, 2026, 2027, 2028].map(yr => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                  selectedYear === yr
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          {/* View Mode Buttons */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-1 flex items-center gap-1 shadow-inner">
            <button
              onClick={() => setActiveView('matrix')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase flex items-center gap-1.5 transition-all ${
                activeView === 'matrix' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title="Matriz Anual Geral por Postos e Meses"
            >
              <LayoutGrid size={14} />
              <span>Matriz Geral</span>
            </button>
            <button
              onClick={() => setActiveView('machine')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase flex items-center gap-1.5 transition-all ${
                activeView === 'machine' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title="Visão Detalhada por Máquinas e Turnos (Cast 1, Cast 2, D1, D2, N1, N2)"
            >
              <Factory size={14} />
              <span>Máquinas & Turnos</span>
            </button>
            <button
              onClick={() => setActiveView('kanban')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase flex items-center gap-1.5 transition-all ${
                activeView === 'kanban' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title="Quadro Kanban Mensal com Arraste Livre"
            >
              <Columns size={14} />
              <span>Quadro Kanban</span>
            </button>
            <button
              onClick={() => setActiveView('table')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase flex items-center gap-1.5 transition-all ${
                activeView === 'table' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              title="Tabela de Prazos CLT & Auditoria"
            >
              <TableIcon size={14} />
              <span>Tabela CLT</span>
            </button>
          </div>
        </div>

        {/* Right Tools: Smart Generator + Close Button */}
        <div className="flex items-center gap-3">
          {canManage && (
            <button
              onClick={handleRunSmartAutoGeneration}
              disabled={isGenerating}
              className="px-3.5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-violet-900/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              title="Distribui 1 operador ativo por turno e espalha auxiliares ao longo de 2026"
            >
              <Sparkles size={14} className={isGenerating ? 'animate-spin' : ''} />
              <span>{isGenerating ? 'Gerando...' : 'Escala Inteligente'}</span>
            </button>
          )}

          {/* Prominent Close X Button */}
          <button
            onClick={onClose}
            className="px-3 py-2 bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white rounded-xl border border-slate-700 hover:border-red-500 transition-all flex items-center gap-1.5 text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer active:scale-95 group"
            title="Fechar Tela Cheia de Férias (Esc)"
          >
            <X size={18} className="group-hover:rotate-90 transition-transform duration-200" />
            <span>Fechar [X]</span>
          </button>
        </div>
      </header>

      {/* POWER BI DASHBOARD SLICERS & KPI BAR */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 shrink-0 shadow-sm space-y-3">
        {/* Row 1: KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Users size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Total Efetivo</p>
              <p className="text-lg font-black text-slate-900 leading-none mt-0.5">{stats.total}</p>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 truncate">Colaboradores</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <CalendarIcon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Agendados {selectedYear}</p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <p className="text-lg font-black text-emerald-700 leading-none">{stats.scheduled}</p>
                <p className="text-[10px] font-bold text-slate-400">/ {stats.total}</p>
              </div>
              <p className="text-[9px] text-emerald-600 font-extrabold uppercase mt-0.5">{stats.percentScheduled}% Cobertura</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 flex items-center gap-3 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Regra de Turno</p>
              <p className="text-xs font-black text-indigo-900 leading-tight mt-0.5">1 Op. por Turno</p>
              <p className="text-[9px] text-indigo-600 font-bold uppercase mt-0.5 truncate">Ativo e Protegido</p>
            </div>
          </div>

          <div className={`border rounded-2xl p-2.5 flex items-center gap-3 shadow-sm transition-colors cursor-pointer ${
            stats.conflicts > 0 ? 'bg-red-50 border-red-200 hover:bg-red-100/80' : 'bg-slate-50 border-slate-200/80'
          }`}
          onClick={() => setPrazoFilter(prazoFilter === 'com_conflito' ? 'all' : 'com_conflito')}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              stats.conflicts > 0 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-200 text-slate-500'
            }`}>
              <ShieldAlert size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Conflitos de Op.</p>
              <p className={`text-lg font-black leading-none mt-0.5 ${stats.conflicts > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                {stats.conflicts}
              </p>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 truncate">
                {stats.conflicts > 0 ? 'Clique para filtrar' : 'Zero Sobreposições'}
              </p>
            </div>
          </div>

          <div className={`border rounded-2xl p-2.5 flex items-center gap-3 shadow-sm transition-colors cursor-pointer ${
            stats.vencidos > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200/80'
          }`}
          onClick={() => setPrazoFilter(prazoFilter === 'vencido' ? 'all' : 'vencido')}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              stats.vencidos > 0 ? 'bg-red-200 text-red-700' : 'bg-slate-200 text-slate-500'
            }`}>
              <AlertCircle size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Prazos Vencidos</p>
              <p className={`text-lg font-black leading-none mt-0.5 ${stats.vencidos > 0 ? 'text-red-700' : 'text-slate-700'}`}>
                {stats.vencidos}
              </p>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 truncate">Limite CLT ultrapassado</p>
            </div>
          </div>

          <div className={`border rounded-2xl p-2.5 flex items-center gap-3 shadow-sm transition-colors cursor-pointer ${
            stats.criticos > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200/80'
          }`}
          onClick={() => setPrazoFilter(prazoFilter === 'critico' ? 'all' : 'critico')}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              stats.criticos > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'
            }`}>
              <Clock size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Prazos Críticos</p>
              <p className={`text-lg font-black leading-none mt-0.5 ${stats.criticos > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                {stats.criticos}
              </p>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 truncate">Vence em &le; 60 dias</p>
            </div>
          </div>
        </div>

        {/* Row 2: Interactive Power BI Slicers & Quick Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1 mr-1">
              <Filter size={13} className="text-violet-600" /> Filtros Power BI:
            </span>

            {/* Semester / Quarter Filter */}
            <div className="bg-slate-100 rounded-xl p-0.5 flex items-center border border-slate-200">
              <button
                onClick={() => setPeriodFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                  periodFilter === 'all' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                12 Meses
              </button>
              <button
                onClick={() => setPeriodFilter('sem1')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                  periodFilter === 'sem1' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                1º Sem (Jan-Jun)
              </button>
              <button
                onClick={() => setPeriodFilter('sem2')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                  periodFilter === 'sem2' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                2º Sem (Jul-Dez)
              </button>
            </div>

            {/* Setor Slicer */}
            <select
              value={selectedSectorFilter}
              onChange={(e) => setSelectedSectorFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none hover:border-violet-400 focus:ring-1 focus:ring-violet-500 cursor-pointer"
            >
              <option value="all">Setor: Todos ({sectors.length})</option>
              {sectors.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Máquina Slicer */}
            <select
              value={selectedMachineFilter}
              onChange={(e) => setSelectedMachineFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none hover:border-violet-400 focus:ring-1 focus:ring-violet-500 cursor-pointer"
            >
              <option value="all">Máquina: Todas</option>
              {machines.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Turno Slicer */}
            <select
              value={selectedShiftFilter}
              onChange={(e) => setSelectedShiftFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none hover:border-violet-400 focus:ring-1 focus:ring-violet-500 cursor-pointer"
            >
              <option value="all">Turno: Todos</option>
              {shifts.map(sh => (
                <option key={sh} value={sh}>{sh}</option>
              ))}
            </select>

            {/* Cargo Slicer */}
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none hover:border-violet-400 focus:ring-1 focus:ring-violet-500 cursor-pointer"
            >
              <option value="all">Cargo: Todos</option>
              <option value="operadores">Apenas Operadores (OPE)</option>
              <option value="auxiliares">Apenas Auxiliares (AUX)</option>
              <option value="lideres">Apenas Liderança</option>
            </select>

            {/* Prazo Slicer */}
            <select
              value={prazoFilter}
              onChange={(e) => setPrazoFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 outline-none hover:border-violet-400 focus:ring-1 focus:ring-violet-500 cursor-pointer"
            >
              <option value="all">Status Prazo: Todos</option>
              <option value="vencido">⚠️ Vencidos</option>
              <option value="critico">⏰ Críticos (&le;60d)</option>
              <option value="noprazo">✅ No Prazo</option>
              <option value="sem_agendamento">❌ Sem Agendamento</option>
              <option value="com_conflito">🚨 Com Conflito de Operador</option>
            </select>

            {/* Clear Filters Button */}
            {(selectedSectorFilter !== 'all' || selectedMachineFilter !== 'all' || selectedShiftFilter !== 'all' || selectedRoleFilter !== 'all' || prazoFilter !== 'all' || searchQuery || periodFilter !== 'all') && (
              <button
                onClick={() => {
                  setSelectedSectorFilter('all');
                  setSelectedMachineFilter('all');
                  setSelectedShiftFilter('all');
                  setSelectedRoleFilter('all');
                  setPrazoFilter('all');
                  setSearchQuery('');
                  setPeriodFilter('all');
                }}
                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[10px] font-black uppercase transition-all"
              >
                Limpar Filtros
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar colaborador, matrícula ou cargo..."
              className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-violet-500 outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MAIN VIEWPORT: Scrollable High-Density View Area */}
      <main className="flex-1 bg-slate-100 overflow-auto p-6 space-y-6">

        {/* ------------------------------------------------------------- */}
        {/* VIEW 1: POWER BI GENERAL MATRIX (Grid by Machine/Shift vs Months) */}
        {/* ------------------------------------------------------------- */}
        {activeView === 'matrix' && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-black">
                  <LayoutGrid size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-900">Matriz Anual Geral de Férias {selectedYear}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">
                    Arraste os cards entre os meses para trocar ou reagendar instantaneamente
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-md bg-blue-600" />
                  <span className="text-[10px] uppercase font-black text-slate-700">Operador (OPE)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-md bg-amber-500" />
                  <span className="text-[10px] uppercase font-black text-slate-700">Auxiliar (AUX)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-md bg-red-500" />
                  <span className="text-[10px] uppercase font-black text-slate-700">Conflito de Turno</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider select-none">
                    <th className="p-3.5 pl-6 sticky left-0 z-20 bg-slate-900 border-r border-slate-800 w-[220px]">
                      Posto / Turno / Máquina
                    </th>
                    {visibleMonths.map(m => (
                      <th key={m.value} className="p-3.5 text-center border-r border-slate-800 last:border-r-0 min-w-[130px]">
                        <div className="flex flex-col items-center">
                          <span>{m.name}</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">{m.q}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {extrusionMachineGroups.map(group => {
                    return (
                      <tr key={group.key} className="hover:bg-slate-50/50 transition-colors">
                        {/* Machine & Shift Row Header */}
                        <td className="p-3 pl-6 sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-200">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] font-black text-violet-600 uppercase tracking-wider">
                              {group.sector}
                            </span>
                            <span className="text-xs font-black text-slate-900 uppercase">
                              {group.machine}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                              {group.shift}
                            </span>
                            <span className="text-[9px] font-extrabold text-slate-400 mt-0.5">
                              {group.employees.length} Colaboradores
                            </span>
                          </div>
                        </td>

                        {/* Month Cells: Droppable targets */}
                        {visibleMonths.map(m => {
                          // Find scheduled vacations for this group and month
                          const cellVacations = unifiedVacations.filter(v => {
                            const emp = activeEmployees.find(e => e.id === v.employeeId);
                            if (!emp) return false;
                            const matchesSector = getCanonicalSector(emp.sector) === group.sector;
                            const matchesMach = group.machine === 'Geral' || (emp.machine || '').trim().toLowerCase() === group.machine.toLowerCase();
                            const matchesShift = group.shift === 'Geral' || (emp.shift || '').trim().toLowerCase() === group.shift.toLowerCase();
                            return matchesSector && matchesMach && matchesShift && v.month === m.value;
                          });

                          // Operator count in this specific cell
                          const opCount = cellVacations.filter(v => isOperatorRole(v.role)).length;
                          const hasConflict = opCount > 1;

                          const isDragOver = dragOverMonth === m.value && dragOverGroupKey === group.key;

                          return (
                            <td
                              key={m.value}
                              onDragOver={(e) => {
                                if (canManage) {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'move';
                                }
                              }}
                              onDragEnter={() => {
                                if (canManage) {
                                  setDragOverMonth(m.value);
                                  setDragOverGroupKey(group.key);
                                }
                              }}
                              onDragLeave={() => {
                                if (dragOverMonth === m.value && dragOverGroupKey === group.key) {
                                  setDragOverMonth(null);
                                  setDragOverGroupKey(null);
                                }
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                handleDropToMonth(m.value, {
                                  sector: group.sector,
                                  machine: group.machine,
                                  shift: group.shift
                                });
                              }}
                              className={`p-2 border-r border-slate-200 last:border-r-0 align-top transition-all min-h-[90px] ${
                                isDragOver 
                                  ? 'bg-violet-100 ring-2 ring-violet-500 ring-inset shadow-inner' 
                                  : hasConflict
                                    ? 'bg-red-50/40'
                                    : 'hover:bg-slate-50/80'
                              }`}
                            >
                              <div className="space-y-1.5 min-h-[70px] flex flex-col justify-start">
                                {/* Conflict warning badge */}
                                {hasConflict && (
                                  <div className="bg-red-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm animate-pulse">
                                    <AlertTriangle size={10} />
                                    <span>{opCount} Op. no mesmo turno!</span>
                                  </div>
                                )}

                                {/* Vacation Cards inside Cell */}
                                {cellVacations.map(vac => {
                                  const isOp = isOperatorRole(vac.role);
                                  const metric = employeeMetricsMap.get(vac.employeeId);
                                  const isVencido = metric?.prazoStatus === 'Vencido';
                                  const isCritico = metric?.prazoStatus === 'Crítico';

                                  return (
                                    <div
                                      key={vac.id}
                                      draggable={canManage}
                                      onDragStart={(e) => {
                                        if (canManage) {
                                          e.dataTransfer.setData('text/plain', vac.employeeId);
                                          e.dataTransfer.effectAllowed = 'move';
                                          setDraggingVacation({
                                            id: vac.id,
                                            employeeId: vac.employeeId,
                                            employeeName: vac.employeeName,
                                            fromMonth: vac.month
                                          });
                                        }
                                      }}
                                      onDragEnd={() => {
                                        setDraggingVacation(null);
                                        setDragOverMonth(null);
                                        setDragOverGroupKey(null);
                                      }}
                                      className={`p-2 rounded-xl border shadow-sm transition-all relative group select-none ${
                                        canManage ? 'cursor-grab active:cursor-grabbing hover:scale-[1.02]' : ''
                                      } ${
                                        isOp
                                          ? 'bg-blue-50/90 border-blue-200 hover:border-blue-400 text-blue-950'
                                          : 'bg-amber-50/80 border-amber-200 hover:border-amber-400 text-amber-950'
                                      }`}
                                    >
                                      {/* Header of card: role badge + duration */}
                                      <div className="flex items-center justify-between gap-1 mb-1">
                                        <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-md uppercase tracking-wider ${
                                          isOp ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white'
                                        }`}>
                                          {isOp ? 'OPE' : 'AUX'}
                                        </span>

                                        <div className="flex items-center gap-1">
                                          {isVencido && (
                                            <span className="text-[7px] font-black bg-red-600 text-white px-1 py-0.2 rounded uppercase">
                                              VENC
                                            </span>
                                          )}
                                          {isCritico && (
                                            <span className="text-[7px] font-black bg-amber-600 text-white px-1 py-0.2 rounded uppercase">
                                              CRIT
                                            </span>
                                          )}
                                          <span className="text-[8px] font-extrabold text-slate-500 bg-white/80 px-1 py-0.2 rounded border border-slate-200">
                                            {vac.durationDays || 30}d
                                          </span>
                                        </div>
                                      </div>

                                      {/* Name */}
                                      <p className="text-[11px] font-black uppercase truncate text-slate-900" title={vac.employeeName}>
                                        {formatDisplayName(vac.employeeName)}
                                      </p>

                                      {/* Dates */}
                                      <p className="text-[9px] font-bold text-slate-500 mt-0.5">
                                        {vac.startDate ? `${vac.startDate.split('-')[2]}/${vac.startDate.split('-')[1]}` : '01'} a {vac.endDate ? `${vac.endDate.split('-')[2]}/${vac.endDate.split('-')[1]}` : '30'}
                                      </p>

                                      {/* Actions on Hover */}
                                      {canManage && (
                                        <div className="absolute right-1 top-1 hidden group-hover:flex items-center gap-0.5 bg-white/95 border border-slate-200 rounded-lg p-0.5 shadow-md">
                                          <button
                                            onClick={() => handleStartEdit(vac)}
                                            className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900"
                                            title="Editar Férias / Datas"
                                          >
                                            <Edit2 size={10} />
                                          </button>
                                          <button
                                            onClick={() => setShowConfirmDeleteId(vac.id)}
                                            className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600"
                                            title="Remover das Férias"
                                          >
                                            <Trash2 size={10} />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}

                                {/* Quick Add Button in Cell */}
                                {canManage && cellVacations.length === 0 && (
                                  <button
                                    onClick={() => setAddVacationTarget({
                                      sector: group.sector,
                                      machine: group.machine,
                                      shift: group.shift,
                                      month: m.value
                                    })}
                                    className="w-full py-2 border border-dashed border-slate-200 hover:border-violet-400 rounded-xl text-slate-400 hover:text-violet-600 text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1 opacity-0 hover:opacity-100 group-hover:opacity-60"
                                    title="Adicionar colaborador a este mês"
                                  >
                                    <Plus size={11} />
                                    <span>Agendar</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 2: VISÃO POR MÁQUINAS & TURNOS (Extrusão Cast 1, Cast 2, D1, D2, N1, N2) */}
        {/* ------------------------------------------------------------- */}
        {activeView === 'machine' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black uppercase text-slate-900 flex items-center gap-2">
                  <Factory size={20} className="text-violet-600" />
                  Alocação Operacional por Máquinas & Turnos {selectedYear}
                </h3>
                <p className="text-xs text-slate-500 font-bold uppercase mt-1">
                  Garantia de 1 operador ativo e auxiliares distribuídos em cada turno produtivo
                </p>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-2xl flex items-center gap-3">
                <ShieldCheck size={20} className="text-indigo-600" />
                <div>
                  <p className="text-[10px] font-black text-indigo-900 uppercase">Regra de Ouro da Produção</p>
                  <p className="text-[11px] font-bold text-indigo-700">Nunca deixar uma máquina sem operador</p>
                </div>
              </div>
            </div>

            {/* Grid of Machine & Shift Cards */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {extrusionMachineGroups.map(group => {
                const groupVacations = unifiedVacations.filter(v => {
                  const emp = activeEmployees.find(e => e.id === v.employeeId);
                  if (!emp) return false;
                  const matchesSector = getCanonicalSector(emp.sector) === group.sector;
                  const matchesMach = group.machine === 'Geral' || (emp.machine || '').trim().toLowerCase() === group.machine.toLowerCase();
                  const matchesShift = group.shift === 'Geral' || (emp.shift || '').trim().toLowerCase() === group.shift.toLowerCase();
                  return matchesSector && matchesMach && matchesShift;
                });

                // Check conflict in this group
                const monthsWithOperators = new Map<number, Vacation[]>();
                groupVacations.forEach(v => {
                  if (isOperatorRole(v.role)) {
                    const list = monthsWithOperators.get(v.month) || [];
                    list.push(v);
                    monthsWithOperators.set(v.month, list);
                  }
                });

                const conflictingMonths: number[] = [];
                monthsWithOperators.forEach((ops, m) => {
                  if (ops.length > 1) conflictingMonths.push(m);
                });

                return (
                  <div key={group.key} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      {/* Card Header */}
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div>
                          <span className="text-[10px] font-black text-violet-600 uppercase tracking-widest">
                            {group.sector}
                          </span>
                          <h4 className="text-base font-black text-slate-900 uppercase">
                            {group.machine} — {group.shift}
                          </h4>
                        </div>

                        {conflictingMonths.length > 0 ? (
                          <span className="bg-red-100 text-red-700 border border-red-200 text-[10px] font-black px-3 py-1 rounded-full uppercase flex items-center gap-1 animate-pulse">
                            <AlertTriangle size={12} />
                            Conflito nos meses: {conflictingMonths.map(m => MONTHS[m - 1].short).join(', ')}
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-black px-3 py-1 rounded-full uppercase flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            Turno 100% Coberto
                          </span>
                        )}
                      </div>

                      {/* Employee List with 12-Month Gantt Bar */}
                      <div className="mt-4 space-y-3">
                        {group.employees.map(emp => {
                          const isOp = isOperatorRole(emp.role);
                          const vac = unifiedVacations.find(v => v.employeeId === emp.id);
                          const metric = employeeMetricsMap.get(emp.id);

                          return (
                            <div
                              key={emp.id}
                              className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 hover:border-violet-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-[200px]">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] uppercase shadow-sm ${
                                  isOp ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white'
                                }`}>
                                  {isOp ? 'OPE' : 'AUX'}
                                </div>
                                <div>
                                  <p className="text-xs font-black text-slate-900 uppercase">{emp.name}</p>
                                  <p className="text-[10px] font-bold text-slate-500 uppercase">{emp.role}</p>
                                </div>
                              </div>

                              {/* 12-Month Mini Gantt Strip */}
                              <div className="flex items-center gap-1 w-full sm:w-auto">
                                {MONTHS.map(m => {
                                  const isOnVacation = vac && vac.month === m.value;
                                  return (
                                    <button
                                      key={m.value}
                                      onClick={() => {
                                        if (canManage && !isOnVacation) {
                                          handleDropToMonth(m.value, {
                                            sector: group.sector,
                                            machine: group.machine,
                                            shift: group.shift
                                          });
                                        }
                                      }}
                                      className={`w-7 h-7 rounded-lg text-[9px] font-black uppercase transition-all flex items-center justify-center ${
                                        isOnVacation
                                          ? isOp
                                            ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300'
                                            : 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300'
                                          : 'bg-white text-slate-400 hover:bg-violet-100 hover:text-violet-700 border border-slate-200'
                                      }`}
                                      title={isOnVacation ? `Férias em ${m.name}` : `Mover férias para ${m.name}`}
                                    >
                                      {m.short}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 3: POWER BI KANBAN BOARD (12 Month Columns with Free DnD) */}
        {/* ------------------------------------------------------------- */}
        {activeView === 'kanban' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white px-6 py-4 rounded-3xl border border-slate-200 shadow-sm">
              <div>
                <h3 className="text-base font-black uppercase text-slate-900 flex items-center gap-2">
                  <Columns size={18} className="text-violet-600" />
                  Quadro Kanban de Férias {selectedYear}
                </h3>
                <p className="text-xs text-slate-500 font-bold uppercase mt-0.5">
                  Arraste os cards entre as colunas dos meses para reorganizar livremente
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="px-3 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-xl font-extrabold uppercase">
                  {unifiedVacations.length} Colaboradores no Quadro
                </span>
              </div>
            </div>

            {/* 12 Columns Horizontal Scroll */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {MONTHS.map(m => {
                const monthVacations = unifiedVacations.filter(v => {
                  if (selectedSectorFilter !== 'all' && getCanonicalSector(v.sector) !== selectedSectorFilter) return false;
                  if (selectedMachineFilter !== 'all' && (v.machine || '').toLowerCase() !== selectedMachineFilter.toLowerCase()) return false;
                  if (selectedShiftFilter !== 'all' && (v.shift || '').toLowerCase() !== selectedShiftFilter.toLowerCase()) return false;
                  return v.month === m.value;
                });

                const opCount = monthVacations.filter(v => isOperatorRole(v.role)).length;
                const isDragOver = dragOverMonth === m.value;

                return (
                  <div
                    key={m.value}
                    onDragOver={(e) => {
                      if (canManage) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }
                    }}
                    onDragEnter={() => {
                      if (canManage) setDragOverMonth(m.value);
                    }}
                    onDragLeave={() => {
                      if (dragOverMonth === m.value) setDragOverMonth(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropToMonth(m.value);
                    }}
                    className={`bg-white border rounded-3xl p-4 shadow-sm flex flex-col min-h-[420px] transition-all ${
                      isDragOver
                        ? 'border-violet-500 ring-2 ring-violet-400 bg-violet-50/50 shadow-lg'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Month Column Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                      <div>
                        <h4 className="text-sm font-black uppercase text-slate-900">{m.name}</h4>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{m.q} • {monthVacations.length} Em Férias</span>
                      </div>
                      <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 text-xs font-black flex items-center justify-center">
                        {monthVacations.length}
                      </span>
                    </div>

                    {/* Cards Container */}
                    <div className="flex-1 space-y-2 overflow-y-auto">
                      {monthVacations.map(vac => {
                        const isOp = isOperatorRole(vac.role);
                        const metric = employeeMetricsMap.get(vac.employeeId);
                        const isVencido = metric?.prazoStatus === 'Vencido';
                        const isCritico = metric?.prazoStatus === 'Crítico';

                        return (
                          <div
                            key={vac.id}
                            draggable={canManage}
                            onDragStart={(e) => {
                              if (canManage) {
                                e.dataTransfer.setData('text/plain', vac.employeeId);
                                e.dataTransfer.effectAllowed = 'move';
                                setDraggingVacation({
                                  id: vac.id,
                                  employeeId: vac.employeeId,
                                  employeeName: vac.employeeName,
                                  fromMonth: vac.month
                                });
                              }
                            }}
                            onDragEnd={() => {
                              setDraggingVacation(null);
                              setDragOverMonth(null);
                            }}
                            className={`p-3 rounded-2xl border shadow-sm transition-all relative group select-none ${
                              canManage ? 'cursor-grab active:cursor-grabbing hover:scale-[1.02]' : ''
                            } ${
                              isOp
                                ? 'bg-blue-50/90 border-blue-200 hover:border-blue-400 text-blue-950'
                                : 'bg-amber-50/80 border-amber-200 hover:border-amber-400 text-amber-950'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                                isOp ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white'
                              }`}>
                                {isOp ? 'OPERADOR' : 'AUXILIAR'}
                              </span>

                              <span className="text-[8px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                {vac.durationDays || 30}d
                              </span>
                            </div>

                            <p className="text-xs font-black uppercase text-slate-900 truncate" title={vac.employeeName}>
                              {formatDisplayName(vac.employeeName)}
                            </p>

                            <p className="text-[10px] font-bold text-slate-500 mt-0.5 truncate">
                              {vac.machine} • {vac.shift}
                            </p>

                            {/* Actions on hover */}
                            {canManage && (
                              <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-md">
                                <button
                                  onClick={() => handleStartEdit(vac)}
                                  className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900"
                                  title="Editar"
                                >
                                  <Edit2 size={11} />
                                </button>
                                <button
                                  onClick={() => setShowConfirmDeleteId(vac.id)}
                                  className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600"
                                  title="Remover"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick Add Button */}
                    {canManage && (
                      <button
                        onClick={() => setAddVacationTarget({
                          sector: 'Extrusão',
                          month: m.value
                        })}
                        className="mt-3 w-full py-2 border border-dashed border-slate-200 hover:border-violet-400 rounded-2xl text-slate-400 hover:text-violet-600 text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5"
                      >
                        <Plus size={13} />
                        <span>Adicionar</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW 4: ANALYTICAL TABLE & CLT COMPLIANCE AUDIT */}
        {/* ------------------------------------------------------------- */}
        {activeView === 'table' && (
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-base font-black uppercase text-slate-900 flex items-center gap-2">
                  <TableIcon size={18} className="text-violet-600" />
                  Relatório Analítico de Prazos CLT e Escala {selectedYear}
                </h3>
                <p className="text-xs text-slate-500 font-bold uppercase mt-0.5">
                  Auditoria completa de início do período aquisitivo, vencimento e limite de gozo legal
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1100px]">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider select-none">
                    <th className="p-3.5 pl-6">Colaborador</th>
                    <th className="p-3.5">Matrícula</th>
                    <th className="p-3.5">Setor</th>
                    <th className="p-3.5">Máquina / Turno</th>
                    <th className="p-3.5">Cargo</th>
                    <th className="p-3.5">Início Período</th>
                    <th className="p-3.5">Venc. Período</th>
                    <th className="p-3.5">Data Limite Gozo</th>
                    <th className="p-3.5 text-center">Saldo Venc.</th>
                    <th className="p-3.5">Mês Gozo {selectedYear}</th>
                    <th className="p-3.5 text-center">Status Prazo</th>
                    {canManage && <th className="p-3.5 pr-6 text-right">Ações</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredEmployees.map(emp => {
                    const metric = employeeMetricsMap.get(emp.id);
                    const vac = metric?.scheduledVacation;
                    const isOp = isOperatorRole(emp.role);

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 pl-6 font-black text-slate-900 uppercase">
                          {emp.name}
                        </td>
                        <td className="p-3 font-bold text-slate-500">
                          {emp.registration || '-'}
                        </td>
                        <td className="p-3 font-extrabold text-violet-700 uppercase">
                          {emp.sector || 'Extrusão'}
                        </td>
                        <td className="p-3 font-bold text-slate-700 uppercase">
                          {emp.machine || 'Cast 1'} — {emp.shift || 'Diurno 1'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                            isOp ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {emp.role}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-600">
                          {formatDateToShow(metric?.inicioPeriodo)}
                        </td>
                        <td className="p-3 font-bold text-slate-600">
                          {formatDateToShow(metric?.vencPeriodo)}
                        </td>
                        <td className="p-3 font-black text-slate-900">
                          {formatDateToShow(metric?.dataLimiteGozo)}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700">
                          {metric?.sldVenc ? `${metric.sldVenc}d` : '-'}
                        </td>
                        <td className="p-3">
                          {vac ? (
                            <span className="px-2.5 py-1 rounded-xl bg-violet-50 text-violet-700 border border-violet-200 text-xs font-black uppercase">
                              {MONTHS[vac.month - 1].name} ({vac.durationDays || 30}d)
                            </span>
                          ) : (
                            <span className="text-slate-400 italic font-bold">Não agendado</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            metric?.prazoStatus === 'Vencido' ? 'bg-red-100 text-red-700 border border-red-200' :
                            metric?.prazoStatus === 'Crítico' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                            'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}>
                            {metric?.prazoStatus || 'No Prazo'}
                          </span>
                        </td>
                        {canManage && (
                          <td className="p-3 pr-6 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {vac ? (
                                <button
                                  onClick={() => handleStartEdit(vac)}
                                  className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
                                  title="Editar Férias"
                                >
                                  <Edit2 size={13} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => setAddVacationTarget({
                                    sector: emp.sector || 'Extrusão',
                                    machine: emp.machine,
                                    shift: emp.shift,
                                    month: 1
                                  })}
                                  className="px-2.5 py-1 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg text-[10px] font-black uppercase transition-colors"
                                >
                                  Agendar
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: EDIT VACATION & PERIODS */}
      {/* ------------------------------------------------------------- */}
      {isEditingVacation && editingVacationData && (
        <div className="fixed inset-0 z-[200] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-slate-900">Ajustar Férias & Prazos</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase">{editingVacationData.employeeName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditingVacation(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Mês de Gozo</label>
                  <select
                    value={editingVacationData.month || 1}
                    onChange={(e) => {
                      const m = parseInt(e.target.value);
                      const start = `${selectedYear}-${String(m).padStart(2, '0')}-01`;
                      setEditingVacationData({ ...editingVacationData, month: m, startDate: start });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                  >
                    {MONTHS.map(m => (
                      <option key={m.value} value={m.value}>{m.name} ({m.q})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Duração (Dias)</label>
                  <select
                    value={editingVacationData.durationDays || 30}
                    onChange={(e) => setEditingVacationData({ ...editingVacationData, durationDays: parseInt(e.target.value) as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                  >
                    <option value={10}>10 Dias</option>
                    <option value={15}>15 Dias</option>
                    <option value={20}>20 Dias</option>
                    <option value={30}>30 Dias</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Data Início</label>
                  <input
                    type="date"
                    value={editingVacationData.startDate || ''}
                    onChange={(e) => setEditingVacationData({ ...editingVacationData, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Início Período Aquisitivo</label>
                  <input
                    type="date"
                    value={formInicioPeriodo}
                    onChange={(e) => setFormInicioPeriodo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {formInicioPeriodo && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between font-bold text-slate-600">
                    <span>Fim do Período (Vencimento):</span>
                    <span className="font-black text-slate-900">{formatDateToShow(calculateVencPeriodo(formInicioPeriodo))}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-600">
                    <span>Data Limite de Gozo CLT:</span>
                    <span className="font-black text-slate-900">{formatDateToShow(calculateDataLimiteGozo(calculateVencPeriodo(formInicioPeriodo)))}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setIsEditingVacation(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEditModal}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-violet-200 transition-all"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: QUICK ADD VACATION FOR UNSCHEDULED EMPLOYEE */}
      {/* ------------------------------------------------------------- */}
      {addVacationTarget && (
        <div className="fixed inset-0 z-[200] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black uppercase text-slate-900">
                  Agendar Férias em {MONTHS[addVacationTarget.month - 1].name}/{selectedYear}
                </h3>
                <p className="text-xs font-bold text-slate-500 uppercase">
                  {addVacationTarget.sector} {addVacationTarget.machine ? `• ${addVacationTarget.machine}` : ''}
                </p>
              </div>
              <button
                onClick={() => {
                  setAddVacationTarget(null);
                  setSelectedEmpForScheduler(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {!selectedEmpForScheduler ? (
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase text-slate-500">Selecione o Colaborador:</label>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {activeEmployees.map(emp => {
                    const isOp = isOperatorRole(emp.role);
                    return (
                      <button
                        key={emp.id}
                        onClick={() => {
                          setSelectedEmpForScheduler(emp);
                          setFormInicioPeriodo(getEmployeeField(emp, 'inicioPeriodo') || '');
                          setFormSldVenc(typeof getEmployeeField(emp, 'sldVenc') === 'number' ? getEmployeeField(emp, 'sldVenc') : 0);
                        }}
                        className="w-full p-3 bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-300 rounded-2xl text-left transition-all flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-xs font-black uppercase text-slate-900 group-hover:text-violet-700">{emp.name}</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase">{emp.machine} • {emp.shift} • {emp.role}</p>
                        </div>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${
                          isOp ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {isOp ? 'OPE' : 'AUX'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-violet-50 border border-violet-200 rounded-2xl">
                  <p className="text-[10px] font-black text-violet-600 uppercase">Colaborador Selecionado</p>
                  <p className="text-xs font-black text-slate-900 uppercase mt-0.5">{selectedEmpForScheduler.name}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">{selectedEmpForScheduler.machine} • {selectedEmpForScheduler.shift} • {selectedEmpForScheduler.role}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Duração</label>
                    <select
                      id="new-vac-duration"
                      defaultValue={30}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                    >
                      <option value={20}>20 Dias</option>
                      <option value={30}>30 Dias</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Data Início</label>
                    <input
                      type="date"
                      id="new-vac-start"
                      defaultValue={`${selectedYear}-${String(addVacationTarget.month).padStart(2, '0')}-01`}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedEmpForScheduler(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase transition-all"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => {
                      const dur = parseInt((document.getElementById('new-vac-duration') as HTMLSelectElement)?.value || '30') as 20 | 30;
                      const st = (document.getElementById('new-vac-start') as HTMLInputElement)?.value || `${selectedYear}-${String(addVacationTarget.month).padStart(2, '0')}-01`;
                      handleSaveQuickAdd(selectedEmpForScheduler, addVacationTarget.month, dur, st);
                    }}
                    className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-violet-200 transition-all"
                  >
                    Confirmar Agendamento
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!showConfirmDeleteId}
        onClose={() => setShowConfirmDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Remover Férias?"
        message="Tem certeza que deseja desmarcar as férias deste colaborador? O colaborador voltará para o status não agendado."
        confirmText="Sim, Remover"
        cancelText="Cancelar"
        type="danger"
      />

    </div>
  );
}
