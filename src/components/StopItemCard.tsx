import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Trash2, Wrench, Tag, Search, Sparkles, CheckCircle2, X, Clock, Zap, Plus } from 'lucide-react';
import { StopItem } from '../types';
import { DOWNTIME_KEYWORDS_PRESETS, searchKeywords } from '../constants/downtimeKeywords';

interface StopItemCardProps {
  stop: StopItem;
  type: 'manutencao' | 'processo' | 'outros';
  onUpdate: (id: string, field: keyof StopItem, value: any) => void;
  onRemove: (id: string) => void;
}

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

export const StopItemCard: React.FC<StopItemCardProps> = ({
  stop,
  type,
  onUpdate,
  onRemove,
}) => {
  const isAvulsoMode = Boolean(stop.isAvulso || (!stop.de && !stop.ate && (stop.durationMinutes || 0) > 0));

  const diffMin = useMemo(() => {
    if (isAvulsoMode) {
      return Number(stop.durationMinutes) || 0;
    }
    const diff = getDiffMinutes(stop.de, stop.ate);
    return diff > 0 ? diff : (Number(stop.durationMinutes) || 0);
  }, [isAvulsoMode, stop.de, stop.ate, stop.durationMinutes]);

  // Palavra-chave atual
  const currentKeyword = stop.keyword || stop.motivo || '';
  const [keywordQuery, setKeywordQuery] = useState<string>(currentKeyword);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado local se props mudarem externamente
  useEffect(() => {
    const kw = stop.keyword || stop.motivo || '';
    setKeywordQuery(kw);
  }, [stop.keyword, stop.motivo]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lista filtrada de palavras-chave
  const filteredKeywords = useMemo(() => {
    return searchKeywords(keywordQuery, DOWNTIME_KEYWORDS_PRESETS);
  }, [keywordQuery]);

  // Chips Populares
  const popularKeywords = useMemo(() => {
    return DOWNTIME_KEYWORDS_PRESETS.filter(k => k.isPopular).slice(0, 6);
  }, []);

  const handleSelectKeyword = (kw: string) => {
    setKeywordQuery(kw);
    onUpdate(stop.id, 'keyword', kw);
    onUpdate(stop.id, 'motivo', kw);
    setIsDropdownOpen(false);
  };

  const handleKeywordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setKeywordQuery(val);
    onUpdate(stop.id, 'keyword', val);
    onUpdate(stop.id, 'motivo', val);
    setIsDropdownOpen(true);
  };

  const handleToggleAvulso = (newAvulso: boolean) => {
    onUpdate(stop.id, 'isAvulso', newAvulso);
    if (newAvulso && (!stop.durationMinutes || stop.durationMinutes === 0)) {
      const currentDiff = getDiffMinutes(stop.de, stop.ate);
      if (currentDiff > 0) {
        onUpdate(stop.id, 'durationMinutes', currentDiff);
      }
    }
  };

  const addQuickMinutes = (increment: number) => {
    const current = Number(stop.durationMinutes) || 0;
    const nextVal = Math.max(0, current + increment);
    onUpdate(stop.id, 'isAvulso', true);
    onUpdate(stop.id, 'durationMinutes', nextVal);
  };

  // Cores de fundo por tipo
  const typeBadgeColor =
    type === 'manutencao'
      ? 'border-orange-300 bg-orange-50/70'
      : type === 'processo'
      ? 'border-blue-300 bg-blue-50/70'
      : 'border-slate-300 bg-slate-50/70';

  return (
    <div className={`p-3 bg-white border rounded-2xl space-y-2.5 shadow-2xs transition-all ${typeBadgeColor}`}>
      {/* Topo: Seletor de Modo (Por Horário vs Lançamento Avulso) */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
        <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg shadow-2xs">
          <button
            type="button"
            onClick={() => handleToggleAvulso(false)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase transition-all ${
              !isAvulsoMode
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Clock size={10} />
            <span>Por Horário</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleAvulso(true)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase transition-all ${
              isAvulsoMode
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-700 hover:text-amber-900 hover:bg-amber-50'
            }`}
          >
            <Zap size={10} />
            <span>Lançamento Avulso (Minutos)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs">
            {diffMin > 0 ? `${diffMin} min` : '0 min'}
          </span>
          <button
            type="button"
            onClick={() => onRemove(stop.id)}
            className="p-1.5 text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-all cursor-pointer"
            title="Remover esta parada"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Seção de Entrada do Tempo (Avulso vs Horário) */}
      {isAvulsoMode ? (
        <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1">
                <Zap size={13} className="text-amber-600" /> Minutos de Parada (Avulso):
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={stop.durationMinutes === undefined || stop.durationMinutes === null ? '' : stop.durationMinutes}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                    onUpdate(stop.id, 'isAvulso', true);
                    onUpdate(stop.id, 'durationMinutes', val);
                  }}
                  placeholder="Ex: 5000"
                  className="w-28 bg-white border-2 border-amber-400 focus:border-amber-600 rounded-lg px-2.5 py-1 text-sm font-black text-slate-900 text-center outline-none shadow-xs"
                />
                <span className="text-xs font-bold text-amber-950">minutos</span>
              </div>
            </div>

            {diffMin > 0 && (
              <div className="text-[10px] font-black text-amber-900 bg-amber-200/70 border border-amber-300/80 px-2 py-1 rounded-md">
                ⚡ Equivalente: <strong>{formatDurationHuman(diffMin)}</strong>
              </div>
            )}
          </div>

          {/* Atalhos Rápidos de Minutos */}
          <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-amber-200/60">
            <span className="text-[9px] font-bold text-amber-800 mr-1">Atalhos rápidos:</span>
            {[
              { label: '+30m', val: 30 },
              { label: '+60m (1h)', val: 60 },
              { label: '+120m (2h)', val: 120 },
              { label: '+480m (8h)', val: 480 },
              { label: '+1.440m (24h)', val: 1440 },
              { label: '+5.000m', val: 5000 },
            ].map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={() => addQuickMinutes(btn.val)}
                className="px-2 py-0.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded text-[9px] font-black transition-all cursor-pointer flex items-center gap-0.5"
              >
                <Plus size={9} />
                <span>{btn.label}</span>
              </button>
            ))}
            {(stop.durationMinutes || 0) > 0 && (
              <button
                type="button"
                onClick={() => onUpdate(stop.id, 'durationMinutes', 0)}
                className="px-1.5 py-0.5 text-[9px] font-bold text-red-600 hover:bg-red-50 rounded ml-auto"
              >
                Zerar
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-1.5 flex-1 flex-wrap">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Horário:
            </span>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-2xs">
              <input
                type="time"
                value={stop.de}
                onChange={(e) => onUpdate(stop.id, 'de', e.target.value)}
                className="bg-transparent text-xs font-black text-slate-800 text-center focus:outline-none cursor-pointer"
              />
              <span className="text-[10px] font-black text-slate-400">às</span>
              <input
                type="time"
                value={stop.ate}
                onChange={(e) => onUpdate(stop.id, 'ate', e.target.value)}
                className="bg-transparent text-xs font-black text-slate-800 text-center focus:outline-none cursor-pointer"
              />
            </div>
            {diffMin > 0 && (
              <span className="text-[9px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                Duração: {formatDurationHuman(diffMin)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleToggleAvulso(true)}
            className="text-[9px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
          >
            <Zap size={10} /> Lançar minutos livres
          </button>
        </div>
      )}

      {/* Motivo / Justificativa por Escrito (Principal) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span>Motivo / Justificativa por Escrito da Parada:</span>
          </label>
          <span className="text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
            Digitado pelo usuário
          </span>
        </div>
        <textarea
          rows={2}
          value={stop.explicacao || stop.justification || stop.motivo || ''}
          onChange={(e) => {
            const val = e.target.value;
            onUpdate(stop.id, 'explicacao', val);
            onUpdate(stop.id, 'justification', val);
            onUpdate(stop.id, 'motivo', val);
          }}
          placeholder="Digite o motivo por escrito da parada (ex: Troca de faca, manutenção no motor, ajuste de temperatura, limpeza)..."
          className="w-full bg-white border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none shadow-2xs resize-none"
        />
      </div>

      {/* Palavra-Chave / Tag Opcional de Agrupamento */}
      <div className="space-y-1.5 relative pt-1 border-t border-slate-200/60" ref={dropdownRef}>
        <div className="flex items-center justify-between">
          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Tag size={11} className="text-slate-400" /> Tag / Categoria Opcional:
          </label>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
            <Search size={13} />
          </div>
          <input
            type="text"
            value={keywordQuery}
            onChange={handleKeywordInputChange}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder="Opcional: selecione uma tag rápida (ex: eixo, biela, refile)..."
            className="w-full pl-8 pr-7 py-1.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded-xl text-xs font-medium text-slate-700 outline-none shadow-2xs transition-colors"
          />
          {keywordQuery && (
            <button
              type="button"
              onClick={() => {
                setKeywordQuery('');
                onUpdate(stop.id, 'keyword', '');
                setIsDropdownOpen(true);
              }}
              className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Chips Populares Rápidos */}
        <div className="flex flex-wrap gap-1 pt-0.5">
          {popularKeywords.map((item) => {
            const isSelected = keywordQuery.toLowerCase() === item.keyword.toLowerCase();
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectKeyword(item.keyword)}
                className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 font-black'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <span>{item.keyword}</span>
                {isSelected && <CheckCircle2 size={10} />}
              </button>
            );
          })}
        </div>

        {/* Dropdown de Autocomplete */}
        {isDropdownOpen && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
            {filteredKeywords.length > 0 ? (
              filteredKeywords.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectKeyword(item.keyword)}
                  className="w-full px-2.5 py-1.5 text-left hover:bg-blue-50 text-xs font-bold text-slate-700 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Tag size={12} className="text-blue-500" />
                    {item.keyword}
                  </span>
                  {item.category && (
                    <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-1 py-0.2 rounded">
                      {item.category}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="p-2 text-center text-[10px] text-slate-500">
                Tag personalizada: <strong>{keywordQuery}</strong>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
