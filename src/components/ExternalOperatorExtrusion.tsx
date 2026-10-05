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
  Cpu,
  RefreshCw,
  KeyRound,
  ArrowLeft
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
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

// Lista oficial dos operadores de Extrusão (Cast 1 e Cast 2) informados pela fábrica
const OFFICIAL_CAST_OPERATORS = [
  'adriano',
  'carlos felipe',
  'christian',
  'sidnei',
  'deives',
  'pedrilso',
  'endrik',
  'joao augusto',
  'marcelo'
];

// Operadores conhecidos da Erema (Setor de Reciclagem)
const OFFICIAL_EREMA_OPERATORS = [
  'fabio andre',
  'gilcimar',
  'jocelan'
];

const normalizeText = (text: string = ''): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

/**
 * Cálculo inteligente de Data e Turno 12x36:
 * Turno Diurno: 06:00 às 18:00
 * Turno Noturno: 18:00 às 06:00 (do dia seguinte)
 *
 * Exemplo prático: O plantão noturno do dia 4 acessa na manhã do dia 5 (ex: 06:30).
 * O lançamento pertence à noite do dia 4, portanto a data de produção é o dia 4 e o turno Noturno!
 */
export const calculateExtrusion12x36 = (empShift?: string) => {
  const now = new Date();
  const currentHour = now.getHours();

  // Ontem (D-1)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString('sv-SE');
  const todayStr = now.toLocaleDateString('sv-SE');

  const normShift = (empShift || '').toLowerCase();
  const isRegisteredDiurno = normShift.includes('diurno') || normShift.includes('dia') || normShift.includes('1º');
  const isRegisteredNoturno = normShift.includes('noturno') || normShift.includes('noite') || normShift.includes('2º') || normShift.includes('3º');

  let date = yesterdayStr;
  let shift: 'Diurno' | 'Noturno' = 'Noturno';

  if (currentHour < 12) {
    // Período da manhã (00:00 até 11:59):
    // Operadores da noite que acessam pela manhã apontam a produção do plantão iniciado ontem à noite.
    date = yesterdayStr;
    shift = isRegisteredDiurno ? 'Diurno' : 'Noturno';
  } else if (currentHour >= 12 && currentHour < 18) {
    // Período da tarde (12:00 até 17:59):
    // Turno Diurno em andamento no próprio dia de hoje.
    date = todayStr;
    shift = 'Diurno';
  } else {
    // Período da noite (18:00 até 23:59):
    // Diurno recém-saído às 18h ou Noturno recém-iniciado às 18h.
    date = todayStr;
    shift = isRegisteredNoturno ? 'Noturno' : 'Diurno';
  }

  return { date, shift };
};

