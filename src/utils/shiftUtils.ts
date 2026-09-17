/**
 * Utilitário central de regras de horários e turnos do sistema
 * 
 * Regras Oficiais:
 * - Turno Comercial: Padronizado das 07:30 às 17:18 (duração de 9h48m = 588 minutos).
 * - Turno Comercial Flexível: Colaborador entra em horário customizado e cumpre 9h48m. O excedente é hora extra.
 * - Turno Diurno (Diurno 1, Diurno 2, Diurno): Das 06:00 às 18:00 (duração de 12h = 720 minutos).
 * - Turno Noturno (Noturno 1, Noturno 2, Noturno): Das 18:00 às 06:00 (duração de 12h = 720 minutos).
 * - Liderança: Obrigatoriamente no Turno Comercial.
 */

export const COMMERCIAL_DURATION_MINUTES = 588; // 9h e 48min (07:30 às 17:18)
export const TWELVE_HOURS_MINUTES = 720; // 12h (06:00 às 18:00 ou 18:00 às 06:00)

export interface ShiftRuleDefinition {
  type: 'Comercial' | 'Diurno' | 'Noturno';
  name: string;
  defaultStartTime: string;
  defaultEndTime: string;
  durationMinutes: number;
  description: string;
}

export const SHIFT_RULES: Record<'Comercial' | 'Diurno' | 'Noturno', ShiftRuleDefinition> = {
  Comercial: {
    type: 'Comercial',
    name: 'Turno Comercial',
    defaultStartTime: '07:30',
    defaultEndTime: '17:18',
    durationMinutes: COMMERCIAL_DURATION_MINUTES,
    description: '07:30 às 17:18 (Jornada de 9h48min • Segunda a Sexta)'
  },
  Diurno: {
    type: 'Diurno',
    name: 'Turno Diurno',
    defaultStartTime: '06:00',
    defaultEndTime: '18:00',
    durationMinutes: TWELVE_HOURS_MINUTES,
    description: '06:00 às 18:00 (Jornada de 12h)'
  },
  Noturno: {
    type: 'Noturno',
    name: 'Turno Noturno',
    defaultStartTime: '18:00',
    defaultEndTime: '06:00',
    durationMinutes: TWELVE_HOURS_MINUTES,
    description: '18:00 às 06:00 (Jornada de 12h)'
  }
};

/**
 * Converte string de horário "HH:MM" para minutos totais do dia (0 a 1439).
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return (h * 60 + m) % 1440;
}

/**
 * Converte minutos do dia para string no formato "HH:MM".
 */
