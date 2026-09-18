import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Wrench, Plus, Search, Filter, Mail, Copy, Check, Calendar, Clock, 
  AlertTriangle, CheckCircle2, ChevronRight, Download, Eye, Trash2, Edit2, 
  FileText, ExternalLink, ShieldCheck, Camera, HelpCircle, ArrowLeft,
  MessageSquare, User, Building2, MapPin, Activity, Flame, Send
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  MaintenanceRequest, 
  MaintenanceEquipmentCondition, 
  MaintenanceProductionImpact, 
  MaintenanceRequestStatus,
  SystemUser, 
  Employee 
} from '../types';
import { copyRichAndPlainText, downloadOutlookEml } from '../utils/outlookEml';
import ConfirmDialog from './ConfirmDialog';

interface MaintenanceRequestsManagerProps {
  loggedUser: SystemUser | null;
  employees?: Employee[];
  isReadOnly?: boolean;
  onBlockedAction?: (title?: string, message?: string) => void;
  onBackToMaintenanceOverview?: () => void;
  initialCreateOpen?: boolean;
}

const SECTORS_LIST = [
  'Extrusão',
  'Corte de Fita',
  'Reciclagem',
  'Manutenção',
  'Expedição',
  'Qualidade',
  'Administração / Geral',
  'Utilidades / Caldeira / Compressor',
  'Outro'
];

const EQUIPMENT_CONDITIONS: { value: MaintenanceEquipmentCondition; label: string; desc: string; color: string }[] = [
  { 
    value: 'Operando Normalmente', 
    label: 'Operando Normalmente', 
    desc: 'Sem perda de capacidade atual, intervenção preventiva ou melhoria', 
    color: 'border-emerald-500 text-emerald-700 bg-emerald-50' 
  },
  { 
    value: 'Operando com Restrições / Ruído', 
    label: 'Operando c/ Restrições / Ruído', 
    desc: 'Velocidade reduzida, aquecimento, vibração ou risco iminente de quebra', 
    color: 'border-amber-500 text-amber-700 bg-amber-50' 
  },
  { 
    value: 'Parado / Inoperante', 
    label: 'Parado / Inoperante', 
    desc: 'Equipamento totalmente inoperante, impedindo operação na linha', 
    color: 'border-red-500 text-red-700 bg-red-50' 
  },
];

const PRODUCTION_IMPACTS: { value: MaintenanceProductionImpact; label: string; desc: string; badge: string }[] = [
  { 
    value: 'Nenhum', 
    label: 'Nenhum Impacto', 
    desc: 'Manutenção predial, estética ou equipamento reserva', 
    badge: 'bg-slate-100 text-slate-700 border-slate-200' 
  },
  { 
    value: 'Baixo (Não afeta meta)', 
    label: 'Baixo (Não afeta meta)', 
    desc: 'Intervenção simples sem reflexo imediato no volume de produção', 
    badge: 'bg-blue-100 text-blue-800 border-blue-200' 
  },
  { 
    value: 'Médio (Risco de parada/redução)', 
    label: 'Médio (Risco de parada)', 
    desc: 'Pode acarretar parada se não programado nos próximos dias', 
    badge: 'bg-amber-100 text-amber-800 border-amber-200' 
  },
  { 
    value: 'Crítico (Linha/Máquina Parada)', 
    label: 'Crítico (Máquina Parada)', 
    desc: 'Parada total ou perda severa da meta de produção atual', 
    badge: 'bg-red-100 text-red-800 border-red-200 font-black animate-pulse' 
  },
];

