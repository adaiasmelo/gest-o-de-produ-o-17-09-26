import React, { useRef, useEffect } from 'react';

interface SystemIntroVideoPlayerProps {
  videoSrc: string;
  onFinish: () => void;
}

export const SystemIntroVideoPlayer: React.FC<SystemIntroVideoPlayerProps> = ({
  videoSrc,
  onFinish,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Prioriza áudio ligado (sem mudo) e volume máximo
    video.muted = false;
    video.volume = 1.0;

    const startPlayback = async () => {
      try {
        await video.play();
      } catch (err) {
        console.warn('Autoplay com áudio bloqueado pelas restrições do navegador, iniciando com mute e recuperação imediata:', err);
        // Em navegadores modernos, se o usuário não interagiu com a aba antes, o autoplay com som pode ser bloqueado
        video.muted = true;
        try {
          await video.play();
        } catch (fatalErr) {
          console.error('Falha crítica ao iniciar vídeo de abertura:', fatalErr);
          onFinish();
          return;
        }

        // Ao menor toque, clique ou tecla, ativa o áudio instantaneamente
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

    // Timeout de segurança para garantir que a aplicação nunca trave se o arquivo falhar
    const fallbackTimer = setTimeout(() => {
      onFinish();
    }, 20000);

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [onFinish, videoSrc]);

  return (
    <div className="fixed inset-0 z-[9999999] bg-black w-screen h-screen overflow-hidden m-0 p-0 border-0 flex items-center justify-center select-none cursor-none pointer-events-none">
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        playsInline
        className="w-full h-full object-cover block m-0 p-0 border-0 outline-none"
        onEnded={onFinish}
        onError={() => {
          console.warn('Erro ao carregar ou reproduzir arquivo de vídeo.');
          onFinish();
        }}
      />
    </div>
  );
};
