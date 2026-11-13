// Matriz Técnica e Engenharia de Metas Diárias de Produtividade (m²)
// Baseado nos estudos técnicos consolidados das cortadoras Ghezzi, Lintech e Wutec
// Turnos úteis de trabalho e capacidades nominais com setups de 40 min

export const DEFAULT_EREMA_STANDARD_GOAL = 2600; // Meta padrão por turno de 12 horas (2.600 kg = 2.6 t)

export const EREMA_STANDARD_GOAL_STORAGE_KEY = 'manupackaging_erema_standard_goal';
export const RIBBON_STANDARD_GOALS_STORAGE_KEY = 'manupackaging_ribbon_custom_matrix_v1';

export function getEremaStandardGoal(): number {
  if (typeof window === 'undefined') return DEFAULT_EREMA_STANDARD_GOAL;
  try {
    const val = localStorage.getItem(EREMA_STANDARD_GOAL_STORAGE_KEY);
    if (val && !isNaN(Number(val)) && Number(val) > 0) {
      return Number(val);
    }
  } catch {}
  return DEFAULT_EREMA_STANDARD_GOAL;
}

export function saveEremaStandardGoal(val: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(EREMA_STANDARD_GOAL_STORAGE_KEY, String(val));
  } catch {}
}

export interface TechnicalRibbonPreset {
  id: string;
  machine: 'Ghezzi' | 'Lintech' | 'Wultec';
  jumboCategory: '8000m' | '6000m' | 'all';
  materials: string[]; // ['AA38', 'Hotmelt', 'AR9'] ou ['AS50']
  widthMm?: number;
  lengthM?: number;
  formatLabel: string;
  dailyTargetM2: number;
  jumbosConsumed: number | string;
  setupsDescription: string;
  boxesDescription?: string;
  palletsDescription?: string;
  notes?: string;
}

