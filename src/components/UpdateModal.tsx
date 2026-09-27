import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RefreshCw, 
  Zap, 
  X, 
  Cpu, 
  Sparkles, 
  CheckCircle2, 
  CloudDownload, 
  Layers, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  updateNotes?: string;
  versionTag?: string;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ 
  isOpen, 
  onClose, 
  onUpdate, 
  updateNotes,
  versionTag
}) => {
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const updateTriggeredRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      setProgress(0);
      setIsCompleted(false);
      updateTriggeredRef.current = false;
      return;
    }

    updateTriggeredRef.current = false;
    setProgress(0);
    setIsCompleted(false);

    // Duração total do carregamento automático (1.2 segundos para atualização ágil e sem atrito)
    const durationMs = 1200;
    const intervalMs = 30;
    const stepIncrement = 100 / (durationMs / intervalMs);

    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + stepIncrement;
        if (next >= 100) {
          clearInterval(timer);
          setIsCompleted(true);
          return 100;
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isOpen]);

  // Quando o progresso atinge 100%, recarrega automaticamente
  useEffect(() => {
    if (isCompleted && isOpen && !updateTriggeredRef.current) {
      updateTriggeredRef.current = true;
      const timeout = setTimeout(() => {
        onUpdate();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [isCompleted, isOpen, onUpdate]);

  if (!isOpen) return null;

  // Texto descritivo da etapa atual do carregamento
  const getStepStatus = (val: number) => {
    if (val < 22) return 'Detectando nova compilação no Cloudflare...';
    if (val < 50) return 'Baixando novas telas e dados atualizados do Git...';
    if (val < 78) return 'Atualizando Service Worker e renovando cache offline...';
    if (val < 100) return 'Finalizando instalação dos novos módulos no dispositivo...';
    return 'Atualização concluída com sucesso! Recarregando sistema...';
  };

  const roundedPercent = Math.min(100, Math.floor(progress));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 select-none">
          {/* Fundo escuro com desfoque de alta fidelidade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
          />

          {/* Cartão principal do alerta com bordas suaves e detalhes tecnológicos */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 25 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 25 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="bg-slate-900 border border-blue-500/30 rounded-[2.5rem] w-full max-w-lg shadow-2xl shadow-blue-500/20 relative overflow-hidden p-6 sm:p-8 font-sans text-white z-10"
          >
            {/* Efeitos visuais de iluminação no fundo */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30">
              <div className="absolute -top-12 -left-12 w-64 h-64 bg-blue-600/40 blur-[90px] rounded-full" />
              <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-emerald-500/30 blur-[90px] rounded-full" />
            </div>

            {/* Botão de Fechar / Pausar */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer z-20"
              title="Pausar e lembrar depois"
            >
              <X size={20} />
            </button>

            {/* Ícone Animado Central */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-5 flex items-center justify-center">
              <div className="absolute inset-0 bg-blue-500/15 rounded-3xl border border-blue-400/40 animate-pulse" />
              <div className="absolute inset-2 bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                {isCompleted ? (
                  <CheckCircle2 size={38} className="text-white animate-bounce" />
                ) : (
                  <CloudDownload size={38} className="text-white animate-pulse" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 p-1.5 rounded-xl border-2 border-slate-900 shadow-md">
                <Zap size={13} className="fill-slate-950" />
              </div>
            </div>

            {/* Cabeçalho */}
            <div className="text-center space-y-2 mb-6">
              <div className="inline-flex items-center gap-1.5 bg-blue-500/15 border border-blue-400/30 px-3 py-1 rounded-full text-[10px] font-black uppercase text-blue-300 tracking-widest leading-none">
                <Sparkles size={11} className="text-amber-400" />
                CLOUDFLARE • NOVA ATUALIZAÇÃO AUTOMÁTICA
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight leading-tight">
                {isCompleted ? 'Atualização Concluída!' : 'Carregando Nova Versão'}
              </h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                {versionTag ? `Versão ${versionTag}` : 'Gestão & Controle de Produção'}
              </p>
            </div>

            {/* Seção da Barra de Carregamento Automática */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-5 mb-6 space-y-3.5">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <RefreshCw size={13} className={`text-blue-400 ${!isCompleted ? 'animate-spin' : ''}`} />
                  Progresso do Carregamento
                </span>
                <span className="font-mono text-emerald-400 text-sm font-black">
                  {roundedPercent}%
                </span>
              </div>

              {/* Trilho da Barra de Progresso */}
              <div className="w-full h-3.5 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-slate-700/60 shadow-inner relative">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 shadow-md transition-all duration-75 relative overflow-hidden"
                  style={{ width: `${progress}%` }}
                >
                  {/* Brilho animado passando pela barra */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                </motion.div>
              </div>

              {/* Status dinâmico da etapa */}
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span className="truncate pr-2 text-slate-300">
                  {getStepStatus(progress)}
                </span>
                <span className="text-blue-400 shrink-0 font-mono">
                  {isCompleted ? 'REINICIANDO...' : 'CARREGANDO...'}
                </span>
              </div>
            </div>

            {/* Notas / Mensagem informativa */}
            <div className="bg-blue-950/30 border border-blue-500/20 rounded-2xl p-3.5 mb-6 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-blue-400 shrink-0 mt-0.5" />
              <p className="text-[11px] font-medium text-slate-300">
                {updateNotes || 'As alterações enviadas pelo Git para o Cloudflare estão sendo sincronizadas automaticamente neste aplicativo. O sistema reiniciará sozinho assim que a barra atingir 100%.'}
              </p>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border border-slate-700/70 cursor-pointer active:scale-95"
              >
                Pausar (Mais Tarde)
              </button>
              <button
                type="button"
                onClick={() => {
                  setProgress(100);
                  setIsCompleted(true);
                  onUpdate();
                }}
                className="flex-[1.4] py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/30 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Atualizar Agora</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Rodapé institucional */}
            <div className="text-[9px] font-bold text-center text-slate-500 uppercase tracking-widest mt-5">
              © MANUPACKAGING LTDA • SISTEMA DE GESTÃO INDUSTRIAL
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default UpdateModal;
