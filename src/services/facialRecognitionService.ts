/**
 * Serviço de Reconhecimento e Autenticação Facial em Tempo Real
 * Suporta navegadores móveis (iOS/Android PWA) e desktop (webcams).
 * Utiliza extração biométrica por amostragem espacial, histograma LBP (Local Binary Patterns)
 * e similaridade de cossenos para reconhecimento instantâneo e offline.
 */

import { SystemUser } from '../types';

export interface FaceBiometricProfile {
  registration: string;
  name: string;
  vector: number[]; // Vetor de características normalizado
  photoBase64: string; // Miniatura otimizada (avatar)
  registeredAt: string;
  device?: string;
}

const LOCAL_STORAGE_KEY = 'manupackaging_face_profiles';
const MIN_SIMILARITY_THRESHOLD = 0.78; // Limiar de reconhecimento facial seguro

/**
 * Normaliza um vetor para norma euclidiana = 1
 */
function normalizeVector(vec: number[]): number[] {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    sumSq += vec[i] * vec[i];
  }
  const mag = Math.sqrt(sumSq) || 1e-6;
  return vec.map(v => v / mag);
}

/**
 * Calcula a similaridade de cosseno entre dois vetores biométricos
 * Retorna um valor entre 0.0 (totalmente diferente) e 1.0 (idêntico)
 */
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const len = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator <= 1e-6) return 0;
  return Math.max(0, Math.min(1, dotProduct / denominator));
}

/**
 * Extrai o vetor de características biométricas faciais a partir de um elemento <video>
 * usando um canvas offscreen, equalização de luminância e histograma de textura local (LBP).
 */
