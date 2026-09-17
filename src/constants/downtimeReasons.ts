import { ProductionEntry, RibbonCuttingEntry } from '../types';

export interface DowntimeCategoryGroup {
  groupName: string;
  reasons: string[];
}

export interface DowntimeSuggestions {
  manutencaoGroups: DowntimeCategoryGroup[];
  processoGroups: DowntimeCategoryGroup[];
  outrosGroups: DowntimeCategoryGroup[];
  allGroups: DowntimeCategoryGroup[];
  // Flat deduplicated arrays
  manutencao: string[];
  processo: string[];
  outros: string[];
  all: string[];
}

// Extrusora Plana Cast Base Categories
export const CAST_MANUTENCAO_PRESETS: DowntimeCategoryGroup[] = [
  {
    groupName: "⚡ ELÉTRICA & ELETRÔNICA",
    reasons: [
      "Painel",
      "Inversor",
      "Resistência",
      "CLP/IHM",
      "Falha de acionamento de sensor",
      "Relé / Contatora queimada",
    ],
  },
  {
    groupName: "🔧 MECÂNICA & ESTRUTURAL",
    reasons: [
      "Roscas/Canhão",
      "Racollta",
      "Preventiva",
      "Rolamentos ou transmissão (biela/câmbio)",
      "Falha no carro extrator",
      "Eixo caindo fora de posição",
      "Pinça do câmbio",
      "Rolo guia / Polidor / Esteira",
    ],
  },
  {
    groupName: "💧 HIDRÁULICA & PNEUMÁTICA",
    reasons: [
      "Chiller",
      "Vazamento de ar",
      "Válvulas",
      "Pressão de Ar",
      "Vazamento no eixo expansivo",
      "Vazamento de água / Mangueira estourada",
    ],
  },
];

export const CAST_PROCESSO_PRESETS: DowntimeCategoryGroup[] = [
  {
    groupName: "🧪 EXTRUSÃO PLANA CAST",
    reasons: [
      "Troca de Filtro/Tela",
      "Limpeza de Matriz, ajuste e teste",
      "Instabilidade da cortina",
      "Escape do Fixa - Borda",
      "Desalinhamento do tubete",
      "Escape do refile central ou lateral",
      "Entupimento do sistema de aspiração do refile",
      "Buracos no filme",
      "Filme não aderiu ao tubete",
      "Risco no filme",
      "Borra na extrusora",
      "Rompimento do filme",
      "Troca de Facas",
      "Vazamento na Matriz",
    ],
  },
];

export const CAST_OUTROS_PRESETS: DowntimeCategoryGroup[] = [
  {
    groupName: "📦 MATÉRIA-PRIMA & INSUMOS",
    reasons: [
      "Resina",
      "Tubete",
      "Cilo da extrusora secou",
      "Processo instavel por conta do reciclado",
      "Falta de cola nos tubetes",
    ],
  },
  {
    groupName: "📋 OPERACIONAL & SEGURANÇA",
    reasons: [
      "Treinamento/DDP",
      "Botão de emergência acionado",
    ],
  },
  {
    groupName: "⚡ UTILIDADES & INSTALAÇÕES",
    reasons: [
      "Falta de Energia",
      "Pico de Energia",
      "Queda de energia",
    ],
  },
];

export const ALL_STANDARD_CATEGORY_GROUPS: DowntimeCategoryGroup[] = [
  ...CAST_MANUTENCAO_PRESETS,
  ...CAST_PROCESSO_PRESETS,
  ...CAST_OUTROS_PRESETS,
];

// Eco B Standard Loss Reasons Preset (uses exact same standard reasons as downtime)
export const ECO_B_REASONS_PRESETS: string[] = Array.from(
  new Set(ALL_STANDARD_CATEGORY_GROUPS.flatMap(g => g.reasons))
);

/**
 * Normalizes and cleans up any downtime reason string ("peneira").
 * Maps variations, typos, and repetitive text into standardized Cast film terminology.
 */
