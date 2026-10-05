/**
 * Utilitário de Haptic Feedback tátil para dispositivos móveis e coletores industriais.
 * Utiliza a Vibration API do navegador com fallbacks graciosos e padrões ergonômicos.
 */
export type HapticType = 'success' | 'warning' | 'error' | 'light' | 'medium' | 'heavy' | 'selection';

export function triggerHaptic(type: HapticType = 'light'): void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('vibrate' in navigator)) {
    return;
  }

  try {
    switch (type) {
      case 'success':
        // Vibração dupla sutil e afirmativa [35ms vibra, 40ms pausa, 45ms vibra]
        navigator.vibrate([35, 40, 45]);
        break;
      case 'warning':
        // Pulso duplo de alerta [60ms vibra, 50ms pausa, 60ms vibra]
        navigator.vibrate([60, 50, 60]);
        break;
      case 'error':
        // Padrão de erro pronunciado de 3 pulsos para rejeições ou limites ultrapassados
        navigator.vibrate([70, 40, 70, 40, 100]);
        break;
      case 'selection':
        // Micro-toque ultra-curto de 12ms para navegação de abas e botões
        navigator.vibrate(12);
        break;
      case 'medium':
        navigator.vibrate(35);
        break;
      case 'heavy':
        navigator.vibrate(65);
        break;
      case 'light':
      default:
        navigator.vibrate(20);
        break;
    }
  } catch {
    // Silencia em navegadores sem permissão de vibração ou plataformas de desktop
  }
}
