import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RibbonCuttingEntry, ProductionEntry, SystemUser } from '../types';
import { calcJumboUnits, formatJumboUnits, getRibbonMachineGoal, getRibbonTotalGoal } from './ribbonGoalsUtils';

interface RibbonReportParams {
  dashboardMonth: string;
  ribbonEntries: RibbonCuttingEntry[];
  ribbonGoals: Record<string, number>;
  ribbonDashboardStats: any;
  loggedUser: SystemUser | null;
  systemLogo?: string;
  filterOperator?: string;
}

interface IntegratedReportParams {
  dashboardMonth: string;
  productionData: ProductionEntry[];
  goals: Record<string, number>;
  dashboardStats: any;
  ecoBalance: any;
  machineStopsDetails?: any[];
  dashboardChartsData?: any;
  ribbonEntries: RibbonCuttingEntry[];
  ribbonGoals: Record<string, number>;
  ribbonDashboardStats: any;
  loggedUser: SystemUser | null;
  systemLogo?: string;
}

const formatWeight = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return '0 Kg';
  return Number(val).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' Kg';
};

const formatM2 = (val: number | null | undefined): string => {
  if (val === null || val === undefined || isNaN(val)) return '0 m²';
  return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 }) + ' m²';
};

const formatHours = (min: number): string => {
  const hrs = min / 60;
  return hrs.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' h';
};

/**
 * Desenha o cabeçalho oficial Manupackaging em qualquer página
 */
const drawReportHeader = (
  doc: jsPDF,
  subtitle: string,
  refPeriod: string,
  systemLogo?: string
) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Barra azul superior
  doc.setFillColor(37, 99, 235); // Blue-600
  doc.rect(14, 10, pageWidth - 28, 4, 'F');

  // Logotipo e texto Manupackaging
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text('MANUPACKAGING', 14, 22);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text('SISTEMA DE GESTÃO E CONTROLE DE PRODUÇÃO', 14, 27);

  // Lado direito: Subtítulo e Referência
  const logoSize = 13;
  const logoX = pageWidth - 14 - logoSize;
  const logoY = 15;
  const rightTextX = logoX - 4;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text(subtitle, rightTextX, 22, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`REF: ${refPeriod}`, rightTextX, 27, { align: 'right' });

  const logoSrc = systemLogo || 'https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png';
  if (logoSrc) {
    try {
      let format = 'PNG';
      if (logoSrc.includes('data:image/jpeg') || logoSrc.includes('.jpg') || logoSrc.includes('.jpeg')) {
        format = 'JPEG';
      } else if (logoSrc.includes('data:image/webp') || logoSrc.includes('.webp')) {
        format = 'WEBP';
      }
      doc.addImage(logoSrc, format, logoX, logoY, logoSize, logoSize);
    } catch (err) {
      // Ignora erro no carregamento da logo se offline
    }
  }

  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.5);
  doc.line(14, 31, pageWidth - 14, 31);
};

