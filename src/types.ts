
export interface ProductionEntry {
  id: string;
  date: string;
  operator: string;
  machine: string;
  shift: string;
  grossWeight: number;
  tara: number;
  netWeight: number;
  volumes: number;
  tubetes: number;
  tubetesEcoB?: number;
  ecoA: number;
  ecoBP: number;
  ecoBM: number;
  borraTotal: number;
  manutencaoMin: number;
  manutencaoMotivo?: string;
  processoMin: number;
  processoMotivo?: string;
  outrosMin: number;
  outrosMotivo?: string;
  isMaintenanceEntry?: boolean;
  isStandaloneDowntime?: boolean;
  downtimeCategory?: 'manutencao' | 'processo' | 'outros';
  isNoWorkDay?: boolean;
  noWorkReason?: string;
  updatedAt: string;
  userId: string;
  eremaWeight1?: number;
  eremaWeight2?: number;
  eremaWeight3?: number;
  eremaWeight4?: number;
  recycledUsed?: number;
  recycledBags?: number;
  ecoAMotivo?: string;
  ecoACategory?: string;
  ecoBPMotivo?: string;
  ecoBPCategory?: string;
  ecoBMMotivo?: string;
  ecoBMCategory?: string;
  borraTotalMotivo?: string;
  borraCategory?: string;
  materialType?: 'LC3' | 'LC2' | 'ATX' | 'ATX Plus' | string;
  materials?: Array<{
    id: string;
    materialType: string;
    volumes: number;
    tubetes: number;
    tubetesEcoB: number;
  }>;
  hasPenalty?: boolean;
  infractionType?: string;
  penaltyType?: 'deduction_kg' | 'deduction_percent' | 'disqualify';
  deductionValue?: number;
  penaltyReason?: string;
}

export interface SummaryStats {
  totalNet: number;
  ecoA: number;
  ecoBP: number;
  ecoBM: number;
  borra: number;
  paradas: number;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  type: 'Diurno' | 'Noturno' | 'Comercial';
  isFlexible?: boolean;
}

export interface Collaborator {
  id: string;
  registration: string; // Matricula
  name: string;
  role: string;
  birthDate?: string;
  address?: string;
  contact?: string;
  createdAt?: string;
  updatedAt: string;
  isBrigadista?: boolean;
  isSilenced?: boolean;
  silencedAt?: string;
  silenceReason?: string;
}

export type EmployeeStatus = 'Ativo' | 'Férias' | 'Atestado' | 'Desligado' | 'Em Contratação' | 'Vaga Excluída' | 'Silenciado';

export interface Employee {
  id: string;
  registration: string; // Matricula
  collaboratorId?: string; // Link to the central database
  name: string;
  role: string; // Changed from strict union to string to allow dynamic roles
  sector: string; // Extrusão, Reciclagem, Fita
  machine: string;
  shift: string;
  status: EmployeeStatus;
  statusDetails?: string; // Motivo do atestado, observações
  returnDate?: string; // Data de retorno para Férias/Atestado
  updatedAt: string;
  isBrigadista?: boolean;
  isSilenced?: boolean;
  silencedAt?: string;
  silenceReason?: string;
  orderIndex?: number;
  substituteForId?: string; // ID do colaborador em férias que este está substituindo
  substituteForName?: string; // Nome do colaborador em férias que este está substituindo
  substituteReturnDate?: string; // Data prevista de retorno das férias
  inicioPeriodo?: string;
  vencPeriodo?: string;
  dataLimiteGozo?: string;
  sldVenc?: number;
  inicioGozoPrevisto?: string | number;
  terminationReason?: string; // Motivo do desligamento apontado no momento do desligamento
  terminatedAt?: string; // Data/hora do desligamento
  replacedEmployeeId?: string; // ID do colaborador desligado que este substituiu
  replacedEmployeeName?: string; // Nome do colaborador desligado que este substituiu
  replacedReason?: string; // Motivo do desligamento do colaborador substituído
  coveredByEmployeeId?: string; // ID do colaborador que assumiu a vaga deste desligado
  coveredByEmployeeName?: string; // Nome do colaborador que assumiu a vaga deste desligado
  userId?: string;
}

export interface Vacation {
  id: string; // Firestore document ID
  employeeId: string;
  employeeName: string;
  registration: string;
  sector: string;
  role: string;
  machine: string;
  shift: string;
  year: number; // 2026
  month: number; // 1-12
  durationDays: 20 | 30;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  updatedAt: string;
}

