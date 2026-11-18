import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

// Obtenção flexível das chaves: Suporta variáveis Vite (.env) ou configuração dinâmica salva pelo usuário no navegador
export function getStoredSupabaseConfig() {
  const defaultUrl = 'https://xhhfaryqenjpqkffhbnr.supabase.co';
  const defaultKey = 'sb_publishable_uq5OUxiaTB-zXBfzthVyhw_n2S5nNmy';

  const envUrl = (import.meta.env.VITE_SUPABASE_URL || defaultUrl).trim();
  const envAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || defaultKey).trim();

  const localUrl = (typeof window !== 'undefined' ? localStorage.getItem('manupackaging_supabase_url') || '' : '').trim();
  const localAnonKey = (typeof window !== 'undefined' ? localStorage.getItem('manupackaging_supabase_anon_key') || localStorage.getItem('manupackaging_supabase_publishable_key') || '' : '').trim();

  const url = localUrl || envUrl;
  const anonKey = localAnonKey || envAnonKey;

  const source: 'env' | 'localStorage' | 'none' = (localUrl && localAnonKey) ? 'localStorage' : (url && anonKey ? 'env' : 'none');

  return {
    url,
    anonKey,
    hasConfig: !!(url && anonKey && url.startsWith('http')),
    source
  };
}

let supabaseInstance: SupabaseClient | null = null;
let currentConfigKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config.hasConfig) {
    return null;
  }

  const key = `${config.url}_${config.anonKey.slice(0, 8)}`;
  if (!supabaseInstance || currentConfigKey !== key) {
    try {
      supabaseInstance = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });
      currentConfigKey = key;
    } catch (err) {
      console.warn('Erro ao instanciar Supabase Client:', err);
      supabaseInstance = null;
    }
  }

  return supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
  return getStoredSupabaseConfig().hasConfig;
}

export function saveCustomSupabaseConfig(url: string, anonKey: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();
    if (!cleanUrl || !cleanKey) return false;

    localStorage.setItem('manupackaging_supabase_url', cleanUrl);
    localStorage.setItem('manupackaging_supabase_anon_key', cleanKey);
    supabaseInstance = null; // Força recriação na próxima chamada
    return true;
  } catch (e) {
    console.error('Erro ao salvar configuração do Supabase:', e);
    return false;
  }
}

export function removeCustomSupabaseConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('manupackaging_supabase_url');
  localStorage.removeItem('manupackaging_supabase_anon_key');
  supabaseInstance = null;
}

export async function testSupabaseConnection(): Promise<{ success: boolean; latencyMs?: number; message?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'URL ou Chave Anônima do Supabase não configuradas.' };
  }

  const start = Date.now();
  try {
    const { error } = await client.from('production_entries').select('id').limit(1);
    const latency = Date.now() - start;

    if (error) {
      if (error.code === '42P01') {
        return {
          success: false,
          latencyMs: latency,
          message: 'Conectado ao Supabase, mas a tabela "production_entries" ainda não foi criada. Por favor, execute o script supabase-schema.sql no SQL Editor do Supabase.'
        };
      }
      return { success: false, latencyMs: latency, message: `Erro do Supabase: ${error.message} (Código: ${error.code})` };
    }

    return { success: true, latencyMs: latency, message: 'Conexão com o Supabase estabelecida com sucesso!' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Falha ao conectar com o Supabase.' };
  }
}

// =========================================================================
// MAPEADORES DE PRODUÇÃO
// =========================================================================

export function mapProductionEntryToSupabaseRow(entry: any) {
  return {
    id: String(entry.id),
    date: String(entry.date || ''),
    machine: String(entry.machine || 'Cast 1'),
    shift: String(entry.shift || ''),
    operator: String(entry.operator || ''),
    assistant: String(entry.assistant || ''),
    product: String(entry.product || ''),
    thickness: Number(entry.thickness) || 0,
    width: Number(entry.width) || 0,
    net_weight: Number(entry.netWeight) || 0,
    gross_weight: Number(entry.grossWeight) || 0,
    rolls_count: Number(entry.rollsCount) || 0,
    scrap_process: Number(entry.scrapProcess) || 0,
    scrap_mechanical: Number(entry.scrapMechanical) || 0,
    scrap_purge: Number(entry.scrapPurge) || 0,
    scrap_trim: Number(entry.scrapTrim) || 0,
    total_scrap: Number(entry.totalScrap) || 0,
    scrap_reasons: Array.isArray(entry.scrapReasons) ? entry.scrapReasons : [],
    stops: Array.isArray(entry.stops) ? entry.stops : [],
    notes: String(entry.notes || ''),
    speed: Number(entry.speed) || 0,
    rpm: Number(entry.rpm) || 0,
    melt_pressure: Number(entry.meltPressure) || 0,
    melt_temperature: Number(entry.meltTemperature) || 0,
    is_no_work_day: !!entry.isNoWorkDay,
    is_maintenance_entry: !!entry.isMaintenanceEntry,
    user_id: String(entry.userId || 'system'),
    updated_at: entry.updatedAt || new Date().toISOString(),
    raw_data: entry
  };
}

