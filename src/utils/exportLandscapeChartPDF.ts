import jsPDF from 'jspdf';
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
  chartImageUri?: string;
  sector?: 'extrusao' | 'fita' | 'reciclagem' | string;
  customSlogan?: string;
  parametersSummary?: string;
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
  tableBlocks?: Array<{
    title: string;
    subtitle?: string;
    headers: string[];
    rows: string[][];
  }>;
  chartLogoImage?: string | null;
  systemLogo?: string;
  systemName?: string;
  loggedUser?: {
    name?: string;
    role?: string;
  } | null;
}

/**
 * Formatação de peso industrial padronizado (Kg ou Toneladas)
 */
export function formatAnnexWeight(kg: number): string {
  const val = Number(kg) || 0;
  if (val === 0) return '0 Kg';
  if (Math.abs(val) < 1000) {
    return `${Math.round(val).toLocaleString('pt-BR')} Kg`;
  }
  const tons = val / 1000;
  return `${tons.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} T`;
}

/**
 * Formatação de m² padronizada
 */
export function formatAnnexM2(m2: number): string {
  const val = Number(m2) || 0;
  return `${Math.round(val).toLocaleString('pt-BR')} m²`;
}

/**
 * Slogan por setor no rodapé do documento
 */
export function getSectorSlogan(sectorOrMachine?: string, customSlogan?: string): string {
  if (customSlogan) return customSlogan;
  const s = (sectorOrMachine || '').toLowerCase().trim();
  if (s.includes('erema') || s.includes('recicla')) {
    return `
      <div style="display:flex; align-items:center; gap:6px;">
        <svg viewBox="0 0 24 24" style="width:20px; height:20px; fill:#6da83c;"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V17a1 1 0 0 1-2 0v-.07A7.003 7.003 0 0 1 5.07 11H5a1 1 0 0 1 0-2h.07A7.003 7.003 0 0 1 11 3.07V3a1 1 0 0 1 2 0v.07A7.003 7.003 0 0 1 18.93 9H19a1 1 0 0 1 0 2h-.07A7.003 7.003 0 0 1 13 16.93z"/></svg>
        <span>A TRANSFORMAÇÃO QUE SUSTENTA.</span>
      </div>
    `;
  }
  if (s.includes('cast') || s.includes('extrus')) {
    return 'QUALIDADE E ESTABILIDADE EM CADA BOBINA!';
  }
  return 'FOCO, EFICIÊNCIA E PRODUTIVIDADE EM CADA ROLO!';
}

/**
 * Monta o HTML do logotipo oficial da Manu Packaging em SVG ou imagem customizada
 */
