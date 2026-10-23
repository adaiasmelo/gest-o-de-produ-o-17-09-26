import React, { useState } from 'react';
import { 
  Factory, BarChart3, Users, Wrench, Tv, Settings, 
  Check, ChevronDown, ChevronRight, ShieldAlert, Sparkles, X, LayoutDashboard, LayoutGrid
} from 'lucide-react';
import { 
  UserPermissions, 
  HomeCardPermissions,
  ExtrusionPermissions, 
  RibbonPermissions, 
  PersonnelPermissions, 
  MaintenancePermissions, 
  SettingsPermissions 
} from '../types';
import { normalizeUserPermissions, createPresetPermissions } from '../utils/userPermissions';

interface GranularPermissionsEditorProps {
  permissions: UserPermissions;
  onChange: (newPerms: UserPermissions) => void;
  disabled?: boolean;
}

export const GranularPermissionsEditor: React.FC<GranularPermissionsEditorProps> = ({
  permissions,
  onChange,
  disabled = false
}) => {
  const norm = normalizeUserPermissions(permissions);

  // Controle de expansão de cada seção
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    homeCards: true,
    extrusion: true,
    ribbon: true,
    personnel: true,
    maintenance: true,
    projection: true,
    settings: true,
    security: true
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Helper para atualizar parte do objeto de permissões
  const updatePerms = (updates: Partial<UserPermissions>) => {
    if (disabled) return;
    onChange({
      ...norm,
      ...updates
    });
  };

  // --- Handlers de Seção Cards da Tela de Início ---
  const handleHomeCardsMasterToggle = () => {
    if (disabled) return;
    const allActive = norm.homeCards?.productionSummary &&
                      norm.homeCards?.machines &&
                      norm.homeCards?.losses &&
                      norm.homeCards?.downtime &&
                      norm.homeCards?.workforce &&
                      norm.homeCards?.ribbonSummary &&
                      norm.homeCards?.quickActions &&
                      norm.homeCards?.pwa;

    const newVal = !allActive;
    updatePerms({
      homeCards: {
        enabled: newVal,
        productionSummary: newVal,
        machines: newVal,
        losses: newVal,
        downtime: newVal,
        workforce: newVal,
        ribbonSummary: newVal,
        quickActions: newVal,
        pwa: newVal
      }
    });
  };

  const handleHomeCardsSubToggle = (key: keyof Omit<typeof norm.homeCards, 'enabled'>) => {
    if (disabled) return;
    const current = norm.homeCards || {
      enabled: false,
      productionSummary: false,
      machines: false,
      losses: false,
      downtime: false,
      workforce: false,
      ribbonSummary: false,
      quickActions: false,
      pwa: false
    };
    const updated = {
      ...current,
      [key]: !current[key]
    };
    const anyActive = updated.productionSummary ||
                      updated.machines ||
                      updated.losses ||
                      updated.downtime ||
                      updated.workforce ||
                      updated.ribbonSummary ||
                      updated.quickActions ||
                      updated.pwa;
    updated.enabled = anyActive;
    updatePerms({ homeCards: updated });
  };

  // --- Handlers de Seção Extrusão ---
  const handleExtrusionMasterToggle = () => {
    if (disabled) return;
    const allActive = norm.extrusion?.summary && 
                      norm.extrusion?.charts && 
                      norm.extrusion?.comparison && 
                      norm.extrusion?.reports && 
                      norm.extrusion?.stock && 
                      norm.extrusion?.calculator && 
                      norm.extrusion?.newEntry;
    
    const newVal = !allActive;
    const newExt: ExtrusionPermissions = {
      enabled: newVal,
      summary: newVal,
      charts: newVal,
      comparison: newVal,
      reports: newVal,
      stock: newVal,
      calculator: newVal,
      newEntry: newVal
    };
    updatePerms({ extrusion: newExt });
  };

  const handleExtrusionSubToggle = (key: keyof Omit<ExtrusionPermissions, 'enabled'>) => {
    if (disabled) return;
    const current = norm.extrusion || {
      enabled: false, summary: false, charts: false, comparison: false, reports: false, stock: false, calculator: false, newEntry: false
    };
    const updated = {
      ...current,
      [key]: !current[key]
    };
    const anyActive = updated.summary || updated.charts || updated.comparison || updated.reports || updated.stock || updated.calculator || updated.newEntry;
    updated.enabled = anyActive;
    updatePerms({ extrusion: updated });
  };

  // --- Handlers de Seção Corte de Fita ---
  const handleRibbonMasterToggle = () => {
    if (disabled) return;
    const allActive = norm.ribbon?.summary && 
                      norm.ribbon?.charts && 
                      norm.ribbon?.comparison && 
                      norm.ribbon?.reports && 
                      norm.ribbon?.productivity && 
                      norm.ribbon?.goals && 
                      norm.ribbon?.monthlyReport && 
                      norm.ribbon?.exportExcel && 
                      norm.ribbon?.newEntry;
    
    const newVal = !allActive;
    const newRib: RibbonPermissions = {
      enabled: newVal,
      summary: newVal,
      charts: newVal,
      comparison: newVal,
      reports: newVal,
      productivity: newVal,
      goals: newVal,
      monthlyReport: newVal,
      exportExcel: newVal,
      newEntry: newVal
    };
    updatePerms({ ribbon: newRib });
  };

  const handleRibbonSubToggle = (key: keyof Omit<RibbonPermissions, 'enabled'>) => {
    if (disabled) return;
    const current = norm.ribbon || {
      enabled: false, summary: false, charts: false, comparison: false, reports: false, productivity: false, goals: false, monthlyReport: false, exportExcel: false, newEntry: false
    };
    const updated = {
      ...current,
      [key]: !current[key]
    };
    const anyActive = updated.summary || updated.charts || updated.comparison || updated.reports || updated.productivity || updated.goals || updated.monthlyReport || updated.exportExcel || updated.newEntry;
    updated.enabled = anyActive;
    updatePerms({ ribbon: updated });
  };

  // --- Handlers de Seção Pessoal ---
  const handlePersonnelMasterToggle = () => {
    if (disabled) return;
    const allActive = norm.personnel?.board && 
                      norm.personnel?.vacations && 
                      norm.personnel?.training && 
                      norm.personnel?.lunch && 
                      norm.personnel?.overtime && 
                      norm.personnel?.overtimeEntries && 
                      norm.personnel?.evaluations && 
                      norm.personnel?.bonus && 
                      norm.personnel?.reports && 
                      norm.personnel?.manage;
    
    const newVal = !allActive;
    const newPers: PersonnelPermissions = {
      enabled: newVal,
      board: newVal,
      vacations: newVal,
      training: newVal,
      lunch: newVal,
      overtime: newVal,
      overtimeEntries: newVal,
      evaluations: newVal,
      bonus: newVal,
      reports: newVal,
      manage: newVal
    };
    updatePerms({ personnel: newPers });
  };

  const handlePersonnelSubToggle = (key: keyof Omit<PersonnelPermissions, 'enabled'>) => {
    if (disabled) return;
    const current = norm.personnel || {
      enabled: false, board: false, vacations: false, training: false, lunch: false, overtime: false, overtimeEntries: false, evaluations: false, bonus: false, reports: false, manage: false
    };
    const updated = {
      ...current,
      [key]: !current[key]
    };
    const anyActive = updated.board || updated.vacations || updated.training || updated.lunch || updated.overtime || updated.overtimeEntries || updated.evaluations || updated.bonus || updated.reports || updated.manage;
    updated.enabled = anyActive;
    updatePerms({ personnel: updated });
  };

  // --- Handlers de Seção Manutenção ---
  const handleMaintenanceMasterToggle = () => {
    if (disabled) return;
    const allActive = norm.maintenance?.requests && 
                      norm.maintenance?.causes && 
                      norm.maintenance?.newRequest;
    
    const newVal = !allActive;
    const newMaint: MaintenancePermissions = {
      enabled: newVal,
      requests: newVal,
      causes: newVal,
      newRequest: newVal
    };
    updatePerms({ maintenance: newMaint });
  };

  const handleMaintenanceSubToggle = (key: keyof Omit<MaintenancePermissions, 'enabled'>) => {
    if (disabled) return;
    const current = norm.maintenance || {
      enabled: false, requests: false, causes: false, newRequest: false
    };
    const updated = {
      ...current,
      [key]: !current[key]
    };
    const anyActive = updated.requests || updated.causes || updated.newRequest;
    updated.enabled = anyActive;
    updatePerms({ maintenance: updated });
  };

  // --- Handlers de Projeção ---
  const handleProjectionToggle = () => {
    if (disabled) return;
    updatePerms({
      projection: {
        enabled: !norm.projection?.enabled
      }
    });
  };

  // --- Handlers de Seção Configurações ---
  const handleSettingsMasterToggle = () => {
    if (disabled) return;
    const allActive = norm.settings?.filters && 
                      norm.settings?.goals && 
                      norm.settings?.config && 
                      norm.settings?.system && 
                      norm.settings?.app;
    
    const newVal = !allActive;
    const newSet: SettingsPermissions = {
      enabled: newVal,
      filters: newVal,
      goals: newVal,
      config: newVal,
      system: newVal,
      app: newVal
    };
    updatePerms({ settings: newSet });
  };

  const handleSettingsSubToggle = (key: keyof Omit<SettingsPermissions, 'enabled'>) => {
    if (disabled) return;
    const current = norm.settings || {
      enabled: false, filters: false, goals: false, config: false, system: false, app: false
    };
    const updated = {
      ...current,
      [key]: !current[key]
    };
    const anyActive = updated.filters || updated.goals || updated.config || updated.system || updated.app;
    updated.enabled = anyActive;
    updatePerms({ settings: updated });
  };

  // --- Presets Rápidos ---
  const applyPreset = (preset: 'readOnly' | 'operator' | 'supervisor' | 'admin' | 'clear') => {
    if (disabled) return;
    onChange(createPresetPermissions(preset));
  };

  // Contagens ativas para exibir nos cabeçalhos
  const countHomeCards = [
    norm.homeCards?.productionSummary,
    norm.homeCards?.machines,
    norm.homeCards?.losses,
    norm.homeCards?.downtime,
    norm.homeCards?.workforce,
    norm.homeCards?.ribbonSummary,
    norm.homeCards?.quickActions,
    norm.homeCards?.pwa
  ].filter(Boolean).length;

  const countExtrusion = [
    norm.extrusion?.summary,
    norm.extrusion?.charts,
    norm.extrusion?.comparison,
    norm.extrusion?.reports,
    norm.extrusion?.stock,
    norm.extrusion?.calculator,
    norm.extrusion?.newEntry
  ].filter(Boolean).length;

  const countRibbon = [
    norm.ribbon?.summary,
    norm.ribbon?.charts,
    norm.ribbon?.comparison,
    norm.ribbon?.reports,
    norm.ribbon?.productivity,
    norm.ribbon?.goals,
    norm.ribbon?.monthlyReport,
    norm.ribbon?.exportExcel,
    norm.ribbon?.newEntry
  ].filter(Boolean).length;

  const countPersonnel = [
    norm.personnel?.board,
    norm.personnel?.vacations,
    norm.personnel?.lunch,
    norm.personnel?.overtime,
    norm.personnel?.overtimeEntries,
    norm.personnel?.evaluations,
    norm.personnel?.bonus,
    norm.personnel?.training,
    norm.personnel?.reports,
    norm.personnel?.manage
  ].filter(Boolean).length;

  const countMaintenance = [
    norm.maintenance?.requests,
    norm.maintenance?.causes,
    norm.maintenance?.newRequest
  ].filter(Boolean).length;

  const countSettings = [
    norm.settings?.filters,
    norm.settings?.goals,
    norm.settings?.config,
    norm.settings?.system,
    norm.settings?.app
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Barra de Perfis Rápidos */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-amber-500" />
          <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Perfis Pré-definidos:</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => applyPreset('readOnly')}
            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95"
            title="Acesso completo somente para visualização, sem permissão para criar ou alterar nada"
          >
            🔒 Somente Leitura
          </button>
          <button
            type="button"
            onClick={() => applyPreset('operator')}
            className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95"
            title="Extrusão, Corte e lançamentos essenciais"
          >
            🏭 Operador
          </button>
          <button
            type="button"
            onClick={() => applyPreset('supervisor')}
            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95"
            title="Controle total de produção, equipe e metas"
          >
            👔 Supervisor
          </button>
          <button
            type="button"
            onClick={() => applyPreset('admin')}
            className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95"
            title="Acesso completo irrestrito a todos os módulos e configurações"
          >
            ⚡ Acesso Total
          </button>
          <button
            type="button"
            onClick={() => applyPreset('clear')}
            className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-95"
            title="Desmarcar todas as permissões"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* 0. PAINEL GERAL / INÍCIO (PRODUÇÃO DIÁRIA) */}
      <div className={`rounded-2xl border transition-all overflow-hidden ${
        norm.canViewDashboard ? 'bg-white border-blue-200 shadow-xs' : 'bg-slate-50/60 border-slate-200'
      }`}>
        <div className="flex items-center justify-between p-3 sm:p-3.5 bg-slate-50/80 gap-2">
          <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => updatePerms({ canViewDashboard: !norm.canViewDashboard })}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              norm.canViewDashboard ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
            }`}>
              <LayoutDashboard size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-800 tracking-tight">Início • Painel Geral de Produção Diária</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                  norm.canViewDashboard ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-500'
                }`}>
                  {norm.canViewDashboard ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <p className="text-[8.5px] font-medium text-slate-400">Exibição da tela inicial de produção, métricas integradas e atalhos rápidos</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => updatePerms({ canViewDashboard: !norm.canViewDashboard })}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
              norm.canViewDashboard
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {norm.canViewDashboard ? 'Ativado' : 'Desativado'}
          </button>
        </div>
      </div>

      {/* 0.1 CARDS DA FRENTE DA TELA DE INÍCIO */}
      <div className={`rounded-2xl border transition-all overflow-hidden ${
        norm.homeCards?.enabled ? 'bg-white border-sky-300 shadow-xs ring-1 ring-sky-100' : 'bg-slate-50/60 border-slate-200'
      }`}>
        <div className="flex items-center justify-between p-3 sm:p-3.5 bg-sky-50/60 border-b border-sky-100 gap-2">
          <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => toggleSection('homeCards')}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              norm.homeCards?.enabled ? 'bg-sky-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
            }`}>
              <LayoutGrid size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-800 tracking-tight">Cards da Frente • Tela de Início</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                  countHomeCards > 0 ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-500'
                }`}>
                  {countHomeCards}/8 ativos
                </span>
              </div>
              <p className="text-[8.5px] font-medium text-slate-400">Permissão individual para cada bloco e card exibido na página inicial</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleHomeCardsMasterToggle}
              className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
                countHomeCards === 8
                  ? 'bg-sky-600 text-white shadow-xs'
                  : countHomeCards > 0
                    ? 'bg-sky-100 text-sky-800 hover:bg-sky-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {countHomeCards === 8 ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
            </button>
            <button
              type="button"
              onClick={() => toggleSection('homeCards')}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              {expandedSections.homeCards ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </div>

        {expandedSections.homeCards && (
          <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { key: 'productionSummary' as const, label: 'Produção Diária & Mensal', desc: 'Consolidado Extrusão Stretch e Fita' },
              { key: 'machines' as const, label: 'Máquinas em Operação', desc: 'Status das 6 máquinas industriais' },
              { key: 'losses' as const, label: 'Refugo & Perdas', desc: 'Balanço de massa e índice de perdas' },
              { key: 'downtime' as const, label: 'Paradas de Máquina', desc: 'Horas paradas e atalho para abrir OS' },
              { key: 'workforce' as const, label: 'Equipe & DOC 076', desc: 'Ativos, brigadistas e horas extras' },
              { key: 'ribbonSummary' as const, label: 'Corte de Fita Resumo', desc: 'Produção do dia consolidada' },
              { key: 'quickActions' as const, label: 'Ações de Chão de Fábrica', desc: 'Atalhos operacionais rápidos' },
              { key: 'pwa' as const, label: 'Experiência App / PWA', desc: 'Instalação e atalho no celular' }
            ].map(item => {
              const active = !!norm.homeCards?.[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleHomeCardsSubToggle(item.key)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    active 
                      ? 'bg-sky-50/80 border-sky-300 text-sky-950 ring-1 ring-sky-100 shadow-xs' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-4 h-4 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                    active ? 'bg-sky-600 border-sky-600' : 'bg-white border-slate-300'
                  }`}>
                    {active && <Check size={12} className="text-white" />}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-tight block leading-tight">{item.label}</span>
                    <span className="text-[8px] opacity-70 block mt-0.5">{item.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 1. MÓDULO EXTRUSÃO */}
      <div className={`rounded-2xl border transition-all overflow-hidden ${
        norm.extrusion?.enabled ? 'bg-white border-blue-200 shadow-xs' : 'bg-slate-50/60 border-slate-200'
      }`}>
        <div className="flex items-center justify-between p-3 sm:p-3.5 bg-slate-50/80 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => toggleSection('extrusion')}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              norm.extrusion?.enabled ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
            }`}>
              <Factory size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-800 tracking-tight">Extrusão</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                  countExtrusion > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-500'
                }`}>
                  {countExtrusion}/7 ativas
                </span>
              </div>
              <p className="text-[8.5px] font-medium text-slate-400">Páginas e apontamentos do módulo de Extrusão</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExtrusionMasterToggle}
              className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
                countExtrusion === 7
                  ? 'bg-blue-600 text-white shadow-xs'
                  : countExtrusion > 0
                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {countExtrusion === 7 ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
            </button>
            <button
              type="button"
              onClick={() => toggleSection('extrusion')}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              {expandedSections.extrusion ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </div>

        {expandedSections.extrusion && (
          <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { key: 'summary' as const, label: 'Visão Geral', desc: 'Resumo geral e metas de produção' },
              { key: 'charts' as const, label: 'Gráfico', desc: 'Indicadores, refugo e taxa horária' },
              { key: 'comparison' as const, label: 'Comparativo BI', desc: 'Comparação de operadores e turnos' },
              { key: 'reports' as const, label: 'Relatório', desc: 'Relatórios oficiais de apontamento' },
              { key: 'stock' as const, label: 'Estoque', desc: 'Controle de saldo e consumo' },
              { key: 'calculator' as const, label: 'Calculadora CAST 1', desc: 'Cálculo de bobinas, gramatura e metragem' },
              { key: 'newEntry' as const, label: 'Novo Lançamento', desc: 'Apontar bobinas, aparas e paradas' }
            ].map(item => {
              const active = !!norm.extrusion?.[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleExtrusionSubToggle(item.key)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    active 
                      ? 'bg-blue-50/80 border-blue-300 text-blue-950 ring-1 ring-blue-100 shadow-xs' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-4 h-4 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                    active ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'
                  }`}>
                    {active && <Check size={12} className="text-white" />}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-tight block leading-tight">{item.label}</span>
                    <span className="text-[8px] opacity-70 block mt-0.5">{item.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. MÓDULO CORTE DE FITA */}
      <div className={`rounded-2xl border transition-all overflow-hidden ${
        norm.ribbon?.enabled ? 'bg-white border-indigo-200 shadow-xs' : 'bg-slate-50/60 border-slate-200'
      }`}>
        <div className="flex items-center justify-between p-3 sm:p-3.5 bg-slate-50/80 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => toggleSection('ribbon')}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              norm.ribbon?.enabled ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
            }`}>
              <BarChart3 size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-800 tracking-tight">Corte & Rebobinamento (Codifita)</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                  countRibbon > 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-500'
                }`}>
                  {countRibbon}/9 ativas
                </span>
              </div>
              <p className="text-[8.5px] font-medium text-slate-400">Páginas, relatórios e ferramentas do Corte de Fita</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRibbonMasterToggle}
              className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
                countRibbon === 9
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : countRibbon > 0
                    ? 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {countRibbon === 9 ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
            </button>
            <button
              type="button"
              onClick={() => toggleSection('ribbon')}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              {expandedSections.ribbon ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </div>

        {expandedSections.ribbon && (
          <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { key: 'summary' as const, label: 'Visão Geral', desc: 'Resumo e indicadores de corte' },
              { key: 'charts' as const, label: 'Gráfico', desc: 'Produção, perdas e taxas horárias' },
              { key: 'comparison' as const, label: 'Comparativo BI', desc: 'Análise entre operadores e turnos' },
              { key: 'reports' as const, label: 'Relatório', desc: 'Histórico de lançamentos detalhados' },
              { key: 'goals' as const, label: 'Definir Metas', desc: 'Metas operacionais e por turno' },
              { key: 'monthlyReport' as const, label: 'Relatório Mensal (PDF)', desc: 'Emissão oficial de relatório consolidado' },
              { key: 'exportExcel' as const, label: 'Exportar Dados (Excel)', desc: 'Planilha Excel de apontamentos' },
              { key: 'productivity' as const, label: 'Produtividade de Máquinas', desc: 'Ghezzi, Lintech, Wultec' },
              { key: 'newEntry' as const, label: 'Novo Lançamento', desc: 'Lançar bobinas e produção de fita' }
            ].map(item => {
              const active = !!norm.ribbon?.[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleRibbonSubToggle(item.key)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    active 
                      ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 ring-1 ring-indigo-100 shadow-xs' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-4 h-4 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                    active ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'
                  }`}>
                    {active && <Check size={12} className="text-white" />}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-tight block leading-tight">{item.label}</span>
                    <span className="text-[8px] opacity-70 block mt-0.5">{item.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. MÓDULO PESSOAL / RH */}
      <div className={`rounded-2xl border transition-all overflow-hidden ${
        norm.personnel?.enabled ? 'bg-white border-emerald-200 shadow-xs' : 'bg-slate-50/60 border-slate-200'
      }`}>
        <div className="flex items-center justify-between p-3 sm:p-3.5 bg-slate-50/80 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => toggleSection('personnel')}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              norm.personnel?.enabled ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
            }`}>
              <Users size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-800 tracking-tight">Gestão de Pessoal</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                  countPersonnel > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'
                }`}>
                  {countPersonnel}/10 ativas
                </span>
              </div>
              <p className="text-[8.5px] font-medium text-slate-400">Sub-módulos, escalas e ferramentas de equipe</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePersonnelMasterToggle}
              className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
                countPersonnel === 10
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : countPersonnel > 0
                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {countPersonnel === 10 ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
            </button>
            <button
              type="button"
              onClick={() => toggleSection('personnel')}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              {expandedSections.personnel ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </div>

        {expandedSections.personnel && (
          <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { key: 'board' as const, label: 'Quadro Geral', desc: 'Presença, lista de colaboradores e escala' },
              { key: 'vacations' as const, label: 'Controle de Férias & Retorno', desc: 'Planejamento e mapa de férias' },
              { key: 'lunch' as const, label: 'Escala de Almoço', desc: 'Horários e organização de refeições' },
              { key: 'overtime' as const, label: 'Solicitação de Hora Extra', desc: 'DOC 076 e autorizações de turno' },
              { key: 'overtimeEntries' as const, label: 'Lançamento de Horas Extras', desc: 'Apontamento mensal e controle de horas extras' },
              { key: 'evaluations' as const, label: 'Avaliação de Desempenho', desc: 'Matriz de promoção e avaliação técnica' },
              { key: 'bonus' as const, label: 'Gestão de Bônus de Produção', desc: 'Cálculo de metas, bonificação e elegibilidade' },
              { key: 'training' as const, label: 'Treinamento / DDP', desc: 'Matriz DDP e fichas de capacitação' },
              { key: 'reports' as const, label: 'Relatórios / PDF de Pessoal', desc: 'Emissão e download de relatórios do setor' },
              { key: 'manage' as const, label: 'Cadastrar / Gerir Colaboradores', desc: 'Cadastrar, editar e excluir funcionários' }
            ].map(item => {
              const active = !!norm.personnel?.[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handlePersonnelSubToggle(item.key)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    active 
                      ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 ring-1 ring-emerald-100 shadow-xs' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-4 h-4 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                    active ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-300'
                  }`}>
                    {active && <Check size={12} className="text-white" />}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-tight block leading-tight">{item.label}</span>
                    <span className="text-[8px] opacity-70 block mt-0.5">{item.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. MÓDULO MANUTENÇÃO */}
      <div className={`rounded-2xl border transition-all overflow-hidden ${
        norm.maintenance?.enabled ? 'bg-white border-amber-200 shadow-xs' : 'bg-slate-50/60 border-slate-200'
      }`}>
        <div className="flex items-center justify-between p-3 sm:p-3.5 bg-slate-50/80 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => toggleSection('maintenance')}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              norm.maintenance?.enabled ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
            }`}>
              <Wrench size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-800 tracking-tight">Manutenção</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                  countMaintenance > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-500'
                }`}>
                  {countMaintenance}/3 ativas
                </span>
              </div>
              <p className="text-[8.5px] font-medium text-slate-400">Solicitações, ordem de serviço e causas</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleMaintenanceMasterToggle}
              className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
                countMaintenance === 3
                  ? 'bg-amber-600 text-white shadow-xs'
                  : countMaintenance > 0
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {countMaintenance === 3 ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
            </button>
            <button
              type="button"
              onClick={() => toggleSection('maintenance')}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              {expandedSections.maintenance ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </div>

        {expandedSections.maintenance && (
          <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { key: 'requests' as const, label: 'Solicitações de Manutenção', desc: 'Visualizar lista e histórico de chamados' },
              { key: 'causes' as const, label: 'Análise de Causas & BI', desc: 'Diagnóstico de paradas e intervenções' },
              { key: 'newRequest' as const, label: 'Abrir Nova Solicitação', desc: 'Permissão para abrir novos chamados oficiais' }
            ].map(item => {
              const active = !!norm.maintenance?.[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleMaintenanceSubToggle(item.key)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    active 
                      ? 'bg-amber-50/80 border-amber-300 text-amber-950 ring-1 ring-amber-100 shadow-xs' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-4 h-4 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                    active ? 'bg-amber-600 border-amber-600' : 'bg-white border-slate-300'
                  }`}>
                    {active && <Check size={12} className="text-white" />}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-tight block leading-tight">{item.label}</span>
                    <span className="text-[8px] opacity-70 block mt-0.5">{item.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. MÓDULO PROJEÇÃO TV */}
      <div className={`rounded-2xl border transition-all overflow-hidden ${
        norm.projection?.enabled ? 'bg-white border-purple-200 shadow-xs' : 'bg-slate-50/60 border-slate-200'
      }`}>
        <div className="flex items-center justify-between p-3 sm:p-3.5 bg-slate-50/80 gap-2">
          <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={handleProjectionToggle}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              norm.projection?.enabled ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
            }`}>
              <Tv size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-800 tracking-tight">Projeção TV</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                  norm.projection?.enabled ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-500'
                }`}>
                  {norm.projection?.enabled ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <p className="text-[8.5px] font-medium text-slate-400">Transmissão contínua em Smart TVs e telões da fábrica</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleProjectionToggle}
            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
              norm.projection?.enabled
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {norm.projection?.enabled ? 'Ativado' : 'Desativado'}
          </button>
        </div>
      </div>

      {/* 6. MÓDULO CONFIGURAÇÕES */}
      <div className={`rounded-2xl border transition-all overflow-hidden ${
        norm.settings?.enabled ? 'bg-white border-slate-300 shadow-xs' : 'bg-slate-50/60 border-slate-200'
      }`}>
        <div className="flex items-center justify-between p-3 sm:p-3.5 bg-slate-50/80 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => toggleSection('settings')}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              norm.settings?.enabled ? 'bg-slate-800 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
            }`}>
              <Settings size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-800 tracking-tight">Configurações</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                  countSettings > 0 ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {countSettings}/5 ativas
                </span>
              </div>
              <p className="text-[8.5px] font-medium text-slate-400">Opções detalhadas do painel de Configurações</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSettingsMasterToggle}
              className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
                countSettings === 5
                  ? 'bg-slate-800 text-white shadow-xs'
                  : countSettings > 0
                    ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {countSettings === 5 ? 'Desmarcar Tudo' : 'Selecionar Tudo'}
            </button>
            <button
              type="button"
              onClick={() => toggleSection('settings')}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              {expandedSections.settings ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </div>

        {expandedSections.settings && (
          <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { key: 'filters' as const, label: 'Filtros', desc: 'Filtros globais de data, turno e operador' },
              { key: 'goals' as const, label: 'Metas', desc: 'Metas de extrusão, corte e refugo' },
              { key: 'config' as const, label: 'Cadastros', desc: 'Colaboradores, Funções, Turnos, Motivos e Usuários' },
              { key: 'system' as const, label: 'Sistema', desc: 'Identidade visual, Logo, Banco e Backup' },
              { key: 'app' as const, label: 'App / Versão', desc: 'Instalação PWA, versão e atualizações' }
            ].map(item => {
              const active = !!norm.settings?.[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleSettingsSubToggle(item.key)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    active 
                      ? 'bg-slate-100 border-slate-400 text-slate-900 ring-1 ring-slate-200 shadow-xs' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-4 h-4 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                    active ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-300'
                  }`}>
                    {active && <Check size={12} className="text-white" />}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-tight block leading-tight">{item.label}</span>
                    <span className="text-[8px] opacity-70 block mt-0.5">{item.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 7. SEGURANÇA E PROTEÇÃO: SOMENTE LEITURA */}
      <div className={`rounded-2xl border transition-all p-3 sm:p-3.5 flex items-center justify-between gap-3 ${
        norm.isReadOnly 
          ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-100 shadow-xs' 
          : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            norm.isReadOnly ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 text-slate-400'
          }`}>
            <ShieldAlert size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-slate-800 tracking-tight">Modo Somente Leitura</span>
              {norm.isReadOnly && (
                <span className="bg-amber-200/80 text-amber-950 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">
                  Ativo (Bloqueio Total de Edição)
                </span>
              )}
            </div>
            <p className="text-[8.5px] font-medium text-slate-500 mt-0.5">
              Quando ativado, o usuário poderá visualizar as páginas permitidas acima, mas estará impedido de lançar, alterar ou excluir quaisquer dados.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => updatePerms({ isReadOnly: !norm.isReadOnly })}
          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 active:scale-95 ${
            norm.isReadOnly
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {norm.isReadOnly ? 'Ativado' : 'Desativado'}
        </button>
      </div>
    </div>
  );
};
