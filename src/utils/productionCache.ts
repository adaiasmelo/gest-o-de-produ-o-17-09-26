import { DocumentChange, DocumentData } from 'firebase/firestore';
import { ProductionEntry, RibbonCuttingEntry } from '../types';

export const PROD_CACHE_KEY = 'manupackaging_production_v2';
export const PROD_CACHE_LEGACY_KEY = 'manupackaging_production';
export const PROD_LAST_SYNC_KEY = 'manupackaging_production_last_sync';

export const RIBBON_CACHE_KEY = 'manupackaging_ribbon_v2';
export const RIBBON_LAST_SYNC_KEY = 'manupackaging_ribbon_last_sync';

export interface CachedProductionEnvelope {
  version: number;
  lastSyncTime: string | null;
  savedAt: number;
  entries: ProductionEntry[];
}

export interface CachedRibbonEnvelope {
  version: number;
  lastSyncTime: string | null;
  savedAt: number;
  entries: RibbonCuttingEntry[];
}

/**
 * Filtra e valida um apontamento garantindo que pertence ao período ativo (>= 2026)
 */
export function isValidProductionEntry(entry: any): entry is ProductionEntry {
  if (!entry || typeof entry !== 'object' || !entry.id || !entry.date) return false;
  const year = parseInt(String(entry.date).split('-')[0], 10);
  return !isNaN(year) && year >= 2026;
}

/**
 * Remove duplicatas de lançamentos usando ID primário e chave de negócio (data + máquina + turno + operador).
 * Se houver dois registros com dados conflitantes ou IDs gerados em aparelhos diferentes (ex: João Augusto duplicado),
 * preserva o mais recente ou mais completo.
 */
export function deduplicateProductionEntries(entries: ProductionEntry[]): ProductionEntry[] {
  if (!Array.isArray(entries) || entries.length === 0) return [];
  
  const idMap = new Map<string, ProductionEntry>();
  const businessMap = new Map<string, ProductionEntry>();

  // Ordena com os mais recentes (maior data ou updatedAt) primeiro
  const sorted = [...entries].filter(isValidProductionEntry).sort((a, b) => {
    const timeA = a.updatedAt || a.date || '';
    const timeB = b.updatedAt || b.date || '';
    return timeB.localeCompare(timeA) || (b.id || '').localeCompare(a.id || '');
  });

  for (const entry of sorted) {
    if (!entry.id || idMap.has(entry.id)) {
      continue;
    }

    // Normaliza chave de negócio para evitar registros duplicados do mesmo operador no mesmo turno/máquina/dia
    const normDate = (entry.date || '').trim();
    const normMachine = (entry.machine || '').trim().toLowerCase();
    const normShift = (entry.shift || '').trim().toLowerCase();
    const normOperator = (entry.operator || '').trim().toUpperCase();

    // Se for dia sem produção ou manutenção explícita, inclui chave de motivo para permitir paradas distintas
    const isSpecial = entry.isNoWorkDay || entry.isMaintenanceEntry;
    const businessKey = isSpecial 
      ? `${normDate}_${normMachine}_${normShift}_${entry.id}` 
      : `${normDate}_${normMachine}_${normShift}_${normOperator}`;

    if (businessMap.has(businessKey)) {
      // Já existe um registro ativo para este operador neste turno e máquina na mesma data. Ignora duplicata!
      continue;
    }

    idMap.set(entry.id, entry);
    businessMap.set(businessKey, entry);
  }

  return Array.from(idMap.values()).sort(
    (a, b) => (b.date || '').localeCompare(a.date || '') || (b.id || '').localeCompare(a.id || '')
  );
}

/**
 * Carrega instantaneamente os dados de produção do localStorage (0ms de latência)
 * Executado na inicialização do estado para que o dashboard nunca apareça vazio.
 */
export function loadProductionCache(): {
  entries: ProductionEntry[];
  lastSyncTime: string | null;
  isLoadedFromCache: boolean;
} {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { entries: [], lastSyncTime: null, isLoadedFromCache: false };
  }

  try {
    // 1. Tentar formato v2 estruturado com metadados de sincronização
    const v2Raw = localStorage.getItem(PROD_CACHE_KEY);
    if (v2Raw) {
      const parsed: CachedProductionEnvelope = JSON.parse(v2Raw);
      if (Array.isArray(parsed.entries) && parsed.entries.length > 0) {
        const validEntries = deduplicateProductionEntries(parsed.entries.filter(isValidProductionEntry));
        return {
          entries: validEntries,
          lastSyncTime: parsed.lastSyncTime || localStorage.getItem(PROD_LAST_SYNC_KEY) || null,
          isLoadedFromCache: true
        };
      }
    }

    // 2. Fallback para formato legado simples
    const legacyRaw = localStorage.getItem(PROD_CACHE_LEGACY_KEY);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validEntries = deduplicateProductionEntries(parsed.filter(isValidProductionEntry));
        return {
          entries: validEntries,
          lastSyncTime: localStorage.getItem(PROD_LAST_SYNC_KEY) || null,
          isLoadedFromCache: true
        };
      }
    }
  } catch (err) {
    console.warn('Falha ao ler cache de produção do localStorage:', err);
  }

  return { entries: [], lastSyncTime: null, isLoadedFromCache: false };
}

