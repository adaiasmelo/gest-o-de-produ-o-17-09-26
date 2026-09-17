import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Trash2, Wrench, Tag, Search, Sparkles, CheckCircle2, X } from 'lucide-react';
import { StopItem } from '../types';
import { DOWNTIME_KEYWORDS_PRESETS, searchKeywords } from '../constants/downtimeKeywords';

interface StopItemCardProps {
  stop: StopItem;
  type: 'manutencao' | 'processo' | 'outros';
  onUpdate: (id: string, field: keyof StopItem, value: string) => void;
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

export const StopItemCard: React.FC<StopItemCardProps> = ({
  stop,
  type,
  onUpdate,
  onRemove,
}) => {
  const diffMin = getDiffMinutes(stop.de, stop.ate);

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

  // Cores de fundo por tipo
  const typeBadgeColor =
    type === 'manutencao'
      ? 'border-orange-300 bg-orange-50/70'
      : type === 'processo'
      ? 'border-blue-300 bg-blue-50/70'
      : 'border-slate-300 bg-slate-50/70';

  return (
    <div className={`p-3 bg-white border rounded-2xl space-y-2.5 shadow-2xs transition-all ${typeBadgeColor}`}>
      {/* Topo: Horário & Duração */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
        <div className="flex items-center gap-1.5 flex-1 flex-wrap">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Horário:
          </span>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 shadow-2xs">
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

      {/* Seletor Pesquisável de Palavras-Chave (Combobox/Autocomplete) */}
      <div className="space-y-1.5 relative" ref={dropdownRef}>
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
            <Tag size={12} className="text-orange-500" /> Palavra-Chave / Tag da Parada:
          </label>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
            <Search size={14} />
          </div>
          <input
            type="text"
            value={keywordQuery}
            onChange={handleKeywordInputChange}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder="Digite a palavra-chave... ex: eixo, biela, mangueira de ar, refile"
            className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-xs font-black text-slate-800 outline-none shadow-2xs"
          />
          {keywordQuery && (
            <button
              type="button"
              onClick={() => {
                setKeywordQuery('');
                onUpdate(stop.id, 'keyword', '');
                onUpdate(stop.id, 'motivo', '');
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
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
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
                Palavra-chave customizada: <strong>{keywordQuery}</strong>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Justificativa Livre */}
      <div className="space-y-1">
        <label className="text-[9px] font-black text-slate-600 uppercase tracking-wider block">
          Justificativa Livre / Observações:
        </label>
        <input
          type="text"
          value={stop.explicacao || stop.justification || ''}
          onChange={(e) => {
            onUpdate(stop.id, 'explicacao', e.target.value);
            onUpdate(stop.id, 'justification', e.target.value);
          }}
          placeholder="Descreva os detalhes complementares da ocorrência..."
          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
        />
      </div>
    </div>
  );
};
