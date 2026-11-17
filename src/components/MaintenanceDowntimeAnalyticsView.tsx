import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Gauge,
  Info,
  Layers,
  Search,
  Wrench,
  X,
} from 'lucide-react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ProductionEntry, RibbonCuttingEntry, Shift } from '../types';
import { downloadOeeAnalyticsPDF } from '../utils/exportOeeReportPDF';

export type PlantMachineId = 'Cast 1' | 'Cast 2' | 'Erema' | 'Ghezzi' | 'Lintech' | 'Wultec';
export type PlantSectorId = 'Todos' | 'Extrusão' | 'Reciclagem' | 'Corte de Fita';

interface MachineSpec {
  id: PlantMachineId;
  sector: Exclude<PlantSectorId, 'Todos'>;
  defaultShiftMinutes: number;
  hoursPerDay: number;
  nominalCapPerHour: number;
  unit: 'kg' | 'm²';
  accentColor: string;
}

const MACHINE_SPECS: MachineSpec[] = [
  {
    id: 'Cast 1',
    sector: 'Extrusão',
    defaultShiftMinutes: 720,
    hoursPerDay: 24,
    nominalCapPerHour: 1200,
    unit: 'kg',
    accentColor: '#2563eb',
  },
  {
    id: 'Cast 2',
    sector: 'Extrusão',
    defaultShiftMinutes: 720,
    hoursPerDay: 24,
    nominalCapPerHour: 1400,
    unit: 'kg',
    accentColor: '#0284c7',
  },
  {
    id: 'Erema',
    sector: 'Reciclagem',
    defaultShiftMinutes: 720,
    hoursPerDay: 24,
    nominalCapPerHour: 350,
    unit: 'kg',
    accentColor: '#059669',
  },
  {
    id: 'Ghezzi',
    sector: 'Corte de Fita',
    defaultShiftMinutes: 528,
    hoursPerDay: 8.8,
    nominalCapPerHour: 6818,
    unit: 'm²',
    accentColor: '#4f46e5',
  },
  {
    id: 'Lintech',
    sector: 'Corte de Fita',
    defaultShiftMinutes: 528,
    hoursPerDay: 8.8,
    nominalCapPerHour: 6818,
    unit: 'm²',
    accentColor: '#0d9488',
  },
  {
    id: 'Wultec',
    sector: 'Corte de Fita',
    defaultShiftMinutes: 528,
    hoursPerDay: 8.8,
    nominalCapPerHour: 6818,
    unit: 'm²',
    accentColor: '#7c3aed',
  },
];

interface StopOccurrence {
  id: string;
  date: string;
  machine: PlantMachineId;
  sector: Exclude<PlantSectorId, 'Todos'>;
  shift: string;
  operator: string;
  category: 'Manutenção' | 'Processo' | 'Outros';
  reason: string;
  minutes: number;
  de?: string;
  ate?: string;
}

interface MaintenanceReasonGroup {
  reason: string;
  count: number;
  totalMinutes: number;
  avgMinutes: number;
  pctOfMaintTime: number;
  cumPct: number;
  topMachine: string;
  machinesMap: Record<string, number>;
  occurrences: StopOccurrence[];
}

interface MachineDowntimeMetrics {
  machine: PlantMachineId;
  sector: Exclude<PlantSectorId, 'Todos'>;
  unit: 'kg' | 'm²';
  hasData: boolean;
  entriesCount: number;
  plannedMinutes: number;
  plannedHours: number;
  operatingMinutes: number;
  operatingHours: number;
  manutMin: number;
  procMin: number;
  outrosMin: number;
  totalStoppedMin: number;
  totalStoppedHours: number;
  availabilityPct: number;
  maintAvailabilityPct: number;
  performancePct: number;
  qualityPct: number;
  oeePct: number;
  mtbfHours: number;
  mttrMinutes: number;
  maintEventsCount: number;
  actualProduction: number;
  losses: number;
}

interface MaintenanceDowntimeAnalyticsViewProps {
  productionData: ProductionEntry[];
  ribbonEntries: RibbonCuttingEntry[];
  availableShifts?: Shift[];
  dashboardMonth?: string;
  systemLogo?: string;
  systemName?: string;
  loggedUserName?: string;
  loggedUserRole?: string;
}

const normalizeProductionMachine = (raw: string | undefined): PlantMachineId | null => {
  const m = (raw || '').trim().toLowerCase();
  if (!m) return null;
  if (m.includes('cast 1') || m.includes('cast1') || m.includes('extrusora 1') || m.includes('extrusora1')) return 'Cast 1';
  if (m.includes('cast 2') || m.includes('cast2') || m.includes('extrusora 2') || m.includes('extrusora2')) return 'Cast 2';
  if (m.includes('erema')) return 'Erema';
  return null;
};

const normalizeRibbonMachine = (raw: string | undefined): PlantMachineId | null => {
  const m = (raw || '').trim().toLowerCase();
  if (!m) return null;
  if (m.includes('ghezzi') || m.includes('gehl') || m.includes('ghezze') || m.includes('giese') || m.includes('geze')) return 'Ghezzi';
  if (m.includes('lintech') || m.includes('lintec')) return 'Lintech';
  if (m.includes('wultec') || m.includes('ultech') || m.includes('ultec') || m.includes('wutec') || m.includes('utec') || m.includes('uteck') || m.includes('otec') || m.includes('oltech')) return 'Wultec';
  return null;
};

const cleanJustification = (text: string | undefined): string => {
  if (!text) return '';
  return text.replace(/^\[[^\]]+\]\s*:?\s*/, '').trim();
};

const parseStopsJSON = (
  raw: string | undefined
): Array<{ de: string; ate: string; motivo: string; durationMinutes?: number }> => {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item: any) => {
          const de = String(item?.de || '').trim();
          const ate = String(item?.ate || '').trim();
          const explicacao = cleanJustification(
            item?.explicacao ||
              item?.justification ||
              item?.justificativa ||
              item?.observacao ||
              item?.observacoes ||
              item?.descricao
          );
          const motivo = cleanJustification(item?.motivo || item?.keyword || item?.quickReason);
          const desc = explicacao && motivo && explicacao.toLowerCase() !== motivo.toLowerCase()
            ? `${motivo} — ${explicacao}`
            : (motivo || explicacao || '');
          return {
            de,
            ate,
            motivo: desc,
            durationMinutes: Number(item?.durationMinutes || item?.minutos || item?.minutes || 0),
          };
        })
        .filter((item) => item.de || item.ate || item.motivo || (item.durationMinutes && item.durationMinutes > 0));
    }
  } catch {
    const clean = cleanJustification(trimmed);
    return [{ de: '', ate: '', motivo: clean || trimmed }];
  }
  return [];
};

const getDiffMin = (de: string, ate: string): number => {
  if (!de || !ate) return 0;
  const [h1, m1] = de.split(':').map(Number);
  const [h2, m2] = ate.split(':').map(Number);
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
  let diff = h2 * 60 + m2 - (h1 * 60 + m1);
  if (diff < 0) diff += 1440;
  return diff;
};