// 1. Matriz Cortadora Rebobinadora GHEZZI (33 rolos/ciclo, 48mm, 40 min setup)
export const GHEZZI_TECHNICAL_PRESETS: TechnicalRibbonPreset[] = [
  // A. Materiais 8.000m (AA38, Hotmelt, AR9 / AR45)
  {
    id: 'ghz-8k-40m',
    machine: 'Ghezzi',
    jumboCategory: '8000m',
    materials: ['AA38', 'AA 38', 'HOTMELT', 'HOTMAILT', 'AR9', 'AR45'],
    widthMm: 48,
    lengthM: 40,
    formatLabel: '48 mm × 40 m (8.000m)',
    dailyTargetM2: 31623,
    jumbosConsumed: 3,
    setupsDescription: '2 Setups (80 min)',
    boxesDescription: '228 cx (72/cx)',
    palletsDescription: '4 Pallets + 4 cx',
    notes: 'Jumbo 8.000m: AA38, Hotmelt e AR9'
  },
  {
    id: 'ghz-8k-45m',
    machine: 'Ghezzi',
    jumboCategory: '8000m',
    materials: ['AA38', 'AA 38', 'HOTMELT', 'HOTMAILT', 'AR9', 'AR45'],
    widthMm: 48,
    lengthM: 45,
    formatLabel: '48 mm × 45 m (8.000m)',
    dailyTargetM2: 33572,
    jumbosConsumed: 3,
    setupsDescription: '2 Setups (80 min)',
    boxesDescription: '215 cx (72/cx)',
    palletsDescription: '3 Pallets + 47 cx',
    notes: 'Jumbo 8.000m: AA38, Hotmelt e AR9'
  },
  {
    id: 'ghz-8k-50m',
    machine: 'Ghezzi',
    jumboCategory: '8000m',
    materials: ['AA38', 'AA 38', 'HOTMELT', 'HOTMAILT', 'AR9', 'AR45'],
    widthMm: 48,
    lengthM: 50,
    formatLabel: '48 mm × 50 m (8.000m)',
    dailyTargetM2: 38838,
    jumbosConsumed: 4,
    setupsDescription: '3 Setups (120 min)',
    boxesDescription: '224 cx (72/cx)',
    palletsDescription: '4 Pallets',
    notes: 'Jumbo 8.000m: AA38, Hotmelt e AR9'
  },
  {
    id: 'ghz-8k-80m',
    machine: 'Ghezzi',
    jumboCategory: '8000m',
    materials: ['AA38', 'AA 38', 'HOTMELT', 'HOTMAILT', 'AR9', 'AR45'],
    widthMm: 48,
    lengthM: 80,
    formatLabel: '48 mm × 80 m (8.000m)',
    dailyTargetM2: 51142,
    jumbosConsumed: 5,
    setupsDescription: '4 Setups (160 min)',
    boxesDescription: '184 cx (72/cx)',
    palletsDescription: '3 Pallets + 16 cx',
    notes: 'Jumbo 8.000m: AA38, Hotmelt e AR9'
  },
  {
    id: 'ghz-8k-90m',
    machine: 'Ghezzi',
    jumboCategory: '8000m',
    materials: ['AA38', 'AA 38', 'HOTMELT', 'HOTMAILT', 'AR9', 'AR45'],
    widthMm: 48,
    lengthM: 90,
    formatLabel: '48 mm × 90 m (8.000m)',
    dailyTargetM2: 67040,
    jumbosConsumed: 6,
    setupsDescription: '4 Setups (160 min)',
    boxesDescription: '215 cx (72/cx)',
    palletsDescription: '3 Pallets + 47 cx',
    notes: 'Jumbo 8.000m: AA38, Hotmelt e AR9'
  },
  {
    id: 'ghz-8k-100m',
    machine: 'Ghezzi',
    jumboCategory: '8000m',
    materials: ['AA38', 'AA 38', 'HOTMELT', 'HOTMAILT', 'AR9', 'AR45'],
    widthMm: 48,
    lengthM: 100,
    formatLabel: '48 mm × 100 m (8.000m)',
    dailyTargetM2: 71386,
    jumbosConsumed: 6,
    setupsDescription: '4 Setups (160 min)',
    boxesDescription: '206 cx (72/cx)',
    palletsDescription: '3 Pallets + 38 cx',
    notes: 'Jumbo 8.000m: Alta produtividade'
  },
  {
    id: 'ghz-8k-1200m',
    machine: 'Ghezzi',
    jumboCategory: '8000m',
    materials: ['AA38', 'AA 38', 'HOTMELT', 'HOTMAILT', 'AR9', 'AR45'],
    widthMm: 48,
    lengthM: 1200,
    formatLabel: '48 mm × 1200 m Ind. (8.000m)',
    dailyTargetM2: 40870,
    jumbosConsumed: 4,
    setupsDescription: '3 Setups (120 min)',
    boxesDescription: '118 cx (6/cx)',
    palletsDescription: '1 Pallet + 46 cx',
    notes: 'Industrial 1.200m'
  },

  // B. Material AS50 (50 micras, Jumbo exclusivo de 6.000m)
  {
    id: 'ghz-6k-40m',
    machine: 'Ghezzi',
    jumboCategory: '6000m',
    materials: ['AS50', 'AS 50'],
    widthMm: 48,
    lengthM: 40,
    formatLabel: '48 mm × 40 m (AS50 - 6.000m)',
    dailyTargetM2: 28597,
    jumbosConsumed: 3,
    setupsDescription: '3 Setups (120 min)',
    boxesDescription: '206 cx (72/cx)',
    palletsDescription: '3 Pallets + 38 cx',
    notes: 'AS50 (50 micras) Jumbo 6.000m'
  },
  {
    id: 'ghz-6k-45m',
    machine: 'Ghezzi',
    jumboCategory: '6000m',
    materials: ['AS50', 'AS 50'],
    widthMm: 48,
    lengthM: 45,
    formatLabel: '48 mm × 45 m (AS50 - 6.000m)',
    dailyTargetM2: 30359,
    jumbosConsumed: 4,
    setupsDescription: '3 Setups (120 min)',
    boxesDescription: '195 cx (72/cx)',
    palletsDescription: '3 Pallets + 27 cx',
    notes: 'AS50 (50 micras) Jumbo 6.000m'
  },
  {
    id: 'ghz-6k-50m',
    machine: 'Ghezzi',
    jumboCategory: '6000m',
    materials: ['AS50', 'AS 50'],
    widthMm: 48,
    lengthM: 50,
    formatLabel: '48 mm × 50 m (AS50 - 6.000m)',
    dailyTargetM2: 38838,
    jumbosConsumed: 4,
    setupsDescription: '3 Setups (120 min)',
    boxesDescription: '224 cx (72/cx)',
    palletsDescription: '4 Pallets',
    notes: 'AS50 (50 micras) Jumbo 6.000m'
  },
  {
    id: 'ghz-6k-80m',
    machine: 'Ghezzi',
    jumboCategory: '6000m',
    materials: ['AS50', 'AS 50'],
    widthMm: 48,
    lengthM: 80,
    formatLabel: '48 mm × 80 m (AS50 - 6.000m)',
    dailyTargetM2: 51142,
    jumbosConsumed: 6,
    setupsDescription: '4 Setups (160 min)',
    boxesDescription: '184 cx (72/cx)',
    palletsDescription: '3 Pallets + 16 cx',
    notes: 'AS50 (50 micras) Jumbo 6.000m'
  },
  {
    id: 'ghz-6k-90m',
    machine: 'Ghezzi',
    jumboCategory: '6000m',
    materials: ['AS50', 'AS 50'],
    widthMm: 48,
    lengthM: 90,
    formatLabel: '48 mm × 90 m (AS50 - 6.000m)',
    dailyTargetM2: 59107,
    jumbosConsumed: 7,
    setupsDescription: '5 Setups (200 min)',
    boxesDescription: '190 cx (72/cx)',
    palletsDescription: '3 Pallets + 22 cx',
    notes: 'AS50 (50 micras) Jumbo 6.000m'
  },
  {
    id: 'ghz-6k-100m',
    machine: 'Ghezzi',
    jumboCategory: '6000m',
    materials: ['AS50', 'AS 50'],
    widthMm: 48,
    lengthM: 100,
    formatLabel: '48 mm × 100 m (AS50 - 6.000m)',
    dailyTargetM2: 62938,
    jumbosConsumed: 7,
    setupsDescription: '5 Setups (200 min)',
    boxesDescription: '182 cx (72/cx)',
    palletsDescription: '3 Pallets + 14 cx',
    notes: 'AS50 (50 micras) Jumbo 6.000m'
  },
  {
    id: 'ghz-6k-1200m',
    machine: 'Ghezzi',
    jumboCategory: '6000m',
    materials: ['AS50', 'AS 50'],
    widthMm: 48,
    lengthM: 1200,
    formatLabel: '48 mm × 1200 m Ind. (AS50 - 6.000m)',
    dailyTargetM2: 40870,
    jumbosConsumed: 5,
    setupsDescription: '3 Setups (120 min)',
    boxesDescription: '118 cx (6/cx)',
    palletsDescription: '1 Pallet + 46 cx',
    notes: 'AS50 Industrial 1.200m'
  }
];