export function normalizeReasonText(raw: string): string {
  if (!raw) return '';
  let text = raw.trim();
  
  // Strip leading prefixes
  text = text.replace(/^(Manutenção|Processo|Outros)\s*:\s*/i, '');
  text = text.replace(/^[•\-\*]\s*/, '');

  const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Match common synonyms & variations for Extrusora Plana Cast
  if (lower.includes("chiller") || lower.includes("refrigeracao") || lower.includes("agua gelada")) {
    return "💧 HIDRÁULICA / PNEUMÁTICA - Refrigeração / Chiller / Trocador de Calor";
  }
  if (lower.includes("inversor") || lower.includes("servomotor") || lower.includes("servo")) {
    return "⚡ ELÉTRICA - Inversor de Frequência / Servomotor";
  }
  if (lower.includes("sensor") || lower.includes("celula de carga") || lower.includes("pirometro")) {
    return "⚡ ELÉTRICA - Sensores / Célula de Carga";
  }
  if (lower.includes("resistencia") || lower.includes("aquecimento") || lower.includes("termopar")) {
    return "⚡ ELÉTRICA - Resistência de Aquecimento / Termopar";
  }
  if (lower.includes("painel") || lower.includes("disjuntor")) {
    return "⚡ ELÉTRICA - Painel Elétrico / Disjuntores";
  }
  if (lower.includes("rolamento") || lower.includes("mancal")) {
    return "🔧 MECÂNICA - Rolamentos / Mancais";
  }
  if (lower.includes("feltro") || lower.includes("raspador")) {
    return "🔧 MECÂNICA - Feltros / Raspadores / Guias";
  }
  if (lower.includes("rebobinadeira") || lower.includes("banjo mecanico")) {
    return "🔧 MECÂNICA - Corretiva na Rebobinadeira / Banjo";
  }
  if (lower.includes("preventiva")) {
    return "🔧 MECÂNICA - Manutenção Preventiva Programada";
  }
  if (lower.includes("vazamento") || lower.includes("hidraulico")) {
    return "💧 HIDRÁULICA / PNEUMÁTICA - Vazamento Hidráulico / Mangueiras";
  }
  if (lower.includes("limpeza de matriz") || lower.includes("cabecote") || lower.includes("matriz plana")) {
    return "🧪 EXTRUSÃO CAST - Limpeza de Matriz Plana / Cabeçote Cast";
  }
  if (lower.includes("troca de filtro") || lower.includes("troca de tela") || lower.includes("tela") || lower.includes("filtro")) {
    return "🧪 EXTRUSÃO CAST - Troca de Filtro / Tela de Extrusão";
  }
  if (lower.includes("purga") || lower.includes("troca de resina") || lower.includes("limpeza de rosca")) {
    return "🧪 EXTRUSÃO CAST - Purga de Canhão / Troca de Resina";
  }
  if (lower.includes("espessura") || lower.includes("gauging") || lower.includes("micron") || lower.includes("micras")) {
    return "🎯 REGULAGEM CAST - Ajuste de Espessura (Gauging / Mícron)";
  }
  if (lower.includes("chill roll") || lower.includes("air knife") || lower.includes("lamina de ar") || lower.includes("perfil")) {
    return "🎯 REGULAGEM CAST - Perfil de Matriz / Lâmina de Ar (Chill Roll)";
  }
  if (lower.includes("facas") || lower.includes("refile") || lower.includes("serrilha")) {
    return "🎯 REGULAGEM CAST - Ajuste de Facas / Refile";
  }
  if (lower.includes("materia-prima") || lower.includes("materia prima") || lower.includes("resina")) {
    return "📦 INSUMOS - Aguardando Matéria-Prima / Resina";
  }
  if (lower.includes("tubete") || lower.includes("embalagem")) {
    return "📦 INSUMOS - Aguardando Tubetes / Embalagens";
  }
  if (lower.includes("qualidade") || lower.includes("cq")) {
    return "📋 OPERACIONAL - Liberação do Controle de Qualidade (CQ)";
  }
  if (lower.includes("energia") || lower.includes("queda de luz") || lower.includes("pico de luz")) {
    return "⚡ UTILIDADES - Falta de Energia / Queda de Tensão";
  }
  if (lower.includes("troca de turno") || lower.includes("dds")) {
    return "📋 OPERACIONAL - Troca de Turno / DDS";
  }
  if (lower.includes("limpeza de fim de turno") || lower.includes("limpeza operacional")) {
    return "📋 OPERACIONAL - Limpeza Operacional de Fim de Turno";
  }

  // Formatting custom reasons cleanly if no synonym match
  if (text.length > 0) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  return text;
}

export const CAST_ALL_PRESETS: DowntimeCategoryGroup[] = [
  ...CAST_MANUTENCAO_PRESETS,
  ...CAST_PROCESSO_PRESETS,
  ...CAST_OUTROS_PRESETS,
];

