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
   * Identifica se uma página pertence ao Sumário / Índice do livro
   */
  public isTableOfContentsPage(pageText: string): boolean {
    if (!pageText) return false;
    const lines = pageText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return false;

    const first5 = lines.slice(0, 5).join(' ').toLowerCase();
    const hasTocHeading = /\b(sum[áa]rio|índice|indice|contents|table of contents|sumario geral|índice geral)\b/i.test(first5);

    // Linhas com estrutura típica de sumário: Título ...... Número de página
    const tocLinePattern = /^(?:cap[íi]tulo|chapter|\d+|introdu[çc][ãa]o|pref[áa]cio|[a-zà-ú\s]{3,40})\b.*?(?:\.{2,}|\s{3,}|\t+)\s*\d+\s*$/i;
    let tocLineCount = 0;
    for (const line of lines) {
      if (tocLinePattern.test(line)) {
        tocLineCount++;
      }
    }

    if (hasTocHeading && (tocLineCount >= 1 || lines.length <= 30)) {
      return true;
    }

    return tocLineCount >= 3;
  }

  /**
   * Converte números arábicos, numerais romanos ou por extenso em inteiros
   */
  public parseNumberToken(token?: string): number | null {
    if (!token) return null;
    const clean = token.replace(/[:.—-]$/, '').trim();
    const arabic = parseInt(clean, 10);
    if (!isNaN(arabic)) return arabic;

    const romanMap: Record<string, number> = {
      i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10,
      xi: 11, xii: 12, xiii: 13, xiv: 14, xv: 15, xvi: 16, xvii: 17, xviii: 18, xix: 19, xx: 20,
      xxi: 21, xxii: 22, xxiii: 23, xxiv: 24, xxv: 25, xxx: 30,
    };
    const lower = clean.toLowerCase();
    if (romanMap[lower]) return romanMap[lower];

    const wordMap: Record<string, number> = {
      um: 1, primeiro: 1, primeira: 1, one: 1, first: 1,
      dois: 2, segundo: 2, segunda: 2, two: 2, second: 2,
      tres: 3, três: 3, terceiro: 3, terceira: 3, three: 3, third: 3,
      quatro: 4, quarto: 4, quarta: 4, four: 4, fourth: 4,
      cinco: 5, quinto: 5, quinta: 5, five: 5, fifth: 5,
      seis: 6, sexto: 6, sexta: 6, six: 6, sixth: 6,
      sete: 7, setimo: 7, sétimo: 7, setima: 7, sétima: 7, seven: 7, seventh: 7,
      oito: 8, oitavo: 8, oitava: 8, eight: 8, eighth: 8,
      nove: 9, nono: 9, nona: 9, nine: 9, ninth: 9,
      dez: 10, decimo: 10, décimo: 10, decima: 10, décima: 10, ten: 10, tenth: 10,
    };
    if (wordMap[lower]) return wordMap[lower];

    return null;
  }

  /**
   * Verifica se uma linha corresponde a qualquer delimitador estrutural (Capítulo, Prefácio, Introdução, Conclusão)
   */
  public isAnyDelimiter(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 130) return false;
    return /^(?:cap[íi]tulo|capitulo|chapter|pref[áa]cio|prefacio|preface|pr[óo]logo|prologue|introdu[çc][ãa]o|introduction|conclus[ãa]o|conclusion|ep[íi]logo|epilogue|ap[êe]ndice|appendix)\b/i.test(
      trimmed
    );
  }

  /**
   * Identifica se uma linha atua como delimitador estrito de capítulo, prefácio ou introdução
   */
  public matchDelimiter(
    line: string,
    nextLine?: string
  ): {
    type: 'preface' | 'intro' | 'chapter' | 'conclusion' | 'appendix';
    number?: number;
    title: string;
    consumedNextLine?: boolean;
  } | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 130) return null;

    // 1. Delimitador Prefácio (regra 3)
    const prefaceRegex = /^(?:pref[áa]cio|prefacio|preface|pr[óo]logo|prologue)\b(?:\s*[:.—-]?\s*(.*))?$/i;
    const prefMatch = trimmed.match(prefaceRegex);
    if (prefMatch) {
      const rest = prefMatch[1]?.trim() || '';
      let title = 'Prefácio';
      let consumedNextLine = false;

      if (rest) {
        title = `Prefácio: ${rest.replace(/^[:.—-\s]+/, '')}`;
      } else if (
        nextLine &&
        nextLine.trim().length > 2 &&
        nextLine.trim().length < 80 &&
        !this.isAnyDelimiter(nextLine)
      ) {
        title = `Prefácio: ${nextLine.trim()}`;
        consumedNextLine = true;
      }

      return {
        type: 'preface',
        number: 0,
        title,
        consumedNextLine,
      };
    }

    // 2. Delimitador Capítulo (regra 2)
    const chapterRegex =
      /^(?:cap[íi]tulo|capitulo|chapter)\b(?:\s*[:.—-]?\s*([a-z0-9à-ú]+))?(?:\s*[:.—-]?\s*(.*))?$/i;
    const chapMatch = trimmed.match(chapterRegex);
    if (chapMatch) {
      const rawNum = chapMatch[1]?.trim();
      const parsedNum = this.parseNumberToken(rawNum);
      const rest = chapMatch[2]?.trim() || '';
      let title = trimmed;
      let consumedNextLine = false;

      if (parsedNum !== null && rest) {
        title = `Capítulo ${parsedNum}: ${rest.replace(/^[:.—-\s]+/, '')}`;
      } else if (
        parsedNum !== null &&
        !rest &&
        nextLine &&
        nextLine.trim().length > 2 &&
        nextLine.trim().length < 80 &&
        !this.isAnyDelimiter(nextLine)
      ) {
        title = `Capítulo ${parsedNum}: ${nextLine.trim()}`;
        consumedNextLine = true;
      } else if (parsedNum !== null && !rest) {
        title = `Capítulo ${parsedNum}`;
      }

      return {
        type: 'chapter',
        number: parsedNum ?? undefined,
        title,
        consumedNextLine,
      };
    }

    // 3. Delimitador Introdução
    const introRegex = /^(?:introdu[çc][ãa]o|introduction)\b(?:\s*[:.—-]?\s*(.*))?$/i;
    const introMatch = trimmed.match(introRegex);
    if (introMatch) {
      const rest = introMatch[1]?.trim() || '';
      let title = 'Introdução';
      let consumedNextLine = false;

      if (rest) {
        title = `Introdução: ${rest.replace(/^[:.—-\s]+/, '')}`;
      } else if (
        nextLine &&
        nextLine.trim().length > 2 &&
        nextLine.trim().length < 80 &&
        !this.isAnyDelimiter(nextLine)
      ) {
        title = `Introdução: ${nextLine.trim()}`;
        consumedNextLine = true;
      }

      return {
        type: 'intro',
        number: 0,
        title,
        consumedNextLine,
      };
    }

    // 4. Delimitador Conclusão / Apêndice / Epílogo
    const endRegex =
      /^(?:conclus[ãa]o|conclusion|ep[íi]logo|epilogue|ap[êe]ndice|appendix)\b(?:\s*[:.—-]?\s*(.*))?$/i;
    const endMatch = trimmed.match(endRegex);
    if (endMatch) {
      const isAppendix = /ap[êe]ndice|appendix/i.test(trimmed);
      return {
        type: isAppendix ? 'appendix' : 'conclusion',
        title: trimmed,
      };
    }

    return null;
  }

  /**
   * Identifica se uma página pertence a seções de Dedicatória / Agradecimentos
   */
  public isDedicationPage(pageText: string, pageNumber: number): boolean {
    if (!pageText || pageNumber > 15) return false;
    const firstLines = pageText.split('\n').slice(0, 4).join(' ').toLowerCase();
    return /\b(dedicat[óo]ria|dedication|agradecimentos|acknowledgements|acknowledgments)\b/i.test(firstLines);
  }

  /**
   * Identifica se uma página pertence a Prefácio ou Introdução
   */
  public isIntroOrPrefacePage(pageText: string, pageNumber: number): 'preface' | 'intro' | null {
    if (!pageText || pageNumber > 25) return null;
    const firstLines = pageText.split('\n').slice(0, 4).join(' ').toLowerCase();
    if (/\b(pref[áa]cio|preface|foreword|pr[óo]logo|prologue)\b/i.test(firstLines)) {
      return 'preface';
    }
    if (/\b(introdu[çc][ãa]o|introduction)\b/i.test(firstLines)) {
      return 'intro';
    }
    return null;
  }

  /**
   * Identifica se uma página inicia um novo capítulo com base em cabeçalhos explícitos
   */
  public isChapterHeading(text: string): boolean {
    const firstLines = text.split('\n').slice(0, 4).join('\n');
    return /^(?:cap[íi]tulo|chapter|li[çc][ãa]o|lesson|parte|part|ap[êe]ndice|appendix|conclus[ãa]o|conclusion|ep[íi]logo|epilogue)\b/im.test(firstLines);
  }

  /**
   * Tenta extrair itens de Sumário com seus respectivos números de página de destino
   */
  public parseTableOfContentsEntries(
    tocPages: Array<{ pageNumber: number; text: string }>
  ): Array<{ title: string; pageNumber: number }> {
    const entries: Array<{ title: string; pageNumber: number }> = [];
    const entryRegex =
      /^(?:cap[íi]tulo\s*\d*[:.—-]?|chapter\s*\d*[:.—-]?|\d+[:.—-]?)\s*(.*?)(?:\.{2,}|\s{3,}|\t+)\s*(\d+)\s*$/i;

    for (const page of tocPages) {
      const lines = page.text.split('\n').map((l) => l.trim()).filter(Boolean);
      for (const line of lines) {
        const match = line.match(entryRegex);
        if (match) {
          const rawTitle = match[1]?.trim() || line;
          const targetPage = parseInt(match[2], 10);
          if (!isNaN(targetPage) && targetPage > 0) {
            entries.push({
              title: rawTitle.replace(/\.+$/, '').trim(),
              pageNumber: targetPage,
            });
          }
        }
      }
    }

    return entries;
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
            titlePt: '',
            titleEn: '',
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

    // 1. Identificar páginas de Sumário / Índice (NUNCA incluir no texto de leitura)
    const tocPages: Array<{ pageNumber: number; text: string }> = [];
    const tocPageNumbers = new Set<number>();

    for (const page of nonEmptyPages.slice(0, 15)) {
      if (this.isTableOfContentsPage(page.text)) {
        tocPages.push(page);
        tocPageNumbers.add(page.pageNumber);
      }
    }

    // 2. Identificar seções de Front Matter preliminares (Dedicatória)
    const dedicationPages: Array<{ pageNumber: number; text: string }> = [];
    const candidateBodyPages: Array<{ pageNumber: number; text: string }> = [];

    for (const page of nonEmptyPages) {
      // Se for página de Sumário / Índice, NUNCA incluir no texto de leitura dos capítulos!
      if (tocPageNumbers.has(page.pageNumber)) {
        continue;
      }

      // Dedicatória e Agradecimentos nas páginas preliminares
      if (page.pageNumber <= 15 && this.isDedicationPage(page.text, page.pageNumber)) {
        dedicationPages.push(page);
        continue;
      }

      candidateBodyPages.push(page);
    }

    // Identifica primeira página onde inicia o conteúdo de leitura
    const firstContentPage = Math.min(
      ...dedicationPages.map((p) => p.pageNumber),
      ...tocPages.map((p) => p.pageNumber),
      ...candidateBodyPages
        .filter((p) => this.isChapterHeading(p.text) || this.isAnyDelimiter(p.text.split('\n')[0]))
        .map((p) => p.pageNumber),
      Infinity
    );

    // Páginas antes de firstContentPage são capa, folha de rosto ou ficha catalográfica
    const bodyPages = candidateBodyPages.filter((p) => {
      if (isFinite(firstContentPage) && p.pageNumber < firstContentPage) {
        return false;
      }
      return true;
    });

    // 3. Segmentação estrita baseada em delimitadores (Capítulo e Prefácio)
    interface SegmentedGroup {
      type: 'dedication' | 'preface' | 'intro' | 'chapter' | 'conclusion' | 'appendix';
      id: string;
      number: number;
      title: string;
      startPage: number;
      endPage: number;
      paragraphs: string[];
    }

    const units: SegmentedGroup[] = [];

    // Adiciona Dedicatória se identificada
    if (dedicationPages.length > 0) {
      const dedText = dedicationPages.map((p) => p.text).join('\n\n');
      units.push({
        type: 'dedication',
        id: 'dedication',
        number: 0,
        title: 'Dedicatória',
        startPage: dedicationPages[0].pageNumber,
        endPage: dedicationPages[dedicationPages.length - 1].pageNumber,
        paragraphs: this.splitIntoReadableParagraphs(dedText),
      });
    }

    // Varre bodyPages linha a linha usando 'Prefácio' e 'Capítulo' como delimitadores rígidos
    let currentUnit: SegmentedGroup | null = null;
    let chapterCounter = 0;

    for (const page of bodyPages) {
      const pageNumber = page.pageNumber;
      const lines = page.text.split('\n').map((l) => l.trim());

      let lineIdx = 0;
      while (lineIdx < lines.length) {
        const line = lines[lineIdx];
        if (!line) {
          lineIdx++;
          continue;
        }

        // Ignora números de páginas isolados
        if (/^\s*(?:-\s*)?\d{1,4}(?:\s*-)?\s*$/.test(line)) {
          lineIdx++;
          continue;
        }

        const nextLine = lines[lineIdx + 1];
        const delimiter = this.matchDelimiter(line, nextLine);

        if (delimiter) {
          // Fecha a unidade anterior se existente
          if (currentUnit) {
            units.push(currentUnit);
            currentUnit = null;
          }

          if (delimiter.type === 'chapter') {
            chapterCounter++;
            const num = delimiter.number ?? chapterCounter;
            currentUnit = {
              type: 'chapter',
              id: `chapter-${num}`,
              number: num,
              title: delimiter.title || `Capítulo ${num}`,
              startPage: pageNumber,
              endPage: pageNumber,
              paragraphs: [],
            };
          } else if (delimiter.type === 'preface') {
            currentUnit = {
              type: 'preface',
              id: 'preface',
              number: 0,
              title: delimiter.title || 'Prefácio',
              startPage: pageNumber,
              endPage: pageNumber,
              paragraphs: [],
            };
          } else if (delimiter.type === 'intro') {
            currentUnit = {
              type: 'intro',
              id: 'intro',
              number: 0,
              title: delimiter.title || 'Introdução',
              startPage: pageNumber,
              endPage: pageNumber,
              paragraphs: [],
            };
          } else {
            const isApp = delimiter.type === 'appendix';
            currentUnit = {
              type: delimiter.type,
              id: isApp ? `appendix-${units.length + 1}` : 'conclusion',
              number: units.length + 1,
              title: delimiter.title,
              startPage: pageNumber,
              endPage: pageNumber,
              paragraphs: [],
            };
          }

          lineIdx += delimiter.consumedNextLine ? 2 : 1;
          continue;
        }

        // Acumula parágrafos da unidade ativa
        const paraLines: string[] = [line];
        lineIdx++;

        while (lineIdx < lines.length) {
          const nextL = lines[lineIdx];
          if (!nextL) {
            lineIdx++;
            break;
          }
          if (this.matchDelimiter(nextL, lines[lineIdx + 1])) {
            break;
          }
          if (/^\s*(?:-\s*)?\d{1,4}(?:\s*-)?\s*$/.test(nextL)) {
            lineIdx++;
            continue;
          }
          paraLines.push(nextL);
          lineIdx++;
        }

        const paragraphText = paraLines.join(' ').replace(/\s+/g, ' ').trim();
        if (paragraphText.length > 0) {
          if (!currentUnit) {
            currentUnit = {
              type: 'intro',
              id: 'intro',
              number: 0,
              title: 'Introdução',
              startPage: pageNumber,
              endPage: pageNumber,
              paragraphs: [],
            };
          }
          currentUnit.endPage = pageNumber;
          currentUnit.paragraphs.push(paragraphText);
        }
      }
    }

    if (currentUnit) {
      units.push(currentUnit);
    }

    // Se nenhum capítulo foi gerado a partir do corpo, adiciona o corpo todo em um capítulo 1
    if (units.length === 0 && bodyPages.length > 0) {
      const fullBodyText = bodyPages.map((p) => p.text).join('\n\n');
      units.push({
        type: 'chapter',
        id: 'chapter-1',
        number: 1,
        title: 'Capítulo 1 — Conteúdo Principal',
        startPage: bodyPages[0]?.pageNumber || 1,
        endPage: bodyPages[bodyPages.length - 1]?.pageNumber || 1,
        paragraphs: this.splitIntoReadableParagraphs(fullBodyText),
      });
    }

    const chapters: Chapter[] = units.map((group) => {
      const paragraphs = group.paragraphs.filter(Boolean);

      // Regra 1: Não inclua na conversão "seções", se o livro é separado em capítulo não use seção.
      // O texto completo é colocado diretamente nos parágrafos do capítulo, sem criar subtítulos de seção artificiais.
      const sections: BookSection[] = [
        {
          id: `${group.id}-sec-1`,
          titlePt: '',
          titleEn: '',
          paragraphsPt:
            paragraphs.length > 0 ? paragraphs : ['Conteúdo preservado do documento PDF original.'],
          paragraphsEn:
            paragraphs.length > 0 ? paragraphs : ['Original PDF preserved content.'],
        },
      ];

      const combinedText = paragraphs.join('\n\n');
      const wordCount = combinedText.split(/\s+/).length;
      const estimatedReadTimeMinutes = Math.max(2, Math.round(wordCount / 190));

      const summaryCandidate = paragraphs[0]
        ? paragraphs[0].slice(0, 260) + (paragraphs[0].length > 260 ? '...' : '')
        : `Síntese de ${group.title} (páginas ${group.startPage} a ${group.endPage}).`;

      const keyPoints = paragraphs
        .slice(0, 4)
        .map((p) => {
          const firstSent = p.split(/[.!?]/)[0]?.trim() || p.slice(0, 110);
          return firstSent.length > 120 ? firstSent.slice(0, 117) + '...' : firstSent + '.';
        })
        .filter((kp) => kp.length > 15);

      const titlePt =
        group.number === 0
          ? group.title
          : group.title.toLowerCase().startsWith('cap')
          ? group.title
          : `Capítulo ${group.number}: ${group.title}`;

      return {
        id: group.id,
        number: group.number,
        titlePt,
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
            : ['Texto integral preservado a partir do documento PDF original.'],
        studyQuestionsPt: [
          `Qual é o tema central abordado em "${group.title}" e quais são suas implicações práticas?`,
          'Como este ensinamento pode ser aplicado em sua vida pessoal e comunidade?',
          'Destaque um princípio fundamental deste capítulo para discussão em grupo.',
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
        'Texto extraído e estruturado automaticamente a partir do PDF original, com delimitadores precisos de Prefácio e Capítulos e texto direto sem divisões artificiais.',
      chapters,
    };
  }

  /**
   * Divide o texto em parágrafos lógicos e limpos, respeitando a quebra original do texto do PDF.
   */
  private splitIntoReadableParagraphs(text: string): string[] {
    if (!text) return [];

    const rawBlocks = text
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    const result: string[] = [];

    for (const block of rawBlocks) {
      // Ignora números de páginas isolados residuais
      if (/^\s*(?:-\s*)?\d{1,4}(?:\s*-)?\s*$/.test(block)) continue;

      const cleanBlock = block.replace(/[ \t]+/g, ' ').trim();
      if (cleanBlock.length > 0) {
        result.push(cleanBlock);
      }
    }

    return result.length > 0 ? result : [text.trim()];
  }
}
