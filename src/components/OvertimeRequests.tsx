import React, { useState, useMemo, useEffect } from 'react';
import { 
  Clock, Calendar, User, Users, UserCheck, FileText, CheckCircle2, AlertCircle, 
  Plus, Trash2, Edit2, Search, Filter, ArrowLeft, Loader2, 
  Printer, Check, X, Building2, Briefcase, ChevronRight,
  Download, Eye, AlertTriangle, ShieldCheck, History, Info, HelpCircle,
  Share2, Mail, MessageCircle, Copy, ExternalLink
} from 'lucide-react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../lib/firebase';
import { Employee, OvertimeRequest, SystemUser } from '../types';
import ConfirmDialog from './ConfirmDialog';
import {
  COMMERCIAL_DURATION_MINUTES,
  COMMERCIAL_FLEXIBLE_DURATION_MINUTES,
  SHIFT_RULES,
  getCanonicalShiftCategory,
  calculateCommercialFlexibleEnd,
  calculateOvertimeHoursDetailed,
  formatOvertimeDisplay,
  PAYROLL_CUTOFF_DAY,
  getPayrollCycleFromDate,
  getCurrentPayrollCycle,
  getCurrentPayrollCycleKey,
  getPayrollCycleByKey,
  isDateInPayrollCycle,
  formatPayrollMonthLabel,
  PayrollCycle
} from '../utils/shiftUtils';

interface OvertimeRequestsProps {
  employees: Employee[];
  loggedUser: SystemUser | null;
  onClose: () => void;
  canManage: boolean;
  isReadOnly?: boolean;
  onBlockedAction?: (title?: string, message?: string) => void;
  setPdfModal?: (modal: any) => void;
}

// Categorias oficiais da Etapa 1 do DOC 076
const DOC076_REASON_CATEGORIES = [
  'Atendimento de demanda de produção',
  'Manutenção corretiva ou intervenção emergencial',
  'Carregamento ou expedição',
  'Inventário',
  'Atrasos ou ocorrências operacionais',
  'Necessidade de continuidade de processo',
  'Outras situações devidamente justificadas'
];

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