export interface StoredDowntimePresets {
  manutencaoGroups: DowntimeCategoryGroup[];
  processoGroups: DowntimeCategoryGroup[];
  outrosGroups: DowntimeCategoryGroup[];
}

const STORAGE_KEY = 'manupackaging_custom_downtime_reasons';
const CURRENT_STORAGE_VERSION = 6;

function mergeDefaultCategoryGroups(
  stored: DowntimeCategoryGroup[],
  defaults: DowntimeCategoryGroup[]
): DowntimeCategoryGroup[] {
  const result: DowntimeCategoryGroup[] = (stored || []).map(g => ({
    groupName: g.groupName,
    reasons: [...(g.reasons || [])]
  }));

  for (const defGroup of defaults) {
    const existingGroup = result.find(
      g => g.groupName.trim().toUpperCase() === defGroup.groupName.trim().toUpperCase()
    );
    if (!existingGroup) {
      result.push({
        groupName: defGroup.groupName,
        reasons: [...defGroup.reasons]
      });
    } else {
      for (const defReason of defGroup.reasons) {
        if (!existingGroup.reasons.some(r => r.trim().toLowerCase() === defReason.trim().toLowerCase())) {
          existingGroup.reasons.push(defReason);
        }
      }
    }
  }

  return result;
}

/**
 * Retrieves the stored downtime reasons or falls back to standard defaults.
 */
export function getStoredDowntimePresets(): StoredDowntimePresets {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        Array.isArray(parsed.manutencaoGroups) &&
        Array.isArray(parsed.processoGroups) &&
        Array.isArray(parsed.outrosGroups)
      ) {
        // If version matches, merge with default categories
        if (parsed.version === CURRENT_STORAGE_VERSION) {
          const mergedManutencao = mergeDefaultCategoryGroups(parsed.manutencaoGroups, CAST_MANUTENCAO_PRESETS);
          const mergedProcesso = mergeDefaultCategoryGroups(parsed.processoGroups, CAST_PROCESSO_PRESETS);
          const mergedOutros = mergeDefaultCategoryGroups(parsed.outrosGroups, CAST_OUTROS_PRESETS);

          return {
            manutencaoGroups: mergedManutencao,
            processoGroups: mergedProcesso,
            outrosGroups: mergedOutros,
          };
        }
      }
    }
  } catch (e) {
    console.error('Error loading custom downtime reasons from localStorage', e);
  }

  // Version mismatch or no stored data: replace with new standard defaults
  const defaults = {
    version: CURRENT_STORAGE_VERSION,
    manutencaoGroups: JSON.parse(JSON.stringify(CAST_MANUTENCAO_PRESETS)),
    processoGroups: JSON.parse(JSON.stringify(CAST_PROCESSO_PRESETS)),
    outrosGroups: JSON.parse(JSON.stringify(CAST_OUTROS_PRESETS)),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  } catch (e) {
    // ignore
  }

  return defaults;
}

/**
 * Saves custom downtime reasons to local storage and dispatches a global update event.
 */
export function saveStoredDowntimePresets(presets: StoredDowntimePresets): void {
  try {
    const withVersion = {
      ...presets,
      version: CURRENT_STORAGE_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withVersion));
    window.dispatchEvent(new Event('downtime_reasons_updated'));
  } catch (e) {
    console.error('Error saving custom downtime reasons', e);
  }
}

/**
 * Resets downtime reasons back to factory default presets.
 */
export function resetDowntimePresetsToDefault(): StoredDowntimePresets {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('downtime_reasons_updated'));
  } catch (e) {
    console.error('Error resetting downtime reasons', e);
  }
  return getStoredDowntimePresets();
}

/**
 * Returns the active downtime reasons for Extrusora Plana Cast and other machines.
 */
export function extractDowntimeMotives(
  _productionEntries: ProductionEntry[] = [],
  _ribbonEntries: RibbonCuttingEntry[] = []
): DowntimeSuggestions {
  const stored = getStoredDowntimePresets();
  
  const manutencaoGroups = stored.manutencaoGroups.length > 0 ? stored.manutencaoGroups : CAST_MANUTENCAO_PRESETS;
  const processoGroups = stored.processoGroups.length > 0 ? stored.processoGroups : CAST_PROCESSO_PRESETS;
  const outrosGroups = stored.outrosGroups.length > 0 ? stored.outrosGroups : CAST_OUTROS_PRESETS;

  // Flatten deduplicated reasons per category or across all presets
  const flatManutencao = Array.from(new Set(manutencaoGroups.flatMap(g => g.reasons)));
  const flatProcesso = Array.from(new Set(processoGroups.flatMap(g => g.reasons)));
  const flatOutros = Array.from(new Set(outrosGroups.flatMap(g => g.reasons)));

  const allGroups = [
    ...manutencaoGroups,
    ...processoGroups,
    ...outrosGroups,
  ];

  const flatAll = Array.from(new Set(allGroups.flatMap(g => g.reasons)));


  return {
    manutencaoGroups,
    processoGroups,
    outrosGroups,
    allGroups,
    manutencao: flatManutencao,
    processo: flatProcesso,
    outros: flatOutros,
    all: flatAll,
  };
}

