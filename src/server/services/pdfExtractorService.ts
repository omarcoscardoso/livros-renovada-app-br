import fs from 'node:fs/promises';
import { extractText, getDocumentProxy } from 'unpdf';
import { BookInfo, BookSection, Chapter } from '../../data/bookTypes';

export interface ExtractedPdfData {
  totalPages: number;
  pages: string[];
  fullText: string;
}

export interface BookMetadataHints {
  titlePt?: string;
  author?: string;
  originalYear?: number;
  publisher?: string;
  coverColor?: string;
}

export class PdfExtractorService {
  public async extractPdfPages(filePath: string): Promise<ExtractedPdfData> {
    const buffer = await fs.readFile(filePath);
    const uint8Array = new Uint8Array(buffer);

    const pdf = await getDocumentProxy(uint8Array);
    const { totalPages, text } = await extractText(pdf, { mergePages: false });

    const pages = Array.isArray(text)
      ? text.map((p) => this.cleanExtractedText(String(p || '')))
      : [this.cleanExtractedText(String(text || ''))];

    return {
      totalPages: totalPages || pages.length,
      pages,
      fullText: pages.join('\n\n'),
    };
  }

  private cleanExtractedText(raw: string): string {
    return raw
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/-\n([a-zà-ÿ])/gi, '$1')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Builds a complete structured BookInfo + Chapter[] directly from extracted PDF pages.
   * Used both as a structural baseline and as a full local converter when Gemini API key is not configured.
   */
  public buildStructuredBookFromPages(
    extracted: ExtractedPdfData,
    originalFilename: string,
    hints: BookMetadataHints = {}
  ): BookInfo {
    const cleanFileTitle = originalFilename
      .replace(/\.pdf$/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b[0-9a-f]{6,}\b/gi, '')
      .trim();

    const inferredTitle = hints.titlePt?.trim() || cleanFileTitle || 'Novo Livro Digital';
    const inferredAuthor = hints.author?.trim() || 'Autor Desconhecido';
    const inferredYear = hints.originalYear || new Date().getFullYear();
    const inferredPublisher =
      hints.publisher?.trim() || 'Edição Digital — Biblioteca IPR Viamão';

    const nonEmptyPages = extracted.pages
      .map((text, idx) => ({ pageNumber: idx + 1, text: text.trim() }))
      .filter((p) => p.text.length > 20);

    if (nonEmptyPages.length === 0) {
      const placeholderChapter: Chapter = {
        id: 'cap-1',
        number: 1,
        titlePt: 'Capítulo 1 — Conteúdo do Documento',
        titleEn: 'Chapter 1 — Document Content',
        subtitlePt: inferredTitle,
        pages: `1-${Math.max(1, extracted.totalPages)}`,
        estimatedReadTimeMinutes: 5,
        summaryPt: `Documento PDF importado (${originalFilename}) contendo ${extracted.totalPages} página(s).`,
        keyPointsPt: [
          'Documento PDF armazenado na biblioteca digital.',
          'Você pode visualizar o PDF original clicando no ícone de PDF na barra superior.',
          'Configure a chave GEMINI_API_KEY para transcrição e tradução visual via IA de PDFs digitalizados.',
        ],
        studyQuestionsPt: [
          'Quais são os ensinamentos centrais apresentados neste material?',
          'Como podemos aplicar os princípios deste livro em nossa comunidade local?',
        ],
        sections: [
          {
            id: 'cap-1-sec-1',
            titlePt: 'Texto Extraído do PDF',
            titleEn: 'Extracted PDF Text',
            paragraphsPt: [
              'Este arquivo PDF parece ser composto principalmente por imagens digitalizadas (sem camada de texto selecionável) ou possui texto mínimo.',
              'Você pode abrir o PDF original a qualquer momento no botão "Ver PDF Original" na barra superior, editar os capítulos manualmente, ou reprocessar com a chave da API Gemini ativa para leitura óptica (OCR) e tradução automática.',
            ],
            paragraphsEn: [],
          },
        ],
      };

      return {
        titlePt: inferredTitle,
        titleEn: inferredTitle,
        subtitlePt: 'Edição Estruturada para Leitura e Estudo',
        subtitleEn: 'Structured Reading Edition',
        author: inferredAuthor,
        originalYear: inferredYear,
        publisher: inferredPublisher,
        translatorNote:
          'Livro importado e estruturado automaticamente a partir do documento PDF original.',
        chapters: [placeholderChapter],
      };
    }

    // Group pages into logical chapters using chapter heading detection or balanced page chunks
    const rawChapters: {
      title: string;
      startPage: number;
      endPage: number;
      pagesText: string[];
    }[] = [];

    const chapterHeadingRegex =
      /^(?:cap[íi]tulo|chapter|parte|part|li[çc][ãa]o|introdu[çc][ãa]o|introduction|pref[áa]cio|ap[êe]ndice|appendix)\b[^\n]{0,90}/im;

    const pagesPerChunk = Math.max(3, Math.ceil(nonEmptyPages.length / 10));
    let currentGroup: {
      title: string;
      startPage: number;
      endPage: number;
      pagesText: string[];
    } | null = null;

    for (const page of nonEmptyPages) {
      const lines = page.text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const firstLines = lines.slice(0, 4).join('\n');
      const headingMatch = firstLines.match(chapterHeadingRegex);

      const shouldStartNewChapter =
        !currentGroup ||
        (headingMatch && currentGroup.pagesText.length >= 1) ||
        currentGroup.pagesText.length >= pagesPerChunk;

      if (shouldStartNewChapter) {
        const chapterIdx = rawChapters.length + 1;
        const detectedTitle = headingMatch
          ? headingMatch[0].replace(/\s+/g, ' ').trim()
          : lines[0] && lines[0].length > 4 && lines[0].length < 85
          ? lines[0]
          : `Capítulo ${chapterIdx}`;

        currentGroup = {
          title: detectedTitle,
          startPage: page.pageNumber,
          endPage: page.pageNumber,
          pagesText: [page.text],
        };
        rawChapters.push(currentGroup);
      } else if (currentGroup) {
        currentGroup.endPage = page.pageNumber;
        currentGroup.pagesText.push(page.text);
      }
    }

    const chapters: Chapter[] = rawChapters.map((group, idx) => {
      const chNum = idx + 1;
      const combinedText = group.pagesText.join('\n\n');
      const paragraphs = this.splitIntoReadableParagraphs(combinedText);

      // Group paragraphs into sections of 4-6 paragraphs
      const sections: BookSection[] = [];
      const parasPerSection = Math.max(3, Math.min(6, Math.ceil(paragraphs.length / 3)));

      for (let i = 0; i < paragraphs.length; i += parasPerSection) {
        const secParas = paragraphs.slice(i, i + parasPerSection);
        const secNum = sections.length + 1;
        const firstSentence = secParas[0]?.split(/[.!?]/)[0]?.trim() || `Seção ${secNum}`;
        const secTitle =
          firstSentence.length > 10 && firstSentence.length < 75
            ? firstSentence
            : `Parte ${secNum} — Desenvolvimento`;

        sections.push({
          id: `ch-${chNum}-sec-${secNum}`,
          titlePt: secTitle,
          titleEn: secTitle,
          paragraphsPt: secParas,
          paragraphsEn: secParas,
        });
      }

      if (sections.length === 0) {
        sections.push({
          id: `ch-${chNum}-sec-1`,
          titlePt: 'Conteúdo Principal',
          titleEn: 'Main Content',
          paragraphsPt: [combinedText || 'Conteúdo extraído do PDF.'],
          paragraphsEn: [combinedText || 'Content extracted from PDF.'],
        });
      }

      const wordCount = combinedText.split(/\s+/).length;
      const estimatedReadTimeMinutes = Math.max(2, Math.round(wordCount / 190));

      const summaryCandidate = paragraphs[0]
        ? paragraphs[0].slice(0, 260) + (paragraphs[0].length > 260 ? '...' : '')
        : `Síntese do ${group.title} (páginas ${group.startPage} a ${group.endPage}).`;

      const keyPoints = paragraphs
        .slice(0, 4)
        .map((p) => {
          const firstSent = p.split(/[.!?]/)[0]?.trim() || p.slice(0, 110);
          return firstSent.length > 120 ? firstSent.slice(0, 117) + '...' : firstSent + '.';
        })
        .filter((kp) => kp.length > 15);

      return {
        id: `cap-${chNum}`,
        number: chNum,
        titlePt: group.title.toLowerCase().startsWith('cap')
          ? group.title
          : `Capítulo ${chNum}: ${group.title}`,
        titleEn: group.title,
        subtitlePt: `Páginas ${group.startPage}–${group.endPage} do documento original`,
        subtitleEn: `Pages ${group.startPage}–${group.endPage}`,
        pages:
          group.startPage === group.endPage
            ? `${group.startPage}`
            : `${group.startPage}-${group.endPage}`,
        estimatedReadTimeMinutes,
        summaryPt: summaryCandidate,
        keyPointsPt:
          keyPoints.length > 0
            ? keyPoints
            : ['Leitura estruturada a partir do documento PDF original.'],
        studyQuestionsPt: [
          `Qual é a ideia principal abordada em "${group.title}" e como ela se conecta com sua caminhada cristã ou liderança?`,
          'Que passos práticos podem ser implementados nesta semana com base na leitura deste capítulo?',
          'Destaque um trecho ou princípio deste capítulo para compartilhar em seu grupo ou célula.',
        ],
        sections,
      };
    });

    return {
      titlePt: inferredTitle,
      titleEn: inferredTitle,
      subtitlePt: 'Edição Digital Estruturada para Leitura e Estudo',
      subtitleEn: 'Digital Structured Edition for Reading and Study',
      author: inferredAuthor,
      originalYear: inferredYear,
      publisher: inferredPublisher,
      translatorNote:
        'Texto extraído e estruturado automaticamente a partir do PDF enviado para a Biblioteca Digital.',
      chapters,
    };
  }

