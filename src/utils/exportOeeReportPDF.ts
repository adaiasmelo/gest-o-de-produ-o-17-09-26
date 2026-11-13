import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface OeeReportParams {
  productionData: any[];
  ribbonEntries: any[];
  period: string;
  systemLogo?: string;
  systemName?: string;
  loggedUser?: {
    name?: string;
    role?: string;
  } | null;
  filters?: {
    machine?: string;
    operator?: string;
    shift?: string;
    startDate?: string;
    endDate?: string;
  };
}

export interface MachineOeeStats {
  name: string;
  sector: 'Extrusão' | 'Reciclagem' | 'Corte de Fita';
  plannedHours: number;
  stoppedMinutes: number;
  stoppedHours: number;
  operatingHours: number;
  availabilityPct: number;
  actualProduction: number;
  actualProductionUnit: string;
  nominalCapacityPerHour: number;
  theoreticalCapacity: number;
  performancePct: number;
  losses: number;
  lossesUnit: string;
  qualityPct: number;
  oeePct: number;
  statusClass: 'world-class' | 'good' | 'fair' | 'critical';
  statusLabel: string;
  mtbfHours: number;
  mttrMinutes: number;
  failureEvents: number;
  teepPct: number;
  manutMin: number;
  procMin: number;
  outrosMin: number;
}

/**
 * Generates the official Manu Packaging SVG Logo identical to the reference design
 */
function getOfficialManuPackagingLogoHtml(): string {
  return `
    <div style="display: flex; align-items: center; gap: 14px;">
      <svg width="48" height="48" viewBox="0 0 100 100" fill="none" style="flex-shrink: 0;">
        <rect x="10" y="14" width="16" height="72" rx="8" fill="#005d73"/>
        <rect x="38" y="14" width="16" height="72" rx="8" fill="#005d73"/>
        <rect x="66" y="14" width="16" height="72" rx="8" fill="#005d73"/>
      </svg>
      <div style="display: flex; flex-direction: column; justify-content: center;">
        <div style="display: flex; align-items: baseline; position: relative;">
          <span style="font-family: 'Inter', system-ui, -apple-system, sans-serif; font-size: 30px; font-weight: 800; color: #005d73; letter-spacing: -0.5px; line-height: 1;">manu</span>
          <svg width="20" height="20" viewBox="0 0 24 24" style="position: absolute; right: -16px; top: -8px;" fill="#689f38">
            <path d="M17 8C8 10 5 16 5 21C10 21 16 18 18 9C18.5 6.5 17 8 17 8Z"/>
          </svg>
        </div>
        <span style="font-family: 'Inter', system-ui, -apple-system, sans-serif; font-size: 25px; font-weight: 700; color: #005d73; letter-spacing: -0.5px; line-height: 1; margin-top: 2px;">packaging</span>
        <span style="font-family: 'Inter', system-ui, -apple-system, sans-serif; font-size: 10px; font-weight: 800; color: #005d73; letter-spacing: 2px; margin-top: 4px; text-transform: uppercase;">FITASA & AMAZÔNIA</span>
      </div>
    </div>
  `;
}

/**
 * Calculates comprehensive OEE metrics for all machines based on real operational data
 */
