/**
 * Serviço de Correção Ortográfica e Gramatical em Português Brasileiro (Norma Culta)
 * Implementa regras do Novo Acordo Ortográfico, concordância, acentuação gráfica e pontuação.
 */

export interface SpellcheckCorrection {
  original: string;
  corrected: string;
  reason: string;
  type?: 'ortografia' | 'acentuacao' | 'gramatica' | 'pontuacao';
}

export interface SpellcheckResult {
  originalText: string;
  correctedText: string;
  hasErrors: boolean;
  corrections: SpellcheckCorrection[];
  source: 'offline' | 'ai';
}

export interface SpellcheckSettings {
  enabled: boolean;
  autoCorrectOnSpace: boolean;
  autoCapitalizeSentences: boolean;
  autoCorrectOnBlur: boolean;
  highlightMistakes: boolean;
}

export interface CustomDictionaryEntry {
  id: string;
  wrongWord?: string;    // Como o usuário pode digitar errado (ex: "vistamax", "extrucao", "gezi")
  correctWord: string;  // Forma correta registrada pelo usuário (ex: "Vistamaxx", "extrusão", "Ghezzi")
  createdAt: string;
}

const SETTINGS_KEY = 'manupackaging_spellcheck_settings';
const CUSTOM_DICT_KEY = 'manupackaging_spellcheck_custom_dict';

export const DEFAULT_CUSTOM_WORDS: CustomDictionaryEntry[] = [
  { id: 'cw-1', wrongWord: 'vistamax', correctWord: 'Vistamaxx', createdAt: new Date().toISOString() },
  { id: 'cw-2', wrongWord: 'vistamx', correctWord: 'Vistamaxx', createdAt: new Date().toISOString() },
  { id: 'cw-3', wrongWord: 'cast1', correctWord: 'Cast 1', createdAt: new Date().toISOString() },
  { id: 'cw-4', wrongWord: 'cast2', correctWord: 'Cast 2', createdAt: new Date().toISOString() },
  { id: 'cw-5', wrongWord: 'erema1', correctWord: 'Erema 1', createdAt: new Date().toISOString() },
  { id: 'cw-6', wrongWord: 'gezi', correctWord: 'Ghezzi', createdAt: new Date().toISOString() },
  { id: 'cw-7', wrongWord: 'lintec', correctWord: 'Lintech', createdAt: new Date().toISOString() },
  { id: 'cw-8', wrongWord: 'uteck', correctWord: 'Wultec', createdAt: new Date().toISOString() },
  { id: 'cw-12', wrongWord: 'wutec', correctWord: 'Wultec', createdAt: new Date().toISOString() },
  { id: 'cw-13', wrongWord: 'ultech', correctWord: 'Wultec', createdAt: new Date().toISOString() },
  { id: 'cw-14', wrongWord: 'gehl', correctWord: 'Ghezzi', createdAt: new Date().toISOString() },
  { id: 'cw-15', wrongWord: 'ghezze', correctWord: 'Ghezzi', createdAt: new Date().toISOString() },
  { id: 'cw-9', wrongWord: 'extrucao', correctWord: 'extrusão', createdAt: new Date().toISOString() },
  { id: 'cw-10', wrongWord: 'bobinadera', correctWord: 'bobinadeira', createdAt: new Date().toISOString() },
  { id: 'cw-11', wrongWord: 'tubeti', correctWord: 'tubete', createdAt: new Date().toISOString() },
];

let inMemoryCustomDict: CustomDictionaryEntry[] | null = null;
let isDictSyncInitialized = false;

export function getCustomDictionary(): CustomDictionaryEntry[] {
  if (inMemoryCustomDict !== null) {
    return inMemoryCustomDict;
  }
  try {
    const stored = localStorage.getItem(CUSTOM_DICT_KEY);
    if (stored) {
      inMemoryCustomDict = JSON.parse(stored);
      return inMemoryCustomDict!;
    }
  } catch (e) {
    console.warn('Erro ao carregar dicionário personalizado local:', e);
  }
  inMemoryCustomDict = [...DEFAULT_CUSTOM_WORDS];
  try {
    localStorage.setItem(CUSTOM_DICT_KEY, JSON.stringify(inMemoryCustomDict));
  } catch (_) {}
  return inMemoryCustomDict;
}

