import html2canvas from 'html2canvas';

export interface ChartExportDetails {
  id: string;
  title: string;
  period?: string;
  chartType?:
    | 'bi-chart-composed'
    | 'bi-chart-scatter'
    | 'bi-chart-stacked'
    | 'bi-chart-donut'
    | 'bi-chart-dynamic'
    | 'stops-motifs-card'
    | 'ribbon-chart-composed'
    | 'ribbon-chart-scatter'
    | 'ribbon-chart-stacked'
    | 'ribbon-chart-prod'
    | 'ribbon-chart-waste'
    | 'generic';
  data?: any;
  formatWeight?: (val: number) => string;
  formatM2?: (val: number) => string;
  formatMinutes?: (val: number) => string;
  extraInfo?: {
    groupBy?: string;
    metricLabel?: string;
    extruderEcoB?: number;
    eremaRecycled?: number;
    subtitle?: string;
  };
}

/**
 * Builds an HTML string for the detailed data legend table based on chart type.
 */
function buildLegendHTML(details: ChartExportDetails): string {
  const { 
    chartType, 
    data, 
    formatWeight = (v: any) => `${(Number(v) || 0).toLocaleString('pt-BR')} kg`, 
    formatM2 = (v: any) => `${(Number(v) || 0).toLocaleString('pt-BR')} m²`, 
    formatMinutes = (m: any) => `${Number(m) || 0} min`, 
    extraInfo = {} 
  } = details;

  if (!data || (Array.isArray(data) && data.length === 0)) {
    return '';
  }

  // 1. Extrusion Composed: Loss vs Net Production
  if (chartType === 'bi-chart-composed' && Array.isArray(data)) {
    let totalEcoBP = 0;
    let totalEcoBM = 0;
    let totalBorra = 0;
    let totalProd = 0;
    let totalVols = 0;

    const rowsHTML = data
      .map((item) => {
        totalEcoBP += item.ecoBP || 0;
        totalEcoBM += item.ecoBM || 0;
        totalBorra += item.borra || 0;
        totalProd += item.prod || 0;
        totalVols += item.totalVolumes || 0;

        const dateFormatted = item.date ? item.date.split('-').reverse().join('/') : item.label || '';
        
        let shiftsBreakdown = '-';
        if (item.volumesByShiftMachine && Object.keys(item.volumesByShiftMachine).length > 0) {
          shiftsBreakdown = Object.entries(item.volumesByShiftMachine)
            .map(([shift, machines]) => {
              const machStr = Object.entries(machines as Record<string, number>)
                .map(([m, v]) => `${m}: ${v}v`)
                .join(', ');
              return `<span style="display:inline-block; margin-right:8px; padding:2px 6px; background:#f1f5f9; border-radius:4px; font-size:10px;"><strong>${shift}:</strong> ${machStr}</span>`;
            })
            .join(' ');
        }

        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
            <td style="padding: 8px 10px; font-weight: 700; color: #1e293b;">${dateFormatted}</td>
            <td style="padding: 8px 10px; color: #2563eb; font-weight: 600;">${formatWeight(item.ecoBP || 0)}</td>
            <td style="padding: 8px 10px; color: #7c3aed; font-weight: 600;">${formatWeight(item.ecoBM || 0)}</td>
            <td style="padding: 8px 10px; color: #e11d48; font-weight: 600;">${formatWeight(item.borra || 0)}</td>
            <td style="padding: 8px 10px; color: #059669; font-weight: 800;">${formatWeight(item.prod || 0)}</td>
            <td style="padding: 8px 10px; color: #4338ca; font-weight: 700; text-align: center;">${item.totalVolumes || 0}</td>
            <td style="padding: 8px 10px; color: #475569;">${shiftsBreakdown}</td>
          </tr>
        `;
      })
      .join('');

    return `
      <div style="margin-top: 20px; padding: 16px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; font-family: system-ui, -apple-system, sans-serif;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
          <h4 style="margin: 0; font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
            📋 Legenda e Detalhamento Cronológico por Data
          </h4>
          <span style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">
            ${data.length} ${data.length === 1 ? 'dia registrado' : 'dias registrados'}
          </span>
        </div>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 800;">
                <th style="padding: 8px 10px;">Data</th>
                <th style="padding: 8px 10px;">Eco B Prod.</th>
                <th style="padding: 8px 10px;">Eco B Manut.</th>
                <th style="padding: 8px 10px;">Resíduo Borra</th>
                <th style="padding: 8px 10px;">Produção Líquida</th>
                <th style="padding: 8px 10px; text-align: center;">Volumes</th>
                <th style="padding: 8px 10px;">Detalhamento por Turno / Linha</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
            <tfoot>
              <tr style="background: #f1f5f9; font-weight: 900; font-size: 11px; border-top: 2px solid #cbd5e1; color: #0f172a;">
                <td style="padding: 10px;">TOTAL DO PERÍODO</td>
                <td style="padding: 10px; color: #2563eb;">${formatWeight(totalEcoBP)}</td>
                <td style="padding: 10px; color: #7c3aed;">${formatWeight(totalEcoBM)}</td>
                <td style="padding: 10px; color: #e11d48;">${formatWeight(totalBorra)}</td>
                <td style="padding: 10px; color: #059669;">${formatWeight(totalProd)}</td>
                <td style="padding: 10px; color: #4338ca; text-align: center;">${totalVols} vols</td>
                <td style="padding: 10px; color: #64748b; font-size: 10px;">Perdas Totais: ${formatWeight(totalEcoBP + totalEcoBM + totalBorra)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  }

  // 2. Extrusion Scatter: Operator vs Efficiency
  if (chartType === 'bi-chart-scatter' && Array.isArray(data)) {
    const cardsHTML = data
      .map((item) => {
        const wasteRatio = item.prod + item.wastes > 0 ? ((item.wastes / (item.prod + item.wastes)) * 100).toFixed(2) : '0,00';
        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
            <td style="padding: 8px 10px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 8px;">
              <span style="display:inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${item.color || '#3b82f6'}; border: 2px solid #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></span>
              ${item.name}
            </td>
            <td style="padding: 8px 10px; color: #059669; font-weight: 800;">${formatWeight(item.prod || 0)}</td>
            <td style="padding: 8px 10px; color: #e11d48; font-weight: 700;">${formatWeight(item.wastes || 0)}</td>
            <td style="padding: 8px 10px; color: #f59e0b; font-weight: 700;">${item.stopsProcess || 0} min</td>
            <td style="padding: 8px 10px; color: #64748b; font-weight: 600;">${wasteRatio}%</td>
          </tr>
        `;
      })
      .join('');

    return `
      <div style="margin-top: 20px; padding: 16px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; font-family: system-ui, -apple-system, sans-serif;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
          <h4 style="margin: 0; font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
            👥 Legenda de Operadores e Desempenho
          </h4>
          <span style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">
            ${data.length} ${data.length === 1 ? 'operador' : 'operadores'}
          </span>
        </div>
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 800;">
              <th style="padding: 8px 10px;">Operador (Identificação Gráfica)</th>
              <th style="padding: 8px 10px;">🏆 Produção Líquida</th>
              <th style="padding: 8px 10px;">🗑️ Desperdício Total</th>
              <th style="padding: 8px 10px;">⏱️ Paradas de Processo</th>
              <th style="padding: 8px 10px;">Índice de Resíduo</th>
            </tr>
          </thead>
          <tbody>
            ${cardsHTML}
          </tbody>
        </table>
      </div>
    `;
  }

  // 3. Extrusion Stacked: 100% Proportional Stops Breakdown
  if (chartType === 'bi-chart-stacked' && Array.isArray(data)) {
    const groupName = extraInfo.groupBy === 'operator' ? 'Operador' : 'Equipamento / Linha';
    const rowsHTML = data
      .map((item) => {
        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
            <td style="padding: 8px 10px; font-weight: 800; color: #1e293b;">${item.name}</td>
            <td style="padding: 8px 10px; color: #ef4444; font-weight: 700;">${item.manutPct || 0}%</td>
            <td style="padding: 8px 10px; color: #f59e0b; font-weight: 700;">${item.procPct || 0}%</td>
            <td style="padding: 8px 10px; color: #64748b; font-weight: 700;">${item.outrosPct || 0}%</td>
            <td style="padding: 8px 10px; color: #0f172a; font-weight: 900;">${formatMinutes(item.totalMin || 0)}</td>
          </tr>
        `;
      })
      .join('');

    return `
      <div style="margin-top: 20px; padding: 16px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; font-family: system-ui, -apple-system, sans-serif;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
          <h4 style="margin: 0; font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
            📊 Detalhamento Proporcional de Inatividades (${groupName})
          </h4>
        </div>
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 800;">
              <th style="padding: 8px 10px;">${groupName}</th>
              <th style="padding: 8px 10px; color: #ef4444;">🔴 Manutenção (%)</th>
              <th style="padding: 8px 10px; color: #f59e0b;">🟡 Processo (%)</th>
              <th style="padding: 8px 10px; color: #64748b;">⚪ Outros (%)</th>
              <th style="padding: 8px 10px;">Tempo Total Parado</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      </div>
    `;
  }

  // 4. Extrusion Donut: Mass Balance
  if (chartType === 'bi-chart-donut') {
    const extEcoB = extraInfo.extruderEcoB ?? 0;
    const ereRec = extraInfo.eremaRecycled ?? 0;
    const diff = Math.abs(extEcoB - ereRec);
    const diffDesc =
      extEcoB > ereRec
        ? `${formatWeight(diff)} gerados acima do reprocessado (Acúmulo de estoque).`
        : `${formatWeight(diff)} reprocessados acima do volume descartado (Consumo de resíduos).`;

    return `
      <div style="margin-top: 20px; padding: 16px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; font-family: system-ui, -apple-system, sans-serif;">
        <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
          ⚖️ Balanço de Massa e Diferencial de Reclaiming
        </h4>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 12px;">
          <div style="padding: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px;">
            <span style="font-size: 10px; font-weight: 800; color: #b45309; text-transform: uppercase;">🟡 Eco B Gerado (Cast)</span>
            <div style="font-size: 18px; font-weight: 900; color: #78350f; margin-top: 4px;">${formatWeight(extEcoB)}</div>
          </div>
          <div style="padding: 12px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px;">
            <span style="font-size: 10px; font-weight: 800; color: #047857; text-transform: uppercase;">🟢 Reciclado (Erema)</span>
            <div style="font-size: 18px; font-weight: 900; color: #064e3b; margin-top: 4px;">${formatWeight(ereRec)}</div>
          </div>
        </div>
        <div style="padding: 10px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 11px; color: #334155; font-weight: 600;">
          📌 <strong>Diferencial de Reclaiming:</strong> ${diffDesc}
        </div>
      </div>
    `;
  }

  // 5. Extrusion Dynamic Ranking
  if (chartType === 'bi-chart-dynamic' && Array.isArray(data)) {
    const metricLabel = extraInfo.metricLabel || 'Valor';
    const rowsHTML = data
      .map((item, idx) => {
        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
            <td style="padding: 8px 10px; font-weight: 900; color: #64748b; width: 40px;">#${idx + 1}</td>
            <td style="padding: 8px 10px; font-weight: 800; color: #1e293b;">${item.name}</td>
            <td style="padding: 8px 10px; color: #4338ca; font-weight: 800; text-align: right;">${item.value !== undefined ? (typeof item.value === 'number' ? item.value.toLocaleString('pt-BR') : item.value) : '-'}</td>
          </tr>
        `;
      })
      .join('');

    return `
      <div style="margin-top: 20px; padding: 16px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; font-family: system-ui, -apple-system, sans-serif;">
        <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
          🏆 Tabela de Classificação e Métricas (${metricLabel})
        </h4>
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 800;">
              <th style="padding: 8px 10px; width: 40px;">Pos.</th>
              <th style="padding: 8px 10px;">Item / Entidade</th>
              <th style="padding: 8px 10px; text-align: right;">${metricLabel}</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      </div>
    `;
  }

  // 6. Ribbon Composed: Loss vs Net Production (Corte de Fita)
  if (chartType === 'ribbon-chart-composed' && Array.isArray(data)) {
    let totalTipo1 = 0;
    let totalTipo2 = 0;
    let totalLixoM2 = 0;
    let totalLixoKg = 0;
    let totalProd = 0;
    let totalRolls = 0;

    const rowsHTML = data
      .map((item) => {
        totalTipo1 += item.tipo1 || 0;
        totalTipo2 += item.tipo2 || 0;
        totalLixoM2 += item.residuoM2 || 0;
        totalLixoKg += item.residuoWeight || 0;
        totalProd += item.prod || 0;
        totalRolls += item.rollsCount || 0;

        const dateFormatted = item.date ? item.date.split('-').reverse().join('/') : item.label || '';

        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
            <td style="padding: 8px 10px; font-weight: 700; color: #1e293b;">${dateFormatted}</td>
            <td style="padding: 8px 10px; color: #6366f1; font-weight: 700;">${Number(item.rollsCount || 0).toLocaleString('pt-BR')} un</td>
            <td style="padding: 8px 10px; color: #ef4444; font-weight: 600;">${formatM2(item.tipo1 || 0)}</td>
            <td style="padding: 8px 10px; color: #f43f5e; font-weight: 600;">${formatM2(item.tipo2 || 0)}</td>
            <td style="padding: 8px 10px; color: #f59e0b; font-weight: 600;">${formatWeight(item.residuoWeight || 0)} (${formatM2(item.residuoM2 || 0)})</td>
            <td style="padding: 8px 10px; color: #059669; font-weight: 800;">${formatM2(item.prod || 0)}</td>
          </tr>
        `;
      })
      .join('');

    return `
      <div style="margin-top: 20px; padding: 16px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; font-family: system-ui, -apple-system, sans-serif;">
        <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
          📋 Legenda e Detalhamento Diário de Produção e Perdas (Corte de Fita)
        </h4>
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 800;">
              <th style="padding: 8px 10px;">Data</th>
              <th style="padding: 8px 10px;">Rolos Cortados</th>
              <th style="padding: 8px 10px;">Não Conforme Tipo 1</th>
              <th style="padding: 8px 10px;">Não Conforme Tipo 2</th>
              <th style="padding: 8px 10px;">Lixo (Kg e m²)</th>
              <th style="padding: 8px 10px;">Produção Líquida</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: 900; font-size: 11px; border-top: 2px solid #cbd5e1; color: #0f172a;">
              <td style="padding: 10px;">TOTAL DO PERÍODO</td>
              <td style="padding: 10px; color: #6366f1;">${totalRolls.toLocaleString('pt-BR')} un</td>
              <td style="padding: 10px; color: #ef4444;">${formatM2(totalTipo1)}</td>
              <td style="padding: 10px; color: #f43f5e;">${formatM2(totalTipo2)}</td>
              <td style="padding: 10px; color: #f59e0b;">${formatWeight(totalLixoKg)} (${formatM2(totalLixoM2)})</td>
              <td style="padding: 10px; color: #059669;">${formatM2(totalProd)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  // 7. Ribbon Scatter: Operator vs Waste (Corte de Fita)
  if (chartType === 'ribbon-chart-scatter' && Array.isArray(data)) {
    const rowsHTML = data
      .map((item) => {
        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
            <td style="padding: 8px 10px; font-weight: 800; color: #1e293b; display: flex; align-items: center; gap: 8px;">
              <span style="display:inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${item.color || '#3b82f6'}; border: 2px solid #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></span>
              ${item.name}
            </td>
            <td style="padding: 8px 10px; color: #2563eb; font-weight: 700;">${item.machine || '-'}</td>
            <td style="padding: 8px 10px; color: #059669; font-weight: 800;">${formatM2(item.prod || 0)}</td>
            <td style="padding: 8px 10px; color: #e11d48; font-weight: 700;">${formatWeight(item.wastes || 0)}</td>
            <td style="padding: 8px 10px; color: #f59e0b; font-weight: 700;">${item.stopsProcess || 0} min</td>
          </tr>
        `;
      })
      .join('');

    return `
      <div style="margin-top: 20px; padding: 16px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; font-family: system-ui, -apple-system, sans-serif;">
        <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
          👥 Legenda de Operadores de Fita por Máquina e Desempenho
        </h4>
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 800;">
              <th style="padding: 8px 10px;">Operador</th>
              <th style="padding: 8px 10px;">Máquina</th>
              <th style="padding: 8px 10px;">🏆 Produção Líquida</th>
              <th style="padding: 8px 10px;">🗑️ Lixo Total</th>
              <th style="padding: 8px 10px;">⏱️ Tempo Parado</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      </div>
    `;
  }

  // 8. Ribbon Stacked: 100% Proportional Stops (Corte de Fita)
  if (chartType === 'ribbon-chart-stacked' && Array.isArray(data)) {
    const groupName = extraInfo.groupBy === 'operator' ? 'Operador' : 'Máquina';
    const rowsHTML = data
      .map((item) => {
        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
            <td style="padding: 8px 10px; font-weight: 800; color: #1e293b;">${item.name}</td>
            <td style="padding: 8px 10px; color: #ef4444; font-weight: 700;">${item.manutPct || 0}%</td>
            <td style="padding: 8px 10px; color: #f59e0b; font-weight: 700;">${item.procPct || 0}%</td>
            <td style="padding: 8px 10px; color: #64748b; font-weight: 700;">${item.outrosPct || 0}%</td>
          </tr>
        `;
      })
      .join('');

    return `
      <div style="margin-top: 20px; padding: 16px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; font-family: system-ui, -apple-system, sans-serif;">
        <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
          📊 Detalhamento Proporcional de Inatividades Fita (${groupName})
        </h4>
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 800;">
              <th style="padding: 8px 10px;">${groupName}</th>
              <th style="padding: 8px 10px; color: #ef4444;">🔴 Manutenção (%)</th>
              <th style="padding: 8px 10px; color: #f59e0b;">🟡 Processo (%)</th>
              <th style="padding: 8px 10px; color: #64748b;">⚪ Outros (%)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
        </table>
      </div>
    `;
  }

  // 9. Ribbon Daily Production by Machine
  if (chartType === 'ribbon-chart-prod' && Array.isArray(data)) {
    let sumGhezze = 0;
    let sumLintech = 0;
    let sumWutec = 0;
    let sumTotal = 0;

    const rowsHTML = data
      .map((item) => {
        sumGhezze += item.ghezzeProd || 0;
        sumLintech += item.lintechProd || 0;
        sumWutec += item.wutecProd || 0;
        sumTotal += item.totalProd || 0;

        const dateFormatted = item.date ? item.date.split('-').reverse().join('/') : item.label || '';

        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
            <td style="padding: 8px 10px; font-weight: 700; color: #1e293b;">${dateFormatted}</td>
            <td style="padding: 8px 10px; color: #2563eb; font-weight: 700;">${formatM2(item.ghezzeProd || 0)}</td>
            <td style="padding: 8px 10px; color: #059669; font-weight: 700;">${formatM2(item.lintechProd || 0)}</td>
            <td style="padding: 8px 10px; color: #7c3aed; font-weight: 700;">${formatM2(item.wutecProd || 0)}</td>
            <td style="padding: 8px 10px; color: #0f172a; font-weight: 900;">${formatM2(item.totalProd || 0)}</td>
          </tr>
        `;
      })
      .join('');

    return `
      <div style="margin-top: 20px; padding: 16px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; font-family: system-ui, -apple-system, sans-serif;">
        <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
          📋 Produção Física Diária por Máquina (m²)
        </h4>
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 800;">
              <th style="padding: 8px 10px;">Data</th>
              <th style="padding: 8px 10px; color: #2563eb;">🔵 Ghezzi (m²)</th>
              <th style="padding: 8px 10px; color: #059669;">🟢 Lintech (m²)</th>
              <th style="padding: 8px 10px; color: #7c3aed;">🟣 Wultec (m²)</th>
              <th style="padding: 8px 10px; color: #0f172a;">Total Produzido (m²)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: 900; font-size: 11px; border-top: 2px solid #cbd5e1; color: #0f172a;">
              <td style="padding: 10px;">TOTAL</td>
              <td style="padding: 10px; color: #2563eb;">${formatM2(sumGhezze)}</td>
              <td style="padding: 10px; color: #059669;">${formatM2(sumLintech)}</td>
              <td style="padding: 10px; color: #7c3aed;">${formatM2(sumWutec)}</td>
              <td style="padding: 10px; color: #0f172a;">${formatM2(sumTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  // 10. Ribbon Daily Waste by Machine
  if (chartType === 'ribbon-chart-waste' && Array.isArray(data)) {
    let sumGhezze = 0;
    let sumLintech = 0;
    let sumWutec = 0;
    let sumTotal = 0;

    const rowsHTML = data
      .map((item) => {
        sumGhezze += item.ghezzeWaste || 0;
        sumLintech += item.lintechWaste || 0;
        sumWutec += item.wutecWaste || 0;
        sumTotal += item.totalWaste || 0;

        const dateFormatted = item.date ? item.date.split('-').reverse().join('/') : item.label || '';

        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
            <td style="padding: 8px 10px; font-weight: 700; color: #1e293b;">${dateFormatted}</td>
            <td style="padding: 8px 10px; color: #2563eb; font-weight: 700;">${formatWeight(item.ghezzeWaste || 0)}</td>
            <td style="padding: 8px 10px; color: #059669; font-weight: 700;">${formatWeight(item.lintechWaste || 0)}</td>
            <td style="padding: 8px 10px; color: #7c3aed; font-weight: 700;">${formatWeight(item.wutecWaste || 0)}</td>
            <td style="padding: 8px 10px; color: #e11d48; font-weight: 900;">${formatWeight(item.totalWaste || 0)}</td>
          </tr>
        `;
      })
      .join('');

    return `
      <div style="margin-top: 20px; padding: 16px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 16px; font-family: system-ui, -apple-system, sans-serif;">
        <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
          🗑️ Indicadores de Lixo Acumulado por Máquina (Kg)
        </h4>
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 800;">
              <th style="padding: 8px 10px;">Data</th>
              <th style="padding: 8px 10px; color: #2563eb;">🔵 Ghezzi (Kg)</th>
              <th style="padding: 8px 10px; color: #059669;">🟢 Lintech (Kg)</th>
              <th style="padding: 8px 10px; color: #7c3aed;">🟣 Wultec (Kg)</th>
              <th style="padding: 8px 10px; color: #e11d48;">Total Descarte (Kg)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHTML}
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: 900; font-size: 11px; border-top: 2px solid #cbd5e1; color: #0f172a;">
              <td style="padding: 10px;">TOTAL</td>
              <td style="padding: 10px; color: #2563eb;">${formatWeight(sumGhezze)}</td>
              <td style="padding: 10px; color: #059669;">${formatWeight(sumLintech)}</td>
              <td style="padding: 10px; color: #7c3aed;">${formatWeight(sumWutec)}</td>
              <td style="padding: 10px; color: #e11d48;">${formatWeight(sumTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  return '';
}

/**
 * Downloads a chart element as a high resolution PNG including the chart visual and rich data legend.
 */
export async function downloadChartAsImageWithLegend(details: ChartExportDetails): Promise<boolean> {
  const { id, title, period = new Date().toISOString().slice(0, 10) } = details;
  const originalElement = document.getElementById(id);

  if (!originalElement) {
    console.error(`[downloadChartAsImageWithLegend] Elemento não encontrado: ${id}`);
    return false;
  }

  // 1. Hide interactive / download buttons
  const actionButtons = originalElement.querySelectorAll<HTMLElement>(
    '.chart-download-btn, [data-no-download="true"], button[title*="Baixar"], button[title*="Download"], button[title*="Visualizar em Tela Cheia"], button[title*="Fechar"], button[title*="Exclusivo"]'
  );
  const hiddenBtnPrevDisplay = new Map<HTMLElement, string>();
  actionButtons.forEach((btn) => {
    hiddenBtnPrevDisplay.set(btn, btn.style.display);
    btn.style.display = 'none';
  });

  // 2. Generate and append rich legend HTML if available
  const legendHTML = buildLegendHTML(details);
  let legendNode: HTMLElement | null = null;
  if (legendHTML) {
    legendNode = document.createElement('div');
    legendNode.id = 'temp-chart-export-legend';
    legendNode.innerHTML = legendHTML;
    originalElement.appendChild(legendNode);
  }

  const cleanTitle = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
  const fileName = `Indicador_${cleanTitle}_${period}.png`;

  try {
    const canvas = await html2canvas(originalElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      onclone: (clonedDoc) => {
        try {
          const styleElements = clonedDoc.querySelectorAll('style');
          styleElements.forEach((style) => {
            try {
              if (style.textContent && (style.textContent.includes('oklch') || style.textContent.includes('color-mix'))) {
                style.textContent = style.textContent
                  .replace(/oklch\([^)]+\)/g, 'rgb(100, 116, 139)')
                  .replace(/color-mix\([^)]+\)/g, 'rgb(100, 116, 139)');
              }
            } catch (e) {
              // ignore
            }
          });
        } catch (e) {
          // ignore
        }

        try {
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el) => {
            try {
              const htmlEl = el as HTMLElement;
              if (htmlEl.style) {
                for (let i = 0; i < htmlEl.style.length; i++) {
                  const styleName = htmlEl.style[i];
                  const value = htmlEl.style.getPropertyValue(styleName);
                  if (value && (value.includes('oklch') || value.includes('color-mix'))) {
                    htmlEl.style.setProperty(styleName, 'rgb(100, 116, 139)');
                  }
                }
              }
            } catch (e) {
              // ignore
            }
          });
        } catch (e) {
          // ignore
        }

        const clonedEl = clonedDoc.getElementById(id);
        if (clonedEl) {
          clonedEl.style.height = 'auto';
          clonedEl.style.minHeight = 'auto';
          clonedEl.style.maxHeight = 'none';
          clonedEl.style.overflow = 'visible';
          
          const truncates = clonedEl.querySelectorAll('.truncate');
          truncates.forEach((node: any) => {
            node.style.whiteSpace = 'normal';
            node.style.overflow = 'visible';
            node.style.textOverflow = 'clip';
            node.classList.remove('truncate');
          });
        }
      },
    });

    const dataUrl = canvas.toDataURL('image/png');
    if (!dataUrl || dataUrl === 'data:,') {
      throw new Error('Canvas vazio retornado.');
    }

    // Trigger instant download
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    return true;
  } catch (err) {
    console.error('[downloadChartAsImageWithLegend] Erro ao exportar:', err);
    alert('Não foi possível gerar a imagem do gráfico. Por favor, tente novamente.');
    return false;
  } finally {
    // Clean up temporary DOM legend element
    if (legendNode && originalElement.contains(legendNode)) {
      originalElement.removeChild(legendNode);
    }
    // Restore button displays
    actionButtons.forEach((btn) => {
      btn.style.display = hiddenBtnPrevDisplay.get(btn) ?? '';
    });
  }
}