  private splitIntoReadableParagraphs(text: string): string[] {
    const rawBlocks = text
      .split(/\n\s*\n/)
      .map((b) => b.replace(/\s+/g, ' ').trim())
      .filter((b) => b.length > 0);

    const result: string[] = [];
    let buffer = '';

    for (const block of rawBlocks) {
      // Skip standalone page numbers
      if (/^\d{1,4}$/.test(block)) continue;

      if (buffer.length + block.length < 420) {
        buffer = buffer ? `${buffer} ${block}` : block;
      } else {
        if (buffer) result.push(buffer);
        buffer = block;
      }

      if (buffer.length >= 280) {
        result.push(buffer);
        buffer = '';
      }
    }

    if (buffer) {
      result.push(buffer);
    }

    // If a single block is huge, split by sentences into ~450 char paragraphs
    const finalParagraphs: string[] = [];
    for (const para of result) {
      if (para.length <= 750) {
        finalParagraphs.push(para);
      } else {
        const sentences = para.match(/[^.!?]+[.!?]+|\S+/g) || [para];
        let chunk = '';
        for (const s of sentences) {
          if ((chunk + ' ' + s).trim().length > 600 && chunk.length > 150) {
            finalParagraphs.push(chunk.trim());
            chunk = s.trim();
          } else {
            chunk = chunk ? `${chunk} ${s.trim()}` : s.trim();
          }
        }
        if (chunk.trim()) finalParagraphs.push(chunk.trim());
      }
    }

    return finalParagraphs.length > 0 ? finalParagraphs : [text.trim()];
  }
}