export function calculateOeeMetrics(params: OeeReportParams): {
  machines: MachineOeeStats[];
  plantAverage: MachineOeeStats;
  daysCount: number;
  periodLabel: string;
} {
  const { productionData = [], ribbonEntries = [], period, filters } = params;

  // Determine date range and days count
  const allDates = new Set<string>();
  productionData.forEach((e) => {
    if (e.date) allDates.add(e.date);
  });
  ribbonEntries.forEach((e) => {
    if (e.date) allDates.add(e.date);
  });

  const sortedDates = Array.from(allDates).sort();
  const daysCount = Math.max(1, sortedDates.length);
  let periodLabel = `MÊS: ${period || 'MÊS VIGENTE'}`;
  if (sortedDates.length >= 2) {
    const dStart = sortedDates[0].split('-').reverse().slice(0, 2).join('/');
    const dEnd = sortedDates[sortedDates.length - 1].split('-').reverse().join('/');
    periodLabel = `${dStart} A ${dEnd} • ${daysCount} DIAS REGISTRADOS`;
  } else if (sortedDates.length === 1) {
    periodLabel = `${sortedDates[0].split('-').reverse().join('/')} • 1 DIA REGISTRADO`;
  }

  // Machine specs & nominal capacity
  // Extrusoras: 24h/dia contínuas.
  // Cast 1: 1.200 kg/h
  // Cast 2: 1.400 kg/h
  // Erema: 350 kg/h
  // Fita: 8.8h/dia jornada comercial útil (60.000 m²/dia -> ~6.818 m²/h)
  const machinesConfig: Array<{
    name: string;
    sector: 'Extrusão' | 'Reciclagem' | 'Corte de Fita';
    hoursPerDay: number;
    nominalCapPerHour: number;
    unit: string;
  }> = [
    { name: 'Cast 1', sector: 'Extrusão', hoursPerDay: 24, nominalCapPerHour: 1200, unit: 'kg' },
    { name: 'Cast 2', sector: 'Extrusão', hoursPerDay: 24, nominalCapPerHour: 1400, unit: 'kg' },
    { name: 'Erema', sector: 'Reciclagem', hoursPerDay: 24, nominalCapPerHour: 350, unit: 'kg' },
    { name: 'Ghezzi', sector: 'Corte de Fita', hoursPerDay: 8.8, nominalCapPerHour: 6818, unit: 'm²' },
    { name: 'Lintech', sector: 'Corte de Fita', hoursPerDay: 8.8, nominalCapPerHour: 6818, unit: 'm²' },
    { name: 'Wultec', sector: 'Corte de Fita', hoursPerDay: 8.8, nominalCapPerHour: 6818, unit: 'm²' },
  ];

  const results: MachineOeeStats[] = machinesConfig.map((cfg) => {
    const plannedHours = Number((daysCount * cfg.hoursPerDay).toFixed(1));
    let stoppedMin = 0;
    let manutMin = 0;
    let procMin = 0;
    let outrosMin = 0;
    let actualProd = 0;
    let lossVal = 0;
    let failureCount = 0;

    if (cfg.sector === 'Extrusão' || cfg.sector === 'Reciclagem') {
      const matchEntries = productionData.filter((e) => {
        const m = (e.machine || '').trim().toLowerCase();
        return m.includes(cfg.name.toLowerCase());
      });

      matchEntries.forEach((e) => {
        actualProd += Number(e.netWeight) || 0;
        const ecoP = Number(e.ecoBP) || 0;
        const ecoM = Number(e.ecoBM) || 0;
        const borra = Number(e.borraTotal) || 0;
        lossVal += ecoP + ecoM + borra;

        const mMin = Number(e.manutencaoMin) || 0;
        const pMin = Number(e.processoMin) || 0;
        const oMin = Number(e.outrosMin) || 0;
        stoppedMin += mMin + pMin + oMin;
        manutMin += mMin;
        procMin += pMin;
        outrosMin += oMin;

        if (mMin > 0) failureCount += 1;
      });
    } else {
      // Corte de Fita
      const matchEntries = ribbonEntries.filter((e) => {
        const m = (e.machine || '').trim().toLowerCase();
        return m.includes(cfg.name.toLowerCase());
      });

      matchEntries.forEach((e) => {
        actualProd += Number(e.producedM2) || 0;
        lossVal += Number(e.rejectedM2) || 0;

        const mMin = Number(e.manutencaoMin) || 0;
        const pMin = Number(e.processoMin) || 0;
        const oMin = Number(e.outrosMin) || 0;
        const totalStop = Number(e.stoppedMinutes) || (mMin + pMin + oMin);
        stoppedMin += totalStop;
        manutMin += mMin;
        procMin += pMin;
        outrosMin += oMin;

        if (mMin > 0) failureCount += 1;
      });
    }

    const stoppedHours = Number((stoppedMin / 60).toFixed(1));
    const operatingHours = Math.max(0, Number((plannedHours - stoppedHours).toFixed(1)));

    // 1. Availability = Operating Time / Planned Time
    const availabilityPct = plannedHours > 0 ? Math.max(0, Math.min(100, (operatingHours / plannedHours) * 100)) : 100;

    // 2. Performance = Actual Output / Theoretical Output
    const theoreticalCap = operatingHours * cfg.nominalCapPerHour;
    const performancePct = theoreticalCap > 0 ? Math.max(0, Math.min(100, (actualProd / theoreticalCap) * 100)) : 0;

    // 3. Quality = Good Output / Total Output
    const totalOutput = actualProd + lossVal;
    const qualityPct = totalOutput > 0 ? Math.max(0, Math.min(100, (actualProd / totalOutput) * 100)) : 100;

    // 4. Overall OEE = A * P * Q
    const oeePct = (availabilityPct / 100) * (performancePct / 100) * (qualityPct / 100) * 100;

    // 5. Reliability: MTBF & MTTR
    const totalOperatingMinutes = operatingHours * 60;
    const mttrMinutes = failureCount > 0 ? Math.round(manutMin / failureCount) : 0;
    const mtbfHours = failureCount > 0 ? Number((operatingHours / failureCount).toFixed(1)) : operatingHours;

    // 6. TEEP (24/7 Total Utilization)
    const totalAllCalendarHours = daysCount * 24;
    const teepPct = totalAllCalendarHours > 0 ? (operatingHours / totalAllCalendarHours) * (performancePct / 100) * (qualityPct / 100) * 100 : 0;

    // Status classification (World Class >= 85%, Good >= 75%, Fair >= 65%, Critical < 65%)
    let statusClass: 'world-class' | 'good' | 'fair' | 'critical' = 'critical';
    let statusLabel = 'Crítico (<65%)';
    if (oeePct >= 85) {
      statusClass = 'world-class';
      statusLabel = 'World Class (≥85%)';
    } else if (oeePct >= 75) {
      statusClass = 'good';
      statusLabel = 'Competitivo (75-84%)';
    } else if (oeePct >= 65) {
      statusClass = 'fair';
      statusLabel = 'Regular (65-74%)';
    }

    return {
      name: cfg.name,
      sector: cfg.sector,
      plannedHours,
      stoppedMinutes: stoppedMin,
      stoppedHours,
      operatingHours,
      availabilityPct: Number(availabilityPct.toFixed(1)),
      actualProduction: actualProd,
      actualProductionUnit: cfg.unit,
      nominalCapacityPerHour: cfg.nominalCapPerHour,
      theoreticalCapacity: Math.round(theoreticalCap),
      performancePct: Number(performancePct.toFixed(1)),
      losses: lossVal,
      lossesUnit: cfg.unit,
      qualityPct: Number(qualityPct.toFixed(1)),
      oeePct: Number(oeePct.toFixed(1)),
      statusClass,
      statusLabel,
      mtbfHours,
      mttrMinutes,
      failureEvents: failureCount,
      teepPct: Number(teepPct.toFixed(1)),
      manutMin,
      procMin,
      outrosMin,
    };
  });

  // Calculate Plant Weighted Average
  let totalPlannedH = 0;
  let totalStoppedH = 0;
  let totalOperatingH = 0;
  let sumWeightedAvail = 0;
  let sumWeightedPerf = 0;
  let sumWeightedQual = 0;

  results.forEach((r) => {
    totalPlannedH += r.plannedHours;
    totalStoppedH += r.stoppedHours;
    totalOperatingH += r.operatingHours;
    sumWeightedAvail += r.availabilityPct * r.plannedHours;
    sumWeightedPerf += r.performancePct * r.plannedHours;
    sumWeightedQual += r.qualityPct * r.plannedHours;
  });

  const avgAvail = totalPlannedH > 0 ? Number((sumWeightedAvail / totalPlannedH).toFixed(1)) : 100;
  const avgPerf = totalPlannedH > 0 ? Number((sumWeightedPerf / totalPlannedH).toFixed(1)) : 0;
  const avgQual = totalPlannedH > 0 ? Number((sumWeightedQual / totalPlannedH).toFixed(1)) : 100;
  const plantOee = Number(((avgAvail / 100) * (avgPerf / 100) * (avgQual / 100) * 100).toFixed(1));

  let plantStatusClass: 'world-class' | 'good' | 'fair' | 'critical' = 'critical';
  let plantStatusLabel = 'Crítico (<65%)';
  if (plantOee >= 85) {
    plantStatusClass = 'world-class';
    plantStatusLabel = 'World Class (≥85%)';
  } else if (plantOee >= 75) {
    plantStatusClass = 'good';
    plantStatusLabel = 'Competitivo (75-84%)';
  } else if (plantOee >= 65) {
    plantStatusClass = 'fair';
    plantStatusLabel = 'Regular (65-74%)';
  }

  const plantAverage: MachineOeeStats = {
    name: 'MÉDIA CONSOLIDADA DA FÁBRICA',
    sector: 'Extrusão',
    plannedHours: Number(totalPlannedH.toFixed(1)),
    stoppedMinutes: Math.round(totalStoppedH * 60),
    stoppedHours: Number(totalStoppedH.toFixed(1)),
    operatingHours: Number(totalOperatingH.toFixed(1)),
    availabilityPct: avgAvail,
    actualProduction: 0,
    actualProductionUnit: '-',
    nominalCapacityPerHour: 0,
    theoreticalCapacity: 0,
    performancePct: avgPerf,
    losses: 0,
    lossesUnit: '-',
    qualityPct: avgQual,
    oeePct: plantOee,
    statusClass: plantStatusClass,
    statusLabel: plantStatusLabel,
    mtbfHours: 0,
    mttrMinutes: 0,
    failureEvents: 0,
    teepPct: 0,
    manutMin: 0,
    procMin: 0,
    outrosMin: 0,
  };

  return {
    machines: results,
    plantAverage,
    daysCount,
    periodLabel,
  };
}

