import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldAlert,
  Users,
  BookOpen,
  KeyRound,
  Trash2,
  Edit3,
  RefreshCw,
  FileText,
  Check,
  AlertCircle,
  Loader2,
  Shield,
  UserCheck,
  UserX,
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowLeft,
  Award,
} from 'lucide-react';
import { BookSummary } from '../data/bookTypes';
import { ReaderTheme } from './Navbar';
import { useAuth } from '../context/AuthContext';

export interface AdminScreenProps {
  onBack: () => void;
  books: BookSummary[];
  onRefreshLibrary: () => void;
  onEditBook: (bookId: string) => void;
  onDeleteBook: (bookId: string) => void;
  onReprocessBook: (bookId: string) => void;
  onOpenPdfForBook: (bookId: string) => void;
  theme: ReaderTheme;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role: 'admin' | 'user';
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AdminStats {
  totalBooks: number;
  totalUsers: number;
  adminCount: number;
  hasGeminiKey: boolean;
  booksByStatus: {
    ready: number;
    processing: number;
    error: number;
  };
}

export const AdminScreen: React.FC<AdminScreenProps> = ({
  onBack,
  books,
  onRefreshLibrary,
  onEditBook,
  onDeleteBook,
  onReprocessBook,
  onOpenPdfForBook,
  theme,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'library' | 'users' | 'apikey'>('library');
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);

  // Library search, filter & pagination state
  const [bookSearch, setBookSearch] = useState('');
  const [bookStatusFilter, setBookStatusFilter] = useState<'all' | 'ready' | 'processing' | 'error'>('all');
  const [bookPage, setBookPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [reprocessingBookId, setReprocessingBookId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [togglingFeaturedId, setTogglingFeaturedId] = useState<string | null>(null);

  // User search & pagination
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);

  // Gemini API key state
  const [apiKeyStatus, setApiKeyStatus] = useState<{ isConfigured: boolean; maskedKey: string | null }>({
    isConfigured: false,
    maskedKey: null,
  });
  const [newApiKey, setNewApiKey] = useState<string>('');
  const [savingKey, setSavingKey] = useState<boolean>(false);
  const [keyFeedback, setKeyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isDark = theme === 'dark';
  const isSepia = theme === 'sepia';

  const pageBg = isDark
    ? 'bg-[#0F172A] text-slate-100'
    : isSepia
    ? 'bg-[#FBF0D9] text-[#2C2217]'
    : 'bg-[#F8F9FA] text-slate-900';

  const headerBg = isDark
    ? 'bg-[#1E293B]/90 border-slate-800'
    : isSepia
    ? 'bg-[#F5ECD7]/90 border-[#E8DCBF]'
    : 'bg-white/90 border-slate-200/90';

  const cardBg = isDark
    ? 'bg-[#1E293B] border-slate-800 text-slate-100'
    : isSepia
    ? 'bg-[#F7F3E8] border-[#E3DAC7] text-[#2C2217]'
    : 'bg-white border-slate-200 text-slate-900';

  const subCardBg = isDark
    ? 'bg-slate-950/60 border-slate-800/80'
    : isSepia
    ? 'bg-[#ECE4D0]/80 border-[#DCCFB4]'
    : 'bg-slate-50 border-slate-200';

  const mutedText = isDark ? 'text-slate-400' : isSepia ? 'text-[#705E4D]' : 'text-slate-500';

  const inputBg = isDark
    ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500'
    : isSepia
    ? 'bg-[#ECE4D0] border-[#D8C7A7] text-[#2C2217] placeholder-[#8C7865]'
    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400';

  const fetchUsersAndStats = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const [usersRes, statsRes, keyRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/stats'),
        fetch('/api/admin/api-key'),
      ]);

      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsersList(uData.users || []);
      }
      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData);
      }
      if (keyRes.ok) {
        const kData = await keyRes.json();
        setApiKeyStatus({
          isConfigured: kData.isConfigured,
          maskedKey: kData.maskedKey,
        });
      }
    } catch (err) {
      console.error('Erro ao buscar dados administrativos:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchUsersAndStats();
  }, [fetchUsersAndStats]);

  // Execute reprocess action
  const handleExecuteReprocess = async (bookId: string) => {
    if (reprocessingBookId) return;
    setReprocessingBookId(bookId);
    setActionFeedback(null);
    try {
      let res = await fetch(`/api/books/${encodeURIComponent(bookId)}/reprocess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (res.status === 404) {
        res = await fetch(`/api/admin/reprocess/${encodeURIComponent(bookId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          res.ok
            ? 'Resposta inesperada do servidor.'
            : `Erro ${res.status}: Servidor não retornou JSON ao reprocessar livro.`
        );
      }

      const data = await res.json();
      if (res.ok) {
        setActionFeedback('Reprocessamento iniciado em segundo plano com IA Gemini!');
        onRefreshLibrary();
        setTimeout(() => setActionFeedback(null), 4000);
      } else {
        alert(data.error || 'Erro ao reprocessar livro.');
      }
    } catch (err: any) {
      console.error('Erro ao disparar reprocessamento:', err);
      alert(err?.message || 'Falha de conexão com o servidor.');
    } finally {
      setReprocessingBookId(null);
    }
  };

  // Toggle Featured (Destaque Editorial)
  const handleToggleFeatured = async (bookId: string, nextFeatured: boolean) => {
    if (togglingFeaturedId) return;
    setTogglingFeaturedId(bookId);
    try {
      const res = await fetch(`/api/admin/books/${encodeURIComponent(bookId)}/featured`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: nextFeatured }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionFeedback(
          nextFeatured
            ? 'Obra marcada como Destaque Editorial com sucesso!'
            : 'Obra removida dos destaques editoriais.'
        );
        onRefreshLibrary();
        setTimeout(() => setActionFeedback(null), 3000);
      } else {
        alert(data.error || 'Erro ao atualizar destaque editorial.');
      }
    } catch (err) {
      console.error('Erro ao alterar destaque:', err);
      alert('Falha de conexão ao alterar destaque.');
    } finally {
      setTogglingFeaturedId(null);
    }
  };

  // User Actions
  const handleToggleRole = async (targetUser: AdminUser) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
        );
        fetchUsersAndStats();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao alterar permissão do usuário.');
      }
    } catch {
      alert('Falha de rede ao alterar cargo.');
    }
  };

  const handleToggleBlock = async (targetUser: AdminUser) => {
    const nextBlocked = !targetUser.isBlocked;
    try {
      const res = await fetch(`/api/admin/users/${targetUser.id}/block`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked: nextBlocked }),
      });
      if (res.ok) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, isBlocked: nextBlocked } : u))
        );
        fetchUsersAndStats();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao alterar status de bloqueio.');
      }
    } catch {
      alert('Falha de rede ao bloquear/desbloquear usuário.');
    }
  };

  // API Key Actions
  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newApiKey.trim()) return;
    setSavingKey(true);
    setKeyFeedback(null);
    try {
      const res = await fetch('/api/admin/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: newApiKey.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setKeyFeedback({ type: 'success', message: 'Chave Gemini salva com sucesso!' });
        setNewApiKey('');
        fetchUsersAndStats();
      } else {
        setKeyFeedback({
          type: 'error',
          message: data.error || 'Erro ao salvar chave Gemini.',
        });
      }
    } catch {
      setKeyFeedback({ type: 'error', message: 'Erro de conexão com o servidor.' });
    } finally {
      setSavingKey(false);
    }
  };

  // Filtered books
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      if (bookStatusFilter !== 'all' && b.status !== bookStatusFilter) {
        return false;
      }
      if (!bookSearch.trim()) return true;
      const q = bookSearch.toLowerCase();
      return (
        b.titlePt.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        (b.subtitlePt && b.subtitlePt.toLowerCase().includes(q)) ||
        (b.originalPdfName && b.originalPdfName.toLowerCase().includes(q))
      );
    });
  }, [books, bookStatusFilter, bookSearch]);

  const totalBookPages = Math.max(1, Math.ceil(filteredBooks.length / itemsPerPage));
  const currentBooksPageItems = useMemo(() => {
    const start = (bookPage - 1) * itemsPerPage;
    return filteredBooks.slice(start, start + itemsPerPage);
  }, [filteredBooks, bookPage, itemsPerPage]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return usersList;
    const q = userSearch.toLowerCase();
    return usersList.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [usersList, userSearch]);

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / 10));
  const currentUsersPageItems = useMemo(() => {
    const start = (userPage - 1) * 10;
    return filteredUsers.slice(start, start + 10);
  }, [filteredUsers, userPage]);

  // Security check: Only admins can view
  if (user?.role !== 'admin') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${pageBg}`}>
        <div className={`max-w-md w-full p-8 rounded-3xl border text-center space-y-4 shadow-xl ${cardBg}`}>
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold font-editorial">Acesso Restrito</h2>
          <p className={`text-xs ${mutedText} leading-relaxed`}>
            Esta página requer privilégios de Administrador do Lumi. Faça login com uma conta autorizada.
          </p>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#5C6BC0] text-white text-xs font-bold cursor-pointer shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar à Biblioteca</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${pageBg}`}>
      {/* Top Navigation Header */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md px-4 sm:px-8 py-3.5 transition-colors ${headerBg}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className={`p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${mutedText} hover:text-current`}
              title="Voltar à Biblioteca"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Biblioteca</span>
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#5C6BC0]/15 border border-[#5C6BC0]/30 text-[#5C6BC0] flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold font-sans tracking-tight leading-tight">
                  Painel do Administrador
                </h1>
                <p className={`text-[11px] ${mutedText}`}>
                  Lumi • Gestão do acervo, usuários e IA Gemini
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#5C6BC0]/15 text-[#5C6BC0] border border-[#5C6BC0]/30">
              <Award className="w-3.5 h-3.5" />
              <span>Admin: {user.name}</span>
            </span>

            <button
              onClick={onBack}
              className="px-4 py-2 rounded-xl bg-[#5C6BC0] hover:bg-[#4D5AB5] text-white text-xs font-bold shadow-md shadow-[#5C6BC0]/20 transition-all cursor-pointer"
            >
              Ver Biblioteca
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-black/10 dark:border-white/10 pb-3 overflow-x-auto text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'library'
                ? 'bg-[#5C6BC0] text-white shadow-md shadow-[#5C6BC0]/30'
                : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Acervo & Manutenção</span>
            <span className="ml-1 text-[10px] font-mono opacity-80 px-1.5 py-0.5 rounded-full bg-black/20 text-white">
              {books.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-[#5C6BC0] text-white shadow-md shadow-[#5C6BC0]/30'
                : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuários & Acessos</span>
            <span className="ml-1 text-[10px] font-mono opacity-80 px-1.5 py-0.5 rounded-full bg-black/20 text-white">
              {usersList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('apikey')}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all cursor-pointer ${
              activeTab === 'apikey'
                ? 'bg-[#5C6BC0] text-white shadow-md shadow-[#5C6BC0]/30'
                : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Configurações Gemini AI</span>
            {apiKeyStatus.isConfigured ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>
        </div>

        {/* Global Action Feedback Toast */}
        {actionFeedback && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
            <Check className="w-4 h-4 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 1: ACERVO & MANUTENÇÃO                                     */}
        {/* ============================================================== */}
        {activeTab === 'library' && (
          <div className="space-y-6">
            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className={`p-4 rounded-2xl border shadow-sm ${subCardBg}`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>
                  Total Catalogado
                </span>
                <p className="text-2xl font-bold font-mono text-[#5C6BC0] mt-1">
                  {books.length}
                </p>
              </div>

              <div className={`p-4 rounded-2xl border shadow-sm ${subCardBg}`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>
                  Prontos para Leitura
                </span>
                <p className="text-2xl font-bold font-mono text-emerald-500 mt-1">
                  {books.filter((b) => b.status === 'ready').length}
                </p>
              </div>

              <div className={`p-4 rounded-2xl border shadow-sm ${subCardBg}`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>
                  Em Processamento
                </span>
                <p className="text-2xl font-bold font-mono text-amber-500 mt-1">
                  {books.filter((b) => b.status === 'processing').length}
                </p>
              </div>

              <div className={`p-4 rounded-2xl border shadow-sm ${subCardBg}`}>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>
                  Com Erro / Pendentes
                </span>
                <p className="text-2xl font-bold font-mono text-rose-500 mt-1">
                  {books.filter((b) => b.status === 'error').length}
                </p>
              </div>
            </div>

            {/* Advanced Search, Filters & Actions */}
            <div className={`p-4 rounded-3xl border shadow-sm space-y-4 ${cardBg}`}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
                  <input
                    type="text"
                    value={bookSearch}
                    onChange={(e) => {
                      setBookSearch(e.target.value);
                      setBookPage(1);
                    }}
                    placeholder="Consulta rápida: título, autor, ano ou arquivo PDF original..."
                    className={`w-full pl-10 pr-9 py-2.5 rounded-2xl border text-xs sm:text-sm outline-none focus:border-[#5C6BC0] transition-colors ${inputBg}`}
                  />
                  {bookSearch && (
                    <button
                      onClick={() => setBookSearch('')}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full ${mutedText} hover:text-current`}
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Status Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
                  <button
                    onClick={() => {
                      setBookStatusFilter('all');
                      setBookPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-full font-semibold transition-colors cursor-pointer ${
                      bookStatusFilter === 'all'
                        ? 'bg-[#5C6BC0] text-white'
                        : 'bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => {
                      setBookStatusFilter('ready');
                      setBookPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-full font-semibold transition-colors cursor-pointer ${
                      bookStatusFilter === 'ready'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100'
                    }`}
                  >
                    Prontos
                  </button>
                  <button
                    onClick={() => {
                      setBookStatusFilter('processing');
                      setBookPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-full font-semibold transition-colors cursor-pointer ${
                      bookStatusFilter === 'processing'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100'
                    }`}
                  >
                    Processando
                  </button>
                  <button
                    onClick={() => {
                      setBookStatusFilter('error');
                      setBookPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-full font-semibold transition-colors cursor-pointer ${
                      bookStatusFilter === 'error'
                        ? 'bg-rose-500 text-white'
                        : 'bg-black/5 dark:bg-white/5 opacity-70 hover:opacity-100'
                    }`}
                  >
                    Erros
                  </button>

                  <button
                    onClick={onRefreshLibrary}
                    className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-[#5C6BC0] cursor-pointer"
                    title="Atualizar lista"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Books List Rows */}
              <div className="space-y-3">
                {currentBooksPageItems.length === 0 ? (
                  <div className="py-12 text-center text-xs opacity-60">
                    Nenhuma obra encontrada para os filtros selecionados.
                  </div>
                ) : (
                  currentBooksPageItems.map((b) => {
                    const isProcessing = b.status === 'processing';
                    const isReprocessing = reprocessingBookId === b.id;
                    const isTogglingFeatured = togglingFeaturedId === b.id;

                    return (
                      <div
                        key={b.id}
                        className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-[#5C6BC0]/40 ${subCardBg}`}
                      >
                        {/* Book Info */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          {b.coverImageUrl ? (
                            <img
                              src={b.coverImageUrl}
                              alt={b.titlePt}
                              className="w-14 h-20 object-cover rounded-xl border border-black/10 dark:border-white/10 shrink-0 shadow-sm"
                            />
                          ) : (
                            <div className="w-14 h-20 rounded-xl bg-[#5C6BC0]/15 border border-[#5C6BC0]/30 flex items-center justify-center shrink-0 text-[#5C6BC0]">
                              <BookOpen className="w-6 h-6" />
                            </div>
                          )}

                          <div className="min-w-0 space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm sm:text-base leading-tight truncate">
                                {b.titlePt}
                              </h4>

                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                                  b.status === 'ready'
                                    ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                                    : b.status === 'processing'
                                    ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30 animate-pulse'
                                    : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                                }`}
                              >
                                {b.status}
                              </span>

                              {b.isFeatured && (
                                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#FF7A00]/15 text-[#FF7A00] border border-[#FF7A00]/30">
                                  <Sparkles className="w-3 h-3 fill-current" />
                                  <span>Destaque Editorial</span>
                                </span>
                              )}
                            </div>

                            <p className={`text-xs truncate ${mutedText}`}>
                              {b.author} • {b.originalYear} • {b.chapterCount} capítulos (~{b.totalEstimatedMinutes} min)
                            </p>

                            {/* Conversion Progress Bar */}
                            {isProcessing && (
                              <div className="space-y-1 pt-1 max-w-md">
                                <div className="flex items-center justify-between text-[10px] text-amber-400">
                                  <span>{b.conversionProgress || 'Processando com IA...'}</span>
                                  <span className="font-mono font-bold">{b.conversionPercent ?? 10}%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                  <div
                                    className="h-full bg-amber-500 transition-all duration-300"
                                    style={{ width: `${Math.max(5, b.conversionPercent ?? 10)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center flex-wrap gap-2 shrink-0 self-end md:self-center">
                          {/* Toggle Destaque Editorial */}
                          <button
                            onClick={() => handleToggleFeatured(b.id, !b.isFeatured)}
                            disabled={isTogglingFeatured}
                            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                              b.isFeatured
                                ? 'bg-[#FF7A00]/15 border-[#FF7A00]/40 text-[#FF7A00] hover:bg-[#FF7A00]/25'
                                : 'border-black/10 dark:border-white/10 opacity-70 hover:opacity-100 hover:border-[#FF7A00]/50'
                            }`}
                            title={
                              b.isFeatured
                                ? 'Remover dos Destaques da Página Inicial'
                                : 'Promover para Destaque Editorial na Página Inicial'
                            }
                          >
                            {isTogglingFeatured ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className={`w-3.5 h-3.5 ${b.isFeatured ? 'fill-current' : ''}`} />
                            )}
                            <span className="hidden lg:inline">
                              {b.isFeatured ? 'Destaque' : 'Destacar'}
                            </span>
                          </button>

                          {b.hasOriginalPdf && (
                            <button
                              onClick={() => onOpenPdfForBook(b.id)}
                              className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-rose-500 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                              title="Ver PDF Original"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span className="hidden lg:inline">PDF</span>
                            </button>
                          )}

                          <button
                            onClick={() => onEditBook(b.id)}
                            className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            title="Editar Metadados e Capítulos"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                            <span className="hidden lg:inline">Editar</span>
                          </button>

                          {b.hasOriginalPdf && (
                            <button
                              onClick={() => handleExecuteReprocess(b.id)}
                              disabled={isProcessing || isReprocessing}
                              className="p-2 rounded-xl border border-[#5C6BC0]/30 hover:bg-[#5C6BC0]/15 text-[#5C6BC0] text-xs font-semibold flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                              title="Reprocessar com Inteligência Artificial Gemini"
                            >
                              {isReprocessing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                              )}
                              <span className="hidden lg:inline">Reprocessar</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (confirm(`Tem certeza que deseja excluir "${b.titlePt}" da biblioteca?`)) {
                                onDeleteBook(b.id);
                              }
                            }}
                            className="p-2 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            title="Excluir livro da biblioteca"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination Controls */}
              {totalBookPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-black/5 dark:border-white/5 text-xs">
                  <span className={mutedText}>
                    Página {bookPage} de {totalBookPages} ({filteredBooks.length} obras)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setBookPage((p) => Math.max(1, p - 1))}
                      disabled={bookPage === 1}
                      className="p-1.5 rounded-lg border border-black/10 dark:border-white/10 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setBookPage((p) => Math.min(totalBookPages, p + 1))}
                      disabled={bookPage === totalBookPages}
                      className="p-1.5 rounded-lg border border-black/10 dark:border-white/10 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: USUÁRIOS & ACESSOS                                      */}
        {/* ============================================================== */}
        {activeTab === 'users' && (
          <div className={`p-6 rounded-3xl border shadow-sm space-y-5 ${cardBg}`}>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-editorial">
                Gestão de Usuários
              </h3>
              <p className={`text-xs ${mutedText}`}>
                Controle permissões administrativas e bloqueio de usuários da plataforma
              </p>
            </div>

            <div className="relative max-w-md">
              <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserPage(1);
                }}
                placeholder="Buscar usuário por nome ou email..."
                className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs sm:text-sm outline-none focus:border-[#5C6BC0] transition-colors ${inputBg}`}
              />
            </div>

            <div className="space-y-2.5">
              {loadingUsers ? (
                <div className="py-12 flex items-center justify-center gap-2 text-xs opacity-70">
                  <Loader2 className="w-4 h-4 animate-spin text-[#5C6BC0]" />
                  <span>Carregando usuários...</span>
                </div>
              ) : currentUsersPageItems.length === 0 ? (
                <div className="py-12 text-center text-xs opacity-60">
                  Nenhum usuário encontrado.
                </div>
              ) : (
                currentUsersPageItems.map((u) => (
                  <div
                    key={u.id}
                    className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${subCardBg}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {u.picture ? (
                        <img
                          src={u.picture}
                          alt={u.name}
                          className="w-10 h-10 rounded-full object-cover border shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[#5C6BC0]/20 text-[#5C6BC0] font-bold flex items-center justify-center shrink-0 text-sm">
                          {u.name.slice(0, 1).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold truncate">{u.name}</p>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                              u.role === 'admin'
                                ? 'bg-[#5C6BC0]/20 text-[#5C6BC0] border border-[#5C6BC0]/40'
                                : 'bg-slate-500/10 text-slate-500'
                            }`}
                          >
                            {u.role.toUpperCase()}
                          </span>
                          {u.isBlocked && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-rose-500/20 text-rose-500 border border-rose-500/40">
                              BLOQUEADO
                            </span>
                          )}
                        </div>
                        <p className={`text-xs truncate ${mutedText}`}>{u.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleToggleRole(u)}
                        disabled={u.id === user.id}
                        className="px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                        title={
                          u.id === user.id
                            ? 'Você não pode alterar seu próprio cargo'
                            : 'Alternar entre Administrador e Usuário comum'
                        }
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>{u.role === 'admin' ? 'Tornar Usuário' : 'Tornar Admin'}</span>
                      </button>

                      <button
                        onClick={() => handleToggleBlock(u)}
                        disabled={u.id === user.id}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer ${
                          u.isBlocked
                            ? 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10'
                            : 'border-rose-500/30 text-rose-500 hover:bg-rose-500/10'
                        }`}
                        title={
                          u.id === user.id
                            ? 'Você não pode bloquear a si mesmo'
                            : u.isBlocked
                            ? 'Desbloquear usuário'
                            : 'Bloquear usuário'
                        }
                      >
                        {u.isBlocked ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Desbloquear</span>
                          </>
                        ) : (
                          <>
                            <UserX className="w-3.5 h-3.5" />
                            <span>Bloquear</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: CONFIGURAÇÕES GEMINI AI                                 */}
        {/* ============================================================== */}
        {activeTab === 'apikey' && (
          <div className={`p-6 rounded-3xl border shadow-sm space-y-6 max-w-2xl ${cardBg}`}>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-editorial">
                Chave da API Google Gemini
              </h3>
              <p className={`text-xs ${mutedText} mt-1`}>
                Necessária para conversão inteligente de PDFs, extração de metadados e resumos executivos.
              </p>
            </div>

            <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${subCardBg}`}>
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    apiKeyStatus.isConfigured
                      ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold">
                    Status: {apiKeyStatus.isConfigured ? 'Chave Ativa' : 'Não Configurada'}
                  </p>
                  <p className={`text-[11px] font-mono ${mutedText}`}>
                    {apiKeyStatus.maskedKey || 'Nenhuma chave salva no banco de dados'}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveApiKey} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5">
                  Atualizar / Inserir Chave de API
                </label>
                <input
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className={`w-full px-4 py-2.5 rounded-2xl border text-xs sm:text-sm font-mono outline-none focus:border-[#5C6BC0] transition-colors ${inputBg}`}
                />
                <p className={`text-[11px] ${mutedText} mt-1.5`}>
                  A chave é salva de forma segura e substitui a variável de ambiente se preenchida.
                </p>
              </div>

              {keyFeedback && (
                <div
                  className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
                    keyFeedback.type === 'success'
                      ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                  }`}
                >
                  {keyFeedback.type === 'success' ? (
                    <Check className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{keyFeedback.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={savingKey || !newApiKey.trim()}
                className="px-6 py-2.5 rounded-2xl bg-[#5C6BC0] hover:bg-[#4D5AB5] text-white text-xs font-bold shadow-md shadow-[#5C6BC0]/20 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-2"
              >
                {savingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                <span>Salvar Nova Chave</span>
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};
