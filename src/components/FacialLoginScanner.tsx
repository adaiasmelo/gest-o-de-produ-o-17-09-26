import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, ShieldCheck, X, RefreshCw, AlertCircle } from 'lucide-react';
import { SystemUser } from '../types';
import { 
  startUserCamera, 
  stopUserCamera, 
  extractFaceVectorFromVideo, 
  matchCandidateFace 
} from '../services/facialRecognitionService';

interface FacialLoginScannerProps {
  users: SystemUser[];
  onFaceMatched: (user: SystemUser) => void;
  onDismiss: () => void;
  autoStart?: boolean;
}

export const FacialLoginScanner: React.FC<FacialLoginScannerProps> = ({
  users,
  onFaceMatched,
  onDismiss,
  autoStart = true
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);
  const scanIntervalRef = useRef<any>(null);
  const timeoutRef = useRef<any>(null);

  const [status, setStatus] = useState<'starting' | 'scanning' | 'success' | 'failed' | 'denied'>('starting');
  const [matchedUserName, setMatchedUserName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    if (!autoStart) return;

    let localStream: MediaStream | null = null;

    const startScanner = async () => {
      try {
        setStatus('starting');
        const stream = await startUserCamera('user');
        if (!isMountedRef.current) {
          stopUserCamera(stream);
          return;
        }
        localStream = stream;
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStatus('scanning');

        // Loop de reconhecimento a cada 320ms
        let attempts = 0;
        const maxAttempts = 25; // ~8 segundos de tentativa

        scanIntervalRef.current = setInterval(() => {
          if (!isMountedRef.current || !videoRef.current) return;
          attempts++;

          const result = extractFaceVectorFromVideo(videoRef.current);
          if (result && result.vector.length > 0) {
            const { matchedUser, confidence, name } = matchCandidateFace(result.vector, users);

            if (matchedUser && confidence >= 0.78) {
              // Rosto reconhecido com sucesso!
              clearInterval(scanIntervalRef.current);
              setStatus('success');
              setMatchedUserName(name || matchedUser.name);

              // Para a câmera imediatamente
              stopUserCamera(streamRef.current);
              streamRef.current = null;

              // Aciona login automático após animação de sucesso de 700ms
              setTimeout(() => {
                if (isMountedRef.current) {
                  onFaceMatched(matchedUser);
                }
              }, 700);
              return;
            }
          }

          // Se esgotar as tentativas sem reconhecimento
          if (attempts >= maxAttempts) {
            clearInterval(scanIntervalRef.current);
            setStatus('failed');
            stopUserCamera(streamRef.current);
            streamRef.current = null;
          }
        }, 320);

      } catch (err: any) {
        if (!isMountedRef.current) return;
        console.warn('Câmera indisponível para escaneamento facial:', err?.message || err);
        setStatus('denied');
        setErrorMessage(
          err?.name === 'NotAllowedError' 
            ? 'Acesso à câmera não autorizado.' 
            : 'Câmera não disponível no momento.'
        );
      }
    };

    startScanner();

    return () => {
      isMountedRef.current = false;
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (streamRef.current) {
        stopUserCamera(streamRef.current);
        streamRef.current = null;
      }
    };
  }, [autoStart, users]);

  const handleCancel = () => {
    if (streamRef.current) {
      stopUserCamera(streamRef.current);
      streamRef.current = null;
    }
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    onDismiss();
  };

  const handleRetry = async () => {
    setStatus('starting');
    try {
      const stream = await startUserCamera('user');
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setStatus('scanning');

      let attempts = 0;
      scanIntervalRef.current = setInterval(() => {
        if (!videoRef.current) return;
        attempts++;

        const result = extractFaceVectorFromVideo(videoRef.current);
        if (result && result.vector.length > 0) {
          const { matchedUser, confidence, name } = matchCandidateFace(result.vector, users);
          if (matchedUser && confidence >= 0.78) {
            clearInterval(scanIntervalRef.current);
            setStatus('success');
            setMatchedUserName(name || matchedUser.name);
            stopUserCamera(streamRef.current);
            streamRef.current = null;
            setTimeout(() => {
              onFaceMatched(matchedUser);
            }, 700);
            return;
          }
        }

        if (attempts >= 25) {
          clearInterval(scanIntervalRef.current);
          setStatus('failed');
          stopUserCamera(streamRef.current);
          streamRef.current = null;
        }
      }, 320);
    } catch {
      setStatus('denied');
    }
  };

  return (
    <div className="w-full bg-[#051324]/90 border border-cyan-500/40 rounded-2xl p-3 shadow-[0_0_25px_rgba(6,182,212,0.25)] relative overflow-hidden animate-in fade-in zoom-in duration-300 mb-2">
      
      {/* Botão Cancelar / Fechar Scanner */}
      {status !== 'success' && (
        <button
          type="button"
          onClick={handleCancel}
          className="absolute top-2.5 right-2.5 p-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 hover:text-white rounded-lg transition-colors cursor-pointer z-20 text-[10px] flex items-center gap-1 px-2 py-0.5 border border-cyan-500/30 font-bold uppercase tracking-wider"
          title="Digitar matrícula e senha manualmente"
        >
          <X size={12} />
          <span>Senha</span>
        </button>
      )}

      <div className="flex items-center gap-3">
        {/* Janela de Vídeo da Câmera (Miniatura circular estilizada com HUD) */}
        <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-black border-2 border-cyan-400 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center">
          
          {status === 'success' ? (
            <div className="w-full h-full bg-emerald-950 flex flex-col items-center justify-center text-emerald-400 animate-in zoom-in">
              <CheckCircle2 size={32} className="animate-bounce" />
            </div>
          ) : status === 'failed' || status === 'denied' ? (
            <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-slate-400">
              <Camera size={26} className="text-slate-500" />
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover scale-x-[-1]"
              />
              {/* Linha Laser Animada */}
              {status === 'scanning' && (
                <div 
                  className="absolute left-1 right-1 h-0.5 bg-cyan-300 shadow-[0_0_8px_rgba(6,182,212,1)]"
                  style={{
                    animation: 'scan-laser 1.1s infinite ease-in-out'
                  }}
                />
              )}
              {/* Mira dos 4 cantos */}
              <div className="absolute inset-1 border border-cyan-400/40 rounded-xl pointer-events-none" />
            </>
          )}
        </div>

        {/* Informações de Status ao Lado */}
        <div className="flex-1 min-w-0 pr-8">
          {status === 'starting' && (
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <RefreshCw size={11} className="animate-spin text-cyan-400" /> Ativando Câmera...
              </p>
              <p className="text-[8.5px] text-slate-400 font-medium uppercase leading-tight">
                Alinhe seu rosto ao visor
              </p>
            </div>
          )}

          {status === 'scanning' && (
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
                Escaneando Rosto...
              </p>
              <p className="text-[8.5px] text-cyan-100 font-medium uppercase leading-tight">
                Identificando cadastro facial
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-0.5 animate-in fade-in">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-400" /> Rosto Reconhecido!
              </p>
              <p className="text-[9.5px] text-white font-black uppercase truncate leading-tight">
                Olá, {matchedUserName?.split(' ')[0]}
              </p>
              <p className="text-[7.5px] text-emerald-200 uppercase font-bold">
                Entrando no sistema...
              </p>
            </div>
          )}

          {status === 'failed' && (
            <div className="space-y-1">
              <p className="text-[9px] font-black text-amber-400 uppercase tracking-tight leading-tight">
                Rosto não reconhecido
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-[8.5px] font-black uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Tentar De Novo
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-[8.5px] font-bold text-slate-400 hover:text-white uppercase underline cursor-pointer"
                >
                  Usar Senha
                </button>
              </div>
            </div>
          )}

          {status === 'denied' && (
            <div className="space-y-1">
              <p className="text-[8.5px] font-bold text-slate-300 leading-tight">
                {errorMessage || 'Câmera não permitida.'}
              </p>
              <button
                type="button"
                onClick={handleCancel}
                className="text-[8.5px] font-bold text-cyan-400 hover:text-cyan-300 uppercase underline cursor-pointer"
              >
                Prosseguir com Senha
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
