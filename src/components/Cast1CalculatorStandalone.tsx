import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  Layers, 
  Gauge, 
  Activity, 
  Clock, 
  Box, 
  Cpu, 
  RefreshCw, 
  Copy, 
  Check, 
  Share2, 
  LogIn,
  Download,
  Smartphone,
  X
} from 'lucide-react';
import CalculatorInstallExperience from './CalculatorInstallExperience';

interface Cast1CalculatorStandaloneProps {
  onNavigateToApp?: () => void;
  systemLogo?: string | null;
  deferredPrompt?: any;
  isInstallable?: boolean;
  isStandalone?: boolean;
  isIOS?: boolean;
}

// Mapeamento Espessura (µm) -> Gramatura (g) para Largura de 500 mm
const TABELA_GRAMATURA_500: Record<number, number> = {
  10: 4.60, 11: 5.06, 12: 5.52, 13: 5.98, 14: 6.44, 15: 6.90,
  16: 7.36, 17: 7.82, 18: 8.28, 19: 8.74, 20: 9.20, 21: 9.66,
  22: 10.12, 23: 10.58, 24: 11.04, 25: 11.50, 26: 11.96, 27: 12.42,
  28: 12.88, 29: 13.34, 30: 13.80, 31: 14.26, 32: 14.72, 33: 15.18,
  34: 15.64, 35: 16.10, 36: 16.56, 37: 17.02, 38: 17.48, 39: 17.94,
  40: 18.40, 41: 18.86, 42: 19.32, 43: 19.78, 44: 20.24, 45: 20.70,
  46: 21.16, 47: 21.62, 48: 22.08, 49: 22.54, 50: 23.00, 70: 32.20,
  71: 32.66
};

const ESPESSURAS = [
  10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
  30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
  50, 70, 71
];

// Fatores de Rendimento por RPM (kg/h por cada 1 RPM)
const FATOR_A = 500 / 58;    // ~8.6207 kg/h por RPM
const FATOR_B = 63.83 / 130; // ~0.4910 kg/h por RPM
const FATOR_C = 125 / 160;   // ~0.78125 kg/h por RPM
const FATOR_D = 500 / 58;    // ~8.6207 kg/h por RPM

