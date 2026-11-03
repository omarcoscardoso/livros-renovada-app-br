import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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
import { AdminScreen } from './components/AdminScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PwaProvider } from './context/PwaContext';
import { PwaInstallBanner } from './components/pwa/PwaInstallBanner';
import { Loader2, Check, Sparkles } from 'lucide-react';
import { Training, UserCertificate } from './types/training';
import { LmsNavbar } from './components/lms/LmsNavbar';
import { LmsSidebar, LmsNavTab } from './components/lms/LmsSidebar';
import { LmsHomeScreen } from './components/lms/LmsHomeScreen';
import { LmsTrainingPlayer } from './components/lms/LmsTrainingPlayer';
import { LmsCertificatesScreen } from './components/lms/LmsCertificatesScreen';
import { LmsBookmarksScreen } from './components/lms/LmsBookmarksScreen';
import { LmsAdminDashboard, LmsAdminTab } from './components/lms/LmsAdminDashboard';
import { LmsWelcomeScreen } from './components/lms/LmsWelcomeScreen';
import { LmsUserProfileScreen } from './components/lms/LmsUserProfileScreen';

export type AppView =
  | 'lms-home'
  | 'lms-bookmarks'
  | 'lms-certificates'
  | 'lms-player'
  | 'lms-admin'
  | 'bookshelf'
  | 'reader'
  | 'book-admin'
  | 'user-profile';

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
  const { user, loading, openLoginModal, syncReadingProgressToAccount } = useAuth();

  // Collapsible sidebar state persisted in localStorage
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('lms_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('lms_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Initial view is the LMS Training Platform
  const [currentView, setCurrentView] = useState<AppView>('lms-home');

  // LMS Training Platform State
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [activeTraining, setActiveTraining] = useState<Training | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const [certificates, setCertificates] = useState<UserCertificate[]>([]);
  const [isLmsSidebarOpen, setIsLmsSidebarOpen] = useState(false);
  const [lmsSearchQuery, setLmsSearchQuery] = useState('');
  const [lmsCategoryFilter, setLmsCategoryFilter] = useState('Todos');

  const [booksList, setBooksList] = useState<BookSummary[]>([FALLBACK_DEFAULT_SUMMARY]);
  const [activeBook, setActiveBook] = useState<StoredBook>(FALLBACK_DEFAULT_BOOK);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(false);

  // '__cover__' represents the first page (Book Cover & Title Page) before the Introduction
  const [currentChapterId, setCurrentChapterId] = useState<string>('__cover__');

  // Persist theme & font size in browser localStorage (default to 'dark' for Renovada theme)
  const [theme, setTheme] = useState<ReaderTheme>(() => {
    try {
      const saved = localStorage.getItem('ipr_reader_theme') as ReaderTheme | null;
      return saved === 'dark' || saved === 'sepia' || saved === 'light' ? saved : 'dark';
    } catch {
      return 'dark';
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

  // Synchronize active theme with document body and root html class for dark/light accessibility
  useEffect(() => {
    const isDark = theme === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.style.colorScheme = 'dark';
      document.body.classList.remove('bg-[#F8FAFC]', 'text-slate-900');
      document.body.classList.add('bg-[#0F1224]', 'text-slate-100');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.documentElement.style.colorScheme = 'light';
      document.body.classList.remove('bg-[#0F1224]', 'text-slate-100');
      document.body.classList.add('bg-[#F8FAFC]', 'text-slate-900');
    }
  }, [theme]);

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

  const [pdfStatus, setPdfStatus] = useState<string | null>(null);
  const [adminInitialTab, setAdminInitialTab] = useState<LmsAdminTab>('metrics');
  const [userProfileTab, setUserProfileTab] = useState<'learning' | 'courses' | 'certificates' | 'profile'>('learning');

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const navigateToView = useCallback(
    (view: AppView, params?: { trainingId?: string; bookId?: string; tab?: string }) => {
      switch (view) {
        case 'lms-home':
          navigate('/');
          break;
        case 'lms-bookmarks':
          navigate('/favoritos');
          break;
        case 'lms-certificates':
          navigate('/certificados');
          break;
        case 'lms-player':
          if (params?.trainingId) navigate(`/treinamentos/${encodeURIComponent(params.trainingId)}`);
          else navigate('/treinamentos');
          break;
        case 'lms-admin':
          if (params?.tab) navigate(`/admin?tab=${encodeURIComponent(params.tab)}`);
          else navigate('/admin');
          break;
        case 'bookshelf':
          navigate('/biblioteca');
          break;
        case 'reader':
          if (params?.bookId) navigate(`/leitor/${encodeURIComponent(params.bookId)}`);
          else navigate('/leitor');
          break;
        case 'book-admin':
          navigate('/admin/livros');
          break;
        case 'user-profile':
          if (params?.tab) navigate(`/perfil?tab=${encodeURIComponent(params.tab)}`);
          else navigate('/perfil');
          break;
        default:
          navigate('/');
      }
    },
    [navigate]
  );

  // Sync route changes with state (deep-linking and browser navigation history)
  useEffect(() => {
    const path = location.pathname;
    if (path === '/' || path === '/treinamentos') {
      setCurrentView('lms-home');
    } else if (path === '/favoritos') {
      setCurrentView('lms-bookmarks');
    } else if (path === '/certificados') {
      setCurrentView('lms-certificates');
    } else if (path.startsWith('/treinamentos/')) {
      const trainingId = path.replace('/treinamentos/', '').trim();
      if (trainingId) {
        const found = trainings.find((t) => t.id === trainingId);
        if (found) {
          setActiveTraining(found);
        } else {
          fetch(`/api/trainings/${encodeURIComponent(trainingId)}`, { credentials: 'include' })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (data?.training) setActiveTraining(data.training);
            })
            .catch(() => {});
        }
      }
      setCurrentView('lms-player');
    } else if (path.startsWith('/admin/livros')) {
      setAdminInitialTab('library');
      setCurrentView('lms-admin');
    } else if (path.startsWith('/admin')) {
      const tabParam = searchParams.get('tab') as LmsAdminTab | null;
      if (tabParam) {
        setAdminInitialTab(tabParam);
      }
      setCurrentView('lms-admin');
    } else if (path === '/biblioteca') {
      setCurrentView('bookshelf');
    } else if (path.startsWith('/perfil') || path.startsWith('/minha-conta')) {
      const tabParam = searchParams.get('tab') as 'learning' | 'courses' | 'certificates' | 'profile' | null;
      if (tabParam) {
        setUserProfileTab(tabParam);
      }
      setCurrentView('user-profile');
    } else if (path.startsWith('/leitor')) {
      const bookId = path.replace('/leitor/', '').replace('/leitor', '').trim();
      if (bookId && bookId !== activeBook.id) {
        fetch(`/api/books/${encodeURIComponent(bookId)}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.book) {
              setActiveBook(data.book);
              const chapters: Chapter[] = data.book.chapters || [];
              const savedChapterId = getBookLastVisitedChapter(data.book.id);
              const targetChapterId =
                savedChapterId &&
                (savedChapterId === '__cover__' || chapters.some((c) => c.id === savedChapterId))
                  ? savedChapterId
                  : '__cover__';
              setCurrentChapterId(targetChapterId);
            }
          })
          .catch(() => {});
      }
      setCurrentView('reader');
    }
  }, [location.pathname, searchParams, trainings, activeBook.id]);

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
      if (Array.isArray(data.books)) {
        setBooksList(data.books);
      }
      if (typeof data.hasGeminiKey === 'boolean') {
        setHasGeminiKey(data.hasGeminiKey);
      }
    } catch (err) {
      console.error('Erro ao carregar lista da biblioteca:', err);
    }
  }, []);

  const fetchTrainings = useCallback(async () => {
    try {
      const res = await fetch('/api/trainings', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.trainings)) {
        setTrainings(data.trainings);
        setActiveTraining((prev) => {
          if (!prev) return null;
          const found = data.trainings.find((t: Training) => t.id === prev.id);
          return found || prev;
        });
      }
    } catch (err) {
      console.error('Erro ao carregar treinamentos:', err);
    }
  }, []);

  const fetchBookmarks = useCallback(async () => {
    try {
      const res = await fetch('/api/bookmarks', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.bookmarks)) {
        setBookmarkedIds(data.bookmarks);
      }
    } catch (err) {
      console.error('Erro ao carregar favoritos:', err);
    }
  }, []);

  const fetchCertificates = useCallback(async () => {
    try {
      const res = await fetch('/api/certificates', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.certificates)) {
        setCertificates(data.certificates);
      }
    } catch (err) {
      console.error('Erro ao carregar certificados:', err);
    }
  }, []);

  const handleSelectTraining = useCallback(async (t: Training) => {
    // 1. Define imediatamente o treinamento ativo para transição instantânea
    setActiveTraining(t);
    navigateToView('lms-player', { trainingId: t.id });

    // 2. Busca na API os detalhes completos com aulas e progresso para garantir fidelidade
    try {
      const res = await fetch(`/api/trainings/${encodeURIComponent(t.id)}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.training) {
          setActiveTraining(data.training);
          setTrainings((prev) =>
            prev.map((item) => (item.id === data.training.id ? { ...item, ...data.training } : item))
          );
        }
      }
    } catch (err) {
      console.warn('Erro ao atualizar detalhes do treinamento selecionado:', err);
    }
  }, [navigateToView]);

  useEffect(() => {
    fetchLibrary();
    fetchTrainings();
  }, [fetchLibrary, fetchTrainings]);

  useEffect(() => {
    if (user) {
      fetchBookmarks();
      fetchCertificates();
      fetchTrainings();
    } else {
      setBookmarkedIds([]);
      setCertificates([]);
      if (currentView !== 'lms-home') {
        navigateToView('lms-home');
      }
    }
  }, [user, fetchBookmarks, fetchCertificates, fetchTrainings, currentView]);

  const handleToggleBookmark = async (trainingId: string) => {
    try {
      const res = await fetch(`/api/trainings/${encodeURIComponent(trainingId)}/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        setBookmarkedIds((prev) =>
          data.bookmarked ? [...prev, trainingId] : prev.filter((id) => id !== trainingId)
        );
      }
    } catch (err) {
      console.error('Erro ao alternar favorito:', err);
    }
  };

  const handleToggleLessonProgress = async (
    trainingId: string,
    lessonId: string,
    audit?: {
      secondsWatched?: number;
      durationSeconds?: number;
      watchPercent?: number;
      verifiedVia?: string;
    }
  ) => {
    try {
      const res = await fetch(
        `/api/trainings/${encodeURIComponent(trainingId)}/lessons/${encodeURIComponent(lessonId)}/toggle`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ audit }),
        }
      );
      if (!res.ok) return { isCompleted: false };
      const data = await res.json();

      setTrainings((prev) =>
        prev.map((t) => {
          if (t.id !== trainingId) return t;
          const updatedLessons = (t.lessons || []).map((l) =>
            l.id === lessonId ? { ...l, isCompleted: data.isCompleted } : l
          );
          return {
            ...t,
            lessons: updatedLessons,
            progressPercent: data.progressPercent,
            isCompleted: data.isCompletedAll,
          };
        })
      );

      setActiveTraining((prev) => {
        if (!prev || prev.id !== trainingId) return prev;
        const updatedLessons = (prev.lessons || []).map((l) =>
          l.id === lessonId ? { ...l, isCompleted: data.isCompleted } : l
        );
        return {
          ...prev,
          lessons: updatedLessons,
          progressPercent: data.progressPercent,
          isCompleted: data.isCompletedAll,
        };
      });

      if (data.certificate) {
        setCertificates((prev) => [data.certificate, ...prev]);
      }

      return {
        isCompleted: data.isCompleted,
        certificate: data.certificate || null,
      };
    } catch (err) {
      console.error('Erro ao atualizar progresso da aula:', err);
      return { isCompleted: false };
    }
  };

  const filteredTrainings = trainings.filter((t) => {
    const isCompleted = Boolean(t.isCompleted || (t.progressPercent || 0) >= 100);

    const matchesCategory =
      lmsCategoryFilter === 'Todos' ||
      lmsCategoryFilter === 'Treinamentos' ||
      (lmsCategoryFilter === 'Pendências' && !isCompleted && (t.isRequired || (t.progressPercent || 0) > 0)) ||
      t.category.toLowerCase().includes(lmsCategoryFilter.toLowerCase()) ||
      t.targetAudience.toLowerCase().includes(lmsCategoryFilter.toLowerCase());

    if (!matchesCategory) return false;

    if (!lmsSearchQuery.trim()) return true;

    const q = lmsSearchQuery.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.targetAudience.toLowerCase().includes(q)
    );
  });

  const pendingTrainings = trainings.filter((t) => {
    const isCompleted = Boolean(t.isCompleted || (t.progressPercent || 0) >= 100);
    if (isCompleted) return false;
    // 1. Cursos marcados como obrigatório que o aluno ainda não concluiu
    if (t.isRequired) return true;
    // 2. Cursos já iniciados em andamento
    if ((t.progressPercent || 0) > 0) return true;
    return false;
  });

  // Poll library if any book in booksList is currently processing
  useEffect(() => {
    const hasProcessing = booksList.some((b) => b.status === 'processing');
    if (!hasProcessing) return;

    const timer = setInterval(() => {
      fetchLibrary();
    }, 2000);

    return () => clearInterval(timer);
  }, [booksList, fetchLibrary]);

  // Suporte a gestos em celulares: arrastar/puxar da esquerda para a direita para abrir o menu do livro
  useEffect(() => {
    if (currentView !== 'reader') return;

    let touchStartX = 0;
    let touchStartY = 0;
    let isSwipeCandidate = false;
    let hasTriggered = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      hasTriggered = false;

      // Se o menu estiver fechado: candidato se o toque começar na lateral esquerda
      // Se o menu estiver aberto: pode arrastar da direita para a esquerda para fechar
      if (!isSidebarOpen) {
        const leftZoneMax = Math.max(90, window.innerWidth * 0.28);
        isSwipeCandidate = touchStartX <= leftZoneMax;
      } else {
        isSwipeCandidate = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwipeCandidate || hasTriggered || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.25;
      if (!isHorizontal) return;

      if (!isSidebarOpen) {
        // Puxando da esquerda para a direita abre o menu do livro
        if (deltaX >= 45) {
          hasTriggered = true;
          setIsSidebarOpen(true);
        }
      } else {
        // Puxando da direita para a esquerda fecha o menu do livro
        if (deltaX <= -45) {
          hasTriggered = true;
          setIsSidebarOpen(false);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isSwipeCandidate || hasTriggered || e.changedTouches.length !== 1) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;

      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY) * 1.2;
      if (!isHorizontal) return;

      if (!isSidebarOpen && deltaX >= 40) {
        hasTriggered = true;
        setIsSidebarOpen(true);
      } else if (isSidebarOpen && deltaX <= -40) {
        hasTriggered = true;
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentView, isSidebarOpen]);

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
          navigateToView('reader', { bookId: data.book.id });
          return;
        }
      }

      if (bookId === DEFAULT_BOOK_ID) {
        setActiveBook(FALLBACK_DEFAULT_BOOK);
        const savedChapterId = getBookLastVisitedChapter(DEFAULT_BOOK_ID);
        setCurrentChapterId(savedChapterId || '__cover__');
        navigateToView('reader', { bookId: DEFAULT_BOOK_ID });
      }
    } catch (err) {
      console.error('Erro ao abrir livro:', err);
      if (bookId === DEFAULT_BOOK_ID) {
        setActiveBook(FALLBACK_DEFAULT_BOOK);
        setCurrentChapterId('__cover__');
        navigateToView('reader', { bookId: DEFAULT_BOOK_ID });
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
        navigateToView('bookshelf');
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
    theme === 'light'
      ? 'bg-[#F8FAFC] text-slate-900'
      : theme === 'sepia' && currentView === 'reader'
      ? 'bg-[#f7f3e8] text-[#5F4B32]'
      : 'bg-[#0F1224] text-slate-100';

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center transition-colors duration-200 ${
          theme === 'light' ? 'bg-[#F8FAFC]' : 'bg-[#0F1224]'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center animate-pulse">
            <img src="/assets/icon.svg" alt="Lumi Ícone" className="w-14 h-14 object-contain" />
          </div>
          <img src="/assets/logo_text.svg" alt="LUMI" className="h-5 w-auto object-contain opacity-90" />
        </div>
      </div>
    );
  }

  // Requirement 1 & 5: When not logged in, show inspiring welcome & onboarding experience
  if (!user) {
    return (
      <div className={`min-h-screen flex flex-col transition-colors duration-200 ${themeBg}`}>
        <LmsWelcomeScreen theme={theme} onChangeTheme={handleChangeTheme} />
        <LoginModal theme={theme} />
      </div>
    );
  }

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

      {currentView === 'book-admin' ? (
        <LmsAdminDashboard
          books={booksList}
          onRefreshData={() => {
            fetchTrainings();
            fetchLibrary();
          }}
          onBackToLms={() => navigateToView('bookshelf')}
          onEditBook={(bookId) => handleOpenEditBook(bookId)}
          onDeleteBook={handleDeleteBook}
          onReprocessBook={handleReprocessBook}
          onOpenPdfForBook={(bookId) => {
            const found = booksList.find((b) => b.id === bookId) || activeBook;
            setPdfTargetBook(found);
            setIsPdfOpen(true);
          }}
          onOpenUpload={handleOpenUpload}
          initialTab="library"
          theme={theme}
        />
      ) : currentView === 'reader' ? (
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
            onOpenLibrary={() => {
              navigateToView('bookshelf');
            }}
            onOpenLms={() => {
              navigateToView('lms-home');
            }}
            onOpenUpload={handleOpenUpload}
            onOpenEditor={() => setEditingBook(activeBook)}
            readChapters={readChaptersForActiveBook}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            totalBooksCount={Math.max(1, booksList.length)}
          />

          {/* Main E-Book Reader Area */}
          <div className="flex-1 flex flex-col min-h-screen transition-all duration-300 lg:pl-72">
            <Navbar
              onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
              onOpenSearch={() => setIsSearchOpen(true)}
              onOpenPdf={() => {
                setPdfTargetBook(activeBook);
                setIsPdfOpen(true);
              }}
              onPrintPdf={handleDownloadPdf}
              theme={theme}
              onChangeTheme={handleChangeTheme}
              fontSize={fontSize}
              onChangeFontSize={handleChangeFontSize}
              bookTitle={activeBook.titlePt}
              chapterTitle={isCoverPage ? 'Capa & Folha de Rosto' : currentChapter.titlePt}
              hasOriginalPdf={activeBook.hasOriginalPdf}
              onOpenUserProfile={() => navigateToView('user-profile')}
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
                onChangeTheme={handleChangeTheme}
                fontSize={fontSize}
                onChangeFontSize={handleChangeFontSize}
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
      ) : (
        /* LMS Main Layout with Left Sidebar & Top Navbar */
        <div
          className={`min-h-screen flex flex-col transition-colors duration-200 ${
            theme === 'light' ? 'bg-[#F8FAFC] text-slate-900' : 'bg-[#0F1224] text-slate-100'
          }`}
        >
          <LmsSidebar
            isOpen={isLmsSidebarOpen}
            onClose={() => setIsLmsSidebarOpen(false)}
            activeTab={
              currentView === 'bookshelf'
                ? 'bookshelf'
                : currentView === 'lms-bookmarks'
                ? 'bookmarks'
                : currentView === 'lms-certificates'
                ? 'certificates'
                : currentView === 'user-profile'
                ? 'profile'
                : currentView === 'lms-admin'
                ? 'admin'
                : 'home'
            }
            onSelectTab={(tab: LmsNavTab) => {
              setIsLmsSidebarOpen(false);
              if (tab === 'home') navigateToView('lms-home');
              else if (tab === 'bookmarks') navigateToView('lms-bookmarks');
              else if (tab === 'bookshelf') navigateToView('bookshelf');
              else if (tab === 'certificates') navigateToView('lms-certificates');
              else if (tab === 'profile') navigateToView('user-profile');
              else if (tab === 'admin') {
                setAdminInitialTab('metrics');
                navigateToView('lms-admin');
              }
            }}
            certificatesCount={certificates.length}
            theme={theme}
            onChangeTheme={handleChangeTheme}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebarCollapse}
          />

          <div
            className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
              isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
            }`}
          >
            <LmsNavbar
              onToggleSidebar={() => setIsLmsSidebarOpen((prev) => !prev)}
              searchQuery={lmsSearchQuery}
              onSearchChange={setLmsSearchQuery}
              selectedCategoryFilter={lmsCategoryFilter}
              onSelectCategoryFilter={(cat) => {
                if (cat === 'Conteúdos') {
                  navigateToView('bookshelf');
                } else {
                  setLmsCategoryFilter(cat);
                }
              }}
              pendingTrainings={pendingTrainings}
              onSelectTraining={handleSelectTraining}
              onOpenKnowledgeBase={() => navigateToView('bookshelf')}
              onOpenUserProfile={(tab) => {
                if (tab) setUserProfileTab(tab);
                navigateToView('user-profile', { tab });
              }}
              theme={theme}
              onChangeTheme={handleChangeTheme}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={handleToggleSidebarCollapse}
            />

            <main className="flex-1 px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto">
              {currentView === 'lms-home' && (
                <LmsHomeScreen
                  trainings={filteredTrainings}
                  bookmarkedIds={bookmarkedIds}
                  onToggleBookmark={handleToggleBookmark}
                  onSelectTraining={handleSelectTraining}
                  onOpenLibrary={() => navigateToView('bookshelf')}
                  theme={theme}
                />
              )}

              {currentView === 'lms-player' && activeTraining && (
                <LmsTrainingPlayer
                  training={activeTraining}
                  books={booksList}
                  onBack={() => navigateToView('lms-home')}
                  onToggleLessonProgress={(lessonId, audit) =>
                    handleToggleLessonProgress(activeTraining.id, lessonId, audit)
                  }
                  onOpenBook={(bookId) => handleSelectBook(bookId)}
                  onOpenCertificates={() => navigateToView('lms-certificates')}
                  theme={theme}
                />
              )}

              {currentView === 'bookshelf' && (
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
                  onOpenAdmin={() => {
                    setAdminInitialTab('library');
                    navigateToView('lms-admin', { tab: 'library' });
                  }}
                  onBackToLms={() => navigateToView('lms-home')}
                  isIntegrated={true}
                />
              )}

              {currentView === 'lms-bookmarks' && (
                <LmsBookmarksScreen
                  trainings={trainings}
                  bookmarkedIds={bookmarkedIds}
                  onToggleBookmark={handleToggleBookmark}
                  onSelectTraining={handleSelectTraining}
                  onOpenHome={() => navigateToView('lms-home')}
                  theme={theme}
                />
              )}

              {currentView === 'lms-certificates' && (
                <LmsCertificatesScreen
                  certificates={certificates}
                  onOpenHome={() => navigateToView('lms-home')}
                  theme={theme}
                />
              )}

              {currentView === 'user-profile' && (
                <LmsUserProfileScreen
                  initialTab={userProfileTab}
                  onSelectTraining={handleSelectTraining}
                  onOpenLibrary={() => navigateToView('bookshelf')}
                  onOpenHome={() => navigateToView('lms-home')}
                  theme={theme}
                />
              )}

              {currentView === 'lms-admin' && (
                <LmsAdminDashboard
                  books={booksList}
                  onRefreshData={() => {
                    fetchTrainings();
                    fetchLibrary();
                  }}
                  onBackToLms={() => navigateToView('lms-home')}
                  onEditBook={(bookId) => handleOpenEditBook(bookId)}
                  onDeleteBook={handleDeleteBook}
                  onReprocessBook={handleReprocessBook}
                  onOpenPdfForBook={(bookId) => {
                    const found = booksList.find((b) => b.id === bookId) || activeBook;
                    setPdfTargetBook(found);
                    setIsPdfOpen(true);
                  }}
                  onOpenUpload={handleOpenUpload}
                  initialTab={adminInitialTab}
                  theme={theme}
                />
              )}
            </main>
          </div>
        </div>
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
          navigateToView('reader', { bookId: newBook.id });
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
    <BrowserRouter>
      <PwaProvider>
        <AuthProvider
          onProgressLoaded={(map) => {
            if (progressLoadedCallback) {
              progressLoadedCallback(map);
            }
          }}
        >
          <LibraryApp onRegisterProgressLoaded={handleRegisterProgressLoaded} />
          <PwaInstallBanner />
        </AuthProvider>
      </PwaProvider>
    </BrowserRouter>
  );
}