// 2. Matriz Cortadora LINTECH (2 eixos, Jumbo 1600mm x 8.000m BOPP 38 mic, 40 min setup)
export const LINTECH_TECHNICAL_PRESETS: TechnicalRibbonPreset[] = [
  // Largura 24mm (67 rolos/ciclo | 3x arruelas)
  {
    id: 'lin-24-100m',
    machine: 'Lintech',
    jumboCategory: '8000m',
    materials: ['AA38', 'AA 38', 'HOTMELT', 'HOTMAILT', 'AR9', 'AR45', 'BOPP 38'],
    widthMm: 24,
    lengthM: 100,
    formatLabel: '24 mm × 100 m (67 rolos/ciclo)',
    dailyTargetM2: 25728,
    jumbosConsumed: 2,
    setupsDescription: '1 Setup (40 min)',
    notes: 'Alta carga manual (3x arruelas)'
  },
  {
    id: 'lin-24-90m',
    machine: 'Lintech',
    jumboCategory: '8000m',
    materials: ['AA38', 'AA 38', 'HOTMELT', 'HOTMAILT', 'AR9', 'AR45', 'BOPP 38'],
    widthMm: 24,
    lengthM: 90,
    formatLabel: '24 mm × 90 m (67 rolos/ciclo)',
    dailyTargetM2: 25408,
    jumbosConsumed: 2,
    setupsDescription: '1 Setup (40 min)',
    notes: 'Alta carga manual (3x arruelas)'
  },
  {
    id: 'lin-24-40m',
    machine: 'Lintech',
    jumboCategory: '8000m',
    materials: ['AA38', 'AA 38', 'HOTMELT', 'HOTMAILT', 'AR9', 'AR45', 'BOPP 38'],
    widthMm: 24,
    lengthM: 40,
    formatLabel: '24 mm × 40 m (67 rolos/ciclo)',
    dailyTargetM2: 12864,
    jumbosConsumed: 1,
    setupsDescription: '0 Setups (1 jumbo)',
    notes: 'Alta carga manual (3x arruelas)'
  },

  // Largura 36mm (43 rolos/ciclo | 2x arruelas)
  {
    id: 'lin-36-100m',
    machine: 'Lintech',
    jumboCategory: '8000m',
    materials: ['AA38', 'AA 38', 'HOTMELT', 'HOTMAILT', 'AR9', 'AR45', 'BOPP 38'],
    widthMm: 36,
    lengthM: 100,
    formatLabel: '36 mm × 100 m (43 rolos/ciclo)',
    dailyTargetM2: 29671,
    jumbosConsumed: 3,
    setupsDescription: '2 Setups (80 min)',
    notes: 'Média carga manual (2x arruelas)'
  },
  {
    id: 'lin-36-90m',
    machine: 'Lintech',
    jumboCategory: '8000m',
    materials: ['AA38', 'AA 38', 'HOTMELT', 'HOTMAILT', 'AR9', 'AR45', 'BOPP 38'],
    widthMm: 36,
    lengthM: 90,
    formatLabel: '36 mm × 90 m (43 rolos/ciclo)',
    dailyTargetM2: 27440,
    jumbosConsumed: 3,
    setupsDescription: '2 Setups (80 min)',
    notes: 'Média carga manual (2x arruelas)'
  },
  {
    id: 'lin-36-40m',
    machine: 'Lintech',
    jumboCategory: '8000m',
    materials: ['AA38', 'AA 38', 'HOTMELT', 'HOTMAILT', 'AR9', 'AR45', 'BOPP 38'],
    widthMm: 36,
    lengthM: 40,
    formatLabel: '36 mm × 40 m (43 rolos/ciclo)',
    dailyTargetM2: 15401,
    jumbosConsumed: 2,
    setupsDescription: '1 Setup (40 min)',
    notes: 'Média carga manual (2x arruelas)'
  },

  // Largura 45mm (35 rolos/ciclo)
  {
    id: 'lin-45-100m',
    machine: 'Lintech',
    jumboCategory: '8000m',
    materials: ['AA38', 'AA 38', 'HOTMELT', 'HOTMAILT', 'AR9', 'AR45', 'BOPP 38'],
    widthMm: 45,
    lengthM: 100,
    formatLabel: '45 mm × 100 m (35 rolos/ciclo)',
    dailyTargetM2: 37800,
    jumbosConsumed: 3,
    setupsDescription: '2 Setups (80 min)',
    notes: 'Carga padrão (35 rolos)'
  },
  {
    id: 'lin-45-90m',
    machine: 'Lintech',
    jumboCategory: '8000m',
    materials: ['AA38', 'AA 38', 'HOTMELT', 'HOTMAILT', 'AR9', 'AR45', 'BOPP 38'],
    widthMm: 45,
    lengthM: 90,
    formatLabel: '45 mm × 90 m (35 rolos/ciclo)',
    dailyTargetM2: 35883,
    jumbosConsumed: 3,
    setupsDescription: '2 Setups (80 min)',
    notes: 'Carga padrão (35 rolos)'
  },
  {
    id: 'lin-45-40m',
    machine: 'Lintech',
    jumboCategory: '8000m',
    materials: ['AA38', 'AA 38', 'HOTMELT', 'HOTMAILT', 'AR9', 'AR45', 'BOPP 38'],
    widthMm: 45,
    lengthM: 40,
    formatLabel: '45 mm × 40 m (35 rolos/ciclo)',
    dailyTargetM2: 12600,
    jumbosConsumed: 1,
    setupsDescription: '0 Setups (1 jumbo)',
    notes: 'Carga padrão (35 rolos)'
  },

  // Largura 72mm (21 rolos/ciclo | 1x arruelas)
  {
    id: 'lin-72-100m',
    machine: 'Lintech',
    jumboCategory: '8000m',
    materials: ['AA38', 'AA 38', 'HOTMELT', 'HOTMAILT', 'AR9', 'AR45', 'BOPP 38'],
    widthMm: 72,
    lengthM: 100,
    formatLabel: '72 mm × 100 m (21 rolos/ciclo)',
    dailyTargetM2: 36288,
    jumbosConsumed: 3,
    setupsDescription: '2 Setups (80 min)',
    notes: 'Carga padrão (1x arruelas)'
  },
  {
    id: 'lin-72-90m',
    machine: 'Lintech',
    jumboCategory: '8000m',
    materials: ['AA38', 'AA 38', 'HOTMELT', 'HOTMAILT', 'AR9', 'AR45', 'BOPP 38'],
    widthMm: 72,
    lengthM: 90,
    formatLabel: '72 mm × 90 m (21 rolos/ciclo)',
    dailyTargetM2: 34448,
    jumbosConsumed: 3,
    setupsDescription: '2 Setups (80 min)',
    notes: 'Carga padrão (1x arruelas)'
  },
  {
    id: 'lin-72-40m',
    machine: 'Lintech',
    jumboCategory: '8000m',
    materials: ['AA38', 'AA 38', 'HOTMELT', 'HOTMAILT', 'AR9', 'AR45', 'BOPP 38'],
    widthMm: 72,
    lengthM: 40,
    formatLabel: '72 mm × 40 m (21 rolos/ciclo)',
    dailyTargetM2: 20255,
    jumbosConsumed: 2,
    setupsDescription: '1 Setup (40 min)',
    notes: 'Carga padrão (1x arruelas)'
  }
];

