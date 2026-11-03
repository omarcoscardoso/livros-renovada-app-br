import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Menu,
  Clock,
  HelpCircle,
  LogIn,
  LogOut,
  Shield,
  Layers,
  BookOpen,
  GraduationCap,
  Sparkles,
  X,
  Award,
  ExternalLink,
  Sun,
  Moon,
  User as UserIcon,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Training } from '../../types/training';
import { ReaderTheme } from '../Navbar';

interface LmsNavbarProps {
  onToggleSidebar: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategoryFilter: string;
  onSelectCategoryFilter: (category: string) => void;
  pendingTrainings: Training[];
  onSelectTraining: (training: Training) => void;
  onOpenKnowledgeBase?: () => void;
  onOpenUserProfile?: (tab?: 'learning' | 'courses' | 'certificates' | 'profile') => void;
  theme?: ReaderTheme;
  onChangeTheme?: (theme: ReaderTheme) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const LmsNavbar: React.FC<LmsNavbarProps> = ({
  onToggleSidebar,
  searchQuery,
  onSearchChange,
  selectedCategoryFilter,
  onSelectCategoryFilter,
  pendingTrainings,
  onSelectTraining,
  onOpenKnowledgeBase,
  onOpenUserProfile,
  theme = 'dark',
  onChangeTheme,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { user, isAdmin, openLoginModal, logout } = useAuth();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const isLight = theme === 'light';

  const filterOptions = [
    { id: 'Todos', label: 'Todos', icon: Layers },
    {
      id: 'Pendências',
      label: pendingTrainings.length > 0 ? `Pendências (${pendingTrainings.length})` : 'Pendências',
      icon: Clock,
    },
    { id: 'Treinamentos', label: 'Treinamentos', icon: GraduationCap },
    { id: 'Liderança', label: 'Liderança', icon: Sparkles },
    { id: 'Conteúdos', label: 'Livros', icon: BookOpen },
  ];

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur-2xl px-4 sm:px-6 py-3 transition-colors ${
        isLight
          ? 'bg-white/95 border-b border-slate-200 text-slate-900 shadow-xs'
          : 'bg-[#0F1224]/95 border-b border-slate-800/90 text-white'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
        {/* Left: Mobile Sidebar Trigger & Brand Badge */}
        <div className="flex items-center gap-2.5 lg:hidden">
          <button
            onClick={onToggleSidebar}
            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-sm active:scale-95 ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700/80 text-white'
            }`}
            aria-label="Abrir Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <img src="/assets/icon.svg" alt="Lumi Ícone" className="w-6 h-6 object-contain hidden sm:block" />
            <img src="/assets/logo_text.svg" alt="LUMI" className="h-4 w-auto object-contain" />
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[9px] font-bold font-outfit uppercase tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-400/40">
              Treinamento
            </span>
          </div>
        </div>

        {/* Center: Search Bar with Suggestions Filters (Desktop) */}
        <div className="flex-1 max-w-2xl hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar treinamentos, livros, vídeos, temas..."
              className={`w-full rounded-xl py-2 pl-10 pr-4 text-xs font-sans outline-none transition-all ${
                isLight
                  ? 'bg-slate-100/90 border border-slate-300 text-slate-900 placeholder-slate-500 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-xs'
                  : 'bg-[#171B38] border border-slate-700/70 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-inner'
              }`}
            />
          </div>

          {/* Quick Filter buttons */}
          <div className="flex items-center gap-1.5 mt-2">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider mr-1 ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              Filtrar por:
            </span>
            {filterOptions.map((f) => {
              const Icon = f.icon;
              const isSelected = selectedCategoryFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => onSelectCategoryFilter(f.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-outfit font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                      : isLight
                      ? 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                      : 'bg-[#171B38] text-slate-300 border border-slate-700/60 hover:bg-slate-700/60'
                  }`}
                >
                  <Icon className="w-3 h-3 text-slate-400" />
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Actions, Pending Tasks & User Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Mobile Search Toggle Button */}
          <button
            onClick={() => setShowMobileSearch((p) => !p)}
            className={`p-2 rounded-xl border md:hidden transition-all cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/80 text-slate-200'
            }`}
            aria-label="Buscar Treinamento"
          >
            <Search className="w-4 h-4 text-slate-400" />
          </button>

