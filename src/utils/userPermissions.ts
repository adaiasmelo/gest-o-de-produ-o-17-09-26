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
  evaluations: true,
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

export function createPresetPermissions(preset: 'readOnly' | 'operator' | 'supervisor' | 'admin'): UserPermissions {
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
        evaluations: true,
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
        evaluations: false,
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
        evaluations: true,
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
      evaluations: true,
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
        evaluations: true,
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

  // Extrusão
  const rawExt = perms?.extrusion;
  const extSummary = rawExt ? !!rawExt.summary : legacyDash;
  const extCharts = rawExt ? !!rawExt.charts : legacyDash;
  const extComparison = rawExt ? !!rawExt.comparison : legacyDash;
  const extReports = rawExt ? !!rawExt.reports : legacyReports;
  const extStock = rawExt ? !!rawExt.stock : (legacyDash || legacyReports);
  const extNewEntry = rawExt ? !!rawExt.newEntry : (legacyEdit && !isReadOnly);
  const extEnabled = rawExt 
    ? (rawExt.enabled && (extSummary || extCharts || extComparison || extReports || extStock || extNewEntry)) 
    : (extSummary || extCharts || extComparison || extReports || extStock || extNewEntry);

  // Ribbon
  const rawRib = perms?.ribbon;
  const ribSummary = rawRib ? !!rawRib.summary : legacyDash;
  const ribCharts = rawRib ? !!rawRib.charts : legacyDash;
  const ribComparison = rawRib ? !!rawRib.comparison : legacyDash;
  const ribReports = rawRib ? !!rawRib.reports : legacyReports;
  const ribProductivity = rawRib ? !!rawRib.productivity : legacyReports;
  const ribNewEntry = rawRib ? !!rawRib.newEntry : (legacyEdit && !isReadOnly);
  const ribEnabled = rawRib 
    ? (rawRib.enabled && (ribSummary || ribCharts || ribComparison || ribReports || ribProductivity || ribNewEntry)) 
    : (ribSummary || ribCharts || ribComparison || ribReports || ribProductivity || ribNewEntry);

  // Pessoal
  const rawPers = perms?.personnel;
  const persBoard = rawPers ? !!rawPers.board : legacyPersonnel;
  const persVacations = rawPers ? !!rawPers.vacations : legacyPersonnel;
  const persTraining = rawPers ? !!rawPers.training : legacyPersonnel;
  const persLunch = rawPers ? !!rawPers.lunch : legacyPersonnel;
  const persOvertime = rawPers ? !!rawPers.overtime : legacyPersonnel;
  const persEvaluations = rawPers ? !!rawPers.evaluations : legacyPersonnel;
  const persManage = rawPers ? !!rawPers.manage : (legacyManagePers && !isReadOnly);
  const persEnabled = rawPers 
    ? (rawPers.enabled && (persBoard || persVacations || persTraining || persLunch || persOvertime || persEvaluations || persManage)) 
    : (persBoard || persVacations || persTraining || persLunch || persOvertime || persEvaluations || persManage);

  // Manutenção
  const rawMaint = perms?.maintenance;
  const maintRequests = rawMaint ? !!rawMaint.requests : true;
  const maintCauses = rawMaint ? !!rawMaint.causes : true;
  const maintNewRequest = rawMaint ? !!rawMaint.newRequest : !isReadOnly;
  const maintEnabled = rawMaint 
    ? (rawMaint.enabled && (maintRequests || maintCauses || maintNewRequest)) 
    : (maintRequests || maintCauses || maintNewRequest);

  // Projeção
  const rawProj = perms?.projection;
  const projEnabled = rawProj ? !!rawProj.enabled : legacyDash;

  // Configurações
  const rawSet = perms?.settings;
  const setFilters = rawSet ? !!rawSet.filters : legacySettings;
  const setGoals = rawSet ? !!rawSet.goals : legacySettings;
  const setConfig = rawSet ? !!rawSet.config : legacySettings;
  const setSystem = rawSet ? !!rawSet.system : legacySettings;
  const setApp = rawSet ? !!rawSet.app : legacySettings;
  const setEnabled = rawSet 
    ? (rawSet.enabled && (setFilters || setGoals || setConfig || setSystem || setApp)) 
    : (legacySettings && (setFilters || setGoals || setConfig || setSystem || setApp));

  return {
    isReadOnly,
    canViewDashboard: extSummary || extCharts || ribSummary || ribCharts,
    canViewReports: extReports || ribReports,
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
      evaluations: persEvaluations,
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
