import React from 'react';
import { Play, X, ExternalLink } from 'lucide-react';
import { TrainingLesson } from '../../../../types/training';
import { getEmbedVideoUrl } from '../../../../utils/videoEmbed';
import { ReaderTheme } from '../../../Navbar';

export interface LessonPreviewModalProps {
  lesson: TrainingLesson | null;
  onClose: () => void;
  trainingTitle?: string;
  theme?: ReaderTheme;
}

export const LessonPreviewModal: React.FC<LessonPreviewModalProps> = ({
  lesson,
  onClose,
  trainingTitle,
  theme = 'dark',
}) => {
  if (!lesson) return null;
  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div
        className={`relative w-full max-w-4xl rounded-3xl overflow-hidden border shadow-2xl flex flex-col max-h-[90vh] ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#151934] border-slate-800 text-slate-100'
        }`}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-700/50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-base line-clamp-1">{lesson.title}</h3>
              <div className="text-xs text-slate-400 flex items-center space-x-2 mt-0.5">
                {trainingTitle && <span>{trainingTitle}</span>}
                {trainingTitle && <span>&bull;</span>}
                <span>{lesson.durationMinutes} minutos</span>
                <span>&bull;</span>
                <span className="capitalize">{lesson.videoType === 'youtube' ? 'YouTube' : 'Google Drive'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with 16:9 Player */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl">
            <iframe
              src={getEmbedVideoUrl(lesson.videoUrl, lesson.videoType)}
              title={lesson.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {lesson.description && (
            <div
              className={`p-4 rounded-xl border text-sm ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-700'
                  : 'bg-slate-900/60 border-slate-800 text-slate-300'
              }`}
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Descrição da Aula:</h4>
              <p>{lesson.description}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <a
              href={lesson.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-400 hover:underline inline-flex items-center space-x-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir link original ({lesson.videoType === 'youtube' ? 'YouTube' : 'Google Drive'})</span>
            </a>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow transition-colors cursor-pointer"
            >
              Fechar Visualizador
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
