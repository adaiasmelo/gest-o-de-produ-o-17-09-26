import pptxgen from 'pptxgenjs';

const getLogoDataUrl = async (): Promise<string> => {
  try {
    const res = await fetch('/assets/aistudio/ap_logo-ISO-Manuli__002__42f5b2f1.png');
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
};

export const exportBonusRulesPptx = async () => {
  const logoData = await getLogoDataUrl();
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE'; // 16:9 widescreen (13.33" x 7.5")
  pptx.author = 'Adaías Melo – Supervisor de Produção';
  pptx.company = 'Manupackaging';
  pptx.subject = 'Regras de Bonificação de Produção';
  pptx.title = 'Gestão de Bônus de Produção - Regras e Critérios';

  const BG_COLOR = 'F8FAFC';
  const CARD_BG = 'FFFFFF';
  const BORDER_COLOR = 'CBD5E1';
  const TEXT_DARK = '0F172A';
  const TEXT_MUTED = '334155';
  const AMBER = 'D97706';
  const EMERALD = '059669';
  const BLUE = '2563EB';
  const ROSE = 'DC2626';
  const PURPLE = '7C3AED';

  // Helper to add header to any slide filling the upper space
  const addSlideHeader = (slide: pptxgen.Slide, category: string, title: string, subtitle: string) => {
    slide.background = { color: BG_COLOR };

    // Category Pill
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.65, y: 0.28, w: 3.6, h: 0.38,
      rectRadius: 0.15,
      fill: { color: 'FEF3C7' },
      line: { color: 'FDE68A', width: 1 }
    });
    slide.addText(category.toUpperCase(), {
      x: 0.65, y: 0.28, w: 3.6, h: 0.38,
      fontSize: 11, bold: true, color: '92400E', align: 'center', valign: 'middle'
    });

    // Title
    slide.addText(title, {
      x: 0.65, y: 0.72, w: 10.6, h: 0.62,
      fontSize: 26, bold: true, color: TEXT_DARK
    });

    // Subtitle (Tamanho 14)
    slide.addText(subtitle, {
      x: 0.65, y: 1.36, w: 10.6, h: 0.38,
      fontSize: 14, color: TEXT_MUTED
    });

    // Logo ISO 9001 on top-right
    if (logoData) {
      slide.addImage({
        data: logoData,
        x: 11.5,
        y: 0.26,
        w: 1.32,
        h: 1.32
      });
    }

    // Supervisor Footer on bottom-right (Tamanho 14)
    slide.addText('Adaías Melo – Supervisor de Produção', {
      x: 7.0,
      y: 7.14,
      w: 5.68,
      h: 0.28,
      fontSize: 12,
      bold: true,
      color: '64748B',
      align: 'right'
    });
  };

  // ==========================================
  // SLIDE 1: INTRODUÇÃO
  // ==========================================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, 'Programa de Excelência', 'Gestão de Bônus de Produção', 'Manual Completo de Regras, Metas Operacionais e Critérios de Bonificação');

    // Left card
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.65, y: 1.82, w: 7.0, h: 5.24, rectRadius: 0.2,
      fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1.2 }
    });
    slide.addText('Reconhecer quem entrega performance real com disciplina e qualidade.', {
      x: 0.95, y: 2.05, w: 6.4, h: 1.05, fontSize: 22, bold: true, color: TEXT_DARK
    });
    slide.addText('O programa de bonificação da fábrica foi estruturado para recompensar a eficiência operacional nas condições reais de cada turno, equilibrando produtividade, redução de perdas técnicas e pontualidade da equipe.', {
      x: 0.95, y: 3.18, w: 6.4, h: 1.45, fontSize: 14, color: TEXT_MUTED
    });

    // 3 Metric Pills
    const metrics = [
      { label: 'Base de Bônus', val: 'R$ 300+', color: AMBER },
      { label: 'Turno de Trabalho', val: '12 Horas', color: EMERALD },
      { label: 'Avaliação', val: '100% Auditável', color: BLUE }
    ];
    metrics.forEach((m, i) => {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.95 + i * 2.13, y: 4.8, w: 2.05, h: 2.05, rectRadius: 0.15,
        fill: { color: 'F1F5F9' }, line: { color: BORDER_COLOR, width: 1 }
      });
      slide.addText(m.val, {
        x: 0.95 + i * 2.13, y: 5.05, w: 2.05, h: 0.85,
        fontSize: 22, bold: true, color: m.color, align: 'center'
      });
      slide.addText(m.label, {
        x: 0.95 + i * 2.13, y: 5.95, w: 2.05, h: 0.75,
        fontSize: 14, bold: true, color: TEXT_DARK, align: 'center'
      });
    });

    // Right card: 4 pillars
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 7.85, y: 1.82, w: 4.83, h: 5.24, rectRadius: 0.2,
      fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1.2 }
    });
    slide.addText('OS 4 PILARES DA BONIFICAÇÃO', {
      x: 8.15, y: 2.05, w: 4.25, h: 0.45, fontSize: 16, bold: true, color: AMBER
    });

    const pillars = [
      { n: '1', t: 'Velocidade & Meta da Máquina', d: 'kg/h na Extrusão e m² no Corte de Fita.' },
      { n: '2', t: 'Controle Rígido de Refugo', d: 'Tolerância de perdas de 8% (Eco A, Eco BP, Borra).' },
      { n: '3', t: 'Agilidade em Limpeza de Matriz', d: 'Até 30 minutos por parada individual.' },
      { n: '4', t: 'Disciplina & Honestidade', d: 'Pontualidade e tolerância zero a fraudes.' }
    ];
    pillars.forEach((p, i) => {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 8.15, y: 2.58 + i * 1.08, w: 4.23, h: 0.98, rectRadius: 0.12,
        fill: { color: 'F8FAFC' }, line: { color: BORDER_COLOR, width: 1 }
      });
      slide.addText(`${p.n}. ${p.t}`, {
        x: 8.35, y: 2.66 + i * 1.08, w: 3.9, h: 0.42, fontSize: 16, bold: true, color: TEXT_DARK
      });
      slide.addText(p.d, {
        x: 8.35, y: 3.08 + i * 1.08, w: 3.9, h: 0.44, fontSize: 14, color: TEXT_MUTED
      });
    });
  }

  // ==========================================
  // SLIDE 2: COMPARATIVO POR FUNÇÃO & CESTA BÁSICA (VR ALIMENTAÇÃO)
  // ==========================================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, 'Benefícios & VR Alimentação', 'Comparativo de Metas por Função & Cesta Básica', 'Evolução dos Valores de Bonificação e Saldo Total Depositado no Cartão VR Alimentação');

    // Top Explanatory Banner (Tamanho 14)
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.65, y: 1.82, w: 12.03, h: 0.95, rectRadius: 0.15,
      fill: { color: 'ECFDF5' }, line: { color: 'A7F3D0', width: 1.2 }
    });
    slide.addText('CESTA BÁSICA PADRONIZADA EM R$ 236,00 PARA TODOS OS COLABORADORES:\nA nova meta mensal atingida é somada à cesta básica fixa (R$ 236,00). O valor total resultante cai direto no cartão VR Alimentação do colaborador!', {
      x: 0.9, y: 1.9, w: 11.5, h: 0.78, fontSize: 14, bold: true, color: '065F46'
    });

    // Comparative Table (3 Linhas - Tamanho 14)
    const tableHeader = [
      { text: 'Função', options: { bold: true, fill: { color: 'F1F5F9' }, color: TEXT_DARK, align: 'left' } },
      { text: 'Setor', options: { bold: true, fill: { color: 'F1F5F9' }, color: TEXT_DARK, align: 'left' } },
      { text: 'Meta Antiga', options: { bold: true, fill: { color: 'F1F5F9' }, color: TEXT_MUTED, align: 'center' } },
      { text: 'Nova Meta', options: { bold: true, fill: { color: 'FEF3C7' }, color: '92400E', align: 'center' } },
      { text: 'Aumento (R$)', options: { bold: true, fill: { color: 'ECFDF5' }, color: '065F46', align: 'center' } },
      { text: 'Aumento (%)', options: { bold: true, fill: { color: 'ECFDF5' }, color: '065F46', align: 'center' } },
      { text: 'Cesta Básica', options: { bold: true, fill: { color: 'F8FAFC' }, color: TEXT_DARK, align: 'center' } },
      { text: 'Total no Cartão VR', options: { bold: true, fill: { color: '059669' }, color: 'FFFFFF', align: 'center' } }
    ];

    const tableRows = [
      tableHeader,
      [
        { text: 'Aux. de Produção', options: { bold: true } },
        { text: 'Extrusão/ Fita' },
        { text: 'R$ 100,00', options: { color: TEXT_MUTED, align: 'center' } },
        { text: 'R$ 250,00', options: { bold: true, color: AMBER, align: 'center' } },
        { text: '+ R$ 150,00', options: { bold: true, color: EMERALD, align: 'center' } },
        { text: '+ 150,0%', options: { bold: true, color: EMERALD, align: 'center' } },
        { text: '+ R$ 236,00', options: { align: 'center' } },
        { text: 'R$ 486,00', options: { bold: true, color: '065F46', fill: { color: 'ECFDF5' }, align: 'center' } }
      ],
      [
        { text: 'Op. de Extrusora', options: { bold: true } },
        { text: 'Extrusão' },
        { text: 'R$ 200,00', options: { color: TEXT_MUTED, align: 'center' } },
        { text: 'R$ 300,00', options: { bold: true, color: BLUE, align: 'center' } },
        { text: '+ R$ 100,00', options: { bold: true, color: EMERALD, align: 'center' } },
        { text: '+ 50,0%', options: { bold: true, color: EMERALD, align: 'center' } },
        { text: '+ R$ 236,00', options: { align: 'center' } },
        { text: 'R$ 536,00', options: { bold: true, color: '1E3A8A', fill: { color: 'EFF6FF' }, align: 'center' } }
      ],
      [
        { text: 'Operador I', options: { bold: true } },
        { text: 'Corte de Fita' },
        { text: 'R$ 150,00', options: { color: TEXT_MUTED, align: 'center' } },
        { text: 'R$ 300,00', options: { bold: true, color: BLUE, align: 'center' } },
        { text: '+ R$ 150,00', options: { bold: true, color: EMERALD, align: 'center' } },
        { text: '+ 100,0%', options: { bold: true, color: EMERALD, align: 'center' } },
        { text: '+ R$ 236,00', options: { align: 'center' } },
        { text: 'R$ 536,00', options: { bold: true, color: '1E3A8A', fill: { color: 'EFF6FF' }, align: 'center' } }
      ]
    ];

    slide.addTable(tableRows as any, {
      x: 0.65, y: 2.88, w: 12.03, h: 2.35,
      fontSize: 14,
      border: { pt: 1, color: BORDER_COLOR },
      fill: { color: CARD_BG }
    });

    // 2 Quick Summary Cards (Títulos 16, Textos 14)
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.65, y: 5.38, w: 5.9, h: 1.68, rectRadius: 0.15,
      fill: { color: 'FEF3C7' }, line: { color: 'FDE68A', width: 1.2 }
    });
    slide.addText('AUXILIARES DE PRODUÇÃO (TODOS OS SETORES)', { x: 0.9, y: 5.52, w: 5.4, h: 0.38, fontSize: 16, bold: true, color: '92400E' });
    slide.addText('Nova Meta: R$ 250,00 + Cesta Básica: R$ 236,00\n➔ VALOR NO CARTÃO VR ALIMENTAÇÃO: R$ 486,00', {
      x: 0.9, y: 5.95, w: 5.4, h: 0.95, fontSize: 14, bold: true, color: TEXT_DARK
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.78, y: 5.38, w: 5.9, h: 1.68, rectRadius: 0.15,
      fill: { color: 'EFF6FF' }, line: { color: 'BFDBFE', width: 1.2 }
    });
    slide.addText('OPERADORES I (EXTRUSÃO E CORTE DE FITA)', { x: 7.05, y: 5.52, w: 5.4, h: 0.38, fontSize: 16, bold: true, color: '1E3A8A' });
    slide.addText('Nova Meta: R$ 300,00 + Cesta Básica: R$ 236,00\n➔ VALOR NO CARTÃO VR ALIMENTAÇÃO: R$ 536,00', {
      x: 7.05, y: 5.95, w: 5.4, h: 0.95, fontSize: 14, bold: true, color: TEXT_DARK
    });
  }

  // ==========================================
  // SLIDE 3: QUILO-HORA EXTRUSÃO (TOLERÂNCIA 8%)
  // ==========================================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, 'Extrusão (Cast 1 e Cast 2)', 'A Meta Baseada nas Condições Reais do Turno', 'Aferição Dinâmica em Quilo-Hora (kg/h) em Função do Material e Velocidade');

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.65, y: 1.82, w: 12.03, h: 1.0, rectRadius: 0.15,
      fill: { color: 'EFF6FF' }, line: { color: 'BFDBFE', width: 1.2 }
    });
    slide.addText('Regra Fundamental: A meta é vinculada aos kg/h reais que a máquina está rodando naquele turno de 12 horas. Isso considera o material que está sendo puxado (LC3, LC2, ATX) e as velocidades nominais de processo com tolerância oficial de perda fixada em 8,0%.', {
      x: 0.9, y: 1.9, w: 11.5, h: 0.82, fontSize: 14, bold: true, color: '1E3A8A'
    });

    // Cast 1 Card
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.65, y: 2.95, w: 5.9, h: 4.1, rectRadius: 0.2,
      fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1.2 }
    });
    slide.addText('CAST 1 (EXEMPLO PRÁTICO)', { x: 0.95, y: 3.12, w: 5.3, h: 0.4, fontSize: 16, bold: true, color: AMBER });
    slide.addText('1.000 kg/h', { x: 0.95, y: 3.55, w: 5.3, h: 0.8, fontSize: 34, bold: true, color: TEXT_DARK });
    slide.addText('Material Stretch LC3 rodando a 1.000 kg/h no turno de 12 horas:', { x: 0.95, y: 4.4, w: 5.3, h: 0.45, fontSize: 14, color: TEXT_MUTED });
    slide.addText('• Produção Teórica (12h): 12.000 Kg\n• Tolerância de Perdas (8,0%): - 960 Kg\n• Meta Líquida a Produzir: 11.040 Kg', {
      x: 0.95, y: 4.95, w: 5.3, h: 1.95, fontSize: 15, bold: true, color: TEXT_DARK
    });

    // Cast 2 Card
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.78, y: 2.95, w: 5.9, h: 4.1, rectRadius: 0.2,
      fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1.2 }
    });
    slide.addText('CAST 2 (EXEMPLO PRÁTICO)', { x: 7.08, y: 3.12, w: 5.3, h: 0.4, fontSize: 16, bold: true, color: BLUE });
    slide.addText('850 kg/h', { x: 7.08, y: 3.55, w: 5.3, h: 0.8, fontSize: 34, bold: true, color: TEXT_DARK });
    slide.addText('Material Stretch LC2 / ATX rodando a 850 kg/h no turno de 12 horas:', { x: 7.08, y: 4.4, w: 5.3, h: 0.45, fontSize: 14, color: TEXT_MUTED });
    slide.addText('• Produção Teórica (12h): 10.200 Kg\n• Tolerância de Perdas (8,0%): - 816 Kg\n• Meta Líquida a Produzir: 9.384 Kg', {
      x: 7.08, y: 4.95, w: 5.3, h: 1.95, fontSize: 15, bold: true, color: TEXT_DARK
    });
  }

  // ==========================================
  // SLIDE 4: TOLERÂNCIA DE PERDAS (8%)
  // ==========================================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, 'Regra de Refugo', 'Tolerância de Perdas de Produção (Fixada em 8%)', 'Como o Limite de Refugo é Calculado para Proteger a Meta Líquida');

    const losses = [
      { t: '1. Eco A (Isento até 8%)', d: 'O refugo de Eco A só gera perda se ultrapassar 8% da produção do dia. Se for até 8%, é 100% isento e não causa desconto de bônus!' },
      { t: '2. Eco BP (Produção)', d: 'Eco B gerado por intervenção ou ajuste operacional. Conta diretamente na tolerância de perdas de produção.' },
      { t: '3. Borra Total', d: 'Material de purga e início de operação. Contabilizado no cômputo geral de perda técnica do turno.' }
    ];
    losses.forEach((l, i) => {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.65 + i * 4.1, y: 1.82, w: 3.85, h: 3.25, rectRadius: 0.2,
        fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1.2 }
      });
      slide.addText(l.t, { x: 0.85 + i * 4.1, y: 2.05, w: 3.45, h: 0.45, fontSize: 16, bold: true, color: TEXT_DARK });
      slide.addText(l.d, { x: 0.85 + i * 4.1, y: 2.65, w: 3.45, h: 2.25, fontSize: 14, color: TEXT_MUTED });
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.65, y: 5.2, w: 12.03, h: 1.85, rectRadius: 0.2,
      fill: { color: 'ECFDF5' }, line: { color: 'A7F3D0', width: 1.2 }
    });
    slide.addText('REGRA ESPECIAL DE TOLERÂNCIA ESTABELECIDA EM 8,0%:', { x: 0.95, y: 5.35, w: 11.4, h: 0.4, fontSize: 16, bold: true, color: '065F46' });
    slide.addText('A média de tolerância de perdas para a extrusão é fixada e estabelecida em 8,0% sobre o volume do turno. O refugo de ECOA somente terá desconto de bônus se ultrapassar 8% da produção do dia. Mantendo as perdas totais avaliadas dentro do teto de 8,0%, o colaborador mantém a bonificação integral.', {
      x: 0.95, y: 5.82, w: 11.4, h: 1.1, fontSize: 14, color: '047857'
    });
  }

  // ==========================================
  // SLIDE 5: ISENÇÃO DO ECOBM
  // ==========================================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, 'Regra de Ouro da Extrusão', 'Isenção de ECOBM (Manutenção)', 'Refugo Decorrente de Problemas Mecânicos ou Elétricos Não Prejudica o Operador');

    // Left Explanation
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.65, y: 1.82, w: 5.9, h: 5.24, rectRadius: 0.2,
      fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1.2 }
    });
    slide.addText('O que é ECOBM?', { x: 0.95, y: 2.05, w: 5.3, h: 0.5, fontSize: 20, bold: true, color: TEXT_DARK });
    slide.addText('ECOBM significa Eco B de Manutenção. É todo refugo gerado por quebras técnicas, trocas de peças, reparos elétricos ou problemas na infraestrutura da máquina.\n\nREGRA MANDATÓRIA:\nO ECOBM é 100% ISENTO da avaliação do operador. Ele é registrado para controle da manutenção, mas no cálculo do bônus ele é COMPLETAMENTE DESCONSIDERADO.', {
      x: 0.95, y: 2.7, w: 5.3, h: 4.15, fontSize: 14, color: TEXT_MUTED
    });

    // Right Comparison Cards
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.78, y: 1.82, w: 5.9, h: 2.52, rectRadius: 0.2,
      fill: { color: 'FEF2F2' }, line: { color: 'FECACA', width: 1.2 }
    });
    slide.addText('ECOBP (Produção) - CONTA NA META', { x: 7.08, y: 2.02, w: 5.3, h: 0.42, fontSize: 16, bold: true, color: ROSE });
    slide.addText('Refugo gerado por erro operacional, bobinamento torto ou ajuste de produção. Desconta da meta se passar do limite de tolerância estabelecido (8%).', {
      x: 7.08, y: 2.52, w: 5.3, h: 1.65, fontSize: 14, color: '991B1B'
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.78, y: 4.54, w: 5.9, h: 2.52, rectRadius: 0.2,
      fill: { color: 'ECFDF5' }, line: { color: 'A7F3D0', width: 1.2 }
    });
    slide.addText('ECOBM (Manutenção) - 100% ISENTO', { x: 7.08, y: 4.74, w: 5.3, h: 0.42, fontSize: 16, bold: true, color: EMERALD });
    slide.addText('Refugo gerado por parada de motor, quebra mecânica, falha de aquecimento ou manutenção preventiva. Totalmente isento no bônus.', {
      x: 7.08, y: 5.24, w: 5.3, h: 1.65, fontSize: 14, color: '065F46'
    });
  }

  // ==========================================
  // SLIDE 6: PARADAS DE LIMPEZA E REGRA DE RANKING & BÔNUS
  // ==========================================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, 'Paradas na Extrusão', 'Paradas de Máquina & Limpeza Obrigatória', 'Regra dos 30 Minutos (Desconto se Ultrapassar) e Limpeza a Menos (-50% no Ranking e -20% no Bônus)');

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.65, y: 1.82, w: 5.9, h: 2.75, rectRadius: 0.2,
      fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1.2 }
    });
    slide.addText('APENAS LIMPEZA DE MATRIZ E MÁQUINA', { x: 0.95, y: 2.02, w: 5.3, h: 0.42, fontSize: 16, bold: true, color: AMBER });
    slide.addText('Na Extrusão, paradas de manutenção mecânica, elétrica ou falta de energia NÃO tiram a meta do operador.\n\nA ÚNICA parada avaliada para perda de bônus é a parada para limpeza de matriz, cabeçote, roscas ou rolos.', {
      x: 0.95, y: 2.52, w: 5.3, h: 1.9, fontSize: 14, color: TEXT_MUTED
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.78, y: 1.82, w: 5.9, h: 2.75, rectRadius: 0.2,
      fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1.2 }
    });
    slide.addText('LIMITE: 30 MINUTOS (DESCONTO NO BÔNUS SE PASSAR)', { x: 7.08, y: 2.02, w: 5.3, h: 0.42, fontSize: 15, bold: true, color: ROSE });
    slide.addText('O limite é 30 minutos no máximo por evento individual de limpeza. Se qualquer parada de limpeza exceder 30 minutos, o turno perde a meta de parada e sofre DESCONTO NO BÔNUS DE PRODUÇÃO!\nSe durar até 30 min, o operador está 100% aprovado.', {
      x: 7.08, y: 2.52, w: 5.3, h: 1.9, fontSize: 14, color: TEXT_MUTED
    });

    // Ranking and Bonus penalty block
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.65, y: 4.75, w: 12.03, h: 2.3, rectRadius: 0.2,
      fill: { color: 'FEF2F2' }, line: { color: 'FECACA', width: 1.2 }
    });
    slide.addText('LIMPEZA OBRIGATÓRIA NÃO REALIZADA ➔ -50% NO RANKING E -20% NO BÔNUS', {
      x: 0.95, y: 4.95, w: 11.4, h: 0.42, fontSize: 16, bold: true, color: ROSE
    });
    slide.addText('Se for determinada uma quantidade de paradas para limpeza no turno (ex.: 2 paradas de limpeza obrigatórias) e o operador realizar menos (ex.: apenas 1 parada):\n• 📉 Desconto de 50% na produção líquida do dia no Ranking de Produtividade (anula a vantagem indevida de volume).\n• 💰 Desconto de 20% diretamente na Bonificação de Produção mensal do operador.\n• 📊 Relatórios contábeis e faturamento mantêm 100% dos quilos reais produzidos na fábrica.', {
      x: 0.95, y: 5.42, w: 11.4, h: 1.5, fontSize: 14, color: '991B1B'
    });
  }

  // ==========================================
  // SLIDE 7: CORTE DE FITA
  // ==========================================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, 'Setor de Corte de Fita', 'Regras do Setor de Corte de Fita (Rebobinadeiras)', 'Metas Expressas em Metros Quadrados (m²) com Abatimento de Tipo 1, Tipo 2 e Lixo');

    const machs = [
      { m: 'Ghezzi', g: '60.000 m²', d: 'Meta diária padrão de referência por turno.' },
      { m: 'Lintech', g: '50.000 m²', d: 'Meta diária padrão de referência por turno.' },
      { m: 'Wultec', g: '40.000 m²', d: 'Meta diária padrão de referência por turno.' }
    ];
    machs.forEach((item, i) => {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.65 + i * 4.1, y: 1.82, w: 3.85, h: 2.75, rectRadius: 0.2,
        fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1.2 }
      });
      slide.addText(item.m, { x: 0.85 + i * 4.1, y: 2.02, w: 3.45, h: 0.42, fontSize: 16, bold: true, color: PURPLE });
      slide.addText(item.g, { x: 0.85 + i * 4.1, y: 2.48, w: 3.45, h: 0.8, fontSize: 30, bold: true, color: TEXT_DARK });
      slide.addText(item.d, { x: 0.85 + i * 4.1, y: 3.38, w: 3.45, h: 1.0, fontSize: 14, color: TEXT_MUTED });
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.65, y: 4.75, w: 12.03, h: 2.3, rectRadius: 0.2,
      fill: { color: 'FAF5FF' }, line: { color: 'E9D5FF', width: 1.2 }
    });
    slide.addText('ABATIMENTO DE PERDAS NO CORTE DE FITA:', { x: 0.95, y: 4.95, w: 11.4, h: 0.42, fontSize: 16, bold: true, color: '6B21A8' });
    slide.addText('• Perda Tipo 1 (m²): Abate diretamente da metragem atingida no dia.\n• Perda Tipo 2 (m²): Abate diretamente da metragem atingida no dia.\n• Lixo / Refugo (kg ➔ m²): O peso em kg é convertido em m² pela gramatura do jumbo e abatido da meta.', {
      x: 0.95, y: 5.45, w: 11.4, h: 1.45, fontSize: 14, color: TEXT_DARK
    });
  }

  // ==========================================
  // SLIDE 8: CRITÉRIOS DE FECHAMENTO MENSAL - QUALIDADE
  // ==========================================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, '2. Qualidade', 'Critérios de Qualidade & Apontamentos', 'Regras de Fechamento Mensal: Impacto de Devoluções, Reclamações e Registros');

    const qualityItems = [
      {
        t: 'Erro Operacional (Devolução)',
        p: 'Perde até 20% da meta',
        d: 'Lote devolvido pelo cliente decorrente de erro do operador (espessura fora do padrão, bobinamento torto ou contaminação).'
      },
      {
        t: '1 Reclamação Interna',
        p: 'Perde até 20% da meta',
        d: 'Não conformidade técnica registrada pelo controle de qualidade interno, expedição ou retrabalho gerado para o setor posterior.'
      },
      {
        t: 'Matéria-Prima Molhada',
        p: 'Perde 20% da meta',
        d: 'Abastecimento com matéria-prima molhada decorrente de falta de atenção do auxiliar durante a operação.'
      },
      {
        t: 'Mau Preenchimento',
        p: 'Perde 10% da meta',
        d: 'Omissão de paradas, dados incompletos de produção, rasuras ou falta de lançamento correto no sistema no final do turno.'
      }
    ];

    qualityItems.forEach((q, i) => {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.65 + i * 3.05, y: 1.82, w: 2.9, h: 4.15, rectRadius: 0.2,
        fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1.2 }
      });
      slide.addText(q.t, { x: 0.8 + i * 3.05, y: 2.02, w: 2.6, h: 0.6, fontSize: 16, bold: true, color: TEXT_DARK });
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8 + i * 3.05, y: 2.72, w: 2.6, h: 0.55, rectRadius: 0.1,
        fill: { color: 'EEF2FF' }, line: { color: 'C7D2FE', width: 1 }
      });
      slide.addText(q.p, { x: 0.8 + i * 3.05, y: 2.78, w: 2.6, h: 0.45, fontSize: 14, bold: true, color: '3730A3', align: 'center' });
      slide.addText(q.d, { x: 0.8 + i * 3.05, y: 3.42, w: 2.6, h: 2.4, fontSize: 14, color: TEXT_MUTED });
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.65, y: 6.15, w: 12.03, h: 0.9, rectRadius: 0.15,
      fill: { color: 'F1F5F9' }, line: { color: BORDER_COLOR, width: 1.2 }
    });
    slide.addText('Conferência diária: Todos os apontamentos de produção devem ser validados pelo líder de turno diariamente antes do fechamento.', {
      x: 0.95, y: 6.25, w: 11.4, h: 0.65, fontSize: 14, bold: true, color: TEXT_MUTED, align: 'center'
    });
  }

  // ==========================================
  // SLIDE 9: CRITÉRIOS DE FECHAMENTO MENSAL - ASSIDUIDADE & PONTUALIDADE
  // ==========================================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, '3. Assiduidade & Horários', 'Assiduidade, Faltas, Advertências e Horários', 'Regras de Fechamento Mensal: Presença e Cumprimento Rígido da Jornada');

    // 3 Zero Tolerance Pills
    const zeroPills = [
      { t: '1 Atestado Médico', r: 'PERDE A META', d: '100% de desconto no bônus do mês.' },
      { t: '1 Falta Injustificada', r: 'PERDE A META', d: '100% de desconto no bônus do mês.' },
      { t: '1 Advertência por Escrito', r: 'PERDE A META', d: '100% de desconto no bônus do mês.' }
    ];
    zeroPills.forEach((p, i) => {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.65 + i * 4.1, y: 1.82, w: 3.85, h: 2.45, rectRadius: 0.2,
        fill: { color: 'FEF2F2' }, line: { color: 'FECACA', width: 1.2 }
      });
      slide.addText(p.t, { x: 0.85 + i * 4.1, y: 2.02, w: 3.45, h: 0.42, fontSize: 16, bold: true, color: '991B1B' });
      slide.addText(p.r, { x: 0.85 + i * 4.1, y: 2.48, w: 3.45, h: 0.7, fontSize: 22, bold: true, color: ROSE });
      slide.addText(p.d, { x: 0.85 + i * 4.1, y: 3.28, w: 3.45, h: 0.85, fontSize: 14, color: '7F1D1D' });
    });

    // Delays and Overtime
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.65, y: 4.1, w: 5.9, h: 1.55, rectRadius: 0.15,
      fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1.2 }
    });
    slide.addText('ATRASOS INJUSTIFICADOS', { x: 0.95, y: 4.22, w: 5.3, h: 0.32, fontSize: 15, bold: true, color: AMBER });
    slide.addText('A cada 10 minutos de atraso ➔ Perde 1% da meta\nExemplo: 30 minutos acumulados no mês = 3% de perda no bônus.', {
      x: 0.95, y: 4.6, w: 5.3, h: 0.95, fontSize: 13, color: TEXT_MUTED
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.78, y: 4.1, w: 5.9, h: 1.55, rectRadius: 0.15,
      fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1.2 }
    });
    slide.addText('HORAS EXTRAS NÃO AUTORIZADAS', { x: 7.08, y: 4.22, w: 5.3, h: 0.32, fontSize: 15, bold: true, color: AMBER });
    slide.addText('A cada 10 minutos de HE não autorizada ➔ Perde 1% da meta\nPermanecer no posto além da jornada sem autorização formal acarreta desconto.', {
      x: 7.08, y: 4.6, w: 5.3, h: 0.95, fontSize: 13, color: TEXT_MUTED
    });

    // Saídas Fora do Horário (Avisando vs Sem Avisar)
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.65, y: 5.8, w: 5.9, h: 1.3, rectRadius: 0.15,
      fill: { color: 'FEF3C7' }, line: { color: 'FDE68A', width: 1.2 }
    });
    slide.addText('SAÍDA FORA DO HORÁRIO COMUNICADA (COM AVISO)', { x: 0.95, y: 5.92, w: 5.3, h: 0.32, fontSize: 14, bold: true, color: '92400E' });
    slide.addText('➔ Desconto de 10% a 15% na bonificação do mês.\nSaída antecipada devidamente informada e validada pela liderança imediata.', {
      x: 0.95, y: 6.28, w: 5.3, h: 0.72, fontSize: 13, color: '78350F'
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.78, y: 5.8, w: 5.9, h: 1.3, rectRadius: 0.15,
      fill: { color: 'FEF2F2' }, line: { color: 'FECACA', width: 1.2 }
    });
    slide.addText('SAÍDA FORA DO HORÁRIO SEM AVISAR (ABANDONO)', { x: 7.08, y: 5.92, w: 5.3, h: 0.32, fontSize: 14, bold: true, color: ROSE });
    slide.addText('➔ Desconto severo de 35% a 50% na bonificação do mês.\nDeixar o posto de trabalho sem avisar a liderança do turno.', {
      x: 7.08, y: 6.28, w: 5.3, h: 0.72, fontSize: 13, color: '991B1B'
    });
  }

  // ==========================================
  // SLIDE 10: CRITÉRIOS DE FECHAMENTO MENSAL - COMPORTAMENTO & SEGURANÇA
  // ==========================================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, '4. Comportamento & Segurança', 'Comportamento no Trabalho & Normas de Segurança', 'Uso de Celular, Tabagismo em Área Proibida e Cumprimento Obrigatório de EPIs');

    const safetyItems = [
      {
        t: 'Uso de Celular no Trabalho',
        first: '1ª Ocorrência: Perde 20% da meta',
        rec: 'Reincidente: Perde 100% da meta',
        d: 'Proibido uso de celular ou fones em operação (risco severo de acidentes e distração).'
      },
      {
        t: 'Fumar no Período de Trabalho',
        first: '1ª Ocorrência: Perde 20% da meta',
        rec: 'Reincidente: Perde 100% da meta',
        d: 'Tabagismo fora das áreas expressamente designadas. Infração grave contra segurança de incêndio.'
      },
      {
        t: 'Não Uso de EPIs Obrigatórios',
        first: '1ª Ocorrência: Perde 20% da meta',
        rec: 'Reincidente: Perde 100% da meta',
        d: 'Uso mandatório de protetor auricular, calçado com biqueira, luvas e óculos no ambiente fabril.'
      }
    ];

    safetyItems.forEach((s, i) => {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.65 + i * 4.1, y: 1.82, w: 3.85, h: 5.24, rectRadius: 0.2,
        fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1.2 }
      });
      slide.addText(s.t, { x: 0.85 + i * 4.1, y: 2.05, w: 3.45, h: 0.5, fontSize: 16, bold: true, color: TEXT_DARK });

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.85 + i * 4.1, y: 2.75, w: 3.45, h: 0.65, rectRadius: 0.1,
        fill: { color: 'FEF3C7' }, line: { color: 'FDE68A', width: 1 }
      });
      slide.addText(s.first, { x: 0.85 + i * 4.1, y: 2.82, w: 3.45, h: 0.5, fontSize: 14, bold: true, color: '92400E', align: 'center' });

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.85 + i * 4.1, y: 3.55, w: 3.45, h: 0.65, rectRadius: 0.1,
        fill: { color: 'FEF2F2' }, line: { color: 'FECACA', width: 1 }
      });
      slide.addText(s.rec, { x: 0.85 + i * 4.1, y: 3.62, w: 3.45, h: 0.5, fontSize: 14, bold: true, color: ROSE, align: 'center' });

      slide.addText(s.d, { x: 0.85 + i * 4.1, y: 4.45, w: 3.45, h: 2.4, fontSize: 14, color: TEXT_MUTED });
    });
  }

  // ==========================================
  // SLIDE 11: INFORMAÇÃO FALSA (-100%)
  // ==========================================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, 'Ética & Fraude', 'Tolerância Zero: Informação Falsa / Fraude', 'Manipulação de Apontamentos ou Declarações Inverídicas = 100% de Desconto Imediato');

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.65, y: 1.82, w: 4.8, h: 5.24, rectRadius: 0.2,
      fill: { color: 'FEF2F2' }, line: { color: 'FECACA', width: 1.2 }
    });
    slide.addText('DESQUALIFICAÇÃO IMEDIATA (-100%)', { x: 0.95, y: 2.15, w: 4.2, h: 0.8, fontSize: 20, bold: true, color: ROSE });
    slide.addText('O sistema possui auditoria cruzada por balanças eletrônicas, câmeras do circuito interno e registros de CLP.\n\nA tentativa de burlar as regras resulta em perda imediata e irrecorrível de 100% do bônus no ciclo.', {
      x: 0.95, y: 3.1, w: 4.2, h: 3.65, fontSize: 14, color: '991B1B'
    });

    const frauds = [
      { t: 'Desvio de Refugo para Manutenção (ECOBM)', d: 'Pegar o refugo gerado por erro operacional (Eco BP) e classificar como ECOBM Manutenção para não estourar a meta.' },
      { t: 'Declaração Falsa de Parada Automática', d: 'Afirmar que a máquina quebrou em processo automático quando as câmeras/CLP comprovam negligência ou ação indevida.' },
      { t: 'Fraude em Tara, Peso ou Metragem', d: 'Lançar pesos inexistentes, taras incorretas de bobinas ou metragens falsas de corte para simular cumprimento da meta.' }
    ];
    frauds.forEach((f, i) => {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 5.75, y: 1.82 + i * 1.78, w: 6.93, h: 1.62, rectRadius: 0.15,
        fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1.2 }
      });
      slide.addText(f.t, { x: 6.05, y: 1.98 + i * 1.78, w: 6.35, h: 0.42, fontSize: 16, bold: true, color: TEXT_DARK });
      slide.addText(f.d, { x: 6.05, y: 2.45 + i * 1.78, w: 6.35, h: 0.9, fontSize: 14, color: TEXT_MUTED });
    });
  }

  // ==========================================
  // SLIDE 12: CONCLUSÃO & 5 CHAVES (CENTRALIZADAS NO MEIO DA TELA)
  // ==========================================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, 'Compromisso com o Sucesso', 'Conclusão: As 5 Chaves do Operador Nota 10', 'Resumo das Melhores Práticas para Garantir a Bonificação Máxima Todos os Meses');

    const keys = [
      { n: '1', t: 'Velocidade', d: 'Manter a máquina rodando nos kg/h recomendados para o material.' },
      { n: '2', t: 'Refugo Baixo', d: 'Operar com atenção para manter perdas abaixo do teto de tolerância fixado em 8% (Eco A ≤ 8%).' },
      { n: '3', t: 'Limpeza Ágil', d: 'Cumprir paradas obrigatórias sem nunca passar de 30 min por evento.' },
      { n: '4', t: 'Pontualidade', d: 'Cumprir a jornada integral, zelar por EPIs e comunicar a liderança.' },
      { n: '5', t: 'Honestidade', d: 'Apontar 100% da verdade no sistema. A confiança operacional é inegociável.' }
    ];
    keys.forEach((k, i) => {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.65 + i * 2.45, y: 2.15, w: 2.3, h: 3.25, rectRadius: 0.15,
        fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1.2 }
      });
      slide.addText(k.n, { x: 0.85 + i * 2.45, y: 2.32, w: 1.9, h: 0.55, fontSize: 26, bold: true, color: AMBER, align: 'center' });
      slide.addText(k.t, { x: 0.85 + i * 2.45, y: 2.92, w: 1.9, h: 0.42, fontSize: 16, bold: true, color: TEXT_DARK, align: 'center' });
      slide.addText(k.d, { x: 0.8 + i * 2.45, y: 3.42, w: 2.0, h: 1.85, fontSize: 14, color: TEXT_MUTED, align: 'center' });
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.65, y: 5.65, w: 12.03, h: 1.45, rectRadius: 0.2,
      fill: { color: 'FEF3C7' }, line: { color: 'FDE68A', width: 1.2 }
    });
    slide.addText('MUITO OBRIGADO PELA ATENÇÃO E DEDICAÇÃO DE TODOS!', {
      x: 0.95, y: 5.8, w: 11.4, h: 0.45, fontSize: 18, bold: true, color: '92400E', align: 'center'
    });
    slide.addText('Produzir com qualidade, segurança e disciplina é o nosso maior valor.\nContamos com o compromisso e profissionalismo de toda a equipe para superarmos todas as metas!', {
      x: 0.95, y: 6.3, w: 11.4, h: 0.65, fontSize: 14, color: 'B45309', align: 'center'
    });
  }

  await pptx.writeFile({ fileName: 'Regras_Bonus_Producao_Manupackaging.pptx' });
};
