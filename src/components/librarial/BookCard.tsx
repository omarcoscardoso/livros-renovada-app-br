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
  const isLight = theme === 'light';
  const cardBg = isLight
    ? 'bg-white border border-slate-200 hover:border-emerald-500/60 text-slate-900 shadow-md hover:shadow-xl'
    : 'bg-[#171B38] border border-slate-700/80 hover:border-emerald-500/60 text-slate-100 shadow-xl shadow-black/40 hover:shadow-2xl hover:shadow-emerald-950/40';

  const mutedText = isLight ? 'text-slate-600' : 'text-slate-400';

  const coverGradient = COVER_GRADIENTS[book.coverColor] || COVER_GRADIENTS.amber;
  const hasRating = typeof book.rating === 'number' && book.rating > 0;
  const ratingFormatted = hasRating ? book.rating.toFixed(1) : null;
  const starTextColor = 'text-amber-400';
  const totalCh = Math.max(1, book.chapterCount);
  const percent = Math.min(100, Math.round((readCount / totalCh) * 100));
  const isCompleted = readCount >= totalCh && totalCh > 0;
  const estimatedPages = book.pageCount || totalCh * 18;

  // VARIANT 1: CAROUSEL / GRID CARD
  if (variant === 'carousel') {
    return (
      <div
        onClick={() => onClick(book)}
        className={`group relative snap-start shrink-0 w-44 sm:w-52 rounded-3xl border p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-950/40 cursor-pointer ${cardBg}`}
      >
        {/* Top Floating Rating & Favorite */}
        <div className="flex items-center justify-between mb-2.5 z-10">
          <div
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border backdrop-blur-md text-[10px] font-bold shadow-sm ${
              isLight
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-slate-900/80 border-slate-700/60 text-amber-300'
            }`}
          >
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{hasRating ? ratingFormatted : 'Novo'}</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(book.id);
            }}
            className={`p-1.5 rounded-full border backdrop-blur-md transition-all cursor-pointer hover:scale-110 ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                : 'bg-slate-900/70 hover:bg-slate-900 border-white/10 text-white'
            }`}
            title={isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                isFavorite ? 'fill-[#EF4444] text-[#EF4444]' : isLight ? 'text-slate-400' : 'text-white/80'
              }`}
            />
          </button>
        </div>

        {/* Vertical Cover with Shadow */}
        <div className="relative mb-3 flex flex-col items-center">
          <div className="absolute -inset-1 bg-gradient-to-tr from-emerald-500/20 to-[#444D87]/20 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
          <div
            className={`relative w-30 h-42 sm:w-34 sm:h-48 rounded-2xl overflow-hidden border border-white/10 shadow-xl group-hover:scale-[1.03] transition-transform duration-300 ${coverGradient}`}
          >
            {book.coverImageUrl ? (
              <>
                <img
                  src={book.coverImageUrl}
                  alt={book.titlePt}
                  className="w-full h-full object-cover bg-white"
                  loading="lazy"
                />
                <div className="pointer-events-none absolute inset-y-0 left-0 w-2.5 bg-gradient-to-r from-black/40 via-white/15 to-transparent" />
              </>
            ) : (
              <div className="p-3 flex flex-col justify-between h-full text-left text-white">
                <BookOpen className="w-4 h-4 text-emerald-300" />
                <div>
                  <p className="text-[10px] font-bold font-outfit leading-tight line-clamp-3">
                    {book.titlePt}
                  </p>
                  <p className="text-[9px] opacity-80 mt-1 truncate font-sans">{book.author}</p>
                </div>
              </div>
            )}
          </div>

          {/* Reading progress bar under cover */}
          {readCount > 0 && (
            <div className="w-28 sm:w-32 mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
        </div>

        {/* Title, Author & Metadata */}
        <div className="space-y-1">
          <h3 className={`text-xs sm:text-sm font-bold font-outfit group-hover:text-emerald-500 transition-colors line-clamp-1 ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            {book.titlePt}
          </h3>
          <p className={`text-[11px] ${mutedText} truncate font-sans`}>{book.author}</p>

          <div className="pt-1.5 flex items-center justify-between text-[10px]">
            <span className="px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 font-mono text-[9px]">
              {estimatedPages}p
            </span>
            <span className="text-emerald-400 font-bold font-outfit">
              {readCount > 0 ? `${percent}% lido` : `${totalCh} cap.`}
            </span>
          </div>

          {/* Action Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick(book);
            }}
            className="w-full mt-2.5 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold font-outfit text-xs shadow-md shadow-emerald-950/40 hover:shadow-emerald-500/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{readCount > 0 ? 'Continuar' : 'Ler Agora'}</span>
          </button>
        </div>
      </div>
    );
  }

  // VARIANT 2: VERTICAL LIST ITEM
  return (
    <div
      onClick={() => onClick(book)}
      className={`group rounded-3xl border p-3.5 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:border-emerald-500/50 cursor-pointer ${cardBg}`}
    >
      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
        {/* Cover */}
        <div
          className={`relative w-14 h-20 sm:w-16 sm:h-22 rounded-xl sm:rounded-2xl border border-white/10 overflow-hidden shrink-0 shadow-md transition-transform group-hover:scale-105 ${coverGradient}`}
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
              <BookOpen className="w-3.5 h-3.5 text-emerald-300" />
              <p className="text-[9px] font-bold font-outfit leading-tight line-clamp-2">{book.titlePt}</p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-sm sm:text-base font-bold font-outfit group-hover:text-emerald-500 transition-colors line-clamp-1 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              {book.titlePt}
            </h3>

            {isCompleted ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-outfit bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0 shadow-inner">
                <CheckCircle2 className="w-2.5 h-2.5" /> Concluído
              </span>
            ) : readCount > 0 ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-outfit bg-teal-500/15 text-teal-300 border border-teal-500/30 shrink-0">
                {percent}%
              </span>
            ) : null}
          </div>

          <p className={`text-xs ${mutedText} truncate font-sans`}>
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
              <Clock className="w-3 h-3 text-teal-400" />
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
          className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer text-slate-400 hover:text-rose-400"
          title={isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
        >
          <Heart
            className={`w-4 h-4 ${
              isFavorite ? 'fill-[#EF4444] text-[#EF4444]' : 'text-slate-400'
            }`}
          />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick(book);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold font-outfit text-xs shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{readCount > 0 ? 'Continuar' : 'Ler'}</span>
        </button>
      </div>
    </div>
  );
};
