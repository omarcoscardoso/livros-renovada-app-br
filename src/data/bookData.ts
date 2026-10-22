import { BookInfo, Chapter } from './bookTypes';
import { chapter0 } from './chapters/chapter0_intro';
import { chapter1 } from './chapters/chapter1_wind';
import { chapter2 } from './chapters/chapter2_windows';
import { chapter3 } from './chapters/chapter3_partnership';
import { chapter4 } from './chapters/chapter4_evangelism';
import { chapter5 } from './chapters/chapter5_multiply';
import { chapter6 } from './chapters/chapter6_leadership';
import { chapter7 } from './chapters/chapter7_diamond';
import { chapter8 } from './chapters/chapter8_twelve';
import { chapter9 } from './chapters/chapter9_transition';
import { chapter10 } from './chapters/chapter10_dangers';
import { chapter11 } from './chapters/chapter11_infinity';
import { chapter12 } from './chapters/chapter12_appendix';

export const allChapters: Chapter[] = [
  chapter0,
  chapter1,
  chapter2,
  chapter3,
  chapter4,
  chapter5,
  chapter6,
  chapter7,
  chapter8,
  chapter9,
  chapter10,
  chapter11,
  chapter12,
];

export const bookInfo: BookInfo = {
  titlePt: 'A Igreja em Células',
  titleEn: 'The Cell Church',
  subtitlePt: 'Preparando Sua Igreja para a Colheita que se Aproxima',
  subtitleEn: 'Preparing Your Church for the Coming Harvest',
  author: 'Larry Stockstill',
  originalYear: 1998,
  publisher: 'Regal Books / Gospel Light (Tradução Completa para o Português do Brasil)',
  translatorNote:
    'Esta tradução completa para o Português do Brasil foi elaborada com rigor teológico, fidelidade ao texto original em inglês de Larry Stockstill e terminologia eclesiástica contemporânea utilizada nas igrejas celulares do Brasil.',
  chapters: allChapters,
};

// Search across chapters and sections of a given book (defaults to allChapters)
export interface SearchResult {
  chapterId: string;
  chapterNumber: number;
  chapterTitlePt: string;
  sectionTitlePt: string;
  snippetPt: string;
  snippetEn: string;
  matchScore: number;
}

export function searchBook(query: string, chaptersToSearch: Chapter[] = allChapters): SearchResult[] {
  if (!query || query.trim().length < 2) return [];

  const q = query.toLowerCase().trim();
  const results: SearchResult[] = [];

  for (const ch of chaptersToSearch) {
    for (const sec of ch.sections) {
      for (let i = 0; i < sec.paragraphsPt.length; i++) {
        const pt = sec.paragraphsPt[i];
        const en = sec.paragraphsEn[i] || '';
        const ptLower = pt.toLowerCase();
        const enLower = en.toLowerCase();

        if (ptLower.includes(q) || enLower.includes(q)) {
          const matchIdx = ptLower.indexOf(q) >= 0 ? ptLower.indexOf(q) : 0;
          const start = Math.max(0, matchIdx - 60);
          const end = Math.min(pt.length, matchIdx + q.length + 90);
          const snippetPt = (start > 0 ? '...' : '') + pt.slice(start, end) + (end < pt.length ? '...' : '');

          results.push({
            chapterId: ch.id,
            chapterNumber: ch.number,
            chapterTitlePt: ch.titlePt,
            sectionTitlePt: sec.titlePt,
            snippetPt,
            snippetEn: en ? en.slice(0, 160) + '...' : '',
            matchScore: ptLower.includes(q) ? 2 : 1,
          });
        }
      }
    }
  }

  return results.slice(0, 30);
}

