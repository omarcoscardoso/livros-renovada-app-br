import React, { useState } from 'react';
import {
  X,
  Star,
  BookOpen,
  Download,
  Share2,
  Heart,
  Headphones,
  Check,
  Calendar,
  FileText,
  Clock,
  Award,
  ChevronRight,
  ListOrdered,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { BookSummary } from '../data/bookTypes';
import { ReaderTheme } from './Navbar';

interface BookDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: BookSummary | null;
  theme: ReaderTheme;
  isFavorite: boolean;
  onToggleFavorite: (bookId: string) => void;
  onStartReading: (bookId: string) => void;
  onSelectChapter?: (bookId: string, chapterId: string) => void;
  onOpenPdf?: (bookId: string) => void;
  onStartAudiobook?: (bookId: string) => void;
  readCount: number;
}

export const BookDetailsModal: React.FC<BookDetailsModalProps> = ({
  isOpen,
  onClose,
  book,
  theme,
  isFavorite,
  onToggleFavorite,
  onStartReading,
  onSelectChapter,
  onOpenPdf,
  onStartAudiobook,
  readCount,
}) => {
  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [activeTab, setActiveTab] = useState<'about' | 'chapters'>('about');

  if (!isOpen || !book) return null;

  const isDark = theme === 'dark';
  const isSepia = theme === 'sepia';

  const modalBg = isDark
    ? 'bg-[#0f141c] text-slate-100 border-slate-800'
    : isSepia
    ? 'bg-[#f7f3e8] text-[#2c2217] border-[#ded3be]'
    : 'bg-white text-slate-900 border-slate-200';

  const cardSurfaceBg = isDark
    ? 'bg-slate-900/60 border-slate-800'
    : isSepia
    ? 'bg-[#ede5d2]/60 border-[#dfd4bd]'
    : 'bg-slate-50 border-slate-200';

  const mutedText = isDark
    ? 'text-slate-400'
    : isSepia
    ? 'text-[#7d6851]'
    : 'text-slate-500';

  const hasRating = typeof book.rating === 'number' && book.rating > 0;
  const rating = hasRating ? book.rating.toFixed(1) : null;
  const reviewsCount = typeof book.reviewsCount === 'number' ? book.reviewsCount : 0;
  const starTextColor = isSepia ? 'text-[#92400E]' : 'text-[#FF7A00]';
  const rankingText = book.rankingText || (hasRating ? '#01 Mais Lido na Biblioteca' : 'Lançamento Lumi');
  const totalCh = Math.max(1, book.chapterCount);
  const estimatedPages = book.pageCount || Math.round(totalCh * 18);
  const isCompleted = readCount >= totalCh;
  const hasStarted = readCount > 0;

  const authorBio =
    book.authorBio ||
    `Autor respeitado internacionalmente, reconhecido por suas obras de liderança e impacto teológico global com ${book.author}.`;

  const authorFollowers = book.authorFollowers
    ? book.authorFollowers.toLocaleString('pt-BR')
    : '14.200';

  const synopsisText =
    book.synopsis ||
    book.translatorNote ||
    `Obra essencial de ${book.author}, explorando princípios bíblicos atemporais para liderança, comunhão estruturada e multiplicação orgânica. O texto traz fundamentos práticos de mentoria, cuidado e pastoreio eficaz para o contexto contemporâneo.`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: book.titlePt,
        text: `Confira o livro "${book.titlePt}" de ${book.author} na Biblioteca Digital.`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-y-auto backdrop-blur-md bg-black/60 transition-opacity animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-2xl min-h-screen sm:min-h-0 rounded-none sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col my-auto transition-all ${modalBg}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Immersive Header with Blurred Cover Ambient Aura */}
        <div className="relative pt-8 pb-6 px-6 sm:px-10 overflow-hidden border-b border-black/5 dark:border-white/5">
          {/* Ambient Cover Backdrop Glow */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {book.coverImageUrl ? (
              <img
                src={book.coverImageUrl}
                alt=""
                className="w-full h-full object-cover blur-3xl opacity-25 scale-125 saturate-150 transform -translate-y-10"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-600/30 via-indigo-600/20 to-transparent blur-3xl" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-current/5 to-current/20 opacity-30" />
          </div>

          {/* Top Actions: Close, Share, Favorite */}
          <div className="relative z-10 flex items-center justify-between mb-6">
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors cursor-pointer"
              aria-label="Fechar detalhes"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="p-2 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors cursor-pointer"
                title="Compartilhar livro"
              >
                {copiedShare ? (
                  <Check className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Share2 className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={() => onToggleFavorite(book.id)}
                className={`p-2 rounded-full transition-colors cursor-pointer ${
                  isFavorite
                    ? 'bg-rose-500/20 text-rose-500 hover:bg-rose-500/30'
                    : 'bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20'
                }`}
                title={isFavorite ? 'Remover dos favoritos' : 'Favoritar livro'}
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current text-rose-500' : ''}`} />
              </button>
            </div>
          </div>

          {/* Main Book Presentation: 3D Cover + Title & Author */}
          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
            {/* 3D Book Cover with Spine and Halo */}
            <div className="relative group shrink-0">
              <div className="absolute -inset-3 bg-amber-500/25 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-36 h-52 sm:w-40 sm:h-60 rounded-2xl overflow-hidden border shadow-2xl transition-transform duration-300 group-hover:scale-[1.02] bg-slate-900">
                {book.coverImageUrl ? (
                  <>
                    <img
                      src={book.coverImageUrl}
                      alt={book.titlePt}
                      className="w-full h-full object-cover bg-white"
                    />
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-3.5 bg-gradient-to-r from-black/40 via-white/15 to-transparent" />
                  </>
                ) : (
                  <div className="p-4 flex flex-col justify-between h-full bg-gradient-to-br from-amber-600 to-slate-900 text-white">
                    <BookOpen className="w-6 h-6 text-amber-300" />
                    <div>
                      <p className="text-xs uppercase tracking-widest text-amber-300 font-mono">
                        {book.originalYear}
                      </p>
                      <h4 className="text-sm font-bold font-editorial leading-tight mt-1">
                        {book.titlePt}
                      </h4>
                      <p className="text-[11px] opacity-80 mt-1">{book.author}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Book Meta & Primary CTAs */}
            <div className="flex-1 text-center sm:text-left space-y-3 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <Award className="w-3.5 h-3.5" />
                <span>{rankingText}</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold font-editorial leading-tight">
                {book.titlePt}
              </h2>

              {book.subtitlePt && (
                <p className={`text-xs sm:text-sm font-editorial italic ${mutedText}`}>
                  {book.subtitlePt}
                </p>
              )}

              <p className="text-sm font-semibold">
                Por <span className="underline decoration-amber-500/50">{book.author}</span>
              </p>

              {/* Star Rating & Review Count */}
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 text-xs">
                <div className={`flex items-center ${starTextColor}`}>
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-bold ml-1 text-current">{hasRating ? rating : 'Novo'}</span>
                </div>
                <span className={mutedText}>•</span>
                <span className={mutedText}>
                  {hasRating
                    ? `(${reviewsCount} ${reviewsCount === 1 ? 'avaliação' : 'avaliações'})`
                    : '(Sem avaliações)'}
                </span>
                {book.category && (
                  <>
                    <span className={mutedText}>•</span>
                    <span className="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 font-medium text-[11px]">
                      {book.category}
                    </span>
                  </>
                )}
              </div>

              {/* Primary Action Buttons */}
              <div className="pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <button
                  onClick={() => {
                    onClose();
                    onStartReading(book.id);
                  }}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/25 transition-all transform hover:scale-[1.02] cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{hasStarted ? 'Continuar Leitura' : 'Iniciar Leitura'}</span>
                </button>

                {book.hasOriginalPdf && onOpenPdf && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenPdf(book.id);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-xs transition-colors cursor-pointer"
                    title="Baixar ou visualizar PDF original"
                  >
                    <Download className="w-4 h-4 text-rose-500" />
                    <span>Ver PDF</span>
                  </button>
                )}

                {onStartAudiobook && (
                  <button
                    onClick={() => {
                      onClose();
                      onStartAudiobook(book.id);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-xs transition-colors cursor-pointer"
                    title="Ouvir em Audiobook com síntese de voz inteligente"
                  >
                    <Headphones className="w-4 h-4 text-amber-500" />
                    <span>Audiobook</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid (Colunas Modernas) */}
        <div className="px-6 sm:px-10 py-5 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-black/5 dark:border-white/5">
          <div className={`p-3.5 rounded-2xl border flex flex-col items-center text-center ${cardSurfaceBg}`}>
            <Calendar className="w-4 h-4 text-amber-500 mb-1" />
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${mutedText}`}>
              Lançamento
            </span>
            <span className="text-sm font-bold font-mono mt-0.5">{book.originalYear}</span>
          </div>

          <div className={`p-3.5 rounded-2xl border flex flex-col items-center text-center ${cardSurfaceBg}`}>
            <FileText className="w-4 h-4 text-amber-500 mb-1" />
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${mutedText}`}>
              Estrutura
            </span>
            <span className="text-sm font-bold mt-0.5">
              {totalCh} cap. (~{estimatedPages}p)
            </span>
          </div>

          <div className={`p-3.5 rounded-2xl border flex flex-col items-center text-center ${cardSurfaceBg}`}>
            <Clock className="w-4 h-4 text-amber-500 mb-1" />
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${mutedText}`}>
              Duração
            </span>
            <span className="text-sm font-bold font-mono mt-0.5">
              ~{book.totalEstimatedMinutes} min
            </span>
          </div>

          <div className={`p-3.5 rounded-2xl border flex flex-col items-center text-center ${cardSurfaceBg}`}>
            <Award className="w-4 h-4 text-amber-500 mb-1" />
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${mutedText}`}>
              Progresso
            </span>
            <span className="text-sm font-bold mt-0.5">
              {isCompleted ? (
                <span className="text-emerald-500">100% Lido</span>
              ) : hasStarted ? (
                <span className="text-amber-500">{Math.round((readCount / totalCh) * 100)}%</span>
              ) : (
                'Novo'
              )}
            </span>
          </div>
        </div>

        {/* Tabs: Sobre a Obra / Sumário do Livro */}
        <div className="flex border-b border-black/5 dark:border-white/5 px-6 sm:px-10">
          <button
            onClick={() => setActiveTab('about')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'about'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            Sobre a Obra & Sinopse
          </button>
          <button
            onClick={() => setActiveTab('chapters')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'chapters'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Sumário ({totalCh})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:px-10 space-y-6 flex-1 overflow-y-auto">
          {activeTab === 'about' ? (
            <>
              {/* Synopsis Section */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider opacity-60">
                  Sinopse Editorial
                </h3>
                <p
                  className={`text-sm leading-relaxed ${
                    isSynopsisExpanded ? '' : 'line-clamp-3'
                  } ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
                >
                  {synopsisText}
                </p>
                <button
                  onClick={() => setIsSynopsisExpanded((prev) => !prev)}
                  className="text-xs font-bold text-amber-500 hover:underline cursor-pointer"
                >
                  {isSynopsisExpanded ? 'Ler menos' : 'Ler mais...'}
                </button>
              </div>

              {/* Author Profile Card */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${cardSurfaceBg}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-black text-sm flex items-center justify-center shrink-0 border-2 border-white/20">
                    {book.author
                      .split(' ')
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <h4 className="text-sm font-bold truncate">{book.author}</h4>
                    <p className={`text-xs ${mutedText} line-clamp-1`}>{authorBio}</p>
                    <p className={`text-[11px] ${mutedText}`}>
                      {authorFollowers} leitores seguidores
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsFollowingAuthor((prev) => !prev)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    isFollowingAuthor
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                      : 'border-black/15 dark:border-white/15 hover:border-amber-500 hover:text-amber-500'
                  }`}
                >
                  {isFollowingAuthor ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Seguindo</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Seguir</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            /* Chapters / Contents Table */
            <div className="space-y-2">
              <p className={`text-xs ${mutedText}`}>
                Selecione qualquer capítulo para pular direto e iniciar a leitura imediata:
              </p>
              <div className="divide-y divide-black/5 dark:divide-white/5 rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
                {Array.from({ length: totalCh }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onClose();
                      if (onSelectChapter) {
                        onSelectChapter(book.id, `chapter-${idx}`);
                      } else {
                        onStartReading(book.id);
                      }
                    }}
                    className="w-full p-3 sm:p-3.5 flex items-center justify-between gap-3 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-amber-500/15 text-amber-500 text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold truncate">
                        {idx === 0 ? 'Introdução e Visão Geral' : `Capítulo ${idx}`}
                      </span>
                    </div>
                    <ChevronRight className={`w-4 h-4 ${mutedText} shrink-0`} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
