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

  return (
    <section className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#FF7A00]/15 text-[#FF7A00] flex items-center justify-center">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-editorial">Popular Books</h2>
            <p className="text-[11px] text-slate-400">Obras em destaque com alta avaliação</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs text-[#5C6BC0] font-semibold cursor-pointer hover:underline">
          <span>Ver todos</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="flex items-stretch gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x snap-mandatory">
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
