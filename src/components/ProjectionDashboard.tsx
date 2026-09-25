import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Tv, Maximize2, Minimize2, Play, Pause, ChevronLeft, ChevronRight, 
  Trophy, TrendingUp, Target, Calendar, Clock, Activity, 
  Award, BarChart3, Factory, RefreshCw, X, Sliders, Flame, Users,
  ArrowUpRight, ArrowDownRight, TrendingDown, Scale, AlertCircle, Percent,
  ShieldAlert, AlertTriangle, ArrowLeft
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, 
  Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell, LabelList,
  ComposedChart, Line
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { ProductionEntry, RibbonCuttingEntry, Collaborator, OperatorPenalty, Employee, CompanyNotice } from '../types';
import { GOAL_VALUE } from '../constants';
import { CompanyNoticeModal } from './CompanyNoticeModal';
import { WeeklyProductionSummaryModal } from './WeeklyProductionSummaryModal';
import { Plus, Megaphone, CheckCircle2, FileText, Camera, Upload, Trash2, Presentation } from 'lucide-react';

interface ProjectionDashboardProps {
  productionData: ProductionEntry[];
  ribbonEntries: RibbonCuttingEntry[];
  goals: Record<string, number>;
  dashboardMonth: string; // YYYY-MM
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

    const colors = ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#3b82f6', '#8b5cf6', '#eab308', '#f43f5e', '#fbbf24'];
    const particleCount = 45;

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
  dashboardMonth,
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

  // Auto Tela Cheia contínua para Projeção TV externa (Smart TVs / Telões industriais)
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

