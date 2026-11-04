import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, User, VolumeX, Volume2, ShieldAlert } from 'lucide-react';
import { Collaborator } from '../types';
import { IMPORTED_COLLABORATORS } from '../constants/importedCollaborators';

interface CollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Collaborator>) => Promise<void> | void;
  initialData?: Collaborator | null;
  operators?: string[];
  availableRoles?: string[];
  existingCollaborators?: Collaborator[];
}

const INITIAL_BRIGADA_REGS = ['1575', '1834', '1695', '1807', '1544', '1792', '1702', '1694', '1758', '1829', '1840', '1850', '1854', '1844', '1808'];

const normalizeToDateInput = (val?: string): string => {
  if (!val) return '';
  const clean = val.trim();
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      // DD/MM/YYYY -> YYYY-MM-DD
      if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  }
  return clean;
};

const CollaboratorModal: React.FC<CollaboratorModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData,
  availableRoles = [],
  existingCollaborators = []
}) => {
  const isEditing = Boolean(initialData && (initialData.id || initialData.registration));

  const [formData, setFormData] = useState<Partial<Collaborator>>({
    name: '',
    registration: '',
    role: '',
    birthDate: '',
    address: '',
    contact: '',
    isBrigadista: false,
    isSilenced: false,
    silenceReason: ''
  });

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const suggestions = useMemo(() => {
    // Apenas exibe sugestões do PDF se for um NOVO cadastro, não durante a edição
    if (isEditing || !showSuggestions) return [];
    const queryText = (formData.name || '').trim().toLowerCase();
    if (!queryText) return [];
    return IMPORTED_COLLABORATORS.filter(item => 
      item.name.toLowerCase().includes(queryText) ||
      item.registration.includes(queryText)
    ).slice(0, 10);
  }, [formData.name, showSuggestions, isEditing]);

  const rolesWithFormDataRole = useMemo(() => {
    const list = [...availableRoles];
    if (formData.role && !list.includes(formData.role)) {
      list.push(formData.role);
    }
    return list;
  }, [availableRoles, formData.role]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          ...initialData,
          birthDate: normalizeToDateInput(initialData.birthDate),
          isBrigadista: initialData.isBrigadista || false,
          isSilenced: initialData.isSilenced || false,
          silenceReason: initialData.silenceReason || ''
        });
      } else {
        setFormData({
          name: '',
          registration: '',
          role: availableRoles[0] || '',
          birthDate: '',
          address: '',
          contact: '',
          isBrigadista: false,
          isSilenced: false,
          silenceReason: ''
        });
      }
      setShowSuggestions(false);
      setIsSaving(false);
    }
  }, [isOpen, initialData, availableRoles]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = (formData.name || '').trim();
    const cleanReg = (formData.registration || '').trim();
    if (!cleanReg) {
      alert('A matrícula é obrigatória. Não é permitido cadastrar colaboradores sem matrícula.');
      return;
    }
    if (!cleanName) {
      alert('O nome do colaborador é obrigatório.');
      return;
    }

    // Validação estrita de matrícula única no Cadastro Global
    if (existingCollaborators && existingCollaborators.length > 0) {
      const currentId = initialData?.id || formData.id;
      const duplicate = existingCollaborators.find(c => 
        c && 
        c.registration && 
        c.registration.trim().toLowerCase() === cleanReg.toLowerCase() && 
        c.id !== currentId
      );
      if (duplicate) {
        alert(`A matrícula "${cleanReg}" já pertence ao colaborador "${duplicate.name}". O controle do sistema é estritamente pela matrícula única e não são permitidas duplicidades.`);
        return;
      }
    }

    const finalData: Partial<Collaborator> = {
      ...formData,
      id: initialData?.id || formData.id || `col_${cleanReg}`,
      name: cleanName,
      registration: cleanReg,
      role: formData.role || 'Auxiliar de Produção',
      birthDate: formData.birthDate || '',
      contact: (formData.contact || '').trim(),
      address: (formData.address || '').trim(),
      isBrigadista: !!formData.isBrigadista,
      isSilenced: !!formData.isSilenced,
      silencedAt: formData.isSilenced ? (formData.silencedAt || new Date().toISOString()) : '',
      silenceReason: formData.isSilenced ? (formData.silenceReason || 'Silenciado') : '',
      createdAt: initialData?.createdAt || formData.createdAt || new Date().toISOString()
    };

    setIsSaving(true);
    try {
      await onSave(finalData);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar no formulário:', err);
      alert('Erro ao salvar colaborador. Verifique se os dados estão corretos.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight">
                {initialData ? 'Editar Colaborador' : 'Novo Cadastro Global'}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Base Central de Pessoal</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
              <input 
                type="text" 
                value={formData.name || ''}
                onChange={e => {
                  setFormData({ ...formData, name: e.target.value });
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all"
                placeholder="Ex: João da Silva..."
              />

              {suggestions.length > 0 && (
                <div className="absolute top-[84px] left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[150] max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
                  {suggestions.map((s) => (
                    <button
                      key={s.registration}
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          name: s.name,
                          registration: s.registration,
                          role: s.role || formData.role,
                          isBrigadista: INITIAL_BRIGADA_REGS.includes(s.registration)
                        });
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-5 py-3 hover:bg-emerald-50 transition-colors border-b border-slate-100 last:border-0 flex justify-between items-center"
                    >
                      <div>
                        <p className="text-xs font-black text-slate-800">{s.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{s.role}</p>
                      </div>
                      <span className="text-[10px] font-mono font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        #{s.registration}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                  Matrícula <span className="text-red-500 font-black text-xs">* (Obrigatória)</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.registration || ''}
                  onChange={e => setFormData({ ...formData, registration: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all"
                  placeholder="Ex: 1611"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Função Principal</label>
                <select 
                  value={formData.role || ''}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all"
                >
                  <option value="">Selecione...</option>
                  {rolesWithFormDataRole.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Nascimento</label>
                <input 
                  type="date" 
                  value={formData.birthDate || ''}
                  onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contato (WhatsApp)</label>
                <input 
                  type="text" 
                  value={formData.contact || ''}
                  onChange={e => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço / Localidade</label>
              <input 
                type="text" 
                value={formData.address || ''}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all"
                placeholder="Rua, Bairro, Cidade..."
              />
            </div>

            <div className="flex items-center gap-3.5 p-4 bg-red-50 border border-red-100 rounded-2xl">
              <input 
                type="checkbox" 
                id="isBrigadista"
                checked={!!formData.isBrigadista}
                onChange={e => setFormData({ ...formData, isBrigadista: e.target.checked })}
                className="w-5 h-5 text-red-600 border-slate-300 rounded focus:ring-red-500 cursor-pointer"
              />
              <label htmlFor="isBrigadista" className="flex items-center gap-2 text-xs font-black text-red-800 uppercase tracking-wider cursor-pointer select-none">
                🔥 Integrante da Brigada de Incêndio
              </label>
            </div>

            {/* Opção de Silenciamento */}
            <div className={`p-4 rounded-2xl border transition-all ${formData.isSilenced ? 'bg-amber-50/80 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${formData.isSilenced ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {formData.isSilenced ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-slate-800 tracking-tight">Silenciar Colaborador</p>
                    <p className="text-[10px] text-slate-500 font-medium">Oculta das escalas, turnos e novos cadastros, mas mantém o histórico de produção 100% preservado.</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  id="isSilenced"
                  checked={!!formData.isSilenced}
                  onChange={e => setFormData({ ...formData, isSilenced: e.target.checked })}
                  className="w-5 h-5 text-amber-600 border-slate-300 rounded focus:ring-amber-500 cursor-pointer"
                />
              </div>

              {formData.isSilenced && (
                <div className="mt-3 pt-3 border-t border-amber-200/60 space-y-1.5 animate-in fade-in">
                  <label className="text-[9px] font-black text-amber-800 uppercase tracking-widest">Motivo do Silenciamento / Desligamento</label>
                  <input 
                    type="text" 
                    value={formData.silenceReason || ''}
                    onChange={e => setFormData({ ...formData, silenceReason: e.target.value })}
                    placeholder="Ex: Demissão / Desligado da empresa..."
                    className="w-full bg-white border border-amber-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 disabled:bg-slate-400 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save size={18} />
              )}
              {isSaving ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Confirmar Cadastro')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CollaboratorModal;
