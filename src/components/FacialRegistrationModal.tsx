import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, CheckCircle2, AlertCircle, RefreshCw, Sparkles, Shield, User } from 'lucide-react';
import { SystemUser } from '../types';
import { 
  startUserCamera, 
  stopUserCamera, 
  extractFaceVectorFromVideo, 
  saveFaceProfileLocally,
  FaceBiometricProfile 
} from '../services/facialRecognitionService';

interface FacialRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: SystemUser;
  onSaveFaceData: (user: SystemUser, facialData: string, facePhoto: string) => Promise<void>;
}

export const FacialRegistrationModal: React.FC<FacialRegistrationModalProps> = ({
  isOpen,
  onClose,
  user,
  onSaveFaceData
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<'requesting' | 'ready' | 'denied' | 'error'>('requesting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [samples, setSamples] = useState<number[][]>([]);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0); // 0 to 100
  const [step, setStep] = useState<'align' | 'capturing' | 'success'>('align');
  const [isSaving, setIsSaving] = useState(false);
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  // Inicia a câmera quando o modal for aberto
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setCameraStatus('requesting');
    setErrorMessage(null);
    setSamples([]);
    setCapturedPhoto(null);
    setScanProgress(0);
    setStep('align');

    const initCam = async () => {
      try {
        const stream = await startUserCamera('user');
        if (!isMounted) {
          stopUserCamera(stream);
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraStatus('ready');
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Falha ao abrir câmera para cadastro facial:', err);
        setCameraStatus('denied');
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setErrorMessage('Permissão de câmera negada. Conceda acesso à câmera nas configurações do navegador.');
        } else if (err.name === 'NotFoundError') {
          setErrorMessage('Nenhuma câmera frontal foi detectada no dispositivo.');
        } else {
          setErrorMessage(err.message || 'Erro ao inicializar câmera do dispositivo.');
        }
      }
    };

    initCam();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        stopUserCamera(streamRef.current);
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  // Rotina de captura e análise de biometria facial
  const handleStartCapture = async () => {
    if (cameraStatus !== 'ready' || !videoRef.current) return;
    setStep('capturing');
    setScanProgress(10);

    const collectedVectors: number[][] = [];
    let bestPhoto = '';

    // Amostragem em 3 tempos (intervalos de 350ms) para robustez
    for (let i = 1; i <= 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 380));
      if (!videoRef.current) break;

      const result = extractFaceVectorFromVideo(videoRef.current);
      if (result && result.vector.length > 0) {
        collectedVectors.push(result.vector);
        if (!bestPhoto && result.photoBase64) {
          bestPhoto = result.photoBase64;
        }
      }
      setScanProgress(25 + i * 25);
    }

    if (collectedVectors.length === 0) {
      setStep('align');
      setScanProgress(0);
      setErrorMessage('Não foi possível identificar o rosto com nitidez. Verifique a iluminação e mantenha a face dentro da moldura.');
      return;
    }

    // Calcula o vetor médio composto das amostras
    const len = collectedVectors[0].length;
    const finalVector = new Array(len).fill(0);
    for (const vec of collectedVectors) {
      for (let j = 0; j < len; j++) {
        finalVector[j] += vec[j] / collectedVectors.length;
      }
    }

    setScanProgress(100);
    setCapturedPhoto(bestPhoto);
    setStep('success');

    // Salva localmente e no Firestore
    try {
      setIsSaving(true);
      const vectorJson = JSON.stringify(finalVector);
      const profile: FaceBiometricProfile = {
        registration: user.registration,
        name: user.name,
        vector: finalVector,
        photoBase64: bestPhoto,
        registeredAt: new Date().toISOString(),
        device: navigator.userAgent
      };
      saveFaceProfileLocally(profile);

      await onSaveFaceData(user, vectorJson, bestPhoto);
      setIsSaving(false);

      // Fecha o modal após confirmação visual de 1.8s
      setTimeout(() => {
        handleClose();
      }, 1800);
    } catch (e: any) {
      setIsSaving(false);
      console.error('Erro ao salvar biometria facial:', e);
      setErrorMessage('A biometria foi gravada no aparelho, mas ocorreu uma instabilidade ao sincronizar com o banco.');
    }
  };

  const handleClose = () => {
    if (streamRef.current) {
      stopUserCamera(streamRef.current);
      streamRef.current = null;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-cyan-500/30 text-white rounded-[2rem] p-5 sm:p-6 max-w-md w-full shadow-[0_0_50px_rgba(6,182,212,0.25)] relative overflow-hidden flex flex-col items-center">
        
        {/* Botão de Fechar */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer z-20"
          title="Fechar"
        >
          <X size={18} />
        </button>

        {/* Cabeçalho */}
        <div className="text-center space-y-1 w-full pr-6 pl-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-[10px] font-black uppercase tracking-widest">
            <Sparkles size={12} className="animate-pulse" /> Cadastro de Biometria Facial
          </div>
          <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white mt-1">
            {step === 'success' ? 'Rosto Cadastrado!' : 'Cadastrar Seu Rosto'}
          </h3>
          <p className="text-xs text-slate-400 font-medium truncate">
            {user.name} (Matrícula: {user.registration})
          </p>
        </div>

        {/* Aviso de restrição de IFrame caso aplicável */}
        {isIframe && cameraStatus === 'denied' && (
          <div className="mt-3 w-full bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl p-3 text-xs space-y-1.5 text-left">
            <p className="font-black uppercase tracking-wider text-[10px] text-amber-400 flex items-center gap-1">
              <AlertCircle size={13} /> Visualização em Painel Embutido
            </p>
            <p className="text-[11px] leading-relaxed">
              Alguns navegadores bloqueiam acesso à câmera em painéis incorporados. Abra o aplicativo em uma nova aba do navegador para autorizar a câmera normalmente.
            </p>
          </div>
        )}

        {/* Visor da Câmera com Moldura Biométrica Futurista */}
        <div className="relative my-4 w-64 h-64 sm:w-72 sm:h-72 rounded-[2rem] overflow-hidden bg-black border-2 border-cyan-500/40 shadow-inner flex items-center justify-center">
          
          {step === 'success' && capturedPhoto ? (
            <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 animate-in zoom-in duration-300">
              <img src={capturedPhoto} alt="Rosto Cadastrado" className="w-full h-full object-cover scale-x-[-1]" />
              <div className="absolute inset-0 bg-emerald-950/40 flex flex-col items-center justify-center p-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mb-2 shadow-[0_0_20px_rgba(52,211,153,0.5)]">
                  <CheckCircle2 size={36} />
                </div>
                <p className="text-sm font-black uppercase tracking-wider text-emerald-300 text-center">
                  Identidade Facial Gravada!
                </p>
                <p className="text-[10px] text-emerald-100 font-bold uppercase mt-1">
                  Próximos acessos serão imediatos
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Elemento de Vídeo Real da Câmera (Espelhado como Espelho) */}
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Guia / Retículo Oval de Posicionamento do Rosto */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Linhas de Canto / Mira Cibernética */}
                <div className="w-48 h-60 border-2 border-dashed border-cyan-400/60 rounded-[45%] relative animate-pulse flex items-center justify-center">
                  {/* Marcadores nos 4 cantos */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-300" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-300" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-300" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-300" />
                  
                  {/* Linha laser de varredura biométrica */}
                  {step === 'capturing' && (
                    <div 
                      className="absolute left-2 right-2 h-0.5 bg-cyan-300 shadow-[0_0_12px_rgba(6,182,212,1)]"
                      style={{
                        animation: 'scan-laser 1.2s infinite ease-in-out'
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Overlay de carregamento da câmera */}
              {cameraStatus === 'requesting' && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center">
                  <RefreshCw size={28} className="text-cyan-400 animate-spin mb-2" />
                  <p className="text-xs font-bold text-cyan-200 uppercase tracking-wider">
                    Conectando à câmera...
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Permita o acesso à câmera quando solicitado
                  </p>
                </div>
              )}

              {/* Erro de câmera */}
              {cameraStatus === 'denied' && (
                <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-4 text-center space-y-2">
                  <AlertCircle size={32} className="text-rose-400" />
                  <p className="text-xs font-black text-rose-300 uppercase tracking-wider">
                    Acesso à Câmera Bloqueado
                  </p>
                  <p className="text-[10px] text-slate-300 leading-tight">
                    {errorMessage || 'Não foi possível acessar a câmera do dispositivo.'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Barra de Progresso durante a Leitura */}
        {step === 'capturing' && (
          <div className="w-full space-y-1.5 px-2 mb-3">
            <div className="flex justify-between text-[10px] font-black uppercase text-cyan-300">
              <span>Mapeando pontos biométricos...</span>
              <span>{scanProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-cyan-500/30">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Mensagens de Orientação */}
        {errorMessage && step !== 'success' && (
          <p className="text-[11px] font-bold text-rose-400 text-center mb-2 px-2">
            {errorMessage}
          </p>
        )}

        {step === 'align' && cameraStatus === 'ready' && (
          <p className="text-xs text-cyan-200/90 font-medium text-center mb-3 px-3 leading-relaxed">
            Centralize seu rosto dentro da moldura oval com boa iluminação e clique no botão abaixo.
          </p>
        )}

        {/* Botões de Ação */}
        <div className="w-full space-y-2 mt-1">
          {step === 'align' && cameraStatus === 'ready' && (
            <button
              onClick={handleStartCapture}
              className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(6,182,212,0.35)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer border border-cyan-400/40"
            >
              <Camera size={16} /> Capturar e Cadastrar Rosto
            </button>
          )}

          {cameraStatus === 'denied' && (
            <button
              onClick={() => {
                setCameraStatus('requesting');
                startUserCamera('user').then(s => {
                  streamRef.current = s;
                  if (videoRef.current) {
                    videoRef.current.srcObject = s;
                    videoRef.current.play().catch(() => {});
                  }
                  setCameraStatus('ready');
                }).catch(e => {
                  setCameraStatus('denied');
                  setErrorMessage(e.message || 'Câmera inacessível.');
                });
              }}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw size={14} /> Tentar Novamente
            </button>
          )}

          {step !== 'success' && (
            <button
              onClick={handleClose}
              className="w-full py-2.5 bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
