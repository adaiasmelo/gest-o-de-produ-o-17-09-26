import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, Edit3, Check, RotateCcw, AlertTriangle, 
  FolderPlus, Wrench, Settings, Package, Layers, Search
} from 'lucide-react';
import { 
  getStoredDowntimePresets, 
  saveStoredDowntimePresets, 
  resetDowntimePresetsToDefault,
  StoredDowntimePresets,
  DowntimeCategoryGroup
} from '../constants/downtimeReasons';

interface DowntimeReasonsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DowntimeReasonsModal: React.FC<DowntimeReasonsModalProps> = ({ isOpen, onClose }) => {
  const [presets, setPresets] = useState<StoredDowntimePresets>(() => getStoredDowntimePresets());
  const [activeCategory, setActiveCategory] = useState<'manutencao' | 'processo' | 'outros'>('manutencao');
  
  const [newReasonText, setNewReasonText] = useState('');
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(0);
  
  const [newGroupName, setNewGroupName] = useState('');
  const [isAddingGroup, setIsAddingGroup] = useState(false);

  const [editingItem, setEditingItem] = useState<{
    category: 'manutencao' | 'processo' | 'outros';
    groupIndex: number;
    reasonIndex: number;
    text: string;
  } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  // Reload presets if modal opens or when external changes occur
  useEffect(() => {
    if (isOpen) {
      setPresets(getStoredDowntimePresets());
    }
  }, [isOpen]);

  const currentGroupsKey: 'manutencaoGroups' | 'processoGroups' | 'outrosGroups' = 
    activeCategory === 'manutencao' 
      ? 'manutencaoGroups' 
      : activeCategory === 'processo' 
        ? 'processoGroups' 
        : 'outrosGroups';

  const currentGroups = presets[currentGroupsKey] || [];

  if (!isOpen) return null;

