import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  CheckCircle2,
  FileDown,
  Loader2,
  X,
  Library,
  Upload,
  Edit3,
} from 'lucide-react';
import { generateStandaloneBookHtml } from '../data/bookData';
import { BookInfo, Chapter } from '../data/bookTypes';
import { generateBookPdf } from '../utils/pdfGenerator';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  book: BookInfo;
  chapters: Chapter[];
  currentChapterId: string;
  onSelectChapter: (chapterId: string) => void;
  onToggleChapterRead?: (chapterId: string) => void;
  onOpenSearch: () => void;
  onOpenPdf: () => void;
  onOpenLibrary: () => void;
  onOpenUpload: () => void;
  onOpenEditor: () => void;
  readChapters: string[];
  isOpen: boolean;
  onClose: () => void;
  totalBooksCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  book,
  chapters,
  currentChapterId,
  onSelectChapter,
  onToggleChapterRead,
  onOpenSearch,
  onOpenLibrary,
  onOpenUpload,
  onOpenEditor,
  readChapters,
  isOpen,
  onClose,
  totalBooksCount,
}) => {
  const { user, openLoginModal } = useAuth();
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [pdfProgress, setPdfProgress] = useState('');

  const handleEditWithAuth = () => {
    if (!user) {
      openLoginModal('Faça login com sua conta Google para editar os capítulos e metadados deste livro.');
      return;
    }
    onOpenEditor();
    onClose();
  };

  const handleUploadWithAuth = () => {
    if (!user) {
      openLoginModal('Faça login com sua conta Google para adicionar novos livros em PDF.');
      return;
    }
    onOpenUpload();
    onClose();
  };

  const downloadSingleHtml = () => {
    const html = generateStandaloneBookHtml(book, chapters);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = book.titlePt
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_');
    a.download = `${safeName}_Livro_Completo.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    if (isPdfGenerating) return;
    setIsPdfGenerating(true);
    setPdfProgress('Preparando páginas...');
    try {
      await generateBookPdf(book, chapters, (status) => {
        setPdfProgress(status);
      });
    } catch (err) {
      console.error(err);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setIsPdfGenerating(false);
      setPdfProgress('');
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header: Current Book Info + Edit button */}
        <div className="p-4 border-b border-slate-800 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-0.5">
              <span>Livro em Leitura</span>
            </div>
            <h1
              className="text-sm font-semibold text-slate-100 font-display tracking-wide truncate"
              title={book.titlePt}
            >
              {book.titlePt}
            </h1>
            <p className="text-[11px] text-slate-400 font-editorial truncate">
              {book.author} • {book.originalYear}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleEditWithAuth}
              className="p-1.5 rounded-md text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Editar metadados e capítulos deste livro"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-200 lg:hidden cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Library & PDF Upload Quick Actions */}
        <div className="p-3 border-b border-slate-800/60 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onOpenLibrary();
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700 cursor-pointer"
            >
              <Library className="w-3.5 h-3.5 text-[#5C6BC0] shrink-0" />
              <span className="truncate">Lumi ({totalBooksCount})</span>
            </button>

            <button
              onClick={handleUploadWithAuth}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold transition-colors border border-emerald-500/30 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Subir PDF</span>
            </button>
          </div>

          <button
            onClick={() => {
              onOpenSearch();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-400 text-xs transition-colors"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Buscar no livro...</span>
            </span>
            <kbd className="px-1.5 py-0.2 rounded bg-slate-700 text-[10px] text-slate-300 font-mono">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Chapters List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>Sumário</span>
            <span>
              {readChapters.length}/{chapters.length} lidos
            </span>
          </div>

          {/* First Page before Introduction: Book Cover */}
          <button
            onClick={() => {
              onSelectChapter('__cover__');
              onClose();
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-2.5 mb-1 ${
              currentChapterId === '__cover__'
                ? 'bg-amber-500/15 text-amber-300 font-semibold'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
            }`}
          >
            <div className="shrink-0 p-0.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="truncate flex-1">Capa & Folha de Rosto</div>
          </button>

          {chapters.map((ch, idx) => {
            const isActive = ch.id === currentChapterId;
            const isRead = readChapters.includes(ch.id);

            return (
              <button
                key={ch.id}
                onClick={() => {
                  onSelectChapter(ch.id);
                  onClose();
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center gap-2.5 ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
                }`}
              >
                <div
                  onClick={(e) => {
                    if (onToggleChapterRead) {
                      e.stopPropagation();
                      onToggleChapterRead(ch.id);
                    }
                  }}
                  title={isRead ? 'Capítulo lido (clique para desmarcar)' : 'Clique para marcar capítulo como lido'}
                  className="shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {isRead ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <span className="text-[10px] text-slate-500 w-3.5 inline-block text-center font-mono">
                      {ch.number === 0
                        ? ch.id === 'dedication'
                          ? 'D'
                          : ch.id === 'preface'
                          ? 'P'
                          : 'I'
                        : ch.id?.startsWith('appendix')
                        ? 'A'
                        : ch.number || idx + 1}
                    </span>
                  )}
                </div>

                <div className="truncate flex-1">{ch.titlePt}</div>
              </button>
            );
          })}
        </div>

        {/* Footer: Real PDF & Single-File HTML */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/50 space-y-2">
          {/* Real PDF Generator Button */}
          <button
            onClick={handleDownloadPdf}
            disabled={isPdfGenerating}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-xs transition-colors shadow-sm"
            title="Gera e faz o download direto do livro completo em formato PDF (.pdf)"
          >
            {isPdfGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="truncate">{pdfProgress || 'Gerando PDF...'}</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5" />
                <span>Baixar Livro em PDF (.pdf)</span>
              </>
            )}
          </button>

          {/* Standalone Single File HTML Button */}
          <button
            onClick={downloadSingleHtml}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors border border-slate-700"
            title="Baixar todo o livro em um único arquivo HTML para abrir offline em qualquer navegador ou celular"
          >
            <BookOpen className="w-3 h-3 text-amber-400" />
            <span>Baixar Arquivo Único HTML (.html)</span>
          </button>
        </div>
      </aside>
    </>
  );
};
