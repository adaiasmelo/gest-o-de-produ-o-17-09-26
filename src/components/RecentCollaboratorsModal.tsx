import React from 'react';
import { X, Sparkles, Plus, Edit2 } from 'lucide-react';
import { Collaborator } from '../types';
import { formatRecentRegistrationBadge } from '../utils/recentCollaborators';

interface RecentCollaboratorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaborators: Collaborator[];
  onSelectToAllocate: (col: Collaborator) => void;
  onEditCollaborator: (col: Collaborator) => void;
  isReadOnly?: boolean;
}

export const RecentCollaboratorsModal: React.FC<RecentCollaboratorsModalProps> = ({
  isOpen,
  onClose,
  collaborators,
  onSelectToAllocate,
  onEditCollaborator,
  isReadOnly = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[280] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900/60 via-indigo-900/50 to-slate-900 p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  Colaboradores Recém-Cadastrados
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {collaborators.length} {collaborators.length === 1 ? 'pendente' : 'pendentes'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                Cadastrados nos últimos 30 dias que ainda não foram inseridos em nenhum posto. Ao alocar no posto, o colaborador é retirado automaticamente desta lista.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-3">
          {collaborators.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/20">
                <Sparkles size={28} />
              </div>
              <h4 className="text-base font-black text-white">Todos os colaboradores já foram alocados!</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Não há nenhum colaborador recém-cadastrado sem posto no momento. Assim que um novo colaborador for cadastrado, ele aparecerá aqui até que seja inserido em uma máquina ou turno.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {collaborators.map((col) => {
                const isOp = (col.role || '').toLowerCase().includes('operador');
                return (
                  <div
                    key={col.id}
                    className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/40 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1">
                        <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 rounded-md text-[10px] font-black uppercase tracking-wider font-mono border border-blue-500/30">
                          #{col.registration || 'S/M'}
                        </span>
                        <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1 bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-800/50">
                          <Sparkles size={11} />
                          {formatRecentRegistrationBadge(col)}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-black text-white group-hover:text-blue-400 transition-colors">
                          {col.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                            isOp ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                          }`}>
                            {col.role || 'Auxiliar de Produção'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-bold uppercase">Situação Atual:</span>
                        <span className="font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30 text-[9px] uppercase flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                          Sem Posto no Quadro
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-700/60">
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectToAllocate(col);
                            onClose();
                          }}
                          className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>Inserir no Posto</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onEditCollaborator(col);
                          onClose();
                        }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-colors border border-slate-700 cursor-pointer"
                        title="Editar cadastro no sistema"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentCollaboratorsModal;
