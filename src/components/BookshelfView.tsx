import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Upload,
  FileText,
  Trash2,
  Edit3,
  Clock,
  Layers,
  Loader2,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Search,
  Sun,
  Coffee,
  Moon,
  Library,
  Grid3X3,
  List,
  X,
  ShieldAlert,
  LogIn,
  LogOut,
  User,
  Filter,
  ChevronRight,
} from 'lucide-react';
import { BookSummary } from '../data/bookTypes';
import { ReaderTheme } from './Navbar';
import { ReadChaptersMap } from '../utils/readingProgressStorage';
import { useAuth } from '../context/AuthContext';

export type BookshelfViewMode = 'grid' | 'list';

interface BookshelfViewProps {
  books: BookSummary[];
  readChaptersMap: ReadChaptersMap;
  theme: ReaderTheme;
  onChangeTheme: (theme: ReaderTheme) => void;
  onSelectBook: (bookId: string) => void;
  onOpenUpload: () => void;
  onOpenPdfForBook: (bookId: string) => void;
  onEditBook: (bookId: string) => void;
  onDeleteBook: (bookId: string) => void;
  onReprocessBook: (bookId: string) => void;
  onOpenAdmin: () => void;
}

const COVER_STYLES: Record<string, string> = {
  amber: 'from-amber-600 via-amber-800 to-slate-950 border-amber-500/40 text-amber-100',
  emerald: 'from-emerald-600 via-emerald-800 to-slate-950 border-emerald-500/40 text-emerald-100',
  blue: 'from-blue-600 via-blue-800 to-slate-950 border-blue-500/40 text-blue-100',
  rose: 'from-rose-600 via-rose-800 to-slate-950 border-rose-500/40 text-rose-100',
  violet: 'from-violet-600 via-violet-800 to-slate-950 border-violet-500/40 text-violet-100',
};

