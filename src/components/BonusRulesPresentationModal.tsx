import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Award, AlertTriangle, CheckCircle2, XCircle, Clock, FileText,
  ShieldAlert, ChevronLeft, ChevronRight, Maximize2, Minimize2,
  X, Scale, Gauge, Flame, Wrench, Sparkles, AlertOctagon,
  Check, Play, Pause, RotateCcw, MonitorPlay
} from 'lucide-react';

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
  const containerRef = useRef<HTMLDivElement>(null);

  const slides: SlideData[] = [
    // SLIDE 1: INTRODUÇÃO
    {
      id: 1,
      category: 'Programa de Excelência',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      title: 'Gestão de Bônus de Produção',
      subtitle: 'Manual Completo de Regras, Metas Operacionais e Critérios de Bonificação',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Transparência & Mérito Operacional
            </div>
            <h3 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              Reconhecer quem entrega <span className="text-amber-600 underline decoration-amber-400">performance real</span> com disciplina e qualidade.
            </h3>
            <p className="text-slate-600 text-base lg:text-lg leading-relaxed">
              O programa de bonificação da fábrica foi estruturado para recompensar a eficiência operacional nas condições reais de cada turno, equilibrando produtividade, redução de perdas técnicas e pontualidade da equipe.
            </p>
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="text-3xl font-black text-amber-600">R$ 300+</div>
                <div className="text-xs text-slate-600 mt-1 font-bold">Base de Bônus Operacional</div>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="text-3xl font-black text-emerald-600">12 Horas</div>
                <div className="text-xs text-slate-600 mt-1 font-bold">Turnos Diurno e Noturno</div>
              </div>
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="text-3xl font-black text-blue-600">100%</div>
                <div className="text-xs text-slate-600 mt-1 font-bold">Avaliação Transparente</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white p-7 rounded-3xl border border-slate-200 shadow-md space-y-4">
            <div className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" />
              Os 4 Pilares da Bonificação
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-black shadow-xs">
                1
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">Velocidade & Meta da Máquina</div>
                <div className="text-xs text-slate-600 mt-0.5">Quilo-hora (kg/h) na Extrusão e m² no Corte de Fita.</div>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-black shadow-xs">
                2
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">Controle Rígido de Refugo</div>
                <div className="text-xs text-slate-600 mt-0.5">Tolerância de perdas de produção (Eco A, Eco BP, Borra).</div>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-black shadow-xs">
                3
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">Agilidade em Limpeza de Matriz</div>
                <div className="text-xs text-slate-600 mt-0.5">Até 30 minutos por parada individual de limpeza.</div>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 font-black shadow-xs">
                4
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">Disciplina & Honestidade</div>
                <div className="text-xs text-slate-600 mt-0.5">Pontualidade, assiduidade e tolerância zero a fraudes.</div>
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
        <div className="space-y-6 h-full flex flex-col justify-center">
          <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3.5">
            <Gauge className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-950 leading-relaxed font-medium">
              <strong>Regra Fundamental:</strong> Um turno pode estar rodando um material mais pesado, outro turno um material mais leve, ou a velocidade da máquina pode ter sido ajustada pelo processo. Por isso, <strong>a meta do operador é sempre vinculada aos kg/h reais que a máquina está rodando naquele turno de 12 horas</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-amber-700 tracking-wider">Cast 1 (Exemplo Prático)</span>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-700">Alta Velocidade</span>
              </div>
              <div className="text-3xl font-black text-slate-900">1.000 kg/h</div>
              <div className="text-xs text-slate-600 leading-relaxed font-medium">
                Material tipo <strong>Stretch LC3</strong> rodando a 1.000 kg/h durante o turno de 12 horas.
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-700">
                  <span>Produção Teórica Bruta (12h):</span>
                  <span className="font-bold text-slate-900">12.000 Kg</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Tolerância de Perdas (3,5%):</span>
                  <span className="font-bold text-amber-700">- 420 Kg</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold border-t border-slate-200 pt-2 text-sm">
                  <span>Meta Líquida a Produzir:</span>
                  <span>11.580 Kg</span>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-blue-700 tracking-wider">Cast 2 (Exemplo Prático)</span>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-700">Material Padrão / ATX</span>
              </div>
              <div className="text-3xl font-black text-slate-900">850 kg/h</div>
              <div className="text-xs text-slate-600 leading-relaxed font-medium">
                Material tipo <strong>Stretch LC2 / ATX</strong> rodando a 850 kg/h no turno de 12 horas.
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-700">
                  <span>Produção Teórica Bruta (12h):</span>
                  <span className="font-bold text-slate-900">10.200 Kg</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Tolerância de Perdas (3,5%):</span>
                  <span className="font-bold text-amber-700">- 357 Kg</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold border-t border-slate-200 pt-2 text-sm">
                  <span>Meta Líquida a Produzir:</span>
                  <span>9.843 Kg</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-between text-xs text-slate-700 font-medium">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              O valor do kg/h é informado diretamente no lançamento de produção e refletido no extrato do operador.
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
        <div className="space-y-6 h-full flex flex-col justify-center">
          <p className="text-slate-700 text-sm lg:text-base leading-relaxed">
            Nenhuma máquina produz 100% de material líquido contínuo. É natural e previsto que existam aparas e purgas. Por isso, existe uma <strong>tolerância percentual de perda (padrão de 3,5% a 4,0%)</strong> sobre o volume total programado do turno.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                1
              </div>
              <div className="text-base font-bold text-slate-900">Eco A (Produção)</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Refugo nobre limpo gerado no processo operacional. Conta como perda de produção do operador.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                2
              </div>
              <div className="text-base font-bold text-slate-900">Eco BP (Produção)</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Eco B gerado por intervenção operacional ou ajuste de produção. Conta diretamente na tolerância de perdas.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                3
              </div>
              <div className="text-base font-bold text-slate-900">Borra Total</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Material de purga e início de operação. Contabilizado no cômputo geral de perda técnica do turno.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-4">
            <Scale className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-black text-emerald-950">Regra de Abatimento por Refugo</div>
              <div className="text-xs text-emerald-900 mt-1 leading-relaxed font-medium">
                Se as perdas de produção somadas (Eco A + Eco BP + Borra) ficarem <strong>dentro do limite de tolerância</strong>, o operador recebe sua pontuação integral de perdas. Se <strong>ultrapassarem o limite</strong>, a produção líquida é comprometida e ocorre desconto na bonificação proporcional ao excesso de refugo.
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Proteção ao Operador
            </div>
            <h3 className="text-2xl lg:text-3xl font-black text-slate-900 leading-tight">
              O que é <span className="text-emerald-700">ECOBM</span> e por que ele é 100% isento?
            </h3>
            <p className="text-slate-700 text-sm lg:text-base leading-relaxed">
              <strong>ECOBM</strong> significa <em>Eco B de Manutenção</em>. É todo aquele refugo gerado por quebras técnicas, trocas de peças, reparos elétricos ou problemas na infraestrutura da máquina.
            </p>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2 text-xs text-slate-700">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                Regra Clara & Mandatória:
              </div>
              <p className="leading-relaxed">
                O ECOBM <strong>NÃO desconta da meta do operador</strong>. Ele é registrado para fins de controle de manutenção da fábrica, mas no cálculo do bônus de produção ele é <strong>completamente desconsiderado</strong>.
              </p>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <Flame className="w-4 h-4 text-rose-600" />
                ECOBP (Produção)
              </div>
              <div className="text-xs text-rose-950 leading-relaxed font-medium">
                Refugo gerado por erro operacional, bobinamento torto, filme furado ou descuido do operador. 
                <span className="text-rose-700 font-bold block mt-1.5">➔ CONTA como perda e desconta do bônus se passar do limite.</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <Wrench className="w-4 h-4 text-emerald-600" />
                ECOBM (Manutenção)
              </div>
              <div className="text-xs text-emerald-950 leading-relaxed font-medium">
                Refugo gerado por parada do motor, falha de termopar, rompimento por rolamento travado ou intervenção da equipe técnica.
                <span className="text-emerald-700 font-bold block mt-1.5">➔ 100% ISENTO da meta de bônus do operador.</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 text-center font-medium">
              * Identificado separadamente no extrato individual em PDF: "EcoBM Isento".
            </div>
          </div>
        </div>
      )
    },

    // SLIDE 5: PARADAS DE MÁQUINA (LIMPEZA ≤ 30 MINUTOS)
    {
      id: 5,
      category: 'Paradas na Extrusão',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      title: 'Paradas de Máquina: A Regra dos 30 Minutos',
      subtitle: 'A Única Parada que Desconta da Meta é a Limpeza da Máquina e da Matriz',
      content: (
        <div className="space-y-6 h-full flex flex-col justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-amber-700 font-black text-sm uppercase">
                <Clock className="w-5 h-5 text-amber-600" />
                Apenas Limpeza de Matriz e Máquina
              </div>
              <p className="text-xs lg:text-sm text-slate-700 leading-relaxed font-medium">
                Na Extrusão, paradas de manutenção corretiva, preventiva ou falta de energia <strong>não tiram a meta do operador</strong>.
              </p>
              <p className="text-xs lg:text-sm text-slate-700 leading-relaxed font-medium">
                A <strong>única parada que é avaliada para perda de bônus</strong> é a parada para <span className="text-slate-900 font-bold underline decoration-amber-400">limpeza da matriz, cabeçote, roscas ou rolos</span>.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-rose-700 font-black text-sm uppercase">
                <AlertOctagon className="w-5 h-5 text-rose-600" />
                30 Minutos por Parada Individual
              </div>
              <p className="text-xs lg:text-sm text-slate-700 leading-relaxed font-medium">
                <strong>ATENÇÃO:</strong> O limite de 30 minutos <span className="text-rose-700 font-bold">NÃO é a soma acumulada de todas as paradas do dia</span>!
              </p>
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 font-medium">
                É <strong>30 minutos no máximo por cada evento individual</strong> de limpeza. Se a máquina parou 3 vezes para limpar a matriz e cada uma durou 25 minutos, está 100% aprovado!
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-600" />
              Exemplo Prático de Avaliação no Turno:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Caso Aprovado (Bateu):
                </div>
                Parada 1: 20 min | Parada 2: 25 min. Nenhuma ultrapassou 30m. <strong>Meta Mantida ✅</strong>
              </div>
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-rose-800">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Caso Reprovado (Excedeu):
                </div>
                Parada 1: 38 min (+8m de excesso). Ultrapassou 30m em evento único. <strong>Penalizado ⚠️</strong>
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
        <div className="space-y-6 h-full flex flex-col justify-center">
          <div className="p-5 rounded-2xl bg-purple-50 border border-purple-200 flex items-start gap-3.5">
            <Award className="w-6 h-6 text-purple-600 shrink-0 mt-0.5" />
            <p className="text-sm text-purple-950 leading-relaxed font-medium">
              Diferente da Extrusão que mede quilo-hora (kg/h), <strong>as máquinas de Corte de Fita (Ghezzi, Lintech e Wultec) têm sua meta avaliada exclusivamente em Metros Quadrados ($m^2$/dia)</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <span className="text-xs font-black uppercase text-purple-700">Ghezzi</span>
              <div className="text-3xl font-black text-slate-900">60.000 m²</div>
              <p className="text-xs text-slate-600 font-medium">Meta diária padrão de referência por turno.</p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <span className="text-xs font-black uppercase text-purple-700">Lintech</span>
              <div className="text-3xl font-black text-slate-900">50.000 m²</div>
              <p className="text-xs text-slate-600 font-medium">Meta diária padrão de referência por turno.</p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <span className="text-xs font-black uppercase text-purple-700">Wultec</span>
              <div className="text-3xl font-black text-slate-900">40.000 m²</div>
              <p className="text-xs text-slate-600 font-medium">Meta diária padrão de referência por turno.</p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
            <div className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Flame className="w-4 h-4 text-purple-600" />
              O que Abate a Meta de Produtividade no Corte de Fita?
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Perda Tipo 1 (m²)</span>
                <span className="text-slate-600">Abate diretamente da produtividade atingida no dia.</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Perda Tipo 2 (m²)</span>
                <span className="text-slate-600">Abate diretamente da produtividade atingida no dia.</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">Lixo / Refugo (kg ➔ m²)</span>
                <span className="text-slate-600">O peso em kg é convertido em m² pela gramatura e abatido da meta.</span>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // SLIDE 7: ASSIDUIDADE, PONTUALIDADE E SAÍDAS
    {
      id: 7,
      category: 'Conduta & Horários',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      title: 'Pontualidade, Saídas e Assiduidade',
      subtitle: 'Impacto dos Atrasos, Faltas e Saídas Antecipadas na Bonificação',
      content: (
        <div className="space-y-6 h-full flex flex-col justify-center">
          <p className="text-slate-700 text-sm lg:text-base leading-relaxed">
            A presença e o cumprimento integral da escala de 12 horas são vitais para o fluxo contínuo da fábrica. Saídas antecipadas e faltas geram desfalque na linha e afetam o resultado de toda a equipe.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <Clock className="w-5 h-5 text-amber-600" />
                Saída Antecipada Comunicada
              </div>
              <div className="text-xs text-slate-700 space-y-2">
                <p>
                  Quando o colaborador precisa sair mais cedo por motivo imprevisto e <strong>comunica o gestor direto previamente</strong> com justificativa razoável:
                </p>
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 font-bold">
                  ➔ Desconto Leve de 10% a 15% na bonificação do mês.
                </div>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Saída SEM AVISAR NINGUÉM
              </div>
              <div className="text-xs text-slate-700 space-y-2">
                <p>
                  Abandonar o posto antes do encerramento do turno <strong>sem autorização ou sem comunicar a liderança direta</strong>:
                </p>
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-950 font-bold">
                  ➔ Desconto Severo de 35% a 50% na bonificação do mês.
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-700">
            <div>
              <span className="font-bold text-slate-900 block mb-1">Atraso Injustificado:</span>
              Desconto gradual conforme o tempo de atraso (10% a 25%).
            </div>
            <div>
              <span className="font-bold text-slate-900 block mb-1">Falta Injustificada:</span>
              Desconto de 50% no bônus (1ª falta) ou 100% em reincidência.
            </div>
            <div>
              <span className="font-bold text-slate-900 block mb-1">Atestado Médico:</span>
              100% de desconto no mês (política padrão de bônus por assiduidade).
            </div>
          </div>
        </div>
      )
    },

    // SLIDE 8: TOLERÂNCIA ZERO - INFORMAÇÃO FALSA (-100%)
    {
      id: 8,
      category: 'Ética & Fraude',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      title: 'Tolerância Zero: Informação Falsa / Fraude',
      subtitle: 'Manipulação de Apontamentos ou Declarações Inverídicas = 100% de Desconto Imediato',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
          <div className="lg:col-span-5 bg-rose-50 p-7 rounded-3xl border border-rose-200 shadow-sm space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="text-2xl font-black text-rose-900 tracking-tight">
              Desqualificação Imediata (-100%)
            </div>
            <p className="text-xs text-rose-900/90 leading-relaxed font-medium">
              O sistema possui auditoria cruzada por balanças eletrônicas, câmeras do circuito interno e registros de CLP. A tentativa de burlar as regras resulta em perda imediata e irrecorrível do bônus.
            </p>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="text-xs font-black uppercase text-slate-500 tracking-wider">
              Exemplos que Configuram Informação Falsa:
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start gap-3.5">
              <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-slate-900">Desvio de Refugo para Manutenção (ECOBM)</div>
                <div className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Pegar o refugo gerado por erro operacional (Eco B Produção) e classificar fraudulentamente como "ECOBM Manutenção" para não estourar a tolerância de perda.
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start gap-3.5">
              <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-slate-900">Declaração Falsa de Parada Automática</div>
                <div className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Afirmar que a máquina quebrou sozinha em processo automático quando as câmeras e telemetria comprovam que houve intervenção ou negligência do operador.
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start gap-3.5">
              <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-slate-900">Fraude em Tara, Peso ou Metragem</div>
                <div className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Lançar pesos brutos inexistentes, taras incorretas de bobinas ou metragens falsas de corte para simular cumprimento de meta.
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // SLIDE 9: TELA DE LANÇAMENTO E EXTRATO EM PDF
    {
      id: 9,
      category: 'Ferramentas do Sistema',
      badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      title: 'Transparência: Tela de Lançamento & Extrato em PDF',
      subtitle: 'Como as Informações são Registradas e Disponibilizadas em Detalhes para Cada Colaborador',
      content: (
        <div className="space-y-6 h-full flex flex-col justify-center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-cyan-800 font-bold text-sm uppercase">
                <FileText className="w-5 h-5 text-cyan-600" />
                Na Tela de Novo Lançamento
              </div>
              <ul className="text-xs text-slate-700 space-y-3 font-medium">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                  <span><strong>Extrusão:</strong> O operador informa em quantos kg/h a máquina está trabalhando e a tolerância de perda.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                  <span><strong>Corte de Fita:</strong> Ao selecionar a máquina, define-se a meta diária em m² e lançam-se perdas Tipo 1, Tipo 2 e Lixo.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                  <span><strong>Em Tempo Real:</strong> A tela indica de imediato se a produção líquida atingiu ou não a meta estipulada.</span>
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm uppercase">
                <FileText className="w-5 h-5 text-emerald-600" />
                No Extrato Individual em PDF
              </div>
              <ul className="text-xs text-slate-700 space-y-3 font-medium">
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Dia a Dia Detalhado:</strong> Cada turno trabalhado é impresso com máquina, kg/h ou m², meta 12h e produção real.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Separação Clara de Refugo:</strong> Eco A, Eco BP, Borra vs. EcoBM de manutenção identificado como ISENTO.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Status por Turno:</strong> BATEU META ✅, EXC. LIMPEZA (&gt;30m), EXC. PERDA ou ABAIXO LÍQUIDO.</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 text-xs text-cyan-950 flex items-center justify-between font-medium">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-600" />
              O extrato pode ser impresso e entregue a cada operador no fechamento mensal com clareza total.
            </span>
            <span className="font-bold text-cyan-800">100% Auditável</span>
          </div>
        </div>
      )
    },

    // SLIDE 10: CONCLUSÃO & DIRETRIZES FINAIS
    {
      id: 10,
      category: 'Compromisso com o Sucesso',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      title: 'Conclusão: As 5 Chaves do Operador Nota 10',
      subtitle: 'Resumo das Melhores Práticas para Garantir a Bonificação Máxima Todos os Meses',
      content: (
        <div className="space-y-6 h-full flex flex-col justify-center">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                1
              </div>
              <div className="text-sm font-bold text-slate-900">Velocidade</div>
              <div className="text-xs text-slate-600 leading-relaxed font-medium">
                Manter a máquina rodando na rotação e kg/h recomendados para o material do turno.
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                2
              </div>
              <div className="text-sm font-bold text-slate-900">Refugo Baixo</div>
              <div className="text-xs text-slate-600 leading-relaxed font-medium">
                Operar com atenção total para manter Eco A, Eco BP e Borra abaixo do teto de tolerância.
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                3
              </div>
              <div className="text-sm font-bold text-slate-900">Limpeza Ágil</div>
              <div className="text-xs text-slate-600 leading-relaxed font-medium">
                Agilizar as paradas de matriz para nunca passar de 30 minutos em um único evento.
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black">
                4
              </div>
              <div className="text-sm font-bold text-slate-900">Pontualidade</div>
              <div className="text-xs text-slate-600 leading-relaxed font-medium">
                Cumprir a jornada e comunicar imediatamente a liderança em caso de imprevisto grave.
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black">
                5
              </div>
              <div className="text-sm font-bold text-slate-900">Honestidade</div>
              <div className="text-xs text-slate-600 leading-relaxed font-medium">
                Apontar 100% da verdade no sistema. A confiança operacional é inegociável.
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="text-lg font-black text-slate-900 flex items-center gap-2 justify-center sm:justify-start">
                <Award className="w-5 h-5 text-amber-600" />
                Produzir com Qualidade e Segurança é Nosso Maior Valor!
              </div>
              <div className="text-xs text-slate-700 font-medium">
                A gestão de bônus existe para construir uma fábrica mais forte e recompensar os melhores colaboradores.
              </div>
            </div>

            <button
              onClick={() => setCurrentSlide(0)}
              className="px-5 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs uppercase tracking-wider flex items-center gap-2 border border-slate-300 shadow-xs transition-all shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-slate-600" />
              Reiniciar Apresentação
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
      className="fixed inset-0 z-50 bg-slate-100 text-slate-900 flex flex-col justify-between overflow-hidden select-none"
    >
      {/* Top Header / Progress Bar */}
      <div className="w-full bg-white border-b border-slate-200/90 shadow-xs px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-sm">
            <MonitorPlay className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
              <span>Manupackaging</span>
              <span className="text-slate-300">•</span>
              <span>Apresentação de Regras</span>
            </div>
            <div className="text-sm font-black text-slate-900 tracking-tight">
              Gestão de Bônus de Produção
            </div>
          </div>
        </div>

        {/* Slide Tracker / Pills */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2.5 rounded-full transition-all cursor-pointer ${
                idx === currentSlide
                  ? 'w-7 bg-amber-500 shadow-xs'
                  : 'w-2.5 bg-slate-300 hover:bg-slate-400'
              }`}
              title={`Slide ${idx + 1}: ${s.title}`}
            />
          ))}
          <span className="text-xs font-mono font-bold text-slate-600 ml-2">
            {String(currentSlide + 1).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Autoplay button */}
          <button
            onClick={() => setIsAutoplay(prev => !prev)}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isAutoplay
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title={isAutoplay ? 'Pausar Autoplay (15s)' : 'Iniciar Autoplay (15s)'}
          >
            {isAutoplay ? <Pause className="w-4 h-4 text-amber-700" /> : <Play className="w-4 h-4 text-slate-600" />}
            <span className="hidden sm:inline">{isAutoplay ? 'Pausar' : 'Automático'}</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 transition-colors cursor-pointer shadow-2xs"
            title={isFullscreen ? 'Sair da Tela Cheia (F)' : 'Tela Cheia (F)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 transition-colors cursor-pointer"
            title="Fechar Apresentação (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Slide Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 md:px-12 md:py-8 lg:px-20 lg:py-10 max-w-7xl mx-auto w-full flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="space-y-6"
          >
            {/* Slide Category & Badge */}
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-2xs ${activeSlide.badgeColor}`}>
                {activeSlide.category}
              </span>
              <span className="text-xs text-slate-500 font-mono font-bold">
                Slide {activeSlide.id} de {totalSlides}
              </span>
            </div>

            {/* Slide Titles */}
            <div className="space-y-1">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
                {activeSlide.title}
              </h2>
              <p className="text-sm md:text-base text-slate-600 font-medium">
                {activeSlide.subtitle}
              </p>
            </div>

            {/* Slide Body */}
            <div className="pt-2">
              {activeSlide.content}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Footer Navigation */}
      <div className="w-full bg-white border-t border-slate-200/90 shadow-xs px-6 py-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-mono hidden sm:flex">
          <span>Navegue com</span>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-[10px] text-slate-700 font-bold">←</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-[10px] text-slate-700 font-bold">→</kbd>
          <span>ou</span>
          <kbd className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-[10px] text-slate-700 font-bold">ESPAÇO</kbd>
        </div>

        {/* Center Progress Text */}
        <div className="text-xs font-bold text-slate-600">
          Slide <span className="text-slate-900 font-mono font-black text-sm">{currentSlide + 1}</span> de <span className="text-slate-900 font-mono font-black text-sm">{totalSlides}</span>
        </div>

        {/* Previous / Next Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all cursor-pointer ${
              currentSlide === 0
                ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-2xs'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          <button
            onClick={nextSlide}
            disabled={currentSlide === totalSlides - 1}
            className={`px-5 py-2 rounded-xl font-black text-xs flex items-center gap-2 uppercase tracking-wider transition-all cursor-pointer ${
              currentSlide === totalSlides - 1
                ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 shadow-sm active:scale-95'
            }`}
          >
            <span>{currentSlide === totalSlides - 1 ? 'Fim' : 'Próximo'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