// --------------------------------------------------------------------------
// ESTRUTURA HIERÁRQUICA DE APONTAMENTO (ÁRVORE DE FALHAS EM 3 NÍVEIS)
// --------------------------------------------------------------------------

export interface FaultTreeDefect {
  id: string;
  name: string;
}

export interface FaultTreeComponent {
  id: string;
  name: string;
  defects: string[];
}

export interface FaultTreeCategory {
  id: string;
  icon: string;
  name: string;
  components: FaultTreeComponent[];
}

export const FAULT_TREE_CATEGORIES: FaultTreeCategory[] = [
  {
    id: 'mecanica',
    icon: '🔧',
    name: '🔧 MECÂNICA & ESTRUTURAL',
    components: [
      {
        id: 'eixo_expansivo_mec',
        name: 'Eixo Expansivo',
        defects: [
          'Falha / Troca de Rolamento',
          'Eixo caindo fora de posição',
          'Eixo desalinhado / empenado',
          'Danos na ponteira / Bico do Eixo',
          'Eixo furado / danificado',
          'Outro Defeito no Eixo Expansivo',
        ],
      },
      {
        id: 'cambio_biela',
        name: 'Câmbio / Biela / Corrente',
        defects: [
          'Ajuste / Alinhamento do Câmbio',
          'Pinça do Câmbio subindo fechada / presa',
          'Folga / Quebra no Braço da Biela',
          'Corrente Caricatore fora de ciclo / desalinhada',
          'Falha na troca automática de eixos (Mec-09)',
        ],
      },
      {
        id: 'chillroll_rolos',
        name: 'Chill Roll / Cilindros / Rolo Guia',
        defects: [
          'Motor do carro do Chill Roll travado',
          'Carro extrator desalinhado',
          'Rolo Guia superior solto / danificado',
          'Rolo Polidor com falha / risco',
          'Rolo da Racollta danificado / travado',
        ],
      },
      {
        id: 'moinho_exaustao',
        name: 'Moinho / Exaustão / Granulador',
        defects: [
          'Desarme / Trava do Moinho',
          'Rolamento do Granulador estourado',
          'Esteira com vibração / quebrada',
          'Abafador / Exaustor com defeito',
        ],
      },
      {
        id: 'transmissao_estrutural',
        name: 'Transmissão & Estrutura Geral',
        defects: [
          'Correia Danificada / Troca de Correia',
          'Ruído / Quebra de Engrenagem',
          'Desgaste / Folga Mecânica Geral',
          'Reaperto / Alinhamento Estrutural',
        ],
      },
    ],
  },
  {
    id: 'hidraulica_pneumatica',
    icon: '💧',
    name: '💧 HIDRÁULICA & PNEUMÁTICA',
    components: [
      {
        id: 'eixo_expansivo_pneu',
        name: 'Eixo Expansivo',
        defects: [
          'Vazamento de Ar no Eixo',
          'Válvula de acionamento do Eixo',
          'Conexão / Engate Rápido Danificado',
          'Pressão Insuficiente no Eixo',
          'Outro Defeito de Ar no Eixo',
        ],
      },
      {
        id: 'refrigeracao_agua',
        name: 'Sistemas de Refrigeração & Água',
        defects: [
          'Vazamento de Água / Mangueira Estourada',
          'Água Quente / Falha no Chiller',
          'Válvula de Controle de Vazão Travada',
          'Vazamento de Água no Pé da Rosca',
          'Obstrução / Sujeira no Fluxo de Água',
        ],
      },
      {
        id: 'pneumatica_geral',
        name: 'Sistema Pneumático Geral',
        defects: [
          'Vazamento de Ar Comprimido na Linha',
          'Baixa Pressão na Rede de Ar',
          'Cilindro Pneumático Travado',
          'Válvula Solenóide com Defeito',
          'Reguladora de Pressão / Filtro de Ar Danificado',
        ],
      },
      {
        id: 'hidraulica_geral',
        name: 'Sistema Hidráulico',
        defects: [
          'Vazamento de Óleo Hidráulico',
          'Falha / Troca de Bomba Hidráulica',
          'Filtro Hidráulico Obstruído',
          'Pressão Hidráulica Fora do Padrão',
        ],
      },
    ],
  },
  {
    id: 'eletrica_eletronica',
    icon: '⚡',
    name: '⚡ ELÉTRICA & ELETRÔNICA',
    components: [
      {
        id: 'painel_comando',
        name: 'Painel Elétrico & Comando',
        defects: [
          'Relé / Contadora Queimada',
          'Disjuntor Desarmado / Queimado',
          'Trava de Segurança / Intertravamento Elétrico',
          'Fiação Solta / Curto-Circuito',
        ],
      },
      {
        id: 'inversores_drives',
        name: 'Inversores & Controladores',
        defects: [
          'Falha / Troca de Cabo no Inversor',
          'Erro de Parâmetro no Inversor',
          'Sobrecarga / Alarme no Inversor',
        ],
      },
      {
        id: 'sensores_instrumentacao',
        name: 'Sensores & Instrumentação',
        defects: [
          'Falha no Sensor de Nível do Silo',
          'Sensor de Posicionamento do Eixo (Não lê ponta)',
          'Falha no Termopar / Sensor de Temperatura',
          'Sensor Óptico / Fotocélula Suja ou Danificada',
        ],
      },
      {
        id: 'motores_resistencias',
        name: 'Motores & Resistências',
        defects: [
          'Resistência Queimada / Atuação',
          'Superaquecimento do Motor',
          'Motor Travado / Queimado',
        ],
      },
      {
        id: 'automacao_clp_ihm',
        name: 'Automação, CLP & IHM',
        defects: [
          'Falha de Comunicação CLP',
          'IHM Travada / Sem Resposta',
          'Falha na Troca Automática',
        ],
      },
    ],
  },
  {
    id: 'processo_extrusao',
    icon: '🧪',
    name: '🧪 PROCESSAMENTO & EXTRUSÃO (CAST / EREMA)',
    components: [
      {
        id: 'matriz_labios',
        name: 'Matriz Plana & Lábios',
        defects: [
          'Limpeza da Matriz',
          'Ajuste de Lábios da Matriz',
          'Remoção de Risco na Matriz',
          'Vazamento de Polímero na Matriz',
          'Formação de Lamaria na Matriz',
        ],
      },
      {
        id: 'canhao_rosca',
        name: 'Canhão & Rosca Extrusora',
        defects: [
          'Desarme de Extrusora (A, B, C, D)',
          'Superaquecimento na Rosca / Canhão',
          'Rosca Seca / Falha de Alimentação',
          'Retirada de Borra no Canhão / Resistências',
        ],
      },
      {
        id: 'troca_telas',
        name: 'Troca-Telas & Filtros',
        defects: [
          'Troca das Telas / Filtros',
          'Passagem de Buracos / Gel pós-troca',
          'Variação de Pressão no Troca-Telas',
        ],
      },
      {
        id: 'refile_fixa_borda',
        name: 'Refile & Fixa Borda',
        defects: [
          'Escape do Refile (Central / Lateral)',
          'Entupimento do Tubo / Aspirador de Refile',
          'Escape do Fixa Borda',
          'Instabilidade na Cortina',
        ],
      },
      {
        id: 'filme_bobinamento',
        name: 'Filme & Bobinamento',
        defects: [
          'Rompimento do Filme',
          'Filme Não Aderindo ao Tubete',
          'Desalinhamento de Bobinas / Rugas',
          'Diferença de Espessura no Filme',
        ],
      },
    ],
  },
  {
    id: 'materia_prima_insumos',
    icon: '📦',
    name: '📦 MATÉRIA-PRIMA, INSUMOS & TUBETES',
    components: [
      {
        id: 'resina_reciclado',
        name: 'Resina & Reciclado',
        defects: [
          'Processo Instável por Variação do Reciclado',
          'Silo Vazio / Falha na Alimentação',
          'Contaminação / Umidade na Matéria-Prima',
          'Falha no Dosador de Masterbatch',
        ],
      },
      {
        id: 'tubetes_embalagem',
        name: 'Tubetes & Embalagem',
        defects: [
          'Tubete Prendendo no Eixo',
          'Falta de Cola no Tubete',
          'Tubete Fora de Medida / Deformado',
          'Falta de Tubete no Setor',
        ],
      },
    ],
  },
  {
    id: 'utilidades_infra',
    icon: '⚡',
    name: '⚡ UTILIDADES & INFRAESTRUTURA',
    components: [
      {
        id: 'energia_eletrica',
        name: 'Rede Elétrica Geral',
        defects: [
          'Pico de Energia',
          'Queda de Energia / Apagão Geral',
          'Oscilação de Voltagem',
        ],
      },
      {
        id: 'sistemas_auxiliares',
        name: 'Sistemas Industriais Auxiliares',
        defects: [
          'Queda na Pressão Geral de Ar Comprimido',
          'Falha no Chiller Central / Água Gelada',
          'Falta de Insumos da Planta',
        ],
      },
    ],
  },
  {
    id: 'operacional_seguranca',
    icon: '📋',
    name: '📋 OPERACIONAL, SEGURANÇA & INTERVALOS',
    components: [
      {
        id: 'setup_producao',
        name: 'Ajustes & Setup de Produção',
        defects: [
          'Troca de Facas',
          'Setup / Troca de Produto',
          'Testes e Ajustes de Parâmetros',
          'Passagem / Recebimento de Turno',
        ],
      },
      {
        id: 'limpeza_5s',
        name: 'Limpeza & Organização (5S)',
        defects: [
          'Limpeza Programada de Máquina',
          'Limpeza do Cilindro / Calha',
        ],
      },
      {
        id: 'seguranca_treino',
        name: 'Segurança & Treinamento',
        defects: [
          'Botão de Emergência Acionado',
          'Treinamento Operacional / O.P.',
          'Atendimento Médico / Ocorrência de Segurança',
        ],
      },
      {
        id: 'intervalos_paradas',
        name: 'Intervalos & Paradas Programadas',
        defects: [
          'Horário de Almoço / Lanche',
          'Parada Programada / Aguardando Ordem de Produção',
        ],
      },
    ],
  },
];

