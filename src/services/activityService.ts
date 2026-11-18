import {
  fetchCollectionSmartFromSupabase,
  upsertCollectionItemSmartToSupabase,
  saveKvCollectionToSupabase,
  subscribeSupabaseTableChanges
} from '../lib/supabase';
import { UserActivityLog, UserActivityType, ActiveSession } from '../types';

const ACTIVITY_CACHE_KEY = 'manupackaging_user_activity_logs_cache';
const MAX_LOCAL_CACHE = 80;

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
let lastPresenceTouchMs = 0;

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
 * pelos usuários no Supabase, atualizando também a presença em tempo real.
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

  if (type === 'screen_view') {
    if (
      lastNavigation.screen === screen &&
      lastNavigation.subScreen === (subScreen || '') &&
      nowMs - lastNavigation.timestamp < 30000
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

  try {
    const cached = loadActivityLogsFromCache();
    const updated = [newLog, ...cached.filter(c => c.id !== id)].slice(0, MAX_LOCAL_CACHE);
    saveActivityLogsToCache(updated);
  } catch (err) {
    console.warn('Falha ao atualizar cache local de atividade:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('user_activity_recorded', { detail: newLog }));
  }

  // 1. Grava no Supabase no histórico de atividades (máximo 80 registros recentes)
  try {
    await upsertCollectionItemSmartToSupabase('user_activity_logs', newLog, 80);
  } catch (err) {
    console.warn('Erro ao salvar log de atividade no Supabase:', err);
  }

  // 2. Atualiza a sessão ativa no máximo 1x a cada 60s para screen_view (ou sempre para ações/auth)
  if (type !== 'screen_view' || nowMs - lastPresenceTouchMs >= 60000) {
    lastPresenceTouchMs = nowMs;
    try {
      const sessionId = user.id || user.registration;
      const sessionItem: ActiveSession = {
        id: sessionId,
        name: user.name,
        registration: user.registration,
        role: user.role,
        currentScreen: screen,
        currentSubScreen: subScreen || '',
        lastAction: action + (details ? ` (${details})` : ''),
        lastActionTime: timestamp,
        lastSeen: timestamp,
        loginTime: timestamp,
        device
      };
      await upsertCollectionItemSmartToSupabase('active_sessions', sessionItem, 100);
    } catch (err) {
      console.warn('Erro ao atualizar tela na sessão ativa (Supabase):', err);
    }
  }

  return newLog;
};

/**
 * Escuta em tempo real o histórico de todas as telas e atividades via Supabase
 */
export const subscribeUserActivities = (
  onData: (logs: UserActivityLog[]) => void,
  onError?: (error: any) => void
) => {
  const cached = loadActivityLogsFromCache();
  if (cached.length > 0) {
    onData(cached);
  }

  let isActive = true;

  let lastRemoteFetchMs = 0;

  const fetchLatest = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastRemoteFetchMs < 20000) return;
    lastRemoteFetchMs = now;
    try {
      const logs = await fetchCollectionSmartFromSupabase<UserActivityLog>('user_activity_logs');
      if (!isActive) return;
      if (logs.length > 0) {
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        saveActivityLogsToCache(logs);
        onData(logs);
      }
    } catch (err) {
      if (onError) onError(err);
    }
  };

  fetchLatest(true);

  const unsubRealtime = subscribeSupabaseTableChanges('activity_logs_realtime', ['settings'], (tbl, payload) => {
    if (tbl !== 'settings') return;
    const changedId = payload?.new?.id || payload?.old?.id;
    if (changedId !== 'kv_user_activity_logs') return;
    const items = payload?.new?.data?.items;
    if (Array.isArray(items)) {
      const sorted = [...items].sort((a: UserActivityLog, b: UserActivityLog) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      saveActivityLogsToCache(sorted);
      if (isActive) onData(sorted);
    } else {
      fetchLatest(false);
    }
  });

  const handleLocalEvent = (e: Event) => {
    const custom = e as CustomEvent<UserActivityLog>;
    if (custom.detail && isActive) {
      onData(loadActivityLogsFromCache());
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('user_activity_recorded', handleLocalEvent);
  }

  return () => {
    isActive = false;
    if (unsubRealtime) unsubRealtime();
    if (typeof window !== 'undefined') {
      window.removeEventListener('user_activity_recorded', handleLocalEvent);
    }
  };
};

/**
 * Exclusão em lote do histórico de atividades no Supabase
 */
export const clearUserActivities = async (logsToDelete: UserActivityLog[]) => {
  if (logsToDelete.length === 0) return;
  await saveKvCollectionToSupabase('user_activity_logs', []);
  saveActivityLogsToCache([]);
};
