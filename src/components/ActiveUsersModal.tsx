import React, { useState, useEffect } from 'react';
import { 
  X, Users, Search, LogOut, Clock, Smartphone, Monitor, Activity, 
  History, Download, Trash2, CheckCircle2, AlertCircle, Eye, 
  LayoutDashboard, Layers, Wrench, Tv, UserCheck, ArrowRight,
  Filter, Check, Calendar, HardHat, FileSpreadsheet
} from 'lucide-react';
import { ActiveSession, AccessLog, UserActivityLog } from '../types';

interface ActiveUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSessions: ActiveSession[];
  accessLogs?: AccessLog[];
  activityLogs?: UserActivityLog[];
  onDisconnectUser?: (sessionId: string) => Promise<void>;
  onClearHistory?: () => Promise<void>;
  onClearActivities?: () => Promise<void>;
  currentUserId?: string;
  isAdmin?: boolean;
}

export const ActiveUsersModal: React.FC<ActiveUsersModalProps> = ({
  isOpen,
  onClose,
  activeSessions,
  accessLogs = [],
  activityLogs = [],
  onDisconnectUser,
  onClearHistory,
  onClearActivities,
  currentUserId,
  isAdmin = false
}) => {
  const [activeTab, setActiveTab] = useState<'online' | 'activities' | 'history'>('online');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | 'login' | 'logout' | 'disconnect'>('all');
  const [activityTypeFilter, setActivityTypeFilter] = useState<'all' | 'screen_view' | 'action'>('all');
  const [screenFilter, setScreenFilter] = useState<string>('all');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState('');
  const [now, setNow] = useState(Date.now());

  // Atualiza 'now' a cada 5 segundos para cálculo preciso de "Há X segundos / minutos"
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtra sessões ativas com pulso nos últimos 2 minutos (120.000 ms)
  const onlineSessions = activeSessions.filter(s => {
    if (!s.lastSeen) return false;
    const diff = now - new Date(s.lastSeen).getTime();
    return diff < 120000;
  });

  const filteredOnlineSessions = onlineSessions.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.currentScreen && s.currentScreen.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Lista única de telas registradas para preencher o seletor de filtros
  const availableScreens = Array.from(new Set(activityLogs.map(l => l.screen).filter(Boolean))).sort();

  // Filtra logs de atividades (telas e ações)
  const filteredActivityLogs = activityLogs
    .filter(log => {
      // Filtro de usuário específico
      if (selectedUserFilter && log.registration !== selectedUserFilter && log.name !== selectedUserFilter) {
        return false;
      }

      // Busca por texto
      const term = searchTerm.toLowerCase();
      const matchSearch = 
        !term ||
        log.name.toLowerCase().includes(term) ||
        log.registration.toLowerCase().includes(term) ||
        log.role.toLowerCase().includes(term) ||
        log.screen.toLowerCase().includes(term) ||
        log.action.toLowerCase().includes(term) ||
        (log.details && log.details.toLowerCase().includes(term));
      
      const matchType = activityTypeFilter === 'all' || log.type === activityTypeFilter;
      const matchScreen = screenFilter === 'all' || log.screen === screenFilter;
      const matchDate = !dateFilter || log.timestamp.startsWith(dateFilter);

      return matchSearch && matchType && matchScreen && matchDate;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Filtra logs de acesso (login / logout)
  const filteredAccessLogs = accessLogs
    .filter(log => {
      if (selectedUserFilter && log.registration !== selectedUserFilter && log.name !== selectedUserFilter) {
        return false;
      }
      const term = searchTerm.toLowerCase();
      const matchSearch = 
        !term ||
        log.name.toLowerCase().includes(term) ||
        log.registration.toLowerCase().includes(term) ||
        log.role.toLowerCase().includes(term);
      
      const matchAction = actionFilter === 'all' || log.action === actionFilter;
      const matchDate = !dateFilter || log.timestamp.startsWith(dateFilter);

      return matchSearch && matchAction && matchDate;
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const formatLastSeen = (isoString?: string) => {
    if (!isoString) return 'Desconhecido';
    const diffSeconds = Math.max(0, Math.floor((now - new Date(isoString).getTime()) / 1000));
    if (diffSeconds < 10) return 'Agora mesmo';
    if (diffSeconds < 60) return `Há ${diffSeconds}s`;
    const minutes = Math.floor(diffSeconds / 60);
    if (minutes < 60) return `Há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `Há ${hours}h`;
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'Data N/I';
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    } catch {
      return 'Data Inválida';
    }
  };

  const handleFilterByUser = (registrationOrName: string) => {
    setSelectedUserFilter(registrationOrName);
    setActiveTab('activities');
  };

  const getScreenBadgeColor = (screenName: string) => {
    const s = screenName.toLowerCase();
    if (s.includes('extrusão')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s.includes('fita') || s.includes('corte')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (s.includes('rh') || s.includes('pessoa') || s.includes('colaborador') || s.includes('férias') || s.includes('treinamento')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (s.includes('manutenção')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s.includes('projeção') || s.includes('tv')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (s.includes('calculadora')) return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    if (s.includes('configurações')) return 'bg-slate-100 text-slate-700 border-slate-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getScreenIcon = (screenName: string) => {
    const s = screenName.toLowerCase();
    if (s.includes('extrusão')) return <LayoutDashboard size={14} className="text-blue-600" />;
    if (s.includes('fita') || s.includes('corte')) return <Layers size={14} className="text-purple-600" />;
    if (s.includes('rh') || s.includes('pessoa') || s.includes('férias') || s.includes('treinamento')) {
      return <Users size={14} className="text-emerald-600" />;
    }
    if (s.includes('manutenção')) return <Wrench size={14} className="text-amber-600" />;
    if (s.includes('projeção') || s.includes('tv')) return <Tv size={14} className="text-indigo-600" />;
    return <Eye size={14} className="text-slate-600" />;
  };

  const handleExportActivitiesCSV = () => {
    if (filteredActivityLogs.length === 0) {
      alert('Nenhum registro de atividade para exportar.');
      return;
    }
    const headers = ['Matrícula', 'Nome', 'Cargo', 'Tipo', 'Tela Acessada', 'Sub-Tela / Aba', 'Ação Realizada', 'Detalhes', 'Data e Hora', 'Dispositivo'];
    const rows = filteredActivityLogs.map(l => [
      l.registration,
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${(l.role || '').replace(/"/g, '""')}"`,
      l.type === 'screen_view' ? 'Acesso de Tela' : 'Ação no Sistema',
      `"${(l.screen || '').replace(/"/g, '""')}"`,
      `"${(l.subScreen || '').replace(/"/g, '""')}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      formatDateTime(l.timestamp),
      l.device || 'Desktop'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Historico_Telas_Atividades_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAccessCSV = () => {
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
    link.setAttribute('download', `Historico_Sessoes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 flex items-center justify-center">
              <span className="relative flex h-3 w-3 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <Users size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">
                  Auditoria de Acessos & Telas
                </h2>
                <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black rounded-lg uppercase tracking-wider hidden sm:inline-flex">
                  Tempo Real
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                {onlineSessions.length} {onlineSessions.length === 1 ? 'colaborador online' : 'colaboradores online'} • Histórico de navegação e ações
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            title="Fechar Janela"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50/90 px-3 sm:px-4 pt-2.5 gap-1.5 sm:gap-2 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('online')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'online'
                ? 'bg-white text-emerald-700 border-emerald-500 shadow-sm'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Usuários On-line ({onlineSessions.length})
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'activities'
                ? 'bg-white text-blue-700 border-blue-500 shadow-sm'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <Eye size={15} />
            Histórico de Telas e Ações ({activityLogs.length})
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'history'
                ? 'bg-white text-slate-800 border-slate-700 shadow-sm'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <History size={15} />
            Entradas & Saídas ({accessLogs.length})
          </button>
        </div>

        {/* Selected User Filter Badge (se clicado a partir de um usuário online) */}
        {selectedUserFilter && (
          <div className="bg-blue-50/80 border-b border-blue-100 px-4 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-blue-800 font-bold">
              <UserCheck size={15} className="text-blue-600" />
              <span>Filtrando histórico exclusivo do colaborador: <strong className="font-black underline">{selectedUserFilter}</strong></span>
            </div>
            <button
              onClick={() => setSelectedUserFilter(null)}
              className="text-[11px] font-black text-blue-700 hover:text-blue-900 bg-blue-100/70 hover:bg-blue-200/70 px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <X size={12} /> Remover Filtro
            </button>
          </div>
        )}

        {/* Search & Filters */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder={
                activeTab === 'online'
                  ? 'Buscar por nome, matrícula, cargo ou tela atual...'
                  : activeTab === 'activities'
                  ? 'Buscar por nome, matrícula, tela, ação ou detalhes...'
                  : 'Buscar por nome, matrícula ou cargo...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-xs"
            />
          </div>

          {/* Filtros específicos da aba de Telas e Ações */}
          {activeTab === 'activities' && (
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={activityTypeFilter}
                onChange={(e) => setActivityTypeFilter(e.target.value as any)}
                className="px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-xs"
                title="Filtrar por tipo de atividade"
              >
                <option value="all">Todas as Atividades</option>
                <option value="screen_view">Apenas Acesso a Telas</option>
                <option value="action">Apenas Ações & Lançamentos</option>
              </select>

              {availableScreens.length > 0 && (
                <select
                  value={screenFilter}
                  onChange={(e) => setScreenFilter(e.target.value)}
                  className="px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-xs max-w-[150px] truncate"
                  title="Filtrar por tela acessada"
                >
                  <option value="all">Todas as Telas</option>
                  {availableScreens.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}

              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-xs"
                title="Filtrar por data específica"
              />

              <button
                onClick={handleExportActivitiesCSV}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl border border-blue-200 transition-all text-xs font-black flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer active:scale-95"
                title="Exportar Histórico de Telas e Ações para Excel/CSV"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Exportar CSV</span>
              </button>

              {isAdmin && onClearActivities && (
                <button
                  onClick={onClearActivities}
                  className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 transition-all text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer active:scale-95"
                  title="Limpar Histórico de Atividades (Admin)"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          )}

          {/* Filtros da aba de Entradas e Saídas */}
          {activeTab === 'history' && (
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value as any)}
                className="px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-xs"
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
                className="px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 shadow-xs"
              />

              <button
                onClick={handleExportAccessCSV}
                className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl border border-blue-200 transition-all text-xs font-black flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer active:scale-95"
                title="Exportar Histórico de Entradas para CSV"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Exportar CSV</span>
              </button>

              {isAdmin && onClearHistory && (
                <button
                  onClick={onClearHistory}
                  className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 transition-all text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer active:scale-95"
                  title="Limpar Histórico de Sessões (Admin)"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          )}

          {activeTab === 'online' && (
            <div className="px-3 py-2 bg-emerald-100/70 text-emerald-800 rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 self-end md:self-auto border border-emerald-200">
              <Activity size={14} className="animate-spin text-emerald-600" /> Monitorando Telas em Tempo Real
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 custom-scrollbar">
          
          {/* ======================================================== */}
          {/* TAB 1: USUÁRIOS ONLINE COM IDENTIFICAÇÃO DA TELA ATUAL   */}
          {/* ======================================================== */}
          {activeTab === 'online' && (
            filteredOnlineSessions.length === 0 ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <Users size={44} className="opacity-30" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {searchTerm ? 'Nenhum colaborador encontrado para esta busca' : 'Nenhum colaborador conectado no momento'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Assim que um usuário fizer login, sua presença e tela atual aparecerão aqui em tempo real.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filteredOnlineSessions.map((session) => {
                  const isCurrentUser = session.id === currentUserId || session.registration === currentUserId;
                  const currentScreen = session.currentScreen || 'Extrusão (Padrão)';
                  const currentSubScreen = session.currentSubScreen;
                  const lastAction = session.lastAction;

                  return (
                    <div 
                      key={session.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-xs ${
                        isCurrentUser 
                          ? 'bg-blue-50/50 border-blue-200 hover:border-blue-300' 
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      {/* Colaborador Info */}
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="relative shrink-0 mt-0.5 sm:mt-0">
                          <div className="w-11 h-11 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-sm uppercase shadow-sm">
                            {session.name ? session.name.substring(0, 2) : 'US'}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-black text-slate-900 truncate uppercase">
                              {session.name}
                            </p>
                            {isCurrentUser && (
                              <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded-md uppercase tracking-wider">
                                Você
                              </span>
                            )}
                            <span className="text-[10px] text-slate-500 font-bold">
                              Matrícula: <strong className="text-slate-700">#{session.registration}</strong>
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold mt-1">
                            <span className="text-slate-600">{session.role}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-slate-500">
                              {session.device === 'Mobile' ? <Smartphone size={12} /> : <Monitor size={12} />}
                              {session.device || 'Desktop'}
                            </span>
                            <span>•</span>
                            <span className="text-slate-500 font-medium">
                              Login às {formatTime(session.loginTime)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* TELA ATUAL E ÚLTIMA AÇÃO EM TEMPO REAL */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        <div className="space-y-1">
                          {/* Tag da Tela Atual */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                              Tela Atual:
                            </span>
                            <div className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-tight border flex items-center gap-1.5 shadow-2xs ${getScreenBadgeColor(currentScreen)}`}>
                              {getScreenIcon(currentScreen)}
                              <span>{currentScreen}</span>
                              {currentSubScreen && (
                                <>
                                  <span className="opacity-40">/</span>
                                  <span className="font-extrabold">{currentSubScreen}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Última Ação do Usuário */}
                          {lastAction ? (
                            <p className="text-[10px] text-slate-600 font-bold flex items-center gap-1">
                              <span className="text-slate-400 font-black">Última ação:</span>
                              <span className="text-slate-800 font-extrabold truncate max-w-[260px]">{lastAction}</span>
                            </p>
                          ) : (
                            <p className="text-[10px] text-emerald-600 font-extrabold flex items-center gap-1">
                              <Clock size={11} /> {formatLastSeen(session.lastSeen)}
                            </p>
                          )}
                        </div>

                        {/* Botões de Ação para o Usuário Online */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                          <button
                            onClick={() => handleFilterByUser(session.registration)}
                            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-wider border border-blue-200 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                            title="Ver histórico de telas e atividades deste colaborador"
                          >
                            <Eye size={12} /> Ver Histórico
                          </button>

                          {onDisconnectUser && !isCurrentUser && (
                            <button
                              onClick={() => onDisconnectUser(session.id)}
                              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-wider border border-red-200 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                              title="Desconectar este usuário do sistema"
                            >
                              <LogOut size={12} /> Desconectar
                            </button>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ======================================================== */}
          {/* TAB 2: HISTÓRICO COMPLETO DE TELAS ACESSADAS & AÇÕES     */}
          {/* ======================================================== */}
          {activeTab === 'activities' && (
            filteredActivityLogs.length === 0 ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <Eye size={44} className="opacity-30" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Nenhum registro de navegação ou atividade encontrado
                </p>
                <p className="text-[11px] text-slate-400 max-w-md">
                  Cada vez que qualquer colaborador acessar uma tela ou realizar um lançamento/ação, o sistema grava automaticamente o histórico aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-500">
                  <span>Exibindo <strong>{filteredActivityLogs.length}</strong> atividades registradas</span>
                  <span>Ordenado pelos mais recentes</span>
                </div>

                {filteredActivityLogs.map((activity) => {
                  const isScreenView = activity.type === 'screen_view';
                  const screenName = activity.screen || 'Geral';
                  
                  return (
                    <div 
                      key={activity.id}
                      className="p-3 sm:p-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-sm"
                    >
                      {/* Left: User & Screen */}
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-black text-xs ${
                          isScreenView ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {isScreenView ? <Eye size={18} /> : <Activity size={18} />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-slate-900 uppercase">
                              {activity.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              #{activity.registration}
                            </span>
                            <span className="text-[10px] text-slate-500 font-bold">
                              ({activity.role})
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            {/* Tag da Tela */}
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tight border flex items-center gap-1 ${getScreenBadgeColor(screenName)}`}>
                              {getScreenIcon(screenName)}
                              {screenName}
                              {activity.subScreen && ` > ${activity.subScreen}`}
                            </span>

                            {/* Ação / Detalhes */}
                            <span className="text-xs font-bold text-slate-700">
                              {activity.action}
                            </span>

                            {activity.details && (
                              <span className="text-[11px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                                {activity.details}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Date, Time & Device */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 text-right shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div>
                          <p className="text-xs font-black text-slate-800">
                            {formatDateTime(activity.timestamp)}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold justify-end mt-0.5">
                            <span className="text-slate-500 font-medium">({formatLastSeen(activity.timestamp)})</span>
                            <span>•</span>
                            {activity.device === 'Mobile' ? <Smartphone size={12} /> : <Monitor size={12} />}
                            <span>{activity.device || 'Desktop'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ======================================================== */}
          {/* TAB 3: HISTÓRICO DE SESSÕES (LOGIN / LOGOUT)             */}
          {/* ======================================================== */}
          {activeTab === 'history' && (
            filteredAccessLogs.length === 0 ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                <History size={44} className="opacity-30" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Nenhum registro de login ou saída encontrado
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1 text-[11px] font-bold text-slate-500">
                  <span>Exibindo <strong>{filteredAccessLogs.length}</strong> registros de conexão</span>
                  <span>Ordenado pelos mais recentes</span>
                </div>

                {filteredAccessLogs.map((log) => {
                  const isLogin = log.action === 'login';
                  const isLogout = log.action === 'logout';

                  return (
                    <div 
                      key={log.id}
                      className="p-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:shadow-sm"
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
                              {isLogin ? 'Entrada (Login)' : isLogout ? 'Saída (Logout)' : 'Desconectado'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold mt-0.5">
                            <span>Matrícula: #{log.registration}</span>
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
                })}
              </div>
            )
          )}

        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span className="text-[11px] font-bold text-slate-400 uppercase text-center sm:text-left">
            {activeTab === 'online' 
              ? 'Identificação contínua da tela e ação de cada usuário via Firestore' 
              : activeTab === 'activities'
              ? `Histórico persistente: ${filteredActivityLogs.length} telas/ações registradas`
              : `Histórico de sessões: ${filteredAccessLogs.length} logins/logouts registrados`}
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
          >
            Fechar Janela
          </button>
        </div>

      </div>
    </div>
  );
};
