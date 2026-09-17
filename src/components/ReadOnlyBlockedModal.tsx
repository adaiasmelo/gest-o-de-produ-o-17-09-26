import React from 'react';
import { ShieldAlert, X, Eye, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ReadOnlyBlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionTitle?: string;
  message?: string;
}

export const ReadOnlyBlockedModal: React.FC<ReadOnlyBlockedModalProps> = ({
  isOpen,
  onClose,
  actionTitle = 'Ação Não Autorizada',
  message
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        />
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 16 }}
          className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl relative overflow-hidden border border-slate-200/80 p-6 sm:p-8 text-center z-10"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X size={20} />
          </button>

          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl mb-5 flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-200/70 shadow-inner">
            <ShieldAlert size={34} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider mb-3">
            <Lock size={12} />
            Modo de Leitura Ativo
          </div>

          <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight leading-snug">
            {actionTitle}
          </h3>

          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed mt-3 px-2">
            {message || 'Esta funcionalidade não está disponível no Modo de Leitura. Seu acesso é exclusivo para visualização das informações do sistema.'}
          </p>

          <div className="mt-4 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-left flex items-start gap-3">
            <Eye size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-500 font-medium leading-snug">
              Você pode navegar, consultar e visualizar relatórios e gráficos normalmente, porém operações de download, compartilhamento, exclusão ou gravação no banco de dados estão restritas.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full mt-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer"
          >
            Entendido
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ReadOnlyBlockedModal;
