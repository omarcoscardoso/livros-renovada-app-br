import React, { useState } from 'react';
import { BookInfo, Chapter } from '../data/bookTypes';
import { ReaderTheme, FontSize } from './Navbar';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  Send,
  Loader2,
  BookOpenCheck,
  BookOpen,
} from 'lucide-react';

interface ChapterReaderProps {
  book: BookInfo & { coverImageUrl?: string };
  chapter: Chapter;
  isCoverPage?: boolean;
  isFirstChapter?: boolean;
  totalChapters: number;
  bookTitle: string;
  bookAuthor: string;
  theme: ReaderTheme;
  fontSize: FontSize;
  isRead: boolean;
  onToggleRead: () => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onSelectChapter?: (chapterId: string) => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export const ChapterReader: React.FC<ChapterReaderProps> = ({
  book,
  chapter,
  isCoverPage = false,
  isFirstChapter = false,
  totalChapters,
  bookTitle,
  bookAuthor,
  theme,
  fontSize,
  isRead,
  onToggleRead,
  onPrevChapter,
  onNextChapter,
  onSelectChapter,
  hasPrev,
  hasNext,
}) => {
  const [copied, setCopied] = useState(false);
  const [showBilingual, setShowBilingual] = useState(false);

  // AI Assistant & Cell Lesson Generator state
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const hasEnglishTranslation = chapter.sections.some(
    (s) => Array.isArray(s.paragraphsEn) && s.paragraphsEn.some((p) => p && p.trim().length > 0)
  );

  const fullChapterTextPt = chapter.sections
    .map((s) => `${s.titlePt}\n\n${s.paragraphsPt.join('\n\n')}`)
    .join('\n\n');

  const handleCopyChapter = () => {
    navigator.clipboard.writeText(
      `${chapter.titlePt}\n${chapter.subtitlePt || ''}\n\n${fullChapterTextPt}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAskAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || isAiLoading) return;
    setIsAiLoading(true);
    setAiResponse(null);
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          bookTitle,
          bookAuthor,
          chapterTitle: chapter.titlePt,
          contextText: fullChapterTextPt.slice(0, 2000),
        }),
      });
      const data = await res.json();
      setAiResponse(
        data.text ||
          data.fallbackResponse ||
          data.error ||
          'Não foi possível obter resposta da IA.'
      );
    } catch {
      setAiResponse('Erro de conexão ao consultar o assistente de IA.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleGenerateLesson = async () => {
    if (isAiLoading) return;
    setIsAiLoading(true);
    setAiResponse(null);
    setShowAiPanel(true);
    try {
      const res = await fetch('/api/generate-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: chapter.titlePt,
          chapterNumber: chapter.number,
          bookTitle,
          bookAuthor,
          chapterSummary: chapter.summaryPt,
        }),
      });
      const data = await res.json();
      setAiResponse(
        data.lesson ||
          data.error ||
          'Configure a chave GEMINI_API_KEY no modal "Subir PDF" para gerar roteiros de célula.'
      );
    } catch {
      setAiResponse('Erro ao gerar roteiro de reunião.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Theme styling
  const themeClasses = {
    dark: 'bg-[#0f141c] text-slate-200',
    sepia: 'bg-[#f7f3e8] text-[#2c2217]',
    light: 'bg-white text-slate-800',
  }[theme];

  const borderClass = {
    dark: 'border-slate-800',
    sepia: 'border-[#e3dac7]',
    light: 'border-slate-200',
  }[theme];

  const subtleTextClass = {
    dark: 'text-slate-400',
    sepia: 'text-[#705e4d]',
    light: 'text-slate-500',
  }[theme];

  const summaryBgClass = {
    dark: 'bg-slate-900/60 border-slate-800 text-slate-300',
    sepia: 'bg-[#ece4d0]/70 border-[#ded3be] text-[#3d3126]',
    light: 'bg-slate-50 border-slate-200 text-slate-700',
  }[theme];

  const paragraphFontClass = {
    sm: 'text-sm sm:text-base leading-relaxed',
    base: 'text-base sm:text-lg leading-relaxed sm:leading-8',
    lg: 'text-lg sm:text-xl leading-relaxed sm:leading-9',
    xl: 'text-xl sm:text-2xl leading-relaxed sm:leading-10',
  }[fontSize];

  // ==========================================================
  // DEDICATED FIRST PAGE BEFORE INTRODUCTION: BOOK COVER VIEW
  // ==========================================================
  if (isCoverPage) {
    const firstChapterTitle = book.chapters?.[0]?.titlePt || 'Introdução';

    return (
      <article
        className={`min-h-screen py-10 sm:py-16 px-4 sm:px-8 lg:px-16 transition-colors duration-200 ${themeClasses}`}
      >
        <div className="max-w-3xl mx-auto space-y-10">
          <div className="flex flex-col items-center text-center space-y-8 py-4">
            <span
              className={`uppercase tracking-widest font-mono text-[11px] px-3 py-1 rounded-full border ${borderClass} ${subtleTextClass}`}
            >
              Capa Original & Folha de Rosto • Edição Digital
            </span>

            {/* High-Res Extracted Book Cover Frame */}
            {book.coverImageUrl ? (
              <div className="relative group">
                <div className="relative w-64 sm:w-80 rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-500/30 bg-white transition-transform duration-300 hover:scale-[1.01]">
                  <img
                    src={book.coverImageUrl}
                    alt={`Capa do livro ${book.titlePt}`}
                    className="w-full h-auto object-contain block"
                  />
                  {/* Subtle 3D Book Spine Shadow */}
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/30 via-white/15 to-transparent" />
                </div>
              </div>
            ) : (
              <div className="w-64 sm:w-72 h-96 rounded-2xl bg-gradient-to-br from-amber-700 via-amber-900 to-slate-950 border border-amber-500/40 shadow-2xl flex flex-col items-center justify-center p-6 text-amber-100">
                <BookOpen className="w-12 h-12 mb-4 opacity-80" />
                <h2 className="text-xl font-bold font-display">{book.titlePt}</h2>
                <p className="text-xs opacity-80 mt-2">{book.author}</p>
              </div>
            )}

            {/* Editorial Title & Metadata */}
            <div className="space-y-3 max-w-xl">
              <h1 className="text-3xl sm:text-5xl font-bold font-display tracking-tight leading-tight">
                {book.titlePt}
              </h1>
              {book.subtitlePt && (
                <p className={`text-lg sm:text-xl font-editorial italic ${subtleTextClass}`}>
                  {book.subtitlePt}
                </p>
              )}
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-sm font-medium">
                <span>Por {book.author}</span>
                <span>•</span>
                <span className={subtleTextClass}>{book.originalYear}</span>
                {book.publisher && (
                  <>
                    <span>•</span>
                    <span className={subtleTextClass}>{book.publisher}</span>
                  </>
                )}
              </div>
            </div>

            {/* Translator / Edition Note */}
            {book.translatorNote && (
              <div
                className={`max-w-xl p-5 rounded-2xl border text-xs sm:text-sm font-editorial italic leading-relaxed ${summaryBgClass}`}
              >
                {book.translatorNote}
              </div>
            )}

            {/* Call to action: Start Reading First Chapter (Introduction) */}
            <div className="pt-2">
              <button
                onClick={onNextChapter}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm sm:text-base transition-all shadow-xl shadow-amber-500/20 cursor-pointer"
              >
                <BookOpen className="w-5 h-5" />
                <span>Iniciar Leitura: {firstChapterTitle}</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Footer Navigation */}
          <footer
            className={`pt-10 border-t ${borderClass} flex items-center justify-between no-print`}
          >
            <span className={`text-xs font-mono ${subtleTextClass}`}>Capa do Livro</span>

            <button
              onClick={onNextChapter}
              className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-opacity ${subtleTextClass} hover:text-current cursor-pointer`}
            >
              <span>Avançar para {firstChapterTitle}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </footer>
        </div>
      </article>
    );
  }