export interface PersonnelLog {
  id: string;
  date: string;
  employeeName: string;
  action: 'Contratação' | 'Alteração' | 'Férias' | 'Atestado' | 'Transferência' | 'Desligamento' | 'Retorno' | 'Silenciamento' | 'Reativação';
  details: string;
  user: string; // Quem fez a alteração
  userId: string;
}

// Interfaces para Estrutura Dinâmica
export interface MachineStructure {
  name: string;
  roles: string[]; // Lista de cargos (slots) dessa máquina
}

export interface ShiftStructure {
  name: string; // ou 'shift' para extrusão
  machines?: MachineStructure[]; // Para estrutura tipo Extrusão
  roles?: string[]; // Para estrutura tipo Erema/Fita onde roles estão direto no turno dentro da maquina
}

export interface SectorStructureExtrusao {
  shift: string;
  machines: MachineStructure[];
}

export interface SectorStructureStandard {
  name: string;
  shifts: { name: string; roles: string[] }[];
}

export interface SectorStructureLeadership {
  shift: string;
  roles: string[];
}

export interface PersonnelStructure {
  leadership: SectorStructureLeadership[];
  extrusao: SectorStructureExtrusao[];
  erema: SectorStructureStandard[];
  fitaAdesiva: SectorStructureStandard[];
}

export interface CustomSector {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  colorTheme?: 'blue' | 'emerald' | 'amber' | 'violet' | 'indigo' | 'orange' | 'rose' | 'teal' | 'slate' | string;
  shifts: string[];
  machines: string[];
  defaultCapacity?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TrainingRecord {
  id: string;
  training: string;
  date: string;
  duration: string;
  location: string;
  instructor: string;
  content: string;
  participants: {
    registration: string;
    name: string;
  }[];
  createdAt: string;
  updatedAt?: string;
}

export interface OperatorTrainingModule {
  completed: boolean;
  date?: string;
  notes?: string;
}

export interface OperatorTrainingSheet {
  id: string;
  employeeId: string;
  employeeName: string;
  registration: string;
  instructorName: string;
  startDate: string;
  lastUpdated: string;
  progress: number; // 0 to 100
  modules: {
    [key: string]: OperatorTrainingModule;
  };
  targetRole?: string;
  currentRole?: string;
}

export interface TrainingTemplate {
  id: string;
  companyName: string;
  subCompanyName: string;
  subtitle: string;
  formCode: string;
  baseFontSize: number;
  titleFontSize: number;
  footerText: string;
  logoBase64?: string;
}

export interface HomeCardPermissions {
  enabled: boolean;          // Habilita visualização dos cards da tela de início
  productionSummary: boolean;// Card 1: Produção Diária & Mensal Consolidada (Extrusão & Corte)
  machines: boolean;         // Card 2: Máquinas em Operação (Cast 1, Cast 2, Erema, Lintech, Ghezzi, Wultec)
  losses: boolean;           // Card 3: Refugo & Perdas
  downtime: boolean;         // Card 4: Paradas de Máquina
  workforce: boolean;        // Card 5: Equipe & DOC 076
  ribbonSummary: boolean;    // Card 6: Resumo Corte de Fita
  quickActions: boolean;     // Card 7: Ações Operacionais de Chão de Fábrica
  pwa: boolean;              // Card 8: Experiência App / PWA
}

export interface ExtrusionPermissions {
  enabled: boolean;
  summary: boolean;      // Visão Geral
  charts: boolean;       // Gráficos
  comparison: boolean;   // Comparativos BI
  reports: boolean;      // Relatórios / Histórico
  stock: boolean;        // Estoque
  calculator?: boolean;  // Calculadora CAST 1
  newEntry: boolean;     // Novo Lançamento
}

export interface RibbonPermissions {
  enabled: boolean;
  summary: boolean;      // Visão Geral
  charts: boolean;       // Gráficos
  comparison: boolean;   // Comparativos BI
  reports: boolean;      // Relatório Lançamentos
  productivity: boolean; // Produtividade de Máquina
  goals?: boolean;       // Definir Metas
  monthlyReport?: boolean;// Relatório Mensal (PDF)
  exportExcel?: boolean; // Exportar Dados (Excel)
  newEntry: boolean;     // Novo Lançamento
}

export interface PersonnelPermissions {
  enabled: boolean;
  board: boolean;        // Quadro de Colaboradores / Presença
  vacations: boolean;    // Controle de Férias & Retorno
  training: boolean;     // Treinamento Operacional / DDP
  lunch: boolean;        // Escala de Almoço
  overtime: boolean;     // Solicitação de Hora Extra (DOC 076)
  overtimeEntries: boolean; // Lançamentos de Horas Extras (Apontamento)
  evaluations: boolean;  // Avaliações de Desempenho
  bonus: boolean;        // Gestão de Bônus de Produção
  reports?: boolean;     // Relatórios e PDF de Pessoal
  manage: boolean;       // Cadastrar / Gerir Colaboradores
}

export interface MaintenancePermissions {
  enabled: boolean;
  requests: boolean;     // Solicitações / Ordens de Serviço
  causes: boolean;       // Causas & Indicadores de Parada
  newRequest: boolean;   // Nova Solicitação
}

export interface ProjectionPermissions {
  enabled: boolean;      // Projeção TV Industrial (Smart TV)
}

export interface SettingsPermissions {
  enabled: boolean;
  filters: boolean;      // Filtros
  goals: boolean;        // Metas
  config: boolean;       // Cadastro (Colaboradores, Funções, Turnos, Motivos, Usuários)
  system: boolean;       // Sistema (Identidade, Logo, Banco, Backup)
  app: boolean;          // App / Versão / PWA
}

export interface UserPermissions {
  // Flag global de proteção contra escrita
  isReadOnly?: boolean;