export const Cast1CalculatorStandalone: React.FC<Cast1CalculatorStandaloneProps> = ({
  onNavigateToApp,
  systemLogo,
  deferredPrompt: propDeferredPrompt,
  isInstallable: propIsInstallable,
  isStandalone: propIsStandalone,
  isIOS: propIsIOS
}) => {
  const [tipoMaterial, setTipoMaterial] = useState<'LC3' | 'LC2' | 'ATX'>('LC3');
  const [espessura, setEspessura] = useState<number>(30);
  const [gramatura, setGramatura] = useState<number>(13.80);
  const [velocidade, setVelocidade] = useState<number>(230);
  const [metragem, setMetragem] = useState<number>(3623);

  const [rpmA, setRpmA] = useState<number>(56);
  const [rpmB, setRpmB] = useState<number>(116);
  const [rpmC, setRpmC] = useState<number>(146);
  const [rpmD, setRpmD] = useState<number>(56);

  // Porcentagem de cola do dosador Vistamaxx inserida na Rosca B
  const [porcentagemCola, setPorcentagemCola] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const saved = localStorage.getItem('cast1_calc_porcentagem_cola');
      return saved ? parseFloat(saved) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const handleColaChange = (val: number) => {
    const safeVal = isNaN(val) ? 0 : Math.max(0, val);
    setPorcentagemCola(safeVal);
    try {
      localStorage.setItem('cast1_calc_porcentagem_cola', safeVal.toString());
    } catch {}
  };

  const [copiedLink, setCopiedLink] = useState(false);

  // PWA Install State & Handlers
  const [showInstallExperience, setShowInstallExperience] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(propDeferredPrompt || null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (propIsStandalone) return true;
    try {
      return (
        localStorage.getItem('calculadora_cast1_installed') === 'true' ||
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        window.location.search.includes('source=pwa') ||
        window.location.search.includes('source=installed')
      );
    } catch {
      return false;
    }
  });

  const [showBanner, setShowBanner] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (propIsStandalone) return false;
    try {
      const already = 
        localStorage.getItem('calculadora_cast1_installed') === 'true' ||
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        window.location.search.includes('source=pwa') ||
        window.location.search.includes('source=installed');
      if (already) return false;
      return sessionStorage.getItem('calc_banner_dismissed') !== 'true';
    } catch {
      return false;
    }
  });

  const checkIfInstalled = () => {
    if (typeof window === 'undefined') return false;
    try {
      if (localStorage.getItem('calculadora_cast1_installed') === 'true') return true;
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
      if ((window.navigator as any)?.standalone === true) return true;
      if (document.referrer && document.referrer.includes('android-app://')) return true;
      if (window.location.search && (window.location.search.includes('source=pwa') || window.location.search.includes('source=installed'))) return true;
    } catch (e) {}
    return false;
  };

  useEffect(() => {
    if (propDeferredPrompt) {
      setDeferredPrompt(propDeferredPrompt);
    }
  }, [propDeferredPrompt]);

  useEffect(() => {
    const alreadyInstalled = checkIfInstalled();
    if (alreadyInstalled) {
      setIsInstalled(true);
      setShowBanner(false);
      try {
        localStorage.setItem('calculadora_cast1_installed', 'true');
      } catch (e) {}
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (typeof window !== 'undefined') {
        (window as any).__CALCULATOR_DEFERRED_PROMPT__ = e;
      }
      if (!checkIfInstalled() && sessionStorage.getItem('calc_banner_dismissed') !== 'true') {
        setShowBanner(true);
      }
    };

    const handleAppInstalled = () => {
      try {
        localStorage.setItem('calculadora_cast1_installed', 'true');
      } catch (e) {}
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowBanner(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const effectiveDeferredPrompt = deferredPrompt || (typeof window !== 'undefined' ? (window as any).__CALCULATOR_DEFERRED_PROMPT__ : null);

  const effectiveLogo = 
    systemLogo || 
    (typeof window !== 'undefined' ? localStorage.getItem('manupackaging_system_logo') : null) || 
    "https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png";

  const isIOS = propIsIOS ?? (typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);

  const handleInstallApp = () => {
    setShowInstallExperience(true);
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('calc_banner_dismissed', 'true');
    }
  };

  // Enviar os dados completos calculados pelo WhatsApp
  const handleShareWhatsApp = () => {
    const dataHora = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) + ' às ' + new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const texto = 
`📊 *CALCULADORA DE PORCENTAGEM - CAST 1*
🏢 *MANUPACKAGING*
─────────────────────────────
⚙️ *DADOS DA LINHA*
• *Material:* ${tipoMaterial}
• *Espessura:* ${espessura} µm
• *Gramatura Nominal:* ${gramatura.toFixed(2).replace('.', ',')} g/m
• *Velocidade da Linha:* ${velocidade} m/min
• *Metragem Automática:* ${metragem.toLocaleString('pt-BR')} m
• *Configuração:* 6 Bobinas (500 mm)

🌀 *DISTRIBUIÇÃO DAS ROSCAS (EXTRUSORAS)*
• *Rosca A:* ${rpmA} RPM | ${vazaoA.toFixed(1).replace('.', ',')} kg/h (${formatarPorcentagem(pctA)})
• *Rosca B:* ${rpmB} RPM | ${vazaoB.toFixed(1).replace('.', ',')} kg/h (${formatarPorcentagem(pctBLiquida)})${porcentagemCola > 0 ? ` [Líquida | Dosador Cola Vistamaxx: ${formatarPorcentagem(porcentagemCola)} | Bruta: ${formatarPorcentagem(pctB)}]` : ''}
• *Rosca C:* ${rpmC} RPM | ${vazaoC.toFixed(1).replace('.', ',')} kg/h (${formatarPorcentagem(pctC)})
• *Rosca D:* ${rpmD} RPM | ${vazaoD.toFixed(1).replace('.', ',')} kg/h (${formatarPorcentagem(pctD)})
• *Total das Camadas:* ${formatarPorcentagem(totalCamadas)}

📈 *INDICADORES DE PRODUÇÃO*
• *Taxa de Produção Total:* ${taxaProducaoQuilos.toFixed(2).replace('.', ',')} kg/h
• *Paletes / Turno (12h):* ${resultadoPalete}
• *Tempo para 1 Palete:* ${formatarTempo(tempoPalete)}
• *Tempo por Queda:* ${tempoQuedaMinutos.replace('.', ',')} min
─────────────────────────────
📅 _Registro enviado em: ${dataHora}_`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  // Cálculo de Metragem Automática Integrada
  const calcularMetragemAutomatica = (espessuraMicras: number) => {
    const pesoFixadoKg = 50;
    const densidade = 0.092;
    const larguraMetros = 500 / 100;

    if (espessuraMicras <= 0 || isNaN(espessuraMicras)) return 0;

    const espessuraMm = espessuraMicras / 1000;
    const metragemArea = (pesoFixadoKg * 1000) / (densidade * larguraMetros * espessuraMm);
    const metragemAjustada = metragemArea / 1000;

    return Math.round(metragemAjustada);
  };

  // Recalcula as RPMs baseando-se na velocidade geral da linha
  const recalcularVelocidadesSugestoes = (
    tipoMat: 'LC3' | 'LC2' | 'ATX',
    gram: number,
    vel: number
  ) => {
    const pctB_alvo = 0.05;
    const pctC_alvo = tipoMat === 'LC2' ? 0.05 : 0.10;
    const pctAD_alvo = (1.0 - (pctB_alvo + pctC_alvo)) / 2.0;

    const quantidadeBobinas = 6;
    const tempoMinutos = 60;
    const taxaProducaoQuilos = (gram * quantidadeBobinas * vel * tempoMinutos) / 1000;

    if (taxaProducaoQuilos > 0) {
      const vazaoAlvoA = taxaProducaoQuilos * pctAD_alvo;
      const vazaoAlvoB = taxaProducaoQuilos * pctB_alvo;
      const vazaoAlvoC = taxaProducaoQuilos * pctC_alvo;
      const vazaoAlvoD = taxaProducaoQuilos * pctAD_alvo;

      setRpmA(Math.round(vazaoAlvoA / FATOR_A));
      setRpmB(Math.round(vazaoAlvoB / FATOR_B));
      setRpmC(Math.round(vazaoAlvoC / FATOR_C));
      setRpmD(Math.round(vazaoAlvoD / FATOR_D));
    }
  };

  // Atualizar parâmetros por espessura
  const handleEspessuraChange = (novaEspessura: number) => {
    setEspessura(novaEspessura);
    const novaGramatura = TABELA_GRAMATURA_500[novaEspessura] !== undefined 
      ? TABELA_GRAMATURA_500[novaEspessura] 
      : gramatura;
    setGramatura(novaGramatura);

    const novaMetragem = calcularMetragemAutomatica(novaEspessura);
    setMetragem(novaMetragem);

    recalcularVelocidadesSugestoes(tipoMaterial, novaGramatura, velocidade);
  };

  // Recalcula roscas B e C quando A ou D são alteradas manualmente
  const handleRpmAouDChange = (newRpmA: number, newRpmD: number) => {
    setRpmA(newRpmA);
    setRpmD(newRpmD);

    const pctB_alvo = 0.05;
    const pctC_alvo = tipoMaterial === 'LC2' ? 0.05 : 0.10;
    const pctAD_alvo_total = 1.0 - (pctB_alvo + pctC_alvo);

    const vazaoAD = (newRpmA * FATOR_A) + (newRpmD * FATOR_D);

    if (vazaoAD > 0) {
      const vazaoTotalEstimada = vazaoAD / pctAD_alvo_total;
      const vazaoAlvoB = vazaoTotalEstimada * pctB_alvo;
      const vazaoAlvoC = vazaoTotalEstimada * pctC_alvo;

      setRpmB(Math.round(vazaoAlvoB / FATOR_B));
      setRpmC(Math.round(vazaoAlvoC / FATOR_C));
    }
  };

  const handleTipoMaterialChange = (newTipo: 'LC3' | 'LC2' | 'ATX') => {
    setTipoMaterial(newTipo);
    recalcularVelocidadesSugestoes(newTipo, gramatura, velocidade);
  };

  const handleGramaturaChange = (newGram: number) => {
    setGramatura(newGram);
    recalcularVelocidadesSugestoes(tipoMaterial, newGram, velocidade);
  };

  const handleVelocidadeChange = (newVel: number) => {
    setVelocidade(newVel);
    recalcularVelocidadesSugestoes(tipoMaterial, gramatura, newVel);
  };

  // Inicialização padrão
  useEffect(() => {
    handleEspessuraChange(30);
  }, []);

  // --- CÁLCULOS DERIVADOS ---
  const vazaoA = rpmA * FATOR_A;
  const vazaoB = rpmB * FATOR_B;
  const vazaoC = rpmC * FATOR_C;
  const vazaoD = rpmD * FATOR_D;

  const vazaoCalculadaTotal = vazaoA + vazaoB + vazaoC + vazaoD;

  let pctA = 0, pctB = 0, pctC = 0, pctD = 0;
  if (vazaoCalculadaTotal > 0) {
    pctA = (vazaoA / vazaoCalculadaTotal) * 100;
    pctB = (vazaoB / vazaoCalculadaTotal) * 100;
    pctC = (vazaoC / vazaoCalculadaTotal) * 100;
    pctD = (vazaoD / vazaoCalculadaTotal) * 100;
  }
  // Porcentagem líquida da Rosca B descontando a dosagem de cola (Vistamaxx)
  const pctBLiquida = Math.max(0, pctB - porcentagemCola);
  const totalCamadas = pctA + pctB + pctC + pctD;

  // Indicadores de Produção da Linha
  const quantidadeBobinas = 6;
  const tempoMinutos = 60;
  const horasProducao = 12;
  const pesoPalete = 800;

  const gramaturaTotal = gramatura * quantidadeBobinas;
  const taxaProducaoGramas = gramaturaTotal * velocidade * tempoMinutos;
  const taxaProducaoQuilos = taxaProducaoGramas / 1000;

  const resultadoPalete = Math.floor((taxaProducaoQuilos * horasProducao) / pesoPalete);
  const tempoPalete = taxaProducaoQuilos > 0 ? (pesoPalete / taxaProducaoQuilos) : 0;

  const formatarTempo = (t: number) => {
    if (t <= 0 || isNaN(t)) return "00:00 h/min";
    const h = Math.floor(t);
    const m = Math.round((t - h) * 60);
    return `${h}:${m < 10 ? '0' : ''}${m} h/min`;
  };

  const tempoQuedaMinutos = velocidade > 0 ? (metragem / velocidade).toFixed(2) : "0.00";

  const formatarPorcentagem = (valor: number) => {
    return valor.toFixed(2).replace('.', ',') + "%";
  };

  if (showInstallExperience) {
    return (
      <CalculatorInstallExperience
        deferredPrompt={effectiveDeferredPrompt}
        isIOS={isIOS}
        onClose={() => setShowInstallExperience(false)}
        onComplete={async () => {
          setShowInstallExperience(false);
          if (effectiveDeferredPrompt) {
            try {
              effectiveDeferredPrompt.prompt();
              const { outcome } = await effectiveDeferredPrompt.userChoice;
              if (outcome === 'accepted') {
                setIsInstalled(true);
                setShowBanner(false);
                setDeferredPrompt(null);
                try {
                  localStorage.setItem('calculadora_cast1_installed', 'true');
                } catch (e) {}
              }
            } catch (e) {
              console.log("PWA prompt error:", e);
            }
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen bg-slate-100 flex flex-col items-center justify-between p-2 sm:p-4 lg:p-3 xl:p-4 lg:overflow-hidden">
      {/* Banner Promocional de Instalação do Aplicativo (PWA) - Ocultado se já instalado */}
      {showBanner && !isInstalled && (
        <div className="w-full max-w-2xl lg:max-w-7xl bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 text-white rounded-2xl p-3 sm:p-3.5 mb-2 shadow-xl border border-blue-400/30 flex items-center justify-between gap-3 transition-all animate-fade-in flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 text-yellow-300 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-inner">
              <Download size={18} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5 flex-wrap">
                <span>Instalar Aplicativo da Calculadora</span>
                <span className="bg-emerald-500 text-[10px] font-black uppercase px-1.5 py-0.5 rounded text-white tracking-wider">PWA</span>
              </div>
              <p className="text-[11px] text-blue-200 line-clamp-1 sm:line-clamp-none">
                Baixe no seu celular e abra direto na Calculadora, mesmo sem internet!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button 
              onClick={handleDismissBanner}
              className="text-xs text-blue-200 hover:text-white px-2 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              Depois
            </button>
            <button 
              onClick={handleInstallApp}
              className="flex items-center gap-1.5 bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-black text-xs px-3 py-1.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Download size={14} className="stroke-[2.5]" />
              <span>Baixar App</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Banner Branding - Logo do Sistema + MANUPACKAGING com Linha CAST 1 embaixo */}
      <div className="w-full max-w-2xl lg:max-w-7xl flex items-center justify-between mb-2 sm:mb-2.5 px-1 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-white p-1.5 border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0">
            <img src={effectiveLogo} alt="Manupackaging Logo" className="h-full w-full object-contain" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-xs sm:text-sm font-black tracking-tight text-slate-900 uppercase leading-none">
              MANUPACKAGING
            </span>
            <span className="text-[10px] sm:text-[11px] font-extrabold text-blue-600 tracking-wider uppercase mt-1 leading-none">
              Linha CAST 1
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onNavigateToApp && (
            <button
              onClick={onNavigateToApp}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <LogIn size={14} />
              <span>Acessar Sistema</span>
            </button>
          )}
        </div>
      </div>

      {/* Card Principal da Calculadora (Ocupa a tela inteira no desktop sem scrollbar) */}
      <div className="bg-white rounded-2xl lg:rounded-3xl shadow-xl border border-slate-200 w-full max-w-2xl lg:max-w-7xl flex-1 flex flex-col lg:overflow-hidden overflow-hidden">
        
        {/* Header com Título Apenas "Calculadora Porcentagem" */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/40 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
              <Calculator size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight uppercase">
                Calculadora Porcentagem
              </h2>
              <p className="text-[11px] font-bold text-slate-500">
                Produção Integrada &amp; Balanceamento de Roscas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all shadow-sm bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 cursor-pointer"
              title="Enviar dados da calculadora no WhatsApp"
            >
              <Share2 size={14} />
              <span>Enviar no WhatsApp</span>
            </button>
            <button
              onClick={() => handleEspessuraChange(espessura)}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
              title="Resetar parâmetros da espessura atual"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Mobile View: Layout tradicional fluido e compacto para celular */}
        <div className="block lg:hidden p-3 sm:p-4 overflow-y-auto space-y-3 bg-slate-50/60">
          {/* Header Selects: Tipo de Material & Espessura (Lado a Lado no celular) */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-2 gap-2.5">
            <div className="flex flex-col">
              <label htmlFor="tipoMaterialMobile" className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Layers size={13} className="text-blue-600" />
                Tipo de Material
              </label>
              <select
                id="tipoMaterialMobile"
                value={tipoMaterial}
                onChange={(e) => handleTipoMaterialChange(e.target.value as 'LC3' | 'LC2' | 'ATX')}
                className="w-full py-2 px-2.5 text-sm font-black border border-slate-300 rounded-xl bg-slate-50 text-slate-800 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-center"
              >
                <option value="LC3">LC3</option>
                <option value="LC2">LC2</option>
                <option value="ATX">ATX</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label htmlFor="espessuraMobile" className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Gauge size={13} className="text-blue-600" />
                Espessura (µm)
              </label>
              <select
                id="espessuraMobile"
                value={espessura}
                onChange={(e) => handleEspessuraChange(parseFloat(e.target.value))}
                className="w-full py-2 px-2.5 text-sm font-black border border-slate-300 rounded-xl bg-slate-50 text-slate-800 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-center"
              >
                {ESPESSURAS.map((esp) => (
                  <option key={esp} value={esp}>{esp} µm</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dados de Produção da Linha (3 Colunas Lado a Lado) */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
            <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
              <Activity size={13} className="text-blue-600" />
              Dados de Produção da Linha
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center">
                <label htmlFor="calcGramaturaMobile" className="text-[10px] font-bold text-slate-600 mb-0.5 truncate">
                  Gramatura (g):
                </label>
                <input
                  type="number"
                  id="calcGramaturaMobile"
                  value={gramatura}
                  step="any"
                  onChange={(e) => handleGramaturaChange(parseFloat(e.target.value) || 0)}
                  className="w-full py-1.5 px-2 text-xs sm:text-sm font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-blue-600 focus:bg-white transition-all bg-slate-50"
                />
              </div>

              <div className="flex flex-col items-center">
                <label htmlFor="calcVelocidadeMobile" className="text-[10px] font-bold text-slate-600 mb-0.5 truncate">
                  Velocidade (m/min):
                </label>
                <input
                  type="number"
                  id="calcVelocidadeMobile"
                  value={velocidade}
                  step="any"
                  onChange={(e) => handleVelocidadeChange(parseFloat(e.target.value) || 0)}
                  className="w-full py-1.5 px-2 text-xs sm:text-sm font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-blue-600 focus:bg-white transition-all bg-slate-50"
                />
              </div>

              <div className="flex flex-col items-center">
                <label htmlFor="calcMetragemMobile" className="text-[10px] font-bold text-slate-600 mb-0.5 truncate">
                  Metragem (m):
                </label>
                <input
                  type="number"
                  id="calcMetragemMobile"
                  value={metragem}
                  step="any"
                  onChange={(e) => setMetragem(parseFloat(e.target.value) || 0)}
                  className="w-full py-1.5 px-2 text-xs sm:text-sm font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-blue-600 focus:bg-white transition-all bg-slate-50"
                />
              </div>
            </div>
          </div>

          {/* Cards das 4 Roscas (A, B, C, D) em Grid 2x2 */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Rosca A */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 border-t-4 border-t-blue-600 shadow-sm flex flex-col justify-between">
              <div>
                <label htmlFor="rpmAMobile" className="block font-black text-xs sm:text-sm text-slate-800">
                  Rosca A
                </label>
                <span className="block text-[10px] font-semibold text-slate-400 mb-1.5 truncate">
                  Estrutural Grande
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500">RPM:</span>
                  <input
                    type="number"
                    id="rpmAMobile"
                    value={rpmA}
                    step="any"
                    onChange={(e) => handleRpmAouDChange(parseFloat(e.target.value) || 0, rpmD)}
                    className="w-full py-1.5 px-2 text-sm font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-blue-600 bg-slate-50"
                  />
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-dashed border-slate-200 text-center">
                <div className="text-lg font-black text-blue-700">{formatarPorcentagem(pctA)}</div>
                <div className="text-[11px] font-bold text-slate-500 mt-0.5">{vazaoA.toFixed(1).replace('.', ',')} kg/h</div>
              </div>
            </div>

            {/* Rosca B */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 border-t-4 border-t-amber-600 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="rpmBMobile" className="block font-black text-xs sm:text-sm text-slate-800">
                    Rosca B
                  </label>
                  {porcentagemCola > 0 && (
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                      -Cola
                    </span>
                  )}
                </div>
                <span className="block text-[10px] font-semibold text-slate-400 mb-1.5 truncate">
                  Pega / Interna
                </span>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500 w-10 shrink-0">RPM:</span>
                    <input
                      type="number"
                      id="rpmBMobile"
                      value={rpmB}
                      step="any"
                      onChange={(e) => setRpmB(parseFloat(e.target.value) || 0)}
                      className="w-full py-1.5 px-2 text-sm font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-amber-600 bg-slate-50"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-amber-700 w-10 shrink-0 leading-tight" title="Porcentagem de Cola no Dosador (Vistamaxx)">Cola %:</span>
                    <div className="relative w-full">
                      <input
                        type="number"
                        id="colaBMobile"
                        value={porcentagemCola === 0 ? '' : porcentagemCola}
                        placeholder="0,00"
                        step="any"
                        min="0"
                        max="100"
                        onChange={(e) => handleColaChange(parseFloat(e.target.value))}
                        className="w-full py-1.5 px-2 text-xs sm:text-sm font-black border-2 border-amber-200 rounded-xl outline-none text-center text-amber-900 focus:border-amber-600 bg-amber-50/50"
                        title="Porcentagem de Cola no Dosador (Vistamaxx) para descontar da Rosca B"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-dashed border-slate-200 text-center">
                <div className="text-lg font-black text-amber-600">{formatarPorcentagem(pctBLiquida)}</div>
                {porcentagemCola > 0 && (
                  <div className="text-[9px] font-bold text-amber-700 bg-amber-50 py-0.5 px-1 rounded mt-0.5 inline-block">
                    Bruta: {formatarPorcentagem(pctB)} (-{formatarPorcentagem(porcentagemCola)} cola)
                  </div>
                )}
                <div className="text-[11px] font-bold text-slate-500 mt-0.5">{vazaoB.toFixed(1).replace('.', ',')} kg/h</div>
              </div>
            </div>

            {/* Rosca C */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 border-t-4 border-t-emerald-600 shadow-sm flex flex-col justify-between">
              <div>
                <label htmlFor="rpmCMobile" className="block font-black text-xs sm:text-sm text-slate-800">
                  Rosca C
                </label>
                <span className="block text-[10px] font-semibold text-slate-400 mb-1.5 truncate">
                  Metalloceno / Externa
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500">RPM:</span>
                  <input
                    type="number"
                    id="rpmCMobile"
                    value={rpmC}
                    step="any"
                    onChange={(e) => setRpmC(parseFloat(e.target.value) || 0)}
                    className="w-full py-1.5 px-2 text-sm font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-emerald-600 bg-slate-50"
                  />
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-dashed border-slate-200 text-center">
                <div className="text-lg font-black text-emerald-600">{formatarPorcentagem(pctC)}</div>
                <div className="text-[11px] font-bold text-slate-500 mt-0.5">{vazaoC.toFixed(1).replace('.', ',')} kg/h</div>
              </div>
            </div>

            {/* Rosca D */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 border-t-4 border-t-blue-600 shadow-sm flex flex-col justify-between">
              <div>
                <label htmlFor="rpmDMobile" className="block font-black text-xs sm:text-sm text-slate-800">
                  Rosca D
                </label>
                <span className="block text-[10px] font-semibold text-slate-400 mb-1.5 truncate">
                  Estrutural Grande
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500">RPM:</span>
                  <input
                    type="number"
                    id="rpmDMobile"
                    value={rpmD}
                    step="any"
                    onChange={(e) => handleRpmAouDChange(rpmA, parseFloat(e.target.value) || 0)}
                    className="w-full py-1.5 px-2 text-sm font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-blue-600 bg-slate-50"
                  />
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-dashed border-slate-200 text-center">
                <div className="text-lg font-black text-blue-700">{formatarPorcentagem(pctD)}</div>
                <div className="text-[11px] font-bold text-slate-500 mt-0.5">{vazaoD.toFixed(1).replace('.', ',')} kg/h</div>
              </div>
            </div>
          </div>

          {/* Total das Camadas */}
          <div className="text-center font-black text-xs sm:text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 py-2 px-3 rounded-xl shadow-sm">
            Total das Camadas: {formatarPorcentagem(totalCamadas)}
          </div>

          {/* Indicadores da Linha (Card Azul) */}
          <div className="bg-gradient-to-br from-blue-700 to-indigo-900 text-white p-4 rounded-2xl shadow-lg border border-blue-500/30">
            <h3 className="text-xs font-black uppercase tracking-wider text-center text-white/90 mb-3 pb-1.5 border-b border-white/15 flex items-center justify-center gap-2">
              <Cpu size={15} className="text-yellow-300" />
              Indicadores da Linha
            </h3>

            <div className="space-y-2 text-xs font-bold">
              <div className="flex items-center justify-between py-1 border-b border-white/10">
                <span className="text-white/80">Taxa de Produção Total:</span>
                <span className="text-yellow-300 font-black text-sm sm:text-base">
                  {taxaProducaoQuilos.toFixed(2).replace('.', ',')} Kg/h
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-white/10">
                <span className="text-white/80 flex items-center gap-1.5">
                  <Box size={13} className="text-blue-300" />
                  Paletes / Turno (12h):
                </span>
                <span className="font-black text-white text-xs sm:text-sm">
                  {resultadoPalete}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-white/10">
                <span className="text-white/80 flex items-center gap-1.5">
                  <Clock size={13} className="text-blue-300" />
                  Tempo para 1 Palete:
                </span>
                <span className="font-black text-white text-xs sm:text-sm">
                  {formatarTempo(tempoPalete)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-white/80 flex items-center gap-1.5">
                  <Gauge size={13} className="text-emerald-300" />
                  Tempo por Queda:
                </span>
                <span className="font-black text-emerald-300 text-xs sm:text-sm">
                  {tempoQuedaMinutos.replace('.', ',')} min
                </span>
              </div>
            </div>
          </div>

          {/* Botão de Enviar WhatsApp Mobile */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl transition-all shadow-md cursor-pointer"
          >
            <Share2 size={16} />
            <span>Enviar no WhatsApp</span>
          </button>

          {/* Footer Assinatura */}
          <div className="text-center text-[10px] sm:text-[11px] font-bold text-slate-400 pt-1 pb-2">
            Manupackaguing Fitasa e Amazônia desenvolvido por Adaias Melo
          </div>
        </div>

        {/* Desktop View: Grid 3 Colunas em Tela Cheia (sem rolagem obrigatória) */}
        <div className="hidden lg:flex flex-col justify-between p-4 bg-slate-50/60 overflow-hidden flex-1">
          <div className="grid grid-cols-12 gap-4 h-full items-stretch">
            
            {/* COLUNA 1: Parâmetros de Entrada & Produção da Linha (4 colunas no desktop) */}
            <div className="col-span-4 flex flex-col justify-between space-y-3">
              {/* Header Selects: Tipo de Material & Espessura */}
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-3">
                <div className="flex-1">
                  <label htmlFor="tipoMaterial" className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Layers size={13} className="text-blue-600" />
                    Material
                  </label>
                  <select
                    id="tipoMaterial"
                    value={tipoMaterial}
                    onChange={(e) => handleTipoMaterialChange(e.target.value as 'LC3' | 'LC2' | 'ATX')}
                    className="w-full py-2 px-3 text-sm font-black border border-slate-300 rounded-xl bg-slate-50 text-slate-800 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-center"
                  >
                    <option value="LC3">LC3</option>
                    <option value="LC2">LC2</option>
                    <option value="ATX">ATX</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label htmlFor="espessura" className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Gauge size={13} className="text-blue-600" />
                    Espessura
                  </label>
                  <select
                    id="espessura"
                    value={espessura}
                    onChange={(e) => handleEspessuraChange(parseFloat(e.target.value))}
                    className="w-full py-2 px-3 text-sm font-black border border-slate-300 rounded-xl bg-slate-50 text-slate-800 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-center"
                  >
                    {ESPESSURAS.map((esp) => (
                      <option key={esp} value={esp}>{esp} µm</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dados de Produção da Linha */}
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex-1 flex flex-col justify-between space-y-3">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider text-center flex items-center justify-center gap-1.5 pb-1 border-b border-slate-100">
                  <Activity size={14} className="text-blue-600" />
                  Dados de Produção da Linha
                </h3>
                
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="calcGramatura" className="text-xs font-bold text-slate-600">
                      Gramatura (g):
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleGramaturaChange(Math.max(1, +(gramatura - 0.5).toFixed(2)))}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center text-xs"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        id="calcGramatura"
                        value={gramatura}
                        step="any"
                        onChange={(e) => handleGramaturaChange(parseFloat(e.target.value) || 0)}
                        className="w-24 py-1.5 px-2 text-sm font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-blue-600 focus:bg-white bg-slate-50"
                      />
                      <button
                        type="button"
                        onClick={() => handleGramaturaChange(+(gramatura + 0.5).toFixed(2))}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="calcVelocidade" className="text-xs font-bold text-slate-600">
                      Velocidade (m/min):
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleVelocidadeChange(Math.max(10, velocidade - 10))}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center text-xs"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        id="calcVelocidade"
                        value={velocidade}
                        step="any"
                        onChange={(e) => handleVelocidadeChange(parseFloat(e.target.value) || 0)}
                        className="w-24 py-1.5 px-2 text-sm font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-blue-600 focus:bg-white bg-slate-50"
                      />
                      <button
                        type="button"
                        onClick={() => handleVelocidadeChange(velocidade + 10)}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <div>
                      <label htmlFor="calcMetragem" className="text-xs font-bold text-slate-600 block">
                        Metragem Automática:
                      </label>
                      <span className="text-[10px] text-slate-400 font-semibold">Peso 50 kg &bull; 6 Bobinas (500 mm)</span>
                    </div>
                    <input
                      type="number"
                      id="calcMetragem"
                      value={metragem}
                      step="any"
                      onChange={(e) => setMetragem(parseFloat(e.target.value) || 0)}
                      className="w-24 py-1.5 px-2 text-sm font-black border-2 border-slate-200 rounded-xl outline-none text-center text-blue-700 focus:border-blue-600 focus:bg-white bg-blue-50/50"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-100/80 border border-slate-200 text-center">
                  <span className="text-[11px] font-bold text-slate-500">
                    6 Bobinas de 500 mm &bull; Densidade 0,092
                  </span>
                </div>
              </div>
            </div>

            {/* COLUNA 2: Roscas A, B, C e D + Total das Camadas (5 colunas no desktop) */}
            <div className="col-span-5 flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu size={14} className="text-blue-600" />
                  Distribuição das Roscas (Extrusoras)
                </span>
                <span className="text-[11px] font-bold text-slate-400">RPM / Vazão</span>
              </div>

              {/* Rosca A */}
              <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-3 border-l-4 border-l-blue-600 shadow-sm flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs sm:text-sm text-slate-800">Rosca A (Grande)</span>
                    <span className="text-sm font-black text-blue-700">{formatarPorcentagem(pctA)}</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-500">
                    Vazão: <strong className="text-slate-700">{vazaoA.toFixed(1).replace('.', ',')} kg/h</strong>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRpmAouDChange(Math.max(0, rpmA - 1), rpmD)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center text-xs"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    id="rpmA"
                    value={rpmA}
                    step="any"
                    onChange={(e) => handleRpmAouDChange(parseFloat(e.target.value) || 0, rpmD)}
                    className="w-16 py-1 px-1.5 text-sm font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-blue-600 bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleRpmAouDChange(rpmA + 1, rpmD)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Rosca B */}
              <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-3 border-l-4 border-l-amber-600 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-xs sm:text-sm text-slate-800">Rosca B (Pega / Int)</span>
                      {porcentagemCola > 0 && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                          -Cola
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-amber-600">{formatarPorcentagem(pctBLiquida)}</span>
                      {porcentagemCola > 0 && (
                        <span className="block text-[9px] font-bold text-amber-700">
                          Bruta: {formatarPorcentagem(pctB)} (-{formatarPorcentagem(porcentagemCola)})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                    Vazão: <strong className="text-slate-700">{vazaoB.toFixed(1).replace('.', ',')} kg/h</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Campo de Entrada de Cola / Dosador Vistamaxx */}
                  <div className="flex items-center gap-1 bg-amber-50/80 border border-amber-200 px-2 py-1 rounded-xl">
                    <span className="text-[10px] font-bold text-amber-800 whitespace-nowrap" title="Porcentagem de Cola no Dosador (Vistamaxx)">
                      Cola %:
                    </span>
                    <input
                      type="number"
                      id="colaB"
                      value={porcentagemCola === 0 ? '' : porcentagemCola}
                      placeholder="0,00"
                      step="any"
                      min="0"
                      max="100"
                      onChange={(e) => handleColaChange(parseFloat(e.target.value))}
                      className="w-14 py-0.5 px-1 text-xs font-black border border-amber-300 rounded-lg outline-none text-center text-amber-900 focus:border-amber-600 bg-white"
                      title="Porcentagem de Cola no Dosador (Vistamaxx) para descontar da Rosca B"
                    />
                  </div>

                  {/* Controle de RPM */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-slate-500 mr-0.5">RPM:</span>
                    <button
                      type="button"
                      onClick={() => setRpmB(Math.max(0, rpmB - 1))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center text-xs"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      id="rpmB"
                      value={rpmB}
                      step="any"
                      onChange={(e) => setRpmB(parseFloat(e.target.value) || 0)}
                      className="w-16 py-1 px-1.5 text-sm font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-amber-600 bg-slate-50"
                    />
                    <button
                      type="button"
                      onClick={() => setRpmB(rpmB + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center text-xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Rosca C */}
              <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-3 border-l-4 border-l-emerald-600 shadow-sm flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs sm:text-sm text-slate-800">Rosca C (Metalloceno / Ext)</span>
                    <span className="text-sm font-black text-emerald-600">{formatarPorcentagem(pctC)}</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-500">
                    Vazão: <strong className="text-slate-700">{vazaoC.toFixed(1).replace('.', ',')} kg/h</strong>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setRpmC(Math.max(0, rpmC - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center text-xs"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    id="rpmC"
                    value={rpmC}
                    step="any"
                    onChange={(e) => setRpmC(parseFloat(e.target.value) || 0)}
                    className="w-16 py-1 px-1.5 text-sm font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-emerald-600 bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => setRpmC(rpmC + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Rosca D */}
              <div className="bg-white border border-slate-200 rounded-xl p-2.5 sm:p-3 border-l-4 border-l-blue-600 shadow-sm flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xs sm:text-sm text-slate-800">Rosca D (Grande)</span>
                    <span className="text-sm font-black text-blue-700">{formatarPorcentagem(pctD)}</span>
                  </div>
                  <div className="text-[11px] font-bold text-slate-500">
                    Vazão: <strong className="text-slate-700">{vazaoD.toFixed(1).replace('.', ',')} kg/h</strong>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRpmAouDChange(rpmA, Math.max(0, rpmD - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center text-xs"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    id="rpmD"
                    value={rpmD}
                    step="any"
                    onChange={(e) => handleRpmAouDChange(rpmA, parseFloat(e.target.value) || 0)}
                    className="w-16 py-1 px-1.5 text-sm font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-blue-600 bg-slate-50"
                  />
                  <button
                    type="button"
                    onClick={() => handleRpmAouDChange(rpmA, rpmD + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center text-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Total das Camadas */}
              <div className="text-center font-black text-xs sm:text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 py-2 px-3 rounded-xl shadow-sm">
                Total das Camadas: {formatarPorcentagem(totalCamadas)}
              </div>
            </div>

            {/* COLUNA 3: Indicadores da Linha & Ação WhatsApp (3 colunas no desktop) */}
            <div className="col-span-3 flex flex-col justify-between space-y-3">
              {/* Indicadores da Linha (Card Azul) */}
              <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 text-white p-4 rounded-2xl shadow-lg border border-blue-500/30 flex-1 flex flex-col justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-center text-white/90 pb-2 border-b border-white/15 flex items-center justify-center gap-1.5">
                  <Activity size={15} className="text-yellow-300" />
                  Indicadores da Linha
                </h3>

                <div className="space-y-2 text-xs font-bold my-auto">
                  <div className="py-1 border-b border-white/10">
                    <span className="text-[11px] text-white/75 block">Taxa de Produção Total:</span>
                    <span className="text-yellow-300 font-black text-lg sm:text-xl block tracking-tight">
                      {taxaProducaoQuilos.toFixed(2).replace('.', ',')} Kg/h
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-white/10">
                    <span className="text-white/80 flex items-center gap-1 text-[11px]">
                      <Box size={13} className="text-blue-300" />
                      Paletes / Turno:
                    </span>
                    <span className="font-black text-white text-xs sm:text-sm">
                      {resultadoPalete}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-white/10">
                    <span className="text-white/80 flex items-center gap-1 text-[11px]">
                      <Clock size={13} className="text-blue-300" />
                      Tempo 1 Palete:
                    </span>
                    <span className="font-black text-white text-xs sm:text-sm">
                      {formatarTempo(tempoPalete)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-white/80 flex items-center gap-1 text-[11px]">
                      <Gauge size={13} className="text-emerald-300" />
                      Tempo Queda:
                    </span>
                    <span className="font-black text-emerald-300 text-xs sm:text-sm">
                      {tempoQuedaMinutos.replace('.', ',')} min
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 text-center">
                  <span className="text-[10px] text-white/60 font-medium">Turno Base: 12 Horas</span>
                </div>
              </div>

              {/* Card de Ação WhatsApp Direto */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-emerald-600/30 active:scale-95 cursor-pointer"
                >
                  <Share2 size={16} />
                  <span>Enviar no WhatsApp</span>
                </button>
                <p className="text-[10px] text-slate-400 text-center font-medium leading-tight">
                  Envia o resumo técnico completo com materiais, roscas e indicadores de produção.
                </p>
              </div>

              {/* Footer Assinatura Compacto */}
              <div className="text-center text-[10px] font-bold text-slate-400">
                Manupackaguing Fitasa e Amazônia desenvolvido por Adaias Melo
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