export function saveCustomDictionary(entries: CustomDictionaryEntry[]): void {
  inMemoryCustomDict = entries;
  try {
    localStorage.setItem(CUSTOM_DICT_KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn('Erro ao salvar dicionário personalizado local:', e);
  }
  window.dispatchEvent(new CustomEvent('spellcheck-custom-dictionary-changed', { detail: entries }));

  // Sincroniza em segundo plano com o Firestore
  import('../lib/firebase').then(({ db }) => {
    import('firebase/firestore').then(({ doc, setDoc }) => {
      setDoc(doc(db, 'settings', 'spellcheck_dictionary'), {
        entries,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => {
        console.warn('Erro ao sincronizar dicionário com Firestore:', err);
      });
    });
  }).catch(() => {});
}

export function addCustomWord(correctWord: string, wrongWord?: string): CustomDictionaryEntry {
  const current = getCustomDictionary();
  const trimmedCorrect = correctWord.trim();
  const trimmedWrong = wrongWord ? wrongWord.trim() : undefined;

  // Verifica se já existe a mesma regra
  const existingIdx = current.findIndex(e => 
    e.correctWord.toLowerCase() === trimmedCorrect.toLowerCase() &&
    ((!e.wrongWord && !trimmedWrong) || (e.wrongWord?.toLowerCase() === trimmedWrong?.toLowerCase()))
  );

  const entry: CustomDictionaryEntry = {
    id: existingIdx >= 0 ? current[existingIdx].id : 'cw-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    correctWord: trimmedCorrect,
    wrongWord: trimmedWrong || undefined,
    createdAt: new Date().toISOString()
  };

  let updated: CustomDictionaryEntry[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = entry;
  } else {
    updated = [entry, ...current];
  }

  saveCustomDictionary(updated);
  return entry;
}

export function removeCustomWord(id: string): void {
  const current = getCustomDictionary();
  const updated = current.filter(e => e.id !== id);
  saveCustomDictionary(updated);
}

export function initCustomDictionarySync(): void {
  if (isDictSyncInitialized) return;
  isDictSyncInitialized = true;

  import('../lib/firebase').then(({ db }) => {
    import('firebase/firestore').then(({ doc, onSnapshot }) => {
      onSnapshot(doc(db, 'settings', 'spellcheck_dictionary'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data && Array.isArray(data.entries) && data.entries.length > 0) {
            inMemoryCustomDict = data.entries;
            try {
              localStorage.setItem(CUSTOM_DICT_KEY, JSON.stringify(data.entries));
            } catch (_) {}
            window.dispatchEvent(new CustomEvent('spellcheck-custom-dictionary-changed', { detail: data.entries }));
          }
        }
      }, (err) => {
        console.warn('Escuta de dicionário no Firestore indisponível:', err);
      });
    });
  }).catch(() => {});
}

export const defaultSpellcheckSettings: SpellcheckSettings = {
  enabled: true,
  autoCorrectOnSpace: true,
  autoCapitalizeSentences: true,
  autoCorrectOnBlur: true,
  highlightMistakes: true,
};

export function getSpellcheckSettings(): SpellcheckSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...defaultSpellcheckSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Erro ao carregar configurações do corretor:', e);
  }
  return defaultSpellcheckSettings;
}

export function saveSpellcheckSettings(settings: Partial<SpellcheckSettings>): SpellcheckSettings {
  try {
    const current = getSpellcheckSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('spellcheck-settings-changed', { detail: updated }));
    return updated;
  } catch (e) {
    console.warn('Erro ao salvar configurações do corretor:', e);
    return defaultSpellcheckSettings;
  }
}

/**
 * Dicionário estrito de termos comumente digitados incorretamente ou sem acento,
 * mapeados para a forma canônica da NORMA CULTA (Novo Acordo Ortográfico).
 */