export function mapSupabaseRowToProductionEntry(row: any) {
  if (!row) return null;
  const base = row.raw_data && typeof row.raw_data === 'object' ? { ...row.raw_data } : {};
  return {
    ...base,
    id: row.id,
    date: row.date || base.date,
    machine: row.machine || base.machine,
    shift: row.shift || base.shift,
    operator: row.operator || base.operator,
    assistant: row.assistant || base.assistant,
    product: row.product || base.product,
    thickness: Number(row.thickness) || base.thickness || 0,
    width: Number(row.width) || base.width || 0,
    netWeight: Number(row.net_weight !== undefined ? row.net_weight : base.netWeight) || 0,
    grossWeight: Number(row.gross_weight !== undefined ? row.gross_weight : base.grossWeight) || 0,
    rollsCount: Number(row.rolls_count !== undefined ? row.rolls_count : base.rollsCount) || 0,
    scrapProcess: Number(row.scrap_process !== undefined ? row.scrap_process : base.scrapProcess) || 0,
    scrapMechanical: Number(row.scrap_mechanical !== undefined ? row.scrap_mechanical : base.scrapMechanical) || 0,
    scrapPurge: Number(row.scrap_purge !== undefined ? row.scrap_purge : base.scrapPurge) || 0,
    scrapTrim: Number(row.scrap_trim !== undefined ? row.scrap_trim : base.scrapTrim) || 0,
    totalScrap: Number(row.total_scrap !== undefined ? row.total_scrap : base.totalScrap) || 0,
    scrapReasons: row.scrap_reasons || base.scrapReasons || [],
    stops: row.stops || base.stops || [],
    notes: row.notes || base.notes || '',
    speed: Number(row.speed) || base.speed || 0,
    rpm: Number(row.rpm) || base.rpm || 0,
    meltPressure: Number(row.melt_pressure) || base.meltPressure || 0,
    meltTemperature: Number(row.melt_temperature) || base.meltTemperature || 0,
    isNoWorkDay: row.is_no_work_day !== undefined ? !!row.is_no_work_day : !!base.isNoWorkDay,
    isMaintenanceEntry: row.is_maintenance_entry !== undefined ? !!row.is_maintenance_entry : !!base.isMaintenanceEntry,
    userId: row.user_id || base.userId || 'system',
    updatedAt: row.updated_at || base.updatedAt || new Date().toISOString()
  };
}

export async function saveProductionEntryToSupabase(entry: any): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const row = mapProductionEntryToSupabaseRow(entry);
    const { error } = await client.from('production_entries').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('Erro ao salvar no Supabase (production_entries):', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Exceção ao gravar no Supabase:', err);
    return false;
  }
}

export async function deleteProductionEntryFromSupabase(id: string): Promise<boolean> {
  return deleteProductionEntriesFromSupabase([id]);
}

export async function deleteProductionEntriesFromSupabase(ids: string[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !ids || ids.length === 0) return false;

  try {
    const chunkSize = 100;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const { error } = await client.from('production_entries').delete().in('id', chunk);
      if (error) {
        console.warn('Erro ao deletar lote no Supabase:', error);
      }
    }
    return true;
  } catch (err) {
    console.warn('Exceção ao deletar lote no Supabase:', err);
    return false;
  }
}

export async function fetchAllProductionFromSupabase(options?: {
  sinceUpdatedAt?: string | null;
  recentDays?: number | null;
}): Promise<any[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const pageSize = 1000;
    let from = 0;
    let allRows: any[] = [];
    let hasMore = true;

    let cutoffDateStr: string | null = null;
    if (options?.recentDays && options.recentDays > 0) {
      const d = new Date();
      d.setDate(d.getDate() - options.recentDays);
      cutoffDateStr = d.toISOString().slice(0, 10);
    }

    while (hasMore) {
      let query = client
        .from('production_entries')
        .select('id, updated_at, raw_data')
        .order('date', { ascending: false })
        .range(from, from + pageSize - 1);

      if (options?.sinceUpdatedAt) {
        query = query.gte('updated_at', options.sinceUpdatedAt);
      }
      if (cutoffDateStr) {
        query = query.gte('date', cutoffDateStr);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Erro ao buscar lançamentos no Supabase:', error);
        break;
      }

      if (data && data.length > 0) {
        allRows = allRows.concat(data);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          from += pageSize;
        }
      } else {
        hasMore = false;
      }
    }

    return allRows.map(mapSupabaseRowToProductionEntry).filter(Boolean);
  } catch (err) {
    console.warn('Exceção ao buscar do Supabase com paginação:', err);
    return [];
  }
}

export async function checkSupabaseConnection(): Promise<{ connected: boolean; count: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { connected: false, count: 0, error: 'Cliente não configurado' };

  try {
    const { count, error } = await client
      .from('production_entries')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return { connected: false, count: 0, error: error.message };
    }
    return { connected: true, count: count || 0 };
  } catch (err: any) {
    return { connected: false, count: 0, error: err?.message || 'Erro desconhecido' };
  }
}

// =========================================================================
// OPERAÇÕES GLOBAIS GENÉRICAS E KEY-VALUE NO SUPABASE (100% SEM FIREBASE)
// =========================================================================

// Cache de tabelas auxiliares armazenadas via JSONB na tabela `settings`
const KV_ONLY_COLLECTIONS = new Set([
  'bonus_incidents',
  'machine_goal_configs',
  'active_sessions',
  'user_activity_logs',
  'access_logs',
  'weekly_meetings',
  'deletedProductionEntries'
]);

const missingOptionalTables = new Set<string>();

function isTableNotFoundError(err: any): boolean {
  const code = String(err?.code || '');
  const msg = String(err?.message || '');
  return code === 'PGRST205' || code === '42P01' || msg.includes('Could not find the table') || msg.includes('does not exist');
}

