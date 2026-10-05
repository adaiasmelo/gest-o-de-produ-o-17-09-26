import { collection, doc, setDoc, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE';

export type AuditModule =
  | 'Extrusão'
  | 'Corte de Fita'
  | 'Horas Extras'
  | 'Metas & Parâmetros'
  | 'Colaboradores'
  | 'Configurações';

export interface AuditDiffItem {
  field: string;
  label: string;
  oldValue: any;
  newValue: any;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string; // ISO string
  userId: string;
  userName: string;
  userRole?: string;
  action: AuditAction;
  module: AuditModule;
  targetId?: string;
  targetTitle: string;
  diff: AuditDiffItem[];
  reason?: string;
  metadata?: Record<string, any>;
}

const AUDIT_CACHE_KEY = 'manupackaging_audit_trail_cache';
const MAX_CACHE_ENTRIES = 500;

// Mapeamento amigável de campos para português padrão industrial
export const AUDIT_FIELD_LABELS: Record<string, string> = {
  date: 'Data do Lançamento',
  machine: 'Máquina',
  operator: 'Operador Responsável',
  shift: 'Turno',
  producedM2: 'Metros Produzidos (m²)',
  rejectedM2: 'Metros Rejeitados (m²)',
  wasteWeight: 'Lixo / Refile (Kg)',
  jumboM2: 'Metragem do Jumbo (m²)',
  jumboType: 'Tipo do Jumbo',
  orderNumber: 'Ordem de Produção (OP)',
  rollsCount: 'Quantidade de Rolos',
  rollsTipo1: 'Não Conf. Tipo 1 (Rolos)',
  rollsTipo2: 'Não Conf. Tipo 2 (Rolos)',
  motivo: 'Motivo da Parada',
  explicacao: 'Justificativa Detalhada',
  de: 'Horário Início Parada',
  ate: 'Horário Término Parada',
  durationMinutes: 'Duração da Parada (min)',
  overtimeHours: 'Horas Extras (h)',
  overtimePercentage: 'Percentual Hora Extra (%)',
  startDateTime: 'Início da Hora Extra',
  endDateTime: 'Término da Hora Extra',
  reason: 'Motivo / Atividade Realizada',
  status: 'Status do Apontamento',
  target: 'Meta Física',
  value: 'Valor Nominal',
  weight: 'Peso Produzido (Kg)',
  borraTotal: 'Borra Total (Kg)',
  ecoA: 'Aparas Eco A (Kg)',
  ecoBP: 'Aparas Eco B - P (Kg)',
  ecoBM: 'Aparas Eco B - M (Kg)',
};

/**
 * Calcula a diferença campo a campo entre dois objetos
 */
export function calculateObjectDiff(
  oldObj: Record<string, any> | null | undefined,
  newObj: Record<string, any> | null | undefined,
  customLabels: Record<string, string> = {}
): AuditDiffItem[] {
  const diffs: AuditDiffItem[] = [];
  const labels = { ...AUDIT_FIELD_LABELS, ...customLabels };

  if (!oldObj && !newObj) return diffs;

  const ignoreKeys = new Set([
    'id',
    '_id',
    'createdAt',
    'updatedAt',
    'timestamp',
    'userId',
    'syncStatus',
  ]);

  const allKeys = Array.from(
    new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})])
  );

  for (const key of allKeys) {
    if (ignoreKeys.has(key)) continue;

    const oldVal = oldObj ? oldObj[key] : undefined;
    const newVal = newObj ? newObj[key] : undefined;

    // Normalização para comparação profunda simples
    const strOld = typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal ?? '');
    const strNew = typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal ?? '');

    if (strOld !== strNew) {
      diffs.push({
        field: key,
        label: labels[key] || key,
        oldValue: oldVal ?? null,
        newValue: newVal ?? null,
      });
    }
  }

  return diffs;
}

/**
 * Lê registros armazenados em cache local
 */
export function getLocalAuditLogs(): AuditLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(AUDIT_CACHE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Salva no cache local com limite máximo de entradas
 */
function saveToLocalAuditLogs(entry: AuditLogEntry) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalAuditLogs();
    const updated = [entry, ...existing.filter((x) => x.id !== entry.id)].slice(
      0,
      MAX_CACHE_ENTRIES
    );
    localStorage.setItem(AUDIT_CACHE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[AuditLogger] Falha ao persistir no cache local:', err);
  }
}

/**
 * Registra um evento na Trilha de Auditoria (Firestore + LocalStorage)
 */
