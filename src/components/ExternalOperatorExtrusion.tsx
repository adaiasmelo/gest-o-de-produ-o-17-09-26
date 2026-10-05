import React, { useState, useEffect, useMemo } from 'react';
import {
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  Factory,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Layers,
  Sparkles,
  Smartphone,
  ShieldCheck,
  ChevronRight,
  Clock,
  Calendar,
  Cpu
} from 'lucide-react';
import { SystemUser, Employee, Collaborator, Vacation, Shift, ProductionEntry, RibbonCuttingEntry } from '../types';
import LaunchModal from './LaunchModal';
import { triggerHaptic } from '../utils/haptics';

interface ExternalOperatorExtrusionProps {
  systemName: string;
  systemLogo: string | null;
  collaborators: Collaborator[];
  employees: Employee[];
  systemUsers: SystemUser[];
  activeMachines: string[];
  availableShifts: Shift[];
  vacations?: Vacation[];
  dashboardMonth?: string;
  productionEntries?: ProductionEntry[];
  ribbonEntries?: RibbonCuttingEntry[];
  onSave: (entry: Omit<ProductionEntry, 'id'> & { id?: string }) => Promise<void>;
  onExitToMainApp?: () => void;
}

const normalizeText = (text: string = ''): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const getYesterdayStr = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('sv-SE');
};

const getTodayStr = (): string => {
  return new Date().toLocaleDateString('sv-SE');
};

