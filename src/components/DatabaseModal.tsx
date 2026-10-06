import React, { useState, useMemo } from 'react';
import { X, Search, Plus, Trash2, Database, ShieldCheck, UserPlus, HardHat, Briefcase, Factory, UserX, Edit2, VolumeX, Volume2, RotateCcw, AlertTriangle, ShieldAlert, Sparkles, Clock } from 'lucide-react';
import { Employee, EmployeeStatus, Collaborator } from '../types';
import { db } from '../lib/firebase';
import { setDoc, doc } from 'firebase/firestore';
import { IMPORTED_COLLABORATORS } from '../constants/importedCollaborators';
import { isRecentCollaborator, getRecentCollaborators, formatRecentRegistrationBadge } from '../utils/recentCollaborators';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  collaborators: Collaborator[];
  onAdd: (employee: Omit<Employee, 'id' | 'updatedAt'>) => void;
  onDelete: (id: string, name: string) => void;
  onTerminate: (id: string, name: string) => void;
  onEditCollaborator: (collaborator: Collaborator) => void;
  onToggleSilenceCollaborator?: (collaborator: Collaborator, shouldSilence: boolean, reason?: string) => Promise<void> | void;
  onAllocateCollaborator?: (collaborator: Collaborator) => void;
  availableRoles: string[];
  availableShifts: string[];
  machines: string[];
  isReadOnly?: boolean;
  onBlockedAction?: (title?: string, message?: string) => void;
}