export function generateSupabaseId(prefix = 'doc'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function upsertToSupabase(table: string, row: any): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !row) return false;
  try {
    const { error } = await client.from(table).upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn(`[Supabase] Erro ao gravar em ${table}:`, error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn(`[Supabase] Exceção ao gravar em ${table}:`, err?.message);
    return false;
  }
}

export async function deleteFromSupabase(table: string, id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !id) return false;
  try {
    const { error } = await client.from(table).delete().eq('id', id);
    if (error) {
      console.warn(`[Supabase] Erro ao excluir de ${table}:`, error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn(`[Supabase] Exceção ao excluir de ${table}:`, err?.message);
    return false;
  }
}

export async function fetchAllFromSupabase(
  table: string,
  orderBy: string = 'id',
  ascending: boolean = true,
  selectColumns: string = '*'
): Promise<any[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const pageSize = 1000;
    let from = 0;
    let allRows: any[] = [];
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await client
        .from(table)
        .select(selectColumns)
        .order(orderBy, { ascending })
        .range(from, from + pageSize - 1);

      if (error) {
        console.warn(`[Supabase] Erro ao buscar de ${table}:`, error.message);
        break;
      }

      if (data && data.length > 0) {
        allRows = allRows.concat(data);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          from += pageSize;
        }
      } else {
        hasMore = false;
      }
    }

    return allRows;
  } catch (err: any) {
    console.warn(`[Supabase] Exceção ao buscar de ${table}:`, err?.message);
    return [];
  }
}

// =========================================================================
// SETTINGS KEY-VALUE STORE (TABELA `settings` DO SUPABASE)
// =========================================================================

export async function fetchSettingsKeyFromSupabase<T = any>(key: string): Promise<T | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('settings')
      .select('data')
      .eq('id', key)
      .maybeSingle();

    if (error) {
      console.warn(`[Supabase] Erro ao ler settings/${key}:`, error.message);
      return null;
    }
    return (data?.data as T) ?? null;
  } catch (err: any) {
    console.warn(`[Supabase] Exceção ao ler settings/${key}:`, err?.message);
    return null;
  }
}

export async function saveSettingsToSupabase(key: string, data: any): Promise<boolean> {
  return upsertToSupabase('settings', {
    id: key,
    key,
    data,
    updated_at: new Date().toISOString()
  });
}

export async function mergeSettingsInSupabase(key: string, partialData: Record<string, any>): Promise<boolean> {
  const existing = (await fetchSettingsKeyFromSupabase<Record<string, any>>(key)) || {};
  const merged = { ...existing, ...partialData };
  return saveSettingsToSupabase(key, merged);
}

// KV-collection helpers stored inside settings (`kv_<collectionName>`)
export async function fetchKvCollectionFromSupabase<T = any>(collectionName: string): Promise<T[]> {
  const kvKey = `kv_${collectionName}`;
  const docData = await fetchSettingsKeyFromSupabase<{ items?: T[] }>(kvKey);
  if (docData && Array.isArray(docData.items)) {
    return docData.items;
  }
  return [];
}

export async function saveKvCollectionToSupabase<T = any>(collectionName: string, items: T[]): Promise<boolean> {
  const kvKey = `kv_${collectionName}`;
  return saveSettingsToSupabase(kvKey, {
    items,
    updatedAt: new Date().toISOString()
  });
}

export async function fetchDeletedProductionIdsFromSupabase(): Promise<string[]> {
  const items = await fetchKvCollectionFromSupabase<any>('deletedProductionEntries');
  return items
    .map((item) => (typeof item === 'string' ? item : item?.id))
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
}

export async function recordDeletedProductionIdsInSupabase(ids: string[], deletedBy = 'Sistema'): Promise<boolean> {
  if (!ids || ids.length === 0) return true;
  const current = await fetchKvCollectionFromSupabase<any>('deletedProductionEntries');
  const map = new Map<string, any>();
  current.forEach((item) => {
    const id = typeof item === 'string' ? item : item?.id;
    if (id) map.set(id, typeof item === 'string' ? { id } : item);
  });
  const now = new Date().toISOString();
  ids.forEach((id) => {
    if (id) {
      map.set(id, { id, deletedAt: now, deletedBy });
    }
  });
  return saveKvCollectionToSupabase('deletedProductionEntries', Array.from(map.values()));
}

export async function removeDeletedProductionIdFromSupabase(id: string): Promise<boolean> {
  if (!id) return true;
  const current = await fetchKvCollectionFromSupabase<any>('deletedProductionEntries');
  const next = current.filter((item) => {
    const itemId = typeof item === 'string' ? item : item?.id;
    return itemId !== id;
  });
  if (next.length === current.length) return true;
  return saveKvCollectionToSupabase('deletedProductionEntries', next);
}

// =========================================================================
// MAPEADORES ESPECÍFICOS DE CADA ENTIDADE DO SISTEMA
// =========================================================================

export function mapRawRow<T = any>(row: any): T {
  if (!row) return row;
  if (row.raw_data && typeof row.raw_data === 'object' && Object.keys(row.raw_data).length > 0) {
    return { ...row.raw_data, id: row.id } as T;
  }
  return row as T;
}

// Collaborators
export async function saveCollaboratorToSupabase(c: any): Promise<boolean> {
  return upsertToSupabase('collaborators', {
    id: String(c.id),
    name: String(c.name || ''),
    registration: String(c.registration || ''),
    role: String(c.role || 'Auxiliar de Produção'),
    sector: String(c.sector || 'Extrusão'),
    shift: String(c.shift || ''),
    machine: String(c.machine || ''),
    status: String(c.status || 'Ativo'),
    is_silenced: !!c.isSilenced,
    silence_reason: String(c.silenceReason || ''),
    raw_data: c,
    updated_at: c.updatedAt || new Date().toISOString()
  });
}

