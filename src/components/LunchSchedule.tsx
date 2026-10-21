import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Clock, User, Trash2, Copy, Check, Search, Plus, CalendarDays,
  Utensils, ArrowLeft, RefreshCw, AlertCircle, Info, CheckCircle2, ChevronRight, Sparkles,
  FileDown
} from 'lucide-react';
import { Employee } from '../types';
import { collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface LunchScheduleProps {
  employees: Employee[];
  onClose: () => void;
  canManage: boolean;
  isReadOnly?: boolean;
  onBlockedAction?: (title?: string, message?: string) => void;
  setPdfModal?: (modal: any) => void;
}

interface LunchAllocation {
  id: string;
  dayOfWeek: string;
  sector: string;
  machine: string;
  shift: string;
  timeSlot: string; // '11h às 12h' ou '12h às 13h'
  employeeIds: string[];
}

const DAYS_OF_WEEK = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo'
];

const LUNCH_SLOTS = [
  '11h às 12h',
  '12h às 13h'
];

const SECTOR_MACHINE_SHIFTS_METADATA = [
  { sector: 'Extrusão', machine: 'Cast 1', shifts: ['Diurno 1', 'Noturno 1', 'Diurno 2', 'Noturno 2'] },
  { sector: 'Extrusão', machine: 'Cast 2', shifts: ['Diurno 1', 'Noturno 1', 'Diurno 2', 'Noturno 2'] },
  { sector: 'Reciclagem', machine: 'Erema 1', shifts: ['Diurno 1', 'Noturno 1', 'Diurno 2', 'Noturno 2'] },
  { sector: 'Fita', machine: 'Ghezzi', shifts: ['Diurno 1', 'Diurno 2'] },
  { sector: 'Fita', machine: 'Lintech', shifts: ['Comercial'] },
  { sector: 'Fita', machine: 'Wultec', shifts: ['Diurno 1', 'Diurno 2'] },
];

const getSectorDisplayName = (sector: string) => {
  if (sector === 'Fita') return 'Fita Adesiva';
  return sector;
};

const getSlotsForShift = (shift: string) => {
  if (shift && shift.includes('Noturno')) {
    return ['21h às 22h', '22h às 23h'];
  }
  return ['11h às 12h', '12h às 13h'];
};