/**
 * Salva os dados de produção no localStorage de forma segura, tratando estouro de cota
 */
let saveProdTimeout: ReturnType<typeof setTimeout> | null = null;

export function saveProductionCache(entries: ProductionEntry[], lastSyncTime?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  // Debounce para evitar sobrecarga de I/O em atualizações em lote
  if (saveProdTimeout) {
    clearTimeout(saveProdTimeout);
  }

  saveProdTimeout = setTimeout(() => {
    try {
      const validEntries = entries.filter(isValidProductionEntry);
      const syncTime = lastSyncTime || new Date().toISOString();

      const envelope: CachedProductionEnvelope = {
        version: 2,
        lastSyncTime: syncTime,
        savedAt: Date.now(),
        entries: validEntries
      };

      const serialized = JSON.stringify(envelope);
      localStorage.setItem(PROD_CACHE_KEY, serialized);
      // Manter compatibilidade com leituras antigas
      localStorage.setItem(PROD_CACHE_LEGACY_KEY, JSON.stringify(validEntries));
      localStorage.setItem(PROD_LAST_SYNC_KEY, syncTime);
    } catch (err: any) {
      // Tratar QuotaExceededError limpando caches temporários se necessário
      if (err?.name === 'QuotaExceededError' || err?.code === 22) {
        console.warn('Quota de localStorage atingida ao salvar produção. Limpando chaves temporárias...');
        try {
          // Limpa chaves não essenciais
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('temp_') || key.includes('_debug_') || key.startsWith('cache_pdf_'))) {
              localStorage.removeItem(key);
            }
          }
          // Tenta salvar novamente
          const envelope: CachedProductionEnvelope = {
            version: 2,
            lastSyncTime: lastSyncTime || new Date().toISOString(),
            savedAt: Date.now(),
            entries: entries.slice(0, 500) // mantém os 500 mais recentes em caso de limite rígido
          };
          localStorage.setItem(PROD_CACHE_KEY, JSON.stringify(envelope));
        } catch (_) {}
      }
    }
  }, 150);
}

/**
 * Mescla incrementalmente as alterações recebidas do Firestore (snap.docChanges)
 * com o estado atual em cache na memória, evitando refazer o array inteiro se nada mudou.
 */
export function mergeProductionDocChanges(
  currentEntries: ProductionEntry[],
  docChanges: DocumentChange<DocumentData>[],
  options?: {
    sanitizeShift?: (shift: string, machine: string) => string;
    upgradeName?: (name: string) => string;
    isInitialSnapshot?: boolean;
    allLiveDocIds?: Set<string>;
  }
): {
  updatedEntries: ProductionEntry[];
  hasChanges: boolean;
  addedCount: number;
  modifiedCount: number;
  removedCount: number;
} {
  if (!docChanges || docChanges.length === 0) {
    return {
      updatedEntries: currentEntries,
      hasChanges: false,
      addedCount: 0,
      modifiedCount: 0,
      removedCount: 0
    };
  }

  const entriesMap = new Map<string, ProductionEntry>();
  currentEntries.forEach(item => {
    if (item && item.id) {
      entriesMap.set(item.id, item);
    }
  });

  let hasChanges = false;
  let addedCount = 0;
  let modifiedCount = 0;
  let removedCount = 0;

  // No carregamento inicial, se fornecido conjunto com todos os IDs vivos do Firestore,
  // removemos do cache local qualquer apontamento que tenha sido deletado na nuvem enquanto offline.
  if (options?.isInitialSnapshot && options?.allLiveDocIds) {
    const liveIds = options.allLiveDocIds;
    for (const cachedId of Array.from(entriesMap.keys())) {
      if (!liveIds.has(cachedId)) {
        entriesMap.delete(cachedId);
        hasChanges = true;
        removedCount++;
      }
    }
  }

  const sanitizeShiftFn = options?.sanitizeShift || ((s) => s || '1º Turno');
  const upgradeNameFn = options?.upgradeName || ((n) => n || '');

  for (const change of docChanges) {
    const docId = change.doc.id;

    if (change.type === 'removed') {
      if (entriesMap.has(docId)) {
        entriesMap.delete(docId);
        hasChanges = true;
        removedCount++;
      }
      continue;
    }

    // added ou modified
    const rawData = change.doc.data() as ProductionEntry;
    const sanitizedShift = sanitizeShiftFn(rawData.shift, rawData.machine);
    const upgradedOperator = upgradeNameFn(rawData.operator);

    const entry: ProductionEntry = {
      ...rawData,
      id: docId,
      shift: sanitizedShift,
      operator: upgradedOperator
    };

    if (!isValidProductionEntry(entry)) {
      if (entriesMap.has(docId)) {
        entriesMap.delete(docId);
        hasChanges = true;
      }
      continue;
    }

    const existing = entriesMap.get(docId);

    if (!existing) {
      entriesMap.set(docId, entry);
      hasChanges = true;
      addedCount++;
    } else {
      // Verificar se o documento realmente mudou para evitar render desnecessário
      const isIdentical = 
        (existing.updatedAt && entry.updatedAt && existing.updatedAt === entry.updatedAt) ||
        (
          existing.netWeight === entry.netWeight &&
          existing.grossWeight === entry.grossWeight &&
          existing.operator === entry.operator &&
          existing.shift === entry.shift &&
          existing.machine === entry.machine &&
          existing.date === entry.date &&
          existing.borraTotal === entry.borraTotal &&
          existing.ecoA === entry.ecoA &&
          existing.ecoBP === entry.ecoBP &&
          existing.ecoBM === entry.ecoBM &&
          existing.volumes === entry.volumes &&
          existing.tubetes === entry.tubetes &&
          existing.manutencaoMin === entry.manutencaoMin &&
          existing.processoMin === entry.processoMin &&
          existing.outrosMin === entry.outrosMin &&
          existing.manutencaoMotivo === entry.manutencaoMotivo &&
          existing.processoMotivo === entry.processoMotivo &&
          existing.outrosMotivo === entry.outrosMotivo
        );

      if (!isIdentical) {
        entriesMap.set(docId, entry);
        hasChanges = true;
        modifiedCount++;
      }
    }
  }

  if (!hasChanges) {
    return {
      updatedEntries: currentEntries,
      hasChanges: false,
      addedCount: 0,
      modifiedCount: 0,
      removedCount: 0
    };
  }

  const rawList = Array.from(entriesMap.values());
  const updatedEntries = deduplicateProductionEntries(rawList);

  return {
    updatedEntries,
    hasChanges: true,
    addedCount,
    modifiedCount,
    removedCount
  };
}

