import { 
  UserPermissions, 
  HomeCardPermissions,
  ExtrusionPermissions, 
  RibbonPermissions, 
  PersonnelPermissions, 
  MaintenancePermissions, 
  ProjectionPermissions, 
  SettingsPermissions 
} from '../types';

export const DEFAULT_HOME_CARDS_PERMISSIONS: HomeCardPermissions = {
  enabled: true,
  productionSummary: true,
  machines: true,
  losses: true,
  downtime: true,
  workforce: true,
  ribbonSummary: true,
  quickActions: true,
  pwa: true
};

export const DEFAULT_EXTRUSION_PERMISSIONS: ExtrusionPermissions = {
  enabled: true,
  summary: true,
  charts: true,
  comparison: true,
  reports: true,
  stock: true,
  calculator: true,
  newEntry: true
};

export const DEFAULT_RIBBON_PERMISSIONS: RibbonPermissions = {
  enabled: true,
  summary: true,
  charts: true,
  comparison: true,
  reports: true,
  productivity: true,
  goals: true,
  monthlyReport: true,
  exportExcel: true,
  newEntry: true
};

export const DEFAULT_PERSONNEL_PERMISSIONS: PersonnelPermissions = {
  enabled: true,
  board: true,
  vacations: true,
  training: true,
  lunch: true,
  overtime: true,
  overtimeEntries: true,
  evaluations: true,
  bonus: true,
  reports: true,
  manage: false
};

export const DEFAULT_MAINTENANCE_PERMISSIONS: MaintenancePermissions = {
  enabled: true,
  requests: true,
  causes: true,
  newRequest: true
};

export const DEFAULT_PROJECTION_PERMISSIONS: ProjectionPermissions = {
  enabled: true
};

export const DEFAULT_SETTINGS_PERMISSIONS: SettingsPermissions = {
  enabled: false,
  filters: false,
  goals: false,
  config: false,
  system: false,
  app: false
};

export const DEFAULT_FULL_PERMISSIONS: UserPermissions = {
  isReadOnly: false,
  canViewDashboard: true,
  canViewReports: true,
  canViewPersonnel: true,
  canManageSettings: false,
  canEditProduction: true,
  canManagePersonnel: false,
  homeCards: { ...DEFAULT_HOME_CARDS_PERMISSIONS },
  extrusion: { ...DEFAULT_EXTRUSION_PERMISSIONS },
  ribbon: { ...DEFAULT_RIBBON_PERMISSIONS },
  personnel: { ...DEFAULT_PERSONNEL_PERMISSIONS },
  maintenance: { ...DEFAULT_MAINTENANCE_PERMISSIONS },
  projection: { ...DEFAULT_PROJECTION_PERMISSIONS },
  settings: { ...DEFAULT_SETTINGS_PERMISSIONS }
};

