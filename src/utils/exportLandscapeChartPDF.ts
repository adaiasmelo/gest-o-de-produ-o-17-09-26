import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

export interface LandscapeChartExportDetails {
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
    filters?: {
      machine?: string;
      operator?: string;
      shift?: string;
      dateRange?: string;
    };
  };
  systemLogo?: string;
  systemName?: string;
  loggedUser?: {
    name?: string;
    role?: string;
  } | null;
}

// Color palette for Gestão à Vista (High contrast, professional for shop floor display)
const PALETTE = {
  navyDark: [15, 23, 42] as [number, number, number],         // #0f172a
  navyMedium: [30, 41, 59] as [number, number, number],       // #1e293b
  emerald: [5, 150, 105] as [number, number, number],         // #059669
  emeraldLight: [240, 253, 244] as [number, number, number],  // #f0fdf4
  blueBrand: [2, 132, 199] as [number, number, number],       // #0284c7
  blueLight: [240, 249, 255] as [number, number, number],     // #f0f9ff
  amber: [217, 119, 6] as [number, number, number],           // #d97706
  amberLight: [255, 251, 235] as [number, number, number],    // #fffbeb
  rose: [225, 29, 72] as [number, number, number],            // #e11d48
  roseLight: [255, 241, 242] as [number, number, number],     // #fff1f2
  slateMuted: [100, 116, 139] as [number, number, number],    // #64748b
  border: [226, 232, 240] as [number, number, number],        // #e2e8f0
  bgCard: [248, 250, 252] as [number, number, number],        // #f8fafc
  white: [255, 255, 255] as [number, number, number],
};

/**
 * Computes 4 prominent KPI badges for the landscape header bar
 */
