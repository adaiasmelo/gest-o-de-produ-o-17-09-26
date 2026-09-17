import React, { useState, useEffect } from 'react';
import { 
  Languages, 
  X, 
  Sparkles, 
  Check, 
  RotateCcw, 
  Copy, 
  BookOpen, 
  Zap,
  CheckCheck,
  AlertCircle,
  Settings2,
  Plus,
  Trash2,
  Search,
  BookmarkCheck,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  correctTextOffline, 
  correctTextWithAI, 
  SpellcheckCorrection,
  getSpellcheckSettings, 
  saveSpellcheckSettings, 
  SpellcheckSettings,
  getCustomDictionary,
  addCustomWord,
  removeCustomWord,
  saveCustomDictionary,
  CustomDictionaryEntry,
  DEFAULT_CUSTOM_WORDS
} from '../services/spellcheckService';

interface SpellcheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText?: string;
  initialTab?: 'revisar' | 'dicionario';
  onApplyToField?: (text: string) => void;
}

const SAMPLE_TEXTS = [
  'A producao da maquina parou sem autorizacao concertesa e houveram falhas no relatorio.',
  'O operador solicitou ferias afim de descansar, mas o horario nao foi compativel.',
  'Houveram problemas na extrusao e a materia prima apresentou defeito de espessura.',
  'A analise tecnica do motor eletrico foi realizada ontem com excessao do painel hidraulico.'
];

