import React from 'react';
import { 
  X, 
  Info, 
  Code, 
  Sparkles, 
  Layers, 
  BarChart3, 
  Users, 
  Award, 
  Cpu, 
  ShieldCheck, 
  Smartphone,
  CheckCircle2
} from 'lucide-react';

interface SystemInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemLogo?: string | null;
  systemName?: string;
}

export const SystemInfoModal: React.FC<SystemInfoModalProps> = ({
  isOpen,
  onClose,
  systemLogo,
  systemName = 'CONTROLE E GESTÃO DE PRODUÇÃO'
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl bg-[#0c1a2e]/95 backdrop-blur-2xl rounded-3xl p-5 sm:p-7 border border-cyan-500/35 shadow-[0_0_60px_rgba(8,145,178,0.25),0_25px_60px_rgba(0,0,0,0.85)] text-white relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto no-scrollbar flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Botão Fechar */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-cyan-950 text-slate-400 hover:text-cyan-300 border border-slate-700/60 hover:border-cyan-500/50 flex items-center justify-center transition-all cursor-pointer"
          title="Fechar"
        >
          <X size={16} />
        </button>

        {/* Cabeçalho do Modal */}
        <div className="flex items-center gap-4 pb-4 border-b border-cyan-900/60 pr-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-600 via-cyan-700 to-teal-900 flex items-center justify-center text-white shadow-[0_0_20px_rgba(6,182,212,0.35)] border border-cyan-400/40 shrink-0 overflow-hidden">
            {systemLogo ? (
              <img src={systemLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <img 
                src="https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png" 
                alt="Logo" 
                className="w-full h-full object-contain p-1.5" 
              />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-950/70 px-2 py-0.5 rounded-full border border-cyan-500/30">
                Manupackaging Fitasa e Amazônia
              </span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <Sparkles size={11} /> Versão 2.0.0
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white mt-1 leading-tight">
              {systemName} (CGP)
            </h3>
          </div>
        </div>

        {/* Cartão de Desenvolvedor */}
        <div className="mt-4 p-3 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-[#0a1f33]/80 to-blue-950/60 border border-cyan-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 shrink-0">
              <Code size={18} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-cyan-300/80 uppercase tracking-widest leading-none">
                Autoria & Desenvolvimento
              </p>
              <p className="text-xs sm:text-sm font-black text-white uppercase tracking-wide mt-0.5">
                Desenvolvido por Adaias Melo
              </p>
            </div>
          </div>
          <span className="text-[9px] font-mono text-cyan-400/90 bg-cyan-950/90 border border-cyan-500/30 px-2.5 py-1 rounded-lg">
            Build 2026.2
          </span>
        </div>

        {/* Corpo com Descrição Geral do Sistema */}
        <div className="mt-4 space-y-4 text-slate-300 text-xs leading-relaxed">
          {/* Para que serve */}
          <div className="bg-[#081524]/70 p-3.5 rounded-2xl border border-cyan-950/80 space-y-1.5">
            <div className="flex items-center gap-2 text-cyan-300 font-black text-[11px] uppercase tracking-wider">
              <Info size={14} className="text-cyan-400" />
              <span>O que é e para que serve o CGP?</span>
            </div>
            <p className="text-slate-300 text-[11px] font-medium leading-relaxed">
              O <strong className="text-white">CGP (Controle e Gestão de Produção)</strong> é a solução tecnológica industrial desenvolvida especificamente para as operações da <strong className="text-cyan-200">Manupackaging Fitasa & Amazônia</strong>.
              Sua finalidade é centralizar o apontamento de produção em tempo real, eliminar controles manuais em papel, dar transparência ao cumprimento de metas diárias e mensais, e calcular as bonificações de equipe com rigor e confiabilidade.
            </p>
          </div>

          {/* Como funciona - Módulos */}
          <div>
            <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Layers size={13} /> Principais Funcionalidades do Sistema
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-[#091829]/60 border border-cyan-950/70 hover:border-cyan-500/30 transition-colors">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-[11px] uppercase tracking-wide mb-1">
                  <BarChart3 size={14} className="text-cyan-400 shrink-0" />
                  <span>Extrusão & Corte de Fita</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Apontamento por bobinas, fardos, esteiras e turnos; cálculo instantâneo de perdas, ritmo produtivo e OEE por máquina.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#091829]/60 border border-cyan-950/70 hover:border-cyan-500/30 transition-colors">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-[11px] uppercase tracking-wide mb-1">
                  <Award size={14} className="text-cyan-400 shrink-0" />
                  <span>Metas & Bônus de Equipe</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Evolução histórica do desempenho, metas ponderadas, transparência de bonificações estimadas e controle de descontos.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#091829]/60 border border-cyan-950/70 hover:border-cyan-500/30 transition-colors">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-[11px] uppercase tracking-wide mb-1">
                  <Cpu size={14} className="text-cyan-400 shrink-0" />
                  <span>Gestão de Paradas Técnicas</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Registro imediato de motivos mecânicos, elétricos e operacionais com análise de tempos e impactos no faturamento.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#091829]/60 border border-cyan-950/70 hover:border-cyan-500/30 transition-colors">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-[11px] uppercase tracking-wide mb-1">
                  <Users size={14} className="text-cyan-400 shrink-0" />
                  <span>Gestão de Pessoal & Escalas</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Controle de escalas contínuas, turnos, horários de almoço, férias, horas extras com scanner de comprovantes e extrato individual.
                </p>
              </div>
            </div>
          </div>

          {/* Destaques Técnicos da Versão 2.0.0 */}
          <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20">
            <h4 className="text-[10px] font-black text-cyan-300 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-cyan-400" /> Destaques da Versão 2.0.0
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] text-slate-300 font-medium">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-cyan-400 shrink-0" />
                <span>Aplicativo PWA com funcionamento offline</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-cyan-400 shrink-0" />
                <span>Autenticação biométrica digital</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-cyan-400 shrink-0" />
                <span>Modo de Projeção em tempo real para TV de chão</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 size={12} className="text-cyan-400 shrink-0" />
                <span>Sincronização redundante e segura com nuvem</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Rodapé do Modal com Botão de Fechar */}
        <div className="mt-5 pt-3 border-t border-cyan-900/60 flex items-center justify-between">
          <p className="text-[9px] text-slate-500 uppercase tracking-wider">
            © 2026 Manupackaging Fitasa e Amazônia
          </p>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all cursor-pointer active:scale-95"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