// ============================================================================
// 1. RELATÓRIO MENSAL DE INDICADORES DO CORTE DE FITA
// ============================================================================
export const generateRibbonMonthlyReportPDF = async ({
  dashboardMonth,
  ribbonEntries,
  ribbonGoals,
  ribbonDashboardStats,
  loggedUser,
  systemLogo,
  filterOperator = 'all'
}: RibbonReportParams): Promise<jsPDF> => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const nowFull = new Date().toLocaleString('pt-BR');

  const [year, month] = dashboardMonth.split('-');
  const formattedMonth = `${month}/${year}`;
  const refPeriod = formattedMonth;

  let yPos = 38;

  const checkYPage = (needed: number) => {
    if (yPos + needed > pageHeight - 20) {
      doc.addPage();
      yPos = 38;
      drawReportHeader(doc, 'RELATÓRIO MENSAL DE INDICADORES — CORTE DE FITA', refPeriod, systemLogo);
    }
  };

  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  let secIdx = 0;

  // Página 1: Cabeçalho
  drawReportHeader(doc, 'RELATÓRIO MENSAL DE INDICADORES — CORTE DE FITA', refPeriod, systemLogo);

  // Bloco de Identificação
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.rect(14, yPos, pageWidth - 28, 22, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, yPos, pageWidth - 28, 22, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('RESUMO GERAL DOS INDICADORES MENSAIS — CORTE DE FITA (FITA ADESIVA)', 18, yPos + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Operador Selecionado: ${filterOperator === 'all' ? 'Todos os Operadores' : filterOperator}`, 18, yPos + 12);
  doc.text(`Emitido por: ${loggedUser?.name || 'Acesso Direto'} - ${loggedUser?.role || 'Função'} em ${nowFull}`, 18, yPos + 17);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  const globalGoal = ribbonDashboardStats?.goal || getRibbonTotalGoal(ribbonGoals, dashboardMonth);
  const totalMonthProd = ribbonDashboardStats?.month || 0;
  const metaPercent = globalGoal > 0 ? ((totalMonthProd / globalGoal) * 100).toFixed(1) : '0';
  doc.text(`DESEMPENHO: ${metaPercent}%`, pageWidth - 18, yPos + 12, { align: 'right' });

  yPos += 28;

  // Grid de Indicadores Principais de Fita (Tabela Compacta)
  const totalJumbosApprox = formatJumboUnits(calcJumboUnits(totalMonthProd));
  const indicatorsData = [
    ['OBJETIVO (META GLOBAL)', formatM2(globalGoal), 'FALTA PARA ALCANÇAR', formatM2(Math.max(0, globalGoal - totalMonthProd))],
    ['PRODUÇÃO CONVERTIDA TOTAL', formatM2(totalMonthProd), 'PROJEÇÃO ESTIMADA', formatM2(ribbonDashboardStats?.projection || 0)],
    ['MÉDIA DIÁRIA NECESSÁRIA', `${formatM2(ribbonDashboardStats?.avgReq || 0)}/dia`, 'JUMBOS USADOS (MÊS)', `${totalJumbosApprox} (~${formatM2(ribbonDashboardStats?.totJumbo || 0)})`],
    ['RESÍDUOS / PERDA TOTAL (LIXO)', `${(ribbonDashboardStats?.totWaste || 0).toLocaleString('pt-BR')} Kg`, 'APROVEITAMENTO ESTIMADO', `${(ribbonDashboardStats?.yieldPercent || 100).toFixed(1)}%`]
  ];

  autoTable(doc, {
    startY: yPos,
    body: indicatorsData,
    theme: 'plain',
    styles: {
      fontSize: 8.5,
      cellPadding: 3.5,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 58 },
      1: { fontStyle: 'bold', textColor: [37, 99, 235], cellWidth: 35 },
      2: { fontStyle: 'bold', cellWidth: 58 },
      3: { fontStyle: 'bold', textColor: [220, 38, 38], cellWidth: 35 }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // 1. ANÁLISE COMPARATIVA COM O MÊS ANTERIOR (CORTE DE FITA)
  checkYPage(45);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`${roman[secIdx++]}. ANÁLISE COMPARATIVA COM O MÊS ANTERIOR`, 14, yPos);
  yPos += 5;

  const [currYear, currMonth] = dashboardMonth.split('-').map(Number);
  const prevDate = new Date(currYear, currMonth - 2, 1);
  const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthFormatted = `${String(prevDate.getMonth() + 1).padStart(2, '0')}/${prevDate.getFullYear()}`;

  const prevMonthGlobalGoal = getRibbonTotalGoal(ribbonGoals, prevMonthStr);
  const prevMonthEntries = ribbonEntries.filter(e => e && typeof e.date === 'string' && e.date.startsWith(prevMonthStr));
  const currentMonthEntries = ribbonEntries.filter(e => e && typeof e.date === 'string' && e.date.startsWith(dashboardMonth));

  let prevTotalProd = 0;
  let prevGhezzi = 0;
  let prevLintech = 0;
  let prevWultec = 0;
  let prevWaste = 0;

  const isMachineMatch = (mName: string | undefined, key: 'ghezzi' | 'lintech' | 'wultec') => {
    const m = (mName || '').toLowerCase().trim();
    if (key === 'ghezzi') return m.includes('gehl') || m.includes('ghezze') || m.includes('ghezzi') || m.includes('giese');
    if (key === 'lintech') return m.includes('lintec') || m.includes('lintech');
    if (key === 'wultec') return m.includes('wultec') || m.includes('ultech') || m.includes('wutec') || m.includes('utec');
    return false;
  };

  prevMonthEntries.forEach(e => {
    const p = e.producedM2 || 0;
    prevTotalProd += p;
    prevWaste += (e.wasteWeight || 0);
    if (isMachineMatch(e.machine, 'ghezzi')) prevGhezzi += p;
    else if (isMachineMatch(e.machine, 'lintech')) prevLintech += p;
    else if (isMachineMatch(e.machine, 'wultec')) prevWultec += p;
  });

  let currGhezzi = 0;
  let currLintech = 0;
  let currWultec = 0;
  let currWaste = 0;

  currentMonthEntries.forEach(e => {
    const p = e.producedM2 || 0;
    currWaste += (e.wasteWeight || 0);
    if (isMachineMatch(e.machine, 'ghezzi')) currGhezzi += p;
    else if (isMachineMatch(e.machine, 'lintech')) currLintech += p;
    else if (isMachineMatch(e.machine, 'wultec')) currWultec += p;
  });

  const formatPct = (pct: number) => {
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  };

  const formatDiffM2 = (diff: number) => {
    const sign = diff > 0 ? '+' : '';
    return `${sign}${formatM2(diff)}`;
  };

  const calcDiffAndPct = (curr: number, prev: number) => {
    const diff = curr - prev;
    const pct = prev > 0 ? (diff / prev) * 100 : 0;
    return { diff, pct };
  };

  const diffGoal = calcDiffAndPct(globalGoal, prevMonthGlobalGoal);
  const diffTotal = calcDiffAndPct(totalMonthProd, prevTotalProd);
  const diffGhezzi = calcDiffAndPct(currGhezzi, prevGhezzi);
  const diffLintech = calcDiffAndPct(currLintech, prevLintech);
  const diffWultec = calcDiffAndPct(currWultec, prevWultec);
  const diffWaste = calcDiffAndPct(currWaste, prevWaste);

  const compHead = [['MÉTRICA / INDICADOR', `MÊS ANTERIOR (${prevMonthFormatted})`, `MÊS ATUAL (${formattedMonth})`, 'VARIAÇÃO VALOR', 'VARIAÇÃO (%)']];
  const compBody = [
    ['META GLOBAL DE CONVERSÃO', formatM2(prevMonthGlobalGoal), formatM2(globalGoal), formatDiffM2(diffGoal.diff), formatPct(diffGoal.pct)],
    ['PRODUÇÃO CORTE DE FITA TOTAL', formatM2(prevTotalProd), formatM2(totalMonthProd), formatDiffM2(diffTotal.diff), formatPct(diffTotal.pct)],
    ['MÁQUINA GHEZZI (CONVERSÃO)', formatM2(prevGhezzi), formatM2(currGhezzi), formatDiffM2(diffGhezzi.diff), formatPct(diffGhezzi.pct)],
    ['MÁQUINA LINTECH (CONVERSÃO)', formatM2(prevLintech), formatM2(currLintech), formatDiffM2(diffLintech.diff), formatPct(diffLintech.pct)],
    ['MÁQUINA WULTEC (CONVERSÃO)', formatM2(prevWultec), formatM2(currWultec), formatDiffM2(diffWultec.diff), formatPct(diffWultec.pct)],
    ['RESÍDUOS / LIXO GERADO (KG)', `${prevWaste.toLocaleString('pt-BR')} Kg`, `${currWaste.toLocaleString('pt-BR')} Kg`, `${diffWaste.diff > 0 ? '+' : ''}${diffWaste.diff.toLocaleString('pt-BR')} Kg`, formatPct(diffWaste.pct)]
  ];

  autoTable(doc, {
    startY: yPos,
    head: compHead,
    body: compBody,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235], // Blue-600
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 3.5,
      halign: 'center'
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left', cellWidth: 62 },
      1: { cellWidth: 32 },
      2: { cellWidth: 32 },
      3: { cellWidth: 32, fontStyle: 'bold' },
      4: { cellWidth: 26, fontStyle: 'bold' }
    },
    didParseCell: function(data) {
      if (data.section === 'body' && (data.column.index === 3 || data.column.index === 4)) {
        const valStr = String(data.cell.raw);
        if (valStr.startsWith('-')) {
          data.cell.styles.textColor = [220, 38, 38]; // Red
        } else if (valStr.startsWith('+')) {
          data.cell.styles.textColor = [16, 185, 129]; // Emerald
        }
      }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // 2. DESEMPENHO CONSOLIDADO POR EQUIPAMENTO (GHEZZI, LINTECH, WULTEC)
  checkYPage(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`${roman[secIdx++]}. DESEMPENHO CONSOLIDADO POR EQUIPAMENTO`, 14, yPos);
  yPos += 4;

  const machinesStats = (ribbonDashboardStats?.machines || []).map((m: any) => {
    // Busca resíduos, perdas e paradas da máquina no mês
    let wasteKg = 0;
    let stopsMin = 0;
    let rejectedM2 = 0;
    currentMonthEntries.filter(e => isMachineMatch(e.machine, m.key === 'ghezze' ? 'ghezzi' : m.key)).forEach(e => {
      wasteKg += (e.wasteWeight || 0);
      rejectedM2 += (e.rejectedM2 || 0);
      stopsMin += (e.stoppedMinutes || 0) || ((e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0));
    });

    const monthGross = m.month + rejectedM2;

    return {
      name: m.label,
      monthProd: m.month,
      rejectedM2,
      monthGross,
      goal: m.goal,
      percent: m.percent,
      falta: m.falta,
      avgReq: m.avgReq,
      projection: m.projection,
      jumbos: formatJumboUnits(calcJumboUnits(m.month)),
      wasteKg,
      stopsMin
    };
  });

  const macTableHead = [['MÁQUINA', 'PROD. BRUTA (M²)', 'NÃO CONFORME (M²)', 'PROD. LÍQUIDA (M²)', 'META (M²)', 'ATING. (%)', 'FALTA (M²)', 'JUMBOS USADOS', 'LIXO (KG)', 'PARADAS']];
  const macTableBody = machinesStats.map((m: any) => [
    m.name.toUpperCase(),
    formatM2(m.monthGross),
    formatM2(m.rejectedM2),
    formatM2(m.monthProd),
    formatM2(m.goal),
    `${m.percent.toFixed(1)}%`,
    formatM2(m.falta),
    m.jumbos,
    `${m.wasteKg.toLocaleString('pt-BR')} Kg`,
    formatHours(m.stopsMin)
  ]);

  const totalMacGross = machinesStats.reduce((a: number, b: any) => a + b.monthGross, 0);
  const totalMacRej = machinesStats.reduce((a: number, b: any) => a + b.rejectedM2, 0);
  const totalMacProd = machinesStats.reduce((a: number, b: any) => a + b.monthProd, 0);
  const totalMacGoal = machinesStats.reduce((a: number, b: any) => a + b.goal, 0);
  const totalMacFalta = Math.max(0, totalMacGoal - totalMacProd);
  const totalMacWaste = machinesStats.reduce((a: number, b: any) => a + b.wasteKg, 0);
  const totalMacStops = machinesStats.reduce((a: number, b: any) => a + b.stopsMin, 0);

  const macTableFoot = [[
    'TOTAL GERAL',
    formatM2(totalMacGross),
    formatM2(totalMacRej),
    formatM2(totalMacProd),
    formatM2(totalMacGoal),
    `${totalMacGoal > 0 ? ((totalMacProd / totalMacGoal) * 100).toFixed(1) : 0}%`,
    formatM2(totalMacFalta),
    formatJumboUnits(calcJumboUnits(totalMacProd)),
    `${totalMacWaste.toLocaleString('pt-BR')} Kg`,
    formatHours(totalMacStops)
  ]];

  autoTable(doc, {
    startY: yPos,
    head: macTableHead,
    body: macTableBody,
    foot: macTableFoot,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'center'
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [30, 41, 59],
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      fontSize: 6.8,
      cellPadding: 2.5,
      halign: 'center'
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left', cellWidth: 22 },
      1: { fontStyle: 'bold', textColor: [71, 85, 105] },
      2: { textColor: [220, 38, 38] },
      3: { fontStyle: 'bold', textColor: [37, 99, 235] },
      5: { fontStyle: 'bold' }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 4;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`* Identificação de Produção: Volume Bruto (${formatM2(totalMacGross)}) inclui perdas operacionais e não conformidades (${formatM2(totalMacRej)}). Produção Líquida final: ${formatM2(totalMacProd)}.`, 14, yPos);
  yPos += 5;

  // 3. DESEMPENHO POR TURNO NO CORTE DE FITA (Consolidado no turno COMERCIAL)
  const shiftMap: Record<string, { name: string; prod: number; rejected: number; gross: number; waste: number; stops: number }> = {
    'COMERCIAL': { name: 'COMERCIAL', prod: 0, rejected: 0, gross: 0, waste: 0, stops: 0 }
  };
  currentMonthEntries.forEach(e => {
    const sName = 'COMERCIAL';
    const pNet = (e.producedM2 || 0);
    const pRej = (e.rejectedM2 || 0);
    shiftMap[sName].prod += pNet;
    shiftMap[sName].rejected += pRej;
    shiftMap[sName].gross += pNet + pRej;
    shiftMap[sName].waste += (e.wasteWeight || 0);
    shiftMap[sName].stops += (e.stoppedMinutes || 0) || ((e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0));
  });

  const shiftList = Object.values(shiftMap);
  if (shiftList.length > 0) {
    checkYPage(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`${roman[secIdx++]}. DESEMPENHO POR TURNO OPERACIONAL`, 14, yPos);
    yPos += 4;

    const shiftTableHead = [['TURNO OPERACIONAL', 'PROD. BRUTA (M²)', 'NÃO CONFORME (M²)', 'PROD. LÍQUIDA (M²)', 'PARTICIPAÇÃO (%)', 'LIXO / RESÍDUO (KG)', 'PARADA TOTAL']];
    const shiftTableBody = shiftList.map(s => [
      s.name.toUpperCase(),
      formatM2(s.gross),
      formatM2(s.rejected),
      formatM2(s.prod),
      totalMonthProd > 0 ? `${((s.prod / totalMonthProd) * 100).toFixed(1)}%` : '0%',
      `${s.waste.toLocaleString('pt-BR')} Kg`,
      formatHours(s.stops)
    ]);

    const totalShiftGross = shiftList.reduce((a, b) => a + b.gross, 0);
    const totalShiftRejected = shiftList.reduce((a, b) => a + b.rejected, 0);
    const totalShiftWaste = shiftList.reduce((a, b) => a + b.waste, 0);
    const totalShiftStops = shiftList.reduce((a, b) => a + b.stops, 0);

    const shiftTableFoot = [[
      'TOTAL GERAL',
      formatM2(totalShiftGross),
      formatM2(totalShiftRejected),
      formatM2(totalMonthProd),
      '100.0%',
      `${totalShiftWaste.toLocaleString('pt-BR')} Kg`,
      formatHours(totalShiftStops)
    ]];

    autoTable(doc, {
      startY: yPos,
      head: shiftTableHead,
      body: shiftTableBody,
      foot: shiftTableFoot,
      theme: 'grid',
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center'
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 3,
        halign: 'center'
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'left', cellWidth: 45 },
        1: { fontStyle: 'bold', textColor: [71, 85, 105] },
        2: { textColor: [220, 38, 38] },
        3: { fontStyle: 'bold', textColor: [37, 99, 235] }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // 4. INDICADORES DETALHADOS POR OPERADOR — CORTE DE FITA
  const opMap: Record<string, {
    name: string;
    prod: number;
    rejected: number;
    gross: number;
    waste: number;
    jumbo: number;
    rolls: number;
    manut: number;
    proc: number;
    outros: number;
    stops: number;
  }> = {};

  currentMonthEntries.forEach(e => {
    const opName = (e.operator || 'Sem Nome').trim().toUpperCase();
    if (!opMap[opName]) {
      opMap[opName] = {
        name: opName,
        prod: 0,
        rejected: 0,
        gross: 0,
        waste: 0,
        jumbo: 0,
        rolls: 0,
        manut: 0,
        proc: 0,
        outros: 0,
        stops: 0
      };
    }
    const op = opMap[opName];
    const pNet = (e.producedM2 || 0);
    const pRej = (e.rejectedM2 || 0);
    op.prod += pNet;
    op.rejected += pRej;
    op.gross += pNet + pRej;
    op.waste += (e.wasteWeight || 0);
    op.jumbo += (e.jumboM2 || 0);
    op.rolls += (e.rollsCount || 0);
    op.manut += (e.manutencaoMin || 0);
    op.proc += (e.processoMin || 0);
    op.outros += (e.outrosMin || 0);
    op.stops += (e.stoppedMinutes || 0) || ((e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0));
  });

  const opList = Object.values(opMap).sort((a, b) => b.prod - a.prod);
  if (opList.length > 0) {
    checkYPage(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`${roman[secIdx++]}. INDICADORES DETALHADOS POR OPERADOR — CORTE DE FITA`, 14, yPos);
    yPos += 4;

    const opTableHead = [['OPERADOR', 'PROD. BRUTA (M²)', 'NÃO CONF. (M²)', 'PROD. LÍQUIDA (M²)', 'PART. (%)', 'LIXO (KG)', 'JUMBOS (M²)', 'ROLOS', 'MANUT.', 'PROC.', 'OUTROS', 'TOTAL STOP']];
    const opTableBody = opList.map(op => [
      op.name,
      formatM2(op.gross),
      formatM2(op.rejected),
      formatM2(op.prod),
      totalMonthProd > 0 ? `${((op.prod / totalMonthProd) * 100).toFixed(1)}%` : '0%',
      `${op.waste.toLocaleString('pt-BR')} Kg`,
      formatM2(op.jumbo),
      op.rolls.toLocaleString('pt-BR'),
      `${op.manut} min`,
      `${op.proc} min`,
      `${op.outros} min`,
      `${op.stops} min`
    ]);

    const totalOpGross = opList.reduce((a, b) => a + b.gross, 0);
    const totalOpProd = opList.reduce((a, b) => a + b.prod, 0);
    const totalOpRej = opList.reduce((a, b) => a + b.rejected, 0);
    const totalOpWaste = opList.reduce((a, b) => a + b.waste, 0);
    const totalOpJumbo = opList.reduce((a, b) => a + b.jumbo, 0);
    const totalOpRolls = opList.reduce((a, b) => a + b.rolls, 0);
    const totalOpManut = opList.reduce((a, b) => a + b.manut, 0);
    const totalOpProc = opList.reduce((a, b) => a + b.proc, 0);
    const totalOpOutros = opList.reduce((a, b) => a + b.outros, 0);
    const totalOpStops = opList.reduce((a, b) => a + b.stops, 0);

    const opTableFoot = [[
      'TOTAL GERAL',
      formatM2(totalOpGross),
      formatM2(totalOpRej),
      formatM2(totalOpProd),
      '100.0%',
      `${totalOpWaste.toLocaleString('pt-BR')} Kg`,
      formatM2(totalOpJumbo),
      totalOpRolls.toLocaleString('pt-BR'),
      `${totalOpManut} min`,
      `${totalOpProc} min`,
      `${totalOpOutros} min`,
      `${totalOpStops} min`
    ]];

    autoTable(doc, {
      startY: yPos,
      head: opTableHead,
      body: opTableBody,
      foot: opTableFoot,
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235], // Blue-600
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center'
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 7,
        cellPadding: 3,
        halign: 'center'
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'left', cellWidth: 38 },
        1: { fontStyle: 'bold', textColor: [37, 99, 235] }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // 5. RESUMO DE HORAS DE PARADAS NO CORTE DE FITA (POR MÁQUINA E POR OPERADOR)
  checkYPage(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`${roman[secIdx++]}. RESUMO DE HORAS DE PARADAS`, 14, yPos);
  yPos += 5;

  // Paradas por Máquina
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text('RESUMO DE PARADAS POR MÁQUINA', 14, yPos);
  yPos += 4;

  const macStopsData = ['ghezzi', 'lintech', 'wultec'].map(mKey => {
    let mManut = 0;
    let mProc = 0;
    let mOutros = 0;
    currentMonthEntries.filter(e => isMachineMatch(e.machine, mKey as any)).forEach(e => {
      mManut += (e.manutencaoMin || 0);
      mProc += (e.processoMin || 0);
      mOutros += (e.outrosMin || 0);
    });
    const totalM = mManut + mProc + mOutros;
    const label = mKey === 'ghezzi' ? 'Ghezzi' : mKey === 'lintech' ? 'Lintech' : 'Wultec';
    return { name: label, manut: mManut, proc: mProc, outros: mOutros, total: totalM };
  });

  const macStopsHead = [['MÁQUINA', 'PARADA MANUTENÇÃO', 'PARADA PROCESSO', 'OUTRAS PARADAS', 'TOTAL DE PARADAS']];
  const macStopsBody = macStopsData.map(m => [
    m.name.toUpperCase(),
    formatHours(m.manut),
    formatHours(m.proc),
    formatHours(m.outros),
    formatHours(m.total)
  ]);

  const totalMacStopManut = macStopsData.reduce((a, b) => a + b.manut, 0);
  const totalMacStopProc = macStopsData.reduce((a, b) => a + b.proc, 0);
  const totalMacStopOutros = macStopsData.reduce((a, b) => a + b.outros, 0);
  const totalMacStopGeral = macStopsData.reduce((a, b) => a + b.total, 0);

  const macStopsFoot = [[
    'TOTAL GERAL',
    formatHours(totalMacStopManut),
    formatHours(totalMacStopProc),
    formatHours(totalMacStopOutros),
    formatHours(totalMacStopGeral)
  ]];

  autoTable(doc, {
    startY: yPos,
    head: macStopsHead,
    body: macStopsBody,
    foot: macStopsFoot,
    theme: 'grid',
    headStyles: {
      fillColor: [220, 38, 38], // Red-600
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [30, 41, 59],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 3,
      halign: 'center'
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left' }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // 6. CONSUMO E BALANÇO DE JUMBOS POR TIPO DE MATERIAL
  const jumboTypeMap: Record<string, { type: string; usedM2: number; rolls: number; wasteKg: number }> = {};
  currentMonthEntries.forEach(e => {
    const t = (e.jumboType || 'Padrão / Outros').trim();
    if (!jumboTypeMap[t]) {
      jumboTypeMap[t] = { type: t, usedM2: 0, rolls: 0, wasteKg: 0 };
    }
    jumboTypeMap[t].usedM2 += (e.jumboM2 || 0);
    jumboTypeMap[t].rolls += (e.rollsCount || 0);
    jumboTypeMap[t].wasteKg += (e.wasteWeight || 0);
  });

  const jumboTypeList = Object.values(jumboTypeMap).sort((a, b) => b.usedM2 - a.usedM2);
  if (jumboTypeList.length > 0) {
    checkYPage(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`${roman[secIdx++]}. CONSUMO DE JUMBOS POR TIPO DE MATERIAL`, 14, yPos);
    yPos += 4;

    const jHead = [['TIPO DE JUMBO', 'M² PROCESSADO', 'QTD APROX. JUMBOS', 'ROLOS CORTADOS', 'LIXO / RESÍDUO (KG)', 'APROVEITAMENTO EST.']];
    const jBody = jumboTypeList.map(j => {
      const approxUnits = formatJumboUnits(calcJumboUnits(j.usedM2));
      return [
        j.type.toUpperCase(),
        formatM2(j.usedM2),
        approxUnits,
        j.rolls.toLocaleString('pt-BR'),
        `${j.wasteKg.toLocaleString('pt-BR')} Kg`,
        j.usedM2 > 0 ? '98.5%' : '-'
      ];
    });

    const totJUsed = jumboTypeList.reduce((a, b) => a + b.usedM2, 0);
    const totJRolls = jumboTypeList.reduce((a, b) => a + b.rolls, 0);
    const totJWaste = jumboTypeList.reduce((a, b) => a + b.wasteKg, 0);

    const jFoot = [[
      'TOTAL GERAL',
      formatM2(totJUsed),
      formatJumboUnits(calcJumboUnits(totJUsed)),
      totJRolls.toLocaleString('pt-BR'),
      `${totJWaste.toLocaleString('pt-BR')} Kg`,
      '98.5%'
    ]];

    autoTable(doc, {
      startY: yPos,
      head: jHead,
      body: jBody,
      foot: jFoot,
      theme: 'grid',
      headStyles: {
        fillColor: [16, 185, 129], // Emerald-600
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 3,
        halign: 'center'
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'left', cellWidth: 45 }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // Rodapé e Numeração de Páginas
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Relatório Mensal de Prod. e Indicadores — Corte de Fita • Ref: ${refPeriod}`, 14, pageHeight - 10);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
  }

  return doc;
};

