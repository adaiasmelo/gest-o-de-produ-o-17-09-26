
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Save, Edit2, Package, Layers, Trash2, Clock, Wrench, CalendarX, Camera, Loader2, Search, Plus, ShieldAlert, AlertTriangle, ArrowLeft, Zap } from 'lucide-react';
import { ProductionEntry, RibbonCuttingEntry, Shift, Collaborator, Employee, Vacation } from '../types';
import { extractProductionData } from '../services/aiService';
import { extractDowntimeMotives, ECO_B_REASONS_PRESETS } from '../constants/downtimeReasons';
import { StopItemCard } from './StopItemCard';
import { isEmployeeSilenced, isCollaboratorSilenced, getSilencedNamesSet } from '../utils/silenceUtils';
import { isOperatorOnVacation, getVacationingOperatorNamesSet } from '../utils/vacationUtils';

const toggleEcoBReason = (currentText: string, reasonToToggle: string): string => {
  if (!currentText || !currentText.trim()) {
    return reasonToToggle;
  }
  
  let parts = currentText.split(/ • |;|,/).map(p => p.trim()).filter(Boolean);
  const existingIdx = parts.findIndex(p => p.toLowerCase() === reasonToToggle.toLowerCase());
  
  if (existingIdx >= 0) {
    parts.splice(existingIdx, 1);
  } else {
    parts.push(reasonToToggle);
  }
  
  return parts.join(' • ');
};

const isEcoBReasonSelected = (currentText: string, reason: string): boolean => {
  if (!currentText) return false;
  const parts = currentText.split(/ • |;|,/).map(p => p.trim().toLowerCase());
  return parts.includes(reason.toLowerCase());
};

interface EcoBReasonCardProps {
  label: string;
  weightName: 'ecoBP' | 'ecoBM';
  motivoName: 'ecoBPMotivo' | 'ecoBMMotivo';
  weightValue: number;
  motivoValue: string;
  categoryGroups?: { groupName: string; reasons: string[] }[];
  onWeightChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMotivoChange: (fieldName: 'ecoBPMotivo' | 'ecoBMMotivo', newValue: string) => void;
}

