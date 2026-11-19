import { ProductionEntry, RibbonCuttingEntry, Shift } from '../types';

export type PlantMachineId = 'Cast 1' | 'Cast 2' | 'Erema' | 'Ghezzi' | 'Lintech' | 'Wultec';
export type PlantSectorId = 'Extrusão' | 'Reciclagem' | 'Corte de Fita';

interface MachineSpec {
  id: PlantMachineId;
  sector: PlantSectorId;
  defaultShiftMinutes: number;
  hoursPerDay: number;
  nominalCapPerHour: number;
  unit: 'kg' | 'm²';
}

export const PLANT_MACHINE_SPECS: MachineSpec[] = [
  {
    id: 'Cast 1',
    sector: 'Extrusão',
    defaultShiftMinutes: 720,
    hoursPerDay: 24,
    nominalCapPerHour: 1200,
    unit: 'kg',
  },
  {
    id: 'Cast 2',
    sector: 'Extrusão',
    defaultShiftMinutes: 720,
    hoursPerDay: 24,
    nominalCapPerHour: 1400,
    unit: 'kg',
  },
  {
    id: 'Erema',
    sector: 'Reciclagem',
    defaultShiftMinutes: 720,
    hoursPerDay: 24,
    nominalCapPerHour: 350,
    unit: 'kg',
  },
  {
    id: 'Ghezzi',
    sector: 'Corte de Fita',
    defaultShiftMinutes: 528,
    hoursPerDay: 8.8,
    nominalCapPerHour: 6818,
    unit: 'm²',
  },
  {
    id: 'Lintech',
    sector: 'Corte de Fita',
    defaultShiftMinutes: 528,
    hoursPerDay: 8.8,
    nominalCapPerHour: 6818,
    unit: 'm²',
  },
  {
    id: 'Wultec',
    sector: 'Corte de Fita',
    defaultShiftMinutes: 528,
    hoursPerDay: 8.8,
    nominalCapPerHour: 6818,
    unit: 'm²',
  },
];

export interface PlantMachineAvailabilityMetric {
  machine: PlantMachineId;
  sector: PlantSectorId;
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
}

