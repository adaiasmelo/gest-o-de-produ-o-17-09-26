import { Collaborator } from '../types';
import { IMPORTED_COLLABORATORS } from '../constants/importedCollaborators';

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
