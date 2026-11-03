import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  Award,
  GraduationCap,
  Play,
  RotateCcw,
  Shield,
  ShieldCheck,
  Calendar,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Save,
  AlertCircle,
  Copy,
  Check,
  Filter,
  Search,
  ChevronRight,
  ExternalLink,
  Smartphone,
  Download,
  WifiOff,
} from 'lucide-react';
import { useAuth, User } from '../../context/AuthContext';
import { usePwa } from '../../context/PwaContext';
import { Training, UserCertificate } from '../../types/training';
import { ReaderTheme } from '../Navbar';
import { CertificatePreviewModal } from './admin/modals/CertificatePreviewModal';

export interface LmsUserProfileScreenProps {
  initialTab?: 'learning' | 'courses' | 'certificates' | 'profile';
  onSelectTraining: (training: Training) => void;
  onOpenLibrary?: () => void;
  onOpenHome?: () => void;
  theme?: ReaderTheme;
}

export const LmsUserProfileScreen: React.FC<LmsUserProfileScreenProps> = ({
  initialTab = 'learning',
  onSelectTraining,
  onOpenLibrary,
  onOpenHome,
  theme = 'dark',
}) => {
  const { user, isAdmin, updateProfile, logout } = useAuth();
  const { isInstallable, isInstalled, isIos, isOffline, promptInstall } = usePwa();
  const isLight = theme === 'light';

  // Navigation tab inside Profile Screen
  const [activeTab, setActiveTab] = useState<'learning' | 'courses' | 'certificates' | 'profile'>(
    initialTab
  );

  // Synchronize initialTab if changed externally (e.g. from navbar dropdown shortcut)
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Data fetching state
  const [isLoading, setIsLoading] = useState(true);
  const [enrolledTrainings, setEnrolledTrainings] = useState<Training[]>([]);
  const [allTrainings, setAllTrainings] = useState<Training[]>([]);
  const [certificates, setCertificates] = useState<UserCertificate[]>([]);
  const [metrics, setMetrics] = useState({
    enrolledCount: 0,
    completedCount: 0,
    totalLessonsCompleted: 0,
    totalHoursCompleted: 0,
    certificatesCount: 0,
    averageProgress: 0,
  });

  // Filters for Courses tab
  const [courseFilter, setCourseFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [courseSearch, setCourseSearch] = useState('');

  // Profile Form state
  const [name, setName] = useState(user?.name || '');
  const [picture, setPicture] = useState(user?.picture || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form feedback state
  const [isSaving, setIsSaving] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Certificate Preview Modal
  const [previewingCertificate, setPreviewingCertificate] = useState<UserCertificate | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Synchronize local form when user state loads
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPicture(user.picture || '');
    }
  }, [user]);

  // Fetch learning data, courses and certificates for the logged in user
  const fetchMyLearning = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/trainings/my-learning', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setEnrolledTrainings(data.enrolledTrainings || []);
        setAllTrainings(data.allTrainings || []);
        setCertificates(data.certificates || []);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      }
    } catch (err) {
      console.error('[UserProfile] Erro ao carregar dados de aprendizado:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyLearning();
  }, [fetchMyLearning]);

  // Filtered enrolled courses list
  const filteredCourses = useMemo(() => {
    return enrolledTrainings.filter((t) => {
      // Filter by progress status
      if (courseFilter === 'in_progress' && t.isCompleted) return false;
      if (courseFilter === 'completed' && !t.isCompleted) return false;

      // Filter by search query
      if (courseSearch.trim()) {
        const query = courseSearch.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesCategory = t.category.toLowerCase().includes(query);
        const matchesDesc = t.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesCategory && !matchesDesc) return false;
      }

      return true;
    });
  }, [enrolledTrainings, courseFilter, courseSearch]);

  // Handle Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);

    if (name.trim().length < 2) {
      setFormFeedback({ type: 'error', message: 'O nome completo deve conter pelo menos 2 caracteres.' });
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setFormFeedback({ type: 'error', message: 'A nova senha deve ter no mínimo 6 caracteres.' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setFormFeedback({ type: 'error', message: 'A confirmação da nova senha não confere.' });
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await updateProfile({
        name: name.trim(),
        picture: picture.trim() || undefined,
        currentPassword: currentPassword ? currentPassword : undefined,
        newPassword: newPassword ? newPassword : undefined,
      });

      if (res.success) {
        setFormFeedback({ type: 'success', message: 'Dados cadastrais atualizados com sucesso!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setFormFeedback(null), 4000);
      } else {
        setFormFeedback({ type: 'error', message: res.error || 'Erro ao atualizar dados do perfil.' });
      }
    } catch (err: any) {
      setFormFeedback({ type: 'error', message: err?.message || 'Falha ao atualizar dados.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Copy validation code helper
  const handleCopyCode = (cert: UserCertificate) => {
    navigator.clipboard.writeText(cert.validationCode);
    setCopiedCodeId(cert.id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Format member creation date
  const memberSince = useMemo(() => {
    if (!user?.createdAt) return 'Recentemente';
    try {
      const d = new Date(user.createdAt);
      return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    } catch {
      return 'Recentemente';
    }
  }, [user?.createdAt]);

  return (
    <div className="space-y-8 pb-20">
      {/* ============================================================== */}
      {/* 1. HERO USER HEADER BANNER                                      */}
      {/* ============================================================== */}
      <div
        className={`relative overflow-hidden rounded-3xl border p-6 sm:p-8 transition-all shadow-xl ${
          isLight
            ? 'bg-gradient-to-br from-white via-slate-50 to-blue-50/40 border-slate-200 text-slate-900 shadow-slate-200/50'
            : 'bg-gradient-to-br from-[#171B38] via-[#1D234A] to-[#11152E] border-slate-700/80 text-white shadow-black/40'
        }`}
      >
        {/* Glow ambient background effect */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* User Avatar & Identity */}
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative shrink-0">
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-blue-500/60 shadow-xl"
                />
              ) : (
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 text-white font-bold font-outfit text-2xl flex items-center justify-center shadow-xl border-2 border-white/20">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
              {isAdmin && (
                <span
                  className="absolute -bottom-1 -right-1 p-1 rounded-full bg-purple-600 text-white shadow-md border-2 border-slate-900"
                  title="Perfil de Administrador"
                >
                  <ShieldCheck className="w-4 h-4" />
                </span>
              )}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-outfit font-extrabold text-2xl sm:text-3xl tracking-tight truncate">
                  {user?.name || 'Aluno Renovada'}
                </h1>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-outfit uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                    <Shield className="w-3 h-3" /> Administrador
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-outfit uppercase tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30">
                    <GraduationCap className="w-3 h-3" /> Aluno
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs opacity-75 font-sans">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <span className="truncate">{user?.email}</span>
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Membro desde {memberSince}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Quick Links */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-auto">
            {onOpenHome && (
              <button
                onClick={onOpenHome}
                className={`px-4 py-2 rounded-xl text-xs font-bold font-outfit border transition-all cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-xs'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-white'
                }`}
              >
                Ir para o Início
              </button>
            )}
            <button
              onClick={() => logout()}
              className="px-4 py-2 rounded-xl text-xs font-bold font-outfit bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-500 dark:text-rose-300 transition-all cursor-pointer"
            >
              Sair da Conta
            </button>
          </div>
        </div>

        {/* Tab Navigation Bar inside Profile Screen */}
        <div className="mt-8 border-t border-current/10 pt-4 flex items-center space-x-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('learning')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-outfit transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'learning'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Métricas & Aprendizado</span>
          </button>

          <button
            onClick={() => setActiveTab('courses')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-outfit transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'courses'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Cursos Matriculados ({enrolledTrainings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('certificates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-outfit transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'certificates'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Certificados ({certificates.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold font-outfit transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Meus Dados & Segurança</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: METRICS & LEARNING OVERVIEW                             */}
      {/* ============================================================== */}
      {activeTab === 'learning' && (
        <div className="space-y-8 animate-fadeIn">
          {/* 6 Key Performance Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {/* 1. Matriculados */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-700/80'
              }`}
            >
              <div className="flex items-center justify-between text-blue-500 mb-2">
                <span className="text-[10px] font-bold font-outfit uppercase tracking-wider text-slate-400">
                  Matriculado
                </span>
                <GraduationCap className="w-4 h-4" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold font-outfit text-blue-500">
                {metrics.enrolledCount}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Cursos iniciados</p>
            </div>

            {/* 2. Concluídos */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-700/80'
              }`}
            >
              <div className="flex items-center justify-between text-emerald-500 mb-2">
                <span className="text-[10px] font-bold font-outfit uppercase tracking-wider text-slate-400">
                  Formações
                </span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold font-outfit text-emerald-500">
                {metrics.completedCount}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">100% concluídos</p>
            </div>

            {/* 3. Aulas Assistidas */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-700/80'
              }`}
            >
              <div className="flex items-center justify-between text-purple-500 mb-2">
                <span className="text-[10px] font-bold font-outfit uppercase tracking-wider text-slate-400">
                  Aulas
                </span>
                <Play className="w-4 h-4" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold font-outfit text-purple-500">
                {metrics.totalLessonsCompleted}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Aulas assistidas</p>
            </div>

            {/* 4. Horas Acumuladas */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-700/80'
              }`}
            >
              <div className="flex items-center justify-between text-indigo-500 mb-2">
                <span className="text-[10px] font-bold font-outfit uppercase tracking-wider text-slate-400">
                  Carga Horária
                </span>
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold font-outfit text-indigo-500">
                {metrics.totalHoursCompleted}h
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Horas de estudo</p>
            </div>

            {/* 5. Certificados Conquistados */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-700/80'
              }`}
            >
              <div className="flex items-center justify-between text-amber-500 mb-2">
                <span className="text-[10px] font-bold font-outfit uppercase tracking-wider text-slate-400">
                  Certificados
                </span>
                <Award className="w-4 h-4" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold font-outfit text-amber-500">
                {metrics.certificatesCount}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Diplomas oficiais</p>
            </div>

            {/* 6. Progresso Médio */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-700/80'
              }`}
            >
              <div className="flex items-center justify-between text-teal-500 mb-2">
                <span className="text-[10px] font-bold font-outfit uppercase tracking-wider text-slate-400">
                  Evolução
                </span>
                <TrendingUp className="w-4 h-4" />
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold font-outfit text-teal-500">
                {metrics.averageProgress}%
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Média de conclusão</p>
            </div>
          </div>

          {/* Section: Continuar Cursos em Andamento */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-5 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full inline-block shrink-0" />
                <h3
                  className={`text-lg sm:text-xl font-bold font-outfit tracking-tight ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  Continuar de Onde Parou
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('courses')}
                className="text-xs font-bold font-outfit text-blue-500 hover:text-blue-400 flex items-center gap-1 cursor-pointer"
              >
                <span>Ver todos os matriculados</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {enrolledTrainings.length === 0 ? (
              <div
                className={`p-8 sm:p-12 rounded-3xl border text-center space-y-4 ${
                  isLight
                    ? 'bg-white border-slate-200 text-slate-800 shadow-sm'
                    : 'bg-[#171B38] border-slate-700/80'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto border border-blue-500/20">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-outfit font-bold text-base">Nenhum treinamento iniciado ainda</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Explore os cursos do catálogo para iniciar sua capacitação e conquistar certificados oficiais.
                  </p>
                </div>
                {onOpenHome && (
                  <button
                    onClick={onOpenHome}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold font-outfit text-xs cursor-pointer shadow-md"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Explorar Catálogo de Cursos</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enrolledTrainings
                  .filter((t) => !t.isCompleted)
                  .slice(0, 3)
                  .map((training) => (
                    <div
                      key={training.id}
                      className={`group rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                        isLight
                          ? 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                          : 'bg-[#171B38] hover:bg-[#1D2248] border-slate-700/80'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Cover Image & Category */}
                        <div className="relative h-32 rounded-xl overflow-hidden bg-slate-800">
                          <img
                            src={training.coverImageUrl}
                            alt={training.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold font-outfit bg-black/60 text-white backdrop-blur-md border border-white/20">
                            {training.category}
                          </span>
                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-600 text-white shadow-md">
                            {training.progressPercent || 0}%
                          </span>
                        </div>

                        <div>
                          <h4 className="font-outfit font-bold text-sm line-clamp-1">{training.title}</h4>
                          <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                            {training.description}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar & Continue Button */}
                      <div className="pt-4 space-y-3 border-t border-current/10 mt-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                            <span>
                              {training.completedLessonsCount || 0} de {training.lessonsCount || 0} aulas
                            </span>
                            <span className="text-blue-500 font-bold">{training.workloadHours}h carga</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(training.progressPercent || 0, 5)}%` }}
                            />
                          </div>
                        </div>

                        <button
                          onClick={() => onSelectTraining(training)}
                          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold font-outfit text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Continuar Curso</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Section: Certificados Recentes Conquistados */}
          {certificates.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-5 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full inline-block shrink-0" />
                  <h3
                    className={`text-lg sm:text-xl font-bold font-outfit tracking-tight ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    Certificações Conquistadas
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('certificates')}
                  className="text-xs font-bold font-outfit text-amber-500 hover:text-amber-400 flex items-center gap-1 cursor-pointer"
                >
                  <span>Ver todos ({certificates.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {certificates.slice(0, 3).map((cert) => (
                  <div
                    key={cert.id}
                    className={`rounded-2xl border p-5 transition-all space-y-4 flex flex-col justify-between ${
                      isLight
                        ? 'bg-gradient-to-br from-white to-amber-50/30 border-amber-200/80 shadow-sm'
                        : 'bg-gradient-to-br from-[#171B38] to-[#211E30] border-amber-500/30 shadow-md'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="p-2 rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30">
                          <Award className="w-5 h-5" />
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(cert.issuedAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-outfit font-bold text-sm line-clamp-2">{cert.trainingTitle}</h4>
                        <p className="text-xs text-slate-400 mt-1">Carga Horária: {cert.workloadHours} horas</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-current/10 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Hash:</span>
                        <span className="font-bold text-amber-500 truncate max-w-[150px]">
                          {cert.validationCode}
                        </span>
                      </div>

                      <button
                        onClick={() => setPreviewingCertificate(cert)}
                        className="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-outfit text-xs transition-colors cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Visualizar Certificado</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: ENROLLED COURSES                                        */}
      {/* ============================================================== */}
      {activeTab === 'courses' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Controls Bar: Filters & Search */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-700/80'
            }`}
          >
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setCourseFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-outfit transition-all cursor-pointer whitespace-nowrap ${
                  courseFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-md'
                    : isLight
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Todos ({enrolledTrainings.length})
              </button>
              <button
                onClick={() => setCourseFilter('in_progress')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-outfit transition-all cursor-pointer whitespace-nowrap ${
                  courseFilter === 'in_progress'
                    ? 'bg-blue-600 text-white shadow-md'
                    : isLight
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Em Andamento ({enrolledTrainings.filter((t) => !t.isCompleted).length})
              </button>
              <button
                onClick={() => setCourseFilter('completed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-outfit transition-all cursor-pointer whitespace-nowrap ${
                  courseFilter === 'completed'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : isLight
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Concluídos ({enrolledTrainings.filter((t) => t.isCompleted).length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                placeholder="Buscar nos meus cursos..."
                className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs outline-none transition-all ${
                  isLight
                    ? 'bg-slate-100 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-500'
                    : 'bg-slate-800/80 border border-slate-700 text-white focus:border-blue-500'
                }`}
              />
            </div>
          </div>

          {/* Courses Grid */}
          {filteredCourses.length === 0 ? (
            <div
              className={`p-12 rounded-3xl border text-center space-y-3 ${
                isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-[#171B38] border-slate-700/80'
              }`}
            >
              <GraduationCap className="w-12 h-12 text-slate-400 mx-auto" />
              <p className="text-sm font-bold font-outfit">Nenhum curso encontrado com os filtros selecionados.</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {courseSearch ? 'Tente ajustar os termos da busca.' : 'Você ainda não possui cursos nesta categoria.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCourses.map((training) => (
                <div
                  key={training.id}
                  className={`group rounded-2xl border overflow-hidden transition-all flex flex-col justify-between ${
                    isLight
                      ? 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                      : 'bg-[#171B38] hover:bg-[#1D2248] border-slate-700/80'
                  }`}
                >
                  <div>
                    {/* Course Banner */}
                    <div className="relative h-40 bg-slate-800">
                      <img
                        src={training.coverImageUrl}
                        alt={training.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-bold font-outfit bg-black/60 text-white backdrop-blur-md border border-white/20">
                        {training.category}
                      </span>

                      {training.isCompleted ? (
                        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-bold font-outfit uppercase tracking-wider bg-emerald-500 text-white shadow-md flex items-center gap-1">
                          <Check className="w-3 h-3" /> Concluído
                        </span>
                      ) : (
                        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-blue-600 text-white shadow-md">
                          {training.progressPercent || 0}%
                        </span>
                      )}

                      <div className="absolute bottom-3 left-3 right-3">
                        <h4 className="font-outfit font-bold text-base text-white line-clamp-1">
                          {training.title}
                        </h4>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <p className="text-xs text-slate-400 line-clamp-2">{training.description}</p>

                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-blue-400" />
                          <span>{training.workloadHours} horas</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Play className="w-3 h-3 text-emerald-400" />
                          <span>{training.lessonsCount || 0} aulas</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress & Action button */}
                  <div className="p-4 pt-0 space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>Progresso</span>
                        <span
                          className={`font-bold ${
                            training.isCompleted ? 'text-emerald-500' : 'text-blue-500'
                          }`}
                        >
                          {training.completedLessonsCount || 0} de {training.lessonsCount || 0} aulas ({training.progressPercent || 0}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            training.isCompleted
                              ? 'bg-emerald-500'
                              : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                          }`}
                          style={{ width: `${Math.max(training.progressPercent || 0, 5)}%` }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectTraining(training)}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold font-outfit flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                        training.isCompleted
                          ? 'bg-slate-800 hover:bg-slate-700 text-white'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
                      }`}
                    >
                      {training.isCompleted ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Rever Curso Concluído</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Continuar Assistindo</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: CERTIFICATES                                            */}
      {/* ============================================================== */}
      {activeTab === 'certificates' && (
        <div className="space-y-6 animate-fadeIn">
          {certificates.length === 0 ? (
            <div
              className={`p-12 sm:p-16 rounded-3xl border text-center space-y-4 max-w-xl mx-auto shadow-xl ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-800 shadow-slate-200/50'
                  : 'bg-[#171B38] border-slate-700/80 text-white'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/30">
                <Award className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="font-outfit font-extrabold text-xl">Nenhum certificado emitido ainda</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Conclua 100% das videoaulas e atividades de qualquer curso obrigatório ou livre para receber seu certificado com selo de autenticidade da Igreja Presbiteriana Renovada.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('courses')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold font-outfit text-xs cursor-pointer shadow-md"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Continuar Cursos em Andamento</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className={`rounded-3xl border p-6 transition-all space-y-5 flex flex-col justify-between shadow-xl ${
                    isLight
                      ? 'bg-gradient-to-br from-white via-amber-50/20 to-white border-amber-200/80 shadow-amber-950/5'
                      : 'bg-gradient-to-br from-[#171B38] via-[#1D2140] to-[#141730] border-amber-500/30 shadow-black/40'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Top Seal */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-bold shadow-md">
                          <Award className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold font-outfit uppercase tracking-wider text-amber-500">
                            Certificado Oficial
                          </span>
                          <p className="text-[11px] font-mono text-slate-400">
                            {new Date(cert.issuedAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        {cert.workloadHours}h
                      </span>
                    </div>

                    <div>
                      <h4 className="font-outfit font-bold text-base line-clamp-2">{cert.trainingTitle}</h4>
                      <p className="text-xs text-slate-400 mt-1">Concedido a: {cert.userName}</p>
                    </div>

                    {/* Hash Code with Copy */}
                    <div
                      className={`p-3 rounded-2xl border text-xs font-mono flex items-center justify-between gap-2 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0E1122]/80 border-slate-800'
                      }`}
                    >
                      <div className="truncate">
                        <span className="text-[10px] uppercase text-slate-500 block">Autenticidade</span>
                        <span className="font-bold text-amber-500">{cert.validationCode}</span>
                      </div>
                      <button
                        onClick={() => handleCopyCode(cert)}
                        className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                        title="Copiar código verificador"
                      >
                        {copiedCodeId === cert.id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2">
                    <button
                      onClick={() => setPreviewingCertificate(cert)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold font-outfit text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Visualizar & Baixar (.pdf)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: PROFILE DATA & SECURITY                                 */}
      {/* ============================================================== */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
          <div
            className={`p-6 sm:p-8 rounded-3xl border shadow-xl ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
                : 'bg-[#171B38] border-slate-700/80 text-white'
            }`}
          >
            <div className="border-b border-current/10 pb-4 mb-6">
              <h3 className="font-outfit font-extrabold text-xl tracking-tight">Dados Cadastrais & Senha</h3>
              <p className="text-xs text-slate-400 mt-1">
                Mantenha suas informações pessoais e credenciais de acesso sempre atualizadas.
              </p>
            </div>

            {/* Feedback Alert */}
            {formFeedback && (
              <div
                className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 mb-6 animate-shake ${
                  formFeedback.type === 'success'
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                }`}
              >
                {formFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{formFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Nome Completo */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold font-outfit uppercase tracking-wider text-slate-400">
                  Nome Completo
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Seu nome completo"
                    className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs font-sans outline-none transition-all ${
                      isLight
                        ? 'bg-slate-100 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                        : 'bg-slate-800/80 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                </div>
              </div>

              {/* Endereço de E-mail (Disabled: primary account identity) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold font-outfit uppercase tracking-wider text-slate-400">
                    Endereço de E-mail
                  </label>
                  <span className="text-[10px] text-slate-500">Identificador da conta</span>
                </div>
                <div className="relative opacity-80">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs font-mono cursor-not-allowed ${
                      isLight ? 'bg-slate-200/60 border border-slate-300 text-slate-700' : 'bg-slate-900 border border-slate-800 text-slate-400'
                    }`}
                  />
                </div>
              </div>

              {/* Foto de Perfil (URL) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold font-outfit uppercase tracking-wider text-slate-400">
                  URL da Foto de Perfil (Opcional)
                </label>
                <input
                  type="url"
                  value={picture}
                  onChange={(e) => setPicture(e.target.value)}
                  placeholder="https://exemplo.com/sua-foto.jpg"
                  className={`w-full px-4 py-2.5 rounded-2xl text-xs font-sans outline-none transition-all ${
                    isLight
                      ? 'bg-slate-100 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      : 'bg-slate-800/80 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                />
              </div>

              {/* Password Section */}
              <div className="pt-4 border-t border-current/10 space-y-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <Lock className="w-4 h-4 text-blue-500" />
                  <span className="font-outfit font-bold text-xs uppercase tracking-wider">
                    Alteração de Senha (Opcional)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Preencha os campos abaixo caso deseje criar ou alterar sua senha de acesso. Deixe em branco para manter a senha atual.
                </p>

                {/* Senha Atual */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400">Senha Atual</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Informe sua senha atual (se já cadastrada)"
                      className={`w-full pl-4 pr-10 py-2.5 rounded-2xl text-xs font-mono outline-none transition-all ${
                        isLight
                          ? 'bg-slate-100 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-500'
                          : 'bg-slate-800/80 border border-slate-700 text-white focus:border-blue-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((p) => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Nova Senha */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400">Nova Senha</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                      className={`w-full pl-4 pr-10 py-2.5 rounded-2xl text-xs font-mono outline-none transition-all ${
                        isLight
                          ? 'bg-slate-100 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-500'
                          : 'bg-slate-800/80 border border-slate-700 text-white focus:border-blue-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((p) => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar Nova Senha */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400">Confirmar Nova Senha</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className={`w-full pl-4 pr-10 py-2.5 rounded-2xl text-xs font-mono outline-none transition-all ${
                        isLight
                          ? 'bg-slate-100 border border-slate-300 text-slate-900 focus:bg-white focus:border-blue-500'
                          : 'bg-slate-800/80 border border-slate-700 text-white focus:border-blue-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((p) => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 text-white font-bold font-outfit text-sm transition-all shadow-lg shadow-blue-900/40 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Salvando Alterações...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Progressive Web App (PWA) Card */}
          <div
            className={`p-6 sm:p-8 rounded-3xl border shadow-xl ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
                : 'bg-[#171B38] border-slate-700/80 text-white'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FE6E27] to-[#FF9F25] p-2 flex items-center justify-center shrink-0 shadow-md shadow-[#FE6E27]/30 text-white">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-outfit font-bold text-base">Aplicativo Lumi (PWA)</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Instale no seu celular, tablet ou computador para leitura em tela cheia e acesso offline.
                  </p>
                </div>
              </div>

              {isInstalled ? (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Instalado
                </span>
              ) : isInstallable ? (
                <button
                  onClick={() => promptInstall()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#FE6E27] hover:brightness-110 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 active:scale-95 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Instalar App</span>
                </button>
              ) : isIos ? (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30 shrink-0">
                  Compatível com Safari
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/5 text-slate-400 border border-white/10 shrink-0">
                  Suportado
                </span>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-current/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Suporte Offline:</strong> Os capítulos e cursos navegados são salvos em cache para acesso sem internet.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong>Ícone na Tela Inicial:</strong> Abra diretamente sem barras do navegador, com máxima imersão.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Preview Modal */}
      {previewingCertificate && (
        <CertificatePreviewModal
          certificate={previewingCertificate}
          onClose={() => setPreviewingCertificate(null)}
          theme={theme}
        />
      )}
    </div>
  );
};
