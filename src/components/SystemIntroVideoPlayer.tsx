import React, { useRef, useEffect, useState, useCallback } from 'react';

interface SystemIntroVideoPlayerProps {
  videoSrc: string;
  onFinish: () => void;
  isLoggedIn?: boolean;
  onArrival?: () => void;
}

export const SystemIntroVideoPlayer: React.FC<SystemIntroVideoPlayerProps> = ({
  videoSrc,
  onFinish,
  isLoggedIn = false,
  onArrival,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [pullStyle, setPullStyle] = useState<React.CSSProperties>({});
  const isTransitioningRef = useRef(false);
  const hasStartedPlaybackRef = useRef(false);

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const onArrivalRef = useRef(onArrival);
  onArrivalRef.current = onArrival;

  useEffect(() => {
    // Bloqueia qualquer rolagem e suprime 100% da barra de rolagem lateral no navegador
    document.documentElement.classList.add('intro-video-active');
    document.body.classList.add('intro-video-active');

    const origHtmlOverflow = document.documentElement.style.overflow;
    const origBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.classList.remove('intro-video-active');
      document.body.classList.remove('intro-video-active');
      document.documentElement.style.overflow = origHtmlOverflow;
      document.body.style.overflow = origBodyOverflow;
    };
  }, []);

  const startSuctionTransition = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    // Localiza o elemento de destino (logo do card de login ou logo da barra superior)
    const targetElementId = isLoggedIn ? 'header-system-logo' : 'login-screen-logo';
    const targetEl = document.getElementById(targetElementId);

    let tx = 0;
    let ty = 0;
    let targetScale = 0.08;
    let targetRadius = '2.5rem';

    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      const targetCenterX = rect.left + rect.width / 2;
      const targetCenterY = rect.top + rect.height / 2;
      const screenCenterX = window.innerWidth / 2;
      const screenCenterY = window.innerHeight / 2;

      tx = targetCenterX - screenCenterX;
      ty = targetCenterY - screenCenterY;
      targetScale = Math.max(0.035, rect.width / Math.max(window.innerWidth, 1));
      targetRadius = window.getComputedStyle(targetEl).borderRadius || (isLoggedIn ? '0.75rem' : '2.5rem');
    } else {
      // Coordenadas de contingência
      if (isLoggedIn) {
        tx = -(window.innerWidth / 2 - 36);
        ty = -(window.innerHeight / 2 - 36);
        targetScale = 0.05;
        targetRadius = '0.75rem';
      } else {
        tx = 0;
        ty = -70; // Centro superior onde fica o logo do card de login
        targetScale = 0.09;
        targetRadius = '2.5rem';
      }
    }

    setPullStyle({
      transform: `translate3d(${tx}px, ${ty}px, 0) scale(${targetScale})`,
      borderRadius: targetRadius,
      boxShadow: '0 0 50px 20px rgba(56, 189, 248, 0.95), 0 0 100px 40px rgba(37, 99, 235, 0.8)',
      filter: 'brightness(1.4) contrast(1.15)',
    });

    setIsPulling(true);

    // Quando o vídeo está quase tocando o logo no final da sucção, ativa o brilho/shimmer no logo
    const arrivalTimer = setTimeout(() => {
      onArrivalRef.current?.();
    }, 650);

    // Conclui a transição completa de sucção e libera a tela
    const finishTimer = setTimeout(() => {
      onFinishRef.current();
    }, 850);

    return () => {
      clearTimeout(arrivalTimer);
      clearTimeout(finishTimer);
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (hasStartedPlaybackRef.current) return;
    hasStartedPlaybackRef.current = true;

    const video = videoRef.current;
    if (!video) return;

    // Prioriza áudio ligado (sem mudo) e volume máximo
    video.muted = false;
    video.volume = 1.0;

    const startPlayback = async () => {
      try {
        await video.play();
      } catch (err) {
        console.warn('Autoplay com áudio bloqueado pelas restrições do navegador, iniciando com recuperação:', err);
        video.muted = true;
        try {
          await video.play();
        } catch (fatalErr) {
          console.error('Falha crítica ao iniciar vídeo de abertura:', fatalErr);
          startSuctionTransition();
          return;
        }

        const unmuteOnInteraction = () => {
          if (videoRef.current) {
            videoRef.current.muted = false;
            videoRef.current.volume = 1.0;
          }
          window.removeEventListener('click', unmuteOnInteraction, true);
          window.removeEventListener('touchstart', unmuteOnInteraction, true);
          window.removeEventListener('keydown', unmuteOnInteraction, true);
        };

        window.addEventListener('click', unmuteOnInteraction, { capture: true, once: true });
        window.addEventListener('touchstart', unmuteOnInteraction, { capture: true, once: true });
        window.addEventListener('keydown', unmuteOnInteraction, { capture: true, once: true });
      }
    };

    startPlayback();

    // Fallback de segurança para não travar: 11 segundos (o vídeo possui 10s)
    const maxTimer = setTimeout(() => {
      if (!isTransitioningRef.current) {
        startSuctionTransition();
      }
    }, 11000);

    return () => {
      clearTimeout(maxTimer);
    };
  }, [startSuctionTransition, videoSrc]);

  return (
    <div
      className={`fixed inset-0 z-[9999999] overflow-hidden select-none pointer-events-none transition-opacity duration-500 ease-out ${
        isPulling ? 'bg-black/0' : 'bg-black'
      }`}
    >
      {/* Container do vídeo que sofre a transformação de sucção em direção ao logo */}
      <div
        ref={containerRef}
        className={`w-full h-full flex items-center justify-center overflow-hidden transition-all duration-[850ms] ${
          isPulling
            ? 'ease-[cubic-bezier(0.19,1,0.22,1)] opacity-0'
            : 'ease-linear opacity-100'
        }`}
        style={isPulling ? pullStyle : {}}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay
          playsInline
          className="w-full h-full object-cover block m-0 p-0 border-0 outline-none"
          onEnded={startSuctionTransition}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (v && v.duration && isFinite(v.duration) && v.currentTime >= v.duration - 0.25) {
              startSuctionTransition();
            }
          }}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (v && v.duration && isFinite(v.duration)) {
              setTimeout(() => {
                if (!isTransitioningRef.current) {
                  startSuctionTransition();
                }
              }, (v.duration + 0.6) * 1000);
            }
          }}
          onError={() => {
            console.warn('Erro ao carregar ou reproduzir arquivo de vídeo.');
            startSuctionTransition();
          }}
        />
      </div>

      {/* Feixe de luz e vórtice radiante que acompanha a sucção */}
      {isPulling && (
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center animate-out fade-out duration-700"
          style={{
            background:
              'radial-gradient(circle at center, rgba(56,189,248,0.25) 0%, rgba(37,99,235,0.1) 40%, transparent 70%)',
          }}
        />
      )}
    </div>
  );
};
