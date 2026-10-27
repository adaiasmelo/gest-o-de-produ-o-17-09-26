import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Upload, FileText, CheckCircle2, AlertCircle, 
  Clock, Calendar, User, Users, X, Loader2, ArrowRight,
  Check, Trash2, Eye, ShieldCheck, ChevronDown, CheckSquare,
  Zap, Info, CornerDownRight, RefreshCw, Copy, Plus
} from 'lucide-react';
import { Employee, OvertimeEntry, OvertimeMode, SystemUser } from '../types';
import { triggerHaptic } from '../utils/haptics';

interface OvertimeAiScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBatchEntries: (entries: Array<Omit<OvertimeEntry, 'id'>>) => Promise<void>;
  loggedUser: SystemUser | null;
  employees: Employee[];
}

export interface ParsedOvertimeEvent {
  id: string;
  selected: boolean;
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  isSaturday: boolean;
  isSunday: boolean;
  isHoliday: boolean;
  holidayName?: string;
  overtimeMode: OvertimeMode;
  shiftTypeChoice: 'Comercial' | 'Diurno' | 'Noturno';
  startTime: string;
  endTime: string;
  overtimeHoursRaw: string;
  overtimeHoursDecimal: number;
  overtimeHoursFormatted: string;
  overtimePercentage: number;
  workingHoursRaw?: string;
  workingHoursDecimal?: number;
  isNightShift?: boolean;
  markingsText?: string;
  reason: string; // starts empty for user to fill
  notes?: string;
}

const COMMON_REASONS = [
  'Atendimento de demanda extraordinária de produção',
  'Apoio operacional e fechamento de turno',
  'Intervenção emergencial e suporte a processo',
  'Continuidade de setup e regulagem de máquinas',
  'Supervisão e auditoria de produção',
  'Carregamento prioritário de pedidos',
  'Cobertura de ausência e escala especial'
];