export function LunchSchedule({ 
  employees, 
  onClose, 
  canManage,
  isReadOnly = false,
  onBlockedAction,
  setPdfModal
}: LunchScheduleProps) {
  const [allocations, setAllocations] = useState<LunchAllocation[]>([]);
  const [activeDay, setActiveDay] = useState<string>('Segunda-feira');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  
  // Modal de Adicionar Colaborador
  const [activeAllocationSlot, setActiveAllocationSlot] = useState<{
    sector: string;
    machine: string;
    shift: string;
    timeSlot: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Sincronizar alocações de almoço com o Firestore
  useEffect(() => {
    setIsLoading(true);
    const unsub = onSnapshot(collection(db, 'lunch_schedules'), (snap) => {
      const data = snap.docs.map(docRef => ({
        ...docRef.data(),
        id: docRef.id
      })) as LunchAllocation[];
      setAllocations(data);
      setIsLoading(false);
    }, (err) => {
      console.error('Erro ao buscar escalas de almoço:', err);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  const getDocId = (day: string, sector: string, machine: string, shift: string, slot: string) => {
    return `${day}_${sector}_${machine}_${shift}_${slot}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]/g, '_');
  };

  // Filtrar funcionários ativos (desconsiderando demitidos, em férias ou silenciados)
  const activeEmployees = useMemo(() => {
    return employees.filter(emp => {
      if (emp.isSilenced) return false;
      if (!emp.name || emp.name === 'VAGA DISPONÍVEL' || emp.name === 'Em Contratação') return false;
      const status = (emp.status || '').toLowerCase().trim();
      if (status.includes('silenciad') || (emp.name && emp.name.toLowerCase().includes('silenciad'))) return false;
      return ['ativo', 'atestado', 'ferias'].includes(status);
    });
  }, [employees]);

  // Mapeamento rápido de ID para Funcionário
  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach(emp => {
      map.set(emp.id, emp);
    });
    return map;
  }, [employees]);

  // Verificar se o funcionário já está escalado para almoço no dia ativo
  const getEmployeeAllocationOnActiveDay = (employeeId: string) => {
    const alloc = allocations.find(a => a.dayOfWeek === activeDay && a.employeeIds.includes(employeeId));
    if (alloc) {
      return {
        timeSlot: alloc.timeSlot,
        machine: alloc.machine,
        shift: alloc.shift,
        sector: alloc.sector
      };
    }
    return null;
  };

  // Helper para comparar máquinas de corte de fita e extrusão de forma resiliente
  const normalizeMatchMachine = (m1: string, m2: string) => {
    if (m1 === m2) return true;
    const n1 = (m1 || '').toLowerCase().trim();
    const n2 = (m2 || '').toLowerCase().trim();
    if (n1 === n2) return true;
    const isGhezzi = (s: string) => s === 'ghezzi' || s === 'ghezze' || s === 'gehl';
    const isLintech = (s: string) => s === 'lintech' || s === 'lintec';
    const isWultec = (s: string) => s === 'wultec' || s === 'wutec' || s === 'ultech' || s === 'ultec';
    if (isGhezzi(n1) && isGhezzi(n2)) return true;
    if (isLintech(n1) && isLintech(n2)) return true;
    if (isWultec(n1) && isWultec(n2)) return true;
    return false;
  };

  // Obter as pessoas escaladas para um determinado slot
  const getAllocatedEmployees = (sector: string, machine: string, shift: string, slot: string) => {
    const alloc = allocations.find(
      a => a.dayOfWeek === activeDay && 
           a.sector === sector && 
           normalizeMatchMachine(a.machine, machine) && 
           a.shift === shift && 
           a.timeSlot === slot
    );
    if (!alloc) return [];
    return alloc.employeeIds
      .map(id => employeeMap.get(id))
      .filter((emp): emp is Employee => !!emp);
  };

  // Adicionar funcionário a um slot
  const handleAddEmployeeToSlot = async (employeeId: string, sector: string, machine: string, shift: string, slot: string) => {
    if (isReadOnly) {
      if (onBlockedAction) onBlockedAction('Ação Bloqueada', 'A alteração de escalas de almoço não é permitida no Modo de Leitura.');
      return;
    }
    if (!canManage) return;

    // Remover de qualquer outro slot do MESMO dia para manter consistência (um almoço por dia)
    const existingAllocations = allocations.filter(a => a.dayOfWeek === activeDay && a.employeeIds.includes(employeeId));
    
    const batch = writeBatch(db);

    for (const oldAlloc of existingAllocations) {
      const updatedIds = oldAlloc.employeeIds.filter(id => id !== employeeId);
      const oldDocRef = doc(db, 'lunch_schedules', oldAlloc.id);
      if (updatedIds.length === 0) {
        batch.delete(oldDocRef);
      } else {
        batch.update(oldDocRef, { employeeIds: updatedIds, updatedAt: new Date().toISOString() });
      }
    }

    // Adicionar ao novo slot
    const docId = getDocId(activeDay, sector, machine, shift, slot);
    const targetAlloc = allocations.find(a => a.id === docId);
    const targetDocRef = doc(db, 'lunch_schedules', docId);

    const newEmployeeIds = targetAlloc 
      ? [...new Set([...targetAlloc.employeeIds, employeeId])]
      : [employeeId];

    batch.set(targetDocRef, {
      id: docId,
      dayOfWeek: activeDay,
      sector,
      machine,
      shift,
      timeSlot: slot,
      employeeIds: newEmployeeIds,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    try {
      await batch.commit();
    } catch (err) {
      console.error('Erro ao salvar escala de almoço:', err);
    }
  };

  // Remover funcionário de um slot
  const handleRemoveEmployeeFromSlot = async (employeeId: string, sector: string, machine: string, shift: string, slot: string) => {
    if (isReadOnly) {
      if (onBlockedAction) onBlockedAction('Ação Bloqueada', 'A remoção de colaboradores da escala de almoço não é permitida no Modo de Leitura.');
      return;
    }
    if (!canManage) return;

    const docId = getDocId(activeDay, sector, machine, shift, slot);
    const targetAlloc = allocations.find(a => a.id === docId);
    if (!targetAlloc) return;

    const updatedIds = targetAlloc.employeeIds.filter(id => id !== employeeId);
    const targetDocRef = doc(db, 'lunch_schedules', docId);

    try {
      if (updatedIds.length === 0) {
        await deleteDoc(targetDocRef);
      } else {
        await setDoc(targetDocRef, {
          ...targetAlloc,
          employeeIds: updatedIds,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Erro ao remover funcionário do almoço:', err);
    }
  };

  // Copiar escala do dia ativo para outro dia
  const handleCopyScheduleToDay = async (targetDay: string) => {
    if (isReadOnly) {
      if (onBlockedAction) onBlockedAction('Ação Bloqueada', 'A cópia de escalas de almoço não é permitida no Modo de Leitura.');
      return;
    }
    if (!canManage) return;

    const activeDayAllocations = allocations.filter(a => a.dayOfWeek === activeDay);
    if (activeDayAllocations.length === 0) {
      alert('Não há escalas preenchidas no dia atual para copiar.');
      return;
    }

    const batch = writeBatch(db);

    // Primeiro apaga todas as escalas antigas do dia destino para substituir completamente
    const targetDayAllocations = allocations.filter(a => a.dayOfWeek === targetDay);
    targetDayAllocations.forEach(a => {
      batch.delete(doc(db, 'lunch_schedules', a.id));
    });

    // Copia as escalas do dia ativo com novos IDs para o dia destino
    activeDayAllocations.forEach(a => {
      const newDocId = getDocId(targetDay, a.sector, a.machine, a.shift, a.timeSlot);
      batch.set(doc(db, 'lunch_schedules', newDocId), {
        id: newDocId,
        dayOfWeek: targetDay,
        sector: a.sector,
        machine: a.machine,
        shift: a.shift,
        timeSlot: a.timeSlot,
        employeeIds: a.employeeIds,
        updatedAt: new Date().toISOString()
      });
    });

    try {
      await batch.commit();
      setCopySuccess(`Escala de ${activeDay} copiada com sucesso para ${targetDay}!`);
      setIsCopyModalOpen(false);
      setTimeout(() => setCopySuccess(null), 4000);
    } catch (err) {
      console.error('Erro ao copiar escala:', err);
    }
  };

  // Copiar escala do dia ativo para todos os outros dias
  const handleCopyScheduleToAllDays = async () => {
    if (isReadOnly) {
      if (onBlockedAction) onBlockedAction('Ação Bloqueada', 'A replicação de escalas de almoço não é permitida no Modo de Leitura.');
      return;
    }
    if (!canManage) return;

    const activeDayAllocations = allocations.filter(a => a.dayOfWeek === activeDay);
    if (activeDayAllocations.length === 0) {
      alert('Não há escalas preenchidas no dia atual para copiar.');
      return;
    }

    const otherDays = DAYS_OF_WEEK.filter(d => d !== activeDay);
    const batch = writeBatch(db);

    // Limpar e criar para todos os outros dias
    otherDays.forEach(day => {
      const targetDayAllocations = allocations.filter(a => a.dayOfWeek === day);
      targetDayAllocations.forEach(a => {
        batch.delete(doc(db, 'lunch_schedules', a.id));
      });

      activeDayAllocations.forEach(a => {
        const newDocId = getDocId(day, a.sector, a.machine, a.shift, a.timeSlot);
        batch.set(doc(db, 'lunch_schedules', newDocId), {
          id: newDocId,
          dayOfWeek: day,
          sector: a.sector,
          machine: a.machine,
          shift: a.shift,
          timeSlot: a.timeSlot,
          employeeIds: a.employeeIds,
          updatedAt: new Date().toISOString()
        });
      });
    });

    try {
      await batch.commit();
      setCopySuccess(`Escala de ${activeDay} replicada para todos os dias da semana!`);
      setIsCopyModalOpen(false);
      setTimeout(() => setCopySuccess(null), 4000);
    } catch (err) {
      console.error('Erro ao replicar escala para todos os dias:', err);
    }
  };

  // Helper to normalize strings for comparison and mapping
  const normalizeText = (s: string | undefined | null) => 
    (s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");

  // Obter funcionários elegíveis (excluindo liderança)
  const getEligibleEmployees = (emps: Employee[]) => {
    return emps.filter(emp => {
      if (!emp.name) return false;
      const nameUpper = emp.name.toUpperCase();
      if (nameUpper === 'VAGA DISPONÍVEL' || nameUpper === 'EM CONTRATAÇÃO' || nameUpper === 'VAGA DISPONIVEL') return false;
      
      const statusNorm = normalizeText(emp.status);
      if (statusNorm === 'desligado' || statusNorm === 'vaga excluida') return false;

      const sectorNorm = normalizeText(emp.sector);
      if (sectorNorm === 'lideranca') return false;

      // Excluir liderança com base em cargo também, caso não esteja no setor liderança
      const roleNorm = normalizeText(emp.role);
      if (
        roleNorm.includes('lider') || 
        roleNorm.includes('supervisor') || 
        roleNorm.includes('coordenador') || 
        roleNorm.includes('gerente')
      ) return false;

      return true;
    });
  };

  const mapEmployeeToAllocationKey = (emp: Employee) => {
    const sNorm = normalizeText(emp.sector);
    const mNorm = normalizeText(emp.machine);
    const shNorm = normalizeText(emp.shift);

    let sector = '';
    let machine = '';
    let shift = '';

    // Determine Sector and Machine
    if (sNorm.includes('extrus')) {
      sector = 'Extrusão';
      if (mNorm.includes('cast 1')) {
        machine = 'Cast 1';
      } else if (mNorm.includes('cast 2')) {
        machine = 'Cast 2';
      } else {
        machine = 'Cast 1'; // default/fallback
      }
    } else if (sNorm.includes('recic')) {
      sector = 'Reciclagem';
      machine = 'Erema 1';
    } else if (sNorm.includes('fita')) {
      sector = 'Fita';
      if (mNorm.includes('ghezzi') || mNorm.includes('ghezze') || mNorm.includes('gehl')) {
        machine = 'Ghezzi';
      } else if (mNorm.includes('lintech') || mNorm.includes('lintec')) {
        machine = 'Lintech';
      } else if (mNorm.includes('wultec') || mNorm.includes('wutec') || mNorm.includes('ultech') || mNorm.includes('ultec')) {
        machine = 'Wultec';
      } else {
        machine = 'Ghezzi'; // fallback
      }
    } else {
      // Outro fallback
      sector = emp.sector || 'Extrusão';
      machine = emp.machine || 'Cast 1';
    }

    // Determine Shift
    if (shNorm.includes('comercial') || shNorm.includes('integral')) {
      shift = 'Comercial';
    } else if (shNorm.includes('diurno 1') || shNorm.includes('dia 1')) {
      shift = 'Diurno 1';
    } else if (shNorm.includes('diurno 2') || shNorm.includes('dia 2')) {
      shift = 'Diurno 2';
    } else if (shNorm.includes('noturno 1') || shNorm.includes('noite 1')) {
      shift = 'Noturno 1';
    } else if (shNorm.includes('noturno 2') || shNorm.includes('noite 2')) {
      shift = 'Noturno 2';
    } else if (shNorm.includes('dia')) {
      shift = 'Diurno 1';
    } else if (shNorm.includes('noite')) {
      shift = 'Noturno 1';
    } else {
      shift = emp.shift || 'Diurno 1';
    }

    return { sector, machine, shift };
  };

  const getActiveShiftsForDay = (day: string) => {
    const d = day.toLowerCase();
    if (d.includes('segunda') || d.includes('quarta') || d.includes('sexta') || d.includes('domingo')) {
      return ['Diurno 1', 'Noturno 1', 'Comercial'];
    } else {
      return ['Diurno 2', 'Noturno 2', 'Comercial'];
    }
  };

  const getSlotAssignments = (sector: string, machine: string, shift: string, emps: Employee[], dayOfWeek: string) => {
    const slots = getSlotsForShift(shift);
    const assignments: { [slot: string]: string[] } = {
      [slots[0]]: [],
      [slots[1]]: []
    };

    // Sort alphabetically by name for a stable order before rotation
    const sorted = [...emps].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

    if (shift === 'Comercial') {
      assignments[slots[1]] = sorted.map(e => e.id);
    } else if (sector === 'Extrusão' && machine === 'Cast 1') {
      const dayIndex = DAYS_OF_WEEK.indexOf(dayOfWeek);
      const steps = dayIndex >= 0 ? dayIndex : 0;
      
      let rotated = sorted;
      if (sorted.length > 0) {
        const k = steps % sorted.length;
        rotated = [...sorted.slice(k), ...sorted.slice(0, k)];
      }

      assignments[slots[0]] = rotated.slice(0, 2).map(e => e.id);
      assignments[slots[1]] = rotated.slice(2).map(e => e.id);
    } else if (sector === 'Extrusão' && machine === 'Cast 2') {
      const dayIndex = DAYS_OF_WEEK.indexOf(dayOfWeek);
      const steps = dayIndex >= 0 ? dayIndex : 0;

      let rotated = sorted;
      if (sorted.length > 0) {
        const k = steps % sorted.length;
        rotated = [...sorted.slice(k), ...sorted.slice(0, k)];
      }

      assignments[slots[0]] = rotated.slice(0, 1).map(e => e.id);
      assignments[slots[1]] = rotated.slice(1).map(e => e.id);
    } else {
      assignments[slots[0]] = sorted.map(e => e.id);
    }

    return assignments;
  };

  const handleAutoFillWeeklySchedule = async () => {
    if (!canManage) return;

    setIsLoading(true);

    try {
      const eligible = getEligibleEmployees(employees);

      // Group employees by key
      const groups: { [key: string]: Employee[] } = {};
      eligible.forEach(emp => {
        const { sector, machine, shift } = mapEmployeeToAllocationKey(emp);
        const key = `${sector}|${machine}|${shift}`;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(emp);
      });

      // We will collect all set/delete write operations
      const operations: { type: 'set' | 'delete'; ref: any; data?: any }[] = [];

      // 1. Delete all existing allocations
      allocations.forEach(alloc => {
        operations.push({
          type: 'delete',
          ref: doc(db, 'lunch_schedules', alloc.id)
        });
      });

      // 2. Generate new allocations for all days
      DAYS_OF_WEEK.forEach(day => {
        const activeShiftsForDay = getActiveShiftsForDay(day);
        Object.entries(groups).forEach(([key, emps]) => {
          const [sector, machine, shift] = key.split('|');
          
          // Skip if the shift is not active on this day of the week
          if (!activeShiftsForDay.includes(shift)) {
            return;
          }

          const assignments = getSlotAssignments(sector, machine, shift, emps, day);

          Object.entries(assignments).forEach(([slot, ids]) => {
            if (ids.length > 0) {
              const docId = getDocId(day, sector, machine, shift, slot);
              operations.push({
                type: 'set',
                ref: doc(db, 'lunch_schedules', docId),
                data: {
                  id: docId,
                  dayOfWeek: day,
                  sector,
                  machine,
                  shift,
                  timeSlot: slot,
                  employeeIds: ids,
                  updatedAt: new Date().toISOString()
                }
              });
            }
          });
        });
      });

      // 3. Execute in batches of 400 to prevent Firestore limit errors
      const batchSize = 400;
      for (let i = 0; i < operations.length; i += batchSize) {
        const chunk = operations.slice(i, i + batchSize);
        const batch = writeBatch(db);
        
        chunk.forEach(op => {
          if (op.type === 'delete') {
            batch.delete(op.ref);
          } else {
            batch.set(op.ref, op.data, { merge: true });
          }
        });

        await batch.commit();
      }

      setCopySuccess('Escala de almoço preenchida automaticamente para toda a semana!');
      setTimeout(() => setCopySuccess(null), 5000);
    } catch (err) {
      console.error('Erro ao gerar escala automática:', err);
      alert('Ocorreu um erro ao gerar a escala automática de almoço.');
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and Drop States
  const [draggedEmployeeId, setDraggedEmployeeId] = useState<string | null>(null);
  const [activeDragTarget, setActiveDragTarget] = useState<{ sector: string, machine: string, shift: string, timeSlot: string } | null>(null);

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, employeeId: string) => {
    e.dataTransfer.setData('text/plain', employeeId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedEmployeeId(employeeId);
  };

  const handleDragEnd = () => {
    setDraggedEmployeeId(null);
    setActiveDragTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, sector: string, machine: string, shift: string, timeSlot: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!activeDragTarget || 
        activeDragTarget.sector !== sector || 
        activeDragTarget.machine !== machine || 
        activeDragTarget.shift !== shift || 
        activeDragTarget.timeSlot !== timeSlot) {
      setActiveDragTarget({ sector, machine, shift, timeSlot });
    }
  };

  const handleDragLeave = () => {
    setActiveDragTarget(null);
  };

  const handleDrop = async (e: React.DragEvent, sector: string, machine: string, shift: string, timeSlot: string) => {
    e.preventDefault();
    setActiveDragTarget(null);
    setDraggedEmployeeId(null);
    
    const employeeId = e.dataTransfer.getData('text/plain');
    if (!employeeId) return;

    await handleAddEmployeeToSlot(employeeId, sector, machine, shift, timeSlot);
  };

  // Obter funcionários recomendados para a seleção (aqueles que estão no mesmo posto)
  const recommendedSelectionEmployees = useMemo(() => {
    if (!activeAllocationSlot) return [];
    const { sector, machine, shift } = activeAllocationSlot;
    return activeEmployees.filter(emp => {
      // Comparação normalizada
      const matchesSector = (emp.sector || '').trim().toLowerCase() === sector.trim().toLowerCase();
      const matchesMachine = (emp.machine || '').trim().toLowerCase() === machine.trim().toLowerCase();
      const matchesShift = (emp.shift || '').trim().toLowerCase() === shift.trim().toLowerCase();
      return matchesSector && matchesMachine && matchesShift;
    });
  }, [activeAllocationSlot, activeEmployees]);

  // Outros funcionários na seleção (que não são da mesma máquina/turno)
  const otherSelectionEmployees = useMemo(() => {
    if (!activeAllocationSlot) return [];
    const recommendedIds = new Set(recommendedSelectionEmployees.map(e => e.id));
    return activeEmployees.filter(emp => !recommendedIds.has(emp.id));
  }, [activeAllocationSlot, activeEmployees, recommendedSelectionEmployees]);

  // Filtrar pela busca
  const filterBySearch = (list: Employee[]) => {
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(emp => 
      emp.name.toLowerCase().includes(term) || 
      (emp.role || '').toLowerCase().includes(term) ||
      (emp.registration || '').toLowerCase().includes(term)
    );
  };

  // PDF Generation functions
  const buildTableDataForDay = (day: string) => {
    const activeShifts = getActiveShiftsForDay(day);
    const rows: any[] = [];

    SECTOR_MACHINE_SHIFTS_METADATA.forEach(({ sector, machine, shifts }) => {
      shifts.forEach(sh => {
        if (activeShifts.includes(sh)) {
          const slots = getSlotsForShift(sh);
          
          // Query allocations for Slot 1 (11h às 12h or 21h às 22h)
          const alloc11 = allocations.find(
            a => a.dayOfWeek === day && 
                 a.sector === sector && 
                 a.machine === machine && 
                 a.shift === sh && 
                 a.timeSlot === slots[0]
          );
          const names11 = alloc11
            ? alloc11.employeeIds
                .map(id => employeeMap.get(id)?.name || '')
                .filter(name => name !== '')
                .join(', ')
            : '';

          // Query allocations for Slot 2 (12h às 13h or 22h às 23h)
          const alloc12 = allocations.find(
            a => a.dayOfWeek === day && 
                 a.sector === sector && 
                 a.machine === machine && 
                 a.shift === sh && 
                 a.timeSlot === slots[1]
          );
          const names12 = alloc12
            ? alloc12.employeeIds
                .map(id => employeeMap.get(id)?.name || '')
                .filter(name => name !== '')
                .join(', ')
            : '';

          rows.push({
            sector,
            machine,
            shift: sh,
            slot11: names11 || 'Sem escala',
            slot12: names12 || 'Sem escala'
          });
        }
      });
    });

    return rows;
  };

  const drawPageForDay = (day: string, doc: jsPDF, isFirstPage: boolean) => {
    if (!isFirstPage) {
      doc.addPage();
    }

    // Header block
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 297, 30, 'F');

    // Decorative amber line
    doc.setFillColor(245, 158, 11); // amber-500
    doc.rect(0, 30, 297, 2, 'F');

    // Header Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('MANUPACKAGING - CONTROLE DE ESCALAS', 15, 13);

    // Day label badge
    doc.setFillColor(245, 158, 11); // Amber
    doc.roundedRect(15, 18, 55, 7, 1.5, 1.5, 'F');
    
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`ESCALA DE ALMOÇO - ${day.toUpperCase()}`, 17, 23);

    // Subtitle/Metadata
    doc.setTextColor(203, 213, 225); // slate-300
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    const nowStr = new Date().toLocaleString('pt-BR');
    doc.text(`Gerado em: ${nowStr} | Horário de Almoço: Diurnos (11h-13h) / Noturnos (21h-23h)`, 80, 23);

    const rows = buildTableDataForDay(day);
    const tableBody = rows.map(r => [
      getSectorDisplayName(r.sector),
      r.machine,
      r.shift,
      r.slot11,
      r.slot12
    ]);

    autoTable(doc, {
      startY: 38,
      head: [['SETOR', 'MÁQUINA / POSTO', 'TURNO', '1º GRUPO (11h às 12h / 21h às 22h)', '2º GRUPO (12h às 13h / 22h às 23h)']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59], // Slate-800
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'left',
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'bold', fontSize: 9 },
        1: { cellWidth: 40, fontStyle: 'bold', fontSize: 9 },
        2: { cellWidth: 35, fontSize: 9 },
        3: { cellWidth: 83, fontSize: 9.5 },
        4: { cellWidth: 84, fontSize: 9.5 },
      },
      styles: {
        overflow: 'linebreak',
        cellPadding: 4,
        fontSize: 9,
        valign: 'middle',
        textColor: [15, 23, 42],
        lineColor: [226, 232, 240],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      didParseCell: (data) => {
        if (data.cell.text.includes('Sem escala')) {
          data.cell.styles.textColor = [148, 163, 184];
          data.cell.styles.fontStyle = 'italic';
        }
      }
    });

    const pageCount = (doc.internal as any).getNumberOfPages();
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Manupackaging • Gestão de Escalas de Refeitório`, 15, 202);
    doc.text(`Página ${pageCount}`, 275, 202);
  };

  const handleExportPDF = (type: 'current' | 'week') => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const filename = type === 'current' ? `Escala_Almoco_${activeDay.replace('-feira', '')}.pdf` : 'Escala_Almoco_Semana_Completa.pdf';
    const title = type === 'current' ? `Escala de Almoço (${activeDay})` : 'Escala de Almoço (Semana Completa)';
    
    if (type === 'current') {
      drawPageForDay(activeDay, doc, true);
    } else {
      DAYS_OF_WEEK.forEach((day, index) => {
        drawPageForDay(day, doc, index === 0);
      });
    }

    if (setPdfModal) {
      setPdfModal({
        isOpen: true,
        doc,
        filename,
        title
      });
      setIsExportModalOpen(false);
      return;
    }

    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Download de PDF Bloqueado', 'O download da escala em PDF não é permitido no Modo de Leitura.');
      } else {
        alert('Download não permitido no Modo de Leitura.');
      }
      setIsExportModalOpen(false);
      return;
    }

    doc.save(filename);
    setIsExportModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8 flex flex-col justify-between select-none">
      
      {/* Header */}
      <div className="max-w-7xl mx-auto w-full mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="p-3 bg-slate-900 border border-slate-800 rounded-2xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all active:scale-95 flex items-center justify-center shadow-lg"
              title="Voltar ao Quadro"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 border border-amber-500/20 shadow-inner">
                <Utensils size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                  Escala de Almoço de Segunda a Domingo
                </h1>
                <p className="text-[10px] text-amber-400 font-bold uppercase tracking-[0.25em]">
                  Planejamento e Alocação por Máquina e Turno (11h às 12h & 12h às 13h)
                </p>
                {canManage && (
                  <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mt-1.5 flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 w-fit">
                    <Sparkles size={11} className="animate-pulse" /> Clique e arraste os nomes para mudar os horários
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Ações Rápidas */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3.5 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black uppercase tracking-wider rounded-2xl transition-all active:scale-95 shadow-md shadow-rose-500/10 cursor-pointer"
              title="Exportar escala de almoço para PDF"
            >
              <FileDown size={16} />
              Salvar em PDF
            </button>
            {canManage && (
              <>
                <button
                  onClick={handleAutoFillWeeklySchedule}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 text-[11px] font-black uppercase tracking-wider rounded-2xl transition-all active:scale-95 shadow-md shadow-amber-500/10 cursor-pointer"
                  title="Preencher escala automaticamente de acordo com as regras de Cast 1/2, outras máquinas e comercial"
                >
                  <Sparkles size={16} className="text-slate-950" />
                  Gerar Escala Automática
                </button>
                <button
                  onClick={() => setIsCopyModalOpen(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[11px] font-black uppercase tracking-wider rounded-2xl text-slate-300 transition-all hover:border-slate-700 active:scale-95 shadow-md cursor-pointer"
                >
                  <Copy size={16} className="text-amber-400" />
                  Copiar Escala de {activeDay.split('-')[0]}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Feedback de Cópia com animação */}
        {copySuccess && (
          <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 flex items-center gap-3 text-xs font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-4 duration-300">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{copySuccess}</span>
          </div>
        )}

        {/* Seletor de Dias da Semana (Premium Tab Bar) */}
        <div className="mt-6 flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-none">
          {DAYS_OF_WEEK.map((day) => {
            const isActive = day === activeDay;
            const countForDay = allocations.filter(a => a.dayOfWeek === day).reduce((acc, curr) => acc + curr.employeeIds.length, 0);
            return (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`relative px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-3 shrink-0 shadow-sm border ${
                  isActive 
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black scale-102 shadow-amber-500/10' 
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                <CalendarDays size={16} className={isActive ? 'text-slate-950' : 'text-slate-500'} />
                {day}
                {countForDay > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {countForDay}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-7xl mx-auto w-full flex-1">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-500">
            <RefreshCw size={36} className="animate-spin text-amber-500 mb-4" />
            <p className="text-[11px] font-bold uppercase tracking-widest">Carregando escala de almoço...</p>
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* SEÇÃO EXTRUSÃO */}
            <div className="bg-slate-900/40 rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-800/80">
              <div className="px-8 py-5 flex items-center gap-4 bg-slate-900 border-b border-slate-800/80">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                  <Clock size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">Setor: Extrusão</h2>
                  <p className="text-[9px] text-blue-400 font-bold uppercase tracking-[0.2em]">Escala de Almoço por Turno e Máquina</p>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/40">
                {['Diurno 1', 'Noturno 1', 'Diurno 2', 'Noturno 2']
                  .filter(sh => getActiveShiftsForDay(activeDay).includes(sh))
                  .map(sh => (
                  <div key={sh} className={`p-6 rounded-[2rem] border shadow-md ${
                    sh.includes('Noturno') ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-900/20 border-slate-800/50'
                  }`}>
                    <div className="flex items-center gap-3 mb-6">
                      <Clock size={16} className={sh.includes('Noturno') ? 'text-indigo-400' : 'text-blue-400'}/>
                      <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-300">{sh}</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {['Cast 1', 'Cast 2'].map(ma => (
                        <div key={ma} className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40 space-y-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2">{ma}</p>
                          
                          {/* Slots */}
                          {getSlotsForShift(sh).map(slot => {
                            const allocated = getAllocatedEmployees('Extrusão', ma, sh, slot);
                            const isTarget = activeDragTarget?.sector === 'Extrusão' && activeDragTarget?.machine === ma && activeDragTarget?.shift === sh && activeDragTarget?.timeSlot === slot;
                            return (
                              <div key={slot} className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                  <span className="text-[9px] font-bold uppercase text-amber-500/90 tracking-wide flex items-center gap-1.5">
                                    <Utensils size={10} /> {slot}
                                  </span>
                                  {canManage && (
                                    <button 
                                      onClick={() => setActiveAllocationSlot({ sector: 'Extrusão', machine: ma, shift: sh, timeSlot: slot })}
                                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 p-1 rounded-md transition-colors text-[9px] font-bold uppercase tracking-widest flex items-center gap-1"
                                    >
                                      <Plus size={10} /> Escalar
                                    </button>
                                  )}
                                </div>

                                <div 
                                  onDragOver={(e) => canManage && handleDragOver(e, 'Extrusão', ma, sh, slot)}
                                  onDragLeave={canManage ? handleDragLeave : undefined}
                                  onDrop={(e) => canManage && handleDrop(e, 'Extrusão', ma, sh, slot)}
                                  className={`space-y-1.5 min-h-[44px] rounded-xl p-2 border flex flex-col justify-center transition-all ${
                                    isTarget 
                                      ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.15)] scale-[1.01]' 
                                      : 'bg-slate-950/80 border-slate-900'
                                  }`}
                                >
                                  {allocated.length === 0 ? (
                                    <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest text-center py-2">Sem escala</span>
                                  ) : (
                                    allocated.map(emp => (
                                      <div 
                                        key={emp.id} 
                                        draggable={canManage}
                                        onDragStart={(e) => handleDragStart(e, emp.id)}
                                        onDragEnd={handleDragEnd}
                                        className={`flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800/80 transition-transform duration-200 select-none ${
                                          canManage ? 'cursor-grab active:cursor-grabbing hover:bg-slate-800/80 hover:border-slate-700/80' : ''
                                        }`}
                                      >
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-[11px] font-bold text-slate-100 truncate">{emp.name}</span>
                                          <span className="text-[8px] font-bold text-slate-500 uppercase truncate">{emp.role}</span>
                                        </div>
                                        {canManage && (
                                          <button 
                                            onClick={() => handleRemoveEmployeeFromSlot(emp.id, 'Extrusão', ma, sh, slot)}
                                            className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                                            title="Remover da escala"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        )}
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÃO RECICLAGEM */}
            <div className="bg-slate-900/40 rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-800/80">
              <div className="px-8 py-5 flex items-center gap-4 bg-emerald-950/40 border-b border-emerald-900/50">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                  <Clock size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">Setor: Reciclagem</h2>
                  <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-[0.2em]">Escala de Almoço por Turno e Máquina</p>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950/40">
                {['Diurno 1', 'Diurno 2']
                  .filter(sh => getActiveShiftsForDay(activeDay).includes(sh))
                  .map(sh => (
                  <div key={sh} className="p-6 rounded-[2rem] border border-slate-800 bg-slate-900/20 shadow-md">
                    <div className="flex items-center gap-3 mb-6">
                      <Clock size={16} className="text-emerald-400"/>
                      <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-300">{sh}</h3>
                    </div>

                    <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40 space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2">Erema 1</p>
                      
                      {/* Slots */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {getSlotsForShift(sh).map(slot => {
                          const allocated = getAllocatedEmployees('Reciclagem', 'Erema 1', sh, slot);
                          const isTarget = activeDragTarget?.sector === 'Reciclagem' && activeDragTarget?.machine === 'Erema 1' && activeDragTarget?.shift === sh && activeDragTarget?.timeSlot === slot;
                          return (
                            <div key={slot} className="space-y-2">
                              <div className="flex justify-between items-center px-1">
                                <span className="text-[9px] font-bold uppercase text-amber-500/90 tracking-wide flex items-center gap-1.5">
                                  <Utensils size={10} /> {slot}
                                </span>
                                {canManage && (
                                  <button 
                                    onClick={() => setActiveAllocationSlot({ sector: 'Reciclagem', machine: 'Erema 1', shift: sh, timeSlot: slot })}
                                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 p-1 rounded-md transition-colors text-[9px] font-bold uppercase tracking-widest flex items-center gap-1"
                                  >
                                    <Plus size={10} /> Escalar
                                  </button>
                                )}
                              </div>

                              <div 
                                onDragOver={(e) => canManage && handleDragOver(e, 'Reciclagem', 'Erema 1', sh, slot)}
                                onDragLeave={canManage ? handleDragLeave : undefined}
                                onDrop={(e) => canManage && handleDrop(e, 'Reciclagem', 'Erema 1', sh, slot)}
                                className={`space-y-1.5 min-h-[44px] rounded-xl p-2 border flex flex-col justify-center transition-all ${
                                  isTarget 
                                    ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.15)] scale-[1.01]' 
                                    : 'bg-slate-950/80 border-slate-900'
                                }`}
                              >
                                {allocated.length === 0 ? (
                                  <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest text-center py-2">Sem escala</span>
                                ) : (
                                  allocated.map(emp => (
                                    <div 
                                      key={emp.id} 
                                      draggable={canManage}
                                      onDragStart={(e) => handleDragStart(e, emp.id)}
                                      onDragEnd={handleDragEnd}
                                      className={`flex items-center justify-between bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800/80 transition-transform duration-200 select-none ${
                                        canManage ? 'cursor-grab active:cursor-grabbing hover:bg-slate-800/80 hover:border-slate-700/80' : ''
                                      }`}
                                    >
                                      <div className="flex flex-col min-w-0">
                                        <span className="text-[11px] font-bold text-slate-100 truncate">{emp.name}</span>
                                        <span className="text-[8px] font-bold text-slate-500 uppercase truncate">{emp.role}</span>
                                      </div>
                                      {canManage && (
                                        <button 
                                          onClick={() => handleRemoveEmployeeFromSlot(emp.id, 'Reciclagem', 'Erema 1', sh, slot)}
                                          className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                                          title="Remover da escala"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÃO FITA ADESIVA */}
            <div className="bg-slate-900/40 rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-800/80">
              <div className="px-8 py-5 flex items-center gap-4 bg-orange-950/45 border-b border-orange-900/50">
                <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-400 border border-orange-500/20">
                  <Clock size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">Setor: Fita Adesiva</h2>
                  <p className="text-[9px] text-orange-400 font-bold uppercase tracking-[0.2em]">Escala de Almoço por Turno e Máquina</p>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6 bg-slate-950/40">
                
                {/* Ghezzi */}
                <div className="p-6 rounded-[2rem] border border-slate-800 bg-slate-900/20 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-300">Ghezzi</h3>
                    </div>

                    <div className="space-y-4">
                      {['Diurno 1', 'Diurno 2']
                        .filter(sh => getActiveShiftsForDay(activeDay).includes(sh))
                        .map(sh => (
                        <div key={sh} className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40 space-y-3">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{sh}</p>
                          
                          <div className="grid grid-cols-1 gap-3">
                            {getSlotsForShift(sh).map(slot => {
                              const allocated = getAllocatedEmployees('Fita', 'Ghezzi', sh, slot);
                              const isTarget = activeDragTarget?.sector === 'Fita' && activeDragTarget?.machine === 'Ghezzi' && activeDragTarget?.shift === sh && activeDragTarget?.timeSlot === slot;
                              return (
                                <div key={slot} className="space-y-1">
                                  <div className="flex justify-between items-center px-1">
                                    <span className="text-[9px] font-bold uppercase text-amber-500/90 tracking-wide flex items-center gap-1">
                                      {slot}
                                    </span>
                                    {canManage && (
                                      <button 
                                        onClick={() => setActiveAllocationSlot({ sector: 'Fita', machine: 'Ghezzi', shift: sh, timeSlot: slot })}
                                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 p-0.5 rounded transition-colors text-[9px] font-bold uppercase tracking-widest"
                                      >
                                        + Escalar
                                      </button>
                                    )}
                                  </div>

                                  <div 
                                    onDragOver={(e) => canManage && handleDragOver(e, 'Fita', 'Ghezzi', sh, slot)}
                                    onDragLeave={canManage ? handleDragLeave : undefined}
                                    onDrop={(e) => canManage && handleDrop(e, 'Fita', 'Ghezzi', sh, slot)}
                                    className={`space-y-1 min-h-[36px] rounded-xl p-2 border flex flex-col justify-center transition-all ${
                                      isTarget 
                                        ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.15)] scale-[1.01]' 
                                        : 'bg-slate-950/80 border-slate-900'
                                    }`}
                                  >
                                    {allocated.length === 0 ? (
                                      <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest text-center py-1">Sem escala</span>
                                    ) : (
                                      allocated.map(emp => (
                                        <div 
                                          key={emp.id} 
                                          draggable={canManage}
                                          onDragStart={(e) => handleDragStart(e, emp.id)}
                                          onDragEnd={handleDragEnd}
                                          className={`flex items-center justify-between bg-slate-900 px-2 py-1 rounded-lg border border-slate-800/50 transition-transform duration-200 select-none ${
                                            canManage ? 'cursor-grab active:cursor-grabbing hover:bg-slate-800/80 hover:border-slate-700/80' : ''
                                          }`}
                                        >
                                          <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-bold text-slate-100 truncate">{emp.name}</span>
                                          </div>
                                          {canManage && (
                                            <button 
                                              onClick={() => handleRemoveEmployeeFromSlot(emp.id, 'Fita', 'Ghezzi', sh, slot)}
                                              className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors"
                                            >
                                              <Trash2 size={10} />
                                            </button>
                                          )}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Lintech */}
                <div className="p-6 rounded-[2rem] border border-slate-800 bg-slate-900/20 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-300">Lintech</h3>
                    </div>

                    <div className="space-y-4">
                      {['Comercial'].map(sh => (
                        <div key={sh} className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40 space-y-3">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{sh}</p>
                          
                          <div className="grid grid-cols-1 gap-3">
                            {getSlotsForShift(sh).map(slot => {
                              const allocated = getAllocatedEmployees('Fita', 'Lintech', sh, slot);
                              const isTarget = activeDragTarget?.sector === 'Fita' && activeDragTarget?.machine === 'Lintech' && activeDragTarget?.shift === sh && activeDragTarget?.timeSlot === slot;
                              return (
                                <div key={slot} className="space-y-1">
                                  <div className="flex justify-between items-center px-1">
                                    <span className="text-[9px] font-bold uppercase text-amber-500/90 tracking-wide flex items-center gap-1">
                                      {slot}
                                    </span>
                                    {canManage && (
                                      <button 
                                        onClick={() => setActiveAllocationSlot({ sector: 'Fita', machine: 'Lintech', shift: sh, timeSlot: slot })}
                                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 p-0.5 rounded transition-colors text-[9px] font-bold uppercase tracking-widest"
                                      >
                                        + Escalar
                                      </button>
                                    )}
                                  </div>

                                  <div 
                                    onDragOver={(e) => canManage && handleDragOver(e, 'Fita', 'Lintech', sh, slot)}
                                    onDragLeave={canManage ? handleDragLeave : undefined}
                                    onDrop={(e) => canManage && handleDrop(e, 'Fita', 'Lintech', sh, slot)}
                                    className={`space-y-1 min-h-[36px] rounded-xl p-2 border flex flex-col justify-center transition-all ${
                                      isTarget 
                                        ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.15)] scale-[1.01]' 
                                        : 'bg-slate-950/80 border-slate-900'
                                    }`}
                                  >
                                    {allocated.length === 0 ? (
                                      <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest text-center py-1">Sem escala</span>
                                    ) : (
                                      allocated.map(emp => (
                                        <div 
                                          key={emp.id} 
                                          draggable={canManage}
                                          onDragStart={(e) => handleDragStart(e, emp.id)}
                                          onDragEnd={handleDragEnd}
                                          className={`flex items-center justify-between bg-slate-900 px-2 py-1 rounded-lg border border-slate-800/50 transition-transform duration-200 select-none ${
                                            canManage ? 'cursor-grab active:cursor-grabbing hover:bg-slate-800/80 hover:border-slate-700/80' : ''
                                          }`}
                                        >
                                          <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-bold text-slate-100 truncate">{emp.name}</span>
                                          </div>
                                          {canManage && (
                                            <button 
                                              onClick={() => handleRemoveEmployeeFromSlot(emp.id, 'Fita', 'Lintech', sh, slot)}
                                              className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors"
                                            >
                                              <Trash2 size={10} />
                                            </button>
                                          )}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Wultec */}
                <div className="p-6 rounded-[2rem] border border-slate-800 bg-slate-900/20 shadow-md flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-2 h-2 rounded-full bg-orange-500" />
                      <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-300">Wultec</h3>
                    </div>

                    <div className="space-y-4">
                      {['Diurno 1', 'Diurno 2']
                        .filter(sh => getActiveShiftsForDay(activeDay).includes(sh))
                        .map(sh => (
                        <div key={sh} className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40 space-y-3">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{sh}</p>
                          
                          <div className="grid grid-cols-1 gap-3">
                            {getSlotsForShift(sh).map(slot => {
                              const allocated = getAllocatedEmployees('Fita', 'Wultec', sh, slot);
                              const isTarget = activeDragTarget?.sector === 'Fita' && activeDragTarget?.machine === 'Wultec' && activeDragTarget?.shift === sh && activeDragTarget?.timeSlot === slot;
                              return (
                                <div key={slot} className="space-y-1">
                                  <div className="flex justify-between items-center px-1">
                                    <span className="text-[9px] font-bold uppercase text-amber-500/90 tracking-wide flex items-center gap-1">
                                      {slot}
                                    </span>
                                    {canManage && (
                                      <button 
                                        onClick={() => setActiveAllocationSlot({ sector: 'Fita', machine: 'Wultec', shift: sh, timeSlot: slot })}
                                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 p-0.5 rounded transition-colors text-[9px] font-bold uppercase tracking-widest"
                                      >
                                        + Escalar
                                      </button>
                                    )}
                                  </div>

                                  <div 
                                    onDragOver={(e) => canManage && handleDragOver(e, 'Fita', 'Wultec', sh, slot)}
                                    onDragLeave={canManage ? handleDragLeave : undefined}
                                    onDrop={(e) => canManage && handleDrop(e, 'Fita', 'Wultec', sh, slot)}
                                    className={`space-y-1 min-h-[36px] rounded-xl p-2 border flex flex-col justify-center transition-all ${
                                      isTarget 
                                        ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.15)] scale-[1.01]' 
                                        : 'bg-slate-950/80 border-slate-900'
                                    }`}
                                  >
                                    {allocated.length === 0 ? (
                                      <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest text-center py-1">Sem escala</span>
                                    ) : (
                                      allocated.map(emp => (
                                        <div 
                                          key={emp.id} 
                                          draggable={canManage}
                                          onDragStart={(e) => handleDragStart(e, emp.id)}
                                          onDragEnd={handleDragEnd}
                                          className={`flex items-center justify-between bg-slate-900 px-2 py-1 rounded-lg border border-slate-800/50 transition-transform duration-200 select-none ${
                                            canManage ? 'cursor-grab active:cursor-grabbing hover:bg-slate-800/80 hover:border-slate-700/80' : ''
                                          }`}
                                        >
                                          <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-bold text-slate-100 truncate">{emp.name}</span>
                                          </div>
                                          {canManage && (
                                            <button 
                                              onClick={() => handleRemoveEmployeeFromSlot(emp.id, 'Fita', 'Wultec', sh, slot)}
                                              className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors"
                                            >
                                              <Trash2 size={10} />
                                            </button>
                                          )}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}
      </div>

      {/* MODAL EXPORTAR ESCALA (PDF) */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsExportModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-400 border border-rose-500/20">
                <FileDown size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-white">Salvar em PDF</h2>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Escolha a abrangência do relatório</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed">
              Selecione se deseja exportar apenas a escala do dia selecionado ou o planejamento completo de segunda a domingo.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleExportPDF('current')}
                className="w-full flex items-center justify-between px-5 py-4 bg-slate-950 border border-slate-800 hover:border-rose-500/30 hover:bg-rose-500/5 rounded-2xl text-[11px] font-black uppercase tracking-wider text-slate-100 transition-all active:scale-98 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-rose-400 group-hover:bg-rose-500/10 group-hover:border-rose-500/20 transition-all">
                    <CalendarDays size={14} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-[11px] tracking-wider">Apenas {activeDay}</p>
                    <p className="text-[9px] text-slate-500 font-bold tracking-normal normal-case">Exporta 1 página com a escala do dia ativo</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-slate-500 group-hover:text-rose-400 transition-colors" />
              </button>

              <button
                onClick={() => handleExportPDF('week')}
                className="w-full flex items-center justify-between px-5 py-4 bg-slate-950 border border-slate-800 hover:border-rose-500/30 hover:bg-rose-500/5 rounded-2xl text-[11px] font-black uppercase tracking-wider text-slate-100 transition-all active:scale-98 cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/10 group-hover:border-amber-500/20 transition-all">
                    <Sparkles size={14} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-[11px] tracking-wider">Semana Completa</p>
                    <p className="text-[9px] text-slate-500 font-bold tracking-normal normal-case">Exporta 7 páginas, uma para cada dia da semana</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-slate-500 group-hover:text-amber-400 transition-colors" />
              </button>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex justify-end">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80 hover:border-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COPIAR ESCALA (Dia da Semana) */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl p-6 relative">
            <button 
              onClick={() => setIsCopyModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <Copy size={22} className="text-amber-400" />
              <h2 className="text-lg font-black uppercase tracking-tight text-white">Copiar Escala</h2>
            </div>
            
            <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed">
              Você está copiando a escala de almoço de <strong className="text-amber-400">{activeDay}</strong>. Escolha para qual dia da semana deseja replicar, ou replique para a semana inteira.
            </p>

            <div className="space-y-2 mb-6">
              {DAYS_OF_WEEK.filter(d => d !== activeDay).map(day => (
                <button
                  key={day}
                  onClick={() => handleCopyScheduleToDay(day)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-950 border border-slate-800/80 rounded-xl text-[11px] font-bold uppercase tracking-wider text-slate-300 hover:bg-slate-800 hover:text-white transition-all active:scale-98"
                >
                  <span>Copiar para {day}</span>
                  <ChevronRight size={14} className="text-slate-500" />
                </button>
              ))}
            </div>

            <div className="border-t border-slate-800/80 pt-4">
              <button
                onClick={handleCopyScheduleToAllDays}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-200 active:scale-98 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
              >
                <Sparkles size={16} />
                Replicar para Toda a Semana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL / POPOVER DE ADICIONAR COLABORADOR AO SLOT */}
      {activeAllocationSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400 border border-amber-500/20">
                  <Utensils size={18} />
                </div>
                <div>
                  <h3 className="text-md font-black uppercase tracking-tight text-white">Escalar para Almoço</h3>
                  <p className="text-[9px] text-amber-500 font-bold uppercase tracking-widest">
                    {activeAllocationSlot.sector} • {activeAllocationSlot.machine} • {activeAllocationSlot.shift} • {activeAllocationSlot.timeSlot}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setActiveAllocationSlot(null); setSearchTerm(''); }}
                className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Barra de Pesquisa */}
            <div className="p-4 bg-slate-950/50 border-b border-slate-800/60 flex items-center gap-3">
              <Search size={18} className="text-slate-500 shrink-0" />
              <input 
                type="text"
                placeholder="Pesquisar colaborador por nome, cargo ou matrícula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-none text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-0 text-xs py-1"
                autoFocus
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-slate-500 hover:text-slate-300">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Lista de Colaboradores */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 max-h-[50vh] scrollbar-thin">
              
              {/* Sugeridos (Mesmo posto) */}
              {!searchTerm && recommendedSelectionEmployees.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1 flex items-center gap-1.5">
                    <CheckCircle2 size={10} className="text-emerald-500" />
                    Alocados neste Posto ({recommendedSelectionEmployees.length})
                  </h4>
                  <div className="grid grid-cols-1 gap-1.5">
                    {recommendedSelectionEmployees.map(emp => {
                      const alreadyAllocated = getEmployeeAllocationOnActiveDay(emp.id);
                      const isCurrentlyThisSlot = alreadyAllocated && alreadyAllocated.timeSlot === activeAllocationSlot.timeSlot && alreadyAllocated.machine === activeAllocationSlot.machine;
                      return (
                        <button
                          key={emp.id}
                          onClick={() => {
                            handleAddEmployeeToSlot(emp.id, activeAllocationSlot.sector, activeAllocationSlot.machine, activeAllocationSlot.shift, activeAllocationSlot.timeSlot);
                            setActiveAllocationSlot(null);
                            setSearchTerm('');
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                            isCurrentlyThisSlot 
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' 
                              : 'bg-slate-950 border-slate-800/80 hover:bg-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-slate-100">{emp.name}</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase">{emp.role}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {alreadyAllocated ? (
                              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                isCurrentlyThisSlot ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {alreadyAllocated.timeSlot} ({alreadyAllocated.machine})
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 px-2.5 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                Escalar
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Outros Colaboradores */}
              <div className="space-y-2">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500 px-1">
                  {!searchTerm ? 'Outros Colaboradores Ativos' : `Resultados da Pesquisa (${filterBySearch(activeEmployees).length})`}
                </h4>
                <div className="grid grid-cols-1 gap-1.5">
                  {filterBySearch(!searchTerm ? otherSelectionEmployees : activeEmployees).map(emp => {
                    const alreadyAllocated = getEmployeeAllocationOnActiveDay(emp.id);
                    const isCurrentlyThisSlot = alreadyAllocated && alreadyAllocated.timeSlot === activeAllocationSlot.timeSlot && alreadyAllocated.machine === activeAllocationSlot.machine;
                    return (
                      <button
                        key={emp.id}
                        onClick={() => {
                          handleAddEmployeeToSlot(emp.id, activeAllocationSlot.sector, activeAllocationSlot.machine, activeAllocationSlot.shift, activeAllocationSlot.timeSlot);
                          setActiveAllocationSlot(null);
                          setSearchTerm('');
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                          isCurrentlyThisSlot 
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' 
                            : 'bg-slate-950 border-slate-800/80 hover:bg-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-slate-100">{emp.name}</span>
                          <span className="text-[9px] font-bold text-slate-500 uppercase">
                            {emp.role} • {emp.sector} ({emp.machine}) • {emp.shift}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {alreadyAllocated ? (
                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full">
                              Já em {alreadyAllocated.timeSlot}
                            </span>
                          ) : (
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2 py-1 hover:bg-slate-700 rounded-lg">
                              + Escolher
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {filterBySearch(!searchTerm ? otherSelectionEmployees : activeEmployees).length === 0 && (
                    <div className="py-8 flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-800 rounded-2xl">
                      <AlertCircle size={20} className="mb-2 text-slate-700" />
                      <p className="text-[9px] font-bold uppercase tracking-widest">Nenhum colaborador encontrado</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Rodapé Informativo */}
      <div className="max-w-7xl mx-auto w-full mt-12 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <Info size={14} className="text-amber-500" />
          <span>As alocações são atualizadas em tempo real para toda a fábrica.</span>
        </div>
        <div>
          <span>Manupackaging • Controle de Escalas</span>
        </div>
      </div>

    </div>
  );
}
