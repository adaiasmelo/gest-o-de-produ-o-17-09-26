import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Trash2, 
  X, 
  CheckSquare, 
  Square,
  FileText,
  Settings,
  HelpCircle,
  Edit2,
  Sparkles,
  Loader2,
  Mail,
  Wrench,
  BarChart3,
  Calendar,
  History,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { MaintenanceIssue, MaintenancePriority, MaintenanceStatus, MaintenanceProgressEntry, SystemUser, Employee, ProductionEntry, RibbonCuttingEntry, Shift } from '../types';
import { MaintenanceDowntimeAnalyticsView } from './MaintenanceDowntimeAnalyticsView';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

interface MaintenanceTabProps {
  setPdfModal: React.Dispatch<React.SetStateAction<{
    isOpen: boolean;
    doc: any;
    filename: string;
    title: string;
  } | null>>;
  loggedUser: SystemUser | null;
  employees: Employee[];
  isReadOnly?: boolean;
  onBlockedAction?: (title?: string, message?: string) => void;
  initialSubTab?: 'causes' | 'analytics';
  initialCreateRequestOpen?: boolean;
  onConsumeCreateRequestOpen?: () => void;
  canViewRequests?: boolean;
  canViewAnalytics?: boolean;
  canCreateRequest?: boolean;
  canViewMachineStops?: boolean;
  canExportPdf?: boolean;
  canSendOutlook?: boolean;
  productionData?: ProductionEntry[];
  ribbonEntries?: RibbonCuttingEntry[];
  availableShifts?: Shift[];
  dashboardMonth?: string;
  systemLogo?: string;
  systemName?: string;
}

const priorityValue = {
  'Crítica': 4,
  'Alta': 3,
  'Média': 2,
  'Baixa': 1,
};

