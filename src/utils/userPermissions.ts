import { 
  UserPermissions, 
  ExtrusionPermissions, 
  RibbonPermissions, 
  PersonnelPermissions, 
  MaintenancePermissions, 
  ProjectionPermissions, 
  SettingsPermissions 
} from '../types';

export const DEFAULT_EXTRUSION_PERMISSIONS: ExtrusionPermissions = {
  enabled: true,
  summary: true,
  charts: true,
  comparison: true,
  reports: true,
  stock: true,
  newEntry: true
};

export const DEFAULT_RIBBON_PERMISSIONS: RibbonPermissions = {
  enabled: true,
  summary: true,
  charts: true,
  comparison: true,
  reports: true,
  productivity: true,
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
      extrusion: {
        enabled: false,
        summary: false,
        charts: false,
        comparison: false,
        reports: false,
        stock: false,
        newEntry: false
      },
      ribbon: {
        enabled: false,
        summary: false,
        charts: false,
        comparison: false,
        reports: false,
        productivity: false,
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
      extrusion: {
        enabled: true,
        summary: true,
        charts: true,
        comparison: true,
        reports: true,
        stock: true,
        newEntry: false
      },
      ribbon: {
        enabled: true,
        summary: true,
        charts: true,
        comparison: true,
        reports: true,
        productivity: true,
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
      extrusion: {
        enabled: true,
        summary: true,
        charts: true,
        comparison: true,
        reports: true,
        stock: true,
        newEntry: true
      },
      ribbon: {
        enabled: true,
        summary: true,
        charts: true,
        comparison: true,
        reports: true,
        productivity: true,
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
      extrusion: {
        enabled: true,
        summary: true,
        charts: true,
        comparison: true,
        reports: true,
        stock: true,
        newEntry: true
      },
      ribbon: {
        enabled: true,
        summary: true,
        charts: true,
        comparison: true,
        reports: true,
        productivity: true,
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
    extrusion: {
      enabled: true,
      summary: true,
      charts: true,
      comparison: true,
      reports: true,
      stock: true,
      newEntry: true
    },
    ribbon: {
      enabled: true,
      summary: true,
      charts: true,
      comparison: true,
      reports: true,
      productivity: true,
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
      extrusion: {
        enabled: true,
        summary: true,
        charts: true,
        comparison: true,
        reports: true,
        stock: true,
        newEntry: true
      },
      ribbon: {
        enabled: true,
        summary: true,
        charts: true,
        comparison: true,
        reports: true,
        productivity: true,
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

  const legacyDash = perms?.canViewDashboard !== false;
  const legacyReports = perms?.canViewReports !== false;
  const legacyPersonnel = perms?.canViewPersonnel !== false;
  const legacySettings = !!perms?.canManageSettings;
  const legacyEdit = perms?.canEditProduction !== false;
  const legacyManagePers = !!perms?.canManagePersonnel;
  const isReadOnly = !!perms?.isReadOnly;

  // Detecta se o objeto já utiliza o sistema granular de módulos
  const hasGranular = !!perms && (
    perms.extrusion !== undefined || 
    perms.ribbon !== undefined || 
    perms.personnel !== undefined || 
    perms.maintenance !== undefined || 
    perms.settings !== undefined
  );

  // Extrusão
  const rawExt = perms?.extrusion;
  const extSummary = rawExt ? !!rawExt.summary : (hasGranular ? false : legacyDash);
  const extCharts = rawExt ? !!rawExt.charts : (hasGranular ? false : legacyDash);
  const extComparison = rawExt ? !!rawExt.comparison : (hasGranular ? false : legacyDash);
  const extReports = rawExt ? !!rawExt.reports : (hasGranular ? false : legacyReports);
  const extStock = rawExt ? !!rawExt.stock : (hasGranular ? false : (legacyDash || legacyReports));
  const extNewEntry = rawExt ? !!rawExt.newEntry : (hasGranular ? false : (legacyEdit && !isReadOnly));
  const extEnabled = rawExt 
    ? (rawExt.enabled && (extSummary || extCharts || extComparison || extReports || extStock || extNewEntry)) 
    : (hasGranular ? false : (extSummary || extCharts || extComparison || extReports || extStock || extNewEntry));

  // Ribbon
  const rawRib = perms?.ribbon;
  const ribSummary = rawRib ? !!rawRib.summary : (hasGranular ? false : legacyDash);
  const ribCharts = rawRib ? !!rawRib.charts : (hasGranular ? false : legacyDash);
  const ribComparison = rawRib ? !!rawRib.comparison : (hasGranular ? false : legacyDash);
  const ribReports = rawRib ? !!rawRib.reports : (hasGranular ? false : legacyReports);
  const ribProductivity = rawRib ? !!rawRib.productivity : (hasGranular ? false : legacyReports);
  const ribNewEntry = rawRib ? !!rawRib.newEntry : (hasGranular ? false : (legacyEdit && !isReadOnly));
  const ribEnabled = rawRib 
    ? (rawRib.enabled && (ribSummary || ribCharts || ribComparison || ribReports || ribProductivity || ribNewEntry)) 
    : (hasGranular ? false : (ribSummary || ribCharts || ribComparison || ribReports || ribProductivity || ribNewEntry));

  // Pessoal
  const rawPers = perms?.personnel;
  const persBoard = rawPers ? !!rawPers.board : (hasGranular ? false : legacyPersonnel);
  const persVacations = rawPers ? !!rawPers.vacations : (hasGranular ? false : legacyPersonnel);
  const persTraining = rawPers ? !!rawPers.training : (hasGranular ? false : legacyPersonnel);
  const persLunch = rawPers ? !!rawPers.lunch : (hasGranular ? false : legacyPersonnel);
  const persOvertime = rawPers ? !!rawPers.overtime : (hasGranular ? false : legacyPersonnel);
  const persOvertimeEntries = rawPers ? (rawPers.overtimeEntries !== undefined ? !!rawPers.overtimeEntries : !!rawPers.overtime) : (hasGranular ? false : legacyPersonnel);
  const persEvaluations = rawPers ? !!rawPers.evaluations : (hasGranular ? false : legacyPersonnel);
  const persReports = rawPers ? (rawPers.reports !== undefined ? !!rawPers.reports : legacyReports) : (hasGranular ? false : legacyReports);
  const persManage = rawPers ? !!rawPers.manage : (hasGranular ? false : (legacyManagePers && !isReadOnly));
  const persEnabled = rawPers 
    ? (rawPers.enabled && (persBoard || persVacations || persTraining || persLunch || persOvertime || persOvertimeEntries || persEvaluations || persReports || persManage)) 
    : (hasGranular ? false : (persBoard || persVacations || persTraining || persLunch || persOvertime || persOvertimeEntries || persEvaluations || persReports || persManage));

  // Manutenção
  const rawMaint = perms?.maintenance;
  const maintRequests = rawMaint ? !!rawMaint.requests : (hasGranular ? false : true);
  const maintCauses = rawMaint ? !!rawMaint.causes : (hasGranular ? false : true);
  const maintNewRequest = rawMaint ? !!rawMaint.newRequest : (hasGranular ? false : !isReadOnly);
  const maintEnabled = rawMaint 
    ? (rawMaint.enabled && (maintRequests || maintCauses || maintNewRequest)) 
    : (hasGranular ? false : (maintRequests || maintCauses || maintNewRequest));

  // Projeção
  const rawProj = perms?.projection;
  const projEnabled = rawProj ? !!rawProj.enabled : (hasGranular ? false : legacyDash);

  // Configurações
  const rawSet = perms?.settings;
  const setFilters = rawSet ? !!rawSet.filters : (hasGranular ? false : legacySettings);
  const setGoals = rawSet ? !!rawSet.goals : (hasGranular ? false : legacySettings);
  const setConfig = rawSet ? !!rawSet.config : (hasGranular ? false : legacySettings);
  const setSystem = rawSet ? !!rawSet.system : (hasGranular ? false : legacySettings);
  const setApp = rawSet ? !!rawSet.app : (hasGranular ? false : legacySettings);
  const setEnabled = rawSet 
    ? (rawSet.enabled && (setFilters || setGoals || setConfig || setSystem || setApp)) 
    : (hasGranular ? false : (legacySettings && (setFilters || setGoals || setConfig || setSystem || setApp)));

  // O Painel Geral / Início depende do switch explícito canViewDashboard se definido, ou se o usuário possui acesso à Extrusão/Ribbon
  const canViewHomeExplicit = perms?.canViewDashboard !== undefined 
    ? !!perms.canViewDashboard 
    : (hasGranular ? false : ((extSummary || extCharts || ribSummary || ribCharts) && legacyDash));

  return {
    isReadOnly,
    canViewDashboard: canViewHomeExplicit,
    canViewReports: extReports || ribReports || persReports,
    canViewPersonnel: persBoard,
    canManageSettings: setEnabled,
    canEditProduction: (extNewEntry || ribNewEntry) && !isReadOnly,
    canManagePersonnel: persManage && !isReadOnly,
    extrusion: {
      enabled: extEnabled,
      summary: extSummary,
      charts: extCharts,
      comparison: extComparison,
      reports: extReports,
      stock: extStock,
      newEntry: extNewEntry
    },
    ribbon: {
      enabled: ribEnabled,
      summary: ribSummary,
      charts: ribCharts,
      comparison: ribComparison,
      reports: ribReports,
      productivity: ribProductivity,
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
  personnelSubView?: 'board' | 'vacations' | 'training' | 'lunch' | 'overtime' | 'overtime_entries' | 'evaluations';
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

  // 1. Caso Especial Prioritário: Usuário com foco em Pessoal / Horas Extras (sem acesso à produção geral da fábrica)
  if (hasPersonnel && !canExtrusionHome && !canRibbonHome) {
    if (perms.personnel.overtime && !perms.personnel.overtimeEntries && !perms.personnel.board) {
      return { tab: 'personnel', personnelSubView: 'overtime' };
    }
    if (perms.personnel.overtimeEntries && !perms.personnel.overtime && !perms.personnel.board) {
      return { tab: 'personnel', personnelSubView: 'overtime_entries' };
    }
    if (perms.personnel.overtimeEntries) return { tab: 'personnel', personnelSubView: 'overtime_entries' };
    if (perms.personnel.overtime) return { tab: 'personnel', personnelSubView: 'overtime' };
    if (perms.personnel.board) return { tab: 'personnel', personnelSubView: 'board' };
    if (perms.personnel.vacations) return { tab: 'personnel', personnelSubView: 'vacations' };
    if (perms.personnel.training) return { tab: 'personnel', personnelSubView: 'training' };
    if (perms.personnel.lunch) return { tab: 'personnel', personnelSubView: 'lunch' };
    if (perms.personnel.evaluations) return { tab: 'personnel', personnelSubView: 'evaluations' };
    return { tab: 'personnel', personnelSubView: 'overtime_entries' };
  }

  // 2. Se o usuário tem permissão para a tela inicial (Dashboard / Produção Geral) e possui Extrusão ou Ribbon ativos
  if (canViewHome) {
    return { tab: 'home' };
  }

  // 3. Se o usuário tem acesso ao módulo de Pessoal e Equipe
  if (hasPersonnel) {
    if (perms.personnel.overtimeEntries) return { tab: 'personnel', personnelSubView: 'overtime_entries' };
    if (perms.personnel.overtime) return { tab: 'personnel', personnelSubView: 'overtime' };
    if (perms.personnel.board) return { tab: 'personnel', personnelSubView: 'board' };
    if (perms.personnel.vacations) return { tab: 'personnel', personnelSubView: 'vacations' };
    if (perms.personnel.training) return { tab: 'personnel', personnelSubView: 'training' };
    if (perms.personnel.lunch) return { tab: 'personnel', personnelSubView: 'lunch' };
    if (perms.personnel.evaluations) return { tab: 'personnel', personnelSubView: 'evaluations' };
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
  return { tab: 'personnel', personnelSubView: 'overtime_entries' };
}
