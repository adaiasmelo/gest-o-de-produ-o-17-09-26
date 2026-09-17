import React, { useState, useEffect, useMemo } from 'react';
import { X, UserPlus, Save, Briefcase, MapPin, UserX, Stethoscope, Plane, Trash2, Search } from 'lucide-react';
import { Shift, Employee, Collaborator } from '../types';
import { isCollaboratorSilenced } from '../utils/silenceUtils';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Employee>, action: string, reason?: string) => void;
  availableShifts: Shift[];
  availableMachines: string[];
  availableRoles: string[]; // Added roles prop
  collaborators: Collaborator[];
  initialData?: Employee | null;
  slotInfo?: { sector: string; machine: string; shift: string; role: string }; // role is now string
}

type ModalAction = 'update' | 'vacation' | 'medical' | 'terminate' | 'transfer' | 'create' | 'delete';

const EmployeeModal: React.FC<EmployeeModalProps> = ({ isOpen, onClose, onSave, availableShifts, availableMachines, availableRoles, collaborators, initialData, slotInfo }) => {
  const [actionType, setActionType] = useState<ModalAction>('update');
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    role: 'Operador',
    sector: '',
    machine: '',
    shift: '',
    status: 'Ativo',
    collaboratorId: ''
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredCollaborators = useMemo(() => {
    const active = (collaborators || []).filter(c => !isCollaboratorSilenced(c));
    if (!searchTerm) return active;
    return active.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.registration && String(c.registration).includes(searchTerm))
    );
  }, [collaborators, searchTerm]);
  
  const [extraData, setExtraData] = useState({
    reason: '',
    startDate: new Date().toISOString().split('T')[0],
    duration: 30,
    returnDate: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const isLeadership = (initialData.sector || '').toLowerCase().includes('lideran');
        let initialShift = initialData.shift || '';
        if (isLeadership && (!initialShift || initialShift === 'Integral' || initialShift === 'Dia' || initialShift === 'Noite')) {
          initialShift = 'Comercial';
        }
        setFormData({ 
          ...initialData,
          name: initialData.name || '',
          role: initialData.role || '',
          sector: initialData.sector || '',
          machine: initialData.machine || '',
          shift: initialShift,
          status: initialData.status || 'Ativo',
          collaboratorId: initialData.collaboratorId || ''
        });
        setActionType('update');
      } else if (slotInfo) {
        const isLeadership = (slotInfo.sector || '').toLowerCase().includes('lideran');
        let initialShift = slotInfo.shift;
        if (isLeadership && (!initialShift || initialShift === 'Integral' || initialShift === 'Dia' || initialShift === 'Noite')) {
          initialShift = 'Comercial';
        }
        setFormData({
          name: '',
          role: slotInfo.role === 'Novo Slot' ? 'Operador 1' : slotInfo.role,
          sector: slotInfo.sector,
          machine: slotInfo.machine,
          shift: initialShift,
          status: 'Ativo'
        });
        setActionType('create');
      }
      // Reset extra data
      setExtraData({
        reason: '',
        startDate: new Date().toISOString().split('T')[0],
        duration: 30,
        returnDate: ''
      });
    }
  }, [isOpen, initialData, slotInfo]);

  // Calcular data de retorno automaticamente
  useEffect(() => {
    if (extraData.startDate && extraData.duration) {
      const date = new Date(extraData.startDate);
      date.setDate(date.getDate() + Number(extraData.duration));
      setExtraData(prev => ({ ...prev, returnDate: date.toISOString().split('T')[0] }));
    }
  }, [extraData.startDate, extraData.duration]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações básicas
    if (!formData.name && actionType === 'create' && formData.status !== 'Em Contratação') return alert("Nome obrigatório");

    let finalData = { ...formData };
    if (formData.status === 'Em Contratação' && !formData.name) {
        finalData.name = 'Em Contratação';
    }
    
    let actionLog = '';
    let detailsLog = '';

    if (actionType === 'create') {
        actionLog = 'Contratação';
        detailsLog = `Admissão para ${formData.sector} - ${formData.machine} (${formData.role})`;
    } else if (actionType === 'update') {
        actionLog = 'Alteração';
        detailsLog = initialData?.status !== formData.status 
            ? `Status alterado de ${initialData?.status} para ${formData.status}`
            : 'Atualização de dados cadastrais';
    } else if (actionType === 'vacation') {
        finalData.status = 'Férias';
        finalData.returnDate = extraData.returnDate;
        actionLog = 'Férias';
        detailsLog = `${extraData.duration} dias. Retorno em ${new Date(extraData.returnDate).toLocaleDateString('pt-BR')}`;
    } else if (actionType === 'medical') {
        finalData.status = 'Atestado';
        finalData.returnDate = extraData.returnDate;
        finalData.statusDetails = extraData.reason;
        actionLog = 'Atestado';
        detailsLog = `${extraData.duration} dias. Motivo: ${extraData.reason}`;
    } else if (actionType === 'terminate') {
        finalData.status = 'Desligado';
        actionLog = 'Desligamento';
        detailsLog = `Motivo: ${extraData.reason}`;
    } else if (actionType === 'transfer') {
        actionLog = 'Transferência';
        detailsLog = `Para ${formData.machine} - ${formData.shift}`;
    } else if (actionType === 'delete') {
        actionLog = 'Exclusão';
        detailsLog = 'Remoção definitiva de colaborador e vaga.';
    }

    onSave(finalData, actionLog, detailsLog);
    onClose();
  };

  const isEditing = !!initialData;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className={`text-white p-6 flex items-center justify-between ${
            actionType === 'delete' ? 'bg-red-700' :
            actionType === 'terminate' ? 'bg-red-500' : 
            actionType === 'vacation' ? 'bg-orange-600' :
            actionType === 'medical' ? 'bg-purple-600' :
            'bg-[#1e293b]'
        } transition-colors duration-300`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white border border-white/20">
              {actionType === 'delete' ? <Trash2 size={24} /> :
               actionType === 'terminate' ? <UserX size={24} /> : 
               actionType === 'vacation' ? <Plane size={24} /> :
               actionType === 'medical' ? <Stethoscope size={24} /> :
               <UserPlus size={24} />}
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight uppercase leading-none">
                {actionType === 'create' ? 'Adicionar' : formData.name}
              </h2>
              <p className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-1">
                {isEditing ? (actionType === 'delete' ? 'Excluir Registro' : 'Gerenciar Colaborador') : 'Novo Cadastro'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-xl transition-colors text-white/70 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Action Selector (Only if editing) */}
        {isEditing && (
            <div className="flex p-2 bg-slate-100 gap-1 overflow-x-auto no-scrollbar border-b border-slate-200">
                <button onClick={() => setActionType('update')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${actionType === 'update' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Dados</button>
                <button onClick={() => setActionType('vacation')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${actionType === 'vacation' ? 'bg-orange-100 text-orange-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Férias</button>
                <button onClick={() => setActionType('medical')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${actionType === 'medical' ? 'bg-purple-100 text-purple-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Atestado</button>
                <button onClick={() => setActionType('transfer')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${actionType === 'transfer' ? 'bg-blue-100 text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Transferir</button>
                <button onClick={() => setActionType('terminate')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${actionType === 'terminate' ? 'bg-red-50 text-red-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}>Desligar</button>
                <button onClick={() => setActionType('delete')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${actionType === 'delete' ? 'bg-red-600 text-white shadow-sm' : 'bg-slate-200 text-slate-500 hover:bg-red-100 hover:text-red-600'}`}>Excluir</button>
            </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Dados Básicos (Update / Create / Transfer) */}
          {(actionType === 'update' || actionType === 'create' || actionType === 'transfer') && (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                <div className="relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 flex items-center gap-2">Nome Completo</label>
                  
                  {actionType === 'create' ? (
                    <div className="relative">
                      <div className="relative">
                        <input 
                          type="text" 
                          value={searchTerm} 
                          onChange={e => {
                            setSearchTerm(e.target.value);
                            setIsDropdownOpen(true);
                          }}
                          onFocus={() => setIsDropdownOpen(true)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 pr-12 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 shadow-inner" 
                          placeholder="Pesquisar colaborador..." 
                        />
                        <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      </div>

                      {isDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-60 overflow-y-auto custom-scrollbar">
                            {filteredCollaborators.length > 0 ? (
                              filteredCollaborators.map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData({
                                      ...formData, 
                                      name: c.name, 
                                      collaboratorId: c.id, 
                                      registration: c.registration,
                                      role: formData.role && formData.role !== 'Novo Slot' ? formData.role : (c.role || 'Operador 1')
                                    });
                                    setSearchTerm(c.name);
                                    setIsDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                                >
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <p className="text-sm font-black text-slate-700">{c.name}</p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{c.role}</p>
                                    </div>
                                    <span className="text-[10px] font-black text-blue-500 font-mono">#{c.registration}</span>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="px-5 py-8 text-center bg-slate-50/50">
                                <p className="text-xs font-bold text-slate-400 italic">Nenhum colaborador encontrado.</p>
                                <p className="text-[10px] font-black text-blue-500 uppercase mt-2">Cadastre no Menu Extra primeiro.</p>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <input type="text" value={formData.name} disabled className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-500 outline-none" />
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Função</label>
                        <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none">
                            {formData.sector === 'Liderança' ? (
                                ['Gerente', 'Supervisor de Produção', 'Líder'].map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))
                            ) : (
                                availableRoles.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))
                            )}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Status Atual</label>
                        <select 
                            value={formData.status} 
                            onChange={e => setFormData({...formData, status: e.target.value as any})}
                            className={`w-full px-5 py-3.5 rounded-2xl text-sm font-black border outline-none focus:ring-2 focus:ring-blue-500/20 transition-all ${
                                formData.status === 'Ativo' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 
                                formData.status === 'Em Contratação' ? 'bg-orange-50 border-orange-100 text-orange-600' :
                                'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                        >
                            <option value="Ativo">Ativo</option>
                            <option value="Em Contratação">Em Contratação</option>
                            <option value="Férias">Férias</option>
                            <option value="Atestado">Atestado</option>
                            <option value="Desligado">Desligado</option>
                        </select>
                    </div>
                </div>

                {/* Allocation details - hidden for new registrations per user request */}
                {actionType !== 'create' && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={12}/> Alocação</h3>
                      <div className="grid grid-cols-2 gap-3">
                           <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Setor</label>
                              <input type="text" value={formData.sector} disabled className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-500" />
                           </div>
                           <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Turno</label>
                              <select value={formData.shift} onChange={e => setFormData({...formData, shift: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500">
                                  {(formData.sector || '').toLowerCase().includes('lideran') ? (
                                      ['Comercial', 'Comercial Flexível'].map(s => <option key={s} value={s}>{s}</option>)
                                  ) : (formData.sector || '').toLowerCase().includes('extrus') ? (
                                      ['Diurno 1', 'Noturno 1', 'Diurno 2', 'Noturno 2'].map(s => <option key={s} value={s}>{s}</option>)
                                  ) : (
                                      Array.from(new Set([
                                        ...(formData.shift ? [formData.shift] : []),
                                        'Comercial',
                                        'Comercial Flexível',
                                        ...availableShifts.map(s => s.name)
                                      ])).map(sName => (
                                        <option key={sName} value={sName}>{sName}</option>
                                      ))
                                  )}
                              </select>
                           </div>
                           <div className="col-span-2">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Máquina</label>
                              <select value={formData.machine} onChange={e => setFormData({...formData, machine: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500">
                                  {availableMachines.map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                           </div>
                      </div>
                  </div>
                )}
            </div>
          )}

          {/* Férias */}
          {actionType === 'vacation' && (
             <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                 <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl">
                    <p className="text-xs text-orange-800 font-medium">Configure o período de férias. O status do colaborador mudará automaticamente para "Férias" e a vaga ficará indisponível até o retorno.</p>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Início</label>
                        <input type="date" value={extraData.startDate} onChange={e => setExtraData({...extraData, startDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Dias</label>
                        <input type="number" value={extraData.duration} onChange={e => setExtraData({...extraData, duration: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                    </div>
                 </div>
                 <div className="bg-slate-800 text-white p-4 rounded-2xl flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Retorno Previsto</span>
                    <span className="text-lg font-black">{new Date(extraData.returnDate).toLocaleDateString('pt-BR')}</span>
                 </div>
             </div>
          )}

          {/* Atestado */}
          {actionType === 'medical' && (
             <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                 <div className="bg-purple-50 border border-purple-100 p-4 rounded-2xl">
                    <p className="text-xs text-purple-800 font-medium">Registro de afastamento médico.</p>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Motivo (CID ou Descrição)</label>
                    <input type="text" value={extraData.reason} onChange={e => setExtraData({...extraData, reason: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" placeholder="Ex: Gripe, Lesão..." />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Início</label>
                        <input type="date" value={extraData.startDate} onChange={e => setExtraData({...extraData, startDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Dias</label>
                        <input type="number" value={extraData.duration} onChange={e => setExtraData({...extraData, duration: Number(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none" />
                    </div>
                 </div>
             </div>
          )}

          {/* Desligamento */}
          {actionType === 'terminate' && (
             <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                 <div className="bg-red-50 border border-red-100 p-4 rounded-2xl">
                    <p className="text-xs text-red-800 font-medium">Atenção: Esta ação removerá o colaborador do quadro ativo e liberará a vaga para nova contratação. O histórico será preservado.</p>
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Motivo do Desligamento</label>
                    <textarea value={extraData.reason} onChange={e => setExtraData({...extraData, reason: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none resize-none h-24" placeholder="Descreva o motivo..." />
                 </div>
             </div>
          )}

          {/* Exclusão Definitiva */}
          {actionType === 'delete' && (
             <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                 <div className="bg-red-50 border border-red-200 p-6 rounded-2xl text-center space-y-3">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Trash2 size={32} />
                    </div>
                    <h3 className="text-lg font-black text-red-700 uppercase">Excluir da Tela de Pessoal?</h3>
                    <p className="text-sm text-red-600 font-medium leading-relaxed">
                        Esta ação removerá <strong>{formData.name}</strong> apenas da tela de pessoal (máquina <strong>{formData.machine}</strong>). O cadastro do colaborador na base do sistema continuará preservado.
                    </p>
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Remoção somente do quadro de pessoal.</p>
                 </div>
             </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-3">
             <div className="flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-50 transition-all">Cancelar</button>
                <button type="submit" className={`flex-1 py-4 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg transition-all flex items-center justify-center gap-2 ${
                    actionType === 'delete' ? 'bg-red-700 shadow-red-200 hover:bg-red-800' :
                    actionType === 'terminate' ? 'bg-red-500 shadow-red-200 hover:bg-red-600' :
                    actionType === 'vacation' ? 'bg-orange-600 shadow-orange-200 hover:bg-orange-700' :
                    actionType === 'medical' ? 'bg-purple-600 shadow-purple-200 hover:bg-purple-700' :
                    'bg-blue-600 shadow-blue-200 hover:bg-blue-700'
                }`}>
                   <Save size={16} /> {actionType === 'delete' ? 'Confirmar Exclusão' : 'Confirmar'}
                </button>
             </div>
             
             {actionType === 'create' && (
                <button 
                  type="button" 
                  onClick={() => {
                    const hData = { ...formData, status: 'Em Contratação' as any, name: 'Em Contratação' };
                    onSave(hData, 'Contratação', 'Vaga aberta diretamente para contratação');
                    onClose();
                  }}
                  className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-orange-600 transition-all shadow-lg shadow-orange-100 flex items-center justify-center gap-2"
                >
                  <Briefcase size={16} /> Abrir Vaga (Em Contratação)
                </button>
             )}
          </div>

        </form>
      </div>
    </div>
  );
};

export default EmployeeModal;