import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Tv, Maximize2, Minimize2, Play, Pause, ChevronLeft, ChevronRight, 
  Trophy, TrendingUp, Target, Calendar, Clock, Activity, 
  Award, BarChart3, Factory, RefreshCw, X, Sliders, Flame, Users,
  ArrowUpRight, ArrowDownRight, TrendingDown, Scale, AlertCircle, Percent,
  ShieldAlert, AlertTriangle, ArrowLeft, Wrench, Gauge
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell, LabelList,
  ComposedChart, Line
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { ProductionEntry, RibbonCuttingEntry, Collaborator, OperatorPenalty, Employee, CompanyNotice, Shift } from '../types';
import { GOAL_VALUE } from '../constants';
import { getRibbonTotalGoal, getRibbonMachineGoal, calcJumboUnits, formatJumboUnits } from '../utils/ribbonGoalsUtils';
import { getEremaStandardGoal } from '../utils/ribbonStandardGoals';
import {
  computePlantAvailability,
  formatAvailabilityMinutesShort,
  formatAvailabilityHoursDecimal,
} from '../utils/plantAvailabilityUtils';
import { CompanyNoticeModal } from './CompanyNoticeModal';
import { WeeklyProductionSummaryModal } from './WeeklyProductionSummaryModal';
import { Plus, Megaphone, CheckCircle2, FileText, Camera, Upload, Trash2, Presentation } from 'lucide-react';

interface ProjectionDashboardProps {
  productionData: ProductionEntry[];
  ribbonEntries: RibbonCuttingEntry[];
  goals: Record<string, number>;
  eremaGoals?: Record<string, number>;
  ribbonGoals?: Record<string, any>;
  extrusionWasteLimit?: number;
  extrusionWasteLimits?: Record<string, number>;
  dashboardMonth: string; // YYYY-MM
  availableShifts?: Shift[];
  collaborators: Collaborator[];
  systemName: string;
  systemLogo?: string;
  onClose: () => void;
  operatorPenalties?: OperatorPenalty[];
  onAddPenalty?: (penalty: Omit<OperatorPenalty, 'id' | 'createdAt'>) => Promise<void> | void;
  onDeletePenalty?: (id: string) => Promise<void> | void;
  employees?: Employee[];
  companyNotices?: CompanyNotice[];
  onSaveNotice?: (notice: CompanyNotice) => Promise<void> | void;
  onDeleteNotice?: (id: string) => Promise<void> | void;
  isReadOnly?: boolean;
  onBlockedAction?: (title?: string, message?: string) => void;
  isScreensaver?: boolean;
  onExitScreensaver?: () => void;
  isTvMode?: boolean;
  isStandaloneTv?: boolean;
  canViewWeeklySummary?: boolean;
}

const ContinuousConfettiOverlay: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 300);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 200);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    const colors = ['#005A7D', '#A8D419', '#0077A3', '#C5F028', '#0284C7', '#84CC16', '#38BDF8', '#D9F99D'];
    const particleCount = 40;

    interface Particle {
      x: number;
      y: number;
      size: number;
      color: string;
      speedY: number;
      speedX: number;
      angle: number;
      angularSpeed: number;
      shape: 'rect' | 'circle';
    }

    const particles: Particle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 7 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 1.8 + 0.8,
      speedX: (Math.random() - 0.5) * 0.9,
      angle: Math.random() * Math.PI * 2,
      angularSpeed: (Math.random() - 0.5) * 0.08,
      shape: Math.random() > 0.35 ? 'rect' : 'circle',
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += Math.sin(p.angle) * 0.6 + p.speedX;
        p.angle += p.angularSpeed;

        if (p.y > height + 10) {
          p.y = -10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none w-full h-full z-0 opacity-85"
    />
  );
};

