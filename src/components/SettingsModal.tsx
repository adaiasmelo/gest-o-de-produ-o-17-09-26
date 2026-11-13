import React, { useState, useEffect } from "react";
import { 
  Search, Target, Settings, Cpu, Smartphone, ShieldCheck, Download, 
  Share, ExternalLink, RotateCcw, X, Upload, Video, Play, Sparkles, 
  Layers, Briefcase, Clock, ChevronRight, Check, Trash2, Image as ImageIcon,
  Bell, FileDown, UserPlus, Database, RefreshCw
} from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { 
  getRibbonMachineGoal, 
  getRibbonTotalGoal, 
  calcJumboUnits, 
  formatJumboUnits 
} from "../utils/ribbonGoalsUtils";
import { 
  getEremaStandardGoal, 
  saveEremaStandardGoal, 
  DEFAULT_EREMA_STANDARD_GOAL,
  GHEZZI_TECHNICAL_PRESETS,
  LINTECH_TECHNICAL_PRESETS,
  WUTEC_TECHNICAL_PRESETS
} from "../utils/ribbonStandardGoals";
import { ScreensaverSettings } from "../utils/screensaverUtils";
import { SettingsPermissions } from "../types";
import { GOAL_VALUE } from "../constants";

const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 600): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => resolve(base64Str);
  });
};

