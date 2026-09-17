export interface RibbonMachineGoals {
  ghezzi: number;
  lintech: number;
  wultec: number;
  // Retrocompatibilidade
  gehl?: number;
  lintec?: number;
  ultech?: number;
  ghezze?: number;
  wutec?: number;
}

export const JUMBO_AVG_LENGTH = 8020; // 8.020 metros de comprimento médio
export const JUMBO_AVG_WIDTH = 1.28; // 1,28 metros de largura média padrão (1280mm)
export const JUMBO_AVG_M2 = JUMBO_AVG_LENGTH * JUMBO_AVG_WIDTH; // 10.265,6 m² por jumbo padrão

/**
 * Converte metros quadrados consumidos para quantidade de jumbos (unidades).
 * 1 Jumbo tem em média 8.020 m de comprimento x 1,28 m de largura = 10.265,6 m².
 */
export function calcJumboUnits(m2?: number | null, customM2PerJumbo?: number): number {
  if (!m2 || m2 <= 0) return 0;
  const divisor = customM2PerJumbo && customM2PerJumbo > 0 ? customM2PerJumbo : JUMBO_AVG_M2;
  return m2 / divisor;
}

/**
 * Formata a quantidade de jumbos de maneira elegante (ex: "1,78 jumbos" ou "1 jumbo").
 */
export function formatJumboUnits(units: number): string {
  if (units <= 0) return '0 jumbo';
  if (Math.abs(units - 1) < 0.05) {
    return '1 jumbo';
  }
  return `${units.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} jumbos`;
}

/**
 * Obtém a meta individual de produção (m²) de uma máquina para determinado mês.
 * Suporta Ghezzi, Lintech e Wultec, além de retrocompatibilidade para nomes antigos e meta global.
 */
export function getRibbonMachineGoal(
  goalsMap: Record<string, any> | undefined | null,
  monthStr: string,
  machineKey: 'ghezzi' | 'lintech' | 'wultec' | 'gehl' | 'lintec' | 'ultech' | 'ghezze' | 'wutec' | string
): number {
  if (!goalsMap) return 333333;
  const val = goalsMap[monthStr];
  if (!val) return 333333;

  if (typeof val === 'number') {
    return Math.round(val / 3);
  }

  if (typeof val === 'object' && val !== null) {
    const k = machineKey.toLowerCase();
    if (k === 'ghezzi' || k === 'gehl' || k === 'ghezze' || k === 'gezelin' || k === 'giese') {
      const g = val.ghezzi ?? val.gehl ?? val.ghezze ?? val.gezelin ?? val.giese;
      return typeof g === 'number' ? g : (Number(g) || 333333);
    }
    if (k === 'lintech' || k === 'lintec') {
      const l = val.lintech ?? val.lintec;
      return typeof l === 'number' ? l : (Number(l) || 333333);
    }
    if (k === 'wultec' || k === 'ultech' || k === 'ultec' || k === 'wutec' || k === 'utec' || k === 'otec' || k === 'oltech') {
      const w = val.wultec ?? val.ultech ?? val.ultec ?? val.wutec ?? val.utec ?? val.otec ?? val.oltech;
      return typeof w === 'number' ? w : (Number(w) || 333334);
    }
  }

  return 333333;
}

/**
 * Obtém a meta global consolidada de Corte de Fita para determinado mês.
 * Retorna a soma de Ghezzi + Lintech + Wultec.
 */
export function getRibbonTotalGoal(
  goalsMap: Record<string, any> | undefined | null,
  monthStr: string
): number {
  if (!goalsMap) return 1000000;
  const val = goalsMap[monthStr];
  if (!val) return 1000000;

  if (typeof val === 'number') return val;

  if (typeof val === 'object' && val !== null) {
    const g = Number(val.ghezzi ?? val.gehl ?? val.ghezze ?? val.gezelin ?? val.giese ?? 0);
    const l = Number(val.lintech ?? val.lintec ?? 0);
    const w = Number(val.wultec ?? val.ultech ?? val.ultec ?? val.wutec ?? val.utec ?? val.otec ?? val.oltech ?? 0);
    const sum = g + l + w;
    return sum > 0 ? sum : 1000000;
  }

  return 1000000;
}

/**
 * Calcula o intervalo de semana (Segunda a Domingo) contendo a data informada (YYYY-MM-DD).
 */
export function getWeekRange(dateStr: string): { start: string; end: string; label: string; weekNum?: number } {
  if (!dateStr || !dateStr.includes('-')) {
    const today = new Date();
    dateStr = today.toISOString().slice(0, 10);
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay(); // 0 é Domingo, 1 é Segunda ... 6 é Sábado
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const pad = (n: number) => String(n).padStart(2, '0');
  const start = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
  const end = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`;

  const formatShort = (ymd: string) => ymd.split('-').reverse().slice(0, 2).join('/');
  return {
    start,
    end,
    label: `${formatShort(start)} a ${formatShort(end)}/${sunday.getFullYear()}`
  };
}