export interface StopHierarchy {
  category: string;
  component: string;
  defect: string;
}

export function parseStopItemHierarchy(
  motivo?: string,
  category?: string,
  component?: string,
  defect?: string
): StopHierarchy {
  if (category && component && defect) {
    return { category, component, defect };
  }

  if (!motivo) {
    const defaultCat = FAULT_TREE_CATEGORIES[0];
    const defaultComp = defaultCat.components[0];
    return {
      category: defaultCat.name,
      component: defaultComp.name,
      defect: defaultComp.defects[0],
    };
  }

  if (motivo.includes(' > ')) {
    const parts = motivo.split(' > ').map(p => p.trim());
    if (parts.length >= 3) {
      return {
        category: parts[0],
        component: parts[1],
        defect: parts.slice(2).join(' > '),
      };
    } else if (parts.length === 2) {
      return {
        category: category || FAULT_TREE_CATEGORIES[0].name,
        component: parts[0],
        defect: parts[1],
      };
    }
  }

  const lower = motivo.toLowerCase();
  for (const cat of FAULT_TREE_CATEGORIES) {
    for (const comp of cat.components) {
      for (const d of comp.defects) {
        if (d.toLowerCase() === lower || lower.includes(d.toLowerCase())) {
          return {
            category: cat.name,
            component: comp.name,
            defect: d,
          };
        }
      }
    }
  }

  if (lower.includes('vazamento') && lower.includes('ar')) {
    return {
      category: '💧 HIDRÁULICA & PNEUMÁTICA',
      component: 'Eixo Expansivo',
      defect: 'Vazamento de Ar no Eixo',
    };
  }
  if (lower.includes('rolamento') || lower.includes('eixo')) {
    return {
      category: '🔧 MECÂNICA & ESTRUTURAL',
      component: 'Eixo Expansivo',
      defect: motivo,
    };
  }

  return {
    category: category || '🧪 PROCESSAMENTO & EXTRUSÃO (CAST / EREMA)',
    component: component || 'Geral',
    defect: defect || motivo,
  };
}

export function formatStopItemMotivo(category: string, component: string, defect: string): string {
  if (!category && !component && !defect) return '';
  if (!category && !component) return defect;
  if (!category) return `${component} > ${defect}`;
  return `${category} > ${component} > ${defect}`;
}

