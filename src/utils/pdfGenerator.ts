import jsPDF from 'jspdf';
import { BookInfo, Chapter } from '../data/bookTypes';

export function generateBookPdf(
  bookInfo: BookInfo,
  chapters: Chapter[],
  onProgress?: (progressText: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (onProgress) onProgress('Iniciando diagramação do PDF...');

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
      const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
      const margin = 20;
      const contentWidth = pageWidth - margin * 2; // 170mm
      let currentPage = 1;

      const headerTitle = `${bookInfo.titlePt.toUpperCase()} — ${bookInfo.author}`;

      const drawHeaderFooter = (pageNumber: number) => {
        if (pageNumber === 1) return; // Do not draw on cover
        // Header
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(130, 130, 130);
        doc.text(headerTitle.slice(0, 85), margin, 12);
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(margin, 14, pageWidth - margin, 14);

        // Footer
        doc.text(`Página ${pageNumber}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        doc.text('Edição Digital — Biblioteca IPR Viamão', margin, pageHeight - 10);
      };

      let y = 60;

      // ==========================================
      // CAPA EDITORIAL / COVER PAGE
      // ==========================================
      doc.setFillColor(247, 243, 232);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      // Decorative Border
      doc.setDrawColor(180, 83, 9);
      doc.setLineWidth(0.8);
      doc.rect(12, 12, pageWidth - 24, pageHeight - 24);
      doc.setLineWidth(0.3);
      doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

      // Title
      doc.setFont('times', 'bold');
      doc.setFontSize(26);
      doc.setTextColor(140, 50, 10);
      const titleLines = doc.splitTextToSize(bookInfo.titlePt.toUpperCase(), contentWidth);
      doc.text(titleLines, pageWidth / 2, 70, { align: 'center' });

      // Subtitle
      doc.setFont('times', 'italic');
      doc.setFontSize(14);
      doc.setTextColor(80, 70, 60);
      const subLines = doc.splitTextToSize(bookInfo.subtitlePt || '', contentWidth - 20);
      doc.text(subLines, pageWidth / 2, 95, { align: 'center' });

      // Divider
      doc.setDrawColor(180, 83, 9);
      doc.setLineWidth(0.5);
      doc.line(pageWidth / 2 - 30, 115, pageWidth / 2 + 30, 115);

      // Author
      doc.setFont('times', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(30, 30, 30);
      doc.text(bookInfo.author || 'Autor', pageWidth / 2, 135, { align: 'center' });

      // Description & Info
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Edição: ${bookInfo.originalYear || new Date().getFullYear()} • ${bookInfo.publisher || 'Biblioteca IPR Viamão'}`,
        pageWidth / 2,
        150,
        { align: 'center' }
      );

      doc.setFont('times', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(90, 80, 70);
      const noteLines = doc.splitTextToSize(bookInfo.translatorNote || '', 130);
      doc.text(noteLines, pageWidth / 2, 220, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(180, 83, 9);
      doc.text('EDIÇÃO INTEGRAL EM PORTUGUÊS', pageWidth / 2, 255, { align: 'center' });

      // ==========================================
      // CAPÍTULOS
      // ==========================================
      const addPageIfNeeded = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - 20) {
          doc.addPage();
          currentPage++;
          drawHeaderFooter(currentPage);
          y = 24;
        }
      };

      chapters.forEach((ch, idx) => {
        if (onProgress) {
          onProgress(`Diagramando ${ch.titlePt} (${idx + 1}/${chapters.length})...`);
        }

        doc.addPage();
        currentPage++;
        drawHeaderFooter(currentPage);
        y = 26;

        // Chapter Number Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(180, 83, 9);
        const tag = ch.number === 0 ? 'APRESENTAÇÃO' : `CAPÍTULO ${ch.number}`;
        doc.text(tag, margin, y);
        y += 6;

        // Chapter Title
        doc.setFont('times', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(20, 20, 20);
        const chTitleLines = doc.splitTextToSize(ch.titlePt, contentWidth);
        doc.text(chTitleLines, margin, y);
        y += chTitleLines.length * 7 + 2;

        // Chapter Subtitle
        if (ch.subtitlePt) {
          doc.setFont('times', 'italic');
          doc.setFontSize(11);
          doc.setTextColor(100, 90, 80);
          const chSubLines = doc.splitTextToSize(ch.subtitlePt, contentWidth);
          doc.text(chSubLines, margin, y);
          y += chSubLines.length * 5 + 4;
        }

        // Summary Box
        if (ch.summaryPt) {
          doc.setFillColor(245, 240, 230);
          doc.setDrawColor(215, 200, 180);
          doc.setLineWidth(0.2);

          doc.setFont('times', 'italic');
          doc.setFontSize(10);
          doc.setTextColor(50, 40, 30);
          const summaryLines = doc.splitTextToSize(`"${ch.summaryPt}"`, contentWidth - 10);
          const boxHeight = summaryLines.length * 5 + 8;

          doc.rect(margin, y, contentWidth, boxHeight, 'FD');
          doc.text(summaryLines, margin + 5, y + 6);
          y += boxHeight + 8;
        }

        // Chapter Sections
        ch.sections.forEach((sec) => {
          addPageIfNeeded(20);

          // Section Title
          doc.setFont('times', 'bold');
          doc.setFontSize(13);
          doc.setTextColor(150, 60, 10);
          const secTitleLines = doc.splitTextToSize(sec.titlePt, contentWidth);
          doc.text(secTitleLines, margin, y);
          y += secTitleLines.length * 6 + 3;

          // Paragraphs
          doc.setFont('times', 'normal');
          doc.setFontSize(10.5);
          doc.setTextColor(30, 30, 30);

          sec.paragraphsPt.forEach((para) => {
            const paraLines = doc.splitTextToSize(para, contentWidth);
            const neededHeight = paraLines.length * 5.2 + 4;
            addPageIfNeeded(neededHeight);

            doc.text(paraLines, margin, y, { align: 'justify', maxWidth: contentWidth });
            y += paraLines.length * 5.2 + 4;
          });
        });

        // Questions / Perguntas de Aplicação
        if (ch.studyQuestionsPt && ch.studyQuestionsPt.length > 0) {
          addPageIfNeeded(35);
          y += 4;
          doc.setFont('times', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(180, 83, 9);
          doc.text('Perguntas para Reflexão da Liderança:', margin, y);
          y += 6;

          doc.setFont('times', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(50, 50, 50);

          ch.studyQuestionsPt.forEach((q, qIdx) => {
            const qLines = doc.splitTextToSize(`${qIdx + 1}. ${q}`, contentWidth - 6);
            addPageIfNeeded(qLines.length * 4.8 + 2);
            doc.text(qLines, margin + 4, y);
            y += qLines.length * 4.8 + 2;
          });
        }
      });

      if (onProgress) onProgress('Finalizando e baixando arquivo PDF...');

      const safeTitle = bookInfo.titlePt
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_');
      doc.save(`${safeTitle}.pdf`);
      resolve();
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      reject(error);
    }
  });
}
