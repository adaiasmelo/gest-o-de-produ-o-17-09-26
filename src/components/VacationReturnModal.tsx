import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Check, AlertCircle, User, Briefcase, Palmtree, ArrowRight, UserCheck, RefreshCw } from 'lucide-react';
import { Employee } from '../types';

interface VacationReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  substituteEmployee?: Employee | null;
  onSaveReturnDate: (employeeId: string, newReturnDate: string, notes?: string) => Promise<void>;
  onEndVacation: (employeeId: string) => Promise<void>;
  canManage?: boolean;
}

export const VacationReturnModal: React.FC<VacationReturnModalProps> = ({
  isOpen,
  onClose,
  employee,
  substituteEmployee,
  onSaveReturnDate,
  onEndVacation,
  canManage = true
}) => {
  const [returnDate, setReturnDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmEnd, setShowConfirmEnd] = useState<boolean>(false);

  useEffect(() => {
    if (employee) {
      setReturnDate(employee.returnDate || '');
      setNotes('');
      setError(null);
      setShowConfirmEnd(false);
    }
  }, [employee, isOpen]);

  if (!isOpen || !employee) return null;

  // Formatar datas para exibição
  const formatDateBR = (d?: string) => {
    if (!d) return 'Não definida';
    const parts = d.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  };

  // Cálculo de dias restantes até o retorno
  const getDaysDiff = (targetDateStr?: string) => {
    if (!targetDateStr) return null;
    const parts = targetDateStr.split('-').map(Number);
    if (parts.length !== 3) return null;
    const target = new Date(parts[0], parts[1] - 1, parts[2]);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = getDaysDiff(employee.returnDate);
  const newDaysRemaining = getDaysDiff(returnDate);

  // Ajustes rápidos de data
  const handleQuickAddDays = (days: number) => {
    const base = returnDate ? new Date(returnDate + 'T00:00:00') : new Date();
    base.setDate(base.getDate() + days);
    setReturnDate(base.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnDate) {
      setError('Por favor, informe a nova data de retorno das férias.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onSaveReturnDate(employee.id, returnDate, notes.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao atualizar data de retorno.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteEndVacation = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onEndVacation(employee.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao encerrar férias.');
    } finally {
      setIsSaving(false);
      setShowConfirmEnd(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[350] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/70">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shadow-xs">
              <Palmtree size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Gestão de Férias & Retorno
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-200 text-amber-900 border border-amber-300">
                  Em Férias
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                Alteração da Data de Retorno • Histórico & Substituto
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl hover:bg-white text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Dados do Colaborador em Férias */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Colaborador em Férias
                </span>
                <h4 className="text-base font-black text-slate-900">
                  {employee.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-0.5">
                  <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px]">
                    Matr: {employee.registration || 'S/M'}
                  </span>
                  <span>•</span>
                  <span>{employee.role}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Alocação Oficial
                </span>
                <span className="text-xs font-black text-slate-800 block">
                  {employee.sector} • {employee.machine}
                </span>
                <span className="text-[10px] text-blue-600 font-bold block">
                  Turno: {employee.shift}
                </span>
              </div>
            </div>

            {/* Substituto no Posto */}
            <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck size={15} className="text-emerald-600" />
                <span className="text-[11px] font-bold text-slate-600">
                  Substituto Atual no Posto:
                </span>
              </div>
              {substituteEmployee ? (
                <span className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                  <span>{substituteEmployee.name}</span>
                  {substituteEmployee.registration && (
                    <span className="font-mono text-[9px] text-emerald-600">({substituteEmployee.registration})</span>
                  )}
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg">
                  Vaga temporária sem substituto
                </span>
              )}
            </div>
          </div>

          {/* Situação Atual de Retorno */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Data de Retorno Atual
              </span>
              <span className="text-base font-black text-slate-900 block mt-0.5">
                {formatDateBR(employee.returnDate)}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                {daysRemaining === null ? (
                  'Não definida'
                ) : daysRemaining > 0 ? (
                  <span className="text-emerald-600 font-bold">Faltam {daysRemaining} dia(s)</span>
                ) : daysRemaining === 0 ? (
                  <span className="text-amber-600 font-bold">Retorno previsto para hoje!</span>
                ) : (
                  <span className="text-red-600 font-bold">Venceu há {Math.abs(daysRemaining)} dia(s)</span>
                )}
              </span>
            </div>

            <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200">
              <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider block">
                Nova Data Selecionada
              </span>
              <span className="text-base font-black text-blue-900 block mt-0.5">
                {formatDateBR(returnDate)}
              </span>
              <span className="text-[10px] text-blue-700 font-medium">
                {newDaysRemaining !== null && newDaysRemaining >= 0 ? (
                  `Faltarão ${newDaysRemaining} dia(s) até a volta`
                ) : newDaysRemaining !== null ? (
                  `Data no passado (${Math.abs(newDaysRemaining)} dias atrás)`
                ) : (
                  'Selecione uma data'
                )}
              </span>
            </div>
          </div>

          {/* Formulário de Alteração da Data de Retorno */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Nova Data de Retorno Prevista *</span>
                <span className="text-[10px] text-slate-400 font-medium">Data do 1º dia de volta ao trabalho</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>

              {/* Botões de ajuste rápido */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] font-bold text-slate-400 mr-1">Atalhos rápidos:</span>
                {[
                  { label: '+5 dias', days: 5 },
                  { label: '+10 dias', days: 10 },
                  { label: '+15 dias', days: 15 },
                  { label: '+30 dias', days: 30 }
                ].map((b) => (
                  <button
                    key={b.label}
                    type="button"
                    onClick={() => handleQuickAddDays(b.days)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer"
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-1">
                Motivo / Observação da Alteração (Opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Prorrogação acordada / Troca de período / Retorno antecipado"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            {/* Confirmação Inline de Encerramento de Férias */}
            {showConfirmEnd && (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl space-y-3 animate-in fade-in duration-150">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <UserCheck size={18} />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-emerald-950 uppercase tracking-tight">
                      Confirmar Reativação do Colaborador
                    </h5>
                    <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                      Deseja realmente encerrar as férias de <strong>{employee.name}</strong>? O colaborador voltará imediatamente ao status <strong>"Ativo"</strong> na escala da fábrica.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfirmEnd(false)}
                    disabled={isSaving}
                    className="px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-emerald-200"
                  >
                    Não, Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteEndVacation}
                    disabled={isSaving}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <Check size={13} />
                    )}
                    <span>Sim, Encerrar Férias</span>
                  </button>
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              {!showConfirmEnd && (
                <button
                  type="button"
                  onClick={() => setShowConfirmEnd(true)}
                  disabled={isSaving || !canManage}
                  className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Encerrar as férias e colocar o colaborador como Ativo novamente"
                >
                  <Check size={14} className="text-emerald-600" />
                  Encerrar Férias (Reativar)
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !canManage}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Salvar Nova Data
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VacationReturnModal;
