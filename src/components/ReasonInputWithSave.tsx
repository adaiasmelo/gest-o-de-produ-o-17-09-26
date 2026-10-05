import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sparkles, ChevronDown, Check, X, Trash2, Plus } from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface ReasonInputWithSaveProps {
  value: string;
  onChange: (value: string) => void;
  category: string;
  label?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  loggedUserName?: string;
  multiline?: boolean;
  rows?: number;
  hideLabel?: boolean;
  required?: boolean;
}

const DEFAULT_PRESETS_BY_CATEGORY: Record<string, string[]> = {
  overtime: [
    'Atendimento emergencial de produção',
    'Manutenção corretiva de linha de extrusão',
    'Finalização de ordem de produção prioritária',
    'Cobertura de falta não programada de operador',
    'Setup e troca de matriz de alta complexidade',
    'Carregamento emergencial de expedição',
    'Auditoria de inventário e qualidade'
  ],
  extrusao_ecob: [
    'Troca de bobina / Refile de borda',
    'Acerto de espessura de filme',
    'Setup de matriz e anel de ar',
    'Quebra de balão durante passagem',
    'Oscilação de temperatura do cabeçote'
  ],
  extrusao_ecobp: [
    'Troca de bobina em fluxo contínuo',
    'Acerto de espessura durante produção',
    'Refile lateral fora da tolerância',
    'Variação de dosagem de resina'
  ],
  extrusao_ecobm: [
    'Setup mecânico e alinhamento',
    'Troca de rosca ou matriz Cast',
    'Aparamento em teste de manutenção',
    'Limpeza técnica pós-intervenção'
  ],
  extrusao_ecoa: [
    'Refugo limpo para reutilização na matriz',
    'Apara nobre de inicialização',
    'Envio para reprocessamento na sede Curitiba'
  ],
  extrusao_borra: [
    'Purga de limpeza de canhão',
    'Descontaminação por troca de polímero',
    'Troca de telas e filtros de cabeçote',
    'Inicialização térmica de extrusora'
  ],
  paradas_manutencao: [
    'Manutenção corretiva mecânica no enrolador',
    'Falha elétrica no inversor do canhão',
    'Troca de facas e lâminas de refile',
    'Vazamento hidráulico no cast',
    'Reparo no anel de resfriamento'
  ],
  paradas_processo: [
    'Acerto de espessura e largura de filme',
    'Limpeza de matriz e lábio de sopro',
    'Troca de rolo e tubetes',
    'Transição de formulação de resina',
    'Aquecimento e estabilização térmica'
  ],
  paradas_outros: [
    'Falta de matéria-prima ou aditivo',
    'Oscilação ou queda de energia da concessionária',
    'Treinamento e DDS operacional de equipe',
    'Pausa regulamentar de refeição / transição de turno'
  ],
  paradas_extrusao: [
    'Manutenção preventiva programada',
    'Troca de formato e lâminas',
    'Ajuste técnico de estiramento',
    'Falha elétrica ou de automação'
  ],
  paradas_fita: [
    'Troca de lâminas da cortadeira',
    'Abastecimento de tubetes e bobinas mãe',
    'Acerto de tensão do rebobinador',
    'Manutenção corretiva da esteira',
    'Limpeza periódica de navalhas'
  ]
};

// Função auxiliar reutilizável em qualquer componente para salvar motivos na relação
export const saveReasonToLibrary = async (category: string, reasonText: string, userName = 'Sistema') => {
  const trimmed = reasonText.trim();
  if (!trimmed || !category) return;
  try {
    const cachedStr = localStorage.getItem(`reasons_cache_${category}`);
    const cached: Array<{ id?: string; reason: string }> = cachedStr ? JSON.parse(cachedStr) : [];
    if (!cached.some(c => c.reason.toLowerCase() === trimmed.toLowerCase())) {
      const next = [{ reason: trimmed }, ...cached];
      localStorage.setItem(`reasons_cache_${category}`, JSON.stringify(next));
    }
    await addDoc(collection(db, 'reasons_library'), {
      reason: trimmed,
      category,
      createdAt: new Date().toISOString(),
      createdBy: userName
    });
    if (category === 'overtime') {
      await addDoc(collection(db, 'overtime_reasons'), {
        reason: trimmed,
        createdAt: new Date().toISOString(),
        createdBy: userName
      });
    }
  } catch (err) {
    console.warn(`Erro ao salvar motivo (${category}) na biblioteca:`, err);
  }
};