export async function logAuditEvent(params: {
  action: AuditAction;
  module: AuditModule;
  targetTitle: string;
  targetId?: string;
  userName: string;
  userId?: string;
  userRole?: string;
  oldState?: Record<string, any> | null;
  newState?: Record<string, any> | null;
  diff?: AuditDiffItem[];
  reason?: string;
  metadata?: Record<string, any>;
}): Promise<AuditLogEntry> {
  const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const finalDiff =
    params.diff && params.diff.length > 0
      ? params.diff
      : params.action === 'CREATE'
      ? Object.entries(params.newState || {})
          .filter(([k]) => !['id', 'createdAt', 'updatedAt'].includes(k))
          .map(([k, v]) => ({
            field: k,
            label: AUDIT_FIELD_LABELS[k] || k,
            oldValue: null,
            newValue: v,
          }))
      : params.action === 'DELETE'
      ? Object.entries(params.oldState || {})
          .filter(([k]) => !['id', 'createdAt', 'updatedAt'].includes(k))
          .map(([k, v]) => ({
            field: k,
            label: AUDIT_FIELD_LABELS[k] || k,
            oldValue: v,
            newValue: null,
          }))
      : calculateObjectDiff(params.oldState, params.newState);

  const entry: AuditLogEntry = {
    id,
    timestamp: now,
    userId: params.userId || 'system',
    userName: params.userName || 'Usuário do Sistema',
    userRole: params.userRole || 'Operador',
    action: params.action,
    module: params.module,
    targetId: params.targetId,
    targetTitle: params.targetTitle,
    diff: finalDiff,
    reason: params.reason,
    metadata: params.metadata,
  };

  // 1. Salva imediatamente no Cache Local para latência zero
  saveToLocalAuditLogs(entry);

  // 2. Dispara evento de CustomEvent para sincronia imediata na interface
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('audit_entry_added', { detail: entry }));
  }

  // 3. Persiste no Firestore em segundo plano
  try {
    const docRef = doc(db, 'audit_trail', id);
    setDoc(docRef, entry).catch((err) => {
      console.warn('[AuditLogger] Erro ao sincronizar auditoria com Firestore:', err);
    });
  } catch (err) {
    console.warn('[AuditLogger] Falha na gravação remota do Firestore:', err);
  }

  return entry;
}

/**
 * Assina atualizações em tempo real da trilha de auditoria
 */
export function subscribeAuditLogs(
  onUpdate: (logs: AuditLogEntry[]) => void,
  maxEntries = 150
): () => void {
  // Retorna cache local inicial imediatamente
  const localInitial = getLocalAuditLogs();
  onUpdate(localInitial.slice(0, maxEntries));

  let unsubscribeFirestore = () => {};

  try {
    const q = query(collection(db, 'audit_trail'), orderBy('timestamp', 'desc'), limit(maxEntries));
    unsubscribeFirestore = onSnapshot(
      q,
      (snapshot) => {
        const remoteLogs: AuditLogEntry[] = [];
        snapshot.forEach((d) => {
          remoteLogs.push(d.data() as AuditLogEntry);
        });

        // Mescla com logs locais recentes para garantir exibição imediata
        const mergedMap = new Map<string, AuditLogEntry>();
        remoteLogs.forEach((l) => mergedMap.set(l.id, l));
        getLocalAuditLogs().forEach((l) => {
          if (!mergedMap.has(l.id)) mergedMap.set(l.id, l);
        });

        const sorted = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        onUpdate(sorted.slice(0, maxEntries));
      },
      (error) => {
        console.warn('[AuditLogger] Fallback para logs locais devido a erro do Firestore:', error);
        onUpdate(getLocalAuditLogs().slice(0, maxEntries));
      }
    );
  } catch (err) {
    console.warn('[AuditLogger] Erro ao assinar Firestore:', err);
  }

  // Ouve eventos locais disparados na mesma aba
  const handleLocalEvent = (e: Event) => {
    const custom = e as CustomEvent<AuditLogEntry>;
    if (custom.detail) {
      const current = getLocalAuditLogs();
      onUpdate(current.slice(0, maxEntries));
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('audit_entry_added', handleLocalEvent);
  }

  return () => {
    unsubscribeFirestore();
    if (typeof window !== 'undefined') {
      window.removeEventListener('audit_entry_added', handleLocalEvent);
    }
  };
}

/**
 * Exporta a trilha de auditoria selecionada para formato CSV (ISO 9001 Compliance)
 */
export function exportAuditLogsToCsv(logs: AuditLogEntry[]): void {
  const headers = [
    'Data/Hora',
    'Módulo',
    'Ação',
    'Registro / Título',
    'Responsável',
    'Cargo',
    'Campo Alterado',
    'Valor Anterior',
    'Novo Valor',
    'Justificativa',
  ];

  const rows: string[][] = [];

  for (const log of logs) {
    const formattedDate = new Date(log.timestamp).toLocaleString('pt-BR');
    if (!log.diff || log.diff.length === 0) {
      rows.push([
        formattedDate,
        log.module,
        log.action,
        log.targetTitle,
        log.userName,
        log.userRole || '',
        'Geral',
        '-',
        '-',
        log.reason || '',
      ]);
    } else {
      for (const d of log.diff) {
        rows.push([
          formattedDate,
          log.module,
          log.action,
          log.targetTitle,
          log.userName,
          log.userRole || '',
          d.label || d.field,
          String(d.oldValue ?? '-'),
          String(d.newValue ?? '-'),
          log.reason || '',
        ]);
      }
    }
  }

  const csvContent =
    '\uFEFF' +
    [headers.join(';'), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))].join(
      '\n'
    );

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `trilha_auditoria_iso_${new Date().toISOString().substring(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