export const SpellcheckModal: React.FC<SpellcheckModalProps> = ({
  isOpen,
  onClose,
  initialText = '',
  initialTab = 'revisar',
  onApplyToField
}) => {
  const [activeTab, setActiveTab] = useState<'revisar' | 'dicionario'>(initialTab);
  const [inputText, setInputText] = useState<string>(initialText);
  const [correctedText, setCorrectedText] = useState<string>('');
  const [corrections, setCorrections] = useState<SpellcheckCorrection[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [hasChecked, setHasChecked] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [settings, setSettings] = useState<SpellcheckSettings>(getSpellcheckSettings);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Estados do Dicionário Personalizado
  const [customWords, setCustomWords] = useState<CustomDictionaryEntry[]>(getCustomDictionary);
  const [newCorrectWord, setNewCorrectWord] = useState<string>('');
  const [newWrongWord, setNewWrongWord] = useState<string>('');
  const [searchDictQuery, setSearchDictQuery] = useState<string>('');
  const [dictFeedback, setDictFeedback] = useState<string | null>(null);

  // Escuta evento customizado para abertura direta na aba solicitada
  useEffect(() => {
    const handleOpenTab = (e: any) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
      }
    };
    window.addEventListener('open-spellcheck-modal', handleOpenTab);
    return () => window.removeEventListener('open-spellcheck-modal', handleOpenTab);
  }, []);

  // Atualiza palavras do dicionário ao receber alteração
  useEffect(() => {
    const handleDictChange = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setCustomWords(e.detail);
      } else {
        setCustomWords(getCustomDictionary());
      }
    };
    window.addEventListener('spellcheck-custom-dictionary-changed', handleDictChange);
    return () => window.removeEventListener('spellcheck-custom-dictionary-changed', handleDictChange);
  }, []);

  // Quando o modal abre com initialTab específico
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setCustomWords(getCustomDictionary());
    }
  }, [isOpen, initialTab]);

  // Executa correção offline instantânea
  const handleOfflineCheck = () => {
    if (!inputText.trim()) return;
    const result = correctTextOffline(inputText, settings);
    setCorrectedText(result.correctedText);
    setCorrections(result.corrections);
    setHasChecked(true);
  };

  // Executa correção profunda com IA (Gemini 3.8 Flash)
  const handleAiCheck = async () => {
    if (!inputText.trim() || isLoadingAi) return;
    setIsLoadingAi(true);
    try {
      const result = await correctTextWithAI(inputText);
      setCorrectedText(result.correctedText);
      setCorrections(result.corrections);
      setHasChecked(true);
    } catch (e) {
      console.error('Erro na verificação por IA:', e);
      handleOfflineCheck();
    } finally {
      setIsLoadingAi(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = correctedText || inputText;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSetting = (key: keyof SpellcheckSettings) => {
    const updated = saveSpellcheckSettings({ [key]: !settings[key] });
    setSettings(updated);
  };

  // Adicionar palavra ao dicionário personalizado
  const handleAddCustomWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCorrectWord.trim()) return;

    addCustomWord(newCorrectWord, newWrongWord || undefined);
    setCustomWords(getCustomDictionary());
    const addedWord = newCorrectWord.trim();
    setNewCorrectWord('');
    setNewWrongWord('');
    setDictFeedback(`A palavra "${addedWord}" foi registrada no dicionário com sucesso!`);
    setTimeout(() => setDictFeedback(null), 3500);
  };

  const handleRemoveCustomWord = (id: string) => {
    removeCustomWord(id);
    setCustomWords(getCustomDictionary());
    setDictFeedback('Termo removido do dicionário.');
    setTimeout(() => setDictFeedback(null), 2500);
  };

  const handleRestoreDefaultWords = () => {
    saveCustomDictionary([...DEFAULT_CUSTOM_WORDS]);
    setCustomWords([...DEFAULT_CUSTOM_WORDS]);
    setDictFeedback('Termos industriais de fábrica restaurados!');
    setTimeout(() => setDictFeedback(null), 3000);
  };

  const filteredWords = customWords.filter(w => {
    if (!searchDictQuery.trim()) return true;
    const q = searchDictQuery.toLowerCase().trim();
    return (
      w.correctWord.toLowerCase().includes(q) ||
      (w.wrongWord && w.wrongWord.toLowerCase().includes(q))
    );
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col w-full max-w-2xl max-h-[92vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center shrink-0">
                <Languages className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                  <span>Norma Culta & Dicionário</span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] rounded-full font-black">
                    PT-BR
                  </span>
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Correção ortográfica automática ao teclar espaço e dicionário personalizado
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  showSettings ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Configurações do Corretor"
              >
                <Settings2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Abas de Navegação */}
          <div className="bg-slate-100 border-b border-slate-200 px-5 pt-2 flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('revisar')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-t border-x ${
                activeTab === 'revisar'
                  ? 'bg-white text-blue-600 border-slate-200 -mb-[1px] shadow-sm'
                  : 'bg-transparent text-slate-500 hover:text-slate-800 border-transparent'
              }`}
            >
              <CheckCheck className="w-4 h-4" />
              <span>Revisão de Texto</span>
            </button>

            <button
              onClick={() => setActiveTab('dicionario')}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer border-t border-x ${
                activeTab === 'dicionario'
                  ? 'bg-white text-emerald-600 border-slate-200 -mb-[1px] shadow-sm'
                  : 'bg-transparent text-slate-500 hover:text-slate-800 border-transparent'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Dicionário Personalizado</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {customWords.length}
              </span>
            </button>
          </div>

          {/* Configurações Expansíveis */}
          {showSettings && (
            <div className="bg-slate-50 border-b border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs shrink-0">
              <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                <input
                  type="checkbox"
                  checked={settings.autoCorrectOnSpace}
                  onChange={() => toggleSetting('autoCorrectOnSpace')}
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-slate-700 block">Auto-corrigir ao teclar espaço</span>
                  <span className="text-[10px] text-slate-500">Substitui a palavra errada imediatamente ao dar espaço</span>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                <input
                  type="checkbox"
                  checked={settings.autoCapitalizeSentences}
                  onChange={() => toggleSetting('autoCapitalizeSentences')}
                  className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-slate-700 block">Maiúscula no início de frases</span>
                  <span className="text-[10px] text-slate-500">Capitaliza após ponto final e quebra de linha</span>
                </div>
              </label>
            </div>
          )}

          {/* Conteúdo da Aba 1: Revisão de Texto */}
          {activeTab === 'revisar' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              {/* Exemplos Rápidos para Teste */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Exemplos práticos para testar a Norma Culta:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_TEXTS.map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputText(sample);
                        setHasChecked(false);
                        setCorrectedText('');
                        setCorrections([]);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 border border-slate-200 hover:border-blue-200 rounded-lg text-xs font-medium transition-colors cursor-pointer text-left truncate max-w-[280px]"
                    >
                      Exemplo {idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold uppercase tracking-wider">
                  <span>Texto para revisão</span>
                  <span>{inputText.length} caracteres • {inputText.trim() ? inputText.trim().split(/\s+/).length : 0} palavras</span>
                </div>
                <textarea
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    setHasChecked(false);
                  }}
                  placeholder="Digite ou cole aqui o texto que deseja verificar de acordo com as normas cultas..."
                  className="w-full h-28 p-3.5 bg-slate-50 border border-slate-300 rounded-2xl text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none font-sans"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleOfflineCheck}
                  disabled={!inputText.trim()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
                >
                  <Zap className="w-4 h-4" />
                  <span>Correção Instantânea (Norma Culta)</span>
                </button>

                <button
                  onClick={handleAiCheck}
                  disabled={!inputText.trim() || isLoadingAi}
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
                >
                  <Sparkles className={`w-4 h-4 ${isLoadingAi ? 'animate-spin' : ''}`} />
                  <span>{isLoadingAi ? 'Analisando Gramática...' : 'Revisão Avançada com IA'}</span>
                </button>

                {correctedText && (
                  <button
                    onClick={handleCopy}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                  </button>
                )}
              </div>

              {/* Resultado da Correção */}
              {hasChecked && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      <CheckCheck className="w-4 h-4 text-emerald-600" />
                      <span>Texto Revisado na Norma Culta</span>
                    </h4>
                    {corrections.length > 0 ? (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black uppercase rounded-full">
                        {corrections.length} {corrections.length === 1 ? 'ajuste realizado' : 'ajustes realizados'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-full">
                        100% Correto
                      </span>
                    )}
                  </div>

                  <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl text-sm font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {correctedText || inputText}
                  </div>

                  {/* Lista Detalhada de Correções */}
                  {corrections.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Detalhamento das correções aplicadas:
                      </span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                        {corrections.map((item, idx) => (
                          <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs">
                            <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 font-mono text-xs">
                                <span className="line-through text-red-500 font-semibold">{item.original}</span>
                                <span className="text-slate-400">➔</span>
                                <span className="text-emerald-700 font-bold">{item.corrected}</span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.reason}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Conteúdo da Aba 2: Dicionário Personalizado */}
          {activeTab === 'dicionario' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              {/* Banner Explicativo */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                <BookmarkCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 space-y-1">
                  <span className="font-black uppercase tracking-wider text-emerald-900 block text-[11px]">
                    Cadastrar Palavras e Termos no Dicionário
                  </span>
                  <p className="leading-relaxed text-slate-600">
                    Cadastre palavras específicas que você deseja que o sistema considere corretas. Quando você digitar o termo de forma errada ou sem acento e pressionar a tecla <strong>ESPAÇO</strong>, o sistema substituirá automaticamente pela forma correta registrada.
                  </p>
                </div>
              </div>

              {/* Feedback de Ação */}
              {dictFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>{dictFeedback}</span>
                </motion.div>
              )}

              {/* Formulário de Adição de Palavra */}
              <form onSubmit={handleAddCustomWordSubmit} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  Adicionar Nova Palavra ao Dicionário
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
                      Forma Correta Registrada <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newCorrectWord}
                      onChange={(e) => setNewCorrectWord(e.target.value)}
                      placeholder="Ex: Vistamaxx, Extrusão, Bobinadeira..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                    />
                    <span className="text-[9px] text-slate-400 block">Como a palavra deve ficar após a correção</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
                      Como digita errado (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newWrongWord}
                      onChange={(e) => setNewWrongWord(e.target.value)}
                      placeholder="Ex: vistamax, extrucao, bobinadera..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                    />
                    <span className="text-[9px] text-slate-400 block">Deixe em branco para auto-corrigir variações sem acento</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500 italic">
                    {newWrongWord ? (
                      <>Ao digitar "<strong>{newWrongWord}</strong>" + espaço ➔ vira "<strong>{newCorrectWord || '...'}</strong>"</>
                    ) : (
                      <>Ao digitar "<strong>{newCorrectWord ? newCorrectWord.toLowerCase() : '...'}</strong>" + espaço ➔ vira "<strong>{newCorrectWord || '...'}</strong>"</>
                    )}
                  </span>

                  <button
                    type="submit"
                    disabled={!newCorrectWord.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Salvar Palavra
                  </button>
                </div>
              </form>

              {/* Barra de Pesquisa e Cabeçalho da Lista */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchDictQuery}
                      onChange={(e) => setSearchDictQuery(e.target.value)}
                      placeholder="Buscar palavra cadastrada no dicionário..."
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleRestoreDefaultWords}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                    title="Restaurar termos padrão da fábrica (Vistamaxx, Cast 1, Erema, Lintech, etc)"
                  >
                    <RefreshCw className="w-3 h-3 text-slate-500" />
                    <span className="hidden sm:inline">Restaurar Termos de Fábrica</span>
                  </button>
                </div>

                {/* Lista de Palavras */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto custom-scrollbar">
                  {filteredWords.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Nenhuma palavra encontrada para "{searchDictQuery}".
                    </div>
                  ) : (
                    filteredWords.map((item) => (
                      <div key={item.id} className="p-2.5 sm:px-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-emerald-950 font-mono bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                {item.correctWord}
                              </span>
                              {item.wrongWord ? (
                                <span className="text-[11px] text-slate-500">
                                  substitui: <code className="text-red-600 font-bold bg-red-50 px-1.5 py-0.2 rounded">{item.wrongWord}</code>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">
                                  (substitui variações sem acento e minúsculas)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveCustomWord(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Excluir palavra do dicionário"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>O corretor atua continuamente em todos os campos de digitação do sistema.</span>
            </span>

            {activeTab === 'revisar' && onApplyToField && correctedText && (
              <button
                onClick={() => {
                  onApplyToField(correctedText);
                  onClose();
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Aplicar no Campo
              </button>
            )}

            {activeTab === 'dicionario' && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Concluir
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SpellcheckModal;
