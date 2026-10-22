import React from 'react';
import {
  Menu,
  Search,
  Sun,
  Moon,
  Coffee,
  FileText,
  Printer,
  Library,
  Upload,
} from 'lucide-react';

export type ReaderTheme = 'dark' | 'sepia' | 'light';
export type FontSize = 'sm' | 'base' | 'lg' | 'xl';

interface NavbarProps {
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  onOpenPdf: () => void;
  onPrintPdf: () => void;
  onOpenLibrary: () => void;
  onOpenUpload: () => void;
  theme: ReaderTheme;
  onChangeTheme: (theme: ReaderTheme) => void;
  fontSize: FontSize;
  onChangeFontSize: (size: FontSize) => void;
  bookTitle: string;
  chapterTitle: string;
  totalBooksCount: number;
  hasOriginalPdf: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onOpenSearch,
  onOpenPdf,
  onPrintPdf,
  onOpenLibrary,
  onOpenUpload,
  theme,
  onChangeTheme,
  fontSize,
  onChangeFontSize,
  bookTitle,
  chapterTitle,
  totalBooksCount,
  hasOriginalPdf,
}) => {
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
      {/* Left: Table of contents button, Library button, and book/chapter title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-medium shrink-0"
          title="Índice dos Capítulos"
        >
          <Menu className="w-4 h-4" />
          <span className="hidden sm:inline">Índice</span>
        </button>

        <button
          onClick={onOpenLibrary}
          className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-colors flex items-center gap-1.5 text-xs font-semibold shrink-0"
          title="Abrir Estante de Livros da Biblioteca"
        >
          <Library className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Biblioteca</span>
          <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-[10px] font-mono">
            {totalBooksCount}
          </span>
        </button>

        <button
          onClick={onOpenUpload}
          className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1.5 text-xs font-semibold shrink-0"
          title="Subir novo livro em PDF e converter para leitura"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Subir PDF</span>
        </button>

        <span className="text-xs text-slate-400 dark:text-slate-500 hidden md:inline">|</span>

        <div className="truncate hidden md:flex items-center gap-1.5 text-xs sm:text-sm font-medium font-editorial">
          <span className="opacity-75 truncate max-w-[180px]">{bookTitle}</span>
          <span className="opacity-40">•</span>
          <span className="truncate">{chapterTitle}</span>
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
              className={`px-2 py-0.5 rounded transition-colors text-[11px] ${
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
            className={`p-1 rounded transition-colors ${
              theme === 'light' ? pillActive : pillInactive
            }`}
            title="Modo Claro"
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onChangeTheme('sepia')}
            className={`p-1 rounded transition-colors ${
              theme === 'sepia' ? pillActive : pillInactive
            }`}
            title="Modo Sépia (Pergaminho)"
          >
            <Coffee className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onChangeTheme('dark')}
            className={`p-1 rounded transition-colors ${
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
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Ver / Baixar PDF Original"
          >
            <FileText className="w-3.5 h-3.5 opacity-80 hover:opacity-100 text-rose-400" />
          </button>
        )}

        {/* Save translated/structured PDF button */}
        <button
          onClick={onPrintPdf}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          title="Baixar Livro Completo Estruturado em PDF (.pdf)"
        >
          <Printer className="w-3.5 h-3.5 opacity-80 hover:opacity-100 text-amber-500" />
        </button>

        {/* Search */}
        <button
          onClick={onOpenSearch}
          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          title="Pesquisar no livro (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 opacity-80 hover:opacity-100" />
        </button>
      </div>
    </header>
  );
};
