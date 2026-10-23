import fs from 'node:fs/promises';
import { extractText, getDocumentProxy, renderPageAsImage } from 'unpdf';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { BookInfo, BookSection, Chapter } from '../../data/bookTypes';
import { getStorageService, IStorageService } from './storageService';

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

export interface ExtractedCoverResult {
  filename: string;
  pageNumber: number;
}

export interface ExtractedLocalMetadata {
  titlePt: string;
  titleEn?: string;
  subtitlePt?: string;
  author: string;
  originalYear: number;
  publisher?: string;
  synopsis?: string;
  category?: string;
  source: 'local';
}

function formatTitleCase(text: string): string {
  if (!text) return '';
  const minorWords = new Set(['de', 'da', 'do', 'das', 'dos', 'em', 'e', 'of', 'and', 'the', 'in', 'a', 'an', 'por', 'by']);
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (index > 0 && minorWords.has(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export class PdfExtractorService {
  private storageService: IStorageService;

  constructor(storageService?: IStorageService) {
    this.storageService = storageService || getStorageService();
  }

  private async toBuffer(input: string | Buffer | Uint8Array): Promise<Buffer> {
    if (Buffer.isBuffer(input)) return input;
    if (input instanceof Uint8Array) return Buffer.from(input);
    return fs.readFile(input);
  }

  public async extractPdfPages(pdfInput: string | Buffer | Uint8Array): Promise<ExtractedPdfData> {
    const buffer = await this.toBuffer(pdfInput);
    const uint8Array = new Uint8Array(buffer);

    const pdf = await getDocumentProxy(uint8Array);
    const { totalPages, text } = await extractText(pdf, { mergePages: false });

    let rawPages = Array.isArray(text)
      ? text.map((p) => String(p || ''))
      : [String(text || '')];

    // Phase 2, Step 3.1: Expurgar cabeçalhos e rodapés de corrida repetitivos
    rawPages = this.stripRunningHeadersAndFooters(rawPages);

    // Phase 2, Steps 3.2 & 3.3: Desfazer quebras forçadas e normalizar tipografia por página
    const pages = rawPages.map((p) => this.cleanExtractedText(p));

    return {
      totalPages: totalPages || pages.length,
      pages,
      fullText: pages.join('\n\n'),
    };
  }

  /**
   * Fast, reliable local heuristic metadata extraction from PDF properties and first pages.
   * Runs in milliseconds without requiring external API keys.
   */
  public async extractLocalMetadata(
    pdfInput: string | Buffer | Uint8Array,
    originalFilename?: string
  ): Promise<ExtractedLocalMetadata> {
    const buffer = await this.toBuffer(pdfInput);

    const { pages } = await this.extractPdfPages(Buffer.from(buffer));
    const firstPagesText = pages.slice(0, 6).join('\n\n');

    let docMeta: any = null;
    try {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      docMeta = await pdf.getMetadata();
    } catch {
      // Ignore metadata read error, continue with text
    }

    // 1. Year Extraction (copyright / publication date)
    let originalYear = new Date().getFullYear();
    const copyrightMatch =
      firstPagesText.match(/(?:©|\(c\)|copyright)\s*(19\d{2}|20\d{2})/i) ||
      firstPagesText.match(/\b(19\d{2}|20\d{2})\b/);
    if (copyrightMatch) {
      originalYear = parseInt(copyrightMatch[1], 10);
    } else if (docMeta?.info?.CreationDate) {
      const dateStr = String(docMeta.info.CreationDate);
      const match = dateStr.match(/(19\d{2}|20\d{2})/);
      if (match) {
        originalYear = parseInt(match[1], 10);
      }
    }

    // 2. Author Extraction
    let author = '';
    const authorPatterns = [
      /(?:by|por|autor|author)(?::|\s)\s*([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s.]{2,35})/i,
      /(?:by|por)\s*\n+([A-ZÀ-Ú\s]{3,35})\b/i,
      /(?:©|\(c\))\s*\d{4}\s+by\s+([A-ZÀ-Úa-zà-ú\s]{3,35})/i,
    ];

    for (const pat of authorPatterns) {
      const m = firstPagesText.match(pat);
      if (m && m[1]) {
        const candidate = m[1].split('\n')[0].trim().replace(/[.,;]+$/, '');
        if (
          candidate.length >= 3 &&
          !/chapter|copyright|rights|editora|publishing|press|books|livros|inc|ltda|corp/i.test(candidate)
        ) {
          author = formatTitleCase(candidate);
          break;
        }
      }
    }

    if (!author && docMeta?.info?.Author) {
      const rawAuthor = String(docMeta.info.Author).trim();
      const genericAuthors = ['writer', 'admin', 'user', 'openoffice', 'microsoft', 'word', 'zoran'];
      if (rawAuthor.length >= 3 && !genericAuthors.includes(rawAuthor.toLowerCase())) {
        author = formatTitleCase(rawAuthor);
      }
    }

    // 3. Title Extraction
    let titlePt = '';
    const cleanFilename = originalFilename
      ? originalFilename
          .replace(/\.pdf$/i, '')
          .replace(/[-_]+/g, ' ')
          .replace(/\b[0-9a-f]{6,}\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim()
      : '';

    // Check prominent title line in first pages
    for (let i = 0; i < Math.min(3, pages.length); i++) {
      const lines = pages[i]
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 2 && !/^\d+$/.test(l) && !/^page\s+\d+/i.test(l));

      if (lines.length > 0) {
        const firstLine = lines[0];
        if (firstLine.length >= 3 && firstLine.length <= 60 && !/copyright|isbn|todos os direitos/i.test(firstLine)) {
          titlePt = formatTitleCase(firstLine);
          break;
        }
      }
    }

    if (!titlePt && docMeta?.info?.Title) {
      const rawTitle = String(docMeta.info.Title).trim();
      if (rawTitle.length >= 3 && !/untitled|document/i.test(rawTitle)) {
        titlePt = formatTitleCase(rawTitle);
      }
    }

    if (!titlePt && cleanFilename) {
      // If filename has "Title - Author" format
      if (cleanFilename.includes(' - ')) {
        const parts = cleanFilename.split(' - ');
        titlePt = formatTitleCase(parts[0].trim());
        if (!author && parts[1]) {
          author = formatTitleCase(parts[1].trim());
        }
      } else {
        titlePt = formatTitleCase(cleanFilename);
      }
    }

    if (!author && cleanFilename && cleanFilename.includes(' - ')) {
      const parts = cleanFilename.split(' - ');
      if (parts[1]) {
        author = formatTitleCase(parts[1].trim());
      }
    }

    if (!titlePt) titlePt = 'Livro sem Título';
    if (!author) author = 'Autor Desconhecido';

    // 4. Publisher Extraction
    let publisher = 'Edição Digital — Biblioteca IPR Viamão';
    const pubMatch = firstPagesText.match(/(?:published by|publicado por|editora)\s+([A-ZÀ-Úa-zà-ú0-9\s,.-]{3,60})/i);
    if (pubMatch && pubMatch[1]) {
      publisher = pubMatch[1].split('\n')[0].trim().replace(/[.,;]+$/, '');
    }

    // 5. Category & Synopsis detection
    let category = 'Vida Cristã';
    let synopsis = `Obra "${titlePt}" de ${author}. Leitura e estudo bíblico selecionado para edificação da igreja e fortalecimento espiritual.`;

    const normalized = (firstPagesText + ' ' + titlePt)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (normalized.includes('celula') || normalized.includes('cell group') || normalized.includes('pequeno grupo')) {
      category = 'Células';
      synopsis = `Estudo fundamental sobre a visão e dinâmica da igreja em células e pequenos grupos.`;
    } else if (normalized.includes('lider') || normalized.includes('lideranca') || normalized.includes('leadership')) {
      category = 'Liderança';
      synopsis = `Princípios essenciais para formação, mentoria e capacitação de líderes ministeriais.`;
    } else if (normalized.includes('discipulado') || normalized.includes('disciple')) {
      category = 'Discipulado';
      synopsis = `Guia prático para acompanhamento espiritual, consolidação e formação de discípulos de Jesus Cristo.`;
    } else if (normalized.includes('teologia') || normalized.includes('doutrina') || normalized.includes('theology')) {
      category = 'Teologia';
      synopsis = `Fundamentos teológicos e doutrinários para aprofundamento das Escrituras Sagradas.`;
    }

    return {
      titlePt,
      author,
      originalYear,
      publisher,
      synopsis,
      category,
      source: 'local',
    };
  }

  /**
   * Discovers the cover page of the PDF (typically page 1, or page 2/3 if page 1 is blank,
   * or the page number identified by Gemini AI), renders it as a high-res PNG, crops excess
   * white scanner margins if needed, and saves it via IStorageService.
   */
  public async extractBookCoverImage(
    pdfInput: string | Buffer | Uint8Array,
    bookId: string,
    preferredPageNumber?: number
  ): Promise<ExtractedCoverResult | null> {
    try {
      const rawBuffer = await this.toBuffer(pdfInput);
      if (!rawBuffer || rawBuffer.length === 0) {
        return null;
      }
      const pdfDoc = await getDocumentProxy(new Uint8Array(rawBuffer));
      const totalPages = pdfDoc.numPages || 1;

      const candidatePages: number[] = [];
      if (
        preferredPageNumber &&
        preferredPageNumber >= 1 &&
        preferredPageNumber <= totalPages
      ) {
        candidatePages.push(preferredPageNumber);
      }
      for (let p = 1; p <= Math.min(3, totalPages); p++) {
        if (!candidatePages.includes(p)) {
          candidatePages.push(p);
        }
      }

      let selectedPage = candidatePages[0] || 1;
      let selectedCropBuffer: Buffer | null = null;

      for (const pageNum of candidatePages) {
        const renderedArrayBuffer = await renderPageAsImage(new Uint8Array(rawBuffer), pageNum, {
          canvasImport: () => import('@napi-rs/canvas'),
          scale: 2.0,
        });

        const pagePngBuffer = Buffer.from(renderedArrayBuffer);
        const analysis = await this.analyzeAndCropCoverPage(pagePngBuffer);

        if (analysis.hasVisualContent) {
          selectedPage = pageNum;
          selectedCropBuffer = analysis.croppedBuffer;
          break;
        }

        // Keep fallback to page 1 even if nearly blank
        if (!selectedCropBuffer) {
          selectedCropBuffer = analysis.croppedBuffer;
        }
      }

      if (!selectedCropBuffer) {
        return null;
      }

      const safeId = bookId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${safeId}_cover.png`;
      await this.storageService.saveCover(filename, selectedCropBuffer);

      return {
        filename,
        pageNumber: selectedPage,
      };
    } catch (error) {
      console.error('Aviso ao extrair capa do PDF:', error);
      return null;
    }
  }

  private async analyzeAndCropCoverPage(
    pngBuffer: Buffer
  ): Promise<{ hasVisualContent: boolean; croppedBuffer: Buffer }> {
    const img = await loadImage(pngBuffer);
    const width = img.width;
    const height = img.height;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0);

    const { data } = ctx.getImageData(0, 0, width, height);
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let nonWhitePixels = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        if (a > 15 && (r < 246 || g < 246 || b < 246)) {
          nonWhitePixels++;
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    const totalPixels = width * height;
    const nonWhiteRatio = nonWhitePixels / Math.max(1, totalPixels);
    const hasVisualContent = nonWhiteRatio > 0.004;

    if (!hasVisualContent || minX >= maxX || minY >= maxY) {
      return { hasVisualContent: false, croppedBuffer: pngBuffer };
    }

    const contentW = maxX - minX + 1;
    const contentH = maxY - minY + 1;

    // Check if the cover is an embedded graphic surrounded by wide white margins (e.g. < 85% of page width/height)
    const widthRatio = contentW / width;
    const heightRatio = contentH / height;
    const aspect = contentW / Math.max(1, contentH);

    if (
      widthRatio > 0.25 &&
      heightRatio > 0.25 &&
      (widthRatio < 0.88 || heightRatio < 0.88) &&
      aspect >= 0.45 &&
      aspect <= 0.9
    ) {
      const pad = Math.round(Math.min(width, height) * 0.01);
      const cropX = Math.max(0, minX - pad);
      const cropY = Math.max(0, minY - pad);
      const cropW = Math.min(width - cropX, contentW + pad * 2);
      const cropH = Math.min(height - cropY, contentH + pad * 2);

      const outCanvas = createCanvas(cropW, cropH);
      const outCtx = outCanvas.getContext('2d');
      outCtx.fillStyle = '#ffffff';
      outCtx.fillRect(0, 0, cropW, cropH);
      outCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      return {
        hasVisualContent: true,
        croppedBuffer: outCanvas.toBuffer('image/png'),
      };
    }

    return {
      hasVisualContent: true,
      croppedBuffer: canvas.toBuffer('image/png'),
    };
  }

  /**
   * Phase 2, Step 3.1: Identifica e expurga cabeçalhos e rodapés de corrida repetitivos
   * e números de página isolados em todas as páginas do livro.
   */
  public stripRunningHeadersAndFooters(pages: string[]): string[] {
    if (pages.length <= 2) return pages;

    // Frequência das primeiras 2 linhas de cada página
    const headerFreq = new Map<string, number>();
    for (const page of pages) {
      const lines = page.split('\n').map((l) => l.trim()).filter(Boolean);
      for (let i = 0; i < Math.min(2, lines.length); i++) {
        const candidate = lines[i];
        if (candidate.length >= 3 && candidate.length <= 65) {
          headerFreq.set(candidate, (headerFreq.get(candidate) || 0) + 1);
        }
      }
    }

    // Limiar: linha repetida em >20% das páginas (ou >= 3 páginas) é tratada como running header
    const threshold = Math.max(3, Math.floor(pages.length * 0.2));
    const runningHeaders = new Set<string>();
    for (const [line, count] of headerFreq.entries()) {
      if (count >= threshold) {
        runningHeaders.add(line);
      }
    }

    return pages.map((page) => {
      let lines = page.split('\n');

      // Remove números isolados e cabeçalhos de corrida no topo
      while (lines.length > 0) {
        const first = lines[0].trim();
        const isIsolatedNum =
          /^\s*(?:-\s*)?\d{1,4}(?:\s*-)?\s*$/.test(first) ||
          /^(?:p[aá]gina|page)\s+\d{1,4}\s*$/i.test(first);
        const isRunning = runningHeaders.has(first);

        if (isIsolatedNum || isRunning) {
          lines.shift();
        } else {
          break;
        }
      }

      // Remove números isolados e rodapés repetitivos na base
      while (lines.length > 0) {
        const last = lines[lines.length - 1].trim();
        const isIsolatedNum =
          /^\s*(?:-\s*)?\d{1,4}(?:\s*-)?\s*$/.test(last) ||
          /^(?:p[aá]gina|page)\s+\d{1,4}\s*$/i.test(last);
        const isRunning = runningHeaders.has(last);

        if (isIsolatedNum || isRunning) {
          lines.pop();
        } else {
          break;
        }
      }

      return lines.join('\n');
    });
  }

  /**
   * Phase 2, Steps 3.2 & 3.3: Higienização rigorosa, dewrapping de linhas cortadas
   * e normalização tipográfica.
   */
  public cleanExtractedText(raw: string): string {
    if (!raw) return '';

    // 1. Normalização de quebras de linha e remoção de caracteres de controle
    let text = raw
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // 2. Correção de anomalias conhecidas de OCR
    text = text
      .replace(/C™te\s*d[’']Ivoire/g, 'Côte d’Ivoire')
      .replace(/C™te/g, 'Côte');

    // 3. Normalização tipográfica (travessões e aspas)
    text = text
      .replace(/--/g, '—')
      .replace(/\s+-\s+/g, ' — ')
      .replace(/[“”]/g, '"');

    // 4. Desfazimento de quebras com hífen: transi-\nção -> transição
    text = text.replace(/-\n+(\p{L})/gu, '$1');

    // 5. Dewrapping de quebras de coluna forçadas sem pontuação terminal
    const rawParagraphs = text.split(/\n{2,}/);
    const cleanedParas: string[] = [];

    for (const para of rawParagraphs) {
      const lines = para
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length <= 1) {
        if (lines[0]) cleanedParas.push(lines[0]);
        continue;
      }

      let joined = '';
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!joined) {
          joined = line;
          continue;
        }

        const prevEndsWithPunct = /[.!?:;—"']$/.test(joined);
        const isHeadingLike = /^(?:cap[íi]tulo|chapter|parte|part|[A-ZÀ-Ú\s]{4,60}$)/i.test(line);
        const isAuthorOrMeta = /^(?:by|por|autor|author|copyright|editora|published by|publicado por|\(c\)|©)\b/i.test(line);
        const isTitleLine = line.length <= 50 && /^[A-ZÀ-Ú0-9\s:—-]+$/.test(line);

        if (prevEndsWithPunct || isHeadingLike || isAuthorOrMeta || isTitleLine) {
          joined += '\n\n' + line;
        } else {
          joined += ' ' + line;
        }
      }

      if (joined.trim()) {
        cleanedParas.push(joined.trim());
      }
    }

    return cleanedParas.join('\n\n').trim();
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
