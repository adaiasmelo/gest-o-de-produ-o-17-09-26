import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Clock,
  Calculator,
  Search,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Tv,
  Layers,
  History
} from 'lucide-react';

export interface FloatingQuickDockProps {
  onOpenProductionModal: () => void;
  onNavigateOvertime: () => void;
  onOpenCast1Calculator: () => void;
  onOpenCommandPalette: () => void;
  onOpenAuditTrail?: () => void;
  isOnline: boolean;
  isSyncing?: boolean;
}

export const FloatingQuickDock: React.FC<FloatingQuickDockProps> = ({
  onOpenProductionModal,
  onNavigateOvertime,
  onOpenCast1Calculator,
  onOpenCommandPalette,
  onOpenAuditTrail,
  isOnline,
  isSyncing = false
}) => {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 280) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 no-print select-none max-w-[95vw]">
      <AnimatePresence mode="wait">
        {isCollapsed ? (
          <motion.button
            key="collapsed"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900/90 hover:bg-slate-900 text-white rounded-full border border-slate-700/80 shadow-2xl backdrop-blur-md text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 group"
            title="Expandir Dock de Ações Rápidas"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-black">Ações Rápidas</span>
            <ChevronUp size={14} className="text-slate-400 group-hover:text-white transition-colors" />
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-slate-900/92 hover:bg-slate-900/96 text-white border border-slate-700/80 shadow-2xl rounded-2xl md:rounded-full p-1.5 sm:p-2 backdrop-blur-md flex items-center gap-1 sm:gap-2 text-xs transition-colors"
          >
            {/* Botão + Lançamento */}
            <button
              type="button"
              onClick={onOpenProductionModal}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl md:rounded-full font-black text-[11px] uppercase tracking-wide transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
              title="Novo Apontamento de Produção"
            >
              <Plus size={14} className="stroke-[3]" />
              <span className="hidden sm:inline">Lançar</span>
              <span className="sm:hidden">+ Bobina</span>
            </button>

            {/* Botão DOC 076 / Hora Extra */}
            <button
              type="button"
              onClick={onNavigateOvertime}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-slate-800/90 hover:bg-amber-600 hover:text-white text-slate-200 rounded-xl md:rounded-full font-black text-[11px] uppercase tracking-wide transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              title="Solicitação de Horas Extras (DOC 076 - Fechamento dia 24)"
            >
              <Clock size={14} className="text-amber-400" />
              <span className="hidden md:inline">DOC 076</span>
              <span className="md:hidden text-[10px]">Hora Extra</span>
            </button>

            {/* Botão Calculadora CAST 1 */}
            <button
              type="button"
              onClick={onOpenCast1Calculator}
              className="hidden lg:flex items-center gap-1.5 px-3 py-2 bg-slate-800/90 hover:bg-purple-600 hover:text-white text-slate-200 rounded-full font-black text-[11px] uppercase tracking-wide transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              title="Abrir Calculadora de Bobinas CAST 1"
            >
              <Calculator size={14} className="text-purple-400" />
              <span>Calc CAST 1</span>
            </button>

            {/* Botão Trilha de Auditoria ISO */}
            {onOpenAuditTrail && (
              <button
                type="button"
                onClick={onOpenAuditTrail}
                className="hidden md:flex items-center gap-1.5 px-3 py-2 bg-slate-800/90 hover:bg-emerald-600 hover:text-white text-slate-200 rounded-full font-black text-[11px] uppercase tracking-wide transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                title="Trilha de Auditoria & ISO 9001 (Quem Alterou o Quê)"
              >
                <History size={14} className="text-emerald-400" />
                <span>Auditoria</span>
              </button>
            )}

            {/* Separador vertical sutil */}
            <div className="w-[1px] h-5 bg-slate-700/80 mx-0.5 sm:mx-1 shrink-0" />

            {/* Botão Atalho Command Palette */}
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-2 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl md:rounded-full font-bold text-[11px] transition-all cursor-pointer"
              title="Buscar (Ctrl + K)"
            >
              <Search size={14} className="text-blue-400" />
              <kbd className="hidden sm:inline-block px-1 py-0.5 text-[9px] font-black bg-slate-800 border border-slate-700 rounded text-slate-300">
                Ctrl+K
              </kbd>
            </button>

            {/* Indicador de Conexão / Sincronização */}
            <div
              className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-slate-400 shrink-0"
              title={
                !isOnline
                  ? 'Modo Offline (Cache local ativo)'
                  : isSyncing
                  ? 'Sincronizando com Firestore...'
                  : 'Sistema Online e Sincronizado'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  !isOnline
                    ? 'bg-red-400'
                    : isSyncing
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <span className="hidden xl:inline text-[9px] uppercase tracking-widest text-slate-400">
                {!isOnline ? 'Offline' : isSyncing ? 'Sincronizando' : 'Ativo'}
              </span>
            </div>

            {/* Botão Rolar ao Topo (Scroll to Top) */}
            <AnimatePresence>
              {showScrollTop && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  type="button"
                  onClick={scrollToTop}
                  className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition-all shadow-md active:scale-90 cursor-pointer ml-0.5 shrink-0"
                  title="Voltar suavemente ao topo da página"
                >
                  <ArrowUp size={14} className="stroke-[3]" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Botão Minimizar Dock */}
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Recolher barra flutuante"
            >
              <ChevronDown size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
