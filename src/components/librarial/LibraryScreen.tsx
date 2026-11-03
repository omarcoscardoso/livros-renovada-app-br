import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Sun,
  Coffee,
  Moon,
  ShieldAlert,
  LogIn,
  Upload,
  User,
  BookOpen,
  Headphones,
  Bookmark,
  Compass,
  ArrowUpDown,
  Flame,
  Star,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react';
import { Book, LibrarialNavTab, LibrarialTheme, SortOption } from '../../types/librarial';
import { BottomNavigation } from './BottomNavigation';
import { BookCard } from './BookCard';
import { CatalogToolbar } from './CatalogToolbar';
import { CategoryPills } from './CategoryPills';
import { FeaturedCarousel } from './FeaturedCarousel';
import { PopularBooksScroll } from './PopularBooksScroll';
import { BookDetailModal } from './BookDetailModal';
import { useAuth } from '../../context/AuthContext';
import { loadFavorites, toggleFavorite } from '../../utils/favoritesStorage';

interface LibraryScreenProps {
  books: Book[];
  readChaptersMap: Record<string, string[]>;
  theme: LibrarialTheme;
  onChangeTheme: (theme: LibrarialTheme) => void;
  onSelectBook: (bookId: string) => void;
  onOpenUpload: () => void;
  onOpenPdfForBook: (bookId: string) => void;
  onEditBook: (bookId: string) => void;
  onDeleteBook: (bookId: string) => void;
  onReprocessBook: (bookId: string) => void;
  onOpenAdmin: () => void;
  onStartAudiobook?: (bookId: string) => void;
  onBackToLms?: () => void;
  isIntegrated?: boolean;
}

const CATEGORIES = [
  'Todos',
  'Liderança',
  'Células',
  'Discipulado',
  'Teologia',
  'Biografias',
  'Vida Cristã',
];

