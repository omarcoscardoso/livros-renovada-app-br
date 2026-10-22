import React from 'react';
import {
  X,
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
} from 'lucide-react';
import { BookSummary } from '../data/bookTypes';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: BookSummary[];
  activeBookId: string;
  onSelectBook: (bookId: string) => void;
  onOpenUpload: () => void;
  onOpenPdfForBook: (bookId: string) => void;
  onEditBook: (bookId: string) => void;
  onDeleteBook: (bookId: string) => void;
  onReprocessBook: (bookId: string) => void;
}

const COVER_STYLES: Record<string, string> = {
  amber: 'from-amber-600/30 via-amber-900/40 to-slate-900 border-amber-500/40 text-amber-300',
  emerald:
    'from-emerald-600/30 via-emerald-900/40 to-slate-900 border-emerald-500/40 text-emerald-300',
  blue: 'from-blue-600/30 via-blue-900/40 to-slate-900 border-blue-500/40 text-blue-300',
  rose: 'from-rose-600/30 via-rose-900/40 to-slate-900 border-rose-500/40 text-rose-300',
  violet:
    'from-violet-600/30 via-violet-900/40 to-slate-900 border-violet-500/40 text-violet-300',
};

export const LibraryModal: React.FC<LibraryModalProps> = ({
  isOpen,
  onClose,
  books,
  activeBookId,
  onSelectBook,
  onOpenUpload,
  onOpenPdfForBook,
  onEditBook,
  onDeleteBook,
  onReprocessBook,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-5xl max-h-[90vh] rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-800 bg-slate-900/95">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 font-display tracking-wide flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <span>Acervo & Estante Digital de Livros</span>
            </h2>
            <p className="text-xs text-slate-400">
              Selecione um livro para leitura estruturada ou envie um novo arquivo PDF para conversão automática.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                onClose();
                onOpenUpload();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm transition-colors shadow-lg shadow-amber-500/10"
            >
              <Upload className="w-4 h-4" />
              <span>Subir Novo Livro em PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Books Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {books.map((b) => {
              const isCurrent = b.id === activeBookId;
              const isDefault = b.id === 'cell-church-larry-stockstill';
              const isProcessing = b.status === 'processing';
              const coverClass = COVER_STYLES[b.coverColor] || COVER_STYLES.amber;

              return (
                <div
                  key={b.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                    isCurrent
                      ? 'bg-slate-800/90 border-amber-500/60 ring-1 ring-amber-500/30'
                      : 'bg-slate-800/40 border-slate-700/70 hover:border-slate-600'
                  }`}
                >
                  <div>
                    <div className="flex items-start gap-4">
                      {/* Stylized Book Spine/Cover */}
                      <div
                        className={`w-16 h-24 rounded-xl bg-gradient-to-br border flex flex-col items-center justify-center p-2 text-center shrink-0 shadow-md ${coverClass}`}
                      >
                        <BookOpen className="w-5 h-5 mb-1 opacity-90" />
                        <span className="text-[9px] font-bold uppercase tracking-tighter line-clamp-2 leading-tight">
                          {b.titlePt}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <CheckCircle2 className="w-3 h-3" /> Em leitura
                            </span>
                          )}
                          {isDefault && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-700 text-slate-300">
                              Obra Clássica Integral
                            </span>
                          )}
                          {isProcessing && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 animate-pulse">
                              <Loader2 className="w-3 h-3 animate-spin" /> Convertendo (
                              {b.conversionPercent ?? 10}%)
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-100 font-editorial leading-snug truncate">
                          {b.titlePt}
                        </h3>
                        {b.subtitlePt && (
                          <p className="text-xs text-slate-400 italic font-editorial line-clamp-1 mt-0.5">
                            {b.subtitlePt}
                          </p>
                        )}
                        <p className="text-xs text-slate-300 font-medium mt-1.5">
                          {b.author} • <span className="text-slate-400">{b.originalYear}</span>
                        </p>

                        <div className="flex items-center gap-4 mt-2.5 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-amber-400" />
                            {b.chapterCount} capítulos
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />~
                            {b.totalEstimatedMinutes} min de leitura
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Conversion Progress Status Bar */}
                    {isProcessing && (
                      <div className="mt-4 p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-2">
                        <div className="flex items-center justify-between text-xs text-amber-300">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Sparkles className="w-3.5 h-3.5 animate-spin" />
                            {b.conversionProgress || 'Convertendo capítulos...'}
                          </span>
                          <span className="font-mono font-bold">{b.conversionPercent ?? 10}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 transition-all duration-500"
                            style={{ width: `${Math.max(5, b.conversionPercent ?? 10)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        onSelectBook(b.id);
                        onClose();
                      }}
                      disabled={isProcessing}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{isCurrent ? 'Continuar Leitura' : 'Abrir no Leitor'}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {b.hasOriginalPdf && (
                        <button
                          onClick={() => onOpenPdfForBook(b.id)}
                          className="p-2 rounded-xl bg-slate-700/70 hover:bg-slate-700 text-rose-300 transition-colors"
                          title="Visualizar / Baixar PDF Original"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => onEditBook(b.id)}
                        className="p-2 rounded-xl bg-slate-700/70 hover:bg-slate-700 text-slate-200 transition-colors"
                        title="Editar metadados e capítulos"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {!isDefault && b.hasOriginalPdf && (
                        <button
                          onClick={() => onReprocessBook(b.id)}
                          disabled={isProcessing}
                          className="p-2 rounded-xl bg-slate-700/70 hover:bg-slate-700 text-amber-300 disabled:opacity-40 transition-colors"
                          title="Reprocessar PDF com Inteligência Artificial"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}

                      {!isDefault && (
                        <button
                          onClick={() => onDeleteBook(b.id)}
                          className="p-2 rounded-xl bg-slate-700/70 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Excluir livro da biblioteca"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
