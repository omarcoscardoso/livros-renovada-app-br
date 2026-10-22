import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  Check,
} from 'lucide-react';
import { Chapter, StoredBook } from '../data/bookTypes';

interface BookEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: StoredBook | null;
  onSaved: (updatedBook: StoredBook) => void;
}

export const BookEditorModal: React.FC<BookEditorModalProps> = ({
  isOpen,
  onClose,
  book,
  onSaved,
}) => {
  const [titlePt, setTitlePt] = useState('');
  const [subtitlePt, setSubtitlePt] = useState('');
  const [author, setAuthor] = useState('');
  const [originalYear, setOriginalYear] = useState(2026);
  const [publisher, setPublisher] = useState('');
  const [translatorNote, setTranslatorNote] = useState('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChIdx, setSelectedChIdx] = useState(0);
  const [coverPageNum, setCoverPageNum] = useState(1);
  const [isUpdatingCover, setIsUpdatingCover] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    if (book && isOpen) {
      setTitlePt(book.titlePt);
      setSubtitlePt(book.subtitlePt);
      setAuthor(book.author);
      setOriginalYear(book.originalYear);
      setPublisher(book.publisher);
      setTranslatorNote(book.translatorNote);
      setCoverPageNum(book.coverPageNumber || 1);
      setChapters(JSON.parse(JSON.stringify(book.chapters || [])));
      setSelectedChIdx(0);
      setSavedFeedback(false);
    }
  }, [book, isOpen]);

  if (!isOpen || !book) return null;

  const activeChapter = chapters[selectedChIdx] || chapters[0];

  const updateActiveChapter = (patch: Partial<Chapter>) => {
    setChapters((prev) =>
      prev.map((ch, idx) => (idx === selectedChIdx ? { ...ch, ...patch } : ch))
    );
  };

  const handleAddChapter = () => {
    const nextNum = chapters.length + 1;
    const newChapter: Chapter = {
      id: `chapter-${Date.now()}`,
      number: nextNum,
      titlePt: `Capítulo ${nextNum}: Novo Capítulo`,
      titleEn: `Chapter ${nextNum}`,
      subtitlePt: '',
      pages: `${nextNum}`,
      estimatedReadTimeMinutes: 5,
      summaryPt: 'Resumo executivo do capítulo.',
      keyPointsPt: ['Ponto principal 1'],
      studyQuestionsPt: ['Qual a aplicação prática deste capítulo?'],
      sections: [
        {
          id: `sec-${Date.now()}`,
          titlePt: 'Seção Principal',
          titleEn: 'Main Section',
          paragraphsPt: ['Digite aqui o conteúdo dos parágrafos do capítulo.'],
          paragraphsEn: [],
        },
      ],
    };
    setChapters((prev) => [...prev, newChapter]);
    setSelectedChIdx(chapters.length);
  };

  const handleRemoveChapter = (idxToRemove: number) => {
    if (chapters.length <= 1) {
      alert('O livro deve possuir pelo menos 1 capítulo.');
      return;
    }
    setChapters((prev) => prev.filter((_, i) => i !== idxToRemove));
    setSelectedChIdx((prev) => Math.max(0, prev - 1));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/books/${encodeURIComponent(book.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titlePt,
          subtitlePt,
          author,
          originalYear,
          publisher,
          translatorNote,
          chapters,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar alterações.');
      }
      setSavedFeedback(true);
      onSaved(data.book);
      setTimeout(() => {
        setSavedFeedback(false);
        onClose();
      }, 700);
    } catch (err: any) {
      alert(err?.message || 'Erro ao salvar livro.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-5xl h-[90vh] rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-display">
                Editar Estrutura do Livro: {book.titlePt}
              </h2>
              <p className="text-xs text-slate-400">
                Personalize metadados, títulos de capítulos, resumos, parágrafos e perguntas de reflexão.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-xs transition-colors"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : savedFeedback ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{savedFeedback ? 'Salvo!' : 'Salvar Alterações'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Book Metadata & Cover Page Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Título (PT-BR)
              </label>
              <input
                type="text"
                value={titlePt}
                onChange={(e) => setTitlePt(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Subtítulo
              </label>
              <input
                type="text"
                value={subtitlePt}
                onChange={(e) => setSubtitlePt(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Autor
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Ano
                </label>
                <input
                  type="number"
                  value={originalYear}
                  onChange={(e) => setOriginalYear(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Página da Capa no PDF
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={coverPageNum}
                  onChange={(e) => setCoverPageNum(Math.max(1, Number(e.target.value)))}
                  className="w-20 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  disabled={isUpdatingCover}
                  onClick={async () => {
                    setIsUpdatingCover(true);
                    try {
                      const res = await fetch(
                        `/api/books/${encodeURIComponent(book.id)}/cover-page`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ pageNumber: coverPageNum }),
                        }
                      );
                      const data = await res.json();
                      if (res.ok && data.book) {
                        onSaved(data.book);
                      } else {
                        alert(data.error || 'Erro ao atualizar capa.');
                      }
                    } catch {
                      alert('Erro ao atualizar página da capa.');
                    } finally {
                      setIsUpdatingCover(false);
                    }
                  }}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-amber-300 text-xs font-semibold transition-colors"
                >
                  {isUpdatingCover ? 'Gerando...' : 'Extrair Capa'}
                </button>
              </div>
            </div>
          </div>

          {/* Chapters Split Editor */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chapter List */}
            <div className="lg:col-span-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Capítulos ({chapters.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddChapter}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Capítulo</span>
                </button>
              </div>

              <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
                {chapters.map((ch, idx) => (
                  <div
                    key={ch.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                      idx === selectedChIdx
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-semibold'
                        : 'bg-slate-800/50 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                    onClick={() => setSelectedChIdx(idx)}
                  >
                    <span className="truncate flex-1">{ch.titlePt}</span>
                    {chapters.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveChapter(idx);
                        }}
                        className="p-1 text-slate-500 hover:text-rose-400"
                        title="Remover capítulo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Active Chapter Editor */}
            {activeChapter && (
              <div className="lg:col-span-8 space-y-4 p-4 rounded-xl bg-slate-800/30 border border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Título do Capítulo
                    </label>
                    <input
                      type="text"
                      value={activeChapter.titlePt}
                      onChange={(e) => updateActiveChapter({ titlePt: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Subtítulo do Capítulo
                    </label>
                    <input
                      type="text"
                      value={activeChapter.subtitlePt || ''}
                      onChange={(e) => updateActiveChapter({ subtitlePt: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Resumo Executivo do Capítulo
                  </label>
                  <textarea
                    rows={2}
                    value={activeChapter.summaryPt}
                    onChange={(e) => updateActiveChapter({ summaryPt: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-xs outline-none focus:border-amber-500"
                  />
                </div>

                {/* Sections */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-400">
                      Seções e Parágrafos do Capítulo
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const nextSections = [
                          ...activeChapter.sections,
                          {
                            id: `sec-${Date.now()}`,
                            titlePt: `Nova Seção ${activeChapter.sections.length + 1}`,
                            titleEn: `Section ${activeChapter.sections.length + 1}`,
                            paragraphsPt: ['Novo parágrafo...'],
                            paragraphsEn: [],
                          },
                        ];
                        updateActiveChapter({ sections: nextSections });
                      }}
                      className="text-xs text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Adicionar Seção
                    </button>
                  </div>

                  {activeChapter.sections.map((sec, sIdx) => (
                    <div
                      key={sec.id}
                      className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={sec.titlePt}
                          onChange={(e) => {
                            const updated = activeChapter.sections.map((s, i) =>
                              i === sIdx ? { ...s, titlePt: e.target.value } : s
                            );
                            updateActiveChapter({ sections: updated });
                          }}
                          className="flex-1 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-amber-300 text-xs font-semibold outline-none"
                        />
                        {activeChapter.sections.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = activeChapter.sections.filter((_, i) => i !== sIdx);
                              updateActiveChapter({ sections: updated });
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <textarea
                        rows={5}
                        value={sec.paragraphsPt.join('\n\n')}
                        onChange={(e) => {
                          const paras = e.target.value
                            .split(/\n\s*\n/)
                            .map((p) => p.trim())
                            .filter(Boolean);
                          const updated = activeChapter.sections.map((s, i) =>
                            i === sIdx ? { ...s, paragraphsPt: paras.length ? paras : [''] } : s
                          );
                          updateActiveChapter({ sections: updated });
                        }}
                        placeholder="Separe os parágrafos com uma linha em branco..."
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-editorial leading-relaxed outline-none focus:border-amber-500"
                      />
                    </div>
                  ))}
                </div>

                {/* Study Questions */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Perguntas para Reflexão (uma por linha)
                  </label>
                  <textarea
                    rows={3}
                    value={(activeChapter.studyQuestionsPt || []).join('\n')}
                    onChange={(e) =>
                      updateActiveChapter({
                        studyQuestionsPt: e.target.value
                          .split('\n')
                          .map((q) => q.trim())
                          .filter(Boolean),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