export async function deleteCollaboratorFromSupabase(id: string): Promise<boolean> {
  return deleteFromSupabase('collaborators', id);
}

export async function updateCollaboratorInSupabase(id: string, partial: Record<string, any>): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !id) return false;
  try {
    const { data } = await client.from('collaborators').select('*').eq('id', id).maybeSingle();
    const existingRaw = mapRawRow<Record<string, any>>(data) || { id };
    return saveCollaboratorToSupabase({ ...existingRaw, ...partial, id, updatedAt: new Date().toISOString() });
  } catch (err: any) {
    console.warn('[Supabase] Erro ao atualizar colaborador:', err?.message);
    return false;
  }
}

export async function deleteCollaboratorsBatchFromSupabase(ids: string[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !ids || ids.length === 0) return false;
  try {
    for (let i = 0; i < ids.length; i += 100) {
      await client.from('collaborators').delete().in('id', ids.slice(i, i + 100));
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] Erro ao excluir colaboradores em lote:', err?.message);
    return false;
  }
}

// Employees
export async function saveEmployeeToSupabase(emp: any): Promise<boolean> {
  return upsertToSupabase('employees', {
    id: String(emp.id),
    name: String(emp.name || ''),
    role: String(emp.role || ''),
    sector: String(emp.sector || 'Extrusão'),
    machine: String(emp.machine || ''),
    shift: String(emp.shift || ''),
    status: String(emp.status || 'Ativo'),
    collaborator_id: String(emp.collaboratorId || ''),
    raw_data: emp,
    updated_at: emp.updatedAt || new Date().toISOString()
  });
}

export async function updateEmployeeInSupabase(id: string, partial: Record<string, any>): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !id) return false;
  try {
    const { data } = await client.from('employees').select('*').eq('id', id).maybeSingle();
    const existingRaw = mapRawRow<Record<string, any>>(data) || { id };
    return saveEmployeeToSupabase({ ...existingRaw, ...partial, id, updatedAt: new Date().toISOString() });
  } catch (err: any) {
    console.warn('[Supabase] Erro ao atualizar funcionário:', err?.message);
    return false;
  }
}

export async function deleteEmployeeFromSupabase(id: string): Promise<boolean> {
  return deleteFromSupabase('employees', id);
}

// Shifts
export async function saveShiftToSupabase(s: any): Promise<boolean> {
  return upsertToSupabase('shifts', {
    id: String(s.id),
    date: String(s.date || s.name || ''),
    shift: String(s.shift || s.name || ''),
    sector: String(s.sector || 'Extrusão'),
    operator: String(s.operator || ''),
    machine: String(s.machine || ''),
    net_weight: Number(s.netWeight) || 0,
    scrap: Number(s.scrap) || 0,
    raw_data: s,
    updated_at: s.updatedAt || new Date().toISOString()
  });
}

// Vacations
export async function saveVacationToSupabase(vac: any): Promise<boolean> {
  return upsertToSupabase('vacations', {
    id: String(vac.id),
    employee_id: String(vac.employeeId || vac.registration || ''),
    employee_name: String(vac.employeeName || vac.name || ''),
    start_date: String(vac.startDate || ''),
    end_date: String(vac.endDate || ''),
    status: String(vac.status || 'Programado'),
    raw_data: vac,
    updated_at: vac.updatedAt || new Date().toISOString()
  });
}

export async function updateVacationInSupabase(id: string, partial: Record<string, any>): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !id) return false;
  try {
    const { data } = await client.from('vacations').select('*').eq('id', id).maybeSingle();
    const existingRaw = mapRawRow<Record<string, any>>(data) || { id };
    return saveVacationToSupabase({ ...existingRaw, ...partial, id, updatedAt: new Date().toISOString() });
  } catch (err: any) {
    console.warn('[Supabase] Erro ao atualizar férias:', err?.message);
    return false;
  }
}

export async function deleteVacationFromSupabase(id: string): Promise<boolean> {
  return deleteFromSupabase('vacations', id);
}

export async function deleteVacationsBatchFromSupabase(ids: string[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !ids || ids.length === 0) return true;
  try {
    for (let i = 0; i < ids.length; i += 100) {
      await client.from('vacations').delete().in('id', ids.slice(i, i + 100));
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] Erro ao excluir férias em lote:', err?.message);
    return false;
  }
}

export async function saveVacationsBatchToSupabase(vacs: any[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !vacs || vacs.length === 0) return true;
  try {
    const rows = vacs.map((vac) => ({
      id: String(vac.id),
      employee_id: String(vac.employeeId || vac.registration || ''),
      employee_name: String(vac.employeeName || vac.name || ''),
      start_date: String(vac.startDate || ''),
      end_date: String(vac.endDate || ''),
      status: String(vac.status || 'Programado'),
      raw_data: vac,
      updated_at: vac.updatedAt || new Date().toISOString()
    }));
    for (let i = 0; i < rows.length; i += 100) {
      await client.from('vacations').upsert(rows.slice(i, i + 100), { onConflict: 'id' });
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] Erro ao salvar férias em lote:', err?.message);
    return false;
  }
}

// Personnel Logs
export async function savePersonnelLogToSupabase(log: any): Promise<boolean> {
  return upsertToSupabase('personnel_logs', {
    id: String(log.id),
    date: String(log.date || new Date().toISOString()),
    shift: String(log.shift || ''),
    sector: String(log.sector || ''),
    notes: String(log.details || log.notes || ''),
    entries: Array.isArray(log.entries) ? log.entries : [],
    raw_data: log,
    updated_at: String(log.date || new Date().toISOString())
  });
}

