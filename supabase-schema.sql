-- =========================================================================
-- ESQUEMA COMPLETO DO BANCO DE DADOS SUPABASE (POSTGRESQL)
-- GESTÃO E CONTROLE DE PRODUÇÃO INDUSTRIAL (EXTRUSÃO & REFILAMENTO)
-- =========================================================================
-- Para aplicar:
-- 1. Abra seu painel no Supabase: https://supabase.com/dashboard
-- 2. Selecione seu projeto (ou crie um novo projeto gratuito)
-- 3. No menu lateral, clique em "SQL Editor"
-- 4. Cole todo o conteúdo deste arquivo e clique no botão verde "RUN" (ou "Executar")
-- 5. Pronto! Todas as tabelas, índices, permissões RLS e Realtime estarão ativos.
-- =========================================================================

-- 1. EXTENSÕES ÚTEIS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE LANÇAMENTOS DE PRODUÇÃO (EXTRUSÃO - CAST 1, CAST 2, EREMA)
CREATE TABLE IF NOT EXISTS production_entries (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    machine TEXT NOT NULL,
    shift TEXT NOT NULL,
    operator TEXT NOT NULL,
    assistant TEXT DEFAULT '',
    product TEXT DEFAULT '',
    thickness NUMERIC DEFAULT 0,
    width NUMERIC DEFAULT 0,
    net_weight NUMERIC DEFAULT 0,
    gross_weight NUMERIC DEFAULT 0,
    rolls_count NUMERIC DEFAULT 0,
    scrap_process NUMERIC DEFAULT 0,
    scrap_mechanical NUMERIC DEFAULT 0,
    scrap_purge NUMERIC DEFAULT 0,
    scrap_trim NUMERIC DEFAULT 0,
    total_scrap NUMERIC DEFAULT 0,
    scrap_reasons JSONB DEFAULT '[]'::jsonb,
    stops JSONB DEFAULT '[]'::jsonb,
    notes TEXT DEFAULT '',
    speed NUMERIC DEFAULT 0,
    rpm NUMERIC DEFAULT 0,
    melt_pressure NUMERIC DEFAULT 0,
    melt_temperature NUMERIC DEFAULT 0,
    is_no_work_day BOOLEAN DEFAULT FALSE,
    is_maintenance_entry BOOLEAN DEFAULT FALSE,
    user_id TEXT DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    raw_data JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_prod_entries_date ON production_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_prod_entries_machine ON production_entries(machine);
CREATE INDEX IF NOT EXISTS idx_prod_entries_shift ON production_entries(shift);
CREATE INDEX IF NOT EXISTS idx_prod_entries_operator ON production_entries(operator);

-- 3. TABELA DE TURNOS
CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    shift TEXT NOT NULL,
    sector TEXT DEFAULT 'Extrusão',
    operator TEXT DEFAULT '',
    machine TEXT DEFAULT '',
    net_weight NUMERIC DEFAULT 0,
    scrap NUMERIC DEFAULT 0,
    raw_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date DESC);

-- 4. TABELA DE ALOCAÇÕES DE FUNCIONÁRIOS (EMPLOYEES)
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT DEFAULT '',
    sector TEXT DEFAULT 'Extrusão',
    machine TEXT DEFAULT '',
    shift TEXT DEFAULT '',
    status TEXT DEFAULT 'Ativo',
    collaborator_id TEXT DEFAULT '',
    raw_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

-- 5. TABELA DE COLABORADORES (CADASTRO GERAL & MATRÍCULAS)
CREATE TABLE IF NOT EXISTS collaborators (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    registration TEXT DEFAULT '',
    role TEXT DEFAULT '',
    sector TEXT DEFAULT 'Extrusão',
    shift TEXT DEFAULT '',
    machine TEXT DEFAULT '',
    status TEXT DEFAULT 'Ativo',
    is_silenced BOOLEAN DEFAULT FALSE,
    silence_reason TEXT DEFAULT '',
    raw_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);
