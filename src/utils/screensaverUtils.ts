/**
 * Utilitários para o Protetor de Tela (Projeção TV após 2 minutos de inatividade)
 */

export interface ScreensaverSettings {
  enabled: boolean;
  idleMinutes: number;
}

export const DEFAULT_SCREENSAVER_SETTINGS: ScreensaverSettings = {
  enabled: false,
  idleMinutes: 999999,
};

export const getScreensaverSettings = (): ScreensaverSettings => {
  return {
    enabled: false,
    idleMinutes: 999999,
  };
};

export const saveScreensaverSettings = (_settings: ScreensaverSettings): void => {
  // Protetor de tela desativado permanentemente conforme solicitado
};

export const isComputerDevice = (): boolean => false;
