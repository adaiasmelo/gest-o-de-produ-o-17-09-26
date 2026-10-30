// IndexedDB storage for large media files (Intro / Opening Videos)
// This avoids localStorage 5MB quota errors and Firestore 1MB document limits.

const DB_NAME = 'manupackaging_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'intro_video';
const VIDEO_KEY = 'system_intro_video';

interface StoredVideo {
  id: string;
  blob: Blob;
  name: string;
  size: number;
  type: string;
  updatedAt: string;
}

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB não suportado neste navegador'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
};

export const saveIntroVideo = async (file: File | Blob, name?: string): Promise<string> => {
  const db = await openDB();
  const fileName = name || (file instanceof File ? file.name : 'intro_video.mp4');
  const record: StoredVideo = {
    id: VIDEO_KEY,
    blob: file,
    name: fileName,
    size: file.size,
    type: file.type || 'video/mp4',
    updatedAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const putReq = store.put(record);

    putReq.onsuccess = () => {
      const url = URL.createObjectURL(file);
      try {
        localStorage.setItem(
          'manupackaging_intro_video_meta',
          JSON.stringify({
            hasVideo: true,
            name: fileName,
            size: file.size,
            type: file.type || 'video/mp4',
            updatedAt: record.updatedAt,
          })
        );
      } catch {}
      resolve(url);
    };

    putReq.onerror = () => {
      reject(putReq.error);
    };
  });
};

export const getIntroVideoUrl = async (): Promise<{ url: string; name: string; size: number } | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(VIDEO_KEY);

      getReq.onsuccess = () => {
        const result = getReq.result as StoredVideo | undefined;
        if (result && result.blob) {
          const url = URL.createObjectURL(result.blob);
          resolve({
            url,
            name: result.name || 'Vídeo de Abertura',
            size: result.size || result.blob.size,
          });
        } else {
          resolve(null);
        }
      };

      getReq.onerror = () => {
        reject(getReq.error);
      };
    });
  } catch (err) {
    console.warn('Erro ao carregar vídeo do IndexedDB:', err);
    return null;
  }
};

export const deleteIntroVideo = async (): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const delReq = store.delete(VIDEO_KEY);

      delReq.onsuccess = () => {
        try {
          localStorage.removeItem('manupackaging_intro_video_meta');
          localStorage.removeItem('manupackaging_intro_video_url');
        } catch {}
        resolve();
      };

      delReq.onerror = () => {
        reject(delReq.error);
      };
    });
  } catch (err) {
    console.warn('Erro ao remover vídeo do IndexedDB:', err);
  }
};