export const BookshelfView: React.FC<BookshelfViewProps> = ({
  books,
  readChaptersMap,
  theme,
  onChangeTheme,
  onSelectBook,
  onOpenUpload,
  onOpenPdfForBook,
  onEditBook,
  onDeleteBook,
  onReprocessBook,
  onOpenAdmin,
}) => {
  const { user, isAdmin, openLoginModal, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'reading' | 'completed' | 'pdf'>('all');
  const [viewMode, setViewMode] = useState<BookshelfViewMode>(() => {
    try {
      const saved = localStorage.getItem('ipr_bookshelf_view_mode') as BookshelfViewMode | null;
      return saved === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });

  const isDark = theme === 'dark';
  const isSepia = theme === 'sepia';

  const pageBg = isDark
    ? 'bg-[#0f141c] text-slate-100'
    : isSepia
    ? 'bg-[#f7f3e8] text-[#2c2217]'
    : 'bg-slate-50 text-slate-900';

  const headerBg = isDark
    ? 'bg-[#0d1117]/90 border-slate-800'
    : isSepia
    ? 'bg-[#efe8d5]/90 border-[#e3dac7]'
    : 'bg-white/90 border-slate-200';

  const cardBg = isDark
    ? 'bg-slate-900/90 border-slate-800 hover:border-amber-500/50'
    : isSepia
    ? 'bg-[#ece4d0]/80 border-[#dccfb4] hover:border-amber-700/50'
    : 'bg-white border-slate-200 hover:border-amber-500/60 shadow-sm';

  const mutedText = isDark
    ? 'text-slate-400'
    : isSepia
    ? 'text-[#705e4d]'
    : 'text-slate-500';

  const inputBg = isDark
    ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500'
    : isSepia
    ? 'bg-[#ece4d0] border-[#d8c7a7] text-[#2c2217] placeholder-[#8c7865]'
    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400';

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

  const handleSetViewMode = (mode: BookshelfViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('ipr_bookshelf_view_mode', mode);
    } catch {
      // ignore
    }
  };

  // Requirement 1: Calibre-style search parser
  const filteredBooks = books.filter((b) => {
    const readForBook = readChaptersMap[b.id] || [];
    const readCount = readForBook.length;
    const totalCh = Math.max(1, b.chapterCount);
    const isCompleted = readCount >= totalCh && totalCh > 0;
    const isReading = readCount > 0 && !isCompleted;

    if (statusFilter === 'reading' && !isReading) return false;
    if (statusFilter === 'completed' && !isCompleted) return false;
    if (statusFilter === 'pdf' && !b.hasOriginalPdf) return false;

    if (!searchQuery.trim()) return true;

    const raw = searchQuery.toLowerCase().trim();

    // Calibre syntax parsing: 'autor: ...' or 'author: ...'
    if (raw.startsWith('autor:') || raw.startsWith('author:')) {
      const term = raw.split(':')[1]?.trim();
      return term ? b.author.toLowerCase().includes(term) : true;
    }

    // Calibre syntax: 'titulo:' or 'title:'
    if (raw.startsWith('titulo:') || raw.startsWith('title:')) {
      const term = raw.split(':')[1]?.trim();
      return term
        ? b.titlePt.toLowerCase().includes(term) || b.subtitlePt.toLowerCase().includes(term)
        : true;
    }

    // Calibre syntax: 'ano:' or 'year:'
    if (raw.startsWith('ano:') || raw.startsWith('year:')) {
      const term = raw.split(':')[1]?.trim();
      return term ? String(b.originalYear).includes(term) : true;
    }

    // Free-text fuzzy match across title, subtitle, author, and publisher
    return (
      b.titlePt.toLowerCase().includes(raw) ||
      b.subtitlePt.toLowerCase().includes(raw) ||
      b.author.toLowerCase().includes(raw) ||
      b.publisher.toLowerCase().includes(raw) ||
      String(b.originalYear).includes(raw)
    );
  });

  const totalReadChaptersAcrossLibrary = books.reduce((sum, b) => {
    const readForBook = readChaptersMap[b.id]?.length || 0;
    return sum + readForBook;
  }, 0);

  // Active reading book for the Antigravity Hero Banner
  const activeReadingBook =
    books.find((b) => {
      const read = readChaptersMap[b.id] || [];
      return read.length > 0 && read.length < Math.max(1, b.chapterCount);
    }) ||
    (books.length > 0 && (readChaptersMap[books[0].id]?.length || 0) > 0 ? books[0] : null);

  // Protected actions (Requirement 3a, 3b)
  const handleUploadClick = () => {
    if (!user) {
      openLoginModal('Faça login com sua conta Google para adicionar novos livros em PDF à biblioteca.');
      return;
    }
    onOpenUpload();
  };

  const handleEditClick = (bookId: string) => {
    if (!user) {
      openLoginModal('Faça login com sua conta Google para editar os capítulos e metadados deste livro.');
      return;
    }
    onEditBook(bookId);
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 relative ${pageBg}`}>
      {/* Antigravity Ambient Background Glow Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div
          className={`absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[140px] opacity-25 ${
            isDark ? 'bg-amber-600/30' : isSepia ? 'bg-[#d8c7a7]/50' : 'bg-amber-300/40'
          }`}
        />
        <div
          className={`absolute top-1/3 -right-40 w-[450px] h-[450px] rounded-full blur-[140px] opacity-20 ${
            isDark ? 'bg-indigo-600/20' : isSepia ? 'bg-amber-800/20' : 'bg-amber-400/20'
          }`}
        />
        <div
          className={`absolute -bottom-40 left-1/3 w-[500px] h-[500px] rounded-full blur-[140px] opacity-15 ${
            isDark ? 'bg-emerald-600/20' : isSepia ? 'bg-emerald-800/15' : 'bg-emerald-300/30'
          }`}
        />
      </div>

      {/* Top Header Bar */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md px-4 sm:px-8 py-3.5 ${headerBg}`}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold font-display tracking-wide">
                Estante Virtual de Livros
              </h1>
              <p className={`text-xs ${mutedText} font-editorial`}>
                Biblioteca Digital & Conversor Inteligente de Livros em PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Theme Selector */}
            <div className="flex items-center rounded-xl border border-black/10 dark:border-white/10 p-1">
              <button
                onClick={() => onChangeTheme('light')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  theme === 'light' ? pillActive : pillInactive
                }`}
                title="Modo Claro"
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                onClick={() => onChangeTheme('sepia')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  theme === 'sepia' ? pillActive : pillInactive
                }`}
                title="Modo Sépia (Pergaminho)"
              >
                <Coffee className="w-4 h-4" />
              </button>
              <button
                onClick={() => onChangeTheme('dark')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  theme === 'dark' ? pillActive : pillInactive
                }`}
                title="Modo Escuro"
              >
                <Moon className="w-4 h-4" />
              </button>
            </div>

            {/* Admin Panel Button (Requirement 4) */}
            {isAdmin && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-semibold text-xs transition-colors cursor-pointer"
                title="Abrir Painel de Administração"
              >
                <ShieldAlert className="w-4 h-4 text-purple-500" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            {/* Upload New PDF Button (Requires Auth) */}
            <button
              onClick={handleUploadClick}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/15 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Subir Livro (PDF)</span>
              <span className="sm:hidden">Subir</span>
            </button>

            {/* Google User Profile or Login Button (Requirement 3, 5) */}
            {user ? (
              <div className="flex items-center gap-2 pl-1">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-8 h-8 rounded-full border border-amber-500/40 shrink-0"
                    title={`Conectado como ${user.name} (${user.email})`}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-700 text-amber-400 flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden lg:block text-left text-xs leading-tight">
                  <p className="font-bold truncate max-w-[110px]">{user.name.split(' ')[0]}</p>
                  <p className={`text-[10px] ${mutedText} uppercase tracking-wider`}>
                    {user.role === 'admin' ? 'Admin' : 'Leitor'}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className={`p-1.5 rounded-lg border border-black/10 dark:border-white/10 ${mutedText} hover:text-rose-500 transition-colors cursor-pointer`}
                  title="Sair da conta"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => openLoginModal()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 hover:border-amber-500 text-xs font-semibold transition-colors cursor-pointer"
                title="Entrar com Conta Google"
              >
                <LogIn className="w-4 h-4 text-amber-500" />
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-10 space-y-8">
        {/* Antigravity Hero Banner: Continuar Leitura */}
        {activeReadingBook && !searchQuery.trim() && statusFilter === 'all' && (
          <div
            className={`relative rounded-3xl border p-6 sm:p-8 backdrop-blur-xl overflow-hidden shadow-2xl transition-all duration-300 ${
              isDark
                ? 'bg-slate-900/60 border-slate-800 shadow-black/50'
                : isSepia
                ? 'bg-[#ece4d0]/70 border-[#ded3be] shadow-amber-950/10'
                : 'bg-white/80 border-slate-200 shadow-slate-900/5'
            }`}
          >
            {/* Subtle background glow inside the hero card */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {(() => {
              const read = readChaptersMap[activeReadingBook.id] || [];
              const readCount = read.length;
              const totalCh = Math.max(1, activeReadingBook.chapterCount);
              const percent = Math.min(100, Math.round((readCount / totalCh) * 100));
              const coverGradient = COVER_STYLES[activeReadingBook.coverColor] || COVER_STYLES.amber;

              return (
                <div className="relative flex flex-col md:flex-row items-center gap-6 sm:gap-8 justify-between">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left min-w-0 flex-1">
                    {/* Floating Book Cover Thumbnail */}
                    <div
                      onClick={() => onSelectBook(activeReadingBook.id)}
                      className="relative group cursor-pointer shrink-0"
                    >
                      <div className="absolute -inset-2 bg-amber-500/30 rounded-2xl blur-lg opacity-70 group-hover:opacity-100 transition-opacity" />
                      <div
                        className={`relative w-24 h-36 sm:w-28 sm:h-40 rounded-xl overflow-hidden border shadow-xl transition-transform group-hover:scale-105 ${coverGradient}`}
                      >
                        {activeReadingBook.coverImageUrl ? (
                          <>
                            <img
                              src={activeReadingBook.coverImageUrl}
                              alt={activeReadingBook.titlePt}
                              className="w-full h-full object-cover bg-white"
                            />
                            <div className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/40 via-white/15 to-transparent" />
                          </>
                        ) : (
                          <div className="p-3 flex flex-col justify-between h-full text-left">
                            <BookOpen className="w-5 h-5 text-amber-400" />
                            <p className="text-xs font-bold leading-tight">{activeReadingBook.titlePt}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Book Info & Reading Stats */}
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Continuar de onde você parou</span>
                      </div>

                      <h3
                        onClick={() => onSelectBook(activeReadingBook.id)}
                        className="text-xl sm:text-2xl font-bold font-editorial cursor-pointer hover:text-amber-500 transition-colors line-clamp-1"
                      >
                        {activeReadingBook.titlePt}
                      </h3>

                      <p className={`text-xs sm:text-sm font-medium ${mutedText}`}>
                        {activeReadingBook.author} • {activeReadingBook.originalYear}
                      </p>

                      {/* Progress Bar & Chapter Counts */}
                      <div className="max-w-md pt-2 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className={mutedText}>
                            {readCount} de {totalCh} capítulos lidos
                          </span>
                          <span className="font-mono font-bold text-amber-500">{percent}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500 shadow-sm"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Primary CTA Button */}
                  <div className="shrink-0 self-center">
                    <button
                      onClick={() => onSelectBook(activeReadingBook.id)}
                      className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm sm:text-base shadow-xl shadow-amber-500/25 transition-all transform hover:scale-105 cursor-pointer"
                    >
                      <BookOpen className="w-5 h-5" />
                      <span>Continuar Lendo</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Calibre Search Toolbar & View Switcher (Requirement 1, 2) */}
        <div className="space-y-4 pb-4 border-b border-black/10 dark:border-white/10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold font-editorial">
                Acervo Editorial & Leitura Estruturada
              </h2>
              <p className={`text-xs sm:text-sm ${mutedText}`}>
                {books.length} {books.length === 1 ? 'livro catalogado' : 'livros catalogados'} •{' '}
                {totalReadChaptersAcrossLibrary}{' '}
                {totalReadChaptersAcrossLibrary === 1 ? 'capítulo lido' : 'capítulos lidos'}
                {user ? ' (sincronizado na sua conta)' : ' (modo visitante sem cadastro)'}
              </p>
            </div>

            {/* View Mode Switcher (Requirement 2) */}
            <div className="flex items-center gap-2 self-start lg:self-center">
              <span className={`text-xs font-semibold uppercase tracking-wider ${mutedText} hidden sm:inline`}>
                Exibição:
              </span>
              <div className="flex items-center rounded-xl border border-black/10 dark:border-white/10 p-1">
                <button
                  onClick={() => handleSetViewMode('grid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    viewMode === 'grid' ? pillActive : pillInactive
                  }`}
                  title="Visão Padrão em Grade"
                >
                  <Grid3X3 className="w-4 h-4" />
                  <span className="hidden md:inline">Grade</span>
                </button>
                <button
                  onClick={() => handleSetViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    viewMode === 'list' ? pillActive : pillInactive
                  }`}
                  title="Visão em Lista Minimalista"
                >
                  <List className="w-4 h-4" />
                  <span className="hidden md:inline">Lista</span>
                </button>
              </div>
            </div>
          </div>

          {/* Calibre Search Input with Advanced Filtering & Clear button (Requirement 1) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Busca Calibre: digite o título, autor, ano ou use 'autor: Larry', 'ano: 1998'..."
                className={`w-full pl-10 pr-9 py-2.5 rounded-xl border text-xs sm:text-sm outline-none focus:border-amber-500 transition-colors ${inputBg}`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 ${mutedText} hover:text-current`}
                  title="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 shrink-0 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl border border-transparent transition-colors cursor-pointer shrink-0 ${
                  statusFilter === 'all' ? pillActive : pillInactive
                }`}
              >
                Todos ({books.length})
              </button>
              <button
                onClick={() => setStatusFilter('reading')}
                className={`px-3 py-1.5 rounded-xl border border-transparent transition-colors cursor-pointer shrink-0 ${
                  statusFilter === 'reading' ? pillActive : pillInactive
                }`}
              >
                Em Andamento
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1.5 rounded-xl border border-transparent transition-colors cursor-pointer shrink-0 ${
                  statusFilter === 'completed' ? pillActive : pillInactive
                }`}
              >
                Concluídos
              </button>
              <button
                onClick={() => setStatusFilter('pdf')}
                className={`px-3 py-1.5 rounded-xl border border-transparent transition-colors cursor-pointer shrink-0 ${
                  statusFilter === 'pdf' ? pillActive : pillInactive
                }`}
              >
                Com PDF
              </button>
            </div>
          </div>

          {/* Search Result Counter & Active Filter Pills */}
          <div className="flex items-center justify-between text-xs">
            <span className={mutedText}>
              Exibindo <strong className="text-current font-bold">{filteredBooks.length}</strong> de {books.length} obras
              {searchQuery && ` para "${searchQuery}"`}
            </span>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="text-amber-500 hover:underline cursor-pointer"
              >
                Redefinir filtros
              </button>
            )}
          </div>
        </div>

        {/* VIEW MODE 1: PADRÃO (GRID DE CARDS) */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((book) => {
              const isDefault = book.id === 'cell-church-larry-stockstill';
              const isProcessing = book.status === 'processing';
              const coverGradient = COVER_STYLES[book.coverColor] || COVER_STYLES.amber;

              const readForBook = readChaptersMap[book.id] || [];
              const readCount = readForBook.length;
              const totalCh = Math.max(1, book.chapterCount);
              const readPercent = Math.min(100, Math.round((readCount / totalCh) * 100));
              const isCompleted = readCount >= totalCh && totalCh > 0;

              return (
                <div
                  key={book.id}
                  className={`group rounded-3xl border p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-amber-500/10 ${cardBg}`}
                >
                  <div>
                    <div className="flex items-start gap-4">
                      {/* Cover Thumbnail */}
                      <button
                        onClick={() => !isProcessing && onSelectBook(book.id)}
                        disabled={isProcessing}
                        className={`relative w-24 h-36 rounded-xl bg-gradient-to-br border overflow-hidden flex flex-col justify-between text-left shrink-0 shadow-lg group-hover:shadow-2xl group-hover:scale-105 transition-all duration-300 cursor-pointer ${coverGradient}`}
                        title={`Abrir "${book.titlePt}"`}
                      >
                        {book.coverImageUrl ? (
                          <>
                            <img
                              src={book.coverImageUrl}
                              alt={`Capa de ${book.titlePt}`}
                              className="w-full h-full object-cover bg-white"
                              loading="lazy"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                            <div className="pointer-events-none absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/35 via-white/20 to-transparent" />
                          </>
                        ) : (
                          <div className="p-3 flex flex-col justify-between h-full w-full">
                            <div className="flex items-center justify-between w-full opacity-80">
                              <BookOpen className="w-4 h-4" />
                              <span className="text-[9px] font-mono">{book.originalYear}</span>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[11px] font-bold font-display leading-tight line-clamp-3">
                                {book.titlePt}
                              </p>
                              <p className="text-[9px] opacity-80 truncate">{book.author}</p>
                            </div>
                          </div>
                        )}
                      </button>

                      {/* Details */}
                      <div className="min-w-0 flex-1 space-y-2">
                        {(isCompleted || readCount > 0 || isProcessing) && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" /> Concluído
                              </span>
                            ) : readCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                                Em andamento ({readPercent}%)
                              </span>
                            ) : null}

                            {isProcessing && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin" /> Convertendo
                              </span>
                            )}
                          </div>
                        )}

                        <h3
                          onClick={() => !isProcessing && onSelectBook(book.id)}
                          className="text-lg font-bold font-editorial leading-snug cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition-colors line-clamp-2"
                        >
                          {book.titlePt}
                        </h3>

                        {book.subtitlePt && (
                          <p className={`text-xs italic font-editorial line-clamp-2 ${mutedText}`}>
                            {book.subtitlePt}
                          </p>
                        )}

                        <p className="text-xs font-semibold pt-0.5">
                          {book.author} <span className={`font-normal ${mutedText}`}>• {book.originalYear}</span>
                        </p>

                        <div className={`flex items-center gap-3 pt-1 text-[11px] ${mutedText}`}>
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-amber-500" />
                            {book.chapterCount} cap.
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />~
                            {book.totalEstimatedMinutes} min
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {!isProcessing && (
                      <div className="mt-5 pt-3 border-t border-black/5 dark:border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={mutedText}>Progresso de leitura:</span>
                          <span className="font-mono font-semibold">
                            {readCount}/{book.chapterCount} ({readPercent}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              isCompleted ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${readPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSelectBook(book.id)}
                      disabled={isProcessing}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors shadow-sm cursor-pointer"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>{readCount > 0 ? 'Continuar Leitura' : 'Ler Livro'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {book.hasOriginalPdf && (
                        <button
                          onClick={() => onOpenPdfForBook(book.id)}
                          className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-rose-500 dark:text-rose-400 transition-colors cursor-pointer"
                          title="Visualizar / Baixar PDF Original"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleEditClick(book.id)}
                        className={`p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 ${mutedText} hover:text-current transition-colors cursor-pointer`}
                        title="Editar metadados e capítulos"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {!isDefault && book.hasOriginalPdf && (
                        <button
                          onClick={() => onReprocessBook(book.id)}
                          disabled={isProcessing}
                          className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-amber-500 disabled:opacity-40 transition-colors cursor-pointer"
                          title="Reprocessar PDF com IA"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}

                      {!isDefault && isAdmin && (
                        <button
                          onClick={() => onDeleteBook(book.id)}
                          className={`p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-rose-500/15 ${mutedText} hover:text-rose-500 transition-colors cursor-pointer`}
                          title="Excluir livro da estante (Ação de Admin)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Upload Card */}
            <button
              onClick={handleUploadClick}
              className={`rounded-3xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center gap-3 min-h-[260px] transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer ${
                isDark
                  ? 'border-slate-800 hover:border-amber-500/50 bg-slate-900/30 hover:bg-slate-900/60'
                  : isSepia
                  ? 'border-[#d8c7a7] hover:border-amber-700/60 bg-[#ece4d0]/40 hover:bg-[#ece4d0]/80'
                  : 'border-slate-300 hover:border-amber-500 bg-white/50 hover:bg-white'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-xs">
                <h3 className="text-base font-bold font-editorial">
                  Adicionar Novo Livro em PDF
                </h3>
                <p className={`text-xs ${mutedText}`}>
                  Envie um arquivo PDF para converter automaticamente em capítulos estruturados para leitura.
                </p>
              </div>
            </button>
          </div>
        )}

        {/* VIEW MODE: LISTA MINIMALISTA (Foco em Capa, Título e Autor) */}
        {viewMode === 'list' && (
          <div className="space-y-2.5">
            {filteredBooks.map((book) => {
              const isDefault = book.id === 'cell-church-larry-stockstill';
              const isProcessing = book.status === 'processing';
              const coverGradient = COVER_STYLES[book.coverColor] || COVER_STYLES.amber;

              const readForBook = readChaptersMap[book.id] || [];
              const readCount = readForBook.length;
              const totalCh = Math.max(1, book.chapterCount);
              const readPercent = Math.min(100, Math.round((readCount / totalCh) * 100));
              const isCompleted = readCount >= totalCh && totalCh > 0;

              return (
                <div
                  key={book.id}
                  className={`group rounded-2xl border p-3.5 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/5 ${cardBg}`}
                >
                  {/* Left: Cover + Title & Author (Clickable) */}
                  <div
                    onClick={() => !isProcessing && onSelectBook(book.id)}
                    className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1 cursor-pointer"
                  >
                    {/* Minimalist Cover Thumbnail */}
                    <div
                      className={`relative w-12 h-16 sm:w-14 sm:h-20 rounded-md border overflow-hidden shrink-0 shadow-sm transition-transform group-hover:scale-105 ${coverGradient}`}
                    >
                      {book.coverImageUrl ? (
                        <>
                          <img
                            src={book.coverImageUrl}
                            alt={book.titlePt}
                            className="w-full h-full object-cover bg-white"
                          />
                          <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/30 via-white/10 to-transparent" />
                        </>
                      ) : (
                        <div className="p-1.5 flex flex-col justify-between h-full text-left">
                          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                          <p className="text-[8px] font-bold leading-tight line-clamp-2">{book.titlePt}</p>
                        </div>
                      )}
                    </div>

                    {/* Clean Minimalist Typography: Title + Author */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold font-editorial group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-1">
                          {book.titlePt}
                        </h3>

                        {/* Subtle Status indicator only when applicable (sem badge Disponível) */}
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Concluído
                          </span>
                        ) : readCount > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
                            {readPercent}%
                          </span>
                        ) : null}

                        {isProcessing && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 animate-pulse shrink-0">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Convertendo
                          </span>
                        )}
                      </div>

                      <p className={`text-xs sm:text-sm font-medium ${mutedText} truncate`}>
                        {book.author}
                      </p>
                    </div>
                  </div>

                  {/* Right Actions: Clean, compact and unobtrusive */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      onClick={() => onSelectBook(book.id)}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shadow-sm transition-all"
                      title={readCount > 0 ? 'Continuar Leitura' : 'Iniciar Leitura'}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">{readCount > 0 ? 'Continuar' : 'Ler'}</span>
                    </button>

                    {book.hasOriginalPdf && (
                      <button
                        onClick={() => onOpenPdfForBook(book.id)}
                        className="p-1.5 sm:p-2 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-rose-500 cursor-pointer transition-colors"
                        title="Ver PDF Original"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleEditClick(book.id)}
                      className="p-1.5 sm:p-2 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-amber-500 cursor-pointer transition-colors"
                      title="Editar Metadados e Capítulos"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {!isDefault && isAdmin && (
                      <button
                        onClick={() => onDeleteBook(book.id)}
                        className="p-1.5 sm:p-2 rounded-lg border border-black/10 dark:border-white/10 hover:bg-rose-500/15 text-rose-500 cursor-pointer transition-colors"
                        title="Excluir da Estante"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
