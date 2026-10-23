import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
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
} from 'lucide-react';
import { BookSummary } from '../data/bookTypes';
import { ReaderTheme } from './Navbar';
import { useAuth } from '../context/AuthContext';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
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
  const [reprocessSuccess, setReprocessSuccess] = useState<string | null>(null);

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

  const modalBg = isDark
    ? 'bg-slate-900 border-slate-800 text-slate-100'
    : isSepia
    ? 'bg-[#f7f3e8] border-[#e3dac7] text-[#2c2217]'
    : 'bg-white border-slate-200 text-slate-900';

  const subCardBg = isDark
    ? 'bg-slate-950/70 border-slate-800'
    : isSepia
    ? 'bg-[#ece4d0]/80 border-[#dccfb4]'
    : 'bg-slate-50 border-slate-200';

  const mutedText = isDark ? 'text-slate-400' : isSepia ? 'text-[#705e4d]' : 'text-slate-500';

  const inputBg = isDark
    ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500'
    : isSepia
    ? 'bg-[#ece4d0] border-[#d8c7a7] text-[#2c2217] placeholder-[#8c7865]'
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
    if (isOpen) {
      fetchUsersAndStats();
    }
  }, [isOpen, fetchUsersAndStats]);

  // Filtered books
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      if (bookStatusFilter !== 'all' && b.status !== bookStatusFilter) {
        return false;
      }
      if (!bookSearch.trim()) return true;
      const q = bookSearch.toLowerCase().trim();
      return (
        b.titlePt.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        String(b.originalYear).includes(q) ||
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
    const q = userSearch.toLowerCase().trim();
    return usersList.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [usersList, userSearch]);

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / 10));
  const currentUsersPageItems = useMemo(() => {
    const start = (userPage - 1) * 10;
    return filteredUsers.slice(start, start + 10);
  }, [filteredUsers, userPage]);

  const handleExecuteReprocess = async (bookId: string) => {
    setReprocessingBookId(bookId);
    setReprocessSuccess(null);
    try {
      const res = await fetch(`/api/books/${encodeURIComponent(bookId)}/reprocess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Erro ao iniciar reprocessamento.');
        return;
      }

      setReprocessSuccess(`Conversão do livro ${bookId} reiniciada! Acompanhe o progresso.`);
      onRefreshLibrary();
      setTimeout(() => setReprocessSuccess(null), 5000);
    } catch (err) {
      console.error(err);
      alert('Falha na requisição de reprocessamento.');
    } finally {
      setReprocessingBookId(null);
    }
  };

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
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar chave.');
      }
      setApiKeyStatus({ isConfigured: true, maskedKey: data.maskedKey });
      setNewApiKey('');
      setKeyFeedback({ type: 'success', message: 'Chave GEMINI_API_KEY salva com sucesso!' });
      onRefreshLibrary();
    } catch (err: any) {
      setKeyFeedback({ type: 'error', message: err?.message || 'Erro ao atualizar chave de API.' });
    } finally {
      setSavingKey(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleBlockUser = async (userId: string, currentBlocked: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked: !currentBlocked }),
      });
      if (res.ok) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isBlocked: !currentBlocked } : u))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-5xl max-h-[92vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${modalBg}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-300 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-display">
                Painel do Administrador • Livro App
              </h2>
              <p className={`text-xs ${mutedText}`}>
                Gestão completa do acervo, usuários e inteligência artificial
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-black/10 dark:border-white/10 px-6 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('library')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'library'
                ? 'border-[#5C6BC0] text-[#5C6BC0]'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Manutenção do Acervo ({books.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-[#5C6BC0] text-[#5C6BC0]'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuários & Permissões ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('apikey')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'apikey'
                ? 'border-[#5C6BC0] text-[#5C6BC0]'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Configurações Gemini AI</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ============================================================== */}
          {/* TAB 1: ACERVO & MANUTENÇÃO (REVISADO PARA GRANDES BIBLIOTECAS)  */}
          {/* ============================================================== */}
          {activeTab === 'library' && (
            <div className="space-y-5">
              {/* Top Quick Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-3.5 rounded-2xl border ${subCardBg}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>
                    Total Catalogado
                  </span>
                  <p className="text-xl font-bold font-mono text-[#5C6BC0] mt-0.5">
                    {books.length}
                  </p>
                </div>

                <div className={`p-3.5 rounded-2xl border ${subCardBg}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>
                    Prontos para Leitura
                  </span>
                  <p className="text-xl font-bold font-mono text-emerald-500 mt-0.5">
                    {books.filter((b) => b.status === 'ready').length}
                  </p>
                </div>

                <div className={`p-3.5 rounded-2xl border ${subCardBg}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>
                    Em Processamento
                  </span>
                  <p className="text-xl font-bold font-mono text-amber-500 mt-0.5">
                    {books.filter((b) => b.status === 'processing').length}
                  </p>
                </div>

                <div className={`p-3.5 rounded-2xl border ${subCardBg}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>
                    Com Erro / Pendentes
                  </span>
                  <p className="text-xl font-bold font-mono text-rose-500 mt-0.5">
                    {books.filter((b) => b.status === 'error').length}
                  </p>
                </div>
              </div>

              {/* Feedback toast */}
              {reprocessSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{reprocessSuccess}</span>
                </div>
              )}

              {/* Advanced Search & Filtering Toolbar */}
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
                    placeholder="Consulta rápida: título, autor, ano ou nome do arquivo PDF..."
                    className={`w-full pl-10 pr-9 py-2 rounded-2xl border text-xs sm:text-sm outline-none focus:border-[#5C6BC0] transition-colors ${inputBg}`}
                  />
                  {bookSearch && (
                    <button
                      onClick={() => setBookSearch('')}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full ${mutedText} hover:text-current`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Status Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
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
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Books List / Table */}
              <div className="space-y-2.5">
                {currentBooksPageItems.length === 0 ? (
                  <div className="p-8 text-center text-xs opacity-60">
                    Nenhuma obra encontrada para os filtros selecionados.
                  </div>
                ) : (
                  currentBooksPageItems.map((b) => {
                    const isProcessing = b.status === 'processing';
                    const isReprocessing = reprocessingBookId === b.id;

                    return (
                      <div
                        key={b.id}
                        className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${subCardBg}`}
                      >
                        {/* Book Info */}
                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                          {b.coverImageUrl ? (
                            <img
                              src={b.coverImageUrl}
                              alt={b.titlePt}
                              className="w-12 h-16 object-cover rounded-xl border border-black/10 dark:border-white/10 shrink-0 shadow-sm"
                            />
                          ) : (
                            <div className="w-12 h-16 rounded-xl bg-[#5C6BC0]/15 border border-[#5C6BC0]/30 flex items-center justify-center shrink-0 text-[#5C6BC0]">
                              <BookOpen className="w-6 h-6" />
                            </div>
                          )}

                          <div className="min-w-0 space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm truncate">{b.titlePt}</h4>
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
                            </div>

                            <p className={`text-xs truncate ${mutedText}`}>
                              {b.author} • {b.originalYear} • {b.chapterCount} capítulos (~{b.totalEstimatedMinutes} min)
                            </p>

                            {/* Conversion Progress Bar if processing */}
                            {isProcessing && (
                              <div className="space-y-1 pt-1 max-w-md">
                                <div className="flex items-center justify-between text-[10px] text-amber-400">
                                  <span>{b.conversionProgress || 'Processando PDF...'}</span>
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
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
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
                            onClick={() => onDeleteBook(b.id)}
                            className="p-2 rounded-xl border border-rose-500/30 hover:bg-rose-500/15 text-rose-500 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                            title="Excluir obra permanentemente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden lg:inline">Excluir</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pagination Controls */}
              {totalBookPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-black/10 dark:border-white/10 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={mutedText}>Itens por página:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setBookPage(1);
                      }}
                      className={`py-1 px-2 rounded-lg border text-xs outline-none ${inputBg}`}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setBookPage((p) => Math.max(1, p - 1))}
                      disabled={bookPage === 1}
                      className="p-1.5 rounded-lg border border-black/10 dark:border-white/10 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="font-mono">
                      Página {bookPage} de {totalBookPages}
                    </span>

                    <button
                      onClick={() => setBookPage((p) => Math.min(totalBookPages, p + 1))}
                      disabled={bookPage >= totalBookPages}
                      className="p-1.5 rounded-lg border border-black/10 dark:border-white/10 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: USUÁRIOS E PERMISSÕES                                   */}
          {/* ============================================================== */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${mutedText}`} />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setUserPage(1);
                    }}
                    placeholder="Buscar usuário por nome ou e-mail..."
                    className={`w-full pl-10 pr-9 py-2 rounded-2xl border text-xs sm:text-sm outline-none focus:border-[#5C6BC0] transition-colors ${inputBg}`}
                  />
                </div>
                <div className="text-xs opacity-70">
                  Total de usuários: <strong>{usersList.length}</strong>
                </div>
              </div>

              {loadingUsers ? (
                <div className="py-12 flex justify-center text-[#5C6BC0]">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2.5">
                  {currentUsersPageItems.map((u) => {
                    const isSelf = user?.id === u.id;
                    return (
                      <div
                        key={u.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-4 ${subCardBg}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {u.picture ? (
                            <img
                              src={u.picture}
                              alt={u.name}
                              className="w-10 h-10 rounded-full object-cover border shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#5C6BC0]/20 text-[#5C6BC0] flex items-center justify-center font-bold text-xs shrink-0">
                              {u.name[0]}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold truncate">
                              {u.name} {isSelf && '(Você)'}
                            </h4>
                            <p className={`text-xs truncate ${mutedText}`}>{u.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleUpdateUserRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                            disabled={isSelf}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                              u.role === 'admin'
                                ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                                : 'bg-black/5 dark:bg-white/5 opacity-70'
                            }`}
                          >
                            {u.role === 'admin' ? 'Admin' : 'Leitor'}
                          </button>

                          <button
                            onClick={() => handleToggleBlockUser(u.id, u.isBlocked)}
                            disabled={isSelf}
                            className={`p-1.5 rounded-full border transition-colors cursor-pointer ${
                              u.isBlocked
                                ? 'bg-rose-500/20 text-rose-500 border-rose-500/40'
                                : 'text-emerald-500 border-emerald-500/40'
                            }`}
                            title={u.isBlocked ? 'Desbloquear usuário' : 'Bloquear usuário'}
                          >
                            {u.isBlocked ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: CHAVE GEMINI API                                        */}
          {/* ============================================================== */}
          {activeTab === 'apikey' && (
            <div className={`p-6 rounded-3xl border space-y-4 max-w-xl mx-auto ${subCardBg}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Chave de API do Google Gemini</h3>
                  <p className={`text-xs ${mutedText}`}>
                    Utilizada para estruturação de capítulos, resumos e extração inteligente de metadados
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 space-y-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>
                  Status Atual:
                </span>
                <p className="text-xs font-mono font-bold">
                  {apiKeyStatus.isConfigured
                    ? `Ativa (${apiKeyStatus.maskedKey || 'configurada'})`
                    : 'Nenhuma chave configurada no banco'}
                </p>
              </div>

              <form onSubmit={handleSaveApiKey} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Atualizar Chave GEMINI_API_KEY:</label>
                  <input
                    type="password"
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className={`w-full p-2.5 rounded-xl border text-xs outline-none focus:border-[#5C6BC0] ${inputBg}`}
                  />
                </div>

                {keyFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium ${
                      keyFeedback.type === 'success'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {keyFeedback.message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingKey || !newApiKey.trim()}
                  className="w-full py-2.5 rounded-xl bg-[#5C6BC0] hover:bg-[#4D5AB5] text-white font-bold text-xs disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {savingKey ? 'Validando e Salvando...' : 'Salvar Chave de API'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
