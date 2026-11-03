import React from 'react';
import { UserCheck, RotateCcw } from 'lucide-react';
import { StudentEnrollment } from '../../../../types/training';
import { ReaderTheme } from '../../../Navbar';

export interface ConfirmActionModalProps {
  completingStudent: StudentEnrollment | null;
  onCancelComplete: () => void;
  onConfirmComplete: () => void;

  resettingStudent: StudentEnrollment | null;
  onCancelReset: () => void;
  onConfirmReset: () => void;

  actionInProgress: boolean;
  theme?: ReaderTheme;
}

export const ConfirmActionModal: React.FC<ConfirmActionModalProps> = ({
  completingStudent,
  onCancelComplete,
  onConfirmComplete,
  resettingStudent,
  onCancelReset,
  onConfirmReset,
  actionInProgress,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  if (completingStudent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
        <div
          className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#171B38] border-slate-800 text-slate-100'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <UserCheck className="w-6 h-6" />
          </div>

          <div className="text-center">
            <h3 className="font-bold text-lg">Aprovar Conclusão Manual?</h3>
            <p className="text-xs text-slate-400 mt-1">
              Você está prestes a aprovar formalmente o curso para o aluno:
            </p>
            <div className={`mt-3 p-3 rounded-xl border text-left text-xs space-y-1 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-700/50'
            }`}>
              <div>
                <span className="text-slate-400">Aluno:</span>{' '}
                <span className="font-semibold">{completingStudent.userName}</span>
              </div>
              <div>
                <span className="text-slate-400">Curso:</span>{' '}
                <span className="font-semibold">{completingStudent.trainingTitle}</span>
              </div>
              <div>
                <span className="text-slate-400">Progresso Atual:</span>{' '}
                <span className="font-semibold text-amber-400">
                  {completingStudent.completedLessonsCount} de {completingStudent.totalLessonsCount} aulas (
                  {completingStudent.progressPercent}%)
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Essa ação marcará todas as aulas como assistidas e emitirá o Certificado de Formação oficial com código
              de validação único.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onCancelComplete}
              disabled={actionInProgress}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                isLight
                  ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirmComplete}
              disabled={actionInProgress}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow transition-all disabled:opacity-50 cursor-pointer"
            >
              {actionInProgress ? 'Aprovando...' : 'Confirmar & Emitir Certificado'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (resettingStudent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
        <div
          className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#171B38] border-slate-800 text-slate-100'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
            <RotateCcw className="w-6 h-6" />
          </div>

          <div className="text-center">
            <h3 className="font-bold text-lg">Reiniciar Progresso do Aluno?</h3>
            <p className="text-xs text-slate-400 mt-1">
              Tem certeza que deseja zerar o progresso de{' '}
              <span className="font-bold">{resettingStudent.userName}</span> no curso{' '}
              <span className="font-bold">"{resettingStudent.trainingTitle}"</span>?
            </p>
            <p className="text-xs text-rose-400 mt-2">
              As aulas concluídas serão desmarcadas e o progresso voltará para 0%. O histórico anterior será apagado.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onCancelReset}
              disabled={actionInProgress}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer ${
                isLight
                  ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirmReset}
              disabled={actionInProgress}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs shadow transition-all disabled:opacity-50 cursor-pointer"
            >
              {actionInProgress ? 'Reiniciando...' : 'Sim, Reiniciar Progresso'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
