import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Presets padrão industriais de motivos rápidos de perda
export const DEFAULT_QUICK_LOSS_REASONS: Record<string, string[]> = {
  ecoBP: [
    'Matriz / Lábio',
    'Troca de Medida',
    'Arrasto / Bolha',
    'Rasgo no Bobinamento',
    'Oscilação Térmica',
    'Ajuste de Refile',
    'Dosagem de Resina',
  ],
  ecoBM: [
    'Falha Mecânica',
    'Resistência Queimada',
    'Sensor de Tração',
    'Oscilação de Rosca',
    'Falha Hidráulica',
    'Alinhamento do Cast',
    'Troca de Rolamento',
  ],
  ecoA: [
    'Refile de Borda',
    'Apara Nobre Início',
    'Envio Sede Curitiba',
    'Acerto de Matriz',
    'Transição de Linha',
  ],
  borra: [
    'Troca de Tela / Filtro',
    'Purga de Parada',
    'Descontaminação',
    'Setup Térmico',
    'Inicialização de Rosca',
  ],
};

// Presets padrão industriais de motivos rápidos de parada de máquina
export const DEFAULT_QUICK_DOWNTIME_REASONS: Record<string, string[]> = {
  manutencao: [
    'Elétrica',
    'Mecânica',
    'Hidráulica',
    'Pneumática',
    'Troca de Resistência',
    'Troca de Rolamento',
    'Alinhamento',
    'Sensor / Inversor',
  ],
  processo: [
    'Troca de Medida',
    'Setup de Matriz',
    'Limpeza de Rosca/Canhão',
    'Acerto de Espessura',
    'Troca de Bobina / Refile',
    'Transição de Material',
    'Quebra de Balão',
  ],
  outros: [
    'Falta de Energia',
    'Falta de Matéria-Prima',
    'DDS / Treinamento',
    'Troca de Turno / Refeição',
    'Aguardando Operador',
    'Aguardando Manutenção',
  ],
};

/**
 * Salva novo motivo rápido de perda no Firestore e em cache local
 */
export const saveQuickLossReason = async (category: string, reasonText: string) => {
  const trimmed = reasonText.trim();
  if (!trimmed || !category) return;

  const storageKey = `quick_loss_reasons_${category}`;
  try {
    const cachedStr = localStorage.getItem(storageKey);
    const cached: string[] = cachedStr ? JSON.parse(cachedStr) : [];
    if (!cached.some(r => r.toLowerCase() === trimmed.toLowerCase())) {
      const next = [...cached, trimmed];
      localStorage.setItem(storageKey, JSON.stringify(next));
    }

    await addDoc(collection(db, 'quick_loss_reasons'), {
      category,
      reason: trimmed,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn(`Erro ao salvar motivo rápido de perda (${category}):`, err);
  }
};

/**
 * Salva novo motivo rápido de parada no Firestore e em cache local
 */
export const saveQuickDowntimeReason = async (type: string, reasonText: string) => {
  const trimmed = reasonText.trim();
  if (!trimmed || !type) return;

  const storageKey = `quick_downtime_reasons_${type}`;
  try {
    const cachedStr = localStorage.getItem(storageKey);
    const cached: string[] = cachedStr ? JSON.parse(cachedStr) : [];
    if (!cached.some(r => r.toLowerCase() === trimmed.toLowerCase())) {
      const next = [...cached, trimmed];
      localStorage.setItem(storageKey, JSON.stringify(next));
    }

    await addDoc(collection(db, 'quick_downtime_reasons'), {
      type,
      reason: trimmed,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn(`Erro ao salvar motivo rápido de parada (${type}):`, err);
  }
};

/**
 * Hook reativo para carregar e sincronizar a lista de motivos rápidos com o sistema
 */
export const useQuickReasons = (category: string, kind: 'loss' | 'downtime') => {
  const defaults = kind === 'loss'
    ? (DEFAULT_QUICK_LOSS_REASONS[category] || [])
    : (DEFAULT_QUICK_DOWNTIME_REASONS[category] || []);

  const storageKey = kind === 'loss' 
    ? `quick_loss_reasons_${category}` 
    : `quick_downtime_reasons_${category}`;

  const [reasons, setReasons] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Mescla padrões e em cache
          const merged = [...defaults];
          parsed.forEach(p => {
            if (!merged.some(m => m.toLowerCase() === p.toLowerCase())) {
              merged.push(p);
            }
          });
          return merged;
        }
      }
    } catch (e) {
      // ignore
    }
    return defaults;
  });

  useEffect(() => {
    if (!category) return;

    const collectionName = kind === 'loss' ? 'quick_loss_reasons' : 'quick_downtime_reasons';
    const fieldName = kind === 'loss' ? 'category' : 'type';

    try {
      const q = query(collection(db, collectionName), where(fieldName, '==', category));
      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const remoteList: string[] = [];
          snap.forEach((doc) => {
            const data = doc.data();
            if (data?.reason && typeof data.reason === 'string') {
              remoteList.push(data.reason.trim());
            }
          });

          setReasons((prev) => {
            const nextList = [...defaults];
            // Adiciona remotos que não estão na lista
            remoteList.forEach((r) => {
              if (!nextList.some((existing) => existing.toLowerCase() === r.toLowerCase())) {
                nextList.push(r);
              }
            });
            // Mantém os que já estavam no estado local
            prev.forEach((p) => {
              if (!nextList.some((existing) => existing.toLowerCase() === p.toLowerCase())) {
                nextList.push(p);
              }
            });
            try {
              localStorage.setItem(storageKey, JSON.stringify(nextList));
            } catch (err) {
              // ignore
            }
            return nextList;
          });
        },
        (err) => {
          console.warn(`Firestore snapshot aviso em ${collectionName}:`, err);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn(`Erro ao subscrever em ${collectionName}:`, err);
    }
  }, [category, kind, storageKey]);

  const addReason = async (newReason: string) => {
    const trimmed = newReason.trim();
    if (!trimmed) return;
    if (!reasons.some(r => r.toLowerCase() === trimmed.toLowerCase())) {
      setReasons(prev => [...prev, trimmed]);
    }
    if (kind === 'loss') {
      await saveQuickLossReason(category, trimmed);
    } else {
      await saveQuickDowntimeReason(category, trimmed);
    }
    return trimmed;
  };

  return { reasons, addReason };
};