function computeHeaderKPIs(details: LandscapeChartExportDetails) {
  const { chartType, data, formatWeight = (v) => `${Number(v).toLocaleString('pt-BR')} kg`, formatM2 = (v) => `${Number(v).toLocaleString('pt-BR')} m²`, formatMinutes = (m) => `${m} min`, extraInfo = {} } = details;

  if (chartType === 'bi-chart-composed' && Array.isArray(data)) {
    let totProd = 0, totEcoBP = 0, totEcoBM = 0, totBorra = 0, totVols = 0;
    data.forEach((d) => {
      totProd += d.prod || 0;
      totEcoBP += d.ecoBP || 0;
      totEcoBM += d.ecoBM || 0;
      totBorra += d.borra || 0;
      totVols += d.totalVolumes || 0;
    });
    const totLoss = totEcoBP + totEcoBM + totBorra;
    const lossPct = totProd + totLoss > 0 ? ((totLoss / (totProd + totLoss)) * 100).toFixed(2) : '0,00';

    return [
      { label: 'PRODUÇÃO LÍQUIDA', value: formatWeight(totProd), sub: `${totVols.toLocaleString('pt-BR')} volumes`, color: PALETTE.emerald, bg: PALETTE.emeraldLight },
      { label: 'PERDAS TOTAIS', value: formatWeight(totLoss), sub: `${lossPct}% da massa total`, color: PALETTE.rose, bg: PALETTE.roseLight },
      { label: 'RESÍDUO ECO B (P+M)', value: formatWeight(totEcoBP + totEcoBM), sub: `Prod: ${formatWeight(totEcoBP)} | Manut: ${formatWeight(totEcoBM)}`, color: PALETTE.amber, bg: PALETTE.amberLight },
      { label: 'RESÍDUO BORRA TOTAL', value: formatWeight(totBorra), sub: 'Descarte físico de purga', color: PALETTE.navyMedium, bg: PALETTE.bgCard },
    ];
  }

  if (chartType === 'bi-chart-scatter' && Array.isArray(data)) {
    let totProd = 0, totWaste = 0, totStops = 0, maxProd = 0, bestOp = '-';
    data.forEach((op) => {
      totProd += op.prod || 0;
      totWaste += op.wastes || 0;
      totStops += op.stopsProcess || 0;
      if ((op.prod || 0) > maxProd) {
        maxProd = op.prod;
        bestOp = op.name;
      }
    });
    const wastePct = totProd + totWaste > 0 ? ((totWaste / (totProd + totWaste)) * 100).toFixed(2) : '0,00';

    return [
      { label: 'PRODUÇÃO TOTAL OPERADORES', value: formatWeight(totProd), sub: `Líder: ${bestOp}`, color: PALETTE.emerald, bg: PALETTE.emeraldLight },
      { label: 'DESPERDÍCIO TOTAL', value: formatWeight(totWaste), sub: `Índice médio: ${wastePct}%`, color: PALETTE.rose, bg: PALETTE.roseLight },
      { label: 'PARADAS DE PROCESSO', value: formatMinutes(totStops), sub: `${(totStops / 60).toFixed(1)} horas acumuladas`, color: PALETTE.amber, bg: PALETTE.amberLight },
      { label: 'OPERADORES AVALIADOS', value: `${data.length} Operadores`, sub: 'Quadro ativo de extrusão', color: PALETTE.blueBrand, bg: PALETTE.blueLight },
    ];
  }

  if (chartType === 'bi-chart-stacked' && Array.isArray(data)) {
    let totMin = 0, totManut = 0, totProc = 0, totOutros = 0;
    data.forEach((d) => {
      const min = d.totalMin || 0;
      totMin += min;
      totManut += (d.manutPct || 0) * min / 100;
      totProc += (d.procPct || 0) * min / 100;
      totOutros += (d.outrosPct || 0) * min / 100;
    });

    return [
      { label: 'TEMPO TOTAL PARADO', value: formatMinutes(totMin), sub: `${(totMin / 60).toFixed(1)} horas no período`, color: PALETTE.rose, bg: PALETTE.roseLight },
      { label: 'MANUTENÇÃO', value: `${totMin > 0 ? ((totManut / totMin) * 100).toFixed(1) : 0}%`, sub: `${formatMinutes(Math.round(totManut))} de intervenção`, color: PALETTE.rose, bg: PALETTE.roseLight },
      { label: 'PROCESSO', value: `${totMin > 0 ? ((totProc / totMin) * 100).toFixed(1) : 0}%`, sub: `${formatMinutes(Math.round(totProc))} de regulagem`, color: PALETTE.amber, bg: PALETTE.amberLight },
      { label: 'OUTROS MOTIVOS', value: `${totMin > 0 ? ((totOutros / totMin) * 100).toFixed(1) : 0}%`, sub: `${formatMinutes(Math.round(totOutros))} paradas gerais`, color: PALETTE.navyMedium, bg: PALETTE.bgCard },
    ];
  }

  if (chartType === 'bi-chart-donut') {
    const extEcoB = extraInfo.extruderEcoB || 0;
    const ereRec = extraInfo.eremaRecycled || 0;
    const diff = Math.abs(extEcoB - ereRec);

    return [
      { label: 'ECO B GERADO (CAST)', value: formatWeight(extEcoB), sub: 'Descarte das extrusoras', color: PALETTE.amber, bg: PALETTE.amberLight },
      { label: 'RECICLADO (EREMA)', value: formatWeight(ereRec), sub: 'Volume reprocessado', color: PALETTE.emerald, bg: PALETTE.emeraldLight },
      { label: 'BALANÇO LÍQUIDO', value: formatWeight(diff), sub: extEcoB >= ereRec ? 'Acúmulo de estoque' : 'Consumo de resíduo', color: extEcoB >= ereRec ? PALETTE.rose : PALETTE.emerald, bg: extEcoB >= ereRec ? PALETTE.roseLight : PALETTE.emeraldLight },
      { label: 'TAXA DE REPROCESSAMENTO', value: extEcoB > 0 ? `${((ereRec / extEcoB) * 100).toFixed(1)}%` : '100%', sub: 'Eficiência de reclaiming', color: PALETTE.blueBrand, bg: PALETTE.blueLight },
    ];
  }

  if (chartType === 'ribbon-chart-composed' && Array.isArray(data)) {
    let totProd = 0, totRolls = 0, totTipo1 = 0, totTipo2 = 0, totWaste = 0;
    data.forEach((d) => {
      totProd += d.prod || 0;
      totRolls += d.rollsCount || 0;
      totTipo1 += d.tipo1 || 0;
      totTipo2 += d.tipo2 || 0;
      totWaste += d.residuoWeight || 0;
    });

    return [
      { label: 'PRODUÇÃO LÍQUIDA (m²)', value: formatM2(totProd), sub: `${totRolls.toLocaleString('pt-BR')} rolos cortados`, color: PALETTE.emerald, bg: PALETTE.emeraldLight },
      { label: 'LIXO TOTAL DE FITA', value: formatWeight(totWaste), sub: 'Descarte físico acumulado', color: PALETTE.rose, bg: PALETTE.roseLight },
      { label: 'NÃO CONFORME TIPO 1', value: formatM2(totTipo1), sub: 'Refugo de refilamento', color: PALETTE.amber, bg: PALETTE.amberLight },
      { label: 'NÃO CONFORME TIPO 2', value: formatM2(totTipo2), sub: 'Descarte dimensional', color: PALETTE.navyMedium, bg: PALETTE.bgCard },
    ];
  }

  if (chartType === 'ribbon-chart-prod' && Array.isArray(data)) {
    let sumG = 0, sumL = 0, sumW = 0, sumT = 0;
    data.forEach((d) => {
      sumG += d.ghezzeProd || 0;
      sumL += d.lintechProd || 0;
      sumW += d.wutecProd || 0;
      sumT += d.totalProd || 0;
    });

    return [
      { label: 'PRODUÇÃO TOTAL (m²)', value: formatM2(sumT), sub: 'Consolidado das 3 máquinas', color: PALETTE.emerald, bg: PALETTE.emeraldLight },
      { label: 'CORTADEIRA GHEZZI', value: formatM2(sumG), sub: 'Fita 01', color: PALETTE.blueBrand, bg: PALETTE.blueLight },
      { label: 'CORTADEIRA LINTECH', value: formatM2(sumL), sub: 'Fita 02', color: PALETTE.emerald, bg: PALETTE.emeraldLight },
      { label: 'CORTADEIRA WULTEC', value: formatM2(sumW), sub: 'Fita 03', color: PALETTE.amber, bg: PALETTE.amberLight },
    ];
  }

  if (chartType === 'ribbon-chart-waste' && Array.isArray(data)) {
    let sumG = 0, sumL = 0, sumW = 0, sumT = 0;
    data.forEach((d) => {
      sumG += d.ghezzeWaste || 0;
      sumL += d.lintechWaste || 0;
      sumW += d.wutecWaste || 0;
      sumT += d.totalWaste || 0;
    });

    return [
      { label: 'DESCARTE TOTAL (Kg)', value: formatWeight(sumT), sub: 'Lixo acumulado das 3 cortadeiras', color: PALETTE.rose, bg: PALETTE.roseLight },
      { label: 'LIXO GHEZZI', value: formatWeight(sumG), sub: 'Fita 01', color: PALETTE.blueBrand, bg: PALETTE.blueLight },
      { label: 'LIXO LINTECH', value: formatWeight(sumL), sub: 'Fita 02', color: PALETTE.emerald, bg: PALETTE.emeraldLight },
      { label: 'LIXO WULTEC', value: formatWeight(sumW), sub: 'Fita 03', color: PALETTE.amber, bg: PALETTE.amberLight },
    ];
  }

  // Fallback
  return [
    { label: 'STATUS OPERACIONAL', value: 'CONFORME', sub: 'Gestão à Vista Ativa', color: PALETTE.emerald, bg: PALETTE.emeraldLight },
    { label: 'REFERÊNCIA', value: details.period || 'Mês Vigente', sub: 'Período Operacional', color: PALETTE.blueBrand, bg: PALETTE.blueLight },
    { label: 'AUDITORIA DE DADOS', value: '100% REGISTRADO', sub: 'Apontamento Oficial de Turno', color: PALETTE.amber, bg: PALETTE.amberLight },
    { label: 'UNIDADE', value: 'MANUPACKAGING', sub: 'Fitas & Amazônia', color: PALETTE.navyDark, bg: PALETTE.bgCard },
  ];
}

