import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  Sun,
  Moon,
  Coffee,
  FileText,
  Printer,
  LogIn,
  LogOut,
  Type,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type ReaderTheme = 'dark' | 'sepia' | 'light';
export type FontSize = 'sm' | 'base' | 'lg' | 'xl';

interface NavbarProps {
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  onOpenPdf: () => void;
  onPrintPdf: () => void;
  theme: ReaderTheme;
  onChangeTheme: (theme: ReaderTheme) => void;
  fontSize: FontSize;
  onChangeFontSize: (size: FontSize) => void;
  bookTitle: string;
  chapterTitle: string;
  hasOriginalPdf: boolean;
  onOpenUserProfile?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onOpenSearch,
  onOpenPdf,
  onPrintPdf,
  theme,
  onChangeTheme,
  fontSize,
  onChangeFontSize,
  bookTitle,
  chapterTitle,
  hasOriginalPdf,
  onOpenUserProfile,
}) => {
  const { user, openLoginModal, logout } = useAuth();
  const [showAppearanceMenu, setShowAppearanceMenu] = useState(false);
  const appearanceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (appearanceRef.current && !appearanceRef.current.contains(event.target as Node)) {
        setShowAppearanceMenu(false);
      }
    };
    if (showAppearanceMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAppearanceMenu]);

  const isDark = theme === 'dark';
  const isSepia = theme === 'sepia';

  const navBg = isDark
    ? 'bg-[#0F1224]/90 border-slate-800/80 text-slate-200 backdrop-blur-xl'
    : isSepia
    ? 'bg-[#f7f3e8]/90 border-[#e3dac7] text-[#42362b] backdrop-blur-xl'
    : 'bg-white/90 border-slate-200 text-slate-700 backdrop-blur-xl';

  const pillActive = isDark
    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-sm shadow-emerald-950/40'
    : isSepia
    ? 'bg-[#d8c7a7] text-[#2c2217] font-semibold'
    : 'bg-slate-900 text-white font-semibold';

  const pillInactive = isDark
    ? 'text-slate-400 hover:text-slate-100'
    : isSepia
    ? 'text-[#705e4d] hover:text-[#2c2217]'
    : 'text-slate-500 hover:text-slate-900';

  const popoverBg = isDark
    ? 'bg-[#171B38] border-slate-700 text-slate-100'
    : isSepia
    ? 'bg-[#f4eee1] border-[#d8c7a7] text-[#42362b]'
    : 'bg-white border-slate-200 text-slate-800';

  return (
    <header
      className={`sticky top-0 z-20 h-12 backdrop-blur-md border-b px-2.5 sm:px-6 flex items-center justify-between gap-2 no-print transition-colors ${navBg}`}
    >
      {/* Left: Table of contents button and book/chapter title */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-medium shrink-0 cursor-pointer"
          title="Índice dos Capítulos (Menu do Livro)"
          aria-label="Índice dos Capítulos"
        >
          <Menu className="w-4 h-4" />
          <span className="hidden sm:inline">Índice</span>
        </button>

        <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline shrink-0">|</span>

        <div className="min-w-0 flex-1 flex items-center gap-1.5 text-xs sm:text-sm font-semibold font-outfit">
          <span className="hidden md:inline opacity-75 truncate max-w-[200px] lg:max-w-[300px]" title={bookTitle}>
            {bookTitle}
          </span>
          <span className="hidden md:inline opacity-40 shrink-0">•</span>
          <span className="truncate block min-w-0" title={chapterTitle}>
            {chapterTitle}
          </span>
        </div>
      </div>

      {/* Right: Typography, Theme, PDF and Search */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Desktop: Font size adjuster */}
        <div className="hidden sm:flex items-center rounded-lg border border-black/10 dark:border-white/10 p-0.5 text-xs">
          {(['sm', 'base', 'lg'] as FontSize[]).map((sz) => (
            <button
              key={sz}
              onClick={() => onChangeFontSize(sz)}
              className={`px-2 py-0.5 rounded transition-colors text-[11px] cursor-pointer ${
                fontSize === sz ? pillActive : pillInactive
              }`}
            >
              {sz === 'sm' ? 'A-' : sz === 'base' ? 'A' : 'A+'}
            </button>
          ))}
        </div>

        {/* Desktop: Theme mode buttons */}
        <div className="hidden sm:flex items-center rounded-lg border border-black/10 dark:border-white/10 p-0.5">
          <button
            onClick={() => onChangeTheme('light')}
            className={`p-1 rounded transition-colors cursor-pointer ${
              theme === 'light' ? pillActive : pillInactive
            }`}
            title="Modo Claro"
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onChangeTheme('sepia')}
            className={`p-1 rounded transition-colors cursor-pointer ${
              theme === 'sepia' ? pillActive : pillInactive
            }`}
            title="Modo Sépia (Pergaminho)"
          >
            <Coffee className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onChangeTheme('dark')}
            className={`p-1 rounded transition-colors cursor-pointer ${
              theme === 'dark' ? pillActive : pillInactive
            }`}
            title="Modo Escuro"
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile: Compact Appearance & Actions Popover (Aa) */}
        <div className="relative sm:hidden" ref={appearanceRef}>
          <button
            onClick={() => setShowAppearanceMenu((prev) => !prev)}
            className="px-2 py-1 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center gap-1 text-xs font-bold font-outfit cursor-pointer"
            title="Aparência, Fonte e PDF"
            aria-label="Opções de leitura"
          >
            <Type className="w-3.5 h-3.5" />
            <span className="text-[11px]">Aa</span>
          </button>

          {showAppearanceMenu && (
            <div
              className={`fixed right-2.5 top-13 w-64 rounded-2xl border shadow-2xl p-3.5 z-50 space-y-3 ${popoverBg}`}
            >
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block font-outfit">
                  Tamanho da Fonte
                </span>
                <div className="grid grid-cols-3 gap-1 rounded-xl border border-black/10 dark:border-white/10 p-1">
                  {(['sm', 'base', 'lg'] as FontSize[]).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => onChangeFontSize(sz)}
                      className={`py-1.5 rounded-lg transition-colors text-xs cursor-pointer ${
                        fontSize === sz ? pillActive : pillInactive
                      }`}
                    >
                      {sz === 'sm' ? 'A-' : sz === 'base' ? 'Padrão' : 'A+'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block font-outfit">
                  Tema de Leitura
                </span>
                <div className="grid grid-cols-3 gap-1 rounded-xl border border-black/10 dark:border-white/10 p-1">
                  <button
                    onClick={() => onChangeTheme('light')}
                    className={`py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 text-[11px] cursor-pointer ${
                      theme === 'light' ? pillActive : pillInactive
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>Claro</span>
                  </button>
                  <button
                    onClick={() => onChangeTheme('sepia')}
                    className={`py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 text-[11px] cursor-pointer ${
                      theme === 'sepia' ? pillActive : pillInactive
                    }`}
                  >
                    <Coffee className="w-3.5 h-3.5" />
                    <span>Sépia</span>
                  </button>
                  <button
                    onClick={() => onChangeTheme('dark')}
                    className={`py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 text-[11px] cursor-pointer ${
                      theme === 'dark' ? pillActive : pillInactive
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>Escuro</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-black/10 dark:border-white/10 flex flex-col gap-1">
                {hasOriginalPdf && (
                  <button
                    onClick={() => {
                      setShowAppearanceMenu(false);
                      onOpenPdf();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Ver PDF Original</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowAppearanceMenu(false);
                    onPrintPdf();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-xs font-medium transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Baixar Livro em PDF</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PDF original icon (Desktop) */}
        {hasOriginalPdf && (
          <button
            onClick={onOpenPdf}
            className="hidden sm:inline-flex p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Ver / Baixar PDF Original"
          >
            <FileText className="w-3.5 h-3.5 opacity-80 hover:opacity-100 text-rose-400" />
          </button>
        )}

        {/* Save translated/structured PDF button (Desktop) */}
        <button
          onClick={onPrintPdf}
          className="hidden sm:inline-flex p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Baixar Livro Completo Estruturado em PDF (.pdf)"
        >
          <Printer className="w-3.5 h-3.5 opacity-80 hover:opacity-100 text-amber-500" />
        </button>

        {/* Search */}
        <button
          onClick={onOpenSearch}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Pesquisar no livro (Ctrl+K)"
          aria-label="Pesquisar no livro"
        >
          <Search className="w-3.5 h-3.5 opacity-80 hover:opacity-100" />
        </button>

        {/* Google User Avatar / Login */}
        {user ? (
          <div className="flex items-center gap-1 sm:gap-1.5 pl-0.5 sm:pl-1">
            <button
              onClick={() => onOpenUserProfile && onOpenUserProfile()}
              className="flex items-center rounded-full transition-transform hover:scale-105 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400"
              title={`Meu Painel de Aluno (${user.name})`}
            >
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-6 h-6 rounded-full border border-amber-500/40"
                />
              ) : (
                <div
                  className="w-6 h-6 rounded-full bg-slate-700 text-amber-400 flex items-center justify-center font-bold text-[10px]"
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </button>
            <button
              onClick={() => logout()}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Sair da conta"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => openLoginModal()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            title="Fazer Login com Google"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Entrar</span>
          </button>
        )}
      </div>
    </header>
  );
};
