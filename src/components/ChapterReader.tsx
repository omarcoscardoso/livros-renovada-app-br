import React, { useState } from 'react';
import { Chapter } from '../data/bookTypes';
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
} from 'lucide-react';

interface ChapterReaderProps {
  chapter: Chapter;
  totalChapters: number;
  bookTitle: string;
  bookAuthor: string;
  theme: ReaderTheme;
  fontSize: FontSize;
  isRead: boolean;
  onToggleRead: () => void;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export const ChapterReader: React.FC<ChapterReaderProps> = ({
  chapter,
  totalChapters,
  bookTitle,
  bookAuthor,
  theme,
  fontSize,
  isRead,
  onToggleRead,
  onPrevChapter,
  onNextChapter,
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

  return (
    <article
      className={`min-h-screen py-10 sm:py-16 px-4 sm:px-8 lg:px-16 transition-colors duration-200 ${themeClasses}`}
    >
      <div className="max-w-3xl mx-auto space-y-10">
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
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors border ${
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
              hasPrev ? `${subtleTextClass} hover:text-current` : 'opacity-20 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Capítulo anterior</span>
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
              hasNext ? `${subtleTextClass} hover:text-current` : 'opacity-20 cursor-not-allowed'
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
