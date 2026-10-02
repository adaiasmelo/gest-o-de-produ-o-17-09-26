import React, { useState, useEffect, useRef } from 'react';
import { 
  Home as HomeIcon, 
  Factory, 
  BarChart3, 
  Users, 
  Wrench, 
  Tv, 
  ChevronDown, 
  LayoutDashboard, 
  TrendingUp, 
  Layers, 
  FileDown, 
  FileSpreadsheet, 
  Gauge, 
  Target, 
  FileText, 
  Download, 
  Calendar, 
  Award, 
  Utensils, 
  Clock, 
  ShieldCheck, 
  Palmtree, 
  AlertCircle,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { UserPermissions } from '../types';

export interface TopNavbarProps {
  activeTab: string;
  extrusionSubTab: string;
  dashboardSubTab: string;
  ribbonSubTab: string;
  ribbonDashboardSubTab: string;
  personnelSubView: string;
  maintenanceSubTab: string;
  onNavigateHome: () => void;
  onNavigateExtrusion: (subTab: string, dashSubTab?: string) => void;
  onNavigateRibbon: (subTab: string, dashSubTab?: string) => void;
  onNavigatePersonnel: (subView: string) => void;
  onNavigateMaintenance: (subTab: string) => void;
  onNavigateProjection: () => void;
  onOpenRibbonGoals?: () => void;
  onExportRibbonPDF?: () => void;
  onExportRibbonExcel?: () => void;
  onOpenPersonnelFerias?: () => void;
  isAdmin: boolean;
  canViewHome: boolean;
  userPerms: UserPermissions;
  isReadOnlyAccount: boolean;
  totalFerias?: number;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  activeTab,
  extrusionSubTab,
  dashboardSubTab,
  ribbonSubTab,
  ribbonDashboardSubTab,
  personnelSubView,
  maintenanceSubTab,
  onNavigateHome,
  onNavigateExtrusion,
  onNavigateRibbon,
  onNavigatePersonnel,
  onNavigateMaintenance,
  onNavigateProjection,
  onOpenRibbonGoals,
  onExportRibbonPDF,
  onExportRibbonExcel,
  onOpenPersonnelFerias,
  isAdmin,
  canViewHome,
  userPerms,
  isReadOnlyAccount,
  totalFerias = 0,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Fechamento inteligente ao clicar fora ou pressionar ESC
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const toggleDropdown = (name: string) => {
    setOpenDropdown(prev => (prev === name ? null : name));
  };

  const closeDropdown = () => {
    setOpenDropdown(null);
  };

  return (
    <nav 
      ref={navRef}
      className="relative z-50 w-full mb-3 select-none"
      aria-label="Navegação Superior Principal"
    >
      {/* Botões diretamente na tela principal - Sem card/fundo atrás e SEM NENHUMA barra de rolagem */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        
        {/* 1. EXTRUSÃO */}
        {(isAdmin || userPerms.extrusion.enabled) && (
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown('extrusion')}
              className={`group flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 ${
                activeTab === 'extrusion'
                  ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-white shadow-lg shadow-blue-500/30 border border-blue-400/50 scale-[1.02]'
                  : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 border border-slate-200/90 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/15 hover:-translate-y-0.5'
              }`}
              title="Módulo de Extrusão"
              aria-expanded={openDropdown === 'extrusion'}
            >
              <div className={`p-1 rounded-lg transition-colors ${
                activeTab === 'extrusion' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
              }`}>
                <Factory size={15} />
              </div>
              <span>Extrusão</span>
              <ChevronDown 
                size={14} 
                className={`transition-transform duration-300 ${
                  openDropdown === 'extrusion' 
                    ? 'rotate-180 text-blue-400' 
                    : activeTab === 'extrusion' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'
                }`} 
              />
            </button>

            {/* Caixinha Flutuante com as Opções de Extrusão */}
            {openDropdown === 'extrusion' && (
              <div className="absolute top-full left-0 mt-2 w-64 sm:w-72 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-200/90 p-2 z-50 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150 ease-out">
                <div className="px-3 py-1.5 mb-1.5 border-b border-slate-100 flex items-center justify-between text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    <span>Setor de Extrusão</span>
                  </div>
                  <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Módulo</span>
                </div>

                <div className="space-y-1">
                  {(isAdmin || userPerms.extrusion.summary) && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDropdown();
                        onNavigateExtrusion('dashboard', 'summary');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                        activeTab === 'extrusion' && extrusionSubTab === 'dashboard' && dashboardSubTab === 'summary'
                          ? 'bg-blue-600 text-white font-black shadow-sm shadow-blue-500/30'
                          : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/50 hover:text-blue-600 hover:translate-x-1'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          activeTab === 'extrusion' && extrusionSubTab === 'dashboard' && dashboardSubTab === 'summary'
                            ? 'bg-white/20 text-white'
                            : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                        }`}>
                          <LayoutDashboard size={14} />
                        </div>
                        <span>Visão Geral</span>
                      </div>
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                    </button>
                  )}

                  {(isAdmin || userPerms.extrusion.charts) && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDropdown();
                        onNavigateExtrusion('dashboard', 'charts');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                        activeTab === 'extrusion' && extrusionSubTab === 'dashboard' && dashboardSubTab === 'charts'
                          ? 'bg-blue-600 text-white font-black shadow-sm shadow-blue-500/30'
                          : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/50 hover:text-blue-600 hover:translate-x-1'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          activeTab === 'extrusion' && extrusionSubTab === 'dashboard' && dashboardSubTab === 'charts'
                            ? 'bg-white/20 text-white'
                            : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                        }`}>
                          <TrendingUp size={14} />
                        </div>
                        <span>Gráficos</span>
                      </div>
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600" />
                    </button>
                  )}

                  {(isAdmin || userPerms.extrusion.comparison) && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDropdown();
                        onNavigateExtrusion('dashboard', 'comparison');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                        activeTab === 'extrusion' && extrusionSubTab === 'dashboard' && dashboardSubTab === 'comparison'
                          ? 'bg-blue-600 text-white font-black shadow-sm shadow-blue-500/30'
                          : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/50 hover:text-blue-600 hover:translate-x-1'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          activeTab === 'extrusion' && extrusionSubTab === 'dashboard' && dashboardSubTab === 'comparison'
                            ? 'bg-white/20 text-white'
                            : 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white'
                        }`}>
                          <Layers size={14} />
                        </div>
                        <span>Comparativo BI</span>
                      </div>
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-600" />
                    </button>
                  )}

                  {(isAdmin || userPerms.extrusion.reports) && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDropdown();
                        onNavigateExtrusion('reports');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                        activeTab === 'extrusion' && extrusionSubTab === 'reports'
                          ? 'bg-blue-600 text-white font-black shadow-sm shadow-blue-500/30'
                          : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/50 hover:text-blue-600 hover:translate-x-1'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          activeTab === 'extrusion' && extrusionSubTab === 'reports'
                            ? 'bg-white/20 text-white'
                            : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'
                        }`}>
                          <FileDown size={14} />
                        </div>
                        <span>Relatórios</span>
                      </div>
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600" />
                    </button>
                  )}

                  {(isAdmin || userPerms.extrusion.stock) && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDropdown();
                        onNavigateExtrusion('stock');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                        activeTab === 'extrusion' && extrusionSubTab === 'stock'
                          ? 'bg-blue-600 text-white font-black shadow-sm shadow-blue-500/30'
                          : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/50 hover:text-blue-600 hover:translate-x-1'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          activeTab === 'extrusion' && extrusionSubTab === 'stock'
                            ? 'bg-white/20 text-white'
                            : 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white'
                        }`}>
                          <FileSpreadsheet size={14} />
                        </div>
                        <span>Estoque</span>
                      </div>
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-600" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. CORTE DE FITA */}
        {(isAdmin || userPerms.ribbon.enabled) && (
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown('ribbon')}
              className={`group flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 ${
                activeTab === 'ribbon'
                  ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-white shadow-lg shadow-blue-500/30 border border-blue-400/50 scale-[1.02]'
                  : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 border border-slate-200/90 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/15 hover:-translate-y-0.5'
              }`}
              title="Módulo de Corte de Fita"
              aria-expanded={openDropdown === 'ribbon'}
            >
              <div className={`p-1 rounded-lg transition-colors ${
                activeTab === 'ribbon' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
              }`}>
                <BarChart3 size={15} />
              </div>
              <span>Corte de Fita</span>
              <ChevronDown 
                size={14} 
                className={`transition-transform duration-300 ${
                  openDropdown === 'ribbon' 
                    ? 'rotate-180 text-blue-400' 
                    : activeTab === 'ribbon' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'
                }`} 
              />
            </button>

            {/* Caixinha Flutuante com as Opções de Corte de Fita */}
            {openDropdown === 'ribbon' && (
              <div className="absolute top-full left-0 mt-2 w-64 sm:w-72 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-200/90 p-2 z-50 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150 ease-out">
                <div className="px-3 py-1.5 mb-1.5 border-b border-slate-100 flex items-center justify-between text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    <span>Setor Corte de Fita</span>
                  </div>
                  <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Módulo</span>
                </div>

                <div className="space-y-1">
                  {(isAdmin || userPerms.ribbon.summary) && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDropdown();
                        onNavigateRibbon('dashboard', 'summary');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                        activeTab === 'ribbon' && ribbonSubTab === 'dashboard' && ribbonDashboardSubTab === 'summary'
                          ? 'bg-blue-600 text-white font-black shadow-sm shadow-blue-500/30'
                          : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/50 hover:text-blue-600 hover:translate-x-1'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          activeTab === 'ribbon' && ribbonSubTab === 'dashboard' && ribbonDashboardSubTab === 'summary'
                            ? 'bg-white/20 text-white'
                            : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                        }`}>
                          <LayoutDashboard size={14} />
                        </div>
                        <span>Visão Geral</span>
                      </div>
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                    </button>
                  )}

                  {(isAdmin || userPerms.ribbon.charts) && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDropdown();
                        onNavigateRibbon('dashboard', 'charts');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                        activeTab === 'ribbon' && ribbonSubTab === 'dashboard' && ribbonDashboardSubTab === 'charts'
                          ? 'bg-blue-600 text-white font-black shadow-sm shadow-blue-500/30'
                          : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/50 hover:text-blue-600 hover:translate-x-1'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          activeTab === 'ribbon' && ribbonSubTab === 'dashboard' && ribbonDashboardSubTab === 'charts'
                            ? 'bg-white/20 text-white'
                            : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                        }`}>
                          <TrendingUp size={14} />
                        </div>
                        <span>Gráficos</span>
                      </div>
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600" />
                    </button>
                  )}

                  {(isAdmin || userPerms.ribbon.comparison) && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDropdown();
                        onNavigateRibbon('dashboard', 'comparison');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                        activeTab === 'ribbon' && ribbonSubTab === 'dashboard' && ribbonDashboardSubTab === 'comparison'
                          ? 'bg-blue-600 text-white font-black shadow-sm shadow-blue-500/30'
                          : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/50 hover:text-blue-600 hover:translate-x-1'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          activeTab === 'ribbon' && ribbonSubTab === 'dashboard' && ribbonDashboardSubTab === 'comparison'
                            ? 'bg-white/20 text-white'
                            : 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white'
                        }`}>
                          <Layers size={14} />
                        </div>
                        <span>Comparativo BI</span>
                      </div>
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-600" />
                    </button>
                  )}

                  {(isAdmin || userPerms.ribbon.reports) && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDropdown();
                        onNavigateRibbon('reports');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                        activeTab === 'ribbon' && ribbonSubTab === 'reports'
                          ? 'bg-blue-600 text-white font-black shadow-sm shadow-blue-500/30'
                          : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/50 hover:text-blue-600 hover:translate-x-1'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          activeTab === 'ribbon' && ribbonSubTab === 'reports'
                            ? 'bg-white/20 text-white'
                            : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'
                        }`}>
                          <FileDown size={14} />
                        </div>
                        <span>Relatório de Lançamentos</span>
                      </div>
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600" />
                    </button>
                  )}

                  {(isAdmin || userPerms.ribbon.productivity) && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDropdown();
                        onNavigateRibbon('productivity');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                        activeTab === 'ribbon' && ribbonSubTab === 'productivity'
                          ? 'bg-blue-600 text-white font-black shadow-sm shadow-blue-500/30'
                          : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/50 hover:text-blue-600 hover:translate-x-1'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          activeTab === 'ribbon' && ribbonSubTab === 'productivity'
                            ? 'bg-white/20 text-white'
                            : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                        }`}>
                          <Gauge size={14} />
                        </div>
                        <span>Produtividade de Máquina</span>
                      </div>
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                    </button>
                  )}

                  {(isAdmin || (userPerms.settings.goals && !isReadOnlyAccount)) && onOpenRibbonGoals && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDropdown();
                        onOpenRibbonGoals();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer text-indigo-700 hover:bg-indigo-50 hover:translate-x-1 group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white text-indigo-600 flex items-center justify-center shrink-0 transition-colors">
                          <Target size={14} />
                        </div>
                        <span>Definir Metas</span>
                      </div>
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600" />
                    </button>
                  )}

                  {(isAdmin || userPerms.ribbon.reports) && onExportRibbonPDF && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDropdown();
                        onExportRibbonPDF();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer text-blue-700 hover:bg-blue-50 hover:translate-x-1 group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 group-hover:bg-blue-600 group-hover:text-white text-blue-600 flex items-center justify-center shrink-0 transition-colors">
                          <FileText size={14} />
                        </div>
                        <span>Relatório Mensal (PDF)</span>
                      </div>
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                    </button>
                  )}

                  {(isAdmin || userPerms.ribbon.reports) && onExportRibbonExcel && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDropdown();
                        onExportRibbonExcel();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer text-emerald-700 hover:bg-emerald-50 hover:translate-x-1 group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white text-emerald-600 flex items-center justify-center shrink-0 transition-colors">
                          <Download size={14} />
                        </div>
                        <span>Exportar Excel</span>
                      </div>
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. PESSOAL & EQUIPE */}
        {(isAdmin || userPerms.personnel.enabled) && (
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown('personnel')}
              className={`group flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 ${
                activeTab === 'personnel'
                  ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-white shadow-lg shadow-blue-500/30 border border-blue-400/50 scale-[1.02]'
                  : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 border border-slate-200/90 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/15 hover:-translate-y-0.5'
              }`}
              title="Módulo de Pessoal & Equipe"
              aria-expanded={openDropdown === 'personnel'}
            >
              <div className={`p-1 rounded-lg transition-colors ${
                activeTab === 'personnel' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
              }`}>
                <Users size={15} />
              </div>
              <span>Pessoal & Equipe</span>
              <ChevronDown 
                size={14} 
                className={`transition-transform duration-300 ${
                  openDropdown === 'personnel' 
                    ? 'rotate-180 text-blue-400' 
                    : activeTab === 'personnel' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'
                }`} 
              />
            </button>

            {/* Caixinha Flutuante com as Opções de Pessoal & Equipe */}
            {openDropdown === 'personnel' && (
              <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 w-72 sm:w-80 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-200/90 p-2 z-50 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150 ease-out">
                <div className="px-3 py-1.5 mb-1.5 border-b border-slate-100 flex items-center justify-between text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    <span>Gestão de Pessoas</span>
                  </div>
                  <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Módulo</span>
                </div>

                <div className="space-y-1">
                  {(isAdmin || userPerms.personnel.board) && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDropdown();
                        onNavigatePersonnel('board');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                        activeTab === 'personnel' && personnelSubView === 'board'
                          ? 'bg-blue-600 text-white font-black shadow-sm shadow-blue-500/30'
                          : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/50 hover:text-blue-600 hover:translate-x-1'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          activeTab === 'personnel' && personnelSubView === 'board'
                            ? 'bg-white/20 text-white'
                            : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                        }`}>
                          <Users size={14} />
                        </div>
                        <span>Quadro Geral</span>
                      </div>
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                    </button>
                  )}

                  {onOpenPersonnelFerias && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDropdown();
                        onOpenPersonnelFerias();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer text-amber-800 hover:bg-amber-50 hover:translate-x-1 group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                          <Palmtree size={14} />
                        </div>
                        <span>Colaboradores em Férias</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-200 text-amber-900 border border-amber-300">
                        {totalFerias}
                      </span>
                    </button>
                  )}

                  {(isAdmin || userPerms.personnel.vacations) && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDropdown();
                        onNavigatePersonnel('vacations');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                        activeTab === 'personnel' && personnelSubView === 'vacations'
                          ? 'bg-blue-600 text-white font-black shadow-sm shadow-blue-500/30'
                          : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/50 hover:text-blue-600 hover:translate-x-1'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          activeTab === 'personnel' && personnelSubView === 'vacations'
                            ? 'bg-white/20 text-white'
                            : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                        }`}>
                          <Calendar size={14} />
                        </div>
                        <span>Programação de Férias</span>
                      </div>
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600" />
                    </button>
                  )}

                  {(isAdmin || userPerms.personnel.training) && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDropdown();
                        onNavigatePersonnel('training');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                        activeTab === 'personnel' && personnelSubView === 'training'
                          ? 'bg-blue-600 text-white font-black shadow-sm shadow-blue-500/30'
                          : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/50 hover:text-blue-600 hover:translate-x-1'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          activeTab === 'personnel' && personnelSubView === 'training'
                            ? 'bg-white/20 text-white'
                            : 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white'
                        }`}>
                          <Award size={14} />
                        </div>
                        <span>Treinamentos</span>
                      </div>
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-600" />
                    </button>
                  )}

                  {(isAdmin || userPerms.personnel.lunch) && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDropdown();
                        onNavigatePersonnel('lunch');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                        activeTab === 'personnel' && personnelSubView === 'lunch'
                          ? 'bg-blue-600 text-white font-black shadow-sm shadow-blue-500/30'
                          : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/50 hover:text-blue-600 hover:translate-x-1'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          activeTab === 'personnel' && personnelSubView === 'lunch'
                            ? 'bg-white/20 text-white'
                            : 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white'
                        }`}>
                          <Utensils size={14} />
                        </div>
                        <span>Escala de Almoço</span>
                      </div>
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-600" />
                    </button>
                  )}

                  {(isAdmin || userPerms.personnel.overtime) && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDropdown();
                        onNavigatePersonnel('overtime');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                        activeTab === 'personnel' && personnelSubView === 'overtime'
                          ? 'bg-blue-600 text-white font-black shadow-sm shadow-blue-500/30'
                          : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/50 hover:text-blue-600 hover:translate-x-1'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          activeTab === 'personnel' && personnelSubView === 'overtime'
                            ? 'bg-white/20 text-white'
                            : 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white'
                        }`}>
                          <Clock size={14} />
                        </div>
                        <span>Solicitação de Horas Extras</span>
                      </div>
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-600" />
                    </button>
                  )}

                  {(isAdmin || userPerms.personnel.overtimeEntries) && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDropdown();
                        onNavigatePersonnel('overtime_entries');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                        activeTab === 'personnel' && personnelSubView === 'overtime_entries'
                          ? 'bg-blue-600 text-white font-black shadow-sm shadow-blue-500/30'
                          : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/50 hover:text-blue-600 hover:translate-x-1'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          activeTab === 'personnel' && personnelSubView === 'overtime_entries'
                            ? 'bg-white/20 text-white'
                            : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                        }`}>
                          <Clock size={14} />
                        </div>
                        <span>Lançamento de Horas Extras</span>
                      </div>
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                    </button>
                  )}

                  {(isAdmin || userPerms.personnel.evaluations) && (
                    <button
                      type="button"
                      onClick={() => {
                        closeDropdown();
                        onNavigatePersonnel('evaluations');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                        activeTab === 'personnel' && personnelSubView === 'evaluations'
                          ? 'bg-blue-600 text-white font-black shadow-sm shadow-blue-500/30'
                          : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/50 hover:text-blue-600 hover:translate-x-1'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          activeTab === 'personnel' && personnelSubView === 'evaluations'
                            ? 'bg-white/20 text-white'
                            : 'bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white'
                        }`}>
                          <ShieldCheck size={14} />
                        </div>
                        <span>Avaliação de Desempenho</span>
                      </div>
                      <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-teal-600" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. MANUTENÇÃO INDUSTRIAL */}
        {(isAdmin || userPerms.maintenance.enabled) && (
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown('maintenance')}
              className={`group flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 ${
                activeTab === 'maintenance'
                  ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-white shadow-lg shadow-blue-500/30 border border-blue-400/50 scale-[1.02]'
                  : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 border border-slate-200/90 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/15 hover:-translate-y-0.5'
              }`}
              title="Módulo de Manutenção Industrial"
              aria-expanded={openDropdown === 'maintenance'}
            >
              <div className={`p-1 rounded-lg transition-colors ${
                activeTab === 'maintenance' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
              }`}>
                <Wrench size={15} />
              </div>
              <span>Manutenção Industrial</span>
              <ChevronDown 
                size={14} 
                className={`transition-transform duration-300 ${
                  openDropdown === 'maintenance' 
                    ? 'rotate-180 text-blue-400' 
                    : activeTab === 'maintenance' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'
                }`} 
              />
            </button>

            {/* Caixinha Flutuante com as Opções de Manutenção */}
            {openDropdown === 'maintenance' && (
              <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 w-64 sm:w-72 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-slate-900/20 border border-slate-200/90 p-2 z-50 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150 ease-out">
                <div className="px-3 py-1.5 mb-1.5 border-b border-slate-100 flex items-center justify-between text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                    <span>Setor Manutenção</span>
                  </div>
                  <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Módulo</span>
                </div>

                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      closeDropdown();
                      onNavigateMaintenance('requests');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                      activeTab === 'maintenance' && maintenanceSubTab === 'requests'
                        ? 'bg-blue-600 text-white font-black shadow-sm shadow-blue-500/30'
                        : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/50 hover:text-blue-600 hover:translate-x-1'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        activeTab === 'maintenance' && maintenanceSubTab === 'requests'
                          ? 'bg-white/20 text-white'
                          : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                      }`}>
                        <Wrench size={14} />
                      </div>
                      <span>Ordens de Serviço</span>
                    </div>
                    <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      closeDropdown();
                      onNavigateMaintenance('causes');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                      activeTab === 'maintenance' && maintenanceSubTab === 'causes'
                        ? 'bg-blue-600 text-white font-black shadow-sm shadow-blue-500/30'
                        : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/50 hover:text-blue-600 hover:translate-x-1'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        activeTab === 'maintenance' && maintenanceSubTab === 'causes'
                          ? 'bg-white/20 text-white'
                          : 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white'
                      }`}>
                        <AlertCircle size={14} />
                      </div>
                      <span>Causas & Paradas</span>
                    </div>
                    <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. PROJEÇÃO EM TV / SMART TV */}
        {(isAdmin || userPerms.projection.enabled) && (
          <button
            type="button"
            onClick={() => {
              closeDropdown();
              onNavigateProjection();
            }}
            className={`group flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 ${
              activeTab === 'projection'
                ? 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/50 scale-[1.02]'
                : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 border border-slate-200/90 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/15 hover:-translate-y-0.5'
            }`}
            title="Abrir Modo Projeção em TV / Smart TV"
          >
            <div className={`p-1 rounded-lg transition-colors ${
              activeTab === 'projection' 
                ? 'bg-white/20 text-white' 
                : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
            }`}>
              <Tv size={15} />
            </div>
            <span>Projeção em TV</span>
            {activeTab === 'projection' && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping"></span>
            )}
          </button>
        )}

      </div>
    </nav>
  );
};

export default TopNavbar;
