import React, { useState } from 'react';
import {
  Award,
  GraduationCap,
  Clock,
  Search,
  X,
  Plus,
  RefreshCw,
  Check,
  Copy,
  Eye,
  Trash2,
} from 'lucide-react';
import { Training, UserCertificate } from '../../../../types/training';
import { ReaderTheme } from '../../../Navbar';
import { formatWorkload } from '../../../../utils/workloadFormat';

export interface CertificatesTabProps {
  certificates: UserCertificate[];
  trainings: Training[];
  certSearch: string;
  setCertSearch: (search: string) => void;
  certTrainingFilter: string;
  setCertTrainingFilter: (filter: string) => void;
  isCertificatesLoading: boolean;
  onOpenIssueModal: () => void;
  onPreviewCert: (cert: UserCertificate) => void;
  onRevokeCert: (cert: UserCertificate) => void;
  theme?: ReaderTheme;
}

export const CertificatesTab: React.FC<CertificatesTabProps> = ({
  certificates,
  trainings,
  certSearch,
  setCertSearch,
  certTrainingFilter,
  setCertTrainingFilter,
  isCertificatesLoading,
  onOpenIssueModal,
  onPreviewCert,
  onRevokeCert,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [copiedCertCode, setCopiedCertCode] = useState<string | null>(null);

  const handleCopyValidationCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCertCode(code);
    setTimeout(() => setCopiedCertCode((prev) => (prev === code ? null : prev)), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Metric Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className={`p-5 rounded-2xl border ${
            isLight ? 'bg-white border-slate-200 text-slate-800 shadow-sm' : 'bg-[#171B38] border-slate-700/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-500 font-outfit">
              Total de Certificados
            </span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-outfit mt-2">{certificates.length}</p>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Documentos oficiais emitidos na plataforma
          </p>
        </div>

        <div
          className={`p-5 rounded-2xl border ${
            isLight ? 'bg-white border-slate-200 text-slate-800 shadow-sm' : 'bg-[#171B38] border-slate-700/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500 font-outfit">
              Alunos Certificados
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-outfit mt-2">
            {new Set(certificates.map((c) => c.userId)).size}
          </p>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Membros com formação comprovada
          </p>
        </div>

        <div
          className={`p-5 rounded-2xl border ${
            isLight ? 'bg-white border-slate-200 text-slate-800 shadow-sm' : 'bg-[#171B38] border-slate-700/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-500 font-outfit">
              Carga Horária Emitida
            </span>
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-outfit mt-2">
            {formatWorkload(certificates.reduce((acc, c) => acc + (c.workloadHours || 0), 0))}
          </p>
          <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Horas totais de capacitação ministerial
          </p>
        </div>
      </div>

      {/* Search, Filter & Action Bar */}
      <div
        className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
          isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#171B38] border-slate-700/80'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
          {/* Text Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por aluno, e-mail, curso ou código..."
              value={certSearch}
              onChange={(e) => setCertSearch(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
                  : 'bg-slate-900 border-slate-700 text-white placeholder:text-slate-500'
              }`}
            />
            {certSearch && (
              <button
                onClick={() => setCertSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Training Filter */}
          <select
            value={certTrainingFilter}
            onChange={(e) => setCertTrainingFilter(e.target.value)}
            className={`w-full sm:w-56 px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900'
                : 'bg-slate-900 border-slate-700 text-white'
            }`}
          >
            <option value="all">Todos os Treinamentos</option>
            {trainings.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={onOpenIssueModal}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-medium rounded-xl text-xs shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Fornecer Novo Certificado</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div
        className={`rounded-2xl border overflow-hidden shadow-sm ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#171B38] border-slate-700/80'
        }`}
      >
        {isCertificatesLoading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 mx-auto text-amber-500 animate-spin mb-3" />
            <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Carregando certificados emitidos...
            </p>
          </div>
        ) : certificates.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr
                  className={`border-b ${
                    isLight
                      ? 'bg-slate-50/80 border-slate-200 text-slate-600'
                      : 'bg-slate-900/60 border-slate-700/60 text-slate-400'
                  }`}
                >
                  <th className="py-3.5 px-4 font-bold font-outfit uppercase tracking-wider">Código de Validação</th>
                  <th className="py-3.5 px-4 font-bold font-outfit uppercase tracking-wider">Aluno</th>
                  <th className="py-3.5 px-4 font-bold font-outfit uppercase tracking-wider">Treinamento & Carga Horária</th>
                  <th className="py-3.5 px-4 font-bold font-outfit uppercase tracking-wider">Data de Emissão</th>
                  <th className="py-3.5 px-4 font-bold font-outfit uppercase tracking-wider text-right">Ações de Controle</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-700/40'}`}>
                {certificates.map((cert) => {
                  const isCopied = copiedCertCode === cert.validationCode;
                  return (
                    <tr
                      key={cert.id}
                      className={`transition-colors ${
                        isLight ? 'hover:bg-slate-50/70' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Validation Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                            {cert.validationCode}
                          </span>
                          <button
                            onClick={() => handleCopyValidationCode(cert.validationCode)}
                            className={`p-1 rounded-md transition-colors cursor-pointer ${
                              isCopied
                                ? 'text-emerald-500 bg-emerald-500/10'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
                            }`}
                            title={isCopied ? 'Copiado!' : 'Copiar código de validação'}
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Student */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold font-outfit text-xs uppercase ${
                              isLight ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/20 text-amber-300'
                            }`}
                          >
                            {cert.userName.charAt(0) || 'A'}
                          </div>
                          <div>
                            <p className={`font-bold font-outfit ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              {cert.userName}
                            </p>
                            {cert.userEmail && (
                              <p className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                {cert.userEmail}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Training & Workload */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <p className={`font-semibold line-clamp-1 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                            {cert.trainingTitle}
                          </p>
                          <span className={`inline-flex items-center gap-1 font-mono text-[11px] ${
                            isLight ? 'text-slate-500' : 'text-slate-400'
                          }`}>
                            <Clock className="w-3 h-3 text-blue-500" />
                            {formatWorkload(cert.workloadHours, { style: 'long' })}
                          </span>
                        </div>
                      </td>

                      {/* Issued At */}
                      <td className="py-3.5 px-4">
                        <span className={`font-mono text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                          {new Date(cert.issuedAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onPreviewCert(cert)}
                            className={`px-2.5 py-1.5 rounded-lg border text-xs font-outfit font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                              isLight
                                ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-800'
                                : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-300'
                            }`}
                            title="Visualizar certificado oficial"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Visualizar</span>
                          </button>

                          <button
                            onClick={() => onRevokeCert(cert)}
                            className={`p-1.5 rounded-lg border text-slate-400 hover:text-rose-400 transition-colors cursor-pointer ${
                              isLight
                                ? 'bg-slate-100 border-slate-200 hover:bg-rose-50'
                                : 'bg-slate-900 border-slate-800 hover:bg-rose-950/30'
                            }`}
                            title="Revogar certificado emitido equivocadamente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <Award className="w-12 h-12 mx-auto text-amber-500/40" />
            <h3 className={`text-base font-bold font-outfit ${isLight ? 'text-slate-800' : 'text-white'}`}>
              Nenhum certificado emitido encontrado
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {certSearch || certTrainingFilter !== 'all'
                ? 'Nenhum certificado corresponde aos filtros aplicados. Tente ajustar os termos de busca.'
                : 'Assim que os alunos concluírem os cursos ou você fornecer um certificado manualmente, eles aparecerão aqui.'}
            </p>
            <button
              onClick={onOpenIssueModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-md transition-all cursor-pointer mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Fornecer Primeiro Certificado</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
