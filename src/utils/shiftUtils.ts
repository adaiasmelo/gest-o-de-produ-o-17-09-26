/**
 * Utilitário central de regras de horários e turnos do sistema
 * 
 * Regras Oficiais:
 * - Turno Comercial: Padronizado das 07:30 às 17:18 (duração de 9h48m = 588 minutos).
 * - Turno Comercial Flexível: Sem horário fixo de entrada. Cumpre 10 horas de permanência bruta (8h de trabalho + intervalo de almoço já contabilizado = 600 minutos). O excedente após as 10h é computado como hora extra.
 * - Turno Diurno (Diurno 1, Diurno 2, Diurno): Das 06:00 às 18:00 (duração de 12h = 720 minutos).
 * - Turno Noturno (Noturno 1, Noturno 2, Noturno): Das 18:00 às 06:00 (duração de 12h = 720 minutos).
 * - Liderança: Obrigatoriamente no Turno Comercial.
 */

export const COMMERCIAL_DURATION_MINUTES = 588; // 9h e 48min (07:30 às 17:18)
export const COMMERCIAL_FLEXIBLE_DURATION_MINUTES = 600; // 10h de permanência para Comercial Flexível (8h de trabalho + intervalo de almoço incluso)
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
 * a partir do horário de entrada + 10 horas de permanência (600 min, almoço incluso).
 */
export function calculateCommercialFlexibleEnd(startTimeStr: string): string {
  const startMin = timeStringToMinutes(startTimeStr);
  const endMin = startMin + COMMERCIAL_FLEXIBLE_DURATION_MINUTES;
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
  estimatedHours: number;      // Número em formato decimal (ex: 2.0, 0.75, 0.5)
  normalStartTime: string;     // Ex: "07:30" ou flexível
  normalEndTime: string;       // Ex: "17:18" ou calculado para flexível (8h de serviço)
  overtimeMinutes: number;     // Minutos totais de hora extra
  formattedOvertime: string;   // Ex: "45min" ou "1h 30min"
  displayValue: string;        // "0,45", "0,30", "1,00", "1,30", "2,00"
  unit: 'minutos' | 'horas';   // "minutos" se overtimeMinutes < 60 e > 0, senão "horas"
  explanation: string;         // Descrição detalhada do cálculo
}

/**
 * Formata minutos de hora extra para exibição visual
 * Conforme regra: se não fechou 60 minutos, exibe '0,XX' com unidade 'minutos' (ex: 0,45 minutos, 0,30 minutos).
 * Se fechou 60 minutos ou mais, exibe com unidade 'horas' (ex: 1,00 horas, 1,30 horas).
 */
