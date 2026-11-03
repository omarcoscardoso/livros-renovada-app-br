import React from 'react';
import { Flame, ChevronRight } from 'lucide-react';
import { Book, LibrarialTheme } from '../../types/librarial';
import { BookCard } from './BookCard';

interface PopularBooksScrollProps {
  books: Book[];
  theme: LibrarialTheme;
  favorites: string[];
  onToggleFavorite: (bookId: string) => void;
  onSelectBook: (book: Book) => void;
  readChaptersMap: Record<string, string[]>;
}

export const PopularBooksScroll: React.FC<PopularBooksScrollProps> = ({
  books,
  theme,
  favorites,
  onToggleFavorite,
  onSelectBook,
  readChaptersMap,
}) => {
  if (books.length === 0) return null;
  const isLight = theme === 'light';

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500/20 via-emerald-500/10 to-[#444D87]/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h2 className={`text-lg sm:text-xl font-bold font-outfit tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Obras em Alta
            </h2>
            <p className={`text-[11px] font-sans ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
              Livros mais lidos e recomendados pela comunidade
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-emerald-400 font-bold font-outfit cursor-pointer hover:underline">
          <span>Ver todos</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="flex items-stretch gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x snap-mandatory">
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            theme={theme}
            variant="carousel"
            isFavorite={favorites.includes(book.id)}
            onToggleFavorite={onToggleFavorite}
            onClick={onSelectBook}
            readCount={readChaptersMap[book.id]?.length || 0}
          />
        ))}
      </div>
    </section>
  );
};
