import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, 
  Cpu, 
  Zap, 
  CheckCircle2, 
  ChevronRight, 
  ArrowRight,
  Share,
  Smartphone,
  ExternalLink,
  X,
  Gauge,
  Layers,
  Sparkles
} from 'lucide-react';

interface CalculatorInstallExperienceProps {
  onComplete: () => Promise<void> | void;
  onClose?: () => void;
  deferredPrompt?: any;
  isIOS?: boolean;
}

const CalculatorInstallExperience: React.FC<CalculatorInstallExperienceProps> = ({ 
  onComplete, 
  onClose,
  deferredPrompt,
  isIOS: propIsIOS
}) => {
  const [step, setStep] = useState<'intro' | 'installing' | 'complete'>('intro');
  const [progress, setProgress] = useState(0);
  const [currentInfo, setCurrentInfo] = useState(0);

  const isIOS = propIsIOS ?? (typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);
  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const installationTips = [
    { title: "Configurando Motor de Formulação CAST 1", desc: "Otimizando proporções das extrusoras A, B, C e D...", icon: Layers },
    { title: "Sincronizando Parâmetros de Produção", desc: "Ajustando gramatura, velocidade e micrômetros...", icon: Gauge },
    { title: "Ativando Módulos de Cálculo em Tempo Real", desc: "Garantindo respostas instantâneas em chão de fábrica...", icon: Cpu },
    { title: "Otimizando Cache Local e Offline", desc: "Garantindo funcionamento 100% sem internet na linha...", icon: Zap },
    { title: "Preparando Instalação PWA Nativa", desc: "Integrando atalho rápido na tela de início do seu dispositivo...", icon: Sparkles }
  ];

  useEffect(() => {
    if (step === 'installing') {
      const timer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(timer);
            setTimeout(() => setStep('complete'), 800);
            return 100;
          }
          return prev + 1;
        });
      }, 90); // ~9 segundos de experiência dinâmica

      const infoTimer = setInterval(() => {
        setCurrentInfo(prev => (prev + 1) % installationTips.length);
      }, 1800);

      return () => {
        clearInterval(timer);
        clearInterval(infoTimer);
      };
    }
  }, [step]);

  return (
    <div className="fixed inset-0 z-[300] bg-slate-950 flex items-center justify-center overflow-hidden font-sans select-none">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-blue-600/25 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-amber-500/20 blur-[120px] rounded-full" />
      </div>

      {/* Botão de Fechar */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-all cursor-pointer shadow-lg"
          title="Fechar"
        >
          <X size={18} />
        </button>
      )}

      <AnimatePresence mode="wait">
        {step === 'intro' && (
          <motion.div 
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 w-full max-w-2xl px-6 text-center"
          >
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-500/25 rotate-3 border border-blue-400/30">
                <Calculator size={46} className="text-white" />
              </div>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter mb-4 leading-[1.05]">
              PREPARANDO SETUP LOCAL <br/>
              <span className="text-yellow-400 italic">CALCULADORA CAST 1</span>
            </h1>
            
            <p className="text-slate-400 text-base md:text-lg font-medium max-w-lg mx-auto mb-10 leading-relaxed">
              O sistema irá configurar os módulos de formulação da CAST 1 e preparar a instalação nativa no seu celular ou computador.
            </p>

            <button 
              onClick={() => setStep('installing')}
              className="group relative inline-flex items-center gap-4 bg-white text-slate-950 px-9 py-5 rounded-3xl font-black uppercase tracking-widest text-sm hover:bg-yellow-400 hover:text-slate-950 transition-all duration-300 shadow-2xl shadow-white/5 active:scale-95 cursor-pointer"
            >
              Iniciar Instalação 
              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-950 group-hover:bg-slate-950 group-hover:text-white transition-colors">
                <ArrowRight size={18} />
              </div>
            </button>

            <div className="mt-10 flex flex-wrap justify-center items-center gap-4 md:gap-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <span>Cálculo CAST 1</span>
              <span className="w-1.5 h-1.5 bg-slate-800 rounded-full" />
              <span>Offline Ready</span>
              <span className="w-1.5 h-1.5 bg-slate-800 rounded-full" />
              <span>PWA Nativo</span>
            </div>
          </motion.div>
        )}

        {step === 'installing' && (
          <motion.div 
            key="installing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 w-full max-w-xl px-10 text-center"
          >
            <div className="mb-14">
              <div className="w-16 h-16 bg-yellow-400/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-yellow-400 border border-yellow-400/20">
                <Cpu className="animate-pulse" size={32} />
              </div>
              <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-2">Instalando Módulos</h2>
              <p className="text-slate-500 font-bold text-xs">Aguarde enquanto preparamos a Calculadora CAST 1 no seu dispositivo.</p>
            </div>

            {/* Main Progress Bar */}
            <div className="relative mb-16">
              <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 p-1">
                <motion.div 
                  className="h-full bg-gradient-to-r from-blue-600 via-yellow-400 to-emerald-400 rounded-full shadow-[0_0_20px_rgba(250,204,21,0.35)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "linear" }}
                />
              </div>
              <div className="absolute -top-10 right-0">
                <span className="text-4xl font-black text-white/15 italic"># {progress}%</span>
              </div>
            </div>

            {/* Floating Info */}
            <div className="h-24">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentInfo}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="flex items-center gap-3 text-yellow-400">
                    {React.createElement(installationTips[currentInfo].icon, { size: 18 })}
                    <span className="text-xs font-black uppercase tracking-widest">{installationTips[currentInfo].title}</span>
                  </div>
                  <p className="text-slate-400 text-sm font-medium">{installationTips[currentInfo].desc}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {step === 'complete' && (
          <motion.div 
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-lg px-8 text-center"
          >
            <motion.div 
              initial={{ rotate: -45, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/25"
            >
              <CheckCircle2 size={42} className="text-white" />
            </motion.div>

            <h2 className="text-3xl font-black text-white uppercase tracking-tight mb-3">Configuração Concluída</h2>
            <p className="text-slate-400 text-sm font-medium mb-8">
              {deferredPrompt 
                ? 'Os módulos foram configurados. Clique abaixo para confirmar a instalação nativa da Calculadora CAST 1 no seu dispositivo.' 
                : 'O ambiente da calculadora foi preparado com sucesso no seu dispositivo.'}
            </p>

            {/* Se houver prompt nativo pronto, exibe o botão principal de instalação */}
            {deferredPrompt && (
              <button 
                onClick={onComplete}
                className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-3 group/btn cursor-pointer mb-4"
              >
                Finalizar e Instalar <ChevronRight size={20} />
              </button>
            )}

            {/* Se estiver no iframe (AI Studio Preview) */}
            {isInIframe && !deferredPrompt && (
              <div className="bg-blue-950/60 border border-blue-500/30 rounded-2xl p-5 mb-6 text-left">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center shrink-0 border border-blue-500/30">
                    <ExternalLink size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-white uppercase mb-1">Abrir em Nova Aba</p>
                    <p className="text-[11px] text-slate-300 font-medium leading-relaxed mb-3">
                      Como você está no modo de visualização interna, abra a Calculadora diretamente no navegador para que o botão de instalação nativa do Android/Windows seja ativado.
                    </p>
                    <button
                      onClick={() => {
                        window.open(window.location.origin + '/calculadora.html', '_blank');
                        if (onClose) onClose();
                      }}
                      className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      <ExternalLink size={14} />
                      <span>Abrir na Aba Real</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Instruções para iPhone (iOS) se não houver prompt nativo */}
            {isIOS && !deferredPrompt && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6 text-left">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-md">
                    <Share size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-white uppercase mb-1">Instruções para iPhone / iPad</p>
                    <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                      1. Toque no botão <strong className="text-blue-400 font-extrabold">Compartilhar</strong> (ícone ⎋ na barra do Safari).<br/>
                      2. Role para baixo e selecione <strong className="text-blue-400 font-extrabold">"Adicionar à Tela de Início"</strong> ➕.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Instruções para Android/PC se não for iOS e não tiver deferredPrompt */}
            {!isIOS && !isInIframe && !deferredPrompt && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6 text-left">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center shrink-0 border border-amber-500/30">
                    <Smartphone size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-white uppercase mb-1">Instruções para Celular / Computador</p>
                    <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                      1. Toque no menu do Chrome/Edge (<strong className="text-amber-400 font-extrabold">3 pontos ⋮</strong> no canto superior).<br/>
                      2. Selecione <strong className="text-amber-400 font-extrabold">"Instalar aplicativo"</strong> ou <strong className="text-amber-400 font-extrabold">"Adicionar à tela inicial"</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Botão de Fechar / Acessar Calculadora */}
            <button 
              onClick={() => {
                if (deferredPrompt) {
                  onComplete();
                } else if (onClose) {
                  onClose();
                }
              }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 cursor-pointer"
            >
              {deferredPrompt ? 'Depois' : 'Concluir e Usar Calculadora'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalculatorInstallExperience;
