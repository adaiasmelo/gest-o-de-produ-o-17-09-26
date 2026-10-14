import { 
  getSupabaseClient, 
  mapProductionEntryToSupabaseRow, 
  mapSupabaseRowToProductionEntry,
  isSupabaseConfigured 
} from '../lib/supabase';
import { ProductionEntry } from '../types';

export interface MigrationProgress {
  currentStep: string;
  totalRecords: number;
  processedRecords: number;
  percentage: number;
  errors: string[];
  isComplete: boolean;
}

/**
 * Escuta alterações em tempo real no Supabase na tabela de produção
 */
export function subscribeToSupabaseProduction(
  onInsertOrUpdate: (entry: ProductionEntry) => void,
  onDelete: (id: string) => void
): (() => void) | null {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const channel = client
      .channel('realtime_production_entries')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'production_entries' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const entry = mapSupabaseRowToProductionEntry(payload.new);
            if (entry) {
              onInsertOrUpdate(entry as ProductionEntry);
            }
          } else if (payload.eventType === 'DELETE') {
            if (payload.old && payload.old.id) {
              onDelete(payload.old.id);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Supabase Realtime] Conectado e escutando tabela production_entries');
        }
      });

    return () => {
      client.removeChannel(channel);
    };
  } catch (err) {
    console.warn('Erro ao assinar Realtime no Supabase:', err);
    return null;
  }
}

/**
 * Migra em lote todos os dados do sistema para o Supabase
 */
