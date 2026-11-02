import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, ShieldCheck, RefreshCw, Clock } from 'lucide-react';
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
  cooldownSeconds?: number;
}

export const FacialLoginScanner: React.FC<FacialLoginScannerProps> = ({
  users,
  onFaceMatched,
  cooldownSeconds = 0
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);
  const scanIntervalRef = useRef<any>(null);

  const [remainingCooldown, setRemainingCooldown] = useState<number>(cooldownSeconds);
  const [status, setStatus] = useState<'cooldown' | 'starting' | 'scanning' | 'success' | 'denied'>(
    cooldownSeconds > 0 ? 'cooldown' : 'starting'
  );
  const [matchedUserName, setMatchedUserName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Gerenciamento do delay/cooldown de 5 segundos após deslogar
  useEffect(() => {
    isMountedRef.current = true;
    if (cooldownSeconds <= 0) {
      setRemainingCooldown(0);
      return;
    }

    setRemainingCooldown(cooldownSeconds);
    setStatus('cooldown');

    const timer = setInterval(() => {
      setRemainingCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [cooldownSeconds]);

  // 2. Inicia o escaneamento contínuo assim que o cooldown terminar
  useEffect(() => {
    if (remainingCooldown > 0) return;

    let isLocalActive = true;

    const startScanner = async () => {
      try {
        setStatus('starting');
        const stream = await startUserCamera('user');
        if (!isMountedRef.current || !isLocalActive) {
          stopUserCamera(stream);
          return;
        }
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStatus('scanning');

        // Escaneamento CONTÍNUO E INDETERMINADO: Nunca para até que um usuário cadastrado seja reconhecido
        scanIntervalRef.current = setInterval(() => {
          if (!isMountedRef.current || !videoRef.current) return;

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
                if (isMountedRef.current) {
                  onFaceMatched(matchedUser);
                }
              }, 600);
            }
          }
          // Caso não encontre ou não reconheça, NÃO PARA: continua lendo de forma contínua!
        }, 320);

      } catch (err: any) {
        if (!isMountedRef.current) return;
        console.warn('Câmera indisponível para escaneamento facial:', err?.message || err);
        setStatus('denied');
        setErrorMessage(
          err?.name === 'NotAllowedError' 
            ? 'Câmera não permitida no navegador.' 
            : 'Câmera não disponível no momento.'
        );
      }
    };

    startScanner();

    return () => {
      isLocalActive = false;
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (streamRef.current) {
        stopUserCamera(streamRef.current);
        streamRef.current = null;
      }
    };
  }, [remainingCooldown, users]);

  return (
    <div className="w-full bg-[#051324]/95 border border-cyan-500/50 rounded-2xl p-2.5 sm:p-3 shadow-[0_0_25px_rgba(6,182,212,0.25)] relative overflow-hidden animate-in fade-in zoom-in duration-300 mb-2.5">
      
      {/* Estado 1: Cooldown de 5 segundos após deslogar */}
      {status === 'cooldown' && remainingCooldown > 0 ? (
        <div className="py-2.5 px-3 flex items-center gap-3 bg-cyan-950/40 rounded-xl border border-cyan-500/20">
          <div className="w-12 h-12 rounded-xl bg-cyan-900/60 border border-cyan-400/40 flex flex-col items-center justify-center shrink-0 text-cyan-300 shadow-inner">
            <Clock size={16} className="animate-spin text-cyan-400 mb-0.5" />
            <span className="text-xs font-black leading-none">{remainingCooldown}s</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider text-cyan-200">
              Sessão Encerrada
            </p>
            <p className="text-[8px] font-medium text-slate-300 uppercase leading-tight mt-0.5">
              Aguardando {remainingCooldown}s para novo escaneamento facial.
            </p>
          </div>
        </div>
      ) : (
        /* Estado 2: Escaneamento Contínuo Indeterminado */
        <div className="flex items-center gap-3">
          {/* Janela de Vídeo da Câmera (Miniatura circular estilizada com HUD) */}
          <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-black border-2 border-cyan-400 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center">
            {status === 'success' ? (
              <div className="w-full h-full bg-emerald-950 flex flex-col items-center justify-center text-emerald-400 animate-in zoom-in">
                <CheckCircle2 size={32} className="animate-bounce" />
              </div>
            ) : status === 'denied' ? (
              <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-slate-400">
                <Camera size={24} className="text-slate-500" />
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
                {/* Linha Laser Animada Contínua */}
                {status === 'scanning' && (
                  <div 
                    className="absolute left-1 right-1 h-0.5 bg-cyan-300 shadow-[0_0_8px_rgba(6,182,212,1)]"
                    style={{ animation: 'scan-laser 1.1s infinite ease-in-out' }}
                  />
                )}
                {/* Mira dos cantos */}
                <div className="absolute inset-1 border border-cyan-400/40 rounded-xl pointer-events-none" />
              </>
            )}
          </div>

          {/* Informações de Status Contínuo */}
          <div className="flex-1 min-w-0">
            {status === 'starting' && (
              <div className="space-y-0.5">
                <p className="text-[10px] font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <RefreshCw size={11} className="animate-spin text-cyan-400" /> Ativando Câmera...
                </p>
                <p className="text-[8px] text-slate-400 font-medium uppercase leading-tight">
                  Iniciando leitor biométrico
                </p>
              </div>
            )}

            {status === 'scanning' && (
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block shrink-0" />
                  <p className="text-[10px] font-black text-cyan-300 uppercase tracking-wider">
                    Leitor Facial Ativo
                  </p>
                </div>
                <p className="text-[8px] text-cyan-100 font-medium uppercase leading-tight">
                  Aproxime seu rosto para entrar automaticamente
                </p>
                <span className="inline-block mt-0.5 text-[7px] font-bold text-slate-400 uppercase tracking-tighter">
                  Leitura contínua em tempo real
                </span>
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

            {status === 'denied' && (
              <div className="space-y-0.5">
                <p className="text-[8.5px] font-bold text-slate-300 leading-tight">
                  {errorMessage || 'Câmera não permitida.'}
                </p>
                <p className="text-[7.5px] text-cyan-300 uppercase font-bold">
                  Utilize matrícula e senha abaixo
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