// 3. Matriz Rebobinadora WUTEC (2 eixos: 5+4 jumbinhos de 144mm x 1200m = 172,8 m² por jumbinho)
export const WUTEC_TECHNICAL_PRESETS: TechnicalRibbonPreset[] = [
  {
    id: 'wut-8k-1200m',
    machine: 'Wultec',
    jumboCategory: '8000m',
    materials: ['AA38', 'AA 38', 'HOTMELT', 'HOTMAILT', 'AR9', 'AR45'],
    widthMm: 144,
    lengthM: 1200,
    formatLabel: '144 mm × 1.200 m (AA38, Hotmelt, AR9 - 8.000m)',
    dailyTargetM2: 40090, // 35.424 m² 1ª linha (205 un) + 4.666 m² emendas (27 un) = 232 jumbinhos
    jumbosConsumed: '3,58 Jumbos',
    setupsDescription: '3 Setups (20 min cada)',
    boxesDescription: '232 jumbinhos (205 perf. + 27 emenda)',
    palletsDescription: '1 Pallet + 88 jumbinhos (1,61 pl)',
    notes: 'Capacidade consolidada do turno: 40.090 m²'
  },
  {
    id: 'wut-6k-1200m',
    machine: 'Wultec',
    jumboCategory: '6000m',
    materials: ['AS50', 'AS 50'],
    widthMm: 144,
    lengthM: 1200,
    formatLabel: '144 mm × 1.200 m (AS50 50µ - 6.000m)',
    dailyTargetM2: 36806, // 100% 1ª linha (213 un), 0% emenda
    jumbosConsumed: '4,74 Jumbos',
    setupsDescription: '4 Setups (20 min cada)',
    boxesDescription: '213 jumbinhos (100% 1ª linha)',
    palletsDescription: '1 Pallet + 69 jumbinhos (1,48 pl)',
    notes: '6.000m é múltiplo exato de 1.200m (sem emendas)'
  }
];