export function formatOvertimeDisplay(totalOvertimeMinutes: number): {
  displayValue: string;
  unit: 'minutos' | 'horas';
  formattedOvertime: string;
} {
  if (totalOvertimeMinutes <= 0) {
    return {
      displayValue: '0,00',
      unit: 'horas',
      formattedOvertime: '0h 00min'
    };
  }

  if (totalOvertimeMinutes < 60) {
    return {
      displayValue: `0,${String(totalOvertimeMinutes).padStart(2, '0')}`,
      unit: 'minutos',
      formattedOvertime: `${totalOvertimeMinutes}min`
    };
  }

  const h = Math.floor(totalOvertimeMinutes / 60);
  const m = totalOvertimeMinutes % 60;
  return {
    displayValue: `${h},${String(m).padStart(2, '0')}`,
    unit: 'horas',
    formattedOvertime: `${h}h ${String(m).padStart(2, '0')}min`
  };
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
      // Comercial Flexível: Sem horário fixo. Cumpre 10 horas de permanência bruta (600 min, almoço incluso) a partir da entrada
      normalStart = customNormalStartTime || actualStartTime || '06:00';
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
    const displayInfo = formatOvertimeDisplay(totalMinutes);

    return {
      estimatedHours: hours,
      normalStartTime: normalStart,
      normalEndTime: normalEnd,
      overtimeMinutes: totalMinutes,
      formattedOvertime: displayInfo.formattedOvertime,
      displayValue: displayInfo.displayValue,
      unit: displayInfo.unit,
      explanation: `Turno Extra Integral: 100% do período (${actualStartTime} às ${actualEndTime}) contabilizado como hora extra.`
    };
  }

  // Modo 'pos_turno' (Extensão de Jornada / Passando do Horário Normal)
  let totalOvertimeMinutes = 0;
  let extraMinutesBefore = 0;

  if (shiftCategory === 'Comercial' && isCommercialFlexible) {
    // REGRA DO COMERCIAL FLEXÍVEL:
    // O colaborador não tem horário fixo de entrada, mas cumpre 10 horas de permanência bruta
    // (8 horas de trabalho efetivo + intervalo de almoço já contabilizado = 600 minutos).
    // O usuário coloca o horário de entrada e o horário de saída.
    // O tempo que ultrapassar essas 10 horas é computado automaticamente como hora extra.
    const startMin = timeStringToMinutes(actualStartTime);
    let endMin = timeStringToMinutes(actualEndTime);
    if (endMin < startMin) {
      endMin += 1440; // Virada de meia-noite
    }
    const totalWorkedMinutes = endMin - startMin;
    totalOvertimeMinutes = Math.max(0, totalWorkedMinutes - COMMERCIAL_FLEXIBLE_DURATION_MINUTES);
  } else {
    let extraMinutesAfter = 0;

    // Verifica excedente após o encerramento da jornada normal
    const normalEndMin = timeStringToMinutes(normalEnd);
    let actualEndMin = timeStringToMinutes(actualEndTime);

    // Tratamento da linha temporal para o turno Noturno (18:00 às 06:00)
    if (shiftCategory === 'Noturno') {
      if (actualEndMin > normalEndMin && actualEndMin <= 12 * 60) {
        extraMinutesAfter = actualEndMin - normalEndMin;
      } else if (actualEndMin <= normalEndMin) {
        extraMinutesAfter = 0;
      } else {
        extraMinutesAfter = Math.max(0, actualEndMin - normalEndMin);
      }
    } else {
      // Diurno ou Comercial Padrão (encerra no mesmo dia civil)
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
    if (actualStartMin < normalStartMin) {
      extraMinutesBefore = normalStartMin - actualStartMin;
    }

    totalOvertimeMinutes = Math.max(0, extraMinutesAfter + extraMinutesBefore);
  }

  const hours = Number((totalOvertimeMinutes / 60).toFixed(2));
  const displayInfo = formatOvertimeDisplay(totalOvertimeMinutes);
  const h = Math.floor(totalOvertimeMinutes / 60);
  const m = totalOvertimeMinutes % 60;

  let explanation = '';
  if (shiftCategory === 'Comercial') {
    if (isCommercialFlexible) {
      if (totalOvertimeMinutes === 0) {
        explanation = `Comercial Flexível: Entrada às ${normalStart}. Jornada padrão de 10h (com almoço) cumprida às ${normalEnd}. Sem horas extras (saída efetiva às ${actualEndTime}).`;
      } else if (totalOvertimeMinutes < 60) {
        explanation = `Comercial Flexível: Entrada às ${normalStart}. Jornada padrão de 10h (com almoço) concluída às ${normalEnd}. Saída efetiva às ${actualEndTime} = ${totalOvertimeMinutes} minutos de hora extra.`;
      } else {
        explanation = `Comercial Flexível: Entrada às ${normalStart}. Jornada padrão de 10h (com almoço) concluída às ${normalEnd}. Saída efetiva às ${actualEndTime} = ${h}h ${String(m).padStart(2, '0')}min de hora extra.`;
      }
    } else {
      explanation = `Comercial Padrão: Horário normal das ${normalStart} às ${normalEnd}. Saída efetiva às ${actualEndTime} = ${totalOvertimeMinutes < 60 ? `${totalOvertimeMinutes}min` : `${h}h ${String(m).padStart(2, '0')}min`} de hora extra após o turno.`;
    }
  } else if (shiftCategory === 'Noturno') {
    explanation = `Turno Noturno: Horário normal das ${normalStart} às ${normalEnd}. Saída efetiva às ${actualEndTime} = ${totalOvertimeMinutes < 60 ? `${totalOvertimeMinutes}min` : `${h}h ${String(m).padStart(2, '0')}min`} de hora extra após às ${normalEnd}.`;
  } else {
    explanation = `Turno Diurno: Horário normal das ${normalStart} às ${normalEnd}. Saída efetiva às ${actualEndTime} = ${totalOvertimeMinutes < 60 ? `${totalOvertimeMinutes}min` : `${h}h ${String(m).padStart(2, '0')}min`} de hora extra após às ${normalEnd}.`;
  }

  if (extraMinutesBefore > 0 && !isCommercialFlexible) {
    explanation += ` (Inclui ${Math.floor(extraMinutesBefore / 60)}h ${extraMinutesBefore % 60}min de entrada antecipada).`;
  }

  return {
    estimatedHours: hours,
    normalStartTime: normalStart,
    normalEndTime: normalEnd,
    overtimeMinutes: totalOvertimeMinutes,
    formattedOvertime: displayInfo.formattedOvertime,
    displayValue: displayInfo.displayValue,
    unit: displayInfo.unit,
    explanation
  };
}

/**
 * =========================================================================
 * REGRAS DE FECHAMENTO DA FOLHA DE PONTO (DIA 24 DO MÊS)
 * =========================================================================
 * 
 * Regra da Empresa:
 * - A folha de ponto fecha impreterivelmente no dia 24 de cada mês.
 * - Na contagem de horas extras de um determinado colaborador, aparecem apenas as horas
 *   lançadas até o dia 24 do mês.
 * - Qualquer hora extra lançada após o dia 24 (a partir do dia 25) deve começar a contar
 *   zerada (começa do zero novamente), passando a contabilizar para a folha do mês seguinte.
 * 
 * Exemplo de Ciclos:
 * - Folha de Setembro/2026: 25/08/2026 até 24/09/2026 (fechamento em 24/09).
 * - Folha de Outubro/2026: 25/09/2026 até 24/10/2026 (horas zeradas recomeçando a contar a partir de 25/09).
 */

export const PAYROLL_CUTOFF_DAY = 24;

export const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export interface PayrollCycle {
  key: string;            // Ex: "2026-09" ou "2026-10"
  referenceYear: number;  // Ano de competência da folha (ex: 2026)
  referenceMonth: number; // Mês de competência 1-12 (ex: 9 para Setembro)
  monthName: string;      // "Setembro"
  startDate: string;      // "YYYY-MM-DD" (ex: "2026-08-25")
  endDate: string;        // "YYYY-MM-DD" (ex: "2026-09-24")
  label: string;          // "Folha Setembro / 2026 (25/08 a 24/09)"
  shortLabel: string;     // "Setembro/2026 (Fech. 24)"
  intervalLabel: string;  // "25/08 a 24/09"
  isCurrent: boolean;     // Se a data de hoje está dentro deste ciclo
  isClosed: boolean;      // Se o ciclo já foi fechado (hoje > endDate)
}

/**
 * Determina o ciclo de folha de ponto correspondente a uma data específica.
 */
export function getPayrollCycleFromDate(dateInput: string | Date): PayrollCycle {
  let y: number;
  let m: number; // 1 a 12
  let d: number; // 1 a 31

  if (typeof dateInput === 'string') {
    const cleanStr = dateInput.substring(0, 10);
    const parts = cleanStr.split('-').map(Number);
    y = parts[0] || new Date().getFullYear();
    m = parts[1] || (new Date().getMonth() + 1);
    d = parts[2] || new Date().getDate();
  } else {
    y = dateInput.getFullYear();
    m = dateInput.getMonth() + 1;
    d = dateInput.getDate();
  }

  let refYear = y;
  let refMonth = m;

  let startYear = y;
  let startMonth = m;
  let endYear = y;
  let endMonth = m;

  if (d <= PAYROLL_CUTOFF_DAY) {
    // Pertence à folha do mês de referência atual (m)
    refYear = y;
    refMonth = m;

    // Período: dia 25 do mês anterior até dia 24 do mês atual
    if (m === 1) {
      startYear = y - 1;
      startMonth = 12;
    } else {
      startYear = y;
      startMonth = m - 1;
    }
    endYear = y;
    endMonth = m;
  } else {
    // Data posterior ao dia 24: zera a contagem e conta para a folha do próximo mês!
    if (m === 12) {
      refYear = y + 1;
      refMonth = 1;
    } else {
      refYear = y;
      refMonth = m + 1;
    }

    startYear = y;
    startMonth = m;
    endYear = refYear;
    endMonth = refMonth;
  }

  const startDate = `${startYear}-${String(startMonth).padStart(2, '0')}-25`;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-${String(PAYROLL_CUTOFF_DAY).padStart(2, '0')}`;
  const key = `${refYear}-${String(refMonth).padStart(2, '0')}`;
  const monthName = MONTH_NAMES_PT[refMonth - 1] || `Mês ${refMonth}`;

  const todayStr = new Date().toISOString().split('T')[0];
  const isCurrent = todayStr >= startDate && todayStr <= endDate;
  const isClosed = todayStr > endDate;

  const startDayStr = '25';
  const startMonthStr = String(startMonth).padStart(2, '0');
  const endDayStr = String(PAYROLL_CUTOFF_DAY).padStart(2, '0');
  const endMonthStr = String(endMonth).padStart(2, '0');
  const intervalLabel = `${startDayStr}/${startMonthStr} a ${endDayStr}/${endMonthStr}`;

  return {
    key,
    referenceYear: refYear,
    referenceMonth: refMonth,
    monthName,
    startDate,
    endDate,
    label: `Folha ${monthName} / ${refYear} (${intervalLabel})`,
    shortLabel: `${monthName}/${refYear} (Fech. 24)`,
    intervalLabel,
    isCurrent,
    isClosed
  };
}

/**
 * Retorna o ciclo da folha de ponto vigente na data atual.
 */
export function getCurrentPayrollCycle(): PayrollCycle {
  return getPayrollCycleFromDate(new Date());
}

/**
 * Retorna a chave do ciclo atual da folha (ex: "2026-10" se hoje for 25/09 ou "2026-09" se hoje for 20/09)
 */
export function getCurrentPayrollCycleKey(): string {
  return getCurrentPayrollCycle().key;
}

/**
 * Constrói um ciclo de folha a partir de uma chave "YYYY-MM"
 */
export function getPayrollCycleByKey(key: string): PayrollCycle {
  if (!key || key === 'todos') {
    return getCurrentPayrollCycle();
  }
  const [yStr, mStr] = key.split('-');
  const y = parseInt(yStr, 10) || new Date().getFullYear();
  const m = parseInt(mStr, 10) || (new Date().getMonth() + 1);
  // O dia 15 sempre cai dentro do ciclo daquele refMonth
  return getPayrollCycleFromDate(new Date(y, m - 1, 15));
}

/**
 * Verifica se uma data específica (YYYY-MM-DD) pertence a um determinado ciclo de folha (YYYY-MM).
 */
export function isDateInPayrollCycle(dateStr: string, cycleKey: string): boolean {
  if (!dateStr) return false;
  if (!cycleKey || cycleKey === 'todos') return true;
  const cycle = getPayrollCycleByKey(cycleKey);
  const cleanDate = dateStr.substring(0, 10);
  return cleanDate >= cycle.startDate && cleanDate <= cycle.endDate;
}

/**
 * Formata amigavelmente a identificação do ciclo de folha para seletores e relatórios.
 */
export function formatPayrollMonthLabel(cycleKey: string): string {
  if (!cycleKey || cycleKey === 'todos') return 'Todos os Períodos (Histórico Geral)';
  const cycle = getPayrollCycleByKey(cycleKey);
  const statusTag = cycle.isCurrent ? ' • Ciclo Vigente' : cycle.isClosed ? ' • Fechada em 24/' + String(cycle.referenceMonth).padStart(2, '0') : '';
  return `${cycle.label}${statusTag}`;
}

