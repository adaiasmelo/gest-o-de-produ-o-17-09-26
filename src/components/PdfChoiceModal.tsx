import React from 'react';
import { FileText, Download, Eye, X, Lock, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PdfChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onView: () => void;
  onDownload: () => void;
  title: string;
  isReadOnly?: boolean;
  onBlockedDownload?: () => void;
}

const PdfChoiceModal: React.FC<PdfChoiceModalProps> = ({
  isOpen,
  onClose,
  onView,
  onDownload,
  title,
  isReadOnly = false,
  onBlockedDownload
}) => {
  if (!isOpen) return null;

  const handleDownloadClick = () => {
    if (isReadOnly) {
      if (onBlockedDownload) {
        onBlockedDownload();
      }
      // In read-only mode, clicking download opens internal viewing inside the system as requested
      onView();
      onClose();
      return;
    }
    onDownload();
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
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
          className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl relative overflow-hidden border border-slate-200 p-7 text-center"
        >
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X size={20} />
          </button>

          <div className={`w-18 h-18 mx-auto rounded-3xl mb-5 flex items-center justify-center border shadow-inner ${
            isReadOnly 
              ? 'bg-amber-50 text-amber-600 border-amber-200' 
              : 'bg-blue-50 text-blue-600 border-blue-100'
          }`}>
            {isReadOnly ? <Lock size={32} /> : <FileText size={32} />}
          </div>

          <div className="space-y-2.5 mb-6">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-tight">
              PDF Gerado com Sucesso
            </h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider leading-relaxed px-2 italic line-clamp-2">
              {title}
            </p>

            {isReadOnly ? (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl text-left">
                <div className="flex items-center gap-2 text-amber-800 text-xs font-black uppercase">
                  <ShieldCheck size={16} className="text-amber-600 shrink-0" />
                  <span>Modo de Leitura Ativo</span>
                </div>
                <p className="text-[11px] text-amber-700 font-medium leading-relaxed mt-1">
                  O download de arquivos está restrito. A visualização deste documento será realizada <strong>dentro do próprio sistema</strong> de forma protegida.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-medium leading-relaxed px-2 mt-1">
                Como você deseja prosseguir com o documento?
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            {/* View inside app */}
            <button
              onClick={() => {
                onView();
                onClose();
              }}
              className={`w-full py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                isReadOnly 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200' 
                  : 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
              }`}
            >
              <Eye size={16} />
              <span>{isReadOnly ? 'Visualizar no Sistema' : 'Visualizar PDF'}</span>
            </button>

            {/* Download button */}
            {isReadOnly ? (
              <button
                type="button"
                onClick={handleDownloadClick}
                className="w-full py-3 bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-800 border border-slate-200 hover:border-amber-300 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer group"
                title="Download bloqueado no modo de leitura (abrirá visualização no sistema)"
              >
                <Lock size={15} className="text-amber-500 group-hover:scale-110 transition-transform" />
                <div className="flex flex-col text-left">
                  <span>Baixar Arquivo</span>
                  <span className="text-[9px] text-amber-600 font-bold normal-case">Bloqueado • Abrir no Sistema</span>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDownloadClick}
                className="w-full py-3.5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 hover:bg-blue-700 shadow-blue-200 cursor-pointer"
              >
                <Download size={16} />
                <span>Baixar Arquivo</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PdfChoiceModal;