export const ALL_TECHNICAL_PRESETS: TechnicalRibbonPreset[] = [
  ...GHEZZI_TECHNICAL_PRESETS,
  ...LINTECH_TECHNICAL_PRESETS,
  ...WUTEC_TECHNICAL_PRESETS
];

/**
 * Normaliza o nome da máquina para as chaves canônicas da fita
 */
export function normalizeRibbonMachineKey(machineName: string | undefined): 'Ghezzi' | 'Lintech' | 'Wultec' | null {
  if (!machineName) return null;
  const m = machineName.toLowerCase().trim();
  if (m.includes('ghez')) return 'Ghezzi';
  if (m.includes('lin')) return 'Lintech';
  if (m.includes('wut') || m.includes('wult') || m.includes('rebobinad')) return 'Wultec';
  return null;
}

/**
 * Localiza a meta padrão técnica em m² baseada no modelo da máquina, material e dimensões
 */
export function findTechnicalRibbonPreset(params: {
  machine?: string;
  jumboType?: string;
  widthMm?: number;
  lengthM?: number;
}): TechnicalRibbonPreset | null {
  const normMachine = normalizeRibbonMachineKey(params.machine);
  if (!normMachine) return null;

  const rawMat = (params.jumboType || '').toUpperCase().replace(/\s+/g, '');
  const isAS50 = rawMat.includes('AS50') || rawMat.includes('50');

  const width = Number(params.widthMm) || 0;
  const length = Number(params.lengthM) || 0;

  if (normMachine === 'Wultec') {
    if (isAS50) {
      return WUTEC_TECHNICAL_PRESETS.find(p => p.id === 'wut-6k-1200m') || null;
    }
    return WUTEC_TECHNICAL_PRESETS.find(p => p.id === 'wut-8k-1200m') || null;
  }

  if (normMachine === 'Ghezzi') {
    const list = GHEZZI_TECHNICAL_PRESETS.filter(p => isAS50 ? p.jumboCategory === '6000m' : p.jumboCategory === '8000m');
    if (length > 0) {
      // Procura formato exato ou mais próximo
      const match = list.find(p => p.lengthM === length);
      if (match) return match;
    }
    // Fallback padrão mais comum (100m ou 50m)
    return list.find(p => p.lengthM === 100) || list[0] || null;
  }

  if (normMachine === 'Lintech') {
    let sub = LINTECH_TECHNICAL_PRESETS;
    if (width > 0) {
      const matchWidth = sub.filter(p => p.widthMm === width);
      if (matchWidth.length > 0) sub = matchWidth;
    }
    if (length > 0) {
      const matchLen = sub.find(p => p.lengthM === length);
      if (matchLen) return matchLen;
    }
    // Fallback para largura selecionada ou primeiro padrão
    return sub[0] || null;
  }

  return null;
}