const priorityColors = {
  'Crítica': { bg: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-600', hover: 'hover:bg-red-100' },
  'Alta': { bg: 'bg-orange-50 text-orange-700 border-orange-200', dot: 'bg-orange-500', hover: 'hover:bg-orange-100' },
  'Média': { bg: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500', hover: 'hover:bg-yellow-100' },
  'Baixa': { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', hover: 'hover:bg-emerald-100' },
};

const statusColors = {
  'Pendente': { text: 'text-slate-600', bg: 'bg-slate-100', icon: Clock },
  'Em Andamento': { text: 'text-blue-600', bg: 'bg-blue-100', icon: Settings },
  'Resolvido': { text: 'text-emerald-600', bg: 'bg-emerald-100', icon: CheckCircle2 },
};

const generateTitleFromCause = (cause: string): string => {
  if (!cause) return '';
  const trimmed = cause.trim();
  // Get first sentence or first 50 chars
  const firstSentence = trimmed.split(/[.:\n]/)[0].trim();
  if (firstSentence.length > 50) {
    const words = firstSentence.split(/\s+/);
    let title = '';
    for (const word of words) {
      if ((title + ' ' + word).length > 47) {
        return title.trim() + '...';
      }
      title += ' ' + word;
    }
    return firstSentence.slice(0, 47) + '...';
  }
  return firstSentence;
};

const formatDateTimeLocalInput = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
};

const formatBrDateTime = (dateStr?: string): string => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
};

const getSortedProgressUpdates = (issue: MaintenanceIssue): MaintenanceProgressEntry[] => {
  if (!Array.isArray(issue.progressUpdates) || issue.progressUpdates.length === 0) return [];
  return [...issue.progressUpdates].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
};

export const MaintenanceTab: React.FC<MaintenanceTabProps> = ({ 
  setPdfModal, 
  loggedUser, 
  employees,
  isReadOnly = false,
  onBlockedAction,
  initialSubTab = 'causes',
  initialCreateRequestOpen = false,
  onConsumeCreateRequestOpen,
  canViewRequests = true,
  canViewAnalytics = true,
  canCreateRequest = true,
  canViewMachineStops = true,
  canExportPdf = true,
  canSendOutlook = true,
  productionData = [],
  ribbonEntries = [],
  availableShifts = [],
  dashboardMonth,
  systemLogo,
  systemName,
}) => {
  const allowRequestsView = canViewRequests || (canCreateRequest && !isReadOnly) || canViewMachineStops || canExportPdf || (canSendOutlook && !isReadOnly);
  const allowAnalyticsView = canViewAnalytics;
  const allowCreateButton = canCreateRequest && !isReadOnly;
  const allowMachineStopsButton = canViewMachineStops;
  const allowExportPdfButton = canExportPdf;
  const allowSendOutlookButton = canSendOutlook && !isReadOnly;

  const [activeSubTab, setActiveSubTab] = useState<'causes' | 'analytics'>(() => {
    if (initialSubTab === 'analytics' && allowAnalyticsView) return 'analytics';
    if (!allowRequestsView && allowAnalyticsView) return 'analytics';
    return 'causes';
  });

  useEffect(() => {
    if (initialSubTab === 'analytics' && allowAnalyticsView) {
      setActiveSubTab('analytics');
    } else if (initialSubTab !== 'analytics' && allowRequestsView) {
      setActiveSubTab('causes');
    } else if (allowAnalyticsView && !allowRequestsView) {
      setActiveSubTab('analytics');
    }
  }, [initialSubTab, allowAnalyticsView, allowRequestsView]);

  useEffect(() => {
    if (activeSubTab === 'analytics' && !allowAnalyticsView && allowRequestsView) {
      setActiveSubTab('causes');
    } else if (activeSubTab !== 'analytics' && !allowRequestsView && allowAnalyticsView) {
      setActiveSubTab('analytics');
    }
  }, [activeSubTab, allowAnalyticsView, allowRequestsView]);

  useEffect(() => {
    if (initialCreateRequestOpen) {
      if (allowCreateButton) {
        setActiveSubTab('causes');
        setEditingIssue(null);
        setFormTitle('');
        setFormCause('');
        setFormPriority('Média');
        setFormSector('');
        setFormMachine('');
        setFormReporter(loggedUser?.name || '');
        setIsAddModalOpen(true);
      }
      onConsumeCreateRequestOpen?.();
    }
  }, [initialCreateRequestOpen, allowCreateButton, loggedUser, onConsumeCreateRequestOpen]);

  const [issues, setIssues] = useState<MaintenanceIssue[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<MaintenanceIssue | null>(null);
  const [selectedIssueForNotes, setSelectedIssueForNotes] = useState<MaintenanceIssue | null>(null);

  // PDF Export Modal & Multi-Selection State
  const [selectedIssueIds, setSelectedIssueIds] = useState<string[]>([]);
  const [isExportPdfModalOpen, setIsExportPdfModalOpen] = useState(false);
  const [pdfModalSearch, setPdfModalSearch] = useState('');
  const [pdfModalError, setPdfModalError] = useState<string | null>(null);
  const [isOutlookShareModalOpen, setIsOutlookShareModalOpen] = useState(false);
  const [isProportionalStopsModalOpen, setIsProportionalStopsModalOpen] = useState(false);
  const [stopsModalMonth, setStopsModalMonth] = useState<string>(dashboardMonth || 'Todos');
  const [stopsModalGroupBy, setStopsModalGroupBy] = useState<'machine' | 'operator'>('machine');

  // Filters State
  const [statusFilter, setStatusFilter] = useState<'Todos' | MaintenanceStatus>('Todos');
  const [priorityFilter, setPriorityFilter] = useState<'Todos' | MaintenancePriority>('Todos');
  const [sectorFilter, setSectorFilter] = useState<string>('Todos');
  const [search, setSearch] = useState('');

  // Form State for adding new issue
  const [formTitle, setFormTitle] = useState('');
  const [formCause, setFormCause] = useState('');
  const [formPriority, setFormPriority] = useState<MaintenancePriority>('Média');
  const [formSector, setFormSector] = useState('');
  const [formMachine, setFormMachine] = useState('');
  const [formReporter, setFormReporter] = useState(loggedUser?.name || '');

  const [isImprovingText, setIsImprovingText] = useState(false);
  const [aiFeedback, setAiFeedback] = useState('');

  const handleImproveTextWithAI = async () => {
    if (!formCause.trim()) return;
    setIsImprovingText(true);
    setAiFeedback('');
    try {
      const response = await fetch('/api/polish-cause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: formCause }),
      });
      if (!response.ok) throw new Error('Falha ao conectar com o serviço de IA');
      const data = await response.json();
      if (data.polishedText) {
        setFormCause(data.polishedText);
        setAiFeedback('Texto aprimorado com sucesso! ✨');
        setTimeout(() => setAiFeedback(''), 4000);
      }
    } catch (error) {
      console.error(error);
      setAiFeedback('Erro ao aprimorar texto. Tente novamente.');
      setTimeout(() => setAiFeedback(''), 4000);
    } finally {
      setIsImprovingText(false);
    }
  };

  // Update formReporter if loggedUser changes
  useEffect(() => {
    if (loggedUser?.name) {
      setFormReporter(loggedUser.name);
    }
  }, [loggedUser]);

  // Resolution Notes State
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Progress / Vertical Timeline Modal & Step Editing State
  const [progressModalIssueId, setProgressModalIssueId] = useState<string | null>(null);
  const [newProgressText, setNewProgressText] = useState('');
  const [newProgressDate, setNewProgressDate] = useState(() => formatDateTimeLocalInput());
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [progressFeedback, setProgressFeedback] = useState<string | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [selectedTimelineStepKey, setSelectedTimelineStepKey] = useState<string | null>(null);
  const [editingStepKey, setEditingStepKey] = useState<string | null>(null);
  const [confirmDeleteStepKey, setConfirmDeleteStepKey] = useState<string | null>(null);
  const [editStepText, setEditStepText] = useState('');
  const [editStepDate, setEditStepDate] = useState('');
  const [isUpdatingStep, setIsUpdatingStep] = useState(false);
  const [expandedTimelineIssueIds, setExpandedTimelineIssueIds] = useState<Record<string, boolean>>({});

  // Recolher automaticamente todas as linhas do tempo e limpar seleções ao mudar de tela/aba/filtro
  useEffect(() => {
    setExpandedTimelineIssueIds({});
    setSelectedTimelineStepKey(null);
    setEditingStepKey(null);
    setConfirmDeleteStepKey(null);
  }, [activeSubTab, statusFilter, priorityFilter, sectorFilter]);

  const progressModalIssue = useMemo(
    () => (progressModalIssueId ? issues.find((i) => i.id === progressModalIssueId) || null : null),
    [issues, progressModalIssueId]
  );

  // Available months for Proportional Stops (100%) modal
  const stopsAvailableMonths = useMemo(() => {
    const set = new Set<string>();
    (productionData || []).forEach((e) => {
      if (e?.date && e.date.length >= 7) {
        const y = parseInt(e.date.substring(0, 4), 10);
        if (!isNaN(y) && y >= 2026) set.add(e.date.substring(0, 7));
      }
    });
    (ribbonEntries || []).forEach((e) => {
      if (e?.date && e.date.length >= 7) {
        const y = parseInt(e.date.substring(0, 4), 10);
        if (!isNaN(y) && y >= 2026) set.add(e.date.substring(0, 7));
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [productionData, ribbonEntries]);

  useEffect(() => {
    if (dashboardMonth && stopsAvailableMonths.includes(dashboardMonth)) {
      setStopsModalMonth(dashboardMonth);
    } else if (stopsAvailableMonths.length > 0 && stopsModalMonth !== 'Todos' && !stopsAvailableMonths.includes(stopsModalMonth)) {
      setStopsModalMonth(stopsAvailableMonths[0]);
    }
  }, [dashboardMonth, stopsAvailableMonths]);

  // Proportional Stops 100% Data (Cast 1, Cast 2, Erema, Ghezzi, Lintech, Wultec)
  const plantProportionalStopsData = useMemo(() => {
    const normExtMachine = (raw?: string): string | null => {
      const m = (raw || '').trim().toLowerCase();
      if (!m) return null;
      if (m.includes('cast 1') || m.includes('cast1') || m.includes('extrusora 1') || m.includes('extrusora1')) return 'Cast 1';
      if (m.includes('cast 2') || m.includes('cast2') || m.includes('extrusora 2') || m.includes('extrusora2')) return 'Cast 2';
      if (m.includes('erema')) return 'Erema';
      return null;
    };

    const normRibMachine = (raw?: string): string | null => {
      const m = (raw || '').trim().toLowerCase();
      if (!m) return null;
      if (m.includes('ghezzi') || m.includes('gehl') || m.includes('ghezze') || m.includes('giese') || m.includes('geze')) return 'Ghezzi';
      if (m.includes('lintech') || m.includes('lintec')) return 'Lintech';
      if (m.includes('wultec') || m.includes('ultech') || m.includes('ultec') || m.includes('wutec') || m.includes('utec') || m.includes('uteck') || m.includes('otec') || m.includes('oltech')) return 'Wultec';
      return null;
    };

    const machineOrder = ['Cast 1', 'Cast 2', 'Erema', 'Ghezzi', 'Lintech', 'Wultec'];
    const groupMap: Record<string, { name: string; sector: string; manut: number; proc: number; outros: number }> = {};

    if (stopsModalGroupBy === 'machine') {
      groupMap['Cast 1'] = { name: 'Cast 1', sector: 'Extrusão', manut: 0, proc: 0, outros: 0 };
      groupMap['Cast 2'] = { name: 'Cast 2', sector: 'Extrusão', manut: 0, proc: 0, outros: 0 };
      groupMap['Erema'] = { name: 'Erema', sector: 'Reciclagem', manut: 0, proc: 0, outros: 0 };
      groupMap['Ghezzi'] = { name: 'Ghezzi', sector: 'Corte de Fita', manut: 0, proc: 0, outros: 0 };
      groupMap['Lintech'] = { name: 'Lintech', sector: 'Corte de Fita', manut: 0, proc: 0, outros: 0 };
      groupMap['Wultec'] = { name: 'Wultec', sector: 'Corte de Fita', manut: 0, proc: 0, outros: 0 };
    }

    (productionData || []).forEach((e) => {
      if (!e || !e.date) return;
      const year = parseInt(e.date.split('-')[0], 10);
      if (isNaN(year) || year < 2026) return;
      if (stopsModalMonth !== 'Todos' && !e.date.startsWith(stopsModalMonth)) return;
      const isExcludedMonth = e.date.substring(5, 7) === '05' || e.date.substring(5, 7) === '06';
      const isExistingPastEntry = !e.updatedAt || e.updatedAt < '2026-06-12T17:44:00Z';
      if (isExcludedMonth && (e.machine || '').toLowerCase().includes('cast 2') && isExistingPastEntry) {
        return;
      }
      const machine = normExtMachine(e.machine);
      if (!machine) return;

      const key = stopsModalGroupBy === 'machine' ? machine : (e.operator || 'Sem Operador').trim();
      if (!groupMap[key]) {
        groupMap[key] = { name: key, sector: machine === 'Erema' ? 'Reciclagem' : 'Extrusão', manut: 0, proc: 0, outros: 0 };
      }
      groupMap[key].manut += e.manutencaoMin || 0;
      groupMap[key].proc += e.processoMin || 0;
      groupMap[key].outros += e.outrosMin || 0;
    });

    (ribbonEntries || []).forEach((e) => {
      if (!e || !e.date) return;
      const year = parseInt(e.date.split('-')[0], 10);
      if (isNaN(year) || year < 2026) return;
      if (stopsModalMonth !== 'Todos' && !e.date.startsWith(stopsModalMonth)) return;
      const machine = normRibMachine(e.machine);
      if (!machine) return;

      const key = stopsModalGroupBy === 'machine' ? machine : (e.operator || 'Sem Operador').trim();
      if (!groupMap[key]) {
        groupMap[key] = { name: key, sector: 'Corte de Fita', manut: 0, proc: 0, outros: 0 };
      }
      groupMap[key].manut += e.manutencaoMin || 0;
      groupMap[key].proc += e.processoMin || 0;
      groupMap[key].outros += e.outrosMin || 0;
    });

    const rows = Object.values(groupMap)
      .map((d) => {
        const total = d.manut + d.proc + d.outros;
        return {
          name: d.name,
          sector: d.sector,
          manutMin: Math.round(d.manut),
          procMin: Math.round(d.proc),
          outrosMin: Math.round(d.outros),
          totalMin: Math.round(total),
          manutPct: total > 0 ? Number(((d.manut / total) * 100).toFixed(1)) : 0,
          procPct: total > 0 ? Number(((d.proc / total) * 100).toFixed(1)) : 0,
          outrosPct: total > 0 ? Number(((d.outros / total) * 100).toFixed(1)) : 0,
        };
      })
      .filter((d) => d.totalMin > 0);

    if (stopsModalGroupBy === 'machine') {
      rows.sort((a, b) => machineOrder.indexOf(a.name) - machineOrder.indexOf(b.name));
    } else {
      rows.sort((a, b) => b.totalMin - a.totalMin);
    }
    return rows;
  }, [productionData, ribbonEntries, stopsModalMonth, stopsModalGroupBy]);

  // Auto-fill lists based on database
  const [sectors, setSectors] = useState<string[]>(['Extrusão', 'Reciclagem', 'Corte de Fita', 'Manutenção', 'Administração']);

  // Calculate registered machines dynamically from the personnel page (employees database)
  const machines = useMemo(() => {
    const setOfMachines = new Set<string>();
    if (employees && employees.length > 0) {
      employees.forEach(emp => {
        // Exclude empty, "Geral", "Nenhuma" or marked as "Vaga Excluída"
        if (
          emp.machine && 
          emp.machine.trim() !== '' && 
          emp.machine !== 'Geral' && 
          emp.machine !== 'Nenhuma' && 
          emp.status !== 'Vaga Excluída'
        ) {
          setOfMachines.add(emp.machine);
        }
      });
    }
    // If no machines found in database, fallback to a sensible default list
    if (setOfMachines.size === 0) {
      return ['Cast 1', 'Cast 2', 'Erema 1', 'Ghezzi', 'Lintech', 'Wultec'];
    }
    return Array.from(setOfMachines).sort();
  }, [employees]);

  // Fetch issues real-time
  useEffect(() => {
    const q = collection(db, 'maintenance_issues');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: MaintenanceIssue[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as MaintenanceIssue);
      });
      setIssues(data);
      setSelectedIssueIds((prev) => prev.filter((id) => data.some((d) => d.id === id)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'maintenance_issues');
    });

    return () => unsubscribe();
  }, []);

  const toggleIssueSelection = (id: string) => {
    setSelectedIssueIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const clearIssueSelection = () => {
    setSelectedIssueIds([]);
  };

  const openExportPdfModal = () => {
    setPdfModalSearch('');
    setPdfModalError(null);
    setIsExportPdfModalOpen(true);
  };

  // Auto-migrate old machine names and generate missing titles in Firestore based on the cause
  useEffect(() => {
    if (issues.length === 0) return;

    const migrateIssues = async () => {
      for (const issue of issues) {
        const updates: any = {};

        // 1. Machine name migration
        const lowerMachine = (issue.machine || '').toLowerCase().trim();
        let updatedMachine = '';
        if (lowerMachine === 'extrusora 1' || lowerMachine === 'extrusora1') {
          updatedMachine = 'Cast 1';
        } else if (lowerMachine === 'extrusora 2' || lowerMachine === 'extrusora2') {
          updatedMachine = 'Cast 2';
        }
        if (updatedMachine && issue.machine !== updatedMachine) {
          updates.machine = updatedMachine;
        }

        // 2. Generate title based on cause if missing
        if (!issue.title) {
          updates.title = generateTitleFromCause(issue.cause);
        }

        if (Object.keys(updates).length > 0) {
          try {
            console.log(`Migrando ocorrência de manutenção ${issue.id}:`, updates);
            await updateDoc(doc(db, 'maintenance_issues', issue.id), updates);
          } catch (err) {
            console.error(`Erro ao migrar ocorrência de manutenção ${issue.id}:`, err);
          }
        }
      }
    };

    migrateIssues();
  }, [issues]);

  // Filter & Sort Issues
  const filteredAndSortedIssues = useMemo(() => {
    let list = [...issues];

    if (statusFilter !== 'Todos') {
      list = list.filter(i => i.status === statusFilter);
    }

    return list
      .filter(issue => {
        const matchesPriority = priorityFilter === 'Todos' || issue.priority === priorityFilter;
        const matchesSector = sectorFilter === 'Todos' || issue.sector === sectorFilter;
        const matchesSearch = (issue.title || '').toLowerCase().includes(search.toLowerCase()) ||
                              issue.cause.toLowerCase().includes(search.toLowerCase()) || 
                              issue.machine.toLowerCase().includes(search.toLowerCase()) ||
                              issue.reporter.toLowerCase().includes(search.toLowerCase());
        
        return matchesPriority && matchesSector && matchesSearch;
      })
      .sort((a, b) => {
        // First sort unresolved vs resolved (Pendente/Em Andamento first, Resolvido last)
        const aIsResolved = a.status === 'Resolvido' ? 1 : 0;
        const bIsResolved = b.status === 'Resolvido' ? 1 : 0;
        
        if (aIsResolved !== bIsResolved) {
          return aIsResolved - bIsResolved;
        }

        // Within same status grouping, sort by priority (Crítica -> Alta -> Média -> Baixa)
        const diff = (priorityValue[b.priority] || 0) - (priorityValue[a.priority] || 0);
        if (diff !== 0) return diff;

        // If same priority, sort by createdAt date descending (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [issues, statusFilter, priorityFilter, sectorFilter, search]);

  // Stats Calculations
  const stats = useMemo(() => {
    const baseIssues = issues;
    const total = baseIssues.length;
    const pending = baseIssues.filter(i => i.status === 'Pendente').length;
    const inProgress = baseIssues.filter(i => i.status === 'Em Andamento').length;
    const resolved = baseIssues.filter(i => i.status === 'Resolvido').length;

    const pendingPct = total > 0 ? ((pending / total) * 100).toFixed(1) : '0';
    const inProgressPct = total > 0 ? ((inProgress / total) * 100).toFixed(1) : '0';
    const resolvedPct = total > 0 ? ((resolved / total) * 100).toFixed(1) : '0';

    const chartData = [
      { name: 'Pendente', value: pending, percentage: pendingPct, color: '#f97316' }, // orange-500
      { name: 'Em Andamento', value: inProgress, percentage: inProgressPct, color: '#3b82f6' }, // blue-500
      { name: 'Resolvido', value: resolved, percentage: resolvedPct, color: '#10b981' } // emerald-500
    ];

    return {
      total,
      pending,
      inProgress,
      resolved,
      pendingPct,
      inProgressPct,
      resolvedPct,
      chartData
    };
  }, [issues]);

  // Group issues by Sector and Machine
  const groupedIssues = useMemo(() => {
    const groups: { [sector: string]: { [machine: string]: MaintenanceIssue[] } } = {};
    
    filteredAndSortedIssues.forEach(issue => {
      const sector = issue.sector || 'Geral';
      const machine = issue.machine || 'Geral / Nenhuma';
      
      if (!groups[sector]) {
        groups[sector] = {};
      }
      if (!groups[sector][machine]) {
        groups[sector][machine] = [];
      }
      groups[sector][machine].push(issue);
    });
    
    return groups;
  }, [filteredAndSortedIssues]);

  // Unique Sectors in existing data to suggest
  useEffect(() => {
    if (issues.length > 0) {
      const uniqueSectors = Array.from(new Set(issues.map(i => i.sector))).filter(Boolean);
      
      setSectors(prev => Array.from(new Set([...prev, ...uniqueSectors])));
    }
  }, [issues]);

  const handleStartEdit = (issue: MaintenanceIssue) => {
    setEditingIssue(issue);
    setFormTitle(issue.title || '');
    setFormCause(issue.cause);
    setFormPriority(issue.priority);
    setFormSector(issue.sector);
    setFormMachine(issue.machine === 'Geral / Nenhuma' ? '' : issue.machine);
    setFormReporter(issue.reporter);
    setIsAddModalOpen(true);
  };

  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Gravação Bloqueada', 'O cadastro ou alteração de apontamentos de manutenção não é permitido no Modo de Leitura.');
      } else {
        alert('Operação não permitida no Modo de Leitura.');
      }
      setIsAddModalOpen(false);
      return;
    }
    if (!formCause || !formSector) return;

    const finalTitle = formTitle.trim() || generateTitleFromCause(formCause);

    try {
      if (editingIssue) {
        // Edit existing issue
        await updateDoc(doc(db, 'maintenance_issues', editingIssue.id), {
          title: finalTitle,
          cause: formCause,
          priority: formPriority,
          sector: formSector,
          machine: formMachine || 'Geral / Nenhuma'
        });
      } else {
        // Add new issue
        const newIssue = {
          title: finalTitle,
          cause: formCause,
          priority: formPriority,
          sector: formSector,
          machine: formMachine || 'Geral / Nenhuma',
          reporter: loggedUser?.name || formReporter || auth.currentUser?.displayName || 'Operador',
          status: 'Pendente' as MaintenanceStatus,
          createdAt: new Date().toISOString(),
          userId: auth.currentUser?.uid || 'anonymous'
        };

        await addDoc(collection(db, 'maintenance_issues'), newIssue);
      }

      // Reset form
      setFormTitle('');
      setFormCause('');
      setFormPriority('Média');
      setFormSector('');
      setFormMachine('');
      setFormReporter(loggedUser?.name || '');
      setEditingIssue(null);
      setIsAddModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'maintenance_issues');
    }
  };

  const handleDeleteIssue = async (id: string) => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Exclusão Bloqueada', 'A exclusão de apontamentos de manutenção não é permitida no Modo de Leitura.');
      } else {
        alert('Operação não permitida no Modo de Leitura.');
      }
      return;
    }
    if (!window.confirm('Deseja realmente excluir esta causa de manutenção?')) return;
    try {
      await deleteDoc(doc(db, 'maintenance_issues', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `maintenance_issues/${id}`);
    }
  };

  const toggleIssueStatus = async (issue: MaintenanceIssue) => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Alteração Bloqueada', 'A alteração de status de apontamentos de manutenção não é permitida no Modo de Leitura.');
      } else {
        alert('Operação não permitida no Modo de Leitura.');
      }
      return;
    }
    const newStatus: MaintenanceStatus = issue.status === 'Resolvido' ? 'Pendente' : 'Resolvido';
    
    if (newStatus === 'Resolvido') {
      // Open resolution notes modal
      setSelectedIssueForNotes(issue);
      setResolutionNotes(issue.solution || '');
    } else {
      // Toggle back to Pendente directly
      try {
        await updateDoc(doc(db, 'maintenance_issues', issue.id), {
          status: 'Pendente',
          resolvedAt: null
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `maintenance_issues/${issue.id}`);
      }
    }
  };

  const submitResolution = async () => {
    if (!selectedIssueForNotes) return;
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Alteração Bloqueada', 'A gravação de soluções de manutenção não é permitida no Modo de Leitura.');
      } else {
        alert('Operação não permitida no Modo de Leitura.');
      }
      setSelectedIssueForNotes(null);
      return;
    }

    try {
      await updateDoc(doc(db, 'maintenance_issues', selectedIssueForNotes.id), {
        status: 'Resolvido',
        solution: resolutionNotes,
        resolvedAt: new Date().toISOString()
      });
      setSelectedIssueForNotes(null);
      setResolutionNotes('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `maintenance_issues/${selectedIssueForNotes.id}`);
    }
  };

  const handleUpdateStatus = async (id: string, status: MaintenanceStatus) => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Alteração Bloqueada', 'A alteração de status de manutenção não é permitida no Modo de Leitura.');
      } else {
        alert('Operação não permitida no Modo de Leitura.');
      }
      return;
    }
    try {
      await updateDoc(doc(db, 'maintenance_issues', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `maintenance_issues/${id}`);
    }
  };

  const openProgressModal = (issue: MaintenanceIssue) => {
    const hasSteps = Array.isArray(issue.progressUpdates) && issue.progressUpdates.length > 0;
    if (isReadOnly && issue.status !== 'Em Andamento' && !hasSteps) {
      if (onBlockedAction) {
        onBlockedAction('Alteração Bloqueada', 'A alteração de status de manutenção não é permitida no Modo de Leitura.');
      } else {
        alert('Operação não permitida no Modo de Leitura.');
      }
      return;
    }
    setProgressModalIssueId(issue.id);
    setNewProgressText('');
    setNewProgressDate(formatDateTimeLocalInput());
    setSelectedTimelineStepKey(null);
    setEditingStepKey(null);
    setConfirmDeleteStepKey(null);
    setProgressFeedback(null);
    setProgressError(null);
  };

  const closeProgressModal = () => {
    setProgressModalIssueId(null);
    setSelectedTimelineStepKey(null);
    setEditingStepKey(null);
    setConfirmDeleteStepKey(null);
    setExpandedTimelineIssueIds({});
  };

  const handleAddProgressStep = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!progressModalIssue) return;
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Gravação Bloqueada', 'O registro de andamento não é permitido no Modo de Leitura.');
      }
      return;
    }
    const trimmed = newProgressText.trim();
    if (!trimmed) {
      setProgressError('Descreva a observação do andamento antes de salvar.');
      return;
    }

    setIsSavingProgress(true);
    setProgressError(null);
    try {
      const stepId = `step_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const parsedDate = newProgressDate ? new Date(newProgressDate) : new Date();
      const isoDate = isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
      const newEntry: MaintenanceProgressEntry = {
        id: stepId,
        text: trimmed,
        date: isoDate,
        author: loggedUser?.name || auth.currentUser?.displayName || 'Manutenção',
      };

      const existing = Array.isArray(progressModalIssue.progressUpdates)
        ? progressModalIssue.progressUpdates
        : [];

      await updateDoc(doc(db, 'maintenance_issues', progressModalIssue.id), {
        status: 'Em Andamento',
        progressUpdates: [...existing, newEntry],
      });

      setNewProgressText('');
      setNewProgressDate(formatDateTimeLocalInput());
      // Manter desselecionado para que Editar/Excluir só apareçam quando o usuário clicar na etapa
      setSelectedTimelineStepKey(null);
      setEditingStepKey(null);
      setConfirmDeleteStepKey(null);
      setProgressFeedback('Etapa salva em Em Andamento! Clique em uma etapa caso precise editar ou excluir.');
      setTimeout(() => setProgressFeedback(null), 5000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `maintenance_issues/${progressModalIssue.id}`);
    } finally {
      setIsSavingProgress(false);
    }
  };

  const handleStartEditStep = (issueId: string, step: MaintenanceProgressEntry) => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Alteração Bloqueada', 'A edição de observações não é permitida no Modo de Leitura.');
      }
      return;
    }
    const key = `${issueId}:${step.id}`;
    setSelectedTimelineStepKey(key);
    setEditingStepKey(key);
    setConfirmDeleteStepKey(null);
    setEditStepText(step.text);
    const d = new Date(step.date);
    setEditStepDate(isNaN(d.getTime()) ? formatDateTimeLocalInput() : formatDateTimeLocalInput(d));
  };

  const handleSaveEditStep = async (issue: MaintenanceIssue, stepId: string) => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Alteração Bloqueada', 'A edição de observações não é permitida no Modo de Leitura.');
      }
      return;
    }
    const trimmed = editStepText.trim();
    if (!trimmed) return;

    setIsUpdatingStep(true);
    try {
      const parsedDate = editStepDate ? new Date(editStepDate) : new Date();
      const isoDate = isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
      const currentList = Array.isArray(issue.progressUpdates) ? issue.progressUpdates : [];
      const updatedList = currentList.map((s) =>
        s.id === stepId
          ? {
              ...s,
              text: trimmed,
              date: isoDate,
              updatedAt: new Date().toISOString(),
            }
          : s
      );

      await updateDoc(doc(db, 'maintenance_issues', issue.id), {
        progressUpdates: updatedList,
      });
      setEditingStepKey(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `maintenance_issues/${issue.id}`);
    } finally {
      setIsUpdatingStep(false);
    }
  };

  const handleDeleteStep = async (issue: MaintenanceIssue, stepId: string) => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Exclusão Bloqueada', 'A exclusão de observações não é permitida no Modo de Leitura.');
      }
      return;
    }
    setIsUpdatingStep(true);
    try {
      const currentList = Array.isArray(issue.progressUpdates) ? issue.progressUpdates : [];
      const updatedList = currentList.filter((s) => s.id !== stepId);

      await updateDoc(doc(db, 'maintenance_issues', issue.id), {
        progressUpdates: updatedList,
      });
      setConfirmDeleteStepKey(null);
      setEditingStepKey(null);
      setSelectedTimelineStepKey(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `maintenance_issues/${issue.id}`);
    } finally {
      setIsUpdatingStep(false);
    }
  };

  const handleOpenConcludeFromProgress = (issue: MaintenanceIssue) => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Alteração Bloqueada', 'A conclusão de apontamentos de manutenção não é permitida no Modo de Leitura.');
      }
      return;
    }
    setProgressModalIssueId(null);
    setSelectedIssueForNotes(issue);
    setResolutionNotes(issue.solution || '');
  };

  // Share maintenance issues formatted by machine via Outlook
  const shareViaOutlook = async () => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Compartilhamento Bloqueado', 'O compartilhamento por Outlook não é permitido no Modo de Leitura.');
      } else {
        alert('Operação não permitida no Modo de Leitura.');
      }
      return;
    }
    try {
      // 1. Group active filtered issues by machine
      const groupedByMachine: { [key: string]: MaintenanceIssue[] } = {};
      
      filteredAndSortedIssues.forEach(issue => {
        const machineKey = (issue.machine || 'Geral / Não Especificada').trim().toUpperCase();
        if (!groupedByMachine[machineKey]) {
          groupedByMachine[machineKey] = [];
        }
        groupedByMachine[machineKey].push(issue);
      });

      const total = filteredAndSortedIssues.length;
      const pending = filteredAndSortedIssues.filter(i => i.status === 'Pendente').length;
      const inProgress = filteredAndSortedIssues.filter(i => i.status === 'Em Andamento').length;
      const resolved = filteredAndSortedIssues.filter(i => i.status === 'Resolvido').length;

      // ----------------------------------------------------
      // 1. BUILD BEAUTIFUL RICH HTML CONTENT FOR CLIPBOARD
      // ----------------------------------------------------
      let htmlText = `<div style="font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.6; max-width: 650px;">`;
      
      // Header Section (Cores Claras, sem barra preta)
      htmlText += `<div style="background-color: #f0f9ff; border: 1px solid #bfdbfe; border-bottom: 3px solid #3b82f6; padding: 20px; border-radius: 12px; margin-bottom: 25px;">`;
      htmlText += `<h2 style="margin: 0 0 5px 0; font-size: 16pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #1e3a8a;">RELATÓRIO DE CONTROLE DE MANUTENÇÃO</h2>`;
      htmlText += `<p style="margin: 0; font-size: 9.5pt; color: #475569; font-weight: normal;">`;
      htmlText += `<strong>GERADO EM:</strong> ${new Date().toLocaleDateString('pt-BR')} ÀS ${new Date().toLocaleTimeString('pt-BR')}`;
      htmlText += `</p>`;
      htmlText += `</div>`;
      
      // Summary Cards (using a small table structure for clean Outlook layout alignment)
      htmlText += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-family: 'Segoe UI', Calibri, Arial, sans-serif;">`;
      htmlText += `<tr>`;
      htmlText += `<td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; width: 25%; text-align: center;">`;
      htmlText += `<div style="font-size: 9pt; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">TOTAL</div>`;
      htmlText += `<div style="font-size: 16pt; color: #0f172a; font-weight: bold;">${total}</div>`;
      htmlText += `</td>`;
      htmlText += `<td style="width: 2%;"></td>`;
      htmlText += `<td style="background-color: #fffaf0; border: 1px solid #fbd38d; border-radius: 8px; padding: 12px; width: 24%; text-align: center;">`;
      htmlText += `<div style="font-size: 9pt; color: #dd6b20; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">PENDENTES</div>`;
      htmlText += `<div style="font-size: 16pt; color: #dd6b20; font-weight: bold;">${pending}</div>`;
      htmlText += `</td>`;
      htmlText += `<td style="width: 2%;"></td>`;
      htmlText += `<td style="background-color: #ebf8ff; border: 1px solid #90cdf4; border-radius: 8px; padding: 12px; width: 24%; text-align: center;">`;
      htmlText += `<div style="font-size: 9pt; color: #3182ce; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">ANDAMENTO</div>`;
      htmlText += `<div style="font-size: 16pt; color: #3182ce; font-weight: bold;">${inProgress}</div>`;
      htmlText += `</td>`;
      htmlText += `<td style="width: 2%;"></td>`;
      htmlText += `<td style="background-color: #f0fff4; border: 1px solid #9ae6b4; border-radius: 8px; padding: 12px; width: 23%; text-align: center;">`;
      htmlText += `<div style="font-size: 9pt; color: #38a169; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">RESOLVIDOS</div>`;
      htmlText += `<div style="font-size: 16pt; color: #38a169; font-weight: bold;">${resolved}</div>`;
      htmlText += `</td>`;
      htmlText += `</tr>`;
      htmlText += `</table>`;

      // Group title
      htmlText += `<h3 style="color: #0f172a; font-size: 12pt; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 20px; text-transform: uppercase; font-weight: bold;">`;
      htmlText += `OCORRÊNCIAS AGRUPADAS POR MÁQUINA / EQUIPAMENTO`;
      htmlText += `</h3>`;

      Object.entries(groupedByMachine).forEach(([machine, issues]) => {
        htmlText += `<div style="margin-bottom: 30px; border-left: 4px solid #3b82f6; padding-left: 15px;">`;
        htmlText += `<h4 style="margin: 0 0 12px 0; color: #1e3a8a; font-size: 11pt; font-weight: bold; text-transform: uppercase; background-color: #eff6ff; padding: 6px 12px; border-radius: 6px; display: inline-block;">`;
        htmlText += `MÁQUINA: ${machine}`;
        htmlText += `</h4>`;
        
        issues.forEach((issue, idx) => {
          const titleUpper = (issue.title || '').toUpperCase();
          const statusUpper = (issue.status || 'PENDENTE').toUpperCase();
          const priorityUpper = (issue.priority || 'MÉDIA').toUpperCase();
          const dateStr = new Date(issue.createdAt).toLocaleDateString('pt-BR');
          
          // Color mapping for status
          let statusColor = '#475569'; // gray
          if (issue.status === 'Pendente') statusColor = '#ea580c'; // orange
          else if (issue.status === 'Em Andamento') statusColor = '#2563eb'; // blue
          else if (issue.status === 'Resolvido') statusColor = '#16a34a'; // green

          // Color mapping for priority
          let priorityColor = '#475569';
          if (issue.priority === 'Crítica') priorityColor = '#dc2626'; // red
          else if (issue.priority === 'Alta') priorityColor = '#d97706'; // amber
          else if (issue.priority === 'Média') priorityColor = '#2563eb'; // blue

          htmlText += `<div style="margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px dashed #e2e8f0;">`;
          htmlText += `<div style="font-weight: bold; color: #0f172a; font-size: 10.5pt; margin-bottom: 4px;">`;
          htmlText += `&nbsp;&nbsp;${idx + 1}. TÍTULO: ${titleUpper}`;
          htmlText += `</div>`;
          
          htmlText += `<div style="font-size: 9.5pt; color: #475569; margin-left: 15px; margin-bottom: 6px;">`;
          htmlText += `<strong>STATUS:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusUpper}</span> | `;
          htmlText += `<strong>PRIORIDADE:</strong> <span style="color: ${priorityColor}; font-weight: bold;">${priorityUpper}</span> | `;
          htmlText += `<strong>SETOR:</strong> ${issue.sector || 'Não especificado'}`;
          htmlText += `</div>`;

          htmlText += `<div style="font-size: 9.5pt; color: #64748b; margin-left: 15px; margin-bottom: 8px;">`;
          htmlText += `<strong>RELATADO POR:</strong> ${issue.reporter || 'Não especificado'} em ${dateStr}`;
          htmlText += `</div>`;

          htmlText += `<div style="font-size: 9.5pt; color: #334155; margin-left: 15px; background-color: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #f1f5f9; margin-top: 5px;">`;
          htmlText += `<strong>DESCRIÇÃO:</strong><br/>`;
          htmlText += `<span style="white-space: pre-line;">${issue.cause || 'Nenhuma descrição fornecida.'}</span>`;
          htmlText += `</div>`;

          const sortedSteps = getSortedProgressUpdates(issue);
          if (sortedSteps.length > 0) {
            htmlText += `<div style="font-size: 9pt; color: #1e40af; margin-left: 15px; background-color: #eff6ff; padding: 10px; border-radius: 6px; border: 1px solid #bfdbfe; margin-top: 8px;">`;
            htmlText += `<strong>LINHA DO TEMPO (ANDAMENTO):</strong><br/>`;
            sortedSteps.forEach((st, sIdx) => {
              htmlText += `<div style="margin-top: 4px;">${sIdx + 1}. [${formatBrDateTime(st.date)} - ${st.author}] ${st.text}</div>`;
            });
            htmlText += `</div>`;
          }

          if (issue.status === 'Resolvido' && issue.solution) {
            htmlText += `<div style="font-size: 9.5pt; color: #065f46; margin-left: 15px; background-color: #ecfdf5; padding: 10px; border-radius: 6px; border: 1px solid #d1fae5; margin-top: 8px;">`;
            htmlText += `<strong>SOLUÇÃO / RESOLUÇÃO:</strong><br/>`;
            htmlText += `<span style="white-space: pre-line;">${issue.solution}</span>`;
            htmlText += `</div>`;
          }

          htmlText += `</div>`;
        });
        htmlText += `</div>`;
      });

      htmlText += `<p style="font-size: 8.5pt; color: #94a3b8; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center;">`;
      htmlText += `Gerado automaticamente via Sistema de Gestão de Produção e Manutenção.`;
      htmlText += `</p>`;
      htmlText += `</div>`;

      // ----------------------------------------------------
      // 2. BUILD CLEAN PLAIN TEXT COPY BACKUP
      // ----------------------------------------------------
      let plainText = `RELATÓRIO DE CONTROLE DE MANUTENÇÃO\n`;
      plainText += `GERADO EM: ${new Date().toLocaleDateString('pt-BR')} ÀS ${new Date().toLocaleTimeString('pt-BR')}\n\n`;
      
      plainText += `==================================================\n`;
      plainText += `RESUMO GERAL DO ESTADO:\n`;
      plainText += `==================================================\n`;
      plainText += `TOTAL DE OCORRÊNCIAS: ${total}\n`;
      plainText += `PENDENTES: ${pending}\n`;
      plainText += `EM ANDAMENTO: ${inProgress}\n`;
      plainText += `RESOLVIDOS: ${resolved}\n\n`;

      plainText += `==================================================\n`;
      plainText += `OCORRÊNCIAS AGRUPADAS POR MÁQUINA / EQUIPAMENTO:\n`;
      plainText += `==================================================\n\n`;

      Object.entries(groupedByMachine).forEach(([machine, issues]) => {
        plainText += `[MÁQUINA: ${machine}]\n`;
        plainText += `--------------------------------------------------\n`;
        
        issues.forEach((issue, idx) => {
          const titleUpper = (issue.title || '').toUpperCase();
          const statusUpper = (issue.status || 'PENDENTE').toUpperCase();
          const priorityUpper = (issue.priority || 'MÉDIA').toUpperCase();
          const dateStr = new Date(issue.createdAt).toLocaleDateString('pt-BR');
          
          plainText += `  ${idx + 1}. TÍTULO: ${titleUpper}\n`;
          plainText += `     STATUS: ${statusUpper} | PRIORIDADE: ${priorityUpper}\n`;
          plainText += `     Setor: ${issue.sector || 'Não especificado'}\n`;
          plainText += `     Relatado por: ${issue.reporter || 'Não especificado'} em ${dateStr}\n`;
          plainText += `     Descrição:\n     ${issue.cause || 'Nenhuma descrição fornecida.'}\n`;
          const sortedStepsPlain = getSortedProgressUpdates(issue);
          if (sortedStepsPlain.length > 0) {
            plainText += `     Andamento (Linha do Tempo):\n`;
            sortedStepsPlain.forEach((st, sIdx) => {
              plainText += `       ${sIdx + 1}. [${formatBrDateTime(st.date)} - ${st.author}] ${st.text}\n`;
            });
          }
          if (issue.status === 'Resolvido' && issue.solution) {
            plainText += `     Solução/Resolução:\n     ${issue.solution}\n`;
          }
          plainText += `\n`;
        });
        plainText += `\n`;
      });

      plainText += `--------------------------------------------------\n`;
      plainText += `Gerado automaticamente via Sistema de Gestão de Produção e Manutenção.\n`;

      // ----------------------------------------------------
      // 3. WRITE BOTH FORMATS TO CLIPBOARD
      // ----------------------------------------------------
      if (navigator.clipboard && window.ClipboardItem) {
        const htmlBlob = new Blob([htmlText], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        
        const item = new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob
        });
        
        await navigator.clipboard.write([item]);
      } else {
        // Simple plain text fallback
        await navigator.clipboard.writeText(plainText);
      }

      // Open the Outlook Modal to show instructions
      setIsOutlookShareModalOpen(true);

    } catch (err) {
      console.error("Erro ao copiar formatação:", err);
      alert("Relatório gerado! O navegador bloqueou a cópia em HTML, mas abriremos o Outlook normalmente.");
      
      // Fallback: just open mailto
      const subject = `RELATÓRIO DE MANUTENÇÃO - GESTÃO DE PRODUÇÃO`;
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}`;
      window.location.href = mailtoUrl;
    }
  };

  const sortIssuesForReport = (list: MaintenanceIssue[]) => {
    return [...list].sort((a, b) => {
      const aIsResolved = a.status === 'Resolvido' ? 1 : 0;
      const bIsResolved = b.status === 'Resolvido' ? 1 : 0;
      if (aIsResolved !== bIsResolved) return aIsResolved - bIsResolved;
      const diff = (priorityValue[b.priority] || 0) - (priorityValue[a.priority] || 0);
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  const resolveLogoForPdf = (
    src: string
  ): Promise<{ dataUrl: string; width: number; height: number; bgColor: [number, number, number] } | null> => {
    return new Promise((resolve) => {
      if (!src) {
        resolve(null);
        return;
      }
      const img = new Image();
      if (!src.startsWith('data:')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => {
        try {
          const w = img.naturalWidth || img.width || 120;
          const h = img.naturalHeight || img.height || 120;
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);

          let bgColor: [number, number, number] = [255, 255, 255];
          try {
            const imgData = ctx.getImageData(0, 0, w, h).data;
            const samplePixel = (px: number, py: number): [number, number, number, number] => {
              const cx = Math.max(0, Math.min(w - 1, px));
              const cy = Math.max(0, Math.min(h - 1, py));
              const idx = (cy * w + cx) * 4;
              return [imgData[idx], imgData[idx + 1], imgData[idx + 2], imgData[idx + 3]];
            };

            const x1 = Math.min(w - 1, 1);
            const y1 = Math.min(h - 1, 1);
            const x2 = Math.max(0, w - 2);
            const y2 = Math.max(0, h - 2);
            const corners = [
              samplePixel(x1, y1),
              samplePixel(x2, y1),
              samplePixel(x1, y2),
              samplePixel(x2, y2),
            ];

            const allOpaque = corners.every((c) => c[3] >= 200);
            if (allOpaque) {
              const rVals = corners.map((c) => c[0]);
              const gVals = corners.map((c) => c[1]);
              const bVals = corners.map((c) => c[2]);
              const uniform =
                Math.max(...rVals) - Math.min(...rVals) <= 25 &&
                Math.max(...gVals) - Math.min(...gVals) <= 25 &&
                Math.max(...bVals) - Math.min(...bVals) <= 25;
              if (uniform) {
                const avgR = Math.round(rVals.reduce((s, v) => s + v, 0) / 4);
                const avgG = Math.round(gVals.reduce((s, v) => s + v, 0) / 4);
                const avgB = Math.round(bVals.reduce((s, v) => s + v, 0) / 4);
                if (avgR >= 242 && avgG >= 242 && avgB >= 242) {
                  bgColor = [255, 255, 255];
                } else {
                  bgColor = [avgR, avgG, avgB];
                }
              }
            } else {
              // Transparent corners: keep crisp white header unless the foreground logo itself is nearly all-white
              const step = Math.max(1, Math.floor((w * h) / 2500));
              let lumSum = 0;
              let opaqueCount = 0;
              for (let i = 0; i < imgData.length; i += 4 * step) {
                if (imgData[i + 3] > 128) {
                  lumSum += 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
                  opaqueCount += 1;
                }
              }
              if (opaqueCount > 0 && lumSum / opaqueCount > 225) {
                bgColor = [15, 23, 42];
              }
            }
          } catch {
            bgColor = [255, 255, 255];
          }

          resolve({ dataUrl: canvas.toDataURL('image/png'), width: w, height: h, bgColor });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  };

  // Geração completa do PDF das solicitações selecionadas, incluindo logo da empresa e todas as etapas do andamento
  const generateMaintenancePDF = async (targetIssues: MaintenanceIssue[]) => {
    if (!targetIssues || targetIssues.length === 0) {
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const doc = new jsPDF('p', 'mm', 'a4');

      const fallbackLogo = 'https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png';
      const logoSrc =
        systemLogo ||
        (typeof window !== 'undefined' ? localStorage.getItem('manupackaging_system_logo') : null) ||
        fallbackLogo;
      const loadedLogo = await resolveLogoForPdf(logoSrc);
      const companyLabel = (systemName || 'MANUPACKAGING').trim().toUpperCase();

      // 1. Cabeçalho adaptado exatamente à cor de fundo da logo (sem moldura/quadrado)
      const headerBg: [number, number, number] = loadedLogo ? loadedLogo.bgColor : [255, 255, 255];
      const headerLum = 0.299 * headerBg[0] + 0.587 * headerBg[1] + 0.114 * headerBg[2];
      const isLightHeader = headerLum > 165;

      doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
      doc.rect(0, 0, 210, 38, 'F');

      if (isLightHeader) {
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 210, 2.5, 'F');
      }

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      if (isLightHeader) {
        doc.setTextColor(37, 99, 235);
      } else {
        doc.setTextColor(191, 219, 254);
      }
      doc.text(companyLabel, 15, 11.5);

      doc.setTextColor(isLightHeader ? 15 : 255, isLightHeader ? 23 : 255, isLightHeader ? 42 : 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('RELATÓRIO DE SOLICITAÇÕES DE MANUTENÇÃO', 15, 19);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      if (isLightHeader) {
        doc.setTextColor(100, 116, 139);
      } else {
        doc.setTextColor(226, 232, 240);
      }
      doc.text(
        `GERADO EM: ${new Date().toLocaleDateString('pt-BR')} ÀS ${new Date().toLocaleTimeString('pt-BR')}`,
        15,
        26
      );
      doc.text(
        `SOLICITAÇÕES EXPORTADAS: ${targetIssues.length} ${targetIssues.length === 1 ? 'SOLICITAÇÃO' : 'SOLICITAÇÕES'}`,
        15,
        31.5
      );

      // Logo inserido diretamente no cabeçalho na mesma cor de fundo
      const boxX = 158;
      const boxY = 5;
      const boxW = 37;
      const boxH = 28;

      if (loadedLogo) {
        const ratio = Math.min(boxW / loadedLogo.width, boxH / loadedLogo.height);
        const drawW = loadedLogo.width * ratio;
        const drawH = loadedLogo.height * ratio;
        const drawX = boxX + (boxW - drawW);
        const drawY = boxY + (boxH - drawH) / 2;
        doc.addImage(loadedLogo.dataUrl, 'PNG', drawX, drawY, drawW, drawH);
      } else if (logoSrc) {
        try {
          doc.addImage(logoSrc, 'PNG', boxX + 4, boxY + 2, boxW - 4, boxH - 4);
        } catch (logoErr) {
          console.warn('Não foi possível renderizar o logo no PDF:', logoErr);
        }
      }

      doc.setFillColor(isLightHeader ? 37 : 59, isLightHeader ? 99 : 130, isLightHeader ? 235 : 246);
      doc.rect(0, 38, 210, isLightHeader ? 1.2 : 1.5, 'F');

      let currentY = 48;

      // 2. Resumo estatístico do conjunto exportado
      const totalIssues = targetIssues.length;
      const criticalCount = targetIssues.filter((i) => i.priority === 'Crítica').length;
      const pendingCount = targetIssues.filter((i) => i.status === 'Pendente').length;
      const inProgressCount = targetIssues.filter((i) => i.status === 'Em Andamento').length;
      const resolvedCount = targetIssues.filter((i) => i.status === 'Resolvido').length;

      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text('RESUMO DAS SOLICITAÇÕES EXPORTADAS', 15, currentY);

      currentY += 6;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text(`TOTAL: ${totalIssues}`, 15, currentY);
      doc.setTextColor(220, 38, 38);
      doc.text(`CRÍTICAS: ${criticalCount}`, 45, currentY);
      doc.setTextColor(234, 88, 12);
      doc.text(`PENDENTES: ${pendingCount}`, 78, currentY);
      doc.setTextColor(37, 99, 235);
      doc.text(`EM ANDAMENTO: ${inProgressCount}`, 115, currentY);
      doc.setTextColor(5, 150, 105);
      doc.text(`CONCLUÍDAS: ${resolvedCount}`, 158, currentY);

      currentY += 5;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(15, currentY, 195, currentY);
      currentY += 7;

      // 3. Ficha detalhada de cada solicitação + todas as etapas de andamento
      targetIssues.forEach((issue, idx) => {
        if (currentY > 245) {
          doc.addPage();
          currentY = 18;
        }

        const titleUpper = (issue.title || generateTitleFromCause(issue.cause) || 'SOLICITAÇÃO').toUpperCase();
        const priorityUpper = (issue.priority || 'MÉDIA').toUpperCase();
        const statusUpper = (issue.status || 'PENDENTE').toUpperCase();
        const sectorUpper = (issue.sector || 'GERAL').toUpperCase();
        const machineUpper = (issue.machine || 'GERAL / NENHUMA').toUpperCase();
        const openedStr = formatBrDateTime(issue.createdAt);
        const resolvedStr = issue.resolvedAt ? formatBrDateTime(issue.resolvedAt) : '';
        const sortedSteps = getSortedProgressUpdates(issue);

        const headerFill: [number, number, number] =
          issue.priority === 'Crítica'
            ? [185, 28, 28]
            : issue.priority === 'Alta'
            ? [194, 65, 12]
            : issue.status === 'Resolvido'
            ? [5, 150, 105]
            : [15, 23, 42];

        const priorityTextColor: [number, number, number] =
          issue.priority === 'Crítica'
            ? [185, 28, 28]
            : issue.priority === 'Alta'
            ? [194, 65, 12]
            : issue.priority === 'Média'
            ? [37, 99, 235]
            : [5, 150, 105];

        const stepsContent =
          sortedSteps.length > 0
            ? sortedSteps
                .map(
                  (st, sIdx) =>
                    `Etapa ${sIdx + 1} (${formatBrDateTime(st.date)} • ${st.author}):\n${st.text}`
                )
                .join('\n\n')
            : 'Nenhuma etapa de andamento registrada.';

        const bodyRows: any[] = [
          [
            { content: 'PRIORIDADE / STATUS', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
            {
              content: `Prioridade: ${priorityUpper}   |   Status: ${statusUpper}`,
              styles: {
                fontStyle: 'bold',
                textColor: priorityTextColor,
                fillColor: issue.priority === 'Crítica' ? [254, 242, 242] : [255, 255, 255]
              }
            }
          ],
          [
            { content: 'SETOR / EQUIPAMENTO', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
            `Setor: ${sectorUpper}   |   Máquina/Equipamento: ${machineUpper}`
          ],
          [
            { content: 'SOLICITANTE / DATAS', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
            `Solicitante: ${issue.reporter || 'Não especificado'}   |   Abertura: ${openedStr}${
              resolvedStr ? `   |   Conclusão: ${resolvedStr}` : ''
            }`
          ],
          [
            { content: 'DESCRIÇÃO / CAUSA', styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
            `${issue.cause || 'Sem descrição informada.'}${
              issue.notes ? `\n\nObservações adicionais: ${issue.notes}` : ''
            }`
          ],
          [
            {
              content: `ANDAMENTO\n(${sortedSteps.length} ${sortedSteps.length === 1 ? 'etapa' : 'etapas'})`,
              styles: { fontStyle: 'bold', fillColor: [239, 246, 255], textColor: [30, 64, 175] }
            },
            {
              content: stepsContent,
              styles: {
                fillColor: sortedSteps.length > 0 ? [248, 250, 252] : [255, 255, 255],
                textColor: sortedSteps.length > 0 ? [30, 41, 59] : [148, 163, 184]
              }
            }
          ]
        ];

        if (issue.status === 'Resolvido' || issue.solution) {
          bodyRows.push([
            {
              content: 'NOTA DE RESOLUÇÃO',
              styles: { fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [6, 95, 70] }
            },
            {
              content: issue.solution || 'Solicitação concluída sem notas adicionais.',
              styles: { fillColor: [240, 253, 244], textColor: [6, 95, 70] }
            }
          ]);
        }

        autoTable(doc, {
          startY: currentY,
          head: [
            [
              {
                content: `#${idx + 1} — ${titleUpper}`,
                colSpan: 2,
                styles: {
                  fillColor: headerFill,
                  textColor: [255, 255, 255],
                  fontSize: 9,
                  fontStyle: 'bold',
                  cellPadding: 3.5
                }
              }
            ]
          ],
          body: bodyRows,
          theme: 'grid',
          columnStyles: {
            0: { cellWidth: 42, fontSize: 7.5, textColor: [71, 85, 105] },
            1: { cellWidth: 138, fontSize: 8.2, textColor: [30, 41, 59] }
          },
          styles: {
            overflow: 'linebreak',
            font: 'Helvetica',
            cellPadding: 3,
            lineColor: [226, 232, 240],
            lineWidth: 0.25,
            valign: 'top'
          },
          margin: { left: 15, right: 15, bottom: 20 }
        });

        currentY = ((doc as any).lastAutoTable?.finalY || currentY) + 6;
      });

      // Rodapé em todas as páginas
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.setDrawColor(241, 245, 249);
        doc.line(15, 282, 195, 282);
        doc.text('SISTEMA DE GESTÃO DE PRODUÇÃO E MANUTENÇÃO', 15, 288);
        doc.text(`Página ${p} de ${totalPages}`, 195, 288, { align: 'right' });
      }

      setPdfModal({
        isOpen: true,
        doc,
        filename: `Relatorio_Manutencao_${new Date().toISOString().split('T')[0]}.pdf`,
        title: totalIssues === 1 ? 'Relatório da Solicitação de Manutenção' : 'Relatório de Manutenção'
      });

      setPdfModalError(null);
      setIsExportPdfModalOpen(false);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      setPdfModalError('Houve um erro ao gerar o PDF. Por favor, tente novamente.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExportSelectedNow = () => {
    const selectedList = sortIssuesForReport(
      issues.filter((i) => selectedIssueIds.includes(i.id))
    );
    if (selectedList.length === 0) return;
    generateMaintenancePDF(selectedList);
  };

  const exportPDFWithSettings = async () => {
    setPdfModalError(null);
    const selectedList = sortIssuesForReport(
      issues.filter((i) => selectedIssueIds.includes(i.id))
    );
    if (selectedList.length === 0) {
      setPdfModalError('Selecione pelo menos uma solicitação para gerar o PDF.');
      return;
    }
    await generateMaintenancePDF(selectedList);
  };

  const renderVerticalTimeline = (issue: MaintenanceIssue, inModal = false) => {
    const sortedSteps = getSortedProgressUpdates(issue);
    const isResolved = issue.status === 'Resolvido';
    const resolvedDateStr = issue.resolvedAt ? formatBrDateTime(issue.resolvedAt) : '';
    const isExpanded = inModal || !!expandedTimelineIssueIds[issue.id];
    const etapasLabel = `${sortedSteps.length} ${sortedSteps.length === 1 ? 'etapa realizada' : 'etapas realizadas'}`;

    const toggleExpand = () => {
      if (inModal) return;
      setExpandedTimelineIssueIds((prev) => {
        const nextVal = !prev[issue.id];
        if (!nextVal) {
          // Limpa seleção ao recolher
          setSelectedTimelineStepKey((cur) => (cur?.startsWith(`${issue.id}:`) ? null : cur));
          setEditingStepKey((cur) => (cur?.startsWith(`${issue.id}:`) ? null : cur));
          setConfirmDeleteStepKey((cur) => (cur?.startsWith(`${issue.id}:`) ? null : cur));
        }
        return { ...prev, [issue.id]: nextVal };
      });
    };

    return (
      <div className={inModal ? 'space-y-4' : 'w-full bg-slate-50/80 border border-slate-200/80 rounded-2xl p-3.5 md:p-4 space-y-3'}>
        <div
          onClick={!inModal ? toggleExpand : undefined}
          className={`flex flex-wrap items-center justify-between gap-2 ${!inModal ? 'cursor-pointer select-none' : ''}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <History size={14} className={isResolved ? 'text-emerald-600' : 'text-blue-600'} />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
              Em Andamento
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isResolved ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
              {etapasLabel}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {!isReadOnly && sortedSteps.length > 0 && isExpanded && (
              <span className="text-[9px] font-bold text-slate-400">
                Clique na etapa para editar ou excluir
              </span>
            )}
            {!inModal && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand();
                }}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1 transition-all cursor-pointer"
              >
                <span>{isExpanded ? 'Recolher' : 'Expandir'}</span>
                {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="relative pl-6 space-y-3 pt-1">
            {/* Vertical connecting rail */}
            <div
              className={`absolute left-[11px] top-3 bottom-2 w-0.5 ${
                isResolved ? 'bg-emerald-200' : 'bg-blue-200'
              }`}
            />

            {/* Opening Step (shown in modal) */}
            {inModal && (
              <div className="relative">
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[9px] font-black ring-4 ring-white">
                  0
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 font-bold mb-1">
                    <span className="uppercase tracking-wider text-slate-700 font-black">Abertura da Solicitação</span>
                    <span>{formatBrDateTime(issue.createdAt)} • {issue.reporter}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{issue.cause}</p>
                </div>
              </div>
            )}

            {sortedSteps.length === 0 && (
              <div className="relative">
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-blue-100 text-blue-600 border border-blue-300 flex items-center justify-center text-[9px] font-black ring-4 ring-white">
                  •
                </div>
                <div className="bg-white border border-dashed border-blue-200 rounded-xl p-3 text-xs text-slate-500">
                  Nenhuma etapa registrada ainda. Adicione a primeira etapa abaixo.
                </div>
              </div>
            )}

            {sortedSteps.map((step, index) => {
              const stepKey = `${issue.id}:${step.id}`;
              const isSelected = selectedTimelineStepKey === stepKey;
              const isEditing = editingStepKey === stepKey;
              const isConfirmingDelete = confirmDeleteStepKey === stepKey;

              return (
                <div key={step.id} className="relative">
                  <div
                    className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black ring-4 ring-white shadow-xs ${
                      isResolved
                        ? 'bg-emerald-600 text-white'
                        : isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {index + 1}
                  </div>

                  <div
                    onClick={() => {
                      if (isEditing) return;
                      setSelectedTimelineStepKey((prev) => (prev === stepKey ? null : stepKey));
                      setConfirmDeleteStepKey(null);
                    }}
                    className={`rounded-xl border p-3 transition-all ${
                      isEditing
                        ? 'bg-white border-blue-400 ring-2 ring-blue-100'
                        : isSelected
                        ? 'bg-blue-50/70 border-blue-300 shadow-xs cursor-pointer'
                        : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 cursor-pointer'
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                            Editar Etapa #{index + 1}
                          </span>
                          <input
                            type="datetime-local"
                            value={editStepDate}
                            onChange={(e) => setEditStepDate(e.target.value)}
                            className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700"
                          />
                        </div>
                        <textarea
                          rows={2}
                          value={editStepText}
                          onChange={(e) => setEditStepText(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Descreva a observação atualizada..."
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingStepKey(null)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={isUpdatingStep || !editStepText.trim()}
                            onClick={() => handleSaveEditStep(issue, step.id)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
                          >
                            <Check size={12} />
                            <span>Salvar</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                            <Calendar size={11} className="text-blue-500" />
                            <span className="text-slate-700">{formatBrDateTime(step.date)}</span>
                            <span>•</span>
                            <span className="text-blue-700 font-black uppercase">{step.author}</span>
                            {step.updatedAt && (
                              <span className="text-[9px] text-slate-400 italic">(editado)</span>
                            )}
                          </div>
                          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                            Etapa {index + 1}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {step.text}
                        </p>

                        {isSelected && !isReadOnly && (
                          <div
                            className="mt-2.5 pt-2 border-t border-blue-200/70 flex flex-wrap items-center justify-end gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isConfirmingDelete ? (
                              <>
                                <span className="text-[10px] font-bold text-red-600 mr-auto">
                                  Confirmar exclusão desta etapa?
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteStepKey(null)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase cursor-pointer"
                                >
                                  Não
                                </button>
                                <button
                                  type="button"
                                  disabled={isUpdatingStep}
                                  onClick={() => handleDeleteStep(issue, step.id)}
                                  className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer"
                                >
                                  Sim, Excluir
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditStep(issue.id, step)}
                                  className="px-2.5 py-1 bg-white hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <Edit2 size={11} />
                                  <span>Editar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteStepKey(stepKey)}
                                  className="px-2.5 py-1 bg-white hover:bg-red-600 hover:text-white text-red-600 border border-red-200 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <Trash2 size={11} />
                                  <span>Excluir</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Final resolution node on vertical timeline */}
            {isResolved && (
              <div className="relative">
                <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-4 ring-white shadow-xs">
                  <Check size={11} />
                </div>
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                      Conclusão Final
                    </span>
                    {resolvedDateStr && (
                      <span className="text-[10px] font-bold text-emerald-700">{resolvedDateStr}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {issue.solution || 'Solicitação concluída sem notas adicionais.'}
                  </p>
                </div>
              </div>
            )}

            {/* Add next step button directly inside card timeline */}
            {!isResolved && !inModal && !isReadOnly && (
              <div className="relative pt-0.5">
                <div className="absolute -left-6 top-2 w-5 h-5 rounded-full bg-blue-100 border-2 border-blue-500 text-blue-600 flex items-center justify-center ring-4 ring-white">
                  <Plus size={11} />
                </div>
                <button
                  type="button"
                  onClick={() => openProgressModal(issue)}
                  className="w-full text-left px-3 py-2 rounded-xl border border-dashed border-blue-300 bg-blue-50/40 hover:bg-blue-50 text-blue-700 text-[11px] font-black uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer"
                >
                  <span>+ Adicionar próxima etapa</span>
                  <span className="text-[10px] font-bold text-blue-500">Em Andamento</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="maintenance-tab-content" className="space-y-6 animate-in fade-in duration-500 p-1">
      
      {/* Sub-navegação interna de Manutenção */}
      <div className="bg-white p-2 rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 max-w-2xl mx-auto">
        {allowRequestsView && (
          <button
            type="button"
            onClick={() => setActiveSubTab('causes')}
            className={`flex-1 py-2.5 px-4 rounded-xl sm:rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'causes'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Wrench size={15} />
            <span>Solicitações de Manutenção</span>
          </button>
        )}

        {allowAnalyticsView && (
          <button
            type="button"
            onClick={() => setActiveSubTab('analytics')}
            className={`flex-1 py-2.5 px-4 rounded-xl sm:rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'analytics'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 size={15} />
            <span>Paradas &amp; Disponibilidade</span>
          </button>
        )}
      </div>

      {activeSubTab === 'analytics' ? (
        <MaintenanceDowntimeAnalyticsView
          productionData={productionData}
          ribbonEntries={ribbonEntries}
          availableShifts={availableShifts}
          dashboardMonth={dashboardMonth}
          systemLogo={systemLogo}
          systemName={systemName}
          loggedUserName={loggedUser?.name}
          loggedUserRole={loggedUser?.role}
        />
      ) : (
        <>
          {/* Banner / Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-[2.5rem] p-8 md:p-10 text-white shadow-xl relative overflow-hidden border border-slate-700">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase">
              Solicitações de Manutenção
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-2xl font-medium">
              Central única de abertura de solicitações, acompanhamento de execução (Pendente, Em Andamento, Concluído) e registro técnico das soluções aplicadas pela manutenção.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 banner-actions-group">
            {allowCreateButton && (
              <button
                onClick={() => {
                  setEditingIssue(null);
                  setFormTitle('');
                  setFormCause('');
                  setFormPriority('Média');
                  setFormSector('');
                  setFormMachine('');
                  setFormReporter(loggedUser?.name || '');
                  setIsAddModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider px-6 py-4 rounded-2xl flex items-center gap-2.5 shadow-lg shadow-blue-500/20 transition-all border border-blue-500 cursor-pointer"
              >
                <Plus size={16} />
                <span>Nova Solicitação</span>
              </button>
            )}
            {allowMachineStopsButton && (
              <button
                type="button"
                onClick={() => setIsProportionalStopsModalOpen(true)}
                className="bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider px-6 py-4 rounded-2xl flex items-center gap-2.5 shadow-lg shadow-rose-500/20 transition-all border border-rose-500 cursor-pointer"
                title="Abrir gráfico proporcional de paradas (100%) de Extrusão e Corte de Fita"
              >
                <BarChart3 size={16} />
                <span>Paradas de Máquina (100%)</span>
              </button>
            )}
            {allowExportPdfButton && selectedIssueIds.length > 0 && (
              <button
                type="button"
                onClick={handleExportSelectedNow}
                disabled={isGeneratingPdf}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider px-6 py-4 rounded-2xl flex items-center gap-2.5 transition-all border border-emerald-500 shadow-lg shadow-emerald-500/20 cursor-pointer"
                title="Gerar PDF imediatamente com as solicitações marcadas"
              >
                <Download size={16} />
                <span>Gerar PDF das Selecionadas ({selectedIssueIds.length})</span>
              </button>
            )}
            {allowExportPdfButton && (
              <button
                type="button"
                onClick={openExportPdfModal}
                className="bg-slate-700 hover:bg-slate-600 text-white font-black text-xs uppercase tracking-wider px-6 py-4 rounded-2xl flex items-center gap-2.5 transition-all border border-slate-600 cursor-pointer"
              >
                <Download size={16} />
                <span>Exportar PDF</span>
              </button>
            )}
            {allowSendOutlookButton && (
              <button
                onClick={shareViaOutlook}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider px-6 py-4 rounded-2xl flex items-center gap-2.5 transition-all border border-indigo-500 shadow-lg shadow-indigo-500/20 cursor-pointer"
                title="Compartilhar lista filtrada de causas agrupada por máquina via Outlook"
              >
                <Mail size={16} />
                <span>Enviar por Outlook</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>
      </div>

      {/* Dashboard / Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPI Summary Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {/* Card Total */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total de Solicitações</span>
              <div className="p-2 bg-slate-50 text-slate-600 rounded-xl">
                <FileText size={16} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-slate-800">{stats.total}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">100% registradas</p>
            </div>
          </div>

          {/* Card Resolvidas */}
          <div className="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Resolvidas</span>
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-emerald-900">{stats.resolved}</h3>
              <p className="text-[10px] text-emerald-600 font-bold uppercase mt-1">{stats.resolvedPct}% do total</p>
            </div>
          </div>

          {/* Card Pendentes */}
          <div className="bg-orange-50/50 p-5 rounded-3xl border border-orange-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-800">Pendentes</span>
              <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                <Clock size={16} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-orange-900">{stats.pending}</h3>
              <p className="text-[10px] text-orange-600 font-bold uppercase mt-1">{stats.pendingPct}% do total</p>
            </div>
          </div>

          {/* Card Em Andamento */}
          <div className="bg-blue-50/50 p-5 rounded-3xl border border-blue-100 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-800">Em Andamento</span>
              <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                <Settings size={16} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-blue-900">{stats.inProgress}</h3>
              <p className="text-[10px] text-blue-600 font-bold uppercase mt-1">{stats.inProgressPct}% do total</p>
            </div>
          </div>
        </div>

        {/* Donut Chart Visualizer */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-50">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Distribuição Percentual</h3>
            <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase">Status</span>
          </div>
          
          <div className="h-[180px] w-full flex items-center justify-center mt-2 relative">
            {stats.total === 0 ? (
              <div className="text-center space-y-1">
                <HelpCircle className="text-slate-300 mx-auto" size={32} />
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Sem dados de causas</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any, name: any, props: any) => [
                      `${value} (${props.payload.percentage}%)`, 
                      name
                    ]}
                    contentStyle={{ background: '#0f172a', borderRadius: '1rem', border: 'none', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            
            {/* Center Label for Donut */}
            {stats.total > 0 && (
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-slate-800">{stats.total}</span>
                <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Total</span>
              </div>
            )}
          </div>

          {/* Custom Legends */}
          <div className="flex justify-center gap-4 text-[10px] font-bold mt-2">
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              <span>Pendente</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>Ativo</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Resolvido</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter panel */}
      <div id="maintenance-filters-card" className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-50">
          <Filter className="text-blue-500" size={18} />
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
            Filtros & Busca
          </h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Buscar por causa, máquina..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700"
            />
          </div>

          {/* Status filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700 font-bold"
            >
              <option value="Todos">Status: Todos</option>
              <option value="Pendente">Pendente</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Resolvido">Resolvido</option>
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700 font-bold"
            >
              <option value="Todos">Prioridade: Todas</option>
              <option value="Crítica">Crítica (Urgente)</option>
              <option value="Alta">Alta</option>
              <option value="Média">Média</option>
              <option value="Baixa">Baixa</option>
            </select>
          </div>

          {/* Sector filter */}
          <div>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700 font-bold"
            >
              <option value="Todos">Setor: Todos</option>
              {sectors.map((sec) => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Abas Rápidas de Status (Pendentes, Em Andamento, Concluídas) */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap gap-2">
        {[
          { value: 'Todos' as const, label: 'Todas', count: issues.length, activeClass: 'bg-slate-900 text-white shadow-sm' },
          { value: 'Pendente' as const, label: 'Pendentes', count: issues.filter(i => i.status === 'Pendente').length, activeClass: 'bg-orange-500 text-white shadow-sm' },
          { value: 'Em Andamento' as const, label: 'Em Andamento', count: issues.filter(i => i.status === 'Em Andamento').length, activeClass: 'bg-blue-600 text-white shadow-sm' },
          { value: 'Resolvido' as const, label: 'Concluídas', count: issues.filter(i => i.status === 'Resolvido').length, activeClass: 'bg-emerald-600 text-white shadow-sm' },
        ].map((tab) => {
          const isActive = statusFilter === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              className={`flex-1 min-w-[130px] py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? tab.activeClass
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Barra de Seleção Múltipla para PDF (aparece assim que selecionar uma ou mais solicitações) */}
      {allowExportPdfButton && selectedIssueIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 md:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider">
              {selectedIssueIds.length} {selectedIssueIds.length === 1 ? 'selecionada' : 'selecionadas'}
            </span>
            <span className="text-xs font-bold text-blue-950">
              Solicitações marcadas para exportar em PDF com todas as informações e etapas do andamento
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {filteredAndSortedIssues.some((i) => !selectedIssueIds.includes(i.id)) && (
              <button
                type="button"
                onClick={() =>
                  setSelectedIssueIds((prev) =>
                    Array.from(new Set([...prev, ...filteredAndSortedIssues.map((i) => i.id)]))
                  )
                }
                className="px-3 py-2 bg-white hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Selecionar Todas Visíveis ({filteredAndSortedIssues.length})
              </button>
            )}
            <button
              type="button"
              onClick={clearIssueSelection}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              Limpar Seleção
            </button>
            <button
              type="button"
              onClick={handleExportSelectedNow}
              disabled={isGeneratingPdf}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Download size={13} />
              <span>Gerar PDF das Selecionadas ({selectedIssueIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Table / Grid of Causes */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Carregando Causas de Manutenção...</span>
        </div>
      ) : filteredAndSortedIssues.length === 0 ? (
        <div className="bg-slate-50 rounded-[2rem] p-12 text-center border border-slate-100 flex flex-col items-center justify-center gap-4">
          <HelpCircle size={48} className="text-slate-300" />
          <div className="space-y-1">
            <h3 className="text-slate-700 font-black text-sm uppercase tracking-wider">Nenhuma solicitação encontrada</h3>
            <p className="text-slate-400 text-xs max-w-sm">
              {allowCreateButton
                ? 'Não há solicitações correspondentes aos filtros selecionados. Tente ajustar os filtros ou crie uma nova solicitação.'
                : 'Não há solicitações correspondentes aos filtros selecionados. Tente ajustar os filtros para visualizar outros registros.'}
            </p>
          </div>
          {allowCreateButton && (
            <button
              onClick={() => {
                setEditingIssue(null);
                setFormTitle('');
                setFormCause('');
                setFormPriority('Média');
                setFormSector('');
                setFormMachine('');
                setFormReporter(loggedUser?.name || '');
                setIsAddModalOpen(true);
              }}
              className="mt-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-wider px-5 py-3 rounded-2xl shadow-md transition-all cursor-pointer"
            >
              Nova Solicitação
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(groupedIssues).map(([sector, machinesGroup]) => (
            <div key={sector} className="bg-slate-50/40 rounded-[2.5rem] p-6 md:p-8 border border-slate-100 space-y-6">
              {/* Sector Header */}
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-blue-600 animate-pulse"></span>
                  <h3 className="text-sm md:text-base font-black uppercase tracking-wider text-slate-800">
                    Setor: {sector}
                  </h3>
                </div>
                <span className="bg-blue-50 text-blue-700 text-[10px] font-black uppercase px-3 py-1 rounded-full border border-blue-100">
                  {Object.values(machinesGroup).flat().length} {Object.values(machinesGroup).flat().length === 1 ? 'pendência' : 'pendências'}
                </span>
              </div>

              {/* Machines inside this sector */}
              <div className="space-y-8 pl-1 md:pl-4">
                {Object.entries(machinesGroup).map(([machine, machineIssues]) => (
                  <div key={machine} className="space-y-4">
                    {/* Machine Sub-Header */}
                    <div className="flex items-center gap-2">
                      <Settings className="text-slate-400 w-4 h-4 animate-spin-slow" style={{ animationDuration: '8s' }} />
                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                        Equipamento: <span className="text-slate-900 font-black">{machine}</span>
                      </h4>
                      <span className="bg-slate-200/80 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-lg font-mono">
                        {machineIssues.length}
                      </span>
                    </div>

                    {/* Cards grid of this machine */}
                    <div className="grid grid-cols-1 gap-4">
                      <AnimatePresence mode="popLayout">
                        {machineIssues.map((issue) => {
                          const dateStr = new Date(issue.createdAt).toLocaleDateString('pt-BR');
                          const resolvedDateStr = issue.resolvedAt ? new Date(issue.resolvedAt).toLocaleDateString('pt-BR') : '';
                          const StatusIcon = statusColors[issue.status]?.icon || Clock;
                          const isResolved = issue.status === 'Resolvido';
                          const isSelectedForPdf = selectedIssueIds.includes(issue.id);

                          return (
                            <motion.div
                              layout
                              key={issue.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className={`bg-white rounded-3xl p-5 md:p-6 border transition-all duration-300 shadow-sm flex flex-col gap-4 ${
                                isSelectedForPdf
                                  ? 'border-blue-400 ring-2 ring-blue-500/20 bg-blue-50/15'
                                  : isResolved
                                  ? 'border-emerald-100 bg-emerald-50/20 opacity-85'
                                  : 'border-slate-100 hover:shadow-md'
                              }`}
                            >
                              {/* Top Content: Checkbox (para PDF) + Info */}
                              <div className="flex items-start gap-4 w-full">
                                {allowExportPdfButton && (
                                  <button
                                    type="button"
                                    onClick={() => toggleIssueSelection(issue.id)}
                                    title={
                                      isSelectedForPdf
                                        ? 'Desmarcar solicitação'
                                        : 'Selecionar solicitação para exportar em PDF'
                                    }
                                    className="mt-1 shrink-0 text-slate-400 hover:text-blue-600 transition-all focus:outline-none cursor-pointer"
                                  >
                                    {isSelectedForPdf ? (
                                      <CheckSquare className="w-6 h-6 text-blue-600" />
                                    ) : (
                                      <Square className="w-6 h-6 hover:scale-105" />
                                    )}
                                  </button>
                                )}

                                <div className="space-y-2.5 flex-1 min-w-0">
                                  {/* Priority and Area Tags */}
                                  <div className="flex flex-wrap gap-2 items-center">
                                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${priorityColors[issue.priority]?.bg}`}>
                                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${priorityColors[issue.priority]?.dot}`}></span>
                                      {issue.priority}
                                    </span>
                                    
                                    <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                                      {issue.sector}
                                    </span>

                                    <span className="px-2.5 py-1 text-[9px] font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                                      {issue.machine}
                                    </span>

                                    <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 ${statusColors[issue.status]?.text} ${statusColors[issue.status]?.bg}`}>
                                      <StatusIcon size={12} />
                                      {issue.status}
                                    </span>
                                  </div>

                                  {/* Title and Cause Description */}
                                  <div className="space-y-1">
                                    <h3 className={`text-sm md:text-base font-black text-slate-850 leading-snug ${isResolved ? 'line-through text-slate-400' : ''}`}>
                                      {issue.title || generateTitleFromCause(issue.cause)}
                                    </h3>
                                    {issue.title && issue.title !== issue.cause && (
                                      <p className={`text-xs md:text-sm text-slate-500 whitespace-pre-wrap leading-relaxed ${isResolved ? 'line-through text-slate-400' : ''}`}>
                                        {issue.cause}
                                      </p>
                                    )}
                                  </div>

                                  {/* Footer Info: Reporter, Dates */}
                                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400 font-medium">
                                    <span>Por: <strong className="text-slate-500">{issue.reporter}</strong></span>
                                    <span>Aberto em: <strong>{dateStr}</strong></span>
                                    {isResolved && issue.resolvedAt && (
                                      <span className="text-emerald-600">Resolvido em: <strong>{resolvedDateStr}</strong></span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Horizontal Actions Bar (below requester info, above timeline) */}
                              <div className="maintenance-card-actions flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100 w-full">
                                <div className="flex flex-wrap gap-2 items-center">
                                  {!isResolved && (
                                    <>
                                      <button
                                        onClick={() => handleUpdateStatus(issue.id, 'Pendente')}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${issue.status === 'Pendente' ? 'bg-slate-200 border-slate-300 text-slate-800 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                                      >
                                        Pendente
                                      </button>
                                      <button
                                        onClick={() => openProgressModal(issue)}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${issue.status === 'Em Andamento' ? 'bg-blue-600 border-blue-700 text-white shadow-sm shadow-blue-500/10' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'}`}
                                        title="Abrir janela de andamento e registrar etapas"
                                      >
                                        Em Andamento
                                      </button>
                                      <button
                                        onClick={() => toggleIssueStatus(issue)}
                                        className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white cursor-pointer"
                                        title="Registrar solução e concluir solicitação"
                                      >
                                        Concluir
                                      </button>
                                    </>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 ml-auto">
                                  <button
                                    onClick={() => handleStartEdit(issue)}
                                    title="Editar Solicitação"
                                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-all border border-slate-200 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                  >
                                    <Edit2 size={13} />
                                    <span>Editar</span>
                                  </button>

                                  <button
                                    onClick={() => handleDeleteIssue(issue.id)}
                                    title="Excluir Solicitação"
                                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all border border-red-100 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                  >
                                    <Trash2 size={13} />
                                    <span>Excluir</span>
                                  </button>
                                </div>
                              </div>

                              {/* Full-width Solution or Collapsible Timeline below actions */}
                              {issue.status === 'Resolvido' && (!issue.progressUpdates || issue.progressUpdates.length === 0) && issue.solution && (
                                <div className="w-full bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100 text-xs text-slate-600">
                                  <strong className="text-emerald-800 block mb-0.5 font-bold uppercase text-[9px] tracking-wider">Solução / Obs:</strong>
                                  {issue.solution}
                                </div>
                              )}

                              {(issue.status === 'Em Andamento' || (issue.progressUpdates && issue.progressUpdates.length > 0)) && (
                                renderVerticalTimeline(issue, false)
                              )}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Issue Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 md:p-8 bg-slate-900 text-white flex justify-between items-center">
              <div className="space-y-1">
                <h3 className="text-lg font-black uppercase tracking-wide">
                  {editingIssue ? 'Editar Solicitação de Manutenção' : 'Nova Solicitação de Manutenção'}
                </h3>
                <p className="text-slate-400 text-xs">
                  {editingIssue ? 'Edite os detalhes da solicitação ou falha técnica.' : 'Preencha os detalhes do problema ou solicitação técnica.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingIssue(null);
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitIssue} className="p-6 md:p-8 space-y-5 overflow-y-auto max-h-[75vh]">
              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Título / Resumo (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Vazamento de óleo, Sensor com defeito, Correia gasta..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700 font-medium"
                />
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-1">Se deixado em branco, o título será gerado a partir da descrição abaixo.</p>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Descrição do Problema / Solicitação *</label>
                  <button
                    type="button"
                    onClick={handleImproveTextWithAI}
                    disabled={isImprovingText || !formCause.trim()}
                    className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider bg-violet-50 hover:bg-violet-100 text-violet-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100 px-2.5 py-1.5 rounded-xl border border-violet-100 hover:scale-102 active:scale-98 transition-all cursor-pointer"
                    title={!formCause.trim() ? "Digite a causa para poder melhorar com IA" : "Melhorar texto com IA"}
                  >
                    {isImprovingText ? (
                      <>
                        <Loader2 className="animate-spin" size={10} />
                        Melhorando...
                      </>
                    ) : (
                      <>
                        <Sparkles size={10} />
                        Melhorar com IA ✨
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  required
                  placeholder="Descreva detalhadamente qual o defeito, ruído, desgaste ou falha a ser resolvida..."
                  value={formCause}
                  onChange={(e) => setFormCause(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700"
                />
                {aiFeedback && (
                  <p className={`text-[9px] font-black uppercase tracking-wider ${aiFeedback.includes('Erro') ? 'text-red-500' : 'text-emerald-600'} transition-all`}>
                    {aiFeedback}
                  </p>
                )}
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Prioridade de Execução</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Baixa', 'Média', 'Alta', 'Crítica'] as MaintenancePriority[]).map((pri) => (
                    <button
                      key={pri}
                      type="button"
                      onClick={() => setFormPriority(pri)}
                      className={`py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${formPriority === pri ? priorityColors[pri].bg + ' scale-102 border-current shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}
                    >
                      {pri}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Sector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Setor / Área *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Extrusão, Reciclagem"
                    value={formSector}
                    onChange={(e) => setFormSector(e.target.value)}
                    list="sector-suggestions"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700"
                  />
                  <datalist id="sector-suggestions">
                    {sectors.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>

                {/* Machine */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Máquina / Equipamento</label>
                  <input
                    type="text"
                    placeholder="Ex: Erema 1, Linha 2"
                    value={formMachine}
                    onChange={(e) => setFormMachine(e.target.value)}
                    list="machine-suggestions"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700"
                  />
                  <datalist id="machine-suggestions">
                    {machines.map(m => <option key={m} value={m} />)}
                  </datalist>
                </div>
              </div>

              {/* Reporter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Quem Relatou (Relator)</label>
                <input
                  type="text"
                  value={formReporter}
                  disabled
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-xs text-slate-500 cursor-not-allowed font-bold"
                  placeholder="Nome do operador ou inspetor"
                />
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mt-1">Definido automaticamente pelo usuário logado</p>
              </div>

              {/* Submit / Cancel */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingIssue(null);
                  }}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-xs font-black uppercase tracking-wide text-slate-600 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-2xl text-xs font-black uppercase tracking-wide text-white transition-all shadow-md shadow-blue-500/10"
                >
                  {editingIssue ? 'Salvar Alterações' : 'Salvar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Resolution Notes Modal (When checking off / resolving an issue) */}
      {selectedIssueForNotes && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden"
          >
            <div className="p-6 bg-emerald-600 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black uppercase tracking-wide text-sm md:text-base">Registrar Notas de Resolução</h3>
                <p className="text-emerald-100 text-[11px]">Como esta causa foi resolvida pela manutenção?</p>
              </div>
              <button
                onClick={() => setSelectedIssueForNotes(null)}
                className="p-1.5 bg-emerald-700 hover:bg-emerald-800 rounded-lg text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Problema:</p>
                <p className="text-xs text-slate-700 font-bold leading-relaxed">{selectedIssueForNotes.cause}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Observações de Solução / Peças Trocadas</label>
                <textarea
                  placeholder="Descreva a ação corretiva realizada, peças trocadas ou ajustes executados..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedIssueForNotes(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black uppercase text-slate-600 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={submitResolution}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-black uppercase text-white transition-all shadow-md shadow-emerald-500/10"
                >
                  Concluir & Resolver
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* PDF Export Options Modal (Selecionar Solicitações) */}
      {isExportPdfModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4"
          onClick={() => setIsExportPdfModalOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black uppercase tracking-wide text-sm md:text-base">Exportar Relatório PDF</h3>
                <p className="text-slate-400 text-[11px]">
                  Selecione uma ou várias solicitações para incluir no PDF (com todas as informações e etapas)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsExportPdfModalOpen(false)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Marque uma, duas ou várias solicitações ({selectedIssueIds.length} selecionadas)
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedIssueIds(issues.map((i) => i.id))}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black uppercase cursor-pointer"
                    >
                      Marcar Todas
                    </button>
                    <button
                      type="button"
                      onClick={clearIssueSelection}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={pdfModalSearch}
                    onChange={(e) => setPdfModalSearch(e.target.value)}
                    placeholder="Filtrar solicitações para selecionar..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
                  />
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {sortIssuesForReport(issues)
                    .filter((i) => {
                      const q = pdfModalSearch.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        (i.title || '').toLowerCase().includes(q) ||
                        i.cause.toLowerCase().includes(q) ||
                        i.machine.toLowerCase().includes(q) ||
                        i.sector.toLowerCase().includes(q) ||
                        i.reporter.toLowerCase().includes(q)
                      );
                    })
                    .map((item) => {
                      const checked = selectedIssueIds.includes(item.id);
                      const stepsCount = getSortedProgressUpdates(item).length;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleIssueSelection(item.id)}
                          className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                            checked
                              ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-200'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {checked ? (
                            <CheckSquare size={18} className="text-blue-600 shrink-0 mt-0.5" />
                          ) : (
                            <Square size={18} className="text-slate-300 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase border ${priorityColors[item.priority]?.bg}`}>
                                {item.priority}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[8px] font-bold uppercase">
                                {item.machine}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${statusColors[item.status]?.bg} ${statusColors[item.status]?.text}`}>
                                {item.status}
                              </span>
                              {stepsCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[8px] font-black uppercase">
                                  {stepsCount} {stepsCount === 1 ? 'etapa' : 'etapas'}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-bold text-slate-800 line-clamp-1">
                              {item.title || generateTitleFromCause(item.cause)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              {pdfModalError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-3.5 py-2.5 text-xs font-bold">
                  {pdfModalError}
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExportPdfModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black uppercase text-slate-600 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={exportPDFWithSettings}
                  disabled={isGeneratingPdf || selectedIssueIds.length === 0}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-black uppercase text-white transition-all shadow-md shadow-slate-950/10 flex items-center gap-1.5 cursor-pointer"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      <span>Gerando...</span>
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      <span>Gerar PDF ({selectedIssueIds.length})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Outlook Share Instructions Modal */}
      {isOutlookShareModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black uppercase tracking-wide text-sm md:text-base">Relatório Copiado!</h3>
                <p className="text-indigo-100 text-[11px]">Pronto para colar diretamente no seu e-mail</p>
              </div>
              <button
                onClick={() => setIsOutlookShareModalOpen(false)}
                className="p-1.5 bg-indigo-700 hover:bg-indigo-800 rounded-lg text-white transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-100 animate-pulse">
                  <Mail size={32} />
                </div>
                <h4 className="font-black text-slate-800 text-sm uppercase tracking-wider">Formatação Profissional Ativada!</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Para garantir que os <strong>títulos fiquem em negrito</strong>, as listas perfeitamente alinhadas e os status coloridos, copiamos um formato rico em HTML para a sua área de transferência.
                </p>
              </div>

              {/* Step instructions */}
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3.5">
                <div className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black shrink-0">1</span>
                  <p className="text-xs text-slate-600">
                    Clique no botão <strong>"Abrir Outlook"</strong> abaixo para abrir o seu cliente de e-mail com o assunto preenchido.
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-black shrink-0">2</span>
                  <p className="text-xs text-slate-600 font-bold text-slate-800">
                    No corpo do e-mail no Outlook, pressione <kbd className="bg-white border border-slate-300 px-1.5 py-0.5 rounded shadow-xs text-[10px] font-mono">Ctrl + V</kbd> (ou <kbd className="bg-white border border-slate-300 px-1.5 py-0.5 rounded shadow-xs text-[10px] font-mono">Cmd + V</kbd>) para colar o relatório perfeitamente formatado.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOutlookShareModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black uppercase text-slate-600 transition-all"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOutlookShareModalOpen(false);
                    const subject = `RELATÓRIO DE MANUTENÇÃO - GESTÃO DE PRODUÇÃO`;
                    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}`;
                    window.location.href = mailtoUrl;
                  }}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-black uppercase text-white transition-all shadow-md shadow-indigo-500/15 flex items-center gap-1.5"
                >
                  <Mail size={14} />
                  <span>Abrir Outlook</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal: Breakdown Proporcional de Paradas (100%) — Extrusão & Corte de Fita */}
      {isProportionalStopsModalOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[120] flex items-center justify-center p-4"
          onClick={() => setIsProportionalStopsModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/70">
              <div>
                <h3 className="text-sm sm:text-base font-black uppercase text-slate-800 tracking-wider">
                  Breakdown Proporcional de Paradas (100%)
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                  Cast 1, Cast 2, Erema &amp; Máquinas do Corte de Fita (Ghezzi, Lintech, Wultec)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={stopsModalMonth}
                  onChange={(e) => setStopsModalMonth(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700"
                >
                  <option value="Todos">Todos os Meses</option>
                  {stopsAvailableMonths.map((m) => {
                    const [y, mo] = m.split('-');
                    const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                    const label = `${names[parseInt(mo, 10) - 1] || mo}/${y}`;
                    return (
                      <option key={m} value={m}>
                        {label}
                      </option>
                    );
                  })}
                </select>

                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setStopsModalGroupBy('machine')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      stopsModalGroupBy === 'machine' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Máquinas
                  </button>
                  <button
                    type="button"
                    onClick={() => setStopsModalGroupBy('operator')}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      stopsModalGroupBy === 'operator' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    Operador
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsProportionalStopsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-xl transition-all cursor-pointer"
                  aria-label="Fechar gráfico"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="h-[320px] w-full">
                {plantProportionalStopsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={plantProportionalStopsData} margin={{ top: 10, right: 16, left: -16, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} stroke="#475569" style={{ fontSize: 10, fontWeight: 'bold' }} />
                      <Tooltip
                        formatter={(val: any, name: any, props: any) => {
                          const p = props?.payload;
                          const min =
                            name === 'Parada Manutenção'
                              ? p?.manutMin
                              : name === 'Parada Processo'
                              ? p?.procMin
                              : p?.outrosMin;
                          return [`${val}% (${min ?? 0} min)`, name];
                        }}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Legend iconType="rect" wrapperStyle={{ fontSize: 11, fontWeight: 'bold', paddingTop: 10 }} />
                      <Bar dataKey="manutPct" name="Parada Manutenção" stackId="stops-pct" fill="#ef4444" unit="%" />
                      <Bar dataKey="procPct" name="Parada Processo" stackId="stops-pct" fill="#f59e0b" unit="%" />
                      <Bar dataKey="outrosPct" name="Outras Paradas" stackId="stops-pct" fill="#64748b" unit="%" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 font-bold text-xs uppercase">
                    Sem inatividades registradas para o período selecionado
                  </div>
                )}
              </div>

              {/* Resumo Numérico por Máquina / Operador */}
              {plantProportionalStopsData.length > 0 && (
                <div className="border border-slate-100 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">{stopsModalGroupBy === 'machine' ? 'Máquina' : 'Operador'}</th>
                        <th className="py-2.5 px-3 text-right text-red-600">Manutenção</th>
                        <th className="py-2.5 px-3 text-right text-amber-600">Processo</th>
                        <th className="py-2.5 px-3 text-right text-slate-600">Outros</th>
                        <th className="py-2.5 px-3 text-right">Total Parado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs tabular-nums">
                      {plantProportionalStopsData.map((row) => (
                        <tr key={row.name} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-extrabold text-slate-800">
                            {row.name}
                            {stopsModalGroupBy === 'machine' && (
                              <span className="ml-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                                {row.sector}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-red-600">
                            {row.manutPct}% <span className="text-[10px] text-slate-400 font-medium">({row.manutMin}m)</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-amber-600">
                            {row.procPct}% <span className="text-[10px] text-slate-400 font-medium">({row.procMin}m)</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-600">
                            {row.outrosPct}% <span className="text-[10px] text-slate-400 font-medium">({row.outrosMin}m)</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">{row.totalMin} min</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
      {/* Modal: Em Andamento — Guia Vertical de Observações */}
      {progressModalIssue && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[110] flex items-center justify-center p-4"
          onClick={closeProgressModal}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 bg-blue-600 text-white flex justify-between items-start gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-md bg-blue-700 text-blue-100 text-[9px] font-black uppercase tracking-wider">
                    {progressModalIssue.sector}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/15 text-white text-[9px] font-bold font-mono">
                    {progressModalIssue.machine}
                  </span>
                </div>
                <h3 className="font-black uppercase tracking-wide text-sm md:text-base">
                  Em Andamento
                </h3>
                <p className="text-blue-100 text-xs mt-0.5 line-clamp-1">
                  {progressModalIssue.title || generateTitleFromCause(progressModalIssue.cause)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeProgressModal}
                className="p-1.5 bg-blue-700 hover:bg-blue-800 rounded-lg text-white transition-all cursor-pointer"
                aria-label="Fechar janela de andamento"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body: Timeline + New Step Form */}
            <div className="p-6 overflow-y-auto space-y-6">
              {renderVerticalTimeline(progressModalIssue, true)}

              {progressModalIssue.status !== 'Resolvido' && !isReadOnly && (
                <form
                  onSubmit={handleAddProgressStep}
                  className="bg-blue-50/60 border border-blue-200 rounded-2xl p-4 md:p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                      <Plus size={13} />
                      <span>
                        {getSortedProgressUpdates(progressModalIssue).length === 0
                          ? 'Registrar Primeira Etapa de Andamento'
                          : 'Adicionar Próxima Etapa'}
                      </span>
                    </label>
                    <input
                      type="datetime-local"
                      value={newProgressDate}
                      onChange={(e) => setNewProgressDate(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-[11px] font-bold text-slate-700 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <textarea
                    rows={3}
                    value={newProgressText}
                    onChange={(e) => {
                      setNewProgressText(e.target.value);
                      if (progressError) setProgressError(null);
                    }}
                    placeholder="Ex: Foi solicitado no dia 15/05 a compra do eixo do rolo guia junto ao setor de compras..."
                    className="w-full px-4 py-3 bg-white border border-blue-200 rounded-2xl text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />

                  {progressError && (
                    <p className="text-[11px] font-bold text-red-600">{progressError}</p>
                  )}

                  {progressFeedback && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-2 rounded-xl text-[11px] font-bold flex items-center gap-2">
                      <CheckCircle2 size={14} />
                      <span>{progressFeedback}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={isSavingProgress}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-blue-500/15 transition-all cursor-pointer"
                    >
                      {isSavingProgress ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      <span>
                        {progressModalIssue.status !== 'Em Andamento'
                          ? 'Salvar e Colocar em Andamento'
                          : 'Salvar Etapa'}
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={closeProgressModal}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-black uppercase text-slate-600 transition-all cursor-pointer"
              >
                Fechar
              </button>

              {progressModalIssue.status !== 'Resolvido' && !isReadOnly && (
                <button
                  type="button"
                  onClick={() => handleOpenConcludeFromProgress(progressModalIssue)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-500/15 transition-all cursor-pointer"
                >
                  <CheckCircle2 size={15} />
                  <span>Finalizar e Concluir</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
        </>
      )}

    </div>
  );
};
