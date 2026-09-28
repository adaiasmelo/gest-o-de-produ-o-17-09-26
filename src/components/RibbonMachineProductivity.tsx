import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Gauge,
  Clock,
  Settings,
  Package,
  Layers,
  RotateCcw,
  Mail,
  Download,
  Share2,
  FileText,
  Box,
  Cpu,
  Zap,
  CheckCircle2,
  Lock,
  ArrowRight,
  Info,
  Check,
  TrendingUp,
  Percent,
  Timer,
  Sliders,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { downloadOutlookEml, copyRichAndPlainText, getFormattedFileDate } from '../utils/outlookEml';

export type TapeMachine = 'LINTECH' | 'GHEZZI' | 'WULTEC';

interface RibbonMachineProductivityProps {
  initialMachine?: TapeMachine;
  isReadOnlyAccount?: boolean;
  onBlockedReadOnlyAction?: (title: string, message: string) => void;
}

// 1. Parâmetros Fixos do Sistema (Valores Padrão Travados)
const FIXED_PARAMS = {
  filmSpec: 'BOPP 38 micras (Exclusivo)',
  jumboWidthMm: 1600,
  jumboLengthM: 8000,
  rollsPerBox: 72,
  boxesPerPallet: 56,
  rollsPerPallet: 4032, // 72 * 56
  jumboSetupMinutes: 40, // 2.400 segundos
  jumboSetupSeconds: 2400,
  jumboAreaM2: 12800, // 1.6m * 8000m
};

// Matriz de tempos padrão da engenharia por formato
interface PresetFormat {
  widthMm: number;
  lengthM: number;
  defaultRollsPerCycle: number;
  cuttingTimeSeconds: number;
}

const PRESET_FORMATS: PresetFormat[] = [
  { widthMm: 24, lengthM: 100, defaultRollsPerCycle: 67, cuttingTimeSeconds: 46.91 },
  { widthMm: 24, lengthM: 90, defaultRollsPerCycle: 67, cuttingTimeSeconds: 43.16 },
  { widthMm: 24, lengthM: 40, defaultRollsPerCycle: 67, cuttingTimeSeconds: 24.40 },
  { widthMm: 36, lengthM: 100, defaultRollsPerCycle: 43, cuttingTimeSeconds: 46.91 },
  { widthMm: 36, lengthM: 90, defaultRollsPerCycle: 43, cuttingTimeSeconds: 43.16 },
  { widthMm: 36, lengthM: 40, defaultRollsPerCycle: 43, cuttingTimeSeconds: 24.40 },
  { widthMm: 45, lengthM: 100, defaultRollsPerCycle: 35, cuttingTimeSeconds: 46.91 },
  { widthMm: 45, lengthM: 90, defaultRollsPerCycle: 35, cuttingTimeSeconds: 43.16 },
  { widthMm: 45, lengthM: 40, defaultRollsPerCycle: 35, cuttingTimeSeconds: 24.40 },
  { widthMm: 72, lengthM: 100, defaultRollsPerCycle: 21, cuttingTimeSeconds: 46.91 },
  { widthMm: 72, lengthM: 90, defaultRollsPerCycle: 21, cuttingTimeSeconds: 43.16 },
  { widthMm: 72, lengthM: 40, defaultRollsPerCycle: 21, cuttingTimeSeconds: 24.40 },
];

const DEFAULT_UNLOAD_SHAFTS_SECONDS = 32.74;
const DEFAULT_WASHER_BASE_SECONDS = 30.29;

const MACHINE_CONFIGS: Record<TapeMachine, { name: string; tag: string; badgeColor: string; description: string }> = {
  LINTECH: {
    name: 'Cortadora Lintech',
    tag: 'LINTECH',
    badgeColor: 'bg-blue-600 text-white border-blue-500',
    description: 'Cortadora automática de alta precisão com controle eletrônico de eixos.',
  },
  GHEZZI: {
    name: 'Cortadora Ghezzi',
    tag: 'GHEZZI',
    badgeColor: 'bg-indigo-600 text-white border-indigo-500',
    description: 'Cortadora de corte contínuo com setup balanceado para rolos industriais.',
  },
  WULTEC: {
    name: 'Cortadora Wultec',
    tag: 'WULTEC',
    badgeColor: 'bg-amber-600 text-white border-amber-500',
    description: 'Cortadora robusta especializada em fitas adesivas em formatos de alto giro.',
  },
};

