import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Cpu, 
  Database, 
  BarChart3, 
  Zap, 
  CheckCircle2, 
  Monitor,
  ChevronRight,
  ArrowRight
} from 'lucide-react';

interface InstallExperienceProps {
  onComplete: () => void;
}

const InstallExperience: React.FC<InstallExperienceProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'intro' | 'installing' | 'complete'>('intro');
  const [progress, setProgress] = useState(0);
  const [currentInfo, setCurrentInfo] = useState(0);

  const installationTips = [
    { title: "Configurando Banco de Dados Cloud", desc: "Estabelecendo conexão segura com o Firebase Firestore...", icon: Database },
    { title: "Sincronizando Metas Globais", desc: "Carregando parâmetros de produtividade e KPIs...", icon: BarChart3 },
    { title: "Ativando Motor de IA", desc: "Preparando Gemini para análise de perdas e sugestões...", icon: Cpu },
    { title: "Otimizando Workspace", desc: "Ajustando interface para máxima performance industrial...", icon: Zap },
    { title: "Finalizando Segurança", desc: "Validando certificados de criptografia e acesso...", icon: ShieldCheck }
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
      }, 150); // Aumentado para ~15 segundos total

      const infoTimer = setInterval(() => {
        setCurrentInfo(prev => (prev + 1) % installationTips.length);
      }, 3000); // Aumentado para 3 segundos por dica

      return () => {
        clearInterval(timer);
        clearInterval(infoTimer);
      };
    }
  }, [step]);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex items-center justify-center overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/20 blur-[120px] rounded-full" />
      </div>

      <AnimatePresence mode="wait">
        {step === 'intro' && (
          <motion.div 
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 w-full max-w-2xl px-6 text-center"
          >
            <div className="flex justify-center mb-10">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-500/20 rotate-3">
                <Monitor size={48} className="text-white" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-6 leading-[0.9]">
              PREPARANDO <br/>
              <span className="text-blue-500 italic">SETUP LOCAL</span>
            </h1>
            
            <p className="text-slate-400 text-lg md:text-xl font-medium max-w-lg mx-auto mb-12 leading-relaxed">
              O sistema irá configurar os módulos de alta performance e preparar a instalação nativa no seu dispositivo.
            </p>

            <button 
              onClick={() => setStep('installing')}
              className="group relative inline-flex items-center gap-4 bg-white text-slate-950 px-10 py-6 rounded-3xl font-black uppercase tracking-widest text-sm hover:bg-blue-500 hover:text-white transition-all duration-500 shadow-xl shadow-white/5 active:scale-95"
            >
              Iniciar Instalação 
              <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-950 group-hover:bg-white/20 group-hover:text-white transition-colors">
                <ArrowRight size={18} />
              </div>
            </button>

            <div className="mt-12 flex justify-center gap-8 text-[10px] font-black text-slate-600 uppercase tracking-widest">
              <span>Firebase Cloud</span>
              <span className="w-1.5 h-1.5 bg-slate-800 rounded-full my-auto" />
              <span>Gemini AI Ready</span>
              <span className="w-1.5 h-1.5 bg-slate-800 rounded-full my-auto" />
              <span>PWA Native</span>
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
            <div className="mb-16">
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-500 border border-blue-500/20">
                <Cpu className="animate-pulse" size={32} />
              </div>
              <h2 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-2">Instalando Módulos</h2>
              <p className="text-slate-500 font-bold text-xs">Aguarde enquanto preparamos seu ambiente empresarial.</p>
            </div>

            {/* Main Progress Bar */}
            <div className="relative mb-20">
              <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 p-1">
                <motion.div 
                  className="h-full bg-gradient-to-r from-blue-600 via-blue-400 to-emerald-400 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "linear" }}
                />
              </div>
              <div className="absolute -top-10 right-0">
                <span className="text-4xl font-black text-white/10 italic"># {progress}%</span>
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
                  <div className="flex items-center gap-3 text-emerald-400">
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
            className="relative z-10 w-full max-w-md px-10 text-center"
          >
            <motion.div 
              initial={{ rotate: -45, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-emerald-500/20"
            >
              <CheckCircle2 size={48} className="text-white" />
            </motion.div>

            <h2 className="text-4xl font-black text-white uppercase tracking-tight mb-4">Configuração Concluída</h2>
            <p className="text-slate-400 font-medium mb-12">O ambiente local foi otimizado. Você será solicitado a confirmar a instalação definitiva no sistema operacional a seguir.</p>

            <button 
              onClick={onComplete}
              className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black uppercase tracking-widest text-sm hover:bg-blue-50 transition-all shadow-xl shadow-blue-500/10 active:scale-95 flex items-center justify-center gap-3 group/btn hover:text-blue-600"
            >
              Finalizar e Abrir <ChevronRight size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InstallExperience;