          {/* Accessible Theme Switcher Button */}
          {onChangeTheme && (
            <button
              onClick={() => onChangeTheme(isLight ? 'dark' : 'light')}
              className={`p-2 rounded-xl border transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 hover:text-slate-900 shadow-xs'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/80 text-slate-200 hover:text-white'
              }`}
              title={isLight ? 'Mudar para Modo Escuro' : 'Mudar para Modo Claro'}
              aria-label={isLight ? 'Mudar para Modo Escuro' : 'Mudar para Modo Claro'}
            >
              {isLight ? (
                <Moon className="w-4 h-4 text-indigo-600" />
              ) : (
                <Sun className="w-4 h-4 text-amber-300" />
              )}
            </button>
          )}

          {/* Minhas Pendências */}
          <div className="relative">
            <button
              onClick={() => setShowPendingModal((p) => !p)}
              className={`relative p-2 rounded-xl border transition-all cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 shadow-xs'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/80 text-slate-200'
              }`}
              title="Minhas pendências de treinamento"
              aria-label="Minhas pendências"
            >
              <Clock className="w-4 h-4 text-blue-500" />
              {pendingTrainings.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] flex items-center justify-center animate-pulse">
                  {pendingTrainings.length}
                </span>
              )}
            </button>

            {/* Pending Modal Popover */}
            {showPendingModal && (
              <div
                className={`absolute right-0 mt-2 w-80 rounded-2xl border shadow-2xl p-4 z-50 space-y-3 ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-900'
                    : 'bg-[#171B38] border-slate-700 text-white'
                }`}
              >
                <div
                  className={`flex items-center justify-between border-b pb-2 ${
                    isLight ? 'border-slate-200' : 'border-slate-700/80'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <h4 className="font-outfit font-bold text-sm">Minhas Pendências</h4>
                  </div>
                  <span className="text-[10px] font-mono text-amber-500 font-bold">
                    {pendingTrainings.length} {pendingTrainings.length === 1 ? 'pendência' : 'pendências'}
                  </span>
                </div>

                {pendingTrainings.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 text-center">
                    Parabéns! Você não possui nenhum treinamento pendente no momento.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                    {pendingTrainings.map((t) => {
                      const isMandatoryPending = t.isRequired && (t.progressPercent || 0) === 0;
                      return (
                        <div
                          key={t.id}
                          onClick={() => {
                            onSelectTraining(t);
                            setShowPendingModal(false);
                          }}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] ${
                            isLight
                              ? 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                              : 'bg-[#212642] hover:bg-[#2A3156] border-slate-700/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-outfit font-bold text-xs line-clamp-1 flex-1">
                              {t.title}
                            </p>
                            {t.isRequired && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-outfit uppercase shrink-0 ${
                                  isMandatoryPending
                                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                }`}
                              >
                                Obrigatório
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
                            <span>
                              {isMandatoryPending
                                ? `Não iniciado • ${t.lessonsCount} aulas`
                                : `${t.completedLessonsCount || 0} de ${t.lessonsCount} aulas`}
                            </span>
                            <span
                              className={`font-bold font-mono ${
                                isMandatoryPending ? 'text-amber-500' : 'text-emerald-500'
                              }`}
                            >
                              {t.progressPercent || 0}%
                            </span>
                          </div>

                          <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className={`h-full ${
                                isMandatoryPending
                                  ? 'bg-amber-500'
                                  : 'bg-gradient-to-r from-blue-500 to-emerald-400'
                              }`}
                              style={{ width: `${Math.max(t.progressPercent || 0, isMandatoryPending ? 5 : 0)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Base de Conhecimento / Ajuda */}
          <button
            onClick={() => setShowHelpModal(true)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700 shadow-xs'
                : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/80 text-slate-200'
            }`}
            title="Base de Conhecimento e Ajuda"
            aria-label="Ajuda e Informações"
          >
            <HelpCircle className="w-4 h-4 text-blue-500" />
          </button>

          {/* User Profile / Login Dropdown */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown((p) => !p)}
                className="flex items-center gap-2 p-1 rounded-full ring-2 ring-blue-500/40 hover:ring-blue-400 transition-all cursor-pointer"
                aria-label="Perfil de Usuário"
              >
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>

              {showUserDropdown && (
                <div
                  className={`absolute right-0 mt-2 w-64 rounded-2xl border shadow-2xl p-2.5 z-50 space-y-1.5 ${
                    isLight
                      ? 'bg-white border-slate-200 text-slate-900'
                      : 'bg-[#171B38] border-slate-700 text-white'
                  }`}
                >
                  {/* User Profile Header */}
                  <div
                    onClick={() => {
                      if (onOpenUserProfile) {
                        onOpenUserProfile('learning');
                        setShowUserDropdown(false);
                      }
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isLight
                        ? 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                        : 'bg-[#212642] hover:bg-[#2A3156] border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-outfit font-bold text-xs truncate flex-1">{user.name}</p>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-400/40">
                          <Shield className="w-2.5 h-2.5" /> Administrador
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-400/40">
                          <GraduationCap className="w-2.5 h-2.5" /> Aluno
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Navigation Shortcuts to User Panel */}
                  <div className="space-y-0.5 pt-1">
                    <button
                      onClick={() => {
                        if (onOpenUserProfile) onOpenUserProfile('learning');
                        setShowUserDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        isLight
                          ? 'hover:bg-slate-100 text-slate-800'
                          : 'hover:bg-slate-800/80 text-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                        <span>Meu Painel & Métricas</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    <button
                      onClick={() => {
                        if (onOpenUserProfile) onOpenUserProfile('courses');
                        setShowUserDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        isLight
                          ? 'hover:bg-slate-100 text-slate-800'
                          : 'hover:bg-slate-800/80 text-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Cursos Matriculados</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    <button
                      onClick={() => {
                        if (onOpenUserProfile) onOpenUserProfile('certificates');
                        setShowUserDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        isLight
                          ? 'hover:bg-slate-100 text-slate-800'
                          : 'hover:bg-slate-800/80 text-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        <span>Meus Certificados</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    <button
                      onClick={() => {
                        if (onOpenUserProfile) onOpenUserProfile('profile');
                        setShowUserDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        isLight
                          ? 'hover:bg-slate-100 text-slate-800'
                          : 'hover:bg-slate-800/80 text-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <UserIcon className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Meus Dados & Segurança</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>

                  {/* Logout Button */}
                  <div className={`border-t pt-1.5 ${isLight ? 'border-slate-200' : 'border-slate-700/80'}`}>
                    <button
                      onClick={() => {
                        logout();
                        setShowUserDropdown(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sair da conta</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => openLoginModal('Faça login com Google para salvar seu progresso nos treinamentos.')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold font-outfit text-xs shadow-md shadow-blue-900/40 transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Search & Quick Filters Dropdown */}
      {showMobileSearch && (
        <div
          className={`md:hidden pt-3 border-t mt-2 space-y-2.5 ${
            isLight ? 'border-slate-200' : 'border-slate-800/80'
          }`}
        >
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar treinamentos, temas, livros..."
              autoFocus
              className={`w-full rounded-xl py-2 pl-10 pr-4 text-xs font-sans outline-none ${
                isLight
                  ? 'bg-slate-100 border border-slate-300 text-slate-900 placeholder-slate-500 focus:bg-white focus:border-blue-500'
                  : 'bg-[#171B38] border border-slate-700/80 text-white placeholder-slate-400 focus:border-blue-500'
              }`}
            />
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {filterOptions.map((f) => {
              const Icon = f.icon;
              const isSelected = selectedCategoryFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => onSelectCategoryFilter(f.id)}
                  className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-outfit font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isLight
                      ? 'bg-slate-100 text-slate-700 border border-slate-200'
                      : 'bg-[#171B38] text-slate-300 border border-slate-700/60'
                  }`}
                >
                  <Icon className="w-3 h-3 text-slate-400" />
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Help Modal - Renderizado via createPortal fora do header para evitar clipping */}
      {showHelpModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md overflow-y-auto p-4 sm:p-6 flex items-center justify-center animate-fade-in"
            onClick={() => setShowHelpModal(false)}
          >
            <div
              className={`relative w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 my-auto border ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-900'
                  : 'bg-[#171B38] border-slate-700/90 text-white'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header do Modal */}
              <div
                className={`flex items-start justify-between gap-3 border-b pb-4 ${
                  isLight ? 'border-slate-200' : 'border-slate-700/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-500">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-outfit font-extrabold text-lg">
                      Base de Conhecimento • LUMI
                    </h3>
                    <p className={`text-xs font-sans ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Igreja Presbiteriana Renovada de Viamão
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowHelpModal(false)}
                  className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                    isLight
                      ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                  aria-label="Fechar Ajuda"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Conteúdo Explicativo */}
              <div className={`space-y-4 text-xs font-sans leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                <p>
                  Bem-vindo à plataforma oficial de aprendizagem, liderança e leitura digital da{' '}
                  <strong className={isLight ? 'text-slate-900' : 'text-white'}>
                    Igreja Presbiteriana Renovada
                  </strong>.
                </p>

                <div className="space-y-2.5">
                  <div
                    className={`flex gap-3 p-3 rounded-2xl border ${
                      isLight
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-[#1E2548]/50 border-slate-700/60'
                    }`}
                  >
                    <GraduationCap className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <h5 className={`font-outfit font-bold text-xs mb-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        Trilhas & Videoaulas
                      </h5>
                      <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                        Assista às aulas em vídeo no seu ritmo. Ao concluir um vídeo, marque a aula como concluída para avançar no curso.
                      </p>
                    </div>
                  </div>

                  <div
                    className={`flex gap-3 p-3 rounded-2xl border ${
                      isLight
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-[#1E2548]/50 border-slate-700/60'
                    }`}
                  >
                    <BookOpen className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <h5 className={`font-outfit font-bold text-xs mb-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        Biblioteca Digital Integrada
                      </h5>
                      <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                        Acesse as obras didáticas oficiais complementares diretamente no leitor digital LUMI para aprofundar seu estudo bíblico.
                      </p>
                    </div>
                  </div>

                  <div
                    className={`flex gap-3 p-3 rounded-2xl border ${
                      isLight
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-[#1E2548]/50 border-slate-700/60'
                    }`}
                  >
                    <Award className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h5 className={`font-outfit font-bold text-xs mb-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        Certificação com Código de Validação
                      </h5>
                      <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                        Ao completar 100% de todas as aulas de um treinamento, seu Certificado Oficial da IPR Viamão é emitido e fica salvo no seu perfil para download ou compartilhamento.
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] border-t ${
                    isLight ? 'border-slate-200 text-slate-500' : 'border-slate-700/60 text-slate-400'
                  }`}
                >
                  <span>Dúvidas ou suporte ministerial:</span>
                  <a
                    href="https://iprviamao.com.br"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 font-bold inline-flex items-center gap-1 transition-colors"
                  >
                    <span>iprviamao.com.br</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Botão Entendi */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold font-outfit shadow-md shadow-blue-950/40 cursor-pointer transition-all"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </header>
  );
};
