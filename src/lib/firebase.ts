import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getMessaging, isSupported, Messaging } from 'firebase/messaging';
import { 
  doc, setDoc, getDoc, collection, query, where, onSnapshot, getDocs, deleteDoc, writeBatch,
  getFirestore, getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Inicialização do Firestore usando getFirestore com o Database ID correto conforme a Skill
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || 'ai-studio-f0309e5c-c262-4bce-92fb-80bc63dce14b');
export const auth = getAuth(app);

// Inicialização segura do Messaging (Client-Side) - Apenas se suportado pelo navegador
export let messaging: Messaging | null = null;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  isSupported().then((supported) => {
    if (supported) {
      try {
        messaging = getMessaging(app);
      } catch (e) {
        console.warn('Firebase Messaging init skipped:', e);
      }
    }
  }).catch(() => {
    console.warn('Firebase Messaging não suportado neste ambiente.');
  });
}

console.log('Firebase Init: Conectando ao Banco:', firebaseConfig.firestoreDatabaseId || 'ai-studio-f0309e5c-c262-4bce-92fb-80bc63dce14b');

// Validação de Conexão conforme a Skill
async function testConnection() {
  try {
    // Tenta ler um documento qualquer para testar permissões e conexão
    await getDocFromServer(doc(db, 'settings', 'global'));
    console.log('Firebase Connection: Sucesso!');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const isOffline = errorMsg.toLowerCase().includes('offline') || 
                      errorMsg.toLowerCase().includes('network') || 
                      errorMsg.toLowerCase().includes('reach') ||
                      errorMsg.toLowerCase().includes('unreachable');
    if (isOffline) {
      console.warn('Firebase Connection: Dispositivo offline ou conexão lenta. Operando no modo offline local (cache).');
    } else {
      console.error("Firebase Connection Error:", error);
    }
  }
}
testConnection();


export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  const isOffline = errorMsg.toLowerCase().includes('offline') || 
                    errorMsg.toLowerCase().includes('network') || 
                    errorMsg.toLowerCase().includes('reach') ||
                    errorMsg.toLowerCase().includes('unreachable');

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  
  if (isOffline) {
    console.warn('PWA Offline:', operationType, path);
    // Não lança erro se for apenas offline, permite que o Firestore use o cache silenciosamente
    return;
  }

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const seedInitialData = async (data: {
    productionEntries: any[],
    employees: any[],
    logs: any[],
    operators: string[],
    roles: string[],
    goals: any
}) => {
    try {
        // Clear or just add
        const currentUid = auth.currentUser?.uid || 'system';
        
        for (const entry of data.productionEntries) {
            await setDoc(doc(db, 'productionEntries', entry.id), { ...entry, userId: currentUid });
        }
        for (const emp of data.employees) {
            await setDoc(doc(db, 'employees', emp.id), { ...emp, userId: currentUid });
        }
        for (const log of data.logs) {
            await setDoc(doc(db, 'personnelLogs', log.id), { ...log, userId: currentUid });
        }
        
        await setDoc(doc(db, 'settings', 'global'), {
            operators: data.operators,
            availableRoles: data.roles,
            goals: data.goals,
            lastUpdated: new Date().toISOString()
        });
        
    } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, 'seed');
    }
}
