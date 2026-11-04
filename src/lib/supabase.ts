import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
    // Tenta uma consulta simples na tabela production_entries ou settings
    const { error } = await client.from('production_entries').select('id').limit(1);
    const latency = Date.now() - start;

    if (error) {
      // Se a tabela ainda não foi criada via SQL Editor
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

// Map helper: Transforma objeto ProductionEntry do app para formato de coluna no Postgres
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
  // Se possuir raw_data completo, mescla com as colunas mapeadas
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
    isNoWorkDay: !!row.is_no_work_day,
    isMaintenanceEntry: !!row.is_maintenance_entry,
    userId: row.user_id || base.userId || 'system',
    updatedAt: row.updated_at || base.updatedAt || new Date().toISOString()
  };
}

// Operações de CRUD unificadas no Supabase
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

export async function fetchAllProductionFromSupabase(): Promise<any[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const pageSize = 1000;
    let from = 0;
    let allRows: any[] = [];
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await client
        .from('production_entries')
        .select('*')
        .order('date', { ascending: false })
        .range(from, from + pageSize - 1);

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

    return allRows.map(mapSupabaseRowToProductionEntry);
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

// ==========================================
// OPERAÇÕES GLOBAIS DE ENTIDADES NO SUPABASE
// ==========================================

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

export async function fetchAllFromSupabase(table: string, orderBy: string = 'id', ascending: boolean = true): Promise<any[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client.from(table).select('*').order(orderBy, { ascending });
    if (error) {
      console.warn(`[Supabase] Erro ao buscar de ${table}:`, error.message);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.warn(`[Supabase] Exceção ao buscar de ${table}:`, err?.message);
    return [];
  }
}

// Helpers específicos para sincronização direta
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

export async function deleteEmployeeFromSupabase(id: string): Promise<boolean> {
  return deleteFromSupabase('employees', id);
}

export async function saveSettingsToSupabase(key: string, data: any): Promise<boolean> {
  return upsertToSupabase('settings', {
    id: key,
    key,
    data,
    updated_at: new Date().toISOString()
  });
}

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

export async function deleteVacationFromSupabase(id: string): Promise<boolean> {
  return deleteFromSupabase('vacations', id);
}

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

export async function deleteRibbonEntryFromSupabase(id: string): Promise<boolean> {
  return deleteFromSupabase('ribbon_cutting_entries', id);
}


