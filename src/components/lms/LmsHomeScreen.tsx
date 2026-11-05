import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Award,
  Bookmark,
  Sparkles,
  Play,
  Layers,
  BookOpen,
  Lock,
  AlertTriangle,
  X,
  ShieldCheck,
  GraduationCap,
} from 'lucide-react';
import { Training } from '../../types/training';
import { ReaderTheme } from '../Navbar';
import { useAuth } from '../../context/AuthContext';
import { formatWorkload } from '../../utils/workloadFormat';

interface LmsHomeScreenProps {
  trainings: Training[];
  bookmarkedIds: string[];
  onToggleBookmark: (trainingId: string) => void;
  onSelectTraining: (training: Training) => void;
  onOpenLibrary: () => void;
  theme?: ReaderTheme;
}

export const LmsHomeScreen: React.FC<LmsHomeScreenProps> = ({
  trainings,
  bookmarkedIds,
  onToggleBookmark,
  onSelectTraining,
  onOpenLibrary,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const { isAdmin } = useAuth();
  const [lockedModalTraining, setLockedModalTraining] = useState<Training | null>(null);

  // Banner Slider state
  const bannerTrainings = useMemo(() => {
    const featured = trainings.filter((t) => t.isFeatured);
    return featured.length > 0 ? featured : trainings.slice(0, 3);
  }, [trainings]);

  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [isBannerPaused, setIsBannerPaused] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  const handlePrevBanner = useCallback(() => {
    setActiveBannerIndex((prev) => (prev > 0 ? prev - 1 : bannerTrainings.length - 1));
  }, [bannerTrainings.length]);

  const handleNextBanner = useCallback(() => {
    setActiveBannerIndex((prev) => (prev < bannerTrainings.length - 1 ? prev + 1 : 0));
  }, [bannerTrainings.length]);

  // Carrossel dinâmico: auto-play a cada 6 segundos com pausa inteligente
  useEffect(() => {
    if (bannerTrainings.length <= 1 || isBannerPaused) return;

    const timer = setInterval(() => {
      setActiveBannerIndex((prev) => (prev < bannerTrainings.length - 1 ? prev + 1 : 0));
    }, 6000);

    return () => clearInterval(timer);
  }, [bannerTrainings.length, isBannerPaused]);

  // Suporte a swipe por toque no mobile/tablet para o carrossel
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    setIsBannerPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current !== null) {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartXRef.current - touchEndX;
      if (diff > 45) {
        handleNextBanner();
      } else if (diff < -45) {
        handlePrevBanner();
      }
      touchStartXRef.current = null;
    }
    setIsBannerPaused(false);
  };

  // Referências para rolagem horizontal suave das categorias no PC
  const categoryRowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const scrollCategory = (catKey: string, direction: 'left' | 'right') => {
    const el = categoryRowRefs.current[catKey];
    if (!el) return;
    const scrollDistance = Math.max(320, Math.round(el.clientWidth * 0.75));
    el.scrollBy({
      left: direction === 'left' ? -scrollDistance : scrollDistance,
      behavior: 'smooth',
    });
  };

  const currentBanner = bannerTrainings[activeBannerIndex];

  const handleCardClick = (training: Training) => {
    if (training.isLockedByPrerequisite && !isAdmin) {
      setLockedModalTraining(training);
      return;
    }
    onSelectTraining(training);
  };

  // Group trainings by Category (like Blocks in ZAMPlay HTML)
  const sections = useMemo(() => {
    const defaultCats = ['Institucionais', 'Liderança', 'Infantil', 'Louvor', 'Diaconia'];
    const extraCats = Array.from(
      new Set(
        trainings
          .map((t) => t.category)
          .filter((cat) => cat && !defaultCats.some((d) => d.toLowerCase() === cat.toLowerCase()))
      )
    );
    const allCats = [...defaultCats, ...extraCats];

    const defaultDescriptions: Record<string, string> = {
      institucionais: 'Conteúdos fundamentais que reforçam a visão, DNA e valores da Igreja Presbiteriana Renovada.',
      liderança: 'Formação bíblica para líderes de célula, supervisores e futuros coordenadores.',
      lideranca: 'Formação bíblica para líderes de célula, supervisores e futuros coordenadores.',
      infantil: 'Protocolos essenciais de acolhimento, proteção e pedagogia cristã para o Ministério Kids.',
      louvor: 'Capacitação espiritual e excelência técnica para músicos e cantores.',
      diaconia: 'Princípios do acolhimento cristão, serviço prático e organização nos cultos.',
    };
    const defaultTitles: Record<string, string> = {
      institucionais: 'Institucionais & Onboarding',
      liderança: 'Liderança & Desenvolvimento',
      lideranca: 'Liderança & Desenvolvimento',
      infantil: 'Ministério Infantil',
      louvor: 'Ministério de Louvor & Adoração',
      diaconia: 'Diaconia & Hospitalidade',
    };

    return allCats
      .map((cat) => {
        const items = trainings
          .filter((t) => t.category.toLowerCase() === cat.toLowerCase())
          .sort((a, b) => {
            // 1. Destaque na categoria sempre em 1º lugar
            const aCatFeat = a.isCategoryFeatured ? 1 : 0;
            const bCatFeat = b.isCategoryFeatured ? 1 : 0;
            if (aCatFeat !== bCatFeat) {
              return bCatFeat - aCatFeat;
            }
            // 2. Ordem cronológica por antiguidade: primeiro o mais antigo e segue para o mais recente (createdAt ASC)
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (aTime !== bTime) {
              return aTime - bTime;
            }
            return (a.orderIndex || 0) - (b.orderIndex || 0);
          });
        const key = cat.toLowerCase();
        return {
          title: defaultTitles[key] || cat,
          category: cat,
          description: defaultDescriptions[key] || `Capacitações e treinamentos para ${cat}.`,
          trainings: items,
        };
      })
      .filter((s) => s.trainings.length > 0);
  }, [trainings]);

  return (
    <div className="space-y-10 pb-16">
      {/* 1. TOP CAROUSEL OF BANNERS (Dinâmico com transição suave e moderna) */}
      {bannerTrainings.length > 0 && (
        <section
          onMouseEnter={() => setIsBannerPaused(true)}
          onMouseLeave={() => setIsBannerPaused(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={`relative rounded-3xl overflow-hidden border transition-all ${
            isLight
              ? 'border-slate-200 bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/80 shadow-xl'
              : 'border-slate-700/80 shadow-2xl bg-gradient-to-br from-[#171B38] via-[#1B2144] to-[#0F1224]'
          }`}
        >
          {/* Slides empilhados com cross-fade fluido cinematográfico */}
          <div className="relative min-h-[380px] sm:min-h-[420px] flex items-center">
            {bannerTrainings.map((banner, index) => {
              const isActive = index === activeBannerIndex;
              return (
                <div
                  key={banner.id}
                  className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out flex flex-col justify-between ${
                    isActive
                      ? 'opacity-100 z-10 pointer-events-auto transform-none'
                      : 'opacity-0 z-0 pointer-events-none scale-[1.01]'
                  }`}
                  aria-hidden={!isActive}
                >
                  {/* Background Image with Ambient Overlay */}
                  <div className="absolute inset-0 z-0 overflow-hidden">
                    <img
                      src={banner.bannerImageUrl || banner.coverImageUrl}
                      alt=""
                      className={`w-full h-full object-cover filter blur-[1px] transition-transform duration-1000 ease-out ${
                        isActive ? 'scale-105 opacity-25' : 'scale-100 opacity-0'
                      }`}
                    />
                    <div
                      className={`absolute inset-0 ${
                        isLight
                          ? 'bg-gradient-to-r from-white via-white/85 to-transparent'
                          : 'bg-gradient-to-r from-[#0F1224] via-[#0F1224]/80 to-transparent'
                      }`}
                    />
                    <div
                      className={`absolute inset-0 ${
                        isLight
                          ? 'bg-gradient-to-t from-white/90 via-transparent to-transparent'
                          : 'bg-gradient-to-t from-[#0F1224] via-transparent to-transparent'
                      }`}
                    />
                  </div>

                  {/* Banner Content */}
                  <div className="relative z-10 p-6 sm:p-10 max-w-2xl space-y-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-outfit uppercase tracking-wider ${
                          isLight
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-inner'
                        }`}
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} /> Destaque da Semana
                      </span>
                      {banner.isRequired && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-outfit uppercase tracking-wider ${
                            isLight
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          Obrigatória
                        </span>
                      )}
                    </div>

                    <h1
                      className={`text-2xl sm:text-4xl font-extrabold font-outfit tracking-tight leading-tight line-clamp-2 ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      {banner.title}
                    </h1>

                    <p
                      className={`text-xs sm:text-sm font-sans line-clamp-2 sm:line-clamp-3 leading-relaxed ${
                        isLight ? 'text-slate-600' : 'text-slate-300'
                      }`}
                    >
                      {banner.description}
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4">
                      <button
                        onClick={() => handleCardClick(banner)}
                        className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold font-outfit text-xs sm:text-sm shadow-xl transition-all cursor-pointer transform hover:scale-[1.02] ${
                          banner.isLockedByPrerequisite && !isAdmin
                            ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/40'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-950/40'
                        }`}
                      >
                        {banner.isLockedByPrerequisite && !isAdmin ? (
                          <>
                            <Lock className="w-4 h-4" />
                            <span>Bloqueado (Requer {banner.prerequisiteTrainingTitle || banner.prerequisiteCategoryName})</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-white" />
                            <span>
                              {banner.isCompleted
                                ? 'Rever Treinamento'
                                : banner.completedLessonsCount
                                ? 'Continuar Treinamento'
                                : 'Iniciar Treinamento'}
                            </span>
                          </>
                        )}
                      </button>

                      {banner.complementaryBookId && (
                        <button
                          onClick={onOpenLibrary}
                          className={`inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl font-bold font-outfit text-xs transition-all cursor-pointer ${
                            isLight
                              ? 'bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 shadow-sm'
                              : 'bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200'
                          }`}
                        >
                          <BookOpen className="w-4 h-4 text-emerald-500" />
                          <span>Livro de Apoio</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Banner Controls & Dots */}
          {bannerTrainings.length > 1 && (
            <div className="relative z-20 px-6 sm:px-10 pb-6 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {bannerTrainings.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveBannerIndex(i)}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      i === activeBannerIndex
                        ? 'w-7 bg-blue-500'
                        : isLight
                        ? 'w-2 bg-slate-300 hover:bg-slate-400'
                        : 'w-2 bg-white/20 hover:bg-white/40'
                    }`}
                    aria-label={`Banner ${i + 1}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevBanner}
                  className={`p-2.5 rounded-full border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                    isLight
                      ? 'bg-white/90 hover:bg-white text-slate-700 border-slate-300 shadow-sm'
                      : 'bg-slate-800/90 hover:bg-slate-700 text-white border-slate-700 shadow-lg'
                  }`}
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextBanner}
                  className={`p-2.5 rounded-full border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                    isLight
                      ? 'bg-white/90 hover:bg-white text-slate-700 border-slate-300 shadow-sm'
                      : 'bg-slate-800/90 hover:bg-slate-700 text-white border-slate-700 shadow-lg'
                  }`}
                  aria-label="Próximo"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* CATEGORY SECTIONS / TRILHAS (Com botões de rolagem suave para PC) */}
      {sections.map((section) => (
        <section key={section.category} className="space-y-4">
          <div
            className={`flex items-center justify-between border-b pb-2 ${
              isLight ? 'border-slate-200' : 'border-slate-800'
            }`}
          >
            <div>
              <h2
                className={`text-lg sm:text-xl font-bold font-outfit tracking-tight flex items-center gap-2 ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                <span className="w-2 h-5 bg-blue-500 rounded-full inline-block" />
                <span>{section.title}</span>
              </h2>
              <p
                className={`text-xs font-sans mt-0.5 ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                {section.description}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`text-xs font-mono font-medium ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {section.trainings.length} {section.trainings.length === 1 ? 'curso' : 'cursos'}
              </span>

              {/* Botões de rolagem horizontal no cabeçalho (visíveis no PC / Desktop) */}
              <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-current/10">
                <button
                  type="button"
                  onClick={() => scrollCategory(section.category, 'left')}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
                      : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title="Rolar cursos para a esquerda"
                  aria-label="Rolar cursos para a esquerda"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCategory(section.category, 'right')}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                    isLight
                      ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
                      : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title="Rolar cursos para a direita"
                  aria-label="Rolar cursos para a direita"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Carrossel de Cards com Rolagem Touch e Botões Flutuantes para PC */}
          <div className="relative group/carousel">
            {/* Botão Flutuante Esquerdo (Desktop / PC) */}
            <button
              type="button"
              onClick={() => scrollCategory(section.category, 'left')}
              className={`hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full border shadow-xl backdrop-blur-md opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 cursor-pointer hover:scale-110 active:scale-95 ${
                isLight
                  ? 'bg-white/95 hover:bg-white text-slate-800 border-slate-200 shadow-slate-300/50'
                  : 'bg-slate-900/95 hover:bg-slate-800 text-white border-slate-700 shadow-black/60'
              }`}
              title="Rolar para esquerda"
              aria-label="Rolar categoria para esquerda"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Botão Flutuante Direito (Desktop / PC) */}
            <button
              type="button"
              onClick={() => scrollCategory(section.category, 'right')}
              className={`hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full border shadow-xl backdrop-blur-md opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 cursor-pointer hover:scale-110 active:scale-95 ${
                isLight
                  ? 'bg-white/95 hover:bg-white text-slate-800 border-slate-200 shadow-slate-300/50'
                  : 'bg-slate-900/95 hover:bg-slate-800 text-white border-slate-700 shadow-black/60'
              }`}
              title="Rolar para direita"
              aria-label="Rolar categoria para direita"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Trilho de Cards Rolável */}
            <div
              ref={(el) => {
                categoryRowRefs.current[section.category] = el;
              }}
              className="flex items-stretch gap-4 sm:gap-5 overflow-x-auto pb-4 pt-1 scrollbar-none snap-x snap-mandatory scroll-smooth"
            >
            {section.trainings.map((training) => {
              const isFav = bookmarkedIds.includes(training.id);
              const progress = training.progressPercent || 0;

              return (
                <div
                  key={training.id}
                  onClick={() => handleCardClick(training)}
                  className={`group relative snap-start shrink-0 w-60 sm:w-68 rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between ${
                    isLight
                      ? 'border-slate-200 hover:border-blue-500/60 bg-white shadow-md hover:shadow-xl hover:shadow-blue-900/10'
                      : 'border-slate-700/80 hover:border-blue-500/60 bg-[#171B38] shadow-xl hover:shadow-2xl hover:shadow-blue-950/30'
                  }`}
                >
                  {/* Card Background Cover */}
                  <div
                    className={`relative w-full h-36 sm:h-40 overflow-hidden ${
                      isLight ? 'bg-slate-100' : 'bg-slate-900'
                    }`}
                  >
                    <img
                      src={training.coverImageUrl}
                      alt={training.title}
                      className={`w-full h-full object-cover transition-transform duration-500 ${
                        training.isLockedByPrerequisite ? 'filter grayscale-[40%] opacity-85' : 'group-hover:scale-105'
                      }`}
                    />
                    <div
                      className={`absolute inset-0 ${
                        isLight
                          ? 'bg-gradient-to-t from-white via-white/40 to-transparent'
                          : 'bg-gradient-to-t from-[#171B38] via-[#171B38]/30 to-transparent'
                      }`}
                    />

                    {/* Tag Obrigatória / Bloqueado / Destaque na Categoria */}
                    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start z-10 pointer-events-none">
                      {training.isLockedByPrerequisite ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold font-outfit uppercase tracking-wider bg-slate-900/90 text-amber-300 border border-amber-500/40 shadow-md flex items-center gap-1 backdrop-blur-md">
                          <Lock className="w-2.5 h-2.5 text-amber-400" />
                          <span>Requer: {training.prerequisiteTrainingTitle || training.prerequisiteCategoryName}</span>
                        </span>
                      ) : training.isRequired ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold font-outfit uppercase tracking-wider bg-rose-500/90 text-white shadow-md">
                          Obrigatória
                        </span>
                      ) : null}

                      {training.isCategoryFeatured && (
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold font-outfit uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md flex items-center gap-1 backdrop-blur-md border border-amber-300/30">
                          <Sparkles className="w-2.5 h-2.5 fill-current text-amber-100" />
                          <span>Destaque</span>
                        </span>
                      )}
                    </div>

                    {/* Lock overlay for locked courses */}
                    {training.isLockedByPrerequisite && (
                      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center">
                        <div className="p-2 rounded-2xl bg-slate-900/90 border border-amber-500/40 text-amber-400 shadow-xl flex items-center gap-1.5 px-3">
                          <Lock className="w-4 h-4" />
                          <span className="text-[10px] font-bold font-outfit uppercase tracking-wider">Bloqueado</span>
                        </div>
                      </div>
                    )}

                    {/* Bookmark icon button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleBookmark(training.id);
                      }}
                      className={`absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md border hover:scale-110 transition-transform ${
                        isLight
                          ? 'bg-white/90 border-slate-200 text-slate-700 shadow-sm'
                          : 'bg-slate-900/80 border-white/10 text-white'
                      }`}
                      title={isFav ? 'Remover dos favoritos' : 'Favoritar treinamento'}
                      aria-label={isFav ? 'Remover dos favoritos' : 'Favoritar treinamento'}
                    >
                      <Bookmark
                        className={`w-3.5 h-3.5 ${
                          isFav
                            ? 'fill-blue-500 text-blue-500'
                            : isLight
                            ? 'text-slate-500'
                            : 'text-white/80'
                        }`}
                      />
                    </button>

                    {/* Status Icon on Top of Cover */}
                    {training.isCompleted ? (
                      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold font-outfit shadow-md">
                        <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                        <span>Concluído</span>
                      </div>
                    ) : progress > 0 ? (
                      <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold font-mono shadow-md">
                        {progress}%
                      </div>
                    ) : null}
                  </div>

                  {/* Card Content Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <span
                        className={`text-[10px] font-bold font-outfit uppercase tracking-wider ${
                          isLight ? 'text-blue-600' : 'text-blue-400'
                        }`}
                      >
                        {training.targetAudience}
                      </span>
                      <h3
                        className={`font-outfit font-bold text-sm sm:text-base transition-colors line-clamp-2 leading-snug ${
                          isLight
                            ? 'text-slate-900 group-hover:text-blue-600'
                            : 'text-white group-hover:text-blue-300'
                        }`}
                      >
                        {training.title}
                      </h3>
                    </div>

                    <div
                      className={`space-y-2 pt-2 border-t ${
                        isLight ? 'border-slate-100' : 'border-slate-700/60'
                      }`}
                    >
                      {/* Meta stats */}
                      <div
                        className={`flex items-center justify-between text-[11px] ${
                          isLight ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <Clock className={`w-3 h-3 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                          <span>{formatWorkload(training.workloadHours)}</span>
                        </span>
                        <span>{training.lessonsCount} aulas</span>
                      </div>

                      {/* Progress Bar */}
                      <div
                        className={`w-full h-1.5 rounded-full overflow-hidden ${
                          isLight ? 'bg-slate-200' : 'bg-slate-800'
                        }`}
                      >
                        <div
                          className={`h-full transition-all duration-300 ${
                            training.isCompleted
                              ? 'bg-emerald-500'
                              : 'bg-gradient-to-r from-blue-500 to-indigo-400'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </section>
      ))}

      {/* Modal de Alerta de Pré-requisito Bloqueado */}
      {lockedModalTraining && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className={`relative w-full max-w-md rounded-3xl p-6 sm:p-8 border shadow-2xl space-y-6 ${
              isLight
                ? 'bg-white border-slate-200 text-slate-800'
                : 'bg-[#171B38] border-slate-700/80 text-white'
            }`}
          >
            <button
              onClick={() => setLockedModalTraining(null)}
              className={`absolute top-4 right-4 p-2 rounded-full transition-colors cursor-pointer ${
                isLight ? 'hover:bg-slate-100 text-slate-400' : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Lock className="w-8 h-8" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-outfit uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-3.5 h-3.5" />
                Pré-requisito Necessário
              </div>
              <h3 className="text-xl font-bold font-outfit">
                Treinamento Bloqueado
              </h3>
              <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                {lockedModalTraining.prerequisiteReason === 'course' || lockedModalTraining.prerequisiteTrainingTitle ? (
                  <>
                    Para cursar <strong className="text-blue-500">{lockedModalTraining.title}</strong>, é necessário primeiro concluir o treinamento pré-requisito:
                  </>
                ) : (
                  <>
                    Para cursar <strong className="text-blue-500">{lockedModalTraining.title}</strong>, que pertence à categoria <strong>{lockedModalTraining.category}</strong>, é necessário primeiro concluir todos os treinamentos da categoria pré-requisito:
                  </>
                )}
              </p>
            </div>

            <div
              className={`p-4 rounded-2xl border text-center space-y-1 ${
                isLight
                  ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                  : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2 font-bold font-outfit text-sm sm:text-base">
                <GraduationCap className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  {lockedModalTraining.prerequisiteTrainingTitle ||
                    lockedModalTraining.prerequisiteCategoryName ||
                    'Treinamento Pré-requisito'}
                </span>
              </div>
              <p className="text-[11px] opacity-80">
                {lockedModalTraining.prerequisiteTrainingTitle
                  ? 'Conclua este treinamento para liberar o próximo curso desta capacitação.'
                  : 'Conclua os treinamentos desta categoria para desbloquear o acesso.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              {isAdmin && (
                <button
                  onClick={() => {
                    const target = lockedModalTraining;
                    setLockedModalTraining(null);
                    onSelectTraining(target);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl font-bold font-outfit text-xs bg-amber-600 hover:bg-amber-500 text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-900/30"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Acessar como Administrador</span>
                </button>
              )}
              <button
                onClick={() => setLockedModalTraining(null)}
                className={`w-full py-2.5 px-4 rounded-xl font-bold font-outfit text-xs transition-colors cursor-pointer border ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
