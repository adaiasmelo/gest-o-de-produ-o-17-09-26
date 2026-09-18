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
  'acao': 'ação',
  'acoes': 'ações',
  'advertencia': 'advertência',
  'advertencias': 'advertências',
  'agua': 'água',
  'aguas': 'águas',
  'ajuste': 'ajuste',
  'alem': 'além',
  'alguem': 'alguém',
  'alimentacao': 'alimentação',
  'almoco': 'almoço',
  'almocos': 'almoços',
  'alteracao': 'alteração',
  'alteracoes': 'alterações',
  'analise': 'análise',
  'analises': 'análises',
  'analizado': 'analisado',
  'analizar': 'analisar',
  'analizou': 'analisou',
  'anciedade': 'ansiedade',
  'anciosa': 'ansiosa',
  'anciosas': 'ansiosas',
  'ancioso': 'ansioso',
  'anciosos': 'ansiosos',
  'apara': 'apara',
  'aparas': 'aparas',
  'aplicavel': 'aplicável',
  'apoia': 'apoia',
  'apos': 'após',
  'apóia': 'apoia',
  'armazem': 'armazém',
  'ate': 'até',
  'atencao': 'atenção',
  'atestado': 'atestado',
  'atualizacao': 'atualização',
  'atualizacoes': 'atualizações',
  'ausencia': 'ausência',
  'automatica': 'automática',
  'automaticamente': 'automaticamente',
  'automatico': 'automático',
  'autorizacao': 'autorização',
  'autorizacoes': 'autorizações',
  'avaliacao': 'avaliação',
  'avaliacoes': 'avaliações',
  'basica': 'básica',
  'basico': 'básico',
  'beneficiente': 'beneficente',
  'beneficientes': 'beneficentes',
  'beneficio': 'benefício',
  'beneficios': 'benefícios',
  'blz': 'beleza',
  'bobina': 'bobina',
  'bobinadera': 'bobinadeira',
  'bobinamento': 'bobinamento',
  'bobinas': 'bobinas',
  'borra': 'borra',
  'ca': 'cá',
  'cafe': 'café',
  'cafes': 'cafés',
  'calibracao': 'calibração',
  'cast1': 'Cast 1',
  'cast2': 'Cast 2',
  'cessao': 'cessão',
  'codigo': 'código',
  'codigos': 'códigos',
  'combustiveis': 'combustíveis',
  'combustivel': 'combustível',
  'companhia': 'companhia',
  'companhias': 'companhias',
  'comunicacao': 'comunicação',
  'comunicado': 'comunicado',
  'concerteza': 'com certeza',
  'concluida': 'concluída',
  'concluidas': 'concluídas',
  'concluido': 'concluído',
  'concluidos': 'concluídos',
  'conclusao': 'conclusão',
  'conclusoes': 'conclusões',
  'condicao': 'condição',
  'condicoes': 'condições',
  'confiavel': 'confiável',
  'confirmacao': 'confirmação',
  'consequencia': 'consequência',
  'consequencias': 'consequências',
  'conserteza': 'com certeza',
  'conserto': 'conserto',
  'construido': 'construído',
  'conteudo': 'conteúdo',
  'conteudos': 'conteúdos',
  'creem': 'creem',
  'criterio': 'critério',
  'criterios': 'critérios',
  'critica': 'crítica',
  'critico': 'crítico',
  'crêem': 'creem',
  'deem': 'deem',
  'derrepente': 'de repente',
  'descricao': 'descrição',
  'descricoes': 'descrições',
  'desperdicio': 'desperdício',
  'desperdicios': 'desperdícios',
  'destruido': 'destruído',
  'diagnostico': 'diagnóstico',
  'diametro': 'diâmetro',
  'diametros': 'diâmetros',
  'diaria': 'diária',
  'diarias': 'diárias',
  'diario': 'diário',
  'diarios': 'diários',
  'dificeis': 'difíceis',
  'dificil': 'difícil',
  'dimensao': 'dimensão',
  'dimensoes': 'dimensões',
  'dinamico': 'dinâmico',
  'disponiveis': 'disponíveis',
  'disponivel': 'disponível',
  'distancia': 'distância',
  'distribuicao': 'distribuição',
  'distribuido': 'distribuído',
  'dps': 'depois',
  'duracao': 'duração',
  'duvida': 'dúvida',
  'duvidas': 'dúvidas',
  'dêem': 'deem',
  'edificio': 'edifício',
  'eficiencia': 'eficiência',
  'eh': 'é',
  'eletrica': 'elétrica',
  'eletricas': 'elétricas',
  'eletricista': 'eletricista',
  'eletrico': 'elétrico',
  'eletricos': 'elétricos',
  'eletronica': 'eletrônica',
  'eletronico': 'eletrônico',
  'emergencia': 'emergência',
  'emergencias': 'emergências',
  'enchergando': 'enxergando',
  'enchergar': 'enxergar',
  'enchergou': 'enxergou',
  'encomenda': 'encomenda',
  'encomendas': 'encomendas',
  'enjoo': 'enjoo',
  'enjôo': 'enjoo',
  'entao': 'então',
  'equilibrio': 'equilíbrio',
  'erema1': 'Erema 1',
  'escessão': 'exceção',
  'esceção': 'exceção',
  'especifica': 'específica',
  'especifico': 'específico',
  'espessura': 'espessura',
  'espontaneo': 'espontâneo',
  'esta': 'está',
  'estah': 'está',
  'estao': 'estão',
  'estara': 'estará',
  'estarao': 'estarão',
  'estas': 'estás',
  'estatico': 'estático',
  'estatistica': 'estatística',
  'estatisticas': 'estatísticas',
  'estavel': 'estável',
  'esteje': 'esteja',
  'estranho': 'estranho',
  'estranhos': 'estranhos',
  'estreia': 'estreia',
  'estréia': 'estreia',
  'excessao': 'exceção',
  'excessivo': 'excessivo',
  'excesso': 'excesso',
  'excessos': 'excessos',
  'excessão': 'exceção',
  'exceçao': 'exceção',
  'execucao': 'execução',
  'exercicio': 'exercício',
  'exercicios': 'exercícios',
  'exigencia': 'exigência',
  'exigencias': 'exigências',
  'experiencia': 'experiência',
  'experiencias': 'experiências',
  'expontaneo': 'espontâneo',
  'extraordinario': 'extraordinário',
  'extraordinarios': 'extraordinários',
  'extrucao': 'extrusão',
  'extrusao': 'extrusão',
  'extrusor': 'extrusor',
  'extrusora': 'extrusora',
  'fabrica': 'fábrica',
  'fabricas': 'fábricas',
  'faceis': 'fáceis',
  'facil': 'fácil',
  'falha': 'falha',
  'falhas': 'falhas',
  'fara': 'fará',
  'farao': 'farão',
  'ferias': 'férias',
  'fisica': 'física',
  'fisico': 'físico',
  'flexivel': 'flexível',
  'formulario': 'formulário',
  'formularios': 'formulários',
  'frequencia': 'frequência',
  'funcao': 'função',
  'funcionaria': 'funcionária',
  'funcionarias': 'funcionárias',
  'funcionario': 'funcionário',
  'funcionarios': 'funcionários',
  'funcoes': 'funções',
  'fusiveis': 'fusíveis',
  'fusivel': 'fusível',
  'gas': 'gás',
  'gases': 'gases',
  'geracao': 'geração',
  'gezi': 'Ghezzi',
  'ghezze': 'Ghezzi',
  'grafico': 'gráfico',
  'graficos': 'gráficos',
  'heroico': 'heroico',
  'heróico': 'heroico',
  'hidraulica': 'hidráulica',
  'hidraulicas': 'hidráulicas',
  'hidraulico': 'hidráulico',
  'hidraulicos': 'hidráulicos',
  'hipotese': 'hipótese',
  'historica': 'histórica',
  'historico': 'histórico',
  'hj': 'hoje',
  'horario': 'horário',
  'horarios': 'horários',
  'ideia': 'ideia',
  'idéia': 'ideia',
  'imediatamente': 'imediatamente',
  'imediato': 'imediato',
  'importancia': 'importância',
  'impossiveis': 'impossíveis',
  'impossivel': 'impossível',
  'imprevisivel': 'imprevisível',
  'indice': 'índice',
  'indices': 'índices',
  'industria': 'indústria',
  'industrias': 'indústrias',
  'inflamavel': 'inflamável',
  'informacao': 'informação',
  'informacoes': 'informações',
  'infracao': 'infração',
  'infracoes': 'infrações',
  'inicio': 'início',
  'inicios': 'inícios',
  'inspecao': 'inspeção',
  'inspecoes': 'inspeções',
  'instalacao': 'instalação',
  'instavel': 'instável',
  'interrupcao': 'interrupção',
  'interrupcoes': 'interrupções',
  'inuteis': 'inúteis',
  'inutil': 'inútil',
  'invisivel': 'invisível',
  'itinerario': 'itinerário',
  'itinerarios': 'itinerários',
  'ja': 'já',
  'jiboia': 'jiboia',
  'jibóia': 'jiboia',
  'juizo': 'juízo',
  'juizos': 'juízos',
  'jumbo': 'jumbo',
  'jumbos': 'jumbos',
  'justificativa': 'justificativa',
  'la': 'lá',
  'largura': 'largura',
  'leem': 'leem',
  'licenca': 'licença',
  'lider': 'líder',
  'lideres': 'líderes',
  'limpeza': 'limpeza',
  'lintec': 'Lintech',
  'liquido': 'líquido',
  'liquidos': 'líquidos',
  'logica': 'lógica',
  'logico': 'lógico',
  'lubrificacao': 'lubrificação',
  'lêem': 'leem',
  'manutencao': 'manutenção',
  'manutencoes': 'manutenções',
  'manutensao': 'manutenção',
  'manutençao': 'manutenção',
  'maquina': 'máquina',
  'maquinas': 'máquinas',
  'maxima': 'máxima',
  'maximo': 'máximo',
  'mecanica': 'mecânica',
  'mecanicas': 'mecânicas',
  'mecanico': 'mecânico',
  'mecanicos': 'mecânicos',
  'medico': 'médico',
  'medicos': 'médicos',
  'menas': 'menos',
  'mes': 'mês',
  'meses': 'meses',
  'metodo': 'método',
  'metodos': 'métodos',
  'minima': 'mínima',
  'minimo': 'mínimo',
  'modulo': 'módulo',
  'modulos': 'módulos',
  'motivo': 'motivo',
  'motivos': 'motivos',
  'msg': 'mensagem',
  'nao': 'não',
  'necessaria': 'necessária',
  'necessarias': 'necessárias',
  'necessario': 'necessário',
  'necessarios': 'necessários',
  'ninguem': 'ninguém',
  'niveis': 'níveis',
  'nivel': 'nível',
  'numero': 'número',
  'numeros': 'números',
  'obg': 'obrigado',
  'observacao': 'observação',
  'observacoes': 'observações',
  'obstrucao': 'obstrução',
  'ocorrencia': 'ocorrência',
  'ocorrencias': 'ocorrências',
  'oleo': 'óleo',
  'oleos': 'óleos',
  'opcao': 'opção',
  'opcoes': 'opções',
  'operacao': 'operação',
  'operacoes': 'operações',
  'operador': 'operador',
  'oq': 'o que',
  'organizacao': 'organização',
  'orientacao': 'orientação',
  'orientacoes': 'orientações',
  'otima': 'ótima',
  'otimizacao': 'otimização',
  'otimo': 'ótimo',
  'padrao': 'padrão',
  'padroes': 'padrões',
  'padronizacao': 'padronização',
  'pais': 'país',
  'paises': 'países',
  'pallet': 'palete',
  'pallets': 'paletes',
  'parabens': 'parabéns',
  'parada': 'parada',
  'paradas': 'paradas',
  'paralisacao': 'paralisação',
  'paralisar': 'paralisar',
  'paralizacao': 'paralisação',
  'paralizada': 'paralisada',
  'paralizado': 'paralisado',
  'paralizar': 'paralisar',
  'paralizou': 'paralisou',
  'parametro': 'parâmetro',
  'parametros': 'parâmetros',
  'pe': 'pé',
  'periodo': 'período',
  'periodos': 'períodos',
  'pesquisar': 'pesquisar',
  'pesquiza': 'pesquisa',
  'pesquizar': 'pesquisar',
  'pessima': 'péssima',
  'pessimo': 'péssimo',
  'petroleo': 'petróleo',
  'plastico': 'plástico',
  'plasticos': 'plásticos',
  'plateia': 'plateia',
  'platéia': 'plateia',
  'pneumatica': 'pneumática',
  'pneumaticas': 'pneumáticas',
  'pneumatico': 'pneumático',
  'pneumaticos': 'pneumáticos',
  'po': 'pó',
  'porem': 'porém',
  'porisso': 'por isso',
  'possiveis': 'possíveis',
  'possivel': 'possível',
  'potencia': 'potência',
  'pq': 'porque',
  'pra': 'para',
  'pras': 'para as',
  'pratica': 'prática',
  'pratico': 'prático',
  'prazerosamente': 'prazerosamente',
  'prejuizo': 'prejuízo',
  'prejuizos': 'prejuízos',
  'presenca': 'presença',
  'presencas': 'presenças',
  'pressao': 'pressão',
  'pressoes': 'pressões',
  'prevencao': 'prevenção',
  'previlegio': 'privilégio',
  'previlégio': 'privilégio',
  'previsao': 'previsão',
  'previsivel': 'previsível',
  'prioritaria': 'prioritária',
  'prioritarias': 'prioritárias',
  'prioritario': 'prioritário',
  'prioritarios': 'prioritários',
  'pro': 'para o',
  'producao': 'produção',
  'producoes': 'produções',
  'produçao': 'produção',
  'propria': 'própria',
  'proprias': 'próprias',
  'proprietario': 'proprietário',
  'proprietarios': 'proprietários',
  'proprio': 'próprio',
  'proprios': 'próprios',
  'pros': 'para os',
  'proxima': 'próxima',
  'proximas': 'próximas',
  'proximo': 'próximo',
  'proximos': 'próximos',
  'publica': 'pública',
  'publico': 'público',
  'qdo': 'quando',
  'qto': 'quanto',
  'quimica': 'química',
  'quimico': 'químico',
  'rapida': 'rápida',
  'rapidas': 'rápidas',
  'rapido': 'rápido',
  'rapidos': 'rápidos',
  'razao': 'razão',
  'reciclagem': 'reciclagem',
  'reclamacao': 'reclamação',
  'reclamacoes': 'reclamações',
  'refeicao': 'refeição',
  'refeicoes': 'refeições',
  'refeisao': 'refeição',
  'referencia': 'referência',
  'referencias': 'referências',
  'refugo': 'refugo',
  'reinvidicacao': 'reivindicação',
  'reinvidicar': 'reivindicar',
  'relatorio': 'relatório',
  'relatorios': 'relatórios',
  'rele': 'relé',
  'reles': 'relés',
  'relogio': 'relógio',
  'relogios': 'relógios',
  'residuo': 'resíduo',
  'residuos': 'resíduos',
  'resistencia': 'resistência',
  'resistencias': 'resistências',
  'responsaveis': 'responsáveis',
  'responsavel': 'responsável',
  'revisao': 'revisão',
  'revisoes': 'revisões',
  'ruido': 'ruído',
  'ruidos': 'ruídos',
  'sabado': 'sábado',
  'sabados': 'sábados',
  'saida': 'saída',
  'saidas': 'saídas',
  'salario': 'salário',
  'salarios': 'salários',
  'sao': 'são',
  'saude': 'saúde',
  'secao': 'seção',
  'seje': 'seja',
  'sequencia': 'sequência',
  'sera': 'será',
  'serao': 'serão',
  'seria': 'séria',
  'serio': 'sério',
  'sessao': 'sessão',
  'simbolo': 'símbolo',
  'simbolos': 'símbolos',
  'sintese': 'síntese',
  'situacao': 'situação',
  'situacoes': 'situações',
  'so': 'só',
  'solicitacao': 'solicitação',
  'solicitacoes': 'solicitações',
  'solucao': 'solução',
  'solucoes': 'soluções',
  'subestacao': 'subestação',
  'subestacoes': 'subestações',
  'subsidio': 'subsídio',
  'substancia': 'substância',
  'substancias': 'substâncias',
  'substituicao': 'substituição',
  'substituicoes': 'substituições',
  'substituida': 'substituída',
  'substituidas': 'substituídas',
  'substituido': 'substituído',
  'substituidos': 'substituídos',
  'sujeito': 'sujeito',
  'suspensao': 'suspensão',
  'suspensoes': 'suspensões',
  'sustentavel': 'sustentável',
  'ta': 'está',
  'tambem': 'também',
  'tb': 'também',
  'tbm': 'também',
  'td': 'tudo',
  'tdo': 'tudo',
  'tecnica': 'técnica',
  'tecnicas': 'técnicas',
  'tecnico': 'técnico',
  'tecnicos': 'técnicos',
  'temporaria': 'temporária',
  'temporarias': 'temporárias',
  'temporario': 'temporário',
  'temporarios': 'temporários',
  'tensao': 'tensão',
  'tensoes': 'tensões',
  'tera': 'terá',
  'terao': 'terão',
  'terca': 'terça',
  'termino': 'término',
  'terminos': 'términos',
  'titulo': 'título',
  'titulos': 'títulos',
  'to': 'estou',
  'tolerancia': 'tolerância',
  'tres': 'três',
  'troca': 'troca',
  'tubete': 'tubete',
  'tubetes': 'tubetes',
  'tubeti': 'tubete',
  'ultech': 'Wultec',
  'ultima': 'última',
  'ultimas': 'últimas',
  'ultimo': 'último',
  'ultimos': 'últimos',
  'urgencia': 'urgência',
  'urgencias': 'urgências',
  'urgentemente': 'urgentemente',
  'uteck': 'Wultec',
  'uteis': 'úteis',
  'util': 'útil',
  'valvula': 'válvula',
  'valvulas': 'válvulas',
  'varia': 'vária',
  'varias': 'várias',
  'variaveis': 'variáveis',
  'variavel': 'variável',
  'vario': 'vário',
  'varios': 'vários',
  'vc': 'você',
  'vcs': 'vocês',
  've': 'vê',
  'veem': 'veem',
  'velocidade': 'velocidade',
  'verificacao': 'verificação',
  'verificacoes': 'verificações',
  'vira': 'virá',
  'virao': 'virão',
  'visao': 'visão',
  'visivel': 'visível',
  'vistamax': 'Vistamaxx',
  'vistamx': 'Vistamaxx',
  'voce': 'você',
  'voces': 'vocês',
  'voluntario': 'voluntário',
  'voluntarios': 'voluntários',
  'voo': 'voo',
  'vêem': 'veem',
  'vôo': 'voo',
  'wutec': 'Wultec',
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

