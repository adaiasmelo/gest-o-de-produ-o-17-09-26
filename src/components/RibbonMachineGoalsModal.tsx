import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, X, Check, Activity, Layers, Info, Sparkles } from 'lucide-react';
import { 
  getRibbonMachineGoal, 
  getRibbonTotalGoal, 
  calcJumboUnits, 
  formatJumboUnits,
  JUMBO_AVG_M2 
} from '../utils/ribbonGoalsUtils';
import { doc, setDoc } from 'firebase/firestore';

interface RibbonMachineGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardMonth: string;
  ribbonGoals: Record<string, any>;
  onSaveGoals?: (month: string, goals: { ghezzi: number; lintech: number; wultec: number; gehl?: number; lintec?: number; ultech?: number; ghezze?: number; lintech_legacy?: number; wutec?: number }) => void;
  setRibbonGoals?: React.Dispatch<React.SetStateAction<any>>;
  db?: any;
  canEdit?: boolean;
}

export const RibbonMachineGoalsModal: React.FC<RibbonMachineGoalsModalProps> = ({
  isOpen,
  onClose,
  dashboardMonth,
  ribbonGoals,
  onSaveGoals,
  setRibbonGoals,
  db,
  canEdit = true
}) => {
  const [selectedMonth, setSelectedMonth] = useState(dashboardMonth || new Date().toISOString().slice(0, 7));
  const [ghezziGoal, setGhezziGoal] = useState<number>(333333);
  const [lintechGoal, setLintechGoal] = useState<number>(333333);
  const [wultecGoal, setWultecGoal] = useState<number>(333334);

  useEffect(() => {
    if (isOpen) {
      const month = dashboardMonth || new Date().toISOString().slice(0, 7);
      setSelectedMonth(month);
      setGhezziGoal(getRibbonMachineGoal(ribbonGoals, month, 'ghezzi'));
      setLintechGoal(getRibbonMachineGoal(ribbonGoals, month, 'lintech'));
      setWultecGoal(getRibbonMachineGoal(ribbonGoals, month, 'wultec'));
    }
  }, [isOpen, dashboardMonth, ribbonGoals]);

  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    setGhezziGoal(getRibbonMachineGoal(ribbonGoals, newMonth, 'ghezzi'));
    setLintechGoal(getRibbonMachineGoal(ribbonGoals, newMonth, 'lintech'));
    setWultecGoal(getRibbonMachineGoal(ribbonGoals, newMonth, 'wultec'));
  };

  const totalGoal = (Number(ghezziGoal) || 0) + (Number(lintechGoal) || 0) + (Number(wultecGoal) || 0);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const gVal = Math.max(0, Number(ghezziGoal) || 0);
    const lVal = Math.max(0, Number(lintechGoal) || 0);
    const wVal = Math.max(0, Number(wultecGoal) || 0);

    const goalsToSave = {
      ghezzi: gVal,
      lintech: lVal,
      wultec: wVal,
      // retrocompatibilidade para leituras legadas:
      gehl: gVal,
      lintec: lVal,
      ultech: wVal,
      ghezze: gVal,
      wutec: wVal
    };

    if (typeof onSaveGoals === 'function') {
      onSaveGoals(selectedMonth, goalsToSave);
    } else if (setRibbonGoals) {
      setRibbonGoals((prev: any) => {
        const updated = { ...prev, [selectedMonth]: goalsToSave };
        try {
          localStorage.setItem('manupackaging_ribbon_goals', JSON.stringify(updated));
          if (db) {
            setDoc(doc(db, 'settings', 'global'), { ribbonGoals: updated }, { merge: true }).catch(err => {
              console.error("Erro ao salvar metas no Firestore:", err);
            });
          }
        } catch (err) {
          console.error("Erro ao salvar metas:", err);
        }
        return updated;
      });
    }
    onClose();
  };

  const formatMonthName = (mStr: string) => {
    if (!mStr || !mStr.includes('-')) return mStr;
    const [y, m] = mStr.split('-');
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${months[parseInt(m, 10) - 1] || m} de ${y}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative bg-white border border-slate-200 shadow-2xl rounded-[2rem] w-full max-w-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-6 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                  <Target size={22} className="text-sky-300" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-tight">
                    Metas Individuais por Máquina
                  </h3>
                  <p className="text-xs text-blue-100 font-medium">
                    Setor de Corte de Fita: Ghezzi, Lintech e Wultec
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mês Selecionado */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-sky-200">Mês de Referência:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="bg-white/15 border border-white/20 rounded-xl px-3 py-1.5 text-xs font-black text-white focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer [color-scheme:dark]"
                />
              </div>
              <span className="text-xs font-bold text-sky-100 uppercase tracking-wider">
                {formatMonthName(selectedMonth)}
              </span>
            </div>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSave} className="p-6 space-y-6">
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-blue-800">
              <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Defina a meta mensal em <strong>metros quadrados (m²)</strong> para cada máquina individualmente: <strong>Ghezzi</strong>, <strong>Lintech</strong> e <strong>Wultec</strong>. 
                O sistema calculará automaticamente o atingimento de cada máquina e o total geral consolidado.
              </p>
            </div>

            {/* 3 Machine Input Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Ghezzi */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-blue-300 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      Ghezzi
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  </div>
                </div>

                <div className="space-y-2 mt-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">
                    Meta Individual (m²)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={ghezziGoal}
                      onChange={(e) => setGhezziGoal(Number(e.target.value))}
                      disabled={!canEdit}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right pr-9"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">
                      m²
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium text-right pt-0.5">
                    ≈ <strong className="text-indigo-600">{formatJumboUnits(calcJumboUnits(ghezziGoal))}</strong>
                  </div>
                </div>
              </div>

              {/* Lintech */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-blue-300 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      Lintech
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  </div>
                </div>

                <div className="space-y-2 mt-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">
                    Meta Individual (m²)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={lintechGoal}
                      onChange={(e) => setLintechGoal(Number(e.target.value))}
                      disabled={!canEdit}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right pr-9"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">
                      m²
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium text-right pt-0.5">
                    ≈ <strong className="text-indigo-600">{formatJumboUnits(calcJumboUnits(lintechGoal))}</strong>
                  </div>
                </div>
              </div>

              {/* Wultec */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between hover:border-blue-300 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      Wultec
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                  </div>
                </div>

                <div className="space-y-2 mt-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 block">
                    Meta Individual (m²)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1000"
                      min="0"
                      value={wultecGoal}
                      onChange={(e) => setWultecGoal(Number(e.target.value))}
                      disabled={!canEdit}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right pr-9"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">
                      m²
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium text-right pt-0.5">
                    ≈ <strong className="text-indigo-600">{formatJumboUnits(calcJumboUnits(wultecGoal))}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Consolidado */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/15">
                  <Activity size={20} className="text-sky-300" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-sky-200 block">
                    Meta Total Consolidada (Soma das 3 Máquinas)
                  </span>
                  <p className="text-xs text-slate-300">
                    Base média de cálculo: 8.020 m de comprimento por jumbo (~10.266 m²)
                  </p>
                </div>
              </div>

              <div className="text-right sm:text-right w-full sm:w-auto">
                <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {totalGoal.toLocaleString('pt-BR')} <span className="text-sm font-bold text-sky-300">m²</span>
                </div>
                <div className="text-xs font-bold text-slate-300">
                  ≈ {formatJumboUnits(calcJumboUnits(totalGoal))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-slate-200 text-slate-600 text-xs font-bold uppercase rounded-xl transition-all hover:bg-slate-50 cursor-pointer"
              >
                Cancelar
              </button>

              {canEdit && (
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Check size={16} />
                  Salvar Metas Individuais
                </button>
              )}
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
