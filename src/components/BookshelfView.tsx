import React, { useState } from 'react';
import {
  BookOpen,
  Upload,
  FileText,
  Trash2,
  Edit3,
  Clock,
  Layers,
  Loader2,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Search,
  Sun,
  Coffee,
  Moon,
  Library,
} from 'lucide-react';
import { BookSummary } from '../data/bookTypes';
import { ReaderTheme } from './Navbar';
import { ReadChaptersMap } from '../utils/readingProgressStorage';

interface BookshelfViewProps {
  books: BookSummary[];
  readChaptersMap: ReadChaptersMap;
  theme: ReaderTheme;
  onChangeTheme: (theme: ReaderTheme) => void;
  onSelectBook: (bookId: string) => void;
  onOpenUpload: () => void;
  onOpenPdfForBook: (bookId: string) => void;
  onEditBook: (bookId: string) => void;
  onDeleteBook: (bookId: string) => void;
  onReprocessBook: (bookId: string) => void;
}

const COVER_STYLES: Record<string, string> = {
  amber: 'from-amber-600 via-amber-800 to-slate-950 border-amber-500/40 text-amber-100',
  emerald: 'from-emerald-600 via-emerald-800 to-slate-950 border-emerald-500/40 text-emerald-100',
  blue: 'from-blue-600 via-blue-800 to-slate-950 border-blue-500/40 text-blue-100',
  rose: 'from-rose-600 via-rose-800 to-slate-950 border-rose-500/40 text-rose-100',
  violet: 'from-violet-600 via-violet-800 to-slate-950 border-violet-500/40 text-violet-100',
};