/**
 * Builds table headers and data matrix for jspdf-autotable
 */
function buildAnalyticalTable(details: LandscapeChartExportDetails): { headers: string[]; rows: string[][]; totalsRow?: string[] } | null {
  const { chartType, data, formatWeight = (v) => `${Number(v).toLocaleString('pt-BR')} kg`, formatM2 = (v) => `${Number(v).toLocaleString('pt-BR')} m²`, formatMinutes = (m) => `${m} min`, extraInfo = {} } = details;

  if (!data || !Array.isArray(data) || data.length === 0) return null;

  if (chartType === 'bi-chart-composed') {
    let totEcoBP = 0, totEcoBM = 0, totBorra = 0, totProd = 0, totVols = 0;
    const rows = data.map((item) => {
      totEcoBP += item.ecoBP || 0;
      totEcoBM += item.ecoBM || 0;
      totBorra += item.borra || 0;
      totProd += item.prod || 0;
      totVols += item.totalVolumes || 0;
      const dateStr = item.date ? item.date.split('-').reverse().join('/') : item.label || '';
      return [
        dateStr,
        formatWeight(item.ecoBP || 0),
        formatWeight(item.ecoBM || 0),
        formatWeight(item.borra || 0),
        formatWeight(item.prod || 0),
        `${item.totalVolumes || 0} vols`,
      ];
    });

    return {
      headers: ['Data', 'Eco B Prod. (Kg)', 'Eco B Manut. (Kg)', 'Resíduo Borra (Kg)', 'Produção Líquida (Kg)', 'Volumes'],
      rows,
      totalsRow: ['TOTAL DO PERÍODO', formatWeight(totEcoBP), formatWeight(totEcoBM), formatWeight(totBorra), formatWeight(totProd), `${totVols} vols`],
    };
  }

  if (chartType === 'bi-chart-scatter') {
    const rows = data.map((item) => {
      const wasteRatio = item.prod + item.wastes > 0 ? ((item.wastes / (item.prod + item.wastes)) * 100).toFixed(2) : '0,00';
      return [
        item.name,
        formatWeight(item.prod || 0),
        formatWeight(item.wastes || 0),
        `${wasteRatio}%`,
        formatMinutes(item.stopsProcess || 0),
      ];
    });

    return {
      headers: ['Operador', 'Produção Líquida (Kg)', 'Desperdício Total (Kg)', 'Índice de Perda (%)', 'Paradas de Processo'],
      rows,
    };
  }

  if (chartType === 'bi-chart-stacked') {
    const groupName = extraInfo.groupBy === 'operator' ? 'Operador' : 'Linha / Equipamento';
    const rows = data.map((item) => [
      item.name,
      `${item.manutPct || 0}%`,
      `${item.procPct || 0}%`,
      `${item.outrosPct || 0}%`,
      formatMinutes(item.totalMin || 0),
    ]);

    return {
      headers: [groupName, 'Manutenção (%)', 'Processo (%)', 'Outros (%)', 'Tempo Total Parado'],
      rows,
    };
  }

  if (chartType === 'bi-chart-dynamic') {
    const metricLabel = extraInfo.metricLabel || 'Valor';
    const rows = data.map((item, idx) => [
      `#${idx + 1}`,
      item.name,
      item.value !== undefined ? (typeof item.value === 'number' ? item.value.toLocaleString('pt-BR') : String(item.value)) : '-',
    ]);

    return {
      headers: ['Posição', 'Entidade / Item', metricLabel],
      rows,
    };
  }

  if (chartType === 'ribbon-chart-composed') {
    let totTipo1 = 0, totTipo2 = 0, totLixoKg = 0, totProd = 0, totRolls = 0;
    const rows = data.map((item) => {
      totTipo1 += item.tipo1 || 0;
      totTipo2 += item.tipo2 || 0;
      totLixoKg += item.residuoWeight || 0;
      totProd += item.prod || 0;
      totRolls += item.rollsCount || 0;
      const dateStr = item.date ? item.date.split('-').reverse().join('/') : item.label || '';
      return [
        dateStr,
        Number(item.rollsCount || 0).toLocaleString('pt-BR'),
        formatM2(item.tipo1 || 0),
        formatM2(item.tipo2 || 0),
        formatWeight(item.residuoWeight || 0),
        formatM2(item.prod || 0),
      ];
    });

    return {
      headers: ['Data', 'Rolos Cortados', 'Não Conf. Tipo 1 (m²)', 'Não Conf. Tipo 2 (m²)', 'Lixo (Kg)', 'Produção Líquida (m²)'],
      rows,
      totalsRow: ['TOTAL DO PERÍODO', `${totRolls.toLocaleString('pt-BR')} un`, formatM2(totTipo1), formatM2(totTipo2), formatWeight(totLixoKg), formatM2(totProd)],
    };
  }

  if (chartType === 'ribbon-chart-scatter') {
    const rows = data.map((item: any) => [
      item.name || '-',
      item.machine || '-',
      formatM2(item.prod || 0),
      formatWeight(item.wastes || 0),
      formatMinutes(item.stopsProcess || 0),
    ]);

    return {
      headers: ['Operador', 'Máquina', 'Produção Líquida (m²)', 'Lixo Total (Kg)', 'Tempo Parado'],
      rows,
    };
  }

  if (chartType === 'ribbon-chart-stacked') {
    const groupName = extraInfo.groupBy === 'operator' ? 'Operador' : 'Máquina';
    const rows = data.map((item: any) => [
      item.name || '-',
      `${item.manutPct || 0}%`,
      `${item.procPct || 0}%`,
      `${item.outrosPct || 0}%`,
    ]);

    return {
      headers: [groupName, 'Manutenção (%)', 'Processo (%)', 'Outros (%)'],
      rows,
    };
  }

  if (chartType === 'ribbon-chart-prod') {
    let sumG = 0, sumL = 0, sumW = 0, sumT = 0;
    const rows = data.map((item) => {
      sumG += item.ghezzeProd || 0;
      sumL += item.lintechProd || 0;
      sumW += item.wutecProd || 0;
      sumT += item.totalProd || 0;
      const dateStr = item.date ? item.date.split('-').reverse().join('/') : item.label || '';
      return [dateStr, formatM2(item.ghezzeProd || 0), formatM2(item.lintechProd || 0), formatM2(item.wutecProd || 0), formatM2(item.totalProd || 0)];
    });

    return {
      headers: ['Data', 'Ghezzi (m²)', 'Lintech (m²)', 'Wultec (m²)', 'Total Produzido (m²)'],
      rows,
      totalsRow: ['TOTAL', formatM2(sumG), formatM2(sumL), formatM2(sumW), formatM2(sumT)],
    };
  }

  if (chartType === 'ribbon-chart-waste') {
    let sumG = 0, sumL = 0, sumW = 0, sumT = 0;
    const rows = data.map((item) => {
      sumG += item.ghezzeWaste || 0;
      sumL += item.lintechWaste || 0;
      sumW += item.wutecWaste || 0;
      sumT += item.totalWaste || 0;
      const dateStr = item.date ? item.date.split('-').reverse().join('/') : item.label || '';
      return [dateStr, formatWeight(item.ghezzeWaste || 0), formatWeight(item.lintechWaste || 0), formatWeight(item.wutecWaste || 0), formatWeight(item.totalWaste || 0)];
    });

    return {
      headers: ['Data', 'Ghezzi (Kg)', 'Lintech (Kg)', 'Wultec (Kg)', 'Total Descarte (Kg)'],
      rows,
      totalsRow: ['TOTAL', formatWeight(sumG), formatWeight(sumL), formatWeight(sumW), formatWeight(sumT)],
    };
  }

  if (chartType === 'stops-motifs-card') {
    const rows: string[][] = [];
    let grandTotalMin = 0;
    data.forEach((entry: any) => {
      const mach = Array.isArray(entry) ? entry[0] : entry?.machine || '-';
      const info = Array.isArray(entry) ? entry[1] : entry;
      const motifs = info?.motifs || [];
      motifs.forEach((m: any) => {
        grandTotalMin += m.min || 0;
        const dateStr = m.date ? m.date.split('-').reverse().join('/') : '-';
        rows.push([
          String(mach),
          dateStr,
          m.type || 'Geral',
          formatMinutes(m.min || 0),
          m.reason ? (m.reason.length > 45 ? m.reason.substring(0, 42) + '...' : m.reason) : '-',
          m.operator || '-',
        ]);
      });
    });

    return {
      headers: ['Máquina', 'Data', 'Tipo', 'Duração', 'Motivo da Parada', 'Operador'],
      rows: rows.slice(0, 35),
      totalsRow: ['TOTAL ACUMULADO', '-', '-', formatMinutes(grandTotalMin), `${rows.length} apontamentos`, '-'],
    };
  }

  return null;
}