const DatabaseModal: React.FC<DatabaseModalProps> = ({ 
  isOpen, 
  onClose, 
  employees, 
  collaborators,
  onAdd, 
  onDelete,
  onTerminate,
  onEditCollaborator,
  onToggleSilenceCollaborator,
  onAllocateCollaborator,
  availableRoles,
  availableShifts,
  machines,
  isReadOnly = false,
  onBlockedAction
}) => {
  const [activeTab, setActiveTab] = useState<'allocations' | 'collaborators' | 'silenced' | 'general'>('allocations');
  const [searchTerm, setSearchTerm] = useState('');
  const [colSearchTerm, setColSearchTerm] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isColDropdownOpen, setIsColDropdownOpen] = useState(false);
  
  // Modals
  const [confirmModal, setConfirmModal] = useState<{ id: string, name: string, type: 'delete' | 'terminate' } | null>(null);
  const [silenceModal, setSilenceModal] = useState<{ collaborator: Collaborator, shouldSilence: boolean } | null>(null);
  const [silenceReasonInput, setSilenceReasonInput] = useState('');
  const [showExcludedSlots, setShowExcludedSlots] = useState(false);

  const [newEmp, setNewEmp] = useState({
    name: '',
    role: availableRoles[0] || '',
    sector: 'Extrusão',
    machine: machines[0] || 'Cast 1',
    shift: availableShifts[0] || 'Diurno 1',
    status: 'Ativo' as EmployeeStatus,
    collaboratorId: ''
  });

  // Active (non-silenced) vs Silenced Collaborators
  const activeCollaborators = useMemo(() => {
    return collaborators.filter(c => !c.isSilenced);
  }, [collaborators]);

  const silencedCollaborators = useMemo(() => {
    return collaborators.filter(c => !!c.isSilenced);
  }, [collaborators]);

  const recentCollaborators = useMemo(() => {
    return getRecentCollaborators(activeCollaborators, 30);
  }, [activeCollaborators]);

  const filteredCollaboratorsForSelect = useMemo(() => {
    if (!colSearchTerm) return activeCollaborators;
    const term = (colSearchTerm || '').trim().toLowerCase();
    return activeCollaborators.filter(c => 
      String(c?.name || '').toLowerCase().includes(term) ||
      String(c?.registration || '').includes(term)
    );
  }, [activeCollaborators, colSearchTerm]);

  const uniqueRoles = Array.from(new Set(availableRoles));
  const uniqueShifts = Array.from(new Set(availableShifts));
  const uniqueMachines = Array.from(new Set(machines));

  const shiftsForDatabaseSector = useMemo(() => {
    const s = newEmp.sector ? newEmp.sector.toLowerCase() : '';
    if (s.includes('extrusão') || s.includes('extrusao')) {
      return ['Diurno 1', 'Noturno 1', 'Diurno 2', 'Noturno 2'];
    }
    if (s.includes('liderança') || s.includes('lideranca')) {
      return ['Integral', 'Dia', 'Noite'];
    }
    if (s.includes('reciclagem')) {
      return ['Diurno 1', 'Diurno 2'];
    }
    if (s.includes('fita')) {
      return ['Diurno 1', 'Diurno 2', 'Comercial'];
    }
    return [...uniqueShifts, 'Integral'];
  }, [newEmp.sector, uniqueShifts]);

  const handleDatabaseSectorChange = (sector: string) => {
    const s = sector.toLowerCase();
    let defaultShift = 'Diurno 1';
    let defaultMachine = 'Cast 1';
    if (s.includes('liderança') || s.includes('lideranca')) {
      defaultShift = 'Integral';
      defaultMachine = 'Geral';
    } else if (s.includes('reciclagem')) {
      defaultShift = 'Diurno 1';
      defaultMachine = 'Erema 1';
    } else if (s.includes('fita')) {
      defaultShift = 'Comercial';
      defaultMachine = 'Ghezzi';
    }
    setNewEmp(prev => ({
      ...prev,
      sector,
      shift: defaultShift,
      machine: defaultMachine
    }));
  };

  if (!isOpen) return null;

  const filteredEmployees = employees.filter(e => {
    const statusNorm = (e.status || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    const nameNorm = (e.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    const isExcluded = statusNorm.includes('excluid') || nameNorm.includes('excluid') || statusNorm.includes('silenciad') || e.isSilenced;
    if (isExcluded && !showExcludedSlots) return false;
    const term = (searchTerm || '').trim().toLowerCase();
    return (
      String(e?.name || '').toLowerCase().includes(term) ||
      String(e?.role || '').toLowerCase().includes(term) ||
      String(e?.sector || '').toLowerCase().includes(term) ||
      String(e?.machine || '').toLowerCase().includes(term)
    );
  }).sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));

  const filteredCollaboratorsList = activeCollaborators.filter(c => {
    const term = (searchTerm || '').trim().toLowerCase();
    return (
      String(c?.name || '').toLowerCase().includes(term) ||
      String(c?.registration || '').includes(term) ||
      String(c?.role || '').toLowerCase().includes(term)
    );
  }).sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));

  const filteredSilencedList = silencedCollaborators.filter(c => {
    const term = (searchTerm || '').trim().toLowerCase();
    return (
      String(c?.name || '').toLowerCase().includes(term) ||
      String(c?.registration || '').includes(term) ||
      String(c?.role || '').toLowerCase().includes(term)
    );
  }).sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));

  const filteredImportedCollaborators = useMemo(() => {
    if (!searchTerm) return IMPORTED_COLLABORATORS;
    const term = (searchTerm || '').trim().toLowerCase();
    return IMPORTED_COLLABORATORS.filter(c => 
      String(c?.name || '').toLowerCase().includes(term) ||
      String(c?.registration || '').includes(term) ||
      String(c?.role || '').toLowerCase().includes(term)
    ).sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
  }, [searchTerm]);

  const handleAdd = () => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Alocação Bloqueada', 'A alocação ou adição de vagas não é permitida no Modo de Leitura.');
      } else {
        alert('Operação não permitida no Modo de Leitura.');
      }
      return;
    }
    if (!newEmp.name.trim() && newEmp.status !== 'Em Contratação') {
      alert('Por favor, selecione um colaborador.');
      return;
    }
    
    const empToSave = { ...newEmp };
    if (newEmp.status === 'Em Contratação' && !newEmp.name.trim()) {
      empToSave.name = 'Em Contratação';
    }
    
    onAdd(empToSave);
    setNewEmp({
      name: '',
      role: availableRoles[0] || '',
      sector: 'Extrusão',
      machine: machines[0] || 'Cast 1',
      shift: availableShifts[0] || 'Diurno 1',
      status: 'Ativo' as EmployeeStatus,
      collaboratorId: ''
    });
    setColSearchTerm('');
  };

  const handleExecuteSilence = async () => {
    if (!silenceModal) return;
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Alteração Bloqueada', 'O silenciamento ou reativação de alertas de colaboradores não é permitido no Modo de Leitura.');
      } else {
        alert('Operação não permitida no Modo de Leitura.');
      }
      setSilenceModal(null);
      return;
    }
    if (onToggleSilenceCollaborator) {
      await onToggleSilenceCollaborator(
        silenceModal.collaborator,
        silenceModal.shouldSilence,
        silenceReasonInput.trim() || undefined
      );
    } else {
      // Direct Firestore fallback
      try {
        const colRef = doc(db, 'collaborators', silenceModal.collaborator.id);
        await setDoc(colRef, {
          isSilenced: silenceModal.shouldSilence,
          silencedAt: silenceModal.shouldSilence ? new Date().toISOString() : null,
          silenceReason: silenceModal.shouldSilence ? (silenceReasonInput.trim() || 'Silenciado via Base de Dados') : null,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error('Error toggling silence:', err);
      }
    }
    setSilenceModal(null);
    setSilenceReasonInput('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-6xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 md:px-8 py-4 md:py-6 flex flex-col md:flex-row items-center justify-between border-b border-slate-800 gap-4 shrink-0">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 w-full md:w-auto">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-emerald-500/20 rounded-xl md:rounded-2xl flex items-center justify-center text-emerald-400 border border-emerald-500/30 shrink-0">
                <Database size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base md:text-xl font-black tracking-tight uppercase truncate">Base de Dados</h2>
                <p className="text-[9px] md:text-[10px] text-emerald-400 font-bold uppercase tracking-widest md:tracking-[0.2em]">Gestão de Pessoal</p>
              </div>
              <button onClick={onClose} className="md:hidden bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 p-2.5 rounded-xl transition-all border border-slate-700 shrink-0">
                <X size={18} />
              </button>
            </div>

            <div className="flex bg-slate-800 p-1 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar gap-1">
              <button 
                onClick={() => { setActiveTab('allocations'); setSearchTerm(''); }}
                className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'allocations' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-950/40' : 'text-slate-400 hover:text-white'}`}
              >
                Alocações
              </button>
              <button 
                onClick={() => { setActiveTab('collaborators'); setSearchTerm(''); }}
                className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'collaborators' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-950/40' : 'text-slate-400 hover:text-white'}`}
              >
                Cadastro Global
                <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full ${activeTab === 'collaborators' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-700 text-slate-300'}`}>
                  {activeCollaborators.length}
                </span>
                {recentCollaborators.length > 0 && (
                  <span className="text-[8px] font-black px-1.5 py-0.2 rounded-full bg-blue-500 text-white animate-pulse shadow-xs">
                    ✨ {recentCollaborators.length} novos
                  </span>
                )}
              </button>
              <button 
                onClick={() => { setActiveTab('silenced'); setSearchTerm(''); }}
                className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'silenced' ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-950/40' : 'text-slate-400 hover:text-white'}`}
              >
                <VolumeX size={12} />
                Silenciados
                {silencedCollaborators.length > 0 && (
                  <span className="text-[8px] font-black px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950">
                    {silencedCollaborators.length}
                  </span>
                )}
              </button>
              <button 
                onClick={() => { setActiveTab('general'); setSearchTerm(''); }}
                className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'general' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-950/40' : 'text-slate-400 hover:text-white'}`}
              >
                GERAL
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-6 w-full md:w-auto">
            {activeTab === 'allocations' && (
              <button
                type="button"
                onClick={() => setShowExcludedSlots(!showExcludedSlots)}
                className={`px-3 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider border transition-all shrink-0 ${
                  showExcludedSlots 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-600'
                }`}
              >
                {showExcludedSlots ? 'Ocultar Excluídas' : 'Mostrar Excluídas'}
              </button>
            )}
            <div className="relative group flex-1 md:flex-none">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-800 border-none text-white pl-10 md:pl-12 pr-4 md:pr-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500/50 w-full md:w-64 transition-all outline-none"
              />
            </div>
            <button onClick={onClose} className="hidden md:block bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 p-3 rounded-2xl transition-all border border-slate-700 shrink-0">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab 1: Alocações */}
        {activeTab === 'allocations' && (
          <>
            {/* Quick Add Form */}
            <div className="bg-slate-50 border-b border-slate-200 p-6 flex flex-wrap items-end gap-4 relative z-20">
              <div className="flex-1 min-w-[240px] space-y-1.5 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Selecionar Colaborador</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    placeholder="Pesquisar na base central..."
                    value={colSearchTerm}
                    onChange={(e) => {
                      setColSearchTerm(e.target.value);
                      setIsColDropdownOpen(true);
                    }}
                    onFocus={() => setIsColDropdownOpen(true)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />

                  {isColDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsColDropdownOpen(false)}></div>
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-48 overflow-y-auto custom-scrollbar">
                        {filteredCollaboratorsForSelect.length > 0 ? (
                          filteredCollaboratorsForSelect.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setNewEmp({
                                  ...newEmp, 
                                  name: c.name, 
                                  collaboratorId: c.id, 
                                  role: c.role || newEmp.role
                                });
                                setColSearchTerm(c.name);
                                setIsColDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-2.5 hover:bg-emerald-50 transition-colors border-b border-slate-50 last:border-0"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-xs font-black text-slate-700">{c.name}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">{c.role}</p>
                                </div>
                                <span className="text-[9px] font-mono font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">#{c.registration}</span>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-6 text-center text-[10px] font-bold text-slate-400 italic">
                            Colaborador ativo não encontrado.
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="w-40 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cargo</label>
                <select 
                  value={newEmp.role}
                  onChange={(e) => setNewEmp({...newEmp, role: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none h-[42px]"
                >
                  {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="w-40 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Setor</label>
                <select 
                  value={newEmp.sector}
                  onChange={(e) => handleDatabaseSectorChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none h-[42px]"
                >
                  {['Extrusão', 'Reciclagem', 'Fita', 'Liderança'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="w-40 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Máquina</label>
                <select 
                  value={newEmp.machine}
                  onChange={(e) => setNewEmp({...newEmp, machine: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none h-[42px]"
                >
                  {uniqueMachines.map(m => <option key={m} value={m}>{m}</option>)}
                  <option value="Geral">Geral</option>
                </select>
              </div>
              <div className="w-44 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Turno</label>
                <select 
                  value={newEmp.shift}
                  onChange={(e) => setNewEmp({...newEmp, shift: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none h-[42px]"
                >
                  {shiftsForDatabaseSector.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="w-32 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Status</label>
                <select 
                  value={newEmp.status}
                  onChange={(e) => setNewEmp({...newEmp, status: e.target.value as EmployeeStatus})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none h-[42px]"
                >
                  {['Ativo', 'Férias', 'Atestado', 'Desligado', 'Em Contratação'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button 
                onClick={handleAdd}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-[42px] px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-200 active:scale-95"
              >
                <Plus size={18} />
                <span className="text-[11px] font-black uppercase">Incluir</span>
              </button>
            </div>

            {/* Allocations Table */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full border-collapse text-left">
                <thead className="bg-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Matrícula</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Setor / Máquina</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Turno</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-8 py-20 text-center text-slate-400 font-medium">Nenhum registro encontrado no banco de dados.</td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.id} className={`hover:bg-slate-50 transition-colors group ${emp.status === 'Vaga Excluída' ? 'opacity-60 bg-slate-50/50' : ''}`}>
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                              {emp.name.substring(0, 2)}
                            </div>
                            <span className={`text-sm font-bold ${emp.status === 'Vaga Excluída' ? 'text-slate-400 italic line-through' : 'text-slate-800'}`}>{emp.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-xs font-black text-slate-400 font-mono">#{emp.registration || '----'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-tight">
                            {emp.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">{emp.sector}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{emp.machine}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-slate-600">{emp.shift}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wide
                            ${emp.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 
                              emp.status === 'Férias' ? 'bg-orange-100 text-orange-700' :
                              emp.status === 'Em Contratação' ? 'bg-blue-100 text-blue-700' :
                              emp.status === 'Desligado' ? 'bg-red-100 text-red-700' : 
                              emp.status === 'Silenciado' ? 'bg-amber-100 text-amber-800' :
                              emp.status === 'Vaga Excluída' ? 'bg-slate-100 text-slate-500 border border-dashed border-slate-200' : 'bg-purple-100 text-purple-700'}
                          `}>
                            {emp.status}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 px-1">
                            {emp.status !== 'Vaga Excluída' && (
                              <button 
                                onClick={() => setConfirmModal({ id: emp.id, name: emp.name, type: 'terminate' })}
                                className="p-2.5 bg-orange-50 text-orange-400 hover:bg-orange-500 hover:text-white rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-sm shadow-orange-100"
                                title="Desligar e abrir vaga"
                              >
                                <UserX size={16} />
                              </button>
                            )}
                            <button 
                              onClick={() => setConfirmModal({ id: emp.id, name: emp.name, type: 'delete' })}
                              className="p-2.5 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-sm shadow-red-100"
                              title={emp.status === 'Vaga Excluída' ? "Excluir permanentemente (Restaurar Vaga)" : "Excluir (Remover Slot)"}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Tab 2: Cadastro Global (Apenas Ativos) */}
        {activeTab === 'collaborators' && (
          <>
            {/* Bulk Import Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200 px-8 py-5 flex items-center justify-between flex-wrap gap-4 select-none shrink-0 animate-in fade-in duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
                  <UserPlus size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Cadastro Central de Colaboradores (Ativos)</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Base principal de funcionários ativos. Colaboradores demitidos/afastados podem ser silenciados.</p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={async () => {
                  if (isReadOnly) {
                    if (onBlockedAction) {
                      onBlockedAction('Importação Bloqueada', 'A importação e sincronização de colaboradores não é permitida no Modo de Leitura.');
                    } else {
                      alert('Operação não permitida no Modo de Leitura.');
                    }
                    return;
                  }
                  if (window.confirm("Deseja sincronizar todos os 75 colaboradores da planilha de pessoal do PDF? Registros com a mesma matrícula serão atualizados/preservados.")) {
                    setIsImporting(true);
                    try {
                      let count = 0;
                      for (const item of IMPORTED_COLLABORATORS) {
                        const stableId = `col_${item.registration}`;
                        await setDoc(doc(db, 'collaborators', stableId), {
                          id: stableId,
                          registration: item.registration,
                          name: item.name,
                          role: item.role,
                          updatedAt: new Date().toISOString()
                        }, { merge: true });
                        count++;
                      }
                      alert(`Sucesso! ${count} colaboradores foram carregados/sincronizados no Cadastro Global.`);
                    } catch (err) {
                      console.error(err);
                      alert("Erro ao carregar colaboradores.");
                    } finally {
                      setIsImporting(false);
                    }
                  }
                }}
                disabled={isImporting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black text-xs uppercase tracking-widest px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-blue-200 active:scale-95 flex items-center gap-2"
              >
                {isImporting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <UserPlus size={16} />
                )}
                {isImporting ? 'Importando...' : 'Sincronizar Funcionários do PDF (75)'}
              </button>
            </div>

            {/* Sessão Especial: Nomes Recentemente Cadastrados (Permanecem por pelo menos 1 mês) */}
            {recentCollaborators.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50/95 via-indigo-50/70 to-slate-50 border-b border-blue-200/90 px-8 py-5 animate-in fade-in duration-300 shrink-0">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                          Nomes Recentemente Cadastrados
                        </h4>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[9px] font-black uppercase border border-blue-200">
                          {recentCollaborators.length} {recentCollaborators.length === 1 ? 'colaborador' : 'colaboradores'} • Últimos 30 dias
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                        Colaboradores novos ficam salvos no Cadastro Global e destacados aqui por pelo menos um mês para rápida localização e alocação.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {recentCollaborators.map((col) => {
                    const allocation = employees.find(e => 
                      (col.id && e.collaboratorId === col.id) || 
                      (col.registration && e.registration === col.registration) ||
                      (col.name && e.name && e.name.toLowerCase() === col.name.toLowerCase())
                    );

                    return (
                      <div 
                        key={`recent_card_${col.id}`} 
                        className="bg-white p-3.5 rounded-2xl border border-blue-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-2 group"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-[9px] font-black uppercase tracking-wider border border-blue-100 font-mono">
                              #{col.registration || 'S/M'}
                            </span>
                            <span className="text-[9px] font-bold text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded-full border border-blue-100 flex items-center gap-1">
                              <Sparkles size={10} />
                              {formatRecentRegistrationBadge(col)}
                            </span>
                          </div>

                          <p className="text-xs font-black text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
                            {col.name}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                            {col.role || 'Auxiliar de Produção'}
                          </p>

                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                            <span className="font-bold text-slate-400 uppercase">Posto no Quadro:</span>
                            {allocation ? (
                              <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 text-[9px] uppercase">
                                ✓ {allocation.machine} ({allocation.shift})
                              </span>
                            ) : (
                              <span className="font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 text-[9px] uppercase">
                                ⏳ Sem Posto Alocado
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                          {onAllocateCollaborator && !allocation && (
                            <button
                              type="button"
                              onClick={() => {
                                onAllocateCollaborator(col);
                                onClose();
                              }}
                              className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all shadow-xs active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                              title="Inserir e alocar este colaborador em um posto no Quadro Geral"
                            >
                              <Plus size={12} />
                              <span>Inserir no Quadro</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onEditCollaborator(col)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                            title="Editar dados cadastrais"
                          >
                            <Edit2 size={13} />
                          </button>
                          {onToggleSilenceCollaborator && (
                            <button
                              type="button"
                              onClick={() => setSilenceModal({ collaborator: col, shouldSilence: true })}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                              title="Silenciar colaborador"
                            >
                              <VolumeX size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full border-collapse text-left">
                <thead className="bg-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Matrícula</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Função Principal</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Nascimento</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contato</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCollaboratorsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-medium italic">Nenhum colaborador ativo encontrado.</td>
                    </tr>
                  ) : (
                    filteredCollaboratorsList.map((col) => (
                      <tr key={col.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-5 text-center">
                          <span className="text-sm font-black text-blue-600 font-mono">#{col.registration || '----'}</span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-800 flex items-center gap-2">
                              {col.name}
                              {isRecentCollaborator(col, 30) && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shrink-0">
                                  ✨ Recente
                                </span>
                              )}
                              {col.isBrigadista && (
                                <span className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shrink-0">
                                  🔥 Brigada
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{col.address || 'Sem endereço'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-100">
                            {col.role || 'Não Definitivo'}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="text-xs font-bold text-slate-600">
                            {col.birthDate ? col.birthDate.split('-').reverse().join('/') : '- - / - - / - -'}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          {col.contact ? (
                            <a 
                              href={`https://wa.me/${col.contact.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-blue-600 font-mono hover:underline flex items-center gap-1.5 group/wa"
                              title="Conversar no WhatsApp"
                            >
                              <svg className="w-3 h-3 fill-emerald-500 group-hover/wa:scale-110 transition-transform" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.628 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                              </svg>
                              {col.contact}
                            </a>
                          ) : (
                            <span className="text-xs font-bold text-slate-400 italic">Sem contato</span>
                          )}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => {
                                setSilenceModal({ collaborator: col, shouldSilence: true });
                                setSilenceReasonInput('');
                              }}
                              className="p-2.5 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white rounded-xl transition-all shadow-sm border border-amber-200 hover:border-amber-600 flex items-center gap-1.5"
                              title="Silenciar funcionário (Oculta das escalas sem apagar histórico de produção)"
                            >
                              <VolumeX size={14} />
                              <span className="text-[10px] font-black uppercase">Silenciar</span>
                            </button>
                            <button 
                              onClick={() => onEditCollaborator(col)}
                              className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm border border-blue-100 hover:border-blue-600 flex items-center gap-1.5"
                            >
                              <Edit2 size={14} />
                              <span className="text-[10px] font-black uppercase">Editar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Tab 3: Colaboradores Silenciados (Preservando Histórico de Produção) */}
        {activeTab === 'silenced' && (
          <>
            {/* Header explicativo */}
            <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 border-b border-amber-200 px-8 py-5 flex items-center justify-between flex-wrap gap-4 select-none shrink-0 animate-in fade-in duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-300 shrink-0">
                  <VolumeX size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-950 uppercase tracking-tight">Funcionários Silenciados no Sistema</h3>
                  <p className="text-[10px] text-amber-800 font-bold uppercase tracking-wider mt-0.5">
                    Estes colaboradores não aparecem nas relações ativas nem nos turnos. Todo o histórico de produção e relatórios passados continuam 100% preservados.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full border-collapse text-left">
                <thead className="bg-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Matrícula</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Função Principal</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data / Motivo do Silenciamento</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Produção Histórica</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSilencedList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-medium italic">
                        Nenhum colaborador está silenciado no momento.
                      </td>
                    </tr>
                  ) : (
                    filteredSilencedList.map((col) => (
                      <tr key={col.id} className="hover:bg-amber-50/40 transition-colors group">
                        <td className="px-6 py-5 text-center">
                          <span className="text-sm font-black text-amber-800 font-mono">#{col.registration || '----'}</span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-800 flex items-center gap-2">
                              {col.name}
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                                <VolumeX size={10} /> Silenciado
                              </span>
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{col.address || 'Sem endereço'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200">
                            {col.role || 'Não Definitivo'}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-700">
                              {col.silenceReason || 'Desligado / Silenciado'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {col.silencedAt ? new Date(col.silencedAt).toLocaleDateString('pt-BR') : 'Data não informada'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-200 inline-flex items-center gap-1">
                            ✓ Preservada
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => {
                                setSilenceModal({ collaborator: col, shouldSilence: false });
                                setSilenceReasonInput('');
                              }}
                              className="p-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm border border-emerald-200 hover:border-emerald-600 flex items-center gap-1.5"
                              title="Reativar colaborador na base ativa"
                            >
                              <Volume2 size={14} />
                              <span className="text-[10px] font-black uppercase">Reativar</span>
                            </button>
                            <button 
                              onClick={() => onEditCollaborator(col)}
                              className="p-2.5 bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white rounded-xl transition-all shadow-sm border border-slate-200 flex items-center gap-1.5"
                            >
                              <Edit2 size={14} />
                              <span className="text-[10px] font-black uppercase">Editar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Tab 4: GERAL */}
        {activeTab === 'general' && (
          <>
            {/* General Database Header Info banner */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-200 px-8 py-5 flex items-center justify-between flex-wrap gap-4 select-none shrink-0 animate-in fade-in duration-300">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 shrink-0">
                  <Database size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Banco Geral de Funcionários (Lista de Referência)</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Consulte todos os 75 colaboradores homologados do PDF e cadastre/reative com um clique</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full border-collapse text-left">
                <thead className="bg-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Matrícula</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Função Principal</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredImportedCollaborators.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-medium italic">Nenhum funcionário encontrado na busca geral.</td>
                    </tr>
                  ) : (
                    filteredImportedCollaborators.map((item) => {
                      const regCol = collaborators.find(c => c.registration === item.registration);
                      const isRegistered = !!regCol;
                      const isSilenced = regCol?.isSilenced;

                      return (
                        <tr key={item.registration} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-5 text-center">
                            <span className="text-sm font-black text-emerald-600 font-mono">#{item.registration}</span>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-sm font-black text-slate-800">{item.name}</span>
                          </td>
                          <td className="px-6 py-5">
                            <span className="px-3 py-1 bg-slate-50 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200">
                              {item.role || 'Geral'}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-center">
                            {isSilenced ? (
                              <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-[9px] font-black uppercase tracking-widest border border-amber-200 inline-flex items-center gap-1">
                                <VolumeX size={10} /> Silenciado
                              </span>
                            ) : isRegistered ? (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-200">
                                Ativo no Global
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200">
                                Fora do Global
                              </span>
                            )}
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isSilenced && regCol ? (
                                <button 
                                  onClick={() => {
                                    setSilenceModal({ collaborator: regCol, shouldSilence: false });
                                    setSilenceReasonInput('');
                                  }}
                                  className="p-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm border border-emerald-200 flex items-center gap-1.5 text-[10px] font-black uppercase"
                                >
                                  <Volume2 size={12} />
                                  Reativar
                                </button>
                              ) : isRegistered && regCol ? (
                                <>
                                  <button 
                                    onClick={() => {
                                      setSilenceModal({ collaborator: regCol, shouldSilence: true });
                                      setSilenceReasonInput('');
                                    }}
                                    className="p-2.5 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white rounded-xl transition-all shadow-sm border border-amber-200 flex items-center gap-1.5 text-[10px] font-black uppercase"
                                    title="Silenciar"
                                  >
                                    <VolumeX size={12} />
                                    Silenciar
                                  </button>
                                  <button 
                                    onClick={() => onEditCollaborator(regCol)}
                                    className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm border border-blue-100 hover:border-blue-600 flex items-center gap-2"
                                  >
                                    <Edit2 size={12} />
                                    <span className="text-[10px] font-black uppercase">Editar</span>
                                  </button>
                                </>
                              ) : (
                                <button 
                                  onClick={() => onEditCollaborator({
                                    id: '',
                                    registration: item.registration,
                                    name: item.name,
                                    role: item.role || '',
                                    birthDate: '',
                                    address: '',
                                    contact: '',
                                    isSilenced: false,
                                    updatedAt: new Date().toISOString()
                                  })}
                                  className="p-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl transition-all shadow-md flex items-center gap-2 ml-auto font-black uppercase text-[10px]"
                                >
                                  <Plus size={12} />
                                  Cadastrar no Global
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Modal for Silencing / Unsilencing Confirmation */}
        {silenceModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-6">
              <div className={`w-16 h-16 ${silenceModal.shouldSilence ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'} rounded-2xl flex items-center justify-center mx-auto shadow-inner`}>
                {silenceModal.shouldSilence ? <VolumeX size={32} /> : <Volume2 size={32} />}
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                  {silenceModal.shouldSilence ? 'Silenciar Colaborador' : 'Reativar Colaborador'}
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {silenceModal.shouldSilence ? (
                    <>
                      Deseja silenciar <span className="font-bold text-amber-700">{silenceModal.collaborator.name}</span> (#{silenceModal.collaborator.registration})? 
                      <br /><br />
                      <strong className="text-slate-800">Importante:</strong> O colaborador sairá das escalas de turno, lotação e novos cadastros, mas <span className="text-emerald-700 font-bold underline">todo o histórico de produção e relatórios passados continuarão 100% preservados</span>.
                    </>
                  ) : (
                    <>
                      Deseja reativar <span className="font-bold text-emerald-700">{silenceModal.collaborator.name}</span> no Cadastro Global e nas opções ativas?
                    </>
                  )}
                </p>
              </div>

              {silenceModal.shouldSilence && (
                <div className="text-left space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo / Observação (Opcional)</label>
                  <input 
                    type="text"
                    value={silenceReasonInput}
                    onChange={(e) => setSilenceReasonInput(e.target.value)}
                    placeholder="Ex: Demissão, desligamento da empresa..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setSilenceModal(null)}
                  className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[11px] font-black uppercase transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleExecuteSilence}
                  className={`flex-1 px-6 py-3 ${silenceModal.shouldSilence ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'} rounded-xl text-[11px] font-black uppercase transition-all shadow-lg font-black`}
                >
                  {silenceModal.shouldSilence ? 'Confirmar Silenciamento' : 'Confirmar Reativação'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Confirmation Dialog for Delete / Terminate */}
        {confirmModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
            <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-6">
              <div className={`w-16 h-16 ${confirmModal.type === 'delete' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'} rounded-2xl flex items-center justify-center mx-auto shadow-inner`}>
                {confirmModal.type === 'delete' ? <Trash2 size={32} /> : <UserX size={32} />}
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                  {confirmModal.type === 'delete' ? 'Confirmar Exclusão' : 'Confirmar Desligamento'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {confirmModal.type === 'delete' ? (
                    <>Tem certeza que deseja excluir <span className="font-bold text-red-500">{confirmModal.name}</span> permanentemente? Isso removerá o registro e o slot extra do quadro.</>
                  ) : (
                    <>Tem certeza que deseja desligar <span className="font-bold text-orange-500">{confirmModal.name}</span>? Isso manterá o registro como vaga disponível para contratação.</>
                  )}
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[11px] font-black uppercase transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (isReadOnly) {
                      if (onBlockedAction) {
                        onBlockedAction('Ação Bloqueada', 'A exclusão ou desligamento de alocações não é permitida no Modo de Leitura.');
                      } else {
                        alert('Operação não permitida no Modo de Leitura.');
                      }
                      setConfirmModal(null);
                      return;
                    }
                    if (confirmModal.type === 'delete') {
                        onDelete(confirmModal.id, confirmModal.name);
                    } else {
                        onTerminate(confirmModal.id, confirmModal.name);
                    }
                    setConfirmModal(null);
                  }}
                  className={`flex-1 px-6 py-3 ${confirmModal.type === 'delete' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'} text-white rounded-xl text-[11px] font-black uppercase transition-all shadow-lg`}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="bg-slate-50 px-8 py-4 flex items-center justify-between border-t border-slate-200">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck size={14} /> Sistema de Segurança Ativo • 
            {activeTab === 'allocations' ? ` ${filteredEmployees.length} registros exibidos` : activeTab === 'collaborators' ? ` ${filteredCollaboratorsList.length} colaboradores ativos na base` : activeTab === 'silenced' ? ` ${filteredSilencedList.length} colaboradores silenciados` : ` ${filteredImportedCollaborators.length} funcionários no banco geral`}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-[9px] font-black text-slate-500 uppercase">Acesso Administrador</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseModal;
