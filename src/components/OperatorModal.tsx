
import React, { useState } from 'react';
import { X, Plus, Trash2, Users, Save } from 'lucide-react';

interface OperatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  operators: string[];
  onUpdate: (operators: string[]) => void;
}

const OperatorModal: React.FC<OperatorModalProps> = ({ isOpen, onClose, operators, onUpdate }) => {
  const [newOp, setNewOp] = useState('');

  if (!isOpen) return null;

  const handleAdd = () => {
    if (newOp.trim() && !operators.includes(newOp.trim())) {
      onUpdate([...operators, newOp.trim()]);
      setNewOp('');
    }
  };

  const handleRemove = (name: string) => {
    onUpdate(operators.filter(o => o !== name));
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
        <div className="bg-[#1e293b] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight uppercase">Operadores</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gestão de Equipe</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition-colors text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1 overflow-hidden flex flex-col">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adicionar Novo</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newOp}
                onChange={e => setNewOp(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Digite o nome..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
              />
              <button 
                onClick={handleAdd}
                className="bg-blue-600 text-white p-3 rounded-2xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Equipe Cadastrada ({operators.length})</label>
            {operators.length > 0 ? (
              operators.map((op, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-blue-100 transition-all group animate-in slide-in-from-right-2" style={{ animationDelay: `${idx * 50}ms` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase">
                      {op.substring(0, 2)}
                    </div>
                    <span className="text-sm font-bold text-slate-700">{op}</span>
                  </div>
                  <button 
                    onClick={() => handleRemove(op)}
                    className="text-slate-300 hover:text-red-500 transition-colors p-2"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-300 italic text-sm">Nenhum operador cadastrado.</div>
            )}
          </div>
          
          <div className="pt-4 border-t border-slate-100">
             <button 
                onClick={onClose}
                className="w-full py-4 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-slate-200 hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
              >
                <Save size={16} /> Concluir
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperatorModal;