const EXACT_WORD_REPLACEMENTS: Record<string, string> = {
  // Termos industriais e operacionais
  'producao': 'produção',
  'producoes': 'produções',
  'operacao': 'operação',
  'operacoes': 'operações',
  'operador': 'operador',
  'manutencao': 'manutenção',
  'manutencoes': 'manutenções',
  'maquina': 'máquina',
  'maquinas': 'máquinas',
  'horario': 'horário',
  'horarios': 'horários',
  'periodo': 'período',
  'periodos': 'períodos',
  'relatorio': 'relatório',
  'relatorios': 'relatórios',
  'observacao': 'observação',
  'observacoes': 'observações',
  'analise': 'análise',
  'analises': 'análises',
  'descricao': 'descrição',
  'descricoes': 'descrições',
  'fabrica': 'fábrica',
  'fabricas': 'fábricas',
  'tecnico': 'técnico',
  'tecnicos': 'técnicos',
  'tecnica': 'técnica',
  'tecnicas': 'técnicas',
  'mecanico': 'mecânico',
  'mecanicos': 'mecânicos',
  'mecanica': 'mecânica',
  'eletrico': 'elétrico',
  'eletricos': 'elétricos',
  'eletrica': 'elétrica',
  'eletricista': 'eletricista',
  'hidraulico': 'hidráulico',
  'hidraulicos': 'hidráulicos',
  'hidraulica': 'hidráulica',
  'pneumatico': 'pneumático',
  'pneumaticos': 'pneumáticos',
  'pneumatica': 'pneumática',
  'parametro': 'parâmetro',
  'parametros': 'parâmetros',
  'modulo': 'módulo',
  'modulos': 'módulos',
  'padrao': 'padrão',
  'padroes': 'padrões',
  'prevencao': 'prevenção',
  'lubrificacao': 'lubrificação',
  'calibracao': 'calibração',
  'inspecao': 'inspeção',
  'revisao': 'revisão',
  'revisoes': 'revisões',
  'tensao': 'tensão',
  'tensoes': 'tensões',
  'pressao': 'pressão',
  'pressoes': 'pressões',
  'dimensao': 'dimensão',
  'dimensoes': 'dimensões',
  'extrusao': 'extrusão',
  'reciclagem': 'reciclagem',
  'paralisacao': 'paralisação',
  'paralizacao': 'paralisação',
  'paralizar': 'paralisar',
  'paralizado': 'paralisado',
  'paralizada': 'paralisada',
  'paralizou': 'paralisou',
  'analizar': 'analisar',
  'analizado': 'analisado',
  'analizou': 'analisou',
  'pesquizar': 'pesquisar',
  'pesquiza': 'pesquisa',
  'funcao': 'função',
  'funcoes': 'funções',
  'condicao': 'condição',
  'condicoes': 'condições',
  'situacao': 'situação',
  'situacoes': 'situações',
  'conclusao': 'conclusão',
  'conclusoes': 'conclusões',
  'informacao': 'informação',
  'informacoes': 'informações',
  'avaliacao': 'avaliação',
  'avaliacoes': 'avaliações',
  'infracao': 'infração',
  'infracoes': 'infrações',
  'advertencia': 'advertência',
  'advertencias': 'advertências',
  'suspensao': 'suspensão',
  'suspensoes': 'suspensões',
  'justificativa': 'justificativa',
  'autorizacao': 'autorização',
  'autorizacoes': 'autorizações',
  'solicitacao': 'solicitação',
  'solicitacoes': 'solicitações',
  'comunicacao': 'comunicação',
  'comunicado': 'comunicado',
  'ferias': 'férias',
  'licenca': 'licença',
  'atestado': 'atestado',
  'medico': 'médico',
  'medicos': 'médicos',
  'saude': 'saúde',
  'sabado': 'sábado',
  'sabados': 'sábados',
  'terca': 'terça',
  'inicio': 'início',
  'termino': 'término',
  'ultimo': 'último',
  'ultimos': 'últimos',
  'ultima': 'última',
  'ultimas': 'últimas',
  'proximo': 'próximo',
  'proximos': 'próximos',
  'proxima': 'próxima',
  'proximas': 'próximas',
  'responsavel': 'responsável',
  'responsaveis': 'responsáveis',
  'disponivel': 'disponível',
  'disponiveis': 'disponíveis',
  'possivel': 'possível',
  'possiveis': 'possíveis',
  'impossivel': 'impossível',
  'impossiveis': 'impossíveis',
  'facil': 'fácil',
  'faceis': 'fáceis',
  'dificil': 'difícil',
  'dificeis': 'difíceis',
  'util': 'útil',
  'uteis': 'úteis',
  'urgencia': 'urgência',
  'urgencias': 'urgências',
  'ocorrencia': 'ocorrência',
  'ocorrencias': 'ocorrências',
  'experiencia': 'experiência',
  'experiencias': 'experiências',
  'exigencia': 'exigência',
  'exigencias': 'exigências',
  'eficiencia': 'eficiência',
  'frequencia': 'frequência',
  'ausencia': 'ausência',
  'importancia': 'importância',
  'distancia': 'distância',
  'tolerancia': 'tolerância',
  'referencia': 'referência',
  'sequencia': 'sequência',
  'consequencia': 'consequência',
  'consequencias': 'consequências',
  'industria': 'indústria',
  'industrias': 'indústrias',
  'criterio': 'critério',
  'criterios': 'critérios',
  'numero': 'número',
  'numeros': 'números',
  'indice': 'índice',
  'indices': 'índices',
  'grafico': 'gráfico',
  'graficos': 'gráficos',
  'estatistica': 'estatística',
  'estatisticas': 'estatísticas',
  'nivel': 'nível',
  'niveis': 'níveis',
  'falha': 'falha',
  'falhas': 'falhas',
  'parada': 'parada',
  'paradas': 'paradas',
  'motivo': 'motivo',
  'motivos': 'motivos',
  'troca': 'troca',
  'ajuste': 'ajuste',
  'limpeza': 'limpeza',
  'velocidade': 'velocidade',
  'espessura': 'espessura',
  'largura': 'largura',
  'diametro': 'diâmetro',
  'bobinamento': 'bobinamento',
  'tubete': 'tubete',
  'tubetes': 'tubetes',
  'borra': 'borra',
  'refugo': 'refugo',
  'apara': 'apara',
  'aparas': 'aparas',
  'bobina': 'bobina',
  'bobinas': 'bobinas',
  'jumbo': 'jumbo',
  'jumbos': 'jumbos',
  'pallet': 'palete',
  'pallets': 'paletes',

  // Palavras funcionais, gramaticais e monossílabos da língua portuguesa
  'nao': 'não',
  'sao': 'são',
  'estao': 'estão',
  'sera': 'será',
  'serao': 'serão',
  'esta': 'está',
  'estas': 'estás',
  'ja': 'já',
  'ate': 'até',
  'tambem': 'também',
  'voce': 'você',
  'voces': 'vocês',
  'so': 'só',
  'tres': 'três',
  'mes': 'mês',
  'meses': 'meses',
  'apos': 'após',
  'alem': 'além',
  'porem': 'porém',
  'ninguem': 'ninguém',
  'alguem': 'alguém',
  'armazem': 'armazém',
  'parabens': 'parabéns',
  'entao': 'então',
  'razao': 'razão',
  'visao': 'visão',
  'sessao': 'sessão',
  'secao': 'seção',
  'cessao': 'cessão',
  'opcao': 'opção',
  'opcoes': 'opções',
  'acao': 'ação',
  'acoes': 'ações',
  'solucao': 'solução',
  'solucoes': 'soluções',
  'atencao': 'atenção',
  'orientacao': 'orientação',
  'orientacoes': 'orientações',
  'geracao': 'geração',
  'alteracao': 'alteração',
  'alteracoes': 'alterações',
  'confirmacao': 'confirmação',
  'substituicao': 'substituição',
  'substituicoes': 'substituições',
  'verificacao': 'verificação',
  'verificacoes': 'verificações',
  'reclamacao': 'reclamação',
  'reclamacoes': 'reclamações',
  'execucao': 'execução',
  'distribuicao': 'distribuição',
  'organizacao': 'organização',
  'atualizacao': 'atualização',
  'atualizacoes': 'atualizações',
  'padronizacao': 'padronização',
  'otimizacao': 'otimização',

  // Erros ortográficos e confusões comuns em pt-BR
  'concerteza': 'com certeza',
  'excessao': 'exceção',
  'excessão': 'exceção',
  'exceçao': 'exceção',
  'escessão': 'exceção',
  'esceção': 'exceção',
  'ancioso': 'ansioso',
  'anciosa': 'ansiosa',
  'anciosos': 'ansiosos',
  'anciosas': 'ansiosas',
  'anciedade': 'ansiedade',
  'enchergar': 'enxergar',
  'enchergando': 'enxergando',
  'enchergou': 'enxergou',
  'reinvidicar': 'reivindicar',
  'reinvidicacao': 'reivindicação',
  'previlegio': 'privilégio',
  'previlégio': 'privilégio',
  'beneficiente': 'beneficente',
  'beneficientes': 'beneficentes',
  'menas': 'menos',
  'seje': 'seja',
  'esteje': 'esteja',
  'porisso': 'por isso',
  'derrepente': 'de repente',
  'conserteza': 'com certeza',
  'prazerosamente': 'prazerosamente',
  'sujeito': 'sujeito',
  'expontaneo': 'espontâneo',
  'espontaneo': 'espontâneo',
  'estranho': 'estranho',
  'estranhos': 'estranhos',
  'excessivo': 'excessivo',
  'excesso': 'excesso',
  'excessos': 'excessos',
  'encomenda': 'encomenda',
  'encomendas': 'encomendas',
  'companhia': 'companhia',
  'companhias': 'companhias',
  'imediato': 'imediato',
  'imediatamente': 'imediatamente',
  'urgentemente': 'urgentemente',
  'prioritario': 'prioritário',
  'prioritaria': 'prioritária',
  'prioritarios': 'prioritários',
  'prioritarias': 'prioritárias',
  'formulario': 'formulário',
  'formularios': 'formulários',
  'salario': 'salário',
  'salarios': 'salários',
  'funcionario': 'funcionário',
  'funcionarios': 'funcionários',
  'funcionaria': 'funcionária',
  'funcionarias': 'funcionárias',
  'voluntario': 'voluntário',
  'voluntarios': 'voluntários',
  'itinerario': 'itinerário',
  'itinerarios': 'itinerários',
  'extraordinario': 'extraordinário',
  'extraordinarios': 'extraordinários',
  'necessario': 'necessário',
  'necessarios': 'necessários',
  'necessaria': 'necessária',
  'necessarias': 'necessárias',
  'temporario': 'temporário',
  'temporarios': 'temporários',
  'temporaria': 'temporária',
  'temporarias': 'temporárias',
  'proprietario': 'proprietário',
  'proprietarios': 'proprietários',
  'diario': 'diário',
  'diarios': 'diários',
  'diaria': 'diária',
  'diarias': 'diárias',

  // Novo Acordo Ortográfico (palavras que perderam o acento ou mudaram)
  'ideia': 'ideia',
  'idéia': 'ideia',
  'plateia': 'plateia',
  'platéia': 'plateia',
  'heroico': 'heroico',
  'heróico': 'heroico',
  'jiboia': 'jiboia',
  'jibóia': 'jiboia',
  'apoia': 'apoia',
  'apóia': 'apoia',
  'estreia': 'estreia',
  'estréia': 'estreia',
  'voo': 'voo',
  'vôo': 'voo',
  'enjoo': 'enjoo',
  'enjôo': 'enjoo',
  'leem': 'leem',
  'lêem': 'leem',
  'veem': 'veem',
  'vêem': 'veem',
  'creem': 'creem',
  'crêem': 'creem',
  'deem': 'deem',
  'dêem': 'deem',
};

