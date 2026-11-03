import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Play,
  Clock,
  BookOpen,
  Award,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ExternalLink,
  Users,
  GraduationCap,
  Info,
  ListVideo,
  FileText,
  Share2,
  Lock,
  Unlock,
  ShieldCheck,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { Training, TrainingLesson, UserCertificate, VerificationMethod } from '../../types/training';
import { BookSummary } from '../../data/bookTypes';
import { ReaderTheme } from '../Navbar';
import {
  getEmbedVideoUrl,
  getVideoExternalUrl,
  isDirectVideoUrl,
} from '../../utils/videoEmbed';
import { useAuth } from '../../context/AuthContext';

function loadYouTubeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).YT && (window as any).YT.Player) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const existing = document.getElementById('youtube-iframe-api');
    if (existing) {
      if ((window as any).YT && (window as any).YT.Player) {
        resolve();
      } else {
        const prev = (window as any).onYouTubeIframeAPIReady;
        (window as any).onYouTubeIframeAPIReady = () => {
          if (prev) prev();
          resolve();
        };
      }
      return;
    }
    const tag = document.createElement('script');
    tag.id = 'youtube-iframe-api';
    tag.src = 'https://www.youtube.com/iframe_api';
    (window as any).onYouTubeIframeAPIReady = () => {
      resolve();
    };
    document.head.appendChild(tag);
  });
}

interface LmsTrainingPlayerProps {
  training: Training;
  onBack: () => void;
  onToggleLessonProgress: (
    lessonId: string,
    audit?: {
      secondsWatched?: number;
      durationSeconds?: number;
      watchPercent?: number;
      verifiedVia?: VerificationMethod | string;
    }
  ) => Promise<{ isCompleted: boolean; certificate?: UserCertificate | null }>;
  onOpenBook: (bookId: string) => void;
  onOpenCertificates: () => void;
  books?: BookSummary[];
  theme?: ReaderTheme;
}