export const OvertimeRequests: React.FC<OvertimeRequestsProps> = ({
  employees,
  loggedUser,
  onClose,
  canManage,
  isReadOnly = false,
  onBlockedAction,
  setPdfModal
}) => {
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Modais e visualizações
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isDocInfoModalOpen, setIsDocInfoModalOpen] = useState<boolean>(false);
  const [editingRequest, setEditingRequest] = useState<OvertimeRequest | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterSector, setFilterSector] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  // Filtro de mês baseado no fechamento da folha no dia 24 (inicia automaticamente no ciclo vigente)
  const [filterMonth, setFilterMonth] = useState<string>(() => getCurrentPayrollCycleKey());

  // Campos do Formulário
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [employeeSearch, setEmployeeSearch] = useState<string>('');
  const [employeeName, setEmployeeName] = useState<string>('');
  const [registration, setRegistration] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [sector, setSector] = useState<string>('Extrusão');
  const [machine, setMachine] = useState<string>('');
  const [shift, setShift] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState<string>('07:30');
  const [endTime, setEndTime] = useState<string>('19:18');
  const [estimatedHours, setEstimatedHours] = useState<number>(2);
  const [overtimeMinutes, setOvertimeMinutes] = useState<number>(120);
  const [displayOvertimeValue, setDisplayOvertimeValue] = useState<string>('2,00');
  const [overtimeUnit, setOvertimeUnit] = useState<'minutos' | 'horas'>('horas');
  const [autoCalculateHours, setAutoCalculateHours] = useState<boolean>(true);

  // Modalidade de Horas Extras e Regras de Turno (Comercial, Diurno e Noturno)
  const [overtimeMode, setOvertimeMode] = useState<'integral' | 'pos_turno'>('pos_turno');
  const [shiftTypeChoice, setShiftTypeChoice] = useState<'Comercial' | 'Diurno' | 'Noturno'>('Comercial');
  const [isCommercialFlexible, setIsCommercialFlexible] = useState<boolean>(false);
  const [customFlexibleStart, setCustomFlexibleStart] = useState<string>('07:30');
  const [calculatedNormalEnd, setCalculatedNormalEnd] = useState<string>('17:18');
  const [overtimeExplanation, setOvertimeExplanation] = useState<string>('');
  const [reasonCategory, setReasonCategory] = useState<string>(DOC076_REASON_CATEGORIES[0]);
  const [reasonDetails, setReasonDetails] = useState<string>('');
  const [requesterName, setRequesterName] = useState<string>(() => loggedUser?.name || 'Líder de Produção');
  const [managerName, setManagerName] = useState<string>('Edimar Silva');
  const [approvalStatus, setApprovalStatus] = useState<'Pendente' | 'Aprovado' | 'Reprovado'>('Aprovado');
  const [isEmergency, setIsEmergency] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Estado para menu de compartilhamento (WhatsApp / Outlook)
  const [openShareMenuId, setOpenShareMenuId] = useState<string | null>(null);
  const [shareToastMessage, setShareToastMessage] = useState<string | null>(null);

  // Fecha o menu de compartilhamento ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.share-menu-container')) {
        setOpenShareMenuId(null);
      }
    };
    if (openShareMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openShareMenuId]);

  // Auto-dispensa do toast de compartilhamento após 4 segundos
  useEffect(() => {
    if (shareToastMessage) {
      const timer = setTimeout(() => setShareToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [shareToastMessage]);

  // Sincronização em tempo real com o Firestore
  useEffect(() => {
    setIsLoading(true);
    const unsub = onSnapshot(
      collection(db, 'overtime_requests'),
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        })) as OvertimeRequest[];

        // Ordenar por data (decrescente) e criação
        list.sort((a, b) => {
          const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
          if (dateDiff !== 0) return dateDiff;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });

        setRequests(list);
        setIsLoading(false);
      },
      (err) => {
        console.error('Erro ao escutar overtime_requests:', err);
        setIsLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Ciclos da Folha de Ponto disponíveis (com fechamento no dia 24)
  const availablePayrollCycles = useMemo(() => {
    const keysSet = new Set<string>();

    // Sempre garante o ciclo atual vigente e o ciclo anterior no seletor
    const currentCycle = getCurrentPayrollCycle();
    keysSet.add(currentCycle.key);

    const prevDate = new Date();
    prevDate.setDate(prevDate.getDate() - 32);
    const prevCycle = getPayrollCycleFromDate(prevDate);
    keysSet.add(prevCycle.key);

    // Adiciona ciclos de todas as solicitações registradas no banco
    requests.forEach((r) => {
      if (r.date) {
        const c = getPayrollCycleFromDate(r.date);
        keysSet.add(c.key);
      }
    });

    const sortedKeys = Array.from(keysSet).sort().reverse();
    return sortedKeys.map((key) => getPayrollCycleByKey(key));
  }, [requests]);

  // Formatação amigável do ciclo de folha (ex: 2026-09 -> Folha Setembro / 2026 (25/08 a 24/09))
  const formatMonthLabel = (mStr: string) => {
    return formatPayrollMonthLabel(mStr);
  };

  // Ciclo da folha ativo selecionado no filtro
  const activePayrollCycle = useMemo(() => {
    return getPayrollCycleByKey(filterMonth);
  }, [filterMonth]);

  // Estatísticas de horas extras do colaborador selecionado no formulário para a Folha de Ponto (fechamento dia 24)
  const collaboratorFormCycleStats = useMemo(() => {
    if (!employeeName.trim()) return null;
    const currentCycle = getCurrentPayrollCycle();
    const normalize = (str: string | undefined | null) =>
      (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const targetName = normalize(employeeName);
    const targetReg = normalize(registration);

    const matchedRequests = requests.filter((r) => {
      const rName = normalize(r.employeeName);
      const rReg = normalize(r.registration);
      const matches = rName === targetName || (targetReg && rReg === targetReg) || (selectedEmployeeId && r.employeeId === selectedEmployeeId);
      if (!matches) return false;
      return isDateInPayrollCycle(r.date, currentCycle.key);
    });

    const totalHours = matchedRequests.reduce((acc, r) => acc + (Number(r.estimatedHours) || 0), 0);
    return {
      cycle: currentCycle,
      totalHours: Number(totalHours.toFixed(2)),
      count: matchedRequests.length
    };
  }, [employeeName, registration, selectedEmployeeId, requests]);

  // Ciclo da folha correspondente à data informada no formulário de solicitação
  const formDatePayrollCycle = useMemo(() => {
    return getPayrollCycleFromDate(date || new Date().toISOString().split('T')[0]);
  }, [date]);

  // Cálculo automático de horas estimadas baseado no Turno (Comercial, Diurno, Noturno) e Modalidade
  useEffect(() => {
    if (!autoCalculateHours || !startTime || !endTime) return;

    try {
      const result = calculateOvertimeHoursDetailed({
        mode: overtimeMode,
        shiftCategory: shiftTypeChoice,
        isCommercialFlexible: shiftTypeChoice === 'Comercial' && isCommercialFlexible,
        actualStartTime: startTime,
        actualEndTime: endTime,
        customNormalStartTime: isCommercialFlexible ? (customFlexibleStart || startTime) : undefined
      });

      setEstimatedHours(result.estimatedHours);
      setOvertimeMinutes(result.overtimeMinutes);
      setDisplayOvertimeValue(result.displayValue);
      setOvertimeUnit(result.unit);
      setCalculatedNormalEnd(result.normalEndTime);
      setOvertimeExplanation(result.explanation);
    } catch {
      // mantém valor anterior em caso de dado inconsistente temporário
    }
  }, [
    startTime,
    endTime,
    autoCalculateHours,
    overtimeMode,
    shiftTypeChoice,
    isCommercialFlexible,
    customFlexibleStart
  ]);

  // Colaboradores alocados na Aba Pessoal / Aba Alocação do sistema
  // Restringe apenas aos colaboradores reais dos setores da Aba Pessoal:
  // Setor de Extrusão, Setor de Reciclagem, Setor de Fita Adesiva e Liderança
  // Exclui completamente "Vaga Excluída", "Em Contratação", "Desligado", "Silenciado", slots vazios e placeholders
  const personnelEmployees = useMemo(() => {
    const normalize = (str: string | undefined | null) =>
      (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    const validSectors = ['extrusao', 'reciclagem', 'fita', 'lideranca'];
    const validStatuses = ['ativo', 'ferias', 'atestado'];

    // Mapeamento para deduplicação mantendo o registro mais completo
    const employeeMap = new Map<string, Employee>();

    employees.forEach((emp) => {
      if (!emp.name || !emp.name.trim()) return;

      const nameNorm = normalize(emp.name);
      const statusNorm = normalize(emp.status);
      const sectorNorm = normalize(emp.sector);

      // 1. Filtrar termos que representam vagas, exclusões ou desligamentos
      if (
        nameNorm.includes('excluid') ||
        statusNorm.includes('excluid') ||
        nameNorm.includes('contratacao') ||
        statusNorm.includes('contratacao') ||
        nameNorm.includes('desligad') ||
        statusNorm.includes('desligad') ||
        nameNorm.includes('silenciad') ||
        statusNorm.includes('silenciad') ||
        emp.isSilenced
      ) {
        return;
      }

      // 2. Não permitir nomes genéricos como "Vaga", "Novo Slot", "Vaga Aberta"
      if (
        nameNorm.startsWith('vaga') ||
        nameNorm === 'novo slot' ||
        nameNorm === 'slot' ||
        nameNorm === 'aberta' ||
        nameNorm.length < 3
      ) {
        return;
      }

      // 3. Deve pertencer estritamente aos setores definidos na Aba Pessoal / Alocação
      // (Extrusão, Reciclagem, Fita / Fita Adesiva, Liderança)
      const isAllowedSector = validSectors.some((vs) => sectorNorm.includes(vs));
      if (!isAllowedSector) {
        return;
      }

      // 4. Validar status empregado (Ativo, Férias, Atestado)
      if (statusNorm && !validStatuses.includes(statusNorm)) {
        return;
      }

      // 5. Deduplicação por nome normalizado ou matrícula
      const key = emp.registration?.trim() ? `reg_${normalize(emp.registration)}` : `name_${nameNorm}`;
      const existing = employeeMap.get(key);

      if (!existing) {
        employeeMap.set(key, emp);
      } else {
        // Priorizar registro com matrícula ou mais dados preenchidos
        const score = (e: Employee) =>
          (e.registration ? 2 : 0) + (e.machine ? 1 : 0) + (e.shift ? 1 : 0);
        if (score(emp) > score(existing)) {
          employeeMap.set(key, emp);
        }
      }
    });

    const list = Array.from(employeeMap.values());

    // Ordenação por setor (Extrusão, Reciclagem, Fita, Liderança) e depois alfabética por nome
    const getSectorOrder = (sec: string) => {
      const s = normalize(sec);
      if (s.includes('extrusao')) return 1;
      if (s.includes('reciclagem')) return 2;
      if (s.includes('fita')) return 3;
      if (s.includes('lideranca')) return 4;
      return 5;
    };

    return list.sort((a, b) => {
      const ordA = getSectorOrder(a.sector);
      const ordB = getSectorOrder(b.sector);
      if (ordA !== ordB) return ordA - ordB;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [employees]);

  // Colaboradores da Aba Pessoal filtrados pelo campo de busca rápida
  const filteredPersonnelEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return personnelEmployees;
    const normalize = (str: string | undefined | null) =>
      (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const term = normalize(employeeSearch);
    return personnelEmployees.filter((e) => {
      const n = normalize(e.name);
      const r = normalize(e.registration);
      const s = normalize(e.sector);
      const c = normalize(e.role);
      const m = normalize(e.machine);
      return n.includes(term) || r.includes(term) || s.includes(term) || c.includes(term) || m.includes(term);
    });
  }, [personnelEmployees, employeeSearch]);

  // Lista de liderança para seleção de Solicitante e Gestor Responsável (DOC 076)
  // Inclui colaboradores da aba Liderança (Gerência, Supervisão, Líder) e garante Adahias, Edmar e Erivan
  const leadershipOptions = useMemo(() => {
    const list: Array<{ name: string; role: string }> = [];
    const namesSeen = new Set<string>();

    const normalize = (str: string | undefined | null) =>
      (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    // 1. Coletar colaboradores do setor Liderança ou cargos de liderança
    employees.forEach((emp) => {
      const s = normalize(emp.sector);
      const r = normalize(emp.role);
      const isLeadershipSector = s === 'lideranca';
      const isLeadershipRole = r.includes('gerente') || r.includes('supervisor') || r.includes('lider');

      if ((isLeadershipSector || isLeadershipRole) && emp.name?.trim()) {
        const cleanName = emp.name.trim();
        const norm = normalize(cleanName);
        if (!namesSeen.has(norm)) {
          namesSeen.add(norm);
          list.push({
            name: cleanName,
            role: emp.role || (isLeadershipSector ? 'Liderança' : 'Líder')
          });
        }
      }
    });

    // 2. Garantir presença explícita dos três líderes solicitados: Adahias, Edmar e Erivan
    const requiredLeaders = [
      { key: 'adahias', alt: 'adaias', defaultName: 'Adahias Alencar Melo', defaultRole: 'Supervisor de Produção' },
      { key: 'edmar', alt: 'edimar', defaultName: 'Edimar Silva', defaultRole: 'Gerente Industrial' },
      { key: 'erivan', alt: 'erivan', defaultName: 'Erivan Fontes de Souza', defaultRole: 'Líder de Produção' }
    ];

    requiredLeaders.forEach((item) => {
      const alreadyIn = list.find((l) => {
        const n = normalize(l.name);
        return n.includes(item.key) || n.includes(item.alt);
      });

      if (!alreadyIn) {
        // Tentar encontrar nome completo nos colaboradores cadastrados
        const fromAll = employees.find((e) => {
          const n = normalize(e.name);
          return n.includes(item.key) || n.includes(item.alt);
        });

        if (fromAll && fromAll.name?.trim()) {
          const cName = fromAll.name.trim();
          list.push({
            name: cName,
            role: fromAll.role || item.defaultRole
          });
          namesSeen.add(normalize(cName));
        } else {
          list.push({
            name: item.defaultName,
            role: item.defaultRole
          });
          namesSeen.add(normalize(item.defaultName));
        }
      }
    });

    // Ordenar: Gerentes primeiro, depois Supervisores, depois Líderes e alfabético
    return list.sort((a, b) => {
      const getPriority = (role: string) => {
        const r = normalize(role);
        if (r.includes('gerente')) return 1;
        if (r.includes('supervisor')) return 2;
        if (r.includes('lider')) return 3;
        return 4;
      };
      const pA = getPriority(a.role);
      const pB = getPriority(b.role);
      if (pA !== pB) return pA - pB;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [employees]);

  // Ao selecionar colaborador no dropdown, autopreencher informações com base nas regras de turno
  const handleSelectEmployee = (empId: string) => {
    setSelectedEmployeeId(empId);
    if (!empId) return;
    const emp = personnelEmployees.find((e) => e.id === empId) || employees.find((e) => e.id === empId);
    if (emp) {
      setEmployeeName(emp.name);
      setRegistration(emp.registration || '');
      setRole(emp.role || '');

      const secNorm = (emp.sector || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const isLeadership = secNorm.includes('lideran') || secNorm.includes('gestao') || (emp.role || '').toLowerCase().includes('coordenad') || (emp.role || '').toLowerCase().includes('gerente') || (emp.role || '').toLowerCase().includes('supervisor');

      if (secNorm.includes('extrusao')) {
        setSector('Extrusão');
      } else if (secNorm.includes('reciclagem')) {
        setSector('Reciclagem');
      } else if (secNorm.includes('fita')) {
        setSector('Corte de Fita');
      } else if (isLeadership) {
        setSector('Liderança');
      } else if (emp.sector) {
        const matchedSector = SECTORS_LIST.find(
          (s) => s.toLowerCase() === emp.sector.toLowerCase()
        );
        setSector(matchedSector || emp.sector);
      }

      // Regra de Turno Canônico do Colaborador
      let detectedCategory: 'Comercial' | 'Diurno' | 'Noturno' = 'Comercial';
      let isFlex = false;

      if (isLeadership) {
        // Toda liderança tem que estar no turno comercial
        detectedCategory = 'Comercial';
        isFlex = (emp.shift || '').toLowerCase().includes('flex');
        setShift(isFlex ? 'Comercial Flexível' : 'Comercial');
      } else {
        detectedCategory = getCanonicalShiftCategory(emp.shift, emp.sector);
        isFlex = (emp.shift || '').toLowerCase().includes('flex');
        setShift(emp.shift || (detectedCategory === 'Comercial' ? (isFlex ? 'Comercial Flexível' : 'Comercial') : detectedCategory));
      }

      setShiftTypeChoice(detectedCategory);
      setIsCommercialFlexible(isFlex);

      // Atualiza horários de acordo com o modo de hora extra atual
      if (overtimeMode === 'pos_turno') {
        if (detectedCategory === 'Comercial') {
          const start = isFlex ? '07:30' : '07:30';
          setCustomFlexibleStart(start);
          setStartTime(start);
          setEndTime('19:18'); // 2h extras após o término regular 17:18
        } else if (detectedCategory === 'Noturno') {
          setStartTime('18:00');
          setEndTime('08:00'); // 2h extras após o término regular 06:00
        } else {
          // Diurno
          setStartTime('06:00');
          setEndTime('20:00'); // 2h extras após o término regular 18:00
        }
      } else {
        // Modo 'integral'
        if (detectedCategory === 'Comercial') {
          setStartTime('07:30');
          setEndTime('17:18');
        } else if (detectedCategory === 'Noturno') {
          setStartTime('18:00');
          setEndTime('06:00');
        } else {
          setStartTime('06:00');
          setEndTime('18:00');
        }
      }

      const macParts: string[] = [];
      if (emp.machine && emp.machine !== 'Geral') macParts.push(emp.machine);
      if (emp.shift) macParts.push(emp.shift);
      setMachine(macParts.join(' • ') || emp.machine || '');
    }
  };

  // Alterna o modo de hora extra: Extensão de Jornada (Passando do Horário) vs Turno Extra Integral
  const handleToggleOvertimeMode = (mode: 'integral' | 'pos_turno') => {
    setOvertimeMode(mode);
    setAutoCalculateHours(true);
    if (mode === 'integral') {
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
      // pos_turno: colaborador cumpre a jornada normal e estende além
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

  // Seleciona ou altera o perfil de turno da solicitação
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
          // Em Comercial Flexível, a jornada regular é de 10h (8h de trabalho + almoço incluso). Ex: 06:00 às 16:00.
          // Inicializa a saída sugerida com 45 minutos de hora extra (16:45 para 06:00)
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

  // Abrir modal de criação zerado
  const handleOpenCreateForm = () => {
    if (isReadOnly) {
      if (onBlockedAction) onBlockedAction('Ação Bloqueada', 'O lançamento de solicitações de horas extras não é permitido no Modo de Leitura.');
      return;
    }
    setEditingRequest(null);
    setSelectedEmployeeId('');
    setEmployeeSearch('');
    setEmployeeName('');
    setRegistration('');
    setRole('');
    setSector('Extrusão');
    setMachine('');
    setShift('Comercial');
    setOvertimeMode('pos_turno');
    setShiftTypeChoice('Comercial');
    setIsCommercialFlexible(false);
    setCustomFlexibleStart('07:30');
    setDate(new Date().toISOString().split('T')[0]);
    setStartTime('07:30');
    setEndTime('19:18');
    setEstimatedHours(2);
    setOvertimeMinutes(120);
    setDisplayOvertimeValue('2,00');
    setOvertimeUnit('horas');
    setAutoCalculateHours(true);
    setReasonCategory(DOC076_REASON_CATEGORIES[0]);
    setReasonDetails('');
    const defaultRequester = leadershipOptions.find((l) => {
      const n = l.name.toLowerCase();
      return n.includes('adahias') || n.includes('adaias') || n.includes('erivan');
    })?.name || leadershipOptions[0]?.name || 'Adahias Alencar Melo';

    const defaultManager = leadershipOptions.find((l) => {
      const n = l.name.toLowerCase();
      return n.includes('edimar') || n.includes('edmar');
    })?.name || 'Edimar Silva';

    setRequesterName(defaultRequester);
    setManagerName(defaultManager);
    setApprovalStatus('Aprovado');
    setIsEmergency(false);
    setNotes('');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Abrir modal de edição com os dados preenchidos
  const handleOpenEditForm = (req: OvertimeRequest) => {
    if (isReadOnly) {
      if (onBlockedAction) onBlockedAction('Ação Bloqueada', 'A alteração de solicitações de horas extras não é permitida no Modo de Leitura.');
      return;
    }
    setEditingRequest(req);
    setSelectedEmployeeId(req.employeeId || '');
    setEmployeeSearch('');
    setEmployeeName(req.employeeName);
    setRegistration(req.registration || '');
    setRole(req.role || '');
    setSector(req.sector || 'Extrusão');
    setMachine(req.machine || '');
    setShift(req.shift || '');

    // Recupera turno e modalidade
    setOvertimeMode(req.overtimeMode || 'pos_turno');
    const detectedCategory = getCanonicalShiftCategory(req.shift, req.sector);
    setShiftTypeChoice(detectedCategory);
    const isFlex = (req.shift || '').toLowerCase().includes('flex') || req.commercialShiftType === 'flexivel';
    setIsCommercialFlexible(isFlex);
    if (req.normalShiftStartTime) {
      setCustomFlexibleStart(req.normalShiftStartTime);
    }

    setDate(req.date);
    setStartTime(req.startTime);
    setEndTime(req.endTime);
    setEstimatedHours(req.estimatedHours);

    const mins = req.overtimeMinutes !== undefined
      ? req.overtimeMinutes
      : Math.round((Number(req.estimatedHours) || 0) * 60);
    setOvertimeMinutes(mins);
    if (mins > 0 && mins < 60) {
      setOvertimeUnit('minutos');
      setDisplayOvertimeValue(`0,${String(mins).padStart(2, '0')}`);
    } else {
      setOvertimeUnit('horas');
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      setDisplayOvertimeValue(mins === 0 ? '0,00' : `${h},${String(m).padStart(2, '0')}`);
    }

    setAutoCalculateHours(false);
    setReasonCategory(req.reasonCategory || DOC076_REASON_CATEGORIES[0]);
    setReasonDetails(req.reasonDetails || '');
    setRequesterName(req.requesterName || leadershipOptions[0]?.name || 'Adahias Alencar Melo');
    setManagerName(req.managerName || 'Edimar Silva');
    setApprovalStatus(req.approvalStatus || 'Aprovado');
    setIsEmergency(!!req.isEmergency);
    setNotes(req.notes || '');
    setFormError(null);
    setIsFormOpen(true);
  };

  // Gerador de PDF oficial DOC 076 para uma solicitação específica
  const generateDoc076PDF = (req: OvertimeRequest) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 12;
    const contentWidth = pageWidth - margin * 2; // 186mm

    // ==========================================
    // 1. CABEÇALHO PADRÃO DOC 076 (Total = 186mm)
    // ==========================================
    const headerY = 10;
    const headerH = 18;
    doc.setLineWidth(0.4);
    doc.setDrawColor(30, 41, 59); // slate-800

    // Caixa Esquerda (Logo Manu Packaging)
    const logoW = 46;
    doc.rect(margin, headerY, logoW, headerH);
    // Ilustração vetorial do símbolo Manu Packaging (três barras azuis/teal)
    doc.setFillColor(14, 116, 144); // cyan-700
    doc.rect(margin + 3, headerY + 3, 2.8, 12, 'F');
    doc.setFillColor(6, 182, 212); // cyan-500
    doc.rect(margin + 7, headerY + 5, 2.8, 10, 'F');
    doc.setFillColor(34, 211, 238); // cyan-400
    doc.rect(margin + 11, headerY + 7, 2.8, 8, 'F');

    // Textos do logo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('manu', margin + 16, headerY + 6.5);
    doc.setFontSize(10.5);
    doc.setTextColor(14, 116, 144);
    doc.text('packaging', margin + 16, headerY + 11);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('FITASA & AMAZÔNIA', margin + 16, headerY + 15);

    // Caixa Central (Título do Procedimento)
    const rightW = 34;
    const centerW = contentWidth - logoW - rightW; // 186 - 46 - 34 = 106mm
    doc.rect(margin + logoW, headerY, centerW, headerH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('PROCEDIMENTO DE SOLICITAÇÃO,', margin + logoW + centerW / 2, headerY + 5.5, { align: 'center' });
    doc.text('APROVAÇÃO E COMUNICAÇÃO DE HORAS EXTRAS', margin + logoW + centerW / 2, headerY + 9.5, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text('SOLICITAÇÃO DE HORA EXTRA (ETAPA 2)', margin + logoW + centerW / 2, headerY + 14.5, { align: 'center' });

    // Caixa Direita (Código DOC 076)
    doc.rect(margin + logoW + centerW, headerY, rightW, headerH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(15, 23, 42);
    doc.text('DOC 076', margin + logoW + centerW + rightW / 2, headerY + 11, { align: 'center' });

    // ==========================================
    // 2. FAIXA DE IDENTIFICAÇÃO E STATUS
    // ==========================================
    let curY = headerY + headerH + 3; // 10 + 18 + 3 = 31

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, curY, contentWidth, 7.5, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    const dateFormatted = req.date.split('-').reverse().join('/');
    doc.text(`SOLICITAÇÃO REF.: ${dateFormatted}`, margin + 3.5, curY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`ID Registro: ${req.id.substring(0, 14)}`, margin + 62, curY + 5);

    // Status Badge
    const statusText = (req.approvalStatus || 'Aprovado').toUpperCase();
    let badgeBg: [number, number, number] = [220, 252, 231]; // verde
    let badgeBorder: [number, number, number] = [134, 239, 172];
    let badgeText: [number, number, number] = [22, 101, 52];

    if (statusText === 'PENDENTE') {
      badgeBg = [254, 243, 199];
      badgeBorder = [252, 211, 77];
      badgeText = [146, 64, 14];
    } else if (statusText === 'REPROVADO') {
      badgeBg = [254, 226, 226];
      badgeBorder = [252, 165, 165];
      badgeText = [153, 27, 27];
    }

    doc.setFillColor(...badgeBg);
    doc.setDrawColor(...badgeBorder);
    doc.roundedRect(margin + contentWidth - 42, curY + 1.2, 39, 5.2, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...badgeText);
    doc.text(`STATUS: ${statusText}`, margin + contentWidth - 22.5, curY + 4.8, { align: 'center' });

    curY += 10.5;

    // ==========================================
    // 3. QUADRO 1: IDENTIFICAÇÃO DO COLABORADOR
    // ==========================================
    const table1Body: any[] = [
      [
        { content: 'Nome Completo:', styles: { fontStyle: 'bold', cellWidth: 44, fillColor: [248, 250, 252] } },
        { content: req.employeeName || 'NÃO INFORMADO', styles: { fontStyle: 'bold', textColor: [15, 23, 42] } }
      ],
      [
        { content: 'Matrícula:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: req.registration || 'S/M', styles: {} }
      ],
      [
        { content: 'Função / Cargo:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: req.role || 'Operador de Produção', styles: {} }
      ],
      [
        { content: 'Setor de Atuação:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: (req.sector || 'Extrusão').toUpperCase(), styles: { fontStyle: 'bold', textColor: [3, 105, 161] } }
      ],
      [
        { content: 'Máquina e Turno:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: `${req.machine || 'Geral'}${req.shift && !req.machine?.toLowerCase().includes(req.shift.toLowerCase()) ? `  •  Turno: ${req.shift}` : ''}`, styles: {} }
      ]
    ];

    autoTable(doc, {
      startY: curY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      head: [['1. IDENTIFICAÇÃO DO COLABORADOR (PRODUÇÃO / OPERAÇÃO)', '']],
      body: table1Body,
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 7.8,
        fontStyle: 'bold',
        cellPadding: 2
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 1.6,
        lineColor: [203, 213, 225],
        lineWidth: 0.2
      }
    });

    curY = (doc as any).lastAutoTable.finalY + 3;

    // ==========================================
    // 4. QUADRO 2: PROGRAMAÇÃO E PREVISÃO DA HORA EXTRA
    // ==========================================
    const hoursFormatted = req.overtimeMinutes !== undefined ? (
      req.overtimeMinutes < 60 ? (
        `0,${String(req.overtimeMinutes).padStart(2, '0')} min (${req.overtimeMinutes} minutos)`
      ) : (
        `${Math.floor(req.overtimeMinutes / 60)}h ${String(req.overtimeMinutes % 60).padStart(2, '0')}min (${Number(req.estimatedHours).toFixed(2)} horas)`
      )
    ) : (
      `${Number(req.estimatedHours).toFixed(2)}h (${Math.floor(req.estimatedHours)}h ${Math.round((req.estimatedHours % 1) * 60)}min)`
    );

    const table2Body: any[] = [
      [
        { content: 'Data Prevista:', styles: { fontStyle: 'bold', cellWidth: 44, fillColor: [248, 250, 252] } },
        { content: `${dateFormatted}`, styles: { fontStyle: 'bold' } }
      ],
      [
        { content: 'Horário Previsto:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: `Entrada: ${req.startTime}   |   Saída: ${req.endTime}`, styles: { fontStyle: 'bold' } }
      ],
      [
        { content: 'Quantidade Estimada de Horas:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: `${hoursFormatted}`, styles: { fontStyle: 'bold', textColor: [180, 83, 9] } }
      ],
      [
        { content: 'Situação Emergencial?', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: req.isEmergency ? 'SIM (Justificativa e autorização conforme Etapa 3)' : 'NÃO (Solicitação programada previamente)', styles: { textColor: req.isEmergency ? [185, 28, 28] : [71, 85, 105] } }
      ],
      [
        { content: 'Líder / Supervisor Solicitante:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: req.requesterName || 'Líder / Supervisor Solicitante', styles: { fontStyle: 'bold' } }
      ],
      [
        { content: 'Gestor Responsável pela Área:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: req.managerName || 'Edimar Silva', styles: { fontStyle: 'bold' } }
      ]
    ];

    autoTable(doc, {
      startY: curY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      head: [['2. PROGRAMAÇÃO E DADOS DA SOLICITAÇÃO (ETAPA 2)', '']],
      body: table2Body,
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 7.8,
        fontStyle: 'bold',
        cellPadding: 2
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 1.6,
        lineColor: [203, 213, 225],
        lineWidth: 0.2
      }
    });

    curY = (doc as any).lastAutoTable.finalY + 3;

    // ==========================================
    // 5. QUADRO 3: JUSTIFICATIVA OPERACIONAL E MOTIVO (ETAPAS 1 E 2)
    // ==========================================
    const table3Body: any[] = [
      [
        { content: 'Enquadramento da Necessidade:', styles: { fontStyle: 'bold', cellWidth: 44, fillColor: [248, 250, 252] } },
        { content: req.reasonCategory || 'Atendimento de demanda de produção', styles: { fontStyle: 'bold', textColor: [15, 23, 42] } }
      ],
      [
        { content: 'Descrição do Motivo / Justificativa:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], valign: 'top' } },
        { content: req.reasonDetails || 'Nenhum motivo detalhado informado.', styles: { cellPadding: 2.2, textColor: [30, 41, 59] } }
      ]
    ];

    if (req.notes) {
      table3Body.push([
        { content: 'Observações Complementares:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
        { content: req.notes, styles: { textColor: [71, 85, 105], cellPadding: 2 } }
      ]);
    }

    autoTable(doc, {
      startY: curY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      head: [['3. JUSTIFICATIVA OPERACIONAL E MOTIVO DA HORA EXTRA (ETAPAS 1 E 2)', '']],
      body: table3Body,
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 7.8,
        fontStyle: 'bold',
        cellPadding: 2
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        lineColor: [203, 213, 225],
        lineWidth: 0.2
      }
    });

    curY = (doc as any).lastAutoTable.finalY + 3;

    // ==========================================
    // 6. QUADRO 4: REGRAS NORMATIVAS CONFORME DOC 076
    // ==========================================
    const rulesBoxH = 16;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, curY, contentWidth, rulesBoxH, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    doc.text('DIRETRIZES DO PROCEDIMENTO DOC 076 (REGISTRO E COMUNICAÇÃO):', margin + 3, curY + 3.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text('• Etapa 4 - Realização: O colaborador deverá registrar corretamente o ponto eletrônico, correspondendo estritamente ao período trabalhado.', margin + 3, curY + 7.5);
    doc.text('• Etapa 5 - Comunicação ao RH: O responsável da área encaminha ao RH a relação das horas extras no prazo diário ou início do próximo dia útil.', margin + 3, curY + 11.2);
    doc.text('• Etapa 6 - Conferência pelo RH: O RH confrontará os dados com o espelho de ponto para fechamento da folha e controle gerencial.', margin + 3, curY + 14.8);

    curY += rulesBoxH + 3;

    // ==========================================
    // 7. QUADRO 5: FORMALIZAÇÃO E ASSINATURAS (POSICIONAMENTO SEGURO)
    // ==========================================
    const footerH = 10;
    const footerY = pageHeight - margin - footerH; // 297 - 12 - 10 = 275mm
    const signBoxH = 22;

    // Ancorar assinaturas imediatamente acima do rodapé com folga segura de 3.5mm
    let signBoxY = footerY - signBoxH - 3.5; // 275 - 22 - 3.5 = 249.5mm

    // Se o texto anterior foi excepcionalmente extenso, ajustar sem sobrepor
    if (curY > signBoxY) {
      signBoxY = curY + 2;
    }

    const gap = 3;
    const signBoxWidth = (contentWidth - gap * 2) / 3; // (186 - 6) / 3 = 60mm

    // Box 1: Colaborador
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, signBoxY, signBoxWidth, signBoxH);
    doc.line(margin + 4, signBoxY + 13, margin + signBoxWidth - 4, signBoxY + 13);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(req.employeeName, margin + signBoxWidth / 2, signBoxY + 16.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text('Assinatura do Colaborador', margin + signBoxWidth / 2, signBoxY + 19.8, { align: 'center' });

    // Box 2: Líder / Supervisor
    const box2X = margin + signBoxWidth + gap;
    doc.rect(box2X, signBoxY, signBoxWidth, signBoxH);
    doc.line(box2X + 4, signBoxY + 13, box2X + signBoxWidth - 4, signBoxY + 13);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(req.requesterName || 'Líder / Supervisor', box2X + signBoxWidth / 2, signBoxY + 16.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text('Líder / Supervisor Solicitante', box2X + signBoxWidth / 2, signBoxY + 19.8, { align: 'center' });

    // Box 3: Gestor da Área / Aprovação
    const box3X = margin + (signBoxWidth + gap) * 2;
    doc.rect(box3X, signBoxY, signBoxWidth, signBoxH);
    doc.line(box3X + 4, signBoxY + 13, box3X + signBoxWidth - 4, signBoxY + 13);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(req.managerName || 'Edimar Silva', box3X + signBoxWidth / 2, signBoxY + 16.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text('Gestor da Área (Autorização)', box3X + signBoxWidth / 2, signBoxY + 19.8, { align: 'center' });

    // ==========================================
    // 8. RODAPÉ OFICIAL PADRÃO DOC 076
    // ==========================================
    doc.setLineWidth(0.3);
    doc.setDrawColor(30, 41, 59);

    // Tabela do rodapé em 6 colunas proporcionais somando 186mm
    const colWidths = [22, 28, 28, 44, 40, 24]; // soma 186mm
    let curX = margin;

    const footerData = [
      { label: 'Revisão:', val: '000' },
      { label: 'Data emissão:', val: '21/08/2026' },
      { label: 'Data revisão:', val: '21/08/2026' },
      { label: 'Revisor:', val: 'Paloma Magalhães' },
      { label: 'Aprovador:', val: req.managerName || 'Edimar Silva' },
      { label: '', val: 'Página 1 de 1' }
    ];

    footerData.forEach((col, idx) => {
      const w = colWidths[idx];
      doc.rect(curX, footerY, w, footerH);

      if (col.label) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(100, 116, 139);
        doc.text(col.label, curX + 2, footerY + 3.6);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(15, 23, 42);
        doc.text(col.val, curX + 2, footerY + 7.8);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(15, 23, 42);
        doc.text(col.val, curX + w / 2, footerY + 5.8, { align: 'center' });
      }

      curX += w;
    });

    return doc;
  };

  // Gerador de Relatório / Comunicação para o RH (Etapa 5 do DOC 076)
  const generateRhReportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 12;

    // Header Landscape
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setFillColor(245, 158, 11); // Amber
    doc.rect(0, 28, pageWidth, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('MANUPACKAGING • RELAÇÃO DE HORAS EXTRAS PARA RH (DOC 076 - ETAPA 5)', margin, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    const nowStr = new Date().toLocaleString('pt-BR');
    const periodLabel = filterMonth === 'todos' ? 'Geral (Todos os Períodos)' : formatMonthLabel(filterMonth);
    doc.text(`Período de Referência: ${periodLabel} | Emitido em: ${nowStr} | Responsável: ${loggedUser?.name || 'Administrador'}`, margin, 20);

    const formatReasonJustification = (r: OvertimeRequest) => {
      const cat = (r.reasonCategory || '').trim();
      const det = (r.reasonDetails || '').trim();
      if (det && cat && det.toLowerCase() !== cat.toLowerCase()) {
        return `Motivo: ${cat}\nJustificativa: ${det}`;
      }
      if (det) {
        return `Justificativa: ${det}`;
      }
      return cat || '-';
    };

    const tableBody = filteredRequests.map((r, i) => [
      i + 1,
      r.date.split('-').reverse().join('/'),
      r.employeeName,
      r.registration || '-',
      r.sector || '-',
      `${r.startTime} às ${r.endTime}`,
      r.overtimeMinutes !== undefined ? (
        r.overtimeMinutes < 60 ? `0,${String(r.overtimeMinutes).padStart(2, '0')} min` : `${Math.floor(r.overtimeMinutes / 60)}h ${r.overtimeMinutes % 60 > 0 ? `${String(r.overtimeMinutes % 60).padStart(2, '0')}m` : ''}`
      ) : `${Number(r.estimatedHours).toFixed(2)}h`,
      formatReasonJustification(r),
      r.requesterName || '-',
      r.approvalStatus || 'Aprovado'
    ]);

    autoTable(doc, {
      startY: 35,
      margin: { left: margin, right: margin },
      theme: 'grid',
      head: [['#', 'DATA', 'COLABORADOR', 'MATRÍCULA', 'SETOR', 'HORÁRIO', 'TOTAL', 'MOTIVO / JUSTIFICATIVA', 'SOLICITANTE', 'STATUS']],
      body: tableBody,
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        cellPadding: 3
      },
      styles: {
        fontSize: 7.2,
        cellPadding: 2.2,
        lineColor: [226, 232, 240],
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 44, fontStyle: 'bold' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 22 },
        5: { cellWidth: 26, halign: 'center' },
        6: { cellWidth: 15, fontStyle: 'bold', halign: 'right', textColor: [180, 83, 9] },
        7: { cellWidth: 72 },
        8: { cellWidth: 26 },
        9: { cellWidth: 24, fontStyle: 'bold', halign: 'center' }
      }
    });

    // =========================================================================
    // RELATÓRIO FINAL: RESUMO CONSOLIDADO DE HORAS EXTRAS POR OPERADOR (DOC 076)
    // =========================================================================
    const operatorMap = new Map<string, {
      name: string;
      registration: string;
      sector: string;
      role: string;
      totalHours: number;
      count: number;
      dates: string[];
      approvedHours: number;
      pendingHours: number;
    }>();

    let grandTotalHours = 0;

    filteredRequests.forEach((req) => {
      const key = (req.employeeName || 'Não Informado').trim();
      const hours = Number(req.estimatedHours) || 0;
      grandTotalHours += hours;

      const dateBR = req.date ? req.date.split('-').reverse().slice(0, 2).join('/') : '-';
      const isApproved = (req.approvalStatus || 'Aprovado') === 'Aprovado';
      const isPending = req.approvalStatus === 'Pendente';

      const existing = operatorMap.get(key);
      if (!existing) {
        operatorMap.set(key, {
          name: key,
          registration: req.registration || '-',
          sector: req.sector || 'Extrusão',
          role: req.role || 'Operador',
          totalHours: hours,
          count: 1,
          dates: [dateBR],
          approvedHours: isApproved ? hours : 0,
          pendingHours: isPending ? hours : 0
        });
      } else {
        existing.totalHours += hours;
        existing.count += 1;
        if (isApproved) existing.approvedHours += hours;
        if (isPending) existing.pendingHours += hours;
        if (req.registration && existing.registration === '-') existing.registration = req.registration;
        if (req.role && (existing.role === 'Operador' || existing.role === '-')) existing.role = req.role;
        if (!existing.dates.includes(dateBR)) existing.dates.push(dateBR);
      }
    });

    const operatorSummaryList = Array.from(operatorMap.values()).sort((a, b) => {
      if (b.totalHours !== a.totalHours) return b.totalHours - a.totalHours;
      return a.name.localeCompare(b.name, 'pt-BR');
    });

    let summaryStartY = (doc as any).lastAutoTable.finalY + 10;
    const estimatedNeededSpace = Math.min(operatorSummaryList.length * 8 + 35, 75);

    if (summaryStartY + estimatedNeededSpace > pageHeight - 20) {
      doc.addPage();
      summaryStartY = 16;
    }

    // Banner de Título da Seção do Relatório Consolidado por Operador
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.roundedRect(margin, summaryStartY, pageWidth - margin * 2, 8.5, 1.5, 1.5, 'F');
    doc.setFillColor(245, 158, 11); // Amber accent
    doc.rect(margin, summaryStartY, 3, 8.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('RELATÓRIO FINAL CONSOLIDADO • QUANTIDADE DE HORAS EXTRAS POR OPERADOR / COLABORADOR', margin + 6, summaryStartY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225);
    const summaryHeaderInfo = `Operadores: ${operatorSummaryList.length}  |  Total de Horas Extras: ${grandTotalHours.toFixed(2)}h`;
    doc.text(summaryHeaderInfo, pageWidth - margin - 5, summaryStartY + 5.5, { align: 'right' });

    const summaryTableBody = operatorSummaryList.map((op, idx) => {
      const pct = grandTotalHours > 0 ? ((op.totalHours / grandTotalHours) * 100).toFixed(1) + '%' : '0%';
      const avgPerDay = op.count > 0 ? (op.totalHours / op.count).toFixed(2) + 'h' : '-';
      const datesDisplay = op.dates.join(', ');

      return [
        idx + 1,
        op.name,
        op.registration || '-',
        op.sector || '-',
        op.role || 'Operador',
        `${op.count} dia(s)`,
        datesDisplay,
        avgPerDay,
        `${op.totalHours.toFixed(2)}h`,
        pct
      ];
    });

    const summaryFoot = [
      [
        'TOTAL',
        `TOTAL GERAL CONSOLIDADO (${operatorSummaryList.length} colaboradores)`,
        '-',
        '-',
        '-',
        `${filteredRequests.length} solicitação(ões)`,
        '-',
        '-',
        `${grandTotalHours.toFixed(2)}h`,
        '100.0%'
      ]
    ];

    autoTable(doc, {
      startY: summaryStartY + 11.5,
      margin: { left: margin, right: margin },
      theme: 'grid',
      head: [['#', 'OPERADOR / COLABORADOR', 'MATRÍCULA', 'SETOR', 'CARGO / FUNÇÃO', 'QTD. OCORRÊNCIAS', 'DIAS REALIZADOS', 'MÉDIA / DIA', 'TOTAL DE HORAS EXTRAS', '% DO TOTAL']],
      body: summaryTableBody,
      foot: summaryFoot,
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        cellPadding: 3
      },
      footStyles: {
        fillColor: [15, 23, 42],
        textColor: [245, 158, 11], // Amber-400
        fontSize: 8,
        fontStyle: 'bold',
        cellPadding: 3
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        lineColor: [226, 232, 240],
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 55, fontStyle: 'bold' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 25 },
        4: { cellWidth: 28 },
        5: { cellWidth: 22, halign: 'center' },
        6: { cellWidth: 35 },
        7: { cellWidth: 22, halign: 'right' },
        8: { cellWidth: 36, halign: 'right', fontStyle: 'bold', textColor: [180, 83, 9] },
        9: { cellWidth: 22, halign: 'right', fontStyle: 'bold' }
      }
    });

    const pageCount = (doc.internal as any).getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('DOC 076 • Procedimento de Solicitação, Aprovação e Comunicação de Horas Extras ao RH', margin, pageHeight - 6);
      doc.text(`Página ${p} de ${pageCount}`, pageWidth - margin - 20, pageHeight - 6);
    }

    const fileMonthName = filterMonth === 'todos' ? 'Geral' : filterMonth;
    if (setPdfModal) {
      setPdfModal({
        isOpen: true,
        doc,
        filename: `Relatorio_RH_Horas_Extras_${fileMonthName}.pdf`,
        title: `Relatório de Horas Extras ao RH (${periodLabel})`
      });
    } else {
      doc.save(`Relatorio_RH_Horas_Extras_${fileMonthName}.pdf`);
    }
  };

  // Salvar solicitação e abrir o PDF imediatamente
  const handleSaveAndGeneratePDF = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isReadOnly) {
      if (onBlockedAction) onBlockedAction('Gravação Bloqueada', 'O lançamento de solicitações de horas extras não é permitido no Modo de Leitura.');
      return;
    }

    if (!employeeName.trim()) {
      setFormError('Selecione ou informe o nome do colaborador.');
      return;
    }
    if (!date) {
      setFormError('Informe a data da realização da hora extra.');
      return;
    }
    if (!startTime || !endTime) {
      setFormError('Informe o horário previsto de início e término.');
      return;
    }
    if (!reasonDetails.trim()) {
      setFormError('Digite a justificativa / motivo da necessidade operacional.');
      return;
    }

    setFormError(null);
    setIsSaving(true);

    try {
      const payload: Omit<OvertimeRequest, 'id'> = {
        employeeId: selectedEmployeeId?.trim() || '',
        employeeName: employeeName.trim(),
        registration: registration.trim(),
        role: role.trim(),
        sector: sector || 'Extrusão',
        machine: machine.trim(),
        shift: shift.trim(),
        overtimeMode: overtimeMode,
        commercialShiftType: shiftTypeChoice === 'Comercial' ? (isCommercialFlexible ? 'flexivel' : 'padrao') : undefined,
        normalShiftStartTime: shiftTypeChoice === 'Comercial' ? (isCommercialFlexible ? customFlexibleStart : '07:30') : (shiftTypeChoice === 'Noturno' ? '18:00' : '06:00'),
        normalShiftEndTime: calculatedNormalEnd,
        date: date || new Date().toISOString().split('T')[0],
        startTime: startTime || '07:30',
        endTime: endTime || '19:18',
        estimatedHours: Number(estimatedHours) || 0,
        overtimeMinutes: overtimeMinutes,
        displayOvertime: displayOvertimeValue,
        overtimeUnit: overtimeUnit,
        reasonCategory: reasonCategory || DOC076_REASON_CATEGORIES[0],
        reasonDetails: reasonDetails.trim(),
        requesterName: requesterName.trim() || loggedUser?.name || 'Líder de Produção',
        managerName: managerName.trim() || 'Edimar Silva',
        approvalStatus: approvalStatus || 'Aprovado',
        isEmergency: Boolean(isEmergency),
        notes: notes.trim(),
        createdAt: editingRequest?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: loggedUser?.id || loggedUser?.registration || 'admin'
      };

      // Garantir que nenhum campo undefined seja enviado ao Firestore
      const firestorePayload = Object.fromEntries(
        Object.entries(payload).filter(([_, val]) => val !== undefined)
      );

      let docId = editingRequest?.id;

      if (editingRequest?.id) {
        await updateDoc(doc(db, 'overtime_requests', editingRequest.id), firestorePayload);
      } else {
        const newRef = await addDoc(collection(db, 'overtime_requests'), firestorePayload);
        docId = newRef.id;
      }

      const fullRequestObject: OvertimeRequest = {
        ...payload,
        id: docId || 'he-' + Date.now()
      };

      // Se estiver filtrando por um ciclo específico que não seja o da data salva,
      // ajustar o filtro para o ciclo da folha correspondente para exibição imediata
      const savedCycle = getPayrollCycleFromDate(payload.date || new Date().toISOString().split('T')[0]);
      if (filterMonth !== 'todos' && filterMonth !== savedCycle.key) {
        setFilterMonth(savedCycle.key);
      }

      setIsFormOpen(false);
      setIsSaving(false);

      // Gerar o documento oficial DOC 076 e abrir imediatamente no modal de PDF
      const pdfDoc = generateDoc076PDF(fullRequestObject);
      const safeName = fullRequestObject.employeeName.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `DOC076_Solicitacao_HE_${safeName}_${fullRequestObject.date}.pdf`;

      if (setPdfModal) {
        setPdfModal({
          isOpen: true,
          doc: pdfDoc,
          filename,
          title: `Solicitação de Hora Extra - DOC 076 (${fullRequestObject.employeeName})`
        });
      } else {
        pdfDoc.save(filename);
      }
    } catch (err) {
      console.error('Erro ao salvar solicitação de hora extra:', err);
      setFormError('Ocorreu um erro ao salvar os dados. Tente novamente.');
      setIsSaving(false);
    }
  };

  // Excluir solicitação
  const handleDeleteRequest = async (id: string) => {
    if (isReadOnly) {
      if (onBlockedAction) onBlockedAction('Exclusão Bloqueada', 'A exclusão de solicitações de horas extras não é permitida no Modo de Leitura.');
      return;
    }
    try {
      await deleteDoc(doc(db, 'overtime_requests', id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Erro ao excluir solicitação:', err);
    }
  };

  // Visualizar PDF de solicitação existente
  const handleViewPDF = (req: OvertimeRequest) => {
    const pdfDoc = generateDoc076PDF(req);
    const safeName = req.employeeName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `DOC076_Solicitacao_HE_${safeName}_${req.date}.pdf`;

    if (setPdfModal) {
      setPdfModal({
        isOpen: true,
        doc: pdfDoc,
        filename,
        title: `Solicitação de Hora Extra - DOC 076 (${req.employeeName})`
      });
    } else {
      pdfDoc.save(filename);
    }
  };

  // Alterar status diretamente
  const handleChangeStatus = async (req: OvertimeRequest, newStatus: 'Pendente' | 'Aprovado' | 'Reprovado') => {
    if (isReadOnly) {
      if (onBlockedAction) onBlockedAction('Alteração Bloqueada', 'A alteração de status de aprovação não é permitida no Modo de Leitura.');
      return;
    }
    try {
      await updateDoc(doc(db, 'overtime_requests', req.id), {
        approvalStatus: newStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  // =========================================================================
  // COMPARTILHAMENTO FORMATADO (WHATSAPP E OUTLOOK) - PROCEDIMENTO DOC 076
  // =========================================================================

  // Helper para assinatura do supervisor no rodapé oficial
  const getSupervisorSignature = (req: OvertimeRequest): string => {
    const raw = req.requesterName || '';
    const clean = raw.trim();
    if (!clean) return 'Adaías de Alencar Melo – Supervisor de Produção';
    if (clean.toLowerCase().includes('adaias') || clean.toLowerCase().includes('adahias')) {
      return 'Adaías de Alencar Melo – Supervisor de Produção';
    }
    if (clean.toLowerCase().includes('supervisor') || clean.toLowerCase().includes('líder')) {
      return clean;
    }
    return `${clean} – Supervisor de Produção`;
  };

  // Formata o texto para compartilhamento no WhatsApp com marcações em *negrito*
  const formatOvertimeForWhatsApp = (req: OvertimeRequest): string => {
    const dateBR = req.date ? req.date.split('-').reverse().join('/') : '-';
    const statusEmoji = req.approvalStatus === 'Reprovado' ? '❌' : req.approvalStatus === 'Pendente' ? '⏳' : '✅';
    const statusLabel = (req.approvalStatus || 'Aprovado').toUpperCase();
    const supervisorSignature = getSupervisorSignature(req);
    const machineAndShift = `${req.machine || '-'}${req.shift && !req.machine?.toLowerCase().includes(req.shift.toLowerCase()) ? ` • Turno ${req.shift}` : ''}`;

    return `📋 *SOLICITAÇÃO DE HORA EXTRA • DOC 076*
*Status da Solicitação:* ${statusEmoji} *${statusLabel}*
━━━━━━━━━━━━━━━━━━━━━━

*1. IDENTIFICAÇÃO DO COLABORADOR*
• *Nome Completo:* ${req.employeeName}
• *Matrícula:* ${req.registration || 'Não informada'}
• *Setor:* ${req.sector || 'Extrusão'}
• *Função / Cargo:* ${req.role || 'Auxiliar de Produção'}
• *Máquina e Turno:* ${machineAndShift}

*2. PROGRAMAÇÃO E HORÁRIOS*
• *Data da Realização:* ${dateBR}
• *Horário:* ${req.startTime} às ${req.endTime}
• *Total Estimado:* ${
  req.overtimeMinutes !== undefined ? (
    req.overtimeMinutes < 60 ? (
      `0,${String(req.overtimeMinutes).padStart(2, '0')} minutos (${req.overtimeMinutes} min de horas extras)`
    ) : (
      `${Math.floor(req.overtimeMinutes / 60)}h ${String(req.overtimeMinutes % 60).padStart(2, '0')}min (${Number(req.estimatedHours).toFixed(2)} horas)`
    )
  ) : (
    `${Number(req.estimatedHours).toFixed(2)} horas`
  )
}
${req.isEmergency ? '🚨 *Caráter da Solicitação:* SITUAÇÃO EMERGENCIAL (DOC 076 Etapa 3)\n' : ''}
*3. MOTIVO E JUSTIFICATIVA OPERACIONAL*
• *Categoria Operacional:* ${req.reasonCategory || '-'}
• *Justificativa Detalhada:* ${req.reasonDetails || '-'}

*4. AUTORIZAÇÃO E RESPONSÁVEIS (ETAPA 3)*
• *Líder / Supervisor Solicitante:* ${req.requesterName || 'Adaías de Alencar Melo'}
${req.managerName && req.managerName !== '-' ? `• *Gestor Responsável:* ${req.managerName}\n` : ''}${req.notes ? `• *Observações:* _${req.notes}_\n` : ''}━━━━━━━━━━━━━━━━━━━━━━
*Registro emitido conforme o Procedimento Operacional Padrão DOC 076*
Gestão e Controle de Produção • ${supervisorSignature}`;
  };

  // Formata o texto para Outlook (versão texto)
  const formatOvertimeForOutlookPlain = (req: OvertimeRequest): string => {
    const dateBR = req.date ? req.date.split('-').reverse().join('/') : '-';
    const statusLabel = (req.approvalStatus || 'Aprovado').toUpperCase();
    const supervisorSignature = getSupervisorSignature(req);
    const machineAndShift = `${req.machine || '-'}${req.shift && !req.machine?.toLowerCase().includes(req.shift.toLowerCase()) ? ` • Turno ${req.shift}` : ''}`;

    return `SOLICITAÇÃO DE HORA EXTRA - PROCEDIMENTO DOC 076
Status: [ ${statusLabel} ]
======================================================================

1. IDENTIFICAÇÃO DO COLABORADOR
• Nome Completo: ${req.employeeName}
• Matrícula: ${req.registration || 'Não informada'}
• Setor: ${req.sector || 'Extrusão'}
• Função / Cargo: ${req.role || 'Auxiliar de Produção'}
• Máquina e Turno: ${machineAndShift}

2. PROGRAMAÇÃO E HORÁRIOS
• Data da Realização: ${dateBR}
• Horário: ${req.startTime} às ${req.endTime}
• Total Estimado: ${
  req.overtimeMinutes !== undefined ? (
    req.overtimeMinutes < 60 ? (
      `0,${String(req.overtimeMinutes).padStart(2, '0')} minutos (${req.overtimeMinutes} min de horas extras)`
    ) : (
      `${Math.floor(req.overtimeMinutes / 60)}h ${String(req.overtimeMinutes % 60).padStart(2, '0')}min (${Number(req.estimatedHours).toFixed(2)} horas)`
    )
  ) : (
    `${Number(req.estimatedHours).toFixed(2)} horas`
  )
}
${req.isEmergency ? '• Caráter da Solicitação: SITUAÇÃO EMERGENCIAL (DOC 076 Etapa 3)\n' : ''}
3. MOTIVO E JUSTIFICATIVA OPERACIONAL
• Categoria Operacional: ${req.reasonCategory || '-'}
• Justificativa Detalhada: ${req.reasonDetails || '-'}

4. AUTORIZAÇÃO E RESPONSÁVEIS (ETAPA 3)
• Líder / Supervisor Solicitante: ${req.requesterName || 'Adaías de Alencar Melo'}
${req.managerName && req.managerName !== '-' ? `• Gestor Responsável: ${req.managerName}\n` : ''}${req.notes ? `• Observações: ${req.notes}\n` : ''}
======================================================================
Registro emitido conforme o Procedimento Operacional Padrão DOC 076
Gestão e Controle de Produção • ${supervisorSignature}`;
  };

  // Formata o texto HTML enriquecido para Outlook com negritos reais e layout fiel ao DOC 076
  const formatOvertimeForOutlookHTML = (req: OvertimeRequest): string => {
    const dateBR = req.date ? req.date.split('-').reverse().join('/') : '-';
    const statusLabel = (req.approvalStatus || 'Aprovado').toUpperCase();
    const supervisorSignature = getSupervisorSignature(req);
    const machineAndShift = `${req.machine || '-'}${req.shift && !req.machine?.toLowerCase().includes(req.shift.toLowerCase()) ? ` • Turno ${req.shift}` : ''}`;

    return `<div style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #000000; line-height: 1.5; max-width: 750px;">
  <div style="margin-bottom: 4px;"><strong>SOLICITAÇÃO DE HORA EXTRA - PROCEDIMENTO DOC 076</strong></div>
  <div style="margin-bottom: 8px;"><strong>Status: [ ${statusLabel} ]</strong></div>
  <div style="margin-bottom: 14px; font-family: monospace; color: #000000;">======================================================================</div>

  <div style="margin-bottom: 6px;"><strong>1. IDENTIFICAÇÃO DO COLABORADOR</strong></div>
  <div style="margin-bottom: 2px;"><strong>&bull; Nome Completo:</strong> ${req.employeeName}</div>
  <div style="margin-bottom: 2px;"><strong>&bull; Matrícula:</strong> ${req.registration || 'Não informada'}</div>
  <div style="margin-bottom: 2px;"><strong>&bull; Setor:</strong> ${req.sector || 'Extrusão'}</div>
  <div style="margin-bottom: 2px;"><strong>&bull; Função / Cargo:</strong> ${req.role || 'Auxiliar de Produção'}</div>
  <div style="margin-bottom: 14px;"><strong>&bull; Máquina e Turno:</strong> ${machineAndShift}</div>

  <div style="margin-bottom: 6px;"><strong>2. PROGRAMAÇÃO E HORÁRIOS</strong></div>
  <div style="margin-bottom: 2px;"><strong>&bull; Data da Realização:</strong> ${dateBR}</div>
  <div style="margin-bottom: 2px;"><strong>&bull; Horário:</strong> ${req.startTime} às ${req.endTime}</div>
  <div style="margin-bottom: ${req.isEmergency ? '2px' : '14px'};"><strong>&bull; Total Estimado:</strong> ${
    req.overtimeMinutes !== undefined ? (
      req.overtimeMinutes < 60 ? (
        `0,${String(req.overtimeMinutes).padStart(2, '0')} minutos (${req.overtimeMinutes} min)`
      ) : (
        `${Math.floor(req.overtimeMinutes / 60)}h ${String(req.overtimeMinutes % 60).padStart(2, '0')}min (${Number(req.estimatedHours).toFixed(2)} horas)`
      )
    ) : (
      `${Number(req.estimatedHours).toFixed(2)} horas`
    )
  }</div>
  ${req.isEmergency ? '<div style="margin-bottom: 14px; color: #c00000;"><strong>&bull; Caráter da Solicitação:</strong> SITUAÇÃO EMERGENCIAL (DOC 076 Etapa 3)</div>' : ''}

  <div style="margin-bottom: 6px;"><strong>3. MOTIVO E JUSTIFICATIVA OPERACIONAL</strong></div>
  <div style="margin-bottom: 2px;"><strong>&bull; Categoria Operacional:</strong> ${req.reasonCategory || '-'}</div>
  <div style="margin-bottom: 14px; text-align: justify;"><strong>&bull; Justificativa Detalhada:</strong> ${req.reasonDetails || '-'}</div>

  <div style="margin-bottom: 6px;"><strong>4. AUTORIZAÇÃO E RESPONSÁVEIS (ETAPA 3)</strong></div>
  <div style="margin-bottom: 2px;"><strong>&bull; Líder / Supervisor Solicitante:</strong> ${req.requesterName || 'Adaías de Alencar Melo'}</div>
  ${req.managerName && req.managerName !== '-' ? `<div style="margin-bottom: 2px;"><strong>&bull; Gestor Responsável:</strong> ${req.managerName}</div>` : ''}
  ${req.notes ? `<div style="margin-bottom: 2px;"><strong>&bull; Observações:</strong> ${req.notes}</div>` : ''}

  <div style="margin-top: 14px; margin-bottom: 10px; font-family: monospace; color: #000000;">======================================================================</div>
  <div style="margin-bottom: 4px;"><strong>Registro emitido conforme o Procedimento Operacional Padrão DOC 076</strong></div>
  <div style="margin-bottom: 0;">Gestão e Controle de Produção &bull; ${supervisorSignature}</div>
</div>`;
  };

  // Copia texto com suporte a rich HTML e fallback plain text
  const copyRichAndPlainText = async (plainText: string, htmlText: string) => {
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        const htmlBlob = new Blob([htmlText], { type: 'text/html' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': textBlob,
            'text/html': htmlBlob
          })
        ]);
        return true;
      } else {
        await navigator.clipboard.writeText(plainText);
        return true;
      }
    } catch {
      try {
        await navigator.clipboard.writeText(plainText);
        return true;
      } catch {
        return false;
      }
    }
  };

  // Compartilhamento via WhatsApp
  const handleShareWhatsApp = (req: OvertimeRequest) => {
    const text = formatOvertimeForWhatsApp(req);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setOpenShareMenuId(null);
    setShareToastMessage('Mensagem formatada com destaques em negrito pronta para o WhatsApp!');
  };

  // Compartilhamento via Outlook (com suporte a App Desktop, Rascunho .EML e Outlook Web)
  const handleShareOutlook = async (req: OvertimeRequest, useWeb: boolean = false) => {
    const dateBR = req.date ? req.date.split('-').reverse().join('/') : '-';
    const statusLabel = req.approvalStatus || 'Aprovado';
    const subject = `[DOC 076] Solicitação de Hora Extra - ${req.employeeName} (${dateBR}) - ${statusLabel}`;
    const plainText = formatOvertimeForOutlookPlain(req);
    const htmlText = formatOvertimeForOutlookHTML(req);

    await copyRichAndPlainText(plainText, htmlText);

    if (useWeb) {
      const webUrl = `https://outlook.office.com/mail/deeplink/compose?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainText)}`;
      window.open(webUrl, '_blank');
      setShareToastMessage('Outlook Web aberto! Texto rico com negritos copiado: basta pressionar Ctrl+V no corpo da mensagem.');
    } else {
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainText)}`;
      const link = document.createElement('a');
      link.href = mailtoUrl;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShareToastMessage('Outlook aberto! O texto com todos os negritos foi copiado (pressione Ctrl+V no corpo do e-mail se quiser colar a versão rica).');
    }

    setOpenShareMenuId(null);
  };

  // Abrir Rascunho Formatado no Outlook (.eml com 100% dos negritos prontos sem precisar colar)
  const handleDownloadOutlookEml = (req: OvertimeRequest) => {
    const dateBR = req.date ? req.date.split('-').reverse().join('/') : '-';
    const statusLabel = (req.approvalStatus || 'Aprovado').toUpperCase();
    const subject = `[DOC 076] Solicitação de Hora Extra - ${req.employeeName} (${dateBR}) - ${statusLabel}`;
    const htmlBody = formatOvertimeForOutlookHTML(req);

    const emlContent = [
      'From: ',
      'To: ',
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      'X-Unsent: 1',
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 12px; font-family: Calibri, 'Segoe UI', Arial, sans-serif; background-color: #ffffff;">
${htmlBody}
</body>
</html>`
    ].join('\r\n');

    const blob = new Blob([emlContent], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = req.employeeName.replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `DOC076_Hora_Extra_${safeName}.eml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setOpenShareMenuId(null);
    setShareToastMessage('Rascunho aberto para o Outlook! Ao clicar no arquivo, todos os negritos já abrem 100% aplicados.');
  };

  // Copiar dados formatados para a área de transferência
  const handleCopyFormattedText = async (req: OvertimeRequest) => {
    const plainText = formatOvertimeForOutlookPlain(req);
    const htmlText = formatOvertimeForOutlookHTML(req);
    const success = await copyRichAndPlainText(plainText, htmlText);
    setOpenShareMenuId(null);
    if (success) {
      setShareToastMessage('Dados com todos os negritos copiados! Pressione Ctrl+V no Outlook ou documento.');
    }
  };

  // Lista filtrada com suporte à apuração da folha de ponto (fechamento dia 24)
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // Filtro ciclo da folha de ponto (com fechamento no dia 24)
      if (filterMonth && filterMonth !== 'todos') {
        if (!isDateInPayrollCycle(r.date, filterMonth)) return false;
      }

      // Filtro setor
      if (filterSector !== 'todos') {
        if (r.sector?.toLowerCase() !== filterSector.toLowerCase()) return false;
      }

      // Filtro status
      if (filterStatus !== 'todos') {
        if ((r.approvalStatus || 'Aprovado') !== filterStatus) return false;
      }

      // Filtro busca (nome ou matricula)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = r.employeeName?.toLowerCase().includes(term);
        const matchesReg = r.registration?.toLowerCase().includes(term);
        const matchesReason = r.reasonDetails?.toLowerCase().includes(term);
        if (!matchesName && !matchesReg && !matchesReason) return false;
      }

      return true;
    });
  }, [requests, filterMonth, filterSector, filterStatus, searchTerm]);

  // Estatísticas de Controle Gerencial (DOC 076 - Seção 5)
  const stats = useMemo(() => {
    const totalHours = filteredRequests.reduce((acc, r) => acc + (Number(r.estimatedHours) || 0), 0);
    const approvedCount = filteredRequests.filter((r) => (r.approvalStatus || 'Aprovado') === 'Aprovado').length;
    const pendingCount = filteredRequests.filter((r) => r.approvalStatus === 'Pendente').length;
    const uniqueEmployees = new Set(filteredRequests.map((r) => r.employeeName)).size;

    // Horas por setor
    const sectorMap: { [key: string]: number } = {};
    filteredRequests.forEach((r) => {
      const s = r.sector || 'Outro';
      sectorMap[s] = (sectorMap[s] || 0) + (Number(r.estimatedHours) || 0);
    });

    let topSector = '-';
    let topSectorHours = 0;
    Object.entries(sectorMap).forEach(([s, h]) => {
      if (h > topSectorHours) {
        topSectorHours = h;
        topSector = s;
      }
    });

    return {
      totalHours: Number(totalHours.toFixed(2)),
      totalRequests: filteredRequests.length,
      approvedCount,
      pendingCount,
      uniqueEmployees,
      topSector,
      topSectorHours: Number(topSectorHours.toFixed(2))
    };
  }, [filteredRequests]);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-[2.5rem] w-full flex flex-col overflow-hidden shadow-xl animate-in fade-in duration-500 text-slate-800">
      
      {/* ============================================================== */}
      {/* BARRA SUPERIOR / CABEÇALHO */}
      {/* ============================================================== */}
      <div className="px-6 sm:px-8 py-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-200 shadow-sm shrink-0">
            <Clock size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                Solicitação de Horas Extras
              </h2>
              <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider border border-amber-200">
                DOC 076
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em] mt-0.5">
              Procedimento de Solicitação, Aprovação e Comunicação de Horas Extras • Manupackaging Fitasa & Amazônia
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsDocInfoModalOpen(true)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-wider shadow-sm cursor-pointer"
            title="Visualizar resumo das etapas e regras do DOC 076"
          >
            <Info size={15} className="text-amber-600" />
            Guia DOC 076
          </button>

          <button
            onClick={generateRhReportPDF}
            className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-wider shadow-sm cursor-pointer"
            title="Gerar relação consolidada para comunicação diária ao RH (Etapa 5)"
          >
            <FileText size={15} className="text-emerald-600" />
            Relatório RH (Etapa 5)
          </button>

          {canManage && (
            <button
              onClick={handleOpenCreateForm}
              className="bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-md shadow-amber-600/20 transition-all cursor-pointer"
            >
              <Plus size={15} />
              Nova Solicitação
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
      {/* CARDS DE CONTROLE GERENCIAL (DOC 076 - SEÇÃO 5) */}
      {/* ============================================================== */}
      <div className="p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Horas Extras</span>
              <Clock size={16} className="text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {stats.totalHours.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}h
            </div>
            <div className="mt-1">
              <p className="text-[10px] text-amber-700 font-extrabold flex items-center gap-1">
                {filterMonth === 'todos' ? 'Geral (Todos os Períodos)' : `${activePayrollCycle.shortLabel}`}
              </p>
              <p className="text-[9px] text-slate-400 font-medium">
                {filterMonth === 'todos' 
                  ? 'Fechamento da folha no dia 24' 
                  : `Até dia 24 (${activePayrollCycle.intervalLabel}) • após dia 24 zera para o novo mês`}
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Solicitações</span>
              <FileText size={16} className="text-blue-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {stats.totalRequests}
            </div>
            <p className="text-[10px] text-slate-500 font-bold mt-1">
              {stats.approvedCount} Aprovadas • {stats.pendingCount} Pendentes
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaboradores</span>
              <Users size={16} className="text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {stats.uniqueEmployees}
            </div>
            <p className="text-[10px] text-slate-500 font-bold mt-1">
              Colaboradores acionados
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Setor com Maior Volume</span>
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
                placeholder="Buscar por colaborador, matrícula ou motivo..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>

            {/* Filtro por Ciclo de Folha de Ponto (Fechamento no dia 24) */}
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0">Folha / Ciclo:</span>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                {availablePayrollCycles.map((c) => (
                  <option key={c.key} value={c.key}>
                    {formatPayrollMonthLabel(c.key)}
                  </option>
                ))}
                <option value="todos">Todos os Períodos (Histórico Geral)</option>
              </select>
              {filterMonth !== getCurrentPayrollCycleKey() && (
                <button
                  type="button"
                  onClick={() => setFilterMonth(getCurrentPayrollCycleKey())}
                  className="text-[10px] font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2 py-1 rounded-lg transition-all shrink-0 flex items-center gap-1"
                  title="Voltar ao ciclo vigente da folha da empresa"
                >
                  <Clock size={11} />
                  Ciclo Vigente
                </button>
              )}
              {filterMonth !== 'todos' && (
                <button
                  type="button"
                  onClick={() => setFilterMonth('todos')}
                  className="text-[10px] font-black text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded-lg transition-all shrink-0"
                  title="Exibir todos os meses e períodos"
                >
                  Ver Todos
                </button>
              )}
            </div>

            {/* Filtro Setor */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Setor:</span>
              <select
                value={filterSector}
                onChange={(e) => setFilterSector(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="todos">Todos os Setores</option>
                <option value="Extrusão">Extrusão</option>
                <option value="Corte de Fita">Corte de Fita</option>
                <option value="Reciclagem">Reciclagem</option>
                <option value="Manutenção">Manutenção</option>
                <option value="Expedição">Expedição</option>
              </select>
            </div>

            {/* Filtro Status */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="todos">Todos os Status</option>
                <option value="Aprovado">Aprovados</option>
                <option value="Pendente">Pendentes</option>
                <option value="Reprovado">Reprovados</option>
              </select>
            </div>
          </div>

          <div className="text-[11px] font-black text-slate-500 uppercase">
            Exibindo <span className="text-amber-600 font-bold">{filteredRequests.length}</span> solicitações
          </div>
        </div>

        {/* ============================================================== */}
        {/* BANNER DE APURAÇÃO DE HORAS EXTRAS DO COLABORADOR PESQUISADO */}
        {/* ============================================================== */}
        {searchTerm.trim() && (
          <div className="bg-amber-500/10 border border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs animate-in fade-in duration-300">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Clock size={20} />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black text-amber-950 uppercase tracking-tight">
                    Apuração por Colaborador • Fechamento da Folha no dia 24
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[9px] font-black uppercase">
                    Regra Automática
                  </span>
                  {filterMonth !== 'todos' && (
                    <span className="px-2 py-0.5 rounded-md bg-white border border-amber-300 text-amber-800 text-[9px] font-black uppercase">
                      {activePayrollCycle.shortLabel}
                    </span>
                  )}
                </div>
                <p className="text-xs font-bold text-amber-900">
                  Filtro ativo: <span className="font-black text-amber-950">&ldquo;{searchTerm}&rdquo;</span>
                </p>
                <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                  {filterMonth === 'todos' ? (
                    <>Exibindo todas as horas no histórico. Na apuração mensal oficial da folha de ponto, a contagem considera somente até o dia 24 do mês. Horas extras lançadas a partir do dia 25 iniciam zeradas para o próximo mês.</>
                  ) : (
                    <>
                      Competência: <strong>{activePayrollCycle.label}</strong>. Na folha de ponto da empresa, as horas extras são contabilizadas <strong>somente até o dia 24 do mês</strong>. Qualquer extra lançada a partir do dia 25 começa a contar zerada (começa do zero), contando para o próximo mês.
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="text-right sm:border-l sm:border-amber-300 sm:pl-5 shrink-0">
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">
                {filterMonth === 'todos' ? 'Total Geral Histórico:' : 'Total de Horas no Ciclo:'}
              </span>
              <div className="text-2xl sm:text-3xl font-black text-amber-950">
                {stats.totalHours.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}h
              </div>
              <span className="text-[9.5px] font-bold text-amber-700 block">
                {filteredRequests.length} {filteredRequests.length === 1 ? 'solicitação no período' : 'solicitações no período'}
              </span>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* LISTAGEM DE HISTÓRICO DE SOLICITAÇÕES */}
        {/* ============================================================== */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="animate-spin text-amber-500" size={32} />
            <p className="text-xs font-bold uppercase tracking-widest">Carregando solicitações DOC 076...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-20 bg-white rounded-3xl border border-slate-200 text-center p-8">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl mx-auto flex items-center justify-center mb-4">
              <Clock size={32} />
            </div>
            <h3 className="text-base font-black text-slate-800 uppercase tracking-tight mb-1">
              Nenhuma Solicitação de Hora Extra Encontrada
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium mb-6">
              Não há registros para os filtros selecionados. Clique no botão abaixo para lançar uma nova solicitação conforme o procedimento DOC 076.
            </p>
            {canManage && (
              <button
                onClick={handleOpenCreateForm}
                className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-black uppercase tracking-wider px-6 py-3 rounded-xl inline-flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Plus size={16} />
                Lançar Nova Solicitação (DOC 076)
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((req) => {
              const formattedDate = req.date.split('-').reverse().join('/');
              const isApproved = (req.approvalStatus || 'Aprovado') === 'Aprovado';
              const isPending = req.approvalStatus === 'Pendente';

              return (
                <div
                  key={req.id}
                  className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative ${
                    openShareMenuId === req.id ? 'z-30 ring-2 ring-amber-400/40' : 'z-10'
                  }`}
                >
                  {/* Bloco 1: Data, Horários e Horas */}
                  <div className="flex items-center gap-4 min-w-[240px]">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-center shrink-0">
                      <span className="text-[9px] font-black text-slate-400 uppercase">
                        {req.date.split('-')[1]}/{req.date.split('-')[0].substring(2)}
                      </span>
                      <span className="text-base font-black text-slate-900 leading-none">
                        {req.date.split('-')[2]}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">
                          {req.startTime} às {req.endTime}
                        </span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-black">
                          {req.overtimeMinutes !== undefined ? (
                            req.overtimeMinutes < 60 ? (
                              `0,${String(req.overtimeMinutes).padStart(2, '0')} min`
                            ) : (
                              `${Math.floor(req.overtimeMinutes / 60)}h ${req.overtimeMinutes % 60 > 0 ? `${String(req.overtimeMinutes % 60).padStart(2, '0')}min` : '00min'}`
                            )
                          ) : (
                            `${Number(req.estimatedHours).toFixed(2)}h`
                          )}
                        </span>
                        {req.isEmergency && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-md text-[9px] font-black uppercase">
                            Emergencial
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Data: {formattedDate}
                        </span>
                        {(() => {
                          const reqCycle = getPayrollCycleFromDate(req.date);
                          const reqDay = parseInt(req.date.split('-')[2] || '0', 10);
                          const isPostCutoff = reqDay > PAYROLL_CUTOFF_DAY;
                          return (
                            <span 
                              className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold ${
                                isPostCutoff 
                                  ? 'bg-amber-50 text-amber-900 border border-amber-300' 
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                              title={isPostCutoff ? 'Data posterior ao dia 24: contabiliza zerada para o mês seguinte' : 'Data até o dia 24: contabilizada na folha atual'}
                            >
                              Folha {reqCycle.monthName} ({isPostCutoff ? 'após dia 24 • zerada' : 'até dia 24'})
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Bloco 2: Colaborador e Setor */}
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900">
                        {req.employeeName}
                      </h4>
                      {req.registration && (
                        <span className="text-[10px] text-slate-400 font-bold">
                          • Matrícula: {req.registration}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500 mt-1">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-black text-[10px]">
                        {req.sector || 'Extrusão'}
                      </span>
                      {req.role && <span>{req.role}</span>}
                      {req.machine && <span>• Máq: {req.machine}</span>}
                      {req.shift && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded-md font-bold text-[10px] border border-blue-200">
                          {req.shift}
                        </span>
                      )}
                      {req.overtimeMode === 'integral' ? (
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded-md font-bold text-[10px] border border-indigo-200">
                          Extra Integral
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-md font-bold text-[10px] border border-amber-200">
                          Extensão pós-turno
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 text-xs text-slate-700 bg-slate-50/80 rounded-xl p-2 border border-slate-100">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Motivo:</span>
                        <span className="font-bold text-slate-800 text-[11px]">{req.reasonCategory}</span>
                      </div>
                      {req.reasonDetails && (
                        <div className="mt-1 text-slate-600 text-xs leading-relaxed">
                          <strong className="font-bold text-slate-700">Justificativa:</strong> {req.reasonDetails}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bloco 3: Solicitante e Status */}
                  <div className="flex items-center gap-3 lg:border-l lg:border-slate-100 lg:pl-4">
                    <div className="text-left lg:text-right">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">
                        Solicitado por:
                      </div>
                      <div className="text-xs font-black text-slate-700">
                        {req.requesterName || 'Líder'}
                      </div>
                    </div>

                    {/* Badge do Status com menu de troca rápida */}
                    <div className="relative group">
                      <button
                        onClick={() => {
                          const nextStatus = isApproved ? 'Pendente' : isPending ? 'Reprovado' : 'Aprovado';
                          handleChangeStatus(req, nextStatus as any);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all ${
                          isApproved
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : isPending
                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        }`}
                        title="Clique para alternar status (Aprovado / Pendente / Reprovado)"
                      >
                        {req.approvalStatus || 'Aprovado'}
                      </button>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-1.5 ml-2">
                      {/* Botão de Compartilhar (Outlook / WhatsApp) logo ao lado de aprovado */}
                      <div className="relative share-menu-container">
                        <button
                          onClick={() => setOpenShareMenuId(openShareMenuId === req.id ? null : req.id)}
                          className={`p-2 rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center ${
                            openShareMenuId === req.id
                              ? 'bg-amber-500 text-white shadow-md'
                              : 'bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700'
                          }`}
                          title="Compartilhar Solicitação (Outlook / WhatsApp)"
                        >
                          <Share2 size={16} />
                        </button>

                        {/* Dropdown de Compartilhamento */}
                        {openShareMenuId === req.id && (
                          <div className="absolute right-0 top-full mt-2 w-72 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 animate-in fade-in zoom-in-95 duration-150">
                            <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Share2 size={13} className="text-amber-500" />
                                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                                  Compartilhar DOC 076
                                </span>
                              </div>
                              <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                isApproved
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isPending
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {req.approvalStatus || 'Aprovado'}
                              </span>
                            </div>

                            <div className="py-1">
                              {/* Opção 1: Compartilhar pelo WhatsApp */}
                              <button
                                onClick={() => handleShareWhatsApp(req)}
                                className="w-full px-3.5 py-2.5 flex items-start gap-3 hover:bg-emerald-50 text-left transition-colors group cursor-pointer"
                              >
                                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
                                  <MessageCircle size={17} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-black text-slate-800 group-hover:text-emerald-700 flex items-center gap-1.5">
                                    Compartilhar pelo WhatsApp
                                  </div>
                                  <div className="text-[10px] text-slate-500 leading-tight mt-0.5 font-medium">
                                    Texto com negritos e dados organizados para envio
                                  </div>
                                </div>
                              </button>

                              {/* Opção 2: Compartilhar pelo Outlook */}
                              <div className="border-t border-slate-100 mt-1 pt-1">
                                <button
                                  onClick={() => handleShareOutlook(req, false)}
                                  className="w-full px-3.5 py-2 flex items-start gap-3 hover:bg-blue-50 text-left transition-colors group cursor-pointer"
                                >
                                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
                                    <Mail size={17} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-black text-slate-800 group-hover:text-blue-700 flex items-center gap-1.5">
                                      Compartilhar pelo Outlook
                                    </div>
                                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5 font-medium">
                                      Abre o Outlook e copia negritos prontos para colar (Ctrl+V)
                                    </div>
                                  </div>
                                </button>

                                {/* Opção 3: Abrir Rascunho com 100% dos negritos já aplicados */}
                                <button
                                  onClick={() => handleDownloadOutlookEml(req)}
                                  className="w-full px-3.5 py-2 flex items-start gap-3 hover:bg-indigo-50 text-left transition-colors group cursor-pointer border-t border-slate-50"
                                >
                                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs">
                                    <FileText size={17} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-black text-slate-800 group-hover:text-indigo-700 flex items-center gap-1.5">
                                      Abrir Rascunho Outlook (.eml)
                                    </div>
                                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5 font-medium">
                                      Abre rascunho com todos os negritos 100% nativos já aplicados
                                    </div>
                                  </div>
                                </button>

                                {/* Ações complementares para Outlook Web e Copiar */}
                                <div className="px-3.5 pb-1 pt-1 flex items-center justify-between text-[10px] bg-slate-50/70 border-t border-slate-100 mt-1 py-1.5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShareOutlook(req, true);
                                    }}
                                    className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                                    title="Abrir no navegador via Outlook Web / Microsoft 365"
                                  >
                                    <ExternalLink size={11} />
                                    Outlook Web
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyFormattedText(req);
                                    }}
                                    className="text-slate-600 hover:text-slate-900 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                                    title="Copiar texto com formatação para a área de transferência"
                                  >
                                    <Copy size={11} />
                                    Copiar Negritos
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleViewPDF(req)}
                        className="p-2 bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-700 rounded-xl transition-all shadow-sm cursor-pointer"
                        title="Visualizar / Baixar Documento Oficial DOC 076 em PDF"
                      >
                        <FileText size={16} />
                      </button>

                      {canManage && (
                        <>
                          <button
                            onClick={() => handleOpenEditForm(req)}
                            className="p-2 bg-slate-100 hover:bg-blue-500 hover:text-white text-slate-700 rounded-xl transition-all shadow-sm cursor-pointer"
                            title="Editar Solicitação"
                          >
                            <Edit2 size={16} />
                          </button>

                          <button
                            onClick={() => {
                              if (isReadOnly) {
                                if (onBlockedAction) onBlockedAction('Exclusão Bloqueada', 'A exclusão de solicitações de horas extras não é permitida no Modo de Leitura.');
                                return;
                              }
                              setDeleteConfirmId(req.id);
                            }}
                            className="p-2 bg-slate-100 hover:bg-red-500 hover:text-white text-slate-700 rounded-xl transition-all shadow-sm cursor-pointer"
                            title="Excluir Solicitação"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL DE LANÇAMENTO / EDIÇÃO DA SOLICITAÇÃO (DOC 076) */}
      {/* ============================================================== */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-4xl lg:max-w-5xl shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-8 animate-in zoom-in-95 duration-200">
            
            {/* Topo do Formulário */}
            <div className="px-6 sm:px-8 py-5 sm:py-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
                  <Clock size={22} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-tight">
                    {editingRequest ? 'Editar Solicitação de Hora Extra' : 'Nova Solicitação de Hora Extra'}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-amber-400 font-bold uppercase tracking-wider">
                    Conforme Procedimento DOC 076 • Etapa 2
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                title="Fechar formulário"
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulário com Scroll */}
            <form onSubmit={handleSaveAndGeneratePDF} className="p-6 sm:p-8 space-y-6 max-h-[82vh] overflow-y-auto">
              
              {formError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-xs font-bold">
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* SEÇÃO 1: IDENTIFICAÇÃO DO COLABORADOR */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <User size={16} className="text-amber-600" />
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    1. Identificação do Colaborador
                  </h4>
                </div>

                {/* Seleção do Colaborador no Sistema */}
                <div className="space-y-2.5 bg-slate-50/90 p-4 sm:p-5 rounded-2xl border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck size={14} className="text-amber-600" />
                      Selecionar Colaborador Cadastrado *
                    </label>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full w-fit">
                      Aba Pessoal / Alocação ({personnelEmployees.length} colaboradores ativos)
                    </span>
                  </div>

                  {/* Campo de Busca Rápida por Nome, Matrícula ou Setor */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      placeholder="Filtrar colaborador por nome, matrícula ou setor..."
                      className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium shadow-sm"
                    />
                    {employeeSearch && (
                      <button
                        type="button"
                        onClick={() => setEmployeeSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                        title="Limpar busca"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Dropdown com Agrupamento por Setores da Aba Pessoal */}
                  <div className="relative">
                    <select
                      value={selectedEmployeeId}
                      onChange={(e) => handleSelectEmployee(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-sm"
                    >
                      <option value="">
                        {filteredPersonnelEmployees.length === 0
                          ? '-- Nenhum colaborador encontrado com este filtro --'
                          : '-- Selecione o colaborador da Aba Pessoal --'}
                      </option>

                      {/* Setores específicos definidos na Aba Pessoal */}
                      {[
                        { key: 'extrusao', label: 'SETOR EXTRUSÃO' },
                        { key: 'reciclagem', label: 'SETOR RECICLAGEM' },
                        { key: 'fita', label: 'SETOR FITA ADESIVA' },
                        { key: 'lideranca', label: 'LIDERANÇA E GESTÃO' }
                      ].map((sectorDef) => {
                        const empsInSec = filteredPersonnelEmployees.filter((e) =>
                          (e.sector || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(sectorDef.key)
                        );
                        if (empsInSec.length === 0) return null;

                        return (
                          <optgroup key={sectorDef.key} label={`${sectorDef.label} (${empsInSec.length})`}>
                            {empsInSec.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name} {emp.registration ? `(Mat: ${emp.registration})` : ''} • {emp.role || 'Operador'}{emp.machine ? ` • ${emp.machine}` : ''}{emp.shift ? ` (${emp.shift})` : ''}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}

                      {/* Caso o formulário esteja em edição e o colaborador não esteja na lista filtrada */}
                      {selectedEmployeeId && !filteredPersonnelEmployees.some((e) => e.id === selectedEmployeeId) && (
                        <optgroup label="Colaborador Selecionado Atual">
                          <option value={selectedEmployeeId}>
                            {employeeName} {registration ? `(Mat: ${registration})` : ''} - {sector}
                          </option>
                        </optgroup>
                      )}
                    </select>
                  </div>

                  <p className="text-[9px] text-slate-500 font-medium">
                    Somente nomes da Aba Pessoal / Alocação (Extrusão, Reciclagem, Fita e Liderança). O preenchimento de matrícula, cargo, setor e máquina/turno é automático.
                  </p>

                  {/* CARD DE HORAS EXTRAS ACUMULADAS NO CICLO DA FOLHA (FECHAMENTO DIA 24) */}
                  {collaboratorFormCycleStats && (
                    <div className="p-3.5 bg-amber-500/10 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                          <Clock size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-amber-950 uppercase tracking-tight">
                              Folha de Ponto • Fechamento no Dia 24
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 text-[9px] font-black uppercase">
                              {collaboratorFormCycleStats.cycle.shortLabel}
                            </span>
                          </div>
                          <p className="text-[10px] text-amber-800 font-medium mt-0.5">
                            Ciclo: <strong>{collaboratorFormCycleStats.cycle.intervalLabel}</strong>. Extras até o dia 24 contam para este mês; após o dia 24 a contagem zera e recomeça para o próximo mês.
                          </p>
                        </div>
                      </div>
                      <div className="text-right sm:border-l sm:border-amber-200 sm:pl-4 shrink-0">
                        <span className="text-[8.5px] font-black text-amber-700 uppercase tracking-wider block">
                          Total de Horas Extras no Ciclo:
                        </span>
                        <div className="text-lg font-black text-amber-950 leading-tight">
                          {collaboratorFormCycleStats.totalHours.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}h
                        </div>
                        <span className="text-[8.5px] font-bold text-amber-600 block">
                          {collaboratorFormCycleStats.count} {collaboratorFormCycleStats.count === 1 ? 'ocorrência' : 'ocorrências'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider min-h-[20px] flex items-center mb-1.5">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider min-h-[20px] flex items-center mb-1.5">
                      Matrícula
                    </label>
                    <input
                      type="text"
                      value={registration}
                      onChange={(e) => setRegistration(e.target.value)}
                      placeholder="Ex: 1045"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                  <div>
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider min-h-[20px] flex items-center mb-1.5">
                      Setor * (Extrusão / Corte de Fita)
                    </label>
                    <select
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white shadow-sm cursor-pointer"
                    >
                      {SECTORS_LIST.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider min-h-[20px] flex items-center mb-1.5">
                      Função / Cargo
                    </label>
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="Ex: Operador Líder"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider min-h-[20px] flex items-center mb-1.5">
                      Máquina e Turno
                    </label>
                    <input
                      type="text"
                      value={machine}
                      onChange={(e) => setMachine(e.target.value)}
                      placeholder="Ex: CAST 1 • Turno A"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: PROGRAMAÇÃO E HORÁRIOS DA HORA EXTRA */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-amber-600" />
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      2. Programação, Turno e Previsão de Horários
                    </h4>
                  </div>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                    Turno Atual: {shiftTypeChoice === 'Comercial' ? (isCommercialFlexible ? 'Comercial Flexível (9h48m)' : 'Comercial Padrão (07:30 - 17:18)') : shiftTypeChoice === 'Noturno' ? 'Noturno (18:00 - 06:00)' : 'Diurno (06:00 - 18:00)'}
                  </span>
                </div>

                {/* MODALIDADE DA HORA EXTRA (SELEÇÃO) */}
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
                        Jornada de 10h de permanência (Entrada livre + 10h)
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

                  {/* CONFIGURAÇÃO ADICIONAL PARA COMERCIAL FLEXÍVEL */}
                  {shiftTypeChoice === 'Comercial' && isCommercialFlexible && (
                    <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <label className="text-[10px] font-black text-blue-900 uppercase tracking-wider block">
                            Regra do Comercial Flexível: 10 Horas de Permanência (com Almoço)
                          </label>
                          <p className="text-[10px] text-blue-700 font-medium">
                            O colaborador não tem horário fixo de entrada, mas deve cumprir <strong>10 horas de permanência</strong> (8 horas de trabalho + intervalo de almoço já contabilizado). O excedente após as 10 horas é automaticamente hora extra (em horas ou minutos).
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-xs">
                            <span className="text-[8.5px] font-black text-blue-600 uppercase block">Término das 10h:</span>
                            <span className="text-xs font-black text-blue-950">
                              {calculatedNormalEnd}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* CAMPOS DE DATA, HORÁRIOS E HORAS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
                  <div>
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider min-h-[20px] flex items-center mb-1.5">
                      Data da Realização *
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white shadow-sm"
                    />
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setDate(new Date().toISOString().split('T')[0])}
                        className="text-[9px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md transition-all cursor-pointer"
                      >
                        Hoje
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() - 1);
                          setDate(d.toISOString().split('T')[0]);
                        }}
                        className="text-[9px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md transition-all cursor-pointer"
                      >
                        Ontem
                      </button>
                      <button
                        type="button"
                        onClick={() => setDate('2026-08-31')}
                        className="text-[9px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md transition-all cursor-pointer"
                      >
                        31/08
                      </button>
                      <button
                        type="button"
                        onClick={() => setDate('2026-09-03')}
                        className="text-[9px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md transition-all cursor-pointer"
                      >
                        03/09
                      </button>
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium mt-1">
                      Aceita qualquer data: meses anteriores (ex: 31/08), dias passados (ex: 03/09), hoje ou futura.
                    </p>

                    {/* INDICADOR DE FECHAMENTO DA FOLHA NO DIA 24 PARA A DATA SELECIONADA */}
                    {date && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px]">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className={parseInt(date.split('-')[2] || '0', 10) > PAYROLL_CUTOFF_DAY ? 'text-amber-600' : 'text-emerald-600'}>
                            {parseInt(date.split('-')[2] || '0', 10) > PAYROLL_CUTOFF_DAY ? '⚠️' : '✓'}
                          </span>
                          <span className="text-slate-800">
                            Competência: <strong>Folha {formDatePayrollCycle.monthName} / {formDatePayrollCycle.referenceYear}</strong> ({formDatePayrollCycle.intervalLabel})
                          </span>
                        </div>
                        <p className="text-[9.5px] text-slate-500 font-medium mt-0.5 leading-snug">
                          {parseInt(date.split('-')[2] || '0', 10) > PAYROLL_CUTOFF_DAY 
                            ? `Data posterior ao dia 24: Esta solicitação inicia zerada e será contabilizada na Folha de ${formDatePayrollCycle.monthName}.` 
                            : `Data até o dia 24: Contabilizada na folha atual com fechamento em 24/${String(formDatePayrollCycle.referenceMonth).padStart(2, '0')}.`}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider min-h-[20px] flex items-center mb-1.5">
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
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white shadow-sm"
                    />
                    <p className="text-[9px] text-slate-400 font-medium mt-1">
                      {overtimeMode === 'pos_turno' ? (isCommercialFlexible ? 'Entrada flexível (cumpre 10h com almoço a partir deste horário)' : 'Entrada do turno normal') : 'Início das horas extras'}
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider min-h-[20px] flex items-center mb-1.5">
                      {overtimeMode === 'pos_turno' ? 'Saída Efetiva (Passando) *' : 'Horário de Término *'}
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white shadow-sm"
                    />
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {overtimeMode === 'pos_turno' && (
                        <>
                          {isCommercialFlexible && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  const [eh, em] = calculatedNormalEnd.split(':').map(Number);
                                  const totalM = eh * 60 + em + 15;
                                  const newH = Math.floor(totalM / 60) % 24;
                                  const newM = totalM % 60;
                                  setEndTime(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
                                }}
                                className="text-[9px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded cursor-pointer"
                                title="Adicionar 15 minutos de hora extra após 10 horas"
                              >
                                +15m
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const [eh, em] = calculatedNormalEnd.split(':').map(Number);
                                  const totalM = eh * 60 + em + 30;
                                  const newH = Math.floor(totalM / 60) % 24;
                                  const newM = totalM % 60;
                                  setEndTime(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
                                }}
                                className="text-[9px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded cursor-pointer"
                                title="Adicionar 30 minutos de hora extra após 10 horas"
                              >
                                +30m
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const [eh, em] = calculatedNormalEnd.split(':').map(Number);
                                  const totalM = eh * 60 + em + 45;
                                  const newH = Math.floor(totalM / 60) % 24;
                                  const newM = totalM % 60;
                                  setEndTime(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
                                }}
                                className="text-[9px] font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded cursor-pointer"
                                title="Adicionar 45 minutos de hora extra após 10 horas"
                              >
                                +45m
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const [eh, em] = calculatedNormalEnd.split(':').map(Number);
                              const newH = (eh + 1) % 24;
                              setEndTime(`${String(newH).padStart(2, '0')}:${String(em).padStart(2, '0')}`);
                            }}
                            className="text-[9px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            +1h
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const [eh, em] = calculatedNormalEnd.split(':').map(Number);
                              const newH = (eh + 2) % 24;
                              setEndTime(`${String(newH).padStart(2, '0')}:${String(em).padStart(2, '0')}`);
                            }}
                            className="text-[9px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            +2h
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const [eh, em] = calculatedNormalEnd.split(':').map(Number);
                              const newH = (eh + 3) % 24;
                              setEndTime(`${String(newH).padStart(2, '0')}:${String(em).padStart(2, '0')}`);
                            }}
                            className="text-[9px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            +3h
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const [eh, em] = calculatedNormalEnd.split(':').map(Number);
                              const newH = (eh + 4) % 24;
                              setEndTime(`${String(newH).padStart(2, '0')}:${String(em).padStart(2, '0')}`);
                            }}
                            className="text-[9px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            +4h
                          </button>
                        </>
                      )}
                      {overtimeMode === 'integral' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setStartTime('07:30');
                              setEndTime('17:18');
                            }}
                            className="text-[9px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            Comercial
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStartTime('06:00');
                              setEndTime('18:00');
                            }}
                            className="text-[9px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            Diurno
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setStartTime('18:00');
                              setEndTime('06:00');
                            }}
                            className="text-[9px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            Noturno
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider min-h-[20px] flex items-center mb-1.5">
                      {overtimeUnit === 'minutos' ? 'Horas Extras (Minutos) *' : 'Horas Extras (Total) *'}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={displayOvertimeValue}
                        onChange={(e) => {
                          setAutoCalculateHours(false);
                          const raw = e.target.value;
                          setDisplayOvertimeValue(raw);
                          const clean = raw.replace(',', '.').trim();
                          const num = parseFloat(clean);
                          if (!isNaN(num)) {
                            if (clean.startsWith('0.') || (num < 1 && num > 0)) {
                              const parts = clean.split('.');
                              const m = parts[1] ? parseInt(parts[1].slice(0, 2).padEnd(2, '0'), 10) : Math.round(num * 100);
                              setOvertimeMinutes(m);
                              setEstimatedHours(Number((m / 60).toFixed(2)));
                              setOvertimeUnit('minutos');
                            } else {
                              if (clean.includes('.')) {
                                const [hStr, mStr] = clean.split('.');
                                const h = parseInt(hStr, 10) || 0;
                                const m = parseInt((mStr || '0').slice(0, 2).padEnd(2, '0'), 10) || 0;
                                const totalM = h * 60 + m;
                                setOvertimeMinutes(totalM);
                                setEstimatedHours(Number((totalM / 60).toFixed(2)));
                                setOvertimeUnit(totalM < 60 && totalM > 0 ? 'minutos' : 'horas');
                              } else {
                                const h = num;
                                const totalM = Math.round(h * 60);
                                setOvertimeMinutes(totalM);
                                setEstimatedHours(h);
                                setOvertimeUnit(totalM < 60 && totalM > 0 ? 'minutos' : 'horas');
                              }
                            }
                          }
                        }}
                        required
                        className="w-full px-4 py-2.5 bg-amber-50/50 border border-amber-300 rounded-xl text-xs font-black text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                      />
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black transition-all ${
                        overtimeUnit === 'minutos' 
                          ? 'text-blue-700 bg-blue-100/90 border border-blue-200 px-2 py-0.5 rounded-md text-[11px]' 
                          : 'text-amber-600'
                      }`}>
                        {overtimeUnit}
                      </span>
                    </div>
                    <p className="text-[9px] text-amber-700 font-bold mt-1">
                      {overtimeMinutes > 0 ? (
                        overtimeMinutes < 60 ? (
                          `${overtimeMinutes} minutos de hora extra`
                        ) : (
                          `${Math.floor(overtimeMinutes / 60)}h ${overtimeMinutes % 60}min de hora extra`
                        )
                      ) : (
                        '0h 00min de hora extra'
                      )}
                    </p>
                  </div>
                </div>

                {/* CARD INFORMATIVO DO CÁLCULO DAS HORAS EXTRAS */}
                {overtimeExplanation && (
                  <div className="p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="font-extrabold uppercase text-[10px] tracking-wide text-emerald-800 block">
                        Cálculo de Horas Extras Conforme Regra de Turno:
                      </span>
                      <p className="text-[11px] font-medium leading-relaxed mt-0.5 text-emerald-950">
                        {overtimeExplanation}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] font-bold text-slate-500 gap-2 px-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCalculateHours}
                      onChange={(e) => setAutoCalculateHours(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                    />
                    <span>Calcular horas automaticamente com base no turno e horários de entrada e saída</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-red-600">
                    <input
                      type="checkbox"
                      checked={isEmergency}
                      onChange={(e) => setIsEmergency(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                    />
                    <span>Situação Emergencial (Etapa 3 do DOC 076)</span>
                  </label>
                </div>
              </div>

              {/* SEÇÃO 3: MOTIVO E JUSTIFICATIVA OPERACIONAL */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Briefcase size={16} className="text-amber-600" />
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    3. Justificativa Operacional e Motivo (Etapas 1 e 2)
                  </h4>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                  <div className="lg:col-span-5">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider min-h-[20px] flex items-center mb-1.5">
                      Categoria Operacional (DOC 076) *
                    </label>
                    <select
                      value={reasonCategory}
                      onChange={(e) => setReasonCategory(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white shadow-sm cursor-pointer"
                    >
                      {DOC076_REASON_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-7">
                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider min-h-[20px] flex items-center mb-1.5">
                      Justificativa Operacional Detalhada *
                    </label>
                    <textarea
                      rows={2}
                      value={reasonDetails}
                      onChange={(e) => setReasonDetails(e.target.value)}
                      placeholder="Digite com clareza o motivo e a necessidade operacional para a realização da hora extra..."
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white resize-none shadow-sm"
                    />
                    <p className="text-[9px] text-slate-400 font-medium mt-1">
                      Conforme DOC 076: Toda hora extra deve possuir necessidade, responsável, aprovação, registro e justificativa.
                    </p>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 4: AUTORIZAÇÃO E RESPONSÁVEIS */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <ShieldCheck size={16} className="text-amber-600" />
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    4. Aprovação e Autorização (Etapa 3)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                  <div>
                    <div className="flex items-center justify-between min-h-[20px] mb-1.5">
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                        Líder / Supervisor Solicitante *
                      </label>
                      <span className="text-[9px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        Liderança
                      </span>
                    </div>
                    <select
                      value={requesterName}
                      onChange={(e) => setRequesterName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all cursor-pointer shadow-sm"
                    >
                      <option value="">Selecione o Líder / Supervisor...</option>
                      {leadershipOptions.map((leader) => (
                        <option key={`req-${leader.name}`} value={leader.name}>
                          {leader.name} {leader.role ? `(${leader.role})` : ''}
                        </option>
                      ))}
                      {requesterName && !leadershipOptions.some((l) => l.name === requesterName) && (
                        <option value={requesterName}>{requesterName} (Atual)</option>
                      )}
                    </select>
                    <p className="text-[9px] text-slate-400 mt-1 font-medium">
                      Escolha Adahias, Edmar, Erivan ou outro líder cadastrado.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between min-h-[20px] mb-1.5">
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                        Gestor Responsável pela Área *
                      </label>
                      <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        Gerência / Gestão
                      </span>
                    </div>
                    <select
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all cursor-pointer shadow-sm"
                    >
                      <option value="">Selecione o Gestor Responsável...</option>
                      {leadershipOptions.map((leader) => (
                        <option key={`mgr-${leader.name}`} value={leader.name}>
                          {leader.name} {leader.role ? `(${leader.role})` : ''}
                        </option>
                      ))}
                      {managerName && !leadershipOptions.some((l) => l.name === managerName) && (
                        <option value={managerName}>{managerName} (Atual)</option>
                      )}
                    </select>
                    <p className="text-[9px] text-slate-400 mt-1 font-medium">
                      Responsável pela aprovação prévia (Etapa 3 do DOC 076).
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between min-h-[20px] mb-1.5">
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">
                        Status da Autorização
                      </label>
                      <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Etapa 3
                      </span>
                    </div>
                    <select
                      value={approvalStatus}
                      onChange={(e) => setApprovalStatus(e.target.value as any)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all cursor-pointer shadow-sm"
                    >
                      <option value="Aprovado">Aprovado (Autorizado)</option>
                      <option value="Pendente">Pendente de Autorização</option>
                      <option value="Reprovado">Reprovado</option>
                    </select>
                    <p className="text-[9px] text-slate-400 mt-1 font-medium">
                      Conforme DOC 076: realização sujeita à autorização prévia.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider min-h-[20px] flex items-center mb-1.5">
                    Observações Adicionais (Opcional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Substituição de operador em atestado médico, etc."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white shadow-sm"
                  />
                </div>
              </div>

              {/* BOTÕES DE AÇÃO DO FORMULÁRIO */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Gravando e Gerando PDF...
                    </>
                  ) : (
                    <>
                      <FileText size={16} />
                      Salvar e Gerar Solicitação (DOC 076)
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL DO GUIA OFICIAL DOC 076 */}
      {/* ============================================================== */}
      {isDocInfoModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <Info size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight">
                    Procedimento DOC 076
                  </h3>
                  <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                    Solicitação, Aprovação e Comunicação de Horas Extras
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsDocInfoModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-5 max-h-[75vh] overflow-y-auto text-xs text-slate-600 font-medium leading-relaxed">
              <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200">
                <h4 className="font-black text-slate-900 uppercase text-xs mb-1">
                  1. Objetivo e Regra Geral (DOC 076)
                </h4>
                <p>
                  Estabelecer um fluxo padronizado para solicitação, aprovação, realização e comunicação de horas extras ao RH, garantindo controle de custos, necessidade operacional e correta apuração. A realização de horas extras deve ser tratada como uma <strong>necessidade operacional controlada, e não como rotina</strong>.
                </p>
              </div>

              <div>
                <h4 className="font-black text-slate-900 uppercase text-xs mb-2">
                  Fluxo Oficial do Processo (6 Etapas):
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <strong className="text-amber-700 font-black">Etapa 1 - Necessidade Operacional:</strong>
                    <p className="mt-1 text-[11px]">Atendimento de produção, manutenção corretiva, carregamento/expedição, inventário, atrasos operacionais ou continuidade de processo.</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <strong className="text-amber-700 font-black">Etapa 2 - Solicitação:</strong>
                    <p className="mt-1 text-[11px]">Líder comunica ao gestor: nome do colaborador, setor, data, horário previsto, horas estimadas e motivo.</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <strong className="text-amber-700 font-black">Etapa 3 - Aprovação:</strong>
                    <p className="mt-1 text-[11px]">Autorização prévia do gestor responsável. Em casos emergenciais, comunicar assim que possível com justificativa.</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <strong className="text-amber-700 font-black">Etapa 4 - Realização:</strong>
                    <p className="mt-1 text-[11px]">Registro correto no ponto eletrônico, correspondendo estritamente ao período efetivamente trabalhado.</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <strong className="text-amber-700 font-black">Etapa 5 - Comunicação ao RH:</strong>
                    <p className="mt-1 text-[11px]">Envio da relação das horas extras no prazo diário ou no início do próximo dia útil para conferência.</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <strong className="text-amber-700 font-black">Etapa 6 - Conferência pelo RH:</strong>
                    <p className="mt-1 text-[11px]">Confrontação dos dados com os registros de ponto para fechamento da folha sem divergências.</p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-100 rounded-xl text-[11px] text-slate-500 flex justify-between items-center">
                <span>Revisão: 000 • Data emissão: 21/08/2026</span>
                <span>Revisor: Paloma Magalhães • Aprovador: Edimar Silva</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {/* ============================================================== */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) handleDeleteRequest(deleteConfirmId);
        }}
        title="Excluir Solicitação de Hora Extra"
        message="Deseja realmente excluir este registro de hora extra? Esta ação removerá o histórico desta solicitação no sistema."
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        type="danger"
      />

      {/* ============================================================== */}
      {/* TOAST DE FEEDBACK DE COMPARTILHAMENTO */}
      {/* ============================================================== */}
      {shareToastMessage && (
        <div className="fixed bottom-6 right-6 z-[1000] flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-md">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={16} />
          </div>
          <span className="flex-1 leading-snug">{shareToastMessage}</span>
          <button 
            onClick={() => setShareToastMessage(null)} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar aviso"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
