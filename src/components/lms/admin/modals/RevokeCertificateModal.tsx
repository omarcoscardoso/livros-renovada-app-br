import React from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { UserCertificate } from '../../../../types/training';
import { ReaderTheme } from '../../../Navbar';

export interface RevokeCertificateModalProps {
  revokingCert: UserCertificate | null;
  onClose: () => void;
  revocationResetProgress: boolean;
  setRevocationResetProgress: (val: boolean) => void;
  onRevokeSubmit: () => void;
  isRevokingCert: boolean;
  theme?: ReaderTheme;
}

export const RevokeCertificateModal: React.FC<RevokeCertificateModalProps> = ({
  revokingCert,
  onClose,
  revocationResetProgress,
  setRevocationResetProgress,
  onRevokeSubmit,
  isRevokingCert,
  theme = 'dark',
}) => {
  if (!revokingCert) return null;
  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className={`max-w-md w-full rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 border ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#171B38] border-slate-700 text-white'
        }`}
      >
        <div className="flex items-center gap-3 text-rose-500">
          <div className="p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-outfit font-black text-lg text-rose-500">Revogar Certificado</h3>
            <p className="text-xs text-slate-400">Exclusão e invalidação do documento oficial</p>
          </div>
        </div>

        <div
          className={`p-4 rounded-2xl border space-y-2 text-xs ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
          }`}
        >
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold font-outfit">Aluno:</span>
            <p className="font-bold text-sm">{revokingCert.userName}</p>
            {revokingCert.userEmail && <p className="text-slate-400 text-[11px]">{revokingCert.userEmail}</p>}
          </div>

          <div>
            <span className="text-slate-400 text-[10px] uppercase font-bold font-outfit">Curso:</span>
            <p className="font-semibold">{revokingCert.trainingTitle}</p>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-700/40">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold font-outfit">Código:</span>
              <p className="font-mono font-bold text-amber-500">{revokingCert.validationCode}</p>
            </div>
            <div className="text-right">
              <span className="text-slate-400 text-[10px] uppercase font-bold font-outfit">Emitido em:</span>
              <p className="font-mono text-slate-300">
                {new Date(revokingCert.issuedAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>

        {/* Reset Progress Option */}
        <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-700/60 bg-slate-800/40 cursor-pointer">
          <input
            type="checkbox"
            checked={revocationResetProgress}
            onChange={(e) => setRevocationResetProgress(e.target.checked)}
            className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
          />
          <div className="text-xs space-y-0.5">
            <span className="font-semibold block text-slate-200">
              Reverter status de conclusão do curso deste aluno para "Em Andamento"
            </span>
            <p className="text-[11px] text-slate-400">
              Recomendado para certificados emitidos por engano antes do cumprimento dos requisitos.
            </p>
          </div>
        </label>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isRevokingCert}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onRevokeSubmit}
            disabled={isRevokingCert}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-950/40 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            {isRevokingCert ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Revogando...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Revogação</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
