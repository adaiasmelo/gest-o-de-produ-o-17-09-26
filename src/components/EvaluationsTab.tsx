import React from 'react';
import { Award, FileDown, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { Collaborator, OperatorTrainingSheet } from '../types';
import { ROLE_MODULES_MAP, TRAINING_ROLES } from '../data/trainingModules';
import { isCollaboratorSilenced } from '../utils/silenceUtils';

interface TrainingModule {
  id: string;
  label: string;
  weight: number;
  description: string;
}

interface EvaluationsTabProps {
  dashboardMonth: string;
  collaborators: Collaborator[];
  evalSelectedOperator: string;
  setEvalSelectedOperator: (val: string) => void;
  promotionTimeframe: 'current' | '2_months' | '3_months' | '6_months' | '1_year';
  setPromotionTimeframe: (val: 'current' | '2_months' | '3_months' | '6_months' | '1_year') => void;
  exportPromotionEvaluationPDF: (operatorName: string) => void;
  isCreatingOpSheet: boolean;
  setIsCreatingOpSheet: (val: boolean) => void;
  newSheetEmployeeId: string;
  setNewSheetEmployeeId: (val: string) => void;
  newSheetInstructor: string;
  setNewSheetInstructor: (val: string) => void;
  newSheetStartDate: string;
  setNewSheetStartDate: (val: string) => void;
  operatorTrainingSheets: OperatorTrainingSheet[];
  activeOpSheet: OperatorTrainingSheet | null;
  setActiveOpSheet: (sheet: OperatorTrainingSheet | null) => void;
  handleSaveOperatorTrainingSheet: (sheet: Partial<OperatorTrainingSheet>) => Promise<void>;
  confirmDeleteOperatorTrainingSheet: (id: string, name: string) => void;
  TRAINING_MODULES: TrainingModule[];
  onClose?: () => void;
}

export const EvaluationsTab: React.FC<EvaluationsTabProps> = ({
  dashboardMonth,
  collaborators,
  evalSelectedOperator,
  setEvalSelectedOperator,
  promotionTimeframe,
  setPromotionTimeframe,
  exportPromotionEvaluationPDF,
  isCreatingOpSheet,
  setIsCreatingOpSheet,
  newSheetEmployeeId,
  setNewSheetEmployeeId,
  newSheetInstructor,
  setNewSheetInstructor,
  newSheetStartDate,
  setNewSheetStartDate,
  operatorTrainingSheets,
  activeOpSheet,
  setActiveOpSheet,
  handleSaveOperatorTrainingSheet,
  confirmDeleteOperatorTrainingSheet,
  TRAINING_MODULES,
  onClose,
}) => {
  const [newSheetTargetRole, setNewSheetTargetRole] = React.useState('Auxiliar de Produção');
  const activeModules = ROLE_MODULES_MAP[activeOpSheet?.targetRole || 'Auxiliar de Produção'] || ROLE_MODULES_MAP['Auxiliar de Produção'];

  const activeCollaborators = React.useMemo(() => {
    return (collaborators || []).filter(c => !isCollaboratorSilenced(c));
  }, [collaborators]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header com design impecável */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 rounded-[2.5rem] p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-4 py-1.5 rounded-full">Painel de Carreira</span>
            <h2 className="text-2xl md:text-4xl font-black uppercase mt-3 tracking-tight">Avaliações e Promoção</h2>
            <p className="text-white/70 text-xs md:text-sm mt-2 max-w-xl">Gerencie a transição de Auxiliares para Operadores de Extrusão, controle o progresso das fichas de treinamento e emita dossiês técnicos de desempenho.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="px-5 py-3.5 bg-white/15 hover:bg-white/25 text-white border border-white/20 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
                title="Voltar ao Quadro de Pessoal"
              >
                <ArrowLeft size={16} />
                <span>Voltar ao Quadro</span>
              </button>
            )}
            <button 
              onClick={() => {
                setIsCreatingOpSheet(true);
                setActiveOpSheet(null);
                setNewSheetEmployeeId('');
                setNewSheetInstructor('');
              }}
              className="px-6 py-4 bg-white text-indigo-700 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              + Nova Ficha de Treinamento
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Card de Promoção com Name Selection */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100">
              <Award size={20} />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase text-slate-800 tracking-tight">Dossiê Técnico de Promoção</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avaliação de Desempenho Operacional</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Selecione o Colaborador</label>
              <select
                value={evalSelectedOperator}
                onChange={(e) => setEvalSelectedOperator(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Escolha um Nome --</option>
                {activeCollaborators.map(c => (
                  <option key={c.id} value={c.name}>{c.name} ({c.role || 'Auxiliar'})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Período de Referência da Avaliação</label>
              <select
                value={promotionTimeframe}
                onChange={(e) => setPromotionTimeframe(e.target.value as any)}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="current">Mês Atual ({dashboardMonth})</option>
                <option value="2_months">Últimos 2 Meses</option>
                <option value="3_months">Últimos 3 Meses</option>
                <option value="6_months">Últimos 6 Meses</option>
                <option value="1_year">Último 1 Ano</option>
              </select>
            </div>

            <button
              disabled={!evalSelectedOperator}
              onClick={() => exportPromotionEvaluationPDF(evalSelectedOperator)}
              className="w-full py-4 bg-indigo-600 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-md hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              <FileDown size={16} />
              Gerar e Baixar Dossiê PDF
            </button>
            <p className="text-[9px] text-slate-400 font-medium leading-relaxed mt-2">
              * O dossiê técnico de avaliação de desempenho operacional calcula automaticamente as taxas de refugo, produtividade líquida, eficiência geral e emite o parecer de recomendação de promoção com base nas metas da empresa.
            </p>
          </div>
        </div>

        {/* Lista de Fichas de Treinamento */}
        <div className="lg:col-span-2 space-y-6">
          {/* Form para criar nova ficha se isCreatingOpSheet for verdadeiro */}
          {isCreatingOpSheet && (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-8 animate-in slide-in-from-top duration-300 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center">
                    <Plus size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase text-slate-800 tracking-tight">Iniciar Nova Ficha de Treinamento</h4>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Preparação de Auxiliar para Operador</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCreatingOpSheet(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white border border-transparent hover:border-slate-100 transition-all"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Auxiliar em Treinamento (Nome + Função Atual)</label>
                  <select
                    value={newSheetEmployeeId}
                    onChange={(e) => setNewSheetEmployeeId(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Selecione o Auxiliar --</option>
                    {activeCollaborators
                      .filter(c => !operatorTrainingSheets.some(s => s.employeeId === c.id))
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.name} — Função Atual: {c.role || 'Auxiliar'} ({c.registration || 'Sem Matrícula'})</option>
                      ))
                    }
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Nível de Treinamento / Nova Função</label>
                  <select
                    value={newSheetTargetRole}
                    onChange={(e) => setNewSheetTargetRole(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {TRAINING_ROLES.map(role => (
                      <option key={role} value={role}>
                        {role === 'Auxiliar de Produção' ? 'Auxiliar de Produção (1º Nível - Treinamento Inicial)' : 
                         role === 'Operador 1' ? 'Operador 1 (2º Nível - Treinamento)' :
                         role === 'Operador 2' ? 'Operador 2 (3º Nível - Treinamento)' :
                         role === 'Operador 3' ? 'Operador 3 (4º Nível - Treinamento)' : role}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Instrutor Responsável</label>
                  <input
                    type="text"
                    placeholder="Nome do Instrutor / Supervisor"
                    value={newSheetInstructor}
                    onChange={(e) => setNewSheetInstructor(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Data de Início</label>
                  <input
                    type="date"
                    value={newSheetStartDate}
                    onChange={(e) => setNewSheetStartDate(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setIsCreatingOpSheet(false)}
                  className="px-6 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-100 transition-colors"
                >
                  Voltar
                </button>
                <button
                  disabled={!newSheetEmployeeId || !newSheetInstructor}
                  onClick={async () => {
                    const emp = collaborators.find(c => c.id === newSheetEmployeeId);
                    if (!emp) return;
                    
                    // Inicializa todos os módulos com completed: false com base na nova função selecionada
                    const targetModules = ROLE_MODULES_MAP[newSheetTargetRole] || ROLE_MODULES_MAP['Auxiliar de Produção'];
                    const initialModules: any = {};
                    targetModules.forEach(m => {
                      initialModules[m.id] = { completed: false, notes: '', date: '' };
                    });

                    await handleSaveOperatorTrainingSheet({
                      employeeId: emp.id,
                      employeeName: emp.name,
                      registration: emp.registration || '',
                      instructorName: newSheetInstructor,
                      startDate: newSheetStartDate,
                      progress: 0,
                      modules: initialModules,
                      targetRole: newSheetTargetRole,
                      currentRole: newSheetTargetRole === 'Auxiliar de Produção' ? 'Em Experiência' : (emp.role || 'Auxiliar de Produção')
                    });

                    setIsCreatingOpSheet(false);
                    setNewSheetEmployeeId('');
                    setNewSheetInstructor('');
                  }}
                  className="px-6 py-3.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
                >
                  Criar Ficha de Treinamento
                </button>
              </div>
            </div>
          )}

          {/* Se tiver uma ficha ativa em edição/preenchimento progressivo */}
          {activeOpSheet ? (
            <div className="bg-white rounded-[2.5rem] p-8 border border-indigo-100 shadow-md space-y-8 animate-in zoom-in-95 duration-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full">Ficha de Treinamento em Andamento</span>
                  <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight mt-2">{activeOpSheet.employeeName}</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                    Matrícula: {activeOpSheet.registration} | Função Atual: <span className="text-slate-800">{activeOpSheet.currentRole || 'Auxiliar de Produção'}</span> ➜ Treinando Para: <span className="text-indigo-600 font-black">{activeOpSheet.targetRole || 'Auxiliar de Produção'}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Instrutor: {activeOpSheet.instructorName}</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-2xl font-black text-indigo-600 font-mono">{activeOpSheet.progress}%</div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Progresso do Treinamento</div>
                  </div>
                  <button 
                    onClick={() => setActiveOpSheet(null)}
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors"
                  >
                    Voltar para Lista
                  </button>
                </div>
              </div>

              {/* Progresso visual elegante */}
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500" 
                  style={{ width: `${activeOpSheet.progress}%` }}
                ></div>
              </div>

              {activeOpSheet.progress === 100 && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center gap-4 text-emerald-800">
                  <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                    <Award size={20} />
                  </div>
                  <div>
                    <h5 className="font-black text-xs uppercase tracking-tight">Treinamento Concluído com Sucesso!</h5>
                    <p className="text-[10px] mt-0.5 opacity-90">Este auxiliar completou 100% dos requisitos práticos e teóricos do treinamento de operador de extrusão e está pronto para promoção!</p>
                  </div>
                </div>
              )}

              {/* Checklist interativa dos 10 módulos de treinamento */}
              <div className="space-y-4">
                <h5 className="font-black text-xs uppercase tracking-wider text-slate-400 mb-4">Módulos Técnicos e Práticos</h5>
                <div className="grid grid-cols-1 gap-4">
                  {activeModules.map((mod) => {
                    const moduleData = activeOpSheet.modules?.[mod.id] || { completed: false, notes: '', date: '' };
                    return (
                      <div 
                        key={mod.id} 
                        className={`p-5 rounded-2xl border transition-all ${
                          moduleData.completed 
                            ? 'bg-emerald-50/40 border-emerald-100 hover:bg-emerald-50/60' 
                            : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                              <input
                                type="checkbox"
                                id={`chk-${mod.id}`}
                                checked={moduleData.completed}
                                onChange={async (e) => {
                                  const checked = e.target.checked;
                                  const updatedModules = {
                                    ...activeOpSheet.modules,
                                    [mod.id]: {
                                      ...moduleData,
                                      completed: checked,
                                      date: checked ? new Date().toISOString().split('T')[0] : ''
                                    }
                                  };
                                  
                                  const completedCount = Object.values(updatedModules).filter((m: any) => m.completed).length;
                                  const newProgress = completedCount * 10;

                                  const updatedSheet = {
                                    ...activeOpSheet,
                                    progress: newProgress,
                                    modules: updatedModules
                                  };

                                  setActiveOpSheet(updatedSheet);
                                  await handleSaveOperatorTrainingSheet(updatedSheet);
                                }}
                                className="w-5 h-5 text-indigo-600 bg-slate-100 border-slate-300 rounded focus:ring-indigo-500 mt-1 cursor-pointer"
                              />
                            <div>
                              <label htmlFor={`chk-${mod.id}`} className="font-extrabold text-xs text-slate-800 uppercase cursor-pointer select-none">
                                {mod.label} <span className="text-[10px] text-slate-400 font-normal">({mod.weight}%)</span>
                              </label>
                              <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1">{mod.description}</p>
                            </div>
                          </div>

                          <div className="flex flex-col md:items-end gap-2 shrink-0">
                            {moduleData.completed && (
                              <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase bg-emerald-100/60 px-2.5 py-1 rounded-full">
                                <span>Aprovado em:</span>
                                <input 
                                  type="date"
                                  value={moduleData.date || ''}
                                  onChange={async (e) => {
                                    const dateVal = e.target.value;
                                    const updatedModules = {
                                      ...activeOpSheet.modules,
                                      [mod.id]: { ...moduleData, date: dateVal }
                                    };
                                    const updatedSheet = { ...activeOpSheet, modules: updatedModules };
                                    setActiveOpSheet(updatedSheet);
                                    await handleSaveOperatorTrainingSheet(updatedSheet);
                                  }}
                                  className="bg-transparent text-emerald-700 font-black focus:outline-none cursor-pointer border-none p-0 text-[9px]"
                                />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Campo de observações por módulo */}
                        <div className="mt-4 pt-4 border-t border-slate-100/60">
                          <label className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1">Anotações do Instrutor</label>
                          <input
                            type="text"
                            placeholder="Digite observações sobre o desempenho ou aprendizado deste módulo..."
                            value={moduleData.notes || ''}
                            onChange={async (e) => {
                              const notesVal = e.target.value;
                              const updatedModules = {
                                ...activeOpSheet.modules,
                                [mod.id]: { ...moduleData, notes: notesVal }
                              };
                              const updatedSheet = { ...activeOpSheet, modules: updatedModules };
                              setActiveOpSheet(updatedSheet);
                            }}
                            onBlur={async () => {
                              await handleSaveOperatorTrainingSheet(activeOpSheet);
                            }}
                            className="w-full px-3 py-2 bg-slate-50/60 border border-slate-200 rounded-lg text-[10px] text-slate-600 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                <button
                  onClick={() => confirmDeleteOperatorTrainingSheet(activeOpSheet.id, activeOpSheet.employeeName)}
                  className="px-5 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  Excluir Ficha
                </button>

                <button
                  onClick={async () => {
                    await handleSaveOperatorTrainingSheet(activeOpSheet);
                    setActiveOpSheet(null);
                  }}
                  className="px-6 py-4 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-700 transition-colors"
                >
                  Salvar e Concluir Edição
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-sm uppercase text-slate-800 tracking-tight">Fichas de Treinamento Ativas</h4>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Acompanhamento de Progresso</p>
                </div>
              </div>

              {operatorTrainingSheets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-4 bg-slate-50/50 rounded-3xl border border-dashed border-slate-100">
                  <Award size={48} className="opacity-20 text-indigo-500" />
                  <div className="text-center">
                    <p className="font-bold uppercase text-[10px] tracking-widest text-slate-500">Nenhuma ficha de treinamento aberta</p>
                    <p className="text-[9px] text-slate-400 mt-1">Abra uma nova ficha para acompanhar a capacitação técnica de um auxiliar.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {operatorTrainingSheets.map(sheet => (
                    <div 
                      key={sheet.id}
                      className="bg-white border border-slate-100 hover:border-indigo-100 rounded-[2rem] p-6 hover:shadow-md transition-all flex flex-col justify-between gap-6 group"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-black text-xs text-slate-800 uppercase tracking-tight">{sheet.employeeName}</h5>
                            <p className="text-[9px] font-bold text-slate-400 mt-0.5">Matrícula: {sheet.registration} | Função Atual: {sheet.currentRole || 'Auxiliar de Produção'}</p>
                            <p className="text-[9px] font-black text-indigo-600 uppercase tracking-wide mt-1">➜ {sheet.targetRole || 'Auxiliar de Produção'}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black text-indigo-600 font-mono bg-indigo-50 px-2 py-1 rounded-lg">{sheet.progress}%</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-400">
                            <span>Progresso</span>
                            <span>{Object.values(sheet.modules || {}).filter((m: any) => m.completed).length}/10 Módulos</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-full transition-all duration-300" 
                              style={{ width: `${sheet.progress}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-3 text-[9px] font-medium text-slate-500 space-y-1">
                          <p><span className="font-black uppercase text-slate-400">Instrutor:</span> {sheet.instructorName}</p>
                          <p><span className="font-black uppercase text-slate-400">Início:</span> {sheet.startDate.split('-').reverse().join('/')}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center gap-3 pt-2 border-t border-slate-50">
                        <button
                          onClick={() => confirmDeleteOperatorTrainingSheet(sheet.id, sheet.employeeName)}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Excluir Ficha"
                        >
                          <Trash2 size={16} />
                        </button>

                        <button
                          onClick={() => setActiveOpSheet(sheet)}
                          className="px-4 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all"
                        >
                          Abrir Ficha / Avançar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