export const BookshelfView: React.FC<BookshelfViewProps> = ({
  books,
  readChaptersMap,
  theme,
  onChangeTheme,
  onSelectBook,
  onOpenUpload,
  onOpenPdfForBook,
  onEditBook,
  onDeleteBook,
  onReprocessBook,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const isDark = theme === 'dark';
  const isSepia = theme === 'sepia';

  const pageBg = isDark
    ? 'bg-[#0f141c] text-slate-100'
    : isSepia
    ? 'bg-[#f7f3e8] text-[#2c2217]'
    : 'bg-slate-50 text-slate-900';

  const headerBg = isDark
    ? 'bg-[#0d1117]/90 border-slate-800'
    : isSepia
    ? 'bg-[#efe8d5]/90 border-[#e3dac7]'
    : 'bg-white/90 border-slate-200';

  const cardBg = isDark
    ? 'bg-slate-900/90 border-slate-800 hover:border-amber-500/50'
    : isSepia
    ? 'bg-[#ece4d0]/80 border-[#dccfb4] hover:border-amber-700/50'
    : 'bg-white border-slate-200 hover:border-amber-500/60 shadow-sm';

  const mutedText = isDark
    ? 'text-slate-400'
    : isSepia
    ? 'text-[#705e4d]'
    : 'text-slate-500';

  const inputBg = isDark
    ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500'
    : isSepia
    ? 'bg-[#ece4d0] border-[#d8c7a7] text-[#2c2217] placeholder-[#8c7865]'
    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400';

  const pillActive = isDark
    ? 'bg-amber-500/20 text-amber-300 font-semibold'
    : isSepia
    ? 'bg-[#d8c7a7] text-[#2c2217] font-semibold'
    : 'bg-slate-900 text-white font-semibold';

  const pillInactive = isDark
    ? 'text-slate-400 hover:text-slate-200'
    : isSepia
    ? 'text-[#705e4d] hover:text-[#2c2217]'
    : 'text-slate-500 hover:text-slate-900';

  const filteredBooks = books.filter((b) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.titlePt.toLowerCase().includes(q) ||
      b.subtitlePt.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q)
    );
  });

  const totalReadChaptersAcrossLibrary = books.reduce((sum, b) => {
    const readForBook = readChaptersMap[b.id]?.length || 0;
    return sum + readForBook;
  }, 0);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${pageBg}`}>
      {/* Top Header Bar */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md px-4 sm:px-8 py-3.5 ${headerBg}`}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-xl font-bold font-display tracking-wide">
                Estante Virtual de Livros
              </h1>
              <p className={`text-xs ${mutedText} font-editorial`}>
                Biblioteca Digital & Conversor Inteligente de Livros em PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Selector */}
            <div className="flex items-center rounded-xl border border-black/10 dark:border-white/10 p-1">
              <button
                onClick={() => onChangeTheme('light')}
                className={`p-1.5 rounded-lg transition-colors ${
                  theme === 'light' ? pillActive : pillInactive
                }`}
                title="Modo Claro"
              >
                <Sun className="w-4 h-4" />
              </button>
              <button
                onClick={() => onChangeTheme('sepia')}
                className={`p-1.5 rounded-lg transition-colors ${
                  theme === 'sepia' ? pillActive : pillInactive
                }`}
                title="Modo Sépia (Pergaminho)"
              >
                <Coffee className="w-4 h-4" />
              </button>
              <button
                onClick={() => onChangeTheme('dark')}
                className={`p-1.5 rounded-lg transition-colors ${
                  theme === 'dark' ? pillActive : pillInactive
                }`}
                title="Modo Escuro"
              >
                <Moon className="w-4 h-4" />
              </button>
            </div>

            {/* Upload New PDF Button */}
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-amber-500/15 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Subir Novo Livro em PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
        {/* Hero Banner & Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-black/10 dark:border-white/10">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold font-editorial">
              Livros Disponíveis para Leitura e Estudo
            </h2>
            <p className={`text-xs sm:text-sm ${mutedText}`}>
              {books.length} {books.length === 1 ? 'livro disponível' : 'livros disponíveis'} na estante •{' '}
              {totalReadChaptersAcrossLibrary}{' '}
              {totalReadChaptersAcrossLibrary === 1
                ? 'capítulo marcado como lido'
                : 'capítulos marcados como lidos'}{' '}
              neste navegador
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar por título ou autor..."
              className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs sm:text-sm outline-none focus:border-amber-500 transition-colors ${inputBg}`}
            />
          </div>
        </div>

        {/* Bookshelf Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book) => {
            const isDefault = book.id === 'cell-church-larry-stockstill';
            const isProcessing = book.status === 'processing';
            const coverGradient = COVER_STYLES[book.coverColor] || COVER_STYLES.amber;

            const readForBook = readChaptersMap[book.id] || [];
            const readCount = readForBook.length;
            const totalCh = Math.max(1, book.chapterCount);
            const readPercent = Math.min(100, Math.round((readCount / totalCh) * 100));
            const isCompleted = readCount >= totalCh && totalCh > 0;

            return (
              <div
                key={book.id}
                className={`rounded-2xl border p-6 flex flex-col justify-between transition-all duration-200 ${cardBg}`}
              >
                <div>
                  {/* Book Cover + Header Info */}
                  <div className="flex items-start gap-4">
                    {/* 3D Stylized Book Cover */}
                    <button
                      onClick={() => !isProcessing && onSelectBook(book.id)}
                      disabled={isProcessing}
                      className={`w-24 h-36 rounded-xl bg-gradient-to-br border flex flex-col justify-between p-3 text-left shrink-0 shadow-xl transition-transform hover:scale-[1.03] cursor-pointer ${coverGradient}`}
                      title={`Abrir "${book.titlePt}"`}
                    >
                      <div className="flex items-center justify-between w-full opacity-80">
                        <BookOpen className="w-4 h-4" />
                        <span className="text-[9px] font-mono">{book.originalYear}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-bold font-display leading-tight line-clamp-3">
                          {book.titlePt}
                        </p>
                        <p className="text-[9px] opacity-80 truncate">{book.author}</p>
                      </div>
                    </button>

                    {/* Details */}
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Leitura Concluída
                          </span>
                        ) : readCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                            Em andamento ({readPercent}%)
                          </span>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border border-current/20 ${mutedText}`}>
                            Disponível
                          </span>
                        )}

                        {isProcessing && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-400 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" /> Convertendo
                          </span>
                        )}
                      </div>

                      <h3
                        onClick={() => !isProcessing && onSelectBook(book.id)}
                        className="text-lg font-bold font-editorial leading-snug cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition-colors line-clamp-2"
                      >
                        {book.titlePt}
                      </h3>

                      {book.subtitlePt && (
                        <p className={`text-xs italic font-editorial line-clamp-2 ${mutedText}`}>
                          {book.subtitlePt}
                        </p>
                      )}

                      <p className="text-xs font-semibold pt-0.5">
                        {book.author} <span className={`font-normal ${mutedText}`}>• {book.originalYear}</span>
                      </p>

                      <div className={`flex items-center gap-3 pt-1 text-[11px] ${mutedText}`}>
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-amber-500" />
                          {book.chapterCount} cap.
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />~
                          {book.totalEstimatedMinutes} min
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reading Progress Bar saved in browser */}
                  {!isProcessing && (
                    <div className="mt-5 pt-3 border-t border-black/5 dark:border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className={mutedText}>Progresso de leitura no navegador:</span>
                        <span className="font-mono font-semibold">
                          {readCount}/{book.chapterCount} lidos ({readPercent}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isCompleted ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${readPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Active Conversion Status */}
                  {isProcessing && (
                    <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-2">
                      <div className="flex items-center justify-between text-xs text-amber-300">
                        <span className="flex items-center gap-1.5 font-medium truncate">
                          <Sparkles className="w-3.5 h-3.5 animate-spin shrink-0" />
                          <span className="truncate">
                            {book.conversionProgress || 'Convertendo capítulos...'}
                          </span>
                        </span>
                        <span className="font-mono font-bold">{book.conversionPercent ?? 10}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 transition-all duration-500"
                          style={{ width: `${Math.max(5, book.conversionPercent ?? 10)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="mt-5 pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectBook(book.id)}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors shadow-sm cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>{readCount > 0 ? 'Continuar Leitura' : 'Ler Livro'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {book.hasOriginalPdf && (
                      <button
                        onClick={() => onOpenPdfForBook(book.id)}
                        className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-rose-500 dark:text-rose-400 transition-colors cursor-pointer"
                        title="Visualizar / Baixar PDF Original"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => onEditBook(book.id)}
                      className={`p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 ${mutedText} hover:text-current transition-colors cursor-pointer`}
                      title="Editar metadados e capítulos"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {!isDefault && book.hasOriginalPdf && (
                      <button
                        onClick={() => onReprocessBook(book.id)}
                        disabled={isProcessing}
                        className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-amber-500 disabled:opacity-40 transition-colors cursor-pointer"
                        title="Reprocessar PDF com IA"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    )}

                    {!isDefault && (
                      <button
                        onClick={() => onDeleteBook(book.id)}
                        className={`p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-rose-500/15 ${mutedText} hover:text-rose-500 transition-colors cursor-pointer`}
                        title="Excluir livro da estante"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add New Book Card on the Shelf */}
          <button
            onClick={onOpenUpload}
            className={`rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center gap-3 min-h-[260px] transition-all cursor-pointer ${
              isDark
                ? 'border-slate-800 hover:border-amber-500/50 bg-slate-900/30 hover:bg-slate-900/60'
                : isSepia
                ? 'border-[#d8c7a7] hover:border-amber-700/60 bg-[#ece4d0]/40 hover:bg-[#ece4d0]/80'
                : 'border-slate-300 hover:border-amber-500 bg-white/50 hover:bg-white'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-xs">
              <h3 className="text-base font-bold font-editorial">
                Adicionar Novo Livro em PDF
              </h3>
              <p className={`text-xs ${mutedText}`}>
                Envie um arquivo PDF para converter automaticamente em capítulos estruturados para leitura.
              </p>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
};