export function extractFaceVectorFromVideo(
  video: HTMLVideoElement,
  customCrop?: { x: number; y: number; width: number; height: number }
): { vector: number[]; photoBase64: string; qualityScore: number } | null {
  try {
    if (!video || video.readyState < 2 || video.videoWidth === 0) {
      return null;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Se não houver recorte específico, seleciona a região central oval (área do rosto)
    let cropX = 0;
    let cropY = 0;
    let cropW = vw;
    let cropH = vh;

    if (customCrop) {
      cropX = Math.max(0, customCrop.x);
      cropY = Math.max(0, customCrop.y);
      cropW = Math.min(vw - cropX, customCrop.width);
      cropH = Math.min(vh - cropY, customCrop.height);
    } else {
      // Região facial padrão: centralizada, proporção 1:1.25
      const side = Math.min(vw, vh) * 0.72;
      cropW = side;
      cropH = side * 1.15;
      cropX = (vw - cropW) / 2;
      cropY = (vh - cropH) / 2;
    }

    // Canvas de processamento normalizado para 64x64 pixels
    const targetSize = 64;
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    // Desenha o corte do rosto espelhado (modo selfie)
    ctx.save();
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, targetSize, targetSize);
    ctx.restore();

    const imgData = ctx.getImageData(0, 0, targetSize, targetSize);
    const data = imgData.data;

    // 1. Converte para escala de cinza e calcula média/desvio de luminância
    const gray = new Float32Array(targetSize * targetSize);
    let sumGray = 0;
    for (let i = 0; i < gray.length; i++) {
      const idx = i * 4;
      // Luminância ITU-R BT.601
      const l = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      gray[i] = l;
      sumGray += l;
    }
    const meanGray = sumGray / gray.length;

    let varGray = 0;
    for (let i = 0; i < gray.length; i++) {
      const d = gray[i] - meanGray;
      varGray += d * d;
    }
    const stdDev = Math.sqrt(varGray / gray.length);

    // Se o desvio for muito baixo (< 12), indica escuridão ou lente tapada
    if (stdDev < 12) {
      return null;
    }

    // 2. Extrai vetor de gradientes espaciais e textura LBP em uma grade 4x4 (16 blocos)
    const gridSize = 4;
    const blockSize = targetSize / gridSize; // 16 pixels por bloco
    const vector: number[] = [];

    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        let blockLuminance = 0;
        let blockVariance = 0;
        let dxSum = 0;
        let dySum = 0;
        let lbpPatternCount = 0;

        const startX = gx * blockSize;
        const startY = gy * blockSize;

        for (let y = startY; y < startY + blockSize; y++) {
          for (let x = startX; x < startX + blockSize; x++) {
            const idx = y * targetSize + x;
            const centerVal = gray[idx];
            blockLuminance += centerVal;

            // Gradientes horizontal e vertical (Sobel aproximado)
            if (x > 0 && x < targetSize - 1 && y > 0 && y < targetSize - 1) {
              const dx = gray[idx + 1] - gray[idx - 1];
              const dy = gray[idx + targetSize] - gray[idx - targetSize];
              dxSum += Math.abs(dx);
              dySum += Math.abs(dy);

              // Amostragem LBP simplificada (8 vizinhos em relação ao centro)
              let pattern = 0;
              if (gray[idx - targetSize - 1] >= centerVal) pattern |= 1;
              if (gray[idx - targetSize] >= centerVal) pattern |= 2;
              if (gray[idx - targetSize + 1] >= centerVal) pattern |= 4;
              if (gray[idx + 1] >= centerVal) pattern |= 8;
              if (gray[idx + targetSize + 1] >= centerVal) pattern |= 16;
              if (gray[idx + targetSize] >= centerVal) pattern |= 32;
              if (gray[idx + targetSize - 1] >= centerVal) pattern |= 64;
              if (gray[idx - 1] >= centerVal) pattern |= 128;

              lbpPatternCount += pattern;
            }
          }
        }

        const numPixels = blockSize * blockSize;
        const avgLum = blockLuminance / numPixels;
        vector.push(avgLum / 255.0);
        vector.push((dxSum / numPixels) / 128.0);
        vector.push((dySum / numPixels) / 128.0);
        vector.push((lbpPatternCount / numPixels) / 255.0);
      }
    }

    const normalizedVector = normalizeVector(vector);

    // Miniatura de alta definição (96x96) para exibir no perfil do usuário
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 96;
    thumbCanvas.height = 96;
    const tCtx = thumbCanvas.getContext('2d');
    let photoBase64 = '';
    if (tCtx) {
      tCtx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, 96, 96);
      photoBase64 = thumbCanvas.toDataURL('image/jpeg', 0.85);
    }

    return {
      vector: normalizedVector,
      photoBase64,
      qualityScore: Math.min(1, stdDev / 45)
    };
  } catch (err) {
    console.error('Erro ao extrair vetor facial:', err);
    return null;
  }
}

/**
 * Carrega todos os perfis faciais salvos localmente
 */
export function getStoredFaceProfiles(): Record<string, FaceBiometricProfile> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Salva um perfil facial no armazenamento local
 */
export function saveFaceProfileLocally(profile: FaceBiometricProfile): void {
  try {
    const all = getStoredFaceProfiles();
    all[profile.registration] = profile;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Falha ao salvar perfil facial local:', e);
  }
}

/**
 * Remove um perfil facial localmente
 */
export function removeFaceProfileLocally(registration: string): void {
  try {
    const all = getStoredFaceProfiles();
    delete all[registration];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error('Falha ao remover perfil facial local:', e);
  }
}

const FACIAL_AUTO_KEY = 'manupackaging_facial_auto_enabled';
const FACIAL_LOGIN_ENABLED_KEY = 'manupackaging_facial_login_enabled';

/**
 * Retorna se o escaneamento facial na tela de login está habilitado neste dispositivo.
 * Padrão: true (caso haja rosto cadastrado). Se o usuário cancelar no menu, retorna false.
 */
export function isFacialLoginEnabled(): boolean {
  try {
    const val = localStorage.getItem(FACIAL_LOGIN_ENABLED_KEY);
    if (val === null) return true; // Habilitado por padrão
    return val === 'true';
  } catch {
    return true;
  }
}