export const LibraryScreen: React.FC<LibraryScreenProps> = ({
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
  onBackToLms,
  isIntegrated = false,
}) => {
  const { user, isAdmin, openLoginModal, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<LibrarialNavTab>('browse');
  const [selectedBookForDetails, setSelectedBookForDetails] = useState<Book | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleSelectTab = (tab: LibrarialNavTab) => {
    setCurrentTab(tab);
    if (tab === 'books') {
      setViewMode('list');
    }
  };

  const isLight = theme === 'light';
  const pageBg = isLight
    ? 'bg-[#F8FAFC] text-slate-900 min-h-screen'
    : 'bg-[#0F1224] text-slate-100 min-h-screen';
  const headerBg = isLight
    ? 'bg-white/95 border-slate-200 text-slate-900 backdrop-blur-2xl shadow-sm'
    : 'bg-[#0F1224]/90 border-slate-800/80 backdrop-blur-2xl shadow-xl shadow-black/40';
  const mutedText = isLight ? 'text-slate-600' : 'text-slate-400';
  const inputBg = isLight
    ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15'
    : 'bg-[#171B38] border-slate-700/70 text-white placeholder-slate-400 focus:border-emerald-500/80 focus:ring-4 focus:ring-emerald-500/15 shadow-inner';

  const handleToggleFav = (bookId: string) => {
    const updated = toggleFavorite(bookId);
    setFavorites(updated);
  };

  // Filtered and sorted books list
  const filteredBooks = useMemo(() => {
    return books
      .filter((b) => {
        const readForBook = readChaptersMap[b.id] || [];
        const readCount = readForBook.length;
        const totalCh = Math.max(1, b.chapterCount);
        const isCompleted = readCount >= totalCh && totalCh > 0;
        const isReading = readCount > 0 && !isCompleted;

        // Tab filters
        if (currentTab === 'library') {
          const isFav = favorites.includes(b.id);
          if (!isReading && !isCompleted && !isFav && books.length > 1) {
            return false;
          }
        }

        // Category filter (apenas na aba de catálogo)
        if (currentTab === 'books' && selectedCategory !== 'Todos') {
          const cat = (b.category || '').toLowerCase();
          const sel = selectedCategory.toLowerCase();
          const matches =
            cat.includes(sel) ||
            b.titlePt.toLowerCase().includes(sel) ||
            (b.subtitlePt && b.subtitlePt.toLowerCase().includes(sel));
          if (!matches) return false;
        }

        if (!searchQuery.trim()) return true;

        const raw = searchQuery.toLowerCase().trim();

        // Calibre syntax: 'autor: ...'
        if (raw.startsWith('autor:') || raw.startsWith('author:')) {
          const term = raw.split(':')[1]?.trim();
          return term ? b.author.toLowerCase().includes(term) : true;
        }

        // Calibre syntax: 'titulo:'
        if (raw.startsWith('titulo:') || raw.startsWith('title:')) {
          const term = raw.split(':')[1]?.trim();
          return term
            ? b.titlePt.toLowerCase().includes(term) || b.subtitlePt?.toLowerCase().includes(term)
            : true;
        }

        // Calibre syntax: 'ano:'
        if (raw.startsWith('ano:') || raw.startsWith('year:')) {
          const term = raw.split(':')[1]?.trim();
          return term ? String(b.originalYear).includes(term) : true;
        }

        return (
          b.titlePt.toLowerCase().includes(raw) ||
          (b.subtitlePt && b.subtitlePt.toLowerCase().includes(raw)) ||
          b.author.toLowerCase().includes(raw) ||
          String(b.originalYear).includes(raw)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'title') return a.titlePt.localeCompare(b.titlePt);
        if (sortBy === 'author') return a.author.localeCompare(b.author);
        if (sortBy === 'recent') return b.originalYear - a.originalYear;
        if (sortBy === 'rating') return (b.rating || 5) - (a.rating || 5);
        return (b.rating || 5) - (a.rating || 5);
      });
  }, [books, readChaptersMap, currentTab, favorites, selectedCategory, searchQuery, sortBy]);

  const activeReadingBook = useMemo(() => {
    return (
      books.find((b) => {
        const read = readChaptersMap[b.id] || [];
        return read.length > 0 && read.length < Math.max(1, b.chapterCount);
      }) || (books.length > 0 && (readChaptersMap[books[0].id]?.length || 0) > 0 ? books[0] : null)
    );
  }, [books, readChaptersMap]);

  return (
    <div className={`relative ${isIntegrated ? 'pb-10' : `min-h-screen flex flex-col pb-28 overflow-x-hidden ${pageBg}`}`}>
      {/* Decorative Ambient Glow Orbs inspired by ticket.renovada.app.br */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] sm:w-[950px] h-[350px] bg-gradient-to-tr from-emerald-600/15 via-teal-600/10 to-[#444D87]/20 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-48 -right-20 w-80 h-80 bg-emerald-500/10 blur-[110px] pointer-events-none rounded-full" />
      <div className="absolute top-[650px] -left-20 w-80 h-80 bg-[#444D87]/15 blur-[120px] pointer-events-none rounded-full" />

      {/* Top Header: Only rendered if NOT integrated */}
      {!isIntegrated && (
        <header className={`sticky top-0 z-30 border-b backdrop-blur-2xl px-4 sm:px-8 py-3.5 transition-all ${headerBg}`}>
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            {/* Logo & Greeting */}
            <div className="flex items-center gap-3">
              <a href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
                <img src="/assets/icon.svg" alt="Lumi Ícone" className="w-8 h-8 object-contain" />
                <div className="flex items-center gap-2">
                  <img src="/assets/logo_text.svg" alt="LUMI" className="h-5 w-auto object-contain" />
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-outfit uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-inner">
                    renovada
                  </span>
                </div>
              </a>
              {user && (
                <span className="hidden md:inline-block text-xs font-sans text-slate-400 border-l border-slate-700/60 pl-3">
                  Olá, <strong className="text-white font-medium">{user.name.split(' ')[0]}</strong>
                </span>
              )}
            </div>

            {/* Right Action Icons */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {onBackToLms && (
                <button
                  onClick={onBackToLms}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 font-bold font-outfit text-xs hover:bg-blue-500/25 transition-all shadow-sm cursor-pointer"
                  title="Ir para os Treinamentos"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">LUMI</span>
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={onOpenAdmin}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold font-outfit text-xs hover:bg-purple-500/25 transition-all shadow-sm cursor-pointer"
                  title="Painel do Administrador"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                  <span className="hidden md:inline">Admin</span>
                </button>
              )}
              {user ? (
                <button
                  onClick={() => setCurrentTab('account')}
                  className="flex items-center gap-2 p-0.5 rounded-full ring-2 ring-emerald-500/30 hover:ring-emerald-400 transition-all cursor-pointer hover:scale-105"
                  title={`Logado como ${user.name}`}
                >
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border border-emerald-400"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#444D87] to-emerald-600 text-white font-bold font-outfit text-xs flex items-center justify-center">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
              ) : (
                <button
                  onClick={() =>
                    openLoginModal('Faça login com Google para salvar seu progresso.')
                  }
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold font-outfit text-xs shadow-lg shadow-emerald-950/50 transition-all cursor-pointer transform hover:scale-[1.02]"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Entrar</span>
                </button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Hero Banner Section: Integrada na Plataforma LUMI */}
      <section
        className={`relative overflow-hidden ${
          isIntegrated
            ? 'rounded-3xl p-6 sm:p-8 border border-slate-800/90 bg-gradient-to-r from-[#171B38] via-[#1D234A] to-[#121630] shadow-2xl mb-6'
            : 'pt-8 pb-10 sm:pt-14 sm:pb-14 px-4 sm:px-8 border-b border-slate-800/80 bg-gradient-to-b from-[#171B38] via-[#0F1224] to-[#0F1224]'
        }`}
      >
        <div className="max-w-4xl mx-auto space-y-4 relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold uppercase tracking-wider shadow-inner">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>Biblioteca de Conteúdos & Livros</span>
            </div>

            {isAdmin && (
              <button
                onClick={onOpenUpload}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-outfit text-xs transition-all shadow-md cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Subir Livro (PDF)</span>
              </button>
            )}
          </div>

          <div>
            <h1 className="text-2xl sm:text-4xl font-extrabold font-outfit text-white tracking-tight leading-tight">
              Leituras que <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-200 bg-clip-text text-transparent">Edificam & Transformam</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed mt-1 font-normal">
              Acesse livros cristãos completos, resumos estruturados e materiais complementares que enriquecem os treinamentos da Igreja Presbiteriana Renovada.
            </p>
          </div>

          {/* Sub-Tabs: Explorar | Catálogo | Minhas Leituras */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={() => setCurrentTab('browse')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold font-outfit transition-all cursor-pointer ${
                currentTab === 'browse'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/70'
              }`}
            >
              Explorar Destaques
            </button>
            <button
              onClick={() => setCurrentTab('books')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold font-outfit transition-all cursor-pointer ${
                currentTab === 'books'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/70'
              }`}
            >
              Catálogo de Livros ({books.length})
            </button>
            <button
              onClick={() => setCurrentTab('library')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold font-outfit transition-all cursor-pointer ${
                currentTab === 'library'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/70'
              }`}
            >
              Minhas Leituras ({books.filter((b) => (readChaptersMap[b.id]?.length || 0) > 0 || favorites.includes(b.id)).length})
            </button>
          </div>

          {/* Search bar inside Hero */}
          <div className="pt-2 max-w-xl relative">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar livros, autores ou temas..."
              className="w-full pl-11 pr-10 py-2.5 rounded-2xl bg-[#121630]/90 border border-slate-700/80 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 text-white placeholder-slate-400 text-xs sm:text-sm outline-none transition-all shadow-inner font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className={`flex-1 w-full mx-auto space-y-8 ${isIntegrated ? '' : 'max-w-6xl px-4 sm:px-8 py-6'}`}>
        {/* ============================================================== */}
        {/* TAB 1: BROWSE (EXPLORAR)                                       */}
        {/* ============================================================== */}
        {currentTab === 'browse' && (
          <>
            {/* Widget: Continuar Lendo (Mobile-First High Priority UX) */}
            {activeReadingBook && !searchQuery && (
              <div className="relative group overflow-hidden rounded-3xl bg-gradient-to-br from-[#171B38] via-[#1D234A] to-[#11152E] border border-emerald-500/40 p-5 sm:p-6 shadow-2xl shadow-emerald-950/40">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
                  {/* Book Cover with 3D feel */}
                  <div
                    onClick={() => onSelectBook(activeReadingBook.id)}
                    className="relative shrink-0 cursor-pointer group-hover:scale-105 transition-transform"
                  >
                    <div className="w-24 h-36 sm:w-28 sm:h-40 rounded-xl overflow-hidden border border-white/20 shadow-2xl bg-slate-900">
                      {activeReadingBook.coverImageUrl ? (
                        <img
                          src={activeReadingBook.coverImageUrl}
                          alt={activeReadingBook.titlePt}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="p-3 flex flex-col justify-between h-full bg-slate-800 text-white">
                          <BookOpen className="w-5 h-5 text-emerald-400" />
                          <p className="text-xs font-bold font-outfit line-clamp-3">{activeReadingBook.titlePt}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reading Progress & Action */}
                  <div className="flex-1 text-center sm:text-left space-y-2.5 min-w-0 w-full">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Continuar Leitura
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold font-outfit text-white tracking-tight line-clamp-2">
                      {activeReadingBook.titlePt}
                    </h3>
                    <p className="text-xs text-slate-300 font-sans">{activeReadingBook.author}</p>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 max-w-md mx-auto sm:mx-0">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>Progresso</span>
                        <span className="text-emerald-400 font-bold">
                          {readChaptersMap[activeReadingBook.id]?.length || 0} de {activeReadingBook.chapterCount} cap. ({Math.min(100, Math.round(((readChaptersMap[activeReadingBook.id]?.length || 0) / Math.max(1, activeReadingBook.chapterCount)) * 100))}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-800/90 rounded-full overflow-hidden border border-white/5">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-400 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.round(((readChaptersMap[activeReadingBook.id]?.length || 0) / Math.max(1, activeReadingBook.chapterCount)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => onSelectBook(activeReadingBook.id)}
                        className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold font-outfit text-sm shadow-lg shadow-emerald-950/50 hover:shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>Continuar Lendo Agora</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Featured Hero Carousel */}
            {books.length > 0 && !searchQuery && (
              <FeaturedCarousel
                books={books}
                onSelectBook={(b) => setSelectedBookForDetails(b)}
                theme={theme}
              />
            )}

            {/* Popular Books Carousel */}
            {books.length > 0 && !searchQuery && (
              <PopularBooksScroll
                books={books}
                theme={theme}
                favorites={favorites}
                onToggleFavorite={handleToggleFav}
                onSelectBook={(b) => setSelectedBookForDetails(b)}
                readChaptersMap={readChaptersMap}
              />
            )}

            {/* All Books Section Header & Inline Toolbar */}
            <div className="pt-2 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-5 bg-gradient-to-b from-teal-400 to-[#444D87] rounded-full inline-block shrink-0" />
                  <h3 className={`text-lg sm:text-xl font-bold font-outfit tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {searchQuery ? 'Resultados da Busca' : 'Todos os Livros'}
                  </h3>
                </div>
                <span className={`text-xs font-mono font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {filteredBooks.length} {filteredBooks.length === 1 ? 'obra' : 'obras'}
                </span>
              </div>
              <CatalogToolbar
                sortBy={sortBy}
                onChangeSort={setSortBy}
                viewMode={viewMode}
                onChangeViewMode={setViewMode}
                theme={theme}
                totalBooks={filteredBooks.length}
              />
            </div>

            {/* Vertical Items List or Grid */}
            {filteredBooks.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <p className={`text-sm ${mutedText}`}>
                  {books.length === 0
                    ? 'Nenhum livro disponível no momento. Envie um arquivo PDF para começar!'
                    : 'Nenhum livro encontrado para esta busca/categoria.'}
                </p>
                {books.length === 0 && (
                  <button
                    onClick={onOpenUpload}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs cursor-pointer shadow-md"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Subir Primeiro Livro em PDF</span>
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    theme={theme}
                    variant="carousel"
                    isFavorite={favorites.includes(book.id)}
                    onToggleFavorite={handleToggleFav}
                    onClick={(b) => setSelectedBookForDetails(b)}
                    readCount={readChaptersMap[book.id]?.length || 0}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    theme={theme}
                    variant="list"
                    isFavorite={favorites.includes(book.id)}
                    onToggleFavorite={handleToggleFav}
                    onClick={(b) => setSelectedBookForDetails(b)}
                    readCount={readChaptersMap[book.id]?.length || 0}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ============================================================== */}
        {/* TAB 2: BOOKS (CATÁLOGO)                                        */}
        {/* ============================================================== */}
        {currentTab === 'books' && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-5 bg-gradient-to-b from-emerald-400 to-[#444D87] rounded-full inline-block shrink-0" />
                <h2 className={`text-xl sm:text-2xl font-bold font-outfit tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Catálogo de Livros
                </h2>
              </div>
              <p className={`text-xs ${mutedText}`}>Explore e filtre todas as obras disponíveis</p>
            </div>

            <CategoryPills
              categories={CATEGORIES}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              theme={theme}
            />

            <CatalogToolbar
              sortBy={sortBy}
              onChangeSort={setSortBy}
              viewMode={viewMode}
              onChangeViewMode={setViewMode}
              theme={theme}
              totalBooks={filteredBooks.length}
            />

            {filteredBooks.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <p className={`text-sm ${mutedText}`}>Nenhum livro encontrado para esta categoria.</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    theme={theme}
                    variant="carousel"
                    isFavorite={favorites.includes(book.id)}
                    onToggleFavorite={handleToggleFav}
                    onClick={(b) => setSelectedBookForDetails(b)}
                    readCount={readChaptersMap[book.id]?.length || 0}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    theme={theme}
                    variant="list"
                    isFavorite={favorites.includes(book.id)}
                    onToggleFavorite={handleToggleFav}
                    onClick={(b) => setSelectedBookForDetails(b)}
                    readCount={readChaptersMap[book.id]?.length || 0}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: MY LIBRARY                                              */}
        {/* ============================================================== */}
        {currentTab === 'library' && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-5 bg-gradient-to-b from-emerald-400 to-[#444D87] rounded-full inline-block shrink-0" />
                <h2 className={`text-xl sm:text-2xl font-bold font-outfit tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Minha Biblioteca
                </h2>
              </div>
              <p className={`text-xs ${mutedText}`}>Suas leituras em andamento e obras favoritas</p>
            </div>

            <CatalogToolbar
              sortBy={sortBy}
              onChangeSort={setSortBy}
              viewMode={viewMode}
              onChangeViewMode={setViewMode}
              theme={theme}
              totalBooks={filteredBooks.length}
            />

            {/* Favorite / Reading Books */}
            {filteredBooks.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <p className={`text-sm ${mutedText}`}>Você ainda não tem livros favoritados ou em leitura.</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filteredBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    theme={theme}
                    variant="carousel"
                    isFavorite={favorites.includes(book.id)}
                    onToggleFavorite={handleToggleFav}
                    onClick={(b) => setSelectedBookForDetails(b)}
                    readCount={readChaptersMap[book.id]?.length || 0}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBooks.map((book) => (
                  <BookCard
                    key={book.id}
                    book={book}
                    theme={theme}
                    variant="list"
                    isFavorite={favorites.includes(book.id)}
                    onToggleFavorite={handleToggleFav}
                    onClick={(b) => setSelectedBookForDetails(b)}
                    readCount={readChaptersMap[book.id]?.length || 0}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: ACCOUNT                                                 */}
        {/* ============================================================== */}
        {currentTab === 'account' && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="p-6 rounded-3xl border text-center space-y-5 bg-gradient-to-b from-[#171B38] to-[#0F1224] border-slate-700/60 shadow-2xl shadow-black/60">
              <div className="relative mx-auto w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-400 shadow-xl flex items-center justify-center bg-[#212642] text-emerald-300">
                {user?.picture ? (
                  <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8" />
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold font-outfit text-white tracking-tight">{user?.name || 'Visitante'}</h3>
                <p className={`text-xs ${mutedText}`}>{user?.email || 'Nenhuma conta conectada'}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-[#212642]/70 border border-slate-700/60 shadow-inner">
                  <span className="text-[10px] font-bold font-outfit uppercase tracking-wider text-slate-400">
                    Favoritos
                  </span>
                  <p className="text-2xl font-bold font-outfit text-rose-400 mt-1">
                    {favorites.length}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#212642]/70 border border-slate-700/60 shadow-inner">
                  <span className="text-[10px] font-bold font-outfit uppercase tracking-wider text-slate-400">
                    Obras no App
                  </span>
                  <p className="text-2xl font-bold font-outfit text-emerald-400 mt-1">
                    {books.length}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2.5">
                {isAdmin && (
                  <button
                    onClick={onOpenAdmin}
                    className="w-full py-3 rounded-2xl bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold font-outfit text-xs hover:bg-purple-500/25 transition-all shadow-md cursor-pointer"
                  >
                    Painel do Administrador
                  </button>
                )}

                {user ? (
                  <button
                    onClick={logout}
                    className="w-full py-3 rounded-2xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold font-outfit text-xs transition-colors cursor-pointer"
                  >
                    Sair da Conta Google
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      openLoginModal('Faça login com Google para salvar seu progresso.')
                    }
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold font-outfit text-sm shadow-xl shadow-emerald-950/60 transition-all cursor-pointer transform hover:scale-[1.01]"
                  >
                    Entrar com Google
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Fixed Bottom Navigation Bar (apenas quando não integrado no shell principal LUMI) */}
      {!isIntegrated && (
        <BottomNavigation
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          theme={theme}
          onOpenUpload={onOpenUpload}
          unreadCount={
            books.filter((b) => {
              const read = readChaptersMap[b.id] || [];
              return read.length > 0 && read.length < Math.max(1, b.chapterCount);
            }).length
          }
          userAvatar={user?.picture}
          userName={user?.name}
        />
      )}

      {/* Immersive Book Details Screen / Modal */}
      <BookDetailModal
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
