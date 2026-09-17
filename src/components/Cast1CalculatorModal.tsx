import React, { useState, useEffect } from 'react';
import { X, Calculator, RefreshCw, Layers, Gauge, Activity, Clock, Box, Cpu, Share2 } from 'lucide-react';

interface Cast1CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemLogo?: string | null;
  isReadOnly?: boolean;
  onBlockedAction?: (title?: string, message?: string) => void;
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

export const Cast1CalculatorModal: React.FC<Cast1CalculatorModalProps> = ({ 
  isOpen, 
  onClose, 
  systemLogo,
  isReadOnly = false,
  onBlockedAction
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

  // Enviar os dados completos calculados pelo WhatsApp
  const handleShareWhatsApp = () => {
    if (isReadOnly) {
      if (onBlockedAction) {
        onBlockedAction('Compartilhamento Bloqueado', 'O compartilhamento de dados da calculadora via WhatsApp não é permitido no Modo de Leitura.');
      } else {
        alert('Compartilhamento não permitido no Modo de Leitura.');
      }
      return;
    }
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

  // Inicialização padrão ao abrir
  useEffect(() => {
    if (isOpen) {
      handleEspessuraChange(30);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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

  const effectiveLogo = 
    systemLogo || 
    (typeof window !== 'undefined' ? localStorage.getItem('manupackaging_system_logo') : null) || 
    "https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png";

  return (
    <div className="fixed inset-0 z-[330] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl lg:max-w-7xl max-h-[95vh] lg:max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header - Logo do Sistema + MANUPACKAGING com Linha CAST 1 embaixo + Título Calculadora Porcentagem + WhatsApp */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/40 flex-shrink-0">
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
            <div className="hidden sm:block h-6 w-px bg-slate-200 ml-1"></div>
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 text-xs font-black uppercase tracking-tight">
              <Calculator size={14} className="text-blue-600" />
              <span>Calculadora Porcentagem</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Enviar dados calculados pelo WhatsApp"
            >
              <Share2 size={14} />
              <span className="hidden sm:inline">Enviar no WhatsApp</span>
              <span className="sm:hidden">WhatsApp</span>
            </button>
            <button
              onClick={() => handleEspessuraChange(espessura)}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
              title="Resetar parâmetros da espessura atual"
            >
              <RefreshCw size={17} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body - Mobile View & Desktop 3 Columns View */}
        <div className="flex-1 overflow-y-auto lg:overflow-visible p-3 sm:p-5 bg-slate-50/60">
          
          {/* Mobile View: Layout tradicional fluido e compacto para celular */}
          <div className="block lg:hidden space-y-3">
            {/* Header Selects: Tipo de Material & Espessura (Lado a Lado no Celular) */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-2 gap-2.5">
              <div className="flex flex-col">
                <label htmlFor="modalTipoMaterialMobile" className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Layers size={13} className="text-blue-600" />
                  Tipo de Material
                </label>
                <select
                  id="modalTipoMaterialMobile"
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
                <label htmlFor="modalEspessuraMobile" className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Gauge size={13} className="text-blue-600" />
                  Espessura (µm)
                </label>
                <select
                  id="modalEspessuraMobile"
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
                  <label htmlFor="modalCalcGramaturaMobile" className="text-[10px] font-bold text-slate-600 mb-0.5 truncate">
                    Gramatura (g):
                  </label>
                  <input
                    type="number"
                    id="modalCalcGramaturaMobile"
                    value={gramatura}
                    step="any"
                    onChange={(e) => handleGramaturaChange(parseFloat(e.target.value) || 0)}
                    className="w-full py-1.5 px-2 text-xs sm:text-sm font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-blue-600 focus:bg-white transition-all bg-slate-50"
                  />
                </div>

                <div className="flex flex-col items-center">
                  <label htmlFor="modalCalcVelocidadeMobile" className="text-[10px] font-bold text-slate-600 mb-0.5 truncate">
                    Velocidade:
                  </label>
                  <input
                    type="number"
                    id="modalCalcVelocidadeMobile"
                    value={velocidade}
                    step="any"
                    onChange={(e) => handleVelocidadeChange(parseFloat(e.target.value) || 0)}
                    className="w-full py-1.5 px-2 text-xs sm:text-sm font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-blue-600 focus:bg-white transition-all bg-slate-50"
                  />
                </div>

                <div className="flex flex-col items-center">
                  <label htmlFor="modalCalcMetragemMobile" className="text-[10px] font-bold text-slate-600 mb-0.5 truncate">
                    Metragem (m):
                  </label>
                  <input
                    type="number"
                    id="modalCalcMetragemMobile"
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
                  <label htmlFor="modalRpmAMobile" className="block font-black text-xs sm:text-sm text-slate-800">
                    Rosca A
                  </label>
                  <span className="block text-[10px] font-semibold text-slate-400 mb-1.5 truncate">
                    Estrutural Grande
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500">RPM:</span>
                    <input
                      type="number"
                      id="modalRpmAMobile"
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
                    <label htmlFor="modalRpmBMobile" className="block font-black text-xs sm:text-sm text-slate-800">
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
                        id="modalRpmBMobile"
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
                          id="modalColaBMobile"
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
                  <label htmlFor="modalRpmCMobile" className="block font-black text-xs sm:text-sm text-slate-800">
                    Rosca C
                  </label>
                  <span className="block text-[10px] font-semibold text-slate-400 mb-1.5 truncate">
                    Metalloceno / Externa
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500">RPM:</span>
                    <input
                      type="number"
                      id="modalRpmCMobile"
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
                  <label htmlFor="modalRpmDMobile" className="block font-black text-xs sm:text-sm text-slate-800">
                    Rosca D
                  </label>
                  <span className="block text-[10px] font-semibold text-slate-400 mb-1.5 truncate">
                    Estrutural Grande
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-500">RPM:</span>
                    <input
                      type="number"
                      id="modalRpmDMobile"
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

            {/* Footer Assinatura Mobile */}
            <div className="text-center text-[10px] sm:text-[11px] font-bold text-slate-400 pt-1 pb-2">
              Manupackaguing Fitasa e Amazônia desenvolvido por Adaias Melo
            </div>
          </div>

          {/* Desktop View: Grid 3 Colunas */}
          <div className="hidden lg:grid grid-cols-12 gap-4 items-stretch">
            
            {/* COLUNA 1: Parâmetros e Produção da Linha */}
            <div className="col-span-4 flex flex-col gap-3">
              {/* Material e Espessura */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <label htmlFor="modalTipoMaterial" className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Layers size={13} className="text-blue-600" />
                      Material
                    </label>
                    <select
                      id="modalTipoMaterial"
                      value={tipoMaterial}
                      onChange={(e) => handleTipoMaterialChange(e.target.value as 'LC3' | 'LC2' | 'ATX')}
                      className="w-full py-2 px-3 text-xs sm:text-sm font-black border border-slate-300 rounded-xl bg-slate-50 text-slate-800 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-center"
                    >
                      <option value="LC3">LC3</option>
                      <option value="LC2">LC2</option>
                      <option value="ATX">ATX</option>
                    </select>
                  </div>

                  <div className="flex-1">
                    <label htmlFor="modalEspessura" className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Gauge size={13} className="text-blue-600" />
                      Espessura
                    </label>
                    <select
                      id="modalEspessura"
                      value={espessura}
                      onChange={(e) => handleEspessuraChange(parseFloat(e.target.value))}
                      className="w-full py-2 px-3 text-xs sm:text-sm font-black border border-slate-300 rounded-xl bg-slate-50 text-slate-800 outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-center"
                    >
                      {ESPESSURAS.map((esp) => (
                        <option key={esp} value={esp}>{esp} µm</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Dados de Produção da Linha */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Activity size={14} className="text-blue-600" />
                    Dados de Produção da Linha
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <label htmlFor="modalCalcGramatura" className="text-[11px] font-bold text-slate-600 mb-0.5 block">
                        Gramatura Nominal (g):
                      </label>
                      <input
                        type="number"
                        id="modalCalcGramatura"
                        value={gramatura}
                        step="any"
                        onChange={(e) => handleGramaturaChange(parseFloat(e.target.value) || 0)}
                        className="w-full py-1.5 px-3 text-sm font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-blue-600 focus:bg-white transition-all bg-slate-50"
                      />
                    </div>

                    <div>
                      <label htmlFor="modalCalcVelocidade" className="text-[11px] font-bold text-slate-600 mb-0.5 block">
                        Velocidade da Linha (m/min):
                      </label>
                      <input
                        type="number"
                        id="modalCalcVelocidade"
                        value={velocidade}
                        step="any"
                        onChange={(e) => handleVelocidadeChange(parseFloat(e.target.value) || 0)}
                        className="w-full py-1.5 px-3 text-sm font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-blue-600 focus:bg-white transition-all bg-slate-50"
                      />
                    </div>

                    <div>
                      <label htmlFor="modalCalcMetragem" className="text-[11px] font-bold text-slate-600 mb-0.5 block">
                        Metragem Automática (m):
                      </label>
                      <input
                        type="number"
                        id="modalCalcMetragem"
                        value={metragem}
                        step="any"
                        onChange={(e) => setMetragem(parseFloat(e.target.value) || 0)}
                        className="w-full py-1.5 px-3 text-sm font-black border-2 border-slate-200 rounded-xl outline-none text-center text-slate-800 focus:border-blue-600 focus:bg-white transition-all bg-slate-50"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 font-semibold mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span>Padrão 6 Bobinas</span>
                  <span>Largura 500 mm</span>
                </div>
              </div>
            </div>

            {/* COLUNA 2: As 4 Roscas (A, B, C, D) + Total das Camadas */}
            <div className="col-span-5 flex flex-col justify-between gap-3">
              <div className="grid grid-cols-2 gap-2.5">
                {/* Rosca A */}
                <div className="bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 border-t-4 border-t-blue-600 shadow-sm flex flex-col justify-between">
                  <div>
                    <label htmlFor="modalRpmA" className="block font-black text-xs sm:text-sm text-slate-800">
                      Rosca A
                    </label>
                    <span className="block text-[10px] font-semibold text-slate-400 mb-1.5">
                      Estrutural Grande
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500">RPM:</span>
                      <input
                        type="number"
                        id="modalRpmA"
                        value={rpmA}
                        step="any"
                        onChange={(e) => handleRpmAouDChange(parseFloat(e.target.value) || 0, rpmD)}
                        className="w-full py-1 px-2 text-sm sm:text-base font-black border-2 border-slate-200 rounded-lg outline-none text-center text-slate-800 focus:border-blue-600 bg-slate-50"
                      />
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-dashed border-slate-200 text-center">
                    <div className="text-base sm:text-lg font-black text-blue-700">{formatarPorcentagem(pctA)}</div>
                    <div className="text-[11px] font-bold text-slate-500">{vazaoA.toFixed(1).replace('.', ',')} kg/h</div>
                  </div>
                </div>

                {/* Rosca B */}
                <div className="bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 border-t-4 border-t-amber-600 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="modalRpmB" className="block font-black text-xs sm:text-sm text-slate-800">
                        Rosca B
                      </label>
                      {porcentagemCola > 0 && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                          -Cola
                        </span>
                      )}
                    </div>
                    <span className="block text-[10px] font-semibold text-slate-400 mb-1.5">
                      Pega / Interna
                    </span>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-500 w-10 shrink-0">RPM:</span>
                        <input
                          type="number"
                          id="modalRpmB"
                          value={rpmB}
                          step="any"
                          onChange={(e) => setRpmB(parseFloat(e.target.value) || 0)}
                          className="w-full py-1 px-2 text-sm sm:text-base font-black border-2 border-slate-200 rounded-lg outline-none text-center text-slate-800 focus:border-amber-600 bg-slate-50"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-amber-700 w-10 shrink-0 leading-tight" title="Porcentagem de Cola no Dosador (Vistamaxx)">Cola %:</span>
                        <input
                          type="number"
                          id="modalColaB"
                          value={porcentagemCola === 0 ? '' : porcentagemCola}
                          placeholder="0,00"
                          step="any"
                          min="0"
                          max="100"
                          onChange={(e) => handleColaChange(parseFloat(e.target.value))}
                          className="w-full py-1 px-2 text-xs sm:text-sm font-black border-2 border-amber-200 rounded-lg outline-none text-center text-amber-900 focus:border-amber-600 bg-amber-50/50"
                          title="Porcentagem de Cola no Dosador (Vistamaxx) para descontar da Rosca B"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-dashed border-slate-200 text-center">
                    <div className="text-base sm:text-lg font-black text-amber-600">{formatarPorcentagem(pctBLiquida)}</div>
                    {porcentagemCola > 0 && (
                      <div className="text-[9px] font-bold text-amber-700 bg-amber-50 py-0.5 px-1 rounded mt-0.5 inline-block">
                        Bruta: {formatarPorcentagem(pctB)} (-{formatarPorcentagem(porcentagemCola)} cola)
                      </div>
                    )}
                    <div className="text-[11px] font-bold text-slate-500">{vazaoB.toFixed(1).replace('.', ',')} kg/h</div>
                  </div>
                </div>

                {/* Rosca C */}
                <div className="bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 border-t-4 border-t-emerald-600 shadow-sm flex flex-col justify-between">
                  <div>
                    <label htmlFor="modalRpmC" className="block font-black text-xs sm:text-sm text-slate-800">
                      Rosca C
                    </label>
                    <span className="block text-[10px] font-semibold text-slate-400 mb-1.5">
                      Metalloceno / Externa
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500">RPM:</span>
                      <input
                        type="number"
                        id="modalRpmC"
                        value={rpmC}
                        step="any"
                        onChange={(e) => setRpmC(parseFloat(e.target.value) || 0)}
                        className="w-full py-1 px-2 text-sm sm:text-base font-black border-2 border-slate-200 rounded-lg outline-none text-center text-slate-800 focus:border-emerald-600 bg-slate-50"
                      />
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-dashed border-slate-200 text-center">
                    <div className="text-base sm:text-lg font-black text-emerald-600">{formatarPorcentagem(pctC)}</div>
                    <div className="text-[11px] font-bold text-slate-500">{vazaoC.toFixed(1).replace('.', ',')} kg/h</div>
                  </div>
                </div>

                {/* Rosca D */}
                <div className="bg-white border border-slate-200 rounded-2xl p-2.5 sm:p-3 border-t-4 border-t-blue-600 shadow-sm flex flex-col justify-between">
                  <div>
                    <label htmlFor="modalRpmD" className="block font-black text-xs sm:text-sm text-slate-800">
                      Rosca D
                    </label>
                    <span className="block text-[10px] font-semibold text-slate-400 mb-1.5">
                      Estrutural Grande
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500">RPM:</span>
                      <input
                        type="number"
                        id="modalRpmD"
                        value={rpmD}
                        step="any"
                        onChange={(e) => handleRpmAouDChange(rpmA, parseFloat(e.target.value) || 0)}
                        className="w-full py-1 px-2 text-sm sm:text-base font-black border-2 border-slate-200 rounded-lg outline-none text-center text-slate-800 focus:border-blue-600 bg-slate-50"
                      />
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-dashed border-slate-200 text-center">
                    <div className="text-base sm:text-lg font-black text-blue-700">{formatarPorcentagem(pctD)}</div>
                    <div className="text-[11px] font-bold text-slate-500">{vazaoD.toFixed(1).replace('.', ',')} kg/h</div>
                  </div>
                </div>
              </div>

              {/* Total das Camadas */}
              <div className="text-center font-black text-xs sm:text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 py-2 px-3 rounded-xl shadow-sm">
                Total das Camadas: {formatarPorcentagem(totalCamadas)}
              </div>
            </div>

            {/* COLUNA 3: Indicadores de Produção + WhatsApp */}
            <div className="col-span-3 flex flex-col justify-between gap-3">
              <div className="bg-gradient-to-br from-blue-700 to-indigo-900 text-white p-4 rounded-2xl shadow-md border border-blue-500/30 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-center text-white/90 mb-3 pb-1.5 border-b border-white/15 flex items-center justify-center gap-1.5">
                    <Cpu size={14} className="text-yellow-300" />
                    Indicadores da Linha
                  </h3>

                  <div className="space-y-2 text-xs font-bold">
                    <div className="flex items-center justify-between py-1 border-b border-white/10">
                      <span className="text-white/80 text-[11px]">Taxa Total:</span>
                      <span className="text-yellow-300 font-black text-sm sm:text-base">
                        {taxaProducaoQuilos.toFixed(2).replace('.', ',')} Kg/h
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-white/10">
                      <span className="text-white/80 text-[11px] flex items-center gap-1">
                        <Box size={13} className="text-blue-300" />
                        Paletes / Turno:
                      </span>
                      <span className="font-black text-white text-xs sm:text-sm">
                        {resultadoPalete} (12h)
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-white/10">
                      <span className="text-white/80 text-[11px] flex items-center gap-1">
                        <Clock size={13} className="text-blue-300" />
                        Tempo 1 Palete:
                      </span>
                      <span className="font-black text-white text-xs sm:text-sm">
                        {formatarTempo(tempoPalete)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-white/80 text-[11px] flex items-center gap-1">
                        <Gauge size={13} className="text-emerald-300" />
                        Tempo Queda:
                      </span>
                      <span className="font-black text-emerald-300 text-xs sm:text-sm">
                        {tempoQuedaMinutos.replace('.', ',')} min
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-white/10 text-center">
                  <span className="text-[10px] text-blue-200">
                    Cálculo baseado em 50 kg / bobina
                  </span>
                </div>
              </div>

              {/* Botão de WhatsApp em destaque */}
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
              >
                <Share2 size={15} />
                <span>Enviar no WhatsApp</span>
              </button>
            </div>

          </div>

          {/* Assinatura */}
          <div className="text-center text-[10px] font-bold text-slate-400 pt-2 sm:pt-3">
            Manupackaguing Fitasa e Amazônia desenvolvido por Adaias Melo
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-2.5 border-t border-slate-100 bg-white flex items-center justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:bg-slate-900 active:scale-95 transition-all shadow-sm cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