export const SettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  activeTab: 'filters' | 'goals' | 'config' | 'system' | 'app';
  setActiveTab: (tab: 'filters' | 'goals' | 'config' | 'system' | 'app') => void;
  filterOperator: string;
  setFilterOperator: (op: string) => void;
  filterDay: string;
  setFilterDay: (day: string) => void;
  filterStartDate: string;
  setFilterStartDate: (date: string) => void;
  filterEndDate: string;
  setFilterEndDate: (date: string) => void;
  dashboardMonth: string;
  setDashboardMonth: (month: string) => void;
  operators: string[];
  goals: Record<string, number>;
  setGoals: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  extrusionWasteLimit?: number;
  setExtrusionWasteLimit?: React.Dispatch<React.SetStateAction<number>>;
  extrusionWasteLimits?: Record<string, number>;
  setExtrusionWasteLimits?: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  eremaGoals?: Record<string, number>;
  setEremaGoals?: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  ribbonGoals: Record<string, number>;
  setRibbonGoals: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setIsUserManagementOpen: (open: boolean) => void;
  setIsDowntimeReasonsModalOpen?: (open: boolean) => void;
  setIsDowntimeAnalyticsModalOpen?: (open: boolean) => void;
  setIsOperatorModalOpen: (open: boolean) => void;
  setIsRoleModalOpen: (open: boolean) => void;
  setIsShiftModalOpen: (open: boolean) => void;
  setIsPermissionModalOpen: (open: boolean) => void;
  downloadBackup: () => void;
  handleRestoreData: () => Promise<void>;
  handleSyncLocalToCloud: () => Promise<void>;
  openConfirm: (title: string, message: string, onConfirm: () => void, type?: 'danger' | 'warning' | 'info') => void;
  isInitializing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  systemName: string;
  setSystemName: (name: string) => void;
  loginSystemName: string;
  setLoginSystemName: (name: string) => void;
  loginSystemSubtitle: string;
  setLoginSystemSubtitle: (text: string) => void;
  systemLogo: string | null;
  setSystemLogo: (logo: string | null) => void;
  systemCoverImage: string | null;
  setSystemCoverImage: (image: string | null) => void;
  chartPdfLogo?: string | null;
  setChartPdfLogo?: (logo: string | null) => void;
  isAdminUser: boolean;
  isInstallable: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  handleInstallClick: () => void;
  setShowInstallExperience: (show: boolean) => void;
  onTriggerUpdateNotification?: (notes?: string) => Promise<void>;
  screensaverSettings?: ScreensaverSettings;
  setScreensaverSettings?: React.Dispatch<React.SetStateAction<ScreensaverSettings>>;
  onTriggerScreensaverTest?: () => void;
  settingsPerms?: SettingsPermissions;
}> = ({
  isOpen, onClose, onSave, activeTab, setActiveTab,
  filterOperator, setFilterOperator, filterDay, setFilterDay, filterStartDate, setFilterStartDate, filterEndDate, setFilterEndDate, dashboardMonth, setDashboardMonth,
  operators, goals, setGoals, 
  extrusionWasteLimit = 8.0, setExtrusionWasteLimit, extrusionWasteLimits = {}, setExtrusionWasteLimits,
  eremaGoals = {}, setEremaGoals, ribbonGoals, setRibbonGoals,
  setIsUserManagementOpen, setIsDowntimeReasonsModalOpen, setIsDowntimeAnalyticsModalOpen, setIsOperatorModalOpen, setIsRoleModalOpen, setIsShiftModalOpen, setIsPermissionModalOpen,
  downloadBackup, handleRestoreData, handleSyncLocalToCloud, openConfirm, isInitializing, fileInputRef,
  systemName, setSystemName, loginSystemName, setLoginSystemName, loginSystemSubtitle, setLoginSystemSubtitle, systemLogo, setSystemLogo, systemCoverImage, setSystemCoverImage, 
  chartPdfLogo, setChartPdfLogo,
  isAdminUser, isInstallable, isStandalone, isIOS, handleInstallClick, setShowInstallExperience, onTriggerUpdateNotification,
  screensaverSettings, setScreensaverSettings, onTriggerScreensaverTest,
  settingsPerms
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [eremaStandardGoal12h, setEremaStandardGoal12h] = useState<number>(() => getEremaStandardGoal());
  const [selectedTechMachine, setSelectedTechMachine] = useState<'Ghezzi' | 'Lintech' | 'Wultec'>('Ghezzi');

  const tabs = [
    { id: 'filters', label: 'Filtros', icon: Search, hidden: !isAdminUser && !settingsPerms?.filters },
    { id: 'goals', label: 'Metas', icon: Target, hidden: !isAdminUser && !settingsPerms?.goals },
    { id: 'config', label: 'Cadastro', icon: Settings, hidden: !isAdminUser && !settingsPerms?.config },
    { id: 'system', label: 'Sistema', icon: Cpu, hidden: !isAdminUser && !settingsPerms?.system },
    { id: 'app', label: 'App', icon: Smartphone, hidden: !isAdminUser && !settingsPerms?.app },
  ].filter(t => !t.hidden);

  useEffect(() => {
    if (tabs.length > 0 && !tabs.some(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id as any);
    }
  }, [tabs, activeTab, setActiveTab]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    await onSave();
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 md:p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white rounded-[2rem] md:rounded-[3rem] w-full max-w-2xl shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="px-6 md:px-8 pt-6 md:pt-8 pb-4 md:pb-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div>
            <h3 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tight">Configurações</h3>
            <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">Gerencie as preferências</p>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-2xl transition-all active:scale-90">
            <X size={24} className="md:w-7 md:h-7" />
          </button>
        </div>

        <div className="flex bg-slate-50 border-b border-slate-100 p-2 overflow-x-auto no-scrollbar scroll-smooth shrink-0">
          <div className="flex gap-1.5 md:gap-2 min-w-max md:min-w-0 md:flex-1 md:justify-center px-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center justify-center gap-2.5 px-4 md:px-6 py-3.5 rounded-2xl text-[10px] md:text-[11px] font-black uppercase transition-all whitespace-nowrap ${
                  activeTab === tab.id ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon size={16} className="md:w-[18px] md:h-[18px]" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 md:p-10 flex-1 overflow-y-auto custom-scrollbar">
          {activeTab === 'app' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
               <div className={`${isStandalone ? 'bg-blue-50 border-blue-100' : 'bg-emerald-50 border-emerald-100'} p-6 md:p-8 rounded-[2rem] border`}>
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className={`w-16 h-16 bg-white rounded-3xl shadow-lg flex items-center justify-center ${isStandalone ? 'text-blue-600' : 'text-emerald-600'}`}>
                      <Smartphone size={32} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-800 uppercase">
                        {isStandalone ? 'Aplicativo Instalado' : 'Versão para Celular'}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mt-1">
                        {isStandalone ? 'Você já está utilizando a versão de aplicativo' : 'Transforme este site em um aplicativo completo'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-8 space-y-4">
                    {isStandalone && (
                      <div className="bg-white/80 backdrop-blur rounded-[1.5rem] p-6 border border-blue-100 text-center">
                        <div className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                          <ShieldCheck size={24} />
                        </div>
                        <p className="text-[11px] font-black text-blue-800 uppercase mb-1">Status: Ativo & Instalado</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight leading-relaxed">
                          O sistema está rodando em modo nativo. Você pode acessá-lo diretamente pela sua tela de início.
                        </p>
                      </div>
                    )}

                    {!isStandalone && isInstallable && (
                      <button 
                        onClick={handleInstallClick}
                        className="w-full py-5 bg-emerald-600 text-white rounded-[1.5rem] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-emerald-100 border-2 border-white/20"
                      >
                        <Download size={22} className="animate-bounce" />
                        <div className="text-left font-sans text-white">
                          <p className="text-[13px] font-black uppercase leading-none">Instalar Aplicativo</p>
                          <p className="text-[9px] font-bold opacity-80 uppercase tracking-tighter">Download Direto PWA</p>
                        </div>
                      </button>
                    )}

                    {!isStandalone && isIOS && (
                      <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                         <div className="flex gap-4 items-start text-left">
                           <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                             <Share size={20} />
                           </div>
                           <div className="flex-1">
                             <p className="text-[11px] font-black text-slate-800 uppercase leading-none mb-1.5">Instruções para iPhone</p>
                             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight leading-relaxed">
                               1. Toque no botão <span className="text-blue-600 font-extrabold">"Compartilhar"</span> (ícone quadrado com seta).<br/>
                               2. Selecione <span className="text-blue-600 font-extrabold">"Adicionar à Tela de Início"</span>.
                             </p>
                           </div>
                         </div>
                      </div>
                    )}

                    {!isStandalone && !isInstallable && !isIOS && (
                      <>
                        <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                           <div className="flex gap-4 items-start text-left">
                             <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                               <ExternalLink size={20} />
                             </div>
                             <div className="flex-1">
                               <p className="text-[11px] font-black text-blue-800 uppercase leading-none mb-1.5">Dica de Instalação</p>
                               <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tight leading-relaxed">
                                 Acesse este link <b>DIRETAMENTE</b> pelo Chrome ou Samsung Internet. Se estiver vendo isso por dentro do Instagram, WhatsApp ou Facebook, a instalação não aparecerá.
                               </p>
                             </div>
                           </div>
                        </div>

                        <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100">
                           <div className="flex gap-4 items-start text-left">
                             <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg">
                               <Smartphone size={20} />
                             </div>
                             <div className="flex-1">
                               <p className="text-[11px] font-black text-amber-800 uppercase leading-none mb-1.5">Instruções para Android/PC</p>
                               <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tight leading-relaxed">
                                 1. Abra o menu do navegador (geralmente <span className="text-amber-600 font-extrabold">3 pontos ou barras</span>).<br/>
                                 2. Procure por <span className="text-amber-600 font-extrabold">"Instalar Aplicativo"</span> ou <span className="text-amber-600 font-extrabold">"Adicionar à Tela Inicial"</span>.
                               </p>
                             </div>
                           </div>
                        </div>
                      </>
                    )}
                  </div>
               </div>

               {isAdminUser && onTriggerUpdateNotification && (
                 <div 
                   className="bg-gradient-to-br from-blue-900 to-indigo-950 p-6 rounded-[1.8rem] border border-blue-500/30 flex flex-col items-center text-center justify-center gap-2 group cursor-pointer hover:border-blue-400 transition-all shadow-xl shadow-blue-900/20 mb-4 text-white" 
                   onClick={() => {
                     const notes = prompt('Digite as observações da atualização para exibir nos dispositivos (opcional):', 'Nova atualização do sistema disponível. Clique para atualizar.');
                     if (notes !== null) {
                       onTriggerUpdateNotification(notes);
                     }
                   }}
                 >
                   <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-400/30 group-hover:scale-110 transition-transform">
                     <Bell size={20} className="animate-bounce" />
                   </div>
                   <div>
                     <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Notificação em Tempo Real</p>
                     <p className="text-[12px] font-black uppercase leading-tight text-white">Disparar Notificação de Atualização (PC & Celular)</p>
                     <p className="text-[10px] text-slate-300 font-medium mt-1 leading-relaxed">
                       Notifica instantaneamente todos os dispositivos com o aplicativo instalado para atualizar a versão.
                     </p>
                   </div>
                 </div>
               )}

               <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col items-center text-center justify-center gap-2 group cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all mb-4" onClick={() => {
                  onClose();
                  handleInstallClick();
                }}>
                  <Download size={16} className="text-slate-400 group-hover:text-blue-500 transition-all duration-500" />
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Sistema</p>
                    <p className="text-[11px] font-black text-slate-700 uppercase leading-none">Instalar Aplicativo (PWA)</p>
                  </div>
               </div>

               <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col items-center text-center justify-center gap-2 group cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all mb-4" onClick={() => setIsPermissionModalOpen(true)}>
                  <ShieldCheck size={16} className="text-slate-400 group-hover:text-blue-500 transition-all duration-500" />
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Sistema</p>
                    <p className="text-[11px] font-black text-slate-700 uppercase leading-none">Gerenciar Permissões</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-4">
                  <div className="bg-red-50 p-5 rounded-2xl border border-red-100 flex flex-col items-center text-center justify-center gap-2 group cursor-pointer hover:bg-red-100 transition-all" onClick={async () => {
                    if (confirm('Deseja limpar o cache e reiniciar o aplicativo? Isso pode resolver problemas de carregamento.')) {
                      if ('serviceWorker' in navigator) {
                        const regs = await navigator.serviceWorker.getRegistrations();
                        for (let reg of regs) {
                          await reg.unregister();
                        }
                      }
                      window.location.reload();
                    }
                  }}>
                    <Trash2 size={16} className="text-red-400" />
                    <div>
                      <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-0.5">Diagnóstico</p>
                      <p className="text-[11px] font-black text-red-700 uppercase leading-none">Limpar Cache</p>
                    </div>
                  </div>
               </div>

               <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-col items-center text-center justify-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Versão</p>
                  <p className="text-[11px] font-black text-slate-700 uppercase tracking-tighter text-blue-600 font-sans">v1.2.9 PROD</p>
               </div>
            </div>
          )}

          {activeTab === 'filters' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-blue-50 p-8 rounded-[2rem] border border-blue-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-600 mb-2 block uppercase tracking-widest ml-1">Filtrar por Operador</label>
                    <select 
                      value={filterOperator} 
                      onChange={e => setFilterOperator(e.target.value)} 
                      className="w-full bg-white border border-blue-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all appearance-none"
                    >
                      <option value="Todos">Todos os Operadores</option>
                      {operators.map(op => <option key={op} value={op}>{op}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-600 mb-2 block uppercase tracking-widest ml-1">Dia Específico</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        value={filterDay} 
                        onChange={e => {
                          setFilterDay(e.target.value);
                          if (e.target.value) {
                            setFilterStartDate('');
                            setFilterEndDate('');
                          }
                        }} 
                        className="w-full bg-white border border-blue-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" 
                      />
                      {filterDay && (
                        <button 
                          onClick={() => setFilterDay('')} 
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                          title="Limpar filtro"
                        >
                          <X size={14}/>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 pt-8 border-t border-blue-100/50">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-600 mb-2 block uppercase tracking-widest ml-1">Início do Período</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        value={filterStartDate} 
                        onChange={e => {
                          setFilterStartDate(e.target.value);
                          if (e.target.value) {
                            setFilterDay('');
                          }
                        }}
                        className="w-full bg-white border border-blue-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" 
                      />
                      {filterStartDate && (
                        <button 
                          onClick={() => setFilterStartDate('')} 
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                          title="Limpar data inicial"
                        >
                          <X size={14}/>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-600 mb-2 block uppercase tracking-widest ml-1">Fim do Período</label>
                    <div className="relative">
                      <input 
                        type="date" 
                        value={filterEndDate} 
                        onChange={e => {
                          setFilterEndDate(e.target.value);
                          if (e.target.value) {
                            setFilterDay('');
                          }
                        }}
                        className="w-full bg-white border border-blue-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" 
                      />
                      {filterEndDate && (
                        <button 
                          onClick={() => setFilterEndDate('')} 
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                          title="Limpar data final"
                        >
                          <X size={14}/>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-blue-100/50 space-y-2">
                  <label className="text-[10px] font-black text-blue-600 mb-2 block uppercase tracking-widest ml-1">Mês/Ano de Referência</label>
                  <input 
                    type="month" 
                    value={dashboardMonth} 
                    onChange={e => setDashboardMonth(e.target.value)} 
                    className="w-full bg-white border border-blue-200 rounded-2xl px-6 py-4 font-bold text-sm outline-none focus:ring-4 focus:ring-blue-100 transition-all" 
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 text-center py-4">
              <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-[2rem] flex items-center justify-center border border-orange-100 mx-auto mb-2">
                <Target size={40} />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">Metas de Produção</h4>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Defina objetivos mensais ({dashboardMonth.split('-').reverse().join('/')})</p>
              </div>
              <div className="max-w-xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Extrusão */}
                <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-200/80 text-left space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-500 block tracking-wider">Setor Extrusão</span>
                    <span className="text-[9px] font-black uppercase text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                      Metas Extrusão
                    </span>
                  </div>

                  {/* Meta em KG */}
                  <div>
                    <label className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Meta de Produção Líquida
                    </label>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={goals[dashboardMonth] || GOAL_VALUE} 
                        onChange={e => setGoals(prev => {
                          const updated = {...prev, [dashboardMonth]: Number(e.target.value)};
                          localStorage.setItem('manupackaging_goals', JSON.stringify(updated));
                          setDoc(doc(db, 'settings', 'global'), { goals: updated }, { merge: true });
                          return updated;
                        })} 
                        className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-lg font-black text-center text-slate-800 outline-none focus:ring-2 focus:ring-orange-200 tracking-tight"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-[10px]">KG</span>
                    </div>
                  </div>

                  {/* Limite / Tolerância de Rejeito (Eco B / Perda) */}
                  <div className="pt-2.5 border-t border-slate-200/70">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[9.5px] font-bold text-rose-800 uppercase tracking-wider block">
                        Tolerância / Limite de Rejeito (Eco B)
                      </label>
                      <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                        {((extrusionWasteLimits && extrusionWasteLimits[dashboardMonth] !== undefined ? extrusionWasteLimits[dashboardMonth] : extrusionWasteLimit) || 8.0).toFixed(1).replace('.', ',')}%
                      </span>
                    </div>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.1"
                        min="0"
                        max="100"
                        value={extrusionWasteLimits && extrusionWasteLimits[dashboardMonth] !== undefined ? extrusionWasteLimits[dashboardMonth] : (extrusionWasteLimit ?? 8.0)} 
                        onChange={e => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          if (setExtrusionWasteLimits) {
                            setExtrusionWasteLimits(prev => {
                              const updated = { ...prev, [dashboardMonth]: val };
                              localStorage.setItem('manupackaging_extrusion_waste_limits', JSON.stringify(updated));
                              localStorage.setItem('manupackaging_extrusion_waste_limit', String(val));
                              setDoc(doc(db, 'settings', 'global'), { 
                                extrusionWasteLimits: updated,
                                extrusionWasteLimit: val 
                              }, { merge: true });
                              return updated;
                            });
                          }
                          if (setExtrusionWasteLimit) {
                            setExtrusionWasteLimit(val);
                          }
                        }} 
                        className="w-full bg-white border border-rose-200 rounded-2xl px-4 py-3 text-lg font-black text-center text-rose-600 outline-none focus:ring-2 focus:ring-rose-200 tracking-tight"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-rose-400 text-xs">%</span>
                    </div>
                    <p className="text-[8.5px] text-slate-400 mt-1 leading-tight text-center font-medium">
                      Define a meta máxima de perda/rejeito nos Gráficos da Extrusão e nos indicadores (Ex: 8%, 7%, 10%).
                    </p>
                  </div>
                </div>

                {/* Máquina Erema (Reciclagem) - Meta Mensal e Meta Padrão Diária/Turno 12h */}
                <div className="bg-emerald-50/50 p-5 rounded-3xl border border-emerald-200 text-left space-y-4 md:col-span-2">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-emerald-100 pb-3">
                    <div>
                      <span className="text-[11px] font-black uppercase text-emerald-800 block tracking-wider">Máquina Erema (Reciclagem) • Metas Operacionais</span>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Definição da Meta Mensal do Dashboard e da Meta Padrão por Turno de 12 Horas</p>
                    </div>
                    <span className="text-[10px] font-extrabold px-3 py-1 bg-emerald-100 text-emerald-900 rounded-full border border-emerald-200">
                      Padrão 12h: {eremaStandardGoal12h.toLocaleString('pt-BR')} kg ({(eremaStandardGoal12h / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} t)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Meta Mensal (Dashboard) */}
                    <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs space-y-2 text-center">
                      <span className="text-[10px] font-black uppercase text-emerald-700 block tracking-wider">Meta Mensal (kg/mês)</span>
                      <p className="text-[8.5px] text-slate-400 font-medium">Usada nos gráficos e projeções mensais</p>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={eremaGoals[dashboardMonth] || 70000} 
                          onChange={e => setEremaGoals?.(prev => {
                            const updated = {...prev, [dashboardMonth]: Number(e.target.value)};
                            localStorage.setItem('manupackaging_erema_goals', JSON.stringify(updated));
                            setDoc(doc(db, 'settings', 'global'), { eremaGoals: updated }, { merge: true });
                            return updated;
                          })} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-lg font-black text-center text-slate-800 outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-emerald-500 text-[10px]">KG/MÊS</span>
                      </div>
                    </div>

                    {/* Meta Padrão por Turno de 12h (Lançamentos Diários) */}
                    <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs space-y-2 text-center">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Meta Padrão (Turno 12h)</span>
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-amber-100 text-amber-800 rounded">Oficial: 2.600 kg</span>
                      </div>
                      <p className="text-[8.5px] text-slate-400 font-medium">Meta padrão pré-carregada na tela de novo lançamento</p>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={eremaStandardGoal12h} 
                          onChange={e => {
                            const val = Number(e.target.value) || 0;
                            setEremaStandardGoal12h(val);
                            saveEremaStandardGoal(val);
                            setDoc(doc(db, 'settings', 'global'), { eremaStandardGoal12h: val }, { merge: true });
                          }} 
                          className="w-full bg-slate-50 border border-emerald-300 rounded-xl px-4 py-2.5 text-lg font-black text-center text-emerald-950 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-emerald-600 text-[10px]">KG / 12H</span>
                      </div>
                      <div className="flex items-center justify-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEremaStandardGoal12h(DEFAULT_EREMA_STANDARD_GOAL);
                            saveEremaStandardGoal(DEFAULT_EREMA_STANDARD_GOAL);
                            setDoc(doc(db, 'settings', 'global'), { eremaStandardGoal12h: DEFAULT_EREMA_STANDARD_GOAL }, { merge: true });
                          }}
                          className={`px-2 py-1 rounded text-[8.5px] font-black uppercase border transition-all cursor-pointer ${
                            eremaStandardGoal12h === DEFAULT_EREMA_STANDARD_GOAL 
                              ? 'bg-emerald-600 text-white border-emerald-700' 
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          Padrão 2.600 kg (2,6 t)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const val = 4200;
                            setEremaStandardGoal12h(val);
                            saveEremaStandardGoal(val);
                            setDoc(doc(db, 'settings', 'global'), { eremaStandardGoal12h: val }, { merge: true });
                          }}
                          className={`px-2 py-1 rounded text-[8.5px] font-black uppercase border transition-all cursor-pointer ${
                            eremaStandardGoal12h === 4200 
                              ? 'bg-emerald-600 text-white border-emerald-700' 
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          4.200 kg
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const val = 5200;
                            setEremaStandardGoal12h(val);
                            saveEremaStandardGoal(val);
                            setDoc(doc(db, 'settings', 'global'), { eremaStandardGoal12h: val }, { merge: true });
                          }}
                          className={`px-2 py-1 rounded text-[8.5px] font-black uppercase border transition-all cursor-pointer ${
                            eremaStandardGoal12h === 5200 
                              ? 'bg-emerald-600 text-white border-emerald-700' 
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          5.200 kg (Dia Todo)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Corte de Fita - Total e Metas Individuais por Máquina */}
                <div className="bg-blue-50/20 p-6 rounded-3xl border border-blue-50/40 text-left space-y-4 md:col-span-2">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-blue-100 pb-3">
                    <div>
                      <span className="text-[11px] font-black uppercase text-blue-700 block tracking-wider">Metas Individuais • Corte de Fita</span>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Defina o objetivo individual para cada máquina (m² e equivalência em jumbos)</p>
                    </div>
                    <span className="text-[10px] font-extrabold px-3 py-1 bg-blue-100/70 text-blue-800 rounded-full">
                      Total: {getRibbonTotalGoal(ribbonGoals, dashboardMonth).toLocaleString('pt-BR')} m² ({formatJumboUnits(calcJumboUnits(getRibbonTotalGoal(ribbonGoals, dashboardMonth)))})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {/* Ghezzi */}
                    <div className="bg-white p-3.5 rounded-2xl border border-blue-100 shadow-2xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-blue-600">Ghezzi</span>
                        <span className="text-[9px] font-bold text-slate-400">
                          {formatJumboUnits(calcJumboUnits(getRibbonMachineGoal(ribbonGoals, dashboardMonth, 'ghezzi')))}
                        </span>
                      </div>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={getRibbonMachineGoal(ribbonGoals, dashboardMonth, 'ghezzi')} 
                          onChange={e => {
                            const newG = Number(e.target.value) || 0;
                            const curL = getRibbonMachineGoal(ribbonGoals, dashboardMonth, 'lintech');
                            const curW = getRibbonMachineGoal(ribbonGoals, dashboardMonth, 'wultec');
                            setRibbonGoals(prev => {
                              const currentVal = prev[dashboardMonth];
                              const updatedObj = typeof currentVal === 'object' && currentVal !== null
                                ? { ...currentVal, ghezzi: newG, ghezze: newG, lintech: curL, lintec: curL, wultec: curW, wutec: curW }
                                : { ghezzi: newG, ghezze: newG, lintech: curL, lintec: curL, wultec: curW, wutec: curW };
                              const updated = { ...prev, [dashboardMonth]: updatedObj };
                              localStorage.setItem('manupackaging_ribbon_goals', JSON.stringify(updated));
                              setDoc(doc(db, 'settings', 'global'), { ribbonGoals: updated }, { merge: true });
                              return updated;
                            });
                          }} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-slate-300 text-[9px]">M²</span>
                      </div>
                    </div>

                    {/* Lintech */}
                    <div className="bg-white p-3.5 rounded-2xl border border-indigo-100 shadow-2xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-indigo-600">Lintech</span>
                        <span className="text-[9px] font-bold text-slate-400">
                          {formatJumboUnits(calcJumboUnits(getRibbonMachineGoal(ribbonGoals, dashboardMonth, 'lintech')))}
                        </span>
                      </div>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={getRibbonMachineGoal(ribbonGoals, dashboardMonth, 'lintech')} 
                          onChange={e => {
                            const curG = getRibbonMachineGoal(ribbonGoals, dashboardMonth, 'ghezzi');
                            const newL = Number(e.target.value) || 0;
                            const curW = getRibbonMachineGoal(ribbonGoals, dashboardMonth, 'wultec');
                            setRibbonGoals(prev => {
                              const currentVal = prev[dashboardMonth];
                              const updatedObj = typeof currentVal === 'object' && currentVal !== null
                                ? { ...currentVal, ghezzi: curG, ghezze: curG, lintech: newL, lintec: newL, wultec: curW, wutec: curW }
                                : { ghezzi: curG, ghezze: curG, lintech: newL, lintec: newL, wultec: curW, wutec: curW };
                              const updated = { ...prev, [dashboardMonth]: updatedObj };
                              localStorage.setItem('manupackaging_ribbon_goals', JSON.stringify(updated));
                              setDoc(doc(db, 'settings', 'global'), { ribbonGoals: updated }, { merge: true });
                              return updated;
                            });
                          }} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-slate-300 text-[9px]">M²</span>
                      </div>
                    </div>

                    {/* Wultec */}
                    <div className="bg-white p-3.5 rounded-2xl border border-teal-100 shadow-2xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase text-teal-600">Wultec</span>
                        <span className="text-[9px] font-bold text-slate-400">
                          {formatJumboUnits(calcJumboUnits(getRibbonMachineGoal(ribbonGoals, dashboardMonth, 'wultec')))}
                        </span>
                      </div>
                      <div className="relative">
                        <input 
                          type="number" 
                          value={getRibbonMachineGoal(ribbonGoals, dashboardMonth, 'wultec')} 
                          onChange={e => {
                            const curG = getRibbonMachineGoal(ribbonGoals, dashboardMonth, 'ghezzi');
                            const curL = getRibbonMachineGoal(ribbonGoals, dashboardMonth, 'lintech');
                            const newW = Number(e.target.value) || 0;
                            setRibbonGoals(prev => {
                              const currentVal = prev[dashboardMonth];
                              const updatedObj = typeof currentVal === 'object' && currentVal !== null
                                ? { ...currentVal, ghezzi: curG, ghezze: curG, lintech: curL, lintec: curL, wultec: newW, wutec: newW }
                                : { ghezzi: curG, ghezze: curG, lintech: curL, lintec: curL, wultec: newW, wutec: newW };
                              const updated = { ...prev, [dashboardMonth]: updatedObj };
                              localStorage.setItem('manupackaging_ribbon_goals', JSON.stringify(updated));
                              setDoc(doc(db, 'settings', 'global'), { ribbonGoals: updated }, { merge: true });
                              return updated;
                            });
                          }} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-teal-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-slate-300 text-[9px]">M²</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Matriz Técnica de Metas & Produtividade dos Estudos Oficiais (PDFs) */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 text-left space-y-3.5 md:col-span-2">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-[11px] font-black uppercase text-slate-800 block tracking-wider">
                        📑 Matriz Técnica de Produtividade (Estudos de Engenharia)
                      </span>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        Metas técnicas em m² baseadas nos PDFs oficiais com tempos de setup de 40 min
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                      {(['Ghezzi', 'Lintech', 'Wultec'] as const).map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setSelectedTechMachine(m)}
                          className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${
                            selectedTechMachine === m
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[9px] border-collapse bg-white rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider border-b border-slate-200">
                          <th className="p-2.5">Formato / Dimensão</th>
                          <th className="p-2.5">Material / Jumbo</th>
                          <th className="p-2.5 text-right">Meta Técnica (m²)</th>
                          <th className="p-2.5 text-right">Consumo / Setups</th>
                          <th className="p-2.5">Produção Resultante</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                        {(selectedTechMachine === 'Ghezzi' ? GHEZZI_TECHNICAL_PRESETS : selectedTechMachine === 'Lintech' ? LINTECH_TECHNICAL_PRESETS : WUTEC_TECHNICAL_PRESETS).map(preset => (
                          <tr key={preset.id} className="hover:bg-blue-50/40 transition-colors">
                            <td className="p-2.5 font-black text-slate-900">{preset.formatLabel}</td>
                            <td className="p-2.5">
                              <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-bold">
                                {preset.jumboCategory === '6000m' ? 'AS50 (6.000m)' : '8.000m (AA38/AR9/Hotmelt)'}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-black text-blue-700">
                              {preset.dailyTargetM2.toLocaleString('pt-BR')} m²
                            </td>
                            <td className="p-2.5 text-right text-slate-500 font-medium">
                              {preset.jumbosConsumed} jumbos • {preset.setupsDescription}
                            </td>
                            <td className="p-2.5 text-slate-500 font-medium">
                              {preset.boxesDescription || preset.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic leading-relaxed max-w-sm mx-auto">
                Essas metas são aplicadas ao período selecionado para o cálculo dos indicadores e projeções.
              </p>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
               {(isAdminUser || settingsPerms?.config) && (
                 <button onClick={() => { onClose(); setIsUserManagementOpen(true); }} className="w-full group px-8 py-6 bg-slate-50 text-slate-700 rounded-[2rem] font-black text-xs uppercase flex items-center justify-between border border-slate-200 hover:bg-blue-600 hover:text-white hover:border-blue-700 hover:shadow-xl hover:shadow-blue-200 transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-white/20 group-hover:text-white transition-all"><UserPlus size={24}/></div>
                      <div className="text-left">
                        <p className="tracking-widest">Cadastro de Usuários</p>
                        <p className="text-[9px] font-bold opacity-60 tracking-normal mt-1">Gerencie quem pode acessar o sistema</p>
                      </div>
                    </div>
                    <ChevronRight size={20} className="opacity-40 group-hover:opacity-100" />
                 </button>
               )}

               <button onClick={() => { onClose(); setIsShiftModalOpen(true); }} className="w-full group px-8 py-6 bg-white border border-slate-200 rounded-[2rem] flex items-center justify-between hover:border-orange-400 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center"><Clock size={24}/></div>
                    <div className="text-left">
                      <p className="text-xs font-black uppercase text-slate-800 tracking-widest">Gerenciar Turnos</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Horários e escalas de trabalho</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300" />
               </button>

               <button onClick={() => { onClose(); setIsRoleModalOpen(true); }} className="w-full group px-8 py-6 bg-white border border-slate-200 rounded-[2rem] flex items-center justify-between hover:border-indigo-400 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center"><Briefcase size={24}/></div>
                    <div className="text-left">
                      <p className="text-xs font-black uppercase text-slate-800 tracking-widest">Gerenciar Funções</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Crie e configure cargos/funções</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300" />
               </button>

               <button onClick={() => { onClose(); setIsDowntimeReasonsModalOpen?.(true); }} className="w-full group px-8 py-6 bg-white border border-slate-200 rounded-[2rem] flex items-center justify-between hover:border-blue-500 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><Layers size={24}/></div>
                    <div className="text-left">
                      <p className="text-xs font-black uppercase text-slate-800 tracking-widest">Gerenciar Motivos de Parada</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Editar, adicionar e excluir motivos padronizados</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-slate-300" />
               </button>

               <div className="p-8 bg-blue-50 rounded-[2rem] border border-blue-100 text-center space-y-2">
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Gestão de Pessoal</p>
                 <p className="text-xs font-bold text-slate-500">As configurações de operadores e funções foram unificadas no <span className="text-blue-700">Cadastro de Colaboradores</span> disponível no Menu Extra da tela de Pessoal.</p>
               </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-6">
                  <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm relative group">
                    {systemLogo ? (
                      <img src={systemLogo} alt="Logo Prev" className="w-full h-full object-cover" />
                    ) : (
                      <img src="https://static.wixstatic.com/media/765089_472b535780514937a09c07be49495392~mv2.png" alt="Default Logo" className="w-8 h-8 opacity-40 object-contain" />
                    )}
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest text-center px-2">Alterar Logo</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            const compressed = await compressImage(reader.result as string, 400, 400);
                            setSystemLogo(compressed);
                          };
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Logotipo do Sistema</p>
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight leading-relaxed italic">Clique na imagem ao lado para carregar um novo arquivo do seu dispositivo.</p>
                      <div className="flex gap-2">
                         <button onClick={() => setSystemLogo(null)} className="px-4 py-2 bg-white border border-slate-200 text-[10px] font-black uppercase text-red-500 rounded-xl hover:bg-red-50 transition-all">Remover Logo</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-center gap-6">
                  <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm relative group">
                    {systemCoverImage ? (
                      <img src={systemCoverImage} alt="Capa Prev" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300">
                        <ImageIcon size={32} />
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest text-center px-2">Alterar Capa</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            const compressed = await compressImage(reader.result as string, 1200, 800);
                            setSystemCoverImage(compressed);
                          };
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Imagem de Capa (Home)</p>
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight leading-relaxed italic">Esta imagem será exibida na tela inicial do sistema em toda sua extensão.</p>
                      <div className="flex gap-2">
                         <button onClick={() => setSystemCoverImage(null)} className="px-4 py-2 bg-white border border-slate-200 text-[10px] font-black uppercase text-red-500 rounded-xl hover:bg-red-50 transition-all">Remover Capa</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logotipo dos Gráficos (Exportação PDF) */}
                <div className="p-6 bg-blue-50/60 rounded-3xl border border-blue-100 flex items-center gap-6">
                  <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center border border-blue-200 overflow-hidden shadow-sm relative group shrink-0">
                    {chartPdfLogo ? (
                      <img src={chartPdfLogo} alt="Logo Gráficos PDF" className="w-full h-full object-contain p-1" />
                    ) : systemLogo ? (
                      <img src={systemLogo} alt="Logo Gráficos PDF (Herança)" className="w-full h-full object-contain p-1 opacity-60" />
                    ) : (
                      <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-1 text-center">
                        <FileDown size={22} className="mb-0.5 text-blue-600" />
                        <span className="text-[8px] font-black uppercase">Padrão</span>
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                      <span className="text-[9px] font-black text-white uppercase tracking-widest text-center px-1">Alterar Logo PDF</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            const compressed = await compressImage(reader.result as string, 800, 300);
                            setChartPdfLogo?.(compressed);
                            localStorage.setItem('manupackaging_chart_pdf_logo', compressed);
                            setDoc(doc(db, 'settings', 'global'), { chartPdfLogo: compressed }, { merge: true });
                          };
                          reader.readAsDataURL(file);
                        }
                      }} />
                    </label>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5">
                      <FileDown size={14} className="text-blue-600" />
                      Logotipo dos Gráficos (Exportação PDF)
                    </p>
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tight leading-relaxed">
                        Esta logo será impressa no cabeçalho dos relatórios em PDF gerados a partir de qualquer gráfico do sistema.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <label className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95">
                          <Upload size={12} />
                          Carregar Logo do PDF
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const compressed = await compressImage(reader.result as string, 800, 300);
                                setChartPdfLogo?.(compressed);
                                localStorage.setItem('manupackaging_chart_pdf_logo', compressed);
                                setDoc(doc(db, 'settings', 'global'), { chartPdfLogo: compressed }, { merge: true });
                              };
                              reader.readAsDataURL(file);
                            }
                          }} />
                        </label>
                        {chartPdfLogo && (
                          <button onClick={() => {
                            setChartPdfLogo?.(null);
                            localStorage.removeItem('manupackaging_chart_pdf_logo');
                            setDoc(doc(db, 'settings', 'global'), { chartPdfLogo: null }, { merge: true });
                          }} className="px-3.5 py-2 bg-white border border-slate-200 text-[10px] font-black uppercase text-red-500 rounded-xl hover:bg-red-50 transition-all flex items-center gap-1">
                            <Trash2 size={12} />
                            Remover Logo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 space-y-3">
                  <div className="flex items-center gap-3">
                    <Bell size={20} className="text-blue-600" />
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Notificações Push (PWA)</p>
                  </div>
                  <p className="text-[10px] font-bold text-slate-600 leading-relaxed">
                    O sistema agora suporta notificações push mesmo com o aplicativo fechado. Para funcionar, é necessário configurar a <code className="bg-blue-100 px-1 rounded">FIREBASE_SERVICE_ACCOUNT</code> e <code className="bg-blue-100 px-1 rounded">VITE_FIREBASE_VAPID_KEY</code> nas configurações.
                  </p>
                  <p className="text-[9px] font-medium text-slate-400 italic">
                    Nota: O erro "[vite] fail to connect" no console é normal. Certifique-se de permitir as notificações no seu navegador e "Instalar" o App como PWA.
                  </p>
                </div>



                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1 flex items-center justify-between">
                      Nome (Cabeçalho)
                      {!isAdminUser && <span className="text-amber-500 flex items-center gap-1"><ShieldCheck size={10}/> ADM</span>}
                    </label>
                    <input 
                      value={systemName} 
                      onChange={e => setSystemName(e.target.value)} 
                      disabled={!isAdminUser}
                      className={`w-full border rounded-2xl px-6 py-4 font-black text-slate-800 outline-none transition-all ${isAdminUser ? 'bg-white border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500' : 'bg-slate-50 border-slate-100 cursor-not-allowed opacity-60'}`}
                      placeholder="Cabeçalho..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1 flex items-center justify-between">
                      Nome (Login)
                      {!isAdminUser && <span className="text-amber-500 flex items-center gap-1"><ShieldCheck size={10}/> ADM</span>}
                    </label>
                    <input 
                      value={loginSystemName} 
                      onChange={e => setLoginSystemName(e.target.value)} 
                      disabled={!isAdminUser}
                      className={`w-full border rounded-2xl px-6 py-4 font-black text-slate-800 outline-none transition-all ${isAdminUser ? 'bg-white border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500' : 'bg-slate-50 border-slate-100 cursor-not-allowed opacity-60'}`}
                      placeholder="Tela de Login..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block ml-1 flex items-center justify-between">
                    Subtítulo (Tela de Login)
                    {!isAdminUser && <span className="text-amber-500 flex items-center gap-1"><ShieldCheck size={10}/> ADM</span>}
                  </label>
                  <input 
                    value={loginSystemSubtitle} 
                    onChange={e => setLoginSystemSubtitle(e.target.value)} 
                    disabled={!isAdminUser}
                    className={`w-full border rounded-2xl px-6 py-4 font-black text-slate-800 outline-none transition-all ${isAdminUser ? 'bg-white border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-500' : 'bg-slate-50 border-slate-100 cursor-not-allowed opacity-60'}`}
                    placeholder="Texto abaixo do nome principal no login..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <button onClick={downloadBackup} className="group p-6 bg-emerald-50 text-emerald-700 rounded-[2rem] border border-emerald-100 flex flex-col items-center text-center gap-3 hover:bg-emerald-600 hover:text-white hover:shadow-xl transition-all">
                  <div className="w-14 h-14 bg-white text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm"><FileDown size={28}/></div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-black uppercase tracking-widest italic">Baixar Backup</p>
                    <p className="text-[9px] font-bold opacity-70">Salvar dados em JSON</p>
                  </div>
                </button>
                <button onClick={() => { onClose(); fileInputRef.current?.click(); }} className="group p-6 bg-blue-50 text-blue-700 rounded-[2rem] border border-blue-100 flex flex-col items-center text-center gap-3 hover:bg-blue-600 hover:text-white hover:shadow-xl transition-all">
                  <div className="w-14 h-14 bg-white text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm"><Upload size={28}/></div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-black uppercase tracking-widest italic">Restaurar Backup</p>
                    <p className="text-[9px] font-bold opacity-70">Carregar base salva</p>
                  </div>
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-4">
                <button 
                  onClick={handleRestoreData}
                  disabled={isInitializing}
                  className="w-full group p-6 bg-red-50 text-red-700 rounded-[2rem] border border-red-100 flex flex-col items-center text-center gap-3 hover:bg-red-600 hover:text-white hover:shadow-xl transition-all disabled:opacity-50 underline-none"
                >
                  <div className="w-14 h-14 bg-white text-red-600 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform shadow-sm"><RotateCcw size={28}/></div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-black uppercase tracking-widest italic">Restaurar Dados Iniciais</p>
                    <p className="text-[9px] font-bold opacity-70">CUIDADO: Apaga tudo e volta ao padrão</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {activeTab !== 'filters' && isAdminUser && (
          <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              className={`px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
            >
              {isSaving ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};