export function createPresetPermissions(preset: 'readOnly' | 'operator' | 'supervisor' | 'admin' | 'clear'): UserPermissions {
  if (preset === 'clear') {
    return {
      isReadOnly: false,
      canViewDashboard: false,
      canViewReports: false,
      canViewPersonnel: false,
      canManageSettings: false,
      canEditProduction: false,
      canManagePersonnel: false,
      homeCards: {
        enabled: false,
        productionSummary: false,
        machines: false,
        losses: false,
        downtime: false,
        workforce: false,
        ribbonSummary: false,
        quickActions: false,
        pwa: false
      },
      extrusion: {
        enabled: false,
        summary: false,
        charts: false,
        comparison: false,
        reports: false,
        stock: false,
        calculator: false,
        newEntry: false
      },
      ribbon: {
        enabled: false,
        summary: false,
        charts: false,
        comparison: false,
        reports: false,
        productivity: false,
        goals: false,
        monthlyReport: false,
        exportExcel: false,
        newEntry: false
      },
      personnel: {
        enabled: false,
        board: false,
        vacations: false,
        training: false,
        lunch: false,
        overtime: false,
        overtimeEntries: false,
        evaluations: false,
        bonus: false,
        reports: false,
        manage: false
      },
      maintenance: {
        enabled: false,
        requests: false,
        causes: false,
        newRequest: false
      },
      projection: {
        enabled: false
      },
      settings: {
        enabled: false,
        filters: false,
        goals: false,
        config: false,
        system: false,
        app: false
      }
    };
  }

  if (preset === 'readOnly') {
    return {
      isReadOnly: true,
      canViewDashboard: true,
      canViewReports: true,
      canViewPersonnel: true,
      canManageSettings: false,
      canEditProduction: false,
      canManagePersonnel: false,
      homeCards: {
        enabled: true,
        productionSummary: true,
        machines: true,
        losses: true,
        downtime: true,
        workforce: true,
        ribbonSummary: true,
        quickActions: false,
        pwa: true
      },
      extrusion: {
        enabled: true,
        summary: true,
        charts: true,
        comparison: true,
        reports: true,
        stock: true,
        calculator: true,
        newEntry: false
      },
      ribbon: {
        enabled: true,
        summary: true,
        charts: true,
        comparison: true,
        reports: true,
        productivity: true,
        goals: false,
        monthlyReport: true,
        exportExcel: true,
        newEntry: false
      },
      personnel: {
        enabled: true,
        board: true,
        vacations: true,
        training: true,
        lunch: true,
        overtime: true,
        overtimeEntries: true,
        evaluations: true,
        bonus: true,
        reports: true,
        manage: false
      },
      maintenance: {
        enabled: true,
        requests: true,
        causes: true,
        newRequest: false
      },
      projection: {
        enabled: true
      },
      settings: {
        enabled: false,
        filters: false,
        goals: false,
        config: false,
        system: false,
        app: false
      }
    };
  }

  if (preset === 'operator') {
    return {
      isReadOnly: false,
      canViewDashboard: true,
      canViewReports: true,
      canViewPersonnel: false,
      canManageSettings: false,
      canEditProduction: true,
      canManagePersonnel: false,
      homeCards: {
        enabled: true,
        productionSummary: true,
        machines: true,
        losses: true,
        downtime: true,
        workforce: false,
        ribbonSummary: true,
        quickActions: true,
        pwa: true
      },
      extrusion: {
        enabled: true,
        summary: true,
        charts: true,
        comparison: true,
        reports: true,
        stock: true,
        calculator: true,
        newEntry: true
      },
      ribbon: {
        enabled: true,
        summary: true,
        charts: true,
        comparison: true,
        reports: true,
        productivity: true,
        goals: false,
        monthlyReport: false,
        exportExcel: false,
        newEntry: true
      },
      personnel: {
        enabled: false,
        board: false,
        vacations: false,
        training: false,
        lunch: false,
        overtime: false,
        overtimeEntries: false,
        evaluations: false,
        bonus: false,
        reports: false,
        manage: false
      },
      maintenance: {
        enabled: true,
        requests: true,
        causes: true,
        newRequest: true
      },
      projection: {
        enabled: true
      },
      settings: {
        enabled: false,
        filters: false,
        goals: false,
        config: false,
        system: false,
        app: false
      }
    };
  }

  if (preset === 'supervisor') {
    return {
      isReadOnly: false,
      canViewDashboard: true,
      canViewReports: true,
      canViewPersonnel: true,
      canManageSettings: true,
      canEditProduction: true,
      canManagePersonnel: true,
      homeCards: {
        enabled: true,
        productionSummary: true,
        machines: true,
        losses: true,
        downtime: true,
        workforce: true,
        ribbonSummary: true,
        quickActions: true,
        pwa: true
      },
      extrusion: {
        enabled: true,
        summary: true,
        charts: true,
        comparison: true,
        reports: true,
        stock: true,
        calculator: true,
        newEntry: true
      },
      ribbon: {
        enabled: true,
        summary: true,
        charts: true,
        comparison: true,
        reports: true,
        productivity: true,
        goals: true,
        monthlyReport: true,
        exportExcel: true,
        newEntry: true
      },
      personnel: {
        enabled: true,
        board: true,
        vacations: true,
        training: true,
        lunch: true,
        overtime: true,
        overtimeEntries: true,
        evaluations: true,
        bonus: true,
        reports: true,
        manage: true
      },
      maintenance: {
        enabled: true,
        requests: true,
        causes: true,
        newRequest: true
      },
      projection: {
        enabled: true
      },
      settings: {
        enabled: true,
        filters: true,
        goals: true,
        config: false,
        system: false,
        app: true
      }
    };
  }

  // admin
  return {
    isReadOnly: false,
    canViewDashboard: true,
    canViewReports: true,
    canViewPersonnel: true,
    canManageSettings: true,
    canEditProduction: true,
    canManagePersonnel: true,
    homeCards: { ...DEFAULT_HOME_CARDS_PERMISSIONS },
    extrusion: {
      enabled: true,
      summary: true,
      charts: true,
      comparison: true,
      reports: true,
      stock: true,
      calculator: true,
      newEntry: true
    },
    ribbon: {
      enabled: true,
      summary: true,
      charts: true,
      comparison: true,
      reports: true,
      productivity: true,
      goals: true,
      monthlyReport: true,
      exportExcel: true,
      newEntry: true
    },
    personnel: {
      enabled: true,
      board: true,
      vacations: true,
      training: true,
      lunch: true,
      overtime: true,
      overtimeEntries: true,
      evaluations: true,
      bonus: true,
      reports: true,
      manage: true
    },
    maintenance: {
      enabled: true,
      requests: true,
      causes: true,
      newRequest: true
    },
    projection: {
      enabled: true
    },
    settings: {
      enabled: true,
      filters: true,
      goals: true,
      config: true,
      system: true,
      app: true
    }
  };
}

