import React from 'react';
import { X, History, Calendar, User, Activity } from 'lucide-react';
import { PersonnelLog } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: PersonnelLog[];
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, logs }) => {
  if (!isOpen) return null;

  // Sort logs by date descending
  const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">
        <div className="bg-[#1e293b] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
              <History size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase">Histórico de Movimentação</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Registros de RH</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-0 flex-1 overflow-y-auto custom-scrollbar">
          {sortedLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-medium">Nenhum registro encontrado.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ação</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedLogs.map((log) => {
                  let badgeColor = 'bg-slate-100 text-slate-600';
                  if (log.action === 'Contratação' || log.action === 'Retorno') badgeColor = 'bg-emerald-100 text-emerald-700';
                  if (log.action === 'Férias') badgeColor = 'bg-orange-100 text-orange-700';
                  if (log.action === 'Atestado') badgeColor = 'bg-purple-100 text-purple-700';
                  if (log.action === 'Desligamento') badgeColor = 'bg-red-100 text-red-700';
                  if (log.action === 'Transferência') badgeColor = 'bg-blue-100 text-blue-700';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-300" />
                          <span className="text-xs font-bold text-slate-600">{new Date(log.date).toLocaleString('pt-BR')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-slate-300" />
                          <span className="text-xs font-bold text-slate-800">{log.employeeName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide ${badgeColor}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-medium">{log.details}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;