import React, { useState, useEffect, useCallback } from 'react';
import { allChapters, bookInfo } from './data/bookData';
import { BookSummary, Chapter, StoredBook } from './data/bookTypes';
import { generateBookPdf } from './utils/pdfGenerator';
import {
  loadAllReadChaptersMap,
  toggleBookChapterRead,
  getBookLastVisitedChapter,
  saveBookLastVisitedChapter,
  ReadChaptersMap,
} from './utils/readingProgressStorage';
import { Navbar, ReaderTheme, FontSize } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { ChapterReader } from './components/ChapterReader';
import { SearchModal } from './components/SearchModal';
import { PdfViewerModal } from './components/PdfViewerModal';
import { BookshelfView } from './components/BookshelfView';
import { UploadBookModal } from './components/UploadBookModal';
import { BookEditorModal } from './components/BookEditorModal';
import { LoginModal } from './components/LoginModal';
import { AdminModal } from './components/AdminModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2, Check } from 'lucide-react';

const DEFAULT_BOOK_ID = 'cell-church-larry-stockstill';

const FALLBACK_DEFAULT_BOOK: StoredBook = {
  ...bookInfo,
  id: DEFAULT_BOOK_ID,
  slug: DEFAULT_BOOK_ID,
  coverColor: 'amber',
  coverImageUrl: `/api/books/${DEFAULT_BOOK_ID}/cover`,
  coverPageNumber: 1,
  hasOriginalPdf: true,
  originalPdfName: 'The_Cell_Church_Larry_Stockstill_Original.pdf',
  status: 'ready',
  conversionProgress: 'Livro completo traduzido e revisado',
  conversionPercent: 100,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const FALLBACK_DEFAULT_SUMMARY: BookSummary = {
  id: FALLBACK_DEFAULT_BOOK.id,
  slug: FALLBACK_DEFAULT_BOOK.slug,
  titlePt: FALLBACK_DEFAULT_BOOK.titlePt,
  titleEn: FALLBACK_DEFAULT_BOOK.titleEn,
  subtitlePt: FALLBACK_DEFAULT_BOOK.subtitlePt,
  subtitleEn: FALLBACK_DEFAULT_BOOK.subtitleEn,
  author: FALLBACK_DEFAULT_BOOK.author,
  originalYear: FALLBACK_DEFAULT_BOOK.originalYear,
  publisher: FALLBACK_DEFAULT_BOOK.publisher,
  translatorNote: FALLBACK_DEFAULT_BOOK.translatorNote,
  coverColor: 'amber',
  coverImageUrl: `/api/books/${DEFAULT_BOOK_ID}/cover`,
  coverPageNumber: 1,
  chapterCount: allChapters.length,
  totalEstimatedMinutes: 145,
  hasOriginalPdf: true,
  originalPdfName: 'The_Cell_Church_Larry_Stockstill_Original.pdf',
  status: 'ready',
  createdAt: FALLBACK_DEFAULT_BOOK.createdAt,
  updatedAt: FALLBACK_DEFAULT_BOOK.updatedAt,
};

function LibraryApp({
  onRegisterProgressLoaded,
}: {
  onRegisterProgressLoaded: (fn: (remoteMap: ReadChaptersMap) => void) => void;
}) {
  const { user, openLoginModal, syncReadingProgressToAccount } = useAuth();

  // Initial view is the virtual Bookshelf ("estante")
  const [currentView, setCurrentView] = useState<'bookshelf' | 'reader'>('bookshelf');

  const [booksList, setBooksList] = useState<BookSummary[]>([FALLBACK_DEFAULT_SUMMARY]);
  const [activeBook, setActiveBook] = useState<StoredBook>(FALLBACK_DEFAULT_BOOK);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(false);

  // '__cover__' represents the first page (Book Cover & Title Page) before the Introduction
  const [currentChapterId, setCurrentChapterId] = useState<string>('__cover__');

  // Persist theme & font size in browser localStorage
  const [theme, setTheme] = useState<ReaderTheme>(() => {
    try {
      const saved = localStorage.getItem('ipr_reader_theme') as ReaderTheme | null;
      return saved === 'dark' || saved === 'sepia' || saved === 'light' ? saved : 'sepia';
    } catch {
      return 'sepia';
    }
  });

  const [fontSize, setFontSize] = useState<FontSize>(() => {
    try {
      const saved = localStorage.getItem('ipr_reader_font_size') as FontSize | null;
      return saved === 'sm' || saved === 'base' || saved === 'lg' || saved === 'xl'
        ? saved
        : 'base';
    } catch {
      return 'base';
    }
  });

  const handleChangeTheme = (newTheme: ReaderTheme) => {
    setTheme(newTheme);
    try {
      localStorage.setItem('ipr_reader_theme', newTheme);
    } catch {
      // ignore
    }
  };

  const handleChangeFontSize = (newSize: FontSize) => {
    setFontSize(newSize);
    try {
      localStorage.setItem('ipr_reader_font_size', newSize);
    } catch {
      // ignore
    }
  };

  // Persistent map of read chapters per book in localStorage
  const [readChaptersMap, setReadChaptersMap] = useState<ReadChaptersMap>(() =>
    loadAllReadChaptersMap()
  );

  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isPdfOpen, setIsPdfOpen] = useState<boolean>(false);
  const [pdfTargetBook, setPdfTargetBook] = useState<StoredBook | BookSummary>(
    FALLBACK_DEFAULT_BOOK
  );
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [editingBook, setEditingBook] = useState<StoredBook | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  const [pdfStatus, setPdfStatus] = useState<string | null>(null);

  // Sync remote progress when received from user account
  useEffect(() => {
    onRegisterProgressLoaded((remoteMap: ReadChaptersMap) => {
      setReadChaptersMap((prev) => {
        const merged = { ...prev };
        for (const [bookId, chapters] of Object.entries(remoteMap)) {
          const local = merged[bookId] || [];
          const combined = Array.from(new Set([...local, ...chapters]));
          merged[bookId] = combined;
        }
        return merged;
      });
    });
  }, [onRegisterProgressLoaded]);

  const readChaptersForActiveBook = readChaptersMap[activeBook.id] || [];

  const handleToggleReadChapter = (chapterId: string) => {
    if (chapterId === '__cover__') return;
    const updatedList = toggleBookChapterRead(activeBook.id, chapterId);
    setReadChaptersMap((prev) => ({
      ...prev,
      [activeBook.id]: updatedList,
    }));

    // Requirement 3c: Persist progress in user account if logged in
    if (user) {
      syncReadingProgressToAccount(activeBook.id, currentChapterId, updatedList);
    }
  };

  const handleSelectChapter = (chapterId: string) => {
    setCurrentChapterId(chapterId);
    saveBookLastVisitedChapter(activeBook.id, chapterId);

    // Requirement 3c: Save last visited chapter to user account
    if (user) {
      const currentRead = readChaptersMap[activeBook.id] || [];
      syncReadingProgressToAccount(activeBook.id, chapterId, currentRead);
    }
  };

  const fetchLibrary = useCallback(async () => {
    try {
      const res = await fetch('/api/books');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.books) && data.books.length > 0) {
        setBooksList(data.books);
      }
      if (typeof data.hasGeminiKey === 'boolean') {
        setHasGeminiKey(data.hasGeminiKey);
      }
    } catch (err) {
      console.error('Erro ao carregar lista da biblioteca:', err);
    }
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  // Poll library if any book in booksList is currently processing
  useEffect(() => {
    const hasProcessing = booksList.some((b) => b.status === 'processing');
    if (!hasProcessing) return;

    const timer = setInterval(() => {
      fetchLibrary();
    }, 2000);

    return () => clearInterval(timer);
  }, [booksList, fetchLibrary]);

  const handleSelectBook = async (bookId: string) => {
    try {
      const res = await fetch(`/api/books/${encodeURIComponent(bookId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.book) {
          setActiveBook(data.book);
          const chapters: Chapter[] = data.book.chapters || [];
          const savedChapterId = getBookLastVisitedChapter(data.book.id);
          const targetChapterId =
            savedChapterId &&
            (savedChapterId === '__cover__' || chapters.some((c) => c.id === savedChapterId))
              ? savedChapterId
              : '__cover__';
          setCurrentChapterId(targetChapterId);
          setCurrentView('reader');
          return;
        }
      }

      if (bookId === DEFAULT_BOOK_ID) {
        setActiveBook(FALLBACK_DEFAULT_BOOK);
        const savedChapterId = getBookLastVisitedChapter(DEFAULT_BOOK_ID);
        setCurrentChapterId(savedChapterId || '__cover__');
        setCurrentView('reader');
      }
    } catch (err) {
      console.error('Erro ao abrir livro:', err);
      if (bookId === DEFAULT_BOOK_ID) {
        setActiveBook(FALLBACK_DEFAULT_BOOK);
        setCurrentChapterId('__cover__');
        setCurrentView('reader');
      }
    }
  };

  const handleOpenUpload = () => {
    if (!user) {
      openLoginModal('Faça login com sua conta Google para adicionar novos livros em PDF à biblioteca.');
      return;
    }
    setIsUploadOpen(true);
  };

  const handleOpenEditBook = async (bookId: string) => {
    if (!user) {
      openLoginModal('Faça login com sua conta Google para editar os capítulos e metadados deste livro.');
      return;
    }
    try {
      const res = await fetch(`/api/books/${encodeURIComponent(bookId)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.book) {
        setEditingBook(data.book);
      }
    } catch (err) {
      console.error('Erro ao carregar livro para edição:', err);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    if (!user) {
      openLoginModal('Faça login com sua conta Google para gerenciar livros da biblioteca.');
      return;
    }
    if (!window.confirm('Tem certeza que deseja remover este livro da estante?')) return;
    try {
      const res = await fetch(`/api/books/${encodeURIComponent(bookId)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'Não foi possível excluir o livro.');
        return;
      }
      await fetchLibrary();
      if (activeBook.id === bookId) {
        setActiveBook(FALLBACK_DEFAULT_BOOK);
        setCurrentView('bookshelf');
      }
    } catch (err) {
      console.error('Erro ao excluir livro:', err);
    }
  };

  const handleReprocessBook = async (bookId: string) => {
    if (!user) {
      openLoginModal('Faça login com sua conta Google para reprocessar livros.');
      return;
    }
    try {
      const res = await fetch(`/api/books/${encodeURIComponent(bookId)}/reprocess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        await fetchLibrary();
      }
    } catch (err) {
      console.error('Erro ao reprocessar livro:', err);
    }
  };

  const activeChapters: Chapter[] =
    activeBook.chapters && activeBook.chapters.length > 0
      ? activeBook.chapters
      : allChapters;

  const isCoverPage = currentChapterId === '__cover__';
  const currentChapterIndex = isCoverPage
    ? -1
    : Math.max(
        0,
        activeChapters.findIndex((c) => c.id === currentChapterId)
      );
  const currentChapter: Chapter =
    activeChapters[Math.max(0, currentChapterIndex)] || activeChapters[0];

  // Global Keyboard shortcuts (Ctrl+K or Cmd+K in reader view)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && currentView === 'reader') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView]);

  // Scroll to top on chapter, book, or view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentChapterId, activeBook.id, currentView]);

  const handleNextChapter = () => {
    if (isCoverPage) {
      const firstId = activeChapters[0]?.id || 'intro';
      handleSelectChapter(firstId);
      return;
    }
    if (currentChapterIndex < activeChapters.length - 1) {
      const nextId = activeChapters[currentChapterIndex + 1].id;
      handleSelectChapter(nextId);
    }
  };

  const handlePrevChapter = () => {
    if (isCoverPage) return;
    if (currentChapterIndex === 0) {
      handleSelectChapter('__cover__');
      return;
    }
    if (currentChapterIndex > 0) {
      const prevId = activeChapters[currentChapterIndex - 1].id;
      handleSelectChapter(prevId);
    }
  };

  const handleDownloadPdf = async () => {
    if (pdfStatus) return;
    setPdfStatus('Gerando PDF do livro completo...');
    try {
      await generateBookPdf(activeBook, activeChapters, (status) => {
        setPdfStatus(status);
      });
      setPdfStatus('PDF baixado com sucesso!');
      setTimeout(() => setPdfStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setPdfStatus('Erro ao gerar PDF.');
      setTimeout(() => setPdfStatus(null), 3000);
    }
  };

  const themeBg =
    theme === 'dark' ? 'bg-[#0f141c]' : theme === 'sepia' ? 'bg-[#f7f3e8]' : 'bg-white';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${themeBg}`}>
      {/* Toast Feedback for PDF Generation */}
      {pdfStatus && (
        <div className="fixed top-16 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900 border border-amber-500/40 text-slate-100 text-xs sm:text-sm font-semibold shadow-2xl backdrop-blur-md">
          {pdfStatus.includes('sucesso') ? (
            <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
          ) : (
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
          )}
          <span>{pdfStatus}</span>
        </div>
      )}

      {currentView === 'bookshelf' ? (
        <BookshelfView
          books={booksList}
          readChaptersMap={readChaptersMap}
          theme={theme}
          onChangeTheme={handleChangeTheme}
          onSelectBook={handleSelectBook}
          onOpenUpload={handleOpenUpload}
          onOpenPdfForBook={(bookId) => {
            const found = booksList.find((b) => b.id === bookId) || activeBook;
            setPdfTargetBook(found);
            setIsPdfOpen(true);
          }}
          onEditBook={(bookId) => handleOpenEditBook(bookId)}
          onDeleteBook={handleDeleteBook}
          onReprocessBook={handleReprocessBook}
          onOpenAdmin={() => setIsAdminModalOpen(true)}
        />
      ) : (
        <>
          {/* Table of Contents & Library Drawer */}
          <Sidebar
            book={activeBook}
            chapters={activeChapters}
            currentChapterId={isCoverPage ? '__cover__' : currentChapter.id}
            onSelectChapter={handleSelectChapter}
            onToggleChapterRead={handleToggleReadChapter}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenPdf={() => {
              setPdfTargetBook(activeBook);
              setIsPdfOpen(true);
            }}
            onOpenLibrary={() => setCurrentView('bookshelf')}
            onOpenUpload={handleOpenUpload}
            onOpenEditor={() => setEditingBook(activeBook)}
            readChapters={readChaptersForActiveBook}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            totalBooksCount={Math.max(1, booksList.length)}
          />

          {/* Main E-Book Reader Area */}
          <div className="flex-1 lg:pl-72 flex flex-col min-h-screen">
            <Navbar
              onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
              onOpenSearch={() => setIsSearchOpen(true)}
              onOpenPdf={() => {
                setPdfTargetBook(activeBook);
                setIsPdfOpen(true);
              }}
              onPrintPdf={handleDownloadPdf}
              onOpenLibrary={() => setCurrentView('bookshelf')}
              onOpenUpload={handleOpenUpload}
              onOpenAdmin={() => setIsAdminModalOpen(true)}
              theme={theme}
              onChangeTheme={handleChangeTheme}
              fontSize={fontSize}
              onChangeFontSize={handleChangeFontSize}
              bookTitle={activeBook.titlePt}
              chapterTitle={isCoverPage ? 'Capa & Folha de Rosto' : currentChapter.titlePt}
              totalBooksCount={Math.max(1, booksList.length)}
              hasOriginalPdf={activeBook.hasOriginalPdf}
            />

            <main className="flex-1">
              <ChapterReader
                book={activeBook}
                chapter={currentChapter}
                isCoverPage={isCoverPage}
                isFirstChapter={!isCoverPage && currentChapterIndex === 0}
                totalChapters={activeChapters.length}
                bookTitle={activeBook.titlePt}
                bookAuthor={activeBook.author}
                theme={theme}
                fontSize={fontSize}
                isRead={!isCoverPage && readChaptersForActiveBook.includes(currentChapter.id)}
                onToggleRead={() => handleToggleReadChapter(currentChapter.id)}
                onPrevChapter={handlePrevChapter}
                onNextChapter={handleNextChapter}
                onSelectChapter={handleSelectChapter}
                hasPrev={!isCoverPage}
                hasNext={isCoverPage || currentChapterIndex < activeChapters.length - 1}
              />
            </main>
          </div>

          {/* Clean printable book view for window.print() (PDF generation) */}
          <div className="print-only p-8 text-black bg-white">
            <div className="text-center py-12 border-b-2 border-black">
              {activeBook.coverImageUrl && (
                <img
                  src={activeBook.coverImageUrl}
                  alt={activeBook.titlePt}
                  className="max-w-[260px] mx-auto mb-6 border border-gray-300"
                />
              )}
              <h1 className="text-3xl font-bold font-serif mb-2">{activeBook.titlePt}</h1>
              <h3 className="text-lg text-gray-700 font-serif">{activeBook.subtitlePt}</h3>
              <p className="mt-4 text-sm font-semibold">
                Autor: {activeBook.author} ({activeBook.originalYear})
              </p>
              <p className="text-xs text-gray-500 italic mt-2">{activeBook.translatorNote}</p>
            </div>

            {activeChapters.map((ch) => (
              <div key={ch.id} className="page-break my-10">
                <h2 className="text-2xl font-bold text-gray-900 border-b pb-2 mb-3">
                  {ch.titlePt}
                </h2>
                {ch.subtitlePt && (
                  <p className="text-sm italic text-gray-600 mb-4">{ch.subtitlePt}</p>
                )}
                <div className="bg-gray-100 p-4 border-l-4 border-gray-600 mb-6 text-sm">
                  <strong>Resumo:</strong> {ch.summaryPt}
                </div>

                {ch.sections.map((sec) => (
                  <div key={sec.id} className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">{sec.titlePt}</h3>
                    {sec.paragraphsPt.map((p, pIdx) => (
                      <p key={pIdx} className="text-sm leading-relaxed mb-3 text-justify">
                        {p}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={(chapterId) => handleSelectChapter(chapterId)}
        chapters={activeChapters}
        bookTitle={activeBook.titlePt}
      />

      {/* PDF Original Viewer */}
      <PdfViewerModal
        isOpen={isPdfOpen}
        onClose={() => setIsPdfOpen(false)}
        bookId={pdfTargetBook.id}
        bookTitle={pdfTargetBook.titlePt}
        bookAuthor={pdfTargetBook.author}
        originalYear={pdfTargetBook.originalYear}
        originalPdfName={pdfTargetBook.originalPdfName}
      />

      {/* PDF Upload & Conversion Modal */}
      <UploadBookModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        hasGeminiKey={hasGeminiKey}
        onBookReady={(newBook) => {
          setActiveBook(newBook);
          setCurrentChapterId('__cover__');
          saveBookLastVisitedChapter(newBook.id, '__cover__');
          setCurrentView('reader');
          fetchLibrary();
        }}
        onRefreshLibrary={fetchLibrary}
      />

      {/* Book & Chapters Editor Modal */}
      <BookEditorModal
        isOpen={Boolean(editingBook)}
        onClose={() => setEditingBook(null)}
        book={editingBook}
        onSaved={(updatedBook) => {
          if (updatedBook.id === activeBook.id) {
            setActiveBook(updatedBook);
          }
          fetchLibrary();
        }}
      />

      {/* Google Login Modal (Requirement 3 & 5) */}
      <LoginModal theme={theme} />

      {/* Admin Panel Modal (Requirement 4) */}
      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        books={booksList}
        onRefreshLibrary={fetchLibrary}
        onEditBook={(bookId) => handleOpenEditBook(bookId)}
        onDeleteBook={(bookId) => handleDeleteBook(bookId)}
        onReprocessBook={(bookId) => handleReprocessBook(bookId)}
        onOpenPdfForBook={(bookId) => {
          const found = booksList.find((b) => b.id === bookId) || activeBook;
          setPdfTargetBook(found);
          setIsPdfOpen(true);
        }}
        theme={theme}
      />
    </div>
  );
}

export default function App() {
  const [progressLoadedCallback, setProgressLoadedCallback] = useState<
    ((remoteMap: ReadChaptersMap) => void) | null
  >(null);

  const handleRegisterProgressLoaded = useCallback(
    (fn: (remoteMap: ReadChaptersMap) => void) => {
      setProgressLoadedCallback(() => fn);
    },
    []
  );

  return (
    <AuthProvider
      onProgressLoaded={(map) => {
        if (progressLoadedCallback) {
          progressLoadedCallback(map);
        }
      }}
    >
      <LibraryApp onRegisterProgressLoaded={handleRegisterProgressLoaded} />
    </AuthProvider>
  );
}