/**
 * Expressões gramaticais compostas com substituição na Norma Culta
 */
const PHRASE_REPLACEMENTS: Array<{ regex: RegExp; replacement: string; reason: string }> = [
  {
    regex: /\bconcerteza\b/gi,
    replacement: 'com certeza',
    reason: '"Com certeza" escreve-se sempre separado na norma culta.'
  },
  {
    regex: /\bporisso\b/gi,
    replacement: 'por isso',
    reason: '"Por isso" escreve-se sempre separado.'
  },
  {
    regex: /\bderrepente\b/gi,
    replacement: 'de repente',
    reason: '"De repente" escreve-se sempre separado.'
  },
  {
    regex: /\bnada haver\b/gi,
    replacement: 'nada a ver',
    reason: 'A expressão correta da norma culta é "nada a ver" (relação), não "nada haver".'
  },
  {
    regex: /\bafim de\b/gi,
    replacement: 'a fim de',
    reason: '"A fim de" (com objetivo de) escreve-se separado.'
  },
  {
    regex: /\bao meu ver\b/gi,
    replacement: 'a meu ver',
    reason: 'Na norma culta, utiliza-se "a meu ver" (sem o artigo "o").'
  },
  {
    regex: /\bmenas\b/gi,
    replacement: 'menos',
    reason: '"Menos" é palavra invariável; "menas" não existe na norma culta.'
  },
  {
    regex: /\bseje\b/gi,
    replacement: 'seja',
    reason: 'A forma verbal correta do presente do subjuntivo é "seja".'
  },
  {
    regex: /\besteje\b/gi,
    replacement: 'esteja',
    reason: 'A forma verbal correta do presente do subjuntivo é "esteja".'
  },
  {
    regex: /\bfazem\s+(\d+|muitos|dois|tres|três|quatro|cinco|dez)\s+(anos|meses|dias|minutos|horas)\b/gi,
    replacement: 'faz $1 $2',
    reason: 'O verbo "fazer" indicando tempo decorrido é impessoal e deve ficar no singular ("faz anos").'
  },
  {
    regex: /\bhouveram\s+(problemas|falhas|paradas|erros|motivos|duvidas|dúvidas)\b/gi,
    replacement: 'houve $1',
    reason: 'O verbo "haver" no sentido de existir ou ocorrer é impessoal e permanece no singular ("houve problemas").'
  },
  {
    regex: /\bmateria\s+prima\b/gi,
    replacement: 'matéria-prima',
    reason: 'Segundo o Novo Acordo Ortográfico, "matéria-prima" grafar-se-á com hífen e acento.'
  },
  {
    regex: /\bnao\s+conformidade\b/gi,
    replacement: 'não conformidade',
    reason: 'Grafia correta: "não conformidade".'
  }
];

