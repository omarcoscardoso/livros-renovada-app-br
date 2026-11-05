import React from 'react';
import { ShieldCheck, Printer, X, Award } from 'lucide-react';
import { UserCertificate } from '../../../../types/training';
import { ReaderTheme } from '../../../Navbar';
import { formatWorkload } from '../../../../utils/workloadFormat';

export interface CertificatePreviewModalProps {
  certificate: UserCertificate | null;
  onClose: () => void;
  theme?: ReaderTheme;
}

export const CertificatePreviewModal: React.FC<CertificatePreviewModalProps> = ({
  certificate,
  onClose,
  theme = 'dark',
}) => {
  if (!certificate) return null;
  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div
        className={`max-w-3xl w-full my-8 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 border ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#171B38] border-slate-700 text-white'
        }`}
      >
        {/* Modal Controls Bar */}
        <div
          className={`flex items-center justify-between border-b pb-3 print:hidden ${
            isLight ? 'border-slate-200' : 'border-slate-700/80'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span className={`font-outfit font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Visualizador de Certificado Oficial
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold font-outfit text-xs cursor-pointer shadow-md"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-600'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Certificate Canvas */}
        <div
          id="printable-certificate"
          className="relative p-8 sm:p-12 rounded-3xl border-4 border-double border-amber-500/40 bg-gradient-to-b from-amber-500/5 via-transparent to-amber-500/5 text-center space-y-6 shadow-inner"
        >
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shadow-lg">
              <Award className="w-9 h-9 stroke-[1.8]" />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-bold font-outfit uppercase tracking-widest text-amber-500">
              Igreja Presbiteriana Renovada de Viamão
            </p>
            <h2 className={`text-2xl sm:text-4xl font-serif font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Certificado de Conclusão
            </h2>
            <p className={`text-xs font-sans ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Plataforma Integrada de Educação & Liderança Cristã • LUMI
            </p>
          </div>

          <p className={`text-xs sm:text-sm font-sans max-w-xl mx-auto leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            Certificamos que{' '}
            <strong className={`font-serif text-lg font-black underline decoration-amber-500 underline-offset-4 block my-2 ${isLight ? 'text-slate-900' : 'text-amber-200'}`}>
              {certificate.userName}
            </strong>{' '}
            concluiu com êxito todas as etapas teóricas e práticas do treinamento oficial de:
          </p>

          <div
            className={`p-4 rounded-2xl border max-w-md mx-auto ${
              isLight ? 'bg-amber-50/60 border-amber-200' : 'bg-amber-500/10 border-amber-500/30'
            }`}
          >
            <h4 className="font-outfit font-extrabold text-base sm:text-lg text-amber-500">
              {certificate.trainingTitle}
            </h4>
            <p className={`text-xs font-mono mt-1 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Carga Horária Comprovada: <strong>{formatWorkload(certificate.workloadHours, { style: 'long' })}</strong>
            </p>
          </div>

          <div
            className={`pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
              isLight ? 'border-slate-200 text-slate-600' : 'border-slate-700 text-slate-400'
            }`}
          >
            <div className="text-left space-y-1">
              <p className="font-mono text-[11px]">
                Emitido em: {new Date(certificate.issuedAt).toLocaleDateString('pt-BR')}
              </p>
              <p className="font-mono text-[10px] text-slate-400">
                Documento assinado digitalmente pela liderança da IPR Viamão.
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold font-outfit tracking-wider text-amber-500">
                Código de Autenticidade:
              </span>
              <p className="font-mono font-extrabold text-sm text-amber-500">
                {certificate.validationCode}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