/**
 * Draws the official landscape header for Gestão à Vista (A4 Paisagem: 297 x 210 mm)
 */
function drawLandscapeHeader(doc: jsPDF, details: LandscapeChartExportDetails, pageNum: number, totalPages: number) {
  const pageWidth = 297;
  const startX = 10;
  const contentWidth = pageWidth - startX * 2; // 277 mm

  // Barra superior decorativa verde/azul
  doc.setFillColor(...PALETTE.blueBrand);
  doc.rect(startX, 8, contentWidth, 2.5, 'F');

  // Logotipo / Título da Empresa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...PALETTE.navyDark);
  doc.text('MANUPACKAGING', startX, 17.5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PALETTE.slateMuted);
  doc.text('QUADRO DE GESTÃO À VISTA DA PRODUÇÃO • FITAS & AMAZÔNIA', startX, 22);

  // Título do Indicador em destaque
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...PALETTE.blueBrand);
  doc.text(details.title.toUpperCase(), pageWidth - startX, 17.5, { align: 'right' });

  // Metadados do período e filtros
  const filters = details.extraInfo?.filters || {};
  const metaParts = [
    `📅 Ref: ${details.period || 'Mês Vigente'}`,
    filters.machine ? `⚙️ Máq: ${filters.machine}` : null,
    filters.operator ? `👤 Oper: ${filters.operator}` : null,
    filters.shift ? `🕒 Turno: ${filters.shift}` : null,
    `🕒 Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    `Pág ${pageNum}/${totalPages}`,
  ].filter(Boolean);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...PALETTE.slateMuted);
  doc.text(metaParts.join('   |   '), pageWidth - startX, 22, { align: 'right' });

  // Linha divisória
  doc.setDrawColor(...PALETTE.border);
  doc.setLineWidth(0.3);
  doc.line(startX, 25, startX + contentWidth, 25);
}

/**
 * Draws the official landscape footer
 */
function drawLandscapeFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageWidth = 297;
  const pageHeight = 210;
  const startX = 10;
  const contentWidth = pageWidth - startX * 2;
  const footerY = pageHeight - 7;

  doc.setDrawColor(...PALETTE.border);
  doc.setLineWidth(0.3);
  doc.line(startX, footerY - 2.5, startX + contentWidth, footerY - 2.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...PALETTE.slateMuted);
  doc.text('MANUPACKAGING FITAS & AMAZÔNIA • IMPRESSÃO PARA QUADRO DE GESTÃO À VISTA (A4 HORIZONTAL)', startX, footerY + 1);
  doc.text(`Documento Operacional Oficial • Pág ${pageNum} de ${totalPages}`, pageWidth - startX, footerY + 1, { align: 'right' });
}

/**
 * Generates and downloads the Landscape / Horizontal PDF specifically designed
 * to be printed and inserted into acrylic holders on the Gestão à Vista wall board.
 */
export async function downloadChartAsLandscapePDF(details: LandscapeChartExportDetails): Promise<boolean> {
  const { id, title, period = new Date().toISOString().slice(0, 7) } = details;

  // Prioritize active fullscreen chart container if visible
  let targetElement = document.getElementById(id);
  const fsModal = document.getElementById('fullscreen-chart-modal-body') || document.getElementById('ribbon-fullscreen-chart-modal-body');
  if (fsModal && fsModal.offsetParent !== null) {
    targetElement = fsModal;
  }

  if (!targetElement) {
    console.error(`[downloadChartAsLandscapePDF] Elemento com ID "${id}" não encontrado no DOM.`);
    return false;
  }

  // Hide interactive buttons during capture
  const actionButtons = targetElement.querySelectorAll<HTMLElement>(
    '.chart-download-btn, [data-no-download="true"], button[title*="Baixar"], button[title*="Download"], button[title*="Visualizar em Tela Cheia"], button[title*="Fechar"], button[title*="Exclusivo"]'
  );
  const hiddenBtnPrevDisplay = new Map<HTMLElement, string>();
  actionButtons.forEach((btn) => {
    hiddenBtnPrevDisplay.set(btn, btn.style.display);
    btn.style.display = 'none';
  });

  try {
    // 1. Capture the chart at high resolution (scale 2.5)
    const canvas = await html2canvas(targetElement, {
      backgroundColor: '#ffffff',
      scale: 2.5,
      logging: false,
      useCORS: true,
      allowTaint: true,
      onclone: (clonedDoc) => {
        try {
          const styleElements = clonedDoc.querySelectorAll('style');
          styleElements.forEach((style) => {
            if (style.textContent && (style.textContent.includes('oklch') || style.textContent.includes('color-mix'))) {
              style.textContent = style.textContent
                .replace(/oklch\([^)]+\)/g, 'rgb(100, 116, 139)')
                .replace(/color-mix\([^)]+\)/g, 'rgb(100, 116, 139)');
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
          clonedEl.style.boxShadow = 'none';
          clonedEl.style.border = 'none';
          clonedEl.style.padding = '8px';
        }
      },
    });

    const chartImgData = canvas.toDataURL('image/png');
    if (!chartImgData || chartImgData === 'data:,') {
      throw new Error('Canvas vazio retornado ao capturar o gráfico.');
    }

    // 2. CRITICAL: A4 LANDSCAPE (HORIZONTAL) = 297mm x 210mm
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 297;
    const startX = 10;
    const contentWidth = pageWidth - startX * 2; // 277 mm wide!

    const kpiCards = computeHeaderKPIs(details);
    const tableData = buildAnalyticalTable(details);

    const hasMultiPages = Boolean(tableData && tableData.rows.length > 5);
    const totalPages = hasMultiPages ? 2 : 1;

    // --- PÁGINA 1: QUADRO DE GESTÃO À VISTA ---
    drawLandscapeHeader(doc, details, 1, totalPages);
    drawLandscapeFooter(doc, 1, totalPages);

    // 4 CARDS DE KPI EXECUTIVOS (Y: 28 a 43 mm, Altura: 15 mm)
    const kpiY = 28;
    const kpiH = 15;
    const kpiGap = 3;
    const numCards = kpiCards.length;
    const cardW = (contentWidth - (numCards - 1) * kpiGap) / numCards;

    kpiCards.forEach((kpi, idx) => {
      const cX = startX + idx * (cardW + kpiGap);

      // Card Background
      doc.setFillColor(...kpi.bg);
      doc.setDrawColor(...PALETTE.border);
      doc.setLineWidth(0.3);
      doc.roundedRect(cX, kpiY, cardW, kpiH, 2, 2, 'FD');

      // Top colored indicator bar
      doc.setFillColor(...kpi.color);
      doc.roundedRect(cX, kpiY, cardW, 1, 0.5, 0.5, 'F');

      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.8);
      doc.setTextColor(...PALETTE.slateMuted);
      doc.text(kpi.label, cX + 3, kpiY + 4.5);

      // Big Bold Value (visível à distância no acrílico)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...kpi.color);
      doc.text(kpi.value, cX + 3, kpiY + 9.5);

      // Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.setTextColor(...PALETTE.navyMedium);
      const truncatedSub = kpi.sub.length > 38 ? kpi.sub.substring(0, 36) + '...' : kpi.sub;
      doc.text(truncatedSub, cX + 3, kpiY + 13);
    });

    // GRÁFICO GIGANTE EM FORMATO HORIZONTAL (Y: 46 a 148 mm, Altura: 102 mm!)
    const chartY = 46;
    const chartH = tableData && tableData.rows.length <= 5 ? 88 : 100;

    // Moldura branca elegante para o gráfico
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...PALETTE.border);
    doc.setLineWidth(0.4);
    doc.roundedRect(startX, chartY, contentWidth, chartH, 2.5, 2.5, 'FD');

    // Imagem do gráfico ocupando toda a largura horizontal útil
    doc.addImage(chartImgData, 'PNG', startX + 2, chartY + 2, contentWidth - 4, chartH - 4);

    // TABELA INFERIOR / MINI-RESUMO (Y: chartY + chartH + 3.5)
    const tableStartY = chartY + chartH + 3.5;

    if (tableData && tableData.rows.length <= 5) {
      // Tabela cabe diretamente na Página 1
      autoTable(doc, {
        head: [tableData.headers],
        body: tableData.totalsRow ? [...tableData.rows, tableData.totalsRow] : tableData.rows,
        startY: tableStartY,
        margin: { left: startX, right: startX },
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 6.8,
          cellPadding: 1.6,
          textColor: [15, 23, 42],
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: PALETTE.navyMedium,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.2,
          halign: 'left',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didParseCell: (hookData) => {
          if (tableData.totalsRow && hookData.section === 'body' && hookData.row.index === tableData.rows.length) {
            hookData.cell.styles.fillColor = [240, 253, 244]; // Destaque verde suave
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.textColor = PALETTE.emerald;
          }
        },
      });
    } else if (tableData && tableData.rows.length > 5) {
      // Mini-resumo na Página 1 (visível na folha principal)
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...PALETTE.border);
      doc.setLineWidth(0.3);
      doc.roundedRect(startX, tableStartY, contentWidth, 38, 2, 2, 'FD');

      // Título da faixa
      doc.setFillColor(...PALETTE.navyDark);
      doc.roundedRect(startX, tableStartY, contentWidth, 6, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      doc.text('RESUMO CONSOLIDADO • LEGENDA ANALÍTICA COMPLETA NA PÁGINA 2', startX + 3.5, tableStartY + 4.2);

      // Amostra dos 3 primeiros registros e totais
      const sampleRows = tableData.rows.slice(0, 3);
      if (tableData.totalsRow) sampleRows.push(tableData.totalsRow);

      autoTable(doc, {
        head: [tableData.headers],
        body: sampleRows,
        startY: tableStartY + 6,
        margin: { left: startX, right: startX },
        theme: 'plain',
        styles: {
          font: 'helvetica',
          fontSize: 6.5,
          cellPadding: 1.4,
          textColor: [30, 41, 59],
        },
        headStyles: {
          textColor: PALETTE.slateMuted,
          fontStyle: 'bold',
          fontSize: 6.5,
        },
        didParseCell: (hookData) => {
          if (tableData.totalsRow && hookData.section === 'body' && hookData.row.index === sampleRows.length - 1) {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.textColor = PALETTE.emerald;
          }
        },
      });

      // --- PÁGINA 2: TABELA ANALÍTICA DETALHADA EM FORMATO HORIZONTAL ---
      doc.addPage('a4', 'landscape');
      drawLandscapeHeader(doc, details, 2, totalPages);
      drawLandscapeFooter(doc, 2, totalPages);

      // Título da página 2
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...PALETTE.navyDark);
      doc.text(`DETALHAMENTO ANALÍTICO CRONOLÓGICO • ${title.toUpperCase()}`, startX, 32);

      autoTable(doc, {
        head: [tableData.headers],
        body: tableData.totalsRow ? [...tableData.rows, tableData.totalsRow] : tableData.rows,
        startY: 36,
        margin: { left: startX, right: startX, bottom: 15 },
        theme: 'grid',
        styles: {
          font: 'helvetica',
          fontSize: 6.8,
          cellPadding: 1.8,
          textColor: [15, 23, 42],
          lineColor: [226, 232, 240],
          lineWidth: 0.2,
        },
        headStyles: {
          fillColor: PALETTE.navyMedium,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.2,
          halign: 'left',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        didParseCell: (hookData) => {
          if (tableData.totalsRow && hookData.section === 'body' && hookData.row.index === tableData.rows.length) {
            hookData.cell.styles.fillColor = [240, 253, 244];
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.textColor = PALETTE.emerald;
          }
        },
        didDrawPage: (hookData) => {
          if (hookData.pageNumber > 1) {
            drawLandscapeHeader(doc, details, hookData.pageNumber, totalPages);
            drawLandscapeFooter(doc, hookData.pageNumber, totalPages);
          }
        },
      });
    }

    // 3. Salva com nome limpo e descritivo
    const cleanTitle = title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_');
    const fileName = `Gestao_a_Vista_${cleanTitle}_${period}.pdf`;

    doc.save(fileName);
    return true;
  } catch (err) {
    console.error('[downloadChartAsLandscapePDF] Erro ao exportar PDF horizontal:', err);
    alert('Não foi possível gerar o PDF em formato horizontal. Por favor, tente novamente.');
    return false;
  } finally {
    // Restaura exibição dos botões na tela
    actionButtons.forEach((btn) => {
      btn.style.display = hiddenBtnPrevDisplay.get(btn) ?? '';
    });
  }
}
