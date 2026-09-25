import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, Trash2, FileText, ChevronRight, ChevronDown, CheckSquare, Square, 
  Search, Plus, Edit3, Save, History, Printer, Layout, UserPlus, Users, 
  Check, CheckCircle2, RotateCcw, Filter, AlertCircle 
} from 'lucide-react';
import { TrainingRecord, Collaborator, Employee } from '../types';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { IMPORTED_COLLABORATORS } from '../constants/importedCollaborators';

interface TrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<TrainingRecord>) => void;
  onDelete: (id: string) => void;
  collaborators: Collaborator[];
  employees: Employee[];
  records: TrainingRecord[];
  onEditTemplate: () => void;
}

const TrainingModal: React.FC<TrainingModalProps> = ({ isOpen, onClose, onSave, onDelete, collaborators, employees, records, onEditTemplate }) => {
  const [view, setView] = useState<'history' | 'form'>('history');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [duplicatedFrom, setDuplicatedFrom] = useState<string | null>(null);
  
  const [training, setTraining] = useState('DDP- Dialogo Diario de Produção');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('15 min');
  const [location, setLocation] = useState('Avenida Buriti-3670');
  const [instructor, setInstructor] = useState('');
  const [content, setContent] = useState('');
  const [participants, setParticipants] = useState<Collaborator[]>([]);
  const [expandedSectors, setExpandedSectors] = useState<Record<string, boolean>>({});
  const [showInstructorSuggestions, setShowInstructorSuggestions] = useState(false);

  // States for the Large Collaborator Picker Popup
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState('Todos');
  const [onlySelectedFilter, setOnlySelectedFilter] = useState(false);
  const [tempSelection, setTempSelection] = useState<Set<string>>(new Set());

  const instructorSuggestions = useMemo(() => {
    const queryText = (instructor || '').trim().toLowerCase();
    if (!queryText || !showInstructorSuggestions) return [];
    return IMPORTED_COLLABORATORS.filter(item => 
      item.name.toLowerCase().includes(queryText) ||
      item.registration.includes(queryText)
    ).slice(0, 10);
  }, [instructor, showInstructorSuggestions]);

  useEffect(() => {
    if (records.length === 0) setView('form');
  }, [isOpen]);

  const isValidEmployeeForSelection = (emp: Employee) => {
    if (!emp || !emp.name) return false;
    
    const statusNorm = (emp.status || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim();
    const nameNorm = (emp.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim();
    
    // Status must be active, on leave, or in contracting
    const isStatusValid = ['ativo', 'atestado', 'em contratacao'].includes(statusNorm);
    if (!isStatusValid) return false;

    // Filter out placeholder names
    if (nameNorm.includes('excluid')) return false;
    if (nameNorm === 'vaga disponivel' || nameNorm === 'disponivel') return false;
    if (nameNorm === 'vaga em contratacao' || nameNorm === 'em contratacao') return false;
    if (nameNorm.includes('vaga disponivel') || nameNorm.includes('vaga em contratacao') || nameNorm.includes('vaga excluida')) return false;
    
    return true;
  };

  // Group employees by sector, shift, and machine
  const groupedEmployees = useMemo(() => {
    const groups: Record<string, Record<string, Record<string, Employee[]>>> = {};
    
    employees.forEach(emp => {
      if (!isValidEmployeeForSelection(emp)) return;
      
      const sector = emp.sector || 'Outros';
      const shift = emp.shift || 'Sem Turno';
      const machine = emp.machine || 'Geral';
      
      if (!groups[sector]) groups[sector] = {};
      if (!groups[sector][shift]) groups[sector][shift] = {};
      if (!groups[sector][shift][machine]) groups[sector][shift][machine] = [];
      
      // Avoid duplicates of the same person under Sector -> Shift -> Machine
      const empKey = emp.collaboratorId || emp.registration || emp.id;
      const alreadyAdded = groups[sector][shift][machine].some(e => {
        const eKey = e.collaboratorId || e.registration || e.id;
        return eKey === empKey || (e.registration && emp.registration && e.registration === emp.registration) || (e.name.trim().toLowerCase() === emp.name.trim().toLowerCase());
      });
      
      if (!alreadyAdded) {
        groups[sector][shift][machine].push(emp);
      }
    });
    
    return groups;
  }, [employees]);

  const availableSectors = useMemo(() => {
    return ['Todos', ...Object.keys(groupedEmployees)];
  }, [groupedEmployees]);

  // Search filter inside picker
  const matchesPickerSearch = (emp: Employee) => {
    if (!pickerSearch.trim()) return true;
    const term = pickerSearch.toLowerCase().trim();
    const nameMatch = emp.name.toLowerCase().includes(term);
    const regMatch = emp.registration ? emp.registration.includes(term) : false;
    const roleMatch = emp.role ? emp.role.toLowerCase().includes(term) : false;
    const sectorMatch = emp.sector ? emp.sector.toLowerCase().includes(term) : false;
    const machineMatch = emp.machine ? emp.machine.toLowerCase().includes(term) : false;
    const shiftMatch = emp.shift ? emp.shift.toLowerCase().includes(term) : false;
    return nameMatch || regMatch || roleMatch || sectorMatch || machineMatch || shiftMatch;
  };

  const toggleSector = (sector: string) => {
    setExpandedSectors(prev => ({ ...prev, [sector]: !prev[sector] }));
  };

  const toggleTempSelection = (empKey: string) => {
    const newSet = new Set(tempSelection);
    if (newSet.has(empKey)) {
      newSet.delete(empKey);
    } else {
      newSet.add(empKey);
    }
    setTempSelection(newSet);
  };

  // Open the large picker popup
  const handleOpenPicker = () => {
    const currentKeys = new Set<string>();
    participants.forEach(p => {
      const key = p.id || p.registration;
      if (key) currentKeys.add(key);
    });
    setTempSelection(currentKeys);
    setPickerSearch('');
    setSelectedSectorFilter('Todos');
    setOnlySelectedFilter(false);
    setIsPickerOpen(true);
  };

  // Confirm selection in the popup and return to main form
  const handleConfirmPicker = () => {
    const newParticipants: Collaborator[] = [];
    
    tempSelection.forEach(key => {
      // 1. Mantém caso já esteja na lista atual
      const existing = participants.find(p => p.id === key || p.registration === key);
      if (existing) {
        newParticipants.push(existing);
        return;
      }
      
      // 2. Busca no cadastro de funcionários
      const emp = employees.find(e => (e.collaboratorId === key || e.registration === key || e.id === key));
      if (emp) {
        const empKey = emp.collaboratorId || emp.registration || emp.id;
        newParticipants.push({
          id: empKey,
          name: emp.name,
          registration: emp.registration || '',
          role: emp.role || 'Auxiliar',
          updatedAt: new Date().toISOString()
        });
        return;
      }

      // 3. Fallback no banco de colaboradores
      const col = collaborators.find(c => c.id === key || c.registration === key);
      if (col) {
        newParticipants.push(col);
      }
    });

    setParticipants(newParticipants);
    setIsPickerOpen(false);
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id && p.registration !== id));
  };

  const handleEdit = (record: TrainingRecord) => {
    setEditingId(record.id);
    setDuplicatedFrom(null);
    setTraining(record.training);
    setDate(record.date);
    setDuration(record.duration);
    setLocation(record.location);
    setInstructor(record.instructor);
    setContent(record.content);
    
    // Map participants back to full collaborators if possible
    const fullParticipants = record.participants.map(p => {
       const found = collaborators.find(c => c.registration === p.registration);
       return found || { id: p.registration, name: p.name, registration: p.registration };
    }) as Collaborator[];
    
    setParticipants(fullParticipants);
    setView('form');
  };

  const handleDuplicate = (record: TrainingRecord) => {
    setEditingId(null);
    setDuplicatedFrom(record.training || 'Ficha duplicada');

    setTraining(record.training || 'DDP- Dialogo Diario de Produção');
    setInstructor(record.instructor || '');
    setContent(record.content || '');

    setDate(new Date().toISOString().split('T')[0]);
    setDuration(record.duration || '15 min');
    setLocation(record.location || 'Avenida Buriti-3670');

    setParticipants([]);
    setTempSelection(new Set());
    setPickerSearch('');

    setView('form');
  };

  const handleSubmit = () => {
    if (!training || !date || !instructor || !content) {
      alert('Por favor, preencha todos os campos obrigatórios (Tipo, Data, Instrutor e Conteúdo).');
      return;
    }

    onSave({
      id: editingId || undefined,
      training,
      date,
      duration,
      location,
      instructor,
      content,
      participants: participants.map(p => ({
        registration: p.registration,
        name: p.name
      }))
    });

    setView('history');
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setDuplicatedFrom(null);
    setTraining('DDP- Dialogo Diario de Produção');
    setDate(new Date().toISOString().split('T')[0]);
    setDuration('15 min');
    setLocation('Avenida Buriti-3670');
    setInstructor('');
    setContent('');
    setParticipants([]);
    setTempSelection(new Set());
    setPickerSearch('');
    setIsPickerOpen(false);
  };

  if (!isOpen) return null;

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'align': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['clean']
    ],
  };

  return (
    <>
      {/* TELA PRINCIPAL DE TREINAMENTO/DDP (ABERTA EM TELA GRANDE / PÁGINA INTEIRA) */}
      <div className="fixed inset-0 z-[150] flex flex-col p-0 sm:p-2 md:p-3 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-white rounded-none sm:rounded-2xl md:rounded-[2.2rem] w-full max-w-[1820px] h-full mx-auto shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200/60">
          
          {/* Header Superior */}
          <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-slate-50/70 shrink-0 gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="w-11 h-11 md:w-12 md:h-12 bg-blue-600 text-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
                <FileText size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight truncate">
                    Treinamento / DDP
                  </h3>
                  <span className="hidden sm:inline-block px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-wider">
                    Tela Cheia
                  </span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Diálogo Diário de Produção & Fichas de Capacitação Operacional
                </p>
              </div>
              {/* Mobile close button */}
              <button 
                type="button" 
                onClick={onClose} 
                className="md:hidden p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-between md:justify-end">
              <button 
                type="button"
                onClick={onEditTemplate}
                className="flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-md shadow-slate-200 flex-1 md:flex-none cursor-pointer"
                title="Personalizar Modelo do PDF"
              >
                <Layout size={15} />
                <span className="hidden sm:inline">Editar Modelo</span>
                <span className="sm:hidden">Modelo</span>
              </button>

              {view === 'history' ? (
                <button 
                  type="button"
                  onClick={() => { setView('form'); resetForm(); }}
                  className="flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md shadow-blue-200 flex-1 md:flex-none cursor-pointer"
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">Nova Ficha</span>
                  <span className="sm:hidden">Novo</span>
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={() => setView('history')}
                  className="flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex-1 md:flex-none cursor-pointer"
                >
                  <History size={16} />
                  <span className="hidden sm:inline">Ver Histórico ({records.length})</span>
                  <span className="sm:hidden">Histórico</span>
                </button>
              )}

              {/* Desktop close button */}
              <button 
                type="button"
                onClick={onClose} 
                className="hidden md:flex p-2.5 hover:bg-slate-200/70 rounded-xl transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
                title="Fechar tela de Treinamento / DDP"
              >
                <X size={22} />
              </button>
            </div>
          </div>

          {/* Área de Conteúdo Principal */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/40 relative">
            {view === 'history' ? (
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
                  <div>
                    <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">
                      Histórico de Fichas de Treinamento e DDP
                    </h4>
                    <p className="text-xs text-slate-400 font-medium">
                      Consulte todas as fichas emitidas, duplique informações para hoje ou exporte documentos em PDF
                    </p>
                  </div>
                  <div className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 uppercase tracking-wider self-start sm:self-auto shadow-xs">
                    Total: {records.length} Ficha{records.length === 1 ? '' : 's'}
                  </div>
                </div>

                {records.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {records.map(record => (
                      <div 
                        key={record.id} 
                        className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all group flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100/60">
                            {record.date.split('-').reverse().join('/')}
                          </div>
                          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              type="button"
                              onClick={() => handleDuplicate(record)} 
                              className="p-2 text-slate-400 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Duplicar informações para nova ficha de hoje"
                            >
                              <Plus size={16} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleEdit(record)} 
                              className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar ficha"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => onDelete(record.id)} 
                              className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir ficha"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <h4 className="font-black text-slate-800 uppercase text-sm mb-1.5 line-clamp-2">
                          {record.training}
                        </h4>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                          Instrutor: <span className="text-slate-600 font-black">{record.instructor}</span>
                        </p>
                        
                        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                          <div className="flex -space-x-2 shrink-0">
                            {record.participants.slice(0, 4).map((p, i) => (
                              <div key={i} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[9px] font-black text-slate-700 shadow-xs uppercase">
                                {p.name.charAt(0)}
                              </div>
                            ))}
                            {record.participants.length > 4 && (
                              <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[9px] font-black text-blue-700 shadow-xs uppercase">
                                +{record.participants.length - 4}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button 
                              type="button"
                              onClick={() => handleDuplicate(record)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200/80 hover:border-emerald-600 rounded-xl transition-all cursor-pointer text-[10px] font-black uppercase tracking-widest shadow-xs group/dup"
                              title="Duplicar para Nova Ficha de Hoje (Treinamento, Instrutor e Conteúdo)"
                            >
                              <Plus size={15} className="transition-transform group-hover/dup:scale-125 stroke-[2.5]" />
                              <span className="hidden sm:inline">Duplicar</span>
                            </button>
                            <button 
                              type="button"
                              onClick={() => onSave(record)}
                              className="flex items-center gap-1 px-2.5 py-1.5 text-blue-600 hover:text-blue-700 bg-blue-50/60 hover:bg-blue-100 border border-blue-200/80 rounded-xl transition-all cursor-pointer text-[10px] font-black uppercase tracking-widest shadow-xs"
                              title="Visualizar / Imprimir PDF"
                            >
                              <Printer size={15} />
                              <span>PDF</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-300 mb-6">
                      <History size={40} />
                    </div>
                    <h4 className="text-lg font-black text-slate-400 uppercase tracking-tight">Nenhum registro encontrado</h4>
                    <p className="text-sm font-bold text-slate-400 max-w-xs mt-2">Clique em "Nova Ficha" para começar a registrar os treinamentos.</p>
                  </div>
                )}
              </div>
            ) : (
              /* FORMULÁRIO EM TELA AMPLA E ESPAÇOSA */
              <div className="p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 max-w-7xl mx-auto w-full">
                
                {duplicatedFrom && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-800 animate-in fade-in duration-200">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Plus size={18} className="stroke-[2.5]" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-emerald-950">
                          Nova Ficha Gerada por Duplicação
                        </p>
                        <p className="text-[11px] font-medium text-emerald-700 mt-0.5">
                          Treinamento, Instrutor e Conteúdo Programático foram replicados com sucesso. Data atualizada para hoje. Clique em "Inserir Colaborador" para selecionar a chamada de hoje.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-200/80 text-emerald-900 px-3 py-1.5 rounded-xl shrink-0">
                      Hoje: {new Date().toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}

                {/* Grid Superior de Informações do Treinamento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Tipo de Treinamento / DDP
                    </label>
                    <input 
                      value={training} 
                      onChange={e => setTraining(e.target.value)} 
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-xs" 
                      placeholder="Ex: DDP- Dialogo Diario de Produção"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Data da Ficha
                    </label>
                    <input 
                      type="date" 
                      value={date} 
                      onChange={e => setDate(e.target.value)} 
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-xs" 
                    />
                  </div>

                  <div className="space-y-2 relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Instrutor Responsável
                    </label>
                    <input 
                      value={instructor} 
                      onChange={e => {
                        setInstructor(e.target.value);
                        setShowInstructorSuggestions(true);
                      }} 
                      onFocus={() => setShowInstructorSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowInstructorSuggestions(false), 250)}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-xs" 
                      placeholder="Nome do instrutor" 
                    />

                    {instructorSuggestions.length > 0 && (
                      <div className="absolute top-[78px] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[150] max-h-52 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                        {instructorSuggestions.map((s) => (
                          <button
                            key={s.registration}
                            type="button"
                            onClick={() => {
                              setInstructor(s.name);
                              setShowInstructorSuggestions(false);
                            }}
                            className="w-full text-left px-5 py-3 hover:bg-emerald-50 transition-colors border-b border-slate-100 last:border-0 flex justify-between items-center cursor-pointer"
                          >
                            <div>
                              <p className="text-xs font-black text-slate-800">{s.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">{s.role || 'Geral'}</p>
                            </div>
                            <span className="text-[10px] font-mono font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                              #{s.registration}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Carga Horária & Local
                    </label>
                    <div className="flex gap-2">
                      <input 
                        value={duration} 
                        onChange={e => setDuration(e.target.value)} 
                        className="w-2/5 bg-white border border-slate-200 rounded-2xl px-4 py-3.5 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-xs" 
                        placeholder="15 min"
                      />
                      <input 
                        value={location} 
                        onChange={e => setLocation(e.target.value)} 
                        className="w-3/5 bg-white border border-slate-200 rounded-2xl px-4 py-3.5 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-xs" 
                        placeholder="Local / Fábrica"
                      />
                    </div>
                  </div>
                </div>

                {/* Conteúdo Programático */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                    Conteúdo Programático do Treinamento
                    <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">
                      Editor de Texto Completo (Alinhamento, Negrito, Listas)
                    </span>
                  </label>
                  <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs min-h-[260px]">
                    <ReactQuill 
                      theme="snow" 
                      value={content} 
                      onChange={setContent}
                      modules={quillModules}
                      className="h-full border-none"
                    />
                  </div>
                  <style dangerouslySetInnerHTML={{ __html: `
                    .ql-container.ql-snow { border: none !important; font-family: inherit; font-size: 14px; }
                    .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #f1f5f9 !important; background: #f8fafc; padding: 12px 24px !important; }
                    .ql-editor {
                      min-height: 220px;
                      padding: 20px !important;
                      font-weight: 500;
                      color: #334155;
                      word-break: normal !important;
                      overflow-wrap: break-word !important;
                    }
                    .ql-editor p { margin-bottom: 0.75rem; }
                    .ql-editor .ql-align-center { text-align: center !important; }
                    .ql-editor .ql-align-right { text-align: right !important; }
                    .ql-editor .ql-align-justify { text-align: justify !important; text-justify: inter-word !important; }
                    .ql-editor .ql-align-left { text-align: left !important; }
                  `}} />
                </div>

                {/* SEÇÃO PRINCIPAL DE COLABORADORES PARTICIPANTES */}
                <div className="space-y-4 pt-2">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 md:p-6 rounded-3xl border border-slate-200/90 shadow-sm">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black shadow-xs">
                        <Users size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">
                            Colaboradores Participantes
                          </h4>
                          <span className="px-3 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-black">
                            {participants.length}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                          Colaboradores confirmados que constarão na lista de presença do PDF
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {participants.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setParticipants([])}
                          className="px-4 py-2.5 text-rose-600 hover:bg-rose-50 border border-rose-200/80 rounded-xl font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
                          title="Remover todos da lista de participantes"
                        >
                          Limpar Todos
                        </button>
                      )}

                      {/* BOTÃO DE INSERIR COLABORADOR QUE ABRE O POPUP GRANDE */}
                      <button
                        type="button"
                        onClick={handleOpenPicker}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all cursor-pointer"
                      >
                        <UserPlus size={17} />
                        <span>{participants.length > 0 ? 'Adicionar / Alterar Colaboradores' : 'Inserir Colaborador'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Nomes Selecionados Aparecem Aqui na Tela Principal */}
                  {participants.length === 0 ? (
                    <div 
                      onClick={handleOpenPicker}
                      className="p-12 text-center border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-3xl bg-slate-50/60 hover:bg-blue-50/30 transition-all cursor-pointer group"
                    >
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-blue-500 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center mb-3.5 transition-colors shadow-sm">
                        <UserPlus size={30} />
                      </div>
                      <h5 className="text-base font-black text-slate-700 uppercase tracking-tight">
                        Nenhum colaborador adicionado ainda
                      </h5>
                      <p className="text-xs text-slate-400 font-medium max-w-md mx-auto mt-1 mb-5 leading-relaxed">
                        O espaço de seleção agora abre em uma janela grande e organizada. Clique no botão abaixo para abrir a lista completa de colaboradores e selecionar os nomes.
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPicker();
                        }}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-blue-700 transition-all cursor-pointer"
                      >
                        <UserPlus size={15} />
                        Inserir Colaborador
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                      {participants.map(p => (
                        <div 
                          key={p.id || p.registration} 
                          className="flex items-center justify-between p-3.5 bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:shadow-md transition-all group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 bg-blue-50 text-blue-700 rounded-xl flex items-center justify-center font-black text-[11px] border border-blue-100 shrink-0">
                              {p.registration?.slice(-2) || p.name.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-black text-slate-800 uppercase text-xs truncate" title={p.name}>
                                {p.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">
                                  #{p.registration || 'S/N'}
                                </span>
                                {p.role && (
                                  <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded truncate max-w-[100px]">
                                    {p.role}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => handleRemoveParticipant(p.id || p.registration)} 
                            className="text-slate-300 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-colors shrink-0 ml-1 cursor-pointer"
                            title="Remover este colaborador"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}

                      {/* Botão de adicionar mais diretamente na grade */}
                      <button
                        type="button"
                        onClick={handleOpenPicker}
                        className="flex items-center justify-center gap-2 p-3.5 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl text-slate-500 hover:text-blue-600 hover:bg-blue-50/40 transition-all font-black text-xs uppercase tracking-wider cursor-pointer"
                      >
                        <Plus size={16} />
                        <span>Adicionar Mais</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Rodapé da Tela Principal do Treinamento */}
          {view === 'form' && (
            <div className="p-4 md:p-6 border-t border-slate-200/80 bg-slate-50/70 flex gap-4 shrink-0">
              <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
                <button 
                  type="button"
                  onClick={() => { setView('history'); resetForm(); }} 
                  className="px-6 py-3.5 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all shadow-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <div className="flex items-center gap-3">
                  {participants.length === 0 && (
                    <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-amber-600 font-bold">
                      <AlertCircle size={15} />
                      Insira ao menos um colaborador
                    </span>
                  )}
                  <button 
                    type="button"
                    onClick={handleSubmit} 
                    disabled={participants.length === 0}
                    className={`px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 ${
                      participants.length > 0 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 cursor-pointer' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Save size={18} />
                    {editingId ? 'Salvar Alterações' : 'Salvar e Gerar PDF'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* POPUP GRANDE PARA SELEÇÃO DE COLABORADORES */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl md:rounded-[2.5rem] w-full max-w-6xl h-[92vh] max-h-[96vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200/80 animate-in zoom-in-95 duration-200">
            
            {/* Cabeçalho do Popup de Seleção */}
            <div className="p-5 md:p-6 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-200">
                  <UserPlus size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight">
                      Selecionar Colaboradores
                    </h3>
                    <span className="px-3 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-black">
                      {tempSelection.size} Marcado{tempSelection.size === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Marque os colaboradores presentes. Ao concluir, confirme no botão no canto direito inferior.
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setIsPickerOpen(false)}
                className="p-2.5 hover:bg-slate-200/80 rounded-xl transition-colors text-slate-400 hover:text-slate-700 cursor-pointer"
                title="Fechar popup"
              >
                <X size={22} />
              </button>
            </div>

            {/* Barra de Filtros e Busca */}
            <div className="p-4 md:p-5 border-b border-slate-100 bg-white space-y-3 shrink-0">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Campo de Busca Grande */}
                <div className="relative flex-1 group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input 
                    value={pickerSearch} 
                    onChange={e => setPickerSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-10 py-3 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all placeholder:text-slate-400"
                    placeholder="Buscar por nome, matrícula (#), setor, máquina ou turno..."
                  />
                  {pickerSearch && (
                    <button 
                      type="button"
                      onClick={() => setPickerSearch('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Ações Rápidas */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const newSet = new Set(tempSelection);
                      employees.forEach(emp => {
                        if (!isValidEmployeeForSelection(emp)) return;
                        if (!matchesPickerSearch(emp)) return;
                        if (selectedSectorFilter !== 'Todos' && (emp.sector || 'Outros').toLowerCase() !== selectedSectorFilter.toLowerCase()) return;
                        const key = emp.collaboratorId || emp.registration || emp.id;
                        newSet.add(key);
                      });
                      setTempSelection(newSet);
                    }}
                    className="px-3.5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                    title="Marcar todos os colaboradores visíveis nesta busca"
                  >
                    Marcar Visíveis
                  </button>

                  <button
                    type="button"
                    onClick={() => setTempSelection(new Set())}
                    className="px-3.5 py-3 text-rose-600 hover:bg-rose-50 border border-rose-200/80 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                    title="Desmarcar todos"
                  >
                    Desmarcar Todos
                  </button>

                  <button
                    type="button"
                    onClick={() => setOnlySelectedFilter(!onlySelectedFilter)}
                    className={`px-3.5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
                      onlySelectedFilter 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <CheckSquare size={15} />
                    <span>Apenas Selecionados ({tempSelection.size})</span>
                  </button>
                </div>
              </div>

              {/* Pílulas de Setores */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1 shrink-0">
                  <Filter size={12} />
                  Setor:
                </span>
                {availableSectors.map(sec => {
                  const isActive = selectedSectorFilter === sec;
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setSelectedSectorFilter(sec)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-xs' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {sec}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Corpo com Grid Amplo de Colaboradores */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-slate-50/30">
              {Object.entries(groupedEmployees).map(([sector, shifts]) => {
                if (selectedSectorFilter !== 'Todos' && sector.toLowerCase() !== selectedSectorFilter.toLowerCase()) {
                  return null;
                }

                const typedShifts = shifts as Record<string, Record<string, Employee[]>>;
                const allSectorEmps: Employee[] = [];
                Object.values(typedShifts).forEach(machines => {
                  Object.values(machines).forEach(emps => {
                    emps.forEach(emp => {
                      if (matchesPickerSearch(emp)) {
                        const empKey = emp.collaboratorId || emp.registration || emp.id;
                        if (!onlySelectedFilter || tempSelection.has(empKey)) {
                          allSectorEmps.push(emp);
                        }
                      }
                    });
                  });
                });

                if (allSectorEmps.length === 0) return null;

                const isExpanded = expandedSectors[sector] ?? true;
                const allSectorSelected = allSectorEmps.length > 0 && allSectorEmps.every(emp => {
                  const empKey = emp.collaboratorId || emp.registration || emp.id;
                  return tempSelection.has(empKey);
                });

                const toggleSectorSelection = (e: React.MouseEvent) => {
                  e.stopPropagation();
                  const newSet = new Set(tempSelection);
                  if (allSectorSelected) {
                    allSectorEmps.forEach(emp => {
                      const empKey = emp.collaboratorId || emp.registration || emp.id;
                      newSet.delete(empKey);
                    });
                  } else {
                    allSectorEmps.forEach(emp => {
                      const empKey = emp.collaboratorId || emp.registration || emp.id;
                      newSet.add(empKey);
                    });
                  }
                  setTempSelection(newSet);
                };

                return (
                  <div key={sector} className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                    {/* Cabeçalho do Setor */}
                    <div 
                      onClick={() => toggleSector(sector)}
                      className="px-6 py-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition-colors select-none"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronRight size={18} className="text-slate-500" />}
                        <h4 className="font-black text-slate-800 uppercase text-xs md:text-sm tracking-wider">
                          {sector}
                        </h4>
                        <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[11px] font-black">
                          {allSectorEmps.length}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={toggleSectorSelection}
                        className="text-xs font-black text-blue-600 hover:text-blue-800 uppercase tracking-wider px-3 py-1 bg-white hover:bg-blue-50 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-xs"
                      >
                        {allSectorSelected ? 'Deselecionar Setor' : 'Marcar Todo o Setor'}
                      </button>
                    </div>

                    {/* Conteúdo do Setor por Turnos e Máquinas */}
                    {isExpanded && (
                      <div className="p-6 space-y-6">
                        {Object.entries(typedShifts).map(([shift, machines]) => {
                          const typedMachines = machines as Record<string, Employee[]>;
                          const hasShiftMatches = Object.values(typedMachines).some(emps => 
                            emps.some(emp => {
                              const empKey = emp.collaboratorId || emp.registration || emp.id;
                              return matchesPickerSearch(emp) && (!onlySelectedFilter || tempSelection.has(empKey));
                            })
                          );
                          if (!hasShiftMatches) return null;

                          return (
                            <div key={shift} className="space-y-4">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                <h5 className="text-xs font-black text-slate-600 uppercase tracking-widest">
                                  {shift}
                                </h5>
                              </div>

                              <div className="grid grid-cols-1 gap-4 pl-3">
                                {Object.entries(typedMachines).map(([machine, emps]) => {
                                  const searchMatchingEmps = emps.filter(emp => {
                                    const empKey = emp.collaboratorId || emp.registration || emp.id;
                                    return matchesPickerSearch(emp) && (!onlySelectedFilter || tempSelection.has(empKey));
                                  });
                                  if (searchMatchingEmps.length === 0) return null;

                                  const allMachineSelected = searchMatchingEmps.length > 0 && searchMatchingEmps.every(emp => {
                                    const empKey = emp.collaboratorId || emp.registration || emp.id;
                                    return tempSelection.has(empKey);
                                  });

                                  const toggleMachineSelection = () => {
                                    const newSet = new Set(tempSelection);
                                    if (allMachineSelected) {
                                      searchMatchingEmps.forEach(emp => {
                                        const empKey = emp.collaboratorId || emp.registration || emp.id;
                                        newSet.delete(empKey);
                                      });
                                    } else {
                                      searchMatchingEmps.forEach(emp => {
                                        const empKey = emp.collaboratorId || emp.registration || emp.id;
                                        newSet.add(empKey);
                                      });
                                    }
                                    setTempSelection(newSet);
                                  };

                                  return (
                                    <div key={machine} className="bg-slate-50/60 rounded-2xl border border-slate-100 p-4">
                                      <div className="flex justify-between items-center mb-3 px-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                          {machine}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={toggleMachineSelection}
                                          className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-wider px-2 py-0.5 bg-blue-50/60 hover:bg-blue-100 rounded-md transition-colors cursor-pointer"
                                        >
                                          {allMachineSelected ? 'Deselecionar Máquina' : 'Selecionar Máquina'}
                                        </button>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                                        {searchMatchingEmps.map(emp => {
                                          const empKey = emp.collaboratorId || emp.registration || emp.id;
                                          const isSelected = tempSelection.has(empKey);

                                          return (
                                            <div 
                                              key={emp.id}
                                              onClick={() => toggleTempSelection(empKey)}
                                              className={`flex items-center justify-between p-3.5 rounded-2xl transition-all border cursor-pointer select-none ${
                                                isSelected 
                                                  ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200' 
                                                  : 'bg-white border-slate-200/80 hover:border-blue-300 hover:shadow-xs'
                                              }`}
                                            >
                                              <div className="flex items-center gap-3 text-left min-w-0">
                                                {isSelected ? (
                                                  <CheckSquare className="text-white shrink-0" size={20} />
                                                ) : (
                                                  <Square className="text-slate-300 shrink-0" size={20} />
                                                )}
                                                <div className="min-w-0">
                                                  <p className={`font-black uppercase text-xs truncate leading-snug ${isSelected ? 'text-white' : 'text-slate-800'}`} title={emp.name}>
                                                    {emp.name}
                                                  </p>
                                                  <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className={`text-[10px] font-bold uppercase font-mono ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                                      #{emp.registration || 'S/N'}
                                                    </span>
                                                    {emp.role && (
                                                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded truncate max-w-[90px] ${
                                                        isSelected ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-500'
                                                      }`}>
                                                        {emp.role}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {Object.keys(groupedEmployees).length === 0 && (
                <div className="text-center py-16">
                  <p className="text-sm font-black text-slate-400 uppercase">Nenhum colaborador encontrado com os filtros atuais.</p>
                </div>
              )}
            </div>

            {/* RODAPÉ DO POPUP: NO CANTO DIREITO INFERIOR O BOTÃO DE CONFIRMAR */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                  <Users size={20} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 uppercase tracking-tight">
                    {tempSelection.size} Colaborador{tempSelection.size === 1 ? '' : 'es'} Selecionado{tempSelection.size === 1 ? '' : 's'}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Clique em Confirmar para inserir os nomes na tela principal do treinamento
                  </p>
                </div>
              </div>

              {/* Canto direito inferior: Cancelar e Confirmar */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(false)}
                  className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPicker}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-200 hover:shadow-emerald-300 transition-all cursor-pointer"
                >
                  <Check size={18} className="stroke-[3]" />
                  <span>Confirmar ({tempSelection.size})</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default TrainingModal;
