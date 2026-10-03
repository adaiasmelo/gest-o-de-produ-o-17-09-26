import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
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
  Target, 
  FileText, 
  Download, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Palmtree, 
  AlertCircle,
  ChevronRight,
  Utensils
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
  onNavigateHome: _onNavigateHome,
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
  canViewHome: _canViewHome,
  userPerms,
  isReadOnlyAccount,
  totalFerias = 0,
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora ou pressionar ESC
  useEffect(() => {
    if (!openDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (navRef.current && navRef.current.contains(target)) {
        return;
      }
      const portalEl = document.getElementById('top-navbar-dropdown-portal');
      if (portalEl && portalEl.contains(target)) {
        return;
      }
      setOpenDropdown(null);
      setAnchorRect(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
        setAnchorRect(null);
      }
    };

    const handleScrollOrResize = (event: Event) => {
      const portalEl = document.getElementById('top-navbar-dropdown-portal');
      if (portalEl && portalEl.contains(event.target as Node)) {
        return; // Permite rolar a lista de opções interna do dropdown
      }
      setOpenDropdown(null);
      setAnchorRect(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [openDropdown]);

  const toggleDropdown = (name: string, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (openDropdown === name) {
      setOpenDropdown(null);
      setAnchorRect(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      setAnchorRect(rect);
      setOpenDropdown(name);
    }
  };

  const handleSelectOption = (action: () => void) => {
    setOpenDropdown(null);
    setAnchorRect(null);
    action();
  };

  // Posicionamento inteligente do Dropdown (fixo na tela, nunca cortado e sem scrollbars artificiais)
  const getDropdownStyle = (): React.CSSProperties => {
    if (!anchorRect) return { display: 'none' };
    
    const width = Math.min(310, typeof window !== 'undefined' ? window.innerWidth - 24 : 310);
    let left = anchorRect.left;
    
    if (typeof window !== 'undefined') {
      if (left + width > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - width - 12);
      }
      if (left < 12) {
        left = 12;
      }
    }
    
    const top = anchorRect.bottom + 8;
    const maxHeight = typeof window !== 'undefined' ? Math.max(200, window.innerHeight - top - 16) : 420;

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
      maxHeight: `${maxHeight}px`,
      zIndex: 9999,
    };
  };

  return (
    <nav 
      ref={navRef}
      className="relative z-40 w-full mb-3 select-none"
      aria-label="Navegação Superior Principal"
    >
      {/* 
        Barra de Botões:
        - Centralizada no meio da tela no Desktop (md:justify-center)
        - Linha única contínua no celular (flex-nowrap, shrink-0) com opção de puxar para o lado (overflow-x-auto)
        - Sem nenhuma barra de rolagem visível ([scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden)
      */}
      <div className="w-full overflow-x-auto scroll-smooth py-1 px-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="min-w-full w-max flex items-center justify-start md:justify-center gap-2 sm:gap-2.5 flex-nowrap px-1">
          
          {/* 1. EXTRUSÃO */}
          {(isAdmin || userPerms.extrusion.enabled) && (
            <div className="shrink-0">
              <button
                type="button"
                onClick={(e) => toggleDropdown('extrusion', e)}
                className={`group flex items-center gap-2 sm:gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 ${
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
            </div>
          )}

          {/* 2. CORTE DE FITA */}
          {(isAdmin || userPerms.ribbon.enabled) && (
            <div className="shrink-0">
              <button
                type="button"
                onClick={(e) => toggleDropdown('ribbon', e)}
                className={`group flex items-center gap-2 sm:gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 ${
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
            </div>
          )}

          {/* 3. GESTÃO DE PESSOAL */}
          {(isAdmin || userPerms.personnel.enabled) && (
            <div className="shrink-0">
              <button
                type="button"
                onClick={(e) => toggleDropdown('personnel', e)}
                className={`group flex items-center gap-2 sm:gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 ${
                  activeTab === 'personnel'
                    ? 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-white shadow-lg shadow-blue-500/30 border border-blue-400/50 scale-[1.02]'
                    : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 border border-slate-200/90 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/15 hover:-translate-y-0.5'
                }`}
                title="Módulo de Gestão de Pessoal"
                aria-expanded={openDropdown === 'personnel'}
              >
                <div className={`p-1 rounded-lg transition-colors ${
                  activeTab === 'personnel' 
                    ? 'bg-white/20 text-white' 
                    : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                }`}>
                  <Users size={15} />
                </div>
                <span>Gestão de Pessoal</span>
                {totalFerias > 0 && (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9.5px] font-black bg-amber-500 text-white shadow-xs">
                    <Palmtree size={10} />
                    <span>{totalFerias}</span>
                  </span>
                )}
                <ChevronDown 
                  size={14} 
                  className={`transition-transform duration-300 ${
                    openDropdown === 'personnel' 
                      ? 'rotate-180 text-blue-400' 
                      : activeTab === 'personnel' ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'
                  }`} 
                />
              </button>
            </div>
          )}

          {/* 4. MANUTENÇÃO INDUSTRIAL */}
          {(isAdmin || userPerms.maintenance.enabled) && (
            <div className="shrink-0">
              <button
                type="button"
                onClick={(e) => toggleDropdown('maintenance', e)}
                className={`group flex items-center gap-2 sm:gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 ${
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
            </div>
          )}

          {/* 5. PROJEÇÃO TV */}
          {(isAdmin || userPerms.projection.enabled) && (
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => {
                  setOpenDropdown(null);
                  setAnchorRect(null);
                  onNavigateProjection();
                }}
                className={`group flex items-center gap-2 sm:gap-2.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 ${
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
                <span>Projeção TV</span>
                {activeTab === 'projection' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping"></span>
                )}
              </button>
            </div>
          )}

        </div>
      </div>

      {/* 
        CAIXA FLUTUANTE DE OPÇÕES (DROPDOWN) VIA PORTAL:
        - Abre exatamente alinhada abaixo do botão clicado
        - Não é cortada pelo scroll horizontal nem empurra layout
        - Visual tecnológico glassmorphism elegante
      */}
      {openDropdown && anchorRect && typeof document !== 'undefined' && createPortal(
        <div 
          id="top-navbar-dropdown-portal"
          style={getDropdownStyle()}
          className="bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl shadow-slate-900/25 border border-slate-200/90 p-2 z-[9999] animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150 ease-out overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {/* OPÇÕES: EXTRUSÃO */}
          {openDropdown === 'extrusion' && (
            <div>
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
                    onClick={() => handleSelectOption(() => onNavigateExtrusion('dashboard', 'summary'))}
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
                    onClick={() => handleSelectOption(() => onNavigateExtrusion('dashboard', 'charts'))}
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
                    onClick={() => handleSelectOption(() => onNavigateExtrusion('dashboard', 'comparison'))}
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
                    onClick={() => handleSelectOption(() => onNavigateExtrusion('reports'))}
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
                    onClick={() => handleSelectOption(() => onNavigateExtrusion('stock'))}
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

          {/* OPÇÕES: CORTE DE FITA */}
          {openDropdown === 'ribbon' && (
            <div>
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
                    onClick={() => handleSelectOption(() => onNavigateRibbon('dashboard', 'summary'))}
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
                    onClick={() => handleSelectOption(() => onNavigateRibbon('dashboard', 'charts'))}
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
                    onClick={() => handleSelectOption(() => onNavigateRibbon('dashboard', 'comparison'))}
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
                    onClick={() => handleSelectOption(() => onNavigateRibbon('reports'))}
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
                      <span>Relatórios</span>
                    </div>
                    <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600" />
                  </button>
                )}

                {/* Sub-ações de Metas e Relatórios Rápidos */}
                {(isAdmin || (userPerms.settings.goals && !isReadOnlyAccount)) && onOpenRibbonGoals && (
                  <button
                    type="button"
                    onClick={() => handleSelectOption(onOpenRibbonGoals)}
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
                    onClick={() => handleSelectOption(onExportRibbonPDF)}
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
                    onClick={() => handleSelectOption(onExportRibbonExcel)}
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

          {/* OPÇÕES: GESTÃO DE PESSOAL */}
          {openDropdown === 'personnel' && (
            <div>
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
                    onClick={() => handleSelectOption(() => onNavigatePersonnel('board'))}
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
                      <span>Quadro Geral de Pessoal</span>
                    </div>
                    <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600" />
                  </button>
                )}

                {/* CONTROLE DE FÉRIAS E RETORNO */}
                {onOpenPersonnelFerias && (
                  <button
                    type="button"
                    onClick={() => handleSelectOption(onOpenPersonnelFerias)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer text-amber-800 hover:bg-amber-50/80 hover:translate-x-1 group border border-amber-200/50 bg-amber-50/30"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 group-hover:bg-amber-600 group-hover:text-white text-amber-700 flex items-center justify-center shrink-0 transition-colors">
                        <Palmtree size={14} />
                      </div>
                      <div>
                        <span className="font-black text-amber-900">Controle de Férias & Retorno</span>
                        <p className="text-[9.5px] text-amber-600/80 font-normal">Quem está de férias, datas e substitutos</p>
                      </div>
                    </div>
                    {totalFerias > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-xs">
                        {totalFerias} {totalFerias === 1 ? 'pessoa' : 'pessoas'}
                      </span>
                    )}
                  </button>
                )}

                {(isAdmin || userPerms.personnel.schedule) && (
                  <button
                    type="button"
                    onClick={() => handleSelectOption(() => onNavigatePersonnel('schedule'))}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                      activeTab === 'personnel' && personnelSubView === 'schedule'
                        ? 'bg-blue-600 text-white font-black shadow-sm shadow-blue-500/30'
                        : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/50 hover:text-blue-600 hover:translate-x-1'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        activeTab === 'personnel' && personnelSubView === 'schedule'
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white'
                      }`}>
                        <Calendar size={14} />
                      </div>
                      <span>Escala de Folga 6x2</span>
                    </div>
                    <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600" />
                  </button>
                )}

                {(isAdmin || userPerms.personnel.schedule) && (
                  <button
                    type="button"
                    onClick={() => handleSelectOption(() => onNavigatePersonnel('sunday_schedule'))}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left cursor-pointer group ${
                      activeTab === 'personnel' && personnelSubView === 'sunday_schedule'
                        ? 'bg-blue-600 text-white font-black shadow-sm shadow-blue-500/30'
                        : 'text-slate-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50/50 hover:text-blue-600 hover:translate-x-1'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        activeTab === 'personnel' && personnelSubView === 'sunday_schedule'
                          ? 'bg-white/20 text-white'
                          : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
                      }`}>
                        <Calendar size={14} />
                      </div>
                      <span>Escala de Folga Domingo</span>
                    </div>
                    <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600" />
                  </button>
                )}

                {(isAdmin || userPerms.personnel.lunch) && (
                  <button
                    type="button"
                    onClick={() => handleSelectOption(() => onNavigatePersonnel('lunch'))}
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
                    onClick={() => handleSelectOption(() => onNavigatePersonnel('overtime'))}
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
                          : 'bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white'
                      }`}>
                        <Clock size={14} />
                      </div>
                      <span>Solicitação de Horas Extras</span>
                    </div>
                    <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity text-orange-600" />
                  </button>
                )}

                {(isAdmin || userPerms.personnel.overtimeEntries) && (
                  <button
                    type="button"
                    onClick={() => handleSelectOption(() => onNavigatePersonnel('overtime_entries'))}
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
                    onClick={() => handleSelectOption(() => onNavigatePersonnel('evaluations'))}
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

          {/* OPÇÕES: MANUTENÇÃO INDUSTRIAL */}
          {openDropdown === 'maintenance' && (
            <div>
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
                  onClick={() => handleSelectOption(() => onNavigateMaintenance('requests'))}
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
                  onClick={() => handleSelectOption(() => onNavigateMaintenance('causes'))}
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
        </div>,
        document.body
      )}
    </nav>
  );
};

export default TopNavbar;