/**
 * Calcula a diferença em horas entre dois horários "HH:mm"
 */
export function calcHoursBetween(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
  let totalMin = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (totalMin < 0) totalMin += 24 * 60; // virada de turno
  return Math.max(0, Number((totalMin / 60).toFixed(2)));
}

export interface ProportionalItemCalculated {
  id: string;
  orderNumber?: string;
  jumboType: string;
  rollWidth?: number;
  rollLength?: number;
  formatLabel: string;
  startTime?: string;
  endTime?: string;
  durationHours: number;
  sharePercent: number; // ex: 25.0%
  producedM2: number;
  nominalTargetDailyM2: number; // Meta nominal de turno cheio (8,8h)
  proportionalTargetM2: number; // Meta líquida ajustada após rateio e abatimento de paradas
  attainmentPercent: number;
  hasMetGoal: boolean;
}

export interface ProportionalCalculationResult {
  isProportional: boolean;
  itemCount: number;
  nominalBaseTargetM2: number; // Meta nominal sem abatimento de paradas
  deductedStoppageTargetM2: number; // m² abatidos da meta devido às paradas registradas
  totalCompositeTargetM2: number; // Meta líquida justa final após abater paradas
  totalProducedM2: number;
  overallAttainmentPercent: number;
  totalHours: number;
  grossShiftHours: number; // Turno padrão (ex: 8.8h)
  stoppedMinutes: number; // Minutos parados apontados (almoço, intervalo, reunião, manutenção, etc.)
  stoppedHours: number; // Horas paradas
  netWorkingHours: number; // Horas produtivas líquidas disponíveis
  availabilityFactor: number; // Fator de disponibilidade OEE (netWorkingHours / grossShiftHours)
  hasMetOverallGoal: boolean;
  items: ProportionalItemCalculated[];
}

/**
 * Calcula os minutos totais de um conjunto de paradas
 */
export function calcStopsTotalMinutes(stops?: Array<{ de?: string; ate?: string; durationMinutes?: number; isAvulso?: boolean }>): number {
  if (!stops || !Array.isArray(stops)) return 0;
  return stops.reduce((sum, item) => {
    const manual = Number(item.durationMinutes);
    if (item.isAvulso || (!item.de && !item.ate)) {
      return sum + (isNaN(manual) ? 0 : manual);
    }
    if (item.de && item.ate) {
      const [h1, m1] = item.de.split(':').map(Number);
      const [h2, m2] = item.ate.split(':').map(Number);
      if (!isNaN(h1) && !isNaN(m1) && !isNaN(h2) && !isNaN(m2)) {
        let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diff < 0) diff += 24 * 60;
        return sum + (diff > 0 ? diff : (isNaN(manual) ? 0 : manual));
      }
    }
    return sum + (isNaN(manual) ? 0 : manual);
  }, 0);
}

/**
 * Calcula a meta composta proporcional do dia para cortes com múltiplos formatos/OPs/materiais
 * com abatimento proporcional de paradas de máquina (almoço, intervalos, reuniões, manutenção, processo, etc.).
 */