  // Permissões detalhadas e granulares por módulo
  homeCards?: HomeCardPermissions;
  extrusion?: ExtrusionPermissions;
  ribbon?: RibbonPermissions;
  personnel?: PersonnelPermissions;
  maintenance?: MaintenancePermissions;
  projection?: ProjectionPermissions;
  settings?: SettingsPermissions;

  // Flags legadas para retrocompatibilidade
  canViewDashboard?: boolean;
  canViewReports?: boolean;
  canViewPersonnel?: boolean;
  canManageSettings?: boolean;
  canEditProduction?: boolean;
  canManagePersonnel?: boolean;
}

export interface SystemUser {
  id: string;
  name: string;
  registration: string; // Matricula
  role: string;
  password?: string;
  isFirstAccess: boolean;
  biometricId?: string;
  permissions?: UserPermissions;
}

export interface ActiveSession {
  id: string;
  name: string;
  registration: string;
  role: string;
  loginTime: string;
  lastSeen: string;
  device?: string;
  status?: 'active' | 'disconnected';
  currentScreen?: string;
  currentSubScreen?: string;
  lastAction?: string;
  lastActionTime?: string;
}

export type UserActivityType = 'screen_view' | 'action' | 'auth';

export interface UserActivityLog {
  id: string;
  userId?: string;
  name: string;
  registration: string;
  role: string;
  type: UserActivityType;
  screen: string;
  subScreen?: string;
  action: string;
  details?: string;
  timestamp: string;
  device?: string;
}

export interface AccessLog {
  id: string;
  name: string;
  registration: string;
  role: string;
  action: 'login' | 'logout' | 'disconnect';
  timestamp: string;
  device?: string;
}

export interface StockItem {
  code: string;
  name: string; // descrição
  quantity: number;
  location: 'Fábrica' | 'Galpão' | string;
}

export interface StockEntry {
  id: string;
  date: string;
  items: StockItem[];
  totalWeight: number;
  updatedAt: string;
  userId: string;
}

export interface RibbonCuttingEntry {
  id: string;
  date: string;
  operator: string;
  shift: string;
  producedM2: number; // metros quadrados produzido
  rejectedM2: number; // não conforme em metros quadrados
  wasteWeight: number; // lixo em peso (Kg)
  jumboM2: number; // quantidade de jumbos em metros quadrados
  jumboType: string; // tipo de jumbo utilizado (AA40, AS50, Hotmalt, AR9)
  updatedAt: string;
  userId: string;
  machine?: string;
  rollsCount?: number;
  rollWidth?: number;
  rollLength?: number;
  orderNumber?: string;
  rollsTipo1?: number;
  rollsTipo2?: number;
  m2Tipo1?: number;
  m2Tipo2?: number;
  jumboItems?: Array<{
    id: string;
    jumboType: string;
    jumboM2: number;
    producedM2: number;
    rejectedM2: number;
    wasteWeight: number;
    orderNumber?: string;
    rollsCount?: number;
    rollWidth?: number;
    rollLength?: number;
    rollsTipo1?: number;
    rollsTipo2?: number;
    m2Tipo1?: number;
    m2Tipo2?: number;
  }>;
  stoppedMinutes?: number;
  stoppedReason?: string;
  manutencaoMin?: number;
  manutencaoMotivo?: string;
  processoMin?: number;
  processoMotivo?: string;
  outrosMin?: number;
  outrosMotivo?: string;
}

export type DowntimeNature = 'Manutenção' | 'Processo' | 'Outros' | string;

export interface DowntimeKeyword {
  id: string;
  keyword: string; // ex: "eixo", "biela central", "mangueira de ar", "bomba hidraulica", "refile"
  category?: string;
  isPopular?: boolean;
}

export interface DowntimeRecord {
  id: string;
  nature: DowntimeNature; // 'Manutenção' | 'Processo' | 'Outros'
  keyword: string; // palavra-chave selecionada isoladamente
  justification: string; // justificativa livre
  durationMinutes: number; // tempo de parada em minutos
  de?: string; // Horário de início HH:MM
  ate?: string; // Horário de término HH:MM
  createdAt?: string;
  machine?: string;
  operator?: string;
  shift?: string;
}

export interface StopItem {
  id: string;
  de: string;
  ate: string;
  motivo: string; // Armazena a palavra-chave (ou texto formatado)
  explicacao?: string; // Armazena a justificativa livre
  nature?: DowntimeNature;
  keyword?: string;
  quickReason?: string; // Motivo rápido de parada para BI
  justification?: string;
  durationMinutes?: number;
  isAvulso?: boolean;
  category?: string;
  component?: string;
  defect?: string;
}

export type MaintenancePriority = 'Baixa' | 'Média' | 'Alta' | 'Crítica';
export type MaintenanceStatus = 'Pendente' | 'Em Andamento' | 'Resolvido';

export type PenaltyType = 'deduction_kg' | 'deduction_percent' | 'disqualify';

export interface OperatorPenalty {
  id: string;
  operator: string;
  date: string; // YYYY-MM or YYYY-MM-DD
  infractionType: string;
  penaltyType: PenaltyType;
  deductionValue: number; // valor em kg ou em % (0 se disqualify)
  reason: string;
  registeredBy?: string;
  createdAt: string;
}

export interface CompanyNotice {
  id: string;
  category: 'rh' | 'safety';
  title: string;
  subtitle?: string;
  description: string;
  imageUrl?: string;
  imageCaption?: string;
  priority?: 'high' | 'medium' | 'info';
  badgeText?: string;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MaintenanceIssue {
  id: string;
  title?: string;
  cause: string;
  priority: MaintenancePriority;
  sector: string;
  machine: string;
  reporter: string;
  status: MaintenanceStatus;
  notes?: string;
  solution?: string;
  createdAt: string;
  resolvedAt?: string;
  userId: string;
}

export type OvertimeMode = 'integral' | 'pos_turno';
export type CommercialShiftType = 'padrao' | 'flexivel';

export interface OvertimeRequest {
  id: string;
  employeeId?: string;
  employeeName: string;
  registration?: string;
  role?: string;
  sector: string; // 'Extrusão' | 'Corte de Fita' | 'Reciclagem' | 'Manutenção' | string
  machine?: string;
  shift?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  estimatedHours: number;
  reasonCategory: string; // 'Atendimento de demanda de produção' | 'Manutenção corretiva ou intervenção emergencial' | etc.
  reasonDetails: string; // Justificativa detalhada
  requesterName: string; // Líder / Supervisor
  managerName?: string; // Gestor responsável
  approvalStatus: 'Pendente' | 'Aprovado' | 'Reprovado';
  isEmergency?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string;
  overtimeMode?: OvertimeMode;
  commercialShiftType?: CommercialShiftType;
  normalShiftStartTime?: string;
  normalShiftEndTime?: string;
  overtimeMinutes?: number;
  displayOvertime?: string;
  overtimeUnit?: 'minutos' | 'horas';
}

export interface OvertimeEntry {
  id: string;
  employeeId?: string;
  registration: string; // Matrícula
  employeeName: string; // Nome do colaborador / operador
  role?: string;
  sector: string; // Setor do colaborador
  machine?: string;
  shift?: string;
  date: string; // YYYY-MM-DD
  overtimeMode?: OvertimeMode; // 'pos_turno' | 'integral'
  shiftTypeChoice?: 'Comercial' | 'Diurno' | 'Noturno';
  isCommercialFlexible?: boolean;
  normalShiftStartTime?: string; // Início do horário normal
  normalShiftEndTime?: string; // Término do horário normal
  startTime: string; // Início da jornada/extra (HH:MM)
  endTime: string; // Término da jornada/extra (HH:MM)
  breakMinutes?: number; // Intervalo em minutos (ex: almoço/jantar)
  workingHours: number; // Horas trabalhando em decimal (ex: 2.00)
  workingHoursFormatted: string; // ex: "02:00" ou "2h 00min"
  overtimeHours: number; // Horas extras calculadas em decimal (ex: 2.00)
  overtimeMinutes: number; // Minutos de hora extra
  overtimeHoursFormatted: string; // ex: "02:00" ou "2h 00min"
  overtimePercentage: number; // Porcentagem de HE (padrão 60% dias normais seg a sáb, ou 110% domingos e feriados)
  overtimePercentageLabel: string; // ex: "60%" ou "110%"
  equivalentHours?: number; // Horas ponderadas com adicional (ex: horas * (1 + %/100))
  overtimeExplanation?: string; // Explicação detalhada da regra do turno aplicada
  reason?: string; // Motivo / Justificativa
  requestedBy?: string; // Líder ou solicitante
  notes?: string;
  status?: 'pending' | 'approved' | 'rejected'; // Fluxo de aprovação em 2 níveis
  approvedBy?: string; // Nome de quem validou/aprovou
  approvedAt?: string; // Data e hora da validação
  rejectionReason?: string; // Justificativa caso rejeitado
  isNightShiftOvertime?: boolean; // Indica se houve trecho entre 22h00 e 05h00
  nightMinutes?: number; // Minutos noturnos apurados
  batchGroupId?: string; // ID do lançamento em lote/equipe se aplicável
  createdAt: string;
  updatedAt: string;
  userId?: string;
  userName?: string;
}

export type MaintenanceEquipmentCondition = 'Operando Normalmente' | 'Operando com Restrições / Ruído' | 'Parado / Inoperante';
export type MaintenanceProductionImpact = 'Nenhum' | 'Baixo (Não afeta meta)' | 'Médio (Risco de parada/redução)' | 'Crítico (Linha/Máquina Parada)';
export type MaintenanceRequestStatus = 'Pendente' | 'Em Análise' | 'Programado' | 'Em Execução' | 'Concluído' | 'Cancelado';

export interface MaintenanceRequest {
  id: string;
  requestNumber?: string; // Ex: SOL-MAN-2026-001
  sector: string; // Setor solicitante
  equipmentOrLocation: string; // Equipamento ou local
  problemDescription: string; // Descrição do problema
  equipmentCondition: MaintenanceEquipmentCondition; // Condição atual do equipamento
  productionImpact: MaintenanceProductionImpact; // Impacto na produção ou operação
  additionalInfo?: string; // Fotos ou informações adicionais
  photos?: string[]; // URLs ou base64 de fotos (quando aplicável)
  requesterName: string; // Nome do solicitante
  requesterRole?: string; // Cargo do solicitante
  requesterEmail?: string; // E-mail do solicitante
  contactPhone?: string; // Ramal ou telefone de contato
  priority?: 'Baixa' | 'Média' | 'Alta' | 'Urgente'; // Priorização
  status: MaintenanceRequestStatus; // Status da solicitação
  scheduledDate?: string; // Data programada para atendimento
  maintenanceNotes?: string; // Observações da equipe de manutenção
  technicianAssigned?: string; // Técnico atribuído
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  userId?: string;
}

export interface EcoBalanceSettings {
  initialEcoBStock: number;          // Total Eco B de partida (kg) = matriz + galpão
  initialMatrizStock?: number;       // Na Matriz (kg) na última contagem
  initialGalpaoStock?: number;       // No Galpão (kg) na última contagem
  initialRecycledStock: number;      // O que já temos de reciclado produzido (kg)
  baseCountDate?: string;            // Data da última contagem base (ex: '2026-09-25')
  
  physicalEcoBStock?: number;        // Total Eco B contado fisicamente (kg) = matriz + galpão
  physicalMatrizStock?: number;      // Contagem hoje na Matriz (kg)
  physicalGalpaoStock?: number;      // Contagem hoje no Galpão (kg)
  physicalInventoryDate?: string;    // Data da aferição física de hoje (ex: '2026-09-28')

  calculationPeriodDays?: string[];  // Dias considerados no ciclo (ex: ['2026-09-25', '2026-09-26', '2026-09-27'])
  notes?: string;                    // Observações do balanço / inventário
  updatedAt?: string;
}




