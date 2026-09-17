import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, Plus, Trash2, X, Check, HelpCircle, UserX, Scale, Info } from 'lucide-react';
import { OperatorPenalty, PenaltyType, Collaborator, Employee } from '../types';

interface OperatorPenaltyModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardMonth: string; // YYYY-MM
  operatorPenalties: OperatorPenalty[];
  onAddPenalty: (penalty: Omit<OperatorPenalty, 'id' | 'createdAt'>) => Promise<void> | void;
  onDeletePenalty: (id: string) => Promise<void> | void;
  operatorsList: string[];
}

const PRESET_INFRACTIONS = [
  '🛑 Não realizou parada obrigatória de limpeza (ex: 6h/6h)',
  '⚠️ Descumprimento de Procedimento Operacional Padrão (POP)',
  '🦺 Inobservância de Normas de Segurança / Uso de EPI',
  '🗑️ Geração excessiva de aparas por falta de regulagem',
  '⚙️ Operação de máquina fora dos parâmetros do processo',
  '🕒 Atraso / Ausência não notificada no início do turno',
  '📝 Outra Infração Personalizada...',
];

export const OperatorPenaltyModal: React.FC<OperatorPenaltyModalProps> = ({
  isOpen,
  onClose,
  dashboardMonth,
  operatorPenalties,
  onAddPenalty,
  onDeletePenalty,
  operatorsList,
}) => {
  const [selectedOperator, setSelectedOperator] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(PRESET_INFRACTIONS[0]);
  const [customInfraction, setCustomInfraction] = useState('');
  const [penaltyType, setPenaltyType] = useState<PenaltyType>('deduction_kg');
  const [deductionValue, setDeductionValue] = useState<number>(500);
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(() => `${dashboardMonth}-01`);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Filter penalties for the active month
  const activeMonthPenalties = operatorPenalties.filter((p) =>
    p.date ? p.date.startsWith(dashboardMonth) : true
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOperator) {
      alert('Por favor, selecione o operador que cometeu a infração.');
      return;
    }

    const finalInfraction =
      selectedPreset === '📝 Outra Infração Personalizada...'
        ? customInfraction.trim()
        : selectedPreset;

    if (!finalInfraction) {
      alert('Por favor, especifique qual foi a infração ou regra descumprida.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddPenalty({
        operator: selectedOperator,
        date: date || `${dashboardMonth}-01`,
        infractionType: finalInfraction,
        penaltyType,
        deductionValue: penaltyType === 'disqualify' ? 0 : Number(deductionValue) || 0,
        reason: reason.trim(),
      });

      // Reset form
      setSelectedOperator('');
      setReason('');
      setDeductionValue(500);
      alert('Penalidade aplicada com sucesso! O ranking de operadores foi atualizado.');
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar penalidade.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-red-700 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs border border-white/20">
              <ShieldAlert className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">Gestão de Penalidades de Operadores</h2>
              <p className="text-xs text-amber-100 font-medium mt-0.5">
                Desconto de pontos/produção e desqualificação por descumprimento de regras
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Explanation Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900 text-xs leading-relaxed">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Como funciona a punição no Ranking?</p>
              <p className="mt-1 text-amber-800">
                Operadores que descumprem regras (como <strong>não parar a máquina para limpeza obrigatória a cada 6h</strong>) podem acabar produzindo um volume maior artificialmente. Ao registrar uma infração aqui, o sistema deduz os quilos ou porcentagem no peso de ranking, ou desqualifica o operador do 1º lugar, garantindo justiça com quem cumpre os procedimentos!
              </p>
            </div>
          </div>

          {/* Form: Registrar Nova Penalidade */}
          <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Plus size={16} className="text-rose-600" /> Nova Punição / Infração no Ranking
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Seleção do Operador */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Operador *
                </label>
                <select
                  value={selectedOperator}
                  onChange={(e) => setSelectedOperator(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  required
                >
                  <option value="">-- Selecionar Operador --</option>
                  {operatorsList.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data da Infração */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Data da Infração *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>
            </div>

            {/* Regra Descumprida / Infração */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Regra Descumprida / Infração *
              </label>
              <select
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              >
                {PRESET_INFRACTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              {selectedPreset === '📝 Outra Infração Personalizada...' && (
                <input
                  type="text"
                  placeholder="Especifique a regra ou infração..."
                  value={customInfraction}
                  onChange={(e) => setCustomInfraction(e.target.value)}
                  className="w-full mt-2 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                  required
                />
              )}
            </div>

            {/* Tipo de Penalidade */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  penaltyType === 'deduction_kg'
                    ? 'border-rose-500 bg-rose-50/80 text-rose-950 font-black shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 font-medium hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="penaltyType"
                    checked={penaltyType === 'deduction_kg'}
                    onChange={() => setPenaltyType('deduction_kg')}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-xs font-extrabold uppercase">Desconto em Kg</span>
                </div>
                <p className="text-[10px] opacity-75 mt-1">Dedução direta de quilos no total do ranking</p>
              </label>

              <label
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  penaltyType === 'deduction_percent'
                    ? 'border-amber-500 bg-amber-50/80 text-amber-950 font-black shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 font-medium hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="penaltyType"
                    checked={penaltyType === 'deduction_percent'}
                    onChange={() => setPenaltyType('deduction_percent')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs font-extrabold uppercase">Desconto %</span>
                </div>
                <p className="text-[10px] opacity-75 mt-1">Percentual descontado da produção do mês</p>
              </label>

              <label
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  penaltyType === 'disqualify'
                    ? 'border-red-600 bg-red-100/90 text-red-950 font-black shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 font-medium hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="penaltyType"
                    checked={penaltyType === 'disqualify'}
                    onChange={() => setPenaltyType('disqualify')}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span className="text-xs font-extrabold uppercase">Desqualificar</span>
                </div>
                <p className="text-[10px] opacity-75 mt-1">Remove do 1º lugar do ranking neste mês</p>
              </label>
            </div>

            {/* Valor do Desconto */}
            {penaltyType !== 'disqualify' && (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Valor da Punição ({penaltyType === 'deduction_kg' ? 'em Kg' : 'em %'}) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={penaltyType === 'deduction_percent' ? 100 : 100000}
                    value={deductionValue}
                    onChange={(e) => setDeductionValue(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 uppercase">
                    {penaltyType === 'deduction_kg' ? 'Kg' : '%'}
                  </span>
                </div>
              </div>
            )}

            {/* Observações / Justificativa */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Justificativa / Observações (Opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Operador não realizou a parada das 12:00 e acumulou peso irregular no turno..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <AlertTriangle size={16} />
              <span>Aplicar Punição no Ranking</span>
            </button>
          </form>

          {/* Lista de Penalidades do Mês Ativo */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center justify-between">
              <span>Penalidades Registradas no Mês ({activeMonthPenalties.length})</span>
              <span className="text-[10px] text-slate-400 font-bold">Ref: {dashboardMonth}</span>
            </h3>

            {activeMonthPenalties.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs italic">
                Nenhuma punição registrada para este mês. Todos os operadores estão pontuando normalmente.
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeMonthPenalties.map((pen) => (
                  <div
                    key={pen.id}
                    className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-rose-300 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900 text-sm">{pen.operator}</span>
                        <span className="text-[10px] font-bold text-slate-400">({pen.date})</span>

                        {pen.penaltyType === 'deduction_kg' && (
                          <span className="bg-rose-100 text-rose-800 font-black text-[10px] px-2.5 py-0.5 rounded-full border border-rose-200">
                            -{pen.deductionValue.toLocaleString('pt-BR')} Kg
                          </span>
                        )}
                        {pen.penaltyType === 'deduction_percent' && (
                          <span className="bg-amber-100 text-amber-800 font-black text-[10px] px-2.5 py-0.5 rounded-full border border-amber-200">
                            -{pen.deductionValue}% na pontuação
                          </span>
                        )}
                        {pen.penaltyType === 'disqualify' && (
                          <span className="bg-red-600 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            ⛔ Desqualificado do 1º Lugar
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-700 font-semibold">{pen.infractionType}</p>
                      {pen.reason && (
                        <p className="text-[11px] text-slate-500 italic leading-snug">
                          "{pen.reason}"
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`Remover a punição do operador ${pen.operator}?`)) {
                          onDeletePenalty(pen.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shrink-0 self-end sm:self-center"
                      title="Excluir punição"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
