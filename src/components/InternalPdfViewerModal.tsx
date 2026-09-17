import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  X, 
  Download, 
  ShieldCheck, 
  Lock, 
  Maximize2, 
  Minimize2, 
  ExternalLink,
  Eye,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InternalPdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc?: any;
  blob?: Blob | null;
  filename?: string;
  title?: string;
  isReadOnly?: boolean;
  onDownload?: () => void;
}

export const InternalPdfViewerModal: React.FC<InternalPdfViewerModalProps> = ({
  isOpen,
  onClose,
  doc,
  blob: propBlob,
  filename = 'documento.pdf',
  title = 'Visualização de Documento',
  isReadOnly = false,
  onDownload
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [blockedShortcutNotice, setBlockedShortcutNotice] = useState<string | null>(null);

  // Generate Blob URL safely
  useEffect(() => {
    if (!isOpen) {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      setIsLoading(true);
      return;
    }

    setIsLoading(true);
    try {
      let targetBlob: Blob | null = null;
      if (doc && typeof doc.output === 'function') {
        targetBlob = doc.output('blob');
      } else if (doc instanceof Blob) {
        targetBlob = doc;
      } else if (propBlob) {
        targetBlob = propBlob;
      }

      if (targetBlob) {
        const url = URL.createObjectURL(targetBlob);
        setPdfUrl(url);
        setIsLoading(false);

        return () => {
          URL.revokeObjectURL(url);
        };
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Erro ao gerar blob do PDF para visualizador interno:', err);
      setIsLoading(false);
    }
  }, [isOpen, doc, propBlob]);

  // Intercept keyboard shortcuts to prevent downloading/printing in Read Only mode
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (isReadOnly) {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (isCtrlOrCmd && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        setBlockedShortcutNotice('O download/salvamento de arquivos está bloqueado no Modo de Leitura.');
        setTimeout(() => setBlockedShortcutNotice(null), 3500);
      }
      if (isCtrlOrCmd && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        e.stopPropagation();
        setBlockedShortcutNotice('A impressão de arquivos está bloqueada no Modo de Leitura.');
        setTimeout(() => setBlockedShortcutNotice(null), 3500);
      }
    }
  }, [isOpen, isReadOnly, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleKeyDown]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[1100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md select-none"
        onContextMenu={(e) => {
          if (isReadOnly) {
            e.preventDefault();
          }
        }}
      >
        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className={`bg-slate-900 border border-slate-700/80 rounded-2xl md:rounded-3xl shadow-2xl flex flex-col w-full transition-all duration-300 overflow-hidden ${
            isFullscreen 
              ? 'fixed inset-2 z-50 h-[calc(100vh-16px)] max-w-none' 
              : 'max-w-[96vw] 2xl:max-w-[1500px] h-[92vh] max-h-[92vh]'
          }`}
        >
          {/* Header Bar */}
          <div className="bg-slate-800/90 border-b border-slate-700/80 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Left: Document Info & Security Badge */}
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                isReadOnly 
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' 
                  : 'bg-blue-600/20 text-blue-400 border-blue-500/30'
              }`}>
                {isReadOnly ? <Lock className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight truncate max-w-[280px] sm:max-w-[450px]">
                    {title}
                  </h3>
                  {isReadOnly ? (
                    <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase rounded-full tracking-wider flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-400" />
                      Visualização Protegida • Download Bloqueado
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-black uppercase rounded-full tracking-wider flex items-center gap-1">
                      <Eye className="w-3 h-3 text-blue-400" />
                      Visualizador do Sistema
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-semibold truncate mt-0.5 flex items-center gap-2">
                  <span>{filename}</span>
                  <span className="text-slate-600">•</span>
                  <span>Visualização Interna</span>
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* If not read-only, allow downloading or opening */}
              {!isReadOnly && onDownload && (
                <button
                  onClick={onDownload}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                  title="Baixar Arquivo PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Baixar PDF</span>
                </button>
              )}

              {!isReadOnly && pdfUrl && (
                <button
                  onClick={() => window.open(pdfUrl, '_blank')}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  title="Abrir em Nova Aba"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Nova Aba</span>
                </button>
              )}

              {/* Read Only Indicator Badge */}
              {isReadOnly && (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-950/60 text-slate-400 border border-slate-700/60 rounded-xl text-[11px] font-bold">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Modo Leitura Ativo</span>
                </div>
              )}

              {/* Fullscreen Toggle */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 hover:bg-slate-700/80 text-slate-400 hover:text-white rounded-xl transition-all active:scale-95 cursor-pointer"
                title={isFullscreen ? 'Restaurar Tamanho' : 'Tela Cheia'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-xl transition-all active:scale-95 cursor-pointer"
                title="Fechar Visualizador"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Read Only Security Notice Banner */}
          {isReadOnly && (
            <div className="bg-amber-950/40 border-b border-amber-600/30 px-4 py-2 flex items-center justify-between gap-3 text-amber-300 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong>Atenção:</strong> Você está no <strong>Modo de Leitura</strong>. A visualização é realizada exclusivamente dentro do sistema. O download, impressão e exportação do arquivo estão bloqueados.
                </span>
              </div>
              <span className="hidden md:inline-block px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase rounded tracking-wider border border-amber-500/30">
                Sem Permissão de Download
              </span>
            </div>
          )}

          {/* Floating alert for blocked shortcut */}
          {blockedShortcutNotice && (
            <div className="bg-red-500 text-white px-4 py-2 text-xs font-black uppercase tracking-wider text-center flex items-center justify-center gap-2 shadow-md animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4" />
              <span>{blockedShortcutNotice}</span>
            </div>
          )}

          {/* PDF Viewer Body */}
          <div className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col items-center justify-center">
            {isLoading ? (
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-bold uppercase tracking-wider">Carregando visualização do documento...</span>
              </div>
            ) : pdfUrl ? (
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                className="w-full h-full border-0 bg-slate-900"
                title={title}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-slate-400 p-8 text-center max-w-md">
                <AlertCircle className="w-12 h-12 text-slate-600" />
                <h4 className="text-base font-bold text-slate-300">Não foi possível carregar a prévia do documento</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  O arquivo PDF não pôde ser renderizado para visualização interna.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default InternalPdfViewerModal;
