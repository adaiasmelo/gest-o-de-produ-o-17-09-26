import React, { useEffect, useRef } from 'react';
import { 
  getSpellcheckSettings, 
  SpellcheckSettings,
  correctTextOffline,
  correctSingleWord,
  applyCorrectionToElement,
  isTypingElement,
  initCustomDictionarySync
} from '../services/spellcheckService';

/**
 * GlobalSpellchecker
 * 
 * Componente invisível (background) de correção ortográfica e gramatical da Norma Culta PT-BR.
 * Funciona de forma 100% silenciosa e automática, sem botões, sem pop-ups, sem notificações.
 * Corrige automaticamente palavras, adiciona acentos e pontuação ao digitar espaço ou pontuações.
 */
export const GlobalSpellchecker: React.FC = () => {
  const settingsRef = useRef<SpellcheckSettings>(getSpellcheckSettings());
  const lastHandledInputValRef = useRef<string>('');
  const lastHandledPosRef = useRef<number>(-1);

  // Inicializa sincronização do dicionário em tempo real (Firestore / localStorage)
  useEffect(() => {
    initCustomDictionarySync();
  }, []);

  // Mantém configurações atualizadas em caso de evento interno
  useEffect(() => {
    const handleSettingsChange = (e: any) => {
      if (e.detail) {
        settingsRef.current = e.detail;
      }
    };
    window.addEventListener('spellcheck-settings-changed', handleSettingsChange);
    return () => {
      window.removeEventListener('spellcheck-settings-changed', handleSettingsChange);
    };
  }, []);

  // Habilita atributos nativos pt-BR em inputs/textareas focados
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as Element;
      if (isTypingElement(target)) {
        target.spellcheck = true;
        target.setAttribute('lang', 'pt-BR');
        target.setAttribute('autocorrect', 'on');
        target.setAttribute('autocapitalize', 'sentences');
      }
    };

    document.addEventListener('focusin', handleFocusIn, true);
    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
    };
  }, []);

  // Auto-correção instantânea no teclado físico (keydown com Espaço, Enter ou pontuação)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const settings = settingsRef.current;
      if (!settings.enabled || !settings.autoCorrectOnSpace) return;

      const target = e.target as Element;
      if (!isTypingElement(target)) return;

      // Dispara ao pressionar Espaço, Enter, ou pontuações
      const triggerKeys = [' ', 'Enter', ',', '.', '!', '?', ';', ':'];
      if (!triggerKeys.includes(e.key)) return;

      const element = target as HTMLInputElement | HTMLTextAreaElement;
      const cursorPos = element.selectionStart || 0;
      const val = element.value;

      // Texto antes da posição do cursor
      const textBeforeCursor = val.slice(0, cursorPos);

      // Localiza a última palavra digitada
      const match = textBeforeCursor.match(/([a-zA-ZáéíóúâêôãõàüçÁÉÍÓÚÂÊÔÃÕÀÜÇ0-9\-]+)$/);
      if (!match) return;

      const lastWord = match[1];
      const wordStartIndex = match.index || 0;

      // Se for puramente numérico, não altera
      if (/^\d+$/.test(lastWord)) return;

      // Consulta regra da norma culta
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
        lastHandledPosRef.current = newCursorPos;

        applyCorrectionToElement(element, newText, newCursorPos);
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  // Auto-correção em digitação móvel/touch/IME (evento input)
  useEffect(() => {
    const handleInput = (e: Event) => {
      const settings = settingsRef.current;
      if (!settings.enabled || !settings.autoCorrectOnSpace) return;

      const target = e.target as Element;
      if (!isTypingElement(target)) return;

      const element = target as HTMLInputElement | HTMLTextAreaElement;
      const val = element.value;
      const cursorPos = element.selectionStart || 0;

      if (val === lastHandledInputValRef.current && cursorPos === lastHandledPosRef.current) return;

      // Ao digitar espaço ou pontuação
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
                lastHandledPosRef.current = newCursorPos;

                applyCorrectionToElement(element, newText, newCursorPos);
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
  }, []);

  // Revisão suave ao sair do campo (blur)
  useEffect(() => {
    const handleBlur = (e: FocusEvent) => {
      const settings = settingsRef.current;
      if (!settings.enabled || !settings.autoCorrectOnBlur) return;

      const target = e.target as Element;
      if (!isTypingElement(target)) return;

      const element = target as HTMLInputElement | HTMLTextAreaElement;
      const currentVal = element.value;
      if (!currentVal || currentVal.trim().length === 0) return;

      const result = correctTextOffline(currentVal, settings);
      if (result.correctedText !== currentVal) {
        lastHandledInputValRef.current = result.correctedText;
        applyCorrectionToElement(element, result.correctedText);
      }
    };

    document.addEventListener('blur', handleBlur, true);
    return () => {
      document.removeEventListener('blur', handleBlur, true);
    };
  }, []);

  // Componente 100% invisível em background
  return null;
};

export default GlobalSpellchecker;