export const OvertimeAiScannerModal: React.FC<OvertimeAiScannerModalProps> = ({
  isOpen,
  onClose,
  onSaveBatchEntries,
  loggedUser,
  employees
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Dados extraídos
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [employeeName, setEmployeeName] = useState<string>('');
  const [registration, setRegistration] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [sector, setSector] = useState<string>('Extrusão');
  const [period, setPeriod] = useState<string>('');
  const [contractSchedule, setContractSchedule] = useState<string>('');
  const [parsedEvents, setParsedEvents] = useState<ParsedOvertimeEvent[]>([]);

  // Motivo em lote compartilhado
  const [batchCommonReason, setBatchCommonReason] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Limpa completamente o estado do scanner para novo uso limpo
  const resetScannerState = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setIsScanning(false);
    setScanStep('');
    setErrorMessage(null);
    setSelectedEmployeeId('');
    setEmployeeName('');
    setRegistration('');
    setRole('');
    setSector('Extrusão');
    setPeriod('');
    setContractSchedule('');
    setParsedEvents([]);
    setBatchCommonReason('');
    setIsSaving(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Sempre que o modal for fechado, zera o estado para não reabrir com dados antigos
  useEffect(() => {
    if (!isOpen) {
      resetScannerState();
    }
  }, [isOpen]);

  // Escuta colar de imagem (Ctrl+V) no modal
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleProcessFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  if (!isOpen) return null;

  // Utilitário para redimensionar e otimizar imagens grandes antes do envio (evita limites de proxy/payload e acelera IA)
  const compressImageForAnalysis = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.88));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // Selecionar colaborador manualmente ou deixar a IA detectar
  const handleSelectEmployee = (empId: string) => {
    setSelectedEmployeeId(empId);
    if (!empId) {
      setEmployeeName('');
      setRegistration('');
      setRole('');
      setSector('Produção');
      return;
    }
    const emp = employees.find(e => 
      (e.id && e.id === empId) || 
      (e.collaboratorId && e.collaboratorId === empId) || 
      (e.registration && e.registration === empId) || 
      e.name === empId
    );
    if (emp) {
      setEmployeeName(emp.name);
      setRegistration(emp.registration || '');
      setRole(emp.role || 'Operador');
      setSector(emp.sector || 'Produção');
    }
  };

  // Permite adicionar uma nova linha de hora extra manualmente para ajuste ou conferência
  const handleAddManualEvent = () => {
    const today = new Date().toISOString().substring(0, 10);
    const newEv: ParsedOvertimeEvent = {
      id: `manual_ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      selected: true,
      date: today,
      dayOfWeek: 'SEG',
      isSaturday: false,
      isSunday: false,
      isHoliday: false,
      holidayName: '',
      overtimeMode: 'pos_turno',
      shiftTypeChoice: 'Comercial',
      startTime: '07:30',
      endTime: '18:20',
      overtimeHoursRaw: '01:00',
      overtimeHoursDecimal: 1.0,
      overtimeHoursFormatted: '1h 00min',
      overtimePercentage: 60,
      workingHoursRaw: '08:48',
      workingHoursDecimal: 8.8,
      isNightShift: false,
      markingsText: '',
      reason: batchCommonReason || '',
      notes: 'Lançamento manual / conferência'
    };
    setParsedEvents(prev => [...prev, newEv]);
  };

  const handleProcessFile = (file: File) => {
    setErrorMessage(null);
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawDataUrl = e.target?.result as string;
      try {
        const optimized = await compressImageForAnalysis(rawDataUrl);
        setImagePreview(optimized);
      } catch {
        setImagePreview(rawDataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  // Disparar análise via Inteligência Artificial
  const handleScanImage = async () => {
    if (!imagePreview) {
      setErrorMessage('Por favor, carregue a imagem da folha de ponto.');
      return;
    }

    setIsScanning(true);
    setErrorMessage(null);
    setScanStep('Iniciando análise multimodal com IA...');

    try {
      setScanStep('Lendo cabeçalho cadastral e matrícula do colaborador...');
      await new Promise(r => setTimeout(r, 400));

      setScanStep('Identificando batidas de ponto, horários e apuração de horas extras...');
      
      let json: any = null;
      try {
        const optimizedImage = await compressImageForAnalysis(imagePreview);
        const res = await fetch('/api/parse-cartao-ponto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Image: optimizedImage,
            mimeType: 'image/jpeg',
            selectedEmployeeName: employeeName || undefined,
            selectedRegistration: registration || undefined,
            selectedRole: role || undefined,
            selectedSector: sector || undefined
          })
        });

        const rawText = await res.text();
        if (rawText && rawText.trim()) {
          try {
            json = JSON.parse(rawText);
          } catch (pe) {
            console.warn('Resposta da API não é JSON estrito:', pe, rawText);
          }
        }
      } catch (fetchErr) {
        console.warn('Erro na requisição fetch para /api/parse-cartao-ponto:', fetchErr);
      }

      setScanStep('Processando apuração de horas extras...');

      if (json && json.success && json.data) {
        const data = json.data;
        const extractedName = (data.employeeName && data.employeeName !== 'Colaborador') ? data.employeeName : (employeeName || 'Colaborador');
        const extractedReg = data.registration || registration || '';
        const extractedRole = data.role || role || 'Operador';
        const extractedSector = data.sector || sector || 'Produção';

        setEmployeeName(extractedName);
        setRegistration(extractedReg);
        setRole(extractedRole);
        setSector(extractedSector);
        if (data.period) setPeriod(data.period);
        if (data.contractSchedule) setContractSchedule(data.contractSchedule);

        // Tenta cruzar com funcionário cadastrado no banco por matrícula ou nome
        if (extractedReg && employees && employees.length > 0) {
          const found = employees.find(e => (e.registration || '').trim() === String(extractedReg).trim());
          if (found) {
            setSelectedEmployeeId(found.id || found.collaboratorId || found.registration || '');
            if (found.name) setEmployeeName(found.name);
            if (found.sector) setSector(found.sector);
            if (found.role) setRole(found.role);
          }
        } else if (extractedName && employees && employees.length > 0) {
          const foundByName = employees.find(e => e.name.toLowerCase().trim() === extractedName.toLowerCase().trim());
          if (foundByName) {
            setSelectedEmployeeId(foundByName.id || foundByName.collaboratorId || foundByName.registration || '');
            if (foundByName.sector) setSector(foundByName.sector);
            if (foundByName.role) setRole(foundByName.role);
          }
        }

        const rawEvents = data.overtimeEvents || [];
        if (rawEvents.length > 0) {
          const events: ParsedOvertimeEvent[] = rawEvents.map((ev: any, idx: number) => ({
            id: `ai_ev_${Date.now()}_${idx}`,
            selected: true,
            date: ev.date,
            dayOfWeek: ev.dayOfWeek || '',
            isSaturday: Boolean(ev.isSaturday),
            isSunday: Boolean(ev.isSunday),
            isHoliday: Boolean(ev.isHoliday),
            holidayName: ev.holidayName || '',
            overtimeMode: (ev.overtimeMode === 'integral' ? 'integral' : 'pos_turno') as OvertimeMode,
            shiftTypeChoice: (ev.shiftTypeChoice || 'Comercial') as any,
            startTime: ev.startTime || '07:30',
            endTime: ev.endTime || '18:20',
            overtimeHoursRaw: ev.overtimeHoursRaw || `${ev.overtimeHoursDecimal}h`,
            overtimeHoursDecimal: Number(ev.overtimeHoursDecimal) || 0,
            overtimeHoursFormatted: ev.overtimeHoursFormatted || `${ev.overtimeHoursDecimal}h`,
            overtimePercentage: Number(ev.overtimePercentage) || (ev.isSunday || ev.isHoliday ? 110 : 60),
            workingHoursRaw: ev.workingHoursRaw,
            workingHoursDecimal: ev.workingHoursDecimal,
            isNightShift: Boolean(ev.isNightShift),
            markingsText: ev.markingsText || '',
            reason: '', // Deixar em branco para preenchimento do usuário
            notes: ev.notes || ''
          }));
          setParsedEvents(events);
          triggerHaptic('success');
        } else {
          setErrorMessage('A IA leu a folha mas não detectou horas extras discriminadas. Você pode selecionar o colaborador e adicionar manualmente os dias extras abaixo.');
          handleAddManualEvent();
        }
      } else {
        const errorDetail = json?.error || 'A IA não conseguiu ler automaticamente as informações desta folha com clareza.';
        setErrorMessage(`${errorDetail} Selecione o colaborador no campo correspondente e confira os lançamentos.`);
        if (employeeName) {
          handleAddManualEvent();
        }
      }
    } catch (err: any) {
      console.error('Erro na leitura da folha de ponto:', err);
      setErrorMessage('Falha ao processar a imagem com IA. Selecione o colaborador e adicione os lançamentos manualmente.');
      if (employeeName) {
        handleAddManualEvent();
      }
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  // Aplicar motivo compartilhado para todas as horas extras selecionadas
  const handleApplyBatchCommonReason = () => {
    if (!batchCommonReason.trim()) return;
    setParsedEvents(prev => prev.map(ev => {
      if (ev.selected) {
        return { ...ev, reason: batchCommonReason.trim() };
      }
      return ev;
    }));
    triggerHaptic('success');
  };

  // Alternar seleção de um dia
  const toggleSelectEvent = (id: string) => {
    setParsedEvents(prev => prev.map(ev => ev.id === id ? { ...ev, selected: !ev.selected } : ev));
  };

  // Atualizar motivo individual de um dia
  const handleUpdateEventReason = (id: string, reasonText: string) => {
    setParsedEvents(prev => prev.map(ev => ev.id === id ? { ...ev, reason: reasonText } : ev));
  };

  // Salvar todos os apontamentos gerados separadamente no banco de dados
  const handleConfirmSaveAll = async () => {
    const selectedList = parsedEvents.filter(ev => ev.selected);

    if (selectedList.length === 0) {
      setErrorMessage('Por favor, selecione pelo menos uma data com hora extra para salvar.');
      return;
    }

    // Verificar se todos os selecionados possuem motivo preenchido
    const emptyReasons = selectedList.filter(ev => !ev.reason.trim());
    if (emptyReasons.length > 0) {
      triggerHaptic('warning');
      setErrorMessage(`Existem ${emptyReasons.length} hora(s) extra(s) selecionada(s) sem motivo preenchido. Digite o motivo individual ou use o campo acima para preencher todas.`);
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const batchGroupId = `cartao_ponto_ai_${Date.now()}`;
      const payloadList: Array<Omit<OvertimeEntry, 'id'>> = selectedList.map(ev => {
        return {
          employeeName: employeeName.trim(),
          registration: registration.trim(),
          role: role.trim() || 'Supervisor de Produção',
          sector: sector.trim() || 'Produção',
          shift: ev.shiftTypeChoice === 'Comercial' ? 'Comercial' : ev.shiftTypeChoice,
          date: ev.date,
          overtimeMode: ev.overtimeMode,
          shiftTypeChoice: ev.shiftTypeChoice,
          isCommercialFlexible: false,
          startTime: ev.startTime,
          endTime: ev.endTime,
          workingHours: ev.workingHoursDecimal || 8.8,
          workingHoursFormatted: ev.workingHoursRaw ? `${ev.workingHoursRaw.replace(':', 'h ')}min` : `${ev.workingHoursDecimal}h`,
          overtimeHours: ev.overtimeHoursDecimal,
          overtimeMinutes: Math.round(ev.overtimeHoursDecimal * 60),
          overtimeHoursFormatted: ev.overtimeHoursFormatted,
          overtimePercentage: ev.overtimePercentage,
          overtimePercentageLabel: `${ev.overtimePercentage}%`,
          equivalentHours: Number((ev.overtimeHoursDecimal * (1 + ev.overtimePercentage / 100)).toFixed(2)),
          overtimeExplanation: `Lançado via Leitura IA de Cartão Ponto • Batidas: ${ev.markingsText || `${ev.startTime} - ${ev.endTime}`}`,
          reason: ev.reason.trim(),
          requestedBy: loggedUser?.name || 'Supervisão de Produção',
          notes: ev.notes || `Folha de ponto período ${period || 'Mensal'}`,
          status: 'approved',
          batchGroupId,
          isNightShiftOvertime: Boolean(ev.isNightShift),
          nightMinutes: ev.isNightShift ? 2 : 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: loggedUser?.id || 'anon',
          userName: loggedUser?.name || 'Sistema IA'
        };
      });

      // Salva cada apontamento separadamente conforme solicitado
      await onSaveBatchEntries(payloadList);
      triggerHaptic('success');
      resetScannerState();
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar apontamentos em lote:', err);
      setErrorMessage(`Erro ao salvar no banco: ${err?.message || 'Tente novamente'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = parsedEvents.filter(ev => ev.selected).length;
  const totalOvertimeSum = parsedEvents
    .filter(ev => ev.selected)
    .reduce((sum, ev) => sum + ev.overtimeHoursDecimal, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-white rounded-none sm:rounded-[2.5rem] max-w-5xl xl:max-w-6xl w-full h-full sm:h-auto sm:max-h-[92vh] flex flex-col border-0 sm:border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 z-10">
        
        {/* Cabeçalho */}
        <div className="shrink-0 px-6 sm:px-8 py-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 shrink-0">
              <Sparkles size={24} className="text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                  Leitura de Folha de Ponto com Inteligência Artificial
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider border border-purple-200">
                  Preenchimento Automático
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                Carregue o PNG da folha de ponto. A IA extrai nome, matrícula, horários, turno e todas as horas extras em lote.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-slate-200/80 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo Rolável */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 custom-scrollbar">
          
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs font-bold flex items-start gap-3 animate-in shake">
              <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {parsedEvents.length === 0 ? (
            <div className="space-y-6">

              {/* SELETOR DE COLABORADOR */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <User size={16} className="text-blue-600" />
                    <span>Colaborador da Folha de Ponto</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    Selecione ou deixe a IA identificar
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <select
                      value={selectedEmployeeId}
                      onChange={(e) => handleSelectEmployee(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                    >
                      <option value="">✨ Detectar Automaticamente pela IA no Documento</option>
                      {employees && employees.slice().sort((a, b) => a.name.localeCompare(b.name)).map(emp => (
                        <option key={emp.id || emp.registration || emp.name} value={emp.id || emp.registration || emp.name}>
                          {emp.name} • {emp.role || 'Colaborador'} {emp.registration ? `(Matr. ${emp.registration})` : ''} - {emp.sector || 'Produção'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Nome manual se não listado"
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 placeholder:font-normal"
                    />
                  </div>
                </div>

                {employeeName && (
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-700 font-bold">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>Colaborador: <strong>{employeeName}</strong> {role ? `(${role})` : ''} {registration ? `• Matrícula ${registration}` : ''}</span>
                  </div>
                )}
              </div>

              {/* ÁREA DE CARREGAMENTO / UPLOAD DA IMAGEM */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  imagePreview 
                    ? 'border-purple-400 bg-purple-50/20' 
                    : 'border-slate-300 hover:border-purple-500 hover:bg-slate-50/80'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {imagePreview ? (
                  <div className="space-y-4 max-w-xl w-full">
                    <div className="relative max-h-72 overflow-hidden rounded-2xl border border-purple-200 shadow-md mx-auto bg-slate-900/5">
                      <img 
                        src={imagePreview} 
                        alt="Cartão Ponto" 
                        className="w-full h-auto max-h-72 object-contain"
                      />
                      <div className="absolute top-2 right-2 bg-slate-900/80 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-lg backdrop-blur-xs">
                        PNG Carregado
                      </div>
                    </div>
                    <p className="text-xs font-black text-purple-700 uppercase">
                      Clique para trocar a imagem ou use o botão abaixo para iniciar a leitura
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-16 h-16 rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-200 shadow-xs">
                      <Upload size={28} />
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-tight">
                        Arraste ou clique para selecionar a Imagem PNG do Cartão de Ponto
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        Suporta qualquer colaborador (Auxiliar, Operador, Líder, etc.) via PNG, JPEG ou Ctrl + V.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Botões de Ação para Iniciar Leitura ou Limpar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                {imagePreview ? (
                  <button
                    type="button"
                    onClick={() => {
                      setImagePreview(null);
                      setSelectedFile(null);
                      setParsedEvents([]);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <RefreshCw size={14} className="text-slate-500" />
                    <span>Trocar / Limpar Imagem</span>
                  </button>
                ) : (
                  <div className="text-[11px] text-slate-400 font-semibold">
                    Envie a folha de ponto do auxiliar, operador ou supervisor
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleScanImage}
                  disabled={!imagePreview || isScanning}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-purple-600/25 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                >
                  {isScanning ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-amber-300" />
                      <span>{scanStep || 'Lendo com IA...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} className="text-amber-300" />
                      <span>Processar Folha de Ponto com IA</span>
                    </>
                  )}
                </button>
              </div>

              {/* Instruções do que será extraído */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
                <div className="flex items-center gap-2 font-black text-slate-800 uppercase text-[11px]">
                  <Info size={14} className="text-blue-600" />
                  <span>O que a Inteligência Artificial vai preencher automaticamente:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[11.5px]">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Check size={13} className="text-emerald-600 shrink-0" />
                    <span>Nome e Matrícula do Operador</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Check size={13} className="text-emerald-600 shrink-0" />
                    <span>Setor e Cargo cadastrados</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Check size={13} className="text-emerald-600 shrink-0" />
                    <span>Início e Término do expediente</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Check size={13} className="text-emerald-600 shrink-0" />
                    <span>Se é Sábado, Domingo ou Feriado</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Check size={13} className="text-emerald-600 shrink-0" />
                    <span>Período Integral vs Passando do Horário</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-purple-700 font-black">
                    <Sparkles size={13} className="text-amber-500 shrink-0" />
                    <span>Cálculo exato de Horas Extras e % HE</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-1">
                  Nota: Conforme solicitado, o campo de <strong>Motivo e Atividade Realizada</strong> ficará em branco para preenchimento do usuário.
                </p>
              </div>
            </div>
          ) : (
            /* REVISÃO EM LOTE DOS LANÇAMENTOS DETECTADOS PELA IA */
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* CARD DE IDENTIFICAÇÃO DO COLABORADOR */}
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                    {employeeName ? employeeName.charAt(0) : 'C'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-black text-slate-900 uppercase">
                        {employeeName}
                      </h4>
                      {registration && (
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-xs font-mono font-black border border-blue-200">
                          Matrícula: {registration}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      {role} • Setor: {sector} • Período: {period || '25/09/2026 a 24/10/2026'}
                    </p>

                    {/* SELETOR RÁPIDO PARA ATRIBUIR A QUALQUER COLABORADOR */}
                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider">
                        Atribuir a outro colaborador:
                      </span>
                      <select
                        value={selectedEmployeeId}
                        onChange={(e) => handleSelectEmployee(e.target.value)}
                        className="bg-white border border-blue-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs cursor-pointer"
                      >
                        <option value="">(Manter colaborador atual)</option>
                        {employees && employees.slice().sort((a, b) => a.name.localeCompare(b.name)).map(emp => (
                          <option key={emp.id || emp.registration || emp.name} value={emp.id || emp.registration || emp.name}>
                            {emp.name} • {emp.role || 'Colaborador'} {emp.registration ? `(Matr. ${emp.registration})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right flex-wrap">
                  <button
                    type="button"
                    onClick={resetScannerState}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Limpar leitura atual e escanear nova folha de ponto"
                  >
                    <RefreshCw size={13} className="text-slate-500" />
                    <span>Nova Leitura / Limpar</span>
                  </button>
                  <div className="bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Horas Extras Detectadas
                    </span>
                    <span className="text-lg font-black text-blue-700 font-mono">
                      {totalOvertimeSum.toFixed(2)}h
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold block">
                      {selectedCount} de {parsedEvents.length} dias selecionados
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setParsedEvents([]);
                      setImagePreview(null);
                      setSelectedFile(null);
                    }}
                    className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    title="Carregar outro cartão ponto"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
              </div>

              {/* BARRA DE PREENCHIMENTO RÁPIDO DO MOTIVO EM LOTE */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-4 rounded-2xl border border-blue-200 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-blue-600" />
                  <label className="text-xs font-black text-slate-900 uppercase tracking-tight">
                    Preencher Motivo / Atividade Realizada em Lote (Para todas as datas selecionadas):
                  </label>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={batchCommonReason}
                    onChange={(e) => setBatchCommonReason(e.target.value)}
                    placeholder="Ex: Atendimento de demanda extraordinária de produção / Acompanhamento de turno..."
                    className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={handleApplyBatchCommonReason}
                    disabled={!batchCommonReason.trim()}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    Aplicar a Todos os Dias
                  </button>
                </div>

                {/* Sugestões rápidas de motivos comuns */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1">Sugestões:</span>
                  {COMMON_REASONS.slice(0, 4).map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setBatchCommonReason(r)}
                      className="text-[10.5px] font-bold text-slate-600 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 px-2 py-0.5 rounded-lg cursor-pointer transition-colors"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* LISTAGEM DE DIAS E HORAS EXTRAS APROVEITADAS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-black uppercase text-slate-500 px-1">
                  <span>Horas Extras Identificadas no Cartão ({parsedEvents.length} dias)</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setParsedEvents(prev => prev.map(e => ({ ...e, selected: true })))}
                      className="text-blue-600 hover:underline cursor-pointer"
                    >
                      Marcar Todos
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setParsedEvents(prev => prev.map(e => ({ ...e, selected: false })))}
                      className="text-slate-500 hover:underline cursor-pointer"
                    >
                      Desmarcar Todos
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={handleAddManualEvent}
                      className="px-2.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      title="Adicionar mais um dia de hora extra manualmente"
                    >
                      <Plus size={12} /> Adicionar Dia
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {parsedEvents.map((item, idx) => {
                    const dateFormatted = item.date.split('-').reverse().join('/');
                    const isSundayOrHoliday = item.isSunday || item.isHoliday;

                    return (
                      <div 
                        key={item.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          item.selected 
                            ? 'bg-white border-blue-300 shadow-sm' 
                            : 'bg-slate-50/60 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                          
                          {/* Dados da data e horários */}
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => toggleSelectEvent(item.id)}
                              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer shrink-0"
                            />

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-black text-slate-900 font-mono">
                                  {dateFormatted}
                                </span>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                                  item.dayOfWeek === 'DOM' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {item.dayOfWeek}
                                </span>
                                {item.isHoliday && (
                                  <span className="text-[9px] font-black px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                                    {item.holidayName || 'Feriado'}
                                  </span>
                                )}
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                                  item.overtimeMode === 'integral'
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {item.overtimeMode === 'integral' ? 'Turno Integral (Sábado/Feriado)' : 'Passando do Horário'}
                                </span>
                              </div>

                              <div className="text-xs font-bold text-slate-600 mt-1 flex items-center gap-3 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Clock size={12} className="text-slate-400" />
                                  Expediente: <strong>{item.startTime} às {item.endTime}</strong>
                                </span>
                                <span>•</span>
                                <span className="text-blue-700 font-black">
                                  HE Calculada: {item.overtimeHoursFormatted} ({item.overtimeHoursDecimal}h)
                                </span>
                                <span>•</span>
                                <span className="text-amber-700 font-black">
                                  % HE: {item.overtimePercentage}%
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Campo de Motivo Obrigatório por Linha */}
                          <div className="flex-1 max-w-lg">
                            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                              <span>Motivo / Atividade Realizada neste dia *</span>
                              {!item.reason.trim() && item.selected && (
                                <span className="text-red-500 font-extrabold text-[9px] animate-pulse">
                                  Obrigatório preencher
                                </span>
                              )}
                            </label>
                            <input
                              type="text"
                              value={item.reason}
                              onChange={(e) => handleUpdateEventReason(item.id, e.target.value)}
                              placeholder="Descreva a atividade realizada neste dia..."
                              disabled={!item.selected}
                              className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-2xs ${
                                !item.reason.trim() && item.selected 
                                  ? 'border-amber-300 bg-amber-50/20' 
                                  : 'border-slate-200'
                              }`}
                            />
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Rodapé Fixo */}
        <div className="shrink-0 px-6 sm:px-8 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 bg-slate-50/95 backdrop-blur-xs">
          <div className="text-xs font-bold text-slate-600 text-center sm:text-left">
            {parsedEvents.length > 0 ? (
              <span>
                Total a Salvar:{' '}
                <strong className="text-blue-700 font-black">
                  {selectedCount} apontamento(s) individual(is)
                </strong>{' '}
                ({totalOvertimeSum.toFixed(2)}h extras acumuladas)
              </span>
            ) : (
              <span className="text-slate-400">Carregue a folha de ponto para apuração automática</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancelar
            </button>

            {parsedEvents.length > 0 && (
              <button
                type="button"
                onClick={handleConfirmSaveAll}
                disabled={isSaving || selectedCount === 0}
                className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Salvando {selectedCount} Apontamentos...</span>
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Salvar Apontamentos Separados no Banco ({selectedCount})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