// Tabela normalizada sem acentos para busca rápida O(1)
const NORMALIZED_WORD_MAP: Map<string, string> = new Map();
for (const [key, val] of Object.entries(EXACT_WORD_REPLACEMENTS)) {
  const norm = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!NORMALIZED_WORD_MAP.has(norm)) {
    NORMALIZED_WORD_MAP.set(norm, val);
  }
}

/**
 * Calcula distância de Levenshtein simplificada (limite de 1 caractere)
 */
function isEditDistanceOne(a: string, b: string): boolean {
  const lenA = a.length;
  const lenB = b.length;
  if (Math.abs(lenA - lenB) > 1) return false;

  let diffCount = 0;
  let i = 0;
  let j = 0;

  while (i < lenA && j < lenB) {
    if (a[i] !== b[j]) {
      diffCount++;
      if (diffCount > 1) return false;

      if (lenA > lenB) {
        i++;
      } else if (lenB > lenA) {
        j++;
      } else {
        i++;
        j++;
      }
    } else {
      i++;
      j++;
    }
  }

  if (i < lenA || j < lenB) diffCount++;
  return diffCount === 1;
}

/**
 * Verifica se uma palavra termina com sufixos comuns que exigem acento e regras ortográficas da Norma Culta
 */
function correctWordByRules(rawWord: string): string | null {
  const lower = rawWord.toLowerCase();

  // 1. Dicionário exato direto
  if (EXACT_WORD_REPLACEMENTS[lower]) {
    const correct = EXACT_WORD_REPLACEMENTS[lower];
    return rawWord === correct ? null : preserveCasing(rawWord, correct);
  }

  // 2. Busca pela forma normalizada (remove acentos errados ou parciais)
  const norm = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (NORMALIZED_WORD_MAP.has(norm)) {
    const target = NORMALIZED_WORD_MAP.get(norm)!;
    if (rawWord !== target) {
      return preserveCasing(rawWord, target);
    }
    return null;
  }

  // Se a palavra for muito curta e não constou no dicionário, não alterar
  if (lower.length < 4) return null;

  // 3. Regra para sufixo -cao / -coes / -çao (ditongo nasal com til)
  if (norm.endsWith('cao') && norm.length >= 4) {
    const stem = lower.slice(0, -3);
    const corrected = stem + 'ção';
    if (lower === corrected) return null;
    return preserveCasing(rawWord, corrected);
  }
  if (norm.endsWith('coes') && norm.length >= 5) {
    const stem = lower.slice(0, -4);
    const corrected = stem + 'ções';
    if (lower === corrected) return null;
    return preserveCasing(rawWord, corrected);
  }

  // 4. Regra para sufixo -sao / -soes (ex: pressao, tensao, transmissao, divisao, revisao, extensao)
  if (norm.endsWith('sao') && norm.length >= 4) {
    const stem = lower.slice(0, -3);
    const corrected = stem + 'são';
    if (lower === corrected) return null;
    return preserveCasing(rawWord, corrected);
  }
  if (norm.endsWith('soes') && norm.length >= 5) {
    const stem = lower.slice(0, -4);
    const corrected = stem + 'sões';
    if (lower === corrected) return null;
    return preserveCasing(rawWord, corrected);
  }

  // 5. Regra para sufixo -zao / -zoes (ex: razao -> razão)
  if (norm.endsWith('zao') && norm.length >= 4) {
    const stem = lower.slice(0, -3);
    const corrected = stem + 'zão';
    if (lower === corrected) return null;
    return preserveCasing(rawWord, corrected);
  }
  if (norm.endsWith('zoes') && norm.length >= 5) {
    const stem = lower.slice(0, -4);
    const corrected = stem + 'zões';
    if (lower === corrected) return null;
    return preserveCasing(rawWord, corrected);
  }

  // 6. Regra para paroxítonas em -vel / -veis
  if (norm.endsWith('vel') && norm.length >= 5 && !/[áéíóúâêôãõ]/.test(lower)) {
    if (norm.endsWith('avel')) {
      const res = lower.replace(/avel$/, 'ável');
      return lower === res ? null : preserveCasing(rawWord, res);
    }
    if (norm.endsWith('ivel')) {
      const res = lower.replace(/ivel$/, 'ível');
      return lower === res ? null : preserveCasing(rawWord, res);
    }
    if (norm.endsWith('uvel')) {
      const res = lower.replace(/uvel$/, 'úvel');
      return lower === res ? null : preserveCasing(rawWord, res);
    }
  }
  if (norm.endsWith('veis') && norm.length >= 6 && !/[áéíóúâêôãõ]/.test(lower)) {
    if (norm.endsWith('aveis')) {
      const res = lower.replace(/aveis$/, 'áveis');
      return lower === res ? null : preserveCasing(rawWord, res);
    }
    if (norm.endsWith('iveis')) {
      const res = lower.replace(/iveis$/, 'íveis');
      return lower === res ? null : preserveCasing(rawWord, res);
    }
  }

  // 7. Regra para paroxítonas terminadas em ditongo crescente: -encia / -encias / -ancia / -ancias
  if (norm.endsWith('encia') && !/[áéíóúâêôãõ]/.test(lower)) {
    const res = lower.replace(/encia$/, 'ência');
    return lower === res ? null : preserveCasing(rawWord, res);
  }
  if (norm.endsWith('encias') && !/[áéíóúâêôãõ]/.test(lower)) {
    const res = lower.replace(/encias$/, 'ências');
    return lower === res ? null : preserveCasing(rawWord, res);
  }
  if (norm.endsWith('ancia') && !/[áéíóúâêôãõ]/.test(lower)) {
    const res = lower.replace(/ancia$/, 'ância');
    return lower === res ? null : preserveCasing(rawWord, res);
  }
  if (norm.endsWith('ancias') && !/[áéíóúâêôãõ]/.test(lower)) {
    const res = lower.replace(/ancias$/, 'âncias');
    return lower === res ? null : preserveCasing(rawWord, res);
  }

  // 8. Regra para paroxítonas terminadas em -ario / -aria / -arios / -arias
  if (norm.endsWith('ario') && norm.length >= 5 && !/[áéíóúâêôãõ]/.test(lower)) {
    const res = lower.replace(/ario$/, 'ário');
    return lower === res ? null : preserveCasing(rawWord, res);
  }
  if (norm.endsWith('arios') && norm.length >= 6 && !/[áéíóúâêôãõ]/.test(lower)) {
    const res = lower.replace(/arios$/, 'ários');
    return lower === res ? null : preserveCasing(rawWord, res);
  }

  // 9. Correção de erro de digitação por proximidade (distância de edição = 1)
  if (norm.length >= 4 && !/[0-9]/.test(norm)) {
    for (const [dictNorm, dictCorrect] of NORMALIZED_WORD_MAP.entries()) {
      if (Math.abs(dictNorm.length - norm.length) <= 1) {
        if (isEditDistanceOne(norm, dictNorm)) {
          if (rawWord.toLowerCase() === dictCorrect.toLowerCase()) return null;
          return preserveCasing(rawWord, dictCorrect);
        }
      }
    }
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
      const setPos = () => {
        try {
          element.setSelectionRange(pos, pos);
        } catch (_) {}
      };
      setPos();
      requestAnimationFrame(setPos);
      setTimeout(setPos, 0);
      setTimeout(setPos, 20);
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