export interface PlantAvailabilitySummary {
  hasData: boolean;
  activeMachinesCount: number;
  totalPlannedMin: number;
  totalOperatingMin: number;
  totalManutMin: number;
  totalProcMin: number;
  totalOutrosMin: number;
  totalStoppedMin: number;
  totalMaintEvents: number;
  availabilityPct: number;
  maintAvailabilityPct: number;
  weightedPerf: number;
  weightedQual: number;
  weightedOee: number;
  mttrMinutes: number;
  mtbfHours: number;
  maintSharePct: number;
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
          const desc =
            explicacao && motivo && explicacao.toLowerCase() !== motivo.toLowerCase()
              ? `${motivo} — ${explicacao}`
              : motivo || explicacao || '';
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

export const formatAvailabilityMinutesShort = (mins: number): string => {
  const rounded = Math.max(0, Math.round(mins));
  if (rounded >= 60) {
    const h = Math.floor(rounded / 60);
    const m = rounded % 60;
    return m > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${h}h`;
  }
  return `${rounded} min`;
};

export const formatAvailabilityHoursDecimal = (mins: number): string => {
  return (Math.max(0, mins) / 60).toFixed(1).replace('.', ',') + 'h';
};

export function computePlantAvailability(
  productionData: ProductionEntry[],
  ribbonEntries: RibbonCuttingEntry[],
  dashboardMonth: string,
  availableShifts: Shift[] = []
): {
  machineMetrics: PlantMachineAvailabilityMetric[];
  plantSummary: PlantAvailabilitySummary;
} {
  const getShiftPlannedMinutes = (shiftName: string | undefined, sector: PlantSectorId): number => {
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

  const filteredProd = (productionData || []).filter((e) => {
    if (!e || !e.date) return false;
    const year = parseInt(e.date.split('-')[0], 10);
    if (isNaN(year) || year < 2026) return false;
    const isExcludedMonth = e.date.substring(5, 7) === '05' || e.date.substring(5, 7) === '06';
    const isExistingPastEntry = !e.updatedAt || e.updatedAt < '2026-06-12T17:44:00Z';
    if (isExcludedMonth && (e.machine || '').toLowerCase().includes('cast 2') && isExistingPastEntry) {
      return false;
    }
    if (!e.date.startsWith(dashboardMonth)) return false;
    return normalizeProductionMachine(e.machine) !== null;
  });

  const filteredRibbon = (ribbonEntries || []).filter((e) => {
    if (!e || !e.date) return false;
    const year = parseInt(e.date.split('-')[0], 10);
    if (isNaN(year) || year < 2026) return false;
    if (!e.date.startsWith(dashboardMonth)) return false;
    return normalizeRibbonMachine(e.machine) !== null;
  });

  // Count maintenance events per machine (same logic as MaintenanceDowntimeAnalyticsView)
  const maintEventCountByMachine: Record<PlantMachineId, number> = {
    'Cast 1': 0,
    'Cast 2': 0,
    Erema: 0,
    Ghezzi: 0,
    Lintech: 0,
    Wultec: 0,
  };

  filteredProd.forEach((e) => {
    if (e.isNoWorkDay) return;
    const mId = normalizeProductionMachine(e.machine);
    if (!mId) return;
    const mList = parseStopsJSON(e.manutencaoMotivo);
    if (mList.length > 0) {
      const fallbackPerItem = Number(e.manutencaoMin || 0) / mList.length;
      mList.forEach((item) => {
        const calc = item.durationMinutes && item.durationMinutes > 0 ? item.durationMinutes : getDiffMin(item.de, item.ate);
        const mins = Math.round(calc > 0 ? calc : fallbackPerItem);
        if (mins > 0) maintEventCountByMachine[mId] += 1;
      });
    } else if (Number(e.manutencaoMin || 0) > 0) {
      maintEventCountByMachine[mId] += 1;
    }
  });

  filteredRibbon.forEach((e) => {
    if (e.isNoWorkDay) return;
    const mId = normalizeRibbonMachine(e.machine);
    if (!mId) return;
    const mMin = Number(e.manutencaoMin || 0);
    const pMin = Number(e.processoMin || 0);
    const oMin = Number(e.outrosMin || 0);
    const catSum = mMin + pMin + oMin;

    const mList = parseStopsJSON(e.manutencaoMotivo);
    if (mList.length > 0) {
      const fallback = mMin / mList.length;
      mList.forEach((item) => {
        const calc = item.durationMinutes && item.durationMinutes > 0 ? item.durationMinutes : getDiffMin(item.de, item.ate);
        const mins = Math.round(calc > 0 ? calc : fallback);
        if (mins > 0) maintEventCountByMachine[mId] += 1;
      });
    } else if (mMin > 0) {
      maintEventCountByMachine[mId] += 1;
    }

    const totalRibbonStopped = Number(e.stoppedMinutes || 0);
    const uncategorized = Math.max(0, totalRibbonStopped - catSum);
    if (uncategorized > 0) {
      const reasonText = cleanJustification(e.stoppedReason) || 'Parada Registrada (Fita)';
      if (inferStopCategoryFromReason(reasonText) === 'Manutenção') {
        maintEventCountByMachine[mId] += 1;
      }
    }
  });

  const machineMetrics: PlantMachineAvailabilityMetric[] = PLANT_MACHINE_SPECS.map((spec) => {
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
        if (e.isNoWorkDay) {
          const customNoWork = Number(e.stoppedMinutes || 0);
          noWorkMin += customNoWork > 0 ? Math.min(slotDur, customNoWork) : slotDur;
        } else {
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
        }
        actualProduction += Number(e.producedM2 || 0);
        losses += Number(e.rejectedM2 || 0);
      });
    }

    const maintEventsCount = maintEventCountByMachine[spec.id];

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
    };
  });

  const active = machineMetrics.filter((m) => m.hasData);
  const totalPlannedMin = active.reduce((acc, m) => acc + m.plannedMinutes, 0);
  const totalOperatingMin = active.reduce((acc, m) => acc + m.operatingMinutes, 0);
  const totalManutMin = active.reduce((acc, m) => acc + m.manutMin, 0);
  const totalProcMin = active.reduce((acc, m) => acc + m.procMin, 0);
  const totalOutrosMin = active.reduce((acc, m) => acc + m.outrosMin, 0);
  const totalStoppedMin = active.reduce((acc, m) => acc + m.totalStoppedMin, 0);
  const totalMaintEvents = active.reduce((acc, m) => acc + m.maintEventsCount, 0);

  const availabilityPct =
    totalPlannedMin > 0
      ? Number(Math.max(0, Math.min(100, (totalOperatingMin / totalPlannedMin) * 100)).toFixed(1))
      : 0;
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
    machineMetrics,
    plantSummary: {
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
    },
  };
}
