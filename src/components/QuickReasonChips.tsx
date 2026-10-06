import React, { useState, useRef } from 'react';
import { Plus, Check, X, Sparkles, Tag } from 'lucide-react';
import { useQuickReasons } from '../utils/quickReasons';

export interface QuickReasonChipsProps {
  category: 'ecoBP' | 'ecoBM' | 'ecoA' | 'borra' | 'manutencao' | 'processo' | 'outros' | string;
  kind: 'loss' | 'downtime';
  selectedValue?: string;
  onSelect: (reason: string) => void;
  title?: string;
  colorTheme?: 'orange' | 'indigo' | 'red' | 'blue' | 'amber' | 'slate';
  className?: string;
}

const THEME_STYLES: Record<string, {
  selectedBg: string;
  selectedText: string;
  selectedBorder: string;
  idleBg: string;
  idleText: string;
  idleBorder: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  titleText: string;
  plusBtn: string;
}> = {
  orange: {
    selectedBg: 'bg-orange-600',
    selectedText: 'text-white',
    selectedBorder: 'border-orange-700',
    idleBg: 'bg-orange-50/80 hover:bg-orange-100',
    idleText: 'text-orange-900',
    idleBorder: 'border-orange-200/80 hover:border-orange-300',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-800',
    badgeBorder: 'border-orange-300',
    titleText: 'text-orange-700',
    plusBtn: 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200',
  },
  indigo: {
    selectedBg: 'bg-indigo-600',
    selectedText: 'text-white',
    selectedBorder: 'border-indigo-700',
    idleBg: 'bg-indigo-50/80 hover:bg-indigo-100',
    idleText: 'text-indigo-900',
    idleBorder: 'border-indigo-200/80 hover:border-indigo-300',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-800',
    badgeBorder: 'border-indigo-300',
    titleText: 'text-indigo-700',
    plusBtn: 'bg-indigo-100 text-indigo-800 border-indigo-300 hover:bg-indigo-200',
  },
  red: {
    selectedBg: 'bg-red-600',
    selectedText: 'text-white',
    selectedBorder: 'border-red-700',
    idleBg: 'bg-red-50/80 hover:bg-red-100',
    idleText: 'text-red-900',
    idleBorder: 'border-red-200/80 hover:border-red-300',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-800',
    badgeBorder: 'border-red-300',
    titleText: 'text-red-700',
    plusBtn: 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200',
  },
  blue: {
    selectedBg: 'bg-blue-600',
    selectedText: 'text-white',
    selectedBorder: 'border-blue-700',
    idleBg: 'bg-blue-50/80 hover:bg-blue-100',
    idleText: 'text-blue-900',
    idleBorder: 'border-blue-200/80 hover:border-blue-300',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    badgeBorder: 'border-blue-300',
    titleText: 'text-blue-700',
    plusBtn: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
  },
  amber: {
    selectedBg: 'bg-amber-600',
    selectedText: 'text-white',
    selectedBorder: 'border-amber-700',
    idleBg: 'bg-amber-50/80 hover:bg-amber-100',
    idleText: 'text-amber-900',
    idleBorder: 'border-amber-200/80 hover:border-amber-300',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-300',
    titleText: 'text-amber-800',
    plusBtn: 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200',
  },
  slate: {
    selectedBg: 'bg-slate-700',
    selectedText: 'text-white',
    selectedBorder: 'border-slate-800',
    idleBg: 'bg-slate-100 hover:bg-slate-200',
    idleText: 'text-slate-800',
    idleBorder: 'border-slate-300 hover:border-slate-400',
    badgeBg: 'bg-slate-200',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-300',
    titleText: 'text-slate-700',
    plusBtn: 'bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300',
  },
};

export const QuickReasonChips: React.FC<QuickReasonChipsProps> = ({
  category,
  kind,
  selectedValue = '',
  onSelect,
  title,
  colorTheme = 'orange',
  className = '',
}) => {
  const { reasons, addReason } = useQuickReasons(category, kind);
  const [isAdding, setIsAdding] = useState(false);
  const [newReasonInput, setNewReasonInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const theme = THEME_STYLES[colorTheme] || THEME_STYLES.orange;
  const defaultTitle = kind === 'loss' ? '⚡ Motivo Rápido da Perda:' : '⚡ Motivo Rápido de Parada:';
  const displayTitle = title || defaultTitle;

  const handleStartAdding = () => {
    setIsAdding(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleConfirmAdd = async () => {
    const trimmed = newReasonInput.trim();
    if (!trimmed) {
      setIsAdding(false);
      return;
    }
    const added = await addReason(trimmed);
    if (added) {
      onSelect(added);
    }
    setNewReasonInput('');
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmAdd();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsAdding(false);
      setNewReasonInput('');
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Cabeçalho com Título, Badge Selecionado e Botão de Adicionar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${theme.titleText}`}>
          <Tag size={11} />
          {displayTitle}
        </span>

        {selectedValue && (
          <span
            className={`text-[9px] font-black px-2 py-0.5 rounded-full border shadow-2xs animate-in fade-in ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}
            title="Motivo selecionado para BI"
          >
            ✓ {selectedValue}
          </span>
        )}
      </div>

      {/* Lista de Chips com Seleção Rápida em 1 Toque + Opção de Adicionar Novo */}
      <div className="flex flex-wrap items-center gap-1.5">
        {reasons.map((reason) => {
          const isSelected = selectedValue.trim().toLowerCase() === reason.trim().toLowerCase();
          return (
            <button
              key={reason}
              type="button"
              onClick={() => onSelect(reason)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border active:scale-95 ${
                isSelected
                  ? `${theme.selectedBg} ${theme.selectedText} ${theme.selectedBorder} shadow-xs scale-102 font-black ring-2 ring-offset-1 ring-${colorTheme}-400/50`
                  : `${theme.idleBg} ${theme.idleText} ${theme.idleBorder}`
              }`}
            >
              {isSelected && <span className="mr-0.5">✓</span>}
              {reason}
            </button>
          );
        })}

        {/* Input Inline para Criar Novo Motivo Rápido */}
        {isAdding ? (
          <div className="inline-flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5 shadow-xs animate-in zoom-in-95 duration-150">
            <input
              ref={inputRef}
              type="text"
              value={newReasonInput}
              onChange={(e) => setNewReasonInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={kind === 'loss' ? 'Novo motivo rápido...' : 'Nova parada rápida...'}
              className="px-2 py-0.5 text-[10px] font-bold text-slate-800 bg-transparent outline-none w-36 sm:w-44"
            />
            <button
              type="button"
              onClick={handleConfirmAdd}
              className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors"
              title="Salvar e selecionar este novo motivo"
            >
              <Check size={12} />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewReasonInput('');
              }}
              className="p-1 hover:bg-slate-100 text-slate-500 rounded-md transition-colors"
              title="Cancelar"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleStartAdding}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer border border-dashed active:scale-95 ${theme.plusBtn}`}
            title="Adicionar um novo motivo rápido à lista do sistema"
          >
            <Plus size={11} />
            <span>Adicionar Motivo</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default QuickReasonChips;
