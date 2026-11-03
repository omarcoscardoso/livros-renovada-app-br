import React, { useEffect, useRef, useState } from 'react';
import { X, ShieldCheck, Sparkles, LogIn, AlertCircle, UserPlus, Mail, Lock, User as UserIcon } from 'lucide-react';
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
  const {
    isLoginModalOpen,
    closeLoginModal,
    loginPromptMessage,
    loginWithGoogleCredential,
    loginWithEmail,
    registerWithEmail,
  } = useAuth();

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isDark = theme === 'dark';
  const isSepia = theme === 'sepia';

  const modalBg = isDark
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : isSepia
    ? 'bg-[#f7f3e8] border-[#e3dac7] text-[#2c2217]'
    : 'bg-white border-slate-200 text-slate-900';

  const mutedText = isDark ? 'text-slate-400' : isSepia ? 'text-[#705e4d]' : 'text-slate-500';

  const inputBg = isDark
    ? 'bg-slate-800/80 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500'
    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600';

  useEffect(() => {
    if (!isLoginModalOpen) {
      setErrorMessage(null);
      setIsAuthenticating(false);
      setName('');
      setEmail('');
      setPassword('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (activeTab === 'register') {
      if (!name.trim()) {
        setErrorMessage('Por favor, informe seu nome completo.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setErrorMessage('Por favor, informe um endereço de e-mail válido.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('A senha deve conter pelo menos 6 caracteres.');
        return;
      }

      setIsAuthenticating(true);
      const res = await registerWithEmail(name, email, password);
      setIsAuthenticating(false);
      if (!res.success) {
        setErrorMessage(res.error || 'Erro ao realizar cadastro.');
      }
    } else {
      if (!email.trim()) {
        setErrorMessage('Por favor, informe seu e-mail.');
        return;
      }
      if (!password) {
        setErrorMessage('Por favor, informe sua senha.');
        return;
      }

      setIsAuthenticating(true);
      const res = await loginWithEmail(email, password);
      setIsAuthenticating(false);
      if (!res.success) {
        setErrorMessage(res.error || 'E-mail ou senha incorretos.');
      }
    }
  };

  if (!isLoginModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeLoginModal();
      }}
    >
      <div
        className={`relative w-full max-w-md rounded-3xl border p-6 sm:p-8 shadow-2xl transition-all my-8 ${modalBg}`}
      >
        <button
          onClick={closeLoginModal}
          className={`absolute top-5 right-5 p-2 rounded-xl border border-transparent hover:border-current/10 ${mutedText} hover:text-current transition-colors cursor-pointer`}
          title="Fechar"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center space-y-4">
          <div className="flex items-center justify-center p-2">
            <img src="/assets/icon.svg" alt="Lumi Ícone" className="w-16 h-16 object-contain" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center">
              <img src="/assets/logo_text.svg" alt="LUMI" className="h-6 w-auto object-contain" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-outfit tracking-tight">
              {activeTab === 'login' ? 'Acessar Conta' : 'Criar Nova Conta'}
            </h2>
            <p className={`text-xs ${mutedText}`}>
              {loginPromptMessage || 'Acesse seus treinamentos, certificados e biblioteca da Igreja Presbiteriana Renovada.'}
            </p>
          </div>

          {/* Abas Entrar / Cadastrar */}
          <div className="w-full flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-outfit font-bold transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 inline mr-1.5" />
              Entrar
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-outfit font-bold transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 inline mr-1.5" />
              Criar Conta
            </button>
          </div>

          {errorMessage && (
            <div className="w-full p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-500 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form com E-mail e Senha */}
          <form onSubmit={handleSubmit} className="w-full space-y-3 pt-1 text-left">
            {activeTab === 'register' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold font-outfit uppercase tracking-wider block text-slate-500 dark:text-slate-400">
                  Nome Completo
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome e sobrenome"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs outline-none transition-all ${inputBg}`}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold font-outfit uppercase tracking-wider block text-slate-500 dark:text-slate-400">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@iprviamao.com.br"
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs outline-none transition-all ${inputBg}`}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold font-outfit uppercase tracking-wider block text-slate-500 dark:text-slate-400">
                Senha {activeTab === 'register' && <span className="font-normal lowercase text-[10px]">(mín. 6 dígitos)</span>}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs outline-none transition-all ${inputBg}`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold font-outfit text-xs shadow-lg shadow-blue-950/40 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAuthenticating ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : activeTab === 'register' ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Cadastrar e Começar</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Acessar Plataforma</span>
                </>
              )}
            </button>
          </form>

          {/* Divisor */}
          <div className="w-full flex items-center gap-3 pt-2">
            <span className="flex-1 h-[1px] bg-slate-200 dark:bg-slate-800" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Ou continue com
            </span>
            <span className="flex-1 h-[1px] bg-slate-200 dark:bg-slate-800" />
          </div>

          {/* Google Sign-in Button Container */}
          <div className="w-full flex flex-col items-center justify-center min-h-[46px]">
            <div ref={googleBtnRef} className="flex justify-center" />
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Dados protegidos • Igreja Presbiteriana Renovada</span>
          </div>
        </div>
      </div>
    </div>
  );
};