  // Auto-rotate RH notices within Slide 5 if multiple notices exist
  useEffect(() => {
    if (currentSlide !== 5 || rhNotices.length <= 1) return;
    const intervalSeconds = Math.max(8, Math.floor(slideDuration / rhNotices.length));
    const timer = setInterval(() => {
      setActiveRhIndex((prev) => (prev + 1) % rhNotices.length);
    }, intervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [currentSlide, rhNotices.length, slideDuration]);

  // Auto-rotate Safety notices within Slide 6 if multiple notices exist
  useEffect(() => {
    if (currentSlide !== 6 || safetyNotices.length <= 1) return;
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
            const next = (slide + 1) % 7;
            if (next === 5) setActiveRhIndex(0);
            if (next === 6) setActiveSafetyIndex(0);
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
    if (newSlide === 5) setActiveRhIndex(0);
    if (newSlide === 6) setActiveSafetyIndex(0);
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
        operatorMap[opName].totalNet += net;
        operatorMap[opName].count += 1;
        if (e.hasPenalty) {
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

    // Ribbon Cutting Metrics (Corte de Fita)
    const monthRibbonEntries = ribbonEntries.filter(
      (r) => r && typeof r.date === 'string' && r.date.startsWith(dashboardMonth)
    );
    const ribbonMonthM2 = monthRibbonEntries.reduce((sum, r) => sum + (r.producedM2 || 0), 0);
    const ribbonYesterdayM2 = monthRibbonEntries
      .filter((r) => r.date === yesterdayStr)
      .reduce((sum, r) => sum + (r.producedM2 || 0), 0);

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

    const prevMonthRibbonEntries = ribbonEntries.filter(
      (r) => r && typeof r.date === 'string' && r.date.startsWith(prevMonthStr)
    );
    const prevMonthRibbonM2 = prevMonthRibbonEntries.reduce((sum, r) => sum + (r.producedM2 || 0), 0);

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
      ribbonMonthM2,
      ribbonYesterdayM2,
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
  }, [productionData, ribbonEntries, goals, dashboardMonth]);

  // Auto-scroll monthly timeline list on Slide 1 proportional to slow reading speed
  useEffect(() => {
    if (currentSlide !== 1 && viewMode !== 'grid') return;

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
    'Tendência Evolutiva (MoM/YoY)',
    'Histórico de parada de máquina',
    'Eco B vs Tubetes Eco B',
    'Ranking de Operadores',
    'Avisos de RH',
    'Avisos de Segurança (SST)',
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-slate-100 text-slate-900 flex flex-col font-sans overflow-hidden select-none">
      {/* Top Bar: TV Mode Header OR System Tab Header */}
      {effectiveTvMode ? (
        /* Modo Projeção TV Limpo (Para TVs / Apresentação) */
        <header className="bg-white border-b-2 border-slate-200 px-3 md:px-6 py-2 md:py-3 flex items-center justify-between shrink-0 shadow-sm z-10 transition-all gap-2 max-w-full overflow-hidden">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-md border border-blue-400/20 shrink-0">
              {systemLogo ? (
                <img src={systemLogo} alt="Logo" className="w-full h-full object-cover rounded-xl md:rounded-2xl" />
              ) : (
                <Tv className="w-5 h-5 md:w-8 md:h-8 text-white" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 md:gap-3">
                <h1 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight uppercase truncate">
                  {systemName} <span className="text-blue-600 font-black">• PROJEÇÃO TV</span>
                </h1>
                {isScreensaver ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest bg-amber-100 text-amber-900 border border-amber-300 shadow-xs shrink-0 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> PROTETOR DE TELA ATIVO
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> AO VIVO
                  </span>
                )}
              </div>
              <p className="hidden md:block text-xs md:text-sm font-extrabold text-slate-500 tracking-wider truncate">
                PAINEL INDUSTRIAL AUTOMÁTICO • EXTRUSÃO & CORTE
              </p>
            </div>
          </div>

          {/* Right Controls: Clock & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
            {/* Clock (Relógio) */}
            <div className="text-right bg-slate-50 px-2.5 py-1 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm shrink-0">
              <div className="text-xs sm:text-lg md:text-2xl font-mono font-black text-blue-700 tracking-wider flex items-center gap-1 sm:gap-2">
                <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
                {currentTime.toLocaleTimeString('pt-BR')}
              </div>
              <div className="hidden sm:block text-[10px] md:text-xs font-extrabold text-slate-500 uppercase tracking-widest">
                {currentTime.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
              </div>
            </div>

            {/* Control Buttons: Pause, Fullscreen, Exit (Ocultados no Link Externo da Smart TV) */}
            {!isStandaloneTv && (
              <div className="flex items-center gap-1 sm:gap-2 bg-slate-100 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-slate-200">
                <button
                  onClick={() => setIsAutoPlay(!isAutoPlay)}
                  className={`p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all shadow-sm cursor-pointer ${
                    isAutoPlay ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                  title={isAutoPlay ? 'Pausar Rotação' : 'Iniciar Rotação Automática'}
                >
                  {isAutoPlay ? <Pause className="w-4 h-4 sm:w-6 sm:h-6" /> : <Play className="w-4 h-4 sm:w-6 sm:h-6" />}
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="p-2 sm:p-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg sm:rounded-xl transition-all shadow-sm cursor-pointer"
                  title="Alternar Tela Cheia (Pressione ESC para sair)"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4 sm:w-6 sm:h-6" /> : <Maximize2 className="w-4 h-4 sm:w-6 sm:h-6" />}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 sm:p-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg sm:rounded-xl transition-all shadow-sm cursor-pointer"
                  title="Sair da Projeção TV"
                >
                  <X className="w-4 h-4 sm:w-6 sm:h-6" />
                </button>
              </div>
            )}
          </div>
        </header>
      ) : (
        /* Modo Tela de Projeção no Sistema (ao lado de Manutenção - 100% Enquadrado) */
        <>
          <header className="bg-white border-b-2 border-slate-200 px-3 md:px-6 py-2 sm:py-3 flex items-center justify-between shrink-0 shadow-sm z-10 transition-all gap-2 max-w-full">
            {/* Esquerda: Identificação da Tela de Projeção */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-md border border-blue-400/20 shrink-0">
                {systemLogo ? (
                  <img src={systemLogo} alt="Logo" className="w-full h-full object-cover rounded-xl sm:rounded-2xl" />
                ) : (
                  <Tv className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-lg md:text-xl font-black text-slate-900 tracking-tight uppercase truncate">
                    {systemName} <span className="text-blue-600 font-black">• PROJEÇÃO</span>
                  </h1>
                  <span className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                    SISTEMA & INDICADORES
                  </span>
                </div>
                <p className="hidden sm:block text-[11px] font-extrabold text-slate-500 tracking-wider truncate">
                  PAINEL DE EDIÇÃO, VERIFICAÇÃO E ACOMPANHAMENTO INDUSTRIAL
                </p>
              </div>
            </div>

            {/* Direita: Relógio, Controles e Botão Voltar Fixo e Visível */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              {/* Relógio Compacto */}
              <div className="text-right bg-slate-50 px-2 sm:px-3 py-1 rounded-xl border border-slate-200 shadow-2xs shrink-0">
                <div className="text-xs sm:text-base font-mono font-black text-blue-700 tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0 hidden sm:inline" />
                  {currentTime.toLocaleTimeString('pt-BR')}
                </div>
              </div>

              {/* Botões de Ação do Player */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                <button
                  onClick={() => setIsAutoPlay(!isAutoPlay)}
                  className={`p-1.5 sm:p-2 rounded-lg transition-all shadow-2xs cursor-pointer ${
                    isAutoPlay ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-200'
                  }`}
                  title={isAutoPlay ? 'Pausar rotação' : 'Iniciar rotação'}
                >
                  {isAutoPlay ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 sm:p-2 bg-white hover:bg-slate-200 text-slate-700 rounded-lg transition-all shadow-2xs cursor-pointer"
                  title="Tela Cheia"
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              </div>

              {/* Botão de Copiar Link da Smart TV */}
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
                      alert('Link da Projeção TV copiado com sucesso!\n\n' + link + '\n\nAbra este link diretamente no navegador da sua Smart TV para transmissão contínua automática em tela cheia.');
                    }).catch(() => {
                      window.prompt('Copie o link abaixo para abrir na Smart TV:', link);
                    });
                  } else {
                    window.prompt('Copie o link abaixo para abrir na Smart TV:', link);
                  }
                }}
                className="px-2.5 sm:px-3.5 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shrink-0 transition-all cursor-pointer select-none"
                title="Copiar Link Externo para Smart TV"
              >
                <Tv className="w-4 h-4 sm:w-4.5 sm:h-4.5 shrink-0" />
                <span className="hidden sm:inline">Link Smart TV</span>
              </button>

              {/* BOTÃO VOLTAR: Sempre visível, destacado, com ícone e texto */}
              <button
                onClick={onClose}
                className="px-3 sm:px-4 py-2 sm:py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shrink-0 transition-all cursor-pointer select-none"
                title="Voltar ao Sistema (ou pressione ESC)"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span>Voltar</span>
              </button>
            </div>
          </header>

          {/* Sub-Barra de Navegação dos Slides e Tempo (100% Enquadrada e Sem Overflow) */}
          <div className="bg-slate-200/90 border-b border-slate-300 p-1.5 px-2 sm:px-4 flex items-center justify-between gap-2 shrink-0 shadow-xs max-w-full overflow-hidden">
            {/* Setas e Lista de Slides Responsiva */}
            <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
              <button
                onClick={() => handleSlideChange((currentSlide - 1 + slideTitles.length) % slideTitles.length)}
                className="p-1.5 bg-white text-slate-800 rounded-lg shadow-2xs font-bold flex items-center shrink-0 active:scale-95 border border-slate-300 hover:bg-slate-100 cursor-pointer"
                title="Slide Anterior"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Container dos Slides com rolagem horizontal fluida */}
              <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none py-0.5 max-w-full flex-1">
                {slideTitles.map((title, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setViewMode('slides');
                      handleSlideChange(idx);
                    }}
                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                      viewMode === 'slides' && currentSlide === idx
                        ? 'bg-blue-600 text-white shadow-xs border border-blue-500'
                        : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-300/80'
                    }`}
                  >
                    <span className="opacity-70 font-mono mr-1">{idx + 1}.</span>
                    <span className="hidden md:inline">{title}</span>
                    <span className="inline md:hidden">{title.split(' ')[0]}</span>
                  </button>
                ))}
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-emerald-600 text-white shadow-xs border border-emerald-500'
                      : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-300/80'
                  }`}
                >
                  Vista Completa
                </button>
              </div>

              <button
                onClick={() => handleSlideChange((currentSlide + 1) % slideTitles.length)}
                className="p-1.5 bg-white text-slate-800 rounded-lg shadow-2xs font-bold flex items-center shrink-0 active:scale-95 border border-slate-300 hover:bg-slate-100 cursor-pointer"
                title="Próximo Slide"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Controles de Tempo (Enquadrados e Sempre Visíveis) */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-300 shrink-0 shadow-2xs">
              <span className="text-[10px] font-black text-slate-500 uppercase px-1 hidden sm:flex items-center gap-0.5">
                <Sliders size={12} /> Tempo:
              </span>
              {[20, 30, 45, 60].map((sec) => (
                <button
                  key={sec}
                  onClick={() => handleDurationChange(sec)}
                  className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-black font-mono transition-all cursor-pointer ${
                    slideDuration === sec
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
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

      {/* Rotation Progress Bar */}
      {!isFullscreen && isAutoPlay && viewMode === 'slides' && (
        <div className="w-full bg-slate-200 h-2 relative overflow-hidden shrink-0">
          <div
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 h-full transition-all duration-1000 ease-linear shadow-sm"
            style={{ width: `${((slideDuration - timeRemaining) / slideDuration) * 100}%` }}
          />
        </div>
      )}

      {/* Main Viewport */}
      <main className={`flex-1 p-2 md:p-4 lg:p-5 relative bg-slate-100 flex flex-col justify-between h-full min-h-0 ${viewMode === 'slides' ? 'overflow-hidden' : 'overflow-y-auto custom-scrollbar'}`}>
        {viewMode === 'slides' ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.4 }}
              className="w-full flex-1 flex flex-col justify-between gap-2 md:gap-3 h-full min-h-0 overflow-hidden"
            >
              {/* SLIDE 0: VISÃO GERAL DE PRODUÇÃO & METAS */}
              {currentSlide === 0 && (
                <div className="w-full flex-1 flex flex-col justify-between gap-3 md:gap-4 h-full min-h-0 overflow-hidden">
                  {/* Top 4 Key Metric Cards (Extra Large Text for Fullscreen TV) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 flex-1 min-h-0">
                    {/* Produção de Ontem */}
                    <div className="bg-white border-2 border-blue-200 rounded-3xl p-4 lg:p-5 shadow-md hover:shadow-xl transition-all flex flex-col justify-between h-full min-h-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs md:text-sm lg:text-base font-black text-blue-700 uppercase tracking-widest flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-blue-600 shrink-0" /> Produção de Ontem
                        </span>
                        <span className="text-[10px] md:text-xs font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                          Extrusão
                        </span>
                      </div>
                      <div className="text-3xl md:text-4xl lg:text-5xl 2xl:text-6xl font-black text-slate-900 font-mono my-auto tracking-tight">
                        {renderWeight(metrics.yesterdayProdTotal)}
                      </div>
                      <div className="flex items-center justify-between text-xs md:text-sm lg:text-base font-bold text-slate-600 pt-2 border-t border-slate-100">
                        <span>Corte de Fita:</span>
                        <span className="font-mono text-indigo-600 font-black text-sm lg:text-lg">{renderM2(metrics.ribbonYesterdayM2)}</span>
                      </div>
                    </div>

                    {/* Meta Mensal & Progresso */}
                    <div className="bg-white border-2 border-emerald-200 rounded-3xl p-4 lg:p-5 shadow-md hover:shadow-xl transition-all flex flex-col justify-between h-full min-h-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs md:text-sm lg:text-base font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                          <Target className="w-5 h-5 text-emerald-600 shrink-0" /> Meta do Mês
                        </span>
                        <span className="text-[10px] md:text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-300 font-mono">
                          {metrics.goalPercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-3xl md:text-4xl lg:text-5xl 2xl:text-6xl font-black text-slate-900 font-mono my-auto tracking-tight">
                        {renderWeight(metrics.prodMonthTotal)}
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden my-1 border border-slate-200 p-0.5">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-1000 shadow-sm"
                          style={{ width: `${Math.min(100, metrics.goalPercent)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] md:text-xs lg:text-sm font-bold text-slate-600">
                        <span>Meta: {renderWeight(metrics.currentGoal, 'text-[0.7em] font-extrabold opacity-75 ml-0.5')}</span>
                        <span>Falta: {renderWeight(Math.max(0, metrics.currentGoal - metrics.prodMonthTotal), 'text-[0.7em] font-extrabold opacity-75 ml-0.5')}</span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] md:text-xs font-extrabold text-slate-500">
                        <span>Mês Ant. ({metrics.prevMonthName}): <strong className="font-mono text-slate-800">{renderWeight(metrics.prevMonthProdTotal, 'text-[0.7em] font-extrabold opacity-80 ml-0.5')}</strong></span>
                        {metrics.prodVar !== null && (
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-black font-mono ${
                            metrics.prodVar >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {metrics.prodVar >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {metrics.prodVar >= 0 ? '+' : ''}{metrics.prodVar.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Projeção do Mês */}
                    <div className="bg-white border-2 border-indigo-200 rounded-3xl p-4 lg:p-5 shadow-md hover:shadow-xl transition-all flex flex-col justify-between h-full min-h-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs md:text-sm lg:text-base font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-indigo-600 shrink-0" /> Projeção Fechamento
                        </span>
                        <span className="text-[10px] md:text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                          Estimada
                        </span>
                      </div>
                      <div className="text-3xl md:text-4xl lg:text-5xl 2xl:text-6xl font-black text-indigo-600 font-mono my-auto tracking-tight">
                        {renderWeight(metrics.projectedMonthTotal)}
                      </div>
                      <div className="flex items-center justify-between text-xs md:text-sm lg:text-base font-bold text-slate-600 pt-2 border-t border-slate-100">
                        <span>Ritmo Diário Nec.:</span>
                        <span className="font-mono text-amber-600 font-black text-sm lg:text-lg">{renderWeight(metrics.dailyGoalRequired, 'text-[0.55em] font-extrabold text-amber-700 ml-0.5', '/dia')}</span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] md:text-xs font-extrabold text-slate-500">
                        <span>vs Mês Ant. ({metrics.prevMonthName}):</span>
                        {metrics.projVar !== null ? (
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-black font-mono ${
                            metrics.projVar >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {metrics.projVar >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {metrics.projVar >= 0 ? '+' : ''}{metrics.projVar.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </div>
                    </div>

                    {/* Total Eco B Produzido */}
                    <div className="bg-white border-2 border-amber-200 rounded-3xl p-4 lg:p-5 shadow-md hover:shadow-xl transition-all flex flex-col justify-between h-full min-h-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs md:text-sm lg:text-base font-black text-amber-700 uppercase tracking-widest flex items-center gap-2">
                          <Activity className="w-5 h-5 text-amber-600 shrink-0" /> Total Eco B Produzido
                        </span>
                        <span className="text-[10px] md:text-xs font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                          Refilo
                        </span>
                      </div>
                      <div className="text-3xl md:text-4xl lg:text-5xl 2xl:text-6xl font-black text-amber-600 font-mono my-auto tracking-tight">
                        {renderWeight(metrics.totalEcoB)}
                      </div>
                      <div className="flex items-center justify-between text-xs md:text-sm lg:text-base font-bold text-slate-600 pt-2 border-t border-slate-100">
                        <span>Eco BP: {renderWeight(metrics.totalEcoBP, 'text-[0.7em] font-extrabold opacity-80 ml-0.5')}</span>
                        <span>Eco BM: {renderWeight(metrics.totalEcoBM, 'text-[0.7em] font-extrabold opacity-80 ml-0.5')}</span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] md:text-xs font-extrabold text-slate-500">
                        <span>Mês Ant.: <strong className="font-mono text-slate-800">{renderWeight(metrics.prevMonthEcoB, 'text-[0.7em] font-extrabold opacity-80 ml-0.5')}</strong></span>
                        {metrics.ecoBVar !== null && (
                          <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-black font-mono ${
                            metrics.ecoBVar <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {metrics.ecoBVar >= 0 ? '+' : ''}{metrics.ecoBVar.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: Best Operator Spotlight & Machine Highlights */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 flex-1 min-h-0">
                    {/* Melhor Operador Spotlight */}
                    <div className="lg:col-span-1 bg-gradient-to-br from-amber-500/10 via-white to-amber-50/60 border-2 border-amber-400 rounded-3xl p-4 lg:p-5 shadow-md flex flex-col justify-between relative overflow-hidden h-full min-h-0">
                      <ContinuousConfettiOverlay />
                      <div className="relative z-10 flex flex-col justify-between h-full">
                        <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-6 h-6 text-amber-500" />
                            <h2 className="text-sm md:text-base lg:text-lg font-black text-amber-900 uppercase tracking-wide">
                              Melhor Operador do Mês
                            </h2>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-2xl">🥇</span>
                          </div>
                        </div>

                        <div className="my-auto flex items-center gap-4">
                          <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-tr from-amber-500 to-amber-300 rounded-2xl p-1 shadow-md shrink-0">
                            <div className="w-full h-full bg-white rounded-xl flex items-center justify-center text-2xl lg:text-3xl font-black text-amber-600 border border-amber-200">
                              {metrics.bestOperator.name ? metrics.bestOperator.name.charAt(0).toUpperCase() : 'O'}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900 truncate tracking-tight">
                              {metrics.bestOperator.name}
                            </h3>
                            <p className="text-xs md:text-sm font-black text-amber-700 uppercase tracking-wider mt-0.5">
                              Máquina: {metrics.bestOperator.machine || 'Extrusão'}
                            </p>
                            <div className="mt-1 text-2xl lg:text-3xl font-mono font-black text-emerald-600">
                              {renderWeight(metrics.bestOperator.adjustedTotalNet ?? metrics.bestOperator.totalNet)}
                            </div>
                            {metrics.bestOperator.penaltiesCount > 0 && (
                              <div className="mt-0.5 text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                <span>Real: {renderWeight(metrics.bestOperator.rawTotalNet)}</span>
                                <span className="text-rose-600 font-black">(-{metrics.bestOperator.totalKgDeduction} Kg)</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-amber-100/90 border border-amber-300 rounded-xl p-2 text-center text-[11px] md:text-xs font-black text-amber-900 tracking-wider uppercase flex items-center justify-between">
                          <span>Líder em Produtividade</span>
                          {metrics.bestOperator.penaltiesCount > 0 && (
                            <span className="text-rose-700 font-extrabold text-[10px]">⚠️ {metrics.bestOperator.penaltiesCount} Infração</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Machine Cards: Cast 1, Cast 2, Erema */}
                    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 h-full min-h-0">
                      {/* Cast 1 */}
                      <div className="bg-white border-2 border-blue-200 rounded-3xl p-4 lg:p-5 flex flex-col justify-between shadow-md h-full min-h-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs md:text-sm lg:text-base font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
                            <Factory className="w-4 h-4 text-blue-600" /> Cast 1
                          </span>
                          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                        </div>
                        <div className="my-auto">
                          <p className="text-[10px] md:text-xs text-slate-400 uppercase font-black">Acumulado Mês</p>
                          <p className="text-2xl lg:text-3xl 2xl:text-4xl font-black text-blue-600 font-mono mt-0.5">
                            {renderWeight(metrics.machineMonthMap['Cast 1'] || 0)}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-slate-100 text-xs font-bold text-slate-600 space-y-0.5">
                          <div className="flex justify-between items-center">
                            <span>Ontem:</span>
                            <span className="font-extrabold text-slate-900 font-mono">
                              {renderWeight(metrics.machineYesterdayMap['Cast 1'] || 0, 'text-[0.7em] font-extrabold text-slate-600 ml-0.5')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] text-slate-500 pt-0.5 border-t border-slate-100">
                            <span>Mês Ant.:</span>
                            <span className="font-mono font-bold text-slate-700">
                              {renderWeight(metrics.prevMachineMap['Cast 1'] || 0, 'text-[0.7em] font-extrabold text-slate-600 ml-0.5')}
                              {metrics.cast1Var !== null && (
                                <span className={`ml-1 font-black ${metrics.cast1Var >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  ({metrics.cast1Var >= 0 ? '+' : ''}{metrics.cast1Var.toFixed(1)}%)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Cast 2 */}
                      <div className="bg-white border-2 border-indigo-200 rounded-3xl p-4 lg:p-5 flex flex-col justify-between shadow-md h-full min-h-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs md:text-sm lg:text-base font-black text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
                            <Factory className="w-4 h-4 text-indigo-600" /> Cast 2
                          </span>
                          <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
                        </div>
                        <div className="my-auto">
                          <p className="text-[10px] md:text-xs text-slate-400 uppercase font-black">Acumulado Mês</p>
                          <p className="text-2xl lg:text-3xl 2xl:text-4xl font-black text-indigo-600 font-mono mt-0.5">
                            {renderWeight(metrics.machineMonthMap['Cast 2'] || 0)}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-slate-100 text-xs font-bold text-slate-600 space-y-0.5">
                          <div className="flex justify-between items-center">
                            <span>Ontem:</span>
                            <span className="font-extrabold text-slate-900 font-mono">
                              {renderWeight(metrics.machineYesterdayMap['Cast 2'] || 0, 'text-[0.7em] font-extrabold text-slate-600 ml-0.5')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] text-slate-500 pt-0.5 border-t border-slate-100">
                            <span>Mês Ant.:</span>
                            <span className="font-mono font-bold text-slate-700">
                              {renderWeight(metrics.prevMachineMap['Cast 2'] || 0, 'text-[0.7em] font-extrabold text-slate-600 ml-0.5')}
                              {metrics.cast2Var !== null && (
                                <span className={`ml-1 font-black ${metrics.cast2Var >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  ({metrics.cast2Var >= 0 ? '+' : ''}{metrics.cast2Var.toFixed(1)}%)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Erema */}
                      <div className="bg-white border-2 border-teal-200 rounded-3xl p-4 lg:p-5 flex flex-col justify-between shadow-md h-full min-h-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs md:text-sm lg:text-base font-black text-teal-700 uppercase tracking-widest flex items-center gap-1.5">
                            <RefreshCw className="w-4 h-4 text-teal-600" /> Erema (Reciclado)
                          </span>
                          <span className="w-3 h-3 rounded-full bg-teal-500"></span>
                        </div>
                        <div className="my-auto">
                          <p className="text-[10px] md:text-xs text-slate-400 uppercase font-black">Acumulado Mês</p>
                          <p className="text-2xl lg:text-3xl 2xl:text-4xl font-black text-teal-600 font-mono mt-0.5">
                            {renderWeight(metrics.eremaMonthTotal)}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-slate-100 text-xs font-bold text-slate-600 space-y-0.5">
                          <div className="flex justify-between items-center">
                            <span>Ontem:</span>
                            <span className="font-extrabold text-slate-900 font-mono">
                              {renderWeight(metrics.machineYesterdayMap['Erema'] || 0, 'text-[0.7em] font-extrabold text-slate-600 ml-0.5')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] text-slate-500 pt-0.5 border-t border-slate-100">
                            <span>Mês Ant.:</span>
                            <span className="font-mono font-bold text-slate-700">
                              {renderWeight(metrics.prevMachineMap['Erema'] || 0, 'text-[0.7em] font-extrabold text-slate-600 ml-0.5')}
                              {metrics.eremaVar !== null && (
                                <span className={`ml-1 font-black ${metrics.eremaVar >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  ({metrics.eremaVar >= 0 ? '+' : ''}{metrics.eremaVar.toFixed(1)}%)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SLIDE 1: TENDÊNCIA EVOLUTIVA DE FILTRO DE TEMPO (MoM / YoY) */}
              {currentSlide === 1 && (
                <div className="w-full flex-1 flex flex-col justify-between gap-3 md:gap-4 overflow-hidden h-full min-h-0">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2 shrink-0">
                    <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                      <TrendingUp className="w-7 h-7 text-blue-600" /> Tendência Evolutiva de Filtro de Tempo (MoM / YoY)
                    </h2>
                    <span className="text-xs md:text-sm font-mono font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                      Análise Histórica & Crescimento
                    </span>
                  </div>

                  {/* TOP: Main Composed Chart (Occupies largest vertical area) */}
                  <div className="w-full flex-1 min-h-0 bg-white border-2 border-slate-200 rounded-3xl p-4 lg:p-5 shadow-md flex flex-col justify-between overflow-hidden">
                    <div className="flex items-center justify-between mb-2 shrink-0">
                      <h3 className="text-sm md:text-base lg:text-lg font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-600" /> Produção Líquida (kg) vs Taxa de Descarte (%)
                      </h3>
                      <div className="flex items-center gap-4 text-xs md:text-sm font-extrabold">
                        <span className="flex items-center gap-1.5 text-blue-600">
                          <span className="w-3 h-3 rounded-sm bg-blue-600"></span> Vol. Produção
                        </span>
                        <span className="flex items-center gap-1.5 text-rose-600">
                          <span className="w-3 h-0.5 bg-rose-600 border-2 border-rose-600"></span> Índice Descarte %
                        </span>
                        <span className="flex items-center gap-1.5 text-emerald-600">
                          <span className="w-3 h-0.5 bg-emerald-600 border-2 border-emerald-600"></span> Eco A %
                        </span>
                      </div>
                    </div>

                    <div className="w-full flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={metrics.monthlyTimelineData} margin={{ top: 55, right: 30, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="fullLabel" stroke="#475569" tick={{ fill: '#0f172a', fontSize: 13, fontWeight: 800 }} />
                          <YAxis
                            yAxisId="left"
                            stroke="#2563eb"
                            tick={{ fill: '#1d4ed8', fontSize: 13, fontWeight: 700 }}
                            tickFormatter={(val: number) => formatWeightStr(val)}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#e11d48"
                            domain={[0, 'auto']}
                            tick={{ fill: '#be123c', fontSize: 13, fontWeight: 700 }}
                            tickFormatter={(val: number) => `${formatNumDot(val, 1, 1)}%`}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '15px', fontWeight: 'bold' }}
                            formatter={(value: any, name: any) => {
                              if (name === 'Produção Líquida') return [formatWeightStr(Number(value)), 'Produção Líquida'];
                              if (name === 'Taxa de Descarte %') return [`${formatNumDot(Number(value), 1, 2)}%`, 'Índice de Perda'];
                              return [`${formatNumDot(Number(value), 1, 2)}%`, 'Envio Eco A'];
                            }}
                          />
                          <Bar yAxisId="left" dataKey="producao" name="Produção Líquida" fill="#2563eb" radius={[8, 8, 0, 0]} barSize={42}>
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
                                    {/* Line 1: Vol Produção (Blue) */}
                                    <text textAnchor="middle" y={0} fill="#1d4ed8" fontWeight={900}>
                                      <tspan fontSize={14}>{numStr}</tspan>
                                      <tspan fontSize={10} fontWeight={900} dx={1}>{unitStr}</tspan>
                                    </text>

                                    {/* Line 2: Taxa de Descarte % (Rose/Red) */}
                                    {perdaStr && (
                                      <text textAnchor="middle" y={16} fill="#e11d48" fontWeight={900} fontSize={13}>
                                        {perdaStr}
                                      </text>
                                    )}

                                    {/* Line 3: Eco A % (Emerald/Green) */}
                                    {ecoAStr && (
                                      <text textAnchor="middle" y={32} fill="#059669" fontWeight={900} fontSize={13}>
                                        {ecoAStr}
                                      </text>
                                    )}
                                  </g>
                                );
                              }}
                            />
                          </Bar>
                          <Line yAxisId="right" type="monotone" dataKey="perdaPerc" name="Taxa de Descarte %" stroke="#e11d48" strokeWidth={3} dot={{ r: 5 }} />
                          <Line yAxisId="right" type="monotone" dataKey="ecoAPerc" name="Eco A %" stroke="#10b981" strokeWidth={3} strokeDasharray="4 4" dot={{ r: 4 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* BOTTOM: 4 Cards Row (Equal width side by side) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 w-full shrink-0 lg:h-[165px] xl:h-[180px]">
                    {/* Card 1: Crescimento Mensal (MoM) */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50/40 border-2 border-blue-200 rounded-3xl p-3 lg:p-4 shadow-md flex flex-col justify-between h-full">
                      <span className="text-xs font-black text-blue-900 uppercase tracking-wider block border-b border-blue-200/60 pb-1">
                        Crescimento Mensal (MoM)
                      </span>
                      <div className="text-2xl lg:text-3xl xl:text-4xl font-black text-slate-900 font-mono my-auto flex items-center justify-between gap-2 flex-wrap">
                        <span>{renderWeight(metrics.prodMonthTotal)}</span>
                        {metrics.prodVar !== null && (
                          <span className={`text-xs lg:text-sm font-black px-2 py-0.5 rounded-lg font-mono shadow-sm ${
                            metrics.prodVar >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {metrics.prodVar >= 0 ? '+' : ''}{formatNumDot(metrics.prodVar, 1, 1)}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs lg:text-sm font-extrabold text-slate-700 border-t border-blue-200/60 pt-1.5 flex justify-between items-center">
                        <span>vs {metrics.prevMonthName}:</span>
                        <strong className="font-mono font-black text-slate-900 text-sm lg:text-base">{renderWeight(metrics.prevMonthProdTotal)}</strong>
                      </p>
                    </div>

                    {/* Card 2: Rendimento Físico */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 border-2 border-emerald-200 rounded-3xl p-3 lg:p-4 shadow-md flex flex-col justify-between h-full">
                      <span className="text-xs font-black text-emerald-900 uppercase tracking-wider block border-b border-emerald-200/60 pb-1">
                        Rendimento Físico
                      </span>
                      <div className="text-3xl lg:text-4xl xl:text-5xl font-mono font-black text-emerald-600 my-auto text-center leading-none tracking-tight">
                        {metrics.overallYieldPercMonth.toFixed(2)}%
                      </div>
                      <div className="text-xs lg:text-sm font-extrabold text-slate-700 border-t border-emerald-200/60 pt-1.5 flex justify-between items-center">
                        <span>Taxa de Descarte:</span>
                        <strong className="text-rose-700 font-mono font-black text-base lg:text-lg">{metrics.overallLossPercMonth.toFixed(2)}%</strong>
                      </div>
                    </div>

                    {/* Card 3: Composição de Perdas */}
                    <div className="bg-gradient-to-br from-amber-50 to-rose-50/40 border-2 border-amber-200 rounded-3xl p-3 lg:p-4 shadow-md flex flex-col justify-between h-full">
                      <span className="text-xs font-black text-amber-900 uppercase tracking-wider block border-b border-amber-200/60 pb-1">
                        Composição de Perdas
                      </span>
                      <div className="space-y-1 my-auto">
                        <div className="flex items-center justify-between text-xs lg:text-sm font-extrabold">
                          <span className="text-amber-900">Eco B (Refilo):</span>
                          <span className="font-mono font-black text-amber-700 text-sm lg:text-base">{renderWeight(metrics.totalEcoB)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs lg:text-sm font-extrabold">
                          <span className="text-rose-900">Borra Total:</span>
                          <span className="font-mono font-black text-rose-700 text-sm lg:text-base">{renderWeight(metrics.totalBorra)}</span>
                        </div>
                      </div>
                      <div className="text-xs lg:text-sm font-black text-slate-800 border-t border-amber-200/60 pt-1.5 flex justify-between items-center">
                        <span>Total Descarte:</span>
                        <strong className="font-mono text-rose-700 font-black text-base lg:text-lg">{renderWeight(metrics.totalEcoB + metrics.totalBorra)}</strong>
                      </div>
                    </div>

                    {/* Card 4: Histórico Mês a Mês (Auto Scroll) */}
                    <div className="bg-white border-2 border-slate-200 rounded-3xl p-3 lg:p-4 shadow-md flex flex-col h-full overflow-hidden">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1 shrink-0">
                        Histórico Mês a Mês
                      </h4>
                      <div
                        ref={historyScrollRef}
                        className="space-y-1 text-xs font-bold overflow-y-auto flex-1 pr-1 scrollbar-none"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      >
                        {(metrics.monthlyTimelineData.length > 0
                          ? Array(10).fill(metrics.monthlyTimelineData).flat()
                          : []
                        ).map((m, idx) => (
                          <div key={`${m.monthStr}-${idx}`} className="flex items-center justify-between py-0.5 border-b border-slate-100 last:border-0 shrink-0">
                            <span className="text-slate-800 font-extrabold">{m.fullLabel}:</span>
                            <span className="font-mono text-slate-900 font-black">{renderWeight(m.producao)}</span>
                            <span className={`font-mono text-xs font-black ${m.perdaPerc > 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {m.perdaPerc}% descarte
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SLIDE 2: HISTÓRICO DE PARADA DE MÁQUINA */}
              {currentSlide === 2 && (
                <div className="w-full flex-1 flex flex-col justify-between gap-3 md:gap-4 h-full min-h-0 overflow-hidden">
                  <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2 shrink-0">
                    <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                      <Clock className="w-7 h-7 text-rose-600" /> Histórico de parada de máquina
                    </h2>
                    <span className="text-xs md:text-sm font-mono font-black text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                      Gestão de Paradas
                    </span>
                  </div>

                  {/* TOP: Chart occupying upper area */}
                  <div className="w-full flex-1 flex flex-col justify-between bg-white border-2 border-slate-200 rounded-3xl p-4 lg:p-5 shadow-md min-h-0 overflow-hidden">
                    <div className="flex items-center justify-between mb-2 shrink-0">
                      <h3 className="text-sm md:text-base lg:text-lg font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <Activity className="w-5 h-5 text-rose-600" /> Distribuição de Minutos Parados por Categoria
                      </h3>
                      <div className="flex items-center gap-4 text-xs md:text-sm font-extrabold">
                        <span className="flex items-center gap-1.5 text-rose-600">
                          <span className="w-3 h-3 rounded-sm bg-rose-600"></span> Manutenção
                        </span>
                        <span className="flex items-center gap-1.5 text-amber-600">
                          <span className="w-3 h-3 rounded-sm bg-amber-500"></span> Processo
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <span className="w-3 h-3 rounded-sm bg-slate-500"></span> Outros
                        </span>
                      </div>
                    </div>

                    <div className="w-full flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={metrics.monthlyTimelineData} margin={{ top: 25, right: 20, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="fullLabel" stroke="#475569" tick={{ fill: '#0f172a', fontSize: 13, fontWeight: 800 }} />
                          <YAxis stroke="#475569" tick={{ fill: '#334155', fontSize: 13, fontWeight: 700 }} tickFormatter={(val: number) => `${val} min`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '1rem', fontSize: '15px', fontWeight: 'bold' }}
                            formatter={(value: number, name: string) => [`${value} min (${(value / 60).toFixed(1)} h)`, name]}
                          />
                          <Bar dataKey="manutencao" name="Manutenção" fill="#ef4444" stackId="stoppage" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="processo" name="Processo" fill="#f59e0b" stackId="stoppage" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="outros" name="Outros" fill="#64748b" stackId="stoppage" radius={[8, 8, 0, 0]}>
                            <LabelList
                              dataKey="paradasTotal"
                              position="top"
                              formatter={(val: number) => (val > 0 ? `${val} min` : '')}
                              style={{ fontSize: 13, fontWeight: 900, fill: '#be123c' }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* BOTTOM: Cards Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 w-full shrink-0 lg:h-[165px] xl:h-[180px]">
                    {/* Total Stoppage Time Card */}
                    <div className="bg-gradient-to-br from-rose-50 to-amber-50/40 border-2 border-rose-200 rounded-3xl p-3 lg:p-4 shadow-md flex flex-col justify-between h-full">
                      <span className="text-xs font-black text-rose-900 uppercase tracking-wider block border-b border-rose-200/60 pb-1">
                        Total de Indisponibilidade no Mês
                      </span>
                      <div className="text-2xl lg:text-3xl xl:text-4xl font-mono font-black text-rose-700 my-auto">
                        {metrics.totalParadasMin} <span className="text-sm lg:text-base font-black text-rose-600">min</span>
                      </div>
                      <p className="text-xs lg:text-sm font-extrabold text-slate-700 border-t border-rose-200/60 pt-1.5 flex justify-between items-center">
                        <span>Equivalente em Horas:</span>
                        <strong className="text-slate-900 font-mono font-black text-sm lg:text-lg">{metrics.totalParadasHoras} h</strong>
                      </p>
                    </div>

                    {/* Stoppage Causes Breakdown Card */}
                    <div className="lg:col-span-2 bg-white border-2 border-slate-200 rounded-3xl p-3 lg:p-4 shadow-md flex flex-col justify-between h-full">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1 shrink-0">
                        Detalhamento de Minutos
                      </h4>

                      <div className="grid grid-cols-3 gap-2 lg:gap-3 my-auto">
                        <div className="flex flex-col justify-between p-2.5 bg-rose-50 border border-rose-200 rounded-2xl">
                          <div>
                            <span className="text-xs font-black text-rose-900 uppercase block">Manutenção</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Corretiva / Preventiva</span>
                          </div>
                          <span className="text-lg lg:text-xl xl:text-2xl font-mono font-black text-rose-700 mt-1">{metrics.totalManutencaoMin} min</span>
                        </div>

                        <div className="flex flex-col justify-between p-2.5 bg-amber-50 border border-amber-200 rounded-2xl">
                          <div>
                            <span className="text-xs font-black text-amber-900 uppercase block">Processo</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Ajustes & Trocas</span>
                          </div>
                          <span className="text-lg lg:text-xl xl:text-2xl font-mono font-black text-amber-700 mt-1">{metrics.totalProcessoMin} min</span>
                        </div>

                        <div className="flex flex-col justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-2xl">
                          <div>
                            <span className="text-xs font-black text-slate-900 uppercase block">Outros</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Eventos Diversos</span>
                          </div>
                          <span className="text-lg lg:text-xl xl:text-2xl font-mono font-black text-slate-700 mt-1">{metrics.totalOutrosMin} min</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SLIDE 3: CORRELAÇÃO ESTRUTURADA: ECO B VS TUBETES ECO B */}
              {currentSlide === 3 && (
                <div className="w-full flex-1 flex flex-col justify-between gap-3 md:gap-4 h-full min-h-0 overflow-hidden">
                  <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2 shrink-0">
                    <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                      <Scale className="w-7 h-7 text-amber-600" /> Correlação Estruturada: Eco B vs Tubetes Eco B
                    </h2>
                    <span className="text-xs md:text-sm font-mono font-black text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                      Análise de Densidade & Insumos
                    </span>
                  </div>

                  {/* TOP: Dual Axis Composed Chart (Occupies largest vertical area) */}
                  <div className="w-full flex-1 min-h-0 bg-white border-2 border-slate-200 rounded-3xl p-4 lg:p-5 shadow-md flex flex-col justify-between overflow-hidden">
                    <div className="flex items-center justify-between mb-2 shrink-0">
                      <h3 className="text-sm md:text-base lg:text-lg font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <Activity className="w-5 h-5 text-amber-600" /> Histórico Diário: Eco B (Barras, Eixo Esq.) vs Tubetes (Linha, Eixo Dir.)
                      </h3>
                      <div className="flex items-center gap-4 text-xs md:text-sm font-extrabold">
                        <span className="flex items-center gap-1.5 text-amber-600">
                          <span className="w-3 h-3 rounded-sm bg-amber-500"></span> Eco B (kg)
                        </span>
                        <span className="flex items-center gap-1.5 text-blue-600">
                          <span className="w-3 h-0.5 bg-blue-600 border-2 border-blue-600"></span> Tubetes (un)
                        </span>
                      </div>
                    </div>

                    <div className="w-full flex-1 min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={metrics.dailyEcoBTubetesData} margin={{ top: 20, right: 30, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="dateBR" stroke="#475569" tick={{ fill: '#0f172a', fontSize: 13, fontWeight: 800 }} />
                          <YAxis
                            yAxisId="left"
                            stroke="#d97706"
                            tick={{ fill: '#b45309', fontSize: 13, fontWeight: 700 }}
                            tickFormatter={(val: number) => formatWeightStr(val)}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#2563eb"
                            tick={{ fill: '#1d4ed8', fontSize: 13, fontWeight: 700 }}
                            tickFormatter={(val: number) => `${val} un`}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '1rem', fontSize: '15px', fontWeight: 'bold' }}
                            formatter={(value: any, name: string) => {
                              if (name === 'Eco B Gerado') return [formatWeightStr(Number(value)), 'Eco B Gerado'];
                              return [`${Number(value).toLocaleString('pt-BR')} un`, 'Tubetes Usados'];
                            }}
                          />
                          <Bar yAxisId="left" dataKey="ecoB" name="Eco B Gerado" fill="#f59e0b" radius={[8, 8, 0, 0]} barSize={36}>
                            <LabelList
                              dataKey="ecoB"
                              position="top"
                              formatter={(val: number) => (val > 0 ? formatWeightStr(val) : '')}
                              style={{ fontSize: 10, fontWeight: 800, fill: '#b45309' }}
                            />
                          </Bar>
                          <Line yAxisId="right" type="monotone" dataKey="tubetesEcoB" name="Tubetes Usados" stroke="#2563eb" strokeWidth={3} dot={{ r: 5 }}>
                            <LabelList
                              dataKey="tubetesEcoB"
                              position="top"
                              formatter={(val: number) => (val > 0 ? `${val} un` : '')}
                              style={{ fontSize: 10, fontWeight: 800, fill: '#1d4ed8' }}
                            />
                          </Line>
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* BOTTOM: 2 KPI Cards Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full shrink-0 lg:h-[165px] xl:h-[180px]">
                    {/* Card 1: Volume Total de Eco B */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 border-2 border-amber-200 rounded-3xl p-3 lg:p-4 shadow-md flex flex-col justify-between h-full">
                      <span className="text-xs font-black text-amber-800 uppercase tracking-wider block border-b border-amber-200/60 pb-1">
                        Volume Total de Eco B (Mês)
                      </span>
                      <div className="text-3xl lg:text-4xl xl:text-5xl font-mono font-black text-amber-600 my-auto">
                        {renderWeight(metrics.totalEcoB)}
                      </div>
                      <div className="text-xs lg:text-sm font-bold text-slate-700 border-t border-amber-200/60 pt-1.5 flex justify-between items-center">
                        <span>Eco BP: <strong className="text-slate-900 font-mono font-black">{renderWeight(metrics.totalEcoBP)}</strong></span>
                        <span>Eco BM: <strong className="text-slate-900 font-mono font-black">{renderWeight(metrics.totalEcoBM)}</strong></span>
                      </div>
                    </div>

                    {/* Card 2: Tubetes Consumed & Ratio */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50/40 border-2 border-blue-200 rounded-3xl p-3 lg:p-4 shadow-md flex flex-col justify-between h-full">
                      <span className="text-xs font-black text-blue-700 uppercase tracking-wider block border-b border-blue-200/60 pb-1">
                        Tubetes Eco B Consumidos
                      </span>
                      <div className="text-3xl lg:text-4xl xl:text-5xl font-mono font-black text-blue-800 my-auto">
                        {metrics.totalTubetesMonth.toLocaleString('pt-BR')} <span className="text-sm lg:text-base font-black text-blue-600">unidades</span>
                      </div>
                      <div className="text-xs lg:text-sm font-extrabold text-slate-700 border-t border-blue-200/60 pt-1.5 flex justify-between items-center">
                        <span>Relação Média:</span>
                        <span className="text-base lg:text-lg font-mono font-black text-emerald-600">
                          {renderWeight(metrics.overallRatioMonth, 'text-[0.6em] font-black opacity-80 ml-0.5', '/ Tubete')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SLIDE 4: RANKING DE OPERADORES DE EXTRUSÃO */}
              {currentSlide === 4 && (
                <div className="w-full flex-1 flex flex-col justify-between gap-3 md:gap-4 h-full min-h-0 overflow-hidden">
                  <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2 shrink-0 flex-wrap gap-2">
                    <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                      <Award className="w-7 h-7 text-amber-500" /> Ranking de Melhores Operadores do Mês
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-xs md:text-sm font-mono font-black text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                        Líderes de Produtividade
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 flex-1 min-h-0 items-center">
                    {metrics.topOperators.slice(0, 6).map((op, index) => {
                      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                      const isTop3 = index < 3;

                      return (
                        <div
                          key={index}
                          className={`bg-white rounded-3xl p-4 lg:p-5 border-2 shadow-md flex items-center gap-4 relative overflow-hidden transition-all ${
                            op.isDisqualified
                              ? 'border-rose-300 bg-rose-50/40'
                              : index === 0
                              ? 'border-amber-400 bg-gradient-to-br from-amber-50/80 via-white to-amber-100/40 shadow-lg'
                              : isTop3
                              ? 'border-slate-300'
                              : 'border-slate-200'
                          }`}
                        >
                          {index === 0 && !op.isDisqualified && <ContinuousConfettiOverlay />}
                          <div className="relative z-10 flex items-center gap-4 w-full">
                            <div className={`text-2xl lg:text-3xl font-black w-12 h-12 lg:w-16 lg:h-16 flex items-center justify-center rounded-2xl shrink-0 border ${
                              op.isDisqualified
                                ? 'bg-rose-100 text-rose-700 border-rose-200'
                                : index === 0
                                ? 'bg-amber-400 text-slate-900 border-amber-300 shadow-md'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {op.isDisqualified ? '⛔' : medal}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <h3 className="text-lg md:text-xl font-black text-slate-900 truncate tracking-tight">{op.name}</h3>
                                {op.penaltiesCount > 0 && (
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 ${op.isDisqualified ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                                    {op.isDisqualified ? 'Desqualificado' : `⚠️ -${op.totalKgDeduction > 0 ? op.totalKgDeduction + 'kg' : op.totalPercentDeduction + '%'}`}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">{op.machine}</p>
                              
                              <div className="text-xl lg:text-2xl font-mono font-black text-emerald-600 mt-1 flex items-baseline justify-between">
                                <span>{renderWeight(op.adjustedTotalNet ?? op.totalNet)}</span>
                                {op.rawTotalNet !== op.adjustedTotalNet && !op.isDisqualified && (
                                  <span className="text-[10px] font-bold text-slate-400 line-through">
                                    {renderWeight(op.rawTotalNet)}
                                  </span>
                                )}
                              </div>

                              {op.penalties && op.penalties.length > 0 && (
                                <p className="text-[10px] text-rose-700 font-bold truncate mt-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
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
              )}

              {/* SLIDE 5: AVISOS DE RECURSOS HUMANOS (RH) */}
              {currentSlide === 5 && (
                <div className="w-full flex-1 flex flex-col justify-between gap-2 md:gap-3 h-full min-h-0 overflow-hidden">
                  {/* Slide Header */}
                  <div className="flex items-center justify-between bg-white px-4 py-2 sm:py-2.5 rounded-2xl border-2 border-blue-200 shadow-xs shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md shrink-0">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base md:text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                          Recursos Humanos • Avisos & Comunicados
                        </h2>
                        <p className="hidden sm:block text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Informações Institucionais e Gestão de Pessoas
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {rhNotices.length > 1 && (
                        <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl">
                          <span className="text-[10px] sm:text-xs font-mono font-black text-blue-700">
                            Aviso {activeRhIndex + 1} de {rhNotices.length}
                          </span>
                          <button
                            onClick={() => setActiveRhIndex((prev) => (prev - 1 + rhNotices.length) % rhNotices.length)}
                            className="p-1 rounded-md hover:bg-blue-200/60 text-blue-700 transition cursor-pointer"
                            title="Aviso anterior"
                          >
                            <ChevronLeft size={13} />
                          </button>
                          <button
                            onClick={() => setActiveRhIndex((prev) => (prev + 1) % rhNotices.length)}
                            className="p-1 rounded-md hover:bg-blue-200/60 text-blue-700 transition cursor-pointer"
                            title="Próximo aviso"
                          >
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      )}
                      {!isTvMode && (
                        <button
                          onClick={() => setNoticeModalCategory('rh')}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Gerenciar Avisos</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* RH Notice Display Container (TELA COMPLETA - SEM ROLAGEM) */}
                  <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    {rhNotices.length === 0 ? (
                      <div className="h-full bg-white rounded-3xl border-2 border-dashed border-blue-200 p-6 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center shadow-inner">
                          <Users className="w-7 h-7" />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight">Nenhum aviso de RH no momento</h3>
                          <p className="text-xs font-medium text-slate-500 max-w-md mx-auto mt-1">
                            {!isTvMode ? 'Clique no botão acima "Gerenciar Avisos" para publicar novos comunicados para a equipe.' : 'Nenhum comunicado institucional cadastrado.'}
                          </p>
                        </div>
                        {!isTvMode && (
                          <button
                            onClick={() => setNoticeModalCategory('rh')}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
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
                            className="h-full min-h-0 bg-white rounded-3xl border-2 border-slate-200 shadow-md p-4 sm:p-5 lg:p-6 flex flex-col justify-between overflow-hidden relative"
                          >
                            {/* Top Badge & Date & Actions */}
                            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3 shrink-0">
                              <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest border shadow-2xs ${
                                  notice.priority === 'high'
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : notice.priority === 'medium'
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-blue-100 text-blue-800 border-blue-300'
                                }`}>
                                  {notice.badgeText || 'COMUNICADO RH'}
                                </span>
                                {notice.priority === 'high' && (
                                  <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-2xs">
                                    Prioridade Alta
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {notice.date && (
                                  <span className="text-[10px] sm:text-xs font-mono font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
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

                            {/* Main Content Area: Responsive Widescreen Split or Single-Column */}
                            {notice.imageUrl ? (
                              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-stretch overflow-hidden">
                                {/* Left Text Column */}
                                <div className="lg:col-span-7 flex flex-col justify-center min-h-0 overflow-hidden pr-0 lg:pr-2">
                                  <div className="shrink-0 mb-2">
                                    <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl 2xl:text-5xl font-black text-slate-900 tracking-tight leading-snug line-clamp-3">
                                      {notice.title}
                                    </h3>
                                    {notice.subtitle && (
                                      <p className="text-xs sm:text-sm md:text-base font-extrabold text-blue-600 uppercase tracking-wider mt-1 line-clamp-2">
                                        {notice.subtitle}
                                      </p>
                                    )}
                                  </div>
                                  <div className="pt-2 sm:pt-3 border-t border-slate-100 overflow-hidden">
                                    <p className="text-xs sm:text-sm md:text-base lg:text-lg 2xl:text-xl font-medium text-slate-700 leading-relaxed overflow-hidden">
                                      {notice.description}
                                    </p>
                                  </div>
                                </div>

                                {/* Right Image Column */}
                                <div className="lg:col-span-5 h-full min-h-0 rounded-2xl lg:rounded-3xl overflow-hidden border border-slate-200 bg-slate-950 relative shadow-sm flex items-center justify-center">
                                  <img
                                    src={notice.imageUrl}
                                    alt={notice.title}
                                    className="w-full h-full object-cover object-center rounded-2xl lg:rounded-3xl"
                                  />
                                  {notice.imageCaption && (
                                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-2.5 sm:p-3 text-white text-[10px] sm:text-xs font-bold truncate">
                                      {notice.imageCaption}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* Full Width Text Card (No Image) */
                              <div className="flex-1 min-h-0 flex flex-col justify-center max-w-4xl mx-auto w-full text-center lg:text-left overflow-hidden px-2 sm:px-6">
                                <div className="shrink-0 mb-3">
                                  <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl 2xl:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                                    {notice.title}
                                  </h3>
                                  {notice.subtitle && (
                                    <p className="text-xs sm:text-sm md:text-base lg:text-lg font-extrabold text-blue-600 uppercase tracking-widest mt-2">
                                      {notice.subtitle}
                                    </p>
                                  )}
                                </div>
                                <div className="pt-3 sm:pt-4 border-t border-slate-100 overflow-hidden">
                                  <p className="text-sm sm:text-base md:text-lg lg:text-xl 2xl:text-2xl font-medium text-slate-700 leading-relaxed overflow-hidden">
                                    {notice.description}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Bottom Pagination Dots (If multiple notices) */}
                            {rhNotices.length > 1 && (
                              <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 shrink-0 mt-2">
                                {rhNotices.map((_, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setActiveRhIndex(i)}
                                    className={`h-2 transition-all rounded-full cursor-pointer ${
                                      i === activeRhIndex ? 'w-8 bg-blue-600' : 'w-2 bg-slate-300 hover:bg-slate-400'
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

              {/* SLIDE 6: AVISOS DE SEGURANÇA DO TRABALHO (SST & CIPA) */}
              {currentSlide === 6 && (
                <div className="w-full flex-1 flex flex-col justify-between gap-2 md:gap-3 h-full min-h-0 overflow-hidden">
                  {/* Slide Header */}
                  <div className="flex items-center justify-between bg-white px-4 py-2 sm:py-2.5 rounded-2xl border-2 border-emerald-300 shadow-xs shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md shrink-0">
                        <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-sm sm:text-base md:text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                          Segurança do Trabalho • SST & CIPA
                        </h2>
                        <p className="hidden sm:block text-[10px] md:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Prevenção de Acidentes, EPIs e Saúde Ocupacional
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {safetyNotices.length > 1 && (
                        <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl">
                          <span className="text-[10px] sm:text-xs font-mono font-black text-emerald-800">
                            Aviso {activeSafetyIndex + 1} de {safetyNotices.length}
                          </span>
                          <button
                            onClick={() => setActiveSafetyIndex((prev) => (prev - 1 + safetyNotices.length) % safetyNotices.length)}
                            className="p-1 rounded-md hover:bg-emerald-200/60 text-emerald-800 transition cursor-pointer"
                            title="Aviso anterior"
                          >
                            <ChevronLeft size={13} />
                          </button>
                          <button
                            onClick={() => setActiveSafetyIndex((prev) => (prev + 1) % safetyNotices.length)}
                            className="p-1 rounded-md hover:bg-emerald-200/60 text-emerald-800 transition cursor-pointer"
                            title="Próximo aviso"
                          >
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      )}
                      {!isTvMode && (
                        <button
                          onClick={() => setNoticeModalCategory('safety')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md transition-all active:scale-95 shrink-0 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Gerenciar Avisos</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Safety Notice Display Container (TELA COMPLETA - SEM ROLAGEM) */}
                  <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                    {safetyNotices.length === 0 ? (
                      <div className="h-full bg-white rounded-3xl border-2 border-dashed border-emerald-200 p-6 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center shadow-inner">
                          <ShieldAlert className="w-7 h-7" />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-black text-slate-800 uppercase tracking-tight">Nenhum aviso de Segurança no momento</h3>
                          <p className="text-xs font-medium text-slate-500 max-w-md mx-auto mt-1">
                            {!isTvMode ? 'Clique no botão acima "Gerenciar Avisos" para publicar alertas de segurança e SST.' : 'Nenhum alerta de segurança cadastrado.'}
                          </p>
                        </div>
                        {!isTvMode && (
                          <button
                            onClick={() => setNoticeModalCategory('safety')}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
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
                            className="h-full min-h-0 bg-white rounded-3xl border-2 border-emerald-200 shadow-md p-4 sm:p-5 lg:p-6 flex flex-col justify-between overflow-hidden relative"
                          >
                            {/* Top Badge & Date & Actions */}
                            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3 shrink-0">
                              <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest border shadow-2xs ${
                                  notice.priority === 'high'
                                    ? 'bg-rose-600 text-white border-rose-700'
                                    : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                }`}>
                                  {notice.badgeText || 'SEGURANÇA DO TRABALHO'}
                                </span>
                                {notice.priority === 'high' && (
                                  <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-2xs">
                                    Alerta Crítico SST
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {notice.date && (
                                  <span className="text-[10px] sm:text-xs font-mono font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
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
                                  <div className="shrink-0 mb-2">
                                    <h3 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl 2xl:text-5xl font-black text-slate-900 tracking-tight leading-snug line-clamp-3">
                                      {notice.title}
                                    </h3>
                                    {notice.subtitle && (
                                      <p className="text-xs sm:text-sm md:text-base font-black text-emerald-700 uppercase tracking-wider mt-1 line-clamp-2">
                                        {notice.subtitle}
                                      </p>
                                    )}
                                  </div>
                                  <div className="pt-2 sm:pt-3 border-t border-slate-100 overflow-hidden">
                                    <p className="text-xs sm:text-sm md:text-base lg:text-lg 2xl:text-xl font-medium text-slate-800 leading-relaxed overflow-hidden">
                                      {notice.description}
                                    </p>
                                  </div>
                                </div>

                                {/* Right Image Column */}
                                <div className="lg:col-span-5 h-full min-h-0 rounded-2xl lg:rounded-3xl overflow-hidden border border-emerald-200 bg-slate-950 relative shadow-sm flex items-center justify-center">
                                  <img
                                    src={notice.imageUrl}
                                    alt={notice.title}
                                    className="w-full h-full object-cover object-center rounded-2xl lg:rounded-3xl"
                                  />
                                  {notice.imageCaption && (
                                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-2.5 sm:p-3 text-white text-[10px] sm:text-xs font-bold truncate">
                                      {notice.imageCaption}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* Full Width Text Card (No Image) */
                              <div className="flex-1 min-h-0 flex flex-col justify-center max-w-4xl mx-auto w-full text-center lg:text-left overflow-hidden px-2 sm:px-6">
                                <div className="shrink-0 mb-3">
                                  <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl 2xl:text-6xl font-black text-slate-900 tracking-tight leading-tight">
                                    {notice.title}
                                  </h3>
                                  {notice.subtitle && (
                                    <p className="text-xs sm:text-sm md:text-base lg:text-lg font-black text-emerald-700 uppercase tracking-widest mt-2">
                                      {notice.subtitle}
                                    </p>
                                  )}
                                </div>
                                <div className="pt-3 sm:pt-4 border-t border-slate-100 overflow-hidden">
                                  <p className="text-sm sm:text-base md:text-lg lg:text-xl 2xl:text-2xl font-medium text-slate-800 leading-relaxed overflow-hidden">
                                    {notice.description}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Bottom Pagination Dots */}
                            {safetyNotices.length > 1 && (
                              <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 shrink-0 mt-2">
                                {safetyNotices.map((_, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setActiveSafetyIndex(i)}
                                    className={`h-2 transition-all rounded-full cursor-pointer ${
                                      i === activeSafetyIndex ? 'w-8 bg-emerald-600' : 'w-2 bg-slate-300 hover:bg-slate-400'
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
          /* GRID VIEW: VISTA COMPLETA DE TV */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full overflow-y-auto pr-2 pb-10">
            {/* Yesterday Card */}
            <div className="bg-white border-2 border-blue-200 rounded-3xl p-6 lg:p-8 shadow-md">
              <span className="text-sm md:text-base font-black text-blue-700 uppercase tracking-widest block mb-2">
                Produção Ontem
              </span>
              <div className="text-4xl lg:text-5xl font-black text-slate-900 font-mono my-3">
                {renderWeight(metrics.yesterdayProdTotal)}
              </div>
              <div className="text-sm font-bold text-slate-600 pt-3 border-t-2 border-slate-100">
                Corte de Fita: <span className="text-indigo-600 font-black">{renderM2(metrics.ribbonYesterdayM2, 'text-[0.7em] font-extrabold text-indigo-600 ml-0.5')}</span>
              </div>
            </div>

            {/* Goal Card */}
            <div className="bg-white border-2 border-emerald-200 rounded-3xl p-6 lg:p-8 shadow-md">
              <span className="text-sm md:text-base font-black text-emerald-700 uppercase tracking-widest block mb-2">
                Meta do Mês
              </span>
              <div className="text-4xl lg:text-5xl font-black text-slate-900 font-mono my-3">
                {renderWeight(metrics.prodMonthTotal)}
              </div>
              <div className="text-sm font-bold text-emerald-600">
                {metrics.goalPercent.toFixed(1)}% Atingido da Meta ({renderWeight(metrics.currentGoal, 'text-[0.7em] font-extrabold text-emerald-600 ml-0.5')})
              </div>
            </div>

            {/* Projection Card */}
            <div className="bg-white border-2 border-indigo-200 rounded-3xl p-6 lg:p-8 shadow-md">
              <span className="text-sm md:text-base font-black text-indigo-700 uppercase tracking-widest block mb-2">
                Projeção Fechamento
              </span>
              <div className="text-4xl lg:text-5xl font-black text-indigo-600 font-mono my-3">
                {renderWeight(metrics.projectedMonthTotal)}
              </div>
              <div className="text-sm font-bold text-slate-600">
                Média Necessária: <span className="text-amber-600 font-black">{renderWeight(metrics.dailyGoalRequired, 'text-[0.55em] font-extrabold text-amber-600 ml-0.5', '/dia')}</span>
              </div>
            </div>

            {/* Eco B Card */}
            <div className="bg-white border-2 border-amber-200 rounded-3xl p-6 lg:p-8 shadow-md">
              <span className="text-sm md:text-base font-black text-amber-700 uppercase tracking-widest block mb-2">
                Total Eco B Produzido
              </span>
              <div className="text-4xl lg:text-5xl font-black text-amber-600 font-mono my-3">
                {renderWeight(metrics.totalEcoB)}
              </div>
              <div className="text-sm font-bold text-slate-600">
                Eco BP: {renderWeight(metrics.totalEcoBP, 'text-[0.7em] font-extrabold text-slate-600 ml-0.5')} | Eco BM: {renderWeight(metrics.totalEcoBM, 'text-[0.7em] font-extrabold text-slate-600 ml-0.5')}
              </div>
            </div>

            {/* Big Chart Row */}
            <div className="lg:col-span-3 bg-white border-2 border-slate-200 rounded-3xl p-6 lg:p-8 shadow-md min-h-[420px] flex flex-col justify-between">
              <h3 className="text-base md:text-lg font-black text-slate-800 uppercase mb-4">
                Evolução Diária da Produção x Meta
              </h3>
              <div className="w-full h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.dailyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                    <XAxis dataKey="day" stroke="#475569" tick={{ fill: '#334155', fontSize: 13, fontWeight: 700 }} />
                    <YAxis stroke="#475569" tick={{ fill: '#334155', fontSize: 13, fontWeight: 700 }} tickFormatter={(val: number) => formatWeightStr(val)} />
                    <Tooltip formatter={(val: number) => [formatWeightStr(val), 'Volume']} />
                    <Bar dataKey="cast1" name="Cast 1" fill="#2563eb" stackId="a" />
                    <Bar dataKey="cast2" name="Cast 2" fill="#4f46e5" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Best Operator Card */}
            <div className="bg-gradient-to-br from-amber-50 to-white border-2 border-amber-300 rounded-3xl p-6 lg:p-8 shadow-md flex flex-col justify-between relative overflow-hidden">
              <ContinuousConfettiOverlay />
              <div className="relative z-10 flex flex-col justify-between h-full">
                <div>
                  <span className="text-sm font-black text-amber-800 uppercase tracking-widest flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-amber-500" /> Destaque do Mês
                  </span>
                  <div className="my-6">
                    <h4 className="text-3xl font-black text-slate-900">{metrics.bestOperator.name}</h4>
                    <p className="text-sm font-black text-amber-700 uppercase mt-2">
                      Equipamento: {metrics.bestOperator.machine}
                    </p>
                  </div>
                </div>
                <div className="text-4xl font-mono font-black text-emerald-600">
                  {renderWeight(metrics.bestOperator.totalNet)}
                </div>
              </div>
            </div>
          </div>
        )}
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

      {/* Footer Status Bar */}
      <footer className="bg-white border-t-2 border-slate-200 px-6 py-3 flex items-center justify-between text-xs md:text-sm font-extrabold text-slate-600 shrink-0 shadow-sm">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2 text-slate-800">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Sistema de Monitoramento Industrial TV
          </span>
          <span className="hidden md:inline text-slate-400">•</span>
          <span className="hidden md:inline">
            Tempo de Rotação: <strong className="text-slate-900 font-mono">{slideDuration} segundos por slide</strong>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span>
            {isStandaloneTv
              ? 'Transmissão Contínua Smart TV • Painel Operacional em Tempo Real'
              : isScreensaver
              ? 'Modo Protetor de Tela • Mexa o mouse ou pressione ESC para sair'
              : 'Pressione ESC ou clique em X para sair'}
          </span>
        </div>
      </footer>

      {/* Floating Screensaver Alert Pill */}
      {!isStandaloneTv && isScreensaver && (
        <div className="fixed bottom-14 md:bottom-16 left-1/2 -translate-x-1/2 z-[300] bg-slate-950/90 text-white backdrop-blur-md px-5 sm:px-7 py-3 rounded-full shadow-2xl border border-white/20 flex items-center gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-6 duration-300 pointer-events-auto">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 text-left">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400">Protetor de Tela Ativo</span>
            <span className="text-[11px] sm:text-xs font-medium text-slate-300">Mexa o mouse ou pressione qualquer tecla para voltar</span>
          </div>
          <button
            onClick={onExitScreensaver || onClose}
            className="ml-1 sm:ml-2 px-3 sm:px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          >
            Retomar
          </button>
        </div>
      )}
    </div>
  );
};
