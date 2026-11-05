import React, { useState } from 'react';
import {
  Award,
  Calendar,
  Clock,
  Printer,
  Share2,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  X,
  GraduationCap,
} from 'lucide-react';
import { UserCertificate } from '../../types/training';
import { ReaderTheme } from '../Navbar';
import { formatWorkload } from '../../utils/workloadFormat';

interface LmsCertificatesScreenProps {
  certificates: UserCertificate[];
  onOpenHome: () => void;
  theme?: ReaderTheme;
}

export const LmsCertificatesScreen: React.FC<LmsCertificatesScreenProps> = ({
  certificates,
  onOpenHome,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [selectedCert, setSelectedCert] = useState<UserCertificate | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = (cert: UserCertificate) => {
    const url = window.location.origin + `/api/certificates/${cert.id}`;
    if (navigator.share) {
      navigator
        .share({
          title: `Certificado Oficial - ${cert.trainingTitle}`,
          text: `Concluí o treinamento "${cert.trainingTitle}" pela plataforma LUMI da Igreja Presbiteriana Renovada!`,
          url,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Top Banner */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-6 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full inline-block" />
            <h1
              className={`font-outfit font-extrabold text-2xl sm:text-3xl tracking-tight ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              Meus Certificados
            </h1>
          </div>
          <p className={`text-xs font-sans ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Comprovantes oficiais de capacitação ministerial e conclusão de treinamentos.
          </p>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-mono font-bold shrink-0 self-start sm:self-auto border ${
            isLight
              ? 'bg-amber-100 text-amber-800 border-amber-200'
              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
          }`}
        >
          {certificates.length} {certificates.length === 1 ? 'conquistado' : 'conquistados'}
        </span>
      </div>

      {/* Empty State */}
      {certificates.length === 0 ? (
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
                ? 'bg-amber-100 border-amber-300 text-amber-700'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-inner'
            }`}
          >
            <Award className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h3 className={`font-outfit font-bold text-lg ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Nenhum certificado emitido ainda
            </h3>
            <p className={`text-xs leading-relaxed max-w-md mx-auto ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Ao concluir 100% das videoaulas de qualquer treinamento no LUMI, seu certificado oficial com código de autenticação será gerado automaticamente aqui!
            </p>
          </div>

          <button
            onClick={onOpenHome}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold font-outfit text-xs shadow-lg shadow-blue-950/40 cursor-pointer"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Ver Treinamentos Disponíveis</span>
          </button>
        </div>
      ) : (
        /* Certificate Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              onClick={() => setSelectedCert(cert)}
              className={`group rounded-3xl p-5 border transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between space-y-4 ${
                isLight
                  ? 'bg-white border-slate-200 hover:border-amber-500/60 shadow-md hover:shadow-xl hover:shadow-amber-900/10'
                  : 'bg-gradient-to-b from-[#171B38] to-[#121630] border-slate-700/80 hover:border-amber-500/60 shadow-xl hover:shadow-2xl hover:shadow-amber-950/30'
              }`}
            >
              {/* Top Seal & Validation */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-2 rounded-xl border shadow-sm ${
                      isLight
                        ? 'bg-amber-100 border-amber-300 text-amber-700'
                        : 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                    }`}
                  >
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span
                      className={`text-[10px] font-bold font-outfit uppercase tracking-wider ${
                        isLight ? 'text-amber-700' : 'text-amber-400'
                      }`}
                    >
                      Certificado Oficial
                    </span>
                    <p className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Emitido em {new Date(cert.issuedAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>

                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-400" />
              </div>

              {/* Title & Student Name */}
              <div className="space-y-1">
                <h3
                  className={`font-outfit font-bold text-base transition-colors line-clamp-2 ${
                    isLight ? 'text-slate-900 group-hover:text-amber-600' : 'text-white group-hover:text-amber-300'
                  }`}
                >
                  {cert.trainingTitle}
                </h3>
                <p className={`text-xs font-sans ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Concluído por: <strong className={isLight ? 'text-slate-900 font-bold' : 'text-slate-200'}>{cert.userName}</strong>
                </p>
              </div>

              {/* Metadata & Actions */}
              <div
                className={`pt-3 border-t flex items-center justify-between text-xs ${
                  isLight ? 'border-slate-100' : 'border-slate-700/60'
                }`}
              >
                <span className={`flex items-center gap-1 font-mono text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  <Clock className="w-3 h-3" />
                  {formatWorkload(cert.workloadHours, { style: 'long' })}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCert(cert);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold font-outfit text-xs transition-colors cursor-pointer border ${
                    isLight
                      ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                      : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                  }`}
                >
                  Visualizar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* High-Fidelity Official Certificate Viewer Modal */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div
            className={`max-w-3xl w-full my-8 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 border ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900'
                : 'bg-[#171B38] border-slate-700 text-white'
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
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold font-outfit text-xs cursor-pointer shadow-md"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / PDF</span>
                </button>

                <button
                  onClick={() => handleShare(selectedCert)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold font-outfit text-xs cursor-pointer ${
                    isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{copiedShare ? 'Link Copiado!' : 'Compartilhar'}</span>
                </button>

                <button
                  onClick={() => setSelectedCert(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer ml-1"
                  aria-label="Fechar modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Official Diploma Sheet (Designed to be stunning and print-ready on A4 landscape) */}
            <div
              id="printable-certificate"
              className="relative p-8 sm:p-12 rounded-2xl bg-white text-slate-900 border-8 border-amber-600/30 shadow-2xl space-y-6 text-center select-none overflow-hidden"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 50% 50%, rgba(245, 230, 200, 0.25) 0%, rgba(255, 255, 255, 1) 70%)',
              }}
            >
              {/* Inner Decorative Golden Border */}
              <div className="pointer-events-none absolute inset-3 border-2 border-amber-600/40 rounded-xl" />

              {/* Header: Seal & Church Identity */}
              <div className="space-y-2 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-800 text-[11px] font-bold font-outfit uppercase tracking-widest">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Igreja Presbiteriana Renovada • LUMI</span>
                </div>

                <h2 className="font-editorial text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 uppercase">
                  Certificado de Conclusão
                </h2>

                <p className="text-xs text-slate-600 uppercase tracking-widest font-mono">
                  Programa de Capacitação Ministerial & Liderança
                </p>
              </div>

              {/* Body Text */}
              <div className="space-y-4 max-w-xl mx-auto text-slate-700 relative z-10">
                <p className="text-sm font-sans italic">Certificamos com louvor que</p>

                <div className="py-2 border-b-2 border-amber-600/30 max-w-md mx-auto">
                  <h3 className="text-xl sm:text-3xl font-extrabold font-outfit text-slate-950 tracking-tight">
                    {selectedCert.userName}
                  </h3>
                </div>

                <p className="text-xs sm:text-sm leading-relaxed font-sans">
                  concluiu com êxito todas as etapas e requisitos teóricos do treinamento{' '}
                  <strong className="text-slate-950 font-outfit">{selectedCert.trainingTitle}</strong>,
                  cumprindo carga horária estimada de{' '}
                  <strong className="text-amber-800 font-bold">{formatWorkload(selectedCert.workloadHours, { style: 'long' })}</strong>{' '}
                  de dedicação e estudos práticos para a edificação do corpo de Cristo.
                </p>
              </div>

              {/* Footer: Signatures & Validation Code */}
              <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-6 items-end relative z-10 text-xs text-slate-600">
                <div className="space-y-1 text-left">
                  <p className="font-mono text-[10px] text-slate-500">CÓDIGO DE VALIDAÇÃO OFICIAL</p>
                  <p className="font-mono text-xs font-bold text-slate-900 tracking-wider">
                    {selectedCert.validationCode}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Emitido em {new Date(selectedCert.issuedAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div className="space-y-1 text-right">
                  <div className="w-36 h-0.5 bg-slate-400 ml-auto" />
                  <p className="font-outfit font-bold text-xs text-slate-900">Coordenação de Ensino</p>
                  <p className="text-[10px] text-slate-500">Igreja Presbiteriana Renovada de Viamão</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
