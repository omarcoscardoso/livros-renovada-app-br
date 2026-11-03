import React, { useMemo } from 'react';
import {
  Search,
  Star,
  Upload,
  BookOpen,
  Check,
  RefreshCw,
  AlertCircle,
  FileText,
  Edit2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { BookSummary } from '../../../../data/bookTypes';
import { ReaderTheme } from '../../../Navbar';

export interface LibraryTabProps {
  books: BookSummary[];
  bookSearch: string;
  setBookSearch: (search: string) => void;
  bookStatusFilter: 'all' | 'ready' | 'processing' | 'error' | 'featured';
  setBookStatusFilter: (filter: 'all' | 'ready' | 'processing' | 'error' | 'featured') => void;
  togglingFeaturedId: string | null;
  reprocessingBookId: string | null;
  onToggleBookFeatured: (bookId: string, currentFeatured: boolean) => void;
  onExecuteReprocess: (bookId: string) => void;
  onOpenUpload?: () => void;
  onOpenPdfForBook?: (bookId: string) => void;
  onEditBook?: (bookId: string) => void;
  onDeleteBook?: (bookId: string) => void;
  theme?: ReaderTheme;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({
  books,
  bookSearch,
  setBookSearch,
  bookStatusFilter,
  setBookStatusFilter,
  togglingFeaturedId,
  reprocessingBookId,
  onToggleBookFeatured,
  onExecuteReprocess,
  onOpenUpload,
  onOpenPdfForBook,
  onEditBook,
  onDeleteBook,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const q = bookSearch.toLowerCase();
      const matchesSearch =
        !q ||
        b.titlePt.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        (b.subtitlePt && b.subtitlePt.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (bookStatusFilter === 'all') return true;
      if (bookStatusFilter === 'ready') return b.status === 'ready';
      if (bookStatusFilter === 'processing') return b.status === 'processing';
      if (bookStatusFilter === 'error') return b.status === 'error';
      if (bookStatusFilter === 'featured') return Boolean(b.isFeatured);

      return true;
    });
  }, [books, bookSearch, bookStatusFilter]);

  return (
    <div className="space-y-6">
      {/* Library Search & Filter Bar */}
      <div
        className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-800'
        }`}
      >
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por título ou autor..."
            value={bookSearch}
            onChange={(e) => setBookSearch(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                : 'bg-slate-900/80 border-slate-700 text-slate-100 placeholder-slate-500'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setBookStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              bookStatusFilter === 'all'
                ? 'bg-blue-600 text-white'
                : isLight
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Todos ({books.length})
          </button>
          <button
            onClick={() => setBookStatusFilter('ready')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              bookStatusFilter === 'ready'
                ? 'bg-emerald-600 text-white'
                : isLight
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Prontos ({books.filter((b) => b.status === 'ready').length})
          </button>
          <button
            onClick={() => setBookStatusFilter('featured')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1 cursor-pointer ${
              bookStatusFilter === 'featured'
                ? 'bg-amber-600 text-white'
                : isLight
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Star className="w-3 h-3 fill-current" />
            <span>Destaques ({books.filter((b) => b.isFeatured).length})</span>
          </button>

          {onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs shadow transition-all flex items-center space-x-1.5 ml-auto cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Enviar Livro</span>
            </button>
          )}
        </div>
      </div>

      {/* Books Table */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-800'
        }`}
      >
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span>Obras Literárias ({filteredBooks.length} encontradas)</span>
          </h2>
        </div>

        {filteredBooks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr
                  className={`text-[11px] font-bold uppercase tracking-wider border-b ${
                    isLight
                      ? 'bg-slate-50 text-slate-500 border-slate-200'
                      : 'bg-slate-900/60 text-slate-400 border-slate-700/50'
                  }`}
                >
                  <th className="py-3 px-4">Obra / Autor</th>
                  <th className="py-3 px-4">Ano</th>
                  <th className="py-3 px-4">Capítulos / Págs</th>
                  <th className="py-3 px-4">Status & Destaque</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {filteredBooks.map((book) => {
                  const isReady = book.status === 'ready';
                  const isProcessing = book.status === 'processing';
                  const isError = book.status === 'error';

                  return (
                    <tr
                      key={book.id}
                      className={`transition-colors ${
                        isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-900/30'
                      }`}
                    >
                      {/* Book Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          {book.coverImageUrl ? (
                            <img
                              src={book.coverImageUrl}
                              alt={book.titlePt}
                              className="w-10 h-14 object-cover rounded shadow-sm border border-slate-700 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-14 bg-slate-800 rounded flex items-center justify-center text-slate-500 flex-shrink-0">
                              <BookOpen className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-sm line-clamp-1">{book.titlePt}</div>
                            <div className="text-xs text-slate-400 line-clamp-1">{book.author}</div>
                            {book.subtitlePt && (
                              <div className="text-[11px] text-slate-500 italic line-clamp-1">
                                {book.subtitlePt}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Year */}
                      <td className="py-3.5 px-4 text-slate-400 text-xs">
                        {book.originalYear || '—'}
                      </td>

                      {/* Chapters & Pages */}
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-medium">
                          {book.chapterCount ? `${book.chapterCount} capítulos` : 'Sem capítulos'}
                        </div>
                        <div className="text-slate-400">
                          {book.pageCount ? `${book.pageCount} págs` : 'PDF'}
                        </div>
                      </td>

                      {/* Status & Featured Star */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-2">
                          {isReady && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <Check className="w-3 h-3" />
                              <span>Pronto</span>
                            </span>
                          )}
                          {isProcessing && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 animate-pulse">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Processando</span>
                            </span>
                          )}
                          {isError && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <AlertCircle className="w-3 h-3" />
                              <span>Erro</span>
                            </span>
                          )}

                          {/* Featured Toggle Star */}
                          <button
                            onClick={() => onToggleBookFeatured(book.id, Boolean(book.isFeatured))}
                            className={`p-1 rounded-lg transition-colors cursor-pointer ${
                              book.isFeatured
                                ? 'text-amber-400 hover:text-amber-300'
                                : 'text-slate-500 hover:text-amber-400'
                            }`}
                            title={book.isFeatured ? 'Remover destaque' : 'Marcar como destaque editorial'}
                          >
                            <Star
                              className={`w-4 h-4 ${book.isFeatured ? 'fill-current' : ''} ${
                                togglingFeaturedId === book.id ? 'animate-spin' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Open PDF */}
                          {onOpenPdfForBook && (
                            <button
                              onClick={() => onOpenPdfForBook(book.id)}
                              className={`p-2 rounded-lg border text-indigo-400 transition-colors cursor-pointer ${
                                isLight
                                  ? 'bg-slate-50 border-slate-200 hover:bg-indigo-50'
                                  : 'bg-slate-900 border-slate-800 hover:bg-indigo-950/40'
                              }`}
                              title="Visualizar PDF original"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit Chapters */}
                          {onEditBook && (
                            <button
                              onClick={() => onEditBook(book.id)}
                              className={`p-2 rounded-lg border text-blue-400 transition-colors cursor-pointer ${
                                isLight
                                  ? 'bg-slate-50 border-slate-200 hover:bg-blue-50'
                                  : 'bg-slate-900 border-slate-800 hover:bg-blue-950/40'
                              }`}
                              title="Editar metadados e capítulos"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {/* Reprocess AI */}
                          <button
                            onClick={() => onExecuteReprocess(book.id)}
                            disabled={reprocessingBookId === book.id || isProcessing}
                            className={`p-2 rounded-lg border text-purple-400 transition-colors cursor-pointer ${
                              isLight
                                ? 'bg-slate-50 border-slate-200 hover:bg-purple-50'
                                : 'bg-slate-900 border-slate-800 hover:bg-purple-950/40'
                            } disabled:opacity-50`}
                            title="Reprocessar capítulos com IA Gemini"
                          >
                            <Sparkles
                              className={`w-4 h-4 ${reprocessingBookId === book.id ? 'animate-spin' : ''}`}
                            />
                          </button>

                          {/* Delete */}
                          {onDeleteBook && (
                            <button
                              onClick={() => onDeleteBook(book.id)}
                              className={`p-2 rounded-lg border text-rose-400 transition-colors cursor-pointer ${
                                isLight
                                  ? 'bg-slate-50 border-slate-200 hover:bg-rose-50'
                                  : 'bg-slate-900 border-slate-800 hover:bg-rose-950/40'
                              }`}
                              title="Excluir livro da estante"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-slate-400 mb-3" />
            <h3 className="text-base font-semibold">Nenhum livro encontrado</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
              Ajuste os filtros de pesquisa ou envie um novo arquivo PDF para processamento inteligente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