// Ribbon Cutting Entries
export async function saveRibbonEntryToSupabase(r: any): Promise<boolean> {
  return upsertToSupabase('ribbon_cutting_entries', {
    id: String(r.id),
    date: String(r.date || ''),
    shift: String(r.shift || ''),
    machine: String(r.machine || ''),
    operator: String(r.operator || ''),
    net_weight: Number(r.netWeight) || 0,
    scrap: Number(r.scrap) || 0,
    stops: Array.isArray(r.stops) ? r.stops : [],
    raw_data: r,
    updated_at: r.updatedAt || new Date().toISOString()
  });
}

export async function saveRibbonEntriesBatchToSupabase(entries: any[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !entries || entries.length === 0) return true;
  try {
    const rows = entries.map((r) => ({
      id: String(r.id),
      date: String(r.date || ''),
      shift: String(r.shift || ''),
      machine: String(r.machine || ''),
      operator: String(r.operator || ''),
      net_weight: Number(r.netWeight) || 0,
      scrap: Number(r.scrap) || 0,
      stops: Array.isArray(r.stops) ? r.stops : [],
      raw_data: r,
      updated_at: r.updatedAt || new Date().toISOString()
    }));
    for (let i = 0; i < rows.length; i += 100) {
      await client.from('ribbon_cutting_entries').upsert(rows.slice(i, i + 100), { onConflict: 'id' });
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] Erro ao salvar corte de fita em lote:', err?.message);
    return false;
  }
}

export async function deleteRibbonEntryFromSupabase(id: string): Promise<boolean> {
  return deleteFromSupabase('ribbon_cutting_entries', id);
}

export async function deleteRibbonEntriesBatchFromSupabase(ids: string[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !ids || ids.length === 0) return true;
  try {
    for (let i = 0; i < ids.length; i += 100) {
      await client.from('ribbon_cutting_entries').delete().in('id', ids.slice(i, i + 100));
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] Erro ao excluir corte de fita em lote:', err?.message);
    return false;
  }
}

// System Users (stored cleanly in `system_users` table packing metadata inside `permissions.__userMeta`)
export function mapSupabaseRowToSystemUser(row: any): any {
  if (!row) return null;
  const rawPerms = row.permissions && typeof row.permissions === 'object' ? { ...row.permissions } : {};
  const meta = rawPerms.__userMeta && typeof rawPerms.__userMeta === 'object' ? rawPerms.__userMeta : {};
  delete rawPerms.__userMeta;

  return {
    id: row.id,
    name: row.name || meta.name || '',
    registration: meta.registration || (row.email ? String(row.email).replace(/@user\.local$/, '') : ''),
    role: row.role || 'Operador',
    password: meta.password || '',
    isFirstAccess: meta.isFirstAccess !== undefined ? !!meta.isFirstAccess : false,
    biometricId: meta.biometricId,
    passwordChangedAt: meta.passwordChangedAt,
    permissions: rawPerms
  };
}

export async function fetchSystemUsersFromSupabase(): Promise<any[]> {
  const rows = await fetchAllFromSupabase('system_users', 'name', true);
  return rows.map(mapSupabaseRowToSystemUser).filter(Boolean);
}

export async function saveSystemUserToSupabase(user: any): Promise<boolean> {
  if (!user || !user.id) return false;
  const cleanPerms = { ...(user.permissions || {}) };
  delete (cleanPerms as any).__userMeta;

  const reg = String(user.registration || '').trim();
  const safeEmail = `${reg || user.id}_${user.id}@user.local`;

  return upsertToSupabase('system_users', {
    id: String(user.id),
    email: safeEmail,
    name: String(user.name || ''),
    role: String(user.role || 'Operador'),
    permissions: {
      ...cleanPerms,
      __userMeta: {
        registration: reg,
        password: user.password || '',
        isFirstAccess: !!user.isFirstAccess,
        biometricId: user.biometricId || null,
        passwordChangedAt: user.passwordChangedAt || null
      }
    },
    is_active: true,
    updated_at: new Date().toISOString()
  });
}

export async function deleteSystemUserFromSupabase(id: string): Promise<boolean> {
  return deleteFromSupabase('system_users', id);
}

// Maintenance Requests (`maintenance_requests` table)
export async function fetchMaintenanceIssuesFromSupabase(): Promise<any[]> {
  const rows = await fetchAllFromSupabase('maintenance_requests', 'created_at', false);
  return rows.map((row: any) => {
    if (row.raw_data && typeof row.raw_data === 'object' && Object.keys(row.raw_data).length > 0) {
      return { ...row.raw_data, id: row.id };
    }
    return {
      id: row.id,
      machine: row.machine || 'Geral / Nenhuma',
      cause: row.description || '',
      priority: row.priority || 'Média',
      status: row.status || 'Pendente',
      reporter: row.requester || 'Operador',
      sector: 'Geral',
      createdAt: row.created_at || new Date().toISOString()
    };
  });
}

export async function saveMaintenanceIssueToSupabase(issue: any): Promise<boolean> {
  const id = String(issue.id || generateSupabaseId('maint'));
  const fullIssue = { ...issue, id };
  return upsertToSupabase('maintenance_requests', {
    id,
    machine: String(fullIssue.machine || ''),
    description: String(fullIssue.cause || fullIssue.description || ''),
    priority: String(fullIssue.priority || 'Média'),
    status: String(fullIssue.status || 'Pendente'),
    requester: String(fullIssue.reporter || fullIssue.requester || ''),
    raw_data: fullIssue,
    updated_at: new Date().toISOString()
  });
}

