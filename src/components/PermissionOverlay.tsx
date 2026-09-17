import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Bell, 
  MapPin, 
  Camera, 
  Fingerprint, 
  Download, 
  X, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight
} from 'lucide-react';

interface PermissionStatus {
  id: string;
  label: string;
  desc: string;
  icon: any;
  status: 'granted' | 'denied' | 'prompt' | 'unsupported';
}

interface PermissionOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const PermissionOverlay: React.FC<PermissionOverlayProps> = ({ isOpen, onClose }) => {
  const [permissions, setPermissions] = useState<PermissionStatus[]>([
    { 
      id: 'notifications', 
      label: 'Notificações Push', 
      desc: 'Para alertas de paradas e metas em tempo real.', 
      icon: Bell, 
      status: 'prompt' 
    },
    { 
      id: 'geolocation', 
      label: 'Geolocalização', 
      desc: 'Validação de presença no posto de trabalho.', 
      icon: MapPin, 
      status: 'prompt' 
    },
    { 
      id: 'camera', 
      label: 'Câmera', 
      desc: 'Para escaneamento futuro de fichas com IA.', 
      icon: Camera, 
      status: 'prompt' 
    },
    { 
      id: 'biometrics', 
      label: 'Biometria / FaceID', 
      desc: 'Login rápido e seguro sem senhas.', 
      icon: Fingerprint, 
      status: 'prompt' 
    },
    { 
      id: 'pwa', 
      label: 'Instalação (PWA)', 
      desc: 'Executar como app nativo para melhor performance.', 
      icon: Download, 
      status: 'prompt' 
    }
  ]);

  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    checkInitialStatuses();

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      updateStatus('pwa', 'granted'); // Simboliza que está disponível para instalar
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const checkInitialStatuses = async () => {
    const updated = [...permissions];
    
    // Notifications
    if ('Notification' in window) {
      updated[0].status = Notification.permission === 'default' ? 'prompt' : (Notification.permission as any);
    } else {
      updated[0].status = 'unsupported';
    }

    // Geolocation
    if ('geolocation' in navigator) {
      if ('permissions' in navigator) {
        try {
          const res = await navigator.permissions.query({ name: 'geolocation' as any });
          updated[1].status = res.state as any;
        } catch (e) {
          updated[1].status = 'prompt';
        }
      }
    } else {
      updated[1].status = 'unsupported';
    }

    // Camera
    if ('mediaDevices' in navigator) {
      if ('permissions' in navigator) {
        try {
          const res = await navigator.permissions.query({ name: 'camera' as any });
          updated[2].status = res.state as any;
        } catch (e) {
          updated[2].status = 'prompt';
        }
      }
    } else {
      updated[2].status = 'unsupported';
    }

    // Biometrics (WebAuthn check)
    if (window.PublicKeyCredential) {
      updated[3].status = 'prompt';
    } else {
      updated[3].status = 'unsupported';
    }

    setPermissions(updated);
  };

  const updateStatus = (id: string, status: PermissionStatus['status']) => {
    setPermissions(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };

  const requestPermission = async (id: string) => {
    switch (id) {
      case 'notifications':
        if ('Notification' in window) {
          const res = await Notification.requestPermission();
          updateStatus(id, res as any);
        }
        break;
      case 'geolocation':
        navigator.geolocation.getCurrentPosition(
          () => updateStatus(id, 'granted'),
          () => updateStatus(id, 'denied')
        );
        break;
      case 'camera':
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
          updateStatus(id, 'granted');
        } catch (e) {
          updateStatus(id, 'denied');
        }
        break;
      case 'pwa':
        if (installPrompt) {
          installPrompt.prompt();
          const { outcome } = await installPrompt.userChoice;
          if (outcome === 'accepted') updateStatus(id, 'granted');
          setInstallPrompt(null);
        }
        break;
      case 'biometrics':
        // Simulação de solicitação, pois requer desafio do servidor
        updateStatus(id, 'granted');
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <ShieldCheck size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">Configuração de Acesso</h2>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Otimize sua experiência industrial</p>
              </div>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-400">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-3">
            {permissions.map((p) => (
              <div 
                key={p.id}
                className={`group p-4 rounded-3xl border-2 transition-all flex items-center justify-between ${
                  p.status === 'granted' 
                    ? 'bg-emerald-50/30 border-emerald-100' 
                    : p.status === 'denied'
                    ? 'bg-red-50/30 border-red-100'
                    : 'bg-slate-50/50 border-slate-100 border-dashed hover:border-blue-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                    p.status === 'granted' ? 'bg-emerald-100 text-emerald-600' : 
                    p.status === 'denied' ? 'bg-red-100 text-red-600' : 
                    'bg-white text-slate-400 group-hover:text-blue-500 shadow-sm'
                  }`}>
                    <p.icon size={22} strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-sm uppercase leading-none mb-1">{p.label}</h3>
                    <p className="text-[11px] text-slate-400 font-medium leading-tight">{p.desc}</p>
                  </div>
                </div>

                {p.status === 'granted' ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full">
                    <CheckCircle2 size={14} />
                    <span className="text-[10px] font-black uppercase">Ativo</span>
                  </div>
                ) : p.status === 'unsupported' ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full">
                    <AlertCircle size={14} />
                    <span className="text-[10px] font-black uppercase">ND</span>
                  </div>
                ) : (
                  <button 
                    onClick={() => requestPermission(p.id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-slate-200"
                  >
                    Ativar <ChevronRight size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4">
             <div className="p-4 bg-blue-50 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={16} />
                <p className="text-[10px] text-blue-800 font-bold leading-relaxed uppercase">
                  Atenção: A geolocalização é obrigatória para validar o posto de trabalho físico de acordo com as normas de segurança industrial.
                </p>
             </div>
             
             <button 
               onClick={onClose}
               className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl shadow-slate-200"
             >
               Confirmar Configurações
             </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PermissionOverlay;