interface OperatorCheckResult {
  authorized: boolean;
  operatorName: string;
  isEremaOperator: boolean;
  empRecord?: Employee;
  reason?: string;
}

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
  // Sessão persistida do operador
  const [operatorSession, setOperatorSession] = useState<{
    name: string;
    registration: string;
    role: string;
    isEremaOperator: boolean;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('manupackaging_operator_portal_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Fluxo de telas: 'login' -> 'first_access' -> 'select_machine' -> 'launch_form'
  const [currentStep, setCurrentStep] = useState<'login' | 'first_access' | 'select_machine' | 'launch_form'>(() => {
    try {
      const saved = localStorage.getItem('manupackaging_operator_portal_user');
      return saved ? 'select_machine' : 'login';
    } catch {
      return 'login';
    }
  });

  // Dados do lançamento selecionados pelo operador
  const [selectedMachine, setSelectedMachine] = useState<'Cast 1' | 'Cast 2' | 'Erema' | null>(null);
  const [selectedShift, setSelectedShift] = useState<'Diurno' | 'Noturno'>('Noturno');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const calc = calculateExtrusion12x36();
    return calc.date;
  });

  // Campos do formulário de Login
  const [matricula, setMatricula] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Campos do Primeiro Acesso
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Estados de feedback e controle
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState<string | null>(null);

  // Verificação estrita de autorização de operadores (Extrusão Cast vs Reciclagem Erema)
  const checkOperatorAuthorization = (mat: string): OperatorCheckResult => {
    const cleanMat = mat.trim();
    if (!cleanMat) return { authorized: false, operatorName: '', isEremaOperator: false };

    // Admin master 1010
    if (cleanMat === '1010') {
      return {
        authorized: true,
        operatorName: 'Supervisor / Operador Master',
        isEremaOperator: false
      };
    }

    // 1. Busca no cadastro de funcionários (employees)
    const emp = employees.find(e => e.registration === cleanMat);
    if (emp) {
      const empNorm = normalizeText(emp.name);
      const roleNorm = normalizeText(emp.role);
      const sectorNorm = normalizeText(emp.sector);
      const machNorm = normalizeText(emp.machine);

      // Bloqueia expressamente funcionários de Corte de Fita
      const isFita = sectorNorm.includes('fita') || machNorm.includes('ghezzi') || machNorm.includes('lintech') || machNorm.includes('wultec') || roleNorm.includes('fita');
      if (isFita) {
        return {
          authorized: false,
          operatorName: emp.name,
          isEremaOperator: false,
          reason: 'Acesso restrito: Funcionários do setor de Corte de Fita não realizam lançamentos de Extrusão ou Reciclagem.'
        };
      }

      // Verificação de EREMA (Setor Reciclagem)
      const isErema = (
        sectorNorm.includes('recicla') ||
        machNorm.includes('erema') ||
        roleNorm.includes('erema') ||
        OFFICIAL_EREMA_OPERATORS.some(op => empNorm.includes(normalizeText(op)))
      );

      // Verificação de CAST (Setor Extrusão)
      const isCastOfficial = OFFICIAL_CAST_OPERATORS.some(op => empNorm.includes(normalizeText(op)));
      const isCast = isCastOfficial || sectorNorm.includes('extrus') || machNorm.includes('cast');

      if (isErema) {
        return {
          authorized: true,
          operatorName: emp.name,
          isEremaOperator: true,
          empRecord: emp
        };
      }

      if (isCast) {
        return {
          authorized: true,
          operatorName: emp.name,
          isEremaOperator: false,
          empRecord: emp
        };
      }
    }

    // 2. Busca em collaborators
    const collab = collaborators.find(c => c.registration === cleanMat);
    if (collab) {
      const collabNorm = normalizeText(collab.name);
      const isErema = OFFICIAL_EREMA_OPERATORS.some(op => collabNorm.includes(normalizeText(op)));
      const isCast = OFFICIAL_CAST_OPERATORS.some(op => collabNorm.includes(normalizeText(op)));

      if (isErema) {
        return { authorized: true, operatorName: collab.name, isEremaOperator: true };
      }
      if (isCast) {
        return { authorized: true, operatorName: collab.name, isEremaOperator: false };
      }
    }

    // 3. Busca em system_users
    const user = systemUsers.find(u => u.registration === cleanMat);
    if (user) {
      const userNorm = normalizeText(user.name);
      const isErema = OFFICIAL_EREMA_OPERATORS.some(op => userNorm.includes(normalizeText(op)));
      const isCast = OFFICIAL_CAST_OPERATORS.some(op => userNorm.includes(normalizeText(op)));

      if (isErema) {
        return { authorized: true, operatorName: user.name, isEremaOperator: true };
      }
      if (isCast) {
        return { authorized: true, operatorName: user.name, isEremaOperator: false };
      }
    }

    return {
      authorized: false,
      operatorName: '',
      isEremaOperator: false,
      reason: 'Matrícula não autorizada. O portal mobile é exclusivo para operadores de Extrusão (Cast 1 e Cast 2) e Reciclagem (Erema).'
    };
  };

  // Pré-identificação amigável enquanto o operador digita a matrícula
  const detectedCandidate = useMemo(() => {
    const cleanMat = matricula.trim();
    if (!cleanMat || cleanMat.length < 2) return null;
    const check = checkOperatorAuthorization(cleanMat);
    if (check.authorized) {
      return {
        name: check.operatorName,
        isErema: check.isEremaOperator,
        emp: check.empRecord
      };
    }
    return null;
  }, [matricula, employees, collaborators, systemUsers]);

  // Atualiza data e turno conforme operador logado
  const updateInitialShiftAndDate = (emp?: Employee) => {
    const calc = calculateExtrusion12x36(emp?.shift);
    setSelectedDate(calc.date);
    setSelectedShift(calc.shift);
  };

  // Submissão do login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanMat = matricula.trim();
    const cleanPass = password.trim();

    if (!cleanMat) {
      triggerHaptic('warning');
      setErrorMsg('Por favor, informe sua matrícula funcional.');
      return;
    }

    // 1. Validação estrita de autorização
    const authCheck = checkOperatorAuthorization(cleanMat);
    if (!authCheck.authorized) {
      triggerHaptic('error');
      setErrorMsg(authCheck.reason || 'Acesso não autorizado: Matrícula não cadastrada para este portal.');
      return;
    }

    // 2. Verifica se o usuário tem senha cadastrada ou se é Primeiro Acesso
    const existingSystemUser = systemUsers.find(u => u.registration === cleanMat);
    const hasRegisteredPassword = Boolean(
      existingSystemUser &&
      existingSystemUser.password &&
      existingSystemUser.password.length >= 4 &&
      !existingSystemUser.isFirstAccess
    );

    // Se NÃO tiver senha cadastrada ainda (ou isFirstAccess == true), redireciona para a tela de Primeiro Acesso
    if (!hasRegisteredPassword && cleanMat !== '1010') {
      triggerHaptic('light');
      setCurrentStep('first_access');
      return;
    }

    // Se já tiver senha cadastrada, exige a senha
    if (!cleanPass) {
      triggerHaptic('warning');
      setErrorMsg('Por favor, digite sua senha de acesso.');
      return;
    }

    setIsLoading(true);

    try {
      // Login Mestre 1010
      if (cleanMat === '1010' && cleanPass === '1010') {
        const session = {
          name: 'Supervisor / Operador Master',
          registration: '1010',
          role: 'Administrador',
          isEremaOperator: false
        };
        setOperatorSession(session);
        localStorage.setItem('manupackaging_operator_portal_user', JSON.stringify(session));
        updateInitialShiftAndDate();
        setCurrentStep('select_machine');
        triggerHaptic('success');
        setIsLoading(false);
        return;
      }

      // Validação da senha com o cadastro
      const normalizeStr = (s: string) =>
        (s || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();

      const userPass = existingSystemUser?.password || '';
      const isMatch =
        userPass === cleanPass ||
        userPass.trim() === cleanPass ||
        normalizeStr(userPass) === normalizeStr(cleanPass);

      if (!isMatch) {
        triggerHaptic('error');
        setErrorMsg('Senha incorreta. Verifique sua senha e tente novamente.');
        setIsLoading(false);
        return;
      }

      // Sucesso no login
      const session = {
        name: authCheck.operatorName || existingSystemUser?.name || 'Operador',
        registration: cleanMat,
        role: existingSystemUser?.role || 'Operador',
        isEremaOperator: authCheck.isEremaOperator
      };

      setOperatorSession(session);
      localStorage.setItem('manupackaging_operator_portal_user', JSON.stringify(session));
      updateInitialShiftAndDate(authCheck.empRecord);
      setCurrentStep('select_machine');
      triggerHaptic('success');
    } catch (err) {
      console.error('Erro na autenticação:', err);
      setErrorMsg('Falha ao autenticar. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submissão do Primeiro Acesso (Cadastro de Senha)
  const handleFirstAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanMat = matricula.trim();
    const p1 = newPassword.trim();
    const p2 = confirmPassword.trim();

    if (!p1 || p1.length < 4) {
      triggerHaptic('warning');
      setErrorMsg('A nova senha deve ter no mínimo 4 caracteres ou dígitos.');
      return;
    }

    if (p1 !== p2) {
      triggerHaptic('warning');
      setErrorMsg('As senhas digitadas não coincidem. Digite a mesma senha em ambos os campos.');
      return;
    }

    setIsLoading(true);

    try {
      const authCheck = checkOperatorAuthorization(cleanMat);
      const existingUser = systemUsers.find(u => u.registration === cleanMat);
      const userId = existingUser?.id || `user_${cleanMat}`;
      const operatorName = authCheck.operatorName || existingUser?.name || 'Operador';

      const userPayload: SystemUser = {
        id: userId,
        name: operatorName,
        registration: cleanMat,
        role: existingUser?.role || 'Operador',
        password: p1,
        isFirstAccess: false,
        permissions: {
          canViewDashboard: false,
          canViewReports: false,
          canViewPersonnel: false,
          canManageSettings: false,
          canEditProduction: true,
          canManagePersonnel: false,
          isReadOnly: false
        }
      };

      await setDoc(doc(db, 'system_users', userId), userPayload, { merge: true });

      const session = {
        name: operatorName,
        registration: cleanMat,
        role: 'Operador',
        isEremaOperator: authCheck.isEremaOperator
      };

      setOperatorSession(session);
      localStorage.setItem('manupackaging_operator_portal_user', JSON.stringify(session));
      updateInitialShiftAndDate(authCheck.empRecord);
      triggerHaptic('success');
      alert('Senha cadastrada com sucesso! Agora você já pode selecionar a máquina e realizar o lançamento.');
      setCurrentStep('select_machine');
    } catch (err) {
      console.error('Erro ao cadastrar senha de primeiro acesso:', err);
      setErrorMsg('Erro ao salvar senha no banco de dados. Tente novamente.');
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
      setNewPassword('');
      setConfirmPassword('');
      setErrorMsg(null);
      setSelectedMachine(null);
      setCurrentStep('login');
    }
  };

  const handleSelectMachineToLaunch = (machine: 'Cast 1' | 'Cast 2' | 'Erema') => {
    triggerHaptic('light');
    setSelectedMachine(machine);
    setCurrentStep('launch_form');
  };

  const handleSaveAndReturn = async (entry: Omit<ProductionEntry, 'id'> & { id?: string }) => {
    try {
      await onSave(entry);
      triggerHaptic('success');
      const mach = entry.machine || selectedMachine || 'Extrusão';
      setSaveSuccessToast(`Lançamento da ${mach} salvo com sucesso no sistema!`);
      setTimeout(() => {
        setSaveSuccessToast(null);
      }, 5000);

      // Retorna para a tela de seleção de máquina após o salvamento
      setCurrentStep('select_machine');
    } catch (err) {
      console.error('Erro ao salvar:', err);
      triggerHaptic('error');
      alert('Falha ao salvar lançamento no sistema. Verifique a conexão com a internet.');
    }
  };

  // ==========================================
  // ETAPA 4: FORMULÁRIO DE LANÇAMENTO OFICIAL
  // ==========================================
  if (currentStep === 'launch_form' && operatorSession && selectedMachine) {
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
          onClose={() => setCurrentStep('select_machine')}
          onSave={handleSaveAndReturn}
          collaborators={collaborators}
          employees={employees}
          vacations={vacations}
          activeMachines={[selectedMachine]}
          availableShifts={availableShifts}
          dashboardMonth={dashboardMonth}
          productionEntries={productionEntries}
          ribbonEntries={ribbonEntries}
          presetOperator={operatorSession.name}
          presetShift={selectedShift}
          presetMachine={selectedMachine}
          presetDate={selectedDate}
          isExternalOperatorMode={true}
          operatorRegistration={operatorSession.registration}
          onOperatorLogout={handleLogout}
          onBackToMachineSelect={() => setCurrentStep('select_machine')}
        />
      </div>
    );
  }

  // =========================================================================
  // ETAPA 3: TELA GERAL DE SELEÇÃO DE MÁQUINA (CAST 1/2 vs EREMA RESTRITO)
  // ==========================================
  if (currentStep === 'select_machine' && operatorSession) {
    const isEremaOp = operatorSession.isEremaOperator;
    const isMaster = operatorSession.registration === '1010';

    return (
      <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-between overflow-y-auto p-4 sm:p-6 z-[99999]">
        {/* Header do Operador Autenticado */}
        <div className="w-full max-w-lg mx-auto flex items-center justify-between py-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {systemLogo ? (
              <img
                src={systemLogo}
                alt="Logo"
                className="h-8 w-auto max-w-[110px] object-contain drop-shadow-md rounded-md"
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs">
                MP
              </div>
            )}
            <div className="min-w-0 truncate">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block flex items-center gap-1">
                {isEremaOp ? (
                  <span className="text-emerald-400 font-black">♻️ Operador de Reciclagem</span>
                ) : (
                  <span className="text-blue-400 font-black">🏭 Operador de Extrusão</span>
                )}
              </span>
              <h2 className="text-sm sm:text-base font-black text-white truncate">
                {operatorSession.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-200 rounded-xl text-xs font-bold border border-red-800/60 transition-all cursor-pointer shrink-0"
            title="Sair do portal"
          >
            <LogOut size={14} />
            <span className="text-[10px] uppercase font-black">Sair</span>
          </button>
        </div>

        {/* Card Central de Seleção de Máquina */}
        <div className="w-full max-w-lg mx-auto my-auto py-4 space-y-4">
          {/* Toast de Sucesso */}
          {saveSuccessToast && (
            <div className="bg-emerald-600/90 border border-emerald-400 text-white p-3.5 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in fade-in duration-300">
              <CheckCircle2 size={20} className="shrink-0 animate-pulse" />
              <p className="text-xs sm:text-sm font-black">{saveSuccessToast}</p>
            </div>
          )}

          {/* Card dos Parâmetros Reconhecidos (Data e Turno 12x36) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                <Clock size={12} /> Turno & Data (Regra 12x36)
              </span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isEremaOp ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'}`}>
                {isEremaOp ? 'Reciclagem' : 'Extrusão'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Data do Lançamento */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Data do Lançamento
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-transparent text-white font-black text-xs sm:text-sm outline-none cursor-pointer"
                />
              </div>

              {/* Turno 12x36 */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-2.5 space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Turno de Trabalho
                </label>
                <div className="flex bg-slate-900 rounded-xl p-0.5 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedShift('Diurno');
                    }}
                    className={`flex-1 py-1 text-[10px] font-black rounded-lg transition-all ${
                      selectedShift === 'Diurno'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Diurno (06-18h)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedShift('Noturno');
                    }}
                    className={`flex-1 py-1 text-[10px] font-black rounded-lg transition-all ${
                      selectedShift === 'Noturno'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Noturno (18-06h)
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-tight">
              💡 <strong className="text-slate-400">Regra 12x36:</strong> Operadores da noite que acessam pela manhã têm o lançamento registrado na data de início do plantão noturno (ontem).
            </p>
          </div>

          {/* Título de Instrução */}
          <div className="text-center sm:text-left space-y-1 px-1">
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
              {isEremaOp
                ? 'Lançamento da Recicladora Erema'
                : 'Selecione a Extrusora para o Lançamento:'}
            </h3>
            <p className="text-xs text-slate-400">
              {isEremaOp
                ? 'Você está autenticado no setor de Reciclagem. Toque abaixo para abrir o formulário da Erema:'
                : 'Você está autenticado no setor de Extrusão. Escolha entre Cast 1 ou Cast 2:'}
            </p>
          </div>

          {/* ========================================================================= */}
          {/* SELEÇÃO CONDICIONAL DE MÁQUINA:                                          */}
          {/* - Operador da Extrusão: VÊ SOMENTE CAST 1 E CAST 2 (NUNCA VÊ EREMA)      */}
          {/* - Operador da Erema: VÊ SOMENTE EREMA (NUNCA VÊ CAST 1 OU CAST 2)         */}
          {/* - Supervisor Master (1010): Vê todas para fins de gestão                  */}
          {/* ========================================================================= */}
          <div className={`grid gap-3.5 ${isEremaOp ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {/* Opções CAST 1 e CAST 2 (Apenas para operadores de Cast ou Master 1010) */}
            {(!isEremaOp || isMaster) && (
              <>
                {/* Opção CAST 1 */}
                <button
                  type="button"
                  onClick={() => handleSelectMachineToLaunch('Cast 1')}
                  className="bg-gradient-to-br from-blue-900/60 via-slate-900 to-slate-900 hover:from-blue-800/80 hover:via-blue-950 hover:to-slate-900 border-2 border-blue-500/40 hover:border-blue-400 p-5 rounded-3xl text-left transition-all active:scale-[0.98] group cursor-pointer shadow-xl relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 group-hover:scale-110 transition-transform">
                      <Factory size={26} />
                    </div>
                    <div className="flex items-center gap-1 bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                      <span>Abrir</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                  <h4 className="text-xl font-black text-white uppercase tracking-tight">CAST 1</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">
                    Extrusora de filme stretch Cast 1 • Lançamento de peso bruto, tara, paradas e aparas.
                  </p>
                </button>

                {/* Opção CAST 2 */}
                <button
                  type="button"
                  onClick={() => handleSelectMachineToLaunch('Cast 2')}
                  className="bg-gradient-to-br from-indigo-900/60 via-slate-900 to-slate-900 hover:from-indigo-800/80 hover:via-indigo-950 hover:to-slate-900 border-2 border-indigo-500/40 hover:border-indigo-400 p-5 rounded-3xl text-left transition-all active:scale-[0.98] group cursor-pointer shadow-xl relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 group-hover:scale-110 transition-transform">
                      <Factory size={26} />
                    </div>
                    <div className="flex items-center gap-1 bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                      <span>Abrir</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                  <h4 className="text-xl font-black text-white uppercase tracking-tight">CAST 2</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-snug">
                    Extrusora de filme stretch Cast 2 • Lançamento de peso bruto, tara, paradas e aparas.
                  </p>
                </button>
              </>
            )}

            {/* Opção EREMA (Apenas para operadores da Erema ou Master 1010) */}
            {(isEremaOp || isMaster) && (
              <button
                type="button"
                onClick={() => handleSelectMachineToLaunch('Erema')}
                className="bg-gradient-to-br from-emerald-950/70 via-slate-900 to-slate-900 hover:from-emerald-900/90 hover:via-emerald-950 hover:to-slate-900 border-2 border-emerald-500/50 hover:border-emerald-400 p-6 rounded-3xl text-left transition-all active:scale-[0.98] group cursor-pointer shadow-xl relative overflow-hidden w-full"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center text-emerald-300 group-hover:scale-110 transition-transform">
                    <RefreshCw size={28} />
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-full text-xs font-black uppercase">
                    <span>Lançar Produção</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">
                    Setor de Reciclagem
                  </span>
                  <h4 className="text-2xl font-black text-white uppercase tracking-tight">EREMA</h4>
                </div>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Linha de recuperação e reciclagem de resíduos plásticos • Apontamento de pesagens e horas de operação.
                </p>
              </button>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="w-full max-w-lg mx-auto text-center py-2">
          <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest">
            {systemName} • Portal de Chão de Fábrica 2026
          </p>
        </div>
      </div>
    );
  }

  // ==========================================
  // ETAPA 2: PRIMEIRO ACESSO (CADASTRO DE SENHA)
  // ==========================================
  if (currentStep === 'first_access') {
    return (
      <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-between overflow-y-auto p-4 sm:p-6 z-[99999]">
        <div className="w-full max-w-md mx-auto my-auto py-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative space-y-6">
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setCurrentStep('login');
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Voltar ao login</span>
            </button>

            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                <KeyRound size={12} /> Primeiro Acesso do Operador
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Cadastrar Senha Pessoal
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Olá, <strong className="text-white">{detectedCandidate?.name || 'Operador'}</strong>! Como este é seu primeiro acesso com a matrícula <strong className="text-white">{matricula}</strong>, crie sua senha pessoal de segurança para autorizar seus lançamentos.
              </p>
            </div>

            {errorMsg && (
              <div className="bg-red-950/80 border border-red-800 text-red-200 px-3.5 py-2.5 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <span className="font-semibold leading-snug">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleFirstAccessSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider block">
                  Criar Nova Senha (mínimo 4 caracteres)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    autoFocus
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite sua nova senha"
                    className="w-full pl-10 pr-11 py-3.5 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider block">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita sua nova senha"
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-inner"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <span>Salvando Senha...</span>
                ) : (
                  <>
                    <span>Cadastrar Senha e Acessar</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // ETAPA 1: TELA DE LOGIN DO OPERADOR
  // ==========================================
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
              <Factory size={11} /> Chão de Fábrica • Apontamento
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
                Lançamento de Produção
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Digite sua matrícula funcional para acessar a sua máquina e realizar o apontamento direto pelo celular.
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
                    placeholder="Digite sua matrícula"
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Informações pré-identificadas quando matrícula é válida */}
              {detectedCandidate && (
                <div className="bg-blue-950/40 border border-blue-800/50 rounded-2xl p-3 space-y-1 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-medium">Operador Reconhecido:</span>
                    <span className="font-black text-white">{detectedCandidate.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-medium">Setor de Atuação:</span>
                    <span className={`font-black uppercase tracking-wider ${detectedCandidate.isErema ? 'text-emerald-400' : 'text-blue-300'}`}>
                      {detectedCandidate.isErema ? 'Reciclagem (Erema)' : 'Extrusão (Cast 1 e Cast 2)'}
                    </span>
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
                    placeholder="Digite sua senha de acesso"
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
                <p className="text-[9.5px] text-slate-500">
                  Se for seu primeiro acesso, digite sua matrícula para cadastrar sua nova senha.
                </p>
              </div>

              {/* Botão Entrar */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <span>Validando Operador...</span>
                ) : (
                  <>
                    <span>Acessar e Escolher Máquina</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Aviso informativo de chão de fábrica */}
            <div className="pt-2 border-t border-slate-800 text-center">
              <p className="text-[10px] text-slate-500 leading-normal">
                Acesso restrito exclusivamente aos operadores de Extrusão (Cast 1 e 2) e Reciclagem (Erema).
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