export async function updateMaintenanceIssueInSupabase(id: string, partial: Record<string, any>): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !id) return false;
  try {
    const { data } = await client.from('maintenance_requests').select('*').eq('id', id).maybeSingle();
    const existingRaw = (data?.raw_data && typeof data.raw_data === 'object') ? data.raw_data : {};
    const merged = { ...existingRaw, ...partial, id };
    return saveMaintenanceIssueToSupabase(merged);
  } catch (err: any) {
    console.warn('[Supabase] Erro ao atualizar maintenance_requests:', err?.message);
    return false;
  }
}

export async function deleteMaintenanceIssueFromSupabase(id: string): Promise<boolean> {
  return deleteFromSupabase('maintenance_requests', id);
}

// Company Notices (`company_notices`)
export async function saveCompanyNoticeToSupabase(notice: any): Promise<boolean> {
  return upsertToSupabase('company_notices', {
    id: String(notice.id),
    title: String(notice.title || ''),
    content: String(notice.content || notice.message || ''),
    author: String(notice.author || ''),
    priority: String(notice.priority || 'normal'),
    date: String(notice.date || notice.createdAt || ''),
    is_active: notice.isActive !== undefined ? !!notice.isActive : true,
    raw_data: notice,
    updated_at: new Date().toISOString()
  });
}

export async function deleteCompanyNoticeFromSupabase(id: string): Promise<boolean> {
  return deleteFromSupabase('company_notices', id);
}

// Operator Penalties (`operator_penalties`) - NO updated_at column in schema
export async function saveOperatorPenaltyToSupabase(pen: any): Promise<boolean> {
  return upsertToSupabase('operator_penalties', {
    id: String(pen.id),
    operator_name: String(pen.operatorName || ''),
    reason: String(pen.reason || ''),
    severity: String(pen.severity || 'Leve'),
    date: String(pen.date || ''),
    notes: String(pen.notes || ''),
    raw_data: pen
  });
}

export async function deleteOperatorPenaltyFromSupabase(id: string): Promise<boolean> {
  return deleteFromSupabase('operator_penalties', id);
}

// Stock Entries (`stock_entries`) - NO updated_at column in schema
export async function saveStockEntryToSupabase(entry: any): Promise<boolean> {
  return upsertToSupabase('stock_entries', {
    id: String(entry.id),
    material: String(entry.material || 'Estoque Diário'),
    quantity: Number(entry.quantity) || 0,
    unit: String(entry.unit || 'kg'),
    date: String(entry.date || entry.id || ''),
    user_id: String(entry.userId || ''),
    raw_data: entry
  });
}

export async function deleteStockEntryFromSupabase(id: string): Promise<boolean> {
  return deleteFromSupabase('stock_entries', id);
}

// Training Records & Operator Training Sheets
export async function saveTrainingRecordToSupabase(rec: any): Promise<boolean> {
  return upsertToSupabase('training_records', {
    id: String(rec.id),
    operator_name: String(rec.operator || ''),
    module_id: String(rec.moduleId || ''),
    status: String(rec.status || 'Pendente'),
    score: Number(rec.score) || 0,
    instructor: String(rec.instructor || ''),
    participants: Array.isArray(rec.participants) ? rec.participants : [],
    raw_data: rec,
    updated_at: rec.updatedAt || new Date().toISOString()
  });
}

export async function deleteTrainingRecordFromSupabase(id: string): Promise<boolean> {
  return deleteFromSupabase('training_records', id);
}

export async function saveOperatorTrainingSheetToSupabase(sheet: any): Promise<boolean> {
  return upsertToSupabase('operator_training_sheets', {
    id: String(sheet.id),
    operator_name: String(sheet.operatorName || ''),
    sector: String(sheet.sector || 'Extrusão'),
    machine: String(sheet.machine || ''),
    modules: Array.isArray(sheet.modules) ? sheet.modules : [],
    last_updated: String(sheet.lastUpdated || ''),
    raw_data: sheet,
    updated_at: sheet.updatedAt || new Date().toISOString()
  });
}

export async function deleteOperatorTrainingSheetFromSupabase(id: string): Promise<boolean> {
  return deleteFromSupabase('operator_training_sheets', id);
}

// Custom Sectors (`custom_sectors`) - NO updated_at column in schema
export async function saveCustomSectorToSupabase(sector: any): Promise<boolean> {
  return upsertToSupabase('custom_sectors', {
    id: String(sector.id),
    name: String(sector.name || ''),
    machines: Array.isArray(sector.machines) ? sector.machines : [],
    roles: Array.isArray(sector.roles) ? sector.roles : [],
    raw_data: sector
  });
}

export async function deleteCustomSectorFromSupabase(id: string): Promise<boolean> {
  return deleteFromSupabase('custom_sectors', id);
}

// Lunch Schedules (`lunch_schedules`) - NO updated_at column in schema
export async function saveLunchScheduleToSupabase(alloc: any): Promise<boolean> {
  return upsertToSupabase('lunch_schedules', {
    id: String(alloc.id),
    date: String(alloc.dayOfWeek || alloc.date || ''),
    shift: String(alloc.shift || ''),
    sector: String(alloc.sector || ''),
    schedule: Array.isArray(alloc.employeeIds) ? alloc.employeeIds : (Array.isArray(alloc.schedule) ? alloc.schedule : []),
    raw_data: alloc
  });
}