// Generate complete Markdown text of the book for export / download
export function generateBookMarkdown(
  book: BookInfo = bookInfo,
  chapters: Chapter[] = book.chapters || allChapters
): string {
  let md = `# ${book.titlePt}\n## ${book.subtitlePt}\n**Autor:** ${book.author}\n\n---\n\n`;
  md += `> ${book.translatorNote}\n\n`;

  for (const ch of chapters) {
    md += `\n# ${ch.titlePt}\n`;
    if (ch.subtitlePt) md += `*${ch.subtitlePt}*\n\n`;
    md += `**Resumo Executivo:** ${ch.summaryPt}\n\n`;
    md += `### Pontos Principais:\n`;
    ch.keyPointsPt.forEach((kp) => {
      md += `- ${kp}\n`;
    });
    md += `\n`;

    for (const sec of ch.sections) {
      md += `\n## ${sec.titlePt}\n\n`;
      sec.paragraphsPt.forEach((p) => {
        md += `${p}\n\n`;
      });
    }

    md += `\n### Perguntas de Aplicação e Estudo:\n`;
    ch.studyQuestionsPt.forEach((sq, i) => {
      md += `${i + 1}. ${sq}\n`;
    });
    md += `\n---\n`;
  }

  return md;
}

// Generate formatted HTML document for Word (.doc) export
export function generateBookHtmlDocument(
  book: BookInfo = bookInfo,
  chapters: Chapter[] = book.chapters || allChapters
): string {
  let body = `
  <div style="font-family: Georgia, serif; max-width: 800px; margin: 0 auto; color: #111; line-height: 1.7;">
    <div style="text-align: center; padding: 40px 0; border-bottom: 2px solid #ccc;">
      <h1 style="font-size: 32px; margin-bottom: 8px;">${book.titlePt}</h1>
      <h3 style="font-size: 18px; color: #555; font-weight: normal; margin-top: 0;">${book.subtitlePt}</h3>
      <p style="font-size: 16px; margin-top: 20px;"><strong>Autor:</strong> ${book.author} | Publicado originalmente em ${book.originalYear}</p>
      <p style="font-size: 13px; color: #777; font-style: italic;">${book.translatorNote}</p>
    </div>
  `;

  for (const ch of chapters) {
    body += `
      <div style="page-break-before: always; margin-top: 50px;">
        <h2 style="font-size: 24px; color: #8b2500; border-bottom: 1px solid #ddd; padding-bottom: 6px;">${ch.titlePt}</h2>
        ${ch.subtitlePt ? `<p style="font-style: italic; color: #666; font-size: 15px;">${ch.subtitlePt}</p>` : ''}
        
        <div style="background-color: #f7f7f7; padding: 16px; border-left: 4px solid #8b2500; margin: 20px 0;">
          <h4 style="margin: 0 0 8px 0;">Resumo do Capítulo:</h4>
          <p style="margin: 0; font-size: 14px;">${ch.summaryPt}</p>
        </div>
    `;

    for (const sec of ch.sections) {
      body += `
        <h3 style="font-size: 18px; margin-top: 30px; color: #222;">${sec.titlePt}</h3>
      `;
      sec.paragraphsPt.forEach((p) => {
        body += `<p style="margin-bottom: 14px; text-align: justify;">${p}</p>`;
      });
    }

    body += `
        <div style="margin-top: 30px; padding: 16px; background-color: #fcf9f2; border: 1px solid #e8e2d5; border-radius: 6px;">
          <h4 style="margin: 0 0 10px 0; color: #7a4100;">Perguntas para Reflexão da Liderança:</h4>
          <ol style="margin: 0; padding-left: 20px; font-size: 14px;">
            ${ch.studyQuestionsPt.map((q) => `<li style="margin-bottom: 6px;">${q}</li>`).join('')}
          </ol>
        </div>
      </div>
    `;
  }

  body += `</div>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${book.titlePt}</title></head><body>${body}</body></html>`;
}