export function minutesToTimeString(minutes: number): string {
  const norm = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Identifica a categoria canônica de turno (Comercial, Diurno ou Noturno).
 * Liderança é sempre Comercial.
 */
export function getCanonicalShiftCategory(shiftName?: string, sector?: string): 'Comercial' | 'Diurno' | 'Noturno' {
  const normSector = (sector || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (normSector.includes('lideran') || normSector.includes('gestao')) {
    return 'Comercial';
  }

  const normShift = (shiftName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (normShift.includes('comercial') || normShift.includes('integral') || normShift.includes('adm') || normShift.includes('flex')) {
    return 'Comercial';
  }
  if (normShift.includes('noturno') || normShift.includes('noite')) {
    return 'Noturno';
  }
  return 'Diurno';
}

/**
 * Calcula o horário de término para o Turno Comercial Flexível
 * a partir do horário de entrada + 9 horas e 48 minutos (588 min).
 */
export function calculateCommercialFlexibleEnd(startTimeStr: string): string {
  const startMin = timeStringToMinutes(startTimeStr);
  const endMin = startMin + COMMERCIAL_DURATION_MINUTES;
  return minutesToTimeString(endMin);
}

/**
 * Calcula a diferença em minutos entre dois horários considerando virada de noite se necessário.
 */
export function getDurationMinutesBetween(startTimeStr: string, endTimeStr: string): number {
  const startMin = timeStringToMinutes(startTimeStr);
  let endMin = timeStringToMinutes(endTimeStr);

  if (endMin <= startMin) {
    endMin += 1440; // Passou da meia-noite
  }

  return endMin - startMin;
}

/**
 * Parâmetros de cálculo de horas extras
 */
export interface OvertimeCalcParams {
  mode: 'integral' | 'pos_turno';
  shiftCategory: 'Comercial' | 'Diurno' | 'Noturno';
  isCommercialFlexible?: boolean;
  actualStartTime: string;  // Horário em que começou (ex: 07:30 ou flexível 08:00)
  actualEndTime: string;    // Horário em que saiu (ex: 19:18)
  customNormalStartTime?: string; // Para flexível
}

export interface OvertimeCalcResult {
  estimatedHours: number;      // Número em formato decimal (ex: 2.0, 2.5)
  normalStartTime: string;     // Ex: "07:30"
  normalEndTime: string;       // Ex: "17:18" ou calculado para flexível
  overtimeMinutes: number;     // Minutos de hora extra
  formattedOvertime: string;   // Ex: "2h 00min"
  explanation: string;         // Descrição detalhada do cálculo
}

/**
 * Calcula com precisão as horas extras estimadas
 */
export function calculateOvertimeHoursDetailed(params: OvertimeCalcParams): OvertimeCalcResult {
  const {
    mode,
    shiftCategory,
    isCommercialFlexible,
    actualStartTime,
    actualEndTime,
    customNormalStartTime
  } = params;

  // 1. Determinar o início e fim da jornada normal do turno
  let normalStart = '06:00';
  let normalEnd = '18:00';

  if (shiftCategory === 'Comercial') {
    if (isCommercialFlexible) {
      normalStart = customNormalStartTime || actualStartTime || '07:30';
      normalEnd = calculateCommercialFlexibleEnd(normalStart);
    } else {
      normalStart = '07:30';
      normalEnd = '17:18';
    }
  } else if (shiftCategory === 'Noturno') {
    normalStart = '18:00';
    normalEnd = '06:00';
  } else {
    // Diurno
    normalStart = '06:00';
    normalEnd = '18:00';
  }

  // 2. Cálculo conforme o Modo selecionado
  if (mode === 'integral') {
    // Turno Extra Integral (100% das horas trabalhadas no dia são extras)
    const totalMinutes = getDurationMinutesBetween(actualStartTime, actualEndTime);
    const hours = Number((totalMinutes / 60).toFixed(2));
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    return {
      estimatedHours: hours,
      normalStartTime: normalStart,
      normalEndTime: normalEnd,
      overtimeMinutes: totalMinutes,
      formattedOvertime: `${h}h ${String(m).padStart(2, '0')}min`,
      explanation: `Turno Extra Integral: 100% do período (${actualStartTime} às ${actualEndTime}) contabilizado como hora extra.`
    };
  }

  // Modo 'pos_turno' (Extensão de Jornada / Passando do Horário Normal)
  // O colaborador cumpre a jornada normal e o que passar do encerramento conta como extra.
  // Também computa se o colaborador entrou antes do início normal.
  let extraMinutesAfter = 0;
  let extraMinutesBefore = 0;

  // Verifica excedente após o encerramento da jornada normal
  const normalEndMin = timeStringToMinutes(normalEnd);
  let actualEndMin = timeStringToMinutes(actualEndTime);

  // Tratamento da linha temporal para o turno Noturno (18:00 às 06:00)
  if (shiftCategory === 'Noturno') {
    // Turno noturno termina às 06:00 da manhã.
    // Se a saída for por exemplo às 08:00, excedeu das 06:00 às 08:00 (120 min).
    // Se a saída for entre 06:01 e 17:59, excedeu:
    if (actualEndMin > normalEndMin && actualEndMin <= 12 * 60) {
      extraMinutesAfter = actualEndMin - normalEndMin;
    } else if (actualEndMin <= normalEndMin) {
      extraMinutesAfter = 0;
    } else {
      // Caso fora da curva
      extraMinutesAfter = Math.max(0, actualEndMin - normalEndMin);
    }
  } else {
    // Diurno ou Comercial (encerra no mesmo dia civil)
    // Se virar a meia noite (ex: saiu 01:00 do outro dia)
    if (actualEndMin < timeStringToMinutes(actualStartTime)) {
      actualEndMin += 1440;
    }

    if (actualEndMin > normalEndMin) {
      extraMinutesAfter = actualEndMin - normalEndMin;
    }
  }

  // Verifica se o colaborador iniciou antes do horário normal (antecipação)
  const normalStartMin = timeStringToMinutes(normalStart);
  const actualStartMin = timeStringToMinutes(actualStartTime);
  if (actualStartMin < normalStartMin && !isCommercialFlexible) {
    extraMinutesBefore = normalStartMin - actualStartMin;
  }

  const totalOvertimeMinutes = Math.max(0, extraMinutesAfter + extraMinutesBefore);
  const hours = Number((totalOvertimeMinutes / 60).toFixed(2));
  const h = Math.floor(totalOvertimeMinutes / 60);
  const m = totalOvertimeMinutes % 60;

  let explanation = '';
  if (shiftCategory === 'Comercial') {
    if (isCommercialFlexible) {
      explanation = `Comercial Flexível: Entrada às ${normalStart}, jornada padrão de 9h48m encerrou às ${normalEnd}. Saída efetiva às ${actualEndTime} = ${h}h ${String(m).padStart(2, '0')}min de hora extra.`;
    } else {
      explanation = `Comercial Padrão: Horário normal das ${normalStart} às ${normalEnd}. Saída efetiva às ${actualEndTime} = ${h}h ${String(m).padStart(2, '0')}min de hora extra após o turno.`;
    }
  } else if (shiftCategory === 'Noturno') {
    explanation = `Turno Noturno: Horário normal das ${normalStart} às ${normalEnd}. Saída efetiva às ${actualEndTime} = ${h}h ${String(m).padStart(2, '0')}min de hora extra após às ${normalEnd}.`;
  } else {
    explanation = `Turno Diurno: Horário normal das ${normalStart} às ${normalEnd}. Saída efetiva às ${actualEndTime} = ${h}h ${String(m).padStart(2, '0')}min de hora extra após às ${normalEnd}.`;
  }

  if (extraMinutesBefore > 0) {
    explanation += ` (Inclui ${Math.floor(extraMinutesBefore / 60)}h ${extraMinutesBefore % 60}min de entrada antecipada).`;
  }

  return {
    estimatedHours: hours,
    normalStartTime: normalStart,
    normalEndTime: normalEnd,
    overtimeMinutes: totalOvertimeMinutes,
    formattedOvertime: `${h}h ${String(m).padStart(2, '0')}min`,
    explanation
  };
}
