import React, { useState, useEffect } from 'react';
import { 
  X, 
  FolderPlus, 
  Trash2, 
  Plus, 
  Sparkles, 
  Check, 
  AlertTriangle,
  Layers,
  ChevronRight
} from 'lucide-react';
import { CustomSector } from '../types';
import { 
  SECTOR_PRESETS, 
  AVAILABLE_SECTOR_ICONS, 
  SECTOR_COLOR_THEMES,
  STANDARD_SECTORS,
  renderSectorIcon
} from '../utils/customSectors';

interface SectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (sectorData: Partial<CustomSector>) => Promise<void>;
  onDelete?: (sectorId: string) => Promise<void>;
  initialData?: CustomSector | null;
  existingSectorNames?: string[];
  allocatedEmployeesCount?: number;
}

export const SectorModal: React.FC<SectorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  existingSectorNames = [],
  allocatedEmployeesCount = 0
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Sparkles');
  const [colorTheme, setColorTheme] = useState('slate');
  const [shifts, setShifts] = useState<string[]>(['Comercial', 'Diurno 1']);
  const [newShiftInput, setNewShiftInput] = useState('');
  const [machines, setMachines] = useState<string[]>(['Geral']);
  const [newMachineInput, setNewMachineInput] = useState('');
  const [defaultCapacity, setDefaultCapacity] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setShowConfirmDelete(false);
      if (initialData) {
        setName(initialData.name || '');
        setDescription(initialData.description || '');
        setIcon(initialData.icon || 'Sparkles');
        setColorTheme(initialData.colorTheme || 'slate');
        setShifts(initialData.shifts && initialData.shifts.length > 0 ? initialData.shifts : ['Comercial']);
        setMachines(initialData.machines && initialData.machines.length > 0 ? initialData.machines : ['Geral']);
        setDefaultCapacity(initialData.defaultCapacity || 1);
      } else {
        // Default inicial para novo setor
        setName('');
        setDescription('');
        setIcon('Sparkles');
        setColorTheme('slate');
        setShifts(['Comercial', 'Diurno 1']);
        setMachines(['Geral', 'Limpeza']);
        setDefaultCapacity(1);
      }
      setNewShiftInput('');
      setNewMachineInput('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: typeof SECTOR_PRESETS[0]) => {
    setName(preset.name);
    setDescription(preset.description);
    setIcon(preset.icon);
    setColorTheme(preset.colorTheme);
    setShifts([...preset.shifts]);
    setMachines([...preset.machines]);
    setDefaultCapacity(preset.defaultCapacity);
    setErrorMsg('');
  };

  const handleAddShift = (shiftToAdd?: string) => {
    const val = (shiftToAdd || newShiftInput).trim();
    if (!val) return;
    if (shifts.includes(val)) {
      setNewShiftInput('');
      return;
    }
    setShifts(prev => [...prev, val]);
    setNewShiftInput('');
  };

  const handleRemoveShift = (shiftToRemove: string) => {
    if (shifts.length <= 1) {
      setErrorMsg('O setor deve ter pelo menos 1 turno configurado.');
      return;
    }
    setShifts(prev => prev.filter(s => s !== shiftToRemove));
    setErrorMsg('');
  };

  const handleAddMachine = () => {
    const val = newMachineInput.trim();
    if (!val) return;
    if (machines.includes(val)) {
      setNewMachineInput('');
      return;
    }
    setMachines(prev => [...prev, val]);
    setNewMachineInput('');
  };

  const handleRemoveMachine = (machineToRemove: string) => {
    if (machines.length <= 1) {
      setErrorMsg('O setor deve ter pelo menos 1 posto/máquina.');
      return;
    }
    setMachines(prev => prev.filter(m => m !== machineToRemove));
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Por favor, informe o nome do setor.');
      return;
    }

    // Verificar duplicação com setores existentes
    const isEditingCurrent = initialData && initialData.name.toLowerCase() === trimmedName.toLowerCase();
    if (!isEditingCurrent) {
      const allNamesLower = [
        ...STANDARD_SECTORS.map(s => s.toLowerCase()),
        ...existingSectorNames.map(s => s.toLowerCase())
      ];
      if (allNamesLower.includes(trimmedName.toLowerCase())) {
        setErrorMsg(`Já existe um setor cadastrado com o nome "${trimmedName}". Escolha outro nome.`);
        return;
      }
    }

    if (shifts.length === 0) {
      setErrorMsg('Adicione pelo menos um turno para o setor.');
      return;
    }

    if (machines.length === 0) {
      setErrorMsg('Adicione pelo menos um posto de trabalho ou máquina para o setor.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMsg('');
      await onSave({
        id: initialData?.id,
        name: trimmedName,
        description: description.trim(),
        icon,
        colorTheme,
        shifts,
        machines,
        defaultCapacity: Math.max(1, defaultCapacity)
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || 'Erro ao salvar o setor. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id || !onDelete) return;
    try {
      setIsDeleting(true);
      await onDelete(initialData.id);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Erro ao excluir o setor.');
    } finally {
      setIsDeleting(false);
    }
  };

  const activeTheme = SECTOR_COLOR_THEMES[colorTheme] || SECTOR_COLOR_THEMES.slate;

  return (
    <div className="fixed inset-0 z-[290] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header com prévia do tema */}
        <div className={`p-6 border-b ${activeTheme.headerBorder} ${activeTheme.headerBg} flex items-center justify-between shrink-0 transition-colors`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${activeTheme.iconBg}`}>
              {renderSectorIcon(icon, 24)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  {initialData ? 'Editar Setor' : 'Criar Novo Setor'}
                </h3>
                {name && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${activeTheme.badgeBg} ${activeTheme.badgeText}`}>
                    {name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 font-bold mt-0.5">
                Configure setores personalizados no Quadro Geral de Pessoal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          
          {errorMsg && (
            <div className="p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-300 text-xs font-bold animate-in fade-in duration-200">
              <AlertTriangle size={18} className="shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Presets Rápidos (só para novo setor) */}
          {!initialData && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles size={13} className="text-blue-400" />
                Sugestões Rápidas de Setor (1 Toque)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SECTOR_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="p-3 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 hover:border-blue-500/40 rounded-xl text-left transition-all group cursor-pointer flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-1.5 text-blue-400 mb-1">
                      {renderSectorIcon(p.icon, 14)}
                      <span className="text-[11px] font-black text-white group-hover:text-blue-300 truncate">
                        {p.name}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 line-clamp-1">
                      {p.machines.join(', ')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Nome e Descrição */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Nome do Setor <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setErrorMsg(''); }}
                placeholder="Ex: Serviços Gerais"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Descrição / Subtítulo
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Ex: Limpeza e apoio operacional"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Cor Temática do Setor */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Cor Visual do Setor no Quadro
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.values(SECTOR_COLOR_THEMES).map((theme) => {
                const isSelected = colorTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setColorTheme(theme.id)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                      isSelected 
                        ? `${theme.headerBg} border-blue-400 ring-2 ring-blue-500/30 text-white shadow-md` 
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full ${theme.iconBg}`} />
                      <span className="text-[11px] font-bold">{theme.name}</span>
                    </div>
                    {isSelected && <Check size={14} className="text-blue-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seleção de Ícone */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Ícone do Setor
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {AVAILABLE_SECTOR_ICONS.map((item) => {
                const isSelected = icon === item.id;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIcon(item.id)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600/30 border-blue-500 text-blue-300 shadow-md ring-2 ring-blue-500/20'
                        : 'bg-slate-800/70 border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title={item.label}
                  >
                    <IconComponent size={20} />
                    <span className="text-[9px] font-bold truncate max-w-full">{item.label.split(' / ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Turnos do Setor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Turnos de Trabalho do Setor
              </label>
              <span className="text-[10px] text-slate-500">
                {shifts.length} {shifts.length === 1 ? 'turno configurado' : 'turnos configurados'}
              </span>
            </div>

            {/* Chips de turnos já ativos */}
            <div className="flex flex-wrap gap-2 p-3 bg-slate-800/60 rounded-2xl border border-slate-700/80 min-h-[46px]">
              {shifts.map((sh) => (
                <span
                  key={sh}
                  className="px-3 py-1 bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs border border-slate-600"
                >
                  <span>{sh}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveShift(sh)}
                    className="hover:text-rose-400 transition-colors cursor-pointer"
                    title={`Remover turno ${sh}`}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>

            {/* Atalhos para adicionar turnos comuns */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Adicionar:</span>
              {['Comercial', 'Diurno 1', 'Diurno 2', 'Noturno 1', 'Noturno 2'].map((presetShift) => {
                const alreadyHas = shifts.includes(presetShift);
                return (
                  <button
                    key={presetShift}
                    type="button"
                    disabled={alreadyHas}
                    onClick={() => handleAddShift(presetShift)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide border transition-all cursor-pointer ${
                      alreadyHas 
                        ? 'opacity-40 cursor-not-allowed bg-slate-800 border-slate-700 text-slate-500' 
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    + {presetShift}
                  </button>
                );
              })}
            </div>

            {/* Input para turno livre */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newShiftInput}
                onChange={e => setNewShiftInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddShift(); } }}
                placeholder="Ou digite outro turno (ex: Administrativo, Escala 12x36)"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-white placeholder-slate-500 outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => handleAddShift()}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus size={14} />
                <span>Adicionar</span>
              </button>
            </div>
          </div>

          {/* Postos / Máquinas / Sub-áreas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Postos de Trabalho / Máquinas / Sub-áreas
              </label>
              <span className="text-[10px] text-slate-500">
                {machines.length} {machines.length === 1 ? 'posto configurado' : 'postos configurados'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 p-3 bg-slate-800/60 rounded-2xl border border-slate-700/80 min-h-[46px]">
              {machines.map((ma) => (
                <span
                  key={ma}
                  className="px-3 py-1 bg-blue-900/40 text-blue-200 border border-blue-700/50 rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs"
                >
                  <span>{ma}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveMachine(ma)}
                    className="hover:text-rose-400 transition-colors cursor-pointer"
                    title={`Remover posto ${ma}`}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newMachineInput}
                onChange={e => setNewMachineInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddMachine(); } }}
                placeholder="Ex: Geral, Limpeza, Área Externa, Portaria, Almoxarifado"
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-white placeholder-slate-500 outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleAddMachine}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus size={14} />
                <span>Adicionar Posto</span>
              </button>
            </div>
          </div>

          {/* Vagas mínimas por posto */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Capacidade Padrão de Vagas por Posto/Turno
              </label>
              <span className="text-xs font-black text-white">{defaultCapacity} {defaultCapacity === 1 ? 'vaga' : 'vagas'}</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setDefaultCapacity(num)}
                  className={`flex-1 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    defaultCapacity === num
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {num} {num === 1 ? 'Slot' : 'Slots'}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500">
              Define quantos cartões de vaga serão gerados inicialmente em cada máquina/turno do setor.
            </p>
          </div>

          {/* Confirmação de exclusão se estiver editando */}
          {initialData && onDelete && (
            <div className="pt-4 border-t border-slate-800">
              {showConfirmDelete ? (
                <div className="p-4 bg-rose-500/15 border border-rose-500/30 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                    <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                    <span>Tem certeza que deseja excluir o setor "{initialData.name}"?</span>
                  </div>
                  {allocatedEmployeesCount > 0 && (
                    <p className="text-[11px] text-rose-200">
                      Atenção: Existem <strong>{allocatedEmployeesCount}</strong> colaboradores alocados neste setor no Quadro Geral.
                    </p>
                  )}
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(false)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleDelete}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-500">
                    {allocatedEmployeesCount > 0 
                      ? `${allocatedEmployeesCount} colaboradores alocados neste setor` 
                      : 'Nenhum colaborador alocado'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Excluir este Setor</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Botões do Rodapé */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`px-6 py-2.5 ${activeTheme.accentBtn} rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95`}
            >
              <Check size={16} />
              <span>{isSaving ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Criar Setor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SectorModal;
