import React, { useEffect, useRef, useState } from 'react';
import { X, ShieldCheck, BookOpen, Sparkles, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ReaderTheme } from './Navbar';

interface LoginModalProps {
  theme: ReaderTheme;
}

declare global {
  interface Window {
    google?: any;
  }
}

export const LoginModal: React.FC<LoginModalProps> = ({ theme }) => {
  const { isLoginModalOpen, closeLoginModal, loginPromptMessage, loginWithGoogleCredential } =
    useAuth();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  const isDark = theme === 'dark';
  const isSepia = theme === 'sepia';

  const modalBg = isDark
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : isSepia
    ? 'bg-[#f7f3e8] border-[#e3dac7] text-[#2c2217]'
    : 'bg-white border-slate-200 text-slate-900';

  const mutedText = isDark ? 'text-slate-400' : isSepia ? 'text-[#705e4d]' : 'text-slate-500';

  useEffect(() => {
    if (!isLoginModalOpen) {
      setErrorMessage(null);
      setIsAuthenticating(false);
      return;
    }

    const handleCredentialResponse = async (response: any) => {
      if (response?.credential) {
        setIsAuthenticating(true);
        setErrorMessage(null);
        const res = await loginWithGoogleCredential(response.credential);
        setIsAuthenticating(false);
        if (!res.success) {
          setErrorMessage(res.error || 'Não foi possível validar seu login.');
        }
      }
    };

    const renderGoogleBtn = (targetClientId: string) => {
      if (!targetClientId || !window.google?.accounts?.id || !googleBtnRef.current) return;
      try {
        window.google.accounts.id.initialize({
          client_id: targetClientId,
          callback: handleCredentialResponse,
          auto_select: false,
        });

        googleBtnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: isDark ? 'filled_black' : 'outline',
          size: 'large',
          type: 'standard',
          shape: 'pill',
          text: 'signin_with',
          logo_alignment: 'left',
          width: 280,
        });
      } catch (err) {
        console.warn('Aviso ao inicializar Google Identity Services:', err);
      }
    };

    const initGoogleGsi = async () => {
      let resolvedClientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
      if (!resolvedClientId) {
        try {
          const res = await fetch('/api/auth/config');
          if (res.ok) {
            const data = await res.json();
            if (data.clientId) resolvedClientId = data.clientId;
          }
        } catch {
          // ignore
        }
      }
      renderGoogleBtn(resolvedClientId);
    };

    if (window.google?.accounts?.id) {
      initGoogleGsi();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGoogleGsi();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [isLoginModalOpen, isDark, loginWithGoogleCredential]);

  if (!isLoginModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeLoginModal();
      }}
    >
      <div
        className={`relative w-full max-w-md rounded-2xl border p-6 sm:p-8 shadow-2xl transition-all ${modalBg}`}
      >
        <button
          onClick={closeLoginModal}
          className={`absolute top-4 right-4 p-2 rounded-xl border border-transparent hover:border-current/10 ${mutedText} hover:text-current transition-colors`}
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
            <LogIn className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl sm:text-2xl font-bold font-editorial">
              Entrar na Biblioteca Digital
            </h2>
            <p className={`text-xs sm:text-sm ${mutedText}`}>
              {loginPromptMessage || 'Acesse recursos de edição, upload e sincronização de leitura.'}
            </p>
          </div>

          {/* Public Reading Guarantee Banner (Requirement 5) */}
          <div className="w-full text-left p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
            <BookOpen className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
            <div>
              <p className="font-bold">Leitura 100% Livre e Gratuita</p>
              <p className="opacity-90 leading-relaxed mt-0.5">
                Você pode ler todos os livros, sumários e capítulos sem precisar de cadastro. O login serve para você salvar seu histórico na nuvem, enviar novos livros em PDF ou editar obras.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="w-full p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-500 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Google Sign-in Button Container */}
          <div className="w-full flex flex-col items-center justify-center pt-2 min-h-[46px]">
            {isAuthenticating ? (
              <div className="flex items-center gap-2 text-xs text-amber-500 animate-pulse py-2">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>Autenticando sua conta Google...</span>
              </div>
            ) : (
              <div ref={googleBtnRef} className="flex justify-center" />
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 pt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Autenticação direta e protegida via Google Identity Services</span>
          </div>
        </div>
      </div>
    </div>
  );
};
