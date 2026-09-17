import React, { useState, useEffect } from 'react';
import { X, Users, Search, LogOut, Clock, Smartphone, Monitor, Activity, History, Filter, Download, Trash2, ArrowRightLeft, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { ActiveSession, AccessLog } from '../types';

interface ActiveUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSessions: ActiveSession[];
  accessLogs?: AccessLog[];
  onDisconnectUser?: (sessionId: string) => Promise<void>;
  onClearHistory?: () => Promise<void>;
  currentUserId?: string;
}

export const ActiveUsersModal: React.FC<ActiveUsersModalProps> = ({
  isOpen,
  onClose,
  activeSessions,
  accessLogs = [],
  onDisconnectUser,
  onClearHistory,
  currentUserId
}) => {
  const [activeTab, setActiveTab] = useState<'online' | 'history'>('online');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | 'login' | 'logout' | 'disconnect'>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [now, setNow] = useState(Date.now());

  // Update 'now' every 5 seconds for accurate "há X segundos" labels
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter sessions that have heartbeat within last 2 minutes (120,000 ms)
  const onlineSessions = activeSessions.filter(s => {
    if (!s.lastSeen) return false;
    const diff = now - new Date(s.lastSeen).getTime();
    return diff < 120000;
  });

  const filteredOnlineSessions = onlineSessions.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter access logs
  const filteredAccessLogs = accessLogs
    .filter(log => {
      const matchSearch = 
        log.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.role.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchAction = actionFilter === 'all' || log.action === actionFilter;
      const matchDate = !dateFilter || log.timestamp.startsWith(dateFilter);

      return matchSearch && matchAction && matchDate;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const formatLastSeen = (isoString: string) => {
    if (!isoString) return 'Desconhecido';
    const diffSeconds = Math.floor((now - new Date(isoString).getTime()) / 1000);
    if (diffSeconds < 10) return 'Agora mesmo';
    if (diffSeconds < 60) return `Há ${diffSeconds}s`;
    const minutes = Math.floor(diffSeconds / 60);
    return `Há ${minutes} min`;
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const formatDateTime = (isoString: string) => {
    if (!isoString) return 'Data N/I';
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    } catch {
      return 'Data Inválida';
    }
  };

  const handleExportCSV = () => {
    if (filteredAccessLogs.length === 0) {
      alert('Nenhum registro para exportar.');
      return;
    }
    const headers = ['Matrícula', 'Nome', 'Cargo', 'Ação', 'Data e Hora', 'Dispositivo'];
    const rows = filteredAccessLogs.map(l => [
      l.registration,
      `"${l.name.replace(/"/g, '""')}"`,
      `"${l.role.replace(/"/g, '""')}"`,
      l.action === 'login' ? 'Entrada' : l.action === 'logout' ? 'Saída' : 'Desconexão Forçada',
      formatDateTime(l.timestamp),
      l.device || 'Desktop'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Historico_Acessos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 flex items-center justify-center">
              <span className="relative flex h-3 w-3 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                Monitoramento de Acesso
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                {onlineSessions.length} {onlineSessions.length === 1 ? 'colaborador conectado' : 'colaboradores conectados'} no momento
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-100 bg-slate-50/80 px-4 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('online')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'online'
                ? 'bg-white text-emerald-700 border-emerald-500 shadow-sm'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <Users size={16} />
            Usuários On-line ({onlineSessions.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
              activeTab === 'history'
                ? 'bg-white text-blue-700 border-blue-500 shadow-sm'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <History size={16} />
            Histórico de Acesso ({accessLogs.length})
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar por nome, matrícula ou cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {activeTab === 'history' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value as any)}
                className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
              >
                <option value="all">Todas as Ações</option>
                <option value="login">Entrada (Login)</option>
                <option value="logout">Saída (Logout)</option>
                <option value="disconnect">Desconexão</option>
              </select>

              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
              />

              <button
                onClick={handleExportCSV}
                className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl border border-blue-200 transition-all text-xs font-bold flex items-center gap-1 shrink-0"
                title="Exportar Histórico para CSV"
              >
                <Download size={16} />
              </button>

              {onClearHistory && (
                <button
                  onClick={onClearHistory}
                  className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 transition-all text-xs font-bold flex items-center gap-1 shrink-0"
                  title="Limpar Histórico de Acessos"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          )}

          {activeTab === 'online' && (
            <div className="px-3 py-2 bg-emerald-100/60 text-emerald-800 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
              <Activity size={14} className="animate-spin text-emerald-600" /> Live Updates
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          
          {/* TAB 1: ONLINE USERS */}
          {activeTab === 'online' && (
            filteredOnlineSessions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Users size={40} className="opacity-30" />
                <p className="text-xs font-bold uppercase tracking-wider">
                  {searchTerm ? 'Nenhum usuário encontrado na busca' : 'Nenhum usuário conectado no momento'}
                </p>
              </div>
            ) : (
              filteredOnlineSessions.map((session) => {
                const isCurrentUser = session.id === currentUserId || session.registration === currentUserId;
                return (
                  <div 
                    key={session.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCurrentUser 
                        ? 'bg-blue-50/60 border-blue-200' 
                        : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm uppercase shadow-sm">
                          {session.name.substring(0, 2)}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-slate-800 truncate uppercase">
                            {session.name}
                          </p>
                          {isCurrentUser && (
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded-md uppercase tracking-wider">
                              Você
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold mt-0.5">
                          <span>Matrícula: {session.registration}</span>
                          <span>•</span>
                          <span className="text-slate-600">{session.role}</span>
                        </div>
                      </div>
                    </div>

                    {/* Device & Activity Info */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 justify-end">
                          {session.device === 'Mobile' ? (
                            <Smartphone size={12} className="text-slate-400" />
                          ) : (
                            <Monitor size={12} className="text-slate-400" />
                          )}
                          <span>Entrou às {formatTime(session.loginTime)}</span>
                        </div>
                        <p className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1 justify-end mt-0.5">
                          <Clock size={11} /> {formatLastSeen(session.lastSeen)}
                        </p>
                      </div>

                      {onDisconnectUser && !isCurrentUser && (
                        <button
                          onClick={() => onDisconnectUser(session.id)}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-wider border border-red-100 transition-all flex items-center gap-1"
                          title="Desconectar este usuário"
                        >
                          <LogOut size={12} /> Desconectar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )
          )}

          {/* TAB 2: ACCESS HISTORY */}
          {activeTab === 'history' && (
            filteredAccessLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <History size={40} className="opacity-30" />
                <p className="text-xs font-bold uppercase tracking-wider">
                  Nenhum registro de acesso encontrado
                </p>
              </div>
            ) : (
              filteredAccessLogs.map((log) => {
                const isLogin = log.action === 'login';
                const isLogout = log.action === 'logout';
                const isDisconnect = log.action === 'disconnect';

                return (
                  <div 
                    key={log.id}
                    className="p-3.5 bg-white border border-slate-100 hover:border-slate-200 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-xs ${
                        isLogin ? 'bg-emerald-100 text-emerald-800' : isLogout ? 'bg-slate-100 text-slate-700' : 'bg-red-100 text-red-800'
                      }`}>
                        {isLogin ? <CheckCircle2 size={18} /> : isLogout ? <LogOut size={18} /> : <AlertCircle size={18} />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-slate-800 truncate uppercase">
                            {log.name}
                          </p>
                          <span className={`px-2 py-0.5 text-[9px] font-black rounded-md uppercase tracking-wider ${
                            isLogin 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : isLogout 
                              ? 'bg-slate-100 text-slate-700' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {isLogin ? 'Entrada' : isLogout ? 'Saída' : 'Desconectado'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold mt-0.5">
                          <span>Matrícula: {log.registration}</span>
                          <span>•</span>
                          <span className="text-slate-600">{log.role}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 text-right shrink-0">
                      <div>
                        <p className="text-xs font-black text-slate-700">
                          {formatDateTime(log.timestamp)}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold justify-end mt-0.5">
                          {log.device === 'Mobile' ? <Smartphone size={12} /> : <Monitor size={12} />}
                          <span>{log.device || 'Desktop'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[10px] font-bold text-slate-400 uppercase">
            {activeTab === 'online' ? 'Sincronização em tempo real via Firestore' : `Exibindo ${filteredAccessLogs.length} registros no histórico`}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