export const ExternalOperatorExtrusion: React.FC<ExternalOperatorExtrusionProps> = ({
  systemName,
  systemLogo,
  collaborators,
  employees,
  systemUsers,
  activeMachines,
  availableShifts,
  vacations = [],
  dashboardMonth,
  productionEntries = [],
  ribbonEntries = [],
  onSave,
  onExitToMainApp
}) => {
  // Estado de sessão do operador autenticado no portal externo
  const [operatorSession, setOperatorSession] = useState<{
    name: string;
    registration: string;
    shift: string;
    machine: string;
    date: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('manupackaging_operator_portal_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [matricula, setMatricula] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);

  // Lista de máquinas estritamente de Extrusão (Cast 1, Cast 2, Erema)
  const extrusionMachines = useMemo(() => {
    const list = activeMachines.filter(m => {
      const norm = normalizeText(m);
      return !norm.includes('fita') && !norm.includes('ghezzi') && !norm.includes('lintech') && !norm.includes('wultec');
    });
    return list.length > 0 ? list : ['Cast 1', 'Cast 2', 'Erema'];
  }, [activeMachines]);

  // Pré-identificação amigável do operador conforme ele digita a matrícula
  const detectedCandidate = useMemo(() => {
    const cleanMat = matricula.trim();
    if (!cleanMat || cleanMat.length < 2) return null;

    if (cleanMat === '1010') {
      return { name: 'Administrador / Supervisor', role: 'Administrador', shift: 'Diurno', machine: 'Cast 1' };
    }

    const inSystemUsers = systemUsers.find(u => u.registration === cleanMat);
    const inEmployees = employees.find(e => e.registration === cleanMat);
    const inCollaborators = collaborators.find(c => c.registration === cleanMat);

    const name = inSystemUsers?.name || inEmployees?.name || inCollaborators?.name;
    if (!name) return null;

    const shift = inEmployees?.shift || (inSystemUsers as any)?.shift || 'Diurno';
    const rawMach = inEmployees?.machine || '';
    const machNorm = normalizeText(rawMach);
    let machine = 'Cast 1';
    if (machNorm.includes('cast 2')) machine = 'Cast 2';
    else if (machNorm.includes('erema')) machine = 'Erema';
    else if (machNorm.includes('cast 1')) machine = 'Cast 1';

    return {
      name,
      role: inSystemUsers?.role || inEmployees?.role || 'Operador',
      shift,
      machine
    };
  }, [matricula, systemUsers, employees, collaborators]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanMat = matricula.trim();
    const cleanPass = password.trim();

    if (!cleanMat) {
      triggerHaptic('warning');
      setErrorMsg('Por favor, informe sua matrícula funcional.');
      return;
    }

    if (!cleanPass) {
      triggerHaptic('warning');
      setErrorMsg('Por favor, digite sua senha de acesso.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Acesso Mestre 1010
      if (cleanMat === '1010' && cleanPass === '1010') {
        const adminSession = {
          name: 'Supervisor / Operador Master',
          registration: '1010',
          shift: 'Diurno',
          machine: 'Cast 1',
          date: getYesterdayStr()
        };
        setOperatorSession(adminSession);
        localStorage.setItem('manupackaging_operator_portal_user', JSON.stringify(adminSession));
        triggerHaptic('success');
        setIsLoading(false);
        return;
      }

      // 2. Busca nos usuários do sistema
      const user = systemUsers.find(u => u.registration === cleanMat);
      const emp = employees.find(e => e.registration === cleanMat || (user && normalizeText(e.name) === normalizeText(user.name)));
      const collab = collaborators.find(c => c.registration === cleanMat);

      // Verificação de senha
      let isAuthorized = false;
      let targetName = '';

      if (user) {
        targetName = user.name;
        const normalizeStr = (s: string) =>
          (s || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();

        const match =
          user.password === cleanPass ||
          (user.password || '').trim() === cleanPass ||
          normalizeStr(user.password || '') === normalizeStr(cleanPass);

        if (match) {
          isAuthorized = true;
        }
      } else if (emp || collab) {
        targetName = emp?.name || collab?.name || '';
        // Se ainda não tem cadastro em system_users, aceita matrícula ou senha provisória de 4 dígitos
        if (cleanPass === cleanMat || cleanPass.length >= 4) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        triggerHaptic('error');
        setErrorMsg('Matrícula ou senha incorreta. Verifique os dados e tente novamente.');
        setIsLoading(false);
        return;
      }

      // Identifica o turno e a máquina do operador
      let finalShift = 'Diurno';
      if (emp?.shift) {
        finalShift = emp.shift;
      } else {
        // Fallback de turno baseado no horário atual:
        // Diurno: ~06:00 às 18:00 | Noturno: ~18:00 às 06:00
        const currentHour = new Date().getHours();
        finalShift = (currentHour >= 6 && currentHour < 18) ? 'Diurno' : 'Noturno';
      }

      let finalMachine = 'Cast 1';
      if (emp?.machine) {
        const mNorm = normalizeText(emp.machine);
        if (mNorm.includes('cast 2')) finalMachine = 'Cast 2';
        else if (mNorm.includes('erema')) finalMachine = 'Erema';
        else if (mNorm.includes('cast 1')) finalMachine = 'Cast 1';
      }

      const finalDate = getYesterdayStr();

      const newSession = {
        name: targetName || 'Operador',
        registration: cleanMat,
        shift: finalShift,
        machine: finalMachine,
        date: finalDate
      };

      setOperatorSession(newSession);
      localStorage.setItem('manupackaging_operator_portal_user', JSON.stringify(newSession));
      triggerHaptic('success');
    } catch (err) {
      console.error('Erro ao autenticar operador:', err);
      setErrorMsg('Falha ao autenticar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Deseja encerrar a sessão deste operador?')) {
      triggerHaptic('light');
      setOperatorSession(null);
      localStorage.removeItem('manupackaging_operator_portal_user');
      setPassword('');
      setErrorMsg(null);
    }
  };

  const handleSaveWrapper = async (entry: Omit<ProductionEntry, 'id'> & { id?: string }) => {
    try {
      await onSave(entry);
      triggerHaptic('success');
      const machName = entry.machine || operatorSession?.machine || 'Extrusão';
      setSaveSuccessToast(`Lançamento da ${machName} salvo com sucesso no sistema da Extrusão!`);
      setTimeout(() => {
        setSaveSuccessToast(null);
      }, 5000);
    } catch (error) {
      console.error('Erro ao salvar lançamento:', error);
      triggerHaptic('error');
      alert('Erro ao salvar lançamento. Verifique sua conexão com a internet.');
    }
  };

  // Se o operador já estiver logado, exibe diretamente a tela de Lançamento de Extrusão com os dados reconhecidos!
  if (operatorSession) {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-slate-900 overflow-hidden z-[99999]">
        {/* Toast Flutuante de Sucesso ao Salvar */}
        {saveSuccessToast && (
          <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100000] w-[92%] max-w-md bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300 border border-emerald-400">
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2 size={20} className="shrink-0 text-white animate-pulse" />
              <p className="text-xs sm:text-sm font-black truncate">{saveSuccessToast}</p>
            </div>
            <button
              onClick={() => setSaveSuccessToast(null)}
              className="text-emerald-100 hover:text-white p-1 rounded-lg text-xs font-bold shrink-0 cursor-pointer"
            >
              OK
            </button>
          </div>
        )}

        <LaunchModal
          isOpen={true}
          onClose={() => {
            // Em modo portal de operador, fechar questiona se deseja deslogar ou fechar
            handleLogout();
          }}
          onSave={handleSaveWrapper}
          collaborators={collaborators}
          employees={employees}
          vacations={vacations}
          activeMachines={extrusionMachines}
          availableShifts={availableShifts}
          dashboardMonth={dashboardMonth}
          productionEntries={productionEntries}
          ribbonEntries={ribbonEntries}
          presetOperator={operatorSession.name}
          presetShift={operatorSession.shift}
          presetMachine={operatorSession.machine}
          presetDate={operatorSession.date}
          isExternalOperatorMode={true}
          operatorRegistration={operatorSession.registration}
          onOperatorLogout={handleLogout}
        />
      </div>
    );
  }

  // TELA DE LOGIN DO OPERADOR NO LINK EXTERNO (Otimizada para Celular/Mobile e Chão de Fábrica)
  return (
    <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-between overflow-y-auto p-4 sm:p-6 z-[99999]">
      {/* Top Header / Branding */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          {systemLogo ? (
            <img
              src={systemLogo}
              alt="Logo da Empresa"
              className="h-9 w-auto max-w-[130px] object-contain drop-shadow-md rounded-md"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md">
              MP
            </div>
          )}
          <div className="leading-tight">
            <h1 className="text-xs sm:text-sm font-black text-white tracking-wider uppercase">
              {systemName || 'CONTROLE DE PRODUÇÃO'}
            </h1>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1">
              <Factory size={11} /> Chão de Fábrica • Extrusão
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[9px] font-bold text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Online</span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-auto py-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
          {/* Decorative Glow */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-44 h-44 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative space-y-6">
            {/* Header Text */}
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-1">
                <Smartphone size={12} /> Acesso Mobile Operador
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Lançamento de Extrusão
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Entre com sua matrícula e senha para apontar a produção e paradas na máquina pelo celular.
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="bg-red-950/80 border border-red-800/80 text-red-200 px-3.5 py-2.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <span className="font-semibold leading-snug">{errorMsg}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Campo Matrícula */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Matrícula Funcional</span>
                  {detectedCandidate && (
                    <span className="text-[10px] text-blue-400 font-bold capitalize">
                      👤 {detectedCandidate.name}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    placeholder="Digite o número da sua matrícula"
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Informações pré-identificadas quando matrícula é digitada */}
              {detectedCandidate && (
                <div className="bg-blue-950/40 border border-blue-800/50 rounded-2xl p-3 space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Operador:</span>
                    <span className="font-black text-white">{detectedCandidate.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Turno Reconhecido:</span>
                    <span className="font-bold text-blue-300">{detectedCandidate.shift}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Máquina Principal:</span>
                    <span className="font-bold text-emerald-400">{detectedCandidate.machine}</span>
                  </div>
                </div>
              )}

              {/* Campo Senha */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider block">
                  Senha de Acesso
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full pl-10 pr-11 py-3.5 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Botão Entrar */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <span>Conectando...</span>
                ) : (
                  <>
                    <span>Entrar e Fazer Lançamento</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Aviso informativo de chão de fábrica */}
            <div className="pt-2 border-t border-slate-800 text-center">
              <p className="text-[10px] text-slate-500 leading-normal">
                Ao entrar, o sistema reconhece automaticamente o operador, data e turno, abrindo a tela oficial de lançamento da Extrusão (Cast 1, Cast 2 e Erema).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Opção de voltar ao sistema completo se estiver no computador */}
      <div className="w-full max-w-md mx-auto text-center py-2 space-y-2">
        {onExitToMainApp && (
          <button
            type="button"
            onClick={onExitToMainApp}
            className="text-[11px] font-bold text-slate-400 hover:text-slate-200 transition-colors underline cursor-pointer"
          >
            Acessar Sistema Completo no Computador
          </button>
        )}
        <p className="text-[9px] text-slate-600 font-semibold uppercase tracking-widest">
          {systemName} • Sistema Industrial 2026
        </p>
      </div>
    </div>
  );
};
