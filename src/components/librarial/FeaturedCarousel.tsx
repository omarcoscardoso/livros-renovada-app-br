import React from 'react';
import { Sparkles, BookOpen, ChevronRight, Award } from 'lucide-react';
import { Book, LibrarialTheme } from '../../types/librarial';

interface FeaturedCarouselProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  theme: LibrarialTheme;
}

export const FeaturedCarousel: React.FC<FeaturedCarouselProps> = ({
  books,
  onSelectBook,
  theme,
}) => {
  if (books.length === 0) return null;

  const featuredBook = books[0];

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-2xl transition-all duration-300">
      {/* Background with blurred ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#2A3469] via-[#404D8C] to-[#1E293B]" />

      {featuredBook.coverImageUrl && (
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-25 overflow-hidden pointer-events-none">
          <img
            src={featuredBook.coverImageUrl}
            alt=""
            className="w-full h-full object-cover blur-2xl scale-125"
          />
        </div>
      )}

      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-white">
        <div className="space-y-3 max-w-xl text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#FF7A00] text-white shadow-sm">
            <Award className="w-3.5 h-3.5" />
            <span>Destaque Editorial • Livro App</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold font-editorial leading-tight">
            {featuredBook.titlePt}
          </h2>

          <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 leading-relaxed font-light">
            {featuredBook.subtitlePt ||
              `Aprofunde-se nos princípios de discipulado, comunhão bíblica e liderança pastoral com a obra integral de ${featuredBook.author}.`}
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
            <button
              onClick={() => onSelectBook(featuredBook)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#5C6BC0] hover:bg-[#4D5AB5] text-white font-bold text-xs shadow-lg shadow-[#5C6BC0]/30 transition-all transform hover:scale-105 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Explorar Obra</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Floating Mini 3D Cover */}
        <div
          onClick={() => onSelectBook(featuredBook)}
          className="relative group cursor-pointer shrink-0"
        >
          <div className="absolute -inset-2 bg-white/20 rounded-2xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity" />
          <div className="relative w-28 h-40 sm:w-32 sm:h-46 rounded-xl overflow-hidden border border-white/30 shadow-2xl transition-transform group-hover:scale-105 bg-slate-900">
            {featuredBook.coverImageUrl ? (
              <>
                <img
                  src={featuredBook.coverImageUrl}
                  alt={featuredBook.titlePt}
                  className="w-full h-full object-cover"
                />
                <div className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/40 via-white/15 to-transparent" />
              </>
            ) : (
              <div className="p-3 flex flex-col justify-between h-full text-left">
                <BookOpen className="w-5 h-5 text-amber-300" />
                <p className="text-[11px] font-bold leading-tight line-clamp-3">
                  {featuredBook.titlePt}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