CREATE INDEX IF NOT EXISTS idx_collab_name ON collaborators(name);
CREATE INDEX IF NOT EXISTS idx_collab_reg ON collaborators(registration);

-- 6. TABELA DE REGISTROS DE PRESENÇA / DIÁRIO DE PESSOAL (PERSONNEL LOGS)
CREATE TABLE IF NOT EXISTS personnel_logs (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    shift TEXT DEFAULT '',
    sector TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    entries JSONB DEFAULT '[]'::jsonb,
    raw_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);
CREATE INDEX IF NOT EXISTS idx_personnel_logs_date ON personnel_logs(date DESC);

-- 7. TABELA DE USUÁRIOS DO SISTEMA E PERMISSÕES (SYSTEM USERS)
CREATE TABLE IF NOT EXISTS system_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'Operador',
    permissions JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 8. TABELA DE CONFIGURAÇÕES GLOBAIS (SETTINGS)
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE,
    data JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 9. TABELA DE AVISOS E COMUNICADOS INTERNOS (COMPANY NOTICES)
CREATE TABLE IF NOT EXISTS company_notices (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    author TEXT DEFAULT '',
    priority TEXT DEFAULT 'normal',
    date TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    raw_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 10. TABELA DE ESCALA DE ALMOÇO (LUNCH SCHEDULES)
CREATE TABLE IF NOT EXISTS lunch_schedules (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    shift TEXT DEFAULT '',
    sector TEXT DEFAULT '',
    schedule JSONB DEFAULT '[]'::jsonb,
    raw_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 11. TABELA DE SOLICITAÇÕES DE MANUTENÇÃO (MAINTENANCE REQUESTS)
CREATE TABLE IF NOT EXISTS maintenance_requests (
    id TEXT PRIMARY KEY,
    machine TEXT DEFAULT '',
    description TEXT DEFAULT '',
    priority TEXT DEFAULT 'Média',
    status TEXT DEFAULT 'Pendente',
    requester TEXT DEFAULT '',
    raw_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 12. TABELA DE FICHAS DE TREINAMENTO DE OPERADORES (OPERATOR TRAINING SHEETS)
CREATE TABLE IF NOT EXISTS operator_training_sheets (
    id TEXT PRIMARY KEY,
    operator_name TEXT NOT NULL,
    sector TEXT DEFAULT 'Extrusão',
    machine TEXT DEFAULT '',
    modules JSONB DEFAULT '[]'::jsonb,
    last_updated TEXT DEFAULT '',
    raw_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 13. TABELA DE REGISTROS DE TREINAMENTO (TRAINING RECORDS)
CREATE TABLE IF NOT EXISTS training_records (
    id TEXT PRIMARY KEY,
    operator_name TEXT DEFAULT '',
    module_id TEXT DEFAULT '',
    status TEXT DEFAULT 'Pendente',
    score NUMERIC DEFAULT 0,
    instructor TEXT DEFAULT '',
    participants JSONB DEFAULT '[]'::jsonb,
    raw_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 14. TABELA DE ADVERTÊNCIAS / PENALIDADES (OPERATOR PENALTIES)
CREATE TABLE IF NOT EXISTS operator_penalties (
    id TEXT PRIMARY KEY,
    operator_name TEXT NOT NULL,
    reason TEXT DEFAULT '',
    severity TEXT DEFAULT 'Leve',
    date TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    raw_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 15. TABELA DO SETOR DE FITAS / REFILE (RIBBON CUTTING ENTRIES)
CREATE TABLE IF NOT EXISTS ribbon_cutting_entries (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    shift TEXT DEFAULT '',
    machine TEXT DEFAULT '',
    operator TEXT DEFAULT '',
    net_weight NUMERIC DEFAULT 0,
    scrap NUMERIC DEFAULT 0,
    stops JSONB DEFAULT '[]'::jsonb,
    raw_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 16. TABELA DE ENTRADAS DE ESTOQUE (STOCK ENTRIES)
CREATE TABLE IF NOT EXISTS stock_entries (
    id TEXT PRIMARY KEY,
    material TEXT NOT NULL,
    quantity NUMERIC DEFAULT 0,
    unit TEXT DEFAULT 'kg',
    date TEXT DEFAULT '',
    user_id TEXT DEFAULT '',
    raw_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 17. TABELA DE FÉRIAS E AFASTAMENTOS (VACATIONS)
CREATE TABLE IF NOT EXISTS vacations (
    id TEXT PRIMARY KEY,
    employee_id TEXT DEFAULT '',
    employee_name TEXT DEFAULT '',
    start_date TEXT DEFAULT '',
    end_date TEXT DEFAULT '',
    status TEXT DEFAULT 'Programado',
    raw_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 18. TABELA DE SETORES PERSONALIZADOS (CUSTOM SECTORS)
CREATE TABLE IF NOT EXISTS custom_sectors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    machines JSONB DEFAULT '[]'::jsonb,
    roles JSONB DEFAULT '[]'::jsonb,
    raw_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 19. TABELA DE HORAS EXTRAS (OVERTIME)
CREATE TABLE IF NOT EXISTS overtime_entries (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    collaborator_name TEXT NOT NULL,
    hours NUMERIC DEFAULT 0,
    reason TEXT DEFAULT '',
    sector TEXT DEFAULT '',
    shift TEXT DEFAULT '',
    raw_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS overtime_requests (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    requested_by TEXT DEFAULT '',
    status TEXT DEFAULT 'Pendente',
    details JSONB DEFAULT '{}'::jsonb,
    raw_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 20. BIBLIOTECA DE MOTIVOS DE PARADA E PERDA (REASONS LIBRARY)
CREATE TABLE IF NOT EXISTS reasons_library (
    id TEXT PRIMARY KEY,
    category TEXT DEFAULT 'downtime',
    reason TEXT NOT NULL,
    sector TEXT DEFAULT 'Extrusão',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 21. TRILHA DE AUDITORIA E LOGS (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS audit_trail (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    module TEXT DEFAULT '',
    target_title TEXT DEFAULT '',
    target_id TEXT DEFAULT '',
    user_name TEXT DEFAULT '',
    user_id TEXT DEFAULT '',
    user_role TEXT DEFAULT '',
    timestamp TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    old_state JSONB DEFAULT '{}'::jsonb,
    new_state JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_trail(timestamp DESC);

-- =========================================================================
-- SEGURANÇA E POLÍTICAS DE ACESSO (ROW LEVEL SECURITY - RLS)
-- Permite leitura e escrita tanto para clientes web anônimos quanto autenticados
-- =========================================================================

DO $$ 
DECLARE 
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'production_entries', 'shifts', 'employees', 'collaborators', 
        'personnel_logs', 'system_users', 'settings', 'company_notices', 
        'lunch_schedules', 'maintenance_requests', 'operator_training_sheets', 
        'training_records', 'operator_penalties', 'ribbon_cutting_entries', 
        'stock_entries', 'vacations', 'custom_sectors', 'overtime_entries', 
        'overtime_requests', 'reasons_library', 'audit_trail'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Public access policy" ON %I;', tbl);
        EXECUTE format('CREATE POLICY "Public access policy" ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);', tbl);
    END LOOP;
END $$;

-- =========================================================================
-- HABILITAR REALTIME (SINCRONIZAÇÃO INSTANTÂNEA ENTRE APARELHOS)
-- =========================================================================
DO $$
BEGIN
    -- Adiciona as tabelas chave à publicação supabase_realtime
    ALTER PUBLICATION supabase_realtime ADD TABLE 
        production_entries,
        shifts,
        employees,
        collaborators,
        personnel_logs,
        system_users,
        settings,
        company_notices,
        lunch_schedules,
        maintenance_requests,
        operator_training_sheets,
        training_records,
        operator_penalties,
        ribbon_cutting_entries,
        stock_entries,
        vacations,
        custom_sectors,
        overtime_entries,
        overtime_requests;
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
    WHEN others THEN
        NULL;
END $$;
