import React from 'react';
import { Award, X, Sparkles, RefreshCw } from 'lucide-react';
import { Training } from '../../../../types/training';
import { ReaderTheme } from '../../../Navbar';

export interface IssueCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  registeredUsers: { id: string; name: string; email: string }[];
  trainings: Training[];
  issueCertForm: {
    userId: string;
    trainingId: string;
    userName: string;
    workloadHours: number;
  };
  setIssueCertForm: React.Dispatch<
    React.SetStateAction<{
      userId: string;
      trainingId: string;
      userName: string;
      workloadHours: number;
    }>
  >;
  onIssueCertificateSubmit: (e: React.FormEvent) => void;
  isIssuingCert: boolean;
  theme?: ReaderTheme;
}

export const IssueCertificateModal: React.FC<IssueCertificateModalProps> = ({
  isOpen,
  onClose,
  registeredUsers,
  trainings,
  issueCertForm,
  setIssueCertForm,
  onIssueCertificateSubmit,
  isIssuingCert,
  theme = 'dark',
}) => {
  if (!isOpen) return null;
  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div
        className={`max-w-lg w-full rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 border ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#171B38] border-slate-700 text-white'
        }`}
      >
        <div className="flex items-center justify-between border-b pb-4 border-slate-700/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-outfit font-black text-lg">Fornecer Novo Certificado</h3>
              <p className="text-xs text-slate-400">Emissão e validação manual de certificado ministerial</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onIssueCertificateSubmit} className="space-y-4">
          {/* Select Student */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold font-outfit uppercase tracking-wider text-slate-400">
              Aluno / Membro *
            </label>
            {registeredUsers.length > 0 ? (
              <select
                value={issueCertForm.userId}
                onChange={(e) => {
                  const uid = e.target.value;
                  const u = registeredUsers.find((user) => user.id === uid);
                  setIssueCertForm((prev) => ({
                    ...prev,
                    userId: uid,
                    userName: u?.name || prev.userName,
                  }));
                }}
                required
                className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-900'
                    : 'bg-slate-900 border-slate-700 text-white'
                }`}
              >
                <option value="">Selecione um aluno cadastrado...</option>
                {registeredUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.email ? `(${u.email})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                placeholder="ID do Usuário"
                value={issueCertForm.userId}
                onChange={(e) => setIssueCertForm((prev) => ({ ...prev, userId: e.target.value }))}
                className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-900'
                    : 'bg-slate-900 border-slate-700 text-white'
                }`}
              />
            )}
          </div>

          {/* Custom Student Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold font-outfit uppercase tracking-wider text-slate-400">
              Nome Completo no Certificado (Opcional)
            </label>
            <input
              type="text"
              placeholder="Deixe em branco para usar o nome do cadastro"
              value={issueCertForm.userName}
              onChange={(e) => setIssueCertForm((prev) => ({ ...prev, userName: e.target.value }))}
              className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                  : 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500'
              }`}
            />
          </div>

          {/* Select Training */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold font-outfit uppercase tracking-wider text-slate-400">
              Treinamento / Curso *
            </label>
            <select
              value={issueCertForm.trainingId}
              onChange={(e) => {
                const tid = e.target.value;
                const t = trainings.find((tr) => tr.id === tid);
                setIssueCertForm((prev) => ({
                  ...prev,
                  trainingId: tid,
                  workloadHours: t?.workloadHours || prev.workloadHours || 5,
                }));
              }}
              required
              className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-900'
                  : 'bg-slate-900 border-slate-700 text-white'
              }`}
            >
              <option value="">Selecione um curso...</option>
              {trainings.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.workloadHours}h)
                </option>
              ))}
            </select>
          </div>

          {/* Workload Hours */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold font-outfit uppercase tracking-wider text-slate-400">
              Carga Horária (Horas) *
            </label>
            <input
              type="number"
              min="1"
              max="500"
              required
              value={issueCertForm.workloadHours}
              onChange={(e) =>
                setIssueCertForm((prev) => ({ ...prev, workloadHours: Number(e.target.value) || 1 }))
              }
              className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-900'
                  : 'bg-slate-900 border-slate-700 text-white'
              }`}
            />
          </div>

          {/* Informational Callout */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold font-outfit">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Emissão com Autenticidade Registrada</span>
            </div>
            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              O sistema gerará um código criptográfico único de validação (ex: LUMI-2026-XXXX) e registrará a
              conclusão de 100% no histórico do aluno.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-700/50">
            <button
              type="button"
              onClick={onClose}
              disabled={isIssuingCert}
              className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isIssuingCert}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-950/40 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isIssuingCert ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Emitindo...</span>
                </>
              ) : (
                <>
                  <Award className="w-3.5 h-3.5" />
                  <span>Emitir Certificado</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
