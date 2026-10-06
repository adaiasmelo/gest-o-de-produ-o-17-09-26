import { Collaborator, Employee } from '../types';
import { IMPORTED_COLLABORATORS } from '../constants/importedCollaborators';
import { normalizeText } from './silenceUtils';

const IMPORTED_REGS_SET = new Set(IMPORTED_COLLABORATORS.map(c => c.registration));

/**
 * Determina se um colaborador foi cadastrado recentemente (por padrão nos últimos 30 dias / 1 mês).
 * Permanece visível na seção de recentes por pelo menos um mês.
 */
export const isRecentCollaborator = (col?: Collaborator | null, maxDays = 30): boolean => {
  if (!col) return false;

  // 1. Prioriza createdAt explícito
  if (col.createdAt) {
    const createdTime = new Date(col.createdAt).getTime();
    if (!isNaN(createdTime)) {
      const diffDays = (Date.now() - createdTime) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= maxDays;
    }
  }

  // 2. Se não possui createdAt mas possui updatedAt recente e NÃO é um dos 75 originais do PDF
  if (col.updatedAt && !IMPORTED_REGS_SET.has(col.registration)) {
    const updatedTime = new Date(col.updatedAt).getTime();
    if (!isNaN(updatedTime)) {
      const diffDays = (Date.now() - updatedTime) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= maxDays;
    }
  }

  return false;
};

/**
 * Retorna quantos dias se passaram desde o cadastro (0 = hoje, 1 = ontem, etc.)
 */
export const getRecentDaysAgo = (col: Collaborator): number => {
  const timeStr = col.createdAt || col.updatedAt;
  if (!timeStr) return 0;
  const time = new Date(timeStr).getTime();
  if (isNaN(time)) return 0;
  const diffDays = Math.floor((Date.now() - time) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

/**
 * Formata texto amigável de quando foi cadastrado
 */
export const formatRecentRegistrationBadge = (col: Collaborator): string => {
  const days = getRecentDaysAgo(col);
  if (days === 0) return 'Cadastrado hoje';
  if (days === 1) return 'Cadastrado ontem';
  return `Cadastrado há ${days} dias`;
};

/**
 * Filtra e ordena colaboradores recentes (mais novos primeiro)
 */
export const getRecentCollaborators = (
  collaborators: Collaborator[],
  maxDays = 30
): Collaborator[] => {
  if (!Array.isArray(collaborators)) return [];
  return collaborators
    .filter(c => isRecentCollaborator(c, maxDays))
    .sort((a, b) => {
      const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return timeB - timeA;
    });
};

/**
 * Verifica se um colaborador já está inserido/alocado em algum posto ativo no Quadro Geral
 */
export const isCollaboratorAllocated = (
  col?: Collaborator | null,
  employees?: Employee[]
): boolean => {
  if (!col || !Array.isArray(employees)) return false;
  return employees.some((e) => {
    if (!e) return false;
    if (e.isSilenced) return false;
    const statusNorm = (e.status || '').toLowerCase();
    if (
      statusNorm.includes('excluid') ||
      statusNorm.includes('silenciad') ||
      statusNorm.includes('desligad') ||
      statusNorm.includes('demitid') ||
      statusNorm.includes('contratacao') ||
      statusNorm.includes('vaga')
    ) {
      return false;
    }
    // Precisa ter máquina/posto associado
    if (!e.machine || !e.machine.trim()) return false;

    if (col.id && e.collaboratorId && e.collaboratorId === col.id) return true;
    if (col.registration && e.registration && String(col.registration).trim() === String(e.registration).trim()) return true;
    if (col.name && e.name && normalizeText(e.name) === normalizeText(col.name)) return true;
    return false;
  });
};

/**
 * Filtra e retorna apenas colaboradores recentes (até 1 mês) que AINDA NÃO FORAM INSERIDOS EM NENHUM POSTO.
 * A partir do momento em que são inseridos no posto, somem da listagem de recém-cadastrados.
 */
export const getUnallocatedRecentCollaborators = (
  collaborators: Collaborator[],
  employees: Employee[],
  maxDays = 30
): Collaborator[] => {
  const recents = getRecentCollaborators(collaborators, maxDays);
  return recents.filter(col => !isCollaboratorAllocated(col, employees));
};
