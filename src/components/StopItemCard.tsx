import React, { useMemo } from 'react';
import { Trash2, Clock, Zap, Plus } from 'lucide-react';
import { StopItem } from '../types';
import { ReasonInputWithSave } from './ReasonInputWithSave';

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
                <Zap size={12} className="text-amber-600" /> Minutos Parados:
              </span>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={stop.durationMinutes || ''}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    onUpdate(stop.id, 'durationMinutes', isNaN(v) ? 0 : Math.max(0, v));
                  }}
                  placeholder="Ex: 45"
                  className="w-24 px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-black text-amber-950 text-center focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                />
                <span className="text-[9px] font-bold text-amber-700 ml-1.5">min</span>
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

      {/* Motivo / Justificativa por Escrito com salvamento na relação */}
      <div className="space-y-1">
        <ReasonInputWithSave
          label="Motivo / Justificativa da Parada"
          value={stop.explicacao || stop.justification || stop.motivo || ''}
          onChange={(val) => {
            onUpdate(stop.id, 'explicacao', val);
            onUpdate(stop.id, 'justification', val);
            onUpdate(stop.id, 'motivo', val);
            onUpdate(stop.id, 'keyword', '');
          }}
          category={`paradas_${type}`}
          placeholder="Digite o motivo da parada ou selecione da relação..."
          multiline={false}
        />
      </div>
    </div>
  );
};

export default StopItemCard;
