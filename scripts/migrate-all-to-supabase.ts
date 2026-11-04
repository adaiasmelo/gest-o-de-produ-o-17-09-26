import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load Firebase Config
const firebaseConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || 'ai-studio-f0309e5c-c262-4bce-92fb-80bc63dce14b');

// Supabase credentials
const supabaseUrl = 'https://xhhfaryqenjpqkffhbnr.supabase.co';
const supabaseKey = 'sb_publishable_uq5OUxiaTB-zXBfzthVyhw_n2S5nNmy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function batchUpsert(tableName: string, rows: any[]) {
  if (!rows || rows.length === 0) return 0;
  const chunkSize = 50;
  let successCount = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(tableName).upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.error(`Erro ao fazer upsert na tabela ${tableName} (bloco ${i}-${i + chunk.length}):`, error.message);
    } else {
      successCount += chunk.length;
    }
  }
  return successCount;
}

async function runMigration() {
  console.log('=== INICIANDO MIGRAÇÃO TOTAL FIRESTORE -> SUPABASE ===\n');

  // 1. Collaborators
  console.log('1. Migrando collaborators...');
  const colSnap = await getDocs(collection(db, 'collaborators'));
  const colRows = colSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name || '',
      registration: data.registration || '',
      role: data.role || 'Auxiliar de Produção',
      sector: data.sector || 'Extrusão',
      shift: data.shift || '',
      machine: data.machine || '',
      status: data.status || 'Ativo',
      is_silenced: !!data.isSilenced,
      silence_reason: data.silenceReason || '',
      raw_data: { ...data, id: d.id },
      updated_at: data.updatedAt || new Date().toISOString()
    };
  }).filter(c => c.registration && c.registration.trim().length > 0);
  const colCount = await batchUpsert('collaborators', colRows);
  console.log(`   -> ${colCount}/${colRows.length} colaboradores migrados.`);

  // 2. Employees (alocações)
  console.log('2. Migrando employees...');
  const empSnap = await getDocs(collection(db, 'employees'));
  const empRows = empSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name || '',
      role: data.role || '',
      sector: data.sector || 'Extrusão',
      machine: data.machine || '',
      shift: data.shift || '',
      status: data.status || 'Ativo',
      collaborator_id: data.collaboratorId || '',
      raw_data: { ...data, id: d.id },
      updated_at: data.updatedAt || new Date().toISOString()
    };
  });
  const empCount = await batchUpsert('employees', empRows);
  console.log(`   -> ${empCount}/${empRows.length} employees migrados.`);

  // 3. Shifts
  console.log('3. Migrando shifts...');
  const shiftSnap = await getDocs(collection(db, 'shifts'));
  const shiftRows = shiftSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      date: data.date || '',
      shift: data.shift || data.name || '',
      sector: data.sector || 'Extrusão',
      operator: data.operator || '',
      machine: data.machine || '',
      net_weight: Number(data.netWeight) || 0,
      scrap: Number(data.scrap) || 0,
      raw_data: { ...data, id: d.id },
      updated_at: data.updatedAt || new Date().toISOString()
    };
  });
  const shiftCount = await batchUpsert('shifts', shiftRows);
  console.log(`   -> ${shiftCount}/${shiftRows.length} shifts migrados.`);

  // 4. Personnel Logs
  console.log('4. Migrando personnelLogs...');
  const logSnap = await getDocs(collection(db, 'personnelLogs'));
  const logRows = logSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      date: data.date || '',
      shift: data.shift || '',
      sector: data.sector || '',
      notes: data.details || data.notes || '',
      entries: Array.isArray(data.entries) ? data.entries : [],
      raw_data: { ...data, id: d.id },
      updated_at: data.date || new Date().toISOString()
    };
  });
  const logCount = await batchUpsert('personnel_logs', logRows);
  console.log(`   -> ${logCount}/${logRows.length} personnel_logs migrados.`);

  // 5. Vacations
  console.log('5. Migrando vacations...');
  const vacSnap = await getDocs(collection(db, 'vacations'));
  const vacRows = vacSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      employee_id: data.employeeId || data.registration || '',
      employee_name: data.employeeName || data.name || '',
      start_date: data.startDate || '',
      end_date: data.endDate || '',
      status: data.status || 'Programado',
      raw_data: { ...data, id: d.id },
      updated_at: data.updatedAt || new Date().toISOString()
    };
  });
  const vacCount = await batchUpsert('vacations', vacRows);
  console.log(`   -> ${vacCount}/${vacRows.length} vacations migrados.`);

  // 6. Settings (global and training_template)
  console.log('6. Migrando settings...');
  try {
    const globalDoc = await getDoc(doc(db, 'settings', 'global'));
    if (globalDoc.exists()) {
      await supabase.from('settings').upsert({
        id: 'global',
        key: 'global',
        data: globalDoc.data(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      console.log('   -> settings/global migrado.');
    }
    const templateDoc = await getDoc(doc(db, 'settings', 'training_template'));
    if (templateDoc.exists()) {
      await supabase.from('settings').upsert({
        id: 'training_template',
        key: 'training_template',
        data: templateDoc.data(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });
      console.log('   -> settings/training_template migrado.');
    }
  } catch (err: any) {
    console.warn('Erro ao migrar settings:', err.message);
  }

  // 7. Training Records
  console.log('7. Migrando training_records...');
  const trSnap = await getDocs(collection(db, 'training_records'));
  const trRows = trSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      operator_name: data.operator || '',
      module_id: data.moduleId || '',
      status: data.status || 'Pendente',
      score: Number(data.score) || 0,
      instructor: data.instructor || '',
      participants: Array.isArray(data.participants) ? data.participants : [],
      raw_data: { ...data, id: d.id },
      updated_at: data.updatedAt || new Date().toISOString()
    };
  });
  const trCount = await batchUpsert('training_records', trRows);
  console.log(`   -> ${trCount}/${trRows.length} training_records migrados.`);

  // 8. Operator Training Sheets
  console.log('8. Migrando operator_training_sheets...');
  const otsSnap = await getDocs(collection(db, 'operator_training_sheets'));
  const otsRows = otsSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      operator_name: data.operatorName || '',
      sector: data.sector || 'Extrusão',
      machine: data.machine || '',
      modules: Array.isArray(data.modules) ? data.modules : [],
      last_updated: data.lastUpdated || '',
      raw_data: { ...data, id: d.id },
      updated_at: data.updatedAt || new Date().toISOString()
    };
  });
  const otsCount = await batchUpsert('operator_training_sheets', otsRows);
  console.log(`   -> ${otsCount}/${otsRows.length} operator_training_sheets migrados.`);

  // 9. Operator Penalties
  console.log('9. Migrando operator_penalties...');
  const opSnap = await getDocs(collection(db, 'operator_penalties'));
  const opRows = opSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      operator_name: data.operatorName || '',
      reason: data.reason || '',
      severity: data.severity || 'Leve',
      date: data.date || '',
      notes: data.notes || '',
      raw_data: { ...data, id: d.id }
    };
  });
  const opCount = await batchUpsert('operator_penalties', opRows);
  console.log(`   -> ${opCount}/${opRows.length} operator_penalties migrados.`);

  // 10. Company Notices
  console.log('10. Migrando company_notices...');
  const cnSnap = await getDocs(collection(db, 'company_notices'));
  const cnRows = cnSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      title: data.title || '',
      content: data.content || '',
      author: data.author || '',
      priority: data.priority || 'normal',
      date: data.date || '',
      is_active: data.isActive !== undefined ? !!data.isActive : true,
      raw_data: { ...data, id: d.id }
    };
  });
  const cnCount = await batchUpsert('company_notices', cnRows);
  console.log(`   -> ${cnCount}/${cnRows.length} company_notices migrados.`);

  // 11. Custom Sectors
  console.log('11. Migrando custom_sectors...');
  const csSnap = await getDocs(collection(db, 'custom_sectors'));
  const csRows = csSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name || '',
      machines: Array.isArray(data.machines) ? data.machines : [],
      roles: Array.isArray(data.roles) ? data.roles : [],
      raw_data: { ...data, id: d.id }
    };
  });
  const csCount = await batchUpsert('custom_sectors', csRows);
  console.log(`   -> ${csCount}/${csRows.length} custom_sectors migrados.`);

  // 12. Stock Entries
  console.log('12. Migrando stock_entries...');
  const seSnap = await getDocs(collection(db, 'stock_entries'));
  const seRows = seSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      material: data.material || '',
      quantity: Number(data.quantity) || 0,
      unit: data.unit || 'kg',
      date: data.date || '',
      user_id: data.userId || '',
      raw_data: { ...data, id: d.id }
    };
  });
  const seCount = await batchUpsert('stock_entries', seRows);
  console.log(`   -> ${seCount}/${seRows.length} stock_entries migrados.`);

  // 13. Ribbon Cutting Entries
  console.log('13. Migrando ribbon_cutting_entries...');
  const rceSnap = await getDocs(collection(db, 'ribbon_cutting_entries'));
  const rceRows = rceSnap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      date: data.date || '',
      shift: data.shift || '',
      machine: data.machine || '',
      operator: data.operator || '',
      net_weight: Number(data.netWeight) || 0,
      scrap: Number(data.scrap) || 0,
      stops: Array.isArray(data.stops) ? data.stops : [],
      raw_data: { ...data, id: d.id },
      updated_at: data.updatedAt || new Date().toISOString()
    };
  });
  const rceCount = await batchUpsert('ribbon_cutting_entries', rceRows);
  console.log(`   -> ${rceCount}/${rceRows.length} ribbon_cutting_entries migrados.`);

  // 14. Production Entries
  console.log('14. Verificando/Migrando productionEntries...');
  const prodSnap = await getDocs(collection(db, 'productionEntries'));
  if (prodSnap.docs.length > 0) {
    const prodRows = prodSnap.docs.map(d => {
      const entry = d.data();
      return {
        id: String(d.id),
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
        raw_data: { ...entry, id: d.id }
      };
    });
    const prodCount = await batchUpsert('production_entries', prodRows);
    console.log(`   -> ${prodCount}/${prodRows.length} productionEntries sincronizados com Supabase.`);
  }

  console.log('\n=== MIGRAÇÃO CONCLUÍDA COM SUCESSO! ===');
  process.exit(0);
}

runMigration().catch(err => {
  console.error('Falha crítica na migração:', err);
  process.exit(1);
});
