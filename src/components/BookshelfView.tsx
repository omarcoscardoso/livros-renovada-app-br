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
  Star,
  Headphones,
  Heart,
  TrendingUp,
  BookmarkCheck,
  Compass,
  ArrowUpDown,
  BookMarked,
  Flame,
} from 'lucide-react';
import { BookSummary } from '../data/bookTypes';
import { ReaderTheme } from './Navbar';
import { ReadChaptersMap } from '../utils/readingProgressStorage';
import { useAuth } from '../context/AuthContext';
import { BottomNavBar, LibrarialNavTab } from './BottomNavBar';
import { BookDetailsModal } from './BookDetailsModal';
import { loadFavorites, toggleFavorite } from '../utils/favoritesStorage';

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
  onStartAudiobook?: (bookId: string) => void;
}

const COVER_STYLES: Record<string, string> = {
  amber: 'from-amber-600 via-amber-800 to-slate-950 border-amber-500/40 text-amber-100',
  emerald: 'from-emerald-600 via-emerald-800 to-slate-950 border-emerald-500/40 text-emerald-100',
  blue: 'from-blue-600 via-blue-800 to-slate-950 border-blue-500/40 text-blue-100',
  rose: 'from-rose-600 via-rose-800 to-slate-950 border-rose-500/40 text-rose-100',
  violet: 'from-violet-600 via-violet-800 to-slate-950 border-violet-500/40 text-violet-100',
};

