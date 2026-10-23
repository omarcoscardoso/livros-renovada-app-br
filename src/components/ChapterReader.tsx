import React, { useState, useEffect } from 'react';
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
  Maximize2,
  Minimize2,
  Headphones,
  Sliders,
  Type,
  AlignLeft,
  X,
  Highlighter,
} from 'lucide-react';
import { AudiobookPlayer } from './AudiobookPlayer';

export type FontFamilyChoice = 'serif' | 'sans';
export type LineHeightChoice = 'normal' | 'relaxed' | 'loose';

interface ChapterReaderProps {
  book: BookInfo & { coverImageUrl?: string };
  chapter: Chapter;
  isCoverPage?: boolean;
  isFirstChapter?: boolean;
  totalChapters: number;
  bookTitle: string;
  bookAuthor: string;
  theme: ReaderTheme;
  onChangeTheme?: (theme: ReaderTheme) => void;
  fontSize: FontSize;
  onChangeFontSize?: (size: FontSize) => void;
  isRead: boolean;
  onToggleRead: () => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  onSelectChapter?: (chapterId: string) => void;
  hasPrev: boolean;
  hasNext: boolean;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
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
  onChangeTheme,
  fontSize,
  onChangeFontSize,
  isRead,
  onToggleRead,
  onPrevChapter,
  onNextChapter,
  onSelectChapter,
  hasPrev,
  hasNext,
  isFocusMode = false,
  onToggleFocusMode,
}) => {
  const [copied, setCopied] = useState(false);
  const [showBilingual, setShowBilingual] = useState(false);

  // Modern Reader Settings & Customization
  const [fontFamily, setFontFamily] = useState<FontFamilyChoice>(() => {
    try {
      const saved = localStorage.getItem('ipr_reader_font_family') as FontFamilyChoice;
      return saved === 'sans' ? 'sans' : 'serif';
    } catch {
      return 'serif';
    }
  });

  const [lineHeight, setLineHeight] = useState<LineHeightChoice>(() => {
    try {
      const saved = localStorage.getItem('ipr_reader_line_height') as LineHeightChoice;
      return saved === 'normal' || saved === 'loose' ? saved : 'relaxed';
    } catch {
      return 'relaxed';
    }
  });

  const [isAudiobookOpen, setIsAudiobookOpen] = useState(false);
  const [activeSpeakingParagraph, setActiveSpeakingParagraph] = useState<number | null>(null);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  const handleSetFontFamily = (fam: FontFamilyChoice) => {
    setFontFamily(fam);
    try {
      localStorage.setItem('ipr_reader_font_family', fam);
    } catch {}
  };

  const handleSetLineHeight = (lh: LineHeightChoice) => {
    setLineHeight(lh);
    try {
      localStorage.setItem('ipr_reader_line_height', lh);
    } catch {}
  };

  // Scroll tracking for ambient progress bar and HUD
  const [scrollPercent, setScrollPercent] = useState<number>(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const current = Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100));
        setScrollPercent(current);
      } else {
        setScrollPercent(0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [chapter.id]);

  // Keyboard shortcut listener: F or Esc for Zen Focus Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if ((e.key === 'f' || e.key === 'F') && onToggleFocusMode) {
        e.preventDefault();
        onToggleFocusMode();
      } else if (e.key === 'Escape' && isFocusMode && onToggleFocusMode) {
        e.preventDefault();
        onToggleFocusMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode, onToggleFocusMode]);

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

            {/* High-Res Extracted Book Cover Frame with 3D Spatial Aura */}
            {book.coverImageUrl ? (
              <div className="relative group py-2">
                {/* Antigravity Ambient Glow Halo */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-amber-500/25 via-amber-600/20 to-orange-500/25 rounded-3xl blur-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="relative w-64 sm:w-80 rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-500/40 bg-white transition-all duration-300 transform group-hover:scale-[1.02] group-hover:-translate-y-1">
                  <img
                    src={book.coverImageUrl}
                    alt={`Capa do livro ${book.titlePt}`}
                    className="w-full h-auto object-contain block"
                  />
                  {/* Realistic 3D Book Spine Shadow & Specular Gloss */}
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/40 via-white/20 to-transparent" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-white/10" />
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
      className={`min-h-screen py-10 sm:py-16 px-4 sm:px-8 lg:px-16 transition-colors duration-200 relative ${themeClasses}`}
    >
      {/* Ambient Scroll-Linked Reading Progress Bar (Antigravity HUD) */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-black/10 dark:bg-white/5 pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 transition-all duration-150 ease-out shadow-[0_0_10px_rgba(245,158,11,0.8)]"
          style={{ width: `${scrollPercent}%` }}
        />
      </div>

      {/* Floating Zen Focus Mode Exit Pill */}
      {isFocusMode && onToggleFocusMode && (
        <div className="fixed top-4 right-4 z-40 no-print animate-fade-in">
          <button
            onClick={onToggleFocusMode}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-xl border shadow-xl cursor-pointer transition-transform hover:scale-105 ${
              theme === 'dark'
                ? 'bg-slate-900/80 border-slate-700 text-slate-200 shadow-black/50'
                : theme === 'sepia'
                ? 'bg-[#ece4d0]/90 border-[#d8c7a7] text-[#2c2217] shadow-amber-950/10'
                : 'bg-white/90 border-slate-200 text-slate-800 shadow-slate-900/10'
            }`}
            title="Sair do Modo Foco (Esc ou F)"
          >
            <Minimize2 className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Sair do Modo Foco</span>
            <span className="text-[10px] opacity-60 font-mono px-1 rounded bg-black/5 dark:bg-white/10">Esc</span>
          </button>
        </div>
      )}

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
                ? chapter.titlePt.toLowerCase().includes('dedicat')
                  ? 'Dedicatória'
                  : chapter.titlePt.toLowerCase().includes('pref')
                  ? 'Prefácio'
                  : 'Introdução'
                : chapter.id?.startsWith('appendix') || chapter.titlePt.toLowerCase().startsWith('apêndice')
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
          {(() => {
            let runningParagraphIndex = 0;
            return chapter.sections.map((section, sIdx) => (
              <section key={section.id} className="space-y-6">
                <h2 className="text-lg sm:text-xl font-medium font-editorial tracking-normal pt-2 text-amber-700 dark:text-amber-400">
                  {section.titlePt}
                </h2>

                <div className={`space-y-5 ${fontFamily === 'sans' ? 'font-sans' : 'font-editorial'}`}>
                  {section.paragraphsPt.map((para, pIdx) => {
                    const enPara = section.paragraphsEn?.[pIdx];
                    const globalIdx = runningParagraphIndex++;
                    const isSpeaking = activeSpeakingParagraph === globalIdx;

                    const activeSpeechClass = isSpeaking
                      ? 'bg-amber-500/15 border-l-4 border-amber-500 pl-3 py-1.5 rounded-r-lg transition-all duration-300'
                      : '';

                    const customLineHeightClass =
                      lineHeight === 'loose'
                        ? 'leading-loose'
                        : lineHeight === 'normal'
                        ? 'leading-normal'
                        : 'leading-relaxed';

                    if (showBilingual && enPara) {
                      return (
                        <div
                          key={pIdx}
                          className={`grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border ${borderClass} ${activeSpeechClass}`}
                        >
                          <div>
                            <span className="block text-[10px] font-sans uppercase tracking-wider opacity-50 mb-1">
                              Português
                            </span>
                            <p className={`${paragraphFontClass} ${customLineHeightClass} text-justify`}>
                              {para}
                            </p>
                          </div>
                          <div>
                            <span className="block text-[10px] font-sans uppercase tracking-wider opacity-50 mb-1">
                              Original
                            </span>
                            <p className={`${paragraphFontClass} ${customLineHeightClass} text-justify opacity-80`}>
                              {enPara}
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <p
                        key={pIdx}
                        className={`${paragraphFontClass} ${customLineHeightClass} text-justify transition-colors ${activeSpeechClass} ${
                          sIdx === 0 && pIdx === 0 && fontFamily === 'serif'
                            ? 'first-letter:text-5xl first-letter:font-editorial first-letter:float-left first-letter:mr-3.5 first-letter:font-bold first-letter:leading-none first-letter:text-amber-600 dark:first-letter:text-amber-400 first-letter:pt-1'
                            : ''
                        }`}
                      >
                        {para}
                      </p>
                    );
                  })}
                </div>
              </section>
            ));
          })()}
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

      {/* Floating Glassmorphic Reading Dock (Antigravity HUD) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 no-print transition-all duration-300">
        <div
          className={`flex items-center gap-1.5 sm:gap-2.5 px-3 sm:px-4 py-2 rounded-full border shadow-2xl backdrop-blur-xl ${
            theme === 'dark'
              ? 'bg-slate-950/85 border-slate-800/80 text-slate-200 shadow-black/70'
              : theme === 'sepia'
              ? 'bg-[#ece4d0]/90 border-[#d8c7a7] text-[#2c2217] shadow-amber-950/15'
              : 'bg-white/90 border-slate-200 text-slate-800 shadow-slate-900/10'
          }`}
        >
          {/* Prev Chapter */}
          <button
            onClick={onPrevChapter}
            disabled={!hasPrev}
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
            title="Capítulo Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Chapter & Scroll Indicator */}
          <div className="flex items-center gap-1.5 px-2 text-xs font-mono font-medium border-x border-current/15">
            <span className="opacity-70">
              {chapter.number === 0 ? 'Intro' : `Cap. ${chapter.number}`}
            </span>
            <span className="opacity-30">•</span>
            <span className="text-amber-500 font-bold">{Math.round(scrollPercent)}%</span>
          </div>

          {/* Mark as Read Toggle */}
          <button
            onClick={onToggleRead}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              isRead
                ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40'
                : 'hover:bg-black/10 dark:hover:bg-white/10 opacity-80 hover:opacity-100'
            }`}
            title={isRead ? 'Capítulo concluído' : 'Marcar capítulo como concluído'}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 ${isRead ? 'text-emerald-500' : ''}`} />
            <span className="hidden sm:inline">{isRead ? 'Lido' : 'Concluir'}</span>
          </button>

          {/* Audiobook TTS Trigger */}
          <button
            onClick={() => setIsAudiobookOpen((prev) => !prev)}
            className={`p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer ${
              isAudiobookOpen ? 'text-amber-500 bg-amber-500/15' : 'opacity-80 hover:opacity-100'
            }`}
            title="Ouvir Audiobook com narração inteligente"
          >
            <Headphones className="w-3.5 h-3.5" />
          </button>

          {/* Typography & Reader Settings Trigger */}
          <button
            onClick={() => setShowSettingsPanel((prev) => !prev)}
            className={`p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer ${
              showSettingsPanel ? 'text-amber-500 bg-amber-500/15' : 'opacity-80 hover:opacity-100'
            }`}
            title="Configurações de Leitura (Fonte, Espaçamento, Temas)"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Focus Mode Toggle */}
          {onToggleFocusMode && (
            <button
              onClick={onToggleFocusMode}
              className={`p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                isFocusMode ? 'text-amber-500 bg-amber-500/15' : 'opacity-80 hover:opacity-100'
              }`}
              title={isFocusMode ? 'Sair do Modo Foco (Esc)' : 'Entrar no Modo Foco (F)'}
            >
              {isFocusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* AI Assistant Quick Trigger */}
          <button
            onClick={() => setShowAiPanel((prev) => !prev)}
            className={`p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer ${
              showAiPanel ? 'text-amber-500 bg-amber-500/15' : 'opacity-80 hover:opacity-100'
            }`}
            title="Assistente de Estudo IA"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          {/* Next Chapter */}
          <button
            onClick={onNextChapter}
            disabled={!hasNext}
            className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
            title="Próximo Capítulo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Reader Settings Popover */}
      {showSettingsPanel && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm p-4 rounded-3xl border shadow-2xl backdrop-blur-2xl bg-slate-950/90 dark:bg-slate-900/90 border-slate-800 text-slate-100 space-y-3.5 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Personalizar Leitor
            </h4>
            <button
              onClick={() => setShowSettingsPanel(false)}
              className="p-1 rounded-full hover:bg-white/10 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Font Family */}
          <div className="space-y-1.5">
            <span className="text-[11px] opacity-70 font-semibold">Tipografia:</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => handleSetFontFamily('serif')}
                className={`py-1.5 px-3 rounded-xl border text-center font-editorial transition-colors cursor-pointer ${
                  fontFamily === 'serif'
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                Editorial (Serif)
              </button>
              <button
                onClick={() => handleSetFontFamily('sans')}
                className={`py-1.5 px-3 rounded-xl border text-center font-sans transition-colors cursor-pointer ${
                  fontFamily === 'sans'
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                Moderna (Sans)
              </button>
            </div>
          </div>

          {/* Line Height */}
          <div className="space-y-1.5">
            <span className="text-[11px] opacity-70 font-semibold">Espaçamento entre Linhas:</span>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                onClick={() => handleSetLineHeight('normal')}
                className={`py-1 px-2 rounded-xl border text-center transition-colors cursor-pointer ${
                  lineHeight === 'normal'
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                Normal
              </button>
              <button
                onClick={() => handleSetLineHeight('relaxed')}
                className={`py-1 px-2 rounded-xl border text-center transition-colors cursor-pointer ${
                  lineHeight === 'relaxed'
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                Médio
              </button>
              <button
                onClick={() => handleSetLineHeight('loose')}
                className={`py-1 px-2 rounded-xl border text-center transition-colors cursor-pointer ${
                  lineHeight === 'loose'
                    ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                Amplo
              </button>
            </div>
          </div>

          {/* Font Size */}
          {onChangeFontSize && (
            <div className="space-y-1.5">
              <span className="text-[11px] opacity-70 font-semibold">Tamanho da Fonte:</span>
              <div className="grid grid-cols-4 gap-1 text-xs">
                {(['sm', 'base', 'lg', 'xl'] as FontSize[]).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => onChangeFontSize(sz)}
                    className={`py-1 rounded-xl border text-center uppercase font-mono transition-colors cursor-pointer ${
                      fontSize === sz
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Audiobook Player (TTS) */}
      {isAudiobookOpen && (
        <AudiobookPlayer
          paragraphs={chapter.sections ? chapter.sections.flatMap((s) => s.paragraphsPt) : []}
          bookTitle={bookTitle}
          chapterTitle={chapter.titlePt}
          theme={theme}
          onClose={() => {
            setIsAudiobookOpen(false);
            setActiveSpeakingParagraph(null);
          }}
          onParagraphChange={(idx) => setActiveSpeakingParagraph(idx)}
        />
      )}
    </article>
  );
};