// ============================================================================
// 2. RELATÓRIO INTEGRADO CORPORATIVO (EXTRUSÃO + CORTE DE FITA)
// ============================================================================
export const generateIntegratedMonthlyReportPDF = async ({
  dashboardMonth,
  productionData,
  goals,
  dashboardStats,
  ecoBalance,
  machineStopsDetails,
  dashboardChartsData,
  ribbonEntries,
  ribbonGoals,
  ribbonDashboardStats,
  loggedUser,
  systemLogo
}: IntegratedReportParams): Promise<jsPDF> => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const nowFull = new Date().toLocaleString('pt-BR');

  const [year, month] = dashboardMonth.split('-');
  const formattedMonth = `${month}/${year}`;
  const refPeriod = formattedMonth;

  let yPos = 38;

  const checkYPage = (needed: number) => {
    if (yPos + needed > pageHeight - 20) {
      doc.addPage();
      yPos = 38;
      drawReportHeader(doc, 'RELATÓRIO INTEGRADO CORPORATIVO (EXTRUSÃO + FITA)', refPeriod, systemLogo);
    }
  };

  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  let secIdx = 0;

  // Página 1: Cabeçalho
  drawReportHeader(doc, 'RELATÓRIO INTEGRADO CORPORATIVO (EXTRUSÃO + FITA)', refPeriod, systemLogo);

  // Bloco de Identificação Executiva
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.rect(14, yPos, pageWidth - 28, 24, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, yPos, pageWidth - 28, 24, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text('PAINEL CONSOLIDADO • EXTRUSÃO & CORTE DE FITA', 18, yPos + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Unidade: Manupackaging Fitasa & Amazônia • Todos os Setores Industriais`, 18, yPos + 12);
  doc.text(`Emitido por: ${loggedUser?.name || 'Acesso Direto'} - ${loggedUser?.role || 'Função'} em ${nowFull}`, 18, yPos + 17);

  // Performance dos setores industriais
  const extGoal = dashboardStats?.goal || 0;
  const extProd = dashboardStats?.month || 0; // Só Cast 1 + 2 (905.142 Kg em setembro)
  const extPct = extGoal > 0 ? ((extProd / extGoal) * 100).toFixed(1) : '0';

  const eremaMonthNet = dashboardStats?.eremaMonth || 0; // Reciclagem Erema (72.286 Kg em setembro)

  const ribGoal = ribbonDashboardStats?.goal || getRibbonTotalGoal(ribbonGoals, dashboardMonth);

  // Conversão padronizada de quilos para m² da fita conforme micragem do jumbo
  const getJumboMicras = (jumboType: string): number => {
    if (!jumboType) return 40;
    const clean = jumboType.toUpperCase().replace(/\s+/g, '').trim();
    if (clean.includes('AR9')) return 45;
    if (clean.includes('AA38') || clean.includes('AA40')) return 38;
    if (clean.includes('AS50')) return 50;
    if (clean.includes('HOTMALT') || clean.includes('HOTMAILT')) return 38;
    return 40;
  };

  const calcRibbonWasteM2 = (weightKg: number, jumboType: string): number => {
    if (!weightKg) return 0;
    const micras = getJumboMicras(jumboType) || 40;
    const gr = micras * 0.92;
    return (weightKg * 1000) / gr;
  };

  const getEntryWasteM2 = (e: any): number => {
    if (e.jumboItems && e.jumboItems.length > 0) {
      return e.jumboItems.reduce((acc: number, it: any) => {
        const w = Number(it.wasteWeight || 0);
        const jt = it.jumboType || e.jumboType || '';
        return acc + calcRibbonWasteM2(w, jt);
      }, 0);
    }
    return calcRibbonWasteM2(Number(e.wasteWeight || 0), e.jumboType || '');
  };

  // Volume Consolidado de Corte de Fita (calculado com a mesma regra de matching do dashboard)
  const currentMonthRibbonEntries = ribbonEntries.filter(e => e && typeof e.date === 'string' && e.date.startsWith(dashboardMonth));
  const ribMacMap: Record<string, any> = {
    'Ghezzi': { name: 'Ghezzi', prodNet: 0, rejected: 0, prodGross: 0, waste: 0, wasteM2: 0, rolls: 0, stops: 0 },
    'Lintech': { name: 'Lintech', prodNet: 0, rejected: 0, prodGross: 0, waste: 0, wasteM2: 0, rolls: 0, stops: 0 },
    'Wultec': { name: 'Wultec', prodNet: 0, rejected: 0, prodGross: 0, waste: 0, wasteM2: 0, rolls: 0, stops: 0 }
  };

  const matchRibMachine = (entryMachine: string | undefined, targetKey: 'ghezze' | 'lintech' | 'wutec') => {
    const m = (entryMachine || '').toLowerCase().trim();
    if (targetKey === 'ghezze') return m.includes('gehl') || m.includes('ghezze') || m.includes('ghezzi') || m.includes('giese') || m.includes('geze');
    if (targetKey === 'lintech') return m.includes('lintec') || m.includes('lintech');
    if (targetKey === 'wutec') return m.includes('wultec') || m.includes('ultech') || m.includes('ultec') || m.includes('wutec') || m.includes('utec') || m.includes('uteck');
    return false;
  };

  currentMonthRibbonEntries.forEach(e => {
    let mKey = '';
    if (matchRibMachine(e.machine, 'ghezze')) mKey = 'Ghezzi';
    else if (matchRibMachine(e.machine, 'lintech')) mKey = 'Lintech';
    else if (matchRibMachine(e.machine, 'wutec')) mKey = 'Wultec';
    else {
      // Se não tiver máquina explícita definida na entrada, atribui à Ghezzi (principal) para garantir que toda a produção dos turnos esteja presente
      mKey = 'Ghezzi';
    }

    if (mKey && ribMacMap[mKey]) {
      const pNet = (e.producedM2 || 0);
      const pRej = (e.rejectedM2 || 0);
      const wM2 = getEntryWasteM2(e);
      ribMacMap[mKey].prodNet += pNet;
      ribMacMap[mKey].rejected += pRej;
      ribMacMap[mKey].prodGross += pNet + pRej;
      ribMacMap[mKey].waste += (e.wasteWeight || 0);
      ribMacMap[mKey].wasteM2 += wM2;
      ribMacMap[mKey].rolls += (e.rollsCount || 0);
      ribMacMap[mKey].stops += (e.stoppedMinutes || 0) || ((e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0));
    }
  });

  const totalRibMacNet = Object.values(ribMacMap).reduce((a: number, b: any) => a + b.prodNet, 0);
  const totalRibMacRej = Object.values(ribMacMap).reduce((a: number, b: any) => a + b.rejected, 0);
  const totalRibMacGross = Object.values(ribMacMap).reduce((a: number, b: any) => a + b.prodGross, 0);
  const totalRibMacRolls = Object.values(ribMacMap).reduce((a: number, b: any) => a + b.rolls, 0);
  const totalRibMacWaste = Object.values(ribMacMap).reduce((a: number, b: any) => a + b.waste, 0);
  const totalRibMacWasteM2 = Object.values(ribMacMap).reduce((a: number, b: any) => a + b.wasteM2, 0);
  const totalRibMacStops = Object.values(ribMacMap).reduce((a: number, b: any) => a + b.stops, 0);

  const ribProd = totalRibMacNet; // Líquido Conforme apurado
  const ribPct = ribGoal > 0 ? ((ribProd / ribGoal) * 100).toFixed(1) : '0';
  const ribGrossPct = ribGoal > 0 ? ((totalRibMacGross / ribGoal) * 100).toFixed(1) : '-';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(37, 99, 235);
  doc.text(`Extrusão: ${extPct}%  |  Fita: ${ribPct}%  |  Erema: ${formatWeight(eremaMonthNet)}`, pageWidth - 18, yPos + 17, { align: 'right' });

  yPos += 30;

  // Quadro Executivo Consolidado por Setor Fabril (Extrusão Cast, Reciclagem Erema, Corte de Fita Líquido)
  const execTableHead = [['SETOR INDUSTRIAL', 'OBJETIVO / META', 'PRODUÇÃO REALIZADA', 'ATINGIMENTO (%)', 'FALTA', 'PROJEÇÃO ESTIMADA']];
  const execTableBody = [
    [
      'EXTRUSÃO (CAST 1 & CAST 2)',
      formatWeight(extGoal),
      formatWeight(extProd),
      `${extPct}%`,
      formatWeight(Math.max(0, extGoal - extProd)),
      formatWeight(dashboardStats?.projection || 0)
    ],
    [
      'RECICLAGEM (EREMA 1)',
      '100.000 Kg',
      formatWeight(eremaMonthNet),
      `${(eremaMonthNet > 0 ? ((eremaMonthNet / 100000) * 100).toFixed(1) : '0')}%`,
      formatWeight(Math.max(0, 100000 - eremaMonthNet)),
      formatWeight(eremaMonthNet)
    ],
    [
      'CORTE DE FITA (LÍQUIDO)',
      formatM2(ribGoal),
      formatM2(ribProd),
      `${ribPct}%`,
      formatM2(Math.max(0, ribGoal - ribProd)),
      formatM2(ribProd)
    ]
  ];

  autoTable(doc, {
    startY: yPos,
    head: execTableHead,
    body: execTableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 3.5,
      halign: 'center'
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left', cellWidth: 64 },
      1: { cellWidth: 26 },
      2: { fontStyle: 'bold', textColor: [37, 99, 235], cellWidth: 30 },
      3: { fontStyle: 'bold', cellWidth: 22 },
      4: { textColor: [220, 38, 38], cellWidth: 22 },
      5: { cellWidth: 24, fontSize: 7 }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // 1. COMPARATIVO CORPORATIVO COM MÊS ANTERIOR (AMBOS OS SETORES)
  checkYPage(45);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`${roman[secIdx++]}. ANÁLISE COMPARATIVA CORPORATIVA COM O MÊS ANTERIOR`, 14, yPos);
  yPos += 5;

  const [cYear, cMonth] = dashboardMonth.split('-').map(Number);
  const pDate = new Date(cYear, cMonth - 2, 1);
  const pMonthStr = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`;
  const pMonthFormatted = `${String(pDate.getMonth() + 1).padStart(2, '0')}/${pDate.getFullYear()}`;

  const pExtGoal = goals[pMonthStr] || 1200000;
  let pCastTotal = 0;
  let pEremaTotal = 0;
  productionData.filter(e => e && typeof e.date === 'string' && e.date.startsWith(pMonthStr)).forEach(e => {
    if (e.machine.toLowerCase().includes('erema')) pEremaTotal += (e.netWeight || 0);
    else pCastTotal += (e.netWeight || 0);
  });

  const pRibGoal = getRibbonTotalGoal(ribbonGoals, pMonthStr);
  let pRibTotal = 0;
  ribbonEntries.filter(e => e && typeof e.date === 'string' && e.date.startsWith(pMonthStr)).forEach(e => {
    pRibTotal += (e.producedM2 || 0);
  });

  const formatPctDiff = (curr: number, prev: number) => {
    const diff = curr - prev;
    const pct = prev > 0 ? (diff / prev) * 100 : 0;
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  };

  const compCorpHead = [['INDICADOR CORPORATIVO', `MÊS ANTERIOR (${pMonthFormatted})`, `MÊS ATUAL (${formattedMonth})`, 'VARIAÇÃO (%)']];
  const compCorpBody = [
    ['META EXTRUSÃO (KG)', formatWeight(pExtGoal), formatWeight(extGoal), formatPctDiff(extGoal, pExtGoal)],
    ['PRODUÇÃO EXTRUSÃO CAST (KG)', formatWeight(pCastTotal), formatWeight(extProd), formatPctDiff(extProd, pCastTotal)],
    ['PRODUÇÃO RECICLAGEM EREMA (KG)', formatWeight(pEremaTotal), formatWeight(dashboardStats?.eremaMonth || 0), formatPctDiff(dashboardStats?.eremaMonth || 0, pEremaTotal)],
    ['META CORTE DE FITA (M²)', formatM2(pRibGoal), formatM2(ribGoal), formatPctDiff(ribGoal, pRibGoal)],
    ['PRODUÇÃO CORTE DE FITA (M²)', formatM2(pRibTotal), formatM2(ribProd), formatPctDiff(ribProd, pRibTotal)]
  ];

  autoTable(doc, {
    startY: yPos,
    head: compCorpHead,
    body: compCorpBody,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 3.5,
      halign: 'center'
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left', cellWidth: 70 },
      1: { cellWidth: 38 },
      2: { cellWidth: 38 },
      3: { fontStyle: 'bold', cellWidth: 36 }
    },
    didParseCell: function(data) {
      if (data.section === 'body') {
        // Linhas de Meta (índice 0: Meta Extrusão; índice 3: Meta Corte de Fita) recebem cinza suave
        if (data.row.index === 0 || data.row.index === 3) {
          data.cell.styles.fillColor = [241, 245, 249]; // Slate-100 (cinza bem suave e elegante)
          data.cell.styles.fontStyle = 'bold';
        }

        if (data.column.index === 3) {
          const valStr = String(data.cell.raw);
          if (valStr.startsWith('-')) data.cell.styles.textColor = [220, 38, 38];
          else if (valStr.startsWith('+')) data.cell.styles.textColor = [16, 185, 129];
        }
      }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // 2. EQUIPAMENTOS DE EXTRUSÃO (CAST 1 & CAST 2)
  checkYPage(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`${roman[secIdx++]}. DESEMPENHO POR EQUIPAMENTO — EXTRUSÃO (CAST 1 & CAST 2)`, 14, yPos);
  yPos += 4;

  const currentMonthProdData = productionData.filter(e => e && typeof e.date === 'string' && e.date.startsWith(dashboardMonth));
  
  // Cast 1 e Cast 2 (Exclusivo Extrusão)
  const castMacMap: Record<string, any> = {
    'Cast 1': { name: 'Cast 1', net: 0, borra: 0, ecoA: 0, ecoBP: 0, ecoBM: 0, stops: 0 },
    'Cast 2': { name: 'Cast 2', net: 0, borra: 0, ecoA: 0, ecoBP: 0, ecoBM: 0, stops: 0 }
  };
  // Erema (Setor Reciclagem - Separado)
  const eremaMacMap: Record<string, any> = {
    'Erema 1': { name: 'Erema 1', net: 0, borra: 0, ecoA: 0, ecoBP: 0, ecoBM: 0, stops: 0 }
  };

  currentMonthProdData.forEach(e => {
    const m = (e.machine || '').toLowerCase();
    if (m.includes('cast 1')) {
      castMacMap['Cast 1'].net += (e.netWeight || 0);
      castMacMap['Cast 1'].borra += (e.borraTotal || 0);
      castMacMap['Cast 1'].ecoA += (e.ecoA || 0);
      castMacMap['Cast 1'].ecoBP += (e.ecoBP || 0);
      castMacMap['Cast 1'].ecoBM += (e.ecoBM || 0);
      castMacMap['Cast 1'].stops += (e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0);
    } else if (m.includes('cast 2')) {
      castMacMap['Cast 2'].net += (e.netWeight || 0);
      castMacMap['Cast 2'].borra += (e.borraTotal || 0);
      castMacMap['Cast 2'].ecoA += (e.ecoA || 0);
      castMacMap['Cast 2'].ecoBP += (e.ecoBP || 0);
      castMacMap['Cast 2'].ecoBM += (e.ecoBM || 0);
      castMacMap['Cast 2'].stops += (e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0);
    } else if (m.includes('erema')) {
      eremaMacMap['Erema 1'].net += (e.netWeight || 0);
      eremaMacMap['Erema 1'].borra += (e.borraTotal || 0);
      eremaMacMap['Erema 1'].ecoA += (e.ecoA || 0);
      eremaMacMap['Erema 1'].ecoBP += (e.ecoBP || 0);
      eremaMacMap['Erema 1'].ecoBM += (e.ecoBM || 0);
      eremaMacMap['Erema 1'].stops += (e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0);
    }
  });

  const totalCastNet = castMacMap['Cast 1'].net + castMacMap['Cast 2'].net;
  const totalCastBorra = castMacMap['Cast 1'].borra + castMacMap['Cast 2'].borra;
  const totalCastEcoA = castMacMap['Cast 1'].ecoA + castMacMap['Cast 2'].ecoA;
  const totalCastEcoBP = castMacMap['Cast 1'].ecoBP + castMacMap['Cast 2'].ecoBP;
  const totalCastEcoBM = castMacMap['Cast 1'].ecoBM + castMacMap['Cast 2'].ecoBM;
  const totalCastStops = castMacMap['Cast 1'].stops + castMacMap['Cast 2'].stops;

  const extMacHead = [['EXTRUSORA', 'PROD. LÍQUIDA', 'BORRA (PERDA)', 'ECO A', 'ECO B (PROD)', 'ECO B (MANUT)', 'PARADA TOTAL']];
  const extMacBody = Object.values(castMacMap).map((m: any) => [
    m.name,
    formatWeight(m.net),
    formatWeight(m.borra),
    formatWeight(m.ecoA),
    formatWeight(m.ecoBP),
    formatWeight(m.ecoBM),
    formatHours(m.stops)
  ]);
  const extMacFoot = [[
    'TOTAL',
    formatWeight(totalCastNet),
    formatWeight(totalCastBorra),
    formatWeight(totalCastEcoA),
    formatWeight(totalCastEcoBP),
    formatWeight(totalCastEcoBM),
    formatHours(totalCastStops)
  ]];

  autoTable(doc, {
    startY: yPos,
    head: extMacHead,
    body: extMacBody,
    foot: extMacFoot,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center'
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [30, 41, 59],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 3,
      halign: 'center'
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left' },
      1: { fontStyle: 'bold', textColor: [37, 99, 235] }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 5;

  // Subtabela Separada para a Reciclagem (Erema 1)
  checkYPage(24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(5, 150, 105);
  doc.text('SETOR DE RECICLAGEM — MÁQUINA RECUPERADORA EREMA 1', 14, yPos);
  yPos += 3.5;

  const eremaNet = eremaMacMap['Erema 1'].net;
  const eremaBorra = eremaMacMap['Erema 1'].borra;
  const eremaEcoA = eremaMacMap['Erema 1'].ecoA;
  const eremaEcoBP = eremaMacMap['Erema 1'].ecoBP;
  const eremaEcoBM = eremaMacMap['Erema 1'].ecoBM;
  const eremaStops = eremaMacMap['Erema 1'].stops;

  const eremaMacHead = [['MÁQUINA RECICLADORA', 'PELLETS RECICLADOS', 'BORRA (PERDA)', 'ECO A', 'ECO B (PROD)', 'ECO B (MANUT)', 'PARADA TOTAL']];
  const eremaMacBody = [[
    'Erema 1 (Reciclagem)',
    formatWeight(eremaNet),
    formatWeight(eremaBorra),
    formatWeight(eremaEcoA),
    formatWeight(eremaEcoBP),
    formatWeight(eremaEcoBM),
    formatHours(eremaStops)
  ]];
  const eremaMacFoot = [[
    'TOTAL',
    formatWeight(eremaNet),
    formatWeight(eremaBorra),
    formatWeight(eremaEcoA),
    formatWeight(eremaEcoBP),
    formatWeight(eremaEcoBM),
    formatHours(eremaStops)
  ]];

  autoTable(doc, {
    startY: yPos,
    head: eremaMacHead,
    body: eremaMacBody,
    foot: eremaMacFoot,
    theme: 'grid',
    headStyles: {
      fillColor: [5, 150, 105],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center'
    },
    footStyles: {
      fillColor: [236, 253, 245],
      textColor: [6, 95, 70],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 3,
      halign: 'center'
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left' },
      1: { fontStyle: 'bold', textColor: [5, 150, 105] }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 3;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`* Conciliação Fabril: Extrusão Primária (Cast 1 + Cast 2) totaliza ${formatWeight(totalCastNet)}. Reciclagem Erema totaliza ${formatWeight(eremaNet)}. Total integrado: ${formatWeight(totalCastNet + eremaNet)}.`, 14, yPos);
  yPos += 7;

  // 3. EQUIPAMENTOS DE CORTE DE FITA
  checkYPage(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`${roman[secIdx++]}. DESEMPENHO POR EQUIPAMENTO — CORTE DE FITA`, 14, yPos);
  yPos += 4;

  const formatJumboNumberOnly = (units: number): string => {
    return units.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
  };

  const ribMacHead = [['MÁQUINA', 'PROD. BRUTA (M²)', 'NÃO CONFORME (M²)', 'PROD. LÍQUIDA (M²)', 'REND. (%)', 'ROLOS CORTADOS', 'JUMBOS EQUIV.', 'LIXO (M²)', 'PARADA TOTAL']];
  const ribMacBody = Object.values(ribMacMap).map((m: any) => [
    m.name.toUpperCase(),
    formatM2(m.prodGross),
    formatM2(m.rejected),
    formatM2(m.prodNet),
    m.prodGross > 0 ? `${((m.prodNet / m.prodGross) * 100).toFixed(1)}%` : '100%',
    m.rolls.toLocaleString('pt-BR'),
    formatJumboNumberOnly(calcJumboUnits(m.prodNet)),
    formatM2(m.wasteM2),
    formatHours(m.stops)
  ]);
  const ribMacFoot = [[
    'TOTAL',
    formatM2(totalRibMacGross),
    formatM2(totalRibMacRej),
    formatM2(totalRibMacNet),
    totalRibMacGross > 0 ? `${((totalRibMacNet / totalRibMacGross) * 100).toFixed(1)}%` : '100%',
    totalRibMacRolls.toLocaleString('pt-BR'),
    formatJumboNumberOnly(calcJumboUnits(totalRibMacNet)),
    formatM2(totalRibMacWasteM2),
    formatHours(totalRibMacStops)
  ]];

  autoTable(doc, {
    startY: yPos,
    head: ribMacHead,
    body: ribMacBody,
    foot: ribMacFoot,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'center'
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [30, 41, 59],
      fontSize: 7,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      fontSize: 6.8,
      cellPadding: 2.5,
      halign: 'center'
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left', cellWidth: 22 },
      1: { fontStyle: 'bold', textColor: [71, 85, 105] },
      2: { textColor: [220, 38, 38] },
      3: { fontStyle: 'bold', textColor: [37, 99, 235] },
      4: { fontStyle: 'bold' }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 4;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`* Identificação de Volume: A Produção Bruta (${formatM2(totalRibMacGross)}) contempla o volume total processado incluindo perdas. Descontando os ${formatM2(totalRibMacRej)} de não conformidade, a Produção Líquida Conforme é ${formatM2(totalRibMacNet)}.`, 14, yPos);
  yPos += 6;

  // 4. DESEMPENHO POR TURNO OPERACIONAL (EXTRUSÃO E CORTE DE FITA)
  checkYPage(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`${roman[secIdx++]}. DESEMPENHO POR TURNO OPERACIONAL (EXTRUSÃO & CORTE DE FITA)`, 14, yPos);
  yPos += 4;

  // Turnos Extrusão (Apenas Cast 1 e Cast 2) — Consolidado exclusivamente em DIURNO e NOTURNO
  const extShifts: Record<string, number> = {
    'DIURNO': 0,
    'NOTURNO': 0
  };
  currentMonthProdData.forEach(e => {
    if (!e || e.isNoWorkDay || e.isMaintenanceEntry) return;
    if ((e.machine || '').toLowerCase().includes('erema')) return; // Exclui estritamente Erema
    const sRaw = (e.shift || '').trim().toUpperCase();
    const isNoturno = sRaw.includes('NOTURNO') || sRaw.includes('NOITE') || sRaw === 'N1' || sRaw === 'N2';
    const s = isNoturno ? 'NOTURNO' : 'DIURNO';
    extShifts[s] += (e.netWeight || 0);
  });
  const extShiftsList = [
    { name: 'DIURNO', net: extShifts['DIURNO'] },
    { name: 'NOTURNO', net: extShifts['NOTURNO'] }
  ].filter(s => s.net > 0);
  if (extShiftsList.length === 0) {
    extShiftsList.push({ name: 'DIURNO', net: 0 }, { name: 'NOTURNO', net: 0 });
  }

  // Turnos Fita — Consolidado exclusivamente no turno único COMERCIAL (qualquer máquina)
  const ribShifts: Record<string, { prodNet: number; rejected: number; prodGross: number; waste: number; wasteM2: number }> = {
    'COMERCIAL': { prodNet: 0, rejected: 0, prodGross: 0, waste: 0, wasteM2: 0 }
  };
  currentMonthRibbonEntries.forEach(e => {
    const s = 'COMERCIAL';
    const pNet = (e.producedM2 || 0);
    const pRej = (e.rejectedM2 || 0);
    const wM2 = getEntryWasteM2(e);
    ribShifts[s].prodNet += pNet;
    ribShifts[s].rejected += pRej;
    ribShifts[s].prodGross += pNet + pRej;
    ribShifts[s].waste += (e.wasteWeight || 0);
    ribShifts[s].wasteM2 += wM2;
  });
  const ribShiftsList = Object.entries(ribShifts).map(([name, data]) => ({ name, ...data }));

  // Tabela lado a lado ou duas tabelas limpas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text('TURNO — EXTRUSÃO (CAST 1 & CAST 2)', 14, yPos);
  yPos += 3.5;

  const extShiftHead = [['TURNO', 'PRODUÇÃO LÍQUIDA (KG)', 'PARTICIPAÇÃO (%)']];
  const extShiftBody = extShiftsList.map(s => [
    s.name,
    formatWeight(s.net),
    totalCastNet > 0 ? `${((s.net / totalCastNet) * 100).toFixed(1)}%` : '0%'
  ]);
  const extShiftFoot = [['TOTAL', formatWeight(totalCastNet), '100.0%']];

  autoTable(doc, {
    startY: yPos,
    head: extShiftHead,
    body: extShiftBody,
    foot: extShiftFoot,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 7.5, cellPadding: 2.8, halign: 'center' },
    columnStyles: { 0: { fontStyle: 'bold', halign: 'left', cellWidth: 50 } }
  });

  yPos = (doc as any).lastAutoTable.finalY + 6;

  checkYPage(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text('TURNO — CORTE DE FITA (CONVERSÃO)', 14, yPos);
  yPos += 3.5;

  const ribShiftHead = [['TURNO', 'PROD. BRUTA (M²)', 'NÃO CONFORME (M²)', 'PROD. LÍQUIDA (M²)', 'PARTICIPAÇÃO (%)', 'LIXO (M²)']];
  const ribShiftBody = ribShiftsList.map(s => [
    s.name,
    formatM2(s.prodGross),
    formatM2(s.rejected),
    formatM2(s.prodNet),
    totalRibMacNet > 0 ? `${((s.prodNet / totalRibMacNet) * 100).toFixed(1)}%` : '0%',
    formatM2(s.wasteM2)
  ]);
  const ribShiftFoot = [[
    'TOTAL',
    formatM2(ribShiftsList.reduce((a, b) => a + b.prodGross, 0)),
    formatM2(ribShiftsList.reduce((a, b) => a + b.rejected, 0)),
    formatM2(ribShiftsList.reduce((a, b) => a + b.prodNet, 0)),
    '100.0%',
    formatM2(ribShiftsList.reduce((a, b) => a + b.wasteM2, 0))
  ]];

  autoTable(doc, {
    startY: yPos,
    head: ribShiftHead,
    body: ribShiftBody,
    foot: ribShiftFoot,
    theme: 'grid',
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
    footStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 7.5, cellPadding: 2.8, halign: 'center' },
    columnStyles: { 0: { fontStyle: 'bold', halign: 'left', cellWidth: 50 } }
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // 5. RANKING DE OPERADORES - EXTRUSÃO
  const extOps: Record<string, { name: string; net: number; borra: number; ecoA: number; ecoBP: number; ecoBM: number; stops: number }> = {};
  const eremaOps: Record<string, { name: string; net: number; borra: number; ecoA: number; ecoBP: number; ecoBM: number; stops: number }> = {};

  currentMonthProdData.forEach(e => {
    if (!e || e.isNoWorkDay || e.isMaintenanceEntry || !e.operator) return;
    const op = e.operator.trim().toUpperCase();
    if (!op || op === 'OPERADOR (FÁBRICA)' || op === 'OPERADOR (FABRICA)' || op === 'OPERADOR') return;
    const isErema = (e.machine || '').toLowerCase().includes('erema');
    const target = isErema ? eremaOps : extOps;

    if (!target[op]) target[op] = { name: op, net: 0, borra: 0, ecoA: 0, ecoBP: 0, ecoBM: 0, stops: 0 };
    target[op].net += (e.netWeight || 0);
    target[op].borra += (e.borraTotal || 0);
    target[op].ecoA += (e.ecoA || 0);
    target[op].ecoBP += (e.ecoBP || 0);
    target[op].ecoBM += (e.ecoBM || 0);
    target[op].stops += (e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0);
  });

  const extOpsList = Object.values(extOps).sort((a, b) => b.net - a.net);
  const eremaOpsList = Object.values(eremaOps).sort((a, b) => b.net - a.net);

  if (extOpsList.length > 0) {
    checkYPage(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`${roman[secIdx++]}. INDICADORES DETALHADOS POR OPERADOR — EXTRUSÃO`, 14, yPos);
    yPos += 4;

    const totalExtOpNet = extOpsList.reduce((a, b) => a + b.net, 0);
    const totalExtOpBorra = extOpsList.reduce((a, b) => a + b.borra, 0);
    const totalExtOpEcoA = extOpsList.reduce((a, b) => a + b.ecoA, 0);
    const totalExtOpEcoBP = extOpsList.reduce((a, b) => a + b.ecoBP, 0);
    const totalExtOpEcoBM = extOpsList.reduce((a, b) => a + b.ecoBM, 0);
    const totalExtOpStops = extOpsList.reduce((a, b) => a + b.stops, 0);

    const extOpHead = [['OPERADOR', 'PROD. LÍQUIDA', 'PART. (%)', 'BORRA (PERDA)', 'ECO A', 'ECO B (PROD)', 'ECO B (MANUT)', 'PARADA TOTAL']];
    const extOpBody = extOpsList.map(op => [
      op.name,
      formatWeight(op.net),
      totalExtOpNet > 0 ? `${((op.net / totalExtOpNet) * 100).toFixed(1)}%` : '0%',
      formatWeight(op.borra),
      formatWeight(op.ecoA),
      formatWeight(op.ecoBP),
      formatWeight(op.ecoBM),
      formatHours(op.stops)
    ]);
    const extOpFoot = [[
      'TOTAL',
      formatWeight(totalExtOpNet),
      '100.0%',
      formatWeight(totalExtOpBorra),
      formatWeight(totalExtOpEcoA),
      formatWeight(totalExtOpEcoBP),
      formatWeight(totalExtOpEcoBM),
      formatHours(totalExtOpStops)
    ]];

    autoTable(doc, {
      startY: yPos,
      head: extOpHead,
      body: extOpBody,
      foot: extOpFoot,
      theme: 'grid',
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center'
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 7,
        cellPadding: 2.8,
        halign: 'center'
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'left', cellWidth: 42 },
        1: { fontStyle: 'bold', textColor: [37, 99, 235] }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // Indicadores Detalhados por Operador - Reciclagem (Erema)
  if (eremaOpsList.length > 0) {
    checkYPage(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`${roman[secIdx++]}. INDICADORES DETALHADOS POR OPERADOR — RECICLAGEM (EREMA)`, 14, yPos);
    yPos += 4;

    const totalEremaNet = eremaOpsList.reduce((a, b) => a + b.net, 0);
    const totalEremaBorra = eremaOpsList.reduce((a, b) => a + b.borra, 0);
    const totalEremaEcoA = eremaOpsList.reduce((a, b) => a + b.ecoA, 0);
    const totalEremaEcoBP = eremaOpsList.reduce((a, b) => a + b.ecoBP, 0);
    const totalEremaEcoBM = eremaOpsList.reduce((a, b) => a + b.ecoBM, 0);
    const totalEremaStops = eremaOpsList.reduce((a, b) => a + b.stops, 0);

    const eremaOpHead = [['OPERADOR RECICLAGEM', 'PROD. LÍQUIDA', 'PART. (%)', 'BORRA (PERDA)', 'ECO A', 'ECO B (PROD)', 'ECO B (MANUT)', 'PARADA TOTAL']];
    const eremaOpBody = eremaOpsList.map(op => [
      op.name,
      formatWeight(op.net),
      totalEremaNet > 0 ? `${((op.net / totalEremaNet) * 100).toFixed(1)}%` : '0%',
      formatWeight(op.borra),
      formatWeight(op.ecoA),
      formatWeight(op.ecoBP),
      formatWeight(op.ecoBM),
      formatHours(op.stops)
    ]);
    const eremaOpFoot = [[
      'TOTAL',
      formatWeight(totalEremaNet),
      '100.0%',
      formatWeight(totalEremaBorra),
      formatWeight(totalEremaEcoA),
      formatWeight(totalEremaEcoBP),
      formatWeight(totalEremaEcoBM),
      formatHours(totalEremaStops)
    ]];

    autoTable(doc, {
      startY: yPos,
      head: eremaOpHead,
      body: eremaOpBody,
      foot: eremaOpFoot,
      theme: 'grid',
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center'
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 7,
        cellPadding: 2.8,
        halign: 'center'
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'left', cellWidth: 42 },
        1: { fontStyle: 'bold', textColor: [16, 185, 129] }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // 6. RANKING DE OPERADORES - CORTE DE FITA
  const ribOps: Record<string, { name: string; prodNet: number; rejected: number; prodGross: number; waste: number; wasteM2: number; rolls: number; stops: number }> = {};
  currentMonthRibbonEntries.forEach(e => {
    const op = (e.operator || 'Sem Nome').trim().toUpperCase();
    if (!ribOps[op]) ribOps[op] = { name: op, prodNet: 0, rejected: 0, prodGross: 0, waste: 0, wasteM2: 0, rolls: 0, stops: 0 };
    const pNet = (e.producedM2 || 0);
    const pRej = (e.rejectedM2 || 0);
    const wM2 = getEntryWasteM2(e);
    ribOps[op].prodNet += pNet;
    ribOps[op].rejected += pRej;
    ribOps[op].prodGross += pNet + pRej;
    ribOps[op].waste += (e.wasteWeight || 0);
    ribOps[op].wasteM2 += wM2;
    ribOps[op].rolls += (e.rollsCount || 0);
    ribOps[op].stops += (e.stoppedMinutes || 0) || ((e.manutencaoMin || 0) + (e.processoMin || 0) + (e.outrosMin || 0));
  });

  const ribOpsList = Object.values(ribOps).sort((a, b) => b.prodNet - a.prodNet);
  if (ribOpsList.length > 0) {
    checkYPage(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`${roman[secIdx++]}. INDICADORES DETALHADOS POR OPERADOR — CORTE DE FITA`, 14, yPos);
    yPos += 4;

    const totalRibOpGross = ribOpsList.reduce((a, b) => a + b.prodGross, 0);
    const totalRibOpNet = ribOpsList.reduce((a, b) => a + b.prodNet, 0);
    const totalRibOpRej = ribOpsList.reduce((a, b) => a + b.rejected, 0);
    const totalRibOpWasteM2 = ribOpsList.reduce((a, b) => a + b.wasteM2, 0);
    const totalRibOpRolls = ribOpsList.reduce((a, b) => a + b.rolls, 0);
    const totalRibOpStops = ribOpsList.reduce((a, b) => a + b.stops, 0);

    const ribOpHead = [['OPERADOR', 'PROD. BRUTA (M²)', 'NÃO CONF. (M²)', 'PROD. LÍQUIDA (M²)', 'PART. (%)', 'LIXO (M²)', 'ROLOS CORTADOS', 'PARADA TOTAL']];
    const ribOpBody = ribOpsList.map(op => [
      op.name,
      formatM2(op.prodGross),
      formatM2(op.rejected),
      formatM2(op.prodNet),
      totalRibOpNet > 0 ? `${((op.prodNet / totalRibOpNet) * 100).toFixed(1)}%` : '0%',
      formatM2(op.wasteM2),
      op.rolls.toLocaleString('pt-BR'),
      formatHours(op.stops)
    ]);
    const ribOpFoot = [[
      'TOTAL',
      formatM2(totalRibOpGross),
      formatM2(totalRibOpRej),
      formatM2(totalRibOpNet),
      '100.0%',
      formatM2(totalRibOpWasteM2),
      totalRibOpRolls.toLocaleString('pt-BR'),
      formatHours(totalRibOpStops)
    ]];

    autoTable(doc, {
      startY: yPos,
      head: ribOpHead,
      body: ribOpBody,
      foot: ribOpFoot,
      theme: 'grid',
      headStyles: {
        fillColor: [16, 185, 129], // Emerald-600
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center'
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 7,
        cellPadding: 2.8,
        halign: 'center'
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'left', cellWidth: 42 },
        1: { fontStyle: 'bold', textColor: [71, 85, 105] },
        2: { textColor: [220, 38, 38] },
        3: { fontStyle: 'bold', textColor: [16, 185, 129] }
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 8;
  }

  // 7. GESTÃO E BALANÇO DE RESÍDUOS, PERDAS E CIRCULARIDADE POR SETOR
  checkYPage(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`${roman[secIdx++]}. GESTÃO DE RESÍDUOS, PERDAS E CIRCULARIDADE`, 14, yPos);
  yPos += 4;

  // Cálculo de bags / pallets de pellets gerados na Erema (Padrão: 1.100 Kg por bag/palete)
  const eremaPalletsCount = eremaNet > 0 ? (eremaNet / 1100).toFixed(1) : '0';
  const eremaVolumeFormat = `${formatWeight(eremaNet)} (${eremaPalletsCount} pallets)`;

  // Detalhamento de Fita: Não Conforme Tipo 1 / Tipo 2 / Total (m²)
  let ribTotalM2Tipo1 = 0;
  let ribTotalM2Tipo2 = 0;
  currentMonthRibbonEntries.forEach(e => {
    ribTotalM2Tipo1 += (e.m2Tipo1 || 0);
    ribTotalM2Tipo2 += (e.m2Tipo2 || 0);
  });

  const ribbonSubRows: any[] = [
    ['LIXO DE CORTE', 'Ghezzi', formatM2(ribMacMap['Ghezzi'].wasteM2), 'Descarte Controlado / Enfarfamento'],
    ['LIXO DE CORTE', 'Lintech', formatM2(ribMacMap['Lintech'].wasteM2), 'Descarte Controlado / Enfarfamento'],
    ['LIXO DE CORTE', 'Wultec / Ultratec', formatM2(ribMacMap['Wultec'].wasteM2), 'Descarte Controlado / Enfarfamento']
  ];

  if (ribTotalM2Tipo1 > 0 || ribTotalM2Tipo2 > 0) {
    if (ribTotalM2Tipo1 > 0) {
      ribbonSubRows.push(['NÃO CONFORME TIPO 1', 'Corte de Fita', formatM2(ribTotalM2Tipo1), 'Segregação Operacional / Segunda Linha']);
    }
    if (ribTotalM2Tipo2 > 0) {
      ribbonSubRows.push(['NÃO CONFORME TIPO 2', 'Corte de Fita', formatM2(ribTotalM2Tipo2), 'Segregação Operacional / Segunda Linha']);
    }
  } else if (totalRibMacRej > 0) {
    ribbonSubRows.push(['NÃO CONFORME (TIPO 1 & 2)', 'Corte de Fita', formatM2(totalRibMacRej), 'Segregação Operacional / Segunda Linha']);
  }

  const wasteSummaryHead = [['SETOR', 'TIPO DE RESÍDUO / MATERIAL', 'ORIGEM', 'VOLUME APURADO', 'DESTINAÇÃO OPERACIONAL']];
  const wasteSummaryBody: any[] = [
    // 1. SETOR EXTRUSÃO — CÉLULA MESCLADA (ROWSPAN) ABRANGENDO TODAS AS LINHAS DA EXTRUSÃO COM ECO A E ECO B
    [{ content: 'EXTRUSÃO', rowSpan: 4, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' } }, 'ECO A', 'Cast 1', formatWeight(castMacMap['Cast 1'].ecoA), 'Rebobinamento / Reprocesso Interno'],
    ['ECO B PRODUÇÃO E MANUTENÇÃO', 'Cast 1', formatWeight(castMacMap['Cast 1'].ecoBP + castMacMap['Cast 1'].ecoBM), 'Alimentação Erema (Reciclagem Interna)'],
    ['ECO A', 'Cast 2', formatWeight(castMacMap['Cast 2'].ecoA), 'Rebobinamento / Reprocesso Interno'],
    ['ECO B PRODUÇÃO E MANUTENÇÃO', 'Cast 2', formatWeight(castMacMap['Cast 2'].ecoBP + castMacMap['Cast 2'].ecoBM), 'Alimentação Erema (Reciclagem Interna)'],

    // 2. SETOR RECICLAGEM — SOMENTE EREMA (PERMANECE COMO ESTÁ)
    ['RECICLAGEM', 'PELLETS RECICLADOS GERADOS', 'Erema 1', eremaVolumeFormat, 'Retorno em Blend para Cast 1 e Cast 2 (Erema não gera perda)'],

    // 3. SETOR CORTE DE FITA — CÉLULA MESCLADA (ROWSPAN) ABRANGENDO TODAS AS LINHAS DO CORTE DE FITA
    [{ content: 'CORTE DE FITA', rowSpan: ribbonSubRows.length, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' } }, ...ribbonSubRows[0]],
    ...ribbonSubRows.slice(1)
  ];

  autoTable(doc, {
    startY: yPos,
    margin: { left: 14, right: 14 },
    head: wasteSummaryHead,
    body: wasteSummaryBody,
    theme: 'grid',
    headStyles: {
      fillColor: [249, 115, 22], // Orange-500
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      fontSize: 7,
      cellPadding: 2.8,
      halign: 'center'
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center', cellWidth: 26 },
      1: { fontStyle: 'bold', halign: 'left', cellWidth: 48 },
      2: { cellWidth: 28 },
      3: { fontStyle: 'bold', textColor: [194, 65, 12], cellWidth: 36 },
      4: { cellWidth: 44, fontSize: 6.8 }
    },
    didParseCell: function(data) {
      if (data.section === 'body') {
        if (data.row.index >= 0 && data.row.index <= 3) {
          data.cell.styles.fillColor = [248, 250, 252]; // Extrusão
        } else if (data.row.index === 4) {
          data.cell.styles.fillColor = [236, 253, 245]; // Reciclagem Erema
        } else {
          data.cell.styles.fillColor = [255, 255, 255]; // Corte de Fita
        }
      }
    }
  });

  yPos = (doc as any).lastAutoTable.finalY + 8;

  // 8. RESUMO INTEGRADO DE PARADAS
  checkYPage(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`${roman[secIdx++]}. RESUMO INTEGRADO DE PARADAS`, 14, yPos);
  yPos += 4;

  const totalAllPlantStops = totalCastStops + eremaStops + totalRibMacStops;

  const stopsSummaryHead = [['SETOR', 'MÁQUINA / EQUIPAMENTO', 'PARADA TOTAL (HORAS)', 'PARTICIPAÇÃO NO TEMPO PARADO']];
  const stopsSummaryBody: any[] = [
    [{ content: 'EXTRUSÃO', rowSpan: 2, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' } }, 'Cast 1', formatHours(castMacMap['Cast 1'].stops), `${totalAllPlantStops > 0 ? ((castMacMap['Cast 1'].stops / totalAllPlantStops) * 100).toFixed(1) : 0}%`],
    ['Cast 2', formatHours(castMacMap['Cast 2'].stops), `${totalAllPlantStops > 0 ? ((castMacMap['Cast 2'].stops / totalAllPlantStops) * 100).toFixed(1) : 0}%`],
    ['RECICLAGEM', 'Erema 1', formatHours(eremaStops), `${totalAllPlantStops > 0 ? ((eremaStops / totalAllPlantStops) * 100).toFixed(1) : 0}%`],
    [{ content: 'CORTE DE FITA', rowSpan: 3, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' } }, 'Ghezzi', formatHours(ribMacMap['Ghezzi'].stops), `${totalAllPlantStops > 0 ? ((ribMacMap['Ghezzi'].stops / totalAllPlantStops) * 100).toFixed(1) : 0}%`],
    ['Lintech', formatHours(ribMacMap['Lintech'].stops), `${totalAllPlantStops > 0 ? ((ribMacMap['Lintech'].stops / totalAllPlantStops) * 100).toFixed(1) : 0}%`],
    ['Wultec / Ultratec', formatHours(ribMacMap['Wultec'].stops), `${totalAllPlantStops > 0 ? ((ribMacMap['Wultec'].stops / totalAllPlantStops) * 100).toFixed(1) : 0}%`]
  ];
  const stopsSummaryFoot = [
    ['TOTAL', 'Todas as Máquinas', formatHours(totalAllPlantStops), '100.0%']
  ];

  autoTable(doc, {
    startY: yPos,
    margin: { left: 14, right: 14 },
    head: stopsSummaryHead,
    body: stopsSummaryBody,
    foot: stopsSummaryFoot,
    theme: 'grid',
    headStyles: {
      fillColor: [220, 38, 38],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [30, 41, 59],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 3.2,
      halign: 'center'
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center', cellWidth: 38 },
      1: { fontStyle: 'bold', halign: 'left', cellWidth: 54 },
      2: { fontStyle: 'bold', cellWidth: 45 },
      3: { cellWidth: 45 }
    },
    didParseCell: function(data) {
      if (data.section === 'body') {
        if (data.row.index >= 0 && data.row.index <= 1) {
          data.cell.styles.fillColor = [248, 250, 252]; // Extrusão
        } else if (data.row.index === 2) {
          data.cell.styles.fillColor = [236, 253, 245]; // Reciclagem Erema
        } else {
          data.cell.styles.fillColor = [255, 255, 255]; // Corte de Fita
        }
      }
    }
  });

  // Rodapé e Numeração de Páginas
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Relatório Integrado de Produção (Extrusão + Fita) • Ref: ${refPeriod}`, 14, pageHeight - 10);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
  }

  return doc;
};