/**
 * Normaliza qualquer objeto de permissões (inclusive de usuários legados que só tinham canViewDashboard, etc.)
 * para garantir que todas as permissões granulares existam com valores corretos.
 */
export function normalizeUserPermissions(perms?: UserPermissions | null, role?: string, registration?: string): UserPermissions {
  const isAdmin = registration === '1010' || (role || '').toLowerCase().includes('administrador');

  if (isAdmin) {
    return {
      isReadOnly: false,
      canViewDashboard: true,
      canViewReports: true,
      canViewPersonnel: true,
      canManageSettings: true,
      canEditProduction: true,
      canManagePersonnel: true,
      homeCards: { ...DEFAULT_HOME_CARDS_PERMISSIONS },
      extrusion: {
        enabled: true,
        summary: true,
        charts: true,
        comparison: true,
        reports: true,
        stock: true,
        calculator: true,
        newEntry: true
      },
      ribbon: {
        enabled: true,
        summary: true,
        charts: true,
        comparison: true,
        reports: true,
        productivity: true,
        goals: true,
        monthlyReport: true,
        exportExcel: true,
        newEntry: true
      },
      personnel: {
        enabled: true,
        board: true,
        vacations: true,
        training: true,
        lunch: true,
        overtime: true,
        overtimeEntries: true,
        evaluations: true,
        bonus: true,
        reports: true,
        manage: true
      },
      maintenance: {
        enabled: true,
        requests: true,
        causes: true,
        newRequest: true
      },
      projection: {
        enabled: true
      },
      settings: {
        enabled: true,
        filters: true,
        goals: true,
        config: true,
        system: true,
        app: true
      }
    };
  }

  const isReadOnly = !isAdmin && (
    !!perms?.isReadOnly || 
    role === 'Modo Leitura' || 
    (role || '').toLowerCase().includes('leitura') || 
    registration === '9999'
  );

  const legacyDash = perms?.canViewDashboard !== false;
  const legacyReports = perms?.canViewReports !== false;
  const legacyPersonnel = perms?.canViewPersonnel !== false;
  const legacySettings = !isReadOnly && !!perms?.canManageSettings;
  const legacyEdit = !isReadOnly && perms?.canEditProduction !== false;
  const legacyManagePers = !isReadOnly && !!perms?.canManagePersonnel;

  // Detecta se o objeto já utiliza o sistema granular de módulos
  const hasGranular = !isReadOnly && !!perms && (
    perms.extrusion !== undefined || 
    perms.ribbon !== undefined || 
    perms.personnel !== undefined || 
    perms.maintenance !== undefined || 
    perms.settings !== undefined ||
    perms.homeCards !== undefined
  );

  // Cards da Tela de Início
  const rawHome = perms?.homeCards;
  const homeProdSummary = rawHome?.productionSummary !== undefined ? !!rawHome.productionSummary : true;
  const homeMachines = rawHome?.machines !== undefined ? !!rawHome.machines : true;
  const homeLosses = rawHome?.losses !== undefined ? !!rawHome.losses : true;
  const homeDowntime = rawHome?.downtime !== undefined ? !!rawHome.downtime : true;
  const homeWorkforce = rawHome?.workforce !== undefined ? !!rawHome.workforce : true;
  const homeRibbonSummary = rawHome?.ribbonSummary !== undefined ? !!rawHome.ribbonSummary : true;
  const homeQuickActions = !isReadOnly && (rawHome?.quickActions !== undefined ? !!rawHome.quickActions : true);
  const homePwa = !isReadOnly && (rawHome?.pwa !== undefined ? !!rawHome.pwa : true);
  const homeEnabled = rawHome?.enabled !== undefined 
    ? (rawHome.enabled && (homeProdSummary || homeMachines || homeLosses || homeDowntime || homeWorkforce || homeRibbonSummary || homeQuickActions || homePwa))
    : true;

  // Extrusão
  const rawExt = perms?.extrusion;
  const extSummary = rawExt ? !!rawExt.summary : (hasGranular ? false : legacyDash);
  const extCharts = rawExt ? !!rawExt.charts : (hasGranular ? false : legacyDash);
  const extComparison = rawExt ? !!rawExt.comparison : (hasGranular ? false : legacyDash);
  const extReports = rawExt ? !!rawExt.reports : (hasGranular ? false : legacyReports);
  const extStock = rawExt ? !!rawExt.stock : (hasGranular ? false : (legacyDash || legacyReports));
  const extCalculator = rawExt?.calculator !== undefined ? !!rawExt.calculator : (hasGranular ? false : legacyDash);
  const extNewEntry = !isReadOnly && (rawExt ? !!rawExt.newEntry : (hasGranular ? false : legacyEdit));
  const extHasAny = extSummary || extCharts || extComparison || extReports || extStock || extCalculator || extNewEntry;
  const extEnabled = extHasAny || (rawExt?.enabled === true);

  // Ribbon
  const rawRib = perms?.ribbon;
  const ribSummary = rawRib ? !!rawRib.summary : (hasGranular ? false : legacyDash);
  const ribCharts = rawRib ? !!rawRib.charts : (hasGranular ? false : legacyDash);
  const ribComparison = rawRib ? !!rawRib.comparison : (hasGranular ? false : legacyDash);
  const ribReports = rawRib ? !!rawRib.reports : (hasGranular ? false : legacyReports);
  const ribProductivity = rawRib ? !!rawRib.productivity : (hasGranular ? false : legacyReports);
  const ribGoals = !isReadOnly && (rawRib?.goals !== undefined ? !!rawRib.goals : (hasGranular ? false : legacySettings));
  const ribMonthlyReport = !isReadOnly && (rawRib?.monthlyReport !== undefined ? !!rawRib.monthlyReport : (hasGranular ? false : legacyReports));
  const ribExportExcel = !isReadOnly && (rawRib?.exportExcel !== undefined ? !!rawRib.exportExcel : (hasGranular ? false : legacyReports));
  const ribNewEntry = !isReadOnly && (rawRib ? !!rawRib.newEntry : (hasGranular ? false : legacyEdit));
  const ribHasAny = ribSummary || ribCharts || ribComparison || ribReports || ribProductivity || ribGoals || ribMonthlyReport || ribExportExcel || ribNewEntry;
  const ribEnabled = ribHasAny || (rawRib?.enabled === true);

  // Pessoal
  const rawPers = perms?.personnel;
  const persBoard = rawPers ? !!rawPers.board : (hasGranular ? false : legacyPersonnel);
  const persVacations = rawPers ? !!rawPers.vacations : (hasGranular ? false : legacyPersonnel);
  const persTraining = rawPers ? !!rawPers.training : (hasGranular ? false : legacyPersonnel);
  const persLunch = rawPers ? !!rawPers.lunch : (hasGranular ? false : legacyPersonnel);
  const persOvertime = !isReadOnly && (rawPers ? !!rawPers.overtime : (hasGranular ? false : legacyPersonnel));
  const persOvertimeEntries = !isReadOnly && (rawPers ? (rawPers.overtimeEntries !== undefined ? !!rawPers.overtimeEntries : !!rawPers.overtime) : (hasGranular ? false : legacyPersonnel));
  const persEvaluations = rawPers ? !!rawPers.evaluations : (hasGranular ? false : legacyPersonnel);
  const persBonus = rawPers?.bonus !== undefined ? !!rawPers.bonus : (hasGranular ? false : legacyPersonnel);
  const persReports = rawPers ? (rawPers.reports !== undefined ? !!rawPers.reports : legacyReports) : (hasGranular ? false : legacyReports);
  const persManage = !isReadOnly && (rawPers ? !!rawPers.manage : (hasGranular ? false : legacyManagePers));
  const persHasAny = persBoard || persVacations || persTraining || persLunch || persOvertime || persOvertimeEntries || persEvaluations || persBonus || persReports || persManage;
  const persEnabled = persHasAny || (rawPers?.enabled === true);

  // Manutenção
  const rawMaint = perms?.maintenance;
  const maintRequests = rawMaint ? !!rawMaint.requests : (hasGranular ? false : true);
  const maintCauses = rawMaint ? !!rawMaint.causes : (hasGranular ? false : true);
  const maintNewRequest = !isReadOnly && (rawMaint ? !!rawMaint.newRequest : (hasGranular ? false : true));
  const maintHasAny = maintRequests || maintCauses || maintNewRequest;
  const maintEnabled = maintHasAny || (rawMaint?.enabled === true);

  // Projeção
  const rawProj = perms?.projection;
  const projEnabled = rawProj ? !!rawProj.enabled : (hasGranular ? false : legacyDash);

  // Configurações
  const rawSet = perms?.settings;
  const setFilters = rawSet ? !!rawSet.filters : (hasGranular ? false : legacySettings);
  const setGoals = !isReadOnly && (rawSet ? !!rawSet.goals : (hasGranular ? false : legacySettings));
  const setConfig = !isReadOnly && (rawSet ? !!rawSet.config : (hasGranular ? false : legacySettings));
  const setSystem = !isReadOnly && (rawSet ? !!rawSet.system : (hasGranular ? false : legacySettings));
  const setApp = !isReadOnly && (rawSet ? !!rawSet.app : (hasGranular ? false : legacySettings));
  const setHasAny = setFilters || setGoals || setConfig || setSystem || setApp;
  const setEnabled = !isReadOnly && (setHasAny || (rawSet?.enabled === true));

  // O Painel Geral / Início depende do switch explícito canViewDashboard se definido, ou se o usuário possui acesso aos cards
  const canViewHomeExplicit = perms?.canViewDashboard !== undefined 
    ? !!perms.canViewDashboard 
    : (hasGranular ? (homeEnabled || extEnabled || ribEnabled) : ((extSummary || extCharts || ribSummary || ribCharts) && legacyDash));

  return {
    isReadOnly,
    canViewDashboard: canViewHomeExplicit,
    canViewReports: extReports || ribReports || persReports,
    canViewPersonnel: persBoard,
    canManageSettings: setEnabled && !isReadOnly,
    canEditProduction: (extNewEntry || ribNewEntry) && !isReadOnly,
    canManagePersonnel: persManage && !isReadOnly,
    homeCards: {
      enabled: homeEnabled,
      productionSummary: homeProdSummary,
      machines: homeMachines,
      losses: homeLosses,
      downtime: homeDowntime,
      workforce: homeWorkforce,
      ribbonSummary: homeRibbonSummary,
      quickActions: homeQuickActions,
      pwa: homePwa
    },
    extrusion: {
      enabled: extEnabled,
      summary: extSummary,
      charts: extCharts,
      comparison: extComparison,
      reports: extReports,
      stock: extStock,
      calculator: extCalculator,
      newEntry: extNewEntry
    },
    ribbon: {
      enabled: ribEnabled,
      summary: ribSummary,
      charts: ribCharts,
      comparison: ribComparison,
      reports: ribReports,
      productivity: ribProductivity,
      goals: ribGoals,
      monthlyReport: ribMonthlyReport,
      exportExcel: ribExportExcel,
      newEntry: ribNewEntry
    },
    personnel: {
      enabled: persEnabled,
      board: persBoard,
      vacations: persVacations,
      training: persTraining,
      lunch: persLunch,
      overtime: persOvertime,
      overtimeEntries: persOvertimeEntries,
      evaluations: persEvaluations,
      bonus: persBonus,
      reports: persReports,
      manage: persManage
    },
    maintenance: {
      enabled: maintEnabled,
      requests: maintRequests,
      causes: maintCauses,
      newRequest: maintNewRequest
    },
    projection: {
      enabled: projEnabled
    },
    settings: {
      enabled: setEnabled,
      filters: setFilters,
      goals: setGoals,
      config: setConfig,
      system: setSystem,
      app: setApp
    }
  };
}