export const RibbonMachineProductivity: React.FC<RibbonMachineProductivityProps> = ({
  initialMachine = 'LINTECH',
  isReadOnlyAccount = false,
  onBlockedReadOnlyAction,
}) => {
  // 1. Seletor de Máquina
  const [selectedMachine, setSelectedMachine] = useState<TapeMachine>(initialMachine);

  // 2. Entradas Editáveis - Turno de Trabalho
  const [shiftStart, setShiftStart] = useState<string>('07:30');
  const [shiftEnd, setShiftEnd] = useState<string>('17:18');
  const [lunchBreakMinutes, setLunchBreakMinutes] = useState<number>(60);

  // 3. Formato Selecionado
  const [selectedWidthMm, setSelectedWidthMm] = useState<number>(45);
  const [selectedLengthM, setSelectedLengthM] = useState<number>(100);

  // 4. Tempos Editáveis Linha por Linha
  const [rollsPerCycle, setRollsPerCycle] = useState<number>(35);
  const [cuttingTimeSeconds, setCuttingTimeSeconds] = useState<number>(46.91);
  const [unloadShaftsSeconds, setUnloadShaftsSeconds] = useState<number>(DEFAULT_UNLOAD_SHAFTS_SECONDS);
  const [washerChangeSeconds, setWasherChangeSeconds] = useState<number>(DEFAULT_WASHER_BASE_SECONDS);
  const [washerMultiplier, setWasherMultiplier] = useState<number>(1); // 1x, 2x, 3x

  // Modal / Menu de e-mail e status
  const [openEmailMenu, setOpenEmailMenu] = useState<boolean>(false);
  const [copySuccessNotice, setCopySuccessNotice] = useState<string | null>(null);

  // Sincroniza parâmetros quando o formato selecionado mudar (largura ou metragem)
  const handleSelectFormat = (width: number, length: number) => {
    setSelectedWidthMm(width);
    setSelectedLengthM(length);

    // Encontra padrão na matriz
    const preset = PRESET_FORMATS.find(p => p.widthMm === width && p.lengthM === length);
    if (preset) {
      setRollsPerCycle(preset.defaultRollsPerCycle);
      setCuttingTimeSeconds(preset.cuttingTimeSeconds);
    } else {
      // Cálculo aproximado se não achar
      const autoRolls = Math.floor(FIXED_PARAMS.jumboWidthMm / width);
      setRollsPerCycle(autoRolls);
      const autoCut = length === 100 ? 46.91 : length === 90 ? 43.16 : 24.40;
      setCuttingTimeSeconds(autoCut);
    }
  };

  // Troca rápida de multiplicador de arruelas
  const handleSetWasherMultiplier = (mult: number) => {
    setWasherMultiplier(mult);
    const calculated = Number((DEFAULT_WASHER_BASE_SECONDS * mult).toFixed(2));
    setWasherChangeSeconds(calculated);
  };

  // Restaura padrões de fábrica / matriz de teste
  const handleResetToDefaults = () => {
    setShiftStart('07:30');
    setShiftEnd('17:18');
    setLunchBreakMinutes(60);
    setSelectedWidthMm(45);
    setSelectedLengthM(100);
    setRollsPerCycle(35);
    setCuttingTimeSeconds(46.91);
    setUnloadShaftsSeconds(DEFAULT_UNLOAD_SHAFTS_SECONDS);
    setWasherMultiplier(1);
    setWasherChangeSeconds(DEFAULT_WASHER_BASE_SECONDS);

    showNotification('Padrões da matriz de teste restaurados com sucesso!');
  };

  const showNotification = (msg: string) => {
    setCopySuccessNotice(msg);
    setTimeout(() => {
      setCopySuccessNotice(null);
    }, 3500);
  };

  // ==========================================
  // CÁLCULOS AUTOMÁTICOS EM TEMPO REAL
  // ==========================================
  const calculations = useMemo(() => {
    // 1. Tempo Útil do Turno
    const [startH, startM] = shiftStart.split(':').map(Number);
    const [endH, endM] = shiftEnd.split(':').map(Number);

    let grossMinutes = (isNaN(endH) ? 0 : endH * 60) + (isNaN(endM) ? 0 : endM) - ((isNaN(startH) ? 0 : startH * 60) + (isNaN(startM) ? 0 : startM));
    if (grossMinutes < 0) {
      grossMinutes += 24 * 60; // Virada de noite / dia
    }

    const breakMin = Math.max(0, Number(lunchBreakMinutes) || 0);
    const netWorkingMinutes = Math.max(0, grossMinutes - breakMin);
    const netWorkingSeconds = netWorkingMinutes * 60;

    // 2. Tempos Operacionais
    const manualTotalSeconds = Number(unloadShaftsSeconds || 0) + Number(washerChangeSeconds || 0);
    const totalCycleSeconds = Number(cuttingTimeSeconds || 0) + manualTotalSeconds;

    // 3. Autonomia do Jumbo
    // Quantidade de ciclos por jumbo de 8.000m
    const safeLength = selectedLengthM > 0 ? selectedLengthM : 100;
    const cyclesPerJumbo = FIXED_PARAMS.jumboLengthM / safeLength;

    const jumboPureRunSeconds = cyclesPerJumbo * totalCycleSeconds;
    const jumboPureRunMinutes = jumboPureRunSeconds / 60;

    // Tempo total de 1 jumbo incluindo o Setup (40 min = 2.400s)
    const jumboTotalWithSetupSeconds = jumboPureRunSeconds + FIXED_PARAMS.jumboSetupSeconds;
    const jumboTotalWithSetupMinutes = jumboTotalWithSetupSeconds / 60;

    // 4. Quantidade de Jumbos e Ciclos no Turno
    // No tempo útil do turno (ex: 528 min = 31.680s):
    // Cada jumbo completo gasta (jumboPureRunSeconds + 2400s de setup).
    let completedJumbos = 0;
    let setupsInShift = 0;
    let totalCyclesInShift = 0;
    let actualSetupSeconds = 0;
    let actualCycleSeconds = 0;

    if (totalCycleSeconds > 0 && netWorkingSeconds > 0) {
      if (jumboTotalWithSetupSeconds > 0) {
        completedJumbos = Math.floor(netWorkingSeconds / jumboTotalWithSetupSeconds);
        const remainderSeconds = netWorkingSeconds % jumboTotalWithSetupSeconds;

        if (completedJumbos > 0) {
          setupsInShift = completedJumbos;
          actualSetupSeconds += completedJumbos * FIXED_PARAMS.jumboSetupSeconds;
          totalCyclesInShift += completedJumbos * cyclesPerJumbo;
        }

        // Verifica se no tempo restante há setup e ciclos parciais
        if (remainderSeconds >= FIXED_PARAMS.jumboSetupSeconds) {
          setupsInShift += 1;
          actualSetupSeconds += FIXED_PARAMS.jumboSetupSeconds;
          const remainingForCutting = remainderSeconds - FIXED_PARAMS.jumboSetupSeconds;
          const extraCycles = Math.min(cyclesPerJumbo, Math.floor(remainingForCutting / totalCycleSeconds));
          totalCyclesInShift += extraCycles;
        } else if (completedJumbos === 0 && remainderSeconds > 0) {
          // Se o turno for menor que o tempo de setup do jumbo, conta 1 setup parcial
          setupsInShift = 1;
          actualSetupSeconds += remainderSeconds;
        }
      }
    }

    actualCycleSeconds = totalCyclesInShift * totalCycleSeconds;

    // Jumbos equivalentes consumidos no turno
    const jumbosConsumedEquivalent = (totalCyclesInShift * safeLength) / FIXED_PARAMS.jumboLengthM;

    // 5. Produção Total do Turno
    const totalRolls = Math.round(totalCyclesInShift * (rollsPerCycle || 0));
    const closedBoxes = Math.floor(totalRolls / FIXED_PARAMS.rollsPerBox);
    const remainingRollsInBox = totalRolls % FIXED_PARAMS.rollsPerBox;
    const closedPallets = Math.floor(closedBoxes / FIXED_PARAMS.boxesPerPallet);
    const remainingBoxesInPallet = closedBoxes % FIXED_PARAMS.boxesPerPallet;
    const palletsDecimal = closedBoxes / FIXED_PARAMS.boxesPerPallet;

    // Metragem linear e m²
    const totalLinearMeters = totalCyclesInShift * safeLength;
    const totalM2 = totalRolls * (selectedWidthMm / 1000) * safeLength;

    // Indicadores de ritmo
    const hoursUseful = netWorkingMinutes / 60;
    const rollsPerHour = hoursUseful > 0 ? Math.round(totalRolls / hoursUseful) : 0;
    const m2PerHour = hoursUseful > 0 ? Math.round(totalM2 / hoursUseful) : 0;
    const boxesPerHour = hoursUseful > 0 ? (closedBoxes / hoursUseful).toFixed(1) : '0';

    // Divisão percentual de tempo
    const accountedSeconds = Math.max(1, actualCycleSeconds + actualSetupSeconds);
    const cutShare = ((actualCycleSeconds * (cuttingTimeSeconds / Math.max(1, totalCycleSeconds))) / accountedSeconds) * 100;
    const manualShare = ((actualCycleSeconds * (manualTotalSeconds / Math.max(1, totalCycleSeconds))) / accountedSeconds) * 100;
    const setupShare = (actualSetupSeconds / accountedSeconds) * 100;

    return {
      grossMinutes,
      netWorkingMinutes,
      netWorkingSeconds,
      manualTotalSeconds,
      totalCycleSeconds,
      cyclesPerJumbo,
      jumboPureRunSeconds,
      jumboPureRunMinutes,
      jumboTotalWithSetupSeconds,
      jumboTotalWithSetupMinutes,
      completedJumbos,
      setupsInShift,
      totalCyclesInShift,
      jumbosConsumedEquivalent,
      totalRolls,
      closedBoxes,
      remainingRollsInBox,
      closedPallets,
      remainingBoxesInPallet,
      palletsDecimal,
      totalLinearMeters,
      totalM2,
      rollsPerHour,
      m2PerHour,
      boxesPerHour,
      cutShare,
      manualShare,
      setupShare,
    };
  }, [
    shiftStart,
    shiftEnd,
    lunchBreakMinutes,
    selectedWidthMm,
    selectedLengthM,
    rollsPerCycle,
    cuttingTimeSeconds,
    unloadShaftsSeconds,
    washerChangeSeconds,
  ]);

  // Formatação de segundos em mm:ss ou hh:mm:ss
  const formatSecondsToHms = (sec: number) => {
    const totalSec = Math.round(sec);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}min ${String(s).padStart(2, '0')}s`;
    }
    return `${String(m).padStart(2, '0')}min ${String(s).padStart(2, '0')}s`;
  };

  // ==========================================
  // EXPORTAÇÃO 1: GERAR E BAIXAR PDF (A4)
  // ==========================================
  const handleExportPDF = () => {
    if (isReadOnlyAccount) {
      onBlockedReadOnlyAction?.('Download Bloqueado', 'O download de relatórios não é permitido no Modo de Leitura.');
      return;
    }

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const machineInfo = MACHINE_CONFIGS[selectedMachine];
      const nowStr = new Date().toLocaleDateString('pt-BR');
      const timeStr = new Date().toLocaleTimeString('pt-BR');

      // 1. Cabeçalho Corporativo
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 38, 'F');

      // Título
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('ANÁLISE DE PRODUTIVIDADE & CAPACIDADE', 14, 16);

      doc.setFontSize(11);
      doc.setTextColor(56, 189, 248); // sky-400
      doc.text(`MÁQUINA: ${machineInfo.name.toUpperCase()} (FITA ADESIVA)`, 14, 23);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(203, 213, 225); // slate-300
      doc.text(`EMISSÃO: ${nowStr} ÀS ${timeStr} | FORMATO: ${selectedWidthMm}mm x ${selectedLengthM}m | FILME: ${FIXED_PARAMS.filmSpec}`, 14, 30);

      // Faixa de destaque azul
      doc.setFillColor(37, 99, 235); // blue-600
      doc.rect(0, 38, 210, 2, 'F');

      let currentY = 48;

      // 2. Bloco: Parâmetros Fixos e Turno (Tabela Lado a Lado)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('1. PARÂMETROS DE ENGENHARIA & TURNO DE TRABALHO', 14, currentY);

      currentY += 4;
      autoTable(doc, {
        startY: currentY,
        head: [['Parâmetro', 'Valor do Sistema', 'Parâmetro Operacional', 'Valor Configurado']],
        body: [
          ['Especificação do Filme', FIXED_PARAMS.filmSpec, 'Horário do Turno', `${shiftStart} às ${shiftEnd}`],
          ['Dimensões do Jumbo', '1.600 mm x 8.000 m (12.800 m²)', 'Almoço / Paradas', `${lunchBreakMinutes} min`],
          ['Padrão da Caixa', '72 rolos / caixa', 'Tempo Útil Disponível', `${calculations.netWorkingMinutes} min (${formatSecondsToHms(calculations.netWorkingSeconds)})`],
          ['Padrão do Pallet', '4.032 rolos (56 caixas)', 'Formato de Fita', `${selectedWidthMm} mm x ${selectedLengthM} metros`],
          ['Tempo Setup Jumbo', '40 minutos (2.400 segundos)', 'Rolos por Ciclo', `${rollsPerCycle} rolos / ciclo`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 45 },
          1: { cellWidth: 55 },
          2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 45 },
          3: { cellWidth: 45 },
        },
      });

      // @ts-expect-error autoTable adds lastAutoTable
      currentY = doc.lastAutoTable.finalY + 8;

      // 3. Bloco: Decomposição de Tempos do Ciclo
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('2. TEMPOS UNITÁRIOS DE OPERAÇÃO & CICLO DE CORTE', 14, currentY);

      currentY += 4;
      autoTable(doc, {
        startY: currentY,
        head: [['Etapa do Processo', 'Tempo (s)', 'Tempo (min)', '% do Ciclo', 'Status / Observação']],
        body: [
          ['Corte Automático da Máquina', `${cuttingTimeSeconds.toFixed(2)} s`, `${(cuttingTimeSeconds / 60).toFixed(2)} min`, `${((cuttingTimeSeconds / calculations.totalCycleSeconds) * 100).toFixed(1)}%`, `Metragem de ${selectedLengthM}m`],
          ['Descarregar Eixos / Rolos', `${unloadShaftsSeconds.toFixed(2)} s`, `${(unloadShaftsSeconds / 60).toFixed(2)} min`, `${((unloadShaftsSeconds / calculations.totalCycleSeconds) * 100).toFixed(1)}%`, 'Tempo manual do operador'],
          ['Troca de Arruelas / Operador', `${washerChangeSeconds.toFixed(2)} s`, `${(washerChangeSeconds / 60).toFixed(2)} min`, `${((washerChangeSeconds / calculations.totalCycleSeconds) * 100).toFixed(1)}%`, `${washerMultiplier}x base de troca`],
          ['Tempo Manual Total (Operador)', `${calculations.manualTotalSeconds.toFixed(2)} s`, `${(calculations.manualTotalSeconds / 60).toFixed(2)} min`, `${((calculations.manualTotalSeconds / calculations.totalCycleSeconds) * 100).toFixed(1)}%`, 'Descarregar + Arruelas'],
          ['TEMPO DO CICLO TOTAL', `${calculations.totalCycleSeconds.toFixed(2)} s`, `${(calculations.totalCycleSeconds / 60).toFixed(2)} min`, '100.0%', 'Tempo total de 1 ciclo completo'],
        ],
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2.2, textColor: [30, 41, 59] },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'right', fontStyle: 'bold' },
          2: { halign: 'right' },
          3: { halign: 'right' },
        },
      });

      // @ts-expect-error autoTable adds lastAutoTable
      currentY = doc.lastAutoTable.finalY + 8;

      // 4. Bloco: Resultados e Capacidade do Turno
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('3. RESULTADOS DE CAPACIDADE & PRODUÇÃO TOTAL DO TURNO', 14, currentY);

      currentY += 4;
      autoTable(doc, {
        startY: currentY,
        head: [['Métrica de Produtividade', 'Resultado do Turno', 'Unidade / Detalhes']],
        body: [
          ['Autonomia de 1 Jumbo (sem setup)', `${calculations.jumboPureRunMinutes.toFixed(2)} min (${formatSecondsToHms(calculations.jumboPureRunSeconds)})`, `${calculations.cyclesPerJumbo.toFixed(0)} ciclos por jumbo`],
          ['Tempo Total por Jumbo (com setup)', `${calculations.jumboTotalWithSetupMinutes.toFixed(2)} min (${formatSecondsToHms(calculations.jumboTotalWithSetupSeconds)})`, 'Inclui 40 min de setup'],
          ['Setups Realizados no Turno', `${calculations.setupsInShift} trocas`, '40 min por troca de jumbo'],
          ['Jumbos Consumidos (Equivalente)', `${calculations.jumbosConsumedEquivalent.toFixed(2)} jumbos`, `${calculations.totalLinearMeters.toLocaleString('pt-BR')} metros lineares`],
          ['Ciclos Totais no Turno', `${calculations.totalCyclesInShift} ciclos`, 'Ciclos efetivos executados'],
          ['QUANTIDADE TOTAL DE ROLOS', `${calculations.totalRolls.toLocaleString('pt-BR')} rolos`, 'Produção líquida estimada'],
          ['CAIXAS FECHADAS', `${calculations.closedBoxes.toLocaleString('pt-BR')} caixas (+${calculations.remainingRollsInBox} rolos)`, 'Padrão 72 rolos por caixa'],
          ['PALLETS FECHADOS', `${calculations.closedPallets} pallets (${calculations.palletsDecimal.toFixed(2)} plts)`, '56 caixas (4.032 rolos por pallet)'],
          ['Área Total Convertida (m²)', `${calculations.totalM2.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m²`, `${calculations.m2PerHour.toLocaleString('pt-BR')} m²/hora`],
          ['Ritmo de Produção Estimado', `${calculations.rollsPerHour.toLocaleString('pt-BR')} rolos/h`, `${calculations.boxesPerHour} caixas/h`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2.2, textColor: [30, 41, 59] },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 70 },
          1: { fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 65 },
          2: { cellWidth: 55, textColor: [71, 85, 105] },
        },
      });

      // Rodapé
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Sistema de Gestão & Controle de Produção • Relatório gerado automaticamente pela Matriz de Produtividade.', 14, 287);
      doc.text(`Página 1 de 1`, 185, 287);

      doc.save(`Analise_Produtividade_${selectedMachine}_${selectedWidthMm}mmx${selectedLengthM}m.pdf`);
      showNotification('PDF gerado e baixado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Ocorreu um erro ao gerar o relatório em PDF.');
    }
  };

  // ==========================================
  // EXPORTAÇÃO 2: E-MAIL OUTLOOK (.eml e mailto)
  // ==========================================
  const generateEmailHTML = () => {
    const machine = MACHINE_CONFIGS[selectedMachine];
    const nowStr = new Date().toLocaleDateString('pt-BR');
    const timeStr = new Date().toLocaleTimeString('pt-BR');

    return `
      <div style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1e293b; max-width: 680px;">
        <div style="background-color: #f0f9ff; color: #0c4a6e; padding: 18px 20px; border-radius: 8px 8px 0 0; border: 1px solid #bfdbfe; border-bottom: 3px solid #2563eb;">
          <h2 style="margin: 0; font-size: 18px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; color: #1e3a8a;">
            Análise de Produtividade & Capacidade
          </h2>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #0284c7; font-weight: bold;">
            ${machine.name.toUpperCase()} • FORMATO: ${selectedWidthMm}mm × ${selectedLengthM}m
          </p>
        </div>

        <div style="padding: 16px; border: 1px solid #cbd5e1; border-top: none; background-color: #f8fafc; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 12px 0; font-size: 13px; color: #475569;">
            Segue o relatório consolidado de capacidade produtiva simulado em <strong>${nowStr} às ${timeStr}</strong>:
          </p>

          <!-- Bloco Resumo de Produção -->
          <div style="background-color: #eff6ff; border: 2px solid #3b82f6; border-radius: 6px; padding: 12px 16px; margin-bottom: 14px;">
            <div style="font-size: 13px; font-weight: bold; color: #1e3a8a; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #bfdbfe; padding-bottom: 4px;">
              📊 Produção Estimada do Turno (${calculations.netWorkingMinutes} min úteis)
            </div>
            <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 13px; color: #1e293b;">
              <tr>
                <td width="50%">• <strong>Total de Rolos:</strong> ${calculations.totalRolls.toLocaleString('pt-BR')} un</td>
                <td width="50%">• <strong>Caixas Fechadas:</strong> ${calculations.closedBoxes.toLocaleString('pt-BR')} cx (+${calculations.remainingRollsInBox} rolos)</td>
              </tr>
              <tr>
                <td>• <strong>Pallets Fechados:</strong> ${calculations.closedPallets} plts (${calculations.palletsDecimal.toFixed(2)} plts)</td>
                <td>• <strong>Jumbos Consumidos:</strong> ${calculations.jumbosConsumedEquivalent.toFixed(2)} jumbos (${calculations.setupsInShift} setups)</td>
              </tr>
              <tr>
                <td>• <strong>Área Convertida:</strong> ${calculations.totalM2.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m²</td>
                <td>• <strong>Ritmo:</strong> ${calculations.rollsPerHour.toLocaleString('pt-BR')} rolos/h (${calculations.boxesPerHour} cx/h)</td>
              </tr>
            </table>
          </div>

          <!-- Bloco Tempos de Ciclo -->
          <div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 16px; margin-bottom: 14px;">
            <div style="font-size: 13px; font-weight: bold; color: #334155; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
              ⏱️ Decomposição dos Tempos de Ciclo
            </div>
            <table width="100%" cellpadding="3" cellspacing="0" style="font-size: 13px; color: #1e293b;">
              <tr>
                <td>• <strong>Tempo de Corte Máquina:</strong></td>
                <td align="right"><strong>${cuttingTimeSeconds.toFixed(2)} s</strong> (${(cuttingTimeSeconds / 60).toFixed(2)} min)</td>
              </tr>
              <tr>
                <td>• <strong>Descarregar Eixos:</strong></td>
                <td align="right"><strong>${unloadShaftsSeconds.toFixed(2)} s</strong></td>
              </tr>
              <tr>
                <td>• <strong>Troca de Arruelas (${washerMultiplier}x):</strong></td>
                <td align="right"><strong>${washerChangeSeconds.toFixed(2)} s</strong></td>
              </tr>
              <tr>
                <td>• <strong>Tempo Manual Total:</strong></td>
                <td align="right" style="color: #ea580c;"><strong>${calculations.manualTotalSeconds.toFixed(2)} s</strong></td>
              </tr>
              <tr style="border-top: 1px dashed #cbd5e1;">
                <td style="padding-top: 6px;">• <strong>TEMPO DO CICLO TOTAL:</strong></td>
                <td align="right" style="padding-top: 6px; color: #2563eb; font-size: 14px;"><strong>${calculations.totalCycleSeconds.toFixed(2)} s (${(calculations.totalCycleSeconds / 60).toFixed(2)} min)</strong></td>
              </tr>
              <tr>
                <td>• <strong>Autonomia do Jumbo (8.000m):</strong></td>
                <td align="right"><strong>${calculations.jumboPureRunMinutes.toFixed(2)} min</strong> (${formatSecondsToHms(calculations.jumboPureRunSeconds)})</td>
              </tr>
            </table>
          </div>

          <!-- Parâmetros Fixos -->
          <div style="font-size: 11px; color: #64748b; padding: 8px 12px; background-color: #f1f5f9; border-radius: 6px;">
            <strong>Parâmetros Fixos de Engenharia:</strong> Filme ${FIXED_PARAMS.filmSpec} | Jumbo 1.600mm × 8.000m | Setup Jumbo: 40 min | 72 rolos/cx | 4.032 rolos/pallet.
          </div>

          <p style="margin-top: 16px; font-size: 12px; color: #475569;">
            Atenciosamente,<br>
            <strong>Gestão & Controle de Produção</strong>
          </p>
        </div>
      </div>
    `;
  };

  const generateEmailPlainText = () => {
    const machine = MACHINE_CONFIGS[selectedMachine];
    const nowStr = new Date().toLocaleDateString('pt-BR');

    return `ANÁLISE DE PRODUTIVIDADE & CAPACIDADE - ${machine.name.toUpperCase()}
Data: ${nowStr}
Formato: ${selectedWidthMm}mm x ${selectedLengthM}m
Filme: ${FIXED_PARAMS.filmSpec}

RESUMO DE PRODUÇÃO DO TURNO (${calculations.netWorkingMinutes} min úteis / ${shiftStart} às ${shiftEnd}):
• Total de Rolos: ${calculations.totalRolls.toLocaleString('pt-BR')} un
• Caixas Fechadas: ${calculations.closedBoxes.toLocaleString('pt-BR')} caixas (+${calculations.remainingRollsInBox} rolos)
• Pallets Fechados: ${calculations.closedPallets} pallets (${calculations.palletsDecimal.toFixed(2)} plts)
• Jumbos Consumidos: ${calculations.jumbosConsumedEquivalent.toFixed(2)} jumbos (${calculations.setupsInShift} setups)
• Área Convertida: ${calculations.totalM2.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m²
• Ritmo de Produção: ${calculations.rollsPerHour.toLocaleString('pt-BR')} rolos/hora | ${calculations.boxesPerHour} caixas/hora

TEMPOS OPERACIONAIS:
• Tempo de Corte: ${cuttingTimeSeconds.toFixed(2)}s
• Tempo Manual: ${calculations.manualTotalSeconds.toFixed(2)}s (Eixos: ${unloadShaftsSeconds.toFixed(2)}s | Arruelas: ${washerChangeSeconds.toFixed(2)}s)
• Tempo Total do Ciclo: ${calculations.totalCycleSeconds.toFixed(2)}s
• Autonomia de 1 Jumbo: ${calculations.jumboPureRunMinutes.toFixed(2)} min (${formatSecondsToHms(calculations.jumboPureRunSeconds)})`;
  };

  const handleDownloadOutlookEmlFile = () => {
    if (isReadOnlyAccount) {
      onBlockedReadOnlyAction?.('Download Bloqueado', 'O download de relatórios não é permitido no Modo de Leitura.');
      return;
    }
    const subject = `Análise de Produtividade • ${MACHINE_CONFIGS[selectedMachine].name} (${selectedWidthMm}mm x ${selectedLengthM}m)`;
    const htmlBody = generateEmailHTML();
    const plainText = generateEmailPlainText();

    copyRichAndPlainText(plainText, htmlBody);
    const datePrefix = getFormattedFileDate();
    downloadOutlookEml(subject, htmlBody, `${datePrefix}_Produtividade_${selectedMachine}_${selectedWidthMm}mmx${selectedLengthM}m.eml`);
    setOpenEmailMenu(false);
    showNotification('Rascunho .eml baixado para Outlook com dados em negrito!');
  };

  const handleMailtoShare = (useWeb: boolean = false) => {
    if (isReadOnlyAccount) {
      onBlockedReadOnlyAction?.('Envio Bloqueado', 'O envio de relatórios não é permitido no Modo de Leitura.');
      return;
    }
    const subject = `Análise de Produtividade • ${MACHINE_CONFIGS[selectedMachine].name} (${selectedWidthMm}mm x ${selectedLengthM}m)`;
    const plainText = generateEmailPlainText();
    const htmlBody = generateEmailHTML();

    copyRichAndPlainText(plainText, htmlBody);

    if (useWeb) {
      const webUrl = `https://outlook.office.com/mail/deeplink/compose?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainText)}`;
      window.open(webUrl, '_blank');
      showNotification('Outlook Web aberto! Relatório copiado para Ctrl+V.');
    } else {
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainText)}`;
      window.location.href = mailtoUrl;
      showNotification('Nova mensagem iniciada no cliente de e-mail!');
    }
    setOpenEmailMenu(false);
  };

  // ==========================================
  // EXPORTAÇÃO 3: WHATSAPP
  // ==========================================
  const handleWhatsAppShare = () => {
    if (isReadOnlyAccount) {
      onBlockedReadOnlyAction?.('Compartilhamento Bloqueado', 'O envio de relatórios não é permitido no Modo de Leitura.');
      return;
    }

    const machine = MACHINE_CONFIGS[selectedMachine];
    const nowStr = new Date().toLocaleDateString('pt-BR');

    const text = `📊 *ANÁLISE DE PRODUTIVIDADE & CAPACIDADE*
⚙️ *Máquina:* ${machine.name.toUpperCase()}
🎯 *Formato:* ${selectedWidthMm}mm × ${selectedLengthM}m (${rollsPerCycle} rolos/ciclo)
📅 *Data:* ${nowStr}
⏱️ *Turno Útil:* ${calculations.netWorkingMinutes} min (${shiftStart} às ${shiftEnd})

*⏱️ TEMPOS DO CICLO:*
• Corte Máquina: *${cuttingTimeSeconds.toFixed(2)}s*
• Descarregar Eixos: *${unloadShaftsSeconds.toFixed(2)}s*
• Troca Arruelas (${washerMultiplier}x): *${washerChangeSeconds.toFixed(2)}s*
• *Tempo Total Ciclo:* *${calculations.totalCycleSeconds.toFixed(2)}s* (${(calculations.totalCycleSeconds / 60).toFixed(2)} min)
• *Autonomia 1 Jumbo:* *${calculations.jumboPureRunMinutes.toFixed(2)} min* (${formatSecondsToHms(calculations.jumboPureRunSeconds)})

*📦 PRODUÇÃO TOTAL DO TURNO:*
• *Rolos Produzidos:* *${calculations.totalRolls.toLocaleString('pt-BR')} un*
• *Caixas Fechadas:* *${calculations.closedBoxes.toLocaleString('pt-BR')} cx* (+${calculations.remainingRollsInBox} rolos)
• *Pallets Fechados:* *${calculations.closedPallets} plts* (${calculations.palletsDecimal.toFixed(2)} plts)
• *Jumbos Consumidos:* *${calculations.jumbosConsumedEquivalent.toFixed(2)}* (${calculations.setupsInShift} setups de 40min)
• *Área Total:* *${calculations.totalM2.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} m²*
• *Ritmo:* *${calculations.rollsPerHour.toLocaleString('pt-BR')} rolos/h* | *${calculations.boxesPerHour} cx/h*`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
    showNotification('WhatsApp aberto com a mensagem formatada!');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Notificação Flutuante de Cópia / Ação */}
      <AnimatePresence>
        {copySuccessNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-[99999] bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl border border-emerald-400 font-bold text-xs flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{copySuccessNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================
          BARRA DE FERRAMENTAS SUPERIOR (AÇÕES & COMPARTILHAMENTO)
         ======================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Lado Esquerdo: Título e Identidade */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 shadow-xs shrink-0">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight">
                Análise de Produtividade & Capacidade
              </h2>
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow-2xs ${MACHINE_CONFIGS[selectedMachine].badgeColor}`}>
                {MACHINE_CONFIGS[selectedMachine].tag}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Simulador dinâmico de ciclos, autonomia de jumbo e capacidade por turno.
            </p>
          </div>
        </div>

        {/* Lado Direito: Botões de Ação do Usuário */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Restaurar Padrões */}
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Restaurar valores de fábrica da matriz de teste"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Restaurar Padrões</span>
            <span className="sm:hidden">Reset</span>
          </button>

          {/* Compartilhar WhatsApp */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all shadow-sm shadow-emerald-200 flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Compartilhar resumo via WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          {/* Enviar por E-mail (Outlook) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenEmailMenu(!openEmailMenu)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition-all shadow-sm shadow-blue-200 flex items-center gap-1.5 active:scale-95 cursor-pointer"
              title="Opções de envio para o Outlook"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Outlook</span>
              <ChevronDown className="w-3 h-3 opacity-80" />
            </button>

            {/* Dropdown Menu Outlook */}
            {openEmailMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl p-1.5 z-50 text-left">
                <button
                  type="button"
                  onClick={handleDownloadOutlookEmlFile}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>Baixar Rascunho (.eml)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMailtoShare(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Abrir App Outlook</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMailtoShare(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Abrir Outlook Web</span>
                </button>
              </div>
            )}
          </div>

          {/* Gerar / Baixar PDF */}
          <button
            type="button"
            onClick={handleExportPDF}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Exportar simulação em relatório A4 formatado"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>Gerar PDF (A4)</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          SELETOR DAS 3 MÁQUINAS DA FITA (GHEZZI, LINTECH, WULTEC)
         ======================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-blue-600" />
            Selecione a Cortadora de Fita
          </span>
          <span className="text-[10px] text-slate-400 font-medium">3 máquinas disponíveis no setor</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['LINTECH', 'GHEZZI', 'WULTEC'] as TapeMachine[]).map((machineKey) => {
            const isSelected = selectedMachine === machineKey;
            const info = MACHINE_CONFIGS[machineKey];

            return (
              <button
                key={machineKey}
                type="button"
                onClick={() => setSelectedMachine(machineKey)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-blue-600 animate-pulse' : 'bg-slate-300'}`} />
                    <h3 className={`text-sm font-black uppercase tracking-wide ${isSelected ? 'text-blue-950' : 'text-slate-700'}`}>
                      {info.name}
                    </h3>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium line-clamp-1">{info.description}</p>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shrink-0 shadow-2xs">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================
          PARÂMETROS FIXOS DO SISTEMA (VALORES PADRÃO TRAVADOS)
         ======================================================== */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
              1. Parâmetros Fixos de Engenharia (Valores Padrão Travados)
            </h3>
          </div>
          <span className="text-[10px] font-bold bg-amber-400/10 text-amber-300 border border-amber-400/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Exclusivo BOPP
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {/* Filme */}
          <div className="bg-slate-800/80 rounded-2xl p-3.5 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-1">Filme Base</span>
            <div className="font-bold text-white text-sm">{FIXED_PARAMS.filmSpec}</div>
            <span className="text-[10px] text-emerald-400 font-medium">100% Homologado</span>
          </div>

          {/* Dimensões Jumbo */}
          <div className="bg-slate-800/80 rounded-2xl p-3.5 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-1">Dimensões do Jumbo</span>
            <div className="font-bold text-white text-sm">1.600 mm × 8.000 m</div>
            <span className="text-[10px] text-sky-400 font-medium">{FIXED_PARAMS.jumboAreaM2.toLocaleString('pt-BR')} m² de área</span>
          </div>

          {/* Padrão Embalagem */}
          <div className="bg-slate-800/80 rounded-2xl p-3.5 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-1">Padrão de Embalagem</span>
            <div className="font-bold text-white text-sm">72 rolos / caixa</div>
            <span className="text-[10px] text-purple-300 font-medium">4.032 rolos / pallet (56 cx)</span>
          </div>

          {/* Setup Jumbo */}
          <div className="bg-slate-800/80 rounded-2xl p-3.5 border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-1">Setup do Jumbo</span>
            <div className="font-bold text-white text-sm">40 min (2.400 s)</div>
            <span className="text-[10px] text-amber-400 font-medium">Tempo padrão por troca</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          ENTRADAS EDITÁVEIS (TURNO, FORMATO E TABELA DE TEMPOS)
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bloco 1: Turno de Trabalho & Tempo Útil */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Clock className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Turno de Trabalho
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Início</label>
                <input
                  type="time"
                  value={shiftStart}
                  onChange={(e) => setShiftStart(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Fim</label>
                <input
                  type="time"
                  value={shiftEnd}
                  onChange={(e) => setShiftEnd(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Almoço / Paradas (minutos)</label>
              <input
                type="number"
                min="0"
                step="5"
                value={lunchBreakMinutes}
                onChange={(e) => setLunchBreakMinutes(Math.max(0, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none text-xs"
              />
            </div>

            {/* Cálculo automático de Tempo Útil */}
            <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-2xl">
              <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider block mb-0.5">
                Cálculo Automático de Tempo Útil
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-blue-950">{calculations.netWorkingMinutes} min</span>
                <span className="text-xs font-bold text-blue-600">
                  {formatSecondsToHms(calculations.netWorkingSeconds)}
                </span>
              </div>
              <p className="text-[10px] text-blue-600/80 mt-1 font-medium">
                {calculations.grossMinutes} min brutos - {lunchBreakMinutes} min paradas
              </p>
            </div>
          </div>
        </div>

        {/* Bloco 2: Seletor de Formato (Largura e Metragem) - Compacto com Caixas de Seleção */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Formato da Fita
              </h3>
            </div>
            <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              {selectedWidthMm}mm × {selectedLengthM}m
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Linha Compacta com Seletores Lado a Lado */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Largura da Fita (Dropdown / Select) */}
              <div>
                <label className="block text-[9.5px] font-black uppercase text-slate-500 mb-1">
                  Largura da Fita
                </label>
                <div className="relative">
                  <select
                    value={selectedWidthMm}
                    onChange={(e) => handleSelectFormat(Number(e.target.value), selectedLengthM)}
                    className="w-full pl-3 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl font-black text-xs text-slate-800 focus:bg-white focus:border-indigo-500 outline-none appearance-none cursor-pointer transition-colors"
                  >
                    {[24, 36, 45, 72].map((w) => (
                      <option key={w} value={w} className="font-bold text-slate-800">
                        {w} mm
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Metragem do Rolo (Dropdown / Select) */}
              <div>
                <label className="block text-[9.5px] font-black uppercase text-slate-500 mb-1">
                  Metragem do Rolo
                </label>
                <div className="relative">
                  <select
                    value={selectedLengthM}
                    onChange={(e) => handleSelectFormat(selectedWidthMm, Number(e.target.value))}
                    className="w-full pl-3 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl font-black text-xs text-slate-800 focus:bg-white focus:border-indigo-500 outline-none appearance-none cursor-pointer transition-colors"
                  >
                    {[100, 90, 40].map((l) => (
                      <option key={l} value={l} className="font-bold text-slate-800">
                        {l} metros
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Resumo Compacto do Formato Ativo */}
            <div className="px-3 py-2 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-indigo-600">Formato Ativo:</span>
                <span className="text-xs font-black text-indigo-950">{selectedWidthMm}mm × {selectedLengthM}m</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black uppercase text-indigo-600">Padrão Ciclo:</span>
                <span className="text-xs font-black text-indigo-900 bg-white px-2 py-0.5 rounded-md border border-indigo-200 shadow-2xs">
                  {rollsPerCycle} rolos
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 3: Troca de Arruelas e Tempo Manual ao Lado da Seleção */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Arruelas do Operador
              </h3>
            </div>
            <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
              Multiplicador: {washerMultiplier}x
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {/* Multiplicador com Tempo Manual Exibido ao Lado */}
            <div>
              <label className="block text-[9.5px] font-black uppercase text-slate-500 mb-1">
                Multiplicador Rápido de Troca de Arruelas
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                {/* Caixa de Seleção / Dropdown */}
                <div className="relative">
                  <select
                    value={washerMultiplier}
                    onChange={(e) => handleSetWasherMultiplier(Number(e.target.value))}
                    className="w-full pl-3 pr-8 py-2 bg-amber-50/60 hover:bg-amber-100/60 border border-amber-200 rounded-xl font-black text-xs text-amber-950 focus:bg-white focus:border-amber-500 outline-none appearance-none cursor-pointer transition-colors"
                  >
                    <option value={1}>1x (Base: 30,29s)</option>
                    <option value={2}>2x (Dupla: 60,58s)</option>
                    <option value={3}>3x (Tripla: 90,87s)</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-amber-600 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Tempo Manual do Operador ao Lado da Caixa de Seleção */}
                <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-amber-800 leading-tight">Tempo Manual Total</span>
                    <span className="text-[8.5px] text-amber-600 font-medium">Descarregar + Arruelas</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-amber-950 font-mono leading-none block">
                      {calculations.manualTotalSeconds.toFixed(2)}s
                    </span>
                    <span className="text-[9px] font-bold text-amber-700">
                      {(calculations.manualTotalSeconds / 60).toFixed(2)} min
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detalhe dos Componentes do Tempo Manual */}
            <div className="px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-[9.5px] text-slate-500">
              <span>Descarregar eixos: <strong className="text-slate-700 font-mono">{unloadShaftsSeconds.toFixed(2)}s</strong></span>
              <span>•</span>
              <span>Troca arruelas ({washerMultiplier}x): <strong className="text-amber-800 font-mono">{washerChangeSeconds.toFixed(2)}s</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          TABELA DE TEMPOS DO OPERADOR E MÁQUINA (LAYOUT LIMPO E REORGANIZADO)
         ======================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
              <Timer className="w-4 h-4 text-blue-600" />
              Tabela de Tempos Operacionais (Operador & Máquina)
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Ajuste fino dos tempos unitários por ciclo de corte
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              const preset = PRESET_FORMATS.find(p => p.widthMm === selectedWidthMm && p.lengthM === selectedLengthM);
              if (preset) {
                setRollsPerCycle(preset.defaultRollsPerCycle);
                setCuttingTimeSeconds(preset.cuttingTimeSeconds);
              }
              setUnloadShaftsSeconds(DEFAULT_UNLOAD_SHAFTS_SECONDS);
              setWasherMultiplier(1);
              setWasherChangeSeconds(DEFAULT_WASHER_BASE_SECONDS);
            }}
            className="text-[11px] text-blue-600 font-bold hover:text-blue-800 hover:underline cursor-pointer self-start sm:self-auto transition-colors"
          >
            Redefinir Padrões
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-black uppercase text-[9.5px] border-b border-slate-200/80">
                <th className="py-2.5 px-3.5">Etapa / Parâmetro</th>
                <th className="py-2.5 px-3.5">Referência Técnica</th>
                <th className="py-2.5 px-3.5 text-right">Tempo / Valor</th>
                <th className="py-2.5 px-3.5 text-right">Em Minutos</th>
                <th className="py-2.5 px-3.5 text-center">Peso no Ciclo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/90 text-slate-700 text-xs">
              {/* Linha 1: Rolos por Ciclo */}
              <tr className="hover:bg-slate-50/60 transition-colors">
                <td className="py-2.5 px-3.5 font-bold text-slate-900">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Box className="w-3.5 h-3.5" />
                    </div>
                    <span>Rolos por Ciclo</span>
                  </div>
                </td>
                <td className="py-2.5 px-3.5 text-slate-500 text-[11px]">
                  {selectedWidthMm}mm • Base 1.600mm
                </td>
                <td className="py-2.5 px-3.5 text-right">
                  <div className="inline-flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={rollsPerCycle}
                      onChange={(e) => setRollsPerCycle(Math.max(1, Number(e.target.value)))}
                      className="w-20 text-right px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg font-black text-slate-900 focus:bg-white focus:border-indigo-500 outline-none transition-colors"
                    />
                    <span className="font-bold text-slate-400 text-[11px]">un</span>
                  </div>
                </td>
                <td className="py-2.5 px-3.5 text-right text-slate-300 font-mono text-[11px]">—</td>
                <td className="py-2.5 px-3.5 text-center text-slate-300 font-mono text-[11px]">—</td>
              </tr>

              {/* Linha 2: Tempo de Corte da Máquina */}
              <tr className="hover:bg-sky-50/40 transition-colors">
                <td className="py-2.5 px-3.5 font-bold text-slate-900">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <span>Corte Automático da Máquina</span>
                  </div>
                </td>
                <td className="py-2.5 px-3.5 text-slate-500 text-[11px]">
                  Bobinamento de {selectedLengthM} metros
                </td>
                <td className="py-2.5 px-3.5 text-right">
                  <div className="inline-flex items-center gap-1">
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={cuttingTimeSeconds}
                      onChange={(e) => setCuttingTimeSeconds(Math.max(0.1, Number(e.target.value)))}
                      className="w-20 text-right px-2 py-1 bg-sky-50/70 border border-sky-200 rounded-lg font-black text-sky-950 focus:bg-white focus:border-sky-500 outline-none transition-colors font-mono"
                    />
                    <span className="font-bold text-slate-400 text-[11px]">s</span>
                  </div>
                </td>
                <td className="py-2.5 px-3.5 text-right font-mono text-slate-600 text-[11px]">
                  {(cuttingTimeSeconds / 60).toFixed(2)} min
                </td>
                <td className="py-2.5 px-3.5 text-center">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 font-black text-[10.5px]">
                    {((cuttingTimeSeconds / calculations.totalCycleSeconds) * 100).toFixed(1)}%
                  </span>
                </td>
              </tr>

              {/* Linha 3: Descarregar Eixos */}
              <tr className="hover:bg-amber-50/40 transition-colors">
                <td className="py-2.5 px-3.5 font-bold text-slate-900">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <span>Descarregar Eixos / Mandris</span>
                  </div>
                </td>
                <td className="py-2.5 px-3.5 text-slate-500 text-[11px]">
                  Retirada manual de rolos prontos
                </td>
                <td className="py-2.5 px-3.5 text-right">
                  <div className="inline-flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={unloadShaftsSeconds}
                      onChange={(e) => setUnloadShaftsSeconds(Math.max(0, Number(e.target.value)))}
                      className="w-20 text-right px-2 py-1 bg-amber-50/70 border border-amber-200 rounded-lg font-black text-amber-950 focus:bg-white focus:border-amber-500 outline-none transition-colors font-mono"
                    />
                    <span className="font-bold text-slate-400 text-[11px]">s</span>
                  </div>
                </td>
                <td className="py-2.5 px-3.5 text-right font-mono text-slate-600 text-[11px]">
                  {(unloadShaftsSeconds / 60).toFixed(2)} min
                </td>
                <td className="py-2.5 px-3.5 text-center">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-black text-[10.5px]">
                    {((unloadShaftsSeconds / calculations.totalCycleSeconds) * 100).toFixed(1)}%
                  </span>
                </td>
              </tr>

              {/* Linha 4: Troca de Arruelas */}
              <tr className="hover:bg-purple-50/40 transition-colors">
                <td className="py-2.5 px-3.5 font-bold text-slate-900">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <Sliders className="w-3.5 h-3.5" />
                    </div>
                    <span>Troca de Arruelas / Aparador</span>
                  </div>
                </td>
                <td className="py-2.5 px-3.5 text-slate-500 text-[11px]">
                  Multiplicador ativo: {washerMultiplier}x (base 30,29s)
                </td>
                <td className="py-2.5 px-3.5 text-right">
                  <div className="inline-flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={washerChangeSeconds}
                      onChange={(e) => setWasherChangeSeconds(Math.max(0, Number(e.target.value)))}
                      className="w-20 text-right px-2 py-1 bg-purple-50/70 border border-purple-200 rounded-lg font-black text-purple-950 focus:bg-white focus:border-purple-500 outline-none transition-colors font-mono"
                    />
                    <span className="font-bold text-slate-400 text-[11px]">s</span>
                  </div>
                </td>
                <td className="py-2.5 px-3.5 text-right font-mono text-slate-600 text-[11px]">
                  {(washerChangeSeconds / 60).toFixed(2)} min
                </td>
                <td className="py-2.5 px-3.5 text-center">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-black text-[10.5px]">
                    {((washerChangeSeconds / calculations.totalCycleSeconds) * 100).toFixed(1)}%
                  </span>
                </td>
              </tr>

              {/* Linha 5: Subtotal Manual Operador */}
              <tr className="bg-amber-50/60 border-t border-amber-200/80 font-bold">
                <td className="py-2.5 px-3.5 text-amber-950 font-black">
                  <span>Subtotal Manual (Operador)</span>
                </td>
                <td className="py-2.5 px-3.5 text-amber-700 text-[11px]">
                  Descarregar eixos + troca de arruelas
                </td>
                <td className="py-2.5 px-3.5 text-right font-black text-amber-950 font-mono text-xs">
                  {calculations.manualTotalSeconds.toFixed(2)} s
                </td>
                <td className="py-2.5 px-3.5 text-right font-mono text-amber-900 font-bold text-[11px]">
                  {(calculations.manualTotalSeconds / 60).toFixed(2)} min
                </td>
                <td className="py-2.5 px-3.5 text-center">
                  <span className="inline-block px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 font-black text-[10.5px]">
                    {((calculations.manualTotalSeconds / calculations.totalCycleSeconds) * 100).toFixed(1)}%
                  </span>
                </td>
              </tr>

              {/* Linha 6: Tempo Total do Ciclo */}
              <tr className="bg-indigo-50/70 font-black text-xs border-t-2 border-indigo-400">
                <td className="py-3 px-3.5 text-indigo-950 font-black uppercase tracking-wide">
                  Tempo Total do Ciclo
                </td>
                <td className="py-3 px-3.5 text-indigo-700 text-[11px]">
                  Corte Máquina + Subtotal Manual
                </td>
                <td className="py-3 px-3.5 text-right text-indigo-950 font-mono font-black text-sm">
                  {calculations.totalCycleSeconds.toFixed(2)} s
                </td>
                <td className="py-3 px-3.5 text-right text-indigo-900 font-mono font-black text-xs">
                  {(calculations.totalCycleSeconds / 60).toFixed(2)} min
                </td>
                <td className="py-3 px-3.5 text-center">
                  <span className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-600 text-white font-black text-[10.5px]">
                    100%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          SAÍDAS DO SISTEMA: CARDS DE KPIS & AUTONOMIA DO JUMBO
         ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Autonomia do Jumbo */}
        <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white p-5 rounded-3xl shadow-xl flex flex-col justify-between space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-300">Autonomia 1 Jumbo</span>
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            </div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight">
              {calculations.jumboPureRunMinutes.toFixed(1)} min
            </div>
            <p className="text-xs font-bold text-sky-200 mt-0.5">
              {formatSecondsToHms(calculations.jumboPureRunSeconds)}
            </p>
          </div>
          <div className="pt-3 border-t border-white/10 text-[11px] text-sky-100 space-y-0.5">
            <div className="flex justify-between">
              <span>Ciclos por jumbo:</span>
              <span className="font-bold">{calculations.cyclesPerJumbo.toFixed(0)} ciclos</span>
            </div>
            <div className="flex justify-between">
              <span>Com setup (40 min):</span>
              <span className="font-bold">{calculations.jumboTotalWithSetupMinutes.toFixed(1)} min</span>
            </div>
          </div>
        </div>

        {/* Card 2: Produção Total de Rolos */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rolos no Turno</span>
              <Package className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {calculations.totalRolls.toLocaleString('pt-BR')} <span className="text-sm font-bold text-slate-400">un</span>
            </div>
            <p className="text-xs font-bold text-emerald-600 mt-0.5">
              {calculations.rollsPerHour.toLocaleString('pt-BR')} rolos por hora
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-600 space-y-0.5">
            <div className="flex justify-between">
              <span>Ciclos executados:</span>
              <span className="font-bold text-slate-800">{calculations.totalCyclesInShift}</span>
            </div>
            <div className="flex justify-between">
              <span>Rolos por ciclo:</span>
              <span className="font-bold text-slate-800">{rollsPerCycle}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Caixas e Pallets Fechados */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Caixas & Pallets</span>
              <Box className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {calculations.closedBoxes.toLocaleString('pt-BR')} <span className="text-sm font-bold text-slate-400">cx</span>
            </div>
            <p className="text-xs font-bold text-indigo-600 mt-0.5">
              {calculations.closedPallets} pallets fechados ({calculations.palletsDecimal.toFixed(2)} plts)
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-600 space-y-0.5">
            <div className="flex justify-between">
              <span>Rolos avulsos:</span>
              <span className="font-bold text-slate-800">+{calculations.remainingRollsInBox} un</span>
            </div>
            <div className="flex justify-between">
              <span>Caixas avulsas:</span>
              <span className="font-bold text-slate-800">+{calculations.remainingBoxesInPallet} cx</span>
            </div>
          </div>
        </div>

        {/* Card 4: Jumbos Consumidos & Setups */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Jumbos Consumidos</span>
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {calculations.jumbosConsumedEquivalent.toFixed(2)} <span className="text-sm font-bold text-slate-400">jb</span>
            </div>
            <p className="text-xs font-bold text-purple-600 mt-0.5">
              {calculations.setupsInShift} setups de 40 min realizados
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-600 space-y-0.5">
            <div className="flex justify-between">
              <span>Metragem convertida:</span>
              <span className="font-bold text-slate-800">{calculations.totalLinearMeters.toLocaleString('pt-BR')} m</span>
            </div>
            <div className="flex justify-between">
              <span>Área em m²:</span>
              <span className="font-bold text-slate-800">{calculations.totalM2.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} m²</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================
          MATRIZ DE CAPACIDADE CONSOLIDADA (TODOS OS FORMATOS)
         ======================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black uppercase text-slate-900 tracking-tight">
              Matriz Consolidada de Formatos (Comparativo no Turno de {calculations.netWorkingMinutes} min)
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Clique em qualquer formato para carregar instantaneamente seus parâmetros no simulador.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] border-b border-slate-200">
                <th className="py-3 px-3">Formato</th>
                <th className="py-3 px-3 text-center">Rolos/Ciclo</th>
                <th className="py-3 px-3 text-right">Corte (s)</th>
                <th className="py-3 px-3 text-right">Ciclo Total (s)</th>
                <th className="py-3 px-3 text-right">Autonomia Jumbo</th>
                <th className="py-3 px-3 text-right">Rolos/Turno</th>
                <th className="py-3 px-3 text-right">Caixas/Turno</th>
                <th className="py-3 px-3 text-right">Pallets/Turno</th>
                <th className="py-3 px-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {PRESET_FORMATS.map((preset) => {
                const isCurrent = preset.widthMm === selectedWidthMm && preset.lengthM === selectedLengthM;

                // Cálculo específico para o formato comparativo
                const presetCyclesPerJumbo = FIXED_PARAMS.jumboLengthM / preset.lengthM;
                const presetManual = unloadShaftsSeconds + washerChangeSeconds;
                const presetCycleTotal = preset.cuttingTimeSeconds + presetManual;
                const presetJumboMinutes = (presetCyclesPerJumbo * presetCycleTotal) / 60;
                const presetTotalJumboWithSetup = (presetCyclesPerJumbo * presetCycleTotal) + FIXED_PARAMS.jumboSetupSeconds;

                // Ciclos no turno
                let presetCompletedJumbos = 0;
                let presetTotalCycles = 0;
                if (presetTotalJumboWithSetup > 0 && calculations.netWorkingSeconds > 0) {
                  presetCompletedJumbos = Math.floor(calculations.netWorkingSeconds / presetTotalJumboWithSetup);
                  const rem = calculations.netWorkingSeconds % presetTotalJumboWithSetup;
                  presetTotalCycles += presetCompletedJumbos * presetCyclesPerJumbo;
                  if (rem >= FIXED_PARAMS.jumboSetupSeconds) {
                    const extra = Math.min(presetCyclesPerJumbo, Math.floor((rem - FIXED_PARAMS.jumboSetupSeconds) / presetCycleTotal));
                    presetTotalCycles += extra;
                  }
                }

                const presetRolls = Math.round(presetTotalCycles * preset.defaultRollsPerCycle);
                const presetBoxes = Math.floor(presetRolls / FIXED_PARAMS.rollsPerBox);
                const presetPallets = (presetBoxes / FIXED_PARAMS.boxesPerPallet).toFixed(1);

                return (
                  <tr
                    key={`${preset.widthMm}-${preset.lengthM}`}
                    onClick={() => handleSelectFormat(preset.widthMm, preset.lengthM)}
                    className={`cursor-pointer transition-colors ${
                      isCurrent
                        ? 'bg-blue-50/80 font-black text-blue-950 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold">
                      <div className="flex items-center gap-1.5">
                        {isCurrent && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                        <span>{preset.widthMm} mm × {preset.lengthM} m</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold">{preset.defaultRollsPerCycle}</td>
                    <td className="py-2.5 px-3 text-right font-medium">{preset.cuttingTimeSeconds.toFixed(2)}s</td>
                    <td className="py-2.5 px-3 text-right font-bold">{presetCycleTotal.toFixed(2)}s</td>
                    <td className="py-2.5 px-3 text-right font-bold text-indigo-700">{presetJumboMinutes.toFixed(1)} min</td>
                    <td className="py-2.5 px-3 text-right font-black text-slate-900">{presetRolls.toLocaleString('pt-BR')}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-800">{presetBoxes.toLocaleString('pt-BR')} cx</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{presetPallets} plts</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isCurrent
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}>
                        {isCurrent ? 'Ativo' : 'Carregar'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