const EcoBReasonCard: React.FC<EcoBReasonCardProps> = ({
  label,
  weightName,
  motivoName,
  weightValue,
  motivoValue,
  categoryGroups,
  onWeightChange,
  onMotivoChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedReasons = useMemo(() => {
    if (!motivoValue) return [];
    return motivoValue.split(/ • |;|,/).map(p => p.trim()).filter(Boolean);
  }, [motivoValue]);

  const totalReasonsCount = useMemo(() => {
    if (categoryGroups && categoryGroups.length > 0) {
      return categoryGroups.reduce((acc, g) => acc + g.reasons.length, 0);
    }
    return ECO_B_REASONS_PRESETS.length;
  }, [categoryGroups]);

  return (
    <div className="bg-white p-2 rounded-xl border border-orange-200/70 space-y-1.5 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <label className="text-[10px] font-black text-orange-600 uppercase tracking-wider">{label}</label>
          {selectedReasons.length > 0 && (
            <span className="text-[8px] font-black bg-orange-100 text-orange-800 px-1.5 py-0.2 rounded-full border border-orange-200">
              {selectedReasons.length} {selectedReasons.length === 1 ? 'motivo' : 'motivos'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            name={weightName}
            value={weightValue || ''}
            onChange={onWeightChange}
            className="w-20 bg-slate-50 border border-orange-200 rounded-lg px-2 py-0.5 text-xs font-black text-slate-800 text-right focus:bg-white focus:ring-1 focus:ring-orange-400 outline-none h-6"
            placeholder="0"
          />
          <span className="text-[10px] font-bold text-slate-400">Kg</span>
        </div>
      </div>

      {weightValue > 0 && (
        <div className="pt-1.5 border-t border-dashed border-orange-150 space-y-1.5">
          {/* Quick Dropdown Picker */}
          <div className="flex items-center gap-1.5">
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  onMotivoChange(motivoName, toggleEcoBReason(motivoValue, e.target.value));
                  e.target.value = '';
                }
              }}
              className="w-full bg-orange-50/60 text-slate-800 border border-orange-200 rounded-lg px-2 py-1 text-[10px] font-bold focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-400 cursor-pointer shadow-2xs h-7"
            >
              <option value="">📋 Adicionar motivo padronizado de Eco B...</option>
              {categoryGroups && categoryGroups.length > 0 ? (
                categoryGroups.map((group, gIdx) => (
                  <optgroup key={gIdx} label={group.groupName}>
                    {group.reasons.map((reason, rIdx) => {
                      const selected = isEcoBReasonSelected(motivoValue, reason);
                      return (
                        <option key={rIdx} value={reason}>
                          {selected ? '✓ ' : '+ '}{reason}
                        </option>
                      );
                    })}
                  </optgroup>
                ))
              ) : (
                ECO_B_REASONS_PRESETS.map((reason, idx) => {
                  const selected = isEcoBReasonSelected(motivoValue, reason);
                  return (
                    <option key={idx} value={reason}>
                      {selected ? '✓ ' : '+ '}{reason}
                    </option>
                  );
                })
              )}
            </select>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2 py-1 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer h-7"
            >
              {isExpanded ? 'Ocultar' : `Opções (${totalReasonsCount})`}
            </button>
          </div>

          {/* Interactive Multi-Select Pills */}
          {isExpanded && (
            <div className="p-2 bg-slate-50 border border-orange-200/80 rounded-lg space-y-1.5">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                <span>⚡ Seleção Múltipla:</span>
                <span className="text-[8px] text-orange-600 font-bold">Marcar/desmarcar</span>
              </p>
              <div className="space-y-1.5 pr-1">
                {categoryGroups && categoryGroups.length > 0 ? (
                  categoryGroups.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-0.5">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">{group.groupName}</p>
                      <div className="flex flex-wrap gap-1">
                        {group.reasons.map((reason, rIdx) => {
                          const active = isEcoBReasonSelected(motivoValue, reason);
                          return (
                            <button
                              key={rIdx}
                              type="button"
                              onClick={() => onMotivoChange(motivoName, toggleEcoBReason(motivoValue, reason))}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all text-left flex items-center gap-1 cursor-pointer ${
                                active
                                  ? 'bg-orange-600 text-white font-extrabold shadow-2xs border border-orange-600'
                                  : 'bg-white text-slate-700 hover:bg-orange-100/70 border border-slate-200'
                              }`}
                            >
                              <span className="text-[10px] font-black">{active ? '✓' : '＋'}</span>
                              <span>{reason}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {ECO_B_REASONS_PRESETS.map((reason, idx) => {
                      const active = isEcoBReasonSelected(motivoValue, reason);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onMotivoChange(motivoName, toggleEcoBReason(motivoValue, reason))}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all text-left flex items-center gap-1 cursor-pointer ${
                            active
                              ? 'bg-orange-600 text-white font-extrabold shadow-2xs border border-orange-600'
                              : 'bg-white text-slate-700 hover:bg-orange-100/70 border border-slate-200'
                          }`}
                        >
                          <span className="text-[10px] font-black">{active ? '✓' : '＋'}</span>
                          <span>{reason}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Selected Active Badges Chips */}
          {selectedReasons.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {selectedReasons.map((reason, rIdx) => (
                <span
                  key={rIdx}
                  className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[9px] font-bold bg-orange-100 text-orange-900 border border-orange-200 shadow-2xs"
                >
                  <span>{reason}</span>
                  <button
                    type="button"
                    onClick={() => onMotivoChange(motivoName, toggleEcoBReason(motivoValue, reason))}
                    className="hover:text-red-600 font-extrabold ml-0.5 text-[10px] cursor-pointer"
                    title="Remover motivo"
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => onMotivoChange(motivoName, '')}
                className="text-[8px] font-black text-red-500 hover:text-red-700 underline px-1 cursor-pointer"
              >
                Limpar
              </button>
            </div>
          )}

          {/* Custom Editable Text Box */}
          <div>
            <input
              type="text"
              name={motivoName}
              value={motivoValue || ''}
              onChange={(e) => onMotivoChange(motivoName, e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-[10px] font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-orange-400 outline-none"
              placeholder="Justificar perda de Eco B (digite ou selecione acima)..."
            />
          </div>
        </div>
      )}
    </div>
  );
};

interface LaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<ProductionEntry, 'id'> & { id?: string }) => void;
  collaborators: Collaborator[];
  employees: Employee[];
  vacations?: Vacation[];
  activeMachines: string[];
  availableShifts: Shift[];
  initialData?: ProductionEntry | null;
  dashboardMonth?: string;
  productionEntries?: ProductionEntry[];
  ribbonEntries?: RibbonCuttingEntry[];
  isStandaloneDowntimeInitial?: boolean;
}

interface StopItem {
  id: string;
  de: string;
  ate: string;
  motivo: string;
  explicacao?: string;
  keyword?: string;
  justification?: string;
  isAvulso?: boolean;
  durationMinutes?: number;
}

const getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('sv-SE');
};

const formatWeight = (val: number) => {
  const absVal = Math.abs(val);
  if (absVal >= 1000) {
    return (val / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).replace(',', '.') + ' T';
  }
  return val.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' Kg';
};

const getDefaultDateForMonth = (dbMonth?: string) => {
  const yesterdayStr = getYesterdayStr();
  if (!dbMonth) return yesterdayStr;

  const todayStr = new Date().toLocaleDateString('sv-SE');
  const todayYm = todayStr.slice(0, 7);
  const yesterdayYm = yesterdayStr.slice(0, 7);

  if (dbMonth === todayYm || dbMonth === yesterdayYm) {
    return yesterdayStr;
  }
  return `${dbMonth}-01`;
};

const getDiffMinutes = (startTimeStr: string, endTimeStr: string): number => {
  if (!startTimeStr || !endTimeStr) return 0;
  const [hStart, mStart] = startTimeStr.split(':').map(Number);
  const [hEnd, mEnd] = endTimeStr.split(':').map(Number);
  if (isNaN(hStart) || isNaN(mStart) || isNaN(hEnd) || isNaN(mEnd)) return 0;
  
  let startMin = hStart * 60 + mStart;
  let endMin = hEnd * 60 + mEnd;
  
  if (endMin < startMin) {
    endMin += 24 * 60;
  }
  return endMin - startMin;
};

const calcTotalMinutes = (stops: StopItem[]): number => {
  return stops.reduce((sum, item) => {
    const manual = Number(item.durationMinutes);
    if (item.isAvulso || (!item.de && !item.ate)) {
      return sum + (isNaN(manual) ? 0 : manual);
    }
    const diff = getDiffMinutes(item.de, item.ate);
    return sum + (diff > 0 ? diff : (isNaN(manual) ? 0 : manual));
  }, 0);
};

const formatDurationHuman = (mins: number) => {
  if (!mins || mins <= 0) return '0 min';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hours < 24) {
    return rem > 0 ? `${hours}h ${rem}min` : `${hours}h`;
  }
  const days = (mins / (24 * 60)).toFixed(1).replace('.0', '');
  return `${hours}h ${rem > 0 ? `${rem}min ` : ''}(~${days} dias)`;
};

const PRESET_INFRACTIONS = [
  '🛑 Não realizou parada obrigatória de limpeza (ex: 6h/6h)',
  '⚠️ Descumprimento de Procedimento Operacional Padrão (POP)',
  '🦺 Inobservância de Normas de Segurança / Uso de EPI',
  '🗑️ Geração excessiva de aparas por falta de regulagem',
  '⚙️ Operação de máquina fora dos parâmetros do processo',
  '🕒 Atraso / Ausência não notificada no início do turno',
  '📝 Outra Infração Personalizada...',
];

const LaunchModal: React.FC<LaunchModalProps> = ({ 
  isOpen, onClose, onSave, collaborators, employees, vacations = [], activeMachines, availableShifts, initialData, dashboardMonth,
  productionEntries = [], ribbonEntries = [], isStandaloneDowntimeInitial = false
}) => {
  const [downtimeVersion, setDowntimeVersion] = useState(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => setDowntimeVersion(v => v + 1);
    window.addEventListener('downtime_reasons_updated', handleUpdate);
    return () => window.removeEventListener('downtime_reasons_updated', handleUpdate);
  }, []);

  const downtimeSuggestions = useMemo(() => {
    return extractDowntimeMotives(productionEntries, ribbonEntries);
  }, [productionEntries, ribbonEntries, downtimeVersion]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [pendingEntries, setPendingEntries] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [formData, setFormData] = useState({
    date: getYesterdayStr(),
    operator: '',
    machine: '',
    shift: '',
    grossWeight: 0,
    tara: 0,
    netWeight: 0,
    volumes: 0,
    tubetes: 0,
    tubetesEcoB: 0,
    ecoA: 0,
    ecoBP: 0,
    ecoBM: 0,
    borraTotal: 0,
    ecoAMotivo: '',
    ecoBPMotivo: '',
    ecoBMMotivo: '',
    borraTotalMotivo: '',
    manutencaoMin: 0,
    manutencaoMotivo: '',
    processoMin: 0,
    processoMotivo: '',
    outrosMin: 0,
    outrosMotivo: '',
    isMaintenanceEntry: false,
    isStandaloneDowntime: false,
    downtimeCategory: 'manutencao' as 'manutencao' | 'processo' | 'outros',
    isNoWorkDay: false,
    noWorkReason: '',
    eremaWeight1: 0,
    eremaWeight2: 0,
    eremaWeight3: 0,
    eremaWeight4: 0,
    recycledUsed: 0,
    recycledBags: 0,
    materialType: 'LC3',
    hasPenalty: false,
    infractionType: '',
    penaltyType: 'deduction_kg' as 'deduction_kg' | 'deduction_percent' | 'disqualify',
    deductionValue: 500,
    penaltyReason: '',
  });

  const [selectedPresetInfraction, setSelectedPresetInfraction] = useState<string>(PRESET_INFRACTIONS[0]);
  const [customInfractionText, setCustomInfractionText] = useState<string>('');

  const [manutencaoStops, setManutencaoStops] = useState<StopItem[]>([]);
  const [processoStops, setProcessoStops] = useState<StopItem[]>([]);
  const [outrosStops, setOutrosStops] = useState<StopItem[]>([]);
  const [selectedStopCategory, setSelectedStopCategory] = useState<'manutencao' | 'processo' | 'outros' | 'todas'>('manutencao');
  const [materials, setMaterials] = useState<Array<{
    id: string;
    materialType: string;
    volumes: number;
    tubetes: number;
    tubetesEcoB: number;
  }>>([]);
  const [confirmDeleteMatId, setConfirmDeleteMatId] = useState<string | null>(null);

  const handleAddMaterial = () => {
    setMaterials(prev => [
      ...prev,
      {
        id: `mat-${Date.now()}-${Math.random()}`,
        materialType: 'LC3',
        volumes: 0,
        tubetes: 0,
        tubetesEcoB: 0,
      }
    ]);
  };

  const handleUpdateMaterial = (id: string, field: 'materialType' | 'volumes' | 'tubetes' | 'tubetesEcoB', value: any) => {
    setMaterials(prev => prev.map(m => {
      if (m.id === id) {
        const updated = { ...m, [field]: value };
        if (field === 'volumes') {
          updated.tubetes = (Number(value) || 0) * 16;
        }
        return updated;
      }
      return m;
    }));
  };

  const handleRemoveMaterial = (id: string) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
    setConfirmDeleteMatId(null);
  };

  const manutencaoMinCalculado = useMemo(() => calcTotalMinutes(manutencaoStops), [manutencaoStops]);
  const processoMinCalculado = useMemo(() => calcTotalMinutes(processoStops), [processoStops]);
  const outrosMinCalculado = useMemo(() => calcTotalMinutes(outrosStops), [outrosStops]);

  const [opSearchTerm, setOpSearchTerm] = useState('');
  const [isOpDropdownOpen, setIsOpDropdownOpen] = useState(false);

  // Mapeador canônico para máquinas de Extrusão e Reciclagem (K1/Cast 1, K2/Cast 2, Arena/Erema)
  const getCanonicalExtrusionMachine = (m?: string): 'cast 1' | 'cast 2' | 'erema' | null => {
    const norm = (m || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim();
    if (norm.includes('cast 1') || norm.includes('cast1') || norm === 'k1' || norm === 'k 1') return 'cast 1';
    if (norm.includes('cast 2') || norm.includes('cast2') || norm === 'k2' || norm === 'k 2') return 'cast 2';
    if (norm.includes('erema') || norm.includes('arena') || norm.includes('recicla')) return 'erema';
    return null;
  };

  const filteredOperators = useMemo(() => {
    // Normalizador de textos
    const normalize = (val?: string) => 
      (val || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim();

    const selectedMachineCanonical = getCanonicalExtrusionMachine(formData.machine);
    const isEremaSelected = selectedMachineCanonical === 'erema';
    const selectedShiftNorm = normalize(formData.shift);

    const operatorMap = new Map<string, { id: string; name: string; machine?: string; shift?: string; isMachineOp: boolean }>();
    const silencedNamesSet = getSilencedNamesSet(collaborators, employees);
    const vacationingNamesSet = getVacationingOperatorNamesSet(employees);

    // 1. Filtrar da tela de Pessoal (employees)
    if (employees && Array.isArray(employees)) {
      employees.forEach(emp => {
        // Ignora sumariamente qualquer operador silenciado
        if (isEmployeeSilenced(emp, collaborators)) return;

        // REGRA DE FÉRIAS: Operador em período de férias no card de pessoal não deve aparecer na seleção.
        // Retorna automaticamente para a caixa de seleção a partir da data de retorno.
        if (isOperatorOnVacation(emp)) return;

        const empNameNorm = normalize(emp.name);
        const empStatusNorm = normalize(emp.status);
        if (empNameNorm.includes('excluid') || empStatusNorm.includes('excluid')) return;
        if (empNameNorm.includes('silenciad') || empStatusNorm.includes('silenciad')) return;
        if (silencedNamesSet.has(empNameNorm)) return;
        if (vacationingNamesSet.has(empNameNorm)) return;
        if (!emp.name || emp.name === 'Em Contratação' || emp.name === 'Vaga Disponível') return;

        // REGRA ESTRITA: Somente OPERADORES. Auxiliares de Produção, Líderes ou outros cargos NÃO devem aparecer
        const roleNorm = normalize(emp.role);
        const isOperator = roleNorm.includes('operador') && !roleNorm.includes('auxiliar');
        if (!isOperator) return;

        const empMachineNorm = normalize(emp.machine);
        const empSectorNorm = normalize(emp.sector);

        // Bloqueia expressamente funcionários de Corte de Fita (Ghezzi, Lintech, Wutec ou setor fita)
        if (empSectorNorm.includes('fita') || empMachineNorm.includes('ghez') || empMachineNorm.includes('lintec') || empMachineNorm.includes('wutec')) {
          return;
        }

        // Deve pertencer a uma das máquinas de Extrusão/Reciclagem: K1 (Cast 1), K2 (Cast 2) ou Arena (Erema)
        const empCanonicalMach = getCanonicalExtrusionMachine(emp.machine);
        if (!empCanonicalMach) return;

        // Regra de negócios:
        // - Se Erema estiver selecionado: exibe estritamente os operadores de Erema.
        // - Se Cast 1, Cast 2 (ou nenhuma) estiver selecionado: exibe TODOS os operadores do Cast 1 e Cast 2 (revezam entre si).
        if (isEremaSelected) {
          if (empCanonicalMach !== 'erema') return;
        } else {
          if (empCanonicalMach !== 'cast 1' && empCanonicalMach !== 'cast 2') return;
        }

        const nameClean = emp.name.trim();
        operatorMap.set(nameClean.toLowerCase(), {
          id: emp.id,
          name: nameClean,
          machine: emp.machine,
          shift: emp.shift,
          isMachineOp: true
        });
      });
    }

    // 2. Se for edição de lançamento existente, preserva o operador original se pertencer ao mesmo grupo
    if (initialData && initialData.operator) {
      const opName = initialData.operator.trim();
      const initMachCanonical = getCanonicalExtrusionMachine(initialData.machine);
      const isInitErema = initMachCanonical === 'erema';
      if (opName && isEremaSelected === isInitErema && !operatorMap.has(opName.toLowerCase())) {
        operatorMap.set(opName.toLowerCase(), {
          id: `initial-op-${Date.now()}`,
          name: opName,
          machine: initialData.machine,
          shift: initialData.shift,
          isMachineOp: true
        });
      }
    }

    // Ordenação: se houver turno selecionado, prioriza os operadores daquele turno no topo
    return Array.from(operatorMap.values()).sort((a, b) => {
      if (selectedShiftNorm) {
        const aShiftNorm = normalize(a.shift);
        const bShiftNorm = normalize(b.shift);
        const aMatch = aShiftNorm.includes(selectedShiftNorm) || selectedShiftNorm.includes(aShiftNorm);
        const bMatch = bShiftNorm.includes(selectedShiftNorm) || selectedShiftNorm.includes(bShiftNorm);
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
      }
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [collaborators, employees, vacations, initialData, formData.machine, formData.shift]);

  const isErema = getCanonicalExtrusionMachine(formData.machine) === 'erema' || formData.machine.toLowerCase().includes('erema');

  const parseMotivo = (motivo: string | undefined, min: number): StopItem[] => {
    if (!motivo) return [];
    try {
      if (motivo.startsWith('[') && motivo.endsWith(']')) {
        const parsed = JSON.parse(motivo);
        if (Array.isArray(parsed)) {
          return parsed.map((item, idx) => {
            const written = (item.explicacao || item.justification || item.observacao || item.observacoes || item.descricao || '').trim();
            const tag = (item.motivo || item.keyword || '').trim();
            const reason = written || tag;
            const duration = Number(item.durationMinutes || item.minutos || item.minutes || 0);
            return {
              id: item.id || `stop-${idx}-${Date.now()}-${Math.random()}`,
              de: item.de || '',
              ate: item.ate || '',
              motivo: reason,
              keyword: item.keyword || tag,
              explicacao: reason,
              justification: reason,
              isAvulso: Boolean(item.isAvulso || (!item.de && !item.ate && (duration > 0 || min > 0))),
              durationMinutes: duration > 0 ? duration : (min > 0 && !item.de && !item.ate ? min : 0)
            };
          });
        }
      }
    } catch (e) {
      // continua no fallback
    }
    if (min > 0 || motivo) {
      return [{
        id: `stop-legacy-${Date.now()}-${Math.random()}`,
        de: '',
        ate: '',
        motivo: motivo || '',
        keyword: '',
        explicacao: motivo || '',
        justification: motivo || '',
        isAvulso: true,
        durationMinutes: min
      }];
    }
    return [];
  };

  const handleAddStop = (type: 'manutencao' | 'processo' | 'outros', isAvulso = false) => {
    const newItem: StopItem = {
      id: `stop-${Date.now()}-${Math.random()}`,
      de: '',
      ate: '',
      motivo: '',
      explicacao: '',
      isAvulso,
      durationMinutes: 0
    };
    setSelectedStopCategory(type);
    if (type === 'manutencao') {
      setManutencaoStops(prev => [...prev, newItem]);
    } else if (type === 'processo') {
      setProcessoStops(prev => [...prev, newItem]);
    } else {
      setOutrosStops(prev => [...prev, newItem]);
    }
  };

  const handleUpdateStop = (type: 'manutencao' | 'processo' | 'outros', id: string, field: keyof StopItem, value: any) => {
    const updateFn = (prev: StopItem[]) => prev.map(item => item.id === id ? { ...item, [field]: value } : item);
    if (type === 'manutencao') {
      setManutencaoStops(updateFn);
    } else if (type === 'processo') {
      setProcessoStops(updateFn);
    } else {
      setOutrosStops(updateFn);
    }
  };

  const handleRemoveStop = (type: 'manutencao' | 'processo' | 'outros', id: string) => {
    const filterFn = (prev: StopItem[]) => prev.filter(item => item.id !== id);
    if (type === 'manutencao') {
      setManutencaoStops(filterFn);
    } else if (type === 'processo') {
      setProcessoStops(filterFn);
    } else {
      setOutrosStops(filterFn);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const currentEntry = pendingEntries.length > 0 ? pendingEntries[currentIndex] : initialData;
      if (currentEntry) {
        setManutencaoStops(parseMotivo(currentEntry.manutencaoMotivo, currentEntry.manutencaoMin));
        setProcessoStops(parseMotivo(currentEntry.processoMotivo, currentEntry.processoMin));
        setOutrosStops(parseMotivo(currentEntry.outrosMotivo, currentEntry.outrosMin));
        
        const initMats = currentEntry.materials && currentEntry.materials.length > 0 
          ? currentEntry.materials 
          : [{
              id: `mat-init-${Date.now()}-${Math.random()}`,
              materialType: currentEntry.materialType || 'LC3',
              volumes: currentEntry.volumes || 0,
              tubetes: currentEntry.tubetes || 0,
              tubetesEcoB: currentEntry.tubetesEcoB || 0,
            }];
        setMaterials(initMats);
      } else {
        if (isStandaloneDowntimeInitial) {
          setManutencaoStops([{
            id: `stop-${Date.now()}`,
            de: '',
            ate: '',
            motivo: '',
            explicacao: '',
            isAvulso: true,
            durationMinutes: 0
          }]);
        } else {
          setManutencaoStops([]);
        }
        setProcessoStops([]);
        setOutrosStops([]);
        setMaterials([{
          id: `mat-init-${Date.now()}`,
          materialType: 'LC3',
          volumes: 0,
          tubetes: 0,
          tubetesEcoB: 0,
        }]);
      }
    }
  }, [isOpen, currentIndex, initialData, pendingEntries, isStandaloneDowntimeInitial]);

  useEffect(() => {
    if (isOpen) {
      setPendingEntries([]);
      setCurrentIndex(0);
      if (initialData) {
        setOpSearchTerm(initialData.operator);
        const isInitStandalone = isStandaloneDowntimeInitial || Boolean(initialData.isStandaloneDowntime) || (Boolean(initialData.isMaintenanceEntry) && !initialData.grossWeight && !initialData.netWeight);
        const initCategory: 'manutencao' | 'processo' | 'outros' = (initialData.downtimeCategory as any) || (initialData.processoMin && !initialData.manutencaoMin ? 'processo' : 'manutencao');

        setFormData({
          date: initialData.date,
          operator: initialData.operator,
          machine: initialData.machine,
          shift: initialData.shift,
          grossWeight: initialData.grossWeight,
          tara: initialData.tara,
          netWeight: initialData.netWeight,
          volumes: initialData.volumes,
          tubetes: initialData.tubetes,
          tubetesEcoB: initialData.tubetesEcoB ?? 0,
          ecoA: initialData.ecoA,
          ecoBP: initialData.ecoBP,
          ecoBM: initialData.ecoBM,
          borraTotal: initialData.borraTotal,
          ecoAMotivo: initialData.ecoAMotivo || '',
          ecoBPMotivo: initialData.ecoBPMotivo || '',
          ecoBMMotivo: initialData.ecoBMMotivo || '',
          borraTotalMotivo: initialData.borraTotalMotivo || '',
          manutencaoMin: initialData.manutencaoMin,
          manutencaoMotivo: initialData.manutencaoMotivo || '',
          processoMin: initialData.processoMin,
          processoMotivo: initialData.processoMotivo || '',
          outrosMin: initialData.outrosMin,
          outrosMotivo: initialData.outrosMotivo || '',
          isMaintenanceEntry: initialData.isMaintenanceEntry || false,
          isStandaloneDowntime: isInitStandalone,
          downtimeCategory: initCategory,
          isNoWorkDay: initialData.isNoWorkDay || false,
          noWorkReason: initialData.noWorkReason || '',
          eremaWeight1: initialData.eremaWeight1 ?? 0,
          eremaWeight2: initialData.eremaWeight2 ?? 0,
          eremaWeight3: initialData.eremaWeight3 ?? 0,
          eremaWeight4: initialData.eremaWeight4 ?? 0,
          recycledUsed: initialData.recycledUsed ?? 0,
          recycledBags: initialData.recycledBags ?? (initialData.recycledUsed ? Number((initialData.recycledUsed / 1100).toFixed(2)) : 0),
          materialType: initialData.materialType || 'LC3',
          hasPenalty: initialData.hasPenalty || false,
          infractionType: initialData.infractionType || '',
          penaltyType: initialData.penaltyType || 'deduction_kg',
          deductionValue: initialData.deductionValue ?? 500,
          penaltyReason: initialData.penaltyReason || '',
        });

        if (initialData.infractionType) {
          if (PRESET_INFRACTIONS.includes(initialData.infractionType)) {
            setSelectedPresetInfraction(initialData.infractionType);
            setCustomInfractionText('');
          } else {
            setSelectedPresetInfraction('📝 Outra Infração Personalizada...');
            setCustomInfractionText(initialData.infractionType);
          }
        } else {
          setSelectedPresetInfraction(PRESET_INFRACTIONS[0]);
          setCustomInfractionText('');
        }
      } else {
        setSelectedPresetInfraction(PRESET_INFRACTIONS[0]);
        setCustomInfractionText('');
        setFormData({
          date: getDefaultDateForMonth(dashboardMonth),
          operator: '',
          machine: activeMachines.length > 0 ? activeMachines[0] : '',
          shift: availableShifts.length > 0 ? availableShifts[0].name : '',
          grossWeight: 0,
          tara: 0,
          netWeight: 0,
          volumes: 0,
          tubetes: 0,
          tubetesEcoB: 0,
          ecoA: 0,
          ecoBP: 0,
          ecoBM: 0,
          borraTotal: 0,
          ecoAMotivo: '',
          ecoBPMotivo: '',
          ecoBMMotivo: '',
          borraTotalMotivo: '',
          manutencaoMin: 0,
          manutencaoMotivo: '',
          processoMin: 0,
          processoMotivo: '',
          outrosMin: 0,
          outrosMotivo: '',
          isMaintenanceEntry: false,
          isStandaloneDowntime: isStandaloneDowntimeInitial,
          downtimeCategory: 'manutencao',
          isNoWorkDay: false,
          noWorkReason: '',
          eremaWeight1: 0,
          eremaWeight2: 0,
          eremaWeight3: 0,
          eremaWeight4: 0,
          recycledUsed: 0,
          recycledBags: 0,
          materialType: 'LC3',
          hasPenalty: false,
          infractionType: '',
          penaltyType: 'deduction_kg',
          deductionValue: 500,
          penaltyReason: '',
        });
      }
    }
  }, [isOpen, initialData, activeMachines, availableShifts, dashboardMonth, isStandaloneDowntimeInitial]);

  useEffect(() => {
    if (isErema) {
      setFormData(prev => {
        const sum = (prev.isMaintenanceEntry || prev.isNoWorkDay) ? 0 : (
          (Number(prev.eremaWeight1) || 0) +
          (Number(prev.eremaWeight2) || 0) +
          (Number(prev.eremaWeight3) || 0) +
          (Number(prev.eremaWeight4) || 0)
        );
        if (prev.netWeight !== sum) {
          return { ...prev, netWeight: sum };
        }
        return prev;
      });
    } else {
      setFormData(prev => {
        const calculated = (prev.isMaintenanceEntry || prev.isNoWorkDay) ? 0 : Math.max(0, prev.grossWeight - prev.tara);
        if (prev.netWeight !== calculated) {
          return { ...prev, netWeight: calculated };
        }
        return prev;
      });
    }
  }, [
    formData.grossWeight,
    formData.tara,
    formData.eremaWeight1,
    formData.eremaWeight2,
    formData.eremaWeight3,
    formData.eremaWeight4,
    formData.isMaintenanceEntry,
    formData.isNoWorkDay,
    isErema
  ]);

  useEffect(() => {
    if (!isErema && !formData.isNoWorkDay && !formData.isMaintenanceEntry && materials && materials.length > 0) {
      const sumVolumes = materials.reduce((acc, current) => acc + (Number(current.volumes) || 0), 0);
      const sumTubetes = materials.reduce((acc, current) => acc + (Number(current.tubetes) || 0), 0);
      const sumTubetesEcoB = materials.reduce((acc, current) => acc + (Number(current.tubetesEcoB) || 0), 0);
      const uniqueTypes = Array.from(new Set(materials.map(m => m.materialType).filter(Boolean)));
      const primaryType = uniqueTypes.join(', ') || 'LC3';

      setFormData(prev => {
        if (
          prev.volumes !== sumVolumes ||
          prev.tubetes !== sumTubetes ||
          prev.tubetesEcoB !== sumTubetesEcoB ||
          prev.materialType !== primaryType
        ) {
          return {
            ...prev,
            volumes: sumVolumes,
            tubetes: sumTubetes,
            tubetesEcoB: sumTubetesEcoB,
            materialType: primaryType
          };
        }
        return prev;
      });
    }
  }, [materials, isErema, formData.isNoWorkDay, formData.isMaintenanceEntry]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.operator && !formData.isNoWorkDay) {
      alert('Por favor, selecione um operador.');
      return;
    }
    if (!formData.machine) {
      alert('Nenhuma máquina ativa selecionada.');
      return;
    }
    if (!formData.shift) {
      alert('Por favor, selecione um turno.');
      return;
    }
    
    const isSpecialEntry = formData.isMaintenanceEntry || formData.isNoWorkDay || formData.isStandaloneDowntime;
    const compileEntry = (data: typeof formData) => {
      const isCurrent = data === formData;
      const finalManutencaoMin = isCurrent ? manutencaoMinCalculado : data.manutencaoMin;
      const finalProcessoMin = isCurrent ? processoMinCalculado : data.processoMin;
      const finalOutrosMin = isCurrent ? outrosMinCalculado : data.outrosMin;

      const sanitizeStops = (stops: StopItem[]) => {
        return stops.map(s => {
          const written = (s.explicacao || s.justification || s.motivo || '').trim();
          const tag = (s.keyword || s.motivo || '').trim();
          const reason = written || tag;
          return {
            ...s,
            motivo: reason,
            explicacao: reason,
            justification: reason,
            keyword: s.keyword || tag
          };
        });
      };

      const finalManutencaoMotivo = isCurrent ? (manutencaoStops.length > 0 ? JSON.stringify(sanitizeStops(manutencaoStops)) : '') : data.manutencaoMotivo;
      const finalProcessoMotivo = isCurrent ? (processoStops.length > 0 ? JSON.stringify(sanitizeStops(processoStops)) : '') : data.processoMotivo;
      const finalOutrosMotivo = isCurrent ? (outrosStops.length > 0 ? JSON.stringify(sanitizeStops(outrosStops)) : '') : data.outrosMotivo;

      const baseWithStops = {
        ...data,
        manutencaoMin: finalManutencaoMin,
        processoMin: finalProcessoMin,
        outrosMin: finalOutrosMin,
        manutencaoMotivo: finalManutencaoMotivo,
        processoMotivo: finalProcessoMotivo,
        outrosMotivo: finalOutrosMotivo,
        materials: isCurrent ? materials : (data as any).materials || [],
      };

      const isStandaloneOrMaintenance = data.isStandaloneDowntime || data.isMaintenanceEntry;

      return data.isNoWorkDay ? {
        ...baseWithStops,
        grossWeight: 0,
        tara: 0,
        netWeight: 0,
        volumes: 0,
        tubetes: 0,
        tubetesEcoB: 0,
        ecoA: 0,
        ecoBP: 0,
        ecoBM: 0,
        borraTotal: 0,
        ecoAMotivo: '',
        ecoBPMotivo: '',
        ecoBMMotivo: '',
        borraTotalMotivo: '',
        recycledUsed: 0,
        recycledBags: 0,
        manutencaoMin: 0,
        processoMin: 0,
        outrosMin: 0,
        isMaintenanceEntry: false,
        isStandaloneDowntime: false,
      } : isStandaloneOrMaintenance ? {
        ...baseWithStops,
        grossWeight: 0,
        tara: 0,
        netWeight: 0,
        volumes: 0,
        tubetes: 0,
        tubetesEcoB: 0,
        ecoA: 0,
        ecoBP: 0,
        ecoBM: 0,
        borraTotal: 0,
        ecoAMotivo: '',
        ecoBPMotivo: '',
        ecoBMMotivo: '',
        borraTotalMotivo: '',
        recycledUsed: 0,
        recycledBags: 0,
        manutencaoMin: baseWithStops.manutencaoMin || 0,
        processoMin: baseWithStops.processoMin || 0,
        outrosMin: baseWithStops.outrosMin || 0,
        isMaintenanceEntry: Boolean((baseWithStops.manutencaoMin || 0) > 0 && (baseWithStops.processoMin || 0) === 0),
        isStandaloneDowntime: true,
      } : (isErema ? {
        ...baseWithStops,
        grossWeight: 0,
        tara: 0,
        ecoA: 0,
        ecoBP: 0,
        ecoBM: 0,
        borraTotal: 0,
        ecoAMotivo: '',
        ecoBPMotivo: '',
        ecoBMMotivo: '',
        borraTotalMotivo: '',
        recycledUsed: 0,
        recycledBags: 0,
        volumes: 0,
        tubetes: 0,
        tubetesEcoB: 0
      } : baseWithStops);
    };

    if (pendingEntries.length > 0) {
      pendingEntries.forEach((entry, idx) => {
        const targetData = idx === currentIndex ? formData : entry;
        onSave(compileEntry(targetData));
      });
    } else {
      onSave(initialData ? { ...compileEntry(formData), id: initialData.id } : compileEntry(formData));
    }
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    let val: any;
    
    if (name === 'recycledBags') {
      const bagsVal = parseFloat(value) || 0;
      setFormData(prev => {
        const next = {
          ...prev,
          recycledBags: bagsVal,
          recycledUsed: Number((bagsVal * 1100).toFixed(0))
        };
        if (pendingEntries.length > 0) {
          const newPending = [...pendingEntries];
          newPending[currentIndex] = next;
          setPendingEntries(newPending);
        }
        return next;
      });
      return;
    }

    if (name === 'recycledUsed') {
      const weightVal = parseFloat(value) || 0;
      setFormData(prev => {
        const next = {
          ...prev,
          recycledUsed: weightVal,
          recycledBags: Number((weightVal / 1100).toFixed(2))
        };
        if (pendingEntries.length > 0) {
          const newPending = [...pendingEntries];
          newPending[currentIndex] = next;
          setPendingEntries(newPending);
        }
        return next;
      });
      return;
    }

    if (name === 'volumes') {
      const volVal = parseFloat(value) || 0;
      setFormData(prev => {
        const next = {
          ...prev,
          volumes: volVal,
          tubetes: volVal * 16
        };
        if (pendingEntries.length > 0) {
          const newPending = [...pendingEntries];
          newPending[currentIndex] = next;
          setPendingEntries(newPending);
        }
        return next;
      });
      return;
    }

    if (name === 'date') {
      const newDate = value;
      setFormData(prev => {
        const next = {
          ...prev,
          date: newDate
        };
        if (pendingEntries.length > 0) {
          const newPending = [...pendingEntries];
          newPending[currentIndex] = next;
          setPendingEntries(newPending);
        }
        return next;
      });
      return;
    }

    if (name === 'machine') {
      const newMachine = value;
      const newCanonical = getCanonicalExtrusionMachine(newMachine);
      const isNewErema = newCanonical === 'erema';

      setFormData(prev => {
        const prevCanonical = getCanonicalExtrusionMachine(prev.machine);
        const isPrevErema = prevCanonical === 'erema';

        let opStillValid = false;
        // Se ambos são Cast (Cast 1 <-> Cast 2), os operadores revezam e continuam válidos
        if (!isNewErema && !isPrevErema && prev.operator) {
          opStillValid = true;
        } else if (isNewErema && isPrevErema && prev.operator) {
          opStillValid = true;
        } else if (prev.operator) {
          // Se alternou entre Erema e Cast, valida se o operador pertence à nova lista
          opStillValid = employees?.some(emp => {
            if (isEmployeeSilenced(emp, collaborators)) return false;
            if (isOperatorOnVacation(emp)) return false;
            const roleNorm = (emp.role || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim();
            if (!roleNorm.includes('operador') || roleNorm.includes('auxiliar')) return false;
            if (emp.name?.trim().toLowerCase() !== prev.operator?.trim().toLowerCase()) return false;
            const empCanonical = getCanonicalExtrusionMachine(emp.machine);
            return isNewErema ? (empCanonical === 'erema') : (empCanonical === 'cast 1' || empCanonical === 'cast 2');
          }) || false;
        }

        const next = {
          ...prev,
          machine: newMachine,
          operator: opStillValid ? prev.operator : '',
          ...(isNewErema ? {
            ecoA: 0,
            ecoBP: 0,
            ecoBM: 0,
            borraTotal: 0,
            ecoAMotivo: '',
            ecoBPMotivo: '',
            ecoBMMotivo: '',
            borraTotalMotivo: '',
          } : {})
        };
        if (pendingEntries.length > 0) {
          const newPending = [...pendingEntries];
          newPending[currentIndex] = next;
          setPendingEntries(newPending);
        }
        return next;
      });
      return;
    }

    if (type === 'checkbox') {
      val = (e.target as HTMLInputElement).checked;
      
      if (name === 'isNoWorkDay' && val) {
        setFormData(prev => ({ ...prev, [name]: val, isMaintenanceEntry: false }));
        return;
      }
      if (name === 'isMaintenanceEntry' && val) {
        setFormData(prev => ({ ...prev, [name]: val, isNoWorkDay: false }));
        return;
      }
    } else {
      val = type === 'number' ? parseFloat(value) || 0 : value;
    }
    
    setFormData(prev => {
      const next = { ...prev, [name]: val };
      if (pendingEntries.length > 0) {
        const newPending = [...pendingEntries];
        newPending[currentIndex] = next;
        setPendingEntries(newPending);
      }
      return next;
    });
  };

  const handleMotivoChange = (fieldName: 'ecoBPMotivo' | 'ecoBMMotivo', newValue: string) => {
    setFormData(prev => {
      const next = {
        ...prev,
        [fieldName]: newValue
      };
      if (pendingEntries.length > 0) {
        const newPending = [...pendingEntries];
        newPending[currentIndex] = next;
        setPendingEntries(newPending);
      }
      return next;
    });
  };

  const handleScanAI = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsScanning(true);
    try {
      const newEntries: any[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const extracted = await extractProductionData(base64);
        
        const entryData = {
          date: extracted.date || getYesterdayStr(),
          operator: extracted.operator || '',
          machine: extracted.machine ? (activeMachines.find(m => m.toLowerCase().includes(extracted.machine!.toLowerCase())) || extracted.machine) : (activeMachines.length > 0 ? activeMachines[0] : ''),
          shift: extracted.shift || (availableShifts.length > 0 ? availableShifts[0].name : ''),
          grossWeight: extracted.grossWeight ?? 0,
          tara: extracted.tara ?? 0,
          netWeight: extracted.netWeight ?? 0,
          volumes: extracted.volumes ?? 0,
          tubetes: extracted.tubetes ?? 0,
          ecoA: extracted.ecoA ?? 0,
          ecoBP: extracted.ecoBP ?? 0,
          ecoBM: extracted.ecoBM ?? 0,
          borraTotal: extracted.borraTotal ?? 0,
          manutencaoMin: extracted.manutencaoMin ?? 0,
          manutencaoMotivo: extracted.manutencaoMotivo || '',
          processoMin: extracted.processoMin ?? 0,
          processoMotivo: extracted.processoMotivo || '',
          outrosMin: extracted.outrosMin ?? 0,
          outrosMotivo: extracted.outrosMotivo || '',
          isMaintenanceEntry: false,
          isNoWorkDay: false,
          noWorkReason: '',
          eremaWeight1: 0,
          eremaWeight2: 0,
          eremaWeight3: 0,
          eremaWeight4: 0,
        };
        newEntries.push(entryData);
      }

      if (newEntries.length > 0) {
        setPendingEntries(newEntries);
        setCurrentIndex(0);
        setFormData(newEntries[0]);
      }
    } catch (error) {
      console.error("Erro ao escanear com IA:", error);
      alert("Falha ao extrair dados da imagem. Verifique a nitidez da foto e tente novamente.");
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const nextIndex = currentIndex - 1;
      setCurrentIndex(nextIndex);
      setFormData(pendingEntries[nextIndex]);
    }
  };

  const handleNext = () => {
    if (currentIndex < pendingEntries.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setFormData(pendingEntries[nextIndex]);
    }
  };

  const handleRemoveEntry = () => {
    if (pendingEntries.length <= 1) {
      setPendingEntries([]);
      return;
    }
    const newPending = pendingEntries.filter((_, i) => i !== currentIndex);
    const nextIndex = Math.min(currentIndex, newPending.length - 1);
    setPendingEntries(newPending);
    setCurrentIndex(nextIndex);
    setFormData(newPending[nextIndex]);
  };

  const totalParadas = manutencaoMinCalculado + processoMinCalculado + outrosMinCalculado;
  const isHiddenProduction = formData.isMaintenanceEntry || formData.isNoWorkDay || formData.isStandaloneDowntime;

  const activeStoppageCategory = formData.downtimeCategory || 'manutencao';
  const targetStops = activeStoppageCategory === 'manutencao' 
    ? manutencaoStops 
    : activeStoppageCategory === 'processo' 
    ? processoStops 
    : outrosStops;
  const setTargetStops = activeStoppageCategory === 'manutencao'
    ? setManutencaoStops
    : activeStoppageCategory === 'processo'
    ? setProcessoStops
    : setOutrosStops;

  const firstAvulsoStop = targetStops.find(s => s.isAvulso) || targetStops[0];
  const activeStoppageMinutes = firstAvulsoStop 
    ? (Number(firstAvulsoStop.durationMinutes) || 0) 
    : (activeStoppageCategory === 'manutencao' ? manutencaoMinCalculado : activeStoppageCategory === 'processo' ? processoMinCalculado : outrosMinCalculado);
  const activeStoppageReason = firstAvulsoStop 
    ? (firstAvulsoStop.explicacao || firstAvulsoStop.justification || firstAvulsoStop.motivo || '') 
    : '';

  const handleStandaloneMinutesChange = (newMinutes: number) => {
    const mins = Math.max(0, newMinutes);
    setTargetStops(prev => {
      if (prev.length === 0) {
        return [{
          id: `stop-avulso-${Date.now()}`,
          de: '',
          ate: '',
          motivo: activeStoppageReason || '',
          explicacao: activeStoppageReason || '',
          justification: activeStoppageReason || '',
          isAvulso: true,
          durationMinutes: mins,
        }];
      }
      return prev.map((item, idx) => idx === 0 ? {
        ...item,
        isAvulso: true,
        durationMinutes: mins,
      } : item);
    });
  };

  const handleStandaloneReasonChange = (newReason: string) => {
    setTargetStops(prev => {
      if (prev.length === 0) {
        return [{
          id: `stop-avulso-${Date.now()}`,
          de: '',
          ate: '',
          motivo: newReason,
          explicacao: newReason,
          justification: newReason,
          isAvulso: true,
          durationMinutes: activeStoppageMinutes || 0,
        }];
      }
      return prev.map((item, idx) => idx === 0 ? {
        ...item,
        motivo: newReason,
        explicacao: newReason,
        justification: newReason,
      } : item);
    });
  };

  const handleStandaloneAddMinutes = (increment: number) => {
    const cur = activeStoppageMinutes || 0;
    handleStandaloneMinutesChange(cur + increment);
  };

  const handleSelectStandaloneCategory = (cat: 'manutencao' | 'processo' | 'outros') => {
    setFormData(prev => ({ ...prev, downtimeCategory: cat }));
    setSelectedStopCategory(cat);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col w-full h-[100dvh] overflow-hidden animate-in fade-in duration-200">
      <div className="bg-slate-50 w-full h-full flex flex-col overflow-hidden relative max-w-[1850px] mx-auto">
        {/* Header Bar */}
        <div className="bg-[#1e293b] text-white px-3 md:px-5 py-2 flex items-center justify-between shrink-0 shadow-md z-20 border-b border-slate-700">
          <div className="flex items-center gap-2 min-w-0">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-all border border-slate-600/50 cursor-pointer shrink-0"
              title="Voltar"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline uppercase text-[10px]">Voltar</span>
            </button>
            <div className="h-5 w-px bg-slate-700 mx-0.5 hidden sm:block"></div>
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              {initialData ? <Edit2 size={16} className="text-blue-400 shrink-0" /> : <Save size={16} className="text-blue-400 shrink-0" />}
              <h2 className="text-xs sm:text-sm md:text-base font-black tracking-tight uppercase text-white truncate">
                {initialData ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex bg-blue-600 rounded-lg overflow-hidden shadow-sm shadow-blue-500/20 border border-blue-400/30">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="flex items-center gap-1 hover:bg-blue-700 disabled:bg-blue-400 text-white px-2.5 py-1 text-[9px] font-black uppercase border-r border-blue-500/50 transition-all cursor-pointer"
                title="Carregar Imagem"
              >
                {isScanning ? <Loader2 size={12} className="animate-spin" /> : <Package size={12} />}
                <span>{isScanning ? 'Lendo...' : 'IA Imagem'}</span>
              </button>
              <button 
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isScanning}
                className="flex items-center gap-1 hover:bg-blue-700 disabled:bg-blue-400 text-white px-2.5 py-1 text-[9px] font-black uppercase transition-all cursor-pointer"
                title="Usar Câmera"
              >
                {isScanning ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                <span>{isScanning ? 'Lendo...' : 'IA Câmera'}</span>
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleScanAI} 
              accept="image/*" 
              multiple
              className="hidden" 
            />
            <input 
              type="file" 
              ref={cameraInputRef} 
              onChange={handleScanAI} 
              accept="image/*" 
              capture="environment"
              className="hidden" 
            />
            <button onClick={onClose} className="hover:bg-slate-700 p-1 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer" title="Fechar">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden relative w-full">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-2 md:p-3 custom-scrollbar relative space-y-2.5">
          {pendingEntries.length > 1 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-1.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button type="button" onClick={handlePrev} disabled={currentIndex === 0} className="p-1 bg-white rounded-lg border border-blue-200 text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-50 transition-all">
                  <Clock size={14} className="rotate-180" />
                </button>
                <div className="text-center flex items-center gap-2">
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Documento</p>
                  <p className="text-xs font-black text-blue-700">{currentIndex + 1} de {pendingEntries.length}</p>
                </div>
                <button type="button" onClick={handleNext} disabled={currentIndex === pendingEntries.length - 1} className="p-1 bg-white rounded-lg border border-blue-200 text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-blue-50 transition-all">
                  <Clock size={14} />
                </button>
              </div>
              <button type="button" onClick={handleRemoveEntry} className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Remover este documento">
                <Trash2 size={16} />
              </button>
            </div>
          )}

          {isScanning && (
            <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                    <Camera className="text-white" size={24} />
                  </div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tighter">Processando Documento</h3>
                <p className="text-xs font-bold text-blue-600 animate-bounce mt-1">A IA está extraindo as informações...</p>
              </div>
            </div>
          )}

          {/* Header Controls Bar */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
              {/* Toggles */}
              <div className="md:col-span-3 grid grid-cols-2 gap-1.5">
                {/* Manutenção */}
                <div className={`px-2 py-1 rounded-lg flex items-center justify-between transition-colors border ${formData.isMaintenanceEntry ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-1 min-w-0">
                    <Wrench size={12} className={formData.isMaintenanceEntry ? 'text-orange-600 shrink-0' : 'text-slate-400 shrink-0'} />
                    <span className="text-[9px] font-black text-slate-800 uppercase truncate">Manutenção</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" name="isMaintenanceEntry" checked={formData.isMaintenanceEntry} onChange={handleChange} className="sr-only peer" />
                    <div className="w-6 h-3 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-orange-600"></div>
                  </label>
                </div>

                {/* Parado / Sem Expediente */}
                <div className={`px-2 py-1 rounded-lg flex items-center justify-between transition-colors border ${formData.isNoWorkDay ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-1 min-w-0">
                    <CalendarX size={12} className={formData.isNoWorkDay ? 'text-red-600 shrink-0' : 'text-slate-400 shrink-0'} />
                    <span className="text-[9px] font-black text-slate-800 uppercase truncate">Parado</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" name="isNoWorkDay" checked={formData.isNoWorkDay} onChange={handleChange} className="sr-only peer" />
                    <div className="w-6 h-3 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-red-600"></div>
                  </label>
                </div>
              </div>

              {/* Data, Máquina, Operador, Turno */}
              <div className="md:col-span-9 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Data</label>
                  <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/20 h-7" />
                </div>

                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Máquina</label>
                  <select 
                    name="machine" 
                    value={formData.machine} 
                    onChange={handleChange} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/20 h-7 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.8rem_0.8rem] bg-right-[0.3rem]_center bg-no-repeat"
                  >
                    <option value="" disabled>Selecionar Máquina</option>
                    <option value="Cast 1">Cast 1</option>
                    <option value="Cast 2">Cast 2</option>
                    <option value="Erema">Erema</option>
                  </select>
                </div>

                {!formData.isNoWorkDay ? (
                  <div>
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Operador</label>
                    <select 
                      name="operator"
                      value={formData.operator} 
                      onChange={handleChange} 
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/20 h-7 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.8rem_0.8rem] bg-right-[0.3rem]_center bg-no-repeat"
                    >
                      <option value="">
                        {filteredOperators.length === 0 
                          ? (formData.machine ? `Nenhum operador na ${formData.machine}` : 'Nenhum operador encontrado') 
                          : 'Selecionar Operador...'}
                      </option>
                      {filteredOperators.map(emp => (
                        <option key={emp.id} value={emp.name}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="hidden sm:block" />
                )}

                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Turno</label>
                  <select 
                    name="shift" 
                    value={formData.shift} 
                    onChange={handleChange} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500/20 h-7 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.8rem_0.8rem] bg-right-[0.3rem]_center bg-no-repeat"
                  >
                    <option value="" disabled>Selecionar Turno</option>
                    <option value="Diurno">Diurno</option>
                    <option value="Noturno">Noturno</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {formData.isNoWorkDay && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-red-700 font-black text-[10px] uppercase tracking-widest"><CalendarX size={14} /> Motivo da Parada Total</div>
              <div>
                <label className="text-[8px] font-black text-red-500 uppercase">Descrição do Motivo</label>
                <input 
                  type="text" 
                  name="noWorkReason" 
                  value={formData.noWorkReason} 
                  onChange={handleChange} 
                  placeholder="Ex: Falta de energia, feriado, falta de pessoal..." 
                  className="w-full mt-0.5 bg-white border border-red-200 rounded-lg px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-red-500/20" 
                />
              </div>
            </div>
          )}

          {!formData.isNoWorkDay && (
            <div className={`grid grid-cols-1 ${formData.isStandaloneDowntime ? 'lg:grid-cols-12 gap-3' : isErema ? 'md:grid-cols-2 gap-3' : 'md:grid-cols-2 xl:grid-cols-3 gap-2.5'} items-start`}>
              {formData.isStandaloneDowntime ? (
                /* PAINEL DEDICADO DE LANÇAMENTO AVULSO */
                <div className="lg:col-span-7 space-y-2.5">
                  <div className="p-3.5 bg-gradient-to-br from-amber-50 via-white to-amber-50/40 border-2 border-amber-300/80 rounded-2xl shadow-sm space-y-3">
                    {/* Header do Card Avulso */}
                    <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                          <Zap size={16} />
                        </div>
                        <div>
                          <h3 className="text-xs font-black uppercase text-amber-950 tracking-tight">Lançamento Avulso de Parada</h3>
                          <p className="text-[9px] font-semibold text-amber-800">Lance qualquer quantidade de minutos diretamente sem fixar horários</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md">
                        Modo Avulso
                      </span>
                    </div>

                    {/* Seleção de Categoria */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-amber-900 uppercase tracking-wider block">
                        Classificação da Parada
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSelectStandaloneCategory('manutencao')}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-black uppercase border transition-all cursor-pointer ${activeStoppageCategory === 'manutencao' ? 'bg-orange-600 text-white border-orange-700 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-orange-50'}`}
                        >
                          <Wrench size={13} />
                          <span>Manutenção</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectStandaloneCategory('processo')}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-black uppercase border transition-all cursor-pointer ${activeStoppageCategory === 'processo' ? 'bg-blue-600 text-white border-blue-700 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50'}`}
                        >
                          <Layers size={13} />
                          <span>Processo / Prod.</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectStandaloneCategory('outros')}
                          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-black uppercase border transition-all cursor-pointer ${activeStoppageCategory === 'outros' ? 'bg-slate-700 text-white border-slate-800 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                        >
                          <Package size={13} />
                          <span>Outros</span>
                        </button>
                      </div>
                    </div>

                    {/* Campo Principal de Minutos */}
                    <div className="p-3 bg-white border border-amber-200 rounded-xl space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-amber-950 uppercase tracking-wider flex items-center gap-1">
                          <Clock size={13} className="text-amber-600" />
                          Quantidade Total de Minutos:
                        </label>
                        <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                          {formatDurationHuman(activeStoppageMinutes)}
                        </span>
                      </div>

                      <div className="relative flex items-center">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={activeStoppageMinutes || ''}
                          onChange={(e) => handleStandaloneMinutesChange(parseInt(e.target.value) || 0)}
                          placeholder="Digite os minutos (ex: 5240)..."
                          className="w-full bg-amber-50/40 border-2 border-amber-400 focus:border-amber-600 rounded-xl px-3 py-2 text-xl font-black text-slate-900 tracking-tight outline-none"
                        />
                        <span className="absolute right-3 text-xs font-black text-amber-800 uppercase pointer-events-none">
                          MINUTOS
                        </span>
                      </div>

                      {/* Botões Rápidos de Acréscimo */}
                      <div className="space-y-1">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                          Atalhos Rápidos (+ Minutos):
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {[
                            { label: '+30 min', val: 30 },
                            { label: '+60 min (1h)', val: 60 },
                            { label: '+120 min (2h)', val: 120 },
                            { label: '+480 min (8h/Turno)', val: 480 },
                            { label: '+1.440 min (24h/Dia)', val: 1440 },
                            { label: '+5.000 min', val: 5000 },
                          ].map((btn, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleStandaloneAddMinutes(btn.val)}
                              className="px-2 py-1 bg-amber-100/80 hover:bg-amber-200 border border-amber-300 text-amber-900 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                            >
                              {btn.label}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleStandaloneMinutesChange(0)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 rounded-lg text-[10px] font-bold transition-all cursor-pointer ml-auto"
                          >
                            Zerar
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Motivo e Justificativa */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-amber-950 uppercase tracking-wider block">
                        Motivo / Justificativa por Escrito:
                      </label>
                      <textarea
                        value={activeStoppageReason}
                        onChange={(e) => handleStandaloneReasonChange(e.target.value)}
                        rows={3}
                        placeholder="Descreva detalhadamente a justificativa para este tempo de parada avulsa (ex: Manutenção corretiva de grande porte, troca de fuso e rosca, paralisação programada...)"
                        className="w-full bg-white border border-amber-200 focus:border-amber-500 rounded-xl p-2 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none resize-none shadow-2xs"
                      />

                      {/* Sugestões de motivos comuns */}
                      <div className="space-y-1">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">
                          Sugestões Frequentes (Clique para aplicar):
                        </span>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar p-1 bg-amber-50/50 rounded-lg border border-amber-100">
                          {(activeStoppageCategory === 'manutencao'
                            ? downtimeSuggestions.manutencao
                            : activeStoppageCategory === 'processo'
                            ? downtimeSuggestions.processo
                            : downtimeSuggestions.outros
                          ).slice(0, 8).map((suggestion, sIdx) => (
                            <button
                              key={sIdx}
                              type="button"
                              onClick={() => {
                                const current = activeStoppageReason ? `${activeStoppageReason} • ${suggestion}` : suggestion;
                                handleStandaloneReasonChange(current);
                              }}
                              className="px-1.5 py-0.5 bg-white hover:bg-amber-100 border border-amber-200 text-slate-700 text-[9px] font-bold rounded cursor-pointer transition-colors text-left"
                            >
                              + {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* COLUNA 1: PRODUÇÃO & REUTILIZAÇÃO */}
              <div className="space-y-2">
                {!isHiddenProduction && (
                  <>
                    {isErema ? (
                      <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-2 flex-1 flex flex-col justify-between">
                        <div className="flex items-center gap-1.5 text-emerald-700 font-black text-[10px] uppercase tracking-widest"><Package size={13} /> Produção Reciclada (Erema)</div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[8px] font-black text-emerald-600 uppercase">Lançamento 1 (kg)</label>
                            <input 
                              type="number" 
                              name="eremaWeight1" 
                              value={formData.eremaWeight1 || ''} 
                              onChange={handleChange} 
                              className="w-full bg-white border border-emerald-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none h-7" 
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-emerald-600 uppercase">Lançamento 2 (kg)</label>
                            <input 
                              type="number" 
                              name="eremaWeight2" 
                              value={formData.eremaWeight2 || ''} 
                              onChange={handleChange} 
                              className="w-full bg-white border border-emerald-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none h-7" 
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-emerald-600 uppercase">Lançamento 3 (kg)</label>
                            <input 
                              type="number" 
                              name="eremaWeight3" 
                              value={formData.eremaWeight3 || ''} 
                              onChange={handleChange} 
                              className="w-full bg-white border border-emerald-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none h-7" 
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-emerald-600 uppercase">Lançamento 4 (kg)</label>
                            <input 
                              type="number" 
                              name="eremaWeight4" 
                              value={formData.eremaWeight4 || ''} 
                              onChange={handleChange} 
                              className="w-full bg-white border border-emerald-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none h-7" 
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-emerald-200 flex justify-between items-center shadow-2xs">
                          <span className="text-[9px] font-black text-emerald-600 uppercase">Peso Líquido Total</span>
                          <span className="text-base font-black text-emerald-700">{formatWeight(formData.netWeight)}</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Card Produção Líquida */}
                        <div className="p-2.5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2 flex-1 flex flex-col justify-between">
                          <div className="flex items-center gap-1.5 text-blue-700 font-black text-[10px] uppercase tracking-widest"><Package size={13} /> Produção Líquida</div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[8px] font-black text-blue-600 uppercase">T. Bruto (kg)</label>
                              <input type="number" name="grossWeight" value={formData.grossWeight || ''} onChange={handleChange} className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs font-bold h-7" placeholder="0" />
                            </div>
                            <div>
                              <label className="text-[8px] font-black text-blue-600 uppercase">Tara (kg)</label>
                              <input type="number" name="tara" value={formData.tara || ''} onChange={handleChange} className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs font-bold h-7" placeholder="0" />
                            </div>
                          </div>

                          <div className="border-t border-dashed border-blue-150 pt-2 space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black text-blue-800 uppercase">Materiais Produzidos ({materials.length})</span>
                              <button
                                type="button"
                                onClick={handleAddMaterial}
                                className="inline-flex items-center gap-0.5 text-[8px] font-black text-blue-600 hover:text-blue-700 uppercase bg-blue-100 px-2 py-0.5 rounded transition-all cursor-pointer"
                              >
                                <Plus size={9} /> Add
                              </button>
                            </div>

                            <div className="space-y-1.5">
                              {materials.map((item, idx) => {
                                const showDeleteConfirm = confirmDeleteMatId === item.id;
                                return (
                                  <div key={item.id} className="p-1.5 bg-white border border-blue-100 rounded-lg space-y-1 shadow-2xs">
                                    <div className="flex justify-between items-center border-b border-dashed border-blue-50 pb-1">
                                      <span className="text-[8px] font-black text-blue-500 uppercase">Item #{idx + 1}</span>
                                      {materials.length > 1 && (
                                        <div className="flex items-center gap-1">
                                          {showDeleteConfirm ? (
                                            <div className="flex items-center gap-1">
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveMaterial(item.id)}
                                                className="text-[7px] font-black bg-red-100 text-red-700 px-1 py-0.2 rounded"
                                              >
                                                Sim
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setConfirmDeleteMatId(null)}
                                                className="text-[7px] font-black bg-slate-100 text-slate-700 px-1 py-0.2 rounded"
                                              >
                                                Não
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => setConfirmDeleteMatId(item.id)}
                                              className="text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                              <Trash2 size={11} />
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-12 gap-1.5 items-center">
                                      <div className="col-span-3">
                                        <label className="text-[7px] font-black text-slate-400 uppercase block">Tipo</label>
                                        <select
                                          value={item.materialType}
                                          onChange={(e) => handleUpdateMaterial(item.id, 'materialType', e.target.value)}
                                          className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-[10px] font-bold h-6"
                                        >
                                          <option value="LC3">LC3</option>
                                          <option value="LC2">LC2</option>
                                          <option value="ATX">ATX</option>
                                          <option value="ATX Plus">ATX Plus</option>
                                        </select>
                                      </div>

                                      <div className="col-span-3">
                                        <label className="text-[7px] font-black text-slate-400 uppercase block">Vols</label>
                                        <input
                                          type="number"
                                          value={item.volumes || ''}
                                          onChange={(e) => handleUpdateMaterial(item.id, 'volumes', parseFloat(e.target.value) || 0)}
                                          placeholder="0"
                                          className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-[10px] font-bold text-center h-6"
                                        />
                                      </div>

                                      <div className="col-span-3">
                                        <label className="text-[7px] font-black text-slate-400 uppercase block">TubUsados</label>
                                        <input
                                          type="number"
                                          value={item.tubetes || ''}
                                          onChange={(e) => handleUpdateMaterial(item.id, 'tubetes', parseFloat(e.target.value) || 0)}
                                          placeholder="0"
                                          className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-[10px] font-bold text-center h-6"
                                        />
                                      </div>

                                      <div className="col-span-3">
                                        <label className="text-[7px] font-black text-slate-400 uppercase block">TubEcoB</label>
                                        <input
                                          type="number"
                                          value={item.tubetesEcoB || ''}
                                          onChange={(e) => handleUpdateMaterial(item.id, 'tubetesEcoB', parseFloat(e.target.value) || 0)}
                                          placeholder="0"
                                          className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-[10px] font-bold text-center h-6"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="bg-white px-2 py-1.5 rounded-lg border border-blue-200 flex justify-between items-center mt-1">
                            <span className="text-[9px] font-black text-blue-500 uppercase">Peso Líquido Total</span>
                            <span className="text-base font-black text-blue-700">{formatWeight(formData.netWeight)}</span>
                          </div>
                        </div>

                        {/* Saída de Reciclado / Reutilização */}
                        <div className="p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1.5">
                          <div>
                            <label className="text-[9px] font-black text-emerald-700 uppercase tracking-widest block">♻️ Saída de Reciclado (Cast)</label>
                            <span className="text-[8px] text-slate-500 block leading-none">Padronizado: <strong>1100kg / Bag</strong>.</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[8px] font-black text-emerald-600 uppercase">Qtd (Bags)</label>
                              <input 
                                type="number" 
                                step="any"
                                name="recycledBags" 
                                value={formData.recycledBags || ''} 
                                onChange={handleChange} 
                                placeholder="0" 
                                className="w-full bg-white border border-emerald-200 rounded-lg px-2 py-1 text-xs font-black text-emerald-700 h-7" 
                              />
                            </div>
                            <div>
                              <label className="text-[8px] font-black text-emerald-600 uppercase">Peso Abatido (Kg)</label>
                              <input 
                                type="number" 
                                name="recycledUsed" 
                                value={formData.recycledUsed || ''} 
                                onChange={handleChange} 
                                placeholder="0" 
                                className="w-full bg-white border border-emerald-200 rounded-lg px-2 py-1 text-xs font-black text-emerald-800 h-7" 
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* COLUNA 2: PERDAS & RECICLAGEM (Excluído na máquina Erema) */}
              {!isErema && (
                <div className="space-y-2">
                  {/* Card Eco A */}
                  <div className="p-2 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-1 shrink-0">
                    <div className="flex items-center gap-1.5 text-indigo-800 font-black text-[10px] uppercase tracking-widest">
                      <Layers size={13} className="text-indigo-600" /> Envio Eco A (Sede Curitiba) (Kg)
                    </div>
                    <div className="bg-white p-1.5 rounded-lg border border-indigo-200/60 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[9px] font-black text-indigo-700 uppercase">Eco A (kg)</label>
                        <input type="number" name="ecoA" value={formData.ecoA || ''} onChange={handleChange} className="w-20 bg-slate-50 border border-indigo-200 rounded-lg px-2 py-0.5 text-xs font-bold text-right h-6" placeholder="0" />
                      </div>
                      {formData.ecoA > 0 && (
                        <div className="pt-1 border-t border-dashed border-slate-150">
                          <input type="text" name="ecoAMotivo" value={formData.ecoAMotivo || ''} onChange={handleChange} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 text-[10px] font-medium placeholder-slate-300 focus:bg-white" placeholder="Justificar perda Eco A..." />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Eco B (Reciclagem) */}
                  <div className="p-2 bg-orange-50/50 border border-orange-100 rounded-xl space-y-1.5 shrink-0">
                    <div className="flex items-center gap-1.5 text-orange-700 font-black text-[10px] uppercase tracking-widest"><Layers size={13} /> Reciclagem (Kg)</div>
                    <div className="space-y-1.5">
                      <EcoBReasonCard
                        label="Eco B (P)"
                        weightName="ecoBP"
                        motivoName="ecoBPMotivo"
                        weightValue={formData.ecoBP || 0}
                        motivoValue={formData.ecoBPMotivo || ''}
                        categoryGroups={downtimeSuggestions.allGroups}
                        onWeightChange={handleChange}
                        onMotivoChange={handleMotivoChange}
                      />

                      <EcoBReasonCard
                        label="Eco B (M)"
                        weightName="ecoBM"
                        motivoName="ecoBMMotivo"
                        weightValue={formData.ecoBM || 0}
                        motivoValue={formData.ecoBMMotivo || ''}
                        categoryGroups={downtimeSuggestions.allGroups}
                        onWeightChange={handleChange}
                        onMotivoChange={handleMotivoChange}
                      />
                    </div>
                  </div>

                  {/* Card Borra Total */}
                  <div className="p-2 bg-red-50/50 border border-red-100 rounded-xl space-y-1 shrink-0">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[9px] font-black text-red-700 uppercase tracking-widest block">🗑️ Borra Total (Kg)</label>
                      <input type="number" name="borraTotal" value={formData.borraTotal || ''} onChange={handleChange} className="w-20 bg-white border border-red-200 rounded-lg px-2 py-0.5 text-xs font-black text-red-600 text-right h-6" placeholder="0" />
                    </div>
                    {formData.borraTotal > 0 && (
                      <div className="pt-1 border-t border-dashed border-red-150">
                        <input type="text" name="borraTotalMotivo" value={formData.borraTotalMotivo || ''} onChange={handleChange} className="w-full bg-white/80 border border-red-200 rounded-lg px-2 py-0.5 text-[10px] font-medium placeholder-red-400 focus:bg-white text-red-700" placeholder="Justificar perda de Borra..." />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* COLUNA 3: TEMPOS DE PARADA & RANKING */}
              <div className={`${formData.isStandaloneDowntime ? 'lg:col-span-5' : ''} space-y-2`}>
                <div className="p-2.5 bg-slate-100/70 border border-slate-200 rounded-xl space-y-2 shadow-2xs flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-1.5 text-slate-700 font-black text-[10px] uppercase tracking-widest border-b border-slate-200 pb-1">
                    <span className="flex items-center gap-1.5"><Clock size={13} /> Tempos de Parada</span>
                    <span className="text-[9px] text-slate-500 font-bold">{totalParadas} min</span>
                  </div>

                  {/* Caixa de Seleção da Categoria de Parada */}
                  <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                    <label htmlFor="stopCategorySelect" className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">
                      Selecione a Categoria:
                    </label>
                    <select
                      id="stopCategorySelect"
                      value={selectedStopCategory}
                      onChange={(e) => setSelectedStopCategory(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-md px-2 py-1 text-xs font-black text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="manutencao">
                        🔧 Manutenção {manutencaoStops.length > 0 ? `(${manutencaoMinCalculado} min)` : ''}
                      </option>
                      {(!formData.isMaintenanceEntry || formData.isStandaloneDowntime) && (
                        <>
                          <option value="processo">
                            ⚙️ Processo {processoStops.length > 0 ? `(${processoMinCalculado} min)` : ''}
                          </option>
                          <option value="outros">
                            📦 Outros {outrosStops.length > 0 ? `(${outrosMinCalculado} min)` : ''}
                          </option>
                          <option value="todas">
                            📋 Mostrar Todas as Paradas ({totalParadas} min)
                          </option>
                        </>
                      )}
                    </select>
                  </div>

                  {/* Datalists de sugestões extraídas do banco */}
                  <datalist id="datalist-manutencao-reasons">
                    {downtimeSuggestions.manutencao.map((r, i) => (
                      <option key={i} value={r} />
                    ))}
                  </datalist>
                  <datalist id="datalist-processo-reasons">
                    {downtimeSuggestions.processo.map((r, i) => (
                      <option key={i} value={r} />
                    ))}
                  </datalist>
                  <datalist id="datalist-outros-reasons">
                    {downtimeSuggestions.outros.map((r, i) => (
                      <option key={i} value={r} />
                    ))}
                  </datalist>

                  <div className="space-y-1.5">
                    {/* Seção Manutenção */}
                    {(selectedStopCategory === 'manutencao' || selectedStopCategory === 'todas') && (
                      <div className="p-2 bg-white border border-slate-150 rounded-lg space-y-1.5 shadow-2xs">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                          <div className="flex items-center gap-1 text-orange-600 font-black text-[9px] uppercase tracking-wider">
                            <Wrench size={11} /> Manutenção
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleAddStop('manutencao', true)}
                              className="inline-flex items-center gap-0.5 text-[8px] font-black text-amber-800 hover:text-amber-900 uppercase bg-amber-100 hover:bg-amber-200 border border-amber-300 px-1.5 py-0.5 rounded cursor-pointer"
                              title="Lançar parada avulsa digitando minutos livres"
                            >
                              <Zap size={9} /> + Minutos
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddStop('manutencao', false)}
                              className="inline-flex items-center gap-0.5 text-[8px] font-black text-blue-600 hover:text-blue-700 uppercase bg-blue-50 hover:bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded cursor-pointer"
                              title="Lançar parada por horário de início e fim"
                            >
                              <Clock size={9} /> + Horário
                            </button>
                          </div>
                        </div>
                        
                        {manutencaoStops.length === 0 ? (
                          <p className="text-[9px] font-bold text-slate-400 italic text-center py-1">Sem paradas de manutenção</p>
                        ) : (
                          <div className="space-y-1.5">
                            {manutencaoStops.map((stop) => (
                              <StopItemCard
                                key={stop.id}
                                stop={stop}
                                type="manutencao"
                                onUpdate={(id, field, value) => handleUpdateStop('manutencao', id, field, value)}
                                onRemove={(id) => handleRemoveStop('manutencao', id)}
                              />
                            ))}
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-1 border-t border-slate-50 text-[8px] font-black text-slate-400 uppercase">
                          <span>Subtotal Manutenção</span>
                          <span className="text-slate-700 font-bold">{manutencaoMinCalculado} min</span>
                        </div>
                      </div>
                    )}

                    {(!formData.isMaintenanceEntry || formData.isStandaloneDowntime) && (
                      <>
                        {/* Seção Processo */}
                        {(selectedStopCategory === 'processo' || selectedStopCategory === 'todas') && (
                          <div className="p-2 bg-white border border-slate-150 rounded-lg space-y-1.5 shadow-2xs">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                              <div className="flex items-center gap-1 text-blue-600 font-black text-[9px] uppercase tracking-wider">
                                <Layers size={11} /> Processo
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleAddStop('processo', true)}
                                  className="inline-flex items-center gap-0.5 text-[8px] font-black text-amber-800 hover:text-amber-900 uppercase bg-amber-100 hover:bg-amber-200 border border-amber-300 px-1.5 py-0.5 rounded cursor-pointer"
                                  title="Lançar parada avulsa digitando minutos livres"
                                >
                                  <Zap size={9} /> + Minutos
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAddStop('processo', false)}
                                  className="inline-flex items-center gap-0.5 text-[8px] font-black text-blue-600 hover:text-blue-700 uppercase bg-blue-50 hover:bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded cursor-pointer"
                                  title="Lançar parada por horário de início e fim"
                                >
                                  <Clock size={9} /> + Horário
                                </button>
                              </div>
                            </div>
                            
                            {processoStops.length === 0 ? (
                              <p className="text-[9px] font-bold text-slate-400 italic text-center py-1">Sem paradas de processo</p>
                            ) : (
                              <div className="space-y-1.5">
                                {processoStops.map((stop) => (
                                  <StopItemCard
                                    key={stop.id}
                                    stop={stop}
                                    type="processo"
                                    onUpdate={(id, field, value) => handleUpdateStop('processo', id, field, value)}
                                    onRemove={(id) => handleRemoveStop('processo', id)}
                                  />
                                ))}
                              </div>
                            )}
                            <div className="flex justify-between items-center pt-1 border-t border-slate-50 text-[8px] font-black text-slate-400 uppercase">
                              <span>Subtotal Processo</span>
                              <span className="text-slate-700 font-bold">{processoMinCalculado} min</span>
                            </div>
                          </div>
                        )}

                        {/* Seção Outros */}
                        {(selectedStopCategory === 'outros' || selectedStopCategory === 'todas') && (
                          <div className="p-2 bg-white border border-slate-150 rounded-lg space-y-1.5 shadow-2xs">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                              <div className="flex items-center gap-1 text-slate-600 font-black text-[9px] uppercase tracking-wider">
                                <Package size={11} /> Outros
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleAddStop('outros', true)}
                                  className="inline-flex items-center gap-0.5 text-[8px] font-black text-amber-800 hover:text-amber-900 uppercase bg-amber-100 hover:bg-amber-200 border border-amber-300 px-1.5 py-0.5 rounded cursor-pointer"
                                  title="Lançar parada avulsa digitando minutos livres"
                                >
                                  <Zap size={9} /> + Minutos
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAddStop('outros', false)}
                                  className="inline-flex items-center gap-0.5 text-[8px] font-black text-blue-600 hover:text-blue-700 uppercase bg-blue-50 hover:bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded cursor-pointer"
                                  title="Lançar parada por horário de início e fim"
                                >
                                  <Clock size={9} /> + Horário
                                </button>
                              </div>
                            </div>
                            
                            {outrosStops.length === 0 ? (
                              <p className="text-[9px] font-bold text-slate-400 italic text-center py-1">Sem outras paradas</p>
                            ) : (
                              <div className="space-y-1.5">
                                {outrosStops.map((stop) => (
                                  <StopItemCard
                                    key={stop.id}
                                    stop={stop}
                                    type="outros"
                                    onUpdate={(id, field, value) => handleUpdateStop('outros', id, field, value)}
                                    onRemove={(id) => handleRemoveStop('outros', id)}
                                  />
                                ))}
                              </div>
                            )}
                            <div className="flex justify-between items-center pt-1 border-t border-slate-50 text-[8px] font-black text-slate-400 uppercase">
                              <span>Subtotal Outros</span>
                              <span className="text-slate-700 font-bold">{outrosMinCalculado} min</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="pt-1 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Parado Geral</span>
                    <span className="text-xs font-black text-slate-800">{totalParadas} min</span>
                  </div>
                </div>

                {/* Seção de Punição / Ocorrência no Ranking */}
                <div className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-rose-200/80 pb-1 flex-wrap gap-1">
                    <div className="flex items-center gap-1 text-rose-800 font-black text-[9px] uppercase tracking-widest">
                      <ShieldAlert size={13} className="text-rose-600" /> Punição Ranking
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer bg-white/80 px-2 py-0.5 rounded-lg border border-rose-200 hover:bg-white transition-all">
                      <input
                        type="checkbox"
                        checked={formData.hasPenalty || false}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          hasPenalty: e.target.checked,
                          infractionType: e.target.checked ? (prev.infractionType || selectedPresetInfraction || PRESET_INFRACTIONS[0]) : '',
                          penaltyType: e.target.checked ? (prev.penaltyType || 'deduction_kg') : 'deduction_kg',
                          deductionValue: e.target.checked ? (prev.deductionValue || 500) : 0,
                        }))}
                        className="w-3.5 h-3.5 text-rose-600 rounded border-rose-300 focus:ring-rose-500 cursor-pointer"
                      />
                      <span className="text-[9px] font-black uppercase text-rose-900">Aplicar Punição</span>
                    </label>
                  </div>

                  {formData.hasPenalty && (
                    <div className="space-y-1.5 pt-0.5">
                      {/* Regra / Infração */}
                      <div>
                        <label className="block text-[8px] font-black uppercase text-rose-900 mb-0.5">
                          Infração *
                        </label>
                        <select
                          value={selectedPresetInfraction}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedPresetInfraction(val);
                            if (val !== '📝 Outra Infração Personalizada...') {
                              setFormData(prev => ({ ...prev, infractionType: val }));
                            } else {
                              setFormData(prev => ({ ...prev, infractionType: customInfractionText }));
                            }
                          }}
                          className="w-full bg-white border border-rose-300 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-900 h-7"
                        >
                          {PRESET_INFRACTIONS.map((preset) => (
                            <option key={preset} value={preset}>{preset}</option>
                          ))}
                        </select>

                        {selectedPresetInfraction === '📝 Outra Infração Personalizada...' && (
                          <input
                            type="text"
                            placeholder="Especifique a infração..."
                            value={customInfractionText}
                            onChange={(e) => {
                              setCustomInfractionText(e.target.value);
                              setFormData(prev => ({ ...prev, infractionType: e.target.value }));
                            }}
                            className="w-full mt-1 bg-white border border-rose-300 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-900 h-7"
                          />
                        )}
                      </div>

                      {/* Tipo de Punição */}
                      <div className="grid grid-cols-3 gap-1">
                        <label className={`p-1 rounded-lg border cursor-pointer transition-all flex items-center justify-center gap-1 ${
                          formData.penaltyType === 'deduction_kg'
                            ? 'border-rose-500 bg-white font-black text-rose-950 shadow-2xs'
                            : 'border-slate-200 bg-white/70 text-slate-600 font-bold hover:bg-white'
                        }`}>
                          <input
                            type="radio"
                            name="modalPenaltyType"
                            checked={formData.penaltyType === 'deduction_kg'}
                            onChange={() => setFormData(prev => ({ ...prev, penaltyType: 'deduction_kg' }))}
                            className="text-rose-600 sr-only"
                          />
                          <span className="text-[8px] font-black uppercase">Desc. Kg</span>
                        </label>

                        <label className={`p-1 rounded-lg border cursor-pointer transition-all flex items-center justify-center gap-1 ${
                          formData.penaltyType === 'deduction_percent'
                            ? 'border-amber-500 bg-white font-black text-amber-950 shadow-2xs'
                            : 'border-slate-200 bg-white/70 text-slate-600 font-bold hover:bg-white'
                        }`}>
                          <input
                            type="radio"
                            name="modalPenaltyType"
                            checked={formData.penaltyType === 'deduction_percent'}
                            onChange={() => setFormData(prev => ({ ...prev, penaltyType: 'deduction_percent' }))}
                            className="text-amber-600 sr-only"
                          />
                          <span className="text-[8px] font-black uppercase">Desc. %</span>
                        </label>

                        <label className={`p-1 rounded-lg border cursor-pointer transition-all flex items-center justify-center gap-1 ${
                          formData.penaltyType === 'disqualify'
                            ? 'border-red-600 bg-red-100 font-black text-red-950 shadow-2xs'
                            : 'border-slate-200 bg-white/70 text-slate-600 font-bold hover:bg-white'
                        }`}>
                          <input
                            type="radio"
                            name="modalPenaltyType"
                            checked={formData.penaltyType === 'disqualify'}
                            onChange={() => setFormData(prev => ({ ...prev, penaltyType: 'disqualify' }))}
                            className="text-red-600 sr-only"
                          />
                          <span className="text-[8px] font-black uppercase">Desqualif.</span>
                        </label>
                      </div>

                      {/* Valor do Desconto */}
                      {formData.penaltyType !== 'disqualify' && (
                        <div className="flex items-center gap-2">
                          <label className="text-[8px] font-black uppercase text-rose-900 shrink-0">
                            Valor ({formData.penaltyType === 'deduction_kg' ? 'Kg' : '%'}):
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.deductionValue || 0}
                            onChange={(e) => setFormData(prev => ({ ...prev, deductionValue: Number(e.target.value) || 0 }))}
                            className="w-full bg-white border border-rose-300 rounded-lg px-2 py-0.5 text-xs font-black text-slate-900 h-7"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          </div>

          {/* Static bottom action buttons bar - always fixed at the bottom of the screen */}
          <div className="shrink-0 bg-white border-t border-slate-200 px-3 md:px-5 py-2.5 flex gap-3 z-30 shadow-lg">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl font-black text-xs uppercase hover:bg-slate-50 transition-all cursor-pointer shadow-2xs">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer">
              <Save size={16} /> {initialData ? 'Atualizar Lançamento' : (pendingEntries.length > 1 ? `Salvar (${pendingEntries.length}) Lançamentos` : 'Salvar Lançamento')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LaunchModal;
