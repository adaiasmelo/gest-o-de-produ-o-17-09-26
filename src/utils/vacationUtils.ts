import { Employee, Vacation } from '../types';
import { normalizeText } from './silenceUtils';

/**
 * Normaliza qualquer formato de data (YYYY-MM-DD, DD/MM/YYYY, DD/MM, ISO) para string "YYYY-MM-DD".
 */
export function parseDateToYMD(dateStr?: string | null, fallbackYear?: number): string | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  if (!str) return null;

  // 1. Formato YYYY-MM-DD ou YYYY-MM-DDTHH...
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = String(isoMatch[2]).padStart(2, '0');
    const d = String(isoMatch[3]).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 2. Formato DD/MM/YYYY ou DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const d = String(dmyMatch[1]).padStart(2, '0');
    const m = String(dmyMatch[2]).padStart(2, '0');
    const y = dmyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // 3. Formato DD/MM ou DD-MM (sem ano especificado)
  const dmMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (dmMatch) {
    const d = String(dmMatch[1]).padStart(2, '0');
    const m = String(dmMatch[2]).padStart(2, '0');
    const y = fallbackYear || new Date().getFullYear();
    return `${y}-${m}-${d}`;
  }

  // 4. Tentativa via Date parser nativo
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return null;
}

/**
 * Obtém a data de referência no formato "YYYY-MM-DD".
 * Se targetDate não for fornecida ou for inválida, utiliza a data atual do sistema (hoje).
 */
export function getReferenceDateYMD(targetDate?: string | null): string {
  if (targetDate) {
    const parsed = parseDateToYMD(targetDate);
    if (parsed) return parsed;
  }
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Verifica se um operador está em período de férias considerando apenas o status direto do card da tela de pessoal.
 * 
 * Regra:
 * - Se o status no card da tela de pessoal NÃO for 'Férias' (ex: 'Ativo'):
 *   O operador está apto para lançamentos de qualquer data (atual ou anterior) -> retorna false.
 * - Se o colaborador estiver com status 'Férias' no card da tela de pessoal:
 *   - Se houver data de retorno prevista (ex: retorno em 03/10):
 *     - Até o dia anterior ao retorno (hoje < retorno), ele continua afastado -> retorna true (não aparece no select).
 *     - A partir da data de retorno (hoje >= retorno), ele já retornou e volta automaticamente -> retorna false (aparece no select).
 *   - Se não houver data de retorno cadastrada, considera em férias -> retorna true.
 */
export function isOperatorOnVacation(
  emp?: Employee | null,
  _referenceDate?: string | null,
  _vacations?: Vacation[]
): boolean {
  if (!emp) return false;

  const statusNorm = normalizeText(emp.status);
  // Se o status no card NÃO for de férias, o operador está disponível para qualquer data de lançamento
  if (!statusNorm.includes('feria')) {
    return false;
  }

  // Se o card está marcado como 'Férias', verifica se já atingiu a data de retorno prevista (comparada a hoje)
  let returnDateStr = emp.returnDate;

  // Se returnDate não estiver explícito no campo, tenta extrair de statusDetails
  if (!returnDateStr && emp.statusDetails) {
    const match = emp.statusDetails.match(/(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/);
    if (match) {
      returnDateStr = match[1];
    }
  }

  if (returnDateStr) {
    const todayYMD = getReferenceDateYMD(); // Data atual de hoje
    const todayYear = parseInt(todayYMD.split('-')[0], 10) || new Date().getFullYear();
    const retYMD = parseDateToYMD(returnDateStr, todayYear);
    if (retYMD) {
      // Se a data de hoje for anterior ao dia de retorno, o colaborador ainda está de férias
      if (todayYMD < retYMD) {
        return true;
      }
      // A partir da data de retorno (hoje >= retorno), ele já voltou automaticamente!
      return false;
    }
  }

  // Se o status for 'Férias' e não houver data de retorno identificada, considera de férias
  return true;
}

/**
 * Retorna um Set com todos os nomes normalizados de operadores que estão com card de férias na tela de pessoal.
 */
export function getVacationingOperatorNamesSet(
  employees?: Employee[],
  _referenceDate?: string | null,
  _vacations?: Vacation[]
): Set<string> {
  const set = new Set<string>();
  if (!employees || !Array.isArray(employees)) return set;

  employees.forEach(emp => {
    if (isOperatorOnVacation(emp)) {
      if (emp.name && emp.name.trim()) {
        set.add(normalizeText(emp.name));
      }
    }
  });

  return set;
}
