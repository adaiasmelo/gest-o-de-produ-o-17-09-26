// Gerenciador e Detector de Atualizações Cloudflare / Git em Tempo Real

export interface VersionInfo {
  version: number;
  buildTime: string;
  timestamp?: number;
  tag?: string;
  updateNotes?: string;
}

// Injetado dinamicamente durante o build no Vite
export const LOCAL_BUILD_TIME: string = typeof __APP_BUILD_TIME__ !== 'undefined' 
  ? __APP_BUILD_TIME__ 
  : "2026-09-24T21:00:00Z";

export const LOCAL_BUILD_TIMESTAMP: number = typeof __APP_BUILD_TIMESTAMP__ !== 'undefined'
  ? __APP_BUILD_TIMESTAMP__
  : 0;

export const LOCAL_BUILD_TAG: string = typeof __APP_BUILD_TAG__ !== 'undefined'
  ? __APP_BUILD_TAG__
  : '';

let isChecking = false;

/**
 * Busca o arquivo de versão no Cloudflare com cache desativado
 */
export async function fetchRemoteVersion(): Promise<VersionInfo | null> {
  if (isChecking) return null;
  isChecking = true;
  try {
    const url = `/version.json?_t=${Date.now()}`;
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      console.warn('[UpdateManager] /version.json retornou status HTTP', res.status);
      return null;
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      console.warn('[UpdateManager] /version.json retornou tipo não-JSON:', contentType);
      return null;
    }

    const data: VersionInfo = await res.json();
    return data;
  } catch (err) {
    console.warn('[UpdateManager] Erro ao buscar /version.json:', err);
    return null;
  } finally {
    isChecking = false;
  }
}

export function dismissVersion(versionOrTag?: string): void {
  if (typeof window !== 'undefined' && versionOrTag) {
    try {
      sessionStorage.setItem('manupackaging_acknowledged_version', versionOrTag);
    } catch {}
  }
}

/**
 * Verifica se a versão remota do Cloudflare é estritamente mais recente que a local
 */
export function isNewerVersion(remote: VersionInfo | null | undefined): boolean {
  if (!remote) return false;

  if (typeof window !== 'undefined') {
    // Se acabou de atualizar nos últimos 90 segundos, bloqueia qualquer novo disparo
    const lastUpdateTs = Number(sessionStorage.getItem('last_update_ts') || '0');
    if (Date.now() - lastUpdateTs < 90000) {
      return false;
    }
    // Se a versão já foi aceita ou pausada nesta sessão
    const acknowledged = sessionStorage.getItem('manupackaging_acknowledged_version');
    if (acknowledged && (acknowledged === String(remote.version) || acknowledged === remote.tag || acknowledged === remote.buildTime)) {
      return false;
    }
  }
  
  // 1. Se os timestamps numéricos forem válidos
  if (remote.version && LOCAL_BUILD_TIMESTAMP > 0) {
    // Só é nova versão se for ESTRITAMENTE maior que a compilação local
    if (remote.version > LOCAL_BUILD_TIMESTAMP) {
      console.log('[UpdateManager] Nova versão detectada por timestamp maior:', {
        remote: remote.version,
        local: LOCAL_BUILD_TIMESTAMP,
        tag: remote.tag
      });
      return true;
    }
    return false;
  }

  // 2. Se a data/hora ISO de build remota for mais recente
  if (remote.buildTime && LOCAL_BUILD_TIME && remote.buildTime !== LOCAL_BUILD_TIME) {
    const remoteDate = new Date(remote.buildTime).getTime();
    const localDate = new Date(LOCAL_BUILD_TIME).getTime();
    if (!isNaN(remoteDate) && !isNaN(localDate)) {
      if (remoteDate > localDate) {
        console.log('[UpdateManager] Nova versão detectada por buildTime mais recente:', {
          remote: remote.buildTime,
          local: LOCAL_BUILD_TIME
        });
        return true;
      }
      return false;
    }
  }

  // 3. Se a tag for diferente e estritamente maior
  if (remote.tag && LOCAL_BUILD_TAG && remote.tag > LOCAL_BUILD_TAG) {
    console.log('[UpdateManager] Nova versão detectada por tag superior:', {
      remote: remote.tag,
      local: LOCAL_BUILD_TAG
    });
    return true;
  }

  return false;
}

/**
 * Executa a atualização completa:
 * 1. Força o novo Service Worker a ativar (skipWaiting)
 * 2. Esvazia caches locais obsoletos
 * 3. Recarrega a aplicação com os novos assets do Cloudflare
 */
export async function executeAppUpdate(): Promise<void> {
  console.log('[UpdateManager] Executando atualização do sistema solicitada pelo usuário...');
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('last_update_ts', Date.now().toString());
    }

    // 1. Notificar Service Worker para assumir controle imediatamente
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        await reg.update().catch(() => {});
      }
    }

    // 2. Chamar o handler oficial do virtual:pwa-register se estiver montado
    if (typeof (window as any).refreshAppVersion === 'function') {
      try {
        (window as any).refreshAppVersion();
      } catch (e) {
        console.warn('Erro ao chamar refreshAppVersion:', e);
      }
    }

    // 3. Limpar caches desatualizados do navegador (CacheStorage)
    if ('caches' in window) {
      try {
        const cacheKeys = await caches.keys();
        await Promise.all(
          cacheKeys.map(key => caches.delete(key))
        );
      } catch (cacheErr) {
        console.warn('Erro ao limpar caches do navegador:', cacheErr);
      }
    }
  } catch (err) {
    console.warn('Erro durante preparação do reload de atualização:', err);
  } finally {
    // 4. Recarregar a página com parâmetro de limpeza de cache
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('_update', Date.now().toString());
    window.location.replace(currentUrl.toString());
  }
}

