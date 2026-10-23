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
}) => {
  const { user, isAdmin, openLoginModal, logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<LibrarialNavTab>('browse');
  const [selectedBookForDetails, setSelectedBookForDetails] = useState<Book | null>(null);
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const isDark = theme === 'dark' || theme === 'contrast';
  const isSepia = theme === 'sepia';

  const pageBg = isDark
    ? 'bg-[#121212] text-[#E0E0E0]'
    : isSepia
    ? 'bg-[#FBF0D9] text-[#5F4B32]'
    : 'bg-[#F8F9FA] text-slate-900';

  const headerBg = isDark
    ? 'bg-[#18181B]/90 border-neutral-800'
    : isSepia
    ? 'bg-[#F5ECD7]/90 border-[#E8DCBF]'
    : 'bg-white/90 border-slate-200/80';

  const mutedText = isDark
    ? 'text-neutral-400'
    : isSepia
    ? 'text-[#705E4D]'
    : 'text-slate-500';

  const inputBg = isDark
    ? 'bg-[#18181B] border-neutral-800 text-neutral-100 placeholder-neutral-500'
    : isSepia
    ? 'bg-[#EFE4CC] border-[#DFD4BD] text-[#5F4B32] placeholder-[#8C7865]'
    : 'bg-white border-slate-200/90 text-slate-900 placeholder-slate-400';

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

        // Category filter
        if (selectedCategory !== 'Todos') {
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
    <div className={`min-h-screen flex flex-col transition-colors duration-200 relative pb-24 ${pageBg}`}>
      {/* Top Header Dinâmico: Saudação com avatar, busca e tema */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md px-4 sm:px-8 py-3.5 ${headerBg}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Greeting */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5C6BC0]/15 border border-[#5C6BC0]/30 flex items-center justify-center text-[#5C6BC0] shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-bold font-sans tracking-tight text-current">
                  Livro App
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF7A00]/15 text-[#FF7A00] border border-[#FF7A00]/30">
                  Librarial UI
                </span>
              </div>
              <p className={`text-xs ${mutedText}`}>
                {user ? `Olá, ${user.name.split(' ')[0]}!` : 'Modo visitante • Leitura aberta'}
              </p>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle (4 modos) */}
            <div className="flex items-center rounded-full border border-black/10 dark:border-white/10 p-1">
              <button
                onClick={() => onChangeTheme('light')}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  theme === 'light' ? 'bg-[#5C6BC0] text-white' : mutedText
                }`}
                title="Modo Claro"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onChangeTheme('sepia')}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  theme === 'sepia' ? 'bg-[#5C6BC0] text-white' : mutedText
                }`}
                title="Modo Sépia"
              >
                <Coffee className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onChangeTheme('dark')}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  theme === 'dark' ? 'bg-[#5C6BC0] text-white' : mutedText
                }`}
                title="Modo Escuro"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Admin button */}
            {isAdmin && (
              <button
                onClick={onOpenAdmin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-300 font-semibold text-xs hover:bg-purple-500/25 transition-colors cursor-pointer"
                title="Painel do Administrador"
              >
                <ShieldAlert className="w-4 h-4" />
                <span className="hidden md:inline">Admin</span>
              </button>
            )}

            {/* User Profile / Login */}
            {user ? (
              <button
                onClick={() => setCurrentTab('account')}
                className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-[#5C6BC0]/50 transition-all cursor-pointer"
                title={`Logado como ${user.name}`}
              >
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover border border-[#5C6BC0]"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#5C6BC0] text-white font-bold text-xs flex items-center justify-center">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
            ) : (
              <button
                onClick={() =>
                  openLoginModal('Faça login com Google para salvar seu progresso.')
                }
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#5C6BC0] hover:bg-[#4D5AB5] text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* ============================================================== */}
        {/* TAB 1: BROWSE (EXPLORAR)                                       */}
        {/* ============================================================== */}
        {currentTab === 'browse' && (
          <>
            {/* Featured Hero Carousel */}
            {books.length > 0 && (
              <FeaturedCarousel
                books={books}
                onSelectBook={(b) => setSelectedBookForDetails(b)}
                theme={theme}
              />
            )}

            {/* Category Pills (Horizontal Chips) */}
            <CategoryPills
              categories={CATEGORIES}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              theme={theme}
            />

            {/* Popular Books Carousel */}
            {books.length > 0 && (
              <PopularBooksScroll
                books={books}
                theme={theme}
                favorites={favorites}
                onToggleFavorite={handleToggleFav}
                onSelectBook={(b) => setSelectedBookForDetails(b)}
                readChaptersMap={readChaptersMap}
              />
            )}

            {/* Search Input Toolbar */}
            <div className="relative">
              <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar em todo o acervo (título, autor, ano ou 'autor: Larry')..."
                className={`w-full pl-10 pr-9 py-2.5 rounded-full border text-xs sm:text-sm outline-none focus:border-[#5C6BC0] transition-colors ${inputBg}`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full ${mutedText} hover:text-current`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* All Books Section Header & Inline Toolbar */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-bold font-editorial">
                  Todos os Livros
                </h3>
              </div>
              <CatalogToolbar
                sortBy={sortBy}
                onChangeSort={setSortBy}
                viewMode={viewMode}
                onChangeViewMode={setViewMode}
                theme={theme}
                totalBooks={filteredBooks.length}
                onOpenUpload={onOpenUpload}
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
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#5C6BC0] text-white font-bold text-xs cursor-pointer shadow-md"
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
              <h2 className="text-xl sm:text-2xl font-bold font-editorial">Catálogo de Livros</h2>
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
              onOpenUpload={onOpenUpload}
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
              <h2 className="text-xl sm:text-2xl font-bold font-editorial">Minha Biblioteca</h2>
              <p className={`text-xs ${mutedText}`}>Suas leituras em andamento e obras favoritas</p>
            </div>

            <CatalogToolbar
              sortBy={sortBy}
              onChangeSort={setSortBy}
              viewMode={viewMode}
              onChangeViewMode={setViewMode}
              theme={theme}
              totalBooks={filteredBooks.length}
              onOpenUpload={onOpenUpload}
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
            <div className="p-6 rounded-3xl border text-center space-y-4 bg-white dark:bg-[#18181B] border-slate-200/80 dark:border-neutral-800 shadow-sm">
              <div className="relative mx-auto w-20 h-20 rounded-full overflow-hidden border-2 border-[#5C6BC0] shadow-md flex items-center justify-center bg-slate-100 dark:bg-neutral-800 text-[#5C6BC0]">
                {user?.picture ? (
                  <img src={user.picture} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8" />
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold font-editorial">{user?.name || 'Visitante'}</h3>
                <p className={`text-xs ${mutedText}`}>{user?.email || 'Nenhuma conta conectada'}</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                    Favoritos
                  </span>
                  <p className="text-xl font-mono font-bold text-[#FF3B30] mt-1">
                    {favorites.length}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                    Obras no App
                  </span>
                  <p className="text-xl font-mono font-bold text-[#5C6BC0] mt-1">
                    {books.length}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                {isAdmin && (
                  <button
                    onClick={onOpenAdmin}
                    className="w-full py-2.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 font-bold text-xs cursor-pointer"
                  >
                    Painel do Administrador
                  </button>
                )}

                {user ? (
                  <button
                    onClick={logout}
                    className="w-full py-2.5 rounded-full border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 font-bold text-xs cursor-pointer"
                  >
                    Sair da Conta Google
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      openLoginModal('Faça login com Google para salvar seu progresso.')
                    }
                    className="w-full py-2.5 rounded-full bg-[#5C6BC0] hover:bg-[#4D5AB5] text-white font-bold text-xs cursor-pointer"
                  >
                    Entrar com Google
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Fixed Bottom Navigation Bar (4 tabs) */}
      <BottomNavigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
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
