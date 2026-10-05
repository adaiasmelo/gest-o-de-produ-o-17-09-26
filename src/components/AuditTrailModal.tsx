import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  X,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Layers,
  ArrowRight,
  PlusCircle,
  Edit3,
  Trash2,
  CheckCircle2,
  FileText,
  Shield,
  Clock,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import {
  AuditLogEntry,
  AuditModule,
  AuditAction,
  subscribeAuditLogs,
  exportAuditLogsToCsv,
} from '../services/auditLogger';
import { AnimatedCounter } from './AnimatedCounter';
import { triggerHaptic } from '../utils/haptics';

interface AuditTrailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditTrailModal: React.FC<AuditTrailModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeAuditLogs((updatedLogs) => {
      setLogs(updatedLogs);
    });
    return () => unsub();
  }, [isOpen]);

  const toggleExpand = (id: string) => {
    triggerHaptic('selection');
    setExpandedLogIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExport = () => {
    triggerHaptic('success');
    exportAuditLogsToCsv(filteredLogs);
  };

  // Filtragem dos logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedModule !== 'all' && log.module !== selectedModule) {
        return false;
      }
      if (selectedAction !== 'all' && log.action !== selectedAction) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesUser = log.userName.toLowerCase().includes(query);
        const matchesTitle = log.targetTitle.toLowerCase().includes(query);
        const matchesModule = log.module.toLowerCase().includes(query);
        const matchesReason = (log.reason || '').toLowerCase().includes(query);
        const matchesDiff = log.diff?.some(
          (d) =>
            d.label.toLowerCase().includes(query) ||
            String(d.oldValue).toLowerCase().includes(query) ||
            String(d.newValue).toLowerCase().includes(query)
        );
        if (!matchesUser && !matchesTitle && !matchesModule && !matchesReason && !matchesDiff) {
          return false;
        }
      }
      return true;
    });
  }, [logs, selectedModule, selectedAction, searchTerm]);

  // Contadores de estatísticas
  const stats = useMemo(() => {
    const creates = logs.filter((l) => l.action === 'CREATE').length;
    const updates = logs.filter((l) => l.action === 'UPDATE').length;
    const deletes = logs.filter((l) => l.action === 'DELETE').length;
    return { total: logs.length, creates, updates, deletes };
  }, [logs]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative bg-white border-0 sm:border border-slate-200 shadow-2xl rounded-none sm:rounded-[2rem] w-full max-w-5xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="shrink-0 px-4 sm:px-8 py-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-900 text-white">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
                <History className="w-6 h-6 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                    Trilha de Auditoria & Rastreabilidade
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Tempo Real
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-bold tracking-normal mt-0.5">
                  ISO 9001 Compliance • Quem Alterou o Quê • Diff Visual Detalhado
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleExport}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                title="Exportar CSV para Auditoria"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Exportar CSV</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                }}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-lg font-black"
                title="Fechar"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="bg-slate-50/90 border-b border-slate-200 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Total Registros:
                </span>
                <span className="text-sm font-black text-slate-800">
                  <AnimatedCounter value={stats.total} />
                </span>
              </div>
              <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-800 shadow-2xs">
                <PlusCircle size={14} className="text-emerald-600" />
                <span className="text-[10px] font-black uppercase tracking-wider">Criações:</span>
                <span className="text-sm font-black">
                  <AnimatedCounter value={stats.creates} />
                </span>
              </div>
              <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200 text-blue-800 shadow-2xs">
                <Edit3 size={14} className="text-blue-600" />
                <span className="text-[10px] font-black uppercase tracking-wider">Edições:</span>
                <span className="text-sm font-black">
                  <AnimatedCounter value={stats.updates} />
                </span>
              </div>
              <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200 text-red-800 shadow-2xs">
                <Trash2 size={14} className="text-red-600" />
                <span className="text-[10px] font-black uppercase tracking-wider">Exclusões:</span>
                <span className="text-sm font-black">
                  <AnimatedCounter value={stats.deletes} />
                </span>
              </div>
            </div>

            <div className="text-[11px] font-bold text-slate-500">
              Exibindo <strong>{filteredLogs.length}</strong> de <strong>{logs.length}</strong> eventos
            </div>
          </div>

          {/* Filters Bar */}
          <div className="p-4 sm:px-8 bg-white border-b border-slate-100 flex flex-wrap gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por operador, máquina, campo alterado ou justificativa..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-2xs"
              />
            </div>

            {/* Module Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedModule}
                onChange={(e) => {
                  triggerHaptic('selection');
                  setSelectedModule(e.target.value);
                }}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
              >
                <option value="all">Todos os Módulos</option>
                <option value="Extrusão">Extrusão</option>
                <option value="Corte de Fita">Corte de Fita (Ribbon)</option>
                <option value="Horas Extras">Horas Extras</option>
                <option value="Metas & Parâmetros">Metas & Parâmetros</option>
                <option value="Colaboradores">Colaboradores</option>
                <option value="Configurações">Configurações</option>
              </select>

              {/* Action Filter */}
              <select
                value={selectedAction}
                onChange={(e) => {
                  triggerHaptic('selection');
                  setSelectedAction(e.target.value);
                }}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
              >
                <option value="all">Todas as Ações</option>
                <option value="CREATE">Apenas Criações</option>
                <option value="UPDATE">Apenas Edições (Diff)</option>
                <option value="DELETE">Apenas Exclusões</option>
              </select>
            </div>
          </div>

          {/* Timeline & Diff Feed */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 bg-slate-100/50">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <Shield size={28} />
                </div>
                <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">
                  Nenhum registro de auditoria encontrado
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  As ações de criação, edição de lançamentos de produção, corte de fita, horas extras e metas
                  são registradas e exibidas aqui automaticamente em tempo real.
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isExpanded = expandedLogIds[log.id] ?? true;
                const formattedDate = new Date(log.timestamp).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                const actionConfig = {
                  CREATE: {
                    label: 'Criação',
                    color: 'bg-emerald-500 text-white',
                    cardBorder: 'border-emerald-200',
                    icon: PlusCircle,
                  },
                  UPDATE: {
                    label: 'Edição / Alteração',
                    color: 'bg-blue-600 text-white',
                    cardBorder: 'border-blue-200',
                    icon: Edit3,
                  },
                  DELETE: {
                    label: 'Exclusão',
                    color: 'bg-red-600 text-white',
                    cardBorder: 'border-red-200',
                    icon: Trash2,
                  },
                  STATUS_CHANGE: {
                    label: 'Mudança de Status',
                    color: 'bg-amber-600 text-white',
                    cardBorder: 'border-amber-200',
                    icon: AlertTriangle,
                  },
                }[log.action] || {
                  label: log.action,
                  color: 'bg-slate-600 text-white',
                  cardBorder: 'border-slate-200',
                  icon: FileText,
                };

                const ActionIcon = actionConfig.icon;

                return (
                  <div
                    key={log.id}
                    className={`bg-white rounded-2xl border ${actionConfig.cardBorder} shadow-xs overflow-hidden transition-all`}
                  >
                    {/* Log Entry Header */}
                    <div
                      onClick={() => toggleExpand(log.id)}
                      className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${actionConfig.color}`}
                        >
                          <ActionIcon size={14} />
                          {actionConfig.label}
                        </span>

                        <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
                          {log.module}
                        </span>

                        <h4 className="text-xs sm:text-sm font-black text-slate-800 truncate">
                          {log.targetTitle}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                          <User size={14} className="text-slate-400" />
                          <span>{log.userName}</span>
                          {log.userRole && (
                            <span className="text-[10px] font-semibold text-slate-400">
                              ({log.userRole})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono">
                          <Clock size={13} />
                          <span>{formattedDate}</span>
                        </div>

                        <span className="text-slate-400 text-xs font-black">
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {/* Expandable Visual Diff Content */}
                    {isExpanded && (
                      <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50 space-y-4">
                        {log.reason && (
                          <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-xl text-xs text-amber-900 font-medium flex items-start gap-2">
                            <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-black uppercase text-[10px] block text-amber-800">
                                Justificativa Informada:
                              </strong>
                              <span>{log.reason}</span>
                            </div>
                          </div>
                        )}

                        {/* Visual Diff Table */}
                        {log.diff && log.diff.length > 0 ? (
                          <div className="space-y-2">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                              {log.action === 'UPDATE'
                                ? 'Campos Modificados (Antes vs. Depois)'
                                : 'Detalhamento dos Dados'}
                            </span>
                            <div className="grid grid-cols-1 gap-2">
                              {log.diff.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 bg-white border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-2xs"
                                >
                                  <div className="font-black text-slate-700 min-w-[200px] flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                                    <span>{item.label}</span>
                                  </div>

                                  {log.action === 'UPDATE' ? (
                                    <div className="flex items-center gap-3 flex-wrap">
                                      {/* Antes */}
                                      <div className="px-3 py-1 bg-red-50 text-red-700 line-through rounded-lg border border-red-200/60 font-semibold font-mono text-xs">
                                        {String(item.oldValue ?? '(vazio)')}
                                      </div>
                                      <ArrowRight size={14} className="text-slate-400 shrink-0" />
                                      {/* Depois */}
                                      <div className="px-3 py-1 bg-emerald-50 text-emerald-800 font-black rounded-lg border border-emerald-200 font-mono text-xs shadow-2xs">
                                        {String(item.newValue ?? '(vazio)')}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="px-3 py-1 bg-slate-50 text-slate-800 font-bold rounded-lg border border-slate-200/60 font-mono text-xs">
                                      {String(item.newValue ?? item.oldValue ?? '-')}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            Nenhum campo com alteração de valor detectada.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-4 sm:px-8 py-3.5 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-[11px] text-slate-500 font-semibold">
              Rastreabilidade compatível com requisitos de auditoria de qualidade industrial (ISO 9001).
            </span>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black uppercase rounded-xl transition-all cursor-pointer"
            >
              Fechar Painel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
