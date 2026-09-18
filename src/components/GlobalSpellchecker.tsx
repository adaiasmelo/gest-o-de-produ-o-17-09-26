import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  CheckCheck, 
  Sparkles, 
  Settings2, 
  RotateCcw, 
  Check, 
  X, 
  BookOpen, 
  Languages,
  Zap,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getSpellcheckSettings, 
  saveSpellcheckSettings, 
  SpellcheckSettings,
  correctTextOffline,
  correctTextWithAI,
  correctSingleWord,
  applyCorrectionToElement,
  isTypingElement,
  SpellcheckCorrection,
  initCustomDictionarySync
} from '../services/spellcheckService';

export const GlobalSpellchecker: React.FC = () => {
  const [settings, setSettings] = useState<SpellcheckSettings>(getSpellcheckSettings);
  const [activeElement, setActiveElement] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [currentText, setCurrentText] = useState<string>('');
  const [corrections, setCorrections] = useState<SpellcheckCorrection[]>([]);
  const [lastAutoCorrection, setLastAutoCorrection] = useState<{ original: string; corrected: string } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Inicializa sincronização do dicionário em tempo real
  useEffect(() => {
    initCustomDictionarySync();
  }, []);

  // Histórico para permitir desfazer última alteração
  const undoHistoryRef = useRef<{ element: HTMLInputElement | HTMLTextAreaElement; text: string } | null>(null);
  const lastToastTimeoutRef = useRef<any>(null);
  const lastHandledInputValRef = useRef<string>('');

  const showToast = (msg: string) => {
    if (lastToastTimeoutRef.current) clearTimeout(lastToastTimeoutRef.current);
    setFeedbackToast(msg);
    lastToastTimeoutRef.current = setTimeout(() => {
      setFeedbackToast(null);
    }, 2000);
  };

  // Sincroniza configurações globais
  useEffect(() => {
    const handleSettingsChange = (e: any) => {
      if (e.detail) {
        setSettings(e.detail);
      }
    };
    window.addEventListener('spellcheck-settings-changed', handleSettingsChange);
    return () => {
      window.removeEventListener('spellcheck-settings-changed', handleSettingsChange);
    };
  }, []);

  // Analisa o texto do campo ativo
  const analyzeFieldText = useCallback((text: string) => {
    if (!settings.enabled || !text || text.trim().length === 0) {
      setCorrections([]);
      return;
    }
    const result = correctTextOffline(text, settings);
    setCorrections(result.corrections);
  }, [settings]);

  // Manipulador global de foco (focusin)
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as Element;
      if (isTypingElement(target)) {
        // Habilita verificadores nativos com pt-BR
        target.spellcheck = true;
        target.setAttribute('lang', 'pt-BR');
        target.setAttribute('autocorrect', 'on');
        target.setAttribute('autocapitalize', 'sentences');

        setActiveElement(target);
        setCurrentText(target.value);
        analyzeFieldText(target.value);
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      // Se desfocar para fora de qualquer input
      setTimeout(() => {
        const active = document.activeElement;
        if (!isTypingElement(active)) {
          setActiveElement(null);
          setCurrentText('');
          setCorrections([]);
        }
      }, 200);
    };

    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('focusout', handleFocusOut, true);

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('focusout', handleFocusOut, true);
    };
  }, [analyzeFieldText]);

  // Manipulador de digitação em tempo real (input) com suporte a autocorreção imediata
  useEffect(() => {
    const handleInput = (e: Event) => {
      const target = e.target as Element;
      if (!isTypingElement(target)) return;

      const element = target as HTMLInputElement | HTMLTextAreaElement;
      const val = element.value;
      const cursorPos = element.selectionStart || 0;

      setCurrentText(val);
      analyzeFieldText(val);

      if (!settings.enabled || !settings.autoCorrectOnSpace) return;
      if (val === lastHandledInputValRef.current) return;

      // Suporte para espaço ou pontuações digitadas (mobile e desktop)
      if (cursorPos >= 1) {
        const lastChar = val[cursorPos - 1];
        const isDelimiter = [' ', ',', '.', ';', ':', '!', '?', '\n'].includes(lastChar);
        
        if (isDelimiter) {
          const textBeforeDelimiter = val.slice(0, cursorPos - 1);
          const match = textBeforeDelimiter.match(/([a-zA-ZáéíóúâêôãõàüçÁÉÍÓÚÂÊÔÃÕÀÜÇ0-9\-]+)$/);
          if (match) {
            const lastWord = match[1];
            const wordStartIndex = match.index || 0;

            if (!/^\d+$/.test(lastWord)) {
              const correctedWord = correctSingleWord(lastWord);
              if (correctedWord && correctedWord !== lastWord) {
                const newText = 
                  val.slice(0, wordStartIndex) + 
                  correctedWord + 
                  lastChar + 
                  val.slice(cursorPos);

                const newCursorPos = wordStartIndex + correctedWord.length + 1;
                lastHandledInputValRef.current = newText;

                undoHistoryRef.current = { element, text: val };
                const success = applyCorrectionToElement(element, newText, newCursorPos);
                if (success) {
                  setLastAutoCorrection({ original: lastWord, corrected: correctedWord });
                  showToast(`Corrigido: "${lastWord}" ➔ "${correctedWord}"`);
                }
              }
            }
          }
        }
      }
    };

    document.addEventListener('input', handleInput, true);
    return () => {
      document.removeEventListener('input', handleInput, true);
    };
  }, [analyzeFieldText, settings.enabled, settings.autoCorrectOnSpace]);

  // Auto-correção instantânea de palavras ao pressionar espaço ou pontuação (keydown para desktop)
  useEffect(() => {
    if (!settings.enabled || !settings.autoCorrectOnSpace) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as Element;
      if (!isTypingElement(target)) return;

      // Dispara ao pressionar Espaço, Enter, ou pontuações
      const triggerKeys = [' ', 'Enter', ',', '.', '!', '?', ';', ':'];
      if (!triggerKeys.includes(e.key)) return;

      const element = target as HTMLInputElement | HTMLTextAreaElement;
      const cursorPos = element.selectionStart || 0;
      const val = element.value;

      // Pega o texto antes do cursor
      const textBeforeCursor = val.slice(0, cursorPos);

      // Localiza a última palavra digitada
      const match = textBeforeCursor.match(/([a-zA-ZáéíóúâêôãõàüçÁÉÍÓÚÂÊÔÃÕÀÜÇ0-9\-]+)$/);
      if (!match) return;

      const lastWord = match[1];
      const wordStartIndex = match.index || 0;

      // Se for apenas números, não altera
      if (/^\d+$/.test(lastWord)) return;

      // Verifica se há correção da norma culta
      const correctedWord = correctSingleWord(lastWord);
      if (correctedWord && correctedWord !== lastWord) {
        const charToInsert = e.key === 'Enter' ? '\n' : e.key;
        e.preventDefault();
        
        const newText = 
          val.slice(0, wordStartIndex) + 
          correctedWord + 
          charToInsert + 
          val.slice(cursorPos);

        const newCursorPos = wordStartIndex + correctedWord.length + charToInsert.length;
        lastHandledInputValRef.current = newText;

        undoHistoryRef.current = { element, text: val };
        const success = applyCorrectionToElement(element, newText, newCursorPos);
        if (success) {
          setLastAutoCorrection({ original: lastWord, corrected: correctedWord });
          showToast(`Corrigido: "${lastWord}" ➔ "${correctedWord}"`);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [settings.enabled, settings.autoCorrectOnSpace]);

  // Correção ao sair do campo (blur)
  useEffect(() => {
    if (!settings.enabled || !settings.autoCorrectOnBlur) return;

    const handleBlur = (e: FocusEvent) => {
      const target = e.target as Element;
      if (!isTypingElement(target)) return;

      const element = target as HTMLInputElement | HTMLTextAreaElement;
      const currentVal = element.value;
      if (!currentVal || currentVal.trim().length === 0) return;

      const result = correctTextOffline(currentVal, settings);
      if (result.correctedText !== currentVal) {
        undoHistoryRef.current = { element, text: currentVal };
        lastHandledInputValRef.current = result.correctedText;
        applyCorrectionToElement(element, result.correctedText);
      }
    };

    document.addEventListener('blur', handleBlur, true);
    return () => {
      document.removeEventListener('blur', handleBlur, true);
    };
  }, [settings]);

  // Aplica correção completa no campo ativo (offline)
  const handleApplyOfflineCorrection = () => {
    if (!activeElement) return;

    const originalVal = activeElement.value;
    const result = correctTextOffline(originalVal, settings);

    if (result.correctedText !== originalVal) {
      undoHistoryRef.current = { element: activeElement, text: originalVal };
      applyCorrectionToElement(activeElement, result.correctedText);
      setCurrentText(result.correctedText);
      setCorrections([]);
      showToast('Todas as correções da norma culta foram aplicadas!');
    } else {
      showToast('O texto já está de acordo com a norma culta.');
    }
  };

  // Aplica correção profunda com IA (Gemini 3.8 Flash)
  const handleApplyAiCorrection = async () => {
    if (!activeElement || isAiLoading) return;

    const originalVal = activeElement.value;
    if (!originalVal.trim()) {
      showToast('Digite algum texto no campo antes de revisar.');
      return;
    }

    setIsAiLoading(true);
    try {
      const result = await correctTextWithAI(originalVal);
      if (result.correctedText && result.correctedText !== originalVal) {
        undoHistoryRef.current = { element: activeElement, text: originalVal };
        applyCorrectionToElement(activeElement, result.correctedText);
        setCurrentText(result.correctedText);
        setCorrections([]);
        showToast('Texto revisado e aprimorado com sucesso segundo a norma culta.');
      } else {
        showToast('Nenhum erro encontrado! Texto em perfeita norma culta.');
      }
    } catch (e) {
      console.error('Erro na correção com IA:', e);
      handleApplyOfflineCorrection();
    } finally {
      setIsAiLoading(false);
    }
  };

  // Desfaz a última correção aplicada
  const handleUndo = () => {
    if (undoHistoryRef.current) {
      const { element, text } = undoHistoryRef.current;
      applyCorrectionToElement(element, text);
      setCurrentText(text);
      undoHistoryRef.current = null;
      showToast('Correção desfeita.');
    }
  };

  const toggleSetting = (key: keyof SpellcheckSettings) => {
    const updated = saveSpellcheckSettings({ [key]: !settings[key] });
    setSettings(updated);
  };

  if (!settings.enabled && !isSettingsOpen) {
    return (
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="fixed bottom-4 left-4 z-[990] bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white p-2.5 rounded-full border border-slate-600/50 shadow-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
        title="Corretor Ortográfico da Norma Culta (Desativado) - Clique para ativar"
      >
        <Languages className="w-4 h-4 text-slate-500" />
        <span className="hidden sm:inline text-[11px]">Corretor PT-BR</span>
      </button>
    );
  }

  return (
    <>
      {/* Micro-Toast de feedback de auto-correção */}
      <AnimatePresence>
        {feedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[1050] bg-slate-900/95 text-white border border-blue-500/40 px-4 py-2 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-2 text-xs font-semibold max-w-[90vw] pointer-events-none"
          >
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0 animate-pulse" />
            <span className="truncate">{feedbackToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barra Assistente Flutuante (aparece quando um campo de texto está focado ou minimizado) */}
      <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-[990] select-none">
        <motion.div
          layout
          className="bg-slate-900/95 text-white border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden transition-all duration-200"
        >
          {/* Header da Barra */}
          <div className="px-3.5 py-2 flex items-center gap-2 text-xs">
            {/* Status Indicator & Title */}
            <div 
              className="flex items-center gap-2 py-0.5"
              title="Corretor Ortográfico Automático Norma Culta PT-BR"
            >
              <div className="relative">
                <span className="flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-black uppercase tracking-wider text-[11px] text-slate-200">
                <Languages className="w-3.5 h-3.5 text-blue-400" />
                <span>Norma Culta PT-BR</span>
              </div>
            </div>

            {/* Status de Autocorreção */}
            <div className="flex items-center gap-1.5 font-bold text-[11px] text-emerald-400">
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Autocorreção Ativa</span>
            </div>

            {/* Desfazer */}
            {undoHistoryRef.current && (
              <button
                onClick={handleUndo}
                className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-all cursor-pointer flex items-center gap-1"
                title="Desfazer última correção automática"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] text-amber-300 font-semibold hidden sm:inline">Desfazer</span>
              </button>
            )}

            {/* Revisão Avançada com IA */}
            {activeElement && currentText.trim().length > 3 && (
              <button
                onClick={handleApplyAiCorrection}
                disabled={isAiLoading}
                className="px-2 py-1 bg-purple-600/80 hover:bg-purple-600 text-purple-100 border border-purple-400/30 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                title="Revisar texto completo com Inteligência Artificial"
              >
                <Sparkles className={`w-3 h-3 text-purple-300 ${isAiLoading ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">{isAiLoading ? 'Revisando...' : 'Revisar IA'}</span>
              </button>
            )}

            {/* Configurações */}
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-1 hover:bg-slate-800 rounded-lg transition-all cursor-pointer ${
                isSettingsOpen ? 'text-blue-400 bg-slate-800' : 'text-slate-400 hover:text-white'
              }`}
              title="Preferências de autocorreção"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Modal / Popover de Configurações */}
          <AnimatePresence>
            {isSettingsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-slate-800 p-3.5 max-w-sm sm:max-w-md text-xs space-y-3 bg-slate-950/80"
              >
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <div className="flex items-center gap-2 font-black uppercase tracking-wider text-[11px] text-slate-200">
                    <Settings2 className="w-4 h-4 text-blue-400" />
                    <span>Preferências do Corretor Ortográfico</span>
                  </div>
                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center justify-between gap-2 cursor-pointer p-1.5 hover:bg-slate-800/60 rounded-xl transition-colors">
                    <div>
                      <div className="font-bold text-slate-200 text-xs">Corretor Ativo Globalmente</div>
                      <div className="text-[10px] text-slate-400">Atua em todos os campos de texto do sistema</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.enabled}
                      onChange={() => toggleSetting('enabled')}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between gap-2 cursor-pointer p-1.5 hover:bg-slate-800/60 rounded-xl transition-colors">
                    <div>
                      <div className="font-bold text-slate-200 text-xs">Auto-correção ao digitar espaço</div>
                      <div className="text-[10px] text-slate-400">Corrige instantaneamente acentos e erros frequentes</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoCorrectOnSpace}
                      onChange={() => toggleSetting('autoCorrectOnSpace')}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between gap-2 cursor-pointer p-1.5 hover:bg-slate-800/60 rounded-xl transition-colors">
                    <div>
                      <div className="font-bold text-slate-200 text-xs">Maiúscula no início de frases</div>
                      <div className="text-[10px] text-slate-400">Capitaliza início de oração e após ponto final</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoCapitalizeSentences}
                      onChange={() => toggleSetting('autoCapitalizeSentences')}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between gap-2 cursor-pointer p-1.5 hover:bg-slate-800/60 rounded-xl transition-colors">
                    <div>
                      <div className="font-bold text-slate-200 text-xs">Revisão ao sair do campo (Blur)</div>
                      <div className="text-[10px] text-slate-400">Ajusta pontuações e regras ao concluir a digitação</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoCorrectOnBlur}
                      onChange={() => toggleSetting('autoCorrectOnBlur')}
                      className="w-4 h-4 rounded text-blue-600 accent-blue-600 cursor-pointer"
                    />
                  </label>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Conforme o Novo Acordo Ortográfico</span>
                  <span className="text-emerald-400 font-bold">PT-BR Norma Culta</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
};

export default GlobalSpellchecker;
