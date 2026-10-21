import React, { useState, useEffect, useMemo } from 'react';
import { X, UserPlus, Save, Briefcase, MapPin, UserX, Stethoscope, Plane, Trash2, Search, Palmtree, Sparkles } from 'lucide-react';
import { Shift, Employee, Collaborator, CustomSector } from '../types';
import { isCollaboratorSilenced } from '../utils/silenceUtils';
import { isRecentCollaborator, getRecentCollaborators, formatRecentRegistrationBadge } from '../utils/recentCollaborators';
import { ReasonInputWithSave } from './ReasonInputWithSave';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Employee>, action: string, reason?: string) => void;
  availableShifts: Shift[];
  availableMachines: string[];
  availableRoles: string[]; // Added roles prop
  collaborators: Collaborator[];
  customSectors?: CustomSector[];
  initialData?: Employee | null;
  slotInfo?: { 
    sector: string; 
    machine: string; 
    shift: string; 
    role: string;
    vacationingId?: string;
    vacationingName?: string;
    vacationingReturnDate?: string;
    dismissedId?: string;
    dismissedName?: string;
    dismissedReason?: string;
  };
}

type ModalAction = 'update' | 'vacation' | 'medical' | 'terminate' | 'transfer' | 'create' | 'delete';

const EmployeeModal: React.FC<EmployeeModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  availableShifts, 
  availableMachines, 
  availableRoles, 
  collaborators, 
  customSectors = [],
  initialData, 
  slotInfo 
}) => {
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

  const availableSectors = useMemo(() => {
    const list = ['Extrusão', 'Reciclagem', 'Fita', 'Liderança'];
    (customSectors || []).forEach(cs => {
      if (cs.name && !list.includes(cs.name)) {
        list.push(cs.name);
      }
    });
    if (formData.sector && !list.includes(formData.sector)) {
      list.push(formData.sector);
    }
    return list;
  }, [customSectors, formData.sector]);

  const shiftsForCurrentSector = useMemo(() => {
    const secNorm = String(formData.sector || '').toLowerCase();
    const foundCustom = (customSectors || []).find(cs => cs.name.toLowerCase() === secNorm);
    if (foundCustom && foundCustom.shifts && foundCustom.shifts.length > 0) {
      return foundCustom.shifts;
    }
    if (secNorm.includes('lideran')) {
      return ['Comercial', 'Comercial Flexível'];
    }
    if (secNorm.includes('extrus')) {
      return ['Diurno 1', 'Noturno 1', 'Diurno 2', 'Noturno 2'];
    }
    if (secNorm.includes('recic')) {
      return ['Diurno 1', 'Noturno 1', 'Diurno 2', 'Noturno 2'];
    }
    if (secNorm.includes('fita')) {
      return ['Diurno 1', 'Diurno 2', 'Comercial'];
    }
    return Array.from(new Set([
      ...(formData.shift ? [formData.shift] : []),
      'Comercial',
      'Diurno 1',
      'Noturno 1',
      ...(availableShifts || []).map(s => s?.name || '').filter(Boolean)
    ]));
  }, [formData.sector, formData.shift, customSectors, availableShifts]);

  const machinesForCurrentSector = useMemo(() => {
    const secNorm = String(formData.sector || '').toLowerCase();
    const foundCustom = (customSectors || []).find(cs => cs.name.toLowerCase() === secNorm);
    if (foundCustom && foundCustom.machines && foundCustom.machines.length > 0) {
      return foundCustom.machines;
    }
    if (secNorm.includes('extrus')) {
      return ['Cast 1', 'Cast 2'];
    }
    if (secNorm.includes('recic')) {
      return ['Erema 1'];
    }
    if (secNorm.includes('fita')) {
      return ['Ghezzi', 'Lintech', 'Wultec'];
    }
    if (secNorm.includes('lideran')) {
      return ['Geral'];
    }
    return Array.from(new Set([
      ...(formData.machine ? [formData.machine] : []),
      'Geral',
      ...(availableMachines || [])
    ]));
  }, [formData.sector, formData.machine, customSectors, availableMachines]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [roleCategoryFilter, setRoleCategoryFilter] = useState<'all' | 'operador' | 'auxiliar'>('all');

  const counts = useMemo(() => {
    const active = (collaborators || []).filter(c => c && c.name && !isCollaboratorSilenced(c));
    const opCount = active.filter(c => (c.role || '').toLowerCase().includes('operador')).length;
    const auxCount = active.filter(c => (c.role || '').toLowerCase().includes('auxiliar')).length;
    return { all: active.length, operadores: opCount, auxiliares: auxCount };
  }, [collaborators]);

  const filteredCollaborators = useMemo(() => {
    const active = (collaborators || []).filter(c => c && c.name && !isCollaboratorSilenced(c));
    const term = (searchTerm || '').trim().toLowerCase();
    const targetRole = String(formData.role || slotInfo?.role || '').toLowerCase();
    const isOpTarget = targetRole.includes('operador');
    const isAuxTarget = targetRole.includes('auxiliar');

    let list = active;
    if (roleCategoryFilter === 'operador') {
      list = list.filter(c => (c.role || '').toLowerCase().includes('operador'));
    } else if (roleCategoryFilter === 'auxiliar') {
      list = list.filter(c => (c.role || '').toLowerCase().includes('auxiliar'));
    }

    if (term) {
      list = list.filter(c => {
        const name = String(c?.name || '').toLowerCase();
        const reg = c?.registration ? String(c.registration).toLowerCase() : '';
        const r = String(c?.role || '').toLowerCase();
        return name.includes(term) || reg.includes(term) || r.includes(term);
      });
    }

    return [...list].sort((a, b) => {
      const aRole = String(a.role || '').toLowerCase();
      const bRole = String(b.role || '').toLowerCase();
      if (isOpTarget) {
        const aIsOp = aRole.includes('operador') ? 1 : 0;
        const bIsOp = bRole.includes('operador') ? 1 : 0;
        if (aIsOp !== bIsOp) return bIsOp - aIsOp;
      } else if (isAuxTarget) {
        const aIsAux = aRole.includes('auxiliar') ? 1 : 0;
        const bIsAux = bRole.includes('auxiliar') ? 1 : 0;
        if (aIsAux !== bIsAux) return bIsAux - aIsAux;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [collaborators, searchTerm, formData.role, slotInfo?.role, roleCategoryFilter]);

  const recentCollaborators = useMemo(() => {
    const active = (collaborators || []).filter(c => c && c.name && !isCollaboratorSilenced(c));
    return getRecentCollaborators(active, 30);
  }, [collaborators]);
  
  const [extraData, setExtraData] = useState({
    reason: '',
    startDate: new Date().toISOString().split('T')[0],
    duration: 30,
    returnDate: ''
  });

  useEffect(() => {
    if (isOpen) {
      const targetRole = String(slotInfo?.role || initialData?.role || '').toLowerCase();
      if (targetRole.includes('operador')) {
        setRoleCategoryFilter('operador');
      } else if (targetRole.includes('auxiliar')) {
        setRoleCategoryFilter('auxiliar');
      } else {
        setRoleCategoryFilter('all');
      }

      if (initialData && initialData.id) {
        const isLeadership = String(initialData.sector || '').toLowerCase().includes('lideran');
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
        setSearchTerm(initialData.name || '');
        setActionType('update');
      } else if (initialData && !initialData.id) {
        const isLeadership = String(initialData.sector || '').toLowerCase().includes('lideran');
        let initialShift = initialData.shift || '';
        if (isLeadership && (!initialShift || initialShift === 'Integral' || initialShift === 'Dia' || initialShift === 'Noite')) {
          initialShift = 'Comercial';
        }
        setFormData({
          name: initialData.name || '',
          role: initialData.role || (slotInfo?.role === 'Novo Slot' ? 'Operador 1' : (slotInfo?.role || 'Operador 1')),
          sector: initialData.sector || slotInfo?.sector || '',
          machine: initialData.machine || slotInfo?.machine || '',
          shift: initialShift || slotInfo?.shift || '',
          status: 'Ativo',
          registration: initialData.registration || '',
          collaboratorId: initialData.collaboratorId || '',
          substituteForId: slotInfo?.vacationingId || '',
          substituteForName: slotInfo?.vacationingName || '',
          substituteReturnDate: slotInfo?.vacationingReturnDate || '',
          replacedEmployeeId: slotInfo?.dismissedId || '',
          replacedEmployeeName: slotInfo?.dismissedName || '',
          replacedReason: slotInfo?.dismissedReason || ''
        });
        setSearchTerm(initialData.name || '');
        setActionType('create');
      } else if (slotInfo) {
        const isLeadership = String(slotInfo.sector || '').toLowerCase().includes('lideran');
        let initialShift = slotInfo.shift || '';
        if (isLeadership && (!initialShift || initialShift === 'Integral' || initialShift === 'Dia' || initialShift === 'Noite')) {
          initialShift = 'Comercial';
        }
        setFormData({
          name: '',
          role: slotInfo.role === 'Novo Slot' ? 'Operador 1' : (slotInfo.role || 'Operador 1'),
          sector: slotInfo.sector || '',
          machine: slotInfo.machine || '',
          shift: initialShift,
          status: 'Ativo',
          substituteForId: slotInfo.vacationingId || '',
          substituteForName: slotInfo.vacationingName || '',
          substituteReturnDate: slotInfo.vacationingReturnDate || '',
          replacedEmployeeId: slotInfo.dismissedId || '',
          replacedEmployeeName: slotInfo.dismissedName || '',
          replacedReason: slotInfo.dismissedReason || ''
        });
        setSearchTerm('');
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
        if (slotInfo?.vacationingId) {
          finalData.substituteForId = slotInfo.vacationingId;
          finalData.substituteForName = slotInfo.vacationingName;
          finalData.substituteReturnDate = slotInfo.vacationingReturnDate;
          detailsLog += ` (Em substituição a ${slotInfo.vacationingName})`;
        }
        if (slotInfo?.dismissedName) {
          finalData.replacedEmployeeId = slotInfo.dismissedId;
          finalData.replacedEmployeeName = slotInfo.dismissedName;
          finalData.replacedReason = slotInfo.dismissedReason;
          detailsLog = `${finalData.name} em substituição a ${slotInfo.dismissedName}, que foi desligado. Motivo: ${slotInfo.dismissedReason || 'Não informado'}`;
        }
    } else if (actionType === 'update') {
        actionLog = 'Alteração';
        detailsLog = initialData?.status !== formData.status 
            ? `Status alterado de ${initialData?.status} para ${formData.status}`
            : 'Atualização de dados cadastrais';
        if (slotInfo?.vacationingId) {
          finalData.substituteForId = slotInfo.vacationingId;
          finalData.substituteForName = slotInfo.vacationingName;
          finalData.substituteReturnDate = slotInfo.vacationingReturnDate;
          detailsLog += ` (Em substituição a ${slotInfo.vacationingName})`;
        }
        if (slotInfo?.dismissedName) {
          finalData.replacedEmployeeId = slotInfo.dismissedId;
          finalData.replacedEmployeeName = slotInfo.dismissedName;
          finalData.replacedReason = slotInfo.dismissedReason;
          detailsLog = `${finalData.name} em substituição a ${slotInfo.dismissedName}, que foi desligado. Motivo: ${slotInfo.dismissedReason || 'Não informado'}`;
        }
    } else if (actionType === 'vacation') {
        finalData.status = 'Férias';
        finalData.returnDate = extraData.returnDate;
        finalData.substituteForId = '';
        finalData.substituteForName = '';
        finalData.substituteReturnDate = '';
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
        finalData.terminationReason = extraData.reason;
        finalData.statusDetails = extraData.reason;
        finalData.terminatedAt = new Date().toISOString();
        actionLog = 'Desligamento';
        detailsLog = `Motivo: ${extraData.reason}`;
    } else if (actionType === 'transfer') {
        actionLog = 'Transferência';
        detailsLog = `Para ${formData.machine} - ${formData.shift}`;
        if (slotInfo?.vacationingId) {
          finalData.substituteForId = slotInfo.vacationingId;
          finalData.substituteForName = slotInfo.vacationingName;
          finalData.substituteReturnDate = slotInfo.vacationingReturnDate;
          detailsLog += ` (Em substituição a ${slotInfo.vacationingName})`;
        }
        if (slotInfo?.dismissedName) {
          finalData.replacedEmployeeId = slotInfo.dismissedId;
          finalData.replacedEmployeeName = slotInfo.dismissedName;
          finalData.replacedReason = slotInfo.dismissedReason;
          detailsLog = `${finalData.name} em substituição a ${slotInfo.dismissedName}, que foi desligado. Motivo: ${slotInfo.dismissedReason || 'Não informado'}`;
        }
    } else if (actionType === 'delete') {
        actionLog = 'Exclusão';
        detailsLog = 'Remoção definitiva de colaborador e vaga.';
    }

    const sanitizedData: any = {};
    for (const [k, v] of Object.entries(finalData)) {
      if (v !== undefined) {
        sanitizedData[k] = v;
      }
    }

    onSave(sanitizedData, actionLog, detailsLog);
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
          
          {/* Banner de Substituição em Férias */}
          {(slotInfo?.vacationingName || formData.substituteForName) && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900 font-bold animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Palmtree size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider block">
                    Entrando em Substituição no Posto
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    Cobrindo <strong>{slotInfo?.vacationingName || formData.substituteForName}</strong> em férias
                    {(slotInfo?.vacationingReturnDate || formData.substituteReturnDate) ? ` • Retorno em ${(slotInfo?.vacationingReturnDate || formData.substituteReturnDate || '').split('-').reverse().join('/')}` : ''}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Banner Detalhado de Vaga em Aberto por Desligamento */}
          {(slotInfo?.dismissedName || formData.replacedEmployeeName) && (
            <div className="p-4 bg-rose-50/90 border border-rose-200 rounded-2xl space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
                    <UserX size={18} />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase text-rose-800 tracking-wider block">
                      Vaga em Aberto &bull; Substituição
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      Alocação: {slotInfo?.sector || formData.sector} &bull; {slotInfo?.machine || formData.machine} ({slotInfo?.shift || formData.shift})
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-200 text-rose-800 border border-rose-300">
                  Desligado
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-rose-100 space-y-2 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Colaborador Desligado:</span>
                  <strong className="text-slate-800 font-bold">{slotInfo?.dismissedName || formData.replacedEmployeeName}</strong>
                </div>
                {(slotInfo?.dismissedReason || formData.replacedReason) && (
                  <div className="pt-2 border-t border-rose-100/70 flex items-start gap-1.5 text-xs text-rose-950">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 shrink-0">Motivo:</span>
                    <span className="font-semibold">{slotInfo?.dismissedReason || formData.replacedReason}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-rose-100/70 flex items-center justify-between text-xs text-rose-950">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Função a Assumir:</span>
                  <span className="font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 text-[11px]">
                    {slotInfo?.role || formData.role || 'Operador / Auxiliar'} &bull; Compatível com a função
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Selecione o operador ou auxiliar abaixo para assumir este posto em substituição ao colaborador desligado.
              </p>
            </div>
          )}

          {/* Dados Básicos (Update / Create / Transfer) */}
          {(actionType === 'update' || actionType === 'create' || actionType === 'transfer') && (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
                <div className="relative">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">Colaborador / Função</label>
                    {actionType === 'create' && (
                      <span className="text-[9px] font-bold text-slate-400 uppercase">
                        Vaga: <strong className="text-slate-700">{slotInfo?.role || formData.role || 'Operador/Auxiliar'}</strong>
                      </span>
                    )}
                  </div>
                  
                  {actionType === 'create' ? (
                    <div className="space-y-3">
                      {/* Filtro de Categoria: Todos / Operadores / Auxiliares */}
                      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setRoleCategoryFilter('all')}
                          className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${
                            roleCategoryFilter === 'all' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Todos ({counts.all})
                        </button>
                        <button
                          type="button"
                          onClick={() => setRoleCategoryFilter('operador')}
                          className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${
                            roleCategoryFilter === 'operador' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Operadores ({counts.operadores})
                        </button>
                        <button
                          type="button"
                          onClick={() => setRoleCategoryFilter('auxiliar')}
                          className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${
                            roleCategoryFilter === 'auxiliar' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Auxiliares ({counts.auxiliares})
                        </button>
                      </div>

                      {formData.name && formData.name !== 'Em Contratação' ? (
                        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between animate-in fade-in">
                          <div>
                            <span className="text-[9px] font-black uppercase text-blue-700 tracking-wider block">
                              Colaborador Selecionado
                            </span>
                            <p className="text-sm font-black text-slate-800">{formData.name}</p>
                            <p className="text-[10px] font-bold text-slate-500 flex items-center gap-2 mt-0.5">
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                (formData.role || '').toLowerCase().includes('operador') ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                              }`}>
                                {formData.role}
                              </span>
                              <span>Matrícula: #{formData.registration || 'S/M'}</span>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, name: '', collaboratorId: '', registration: '' });
                              setSearchTerm('');
                              setIsDropdownOpen(true);
                            }}
                            className="px-3 py-1.5 bg-white border border-blue-200 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl shadow-2xs transition-all"
                          >
                            Trocar
                          </button>
                        </div>
                      ) : (
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
                              placeholder={roleCategoryFilter === 'operador' ? "Pesquisar operador por nome ou matrícula..." : roleCategoryFilter === 'auxiliar' ? "Pesquisar auxiliar por nome ou matrícula..." : "Pesquisar colaborador por nome ou matrícula..."} 
                            />
                            <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          </div>

                          <div className="mt-2 bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden max-h-64 overflow-y-auto custom-scrollbar">
                            {/* Sessão Especial de Recém-Cadastrados no Cadastro Global */}
                            {recentCollaborators.length > 0 && !searchTerm && (
                              <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 border-b border-blue-200 p-2.5 space-y-1">
                                <div className="flex items-center gap-1.5 px-1 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-700">
                                  <Sparkles size={12} className="text-blue-600" />
                                  <span>Recém-Cadastrados no Cadastro Global (Últimos 30 dias):</span>
                                  <span className="ml-auto bg-blue-200/80 text-blue-800 text-[8px] font-black px-1.5 py-0.2 rounded-full">
                                    {recentCollaborators.length}
                                  </span>
                                </div>
                                <div className="space-y-1 pt-0.5">
                                  {recentCollaborators.map(c => {
                                    const isOp = (c.role || '').toLowerCase().includes('operador');
                                    return (
                                      <button
                                        key={`rec_${c.id}`}
                                        type="button"
                                        onClick={() => {
                                          setFormData({
                                            ...formData, 
                                            name: c.name, 
                                            collaboratorId: c.id, 
                                            registration: c.registration,
                                            role: formData.role && formData.role !== 'Novo Slot' ? formData.role : (c.role || (isOp ? 'Operador 1' : 'Auxiliar de Produção'))
                                          });
                                          setSearchTerm(c.name);
                                          setIsDropdownOpen(false);
                                        }}
                                        className="w-full text-left px-3 py-2 bg-white hover:bg-blue-100/80 rounded-xl transition-all border border-blue-200/80 shadow-2xs flex items-center justify-between group"
                                      >
                                        <div>
                                          <div className="flex items-center gap-1.5">
                                            <p className="text-xs font-black text-slate-800 group-hover:text-blue-700">{c.name}</p>
                                            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded text-[8px] font-black uppercase">
                                              ✨ {formatRecentRegistrationBadge(c)}
                                            </span>
                                          </div>
                                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{c.role}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                                            isOp ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                          }`}>
                                            {isOp ? 'OPE' : 'AUX'}
                                          </span>
                                          <span className="text-[10px] font-bold text-slate-400 font-mono">#{c.registration}</span>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {filteredCollaborators.length > 0 ? (
                              filteredCollaborators.map(c => {
                                const isOp = (c.role || '').toLowerCase().includes('operador');
                                const isRec = isRecentCollaborator(c, 30);
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setFormData({
                                        ...formData, 
                                        name: c.name, 
                                        collaboratorId: c.id, 
                                        registration: c.registration,
                                        role: formData.role && formData.role !== 'Novo Slot' ? formData.role : (c.role || (isOp ? 'Operador 1' : 'Auxiliar de Produção'))
                                      });
                                      setSearchTerm(c.name);
                                      setIsDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-3 hover:bg-blue-50/50 transition-colors border-b border-slate-100 last:border-0 flex items-center justify-between"
                                  >
                                    <div>
                                      <div className="flex items-center gap-1.5">
                                        <p className="text-xs font-black text-slate-800">{c.name}</p>
                                        {isRec && (
                                          <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded text-[8px] font-black uppercase">
                                            ✨ Recente
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{c.role}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                                        isOp ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                      }`}>
                                        {isOp ? 'OPE' : 'AUX'}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-400 font-mono">#{c.registration}</span>
                                    </div>
                                  </button>
                                );
                              })
                            ) : (
                              <div className="px-5 py-8 text-center bg-slate-50/50">
                                <p className="text-xs font-bold text-slate-400 italic">Nenhum colaborador encontrado com este filtro.</p>
                                <p className="text-[10px] font-black text-blue-500 uppercase mt-2">Cadastre no Menu Extra primeiro.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <input type="text" value={formData.name} disabled className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-black text-slate-500 outline-none" />
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Função</label>
                        <select value={formData.role || ''} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none">
                            {formData.sector === 'Liderança' ? (
                                ['Gerente', 'Supervisor de Produção', 'Líder'].map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))
                            ) : (
                                (availableRoles || []).map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))
                            )}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5">Status Atual</label>
                        <select 
                            value={formData.status || 'Ativo'} 
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
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={12}/> Alocação do Posto</h3>
                      <div className="grid grid-cols-2 gap-3">
                           <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Setor</label>
                              <select 
                                value={formData.sector || availableSectors[0]} 
                                onChange={e => {
                                  const newSec = e.target.value;
                                  const secNorm = newSec.toLowerCase();
                                  const foundCustom = (customSectors || []).find(cs => cs.name.toLowerCase() === secNorm);
                                  const defaultMach = foundCustom?.machines?.[0] || (secNorm.includes('extrus') ? 'Cast 1' : secNorm.includes('recic') ? 'Erema 1' : secNorm.includes('fita') ? 'Ghezzi' : 'Geral');
                                  const defaultSh = foundCustom?.shifts?.[0] || (secNorm.includes('lideran') ? 'Comercial' : 'Diurno 1');
                                  setFormData({
                                    ...formData,
                                    sector: newSec,
                                    machine: defaultMach,
                                    shift: defaultSh
                                  });
                                }} 
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                              >
                                {availableSectors.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                           </div>
                           <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Turno</label>
                              <select 
                                value={formData.shift || ''} 
                                onChange={e => setFormData({...formData, shift: e.target.value})} 
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                              >
                                {shiftsForCurrentSector.map(sName => (
                                  <option key={sName} value={sName}>{sName}</option>
                                ))}
                              </select>
                           </div>
                           <div className="col-span-2">
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Máquina / Posto de Trabalho</label>
                              <select 
                                value={formData.machine || ''} 
                                onChange={e => setFormData({...formData, machine: e.target.value})} 
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                              >
                                {machinesForCurrentSector.map(m => <option key={m} value={m}>{m}</option>)}
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
                    <ReasonInputWithSave
                      label="Motivo do Desligamento"
                      value={extraData.reason || ''}
                      onChange={(val) => setExtraData({ ...extraData, reason: val })}
                      category="motivo_desligamento"
                      placeholder="Descreva o motivo do desligamento ou selecione da relação..."
                      multiline={true}
                      rows={3}
                    />
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