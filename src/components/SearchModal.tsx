import React, { useState, useEffect, useRef } from 'react';
import { Search, X, BookOpen, ChevronRight, Hash } from 'lucide-react';
import { searchBook, SearchResult } from '../data/bookData';
import { Chapter } from '../data/bookTypes';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (chapterId: string) => void;
  chapters: Chapter[];
  bookTitle: string;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectResult,
  chapters,
  bookTitle,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const res = searchBook(query, chapters);
    setResults(res);
  }, [query, chapters]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <Search className="w-5 h-5 text-amber-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Pesquisar em "${bookTitle}"...`}
            className="w-full bg-transparent text-slate-100 placeholder-slate-400 text-sm sm:text-base outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-3 space-y-2 flex-1">
          {query.trim().length > 0 && results.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">
              Nenhum trecho encontrado para "{query}" em "{bookTitle}".
            </div>
          )}

          {results.map((res, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSelectResult(res.chapterId);
                onClose();
              }}
              className="w-full text-left p-3.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-amber-500/40 transition-all group"
            >
              <div className="flex items-center justify-between text-xs text-amber-400 font-medium mb-1">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  {res.chapterTitlePt}
                </span>
                <span className="text-slate-400 text-[11px] group-hover:text-amber-300 transition-colors flex items-center gap-1">
                  Abrir capítulo <ChevronRight className="w-3 h-3" />
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-200 mb-1">
                {res.sectionTitlePt}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-editorial">
                {res.snippetPt}
              </p>
            </button>
          ))}

          {!query && (
            <div className="p-4 text-center">
              <p className="text-xs font-medium text-slate-400 mb-3">
                Sugestões rápidas de busca neste livro:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {chapters.slice(0, 8).map((ch) => {
                  const cleanTag = ch.titlePt.replace(/^Cap[íi]tulo\s*\d+\s*[:—-]?\s*/i, '').slice(0, 28);
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setQuery(cleanTag)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700 transition-colors"
                    >
                      <Hash className="w-3 h-3 text-amber-400" />
                      {cleanTag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
