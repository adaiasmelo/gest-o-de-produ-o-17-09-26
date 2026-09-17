/**
 * Utilitários para o Protetor de Tela (Projeção TV após 2 minutos de inatividade)
 */

export interface ScreensaverSettings {
  enabled: boolean;
  idleMinutes: number;
}

const STORAGE_KEY = 'manupackaging_screensaver_settings';

export const DEFAULT_SCREENSAVER_SETTINGS: ScreensaverSettings = {
  enabled: true,
  idleMinutes: 2, // 2 minutos padrão conforme solicitado
};

export const getScreensaverSettings = (): ScreensaverSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SCREENSAVER_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      enabled: parsed.enabled !== undefined ? !!parsed.enabled : DEFAULT_SCREENSAVER_SETTINGS.enabled,
      idleMinutes: Number(parsed.idleMinutes) > 0 ? Number(parsed.idleMinutes) : DEFAULT_SCREENSAVER_SETTINGS.idleMinutes,
    };
  } catch {
    return DEFAULT_SCREENSAVER_SETTINGS;
  }
};

export const saveScreensaverSettings = (settings: ScreensaverSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Erro ao salvar configurações do protetor de tela no localStorage:', err);
  }
};

/**
 * Detecta se o dispositivo é um computador (desktop/laptop)
 * através da largura da janela (>= 768px) ou ponteiro de precisão (mouse/trackpad)
 */
export const isComputerDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const isWide = window.innerWidth >= 768;
  const hasFinePointer = window.matchMedia ? window.matchMedia('(pointer: fine)').matches : false;
  return isWide || hasFinePointer;
};
