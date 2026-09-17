import React, { useState, useMemo, useEffect } from 'react';
import { X, Trash2, FileText, ChevronRight, ChevronDown, CheckSquare, Square, Search, Plus, Edit3, Save, History, Printer, Layout } from 'lucide-react';
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
  
  const [training, setTraining] = useState('DDP- Dialogo Diario de Produção');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('15 min');
  const [location, setLocation] = useState('Avenida Buriti-3670');
  const [instructor, setInstructor] = useState('');
  const [content, setContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [participants, setParticipants] = useState<Collaborator[]>([]);
  const [expandedSectors, setExpandedSectors] = useState<Record<string, boolean>>({});
  const [tempSelection, setTempSelection] = useState<Set<string>>(new Set());
  const [showInstructorSuggestions, setShowInstructorSuggestions] = useState(false);

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

  // Filter based on search
  const matchesSearch = (emp: Employee) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return emp.name.toLowerCase().includes(term) || (emp.registration && emp.registration.includes(term));
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

  const handleInsertSelected = () => {
    const toAdd: Collaborator[] = [];
    tempSelection.forEach(id => {
      const emp = employees.find(e => (e.collaboratorId === id || e.registration === id || e.id === id));
      if (emp) {
        const empKey = emp.collaboratorId || emp.registration || emp.id;
        const col: Collaborator = {
          id: empKey,
          name: emp.name,
          registration: emp.registration || '',
          role: emp.role || 'Auxiliar',
          updatedAt: new Date().toISOString()
        };
        if (!participants.some(p => p.id === col.id || p.registration === col.registration || p.name === col.name)) {
          toAdd.push(col);
        }
      }
    });
    
    setParticipants([...participants, ...toAdd]);
    setTempSelection(new Set());
    setSearchTerm('');
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  const handleEdit = (record: TrainingRecord) => {
    setEditingId(record.id);
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

  const handleSubmit = () => {
    if (!training || !date || !instructor || !content) {
      alert('Por favor, preencha todos os campos obrigatórios.');
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
    setTraining('DDP- Dialogo Diario de Produção');
    setDate(new Date().toISOString().split('T')[0]);
    setDuration('15 min');
    setLocation('Avenida Buriti-3670');
    setInstructor('');
    setContent('');
    setParticipants([]);
    setTempSelection(new Set());
    setSearchTerm('');
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
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 md:p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center bg-slate-50/50 shrink-0 gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 text-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 shrink-0">
              <FileText size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight truncate">Treinamento / DDP</h3>
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Gestão de Fichas e Arquivos</p>
            </div>
            {/* Mobile close button */}
            <button onClick={onClose} className="md:hidden p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600 shrink-0">
              <X size={24} />
            </button>
          </div>
          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-between md:justify-end">
            <button 
              onClick={onEditTemplate}
              className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-slate-800 text-white rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-slate-100 flex-1 md:flex-none"
              title="Personalizar Modelo do PDF"
            >
              <Layout size={14} className="md:size-4" />
              <span className="hidden sm:inline">Editar Modelo</span>
              <span className="sm:hidden">Modelo</span>
            </button>
            {view === 'history' ? (
              <button 
                onClick={() => { setView('form'); resetForm(); }}
                className="flex items-center justify-center gap-2 px-3 md:px-6 py-2 md:py-2.5 bg-blue-600 text-white rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex-1 md:flex-none"
              >
                <Plus size={14} className="md:size-4" />
                <span className="hidden sm:inline">Nova Ficha</span>
                <span className="sm:hidden">Novo</span>
              </button>
            ) : (
              <button 
                onClick={() => setView('history')}
                className="flex items-center justify-center gap-2 px-3 md:px-6 py-2 md:py-2.5 bg-slate-100 text-slate-600 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex-1 md:flex-none"
              >
                <History size={14} className="md:size-4" />
                <span className="hidden sm:inline">Ver Histórico</span>
                <span className="sm:hidden">Voltar</span>
              </button>
            )}
            {/* Desktop close button */}
            <button onClick={onClose} className="hidden md:block p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30 relative">
          {view === 'history' ? (
            <div className="p-8 space-y-6">
              {records.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {records.map(record => (
                    <div key={record.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all group flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className="flex justify-between items-start mb-4">
                        <div className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
                          {record.date.split('-').reverse().join('/')}
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(record)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg transition-colors">
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => onDelete(record.id)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <h4 className="font-black text-slate-800 uppercase text-sm mb-2 line-clamp-2">{record.training}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{record.instructor}</p>
                      
                      <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex -space-x-2">
                           {record.participants.slice(0, 3).map((p, i) => (
                             <div key={i} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-600 shadow-sm uppercase">
                               {p.name.charAt(0)}
                             </div>
                           ))}
                           {record.participants.length > 3 && (
                             <div className="w-8 h-8 rounded-full bg-blue-50 border-2 border-white flex items-center justify-center text-[8px] font-black text-blue-600 shadow-sm uppercase">
                               +{record.participants.length - 3}
                             </div>
                           )}
                        </div>
                        <button 
                          onClick={() => onSave(record)} // Re-triggers manual export PDF in App.tsx
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <Printer size={16} />
                          <span className="text-[10px] font-black uppercase tracking-widest">PDF</span>
                        </button>
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
            <div className="p-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Training Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Treinamento</label>
                  <input value={training} onChange={e => setTraining(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all" />
                </div>
                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instrutor</label>
                  <input 
                    value={instructor} 
                    onChange={e => {
                      setInstructor(e.target.value);
                      setShowInstructorSuggestions(true);
                    }} 
                    onFocus={() => setShowInstructorSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowInstructorSuggestions(false), 250)}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all" 
                    placeholder="Nome do instrutor" 
                  />

                  {instructorSuggestions.length > 0 && (
                    <div className="absolute top-[84px] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[150] max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                      {instructorSuggestions.map((s) => (
                        <button
                          key={s.registration}
                          type="button"
                          onClick={() => {
                            setInstructor(s.name);
                            setShowInstructorSuggestions(false);
                          }}
                          className="w-full text-left px-5 py-3 hover:bg-emerald-50 transition-colors border-b border-slate-100 last:border-0 flex justify-between items-center"
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Carga Horária / Local</label>
                  <div className="flex gap-2">
                    <input value={duration} onChange={e => setDuration(e.target.value)} className="w-1/3 bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all" />
                    <input value={location} onChange={e => setLocation(e.target.value)} className="w-2/3 bg-white border border-slate-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center justify-between">
                  Conteúdo Programático
                  <span className="text-[8px] font-bold text-blue-500">FORMATO TIPO WORD (ESQUERDA, CENTRO, DIREITA, JUSTIFICADO)</span>
                </label>
                <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 min-h-[300px]">
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
                    min-height: 250px;
                    padding: 24px !important;
                    font-weight: 500;
                    color: #334155;
                    word-break: normal !important;
                    overflow-wrap: break-word !important;
                    hyphens: manual !important;
                  }
                  .ql-editor p { margin-bottom: 1rem; }
                  .ql-editor .ql-align-center { text-align: center !important; }
                  .ql-editor .ql-align-right { text-align: right !important; }
                  .ql-editor .ql-align-justify { text-align: justify !important; text-justify: inter-word !important; }
                  .ql-editor .ql-align-left { text-align: left !important; }
                `}} />
              </div>

              {/* Participant Selection */}
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selecionar Participantes</label>
                  <div className="flex gap-3">
                    <div className="relative flex-1 group">
                      <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
                      <input 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-2xl pl-14 pr-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                        placeholder="Pesquisar por nome ou matrícula..."
                      />
                    </div>
                    <button 
                      onClick={handleInsertSelected}
                      disabled={tempSelection.size === 0}
                      className={`px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${tempSelection.size > 0 ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                    >
                      Inserir ({tempSelection.size})
                    </button>
                  </div>
                </div>

                {/* Grouped Selection Area */}
                <div className="border border-slate-100 rounded-[2rem] overflow-hidden bg-white">
                  <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-1">
                    {Object.entries(groupedEmployees).map(([sector, shifts]) => {
                      const typedShifts = shifts as Record<string, Record<string, Employee[]>>;
                      const hasMatches = Object.values(typedShifts).some(machines => {
                        const typedMachines = machines as Record<string, Employee[]>;
                        return Object.values(typedMachines).some(emps => (emps as Employee[]).some(matchesSearch));
                      });
                      if (!hasMatches) return null;

                      const isExpanded = expandedSectors[sector] ?? true;

                      return (
                        <div key={sector} className="mb-4 last:mb-0 border-b border-slate-50 last:border-0 pb-4 last:pb-0">
                          <button 
                            type="button"
                            onClick={() => toggleSector(sector)}
                            className="w-full flex items-center gap-3 px-6 py-4 hover:bg-slate-50 transition-colors text-left"
                          >
                            {isExpanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                            <span className="font-black text-slate-800 uppercase text-[11px] tracking-widest">{sector}</span>
                          </button>
                          
                          {isExpanded && (
                            <div className="px-6 space-y-4">
                              {Object.entries(typedShifts).map(([shift, machines]) => {
                                const typedMachines = machines as Record<string, Employee[]>;
                                const shiftHasMatches = Object.values(typedMachines).some(emps => (emps as Employee[]).some(matchesSearch));
                                if (!shiftHasMatches) return null;

                                return (
                                  <div key={shift} className="space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{shift}</h4>
                                    </div>

                                    <div className="space-y-4 pl-3">
                                      {Object.entries(typedMachines).map(([machine, emps]) => {
                                        const typedEmps = emps as Employee[];
                                        const searchMatchingEmps = typedEmps.filter(matchesSearch);
                                        if (searchMatchingEmps.length === 0) return null;

                                        const selectableEmps = searchMatchingEmps.filter(emp => {
                                          const empKey = emp.collaboratorId || emp.registration || emp.id;
                                          return !participants.some(p => p.id === empKey || p.registration === emp.registration || p.name === emp.name);
                                        });

                                        const selectAllActive = selectableEmps.length > 0 && selectableEmps.every(emp => {
                                          const empKey = emp.collaboratorId || emp.registration || emp.id;
                                          return tempSelection.has(empKey);
                                        });

                                        const toggleMachineSelection = () => {
                                          const newSet = new Set(tempSelection);
                                          if (selectAllActive) {
                                            selectableEmps.forEach(emp => {
                                              const empKey = emp.collaboratorId || emp.registration || emp.id;
                                              newSet.delete(empKey);
                                            });
                                          } else {
                                            selectableEmps.forEach(emp => {
                                              const empKey = emp.collaboratorId || emp.registration || emp.id;
                                              newSet.add(empKey);
                                            });
                                          }
                                          setTempSelection(newSet);
                                        };

                                        return (
                                          <div key={machine} className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4">
                                            <div className="flex justify-between items-center mb-3 px-2">
                                              <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{machine}</h5>
                                              {selectableEmps.length > 0 && (
                                                <button
                                                  type="button"
                                                  onClick={toggleMachineSelection}
                                                  className="text-[9px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-wider transition-colors px-2 py-0.5 bg-blue-50/50 hover:bg-blue-50 rounded-md"
                                                >
                                                  {selectAllActive ? 'Deselecionar Todos' : 'Selecionar Todos'}
                                                </button>
                                              )}
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                              {searchMatchingEmps.map(emp => {
                                                const empKey = emp.collaboratorId || emp.registration || emp.id;
                                                const isSelected = tempSelection.has(empKey);
                                                const isAlreadyIn = participants.some(p => p.id === empKey || p.registration === emp.registration || p.name === emp.name);

                                                return (
                                                  <button 
                                                    key={emp.id}
                                                    type="button"
                                                    onClick={() => !isAlreadyIn && toggleTempSelection(empKey)}
                                                    disabled={!!isAlreadyIn}
                                                    className={`flex items-center justify-between p-3 rounded-xl transition-all border ${isAlreadyIn ? 'bg-white/50 border-slate-100 opacity-60' : isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white border-transparent hover:border-slate-200'}`}
                                                  >
                                                    <div className="flex items-center gap-3 text-left">
                                                      {isAlreadyIn ? <CheckSquare className="text-green-500 shrink-0" size={18} /> : isSelected ? <CheckSquare className="text-white shrink-0" size={18} /> : <Square className="text-slate-300 shrink-0" size={18} />}
                                                      <div>
                                                        <p className={`font-black uppercase text-[10px] leading-tight ${isSelected ? 'text-white' : 'text-slate-700'}`}>{emp.name}</p>
                                                        <p className={`text-[9px] font-bold uppercase font-mono ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>#{emp.registration}</p>
                                                      </div>
                                                    </div>
                                                  </button>
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
                  </div>
                </div>

                {/* Final List */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Integrantes Selecionados ({participants.length})</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {participants.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center font-black text-[10px] text-blue-600 border border-blue-100">
                            {p.registration?.slice(-2) || '??'}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 uppercase text-[10px] leading-tight">{p.name.split(' ')[0]}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase font-mono">#{p.registration}</p>
                          </div>
                        </div>
                        <button onClick={() => handleRemoveParticipant(p.id)} className="text-slate-300 hover:text-red-500 p-1 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {participants.length === 0 && (
                      <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">Nenhum integrante selecionado.<br/>Selecione na lista acima e clique em "Inserir".</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {view === 'form' && (
          <div className="p-8 border-t border-slate-100 bg-slate-50/30 flex gap-4 shrink-0">
            <button onClick={() => { setView('history'); resetForm(); }} className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
              Cancelar
            </button>
            <button 
              onClick={handleSubmit} 
              disabled={participants.length === 0}
              className={`flex-[2] py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 ${participants.length > 0 ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              <Save size={18} />
              {editingId ? 'Salvar Alterações' : 'Salvar e Gerar PDF'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default TrainingModal;
