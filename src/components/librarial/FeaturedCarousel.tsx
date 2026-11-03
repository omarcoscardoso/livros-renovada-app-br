import React, { useState, useMemo } from 'react';
import { BookOpen, ChevronRight, ChevronLeft, Award, Sparkles } from 'lucide-react';
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

  // Priority: Books explicitly marked as isFeatured by Admin. Fallback to books[0].
  const featuredList = useMemo(() => {
    const explicitlyFeatured = books.filter((b) => b.isFeatured);
    return explicitlyFeatured.length > 0 ? explicitlyFeatured : [books[0]];
  }, [books]);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Bounds safety
  const safeIndex = currentIndex < featuredList.length ? currentIndex : 0;
  const featuredBook = featuredList[safeIndex];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : featuredList.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < featuredList.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="relative rounded-3xl overflow-hidden border border-slate-700/60 shadow-2xl shadow-[#0F1224]/80 transition-all duration-300">
      {/* Background with blurred ambient glow and Renovada navy gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#171B38] via-[#212642] to-[#0F1224]" />
      <div className="absolute -top-10 -left-10 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-[#444D87]/25 rounded-full blur-3xl pointer-events-none" />

      {featuredBook.coverImageUrl && (
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-20 overflow-hidden pointer-events-none">
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
      <div className="relative z-10 p-5 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-white">
        <div className="space-y-3 max-w-xl text-center md:text-left flex-1">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-outfit uppercase tracking-wide shadow-inner">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>Destaque Editorial • Lumi</span>
            </div>

            {featuredList.length > 1 && (
              <span className="text-[11px] font-mono text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {safeIndex + 1} de {featuredList.length}
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-outfit leading-tight tracking-tight bg-gradient-to-r from-white via-slate-100 to-emerald-200 bg-clip-text text-transparent">
            {featuredBook.titlePt}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 font-sans line-clamp-2 leading-relaxed font-normal">
            {featuredBook.subtitlePt ||
              `Aprofunde-se nos princípios bíblicos, liderança e comunhão com a obra de ${featuredBook.author}.`}
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
            <button
              onClick={() => onSelectBook(featuredBook)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold font-outfit text-xs sm:text-sm shadow-xl shadow-emerald-950/60 transition-all transform hover:scale-[1.03] cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Explorar Obra</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Pagination Controls if multiple featured books */}
            {featuredList.length > 1 && (
              <div className="flex items-center gap-1.5 ml-2">
                <button
                  onClick={handlePrev}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5 px-1">
                  {featuredList.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentIndex(i);
                      }}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        i === safeIndex ? 'w-5 bg-emerald-400' : 'w-1.5 bg-white/30'
                      }`}
                      aria-label={`Destaque ${i + 1}`}
                    />
                  ))}
                </div>
                <button
                  onClick={handleNext}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Próximo"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Book Cover Showcase on Right */}
        <div
          onClick={() => onSelectBook(featuredBook)}
          className="relative shrink-0 cursor-pointer group"
        >
          <div className="absolute -inset-2 bg-gradient-to-tr from-emerald-500/25 to-[#444D87]/30 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity" />
          <div className="relative w-28 h-40 sm:w-36 sm:h-52 rounded-2xl overflow-hidden border border-white/15 shadow-2xl shadow-black/80 group-hover:scale-105 transition-transform duration-300">
            {featuredBook.coverImageUrl ? (
              <>
                <img
                  src={featuredBook.coverImageUrl}
                  alt={featuredBook.titlePt}
                  className="w-full h-full object-cover"
                />
                <div className="pointer-events-none absolute inset-y-0 left-0 w-3 bg-gradient-to-r from-black/40 via-white/20 to-transparent" />
              </>
            ) : (
              <div className="p-4 flex flex-col justify-between h-full bg-gradient-to-br from-indigo-900 to-slate-900 text-white">
                <BookOpen className="w-6 h-6 text-emerald-400" />
                <p className="text-xs font-bold font-outfit line-clamp-3">{featuredBook.titlePt}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