  return (
    <article
      className={`min-h-screen py-10 sm:py-16 px-4 sm:px-8 lg:px-16 transition-colors duration-200 ${themeClasses}`}
    >
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Book Cover Showcase before the Introduction (on the first chapter) */}
        {isFirstChapter && book.coverImageUrl && (
          <div
            className={`p-5 sm:p-6 rounded-2xl border ${summaryBgClass} flex flex-col sm:flex-row items-center gap-6`}
          >
            <div
              onClick={() => onSelectChapter && onSelectChapter('__cover__')}
              className="relative w-28 sm:w-32 rounded-xl overflow-hidden shadow-lg border border-amber-500/30 bg-white shrink-0 cursor-pointer transition-transform hover:scale-[1.02]"
              title="Clique para ver a Capa e Folha de Rosto em tela inteira"
            >
              <img
                src={book.coverImageUrl}
                alt={`Capa de ${book.titlePt}`}
                className="w-full h-auto object-contain block"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/30 to-transparent" />
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-600 dark:text-amber-400 font-bold">
                Obra em Leitura
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-display leading-snug">
                {book.titlePt}
              </h2>
              {book.subtitlePt && (
                <p className={`text-xs sm:text-sm font-editorial italic ${subtleTextClass}`}>
                  {book.subtitlePt}
                </p>
              )}
              <p className="text-xs font-medium">
                {book.author} ({book.originalYear})
              </p>
              {onSelectChapter && (
                <button
                  type="button"
                  onClick={() => onSelectChapter('__cover__')}
                  className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 hover:underline pt-1 font-medium cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Ver Capa em Tamanho Grande & Folha de Rosto</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <header className={`space-y-4 border-b pb-8 ${borderClass}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className={`uppercase tracking-widest font-mono text-[11px] ${subtleTextClass}`}>
              {chapter.number === 0
                ? 'Apresentação'
                : chapter.number === 12 && totalChapters === 13
                ? 'Apêndice'
                : `Capítulo ${chapter.number}`}{' '}
              • Pág. {chapter.pages}
            </span>

            <div className="flex items-center gap-2">
              {hasEnglishTranslation && (
                <button
                  onClick={() => setShowBilingual((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors border ${
                    showBilingual
                      ? 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-semibold'
                      : `border-transparent hover:border-current ${subtleTextClass}`
                  }`}
                  title="Alternar leitura bilíngue (Português / Original)"
                >
                  {showBilingual ? 'Bilíngue (PT/EN)' : 'Apenas PT-BR'}
                </button>
              )}

              <button
                onClick={onToggleRead}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors border cursor-pointer ${
                  isRead
                    ? 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10'
                    : `border-transparent hover:border-current ${subtleTextClass}`
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isRead ? 'Concluído' : 'Marcar como lido'}</span>
              </button>

              <button
                onClick={handleCopyChapter}
                className={`p-1.5 rounded-lg text-xs transition-colors ${subtleTextClass} hover:text-current`}
                title="Copiar texto do capítulo"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl font-normal tracking-tight font-editorial leading-tight">
            {chapter.titlePt}
          </h1>

          {chapter.subtitlePt && (
            <p className={`text-base sm:text-lg font-editorial italic ${subtleTextClass}`}>
              {chapter.subtitlePt}
            </p>
          )}
        </header>

        {/* Minimal Chapter Summary */}
        <div
          className={`p-4 sm:p-5 rounded-xl border text-sm sm:text-base font-editorial leading-relaxed italic ${summaryBgClass}`}
        >
          "{chapter.summaryPt}"
        </div>

        {/* Body Sections */}
        <div className="space-y-12">
          {chapter.sections.map((section, sIdx) => (
            <section key={section.id} className="space-y-6">
              <h2 className="text-lg sm:text-xl font-medium font-editorial tracking-normal pt-2 text-amber-700 dark:text-amber-400">
                {section.titlePt}
              </h2>

              <div className="space-y-5 font-editorial">
                {section.paragraphsPt.map((para, pIdx) => {
                  const enPara = section.paragraphsEn?.[pIdx];
                  if (showBilingual && enPara) {
                    return (
                      <div
                        key={pIdx}
                        className={`grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border ${borderClass}`}
                      >
                        <div>
                          <span className="block text-[10px] font-sans uppercase tracking-wider opacity-50 mb-1">
                            Português
                          </span>
                          <p className={`${paragraphFontClass} text-justify`}>{para}</p>
                        </div>
                        <div>
                          <span className="block text-[10px] font-sans uppercase tracking-wider opacity-50 mb-1">
                            Original
                          </span>
                          <p className={`${paragraphFontClass} text-justify opacity-80`}>
                            {enPara}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <p
                      key={pIdx}
                      className={`${paragraphFontClass} text-justify ${
                        sIdx === 0 && pIdx === 0
                          ? 'first-letter:text-4xl first-letter:font-editorial first-letter:float-left first-letter:mr-2.5 first-letter:leading-none first-letter:text-amber-700 dark:first-letter:text-amber-400'
                          : ''
                      }`}
                    >
                      {para}
                    </p>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Perguntas de Reflexão da Liderança */}
        {chapter.studyQuestionsPt && chapter.studyQuestionsPt.length > 0 && (
          <div className={`p-6 rounded-xl border ${summaryBgClass} space-y-3`}>
            <h3 className="text-sm font-semibold font-editorial text-amber-700 dark:text-amber-400">
              Perguntas para Reflexão da Liderança:
            </h3>
            <ol className="list-decimal pl-5 space-y-2 text-xs sm:text-sm font-editorial">
              {chapter.studyQuestionsPt.map((q, idx) => (
                <li key={idx} className="leading-relaxed">
                  {q}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* AI Study Assistant & 90-Minute Cell Lesson Generator */}
        <div className={`p-5 rounded-xl border ${summaryBgClass} no-print space-y-4`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs sm:text-sm font-semibold font-editorial">
                Mentor de Estudo IA & Roteiro de Célula
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateLesson}
                disabled={isAiLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
              >
                <BookOpenCheck className="w-3.5 h-3.5" />
                <span>Gerar Roteiro de Célula (90 min)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAiPanel((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded-lg text-xs border ${borderClass}`}
              >
                {showAiPanel ? 'Ocultar' : 'Fazer Pergunta'}
              </button>
            </div>
          </div>

          {showAiPanel && (
            <div className="space-y-3 pt-2">
              <form onSubmit={handleAskAssistant} className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={`Pergunte sobre "${chapter.titlePt}"...`}
                  className={`flex-1 px-3 py-2 rounded-lg border ${borderClass} bg-transparent text-xs sm:text-sm outline-none`}
                />
                <button
                  type="submit"
                  disabled={isAiLoading || !aiPrompt.trim()}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                >
                  {isAiLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Perguntar</span>
                </button>
              </form>

              {isAiLoading && (
                <div className="flex items-center gap-2 text-xs py-3 opacity-75">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  <span>Elaborando resposta pastoral e teológica...</span>
                </div>
              )}

              {aiResponse && (
                <div
                  className={`p-4 rounded-xl border ${borderClass} text-xs sm:text-sm font-editorial whitespace-pre-wrap leading-relaxed`}
                >
                  {aiResponse}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Minimal Chapter Footer */}
        <footer
          className={`pt-10 border-t ${borderClass} flex items-center justify-between no-print`}
        >
          <button
            onClick={onPrevChapter}
            disabled={!hasPrev}
            className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-opacity ${
              hasPrev ? `${subtleTextClass} hover:text-current cursor-pointer` : 'opacity-20 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{isFirstChapter ? 'Capa do Livro' : 'Capítulo anterior'}</span>
          </button>

          <span className={`text-xs font-mono ${subtleTextClass}`}>
            {chapter.number === 0
              ? 'Intro'
              : chapter.number === 12 && totalChapters === 13
              ? 'Apêndice'
              : `Cap. ${chapter.number}`}
          </span>

          <button
            onClick={onNextChapter}
            disabled={!hasNext}
            className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium transition-opacity ${
              hasNext ? `${subtleTextClass} hover:text-current cursor-pointer` : 'opacity-20 cursor-not-allowed'
            }`}
          >
            <span>Próximo capítulo</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </footer>
      </div>
    </article>
  );
};
