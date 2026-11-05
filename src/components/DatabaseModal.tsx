import React, { useState, useMemo } from 'react';
import { X, Search, Plus, Trash2, Database, ShieldCheck, UserPlus, UserX, Edit2, VolumeX, Volume2 } from 'lucide-react';
import { Employee, EmployeeStatus, Collaborator } from '../types';
import { db } from '../lib/firebase';
import { saveCollaboratorToSupabase } from '../lib/supabase';
import { setDoc, doc } from 'firebase/firestore';
import { IMPORTED_COLLABORATORS } from '../constants/importedCollaborators';
import { isCollaboratorSilenced, isEmployeeSilenced, normalizeText } from '../utils/silenceUtils';
import ErrorBoundary from './ErrorBoundary';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  collaborators: Collaborator[];
  onAdd: (employee: Omit<Employee, 'id' | 'updatedAt'>) => void;
  onDelete: (id: string, name: string) => void;
  onTerminate: (id: string, name: string) => void;
  onEditCollaborator: (collaborator: Collaborator) => void;
  onDeleteCollaborator?: (id: string, name: string) => Promise<void> | void;
  onCleanDuplicateCollaborators?: () => Promise<void> | void;
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
  employees = [], 
  collaborators = [],
  onAdd, 
  onDelete,
  onTerminate,
  onEditCollaborator,
  onDeleteCollaborator,
  onCleanDuplicateCollaborators,
  onToggleSilenceCollaborator,
  onAllocateCollaborator,
  availableRoles = [],
  availableShifts = [],
  machines = [],
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

  const [newEmp, setNewEmp] = useState(() => ({
    name: '',
    role: (availableRoles && availableRoles[0]) || 'Operador 1',
    sector: 'Extrusão',
    machine: (machines && machines[0]) || 'Cast 1',
    shift: (availableShifts && availableShifts[0]) || 'Diurno 1',
    status: 'Ativo' as EmployeeStatus,
    collaboratorId: ''
  }));

  // Active (non-silenced) vs Silenced Collaborators (exige matrícula e deduplica por matrícula)
  const { activeCollaborators, silencedCollaborators } = useMemo(() => {
    const active: Collaborator[] = [];
    const silenced: Collaborator[] = [];
    const seenRegs = new Set<string>();

    for (const c of (collaborators || [])) {
      if (!c) continue;
      const reg = String(c.registration || '').trim();
      // Não pode colaborador sem matrícula permanecer no cadastro global
      if (!reg) continue;
      const regKey = reg.toLowerCase();
      // Controle único por matrícula: se houver repetida, mantém apenas um
      if (seenRegs.has(regKey)) continue;
      seenRegs.add(regKey);

      if (isCollaboratorSilenced(c)) {
        silenced.push(c);
      } else {
        active.push(c);
      }
    }

    return { activeCollaborators: active, silencedCollaborators: silenced };
  }, [collaborators]);

  // Dropdown for adding allocation - strictly active non-silenced and alphabetical
  const filteredCollaboratorsForSelect = useMemo(() => {
    const term = (colSearchTerm || '').trim().toLowerCase();
    const list = activeCollaborators.filter(c => c && !isCollaboratorSilenced(c));
    if (!term) {
      return [...list].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR', { sensitivity: 'base' }));
    }
    return list
      .filter(c => 
        String(c.name || '').toLowerCase().includes(term) ||
        String(c.registration || '').includes(term)
      )
      .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR', { sensitivity: 'base' }));
  }, [activeCollaborators, colSearchTerm]);

  const uniqueRoles = Array.from(new Set(availableRoles || []));
  const uniqueShifts = Array.from(new Set(availableShifts || []));
  const uniqueMachines = Array.from(new Set(machines || []));

  const shiftsForDatabaseSector = useMemo(() => {
    const s = newEmp.sector ? newEmp.sector.toLowerCase() : '';
    if (s.includes('extrusão') || s.includes('extrusao')) {
      return ['Diurno 1', 'Noturno 1', 'Diurno 2', 'Noturno 2'];
    }
    if (s.includes('liderança') || s.includes('lideranca')) {
      return ['Integral', 'Dia', 'Noite'];
    }
    if (s.includes('reciclagem')) {
      return ['Diurno 1', 'Noturno 1', 'Diurno 2', 'Noturno 2'];
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

  // Tab 1: Alocações - Nomes silenciados NUNCA aparecem aqui + Ordenados em ordem alfabética
  const filteredEmployees = useMemo(() => {
    return (employees || [])
      .filter(e => {
        if (!e) return false;
        // Pessoas silenciadas são terminantemente proibidas de aparecer em Alocações
        if (isEmployeeSilenced(e, collaborators)) return false;

        const statusNorm = normalizeText(e.status);
        const nameNorm = normalizeText(e.name);
        const isExcluded = statusNorm.includes('excluid') || nameNorm.includes('excluid');
        if (isExcluded && !showExcludedSlots) return false;

        const term = (searchTerm || '').trim().toLowerCase();
        if (!term) return true;
        return (
          String(e?.name || '').toLowerCase().includes(term) ||
          String(e?.role || '').toLowerCase().includes(term) ||
          String(e?.sector || '').toLowerCase().includes(term) ||
          String(e?.machine || '').toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const nameA = String(a?.name || '').trim();
        const nameB = String(b?.name || '').trim();
        return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
      });
  }, [employees, collaborators, showExcludedSlots, searchTerm]);

  // Tab 2: Cadastro Global - Nomes silenciados NUNCA aparecem aqui + Ordem Alfabética
  const filteredCollaboratorsList = useMemo(() => {
    return activeCollaborators
      .filter(c => {
        if (!c) return false;
        // Dupla garantia: silenciado não aparece
        if (isCollaboratorSilenced(c)) return false;

        const term = (searchTerm || '').trim().toLowerCase();
        if (!term) return true;
        return (
          String(c?.name || '').toLowerCase().includes(term) ||
          String(c?.registration || '').includes(term) ||
          String(c?.role || '').toLowerCase().includes(term)
        );
      })
      .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR', { sensitivity: 'base' }));
  }, [activeCollaborators, searchTerm]);

  // Tab 3: Silenciados - Tela exclusiva onde aparecem os silenciados + Ordem Alfabética
  const filteredSilencedList = useMemo(() => {
    return silencedCollaborators
      .filter(c => {
        if (!c) return false;
        const term = (searchTerm || '').trim().toLowerCase();
        if (!term) return true;
        return (
          String(c?.name || '').toLowerCase().includes(term) ||
          String(c?.registration || '').includes(term) ||
          String(c?.role || '').toLowerCase().includes(term)
        );
      })
      .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR', { sensitivity: 'base' }));
  }, [silencedCollaborators, searchTerm]);

  // Tab 4: GERAL - Nomes silenciados NUNCA aparecem aqui + Ordem Alfabética
  const filteredImportedCollaborators = useMemo(() => {
    const silencedRegs = new Set(
      silencedCollaborators
        .map(c => String(c.registration || '').trim())
        .filter(Boolean)
    );
    const silencedNames = new Set(
      silencedCollaborators
        .map(c => normalizeText(c.name))
        .filter(Boolean)
    );

    return IMPORTED_COLLABORATORS
      .filter(c => {
        if (!c) return false;
        const reg = String(c.registration || '').trim();
        const normName = normalizeText(c.name);

        // Excluir 100% dos nomes silenciados
        if (silencedRegs.has(reg) || silencedNames.has(normName)) {
          return false;
        }

        const term = (searchTerm || '').trim().toLowerCase();
        if (!term) return true;
        return (
          String(c?.name || '').toLowerCase().includes(term) ||
          String(c?.registration || '').includes(term) ||
          String(c?.role || '').toLowerCase().includes(term)
        );
      })
      .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR', { sensitivity: 'base' }));
  }, [silencedCollaborators, searchTerm]);

  if (!isOpen) return null;

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
      role: availableRoles[0] || 'Operador 1',
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
        onBlockedAction('Alteração Bloqueada', 'O silenciamento ou reativação de colaboradores não é permitido no Modo de Leitura.');
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
    <ErrorBoundary fallbackTitle="Erro na Base de Dados" onClose={onClose}>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-white rounded-3xl w-full max-w-[1380px] shadow-2xl relative overflow-hidden flex flex-col h-[94vh] max-h-[94vh] border border-slate-200">
        
        {/* Header Superior - Perfeitamente ajustado aos limites do card sem transbordar */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3 border-b border-slate-800 shrink-0 w-full max-w-full">
          <div className="flex flex-wrap items-center justify-between gap-3 w-full">
            
            {/* Esquerda: Identificação e Abas de Navegação */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/30 shrink-0">
                  <Database size={18} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black tracking-tight uppercase leading-none">Base de Dados</h2>
                  <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mt-0.5">Gestão de Pessoal</p>
                </div>
              </div>

              {/* Botões das Abas */}
              <div className="flex bg-slate-800/90 p-1 rounded-xl gap-1 shrink-0">
                <button 
                  onClick={() => { setActiveTab('allocations'); setSearchTerm(''); }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'allocations' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-950/40' : 'text-slate-400 hover:text-white'}`}
                >
                  Alocações
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full ${activeTab === 'allocations' ? 'bg-emerald-700 text-white' : 'bg-slate-700 text-slate-300'}`}>
                    {filteredEmployees.length}
                  </span>
                </button>
                <button 
                  onClick={() => { setActiveTab('collaborators'); setSearchTerm(''); }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'collaborators' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-950/40' : 'text-slate-400 hover:text-white'}`}
                >
                  Cadastro Global
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full ${activeTab === 'collaborators' ? 'bg-emerald-700 text-white' : 'bg-slate-700 text-slate-300'}`}>
                    {activeCollaborators.length}
                  </span>
                </button>
                <button 
                  onClick={() => { setActiveTab('silenced'); setSearchTerm(''); }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'silenced' ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40' : 'text-slate-400 hover:text-white'}`}
                >
                  <VolumeX size={12} />
                  Silenciados
                  {silencedCollaborators.length > 0 && (
                    <span className="text-[9px] font-mono font-black px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950">
                      {silencedCollaborators.length}
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => { setActiveTab('general'); setSearchTerm(''); }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'general' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-950/40' : 'text-slate-400 hover:text-white'}`}
                >
                  GERAL
                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full ${activeTab === 'general' ? 'bg-emerald-700 text-white' : 'bg-slate-700 text-slate-300'}`}>
                    {filteredImportedCollaborators.length}
                  </span>
                </button>
              </div>
            </div>
            
            {/* Direita: Filtros, Pesquisa e Fechar */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
              {activeTab === 'allocations' && (
                <button
                  type="button"
                  onClick={() => setShowExcludedSlots(!showExcludedSlots)}
                  className={`px-2.5 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider border transition-all shrink-0 ${
                    showExcludedSlots 
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-600'
                  }`}
                >
                  {showExcludedSlots ? 'Ocultar Excluídas' : 'Mostrar Excluídas'}
                </button>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input 
                  type="text" 
                  placeholder="Pesquisar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-800 border border-slate-700/60 text-white pl-8 pr-3 py-1.5 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500/50 w-36 sm:w-52 transition-all outline-none"
                />
              </div>
              <button 
                onClick={onClose} 
                className="bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 p-2 rounded-xl transition-all border border-slate-700 shrink-0" 
                title="Fechar"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Tab 1: Alocações */}
        {activeTab === 'allocations' && (
          <>
            {/* Quick Add Form - Mais compacto e espaçoso */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-3.5 flex flex-wrap items-end gap-2.5 sm:gap-3 relative z-20 shrink-0">
              <div className="flex-1 min-w-[200px] space-y-1 relative">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-0.5">Selecionar Colaborador</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    placeholder="Pesquisar colaborador ativo..."
                    value={colSearchTerm}
                    onChange={(e) => {
                      setColSearchTerm(e.target.value);
                      setIsColDropdownOpen(true);
                    }}
                    onFocus={() => setIsColDropdownOpen(true)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none h-9"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />

                  {isColDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsColDropdownOpen(false)}></div>
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 max-h-48 overflow-y-auto custom-scrollbar">
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
                              className="w-full text-left px-3.5 py-2 hover:bg-emerald-50 transition-colors border-b border-slate-50 last:border-0"
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
                          <div className="px-4 py-4 text-center text-[10px] font-bold text-slate-400 italic">
                            Colaborador ativo não encontrado.
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="w-36 space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-0.5">Cargo</label>
                <select 
                  value={newEmp.role}
                  onChange={(e) => setNewEmp({...newEmp, role: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none h-9"
                >
                  {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <div className="w-32 space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-0.5">Setor</label>
                <select 
                  value={newEmp.sector}
                  onChange={(e) => handleDatabaseSectorChange(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none h-9"
                >
                  {['Extrusão', 'Reciclagem', 'Fita', 'Liderança'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="w-32 space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-0.5">Máquina</label>
                <select 
                  value={newEmp.machine}
                  onChange={(e) => setNewEmp({...newEmp, machine: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none h-9"
                >
                  {uniqueMachines.map(m => <option key={m} value={m}>{m}</option>)}
                  <option value="Geral">Geral</option>
                </select>
              </div>

              <div className="w-36 space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-0.5">Turno</label>
                <select 
                  value={newEmp.shift}
                  onChange={(e) => setNewEmp({...newEmp, shift: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none h-9"
                >
                  {shiftsForDatabaseSector.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="w-32 space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-0.5">Status</label>
                <select 
                  value={newEmp.status}
                  onChange={(e) => setNewEmp({...newEmp, status: e.target.value as EmployeeStatus})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none h-9"
                >
                  {['Ativo', 'Férias', 'Atestado', 'Desligado', 'Em Contratação'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <button 
                onClick={handleAdd}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-5 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-200 active:scale-95 shrink-0"
              >
                <Plus size={16} />
                <span className="text-[10px] font-black uppercase">Incluir</span>
              </button>
            </div>

            {/* Allocations Table - Scroll interno suave e sem rolagem horizontal no modal */}
            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar w-full min-w-0">
              <table className="w-full border-collapse text-left min-w-[760px]">
                <thead className="bg-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador (Ordem Alfabética)</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Matrícula</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Setor / Máquina</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Turno</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center text-slate-400 font-medium">Nenhum registro encontrado no banco de dados.</td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp.id} className={`hover:bg-slate-50/80 transition-colors group ${emp.status === 'Vaga Excluída' ? 'opacity-60 bg-slate-50/50' : ''}`}>
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-[10px] uppercase shrink-0">
                              {String(emp?.name || 'VG').substring(0, 2)}
                            </div>
                            <span className={`font-bold ${emp.status === 'Vaga Excluída' ? 'text-slate-400 italic line-through' : 'text-slate-800'}`}>
                              {emp.name || (emp.status === 'Em Contratação' ? 'Em Contratação' : 'Vaga Aberta')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="font-black text-slate-400 font-mono text-xs">#{emp.registration || '----'}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-black uppercase tracking-tight">
                            {emp.role || 'Geral'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700">{emp.sector || 'Extrusão'}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{emp.machine || 'Cast 1'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="font-bold text-slate-600">{emp.shift || 'Diurno 1'}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide
                            ${emp.status === 'Ativo' ? 'bg-emerald-100 text-emerald-700' : 
                              emp.status === 'Férias' ? 'bg-orange-100 text-orange-700' :
                              emp.status === 'Em Contratação' ? 'bg-blue-100 text-blue-700' :
                              emp.status === 'Desligado' ? 'bg-red-100 text-red-700' : 
                              emp.status === 'Vaga Excluída' ? 'bg-slate-100 text-slate-500 border border-dashed border-slate-200' : 'bg-purple-100 text-purple-700'}
                          `}>
                            {emp.status || 'Ativo'}
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {emp.status !== 'Vaga Excluída' && (
                              <button 
                                onClick={() => setConfirmModal({ id: emp.id, name: emp.name || 'este colaborador', type: 'terminate' })}
                                className="p-1.5 bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 shadow-xs"
                                title="Desligar e abrir vaga"
                              >
                                <UserX size={14} />
                              </button>
                            )}
                            <button 
                              onClick={() => setConfirmModal({ id: emp.id, name: emp.name || 'este slot', type: 'delete' })}
                              className="p-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all opacity-0 group-hover:opacity-100 shadow-xs"
                              title={emp.status === 'Vaga Excluída' ? "Excluir permanentemente (Restaurar Vaga)" : "Excluir (Remover Slot)"}
                            >
                              <Trash2 size={14} />
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

        {/* Tab 2: Cadastro Global (Apenas Colaboradores Ativos, Sem Slot de Recentes, em Ordem Alfabética) */}
        {activeTab === 'collaborators' && (
          <>
            {/* Barra de Ações do Cadastro Global */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between flex-wrap gap-3 select-none shrink-0 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-200 shrink-0">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Cadastro Central de Colaboradores (Ativos)</h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Base principal de colaboradores ativos em ordem alfabética. Colaboradores demitidos/afastados podem ser silenciados.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {onCleanDuplicateCollaborators && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (isReadOnly) {
                        if (onBlockedAction) {
                          onBlockedAction('Ação Bloqueada', 'Operação não permitida no Modo de Leitura.');
                        } else {
                          alert('Operação não permitida no Modo de Leitura.');
                        }
                        return;
                      }
                      if (window.confirm("Deseja fazer a limpeza no Cadastro Global? Todos os nomes sem matrícula e todas as matrículas duplicadas serão excluídos imediatamente, mantendo apenas 1 registro único por matrícula.")) {
                        await onCleanDuplicateCollaborators();
                      }
                    }}
                    className="bg-slate-700 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95 flex items-center gap-1.5 shrink-0"
                    title="Exclui registros sem matrícula e duplicatas por matrícula"
                  >
                    <Trash2 size={13} className="text-red-400" />
                    <span>Limpar Duplicatas & Sem Matrícula</span>
                  </button>
                )}

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
                        const silencedRegs = new Set(
                          silencedCollaborators
                            .map(s => String(s.registration || '').trim().toLowerCase())
                            .filter(Boolean)
                        );
                        const silencedNames = new Set(
                          silencedCollaborators
                            .map(s => normalizeText(s.name))
                            .filter(Boolean)
                        );

                        for (const item of IMPORTED_COLLABORATORS) {
                          if (!item.registration || !item.registration.trim()) continue;
                          const regKey = item.registration.trim().toLowerCase();
                          const nameKey = normalizeText(item.name);
                          // NUNCA reativar ou sobrescrever colaborador silenciado/desligado ao sincronizar PDF
                          if (silencedRegs.has(regKey) || silencedNames.has(nameKey)) {
                            continue;
                          }

                          const stableId = `col_${item.registration}`;
                          const colData = {
                            id: stableId,
                            registration: item.registration,
                            name: item.name,
                            role: item.role,
                            updatedAt: new Date().toISOString()
                          };
                          await setDoc(doc(db, 'collaborators', stableId), colData, { merge: true });
                          saveCollaboratorToSupabase(colData).catch(() => {});
                          count++;
                        }
                        alert(`Sucesso! ${count} colaboradores foram sincronizados no Cadastro Global.`);
                      } catch (err) {
                        console.error(err);
                        alert("Erro ao carregar colaboradores.");
                      } finally {
                        setIsImporting(false);
                      }
                    }
                  }}
                  disabled={isImporting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl transition-all shadow-md shadow-blue-200 active:scale-95 flex items-center gap-1.5 shrink-0"
                >
                  {isImporting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <UserPlus size={14} />
                  )}
                  {isImporting ? 'Importando...' : 'Sincronizar PDF (75)'}
                </button>
              </div>
            </div>

            {/* Tabela do Cadastro Global em Ordem Alfabética */}
            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar w-full min-w-0">
              <table className="w-full border-collapse text-left min-w-[760px]">
                <thead className="bg-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Matrícula</th>
                    <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador (Ordem Alfabética)</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Função Principal</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Nascimento</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contato</th>
                    <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredCollaboratorsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center text-slate-400 font-medium italic">Nenhum colaborador ativo encontrado.</td>
                    </tr>
                  ) : (
                    filteredCollaboratorsList.map((col) => (
                      <tr key={col.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-4 py-2.5 text-center">
                          <span className="font-black text-blue-600 font-mono text-xs">#{col.registration || '----'}</span>
                        </td>
                        <td className="px-5 py-2.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              {col.name || 'Sem nome'}
                              {col.isBrigadista && (
                                <span className="px-1.5 py-0.2 bg-red-50 text-red-600 border border-red-100 rounded-md text-[8px] font-black uppercase tracking-wider shrink-0">
                                  🔥 Brigada
                                </span>
                              )}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{col.address || 'Sem endereço'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[9px] font-black uppercase tracking-wider border border-blue-100">
                            {col.role || 'Não Definitivo'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="font-bold text-slate-600 text-xs">
                            {typeof col.birthDate === 'string' && col.birthDate.includes('-')
                              ? col.birthDate.split('-').reverse().join('/') 
                              : (col.birthDate ? String(col.birthDate) : '- - / - - / - -')}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {col.contact ? (
                            <a 
                              href={`https://wa.me/${String(col.contact || '').replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="font-bold text-blue-600 font-mono hover:underline flex items-center gap-1 group/wa text-xs"
                              title="Conversar no WhatsApp"
                            >
                              <svg className="w-3 h-3 fill-emerald-500 group-hover/wa:scale-110 transition-transform" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.432 5.628 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                              </svg>
                              {col.contact}
                            </a>
                          ) : (
                            <span className="font-bold text-slate-400 italic text-xs">Sem contato</span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button 
                              onClick={() => {
                                setSilenceModal({ collaborator: col, shouldSilence: true });
                                setSilenceReasonInput('');
                              }}
                              className="p-1.5 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white rounded-lg transition-all shadow-xs border border-amber-200 hover:border-amber-600 flex items-center gap-1 text-[9px] font-black uppercase"
                              title="Silenciar colaborador (Oculta das escalas preservando histórico anterior)"
                            >
                              <VolumeX size={12} />
                              <span>Silenciar</span>
                            </button>
                            <button 
                              onClick={() => onEditCollaborator(col)}
                              className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all shadow-xs border border-blue-100 hover:border-blue-600 flex items-center gap-1 text-[9px] font-black uppercase"
                            >
                              <Edit2 size={12} />
                              <span>Editar</span>
                            </button>
                            {onDeleteCollaborator && (
                              <button 
                                onClick={() => {
                                  if (isReadOnly) {
                                    if (onBlockedAction) onBlockedAction('Ação Bloqueada', 'Operação não permitida no Modo de Leitura.');
                                    return;
                                  }
                                  if (window.confirm(`Deseja realmente excluir o colaborador "${col.name}" (Matrícula #${col.registration}) do Cadastro Global?`)) {
                                    onDeleteCollaborator(col.id, col.name);
                                  }
                                }}
                                className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all shadow-xs border border-red-100 hover:border-red-600 flex items-center gap-1 text-[9px] font-black uppercase"
                                title="Excluir permanentemente do cadastro global"
                              >
                                <Trash2 size={12} />
                                <span>Excluir</span>
                              </button>
                            )}
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

        {/* Tab 3: Colaboradores Silenciados (Preservando 100% o Histórico Passado) */}
        {activeTab === 'silenced' && (
          <>
            <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 border-b border-amber-200 px-5 py-3 flex items-center justify-between flex-wrap gap-3 select-none shrink-0 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-amber-300 shrink-0">
                  <VolumeX size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-amber-950 uppercase tracking-tight">Colaboradores Silenciados</h3>
                  <p className="text-[9px] text-amber-800 font-bold uppercase tracking-wider mt-0.5">
                    Estes colaboradores não aparecem em alocações, cadastro global nem no geral. Todo histórico de produção anterior permanece 100% preservado.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar w-full min-w-0">
              <table className="w-full border-collapse text-left min-w-[760px]">
                <thead className="bg-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Matrícula</th>
                    <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador (Ordem Alfabética)</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Função Principal</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data / Motivo do Silenciamento</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Produção Passada</th>
                    <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredSilencedList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center text-slate-400 font-medium italic">
                        Nenhum colaborador está silenciado no momento.
                      </td>
                    </tr>
                  ) : (
                    filteredSilencedList.map((col) => (
                      <tr key={col.id} className="hover:bg-amber-50/40 transition-colors group">
                        <td className="px-4 py-2.5 text-center">
                          <span className="font-black text-amber-800 font-mono text-xs">#{col.registration || '----'}</span>
                        </td>
                        <td className="px-5 py-2.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5">
                              {col?.name || 'Sem nome'}
                              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-[8px] font-black uppercase tracking-wider flex items-center gap-1">
                                <VolumeX size={9} /> Silenciado
                              </span>
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{col?.address || 'Sem endereço'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-black uppercase tracking-wider border border-slate-200">
                            {col?.role || 'Não Definitivo'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700">
                              {col?.silenceReason || 'Desligado / Silenciado'}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">
                              {(() => {
                                if (!col?.silencedAt) return 'Data não informada';
                                try {
                                  if (typeof col.silencedAt === 'object' && 'seconds' in (col.silencedAt as any)) {
                                    return new Date((col.silencedAt as any).seconds * 1000).toLocaleDateString('pt-BR');
                                  }
                                  const d = new Date(col.silencedAt);
                                  return isNaN(d.getTime()) ? 'Data não informada' : d.toLocaleDateString('pt-BR');
                                } catch {
                                  return 'Data não informada';
                                }
                              })()}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[9px] font-black uppercase tracking-wider border border-emerald-200 inline-flex items-center gap-1">
                            ✓ Preservada
                          </span>
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button 
                              onClick={() => {
                                setSilenceModal({ collaborator: col, shouldSilence: false });
                                setSilenceReasonInput('');
                              }}
                              className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg transition-all shadow-xs border border-emerald-200 hover:border-emerald-600 flex items-center gap-1 text-[9px] font-black uppercase"
                              title="Reativar colaborador na base ativa"
                            >
                              <Volume2 size={12} />
                              Reativar
                            </button>
                            <button 
                              onClick={() => onEditCollaborator(col)}
                              className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white rounded-lg transition-all shadow-xs border border-slate-200 flex items-center gap-1 text-[9px] font-black uppercase"
                            >
                              <Edit2 size={12} />
                              Editar
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

        {/* Tab 4: GERAL (Banco Geral do PDF, Excluindo Silenciados, em Ordem Alfabética) */}
        {activeTab === 'general' && (
          <>
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between flex-wrap gap-3 select-none shrink-0 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-emerald-200 shrink-0">
                  <Database size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Banco Geral de Funcionários (Lista PDF em Ordem Alfabética)</h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Lista geral sem os colaboradores silenciados. Cadastre ou visualize o status de cada um.</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar w-full min-w-0">
              <table className="w-full border-collapse text-left min-w-[760px]">
                <thead className="bg-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Matrícula</th>
                    <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Colaborador (Ordem Alfabética)</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Função Principal</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredImportedCollaborators.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-16 text-center text-slate-400 font-medium italic">Nenhum funcionário ativo encontrado no banco geral.</td>
                    </tr>
                  ) : (
                    filteredImportedCollaborators.map((item) => {
                      const regCol = (collaborators || []).find(c => 
                        c && (
                          String(c.registration || '').trim() === String(item.registration || '').trim() ||
                          normalizeText(c.name) === normalizeText(item.name)
                        )
                      );
                      const isRegistered = !!regCol && !isCollaboratorSilenced(regCol);

                      return (
                        <tr key={item.registration} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-4 py-2.5 text-center">
                            <span className="font-black text-emerald-600 font-mono text-xs">#{item.registration}</span>
                          </td>
                          <td className="px-5 py-2.5">
                            <span className="font-bold text-slate-800">{item.name}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded-md text-[9px] font-black uppercase tracking-wider border border-slate-200">
                              {item.role || 'Geral'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {isRegistered ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[9px] font-black uppercase tracking-wider border border-emerald-200">
                                Ativo no Global
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[9px] font-black uppercase tracking-wider border border-slate-200">
                                Fora do Global
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isRegistered && regCol ? (
                                <>
                                  <button 
                                    onClick={() => {
                                      setSilenceModal({ collaborator: regCol, shouldSilence: true });
                                      setSilenceReasonInput('');
                                    }}
                                    className="p-1.5 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white rounded-lg transition-all shadow-xs border border-amber-200 text-[9px] font-black uppercase flex items-center gap-1"
                                    title="Silenciar"
                                  >
                                    <VolumeX size={12} />
                                    Silenciar
                                  </button>
                                  <button 
                                    onClick={() => onEditCollaborator(regCol)}
                                    className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all shadow-xs border border-blue-100 hover:border-blue-600 flex items-center gap-1 text-[9px] font-black uppercase"
                                  >
                                    <Edit2 size={12} />
                                    <span>Editar</span>
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
                                  className="p-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-all shadow-xs flex items-center gap-1 ml-auto font-black uppercase text-[9px]"
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

        {/* Modal de Confirmação de Silenciamento / Reativação */}
        {silenceModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in duration-150">
            <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-5">
              <div className={`w-14 h-14 ${silenceModal.shouldSilence ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'} rounded-2xl flex items-center justify-center mx-auto shadow-inner`}>
                {silenceModal.shouldSilence ? <VolumeX size={28} /> : <Volume2 size={28} />}
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                  {silenceModal.shouldSilence ? 'Silenciar Colaborador' : 'Reativar Colaborador'}
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {silenceModal.shouldSilence ? (
                    <>
                      Deseja silenciar <span className="font-bold text-amber-700">{silenceModal.collaborator.name}</span> (#{silenceModal.collaborator.registration})? 
                      <br /><br />
                      <strong className="text-slate-800">Atenção:</strong> O colaborador não aparecerá em alocações, cadastro global nem geral, mas <span className="text-emerald-700 font-bold underline">todo o histórico de produção e relatórios anteriores continuarão 100% preservados no sistema</span>.
                    </>
                  ) : (
                    <>
                      Deseja reativar <span className="font-bold text-emerald-700">{silenceModal.collaborator.name}</span> no Cadastro Global e nas opções ativas?
                    </>
                  )}
                </p>
              </div>

              {silenceModal.shouldSilence && (
                <div className="text-left space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Motivo / Observação (Opcional)</label>
                  <input 
                    type="text"
                    value={silenceReasonInput}
                    onChange={(e) => setSilenceReasonInput(e.target.value)}
                    placeholder="Ex: Desligamento da empresa, afastamento..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              <div className="flex gap-2.5 pt-1">
                <button 
                  onClick={() => setSilenceModal(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleExecuteSilence}
                  className={`flex-1 px-4 py-2.5 ${silenceModal.shouldSilence ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'} rounded-xl text-[10px] font-black uppercase transition-all shadow-md font-black`}
                >
                  {silenceModal.shouldSilence ? 'Confirmar Silenciamento' : 'Confirmar Reativação'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Confirmação de Exclusão / Desligamento de Alocação */}
        {confirmModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in zoom-in duration-150">
            <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-5">
              <div className={`w-14 h-14 ${confirmModal.type === 'delete' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'} rounded-2xl flex items-center justify-center mx-auto shadow-inner`}>
                {confirmModal.type === 'delete' ? <Trash2 size={28} /> : <UserX size={28} />}
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">
                  {confirmModal.type === 'delete' ? 'Confirmar Exclusão' : 'Confirmar Desligamento'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {confirmModal.type === 'delete' ? (
                    <>Tem certeza que deseja excluir <span className="font-bold text-red-500">{confirmModal.name}</span> permanentemente? Isso removerá o registro e o slot do quadro.</>
                  ) : (
                    <>Tem certeza que deseja desligar <span className="font-bold text-orange-500">{confirmModal.name}</span>? Isso manterá o registro como vaga disponível para contratação.</>
                  )}
                </p>
              </div>
              <div className="flex gap-2.5">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase transition-all"
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
                  className={`flex-1 px-4 py-2.5 ${confirmModal.type === 'delete' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-200'} text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-md`}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rodapé Informativo */}
        <div className="bg-slate-50 px-5 py-2.5 flex items-center justify-between border-t border-slate-200 shrink-0">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <ShieldCheck size={13} /> Base de Dados Segura • 
            {activeTab === 'allocations' 
              ? ` ${filteredEmployees.length} vagas e alocações ativas` 
              : activeTab === 'collaborators' 
              ? ` ${filteredCollaboratorsList.length} colaboradores ativos no global` 
              : activeTab === 'silenced' 
              ? ` ${filteredSilencedList.length} colaboradores silenciados (histórico preservado)` 
              : ` ${filteredImportedCollaborators.length} funcionários no banco geral`}
          </p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            <span className="text-[9px] font-black text-slate-500 uppercase">Acesso Autorizado</span>
          </div>
        </div>

      </div>
    </div>
  </ErrorBoundary>
  );
};

export default DatabaseModal;