/**
 * Builds HTML for PAGE 1: Overall OEE Executive Scorecard & Matrix
 */
function buildOeePage1Html(
  data: ReturnType<typeof calculateOeeMetrics>,
  params: OeeReportParams
): string {
  const { machines, plantAverage, periodLabel } = data;

  const tableRowsHtml = machines
    .map((m) => {
      const oeeColor =
        m.oeePct >= 85
          ? '#15803d'
          : m.oeePct >= 75
          ? '#0284c7'
          : m.oeePct >= 65
          ? '#b45309'
          : '#be123c';

      const statusBg =
        m.oeePct >= 85
          ? '#dcfce7'
          : m.oeePct >= 75
          ? '#e0f2fe'
          : m.oeePct >= 65
          ? '#fef3c7'
          : '#ffe4e6';

      const prodFormatted =
        m.actualProductionUnit === 'kg'
          ? (m.actualProduction / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' T'
          : Math.round(m.actualProduction).toLocaleString('pt-BR') + ' m²';

      const nominalFormatted =
        m.actualProductionUnit === 'kg'
          ? (m.theoreticalCapacity / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' T'
          : Math.round(m.theoreticalCapacity).toLocaleString('pt-BR') + ' m²';

      const lossFormatted =
        m.lossesUnit === 'kg'
          ? (m.losses / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' T'
          : Math.round(m.losses).toLocaleString('pt-BR') + ' m²';

      return `
        <tr style="border-bottom: 1.5px solid #d0e7ed; height: 50px;">
          <!-- MÁQUINA / SETOR -->
          <td style="padding: 6px 12px; text-align: left; vertical-align: middle;">
            <div style="font-weight: 900; font-size: 14.5px; color: #003644;">${m.name}</div>
            <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">${m.sector}</div>
          </td>

          <!-- TEMPO PLANEJADO -->
          <td style="padding: 6px 8px; text-align: center; vertical-align: middle; font-weight: 800; font-size: 13.5px; color: #0f172a;">
            ${m.plannedHours}h
          </td>

          <!-- TEMPO PARADO -->
          <td style="padding: 6px 8px; text-align: center; vertical-align: middle; font-weight: 800; font-size: 13.5px; color: #be123c;">
            ${m.stoppedHours}h
            <div style="font-size: 9px; color: #94a3b8; font-weight: 600;">(${m.stoppedMinutes} min)</div>
          </td>

          <!-- DISPONIBILIDADE (A%) -->
          <td style="padding: 6px 10px; text-align: center; vertical-align: middle;">
            <div style="font-weight: 900; font-size: 15px; color: ${m.availabilityPct >= 90 ? '#15803d' : '#b45309'};">
              ${m.availabilityPct.toFixed(1)}%
            </div>
            <!-- Mini barra visual -->
            <div style="background-color: #e2e8f0; border-radius: 9999px; height: 5px; width: 100%; overflow: hidden; margin-top: 3px;">
              <div style="background-color: ${m.availabilityPct >= 90 ? '#22c55e' : '#f59e0b'}; height: 100%; width: ${m.availabilityPct}%;"></div>
            </div>
          </td>

          <!-- PRODUÇÃO REAL -->
          <td style="padding: 6px 8px; text-align: center; vertical-align: middle; font-weight: 800; font-size: 13px; color: #02657e;">
            ${prodFormatted}
          </td>

          <!-- CAPACIDADE NOMINAL -->
          <td style="padding: 6px 8px; text-align: center; vertical-align: middle; font-weight: 700; font-size: 12.5px; color: #64748b;">
            ${nominalFormatted}
          </td>

          <!-- DESEMPENHO (P%) -->
          <td style="padding: 6px 10px; text-align: center; vertical-align: middle;">
            <div style="font-weight: 900; font-size: 15px; color: ${m.performancePct >= 95 ? '#15803d' : m.performancePct >= 80 ? '#0284c7' : '#be123c'};">
              ${m.performancePct.toFixed(1)}%
            </div>
            <div style="background-color: #e2e8f0; border-radius: 9999px; height: 5px; width: 100%; overflow: hidden; margin-top: 3px;">
              <div style="background-color: ${m.performancePct >= 95 ? '#22c55e' : '#0284c7'}; height: 100%; width: ${m.performancePct}%;"></div>
            </div>
          </td>

          <!-- PERDAS / REFUGOS -->
          <td style="padding: 6px 8px; text-align: center; vertical-align: middle; font-weight: 800; font-size: 12.5px; color: #be123c;">
            ${lossFormatted}
          </td>

          <!-- QUALIDADE (Q%) -->
          <td style="padding: 6px 10px; text-align: center; vertical-align: middle;">
            <div style="font-weight: 900; font-size: 15px; color: ${m.qualityPct >= 99 ? '#15803d' : '#0284c7'};">
              ${m.qualityPct.toFixed(1)}%
            </div>
            <div style="background-color: #e2e8f0; border-radius: 9999px; height: 5px; width: 100%; overflow: hidden; margin-top: 3px;">
              <div style="background-color: #10b981; height: 100%; width: ${m.qualityPct}%;"></div>
            </div>
          </td>

          <!-- OEE GERAL (%) -->
          <td style="padding: 6px 10px; text-align: center; vertical-align: middle;">
            <span style="background-color: ${statusBg}; color: ${oeeColor}; font-weight: 900; font-size: 16px; padding: 4px 12px; border-radius: 8px; border: 1.5px solid ${oeeColor}33; display: inline-block;">
              ${m.oeePct.toFixed(1)}%
            </span>
          </td>

          <!-- STATUS LEAN -->
          <td style="padding: 6px 8px; text-align: center; vertical-align: middle;">
            <span style="font-size: 10.5px; font-weight: 800; color: ${oeeColor}; text-transform: uppercase;">
              ${m.statusLabel}
            </span>
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <div style="width: 1414px; height: 1000px; box-sizing: border-box; background: linear-gradient(135deg, #eef5f7 0%, #dce8ec 100%); display: flex; flex-direction: column; justify-content: space-between; padding: 22px 28px 24px 28px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
      
      <!-- TOPO / CABEÇALHO -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          ${getOfficialManuPackagingLogoHtml()}

          <!-- FAIXA POLIGONAL DE TÍTULO OFICIAL -->
          <div style="background: linear-gradient(90deg, #003847 0%, #004d61 100%); border-left: 6px solid #689f38; border-radius: 0 18px 18px 0; padding: 12px 36px 12px 28px; box-shadow: 0 4px 14px rgba(0, 44, 56, 0.15);">
            <div style="color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; line-height: 1.1;">
              RELATÓRIO EXECUTIVO DE OEE & DISPONIBILIDADE OPERACIONAL
            </div>
            <div style="color: #bef264; font-size: 13px; font-weight: 800; letter-spacing: 0.8px; margin-top: 5px; text-transform: uppercase;">
              AUDITORIA TPM / LEAN MANUFACTURING • PERÍODO: ${periodLabel} • PÁGINA 1/2
            </div>
          </div>
        </div>

        <!-- GRADE DE 4 SUPER-KPIS DE CLASSE MUNDIAL -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 14px;">
          <!-- SUPER-KPI 1: OEE GLOBAL -->
          <div style="background: #ffffff; border-radius: 14px; padding: 14px 18px; border: 2px solid ${plantAverage.oeePct >= 85 ? '#15803d' : '#0284c7'}; box-shadow: 0 2px 8px rgba(0,0,0,0.06); display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">OEE GERAL DA FÁBRICA</div>
              <div style="font-size: 32px; font-weight: 900; color: #003644; line-height: 1.1; margin-top: 2px;">${plantAverage.oeePct.toFixed(1)}%</div>
              <div style="font-size: 10px; font-weight: 800; color: #15803d; margin-top: 4px;">Benchmark Mundial: ≥ 85,0%</div>
            </div>
            <div style="background-color: ${plantAverage.oeePct >= 85 ? '#dcfce7' : '#e0f2fe'}; color: ${plantAverage.oeePct >= 85 ? '#15803d' : '#0284c7'}; border-radius: 9999px; padding: 6px 14px; font-weight: 900; font-size: 11.5px; text-transform: uppercase;">
              ${plantAverage.statusLabel}
            </div>
          </div>

          <!-- SUPER-KPI 2: DISPONIBILIDADE GLOBAL (A) -->
          <div style="background: #ffffff; border-radius: 14px; padding: 14px 18px; border: 1.5px solid #a3ccd4; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">DISPONIBILIDADE GLOBAL (A)</div>
            <div style="font-size: 30px; font-weight: 900; color: #02657e; line-height: 1.1; margin-top: 2px;">${plantAverage.availabilityPct.toFixed(1)}%</div>
            <div style="font-size: 10px; font-weight: 700; color: #64748b; margin-top: 4px;">
              Operado: <strong style="color: #003644;">${plantAverage.operatingHours}h</strong> • Paradas: <strong style="color: #be123c;">${plantAverage.stoppedHours}h</strong>
            </div>
          </div>

          <!-- SUPER-KPI 3: DESEMPENHO GLOBAL (P) -->
          <div style="background: #ffffff; border-radius: 14px; padding: 14px 18px; border: 1.5px solid #a3ccd4; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">DESEMPENHO / RITMO (P)</div>
            <div style="font-size: 30px; font-weight: 900; color: #0b4f8a; line-height: 1.1; margin-top: 2px;">${plantAverage.performancePct.toFixed(1)}%</div>
            <div style="font-size: 10px; font-weight: 700; color: #64748b; margin-top: 4px;">
              Ritmo real vs velocidade teórica nominal
            </div>
          </div>

          <!-- SUPER-KPI 4: QUALIDADE GLOBAL (Q) -->
          <div style="background: #ffffff; border-radius: 14px; padding: 14px 18px; border: 1.5px solid #a3ccd4; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="font-size: 11px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">QUALIDADE / FPY (Q)</div>
            <div style="font-size: 30px; font-weight: 900; color: #15803d; line-height: 1.1; margin-top: 2px;">${plantAverage.qualityPct.toFixed(1)}%</div>
            <div style="font-size: 10px; font-weight: 700; color: #64748b; margin-top: 4px;">
              Índice de aproveitamento de primeira linha
            </div>
          </div>
        </div>
      </div>

      <!-- TABELA MATRIZ DE OEE POR MÁQUINA -->
      <div style="flex: 1; background: #ffffff; border-radius: 18px; border: 2px solid #a3ccd4; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 44, 56, 0.08); display: flex; flex-direction: column;">
        <table style="width: 100%; height: 100%; border-collapse: collapse; table-layout: fixed;">
          <thead>
            <tr style="background: #005f73; color: #ffffff; font-family: 'Inter', system-ui, sans-serif; font-size: 11.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; height: 38px;">
              <th style="padding: 8px 12px; text-align: left; width: 14%;">MÁQUINA / LINHA</th>
              <th style="padding: 8px 6px; text-align: center; width: 8%;">TEMPO PLAN.</th>
              <th style="padding: 8px 6px; text-align: center; width: 8%;">PARADAS</th>
              <th style="padding: 8px 8px; text-align: center; width: 10%;">DISPONIBILIDADE (A)</th>
              <th style="padding: 8px 6px; text-align: center; width: 9%;">PROD. REAL</th>
              <th style="padding: 8px 6px; text-align: center; width: 9%;">CAP. TEÓRICA</th>
              <th style="padding: 8px 8px; text-align: center; width: 10%;">DESEMPENHO (P)</th>
              <th style="padding: 8px 6px; text-align: center; width: 8%;">REFUGOS</th>
              <th style="padding: 8px 8px; text-align: center; width: 10%;">QUALIDADE (Q)</th>
              <th style="padding: 8px 8px; text-align: center; width: 8%;">OEE (%)</th>
              <th style="padding: 8px 8px; text-align: center; width: 10%;">CLASSIFICAÇÃO</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </div>

      <!-- RODAPÉ DE AUDITORIA & METODOLOGIA LEAN -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding: 0 4px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="background-color: #002d38; color: #ffffff; padding: 8px 16px; border-radius: 10px; font-size: 11px; font-weight: 900; text-transform: uppercase;">
            FÓRMULA AUDITADA
          </div>
          <div style="background-color: #ffffff; border: 1.5px solid #a3ccd4; color: #003644; padding: 8px 16px; border-radius: 10px; font-size: 12px; font-weight: 800;">
            OEE = Disponibilidade (A) × Desempenho (P) × Qualidade (Q)
          </div>
          <div style="background-color: #ffffff; border: 1.5px solid #a3ccd4; color: #64748b; padding: 8px 16px; border-radius: 10px; font-size: 11px; font-weight: 700;">
            Padrão ISO 22400 / TPM World-Class Excellence
          </div>
        </div>

        <div style="background: linear-gradient(90deg, #00232c 0%, #003644 100%); border: 2px solid #005060; border-radius: 9999px; padding: 9px 24px; color: #bef264; font-size: 13.5px; font-weight: 900;">
          Meta Corporativa: OEE Global ≥ 85,0%
        </div>
      </div>

    </div>
  `;
}

/**
 * Builds HTML for PAGE 2: The Six Big Losses of TPM & Reliability (MTBF, MTTR, TEEP)
 */
function buildOeePage2Html(
  data: ReturnType<typeof calculateOeeMetrics>,
  params: OeeReportParams
): string {
  const { machines, plantAverage, periodLabel } = data;

  // Aggregate Six Big Losses
  let totManutMin = 0;
  let totProcMin = 0;
  let totOutrosMin = 0;
  let totLossKg = 0;
  let totFailureCount = 0;

  machines.forEach((m) => {
    totManutMin += m.manutMin;
    totProcMin += m.procMin;
    totOutrosMin += m.outrosMin;
    if (m.sector === 'Extrusão' || m.sector === 'Reciclagem') {
      totLossKg += m.losses;
    }
    totFailureCount += m.failureEvents;
  });

  const totDowntimeHours = ((totManutMin + totProcMin + totOutrosMin) / 60).toFixed(1);

  // Machine reliability cards
  const reliabilityCardsHtml = machines
    .map(
      (m) => `
      <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 12px 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; pb: 6px; margin-bottom: 6px;">
          <span style="font-weight: 900; font-size: 13px; color: #003644;">${m.name}</span>
          <span style="font-size: 9.5px; font-weight: 800; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 9999px;">${m.sector}</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11px;">
          <div>
            <span style="color: #64748b; font-weight: 600;">MTBF (Confiab.):</span>
            <div style="font-weight: 800; color: #15803d; font-size: 12px;">${m.mtbfHours}h entre falhas</div>
          </div>
          <div>
            <span style="color: #64748b; font-weight: 600;">MTTR (Reparo):</span>
            <div style="font-weight: 800; color: #be123c; font-size: 12px;">${m.mttrMinutes} min médios</div>
          </div>
          <div>
            <span style="color: #64748b; font-weight: 600;">Eventos Falha:</span>
            <div style="font-weight: 800; color: #0f172a;">${m.failureEvents} quebras</div>
          </div>
          <div>
            <span style="color: #64748b; font-weight: 600;">TEEP (24/7):</span>
            <div style="font-weight: 900; color: #0284c7;">${m.teepPct.toFixed(1)}%</div>
          </div>
        </div>
      </div>
    `
    )
    .join('');

  return `
    <div style="width: 1414px; height: 1000px; box-sizing: border-box; background: linear-gradient(135deg, #eef5f7 0%, #dce8ec 100%); display: flex; flex-direction: column; justify-content: space-between; padding: 22px 28px 24px 28px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
      
      <!-- TOPO / CABEÇALHO PÁGINA 2 -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          ${getOfficialManuPackagingLogoHtml()}

          <div style="background: linear-gradient(90deg, #003847 0%, #004d61 100%); border-left: 6px solid #689f38; border-radius: 0 18px 18px 0; padding: 12px 36px 12px 28px; box-shadow: 0 4px 14px rgba(0, 44, 56, 0.15);">
            <div style="color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; line-height: 1.1;">
              AS 6 GRANDES PERDAS DO TPM & CONFIABILIDADE (MTBF / MTTR)
            </div>
            <div style="color: #bef264; font-size: 13px; font-weight: 800; letter-spacing: 0.8px; margin-top: 5px; text-transform: uppercase;">
              DECOMPOSIÇÃO ANALÍTICA DAS CAUSAS-RAIZ • PERÍODO: ${periodLabel} • PÁGINA 2/2
            </div>
          </div>
        </div>
      </div>

      <!-- SEÇÃO 1: OS 3 PILARES E AS 6 GRANDES PERDAS (SIX BIG LOSSES) -->
      <div style="background: #ffffff; border-radius: 16px; border: 2px solid #a3ccd4; padding: 16px 20px; box-shadow: 0 4px 14px rgba(0,0,0,0.06); margin-bottom: 12px;">
        <div style="font-size: 13.5px; font-weight: 900; color: #003644; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#005d73" stroke-width="2"/>
            <path d="M2 17L12 22L22 17" stroke="#005d73" stroke-width="2"/>
            <path d="M2 12L12 17L22 12" stroke="#005d73" stroke-width="2"/>
          </svg>
          MAPA INDUSTRIAL DAS 6 GRANDES PERDAS DO OEE (TPM - TOTAL PRODUCTIVE MAINTENANCE)
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">
          <!-- PILAR 1: DISPONIBILIDADE -->
          <div style="background: #f8fafc; border-radius: 12px; border: 1.5px solid #cbd5e1; padding: 12px 14px;">
            <div style="font-weight: 900; font-size: 12px; color: #be123c; text-transform: uppercase; border-bottom: 1.5px solid #fecdd3; padding-bottom: 4px; margin-bottom: 8px;">
              1. PERDAS DE DISPONIBILIDADE
            </div>
            <!-- Perda 1 -->
            <div style="margin-bottom: 8px;">
              <strong style="font-size: 11.5px; color: #0f172a;">• Falhas de Equipamentos (Quebras):</strong>
              <div style="font-size: 11px; color: #64748b;">
                Manutenção Corretiva: <strong style="color: #be123c;">${(totManutMin / 60).toFixed(1)}h acumuladas</strong> (${totFailureCount} intervenções mecânicas/elétricas).
              </div>
            </div>
            <!-- Perda 2 -->
            <div>
              <strong style="font-size: 11.5px; color: #0f172a;">• Setups e Ajustes de Processo:</strong>
              <div style="font-size: 11px; color: #64748b;">
                Trocas de facas, regulagens de espessura e matrizes: <strong style="color: #b45309;">${(totProcMin / 60).toFixed(1)}h registradas</strong>.
              </div>
            </div>
          </div>

          <!-- PILAR 2: DESEMPENHO -->
          <div style="background: #f8fafc; border-radius: 12px; border: 1.5px solid #cbd5e1; padding: 12px 14px;">
            <div style="font-weight: 900; font-size: 12px; color: #0284c7; text-transform: uppercase; border-bottom: 1.5px solid #bae6fd; padding-bottom: 4px; margin-bottom: 8px;">
              2. PERDAS DE DESEMPENHO (RITMO)
            </div>
            <!-- Perda 3 -->
            <div style="margin-bottom: 8px;">
              <strong style="font-size: 11.5px; color: #0f172a;">• Pequenas Paradas e Ociosidade:</strong>
              <div style="font-size: 11px; color: #64748b;">
                Alinhamento de bobina, limpeza de cabeçote, reuniões de DDS: <strong style="color: #0369a1;">${(totOutrosMin / 60).toFixed(1)}h</strong>.
              </div>
            </div>
            <!-- Perda 4 -->
            <div>
              <strong style="font-size: 11.5px; color: #0f172a;">• Velocidade Reduzida / Throttle:</strong>
              <div style="font-size: 11px; color: #64748b;">
                Operação abaixo da capacidade nominal por limites térmicos ou oscilações de gauge.
              </div>
            </div>
          </div>

          <!-- PILAR 3: QUALIDADE -->
          <div style="background: #f8fafc; border-radius: 12px; border: 1.5px solid #cbd5e1; padding: 12px 14px;">
            <div style="font-weight: 900; font-size: 12px; color: #15803d; text-transform: uppercase; border-bottom: 1.5px solid #bbf7d0; padding-bottom: 4px; margin-bottom: 8px;">
              3. PERDAS DE QUALIDADE (REFUGO)
            </div>
            <!-- Perda 5 -->
            <div style="margin-bottom: 8px;">
              <strong style="font-size: 11.5px; color: #0f172a;">• Sucata de Partida / Purga:</strong>
              <div style="font-size: 11px; color: #64748b;">
                Resíduo Borra em inicialização e transições de resina.
              </div>
            </div>
            <!-- Perda 6 -->
            <div>
              <strong style="font-size: 11.5px; color: #0f172a;">• Refugos de Produção e Não Conf.:</strong>
              <div style="font-size: 11px; color: #64748b;">
                Eco B (Produção + Manutenção) e perdas de corte: <strong style="color: #be123c;">${(totLossKg / 1000).toFixed(2)} Toneladas</strong>.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SEÇÃO 2: MATRIZ DE CONFIABILIDADE (MTBF / MTTR / TEEP) -->
      <div style="background: #ffffff; border-radius: 16px; border: 2px solid #a3ccd4; padding: 16px 20px; box-shadow: 0 4px 14px rgba(0,0,0,0.06); flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="font-size: 13.5px; font-weight: 900; color: #003644; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px;">
            INDICADORES AVANÇADOS DE CONFIABILIDADE E EFICIÊNCIA GLOBAL (SEMI E10 & ISO 22400)
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
            ${reliabilityCardsHtml}
          </div>
        </div>

        <!-- PLANO DE AÇÃO LEAN RECOMENDADO -->
        <div style="background: #f1f5f9; border-left: 5px solid #005d73; border-radius: 10px; padding: 10px 16px; margin-top: 10px;">
          <div style="font-weight: 900; font-size: 11.5px; color: #003644; text-transform: uppercase;">
            DIAGNÓSTICO TÉCNICO & PLANO DE AÇÃO LEAN RECOMENDADO
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 3px; line-height: 1.4;">
            <strong>1. Confiabilidade (MTBF):</strong> Fortalecer manutenção preventiva e rotinas de lubrificação para elevar o intervalo entre falhas nas linhas com MTBF inferior a 100h.
            <br/>
            <strong>2. Setup Rápido (SMED):</strong> Padronizar preparação de matrizes e troca de facas nas cortadeiras para reduzir paradas de processo em até 25%.
            <br/>
            <strong>3. Zero Defeito (TPM):</strong> Reclaiming imediato de Eco B na recicladora Erema para garantir ciclo fechado e rentabilidade máxima de matéria-prima.
          </div>
        </div>
      </div>

      <!-- RODAPÉ PÁGINA 2 -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding: 0 4px;">
        <div style="font-size: 11px; font-weight: 700; color: #64748b;">
          MANUPACKAGING FITASA & AMAZÔNIA • RELATÓRIO OFICIAL DE AUDITORIA DE EFICÁCIA (OEE)
        </div>
        <div style="font-size: 11px; font-weight: 800; color: #003644;">
          Emitido por: ${params.loggedUser?.name || 'Sistema de Gestão'} • ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

    </div>
  `;
}

/**
 * Main export function: Generates and downloads the Official 2-Page OEE Executive Report in Landscape A4 (297mm x 210mm)
 */
export async function downloadOeeAnalyticsPDF(params: OeeReportParams): Promise<boolean> {
  const oeeData = calculateOeeMetrics(params);

  // Setup jsPDF landscape A4 document (297mm x 210mm)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Offscreen rendering container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '-99999px';
  container.style.left = '-99999px';
  container.style.width = '1414px';
  container.style.height = '1000px';
  container.style.zIndex = '-9999';
  container.style.overflow = 'hidden';
  document.body.appendChild(container);

  try {
    // --- PAGE 1: Overall OEE Scorecard & Machine Matrix ---
    container.innerHTML = buildOeePage1Html(oeeData, params);
    const canvasP1 = await html2canvas(container, {
      scale: 2.2,
      useCORS: true,
      logging: false,
      backgroundColor: '#eef5f7',
    });
    const imgDataP1 = canvasP1.toDataURL('image/jpeg', 0.95);
    doc.addImage(imgDataP1, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');

    // --- PAGE 2: Six Big Losses & Reliability (MTBF, MTTR, TEEP) ---
    doc.addPage('a4', 'landscape');
    container.innerHTML = buildOeePage2Html(oeeData, params);
    const canvasP2 = await html2canvas(container, {
      scale: 2.2,
      useCORS: true,
      logging: false,
      backgroundColor: '#eef5f7',
    });
    const imgDataP2 = canvasP2.toDataURL('image/jpeg', 0.95);
    doc.addImage(imgDataP2, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');

    const cleanPeriod = (params.period || 'Geral').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Relatorio_Executivo_OEE_Disponibilidade_${cleanPeriod}.pdf`;
    doc.save(fileName);
    return true;
  } catch (err) {
    console.error('Erro ao gerar Relatório Executivo de OEE:', err);
    alert('Não foi possível gerar o Relatório de OEE. Por favor, tente novamente.');
    return false;
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}