const formatMinutesShort = (mins: number): string => {
  const rounded = Math.max(0, Math.round(mins));
  if (rounded >= 60) {
    const h = Math.floor(rounded / 60);
    const m = rounded % 60;
    return m > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${h}h`;
  }
  return `${rounded} min`;
};

const formatHoursDecimal = (mins: number): string => {
  return (Math.max(0, mins) / 60).toFixed(1).replace('.', ',') + 'h';
};

const formatMonthLabel = (ym: string): string => {
  if (!ym || !ym.includes('-')) return ym;
  const [y, m] = ym.split('-');
  const names = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  const idx = parseInt(m, 10) - 1;
  return `${names[idx] || m}/${y}`;
};

const inferStopCategoryFromReason = (reason: string): 'Manutenção' | 'Processo' | 'Outros' => {
  const r = reason.toLowerCase();
  if (
    r.includes('manut') ||
    r.includes('mecan') ||
    r.includes('mecân') ||
    r.includes('eletr') ||
    r.includes('elétr') ||
    r.includes('quebra') ||
    r.includes('sensor') ||
    r.includes('correia') ||
    r.includes('motor') ||
    r.includes('faca') ||
    r.includes('rolamento') ||
    r.includes('biela') ||
    r.includes('eixo') ||
    r.includes('pneumat') ||
    r.includes('hidraul') ||
    r.includes('resist') ||
    r.includes('bomba') ||
    r.includes('inversor') ||
    r.includes('fusivel') ||
    r.includes('fusível') ||
    r.includes('cilindro')
  ) {
    return 'Manutenção';
  }
  if (
    r.includes('setup') ||
    r.includes('troca') ||
    r.includes('jumbo') ||
    r.includes('processo') ||
    r.includes('regulagem') ||
    r.includes('limpeza') ||
    r.includes('ajuste') ||
    r.includes('tubete') ||
    r.includes('material') ||
    r.includes('tela')
  ) {
    return 'Processo';
  }
  return 'Outros';
};

interface CardInfoBadgeProps {
  id: string;
  title: string;
  description: string;
  formula?: string;
  openInfoId: string | null;
  hoverInfoId: string | null;
  onToggleClick: (id: string) => void;
  onHoverChange: (id: string | null) => void;
  onClose: () => void;
  align?: 'left' | 'right' | 'center';
  position?: 'bottom' | 'top';
  compact?: boolean;
}

const CardInfoBadge: React.FC<CardInfoBadgeProps> = ({
  id,
  title,
  description,
  formula,
  openInfoId,
  hoverInfoId,
  onToggleClick,
  onHoverChange,
  onClose,
  align = 'right',
  position = 'bottom',
  compact = false,
}) => {
  const isVisible = openInfoId === id || hoverInfoId === id;
  const alignClass =
    align === 'left'
      ? 'left-0'
      : align === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : 'right-0';
  const posClass = position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';

  return (
    <div
      data-card-info-root
      className="relative inline-flex items-center shrink-0"
      onMouseEnter={() => onHoverChange(id)}
      onMouseLeave={() => onHoverChange(null)}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label={`Explicação: ${title}`}
        aria-expanded={isVisible}
        onClick={(e) => {
          e.stopPropagation();
          onToggleClick(id);
        }}
        className={`inline-flex items-center justify-center rounded-full transition-colors cursor-pointer ${
          compact ? 'w-5 h-5' : 'w-6 h-6'
        } ${
          isVisible
            ? 'bg-slate-900 text-white'
            : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
        }`}
      >
        <Info size={compact ? 12 : 13} />
      </button>

      {isVisible && (
        <div
          role="tooltip"
          className={`absolute ${posClass} ${alignClass} z-40 w-64 sm:w-72 rounded-xl bg-slate-900 text-white p-3.5 shadow-xl border border-slate-700/80 text-left animate-in fade-in duration-150`}
        >
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Info size={13} className="text-sky-400 shrink-0" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-white leading-tight">
                {title}
              </span>
            </div>
            <button
              type="button"
              aria-label="Fechar informação"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer shrink-0"
            >
              <X size={12} />
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-200 font-normal">
            {description}
          </p>
          {formula && (
            <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-slate-800/90 border border-slate-700 text-[10px] font-semibold text-sky-300 leading-snug">
              {formula}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const MaintenanceDowntimeAnalyticsView: React.FC<MaintenanceDowntimeAnalyticsViewProps> = ({
  productionData = [],
  ribbonEntries = [],
  availableShifts = [],
  dashboardMonth,
  systemLogo,
  systemName,
  loggedUserName,
  loggedUserRole,
}) => {
  // Available months sorted descending
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    productionData.forEach((e) => {
      if (e?.date && e.date.length >= 7) {
        const y = parseInt(e.date.substring(0, 4), 10);
        if (!isNaN(y) && y >= 2026) set.add(e.date.substring(0, 7));
      }
    });
    ribbonEntries.forEach((e) => {
      if (e?.date && e.date.length >= 7) {
        const y = parseInt(e.date.substring(0, 4), 10);
        if (!isNaN(y) && y >= 2026) set.add(e.date.substring(0, 7));
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [productionData, ribbonEntries]);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (dashboardMonth && availableMonths.includes(dashboardMonth)) return dashboardMonth;
    return availableMonths[0] || dashboardMonth || new Date().toISOString().slice(0, 7);
  });
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedSector, setSelectedSector] = useState<PlantSectorId>('Todos');
  const [selectedMachine, setSelectedMachine] = useState<'Todas' | PlantMachineId>('Todas');
  const [selectedShift, setSelectedShift] = useState<string>('Todos');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Chart toggles
  const [extrusionChartMode, setExtrusionChartMode] = useState<'pct' | 'min'>('pct');
  const [extrusionGroupBy, setExtrusionGroupBy] = useState<'machine' | 'date'>('machine');
  const [ribbonChartMode, setRibbonChartMode] = useState<'pct' | 'min'>('pct');
  const [ribbonGroupBy, setRibbonGroupBy] = useState<'machine' | 'date'>('machine');
  const [drilldownReason, setDrilldownReason] = useState<MaintenanceReasonGroup | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [openInfoId, setOpenInfoId] = useState<string | null>(null);
  const [hoverInfoId, setHoverInfoId] = useState<string | null>(null);

  useEffect(() => {
    if (!openInfoId) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[data-card-info-root]')) return;
      setOpenInfoId(null);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenInfoId(null);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [openInfoId]);

  const handleToggleInfo = (id: string) => {
    setOpenInfoId((prev) => (prev === id ? null : id));
  };

  const handleCloseInfo = () => {
    setOpenInfoId(null);
    setHoverInfoId(null);
  };

  // Valid production entries (same sanity guard as BiAnalyticsView)
  const validProductionData = useMemo(() => {
    return (productionData || []).filter((e) => {
      if (!e || !e.date) return false;
      const year = parseInt(e.date.split('-')[0], 10);
      if (isNaN(year) || year < 2026) return false;
      const isExcludedMonth = e.date.substring(5, 7) === '05' || e.date.substring(5, 7) === '06';
      const isExistingPastEntry = !e.updatedAt || e.updatedAt < '2026-06-12T17:44:00Z';
      if (isExcludedMonth && (e.machine || '').toLowerCase().includes('cast 2') && isExistingPastEntry) {
        return false;
      }
      return normalizeProductionMachine(e.machine) !== null;
    });
  }, [productionData]);

  const validRibbonData = useMemo(() => {
    return (ribbonEntries || []).filter((e) => {
      if (!e || !e.date) return false;
      const year = parseInt(e.date.split('-')[0], 10);
      if (isNaN(year) || year < 2026) return false;
      return normalizeRibbonMachine(e.machine) !== null;
    });
  }, [ribbonEntries]);

  const allShifts = useMemo(() => {
    const s = new Set<string>();
    validProductionData.forEach((e) => e.shift && s.add(e.shift));
    validRibbonData.forEach((e) => e.shift && s.add(e.shift));
    return Array.from(s).sort();
  }, [validProductionData, validRibbonData]);

  // Apply date / sector / machine / shift / search filters
  const { filteredProd, filteredRibbon } = useMemo(() => {
    const hasCustomRange = startDate !== '' || endDate !== '';
    const matchDate = (date: string) => {
      if (hasCustomRange) {
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
        return true;
      }
      if (selectedMonth === 'Todos') return true;
      return date.startsWith(selectedMonth);
    };

    const matchMachineAndSector = (machineId: PlantMachineId, sector: Exclude<PlantSectorId, 'Todos'>) => {
      if (selectedSector !== 'Todos' && sector !== selectedSector) return false;
      if (selectedMachine !== 'Todas' && machineId !== selectedMachine) return false;
      return true;
    };

    const matchSearchProd = (e: ProductionEntry) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        (e.manutencaoMotivo || '').toLowerCase().includes(q) ||
        (e.processoMotivo || '').toLowerCase().includes(q) ||
        (e.outrosMotivo || '').toLowerCase().includes(q) ||
        (e.operator || '').toLowerCase().includes(q) ||
        (e.machine || '').toLowerCase().includes(q)
      );
    };

    const matchSearchRibbon = (e: RibbonCuttingEntry) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        (e.manutencaoMotivo || '').toLowerCase().includes(q) ||
        (e.processoMotivo || '').toLowerCase().includes(q) ||
        (e.outrosMotivo || '').toLowerCase().includes(q) ||
        (e.stoppedReason || '').toLowerCase().includes(q) ||
        (e.operator || '').toLowerCase().includes(q) ||
        (e.machine || '').toLowerCase().includes(q)
      );
    };

    const fp = validProductionData.filter((e) => {
      const mId = normalizeProductionMachine(e.machine);
      if (!mId) return false;
      const spec = MACHINE_SPECS.find((s) => s.id === mId)!;
      if (!matchDate(e.date)) return false;
      if (!matchMachineAndSector(mId, spec.sector)) return false;
      if (selectedShift !== 'Todos' && (e.shift || '') !== selectedShift) return false;
      if (!matchSearchProd(e)) return false;
      return true;
    });

    const fr = validRibbonData.filter((e) => {
      const mId = normalizeRibbonMachine(e.machine);
      if (!mId) return false;
      const spec = MACHINE_SPECS.find((s) => s.id === mId)!;
      if (!matchDate(e.date)) return false;
      if (!matchMachineAndSector(mId, spec.sector)) return false;
      if (selectedShift !== 'Todos' && (e.shift || '') !== selectedShift) return false;
      if (!matchSearchRibbon(e)) return false;
      return true;
    });

    return { filteredProd: fp, filteredRibbon: fr };
  }, [
    validProductionData,
    validRibbonData,
    selectedMonth,
    startDate,
    endDate,
    selectedSector,
    selectedMachine,
    selectedShift,
    searchTerm,
  ]);

  // Helper to get shift planned duration
  const getShiftPlannedMinutes = (shiftName: string | undefined, sector: Exclude<PlantSectorId, 'Todos'>): number => {
    if (shiftName && availableShifts.length > 0) {
      const found = availableShifts.find((s) => s.name === shiftName);
      if (found) {
        const [h1, m1] = found.startTime.split(':').map(Number);
        const [h2, m2] = found.endTime.split(':').map(Number);
        if (!isNaN(h1) && !isNaN(m1) && !isNaN(h2) && !isNaN(m2)) {
          let mins = h2 * 60 + m2 - (h1 * 60 + m1);
          if (mins < 0) mins += 1440;
          if (mins === 0) mins = 1440;
          return mins;
        }
      }
    }
    return sector === 'Corte de Fita' ? 528 : 720;
  };

  // Extract individual StopOccurrences across Extrusão + Reciclagem + Corte de Fita
  const occurrences = useMemo(() => {
    const list: StopOccurrence[] = [];

    filteredProd.forEach((e) => {
      const mId = normalizeProductionMachine(e.machine);
      if (!mId) return;
      const spec = MACHINE_SPECS.find((s) => s.id === mId)!;
      const shift = e.shift || 'Sem Turno';
      const operator = e.operator || 'Sem Operador';

      if (e.isNoWorkDay) {
        const dur = getShiftPlannedMinutes(shift, spec.sector);
        list.push({
          id: `prod-${e.id}-nowork`,
          date: e.date,
          machine: mId,
          sector: spec.sector,
          shift,
          operator,
          category: 'Outros',
          reason: e.noWorkReason || 'Dia sem operação programada / Parada total',
          minutes: dur,
        });
        return;
      }

      // Manutenção
      const mList = parseStopsJSON(e.manutencaoMotivo);
      if (mList.length > 0) {
        const fallbackPerItem = Number(e.manutencaoMin || 0) / mList.length;
        mList.forEach((item, idx) => {
          const calc = item.durationMinutes && item.durationMinutes > 0 ? item.durationMinutes : getDiffMin(item.de, item.ate);
          const mins = Math.round(calc > 0 ? calc : fallbackPerItem);
          if (mins > 0 || item.motivo) {
            list.push({
              id: `prod-${e.id}-manut-${idx}`,
              date: e.date,
              machine: mId,
              sector: spec.sector,
              shift,
              operator,
              category: 'Manutenção',
              reason: item.motivo || 'Manutenção Corretiva / Ajustes',
              minutes: mins,
              de: item.de,
              ate: item.ate,
            });
          }
        });
      } else if (Number(e.manutencaoMin || 0) > 0) {
        list.push({
          id: `prod-${e.id}-manut-single`,
          date: e.date,
          machine: mId,
          sector: spec.sector,
          shift,
          operator,
          category: 'Manutenção',
          reason: cleanJustification(e.manutencaoMotivo) || 'Manutenção Corretiva / Ajustes',
          minutes: Math.round(Number(e.manutencaoMin)),
        });
      }

      // Processo
      const pList = parseStopsJSON(e.processoMotivo);
      if (pList.length > 0) {
        const fallbackPerItem = Number(e.processoMin || 0) / pList.length;
        pList.forEach((item, idx) => {
          const calc = item.durationMinutes && item.durationMinutes > 0 ? item.durationMinutes : getDiffMin(item.de, item.ate);
          const mins = Math.round(calc > 0 ? calc : fallbackPerItem);
          if (mins > 0 || item.motivo) {
            list.push({
              id: `prod-${e.id}-proc-${idx}`,
              date: e.date,
              machine: mId,
              sector: spec.sector,
              shift,
              operator,
              category: 'Processo',
              reason: item.motivo || 'Setup / Regulagem de Processo',
              minutes: mins,
              de: item.de,
              ate: item.ate,
            });
          }
        });
      } else if (Number(e.processoMin || 0) > 0) {
        list.push({
          id: `prod-${e.id}-proc-single`,
          date: e.date,
          machine: mId,
          sector: spec.sector,
          shift,
          operator,
          category: 'Processo',
          reason: cleanJustification(e.processoMotivo) || 'Setup / Regulagem de Processo',
          minutes: Math.round(Number(e.processoMin)),
        });
      }

      // Outros
      const oList = parseStopsJSON(e.outrosMotivo);
      if (oList.length > 0) {
        const fallbackPerItem = Number(e.outrosMin || 0) / oList.length;
        oList.forEach((item, idx) => {
          const calc = item.durationMinutes && item.durationMinutes > 0 ? item.durationMinutes : getDiffMin(item.de, item.ate);
          const mins = Math.round(calc > 0 ? calc : fallbackPerItem);
          if (mins > 0 || item.motivo) {
            list.push({
              id: `prod-${e.id}-outros-${idx}`,
              date: e.date,
              machine: mId,
              sector: spec.sector,
              shift,
              operator,
              category: 'Outros',
              reason: item.motivo || 'Outras Ocorrências Operacionais',
              minutes: mins,
              de: item.de,
              ate: item.ate,
            });
          }
        });
      } else if (Number(e.outrosMin || 0) > 0) {
        list.push({
          id: `prod-${e.id}-outros-single`,
          date: e.date,
          machine: mId,
          sector: spec.sector,
          shift,
          operator,
          category: 'Outros',
          reason: cleanJustification(e.outrosMotivo) || 'Outras Ocorrências Operacionais',
          minutes: Math.round(Number(e.outrosMin)),
        });
      }
    });

    // Corte de Fita entries
    filteredRibbon.forEach((e) => {
      const mId = normalizeRibbonMachine(e.machine);
      if (!mId) return;
      const shift = e.shift || 'Comercial';
      const operator = e.operator || 'Sem Operador';

      const mMin = Number(e.manutencaoMin || 0);
      const pMin = Number(e.processoMin || 0);
      const oMin = Number(e.outrosMin || 0);
      const categorizedSum = mMin + pMin + oMin;

      // Manutenção Fita
      const mList = parseStopsJSON(e.manutencaoMotivo);
      if (mList.length > 0) {
        const fallback = mMin / mList.length;
        mList.forEach((item, idx) => {
          const calc = item.durationMinutes && item.durationMinutes > 0 ? item.durationMinutes : getDiffMin(item.de, item.ate);
          const mins = Math.round(calc > 0 ? calc : fallback);
          if (mins > 0 || item.motivo) {
            list.push({
              id: `rib-${e.id}-manut-${idx}`,
              date: e.date,
              machine: mId,
              sector: 'Corte de Fita',
              shift,
              operator,
              category: 'Manutenção',
              reason: item.motivo || 'Manutenção Corretiva (Fita)',
              minutes: mins,
              de: item.de,
              ate: item.ate,
            });
          }
        });
      } else if (mMin > 0) {
        list.push({
          id: `rib-${e.id}-manut-single`,
          date: e.date,
          machine: mId,
          sector: 'Corte de Fita',
          shift,
          operator,
          category: 'Manutenção',
          reason: cleanJustification(e.manutencaoMotivo) || 'Manutenção Corretiva (Fita)',
          minutes: Math.round(mMin),
        });
      }

      // Processo Fita
      const pList = parseStopsJSON(e.processoMotivo);
      if (pList.length > 0) {
        const fallback = pMin / pList.length;
        pList.forEach((item, idx) => {
          const calc = item.durationMinutes && item.durationMinutes > 0 ? item.durationMinutes : getDiffMin(item.de, item.ate);
          const mins = Math.round(calc > 0 ? calc : fallback);
          if (mins > 0 || item.motivo) {
            list.push({
              id: `rib-${e.id}-proc-${idx}`,
              date: e.date,
              machine: mId,
              sector: 'Corte de Fita',
              shift,
              operator,
              category: 'Processo',
              reason: item.motivo || 'Setup / Troca de Formato (Fita)',
              minutes: mins,
              de: item.de,
              ate: item.ate,
            });
          }
        });
      } else if (pMin > 0) {
        list.push({
          id: `rib-${e.id}-proc-single`,
          date: e.date,
          machine: mId,
          sector: 'Corte de Fita',
          shift,
          operator,
          category: 'Processo',
          reason: cleanJustification(e.processoMotivo) || 'Setup / Troca de Formato (Fita)',
          minutes: Math.round(pMin),
        });
      }

      // Outros Fita
      const oList = parseStopsJSON(e.outrosMotivo);
      if (oList.length > 0) {
        const fallback = oMin / oList.length;
        oList.forEach((item, idx) => {
          const calc = item.durationMinutes && item.durationMinutes > 0 ? item.durationMinutes : getDiffMin(item.de, item.ate);
          const mins = Math.round(calc > 0 ? calc : fallback);
          if (mins > 0 || item.motivo) {
            list.push({
              id: `rib-${e.id}-outros-${idx}`,
              date: e.date,
              machine: mId,
              sector: 'Corte de Fita',
              shift,
              operator,
              category: 'Outros',
              reason: item.motivo || 'Outras Paradas (Fita)',
              minutes: mins,
              de: item.de,
              ate: item.ate,
            });
          }
        });
      } else if (oMin > 0) {
        list.push({
          id: `rib-${e.id}-outros-single`,
          date: e.date,
          machine: mId,
          sector: 'Corte de Fita',
          shift,
          operator,
          category: 'Outros',
          reason: cleanJustification(e.outrosMotivo) || 'Outras Paradas (Fita)',
          minutes: Math.round(oMin),
        });
      }

      // Legacy ribbon stoppedMinutes/stoppedReason fallback when uncategorized
      const totalRibbonStopped = Number(e.stoppedMinutes || 0);
      const uncategorized = Math.max(0, totalRibbonStopped - categorizedSum);
      if (uncategorized > 0 || (categorizedSum === 0 && e.stoppedReason && e.stoppedReason.trim())) {
        const reasonText = cleanJustification(e.stoppedReason) || 'Parada Registrada (Fita)';
        list.push({
          id: `rib-${e.id}-legacy`,
          date: e.date,
          machine: mId,
          sector: 'Corte de Fita',
          shift,
          operator,
          category: inferStopCategoryFromReason(reasonText),
          reason: reasonText,
          minutes: Math.round(uncategorized > 0 ? uncategorized : totalRibbonStopped),
        });
      }
    });

    return list;
  }, [filteredProd, filteredRibbon, availableShifts]);

  // Machine-level Availability & OEE Metrics across all 6 machines
  const machineMetrics = useMemo<MachineDowntimeMetrics[]>(() => {
    return MACHINE_SPECS.map((spec) => {
      const isRibbon = spec.sector === 'Corte de Fita';
      const shiftSlotMinutes = new Map<string, number>();

      let manutMin = 0;
      let procMin = 0;
      let outrosMin = 0;
      let noWorkMin = 0;
      let actualProduction = 0;
      let losses = 0;
      let entriesCount = 0;

      if (!isRibbon) {
        const entries = filteredProd.filter((e) => normalizeProductionMachine(e.machine) === spec.id);
        entriesCount = entries.length;
        entries.forEach((e) => {
          const slotKey = `${e.date}__${(e.shift || 'Turno').trim().toLowerCase()}`;
          const slotDur = getShiftPlannedMinutes(e.shift, spec.sector);
          if (!shiftSlotMinutes.has(slotKey)) {
            shiftSlotMinutes.set(slotKey, slotDur);
          }
          if (e.isNoWorkDay) {
            noWorkMin += slotDur;
          } else {
            manutMin += Number(e.manutencaoMin || 0);
            procMin += Number(e.processoMin || 0);
            outrosMin += Number(e.outrosMin || 0);
          }
          actualProduction += Number(e.netWeight || 0);
          losses += Number(e.ecoBP || 0) + Number(e.ecoBM || 0) + Number(e.borraTotal || 0);
        });
      } else {
        const entries = filteredRibbon.filter((e) => normalizeRibbonMachine(e.machine) === spec.id);
        entriesCount = entries.length;
        entries.forEach((e) => {
          const slotKey = `${e.date}__${(e.shift || 'Comercial').trim().toLowerCase()}`;
          const slotDur = getShiftPlannedMinutes(e.shift, 'Corte de Fita');
          if (!shiftSlotMinutes.has(slotKey)) {
            shiftSlotMinutes.set(slotKey, slotDur);
          }
          const mMin = Number(e.manutencaoMin || 0);
          const pMin = Number(e.processoMin || 0);
          const oMin = Number(e.outrosMin || 0);
          const catSum = mMin + pMin + oMin;
          const legacyExtra = Math.max(0, Number(e.stoppedMinutes || 0) - catSum);

          manutMin += mMin;
          procMin += pMin;
          outrosMin += oMin;
          if (legacyExtra > 0) {
            const inf = inferStopCategoryFromReason(e.stoppedReason || '');
            if (inf === 'Manutenção') manutMin += legacyExtra;
            else if (inf === 'Processo') procMin += legacyExtra;
            else outrosMin += legacyExtra;
          }

          actualProduction += Number(e.producedM2 || 0);
          losses += Number(e.rejectedM2 || 0);
        });
      }

      const maintOccurrences = occurrences.filter(
        (o) => o.machine === spec.id && o.category === 'Manutenção' && o.minutes > 0
      );
      const maintEventsCount = maintOccurrences.length;

      let plannedMinutes = 0;
      shiftSlotMinutes.forEach((v) => {
        plannedMinutes += v;
      });
      const totalStoppedMin = Math.round(manutMin + procMin + outrosMin + noWorkMin);
      const operatingMinutes = Math.max(0, plannedMinutes - totalStoppedMin);
      const plannedHours = Number((plannedMinutes / 60).toFixed(1));
      const operatingHours = Number((operatingMinutes / 60).toFixed(1));
      const totalStoppedHours = Number((totalStoppedMin / 60).toFixed(1));

      const hasData = entriesCount > 0 && plannedMinutes > 0;
      const availabilityPct = hasData
        ? Number(Math.max(0, Math.min(100, (operatingMinutes / plannedMinutes) * 100)).toFixed(1))
        : 0;
      const maintAvailabilityPct = hasData
        ? Number(Math.max(0, Math.min(100, ((plannedMinutes - manutMin) / plannedMinutes) * 100)).toFixed(1))
        : 0;

      const theoreticalCap = operatingHours * spec.nominalCapPerHour;
      const performancePct =
        hasData && theoreticalCap > 0
          ? Number(Math.max(0, Math.min(100, (actualProduction / theoreticalCap) * 100)).toFixed(1))
          : 0;

      const totalOutput = actualProduction + losses;
      const qualityPct =
        hasData && totalOutput > 0
          ? Number(Math.max(0, Math.min(100, (actualProduction / totalOutput) * 100)).toFixed(1))
          : hasData
          ? 100
          : 0;

      const oeePct = hasData
        ? Number(((availabilityPct / 100) * (performancePct / 100) * (qualityPct / 100) * 100).toFixed(1))
        : 0;

      const mttrMinutes = maintEventsCount > 0 ? Math.round(manutMin / maintEventsCount) : 0;
      const mtbfHours =
        maintEventsCount > 0 ? Number((operatingHours / maintEventsCount).toFixed(1)) : operatingHours;

      return {
        machine: spec.id,
        sector: spec.sector,
        unit: spec.unit,
        hasData,
        entriesCount,
        plannedMinutes,
        plannedHours,
        operatingMinutes,
        operatingHours,
        manutMin: Math.round(manutMin),
        procMin: Math.round(procMin),
        outrosMin: Math.round(outrosMin + noWorkMin),
        totalStoppedMin,
        totalStoppedHours,
        availabilityPct,
        maintAvailabilityPct,
        performancePct,
        qualityPct,
        oeePct,
        mtbfHours,
        mttrMinutes,
        maintEventsCount,
        actualProduction,
        losses,
      };
    });
  }, [filteredProd, filteredRibbon, occurrences, availableShifts]);

  // Visible machine cards (respecting sector/machine filter)
  const visibleMachineMetrics = useMemo(() => {
    return machineMetrics.filter((m) => {
      if (selectedSector !== 'Todos' && m.sector !== selectedSector) return false;
      if (selectedMachine !== 'Todas' && m.machine !== selectedMachine) return false;
      return true;
    });
  }, [machineMetrics, selectedSector, selectedMachine]);

  // Plant Consolidated Summary KPIs
  const plantSummary = useMemo(() => {
    const active = visibleMachineMetrics.filter((m) => m.hasData);
    const totalPlannedMin = active.reduce((acc, m) => acc + m.plannedMinutes, 0);
    const totalOperatingMin = active.reduce((acc, m) => acc + m.operatingMinutes, 0);
    const totalManutMin = active.reduce((acc, m) => acc + m.manutMin, 0);
    const totalProcMin = active.reduce((acc, m) => acc + m.procMin, 0);
    const totalOutrosMin = active.reduce((acc, m) => acc + m.outrosMin, 0);
    const totalStoppedMin = active.reduce((acc, m) => acc + m.totalStoppedMin, 0);
    const totalMaintEvents = active.reduce((acc, m) => acc + m.maintEventsCount, 0);

    const availabilityPct =
      totalPlannedMin > 0 ? Number(Math.max(0, Math.min(100, (totalOperatingMin / totalPlannedMin) * 100)).toFixed(1)) : 0;
    const maintAvailabilityPct =
      totalPlannedMin > 0
        ? Number(Math.max(0, Math.min(100, ((totalPlannedMin - totalManutMin) / totalPlannedMin) * 100)).toFixed(1))
        : 0;

    let sumWeightedPerf = 0;
    let sumWeightedQual = 0;
    active.forEach((m) => {
      sumWeightedPerf += m.performancePct * m.plannedMinutes;
      sumWeightedQual += m.qualityPct * m.plannedMinutes;
    });
    const weightedPerf = totalPlannedMin > 0 ? sumWeightedPerf / totalPlannedMin : 0;
    const weightedQual = totalPlannedMin > 0 ? sumWeightedQual / totalPlannedMin : 0;
    const weightedOee =
      totalPlannedMin > 0
        ? Number(((availabilityPct / 100) * (weightedPerf / 100) * (weightedQual / 100) * 100).toFixed(1))
        : 0;

    const totalOperatingHours = totalOperatingMin / 60;
    const mttrMinutes = totalMaintEvents > 0 ? Math.round(totalManutMin / totalMaintEvents) : 0;
    const mtbfHours =
      totalMaintEvents > 0
        ? Number((totalOperatingHours / totalMaintEvents).toFixed(1))
        : Number(totalOperatingHours.toFixed(1));

    const maintSharePct =
      totalStoppedMin > 0 ? Number(((totalManutMin / totalStoppedMin) * 100).toFixed(1)) : 0;

    return {
      hasData: active.length > 0,
      activeMachinesCount: active.length,
      totalPlannedMin,
      totalOperatingMin,
      totalManutMin,
      totalProcMin,
      totalOutrosMin,
      totalStoppedMin,
      totalMaintEvents,
      availabilityPct,
      maintAvailabilityPct,
      weightedPerf: Number(weightedPerf.toFixed(1)),
      weightedQual: Number(weightedQual.toFixed(1)),
      weightedOee,
      mttrMinutes,
      mtbfHours,
      maintSharePct,
    };
  }, [visibleMachineMetrics]);

  // Chart 1: Availability & OEE Comparison across all 6 machines
  const availabilityComparisonChartData = useMemo(() => {
    return visibleMachineMetrics.map((m) => ({
      name: m.machine,
      sector: m.sector,
      availabilityPct: m.hasData ? m.availabilityPct : 0,
      maintAvailabilityPct: m.hasData ? m.maintAvailabilityPct : 0,
      oeePct: m.hasData ? m.oeePct : 0,
      manutMin: m.manutMin,
      procMin: m.procMin,
      outrosMin: m.outrosMin,
      hasData: m.hasData,
    }));
  }, [visibleMachineMetrics]);

  // Chart 2: General Extrusão Downtime (Cast 1, Cast 2, Erema) — proportional % or minutes, by machine or day
  const extrusionStopsChartData = useMemo(() => {
    const extMachines: PlantMachineId[] = ['Cast 1', 'Cast 2', 'Erema'];
    if (extrusionGroupBy === 'machine') {
      return extMachines
        .map((mName) => {
          const stat = machineMetrics.find((m) => m.machine === mName);
          const manut = stat?.manutMin || 0;
          const proc = stat?.procMin || 0;
          const outros = stat?.outrosMin || 0;
          const total = manut + proc + outros;
          return {
            name: mName,
            manutPct: total > 0 ? Number(((manut / total) * 100).toFixed(1)) : 0,
            procPct: total > 0 ? Number(((proc / total) * 100).toFixed(1)) : 0,
            outrosPct: total > 0 ? Number(((outros / total) * 100).toFixed(1)) : 0,
            manutMin: manut,
            procMin: proc,
            outrosMin: outros,
            totalMin: total,
          };
        })
        .filter((d) => d.totalMin > 0 || selectedMachine === d.name);
    }

    const byDate: Record<string, { date: string; name: string; manutMin: number; procMin: number; outrosMin: number }> = {};
    filteredProd.forEach((e) => {
      if (!e.date) return;
      if (!byDate[e.date]) {
        const parts = e.date.split('-');
        byDate[e.date] = {
          date: e.date,
          name: parts.length === 3 ? `${parts[2]}/${parts[1]}` : e.date,
          manutMin: 0,
          procMin: 0,
          outrosMin: 0,
        };
      }
      byDate[e.date].manutMin += Math.round(Number(e.manutencaoMin || 0));
      byDate[e.date].procMin += Math.round(Number(e.processoMin || 0));
      byDate[e.date].outrosMin += Math.round(Number(e.outrosMin || 0));
    });

    return Object.values(byDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => {
        const total = d.manutMin + d.procMin + d.outrosMin;
        return {
          ...d,
          manutPct: total > 0 ? Number(((d.manutMin / total) * 100).toFixed(1)) : 0,
          procPct: total > 0 ? Number(((d.procMin / total) * 100).toFixed(1)) : 0,
          outrosPct: total > 0 ? Number(((d.outrosMin / total) * 100).toFixed(1)) : 0,
          totalMin: total,
        };
      })
      .filter((d) => d.totalMin > 0);
  }, [extrusionGroupBy, machineMetrics, filteredProd, selectedMachine]);

  // Chart 3: General Corte de Fita Downtime (Ghezzi, Lintech, Wultec)
  const ribbonStopsChartData = useMemo(() => {
    const ribMachines: PlantMachineId[] = ['Ghezzi', 'Lintech', 'Wultec'];
    if (ribbonGroupBy === 'machine') {
      return ribMachines
        .map((mName) => {
          const stat = machineMetrics.find((m) => m.machine === mName);
          const manut = stat?.manutMin || 0;
          const proc = stat?.procMin || 0;
          const outros = stat?.outrosMin || 0;
          const total = manut + proc + outros;
          return {
            name: mName,
            manutPct: total > 0 ? Number(((manut / total) * 100).toFixed(1)) : 0,
            procPct: total > 0 ? Number(((proc / total) * 100).toFixed(1)) : 0,
            outrosPct: total > 0 ? Number(((outros / total) * 100).toFixed(1)) : 0,
            manutMin: manut,
            procMin: proc,
            outrosMin: outros,
            totalMin: total,
          };
        })
        .filter((d) => d.totalMin > 0 || selectedMachine === d.name);
    }

    const byDate: Record<string, { date: string; name: string; manutMin: number; procMin: number; outrosMin: number }> = {};
    filteredRibbon.forEach((e) => {
      if (!e.date) return;
      if (!byDate[e.date]) {
        const parts = e.date.split('-');
        byDate[e.date] = {
          date: e.date,
          name: parts.length === 3 ? `${parts[2]}/${parts[1]}` : e.date,
          manutMin: 0,
          procMin: 0,
          outrosMin: 0,
        };
      }
      const mMin = Number(e.manutencaoMin || 0);
      const pMin = Number(e.processoMin || 0);
      const oMin = Number(e.outrosMin || 0);
      const catSum = mMin + pMin + oMin;
      const legacyExtra = Math.max(0, Number(e.stoppedMinutes || 0) - catSum);
      byDate[e.date].manutMin += Math.round(mMin);
      byDate[e.date].procMin += Math.round(pMin);
      byDate[e.date].outrosMin += Math.round(oMin);
      if (legacyExtra > 0) {
        const inf = inferStopCategoryFromReason(e.stoppedReason || '');
        if (inf === 'Manutenção') byDate[e.date].manutMin += Math.round(legacyExtra);
        else if (inf === 'Processo') byDate[e.date].procMin += Math.round(legacyExtra);
        else byDate[e.date].outrosMin += Math.round(legacyExtra);
      }
    });

    return Object.values(byDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => {
        const total = d.manutMin + d.procMin + d.outrosMin;
        return {
          ...d,
          manutPct: total > 0 ? Number(((d.manutMin / total) * 100).toFixed(1)) : 0,
          procPct: total > 0 ? Number(((d.procMin / total) * 100).toFixed(1)) : 0,
          outrosPct: total > 0 ? Number(((d.outrosMin / total) * 100).toFixed(1)) : 0,
          totalMin: total,
        };
      })
      .filter((d) => d.totalMin > 0);
  }, [ribbonGroupBy, machineMetrics, filteredRibbon, selectedMachine]);

  // Chart 4: Exclusive Maintenance Daily Trend (Extrusão vs Corte de Fita maintenance minutes)
  const maintenanceDailyTrend = useMemo(() => {
    const map: Record<
      string,
      { date: string; label: string; extrusaoMaintMin: number; fitaMaintMin: number; totalMaintMin: number; totalStopsMin: number }
    > = {};

    occurrences.forEach((occ) => {
      if (!map[occ.date]) {
        const parts = occ.date.split('-');
        map[occ.date] = {
          date: occ.date,
          label: parts.length === 3 ? `${parts[2]}/${parts[1]}` : occ.date,
          extrusaoMaintMin: 0,
          fitaMaintMin: 0,
          totalMaintMin: 0,
          totalStopsMin: 0,
        };
      }
      map[occ.date].totalStopsMin += occ.minutes;
      if (occ.category === 'Manutenção') {
        map[occ.date].totalMaintMin += occ.minutes;
        if (occ.sector === 'Corte de Fita') {
          map[occ.date].fitaMaintMin += occ.minutes;
        } else {
          map[occ.date].extrusaoMaintMin += occ.minutes;
        }
      }
    });

    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [occurrences]);

  // Chart 5 + Table: Exclusive Maintenance Root Causes (Pareto)
  const maintenancePareto = useMemo<MaintenanceReasonGroup[]>(() => {
    const maintOccs = occurrences.filter((o) => o.category === 'Manutenção' && (o.minutes > 0 || o.reason));
    const totalMaintMinutes = maintOccs.reduce((acc, o) => acc + o.minutes, 0);

    const groups: Record<
      string,
      {
        reason: string;
        count: number;
        totalMinutes: number;
        machinesMap: Record<string, number>;
        occurrences: StopOccurrence[];
      }
    > = {};

    maintOccs.forEach((occ) => {
      const normalizedKey = (occ.reason || 'Manutenção Corretiva').trim().toUpperCase();
      if (!groups[normalizedKey]) {
        groups[normalizedKey] = {
          reason: (occ.reason || 'Manutenção Corretiva').trim(),
          count: 0,
          totalMinutes: 0,
          machinesMap: {},
          occurrences: [],
        };
      }
      groups[normalizedKey].count += 1;
      groups[normalizedKey].totalMinutes += occ.minutes;
      groups[normalizedKey].machinesMap[occ.machine] =
        (groups[normalizedKey].machinesMap[occ.machine] || 0) + occ.minutes;
      groups[normalizedKey].occurrences.push(occ);
    });

    const sorted = Object.values(groups).sort((a, b) => b.totalMinutes - a.totalMinutes);
    let runningCum = 0;

    return sorted.map((g) => {
      const pct = totalMaintMinutes > 0 ? (g.totalMinutes / totalMaintMinutes) * 100 : 0;
      runningCum += pct;
      let topMachine = '—';
      let maxM = -1;
      Object.entries(g.machinesMap).forEach(([m, min]) => {
        if (min > maxM) {
          maxM = min;
          topMachine = m;
        }
      });

      return {
        reason: g.reason,
        count: g.count,
        totalMinutes: g.totalMinutes,
        avgMinutes: g.count > 0 ? Math.round(g.totalMinutes / g.count) : 0,
        pctOfMaintTime: Number(pct.toFixed(1)),
        cumPct: Number(Math.min(100, runningCum).toFixed(1)),
        topMachine,
        machinesMap: g.machinesMap,
        occurrences: g.occurrences.sort((a, b) => b.date.localeCompare(a.date)),
      };
    });
  }, [occurrences]);

  const paretoChartRows = useMemo(() => {
    return maintenancePareto.slice(0, 10).map((item) => ({
      shortName: item.reason.length > 24 ? `${item.reason.slice(0, 22)}...` : item.reason,
      fullName: item.reason,
      totalMinutes: item.totalMinutes,
      cumPct: item.cumPct,
      count: item.count,
    }));
  }, [maintenancePareto]);

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedSector('Todos');
    setSelectedMachine('Todas');
    setSelectedShift('Todos');
    setSearchTerm('');
    if (availableMonths.length > 0) {
      setSelectedMonth(dashboardMonth && availableMonths.includes(dashboardMonth) ? dashboardMonth : availableMonths[0]);
    }
  };

  const handleExportMaintenanceOeePDF = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await downloadOeeAnalyticsPDF({
        productionData: filteredProd,
        ribbonEntries: filteredRibbon,
        period:
          startDate || endDate
            ? `${startDate || '...'} a ${endDate || '...'}`
            : selectedMonth === 'Todos'
            ? 'Todos os Meses'
            : selectedMonth,
        systemLogo,
        systemName,
        loggedUser: loggedUserName ? { name: loggedUserName, role: loggedUserRole } : null,
        filters: {
          machine: selectedMachine !== 'Todas' ? selectedMachine : undefined,
          shift: selectedShift !== 'Todos' ? selectedShift : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const hasActiveSubFilter =
    startDate !== '' ||
    endDate !== '' ||
    selectedSector !== 'Todos' ||
    selectedMachine !== 'Todas' ||
    selectedShift !== 'Todos' ||
    searchTerm.trim() !== '';

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider">
              <Gauge size={12} />
              Manutenção Industrial • Análise Geral
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              Extrusão (Cast 1, Cast 2) • Reciclagem (Erema) • Corte de Fita (Ghezzi, Lintech, Wultec)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Disponibilidade de Máquinas, OEE &amp; Paradas por Manutenção
            </h1>
            <CardInfoBadge
              id="header-overview"
              title="Painel Geral da Manutenção"
              description="Consolida os apontamentos reais de produção e paradas de todas as 6 máquinas da planta (Cast 1, Cast 2, Erema, Ghezzi, Lintech e Wultec), destacando o impacto exclusivo da manutenção na disponibilidade."
              openInfoId={openInfoId}
              hoverInfoId={hoverInfoId}
              onToggleClick={handleToggleInfo}
              onHoverChange={setHoverInfoId}
              onClose={handleCloseInfo}
              align="left"
            />
          </div>
          <p className="text-xs text-slate-500 max-w-3xl">
            Monitoramento consolidado da disponibilidade operacional, horas paradas por setor e diagnóstico exclusivo de ocorrências de manutenção nas seis linhas da planta.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportMaintenanceOeePDF}
            disabled={isExportingPdf || !plantSummary.hasData}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold tracking-wide transition-colors cursor-pointer"
          >
            <Download size={14} />
            <span>{isExportingPdf ? 'Gerando PDF...' : 'Exportar Relatório OEE (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* Global Filters Strip */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Filter size={14} className="text-slate-500" />
            <span>Filtros da Análise</span>
            <CardInfoBadge
              id="filters-card"
              title="Filtros da Análise"
              description="Filtre por mês, intervalo de datas, setor, máquina específica, turno ou palavra-chave no motivo da parada. Todos os KPIs, gráficos e tabelas abaixo são recalculados em tempo real."
              openInfoId={openInfoId}
              hoverInfoId={hoverInfoId}
              onToggleClick={handleToggleInfo}
              onHoverChange={setHoverInfoId}
              onClose={handleCloseInfo}
              align="left"
              compact
            />
          </div>
          {hasActiveSubFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer"
            >
              <X size={13} />
              Limpar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Mês */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Mês de Referência
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setStartDate('');
                setEndDate('');
              }}
              disabled={startDate !== '' || endDate !== ''}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 disabled:opacity-50"
            >
              <option value="Todos">Todos os Meses</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>

          {/* Data Início */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            />
          </div>

          {/* Data Fim */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Data Final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            />
          </div>

          {/* Setor */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Setor
            </label>
            <select
              value={selectedSector}
              onChange={(e) => {
                const nextSector = e.target.value as PlantSectorId;
                setSelectedSector(nextSector);
                if (nextSector !== 'Todos' && selectedMachine !== 'Todas') {
                  const spec = MACHINE_SPECS.find((s) => s.id === selectedMachine);
                  if (spec && spec.sector !== nextSector) setSelectedMachine('Todas');
                }
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            >
              <option value="Todos">Todos os Setores</option>
              <option value="Extrusão">Extrusão (Cast 1 &amp; 2)</option>
              <option value="Reciclagem">Reciclagem (Erema)</option>
              <option value="Corte de Fita">Corte de Fita (Fita)</option>
            </select>
          </div>

          {/* Máquina */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Máquina
            </label>
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            >
              <option value="Todas">Todas (6 Máquinas)</option>
              {MACHINE_SPECS.filter((s) => selectedSector === 'Todos' || s.sector === selectedSector).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} ({s.sector})
                </option>
              ))}
            </select>
          </div>

          {/* Busca / Turno */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Turno / Motivo
            </label>
            <div className="flex gap-1.5">
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="w-24 shrink-0 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="Todos">Turnos</option>
                {allShifts.map((sh) => (
                  <option key={sh} value={sh}>
                    {sh}
                  </option>
                ))}
              </select>
              <div className="relative flex-1 min-w-0">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Motivo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-7 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State when no production/ribbon data matches filter */}
      {!plantSummary.hasData ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Calendar size={22} />
          </div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Nenhum apontamento encontrado para os filtros aplicados
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Ajuste o mês de referência, intervalo de datas, setor ou máquina para visualizar os indicadores de disponibilidade e paradas.
          </p>
          {hasActiveSubFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
            >
              Restaurar filtros padrão
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Section 1: Executive KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* KPI 1: Disponibilidade Geral */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Disponibilidade Geral de Máquina
                  </span>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                      {plantSummary.availabilityPct.toFixed(1).replace('.', ',')}%
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md tabular-nums ${
                        plantSummary.availabilityPct >= 90
                          ? 'bg-emerald-50 text-emerald-700'
                          : plantSummary.availabilityPct >= 80
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {plantSummary.availabilityPct >= 90 ? 'Alta' : plantSummary.availabilityPct >= 80 ? 'Atenção' : 'Crítica'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <CardInfoBadge
                    id="kpi-availability"
                    title="Disponibilidade Geral de Máquina"
                    description="Mede o percentual do tempo planejado em que as máquinas realmente operaram sem paradas (manutenção, processo ou outros). Abaixo mostra também a disponibilidade considerando apenas paradas de manutenção ('Disp. s/ Manut.')."
                    formula="Disp. (%) = (Horas Operando ÷ Horas Planejadas) × 100 | Meta: ≥ 90%"
                    openInfoId={openInfoId}
                    hoverInfoId={hoverInfoId}
                    onToggleClick={handleToggleInfo}
                    onHoverChange={setHoverInfoId}
                    onClose={handleCloseInfo}
                    align="left"
                  />
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={18} />
                  </div>
                </div>
              </div>
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 tabular-nums">
                <span>
                  Disp. s/ Manut.: <strong className="text-slate-900">{plantSummary.maintAvailabilityPct.toFixed(1).replace('.', ',')}%</strong>
                </span>
                <span>
                  {formatHoursDecimal(plantSummary.totalOperatingMin)} / {formatHoursDecimal(plantSummary.totalPlannedMin)}
                </span>
              </div>
            </div>

            {/* KPI 2: Paradas por Manutenção */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Tempo Parado (Manutenção)
                  </span>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                      {formatMinutesShort(plantSummary.totalManutMin)}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 tabular-nums">
                      {plantSummary.maintSharePct.toFixed(1).replace('.', ',')}% das paradas
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <CardInfoBadge
                    id="kpi-maint-downtime"
                    title="Tempo Parado (Manutenção)"
                    description="Soma total de horas/minutos em que as máquinas ficaram paradas exclusivamente por motivos de manutenção (mecânica, elétrica, quebra, reparo), além da representatividade dessas paradas no total geral parado."
                    formula="Participação (%) = (Tempo Manutenção ÷ Parada Total Geral) × 100"
                    openInfoId={openInfoId}
                    hoverInfoId={hoverInfoId}
                    onToggleClick={handleToggleInfo}
                    onHoverChange={setHoverInfoId}
                    onClose={handleCloseInfo}
                    align="center"
                  />
                  <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <Wrench size={18} />
                  </div>
                </div>
              </div>
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 tabular-nums">
                <span>
                  Eventos Manut.: <strong className="text-slate-900">{plantSummary.totalMaintEvents}</strong>
                </span>
                <span>
                  Total Geral Parado: <strong className="text-slate-900">{formatMinutesShort(plantSummary.totalStoppedMin)}</strong>
                </span>
              </div>
            </div>

            {/* KPI 3: Confiabilidade MTBF / MTTR */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Confiabilidade (MTTR / MTBF)
                  </span>
                  <div className="mt-1.5 flex items-baseline gap-3 tabular-nums">
                    <div>
                      <span className="text-2xl font-extrabold text-slate-900">{plantSummary.mttrMinutes} min</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">MTTR</span>
                    </div>
                    <span className="text-slate-300">|</span>
                    <div>
                      <span className="text-2xl font-extrabold text-slate-900">{plantSummary.mtbfHours.toFixed(1).replace('.', ',')}h</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">MTBF</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <CardInfoBadge
                    id="kpi-reliability"
                    title="Confiabilidade (MTTR e MTBF)"
                    description="MTTR (Tempo Médio para Reparo) mostra quantos minutos, em média, cada parada de manutenção dura — quanto menor, melhor. MTBF (Tempo Médio Entre Falhas) indica quantas horas a máquina opera entre uma quebra e outra — quanto maior, melhor."
                    formula="MTTR = Tempo Manut. ÷ Eventos | MTBF = Horas Operando ÷ Eventos"
                    openInfoId={openInfoId}
                    hoverInfoId={hoverInfoId}
                    onToggleClick={handleToggleInfo}
                    onHoverChange={setHoverInfoId}
                    onClose={handleCloseInfo}
                    align="right"
                  />
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Clock size={18} />
                  </div>
                </div>
              </div>
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 tabular-nums">
                <span>
                  Processo: <strong className="text-slate-900">{formatMinutesShort(plantSummary.totalProcMin)}</strong>
                </span>
                <span>
                  Outros: <strong className="text-slate-900">{formatMinutesShort(plantSummary.totalOutrosMin)}</strong>
                </span>
              </div>
            </div>

            {/* KPI 4: OEE Consolidado */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs flex flex-col justify-between gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    OEE Consolidado da Planta
                  </span>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
                      {plantSummary.weightedOee.toFixed(1).replace('.', ',')}%
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
                      {plantSummary.activeMachinesCount} máq. ativas
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <CardInfoBadge
                    id="kpi-oee"
                    title="OEE Consolidado da Planta"
                    description="Eficiência Global dos Equipamentos ponderada entre as máquinas ativas no filtro. Combina Disponibilidade (tempo rodando), Performance (velocidade real vs nominal) e Qualidade (produção líquida sem aparas/perdas)."
                    formula="OEE = Disponibilidade × Performance × Qualidade"
                    openInfoId={openInfoId}
                    hoverInfoId={hoverInfoId}
                    onToggleClick={handleToggleInfo}
                    onHoverChange={setHoverInfoId}
                    onClose={handleCloseInfo}
                    align="right"
                  />
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Activity size={18} />
                  </div>
                </div>
              </div>
              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 tabular-nums">
                <span>
                  Disp: <strong>{plantSummary.availabilityPct.toFixed(1)}%</strong>
                </span>
                <span>
                  Perf: <strong>{plantSummary.weightedPerf.toFixed(1)}%</strong>
                </span>
                <span>
                  Qual: <strong>{plantSummary.weightedQual.toFixed(1)}%</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Disponibilidade por Máquina (%) — Todas as 6 máquinas */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
                    Disponibilidade por Máquina (%) — Visão Geral da Planta
                  </h2>
                  <CardInfoBadge
                    id="section-machines"
                    title="Disponibilidade por Máquina"
                    description="Exibe a disponibilidade operacional (%), o OEE (%) e os minutos parados de cada equipamento da planta. Clique em qualquer card para isolar apenas aquela máquina nos gráficos e causas abaixo."
                    openInfoId={openInfoId}
                    hoverInfoId={hoverInfoId}
                    onToggleClick={handleToggleInfo}
                    onHoverChange={setHoverInfoId}
                    onClose={handleCloseInfo}
                    align="left"
                    compact
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Clique em uma máquina para filtrar todos os gráficos e motivos abaixo exclusivamente para ela.
                </p>
              </div>
              {selectedMachine !== 'Todas' && (
                <button
                  type="button"
                  onClick={() => setSelectedMachine('Todas')}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  Mostrar todas as 6 máquinas
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {machineMetrics.map((m, idx) => {
                const isSelected = selectedMachine === m.machine;
                const isFilteredOut =
                  (selectedSector !== 'Todos' && m.sector !== selectedSector) ||
                  (selectedMachine !== 'Todas' && m.machine !== selectedMachine);

                const barColor =
                  !m.hasData
                    ? 'bg-slate-200'
                    : m.availabilityPct >= 90
                    ? 'bg-emerald-500'
                    : m.availabilityPct >= 80
                    ? 'bg-amber-500'
                    : 'bg-red-500';

                return (
                  <div
                    key={m.machine}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedMachine((prev) => (prev === m.machine ? 'Todas' : m.machine))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedMachine((prev) => (prev === m.machine ? 'Todas' : m.machine));
                      }
                    }}
                    className={`text-left rounded-xl border p-3.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                        : isFilteredOut
                        ? 'border-slate-100 bg-slate-50/40 opacity-50 hover:opacity-85'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-extrabold text-slate-900 uppercase">{m.machine}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-semibold text-slate-500 px-1.5 py-0.5 rounded bg-slate-100">
                          {m.sector === 'Corte de Fita' ? 'Fita' : m.sector}
                        </span>
                        <CardInfoBadge
                          id={`machine-card-${m.machine}`}
                          title={`Máquina ${m.machine} (${m.sector})`}
                          description={`Mostra a disponibilidade real da ${m.machine} no período filtrado, o OEE estimado, a disponibilidade descontando apenas manutenção ("Disp. c/ Manut.") e as horas perdidas. Clique no card para filtrar todo o painel para ${m.machine}.`}
                          formula={`Planejado: ${m.hasData ? `${m.plannedHours.toFixed(1)}h` : '—'} | Operando: ${m.hasData ? `${m.operatingHours.toFixed(1)}h` : '—'} | MTBF: ${m.hasData ? `${m.mtbfHours.toFixed(1)}h` : '—'} | MTTR: ${m.hasData ? `${m.mttrMinutes}m` : '—'}`}
                          openInfoId={openInfoId}
                          hoverInfoId={hoverInfoId}
                          onToggleClick={handleToggleInfo}
                          onHoverChange={setHoverInfoId}
                          onClose={handleCloseInfo}
                          align={idx <= 1 ? 'left' : idx >= 4 ? 'right' : 'center'}
                          compact
                        />
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-baseline justify-between">
                      <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
                        {m.hasData ? `${m.availabilityPct.toFixed(1).replace('.', ',')}%` : '—'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                        OEE {m.hasData ? `${m.oeePct.toFixed(1)}%` : '—'}
                      </span>
                    </div>

                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${m.hasData ? Math.min(100, m.availabilityPct) : 0}%` }}
                      />
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1 text-[10px] text-slate-600 tabular-nums">
                      <div className="flex items-center justify-between">
                        <span>Disp. c/ Manut.:</span>
                        <strong className="text-slate-800">
                          {m.hasData ? `${m.maintAvailabilityPct.toFixed(1)}%` : '—'}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Parada Manut.:</span>
                        <strong className="text-orange-700">{formatMinutesShort(m.manutMin)}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Parada Total:</span>
                        <strong className="text-slate-800">{formatMinutesShort(m.totalStoppedMin)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Charts Grid — Availability % + Extrusão General Downtime + Corte de Fita General Downtime + Maintenance Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 1: Disponibilidade (%) e OEE por Máquina (Todas as 6 Máquinas) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                    Disponibilidade de Máquina (%) &amp; OEE por Equipamento
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Comparativo entre disponibilidade operacional total, impacto exclusivo de manutenção e OEE (%)
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-md bg-slate-100 text-slate-600">
                    Planta Completa
                  </span>
                  <CardInfoBadge
                    id="chart-availability-oee"
                    title="Disponibilidade (%) & OEE por Equipamento"
                    description="Compara lado a lado as 6 linhas da fábrica: a barra azul mostra a disponibilidade considerando apenas paradas de manutenção; a barra verde mostra a disponibilidade operacional líquida (todas as paradas); a linha roxa indica o OEE (%)."
                    openInfoId={openInfoId}
                    hoverInfoId={hoverInfoId}
                    onToggleClick={handleToggleInfo}
                    onHoverChange={setHoverInfoId}
                    onClose={handleCloseInfo}
                    align="right"
                    compact
                  />
                </div>
              </div>

              <div className="w-full h-[300px]">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={availabilityComparisonChartData} margin={{ top: 10, right: 12, left: -16, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 11, fontWeight: 700 }} />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="#64748b" style={{ fontSize: 10, fontWeight: 700 }} />
                    <RechartsTooltip
                      formatter={(val: any, name: any) => [`${Number(val).toFixed(1)}%`, name]}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 8 }} />
                    <Bar dataKey="maintAvailabilityPct" name="Disp. Manutenção (%)" fill="#0284c7" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="availabilityPct" name="Disp. Operacional Geral (%)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                    <Line type="monotone" dataKey="oeePct" name="OEE (%)" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Paradas Exclusivas por Manutenção — Evolução Diária (Extrusão vs Fita) */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                    Evolução Diária de Paradas por Manutenção (min)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tempo parado exclusivamente por manutenção: Extrusão/Reciclagem vs Corte de Fita
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-md bg-orange-50 text-orange-700">
                    Foco Manutenção
                  </span>
                  <CardInfoBadge
                    id="chart-daily-maint"
                    title="Evolução Diária de Paradas por Manutenção"
                    description="Acompanha dia a dia quantos minutos foram perdidos por manutenção em Extrusão/Erema (laranja escuro) e no Corte de Fita (âmbar), comparados à área cinza que representa o total geral de paradas da planta no dia."
                    openInfoId={openInfoId}
                    hoverInfoId={hoverInfoId}
                    onToggleClick={handleToggleInfo}
                    onHoverChange={setHoverInfoId}
                    onClose={handleCloseInfo}
                    align="right"
                    compact
                  />
                </div>
              </div>

              <div className="w-full h-[300px]">
                {maintenanceDailyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={maintenanceDailyTrend} margin={{ top: 10, right: 12, left: -12, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="label" stroke="#64748b" style={{ fontSize: 10, fontWeight: 700 }} />
                      <YAxis stroke="#64748b" style={{ fontSize: 10, fontWeight: 700 }} unit="m" />
                      <RechartsTooltip
                        formatter={(val: any, name: any) => [`${val} min`, name]}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 8 }} />
                      <Bar dataKey="extrusaoMaintMin" name="Manut. Extrusão &amp; Erema (min)" stackId="maint" fill="#ea580c" barSize={18} />
                      <Bar dataKey="fitaMaintMin" name="Manut. Corte de Fita (min)" stackId="maint" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={18} />
                      <Area
                        type="monotone"
                        dataKey="totalStopsMin"
                        name="Parada Total Geral (min)"
                        stroke="#64748b"
                        fill="#e2e8f0"
                        fillOpacity={0.35}
                        strokeWidth={1.5}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs font-semibold text-slate-400">
                    Sem paradas registradas no período selecionado
                  </div>
                )}
              </div>
            </div>

            {/* Chart 3: Extrusão Geral (Cast 1, Cast 2, Erema) — Paradas de Máquina */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                    Paradas de Máquina — Extrusão &amp; Reciclagem (Cast 1, Erema, Cast 2)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Distribuição de inatividade entre Manutenção, Processo e Outros
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <CardInfoBadge
                    id="chart-extrusion-stops"
                    title="Paradas — Extrusão & Reciclagem"
                    description="Espelha o gráfico geral de paradas da Extrusão e Erema (Cast 1, Cast 2 e Erema), dividindo os minutos parados em Manutenção, Processo e Outros. Alterne entre visão por Máquinas ou Diário e entre % ou Minutos."
                    openInfoId={openInfoId}
                    hoverInfoId={hoverInfoId}
                    onToggleClick={handleToggleInfo}
                    onHoverChange={setHoverInfoId}
                    onClose={handleCloseInfo}
                    align="right"
                    compact
                  />
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setExtrusionGroupBy('machine')}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase cursor-pointer ${
                        extrusionGroupBy === 'machine' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      Máquinas
                    </button>
                    <button
                      type="button"
                      onClick={() => setExtrusionGroupBy('date')}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase cursor-pointer ${
                        extrusionGroupBy === 'date' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      Diário
                    </button>
                  </div>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setExtrusionChartMode('pct')}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase cursor-pointer ${
                        extrusionChartMode === 'pct' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setExtrusionChartMode('min')}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase cursor-pointer ${
                        extrusionChartMode === 'min' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      Min
                    </button>
                  </div>
                </div>
              </div>

              <div className="w-full h-[300px]">
                {extrusionStopsChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={extrusionStopsChartData} margin={{ top: 10, right: 10, left: -16, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 10, fontWeight: 700 }} />
                      <YAxis
                        tickFormatter={(tick) => (extrusionChartMode === 'pct' ? `${tick}%` : `${tick}m`)}
                        stroke="#64748b"
                        style={{ fontSize: 10, fontWeight: 700 }}
                      />
                      <RechartsTooltip
                        formatter={(val: any, name: any) => [
                          extrusionChartMode === 'pct' ? `${val}%` : `${val} min`,
                          name,
                        ]}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      />
                      <Legend iconType="rect" wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 8 }} />
                      <Bar
                        dataKey={extrusionChartMode === 'pct' ? 'manutPct' : 'manutMin'}
                        name="Parada Manutenção"
                        stackId="ext-stops"
                        fill="#ef4444"
                      />
                      <Bar
                        dataKey={extrusionChartMode === 'pct' ? 'procPct' : 'procMin'}
                        name="Parada Processo"
                        stackId="ext-stops"
                        fill="#f59e0b"
                      />
                      <Bar
                        dataKey={extrusionChartMode === 'pct' ? 'outrosPct' : 'outrosMin'}
                        name="Outras Paradas"
                        stackId="ext-stops"
                        fill="#64748b"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs font-semibold text-slate-400">
                    Sem inatividades registradas em Extrusão / Erema
                  </div>
                )}
              </div>
            </div>

            {/* Chart 4: Corte de Fita Geral (Ghezzi, Lintech, Wultec) — Paradas de Máquina */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                    Paradas de Máquina — Corte de Fita (Ghezzi, Lintech, Wultec)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Distribuição de inatividade nas cortadeiras entre Manutenção, Processo e Outros
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <CardInfoBadge
                    id="chart-ribbon-stops"
                    title="Paradas — Corte de Fita"
                    description="Consolida os gráficos de paradas de máquina das cortadeiras do Corte de Fita (Ghezzi, Lintech e Wultec), classificando em Manutenção, Processo e Outros, com alternância entre Máquinas/Diário e %/Min."
                    openInfoId={openInfoId}
                    hoverInfoId={hoverInfoId}
                    onToggleClick={handleToggleInfo}
                    onHoverChange={setHoverInfoId}
                    onClose={handleCloseInfo}
                    align="right"
                    compact
                  />
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setRibbonGroupBy('machine')}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase cursor-pointer ${
                        ribbonGroupBy === 'machine' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      Máquinas
                    </button>
                    <button
                      type="button"
                      onClick={() => setRibbonGroupBy('date')}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase cursor-pointer ${
                        ribbonGroupBy === 'date' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      Diário
                    </button>
                  </div>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setRibbonChartMode('pct')}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase cursor-pointer ${
                        ribbonChartMode === 'pct' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setRibbonChartMode('min')}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase cursor-pointer ${
                        ribbonChartMode === 'min' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      Min
                    </button>
                  </div>
                </div>
              </div>

              <div className="w-full h-[300px]">
                {ribbonStopsChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ribbonStopsChartData} margin={{ top: 10, right: 10, left: -16, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: 10, fontWeight: 700 }} />
                      <YAxis
                        tickFormatter={(tick) => (ribbonChartMode === 'pct' ? `${tick}%` : `${tick}m`)}
                        stroke="#64748b"
                        style={{ fontSize: 10, fontWeight: 700 }}
                      />
                      <RechartsTooltip
                        formatter={(val: any, name: any) => [
                          ribbonChartMode === 'pct' ? `${val}%` : `${val} min`,
                          name,
                        ]}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      />
                      <Legend iconType="rect" wrapperStyle={{ fontSize: 11, fontWeight: 600, paddingTop: 8 }} />
                      <Bar
                        dataKey={ribbonChartMode === 'pct' ? 'manutPct' : 'manutMin'}
                        name="Parada Manutenção"
                        stackId="rib-stops"
                        fill="#ef4444"
                      />
                      <Bar
                        dataKey={ribbonChartMode === 'pct' ? 'procPct' : 'procMin'}
                        name="Parada Processo"
                        stackId="rib-stops"
                        fill="#f59e0b"
                      />
                      <Bar
                        dataKey={ribbonChartMode === 'pct' ? 'outrosPct' : 'outrosMin'}
                        name="Outras Paradas"
                        stackId="rib-stops"
                        fill="#64748b"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs font-semibold text-slate-400">
                    Sem inatividades registradas no Corte de Fita
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Exclusive Maintenance Root Causes Analysis (Pareto Chart + Drilldown Table) */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
            {/* Pareto Chart */}
            <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
              <div className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                    Pareto de Paradas por Manutenção
                  </h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <BarChart3 size={16} className="text-orange-600" />
                    <CardInfoBadge
                      id="chart-pareto"
                      title="Pareto de Paradas por Manutenção"
                      description="Ordena as 10 causas de manutenção que mais geraram tempo de máquina parada. As barras mostram os minutos perdidos por causa e a linha azul mostra o percentual acumulado (princípio 80/20 para priorizar ações corretivas)."
                      openInfoId={openInfoId}
                      hoverInfoId={hoverInfoId}
                      onToggleClick={handleToggleInfo}
                      onHoverChange={setHoverInfoId}
                      onClose={handleCloseInfo}
                      align="right"
                      compact
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Top 10 causas de manutenção que mais consomem disponibilidade (min e % acum.)
                </p>
              </div>

              <div className="w-full h-[320px]">
                {paretoChartRows.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={paretoChartRows} margin={{ top: 10, right: 10, left: -14, bottom: 38 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="shortName"
                        stroke="#64748b"
                        style={{ fontSize: 9, fontWeight: 600 }}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={54}
                      />
                      <YAxis yAxisId="left" stroke="#64748b" style={{ fontSize: 10, fontWeight: 700 }} unit="m" />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[0, 100]}
                        stroke="#2563eb"
                        style={{ fontSize: 10, fontWeight: 700 }}
                        unit="%"
                      />
                      <RechartsTooltip
                        formatter={(val: any, name: any) => [
                          name === '% Acumulado' ? `${val}%` : `${val} min`,
                          name,
                        ]}
                        labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName || _label}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                      />
                      <Bar yAxisId="left" dataKey="totalMinutes" name="Tempo Parado (min)" fill="#ea580c" radius={[4, 4, 0, 0]} barSize={20}>
                        {paretoChartRows.map((_, i) => (
                          <Cell key={i} fill={i === 0 ? '#dc2626' : i < 3 ? '#ea580c' : '#f59e0b'} />
                        ))}
                      </Bar>
                      <Line yAxisId="right" type="monotone" dataKey="cumPct" name="% Acumulado" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs font-semibold text-slate-400">
                    Nenhuma parada de manutenção registrada no período
                  </div>
                )}
              </div>
            </div>

            {/* Maintenance Causes Ranking Table */}
            <div className="xl:col-span-3 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                    Diagnóstico Detalhado de Motivos de Manutenção
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Clique em qualquer motivo para abrir os apontamentos de horário, operador e justificativa.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg tabular-nums">
                    {maintenancePareto.length} causas distintas
                  </span>
                  <CardInfoBadge
                    id="table-causes-ranking"
                    title="Diagnóstico Detalhado de Motivos"
                    description="Lista todas as causas de manutenção lançadas nos apontamentos, com máquina mais afetada, quantidade de ocorrências, tempo total perdido, MTTR da causa e participação (%). Clique em qualquer linha para ver cada ocorrência com horário e operador."
                    openInfoId={openInfoId}
                    hoverInfoId={hoverInfoId}
                    onToggleClick={handleToggleInfo}
                    onHoverChange={setHoverInfoId}
                    onClose={handleCloseInfo}
                    align="right"
                    compact
                  />
                </div>
              </div>

              {maintenancePareto.length > 0 ? (
                <div className="overflow-x-auto max-h-[320px] overflow-y-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Motivo / Causa (Manutenção)</th>
                        <th className="py-2.5 px-2 text-center">Máq. Principal</th>
                        <th className="py-2.5 px-2 text-right">Qtd</th>
                        <th className="py-2.5 px-2 text-right">Tempo Total</th>
                        <th className="py-2.5 px-2 text-right">MTTR</th>
                        <th className="py-2.5 px-3 text-right">% Manut.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {maintenancePareto.map((row, idx) => (
                        <tr
                          key={`${row.reason}-${idx}`}
                          onClick={() => setDrilldownReason(row)}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <td className="py-2.5 px-3 font-semibold text-slate-800 max-w-[260px] truncate" title={row.reason}>
                            {row.reason}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                              {row.topMachine}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right tabular-nums text-slate-700 font-semibold">{row.count}</td>
                          <td className="py-2.5 px-2 text-right tabular-nums font-bold text-orange-700">
                            {formatMinutesShort(row.totalMinutes)}
                          </td>
                          <td className="py-2.5 px-2 text-right tabular-nums text-slate-600">{row.avgMinutes} min</td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-bold text-slate-800">
                            {row.pctOfMaintTime.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-[260px] flex flex-col items-center justify-center text-center gap-2 text-slate-400">
                  <AlertTriangle size={24} className="text-slate-300" />
                  <p className="text-xs font-semibold">Nenhuma causa de manutenção lançada para este filtro.</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Complete Machine Availability & OEE Technical Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                  Matriz Consolidada de Disponibilidade, Paradas &amp; Confiabilidade por Máquina
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Visão analítica completa das 6 máquinas: Extrusão (Cast 1, Cast 2), Reciclagem (Erema) e Corte de Fita (Ghezzi, Lintech, Wultec).
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <Layers size={13} />
                  <span>Base: Apontamentos de Turno</span>
                </span>
                <CardInfoBadge
                  id="matrix-consolidated"
                  title="Matriz Consolidada por Máquina"
                  description="Tabela técnica completa comparando Horas Planejadas, Horas Operando, tempos de parada por categoria (Manutenção, Processo e Outros), Disponibilidade sem Manutenção, Disponibilidade Geral, MTBF, MTTR e OEE (%) de cada equipamento."
                  openInfoId={openInfoId}
                  hoverInfoId={hoverInfoId}
                  onToggleClick={handleToggleInfo}
                  onHoverChange={setHoverInfoId}
                  onClose={handleCloseInfo}
                  align="right"
                  position="top"
                  compact
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Máquina</th>
                    <th className="py-3 px-2">Setor</th>
                    <th className="py-3 px-2 text-right">H. Planejadas</th>
                    <th className="py-3 px-2 text-right">H. Operando</th>
                    <th className="py-3 px-2 text-right">Manutenção</th>
                    <th className="py-3 px-2 text-right">Processo</th>
                    <th className="py-3 px-2 text-right">Outros</th>
                    <th className="py-3 px-2 text-right">Disp. s/ Manut.</th>
                    <th className="py-3 px-2 text-right">Disponibilidade</th>
                    <th className="py-3 px-2 text-right">MTBF</th>
                    <th className="py-3 px-2 text-right">MTTR</th>
                    <th className="py-3 px-3 text-right">OEE (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs tabular-nums">
                  {visibleMachineMetrics.map((m) => (
                    <tr key={m.machine} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-extrabold text-slate-900">{m.machine}</td>
                      <td className="py-3 px-2 text-slate-600 font-medium">{m.sector}</td>
                      <td className="py-3 px-2 text-right text-slate-700">{m.hasData ? `${m.plannedHours.toFixed(1)}h` : '—'}</td>
                      <td className="py-3 px-2 text-right text-slate-700">{m.hasData ? `${m.operatingHours.toFixed(1)}h` : '—'}</td>
                      <td className="py-3 px-2 text-right font-bold text-orange-700">{formatMinutesShort(m.manutMin)}</td>
                      <td className="py-3 px-2 text-right text-amber-700 font-semibold">{formatMinutesShort(m.procMin)}</td>
                      <td className="py-3 px-2 text-right text-slate-600">{formatMinutesShort(m.outrosMin)}</td>
                      <td className="py-3 px-2 text-right font-bold text-sky-700">
                        {m.hasData ? `${m.maintAvailabilityPct.toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {m.hasData ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-extrabold ${
                              m.availabilityPct >= 90
                                ? 'bg-emerald-50 text-emerald-700'
                                : m.availabilityPct >= 80
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-red-50 text-red-700'
                            }`}
                          >
                            {m.availabilityPct.toFixed(1)}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-2 text-right text-slate-700">{m.hasData ? `${m.mtbfHours.toFixed(1)}h` : '—'}</td>
                      <td className="py-3 px-2 text-right text-slate-700">{m.hasData ? `${m.mttrMinutes}m` : '—'}</td>
                      <td className="py-3 px-3 text-right font-extrabold text-indigo-700">
                        {m.hasData ? `${m.oeePct.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Drilldown Modal for Maintenance Reason Occurrences */}
      {drilldownReason && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 bg-orange-50 px-2 py-0.5 rounded">
                  Detalhamento de Ocorrências • Manutenção
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1.5">{drilldownReason.reason}</h3>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  {drilldownReason.count} ocorrências • Total: {formatMinutesShort(drilldownReason.totalMinutes)} • Média (MTTR):{' '}
                  {drilldownReason.avgMinutes} min
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrilldownReason(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Data</th>
                    <th className="py-2 px-2">Máquina</th>
                    <th className="py-2 px-2">Turno</th>
                    <th className="py-2 px-2">Operador</th>
                    <th className="py-2 px-2">Horário</th>
                    <th className="py-2 px-3 text-right">Duração</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs tabular-nums">
                  {drilldownReason.occurrences.map((occ) => (
                    <tr key={occ.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-800">
                        {occ.date.split('-').reverse().join('/')}
                      </td>
                      <td className="py-2 px-2 font-bold text-slate-800">{occ.machine}</td>
                      <td className="py-2 px-2 text-slate-600">{occ.shift}</td>
                      <td className="py-2 px-2 text-slate-700">{occ.operator}</td>
                      <td className="py-2 px-2 text-slate-500">
                        {occ.de && occ.ate ? `${occ.de} – ${occ.ate}` : '—'}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-orange-700">
                        {formatMinutesShort(occ.minutes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceDowntimeAnalyticsView;
