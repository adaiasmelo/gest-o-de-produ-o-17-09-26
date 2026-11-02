/**
 * Utilitários e regras para Gestão de Metas e Bônus de Produção (Extrusão)
 * 
 * Regras Estritas:
 * 1. Perdas de Matéria-Prima:
 *    - ECOBM (Eco B de Manutenção) é perda de manutenção e NÃO desconta da meta do operador.
 *    - Apenas perdas de produção (Eco A, Eco BP e Borra Total) contam para a tolerância de refugo.
 * 
 * 2. Paradas de Máquina:
 *    - Paradas de manutenção NÃO contam como perda de meta.
 *    - A ÚNICA parada que contabiliza como perda de meta são as paradas de LIMPEZA DA MÁQUINA / LIMPEZA DA MATRIZ.
 *    - O limite de 30 minutos NÃO é a soma de todas as paradas; é 30 MINUTOS POR PARADA INDIVIDUAL.
 *    - Se qualquer parada de limpeza de matriz/máquina exceder 30 minutos, contabiliza perda/penalidade.
 */

export interface ParsedStop {
  id: string;
  motivo: string;
  durationMinutes: number;
  de?: string;
  ate?: string;
  isAvulso?: boolean;
}

export const getDiffMinutesBetweenTimes = (startTimeStr: string, endTimeStr: string): number => {
  if (!startTimeStr || !endTimeStr) return 0;
  const [hStart, mStart] = startTimeStr.split(':').map(Number);
  const [hEnd, mEnd] = endTimeStr.split(':').map(Number);
  if (isNaN(hStart) || isNaN(mStart) || isNaN(hEnd) || isNaN(mEnd)) return 0;

  let startMin = hStart * 60 + mStart;
  let endMin = hEnd * 60 + mEnd;

  if (endMin < startMin) {
    endMin += 24 * 60;
  }
  return endMin - startMin;
};

/**
 * Identifica se a descrição da parada se refere à limpeza de máquina ou matriz.
 */
export const isCleaningStoppageReason = (text?: string): boolean => {
  if (!text) return false;
  const norm = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  return (
    norm.includes('limpeza') ||
    norm.includes('limpar') ||
    norm.includes('matriz') ||
    norm.includes('cabecote') ||
    norm.includes('rosca') ||
    norm.includes('rolo') ||
    norm.includes('tela') ||
    norm.includes('bico')
  );
};

/**
 * Converte o motivo armazenado (JSON ou texto puro) em lista de paradas com duração calculada.
 */
export const parseStopsFromField = (motivo: string | undefined, totalMin: number): ParsedStop[] => {
  if (!motivo) {
    if (totalMin > 0) {
      return [{
        id: `stop-legacy-${Date.now()}`,
        motivo: 'Parada sem especificação',
        durationMinutes: totalMin,
        isAvulso: true
      }];
    }
    return [];
  }

  try {
    if (motivo.startsWith('[') && motivo.endsWith(']')) {
      const parsed = JSON.parse(motivo);
      if (Array.isArray(parsed)) {
        return parsed.map((item, idx) => {
          const written = (
            item.explicacao ||
            item.justification ||
            item.observacao ||
            item.observacoes ||
            item.descricao ||
            item.motivo ||
            item.keyword ||
            ''
          ).trim();
          const manual = Number(item.durationMinutes || item.minutos || item.minutes || 0);
          let duration = manual;
          if (!item.isAvulso && item.de && item.ate) {
            const diff = getDiffMinutesBetweenTimes(item.de, item.ate);
            if (diff > 0) duration = diff;
          }
          if (duration <= 0 && totalMin > 0 && !item.de && !item.ate) {
            duration = totalMin;
          }
          return {
            id: item.id || `stop-${idx}`,
            motivo: written || 'Parada',
            durationMinutes: duration,
            de: item.de || '',
            ate: item.ate || '',
            isAvulso: Boolean(item.isAvulso || (!item.de && !item.ate))
          };
        });
      }
    }
  } catch (e) {
    // fallback
  }

  return [{
    id: `stop-text-${Date.now()}`,
    motivo: motivo,
    durationMinutes: totalMin,
    isAvulso: true
  }];
};

export interface CleaningStopsEvaluation {
  cleaningStops: ParsedStop[];
  cleaningStopsOver30: ParsedStop[];
  hasCleaningOver30: boolean;
  maxCleaningRecorded: number;
  totalCleaningMinutes: number;
  statusText: string;
  details: string;
}

/**
 * Avalia as paradas de Extrusão segundo a regra:
 * - Apenas paradas de limpeza de matriz/máquina contam para perda de meta de parada.
 * - Cada parada individual não pode exceder 30 minutos (não é a soma!).
 */
export const evaluateCleaningStoppages = (allStops: ParsedStop[]): CleaningStopsEvaluation => {
  const cleaningStops = allStops.filter(s => isCleaningStoppageReason(s.motivo));
  const cleaningStopsOver30 = cleaningStops.filter(s => s.durationMinutes > 30);
  const hasCleaningOver30 = cleaningStopsOver30.length > 0;

  const maxCleaningRecorded = cleaningStops.length > 0
    ? Math.max(...cleaningStops.map(s => s.durationMinutes))
    : 0;

  const totalCleaningMinutes = cleaningStops.reduce((sum, s) => sum + s.durationMinutes, 0);

  let statusText = 'Sem paradas de limpeza';
  let details = 'Nenhuma parada de limpeza de matriz/máquina registrada.';

  if (cleaningStops.length > 0) {
    if (hasCleaningOver30) {
      const excesses = cleaningStopsOver30.map(s => `${s.durationMinutes} min (+${s.durationMinutes - 30}m)`).join(', ');
      statusText = `Excedeu 30 min por parada ⚠️ (${excesses})`;
      details = `${cleaningStopsOver30.length} parada(s) de limpeza de máquina/matriz excederam o limite individual de 30 minutos: ${excesses}.`;
    } else {
      statusText = `OK ≤ 30 min (${cleaningStops.length}x, máx ${maxCleaningRecorded}m) ✅`;
      details = `Todas as ${cleaningStops.length} parada(s) de limpeza de máquina/matriz foram realizadas dentro do limite de até 30 minutos por parada.`;
    }
  }

  return {
    cleaningStops,
    cleaningStopsOver30,
    hasCleaningOver30,
    maxCleaningRecorded,
    totalCleaningMinutes,
    statusText,
    details
  };
};

