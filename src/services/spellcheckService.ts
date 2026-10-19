// Corretor ortográfico completamente desativado e removido do sistema

export interface SpellcheckCorrection {
  original: string;
  corrected: string;
  reason?: string;
  type?: 'ortografia' | 'acentuacao' | 'gramatica' | 'pontuacao';
}

export interface SpellcheckResult {
  hasErrors: boolean;
  correctedText: string;
  corrections: SpellcheckCorrection[];
}

export function getSpellcheckSettings() {
  return {
    enabled: false,
    autoCorrectOnBlur: false,
    showHighlights: false,
    checkGrammar: false,
    checkCapitalization: false,
    soundOnCorrection: false,
    notifyOnCorrection: false,
  };
}

export function saveSpellcheckSettings() {
  return getSpellcheckSettings();
}

export function checkTextOrthography(text: string): SpellcheckResult {
  return {
    hasErrors: false,
    correctedText: text,
    corrections: []
  };
}

export async function correctTextWithAI(text: string): Promise<SpellcheckResult> {
  return {
    hasErrors: false,
    correctedText: text,
    corrections: []
  };
}