export const ReasonInputWithSave: React.FC<ReasonInputWithSaveProps> = ({
  value,
  onChange,
  category,
  label,
  placeholder = 'Digite a justificativa / motivo...',
  className = '',
  inputClassName = '',
  loggedUserName = 'Sistema',
  multiline = false,
  rows = 2,
  hideLabel = false,
  required = false
}) => {
  const [savedReasons, setSavedReasons] = useState<Array<{ id?: string; reason: string }>>(() => {
    try {
      const cached = localStorage.getItem(`reasons_cache_${category}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // ignore
    }
    const defaults = DEFAULT_PRESETS_BY_CATEGORY[category] || [];
    return defaults.map((r) => ({ reason: r }));
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Escuta em tempo real no Firestore para a categoria
  useEffect(() => {
    if (!category) return;
    try {
      const q = query(collection(db, 'reasons_library'), where('category', '==', category));
      const unsub = onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.map((d) => ({
            id: d.id,
            reason: (d.data().reason || '').trim()
          })).filter(item => item.reason.length > 0);

          // Remove duplicatas
          const uniqueMap = new Map<string, { id?: string; reason: string }>();
          list.forEach((item) => {
            const key = item.reason.toLowerCase();
            if (!uniqueMap.has(key)) {
              uniqueMap.set(key, item);
            }
          });

          const uniqueList = Array.from(uniqueMap.values());
          setSavedReasons(uniqueList);
          try {
            localStorage.setItem(`reasons_cache_${category}`, JSON.stringify(uniqueList));
          } catch (e) {}
        },
        (err) => {
          console.warn(`Erro ao sincronizar reasons_library (${category}):`, err);
        }
      );
      return () => unsub();
    } catch (err) {
      console.warn('Erro ao configurar listener reasons_library:', err);
    }
  }, [category]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trimmedValue = (value || '').trim();

  // Verifica se o texto digitado já existe exatamente na lista
  const isReasonNew = useMemo(() => {
    if (!trimmedValue) return false;
    const lower = trimmedValue.toLowerCase();
    return !savedReasons.some((item) => item.reason.toLowerCase() === lower);
  }, [trimmedValue, savedReasons]);

  // Filtra as sugestões conforme o que está digitado
  const filteredSuggestions = useMemo(() => {
    if (!trimmedValue) return savedReasons;
    const lower = trimmedValue.toLowerCase();
    return savedReasons.filter((item) => item.reason.toLowerCase().includes(lower));
  }, [savedReasons, trimmedValue]);

  // Função para salvar nova justificativa na relação
  const handleSaveToDatabase = async () => {
    if (!trimmedValue || isSaving) return;
    setIsSaving(true);
    try {
      // Salva localmente primeiro
      const newItem = { reason: trimmedValue };
      setSavedReasons((prev) => {
        const next = [newItem, ...prev.filter((i) => i.reason.toLowerCase() !== trimmedValue.toLowerCase())];
        try {
          localStorage.setItem(`reasons_cache_${category}`, JSON.stringify(next));
        } catch (e) {}
        return next;
      });

      // Salva no Firestore
      const docRef = await addDoc(collection(db, 'reasons_library'), {
        reason: trimmedValue,
        category,
        createdAt: new Date().toISOString(),
        createdBy: loggedUserName
      });

      // Se for overtime, sincroniza também em overtime_reasons
      if (category === 'overtime') {
        try {
          await addDoc(collection(db, 'overtime_reasons'), {
            reason: trimmedValue,
            createdAt: new Date().toISOString(),
            createdBy: loggedUserName
          });
        } catch (e) {}
      }

      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } catch (err) {
      console.error('Erro ao salvar motivo na biblioteca:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Excluir motivo salvo da relação
  const handleDeleteSavedReason = async (e: React.MouseEvent, item: { id?: string; reason: string }) => {
    e.stopPropagation();
    try {
      setSavedReasons((prev) => {
        const next = prev.filter((i) => i.reason.toLowerCase() !== item.reason.toLowerCase());
        try {
          localStorage.setItem(`reasons_cache_${category}`, JSON.stringify(next));
        } catch (err) {}
        return next;
      });

      if (item.id) {
        await deleteDoc(doc(db, 'reasons_library', item.id));
      }
    } catch (err) {
      console.warn('Erro ao deletar motivo:', err);
    }
  };

  return (
    <div ref={containerRef} className={`relative space-y-1.5 ${className}`}>
      {!hideLabel && label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span>{label}</span>
            {required && <span className="text-red-500">*</span>}
          </label>
          {savedReasons.length > 0 && (
            <span className="text-[10px] font-bold text-slate-400">
              {savedReasons.length} {savedReasons.length === 1 ? 'salvo' : 'salvos'} na relação
            </span>
          )}
        </div>
      )}

      {/* Caixa do Input com botões integrados */}
      <div className="relative flex items-center">
        {multiline ? (
          <textarea
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-16 transition-all ${inputClassName}`}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-16 transition-all ${inputClassName}`}
          />
        )}

        <div className="absolute right-2 flex items-center gap-1">
          {trimmedValue.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60 transition-colors"
              title="Limpar texto"
            >
              <X size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
              isOpen
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200 shadow-2xs'
            }`}
            title="Ver relação de justificativas salvas"
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Banner de "Salvar na Relação" quando o usuário digitou uma justificativa nova */}
      {isReasonNew && trimmedValue.length > 0 && (
        <div className="p-2.5 bg-amber-50/90 border border-amber-200/80 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-900 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles size={14} className="text-amber-600 shrink-0" />
            <span className="truncate text-[11px]">
              <strong>Nova justificativa:</strong> Deseja gravar na relação para as próximas vezes?
            </span>
          </div>
          <button
            type="button"
            onClick={handleSaveToDatabase}
            disabled={isSaving || justSaved}
            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer shadow-xs flex items-center gap-1 ${
              justSaved
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-600 hover:bg-amber-700 active:scale-95 text-white'
            }`}
          >
            {justSaved ? (
              <>
                <Check size={12} />
                <span>Salvo na Relação!</span>
              </>
            ) : (
              <>
                <Plus size={12} />
                <span>Salvar na Relação</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Dropdown com a lista de justificativas salvas */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-56 overflow-y-auto z-30 py-1 divide-y divide-slate-100 custom-scrollbar">
          {/* Opção rápida de usar novo texto digitado */}
          {isReasonNew && trimmedValue.length > 0 && (
            <div className="p-2.5 bg-amber-50/80 hover:bg-amber-100/70 flex items-center justify-between gap-2 transition-colors border-b border-amber-100">
              <div className="min-w-0 flex items-center gap-2">
                <Sparkles size={14} className="text-amber-600 shrink-0" />
                <div className="truncate">
                  <div className="text-xs font-bold text-amber-900 truncate">
                    Usar: "{trimmedValue}"
                  </div>
                  <div className="text-[10px] text-amber-700">Opção ainda não salva na relação</div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveToDatabase}
                disabled={isSaving || justSaved}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer"
              >
                {justSaved ? '✓ Salvo' : 'Salvar'}
              </button>
            </div>
          )}

          {/* Lista de motivos cadastrados */}
          {filteredSuggestions.length > 0 ? (
            filteredSuggestions.map((item) => {
              const isSelected = item.reason.toLowerCase() === trimmedValue.toLowerCase();
              return (
                <div
                  key={item.id || item.reason}
                  onClick={() => {
                    onChange(item.reason);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-blue-900 font-bold'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isSelected ? 'bg-blue-600' : 'bg-emerald-500'
                      }`}
                    />
                    <span className="truncate leading-snug font-medium">{item.reason}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                      Salvo
                    </span>
                    {isSelected && <Check size={14} className="text-blue-600" />}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSavedReason(e, item)}
                      className="p-1 text-slate-300 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                      title="Excluir este motivo da relação"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-3 text-center text-xs text-slate-400">
              {trimmedValue ? (
                <span>Nenhuma justificativa salva coincide com a busca. Digite e clique em "Salvar na Relação".</span>
              ) : (
                <span>Nenhuma justificativa salva nesta categoria ainda. Digite acima para cadastrar.</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReasonInputWithSave;