export const ProjectionDashboard: React.FC<ProjectionDashboardProps> = ({
  productionData,
  ribbonEntries,
  goals,
  eremaGoals = {},
  ribbonGoals = {},
  extrusionWasteLimit = 8.0,
  extrusionWasteLimits = {},
  dashboardMonth,
  availableShifts = [],
  collaborators,
  systemName,
  systemLogo,
  onClose,
  operatorPenalties = [],
  onAddPenalty = () => {},
  onDeletePenalty = () => {},
  employees = [],
  companyNotices = [],
  onSaveNotice = async (_notice: CompanyNotice) => {},
  onDeleteNotice = async (_id: string) => {},
  isReadOnly,
  onBlockedAction,
  isScreensaver = false,
  onExitScreensaver,
  isTvMode = false,
  isStandaloneTv = false,
  canViewWeeklySummary = false,
}) => {
  const effectiveTvMode = isTvMode || isStandaloneTv;

  // Auto Tela Cheia contínua para Gestão Visual externa (Smart TVs / Telões industriais)
  useEffect(() => {
    if (!isStandaloneTv) return;

    const tryRequestFullscreen = () => {
      try {
        if (!document.fullscreenElement) {
          const docEl = document.documentElement as any;
          if (docEl.requestFullscreen) {
            docEl.requestFullscreen().catch(() => {});
          } else if (docEl.webkitRequestFullscreen) {
            docEl.webkitRequestFullscreen();
          } else if (docEl.mozRequestFullScreen) {
            docEl.mozRequestFullScreen();
          } else if (docEl.msRequestFullscreen) {
            docEl.msRequestFullscreen();
          }
        }
      } catch (_) {}
    };

    // Tenta imediatamente ao carregar
    tryRequestFullscreen();

    const t1 = setTimeout(tryRequestFullscreen, 150);
    const t2 = setTimeout(tryRequestFullscreen, 600);
    const t3 = setTimeout(tryRequestFullscreen, 1500);
    const t4 = setTimeout(tryRequestFullscreen, 3500);

    // Quando o usuário aperta Enter no controle remoto da TV Smart ou toca na tela
    const handleTvInteraction = () => {
      tryRequestFullscreen();
    };

    window.addEventListener('keydown', handleTvInteraction, { passive: true });
    window.addEventListener('click', handleTvInteraction, { passive: true });
    window.addEventListener('pointerdown', handleTvInteraction, { passive: true });
    window.addEventListener('touchstart', handleTvInteraction, { passive: true });

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      window.removeEventListener('keydown', handleTvInteraction);
      window.removeEventListener('click', handleTvInteraction);
      window.removeEventListener('pointerdown', handleTvInteraction);
      window.removeEventListener('touchstart', handleTvInteraction);
    };
  }, [isStandaloneTv]);

  // Protetor de tela: fechar/acordar ao detectar qualquer ação do usuário no computador
  useEffect(() => {
    if (!isScreensaver || isStandaloneTv) return;

    const startTime = Date.now();
    let initialPos: { x: number; y: number } | null = null;

    const dismissScreensaver = () => {
      if (onExitScreensaver) {
        onExitScreensaver();
      } else {
        onClose();
      }
    };

    const handleUserActivity = (e: Event) => {
      // Período de tolerância de 800ms para evitar disparo por eventos em trânsito
      if (Date.now() - startTime < 800) return;

      if (e.type === 'mousemove') {
        const me = e as MouseEvent;
        if (!initialPos) {
          initialPos = { x: me.clientX, y: me.clientY };
          return;
        }
        const delta = Math.hypot(me.clientX - initialPos.x, me.clientY - initialPos.y);
        // Exige um movimento perceptível (>= 15px) para não disparar por tremor ou vibração
        if (delta < 15) return;
      }

      dismissScreensaver();
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('mousedown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    window.addEventListener('wheel', handleUserActivity);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('wheel', handleUserActivity);
    };
  }, [isScreensaver, onExitScreensaver, onClose]);
  // States for controls
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(true);
  const [slideDuration, setSlideDuration] = useState<number>(30); // Default 30s
  const [timeRemaining, setTimeRemaining] = useState<number>(30);
  const [viewMode, setViewMode] = useState<'slides' | 'grid'>('slides');
  const [comparisonView, setComparisonView] = useState<'daily' | 'monthly'>('daily');
  const [tvLinkCopied, setTvLinkCopied] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [noticeModalCategory, setNoticeModalCategory] = useState<'rh' | 'safety' | null>(null);
  const [isWeeklySummaryOpen, setIsWeeklySummaryOpen] = useState<boolean>(false);
  const historyScrollRef = useRef<HTMLDivElement>(null);

  const rhNotices = useMemo(() => {
    return (companyNotices || []).filter((n) => n.category === 'rh');
  }, [companyNotices]);

  const safetyNotices = useMemo(() => {
    return (companyNotices || []).filter((n) => n.category === 'safety');
  }, [companyNotices]);

  // Notice rotation states for full-screen display without scrollbars
  const [activeRhIndex, setActiveRhIndex] = useState<number>(0);
  const [activeSafetyIndex, setActiveSafetyIndex] = useState<number>(0);

  // Auto-rotate RH notices within Slide 8 if multiple notices exist
  useEffect(() => {
    if (currentSlide !== 8 || rhNotices.length <= 1) return;
    const intervalSeconds = Math.max(8, Math.floor(slideDuration / rhNotices.length));
    const timer = setInterval(() => {
      setActiveRhIndex((prev) => (prev + 1) % rhNotices.length);
    }, intervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [currentSlide, rhNotices.length, slideDuration]);

  // Auto-rotate Safety notices within Slide 9 if multiple notices exist
  useEffect(() => {
    if (currentSlide !== 9 || safetyNotices.length <= 1) return;
    const intervalSeconds = Math.max(8, Math.floor(slideDuration / safetyNotices.length));
    const timer = setInterval(() => {
      setActiveSafetyIndex((prev) => (prev + 1) % safetyNotices.length);
    }, intervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [currentSlide, safetyNotices.length, slideDuration]);

  // Keep notice indices within valid bounds
  useEffect(() => {
    if (activeRhIndex >= rhNotices.length && rhNotices.length > 0) {
      setActiveRhIndex(0);
    }
  }, [rhNotices.length, activeRhIndex]);

  useEffect(() => {
    if (activeSafetyIndex >= safetyNotices.length && safetyNotices.length > 0) {
      setActiveSafetyIndex(0);
    }
  }, [safetyNotices.length, activeSafetyIndex]);

  // List of all operators for penalties modal
  const allOperatorsList = useMemo(() => {
    const set = new Set<string>();
    (productionData || []).forEach((p) => {
      if (p.operator && p.operator.trim()) set.add(p.operator.trim());
    });
    (collaborators || []).forEach((c) => {
      if (c.name && c.name.trim()) set.add(c.name.trim());
    });
    (employees || []).forEach((e) => {
      if (e.name && e.name.trim()) set.add(e.name.trim());
    });
    return Array.from(set).sort();
  }, [productionData, collaborators, employees]);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fullscreen & Key listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && !isFullscreen) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else {
          setIsFullscreen(true);
        }
      } else {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (e) {
      console.warn('Erro ao alternar tela cheia:', e);
      setIsFullscreen((prev) => !prev);
    }
  };

  // Auto-play slides logic
  useEffect(() => {
    if (!isAutoPlay || viewMode === 'grid') return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setCurrentSlide((slide) => {
            const next = (slide + 1) % 10;
            if (next === 8) setActiveRhIndex(0);
            if (next === 9) setActiveSafetyIndex(0);
            return next;
          });
          return slideDuration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAutoPlay, slideDuration, viewMode]);

  // Reset timer on manual slide change or duration change
  const handleSlideChange = (newSlide: number) => {
    setCurrentSlide(newSlide);
    setTimeRemaining(slideDuration);
    if (newSlide === 8) setActiveRhIndex(0);
    if (newSlide === 9) setActiveSafetyIndex(0);
  };

  const handleDurationChange = (newDuration: number) => {
    setSlideDuration(newDuration);
    setTimeRemaining(newDuration);
  };

  // Helper formatting with dot decimals and thousand separators
  const formatNumDot = (num: number, minDec: number = 0, maxDec: number = 1) => {
    if (isNaN(num) || num === null || num === undefined) return '0';
    const fixed = num.toFixed(maxDec);
    const parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (maxDec > 0 && parts[1]) {
      let dec = parts[1];
      if (minDec === 0) dec = dec.replace(/0+$/, '');
      if (dec.length > 0) return `${parts[0]}.${dec}`;
    }
    return parts[0];
  };

  // Helper formatting with dynamic kg/T conversion and smaller unit font size
  const renderWeight = (
    val: number,
    unitClass: string = 'text-[0.45em] font-extrabold opacity-75 ml-1 select-none',
    suffix: string = ''
  ) => {
    const absVal = Math.abs(val || 0);
    if (absVal >= 1000) {
      const tons = val / 1000;
      const numStr = formatNumDot(tons, 1, 3);
      return (
        <span className="inline-flex items-baseline">
          <span>{numStr}</span>
          <span className={unitClass}>T{suffix}</span>
        </span>
      );
    }
    const numStr = formatNumDot(val || 0, 0, 0);
    return (
      <span className="inline-flex items-baseline">
        <span>{numStr}</span>
        <span className={unitClass}>kg{suffix}</span>
      </span>
    );
  };

  const renderM2 = (
    val: number,
    unitClass: string = 'text-[0.45em] font-extrabold opacity-75 ml-1 select-none'
  ) => {
    const numStr = formatNumDot(val || 0, 0, 0);
    return (
      <span className="inline-flex items-baseline">
        <span>{numStr}</span>
        <span className={unitClass}>m²</span>
      </span>
    );
  };

  const formatWeightStr = (val: number) => {
    const absVal = Math.abs(val || 0);
    if (absVal >= 1000) {
      return `${formatNumDot(val / 1000, 1, 2)} T`;
    }
    return `${formatNumDot(val || 0, 0, 0)} kg`;
  };

  // Calculate Metrics
  const metrics = useMemo(() => {
    const currentGoal = goals[dashboardMonth] || GOAL_VALUE;

    // Filter current month production
    const monthProdEntries = productionData.filter(
      (e) => e && typeof e.date === 'string' && e.date.startsWith(dashboardMonth)
    );

    // Yesterday date string (YYYY-MM-DD)
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toLocaleDateString('sv-SE');

    // Today date string
    const todayStr = new Date().toLocaleDateString('sv-SE');

    let prodMonthTotal = 0; // Excludes Erema
    let eremaMonthTotal = 0;
    let yesterdayProdTotal = 0;
    let todayProdTotal = 0;

    let totalEcoBP = 0;
    let totalEcoBM = 0;
    let totalEcoA = 0;
    let totalBorra = 0;
    let yesterdayEcoB = 0;

    // Operator totals map
    const operatorMap: Record<string, { totalNet: number; count: number; machine: string; entryPenalties: OperatorPenalty[] }> = {};

    // Machine totals map
    const machineMonthMap: Record<string, number> = {
      'Cast 1': 0,
      'Cast 2': 0,
      'Erema': 0,
    };
    const machineYesterdayMap: Record<string, number> = {
      'Cast 1': 0,
      'Cast 2': 0,
      'Erema': 0,
    };

    monthProdEntries.forEach((e) => {
      const net = e.netWeight || 0;
      const isErema = e.machine.toLowerCase().includes('erema');
      const isCast1 = e.machine.toLowerCase().includes('cast 1');
      const isCast2 = e.machine.toLowerCase().includes('cast 2');

      if (isErema) {
        eremaMonthTotal += net;
        machineMonthMap['Erema'] = (machineMonthMap['Erema'] || 0) + net;
      } else {
        prodMonthTotal += net;
        if (isCast1) machineMonthMap['Cast 1'] = (machineMonthMap['Cast 1'] || 0) + net;
        if (isCast2) machineMonthMap['Cast 2'] = (machineMonthMap['Cast 2'] || 0) + net;
      }

      totalEcoBP += e.ecoBP || 0;
      totalEcoBM += e.ecoBM || 0;
      totalEcoA += e.ecoA || 0;
      totalBorra += e.borraTotal || 0;

      // Yesterday
      if (e.date === yesterdayStr) {
        if (!isErema) yesterdayProdTotal += net;
        yesterdayEcoB += (e.ecoBP || 0) + (e.ecoBM || 0);

        if (isErema) machineYesterdayMap['Erema'] += net;
        if (isCast1) machineYesterdayMap['Cast 1'] += net;
        if (isCast2) machineYesterdayMap['Cast 2'] += net;
      }

      // Today
      if (e.date === todayStr) {
        if (!isErema) todayProdTotal += net;
      }

      // Operators ranking
      if (e.operator && e.operator.trim()) {
        const opName = e.operator.trim();
        if (!operatorMap[opName]) {
          operatorMap[opName] = { totalNet: 0, count: 0, machine: e.machine || 'Extrusão', entryPenalties: [] };
        }
        const hasUnperformedCleaning = 
          (e as any).bonusOccurrence?.type === 'parada_limpeza_nao_realizada' ||
          (e as any).bonusOccurrenceType === 'parada_limpeza_nao_realizada' ||
          (e as any).infractionType?.includes('Parada de Limpeza Não Realizada');

        const rankingNet = hasUnperformedCleaning ? net * 0.5 : net;
        operatorMap[opName].totalNet += rankingNet;
        operatorMap[opName].count += 1;

        if (hasUnperformedCleaning) {
          operatorMap[opName].entryPenalties.push({
            id: `clean-pen-${e.id || Math.random()}`,
            operator: opName,
            date: e.date,
            infractionType: '🛑 Parada de Limpeza Não Realizada (-50% Produção do Dia no Ranking)',
            penaltyType: 'deduction_kg' as any,
            deductionValue: 0,
            reason: (e as any).bonusOccurrence?.reason || 'Parada de máquina para limpeza obrigatória não realizada',
            createdAt: e.updatedAt || new Date().toISOString()
          });
        }

        if (e.hasPenalty && !hasUnperformedCleaning) {
          operatorMap[opName].entryPenalties.push({
            id: e.id || `entry-pen-${Math.random()}`,
            operator: opName,
            date: e.date,
            infractionType: e.infractionType || 'Infração de Turno',
            penaltyType: (e.penaltyType || 'deduction_kg') as any,
            deductionValue: e.deductionValue || 0,
            reason: e.penaltyReason || '',
            createdAt: e.updatedAt || new Date().toISOString()
          });
        }
      }
    });

    // Top Operators with Penalties Deductions & Disqualifications
    const operatorRankingList = Object.entries(operatorMap).map(([name, data]) => {
      const opPenaltiesFromEntries = data.entryPenalties || [];
      const opPenaltiesFromStore = (operatorPenalties || []).filter((p) => {
        if (!p || !p.operator) return false;
        const matchName = p.operator.trim().toLowerCase() === name.trim().toLowerCase();
        const matchMonth = p.date ? p.date.startsWith(dashboardMonth) : true;
        return matchName && matchMonth;
      });

      const opPenalties = [...opPenaltiesFromEntries, ...opPenaltiesFromStore];

      let totalKgDeduction = 0;
      let totalPercentDeduction = 0;
      let isDisqualified = false;

      opPenalties.forEach((p) => {
        if (p.penaltyType === 'deduction_kg') {
          totalKgDeduction += Number(p.deductionValue) || 0;
        } else if (p.penaltyType === 'deduction_percent') {
          totalPercentDeduction += Number(p.deductionValue) || 0;
        } else if (p.penaltyType === 'disqualify') {
          isDisqualified = true;
        }
      });

      const rawTotalNet = data.totalNet;
      let adjustedTotalNet = Math.max(0, rawTotalNet - totalKgDeduction);
      if (totalPercentDeduction > 0) {
        adjustedTotalNet = Math.max(0, adjustedTotalNet * (1 - totalPercentDeduction / 100));
      }

      return {
        name,
        rawTotalNet,
        adjustedTotalNet,
        totalNet: isDisqualified ? 0 : adjustedTotalNet,
        count: data.count,
        machine: data.machine,
        penalties: opPenalties,
        totalKgDeduction,
        totalPercentDeduction,
        isDisqualified,
        penaltiesCount: opPenalties.length,
      };
    });

    const topOperators = operatorRankingList.sort((a, b) => {
      if (a.isDisqualified && !b.isDisqualified) return 1;
      if (!a.isDisqualified && b.isDisqualified) return -1;
      return b.adjustedTotalNet - a.adjustedTotalNet;
    });

    const bestOperator = topOperators[0] || {
      name: 'Sem registros',
      totalNet: 0,
      rawTotalNet: 0,
      adjustedTotalNet: 0,
      machine: '-',
      penalties: [],
      totalKgDeduction: 0,
      totalPercentDeduction: 0,
      isDisqualified: false,
      penaltiesCount: 0,
    };

    // Projection & Daily Goal
    const today = new Date();
    const [yNum, mNum] = dashboardMonth.split('-').map(Number);
    const daysInMonth = (yNum && mNum) ? new Date(yNum, mNum, 0).getDate() : 30;
    const currentDayNum = dashboardMonth === today.toISOString().slice(0, 7) ? today.getDate() : daysInMonth;

    const avgDailyProd = prodMonthTotal / Math.max(1, currentDayNum);
    const projectedMonthTotal = avgDailyProd * daysInMonth;

    const daysRemaining = Math.max(1, daysInMonth - currentDayNum);
    const remainingGoal = Math.max(0, currentGoal - prodMonthTotal);
    const dailyGoalRequired = remainingGoal / daysRemaining;
    const dailyTargetGoal = currentGoal / daysInMonth;

    const goalPercent = Math.min(100, (prodMonthTotal / Math.max(1, currentGoal)) * 100);

    // Helper to normalize Ribbon Cutting machine names (Lintech, Ghezzi, Wultec)
    const normalizeRibbonMachine = (raw?: string): 'Lintech' | 'Ghezzi' | 'Wultec' | null => {
      const m = (raw || '').toLowerCase().trim();
      if (!m) return null;
      if (m.includes('lintech') || m.includes('lintec')) return 'Lintech';
      if (m.includes('ghezzi') || m.includes('gehl') || m.includes('ghezze') || m.includes('giese') || m.includes('geze')) return 'Ghezzi';
      if (m.includes('wultec') || m.includes('ultech') || m.includes('ultec') || m.includes('wutec') || m.includes('utec') || m.includes('uteck') || m.includes('otec') || m.includes('oltech')) return 'Wultec';
      return null;
    };

    const getRibbonRolls = (r: RibbonCuttingEntry): number => {
      if (r.rollsCount && r.rollsCount > 0) return r.rollsCount;
      const t12 = (r.rollsTipo1 || 0) + (r.rollsTipo2 || 0);
      if (t12 > 0) return t12;
      if (r.jumboItems && r.jumboItems.length > 0) {
        return r.jumboItems.reduce((acc, it) => acc + (it.rollsCount || (it.rollsTipo1 || 0) + (it.rollsTipo2 || 0) || 0), 0);
      }
      return 0;
    };

    // Ribbon Cutting Metrics (Corte de Fita)
    const monthRibbonEntries = (ribbonEntries || []).filter(
      (r) => r && typeof r.date === 'string' && r.date.startsWith(dashboardMonth)
    );
    const ribbonMonthM2 = monthRibbonEntries.reduce((sum, r) => sum + (r.producedM2 || 0), 0);
    const ribbonYesterdayM2 = monthRibbonEntries
      .filter((r) => r.date === yesterdayStr)
      .reduce((sum, r) => sum + (r.producedM2 || 0), 0);
    const ribbonTodayM2 = monthRibbonEntries
      .filter((r) => r.date === todayStr)
      .reduce((sum, r) => sum + (r.producedM2 || 0), 0);
    const ribbonMonthRejectedM2 = monthRibbonEntries.reduce((sum, r) => sum + (r.rejectedM2 || 0), 0);
    const ribbonMonthWasteKg = monthRibbonEntries.reduce((sum, r) => sum + (r.wasteWeight || 0), 0);
    const ribbonMonthJumboM2 = monthRibbonEntries.reduce((sum, r) => sum + (r.jumboM2 || 0), 0);
    const ribbonMonthRolls = monthRibbonEntries.reduce((sum, r) => sum + getRibbonRolls(r), 0);
    const ribbonRejectPerc = (ribbonMonthM2 + ribbonMonthRejectedM2) > 0
      ? (ribbonMonthRejectedM2 / (ribbonMonthM2 + ribbonMonthRejectedM2)) * 100
      : 0;
    const ribbonAvgDailyM2 = ribbonMonthM2 / Math.max(1, currentDayNum);
    const ribbonProjectedMonthM2 = ribbonAvgDailyM2 * daysInMonth;

    // Per-Machine Ribbon Maps
    const ribbonMachineMonthMap: Record<'Lintech' | 'Ghezzi' | 'Wultec', number> = { Lintech: 0, Ghezzi: 0, Wultec: 0 };
    const ribbonMachineYesterdayMap: Record<'Lintech' | 'Ghezzi' | 'Wultec', number> = { Lintech: 0, Ghezzi: 0, Wultec: 0 };
    const ribbonMachineRejectedMap: Record<'Lintech' | 'Ghezzi' | 'Wultec', number> = { Lintech: 0, Ghezzi: 0, Wultec: 0 };
    const ribbonMachineRollsMap: Record<'Lintech' | 'Ghezzi' | 'Wultec', number> = { Lintech: 0, Ghezzi: 0, Wultec: 0 };
    const ribbonMachineWasteMap: Record<'Lintech' | 'Ghezzi' | 'Wultec', number> = { Lintech: 0, Ghezzi: 0, Wultec: 0 };

    let ribbonManutencaoMin = 0;
    let ribbonProcessoMin = 0;
    let ribbonOutrosMin = 0;

    // Ribbon Operator Ranking Map
    const ribbonOperatorMap: Record<string, { totalM2: number; rejectedM2: number; rolls: number; count: number; machine: string }> = {};

    // Ribbon Daily Chart Map
    const ribbonDailyMap: Record<string, { day: string; date: string; lintech: number; ghezzi: number; wultec: number; outros: number; totalM2: number; rejectedM2: number }> = {};
    for (let d = 1; d <= currentDayNum; d++) {
      const dayStr = `${dashboardMonth}-${String(d).padStart(2, '0')}`;
      ribbonDailyMap[dayStr] = {
        day: `${String(d).padStart(2, '0')}/${dashboardMonth.slice(5, 7)}`,
        date: dayStr,
        lintech: 0,
        ghezzi: 0,
        wultec: 0,
        outros: 0,
        totalM2: 0,
        rejectedM2: 0,
      };
    }

    monthRibbonEntries.forEach((r) => {
      const normM = normalizeRibbonMachine(r.machine);
      const prod = r.producedM2 || 0;
      const rej = r.rejectedM2 || 0;
      const waste = r.wasteWeight || 0;
      const rolls = getRibbonRolls(r);

      if (normM) {
        ribbonMachineMonthMap[normM] += prod;
        ribbonMachineRejectedMap[normM] += rej;
        ribbonMachineRollsMap[normM] += rolls;
        ribbonMachineWasteMap[normM] += waste;
        if (r.date === yesterdayStr) {
          ribbonMachineYesterdayMap[normM] += prod;
        }
      }

      if (ribbonDailyMap[r.date]) {
        ribbonDailyMap[r.date].totalM2 += prod;
        ribbonDailyMap[r.date].rejectedM2 += rej;
        if (normM === 'Lintech') ribbonDailyMap[r.date].lintech += prod;
        else if (normM === 'Ghezzi') ribbonDailyMap[r.date].ghezzi += prod;
        else if (normM === 'Wultec') ribbonDailyMap[r.date].wultec += prod;
        else ribbonDailyMap[r.date].outros += prod;
      }

      const mMin = r.manutencaoMin || 0;
      const pMin = r.processoMin || 0;
      const oMin = r.outrosMin || (mMin === 0 && pMin === 0 && r.stoppedMinutes ? r.stoppedMinutes : 0);
      ribbonManutencaoMin += mMin;
      ribbonProcessoMin += pMin;
      ribbonOutrosMin += oMin;

      if (r.operator && r.operator.trim() && prod > 0) {
        const opName = r.operator.trim();
        if (!ribbonOperatorMap[opName]) {
          ribbonOperatorMap[opName] = { totalM2: 0, rejectedM2: 0, rolls: 0, count: 0, machine: normM || r.machine || 'Corte de Fita' };
        }
        ribbonOperatorMap[opName].totalM2 += prod;
        ribbonOperatorMap[opName].rejectedM2 += rej;
        ribbonOperatorMap[opName].rolls += rolls;
        ribbonOperatorMap[opName].count += 1;
        if (normM) ribbonOperatorMap[opName].machine = normM;
      }
    });

    const ribbonTotalParadasMin = ribbonManutencaoMin + ribbonProcessoMin + ribbonOutrosMin;
    const ribbonTotalParadasHoras = (ribbonTotalParadasMin / 60).toFixed(1);
    const ribbonDailyChartData = Object.values(ribbonDailyMap);

    const topRibbonOperators = Object.entries(ribbonOperatorMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.totalM2 - a.totalM2);

    const bestRibbonOperator = topRibbonOperators[0] || {
      name: 'Sem registros',
      totalM2: 0,
      rejectedM2: 0,
      rolls: 0,
      count: 0,
      machine: 'Corte de Fita',
    };

    // Previous Month Calculation YYYY-MM
    const [yearStr, monthStr] = dashboardMonth.split('-');
    let prevYear = parseInt(yearStr, 10);
    let prevMonth = parseInt(monthStr, 10) - 1;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    const prevMonthDate = new Date(prevYear, prevMonth - 1, 1);
    const prevMonthName = prevMonthDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

    // Filter Previous Month Production
    const prevMonthProdEntries = productionData.filter(
      (e) => e && typeof e.date === 'string' && e.date.startsWith(prevMonthStr)
    );

    let prevMonthProdTotal = 0; // Excludes Erema
    let prevMonthEremaTotal = 0;
    let prevMonthEcoB = 0;
    const prevMachineMap: Record<string, number> = {
      'Cast 1': 0,
      'Cast 2': 0,
      'Erema': 0,
    };

    prevMonthProdEntries.forEach((e) => {
      const net = e.netWeight || 0;
      const isErema = e.machine.toLowerCase().includes('erema');
      const isCast1 = e.machine.toLowerCase().includes('cast 1');
      const isCast2 = e.machine.toLowerCase().includes('cast 2');

      if (isErema) {
        prevMonthEremaTotal += net;
        prevMachineMap['Erema'] += net;
      } else {
        prevMonthProdTotal += net;
        if (isCast1) prevMachineMap['Cast 1'] += net;
        if (isCast2) prevMachineMap['Cast 2'] += net;
      }
      prevMonthEcoB += (e.ecoBP || 0) + (e.ecoBM || 0);
    });

    const prevMonthRibbonEntries = (ribbonEntries || []).filter(
      (r) => r && typeof r.date === 'string' && r.date.startsWith(prevMonthStr)
    );
    const prevMonthRibbonM2 = prevMonthRibbonEntries.reduce((sum, r) => sum + (r.producedM2 || 0), 0);
    const prevRibbonMachineMap: Record<'Lintech' | 'Ghezzi' | 'Wultec', number> = { Lintech: 0, Ghezzi: 0, Wultec: 0 };
    prevMonthRibbonEntries.forEach((r) => {
      const normM = normalizeRibbonMachine(r.machine);
      if (normM) prevRibbonMachineMap[normM] += (r.producedM2 || 0);
    });

    // Variation calculations vs Previous Month
    const calcVar = (curr: number, prev: number) => {
      if (!prev || prev <= 0) return null;
      return ((curr - prev) / prev) * 100;
    };

    const prodVar = calcVar(prodMonthTotal, prevMonthProdTotal);
    const projVar = calcVar(projectedMonthTotal, prevMonthProdTotal);
    const cast1Var = calcVar(machineMonthMap['Cast 1'] || 0, prevMachineMap['Cast 1'] || 0);
    const cast2Var = calcVar(machineMonthMap['Cast 2'] || 0, prevMachineMap['Cast 2'] || 0);
    const eremaVar = calcVar(eremaMonthTotal, prevMachineMap['Erema'] || 0);
    const ribbonVar = calcVar(ribbonMonthM2, prevMonthRibbonM2);
    const lintechVar = calcVar(ribbonMachineMonthMap.Lintech, prevRibbonMachineMap.Lintech);
    const ghezziVar = calcVar(ribbonMachineMonthMap.Ghezzi, prevRibbonMachineMap.Ghezzi);
    const wultecVar = calcVar(ribbonMachineMonthMap.Wultec, prevRibbonMachineMap.Wultec);
    const ecoBVar = calcVar(totalEcoBP + totalEcoBM, prevMonthEcoB);

    // Chart daily progression
    const dailyMap: Record<string, { day: string; producao: number; meta: number; cast1: number; cast2: number }> = {};
    for (let d = 1; d <= currentDayNum; d++) {
      const dayStr = `${dashboardMonth}-${String(d).padStart(2, '0')}`;
      dailyMap[dayStr] = {
        day: `${String(d).padStart(2, '0')}/${dashboardMonth.slice(5, 7)}`,
        producao: 0,
        meta: Math.round(dailyTargetGoal),
        cast1: 0,
        cast2: 0,
      };
    }

    monthProdEntries.forEach((e) => {
      if (dailyMap[e.date] && !e.machine.toLowerCase().includes('erema')) {
        const net = e.netWeight || 0;
        dailyMap[e.date].producao += net;
        if (e.machine.toLowerCase().includes('cast 1')) {
          dailyMap[e.date].cast1 += net;
        } else if (e.machine.toLowerCase().includes('cast 2')) {
          dailyMap[e.date].cast2 += net;
        }
      }
    });

    const dailyChartData = Object.values(dailyMap);

    // Shift breakdown
    const shiftMap: Record<string, { cast1: number; cast2: number; erema: number; total: number }> = {
      Diurno: { cast1: 0, cast2: 0, erema: 0, total: 0 },
      Noturno: { cast1: 0, cast2: 0, erema: 0, total: 0 },
    };

    monthProdEntries.forEach((e) => {
      const s = (e.shift || '').toLowerCase();
      const shiftKey = (s.includes('noturno') || s.includes('noite') || s.includes('n1') || s.includes('n2'))
        ? 'Noturno'
        : 'Diurno';

      const net = e.netWeight || 0;
      shiftMap[shiftKey].total += net;

      if (e.machine.toLowerCase().includes('cast 1')) shiftMap[shiftKey].cast1 += net;
      else if (e.machine.toLowerCase().includes('cast 2')) shiftMap[shiftKey].cast2 += net;
      else if (e.machine.toLowerCase().includes('erema')) shiftMap[shiftKey].erema += net;
    });

    // Machine comparison datasets for Recharts
    const daysInCurrentMonth = Math.max(1, currentDayNum);
    const daysInPrevMonth = new Date(prevYear, prevMonth, 0).getDate() || 30;

    const c1Curr = machineMonthMap['Cast 1'] || 0;
    const c1Prev = prevMachineMap['Cast 1'] || 0;
    const c1Yest = machineYesterdayMap['Cast 1'] || 0;
    const c1DailyAvg = Math.round(c1Curr / daysInCurrentMonth);
    const c1PrevDailyAvg = Math.round(c1Prev / daysInPrevMonth);

    const c2Curr = machineMonthMap['Cast 2'] || 0;
    const c2Prev = prevMachineMap['Cast 2'] || 0;
    const c2Yest = machineYesterdayMap['Cast 2'] || 0;
    const c2DailyAvg = Math.round(c2Curr / daysInCurrentMonth);
    const c2PrevDailyAvg = Math.round(c2Prev / daysInPrevMonth);

    const erCurr = eremaMonthTotal;
    const erPrev = prevMachineMap['Erema'] || 0;
    const erYest = machineYesterdayMap['Erema'] || 0;
    const erDailyAvg = Math.round(erCurr / daysInCurrentMonth);
    const erPrevDailyAvg = Math.round(erPrev / daysInPrevMonth);

    const machineDailyComparisonData = [
      {
        name: 'Cast 1',
        'Ontem (Dia)': c1Yest,
        'Média Diária Mês': c1DailyAvg,
        'Média Mês Anterior': c1PrevDailyAvg,
      },
      {
        name: 'Cast 2',
        'Ontem (Dia)': c2Yest,
        'Média Diária Mês': c2DailyAvg,
        'Média Mês Anterior': c2PrevDailyAvg,
      },
      {
        name: 'Erema',
        'Ontem (Dia)': erYest,
        'Média Diária Mês': erDailyAvg,
        'Média Mês Anterior': erPrevDailyAvg,
      },
    ];

    const machineMonthlyComparisonData = [
      {
        name: 'Cast 1',
        'Acumulado Mês': c1Curr,
        'Mês Anterior': c1Prev,
      },
      {
        name: 'Cast 2',
        'Acumulado Mês': c2Curr,
        'Mês Anterior': c2Prev,
      },
      {
        name: 'Erema',
        'Acumulado Mês': erCurr,
        'Mês Anterior': erPrev,
      },
    ];

    // Loss / Scrap distribution
    const scrapDistributionData = [
      { name: 'Eco B (Produção)', value: totalEcoBP, color: '#f59e0b' },
      { name: 'Eco B (Manutenção)', value: totalEcoBM, color: '#ea580c' },
      { name: 'Eco A', value: totalEcoA, color: '#10b981' },
      { name: 'Borra', value: totalBorra, color: '#ef4444' },
    ].filter((item) => item.value > 0);

    // --- 1. Monthly Timeline Data (MoM / YoY / Filtered Time Trend) ---
    const monthlyDict: Record<string, {
      monthStr: string;
      label: string;
      fullLabel: string;
      producao: number;
      ecoA: number;
      ecoB: number;
      borra: number;
      perdaTotal: number;
      manutencao: number;
      processo: number;
      outros: number;
      paradasTotal: number;
      tubetesEcoB: number;
    }> = {};

    productionData.forEach((e) => {
      if (!e || !e.date || typeof e.date !== 'string') return;
      const m = e.date.substring(0, 7);
      const yr = parseInt(m.split('-')[0], 10);
      if (isNaN(yr) || yr < 2026) return;

      if (!monthlyDict[m]) {
        const parts = m.split('-');
        const label = `${parts[1]}/${parts[0]}`;
        const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
        const fullLabel = dateObj.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

        monthlyDict[m] = {
          monthStr: m,
          label,
          fullLabel,
          producao: 0,
          ecoA: 0,
          ecoB: 0,
          borra: 0,
          perdaTotal: 0,
          manutencao: 0,
          processo: 0,
          outros: 0,
          paradasTotal: 0,
          tubetesEcoB: 0,
        };
      }

      const isErema = e.machine && e.machine.toLowerCase().includes('erema');
      const net = e.netWeight || 0;
      if (!isErema) {
        monthlyDict[m].producao += net;
      }

      const ecoBVal = (e.ecoBP || 0) + (e.ecoBM || 0);
      const borraVal = e.borraTotal || 0;
      const ecoAVal = e.ecoA || 0;
      const tubetesVal = e.tubetesEcoB || (e.materials ? e.materials.reduce((acc: number, mat: any) => acc + (mat.tubetesEcoB || 0), 0) : 0);

      monthlyDict[m].ecoA += ecoAVal;
      monthlyDict[m].ecoB += ecoBVal;
      monthlyDict[m].borra += borraVal;
      monthlyDict[m].perdaTotal += (ecoBVal + borraVal);

      monthlyDict[m].manutencao += (e.manutencaoMin || 0);
      monthlyDict[m].processo += (e.processoMin || 0);
      monthlyDict[m].outros += (e.outrosMin || 0);
      monthlyDict[m].paradasTotal += ((e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0));
      monthlyDict[m].tubetesEcoB += tubetesVal;
    });

    const sortedMonthKeys = Object.keys(monthlyDict).sort();
    const monthlyTimelineData = sortedMonthKeys.map((m, idx) => {
      const item = monthlyDict[m];
      const grossTotal = item.producao + item.perdaTotal;
      const perdaPerc = grossTotal > 0 ? (item.perdaTotal / grossTotal) * 100 : 0;
      const ecoAPerc = item.producao > 0 ? (item.ecoA / item.producao) * 100 : 0;
      const ratioEcoBTubetes = item.tubetesEcoB > 0 ? item.ecoB / item.tubetesEcoB : 0;

      // Calculate MoM growth vs previous index month
      let momProdVar: number | null = null;
      let momPerdaVar: number | null = null;
      if (idx > 0) {
        const prevKey = sortedMonthKeys[idx - 1];
        const prevItem = monthlyDict[prevKey];
        if (prevItem.producao > 0) {
          momProdVar = ((item.producao - prevItem.producao) / prevItem.producao) * 100;
        }
        const prevGross = prevItem.producao + prevItem.perdaTotal;
        const prevPerdaPerc = prevGross > 0 ? (prevItem.perdaTotal / prevGross) * 100 : 0;
        momPerdaVar = perdaPerc - prevPerdaPerc;
      }

      return {
        ...item,
        producao: Math.round(item.producao),
        perdaTotal: Math.round(item.perdaTotal),
        perdaPerc: parseFloat(perdaPerc.toFixed(2)),
        ecoAPerc: parseFloat(ecoAPerc.toFixed(2)),
        ratioEcoBTubetes: parseFloat(ratioEcoBTubetes.toFixed(2)),
        rendimentoPerc: grossTotal > 0 ? parseFloat(((item.producao / grossTotal) * 100).toFixed(2)) : 100,
        momProdVar: momProdVar !== null ? parseFloat(momProdVar.toFixed(1)) : null,
        momPerdaVar: momPerdaVar !== null ? parseFloat(momPerdaVar.toFixed(2)) : null,
      };
    });

    // Stoppage / Indisponibilidade totals
    let totalManutencaoMin = 0;
    let totalProcessoMin = 0;
    let totalOutrosMin = 0;
    monthProdEntries.forEach((e) => {
      totalManutencaoMin += (e.manutencaoMin || 0);
      totalProcessoMin += (e.processoMin || 0);
      totalOutrosMin += (e.outrosMin || 0);
    });
    const totalParadasMin = totalManutencaoMin + totalProcessoMin + totalOutrosMin;
    const totalParadasHoras = (totalParadasMin / 60).toFixed(1);

    // --- 2. Daily Eco B vs Tubetes Eco B Correlation Data ---
    const dailyEcoBTubetesDict: Record<string, {
      date: string;
      dateBR: string;
      day: string;
      ecoB: number;
      tubetesEcoB: number;
      cast1EcoB: number;
      cast2EcoB: number;
      cast1Tubetes: number;
      cast2Tubetes: number;
    }> = {};

    monthProdEntries.forEach((e) => {
      const d = e.date;
      if (!d) return;
      const ecoBVal = (e.ecoBP || 0) + (e.ecoBM || 0);
      const tubetesVal = e.tubetesEcoB || (e.materials ? e.materials.reduce((acc: number, mat: any) => acc + (mat.tubetesEcoB || 0), 0) : 0);
      const isCast1 = e.machine && e.machine.toLowerCase().includes('cast 1');
      const isCast2 = e.machine && e.machine.toLowerCase().includes('cast 2');

      if (!dailyEcoBTubetesDict[d]) {
        const parts = d.split('-');
        const dateBR = `${parts[2]}/${parts[1]}`;
        dailyEcoBTubetesDict[d] = {
          date: d,
          dateBR,
          day: parts[2],
          ecoB: 0,
          tubetesEcoB: 0,
          cast1EcoB: 0,
          cast2EcoB: 0,
          cast1Tubetes: 0,
          cast2Tubetes: 0,
        };
      }

      dailyEcoBTubetesDict[d].ecoB += ecoBVal;
      dailyEcoBTubetesDict[d].tubetesEcoB += tubetesVal;

      if (isCast1) {
        dailyEcoBTubetesDict[d].cast1EcoB += ecoBVal;
        dailyEcoBTubetesDict[d].cast1Tubetes += tubetesVal;
      } else if (isCast2) {
        dailyEcoBTubetesDict[d].cast2EcoB += ecoBVal;
        dailyEcoBTubetesDict[d].cast2Tubetes += tubetesVal;
      }
    });

    const dailyEcoBTubetesData = Object.values(dailyEcoBTubetesDict)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => ({
        ...item,
        ratio: item.tubetesEcoB > 0 ? parseFloat((item.ecoB / item.tubetesEcoB).toFixed(2)) : 0,
      }));

    let totalTubetesMonth = 0;
    monthProdEntries.forEach((e) => {
      totalTubetesMonth += e.tubetesEcoB || (e.materials ? e.materials.reduce((acc: number, mat: any) => acc + (mat.tubetesEcoB || 0), 0) : 0);
    });
    const overallRatioMonth = totalTubetesMonth > 0 ? (totalEcoBP + totalEcoBM) / totalTubetesMonth : 0;

    // --- 3. Daily Loss Evolution vs Net Production Data ---
    const dailyLossProdDict: Record<string, {
      date: string;
      dateBR: string;
      day: string;
      producao: number;
      perdaEcoB: number;
      perdaBorra: number;
      perdaTotal: number;
    }> = {};

    monthProdEntries.forEach((e) => {
      const d = e.date;
      if (!d) return;
      const isErema = e.machine && e.machine.toLowerCase().includes('erema');
      const net = !isErema ? (e.netWeight || 0) : 0;
      const ecoBVal = (e.ecoBP || 0) + (e.ecoBM || 0);
      const borraVal = e.borraTotal || 0;

      if (!dailyLossProdDict[d]) {
        const parts = d.split('-');
        const dateBR = `${parts[2]}/${parts[1]}`;
        dailyLossProdDict[d] = {
          date: d,
          dateBR,
          day: parts[2],
          producao: 0,
          perdaEcoB: 0,
          perdaBorra: 0,
          perdaTotal: 0,
        };
      }

      dailyLossProdDict[d].producao += net;
      dailyLossProdDict[d].perdaEcoB += ecoBVal;
      dailyLossProdDict[d].perdaBorra += borraVal;
      dailyLossProdDict[d].perdaTotal += (ecoBVal + borraVal);
    });

    const dailyLossProdData = Object.values(dailyLossProdDict)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((item) => {
        const gross = item.producao + item.perdaTotal;
        const perdaPerc = gross > 0 ? (item.perdaTotal / gross) * 100 : 0;
        return {
          ...item,
          perdaPerc: parseFloat(perdaPerc.toFixed(2)),
          rendimentoPerc: parseFloat((100 - perdaPerc).toFixed(2)),
        };
      });

    const totalGrossMonth = prodMonthTotal + totalEcoBP + totalEcoBM + totalBorra;
    const overallLossPercMonth = totalGrossMonth > 0 ? ((totalEcoBP + totalEcoBM + totalBorra) / totalGrossMonth) * 100 : 0;
    const overallYieldPercMonth = 100 - overallLossPercMonth;

    // --- 4. Metas Oficiais do Sistema por Setor & Máquina ---
    const remainingDays = Math.max(1, daysInCurrentMonth - currentDayNum);

    // Extrusão: Meta global + divisão proporcional por capacidade nominal (Cast 1: 1.200 kg/h | Cast 2: 1.400 kg/h)
    const extrusionWasteLimitVal = (extrusionWasteLimits && extrusionWasteLimits[dashboardMonth] !== undefined)
      ? extrusionWasteLimits[dashboardMonth]
      : (extrusionWasteLimit || 8.0);
    const cast1ShareGoal = Math.round(currentGoal * (1200 / 2600));
    const cast2ShareGoal = Math.max(0, currentGoal - cast1ShareGoal);
    const cast1MonthVal = machineMonthMap['Cast 1'] || 0;
    const cast2MonthVal = machineMonthMap['Cast 2'] || 0;
    const cast1ShareGoalPct = cast1ShareGoal > 0 ? (cast1MonthVal / cast1ShareGoal) * 100 : 0;
    const cast2ShareGoalPct = cast2ShareGoal > 0 ? (cast2MonthVal / cast2ShareGoal) * 100 : 0;
    const cast1Remaining = Math.max(0, cast1ShareGoal - cast1MonthVal);
    const cast2Remaining = Math.max(0, cast2ShareGoal - cast2MonthVal);
    const cast1DailyReq = cast1Remaining / remainingDays;
    const cast2DailyReq = cast2Remaining / remainingDays;

    // Reciclagem (Erema): Meta mensal configurada no sistema + meta padrão turno 12h
    const eremaMonthGoal = (eremaGoals && eremaGoals[dashboardMonth] !== undefined && eremaGoals[dashboardMonth] > 0)
      ? eremaGoals[dashboardMonth]
      : 70000;
    const eremaStandardGoal12h = getEremaStandardGoal();
    const eremaGoalPercent = eremaMonthGoal > 0 ? (eremaMonthTotal / eremaMonthGoal) * 100 : 0;
    const eremaRemaining = Math.max(0, eremaMonthGoal - eremaMonthTotal);
    const eremaDailyRequired = eremaRemaining / remainingDays;
    const eremaProjectedTotal = currentDayNum > 0 ? (eremaMonthTotal / currentDayNum) * daysInCurrentMonth : eremaMonthTotal;

    // Corte de Fita: Meta global + Metas individuais oficiais (Lintech, Ghezzi, Wultec)
    const ribbonTotalGoal = getRibbonTotalGoal(ribbonGoals, dashboardMonth);
    const ribbonGoalPercent = ribbonTotalGoal > 0 ? (ribbonMonthM2 / ribbonTotalGoal) * 100 : 0;
    const ribbonRemainingM2 = Math.max(0, ribbonTotalGoal - ribbonMonthM2);
    const ribbonDailyRequiredM2 = ribbonRemainingM2 / remainingDays;

    const ribbonMachineGoalMap: Record<'Lintech' | 'Ghezzi' | 'Wultec', number> = {
      Lintech: getRibbonMachineGoal(ribbonGoals, dashboardMonth, 'lintech'),
      Ghezzi: getRibbonMachineGoal(ribbonGoals, dashboardMonth, 'ghezzi'),
      Wultec: getRibbonMachineGoal(ribbonGoals, dashboardMonth, 'wultec'),
    };
    const ribbonMachineGoalPercentMap: Record<'Lintech' | 'Ghezzi' | 'Wultec', number> = {
      Lintech: ribbonMachineGoalMap.Lintech > 0 ? ((ribbonMachineMonthMap.Lintech || 0) / ribbonMachineGoalMap.Lintech) * 100 : 0,
      Ghezzi: ribbonMachineGoalMap.Ghezzi > 0 ? ((ribbonMachineMonthMap.Ghezzi || 0) / ribbonMachineGoalMap.Ghezzi) * 100 : 0,
      Wultec: ribbonMachineGoalMap.Wultec > 0 ? ((ribbonMachineMonthMap.Wultec || 0) / ribbonMachineGoalMap.Wultec) * 100 : 0,
    };
    const ribbonMachineRemainingMap: Record<'Lintech' | 'Ghezzi' | 'Wultec', number> = {
      Lintech: Math.max(0, ribbonMachineGoalMap.Lintech - (ribbonMachineMonthMap.Lintech || 0)),
      Ghezzi: Math.max(0, ribbonMachineGoalMap.Ghezzi - (ribbonMachineMonthMap.Ghezzi || 0)),
      Wultec: Math.max(0, ribbonMachineGoalMap.Wultec - (ribbonMachineMonthMap.Wultec || 0)),
    };
    const ribbonMachineDailyReqMap: Record<'Lintech' | 'Ghezzi' | 'Wultec', number> = {
      Lintech: ribbonMachineRemainingMap.Lintech / remainingDays,
      Ghezzi: ribbonMachineRemainingMap.Ghezzi / remainingDays,
      Wultec: ribbonMachineRemainingMap.Wultec / remainingDays,
    };

    return {
      currentGoal,
      prodMonthTotal,
      eremaMonthTotal,
      yesterdayProdTotal,
      todayProdTotal,
      totalEcoB: totalEcoBP + totalEcoBM,
      totalEcoBP,
      totalEcoBM,
      totalEcoA,
      totalBorra,
      yesterdayEcoB,
      bestOperator,
      topOperators,
      projectedMonthTotal,
      dailyGoalRequired,
      dailyTargetGoal,
      goalPercent,
      remainingDays,
      extrusionWasteLimitVal,
      cast1ShareGoal,
      cast2ShareGoal,
      cast1ShareGoalPct,
      cast2ShareGoalPct,
      cast1Remaining,
      cast2Remaining,
      cast1DailyReq,
      cast2DailyReq,
      eremaMonthGoal,
      eremaStandardGoal12h,
      eremaGoalPercent,
      eremaRemaining,
      eremaDailyRequired,
      eremaProjectedTotal,
      ribbonTotalGoal,
      ribbonGoalPercent,
      ribbonRemainingM2,
      ribbonDailyRequiredM2,
      ribbonMachineGoalMap,
      ribbonMachineGoalPercentMap,
      ribbonMachineRemainingMap,
      ribbonMachineDailyReqMap,
      ribbonMonthM2,
      ribbonYesterdayM2,
      ribbonTodayM2,
      ribbonMonthRejectedM2,
      ribbonMonthWasteKg,
      ribbonMonthJumboM2,
      ribbonMonthRolls,
      ribbonRejectPerc,
      ribbonAvgDailyM2,
      ribbonProjectedMonthM2,
      ribbonMachineMonthMap,
      ribbonMachineYesterdayMap,
      ribbonMachineRejectedMap,
      ribbonMachineRollsMap,
      ribbonMachineWasteMap,
      prevRibbonMachineMap,
      lintechVar,
      ghezziVar,
      wultecVar,
      ribbonManutencaoMin,
      ribbonProcessoMin,
      ribbonOutrosMin,
      ribbonTotalParadasMin,
      ribbonTotalParadasHoras,
      ribbonDailyChartData,
      topRibbonOperators,
      bestRibbonOperator,
      machineMonthMap,
      machineYesterdayMap,
      dailyChartData,
      shiftMap,
      machineDailyComparisonData,
      machineMonthlyComparisonData,
      daysInCurrentMonth,
      daysInPrevMonth,
      c1DailyAvg,
      c2DailyAvg,
      erDailyAvg,
      c1PrevDailyAvg,
      c2PrevDailyAvg,
      erPrevDailyAvg,
      scrapDistributionData,
      currentDayNum,
      // Previous month additions
      prevMonthStr,
      prevMonthName,
      prevMonthProdTotal,
      prevMonthEremaTotal,
      prevMachineMap,
      prevMonthRibbonM2,
      prevMonthEcoB,
      prodVar,
      projVar,
      cast1Var,
      cast2Var,
      eremaVar,
      ribbonVar,
      ecoBVar,
      // New chart additions
      monthlyTimelineData,
      dailyEcoBTubetesData,
      totalTubetesMonth,
      overallRatioMonth,
      dailyLossProdData,
      overallLossPercMonth,
      overallYieldPercMonth,
      totalManutencaoMin,
      totalProcessoMin,
      totalOutrosMin,
      totalParadasMin,
      totalParadasHoras,
    };
  }, [productionData, ribbonEntries, goals, eremaGoals, ribbonGoals, extrusionWasteLimit, extrusionWasteLimits, dashboardMonth]);

  // Disponibilidade por Máquina (%) — Visão Geral da Planta (mesma fórmula do painel de Manutenção)
  const plantAvailability = useMemo(
    () => computePlantAvailability(productionData, ribbonEntries, dashboardMonth, availableShifts),
    [productionData, ribbonEntries, dashboardMonth, availableShifts]
  );

  // Auto-scroll monthly timeline list on Slide 4 proportional to slow reading speed
  useEffect(() => {
    if (currentSlide !== 4 && viewMode !== 'grid') return;

    let animId: number;
    let startTime: number | null = null;

    const step = (timestamp: number) => {
      const container = historyScrollRef.current;
      if (container) {
        if (!startTime) {
          startTime = timestamp;
          container.scrollTop = 0;
        }
        const maxScroll = container.scrollHeight - container.clientHeight;

        if (maxScroll > 0) {
          const pixelsPerSecond = 16; // Slower, comfortable reading speed
          const elapsedSec = (timestamp - startTime) / 1000;
          container.scrollTop = (elapsedSec * pixelsPerSecond) % maxScroll;
        }
      }

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [currentSlide, slideDuration, viewMode, metrics.monthlyTimelineData]);

  const slideTitles = [
    'Visão Geral & Indicadores',
    'Metas por Máquina',
    'Disponibilidade da Planta (%)',
    'Setor Corte de Fita',
    'Tendência Evolutiva (MoM/YoY)',
    'Histórico de parada de máquina',
    'Eco B vs Tubetes Eco B',
    'Ranking de Operadores',
    'Avisos de RH',
    'Avisos de Segurança (SST)',
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-[#EBF3F7] text-[#062B3D] flex flex-col font-sans overflow-hidden select-none">
      {/* Faixa Superior Institucional: Mistura Azul da Logo + Verde-Lima Claro */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#005A7D] via-[#0086B3] to-[#A8D419] shrink-0 z-20" />

      {/* Top Bar: TV Mode Header OR System Tab Header */}
      {effectiveTvMode ? (
        /* Modo Gestão Visual TV Limpo (Para Smart TVs / Telões Industriais) */
        <header className="relative bg-gradient-to-r from-[#003E58] via-[#005A7D] to-[#007399] border-b-[3px] border-[#A8D419] px-3 md:px-6 py-2 md:py-2.5 flex items-center justify-between shrink-0 shadow-md z-10 transition-all gap-2 max-w-full overflow-hidden">
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-48 opacity-15 bg-[repeating-linear-gradient(-45deg,#A8D419_0px,#A8D419_6px,transparent_6px,transparent_14px)]" />

          <div className="flex items-center gap-2.5 md:gap-4 min-w-0 relative z-10">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center text-[#005A7D] shadow-md border-2 border-[#A8D419] shrink-0 overflow-hidden">
              {systemLogo ? (
                <img src={systemLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Tv className="w-5 h-5 md:w-7 md:h-7 text-[#005A7D]" />
              )}
            </div>
            <div className="min-w-0 border-l-2 border-[#A8D419] pl-3">
              <div className="flex items-center gap-2 md:gap-3">
                <h1 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-black text-white tracking-tight uppercase truncate leading-none">
                  {systemName} <span className="text-[#C5F028] font-black">| GESTÃO VISUAL</span>
                </h1>
                {isScreensaver ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] md:text-xs font-black uppercase tracking-widest bg-[#A8D419] text-[#00334A] shrink-0">
                    PROTETOR DE TELA
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] md:text-xs font-black uppercase tracking-widest bg-[#003247] text-[#C5F028] border border-[#A8D419]/60 shrink-0">
                    <span className="w-2 h-2 rounded-full bg-[#C5F028]"></span> AO VIVO
                  </span>
                )}
              </div>
              <p className="hidden md:block text-[11px] md:text-xs font-bold text-[#CBE7F2] tracking-[0.16em] uppercase truncate mt-0.5">
                PAINEL INDUSTRIAL AUTOMÁTICO · EXTRUSÃO, RECICLAGEM &amp; CORTE DE FITA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3.5 shrink-0 relative z-10">
            <div className="text-right bg-[#003247] px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl border-2 border-[#A8D419]/80 shadow-inner shrink-0">
              <div className="text-xs sm:text-lg md:text-2xl font-mono tabular-nums font-black text-[#C5F028] tracking-wider flex items-center gap-1.5 leading-none">
                <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-[#A8D419] shrink-0" />
                {currentTime.toLocaleTimeString('pt-BR')}
              </div>
              <div className="hidden sm:block text-[10px] md:text-[11px] font-bold text-[#CBE7F2] uppercase tracking-widest mt-0.5">
                {currentTime.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
              </div>
            </div>

            {!isStandaloneTv && (
              <div className="flex items-center gap-1 sm:gap-1.5 bg-[#003247] p-1 sm:p-1.5 rounded-xl border border-white/15">
                <button
                  onClick={() => setIsAutoPlay(!isAutoPlay)}
                  className={`p-2 sm:p-2.5 rounded-lg transition-all cursor-pointer ${
                    isAutoPlay ? 'bg-[#A8D419] text-[#00334A] font-black' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title={isAutoPlay ? 'Pausar Rotação' : 'Iniciar Rotação Automática'}
                >
                  {isAutoPlay ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="p-2 sm:p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all cursor-pointer"
                  title="Alternar Tela Cheia (Pressione ESC para sair)"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 sm:p-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all cursor-pointer"
                  title="Sair da Gestão Visual"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            )}
          </div>
        </header>
      ) : (
        /* Modo Tela de Gestão Visual no Sistema */
        <>
          <header className="relative bg-gradient-to-r from-[#003E58] via-[#005A7D] to-[#007399] border-b-[3px] border-[#A8D419] px-3 md:px-6 py-2 sm:py-2.5 flex items-center justify-between shrink-0 shadow-md z-10 transition-all gap-2 max-w-full overflow-hidden">
            <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-40 opacity-12 bg-[repeating-linear-gradient(-45deg,#A8D419_0px,#A8D419_6px,transparent_6px,transparent_14px)]" />

            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 relative z-10">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-xl flex items-center justify-center text-[#005A7D] shadow-md border-2 border-[#A8D419] shrink-0 overflow-hidden">
                {systemLogo ? (
                  <img src={systemLogo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Tv className="w-5 h-5 sm:w-6 sm:h-6 text-[#005A7D]" />
                )}
              </div>
              <div className="min-w-0 border-l-2 border-[#A8D419] pl-2.5 sm:pl-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-lg md:text-xl font-black text-white tracking-tight uppercase truncate leading-none">
                    {systemName} <span className="text-[#C5F028] font-black">| GESTÃO VISUAL</span>
                  </h1>
                  <span className="hidden md:inline-block text-[10px] font-black uppercase tracking-[0.16em] text-[#C5F028]/90">
                    · EXTRUSÃO &amp; CORTE DE FITA
                  </span>
                </div>
                <p className="hidden sm:block text-[10px] md:text-[11px] font-bold text-[#CBE7F2] tracking-[0.14em] uppercase truncate mt-0.5">
                  GESTÃO DE PRODUÇÃO, METAS, PARADAS E COMUNICADOS
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 relative z-10">
              <div className="text-right bg-[#003247] px-2.5 sm:px-3 py-1 rounded-lg border border-[#A8D419]/70 shrink-0">
                <div className="text-xs sm:text-base font-mono tabular-nums font-black text-[#C5F028] tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#A8D419] shrink-0 hidden sm:inline" />
                  {currentTime.toLocaleTimeString('pt-BR')}
                </div>
              </div>

              <div className="flex items-center gap-1 bg-[#003247] p-1 rounded-lg border border-white/15 shrink-0">
                <button
                  onClick={() => setIsAutoPlay(!isAutoPlay)}
                  className={`p-1.5 sm:p-2 rounded-md transition-all cursor-pointer ${
                    isAutoPlay ? 'bg-[#A8D419] text-[#00334A]' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title={isAutoPlay ? 'Pausar rotação' : 'Iniciar rotação'}
                >
                  {isAutoPlay ? <Pause size={15} /> : <Play size={15} />}
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 sm:p-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-all cursor-pointer"
                  title="Tela Cheia"
                >
                  {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>
              </div>

              <button
                onClick={() => {
                  let link = "https://gest-o-de-produ-o-2026.pages.dev/tv";
                  try {
                    if (typeof window !== 'undefined' && window.location.origin && (window.location.origin.includes('pages.dev') || window.location.origin.includes('gest-o-de-produ-o-2026'))) {
                      link = `${window.location.origin}/tv`;
                    }
                  } catch {}
                  if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(link).then(() => {
                      setTvLinkCopied(true);
                      setTimeout(() => setTvLinkCopied(false), 3000);
                    }).catch(() => {});
                  } else {
                    try {
                      const textarea = document.createElement('textarea');
                      textarea.value = link;
                      textarea.style.position = 'fixed';
                      textarea.style.opacity = '0';
                      document.body.appendChild(textarea);
                      textarea.select();
                      document.execCommand('copy');
                      document.body.removeChild(textarea);
                      setTvLinkCopied(true);
                      setTimeout(() => setTvLinkCopied(false), 3000);
                    } catch {}
                  }
                }}
                className={`px-2.5 sm:px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm shrink-0 whitespace-nowrap transition-all cursor-pointer select-none border ${
                  tvLinkCopied
                    ? 'bg-[#A8D419] text-[#00334A] border-[#C5F028]'
                    : 'bg-[#003247] hover:bg-[#006C94] text-[#C5F028] border-[#A8D419]/70'
                }`}
                title="Copiar Link Externo da Gestão Visual para Smart TV"
              >
                <Tv className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{tvLinkCopied ? 'Link Copiado!' : 'Link Smart TV'}</span>
              </button>

              <button
                onClick={onClose}
                className="px-3 sm:px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm shrink-0 whitespace-nowrap transition-all cursor-pointer select-none"
                title="Voltar ao Sistema (ou pressione ESC)"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Voltar</span>
              </button>
            </div>
          </header>

          {/* Sub-Barra de Navegação dos Slides e Tempo (Azul da Logo + Verde-Lima) */}
          <div className="bg-[#DCEBF2] border-b border-[#005A7D]/20 py-1 px-2 sm:px-4 flex items-center justify-between gap-2 shrink-0 max-w-full overflow-hidden">
            <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
              <button
                onClick={() => handleSlideChange((currentSlide - 1 + slideTitles.length) % slideTitles.length)}
                className="p-1.5 bg-white text-[#005A7D] rounded-lg font-bold flex items-center shrink-0 active:scale-95 border border-[#005A7D]/25 hover:bg-[#E7F3F8] cursor-pointer"
                title="Slide Anterior"
              >
                <ChevronLeft size={15} />
              </button>

              <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-0.5 max-w-full flex-1">
                {slideTitles.map((title, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setViewMode('slides');
                      handleSlideChange(idx);
                    }}
                    className={`px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all shrink-0 cursor-pointer border ${
                      viewMode === 'slides' && currentSlide === idx
                        ? 'bg-[#005A7D] text-[#C5F028] border-[#003E58] shadow-xs'
                        : 'bg-white text-[#0A3A52] hover:bg-[#E7F3F8] hover:text-[#005A7D] border-[#005A7D]/20'
                    }`}
                  >
                    <span className={`font-mono mr-1 ${viewMode === 'slides' && currentSlide === idx ? 'text-[#A8D419]' : 'text-[#007399]/70'}`}>
                      {idx + 1}.
                    </span>
                    <span className="hidden md:inline">{title}</span>
                    <span className="inline md:hidden">{title.split(' ')[0]}</span>
                  </button>
                ))}
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all shrink-0 cursor-pointer border ${
                    viewMode === 'grid'
                      ? 'bg-[#A8D419] text-[#00334A] border-[#8CC600] shadow-xs'
                      : 'bg-white text-[#0A3A52] hover:bg-[#E7F3F8] border-[#005A7D]/20'
                  }`}
                >
                  Vista Completa
                </button>
              </div>

              <button
                onClick={() => handleSlideChange((currentSlide + 1) % slideTitles.length)}
                className="p-1.5 bg-white text-[#005A7D] rounded-lg font-bold flex items-center shrink-0 active:scale-95 border border-[#005A7D]/25 hover:bg-[#E7F3F8] cursor-pointer"
                title="Próximo Slide"
              >
                <ChevronRight size={15} />
              </button>
            </div>

            <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-[#005A7D]/25 shrink-0">
              <span className="text-[10px] font-black text-[#005A7D] uppercase px-1 hidden sm:flex items-center gap-1">
                <Sliders size={12} /> Tempo:
              </span>
              {[20, 30, 45, 60].map((sec) => (
                <button
                  key={sec}
                  onClick={() => handleDurationChange(sec)}
                  className={`px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-black font-mono tabular-nums transition-all cursor-pointer ${
                    slideDuration === sec
                      ? 'bg-[#005A7D] text-[#C5F028]'
                      : 'text-[#0A3A52] hover:bg-[#E7F3F8]'
                  }`}
                  title={`Trocar slide a cada ${sec} segundos`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Rotation Progress Bar (Azul da Logo -> Verde Lima Claro) */}
      {!isFullscreen && isAutoPlay && viewMode === 'slides' && (
        <div className="w-full bg-[#CEE1EA] h-1.5 relative overflow-hidden shrink-0">
          <div
            className="bg-gradient-to-r from-[#005A7D] via-[#0086B3] to-[#A8D419] h-full transition-all duration-1000 ease-linear"
            style={{ width: `${((slideDuration - timeRemaining) / slideDuration) * 100}%` }}
          />
        </div>
      )}

      {/* Main Viewport com Moldura Arquitetônica Azul + Lima */}
      <main className={`flex-1 p-2 md:p-3 lg:p-3.5 relative bg-[#EBF3F7] flex flex-col justify-between h-full min-h-0 ${viewMode === 'slides' ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'}`}>
        <div className={`w-full flex-1 flex flex-col justify-between min-h-0 rounded-2xl border-2 border-[#005A7D]/20 bg-[#F6FAFC] p-2.5 md:p-3.5 shadow-inner relative ${viewMode === 'slides' ? 'overflow-hidden' : ''}`}>
          <div className="pointer-events-none absolute top-0 left-0 w-16 h-1 bg-[#A8D419] rounded-tl-xl" />
          <div className="pointer-events-none absolute top-0 right-0 w-16 h-1 bg-[#005A7D] rounded-tr-xl" />

          {viewMode === 'slides' ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, scale: 0.985, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.985, y: -6 }}
                transition={{ duration: 0.35 }}
                className="w-full flex-1 flex flex-col justify-between gap-2.5 h-full min-h-0 overflow-hidden"
              >
                {/* SLIDE 0: VISÃO GERAL DE PRODUÇÃO & METAS (ALTA LEGIBILIDADE PARA TV — ZERO ESPAÇO MORTO) */}
                {currentSlide === 0 && (
                  <div className="w-full flex-1 flex flex-col justify-between gap-2 h-full min-h-0 overflow-hidden">
                    {/* Cabeçalho Compacto do Slide */}
                    <div className="flex items-center justify-between border-b-2 border-[#005A7D]/20 pb-1 shrink-0 relative">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-6 bg-gradient-to-b from-[#005A7D] to-[#A8D419] rounded-xs shrink-0" />
                        <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-[#003E58] uppercase tracking-tight leading-none">
                          Visão Geral de Produção &amp; Metas
                        </h2>
                      </div>
                      <span className="text-xs md:text-sm font-mono font-black text-[#005A7D] uppercase tracking-widest">
                        Extrusão · Reciclagem · Corte de Fita
                      </span>
                      <div className="absolute bottom-[-2px] left-0 w-40 h-[3px] bg-[#A8D419]" />
                    </div>

                    {/* FAIXA 1: 5 CARDS KPI DE ALTO IMPACTO PARA LEITURA À DISTÂNCIA */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 shrink-0">
                      {/* KPI 1: Produção de Ontem (Extrusão + Fita Ontem em destaque) */}
                      <div className="bg-white rounded-xl border border-[#005A7D]/25 border-t-4 border-t-[#005A7D] shadow-xs flex flex-col justify-between overflow-hidden">
                        <div className="px-3.5 pt-2 pb-1.5 flex-1 flex flex-col justify-between">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs xl:text-sm font-black text-[#005A7D] uppercase tracking-wide flex items-center gap-1.5">
                              <Calendar className="w-4 h-4 text-[#0077A3] shrink-0" /> Produção Ontem
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#0077A3]">Extrusão</span>
                          </div>
                          <div className="text-4xl lg:text-[44px] xl:text-[52px] 2xl:text-[60px] font-black text-[#042838] font-mono tabular-nums tracking-tight leading-none my-1">
                            {renderWeight(metrics.yesterdayProdTotal, 'text-[0.42em] font-black text-[#005A7D] ml-1')}
                          </div>
                        </div>
                        <div className="bg-[#D9EEF8] border-t-2 border-[#005A7D]/20 px-3.5 py-1.5 flex items-center justify-between gap-1">
                          <span className="text-xs xl:text-sm font-black uppercase text-[#003E58]">Fita Ontem:</span>
                          <span className="font-mono tabular-nums font-black text-[#005A7D] text-base lg:text-lg xl:text-xl leading-none">
                            {renderM2(metrics.ribbonYesterdayM2, 'text-[0.65em] font-black text-[#007399] ml-0.5')}
                          </span>
                        </div>
                      </div>

                      {/* KPI 2: Meta do Mês (Extrusão) */}
                      <div className="bg-white rounded-xl border border-[#005A7D]/25 border-t-4 border-t-[#A8D419] shadow-xs flex flex-col justify-between overflow-hidden">
                        <div className="px-3.5 pt-2 pb-1.5 flex-1 flex flex-col justify-between">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs xl:text-sm font-black text-[#005A7D] uppercase tracking-wide flex items-center gap-1.5">
                              <Target className="w-4 h-4 text-[#7CA800] shrink-0" /> Meta do Mês
                            </span>
                            <span className="text-xs xl:text-sm font-black text-[#00334A] bg-[#A8D419] px-2 py-0.5 rounded font-mono tabular-nums leading-none">
                              {metrics.goalPercent.toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-4xl lg:text-[44px] xl:text-[52px] 2xl:text-[60px] font-black text-[#042838] font-mono tabular-nums tracking-tight leading-none my-1">
                            {renderWeight(metrics.prodMonthTotal, 'text-[0.42em] font-black text-[#005A7D] ml-1')}
                          </div>
                          <div className="w-full bg-[#DCEBF2] h-2.5 rounded-full overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-[#005A7D] via-[#0086B3] to-[#A8D419] h-full rounded-full transition-all duration-1000"
                              style={{ width: `${Math.min(100, metrics.goalPercent)}%` }}
                            />
                          </div>
                        </div>
                        <div className="bg-[#E7F3F8] border-t border-[#005A7D]/15 px-3.5 py-1.5 flex items-center justify-between text-xs xl:text-sm font-extrabold text-[#003E58] gap-1">
                          <span>Meta: <strong className="font-mono font-black text-[#005A7D]">{renderWeight(metrics.currentGoal, 'text-[0.75em] ml-0.5')}</strong></span>
                          <span>Falta: <strong className="font-mono font-black text-rose-700">{renderWeight(Math.max(0, metrics.currentGoal - metrics.prodMonthTotal), 'text-[0.75em] ml-0.5')}</strong></span>
                        </div>
                      </div>

                      {/* KPI 3: Projeção Fechamento (Extrusão) */}
                      <div className="bg-white rounded-xl border border-[#005A7D]/25 border-t-4 border-t-[#0077A3] shadow-xs flex flex-col justify-between overflow-hidden">
                        <div className="px-3.5 pt-2 pb-1.5 flex-1 flex flex-col justify-between">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs xl:text-sm font-black text-[#005A7D] uppercase tracking-wide flex items-center gap-1.5">
                              <TrendingUp className="w-4 h-4 text-[#0077A3] shrink-0" /> Projeção Mês
                            </span>
                            {metrics.projVar !== null && (
                              <span className={`px-2 py-0.5 rounded font-mono tabular-nums text-xs font-black leading-none ${
                                metrics.projVar >= 0 ? 'bg-[#A8D419] text-[#00334A]' : 'bg-rose-600 text-white'
                              }`}>
                                {metrics.projVar >= 0 ? '+' : ''}{metrics.projVar.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <div className="text-4xl lg:text-[42px] xl:text-[50px] 2xl:text-[58px] font-black text-[#005A7D] font-mono tabular-nums tracking-tight leading-none my-1">
                            {renderWeight(metrics.projectedMonthTotal, 'text-[0.42em] font-black text-[#007399] ml-1')}
                          </div>
                        </div>
                        <div className="bg-[#E7F3F8] border-t border-[#005A7D]/15 px-3.5 py-1.5 flex items-center justify-between text-xs xl:text-sm font-extrabold text-[#003E58] gap-1">
                          <span>Ritmo Nec.:</span>
                          <span className="font-mono tabular-nums text-amber-700 font-black text-sm xl:text-base leading-none">
                            {renderWeight(metrics.dailyGoalRequired, 'text-[0.7em] ml-0.5', '/dia')}
                          </span>
                        </div>
                      </div>

                      {/* KPI 4: SETOR CORTE DE FITA — ACUMULADO MÊS (DESTAQUE AZUL + VERDE LIMA) */}
                      <div className="bg-gradient-to-br from-[#003E58] via-[#005A7D] to-[#007399] text-white rounded-xl border-2 border-[#A8D419] shadow-sm flex flex-col justify-between overflow-hidden">
                        <div className="px-3.5 pt-2 pb-1.5 flex-1 flex flex-col justify-between">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs xl:text-sm font-black text-[#C5F028] uppercase tracking-wide flex items-center gap-1.5">
                              <Flame className="w-4 h-4 text-[#C5F028] shrink-0" /> Corte de Fita
                            </span>
                            <span className="text-xs xl:text-sm font-mono font-black bg-[#A8D419] text-[#00334A] px-2 py-0.5 rounded leading-none">
                              {metrics.ribbonGoalPercent.toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-4xl lg:text-[42px] xl:text-[50px] 2xl:text-[58px] font-black text-white font-mono tabular-nums tracking-tight leading-none my-1">
                            {renderM2(metrics.ribbonMonthM2, 'text-[0.42em] font-black text-[#C5F028] ml-1')}
                          </div>
                        </div>
                        <div className="bg-[#002D40] border-t border-[#A8D419]/50 px-3.5 py-1.5 flex items-center justify-between text-xs xl:text-sm font-extrabold text-[#CBE7F2] gap-1">
                          <span>Rolos: <strong className="font-mono text-white">{metrics.ribbonMonthRolls.toLocaleString('pt-BR')}</strong></span>
                          <span>NC: <strong className="font-mono text-[#C5F028]">{metrics.ribbonRejectPerc.toFixed(1)}%</strong></span>
                        </div>
                      </div>

                      {/* KPI 5: Total Eco B Produzido */}
                      <div className="bg-white rounded-xl border border-[#005A7D]/25 border-t-4 border-t-amber-500 shadow-xs flex flex-col justify-between overflow-hidden col-span-2 lg:col-span-1">
                        <div className="px-3.5 pt-2 pb-1.5 flex-1 flex flex-col justify-between">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs xl:text-sm font-black text-[#005A7D] uppercase tracking-wide flex items-center gap-1.5">
                              <Activity className="w-4 h-4 text-amber-500 shrink-0" /> Total Eco B
                            </span>
                            {metrics.ecoBVar !== null && (
                              <span className={`px-2 py-0.5 rounded font-mono tabular-nums text-xs font-black leading-none ${
                                metrics.ecoBVar <= 0 ? 'bg-[#A8D419] text-[#00334A]' : 'bg-amber-600 text-white'
                              }`}>
                                {metrics.ecoBVar >= 0 ? '+' : ''}{metrics.ecoBVar.toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <div className="text-4xl lg:text-[44px] xl:text-[52px] 2xl:text-[60px] font-black text-amber-600 font-mono tabular-nums tracking-tight leading-none my-1">
                            {renderWeight(metrics.totalEcoB, 'text-[0.42em] font-black text-amber-700 ml-1')}
                          </div>
                        </div>
                        <div className="bg-[#FDF6E7] border-t border-amber-200 px-3.5 py-1.5 flex items-center justify-between text-xs xl:text-sm font-extrabold text-[#52390A] gap-1">
                          <span>BP: <strong className="font-mono text-[#042838]">{renderWeight(metrics.totalEcoBP, 'text-[0.75em] ml-0.5')}</strong></span>
                          <span>BM: <strong className="font-mono text-[#042838]">{renderWeight(metrics.totalEcoBM, 'text-[0.75em] ml-0.5')}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* FAIXA 2 (FULL-WIDTH 12 COLS): TODAS AS 6 MÁQUINAS EM 2 LINHAS LARGAS COM NÚMEROS GIGANTES */}
                    <div className="grid grid-rows-2 gap-2 flex-1 min-h-0">
                      {/* LINHA A: EXTRUSÃO & RECICLAGEM (CAST 1, CAST 2, EREMA) */}
                      <div className="bg-white/95 border border-[#005A7D]/20 rounded-2xl p-2 flex flex-col justify-between gap-1.5 min-h-0 shadow-xs">
                        <div className="flex items-center justify-between border-b border-[#005A7D]/15 pb-1 px-1 shrink-0">
                          <span className="text-xs font-black uppercase tracking-[0.14em] text-[#005A7D] flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-xs bg-[#005A7D]" />
                            Máquinas · Extrusão &amp; Reciclagem
                          </span>
                          <span className="text-xs font-mono font-extrabold text-[#2B596E]">
                            Total Extrusão: <strong className="text-[#003E58] text-sm">{renderWeight(metrics.prodMonthTotal, 'text-[0.8em] ml-0.5')}</strong>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1 min-h-0">
                          {/* CAST 1 */}
                          <div className="bg-[#F6FAFC] border border-[#005A7D]/25 rounded-xl flex flex-col justify-between h-full min-h-0 overflow-hidden">
                            <div className="px-4 pt-2 flex items-center justify-between gap-2">
                              <span className="text-sm lg:text-base xl:text-lg font-black text-[#005A7D] uppercase tracking-wide flex items-center gap-1.5">
                                <Factory className="w-4 h-4 lg:w-5 lg:h-5 text-[#0077A3]" /> Cast 1
                              </span>
                              <span className="text-xs font-black text-[#007399] uppercase tracking-wider">
                                Extrusora · {metrics.cast1ShareGoalPct.toFixed(0)}% ref.
                              </span>
                            </div>
                            <div className="px-4 my-auto flex items-baseline justify-between gap-2">
                              <p className="text-4xl lg:text-5xl xl:text-[56px] 2xl:text-[66px] font-black text-[#042838] font-mono tabular-nums leading-none tracking-tight">
                                {renderWeight(metrics.machineMonthMap['Cast 1'] || 0, 'text-[0.42em] font-black text-[#005A7D] ml-1')}
                              </p>
                            </div>
                            <div className="bg-[#E3F1F7] border-t border-[#005A7D]/15 px-4 py-1.5 flex items-center justify-between gap-2">
                              <span className="text-xs lg:text-sm xl:text-base font-extrabold text-[#0A3A52]">
                                Ontem:{' '}
                                <strong className="font-mono tabular-nums font-black text-[#042838] text-base lg:text-lg xl:text-2xl ml-1">
                                  {renderWeight(metrics.machineYesterdayMap['Cast 1'] || 0, 'text-[0.65em] ml-0.5')}
                                </strong>
                              </span>
                              {metrics.cast1Var !== null && (
                                <span className={`font-mono tabular-nums text-sm lg:text-base xl:text-lg font-black px-2 py-0.5 rounded ${
                                  metrics.cast1Var >= 0 ? 'bg-[#A8D419] text-[#00334A]' : 'bg-rose-100 text-rose-700'
                                }`}>
                                  {metrics.cast1Var >= 0 ? '+' : ''}{metrics.cast1Var.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>

                          {/* CAST 2 */}
                          <div className="bg-[#F6FAFC] border border-[#005A7D]/25 rounded-xl flex flex-col justify-between h-full min-h-0 overflow-hidden">
                            <div className="px-4 pt-2 flex items-center justify-between gap-2">
                              <span className="text-sm lg:text-base xl:text-lg font-black text-[#005A7D] uppercase tracking-wide flex items-center gap-1.5">
                                <Factory className="w-4 h-4 lg:w-5 lg:h-5 text-[#0086B3]" /> Cast 2
                              </span>
                              <span className="text-xs font-black text-[#007399] uppercase tracking-wider">
                                Extrusora · {metrics.cast2ShareGoalPct.toFixed(0)}% ref.
                              </span>
                            </div>
                            <div className="px-4 my-auto flex items-baseline justify-between gap-2">
                              <p className="text-4xl lg:text-5xl xl:text-[56px] 2xl:text-[66px] font-black text-[#005A7D] font-mono tabular-nums leading-none tracking-tight">
                                {renderWeight(metrics.machineMonthMap['Cast 2'] || 0, 'text-[0.42em] font-black text-[#007399] ml-1')}
                              </p>
                            </div>
                            <div className="bg-[#E3F1F7] border-t border-[#005A7D]/15 px-4 py-1.5 flex items-center justify-between gap-2">
                              <span className="text-xs lg:text-sm xl:text-base font-extrabold text-[#0A3A52]">
                                Ontem:{' '}
                                <strong className="font-mono tabular-nums font-black text-[#042838] text-base lg:text-lg xl:text-2xl ml-1">
                                  {renderWeight(metrics.machineYesterdayMap['Cast 2'] || 0, 'text-[0.65em] ml-0.5')}
                                </strong>
                              </span>
                              {metrics.cast2Var !== null && (
                                <span className={`font-mono tabular-nums text-sm lg:text-base xl:text-lg font-black px-2 py-0.5 rounded ${
                                  metrics.cast2Var >= 0 ? 'bg-[#A8D419] text-[#00334A]' : 'bg-rose-100 text-rose-700'
                                }`}>
                                  {metrics.cast2Var >= 0 ? '+' : ''}{metrics.cast2Var.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>

                          {/* EREMA */}
                          <div className="bg-[#F6FAFC] border border-[#005A7D]/25 rounded-xl flex flex-col justify-between h-full min-h-0 overflow-hidden">
                            <div className="px-4 pt-2 flex items-center justify-between gap-2">
                              <span className="text-sm lg:text-base xl:text-lg font-black text-[#005A7D] uppercase tracking-wide flex items-center gap-1.5">
                                <RefreshCw className="w-4 h-4 lg:w-5 lg:h-5 text-[#6B9F00]" /> Erema
                              </span>
                              <span className="text-xs font-black text-[#4B7000] uppercase tracking-wider">
                                Reciclado · {metrics.eremaGoalPercent.toFixed(0)}% meta
                              </span>
                            </div>
                            <div className="px-4 my-auto flex items-baseline justify-between gap-2">
                              <p className="text-4xl lg:text-5xl xl:text-[56px] 2xl:text-[66px] font-black text-[#1E6B34] font-mono tabular-nums leading-none tracking-tight">
                                {renderWeight(metrics.eremaMonthTotal, 'text-[0.42em] font-black text-[#4B7000] ml-1')}
                              </p>
                            </div>
                            <div className="bg-[#E8F6EC] border-t border-[#005A7D]/15 px-4 py-1.5 flex items-center justify-between gap-2">
                              <span className="text-xs lg:text-sm xl:text-base font-extrabold text-[#0A3A52]">
                                Ontem:{' '}
                                <strong className="font-mono tabular-nums font-black text-[#042838] text-base lg:text-lg xl:text-2xl ml-1">
                                  {renderWeight(metrics.machineYesterdayMap['Erema'] || 0, 'text-[0.65em] ml-0.5')}
                                </strong>
                              </span>
                              {metrics.eremaVar !== null && (
                                <span className={`font-mono tabular-nums text-sm lg:text-base xl:text-lg font-black px-2 py-0.5 rounded ${
                                  metrics.eremaVar >= 0 ? 'bg-[#A8D419] text-[#00334A]' : 'bg-rose-100 text-rose-700'
                                }`}>
                                  {metrics.eremaVar >= 0 ? '+' : ''}{metrics.eremaVar.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* LINHA B: SETOR CORTE DE FITA (LINTECH, GHEZZI, WULTEC) */}
                      <div className="bg-gradient-to-r from-[#EBF5FA] via-[#F4FAFC] to-[#F3FBE3] border border-[#005A7D]/25 rounded-2xl p-2 flex flex-col justify-between gap-1.5 min-h-0 shadow-xs">
                        <div className="flex items-center justify-between border-b border-[#005A7D]/15 pb-1 px-1 shrink-0">
                          <span className="text-xs font-black uppercase tracking-[0.14em] text-[#005A7D] flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-xs bg-[#A8D419] border border-[#005A7D]/40" />
                            Máquinas · Setor Corte de Fita
                          </span>
                          <span className="text-xs font-mono font-extrabold text-[#2B596E]">
                            Total Fita: <strong className="text-[#003E58] text-sm">{renderM2(metrics.ribbonMonthM2, 'text-[0.8em] ml-0.5')}</strong> · Meta: <strong className="text-[#005A7D] text-sm">{renderM2(metrics.ribbonTotalGoal, 'text-[0.8em] ml-0.5')}</strong>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1 min-h-0">
                          {([
                            { key: 'Lintech' as const, label: 'Lintech', numColor: 'text-[#005A7D]', varVal: metrics.lintechVar },
                            { key: 'Ghezzi' as const, label: 'Ghezzi', numColor: 'text-[#006C94]', varVal: metrics.ghezziVar },
                            { key: 'Wultec' as const, label: 'Wultec', numColor: 'text-[#003E58]', varVal: metrics.wultecVar },
                          ]).map((m) => (
                            <div
                              key={m.key}
                              className="bg-white border border-[#005A7D]/25 rounded-xl flex flex-col justify-between h-full min-h-0 overflow-hidden"
                            >
                              <div className="px-4 pt-2 flex items-center justify-between gap-2">
                                <span className="text-sm lg:text-base xl:text-lg font-black text-[#005A7D] uppercase tracking-wide flex items-center gap-1.5">
                                  <Factory className="w-4 h-4 lg:w-5 lg:h-5 text-[#7CB518]" /> {m.label}
                                </span>
                                <span className="text-xs font-black text-[#4B7000] uppercase tracking-wider">
                                  {metrics.ribbonMachineRollsMap[m.key] > 0 ? `${metrics.ribbonMachineRollsMap[m.key].toLocaleString('pt-BR')} rolos` : 'Cortadora'} · {metrics.ribbonMachineGoalPercentMap[m.key].toFixed(0)}% meta
                                </span>
                              </div>
                              <div className="px-4 my-auto flex items-baseline justify-between gap-2">
                                <p className={`text-4xl lg:text-5xl xl:text-[56px] 2xl:text-[66px] font-black ${m.numColor} font-mono tabular-nums leading-none tracking-tight`}>
                                  {renderM2(metrics.ribbonMachineMonthMap[m.key] || 0, 'text-[0.42em] font-black text-[#007399] ml-1')}
                                </p>
                              </div>
                              <div className="bg-[#F3FBE3] border-t border-[#A8D419]/60 px-4 py-1.5 flex items-center justify-between gap-2">
                                <span className="text-xs lg:text-sm xl:text-base font-extrabold text-[#003E58]">
                                  Ontem:{' '}
                                  <strong className="font-mono tabular-nums font-black text-[#042838] text-base lg:text-lg xl:text-2xl ml-1">
                                    {renderM2(metrics.ribbonMachineYesterdayMap[m.key] || 0, 'text-[0.65em] ml-0.5')}
                                  </strong>
                                </span>
                                {m.varVal !== null ? (
                                  <span className={`font-mono tabular-nums text-sm lg:text-base xl:text-lg font-black px-2 py-0.5 rounded ${
                                    m.varVal >= 0 ? 'bg-[#A8D419] text-[#00334A]' : 'bg-rose-100 text-rose-700'
                                  }`}>
                                    {m.varVal >= 0 ? '+' : ''}{m.varVal.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="font-mono text-xs xl:text-sm text-amber-800 font-black">
                                    NC: {formatNumDot(metrics.ribbonMachineRejectedMap[m.key] || 0, 0, 0)}m²
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* FAIXA 3 (COMPACTA HORIZONTAL — ZERO ESPAÇO VAZIO): LÍDERES DE PRODUTIVIDADE DO MÊS */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 shrink-0">
                      {/* Líder Extrusão */}
                      <div className="bg-white border-2 border-[#005A7D] rounded-xl shadow-xs px-4 py-2 flex items-center justify-between gap-3 relative overflow-hidden">
                        <ContinuousConfettiOverlay />
                        <div className="relative z-10 flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 xl:w-14 xl:h-14 bg-gradient-to-br from-[#003E58] to-[#005A7D] rounded-xl flex items-center justify-center text-2xl shrink-0 border-2 border-[#A8D419] shadow-xs">
                            🥇
                          </div>
                          <div className="min-w-0">
                            <span className="text-[11px] xl:text-xs font-black uppercase tracking-widest text-[#007399] block leading-none">
                              Líder Extrusão · 1º Lugar · {metrics.bestOperator.machine || 'Extrusão'}
                            </span>
                            <h4 className="text-lg lg:text-xl xl:text-2xl 2xl:text-[26px] font-black text-[#042838] truncate leading-tight mt-0.5">
                              {metrics.bestOperator.name}
                            </h4>
                          </div>
                        </div>
                        <div className="relative z-10 text-right shrink-0 pl-3 border-l border-[#005A7D]/15">
                          <span className="text-[10px] font-extrabold uppercase text-[#2B596E] block leading-none">Produção Líquida</span>
                          <div className="text-3xl lg:text-4xl xl:text-[42px] font-mono tabular-nums font-black text-[#005A7D] leading-none mt-0.5">
                            {renderWeight(metrics.bestOperator.adjustedTotalNet ?? metrics.bestOperator.totalNet, 'text-[0.45em] font-black text-[#007399] ml-0.5')}
                          </div>
                        </div>
                      </div>

                      {/* Líder Corte de Fita */}
                      <div className="bg-gradient-to-r from-[#003E58] via-[#005A7D] to-[#007399] border-2 border-[#A8D419] rounded-xl shadow-xs px-4 py-2 flex items-center justify-between gap-3 text-white">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 xl:w-14 xl:h-14 bg-[#A8D419] text-[#003E58] rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-xs">
                            🏆
                          </div>
                          <div className="min-w-0">
                            <span className="text-[11px] xl:text-xs font-black uppercase tracking-widest text-[#C5F028] block leading-none">
                              Líder Corte de Fita · 1º Lugar · {metrics.bestRibbonOperator.machine}
                            </span>
                            <h4 className="text-lg lg:text-xl xl:text-2xl 2xl:text-[26px] font-black text-white truncate leading-tight mt-0.5">
                              {metrics.bestRibbonOperator.name}
                            </h4>
                          </div>
                        </div>
                        <div className="text-right shrink-0 pl-3 border-l border-white/20">
                          <span className="text-[10px] font-extrabold uppercase text-[#CBE7F2] block leading-none">
                            {metrics.bestRibbonOperator.rolls > 0 ? `${metrics.bestRibbonOperator.rolls.toLocaleString('pt-BR')} rolos` : 'Produção Mês'}
                          </span>
                          <div className="text-3xl lg:text-4xl xl:text-[42px] font-mono tabular-nums font-black text-[#C5F028] leading-none mt-0.5">
                            {renderM2(metrics.bestRibbonOperator.totalM2, 'text-[0.45em] font-black text-white/90 ml-0.5')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SLIDE 1: METAS DE PRODUÇÃO POR MÁQUINA & SETOR (CONFORME CONFIGURAÇÕES DO SISTEMA) */}
                {currentSlide === 1 && (
                  <div className="w-full flex-1 flex flex-col justify-between gap-2.5 h-full min-h-0 overflow-hidden">
                    {/* Cabeçalho */}
                    <div className="flex items-center justify-between border-b-2 border-[#005A7D]/20 pb-1.5 shrink-0 relative">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-7 bg-gradient-to-b from-[#005A7D] to-[#A8D419] rounded-xs shrink-0" />
                        <h2 className="text-lg md:text-2xl lg:text-3xl font-black text-[#003E58] uppercase tracking-tight leading-none flex items-center gap-2.5">
                          <Target className="w-6 h-6 md:w-7 md:h-7 text-[#005A7D]" /> Metas de Produção · Todas as Máquinas
                        </h2>
                      </div>
                      <span className="text-xs md:text-sm font-mono font-black text-[#005A7D] uppercase tracking-widest">
                        Mês {dashboardMonth.split('-').reverse().join('/')} · {metrics.remainingDays} dias restantes
                      </span>
                      <div className="absolute bottom-[-2px] left-0 w-44 h-[3px] bg-[#A8D419]" />
                    </div>

                    {/* FAIXA 1: 3 CARDS CONSOLIDADOS DAS METAS OFICIAIS DOS SETORES */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 shrink-0">
                      {/* Setor 1: Extrusão */}
                      <div className="bg-gradient-to-r from-[#003E58] to-[#005A7D] text-white rounded-xl border-b-4 border-[#A8D419] px-4 py-2.5 shadow-xs flex flex-col justify-between gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs xl:text-sm font-black uppercase tracking-wider text-[#C5F028]">
                            Meta Setor Extrusão (Cast 1 + Cast 2)
                          </span>
                          <span className="text-base xl:text-lg font-mono tabular-nums font-black bg-[#A8D419] text-[#003E58] px-2.5 py-0.5 rounded leading-none">
                            {metrics.goalPercent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-3xl xl:text-4xl font-mono tabular-nums font-black text-white leading-none">
                            {renderWeight(metrics.prodMonthTotal, 'text-[0.48em] text-[#C5F028] ml-0.5')}
                          </span>
                          <span className="text-sm xl:text-base font-mono font-bold text-[#CBE7F2]">
                            de <strong className="text-white font-black">{renderWeight(metrics.currentGoal, 'text-[0.8em] ml-0.5')}</strong>
                          </span>
                        </div>
                        <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#A8D419] h-full rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(100, metrics.goalPercent)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs font-extrabold text-[#D6EFF8] pt-0.5">
                          <span>Falta: <strong className="font-mono text-white">{renderWeight(Math.max(0, metrics.currentGoal - metrics.prodMonthTotal), 'text-[0.8em] ml-0.5')}</strong></span>
                          <span className={metrics.overallLossPercMonth <= metrics.extrusionWasteLimitVal ? 'text-[#C5F028]' : 'text-rose-300'}>
                            Rejeito: <strong className="font-mono">{metrics.overallLossPercMonth.toFixed(1)}%</strong> / Lim. {metrics.extrusionWasteLimitVal.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Setor 2: Reciclagem (Erema) */}
                      <div className="bg-gradient-to-r from-[#004F6B] to-[#007399] text-white rounded-xl border-b-4 border-[#A8D419] px-4 py-2.5 shadow-xs flex flex-col justify-between gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs xl:text-sm font-black uppercase tracking-wider text-[#C5F028]">
                            Meta Setor Reciclagem (Erema)
                          </span>
                          <span className="text-base xl:text-lg font-mono tabular-nums font-black bg-[#A8D419] text-[#003E58] px-2.5 py-0.5 rounded leading-none">
                            {metrics.eremaGoalPercent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-3xl xl:text-4xl font-mono tabular-nums font-black text-white leading-none">
                            {renderWeight(metrics.eremaMonthTotal, 'text-[0.48em] text-[#C5F028] ml-0.5')}
                          </span>
                          <span className="text-sm xl:text-base font-mono font-bold text-[#CBE7F2]">
                            de <strong className="text-white font-black">{renderWeight(metrics.eremaMonthGoal, 'text-[0.8em] ml-0.5')}</strong>
                          </span>
                        </div>
                        <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#C5F028] h-full rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(100, metrics.eremaGoalPercent)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs font-extrabold text-[#D6EFF8] pt-0.5">
                          <span>Falta: <strong className="font-mono text-white">{renderWeight(metrics.eremaRemaining, 'text-[0.8em] ml-0.5')}</strong></span>
                          <span>Turno 12h: <strong className="font-mono text-[#C5F028]">{metrics.eremaStandardGoal12h.toLocaleString('pt-BR')} kg</strong></span>
                        </div>
                      </div>

                      {/* Setor 3: Corte de Fita */}
                      <div className="bg-gradient-to-r from-[#003E58] via-[#005A7D] to-[#006C94] text-white rounded-xl border-b-4 border-[#A8D419] px-4 py-2.5 shadow-xs flex flex-col justify-between gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs xl:text-sm font-black uppercase tracking-wider text-[#C5F028]">
                            Meta Setor Corte de Fita (Total)
                          </span>
                          <span className="text-base xl:text-lg font-mono tabular-nums font-black bg-[#A8D419] text-[#003E58] px-2.5 py-0.5 rounded leading-none">
                            {metrics.ribbonGoalPercent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-3xl xl:text-4xl font-mono tabular-nums font-black text-white leading-none">
                            {renderM2(metrics.ribbonMonthM2, 'text-[0.45em] text-[#C5F028] ml-0.5')}
                          </span>
                          <span className="text-sm xl:text-base font-mono font-bold text-[#CBE7F2]">
                            de <strong className="text-white font-black">{renderM2(metrics.ribbonTotalGoal, 'text-[0.8em] ml-0.5')}</strong>
                          </span>
                        </div>
                        <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#A8D419] h-full rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(100, metrics.ribbonGoalPercent)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs font-extrabold text-[#D6EFF8] pt-0.5">
                          <span>Falta: <strong className="font-mono text-white">{renderM2(metrics.ribbonRemainingM2, 'text-[0.8em] ml-0.5')}</strong></span>
                          <span className="text-[#C5F028] font-mono">{formatJumboUnits(calcJumboUnits(metrics.ribbonTotalGoal))}</span>
                        </div>
                      </div>
                    </div>

                    {/* FAIXA 2: GRADE 2x3 COM AS 6 MÁQUINAS DA PLANTA E ACOMPANHAMENTO DE METAS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2 gap-2.5 flex-1 min-h-0">
                      {/* 1. CAST 1 */}
                      {(() => {
                        const realized = metrics.machineMonthMap['Cast 1'] || 0;
                        const target = metrics.cast1ShareGoal;
                        const pct = metrics.cast1ShareGoalPct;
                        const statusLabel = pct >= 100 ? 'Meta Batida' : pct >= 75 ? 'No Ritmo' : pct >= 50 ? 'Em Evolução' : 'Atenção';
                        const statusColor = pct >= 100 ? 'bg-[#A8D419] text-[#003E58]' : pct >= 75 ? 'bg-[#D9EEF8] text-[#005A7D]' : pct >= 50 ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-800';
                        return (
                          <div className="bg-white border border-[#005A7D]/25 rounded-2xl shadow-xs flex flex-col justify-between overflow-hidden h-full min-h-0">
                            <div className="bg-[#005A7D] border-b-2 border-[#A8D419] px-4 py-1.5 flex items-center justify-between shrink-0">
                              <div className="flex items-center gap-2">
                                <Factory className="w-4 h-4 text-[#C5F028]" />
                                <span className="text-sm lg:text-base font-black text-white uppercase tracking-wider">Cast 1</span>
                                <span className="text-[10px] font-bold text-[#CBE7F2] uppercase">· Cap. 1.200 kg/h</span>
                              </div>
                              <span className="text-base lg:text-lg font-mono tabular-nums font-black text-[#C5F028] leading-none">
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                            <div className="px-4 py-2 flex-1 flex flex-col justify-center gap-2">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-3xl lg:text-4xl xl:text-[44px] font-black text-[#042838] font-mono tabular-nums leading-none">
                                  {renderWeight(realized, 'text-[0.45em] font-black text-[#005A7D] ml-0.5')}
                                </span>
                                <span className={`text-xs font-black uppercase px-2 py-0.5 rounded ${statusColor}`}>
                                  {statusLabel}
                                </span>
                              </div>
                              <div className="w-full bg-[#DCEBF2] h-3.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-[#005A7D] to-[#A8D419] h-full rounded-full transition-all duration-1000"
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-xs xl:text-sm font-extrabold text-[#2B596E]">
                                <span>Ref. Meta (46%): <strong className="font-mono text-[#003E58]">{renderWeight(target, 'text-[0.8em] ml-0.5')}</strong></span>
                                <span>Falta: <strong className="font-mono text-rose-700">{renderWeight(metrics.cast1Remaining, 'text-[0.8em] ml-0.5')}</strong></span>
                              </div>
                            </div>
                            <div className="bg-[#E7F3F8] border-t border-[#005A7D]/15 px-4 py-1.5 flex items-center justify-between text-xs xl:text-sm font-extrabold text-[#003E58] shrink-0">
                              <span>Ontem: <strong className="font-mono text-base font-black">{renderWeight(metrics.machineYesterdayMap['Cast 1'] || 0, 'text-[0.75em] ml-0.5')}</strong></span>
                              <span>Nec./dia: <strong className="font-mono text-base font-black text-amber-700">{renderWeight(metrics.cast1DailyReq, 'text-[0.75em] ml-0.5')}</strong></span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 2. CAST 2 */}
                      {(() => {
                        const realized = metrics.machineMonthMap['Cast 2'] || 0;
                        const target = metrics.cast2ShareGoal;
                        const pct = metrics.cast2ShareGoalPct;
                        const statusLabel = pct >= 100 ? 'Meta Batida' : pct >= 75 ? 'No Ritmo' : pct >= 50 ? 'Em Evolução' : 'Atenção';
                        const statusColor = pct >= 100 ? 'bg-[#A8D419] text-[#003E58]' : pct >= 75 ? 'bg-[#D9EEF8] text-[#005A7D]' : pct >= 50 ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-800';
                        return (
                          <div className="bg-white border border-[#005A7D]/25 rounded-2xl shadow-xs flex flex-col justify-between overflow-hidden h-full min-h-0">
                            <div className="bg-[#007399] border-b-2 border-[#A8D419] px-4 py-1.5 flex items-center justify-between shrink-0">
                              <div className="flex items-center gap-2">
                                <Factory className="w-4 h-4 text-[#C5F028]" />
                                <span className="text-sm lg:text-base font-black text-white uppercase tracking-wider">Cast 2</span>
                                <span className="text-[10px] font-bold text-[#CBE7F2] uppercase">· Cap. 1.400 kg/h</span>
                              </div>
                              <span className="text-base lg:text-lg font-mono tabular-nums font-black text-[#C5F028] leading-none">
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                            <div className="px-4 py-2 flex-1 flex flex-col justify-center gap-2">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-3xl lg:text-4xl xl:text-[44px] font-black text-[#005A7D] font-mono tabular-nums leading-none">
                                  {renderWeight(realized, 'text-[0.45em] font-black text-[#007399] ml-0.5')}
                                </span>
                                <span className={`text-xs font-black uppercase px-2 py-0.5 rounded ${statusColor}`}>
                                  {statusLabel}
                                </span>
                              </div>
                              <div className="w-full bg-[#DCEBF2] h-3.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-[#007399] to-[#A8D419] h-full rounded-full transition-all duration-1000"
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-xs xl:text-sm font-extrabold text-[#2B596E]">
                                <span>Ref. Meta (54%): <strong className="font-mono text-[#003E58]">{renderWeight(target, 'text-[0.8em] ml-0.5')}</strong></span>
                                <span>Falta: <strong className="font-mono text-rose-700">{renderWeight(metrics.cast2Remaining, 'text-[0.8em] ml-0.5')}</strong></span>
                              </div>
                            </div>
                            <div className="bg-[#E7F3F8] border-t border-[#005A7D]/15 px-4 py-1.5 flex items-center justify-between text-xs xl:text-sm font-extrabold text-[#003E58] shrink-0">
                              <span>Ontem: <strong className="font-mono text-base font-black">{renderWeight(metrics.machineYesterdayMap['Cast 2'] || 0, 'text-[0.75em] ml-0.5')}</strong></span>
                              <span>Nec./dia: <strong className="font-mono text-base font-black text-amber-700">{renderWeight(metrics.cast2DailyReq, 'text-[0.75em] ml-0.5')}</strong></span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 3. EREMA (RECICLAGEM) */}
                      {(() => {
                        const realized = metrics.eremaMonthTotal;
                        const target = metrics.eremaMonthGoal;
                        const pct = metrics.eremaGoalPercent;
                        const statusLabel = pct >= 100 ? 'Meta Batida' : pct >= 75 ? 'No Ritmo' : pct >= 50 ? 'Em Evolução' : 'Atenção';
                        const statusColor = pct >= 100 ? 'bg-[#A8D419] text-[#003E58]' : pct >= 75 ? 'bg-emerald-100 text-emerald-800' : pct >= 50 ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-800';
                        return (
                          <div className="bg-white border-2 border-[#A8D419] rounded-2xl shadow-xs flex flex-col justify-between overflow-hidden h-full min-h-0">
                            <div className="bg-[#004A68] border-b-2 border-[#A8D419] px-4 py-1.5 flex items-center justify-between shrink-0">
                              <div className="flex items-center gap-2">
                                <RefreshCw className="w-4 h-4 text-[#C5F028]" />
                                <span className="text-sm lg:text-base font-black text-white uppercase tracking-wider">Erema</span>
                                <span className="text-[10px] font-bold text-[#C5F028] uppercase">· Reciclagem</span>
                              </div>
                              <span className="text-base lg:text-lg font-mono tabular-nums font-black text-[#C5F028] leading-none">
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                            <div className="px-4 py-2 flex-1 flex flex-col justify-center gap-2">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-3xl lg:text-4xl xl:text-[44px] font-black text-[#1E6B34] font-mono tabular-nums leading-none">
                                  {renderWeight(realized, 'text-[0.45em] font-black text-[#4B7000] ml-0.5')}
                                </span>
                                <span className={`text-xs font-black uppercase px-2 py-0.5 rounded ${statusColor}`}>
                                  {statusLabel}
                                </span>
                              </div>
                              <div className="w-full bg-[#DCEBF2] h-3.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-[#1E6B34] to-[#A8D419] h-full rounded-full transition-all duration-1000"
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-xs xl:text-sm font-extrabold text-[#2B596E]">
                                <span>Meta Oficial: <strong className="font-mono text-[#003E58]">{renderWeight(target, 'text-[0.8em] ml-0.5')}</strong></span>
                                <span>Falta: <strong className="font-mono text-rose-700">{renderWeight(metrics.eremaRemaining, 'text-[0.8em] ml-0.5')}</strong></span>
                              </div>
                            </div>
                            <div className="bg-[#E8F6EC] border-t border-[#005A7D]/15 px-4 py-1.5 flex items-center justify-between text-xs xl:text-sm font-extrabold text-[#003E58] shrink-0">
                              <span>Ontem: <strong className="font-mono text-base font-black">{renderWeight(metrics.machineYesterdayMap['Erema'] || 0, 'text-[0.75em] ml-0.5')}</strong></span>
                              <span>Turno 12h: <strong className="font-mono text-base font-black text-[#1E6B34]">{metrics.eremaStandardGoal12h.toLocaleString('pt-BR')} kg</strong></span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 4, 5, 6: CORTE DE FITA — LINTECH, GHEZZI, WULTEC (METAS OFICIAIS DO SISTEMA) */}
                      {([
                        { key: 'Lintech' as const, label: 'Lintech', headerBg: 'bg-[#003E58]' },
                        { key: 'Ghezzi' as const, label: 'Ghezzi', headerBg: 'bg-[#005A7D]' },
                        { key: 'Wultec' as const, label: 'Wultec', headerBg: 'bg-[#006C94]' },
                      ]).map((m) => {
                        const realized = metrics.ribbonMachineMonthMap[m.key] || 0;
                        const target = metrics.ribbonMachineGoalMap[m.key];
                        const pct = metrics.ribbonMachineGoalPercentMap[m.key];
                        const rem = metrics.ribbonMachineRemainingMap[m.key];
                        const dailyReq = metrics.ribbonMachineDailyReqMap[m.key];
                        const yest = metrics.ribbonMachineYesterdayMap[m.key] || 0;
                        const statusLabel = pct >= 100 ? 'Meta Batida' : pct >= 75 ? 'No Ritmo' : pct >= 50 ? 'Em Evolução' : 'Atenção';
                        const statusColor = pct >= 100 ? 'bg-[#A8D419] text-[#003E58]' : pct >= 75 ? 'bg-[#D9EEF8] text-[#005A7D]' : pct >= 50 ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-800';

                        return (
                          <div
                            key={m.key}
                            className="bg-white border border-[#005A7D]/25 rounded-2xl shadow-xs flex flex-col justify-between overflow-hidden h-full min-h-0"
                          >
                            <div className={`${m.headerBg} border-b-2 border-[#A8D419] px-4 py-1.5 flex items-center justify-between shrink-0`}>
                              <div className="flex items-center gap-2">
                                <Factory className="w-4 h-4 text-[#C5F028]" />
                                <span className="text-sm lg:text-base font-black text-white uppercase tracking-wider">{m.label}</span>
                                <span className="text-[10px] font-bold text-[#CBE7F2] uppercase">· {formatJumboUnits(calcJumboUnits(target))}</span>
                              </div>
                              <span className="text-base lg:text-lg font-mono tabular-nums font-black text-[#C5F028] leading-none">
                                {pct.toFixed(1)}%
                              </span>
                            </div>
                            <div className="px-4 py-2 flex-1 flex flex-col justify-center gap-2">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-3xl lg:text-4xl xl:text-[42px] font-black text-[#003E58] font-mono tabular-nums leading-none">
                                  {renderM2(realized, 'text-[0.42em] font-black text-[#007399] ml-0.5')}
                                </span>
                                <span className={`text-xs font-black uppercase px-2 py-0.5 rounded ${statusColor}`}>
                                  {statusLabel}
                                </span>
                              </div>
                              <div className="w-full bg-[#DCEBF2] h-3.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-[#005A7D] via-[#0086B3] to-[#A8D419] h-full rounded-full transition-all duration-1000"
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-xs xl:text-sm font-extrabold text-[#2B596E]">
                                <span>Meta: <strong className="font-mono text-[#003E58]">{renderM2(target, 'text-[0.8em] ml-0.5')}</strong></span>
                                <span>Falta: <strong className="font-mono text-rose-700">{renderM2(rem, 'text-[0.8em] ml-0.5')}</strong></span>
                              </div>
                            </div>
                            <div className="bg-[#F3FBE3] border-t border-[#A8D419]/60 px-4 py-1.5 flex items-center justify-between text-xs xl:text-sm font-extrabold text-[#003E58] shrink-0">
                              <span>Ontem: <strong className="font-mono text-base font-black">{renderM2(yest, 'text-[0.75em] ml-0.5')}</strong></span>
                              <span>Nec./dia: <strong className="font-mono text-base font-black text-amber-800">{renderM2(dailyReq, 'text-[0.75em] ml-0.5')}</strong></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SLIDE 2: DISPONIBILIDADE POR MÁQUINA (%) — VISÃO GERAL DA PLANTA (TELA CHEIA TV) */}
                {currentSlide === 2 && (
                  <div className="w-full flex-1 flex flex-col justify-between gap-2.5 h-full min-h-0 overflow-hidden">
                    {/* Cabeçalho */}
                    <div className="flex items-center justify-between border-b-2 border-[#005A7D]/20 pb-1.5 shrink-0 relative">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-7 bg-gradient-to-b from-[#005A7D] to-[#A8D419] rounded-xs shrink-0" />
                        <h2 className="text-lg md:text-2xl lg:text-3xl font-black text-[#003E58] uppercase tracking-tight leading-none flex items-center gap-2.5">
                          <Gauge className="w-6 h-6 md:w-7 md:h-7 text-[#005A7D]" /> Disponibilidade por Máquina (%) — Visão Geral da Planta
                        </h2>
                      </div>
                      <span className="text-xs md:text-sm font-mono font-black text-[#005A7D] uppercase tracking-widest">
                        Mês {dashboardMonth.split('-').reverse().join('/')} · Meta ≥ 90%
                      </span>
                      <div className="absolute bottom-[-2px] left-0 w-48 h-[3px] bg-[#A8D419]" />
                    </div>

                    {/* FAIXA 1: RESUMO CONSOLIDADO DA PLANTA (4 INDICADORES) */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
                      {/* 1. Disponibilidade Geral da Planta */}
                      {(() => {
                        const s = plantAvailability.plantSummary;
                        const statusLabel = !s.hasData ? 'Sem dados' : s.availabilityPct >= 90 ? 'Alta' : s.availabilityPct >= 80 ? 'Atenção' : 'Crítica';
                        const statusBadge = !s.hasData
                          ? 'bg-white/20 text-white'
                          : s.availabilityPct >= 90
                          ? 'bg-[#A8D419] text-[#003E58]'
                          : s.availabilityPct >= 80
                          ? 'bg-amber-400 text-[#003E58]'
                          : 'bg-rose-500 text-white';
                        return (
                          <div className="bg-gradient-to-r from-[#003E58] to-[#005A7D] text-white rounded-xl border-b-4 border-[#A8D419] px-4 py-2.5 shadow-xs flex flex-col justify-between gap-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs xl:text-sm font-black uppercase tracking-wider text-[#C5F028]">
                                Disponibilidade Geral
                              </span>
                              <span className={`text-xs font-black uppercase px-2 py-0.5 rounded ${statusBadge}`}>
                                {statusLabel}
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-3xl xl:text-4xl font-mono tabular-nums font-black text-white leading-none">
                                {s.hasData ? `${s.availabilityPct.toFixed(1).replace('.', ',')}%` : '—'}
                              </span>
                              <span className="text-xs xl:text-sm font-mono font-bold text-[#CBE7F2]">
                                {formatAvailabilityHoursDecimal(s.totalOperatingMin)} / {formatAvailabilityHoursDecimal(s.totalPlannedMin)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-extrabold text-[#D6EFF8] pt-1 border-t border-white/15">
                              <span>Disp. s/ Manut.:</span>
                              <strong className="font-mono text-sm text-[#C5F028]">
                                {s.hasData ? `${s.maintAvailabilityPct.toFixed(1).replace('.', ',')}%` : '—'}
                              </strong>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 2. Tempo Parado Manutenção */}
                      {(() => {
                        const s = plantAvailability.plantSummary;
                        return (
                          <div className="bg-gradient-to-r from-[#004A68] to-[#00668A] text-white rounded-xl border-b-4 border-amber-400 px-4 py-2.5 shadow-xs flex flex-col justify-between gap-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs xl:text-sm font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                                <Wrench className="w-3.5 h-3.5" /> Parada Manutenção
                              </span>
                              <span className="text-xs font-mono font-black bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded">
                                {s.maintSharePct.toFixed(1).replace('.', ',')}%
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-3xl xl:text-4xl font-mono tabular-nums font-black text-white leading-none">
                                {formatAvailabilityMinutesShort(s.totalManutMin)}
                              </span>
                              <span className="text-xs xl:text-sm font-mono font-bold text-[#CBE7F2]">
                                {s.totalMaintEvents} eventos
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-extrabold text-[#D6EFF8] pt-1 border-t border-white/15">
                              <span>Total Geral Parado:</span>
                              <strong className="font-mono text-sm text-white">
                                {formatAvailabilityMinutesShort(s.totalStoppedMin)}
                              </strong>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 3. Confiabilidade (MTTR / MTBF) */}
                      {(() => {
                        const s = plantAvailability.plantSummary;
                        return (
                          <div className="bg-gradient-to-r from-[#004F6B] to-[#007399] text-white rounded-xl border-b-4 border-[#A8D419] px-4 py-2.5 shadow-xs flex flex-col justify-between gap-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs xl:text-sm font-black uppercase tracking-wider text-[#C5F028]">
                                Confiabilidade
                              </span>
                              <span className="text-[11px] font-mono font-bold text-[#CBE7F2] uppercase">
                                MTTR · MTBF
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between gap-2 tabular-nums">
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl xl:text-3xl font-mono font-black text-white leading-none">
                                  {s.mttrMinutes}m
                                </span>
                                <span className="text-[10px] font-black text-[#CBE7F2] uppercase">MTTR</span>
                              </div>
                              <span className="text-white/30 font-light">|</span>
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl xl:text-3xl font-mono font-black text-[#C5F028] leading-none">
                                  {s.mtbfHours.toFixed(1).replace('.', ',')}h
                                </span>
                                <span className="text-[10px] font-black text-[#CBE7F2] uppercase">MTBF</span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs font-extrabold text-[#D6EFF8] pt-1 border-t border-white/15">
                              <span>Proc.: <strong className="font-mono text-white">{formatAvailabilityMinutesShort(s.totalProcMin)}</strong></span>
                              <span>Outros: <strong className="font-mono text-white">{formatAvailabilityMinutesShort(s.totalOutrosMin)}</strong></span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* 4. OEE Consolidado da Planta */}
                      {(() => {
                        const s = plantAvailability.plantSummary;
                        return (
                          <div className="bg-gradient-to-r from-[#003E58] via-[#005A7D] to-[#006C94] text-white rounded-xl border-b-4 border-[#C5F028] px-4 py-2.5 shadow-xs flex flex-col justify-between gap-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs xl:text-sm font-black uppercase tracking-wider text-[#C5F028]">
                                OEE Consolidado
                              </span>
                              <span className="text-xs font-mono font-black text-[#CBE7F2]">
                                {s.activeMachinesCount}/6 máq. ativas
                              </span>
                            </div>
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-3xl xl:text-4xl font-mono tabular-nums font-black text-white leading-none">
                                {s.hasData ? `${s.weightedOee.toFixed(1).replace('.', ',')}%` : '—'}
                              </span>
                              <span className="text-xs font-mono font-bold text-[#C5F028]">
                                Perf {s.weightedPerf.toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs font-extrabold text-[#D6EFF8] pt-1 border-t border-white/15">
                              <span>Disp: <strong className="font-mono text-white">{s.availabilityPct.toFixed(1)}%</strong></span>
                              <span>Qual: <strong className="font-mono text-white">{s.weightedQual.toFixed(1)}%</strong></span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* FAIXA 2: GRADE 2x3 EM TELA CHEIA — TODAS AS 6 MÁQUINAS DA PLANTA */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2 gap-2.5 flex-1 min-h-0">
                      {plantAvailability.machineMetrics.map((m) => {
                        const statusLabel = !m.hasData
                          ? 'Sem dados'
                          : m.availabilityPct >= 90
                          ? 'Alta'
                          : m.availabilityPct >= 80
                          ? 'Atenção'
                          : 'Crítica';

                        const statusClass = !m.hasData
                          ? 'bg-slate-200 text-slate-700'
                          : m.availabilityPct >= 90
                          ? 'bg-[#A8D419] text-[#003E58]'
                          : m.availabilityPct >= 80
                          ? 'bg-amber-400 text-[#003E58]'
                          : 'bg-rose-500 text-white';

                        const barColor = !m.hasData
                          ? 'bg-slate-300'
                          : m.availabilityPct >= 90
                          ? 'bg-gradient-to-r from-[#16A34A] to-[#A8D419]'
                          : m.availabilityPct >= 80
                          ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                          : 'bg-gradient-to-r from-rose-600 to-rose-500';

                        const headerBg =
                          m.sector === 'Extrusão'
                            ? m.machine === 'Cast 1'
                              ? 'bg-[#003E58]'
                              : 'bg-[#005A7D]'
                            : m.sector === 'Reciclagem'
                            ? 'bg-[#004A68]'
                            : 'bg-[#006C94]';

                        const footerBg =
                          m.sector === 'Corte de Fita'
                            ? 'bg-[#F3FBE3] border-[#A8D419]/60'
                            : m.sector === 'Reciclagem'
                            ? 'bg-[#E8F6EC] border-[#005A7D]/15'
                            : 'bg-[#E7F3F8] border-[#005A7D]/15';

                        const valueColor = !m.hasData
                          ? 'text-slate-400'
                          : m.availabilityPct >= 90
                          ? 'text-[#042838]'
                          : m.availabilityPct >= 80
                          ? 'text-amber-700'
                          : 'text-rose-700';

                        return (
                          <div
                            key={m.machine}
                            className="bg-white border border-[#005A7D]/25 rounded-2xl shadow-xs flex flex-col justify-between overflow-hidden h-full min-h-0"
                          >
                            {/* Cabeçalho da Máquina */}
                            <div className={`${headerBg} border-b-2 border-[#A8D419] px-4 py-2 flex items-center justify-between shrink-0`}>
                              <div className="flex items-center gap-2 min-w-0">
                                {m.sector === 'Reciclagem' ? (
                                  <RefreshCw className="w-4 h-4 text-[#C5F028] shrink-0" />
                                ) : (
                                  <Factory className="w-4 h-4 text-[#C5F028] shrink-0" />
                                )}
                                <span className="text-base lg:text-lg font-black text-white uppercase tracking-wider truncate">
                                  {m.machine}
                                </span>
                                <span className="text-xs font-bold text-[#CBE7F2] uppercase whitespace-nowrap">
                                  · {m.sector === 'Corte de Fita' ? 'Fita' : m.sector}
                                </span>
                              </div>
                              <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded shrink-0 ${statusClass}`}>
                                {statusLabel}
                              </span>
                            </div>

                            {/* Corpo Principal com Números de TV à Distância */}
                            <div className="px-4 py-2 flex-1 flex flex-col justify-center gap-2.5 min-h-0">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className={`text-4xl lg:text-5xl xl:text-[54px] 2xl:text-[62px] font-black font-mono tabular-nums leading-none tracking-tight ${valueColor}`}>
                                  {m.hasData ? `${m.availabilityPct.toFixed(1).replace('.', ',')}%` : '—'}
                                </span>
                                <div className="text-right shrink-0">
                                  <div className="text-[11px] font-black uppercase tracking-wider text-[#2B596E]">OEE</div>
                                  <div className="text-xl lg:text-2xl xl:text-3xl font-mono tabular-nums font-black text-[#005A7D] leading-none">
                                    {m.hasData ? `${m.oeePct.toFixed(1).replace('.', ',')}%` : '—'}
                                  </div>
                                </div>
                              </div>

                              {/* Barra de Progresso com Marca de Meta 90% */}
                              <div className="relative w-full bg-[#DCEBF2] h-3.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                                  style={{ width: `${m.hasData ? Math.min(100, m.availabilityPct) : 0}%` }}
                                />
                                <div
                                  className="absolute top-0 bottom-0 w-0.5 bg-[#003E58]/60"
                                  style={{ left: '90%' }}
                                  title="Meta 90%"
                                />
                              </div>

                              {/* 3 Indicadores Completos do Card (Disp. c/ Manut., Parada Manut., Parada Total) */}
                              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#005A7D]/10 tabular-nums">
                                <div className="min-w-0">
                                  <div className="text-[11px] xl:text-xs font-bold text-[#2B596E] truncate">Disp. c/ Manut.</div>
                                  <div className="text-base lg:text-lg xl:text-xl font-mono font-black text-[#003E58] leading-tight">
                                    {m.hasData ? `${m.maintAvailabilityPct.toFixed(1).replace('.', ',')}%` : '—'}
                                  </div>
                                </div>
                                <div className="min-w-0 text-center">
                                  <div className="text-[11px] xl:text-xs font-bold text-[#2B596E] truncate">Parada Manut.</div>
                                  <div className="text-base lg:text-lg xl:text-xl font-mono font-black text-orange-700 leading-tight">
                                    {formatAvailabilityMinutesShort(m.manutMin)}
                                  </div>
                                </div>
                                <div className="min-w-0 text-right">
                                  <div className="text-[11px] xl:text-xs font-bold text-[#2B596E] truncate">Parada Total</div>
                                  <div className="text-base lg:text-lg xl:text-xl font-mono font-black text-[#003E58] leading-tight">
                                    {formatAvailabilityMinutesShort(m.totalStoppedMin)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Rodapé Operacional */}
                            <div className={`${footerBg} border-t px-4 py-1.5 flex items-center justify-between text-xs xl:text-sm font-extrabold text-[#003E58] shrink-0 tabular-nums`}>
                              <span>
                                Operando:{' '}
                                <strong className="font-mono font-black">
                                  {m.hasData ? `${m.operatingHours.toFixed(1).replace('.', ',')}h / ${m.plannedHours.toFixed(1).replace('.', ',')}h` : '—'}
                                </strong>
                              </span>
                              <span>
                                MTBF:{' '}
                                <strong className="font-mono font-black text-[#005A7D]">
                                  {m.hasData ? `${m.mtbfHours.toFixed(1).replace('.', ',')}h` : '—'}
                                </strong>
                                <span className="mx-1.5 opacity-40">·</span>
                                MTTR:{' '}
                                <strong className="font-mono font-black text-amber-800">
                                  {m.hasData ? `${m.mttrMinutes}m` : '—'}
                                </strong>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SLIDE 3: SETOR CORTE DE FITA — PRODUÇÃO, MÁQUINAS & OPERADORES */}
                {currentSlide === 3 && (
                  <div className="w-full flex-1 flex flex-col justify-between gap-2.5 h-full min-h-0 overflow-hidden">
                    <div className="flex items-center justify-between border-b-2 border-[#005A7D]/20 pb-1.5 shrink-0 relative">
                      <div className="flex items-center gap-2.5">
                        <span className="w-1.5 h-6 bg-[#A8D419] rounded-xs shrink-0" />
                        <h2 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-black text-[#005A7D] uppercase tracking-tight leading-none flex items-center gap-2">
                          <Factory className="w-6 h-6 text-[#0077A3]" /> Setor Corte de Fita · Lintech, Ghezzi &amp; Wultec
                        </h2>
                      </div>
                      <span className="hidden sm:inline-block text-xs font-mono font-black text-[#005A7D] uppercase tracking-widest">
                        Produção Diária (m²) &amp; Qualidade
                      </span>
                      <div className="absolute bottom-[-2px] left-0 w-36 h-[2px] bg-[#A8D419]" />
                    </div>

                    {/* Top 4 Ribbon KPIs */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
                      <div className="bg-gradient-to-r from-[#004A68] to-[#006C94] text-white rounded-xl p-3 border-b-4 border-b-[#A8D419] shadow-xs">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#C5F028] block">Acumulado Mês (Fita)</span>
                        <div className="text-3xl xl:text-4xl font-mono tabular-nums font-black leading-none mt-1">
                          {renderM2(metrics.ribbonMonthM2, 'text-[0.45em] text-[#C5F028] ml-1')}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#CBE7F2] font-bold mt-2 pt-1 border-t border-white/15">
                          <span>Ontem: <strong className="text-white font-mono">{renderM2(metrics.ribbonYesterdayM2, 'text-[0.8em] ml-0.5')}</strong></span>
                          <span>Hoje: <strong className="text-[#C5F028] font-mono">{renderM2(metrics.ribbonTodayM2, 'text-[0.8em] ml-0.5')}</strong></span>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-3 border border-[#005A7D]/20 border-t-4 border-t-[#0077A3] shadow-xs">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#005A7D] block">Projeção Mês (Fita)</span>
                        <div className="text-3xl xl:text-4xl font-mono tabular-nums font-black text-[#005A7D] leading-none mt-1">
                          {renderM2(metrics.ribbonProjectedMonthM2)}
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#2B596E] font-bold mt-2 pt-1 border-t border-[#005A7D]/10">
                          <span>Média/Dia: <strong className="text-[#042838] font-mono">{renderM2(metrics.ribbonAvgDailyM2, 'text-[0.8em] ml-0.5')}</strong></span>
                          {metrics.ribbonVar !== null && (
                            <span className={`font-mono font-black ${metrics.ribbonVar >= 0 ? 'text-[#5C8F00]' : 'text-rose-600'}`}>
                              {metrics.ribbonVar >= 0 ? '+' : ''}{metrics.ribbonVar.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-3 border border-[#005A7D]/20 border-t-4 border-t-amber-500 shadow-xs">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#005A7D] block">Não Conforme &amp; Lixo</span>
                        <div className="text-3xl xl:text-4xl font-mono tabular-nums font-black text-amber-600 leading-none mt-1 flex items-baseline gap-2">
                          <span>{renderM2(metrics.ribbonMonthRejectedM2)}</span>
                          <span className="text-sm font-black text-rose-600">({metrics.ribbonRejectPerc.toFixed(1)}%)</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#2B596E] font-bold mt-2 pt-1 border-t border-[#005A7D]/10">
                          <span>Lixo: <strong className="text-rose-700 font-mono">{renderWeight(metrics.ribbonMonthWasteKg, 'text-[0.8em] ml-0.5')}</strong></span>
                          <span>Jumbo: <strong className="text-[#042838] font-mono">{renderM2(metrics.ribbonMonthJumboM2, 'text-[0.8em] ml-0.5')}</strong></span>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-3 border border-[#005A7D]/20 border-t-4 border-t-[#A8D419] shadow-xs">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#005A7D] block">Rolos &amp; Paradas Fita</span>
                        <div className="text-3xl xl:text-4xl font-mono tabular-nums font-black text-[#042838] leading-none mt-1">
                          {metrics.ribbonMonthRolls.toLocaleString('pt-BR')} <span className="text-sm font-black text-[#0077A3]">rolos</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#2B596E] font-bold mt-2 pt-1 border-t border-[#005A7D]/10">
                          <span>Paradas: <strong className="text-rose-700 font-mono">{metrics.ribbonTotalParadasMin} min</strong></span>
                          <span className="font-mono font-black text-[#005A7D]">{metrics.ribbonTotalParadasHoras} h</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle + Bottom Split: Left = Daily Chart by Machine (8 cols) | Right = Top Ribbon Operators + Per Machine (4 cols) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 flex-1 min-h-0">
                      {/* Daily Chart by Machine */}
                      <div className="lg:col-span-8 bg-white border border-[#005A7D]/25 rounded-2xl shadow-xs flex flex-col justify-between overflow-hidden min-h-0">
                        <div className="bg-[#005A7D] border-b-2 border-[#A8D419] px-4 py-2 flex items-center justify-between shrink-0 flex-wrap gap-2">
                          <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-[#C5F028]" /> Produção Diária por Cortadora (m²)
                          </h3>
                          <div className="flex items-center gap-4 text-xs font-extrabold text-white">
                            <span className="flex items-center gap-1.5">
                              <span className="w-3 h-3 rounded-xs bg-[#005A7D] border border-white/60"></span> Lintech
                            </span>
                            <span className="flex items-center gap-1.5 text-sky-200">
                              <span className="w-3 h-3 rounded-xs bg-[#0096C7]"></span> Ghezzi
                            </span>
                            <span className="flex items-center gap-1.5 text-[#C5F028]">
                              <span className="w-3 h-3 rounded-xs bg-[#A8D419]"></span> Wultec
                            </span>
                          </div>
                        </div>

                        <div className="w-full flex-1 min-h-0 p-2 md:p-3">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={metrics.ribbonDailyChartData} margin={{ top: 18, right: 16, left: 4, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#D5E5EE" vertical={false} />
                              <XAxis dataKey="day" stroke="#005A7D" tick={{ fill: '#042838', fontSize: 12, fontWeight: 800 }} />
                              <YAxis stroke="#005A7D" tick={{ fill: '#005A7D', fontSize: 12, fontWeight: 700 }} tickFormatter={(val: number) => `${formatNumDot(val, 0, 0)}`} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#005A7D', borderRadius: '0.75rem', fontSize: '13px', fontWeight: 'bold' }}
                                formatter={(value: number, name: string) => [`${formatNumDot(value, 0, 0)} m²`, name]}
                              />
                              <Bar dataKey="lintech" name="Lintech" fill="#005A7D" stackId="fita" />
                              <Bar dataKey="ghezzi" name="Ghezzi" fill="#0096C7" stackId="fita" />
                              <Bar dataKey="wultec" name="Wultec" fill="#A8D419" stackId="fita" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Right Panel: Machine Totals + Top Operators Fita */}
                      <div className="lg:col-span-4 flex flex-col gap-2.5 min-h-0 overflow-hidden">
                        {/* 3 Cortadoras Resumo */}
                        <div className="bg-white border border-[#005A7D]/25 rounded-2xl shadow-xs overflow-hidden shrink-0">
                          <div className="bg-[#005A7D] border-b-2 border-[#A8D419] px-3.5 py-1.5">
                            <h4 className="text-[11px] font-black text-white uppercase tracking-wider">Desempenho por Cortadora</h4>
                          </div>
                          <div className="divide-y divide-[#005A7D]/12">
                            {(['Lintech', 'Ghezzi', 'Wultec'] as const).map((mName) => {
                              const total = metrics.ribbonMachineMonthMap[mName] || 0;
                              const share = metrics.ribbonMonthM2 > 0 ? (total / metrics.ribbonMonthM2) * 100 : 0;
                              return (
                                <div key={mName} className="px-3.5 py-2 flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <span className="text-xs font-black text-[#005A7D] uppercase block">{mName}</span>
                                    <span className="text-[10px] font-bold text-[#2B596E]">
                                      {share.toFixed(0)}% do setor · NC: {formatNumDot(metrics.ribbonMachineRejectedMap[mName] || 0, 0, 0)} m²
                                    </span>
                                  </div>
                                  <span className="text-lg xl:text-xl font-mono tabular-nums font-black text-[#042838] shrink-0">
                                    {renderM2(total, 'text-[0.65em] text-[#0077A3] ml-0.5')}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Ranking Operadores da Fita */}
                        <div className="bg-white border border-[#005A7D]/25 rounded-2xl shadow-xs overflow-hidden flex-1 flex flex-col min-h-0">
                          <div className="bg-[#004A68] border-b-2 border-[#A8D419] px-3.5 py-1.5 shrink-0 flex items-center justify-between">
                            <h4 className="text-[11px] font-black text-[#C5F028] uppercase tracking-wider flex items-center gap-1.5">
                              <Trophy className="w-3.5 h-3.5" /> Ranking Operadores Fita
                            </h4>
                            <span className="text-[10px] font-mono text-white/80">Top 4</span>
                          </div>
                          <div className="divide-y divide-[#005A7D]/12 flex-1 overflow-hidden flex flex-col justify-center">
                            {metrics.topRibbonOperators.length === 0 ? (
                              <div className="p-4 text-center text-xs font-bold text-[#2B596E]">
                                Sem lançamentos de Corte de Fita no mês
                              </div>
                            ) : (
                              metrics.topRibbonOperators.slice(0, 4).map((op, i) => (
                                <div key={op.name} className="px-3.5 py-2 flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`w-6 h-6 rounded-md text-xs font-black flex items-center justify-center shrink-0 ${
                                      i === 0 ? 'bg-[#A8D419] text-[#00334A]' : 'bg-[#E7F3F8] text-[#005A7D]'
                                    }`}>
                                      {i === 0 ? '🥇' : `#${i + 1}`}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="text-xs font-black text-[#042838] truncate">{op.name}</p>
                                      <p className="text-[10px] font-bold text-[#2B596E] uppercase">{op.machine}</p>
                                    </div>
                                  </div>
                                  <span className="text-sm xl:text-base font-mono tabular-nums font-black text-[#005A7D] shrink-0">
                                    {renderM2(op.totalM2, 'text-[0.7em] ml-0.5')}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SLIDE 4: TENDÊNCIA EVOLUTIVA DE FILTRO DE TEMPO (MoM / YoY) */}
                {currentSlide === 4 && (
                  <div className="w-full flex-1 flex flex-col justify-between gap-2.5 md:gap-3 overflow-hidden h-full min-h-0">
                    {/* Header com Linha Estrutural Azul Logo + Verde Lima */}
                    <div className="flex items-center justify-between border-b-2 border-[#005A7D]/20 pb-2 shrink-0 relative">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-7 bg-gradient-to-b from-[#005A7D] to-[#A8D419] rounded-xs shrink-0" />
                        <h2 className="text-lg md:text-2xl lg:text-3xl font-black text-[#003E58] uppercase tracking-tight flex items-center gap-2.5">
                          <TrendingUp className="w-6 h-6 md:w-7 md:h-7 text-[#005A7D]" /> Tendência Evolutiva de Filtro de Tempo (MoM / YoY)
                        </h2>
                      </div>
                      <span className="hidden sm:inline-block text-xs md:text-sm font-mono font-black text-[#005A7D] uppercase tracking-widest">
                        Análise Histórica &amp; Crescimento
                      </span>
                      <div className="absolute bottom-[-2px] left-0 w-40 h-[3px] bg-[#A8D419]" />
                    </div>

                    {/* TOP: Main Composed Chart */}
                    <div className="w-full flex-1 min-h-0 bg-white border border-[#005A7D]/25 rounded-2xl shadow-sm flex flex-col justify-between overflow-hidden">
                      <div className="bg-gradient-to-r from-[#003E58] via-[#005A7D] to-[#007399] border-b-2 border-[#A8D419] px-4 py-2 flex items-center justify-between shrink-0 flex-wrap gap-2">
                        <h3 className="text-xs md:text-sm lg:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <Activity className="w-4 h-4 md:w-5 md:h-5 text-[#C5F028]" /> Produção Líquida (kg) vs Taxa de Descarte (%)
                        </h3>
                        <div className="flex items-center gap-4 text-xs md:text-sm font-extrabold text-white">
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-xs bg-[#0082B3] border border-white/40"></span> Vol. Produção
                          </span>
                          <span className="flex items-center gap-1.5 text-rose-200">
                            <span className="w-3.5 h-0.5 bg-rose-400"></span> Índice Descarte %
                          </span>
                          <span className="flex items-center gap-1.5 text-[#C5F028]">
                            <span className="w-3.5 h-0.5 bg-[#C5F028]"></span> Eco A %
                          </span>
                        </div>
                      </div>

                      <div className="w-full flex-1 min-h-0 p-2 md:p-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={metrics.monthlyTimelineData} margin={{ top: 55, right: 30, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#D2E4EC" vertical={false} />
                            <XAxis dataKey="fullLabel" stroke="#005A7D" tick={{ fill: '#042838', fontSize: 13, fontWeight: 800 }} />
                            <YAxis
                              yAxisId="left"
                              stroke="#005A7D"
                              tick={{ fill: '#003E58', fontSize: 13, fontWeight: 700 }}
                              tickFormatter={(val: number) => formatWeightStr(val)}
                            />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              stroke="#DC2626"
                              domain={[0, 'auto']}
                              tick={{ fill: '#B91C1C', fontSize: 13, fontWeight: 700 }}
                              tickFormatter={(val: number) => `${formatNumDot(val, 1, 1)}%`}
                            />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#ffffff', borderColor: '#005A7D', borderRadius: '0.75rem', boxShadow: '0 10px 15px -3px rgba(0,90,125,0.16)', fontSize: '14px', fontWeight: 'bold' }}
                              formatter={(value: any, name: any) => {
                                if (name === 'Produção Líquida') return [formatWeightStr(Number(value)), 'Produção Líquida'];
                                if (name === 'Taxa de Descarte %') return [`${formatNumDot(Number(value), 1, 2)}%`, 'Índice de Perda'];
                                return [`${formatNumDot(Number(value), 1, 2)}%`, 'Envio Eco A'];
                              }}
                            />
                            <Bar yAxisId="left" dataKey="producao" name="Produção Líquida" fill="#005A7D" radius={[6, 6, 0, 0]} barSize={42}>
                              <LabelList
                                dataKey="producao"
                                content={(props: any) => {
                                  const { x, y, width, value, index, payload } = props;
                                  const item = payload || metrics.monthlyTimelineData[index];
                                  if (!item) return null;

                                  const prodVal = item.producao ?? value;
                                  let numStr = '';
                                  let unitStr = 'kg';
                                  if (prodVal !== undefined && prodVal !== null) {
                                    const absVal = Math.abs(prodVal);
                                    if (absVal >= 1000) {
                                      numStr = formatNumDot(prodVal / 1000, 1, 1);
                                      unitStr = 'T';
                                    } else {
                                      numStr = formatNumDot(prodVal, 0, 0);
                                    }
                                  }

                                  const perdaVal = item.perdaPerc;
                                  const perdaStr = (perdaVal !== undefined && perdaVal !== null) ? `${formatNumDot(perdaVal, 1, 1)}%` : '';

                                  const ecoAVal = item.ecoAPerc;
                                  const ecoAStr = (ecoAVal !== undefined && ecoAVal !== null) ? `${formatNumDot(ecoAVal, 1, 1)}%` : '';

                                  return (
                                    <g transform={`translate(${x + width / 2},${y - 50})`}>
                                      <text textAnchor="middle" y={0} fill="#003E58" fontWeight={900}>
                                        <tspan fontSize={14}>{numStr}</tspan>
                                        <tspan fontSize={10} fontWeight={900} dx={1}>{unitStr}</tspan>
                                      </text>

                                      {perdaStr && (
                                        <text textAnchor="middle" y={16} fill="#DC2626" fontWeight={900} fontSize={13}>
                                          {perdaStr}
                                        </text>
                                      )}

                                      {ecoAStr && (
                                        <text textAnchor="middle" y={32} fill="#6F9900" fontWeight={900} fontSize={13}>
                                          {ecoAStr}
                                        </text>
                                      )}
                                    </g>
                                  );
                                }}
                              />
                            </Bar>
                            <Line yAxisId="right" type="monotone" dataKey="perdaPerc" name="Taxa de Descarte %" stroke="#DC2626" strokeWidth={3} dot={{ r: 5 }} />
                            <Line yAxisId="right" type="monotone" dataKey="ecoAPerc" name="Eco A %" stroke="#84B800" strokeWidth={3} strokeDasharray="4 4" dot={{ r: 4, fill: '#A8D419', stroke: '#005A7D' }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* BOTTOM: 4 Compact High-Impact Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full shrink-0 lg:h-[152px] xl:h-[164px]">
                      {/* Card 1: Crescimento Mensal (MoM) */}
                      <div className="bg-white border border-[#005A7D]/25 rounded-2xl shadow-sm flex flex-col justify-between h-full overflow-hidden">
                        <div className="bg-[#005A7D] border-b-2 border-[#A8D419] px-3.5 py-1.5 flex items-center justify-between shrink-0">
                          <span className="text-[11px] font-black text-white uppercase tracking-wider">
                            Crescimento Mensal (MoM)
                          </span>
                          {metrics.prodVar !== null && (
                            <span className={`text-[11px] font-black px-2 py-0.5 rounded font-mono tabular-nums ${
                              metrics.prodVar >= 0 ? 'bg-[#A8D419] text-[#003E58]' : 'bg-rose-600 text-white'
                            }`}>
                              {metrics.prodVar >= 0 ? '+' : ''}{formatNumDot(metrics.prodVar, 1, 1)}%
                            </span>
                          )}
                        </div>
                        <div className="px-3.5 py-1 text-3xl lg:text-4xl xl:text-[2.6rem] font-black text-[#042838] font-mono tabular-nums my-auto leading-none tracking-tight">
                          {renderWeight(metrics.prodMonthTotal)}
                        </div>
                        <p className="bg-[#E7F3F8] text-xs font-extrabold text-[#0B394F] border-t border-[#005A7D]/15 px-3.5 py-1.5 flex justify-between items-center shrink-0">
                          <span>vs {metrics.prevMonthName}:</span>
                          <strong className="font-mono tabular-nums font-black text-[#005A7D] text-sm">{renderWeight(metrics.prevMonthProdTotal)}</strong>
                        </p>
                      </div>

                      {/* Card 2: Rendimento Físico */}
                      <div className="bg-white border border-[#005A7D]/25 rounded-2xl shadow-sm flex flex-col justify-between h-full overflow-hidden">
                        <div className="bg-[#007399] border-b-2 border-[#A8D419] px-3.5 py-1.5 shrink-0">
                          <span className="text-[11px] font-black text-white uppercase tracking-wider block">
                            Rendimento Físico
                          </span>
                        </div>
                        <div className="text-4xl lg:text-5xl font-mono tabular-nums font-black text-[#005A7D] my-auto text-center leading-none tracking-tight">
                          {metrics.overallYieldPercMonth.toFixed(2)}%
                        </div>
                        <div className="bg-[#E7F3F8] text-xs font-extrabold text-[#0B394F] border-t border-[#005A7D]/15 px-3.5 py-1.5 flex justify-between items-center shrink-0">
                          <span>Taxa de Descarte:</span>
                          <strong className="text-rose-700 font-mono tabular-nums font-black text-sm lg:text-base">{metrics.overallLossPercMonth.toFixed(2)}%</strong>
                        </div>
                      </div>

                      {/* Card 3: Composição de Perdas */}
                      <div className="bg-white border border-[#005A7D]/25 rounded-2xl shadow-sm flex flex-col justify-between h-full overflow-hidden">
                        <div className="bg-[#003E58] border-b-2 border-amber-400 px-3.5 py-1.5 shrink-0">
                          <span className="text-[11px] font-black text-white uppercase tracking-wider block">
                            Composição de Perdas
                          </span>
                        </div>
                        <div className="px-3.5 space-y-1 my-auto">
                          <div className="flex items-center justify-between text-xs lg:text-sm font-extrabold">
                            <span className="text-[#52390A]">Eco B (Refilo):</span>
                            <span className="font-mono tabular-nums font-black text-amber-700 text-base lg:text-lg">{renderWeight(metrics.totalEcoB)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs lg:text-sm font-extrabold pt-1 border-t border-[#005A7D]/10">
                            <span className="text-rose-900">Borra Total:</span>
                            <span className="font-mono tabular-nums font-black text-rose-700 text-base lg:text-lg">{renderWeight(metrics.totalBorra)}</span>
                          </div>
                        </div>
                        <div className="bg-[#FDF6E7] text-xs font-black text-[#042838] border-t border-amber-200 px-3.5 py-1.5 flex justify-between items-center shrink-0">
                          <span>Total Descarte:</span>
                          <strong className="font-mono tabular-nums text-rose-700 font-black text-sm lg:text-base">{renderWeight(metrics.totalEcoB + metrics.totalBorra)}</strong>
                        </div>
                      </div>

                      {/* Card 4: Histórico Mês a Mês (Auto Scroll) */}
                      <div className="bg-white border border-[#005A7D]/25 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
                        <div className="bg-[#005A7D] border-b-2 border-[#A8D419] px-3.5 py-1.5 shrink-0">
                          <h4 className="text-[11px] font-black text-white uppercase tracking-wider">
                            Histórico Mês a Mês
                          </h4>
                        </div>
                        <div
                          ref={historyScrollRef}
                          className="space-y-1 text-xs font-bold overflow-y-auto flex-1 px-3.5 py-1.5 scrollbar-none"
                          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                          {(metrics.monthlyTimelineData.length > 0
                            ? Array(10).fill(metrics.monthlyTimelineData).flat()
                            : []
                          ).map((m, idx) => (
                            <div key={`${m.monthStr}-${idx}`} className="flex items-center justify-between py-1 border-b border-[#005A7D]/12 last:border-0 shrink-0">
                              <span className="text-[#005A7D] font-extrabold">{m.fullLabel}:</span>
                              <span className="font-mono tabular-nums text-[#042838] font-black">{renderWeight(m.producao)}</span>
                              <span className={`font-mono tabular-nums text-xs font-black ${m.perdaPerc > 5 ? 'text-amber-700' : 'text-[#007399]'}`}>
                                {m.perdaPerc}% desc.
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SLIDE 5: HISTÓRICO DE PARADA DE MÁQUINA (EXTRUSÃO + CORTE DE FITA) */}
                {currentSlide === 5 && (
                  <div className="w-full flex-1 flex flex-col justify-between gap-2.5 md:gap-3 h-full min-h-0 overflow-hidden">
                    <div className="flex items-center justify-between border-b-2 border-[#005A7D]/20 pb-2 shrink-0 relative">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-7 bg-gradient-to-b from-[#005A7D] to-[#A8D419] rounded-xs shrink-0" />
                        <h2 className="text-lg md:text-2xl lg:text-3xl font-black text-[#003E58] uppercase tracking-tight flex items-center gap-2.5">
                          <Clock className="w-6 h-6 md:w-7 md:h-7 text-rose-600" /> Histórico de Parada de Máquina
                        </h2>
                      </div>
                      <span className="hidden sm:inline-block text-xs md:text-sm font-mono font-black text-[#005A7D] uppercase tracking-widest">
                        Extrusão &amp; Corte de Fita · Gestão de Paradas
                      </span>
                      <div className="absolute bottom-[-2px] left-0 w-40 h-[3px] bg-[#A8D419]" />
                    </div>

                    {/* TOP: Chart occupying upper area */}
                    <div className="w-full flex-1 flex flex-col justify-between bg-white border border-[#005A7D]/25 rounded-2xl shadow-sm min-h-0 overflow-hidden">
                      <div className="bg-gradient-to-r from-[#003E58] via-[#005A7D] to-[#007399] border-b-2 border-[#A8D419] px-4 py-2 flex items-center justify-between shrink-0 flex-wrap gap-2">
                        <h3 className="text-xs md:text-sm lg:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <Activity className="w-4 h-4 md:w-5 md:h-5 text-[#C5F028]" /> Distribuição Mensal de Minutos Parados (Extrusão)
                        </h3>
                        <div className="flex items-center gap-4 text-xs md:text-sm font-extrabold text-white">
                          <span className="flex items-center gap-1.5 text-rose-200">
                            <span className="w-3 h-3 rounded-xs bg-rose-500"></span> Manutenção
                          </span>
                          <span className="flex items-center gap-1.5 text-amber-200">
                            <span className="w-3 h-3 rounded-xs bg-amber-500"></span> Processo
                          </span>
                          <span className="flex items-center gap-1.5 text-[#CBE7F2]">
                            <span className="w-3 h-3 rounded-xs bg-[#3895B8]"></span> Outros
                          </span>
                        </div>
                      </div>

                      <div className="w-full flex-1 min-h-0 p-2 md:p-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={metrics.monthlyTimelineData} margin={{ top: 25, right: 20, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#D2E4EC" vertical={false} />
                            <XAxis dataKey="fullLabel" stroke="#005A7D" tick={{ fill: '#042838', fontSize: 13, fontWeight: 800 }} />
                            <YAxis stroke="#005A7D" tick={{ fill: '#003E58', fontSize: 13, fontWeight: 700 }} tickFormatter={(val: number) => `${val} min`} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#ffffff', borderColor: '#005A7D', borderRadius: '0.75rem', fontSize: '14px', fontWeight: 'bold' }}
                              formatter={(value: number, name: string) => [`${value} min (${(value / 60).toFixed(1)} h)`, name]}
                            />
                            <Bar dataKey="manutencao" name="Manutenção" fill="#DC2626" stackId="stoppage" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="processo" name="Processo" fill="#D97706" stackId="stoppage" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="outros" name="Outros" fill="#3895B8" stackId="stoppage" radius={[6, 6, 0, 0]}>
                              <LabelList
                                dataKey="paradasTotal"
                                position="top"
                                formatter={(val: number) => (val > 0 ? `${val} min` : '')}
                                style={{ fontSize: 13, fontWeight: 900, fill: '#991B1B' }}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* BOTTOM: 12-Col Breakdown (Extrusão Total + Extrusão Categorias + Corte de Fita) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 w-full shrink-0 lg:h-[156px] xl:h-[168px]">
                      {/* Total Extrusão Card (3 cols) */}
                      <div className="lg:col-span-3 bg-white border border-[#005A7D]/25 rounded-2xl shadow-sm flex flex-col justify-between h-full overflow-hidden">
                        <div className="bg-[#991B1B] border-b-2 border-[#A8D419] px-3.5 py-1.5 shrink-0">
                          <span className="text-[11px] font-black text-white uppercase tracking-wider block">
                            Indisponibilidade Extrusão
                          </span>
                        </div>
                        <div className="px-3.5 text-3xl lg:text-4xl font-mono tabular-nums font-black text-rose-700 my-auto leading-none">
                          {metrics.totalParadasMin} <span className="text-sm lg:text-base font-black text-rose-600">min</span>
                        </div>
                        <p className="bg-rose-50 text-xs font-extrabold text-[#042838] border-t border-rose-200 px-3.5 py-1.5 flex justify-between items-center shrink-0">
                          <span>Equivalente:</span>
                          <strong className="text-rose-800 font-mono tabular-nums font-black text-sm lg:text-base">{metrics.totalParadasHoras} h</strong>
                        </p>
                      </div>

                      {/* Detalhamento Extrusão (5 cols) */}
                      <div className="lg:col-span-5 bg-white border border-[#005A7D]/25 rounded-2xl shadow-sm flex flex-col justify-between h-full overflow-hidden">
                        <div className="bg-[#005A7D] border-b-2 border-[#A8D419] px-3.5 py-1.5 shrink-0">
                          <h4 className="text-[11px] font-black text-white uppercase tracking-wider">
                            Detalhamento Extrusão (Mês)
                          </h4>
                        </div>
                        <div className="grid grid-cols-3 divide-x divide-[#005A7D]/15 flex-1">
                          <div className="flex flex-col justify-between p-2.5 bg-rose-50/40">
                            <div>
                              <span className="text-[11px] font-black text-rose-900 uppercase block">Manutenção</span>
                              <span className="text-[9px] font-bold text-slate-600 uppercase">Corret./Prev.</span>
                            </div>
                            <span className="text-xl lg:text-2xl font-mono tabular-nums font-black text-rose-700 leading-none">{metrics.totalManutencaoMin}<span className="text-xs ml-0.5">m</span></span>
                          </div>

                          <div className="flex flex-col justify-between p-2.5 bg-amber-50/40">
                            <div>
                              <span className="text-[11px] font-black text-amber-900 uppercase block">Processo</span>
                              <span className="text-[9px] font-bold text-slate-600 uppercase">Ajustes/Trocas</span>
                            </div>
                            <span className="text-xl lg:text-2xl font-mono tabular-nums font-black text-amber-700 leading-none">{metrics.totalProcessoMin}<span className="text-xs ml-0.5">m</span></span>
                          </div>

                          <div className="flex flex-col justify-between p-2.5 bg-[#E7F3F8]/60">
                            <div>
                              <span className="text-[11px] font-black text-[#003E58] uppercase block">Outros</span>
                              <span className="text-[9px] font-bold text-slate-600 uppercase">Diversos</span>
                            </div>
                            <span className="text-xl lg:text-2xl font-mono tabular-nums font-black text-[#005A7D] leading-none">{metrics.totalOutrosMin}<span className="text-xs ml-0.5">m</span></span>
                          </div>
                        </div>
                      </div>

                      {/* Paradas Setor Corte de Fita (4 cols) */}
                      <div className="lg:col-span-4 bg-white border-2 border-[#A8D419] rounded-2xl shadow-sm flex flex-col justify-between h-full overflow-hidden">
                        <div className="bg-gradient-to-r from-[#003E58] to-[#005A7D] border-b-2 border-[#A8D419] px-3.5 py-1.5 flex items-center justify-between shrink-0">
                          <span className="text-[11px] font-black text-[#C5F028] uppercase tracking-wider">
                            Paradas · Corte de Fita (Mês)
                          </span>
                          <span className="text-xs font-mono tabular-nums font-black text-white bg-white/15 px-2 py-0.5 rounded">
                            {metrics.ribbonTotalParadasHoras} h
                          </span>
                        </div>
                        <div className="px-3.5 py-1.5 flex items-baseline justify-between my-auto">
                          <div className="text-2xl lg:text-3xl font-mono tabular-nums font-black text-[#003E58] leading-none">
                            {metrics.ribbonTotalParadasMin} <span className="text-xs font-black text-[#005A7D]">min</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums font-black">
                            <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200" title="Manutenção">M: {metrics.ribbonManutencaoMin}m</span>
                            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title="Processo">P: {metrics.ribbonProcessoMin}m</span>
                            <span className="text-[#005A7D] bg-[#E7F3F8] px-1.5 py-0.5 rounded border border-[#005A7D]/20" title="Outros">O: {metrics.ribbonOutrosMin}m</span>
                          </div>
                        </div>
                        <div className="bg-[#F3FBE3] border-t border-[#A8D419]/50 px-3.5 py-1 text-[11px] font-extrabold text-[#003E58] flex items-center justify-between shrink-0">
                          <span>Lintech · Ghezzi · Wultec</span>
                          <span className="font-black text-[#4B7000] uppercase">Mês Atual</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SLIDE 6: CORRELAÇÃO ESTRUTURADA: ECO B VS TUBETES ECO B */}
                {currentSlide === 6 && (
                  <div className="w-full flex-1 flex flex-col justify-between gap-2.5 md:gap-3 h-full min-h-0 overflow-hidden">
                    <div className="flex items-center justify-between border-b-2 border-[#005A7D]/20 pb-2 shrink-0 relative">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-7 bg-gradient-to-b from-[#005A7D] to-[#A8D419] rounded-xs shrink-0" />
                        <h2 className="text-lg md:text-2xl lg:text-3xl font-black text-[#003E58] uppercase tracking-tight flex items-center gap-2.5">
                          <Scale className="w-6 h-6 md:w-7 md:h-7 text-amber-600" /> Correlação Estruturada: Eco B vs Tubetes Eco B
                        </h2>
                      </div>
                      <span className="hidden sm:inline-block text-xs md:text-sm font-mono font-black text-[#005A7D] uppercase tracking-widest">
                        Análise de Densidade &amp; Insumos
                      </span>
                      <div className="absolute bottom-[-2px] left-0 w-40 h-[3px] bg-[#A8D419]" />
                    </div>

                    {/* TOP: Dual Axis Composed Chart */}
                    <div className="w-full flex-1 min-h-0 bg-white border border-[#005A7D]/25 rounded-2xl shadow-sm flex flex-col justify-between overflow-hidden">
                      <div className="bg-gradient-to-r from-[#003E58] via-[#005A7D] to-[#007399] border-b-2 border-[#A8D419] px-4 py-2 flex items-center justify-between shrink-0 flex-wrap gap-2">
                        <h3 className="text-xs md:text-sm lg:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <Activity className="w-4 h-4 md:w-5 md:h-5 text-[#C5F028]" /> Histórico Diário: Eco B (Barras, Eixo Esq.) vs Tubetes (Linha, Eixo Dir.)
                        </h3>
                        <div className="flex items-center gap-4 text-xs md:text-sm font-extrabold text-white">
                          <span className="flex items-center gap-1.5 text-amber-200">
                            <span className="w-3 h-3 rounded-xs bg-amber-500"></span> Eco B (kg)
                          </span>
                          <span className="flex items-center gap-1.5 text-[#C5F028]">
                            <span className="w-3.5 h-0.5 bg-[#C5F028]"></span> Tubetes (un)
                          </span>
                        </div>
                      </div>

                      <div className="w-full flex-1 min-h-0 p-2 md:p-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={metrics.dailyEcoBTubetesData} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#D2E4EC" vertical={false} />
                            <XAxis dataKey="dateBR" stroke="#005A7D" tick={{ fill: '#042838', fontSize: 13, fontWeight: 800 }} />
                            <YAxis
                              yAxisId="left"
                              stroke="#D97706"
                              tick={{ fill: '#B45309', fontSize: 13, fontWeight: 700 }}
                              tickFormatter={(val: number) => formatWeightStr(val)}
                            />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              stroke="#005A7D"
                              tick={{ fill: '#003E58', fontSize: 13, fontWeight: 700 }}
                              tickFormatter={(val: number) => `${val} un`}
                            />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#ffffff', borderColor: '#005A7D', borderRadius: '0.75rem', fontSize: '14px', fontWeight: 'bold' }}
                              formatter={(value: any, name: string) => {
                                if (name === 'Eco B Gerado') return [formatWeightStr(Number(value)), 'Eco B Gerado'];
                                return [`${Number(value).toLocaleString('pt-BR')} un`, 'Tubetes Usados'];
                              }}
                            />
                            <Bar yAxisId="left" dataKey="ecoB" name="Eco B Gerado" fill="#D97706" radius={[6, 6, 0, 0]} barSize={36}>
                              <LabelList
                                dataKey="ecoB"
                                position="top"
                                formatter={(val: number) => (val > 0 ? formatWeightStr(val) : '')}
                                style={{ fontSize: 10, fontWeight: 800, fill: '#92400E' }}
                              />
                            </Bar>
                            <Line yAxisId="right" type="monotone" dataKey="tubetesEcoB" name="Tubetes Usados" stroke="#005A7D" strokeWidth={3} dot={{ r: 5, fill: '#A8D419', stroke: '#003E58', strokeWidth: 2 }}>
                              <LabelList
                                dataKey="tubetesEcoB"
                                position="top"
                                formatter={(val: number) => (val > 0 ? `${val} un` : '')}
                                style={{ fontSize: 10, fontWeight: 800, fill: '#003E58' }}
                              />
                            </Line>
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* BOTTOM: 2 Compact High-Impact KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full shrink-0 lg:h-[148px] xl:h-[160px]">
                      {/* Card 1: Volume Total de Eco B */}
                      <div className="bg-white border border-[#005A7D]/25 rounded-2xl shadow-sm flex flex-col justify-between h-full overflow-hidden">
                        <div className="bg-[#003E58] border-b-2 border-amber-400 px-4 py-1.5 shrink-0">
                          <span className="text-xs font-black text-white uppercase tracking-wider block">
                            Volume Total de Eco B (Mês)
                          </span>
                        </div>
                        <div className="px-4 text-4xl lg:text-5xl font-mono tabular-nums font-black text-amber-600 my-auto leading-none">
                          {renderWeight(metrics.totalEcoB)}
                        </div>
                        <div className="bg-[#FDF6E7] text-xs lg:text-sm font-bold text-[#52390A] border-t border-amber-200 px-4 py-1.5 flex justify-between items-center shrink-0">
                          <span>Eco BP: <strong className="text-[#042838] font-mono tabular-nums font-black">{renderWeight(metrics.totalEcoBP)}</strong></span>
                          <span>Eco BM: <strong className="text-[#042838] font-mono tabular-nums font-black">{renderWeight(metrics.totalEcoBM)}</strong></span>
                        </div>
                      </div>

                      {/* Card 2: Tubetes Consumed & Ratio */}
                      <div className="bg-white border border-[#005A7D]/25 rounded-2xl shadow-sm flex flex-col justify-between h-full overflow-hidden">
                        <div className="bg-[#005A7D] border-b-2 border-[#A8D419] px-4 py-1.5 shrink-0">
                          <span className="text-xs font-black text-white uppercase tracking-wider block">
                            Tubetes Eco B Consumidos
                          </span>
                        </div>
                        <div className="px-4 text-4xl lg:text-5xl font-mono tabular-nums font-black text-[#003E58] my-auto leading-none">
                          {metrics.totalTubetesMonth.toLocaleString('pt-BR')} <span className="text-sm lg:text-base font-black text-[#007399]">unidades</span>
                        </div>
                        <div className="bg-[#E7F3F8] text-xs lg:text-sm font-extrabold text-[#0B394F] border-t border-[#005A7D]/15 px-4 py-1.5 flex justify-between items-center shrink-0">
                          <span>Relação Média:</span>
                          <span className="text-base lg:text-lg font-mono tabular-nums font-black text-[#005A7D]">
                            {renderWeight(metrics.overallRatioMonth, 'text-[0.6em] font-black opacity-80 ml-0.5', '/ Tubete')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SLIDE 7: RANKING DE OPERADORES (EXTRUSÃO + CORTE DE FITA) */}
                {currentSlide === 7 && (
                  <div className="w-full flex-1 flex flex-col justify-between gap-2.5 md:gap-3 h-full min-h-0 overflow-hidden">
                    <div className="flex items-center justify-between border-b-2 border-[#005A7D]/20 pb-2 shrink-0 flex-wrap gap-2 relative">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-7 bg-gradient-to-b from-[#005A7D] to-[#A8D419] rounded-xs shrink-0" />
                        <h2 className="text-lg md:text-2xl lg:text-3xl font-black text-[#003E58] uppercase tracking-tight flex items-center gap-2.5">
                          <Award className="w-6 h-6 md:w-7 md:h-7 text-[#84B800]" /> Ranking de Melhores Operadores do Mês
                        </h2>
                      </div>
                      <span className="text-xs md:text-sm font-mono font-black text-[#005A7D] uppercase tracking-widest">
                        Extrusão &amp; Corte de Fita · Líderes de Produtividade
                      </span>
                      <div className="absolute bottom-[-2px] left-0 w-40 h-[3px] bg-[#A8D419]" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 items-stretch">
                      {/* LEFT 8 COLS: Extrusão Top 6 */}
                      <div className="lg:col-span-8 flex flex-col min-h-0 gap-2">
                        <div className="flex items-center justify-between px-1 shrink-0">
                          <span className="text-[11px] font-black text-[#005A7D] uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#005A7D]" /> Setor Extrusão (Top 6)
                          </span>
                          <span className="text-[10px] font-bold text-[#2B596E] uppercase">Cast 1 &amp; Cast 2</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 min-h-0">
                          {metrics.topOperators.slice(0, 6).map((op, index) => {
                            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                            const isTop3 = index < 3;

                            return (
                              <div
                                key={index}
                                className={`bg-white rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden transition-all ${
                                  op.isDisqualified
                                    ? 'border-2 border-rose-400 bg-rose-50/30'
                                    : index === 0
                                    ? 'border-2 border-[#A8D419] shadow-md'
                                    : isTop3
                                    ? 'border border-[#005A7D]/35'
                                    : 'border border-[#005A7D]/20'
                                }`}
                              >
                                {index === 0 && !op.isDisqualified && <ContinuousConfettiOverlay />}

                                <div className={`relative z-10 px-3.5 py-1 flex items-center justify-between border-b-2 ${
                                  op.isDisqualified
                                    ? 'bg-rose-700 border-rose-400 text-white'
                                    : index === 0
                                    ? 'bg-gradient-to-r from-[#003E58] to-[#005A7D] border-[#A8D419] text-[#C5F028]'
                                    : isTop3
                                    ? 'bg-[#005A7D] border-[#A8D419]/80 text-white'
                                    : 'bg-[#E7F3F8] border-[#005A7D]/20 text-[#003E58]'
                                }`}>
                                  <span className="text-[10px] font-black uppercase tracking-widest">
                                    {op.isDisqualified ? 'Desqualificado' : `${index + 1}º Lugar · ${op.machine || 'Extrusão'}`}
                                  </span>
                                  <span className="text-sm leading-none">{op.isDisqualified ? '⛔' : medal}</span>
                                </div>

                                <div className="relative z-10 flex items-center gap-3 px-3.5 py-2.5 my-auto w-full">
                                  <div className={`text-xl lg:text-2xl font-black w-11 h-11 flex items-center justify-center rounded-xl shrink-0 border-2 ${
                                    op.isDisqualified
                                      ? 'bg-rose-100 text-rose-700 border-rose-300'
                                      : index === 0
                                      ? 'bg-[#A8D419] text-[#003E58] border-[#005A7D] shadow-sm'
                                      : isTop3
                                      ? 'bg-[#E7F3F8] text-[#005A7D] border-[#005A7D]/30'
                                      : 'bg-[#F3F9FC] text-[#007399] border-[#005A7D]/20'
                                  }`}>
                                    {op.isDisqualified ? '⛔' : medal}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1">
                                      <h3 className="text-sm md:text-base xl:text-lg font-black text-[#042838] leading-tight line-clamp-1">{op.name}</h3>
                                      {op.penaltiesCount > 0 && (
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ${op.isDisqualified ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-900 border border-amber-300'}`}>
                                          {op.isDisqualified ? 'Desq.' : `-${op.totalKgDeduction > 0 ? op.totalKgDeduction + 'kg' : op.totalPercentDeduction + '%'}`}
                                        </span>
                                      )}
                                    </div>

                                    <div className="text-xl lg:text-2xl font-mono tabular-nums font-black text-[#005A7D] mt-1 flex items-baseline justify-between leading-none">
                                      <span>{renderWeight(op.adjustedTotalNet ?? op.totalNet)}</span>
                                      {op.rawTotalNet !== op.adjustedTotalNet && !op.isDisqualified && (
                                        <span className="text-[10px] font-bold text-slate-400 line-through">
                                          {renderWeight(op.rawTotalNet)}
                                        </span>
                                      )}
                                    </div>

                                    {op.penalties && op.penalties.length > 0 && (
                                      <p className="text-[9px] text-rose-700 font-bold truncate mt-1 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                        {op.penalties[0].infractionType}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* RIGHT 4 COLS: Setor Corte de Fita Top Operadores */}
                      <div className="lg:col-span-4 bg-white border-2 border-[#A8D419] rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-0">
                        <div className="bg-gradient-to-r from-[#003E58] via-[#005A7D] to-[#007399] border-b-2 border-[#A8D419] px-4 py-2 flex items-center justify-between shrink-0">
                          <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                            <Trophy className="w-4 h-4 text-[#C5F028]" /> Setor Corte de Fita
                          </span>
                          <span className="text-[10px] font-black text-[#003E58] bg-[#A8D419] px-2 py-0.5 rounded uppercase">
                            Top Operadores
                          </span>
                        </div>

                        <div className="flex-1 p-3 flex flex-col justify-start gap-2 overflow-y-auto">
                          {metrics.topRibbonOperators.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                              <span className="text-xs font-bold text-[#2B596E]">
                                Sem lançamentos no setor de Corte de Fita neste mês.
                              </span>
                            </div>
                          ) : (
                            metrics.topRibbonOperators.slice(0, 5).map((op, i) => {
                              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
                              return (
                                <div
                                  key={`${op.name}-${i}`}
                                  className={`rounded-xl px-3 py-2.5 border flex items-center justify-between gap-2.5 ${
                                    i === 0
                                      ? 'bg-[#F3FBE3] border-[#A8D419] shadow-xs'
                                      : 'bg-[#F3F9FC] border-[#005A7D]/15'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black shrink-0 ${
                                      i === 0
                                        ? 'bg-[#005A7D] text-[#C5F028]'
                                        : 'bg-white text-[#005A7D] border border-[#005A7D]/25'
                                    }`}>
                                      {medal}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="text-xs lg:text-sm font-black text-[#042838] leading-tight line-clamp-1">{op.name}</p>
                                      <p className="text-[10px] font-extrabold text-[#007399] uppercase tracking-wider">{op.machine}</p>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-base lg:text-lg font-mono tabular-nums font-black text-[#003E58] block leading-none">
                                      {renderM2(op.totalM2, 'text-[0.65em] ml-0.5 text-[#007399]')}
                                    </span>
                                    {op.rolls > 0 && (
                                      <span className="text-[9px] font-bold text-[#2B596E]">
                                        {op.rolls.toLocaleString('pt-BR')} rolos
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div className="bg-[#E7F3F8] border-t border-[#005A7D]/15 px-3.5 py-2 flex items-center justify-between text-xs font-extrabold text-[#003E58] shrink-0">
                          <span>Total Fita Mês:</span>
                          <span className="font-mono tabular-nums font-black text-[#005A7D]">
                            {renderM2(metrics.ribbonMonthM2, 'text-[0.75em] ml-0.5')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SLIDE 8: AVISOS DE RECURSOS HUMANOS (RH) */}
                {currentSlide === 8 && (
                  <div className="w-full flex-1 flex flex-col justify-between gap-2.5 md:gap-3 h-full min-h-0 overflow-hidden">
                    {/* Slide Header Azul Logo + Verde Lima */}
                    <div className="flex items-center justify-between bg-gradient-to-r from-[#003E58] via-[#005A7D] to-[#007399] border-b-[3px] border-[#A8D419] px-4 py-2 sm:py-2.5 rounded-xl shadow-sm shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#A8D419] text-[#003E58] rounded-lg flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <h2 className="text-sm sm:text-base md:text-lg font-black text-white uppercase tracking-tight">
                            Recursos Humanos <span className="text-[#C5F028]">· Avisos &amp; Comunicados</span>
                          </h2>
                          <p className="hidden sm:block text-[10px] md:text-[11px] font-bold text-[#CBE7F2] uppercase tracking-wider">
                            Informações Institucionais e Gestão de Pessoas
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {rhNotices.length > 1 && (
                          <div className="flex items-center gap-1 bg-[#002D40] border border-[#A8D419]/50 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg">
                            <span className="text-[10px] sm:text-xs font-mono tabular-nums font-black text-[#C5F028]">
                              Aviso {activeRhIndex + 1} de {rhNotices.length}
                            </span>
                            <button
                              onClick={() => setActiveRhIndex((prev) => (prev - 1 + rhNotices.length) % rhNotices.length)}
                              className="p-1 rounded hover:bg-white/15 text-white transition cursor-pointer"
                              title="Aviso anterior"
                            >
                              <ChevronLeft size={13} />
                            </button>
                            <button
                              onClick={() => setActiveRhIndex((prev) => (prev + 1) % rhNotices.length)}
                              className="p-1 rounded hover:bg-white/15 text-white transition cursor-pointer"
                              title="Próximo aviso"
                            >
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        )}
                        {!isTvMode && (
                          <button
                            onClick={() => setNoticeModalCategory('rh')}
                            className="px-3 py-1.5 bg-[#A8D419] hover:bg-[#C5F028] text-[#003E58] rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Gerenciar Avisos</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* RH Notice Display Container */}
                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                      {rhNotices.length === 0 ? (
                        <div className="h-full bg-white rounded-2xl border-2 border-dashed border-[#005A7D]/25 p-6 flex flex-col items-center justify-center text-center space-y-3">
                          <div className="w-14 h-14 bg-[#E7F3F8] text-[#005A7D] rounded-2xl flex items-center justify-center border border-[#005A7D]/20">
                            <Users className="w-7 h-7" />
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg font-black text-[#003E58] uppercase tracking-tight">Nenhum aviso de RH no momento</h3>
                            <p className="text-xs font-medium text-slate-600 max-w-md mx-auto mt-1">
                              {!isTvMode ? 'Clique no botão acima "Gerenciar Avisos" para publicar novos comunicados para a equipe.' : 'Nenhum comunicado institucional cadastrado.'}
                            </p>
                          </div>
                          {!isTvMode && (
                            <button
                              onClick={() => setNoticeModalCategory('rh')}
                              className="px-4 py-2 bg-[#005A7D] hover:bg-[#007399] text-[#C5F028] rounded-lg text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Adicionar Primeiro Aviso</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        (() => {
                          const notice = rhNotices[activeRhIndex % rhNotices.length];
                          return (
                            <div
                              key={notice.id || activeRhIndex}
                              className="h-full min-h-0 bg-white rounded-2xl border-2 border-[#005A7D]/25 shadow-sm p-4 sm:p-5 lg:p-6 flex flex-col justify-between overflow-hidden relative"
                            >
                              {/* Top Badge & Date & Actions */}
                              <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#005A7D]/15 shrink-0">
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-widest ${
                                    notice.priority === 'high'
                                      ? 'bg-rose-600 text-white'
                                      : notice.priority === 'medium'
                                      ? 'bg-amber-500 text-white'
                                      : 'bg-[#005A7D] text-[#C5F028]'
                                  }`}>
                                    {notice.badgeText || 'COMUNICADO RH'}
                                  </span>
                                  {notice.priority === 'high' && (
                                    <span className="hidden sm:inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                                      Prioridade Alta
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {notice.date && (
                                    <span className="text-[10px] sm:text-xs font-mono tabular-nums font-black text-[#003E58] bg-[#E7F3F8] px-2.5 py-1 rounded-md border border-[#005A7D]/20">
                                      {notice.date}
                                    </span>
                                  )}
                                  {!isTvMode && (
                                    <button
                                      onClick={() => {
                                        if (isReadOnly) {
                                          if (onBlockedAction) {
                                            onBlockedAction('Exclusão Bloqueada', 'A exclusão de comunicados não é permitida no Modo de Leitura.');
                                          }
                                          return;
                                        }
                                        onDeleteNotice(notice.id);
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                      title="Excluir aviso"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Main Content Area */}
                              {notice.imageUrl ? (
                                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-stretch overflow-hidden">
                                  {/* Left Text Column */}
                                  <div className="lg:col-span-7 flex flex-col justify-center min-h-0 overflow-hidden pr-0 lg:pr-2">
                                    <div className="shrink-0 mb-3 border-l-4 border-[#A8D419] pl-4">
                                      <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl 2xl:text-5xl font-black text-[#003E58] tracking-tight leading-snug line-clamp-3">
                                        {notice.title}
                                      </h3>
                                      {notice.subtitle && (
                                        <p className="text-xs sm:text-sm md:text-base font-extrabold text-[#007399] uppercase tracking-wider mt-1 line-clamp-2">
                                          {notice.subtitle}
                                        </p>
                                      )}
                                    </div>
                                    <div className="pt-3 border-t border-[#005A7D]/15 overflow-hidden">
                                      <p className="text-xs sm:text-sm md:text-base lg:text-lg 2xl:text-xl font-medium text-[#0E3346] leading-relaxed overflow-hidden">
                                        {notice.description}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Right Image Column */}
                                  <div className="lg:col-span-5 h-full min-h-0 rounded-xl overflow-hidden border-2 border-[#005A7D]/25 bg-[#002838] relative shadow-sm flex items-center justify-center">
                                    <img
                                      src={notice.imageUrl}
                                      alt={notice.title}
                                      className="w-full h-full object-cover object-center"
                                    />
                                    {notice.imageCaption && (
                                      <div className="absolute bottom-0 inset-x-0 bg-[#003E58]/90 border-t-2 border-[#A8D419] p-2.5 text-white text-[10px] sm:text-xs font-bold truncate">
                                        {notice.imageCaption}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                /* Full Width Text Card (No Image) */
                                <div className="flex-1 min-h-0 flex flex-col justify-center max-w-4xl mx-auto w-full text-left overflow-hidden px-2 sm:px-6">
                                  <div className="shrink-0 mb-4 border-l-4 border-[#A8D419] pl-4 sm:pl-5">
                                    <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl 2xl:text-6xl font-black text-[#003E58] tracking-tight leading-tight">
                                      {notice.title}
                                    </h3>
                                    {notice.subtitle && (
                                      <p className="text-xs sm:text-sm md:text-base lg:text-lg font-extrabold text-[#007399] uppercase tracking-widest mt-2">
                                        {notice.subtitle}
                                      </p>
                                    )}
                                  </div>
                                  <div className="pt-3 sm:pt-4 border-t border-[#005A7D]/15 overflow-hidden">
                                    <p className="text-sm sm:text-base md:text-lg lg:text-xl 2xl:text-2xl font-medium text-[#0E3346] leading-relaxed overflow-hidden">
                                      {notice.description}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Bottom Pagination Dots */}
                              {rhNotices.length > 1 && (
                                <div className="pt-2 border-t border-[#005A7D]/15 flex items-center justify-center gap-1.5 shrink-0 mt-2">
                                  {rhNotices.map((_, i) => (
                                    <button
                                      key={i}
                                      onClick={() => setActiveRhIndex(i)}
                                      className={`h-2 transition-all rounded-full cursor-pointer ${
                                        i === activeRhIndex ? 'w-8 bg-[#005A7D]' : 'w-2 bg-[#005A7D]/25 hover:bg-[#005A7D]/50'
                                      }`}
                                      title={`Ver comunicado ${i + 1}`}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </div>
                )}

                {/* SLIDE 9: AVISOS DE SEGURANÇA DO TRABALHO (SST & CIPA) */}
                {currentSlide === 9 && (
                  <div className="w-full flex-1 flex flex-col justify-between gap-2.5 md:gap-3 h-full min-h-0 overflow-hidden">
                    {/* Slide Header SST Azul Logo + Verde Lima */}
                    <div className="flex items-center justify-between bg-gradient-to-r from-[#003E58] via-[#005A7D] to-[#007399] border-b-[3px] border-[#A8D419] px-4 py-2 sm:py-2.5 rounded-xl shadow-sm shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#A8D419] text-[#003E58] rounded-lg flex items-center justify-center shrink-0">
                          <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <h2 className="text-sm sm:text-base md:text-lg font-black text-white uppercase tracking-tight">
                            Segurança do Trabalho <span className="text-[#C5F028]">· SST &amp; CIPA</span>
                          </h2>
                          <p className="hidden sm:block text-[10px] md:text-[11px] font-bold text-[#CBE7F2] uppercase tracking-wider">
                            Prevenção de Acidentes, EPIs e Saúde Ocupacional
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {safetyNotices.length > 1 && (
                          <div className="flex items-center gap-1 bg-[#002D40] border border-[#A8D419]/50 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg">
                            <span className="text-[10px] sm:text-xs font-mono tabular-nums font-black text-[#C5F028]">
                              Aviso {activeSafetyIndex + 1} de {safetyNotices.length}
                            </span>
                            <button
                              onClick={() => setActiveSafetyIndex((prev) => (prev - 1 + safetyNotices.length) % safetyNotices.length)}
                              className="p-1 rounded hover:bg-white/15 text-white transition cursor-pointer"
                              title="Aviso anterior"
                            >
                              <ChevronLeft size={13} />
                            </button>
                            <button
                              onClick={() => setActiveSafetyIndex((prev) => (prev + 1) % safetyNotices.length)}
                              className="p-1 rounded hover:bg-white/15 text-white transition cursor-pointer"
                              title="Próximo aviso"
                            >
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        )}
                        {!isTvMode && (
                          <button
                            onClick={() => setNoticeModalCategory('safety')}
                            className="px-3 py-1.5 bg-[#A8D419] hover:bg-[#C5F028] text-[#003E58] rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Gerenciar Avisos</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Safety Notice Display Container */}
                    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                      {safetyNotices.length === 0 ? (
                        <div className="h-full bg-white rounded-2xl border-2 border-dashed border-[#005A7D]/25 p-6 flex flex-col items-center justify-center text-center space-y-3">
                          <div className="w-14 h-14 bg-[#E7F3F8] text-[#005A7D] rounded-2xl flex items-center justify-center border border-[#005A7D]/20">
                            <ShieldAlert className="w-7 h-7" />
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg font-black text-[#003E58] uppercase tracking-tight">Nenhum aviso de Segurança no momento</h3>
                            <p className="text-xs font-medium text-slate-600 max-w-md mx-auto mt-1">
                              {!isTvMode ? 'Clique no botão acima "Gerenciar Avisos" para publicar alertas de segurança e SST.' : 'Nenhum alerta de segurança cadastrado.'}
                            </p>
                          </div>
                          {!isTvMode && (
                            <button
                              onClick={() => setNoticeModalCategory('safety')}
                              className="px-4 py-2 bg-[#005A7D] hover:bg-[#007399] text-[#C5F028] rounded-lg text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Adicionar Primeiro Aviso</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        (() => {
                          const notice = safetyNotices[activeSafetyIndex % safetyNotices.length];
                          return (
                            <div
                              key={notice.id || activeSafetyIndex}
                              className="h-full min-h-0 bg-white rounded-2xl border-2 border-[#A8D419] shadow-sm p-4 sm:p-5 lg:p-6 flex flex-col justify-between overflow-hidden relative"
                            >
                              {/* Top Badge & Date & Actions */}
                              <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#005A7D]/15 shrink-0">
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1 rounded-md text-[10px] sm:text-xs font-black uppercase tracking-widest ${
                                    notice.priority === 'high'
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-[#A8D419] text-[#003E58]'
                                  }`}>
                                    {notice.badgeText || 'SEGURANÇA DO TRABALHO'}
                                  </span>
                                  {notice.priority === 'high' && (
                                    <span className="hidden sm:inline-block px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                                      Alerta Crítico SST
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {notice.date && (
                                    <span className="text-[10px] sm:text-xs font-mono tabular-nums font-black text-[#003E58] bg-[#E7F3F8] px-2.5 py-1 rounded-md border border-[#005A7D]/20">
                                      {notice.date}
                                    </span>
                                  )}
                                  {!isTvMode && (
                                    <button
                                      onClick={() => {
                                        if (isReadOnly) {
                                          if (onBlockedAction) {
                                            onBlockedAction('Exclusão Bloqueada', 'A exclusão de comunicados não é permitida no Modo de Leitura.');
                                          }
                                          return;
                                        }
                                        onDeleteNotice(notice.id);
                                      }}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                                      title="Excluir aviso"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Main Content Area */}
                              {notice.imageUrl ? (
                                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-stretch overflow-hidden">
                                  {/* Left Text Column */}
                                  <div className="lg:col-span-7 flex flex-col justify-center min-h-0 overflow-hidden pr-0 lg:pr-2">
                                    <div className="shrink-0 mb-3 border-l-4 border-[#A8D419] pl-4">
                                      <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl 2xl:text-5xl font-black text-[#003E58] tracking-tight leading-snug line-clamp-3">
                                        {notice.title}
                                      </h3>
                                      {notice.subtitle && (
                                        <p className="text-xs sm:text-sm md:text-base font-black text-[#007399] uppercase tracking-wider mt-1 line-clamp-2">
                                          {notice.subtitle}
                                        </p>
                                      )}
                                    </div>
                                    <div className="pt-3 border-t border-[#005A7D]/15 overflow-hidden">
                                      <p className="text-xs sm:text-sm md:text-base lg:text-lg 2xl:text-xl font-medium text-[#0E3346] leading-relaxed overflow-hidden">
                                        {notice.description}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Right Image Column */}
                                  <div className="lg:col-span-5 h-full min-h-0 rounded-xl overflow-hidden border-2 border-[#005A7D]/25 bg-[#002838] relative shadow-sm flex items-center justify-center">
                                    <img
                                      src={notice.imageUrl}
                                      alt={notice.title}
                                      className="w-full h-full object-cover object-center"
                                    />
                                    {notice.imageCaption && (
                                      <div className="absolute bottom-0 inset-x-0 bg-[#003E58]/90 border-t-2 border-[#A8D419] p-2.5 text-white text-[10px] sm:text-xs font-bold truncate">
                                        {notice.imageCaption}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                /* Full Width Text Card (No Image) */
                                <div className="flex-1 min-h-0 flex flex-col justify-center max-w-4xl mx-auto w-full text-left overflow-hidden px-2 sm:px-6">
                                  <div className="shrink-0 mb-4 border-l-4 border-[#A8D419] pl-4 sm:pl-5">
                                    <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl 2xl:text-6xl font-black text-[#003E58] tracking-tight leading-tight">
                                      {notice.title}
                                    </h3>
                                    {notice.subtitle && (
                                      <p className="text-xs sm:text-sm md:text-base lg:text-lg font-black text-[#007399] uppercase tracking-widest mt-2">
                                        {notice.subtitle}
                                      </p>
                                    )}
                                  </div>
                                  <div className="pt-3 sm:pt-4 border-t border-[#005A7D]/15 overflow-hidden">
                                    <p className="text-sm sm:text-base md:text-lg lg:text-xl 2xl:text-2xl font-medium text-[#0E3346] leading-relaxed overflow-hidden">
                                      {notice.description}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Bottom Pagination Dots */}
                              {safetyNotices.length > 1 && (
                                <div className="pt-2 border-t border-[#005A7D]/15 flex items-center justify-center gap-1.5 shrink-0 mt-2">
                                  {safetyNotices.map((_, i) => (
                                    <button
                                      key={i}
                                      onClick={() => setActiveSafetyIndex(i)}
                                      className={`h-2 transition-all rounded-full cursor-pointer ${
                                        i === activeSafetyIndex ? 'w-8 bg-[#005A7D]' : 'w-2 bg-[#005A7D]/25 hover:bg-[#005A7D]/50'
                                      }`}
                                      title={`Ver comunicado ${i + 1}`}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          ) : (
            /* GRID VIEW: VISTA COMPLETA DA GESTÃO VISUAL (EXTRUSÃO + CORTE DE FITA + RECICLAGEM) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4 h-full overflow-y-auto pr-1 pb-6">
              {/* Yesterday Card */}
              <div className="bg-white border border-[#005A7D]/25 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
                <div className="bg-[#005A7D] border-b-2 border-[#A8D419] px-4 py-2">
                  <span className="text-xs font-black text-white uppercase tracking-wider block">
                    Produção Ontem (Extrusão)
                  </span>
                </div>
                <div className="px-4 py-3 text-4xl font-black text-[#042838] font-mono tabular-nums my-auto leading-none">
                  {renderWeight(metrics.yesterdayProdTotal)}
                </div>
                <div className="bg-[#E7F3F8] text-xs font-bold text-[#0B394F] px-4 py-2 border-t border-[#005A7D]/15 flex items-center justify-between">
                  <span>Corte de Fita Ontem:</span>
                  <span className="text-[#005A7D] font-mono tabular-nums font-black">{renderM2(metrics.ribbonYesterdayM2, 'text-[0.75em] font-extrabold text-[#007399] ml-0.5')}</span>
                </div>
              </div>

              {/* Goal Card */}
              <div className="bg-white border border-[#005A7D]/25 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
                <div className="bg-[#005A7D] border-b-2 border-[#A8D419] px-4 py-2 flex items-center justify-between">
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    Meta do Mês
                  </span>
                  <span className="text-xs font-mono font-black bg-[#A8D419] text-[#003E58] px-2 py-0.5 rounded">
                    {metrics.goalPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="px-4 py-3 text-4xl font-black text-[#042838] font-mono tabular-nums my-auto leading-none">
                  {renderWeight(metrics.prodMonthTotal)}
                </div>
                <div className="bg-[#E7F3F8] text-xs font-bold text-[#003E58] px-4 py-2 border-t border-[#005A7D]/15">
                  Meta: <strong className="font-mono font-black text-[#005A7D]">{renderWeight(metrics.currentGoal, 'text-[0.75em] font-extrabold text-[#007399] ml-0.5')}</strong>
                </div>
              </div>

              {/* Corte de Fita Card (Highlight) */}
              <div className="bg-white border-2 border-[#A8D419] rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
                <div className="bg-gradient-to-r from-[#003E58] to-[#005A7D] border-b-2 border-[#A8D419] px-4 py-2 flex items-center justify-between">
                  <span className="text-xs font-black text-[#C5F028] uppercase tracking-wider">
                    Corte de Fita (Mês)
                  </span>
                  <span className="text-[10px] font-mono font-black text-white/90">
                    NC {metrics.ribbonRejectPerc.toFixed(1)}%
                  </span>
                </div>
                <div className="px-4 py-3 text-4xl font-black text-[#005A7D] font-mono tabular-nums my-auto leading-none">
                  {renderM2(metrics.ribbonMonthM2, 'text-[0.55em] font-black text-[#007399] ml-0.5')}
                </div>
                <div className="bg-[#F3FBE3] text-xs font-extrabold text-[#003E58] px-4 py-2 border-t border-[#A8D419]/50 flex items-center justify-between">
                  <span>Projeção: <strong className="font-mono font-black">{renderM2(metrics.ribbonProjectedMonthM2, 'text-[0.75em] ml-0.5')}</strong></span>
                  <span className="font-mono">{metrics.ribbonMonthRolls.toLocaleString('pt-BR')} rolos</span>
                </div>
              </div>

              {/* Eco B Card */}
              <div className="bg-white border border-[#005A7D]/25 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
                <div className="bg-[#003E58] border-b-2 border-amber-400 px-4 py-2">
                  <span className="text-xs font-black text-white uppercase tracking-wider block">
                    Total Eco B Produzido
                  </span>
                </div>
                <div className="px-4 py-3 text-4xl font-black text-amber-600 font-mono tabular-nums my-auto leading-none">
                  {renderWeight(metrics.totalEcoB)}
                </div>
                <div className="bg-[#FDF6E7] text-xs font-bold text-[#52390A] px-4 py-2 border-t border-amber-200">
                  Eco BP: {renderWeight(metrics.totalEcoBP, 'text-[0.75em] font-extrabold text-[#52390A] ml-0.5')} | Eco BM: {renderWeight(metrics.totalEcoBM, 'text-[0.75em] font-extrabold text-[#52390A] ml-0.5')}
                </div>
              </div>

              {/* Corte de Fita Machines Strip (Lintech, Ghezzi, Wultec) */}
              <div className="lg:col-span-4 bg-white border border-[#005A7D]/25 rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-[#003E58] via-[#005A7D] to-[#007399] border-b-2 border-[#A8D419] px-4 py-2 flex items-center justify-between">
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    Máquinas Corte de Fita · Acumulado do Mês
                  </span>
                  <span className="text-[10px] font-black text-[#C5F028] uppercase tracking-widest">
                    Lintech · Ghezzi · Wultec
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#005A7D]/15">
                  {(['Lintech', 'Ghezzi', 'Wultec'] as const).map((mName) => {
                    const monthVal = metrics.ribbonMachineMonthMap[mName] || 0;
                    const yestVal = metrics.ribbonMachineYesterdayMap[mName] || 0;
                    const rollsVal = metrics.ribbonMachineRollsMap[mName] || 0;
                    return (
                      <div key={mName} className="px-4 py-3 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-black text-[#005A7D] uppercase tracking-wider block">{mName}</span>
                          <span className="text-[11px] font-bold text-[#2B596E]">
                            Ontem: <strong className="font-mono text-[#042838]">{renderM2(yestVal, 'text-[0.8em] ml-0.5')}</strong>
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-mono tabular-nums font-black text-[#003E58] leading-none">
                            {renderM2(monthVal, 'text-[0.6em] text-[#007399] ml-0.5')}
                          </div>
                          <span className="text-[10px] font-bold text-[#2B596E]">{rollsVal.toLocaleString('pt-BR')} rolos</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Big Chart Row */}
              <div className="lg:col-span-3 bg-white border border-[#005A7D]/25 rounded-2xl shadow-sm min-h-[380px] flex flex-col justify-between overflow-hidden">
                <div className="bg-gradient-to-r from-[#003E58] via-[#005A7D] to-[#007399] border-b-2 border-[#A8D419] px-5 py-2.5 flex items-center justify-between">
                  <h3 className="text-sm md:text-base font-black text-white uppercase tracking-wider">
                    Evolução Diária da Produção x Meta (Extrusão)
                  </h3>
                  <div className="flex items-center gap-4 text-xs font-extrabold text-white">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-xs bg-[#005A7D] border border-white/50"></span> Cast 1
                    </span>
                    <span className="flex items-center gap-1.5 text-[#C5F028]">
                      <span className="w-3 h-3 rounded-xs bg-[#A8D419]"></span> Cast 2
                    </span>
                  </div>
                </div>
                <div className="w-full h-[310px] p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.dailyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#D2E4EC" vertical={false} />
                      <XAxis dataKey="day" stroke="#005A7D" tick={{ fill: '#042838', fontSize: 13, fontWeight: 700 }} />
                      <YAxis stroke="#005A7D" tick={{ fill: '#003E58', fontSize: 13, fontWeight: 700 }} tickFormatter={(val: number) => formatWeightStr(val)} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#005A7D', borderRadius: '0.75rem', fontWeight: 'bold' }}
                        formatter={(val: number) => [formatWeightStr(val), 'Volume']}
                      />
                      <Bar dataKey="cast1" name="Cast 1" fill="#005A7D" stackId="a" />
                      <Bar dataKey="cast2" name="Cast 2" fill="#A8D419" stackId="a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Best Operator Card */}
              <div className="bg-white border-2 border-[#A8D419] rounded-2xl shadow-md flex flex-col justify-between relative overflow-hidden">
                <ContinuousConfettiOverlay />
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div className="bg-gradient-to-r from-[#003E58] to-[#005A7D] border-b-2 border-[#A8D419] px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs md:text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-[#C5F028]" /> Destaques do Mês
                    </span>
                    <span className="text-lg leading-none">🥇</span>
                  </div>
                  <div className="p-4 my-auto space-y-3">
                    <div>
                      <span className="text-[10px] font-black text-[#007399] uppercase tracking-widest">Extrusão</span>
                      <h4 className="text-xl lg:text-2xl font-black text-[#042838] leading-tight">{metrics.bestOperator.name}</h4>
                      <p className="text-xs font-black text-[#005A7D] uppercase tracking-wider mt-0.5">
                        {metrics.bestOperator.machine}
                      </p>
                      <div className="text-3xl font-mono tabular-nums font-black text-[#005A7D] mt-2 leading-none">
                        {renderWeight(metrics.bestOperator.totalNet)}
                      </div>
                    </div>
                    {metrics.bestRibbonOperator && (
                      <div className="pt-3 border-t border-[#005A7D]/15 bg-[#F3FBE3]/80 -mx-4 px-4 py-2.5">
                        <span className="text-[10px] font-black text-[#4B7000] uppercase tracking-widest">Corte de Fita</span>
                        <p className="text-sm font-black text-[#042838] leading-tight mt-0.5">{metrics.bestRibbonOperator.name}</p>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-[11px] font-bold text-[#2B596E] uppercase">{metrics.bestRibbonOperator.machine}</span>
                          <span className="text-lg font-mono tabular-nums font-black text-[#003E58]">
                            {renderM2(metrics.bestRibbonOperator.totalM2, 'text-[0.7em] ml-0.5')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="bg-[#003E58] border-t-2 border-[#A8D419] px-4 py-2 text-[11px] font-black text-[#C5F028] uppercase tracking-widest text-center">
                    Líderes em Produtividade
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Gestão de Avisos de RH / Segurança */}
      {noticeModalCategory && (
        <CompanyNoticeModal
          isOpen={!!noticeModalCategory}
          onClose={() => setNoticeModalCategory(null)}
          category={noticeModalCategory}
          companyNotices={companyNotices}
          onSaveNotice={onSaveNotice}
          onDeleteNotice={onDeleteNotice}
          isReadOnly={isReadOnly}
          onBlockedAction={onBlockedAction}
        />
      )}

      {/* Weekly Production Summary Modal */}
      <WeeklyProductionSummaryModal
        isOpen={isWeeklySummaryOpen}
        onClose={() => setIsWeeklySummaryOpen(false)}
        productionData={productionData}
        ribbonData={ribbonEntries}
        employees={employees}
        isReadOnly={isReadOnly}
        canView={canViewWeeklySummary}
        onBlockedAction={onBlockedAction}
      />

      {/* Footer Institucional Manu Packaging (Faixa Azul Corporativo + Verde Lima) */}
      <footer className="bg-gradient-to-r from-[#003E58] via-[#005A7D] to-[#003E58] border-t-[3px] border-[#A8D419] px-4 md:px-6 py-2 flex items-center justify-between text-[11px] md:text-xs font-bold text-[#D6EFF8] shrink-0 shadow-md gap-4">
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <span className="flex items-center gap-2 text-white font-black uppercase tracking-wider shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C5F028]"></span> Gestão Visual Industrial
          </span>
          <span className="hidden md:inline text-white/25">|</span>
          <span className="hidden md:inline truncate">
            Slide <strong className="text-[#C5F028] font-mono tabular-nums">{currentSlide + 1}/{slideTitles.length}</strong> · {slideTitles[currentSlide]}
          </span>
          <span className="hidden lg:inline text-white/25">|</span>
          <span className="hidden lg:inline shrink-0">
            Rotação: <strong className="text-[#C5F028] font-mono tabular-nums">{slideDuration}s</strong>
          </span>
        </div>

        <div className="hidden xl:flex items-center gap-2 px-4 border-x border-white/20 text-[#C5F028] font-black uppercase tracking-[0.18em] text-[11px] shrink-0">
          UMA NOVA GESTÃO, UM NOVO AMBIENTE
        </div>

        <div className="flex items-center gap-3 shrink-0 text-[#CBE7F2]">
          <span className="truncate">
            {isStandaloneTv
              ? 'Transmissão Contínua Smart TV · Tempo Real'
              : isScreensaver
              ? 'Protetor de Tela · Mexa o mouse ou pressione ESC'
              : 'Pressione ESC ou clique em Voltar para sair'}
          </span>
        </div>
      </footer>

      {/* Floating Screensaver Alert */}
      {!isStandaloneTv && isScreensaver && (
        <div className="fixed bottom-12 md:bottom-14 left-1/2 -translate-x-1/2 z-[300] bg-[#003E58]/95 text-white backdrop-blur-md px-5 sm:px-7 py-3 rounded-xl shadow-2xl border-2 border-[#A8D419] flex items-center gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-6 duration-300 pointer-events-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C5F028] shrink-0"></span>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 text-left">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#C5F028]">Protetor de Tela Ativo</span>
            <span className="text-[11px] sm:text-xs font-medium text-[#D6EFF8]">Mexa o mouse ou pressione qualquer tecla para voltar</span>
          </div>
          <button
            onClick={onExitScreensaver || onClose}
            className="ml-1 sm:ml-2 px-3 sm:px-4 py-1.5 bg-[#A8D419] hover:bg-[#C5F028] text-[#003E58] rounded-lg text-xs font-black uppercase tracking-wider shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          >
            Retomar
          </button>
        </div>
      )}
    </div>
  );
};
