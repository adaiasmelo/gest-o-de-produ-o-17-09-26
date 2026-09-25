import { doc, setDoc, collection, onSnapshot, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserActivityLog, UserActivityType } from '../types';

const ACTIVITY_CACHE_KEY = 'manupackaging_user_activity_logs_cache';
const MAX_LOCAL_CACHE = 200;

interface LastNavigationTracker {
  screen: string;
  subScreen?: string;
  timestamp: number;
}

let lastNavigation: LastNavigationTracker = {
  screen: '',
  subScreen: '',
  timestamp: 0
};

export const loadActivityLogsFromCache = (): UserActivityLog[] => {
  try {
    const raw = localStorage.getItem(ACTIVITY_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Erro ao carregar cache de atividades:', e);
    return [];
  }
};

export const saveActivityLogsToCache = (logs: UserActivityLog[]) => {
  try {
    const trimmed = logs.slice(0, MAX_LOCAL_CACHE);
    localStorage.setItem(ACTIVITY_CACHE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Erro ao salvar cache de atividades:', e);
  }
};

export interface RecordActivityParams {
  user?: {
    id?: string;
    name: string;
    registration: string;
    role: string;
  } | null;
  type: UserActivityType;
  screen: string;
  subScreen?: string;
  action: string;
  details?: string;
}

/**
 * Registra o histórico persistente de navegação de telas e ações executadas
 * pelos usuários, atualizando também a presença em tempo real.
 */
export const recordUserActivity = async ({
  user,
  type,
  screen,
  subScreen,
  action,
  details
}: RecordActivityParams): Promise<UserActivityLog | null> => {
  if (!user || !user.name) return null;

  const nowMs = Date.now();

  // Previne duplicação excessiva caso a mesma tela seja informada em loop em menos de 4 segundos
  if (type === 'screen_view') {
    if (
      lastNavigation.screen === screen &&
      lastNavigation.subScreen === (subScreen || '') &&
      nowMs - lastNavigation.timestamp < 4000
    ) {
      return null;
    }
    lastNavigation = {
      screen,
      subScreen: subScreen || '',
      timestamp: nowMs
    };
  }

  const id = `${nowMs.toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
  const timestamp = new Date().toISOString();
  const device = typeof window !== 'undefined' && window.innerWidth < 768 ? 'Mobile' : 'Desktop';

  const newLog: UserActivityLog = {
    id,
    userId: user.id || user.registration,
    name: user.name,
    registration: user.registration,
    role: user.role,
    type,
    screen,
    subScreen: subScreen || undefined,
    action,
    details: details || undefined,
    timestamp,
    device
  };

  // Salva no cache local imediatamente
  try {
    const cached = loadActivityLogsFromCache();
    const updated = [newLog, ...cached.filter(c => c.id !== id)].slice(0, MAX_LOCAL_CACHE);
    saveActivityLogsToCache(updated);
  } catch (err) {
    console.warn('Falha ao atualizar cache local de atividade:', err);
  }

  // Notifica componentes locais
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('user_activity_recorded', { detail: newLog }));
  }

  // 1. Grava no Firestore no histórico permanente de atividades
  try {
    await setDoc(doc(db, 'user_activity_logs', id), newLog);
  } catch (err) {
    console.warn('Erro ao salvar log de atividade no Firestore:', err);
  }

  // 2. Atualiza a sessão ativa do usuário com a tela e ação atual (para visualização em tempo real)
  try {
    const sessionId = user.id || user.registration;
    await setDoc(
      doc(db, 'active_sessions', sessionId),
      {
        id: sessionId,
        name: user.name,
        registration: user.registration,
        role: user.role,
        currentScreen: screen,
        currentSubScreen: subScreen || '',
        lastAction: action + (details ? ` (${details})` : ''),
        lastActionTime: timestamp,
        lastSeen: timestamp,
        device
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Erro ao atualizar tela na sessão ativa:', err);
  }

  return newLog;
};

/**
 * Escuta em tempo real o histórico de todas as telas e atividades realizadas por todos os usuários
 */
export const subscribeUserActivities = (
  onData: (logs: UserActivityLog[]) => void,
  onError?: (error: any) => void
) => {
  return onSnapshot(
    collection(db, 'user_activity_logs'),
    (snapshot) => {
      const logs = snapshot.docs.map((docSnap) => ({
        ...docSnap.data(),
        id: docSnap.id
      })) as UserActivityLog[];

      // Ordena por data decrescente (mais recentes primeiro)
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Atualiza o cache local
      saveActivityLogsToCache(logs);
      onData(logs);
    },
    (err) => {
      console.warn('Erro ao escutar user_activity_logs:', err);
      if (onError) onError(err);
      // Fallback para cache local se offline
      const cached = loadActivityLogsFromCache();
      if (cached.length > 0) onData(cached);
    }
  );
};

/**
 * Exclusão em lote do histórico de atividades (acesso restrito para administradores)
 */
export const clearUserActivities = async (logsToDelete: UserActivityLog[]) => {
  if (logsToDelete.length === 0) return;
  const batch = writeBatch(db);
  // Firestore suporta no máximo 500 operações por batch
  const limitBatch = logsToDelete.slice(0, 450);
  limitBatch.forEach((log) => {
    batch.delete(doc(db, 'user_activity_logs', log.id));
  });
  await batch.commit();

  // Limpa o cache local
  const remainingIds = new Set(limitBatch.map(l => l.id));
  const cached = loadActivityLogsFromCache().filter(l => !remainingIds.has(l.id));
  saveActivityLogsToCache(cached);
};
