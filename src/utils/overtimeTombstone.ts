/**
 * Utilitário de persistência definitiva de exclusão (Tombstone) para Lançamentos de Horas Extras (RH)
 * Garante que lançamentos excluídos jamais ressurjam via cache local, erro de sincronização ou auto-seeding.
 */

const STORAGE_KEY = 'manupack_deleted_overtime_entry_ids';
const INITIALIZED_FLAG_KEY = 'manupack_overtime_seeded_v1';

export function getDeletedOvertimeEntryIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function recordDeletedOvertimeEntryIds(ids: string[]): void {
  if (typeof window === 'undefined' || !ids || ids.length === 0) return;
  try {
    const current = getDeletedOvertimeEntryIds();
    ids.forEach(id => {
      if (id && typeof id === 'string') current.add(id);
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(current)));
    // Marca que o sistema já foi operado e possui exclusões válidas
    localStorage.setItem(INITIALIZED_FLAG_KEY, 'true');
  } catch (err) {
    console.warn('Erro ao gravar tombstone de horas extras:', err);
  }
}

export function recordDeletedOvertimeEntryId(id: string): void {
  recordDeletedOvertimeEntryIds([id]);
}

export function isOvertimeEntryDeleted(id: string): boolean {
  if (!id) return false;
  return getDeletedOvertimeEntryIds().has(id);
}

export function markOvertimeAsInitialized(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INITIALIZED_FLAG_KEY, 'true');
  } catch {}
}

export function hasOvertimeBeenInitialized(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(INITIALIZED_FLAG_KEY) === 'true';
  } catch {
    return false;
  }
}
