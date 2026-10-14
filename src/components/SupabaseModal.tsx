import React, { useState, useEffect } from 'react';
import { 
  X, Database, CheckCircle2, AlertCircle, Copy, Download, RefreshCw, 
  ExternalLink, ArrowRight, ShieldCheck, Github, Zap, Server, Check
} from 'lucide-react';
import { 
  getStoredSupabaseConfig, 
  saveCustomSupabaseConfig, 
  removeCustomSupabaseConfig, 
  testSupabaseConnection,
  isSupabaseConfigured
} from '../lib/supabase';
import { migrateAllDataToSupabase, MigrationProgress } from '../services/supabaseSyncService';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionEntries: any[];
  employees: any[];
  collaborators: any[];
  shifts: any[];
  personnelLogs: any[];
  settings?: any;
  companyNotices?: any[];
  lunchSchedules?: any[];
  maintenanceRequests?: any[];
  trainingRecords?: any[];
  operatorTrainingSheets?: any[];
  operatorPenalties?: any[];
  ribbonEntries?: any[];
  onShowToast?: (msg: string) => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  productionEntries,
  employees,
  collaborators,
  shifts,
  personnelLogs,
  settings,
  companyNotices,
  lunchSchedules,
  maintenanceRequests,
  trainingRecords,
  operatorTrainingSheets,
  operatorPenalties,
  ribbonEntries,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'sql' | 'migrate' | 'github'>('config');
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [configSource, setConfigSource] = useState<'env' | 'localStorage' | 'none'>('none');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs?: number; message?: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedGit, setCopiedGit] = useState(false);

  // Migration state
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress | null>(null);

  useEffect(() => {
    if (isOpen) {
      const cfg = getStoredSupabaseConfig();
      setUrl(cfg.url);
      setAnonKey(cfg.anonKey);
      setConfigSource(cfg.source);
      setTestResult(null);
      if (cfg.hasConfig) {
        testConnection();
      }
    }
  }, [isOpen]);

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection();
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e?.message || 'Falha no teste.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    if (!url.trim() || !anonKey.trim()) {
      if (onShowToast) onShowToast('Por favor, preencha a URL e a Chave Anônima do Supabase.');
      return;
    }
    const ok = saveCustomSupabaseConfig(url, anonKey);
    if (ok) {
      setConfigSource('localStorage');
      if (onShowToast) onShowToast('Configuração salva com sucesso!');
      testConnection();
    } else {
      if (onShowToast) onShowToast('Erro ao salvar configuração.');
    }
  };

  const handleClear = () => {
    removeCustomSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setConfigSource('none');
    setTestResult(null);
    if (onShowToast) onShowToast('Configurações removidas.');
  };

  const handleCopySql = () => {
    fetch('/supabase-schema.sql')
      .then(res => res.text())
      .then(text => {
        navigator.clipboard.writeText(text);
        setCopiedSql(true);
        if (onShowToast) onShowToast('Script SQL copiado para a área de transferência!');
        setTimeout(() => setCopiedSql(false), 3000);
      })
      .catch(() => {
        // Fallback básico
        navigator.clipboard.writeText('-- Consulte o arquivo supabase-schema.sql na raiz do projeto.');
        setCopiedSql(true);
        setTimeout(() => setCopiedSql(false), 3000);
      });
  };

  const handleDownloadSql = () => {
    const link = document.createElement('a');
    link.href = '/supabase-schema.sql';
    link.download = 'supabase-schema.sql';
    link.click();
  };

  const handleStartMigration = async () => {
    setIsMigrating(true);
    try {
      const res = await migrateAllDataToSupabase(
        {
          productionEntries,
          employees,
          collaborators,
          shifts,
          personnelLogs,
          settings,
          companyNotices,
          lunchSchedules,
          maintenanceRequests,
          trainingRecords,
          operatorTrainingSheets,
          operatorPenalties,
          ribbonEntries
        },
        (progress) => {
          setMigrationProgress(progress);
        }
      );

      if (res.success) {
        if (onShowToast) onShowToast(`Migração concluída! ${res.totalUploaded} registros enviados para o Supabase.`);
      } else {
        if (onShowToast) onShowToast(`Migração concluída com avisos em algumas tabelas.`);
      }
    } catch (e: any) {
      if (onShowToast) onShowToast(`Erro na migração: ${e?.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Integração Supabase & GitHub
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                  PostgreSQL
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Livre de cotas diárias restritivas, sincronização instantânea em tempo real e pronto para GitHub.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center gap-2 border-b-2 ${
              activeTab === 'config'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4" />
            1. Conexão & Credenciais
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center gap-2 border-b-2 ${
              activeTab === 'sql'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            2. Script SQL das Tabelas
          </button>
          <button
            onClick={() => setActiveTab('migrate')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center gap-2 border-b-2 ${
              activeTab === 'migrate'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            3. Enviar Dados Atuais ({productionEntries.length} itens)
          </button>
          <button
            onClick={() => setActiveTab('github')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition flex items-center gap-2 border-b-2 ${
              activeTab === 'github'
                ? 'border-emerald-500 text-emerald-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-4 h-4" />
            4. Guia GitHub & Deploy
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-300 text-sm">
          {/* TAB 1: CONFIG */}
          {activeTab === 'config' && (
            <div className="space-y-5">
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-white text-sm">Por que usar o Supabase neste sistema?</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    O Supabase oferece banco relacional PostgreSQL completo com até 500 MB gratuitos e <strong>sem a cota de 50.000 leituras diárias</strong> que travou o Firestore. Todos os aparelhos (computador, celular, tablet) mantêm-se conectados recebendo as atualizações em tempo real com sub-segundo de latência.
                  </p>
                </div>
              </div>

              {/* Status Box */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${testResult?.success ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <div>
                    <span className="font-semibold text-white text-xs block">
                      Status da Conexão:{' '}
                      {testResult?.success ? (
                        <span className="text-emerald-400">Conectado ao Supabase</span>
                      ) : testResult ? (
                        <span className="text-amber-400">Verificação Pendente</span>
                      ) : (
                        <span className="text-slate-400">Não testado</span>
                      )}
                    </span>
                    <span className="text-xs text-slate-400">
                      {testResult?.message || (configSource === 'env' ? 'Configurado via variáveis de ambiente (.env)' : configSource === 'localStorage' ? 'Configurado no navegador' : 'Aguardando credenciais')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={testConnection}
                  disabled={isTesting}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 flex items-center gap-2 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  {isTesting ? 'Testando...' : 'Testar Conexão'}
                </button>
              </div>

              {/* Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Supabase Project URL
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://sua-empresa-xyz.supabase.co"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Encontrado no painel do Supabase em: <em>Project Settings → API → Project URL</em>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Supabase Anon / Publishable Key
                  </label>
                  <input
                    type="password"
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="sb_publishable_... ou eyJhbGci..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Encontrado no painel em: <em>Project Settings → API → anon / public</em> (ou <em>Connect → Frameworks</em>)
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Salvar e Ativar Supabase
                  </button>
                  {configSource === 'localStorage' && (
                    <button
                      onClick={handleClear}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition border border-slate-700"
                    >
                      Limpar Configuração
                    </button>
                  )}
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    Abrir Painel do Supabase
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SQL */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4">
                <h4 className="font-semibold text-white text-sm">Como preparar o banco de dados no Supabase:</h4>
                <ol className="list-decimal list-inside text-xs text-slate-400 mt-2 space-y-1.5 leading-relaxed">
                  <li>No painel do Supabase, clique em <strong>SQL Editor</strong> no menu lateral esquerdo.</li>
                  <li>Clique em <strong>+ New Query</strong> (Nova Consulta).</li>
                  <li>Clique no botão <strong>"Copiar Script SQL Completo"</strong> abaixo e cole no editor do Supabase.</li>
                  <li>Clique no botão verde <strong>RUN</strong> (Executar) no Supabase. Pronto!</li>
                </ol>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Script: supabase-schema.sql (21 Tabelas + Índices + RLS + Realtime)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadSql}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Baixar Arquivo .sql
                  </button>
                  <button
                    onClick={handleCopySql}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedSql ? 'Copiado!' : 'Copiar Script SQL Completo'}
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 max-h-72 overflow-y-auto leading-relaxed select-all">
                <pre>{`-- Arquivo gerado para o Supabase: supabase-schema.sql
-- Contém:
-- 1. production_entries (Lançamentos de Cast 1, Cast 2, Erema)
-- 2. shifts (Turnos consolidados)
-- 3. employees & collaborators (Cadastro de pessoal e alocações)
-- 4. personnel_logs (Diário de bordo de colaboradores)
-- 5. system_users & settings (Configurações globais e permissões)
-- 6. company_notices, lunch_schedules, maintenance_requests
-- 7. training_records & operator_training_sheets
-- 8. ribbon_cutting_entries (Setor de Fitas / Refilamento)
-- 9. Políticas RLS (Row Level Security) liberadas para a aplicação
-- 10. Publicação Realtime habilitada para sincronização entre celulares e computadores`}</pre>
              </div>
            </div>
          )}

          {/* TAB 3: MIGRATE */}
          {activeTab === 'migrate' && (
            <div className="space-y-5">
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4">
                <h4 className="font-semibold text-white text-sm">Exportação em 1 Clique para o Supabase</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Envia todos os dados existentes no sistema (incluindo lançamentos de outubro, cadastros e escalas) direto para suas tabelas no PostgreSQL do Supabase.
                </p>
              </div>

              {/* Data Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
                  <span className="text-xs text-slate-400 block">Lançamentos Extrusão</span>
                  <span className="text-lg font-bold text-emerald-400">{productionEntries.length}</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
                  <span className="text-xs text-slate-400 block">Colaboradores</span>
                  <span className="text-lg font-bold text-blue-400">{collaborators.length}</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
                  <span className="text-xs text-slate-400 block">Alocações Ativas</span>
                  <span className="text-lg font-bold text-amber-400">{employees.length}</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
                  <span className="text-xs text-slate-400 block">Diários de Pessoal</span>
                  <span className="text-lg font-bold text-purple-400">{personnelLogs.length}</span>
                </div>
              </div>

              {/* Progress Bar */}
              {migrationProgress && (
                <div className="space-y-2 p-4 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="flex justify-between text-xs">
                    <span className="text-white font-medium">{migrationProgress.currentStep}</span>
                    <span className="text-emerald-400 font-bold">{migrationProgress.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${migrationProgress.percentage}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Processados {migrationProgress.processedRecords} de {migrationProgress.totalRecords} registros.
                  </div>
                  {migrationProgress.errors.length > 0 && (
                    <div className="mt-2 p-2 bg-red-950/40 border border-red-800/60 rounded text-[11px] text-red-300 max-h-24 overflow-y-auto">
                      <strong>Avisos durante upload:</strong>
                      {migrationProgress.errors.map((err, idx) => (
                        <div key={idx}>• {err}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={handleStartMigration}
                  disabled={isMigrating}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isMigrating ? 'animate-spin' : ''}`} />
                  {isMigrating ? 'Migrando dados para o Supabase...' : 'Iniciar Envio de Todos os Dados para o Supabase'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: GITHUB */}
          {activeTab === 'github' && (
            <div className="space-y-4">
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4">
                <h4 className="font-semibold text-white text-sm">Passo a Passo para Subir o Código no GitHub</h4>
                <p className="text-xs text-slate-400 mt-1">
                  O projeto já está 100% estruturado e pronto para ser versionado e hospedado no seu repositório GitHub.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-white">
                    <span>1. Comandos Git no seu terminal:</span>
                    <button
                      onClick={() => {
                        const commands = `git init\ngit add .\ngit commit -m "feat: Integracao Supabase e Gestao de Producao"\ngit branch -M main\ngit remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git\ngit push -u origin main`;
                        navigator.clipboard.writeText(commands);
                        setCopiedGit(true);
                        setTimeout(() => setCopiedGit(false), 3000);
                        if (onShowToast) onShowToast('Comandos Git copiados!');
                      }}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      {copiedGit ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedGit ? 'Copiado!' : 'Copiar Comandos'}
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-emerald-400/90 bg-black/40 p-3 rounded-lg overflow-x-auto leading-relaxed">
{`git init
git add .
git commit -m "feat: Integracao Supabase e Gestao de Producao"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main`}
                  </pre>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-xs text-slate-300">
                  <strong className="text-white block">2. Configurar Variáveis de Ambiente no GitHub / Servidor (Vercel, Render, etc.):</strong>
                  <p className="text-slate-400">
                    Basta adicionar as variáveis de ambiente informadas no arquivo <code className="text-emerald-400 font-mono">.env.example</code>:
                  </p>
                  <pre className="font-mono text-[11px] bg-black/40 p-2.5 rounded text-slate-300">
{`VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima`}
                  </pre>
                </div>

                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300">
                  <strong className="text-white block mb-1">3. Documentação Completa Inclusa:</strong>
                  Consulte o arquivo <code className="text-emerald-400 font-mono">GITHUB_SUPABASE_GUIA.md</code> na raiz do projeto com todas as instruções detalhadas em português.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex justify-between items-center">
          <div className="text-xs text-slate-400">
            {isSupabaseConfigured() ? (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Supabase ativo no sistema
              </span>
            ) : (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Supabase não configurado neste navegador
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
