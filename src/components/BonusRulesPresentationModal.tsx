import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Award, AlertTriangle, CheckCircle2, XCircle, Clock, FileText,
  ShieldAlert, ChevronLeft, ChevronRight, Maximize2, Minimize2,
  X, Scale, Gauge, Flame, Wrench, Sparkles, AlertOctagon,
  Check, Play, Pause, RotateCcw, MonitorPlay, Download,
  Smartphone, HardHat, Ban, FileSpreadsheet, UserX, Droplets,
  CreditCard, ShoppingBasket, TrendingUp, LogOut
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full py-1">
          {/* Coluna Esquerda: Visão Geral e Indicadores */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4 bg-white/70 p-6 xl:p-8 rounded-3xl border border-slate-200/90 shadow-2xs">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-800 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Transparência & Mérito Operacional
              </div>
              <h3 className="text-2xl xl:text-4xl font-black text-slate-900 tracking-tight leading-snug">
                Reconhecer quem entrega <span className="text-amber-600 underline decoration-amber-400">performance real</span> com disciplina e qualidade.
              </h3>
              <p className="text-slate-700 text-base xl:text-lg leading-relaxed font-normal">
                O programa de bonificação da fábrica foi estruturado para recompensar a eficiência operacional nas condições reais de cada turno, equilibrando produtividade, redução de perdas técnicas e pontualidade da equipe.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3">
              <div className="p-4 xl:p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs text-center">
                <div className="text-3xl xl:text-4xl font-black text-amber-600">R$ 300+</div>
                <div className="text-xs sm:text-sm text-slate-700 mt-1 font-bold">Base de Bônus Operacional</div>
              </div>
              <div className="p-4 xl:p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs text-center">
                <div className="text-3xl xl:text-4xl font-black text-emerald-600">12 Horas</div>
                <div className="text-xs sm:text-sm text-slate-700 mt-1 font-bold">Turnos Diurno e Noturno</div>
              </div>
              <div className="p-4 xl:p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs text-center">
                <div className="text-3xl xl:text-4xl font-black text-blue-600">100%</div>
                <div className="text-xs sm:text-sm text-slate-700 mt-1 font-bold">Avaliação Auditável</div>
              </div>
            </div>
          </div>

          {/* Coluna Direita: 4 Pilares espalhados */}
          <div className="lg:col-span-5 bg-white p-6 xl:p-8 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
            <div className="text-sm font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              Os 4 Pilares da Bonificação
            </div>

            <div className="flex items-start gap-3.5 p-3.5 xl:p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-black text-sm shadow-xs">
                1
              </div>
              <div>
                <div className="text-sm xl:text-base font-bold text-slate-900">Velocidade & Meta da Máquina</div>
                <div className="text-xs xl:text-sm text-slate-600 mt-0.5">kg/h na Extrusão e m² no Corte de Fita.</div>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 xl:p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-black text-sm shadow-xs">
                2
              </div>
              <div>
                <div className="text-sm xl:text-base font-bold text-slate-900">Controle Rígido de Refugo</div>
                <div className="text-xs xl:text-sm text-slate-600 mt-0.5">Tolerância de perdas de 8% (Eco A, Eco BP, Borra).</div>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 xl:p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 font-black text-sm shadow-xs">
                3
              </div>
              <div>
                <div className="text-sm xl:text-base font-bold text-slate-900">Agilidade em Limpeza de Matriz</div>
                <div className="text-xs xl:text-sm text-slate-600 mt-0.5">Até 30 minutos por parada individual de limpeza.</div>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 xl:p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 font-black text-sm shadow-xs">
                4
              </div>
              <div>
                <div className="text-sm xl:text-base font-bold text-slate-900">Disciplina & Honestidade</div>
                <div className="text-xs xl:text-sm text-slate-600 mt-0.5">Pontualidade, assiduidade e tolerância zero a fraudes.</div>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // SLIDE 2: COMPARATIVO POR FUNÇÃO & CESTA BÁSICA (VR ALIMENTAÇÃO)
    {
      id: 2,
      category: 'Benefícios & VR Alimentação',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      title: 'Comparativo de Metas por Função & Cesta Básica',
      subtitle: 'Evolução dos Valores de Bonificação e Saldo Total Creditado no Cartão VR Alimentação',
      content: (
        <div className="space-y-4 w-full py-1">
          {/* Banner explicativo: Cesta Básica de R$ 236,00 + Nova Meta = Cartão VR */}
          <div className="p-4 xl:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShoppingBasket className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm xl:text-base font-black text-slate-900 flex items-center gap-2">
                  <span>CESTA BÁSICA PADRONIZADA: R$ 236,00 PARA TODOS OS COLABORADORES</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider">Benefício Fixo</span>
                </div>
                <p className="text-xs sm:text-sm xl:text-base text-slate-700 mt-1 leading-relaxed font-medium">
                  A nova meta atingida no mês é somada à cesta básica fixa (<strong>R$ 236,00</strong>). O valor total resultante cai direto no cartão <strong>VR Alimentação</strong> do colaborador!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 bg-white/95 px-4 py-2.5 rounded-xl border border-emerald-300 shadow-2xs">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <div className="text-right">
                <div className="text-[11px] uppercase font-bold text-slate-500">Crédito Mensal</div>
                <div className="font-black text-emerald-700 text-base">VR Alimentação</div>
              </div>
            </div>
          </div>

          {/* Tabela Comparativa Exata (3 Linhas Padronizadas) */}
          <div className="overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs md:text-sm font-black uppercase tracking-wider text-slate-700">
                    <th className="py-3.5 px-4">Função</th>
                    <th className="py-3.5 px-4">Setor</th>
                    <th className="py-3.5 px-4 text-center">Meta Antiga</th>
                    <th className="py-3.5 px-4 text-center bg-amber-50/80 text-amber-900 border-x border-amber-200">Nova Meta</th>
                    <th className="py-3.5 px-4 text-center text-emerald-800" colSpan={2}>Aumento</th>
                    <th className="py-3.5 px-4 text-center text-slate-800 bg-slate-100/80">Cesta Básica</th>
                    <th className="py-3.5 px-4 text-center bg-emerald-700 text-white font-black">Total no Cartão VR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm md:text-base">
                  {/* Linha 1: Aux. de Produção */}
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 font-black text-slate-900">Aux. de Produção</td>
                    <td className="py-4 px-4 font-bold text-slate-700">Extrusão/ Fita</td>
                    <td className="py-4 px-4 text-center text-slate-500 font-semibold">R$ 100,00</td>
                    <td className="py-4 px-4 text-center font-black text-amber-700 bg-amber-50/50 border-x border-amber-200">R$ 250,00</td>
                    <td className="py-4 px-3 text-center font-black text-emerald-600">+ R$ 150,00</td>
                    <td className="py-4 px-3 text-center font-black text-emerald-700">+ 150,0%</td>
                    <td className="py-4 px-4 text-center font-bold text-slate-700 bg-slate-50/60">+ R$ 236,00</td>
                    <td className="py-4 px-4 text-center font-black text-emerald-800 bg-emerald-50/90 text-base md:text-lg">
                      R$ 486,00
                    </td>
                  </tr>

                  {/* Linha 2: Op. de Extrusora */}
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 font-black text-slate-900">Op. de Extrusora</td>
                    <td className="py-4 px-4 font-bold text-slate-700">Extrusão</td>
                    <td className="py-4 px-4 text-center text-slate-500 font-semibold">R$ 200,00</td>
                    <td className="py-4 px-4 text-center font-black text-blue-700 bg-blue-50/50 border-x border-blue-200">R$ 300,00</td>
                    <td className="py-4 px-3 text-center font-black text-emerald-600">+ R$ 100,00</td>
                    <td className="py-4 px-3 text-center font-black text-emerald-700">+ 50,0%</td>
                    <td className="py-4 px-4 text-center font-bold text-slate-700 bg-slate-50/60">+ R$ 236,00</td>
                    <td className="py-4 px-4 text-center font-black text-blue-800 bg-blue-50/90 text-base md:text-lg">
                      R$ 536,00
                    </td>
                  </tr>

                  {/* Linha 3: Operador I */}
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-4 font-black text-slate-900">Operador I</td>
                    <td className="py-4 px-4 font-bold text-slate-700">Corte de Fita</td>
                    <td className="py-4 px-4 text-center text-slate-500 font-semibold">R$ 150,00</td>
                    <td className="py-4 px-4 text-center font-black text-blue-700 bg-blue-50/50 border-x border-blue-200">R$ 300,00</td>
                    <td className="py-4 px-3 text-center font-black text-emerald-600">+ R$ 150,00</td>
                    <td className="py-4 px-3 text-center font-black text-emerald-700">+ 100,0%</td>
                    <td className="py-4 px-4 text-center font-bold text-slate-700 bg-slate-50/60">+ R$ 236,00</td>
                    <td className="py-4 px-4 text-center font-black text-blue-800 bg-blue-50/90 text-base md:text-lg">
                      R$ 536,00
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Cards de Resumo Rápido para Facilitar a Explicação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-4 xl:p-5 rounded-2xl bg-amber-50/80 border border-amber-300 flex items-center justify-between shadow-2xs">
              <div className="space-y-1">
                <span className="text-xs xl:text-sm font-black uppercase text-amber-900 tracking-wider">Auxiliares de Produção (Todos os Setores)</span>
                <div className="text-sm xl:text-base text-slate-800 font-medium">Bônus Meta: <strong>R$ 250</strong> + Cesta Básica: <strong>R$ 236</strong></div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-600 uppercase">Total no Cartão VR</div>
                <div className="text-2xl xl:text-3xl font-black text-amber-700">R$ 486,00</div>
              </div>
            </div>

            <div className="p-4 xl:p-5 rounded-2xl bg-blue-50/80 border border-blue-300 flex items-center justify-between shadow-2xs">
              <div className="space-y-1">
                <span className="text-xs xl:text-sm font-black uppercase text-blue-900 tracking-wider">Operadores I (Extrusão & Corte)</span>
                <div className="text-sm xl:text-base text-slate-800 font-medium">Bônus Meta: <strong>R$ 300</strong> + Cesta Básica: <strong>R$ 236</strong></div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-600 uppercase">Total no Cartão VR</div>
                <div className="text-2xl xl:text-3xl font-black text-blue-700">R$ 536,00</div>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // SLIDE 3: CONDIÇÃO DA MÁQUINA & QUILO-HORA (EXTRUSÃO)
    {
      id: 3,
      category: 'Extrusão (Cast 1 e Cast 2)',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      title: 'A Meta Baseada nas Condições Reais do Turno',
      subtitle: 'Aferição Dinâmica em Quilo-Hora (kg/h) em Função do Material e Velocidade',
      content: (
        <div className="space-y-4 w-full py-1">
          <div className="p-4 xl:p-5 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3.5 shadow-2xs">
            <Gauge className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm xl:text-base text-blue-950 leading-relaxed font-medium">
              <strong>Regra Fundamental:</strong> Um turno pode estar rodando um material mais pesado, outro turno um material mais leve, ou a velocidade da máquina pode ter sido ajustada pelo processo. Por isso, <strong>a meta é sempre vinculada aos kg/h reais que a máquina está rodando naquele turno de 12 horas</strong> com tolerância oficial de perdas fixada em <strong>8,0%</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-6">
            <div className="p-6 xl:p-7 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs xl:text-sm font-black uppercase text-amber-700 tracking-wider">Cast 1 (Exemplo Prático)</span>
                <span className="px-3 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-700">Alta Velocidade</span>
              </div>
              <div className="text-3xl xl:text-4xl font-black text-slate-900">1.000 kg/h</div>
              <div className="text-sm xl:text-base text-slate-700 leading-relaxed font-medium">
                Material tipo <strong>Stretch LC3</strong> rodando a 1.000 kg/h durante o turno de 12 horas.
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-sm xl:text-base">
                <div className="flex justify-between text-slate-700">
                  <span>Produção Teórica Bruta (12h):</span>
                  <span className="font-bold text-slate-900">12.000 Kg</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Tolerância de Perdas (8,0%):</span>
                  <span className="font-bold text-amber-700">- 960 Kg</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-black border-t border-slate-200 pt-2 text-base xl:text-lg">
                  <span>Meta Líquida a Produzir:</span>
                  <span>11.040 Kg</span>
                </div>
              </div>
            </div>

            <div className="p-6 xl:p-7 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs xl:text-sm font-black uppercase text-blue-700 tracking-wider">Cast 2 (Exemplo Prático)</span>
                <span className="px-3 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-700">Material Padrão / ATX</span>
              </div>
              <div className="text-3xl xl:text-4xl font-black text-slate-900">850 kg/h</div>
              <div className="text-sm xl:text-base text-slate-700 leading-relaxed font-medium">
                Material tipo <strong>Stretch LC2 / ATX</strong> rodando a 850 kg/h no turno de 12 horas.
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-sm xl:text-base">
                <div className="flex justify-between text-slate-700">
                  <span>Produção Teórica Bruta (12h):</span>
                  <span className="font-bold text-slate-900">10.200 Kg</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Tolerância de Perdas (8,0%):</span>
                  <span className="font-bold text-amber-700">- 816 Kg</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-black border-t border-slate-200 pt-2 text-base xl:text-lg">
                  <span>Meta Líquida a Produzir:</span>
                  <span>9.384 Kg</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-700 font-medium">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              O valor do kg/h é informado no lançamento de produção e refletido no extrato do colaborador.
            </span>
            <span className="font-mono text-slate-600 font-bold">12 Horas por Turno (Diurno / Noturno)</span>
          </div>
        </div>
      )
    },

    // SLIDE 4: TOLERÂNCIA DE PERDAS NA EXTRUSÃO
    {
      id: 4,
      category: 'Regra de Refugo',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      title: 'Tolerância de Perdas de Produção',
      subtitle: 'Como o Limite de Refugo é Calculado para Proteger a Meta Líquida',
      content: (
        <div className="space-y-4 w-full py-1">
          <p className="text-slate-700 text-sm xl:text-base leading-relaxed">
            Nenhuma máquina produz 100% de material líquido contínuo. É natural e previsto que existam aparas e purgas. Por isso, existe uma <strong>tolerância percentual de perda estabelecida em 8,0%</strong> sobre o volume total programado do turno.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 xl:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div className="text-base xl:text-lg font-bold text-slate-900">
                Eco A (Isento até 8%)
              </div>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                O Eco A <strong>só gera perda se ultrapassar 8% da produção do dia</strong>. Se for até 8%, é 100% isento e não causa desconto percentual de bônus!
              </p>
            </div>

            <div className="p-5 xl:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div className="text-base xl:text-lg font-bold text-slate-900">Eco BP (Produção)</div>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                Eco B gerado por intervenção operacional ou ajuste. Conta diretamente na tolerância de perdas do turno.
              </p>
            </div>

            <div className="p-5 xl:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div className="text-base xl:text-lg font-bold text-slate-900">Borra Total</div>
              <p className="text-sm text-slate-600 leading-relaxed font-medium">
                Material de purga e início de operação. Contabilizado no cômputo geral de perda técnica do turno.
              </p>
            </div>
          </div>

          {/* Regra Oficial ECOA */}
          <div className="p-5 xl:p-6 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-start gap-4 shadow-2xs">
            <Sparkles className="w-7 h-7 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm xl:text-base font-black text-emerald-950 uppercase tracking-wide">
                Regra Especial do ECOA: Isenção Total até 8% da Produção do Dia
              </div>
              <div className="text-sm xl:text-base text-emerald-900 mt-1 leading-relaxed font-medium">
                O refugo de <strong>ECOA somente terá perda de porcentagem de bônus se ultrapassar 8% da produção total do dia</strong>. Se o ECOA do dia for igual ou inferior a 8%, <strong>não haverá perda nenhuma e não gerará nenhum desconto percentual no bônus</strong>!
              </div>
            </div>
          </div>

          <div className="p-4 xl:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5 shadow-2xs">
            <Scale className="w-6 h-6 text-slate-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm xl:text-base font-black text-slate-900">Regra de Abatimento Geral por Refugo</div>
              <div className="text-xs sm:text-sm text-slate-700 mt-1 leading-relaxed font-medium">
                Se as perdas avaliadas (EcoA acima de 8% + Eco BP + Borra) ficarem <strong>dentro do limite de tolerância (8,0%)</strong>, a pontuação integral é mantida. Se <strong>ultrapassarem o limite</strong>, a produção líquida é comprometida e ocorre desconto na bonificação proporcional ao excesso de refugo.
              </div>
            </div>
          </div>
        </div>
      )
    },

    // SLIDE 5: ISENÇÃO DO ECOBM (MANUTENÇÃO)
    {
      id: 5,
      category: 'Regra de Ouro da Extrusão',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      title: 'Isenção de ECOBM (Manutenção)',
      subtitle: 'Refugo Decorrente de Problemas Mecânicos ou Elétricos Não Prejudica o Operador',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch w-full py-1">
          <div className="lg:col-span-6 space-y-4 bg-white/70 p-6 xl:p-8 rounded-3xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-black uppercase border border-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Proteção Operacional
              </div>
              <h3 className="text-2xl xl:text-3xl font-black text-slate-900 leading-snug">
                O que é <span className="text-emerald-700">ECOBM</span> e por que ele é 100% isento?
              </h3>
              <p className="text-slate-700 text-sm xl:text-base leading-relaxed">
                <strong>ECOBM</strong> significa <em>Eco B de Manutenção</em>. É todo aquele refugo gerado por quebras técnicas, trocas de peças, reparos elétricos ou problemas na infraestrutura da máquina.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 text-sm xl:text-base text-slate-700">
              <div className="font-bold text-slate-900 flex items-center gap-2 text-base">
                <Check className="w-5 h-5 text-emerald-600" />
                Regra Clara & Mandatória:
              </div>
              <p className="leading-relaxed">
                O ECOBM <strong>NÃO desconta da meta do operador</strong>. Ele é registrado para fins de controle de manutenção da fábrica, mas no cálculo do bônus de produção ele é <strong>completamente desconsiderado</strong>.
              </p>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
            <div className="p-5 xl:p-6 rounded-2xl bg-rose-50 border border-rose-200 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2.5 text-rose-800 font-black text-base xl:text-lg">
                <Flame className="w-5 h-5 text-rose-600" />
                ECOBP (Produção)
              </div>
              <div className="text-sm xl:text-base text-rose-950 leading-relaxed font-medium">
                Refugo gerado por erro operacional, bobinamento torto, filme furado ou descuido. 
                <span className="text-rose-700 font-bold block mt-1.5">➔ CONTA como perda e desconta do bônus se passar do limite de 8%.</span>
              </div>
            </div>

            <div className="p-5 xl:p-6 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2.5 text-emerald-800 font-black text-base xl:text-lg">
                <Wrench className="w-5 h-5 text-emerald-600" />
                ECOBM (Manutenção)
              </div>
              <div className="text-sm xl:text-base text-emerald-950 leading-relaxed font-medium">
                Refugo gerado por parada do motor, falha de termopar, rompimento por rolamento travado ou intervenção técnica.
                <span className="text-emerald-700 font-bold block mt-1.5">➔ 100% ISENTO da meta de bônus do operador.</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-xs sm:text-sm text-slate-700 text-center font-medium">
              * Identificado separadamente no extrato individual em PDF: "EcoBM Isento".
            </div>
          </div>
        </div>
      )
    },

    // SLIDE 6: PARADAS DE MÁQUINA E LIMPEZA OBRIGATÓRIA
    {
      id: 6,
      category: 'Paradas na Extrusão',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      title: 'Paradas de Máquina & Limpeza Obrigatória',
      subtitle: 'Regra dos 30 Minutos (Desconto se Ultrapassar) e Limpeza a Menos (-50% no Ranking e -20% no Bônus)',
      content: (
        <div className="space-y-4 xl:space-y-5 w-full flex-1 flex flex-col justify-between">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-6">
            <div className="p-5 xl:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2.5 text-amber-700 font-black text-sm xl:text-base uppercase">
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                Apenas Limpeza de Matriz e Máquina
              </div>
              <p className="text-sm xl:text-base text-slate-700 leading-relaxed font-medium">
                Na Extrusão, paradas de manutenção mecânica, elétrica ou falta de energia <strong>não tiram a meta da equipe</strong>.
              </p>
              <p className="text-sm xl:text-base text-slate-700 leading-relaxed font-medium">
                A <strong>única parada avaliada para perda de bônus</strong> é a parada para <span className="text-slate-900 font-bold underline decoration-amber-400">limpeza da matriz, cabeçote, roscas ou rolos</span>.
              </p>
            </div>

            <div className="p-5 xl:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2.5 text-rose-700 font-black text-sm xl:text-base uppercase">
                <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
                30 Minutos por Parada Individual (Desconto se Passar)
              </div>
              <p className="text-sm xl:text-base text-slate-700 leading-relaxed font-medium">
                <strong>ATENÇÃO:</strong> O limite de 30 minutos <span className="text-rose-700 font-bold">NÃO é a soma acumulada</span>! É <strong>30 minutos no máximo por cada evento individual</strong> de limpeza.
              </p>
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-xs xl:text-sm text-rose-950 font-bold leading-relaxed space-y-1">
                <div className="flex items-center gap-2 text-rose-700 font-black uppercase text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  Passou de 30 Minutos ➔ Desconto no Bônus de Produção
                </div>
                <p className="text-xs text-rose-900 font-medium">
                  Se qualquer evento de limpeza exceder 30 minutos, o turno perde a meta de parada e sofre <strong>desconto direto na bonificação de produção</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* NOVA REGRA: PARADA DE LIMPEZA OBRIGATÓRIA NÃO REALIZADA / FEITA A MENOS */}
          <div className="p-5 xl:p-6 rounded-2xl bg-gradient-to-r from-rose-50 to-amber-50 border-2 border-rose-300 shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 text-rose-900 font-black text-sm xl:text-base uppercase tracking-wide">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                Limpeza Obrigatória Não Realizada ➔ -50% no Ranking e -20% no Bônus de Produção
              </div>
              <span className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-black uppercase tracking-wider shrink-0">
                Regra de Disciplina e Justiça
              </span>
            </div>
            <p className="text-sm xl:text-base text-slate-800 leading-relaxed font-medium">
              Se for determinada uma quantidade de paradas para limpeza no turno (ex.: <strong>2 paradas obrigatórias de limpeza</strong>) e o operador realizar menos (ex.: apenas 1 parada), para não dar vantagem injusta sobre quem cumpriu o procedimento e teve menos tempo de máquina rodando:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs xl:text-sm">
              <div className="p-3.5 rounded-xl bg-white/95 border border-rose-300 space-y-1 shadow-2xs">
                <strong className="text-rose-800 text-sm xl:text-base block">📉 -50% no Ranking do Operador:</strong>
                <span className="text-slate-700 leading-relaxed block">O sistema abate automaticamente <strong>50% da produção líquida do dia exclusivamente no ranking de produtividade</strong> para anular a vantagem indevida de volume.</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white/95 border border-amber-300 space-y-1 shadow-2xs">
                <strong className="text-amber-900 text-sm xl:text-base block">💰 -20% no Bônus de Produção:</strong>
                <span className="text-slate-700 leading-relaxed block">Aplica-se <strong>desconto de 20% diretamente na bonificação mensal</strong> do operador pelo descumprimento da diretriz técnica de limpeza do maquinário.</span>
              </div>
              <div className="p-3.5 rounded-xl bg-white/95 border border-emerald-300 space-y-1 shadow-2xs">
                <strong className="text-emerald-800 text-sm xl:text-base block">📊 Relatórios Gerais Preservados:</strong>
                <span className="text-slate-700 leading-relaxed block">Nos relatórios contábeis, faturamento e estoque fabril, <strong>o volume real físico fabricado é 100% mantido</strong>.</span>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // SLIDE 7: CORTE DE FITA (METAS EM M² E ABATIMENTO DE PERDAS)
    {
      id: 7,
      category: 'Setor de Corte de Fita',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      title: 'Regras do Setor de Corte de Fita (Rebobinadeiras)',
      subtitle: 'Metas Expressas em Metros Quadrados (m²) com Abatimento de Tipo 1, Tipo 2 e Lixo',
      content: (
        <div className="space-y-4 xl:space-y-6 w-full flex-1 flex flex-col justify-between">
          <div className="p-4 xl:p-5 rounded-2xl bg-purple-50 border border-purple-200 flex items-start gap-3">
            <Award className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <p className="text-sm xl:text-base text-purple-950 leading-relaxed font-medium">
              Diferente da Extrusão que mede quilo-hora (kg/h), <strong>as máquinas de Corte de Fita (Ghezzi, Lintech e Wultec) têm sua meta avaliada exclusivamente em Metros Quadrados (m²/dia)</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-6">
            <div className="p-5 xl:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
              <span className="text-xs font-black uppercase text-purple-700 tracking-wider">Ghezzi</span>
              <div className="text-3xl xl:text-4xl font-black text-slate-900">60.000 m²</div>
              <p className="text-xs xl:text-sm text-slate-600 font-medium">Meta diária padrão de referência por turno.</p>
            </div>

            <div className="p-5 xl:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
              <span className="text-xs font-black uppercase text-purple-700 tracking-wider">Lintech</span>
              <div className="text-3xl xl:text-4xl font-black text-slate-900">50.000 m²</div>
              <p className="text-xs xl:text-sm text-slate-600 font-medium">Meta diária padrão de referência por turno.</p>
            </div>

            <div className="p-5 xl:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
              <span className="text-xs font-black uppercase text-purple-700 tracking-wider">Wultec</span>
              <div className="text-3xl xl:text-4xl font-black text-slate-900">40.000 m²</div>
              <p className="text-xs xl:text-sm text-slate-600 font-medium">Meta diária padrão de referência por turno.</p>
            </div>
          </div>

          <div className="p-5 xl:p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="text-sm xl:text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2.5">
              <Flame className="w-5 h-5 text-purple-600" />
              O que Abate a Meta de Produtividade no Corte de Fita?
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs xl:text-sm">
              <div className="p-3.5 xl:p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 text-sm xl:text-base block mb-1">Perda Tipo 1 (m²)</span>
                <span className="text-slate-600 text-xs xl:text-sm leading-relaxed block">Abate diretamente da produtividade atingida no dia.</span>
              </div>
              <div className="p-3.5 xl:p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 text-sm xl:text-base block mb-1">Perda Tipo 2 (m²)</span>
                <span className="text-slate-600 text-xs xl:text-sm leading-relaxed block">Abate diretamente da produtividade atingida no dia.</span>
              </div>
              <div className="p-3.5 xl:p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 text-sm xl:text-base block mb-1">Lixo / Refugo (kg ➔ m²)</span>
                <span className="text-slate-600 text-xs xl:text-sm leading-relaxed block">O peso em kg é convertido em m² pela gramatura e abatido da meta.</span>
              </div>
            </div>
          </div>
        </div>
      )
    },

    // SLIDE 8: CRITÉRIOS DE FECHAMENTO MENSAL - QUALIDADE & APONTAMENTOS
    {
      id: 8,
      category: '2. Qualidade',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      title: 'Critérios de Qualidade & Apontamentos',
      subtitle: 'Regras de Fechamento Mensal: Impacto de Devoluções, Reclamações e Registros',
      content: (
        <div className="space-y-4 xl:space-y-5 w-full flex-1 flex flex-col justify-between">
          <p className="text-slate-700 text-sm xl:text-base leading-relaxed font-medium">
            A bonificação recompensa a produção feita com excelência técnica. Falhas de produto e omissões nos apontamentos geram descontos diretos na meta mensal conforme a tabela oficial de fechamento:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 xl:gap-4">
            <div className="p-4 xl:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-indigo-700" />
              </div>
              <div className="text-sm xl:text-base font-bold text-slate-900 leading-tight">
                Erro Operacional (Devolução)
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs xl:text-sm text-indigo-950 font-black">
                ➔ Perde até 20% da meta
              </div>
              <p className="text-xs xl:text-sm text-slate-600 leading-relaxed font-medium">
                Lote devolvido decorrente de falha operacional (espessura fora de tolerância, cônico ou contaminação).
              </p>
            </div>

            <div className="p-4 xl:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-sm">
                <AlertOctagon className="w-5 h-5 text-indigo-700" />
              </div>
              <div className="text-sm xl:text-base font-bold text-slate-900 leading-tight">
                Reclamação Interna
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs xl:text-sm text-indigo-950 font-black">
                ➔ Perde até 20% da meta
              </div>
              <p className="text-xs xl:text-sm text-slate-600 leading-relaxed font-medium">
                Não conformidade detectada pela expedição ou retrabalho gerado para o setor posterior.
              </p>
            </div>

            <div className="p-4 xl:p-5 rounded-2xl bg-white border border-amber-200 shadow-2xs space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold text-sm">
                <Droplets className="w-5 h-5 text-cyan-700" />
              </div>
              <div className="text-sm xl:text-base font-bold text-slate-900 leading-tight">
                Matéria-Prima Molhada
              </div>
              <div className="p-2.5 rounded-xl bg-cyan-50 border border-cyan-200 text-xs xl:text-sm text-cyan-950 font-black">
                ➔ Perde 20% da meta
              </div>
              <p className="text-xs xl:text-sm text-slate-600 leading-relaxed font-medium">
                Abastecimento com matéria-prima molhada decorrente de falta de atenção do auxiliar.
              </p>
            </div>

            <div className="p-4 xl:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-sm">
                <FileSpreadsheet className="w-5 h-5 text-indigo-700" />
              </div>
              <div className="text-sm xl:text-base font-bold text-slate-900 leading-tight">
                Mau Preenchimento
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs xl:text-sm text-amber-950 font-black">
                ➔ Perde 10% da meta
              </div>
              <p className="text-xs xl:text-sm text-slate-600 leading-relaxed font-medium">
                Omissão de paradas, rasuras ou dados incorretos no lançamento de produção.
              </p>
            </div>
          </div>

          <div className="p-3.5 xl:p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs xl:text-sm text-slate-700 flex items-center gap-2.5 font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Todos os dados devem ser conferidos diariamente pelo líder de turno antes do fechamento mensal.</span>
          </div>
        </div>
      )
    },

    // SLIDE 9: CRITÉRIOS DE FECHAMENTO MENSAL - ASSIDUIDADE & PONTUALIDADE
    {
      id: 9,
      category: '3. Assiduidade & Horários',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      title: 'Assiduidade, Faltas, Advertências e Horários',
      subtitle: 'Regras de Fechamento Mensal: Presença e Cumprimento Rígido da Jornada',
      content: (
        <div className="space-y-4 xl:space-y-5 w-full flex-1 flex flex-col justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 xl:gap-4">
            <div className="p-5 xl:p-6 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-sm xl:text-base">
                <UserX className="w-5 h-5 text-rose-600 shrink-0" />
                1 Atestado Médico
              </div>
              <div className="text-xl xl:text-2xl font-black text-rose-700">PERDE A META</div>
              <p className="text-xs xl:text-sm text-rose-950/80 leading-relaxed font-medium">
                100% de desconto na bonificação do mês de referência.
              </p>
            </div>

            <div className="p-5 xl:p-6 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-sm xl:text-base">
                <UserX className="w-5 h-5 text-rose-600 shrink-0" />
                1 Falta sem Justificativa
              </div>
              <div className="text-xl xl:text-2xl font-black text-rose-700">PERDE A META</div>
              <p className="text-xs xl:text-sm text-rose-950/80 leading-relaxed font-medium">
                100% de desconto na bonificação do mês de referência.
              </p>
            </div>

            <div className="p-5 xl:p-6 rounded-2xl bg-rose-50 border-2 border-rose-300 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-sm xl:text-base">
                <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
                1 Advertência por Escrito
              </div>
              <div className="text-xl xl:text-2xl font-black text-rose-700">PERDE A META</div>
              <p className="text-xs xl:text-sm text-rose-950/80 leading-relaxed font-medium">
                100% de desconto na bonificação do mês de referência.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-5">
            <div className="p-5 xl:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm xl:text-base">
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                Atrasos Injustificados
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 font-bold text-xs xl:text-sm text-amber-950">
                A cada 10 minutos de atraso ➔ perde 1% da meta
              </div>
              <p className="text-xs xl:text-sm text-slate-600 font-medium leading-relaxed">
                Exemplo: 30 minutos de atraso acumulados = 3% de perda percentual no bônus do mês.
              </p>
            </div>

            <div className="p-5 xl:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm xl:text-base">
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                Horas Extras Não Autorizadas
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 font-bold text-xs xl:text-sm text-amber-950">
                A cada 10 minutos de HE não autorizada ➔ perde 1% da meta
              </div>
              <p className="text-xs xl:text-sm text-slate-600 font-medium leading-relaxed">
                A permanência em posto além da escala sem prévia validação formal da liderança acarreta desconto proporcional.
              </p>
            </div>
          </div>

          {/* Saídas Fora do Horário (Comunicada vs Sem Avisar) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xl:gap-5">
            <div className="p-4 xl:p-5 rounded-2xl bg-amber-50 border border-amber-300 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm xl:text-base">
                <LogOut className="w-5 h-5 text-amber-700 shrink-0" />
                Saída Fora do Horário Comunicada (Com Aviso)
              </div>
              <div className="p-2.5 rounded-xl bg-white/90 border border-amber-200 font-black text-xs xl:text-sm text-amber-950">
                ➔ Desconto de 10% a 15% na bonificação do mês
              </div>
              <p className="text-xs xl:text-sm text-amber-950/80 font-medium leading-relaxed">
                Saída antecipada ou fora da escala devidamente informada e autorizada previamente pela liderança imediata.
              </p>
            </div>

            <div className="p-4 xl:p-5 rounded-2xl bg-rose-50 border border-rose-300 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-sm xl:text-base">
                <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0" />
                Saída Fora do Horário Sem Avisar (Abandono)
              </div>
              <div className="p-2.5 rounded-xl bg-white/90 border border-rose-200 font-black text-xs xl:text-sm text-rose-900">
                ➔ Desconto Severo de 35% a 50% na bonificação do mês
              </div>
              <p className="text-xs xl:text-sm text-rose-950/80 font-medium leading-relaxed">
                Deixar o posto ou ausentar-se da fábrica sem prévia comunicação formal. Configura abandono e falta grave contra a equipe.
              </p>
            </div>
          </div>
        </div>
      )
    },

    // SLIDE 10: CRITÉRIOS DE FECHAMENTO MENSAL - COMPORTAMENTO & SEGURANÇA
    {
      id: 10,
      category: '4. Comportamento & Segurança',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      title: 'Comportamento no Trabalho & Normas de Segurança',
      subtitle: 'Uso de Celular, Tabagismo em Área Proibida e Cumprimento Obrigatório de EPIs',
      content: (
        <div className="space-y-4 xl:space-y-5 w-full flex-1 flex flex-col justify-between">
          <p className="text-slate-700 text-sm xl:text-base leading-relaxed font-medium">
            A integridade física e a disciplina na linha de produção são inegociáveis. Infrações às normas de conduta acarretam perda de 20% na primeira ocorrência e perda total (100%) em caso de reincidência:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-5">
            <div className="p-5 xl:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-rose-700 font-black text-sm xl:text-base uppercase">
                <Smartphone className="w-5 h-5 text-rose-600 shrink-0" />
                Uso de Celular no Trabalho
              </div>
              <div className="space-y-2 text-xs xl:text-sm">
                <div className="p-2.5 xl:p-3 rounded-xl bg-amber-50 border border-amber-200 font-bold text-amber-950">
                  1ª Ocorrência: ➔ Perde 20% da meta
                </div>
                <div className="p-2.5 xl:p-3 rounded-xl bg-rose-50 border border-rose-300 font-black text-rose-900">
                  Reincidente: ➔ Perde 100% da meta
                </div>
              </div>
              <p className="text-xs xl:text-sm text-slate-600 leading-relaxed font-medium">
                Proibido uso de smartphone ou fones durante a operação das máquinas (risco de prensamento e quebra de atenção).
              </p>
            </div>

            <div className="p-5 xl:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-rose-700 font-black text-sm xl:text-base uppercase">
                <Ban className="w-5 h-5 text-rose-600 shrink-0" />
                Fumar no Período de Trabalho
              </div>
              <div className="space-y-2 text-xs xl:text-sm">
                <div className="p-2.5 xl:p-3 rounded-xl bg-amber-50 border border-amber-200 font-bold text-amber-950">
                  1ª Ocorrência: ➔ Perde 20% da meta
                </div>
                <div className="p-2.5 xl:p-3 rounded-xl bg-rose-50 border border-rose-300 font-black text-rose-900">
                  Reincidente: ➔ Perde 100% da meta
                </div>
              </div>
              <p className="text-xs xl:text-sm text-slate-600 leading-relaxed font-medium">
                Tabagismo fora das áreas e horários expressamente permitidos. Infração sanitária e de segurança industrial contra incêndio.
              </p>
            </div>

            <div className="p-5 xl:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-rose-700 font-black text-sm xl:text-base uppercase">
                <HardHat className="w-5 h-5 text-rose-600 shrink-0" />
                Não Uso de EPIs Obrigatórios
              </div>
              <div className="space-y-2 text-xs xl:text-sm">
                <div className="p-2.5 xl:p-3 rounded-xl bg-amber-50 border border-amber-200 font-bold text-amber-950">
                  1ª Ocorrência: ➔ Perde 20% da meta
                </div>
                <div className="p-2.5 xl:p-3 rounded-xl bg-rose-50 border border-rose-300 font-black text-rose-900">
                  Reincidente: ➔ Perde 100% da meta
                </div>
              </div>
              <p className="text-xs xl:text-sm text-slate-600 leading-relaxed font-medium">
                Obrigatório uso de protetor auricular, calçado de segurança, luvas adequadas e óculos de proteção na fábrica.
              </p>
            </div>
          </div>

          <div className="p-4 xl:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-xs xl:text-sm text-amber-950 flex items-center justify-between font-medium">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-amber-700 shrink-0" />
              A segurança e a vida de cada colaborador estão sempre em 1º lugar.
            </span>
            <span className="font-bold text-amber-800 uppercase tracking-wide text-xs">Tolerância Zero a Desvios Graves</span>
          </div>
        </div>
      )
    },

    // SLIDE 11: TOLERÂNCIA ZERO - INFORMAÇÃO FALSA (-100%)
    {
      id: 11,
      category: 'Ética & Fraude',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      title: 'Tolerância Zero: Informação Falsa / Fraude',
      subtitle: 'Manipulação de Apontamentos ou Declarações Inverídicas = 100% de Desconto Imediato',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center w-full flex-1">
          <div className="lg:col-span-5 bg-rose-50 p-6 xl:p-8 rounded-3xl border border-rose-200 shadow-2xs space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="text-2xl xl:text-3xl font-black text-rose-900 tracking-tight leading-tight">
              Desqualificação Imediata (-100%)
            </div>
            <p className="text-sm xl:text-base text-rose-900/90 leading-relaxed font-medium">
              O sistema possui auditoria cruzada por balanças eletrônicas, câmeras do circuito interno e registros de CLP. A tentativa de burlar as regras resulta em perda imediata e irrecorrível do bônus.
            </p>
          </div>

          <div className="lg:col-span-7 space-y-3.5 xl:space-y-4">
            <div className="text-xs font-black uppercase text-slate-500 tracking-wider">
              Exemplos que Configuram Informação Falsa:
            </div>

            <div className="p-4 xl:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-start gap-3.5">
              <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm xl:text-base font-bold text-slate-900">Desvio de Refugo para Manutenção (ECOBM)</div>
                <div className="text-xs xl:text-sm text-slate-600 mt-1 leading-relaxed">
                  Pegar o refugo gerado por erro operacional (Eco B Produção) e classificar fraudulentamente como "ECOBM Manutenção" para não estourar a tolerância de perda.
                </div>
              </div>
            </div>

            <div className="p-4 xl:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-start gap-3.5">
              <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm xl:text-base font-bold text-slate-900">Declaração Falsa de Parada Automática</div>
                <div className="text-xs xl:text-sm text-slate-600 mt-1 leading-relaxed">
                  Afirmar que a máquina quebrou sozinha em processo automático quando as câmeras e telemetria comprovam que houve intervenção ou negligência operacional.
                </div>
              </div>
            </div>

            <div className="p-4 xl:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-start gap-3.5">
              <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm xl:text-base font-bold text-slate-900">Fraude em Tara, Peso ou Metragem</div>
                <div className="text-xs xl:text-sm text-slate-600 mt-1 leading-relaxed">
                  Lançar pesos brutos inexistentes, taras incorretas de bobinas ou metragens falsas de corte para simular cumprimento de meta.
                </div>
              </div>
            </div>
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
        <div className="flex-1 flex flex-col justify-center items-center my-auto w-full space-y-5 xl:space-y-7 py-2">
          {/* As 5 Chaves Centralizadas no Meio da Tela */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 xl:gap-4 w-full">
            <div className="p-5 xl:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm">
                1
              </div>
              <div className="text-sm xl:text-base font-bold text-slate-900">Velocidade</div>
              <div className="text-xs xl:text-sm text-slate-600 leading-relaxed font-medium">
                Manter a máquina rodando na rotação e kg/h recomendados para o material do turno.
              </div>
            </div>

            <div className="p-5 xl:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                2
              </div>
              <div className="text-sm xl:text-base font-bold text-slate-900">Refugo Baixo</div>
              <div className="text-xs xl:text-sm text-slate-600 leading-relaxed font-medium">
                Operar com atenção para manter Eco A (≤8%), Eco BP e Borra abaixo do teto de tolerância.
              </div>
            </div>

            <div className="p-5 xl:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                3
              </div>
              <div className="text-sm xl:text-base font-bold text-slate-900">Limpeza Ágil</div>
              <div className="text-xs xl:text-sm text-slate-600 leading-relaxed font-medium">
                Cumprir paradas obrigatórias de limpeza sem nunca passar de 30 minutos em um único evento.
              </div>
            </div>

            <div className="p-5 xl:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-black text-sm">
                4
              </div>
              <div className="text-sm xl:text-base font-bold text-slate-900">Pontualidade</div>
              <div className="text-xs xl:text-sm text-slate-600 leading-relaxed font-medium">
                Cumprir a jornada, zelar pelos EPIs e comunicar liderança imediatamente em imprevistos.
              </div>
            </div>

            <div className="p-5 xl:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-black text-sm">
                5
              </div>
              <div className="text-sm xl:text-base font-bold text-slate-900">Honestidade</div>
              <div className="text-xs xl:text-sm text-slate-600 leading-relaxed font-medium">
                Apontar 100% da verdade no sistema. A confiança operacional é inegociável.
              </div>
            </div>
          </div>

          {/* Card de Finalização e Agradecimento (Sem botão de reiniciar) */}
          <div className="p-6 xl:p-7 rounded-3xl bg-gradient-to-r from-amber-50 via-amber-100/70 to-emerald-50 border-2 border-amber-300 w-full text-center space-y-2.5 shadow-xs">
            <div className="text-lg xl:text-2xl font-black text-slate-900 flex items-center justify-center gap-3">
              <Award className="w-6 h-6 text-amber-600 shrink-0" />
              <span>MUITO OBRIGADO PELA ATENÇÃO E DEDICAÇÃO DE TODOS!</span>
            </div>
            <p className="text-sm xl:text-base text-slate-700 font-medium max-w-4xl mx-auto leading-relaxed">
              Produzir com <strong>qualidade, segurança e disciplina</strong> é o nosso maior compromisso. Contamos com o empenho e o profissionalismo de cada operador e auxiliar para superarmos juntos todas as metas e alcançarmos a bonificação máxima!
            </p>
            <div className="pt-1 flex items-center justify-center gap-2 text-xs xl:text-sm font-bold text-amber-900 uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Manupackaging Brasil — Rumo à Excelência Operacional</span>
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
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

      {/* Main Slide Area: Full viewport presence, optimal vertical distribution */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 md:px-12 lg:px-16 py-3 sm:py-4 w-full flex flex-col justify-between">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSlide.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full min-h-full flex-1 flex flex-col justify-between gap-3"
          >
            {/* Header: Categoria, Títulos e Logo Manupackaging ISO 9001 */}
            <div className="flex items-start justify-between gap-4 shrink-0">
              <div className="space-y-1.5 max-w-4xl">
                <div className="flex items-center gap-2.5">
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-2xs ${activeSlide.badgeColor}`}>
                    {activeSlide.category}
                  </span>
                  <span className="text-xs sm:text-sm text-slate-500 font-mono font-bold">
                    Slide {activeSlide.id} de {totalSlides}
                  </span>
                </div>

                <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  {activeSlide.title}
                </h2>
                <p className="text-sm md:text-base text-slate-600 font-medium leading-relaxed">
                  {activeSlide.subtitle}
                </p>
              </div>

              {/* Logo Manupackaging ISO 9001 & Fullscreen Controls */}
              <div className="flex items-center gap-3 shrink-0">
                <img
                  src="/assets/aistudio/ap_logo-ISO-Manuli__002__42f5b2f1.png"
                  alt="Manupackaging ISO 9001:2015"
                  className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-2xs select-none"
                />

                {isFullscreen && (
                  <div className="flex items-center gap-1.5 ml-1">
                    <button
                      onClick={handleDownloadPptx}
                      disabled={isDownloadingPptx}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1 cursor-pointer"
                      title="Baixar PowerPoint (.pptx)"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PPTX</span>
                    </button>
                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-700 text-xs border border-slate-300 cursor-pointer"
                      title="Sair da Tela Cheia (F)"
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={onClose}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs border border-rose-200 cursor-pointer"
                      title="Fechar (Esc)"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Slide Body: Expands to fill available vertical space */}
            <div className="flex-1 flex flex-col justify-center py-1 w-full">
              {activeSlide.content}
            </div>

            {/* Rodapé do Slide com Nome do Supervisor Adaías Melo */}
            <div className="flex justify-end pt-1 shrink-0">
              <span className="text-xs md:text-sm text-slate-500 font-bold tracking-wide">
                Adaías Melo – Supervisor de Produção
              </span>
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