export async function migrateAllDataToSupabase(
  data: {
    productionEntries?: any[];
    employees?: any[];
    collaborators?: any[];
    shifts?: any[];
    personnelLogs?: any[];
    settings?: {
      global?: any;
      training_template?: any;
      goals?: any;
    };
    companyNotices?: any[];
    lunchSchedules?: any[];
    maintenanceRequests?: any[];
    trainingRecords?: any[];
    operatorTrainingSheets?: any[];
    operatorPenalties?: any[];
    ribbonEntries?: any[];
  },
  onProgress?: (progress: MigrationProgress) => void
): Promise<{ success: boolean; totalUploaded: number; errors: string[] }> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase não configurado. Forneça URL e Chave Anônima antes de iniciar.');
  }

  const errors: string[] = [];
  let totalUploaded = 0;

  const totalItems = 
    (data.productionEntries?.length || 0) +
    (data.employees?.length || 0) +
    (data.collaborators?.length || 0) +
    (data.shifts?.length || 0) +
    (data.personnelLogs?.length || 0) +
    (data.companyNotices?.length || 0) +
    (data.lunchSchedules?.length || 0) +
    (data.maintenanceRequests?.length || 0) +
    (data.trainingRecords?.length || 0) +
    (data.operatorTrainingSheets?.length || 0) +
    (data.operatorPenalties?.length || 0) +
    (data.ribbonEntries?.length || 0) + 3; // +3 para settings

  let processed = 0;

  const updateProgress = (step: string) => {
    processed++;
    if (onProgress) {
      onProgress({
        currentStep: step,
        totalRecords: totalItems,
        processedRecords: Math.min(processed, totalItems),
        percentage: totalItems > 0 ? Math.round((Math.min(processed, totalItems) / totalItems) * 100) : 100,
        errors: [...errors],
        isComplete: false
      });
    }
  };

  // Helper para upload em blocos de até 50 registros
  async function batchUpsert(tableName: string, rows: any[]) {
    if (!rows || rows.length === 0) return;
    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      try {
        const { error } = await client!.from(tableName).upsert(chunk, { onConflict: 'id' });
        if (error) {
          errors.push(`Erro na tabela ${tableName} (bloco ${i}-${i + chunk.length}): ${error.message}`);
        } else {
          totalUploaded += chunk.length;
        }
      } catch (err: any) {
        errors.push(`Exceção na tabela ${tableName}: ${err?.message}`);
      }
      processed += chunk.length;
      updateProgress(`Enviando para ${tableName} (${Math.min(i + chunkSize, rows.length)}/${rows.length})`);
    }
  }

  try {
    // 1. Lançamentos de Produção (Extrusão)
    if (data.productionEntries && data.productionEntries.length > 0) {
      const rows = data.productionEntries.map(mapProductionEntryToSupabaseRow);
      await batchUpsert('production_entries', rows);
    }

    // 2. Alocações (Employees)
    if (data.employees && data.employees.length > 0) {
      const rows = data.employees.map(emp => ({
        id: String(emp.id),
        name: String(emp.name || ''),
        role: String(emp.role || ''),
        sector: String(emp.sector || 'Extrusão'),
        machine: String(emp.machine || ''),
        shift: String(emp.shift || ''),
        status: String(emp.status || 'Ativo'),
        collaborator_id: String(emp.collaboratorId || ''),
        raw_data: emp
      }));
      await batchUpsert('employees', rows);
    }

    // 3. Colaboradores (Collaborators)
    if (data.collaborators && data.collaborators.length > 0) {
      const rows = data.collaborators.map(c => ({
        id: String(c.id),
        name: String(c.name || ''),
        registration: String(c.registration || ''),
        role: String(c.role || ''),
        sector: String(c.sector || 'Extrusão'),
        shift: String(c.shift || ''),
        machine: String(c.machine || ''),
        status: String(c.status || 'Ativo'),
        is_silenced: !!c.isSilenced,
        silence_reason: String(c.silenceReason || ''),
        raw_data: c
      }));
      await batchUpsert('collaborators', rows);
    }

    // 4. Turnos (Shifts)
    if (data.shifts && data.shifts.length > 0) {
      const rows = data.shifts.map(s => ({
        id: String(s.id),
        date: String(s.date || ''),
        shift: String(s.shift || ''),
        sector: String(s.sector || 'Extrusão'),
        operator: String(s.operator || ''),
        machine: String(s.machine || ''),
        net_weight: Number(s.netWeight) || 0,
        scrap: Number(s.scrap) || 0,
        raw_data: s
      }));
      await batchUpsert('shifts', rows);
    }

    // 5. Diário de Pessoal (Personnel Logs)
    if (data.personnelLogs && data.personnelLogs.length > 0) {
      const rows = data.personnelLogs.map(log => ({
        id: String(log.id),
        date: String(log.date || ''),
        shift: String(log.shift || ''),
        sector: String(log.sector || ''),
        notes: String(log.notes || ''),
        entries: Array.isArray(log.entries) ? log.entries : [],
        raw_data: log
      }));
      await batchUpsert('personnel_logs', rows);
    }

    // 6. Configurações Globais (Settings)
    if (data.settings?.global) {
      await client.from('settings').upsert({
        id: 'global',
        key: 'global',
        data: data.settings.global,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      totalUploaded++;
    }
    if (data.settings?.training_template) {
      await client.from('settings').upsert({
        id: 'training_template',
        key: 'training_template',
        data: data.settings.training_template,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      totalUploaded++;
    }

    // 7. Fitas / Refilamento (Ribbon)
    if (data.ribbonEntries && data.ribbonEntries.length > 0) {
      const rows = data.ribbonEntries.map(r => ({
        id: String(r.id),
        date: String(r.date || ''),
        shift: String(r.shift || ''),
        machine: String(r.machine || ''),
        operator: String(r.operator || ''),
        net_weight: Number(r.netWeight) || 0,
        scrap: Number(r.scrap) || 0,
        stops: Array.isArray(r.stops) ? r.stops : [],
        raw_data: r
      }));
      await batchUpsert('ribbon_cutting_entries', rows);
    }

    // 8. Solicitações de Manutenção
    if (data.maintenanceRequests && data.maintenanceRequests.length > 0) {
      const rows = data.maintenanceRequests.map(m => ({
        id: String(m.id),
        machine: String(m.machine || ''),
        description: String(m.description || ''),
        priority: String(m.priority || 'Média'),
        status: String(m.status || 'Pendente'),
        requester: String(m.requester || ''),
        raw_data: m
      }));
      await batchUpsert('maintenance_requests', rows);
    }

    // 9. Treinamentos e Avaliações
    if (data.trainingRecords && data.trainingRecords.length > 0) {
      const rows = data.trainingRecords.map(t => ({
        id: String(t.id),
        operator_name: String(t.operator || ''),
        module_id: String(t.moduleId || ''),
        status: String(t.status || 'Pendente'),
        score: Number(t.score) || 0,
        instructor: String(t.instructor || ''),
        participants: Array.isArray(t.participants) ? t.participants : [],
        raw_data: t
      }));
      await batchUpsert('training_records', rows);
    }

    if (data.operatorTrainingSheets && data.operatorTrainingSheets.length > 0) {
      const rows = data.operatorTrainingSheets.map(s => ({
        id: String(s.id),
        operator_name: String(s.operatorName || ''),
        sector: String(s.sector || 'Extrusão'),
        machine: String(s.machine || ''),
        modules: Array.isArray(s.modules) ? s.modules : [],
        last_updated: String(s.lastUpdated || ''),
        raw_data: s
      }));
      await batchUpsert('operator_training_sheets', rows);
    }

    if (onProgress) {
      onProgress({
        currentStep: 'Migração concluída com sucesso!',
        totalRecords: totalItems,
        processedRecords: totalItems,
        percentage: 100,
        errors: [...errors],
        isComplete: true
      });
    }

    return {
      success: errors.length === 0,
      totalUploaded,
      errors
    };
  } catch (err: any) {
    errors.push(`Erro fatal durante migração: ${err?.message}`);
    return {
      success: false,
      totalUploaded,
      errors
    };
  }
}