/**
 * Preserva o padrão de caixa alta/baixa da palavra original
 */
function preserveCasing(original: string, replacement: string): string {
  if (!original || !replacement) return replacement;
  
  // Se a palavra original estiver toda em maiúsculas (ex: PRODUCAO -> PRODUÇÃO)
  if (original === original.toUpperCase() && original.length > 1) {
    return replacement.toUpperCase();
  }
  
  // Se a primeira letra estiver em maiúscula (ex: Producao -> Produção)
  if (original[0] === original[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  
  // Padrão minúsculo
  return replacement.toLowerCase();
}

/**
 * Verifica se uma palavra termina com sufixos comuns que exigem acento e regras ortográficas
 */
function correctWordByRules(rawWord: string): string | null {
  const lower = rawWord.toLowerCase();

  // 1. Dicionário exato
  if (EXACT_WORD_REPLACEMENTS[lower]) {
    return preserveCasing(rawWord, EXACT_WORD_REPLACEMENTS[lower]);
  }

  // Se já tiver acento ou for muito curta, preserva
  if (lower.length < 4) return null;

  // 2. Regra para sufixo -cao / -coes (oxítona terminada em ditongo nasal)
  if (lower.endsWith('cao') && !lower.endsWith('acao') && !lower.endsWith('icao')) {
    // Ex: acao -> ação
    const corrected = lower.slice(0, -3) + 'ção';
    return preserveCasing(rawWord, corrected);
  }
  if (lower.endsWith('acao')) {
    const corrected = lower.slice(0, -4) + 'ação';
    return preserveCasing(rawWord, corrected);
  }
  if (lower.endsWith('icao')) {
    const corrected = lower.slice(0, -4) + 'ição';
    return preserveCasing(rawWord, corrected);
  }
  if (lower.endsWith('coes') || lower.endsWith('acoes') || lower.endsWith('icoes')) {
    if (lower.endsWith('acoes')) {
      return preserveCasing(rawWord, lower.slice(0, -5) + 'ações');
    }
    if (lower.endsWith('icoes')) {
      return preserveCasing(rawWord, lower.slice(0, -5) + 'ições');
    }
    return preserveCasing(rawWord, lower.slice(0, -4) + 'ções');
  }

  // 3. Regra para sufixo paroxítono -vel / -veis
  if (lower.endsWith('vel') && lower.length > 5 && !/[áéíóúâêôãõ]/.test(lower)) {
    // ex: responsavel -> responsável, disponivel -> disponível, sustentavel -> sustentável
    // Coloca acento na antepenúltima ou penúltima vogal tônica
    if (lower.includes('avel')) {
      return preserveCasing(rawWord, lower.replace(/avel$/, 'ável'));
    }
    if (lower.includes('ivel')) {
      return preserveCasing(rawWord, lower.replace(/ivel$/, 'ível'));
    }
    if (lower.includes('uvel')) {
      return preserveCasing(rawWord, lower.replace(/uvel$/, 'úvel'));
    }
  }
  if (lower.endsWith('veis') && lower.length > 6 && !/[áéíóúâêôãõ]/.test(lower)) {
    if (lower.includes('aveis')) {
      return preserveCasing(rawWord, lower.replace(/aveis$/, 'áveis'));
    }
    if (lower.includes('iveis')) {
      return preserveCasing(rawWord, lower.replace(/iveis$/, 'íveis'));
    }
  }

  // 4. Regra para paroxítonas terminadas em ditongo crescente: -encia / -ancia
  if (lower.endsWith('encia') && !/[áéíóúâêôãõ]/.test(lower)) {
    return preserveCasing(rawWord, lower.replace(/encia$/, 'ência'));
  }
  if (lower.endsWith('encias') && !/[áéíóúâêôãõ]/.test(lower)) {
    return preserveCasing(rawWord, lower.replace(/encias$/, 'ências'));
  }
  if (lower.endsWith('ancia') && !/[áéíóúâêôãõ]/.test(lower)) {
    return preserveCasing(rawWord, lower.replace(/ancia$/, 'ância'));
  }
  if (lower.endsWith('ancias') && !/[áéíóúâêôãõ]/.test(lower)) {
    return preserveCasing(rawWord, lower.replace(/ancias$/, 'âncias'));
  }

  // 5. Regra para paroxítonas terminadas em -ario / -aria / -arios / -arias
  if (lower.endsWith('ario') && lower.length > 5 && !/[áéíóúâêôãõ]/.test(lower)) {
    return preserveCasing(rawWord, lower.replace(/ario$/, 'ário'));
  }
  if (lower.endsWith('arios') && lower.length > 6 && !/[áéíóúâêôãõ]/.test(lower)) {
    return preserveCasing(rawWord, lower.replace(/arios$/, 'ários'));
  }

  return null;
}

/**
 * Corrige uma palavra individual caso haja desvio ortográfico
 */
export function correctSingleWord(word: string): string | null {
  if (!word || !word.trim()) return null;

  const rawClean = word.trim();
  const lower = rawClean.toLowerCase();
  const norm = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Prioridade Máxima: Dicionário Personalizado do Usuário
  const customEntries = getCustomDictionary();
  for (const entry of customEntries) {
    if (!entry || !entry.correctWord) continue;

    // Se o usuário definiu uma forma errada específica (ex: "vistamax" ou "extrucao")
    if (entry.wrongWord) {
      const wrongLower = entry.wrongWord.toLowerCase().trim();
      const wrongNorm = wrongLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (lower === wrongLower || norm === wrongNorm) {
        return entry.correctWord;
      }
    }

    // Se o usuário cadastrou uma palavra correta (ex: "Vistamaxx", "Cast 1", "Bobinadeira")
    const correctLower = entry.correctWord.toLowerCase().trim();
    const correctNorm = correctLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if ((lower === correctLower || norm === correctNorm) && rawClean !== entry.correctWord) {
      return entry.correctWord;
    }
  }

  // 2. Se for puramente numérico (ex: 100, 2026), não alterar
  if (/^\d+$/.test(rawClean)) return null;

  // 3. Regras gramaticais e dicionário canônico da Norma Culta
  return correctWordByRules(rawClean);
}

/**
 * Aplica regras formais de pontuação e capitalização de orações da Norma Culta
 */
export function formatPunctuationAndCapitalization(text: string, autoCapitalize = true): string {
  if (!text) return text;

  let result = text;

  // 1. Remove múltiplos espaços desnecessários (mantém quebras de linha)
  result = result.replace(/[ \t]{2,}/g, ' ');

  // 2. Remove espaços indevidos antes de pontuações
  result = result.replace(/\s+([,.:;!?])/g, '$1');

  // 3. Garante espaço após pontuações se seguido por letra (exceto números, ex: 3,5 ou 10.000)
  result = result.replace(/([,.:;!?])([a-zA-ZáéíóúâêôãõàüçÁÉÍÓÚÂÊÔÃÕÀÜÇ])/g, '$1 $2');

  // 4. Capitalização automática da primeira letra e após pontuações finais (. ? !)
  if (autoCapitalize && result.length > 0) {
    // Primeira letra do texto
    result = result.replace(/^(\s*)([a-zà-úç])/i, (match, prefix, char) => prefix + char.toUpperCase());

    // Letra após ponto final, interrogação, exclamação ou quebra de linha
    result = result.replace(/([.!?\n]\s*)([a-zà-úç])/g, (match, punct, char) => punct + char.toUpperCase());
  }

  return result;
}

/**
 * Realiza a correção ortográfica e gramatical rápida e offline de acordo com a Norma Culta.
 */
export function correctTextOffline(
  text: string, 
  options: Partial<SpellcheckSettings> = {}
): SpellcheckResult {
  if (!text || typeof text !== 'string') {
    return {
      originalText: text,
      correctedText: text,
      hasErrors: false,
      corrections: [],
      source: 'offline'
    };
  }

  const settings = { ...getSpellcheckSettings(), ...options };
  const corrections: SpellcheckCorrection[] = [];
  let workingText = text;

  // 1. Aplica substituições de locuções e frases compostas
  for (const phraseRule of PHRASE_REPLACEMENTS) {
    if (phraseRule.regex.test(workingText)) {
      workingText = workingText.replace(phraseRule.regex, (match) => {
        const replacement = preserveCasing(match, phraseRule.replacement);
        corrections.push({
          original: match,
          corrected: replacement,
          reason: phraseRule.reason,
          type: 'gramatica'
        });
        return replacement;
      });
    }
  }

  // 2. Tokenização de palavras preservando pontuações e espaços
  // Regex que isola palavras preservando separadores
  const tokenRegex = /([a-zA-ZáéíóúâêôãõàüçÁÉÍÓÚÂÊÔÃÕÀÜÇ]+)/g;
  workingText = workingText.replace(tokenRegex, (word) => {
    // Ignora termos com dígitos ou códigos industriais (ex: CAST1, BUT01)
    if (/\d/.test(word)) return word;

    const corrected = correctSingleWord(word);
    if (corrected && corrected !== word) {
      corrections.push({
        original: word,
        corrected,
        reason: `Acentuação ou grafia da norma culta: "${word}" ➔ "${corrected}".`,
        type: 'ortografia'
      });
      return corrected;
    }
    return word;
  });

  // 3. Formata pontuações e maiúsculas
  if (settings.autoCapitalizeSentences) {
    const formatted = formatPunctuationAndCapitalization(workingText, true);
    if (formatted !== workingText) {
      workingText = formatted;
    }
  }

  return {
    originalText: text,
    correctedText: workingText,
    hasErrors: corrections.length > 0 || workingText !== text,
    corrections,
    source: 'offline'
  };
}

/**
 * Realiza a verificação e correção ortográfica avançada via IA (Gemini 3.8 Flash)
 * com fallback transparente para a correção offline.
 */
export async function correctTextWithAI(text: string): Promise<SpellcheckResult> {
  if (!text || !text.trim()) {
    return {
      originalText: text,
      correctedText: text,
      hasErrors: false,
      corrections: [],
      source: 'offline'
    };
  }

  try {
    const response = await fetch('/api/spellcheck-ptbr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error(`Servidor retornou status ${response.status}`);
    }

    const data = await response.json();
    if (data.fallback) {
      return correctTextOffline(text);
    }
    if (data.correctedText) {
      return {
        originalText: text,
        correctedText: data.correctedText,
        hasErrors: !!data.hasErrors || data.correctedText !== text,
        corrections: data.corrections || [],
        source: 'ai'
      };
    }
  } catch (error) {
    console.warn('Correção via IA indisponível, utilizando corretor offline da norma culta:', error);
  }

  // Fallback offline garantido
  return correctTextOffline(text);
}

/**
 * Atualiza com segurança o valor de um campo HTMLInputElement ou HTMLTextAreaElement
 * disparando os eventos nativos do React ('input' e 'change') e preservando o foco e cursor.
 */
export function applyCorrectionToElement(
  element: HTMLInputElement | HTMLTextAreaElement,
  newText: string,
  targetCursorPos?: number
): boolean {
  if (!element || element.value === newText) return false;

  try {
    const isTextArea = element instanceof HTMLTextAreaElement;
    const prototype = isTextArea 
      ? window.HTMLTextAreaElement.prototype 
      : window.HTMLInputElement.prototype;

    // Notifica o valueTracker interno do React para que o synthetic onChange dispare perfeitamente
    const tracker = (element as any)._valueTracker;
    if (tracker) {
      tracker.setValue(element.value + '__reset');
    }

    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    if (descriptor && descriptor.set) {
      descriptor.set.call(element, newText);
    } else {
      element.value = newText;
    }

    // Dispara eventos compatíveis com a árvore do React
    element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

    if (typeof targetCursorPos === 'number') {
      const pos = Math.min(Math.max(0, targetCursorPos), newText.length);
      element.setSelectionRange(pos, pos);
    }

    return true;
  } catch (e) {
    console.error('Erro ao aplicar correção ao elemento:', e);
    return false;
  }
}

/**
 * Verifica se um elemento HTML é um campo de digitação de texto aplicável
 */
export function isTypingElement(element: Element | null): element is HTMLInputElement | HTMLTextAreaElement {
  if (!element) return false;

  if (element instanceof HTMLTextAreaElement) {
    return !element.disabled && !element.readOnly;
  }

  if (element instanceof HTMLInputElement) {
    if (element.disabled || element.readOnly) return false;
    const type = (element.type || 'text').toLowerCase();
    // Exclui campos que não devem sofrer correção de texto gramatical
    const excludedTypes = ['password', 'number', 'email', 'file', 'checkbox', 'radio', 'hidden', 'color', 'date', 'time', 'datetime-local', 'range'];
    return !excludedTypes.includes(type);
  }

  return false;
}