export interface UserLandingTarget {
  tab: 'home' | 'extrusion' | 'ribbon' | 'personnel' | 'evaluations' | 'maintenance' | 'projection';
  extrusionSubTab?: 'dashboard' | 'reports' | 'stock';
  dashboardSubTab?: 'summary' | 'charts' | 'comparison';
  ribbonSubTab?: 'dashboard' | 'reports' | 'productivity';
  ribbonDashboardSubTab?: 'summary' | 'charts' | 'comparison';
  personnelSubView?: 'board' | 'vacations' | 'training' | 'lunch' | 'overtime' | 'overtime_entries' | 'evaluations' | 'bonus';
  maintenanceSubTab?: 'requests' | 'causes';
}

/**
 * Determina qual deve ser a tela inicial / página padrão de abertura do usuário.
 * Se o usuário não tiver permissão para a tela 'home' (produção diária geral),
 * abre imediatamente na primeira tela/função para a qual ele possui permissão concedida.
 */
export function getInitialUserLanding(permissions?: UserPermissions | null, isAdmin?: boolean): UserLandingTarget {
  if (isAdmin) {
    return { tab: 'home' };
  }
  const perms = normalizeUserPermissions(permissions);

  const hasPersonnel = !!perms.personnel?.enabled;
  const hasExtrusion = !!perms.extrusion?.enabled;
  const hasRibbon = !!perms.ribbon?.enabled;
  const hasMaintenance = !!perms.maintenance?.enabled;
  const hasProjection = !!perms.projection?.enabled;

  const canExtrusionHome = hasExtrusion && !!perms.extrusion?.summary;
  const canRibbonHome = hasRibbon && !!perms.ribbon?.summary;
  const canViewHome = perms.canViewDashboard && (canExtrusionHome || canRibbonHome);

  // 1. Caso Especial: Usuário com foco em Pessoal (sem acesso à produção geral da fábrica)
  if (hasPersonnel && !canExtrusionHome && !canRibbonHome) {
    if (perms.personnel.board) return { tab: 'personnel', personnelSubView: 'board' };
    if (perms.personnel.vacations) return { tab: 'personnel', personnelSubView: 'vacations' };
    if (perms.personnel.lunch) return { tab: 'personnel', personnelSubView: 'lunch' };
    if (perms.personnel.overtime) return { tab: 'personnel', personnelSubView: 'overtime' };
    if (perms.personnel.overtimeEntries) return { tab: 'personnel', personnelSubView: 'overtime_entries' };
    if (perms.personnel.evaluations) return { tab: 'personnel', personnelSubView: 'evaluations' };
    if (perms.personnel.bonus) return { tab: 'personnel', personnelSubView: 'bonus' };
    if (perms.personnel.training) return { tab: 'personnel', personnelSubView: 'training' };
    return { tab: 'personnel', personnelSubView: 'board' };
  }

  // 2. Se o usuário tem permissão para a tela inicial (Dashboard / Produção Geral) e possui Extrusão ou Ribbon ativos
  if (canViewHome) {
    return { tab: 'home' };
  }

  // 3. Se o usuário tem acesso ao módulo de Pessoal e Equipe
  if (hasPersonnel) {
    if (perms.personnel.board) return { tab: 'personnel', personnelSubView: 'board' };
    if (perms.personnel.vacations) return { tab: 'personnel', personnelSubView: 'vacations' };
    if (perms.personnel.lunch) return { tab: 'personnel', personnelSubView: 'lunch' };
    if (perms.personnel.overtime) return { tab: 'personnel', personnelSubView: 'overtime' };
    if (perms.personnel.overtimeEntries) return { tab: 'personnel', personnelSubView: 'overtime_entries' };
    if (perms.personnel.evaluations) return { tab: 'personnel', personnelSubView: 'evaluations' };
    if (perms.personnel.bonus) return { tab: 'personnel', personnelSubView: 'bonus' };
    if (perms.personnel.training) return { tab: 'personnel', personnelSubView: 'training' };
    return { tab: 'personnel', personnelSubView: 'board' };
  }

  // 4. Se o usuário tem acesso à Extrusão
  if (hasExtrusion) {
    if (perms.extrusion.summary) return { tab: 'extrusion', extrusionSubTab: 'dashboard', dashboardSubTab: 'summary' };
    if (perms.extrusion.charts) return { tab: 'extrusion', extrusionSubTab: 'dashboard', dashboardSubTab: 'charts' };
    if (perms.extrusion.comparison) return { tab: 'extrusion', extrusionSubTab: 'dashboard', dashboardSubTab: 'comparison' };
    if (perms.extrusion.reports) return { tab: 'extrusion', extrusionSubTab: 'reports' };
    if (perms.extrusion.stock) return { tab: 'extrusion', extrusionSubTab: 'stock' };
    if (perms.extrusion.newEntry) return { tab: 'extrusion', extrusionSubTab: 'dashboard', dashboardSubTab: 'summary' };
    return { tab: 'extrusion', extrusionSubTab: 'dashboard', dashboardSubTab: 'summary' };
  }

  // 5. Se o usuário tem acesso ao Corte de Fita
  if (hasRibbon) {
    if (perms.ribbon.summary) return { tab: 'ribbon', ribbonSubTab: 'dashboard', ribbonDashboardSubTab: 'summary' };
    if (perms.ribbon.charts) return { tab: 'ribbon', ribbonSubTab: 'dashboard', ribbonDashboardSubTab: 'charts' };
    if (perms.ribbon.comparison) return { tab: 'ribbon', ribbonSubTab: 'dashboard', ribbonDashboardSubTab: 'comparison' };
    if (perms.ribbon.reports) return { tab: 'ribbon', ribbonSubTab: 'reports' };
    if (perms.ribbon.productivity) return { tab: 'ribbon', ribbonSubTab: 'productivity' };
    return { tab: 'ribbon', ribbonSubTab: 'dashboard', ribbonDashboardSubTab: 'summary' };
  }

  // 6. Se o usuário tem acesso à Manutenção
  if (hasMaintenance) {
    return { tab: 'maintenance', maintenanceSubTab: perms.maintenance.requests ? 'requests' : 'causes' };
  }

  // 7. Se o usuário tem acesso à Projeção
  if (hasProjection) {
    return { tab: 'projection' };
  }

  // Fallback padrão seguro
  return { tab: 'personnel', personnelSubView: 'board' };
}