export function calculateProportionalRibbonGoals(params: {
  machine?: string;
  items: Array<{
    id?: string;
    orderNumber?: string;
    jumboType?: string;
    rollWidth?: number;
    rollLength?: number;
    producedM2?: number;
    startTime?: string;
    endTime?: string;
    durationHours?: number;
  }>;
  stoppedMinutes?: number;
  fallbackTargetM2?: number;
  defaultShiftHours?: number;
}): ProportionalCalculationResult {
  const machine = params.machine || '';
  const rawItems = params.items || [];
  const grossShiftHours = params.defaultShiftHours ?? 8.8;
  const fallback = params.fallbackTargetM2 || 50000;

  // 1. Calcula o impacto das paradas no tempo disponível do turno
  const stoppedMinutes = Math.max(0, Number(params.stoppedMinutes) || 0);
  const stoppedHours = Number((stoppedMinutes / 60).toFixed(2));
  const netWorkingHours = Math.max(0, Number((grossShiftHours - stoppedHours).toFixed(2)));
  
  // Fator de disponibilidade da máquina (entre 0 e 1)
  const availabilityFactor = grossShiftHours > 0 
    ? Math.min(1, Math.max(0, netWorkingHours / grossShiftHours)) 
    : 1;

  if (rawItems.length === 0) {
    const adjustedTarget = Math.round(fallback * availabilityFactor);
    const deducted = Math.max(0, fallback - adjustedTarget);
    return {
      isProportional: false,
      itemCount: 0,
      nominalBaseTargetM2: fallback,
      deductedStoppageTargetM2: deducted,
      totalCompositeTargetM2: adjustedTarget,
      totalProducedM2: 0,
      overallAttainmentPercent: 0,
      totalHours: netWorkingHours,
      grossShiftHours,
      stoppedMinutes,
      stoppedHours,
      netWorkingHours,
      availabilityFactor: Number(availabilityFactor.toFixed(3)),
      hasMetOverallGoal: false,
      items: []
    };
  }

  // 2. Mapeia dados nominais e durações de cada OP/item
  const mapped = rawItems.map((it, idx) => {
    const id = it.id || `item_${idx}`;
    const preset = findTechnicalRibbonPreset({
      machine,
      jumboType: it.jumboType,
      widthMm: it.rollWidth,
      lengthM: it.rollLength
    });

    const nominalTarget = preset?.dailyTargetM2 ?? fallback;
    const formatLabel = preset?.formatLabel || `${it.rollWidth || 48}mm × ${it.rollLength || 100}m (${it.jumboType || 'Fita'})`;

    let hours = Number(it.durationHours) || 0;
    if (hours <= 0 && it.startTime && it.endTime) {
      hours = calcHoursBetween(it.startTime, it.endTime);
    }

    const prod = Number(it.producedM2) || 0;

    return {
      id,
      orderNumber: it.orderNumber,
      jumboType: it.jumboType || 'AR9',
      rollWidth: it.rollWidth,
      rollLength: it.rollLength,
      formatLabel,
      startTime: it.startTime,
      endTime: it.endTime,
      specifiedHours: hours,
      producedM2: prod,
      nominalTargetDailyM2: nominalTarget
    };
  });

  const totalProd = mapped.reduce((acc, it) => acc + it.producedM2, 0);

  // 3. Se houver apenas 1 item/OP
  if (mapped.length === 1) {
    const single = mapped[0];
    const nominal = single.nominalTargetDailyM2;
    // Abate o tempo de paradas na meta (ex: almoço, reunião, intervalo)
    const adjustedTarget = Math.round(nominal * availabilityFactor);
    const deducted = Math.max(0, nominal - adjustedTarget);
    const pct = adjustedTarget > 0 ? (single.producedM2 / adjustedTarget) * 100 : 0;
    
    const itemCalc: ProportionalItemCalculated = {
      id: single.id,
      orderNumber: single.orderNumber,
      jumboType: single.jumboType,
      rollWidth: single.rollWidth,
      rollLength: single.rollLength,
      formatLabel: single.formatLabel,
      startTime: single.startTime,
      endTime: single.endTime,
      durationHours: single.specifiedHours || netWorkingHours,
      sharePercent: 100,
      producedM2: single.producedM2,
      nominalTargetDailyM2: nominal,
      proportionalTargetM2: adjustedTarget,
      attainmentPercent: Number(pct.toFixed(1)),
      hasMetGoal: single.producedM2 >= adjustedTarget && adjustedTarget > 0
    };

    return {
      isProportional: false,
      itemCount: 1,
      nominalBaseTargetM2: nominal,
      deductedStoppageTargetM2: deducted,
      totalCompositeTargetM2: adjustedTarget,
      totalProducedM2: single.producedM2,
      overallAttainmentPercent: Number(pct.toFixed(1)),
      totalHours: single.specifiedHours || netWorkingHours,
      grossShiftHours,
      stoppedMinutes,
      stoppedHours,
      netWorkingHours,
      availabilityFactor: Number(availabilityFactor.toFixed(3)),
      hasMetOverallGoal: single.producedM2 >= adjustedTarget && adjustedTarget > 0,
      items: [itemCalc]
    };
  }

  // 4. Múltiplos itens: cálculo proporcional ponderado com abatimento de paradas
  const hasAnyHours = mapped.some(it => it.specifiedHours > 0);
  let totalCalculatedHours = 0;
  let shares: number[] = [];

  const effectiveShiftToDistribute = netWorkingHours > 0 ? netWorkingHours : grossShiftHours;

  if (hasAnyHours) {
    const knownSum = mapped.reduce((acc, it) => acc + (it.specifiedHours > 0 ? it.specifiedHours : 0), 0);
    const unassignedCount = mapped.filter(it => !(it.specifiedHours > 0)).length;
    const remainingTime = Math.max(0, effectiveShiftToDistribute - knownSum);

    const filledHours = mapped.map(it => {
      if (it.specifiedHours > 0) return it.specifiedHours;
      return unassignedCount > 0 ? remainingTime / unassignedCount : 0;
    });

    totalCalculatedHours = filledHours.reduce((acc, h) => acc + h, 0) || effectiveShiftToDistribute;
    shares = filledHours.map(h => (totalCalculatedHours > 0 ? h / totalCalculatedHours : 1 / mapped.length));
  } else {
    // Proporção baseada no tempo ideal de engenharia (produzido / ritmo nominal)
    const idealHours = mapped.map(it => {
      if (it.nominalTargetDailyM2 > 0 && it.producedM2 > 0) {
        return (it.producedM2 / it.nominalTargetDailyM2) * effectiveShiftToDistribute;
      }
      return 1;
    });

    const sumIdeal = idealHours.reduce((acc, h) => acc + h, 0);
    totalCalculatedHours = effectiveShiftToDistribute;
    shares = idealHours.map(h => (sumIdeal > 0 ? h / sumIdeal : 1 / mapped.length));
  }

  let nominalCompositeSum = 0;
  let adjustedCompositeSum = 0;

  const itemsResult: ProportionalItemCalculated[] = mapped.map((it, idx) => {
    const share = shares[idx] || 0;
    const sharePct = Number((share * 100).toFixed(1));
    
    // Meta proporcional nominal da OP (sem abater parada)
    const opNominalTarget = Math.round(it.nominalTargetDailyM2 * share);
    nominalCompositeSum += opNominalTarget;

    // Meta proporcional líquida justa (abatendo o tempo de paradas de máquina)
    const proportionalTarget = Math.round(it.nominalTargetDailyM2 * share * availabilityFactor);
    adjustedCompositeSum += proportionalTarget;

    const attainment = proportionalTarget > 0 ? (it.producedM2 / proportionalTarget) * 100 : 0;
    const itemHours = hasAnyHours
      ? (it.specifiedHours > 0 ? it.specifiedHours : (totalCalculatedHours * share))
      : (totalCalculatedHours * share);

    return {
      id: it.id,
      orderNumber: it.orderNumber,
      jumboType: it.jumboType,
      rollWidth: it.rollWidth,
      rollLength: it.rollLength,
      formatLabel: it.formatLabel,
      startTime: it.startTime,
      endTime: it.endTime,
      durationHours: Number(itemHours.toFixed(2)),
      sharePercent: sharePct,
      producedM2: it.producedM2,
      nominalTargetDailyM2: it.nominalTargetDailyM2,
      proportionalTargetM2: proportionalTarget,
      attainmentPercent: Number(attainment.toFixed(1)),
      hasMetGoal: it.producedM2 >= proportionalTarget && proportionalTarget > 0
    };
  });

  const finalCompositeTarget = Math.max(1, adjustedCompositeSum);
  const deductedTotal = Math.max(0, nominalCompositeSum - finalCompositeTarget);
  const overallAttainment = finalCompositeTarget > 0 ? (totalProd / finalCompositeTarget) * 100 : 0;

  return {
    isProportional: true,
    itemCount: itemsResult.length,
    nominalBaseTargetM2: nominalCompositeSum,
    deductedStoppageTargetM2: deductedTotal,
    totalCompositeTargetM2: finalCompositeTarget,
    totalProducedM2: totalProd,
    overallAttainmentPercent: Number(overallAttainment.toFixed(1)),
    totalHours: Number(totalCalculatedHours.toFixed(1)),
    grossShiftHours,
    stoppedMinutes,
    stoppedHours,
    netWorkingHours,
    availabilityFactor: Number(availabilityFactor.toFixed(3)),
    hasMetOverallGoal: totalProd >= finalCompositeTarget && finalCompositeTarget > 0,
    items: itemsResult
  };
}
