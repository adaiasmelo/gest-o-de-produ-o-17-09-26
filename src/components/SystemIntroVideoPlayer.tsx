import React, { useRef, useState, useEffect } from 'react';
import { Volume2, VolumeX, SkipForward, Play, AlertCircle } from 'lucide-react';

interface SystemIntroVideoPlayerProps {
  videoSrc: string;
  onFinish: () => void;
  systemName?: string;
  allowSkip?: boolean;
}

export const SystemIntroVideoPlayer: React.FC<SystemIntroVideoPlayerProps> = ({
  videoSrc,
  onFinish,
  systemName = 'MANUPACKAGING',
  allowSkip = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Attempt playback immediately
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setHasStarted(true);
        })
        .catch((err) => {
          console.warn('Autoplay com som bloqueado pelo navegador, tentando mudo:', err);
          video.muted = true;
          setIsMuted(true);
          video.play().then(() => setHasStarted(true)).catch((e) => {
            console.error('Falha ao reproduzir vídeo de introdução:', e);
            setHasError(true);
            // Fallback timeout so user is not stuck
            const timer = setTimeout(onFinish, 2500);
            return () => clearTimeout(timer);
          });
        });
    }

    // Safety timeout: in case the video hangs or is longer than 25 seconds, don't block forever
    const maxTimer = setTimeout(() => {
      onFinish();
    }, 25000);

    return () => clearTimeout(maxTimer);
  }, [onFinish]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const curr = videoRef.current.currentTime;
    const dur = videoRef.current.duration;
    setCurrentTime(curr);
    if (dur > 0) {
      setDuration(dur);
      setProgress((curr / dur) * 100);
    }
  };

  const toggleSound = () => {
    if (!videoRef.current) return;
    const next = !isMuted;
    videoRef.current.muted = next;
    setIsMuted(next);
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center overflow-hidden select-none animate-in fade-in duration-300">
      {/* Background ambient glow */}
      <div className="absolute inset-0 bg-radial from-blue-900/20 via-black to-black pointer-events-none" />

      {/* Video element */}
      <div className="relative w-full h-full max-w-6xl max-h-screen flex items-center justify-center p-2 sm:p-6">
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
          playsInline
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          onEnded={onFinish}
          onError={() => {
            setHasError(true);
            setTimeout(onFinish, 1500);
          }}
          className="w-full h-full object-contain drop-shadow-2xl rounded-2xl"
        />

        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-6 text-center space-y-3">
            <AlertCircle size={36} className="text-amber-400 animate-pulse" />
            <p className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Não foi possível reproduzir o formato do vídeo.
            </p>
            <p className="text-[10px] text-slate-400">Iniciando o sistema...</p>
          </div>
        )}
      </div>

      {/* Top Bar with Branding & Skip */}
      <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between z-10 pointer-events-auto">
        <div className="flex items-center gap-2 text-white/70">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400 drop-shadow-sm">
            {systemName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-2.5 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md text-white/80 hover:text-white border border-white/10 transition-all cursor-pointer flex items-center gap-1.5 text-xs shadow-lg"
            title={isMuted ? 'Ativar som' : 'Desativar som'}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} className="text-blue-400" />}
            <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">
              {isMuted ? 'Mudo' : 'Som Ligado'}
            </span>
          </button>

          {/* Skip Button */}
          {allowSkip && (
            <button
              onClick={onFinish}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md text-white border border-white/15 transition-all cursor-pointer flex items-center gap-1.5 shadow-lg group"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-200 group-hover:text-white">
                Pular
              </span>
              <SkipForward size={14} className="text-blue-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 z-10">
        <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden backdrop-blur-xs">
          <div
            className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[9px] font-mono text-white/40 mt-1.5 px-0.5">
          <span>{currentTime.toFixed(1)}s</span>
          <span>{duration > 0 ? `${duration.toFixed(1)}s` : '10s'}</span>
        </div>
      </div>
    </div>
  );
};
