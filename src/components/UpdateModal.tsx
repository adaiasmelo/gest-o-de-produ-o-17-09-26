import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Zap, X, Cpu, Sparkles, CheckCircle2 } from 'lucide-react';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  updateNotes?: string;
}

const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, onClose, onUpdate, updateNotes }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          {/* Backdrop blurring the user interface */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Dialog Card in high-fidelity dark enterprise mode */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            className="bg-slate-900 border border-slate-800 rounded-[2.5rem] w-full max-w-md shadow-2xl shadow-blue-500/10 relative overflow-hidden p-8 font-sans text-white"
          >
            {/* Background Decorative Radial Glows */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
              <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-500/30 blur-[80px] rounded-full" />
              <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-emerald-500/20 blur-[80px] rounded-full" />
            </div>

            {/* Absolute close button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all z-10"
              title="Lembrar mais tarde"
            >
              <X size={20} />
            </button>

            {/* Icon Container with glowing double rings */}
            <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <div className="absolute inset-0 bg-blue-500/10 rounded-[2rem] border border-blue-500/30 animate-pulse" />
              <div className="absolute inset-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <RefreshCw size={36} className="text-white animate-spin-slow" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-1.5 rounded-xl border-2 border-slate-900 shadow-lg">
                <Zap size={14} className="fill-slate-950" />
              </div>
            </div>

            {/* Header / Badging */}
            <div className="text-center space-y-2 mb-6">
              <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase text-blue-400 tracking-widest leading-none">
                <Sparkles size={10} /> MANUPACKAGING ENTERPRISE HUB
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-tight">
                Nova Versão Disponível
              </h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                Gestão &amp; Controle de Produção
              </p>
            </div>

            {/* Features list */}
            <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-5 mb-8 space-y-3.5 text-xs">
              <p className="text-slate-300 font-medium text-center pb-2 border-b border-white/5 leading-relaxed">
                {updateNotes || 'Uma nova alteração/versão do sistema foi disponibilizada para o seu dispositivo. Clique abaixo para atualizar e carregar os dados mais recentes.'}
              </p>
              
              <div className="flex gap-3">
                <div className="mt-0.5 text-blue-400 shrink-0"><Cpu size={14} /></div>
                <div>
                  <h4 className="font-extrabold text-slate-200">Sincronização em Tempo Real</h4>
                  <p className="text-slate-400 font-medium text-[11px] leading-relaxed">Atualização instantânea em computadores e dispositivos móveis.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-0.5 text-emerald-400 shrink-0"><CheckCircle2 size={14} /></div>
                <div>
                  <h4 className="font-extrabold text-slate-200">Consistência Operacional</h4>
                  <p className="text-slate-300 font-medium text-[11px] leading-relaxed">Garantia que todos os turnos e relatórios estejam perfeitamente alinhados.</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onClose}
                className="flex-1 order-2 sm:order-1 py-4 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 border border-slate-700/50"
              >
                Depois
              </button>
              <button
                onClick={onUpdate}
                className="flex-[1.5] order-1 sm:order-2 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/25 active:scale-95 flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} className="animate-spin-slow" />
                Atualizar Agora
              </button>
            </div>
            
            {/* Fine print */}
            <div className="text-[9px] font-bold text-center text-slate-500 uppercase tracking-widest mt-6">
              © MANUPACKAGING LTDA • 2026
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UpdateModal;