function buildCompanyLogoHtml(details: LandscapeChartExportDetails): string {
  const customLogo =
    details.chartLogoImage ||
    details.systemLogo ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('manupackaging_chart_pdf_logo') : null);

  if (customLogo) {
    return `
      <div class="company-logo-wrap">
        <img src="${customLogo}" alt="Logo" class="custom-brand-logo" />
      </div>
    `;
  }

  return `
    <div class="company-logo-wrap">
      <div class="manu-logo-container">
        <div class="manu-bars">
          <div class="bar bar-1"></div>
          <div class="bar bar-2"></div>
          <div class="bar bar-3"></div>
        </div>
        <div class="manu-texts">
          <div class="manu-row">
            <span class="manu-name">manu</span>
            <svg class="manu-leaf" viewBox="0 0 24 24">
              <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z"/>
            </svg>
          </div>
          <div class="packaging-name">packaging</div>
          <div class="fitasa-subtitle">FITASA &amp; AMAZÔNIA</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Constrói o layout completo fiel à identidade visual da Manu Packaging
 * baseado exatamente no design da imagem original enviada pelo usuário
 */
export function buildCompanyIndustrialPosterHtml(details: LandscapeChartExportDetails): string {
  const { title, chartType, data, loggedUser } = details;
  const rowsData = Array.isArray(data) ? data : [];
  const sectorOrMachine = details.extraInfo?.filters?.machine || details.sector || title;
  const sloganText = getSectorSlogan(sectorOrMachine, details.customSlogan);

  // Parâmetros do banner
  const filters = details.extraInfo?.filters;
  const dateRange = filters?.dateRange || details.period || 'Mês Operacional';
  const cleanRange = dateRange.replace(/(\d{4})-(\d{2})/g, '$2/$1');
  const countDays = rowsData.length > 0 ? `${rowsData.length} DIAS REGISTRADOS` : 'DADOS CONSOLIDADOS';
  const subtitleBanner = `PERÍODO: ${cleanRange.toUpperCase()} • ${countDays}`;

  // Carimbo
  const now = new Date();
  const issueDate = now.toLocaleDateString('pt-BR');
  const issueTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const userStamp = loggedUser?.name ? ` | Operador: ${loggedUser.name}` : '';
  const metaStamp = `Período: ${cleanRange} | Emitido em: ${issueDate} às ${issueTime}${userStamp} | Manu Packaging Industrial`;

  // =========================================================================
  // RENDERIZADOR ESPECÍFICO POR TIPO DE GRÁFICO
  // =========================================================================

  // CASO 1: EVOLUÇÃO DE PERDAS VS PRODUÇÃO LÍQUIDA (bi-chart-composed)
  // Layout idêntico ao anexo com barras azul (noturno) e verde (diurno)
  if (chartType === 'bi-chart-composed' || (!chartType && rowsData.length > 0 && rowsData[0]?.ecoBP !== undefined)) {
    let totEcoBP = 0;
    let totEcoBM = 0;
    let totBorra = 0;
    let totProd = 0;
    let totVols = 0;
    let maxShiftProd = 1;

    rowsData.forEach((r: any) => {
      totEcoBP += Number(r.ecoBP) || 0;
      totEcoBM += Number(r.ecoBM) || 0;
      totBorra += Number(r.borra) || 0;
      totProd += Number(r.prod) || 0;
      totVols += Number(r.totalVolumes) || 0;
      const nProd = Number(r.prodNoturno) || 0;
      const dProd = Number(r.prodDiurno) || 0;
      if (nProd > maxShiftProd) maxShiftProd = nProd;
      if (dProd > maxShiftProd) maxShiftProd = dProd;
    });

    const totLosses = totEcoBP + totEcoBM + totBorra;

    // Altura de linha dinâmica para caber 100% em uma folha A4
    const rowCount = rowsData.length;
    const isCompact = rowCount > 8;
    const isUltraCompact = rowCount > 11;

    const rowHeight = isUltraCompact ? '32px' : isCompact ? '38px' : '44px';
    const barHeight = isUltraCompact ? '12px' : isCompact ? '15px' : '18px';
    const fontSize = isUltraCompact ? '12px' : isCompact ? '13px' : '14px';

    return `
      <div id="company-pdf-root" class="company-pdf-canvas">
        <div class="inner-company-panel">
          
          <!-- TOPO: LOGO + BANNER AZUL ESCURO -->
          <header class="company-header-row">
            ${buildCompanyLogoHtml(details)}
            <div class="header-banner-block">
              <h1 class="header-banner-title">${title.toUpperCase()}</h1>
              <div class="header-banner-subtitle">${subtitleBanner}</div>
            </div>
          </header>

          <!-- SUB-HEADER: LEGENDA CRONOLÓGICA -->
          <div class="subheader-legend-row">
            <div class="subheader-title">
              <span class="icon">📋</span> LEGENDA E DETALHAMENTO CRONOLÓGICO POR DATA
            </div>
            <div class="legend-badges">
              <span class="legend-badge noturno-badge"><span class="badge-dot"></span>NOTURNO</span>
              <span class="legend-badge diurno-badge"><span class="badge-dot"></span>DIURNO</span>
            </div>
          </div>

          <!-- TABELA PRINCIPAL DE DADOS CRONOLÓGICOS -->
          <div class="table-container">
            <table class="company-data-table" style="font-size: ${fontSize};">
              <thead>
                <tr>
                  <th style="width: 13%;">DATA</th>
                  <th style="width: 12%;">ECO B PROD.</th>
                  <th style="width: 12%;">ECO B MANUT.</th>
                  <th style="width: 12%;">RESÍDUO BORRA</th>
                  <th style="width: 14%;">PRODUÇÃO LÍQUIDA</th>
                  <th style="width: 9%;">VOLUMES</th>
                  <th style="width: 28%;">DETALHAMENTO POR TURNO / LINHA</th>
                </tr>
              </thead>
              <tbody>
                ${rowsData
                  .map((r: any) => {
                    const dateStr = r.date ? r.date.split('-').reverse().join('/') : r.label || '-';
                    const noturnoVal = Number(r.prodNoturno) || 0;
                    const diurnoVal = Number(r.prodDiurno) || 0;
                    const noturnoPct = Math.max(38, Math.min(100, Math.round((noturnoVal / maxShiftProd) * 100)));
                    const diurnoPct = Math.max(38, Math.min(100, Math.round((diurnoVal / maxShiftProd) * 100)));

                    return `
                      <tr style="height: ${rowHeight};">
                        <td class="cell-bold cell-dark">${dateStr}</td>
                        <td class="cell-bold cell-blue">${formatAnnexWeight(r.ecoBP)}</td>
                        <td class="cell-bold cell-purple">${formatAnnexWeight(r.ecoBM)}</td>
                        <td class="cell-bold cell-amber">${formatAnnexWeight(r.borra)}</td>
                        <td class="cell-bold cell-green">${formatAnnexWeight(r.prod)}</td>
                        <td class="cell-bold cell-cyan">${r.totalVolumes || 0}</td>
                        <td class="cell-shift-bars">
                          <div class="shift-bars-stack">
                            <div class="shift-bar noturno-bar" style="width: ${noturnoPct}%; height: ${barHeight};">
                              <span class="shift-bar-text">NOTURNO: ${formatAnnexWeight(noturnoVal)}</span>
                            </div>
                            <div class="shift-bar diurno-bar" style="width: ${diurnoPct}%; height: ${barHeight};">
                              <span class="shift-bar-text">DIURNO: ${formatAnnexWeight(diurnoVal)}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>

          <!-- FAIXA DE TOTAIS DO PERÍODO -->
          <footer class="period-totals-ribbon">
            <div class="total-block label-block">TOTAL DO PERÍODO</div>
            <div class="total-block blue-block">${formatAnnexWeight(totEcoBP)}</div>
            <div class="total-block purple-block">${formatAnnexWeight(totEcoBM)}</div>
            <div class="total-block amber-block">${formatAnnexWeight(totBorra)}</div>
            <div class="total-block green-block">${formatAnnexWeight(totProd)}</div>
            <div class="total-block cyan-block">${totVols} vols</div>
            <div class="total-block losses-block">Perdas Totais: ${formatAnnexWeight(totLosses)}</div>
          </footer>

          <!-- RODAPÉ FINAL COM CARIMBO E SLOGAN -->
          <div class="footer-meta-row">
            <div class="footer-stamp">${metaStamp}</div>
            <div class="footer-slogan">${sloganText}</div>
          </div>

        </div>
      </div>
    `;
  }

  // CASO 2: DESEMPENHO POR OPERADOR (bi-chart-scatter)
  if (chartType === 'bi-chart-scatter') {
    let totProd = 0;
    let totEcoB = 0;
    let totEcoBP = 0;
    let totEcoBM = 0;
    let maxProd = 1;

    rowsData.forEach((op: any) => {
      totProd += Number(op.prod) || 0;
      totEcoB += Number(op.ecoB) || Number(op.wastes) || 0;
      totEcoBP += Number(op.ecoBP) || 0;
      totEcoBM += Number(op.ecoBM) || 0;
      if ((Number(op.prod) || 0) > maxProd) maxProd = Number(op.prod) || 0;
    });

    const avgRate = totProd + totEcoB > 0 ? ((totEcoB / (totProd + totEcoB)) * 100).toFixed(1) + '%' : '0,0%';

    return `
      <div id="company-pdf-root" class="company-pdf-canvas">
        <div class="inner-company-panel">
          
          <header class="company-header-row">
            ${buildCompanyLogoHtml(details)}
            <div class="header-banner-block">
              <h1 class="header-banner-title">DESEMPENHO POR OPERADOR: PRODUÇÃO VS ECO B</h1>
              <div class="header-banner-subtitle">${subtitleBanner}</div>
            </div>
          </header>

          <div class="subheader-legend-row">
            <div class="subheader-title">
              <span class="icon">📋</span> CLASSIFICAÇÃO INDIVIDUAL DE OPERADORES (ECO A NÃO CONTABILIZADO)
            </div>
            <div class="legend-badges">
              <span class="legend-badge diurno-badge"><span class="badge-dot"></span>PRODUÇÃO LÍQUIDA</span>
              <span class="legend-badge noturno-badge"><span class="badge-dot"></span>ECO B TOTAL</span>
            </div>
          </div>

          <div class="table-container">
            <table class="company-data-table">
              <thead>
                <tr>
                  <th style="width: 22%;">OPERADOR</th>
                  <th style="width: 15%;">PRODUÇÃO LÍQUIDA</th>
                  <th style="width: 14%;">ECO B PROD.</th>
                  <th style="width: 14%;">ECO B MANUT.</th>
                  <th style="width: 14%;">ECO B TOTAL</th>
                  <th style="width: 11%;">TAXA PERDA</th>
                  <th style="width: 10%;">STATUS</th>
                </tr>
              </thead>
              <tbody>
                ${rowsData
                  .map((op: any) => {
                    const prod = Number(op.prod) || 0;
                    const ecoB = Number(op.ecoB) || Number(op.wastes) || 0;
                    const rate = prod + ecoB > 0 ? ((ecoB / (prod + ecoB)) * 100).toFixed(1) + '%' : '0,0%';
                    const statusClass = (prod + ecoB > 0 && ecoB / (prod + ecoB) <= 0.08) ? 'cell-green' : 'cell-amber';

                    return `
                      <tr>
                        <td class="cell-bold cell-dark" style="text-align: left; padding-left: 14px;">${op.name || '-'}</td>
                        <td class="cell-bold cell-green">${formatAnnexWeight(prod)}</td>
                        <td class="cell-bold cell-blue">${formatAnnexWeight(op.ecoBP || 0)}</td>
                        <td class="cell-bold cell-purple">${formatAnnexWeight(op.ecoBM || 0)}</td>
                        <td class="cell-bold cell-dark">${formatAnnexWeight(ecoB)}</td>
                        <td class="cell-bold ${statusClass}">${rate}</td>
                        <td class="cell-bold ${statusClass}">${(prod + ecoB > 0 && ecoB / (prod + ecoB) <= 0.08) ? 'CONFORME' : 'ATENÇÃO'}</td>
                      </tr>
                    `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>

          <footer class="period-totals-ribbon">
            <div class="total-block label-block">TOTAL CONSOLIDADO</div>
            <div class="total-block green-block">${formatAnnexWeight(totProd)}</div>
            <div class="total-block blue-block">${formatAnnexWeight(totEcoBP)}</div>
            <div class="total-block purple-block">${formatAnnexWeight(totEcoBM)}</div>
            <div class="total-block dark-block">${formatAnnexWeight(totEcoB)}</div>
            <div class="total-block amber-block">Taxa Média: ${avgRate}</div>
            <div class="total-block losses-block">Eco B Total: ${formatAnnexWeight(totEcoB)}</div>
          </footer>

          <div class="footer-meta-row">
            <div class="footer-stamp">${metaStamp}</div>
            <div class="footer-slogan">${sloganText}</div>
          </div>

        </div>
      </div>
    `;
  }

  // CASO 3: DISTRIBUIÇÃO PROPORCIONAL DE PARADAS (bi-chart-stacked)
  if (chartType === 'bi-chart-stacked') {
    let totManut = 0;
    let totProc = 0;
    let totOutros = 0;
    let totGeral = 0;

    rowsData.forEach((item: any) => {
      totManut += Number(item.manut) || 0;
      totProc += Number(item.proc) || 0;
      totOutros += Number(item.outros) || 0;
      totGeral += Number(item.totalMin) || 0;
    });

    return `
      <div id="company-pdf-root" class="company-pdf-canvas">
        <div class="inner-company-panel">
          
          <header class="company-header-row">
            ${buildCompanyLogoHtml(details)}
            <div class="header-banner-block">
              <h1 class="header-banner-title">DISTRIBUIÇÃO PROPORCIONAL DE PARADAS</h1>
              <div class="header-banner-subtitle">${subtitleBanner}</div>
            </div>
          </header>

          <div class="subheader-legend-row">
            <div class="subheader-title">
              <span class="icon">📋</span> ANÁLISE DE INDISPONIBILIDADE E PERDAS DE PROCESSO
            </div>
            <div class="legend-badges">
              <span class="legend-badge purple-badge"><span class="badge-dot"></span>MANUTENÇÃO</span>
              <span class="legend-badge amber-badge"><span class="badge-dot"></span>PROCESSO</span>
              <span class="legend-badge cyan-badge"><span class="badge-dot"></span>OUTROS</span>
            </div>
          </div>

          <div class="table-container">
            <table class="company-data-table">
              <thead>
                <tr>
                  <th style="width: 25%;">ENTIDADE / LINHA</th>
                  <th style="width: 15%;">MANUTENÇÃO (%)</th>
                  <th style="width: 15%;">PROCESSO (%)</th>
                  <th style="width: 15%;">OUTROS (%)</th>
                  <th style="width: 15%;">TEMPO TOTAL</th>
                  <th style="width: 15%;">DISPONIBILIDADE</th>
                </tr>
              </thead>
              <tbody>
                ${rowsData
                  .map((item: any) => {
                    const totalMin = Number(item.totalMin) || 0;
                    return `
                      <tr>
                        <td class="cell-bold cell-dark" style="text-align: left; padding-left: 14px;">${item.name || '-'}</td>
                        <td class="cell-bold cell-purple">${item.manutPct || 0}%</td>
                        <td class="cell-bold cell-amber">${item.procPct || 0}%</td>
                        <td class="cell-bold cell-cyan">${item.outrosPct || 0}%</td>
                        <td class="cell-bold cell-dark">${totalMin} min</td>
                        <td class="cell-bold cell-green">${totalMin < 120 ? 'ALTA' : totalMin < 300 ? 'MÉDIA' : 'BAIXA'}</td>
                      </tr>
                    `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>

          <footer class="period-totals-ribbon">
            <div class="total-block label-block">TOTAL DE PARADAS</div>
            <div class="total-block purple-block">Manut: ${totManut} min</div>
            <div class="total-block amber-block">Proc: ${totProc} min</div>
            <div class="total-block cyan-block">Outros: ${totOutros} min</div>
            <div class="total-block losses-block">Total Parado: ${totGeral} min</div>
          </footer>

          <div class="footer-meta-row">
            <div class="footer-stamp">${metaStamp}</div>
            <div class="footer-slogan">${sloganText}</div>
          </div>

        </div>
      </div>
    `;
  }

  // CASO 4: CORTE DE FITA (ribbon-chart-composed, ribbon-chart-prod, ribbon-chart-waste)
  if (chartType?.startsWith('ribbon')) {
    let totProd = 0;
    let totWaste = 0;
    let totRolls = 0;

    rowsData.forEach((r: any) => {
      totProd += Number(r.prod) || Number(r.total) || 0;
      totWaste += Number(r.residuoWeight) || Number(r.totalWaste) || 0;
      totRolls += Number(r.rollsCount) || 0;
    });

    return `
      <div id="company-pdf-root" class="company-pdf-canvas">
        <div class="inner-company-panel">
          
          <header class="company-header-row">
            ${buildCompanyLogoHtml(details)}
            <div class="header-banner-block">
              <h1 class="header-banner-title">${title.toUpperCase()}</h1>
              <div class="header-banner-subtitle">${subtitleBanner}</div>
            </div>
          </header>

          <div class="subheader-legend-row">
            <div class="subheader-title">
              <span class="icon">📋</span> DETALHAMENTO OPERACIONAL DE CORTE DE FITA
            </div>
            <div class="legend-badges">
              <span class="legend-badge diurno-badge"><span class="badge-dot"></span>PRODUÇÃO (m²)</span>
              <span class="legend-badge amber-badge"><span class="badge-dot"></span>LIXO (Kg)</span>
            </div>
          </div>

          <div class="table-container">
            <table class="company-data-table">
              <thead>
                <tr>
                  <th style="width: 16%;">DATA / ITEM</th>
                  <th style="width: 18%;">PRODUÇÃO (m²)</th>
                  <th style="width: 14%;">ROLOS (un)</th>
                  <th style="width: 16%;">NÃO CONF. 1</th>
                  <th style="width: 16%;">NÃO CONF. 2</th>
                  <th style="width: 20%;">LIXO ACUMULADO</th>
                </tr>
              </thead>
              <tbody>
                ${rowsData
                  .map((r: any) => {
                    const dateStr = r.date ? r.date.split('-').reverse().join('/') : r.label || r.name || '-';
                    const prodM2 = Number(r.prod) || Number(r.total) || 0;
                    const rolls = Number(r.rollsCount) || 0;
                    const nc1 = Number(r.tipo1) || 0;
                    const nc2 = Number(r.tipo2) || 0;
                    const waste = Number(r.residuoWeight) || Number(r.totalWaste) || 0;

                    return `
                      <tr>
                        <td class="cell-bold cell-dark">${dateStr}</td>
                        <td class="cell-bold cell-green">${formatAnnexM2(prodM2)}</td>
                        <td class="cell-bold cell-cyan">${rolls.toLocaleString('pt-BR')} un</td>
                        <td class="cell-bold cell-amber">${formatAnnexM2(nc1)}</td>
                        <td class="cell-bold cell-purple">${formatAnnexM2(nc2)}</td>
                        <td class="cell-bold cell-red">${formatAnnexWeight(waste)}</td>
                      </tr>
                    `;
                  })
                  .join('')}
              </tbody>
            </table>
          </div>

          <footer class="period-totals-ribbon">
            <div class="total-block label-block">TOTAL DO PERÍODO FITA</div>
            <div class="total-block green-block">${formatAnnexM2(totProd)}</div>
            <div class="total-block cyan-block">${totRolls.toLocaleString('pt-BR')} rolos</div>
            <div class="total-block losses-block">Lixo Total: ${formatAnnexWeight(totWaste)}</div>
          </footer>

          <div class="footer-meta-row">
            <div class="footer-stamp">${metaStamp}</div>
            <div class="footer-slogan">${sloganText}</div>
          </div>

        </div>
      </div>
    `;
  }

  // CASO GENÉRICO / OUTROS GRÁFICOS
  return `
    <div id="company-pdf-root" class="company-pdf-canvas">
      <div class="inner-company-panel">
        
        <header class="company-header-row">
          ${buildCompanyLogoHtml(details)}
          <div class="header-banner-block">
            <h1 class="header-banner-title">${title.toUpperCase()}</h1>
            <div class="header-banner-subtitle">${subtitleBanner}</div>
          </div>
        </header>

        <div class="subheader-legend-row">
          <div class="subheader-title">
            <span class="icon">📋</span> RELATÓRIO ANALÍTICO INDUSTRIAL
          </div>
          <div class="legend-badges">
            <span class="legend-badge noturno-badge"><span class="badge-dot"></span>INDICADORES</span>
          </div>
        </div>

        <div class="table-container">
          <table class="company-data-table">
            <thead>
              <tr>
                <th style="width: 40%;">ITEM / PARÂMETRO</th>
                <th style="width: 30%;">VALOR REGISTRADO</th>
                <th style="width: 30%;">STATUS OPERACIONAL</th>
              </tr>
            </thead>
            <tbody>
              ${rowsData.length > 0 ? rowsData.map((d: any, idx: number) => `
                <tr>
                  <td class="cell-bold cell-dark" style="text-align: left; padding-left: 16px;">${d.name || d.label || d.date || `Item #${idx + 1}`}</td>
                  <td class="cell-bold cell-blue">${d.value !== undefined ? String(d.value) : d.prod ? formatAnnexWeight(d.prod) : '-'}</td>
                  <td class="cell-bold cell-green">CONFORME</td>
                </tr>
              `).join('') : `
                <tr>
                  <td class="cell-bold cell-dark">Operação Geral Fabril</td>
                  <td class="cell-bold cell-blue">100% Ativa</td>
                  <td class="cell-bold cell-green">ESTÁVEL</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>

        <footer class="period-totals-ribbon">
          <div class="total-block label-block">SISTEMA INTEGRADO</div>
          <div class="total-block blue-block">Manu Packaging Fitasa & Amazônia</div>
          <div class="total-block losses-block">Excelência Industrial</div>
        </footer>

        <div class="footer-meta-row">
          <div class="footer-stamp">${metaStamp}</div>
          <div class="footer-slogan">${sloganText}</div>
        </div>

      </div>
    </div>
  `;
}

/**
 * CSS Exato da Empresa (Cores, Fontes e Layout das Imagens Manu Packaging)
 */
export function getCompanyVisualStyles(): string {
  return `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Container exato em A4 Paisagem (1123px x 794px @ 96 DPI) */
    .company-pdf-canvas {
      position: relative;
      width: 1123px !important;
      height: 794px !important;
      min-width: 1123px !important;
      max-width: 1123px !important;
      min-height: 794px !important;
      max-height: 794px !important;
      overflow: hidden !important;
      background: linear-gradient(135deg, #0d2430 0%, #173e52 50%, #0d2430 100%);
      padding: 20px 24px 22px 24px;
      font-family: 'Barlow Condensed', -apple-system, sans-serif;
      user-select: none;
    }

    /* Painel interno claro com cantos arredondados e borda industrial */
    .inner-company-panel {
      position: relative;
      width: 100%;
      height: 100%;
      background: linear-gradient(180deg, #f0f5f8 0%, #e5eef3 100%);
      border: 4px solid #164054;
      border-radius: 20px;
      padding: 16px 22px 14px 22px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: inset 0 0 0 2px #d3e1eb, 0 10px 25px rgba(0,0,0,0.35);
    }

    /* ================= TOPO (LOGO + BANNER) ================= */
    .company-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 6px;
      flex-shrink: 0;
    }

    /* Logo da Manu Packaging */
    .company-logo-wrap {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .custom-brand-logo {
      max-height: 64px;
      max-width: 260px;
      object-fit: contain;
    }

    .manu-logo-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .manu-bars {
      display: flex;
      align-items: flex-end;
      gap: 4px;
    }

    .manu-bars .bar {
      width: 13px;
      height: 48px;
      background-color: #1d5b73;
      border-radius: 5px 2px 0 0;
      position: relative;
    }

    .manu-bars .bar-1::before {
      content: "";
      position: absolute;
      top: 0;
      left: -5px;
      width: 8px;
      height: 8px;
      background-color: #1d5b73;
      border-radius: 3px 0 0 0;
    }

    .manu-bars .bar-3::after {
      content: "";
      position: absolute;
      bottom: 0;
      right: -7px;
      width: 9px;
      height: 9px;
      background-color: #1d5b73;
      border-radius: 0 0 3px 0;
    }

    .manu-texts {
      display: flex;
      flex-direction: column;
      line-height: 0.95;
    }

    .manu-row {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .manu-name {
      font-family: 'Montserrat', sans-serif;
      font-weight: 700;
      font-size: 26px;
      color: #1d5b73;
      letter-spacing: -0.5px;
    }

    .manu-leaf {
      width: 20px;
      height: 18px;
      fill: #a59338;
    }

    .packaging-name {
      font-family: 'Montserrat', sans-serif;
      font-weight: 600;
      font-size: 28px;
      color: #1d5b73;
      letter-spacing: -0.5px;
    }

    .fitasa-subtitle {
      font-family: 'Montserrat', sans-serif;
      font-size: 11px;
      font-weight: 600;
      color: #1d5b73;
      letter-spacing: 1.5px;
      margin-top: 2px;
      text-transform: uppercase;
    }

    /* Banner azul escuro com cantos arredondados */
    .header-banner-block {
      background: linear-gradient(135deg, #123344 0%, #194a61 100%);
      border-radius: 14px;
      padding: 10px 24px;
      color: #ffffff;
      text-align: right;
      box-shadow: 0 4px 10px rgba(0,0,0,0.22);
      flex: 1;
      max-width: 720px;
    }

    .header-banner-title {
      font-family: 'Montserrat', sans-serif;
      font-size: 25px;
      font-weight: 800;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      line-height: 1.1;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .header-banner-subtitle {
      font-family: 'Montserrat', sans-serif;
      font-size: 14px;
      font-weight: 700;
      color: #9acd32;
      margin-top: 3px;
      letter-spacing: 0.4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ================= SUB-HEADER (LEGENDA) ================= */
    .subheader-legend-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
      flex-shrink: 0;
    }

    .subheader-title {
      font-size: 14px;
      font-weight: 800;
      color: #13394b;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .subheader-title .icon {
      font-size: 15px;
    }

    .legend-badges {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .legend-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 800;
      font-family: 'Montserrat', sans-serif;
      letter-spacing: 0.4px;
      color: #ffffff;
    }

    .noturno-badge {
      background-color: #1a5068;
    }

    .diurno-badge {
      background-color: #6da83c;
    }

    .purple-badge {
      background-color: #6366f1;
    }

    .amber-badge {
      background-color: #d97706;
    }

    .cyan-badge {
      background-color: #0284c7;
    }

    .badge-dot {
      width: 7px;
      height: 7px;
      background-color: #ffffff;
      border-radius: 50%;
    }

    /* ================= TABELA DE DADOS ================= */
    .table-container {
      flex: 1;
      width: 100%;
      border-radius: 12px;
      overflow: hidden;
      border: 2px solid #164054;
      background-color: #ffffff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
      display: flex;
      flex-direction: column;
    }

    .company-data-table {
      width: 100%;
      height: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .company-data-table thead tr {
      background-color: #164054;
      color: #ffffff;
      height: 36px;
    }

    .company-data-table th {
      padding: 6px 4px;
      text-align: center;
      font-weight: 800;
      font-family: 'Montserrat', sans-serif;
      font-size: 13px;
      letter-spacing: 0.3px;
      border-right: 1px solid rgba(255,255,255,0.22);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .company-data-table th:last-child {
      border-right: none;
    }

    .company-data-table tbody tr {
      border-bottom: 1px solid #d2e0e9;
    }

    .company-data-table tbody tr:nth-child(odd) {
      background-color: #ffffff;
    }

    .company-data-table tbody tr:nth-child(even) {
      background-color: #eef4f8;
    }

    .company-data-table td {
      padding: 3px 6px;
      text-align: center;
      vertical-align: middle;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      border-right: 1px solid #e2ebf1;
    }

    .company-data-table td:last-child {
      border-right: none;
    }

    /* Cores das métricas exatas do design */
    .cell-bold {
      font-weight: 800;
      font-family: 'Montserrat', sans-serif;
    }

    .cell-dark {
      color: #0f172a;
    }

    .cell-blue {
      color: #0284c7;
    }

    .cell-purple {
      color: #6366f1;
    }

    .cell-amber {
      color: #d97706;
    }

    .cell-green {
      color: #16a34a;
    }

    .cell-cyan {
      color: #0891b2;
    }

    .cell-red {
      color: #dc2626;
    }

    /* Barras de turnos Noturno / Diurno */
    .cell-shift-bars {
      padding: 3px 8px !important;
    }

    .shift-bars-stack {
      display: flex;
      flex-direction: column;
      gap: 3px;
      width: 100%;
      align-items: flex-start;
    }

    .shift-bar {
      border-radius: 8px;
      display: flex;
      align-items: center;
      padding: 0 10px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
      min-width: 90px;
      overflow: hidden;
    }

    .noturno-bar {
      background: linear-gradient(90deg, #1a5068 0%, #206785 100%);
    }

    .diurno-bar {
      background: linear-gradient(90deg, #5ea832 0%, #72be3c 100%);
    }

    .shift-bar-text {
      font-family: 'Montserrat', sans-serif;
      font-size: 10.5px;
      font-weight: 800;
      color: #ffffff;
      white-space: nowrap;
      letter-spacing: 0.3px;
    }

    /* ================= FAIXA DE TOTAIS DO PERÍODO ================= */
    .period-totals-ribbon {
      display: flex;
      align-items: stretch;
      height: 44px;
      background: #0d222d;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 3px 8px rgba(0,0,0,0.2);
      margin-top: 8px;
      border: 1px solid #1a4b63;
      flex-shrink: 0;
    }

    .total-block {
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Montserrat', sans-serif;
      font-weight: 800;
      color: #ffffff;
      padding: 0 14px;
      text-align: center;
      white-space: nowrap;
    }

    .label-block {
      background: #0f2736;
      font-size: 13px;
      letter-spacing: 0.5px;
      padding: 0 18px;
      border-right: 1px solid rgba(255,255,255,0.15);
    }

    .blue-block {
      background: #18526b;
      font-size: 14.5px;
      border-right: 1px solid rgba(255,255,255,0.15);
    }

    .purple-block {
      background: #4f46e5;
      font-size: 14.5px;
      border-right: 1px solid rgba(255,255,255,0.15);
    }

    .amber-block {
      background: #d97706;
      font-size: 14.5px;
      border-right: 1px solid rgba(255,255,255,0.15);
    }

    .green-block {
      background: #65a30d;
      font-size: 14.5px;
      border-right: 1px solid rgba(255,255,255,0.15);
    }

    .cyan-block {
      background: #0284c7;
      font-size: 14.5px;
      border-right: 1px solid rgba(255,255,255,0.15);
    }

    .dark-block {
      background: #1e293b;
      font-size: 14.5px;
      border-right: 1px solid rgba(255,255,255,0.15);
    }

    .losses-block {
      background: #091720;
      margin-left: auto;
      font-size: 14px;
      padding: 0 20px;
      color: #ffffff;
      border-left: 2px solid #204e66;
    }

    /* ================= RODAPÉ FINAL ================= */
    .footer-meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 6px;
      flex-shrink: 0;
    }

    .footer-stamp {
      font-size: 12px;
      font-weight: 700;
      color: #2b5066;
      letter-spacing: 0.4px;
      text-transform: uppercase;
    }

    .footer-slogan {
      font-size: 14px;
      font-weight: 800;
      color: #13394b;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
  `;
}

/**
 * Função de exportação para PDF em Formato A4 Paisagem (297 x 210 mm)
 * com 100% de ocupação da folha e visual oficial da empresa
 */
export async function downloadChartAsLandscapePDF(details: LandscapeChartExportDetails): Promise<boolean> {
  const { title } = details;

  // Container temporário fixo
  const container = document.createElement('div');
  container.id = 'company-pdf-render-canvas';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1123px';
  container.style.height = '794px';
  container.style.zIndex = '-9999';
  container.style.overflow = 'hidden';

  // Injeta estilos da empresa
  const styleEl = document.createElement('style');
  styleEl.innerHTML = getCompanyVisualStyles();
  container.appendChild(styleEl);

  const innerWrapper = document.createElement('div');
  innerWrapper.innerHTML = buildCompanyIndustrialPosterHtml(details);

  while (innerWrapper.firstChild) {
    container.appendChild(innerWrapper.firstChild);
  }

  document.body.appendChild(container);

  try {
    // Aguarda fontes
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Captura com html2canvas em Ultra HD
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0d2430',
      width: 1123,
      height: 794,
      windowWidth: 1123,
      windowHeight: 794,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // 100% da folha A4 Paisagem (297mm x 210mm)
    pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);

    const cleanTitle = (title || 'Relatorio_Grafico_ManuPackaging')
      .replace(/[^a-zA-Z0-9_\u00C0-\u00FF]/g, '_')
      .replace(/__+/g, '_');
    const fileName = `${cleanTitle}_${details.period || 'Periodo'}.pdf`;

    pdf.save(fileName);
    return true;
  } catch (err) {
    console.error('Erro ao gerar PDF da empresa:', err);
    alert('Não foi possível gerar o PDF da empresa. Por favor, tente novamente.');
    return false;
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

/**
 * Alias de compatibilidade
 */
export const exportarGraficoParaPDF = downloadChartAsLandscapePDF;
