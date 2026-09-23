import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Calendar, Download, Printer, Copy, Check, Presentation, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Package, Clock, ShieldAlert, Award, FileSpreadsheet,
  Layers, Cpu, Sparkles, AlertCircle, BarChart3, CheckCircle2, MessageSquare, Wrench, Share2,
  Target, AlertTriangle, ArrowRight, Eye, RefreshCw, Edit3, HelpCircle, FileText, CheckSquare,
  ShieldCheck, ArrowUpRight, Flame, Box, Users, Sliders, ChevronDown, ChevronUp, Filter, Hash
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProductionEntry, RibbonCuttingEntry, Employee } from '../types';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface WeeklyProductionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionData: ProductionEntry[];
  ribbonData: RibbonCuttingEntry[];
  employees?: Employee[];
  goals?: Record<string, number>;
  isReadOnly?: boolean;
  onBlockedAction?: (title?: string, message?: string) => void;
  setPdfModal?: (modal: any) => void;
}

// Formatters
const formatTons = (kg: number) => {
  const tons = (kg || 0) / 1000;
  return tons.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' T';
};

const formatKg = (val: number) => {
  return (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' kg';
};

const formatM2 = (val: number) => {
  return (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' m²';
};

const formatMinToHours = (min: number) => {
  if (!min) return '0h 00m';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}h ${m < 10 ? '0' : ''}${m}m`;
};

function formatDateISO(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateBR(dateStr: string) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// Helper to get past 7 days (including today)
function getPast7DaysRange(refDate: Date) {
  const end = new Date(refDate);
  end.setHours(23, 59, 59, 999);
  const start = new Date(refDate);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

// Helper to get Monday-Sunday week
function getCalendarWeekRange(refDate: Date) {
  const d = new Date(refDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { start: monday, end: sunday };
}

export interface RecurringStopItem {
  keyword: string;
  category: 'Manutenção' | 'Processo' | 'Outros' | 'Sem Trabalho';
  count: number;
  totalMinutes: number;
  formattedHours: string;
  avgMinutes: number;
  percentageOfMachineStops: number;
  percentageOfTime: number;
  occurrences: Array<{
    date: string;
    shift: string;
    durationMin: number;
    description: string;
    timeRange: string;
    operator?: string;
  }>;
}

// Helper to extract clean keyword from reason or description for intelligent recurrence grouping
export function extractStopKeyword(motivo: string, exp: string, category: string): string {
  const combined = `${motivo || ''} ${exp || ''}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (combined.includes('limpeza')) return 'Limpeza';
  if (combined.includes('desarme') || combined.includes('disjuntor')) return 'Desarme Geral';
  if (combined.includes('intervalo') || combined.includes('almoco') || combined.includes('refeicao') || combined.includes('janta') || combined.includes('lanche')) return 'Intervalo / Refeição';
  if (combined.includes('troca de tela') || combined.includes('filtro') || combined.includes('tela') || combined.includes('peneira')) return 'Troca de Filtro / Tela';
  if (combined.includes('troca de faca') || combined.includes('faca') || combined.includes('facas') || combined.includes('refile') || combined.includes('serrilha')) return 'Facas / Refile';
  if (combined.includes('chiller') || combined.includes('refrigeracao') || combined.includes('agua gelada')) return 'Chiller / Refrigeração';
  if (combined.includes('vazamento') || combined.includes('mangueira')) return 'Vazamento';
  if (combined.includes('painel') || combined.includes('contator') || combined.includes('rele') || combined.includes('fusivel')) return 'Painel Elétrico';
  if (combined.includes('inversor') || combined.includes('servo') || combined.includes('motor')) return 'Inversor / Motor';
  if (combined.includes('resistencia') || combined.includes('termopar') || combined.includes('aquecimento')) return 'Resistência / Aquecimento';
  if (combined.includes('sensor') || combined.includes('fotocelula') || combined.includes('encoder') || combined.includes('clp') || combined.includes('ihm')) return 'Sensores / IHM / CLP';
  if (combined.includes('preventiva')) return 'Manutenção Preventiva';
  if (combined.includes('rosca') || combined.includes('canhao') || combined.includes('cilindro')) return 'Roscas / Canhão';
  if (combined.includes('rolamento') || combined.includes('mancal') || combined.includes('biela') || combined.includes('cambio')) return 'Rolamentos / Mecânica';
  if (combined.includes('energia') || combined.includes('queda') || combined.includes('pico') || combined.includes('apagao')) return 'Queda / Falta de Energia';
  if (combined.includes('rompimento') || combined.includes('estouro') || combined.includes('rasgou') || combined.includes('rasgando')) return 'Rompimento de Filme';
  if (combined.includes('tubete') || combined.includes('desalinhamento')) return 'Tubetes / Alinhamento';
  if (combined.includes('resina') || combined.includes('silo') || combined.includes('materia')) return 'Falta de Matéria-Prima / Silo';
  if (combined.includes('espessura') || combined.includes('perfil') || combined.includes('micras') || combined.includes('micron')) return 'Regulagem de Espessura';
  if (combined.includes('borra') || combined.includes('purga')) return 'Borra / Purga';
  if (combined.includes('treinamento') || combined.includes('ddp') || combined.includes('dds') || combined.includes('reuniao')) return 'Treinamento / Reunião';
  if (combined.includes('emergencia')) return 'Botão de Emergência';
  if (combined.includes('setup') || combined.includes('troca de medida') || combined.includes('troca de formato') || combined.includes('troca de formulacao')) return 'Setup / Troca de Formato';
  if (combined.includes('sem programacao') || combined.includes('sem pedido') || combined.includes('feriado') || combined.includes('sem trabalho')) return 'Sem Programação / Feriado';

  // If motivo is present and clean
  if (motivo && motivo.trim().length > 0) {
    const clean = motivo.trim();
    return clean.length <= 40 ? clean : clean.substring(0, 37) + '...';
  }

  // If explanation is present
  if (exp && exp.trim().length > 0) {
    const clean = exp.trim();
    return clean.length <= 35 ? clean : clean.substring(0, 32) + '...';
  }

  return `${category} Não Especificada`;
}

export interface WeeklyMeetingFormState {
  weeklyGoalTons: number; // Meta semanal em Toneladas (padrão 300 T)
  weeklyPlanTons: number; // Plano da semana em Toneladas (padrão 300 T)
  notAttainedReasons: string; // Motivos de não atingir a meta
  correctiveActions: string; // Plano de Ação Corretiva
  lossAnalysisNotes: string; // Análise das principais perdas
  forecastNext7DaysTons: number; // Previsão de produção para os próximos 7 dias (T)
  rawMaterialsDemand: string; // Demanda e necessidades de matéria-prima
  scheduledMaintenance: string; // Manutenções preventivas e intervenções programadas
  operationalAnticipations: string; // Antecipação das necessidades da operação (pessoal, escalas, etc.)
  priorityActions: string; // Ações prioritárias da semana seguinte
  ribbonNotes: string; // Notas de corte de fita
}

export const WeeklyProductionSummaryModal: React.FC<WeeklyProductionSummaryModalProps> = ({
  isOpen,
  onClose,
  productionData = [],
  ribbonData = [],
  employees = [],
  goals = {},
  isReadOnly = false,
  onBlockedAction,
  setPdfModal
}) => {
  // Period Selection Mode: 'last7days' | 'calendarWeek' | 'custom'
  const [periodMode, setPeriodMode] = useState<'last7days' | 'calendarWeek' | 'custom'>('last7days');
  const [refDate, setRefDate] = useState<Date>(() => new Date());
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return formatDateISO(d);
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => formatDateISO(new Date()));

  // Presentation / Print View Mode
  const [viewMode, setViewMode] = useState<'interactive' | 'preview'>('interactive');
  const [activePauta, setActivePauta] = useState<'all' | 'meta' | 'losses' | 'forecast' | 'ribbon' | 'operators'>('all');
  const [recurrentMachineTab, setRecurrentMachineTab] = useState<'all' | 'Cast 1' | 'Cast 2' | 'Erema'>('all');
  const [expandedRecurrentKey, setExpandedRecurrentKey] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  // Compute Active Range
  const { startDateStr, endDateStr, startDateObj, endDateObj } = useMemo(() => {
    if (periodMode === 'last7days') {
      const { start, end } = getPast7DaysRange(refDate);
      return {
        startDateStr: formatDateISO(start),
        endDateStr: formatDateISO(end),
        startDateObj: start,
        endDateObj: end,
      };
    } else if (periodMode === 'calendarWeek') {
      const { start, end } = getCalendarWeekRange(refDate);
      return {
        startDateStr: formatDateISO(start),
        endDateStr: formatDateISO(end),
        startDateObj: start,
        endDateObj: end,
      };
    } else {
      return {
        startDateStr: customStartDate,
        endDateStr: customEndDate,
        startDateObj: new Date(customStartDate + 'T00:00:00'),
        endDateObj: new Date(customEndDate + 'T23:59:59'),
      };
    }
  }, [periodMode, refDate, customStartDate, customEndDate]);

  // Storage key for meeting data
  const meetingStorageKey = `weekly_meeting_${startDateStr}_${endDateStr}`;

  // Form State for manual inputs
  const [formState, setFormState] = useState<WeeklyMeetingFormState>({
    weeklyGoalTons: 300,
    weeklyPlanTons: 300,
    notAttainedReasons: '',
    correctiveActions: '',
    lossAnalysisNotes: '',
    forecastNext7DaysTons: 300,
    rawMaterialsDemand: '',
    scheduledMaintenance: '',
    operationalAnticipations: '',
    priorityActions: '',
    ribbonNotes: '',
  });

  // Load saved meeting data from localStorage & Firestore
  useEffect(() => {
    let isMounted = true;
    try {
      const localData = localStorage.getItem(meetingStorageKey);
      if (localData) {
        const parsed = JSON.parse(localData);
        setFormState(prev => ({ ...prev, ...parsed }));
      } else {
        setFormState({
          weeklyGoalTons: 300,
          weeklyPlanTons: 300,
          notAttainedReasons: '',
          correctiveActions: '',
          lossAnalysisNotes: '',
          forecastNext7DaysTons: 300,
          rawMaterialsDemand: '',
          scheduledMaintenance: '',
          operationalAnticipations: '',
          priorityActions: '',
          ribbonNotes: '',
        });
      }
    } catch (e) {
      console.warn('Error loading local meeting data', e);
    }

    // Try Firestore
    const fetchFirestore = async () => {
      try {
        const docRef = doc(db, 'weekly_meetings', `${startDateStr}_${endDateStr}`);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && isMounted) {
          const fsData = docSnap.data() as Partial<WeeklyMeetingFormState>;
          setFormState(prev => ({ ...prev, ...fsData }));
          try {
            localStorage.setItem(meetingStorageKey, JSON.stringify({ ...formState, ...fsData }));
          } catch {}
        }
      } catch (err) {
        // Fallback to local only
      }
    };
    fetchFirestore();

    return () => { isMounted = false; };
  }, [meetingStorageKey, startDateStr, endDateStr]);

  // Handler to update form fields
  const handleFieldChange = (field: keyof WeeklyMeetingFormState, value: any) => {
    setFormState(prev => {
      const updated = { ...prev, [field]: value };
      try {
        localStorage.setItem(meetingStorageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Save to Firestore explicitly
  const handleSaveToCloud = async () => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Gravação Bloqueada', 'A gravação de anotações da reunião semanal não é permitida no Modo de Leitura.');
      } else {
        alert('Operação não permitida no Modo de Leitura.');
      }
      return;
    }
    setSaveStatus('saving');
    try {
      localStorage.setItem(meetingStorageKey, JSON.stringify(formState));
      const docRef = doc(db, 'weekly_meetings', `${startDateStr}_${endDateStr}`);
      await setDoc(docRef, {
        ...formState,
        startDate: startDateStr,
        endDate: endDateStr,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (e) {
      console.warn('Error saving to Firestore:', e);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
    }
  };

  // Period Navigation
  const handleShiftPeriod = (days: number) => {
    const nextDate = new Date(refDate);
    nextDate.setDate(nextDate.getDate() + days);
    setRefDate(nextDate);
  };

  const handleResetToCurrent = () => {
    setRefDate(new Date());
    const d = new Date();
    d.setDate(d.getDate() - 6);
    setCustomStartDate(formatDateISO(d));
    setCustomEndDate(formatDateISO(new Date()));
  };

  // --- FILTER PRODUCTION DATA ---
  const filteredExtrusionData = useMemo(() => {
    return productionData.filter(item => {
      if (!item.date) return false;
      return item.date >= startDateStr && item.date <= endDateStr;
    });
  }, [productionData, startDateStr, endDateStr]);

  const filteredRibbonData = useMemo(() => {
    return ribbonData.filter(item => {
      if (!item.date) return false;
      return item.date >= startDateStr && item.date <= endDateStr;
    });
  }, [ribbonData, startDateStr, endDateStr]);

  // Previous 7 days period for trend comparison
  const { prevStartDateStr, prevEndDateStr } = useMemo(() => {
    const pStart = new Date(startDateObj);
    pStart.setDate(pStart.getDate() - 7);
    const pEnd = new Date(startDateObj);
    pEnd.setDate(pEnd.getDate() - 1);
    return {
      prevStartDateStr: formatDateISO(pStart),
      prevEndDateStr: formatDateISO(pEnd),
    };
  }, [startDateObj]);

  const prevExtrusionData = useMemo(() => {
    return productionData.filter(item => {
      if (!item.date) return false;
      return item.date >= prevStartDateStr && item.date <= prevEndDateStr;
    });
  }, [productionData, prevStartDateStr, prevEndDateStr]);

  // --- EXTRUSION CALCULATIONS ---
  const extStats = useMemo(() => {
    let grossKg = 0;
    let taraKg = 0;
    let netKg = 0;
    let ecoA = 0;
    let ecoBP = 0;
    let ecoBM = 0;
    let borra = 0;
    let maintMin = 0;
    let procMin = 0;
    let otherMin = 0;
    let eremaKg = 0;
    let eremaBags = 0;

    let cast1NetKg = 0;
    let cast2NetKg = 0;
    let otherMachinesNetKg = 0;

    const machineMap: Record<string, { netKg: number; grossKg: number; ecoA: number; ecoBP: number; ecoBM: number; borra: number }> = {};
    const opMap: Record<string, { netKg: number; entries: number; ecoA: number; borra: number; scrapKg: number }> = {};
    const shiftMap: Record<string, { netKg: number; entries: number; scrapKg: number }> = {};
    const datesSet = new Set<string>();

    const machineDowntimeMap: Record<string, {
      name: string;
      maintMin: number;
      procMin: number;
      otherMin: number;
      totalStopMin: number;
      reasons: string[];
    }> = {
      'Cast 1': { name: 'Cast 1', maintMin: 0, procMin: 0, otherMin: 0, totalStopMin: 0, reasons: [] },
      'Cast 2': { name: 'Cast 2', maintMin: 0, procMin: 0, otherMin: 0, totalStopMin: 0, reasons: [] },
      'Erema':  { name: 'Erema',  maintMin: 0, procMin: 0, otherMin: 0, totalStopMin: 0, reasons: [] },
    };

    // Stoppages list with specific notes
    const stoppagesList: Array<{
      date: string;
      machine: string;
      shift: string;
      type: 'Manutenção' | 'Processo' | 'Outros' | 'Sem Trabalho';
      durationMin: number;
      reason: string;
    }> = [];

    // Detailed stoppage occurrences for intelligent recurrence & keyword frequency mapping
    const machineStopOccurrences: Record<string, Array<{
      keyword: string;
      category: 'Manutenção' | 'Processo' | 'Outros' | 'Sem Trabalho';
      durationMin: number;
      description: string;
      timeRange: string;
      date: string;
      shift: string;
      operator?: string;
    }>> = {
      'Cast 1': [],
      'Cast 2': [],
      'Erema': [],
    };

    const processRawStopField = (
      rawMotive: string | undefined,
      fallbackMin: number,
      category: 'Manutenção' | 'Processo' | 'Outros' | 'Sem Trabalho',
      date: string,
      shift: string,
      mKey: string,
      operator?: string
    ) => {
      if (!rawMotive && fallbackMin <= 0) return;
      if (!machineStopOccurrences[mKey]) machineStopOccurrences[mKey] = [];

      const getDiffMin = (de: string, ate: string) => {
        if (!de || !ate) return 0;
        try {
          const [h1, m1] = de.split(':').map(Number);
          const [h2, m2] = ate.split(':').map(Number);
          if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
          let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
          if (diff < 0) diff += 1440;
          return diff;
        } catch {
          return 0;
        }
      };

      const trimmed = (rawMotive || '').trim();
      let parsedArray: any[] | null = null;
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsedArray = parsed;
          }
        } catch {}
      }

      if (parsedArray && parsedArray.length > 0) {
        const totalItems = parsedArray.length;
        parsedArray.forEach((item: any) => {
          const de = (item.de || '').trim();
          const ate = (item.ate || '').trim();
          const motivo = (item.motivo || item.keyword || '').trim();
          const exp = (item.explicacao || item.justification || item.observacao || item.observacoes || item.descricao || '').trim();
          
          const itemMin = (de && ate ? getDiffMin(de, ate) : 0) || (fallbackMin > 0 ? Math.round(fallbackMin / totalItems) : 0);
          const timeRange = de && ate ? `${de} às ${ate}` : '';
          
          const fullDesc = exp || motivo || category;

          const keyword = extractStopKeyword(motivo, exp, category);
          machineStopOccurrences[mKey].push({
            keyword,
            category,
            durationMin: itemMin,
            description: fullDesc,
            timeRange,
            date,
            shift,
            operator,
          });
        });
      } else if (trimmed || fallbackMin > 0) {
        const keyword = extractStopKeyword(trimmed, '', category);
        machineStopOccurrences[mKey].push({
          keyword,
          category,
          durationMin: fallbackMin,
          description: trimmed || `${category} não detalhada`,
          timeRange: '',
          date,
          shift,
          operator,
        });
      }
    };

    // Helper to clean stoppage motives
    const formatStopReasonClean = (raw: string | undefined): string => {
      if (!raw) return '';
      const trimmed = raw.trim();
      try {
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((item: any) => {
              const de = (item.de || '').trim();
              const ate = (item.ate || '').trim();
              const motivo = (item.motivo || item.keyword || '').trim();
              const exp = (item.explicacao || item.justification || item.observacao || item.observacoes || item.descricao || '').trim();
              const desc = exp || motivo || '';
              if (de && ate) {
                return `${de} às ${ate}${desc ? `: ${desc}` : ''}`;
              }
              return desc;
            }).filter(Boolean).join('; ');
          }
        }
      } catch {}
      return trimmed;
    };

    filteredExtrusionData.forEach(e => {
      if (e.date) datesSet.add(e.date);
      const isStopped = e.isMaintenanceEntry || e.isNoWorkDay;

      // Track Machine Downtime
      const rawM = (e.machine || '').trim().toLowerCase();
      let mKey = 'Cast 1';
      if (rawM.includes('cast 1') || rawM.includes('cast1')) mKey = 'Cast 1';
      else if (rawM.includes('cast 2') || rawM.includes('cast2')) mKey = 'Cast 2';
      else if (rawM.includes('erema')) mKey = 'Erema';
      else if (e.machine && e.machine.trim()) mKey = e.machine.trim();

      if (!machineDowntimeMap[mKey]) {
        machineDowntimeMap[mKey] = { name: mKey, maintMin: 0, procMin: 0, otherMin: 0, totalStopMin: 0, reasons: [] };
      }

      const eMaint = Number(e.manutencaoMin || 0);
      const eProc = Number(e.processoMin || 0);
      const eOther = Number(e.outrosMin || 0);
      const eTotalStop = eMaint + eProc + eOther;

      machineDowntimeMap[mKey].maintMin += eMaint;
      machineDowntimeMap[mKey].procMin += eProc;
      machineDowntimeMap[mKey].otherMin += eOther;
      machineDowntimeMap[mKey].totalStopMin += eTotalStop;

      if (eMaint > 0 && e.manutencaoMotivo) {
        const cleanMotive = formatStopReasonClean(e.manutencaoMotivo);
        const finalR = cleanMotive || e.manutencaoMotivo.trim();
        stoppagesList.push({
          date: e.date,
          machine: mKey,
          shift: e.shift || '-',
          type: 'Manutenção',
          durationMin: eMaint,
          reason: finalR,
        });
        const r = `Manutenção: ${finalR}`;
        if (!machineDowntimeMap[mKey].reasons.includes(r)) machineDowntimeMap[mKey].reasons.push(r);
        processRawStopField(e.manutencaoMotivo, eMaint, 'Manutenção', e.date, e.shift || '-', mKey, e.operator);
      } else if (eMaint > 0) {
        processRawStopField('', eMaint, 'Manutenção', e.date, e.shift || '-', mKey, e.operator);
      }

      if (eProc > 0 && e.processoMotivo) {
        const cleanMotive = formatStopReasonClean(e.processoMotivo);
        const finalR = cleanMotive || e.processoMotivo.trim();
        stoppagesList.push({
          date: e.date,
          machine: mKey,
          shift: e.shift || '-',
          type: 'Processo',
          durationMin: eProc,
          reason: finalR,
        });
        const r = `Processo: ${finalR}`;
        if (!machineDowntimeMap[mKey].reasons.includes(r)) machineDowntimeMap[mKey].reasons.push(r);
        processRawStopField(e.processoMotivo, eProc, 'Processo', e.date, e.shift || '-', mKey, e.operator);
      } else if (eProc > 0) {
        processRawStopField('', eProc, 'Processo', e.date, e.shift || '-', mKey, e.operator);
      }

      if (eOther > 0 && e.outrosMotivo) {
        const cleanMotive = formatStopReasonClean(e.outrosMotivo);
        const finalR = cleanMotive || e.outrosMotivo.trim();
        stoppagesList.push({
          date: e.date,
          machine: mKey,
          shift: e.shift || '-',
          type: 'Outros',
          durationMin: eOther,
          reason: finalR,
        });
        const r = `Outros: ${finalR}`;
        if (!machineDowntimeMap[mKey].reasons.includes(r)) machineDowntimeMap[mKey].reasons.push(r);
        processRawStopField(e.outrosMotivo, eOther, 'Outros', e.date, e.shift || '-', mKey, e.operator);
      } else if (eOther > 0) {
        processRawStopField('', eOther, 'Outros', e.date, e.shift || '-', mKey, e.operator);
      }

      if (e.isNoWorkDay && e.noWorkReason) {
        stoppagesList.push({
          date: e.date,
          machine: mKey,
          shift: e.shift || '-',
          type: 'Sem Trabalho',
          durationMin: 720,
          reason: e.noWorkReason.trim(),
        });
        const r = `Sem Trabalho: ${e.noWorkReason.trim()}`;
        if (!machineDowntimeMap[mKey].reasons.includes(r)) machineDowntimeMap[mKey].reasons.push(r);
        processRawStopField(e.noWorkReason, 720, 'Sem Trabalho', e.date, e.shift || '-', mKey, e.operator);
      }

      if (!isStopped) {
        const eGross = Number(e.grossWeight || 0);
        const eTara = Number(e.tara || 0);
        const eNet = Number(e.netWeight || 0);
        const eEcoA = Number(e.ecoA || 0);
        const eEcoBP = Number(e.ecoBP || 0);
        const eEcoBM = Number(e.ecoBM || 0);
        const eBorra = Number(e.borraTotal || 0);
        const eRefuse = eEcoA + eEcoBP + eEcoBM + eBorra;

        grossKg += eGross;
        taraKg += eTara;
        netKg += eNet;
        ecoA += eEcoA;
        ecoBP += eEcoBP;
        ecoBM += eEcoBM;
        borra += eBorra;

        // Machine breakdown
        const m = (e.machine || 'Sem Máquina').toLowerCase().trim();
        if (m.includes('cast 1') || m.includes('cast1')) cast1NetKg += eNet;
        else if (m.includes('cast 2') || m.includes('cast2')) cast2NetKg += eNet;
        else otherMachinesNetKg += eNet;

        if (!machineMap[m]) machineMap[m] = { netKg: 0, grossKg: 0, ecoA: 0, ecoBP: 0, ecoBM: 0, borra: 0 };
        machineMap[m].netKg += eNet;
        machineMap[m].grossKg += eGross;
        machineMap[m].ecoA += eEcoA;
        machineMap[m].ecoBP += eEcoBP;
        machineMap[m].ecoBM += eEcoBM;
        machineMap[m].borra += eBorra;

        // Operator breakdown
        if (e.operator && e.operator !== 'PARADA' && e.operator !== 'SEM APONTAMENTO') {
          const op = e.operator;
          if (!opMap[op]) opMap[op] = { netKg: 0, entries: 0, ecoA: 0, borra: 0, scrapKg: 0 };
          opMap[op].netKg += eNet;
          opMap[op].entries += 1;
          opMap[op].ecoA += eEcoA;
          opMap[op].borra += eBorra;
          opMap[op].scrapKg += eRefuse;
        }

        // Shift breakdown
        if (e.shift) {
          const sh = e.shift;
          if (!shiftMap[sh]) shiftMap[sh] = { netKg: 0, entries: 0, scrapKg: 0 };
          shiftMap[sh].netKg += eNet;
          shiftMap[sh].entries += 1;
          shiftMap[sh].scrapKg += eRefuse;
        }

        // Erema recycled
        if (m.includes('erema')) eremaKg += eNet;
        if (e.recycledUsed) eremaKg += Number(e.recycledUsed || 0);
        if (e.recycledBags) eremaBags += Number(e.recycledBags || 0);
      }

      maintMin += eMaint;
      procMin += eProc;
      otherMin += eOther;
    });

    const castNetKg = cast1NetKg + cast2NetKg;
    const castNetTons = castNetKg / 1000;
    const activeDays = Math.max(1, datesSet.size);
    const avgDailyNetKg = netKg / activeDays;
    const avgDailyNetTons = (netKg / 1000) / activeDays;
    const avgDailyCastNetKg = castNetKg / activeDays;
    const avgDailyCastNetTons = castNetTons / activeDays;
    const totalRefuseKg = ecoA + ecoBP + ecoBM + borra;
    const totalRefuseTons = totalRefuseKg / 1000;
    const totalStopMin = maintMin + procMin + otherMin;
    const scrapRatio = grossKg > 0 ? (totalRefuseKg / grossKg) * 100 : 0;

    // Top operators
    const topOperators = Object.entries(opMap)
      .map(([name, data]) => ({ name, ...data, scrapRatio: data.netKg > 0 ? (data.scrapKg / (data.netKg + data.scrapKg)) * 100 : 0 }))
      .sort((a, b) => b.netKg - a.netKg)
      .slice(0, 5);

    // Estimate production lost from stops (Assuming ~1000 kg/hour average nominal output between lines)
    const estimatedLostKg = (totalStopMin / 60) * 900;
    const estimatedLostTons = estimatedLostKg / 1000;

    // Build Recurring Reasons by Machine in descending order of occurrences
    const machineRecurringReasons: Record<string, RecurringStopItem[]> = {};

    const allMachineNames = ['Cast 1', 'Cast 2', 'Erema', ...Object.keys(machineStopOccurrences).filter(k => !['Cast 1', 'Cast 2', 'Erema'].includes(k))];
    
    allMachineNames.forEach(mName => {
      const occs = machineStopOccurrences[mName] || [];
      const totalMachineOccs = occs.length;
      const totalMachineMin = occs.reduce((sum, o) => sum + (o.durationMin || 0), 0);

      const map: Record<string, {
        keyword: string;
        category: 'Manutenção' | 'Processo' | 'Outros' | 'Sem Trabalho';
        count: number;
        totalMinutes: number;
        occurrences: typeof occs;
      }> = {};

      occs.forEach(occ => {
        const key = occ.keyword.trim();
        if (!map[key]) {
          map[key] = {
            keyword: occ.keyword,
            category: occ.category,
            count: 0,
            totalMinutes: 0,
            occurrences: [],
          };
        }
        map[key].count += 1;
        map[key].totalMinutes += occ.durationMin;
        map[key].occurrences.push(occ);
      });

      const list: RecurringStopItem[] = Object.values(map).map(item => ({
        keyword: item.keyword,
        category: item.category,
        count: item.count,
        totalMinutes: item.totalMinutes,
        formattedHours: formatMinToHours(item.totalMinutes),
        avgMinutes: item.count > 0 ? Math.round(item.totalMinutes / item.count) : 0,
        percentageOfMachineStops: totalMachineOccs > 0 ? (item.count / totalMachineOccs) * 100 : 0,
        percentageOfTime: totalMachineMin > 0 ? (item.totalMinutes / totalMachineMin) * 100 : 0,
        occurrences: item.occurrences,
      }));

      // Sort descending: highest count first, then highest minutes
      list.sort((a, b) => b.count - a.count || b.totalMinutes - a.totalMinutes);
      machineRecurringReasons[mName] = list;
    });

    // Consolidated across all machines in descending order
    const allOccs = Object.values(machineStopOccurrences).flat();
    const totalAllOccs = allOccs.length;
    const totalAllMin = allOccs.reduce((sum, o) => sum + (o.durationMin || 0), 0);
    const allMap: Record<string, {
      keyword: string;
      category: 'Manutenção' | 'Processo' | 'Outros' | 'Sem Trabalho';
      count: number;
      totalMinutes: number;
      occurrences: typeof allOccs;
    }> = {};

    allOccs.forEach(occ => {
      const key = occ.keyword.trim();
      if (!allMap[key]) {
        allMap[key] = {
          keyword: occ.keyword,
          category: occ.category,
          count: 0,
          totalMinutes: 0,
          occurrences: [],
        };
      }
      allMap[key].count += 1;
      allMap[key].totalMinutes += occ.durationMin;
      allMap[key].occurrences.push(occ);
    });

    const allRecurringReasons: RecurringStopItem[] = Object.values(allMap).map(item => ({
      keyword: item.keyword,
      category: item.category,
      count: item.count,
      totalMinutes: item.totalMinutes,
      formattedHours: formatMinToHours(item.totalMinutes),
      avgMinutes: item.count > 0 ? Math.round(item.totalMinutes / item.count) : 0,
      percentageOfMachineStops: totalAllOccs > 0 ? (item.count / totalAllOccs) * 100 : 0,
      percentageOfTime: totalAllMin > 0 ? (item.totalMinutes / totalAllMin) * 100 : 0,
      occurrences: item.occurrences,
    })).sort((a, b) => b.count - a.count || b.totalMinutes - a.totalMinutes);

    return {
      grossKg,
      taraKg,
      netKg,
      netTons: netKg / 1000,
      castNetKg,
      castNetTons,
      cast1NetKg,
      cast1NetTons: cast1NetKg / 1000,
      cast2NetKg,
      cast2NetTons: cast2NetKg / 1000,
      otherMachinesNetKg,
      ecoA,
      ecoBP,
      ecoBM,
      borra,
      totalRefuseKg,
      totalRefuseTons,
      scrapRatio,
      maintMin,
      procMin,
      otherMin,
      totalStopMin,
      eremaKg,
      eremaTons: eremaKg / 1000,
      eremaBags,
      activeDays,
      avgDailyNetKg,
      avgDailyNetTons,
      avgDailyCastNetKg,
      avgDailyCastNetTons,
      machineMap,
      shiftMap,
      topOperators,
      machineDowntimeMap,
      stoppagesList,
      machineRecurringReasons,
      allRecurringReasons,
      estimatedLostTons,
      entriesCount: filteredExtrusionData.length,
    };
  }, [filteredExtrusionData]);

  // Previous week comparison (Cast 1 and Cast 2 only, disregarding Erema for goal comparisons)
  const prevExtCastNetKg = useMemo(() => {
    return prevExtrusionData.reduce((acc, curr) => {
      const m = (curr.machine || '').toLowerCase();
      if (!m.includes('erema')) {
        return acc + Number(curr.netWeight || 0);
      }
      return acc;
    }, 0);
  }, [prevExtrusionData]);
  const prevExtCastNetTons = prevExtCastNetKg / 1000;
  const extTonsVariation = prevExtCastNetTons > 0 ? ((extStats.castNetTons - prevExtCastNetTons) / prevExtCastNetTons) * 100 : 0;
  const extTonsDelta = extStats.castNetTons - prevExtCastNetTons;

  // --- GOAL & PLAN METRICS (Base: 300 Toneladas por semana para Cast 1 e Cast 2) ---
  const weeklyGoalTons = formState.weeklyGoalTons || 300;
  const weeklyPlanTons = formState.weeklyPlanTons || 300;
  
  // % do plano realizado (Cast 1 + Cast 2)
  const percentPlanRealized = weeklyPlanTons > 0 ? (extStats.castNetTons / weeklyPlanTons) * 100 : 0;
  const deltaPlanTons = extStats.castNetTons - weeklyPlanTons;

  // Meta x Realizado (Cast 1 + Cast 2)
  const percentGoalAttained = weeklyGoalTons > 0 ? (extStats.castNetTons / weeklyGoalTons) * 100 : 0;
  const deltaGoalTons = extStats.castNetTons - weeklyGoalTons;
  const isGoalAttained = extStats.castNetTons >= weeklyGoalTons;

  // --- RIBBON CUTTING CALCULATIONS ---
  const ribbonStats = useMemo(() => {
    let producedM2 = 0;
    let rejectedM2 = 0;
    let wasteKg = 0;
    let jumboM2 = 0;
    let totalRolls = 0;
    let stoppedMin = 0;

    const typeMap: Record<string, { jumboM2: number; producedM2: number; wasteKg: number }> = {};
    const opMap: Record<string, { producedM2: number; rejectedM2: number; wasteKg: number; entries: number }> = {};

    filteredRibbonData.forEach(item => {
      producedM2 += Number(item.producedM2 || 0);
      rejectedM2 += Number(item.rejectedM2 || 0);
      wasteKg += Number(item.wasteWeight || 0);
      jumboM2 += Number(item.jumboM2 || 0);
      totalRolls += Number(item.rollsCount || 0);

      const stMin = Number(item.stoppedMinutes || 0) + Number(item.manutencaoMin || 0) + Number(item.processoMin || 0) + Number(item.outrosMin || 0);
      stoppedMin += stMin;

      const jt = (item.jumboType || 'Outro').toUpperCase().trim();
      if (!typeMap[jt]) typeMap[jt] = { jumboM2: 0, producedM2: 0, wasteKg: 0 };
      typeMap[jt].jumboM2 += Number(item.jumboM2 || 0);
      typeMap[jt].producedM2 += Number(item.producedM2 || 0);
      typeMap[jt].wasteKg += Number(item.wasteWeight || 0);

      if (item.operator) {
        const op = item.operator;
        if (!opMap[op]) opMap[op] = { producedM2: 0, rejectedM2: 0, wasteKg: 0, entries: 0 };
        opMap[op].producedM2 += Number(item.producedM2 || 0);
        opMap[op].rejectedM2 += Number(item.rejectedM2 || 0);
        opMap[op].wasteKg += Number(item.wasteWeight || 0);
        opMap[op].entries += 1;
      }
    });

    const yieldRate = jumboM2 > 0 ? (producedM2 / jumboM2) * 100 : 0;
    const jumbosEquivalent = jumboM2 / 6000;

    const topCutters = Object.entries(opMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.producedM2 - a.producedM2)
      .slice(0, 5);

    return {
      producedM2,
      rejectedM2,
      wasteKg,
      jumboM2,
      jumbosEquivalent,
      totalRolls,
      stoppedMin,
      yieldRate,
      typeMap,
      topCutters,
      entriesCount: filteredRibbonData.length,
    };
  }, [filteredRibbonData]);

  // Chart Data: Daily Extrusion in Tons
  const dailyExtrusionChart = useMemo(() => {
    const map: Record<string, { date: string; cast1: number; cast2: number; erema: number; total: number }> = {};
    filteredExtrusionData.forEach(e => {
      const d = formatDateBR(e.date);
      if (!map[d]) map[d] = { date: d, cast1: 0, cast2: 0, erema: 0, total: 0 };
      const m = (e.machine || '').toLowerCase();
      const netT = (Number(e.netWeight || 0)) / 1000;
      map[d].total += netT;
      if (m.includes('cast 1') || m.includes('cast1')) map[d].cast1 += netT;
      else if (m.includes('cast 2') || m.includes('cast2')) map[d].cast2 += netT;
      else if (m.includes('erema')) map[d].erema += netT;
    });
    return Object.values(map);
  }, [filteredExtrusionData]);

  // Chart Data: Losses Breakdown
  const lossesChartData = useMemo(() => {
    return [
      { name: 'Eco A (Sede)', value: extStats.ecoA, fill: '#3b82f6' },
      { name: 'Eco BP (Produção)', value: extStats.ecoBP, fill: '#6366f1' },
      { name: 'Eco BM (Manut.)', value: extStats.ecoBM, fill: '#f59e0b' },
      { name: 'Borra de Extrusão', value: extStats.borra, fill: '#ef4444' },
    ].filter(i => i.value > 0);
  }, [extStats]);

  // --- COPY WHATSAPP SUMMARY ---
  const handleCopyTextSummary = () => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Cópia de Texto Bloqueada', 'A cópia de texto formatado da reunião semanal não é permitida no Modo de Leitura.');
      } else {
        alert('Operação não permitida no Modo de Leitura.');
      }
      return;
    }
    const text = `
🏭 *APRESENTAÇÃO SEMANAL DE RESULTADOS - PLANTA*
🗓️ *Período:* ${formatDateBR(startDateStr)} a ${formatDateBR(endDateStr)}

📌 *PRODUÇÃO EXTRUSÃO (CAST 1 & 2 - META SEMANAL ${weeklyGoalTons.toFixed(0)} T)*
• *Toneladas Cast 1 & 2:* ${extStats.castNetTons.toFixed(2)} T (${formatKg(extStats.castNetKg)})
  - Cast 1: ${extStats.cast1NetTons.toFixed(2)} T (${formatKg(extStats.cast1NetKg)})
  - Cast 2: ${extStats.cast2NetTons.toFixed(2)} T (${formatKg(extStats.cast2NetKg)})
• *Meta Semanal x Realizado:* Meta ${weeklyGoalTons.toFixed(2)} T | Realizado ${extStats.castNetTons.toFixed(2)} T (${percentGoalAttained.toFixed(1)}% atingido | Delta: ${deltaGoalTons >= 0 ? `+${deltaGoalTons.toFixed(2)}` : deltaGoalTons.toFixed(2)} T)
• *% do Plano Realizado:* ${percentPlanRealized.toFixed(1)}% (Plano PCP: ${weeklyPlanTons.toFixed(2)} T)
• *Média Diária (Cast 1 & 2):* ${extStats.avgDailyCastNetTons.toFixed(2)} T/dia (${extStats.activeDays} dias ativos)

♻️ *RECICLAGEM EREMA (SEM META ESTABELECIDA)*
• *Total Reciclado:* ${extStats.eremaTons.toFixed(2)} T (${extStats.eremaBags} bags processados)

⚠️ *PRINCIPAIS PERDAS & PARADAS*
• *Taxa de Sucata:* ${extStats.scrapRatio.toFixed(2)}% (Total Perda: ${extStats.totalRefuseTons.toFixed(2)} T / ${formatKg(extStats.totalRefuseKg)})
  - Eco A (Sede): ${formatKg(extStats.ecoA)}
  - Eco BP: ${formatKg(extStats.ecoBP)} | Eco BM: ${formatKg(extStats.ecoBM)} | Borra: ${formatKg(extStats.borra)}
• *Tempo Total Parado:* ${formatMinToHours(extStats.totalStopMin)} (Manutenção: ${formatMinToHours(extStats.maintMin)} | Processo: ${formatMinToHours(extStats.procMin)})

🎯 *MOTIVOS DE NÃO ATINGIR A META / GAPS OPERACIONAIS:*
${formState.notAttainedReasons.trim() || 'Nenhum desvio crítico apontado.'}

🛠️ *PLANO DE AÇÃO CORRETIVA:*
${formState.correctiveActions.trim() || 'Sem ações pendentes registradas.'}

🔮 *PREVISÃO PARA OS PRÓXIMOS 7 DIAS (ANTECIPAÇÃO):*
• *Meta Prevista:* ${formState.forecastNext7DaysTons || 300} T
• *Matéria-Prima / Insumos:* ${formState.rawMaterialsDemand.trim() || 'Estoque e demandas alinhadas.'}
• *Manutenções Programadas:* ${formState.scheduledMaintenance.trim() || 'Sem intervenções de grande porte.'}
• *Necessidades Operacionais:* ${formState.operationalAnticipations.trim() || 'Escala normal de produção.'}
• *Ações Prioritárias:* ${formState.priorityActions.trim() || 'Manter ritmo operacional e foco no scrap.'}

🎀 *CORTE DE FITA ADESIVA*
• Área Produzida: ${formatM2(ribbonStats.producedM2)} (${ribbonStats.totalRolls.toLocaleString('pt-BR')} un) | Rendimento: ${ribbonStats.yieldRate.toFixed(1)}%

------------------------------------------------
_Relatório Padronizado de Reunião Semanal • Manupackaging Amazônia_
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 3000);
  };

  // --- PRINT WINDOW ---
  const handlePrint = () => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Impressão Bloqueada', 'A impressão de relatórios não é permitida no Modo de Leitura.');
      } else {
        alert('Impressão não permitida no Modo de Leitura.');
      }
      return;
    }
    window.print();
  };

  // --- DOWNLOAD PDF (jsPDF + autoTable in pristine light layout) ---
  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Top Header - Clean Timbre
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(0, 0, pageWidth, 28, 'F');
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.line(0, 28, pageWidth, 28);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('MANUPACKAGING AMAZÔNIA', 14, 11);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235); // blue-600
    doc.text('REUNIÃO SEMANAL DE RESULTADOS • APRESENTAÇÃO DA PLANTA', 14, 18);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Período Avaliado (Últimos 7 Dias): ${formatDateBR(startDateStr)} a ${formatDateBR(endDateStr)}`, 14, 24);
    doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - 14, 24, { align: 'right' });

    let currentY = 34;

    // SECTION 1: PRODUÇÃO & METAS PRINCIPAIS (Cast 1 & 2 com meta, Erema sem meta)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('1. INDICADORES CHAVE DE PRODUÇÃO & METAS (CAST 1 & 2)', 14, currentY);
    currentY += 4;

    const prodSummaryData = [
      ['Produção Cast 1 & 2 (Com Meta)', `${extStats.castNetTons.toFixed(2)} T (${formatKg(extStats.castNetKg)})`, 'Meta Semanal (Cast 1 & 2)', `${weeklyGoalTons.toFixed(2)} T`],
      ['% da Meta Atingida', `${percentGoalAttained.toFixed(1)}% (${deltaGoalTons >= 0 ? `+${deltaGoalTons.toFixed(2)} T` : `${deltaGoalTons.toFixed(2)} T`})`, 'Plano Semanal PCP', `${weeklyPlanTons.toFixed(2)} T`],
      ['% do Plano Realizado', `${percentPlanRealized.toFixed(1)}% (${deltaPlanTons >= 0 ? `+${deltaPlanTons.toFixed(2)} T` : `${deltaPlanTons.toFixed(2)} T`})`, 'Média Diária (Cast 1 & 2)', `${extStats.avgDailyCastNetTons.toFixed(2)} T/dia (${extStats.activeDays} dias)`],
      ['Produção Cast 1', `${extStats.cast1NetTons.toFixed(2)} T (${formatKg(extStats.cast1NetKg)})`, 'Produção Cast 2', `${extStats.cast2NetTons.toFixed(2)} T (${formatKg(extStats.cast2NetKg)})`],
      ['Reciclagem Erema (Sem Meta)', `${extStats.eremaTons.toFixed(2)} T (${extStats.eremaBags} bags)`, 'Taxa de Sucata / Perda', `${extStats.scrapRatio.toFixed(2)}% (${extStats.totalRefuseTons.toFixed(2)} T)`],
      ['Tempo Total Parado', formatMinToHours(extStats.totalStopMin), 'Paradas Manutenção', formatMinToHours(extStats.maintMin)],
    ];

    autoTable(doc, {
      startY: currentY,
      body: prodSummaryData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.2, textColor: [30, 41, 59] },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 45 },
        1: { fontStyle: 'bold', textColor: [37, 99, 235], cellWidth: 50 },
        2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 45 },
        3: { fontStyle: 'bold', cellWidth: 45 },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // SECTION 2: MOTIVOS DE NÃO ATINGIR A META & PLANO DE AÇÃO
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('2. ANÁLISE DOS MOTIVOS DE NÃO ATINGIMENTO DA META & AÇÕES CORRETIVAS', 14, currentY);
    currentY += 4;

    const reasonsTable = [
      ['Motivos Principais / Justificativas:', formState.notAttainedReasons.trim() || 'Meta atingida conforme planejado ou sem anomalias críticas registradas.'],
      ['Plano de Ação Corretiva Definido:', formState.correctiveActions.trim() || 'Ações operacionais padrão mantidas.'],
    ];

    autoTable(doc, {
      startY: currentY,
      body: reasonsTable,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3, textColor: [30, 41, 59] },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [254, 242, 242], textColor: [185, 28, 28], cellWidth: 55 },
        1: { textColor: [51, 65, 85] },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // SECTION 3: PRINCIPAIS PERDAS & INDISPONIBILIDADE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('3. DETALHAMENTO DE PERDAS E PARADAS DE MÁQUINA', 14, currentY);
    currentY += 4;

    const lossesTableData = [
      ['Eco A (Sede Curitiba)', formatKg(extStats.ecoA), 'Manutenção Cast 1', formatMinToHours(extStats.machineDowntimeMap['Cast 1']?.maintMin || 0)],
      ['Eco BP (Produção)', formatKg(extStats.ecoBP), 'Manutenção Cast 2', formatMinToHours(extStats.machineDowntimeMap['Cast 2']?.maintMin || 0)],
      ['Eco BM (Manutenção)', formatKg(extStats.ecoBM), 'Processo / Ajustes', formatMinToHours(extStats.procMin)],
      ['Borra de Extrusão', formatKg(extStats.borra), 'Outros Motivos', formatMinToHours(extStats.otherMin)],
      ['Total de Refugo Gerado', `${formatKg(extStats.totalRefuseKg)} (${extStats.totalRefuseTons.toFixed(2)} T)`, 'Impacto Estimado Paradas', `~${extStats.estimatedLostTons.toFixed(2)} T não produzidas`],
    ];

    autoTable(doc, {
      startY: currentY,
      body: lossesTableData,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [248, 250, 252] },
        1: { fontStyle: 'bold', textColor: [220, 38, 38] },
        2: { fontStyle: 'bold', fillColor: [248, 250, 252] },
        3: { fontStyle: 'bold', textColor: [217, 119, 6] },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;

    // Top Recurrent Reasons per machine in PDF
    const topRecurrentRows: any[] = [];
    ['Cast 1', 'Cast 2', 'Erema'].forEach((mName) => {
      const recs = extStats.machineRecurringReasons[mName] || [];
      if (recs.length > 0) {
        const topText = recs.slice(0, 4).map((r, i) => `${i + 1}º ${r.keyword} (${r.count}x - ${r.formattedHours})`).join('; ');
        topRecurrentRows.push([`Ranking Paradas ${mName}`, topText]);
      }
    });

    if (topRecurrentRows.length > 0) {
      autoTable(doc, {
        startY: currentY,
        body: topRecurrentRows,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [254, 243, 199], textColor: [180, 83, 9], cellWidth: 45 },
          1: { textColor: [51, 65, 85] },
        },
      });
      currentY = (doc as any).lastAutoTable.finalY + 6;
    }

    // Check page space for Forecast section or add page
    if (currentY > 210) {
      doc.addPage();
      currentY = 20;
    }

    // SECTION 4: PREVISÃO PARA OS PRÓXIMOS 7 DIAS (ANTECIPAÇÃO)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('4. PREVISÃO E ANTECIPAÇÃO PARA OS PRÓXIMOS 7 DIAS', 14, currentY);
    currentY += 4;

    const forecastData = [
      ['Meta Prevista Próximos 7 Dias:', `${formState.forecastNext7DaysTons || 300} Toneladas`],
      ['Demandas de Matéria-Prima & Insumos:', formState.rawMaterialsDemand.trim() || 'Necessidades de resinas, caixas e tubetes em conformidade com o estoque.'],
      ['Manutenções Preventivas & Programadas:', formState.scheduledMaintenance.trim() || 'Nenhuma intervenção mecânica/elétrica de parada prolongada prevista.'],
      ['Necessidades da Operação & Equipe:', formState.operationalAnticipations.trim() || 'Escalas completas e revezamentos alinhados.'],
      ['Ações Prioritárias da Planta:', formState.priorityActions.trim() || 'Foco em estabilidade de processo, produtividade e redução de scrap.'],
    ];

    autoTable(doc, {
      startY: currentY,
      body: forecastData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.5, textColor: [30, 41, 59] },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [239, 246, 255], textColor: [29, 78, 216], cellWidth: 60 },
        1: { textColor: [51, 65, 85] },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // SECTION 5: CORTE DE FITA ADESIVA & DESTAQUES (IF SPACE ALLOWS)
    if (ribbonStats.producedM2 > 0) {
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('5. RESULTADOS DE CORTE DE FITA ADESIVA', 14, currentY);
      currentY += 3.5;

      const ribbonTable = [
        ['Área Produzida (m²)', formatM2(ribbonStats.producedM2), 'Rendimento da Fita (%)', `${ribbonStats.yieldRate.toFixed(1)}%`],
        ['Jumbos Consumidos (m²)', formatM2(ribbonStats.jumboM2), 'Total de Rolos (un)', `${ribbonStats.totalRolls.toLocaleString('pt-BR')} un`],
        ['Sucata Gerada (Kg)', formatKg(ribbonStats.wasteKg), 'Tempo sob Paradas', formatMinToHours(ribbonStats.stoppedMin)],
      ];

      autoTable(doc, {
        startY: currentY,
        body: ribbonTable,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 2 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [248, 250, 252] },
          1: { fontStyle: 'bold', textColor: [16, 185, 129] },
          2: { fontStyle: 'bold', fillColor: [248, 250, 252] },
          3: { fontStyle: 'bold' },
        },
      });
    }

    if (setPdfModal) {
      setPdfModal({
        isOpen: true,
        doc,
        filename: `Apresentacao_Reuniao_Semanal_${startDateStr}_a_${endDateStr}.pdf`,
        title: `Apresentação Executiva Semanal (${startDateStr} a ${endDateStr})`
      });
      return;
    }

    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Download de PDF Bloqueado', 'O download de relatórios em PDF não é permitido no Modo de Leitura.');
      } else {
        alert('Download não permitido no Modo de Leitura.');
      }
      return;
    }

    doc.save(`Apresentacao_Reuniao_Semanal_${startDateStr}_a_${endDateStr}.pdf`);
  };

  if (!isOpen) return null;

  return (
    <div id="weekly-meeting-modal" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-all animate-in fade-in duration-200">
      
      {/* Print-only CSS injection */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #weekly-meeting-modal, #weekly-meeting-modal * {
            visibility: visible;
          }
          #weekly-meeting-modal {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            z-index: 99999 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-full-card {
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            break-inside: avoid;
          }
        }
      `}</style>

      {/* Main Container - Crisp Light Theme & Expanded Viewport */}
      <div className="bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl md:rounded-3xl shadow-2xl flex flex-col w-full max-w-[98vw] 2xl:max-w-[1650px] max-h-[96vh] h-[96vh] overflow-hidden">
        
        {/* HEADER BAR (LIGHT THEME) - CONSOLIDATED SINGLE SLIM ROW */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs no-print relative z-20">
          
          {/* Left: Brand, Title & Section Selector */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-xs border border-blue-500 shrink-0">
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-slate-900 leading-tight">
                  Reunião Semanal de Resultados
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-black uppercase rounded-full tracking-wider">
                  Padronização
                </span>
                {saveStatus === 'saved' && (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase rounded-full tracking-wider flex items-center gap-1">
                    <Check className="w-3 h-3" /> Salvo
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <span>Manupackaging Amazônia</span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-600 font-bold">Foco em Resultados & Antecipação</span>
              </p>
            </div>

            {/* Section / Pauta Selector (Compact Dropdown Inline) */}
            <div className="hidden lg:flex items-center ml-2 pl-3 border-l border-slate-200">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider pl-1">Pauta:</span>
                <select
                  value={activePauta}
                  onChange={(e) => setActivePauta(e.target.value as any)}
                  className="bg-white text-slate-800 font-extrabold text-[11px] uppercase tracking-wide px-2.5 py-1 rounded-lg border border-slate-200 outline-none cursor-pointer hover:border-slate-300 shadow-2xs"
                >
                  <option value="all">Visão Completa (Todas as Pautas)</option>
                  <option value="meta">1. Meta x Realizado</option>
                  <option value="losses">2. Principais Perdas</option>
                  <option value="forecast">3. Previsão Próximos 7 Dias</option>
                  <option value="ribbon">4. Corte de Fita</option>
                  <option value="operators">5. Destaques Operacionais</option>
                </select>
              </div>
            </div>
          </div>

          {/* Center: Period Controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setPeriodMode('last7days')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider transition-all ${
                    periodMode === 'last7days' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  7 Dias
                </button>
                <button
                  onClick={() => setPeriodMode('calendarWeek')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider transition-all ${
                    periodMode === 'calendarWeek' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semana
                </button>
                <button
                  onClick={() => setPeriodMode('custom')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider transition-all ${
                    periodMode === 'custom' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Personalizado
                </button>
              </div>

              {periodMode !== 'custom' ? (
                <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200 ml-1">
                  <button
                    onClick={() => handleShiftPeriod(-7)}
                    className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-all active:scale-95"
                    title="Período Anterior (-7 dias)"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-black text-slate-800 px-1 whitespace-nowrap">
                    {formatDateBR(startDateStr)} <span className="text-slate-400">a</span> {formatDateBR(endDateStr)}
                  </span>
                  <button
                    onClick={() => handleShiftPeriod(7)}
                    className="p-1 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition-all active:scale-95"
                    title="Próximo Período (+7 dias)"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleResetToCurrent}
                    className="ml-0.5 px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[9px] font-black uppercase rounded tracking-wider"
                  >
                    Hoje
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200 ml-1">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="text-[11px] font-bold text-slate-800 bg-transparent border-0 outline-none"
                  />
                  <span className="text-[10px] text-slate-400 font-bold">a</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="text-[11px] font-bold text-slate-800 bg-transparent border-0 outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right: Actions Dropdown Menu + Quick PDF Button + Close Button */}
          <div className="flex items-center gap-2 relative">
            {/* Meta indicator badge */}
            <span className="hidden xl:inline-flex items-center gap-1 text-blue-700 bg-blue-50 px-2.5 py-1 rounded-xl text-[11px] font-extrabold border border-blue-200">
              Meta: 300 T (Cast 1 & 2)
            </span>

            {/* Mobile Pauta selector */}
            <div className="lg:hidden">
              <select
                value={activePauta}
                onChange={(e) => setActivePauta(e.target.value as any)}
                className="bg-slate-100 text-slate-800 font-extrabold text-[11px] uppercase tracking-wide px-2 py-1.5 rounded-xl border border-slate-200 outline-none"
              >
                <option value="all">Visão Completa</option>
                <option value="meta">1. Meta x Realizado</option>
                <option value="losses">2. Principais Perdas</option>
                <option value="forecast">3. Previsão</option>
                <option value="ribbon">4. Corte de Fita</option>
                <option value="operators">5. Destaques</option>
              </select>
            </div>

            {/* Agrupamento de Ações: Menu Suspenso (Dropdown) */}
            <div className="relative">
              <button
                onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
                title="Abrir menu de ações e exportações"
              >
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Ações & Opções</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isActionsMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isActionsMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsActionsMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Exportação & Apresentação
                      </span>
                    </div>

                    <button
                      onClick={() => { setIsActionsMenuOpen(false); handleDownloadPDF(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-xl text-xs font-black uppercase transition-colors cursor-pointer text-left group"
                    >
                      <div className="p-1 rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-slate-900 font-black">Salvar Relatório PDF</div>
                        <div className="text-[10px] text-slate-400 font-semibold normal-case">Download do PDF executivo</div>
                      </div>
                    </button>

                    <button
                      onClick={() => { setIsActionsMenuOpen(false); handlePrint(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-slate-700 hover:bg-blue-50 hover:text-blue-800 rounded-xl text-xs font-black uppercase transition-colors cursor-pointer text-left group"
                    >
                      <div className="p-1 rounded-lg bg-blue-100 text-blue-700 group-hover:bg-blue-200">
                        <Printer className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-slate-900 font-black">Imprimir Relatório</div>
                        <div className="text-[10px] text-slate-400 font-semibold normal-case">Impressão formatada</div>
                      </div>
                    </button>

                    <button
                      onClick={() => { setIsActionsMenuOpen(false); handleCopyTextSummary(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-slate-700 hover:bg-amber-50 hover:text-amber-800 rounded-xl text-xs font-black uppercase transition-colors cursor-pointer text-left group"
                    >
                      <div className="p-1 rounded-lg bg-amber-100 text-amber-700 group-hover:bg-amber-200">
                        {copiedText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-amber-700" />}
                      </div>
                      <div>
                        <div className="text-slate-900 font-black">{copiedText ? 'Copiado!' : 'Copiar Texto (WhatsApp)'}</div>
                        <div className="text-[10px] text-slate-400 font-semibold normal-case">Resumo pronto para envio</div>
                      </div>
                    </button>

                    <button
                      onClick={() => { setIsActionsMenuOpen(false); setViewMode(v => v === 'interactive' ? 'preview' : 'interactive'); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-slate-700 hover:bg-indigo-50 hover:text-indigo-800 rounded-xl text-xs font-black uppercase transition-colors cursor-pointer text-left group border-t border-slate-100 mt-1 pt-2"
                    >
                      <div className="p-1 rounded-lg bg-indigo-100 text-indigo-700 group-hover:bg-indigo-200">
                        <Eye className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-slate-900 font-black">{viewMode === 'preview' ? 'Modo Interativo' : 'Prévia de Impressão'}</div>
                        <div className="text-[10px] text-slate-400 font-semibold normal-case">Alternar visualização limpa</div>
                      </div>
                    </button>

                    <button
                      onClick={() => { setIsActionsMenuOpen(false); handleSaveToCloud(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-black uppercase transition-colors cursor-pointer text-left group border-t border-slate-100 mt-1 pt-2"
                    >
                      <div className="p-1 rounded-lg bg-slate-100 text-slate-700 group-hover:bg-slate-200">
                        <Check className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-slate-900 font-black">Salvar Pautas na Nuvem</div>
                        <div className="text-[10px] text-slate-400 font-semibold normal-case">Registrar notas da reunião</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Quick direct PDF button */}
            <button
              onClick={handleDownloadPDF}
              className="hidden md:flex px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs items-center gap-1.5 active:scale-95 cursor-pointer"
              title="Baixar Relatório Executivo em PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Salvar PDF</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-all active:scale-95 cursor-pointer ml-0.5"
              title="Fechar Janela"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SCROLLABLE MAIN CONTENT AREA (LIGHT THEME) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">

          {/* Context Scope Info Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs text-xs font-semibold text-slate-600 no-print">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span>Período: <strong className="text-slate-900 font-extrabold">{formatDateBR(startDateStr)} a {formatDateBR(endDateStr)}</strong></span>
              <span className="text-slate-300">•</span>
              <span>Visualização: <strong className="text-blue-700 font-extrabold uppercase">{
                activePauta === 'all' ? 'Visão Completa (Todas as Pautas)' :
                activePauta === 'meta' ? '1. Meta x Realizado' :
                activePauta === 'losses' ? '2. Principais Perdas' :
                activePauta === 'forecast' ? '3. Previsão Próximos 7 Dias' :
                activePauta === 'ribbon' ? '4. Corte de Fita' : '5. Destaques Operacionais'
              }</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px] font-bold">Meta Semanal:</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-800 font-extrabold text-[11px] border border-blue-200">
                300 Toneladas (Cast 1 & 2)
              </span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION: 4 BIG KEY EXECUTIVE METRICS CARDS (PRODUÇÃO) */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print-full-card">
            
            {/* Card 1: Toneladas Produzidas Cast 1 & 2 */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-blue-600" />
                    Produção Cast 1 & 2
                  </span>
                  <span className="text-[10px] font-black uppercase bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                    Com Meta
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl lg:text-4xl font-black text-slate-900 font-mono tracking-tight">
                    {extStats.castNetTons.toFixed(2)}
                  </span>
                  <span className="text-base font-black text-blue-600 font-mono">T</span>
                </div>
                <p className="text-xs text-slate-500 font-bold font-mono mt-1">
                  {formatKg(extStats.castNetKg)} líquido (Cast 1 + 2)
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                <div className="text-slate-600">
                  <span className="text-slate-400">Média:</span> <strong>{extStats.avgDailyCastNetTons.toFixed(2)} T/dia</strong>
                </div>
                <div className={`flex items-center gap-1 font-bold ${extTonsVariation >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {extTonsVariation >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  <span>{extTonsVariation >= 0 ? `+${extTonsVariation.toFixed(1)}%` : `${extTonsVariation.toFixed(1)}%`}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Meta x Realizado */}
            <div className={`bg-white p-5 rounded-2xl border shadow-xs transition-all flex flex-col justify-between ${
              isGoalAttained ? 'border-emerald-200 hover:border-emerald-300' : 'border-amber-200 hover:border-amber-300'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-emerald-600" />
                    Meta x Realizado
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                    isGoalAttained 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {isGoalAttained ? 'Meta Batida' : 'Abaixo da Meta'}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl lg:text-4xl font-black text-slate-900 font-mono tracking-tight">
                    {percentGoalAttained.toFixed(1)}%
                  </span>
                  <span className="text-xs font-bold text-slate-500">atingido</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full mt-2.5 overflow-hidden border border-slate-200/60">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${isGoalAttained ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(100, percentGoalAttained)}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">
                  Meta Cast 1 & 2: <strong>{weeklyGoalTons.toFixed(1)} T</strong>
                </span>
                <span className={`font-black font-mono ${deltaGoalTons >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {deltaGoalTons >= 0 ? `+${deltaGoalTons.toFixed(2)} T` : `${deltaGoalTons.toFixed(2)} T`}
                </span>
              </div>
            </div>

            {/* Card 3: % do Plano Realizado */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    % Plano Realizado
                  </span>
                  <span className="text-[10px] font-black uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                    Aderência PCP
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl lg:text-4xl font-black text-indigo-950 font-mono tracking-tight">
                    {percentPlanRealized.toFixed(1)}%
                  </span>
                  <span className="text-xs font-bold text-slate-500">do plano</span>
                </div>

                <p className="text-xs text-slate-500 font-bold mt-1">
                  Planejado: <strong className="text-slate-800">{weeklyPlanTons.toFixed(1)} T</strong> ({formatKg(weeklyPlanTons * 1000)})
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">Desvio PCP:</span>
                <span className={`font-black font-mono ${deltaPlanTons >= 0 ? 'text-emerald-700' : 'text-indigo-700'}`}>
                  {deltaPlanTons >= 0 ? `+${deltaPlanTons.toFixed(2)} T` : `${deltaPlanTons.toFixed(2)} T`}
                </span>
              </div>
            </div>

            {/* Card 4: Principais Perdas & Rendimento */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-300 transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    Principais Perdas
                  </span>
                  <span className="text-[10px] font-black uppercase bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md border border-rose-100">
                    Scrap Rate
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl lg:text-4xl font-black text-slate-900 font-mono tracking-tight">
                    {extStats.scrapRatio.toFixed(2)}%
                  </span>
                  <span className="text-xs font-bold text-slate-500">perda</span>
                </div>

                <p className="text-xs text-slate-500 font-bold font-mono mt-1">
                  Total refugo: <strong className="text-rose-600">{extStats.totalRefuseTons.toFixed(2)} T</strong> ({formatKg(extStats.totalRefuseKg)})
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">Paradas:</span>
                <span className="font-bold text-amber-700 font-mono">
                  {formatMinToHours(extStats.totalStopMin)}
                </span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PRODUCTION BREAKDOWN STRIP (CAST 1, CAST 2, TOTAL CAST, EREMA) */}
          {/* ========================================================================= */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 print-full-card">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Divisão Operacional por Linha de Produção
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold">
                  Meta aplicada para Cast 1 e Cast 2. Erema opera como processo de reciclagem.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1 max-w-4xl">
              {/* Cast 1 */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Cast 1</span>
                  <div className="text-base font-black text-slate-900 font-mono">{extStats.cast1NetTons.toFixed(2)} T</div>
                </div>
                <span className="text-xs font-bold text-slate-500 font-mono">{formatKg(extStats.cast1NetKg)}</span>
              </div>

              {/* Cast 2 */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Cast 2</span>
                  <div className="text-base font-black text-slate-900 font-mono">{extStats.cast2NetTons.toFixed(2)} T</div>
                </div>
                <span className="text-xs font-bold text-slate-500 font-mono">{formatKg(extStats.cast2NetKg)}</span>
              </div>

              {/* Total Cast 1 & 2 (Com Meta) */}
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">Total Cast 1 & 2</span>
                  <div className="text-base font-black text-blue-950 font-mono">{extStats.castNetTons.toFixed(2)} T</div>
                </div>
                <span className="text-xs font-bold text-blue-700 font-mono">{percentGoalAttained.toFixed(1)}% meta</span>
              </div>

              {/* Erema Reciclado (Sem Meta) */}
              <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-700">Erema (Reciclado)</span>
                    <span className="text-[9px] font-bold bg-purple-200 text-purple-800 px-1 py-0.5 rounded">Sem Meta</span>
                  </div>
                  <div className="text-base font-black text-purple-900 font-mono">{extStats.eremaTons.toFixed(2)} T</div>
                </div>
                <span className="text-xs font-bold text-purple-700 font-mono">{extStats.eremaBags} bags</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PAUTA 1: MOTIVOS DE NÃO ATINGIR A META & PLANO DE AÇÃO CORRETIVA */}
          {/* ========================================================================= */}
          {(activePauta === 'all' || activePauta === 'meta') && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print-full-card">
              <div className="bg-gradient-to-r from-blue-50 to-slate-50 border-b border-slate-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                      Pauta 1: Meta x Realizado & Motivos de Não Atingimento da Meta
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">
                      Nossa meta semanal é de <strong className="text-blue-700 font-black">300 Toneladas</strong> (1.200 T/mês) exclusiva para as linhas <strong className="text-slate-800">Cast 1 e Cast 2</strong> (Erema atua como processo de reciclagem, sem meta direta de produção). Registre os motivos dos desvios e o plano de ação.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-slate-500">Ajuste de Meta / Plano (T):</span>
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1">
                    <input
                      type="number"
                      value={formState.weeklyGoalTons}
                      onChange={(e) => handleFieldChange('weeklyGoalTons', Number(e.target.value))}
                      className="w-16 text-xs font-bold text-slate-900 text-center outline-hidden"
                      title="Meta semanal em Toneladas"
                    />
                    <span className="text-xs font-bold text-slate-400">T</span>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-6">
                
                {/* Automatic Stoppages Breakdown from System */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      Diagnóstico Automático do Sistema • Paradas e Indisponibilidade Registradas
                    </h4>
                    <span className="text-xs text-slate-500 font-semibold">
                      Impacto estimado das paradas: <strong className="text-rose-600">~{extStats.estimatedLostTons.toFixed(2)} T</strong> não produzidas
                    </span>
                  </div>

                  {extStats.stoppagesList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {['Cast 1', 'Cast 2', 'Erema'].map((mName) => {
                        const dt = extStats.machineDowntimeMap[mName] || { maintMin: 0, procMin: 0, otherMin: 0, totalStopMin: 0, reasons: [] };
                        return (
                          <div key={mName} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-800">{mName}</span>
                                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-mono">
                                  {formatMinToHours(dt.totalStopMin)} parado
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-1 text-[11px] text-slate-600 mb-3 border-y border-slate-200 py-1.5">
                                <div>Manut: <strong className="text-slate-800">{formatMinToHours(dt.maintMin)}</strong></div>
                                <div>Proc: <strong className="text-slate-800">{formatMinToHours(dt.procMin)}</strong></div>
                                <div>Outros: <strong className="text-slate-800">{formatMinToHours(dt.otherMin)}</strong></div>
                              </div>
                              
                              {/* Reasons list */}
                              <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Motivos Apontados:</span>
                                {dt.reasons.length > 0 ? (
                                  <ul className="text-xs text-slate-700 space-y-1 max-h-24 overflow-y-auto pr-1">
                                    {dt.reasons.map((r, rIdx) => (
                                      <li key={rIdx} className="bg-white px-2 py-1 rounded border border-slate-200 text-[11px] font-medium flex items-start gap-1">
                                        <span className="text-amber-500 font-bold">•</span>
                                        <span>{r}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-slate-400 italic">Nenhum motivo específico registrado.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-500 font-semibold">
                      Nenhuma parada crítica registrada nos apontamentos do período.
                    </div>
                  )}
                </div>

                {/* ================================================================= */}
                {/* RANKING DE RECORRÊNCIA DE PARADAS POR MÁQUINA (ORDEM DECRESCENTE) */}
                {/* ================================================================= */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                    <div className="flex items-start sm:items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-600">
                        <Flame className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                            Principais Motivos e Recorrência de Paradas por Máquina
                          </h4>
                          <span className="text-[10px] font-black bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Ordem Decrescente
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          Mapeamento de palavras-chave mais repetidas nos apontamentos para identificação imediata de falhas crônicas.
                        </p>
                      </div>
                    </div>

                    {/* Machine Filter Selector Tabs */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs self-start sm:self-auto overflow-x-auto no-print">
                      <button
                        onClick={() => setRecurrentMachineTab('all')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-black transition-all flex items-center gap-1 whitespace-nowrap ${
                          recurrentMachineTab === 'all'
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        Todas as Linhas
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          recurrentMachineTab === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {extStats.allRecurringReasons.reduce((acc, curr) => acc + curr.count, 0)}
                        </span>
                      </button>

                      {['Cast 1', 'Cast 2', 'Erema'].map((mKey) => {
                        const mCount = (extStats.machineRecurringReasons[mKey] || []).reduce((acc, curr) => acc + curr.count, 0);
                        const isSel = recurrentMachineTab === mKey;
                        return (
                          <button
                            key={mKey}
                            onClick={() => setRecurrentMachineTab(mKey as any)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-black transition-all flex items-center gap-1 whitespace-nowrap ${
                              isSel
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            }`}
                          >
                            {mKey}
                            {mCount > 0 && (
                              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                isSel ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {mCount}x
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* DISPLAY MODE: ALL MACHINES (3 Columns) */}
                  {recurrentMachineTab === 'all' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {['Cast 1', 'Cast 2', 'Erema'].map((mName) => {
                        const recReasons = extStats.machineRecurringReasons[mName] || [];
                        const totalStops = recReasons.reduce((acc, r) => acc + r.count, 0);
                        const totalMinutes = recReasons.reduce((acc, r) => acc + r.totalMinutes, 0);
                        const maxCount = recReasons.length > 0 ? Math.max(...recReasons.map(r => r.count)) : 1;

                        return (
                          <div key={mName} className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs">
                            <div>
                              {/* Machine Subheader */}
                              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                                  <span className="text-xs font-black uppercase tracking-wider text-slate-900">{mName}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[11px] font-bold text-slate-700 font-mono">
                                    {totalStops} {totalStops === 1 ? 'ocorrência' : 'ocorrências'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-semibold block">
                                    {formatMinToHours(totalMinutes)} total
                                  </span>
                                </div>
                              </div>

                              {/* Reasons list in descending order */}
                              {recReasons.length > 0 ? (
                                <div className="space-y-2">
                                  {recReasons.map((item, idx) => {
                                    const isTop1 = idx === 0;
                                    const isTop2 = idx === 1;
                                    const isTop3 = idx === 2;
                                    const expandKey = `${mName}_${item.keyword}_${idx}`;
                                    const isExpanded = expandedRecurrentKey === expandKey;

                                    return (
                                      <div
                                        key={idx}
                                        className={`rounded-lg border transition-all ${
                                          isTop1
                                            ? 'bg-amber-50/50 border-amber-200'
                                            : 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300'
                                        }`}
                                      >
                                        <div className="p-2.5">
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                              <span
                                                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                                                  isTop1
                                                    ? 'bg-amber-400 text-slate-950 shadow-2xs font-black'
                                                    : isTop2
                                                    ? 'bg-slate-300 text-slate-800'
                                                    : isTop3
                                                    ? 'bg-amber-800/15 text-amber-900 border border-amber-300'
                                                    : 'bg-slate-200 text-slate-600'
                                                }`}
                                              >
                                                {idx + 1}º
                                              </span>
                                              <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <span className="text-xs font-black text-slate-900 truncate">
                                                    {item.keyword}
                                                  </span>
                                                  <span
                                                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                                                      item.category === 'Manutenção'
                                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                        : item.category === 'Processo'
                                                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                                        : item.category === 'Sem Trabalho'
                                                        ? 'bg-slate-200 text-slate-700'
                                                        : 'bg-purple-100 text-purple-800 border border-purple-200'
                                                    }`}
                                                  >
                                                    {item.category}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Frequency & Time Badge */}
                                            <div className="text-right shrink-0">
                                              <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-900 px-2 py-0.5 rounded-md text-[11px] font-black font-mono">
                                                🔥 {item.count}x
                                              </span>
                                              <span className="text-[10px] text-slate-500 font-bold block mt-0.5 font-mono">
                                                {item.formattedHours}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Relative frequency progress bar */}
                                          <div className="mt-2 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                            <div
                                              className={`h-full rounded-full transition-all ${
                                                isTop1 ? 'bg-rose-500' : isTop2 ? 'bg-amber-500' : 'bg-blue-500'
                                              }`}
                                              style={{ width: `${Math.max(8, (item.count / maxCount) * 100)}%` }}
                                            />
                                          </div>

                                          {/* Toggle detailed occurrences */}
                                          <div className="mt-2 flex items-center justify-between text-[10px]">
                                            <span className="text-slate-400 font-semibold">
                                              {item.avgMinutes > 0 ? `Média: ~${item.avgMinutes} min/parada` : ''}
                                            </span>
                                            <button
                                              onClick={() => setExpandedRecurrentKey(isExpanded ? null : expandKey)}
                                              className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 no-print"
                                            >
                                              {isExpanded ? (
                                                <>Ocultar <ChevronUp className="w-3 h-3" /></>
                                              ) : (
                                                <>Ver {item.occurrences.length} {item.occurrences.length === 1 ? 'apontamento' : 'apontamentos'} <ChevronDown className="w-3 h-3" /></>
                                              )}
                                            </button>
                                          </div>
                                        </div>

                                        {/* Expanded Occurrences Timeline */}
                                        {isExpanded && (
                                          <div className="bg-white px-2.5 py-2 border-t border-slate-200 space-y-1.5 text-[11px] rounded-b-lg">
                                            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 pb-1">
                                              Registros Originais do Operador:
                                            </div>
                                            {item.occurrences.map((occ, oIdx) => (
                                              <div
                                                key={oIdx}
                                                className="bg-slate-50 border border-slate-200/80 rounded p-1.5 text-slate-700"
                                              >
                                                <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mb-0.5">
                                                  <span>📅 {formatDateBR(occ.date)} • Turno {occ.shift}</span>
                                                  <span className="font-mono text-amber-700 font-bold">
                                                    {occ.timeRange || formatMinToHours(occ.durationMin)}
                                                  </span>
                                                </div>
                                                <div className="text-[11px] font-medium text-slate-800">
                                                  {occ.description}
                                                </div>
                                                {occ.operator && (
                                                  <div className="text-[9px] text-slate-400 mt-0.5">
                                                    Op: <strong className="text-slate-600">{occ.operator}</strong>
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-center py-6 text-xs text-slate-400 italic">
                                  Nenhum registro de parada apontado nesta máquina.
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* DISPLAY MODE: INDIVIDUAL MACHINE SELECTED */}
                  {recurrentMachineTab !== 'all' && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
                      {(() => {
                        const mName = recurrentMachineTab;
                        const recReasons = extStats.machineRecurringReasons[mName] || [];
                        const totalStops = recReasons.reduce((acc, r) => acc + r.count, 0);
                        const totalMinutes = recReasons.reduce((acc, r) => acc + r.totalMinutes, 0);
                        const maxCount = recReasons.length > 0 ? Math.max(...recReasons.map(r => r.count)) : 1;

                        return (
                          <>
                            {/* Summary strip for machine */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Máquina</span>
                                <div className="text-sm font-black text-slate-900">{mName}</div>
                              </div>
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total de Paradas</span>
                                <div className="text-sm font-black text-rose-600 font-mono">{totalStops} ocorrências</div>
                              </div>
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tempo Acumulado</span>
                                <div className="text-sm font-black text-amber-700 font-mono">{formatMinToHours(totalMinutes)}</div>
                              </div>
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Principal Gargalo</span>
                                <div className="text-sm font-black text-blue-700 truncate">
                                  {recReasons[0] ? `${recReasons[0].keyword} (${recReasons[0].count}x)` : 'Sem Paradas'}
                                </div>
                              </div>
                            </div>

                            {/* Full detailed list of reasons in descending order */}
                            {recReasons.length > 0 ? (
                              <div className="space-y-3">
                                {recReasons.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                                            idx === 0
                                              ? 'bg-amber-400 text-slate-950 shadow-2xs'
                                              : idx === 1
                                              ? 'bg-slate-300 text-slate-800'
                                              : idx === 2
                                              ? 'bg-amber-800/15 text-amber-900 border border-amber-300'
                                              : 'bg-slate-200 text-slate-600'
                                          }`}
                                        >
                                          {idx + 1}º
                                        </span>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-black text-slate-900">{item.keyword}</span>
                                            <span
                                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                                item.category === 'Manutenção'
                                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                  : item.category === 'Processo'
                                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                                  : item.category === 'Sem Trabalho'
                                                  ? 'bg-slate-200 text-slate-700'
                                                  : 'bg-purple-100 text-purple-800 border border-purple-200'
                                              }`}
                                            >
                                              {item.category}
                                            </span>
                                          </div>
                                          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                                            {item.percentageOfMachineStops.toFixed(1)}% de todas as paradas da {mName} • {item.percentageOfTime.toFixed(1)}% do tempo total parado
                                          </p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 self-end sm:self-auto">
                                        <span className="bg-rose-100 text-rose-900 border border-rose-200 px-3 py-1 rounded-lg text-xs font-black font-mono">
                                          🔥 {item.count} {item.count === 1 ? 'ocorrência' : 'ocorrências'}
                                        </span>
                                        <span className="bg-amber-100 text-amber-900 border border-amber-200 px-3 py-1 rounded-lg text-xs font-bold font-mono">
                                          ⏱️ {item.formattedHours}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${idx === 0 ? 'bg-rose-500' : 'bg-blue-600'}`}
                                        style={{ width: `${Math.max(5, (item.count / maxCount) * 100)}%` }}
                                      />
                                    </div>

                                    {/* Individual Logs List */}
                                    <div className="pt-2 border-t border-slate-200/80">
                                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                        Apontamentos Registrados ({item.occurrences.length}):
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {item.occurrences.map((occ, oIdx) => (
                                          <div
                                            key={oIdx}
                                            className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs text-slate-700"
                                          >
                                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mb-1">
                                              <span>📅 {formatDateBR(occ.date)} (Turno {occ.shift})</span>
                                              <span className="font-mono text-amber-700 font-bold">
                                                {occ.timeRange || formatMinToHours(occ.durationMin)}
                                              </span>
                                            </div>
                                            <div className="font-medium text-slate-800 text-[11px]">
                                              {occ.description}
                                            </div>
                                            {occ.operator && (
                                              <div className="text-[9px] text-slate-400 mt-1">
                                                Operador: <strong className="text-slate-600">{occ.operator}</strong>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-xs text-slate-400 italic">
                                Nenhum apontamento de parada registrado nesta linha de produção no período.
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Structured Inputs for Meeting Discussions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                  
                  {/* Motivos de Não Atingir a Meta (Input) */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Motivos Principais de Desvio / Não Atingimento da Meta:
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">Edição da Reunião</span>
                    </label>
                    <textarea
                      value={formState.notAttainedReasons}
                      onChange={(e) => handleFieldChange('notAttainedReasons', e.target.value)}
                      placeholder="Ex: Parada de 6h na Cast 1 por quebra de rolamento do puxador; Instabilidade de temperatura na matriz da Cast 2 gerando oscilação de espessura; Troca de formulação LC3 para ATX com setup demorado..."
                      className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed outline-hidden transition-all shadow-2xs min-h-[120px]"
                    />
                  </div>

                  {/* Plano de Ação Corretiva (Input) */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                        Ações Corretivas Definidas & Responsáveis:
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">Ata & Compromissos</span>
                    </label>
                    <textarea
                      value={formState.correctiveActions}
                      onChange={(e) => handleFieldChange('correctiveActions', e.target.value)}
                      placeholder="Ex: 1. Manutenção: Substituição preventiva dos mancais da Cast 1 (Resp: Carlos - até 30/08); 2. Processo: Padronizar rampa de aquecimento para troca de resina; 3. Produção: Treinar equipe do Turno B no alinhamento de bobinas..."
                      className="w-full bg-white border border-slate-300 focus:border-emerald-500 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed outline-hidden transition-all shadow-2xs min-h-[120px]"
                    />
                  </div>
                </div>

                <div className="flex justify-end no-print">
                  <button
                    onClick={handleSaveToCloud}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    Salvar Pauta 1
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PAUTA 2: PRINCIPAIS PERDAS & RENDIMENTO */}
          {/* ========================================================================= */}
          {(activePauta === 'all' || activePauta === 'losses') && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print-full-card">
              <div className="bg-gradient-to-r from-amber-50 to-slate-50 border-b border-slate-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-black">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                      Pauta 2: Análise das Principais Perdas & Rendimento de Matéria-Prima
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">
                      Acompanhamento minucioso de refugo (Eco A, Eco BP, Eco BM e Borra) e eficiência da planta.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-xl border border-rose-200 font-mono">
                    Perda Total: {extStats.totalRefuseTons.toFixed(2)} T ({formatKg(extStats.totalRefuseKg)})
                  </span>
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-xl border border-blue-200 font-mono">
                    Scrap: {extStats.scrapRatio.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-6">
                
                {/* Losses Breakdown Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Eco A */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Refugo Eco A (Sede)</span>
                    <div className="text-xl font-black text-slate-900 font-mono mt-1">{formatKg(extStats.ecoA)}</div>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">
                      {extStats.grossKg > 0 ? ((extStats.ecoA / extStats.grossKg) * 100).toFixed(2) : 0}% da produção bruta
                    </p>
                  </div>

                  {/* Eco BP */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Refugo Eco B (Produção)</span>
                    <div className="text-xl font-black text-slate-900 font-mono mt-1">{formatKg(extStats.ecoBP)}</div>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">
                      {extStats.grossKg > 0 ? ((extStats.ecoBP / extStats.grossKg) * 100).toFixed(2) : 0}% da produção bruta
                    </p>
                  </div>

                  {/* Eco BM */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Refugo Eco B (Manutenção)</span>
                    <div className="text-xl font-black text-slate-900 font-mono mt-1">{formatKg(extStats.ecoBM)}</div>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">
                      {extStats.grossKg > 0 ? ((extStats.ecoBM / extStats.grossKg) * 100).toFixed(2) : 0}% da produção bruta
                    </p>
                  </div>

                  {/* Borra */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider">Borra de Extrusão</span>
                    <div className="text-xl font-black text-slate-900 font-mono mt-1">{formatKg(extStats.borra)}</div>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">
                      {extStats.grossKg > 0 ? ((extStats.borra / extStats.grossKg) * 100).toFixed(2) : 0}% da produção bruta
                    </p>
                  </div>
                </div>

                {/* Losses Chart & Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                      Composição das Perdas (%)
                    </span>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={lossesChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={65}
                            innerRadius={35}
                            paddingAngle={3}
                          >
                            {lossesChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => formatKg(Number(value))} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Input for Losses Analysis */}
                  <div className="lg:col-span-2 space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-800 flex items-center justify-between">
                      <span>Análise Técnica de Perdas & Ações para Redução de Scrap:</span>
                      <span className="text-[10px] text-slate-400 font-bold">Edição da Reunião</span>
                    </label>
                    <textarea
                      value={formState.lossAnalysisNotes}
                      onChange={(e) => handleFieldChange('lossAnalysisNotes', e.target.value)}
                      placeholder="Ex: Elevado refugo Eco B no início da semana decorrente de oscilação na dosagem de pigmento; Ação para reutilização dos aparas diretamente no moinho do Erema; Ajuste nas matrizes para reduzir a formação de borra nos arranques..."
                      className="w-full bg-white border border-slate-300 focus:border-amber-500 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed outline-hidden transition-all shadow-2xs min-h-[140px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PAUTA 3: PREVISÃO & ANTECIPAÇÃO PARA OS PRÓXIMOS 7 DIAS */}
          {/* ========================================================================= */}
          {(activePauta === 'all' || activePauta === 'forecast') && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print-full-card">
              <div className="bg-gradient-to-r from-emerald-50 to-slate-50 border-b border-slate-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                      Pauta 3: Previsão & Antecipação das Necessidades da Operação (Próximos 7 Dias)
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">
                      Planejamento proativo, alinhamento de insumos, manutenções programadas e garantia do cumprimento da meta.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase text-slate-600">Meta Projetada (T):</span>
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1">
                    <input
                      type="number"
                      value={formState.forecastNext7DaysTons}
                      onChange={(e) => handleFieldChange('forecastNext7DaysTons', Number(e.target.value))}
                      className="w-16 text-xs font-bold text-slate-900 text-center outline-hidden"
                      title="Previsão em Toneladas para os próximos 7 dias"
                    />
                    <span className="text-xs font-bold text-slate-400">T</span>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* 1. Demandas de Matéria-Prima & Insumos */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Box className="w-4 h-4 text-blue-600" />
                      1. Demandas de Matéria-Prima & Insumos Críticos:
                    </label>
                    <textarea
                      value={formState.rawMaterialsDemand}
                      onChange={(e) => handleFieldChange('rawMaterialsDemand', e.target.value)}
                      placeholder="Ex: Necessidade de recebimento de 40T de Resina Buteno até quarta-feira; Tubetes de 3 polegadas com estoque baixo (solicitada entrega emergencial de 2000 un); Estoque de caixas para filme stretch suficiente para 10 dias..."
                      className="w-full bg-white border border-slate-300 focus:border-blue-500 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed outline-hidden transition-all shadow-2xs min-h-[95px]"
                    />
                  </div>

                  {/* 2. Manutenções Preventivas & Programadas */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-amber-600" />
                      2. Manutenções Preventivas & Intervenções Programadas:
                    </label>
                    <textarea
                      value={formState.scheduledMaintenance}
                      onChange={(e) => handleFieldChange('scheduledMaintenance', e.target.value)}
                      placeholder="Ex: Parada programada de 4h na Cast 2 na quinta-feira às 08h para troca de filtros e limpeza de rolos de resfriamento; Revisão elétrica do painel do Erema programada para sábado..."
                      className="w-full bg-white border border-slate-300 focus:border-amber-500 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed outline-hidden transition-all shadow-2xs min-h-[95px]"
                    />
                  </div>

                  {/* 3. Necessidades Operacionais & Pessoal */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-600" />
                      3. Necessidades Operacionais, Pessoal & Escalas:
                    </label>
                    <textarea
                      value={formState.operationalAnticipations}
                      onChange={(e) => handleFieldChange('operationalAnticipations', e.target.value)}
                      placeholder="Ex: Cobertura de férias de 2 operadores no Turno C; Treinamento DDP agendado para terça-feira sobre redução de perda de borda; Reforço de equipe no setor de embalagem..."
                      className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed outline-hidden transition-all shadow-2xs min-h-[95px]"
                    />
                  </div>

                  {/* 4. Ações Prioritárias da Planta */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Target className="w-4 h-4 text-emerald-600" />
                      4. Ações Prioritárias & Compromissos da Semana:
                    </label>
                    <textarea
                      value={formState.priorityActions}
                      onChange={(e) => handleFieldChange('priorityActions', e.target.value)}
                      placeholder="Ex: 1. Atingir a meta de 300 Toneladas na semana; 2. Reduzir a taxa de sucata global para abaixo de 4,0%; 3. Manter disponibilidade das linhas Cast 1 e Cast 2 acima de 95%..."
                      className="w-full bg-white border border-slate-300 focus:border-emerald-500 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed outline-hidden transition-all shadow-2xs min-h-[95px]"
                    />
                  </div>
                </div>

                <div className="flex justify-end no-print">
                  <button
                    onClick={handleSaveToCloud}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    Salvar Pauta 3
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PAUTA 4: CORTE DE FITA ADESIVA (MÓDULO COMPLEMENTAR) */}
          {/* ========================================================================= */}
          {(activePauta === 'all' || activePauta === 'ribbon') && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print-full-card">
              <div className="bg-gradient-to-r from-purple-50 to-slate-50 border-b border-slate-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black">
                    4
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                      Pauta 4: Resultados do Corte de Fita Adesiva
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">
                      Acompanhamento de metros quadrados cortados, rendimento de jumbos e refugo.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-xl border border-purple-200 font-mono">
                    {formatM2(ribbonStats.producedM2)}
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl border border-emerald-200 font-mono">
                    Rendimento: {ribbonStats.yieldRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Área Produzida</span>
                    <div className="text-xl font-black text-slate-900 font-mono mt-1">{formatM2(ribbonStats.producedM2)}</div>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">{ribbonStats.totalRolls.toLocaleString('pt-BR')} rolos</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Jumbos Consumidos</span>
                    <div className="text-xl font-black text-slate-900 font-mono mt-1">{formatM2(ribbonStats.jumboM2)}</div>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">~{ribbonStats.jumbosEquivalent.toFixed(1)} jumbos equiv.</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Rendimento de Corte</span>
                    <div className="text-xl font-black text-emerald-700 font-mono mt-1">{ribbonStats.yieldRate.toFixed(1)}%</div>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">Aproveitamento jumbo</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider">Sucata em Peso</span>
                    <div className="text-xl font-black text-slate-900 font-mono mt-1">{formatKg(ribbonStats.wasteKg)}</div>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">Não conforme: {formatM2(ribbonStats.rejectedM2)}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-800">
                    Anotações e Pautas da Operação de Fita Adesiva:
                  </label>
                  <textarea
                    value={formState.ribbonNotes}
                    onChange={(e) => handleFieldChange('ribbonNotes', e.target.value)}
                    placeholder="Ex: Ritmo de corte de jumbos de 48mm estabilizado; Ajuste nas navalhas de corte para reduzir aparas laterais; Programação de jumbos transparentes para a próxima semana..."
                    className="w-full bg-white border border-slate-300 focus:border-purple-500 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed outline-hidden transition-all shadow-2xs min-h-[85px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PAUTA 5: DESTAQUES OPERACIONAIS */}
          {/* ========================================================================= */}
          {(activePauta === 'all' || activePauta === 'operators') && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden print-full-card">
              <div className="bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-200 p-4 sm:p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-black">
                    5
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                      Pauta 5: Operadores Destaque do Período
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold">
                      Reconhecimento das melhores performances em volume produzido e controle de perdas.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Extrusão */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-700 mb-3 flex items-center gap-1.5">
                    <Award className="w-4 h-4" /> Top 5 Operadores de Extrusão
                  </h4>
                  <div className="space-y-2">
                    {extStats.topOperators.map((op, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${
                            idx === 0 ? 'bg-amber-400 text-slate-950 font-extrabold' : 'bg-slate-200 text-slate-700'
                          }`}>
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-slate-900">{op.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-700 font-mono">{formatKg(op.netKg)}</span>
                          <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {op.scrapRatio.toFixed(1)}% scrap
                          </span>
                        </div>
                      </div>
                    ))}
                    {extStats.topOperators.length === 0 && (
                      <p className="text-xs text-slate-400 italic">Nenhum operador com apontamento no período.</p>
                    )}
                  </div>
                </div>

                {/* Fita */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-purple-700 mb-3 flex items-center gap-1.5">
                    <Award className="w-4 h-4" /> Top 5 Cortadores de Fita
                  </h4>
                  <div className="space-y-2">
                    {ribbonStats.topCutters.map((op, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${
                            idx === 0 ? 'bg-purple-500 text-white font-extrabold' : 'bg-slate-200 text-slate-700'
                          }`}>
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-slate-900">{op.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-700 font-mono">{formatM2(op.producedM2)}</span>
                          <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {formatKg(op.wasteKg)} lixo
                          </span>
                        </div>
                      </div>
                    ))}
                    {ribbonStats.topCutters.length === 0 && (
                      <p className="text-xs text-slate-400 italic">Nenhum apontamento de corte no período.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* BOTTOM FOOTER BAR (LIGHT THEME) */}
        <div className="bg-white border-t border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Relatório executivo integrado • Dados sincronizados com apontamentos de fábrica</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSaveToCloud}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              Salvar Todas as Pautas
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Imprimir Apresentação
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