const STATUS_CONFIG: Record<MaintenanceRequestStatus, { label: string; color: string; bg: string; border: string }> = {
  'Pendente': { label: 'Pendente', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  'Em Análise': { label: 'Em Análise', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  'Programado': { label: 'Programado', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  'Em Execução': { label: 'Em Execução', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  'Concluído': { label: 'Concluído', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  'Cancelado': { label: 'Cancelado', color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-300' }
};

export const MaintenanceRequestsManager: React.FC<MaintenanceRequestsManagerProps> = ({
  loggedUser,
  employees = [],
  isReadOnly = false,
  onBlockedAction,
  onBackToMaintenanceOverview,
  initialCreateOpen = false
}) => {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals and UI state
  const [isFormModalOpen, setIsFormModalOpen] = useState(initialCreateOpen);
  const [editingRequest, setEditingRequest] = useState<MaintenanceRequest | null>(null);
  const [selectedRequestForDetail, setSelectedRequestForDetail] = useState<MaintenanceRequest | null>(null);
  const [isOutlookModalOpen, setIsOutlookModalOpen] = useState(false);
  const [outlookTargetRequest, setOutlookTargetRequest] = useState<MaintenanceRequest | null>(null);
  const [justCopied, setJustCopied] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [impactFilter, setImpactFilter] = useState('Todos');

  // Confirmation dialog
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form Fields
  const [formSector, setFormSector] = useState(SECTORS_LIST[0]);
  const [formEquipment, setFormEquipment] = useState('');
  const [formProblemDescription, setFormProblemDescription] = useState('');
  const [formEquipmentCondition, setFormEquipmentCondition] = useState<MaintenanceEquipmentCondition>('Operando com Restrições / Ruído');
  const [formProductionImpact, setFormProductionImpact] = useState<MaintenanceProductionImpact>('Médio (Risco de parada/redução)');
  const [formAdditionalInfo, setFormAdditionalInfo] = useState('');
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [formRequesterName, setFormRequesterName] = useState(loggedUser?.name || '');
  const [formRequesterRole, setFormRequesterRole] = useState(loggedUser?.role || '');
  const [formRequesterEmail, setFormRequesterEmail] = useState('');
  const [formContactPhone, setFormContactPhone] = useState('');
  const [formPriority, setFormPriority] = useState<'Baixa' | 'Média' | 'Alta' | 'Urgente'>('Alta');
  const [formStatus, setFormStatus] = useState<MaintenanceRequestStatus>('Pendente');
  const [formScheduledDate, setFormScheduledDate] = useState('');
  const [formTechnicianAssigned, setFormTechnicianAssigned] = useState('');
  const [formMaintenanceNotes, setFormMaintenanceNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Listen to Firestore collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'maintenance_requests'), (snapshot) => {
      const list: MaintenanceRequest[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as MaintenanceRequest);
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setRequests(list);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao buscar solicitações de manutenção:', error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Update requester info on loggedUser change
  useEffect(() => {
    if (loggedUser && !editingRequest) {
      if (!formRequesterName) setFormRequesterName(loggedUser.name);
      if (!formRequesterRole) setFormRequesterRole(loggedUser.role);
    }
  }, [loggedUser, editingRequest]);

  // Handle open create modal
  const handleOpenCreate = () => {
    if (isReadOnly) {
      onBlockedAction?.('Ação Bloqueada', 'Modo de leitura ativo.');
      return;
    }
    setEditingRequest(null);
    setFormSector(SECTORS_LIST[0]);
    setFormEquipment('');
    setFormProblemDescription('');
    setFormEquipmentCondition('Operando com Restrições / Ruído');
    setFormProductionImpact('Médio (Risco de parada/redução)');
    setFormAdditionalInfo('');
    setFormPhotos([]);
    setFormRequesterName(loggedUser?.name || '');
    setFormRequesterRole(loggedUser?.role || '');
    setFormRequesterEmail('');
    setFormContactPhone('');
    setFormPriority('Alta');
    setFormStatus('Pendente');
    setFormScheduledDate('');
    setFormTechnicianAssigned('');
    setFormMaintenanceNotes('');
    setIsFormModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (req: MaintenanceRequest) => {
    if (isReadOnly) {
      onBlockedAction?.('Ação Bloqueada', 'Modo de leitura ativo.');
      return;
    }
    setEditingRequest(req);
    setFormSector(req.sector);
    setFormEquipment(req.equipmentOrLocation);
    setFormProblemDescription(req.problemDescription);
    setFormEquipmentCondition(req.equipmentCondition);
    setFormProductionImpact(req.productionImpact);
    setFormAdditionalInfo(req.additionalInfo || '');
    setFormPhotos(req.photos || []);
    setFormRequesterName(req.requesterName);
    setFormRequesterRole(req.requesterRole || '');
    setFormRequesterEmail(req.requesterEmail || '');
    setFormContactPhone(req.contactPhone || '');
    setFormPriority(req.priority || 'Alta');
    setFormStatus(req.status);
    setFormScheduledDate(req.scheduledDate || '');
    setFormTechnicianAssigned(req.technicianAssigned || '');
    setFormMaintenanceNotes(req.maintenanceNotes || '');
    setIsFormModalOpen(true);
  };

  // Photo upload handling (base64 compressed)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecione apenas arquivos de imagem.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1000;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          setFormPhotos(prev => [...prev.slice(-3), compressed]); // Max 4 photos
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Submit create or edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEquipment.trim() || !formProblemDescription.trim() || !formRequesterName.trim()) {
      alert('Preencha os campos obrigatórios: Equipamento/Local, Descrição do Problema e Solicitante.');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const currentYear = new Date().getFullYear();
      const requestCount = requests.length + 1;
      const autoNum = `SOL-MAN-${currentYear}-${String(requestCount).padStart(3, '0')}`;

      const payload: Partial<MaintenanceRequest> = {
        sector: formSector,
        equipmentOrLocation: formEquipment.trim(),
        problemDescription: formProblemDescription.trim(),
        equipmentCondition: formEquipmentCondition,
        productionImpact: formProductionImpact,
        additionalInfo: formAdditionalInfo.trim(),
        photos: formPhotos,
        requesterName: formRequesterName.trim(),
        requesterRole: formRequesterRole.trim(),
        requesterEmail: formRequesterEmail.trim(),
        contactPhone: formContactPhone.trim(),
        priority: formPriority,
        status: formStatus,
        scheduledDate: formScheduledDate,
        technicianAssigned: formTechnicianAssigned.trim(),
        maintenanceNotes: formMaintenanceNotes.trim(),
        updatedAt: now,
        userId: loggedUser?.id || 'anonymous'
      };

      if (editingRequest) {
        if (formStatus === 'Concluído' && editingRequest.status !== 'Concluído') {
          payload.completedAt = now;
        }
        await updateDoc(doc(db, 'maintenance_requests', editingRequest.id), payload);
      } else {
        payload.requestNumber = autoNum;
        payload.createdAt = now;
        const ref = await addDoc(collection(db, 'maintenance_requests'), payload);
        
        // Auto-open Outlook dispatch for the newly created request
        const createdReq: MaintenanceRequest = {
          id: ref.id,
          requestNumber: autoNum,
          createdAt: now,
          ...(payload as any)
        };
        setOutlookTargetRequest(createdReq);
        setIsOutlookModalOpen(true);
      }

      setIsFormModalOpen(false);
      setEditingRequest(null);
    } catch (error) {
      console.error('Erro ao salvar solicitação de manutenção:', error);
      alert('Erro ao salvar a solicitação. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete request
  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteDoc(doc(db, 'maintenance_requests', confirmDeleteId));
      setConfirmDeleteId(null);
    } catch (error) {
      console.error('Erro ao excluir solicitação:', error);
      alert('Erro ao excluir a solicitação.');
    }
  };

  // Quick Status Change
  const handleQuickStatusChange = async (req: MaintenanceRequest, newStatus: MaintenanceRequestStatus) => {
    if (isReadOnly) {
      onBlockedAction?.('Ação Bloqueada', 'Modo de leitura ativo.');
      return;
    }
    try {
      const updateData: Partial<MaintenanceRequest> = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      };
      if (newStatus === 'Concluído') {
        updateData.completedAt = new Date().toISOString();
      }
      await updateDoc(doc(db, 'maintenance_requests', req.id), updateData);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchSearch = 
        (r.requestNumber || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.equipmentOrLocation || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.problemDescription || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.requesterName || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.sector || '').toLowerCase().includes(search.toLowerCase());

      const matchSector = sectorFilter === 'Todos' || r.sector === sectorFilter;
      const matchStatus = statusFilter === 'Todos' || r.status === statusFilter;
      const matchImpact = impactFilter === 'Todos' || r.productionImpact === impactFilter;

      return matchSearch && matchSector && matchStatus && matchImpact;
    });
  }, [requests, search, sectorFilter, statusFilter, impactFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = requests.length;
    const pendentes = requests.filter(r => r.status === 'Pendente').length;
    const emAnalise = requests.filter(r => r.status === 'Em Análise').length;
    const programadas = requests.filter(r => r.status === 'Programado').length;
    const emExecucao = requests.filter(r => r.status === 'Em Execução').length;
    const concluidas = requests.filter(r => r.status === 'Concluído').length;
    const criticos = requests.filter(r => r.productionImpact.includes('Crítico') && r.status !== 'Concluído').length;
    return { total, pendentes, emAnalise, programadas, emExecucao, concluidas, criticos };
  }, [requests]);

  // Generate Email Text & HTML for Outlook
  const buildOutlookContent = (req: MaintenanceRequest) => {
    const dateFormatted = req.createdAt ? new Date(req.createdAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
    const subject = `[SOLICITAÇÃO DE MANUTENÇÃO] - ${req.sector.toUpperCase()} - ${req.equipmentOrLocation.toUpperCase()}${req.requestNumber ? ` (${req.requestNumber})` : ''}`;

    const plainText = `NOVA SOLICITAÇÃO DE SERVIÇO DE MANUTENÇÃO
${req.requestNumber ? `Número: ${req.requestNumber}\n` : ''}Data/Hora: ${dateFormatted}
Prioridade: ${req.priority || 'Alta'}

INFORMAÇÕES OBRIGATÓRIAS:
• Setor solicitante: ${req.sector}
• Equipamento ou local: ${req.equipmentOrLocation}
• Descrição do problema: ${req.problemDescription}
• Condição atual do equipamento: ${req.equipmentCondition}
• Impacto na produção ou operação: ${req.productionImpact}
${req.additionalInfo ? `• Informações adicionais: ${req.additionalInfo}\n` : ''}${req.photos && req.photos.length > 0 ? `• Fotos anexadas: ${req.photos.length} imagem(ns) incluída(s) no corpo do e-mail.\n` : ''}
DADOS DO SOLICITANTE:
• Solicitante: ${req.requesterName}${req.requesterRole ? ` (${req.requesterRole})` : ''}
${req.contactPhone ? `• Ramal / Telefone: ${req.contactPhone}\n` : ''}${req.requesterEmail ? `• E-mail: ${req.requesterEmail}\n` : ''}
---
Mensagem gerada pelo Sistema de Gestão e Controle de Produção`;

    const htmlBody = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="410" style="width: 410px; max-width: 410px; font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 13px; color: #1e293b; line-height: 1.45; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; border-collapse: separate; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
  <!-- Cabeçalho Claro e Elegante -->
  <tr>
    <td style="background-color: #f0f9ff; border-bottom: 2px solid #38bdf8; padding: 10px 14px; border-radius: 8px 8px 0 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="vertical-align: middle;">
            <h2 style="margin: 0; font-size: 15px; color: #0369a1; font-weight: 800; letter-spacing: -0.2px; text-transform: uppercase;">
              SOLICITAÇÃO DE MANUTENÇÃO
            </h2>
          </td>
          ${req.requestNumber ? `
          <td align="right" style="vertical-align: middle;">
            <span style="display: inline-block; font-size: 12px; color: #0284c7; font-weight: 800; background-color: #ffffff; padding: 3px 8px; border-radius: 4px; border: 1px solid #7dd3fc; white-space: nowrap;">
              ${req.requestNumber}
            </span>
          </td>` : ''}
        </tr>
      </table>
    </td>
  </tr>

  <!-- Corpo Principal / Tabela com Colunas Compactas para Enquadrar no Outlook -->
  <tr>
    <td style="padding: 12px 14px; background-color: #ffffff;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; width: 100%; border: 1px solid #e2e8f0; font-size: 13px;">
        <tr>
          <td width="105" style="width: 105px; min-width: 95px; max-width: 110px; padding: 7px 8px; background-color: #f8fafc; border: 1px solid #e2e8f0; font-weight: bold; color: #475569; font-size: 12px; white-space: nowrap; vertical-align: top;">
            • Setor:
          </td>
          <td style="padding: 7px 10px; background-color: #ffffff; border: 1px solid #e2e8f0; font-weight: bold; color: #0f172a; font-size: 13.5px;">
            ${req.sector}
          </td>
        </tr>
        <tr>
          <td width="105" style="width: 105px; min-width: 95px; max-width: 110px; padding: 7px 8px; background-color: #f8fafc; border: 1px solid #e2e8f0; font-weight: bold; color: #475569; font-size: 12px; white-space: nowrap; vertical-align: top;">
            • Equipamento:
          </td>
          <td style="padding: 7px 10px; background-color: #f0fdf4; border: 1px solid #e2e8f0; font-weight: bold; color: #15803d; font-size: 14px;">
            ${req.equipmentOrLocation}
          </td>
        </tr>
        <tr>
          <td width="105" style="width: 105px; min-width: 95px; max-width: 110px; padding: 7px 8px; background-color: #f8fafc; border: 1px solid #e2e8f0; font-weight: bold; color: #475569; font-size: 12px; white-space: nowrap; vertical-align: top;">
            • Descrição:
          </td>
          <td style="padding: 8px 10px; background-color: #ffffff; border: 1px solid #e2e8f0; color: #0f172a; font-size: 13px; line-height: 1.45; white-space: pre-wrap;">
            ${req.problemDescription}
          </td>
        </tr>
        <tr>
          <td width="105" style="width: 105px; min-width: 95px; max-width: 110px; padding: 7px 8px; background-color: #f8fafc; border: 1px solid #e2e8f0; font-weight: bold; color: #475569; font-size: 12px; white-space: nowrap; vertical-align: middle;">
            • Condição:
          </td>
          <td style="padding: 7px 10px; background-color: #ffffff; border: 1px solid #e2e8f0;">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; ${
              req.equipmentCondition.includes('Parado') 
                ? 'background-color: #fef2f2; color: #991b1b; border: 1px solid #fecaca;' 
                : req.equipmentCondition.includes('Restrições') 
                  ? 'background-color: #fffbeb; color: #92400e; border: 1px solid #fde68a;' 
                  : 'background-color: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0;'
            }">
              ${req.equipmentCondition}
            </span>
          </td>
        </tr>
        <tr>
          <td width="105" style="width: 105px; min-width: 95px; max-width: 110px; padding: 7px 8px; background-color: #f8fafc; border: 1px solid #e2e8f0; font-weight: bold; color: #475569; font-size: 12px; white-space: nowrap; vertical-align: middle;">
            • Impacto:
          </td>
          <td style="padding: 7px 10px; background-color: #ffffff; border: 1px solid #e2e8f0;">
            <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; ${
              req.productionImpact.includes('Crítico')
                ? 'background-color: #fef2f2; color: #991b1b; border: 1px solid #fca5a5;'
                : req.productionImpact.includes('Médio')
                  ? 'background-color: #fffbeb; color: #b45309; border: 1px solid #fde68a;'
                  : req.productionImpact.includes('Baixo')
                    ? 'background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;'
                    : 'background-color: #f8fafc; color: #475569; border: 1px solid #e2e8f0;'
            }">
              ${req.productionImpact}
            </span>
          </td>
        </tr>
        <tr>
          <td width="105" style="width: 105px; min-width: 95px; max-width: 110px; padding: 7px 8px; background-color: #f8fafc; border: 1px solid #e2e8f0; font-weight: bold; color: #475569; font-size: 12px; white-space: nowrap; vertical-align: top;">
            • Fotos / Info:
          </td>
          <td style="padding: 8px 10px; background-color: #ffffff; border: 1px solid #e2e8f0; color: #334155; font-size: 13px; line-height: 1.4;">
            ${req.additionalInfo ? `<div style="margin-bottom: 6px;">${req.additionalInfo}</div>` : '<div style="color: #64748b; font-style: italic; margin-bottom: 4px;">Nenhuma observação adicional.</div>'}
            ${req.photos && req.photos.length > 0 ? `
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #cbd5e1;">
                <div style="font-size: 11.5px; font-weight: bold; color: #0284c7; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 6px;">
                  📷 ${req.photos.length === 1 ? 'Foto Anexada da Ocorrência:' : `Fotos Anexadas (${req.photos.length}):`}
                </div>
                ${req.photos.map((photo, idx) => `
                  <div style="margin-bottom: 8px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px;">
                    <div style="font-size: 10.5px; font-weight: bold; color: #475569; margin-bottom: 4px;">
                      Evidência #${idx + 1}:
                    </div>
                    <img src="${photo}" alt="Evidência #${idx + 1} - ${req.equipmentOrLocation}" width="360" style="max-width: 100%; width: 100%; height: auto; display: block; border-radius: 4px; border: 1px solid #cbd5e1;" />
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </td>
        </tr>
      </table>

      <!-- Bloco de Responsável e Contatos Lado a Lado -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 10px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 12px; color: #334155;">
        <tr>
          <td style="padding: 8px 10px;">
            <div style="font-size: 12.5px; color: #0f172a;">
              <strong>Solicitado por:</strong> ${req.requesterName}${req.requesterRole ? ` (${req.requesterRole})` : ''} &nbsp;•&nbsp; <span style="font-size: 11.5px; color: #64748b;"><strong>Data/Hora:</strong> ${dateFormatted}</span>
            </div>
            ${(req.contactPhone || req.requesterEmail) ? `
            <div style="font-size: 11.5px; color: #64748b; margin-top: 3px;">
              ${req.contactPhone ? `<span><strong>Contato:</strong> ${req.contactPhone}</span>` : ''}
              ${req.contactPhone && req.requesterEmail ? ' &nbsp;•&nbsp; ' : ''}
              ${req.requesterEmail ? `<span><strong>E-mail:</strong> ${req.requesterEmail}</span>` : ''}
            </div>` : ''}
          </td>
        </tr>
      </table>

      <div style="margin-top: 8px; font-size: 11px; color: #64748b; text-align: center; line-height: 1.35;">
        Fluxo oficial para organização de demandas, priorização e rastreabilidade da manutenção.
        <div style="margin-top: 2px; font-size: 11px; font-weight: bold; color: #0369a1; letter-spacing: 0.2px;">
          Sistema de gestão de produção
        </div>
      </div>
    </td>
  </tr>
</table>`;

    return { subject, plainText, htmlBody };
  };

  // Share via Outlook (Copy Rich Text or Download EML)
  const handleCopyForOutlook = async (req: MaintenanceRequest) => {
    const { plainText, htmlBody } = buildOutlookContent(req);
    const success = await copyRichAndPlainText(plainText, htmlBody);
    if (success) {
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 3000);
    } else {
      alert('Conteúdo copiado em texto simples.');
    }
  };

  const handleDownloadEml = (req: MaintenanceRequest) => {
    const { subject, htmlBody } = buildOutlookContent(req);
    const fileName = `Solicitacao_Manutencao_${(req.requestNumber || 'Nova').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    downloadOutlookEml(subject, htmlBody, fileName);
  };

  const handleOpenOutlookWebOrApp = (req: MaintenanceRequest) => {
    const { subject, plainText } = buildOutlookContent(req);
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainText)}`;
    window.location.href = mailto;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Banner & Header */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {onBackToMaintenanceOverview && (
                <button
                  type="button"
                  onClick={onBackToMaintenanceOverview}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="Voltar para Visão Geral de Manutenção"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-wider border border-blue-500/30">
                <ShieldCheck size={14} />
                <span>Novo Fluxo Oficial de Solicitação</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <Wrench className="text-blue-400 w-7 h-7 sm:w-8 sm:h-8" />
              Solicitações de Manutenção
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Fluxo oficial para solicitação, avaliação e programação de serviços. Garante rastreabilidade, priorização assertiva e controle das demandas com integração direta ao Outlook.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider px-6 py-4 rounded-2xl flex items-center gap-2.5 shadow-lg shadow-blue-500/30 transition-all cursor-pointer border border-blue-400 active:scale-95"
            >
              <Plus size={18} />
              <span>Nova Solicitação</span>
            </button>
          </div>
        </div>

        {/* Decorative Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Demandas</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">{stats.total}</span>
            <FileText size={16} className="text-slate-400" />
          </div>
        </div>

        <div className="bg-amber-50/60 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-amber-100 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Pendentes</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-amber-700">{stats.pendentes}</span>
            <Clock size={16} className="text-amber-500" />
          </div>
        </div>

        <div className="bg-blue-50/60 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-blue-100 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">Em Análise</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-blue-700">{stats.emAnalise}</span>
            <Eye size={16} className="text-blue-500" />
          </div>
        </div>

        <div className="bg-indigo-50/60 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-indigo-100 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">Programados</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-indigo-700">{stats.programadas}</span>
            <Calendar size={16} className="text-indigo-500" />
          </div>
        </div>

        <div className="bg-emerald-50/60 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-emerald-100 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Concluídos</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-emerald-700">{stats.concluidas}</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
        </div>

        <div className="bg-red-50/60 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-red-100 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-red-700">Impacto Crítico</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-red-700">{stats.criticos}</span>
            <Flame size={16} className="text-red-500" />
          </div>
        </div>
      </div>

      {/* Guidelines Box: Diretrizes do Novo Fluxo */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 rounded-3xl p-5 sm:p-6 text-white border border-blue-700/40 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0 border border-blue-400/30">
              <Mail size={20} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">Diretriz de Solicitação por E-mail (Outlook)</h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                Todas as solicitações de manutenção devem conter: <strong>1. Setor solicitante</strong>; <strong>2. Equipamento ou local</strong>; <strong>3. Descrição do problema</strong>; <strong>4. Condição atual do equipamento</strong>; <strong>5. Impacto na produção</strong>; <strong>6. Fotos ou informações adicionais</strong>. Use o botão <em>"Compartilhar no Outlook"</em> em qualquer solicitação para abrir ou colar o e-mail oficial formatado.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="shrink-0 px-4 py-2.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow cursor-pointer active:scale-95"
          >
            Preencher Solicitação
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[240px] relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por equipamento, setor, problema, solicitante ou nº..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-black text-slate-400">Setor:</span>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="bg-transparent text-slate-700 font-bold outline-none cursor-pointer"
            >
              <option value="Todos">Todos os Setores</option>
              {SECTORS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-black text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-700 font-bold outline-none cursor-pointer"
            >
              <option value="Todos">Todos os Status</option>
              <option value="Pendente">Pendente</option>
              <option value="Em Análise">Em Análise</option>
              <option value="Programado">Programado</option>
              <option value="Em Execução">Em Execução</option>
              <option value="Concluído">Concluído</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-black text-slate-400">Impacto:</span>
            <select
              value={impactFilter}
              onChange={(e) => setImpactFilter(e.target.value)}
              className="bg-transparent text-slate-700 font-bold outline-none cursor-pointer"
            >
              <option value="Todos">Todos os Impactos</option>
              {PRODUCTION_IMPACTS.map(imp => <option key={imp.value} value={imp.value}>{imp.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-3">
            <div className="inline-block animate-spin text-blue-600">
              <Wrench size={32} />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando solicitações de manutenção...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Wrench size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-800 uppercase">Nenhuma solicitação encontrada</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {search || sectorFilter !== 'Todos' || statusFilter !== 'Todos' || impactFilter !== 'Todos'
                  ? 'Nenhuma solicitação corresponde aos filtros selecionados. Tente ajustar os filtros.'
                  : 'Nenhuma solicitação de manutenção cadastrada ainda. Clique no botão acima para criar a primeira.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow transition-all cursor-pointer"
            >
              <Plus size={16} /> Cadastrar Nova Solicitação
            </button>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const statusStyle = STATUS_CONFIG[req.status] || STATUS_CONFIG['Pendente'];
            const dateStr = req.createdAt ? new Date(req.createdAt).toLocaleDateString('pt-BR') : '-';
            const timeStr = req.createdAt ? new Date(req.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

            return (
              <div
                key={req.id}
                className="bg-white rounded-3xl border border-slate-100 shadow-xs hover:shadow-md transition-all p-5 sm:p-6 space-y-4 group"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Title & Request Identification */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {req.requestNumber && (
                        <span className="px-2.5 py-0.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider rounded-lg">
                          {req.requestNumber}
                        </span>
                      )}
                      <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black uppercase tracking-wider rounded-lg">
                        {req.sector}
                      </span>
                      <span className={`px-2.5 py-0.5 ${statusStyle.bg} ${statusStyle.color} border ${statusStyle.border} text-[10px] font-black uppercase tracking-wider rounded-lg`}>
                        {statusStyle.label}
                      </span>
                      {req.productionImpact.includes('Crítico') && (
                        <span className="px-2.5 py-0.5 bg-red-100 text-red-800 border border-red-200 text-[10px] font-black uppercase tracking-wider rounded-lg animate-pulse">
                          Crítico: Máquina Parada
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <Wrench size={18} className="text-blue-600 shrink-0" />
                      <span>{req.equipmentOrLocation}</span>
                    </h3>
                  </div>

                  {/* Actions & Outlook Dispatch Button */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOutlookTargetRequest(req);
                        setIsOutlookModalOpen(true);
                      }}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                      title="Compartilhar informações da solicitação via e-mail Outlook"
                    >
                      <Mail size={14} className="text-indigo-600" />
                      <span>Compartilhar Outlook</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedRequestForDetail(req)}
                      className="p-2 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors cursor-pointer"
                      title="Ver Detalhes Completos"
                    >
                      <Eye size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(req)}
                      className="p-2 hover:bg-slate-100 text-blue-600 rounded-xl transition-colors cursor-pointer"
                      title="Editar Solicitação"
                    >
                      <Edit2 size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(req.id)}
                      className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-colors cursor-pointer"
                      title="Excluir Solicitação"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Main Content Details Grid (The 6 Guidelines Items) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="space-y-1 bg-slate-50 p-3 rounded-2xl">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Condição Atual:</span>
                    <span className="font-bold text-slate-800">{req.equipmentCondition}</span>
                  </div>

                  <div className="space-y-1 bg-slate-50 p-3 rounded-2xl">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Impacto na Produção:</span>
                    <span className="font-bold text-slate-800">{req.productionImpact}</span>
                  </div>

                  <div className="space-y-1 bg-slate-50 p-3 rounded-2xl">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Solicitante:</span>
                    <span className="font-bold text-slate-800">{req.requesterName} {req.requesterRole ? `(${req.requesterRole})` : ''}</span>
                  </div>

                  <div className="space-y-1 bg-slate-50 p-3 rounded-2xl">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Data de Abertura:</span>
                    <span className="font-bold text-slate-800">{dateStr} {timeStr}</span>
                  </div>
                </div>

                {/* Problem Description Snippet */}
                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Descrição do Problema:</span>
                  <p className="text-xs text-slate-700 font-medium whitespace-pre-wrap leading-relaxed line-clamp-2">
                    {req.problemDescription}
                  </p>
                </div>

                {/* Footer Controls: Quick Status Selector & Photos count */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Alterar Status:</span>
                    <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-[11px] font-bold">
                      {(['Pendente', 'Em Análise', 'Programado', 'Em Execução', 'Concluído'] as MaintenanceRequestStatus[]).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleQuickStatusChange(req, st)}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            req.status === st 
                              ? 'bg-white text-slate-900 shadow-xs font-black' 
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {req.photos && req.photos.length > 0 && (
                    <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold">
                      <Camera size={14} className="text-blue-500" />
                      <span>{req.photos.length} foto(s) anexada(s)</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Create or Edit Maintenance Request */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="p-5 sm:p-6 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Wrench size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900">
                    {editingRequest ? 'Editar Solicitação de Manutenção' : 'Nova Solicitação de Manutenção'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Preencha as 6 diretrizes obrigatórias definidas pela diretoria de manutenção
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Directive 1 & 2: Setor e Equipamento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <Building2 size={12} className="text-blue-600" />
                    <span>1. Setor Solicitante *</span>
                  </label>
                  <select
                    value={formSector}
                    onChange={(e) => setFormSector(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                  >
                    {SECTORS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <MapPin size={12} className="text-blue-600" />
                    <span>2. Equipamento ou Local *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Extrusora 02, Cortadeira 01, Compressor Principal..."
                    value={formEquipment}
                    onChange={(e) => setFormEquipment(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Directive 3: Descrição do problema */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <FileText size={12} className="text-blue-600" />
                  <span>3. Descrição do Problema *</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Descreva detalhadamente o sintoma, barulho, vazamento, mensagem de erro ou problema observado..."
                  value={formProblemDescription}
                  onChange={(e) => setFormProblemDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none resize-y"
                />
              </div>

              {/* Directive 4: Condição Atual do Equipamento */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Activity size={12} className="text-blue-600" />
                  <span>4. Condição Atual do Equipamento *</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {EQUIPMENT_CONDITIONS.map((cond) => {
                    const isSelected = formEquipmentCondition === cond.value;
                    return (
                      <div
                        key={cond.value}
                        onClick={() => setFormEquipmentCondition(cond.value)}
                        className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                          isSelected ? `${cond.color} shadow-xs font-black` : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-xs font-black">{cond.label}</span>
                        <span className="text-[10px] opacity-80 leading-tight">{cond.desc}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Directive 5: Impacto na produção ou operação */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Flame size={12} className="text-blue-600" />
                  <span>5. Impacto na Produção ou Operação *</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {PRODUCTION_IMPACTS.map((imp) => {
                    const isSelected = formProductionImpact === imp.value;
                    return (
                      <div
                        key={imp.value}
                        onClick={() => setFormProductionImpact(imp.value)}
                        className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                          isSelected ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <span className="text-xs font-black">{imp.label}</span>
                        <span className="text-[10px] opacity-80 leading-tight">{imp.desc}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Directive 6: Fotos ou informações adicionais */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Camera size={12} className="text-blue-600" />
                    <span>6. Fotos ou Informações Adicionais (Quando Aplicável)</span>
                  </span>
                  <span className="text-slate-400 font-medium">Até 4 fotos</span>
                </label>
                
                <textarea
                  rows={2}
                  placeholder="Informações adicionais de acesso, histórico, peças sugeridas ou horários recomendados para intervenção..."
                  value={formAdditionalInfo}
                  onChange={(e) => setFormAdditionalInfo(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none resize-y"
                />

                {/* Photos List & Upload Button */}
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {formPhotos.map((photo, index) => (
                    <div key={index} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 group">
                      <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormPhotos(prev => prev.filter((_, i) => i !== index))}
                        className="absolute inset-0 bg-red-600/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-black"
                      >
                        Remover
                      </button>
                    </div>
                  ))}

                  {formPhotos.length < 4 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 text-slate-400 hover:text-blue-600 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-[10px] font-black uppercase"
                    >
                      <Camera size={18} />
                      <span>Anexar</span>
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
              </div>

              {/* Solicitante e Contatos */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Identificação do Solicitante
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nome *</label>
                    <input
                      type="text"
                      required
                      value={formRequesterName}
                      onChange={(e) => setFormRequesterName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Cargo / Função</label>
                    <input
                      type="text"
                      placeholder="Ex: Operador Líder, Supervisor..."
                      value={formRequesterRole}
                      onChange={(e) => setFormRequesterRole(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Ramal ou Telefone</label>
                    <input
                      type="text"
                      placeholder="Ex: Ramal 204 ou (11) 9..."
                      value={formContactPhone}
                      onChange={(e) => setFormContactPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Status e Programação (Gestão Interna) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Prioridade</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Em Análise">Em Análise</option>
                    <option value="Programado">Programado</option>
                    <option value="Em Execução">Em Execução</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Data Programada</label>
                  <input
                    type="date"
                    value={formScheduledDate}
                    onChange={(e) => setFormScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                  >
                  </input>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Check size={16} />
                  <span>{isSubmitting ? 'Salvando...' : editingRequest ? 'Atualizar Solicitação' : 'Cadastrar e Compartilhar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Outlook Integration & Dispatch */}
      {isOutlookModalOpen && outlookTargetRequest && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="p-5 sm:p-6 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Mail size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900">Compartilhar via Outlook</h2>
                  <p className="text-xs text-slate-500">
                    Encaminhe a solicitação por e-mail com layout claro e padronizado
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOutlookModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-blue-600" />
                  E-mail estruturado com as 6 diretrizes do novo fluxo (Cores Claras)
                </p>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Você pode baixar o arquivo de rascunho (.eml) com as fotos e evidências já incorporadas no corpo da mensagem, copiar a tabela ou abrir diretamente no Outlook.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleCopyForOutlook(outlookTargetRequest)}
                  className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center ${
                    justCopied 
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800' 
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  {justCopied ? <Check size={20} className="text-emerald-600" /> : <Copy size={20} className="text-blue-600" />}
                  <span className="text-xs font-black uppercase">
                    {justCopied ? 'Copiado c/ Sucesso!' : 'Copiar Texto / Tabela'}
                  </span>
                  <span className="text-[10px] text-slate-400">Cole com Ctrl+V no Outlook</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadEml(outlookTargetRequest)}
                  className="p-4 rounded-2xl border-2 border-blue-200 bg-blue-50/40 hover:bg-blue-50 text-slate-800 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center hover:border-blue-400 shadow-xs"
                >
                  <Download size={20} className="text-blue-600" />
                  <span className="text-xs font-black uppercase text-blue-900">Baixar Arquivo (.EML)</span>
                  <span className="text-[10px] text-blue-600/80 font-medium">Abre rascunho com fotos</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenOutlookWebOrApp(outlookTargetRequest)}
                  className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center"
                >
                  <Send size={20} className="text-blue-600" />
                  <span className="text-xs font-black uppercase">Abrir no Outlook</span>
                  <span className="text-[10px] text-slate-400">Inicia novo e-mail</span>
                </button>
              </div>

              {/* Preview Box */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Prévia do Layout Claro (sem barra preta):
                </span>
                <div 
                  className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 max-h-80 overflow-y-auto overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: buildOutlookContent(outlookTargetRequest).htmlBody }}
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsOutlookModalOpen(false)}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  Concluído
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Details */}
      {selectedRequestForDetail && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
            <div className="p-5 sm:p-6 bg-white border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 inline-block mb-1">
                  {selectedRequestForDetail.requestNumber || 'Solicitação'}
                </span>
                <h2 className="text-lg font-black tracking-tight text-slate-900">{selectedRequestForDetail.equipmentOrLocation}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequestForDetail(null)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Setor:</span>
                  <span className="font-bold text-slate-800">{selectedRequestForDetail.sector}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Status:</span>
                  <span className="font-bold text-blue-600">{selectedRequestForDetail.status}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Data Abertura:</span>
                  <span className="font-bold text-slate-800">
                    {selectedRequestForDetail.createdAt ? new Date(selectedRequestForDetail.createdAt).toLocaleString('pt-BR') : '-'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Descrição do Problema:</span>
                <p className="p-3 bg-slate-50 rounded-xl text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                  {selectedRequestForDetail.problemDescription}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Condição Atual:</span>
                  <span className="font-bold text-slate-800">{selectedRequestForDetail.equipmentCondition}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Impacto na Produção:</span>
                  <span className="font-bold text-slate-800">{selectedRequestForDetail.productionImpact}</span>
                </div>
              </div>

              {selectedRequestForDetail.additionalInfo && (
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Informações Adicionais:</span>
                  <p className="p-3 bg-slate-50 rounded-xl text-slate-700 whitespace-pre-wrap">
                    {selectedRequestForDetail.additionalInfo}
                  </p>
                </div>
              )}

              {selectedRequestForDetail.photos && selectedRequestForDetail.photos.length > 0 && (
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-2">Fotos Anexadas:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selectedRequestForDetail.photos.map((photo, index) => (
                      <a key={index} href={photo} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-slate-200 aspect-square hover:scale-105 transition-transform">
                        <img src={photo} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setOutlookTargetRequest(selectedRequestForDetail);
                    setIsOutlookModalOpen(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow"
                >
                  <Mail size={14} /> Compartilhar no Outlook
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRequestForDetail(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(confirmDeleteId)}
        title="Excluir Solicitação de Manutenção"
        message="Tem certeza que deseja excluir esta solicitação de manutenção? Esta ação é irreversível."
        confirmText="Sim, Excluir"
        cancelText="Cancelar"
        onConfirm={handleDeleteConfirm}
        onClose={() => setConfirmDeleteId(null)}
        type="danger"
      />
    </div>
  );
};
