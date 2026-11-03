import { Collaborator, Employee } from '../types';

/**
 * Normaliza strings para comparações seguras sem acentos e em minúsculas
 */
export const normalizeText = (val?: string | null): string => {
  return (val || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

export const isGenericPlaceholder = (text?: string | null): boolean => {
  if (!text) return false;
  const n = normalizeText(text);
  return (
    n === 'em contratacao' ||
    n === 'vaga em contratacao' ||
    n === 'vaga em aberto' ||
    n === 'vaga disponivel' ||
    n === 'vaga' ||
    n === 'novo slot' ||
    n === 'vaga aberta'
  );
};

/**
 * Verifica se um colaborador está silenciado no sistema
 */
export const isCollaboratorSilenced = (c?: Collaborator | null): boolean => {
  if (!c) return false;
  if (c.isSilenced === true) return true;

  const statusNorm = normalizeText((c as any).status);
  if (statusNorm.includes('silenciad')) return true;

  const nameNorm = normalizeText(c.name);
  if (nameNorm.includes('silenciad')) return true;

  return false;
};

/**
 * Verifica se um funcionário (slot/employee) está silenciado,
 * checando tanto seus próprios atributos quanto o vínculo com a base central de colaboradores.
 */
export const isEmployeeSilenced = (
  emp?: Employee | null,
  collaborators?: Collaborator[]
): boolean => {
  if (!emp) return false;
  if (emp.isSilenced === true) return true;

  const statusNorm = normalizeText(emp.status);
  if (statusNorm.includes('silenciad')) return true;

  const nameNorm = normalizeText(emp.name);
  if (nameNorm.includes('silenciad')) return true;

  // Vagas em contratação e placeholders de sistema nunca devem ser silenciados por coincidência de nome
  if (isGenericPlaceholder(emp.name) || statusNorm === 'em contratacao') {
    return false;
  }

  // Cruza com a lista de colaboradores da base de dados se fornecida
  if (collaborators && Array.isArray(collaborators) && collaborators.length > 0) {
    const matchedCol = collaborators.find(c => {
      if (emp.collaboratorId && c.id === emp.collaboratorId) return true;
      if (emp.registration && c.registration && emp.registration === c.registration) return true;
      if (emp.name && c.name && !isGenericPlaceholder(emp.name) && !isGenericPlaceholder(c.name) && normalizeText(emp.name) === normalizeText(c.name)) return true;
      return false;
    });

    if (matchedCol && isCollaboratorSilenced(matchedCol)) {
      return true;
    }
  }

  return false;
};

/**
 * Retorna um Set contendo todos os nomes normalizados de pessoas silenciadas no sistema.
 * Útil para filtros rápidos em dropdowns e listas de seleção de operadores.
 */
export const getSilencedNamesSet = (
  collaborators?: Collaborator[],
  employees?: Employee[]
): Set<string> => {
  const silencedNames = new Set<string>();

  if (collaborators && Array.isArray(collaborators)) {
    collaborators.forEach(c => {
      if (isCollaboratorSilenced(c)) {
        if (c.name && c.name.trim()) {
          silencedNames.add(normalizeText(c.name));
        }
      }
    });
  }

  if (employees && Array.isArray(employees)) {
    employees.forEach(e => {
      if (isEmployeeSilenced(e, collaborators)) {
        if (e.name && e.name.trim()) {
          silencedNames.add(normalizeText(e.name));
        }
      }
    });
  }

  return silencedNames;
};

/**
 * Verifica se um nome de operador está silenciado
 */
export const isOperatorNameSilenced = (
  name: string | undefined | null,
  silencedNamesSet: Set<string>
): boolean => {
  if (!name) return false;
  const norm = normalizeText(name);
  if (norm.includes('silenciad')) return true;
  return silencedNamesSet.has(norm);
};

/**
 * Cria um índice O(1) pré-computado para verificação instantânea de colaboradores silenciados.
 * Elimina 400.000 iterações em arrays aninhados por render no Quadro de Pessoal.
 */
export const getSilencedLookup = (collaborators?: Collaborator[]) => {
  const silencedIds = new Set<string>();
  const silencedRegs = new Set<string>();
  const silencedNames = new Set<string>();

  if (collaborators && Array.isArray(collaborators)) {
    for (let i = 0; i < collaborators.length; i++) {
      const c = collaborators[i];
      if (isCollaboratorSilenced(c)) {
        if (c.id) silencedIds.add(c.id);
        if (c.registration) silencedRegs.add(c.registration);
        if (c.name) silencedNames.add(normalizeText(c.name));
      }
    }
  }

  return {
    isSilenced: (emp?: Employee | null): boolean => {
      if (!emp) return false;
      if (emp.isSilenced === true) return true;
      const statusNorm = normalizeText(emp.status);
      if (statusNorm.includes('silenciad')) return true;
      const nameNorm = normalizeText(emp.name);
      if (nameNorm.includes('silenciad')) return true;
      if (isGenericPlaceholder(emp.name) || statusNorm === 'em contratacao') return false;
      if (emp.collaboratorId && silencedIds.has(emp.collaboratorId)) return true;
      if (emp.registration && silencedRegs.has(emp.registration)) return true;
      if (emp.name && silencedNames.has(nameNorm)) return true;
      return false;
    }
  };
};

