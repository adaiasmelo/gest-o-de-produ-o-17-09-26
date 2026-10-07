import React, { useState, useMemo, useEffect } from 'react';
import { X, Search, Plus, UserPlus } from 'lucide-react';
import { Employee, EmployeeStatus, Collaborator, CustomSector } from '../types';
import { isCollaboratorSilenced } from '../utils/silenceUtils';

interface QuickAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSector: string;
  collaborators: Collaborator[];
  availableRoles: string[];
  availableShifts: string[];
  machines: string[];
  customSectors?: CustomSector[];
  onAdd: (employee: Omit<Employee, 'id' | 'updatedAt'>) => Promise<void>;
}

export const QuickAllocationModal: React.FC<QuickAllocationModalProps> = ({
  isOpen,
  onClose,
  defaultSector,
  collaborators,
  availableRoles,
  availableShifts,
  machines,
  customSectors = [],
  onAdd
}) => {
  const [colSearchTerm, setColSearchTerm] = useState('');
  const [isColDropdownOpen, setIsColDropdownOpen] = useState(false);

  const allSectorOptions = useMemo(() => {
    const list = ['Extrusão', 'Reciclagem', 'Fita', 'Liderança'];
    (customSectors || []).forEach(cs => {
      if (cs.name && !list.includes(cs.name)) {
        list.push(cs.name);
      }
    });
    return list;
  }, [customSectors]);

  const uniqueRoles = Array.from(new Set(availableRoles));
  const uniqueShifts = Array.from(new Set([...availableShifts, 'Comercial', 'Comercial Flexível', 'Diurno 1', 'Noturno 1', 'Diurno 2', 'Noturno 2']));
  const uniqueMachines = Array.from(new Set([
    ...machines, 
    'Geral', 
    'Cast 1', 
    'Cast 2', 
    'Erema 1', 
    'Ghezzi', 
    'Lintech', 
    'Wultec',
    ...(customSectors || []).flatMap(cs => cs.machines || [])
  ]));

  // Pre-selected defaults depending on the sector
  const getInitialMachine = (sector: string) => {
    if (!sector) return 'Geral';
    const s = sector.toLowerCase();
    if (s.includes('liderança') || s.includes('lideranca')) return 'Geral';
    if (s.includes('extrusão') || s.includes('extrusao')) return 'Cast 1';
    if (s.includes('reciclagem')) return 'Erema 1';
    if (s.includes('fita')) return 'Ghezzi';
    const foundCustom = (customSectors || []).find(cs => cs.name.toLowerCase() === s);
    if (foundCustom && foundCustom.machines && foundCustom.machines.length > 0) {
      return foundCustom.machines[0];
    }
    return 'Geral';
  };

  const getInitialShift = (sector: string) => {
    if (!sector) return 'Diurno 1';
    const s = sector.toLowerCase();
    if (s.includes('liderança') || s.includes('lideranca')) return 'Comercial';
    const foundCustom = (customSectors || []).find(cs => cs.name.toLowerCase() === s);
    if (foundCustom && foundCustom.shifts && foundCustom.shifts.length > 0) {
      return foundCustom.shifts[0];
    }
    return 'Diurno 1';
  };

  const [newEmp, setNewEmp] = useState({
    name: '',
    role: uniqueRoles[0] || 'Operador',
    sector: defaultSector || 'Extrusão',
    machine: getInitialMachine(defaultSector),
    shift: getInitialShift(defaultSector),
    status: 'Ativo' as EmployeeStatus,
    collaboratorId: '',
    registration: ''
  });

  // Keep state updated if defaultSector changes
  useEffect(() => {
    if (isOpen) {
      setNewEmp({
        name: '',
        role: uniqueRoles[0] || 'Operador',
        sector: defaultSector || 'Extrusão',
        machine: getInitialMachine(defaultSector),
        shift: getInitialShift(defaultSector),
        status: 'Ativo' as EmployeeStatus,
        collaboratorId: '',
        registration: ''
      });
      setColSearchTerm('');
      setIsColDropdownOpen(false);
    }
  }, [isOpen, defaultSector]);

  // Handle Sector change to automatically suggest suitable machine and shift
  const handleSectorChange = (sector: string) => {
    setNewEmp(prev => ({
      ...prev,
      sector,
      machine: getInitialMachine(sector),
      shift: getInitialShift(sector)
    }));
  };

  const shiftsForSector = useMemo(() => {
    const s = newEmp.sector ? newEmp.sector.toLowerCase() : '';
    const foundCustom = (customSectors || []).find(cs => cs.name.toLowerCase() === s);
    if (foundCustom && foundCustom.shifts && foundCustom.shifts.length > 0) {
      return foundCustom.shifts;
    }
    if (s.includes('extrusão') || s.includes('extrusao')) {
      return ['Diurno 1', 'Noturno 1', 'Diurno 2', 'Noturno 2'];
    }
    if (s.includes('liderança') || s.includes('lideranca')) {
      return ['Comercial', 'Comercial Flexível'];
    }
    if (s.includes('reciclagem')) {
      return ['Diurno 1', 'Diurno 2'];
    }
    if (s.includes('fita')) {
      return ['Diurno 1', 'Diurno 2', 'Comercial'];
    }
    return uniqueShifts;
  }, [newEmp.sector, uniqueShifts, customSectors]);

  const machinesForSector = useMemo(() => {
    const s = newEmp.sector ? newEmp.sector.toLowerCase() : '';
    const foundCustom = (customSectors || []).find(cs => cs.name.toLowerCase() === s);
    if (foundCustom && foundCustom.machines && foundCustom.machines.length > 0) {
      return foundCustom.machines;
    }
    if (s.includes('extrusão') || s.includes('extrusao')) {
      return ['Cast 1', 'Cast 2'];
    }
    if (s.includes('reciclagem')) {
      return ['Erema 1'];
    }
    if (s.includes('fita')) {
      return ['Ghezzi', 'Lintech', 'Wultec'];
    }
    if (s.includes('liderança') || s.includes('lideranca')) {
      return ['Geral'];
    }
    return uniqueMachines;
  }, [newEmp.sector, uniqueMachines, customSectors]);

  const filteredCollaboratorsForSelect = useMemo(() => {
    const list = (collaborators || []).filter(c => !isCollaboratorSilenced(c));
    if (!colSearchTerm) return list;
    const term = colSearchTerm.toLowerCase();
    return list.filter(c => {
      const name = c.name || '';
      const reg = c.registration || '';
      return name.toLowerCase().includes(term) || String(reg).toLowerCase().includes(term);
    });
  }, [collaborators, colSearchTerm]);

  if (!isOpen) return null;

  const handleAddSubmit = async () => {
    if (!newEmp.name.trim() && newEmp.status !== 'Em Contratação') {
      alert('Por favor, selecione um colaborador.');
      return;
    }

    const empToSave = {
      name: newEmp.name,
      role: newEmp.role,
      sector: newEmp.sector,
      machine: newEmp.machine,
      shift: newEmp.shift,
      status: newEmp.status,
      collaboratorId: newEmp.collaboratorId,
      registration: newEmp.registration
    };

    if (newEmp.status === 'Em Contratação' && !newEmp.name.trim()) {
      empToSave.name = 'Em Contratação';
    }

    await onAdd(empToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/30">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight uppercase">Alocação Rápida</h2>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Incluir no Setor: {defaultSector}</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 p-2 rounded-xl transition-all border border-slate-700">
            <X size={18} />
          </button>
        </div>

        {/* Content Form */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          
          {/* Selecionar Colaborador */}
          <div className="space-y-1.5 relative">
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />

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
                              registration: c.registration,
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
                              <p className="text-[9px] font-bold text-slate-400 uppercase">{c.role || 'Sem Cargo'}</p>
                            </div>
                            <span className="text-[9px] font-mono font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">#{c.registration}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-[10px] font-bold text-slate-400 italic">
                        Colaborador não encontrado.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Grid fields */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Cargo */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Cargo</label>
              <select
                value={newEmp.role}
                onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all h-[44px]"
              >
                {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Setor */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Setor</label>
              <select
                value={newEmp.sector}
                onChange={(e) => handleSectorChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all h-[44px]"
              >
                {allSectorOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Máquina */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Máquina / Posto</label>
              <select
                value={newEmp.machine}
                onChange={(e) => setNewEmp({ ...newEmp, machine: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all h-[44px]"
              >
                {machinesForSector.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* Turno */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Turno</label>
              <select
                value={newEmp.shift}
                onChange={(e) => setNewEmp({ ...newEmp, shift: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all h-[44px]"
              >
                {shiftsForSector.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Status</label>
            <select
              value={newEmp.status}
              onChange={(e) => setNewEmp({ ...newEmp, status: e.target.value as EmployeeStatus })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all h-[44px]"
            >
              {['Ativo', 'Férias', 'Atestado', 'Desligado', 'Em Contratação'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-6 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-black text-slate-500 uppercase transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAddSubmit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-200 active:scale-95 text-xs font-black uppercase"
          >
            <Plus size={16} />
            <span>Incluir</span>
          </button>
        </div>

      </div>
    </div>
  );
};
