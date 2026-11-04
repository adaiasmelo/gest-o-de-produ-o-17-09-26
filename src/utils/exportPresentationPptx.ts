import pptxgen from 'pptxgenjs';

export const exportBonusRulesPptx = async () => {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE'; // 16:9 widescreen
  pptx.author = 'Manupackaging';
  pptx.company = 'Manupackaging';
  pptx.subject = 'Regras de Bonificação de Produção';
  pptx.title = 'Gestão de Bônus de Produção - Regras e Critérios';

  const BG_COLOR = 'F8FAFC'; // Clean light off-white background
  const CARD_BG = 'FFFFFF';
  const BORDER_COLOR = 'E2E8F0';
  const TEXT_DARK = '0F172A';
  const TEXT_MUTED = '475569';
  const AMBER = 'D97706';
  const EMERALD = '059669';
  const BLUE = '2563EB';
  const ROSE = 'DC2626';
  const PURPLE = '7C3AED';

  // Helper to add header to any slide
  const addSlideHeader = (slide: pptxgen.Slide, category: string, title: string, subtitle: string) => {
    slide.background = { color: BG_COLOR };

    // Category Pill
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 0.4, w: 2.8, h: 0.32,
      rectRadius: 0.15,
      fill: { color: 'FEF3C7' },
      line: { color: 'FDE68A', width: 1 }
    });
    slide.addText(category.toUpperCase(), {
      x: 0.8, y: 0.4, w: 2.8, h: 0.32,
      fontSize: 9, bold: true, color: '92400E', align: 'center', valign: 'middle'
    });

    // Title
    slide.addText(title, {
      x: 0.8, y: 0.8, w: 11.5, h: 0.55,
      fontSize: 22, bold: true, color: TEXT_DARK
    });

    // Subtitle
    slide.addText(subtitle, {
      x: 0.8, y: 1.35, w: 11.5, h: 0.35,
      fontSize: 11, color: TEXT_MUTED
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
      x: 0.8, y: 1.9, w: 6.8, h: 4.8, rectRadius: 0.2,
      fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1 }
    });
    slide.addText('Reconhecer quem entrega performance real com disciplina e qualidade.', {
      x: 1.1, y: 2.1, w: 6.2, h: 0.9, fontSize: 16, bold: true, color: TEXT_DARK
    });
    slide.addText('O programa de bonificação da fábrica foi estruturado para recompensar a eficiência operacional nas condições reais de cada turno, equilibrando produtividade, redução de perdas técnicas e pontualidade da equipe.', {
      x: 1.1, y: 3.0, w: 6.2, h: 1.2, fontSize: 11, color: TEXT_MUTED
    });

    // 3 Metric Pills
    const metrics = [
      { label: 'Base de Bônus', val: 'R$ 300+', color: AMBER },
      { label: 'Turno de Trabalho', val: '12 Horas', color: EMERALD },
      { label: 'Avaliação', val: '100% Transparente', color: BLUE }
    ];
    metrics.forEach((m, i) => {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 1.1 + i * 2.05, y: 4.4, w: 1.95, h: 1.8, rectRadius: 0.15,
        fill: { color: 'F1F5F9' }, line: { color: BORDER_COLOR, width: 1 }
      });
      slide.addText(m.val, {
        x: 1.1 + i * 2.05, y: 4.6, w: 1.95, h: 0.6,
        fontSize: 14, bold: true, color: m.color, align: 'center'
      });
      slide.addText(m.label, {
        x: 1.1 + i * 2.05, y: 5.2, w: 1.95, h: 0.6,
        fontSize: 9, bold: true, color: TEXT_MUTED, align: 'center'
      });
    });

    // Right card: 4 pillars
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 7.9, y: 1.9, w: 4.5, h: 4.8, rectRadius: 0.2,
      fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1 }
    });
    slide.addText('OS 4 PILARES DA BONIFICAÇÃO', {
      x: 8.2, y: 2.1, w: 4.0, h: 0.4, fontSize: 11, bold: true, color: AMBER
    });

    const pillars = [
      { n: '1', t: 'Velocidade & Meta da Máquina', d: 'kg/h na Extrusão e m² no Corte de Fita.' },
      { n: '2', t: 'Controle Rígido de Refugo', d: 'Tolerância de perdas (Eco A, Eco BP, Borra).' },
      { n: '3', t: 'Agilidade em Limpeza de Matriz', d: 'Até 30 minutos por parada individual.' },
      { n: '4', t: 'Disciplina & Honestidade', d: 'Pontualidade e tolerância zero a fraudes.' }
    ];
    pillars.forEach((p, i) => {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 8.2, y: 2.6 + i * 0.95, w: 3.9, h: 0.8, rectRadius: 0.1,
        fill: { color: 'F8FAFC' }, line: { color: BORDER_COLOR, width: 1 }
      });
      slide.addText(`${p.n}. ${p.t}`, {
        x: 8.35, y: 2.65 + i * 0.95, w: 3.6, h: 0.35, fontSize: 10, bold: true, color: TEXT_DARK
      });
      slide.addText(p.d, {
        x: 8.35, y: 2.98 + i * 0.95, w: 3.6, h: 0.35, fontSize: 8.5, color: TEXT_MUTED
      });
    });
  }

  // ==========================================
  // SLIDE 2: QUILO-HORA EXTRUSÃO
  // ==========================================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, 'Extrusão (Cast 1 e Cast 2)', 'A Meta Baseada nas Condições Reais do Turno', 'Aferição Dinâmica em Quilo-Hora (kg/h) em Função do Material e Velocidade');

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 1.85, w: 11.6, h: 0.85, rectRadius: 0.15,
      fill: { color: 'EFF6FF' }, line: { color: 'BFDBFE', width: 1 }
    });
    slide.addText('Regra Fundamental: A meta é vinculada aos kg/h reais que a máquina está rodando naquele turno de 12 horas. Isso considera o material que está sendo puxado (LC3, LC2, ATX) e as velocidades nominais de processo.', {
      x: 1.0, y: 1.95, w: 11.2, h: 0.65, fontSize: 10, bold: true, color: '1E3A8A'
    });

    // Cast 1 Card
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 2.9, w: 5.65, h: 3.8, rectRadius: 0.2,
      fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1 }
    });
    slide.addText('CAST 1 (EXEMPLO)', { x: 1.1, y: 3.1, w: 5.0, h: 0.3, fontSize: 10, bold: true, color: AMBER });
    slide.addText('1.000 kg/h', { x: 1.1, y: 3.4, w: 5.0, h: 0.6, fontSize: 24, bold: true, color: TEXT_DARK });
    slide.addText('Material Stretch LC3 rodando a 1.000 kg/h no turno de 12 horas:', { x: 1.1, y: 4.0, w: 5.0, h: 0.4, fontSize: 9.5, color: TEXT_MUTED });
    slide.addText('• Produção Teórica (12h): 12.000 Kg\n• Tolerância de Perdas (3,5%): - 420 Kg\n• Meta Líquida a Produzir: 11.580 Kg', {
      x: 1.1, y: 4.5, w: 5.0, h: 1.6, fontSize: 10.5, color: TEXT_DARK
    });

    // Cast 2 Card
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.75, y: 2.9, w: 5.65, h: 3.8, rectRadius: 0.2,
      fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1 }
    });
    slide.addText('CAST 2 (EXEMPLO)', { x: 7.05, y: 3.1, w: 5.0, h: 0.3, fontSize: 10, bold: true, color: BLUE });
    slide.addText('850 kg/h', { x: 7.05, y: 3.4, w: 5.0, h: 0.6, fontSize: 24, bold: true, color: TEXT_DARK });
    slide.addText('Material Stretch LC2 / ATX rodando a 850 kg/h no turno de 12 horas:', { x: 7.05, y: 4.0, w: 5.0, h: 0.4, fontSize: 9.5, color: TEXT_MUTED });
    slide.addText('• Produção Teórica (12h): 10.200 Kg\n• Tolerância de Perdas (3,5%): - 357 Kg\n• Meta Líquida a Produzir: 9.843 Kg', {
      x: 7.05, y: 4.5, w: 5.0, h: 1.6, fontSize: 10.5, color: TEXT_DARK
    });
  }

  // ==========================================
  // SLIDE 3: TOLERÂNCIA DE PERDAS
  // ==========================================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, 'Regra de Refugo', 'Tolerância de Perdas de Produção', 'Como o Limite de Refugo é Calculado para Proteger a Meta Líquida');

    const losses = [
      { t: '1. Eco A (Isento até 8%)', d: 'O refugo de Eco A só gera perda se ultrapassar 8% da produção do dia. Se for até 8%, é 100% isento e não causa desconto de bônus!' },
      { t: '2. Eco BP (Produção)', d: 'Eco B gerado por intervenção ou ajuste operacional. Conta diretamente na tolerância de perdas de produção.' },
      { t: '3. Borra Total', d: 'Material de purga e início de operação. Contabilizado no cômputo geral de perda técnica do turno.' }
    ];
    losses.forEach((l, i) => {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8 + i * 3.95, y: 2.0, w: 3.7, h: 2.8, rectRadius: 0.2,
        fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1 }
      });
      slide.addText(l.t, { x: 1.0 + i * 3.95, y: 2.2, w: 3.3, h: 0.4, fontSize: 13, bold: true, color: TEXT_DARK });
      slide.addText(l.d, { x: 1.0 + i * 3.95, y: 2.7, w: 3.3, h: 1.8, fontSize: 10.5, color: TEXT_MUTED });
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 5.1, w: 11.6, h: 1.6, rectRadius: 0.2,
      fill: { color: 'ECFDF5' }, line: { color: 'A7F3D0', width: 1 }
    });
    slide.addText('REGRA ESPECIAL DO ECOA (ISENÇÃO ATÉ 8% DO DIA):', { x: 1.1, y: 5.25, w: 11.0, h: 0.35, fontSize: 11, bold: true, color: '065F46' });
    slide.addText('O refugo de ECOA somente terá perda de porcentagem de bônus se ultrapassar 8% da produção do dia. Se as perdas avaliadas (EcoA acima de 8% + Eco BP + Borra) ficarem dentro do limite de tolerância (3,5% a 4,0%), o operador mantém o bônus integral.', {
      x: 1.1, y: 5.65, w: 11.0, h: 0.85, fontSize: 10, color: '047857'
    });
  }

  // ==========================================
  // SLIDE 4: ISENÇÃO DO ECOBM
  // ==========================================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, 'Regra de Ouro da Extrusão', 'Isenção de ECOBM (Manutenção)', 'Refugo Decorrente de Problemas Mecânicos ou Elétricos Não Prejudica o Operador');

    // Left Explanation
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 1.9, w: 5.65, h: 4.8, rectRadius: 0.2,
      fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1 }
    });
    slide.addText('O que é ECOBM?', { x: 1.1, y: 2.1, w: 5.0, h: 0.4, fontSize: 15, bold: true, color: TEXT_DARK });
    slide.addText('ECOBM significa Eco B de Manutenção. É todo refugo gerado por quebras técnicas, trocas de peças, reparos elétricos ou problemas na infraestrutura da máquina.\n\nREGRA MANDATÓRIA:\nO ECOBM é 100% ISENTO da avaliação do operador. Ele é registrado para controle da manutenção, mas no cálculo do bônus ele é COMPLETAMENTE DESCONSIDERADO.', {
      x: 1.1, y: 2.6, w: 5.0, h: 3.8, fontSize: 11, color: TEXT_MUTED
    });

    // Right Comparison Cards
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.75, y: 1.9, w: 5.65, h: 2.25, rectRadius: 0.2,
      fill: { color: 'FEF2F2' }, line: { color: 'FECACA', width: 1 }
    });
    slide.addText('ECOBP (Produção) - CONTA NA META', { x: 7.05, y: 2.1, w: 5.0, h: 0.35, fontSize: 12, bold: true, color: ROSE });
    slide.addText('Refugo gerado por erro operacional, bobinamento torto ou ajuste de produção. Desconta da meta se passar do limite de tolerância.', {
      x: 7.05, y: 2.5, w: 5.0, h: 1.3, fontSize: 10, color: '991B1B'
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.75, y: 4.45, w: 5.65, h: 2.25, rectRadius: 0.2,
      fill: { color: 'ECFDF5' }, line: { color: 'A7F3D0', width: 1 }
    });
    slide.addText('ECOBM (Manutenção) - 100% ISENTO', { x: 7.05, y: 4.65, w: 5.0, h: 0.35, fontSize: 12, bold: true, color: EMERALD });
    slide.addText('Refugo gerado por parada de motor, quebra mecânica, falha de aquecimento ou manutenção preventiva. Totalmente isento no bônus.', {
      x: 7.05, y: 5.05, w: 5.0, h: 1.3, fontSize: 10, color: '065F46'
    });
  }

  // ==========================================
  // SLIDE 5: PARADAS DE LIMPEZA E REGRA DE RANKING
  // ==========================================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, 'Paradas na Extrusão', 'Paradas de Máquina & Limpeza Obrigatória', 'Regra dos 30 Minutos e Desconto de 50% no Ranking por Limpeza Não Realizada');

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 1.9, w: 5.65, h: 2.8, rectRadius: 0.2,
      fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1 }
    });
    slide.addText('APENAS LIMPEZA DE MATRIZ E MÁQUINA', { x: 1.1, y: 2.1, w: 5.0, h: 0.35, fontSize: 11, bold: true, color: AMBER });
    slide.addText('Na Extrusão, paradas de manutenção mecânica, elétrica ou falta de energia NÃO tiram a meta do operador.\n\nA ÚNICA parada avaliada para perda de bônus é a parada para limpeza de matriz, cabeçote, roscas ou rolos.', {
      x: 1.1, y: 2.5, w: 5.0, h: 2.0, fontSize: 10, color: TEXT_MUTED
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.75, y: 1.9, w: 5.65, h: 2.8, rectRadius: 0.2,
      fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1 }
    });
    slide.addText('LIMITE: 30 MINUTOS POR PARADA', { x: 7.05, y: 2.1, w: 5.0, h: 0.35, fontSize: 11, bold: true, color: ROSE });
    slide.addText('O limite de 30 minutos NÃO é a soma acumulada de todas as paradas do turno!\n\nÉ 30 minutos no máximo por cada evento individual. Se houver 3 paradas de limpeza e cada uma durar até 30 minutos, o operador está 100% aprovado.', {
      x: 7.05, y: 2.5, w: 5.0, h: 2.0, fontSize: 10, color: TEXT_MUTED
    });

    // Ranking penalty block
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 4.95, w: 11.6, h: 1.8, rectRadius: 0.15,
      fill: { color: 'FEF2F2' }, line: { color: 'FECACA', width: 1 }
    });
    slide.addText('REGRA DE JUSTIÇA: PARADA DE LIMPEZA OBRIGATÓRIA NÃO REALIZADA (-50% NO RANKING)', {
      x: 1.1, y: 5.1, w: 11.0, h: 0.35, fontSize: 11, bold: true, color: ROSE
    });
    slide.addText('Quando for determinada uma quantidade de paradas para limpeza no turno (ex.: 2 paradas de limpeza obrigatórias) e o operador realizar menos (ex.: apenas 1 parada), para garantir justiça com quem parou para limpar a máquina, haverá DESCONTO DE 50% DA PRODUÇÃO DO OPERADOR DAQUELE DIA EXCLUSIVAMENTE NO RANKING DE PRODUTIVIDADE.\n• Relatórios e produção física da fábrica permanecem 100% preservados.', {
      x: 1.1, y: 5.5, w: 11.0, h: 1.1, fontSize: 9.5, color: '991B1B'
    });
  }

  // ==========================================
  // SLIDE 6: CORTE DE FITA
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
        x: 0.8 + i * 3.95, y: 1.9, w: 3.7, h: 2.4, rectRadius: 0.2,
        fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1 }
      });
      slide.addText(item.m, { x: 1.0 + i * 3.95, y: 2.1, w: 3.3, h: 0.35, fontSize: 12, bold: true, color: PURPLE });
      slide.addText(item.g, { x: 1.0 + i * 3.95, y: 2.45, w: 3.3, h: 0.6, fontSize: 20, bold: true, color: TEXT_DARK });
      slide.addText(item.d, { x: 1.0 + i * 3.95, y: 3.1, w: 3.3, h: 0.9, fontSize: 9.5, color: TEXT_MUTED });
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 4.6, w: 11.6, h: 2.1, rectRadius: 0.2,
      fill: { color: 'FAF5FF' }, line: { color: 'E9D5FF', width: 1 }
    });
    slide.addText('ABATIMENTO DE PERDAS NO CORTE DE FITA:', { x: 1.1, y: 4.75, w: 11.0, h: 0.35, fontSize: 11, bold: true, color: '6B21A8' });
    slide.addText('• Perda Tipo 1 (m²): Abate diretamente da metragem atingida no dia.\n• Perda Tipo 2 (m²): Abate diretamente da metragem atingida no dia.\n• Lixo / Refugo (kg ➔ m²): O peso em kg é convertido em m² pela gramatura do jumbo e abatido da meta.', {
      x: 1.1, y: 5.15, w: 11.0, h: 1.3, fontSize: 10.5, color: TEXT_DARK
    });
  }

  // ==========================================
  // SLIDE 7: CRITÉRIOS DE FECHAMENTO MENSAL - QUALIDADE
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
        x: 0.8 + i * 2.95, y: 1.9, w: 2.75, h: 3.6, rectRadius: 0.2,
        fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1 }
      });
      slide.addText(q.t, { x: 0.95 + i * 2.95, y: 2.1, w: 2.45, h: 0.5, fontSize: 11, bold: true, color: TEXT_DARK });
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.95 + i * 2.95, y: 2.7, w: 2.45, h: 0.45, rectRadius: 0.1,
        fill: { color: 'EEF2FF' }, line: { color: 'C7D2FE', width: 1 }
      });
      slide.addText(q.p, { x: 0.95 + i * 2.95, y: 2.75, w: 2.45, h: 0.35, fontSize: 10, bold: true, color: '3730A3', align: 'center' });
      slide.addText(q.d, { x: 0.95 + i * 2.95, y: 3.3, w: 2.45, h: 2.0, fontSize: 9, color: TEXT_MUTED });
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 5.75, w: 11.6, h: 1.0, rectRadius: 0.15,
      fill: { color: 'F1F5F9' }, line: { color: BORDER_COLOR, width: 1 }
    });
    slide.addText('Conferência diária: Todos os apontamentos de produção devem ser validados pelo líder de turno diariamente antes do fechamento.', {
      x: 1.1, y: 5.85, w: 11.0, h: 0.75, fontSize: 10, bold: true, color: TEXT_MUTED, align: 'center'
    });
  }

  // ==========================================
  // SLIDE 8: CRITÉRIOS DE FECHAMENTO MENSAL - ASSIDUIDADE & PONTUALIDADE
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
        x: 0.8 + i * 3.95, y: 1.9, w: 3.7, h: 2.1, rectRadius: 0.2,
        fill: { color: 'FEF2F2' }, line: { color: 'FECACA', width: 1 }
      });
      slide.addText(p.t, { x: 1.0 + i * 3.95, y: 2.05, w: 3.3, h: 0.35, fontSize: 11, bold: true, color: '991B1B' });
      slide.addText(p.r, { x: 1.0 + i * 3.95, y: 2.45, w: 3.3, h: 0.55, fontSize: 16, bold: true, color: ROSE });
      slide.addText(p.d, { x: 1.0 + i * 3.95, y: 3.1, w: 3.3, h: 0.7, fontSize: 9.5, color: '7F1D1D' });
    });

    // Delays and Overtime
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 4.25, w: 5.65, h: 2.5, rectRadius: 0.2,
      fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1 }
    });
    slide.addText('ATRASOS INJUSTIFICADOS', { x: 1.1, y: 4.4, w: 5.0, h: 0.3, fontSize: 11, bold: true, color: AMBER });
    slide.addText('A cada 10 minutos de atraso ➔ Perde 1% da meta\n\nExemplo: 30 minutos de atraso acumulados no mês geram desconto automático de 3% no bônus.', {
      x: 1.1, y: 4.8, w: 5.0, h: 1.7, fontSize: 10, color: TEXT_MUTED
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.75, y: 4.25, w: 5.65, h: 2.5, rectRadius: 0.2,
      fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1 }
    });
    slide.addText('HORAS EXTRAS NÃO AUTORIZADAS', { x: 7.05, y: 4.4, w: 5.0, h: 0.3, fontSize: 11, bold: true, color: AMBER });
    slide.addText('A cada 10 minutos de HE não autorizada ➔ Perde 1% da meta\n\nPermanecer no posto além da jornada sem autorização formal do gestor direto acarreta desconto proporcional.', {
      x: 7.05, y: 4.8, w: 5.0, h: 1.7, fontSize: 10, color: TEXT_MUTED
    });
  }

  // ==========================================
  // SLIDE 9: CRITÉRIOS DE FECHAMENTO MENSAL - COMPORTAMENTO & SEGURANÇA
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
        x: 0.8 + i * 3.95, y: 1.9, w: 3.7, h: 4.7, rectRadius: 0.2,
        fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1 }
      });
      slide.addText(s.t, { x: 1.0 + i * 3.95, y: 2.1, w: 3.3, h: 0.45, fontSize: 12, bold: true, color: TEXT_DARK });

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 1.0 + i * 3.95, y: 2.7, w: 3.3, h: 0.55, rectRadius: 0.1,
        fill: { color: 'FEF3C7' }, line: { color: 'FDE68A', width: 1 }
      });
      slide.addText(s.first, { x: 1.0 + i * 3.95, y: 2.75, w: 3.3, h: 0.45, fontSize: 9.5, bold: true, color: '92400E', align: 'center' });

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 1.0 + i * 3.95, y: 3.4, w: 3.3, h: 0.55, rectRadius: 0.1,
        fill: { color: 'FEF2F2' }, line: { color: 'FECACA', width: 1 }
      });
      slide.addText(s.rec, { x: 1.0 + i * 3.95, y: 3.45, w: 3.3, h: 0.45, fontSize: 9.5, bold: true, color: ROSE, align: 'center' });

      slide.addText(s.d, { x: 1.0 + i * 3.95, y: 4.2, w: 3.3, h: 2.1, fontSize: 9.5, color: TEXT_MUTED });
    });
  }

  // ==========================================
  // SLIDE 10: INFORMAÇÃO FALSA (-100%)
  // ==========================================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, 'Ética & Fraude', 'Tolerância Zero: Informação Falsa / Fraude', 'Manipulação de Apontamentos ou Declarações Inverídicas = 100% de Desconto Imediato');

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 1.9, w: 4.5, h: 4.8, rectRadius: 0.2,
      fill: { color: 'FEF2F2' }, line: { color: 'FECACA', width: 1 }
    });
    slide.addText('DESQUALIFICAÇÃO IMEDIATA (-100%)', { x: 1.1, y: 2.2, w: 3.9, h: 0.7, fontSize: 14, bold: true, color: ROSE });
    slide.addText('O sistema possui auditoria cruzada por balanças eletrônicas, câmeras do circuito interno e registros de CLP.\n\nA tentativa de burlar as regras resulta em perda imediata e irrecorrível de 100% do bônus no ciclo.', {
      x: 1.1, y: 3.0, w: 3.9, h: 3.4, fontSize: 11, color: '991B1B'
    });

    const frauds = [
      { t: 'Desvio de Refugo para Manutenção (ECOBM)', d: 'Pegar o refugo gerado por erro operacional (Eco BP) e classificar como ECOBM Manutenção para não estourar a meta.' },
      { t: 'Declaração Falsa de Parada Automática', d: 'Afirmar que a máquina quebrou em processo automático quando as câmeras/CLP comprovam negligência ou ação indevida.' },
      { t: 'Fraude em Tara, Peso ou Metragem', d: 'Lançar pesos inexistentes, taras incorretas de bobinas ou metragens falsas de corte para simular cumprimento da meta.' }
    ];
    frauds.forEach((f, i) => {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 5.6, y: 1.9 + i * 1.65, w: 6.8, h: 1.45, rectRadius: 0.15,
        fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1 }
      });
      slide.addText(f.t, { x: 5.85, y: 2.05 + i * 1.65, w: 6.3, h: 0.35, fontSize: 11, bold: true, color: TEXT_DARK });
      slide.addText(f.d, { x: 5.85, y: 2.45 + i * 1.65, w: 6.3, h: 0.8, fontSize: 9.5, color: TEXT_MUTED });
    });
  }

  // ==========================================
  // SLIDE 11: TELA DE LANÇAMENTO & EXTRATO PDF
  // ==========================================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, 'Ferramentas do Sistema', 'Transparência: Tela de Lançamento & Extrato em PDF', 'Como as Informações são Registradas e Disponibilizadas em Detalhes para Cada Colaborador');

    // Left: Tela de Lançamento
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 1.9, w: 5.65, h: 4.8, rectRadius: 0.2,
      fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1 }
    });
    slide.addText('NA TELA DE NOVO LANÇAMENTO', { x: 1.1, y: 2.1, w: 5.0, h: 0.35, fontSize: 11, bold: true, color: BLUE });
    slide.addText('• Extrusão: Informa-se em quantos kg/h a máquina está trabalhando e a tolerância de perda no turno.\n\n• Corte de Fita: Ao selecionar a máquina, define-se a meta diária em m² e lançam-se perdas Tipo 1, Tipo 2 e Lixo.\n\n• Lançamento de Ocorrências: Seleção direta de parada de limpeza não realizada, advertências e condutas, com cálculo imediato do impacto.\n\n• Tempo Real: A tela calcula instantaneamente se a produção líquida atingiu ou não a meta estipulada.', {
      x: 1.1, y: 2.6, w: 5.0, h: 3.8, fontSize: 10, color: TEXT_MUTED
    });

    // Right: Extrato Individual PDF
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 6.75, y: 1.9, w: 5.65, h: 4.8, rectRadius: 0.2,
      fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1 }
    });
    slide.addText('NO EXTRATO INDIVIDUAL EM PDF', { x: 7.05, y: 2.1, w: 5.0, h: 0.35, fontSize: 11, bold: true, color: EMERALD });
    slide.addText('• Dia a Dia Detalhado: Cada turno trabalhado é impresso com máquina, kg/h ou m², meta 12h e produção real.\n\n• Separação Clara de Refugo: Eco A (isento até 8%), Eco BP, Borra vs. EcoBM de manutenção identificado como ISENTO.\n\n• Status por Turno: BATEU META ✅, EXC. LIMPEZA (>30m), EXC. PERDA ou ABAIXO LÍQUIDO.\n\n• 100% Auditável: Entregue a cada colaborador no fechamento com clareza absoluta.', {
      x: 7.05, y: 2.6, w: 5.0, h: 3.8, fontSize: 10, color: TEXT_MUTED
    });
  }

  // ==========================================
  // SLIDE 12: CONCLUSÃO & 5 CHAVES
  // ==========================================
  {
    const slide = pptx.addSlide();
    addSlideHeader(slide, 'Compromisso com o Sucesso', 'Conclusão: As 5 Chaves do Operador Nota 10', 'Resumo das Melhores Práticas para Garantir a Bonificação Máxima Todos os Meses');

    const keys = [
      { n: '1', t: 'Velocidade', d: 'Manter a máquina rodando nos kg/h recomendados para o material.' },
      { n: '2', t: 'Refugo Baixo', d: 'Operar com atenção para manter perdas abaixo do teto de tolerância (Eco A ≤ 8%).' },
      { n: '3', t: 'Limpeza Ágil', d: 'Cumprir paradas obrigatórias sem nunca passar de 30 min por evento.' },
      { n: '4', t: 'Pontualidade', d: 'Cumprir a jornada integral, zelar por EPIs e comunicar a liderança.' },
      { n: '5', t: 'Honestidade', d: 'Apontar 100% da verdade no sistema. A confiança operacional é inegociável.' }
    ];
    keys.forEach((k, i) => {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.8 + i * 2.37, y: 1.9, w: 2.2, h: 3.2, rectRadius: 0.15,
        fill: { color: CARD_BG }, line: { color: BORDER_COLOR, width: 1 }
      });
      slide.addText(k.n, { x: 1.0 + i * 2.37, y: 2.1, w: 1.8, h: 0.45, fontSize: 18, bold: true, color: AMBER, align: 'center' });
      slide.addText(k.t, { x: 1.0 + i * 2.37, y: 2.65, w: 1.8, h: 0.35, fontSize: 11, bold: true, color: TEXT_DARK, align: 'center' });
      slide.addText(k.d, { x: 0.95 + i * 2.37, y: 3.1, w: 1.9, h: 1.8, fontSize: 9.5, color: TEXT_MUTED, align: 'center' });
    });

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: 5.35, w: 11.6, h: 1.4, rectRadius: 0.2,
      fill: { color: 'FEF3C7' }, line: { color: 'FDE68A', width: 1 }
    });
    slide.addText('PRODUZIR COM QUALIDADE E SEGURANÇA É NOSSO MAIOR VALOR!', {
      x: 1.1, y: 5.5, w: 11.0, h: 0.4, fontSize: 12, bold: true, color: '92400E', align: 'center'
    });
    slide.addText('A gestão de bônus existe para construir uma fábrica mais forte e recompensar os melhores colaboradores.', {
      x: 1.1, y: 5.95, w: 11.0, h: 0.5, fontSize: 10, color: 'B45309', align: 'center'
    });
  }

  await pptx.writeFile({ fileName: 'Regras_Bonus_Producao_Manupackaging.pptx' });
};