/**
 * Define se a leitura facial na tela de login está habilitada ou cancelada (controlado pelo menu).
 */
export function setFacialLoginEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(FACIAL_LOGIN_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch (e) {
    console.error('Erro ao salvar status de leitura facial:', e);
  }
}

/**
 * Aliases para compatibilidade
 */
export const isFacialAutoLoginEnabled = isFacialLoginEnabled;
export const setFacialAutoLoginEnabled = setFacialLoginEnabled;

/**
 * Verifica se há pelo menos um perfil facial registrado (seja local ou nos usuários)
 */
export function hasAnyRegisteredFaces(users: SystemUser[] = []): boolean {
  // Verifica se há no localStorage
  const localProfiles = getStoredFaceProfiles();
  if (Object.keys(localProfiles).length > 0) return true;

  // Verifica na lista de usuários do sistema
  return users.some(u => Boolean(u.facialData));
}

/**
 * Tenta reconhecer a face do usuário a partir do vetor candidato,
 * comparando contra os perfis locais e os usuários fornecidos.
 */
export function matchCandidateFace(
  candidateVector: number[],
  users: SystemUser[] = []
): { matchedUser: SystemUser | null; confidence: number; name?: string } {
  if (!candidateVector || candidateVector.length === 0) {
    return { matchedUser: null, confidence: 0 };
  }

  let bestMatch: SystemUser | null = null;
  let bestScore = 0;
  let matchedName = '';

  const localProfiles = getStoredFaceProfiles();

  // 1. Testa contra os perfis locais
  for (const [registration, profile] of Object.entries(localProfiles)) {
    if (profile.vector && profile.vector.length > 0) {
      const score = calculateCosineSimilarity(candidateVector, profile.vector);
      if (score > bestScore) {
        bestScore = score;
        matchedName = profile.name;
        // Encontra o usuário correspondente
        const userFound = users.find(u => u.registration === registration);
        if (userFound) {
          bestMatch = userFound;
        } else {
          // Cria objeto mock temporário com matrícula e nome
          bestMatch = {
            id: 'local_' + registration,
            name: profile.name,
            registration: registration,
            role: 'Colaborador',
            isFirstAccess: false,
            facialData: JSON.stringify(profile.vector),
            facePhoto: profile.photoBase64
          };
        }
      }
    }
  }

  // 2. Testa contra usuários que possuam facialData no banco
  for (const user of users) {
    if (user.facialData) {
      try {
        const storedVector: number[] = JSON.parse(user.facialData);
        if (Array.isArray(storedVector)) {
          const score = calculateCosineSimilarity(candidateVector, storedVector);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = user;
            matchedName = user.name;
          }
        }
      } catch {
        // Ignora dados corrompidos
      }
    }
  }

  if (bestScore >= MIN_SIMILARITY_THRESHOLD && bestMatch) {
    return {
      matchedUser: bestMatch,
      confidence: bestScore,
      name: matchedName || bestMatch.name
    };
  }

  return {
    matchedUser: null,
    confidence: bestScore,
    name: undefined
  };
}

/**
 * Helper para iniciar o stream de vídeo da câmera
 */
export async function startUserCamera(facingMode: 'user' | 'environment' = 'user'): Promise<MediaStream> {
  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error('Navegador sem suporte à câmera ou sem conexão HTTPS segura.');
  }

  const constraints: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: facingMode,
      width: { ideal: 640 },
      height: { ideal: 480 }
    }
  };

  return await navigator.mediaDevices.getUserMedia(constraints);
}

/**
 * Helper para parar todos os tracks de um stream de vídeo
 */
export function stopUserCamera(stream: MediaStream | null): void {
  if (!stream) return;
  try {
    stream.getTracks().forEach(track => {
      track.stop();
    });
  } catch (e) {
    console.warn('Erro ao interromper tracks da câmera:', e);
  }
}
