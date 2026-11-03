import React, { useState } from 'react';
import {
  Download,
  WifiOff,
  RefreshCw,
  X,
  Share,
  PlusSquare,
  Sparkles,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';
import { usePwa } from '../../context/PwaContext';

export const PwaInstallBanner: React.FC = () => {
  const {
    isInstallable,
    isInstalled,
    isOffline,
    isUpdateAvailable,
    isIos,
    promptInstall,
    updateApp,
    dismissInstallPrompt,
    isDismissed,
  } = usePwa();

  const [installing, setInstalling] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      await promptInstall();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <>
      {/* 1. Offline Floating Indicator */}
      {isOffline && (
        <div className="fixed bottom-4 left-4 z-50 animate-bounce duration-1000">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-amber-500/90 hover:bg-amber-500 text-slate-950 font-semibold text-xs shadow-lg shadow-amber-500/20 backdrop-blur-md transition-all">
            <WifiOff className="w-4 h-4 shrink-0 text-slate-950" />
            <span>Modo Offline: Leitura local ativa</span>
          </div>
        </div>
      )}

      {/* 2. Service Worker Update Notification */}
      {isUpdateAvailable && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#0F1224] to-[#1E2548] text-white border border-[#5C6BC0]/40 shadow-2xl shadow-[#5C6BC0]/20 flex items-center justify-between gap-3 backdrop-blur-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#5C6BC0]/20 border border-[#5C6BC0]/40 flex items-center justify-center shrink-0 text-[#8C9EFF]">
                <RefreshCw className="w-4 h-4 animate-spin" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">Atualização Disponível</p>
                <p className="text-[11px] text-slate-300 truncate">Nova versão do Lumi pronta.</p>
              </div>
            </div>
            <button
              onClick={updateApp}
              className="px-3 py-1.5 rounded-xl bg-[#5C6BC0] hover:bg-[#4D5AB5] text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
            >
              Atualizar
            </button>
          </div>
        </div>
      )}

      {/* 3. PWA Installation Banner (Android / Desktop Chrome / Edge) */}
      {isInstallable && !isInstalled && !isDismissed && (
        <div className="fixed bottom-4 right-4 z-40 max-w-md w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="p-4 rounded-3xl bg-[#0F1224]/95 text-white border border-slate-700/80 shadow-2xl shadow-black/60 backdrop-blur-xl relative overflow-hidden">
            {/* Ambient background aura */}
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#FE6E27]/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#0F1224] border border-slate-700 p-1.5 flex items-center justify-center shrink-0 shadow-inner">
                  <img src="/assets/icon.svg" alt="Lumi" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold font-editorial flex items-center gap-1.5 text-white">
                    Instalar Aplicativo Lumi
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-tight">
                    Acesse livros e cursos direto da tela inicial, com tela cheia e suporte offline.
                  </p>
                </div>
              </div>

              <button
                onClick={dismissInstallPrompt}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                title="Agora não"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3.5 flex items-center gap-2 pt-2 border-t border-slate-800/80 relative z-10">
              <button
                onClick={handleInstallClick}
                disabled={installing}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-[#FE6E27] to-[#FF9F25] hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#FE6E27]/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{installing ? 'Instalando...' : 'Instalar Aplicativo'}</span>
              </button>
              <button
                onClick={dismissInstallPrompt}
                className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
              >
                Depois
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. iOS Safari Add-to-Home-Screen Banner */}
      {isIos && !isInstalled && !isDismissed && (
        <div className="fixed bottom-4 right-4 z-40 max-w-sm w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="p-3.5 rounded-3xl bg-[#0F1224]/95 text-white border border-slate-700/80 shadow-2xl backdrop-blur-xl">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0F1224] border border-slate-700 p-1 flex items-center justify-center shrink-0">
                  <img src="/assets/icon.svg" alt="Lumi" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1">
                    Instalar no iPhone / iPad
                  </h4>
                  <p className="text-[10px] text-slate-300">
                    Use como aplicativo nativo em tela cheia.
                  </p>
                </div>
              </div>
              <button
                onClick={dismissInstallPrompt}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                aria-label="Fechar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-2.5 p-2 rounded-xl bg-white/5 border border-white/10 text-[11px] text-slate-200 space-y-1">
              <p className="flex items-center gap-1.5">
                1. Toque no botão de compartilhar <Share className="w-3.5 h-3.5 text-sky-400 inline shrink-0" /> no Safari.
              </p>
              <p className="flex items-center gap-1.5">
                2. Selecione <PlusSquare className="w-3.5 h-3.5 text-emerald-400 inline shrink-0" /> <strong>"Adicionar à Tela de Início"</strong>.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