/**
 * Cache para Corte de Fita (Ribbon Cutting)
 */
export function loadRibbonCache(): {
  entries: RibbonCuttingEntry[];
  lastSyncTime: string | null;
  isLoadedFromCache: boolean;
} {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { entries: [], lastSyncTime: null, isLoadedFromCache: false };
  }

  try {
    const raw = localStorage.getItem(RIBBON_CACHE_KEY);
    if (raw) {
      const parsed: CachedRibbonEnvelope = JSON.parse(raw);
      if (Array.isArray(parsed.entries) && parsed.entries.length > 0) {
        return {
          entries: parsed.entries.sort((a, b) => (b.date || '').localeCompare(a.date || '')),
          lastSyncTime: parsed.lastSyncTime || localStorage.getItem(RIBBON_LAST_SYNC_KEY) || null,
          isLoadedFromCache: true
        };
      }
    }
  } catch (err) {
    console.warn('Falha ao ler cache de corte de fita:', err);
  }

  return { entries: [], lastSyncTime: null, isLoadedFromCache: false };
}

let saveRibbonTimeout: ReturnType<typeof setTimeout> | null = null;

export function saveRibbonCache(entries: RibbonCuttingEntry[], lastSyncTime?: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  if (saveRibbonTimeout) {
    clearTimeout(saveRibbonTimeout);
  }

  saveRibbonTimeout = setTimeout(() => {
    try {
      const syncTime = lastSyncTime || new Date().toISOString();
      const envelope: CachedRibbonEnvelope = {
        version: 2,
        lastSyncTime: syncTime,
        savedAt: Date.now(),
        entries
      };
      localStorage.setItem(RIBBON_CACHE_KEY, JSON.stringify(envelope));
      localStorage.setItem(RIBBON_LAST_SYNC_KEY, syncTime);
    } catch (_) {}
  }, 150);
}

export function mergeRibbonDocChanges(
  currentEntries: RibbonCuttingEntry[],
  docChanges: DocumentChange<DocumentData>[]
): {
  updatedEntries: RibbonCuttingEntry[];
  hasChanges: boolean;
} {
  if (!docChanges || docChanges.length === 0) {
    return { updatedEntries: currentEntries, hasChanges: false };
  }

  const map = new Map<string, RibbonCuttingEntry>();
  currentEntries.forEach(item => {
    if (item && item.id) map.set(item.id, item);
  });

  let hasChanges = false;

  for (const change of docChanges) {
    const docId = change.doc.id;
    if (change.type === 'removed') {
      if (map.has(docId)) {
        map.delete(docId);
        hasChanges = true;
      }
      continue;
    }

    const data = { ...change.doc.data(), id: docId } as RibbonCuttingEntry;
    const existing = map.get(docId);

    if (!existing || JSON.stringify(existing) !== JSON.stringify(data)) {
      map.set(docId, data);
      hasChanges = true;
    }
  }

  if (!hasChanges) {
    return { updatedEntries: currentEntries, hasChanges: false };
  }

  const updatedEntries = Array.from(map.values()).sort(
    (a, b) => (b.date || '').localeCompare(a.date || '')
  );

  return { updatedEntries, hasChanges: true };
}