// Generate a complete, standalone, single-file HTML e-book application with embedded CSS and JS (100% offline)
export function generateStandaloneBookHtml(
  book: BookInfo = bookInfo,
  chapters: Chapter[] = book.chapters || allChapters
): string {
  const chaptersJson = JSON.stringify(chapters);
  const bookInfoJson = JSON.stringify(book);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${book.titlePt} - ${book.author} (Livro Completo)</title>
  <style>
    :root {
      --bg: #f7f3e8;
      --text: #2c2217;
      --text-muted: #705e4d;
      --border: #e3dac7;
      --accent: #b45309;
      --card-bg: #ece4d0;
      --sidebar-bg: #ece4d0;
      --font-body: 'Georgia', serif;
    }
    [data-theme="dark"] {
      --bg: #0f141c;
      --text: #e2e8f0;
      --text-muted: #94a3b8;
      --border: #1e293b;
      --accent: #f59e0b;
      --card-bg: #1e293b;
      --sidebar-bg: #141c28;
    }
    [data-theme="light"] {
      --bg: #ffffff;
      --text: #1e293b;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --accent: #d97706;
      --card-bg: #f8fafc;
      --sidebar-bg: #f1f5f9;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font-body);
      line-height: 1.8;
      transition: background-color 0.2s, color 0.2s;
    }
    header {
      position: sticky;
      top: 0;
      background: var(--bg);
      border-bottom: 1px solid var(--border);
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 100;
    }
    .header-left, .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    button, select {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
    }
    button:hover {
      border-color: var(--accent);
      color: var(--accent);
    }
    .btn-accent {
      background: var(--accent);
      color: #fff;
      border: none;
      font-weight: bold;
    }
    .btn-accent:hover {
      opacity: 0.9;
      color: #fff;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px 100px;
    }
    .toc-modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 200;
      align-items: center;
      justify-content: center;
    }
    .toc-modal.open { display: flex; }
    .toc-content {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      width: 90%;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      padding: 24px;
    }
    .toc-list { list-style: none; margin-top: 16px; }
    .toc-item {
      padding: 10px;
      border-bottom: 1px solid var(--border);
      cursor: pointer;
      font-size: 14px;
    }
    .toc-item:hover, .toc-item.active {
      color: var(--accent);
      font-weight: bold;
    }
    .chapter-header {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
    }
    .chapter-tag {
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    h1 {
      font-size: 28px;
      margin-bottom: 8px;
      line-height: 1.3;
    }
    .subtitle {
      font-size: 17px;
      color: var(--text-muted);
      font-style: italic;
      margin-bottom: 12px;
    }
    .summary-box {
      background: var(--card-bg);
      border: 1px solid var(--border);
      padding: 18px;
      border-radius: 8px;
      margin-bottom: 30px;
      font-style: italic;
      font-size: 15px;
    }
    .section-title {
      font-size: 20px;
      margin: 30px 0 16px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 6px;
      color: var(--text);
    }
    p {
      margin-bottom: 18px;
      text-align: justify;
    }
    .study-box {
      background: var(--card-bg);
      border: 1px solid var(--border);
      padding: 20px;
      border-radius: 8px;
      margin-top: 40px;
    }
    .study-box h3 {
      font-size: 16px;
      margin-bottom: 12px;
      color: var(--accent);
    }
    .study-box ol {
      padding-left: 20px;
      font-size: 14px;
    }
    .study-box li { margin-bottom: 8px; }
    .nav-footer {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
    }

    @media print {
      body {
        background: white !important;
        color: black !important;
        font-size: 11pt;
      }
      header, .nav-footer, .no-print {
        display: none !important;
      }
      .container {
        max-width: 100% !important;
        padding: 0 !important;
      }
      .page-break {
        page-break-before: always;
        break-before: page;
      }
      .summary-box, .study-box {
        background: #f8f8f8 !important;
        border-color: #ddd !important;
      }
    }
  </style>
</head>
<body data-theme="sepia">
  <header class="no-print">
    <div class="header-left">
      <button onclick="toggleToc()">☰ Sumário</button>
      <span id="current-title-bar" style="font-size: 13px; font-weight: bold;">${book.titlePt}</span>
    </div>
    <div class="header-right">
      <select id="theme-select" onchange="changeTheme(this.value)">
        <option value="sepia">Sépia</option>
        <option value="dark">Escuro</option>
        <option value="light">Claro</option>
      </select>
      <button class="btn-accent" onclick="printBook()">🖨️ Imprimir / Salvar PDF</button>
    </div>
  </header>

  <div id="toc-modal" class="toc-modal no-print" onclick="if(event.target===this) toggleToc()">
    <div class="toc-content">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3>Índice dos Capítulos</h3>
        <button onclick="toggleToc()">✕</button>
      </div>
      <ul id="toc-list" class="toc-list"></ul>
    </div>
  </div>

  <main class="container">
    <div id="chapter-view"></div>
    <div class="nav-footer no-print">
      <button id="prev-btn" onclick="prevChapter()">← Capítulo Anterior</button>
      <span id="page-indicator" style="font-size: 12px; color: var(--text-muted); align-self:center;"></span>
      <button id="next-btn" onclick="nextChapter()">Próximo Capítulo →</button>
    </div>
  </main>

  <div id="print-container" style="display: none;"></div>

  <script>
    const bookData = ${bookInfoJson};
    const chapters = ${chaptersJson};
    let currentIdx = 0;

    function init() {
      renderToc();
      renderChapter(0);
      preparePrintContent();
    }

    function toggleToc() {
      const modal = document.getElementById('toc-modal');
      modal.classList.toggle('open');
    }

    function renderToc() {
      const list = document.getElementById('toc-list');
      list.innerHTML = chapters.map((ch, idx) => \`
        <li class="toc-item \${idx === currentIdx ? 'active' : ''}" onclick="goToChapter(\${idx})">
          \${ch.titlePt}
        </li>
      \`).join('');
    }

    function goToChapter(idx) {
      currentIdx = idx;
      renderChapter(idx);
      renderToc();
      toggleToc();
      window.scrollTo(0, 0);
    }

    function prevChapter() {
      if (currentIdx > 0) {
        currentIdx--;
        renderChapter(currentIdx);
        renderToc();
        window.scrollTo(0, 0);
      }
    }

    function nextChapter() {
      if (currentIdx < chapters.length - 1) {
        currentIdx++;
        renderChapter(currentIdx);
        renderToc();
        window.scrollTo(0, 0);
      }
    }

    function changeTheme(val) {
      document.body.setAttribute('data-theme', val);
    }

    function renderChapter(idx) {
      const ch = chapters[idx];
      document.getElementById('current-title-bar').innerText = ch.titlePt;
      document.getElementById('prev-btn').disabled = idx === 0;
      document.getElementById('next-btn').disabled = idx === chapters.length - 1;
      document.getElementById('page-indicator').innerText = \`\${idx + 1} de \${chapters.length}\`;

      let html = \`
        <div class="chapter-header">
          <div class="chapter-tag">\${ch.number === 0 ? 'Apresentação' : 'Capítulo ' + ch.number} • Páginas \${ch.pages}</div>
          <h1>\${ch.titlePt}</h1>
          \${ch.subtitlePt ? \`<div class="subtitle">\${ch.subtitlePt}</div>\` : ''}
        </div>

        <div class="summary-box">
          "\${ch.summaryPt}"
        </div>
      \`;

      ch.sections.forEach(sec => {
        html += \`<h2 class="section-title">\${sec.titlePt}</h2>\`;
        sec.paragraphsPt.forEach(p => {
          html += \`<p>\${p}</p>\`;
        });
      });

      if (ch.studyQuestionsPt && ch.studyQuestionsPt.length > 0) {
        html += \`
          <div class="study-box">
            <h3>Perguntas para Reflexão da Liderança:</h3>
            <ol>
              \${ch.studyQuestionsPt.map(q => \`<li>\${q}</li>\`).join('')}
            </ol>
          </div>
        \`;
      }

      document.getElementById('chapter-view').innerHTML = html;
    }

    function preparePrintContent() {
      let printHtml = \`
        <div style="text-align:center; padding: 40px 0; border-bottom: 2px solid #000; margin-bottom: 40px;">
          <h1 style="font-size: 32px;">\${bookData.titlePt}</h1>
          <h3 style="font-size: 18px; font-weight: normal; margin-top: 10px;">\${bookData.subtitlePt}</h3>
          <p style="margin-top: 20px;"><strong>Autor:</strong> \${bookData.author} (\${bookData.originalYear})</p>
          <p style="font-size: 12px; color: #555; margin-top: 10px; font-style: italic;">\${bookData.translatorNote}</p>
        </div>
      \`;

      chapters.forEach((ch) => {
        printHtml += \`
          <div class="page-break" style="margin-top: 50px;">
            <div style="font-size: 11px; text-transform: uppercase; color: #555;">Capítulo \${ch.number}</div>
            <h2 style="font-size: 22px; margin: 10px 0;">\${ch.titlePt}</h2>
            \${ch.subtitlePt ? \`<p style="font-style: italic; color: #555; margin-bottom: 20px;">\${ch.subtitlePt}</p>\` : ''}
            
            <div style="background: #f5f5f5; padding: 14px; border-left: 3px solid #b45309; margin-bottom: 24px; font-size: 13px;">
              <strong>Resumo:</strong> \${ch.summaryPt}
            </div>
        \`;

        ch.sections.forEach(sec => {
          printHtml += \`<h3 style="font-size: 16px; margin: 24px 0 10px;">\${sec.titlePt}</h3>\`;
          sec.paragraphsPt.forEach(p => {
            printHtml += \`<p style="margin-bottom: 12px; font-size: 13px; line-height: 1.6;">\${p}</p>\`;
          });
        });

        if (ch.studyQuestionsPt && ch.studyQuestionsPt.length > 0) {
          printHtml += \`
            <div style="background: #fafafa; padding: 14px; border: 1px solid #ddd; border-radius: 6px; margin-top: 20px;">
              <h4 style="font-size: 13px; margin-bottom: 8px;">Perguntas de Reflexão:</h4>
              <ol style="padding-left: 20px; font-size: 12px;">
                \${ch.studyQuestionsPt.map(q => \`<li style="margin-bottom: 4px;">\${q}</li>\`).join('')}
              </ol>
            </div>
          \`;
        }

        printHtml += \`</div>\`;
      });

      document.getElementById('print-container').innerHTML = printHtml;
    }

    function printBook() {
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.write(\`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>\${bookData.titlePt} - \${bookData.author}</title>
              <style>
                @page { size: A4; margin: 20mm; }
                body { font-family: Georgia, serif; line-height: 1.6; color: #111; max-width: 800px; margin: 0 auto; padding: 20px; }
                h1, h2, h3, h4 { color: #222; }
                .page-break { page-break-before: always; break-before: page; }
                p { text-align: justify; margin-bottom: 14px; }
                .print-bar {
                  position: sticky; top: 0; background: #fffbe6; padding: 12px; border-bottom: 2px solid #e6b800;
                  display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;
                }
                @media print {
                  .print-bar { display: none !important; }
                  body { padding: 0 !important; }
                }
              </style>
            </head>
            <body>
              <div class="print-bar">
                <span style="font-size: 14px; font-weight: bold; color: #855d00;">Documento pronto para Impressão ou Salvar como PDF</span>
                <button onclick="window.print()" style="background:#b45309; color:#fff; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:bold;">
                  🖨️ Abrir Diálogo de Impressão / Salvar PDF
                </button>
              </div>
              \${document.getElementById('print-container').innerHTML}
            </body>
          </html>
        \`);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => printWin.print(), 350);
      } else {
        window.print();
      }
    }

    window.onload = init;
  </script>
</body>
</html>`;
}

// Reliable Print / Save PDF Trigger
export function printOrSavePdf(book: BookInfo = bookInfo, chapters: Chapter[] = book.chapters || allChapters): void {
  const standaloneHtml = generateStandaloneBookHtml(book, chapters);
  const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const printWindow = window.open(url, '_blank');

  if (!printWindow) {
    const a = document.createElement('a');
    a.href = url;
    const safeName = book.titlePt.replace(/[^a-zA-Z0-9À-ÿ]/g, '_');
    a.download = `${safeName}_Livro_Completo.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}
