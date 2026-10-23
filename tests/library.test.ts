import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { getDatabase } from '../src/server/db/database';
import {
  DEFAULT_BOOK_ID,
  SqliteBookRepository,
} from '../src/server/repositories/bookRepository';
import { PdfExtractorService } from '../src/server/services/pdfExtractorService';
import {
  InMemoryStorageService,
  DEFAULT_GCS_BUCKET,
} from '../src/server/services/storageService';
import { searchBook, generateStandaloneBookHtml } from '../src/data/bookData';

describe('Biblioteca Digital & Conversor PDF', () => {
  let tempDbPath: string;
  let repo: SqliteBookRepository;

  beforeEach(() => {
    tempDbPath = path.join(
      os.tmpdir(),
      `test_library_${Date.now()}_${Math.random().toString(36).slice(2)}.sqlite`
    );
    const db = getDatabase(tempDbPath);
    repo = new SqliteBookRepository(db);
    repo.seedDefaultBookIfNeeded();
  });

  afterEach(() => {
    if (tempDbPath && fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
      } catch {
        // ignore
      }
    }
  });

  it('deve semear o livro padrão "A Igreja em Células" com todos os 13 capítulos', () => {
    const books = repo.listBooks();
    expect(books.length).toBe(1);
    expect(books[0].id).toBe(DEFAULT_BOOK_ID);
    expect(books[0].titlePt).toBe('A Igreja em Células');
    expect(books[0].chapterCount).toBe(13);

    const fullBook = repo.getBookByIdOrSlug(DEFAULT_BOOK_ID);
    expect(fullBook).not.toBeNull();
    expect(fullBook?.chapters.length).toBe(13);
    expect(fullBook?.chapters[0].id).toBe('intro');
  });

  it('deve criar, atualizar e remover um novo livro convertido de PDF', () => {
    const created = repo.createBook({
      id: 'book-test-1',
      slug: 'livro-teste-1',
      titlePt: 'Manual de Discipulado',
      titleEn: 'Discipleship Manual',
      subtitlePt: 'Guia Prático',
      subtitleEn: 'Practical Guide',
      author: 'Pr. João Silva',
      originalYear: 2025,
      publisher: 'IPR Viamão',
      translatorNote: 'Edição de teste',
      coverColor: 'emerald',
      status: 'processing',
      conversionProgress: 'Extraindo páginas...',
      conversionPercent: 20,
      chapters: [],
    });

    expect(created.id).toBe('book-test-1');
    expect(created.status).toBe('processing');

    repo.updateBookContent('book-test-1', {
      status: 'ready',
      conversionPercent: 100,
      conversionProgress: 'Concluído',
      chapters: [
        {
          id: 'cap-1',
          number: 1,
          titlePt: 'Capítulo 1: O Chamado',
          titleEn: 'Chapter 1: The Call',
          pages: '1-10',
          estimatedReadTimeMinutes: 8,
          summaryPt: 'O chamado ao discipulado cristão.',
          keyPointsPt: ['Obediência', 'Comunhão'],
          studyQuestionsPt: ['Como aplicar hoje?'],
          sections: [
            {
              id: 'sec-1',
              titlePt: 'Introdução ao Chamado',
              titleEn: 'Introduction',
              paragraphsPt: ['Jesus chamou os doze para estarem com Ele.'],
              paragraphsEn: [],
            },
          ],
        },
      ],
    });

    const updated = repo.getBookByIdOrSlug('book-test-1');
    expect(updated?.status).toBe('ready');
    expect(updated?.chapters.length).toBe(1);
    expect(updated?.chapters[0].titlePt).toBe('Capítulo 1: O Chamado');

    // Deve permitir remover qualquer livro, inclusive o inicial quando solicitado pelo usuário
    const deletedDefault = repo.deleteBook(DEFAULT_BOOK_ID);
    expect(deletedDefault).toBe(true);
    expect(repo.getSetting('default_book_deleted')).toBe('true');

    // Deve remover o livro customizado
    const deleted = repo.deleteBook('book-test-1');
    expect(deleted).toBe(true);
    expect(repo.getBookByIdOrSlug('book-test-1')).toBeNull();
  });

  it('deve estruturar capítulos, seções, resumo e perguntas a partir de páginas extraídas de PDF', () => {
    const extractor = new PdfExtractorService();
    const structured = extractor.buildStructuredBookFromPages(
      {
        totalPages: 4,
        pages: [
          'Capítulo 1: A Visão da Igreja\n\nA igreja primitiva reunia-se no templo e de casa em casa. O relacionamento fraterno fortalecia a fé dos novos convertidos.\n\nCada lar tornava-se um farol de esperança e oração na vizinhança.',
          'Quando olhamos para o livro de Atos dos Apóstolos, percebemos que o crescimento acontecia de forma orgânica através da multiplicação de líderes.',
          'Capítulo 2: Multiplicando Discípulos\n\nO discipulado eficaz requer acompanhamento próximo, exemplo de vida e ensino constante da Palavra de Deus.\n\nLíderes que formam novos líderes garantem a continuidade da missão.',
          'Portanto, cada célula deve manter o foco na colheita e no cuidado mútuo.',
        ],
        fullText: 'Texto completo',
      },
      'Visao_Celular_2026.pdf',
      {
        titlePt: 'A Visão Celular Contemporânea',
        author: 'IPR Viamão',
        originalYear: 2026,
      }
    );

    expect(structured.titlePt).toBe('A Visão Celular Contemporânea');
    expect(structured.author).toBe('IPR Viamão');
    expect(structured.chapters.length).toBeGreaterThanOrEqual(2);
    expect(structured.chapters[0].sections.length).toBeGreaterThan(0);
    expect(structured.chapters[0].studyQuestionsPt.length).toBeGreaterThan(0);

    // Verifica se a busca e a geração de HTML standalone funcionam com o novo livro
    const searchRes = searchBook('Atos dos Apóstolos', structured.chapters);
    expect(searchRes.length).toBe(1);

    const html = generateStandaloneBookHtml(structured, structured.chapters);
    expect(html).toContain('A Visão Celular Contemporânea');
    // Regra 1: Na versão HTML não deve incluir "seções", o texto é direto em parágrafos do capítulo
    expect(html).not.toContain('<h2 class="section-title">');
    expect(html).toContain('A igreja primitiva reunia-se no templo e de casa em casa.');
  });

  it('deve isolar o Sumário e identificar Dedicatória e Introdução antes dos capítulos', () => {
    const extractor = new PdfExtractorService();
    const pdfData = {
      totalPages: 6,
      pages: [
        // Página 1: Folha de Rosto
        'LIVRO DE EXEMPLO\nAutor Exemplo\nEditora Digital',
        // Página 2: Dedicatória
        'DEDICATÓRIA\n\nA todos os líderes e mentores que investem suas vidas na formação de discípulos.',
        // Página 3: Sumário / Índice
        'SUMÁRIO\n\nDedicatória ............ 2\nIntrodução ............ 4\nCapítulo 1: O Início .. 5\nCapítulo 2: O Avanço .. 6',
        // Página 4: Introdução
        'INTRODUÇÃO\n\nBem-vindo a esta jornada de aprendizado bíblico e liderança prática. Este texto serve como alicerce.',
        // Página 5: Capítulo 1
        'Capítulo 1: O Início\n\nNo princípio de cada grande obra existe uma convicção sólida e um propósito bem definido.\n\n"Tudo posso naquele que me fortalece" (Filipenses 4:13) resume nossa determinação.',
        // Página 6: Capítulo 2
        'Capítulo 2: O Avanço\n\nO avanço sustentável requer fidelidade nos pequenos começos e comunhão genuína.',
      ],
      fullText: 'Texto completo simulado',
    };

    const structured = extractor.buildStructuredBookFromPages(pdfData, 'livro_teste.pdf', {
      titlePt: 'Livro de Exemplo',
      author: 'Autor Exemplo',
    });

    // 1. Deve ter seções/capítulos estruturados
    expect(structured.chapters.length).toBe(4);

    // 2. Dedicatória deve ser o primeiro item preliminar (número 0, id: dedication)
    expect(structured.chapters[0].id).toBe('dedication');
    expect(structured.chapters[0].number).toBe(0);
    expect(structured.chapters[0].titlePt).toContain('Dedicatória');
    expect(structured.chapters[0].sections[0].paragraphsPt.join(' ')).toContain('A todos os líderes e mentores');

    // 3. Introdução deve ser o segundo item preliminar (número 0, id: intro)
    expect(structured.chapters[1].id).toBe('intro');
    expect(structured.chapters[1].number).toBe(0);
    expect(structured.chapters[1].titlePt).toContain('Introdução');
    expect(structured.chapters[1].sections[0].paragraphsPt.join(' ')).toContain('Bem-vindo a esta jornada');

    // 4. Capítulo 1 deve começar após o sumário e a introdução, com seu texto exato
    expect(structured.chapters[2].id).toBe('chapter-1');
    expect(structured.chapters[2].number).toBe(1);
    expect(structured.chapters[2].titlePt).toContain('O Início');
    const ch1Text = structured.chapters[2].sections[0].paragraphsPt.join(' ');
    expect(ch1Text).toContain('No princípio de cada grande obra');
    expect(ch1Text).toContain('"Tudo posso naquele que me fortalece" (Filipenses 4:13)');

    // 5. O texto do Sumário (ex: "Dedicatória ............ 2") NUNCA deve estar dentro de nenhum capítulo
    for (const ch of structured.chapters) {
      for (const sec of ch.sections) {
        const text = sec.paragraphsPt.join(' ');
        expect(text).not.toContain('Dedicatória ............ 2');
        expect(text).not.toContain('Capítulo 1: O Início .. 5');
      }
    }

    // 6. Capítulo 2
    expect(structured.chapters[3].id).toBe('chapter-2');
    expect(structured.chapters[3].number).toBe(2);
    expect(structured.chapters[3].titlePt).toContain('O Avanço');
  });

  it('deve validar "Capítulo" e "Prefácio" como delimitadores de texto e não incluir seções no HTML', () => {
    const extractor = new PdfExtractorService();
    const pdfData = {
      totalPages: 5,
      pages: [
        // Página 1: Prefácio (delimitador)
        'PREFÁCIO: Por Larry Stockstill\n\nEste livro foi gerado no calor da oração e da comunhão pastoral.\n\nEspero que cada página fortaleça sua fé.',
        // Página 2: Continuação do Prefácio
        'A visão bíblica de discipulado transforma cidades inteiras quando praticada com perseverança.',
        // Página 3: Capítulo 1 (delimitador)
        'CAPÍTULO 1: O Começo da Visão\n\nNo primeiro ano do ministério, compreendemos que o templo não era o destino final, mas o ponto de partida.\n\nCada casa abriga uma comunidade viva.',
        // Página 4: Continuação do Capítulo 1
        'Assim como os primeiros cristãos em Jerusalém, compartilhávamos o pão com júbilo e singeleza de coração.',
        // Página 5: Capítulo 2 (delimitador)
        'Capítulo 2: O Multiplicador de Líderes\n\nO crescimento saudável decorre de pais espirituais formando novos pais espirituais.',
      ],
      fullText: 'Texto simulado com delimitadores',
    };

    const structured = extractor.buildStructuredBookFromPages(pdfData, 'livro_delimitadores.pdf', {
      titlePt: 'Princípios da Visão',
      author: 'Larry Stockstill',
    });

    // 1. Deve ter 3 unidades delimitadas: Prefácio, Capítulo 1 e Capítulo 2
    expect(structured.chapters.length).toBe(3);

    // 2. Prefácio delimitado (páginas 1 a 2)
    const preface = structured.chapters[0];
    expect(preface.id).toBe('preface');
    expect(preface.number).toBe(0);
    expect(preface.titlePt).toContain('Prefácio');
    expect(preface.pages).toBe('1-2');
    expect(preface.sections.length).toBe(1);
    expect(preface.sections[0].titlePt).toBe(''); // Sem seções artificiais
    expect(preface.sections[0].paragraphsPt.join(' ')).toContain('Este livro foi gerado no calor da oração');
    expect(preface.sections[0].paragraphsPt.join(' ')).toContain('A visão bíblica de discipulado transforma');

    // 3. Capítulo 1 delimitado (páginas 3 a 4)
    const ch1 = structured.chapters[1];
    expect(ch1.id).toBe('chapter-1');
    expect(ch1.number).toBe(1);
    expect(ch1.titlePt).toContain('O Começo da Visão');
    expect(ch1.pages).toBe('3-4');
    expect(ch1.sections.length).toBe(1);
    expect(ch1.sections[0].titlePt).toBe(''); // Sem seções artificiais
    expect(ch1.sections[0].paragraphsPt.join(' ')).toContain('No primeiro ano do ministério');
    expect(ch1.sections[0].paragraphsPt.join(' ')).toContain('Assim como os primeiros cristãos');

    // 4. Capítulo 2 delimitado (página 5)
    const ch2 = structured.chapters[2];
    expect(ch2.id).toBe('chapter-2');
    expect(ch2.number).toBe(2);
    expect(ch2.titlePt).toContain('O Multiplicador de Líderes');
    expect(ch2.pages).toBe('5');
    expect(ch2.sections.length).toBe(1);
    expect(ch2.sections[0].titlePt).toBe('');
    expect(ch2.sections[0].paragraphsPt.join(' ')).toContain('O crescimento saudável decorre de pais espirituais');

    // 5. Geração de HTML standalone: não deve conter títulos de "seções", o texto do capítulo é direto
    const standaloneHtml = generateStandaloneBookHtml(structured, structured.chapters);
    expect(standaloneHtml).not.toContain('<h2 class="section-title">');
    expect(standaloneHtml).not.toContain('class="section-title"');
    expect(standaloneHtml).toContain('Princípios da Visão');
    expect(standaloneHtml).toContain('O Começo da Visão');
    expect(standaloneHtml).toContain('No primeiro ano do ministério');
    expect(standaloneHtml).toContain('Assim como os primeiros cristãos');
  });

  it('deve extrair texto real de um buffer PDF válido usando PdfExtractorService em memória', async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.text('Capítulo 1: Fundamentos da Igreja', 20, 30);
    doc.text('A igreja em células cresce por meio da comunhão e do discipulado.', 20, 45);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    const extractor = new PdfExtractorService(new InMemoryStorageService());
    const extracted = await extractor.extractPdfPages(pdfBuffer);
    expect(extracted.totalPages).toBe(1);
    expect(extracted.fullText).toContain('Fundamentos');
  });

  it('deve salvar e recuperar capítulos marcados como lidos no localStorage do navegador por livro', async () => {
    const store: Record<string, string> = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, val: string) => {
        store[key] = String(val);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
    };

    const {
      toggleBookChapterRead,
      getBookReadChapters,
      loadAllReadChaptersMap,
      saveBookLastVisitedChapter,
      getBookLastVisitedChapter,
    } = await import('../src/utils/readingProgressStorage');

    // Marca capítulos em dois livros distintos
    const listA1 = toggleBookChapterRead('cell-church-larry-stockstill', 'intro');
    expect(listA1).toEqual(['intro']);

    const listA2 = toggleBookChapterRead('cell-church-larry-stockstill', 'ch1');
    expect(listA2).toEqual(['intro', 'ch1']);

    const listB1 = toggleBookChapterRead('book-custom-2', 'cap-1');
    expect(listB1).toEqual(['cap-1']);

    // Verifica que trocar de livro preserva os capítulos lidos de ambos no navegador
    expect(getBookReadChapters('cell-church-larry-stockstill')).toEqual(['intro', 'ch1']);
    expect(getBookReadChapters('book-custom-2')).toEqual(['cap-1']);

    // Desmarcar capítulo funciona e persiste
    const listA3 = toggleBookChapterRead('cell-church-larry-stockstill', 'intro');
    expect(listA3).toEqual(['ch1']);
    expect(loadAllReadChaptersMap()['cell-church-larry-stockstill']).toEqual(['ch1']);

    // Verifica último capítulo visitado
    saveBookLastVisitedChapter('book-custom-2', 'cap-3');
    expect(getBookLastVisitedChapter('book-custom-2')).toBe('cap-3');
  });

  it('deve descobrir e extrair a imagem da capa a partir de um Buffer PDF em memória sem tocar o disco', async () => {
    const books = repo.listBooks();
    expect(books[0].coverImageUrl).toBe(`/api/books/${DEFAULT_BOOK_ID}/cover`);

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFillColor(180, 83, 9);
    doc.rect(20, 20, 170, 250, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('CAPA DO LIVRO DE TESTE', 45, 120);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    const memoryStorage = new InMemoryStorageService();
    const extractor = new PdfExtractorService(memoryStorage);
    const coverRes = await extractor.extractBookCoverImage(pdfBuffer, 'test_cover_book', 1);
    expect(coverRes).not.toBeNull();
    expect(coverRes?.pageNumber).toBe(1);
    expect(coverRes?.filename).toBe('test_cover_book_cover.png');

    const savedBuffer = await memoryStorage.getCoverBuffer('test_cover_book_cover.png');
    expect(savedBuffer).not.toBeNull();
    expect(savedBuffer!.length).toBeGreaterThan(100);
  });

  it('deve configurar o InMemoryStorageService com o bucket padrão e expor metadados de capa e PDF', async () => {
    const storage = new InMemoryStorageService();
    expect(storage.getBucketName()).toBe(DEFAULT_GCS_BUCKET);
    expect(repo.getCoverFilename(DEFAULT_BOOK_ID)).toBe(`${DEFAULT_BOOK_ID}_cover.png`);
    expect(repo.getPdfMetadata(DEFAULT_BOOK_ID)?.filename).toBe(
      'The_Cell_Church_-_Larry_Stockstill_020021f2.pdf'
    );
  });

  it('deve extrair metadados locais de um PDF (título, autor, ano, editora e categoria)', async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.text('LIDERANCA EFICAZ', 20, 30);
    doc.text('by Dr. John Maxwell', 20, 50);
    doc.text('Copyright (c) 2018 by Maxwell Publishing', 20, 70);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    const extractor = new PdfExtractorService(new InMemoryStorageService());
    const metadata = await extractor.extractLocalMetadata(pdfBuffer, 'Lideranca_Eficaz.pdf');

    expect(metadata.titlePt).toContain('Lideranca Eficaz');
    expect(metadata.author).toContain('Dr. John Maxwell');
    expect(metadata.originalYear).toBe(2018);
    expect(metadata.category).toBe('Liderança');
    expect(metadata.source).toBe('local');
  });

  it('deve executar o pipeline de higienização de texto (Fase 2: running headers, dewrapping e OCR)', () => {
    const extractor = new PdfExtractorService(new InMemoryStorageService());

    // Teste de eliminação de running headers e footers repetitivos
    const rawPages = [
      'THE CELL CHURCH\nCapítulo 1\nO vento começou a soprar em Viamão.\n1',
      'THE CELL CHURCH\nCapítulo 1 continua aqui.\nA visão celular se expande dia a dia.\n2',
      'THE CELL CHURCH\nCapítulo 1 parte 3.\nReunião de discipulado nos lares.\n3',
      'THE CELL CHURCH\nCapítulo 1 parte 4.\nConclusão da lição prática da semana.\n4',
    ];

    const stripped = extractor.stripRunningHeadersAndFooters(rawPages);
    for (const page of stripped) {
      expect(page).not.toContain('THE CELL CHURCH');
      expect(page.split('\n')[0]).not.toBe('THE CELL CHURCH');
      // Não deve terminar com número isolado de página
      const lastLine = page.trim().split('\n').pop() || '';
      expect(/^\d+$/.test(lastLine)).toBe(false);
    }

    // Teste de dewrapping e normalização tipográfica
    const noisyText =
      'Esta é uma frase de um livro que foi cor-\ntada ao meio pelo PDF sem pontuação\nterminal e continua perfeitamente.\n\nSegundo parágrafo em C™te d’Ivoire com travessão -- e aspas "citadas".';

    const cleaned = extractor.cleanExtractedText(noisyText);
    expect(cleaned).toContain('cortada ao meio pelo PDF sem pontuação terminal e continua perfeitamente.');
    expect(cleaned).toContain('Côte d’Ivoire');
    expect(cleaned).toContain('—');
    expect(cleaned).not.toContain('cor-\ntada');
  });
});
