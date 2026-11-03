import React from 'react';
import { Bookmark, Clock, Play, BookOpen } from 'lucide-react';
import { Training } from '../../types/training';
import { ReaderTheme } from '../Navbar';

interface LmsBookmarksScreenProps {
  trainings: Training[];
  bookmarkedIds: string[];
  onToggleBookmark: (trainingId: string) => void;
  onSelectTraining: (training) => void;
  onOpenHome: () => void;
  theme?: ReaderTheme;
}

export const LmsBookmarksScreen: React.FC<LmsBookmarksScreenProps> = ({
  trainings,
  bookmarkedIds,
  onToggleBookmark,
  onSelectTraining,
  onOpenHome,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const bookmarkedTrainings = trainings.filter((t) => bookmarkedIds.includes(t.id));

  return (
    <div className="space-y-6 pb-20">
      <div
        className={`flex items-center justify-between border-b pb-4 ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-6 bg-gradient-to-b from-blue-400 to-indigo-600 rounded-full inline-block" />
            <h1
              className={`font-outfit font-extrabold text-2xl sm:text-3xl tracking-tight ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              Meus Favoritos
            </h1>
          </div>
          <p className={`text-xs font-sans ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Treinamentos e conteúdos que você salvou para assistir com calma.
          </p>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
            isLight
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
          }`}
        >
          {bookmarkedTrainings.length} {bookmarkedTrainings.length === 1 ? 'salvo' : 'salvos'}
        </span>
      </div>

      {bookmarkedTrainings.length === 0 ? (
        <div
          className={`p-10 sm:p-16 rounded-3xl border text-center space-y-4 max-w-xl mx-auto shadow-2xl ${
            isLight
              ? 'bg-white border-slate-200 text-slate-800 shadow-slate-200/50'
              : 'bg-[#171B38] border-slate-700/80'
          }`}
        >
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border ${
              isLight
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-inner'
            }`}
          >
            <Bookmark className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className={`font-outfit font-bold text-lg ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Nenhum treinamento favoritado
            </h3>
            <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Explore o catálogo de cursos e clique no ícone de marcador para salvar conteúdos aqui.
            </p>
          </div>

          <button
            onClick={onOpenHome}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold font-outfit text-xs shadow-lg shadow-blue-950/40 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Explorar Treinamentos</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {bookmarkedTrainings.map((t) => (
            <div
              key={t.id}
              onClick={() => onSelectTraining(t)}
              className={`group rounded-3xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between ${
                isLight
                  ? 'border-slate-200 hover:border-blue-500/60 bg-white shadow-md hover:shadow-xl hover:shadow-blue-900/10'
                  : 'border-slate-700/80 hover:border-blue-500/60 bg-[#171B38] shadow-xl hover:shadow-2xl hover:shadow-blue-950/30'
              }`}
            >
              <div className={`relative w-full h-40 overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-slate-900'}`}>
                <img
                  src={t.coverImageUrl}
                  alt={t.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  className={`absolute inset-0 ${
                    isLight
                      ? 'bg-gradient-to-t from-white via-white/30 to-transparent'
                      : 'bg-gradient-to-t from-[#171B38] via-[#171B38]/30 to-transparent'
                  }`}
                />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleBookmark(t.id);
                  }}
                  className={`absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md border hover:scale-110 transition-transform ${
                    isLight
                      ? 'bg-white/90 border-slate-200 text-blue-600 shadow-sm'
                      : 'bg-slate-900/80 border-white/10 text-blue-400'
                  }`}
                  title="Remover dos favoritos"
                  aria-label="Remover dos favoritos"
                >
                  <Bookmark className="w-3.5 h-3.5 fill-current" />
                </button>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <span
                    className={`text-[10px] font-bold font-outfit uppercase tracking-wider ${
                      isLight ? 'text-blue-600' : 'text-blue-400'
                    }`}
                  >
                    {t.targetAudience}
                  </span>
                  <h3
                    className={`font-outfit font-bold text-sm sm:text-base transition-colors line-clamp-2 leading-snug ${
                      isLight
                        ? 'text-slate-900 group-hover:text-blue-600'
                        : 'text-white group-hover:text-blue-300'
                    }`}
                  >
                    {t.title}
                  </h3>
                </div>

                <div
                  className={`flex items-center justify-between text-[11px] pt-2 border-t ${
                    isLight ? 'border-slate-100 text-slate-500' : 'border-slate-700/60 text-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Clock className={`w-3 h-3 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                    {t.workloadHours}h carga
                  </span>
                  <span>{t.lessonsCount} aulas</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