export async function saveLunchSchedulesBatchToSupabase(upserts: any[], deleteIds: string[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    if (deleteIds.length > 0) {
      for (let i = 0; i < deleteIds.length; i += 100) {
        const chunk = deleteIds.slice(i, i + 100);
        await client.from('lunch_schedules').delete().in('id', chunk);
      }
    }
    if (upserts.length > 0) {
      const rows = upserts.map(alloc => ({
        id: String(alloc.id),
        date: String(alloc.dayOfWeek || alloc.date || ''),
        shift: String(alloc.shift || ''),
        sector: String(alloc.sector || ''),
        schedule: Array.isArray(alloc.employeeIds) ? alloc.employeeIds : (Array.isArray(alloc.schedule) ? alloc.schedule : []),
        raw_data: alloc
      }));
      for (let i = 0; i < rows.length; i += 100) {
        const chunk = rows.slice(i, i + 100);
        await client.from('lunch_schedules').upsert(chunk, { onConflict: 'id' });
      }
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] Erro em lote lunch_schedules:', err?.message);
    return false;
  }
}

export async function deleteLunchScheduleFromSupabase(id: string): Promise<boolean> {
  return deleteFromSupabase('lunch_schedules', id);
}

// Overtime Entries (`overtime_entries`) - NO updated_at column in schema
export async function saveOvertimeEntryToSupabase(entry: any): Promise<boolean> {
  const id = String(entry.id || generateSupabaseId('ot'));
  const full = { ...entry, id };
  return upsertToSupabase('overtime_entries', {
    id,
    date: String(full.date || ''),
    collaborator_name: String(full.employeeName || full.collaboratorName || ''),
    hours: Number(full.overtimeHours !== undefined ? full.overtimeHours : full.hours) || 0,
    reason: String(full.reason || ''),
    sector: String(full.sector || ''),
    shift: String(full.shift || ''),
    raw_data: full
  });
}

export async function deleteOvertimeEntryFromSupabase(id: string): Promise<boolean> {
  return deleteFromSupabase('overtime_entries', id);
}

// Overtime Requests (`overtime_requests`) - NO updated_at column in schema
export async function saveOvertimeRequestToSupabase(req: any): Promise<boolean> {
  const id = String(req.id || generateSupabaseId('otreq'));
  const full = { ...req, id };
  return upsertToSupabase('overtime_requests', {
    id,
    date: String(full.date || ''),
    requested_by: String(full.requesterName || full.requestedBy || ''),
    status: String(full.approvalStatus || full.status || 'Pendente'),
    details: full,
    raw_data: full
  });
}

export async function deleteOvertimeRequestFromSupabase(id: string): Promise<boolean> {
  return deleteFromSupabase('overtime_requests', id);
}

// Reasons Library (`reasons_library` - holds reasons_library, overtime_reasons, quick_loss_reasons, quick_downtime_reasons)
export async function fetchReasonsByCategoryFromSupabase(category: string): Promise<Array<{ id: string; reason: string; category: string }>> {
  const client = getSupabaseClient();
  if (!client || !category) return [];
  try {
    const { data, error } = await client
      .from('reasons_library')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn(`[Supabase] Erro ao buscar reasons_library (${category}):`, error.message);
      return [];
    }
    return (data || []).map((r: any) => ({
      id: r.id,
      reason: String(r.reason || '').trim(),
      category: String(r.category || category)
    })).filter((r: any) => r.reason.length > 0);
  } catch (err: any) {
    console.warn(`[Supabase] Exceção ao buscar reasons_library (${category}):`, err?.message);
    return [];
  }
}