/**
 * Avalia as perdas de refugo da Extrusão:
 * - Apenas perdas de produção (Eco A, Eco BP, Borra Total) contam para a meta.
 * - ECOBM (Manutenção) é expressamente isento da meta do operador.
 */
export const evaluateExtrusionLosses = (entry: {
  ecoA?: number;
  ecoBP?: number;
  ecoBM?: number;
  borraTotal?: number;
}) => {
  const ecoA = Number(entry.ecoA) || 0;
  const ecoBP = Number(entry.ecoBP) || 0;
  const borraTotal = Number(entry.borraTotal) || 0;
  const ecoBM = Number(entry.ecoBM) || 0;

  const evaluatedLossesKg = ecoA + ecoBP + borraTotal;

  return {
    evaluatedLossesKg,
    ecoBMKg: ecoBM,
    ecoAKg: ecoA,
    ecoBPKg: ecoBP,
    borraKg: borraTotal,
    hasEcoBM: ecoBM > 0
  };
};

/**
 * Converte peso de refugo/lixo de fita (kg) em m² com base no tipo de jumbo/micras.
 */
export const calculateTapeLostM2 = (weightKg: number, jumboType?: string): number => {
  if (!weightKg || weightKg <= 0) return 0;
  const clean = (jumboType || '').toUpperCase().replace(/\s+/g, '').trim();
  let micras = 40; // padrão médio de fita
  if (clean.includes('AR9')) micras = 45;
  else if (clean.includes('AA38') || clean.includes('AA40')) micras = 38;
  else if (clean.includes('AS50')) micras = 50;
  else if (clean.includes('HOTMALT') || clean.includes('HOTMAILT')) micras = 38;

  const gr = micras * 0.92;
  return (weightKg * 1000) / gr;
};

export interface TapeProductivityEvaluation {
  targetDailyM2: number;
  producedM2: number;
  lossTipo1M2: number;
  lossTipo2M2: number;
  lossWasteKg: number;
  lossWasteM2: number;
  totalLossM2: number;
  netProducedM2: number;
  isTargetMet: boolean;
  attainmentPercent: number;
  lossPercentOfTarget: number;
  statusBadge: string;
  summaryText: string;
}

/**
 * Avalia o cumprimento da meta diária de fita (em m²) e o abatimento de perdas (Tipo 1, Tipo 2 e Lixo).
 */
export const evaluateTapeProductivityAndLosses = (entry: {
  targetDailyM2?: number;
  producedM2?: number;
  m2Tipo1?: number;
  m2Tipo2?: number;
  wasteWeight?: number;
  jumboType?: string;
  machine?: string;
}): TapeProductivityEvaluation => {
  let target = Number(entry.targetDailyM2) || 0;
  if (!target) {
    const mach = (entry.machine || '').toLowerCase();
    if (mach.includes('lintech')) target = 50000;
    else if (mach.includes('wultec')) target = 40000;
    else target = 60000; // Ghezzi ou padrão
  }

  const produced = Number(entry.producedM2) || 0;
  const lossTipo1 = Number(entry.m2Tipo1) || 0;
  const lossTipo2 = Number(entry.m2Tipo2) || 0;
  const lossWasteKg = Number(entry.wasteWeight) || 0;
  const lossWasteM2 = calculateTapeLostM2(lossWasteKg, entry.jumboType);
  const totalLoss = lossTipo1 + lossTipo2 + lossWasteM2;
  const netProduced = Math.max(0, produced - totalLoss);

  const isTargetMet = produced >= target;
  const attainmentPercent = target > 0 ? (produced / target) * 100 : 0;
  const lossPercentOfTarget = target > 0 ? (totalLoss / target) * 100 : 0;

  let statusBadge = isTargetMet ? `BATEU ✅ (${attainmentPercent.toFixed(0)}%)` : `NÃO BATEU ❌ (${attainmentPercent.toFixed(0)}%)`;
  if (totalLoss > (target * 0.05)) { // se perdas > 5% da meta
    statusBadge += ' [PERDA ELEVADA ⚠️]';
  }

  const summaryText = `Meta: ${target.toLocaleString('pt-BR')} m² | Prod: ${produced.toLocaleString('pt-BR')} m² | Perdas: ${totalLoss.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m² (T1: ${lossTipo1.toLocaleString('pt-BR')} m², T2: ${lossTipo2.toLocaleString('pt-BR')} m², Lixo: ${lossWasteM2.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m² / ${lossWasteKg.toFixed(1)}kg)`;

  return {
    targetDailyM2: target,
    producedM2: produced,
    lossTipo1M2: lossTipo1,
    lossTipo2M2: lossTipo2,
    lossWasteKg,
    lossWasteM2,
    totalLossM2: totalLoss,
    netProducedM2: netProduced,
    isTargetMet,
    attainmentPercent,
    lossPercentOfTarget,
    statusBadge,
    summaryText
  };
};
