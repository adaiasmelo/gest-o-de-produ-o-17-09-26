import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Wrench,
  Cog,
  HelpCircle,
  Search,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  X,
  Sparkles,
  Tag,
  AlertTriangle,
  ChevronDown,
  Edit2
} from 'lucide-react';
import { DowntimeRecord, DowntimeNature, DowntimeKeyword } from '../types';
import { DOWNTIME_KEYWORDS_PRESETS, searchKeywords } from '../constants/downtimeKeywords';

interface DowntimeEntryFormProps {
  initialRecords?: DowntimeRecord[];
  onSaveRecords?: (records: DowntimeRecord[]) => void;
  machineName?: string;
  operatorName?: string;
  shiftName?: string;
}

export const DowntimeEntryForm: React.FC<DowntimeEntryFormProps> = ({
  initialRecords = [],
  onSaveRecords,
  machineName = 'Cast 1',
  operatorName = '',
  shiftName = 'Diurno',
}) => {
  // Lista de registros de paradas apontadas
  const [records, setRecords] = useState<DowntimeRecord[]>(initialRecords);

  // Estado da natureza selecionada nos Cards Iniciais
  const [selectedNature, setSelectedNature] = useState<DowntimeNature>('Manutenção');

  // Estado do formulário de novo apontamento
  const [editingId, setEditingId] = useState<string | null>(null);
  const [keywordQuery, setKeywordQuery] = useState<string>('');
  const [selectedKeyword, setSelectedKeyword] = useState<string>('');
  const [justification, setJustification] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');

  // Dropdown e pesquisa de palavras-chave
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const comboboxRef = useRef<HTMLDivElement>(null);

  // Auto-calcular duração a partir de horário início e fim
  useEffect(() => {
    if (startTime && endTime) {
      const [hStart, mStart] = startTime.split(':').map(Number);
      const [hEnd, mEnd] = endTime.split(':').map(Number);
      if (!isNaN(hStart) && !isNaN(mStart) && !isNaN(hEnd) && !isNaN(mEnd)) {
        let startMin = hStart * 60 + mStart;
        let endMin = hEnd * 60 + mEnd;
        if (endMin < startMin) endMin += 24 * 60; // virada de dia
        const diff = endMin - startMin;
        if (diff >= 0) {
          setDurationMinutes(diff);
        }
      }
    }
  }, [startTime, endTime]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Palavras-chave filtradas
  const filteredKeywords = useMemo(() => {
    return searchKeywords(keywordQuery, DOWNTIME_KEYWORDS_PRESETS);
  }, [keywordQuery]);

  // Palavras-chave populares para acesso rápido (Chips)
  const popularKeywords = useMemo(() => {
    return DOWNTIME_KEYWORDS_PRESETS.filter((k) => k.isPopular).slice(0, 8);
  }, []);

  // Agrupamento por Natureza e Totais de Tempo
  const statsByNature = useMemo(() => {
    const totalManutencao = records
      .filter((r) => r.nature === 'Manutenção')
      .reduce((sum, r) => sum + (r.durationMinutes || 0), 0);
    const totalProcesso = records
      .filter((r) => r.nature === 'Processo')
      .reduce((sum, r) => sum + (r.durationMinutes || 0), 0);
    const totalOutros = records
      .filter((r) => r.nature === 'Outros')
      .reduce((sum, r) => sum + (r.durationMinutes || 0), 0);

    return {
      Manutenção: totalManutencao,
      Processo: totalProcesso,
      Outros: totalOutros,
      totalGeral: totalManutencao + totalProcesso + totalOutros,
    };
  }, [records]);

  // Selecionar Palavra-chave no Combobox/Autocomplete
  const handleSelectKeyword = (keyword: string) => {
    setSelectedKeyword(keyword);
    setKeywordQuery(keyword);
    setIsDropdownOpen(false);
  };

  // Salvar/Adicionar Registro de Parada
  const handleSaveDowntime = (e: React.FormEvent) => {
    e.preventDefault();

    const finalKeyword = (selectedKeyword || keywordQuery).trim();
    if (!finalKeyword) {
      alert('Por favor, selecione ou digite uma Palavra-chave para o apontamento.');
      return;
    }

    if (durationMinutes <= 0) {
      alert('Informe uma Duração válida em minutos.');
      return;
    }

    if (editingId) {
      // Atualizar existente
      const updated = records.map((r) =>
        r.id === editingId
          ? {
              ...r,
              nature: selectedNature,
              keyword: finalKeyword,
              justification: justification.trim(),
              durationMinutes: Number(durationMinutes),
              de: startTime,
              ate: endTime,
            }
          : r
      );
      setRecords(updated);
      onSaveRecords?.(updated);
      setEditingId(null);
    } else {
      // Criar novo registro
      const newRecord: DowntimeRecord = {
        id: `stop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        nature: selectedNature,
        keyword: finalKeyword,
        justification: justification.trim(),
        durationMinutes: Number(durationMinutes),
        de: startTime,
        ate: endTime,
        createdAt: new Date().toISOString(),
        machine: machineName,
        operator: operatorName,
        shift: shiftName,
      };
      const updated = [newRecord, ...records];
      setRecords(updated);
      onSaveRecords?.(updated);
    }

    // Resetar campos do formulário mantendo a natureza
    setSelectedKeyword('');
    setKeywordQuery('');
    setJustification('');
    setDurationMinutes(15);
    setStartTime('');
    setEndTime('');
  };

  // Carregar registro para edição
  const handleEditRecord = (record: DowntimeRecord) => {
    setEditingId(record.id);
    setSelectedNature(record.nature);
    setSelectedKeyword(record.keyword);
    setKeywordQuery(record.keyword);
    setJustification(record.justification || '');
    setDurationMinutes(record.durationMinutes || 0);
    setStartTime(record.de || '');
    setEndTime(record.ate || '');
  };

  // Cancelar edição
  const handleCancelEdit = () => {
    setEditingId(null);
    setSelectedKeyword('');
    setKeywordQuery('');
    setJustification('');
    setDurationMinutes(15);
    setStartTime('');
    setEndTime('');
  };

  // Remover registro
  const handleRemoveRecord = (id: string) => {
    const updated = records.filter((r) => r.id !== id);
    setRecords(updated);
    onSaveRecords?.(updated);
    if (editingId === id) {
      handleCancelEdit();
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5 p-2 sm:p-4 text-slate-800">
      {/* ------------------------------------------------------------- */}
      {/* CARD 1: SELEÇÃO DA NATUREZA MACRO DO APONTAMENTO (CARDS INICIAIS) */}
      {/* ------------------------------------------------------------- */}
      <div>
        <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">
          1. Selecione a Natureza Macro da Parada
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card Manutenção */}
          <button
            type="button"
            onClick={() => setSelectedNature('Manutenção')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between h-28 ${
              selectedNature === 'Manutenção'
                ? 'bg-amber-500 text-white border-amber-600 shadow-lg ring-4 ring-amber-500/20 scale-[1.02]'
                : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400 hover:bg-amber-50/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div
                className={`p-2 rounded-xl ${
                  selectedNature === 'Manutenção' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                }`}
              >
                <Wrench size={22} />
              </div>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  selectedNature === 'Manutenção' ? 'bg-white text-amber-800 font-extrabold' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {statsByNature.Manutenção} MIN
              </span>
            </div>

            <div>
              <h3 className="font-black text-base uppercase tracking-tight">Manutenção</h3>
              <p
                className={`text-[11px] font-medium leading-tight ${
                  selectedNature === 'Manutenção' ? 'text-amber-100' : 'text-slate-500'
                }`}
              >
                Falhas mecânicas, elétricas, pneumáticas e trocas corretivas.
              </p>
            </div>
          </button>

          {/* Card Processo */}
          <button
            type="button"
            onClick={() => setSelectedNature('Processo')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between h-28 ${
              selectedNature === 'Processo'
                ? 'bg-blue-600 text-white border-blue-700 shadow-lg ring-4 ring-blue-600/20 scale-[1.02]'
                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div
                className={`p-2 rounded-xl ${
                  selectedNature === 'Processo' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                }`}
              >
                <Cog size={22} />
              </div>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  selectedNature === 'Processo' ? 'bg-white text-blue-900 font-extrabold' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {statsByNature.Processo} MIN
              </span>
            </div>

            <div>
              <h3 className="font-black text-base uppercase tracking-tight">Processo</h3>
              <p
                className={`text-[11px] font-medium leading-tight ${
                  selectedNature === 'Processo' ? 'text-blue-100' : 'text-slate-500'
                }`}
              >
                Ajustes operacionais, setup, refile, troca de filtro/bobina.
              </p>
            </div>
          </button>

          {/* Card Outros */}
          <button
            type="button"
            onClick={() => setSelectedNature('Outros')}
            className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between h-28 ${
              selectedNature === 'Outros'
                ? 'bg-purple-600 text-white border-purple-700 shadow-lg ring-4 ring-purple-600/20 scale-[1.02]'
                : 'bg-white text-slate-700 border-slate-200 hover:border-purple-400 hover:bg-purple-50/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div
                className={`p-2 rounded-xl ${
                  selectedNature === 'Outros' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
                }`}
              >
                <HelpCircle size={22} />
              </div>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  selectedNature === 'Outros' ? 'bg-white text-purple-900 font-extrabold' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {statsByNature.Outros} MIN
              </span>
            </div>

            <div>
              <h3 className="font-black text-base uppercase tracking-tight">Outros / Operacional</h3>
              <p
                className={`text-[11px] font-medium leading-tight ${
                  selectedNature === 'Outros' ? 'text-purple-100' : 'text-slate-500'
                }`}
              >
                Falta de matéria-prima, energia, reuniões, ginástica laboral.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* FORMULÁRIO DE APONTAMENTO BASEADO EM PALAVRAS-CHAVE */}
      {/* ------------------------------------------------------------- */}
      <form
        onSubmit={handleSaveDowntime}
        className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 relative"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Tag size={18} />
            </span>
            <h4 className="font-black text-sm uppercase tracking-tight text-slate-800">
              {editingId ? 'Editar Parada' : `Novo Apontamento — ${selectedNature}`}
            </h4>
          </div>

          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
            >
              Cancelar Edição
            </button>
          )}
        </div>

        {/* --- CAMPO 1: SELETOR PESQUISÁVEL DE PALAVRAS-CHAVE (COMBOBOX) --- */}
        <div className="space-y-1.5 relative" ref={comboboxRef}>
          <label className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>
              Palavra-Chave / Tag <span className="text-red-500">*</span>
            </span>
            <span className="text-[10px] text-slate-400 font-normal">
              Ex: eixo, biela central, mangueira de ar, refile...
            </span>
          </label>

          {/* Input de Pesquisa do Combobox */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>

            <input
              type="text"
              value={keywordQuery}
              onChange={(e) => {
                setKeywordQuery(e.target.value);
                setSelectedKeyword(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Digite para buscar... ex: eixo, biela, bomba, refile"
              className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm font-bold text-slate-800 outline-none transition-all"
            />

            {keywordQuery && (
              <button
                type="button"
                onClick={() => {
                  setKeywordQuery('');
                  setSelectedKeyword('');
                  setIsDropdownOpen(true);
                }}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Chips de Palavras-chave Populares para Telas Sensíveis ao Toque */}
          <div className="pt-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Sparkles size={11} className="text-amber-500" /> Mais Frequentes (Toque para selecionar):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {popularKeywords.map((item) => {
                const isSelected = selectedKeyword.toLowerCase() === item.keyword.toLowerCase();
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectKeyword(item.keyword)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>{item.keyword}</span>
                    {isSelected && <CheckCircle2 size={12} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dropdown com Lista Filtrada de Palavras-chave */}
          {isDropdownOpen && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
              {filteredKeywords.length > 0 ? (
                filteredKeywords.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectKeyword(item.keyword)}
                    className="w-full px-3 py-2.5 text-left hover:bg-blue-50 text-xs font-bold text-slate-700 flex items-center justify-between group transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Tag size={14} className="text-blue-500 group-hover:scale-110 transition-transform" />
                      <span>{item.keyword}</span>
                    </div>
                    {item.category && (
                      <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                        {item.category}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-slate-500 font-medium">
                  Nenhuma palavra-chave pré-definida encontrada para &quot;{keywordQuery}&quot;.
                  <p className="text-[11px] font-bold text-blue-600 mt-1">
                    ✓ Você pode usar &quot;{keywordQuery}&quot; como palavra-chave personalizada!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* --- CAMPO 2: JUSTIFICATIVA LIVRE (TEXTAREA) --- */}
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
            Justificativa Livre / Observações Detalhadas
          </label>
          <textarea
            rows={2}
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Descreva livremente os detalhes do ocorrido (ex: Rompimento da mangueira de ar comprimido no puxador durante troca de bobina)..."
            className="w-full p-3 bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs font-medium text-slate-800 outline-none transition-all resize-none"
          />
        </div>

        {/* --- CAMPO 3: REGISTRO DE TEMPO (DURAÇÃO E HORÁRIO) --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Duração Direta em Minutos + Botões Touch Presets */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
              Duração (Minutos) <span className="text-red-500">*</span>
            </label>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={durationMinutes || ''}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl text-base font-black text-slate-800 text-center outline-none h-11"
                  placeholder="15"
                />
                <span className="absolute right-3 top-3 text-xs font-bold text-slate-400">MIN</span>
              </div>
            </div>

            {/* Presets Rápidos para Telas Sensíveis ao Toque */}
            <div className="flex items-center gap-1 flex-wrap pt-0.5">
              {[5, 10, 15, 30, 45, 60].map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setDurationMinutes(min)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                    durationMinutes === min
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  +{min}m
                </button>
              ))}
            </div>
          </div>

          {/* Horário Início e Fim (Opcional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
              Horário (Início &amp; Fim) <span className="text-slate-400 font-normal">(Opcional)</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Início:</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 text-center outline-none h-11 cursor-pointer"
                />
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Fim:</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 text-center outline-none h-11 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Botão de Salvar Apontamento */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest py-3 px-4 rounded-xl transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer h-12"
          >
            <Plus size={18} />
            <span>{editingId ? 'Atualizar Parada' : `Adicionar Parada de ${selectedNature}`}</span>
          </button>
        </div>
      </form>

      {/* ------------------------------------------------------------- */}
      {/* LISTA DE REGISTROS DE PARADAS APONTADAS */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="font-black text-xs uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <Clock size={16} />
            <span>Paradas Apontadas ({records.length})</span>
          </h4>

          <div className="text-xs font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Total Parado: <span className="text-red-600 font-extrabold">{statsByNature.totalGeral} min</span>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center text-slate-400 space-y-1">
            <Clock size={28} className="mx-auto text-slate-300" />
            <p className="text-xs font-bold text-slate-500">Nenhuma parada registrada para esta máquina.</p>
            <p className="text-[11px]">Selecione a natureza acima e escolha a palavra-chave para registrar.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((item) => {
              const natureBadgeStyle =
                item.nature === 'Manutenção'
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : item.nature === 'Processo'
                  ? 'bg-blue-100 text-blue-900 border-blue-300'
                  : 'bg-purple-100 text-purple-900 border-purple-300';

              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${natureBadgeStyle}`}>
                        {item.nature}
                      </span>

                      <span className="text-xs font-black bg-slate-900 text-white px-2.5 py-0.5 rounded-md flex items-center gap-1">
                        <Tag size={12} />
                        {item.keyword}
                      </span>

                      {(item.de || item.ate) && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {item.de || '--:--'} às {item.ate || '--:--'}
                        </span>
                      )}
                    </div>

                    {item.justification && (
                      <p className="text-xs font-medium text-slate-600 bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                        {item.justification}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-slate-100 pt-2 sm:pt-0">
                    <span className="text-sm font-black text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">
                      {item.durationMinutes} min
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEditRecord(item)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Editar parada"
                      >
                        <Edit2 size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveRecord(item.id)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Remover parada"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
