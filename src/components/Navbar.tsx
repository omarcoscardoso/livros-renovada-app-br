import React from 'react';
import {
  Menu,
  Search,
  Sun,
  Moon,
  Coffee,
  FileText,
  Printer,
  ShieldAlert,
  LogIn,
  LogOut,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type ReaderTheme = 'dark' | 'sepia' | 'light';
export type FontSize = 'sm' | 'base' | 'lg' | 'xl';

interface NavbarProps {
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  onOpenPdf: () => void;
  onPrintPdf: () => void;
  onOpenAdmin?: () => void;
  theme: ReaderTheme;
  onChangeTheme: (theme: ReaderTheme) => void;
  fontSize: FontSize;
  onChangeFontSize: (size: FontSize) => void;
  bookTitle: string;
  chapterTitle: string;
  hasOriginalPdf: boolean;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onOpenSearch,
  onOpenPdf,
  onPrintPdf,
  onOpenAdmin,
  theme,
  onChangeTheme,
  fontSize,
  onChangeFontSize,
  bookTitle,
  chapterTitle,
  hasOriginalPdf,
  isFocusMode = false,
  onToggleFocusMode,
}) => {
  const { user, isAdmin, openLoginModal, logout } = useAuth();
  const isDark = theme === 'dark';
  const isSepia = theme === 'sepia';

  const navBg = isDark
    ? 'bg-[#0d1117]/90 border-slate-800 text-slate-300'
    : isSepia
    ? 'bg-[#f7f3e8]/90 border-[#e3dac7] text-[#42362b]'
    : 'bg-white/90 border-slate-200 text-slate-700';

  const pillActive = isDark
    ? 'bg-amber-500/20 text-amber-300 font-semibold'
    : isSepia
    ? 'bg-[#d8c7a7] text-[#2c2217] font-semibold'
    : 'bg-slate-900 text-white font-semibold';

  const pillInactive = isDark
    ? 'text-slate-400 hover:text-slate-200'
    : isSepia
    ? 'text-[#705e4d] hover:text-[#2c2217]'
    : 'text-slate-500 hover:text-slate-900';

  return (
    <header
      className={`sticky top-0 z-20 h-12 backdrop-blur-md border-b px-3 sm:px-6 flex items-center justify-between no-print transition-colors ${navBg}`}
    >
      {/* Left: Table of contents button and book/chapter title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-medium shrink-0 cursor-pointer"
          title="Índice dos Capítulos (Menu do Livro)"
        >
          <Menu className="w-4 h-4" />
          <span className="hidden sm:inline">Índice</span>
        </button>

        <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">|</span>

        <div className="truncate flex items-center gap-1.5 text-xs sm:text-sm font-medium font-editorial">
          <span className="opacity-75 truncate max-w-[120px] sm:max-w-[200px] md:max-w-[320px]" title={bookTitle}>
            {bookTitle}
          </span>
          <span className="opacity-40">•</span>
          <span className="truncate max-w-[130px] sm:max-w-[220px] md:max-w-[320px]" title={chapterTitle}>
            {chapterTitle}
          </span>
        </div>
      </div>

      {/* Right: Typography, Theme, PDF and Search */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Font size adjuster */}
        <div className="flex items-center rounded-lg border border-black/10 dark:border-white/10 p-0.5 text-xs">
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

        {/* Theme mode buttons */}
        <div className="flex items-center rounded-lg border border-black/10 dark:border-white/10 p-0.5">
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

        {/* PDF original icon */}
        {hasOriginalPdf && (
          <button
            onClick={onOpenPdf}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Ver / Baixar PDF Original"
          >
            <FileText className="w-3.5 h-3.5 opacity-80 hover:opacity-100 text-rose-400" />
          </button>
        )}

        {/* Save translated/structured PDF button */}
        <button
          onClick={onPrintPdf}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Baixar Livro Completo Estruturado em PDF (.pdf)"
        >
          <Printer className="w-3.5 h-3.5 opacity-80 hover:opacity-100 text-amber-500" />
        </button>

        {/* Search */}
        <button
          onClick={onOpenSearch}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          title="Pesquisar no livro (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 opacity-80 hover:opacity-100" />
        </button>

        {/* Zen Focus Mode Button */}
        {onToggleFocusMode && (
          <button
            onClick={onToggleFocusMode}
            className={`p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer ${
              isFocusMode ? 'text-amber-500 bg-amber-500/15' : 'text-slate-400 hover:text-slate-200'
            }`}
            title={isFocusMode ? 'Sair do Modo Foco (Esc)' : 'Modo Foco Sem Distrações (F)'}
          >
            {isFocusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Admin Button */}
        {isAdmin && onOpenAdmin && (
          <button
            onClick={onOpenAdmin}
            className="p-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-300 border border-purple-500/30 transition-colors cursor-pointer"
            title="Painel de Administração"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Google User Avatar / Login */}
        {user ? (
          <div className="flex items-center gap-1.5 pl-1">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-6 h-6 rounded-full border border-amber-500/40"
                title={`${user.name} (${user.email})`}
              />
            ) : (
              <div
                className="w-6 h-6 rounded-full bg-slate-700 text-amber-400 flex items-center justify-center font-bold text-[10px]"
                title={`${user.name} (${user.email})`}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={() => logout()}
              className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Sair da conta Google"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => openLoginModal()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors cursor-pointer"
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
