import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Award, AlertTriangle, CheckCircle2, XCircle, Clock, FileText,
  ShieldAlert, ChevronLeft, ChevronRight, Maximize2, Minimize2,
  X, Scale, Gauge, Flame, Wrench, Sparkles, AlertOctagon,
  Check, Play, Pause, RotateCcw, MonitorPlay, Download,
  Smartphone, HardHat, Ban, FileSpreadsheet, UserX, Droplets
} from 'lucide-react';
import { exportBonusRulesPptx } from '../utils/exportPresentationPptx';

interface BonusRulesPresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SlideData {
  id: number;
  category: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  content: React.ReactNode;
}

export const BonusRulesPresentationModal: React.FC<BonusRulesPresentationModalProps> = ({
  isOpen,
  onClose
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAutoplay, setIsAutoplay] = useState(false);
  const [isDownloadingPptx, setIsDownloadingPptx] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDownloadPptx = async () => {
    try {
      setIsDownloadingPptx(true);
      await exportBonusRulesPptx();
    } catch (err) {
      console.error('Erro ao gerar PowerPoint:', err);
    } finally {
      setIsDownloadingPptx(false);
    }
  };

  const slides: SlideData[] = [
    // SLIDE 1: INTRODUÇÃO
    {
      id: 1,
      category: 'Programa de Excelência',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      title: 'Gestão de Bônus de Produção',
      subtitle: 'Manual Completo de Regras, Metas Operacionais e Critérios de Bonificação',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center w-full">
          {/* Coluna Esquerda: Visão Geral e Indicadores */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Transparência & Mérito Operacional
            </div>
            <h3 className="text-2xl xl:text-3xl font-black text-slate-900 tracking-tight leading-snug">
              Reconhecer quem entrega <span className="text-amber-600 underline decoration-amber-400">performance real</span> com disciplina e qualidade.
            </h3>
            <p className="text-slate-600 text-sm xl:text-base leading-relaxed">
              O programa de bonificação da fábrica foi estruturado para recompensar a eficiência operacional nas condições reais de cada turno, equilibrando produtividade, redução de perdas técnicas e pontualidade da equipe.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 xl:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="text-2xl xl:text-3xl font-black text-amber-600">R$ 300+</div>
                <div className="text-[11px] text-slate-600 mt-0.5 font-bold">Base de Bônus Operacional</div>
              </div>
              <div className="p-3.5 xl:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="text-2xl xl:text-3xl font-black text-emerald-600">12 Horas</div>
                <div className="text-[11px] text-slate-600 mt-0.5 font-bold">Turnos Diurno e Noturno</div>
              </div>
              <div className="p-3.5 xl:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="text-2xl xl:text-3xl font-black text-blue-600">100%</div>
                <div className="text-[11px] text-slate-600 mt-0.5 font-bold">Avaliação Transparente</div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: 4 Pilares espalhados */}
          <div className="lg:col-span-5 bg-white p-5 xl:p-6 rounded-3xl border border-slate-200 shadow-xs space-y-2.5">
            <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-600" />
              Os 4 Pilares da Bonificação
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-black text-xs shadow-xs">
                1
              </div>
              <div>
                <div className="text-xs xl:text-sm font-bold text-slate-900">Velocidade & Meta da Máquina</div>
                <div className="text-[11px] text-slate-600">kg/h na Extrusão e m² no Corte de Fita.</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 font-black text-xs shadow-xs">
                2
              </div>
              <div>
                <div className="text-xs xl:text-sm font-bold text-slate-900">Controle Rígido de Refugo</div>
                <div className="text-[11px] text-slate-600">Tolerância de perdas de produção (Eco A, Eco BP, Borra).</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 font-black text-xs shadow-xs">
                3
              </div>
              <div>
                <div className="text-xs xl:text-sm font-bold text-slate-900">Agilidade em Limpeza de Matriz</div>
                <div className="text-[11px] text-slate-600">Até 30 minutos por parada individual de limpeza.</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 font-black text-xs shadow-xs">
                4
              </div>
              <div>
                <div className="text-xs xl:text-sm font-bold text-slate-900">Disciplina & Honestidade</div>
                <div className="text-[11px] text-slate-600">Pontualidade, assiduidade e tolerância zero a fraudes.</div>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // SLIDE 2: CONDIÇÃO DA MÁQUINA & QUILO-HORA (EXTRUSÃO)
    {
      id: 2,
      category: 'Extrusão (Cast 1 e Cast 2)',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      title: 'A Meta Baseada nas Condições Reais do Turno',
      subtitle: 'Aferição Dinâmica em Quilo-Hora (kg/h) em Função do Material e Velocidade',
      content: (
        <div className="space-y-4 w-full">
          <div className="p-3.5 xl:p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
            <Gauge className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs xl:text-sm text-blue-950 leading-relaxed font-medium">
              <strong>Regra Fundamental:</strong> Um turno pode estar rodando um material mais pesado, outro turno um material mais leve, ou a velocidade da máquina pode ter sido ajustada pelo processo. Por isso, <strong>a meta é sempre vinculada aos kg/h reais que a máquina está rodando naquele turno de 12 horas</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-6">
            <div className="p-5 xl:p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-amber-700 tracking-wider">Cast 1 (Exemplo Prático)</span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">Alta Velocidade</span>
              </div>
              <div className="text-2xl xl:text-3xl font-black text-slate-900">1.000 kg/h</div>
              <div className="text-xs text-slate-600 leading-relaxed font-medium">
                Material tipo <strong>Stretch LC3</strong> rodando a 1.000 kg/h durante o turno de 12 horas.
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-700">
                  <span>Produção Teórica Bruta (12h):</span>
                  <span className="font-bold text-slate-900">12.000 Kg</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Tolerância de Perdas (3,5%):</span>
                  <span className="font-bold text-amber-700">- 420 Kg</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold border-t border-slate-200 pt-1.5 text-xs xl:text-sm">
                  <span>Meta Líquida a Produzir:</span>
                  <span>11.580 Kg</span>
                </div>
              </div>
            </div>

            <div className="p-5 xl:p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-blue-700 tracking-wider">Cast 2 (Exemplo Prático)</span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold text-slate-700">Material Padrão / ATX</span>
              </div>
              <div className="text-2xl xl:text-3xl font-black text-slate-900">850 kg/h</div>
              <div className="text-xs text-slate-600 leading-relaxed font-medium">
                Material tipo <strong>Stretch LC2 / ATX</strong> rodando a 850 kg/h no turno de 12 horas.
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-700">
                  <span>Produção Teórica Bruta (12h):</span>
                  <span className="font-bold text-slate-900">10.200 Kg</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Tolerância de Perdas (3,5%):</span>
                  <span className="font-bold text-amber-700">- 357 Kg</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold border-t border-slate-200 pt-1.5 text-xs xl:text-sm">
                  <span>Meta Líquida a Produzir:</span>
                  <span>9.843 Kg</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between text-xs text-slate-700 font-medium">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              O valor do kg/h é informado no lançamento de produção e refletido no extrato do colaborador.
            </span>
            <span className="font-mono text-slate-500 font-bold">12 Horas por Turno (Diurno / Noturno)</span>
          </div>
        </div>
      )
    },

    // SLIDE 3: TOLERÂNCIA DE PERDAS NA EXTRUSÃO
    {
      id: 3,
      category: 'Regra de Refugo',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      title: 'Tolerância de Perdas de Produção',
      subtitle: 'Como o Limite de Refugo é Calculado para Proteger a Meta Líquida',
      content: (
        <div className="space-y-4 w-full">
          <p className="text-slate-700 text-xs xl:text-sm leading-relaxed">
            Nenhuma máquina produz 100% de material líquido contínuo. É natural e previsto que existam aparas e purgas. Por isso, existe uma <strong>tolerância percentual de perda (padrão de 3,5% a 4,0%)</strong> sobre o volume total programado do turno.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 xl:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                Eco A (Isento até 8%)
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                O Eco A <strong>só gera perda se ultrapassar 8% da produção do dia</strong>. Se for até 8%, é 100% isento e não causa desconto percentual de bônus!
              </p>
            </div>

            <div className="p-4 xl:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div className="text-sm font-bold text-slate-900">Eco BP (Produção)</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Eco B gerado por intervenção operacional ou ajuste. Conta diretamente na tolerância de perdas do turno.
              </p>
            </div>

            <div className="p-4 xl:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <div className="text-sm font-bold text-slate-900">Borra Total</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Material de purga e início de operação. Contabilizado no cômputo geral de perda técnica do turno.
              </p>
            </div>
          </div>

          {/* Regra Oficial ECOA */}
          <div className="p-4 xl:p-5 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-start gap-3.5">
            <Sparkles className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs xl:text-sm font-black text-emerald-950 uppercase tracking-wide">
                Regra Especial do ECOA: Isenção Total até 8% da Produção do Dia
              </div>
              <div className="text-xs text-emerald-900 mt-1 leading-relaxed font-medium">
                O refugo de <strong>ECOA somente terá perda de porcentagem de bônus se ultrapassar 8% da produção total do dia</strong>. Se o ECOA do dia for igual ou inferior a 8%, <strong>não haverá perda nenhuma e não gerará nenhum desconto percentual no bônus</strong>!
              </div>
            </div>
          </div>

          <div className="p-4 xl:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
            <Scale className="w-6 h-6 text-slate-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs xl:text-sm font-black text-slate-900">Regra de Abatimento Geral por Refugo</div>
              <div className="text-xs text-slate-700 mt-0.5 leading-relaxed font-medium">
                Se as perdas avaliadas (EcoA acima de 8% + Eco BP + Borra) ficarem <strong>dentro do limite de tolerância</strong>, a pontuação integral é mantida. Se <strong>ultrapassarem o limite</strong>, a produção líquida é comprometida e ocorre desconto na bonificação proporcional ao excesso de refugo.
              </div>
            </div>
          </div>
        </div>
      )
    },

    // SLIDE 4: ISENÇÃO DO ECOBM (MANUTENÇÃO)
    {
      id: 4,
      category: 'Regra de Ouro da Extrusão',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      title: 'Isenção de ECOBM (Manutenção)',
      subtitle: 'Refugo Decorrente de Problemas Mecânicos ou Elétricos Não Prejudica o Operador',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center w-full">
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Proteção Operacional
            </div>
            <h3 className="text-xl xl:text-2xl font-black text-slate-900 leading-snug">
              O que é <span className="text-emerald-700">ECOBM</span> e por que ele é 100% isento?
            </h3>
            <p className="text-slate-700 text-xs xl:text-sm leading-relaxed">
              <strong>ECOBM</strong> significa <em>Eco B de Manutenção</em>. É todo aquele refugo gerado por quebras técnicas, trocas de peças, reparos elétricos ou problemas na infraestrutura da máquina.
            </p>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5 text-xs text-slate-700">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                Regra Clara & Mandatória:
              </div>
              <p className="leading-relaxed">
                O ECOBM <strong>NÃO desconta da meta do operador</strong>. Ele é registrado para fins de controle de manutenção da fábrica, mas no cálculo do bônus de produção ele é <strong>completamente desconsiderado</strong>.
              </p>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-3">
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs xl:text-sm">
                <Flame className="w-4 h-4 text-rose-600" />
                ECOBP (Produção)
              </div>
              <div className="text-xs text-rose-950 leading-relaxed font-medium">
                Refugo gerado por erro operacional, bobinamento torto, filme furado ou descuido. 
                <span className="text-rose-700 font-bold block mt-1">➔ CONTA como perda e desconta do bônus se passar do limite.</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs xl:text-sm">
                <Wrench className="w-4 h-4 text-emerald-600" />
                ECOBM (Manutenção)
              </div>
              <div className="text-xs text-emerald-950 leading-relaxed font-medium">
                Refugo gerado por parada do motor, falha de termopar, rompimento por rolamento travado ou intervenção técnica.
                <span className="text-emerald-700 font-bold block mt-1">➔ 100% ISENTO da meta de bônus do operador.</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600 text-center font-medium">
              * Identificado separadamente no extrato individual em PDF: "EcoBM Isento".
            </div>
          </div>
        </div>
      )
    },

    // SLIDE 5: PARADAS DE MÁQUINA E LIMPEZA OBRIGATÓRIA
    {
      id: 5,
      category: 'Paradas na Extrusão',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      title: 'Paradas de Máquina & Limpeza Obrigatória',
      subtitle: 'A Regra dos 30 Minutos e Desconto de 50% no Ranking por Limpeza Não Realizada',
      content: (
        <div className="space-y-3.5 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-4 xl:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-amber-700 font-black text-xs xl:text-sm uppercase">
                <Clock className="w-4 h-4 text-amber-600" />
                Apenas Limpeza de Matriz e Máquina
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                Na Extrusão, paradas de manutenção mecânica, elétrica ou falta de energia <strong>não tiram a meta da equipe</strong>.
              </p>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                A <strong>única parada avaliada para perda de bônus</strong> é a parada para <span className="text-slate-900 font-bold underline decoration-amber-400">limpeza da matriz, cabeçote, roscas ou rolos</span>.
              </p>
            </div>

            <div className="p-4 xl:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-rose-700 font-black text-xs xl:text-sm uppercase">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                30 Minutos por Parada Individual
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                <strong>ATENÇÃO:</strong> O limite de 30 minutos <span className="text-rose-700 font-bold">NÃO é a soma acumulada de todas as paradas do dia</span>!
              </p>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 font-medium">
                É <strong>30 minutos no máximo por cada evento individual</strong> de limpeza. Se a máquina parou 3 vezes e cada uma durou 25 min, está 100% aprovado!
              </div>
            </div>
          </div>

          {/* NOVA REGRA MANDATÓRIA: PARADA DE LIMPEZA OBRIGATÓRIA NÃO REALIZADA */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 to-amber-50 border-2 border-rose-300 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-900 font-black text-xs xl:text-sm uppercase tracking-wide">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Parada de Limpeza Obrigatória Não Realizada ➔ -50% no Ranking de Produtividade
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
                Regra de Justiça
              </span>
            </div>
            <p className="text-xs text-slate-800 leading-relaxed font-medium">
              Quando for estipulada uma quantidade de paradas para limpeza no turno (ex.: <strong>2 paradas obrigatórias de limpeza</strong>) e o operador realizar menos (ex.: apenas 1 parada), para não prejudicar quem realizou todas as limpezas programadas e teve menor tempo de máquina rodando:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/90 border border-rose-200">
                <strong className="text-rose-800 block mb-0.5">📉 Desconto de 50% no Ranking do Operador:</strong>
                <span className="text-slate-700">O sistema abate automaticamente <strong>50% da produção líquida do dia apenas para fins de ranking</strong> de produtividade.</span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/90 border border-emerald-200">
                <strong className="text-emerald-800 block mb-0.5">📊 Relatórios e Produção Geral Preservados:</strong>
                <span className="text-slate-700">Nos relatórios contábeis, faturamento e produção fabril, <strong>o volume real físico é 100% mantido</strong>. O desconto incide exclusivamente no ranking individual.</span>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // SLIDE 6: CORTE DE FITA (METAS EM M² E ABATIMENTO DE PERDAS)
    {
      id: 6,
      category: 'Setor de Corte de Fita',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      title: 'Regras do Setor de Corte de Fita (Rebobinadeiras)',
      subtitle: 'Metas Expressas em Metros Quadrados (m²) com Abatimento de Tipo 1, Tipo 2 e Lixo',
      content: (
        <div className="space-y-4 w-full">
          <div className="p-3.5 xl:p-4 rounded-2xl bg-purple-50 border border-purple-200 flex items-start gap-3">
            <Award className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <p className="text-xs xl:text-sm text-purple-950 leading-relaxed font-medium">
              Diferente da Extrusão que mede quilo-hora (kg/h), <strong>as máquinas de Corte de Fita (Ghezzi, Lintech e Wultec) têm sua meta avaliada exclusivamente em Metros Quadrados (m²/dia)</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 xl:gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-black uppercase text-purple-700">Ghezzi</span>
              <div className="text-2xl xl:text-3xl font-black text-slate-900">60.000 m²</div>
              <p className="text-[11px] text-slate-600 font-medium">Meta diária padrão de referência por turno.</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-black uppercase text-purple-700">Lintech</span>
              <div className="text-2xl xl:text-3xl font-black text-slate-900">50.000 m²</div>
              <p className="text-[11px] text-slate-600 font-medium">Meta diária padrão de referência por turno.</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-black uppercase text-purple-700">Wultec</span>
              <div className="text-2xl xl:text-3xl font-black text-slate-900">40.000 m²</div>
              <p className="text-[11px] text-slate-600 font-medium">Meta diária padrão de referência por turno.</p>
            </div>
          </div>

          <div className="p-4 xl:p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-purple-600" />
              O que Abate a Meta de Produtividade no Corte de Fita?
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-0.5">Perda Tipo 1 (m²)</span>
                <span className="text-slate-600 text-[11px]">Abate diretamente da produtividade atingida no dia.</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-0.5">Perda Tipo 2 (m²)</span>
                <span className="text-slate-600 text-[11px]">Abate diretamente da produtividade atingida no dia.</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-0.5">Lixo / Refugo (kg ➔ m²)</span>
                <span className="text-slate-600 text-[11px]">O peso em kg é convertido em m² pela gramatura e abatido da meta.</span>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // SLIDE 7: CRITÉRIOS DE FECHAMENTO MENSAL - QUALIDADE & APONTAMENTOS
    {
      id: 7,
      category: '2. Qualidade',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      title: 'Critérios de Qualidade & Apontamentos',
      subtitle: 'Regras de Fechamento Mensal: Impacto de Devoluções, Reclamações e Registros',
      content: (
        <div className="space-y-4 w-full">
          <p className="text-slate-700 text-xs xl:text-sm leading-relaxed">
            A bonificação recompensa a produção feita com excelência técnica. Falhas de produto e omissões nos apontamentos geram descontos diretos na meta mensal conforme a tabela oficial de fechamento:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 xl:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-indigo-700" />
              </div>
              <div className="text-xs xl:text-sm font-bold text-slate-900 leading-tight">
                Erro Operacional (Devolução)
              </div>
              <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-[11px] xl:text-xs text-indigo-950 font-black">
                ➔ Perde até 20% da meta
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Lote devolvido decorrente de falha operacional (espessura fora de tolerância, cônico ou contaminação).
              </p>
            </div>

            <div className="p-3.5 xl:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs">
                <AlertOctagon className="w-4 h-4 text-indigo-700" />
              </div>
              <div className="text-xs xl:text-sm font-bold text-slate-900 leading-tight">
                Reclamação Interna
              </div>
              <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-[11px] xl:text-xs text-indigo-950 font-black">
                ➔ Perde até 20% da meta
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Não conformidade detectada pela expedição ou retrabalho gerado para o setor posterior.
              </p>
            </div>

            <div className="p-3.5 xl:p-4 rounded-2xl bg-white border border-amber-200 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold text-xs">
                <Droplets className="w-4 h-4 text-cyan-700" />
              </div>
              <div className="text-xs xl:text-sm font-bold text-slate-900 leading-tight">
                Matéria-Prima Molhada
              </div>
              <div className="p-2 rounded-xl bg-cyan-50 border border-cyan-200 text-[11px] xl:text-xs text-cyan-950 font-black">
                ➔ Perde 20% da meta
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Abastecimento com matéria-prima molhada decorrente de falta de atenção do auxiliar.
              </p>
            </div>

            <div className="p-3.5 xl:p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs">
                <FileSpreadsheet className="w-4 h-4 text-indigo-700" />
              </div>
              <div className="text-xs xl:text-sm font-bold text-slate-900 leading-tight">
                Mau Preenchimento
              </div>
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] xl:text-xs text-amber-950 font-black">
                ➔ Perde 10% da meta
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Omissão de paradas, rasuras ou dados incorretos no lançamento de produção.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Todos os dados devem ser conferidos diariamente pelo líder de turno antes do fechamento mensal.</span>
          </div>
        </div>
      )
    },

    // SLIDE 8: CRITÉRIOS DE FECHAMENTO MENSAL - ASSIDUIDADE & PONTUALIDADE
    {
      id: 8,
      category: '3. Assiduidade & Horários',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      title: 'Assiduidade, Faltas, Advertências e Horários',
      subtitle: 'Regras de Fechamento Mensal: Presença e Cumprimento Rígido da Jornada',
      content: (
        <div className="space-y-3.5 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs xl:text-sm">
                <UserX className="w-4 h-4 text-rose-600" />
                1 Atestado Médico
              </div>
              <div className="text-lg xl:text-xl font-black text-rose-700">PERDE A META</div>
              <p className="text-[11px] text-rose-950/80 leading-relaxed font-medium">
                100% de desconto na bonificação do mês de referência.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs xl:text-sm">
                <UserX className="w-4 h-4 text-rose-600" />
                1 Falta sem Justificativa
              </div>
              <div className="text-lg xl:text-xl font-black text-rose-700">PERDE A META</div>
              <p className="text-[11px] text-rose-950/80 leading-relaxed font-medium">
                100% de desconto na bonificação do mês de referência.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs xl:text-sm">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                1 Advertência por Escrito
              </div>
              <div className="text-lg xl:text-xl font-black text-rose-700">PERDE A META</div>
              <p className="text-[11px] text-rose-950/80 leading-relaxed font-medium">
                100% de desconto na bonificação do mês de referência.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs xl:text-sm">
                <Clock className="w-4 h-4 text-amber-600" />
                Atrasos Injustificados
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 font-bold text-xs text-amber-950">
                A cada 10 minutos de atraso ➔ perde 1% da meta
              </div>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                Exemplo: 30 minutos de atraso acumulados = 3% de perda percentual no bônus do mês.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs xl:text-sm">
                <Clock className="w-4 h-4 text-amber-600" />
                Horas Extras Não Autorizadas
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 font-bold text-xs text-amber-950">
                A cada 10 minutos de HE não autorizada ➔ perde 1% da meta
              </div>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                A permanência em posto além da escala sem prévia validação formal da liderança acarreta desconto proporcional.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
            <div>
              <span className="font-bold text-slate-900 block mb-0.5">Saída Antecipada Comunicada:</span>
              Desconto de 10% a 15% na bonificação do mês.
            </div>
            <div>
              <span className="font-bold text-rose-900 block mb-0.5">Saída sem Avisar Ninguém:</span>
              Abandono de posto: desconto severo de 35% a 50% na bonificação.
            </div>
          </div>
        </div>
      )
    },

    // SLIDE 9: CRITÉRIOS DE FECHAMENTO MENSAL - COMPORTAMENTO & SEGURANÇA
    {
      id: 9,
      category: '4. Comportamento & Segurança',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      title: 'Comportamento no Trabalho & Normas de Segurança',
      subtitle: 'Uso de Celular, Tabagismo em Área Proibida e Cumprimento Obrigatório de EPIs',
      content: (
        <div className="space-y-4 w-full">
          <p className="text-slate-700 text-xs xl:text-sm leading-relaxed">
            A integridade física e a disciplina na linha de produção são inegociáveis. Infrações às normas de conduta acarretam perda de 20% na primeira ocorrência e perda total (100%) em caso de reincidência:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 xl:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-rose-700 font-black text-xs xl:text-sm uppercase">
                <Smartphone className="w-5 h-5 text-rose-600" />
                Uso de Celular no Trabalho
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 font-bold text-amber-950">
                  1ª Ocorrência: ➔ Perde 20% da meta
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 font-black text-rose-900">
                  Reincidente: ➔ Perde 100% da meta
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Proibido uso de smartphone ou fones durante a operação das máquinas (risco de prensamento e quebra de atenção).
              </p>
            </div>

            <div className="p-4 xl:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-rose-700 font-black text-xs xl:text-sm uppercase">
                <Ban className="w-5 h-5 text-rose-600" />
                Fumar no Período de Trabalho
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 font-bold text-amber-950">
                  1ª Ocorrência: ➔ Perde 20% da meta
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 font-black text-rose-900">
                  Reincidente: ➔ Perde 100% da meta
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Tabagismo fora das áreas e horários expressamente permitidos. Infração sanitária e de segurança industrial contra incêndio.
              </p>
            </div>

            <div className="p-4 xl:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-rose-700 font-black text-xs xl:text-sm uppercase">
                <HardHat className="w-5 h-5 text-rose-600" />
                Não Uso de EPIs Obrigatórios
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 font-bold text-amber-950">
                  1ª Ocorrência: ➔ Perde 20% da meta
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-300 font-black text-rose-900">
                  Reincidente: ➔ Perde 100% da meta
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Obrigatório uso de protetor auricular, calçado de segurança, luvas adequadas e óculos de proteção na fábrica.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-center justify-between font-medium">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-700" />
              A segurança e a vida de cada colaborador estão sempre em 1º lugar.
            </span>
            <span className="font-bold text-amber-800 uppercase tracking-wide text-[10px]">Tolerância Zero a Desvios Graves</span>
          </div>
        </div>
      )
    },

    // SLIDE 10: TOLERÂNCIA ZERO - INFORMAÇÃO FALSA (-100%)
    {
      id: 10,
      category: 'Ética & Fraude',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      title: 'Tolerância Zero: Informação Falsa / Fraude',
      subtitle: 'Manipulação de Apontamentos ou Declarações Inverídicas = 100% de Desconto Imediato',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center w-full">
          <div className="lg:col-span-5 bg-rose-50 p-6 xl:p-7 rounded-3xl border border-rose-200 shadow-2xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="text-xl xl:text-2xl font-black text-rose-900 tracking-tight">
              Desqualificação Imediata (-100%)
            </div>
            <p className="text-xs text-rose-900/90 leading-relaxed font-medium">
              O sistema possui auditoria cruzada por balanças eletrônicas, câmeras do circuito interno e registros de CLP. A tentativa de burlar as regras resulta em perda imediata e irrecorrível do bônus.
            </p>
          </div>

          <div className="lg:col-span-7 space-y-3">
            <div className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
              Exemplos que Configuram Informação Falsa:
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-start gap-3">
              <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs xl:text-sm font-bold text-slate-900">Desvio de Refugo para Manutenção (ECOBM)</div>
                <div className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  Pegar o refugo gerado por erro operacional (Eco B Produção) e classificar fraudulentamente como "ECOBM Manutenção" para não estourar a tolerância de perda.
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-start gap-3">
              <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs xl:text-sm font-bold text-slate-900">Declaração Falsa de Parada Automática</div>
                <div className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  Afirmar que a máquina quebrou sozinha em processo automático quando as câmeras e telemetria comprovam que houve intervenção ou negligência operacional.
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-start gap-3">
              <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs xl:text-sm font-bold text-slate-900">Fraude em Tara, Peso ou Metragem</div>
                <div className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                  Lançar pesos brutos inexistentes, taras incorretas de bobinas ou metragens falsas de corte para simular cumprimento de meta.
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // SLIDE 11: TELA DE LANÇAMENTO E EXTRATO EM PDF (GENÉRICO)
    {
      id: 11,
      category: 'Ferramentas do Sistema',
      badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      title: 'Transparência: Tela de Lançamento & Extrato em PDF',
      subtitle: 'Como as Informações são Registradas e Disponibilizadas em Detalhes para Cada Colaborador',
      content: (
        <div className="space-y-4 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-6">
            <div className="p-5 xl:p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-cyan-800 font-bold text-xs xl:text-sm uppercase">
                <FileText className="w-4 h-4 text-cyan-600" />
                Na Tela de Novo Lançamento
              </div>
              <ul className="text-xs text-slate-700 space-y-2.5 font-medium">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-600 shrink-0 mt-0.5" />
                  <span><strong>Extrusão:</strong> Informa-se em quantos kg/h a máquina está trabalhando e a tolerância de perda no turno.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-600 shrink-0 mt-0.5" />
                  <span><strong>Corte de Fita:</strong> Ao selecionar a máquina, define-se a meta diária em m² e lançam-se perdas Tipo 1, Tipo 2 e Lixo.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-600 shrink-0 mt-0.5" />
                  <span><strong>Ocorrências Integradas:</strong> Lançam-se paradas de limpeza não realizadas, advertências e condutas direto no formulário com reflexo automático na gestão de bônus.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-600 shrink-0 mt-0.5" />
                  <span><strong>Em Tempo Real:</strong> A tela indica de imediato se a produção líquida atingiu ou não a meta estipulada.</span>
                </li>
              </ul>
            </div>

            <div className="p-5 xl:p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs xl:text-sm uppercase">
                <FileText className="w-4 h-4 text-emerald-600" />
                No Extrato Individual em PDF
              </div>
              <ul className="text-xs text-slate-700 space-y-2.5 font-medium">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Dia a Dia Detalhado:</strong> Cada turno trabalhado é impresso com máquina, kg/h ou m², meta 12h e produção real.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Separação Clara de Refugo:</strong> Eco A (isento até 8%), Eco BP, Borra vs. EcoBM de manutenção identificado como ISENTO.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Status por Turno:</strong> BATEU META ✅, EXC. LIMPEZA (&gt;30m), EXC. PERDA ou ABAIXO LÍQUIDO.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>100% Auditável:</strong> Entregue a cada colaborador no fechamento com clareza absoluta.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-cyan-50 border border-cyan-200 text-xs text-cyan-950 flex items-center justify-between font-medium">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-600" />
              O extrato pode ser impresso e entregue a cada colaborador no fechamento mensal com clareza total.
            </span>
            <span className="font-bold text-cyan-800">100% Auditável</span>
          </div>
        </div>
      )
    },

    // SLIDE 12: CONCLUSÃO & DIRETRIZES FINAIS
    {
      id: 12,
      category: 'Compromisso com o Sucesso',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      title: 'Conclusão: As 5 Chaves do Operador Nota 10',
      subtitle: 'Resumo das Melhores Práticas para Garantir a Bonificação Máxima Todos os Meses',
      content: (
        <div className="space-y-4 w-full">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs">
                1
              </div>
              <div className="text-xs xl:text-sm font-bold text-slate-900">Velocidade</div>
              <div className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Manter a máquina rodando na rotação e kg/h recomendados para o material do turno.
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                2
              </div>
              <div className="text-xs xl:text-sm font-bold text-slate-900">Refugo Baixo</div>
              <div className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Operar com atenção para manter Eco A (≤8%), Eco BP e Borra abaixo do teto de tolerância.
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                3
              </div>
              <div className="text-xs xl:text-sm font-bold text-slate-900">Limpeza Ágil</div>
              <div className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Cumprir paradas obrigatórias de limpeza sem nunca passar de 30 minutos em um único evento.
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black text-xs">
                4
              </div>
              <div className="text-xs xl:text-sm font-bold text-slate-900">Pontualidade</div>
              <div className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Cumprir a jornada, zelar pelos EPIs e comunicar liderança imediatamente em imprevistos.
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center font-black text-xs">
                5
              </div>
              <div className="text-xs xl:text-sm font-bold text-slate-900">Honestidade</div>
              <div className="text-[11px] text-slate-600 leading-relaxed font-medium">
                Apontar 100% da verdade no sistema. A confiança operacional é inegociável.
              </div>
            </div>
          </div>

          <div className="p-4 xl:p-5 rounded-3xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-0.5 text-center sm:text-left">
              <div className="text-sm xl:text-base font-black text-slate-900 flex items-center gap-2 justify-center sm:justify-start">
                <Award className="w-4 h-4 text-amber-600" />
                Produzir com Qualidade e Segurança é Nosso Maior Valor!
              </div>
              <div className="text-xs text-slate-700 font-medium">
                A gestão de bônus existe para construir uma fábrica mais forte e recompensar os melhores colaboradores.
              </div>
            </div>

            <button
              onClick={() => setCurrentSlide(0)}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 border border-slate-300 shadow-2xs transition-all shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
              Reiniciar
            </button>
          </div>
        </div>
      )
    }
  ];

  const totalSlides = slides.length;

  const nextSlide = useCallback(() => {
    setCurrentSlide(prev => (prev < totalSlides - 1 ? prev + 1 : prev));
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentSlide(prev => (prev > 0 ? prev - 1 : prev));
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevSlide();
      } else if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
          setIsFullscreen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, nextSlide, prevSlide, onClose]);

  // Autoplay support
  useEffect(() => {
    if (!isOpen || !isAutoplay) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev < totalSlides - 1 ? prev + 1 : 0));
    }, 15000);
    return () => clearInterval(interval);
  }, [isOpen, isAutoplay, totalSlides]);

  // Sync fullscreen change events
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  if (!isOpen) return null;

  const activeSlide = slides[currentSlide];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-slate-100 text-slate-900 flex flex-col justify-between h-screen w-screen overflow-hidden select-none"
    >
      {/* Top Header / Progress Bar (HIDDEN IN FULLSCREEN per user instruction) */}
      {!isFullscreen && (
        <div className="w-full bg-white border-b border-slate-200/90 shadow-2xs px-4 md:px-8 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-2xs">
              <MonitorPlay className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                <span>Manupackaging</span>
                <span className="text-slate-300">•</span>
                <span>Apresentação de Regras</span>
              </div>
              <div className="text-xs md:text-sm font-black text-slate-900 tracking-tight">
                Gestão de Bônus de Produção
              </div>
            </div>
          </div>

          {/* Slide Tracker / Pills */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentSlide
                    ? 'w-6 bg-amber-500 shadow-2xs'
                    : 'w-2 bg-slate-300 hover:bg-slate-400'
                }`}
                title={`Slide ${idx + 1}: ${s.title}`}
              />
            ))}
            <span className="text-[11px] font-mono font-bold text-slate-600 ml-2">
              {String(currentSlide + 1).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}
            </span>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-2">
            {/* Download PowerPoint Button */}
            <button
              onClick={handleDownloadPptx}
              disabled={isDownloadingPptx}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 border border-amber-600/30 text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Baixar Apresentação no formato PowerPoint (.pptx)"
            >
              <Download className={`w-3.5 h-3.5 ${isDownloadingPptx ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isDownloadingPptx ? 'Gerando PPTX...' : 'Baixar PowerPoint'}</span>
            </button>

            {/* Autoplay button */}
            <button
              onClick={() => setIsAutoplay(prev => !prev)}
              className={`p-1.5 px-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                isAutoplay
                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title={isAutoplay ? 'Pausar Autoplay (15s)' : 'Iniciar Autoplay (15s)'}
            >
              {isAutoplay ? <Pause className="w-3.5 h-3.5 text-amber-700" /> : <Play className="w-3.5 h-3.5 text-slate-600" />}
              <span className="hidden sm:inline">{isAutoplay ? 'Pausar' : 'Automático'}</span>
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 px-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 transition-colors cursor-pointer shadow-2xs"
              title="Tela Cheia (F)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 transition-colors cursor-pointer"
              title="Fechar Apresentação (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Slide Area: Zero scrollbar, full screen width distribution */}
      <div className="flex-1 overflow-hidden px-6 md:px-12 lg:px-16 py-4 md:py-6 w-full flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full space-y-3.5 max-h-[82vh] flex flex-col justify-center"
          >
            {/* Slide Category & Counter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs ${activeSlide.badgeColor}`}>
                  {activeSlide.category}
                </span>
                <span className="text-xs text-slate-600 font-mono font-bold">
                  Slide {activeSlide.id} de {totalSlides}
                </span>
              </div>

              {isFullscreen && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadPptx}
                    disabled={isDownloadingPptx}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black flex items-center gap-1 cursor-pointer"
                    title="Baixar PowerPoint (.pptx)"
                  >
                    <Download className="w-3 h-3" />
                    <span>PPTX</span>
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    className="p-1 rounded-lg bg-white/80 hover:bg-white text-slate-700 text-xs border border-slate-300 cursor-pointer"
                    title="Sair da Tela Cheia (F)"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs border border-rose-200 cursor-pointer"
                    title="Fechar (Esc)"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Slide Titles */}
            <div className="space-y-0.5">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                {activeSlide.title}
              </h2>
              <p className="text-xs md:text-sm text-slate-600 font-medium">
                {activeSlide.subtitle}
              </p>
            </div>

            {/* Slide Body */}
            <div className="pt-1 w-full">
              {activeSlide.content}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Footer Navigation */}
      <div className="w-full bg-white border-t border-slate-200/90 shadow-2xs px-4 md:px-8 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono hidden sm:flex">
            <span>Navegue com</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-[9px] text-slate-700 font-bold">←</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-[9px] text-slate-700 font-bold">→</kbd>
            <span>ou</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-[9px] text-slate-700 font-bold">ESPAÇO</kbd>
          </div>

          <button
            onClick={handleDownloadPptx}
            disabled={isDownloadingPptx}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Baixar Apresentação PowerPoint (.pptx)"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" />
            <span>PowerPoint (.pptx)</span>
          </button>
        </div>

        {/* Center Progress Text */}
        <div className="text-xs font-bold text-slate-600">
          Slide <span className="text-slate-900 font-mono font-black text-sm">{currentSlide + 1}</span> de <span className="text-slate-900 font-mono font-black text-sm">{totalSlides}</span>
        </div>

        {/* Previous / Next Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
              currentSlide === 0
                ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-2xs'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Anterior</span>
          </button>

          <button
            onClick={nextSlide}
            disabled={currentSlide === totalSlides - 1}
            className={`px-4 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 uppercase tracking-wider transition-all cursor-pointer ${
              currentSlide === totalSlides - 1
                ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-xs active:scale-95'
            }`}
          >
            <span>{currentSlide === totalSlides - 1 ? 'Fim' : 'Próximo'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