export const LmsTrainingPlayer: React.FC<LmsTrainingPlayerProps> = ({
  training,
  onBack,
  onToggleLessonProgress,
  onOpenBook,
  onOpenCertificates,
  books = [],
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const { isAdmin } = useAuth();
  const [currentTraining, setCurrentTraining] = useState<Training>(training);
  const [activeLessonId, setActiveLessonId] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [issuedCert, setIssuedCert] = useState<UserCertificate | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'lessons' | 'about'>('lessons');

  // Audit & Watch Tracking States
  const [watchPercent, setWatchPercent] = useState<number>(0);
  const [dwellSeconds, setDwellSeconds] = useState<number>(0);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [isPausedByInactivity, setIsPausedByInactivity] = useState<boolean>(false);
  const ytPlayerRef = useRef<any>(null);
  const watchSecondsRef = useRef<number>(0);
  const intervalRef = useRef<any>(null);

  // Sincroniza estado se o objeto training mudar externamente
  useEffect(() => {
    setCurrentTraining(training);
  }, [training]);

  // Se o treinamento não tiver aulas preenchidas, busca detalhes completos via API
  useEffect(() => {
    let isMounted = true;
    if (!currentTraining.lessons || currentTraining.lessons.length === 0) {
      fetch(`/api/trainings/${encodeURIComponent(currentTraining.id)}`, {
        credentials: 'include',
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (isMounted && data?.training) {
            setCurrentTraining(data.training);
          }
        })
        .catch((err) => console.warn('Erro ao carregar lições do treinamento:', err));
    }
    return () => {
      isMounted = false;
    };
  }, [currentTraining.id]);

  const lessons = currentTraining.lessons || [];

  // Seleciona a primeira aula não concluída ou a primeira da lista
  useEffect(() => {
    if (lessons.length > 0) {
      if (!activeLessonId || !lessons.some((l) => l.id === activeLessonId)) {
        const firstIncomplete = lessons.find((l) => !l.isCompleted);
        setActiveLessonId(firstIncomplete?.id || lessons[0]?.id || '');
      }
    }
  }, [lessons, activeLessonId]);

  const activeLesson = lessons.find((l) => l.id === activeLessonId) || lessons[0];
  const activeLessonIndex = lessons.findIndex((l) => l.id === activeLesson?.id);

  // Target dwell time: e.g. 50% da duração da aula (clamped entre 20s e 300s)
  const targetDwellSeconds = useMemo(() => {
    const mins = activeLesson?.durationMinutes || 5;
    return Math.max(20, Math.min(Math.round(mins * 60 * 0.5), 300));
  }, [activeLesson?.durationMinutes]);

  // Auditoria e Rastreamento de Visualização / Presença Ativa
  useEffect(() => {
    if (!activeLesson) return;

    if (activeLesson.isCompleted) {
      setIsUnlocked(true);
      setWatchPercent(100);
      setDwellSeconds(targetDwellSeconds);
      return;
    }

    setIsUnlocked(false);
    setWatchPercent(0);
    setDwellSeconds(0);
    setIsPausedByInactivity(false);
    watchSecondsRef.current = 0;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // 1. YouTube Tracking via IFrame Player API
    if (activeLesson.videoType === 'youtube') {
      let isSubscribed = true;

      loadYouTubeApi().then(() => {
        if (!isSubscribed) return;
        const iframeId = `yt-player-${activeLesson.id}`;

        try {
          if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
            ytPlayerRef.current.destroy();
          }

          ytPlayerRef.current = new (window as any).YT.Player(iframeId, {
            events: {
              onStateChange: (event: any) => {
                // 1 = PLAYING
                if (event.data === 1) {
                  setIsPausedByInactivity(false);
                  if (!intervalRef.current) {
                    intervalRef.current = setInterval(() => {
                      if (!ytPlayerRef.current || typeof ytPlayerRef.current.getCurrentTime !== 'function') return;
                      const current = ytPlayerRef.current.getCurrentTime() || 0;
                      const total = ytPlayerRef.current.getDuration() || 1;
                      watchSecondsRef.current += 1;

                      const pct = Math.min(100, Math.round((current / total) * 100));
                      setWatchPercent(pct);

                      // Desbloqueia ao atingir 80% do vídeo com tempo real assistido
                      if ((pct >= 80 && watchSecondsRef.current >= total * 0.5) || current >= total - 5) {
                        setIsUnlocked(true);
                      }
                    }, 1000);
                  }
                } else {
                  if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                  }
                  if (event.data === 0) { // 0 = ENDED
                    setWatchPercent(100);
                    setIsUnlocked(true);
                  }
                }
              },
            },
          });
        } catch (err) {
          console.warn('[YT API] Instanciação do player:', err);
        }
      });

      // Safety fallback com base em permanência ativa
      const fallbackTimer = setInterval(() => {
        if (!document.hidden) {
          watchSecondsRef.current += 1;
          if (watchSecondsRef.current >= targetDwellSeconds) {
            setIsUnlocked(true);
            setWatchPercent((prev) => Math.max(prev, 85));
          }
        }
      }, 1000);

      return () => {
        isSubscribed = false;
        clearInterval(fallbackTimer);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
          try {
            ytPlayerRef.current.destroy();
          } catch {
            // ignore
          }
        }
      };
    }

    // 2. Google Drive / Outros (Presença Ativa com detecção de foco da página)
    const handleVisibility = () => {
      setIsPausedByInactivity(document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibility);

    intervalRef.current = setInterval(() => {
      if (document.hidden) {
        setIsPausedByInactivity(true);
        return;
      }
      setIsPausedByInactivity(false);

      setDwellSeconds((prev) => {
        const next = prev + 1;
        const pct = Math.min(100, Math.round((next / targetDwellSeconds) * 100));
        setWatchPercent(pct);
        if (next >= targetDwellSeconds) {
          setIsUnlocked(true);
        }
        return next;
      });
    }, 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activeLesson?.id, activeLesson?.isCompleted, activeLesson?.videoType, targetDwellSeconds]);

  const handleToggleComplete = async (lessonId: string, bypass = false) => {
    if (isUpdating) return;
    const target = lessons.find((l) => l.id === lessonId);
    if (!target) return;

    if (!target.isCompleted && !isUnlocked && !isAdmin && !bypass) {
      return;
    }

    setIsUpdating(true);
    try {
      const verifiedVia: VerificationMethod = isAdmin && bypass
        ? 'admin_manual'
        : target.videoType === 'youtube' && watchPercent >= 80
        ? 'youtube_api'
        : 'active_dwell_timer';

      const durationSeconds = (target.durationMinutes || 10) * 60;
      const secondsWatched = target.videoType === 'youtube'
        ? Math.round(watchSecondsRef.current || (durationSeconds * (watchPercent / 100)))
        : dwellSeconds;

      const res = await onToggleLessonProgress(lessonId, {
        secondsWatched,
        durationSeconds,
        watchPercent: isUnlocked || target.isCompleted ? Math.max(watchPercent, 85) : watchPercent,
        verifiedVia,
      });

      // Atualiza estado local imediatamente para feedback reativo instantâneo
      setCurrentTraining((prev) => {
        const updatedLessons = (prev.lessons || []).map((l) =>
          l.id === lessonId ? { ...l, isCompleted: res.isCompleted } : l
        );
        const completedCount = updatedLessons.filter((l) => l.isCompleted).length;
        const total = updatedLessons.length;
        const progressPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
        return {
          ...prev,
          lessons: updatedLessons,
          completedLessonsCount: completedCount,
          progressPercent,
          isCompleted: total > 0 && completedCount === total,
        };
      });

      if (res.certificate) {
        setIssuedCert(res.certificate);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNextLesson = () => {
    if (activeLessonIndex < lessons.length - 1) {
      setActiveLessonId(lessons[activeLessonIndex + 1].id);
    }
  };

  const handlePrevLesson = () => {
    if (activeLessonIndex > 0) {
      setActiveLessonId(lessons[activeLessonIndex - 1].id);
    }
  };

  const embedUrl = activeLesson ? getEmbedVideoUrl(activeLesson.videoUrl, activeLesson.videoType) : '';
  const externalVideoUrl = activeLesson ? getVideoExternalUrl(activeLesson.videoUrl, activeLesson.videoType) : '';
  const isDirect = activeLesson ? isDirectVideoUrl(activeLesson.videoUrl) : false;

  const totalCompleted = lessons.filter((l) => l.isCompleted).length;
  const progressPercent =
    lessons.length > 0 ? Math.round((totalCompleted / lessons.length) * 100) : currentTraining.progressPercent || 0;
  const isAllCompleted = progressPercent === 100 || currentTraining.isCompleted;

  // Informações do Livro Complementar
  const complementaryBook = useMemo(() => {
    if (!currentTraining.complementaryBookId) return null;
    return books.find((b) => b.id === currentTraining.complementaryBookId) || null;
  }, [currentTraining.complementaryBookId, books]);

  // Se o curso estiver bloqueado por pré-requisito e não for administrador, impede a exibição das aulas
  if (currentTraining.isLockedByPrerequisite && !isAdmin) {
    const isCoursePrereq = currentTraining.prerequisiteReason === 'course' || Boolean(currentTraining.prerequisiteTrainingTitle);

    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10">
          <Lock className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-outfit uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            Pré-requisito Necessário
          </div>
          <h1 className={`text-2xl sm:text-3xl font-extrabold font-outfit ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Treinamento Bloqueado
          </h1>
          <p className={`text-sm max-w-md mx-auto leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            {isCoursePrereq ? (
              <>
                Para cursar <strong>{currentTraining.title}</strong>, é necessário ter concluído todas as aulas do curso pré-requisito:
              </>
            ) : (
              <>
                Para cursar <strong>{currentTraining.title}</strong> (categoria <strong>{currentTraining.category}</strong>), é necessário ter concluído todos os treinamentos da categoria pré-requisito:
              </>
            )}
          </p>
        </div>

        <div
          className={`p-4 rounded-2xl border max-w-md mx-auto flex items-center justify-center gap-3 ${
            isLight
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
          }`}
        >
          <GraduationCap className="w-6 h-6 text-amber-400 shrink-0" />
          <span className="font-bold font-outfit text-base">
            {currentTraining.prerequisiteTrainingTitle || currentTraining.prerequisiteCategoryName || 'Pré-requisito Pendente'}
          </span>
        </div>

        <div className="pt-4 flex items-center justify-center gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold font-outfit text-sm shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar aos Treinamentos</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Aviso de Administrador quando bloqueado por pré-requisito */}
      {currentTraining.isLockedByPrerequisite && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs sm:text-sm flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
          <span>
            <strong>Modo Administrador:</strong> Este treinamento requer a conclusão prévia de{' '}
            <strong>{currentTraining.prerequisiteTrainingTitle ? `curso "${currentTraining.prerequisiteTrainingTitle}"` : `categoria "${currentTraining.prerequisiteCategoryName}"`}</strong>. O acesso foi liberado porque você possui perfil de Administrador.
          </span>
        </div>
      )}

      {/* 1. Top Header com Navegação e Progresso do Curso */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-outfit font-semibold transition-all cursor-pointer shadow-sm active:scale-95 ${
              isLight
                ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/70 text-slate-200 hover:text-white'
            }`}
          >
            <ArrowLeft className="w-4 h-4 text-blue-500" />
            <span>Voltar aos Treinamentos</span>
          </button>

          <span
            className={`hidden sm:inline-block w-1 h-1 rounded-full ${
              isLight ? 'bg-slate-300' : 'bg-slate-700'
            }`}
          />

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold font-outfit uppercase tracking-wider ${
                isLight
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
              }`}
            >
              {currentTraining.category}
            </span>
            {currentTraining.isRequired && (
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-outfit uppercase tracking-wider ${
                  isLight
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }`}
              >
                Obrigatório
              </span>
            )}
          </div>
        </div>

        {/* Barra de Progresso Rápida */}
        <div
          className={`flex items-center gap-3 px-4 py-2 rounded-2xl shadow-sm border ${
            isLight
              ? 'bg-white border-slate-200 text-slate-700'
              : 'bg-[#171B38]/80 border-slate-700/60'
          }`}
        >
          <span className={`text-xs font-sans ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Progresso Geral:
          </span>
          <div
            className={`w-24 sm:w-32 h-2 rounded-full overflow-hidden ${
              isLight ? 'bg-slate-200' : 'bg-slate-800'
            }`}
          >
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-mono font-bold text-emerald-500">
            {progressPercent}%
          </span>
          {isAllCompleted && (
            <button
              onClick={onOpenCertificates}
              className={`ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold font-outfit transition-all cursor-pointer ${
                isLight
                  ? 'bg-emerald-100 border border-emerald-300 text-emerald-800 hover:bg-emerald-200'
                  : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-emerald-500" />
              <span>Certificado</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Grid Principal: Vídeo na Esquerda, Informações do Curso + Playlist na Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda: Player de Vídeo e Informações da Aula (8 colunas) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Box de Vídeo 16:9 */}
          <div
            className={`relative w-full aspect-video rounded-3xl overflow-hidden border bg-black shadow-2xl ${
              isLight ? 'border-slate-300' : 'border-slate-700/80'
            }`}
          >
            {activeLesson ? (
              isDirect ? (
                <video
                  key={embedUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain bg-black"
                  onTimeUpdate={(e) => {
                    const video = e.currentTarget;
                    if (video.duration > 0) {
                      const pct = Math.min(100, Math.round((video.currentTime / video.duration) * 100));
                      setWatchPercent(pct);
                      if (pct >= 80) setIsUnlocked(true);
                    }
                  }}
                  onEnded={() => {
                    setWatchPercent(100);
                    setIsUnlocked(true);
                  }}
                >
                  <source src={embedUrl} />
                  Seu navegador não suporta reprodução direta deste vídeo.
                </video>
              ) : embedUrl ? (
                <iframe
                  id={`yt-player-${activeLesson.id}`}
                  key={embedUrl}
                  src={embedUrl}
                  title={activeLesson.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-3">
                  <Play className="w-12 h-12 text-slate-500 stroke-[1.5]" />
                  <p className="text-sm font-outfit font-semibold text-white">
                    Link de vídeo não configurado para esta aula.
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Você pode marcar esta aula como concluída após estudar o conteúdo ou livro complementar.
                  </p>
                </div>
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center space-y-2">
                <Play className="w-12 h-12 text-slate-500 stroke-[1.5]" />
                <p className="text-sm font-outfit font-semibold text-white">
                  Selecione uma aula na coluna ao lado para iniciar.
                </p>
              </div>
            )}
          </div>

          {/* Barra de Ação Rápida e Informações da Aula Atual */}
          {activeLesson && (
            <div
              className={`p-5 sm:p-6 rounded-3xl border shadow-xl space-y-4 ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
                  : 'bg-[#171B38] border-slate-700/80 shadow-xl text-white'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`font-outfit font-bold uppercase tracking-wider ${
                        isLight ? 'text-blue-600' : 'text-blue-400'
                      }`}
                    >
                      Aula {activeLessonIndex + 1} de {lessons.length}
                    </span>
                    <span className={isLight ? 'text-slate-300' : 'text-slate-500'}>•</span>
                    <span
                      className={`flex items-center gap-1 font-sans ${
                        isLight ? 'text-slate-600' : 'text-slate-400'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      {activeLesson.durationMinutes} minutos
                    </span>
                    <span className={isLight ? 'text-slate-300' : 'text-slate-500'}>•</span>
                    <span
                      className={`uppercase text-[10px] font-mono ${
                        isLight ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      {activeLesson.videoType === 'google_drive' ? 'Google Drive' : 'YouTube'}
                    </span>
                  </div>

                  <h2
                    className={`text-lg sm:text-2xl font-extrabold font-outfit tracking-tight leading-snug ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    {activeLesson.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
                  {externalVideoUrl && (
                    <a
                      href={externalVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border text-xs font-outfit font-semibold transition-all cursor-pointer ${
                        isLight
                          ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                          : 'bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white'
                      }`}
                      title="Abrir vídeo em nova aba caso prefira assistir externamente"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                      <span className="hidden sm:inline">Abrir Externo</span>
                    </a>
                  )}

                  {/* Botão de Conclusão com Auditoria e Trava de Segurança */}
                  {activeLesson.isCompleted ? (
                    <button
                      onClick={() => isAdmin && handleToggleComplete(activeLesson.id, true)}
                      disabled={!isAdmin || isUpdating}
                      className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold font-outfit transition-all shadow-lg ${
                        isLight
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                      } ${isAdmin ? 'cursor-pointer hover:bg-emerald-500/30' : 'cursor-default'}`}
                      title={isAdmin ? 'Clique para desmarcar (Privilégio Administrador)' : 'Aula concluída e auditada'}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 stroke-[3]" />
                      <span>Aula Concluída ✓</span>
                    </button>
                  ) : (
                    <>
                      {isAdmin && (
                        <button
                          onClick={() => handleToggleComplete(activeLesson.id, true)}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border text-xs font-outfit font-bold bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-all cursor-pointer"
                          title="Aprovação imediata de auditoria (Privilégio Administrador)"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                          <span className="hidden sm:inline">Liberar (Admin)</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleToggleComplete(activeLesson.id)}
                        disabled={!isUnlocked || isUpdating}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold font-outfit transition-all shadow-lg ${
                          isUnlocked
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/40 active:scale-95 cursor-pointer ring-2 ring-emerald-400/50'
                            : isLight
                            ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-80'
                            : 'bg-slate-800/80 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-80'
                        }`}
                        title={isUnlocked ? 'Clique para concluir esta aula!' : 'Assista ao vídeo ou cumpra o tempo de aula para liberar'}
                      >
                        {isUnlocked ? (
                          <>
                            <Check className="w-4 h-4 stroke-[3]" />
                            <span>Concluir Aula</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 text-amber-500/80" />
                            <span>Aguardando Visualização ({watchPercent}%)</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Box de Auditoria e Progresso de Visualização */}
              {activeLesson.isCompleted ? (
                <div
                  className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                    isLight
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-500">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold font-outfit">Aula Auditada & Validada ✓</p>
                      <p className="text-[11px] opacity-80">
                        {activeLesson.auditInfo
                          ? `Verificação via ${
                              activeLesson.auditInfo.verifiedVia === 'youtube_api'
                                ? 'YouTube Player API'
                                : activeLesson.auditInfo.verifiedVia === 'admin_manual'
                                ? 'Liberação Manual (Admin)'
                                : 'Presença Ativa'
                            } (${activeLesson.auditInfo.watchPercent}%)`
                          : 'Visualização completa registrada com sucesso no sistema.'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className={`p-3.5 rounded-2xl border space-y-2.5 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#131735] border-slate-700/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-1.5 rounded-xl ${
                          isUnlocked
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {isUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-bold font-outfit">
                          {isUnlocked ? 'Requisito de Visualização Atingido!' : 'Auditoria de Visualização Obrigatória'}
                        </p>
                        <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {activeLesson.videoType === 'youtube'
                            ? 'Assista ao vídeo no player acima (mínimo 80%) para liberar a conclusão.'
                            : 'Mantenha a aula aberta e ativa nesta aba para liberar a conclusão.'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-sm font-mono font-extrabold ${
                          isUnlocked ? 'text-emerald-500' : 'text-amber-500'
                        }`}
                      >
                        {watchPercent}%
                      </span>
                      <p
                        className={`text-[10px] uppercase font-bold font-outfit ${
                          isLight ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {isUnlocked ? 'Desbloqueado' : 'Mínimo 80%'}
                      </p>
                    </div>
                  </div>

                  {/* Barra de progresso da auditoria */}
                  <div
                    className={`w-full h-2 rounded-full overflow-hidden ${
                      isLight ? 'bg-slate-200' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`h-full transition-all duration-300 ${
                        isUnlocked
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : 'bg-gradient-to-r from-amber-500 to-orange-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(watchPercent, isUnlocked ? 100 : 0))}%` }}
                    />
                  </div>

                  {/* Aviso se a aba estiver em segundo plano */}
                  {isPausedByInactivity && (
                    <div className="flex items-center gap-2 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Aba em segundo plano ou inativa. A contagem de permanência está pausada.</span>
                    </div>
                  )}
                </div>
              )}

              {activeLesson.description && (
                <div
                  className={`border-t pt-3 ${
                    isLight ? 'border-slate-100 text-slate-600' : 'border-slate-700/60 text-slate-300'
                  }`}
                >
                  <p className="text-xs sm:text-sm leading-relaxed font-sans">
                    {activeLesson.description}
                  </p>
                </div>
              )}

              {/* Navegação Entre Aulas (Anterior / Próxima) */}
              <div
                className={`pt-2 flex items-center justify-between border-t text-xs ${
                  isLight ? 'border-slate-100' : 'border-slate-700/60'
                }`}
              >
                <button
                  onClick={handlePrevLesson}
                  disabled={activeLessonIndex <= 0}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer ${
                    isLight
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Aula Anterior</span>
                </button>

                <span
                  className={`text-[11px] font-mono hidden sm:inline ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  {activeLessonIndex + 1} de {lessons.length} aulas
                </span>

                <button
                  onClick={handleNextLesson}
                  disabled={activeLessonIndex >= lessons.length - 1}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold font-outfit disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer ${
                    isLight
                      ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                      : 'bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/30'
                  }`}
                >
                  <span>Próxima Aula</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Banner de Livro Complementar Integrado com a Biblioteca LUMI */}
          {currentTraining.complementaryBookId && (
            <div
              className={`p-5 rounded-3xl border shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isLight
                  ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/50 border-emerald-300/80 shadow-emerald-950/5'
                  : 'bg-gradient-to-r from-[#171B38] via-[#1A2248] to-[#121B3A] border-emerald-500/30 shadow-xl'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                    isLight
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300 shadow-sm'
                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-950/40'
                  }`}
                >
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                        isLight
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      Material Didático
                    </span>
                    <span
                      className={`text-xs font-semibold font-outfit ${
                        isLight ? 'text-emerald-700' : 'text-emerald-400'
                      }`}
                    >
                      Biblioteca LUMI
                    </span>
                  </div>
                  <h4
                    className={`font-outfit font-bold text-sm sm:text-base mt-0.5 ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    {complementaryBook ? complementaryBook.titlePt : 'Leitura Complementar Obrigatória'}
                  </h4>
                  <p
                    className={`text-[11px] font-sans line-clamp-1 ${
                      isLight ? 'text-slate-600' : 'text-slate-300'
                    }`}
                  >
                    {complementaryBook
                      ? `Por ${complementaryBook.author} • Recomendado para consolidar os ensinamentos deste treinamento.`
                      : 'Aprofunde seus estudos lendo a obra oficial vinculada na Biblioteca Digital.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onOpenBook(currentTraining.complementaryBookId!)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold font-outfit text-xs shrink-0 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer transform hover:scale-[1.02] active:scale-95"
              >
                <BookOpen className="w-4 h-4" />
                <span>Ler na Biblioteca</span>
              </button>
            </div>
          )}
        </div>

        {/* Coluna Direita: Informações do Curso & Grade de Aulas (4 colunas) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card de Apresentação e Informações do Curso */}
          <div
            className={`rounded-3xl border shadow-2xl overflow-hidden ${
              isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-[#171B38] border-slate-700/80 shadow-2xl'
            }`}
          >
            {/* Header com Capa e Gradiente */}
            <div className={`relative h-28 w-full overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-slate-900'}`}>
              <img
                src={currentTraining.coverImageUrl || currentTraining.bannerImageUrl}
                alt={currentTraining.title}
                className="w-full h-full object-cover opacity-60"
              />
              <div
                className={`absolute inset-0 ${
                  isLight
                    ? 'bg-gradient-to-t from-white via-white/50 to-transparent'
                    : 'bg-gradient-to-t from-[#171B38] via-[#171B38]/60 to-transparent'
                }`}
              />
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-outfit uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20">
                  {currentTraining.category}
                </span>
                {isAllCompleted && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-outfit uppercase tracking-wider bg-emerald-500/80 backdrop-blur-md text-slate-950 border border-emerald-400">
                    Aprovado ✓
                  </span>
                )}
              </div>
            </div>

            {/* Conteúdo do Card de Informações */}
            <div className="p-5 space-y-4 -mt-3 relative z-10">
              <div>
                <h3
                  className={`font-outfit font-black text-lg tracking-tight leading-tight ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  {currentTraining.title}
                </h3>
                <p
                  className={`text-xs font-sans mt-1.5 leading-relaxed line-clamp-3 ${
                    isLight ? 'text-slate-600' : 'text-slate-300'
                  }`}
                >
                  {currentTraining.description}
                </p>
              </div>

              {/* Metadados Rápidos do Curso */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div
                  className={`p-2.5 rounded-2xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1F254B]/70 border-slate-700/60'
                  }`}
                >
                  <div
                    className={`flex items-center gap-1.5 mb-0.5 ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[10px] uppercase font-bold font-outfit">Carga Horária</span>
                  </div>
                  <p
                    className={`font-outfit font-bold text-xs ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    {currentTraining.workloadHours} horas
                  </p>
                </div>

                <div
                  className={`p-2.5 rounded-2xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1F254B]/70 border-slate-700/60'
                  }`}
                >
                  <div
                    className={`flex items-center gap-1.5 mb-0.5 ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    <ListVideo className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[10px] uppercase font-bold font-outfit">Aulas</span>
                  </div>
                  <p
                    className={`font-outfit font-bold text-xs ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    {lessons.length} videoaulas
                  </p>
                </div>

                <div
                  className={`col-span-2 p-2.5 rounded-2xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1F254B]/70 border-slate-700/60'
                  }`}
                >
                  <div
                    className={`flex items-center gap-1.5 mb-0.5 ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] uppercase font-bold font-outfit">Público-Alvo</span>
                  </div>
                  <p
                    className={`font-outfit font-semibold text-xs ${
                      isLight ? 'text-slate-800' : 'text-slate-200'
                    }`}
                  >
                    {currentTraining.targetAudience}
                  </p>
                </div>
              </div>

              {/* Barra de Progresso do Aluno */}
              <div
                className={`p-3.5 rounded-2xl border space-y-2 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#141834] border-slate-700/80'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-outfit">
                  <span className={`font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    Seu Progresso
                  </span>
                  <span
                    className={`font-extrabold font-mono ${
                      isLight ? 'text-emerald-700' : 'text-emerald-400'
                    }`}
                  >
                    {totalCompleted} de {lessons.length} aulas ({progressPercent}%)
                  </span>
                </div>
                <div
                  className={`w-full h-2 rounded-full overflow-hidden ${
                    isLight ? 'bg-slate-200' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                {isAllCompleted && (
                  <div className="pt-1">
                    <button
                      onClick={onOpenCertificates}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold font-outfit text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-950/40 cursor-pointer"
                    >
                      <Award className="w-4 h-4" />
                      <span>Ver Meu Certificado Oficial</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Seletor de Abas da Direita (Grade de Aulas / Sobre o Curso) */}
          <div
            className={`rounded-3xl border shadow-2xl overflow-hidden p-4 space-y-3 ${
              isLight ? 'bg-white border-slate-200 shadow-slate-200/50' : 'bg-[#171B38] border-slate-700/80 shadow-2xl'
            }`}
          >
            <div
              className={`flex items-center p-1 rounded-2xl border ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#121630] border-slate-800'
              }`}
            >
              <button
                onClick={() => setSidebarTab('lessons')}
                className={`flex-1 py-2 rounded-xl text-xs font-outfit font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  sidebarTab === 'lessons'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ListVideo className="w-3.5 h-3.5" />
                <span>Grade de Aulas ({lessons.length})</span>
              </button>

              <button
                onClick={() => setSidebarTab('about')}
                className={`flex-1 py-2 rounded-xl text-xs font-outfit font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  sidebarTab === 'about'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>Sobre o Curso</span>
              </button>
            </div>

            {/* Conteúdo da Aba Selecionada */}
            {sidebarTab === 'lessons' ? (
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                {lessons.length === 0 ? (
                  <div
                    className={`p-6 text-center text-xs space-y-2 ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    <ListVideo className="w-8 h-8 text-slate-400 mx-auto" />
                    <p>Nenhuma aula cadastrada ainda para este curso.</p>
                  </div>
                ) : (
                  lessons.map((lesson, idx) => {
                    const isActive = lesson.id === activeLesson?.id;
                    return (
                      <div
                        key={lesson.id}
                        onClick={() => setActiveLessonId(lesson.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                          isActive
                            ? isLight
                              ? 'bg-blue-50/90 border-blue-500 shadow-md ring-1 ring-blue-400/50'
                              : 'bg-gradient-to-r from-blue-600/25 to-indigo-600/20 border-blue-500 shadow-lg shadow-blue-950/40 ring-1 ring-blue-500/50'
                            : isLight
                            ? 'bg-slate-50/80 hover:bg-slate-100/90 border-slate-200'
                            : 'bg-[#1E2548]/50 hover:bg-[#1E2548] border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Indicador de Status com Auditoria */}
                          {isAdmin ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleComplete(lesson.id, true);
                              }}
                              className={`shrink-0 cursor-pointer transition-colors p-0.5 ${
                                isLight
                                  ? 'text-slate-400 hover:text-emerald-600'
                                  : 'text-slate-400 hover:text-emerald-400'
                              }`}
                              title={lesson.isCompleted ? 'Concluída (Admin: clique para desmarcar)' : 'Admin: Liberar conclusão imediata'}
                            >
                              {lesson.isCompleted ? (
                                <CheckCircle2
                                  className={`w-5 h-5 stroke-[2.5] ${
                                    isLight ? 'text-emerald-600 fill-emerald-100' : 'text-emerald-400 fill-emerald-400/20'
                                  }`}
                                />
                              ) : (
                                <Circle className="w-5 h-5 text-amber-500/70 hover:text-emerald-500" />
                              )}
                            </button>
                          ) : (
                            <div
                              className={`shrink-0 p-0.5 flex items-center justify-center ${
                                lesson.isCompleted
                                  ? isLight
                                    ? 'text-emerald-600'
                                    : 'text-emerald-400'
                                  : isActive
                                  ? 'text-blue-500'
                                  : 'text-slate-400'
                              }`}
                              title={
                                lesson.isCompleted
                                  ? 'Aula Concluída e Auditada ✓'
                                  : isActive
                                  ? 'Aula em Andamento'
                                  : 'Aula Pendente (Requer visualização no player)'
                              }
                            >
                              {lesson.isCompleted ? (
                                <CheckCircle2
                                  className={`w-5 h-5 stroke-[2.5] ${
                                    isLight ? 'text-emerald-600 fill-emerald-100' : 'text-emerald-400 fill-emerald-400/20'
                                  }`}
                                />
                              ) : isActive ? (
                                <div className="w-5 h-5 rounded-full border-2 border-blue-500 flex items-center justify-center">
                                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                                </div>
                              ) : (
                                <Lock className="w-4 h-4 text-slate-400/70" />
                              )}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[10px] font-mono font-bold ${
                                  isLight ? 'text-slate-500' : 'text-slate-400'
                                }`}
                              >
                                {idx + 1}.
                              </span>
                              <p
                                className={`font-outfit text-xs font-bold truncate ${
                                  isActive
                                    ? isLight
                                      ? 'text-blue-900 font-extrabold'
                                      : 'text-white'
                                    : lesson.isCompleted
                                    ? isLight
                                      ? 'text-slate-500'
                                      : 'text-slate-300'
                                    : isLight
                                    ? 'text-slate-800'
                                    : 'text-slate-100'
                                }`}
                              >
                                {lesson.title}
                              </p>
                            </div>

                            <div
                              className={`flex items-center gap-2 mt-1 text-[10px] ${
                                isLight ? 'text-slate-500' : 'text-slate-400'
                              }`}
                            >
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span>{lesson.durationMinutes}m</span>
                              </span>
                              <span>•</span>
                              <span className="uppercase text-[9px] font-mono">
                                {lesson.videoType === 'google_drive' ? 'Drive' : 'YouTube'}
                              </span>
                              {isActive && (
                                <>
                                  <span>•</span>
                                  <span
                                    className={`font-bold font-outfit flex items-center gap-1 ${
                                      isLight ? 'text-blue-600' : 'text-blue-400'
                                    }`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                    Tocando agora
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Indicador de reprodução ou play hover */}
                        <div className="shrink-0">
                          {isActive ? (
                            <span className="p-1.5 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-900/40">
                              <Play className="w-3.5 h-3.5 fill-white" />
                            </span>
                          ) : (
                            <span
                              className={`p-1.5 rounded-xl transition-all flex items-center justify-center ${
                                isLight
                                  ? 'text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50'
                                  : 'text-slate-500 group-hover:text-white group-hover:bg-slate-700/60'
                              }`}
                            >
                              <Play className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* Aba Sobre o Curso */
              <div
                className={`space-y-4 p-2 text-xs font-sans max-h-[460px] overflow-y-auto ${
                  isLight ? 'text-slate-600' : 'text-slate-300'
                }`}
              >
                <div className="space-y-1">
                  <h4
                    className={`font-outfit font-bold text-xs uppercase tracking-wider ${
                      isLight ? 'text-blue-700' : 'text-blue-400'
                    }`}
                  >
                    Visão & Objetivo
                  </h4>
                  <p className="leading-relaxed">
                    {currentTraining.description}
                  </p>
                </div>

                <div
                  className={`p-3 rounded-2xl border space-y-2 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1E2548]/50 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap className={`w-4 h-4 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                    <h5
                      className={`font-outfit font-bold text-xs ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      Certificação Digital Oficial
                    </h5>
                  </div>
                  <p
                    className={`text-[11px] leading-relaxed ${
                      isLight ? 'text-slate-600' : 'text-slate-400'
                    }`}
                  >
                    Ao completar 100% de todas as aulas em vídeo, seu certificado oficial da Igreja Presbiteriana Renovada é emitido imediatamente, contendo código hash antifraude para validação pastoral.
                  </p>
                </div>

                {complementaryBook && (
                  <div
                    className={`p-3 rounded-2xl border space-y-2 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1E2548]/50 border-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
                      <h5
                        className={`font-outfit font-bold text-xs ${
                          isLight ? 'text-slate-900' : 'text-white'
                        }`}
                      >
                        Leitura Recomendada
                      </h5>
                    </div>
                    <p
                      className={`text-[11px] leading-relaxed ${
                        isLight ? 'text-slate-600' : 'text-slate-400'
                      }`}
                    >
                      <strong>{complementaryBook.titlePt}</strong>, de {complementaryBook.author}.
                    </p>
                    <button
                      onClick={() => onOpenBook(complementaryBook.id)}
                      className={`w-full py-1.5 rounded-xl font-bold font-outfit text-[11px] border transition-colors cursor-pointer ${
                        isLight
                          ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                          : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/30'
                      }`}
                    >
                      Acessar Livro na Biblioteca
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Modal de Celebração de Emissão do Certificado */}
      {issuedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="max-w-md w-full rounded-3xl bg-gradient-to-b from-[#171B38] to-[#0F1224] border-2 border-emerald-500 p-6 sm:p-8 shadow-2xl text-center space-y-5">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shadow-lg shadow-emerald-950/60">
              <Award className="w-10 h-10 text-emerald-400" />
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-outfit uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Sparkles className="w-3.5 h-3.5" /> Treinamento Concluído!
              </span>
              <h3 className="text-xl sm:text-2xl font-extrabold font-outfit text-white tracking-tight">
                {currentTraining.title}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                Parabéns! Você assistiu e concluiu todas as aulas deste treinamento. Seu <strong>Certificado Oficial</strong> já foi registrado e emitido em seu perfil.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-700/80 text-[11px] font-mono text-slate-400">
              Código de Validação: <strong className="text-emerald-400">{issuedCert.validationCode}</strong>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setIssuedCert(null);
                  onOpenCertificates();
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold font-outfit text-xs shadow-lg shadow-emerald-950/60 cursor-pointer"
              >
                Visualizar Meu Certificado
              </button>
              <button
                onClick={() => setIssuedCert(null)}
                className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold font-outfit text-xs border border-slate-700 cursor-pointer"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
