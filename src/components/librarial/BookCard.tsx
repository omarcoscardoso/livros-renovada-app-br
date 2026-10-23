import React from 'react';
import { Star, Heart, BookOpen, Headphones, CheckCircle2, Clock } from 'lucide-react';
import { Book, LibrarialTheme } from '../../types/librarial';

interface BookCardProps {
  book: Book;
  theme: LibrarialTheme;
  variant?: 'carousel' | 'list';
  isFavorite: boolean;
  onToggleFavorite: (bookId: string) => void;
  onClick: (book: Book) => void;
  readCount?: number;
}

const COVER_GRADIENTS: Record<string, string> = {
  amber: 'from-amber-600 via-amber-800 to-slate-950 border-amber-500/30 text-amber-100',
  emerald: 'from-emerald-600 via-emerald-800 to-slate-950 border-emerald-500/30 text-emerald-100',
  blue: 'from-blue-600 via-blue-800 to-slate-950 border-blue-500/30 text-blue-100',
  rose: 'from-rose-600 via-rose-800 to-slate-950 border-rose-500/30 text-rose-100',
  violet: 'from-violet-600 via-violet-800 to-slate-950 border-violet-500/30 text-violet-100',
};

export const BookCard: React.FC<BookCardProps> = ({
  book,
  theme,
  variant = 'carousel',
  isFavorite,
  onToggleFavorite,
  onClick,
  readCount = 0,
}) => {
  const isDark = theme === 'dark' || theme === 'contrast';
  const isSepia = theme === 'sepia';

  const cardBg = isDark
    ? 'bg-[#18181B] border-neutral-800 hover:border-[#5C6BC0]/60 text-neutral-100'
    : isSepia
    ? 'bg-[#FBF0D9] border-[#E8DCBF] hover:border-[#5C6BC0]/60 text-[#5F4B32]'
    : 'bg-white border-slate-200/80 hover:border-[#5C6BC0]/60 text-slate-900 shadow-sm';

  const mutedText = isDark
    ? 'text-neutral-400'
    : isSepia
    ? 'text-[#705E4D]'
    : 'text-slate-500';

  const coverGradient = COVER_GRADIENTS[book.coverColor] || COVER_GRADIENTS.amber;
  const hasRating = typeof book.rating === 'number' && book.rating > 0;
  const ratingFormatted = hasRating ? book.rating.toFixed(1) : null;
  const starTextColor = isSepia ? 'text-[#92400E]' : 'text-[#FF7A00]';
  const totalCh = Math.max(1, book.chapterCount);
  const percent = Math.min(100, Math.round((readCount / totalCh) * 100));
  const isCompleted = readCount >= totalCh && totalCh > 0;
  const estimatedPages = book.pageCount || totalCh * 18;

  // VARIANT 1: CAROUSEL CARD
  if (variant === 'carousel') {
    return (
      <div
        onClick={() => onClick(book)}
        className={`group relative snap-start shrink-0 w-40 sm:w-48 rounded-2xl border p-3.5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer ${cardBg}`}
      >
        {/* Top Floating Rating & Favorite */}
        <div className="flex items-center justify-between mb-2.5 z-10">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-[10px] font-bold text-white">
            <Star className={`w-3 h-3 ${isSepia ? 'fill-amber-400 text-amber-400' : 'fill-[#FF7A00] text-[#FF7A00]'}`} />
            <span>{hasRating ? ratingFormatted : 'Novo'}</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(book.id);
            }}
            className="p-1.5 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md text-white transition-colors cursor-pointer"
            title={isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                isFavorite ? 'fill-[#FF3B30] text-[#FF3B30]' : 'text-white/80'
              }`}
            />
          </button>
        </div>

        {/* Vertical Cover with Shadow */}
        <div className="relative mb-3 flex justify-center">
          <div className="absolute -inset-1 bg-[#5C6BC0]/15 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
          <div
            className={`relative w-28 h-40 sm:w-32 sm:h-46 rounded-xl overflow-hidden border shadow-md group-hover:scale-[1.03] transition-transform duration-300 ${coverGradient}`}
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
                <BookOpen className="w-4 h-4 text-amber-300" />
                <div>
                  <p className="text-[10px] font-bold font-editorial leading-tight line-clamp-3">
                    {book.titlePt}
                  </p>
                  <p className="text-[9px] opacity-80 mt-1 truncate">{book.author}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Title, Author & Metadata */}
        <div className="space-y-1">
          <h3 className="text-xs sm:text-sm font-bold font-editorial group-hover:text-[#5C6BC0] transition-colors line-clamp-1">
            {book.titlePt}
          </h3>
          <p className={`text-[11px] ${mutedText} truncate`}>{book.author}</p>

          <div className="pt-1.5 flex items-center justify-between text-[10px]">
            <span className="px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/5 font-mono text-[9px]">
              {estimatedPages}p
            </span>
            <span className="text-[#5C6BC0] font-semibold group-hover:underline">
              {readCount > 0 ? `${percent}% lido` : 'Explorar'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // VARIANT 2: VERTICAL LIST ITEM
  return (
    <div
      onClick={() => onClick(book)}
      className={`group rounded-2xl border p-3.5 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:border-[#5C6BC0]/50 cursor-pointer ${cardBg}`}
    >
      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
        {/* Cover */}
        <div
          className={`relative w-14 h-20 sm:w-16 sm:h-22 rounded-xl border overflow-hidden shrink-0 shadow-sm transition-transform group-hover:scale-105 ${coverGradient}`}
        >
          {book.coverImageUrl ? (
            <>
              <img
                src={book.coverImageUrl}
                alt={book.titlePt}
                className="w-full h-full object-cover bg-white"
                loading="lazy"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/30 via-white/10 to-transparent" />
            </>
          ) : (
            <div className="p-2 flex flex-col justify-between h-full text-left text-white">
              <BookOpen className="w-3.5 h-3.5 text-amber-300" />
              <p className="text-[9px] font-bold leading-tight line-clamp-2">{book.titlePt}</p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-bold font-editorial group-hover:text-[#5C6BC0] transition-colors line-clamp-1">
              {book.titlePt}
            </h3>

            {isCompleted ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 shrink-0">
                <CheckCircle2 className="w-2.5 h-2.5" /> Concluído
              </span>
            ) : readCount > 0 ? (
              <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold bg-[#5C6BC0]/15 text-[#5C6BC0] border border-[#5C6BC0]/30 shrink-0">
                {percent}%
              </span>
            ) : null}
          </div>

          <p className={`text-xs ${mutedText} truncate`}>
            {book.author} • {book.originalYear}
          </p>

          <div className={`flex items-center gap-3 pt-0.5 text-[11px] ${mutedText}`}>
            <span className={`flex items-center gap-1 font-bold ${starTextColor}`}>
              <Star className="w-3 h-3 fill-current" />
              {hasRating ? ratingFormatted : 'Novo'}
            </span>
            <span>•</span>
            <span>{book.chapterCount} cap. (~{estimatedPages}p)</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              ~{book.totalEstimatedMinutes}m
            </span>
          </div>
        </div>
      </div>

      {/* Right Action */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(book.id);
          }}
          className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          title={isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
        >
          <Heart
            className={`w-4 h-4 ${
              isFavorite ? 'fill-[#FF3B30] text-[#FF3B30]' : mutedText
            }`}
          />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick(book);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#5C6BC0] hover:bg-[#4D5AB5] text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{readCount > 0 ? 'Continuar' : 'Ler'}</span>
        </button>
      </div>
    </div>
  );
};
