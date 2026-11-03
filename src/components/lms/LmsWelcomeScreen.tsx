import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Heart,
  ArrowRight,
  Sun,
  Moon,
  Mail,
  Lock,
  User as UserIcon,
  LogIn,
  UserPlus,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ReaderTheme } from '../Navbar';

interface LmsWelcomeScreenProps {
  theme?: ReaderTheme;
  onChangeTheme?: (theme: ReaderTheme) => void;
}

export const LmsWelcomeScreen: React.FC<LmsWelcomeScreenProps> = ({
  theme = 'dark',
  onChangeTheme,
}) => {
  const { openLoginModal, loginWithEmail, registerWithEmail } = useAuth();
  const isLight = theme === 'light';

  const [authTab, setAuthTab] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleInlineAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (authTab === 'register') {
      if (!name.trim()) {
        setFormError('Por favor, informe seu nome completo.');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setFormError('Por favor, informe um e-mail válido.');
        return;
      }
      if (password.length < 6) {
        setFormError('A senha deve conter no mínimo 6 caracteres.');
        return;
      }

      setIsLoading(true);
      const res = await registerWithEmail(name, email, password);
      setIsLoading(false);
      if (!res.success) {
        setFormError(res.error || 'Erro ao realizar cadastro.');
      }
    } else {
      if (!email.trim() || !password) {
        setFormError('Informe seu e-mail e senha.');
        return;
      }

      setIsLoading(true);
      const res = await loginWithEmail(email, password);
      setIsLoading(false);
      if (!res.success) {
        setFormError(res.error || 'E-mail ou senha incorretos.');
      }
    }
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        isLight ? 'bg-[#F8FAFC] text-slate-900' : 'bg-[#0F1224] text-slate-100'
      }`}
    >
      {/* 1. Top Public Bar */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-colors ${
          isLight
            ? 'bg-white/90 border-slate-200 shadow-xs'
            : 'bg-[#0F1224]/90 border-slate-800/80'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <img src="/assets/icon.svg" alt="Lumi Ícone" className="w-9 h-9 object-contain" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <img src="/assets/logo_text.svg" alt="LUMI" className="h-5 w-auto object-contain" />
              </div>
              <p
                className={`text-[10px] font-medium font-sans truncate ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Igreja Presbiteriana Renovada • Viamão
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {onChangeTheme && (
              <button
                onClick={() => onChangeTheme(isLight ? 'dark' : 'light')}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                }`}
                title={isLight ? 'Mudar para Modo Escuro' : 'Mudar para Modo Claro'}
                aria-label={isLight ? 'Mudar para Modo Escuro' : 'Mudar para Modo Claro'}
              >
                {isLight ? <Moon className="w-4 h-4 text-slate-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
              </button>
            )}

            <button
              onClick={() => openLoginModal('Entre para continuar sua jornada de treinamento.')}
              className={`px-4 py-2 rounded-xl font-outfit font-bold text-xs border transition-all cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
              }`}
            >
              Entrar
            </button>

            <button
              onClick={() => openLoginModal('Crie sua conta gratuita para acessar os treinamentos.')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-outfit font-bold text-xs shadow-md shadow-blue-900/30 transition-all cursor-pointer"
            >
              Criar Conta
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section: Warm & Inspiring Welcome */}
      <section className="relative overflow-hidden py-12 sm:py-20 px-4 sm:px-8 border-b border-slate-200/60 dark:border-slate-800/80">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/30 via-indigo-500/20 to-emerald-500/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Left Column: Inspiring Pitch */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold font-outfit uppercase tracking-wider bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30 shadow-xs">
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              <span>Ambiente de Crescimento & Comunhão</span>
            </div>

            <h1 className="font-outfit font-black text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.15]">
              Capacitação que fortalece sua vocação na{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">
                Obra do Senhor
              </span>
              .
            </h1>

            <p
              className={`text-sm sm:text-base leading-relaxed max-w-xl font-sans ${
                isLight ? 'text-slate-600' : 'text-slate-300'
              }`}
            >
              Seja bem-vindo ao <strong>LUMI</strong>. Um espaço dedicado a preparar, equipar e abençoar cada membro, voluntário e líder da <strong>Igreja Presbiteriana Renovada</strong> com videoaulas e literatura bíblica.
            </p>

            {/* Quick Benefits Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-outfit">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Gestão de turmas e acompanhamento pastoral</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Videoaulas práticas e dinâmicas</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Biblioteca digital de livros de apoio</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Certificado oficial com autenticação</span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => openLoginModal('Cadastre-se para iniciar seus treinamentos.')}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold font-outfit text-sm shadow-xl shadow-blue-900/40 transition-all cursor-pointer transform hover:scale-[1.02]"
              >
                <span>Cadastrar-se</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => openLoginModal('Entre com sua conta para continuar.')}
                className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border font-bold font-outfit text-sm transition-all cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Já Sou Discipulo / Entrar</span>
              </button>
            </div>
          </div>

          {/* Right Column: Direct Welcome Registration / Login Card */}
          <div className="lg:col-span-5">
            <div
              className={`p-6 sm:p-8 rounded-3xl border shadow-2xl space-y-5 transition-all ${
                isLight
                  ? 'bg-white border-slate-200 shadow-slate-200/50'
                  : 'bg-[#151A3A] border-slate-700/80 shadow-2xl'
              }`}
            >
              <div className="text-center space-y-1">
                <h3 className="font-outfit font-extrabold text-xl">
                  {authTab === 'register' ? 'Criar Minha Conta' : 'Entrar na Plataforma'}
                </h3>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {authTab === 'register'
                    ? 'Leva menos de 1 minuto e você já pode começar a estudar.'
                    : 'Digite suas credenciais para continuar suas aulas.'}
                </p>
              </div>

              {/* Tabs Switcher */}
              <div
                className={`p-1 rounded-2xl flex items-center border ${
                  isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#10142C] border-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('register');
                    setFormError(null);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-outfit font-bold transition-all cursor-pointer ${
                    authTab === 'register'
                      ? 'bg-blue-600 text-white shadow-md'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5 inline mr-1" />
                  Cadastrar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('login');
                    setFormError(null);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-outfit font-bold transition-all cursor-pointer ${
                    authTab === 'login'
                      ? 'bg-blue-600 text-white shadow-md'
                      : isLight
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5 inline mr-1" />
                  Entrar
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-500">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleInlineAuth} className="space-y-3">
                {authTab === 'register' && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold font-outfit uppercase tracking-wider block text-slate-500">
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
                        className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                          isLight
                            ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600'
                            : 'bg-slate-900/80 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500'
                        }`}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-bold font-outfit uppercase tracking-wider block text-slate-500">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600'
                          : 'bg-slate-900/80 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold font-outfit uppercase tracking-wider block text-slate-500">
                    Senha {authTab === 'register' && <span className="font-normal lowercase text-[10px]">(mín. 6 dígitos)</span>}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-xs outline-none transition-all ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600'
                          : 'bg-slate-900/80 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500'
                      }`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold font-outfit text-xs shadow-lg shadow-blue-900/40 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : authTab === 'register' ? (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Criar Conta e Acessar Cursos</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Entrar no Sistema</span>
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 text-center">
                <button
                  onClick={() => openLoginModal()}
                  className={`text-xs font-semibold hover:underline cursor-pointer ${
                    isLight ? 'text-blue-700' : 'text-blue-400'
                  }`}
                >
                  Prefere entrar com sua conta Google? Clique aqui.
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Pastoral Verse & Denomination Footer */}
      <footer
        className={`border-t py-12 px-4 sm:px-8 text-center transition-colors ${
          isLight
            ? 'bg-slate-100 border-slate-200 text-slate-600'
            : 'bg-[#0B0D1B] border-slate-800 text-slate-400'
        }`}
      >
        <div className="max-w-2xl mx-auto space-y-4">
          <p className="text-xs sm:text-sm font-sans italic leading-relaxed">
            "Procure apresentar-se a Deus aprovado, como obreiro que não tem do que se envergonhar e que maneja corretamente a palavra da verdade."
          </p>
          <span className="text-[11px] font-bold font-mono uppercase tracking-widest text-blue-500 block">
            — 2 Timóteo 2:15
          </span>

          <div className="pt-4 border-t border-slate-300/60 dark:border-slate-800/80 space-y-1">
            <h4 className={`font-outfit font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Igreja Presbiteriana Renovada de Viamão
            </h4>
            <p className="text-xs">
              Glorificando a Deus, servindo a comunidade •{' '}
              <a
                href="https://iprviamao.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                iprviamao.com.br
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};