export async function saveReasonToSupabase(category: string, reasonText: string, sector = 'Extrusão'): Promise<string | null> {
  const trimmed = reasonText.trim();
  if (!trimmed || !category) return null;
  const slug = `${category}_${trimmed}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_').slice(0, 80);
  const ok = await upsertToSupabase('reasons_library', {
    id: slug,
    category,
    reason: trimmed,
    sector
  });
  return ok ? slug : null;
}

export async function deleteReasonFromSupabase(id: string): Promise<boolean> {
  return deleteFromSupabase('reasons_library', id);
}

// Audit Trail (`audit_trail`)
export async function fetchAuditLogsFromSupabase(maxEntries = 150): Promise<any[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('audit_trail')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(maxEntries);

    if (error) {
      console.warn('[Supabase] Erro ao ler audit_trail:', error.message);
      return [];
    }
    return (data || []).map((row: any) => {
      if (row.new_state && typeof row.new_state === 'object' && row.new_state.id) {
        return row.new_state;
      }
      return {
        id: row.id,
        timestamp: row.timestamp,
        userId: row.user_id || 'system',
        userName: row.user_name || 'Sistema',
        userRole: row.user_role || 'Operador',
        action: row.action,
        module: row.module,
        targetId: row.target_id,
        targetTitle: row.target_title,
        diff: row.old_state?.diff || [],
        reason: row.old_state?.reason,
        metadata: row.old_state?.metadata
      };
    });
  } catch (err: any) {
    console.warn('[Supabase] Exceção ao ler audit_trail:', err?.message);
    return [];
  }
}

export async function saveAuditLogToSupabase(entry: any): Promise<boolean> {
  return upsertToSupabase('audit_trail', {
    id: String(entry.id),
    action: String(entry.action || 'UPDATE'),
    module: String(entry.module || ''),
    target_title: String(entry.targetTitle || ''),
    target_id: String(entry.targetId || ''),
    user_name: String(entry.userName || ''),
    user_id: String(entry.userId || 'system'),
    user_role: String(entry.userRole || 'Operador'),
    timestamp: entry.timestamp || new Date().toISOString(),
    old_state: { diff: entry.diff || [], reason: entry.reason || null, metadata: entry.metadata || null },
    new_state: entry
  });
}

// Generic helper for optional collections (tries dedicated table if created, falls back cleanly to `settings` KV store)
export async function fetchCollectionSmartFromSupabase<T = any>(tableName: string): Promise<T[]> {
  if (KV_ONLY_COLLECTIONS.has(tableName) || missingOptionalTables.has(tableName)) {
    return fetchKvCollectionFromSupabase<T>(tableName);
  }
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client.from(tableName).select('*');
    if (error) {
      if (isTableNotFoundError(error)) {
        missingOptionalTables.add(tableName);
        return fetchKvCollectionFromSupabase<T>(tableName);
      }
      console.warn(`[Supabase] Erro ao listar ${tableName}:`, error.message);
      return [];
    }
    return (data || []).map((row: any) => mapRawRow<T>(row));
  } catch {
    return fetchKvCollectionFromSupabase<T>(tableName);
  }
}

export async function upsertCollectionItemSmartToSupabase<T extends { id: string }>(
  tableName: string,
  item: T,
  maxItems = 500
): Promise<boolean> {
  const effectiveMax = tableName === 'user_activity_logs'
    ? Math.min(maxItems, 80)
    : tableName === 'access_logs'
      ? Math.min(maxItems, 150)
      : maxItems;

  if (!KV_ONLY_COLLECTIONS.has(tableName) && !missingOptionalTables.has(tableName)) {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from(tableName).upsert({ id: item.id, raw_data: item }, { onConflict: 'id' });
      if (!error) return true;
      if (isTableNotFoundError(error)) {
        missingOptionalTables.add(tableName);
      }
    }
  }
  const current = await fetchKvCollectionFromSupabase<T>(tableName);
  const next = [item, ...current.filter((x) => x.id !== item.id)].slice(0, effectiveMax);
  return saveKvCollectionToSupabase(tableName, next);
}

export async function deleteCollectionItemSmartFromSupabase(tableName: string, id: string): Promise<boolean> {
  if (!KV_ONLY_COLLECTIONS.has(tableName) && !missingOptionalTables.has(tableName)) {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from(tableName).delete().eq('id', id);
      if (!error) return true;
      if (isTableNotFoundError(error)) {
        missingOptionalTables.add(tableName);
      }
    }
  }
  const current = await fetchKvCollectionFromSupabase<{ id: string }>(tableName);
  const next = current.filter((x) => x.id !== id);
  return saveKvCollectionToSupabase(tableName, next);
}

// Unified Realtime Channel Subscription for any set of Supabase tables
export function subscribeSupabaseTableChanges(
  channelName: string,
  tables: string[],
  onChange: (table: string, payload: any) => void
): (() => void) | null {
  const client = getSupabaseClient();
  if (!client || tables.length === 0) return null;

  try {
    let channel: RealtimeChannel = client.channel(channelName);
    tables.forEach((tbl) => {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tbl },
        (payload) => onChange(tbl, payload)
      );
    });
    channel.subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn(`[Supabase Realtime] Erro ao assinar canal ${channelName}:`, err);
    return null;
  }
}

export async function seedInitialDataToSupabase(data: {
  productionEntries?: any[];
  employees?: any[];
  logs?: any[];
  operators?: string[];
  roles?: string[];
  goals?: Record<string, number>;
}): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    if (Array.isArray(data.productionEntries) && data.productionEntries.length > 0) {
      const rows = data.productionEntries.map(mapProductionEntryToSupabaseRow);
      for (let i = 0; i < rows.length; i += 100) {
        await client.from('production_entries').upsert(rows.slice(i, i + 100), { onConflict: 'id' });
      }
    }
    if (Array.isArray(data.employees) && data.employees.length > 0) {
      const rows = data.employees.map((emp) => ({
        id: String(emp.id),
        name: String(emp.name || ''),
        role: String(emp.role || ''),
        sector: String(emp.sector || 'Extrusão'),
        machine: String(emp.machine || ''),
        shift: String(emp.shift || ''),
        status: String(emp.status || 'Ativo'),
        collaborator_id: String(emp.collaboratorId || ''),
        raw_data: emp,
        updated_at: emp.updatedAt || new Date().toISOString()
      }));
      for (let i = 0; i < rows.length; i += 100) {
        await client.from('employees').upsert(rows.slice(i, i + 100), { onConflict: 'id' });
      }
    }
    if (Array.isArray(data.logs) && data.logs.length > 0) {
      const rows = data.logs.map((log) => ({
        id: String(log.id),
        date: String(log.date || new Date().toISOString()),
        shift: String(log.shift || ''),
        sector: String(log.sector || ''),
        notes: String(log.details || log.notes || ''),
        entries: Array.isArray(log.entries) ? log.entries : [],
        raw_data: log,
        updated_at: String(log.date || new Date().toISOString())
      }));
      for (let i = 0; i < rows.length; i += 100) {
        await client.from('personnel_logs').upsert(rows.slice(i, i + 100), { onConflict: 'id' });
      }
    }
    await mergeSettingsInSupabase('global', {
      operators: data.operators,
      availableRoles: data.roles,
      goals: data.goals,
      lastSynced: new Date().toISOString()
    });
    return true;
  } catch (err: any) {
    console.warn('[Supabase] Erro ao semear dados iniciais:', err?.message);
    return false;
  }
}

