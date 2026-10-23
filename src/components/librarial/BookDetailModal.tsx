import React, { useState } from 'react';
import {
  X,
  Star,
  BookOpen,
  Headphones,
  Heart,
  Share2,
  Check,
  Calendar,
  FileText,
  Clock,
  Award,
  Sparkles,
  ChevronRight,
  ListOrdered,
  UserCheck,
  UserPlus,
  Loader2,
  Download,
} from 'lucide-react';
import { Book, LibrarialTheme } from '../../types/librarial';
import { generateStandaloneBookHtml } from '../../data/bookData';
import { generateBookPdf } from '../../utils/pdfGenerator';

interface BookDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  theme: LibrarialTheme;
  isFavorite: boolean;
  onToggleFavorite: (bookId: string) => void;
  onStartReading: (bookId: string) => void;
  onSelectChapter?: (bookId: string, chapterId: string) => void;
  onOpenPdf?: (bookId: string) => void;
  onStartAudiobook?: (bookId: string) => void;
  readCount: number;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
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
  const [activeMediaTab, setActiveMediaTab] = useState<'details' | 'contents'>('details');

  // Gemini AI Executive Summary generation state
  const [isGeneratingAiSummary, setIsGeneratingAiSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // Offline export states (SOP Phase 5)
  const [isExporting, setIsExporting] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<string | null>(null);

  const fetchFullBookAndChapters = async () => {
    const res = await fetch(`/api/books/${encodeURIComponent(book?.id || '')}`);
    if (!res.ok) throw new Error('Falha ao carregar capítulos da obra.');
    const data = await res.json();
    return data.book;
  };

  const handleExportHtml = async () => {
    setIsExporting(true);
    try {
      const fullBook = await fetchFullBookAndChapters();
      const html = generateStandaloneBookHtml(fullBook, fullBook.chapters || []);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (book?.titlePt || 'Livro')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_');
      a.download = `${safeName}_Livro_Completo.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar HTML:', err);
      alert('Não foi possível gerar o arquivo HTML standalone.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    setPdfProgress('Iniciando...');
    try {
      const fullBook = await fetchFullBookAndChapters();
      await generateBookPdf(fullBook, fullBook.chapters || [], (status) => {
        setPdfProgress(status.length > 18 ? status.slice(0, 16) + '...' : status);
      });
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      alert('Não foi possível diagramar o PDF do livro.');
    } finally {
      setIsExporting(false);
      setPdfProgress(null);
    }
  };

  if (!isOpen || !book) return null;

  const isDark = theme === 'dark' || theme === 'contrast';
  const isSepia = theme === 'sepia';

  const modalBg = isDark
    ? 'bg-[#121212] text-[#E0E0E0] border-neutral-800'
    : isSepia
    ? 'bg-[#FBF0D9] text-[#5F4B32] border-[#E8DCBF]'
    : 'bg-white text-slate-900 border-slate-200';

  const cardSurfaceBg = isDark
    ? 'bg-[#18181B] border-neutral-800'
    : isSepia
    ? 'bg-[#EFE4CC] border-[#DFD4BD]'
    : 'bg-slate-50 border-slate-200/80';

  const mutedText = isDark
    ? 'text-neutral-400'
    : isSepia
    ? 'text-[#705E4D]'
    : 'text-slate-500';

  const rating = book.rating || 4.9;
  const reviewsCount = book.reviewsCount || 184;
  const rankingText = book.rankingText || '#01 Recomendado';
  const totalCh = Math.max(1, book.chapterCount);
  const estimatedPages = book.pageCount || Math.round(totalCh * 18);
  const estimatedAudioMinutes = book.audioDurationMinutes || book.totalEstimatedMinutes || 145;
  const isCompleted = readCount >= totalCh;
  const hasStarted = readCount > 0;

  const authorBio =
    book.authorDetails?.bio ||
    `Autor respeitado internacionalmente, reconhecido por suas obras de discipulado, comunhão e impacto teológico global com ${book.author}.`;

  const synopsisText =
    book.synopsis ||
    book.translatorNote ||
    `Obra essencial de ${book.author}, explorando princípios bíblicos atemporais para liderança, comunhão estruturada e multiplicação orgânica. O texto traz fundamentos práticos de mentoria, cuidado e pastoreio eficaz para o contexto contemporâneo.`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: book.titlePt,
        text: `Confira o livro "${book.titlePt}" de ${book.author} no Livro App.`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const handleGenerateAiSummary = async () => {
    if (isGeneratingAiSummary) return;
    setIsGeneratingAiSummary(true);
    setAiSummary(null);

    try {
      const res = await fetch('/api/generate-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: book.titlePt,
          chapterNumber: 1,
          bookTitle: book.titlePt,
          bookAuthor: book.author,
          chapterSummary: synopsisText.slice(0, 500),
        }),
      });

      const data = await res.json();
      setAiSummary(
        data.lesson ||
          data.error ||
          'Resumo executivo gerado com sucesso para estudos e células.'
      );
    } catch {
      setAiSummary('Não foi possível conectar com o Gemini AI no momento.');
    } finally {
      setIsGeneratingAiSummary(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-y-auto backdrop-blur-md bg-black/65 transition-opacity animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-2xl min-h-screen sm:min-h-0 rounded-none sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col my-auto transition-all ${modalBg}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Backdrop Blur Hero */}
        <div className="relative pt-8 pb-6 px-6 sm:px-10 overflow-hidden border-b border-black/5 dark:border-white/5">
          {/* Ambient blurred backdrop from cover */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {book.coverImageUrl ? (
              <img
                src={book.coverImageUrl}
                alt=""
                className="w-full h-full object-cover blur-3xl opacity-30 scale-125 saturate-150 transform -translate-y-8"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#5C6BC0]/30 via-[#FF7A00]/20 to-transparent blur-3xl" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-current/5 to-current/20 opacity-30" />
          </div>

          {/* Top Bar: Close, Share, Favorite */}
          <div className="relative z-10 flex items-center justify-between mb-6">
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="p-2 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors cursor-pointer"
                title="Compartilhar"
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
                    ? 'bg-[#FF3B30]/20 text-[#FF3B30]'
                    : 'bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20'
                }`}
                title={isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
              >
                <Heart
                  className={`w-5 h-5 ${isFavorite ? 'fill-[#FF3B30] text-[#FF3B30]' : ''}`}
                />
              </button>
            </div>
          </div>

          {/* Centralized Book Cover & Title */}
          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
            <div className="relative group shrink-0">
              <div className="absolute -inset-2 bg-[#5C6BC0]/25 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-36 h-52 sm:w-40 sm:h-58 rounded-2xl overflow-hidden border shadow-2xl transition-transform duration-300 group-hover:scale-[1.02] bg-slate-900">
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
                  <div className="p-4 flex flex-col justify-between h-full bg-gradient-to-br from-[#5C6BC0] to-slate-900 text-white">
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

            {/* Book Meta & Primary Dual Actions */}
            <div className="flex-1 text-center sm:text-left space-y-2.5 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FF7A00]/15 text-[#FF7A00] border border-[#FF7A00]/30">
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
                Por <span className="underline decoration-[#5C6BC0]/50">{book.author}</span>
              </p>

              {/* Star Rating & Reviews */}
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1 text-xs">
                <div className="flex items-center text-[#FF7A00]">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-bold ml-1 text-current">{rating}</span>
                </div>
                <span className={mutedText}>•</span>
                <span className={mutedText}>({reviewsCount} avaliações)</span>
                {book.category && (
                  <>
                    <span className={mutedText}>•</span>
                    <span className="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 font-medium text-[11px]">
                      {book.category}
                    </span>
                  </>
                )}
              </div>

              {/* Dual Primary Actions */}
              <div className="pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                {/* Botão Primário Sólido (#5C6BC0) */}
                <button
                  onClick={() => {
                    onClose();
                    onStartReading(book.id);
                  }}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-[#5C6BC0] hover:bg-[#4D5AB5] text-white font-bold text-sm shadow-xl shadow-[#5C6BC0]/30 transition-all transform hover:scale-[1.02] cursor-pointer"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>{hasStarted ? 'Continuar Leitura' : 'Iniciar Leitura'}</span>
                </button>

                {/* Botão Secundário Outline */}
                {onStartAudiobook && (
                  <button
                    onClick={() => {
                      onClose();
                      onStartAudiobook(book.id);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl border-2 border-[#5C6BC0] text-[#5C6BC0] hover:bg-[#5C6BC0]/10 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Headphones className="w-4 h-4" />
                    <span>Ouvir Audiolivro</span>
                  </button>
                )}

                {book.hasOriginalPdf && onOpenPdf && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenPdf(book.id);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-black/15 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/5 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-rose-500" />
                    <span>Ver PDF</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Painel de Métricas em 4 Colunas */}
        <div className="px-6 sm:px-10 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-black/5 dark:border-white/5">
          <div className={`p-3 rounded-2xl border flex flex-col items-center text-center ${cardSurfaceBg}`}>
            <Calendar className="w-4 h-4 text-[#5C6BC0] mb-1" />
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${mutedText}`}>
              Ano / Edição
            </span>
            <span className="text-sm font-bold font-mono mt-0.5">{book.originalYear}</span>
          </div>

          <div className={`p-3 rounded-2xl border flex flex-col items-center text-center ${cardSurfaceBg}`}>
            <FileText className="w-4 h-4 text-[#5C6BC0] mb-1" />
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${mutedText}`}>
              Total de Páginas
            </span>
            <span className="text-sm font-bold mt-0.5">{estimatedPages} págs</span>
          </div>

          <div className={`p-3 rounded-2xl border flex flex-col items-center text-center ${cardSurfaceBg}`}>
            <Clock className="w-4 h-4 text-[#5C6BC0] mb-1" />
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${mutedText}`}>
              Duração do Áudio
            </span>
            <span className="text-sm font-bold font-mono mt-0.5">
              ~{estimatedAudioMinutes} min
            </span>
          </div>

          <div className={`p-3 rounded-2xl border flex flex-col items-center text-center ${cardSurfaceBg}`}>
            <Award className="w-4 h-4 text-[#FF7A00] mb-1" />
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${mutedText}`}>
              Classificação
            </span>
            <span className="text-sm font-bold mt-0.5 text-[#FF7A00]">
              ⭐ {rating}
            </span>
          </div>
        </div>

        {/* Media Switcher Tab Header */}
        <div className="flex border-b border-black/5 dark:border-white/5 px-6 sm:px-10">
          <button
            onClick={() => setActiveMediaTab('details')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeMediaTab === 'details'
                ? 'border-[#5C6BC0] text-[#5C6BC0]'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            Sobre a Obra & Sinopse
          </button>
          <button
            onClick={() => setActiveMediaTab('contents')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeMediaTab === 'contents'
                ? 'border-[#5C6BC0] text-[#5C6BC0]'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Sumário / Capítulos ({totalCh})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:px-10 space-y-5 flex-1 overflow-y-auto">
          {activeMediaTab === 'details' ? (
            <>
              {/* Sinopse & Gemini AI Executive Summary Trigger */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider opacity-60">
                    Sinopse
                  </h3>

                  <button
                    onClick={handleGenerateAiSummary}
                    disabled={isGeneratingAiSummary}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#5C6BC0]/15 text-[#5C6BC0] hover:bg-[#5C6BC0]/25 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingAiSummary ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Resumo Gemini AI</span>
                  </button>
                </div>

                <p
                  className={`text-sm leading-relaxed ${
                    isSynopsisExpanded ? '' : 'line-clamp-3'
                  } ${isDark ? 'text-neutral-300' : 'text-slate-700'}`}
                >
                  {synopsisText}
                </p>

                <button
                  onClick={() => setIsSynopsisExpanded((prev) => !prev)}
                  className="text-xs font-bold text-[#5C6BC0] hover:underline cursor-pointer"
                >
                  {isSynopsisExpanded ? 'Ler menos' : 'Ler mais...'}
                </button>

                {/* Gemini AI Response Box */}
                {aiSummary && (
                  <div className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2 bg-[#5C6BC0]/10 border-[#5C6BC0]/30`}>
                    <div className="flex items-center gap-1.5 text-[#5C6BC0] font-bold">
                      <Sparkles className="w-4 h-4" />
                      <span>Resumo Executivo para Célula & Pastoreio (Gemini AI):</span>
                    </div>
                    <p className="whitespace-pre-line">{aiSummary}</p>
                  </div>
                )}
              </div>

              {/* Author Profile Block */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${cardSurfaceBg}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#5C6BC0] to-indigo-400 text-white font-black text-sm flex items-center justify-center shrink-0 border-2 border-white/20">
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
                      14.200 leitores e líderes inscritos
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsFollowingAuthor((prev) => !prev)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    isFollowingAuthor
                      ? 'bg-[#5C6BC0] text-white border-[#5C6BC0] shadow-sm'
                      : 'border-black/15 dark:border-white/15 hover:border-[#5C6BC0] hover:text-[#5C6BC0]'
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

              {/* Formatos de Entrega & Exportação Offline (SOP Fase 5B e 5C) */}
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${cardSurfaceBg}`}
              >
                <div>
                  <h4 className="text-xs font-bold text-current">Formatos de Entrega Offline</h4>
                  <p className={`text-[11px] ${mutedText}`}>
                    Baixe o e-book completo em arquivo autônomo para leitura sem internet
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportHtml}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/15 dark:border-white/15 hover:border-[#5C6BC0] hover:text-[#5C6BC0] text-xs font-semibold transition-all cursor-pointer"
                    title="Baixar Livro em Arquivo Único HTML (.html) Standalone"
                  >
                    <Download className="w-3.5 h-3.5 text-[#5C6BC0]" />
                    <span>HTML Offline</span>
                  </button>

                  <button
                    onClick={handleExportPdf}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 hover:bg-amber-500/25 text-xs font-bold transition-all cursor-pointer"
                    title="Gerar e Baixar E-Book em PDF Real diagramado via jsPDF"
                  >
                    {isExporting && pdfProgress ? (
                      <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    <span>{pdfProgress || 'E-Book em PDF'}</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Sumário Interativo de Capítulos */
            <div className="space-y-2">
              <p className={`text-xs ${mutedText}`}>
                Selecione qualquer capítulo para abrir diretamente:
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
                      <span className="w-6 h-6 rounded-full bg-[#5C6BC0]/15 text-[#5C6BC0] text-xs font-bold flex items-center justify-center shrink-0">
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