const CATEGORIES = [
  'Todos',
  'Liderança',
  'Células',
  'Discipulado',
  'Teologia',
  'Biografias',
  'Vida Cristã',
];

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
  onStartAudiobook,
}) => {
  const { user, isAdmin, openLoginModal, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<LibrarialNavTab>('explore');
  const [selectedBookForDetails, setSelectedBookForDetails] = useState<BookSummary | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'title' | 'author'>('popular');
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
    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
    : isSepia
    ? 'bg-amber-600 text-white font-bold shadow-md shadow-amber-950/20'
    : 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20';

  const pillInactive = isDark
    ? 'bg-slate-900/60 text-slate-300 border border-slate-800 hover:border-slate-700'
    : isSepia
    ? 'bg-[#ede5d2] text-[#5c4936] border border-[#d8cbaf] hover:border-amber-700/40'
    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300';

  const handleToggleFav = (bookId: string) => {
    const updated = toggleFavorite(bookId);
    setFavorites(updated);
  };

  const handleSetViewMode = (mode: BookshelfViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('ipr_bookshelf_view_mode', mode);
    } catch {
      // ignore
    }
  };

  // Calibre search parser & category filtering
  const filteredBooks = books
    .filter((b) => {
      const readForBook = readChaptersMap[b.id] || [];
      const readCount = readForBook.length;
      const totalCh = Math.max(1, b.chapterCount);
      const isCompleted = readCount >= totalCh && totalCh > 0;
      const isReading = readCount > 0 && !isCompleted;

      // Status filters
      if (statusFilter === 'reading' && !isReading) return false;
      if (statusFilter === 'completed' && !isCompleted) return false;
      if (statusFilter === 'pdf' && !b.hasOriginalPdf) return false;

      // Tab filters
      if (currentTab === 'audiobooks') {
        // In audiobooks tab, prioritize audio-ready works
      } else if (currentTab === 'library') {
        // In library tab, show items user interacted with or favorited
        const isFav = favorites.includes(b.id);
        if (!isReading && !isCompleted && !isFav && books.length > 1) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'Todos') {
        const cat = (b.category || '').toLowerCase();
        const sel = selectedCategory.toLowerCase();
        const matchesCategory =
          cat.includes(sel) ||
          b.titlePt.toLowerCase().includes(sel) ||
          (b.subtitlePt && b.subtitlePt.toLowerCase().includes(sel));
        if (!matchesCategory) return false;
      }

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
    })
    .sort((a, b) => {
      if (sortBy === 'title') {
        return a.titlePt.localeCompare(b.titlePt);
      }
      if (sortBy === 'author') {
        return a.author.localeCompare(b.author);
      }
      if (sortBy === 'recent') {
        return b.originalYear - a.originalYear;
      }
      // 'popular' default
      return (b.rating || 5) - (a.rating || 5);
    });

  const totalReadChaptersAcrossLibrary = books.reduce((sum, b) => {
    const readForBook = readChaptersMap[b.id]?.length || 0;
    return sum + readForBook;
  }, 0);

  // Active reading book for Continue Reading section
  const activeReadingBook =
    books.find((b) => {
      const read = readChaptersMap[b.id] || [];
      return read.length > 0 && read.length < Math.max(1, b.chapterCount);
    }) ||
    (books.length > 0 && (readChaptersMap[books[0].id]?.length || 0) > 0 ? books[0] : null);

  // Popular authors list (Unique authors extracted from catalog)
  const popularAuthors = Array.from(new Set(books.map((b) => b.author))).map((author) => {
    const count = books.filter((b) => b.author === author).length;
    return {
      name: author,
      bookCount: count,
      initials: author
        .split(' ')
        .slice(0, 2)
        .map((p) => p[0])
        .join(''),
    };
  });

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
    <div className={`min-h-screen flex flex-col transition-colors duration-200 relative pb-24 ${pageBg}`}>
      {/* Ambient Lighting Gradient Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div
          className={`absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full blur-[140px] opacity-25 ${
            isDark ? 'bg-amber-600/30' : isSepia ? 'bg-[#d8c7a7]/50' : 'bg-amber-300/40'
          }`}
        />
        <div
          className={`absolute top-1/3 -right-40 w-[480px] h-[480px] rounded-full blur-[140px] opacity-20 ${
            isDark ? 'bg-indigo-600/20' : isSepia ? 'bg-amber-800/20' : 'bg-amber-400/20'
          }`}
        />
        <div
          className={`absolute -bottom-40 left-1/3 w-[520px] h-[520px] rounded-full blur-[140px] opacity-15 ${
            isDark ? 'bg-emerald-600/20' : isSepia ? 'bg-emerald-800/15' : 'bg-emerald-300/30'
          }`}
        />
      </div>

      {/* Top Header Bar - Librarial Style */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-xl px-4 sm:px-8 py-3.5 ${headerBg}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 shadow-sm">
              <BookMarked className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-bold font-display tracking-tight">
                  Librarial
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  Renovada Edition
                </span>
              </div>
              <p className={`text-xs ${mutedText} hidden sm:block font-editorial`}>
                Plataforma de Leitura Digital & Audiolivros
              </p>
            </div>
          </div>

          {/* Right Action Icons & Auth Profile */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <div className="flex items-center rounded-xl border border-black/10 dark:border-white/10 p-1">
              <button
                onClick={() => onChangeTheme('light')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  theme === 'light' ? 'bg-amber-500 text-slate-950 font-bold' : mutedText
                }`}
                title="Modo Claro"
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                onClick={() => onChangeTheme('sepia')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  theme === 'sepia' ? 'bg-amber-500 text-slate-950 font-bold' : mutedText
                }`}
                title="Modo Sépia Confortável"
              >
                <Coffee className="w-4 h-4" />
              </button>
              <button
                onClick={() => onChangeTheme('dark')}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  theme === 'dark' ? 'bg-amber-500 text-slate-950 font-bold' : mutedText
                }`}
                title="Modo Escuro Imersivo"
              >
                <Moon className="w-4 h-4" />
              </button>
            </div>

            {/* Admin Panel Button */}
            {isAdmin && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-300 font-semibold text-xs hover:bg-purple-500/25 transition-colors cursor-pointer"
                title="Abrir Painel de Administração da Biblioteca"
              >
                <ShieldAlert className="w-4 h-4" />
                <span className="hidden md:inline">Admin</span>
              </button>
            )}

            {/* User Profile / Login */}
            {user ? (
              <div className="flex items-center gap-2 pl-1">
                <button
                  onClick={() => setCurrentTab('profile')}
                  className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-amber-500/40 transition-all cursor-pointer"
                  title={`Logado como ${user.name}`}
                >
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border border-amber-500/50"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
              </div>
            ) : (
              <button
                onClick={() =>
                  openLoginModal('Faça login com sua conta Google para sincronizar seu progresso de leitura.')
                }
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-8">
        {/* ============================================================== */}
        {/* VIEW: EXPLORE (HOME PRINCIPAL)                                  */}
        {/* ============================================================== */}
        {currentTab === 'explore' && (
          <>
            {/* 1. Popular Books Horizontal Carousel (Em Alta) */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold font-editorial">
                      Obras em Destaque & Populares
                    </h2>
                    <p className={`text-xs ${mutedText}`}>
                      Os livros mais lidos e recomendados da comunidade
                    </p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-1 text-xs text-amber-500 font-semibold cursor-pointer hover:underline">
                  <span>Ver todas</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Horizontal Scroll Carousel */}
              <div className="flex items-stretch gap-4 sm:gap-6 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x snap-mandatory">
                {books.map((book) => {
                  const coverGradient = COVER_STYLES[book.coverColor] || COVER_STYLES.amber;
                  const rating = book.rating || 4.9;
                  const isFav = favorites.includes(book.id);

                  return (
                    <div
                      key={book.id}
                      onClick={() => setSelectedBookForDetails(book)}
                      className={`group relative snap-start shrink-0 w-44 sm:w-52 rounded-3xl border p-4 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-amber-500/10 cursor-pointer ${cardBg}`}
                    >
                      {/* Top Badges: Favorite & Rating */}
                      <div className="flex items-center justify-between mb-3 z-10">
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-amber-300 text-[11px] font-bold">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{rating}</span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFav(book.id);
                          }}
                          className="p-1.5 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md text-white transition-colors"
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              isFav ? 'fill-current text-rose-500' : 'text-white/80'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Styled Vertical Cover */}
                      <div className="relative mb-3 flex justify-center">
                        <div className="absolute -inset-1 bg-amber-500/20 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div
                          className={`relative w-32 h-44 sm:w-36 sm:h-50 rounded-xl overflow-hidden border shadow-lg group-hover:scale-105 transition-transform duration-300 ${coverGradient}`}
                        >
                          {book.coverImageUrl ? (
                            <>
                              <img
                                src={book.coverImageUrl}
                                alt={book.titlePt}
                                className="w-full h-full object-cover bg-white"
                                loading="lazy"
                              />
                              <div className="pointer-events-none absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/35 via-white/15 to-transparent" />
                            </>
                          ) : (
                            <div className="p-3 flex flex-col justify-between h-full text-left text-white">
                              <BookOpen className="w-5 h-5 text-amber-300" />
                              <div>
                                <p className="text-[11px] font-bold font-editorial leading-tight line-clamp-3">
                                  {book.titlePt}
                                </p>
                                <p className="text-[9px] opacity-80 mt-1 truncate">{book.author}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Info & Micro CTA */}
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold font-editorial group-hover:text-amber-500 transition-colors line-clamp-1">
                          {book.titlePt}
                        </h3>
                        <p className={`text-xs ${mutedText} truncate`}>{book.author}</p>
                        <div className="pt-2 flex items-center justify-between text-[11px]">
                          <span className={mutedText}>{book.chapterCount} cap.</span>
                          <span className="text-amber-500 font-semibold group-hover:underline flex items-center gap-0.5">
                            Ver mais <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 2. Continue Reading Hero Card */}
            {activeReadingBook && !searchQuery.trim() && (
              <section
                className={`relative rounded-3xl border p-6 sm:p-7 backdrop-blur-xl overflow-hidden shadow-2xl transition-all duration-300 ${
                  isDark
                    ? 'bg-slate-900/70 border-slate-800 shadow-black/50'
                    : isSepia
                    ? 'bg-[#ece4d0]/75 border-[#ded3be] shadow-amber-950/10'
                    : 'bg-white/90 border-slate-200 shadow-slate-900/5'
                }`}
              >
                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                {(() => {
                  const read = readChaptersMap[activeReadingBook.id] || [];
                  const readCount = read.length;
                  const totalCh = Math.max(1, activeReadingBook.chapterCount);
                  const percent = Math.min(100, Math.round((readCount / totalCh) * 100));
                  const coverGradient =
                    COVER_STYLES[activeReadingBook.coverColor] || COVER_STYLES.amber;

                  return (
                    <div className="relative flex flex-col md:flex-row items-center gap-6 sm:gap-8 justify-between">
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 text-center sm:text-left min-w-0 flex-1">
                        {/* Cover Thumbnail */}
                        <div
                          onClick={() => setSelectedBookForDetails(activeReadingBook)}
                          className="relative group cursor-pointer shrink-0"
                        >
                          <div className="absolute -inset-2 bg-amber-500/30 rounded-2xl blur-lg opacity-70 group-hover:opacity-100 transition-opacity" />
                          <div
                            className={`relative w-24 h-36 rounded-xl overflow-hidden border shadow-xl transition-transform group-hover:scale-105 ${coverGradient}`}
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
                                <p className="text-xs font-bold leading-tight">
                                  {activeReadingBook.titlePt}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-2 min-w-0 flex-1">
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Continuar leitura de onde você parou</span>
                          </div>

                          <h3
                            onClick={() => setSelectedBookForDetails(activeReadingBook)}
                            className="text-xl sm:text-2xl font-bold font-editorial cursor-pointer hover:text-amber-500 transition-colors line-clamp-1"
                          >
                            {activeReadingBook.titlePt}
                          </h3>

                          <p className={`text-xs sm:text-sm font-medium ${mutedText}`}>
                            {activeReadingBook.author} • {activeReadingBook.originalYear}
                          </p>

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

                      {/* CTA */}
                      <div className="shrink-0 flex items-center gap-2.5">
                        <button
                          onClick={() => onSelectBook(activeReadingBook.id)}
                          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/25 transition-all transform hover:scale-105 cursor-pointer"
                        >
                          <BookOpen className="w-4 h-4" />
                          <span>Continuar</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </section>
            )}

            {/* 3. Thematic Promotional Banner */}
            <section className="relative rounded-3xl overflow-hidden p-6 sm:p-8 bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 text-white shadow-2xl">
              <div className="relative z-10 max-w-xl space-y-2">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md">
                  Destaque Editorial do Mês
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold font-editorial leading-tight">
                  Construindo Igrejas Fortes em Comunhão
                </h3>
                <p className="text-xs sm:text-sm opacity-90 font-light leading-relaxed">
                  Descubra o modelo bíblico de células, formação de discípulos e pastoreio eficaz
                  com material completo em português revisado por pastores.
                </p>
                <div className="pt-3 flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (books[0]) setSelectedBookForDetails(books[0]);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-white text-slate-950 font-bold text-xs hover:bg-amber-100 transition-colors cursor-pointer shadow-md"
                  >
                    Explorar Edição Especial
                  </button>
                </div>
              </div>
              <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
            </section>

            {/* 4. Category Pills / Chips (Horizontal Scroll) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${mutedText}`}>
                  Categorias em Destaque
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                      selectedCategory === cat ? pillActive : pillInactive
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </section>

            {/* 5. Calibre Search Toolbar & Sort & View Mode */}
            <section className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar livro, autor, ano ou use 'autor: Larry', 'ano: 1998'..."
                    className={`w-full pl-10 pr-9 py-2.5 rounded-2xl border text-xs sm:text-sm outline-none focus:border-amber-500 transition-colors ${inputBg}`}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 ${mutedText} hover:text-current`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Sort dropdown */}
                <div className="flex items-center gap-2">
                  <div className="relative flex items-center">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      aria-label="Ordenar obras por"
                      className={`py-2.5 pl-3 pr-8 rounded-2xl border text-xs font-semibold outline-none cursor-pointer appearance-none ${inputBg}`}
                    >
                      <option value="popular">Mais Populares</option>
                      <option value="recent">Mais Recentes</option>
                      <option value="title">Título (A-Z)</option>
                      <option value="author">Autor</option>
                    </select>
                    <ArrowUpDown className={`w-3.5 h-3.5 absolute right-2.5 pointer-events-none ${mutedText}`} />
                  </div>

                  {/* View Mode Switcher */}
                  <div className="flex items-center rounded-2xl border border-black/10 dark:border-white/10 p-1">
                    <button
                      onClick={() => handleSetViewMode('grid')}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        viewMode === 'grid' ? 'bg-amber-500 text-slate-950' : mutedText
                      }`}
                      title="Visão em Grade"
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSetViewMode('list')}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        viewMode === 'list' ? 'bg-amber-500 text-slate-950' : mutedText
                      }`}
                      title="Visão em Lista Minimalista"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Status Filters & Counter */}
              <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1 rounded-xl transition-colors cursor-pointer ${
                      statusFilter === 'all' ? 'bg-amber-500/20 text-amber-500 font-bold' : mutedText
                    }`}
                  >
                    Todos ({books.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('reading')}
                    className={`px-3 py-1 rounded-xl transition-colors cursor-pointer ${
                      statusFilter === 'reading' ? 'bg-amber-500/20 text-amber-500 font-bold' : mutedText
                    }`}
                  >
                    Em Andamento
                  </button>
                  <button
                    onClick={() => setStatusFilter('completed')}
                    className={`px-3 py-1 rounded-xl transition-colors cursor-pointer ${
                      statusFilter === 'completed' ? 'bg-amber-500/20 text-amber-500 font-bold' : mutedText
                    }`}
                  >
                    Concluídos
                  </button>
                  <button
                    onClick={() => setStatusFilter('pdf')}
                    className={`px-3 py-1 rounded-xl transition-colors cursor-pointer ${
                      statusFilter === 'pdf' ? 'bg-amber-500/20 text-amber-500 font-bold' : mutedText
                    }`}
                  >
                    Com PDF Original
                  </button>
                </div>

                <span className={mutedText}>
                  Exibindo <strong>{filteredBooks.length}</strong> de {books.length} obras
                </span>
              </div>
            </section>

            {/* 6. Popular Authors Horizontal List */}
            {popularAuthors.length > 0 && !searchQuery.trim() && (
              <section className="space-y-3 pt-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${mutedText}`}>
                  Autores em Destaque
                </span>
                <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
                  {popularAuthors.map((author) => (
                    <div
                      key={author.name}
                      onClick={() => setSearchQuery(`autor: ${author.name}`)}
                      className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
                    >
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-extrabold text-sm flex items-center justify-center border-2 border-white/20 shadow-md group-hover:scale-105 transition-transform">
                        {author.initials}
                      </div>
                      <span className="text-xs font-bold truncate max-w-[80px] text-center group-hover:text-amber-500 transition-colors">
                        {author.name.split(' ')[0]}
                      </span>
                      <span className={`text-[10px] ${mutedText}`}>
                        {author.bookCount} {author.bookCount === 1 ? 'livro' : 'livros'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 7. Catalog View (Grid or Minimalist List) */}
            <section className="pt-2">
              {viewMode === 'grid' ? (
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
                    const isFav = favorites.includes(book.id);

                    return (
                      <div
                        key={book.id}
                        onClick={() => setSelectedBookForDetails(book)}
                        className={`group rounded-3xl border p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-amber-500/10 cursor-pointer ${cardBg}`}
                      >
                        <div>
                          <div className="flex items-start gap-4">
                            {/* Cover Thumbnail */}
                            <div
                              className={`relative w-24 h-36 rounded-2xl bg-gradient-to-br border overflow-hidden flex flex-col justify-between text-left shrink-0 shadow-lg group-hover:shadow-2xl group-hover:scale-105 transition-all duration-300 ${coverGradient}`}
                            >
                              {book.coverImageUrl ? (
                                <>
                                  <img
                                    src={book.coverImageUrl}
                                    alt={`Capa de ${book.titlePt}`}
                                    className="w-full h-full object-cover bg-white"
                                    loading="lazy"
                                  />
                                  <div className="pointer-events-none absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/35 via-white/20 to-transparent" />
                                </>
                              ) : (
                                <div className="p-3 flex flex-col justify-between h-full w-full">
                                  <BookOpen className="w-4 h-4 text-amber-300" />
                                  <p className="text-[11px] font-bold font-editorial leading-tight line-clamp-3">
                                    {book.titlePt}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Details */}
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center text-amber-500 text-xs font-bold">
                                  <Star className="w-3.5 h-3.5 fill-current" />
                                  <span className="ml-1">{book.rating || 4.9}</span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleFav(book.id);
                                  }}
                                  className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                >
                                  <Heart
                                    className={`w-3.5 h-3.5 ${
                                      isFav ? 'fill-current text-rose-500' : mutedText
                                    }`}
                                  />
                                </button>
                              </div>

                              <h3 className="text-lg font-bold font-editorial leading-snug group-hover:text-amber-500 transition-colors line-clamp-2">
                                {book.titlePt}
                              </h3>

                              <p className="text-xs font-semibold">
                                {book.author}{' '}
                                <span className={`font-normal ${mutedText}`}>• {book.originalYear}</span>
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

                          {/* Progress */}
                          {readCount > 0 && (
                            <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className={mutedText}>Progresso:</span>
                                <span className="font-mono font-semibold text-amber-500">
                                  {readPercent}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                                <div
                                  className="h-full bg-amber-500 transition-all duration-300"
                                  style={{ width: `${readPercent}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="mt-5 pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectBook(book.id);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-sm cursor-pointer"
                          >
                            <BookOpen className="w-4 h-4" />
                            <span>{readCount > 0 ? 'Continuar' : 'Ler Livro'}</span>
                          </button>

                          {book.hasOriginalPdf && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenPdfForBook(book.id);
                              }}
                              className="p-2.5 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-rose-500/15 text-rose-500 transition-colors cursor-pointer"
                              title="PDF Original"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(book.id);
                            }}
                            className={`p-2.5 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 ${mutedText} hover:text-amber-500 transition-colors cursor-pointer`}
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {!isDefault && isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteBook(book.id);
                              }}
                              className="p-2.5 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-rose-500/15 text-rose-500 transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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
              ) : (
                /* Minimalist List View */
                <div className="space-y-2.5">
                  {filteredBooks.map((book) => {
                    const isProcessing = book.status === 'processing';
                    const coverGradient = COVER_STYLES[book.coverColor] || COVER_STYLES.amber;
                    const readForBook = readChaptersMap[book.id] || [];
                    const readCount = readForBook.length;
                    const totalCh = Math.max(1, book.chapterCount);
                    const readPercent = Math.min(100, Math.round((readCount / totalCh) * 100));

                    return (
                      <div
                        key={book.id}
                        onClick={() => setSelectedBookForDetails(book)}
                        className={`group rounded-2xl border p-3.5 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/5 cursor-pointer ${cardBg}`}
                      >
                        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                          {/* Mini Cover */}
                          <div
                            className={`relative w-12 h-16 sm:w-14 sm:h-20 rounded-xl border overflow-hidden shrink-0 shadow-sm transition-transform group-hover:scale-105 ${coverGradient}`}
                          >
                            {book.coverImageUrl ? (
                              <img
                                src={book.coverImageUrl}
                                alt={book.titlePt}
                                className="w-full h-full object-cover bg-white"
                              />
                            ) : (
                              <div className="p-1.5 flex flex-col justify-between h-full text-left">
                                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                                <p className="text-[8px] font-bold leading-tight line-clamp-2">
                                  {book.titlePt}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Typo */}
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <h3 className="text-sm sm:text-base font-bold font-editorial group-hover:text-amber-500 transition-colors line-clamp-1">
                              {book.titlePt}
                            </h3>
                            <p className={`text-xs sm:text-sm font-medium ${mutedText} truncate`}>
                              {book.author} • {book.originalYear}
                            </p>
                          </div>
                        </div>

                        {/* Right Quick Action */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectBook(book.id);
                            }}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>{readCount > 0 ? 'Continuar' : 'Ler'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {/* ============================================================== */}
        {/* VIEW: AUDIOBOOKS                                               */}
        {/* ============================================================== */}
        {currentTab === 'audiobooks' && (
          <section className="space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-900/60 to-slate-900 border border-indigo-700/30 text-white space-y-3 shadow-2xl">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Headphones className="w-5 h-5 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold font-editorial">
                Experiência em Audiolivro (TTS)
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                Ouça seus livros em português através da síntese inteligente integrada. Alterne
                a qualquer momento entre leitura textual e áudio mãos-livres.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {books.map((book) => (
                <div
                  key={book.id}
                  onClick={() => setSelectedBookForDetails(book)}
                  className={`p-4 rounded-3xl border flex items-center justify-between gap-4 cursor-pointer hover:border-indigo-500/50 transition-all ${cardBg}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-14 h-18 rounded-xl bg-slate-900 overflow-hidden border shrink-0">
                      {book.coverImageUrl ? (
                        <img
                          src={book.coverImageUrl}
                          alt={book.titlePt}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="p-2 flex items-center justify-center h-full text-indigo-400">
                          <Headphones className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold truncate">{book.titlePt}</h4>
                      <p className={`text-xs ${mutedText} truncate`}>{book.author}</p>
                      <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mt-1 inline-block">
                        Áudio Sincronizado Disponível
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onStartAudiobook) {
                        onStartAudiobook(book.id);
                      } else {
                        onSelectBook(book.id);
                      }
                    }}
                    className="p-3 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white font-bold shadow-lg shadow-indigo-500/25 transition-transform hover:scale-105"
                  >
                    <Headphones className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* VIEW: MY LIBRARY                                               */}
        {/* ============================================================== */}
        {currentTab === 'library' && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold font-editorial">Minha Biblioteca</h2>
                <p className={`text-xs ${mutedText}`}>
                  Seu progresso pessoal, favoritos e histórico de leitura
                </p>
              </div>

              <button
                onClick={handleUploadClick}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs shadow-sm cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Subir PDF</span>
              </button>
            </div>

            {/* Favoritos / Em Andamento */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map((book) => {
                const read = readChaptersMap[book.id] || [];
                const readCount = read.length;
                const totalCh = Math.max(1, book.chapterCount);
                const percent = Math.min(100, Math.round((readCount / totalCh) * 100));
                const isFav = favorites.includes(book.id);

                return (
                  <div
                    key={book.id}
                    onClick={() => setSelectedBookForDetails(book)}
                    className={`rounded-3xl border p-5 flex flex-col justify-between cursor-pointer hover:-translate-y-1 transition-all ${cardBg}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-28 rounded-xl overflow-hidden border shrink-0 bg-slate-900">
                        {book.coverImageUrl ? (
                          <img
                            src={book.coverImageUrl}
                            alt={book.titlePt}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="p-2 flex items-center justify-center h-full text-amber-500">
                            <BookOpen className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                            {readCount >= totalCh ? 'Concluído' : readCount > 0 ? 'Lendo' : 'Não iniciado'}
                          </span>
                          {isFav && <Heart className="w-3.5 h-3.5 fill-current text-rose-500" />}
                        </div>
                        <h4 className="text-sm font-bold font-editorial line-clamp-2">
                          {book.titlePt}
                        </h4>
                        <p className={`text-xs ${mutedText}`}>{book.author}</p>
                        <div className="pt-2 text-[11px] font-mono font-bold text-amber-500">
                          {percent}% lido ({readCount}/{totalCh} cap.)
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBook(book.id);
                      }}
                      className="mt-4 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                    >
                      Continuar Leitura
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* VIEW: PROFILE                                                  */}
        {/* ============================================================== */}
        {currentTab === 'profile' && (
          <section className="max-w-xl mx-auto space-y-6">
            <div className={`p-6 rounded-3xl border text-center space-y-4 ${cardBg}`}>
              <div className="relative mx-auto w-20 h-20 rounded-full overflow-hidden border-2 border-amber-500 shadow-xl flex items-center justify-center bg-slate-900 text-amber-500">
                {user?.picture ? (
                  <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8" />
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold font-editorial">{user?.name || 'Visitante'}</h3>
                <p className={`text-xs ${mutedText}`}>{user?.email || 'Nenhuma conta conectada'}</p>
              </div>

              {/* Reading Stats Pills */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                    Capítulos Lidos
                  </span>
                  <p className="text-xl font-mono font-bold text-amber-500 mt-1">
                    {totalReadChaptersAcrossLibrary}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                    Favoritos
                  </span>
                  <p className="text-xl font-mono font-bold text-rose-500 mt-1">
                    {favorites.length}
                  </p>
                </div>
              </div>

              {/* Profile Actions */}
              <div className="pt-2 space-y-2">
                {isAdmin && (
                  <button
                    onClick={onOpenAdmin}
                    className="w-full py-2.5 rounded-2xl bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/40 font-bold text-xs"
                  >
                    Painel do Administrador
                  </button>
                )}

                {user ? (
                  <button
                    onClick={logout}
                    className="w-full py-2.5 rounded-2xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-bold text-xs"
                  >
                    Sair da Conta Google
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      openLoginModal('Faça login com Google para salvar seu progresso.')
                    }
                    className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                  >
                    Entrar com Google
                  </button>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Modern Floating Bottom Navigation Bar */}
      <BottomNavBar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        theme={theme}
        unreadCount={
          books.filter((b) => {
            const read = readChaptersMap[b.id] || [];
            return read.length > 0 && read.length < Math.max(1, b.chapterCount);
          }).length
        }
        userAvatar={user?.picture}
        userName={user?.name}
      />

      {/* Book Details Screen / Modal */}
      <BookDetailsModal
        isOpen={Boolean(selectedBookForDetails)}
        onClose={() => setSelectedBookForDetails(null)}
        book={selectedBookForDetails}
        theme={theme}
        isFavorite={selectedBookForDetails ? favorites.includes(selectedBookForDetails.id) : false}
        onToggleFavorite={handleToggleFav}
        onStartReading={(bookId) => onSelectBook(bookId)}
        onOpenPdf={(bookId) => onOpenPdfForBook(bookId)}
        onStartAudiobook={(bookId) => {
          if (onStartAudiobook) {
            onStartAudiobook(bookId);
          } else {
            onSelectBook(bookId);
          }
        }}
        readCount={
          selectedBookForDetails ? (readChaptersMap[selectedBookForDetails.id] || []).length : 0
        }
      />
    </div>
  );
};
