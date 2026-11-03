import React from 'react';
import {
  GraduationCap,
  Video,
  Users,
  CheckCircle2,
  Award,
  BookOpen,
  Layers,
} from 'lucide-react';
import { Training, TrainingReportSummary, StudentEnrollment } from '../../../../types/training';
import { ReaderTheme } from '../../../Navbar';

export interface MetricsTabProps {
  report: TrainingReportSummary | null;
  trainings: Training[];
  students: StudentEnrollment[];
  booksCount: number;
  theme?: ReaderTheme;
}

export const MetricsTab: React.FC<MetricsTabProps> = ({
  report,
  trainings,
  students,
  booksCount,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-blue-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cursos</span>
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black">{report?.totalTrainings ?? trainings.length}</div>
          <div className="text-xs text-slate-400 mt-1">
            {report?.totalPublished ?? trainings.filter((t) => t.isPublished).length} pub. /{' '}
            {report?.totalDrafts ?? trainings.filter((t) => !t.isPublished).length} rasc.
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-indigo-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Aulas</span>
            <Video className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black">{report?.totalLessons ?? 0}</div>
          <div className="text-xs text-slate-400 mt-1">Total de videoaulas</div>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Alunos</span>
            <Users className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black">{report?.totalUsers ?? students.length}</div>
          <div className="text-xs text-slate-400 mt-1">Usuários cadastrados ({students.length} matrículas)</div>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-amber-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Conclusões</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black">{report?.totalCompletions ?? 0}</div>
          <div className="text-xs text-slate-400 mt-1">Formações concluídas</div>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-purple-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Certificados</span>
            <Award className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black">{report?.totalCertificates ?? 0}</div>
          <div className="text-xs text-slate-400 mt-1">Emitidos com autenticidade</div>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-all ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-teal-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Biblioteca</span>
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black">{booksCount}</div>
          <div className="text-xs text-slate-400 mt-1">Obras literárias ativas</div>
        </div>
      </div>

      {/* Detailed Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Performance */}
        <div
          className={`p-6 rounded-2xl border ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-800'
          }`}
        >
          <h2 className="text-base font-semibold mb-4 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-blue-500" />
            <span>Desempenho por Categoria de Ministério</span>
          </h2>

          <div className="space-y-4">
            {report?.categoryStats?.map((cat) => (
              <div key={cat.category} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span>{cat.category}</span>
                  <span className="text-slate-400">
                    {cat.completedTrainings} de {cat.totalTrainings} formações ({cat.completionRatePercent}%)
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700/50">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                    style={{ width: `${Math.min(100, cat.completionRatePercent)}%` }}
                  />
                </div>
              </div>
            )) || <p className="text-sm text-slate-400">Nenhum dado por categoria disponível.</p>}
          </div>
        </div>

        {/* Recent Completions Feed */}
        <div
          className={`p-6 rounded-2xl border ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-800'
          }`}
        >
          <h2 className="text-base font-semibold mb-4 flex items-center space-x-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Últimas Formações Concluídas</span>
          </h2>

          <div className="space-y-3">
            {report?.recentCompletions && report.recentCompletions.length > 0 ? (
              report.recentCompletions.map((comp, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-xl border text-sm ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center font-bold text-slate-900 text-xs">
                      {comp.userName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{comp.userName}</div>
                      <div className="text-xs text-slate-400">{comp.trainingTitle}</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(comp.completedAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">Nenhuma conclusão recente registrada ainda.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
