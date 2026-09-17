import React from 'react';
import { Trash2, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger'
}) => {
  if (!isOpen) return null;

  const iconMap = {
    danger: <Trash2 size={32} className="text-red-600" />,
    warning: <AlertTriangle size={32} className="text-orange-600" />,
    info: <AlertCircle size={32} className="text-blue-600" />
  };

  const colorMap = {
    danger: 'bg-red-50 text-red-600 border-red-100 font-black',
    warning: 'bg-orange-50 text-orange-600 border-orange-100 font-black',
    info: 'bg-blue-50 text-blue-600 border-blue-100 font-black'
  };

  const btnMap = {
    danger: 'bg-red-600 hover:bg-red-700 shadow-red-200',
    warning: 'bg-orange-500 hover:bg-orange-600 shadow-orange-200',
    info: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl relative overflow-hidden border border-slate-200 p-8 text-center"
          >
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              <X size={20} />
            </button>

            <div className={`w-20 h-20 mx-auto rounded-3xl mb-6 flex items-center justify-center ${colorMap[type].split(' ')[0]} border border-slate-100 shadow-inner`}>
              {iconMap[type]}
            </div>

            <div className="space-y-3 mb-8">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-tight">
                {title}
              </h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed px-2">
                {message}
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-95"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={`flex-1 py-4 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${btnMap[type]}`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog;