  const handleAddReason = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReasonText.trim()) return;

    if (currentGroups.length === 0) {
      alert('Crie ou selecione um grupo primeiro.');
      return;
    }

    const groupIdx = Math.max(0, Math.min(selectedGroupIndex, currentGroups.length - 1));
    const targetGroup = currentGroups[groupIdx];

    if (!targetGroup) return;

    // Check duplicate
    if (targetGroup.reasons.some(r => r.trim().toLowerCase() === newReasonText.trim().toLowerCase())) {
      alert('Este motivo já existe neste grupo!');
      return;
    }

    const updatedGroups = [...currentGroups];
    updatedGroups[groupIdx] = {
      ...targetGroup,
      reasons: [...targetGroup.reasons, newReasonText.trim()]
    };

    const newPresets = {
      ...presets,
      [currentGroupsKey]: updatedGroups
    };

    setPresets(newPresets);
    saveStoredDowntimePresets(newPresets);
    setNewReasonText('');
  };

  const handleAddGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const groupNameUpper = newGroupName.trim().toUpperCase();

    if (currentGroups.some(g => g.groupName.trim().toUpperCase() === groupNameUpper)) {
      alert('Já existe um grupo com este nome!');
      return;
    }

    const newGroup: DowntimeCategoryGroup = {
      groupName: groupNameUpper,
      reasons: []
    };

    const updatedGroups = [...currentGroups, newGroup];
    const newPresets = {
      ...presets,
      [currentGroupsKey]: updatedGroups
    };

    setPresets(newPresets);
    saveStoredDowntimePresets(newPresets);
    setNewGroupName('');
    setIsAddingGroup(false);
    setSelectedGroupIndex(updatedGroups.length - 1);
  };

  const handleSaveEdit = () => {
    if (!editingItem || !editingItem.text.trim()) return;

    const key = editingItem.category === 'manutencao'
      ? 'manutencaoGroups'
      : editingItem.category === 'processo'
        ? 'processoGroups'
        : 'outrosGroups';

    const categoryGroups = [...presets[key]];
    const group = categoryGroups[editingItem.groupIndex];

    if (!group) return;

    const updatedReasons = [...group.reasons];
    updatedReasons[editingItem.reasonIndex] = editingItem.text.trim();

    categoryGroups[editingItem.groupIndex] = {
      ...group,
      reasons: updatedReasons
    };

    const newPresets = {
      ...presets,
      [key]: categoryGroups
    };

    setPresets(newPresets);
    saveStoredDowntimePresets(newPresets);
    setEditingItem(null);
  };

  const handleDeleteReason = (groupIndex: number, reasonIndex: number) => {
    const group = currentGroups[groupIndex];
    if (!group) return;

    const reasonToDelete = group.reasons[reasonIndex];
    if (!confirm(`Tem certeza que deseja excluir o motivo:\n\n"${reasonToDelete}"?`)) {
      return;
    }

    const updatedReasons = group.reasons.filter((_, idx) => idx !== reasonIndex);
    const updatedGroups = [...currentGroups];
    updatedGroups[groupIndex] = {
      ...group,
      reasons: updatedReasons
    };

    const newPresets = {
      ...presets,
      [currentGroupsKey]: updatedGroups
    };

    setPresets(newPresets);
    saveStoredDowntimePresets(newPresets);
  };

  const handleDeleteGroup = (groupIndex: number) => {
    const group = currentGroups[groupIndex];
    if (!group) return;

    if (!confirm(`Tem certeza que deseja excluir todo o grupo "${group.groupName}" e seus ${group.reasons.length} motivos?`)) {
      return;
    }

    const updatedGroups = currentGroups.filter((_, idx) => idx !== groupIndex);
    const newPresets = {
      ...presets,
      [currentGroupsKey]: updatedGroups
    };

    setPresets(newPresets);
    saveStoredDowntimePresets(newPresets);
    if (selectedGroupIndex >= updatedGroups.length) {
      setSelectedGroupIndex(Math.max(0, updatedGroups.length - 1));
    }
  };

  const handleResetToDefaults = () => {
    if (confirm('Deseja restaurar a lista de motivos para o padrão de fábrica? Todas as customizações feitas serão redefinidas.')) {
      const defaultPresets = resetDowntimePresetsToDefault();
      setPresets(defaultPresets);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-3 md:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white rounded-[2rem] md:rounded-[3rem] w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh] border border-slate-200" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-6 md:px-8 py-5 md:py-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm">
              <Layers size={24} />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight">Gerenciar Motivos de Parada</h3>
              <p className="text-[10px] md:text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">Adicione, edite ou exclua motivos padronizados de parada</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-2xl transition-all active:scale-95">
            <X size={24} />
          </button>
        </div>

        {/* Category Navigation Tabs */}
        <div className="bg-slate-50 border-b border-slate-150 px-6 py-3 shrink-0 flex flex-wrap gap-2 justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => { setActiveCategory('manutencao'); setSelectedGroupIndex(0); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase transition-all ${
                activeCategory === 'manutencao'
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Wrench size={16} /> Manutenção
            </button>
            <button
              onClick={() => { setActiveCategory('processo'); setSelectedGroupIndex(0); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase transition-all ${
                activeCategory === 'processo'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Settings size={16} /> Processo
            </button>
            <button
              onClick={() => { setActiveCategory('outros'); setSelectedGroupIndex(0); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase transition-all ${
                activeCategory === 'outros'
                  ? 'bg-slate-700 text-white shadow-md shadow-slate-300'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Package size={16} /> Outros
            </button>
          </div>

          <button
            onClick={handleResetToDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
            title="Restaurar padrão de fábrica"
          >
            <RotateCcw size={14} /> Restaurar Padrão
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="p-6 md:p-8 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
          
          {/* Top Form: Add new reason or group */}
          <div className="bg-slate-50 p-5 md:p-6 rounded-3xl border border-slate-200/80 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
                <Plus size={16} className="text-blue-600" /> Adicionar Novo Motivo de Parada
              </h4>
              <button
                type="button"
                onClick={() => setIsAddingGroup(!isAddingGroup)}
                className="text-[10px] font-black uppercase text-blue-600 hover:underline flex items-center gap-1"
              >
                <FolderPlus size={14} /> {isAddingGroup ? 'Cancelar Novo Grupo' : '+ Criar Novo Grupo'}
              </button>
            </div>

            {/* Create New Group Form */}
            {isAddingGroup ? (
              <form onSubmit={handleAddGroup} className="flex gap-2 items-center bg-blue-50/60 p-3 rounded-2xl border border-blue-100">
                <input
                  type="text"
                  placeholder="NOME DO NOVO GRUPO (Ex: ⚡ SISTEMA DE SEGURANÇA)..."
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  className="flex-1 bg-white border border-blue-200 rounded-xl px-4 py-2.5 text-xs font-black text-slate-800 outline-none uppercase"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase hover:bg-blue-700 transition-all shadow-md shrink-0"
                >
                  Criar Grupo
                </button>
              </form>
            ) : (
              /* Add Reason Form */
              <form onSubmit={handleAddReason} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-4 space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Grupo Alvo</label>
                  <select
                    value={selectedGroupIndex}
                    onChange={e => setSelectedGroupIndex(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {currentGroups.map((g, idx) => (
                      <option key={idx} value={idx}>{g.groupName} ({g.reasons.length})</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-6 space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Descrição do Motivo</label>
                  <input
                    type="text"
                    placeholder="Ex: ⚡ ELÉTRICA - Falha na Bobina de Aquecimento..."
                    value={newReasonText}
                    onChange={e => setNewReasonText(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-extrabold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-1"
                  >
                    <Plus size={16} /> Adicionar
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Pesquisar motivo cadastrado..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-blue-400 transition-all"
            />
          </div>

          {/* Groups List */}
          <div className="space-y-6">
            {currentGroups.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 font-bold text-xs">
                Nenhum grupo de motivos cadastrado nesta categoria. Clique em "+ Criar Novo Grupo" acima para começar.
              </div>
            ) : (
              currentGroups.map((group, groupIdx) => {
                const filteredReasons = group.reasons.filter(r => 
                  !searchTerm || r.toLowerCase().includes(searchTerm.toLowerCase())
                );

                if (searchTerm && filteredReasons.length === 0) return null;

                return (
                  <div key={groupIdx} className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
                    {/* Group Header */}
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-150 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">{group.groupName}</h4>
                        <span className="text-[10px] font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                          {group.reasons.length} motivos
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteGroup(groupIdx)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Excluir grupo inteiro"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Reasons List */}
                    <div className="divide-y divide-slate-100">
                      {filteredReasons.length === 0 ? (
                        <div className="p-4 text-center text-[11px] font-bold text-slate-400 italic">
                          Grupo vazio. Use o formulário acima para cadastrar motivos neste grupo.
                        </div>
                      ) : (
                        filteredReasons.map((reason, reasonIdx) => {
                          const isEditing = editingItem && 
                            editingItem.category === activeCategory && 
                            editingItem.groupIndex === groupIdx && 
                            editingItem.reasonIndex === reasonIdx;

                          return (
                            <div key={reasonIdx} className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-all">
                              {isEditing ? (
                                <div className="flex-1 flex gap-2 items-center">
                                  <input
                                    type="text"
                                    value={editingItem.text}
                                    onChange={e => setEditingItem({ ...editingItem, text: e.target.value })}
                                    className="flex-1 bg-white border border-blue-400 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={handleSaveEdit}
                                    className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-sm"
                                    title="Salvar alteração"
                                  >
                                    <Check size={16} />
                                  </button>
                                  <button
                                    onClick={() => setEditingItem(null)}
                                    className="p-2 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-all"
                                    title="Cancelar"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span className="text-xs font-bold text-slate-700 tracking-tight leading-relaxed">
                                    {reason}
                                  </span>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => setEditingItem({
                                        category: activeCategory,
                                        groupIndex: groupIdx,
                                        reasonIndex: reasonIdx,
                                        text: reason
                                      })}
                                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                      title="Editar texto deste motivo"
                                    >
                                      <Edit3 size={15} />
                                    </button>

                                    <button
                                      onClick={() => handleDeleteReason(groupIdx, reasonIdx)}
                                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                      title="Excluir este motivo"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 md:px-8 py-4 bg-slate-50 border-t border-slate-150 flex justify-between items-center shrink-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
            As alterações são aplicadas imediatamente a todos os seletores do sistema.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 text-white rounded-2xl text-xs font-black uppercase hover:bg-slate-900 transition-all shadow-md"
          >
            Concluir
          </button>
        </div>

      </div>
    </div>
  );
};
