import React from 'react';
import { Camera, Sparkles, X, ShieldCheck, ArrowRight } from 'lucide-react';
import { SystemUser } from '../types';

interface FacialPromptModalProps {
  isOpen: boolean;
  user: SystemUser | null;
  onAccept: () => void;
  onDecline: () => void;
}

export const FacialPromptModal: React.FC<FacialPromptModalProps> = ({
  isOpen,
  user,
  onAccept,
  onDecline
}) => {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-[280] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-cyan-500/40 text-white rounded-[2.5rem] p-6 sm:p-8 max-w-sm w-full shadow-[0_0_50px_rgba(6,182,212,0.3)] text-center space-y-5 relative overflow-hidden">
        
        {/* Glow de fundo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-32 bg-cyan-500/15 blur-2xl pointer-events-none rounded-full" />

        <div className="relative">
          <div className="w-20 h-20 bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(6,182,212,0.4)] border border-cyan-400/40 animate-pulse">
            <Camera size={38} className="text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 left-1/2 translate-x-3 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-slate-900">
            <Sparkles size={12} />
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-950/70 border border-cyan-500/30 px-3 py-1 rounded-full inline-block">
            Acesso Rápido por Câmera
          </span>
          <h3 className="text-xl font-black text-white uppercase tracking-tight">
            Cadastrar Rosto?
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed font-normal">
            Olá, <strong className="text-white font-black">{user.name.split(' ')[0]}</strong>! Deseja cadastrar o reconhecimento facial para entrar automaticamente sem precisar digitar senha nos próximos acessos?
          </p>
        </div>

        <div className="p-3 bg-cyan-950/40 border border-cyan-500/20 rounded-2xl flex items-center gap-2.5 text-left">
          <ShieldCheck size={20} className="text-cyan-400 shrink-0" />
          <p className="text-[10px] text-cyan-100 font-medium uppercase leading-tight">
            Funciona no celular e computador. A câmera reconhece você logo após o vídeo de abertura.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-1">
          <button
            type="button"
            onClick={onAccept}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(6,182,212,0.35)] active:scale-95 cursor-pointer flex items-center justify-center gap-2 border border-cyan-400/40"
          >
            <Camera size={15} /> Cadastrar Rosto Agora
          </button>
          <button
            type="button"
            onClick={onDecline}
            className="w-full py-3 bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Agora Não (Lembrar Mais Tarde)
          </button>
        </div>

        <p className="text-[8.5px] font-bold text-slate-500 uppercase tracking-wider">
          Você também pode cadastrar a qualquer momento pelo menu de perfil.
        </p>

      </div>
    </div>
  );
};
