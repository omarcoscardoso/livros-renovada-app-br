#!/usr/bin/env tsx
/**
 * ============================================================================
 * Lumi Renovada - Script de Importação em Massa de Livros Calibre / PDF
 * ============================================================================
 *
 * Este script faz a varredura recursiva de diretórios exportados do Calibre
 * ou pastas com arquivos PDF, lê metadados estruturados (metadata.opf),
 * valida duplicidades na biblioteca do Lumi e realiza o envio seguro
 * utilizando a Chave de API de Administração (X-Admin-Api-Key).
 *
 * Uso:
 *   npx tsx scripts/import-calibre-books.ts --dir /caminho/calibre --key <CHAVE_ADMIN>
 *
 * Ou via npm script:
 *   npm run import:books -- --dir /caminho/calibre --key <CHAVE_ADMIN>
 *
 * Opções:
 *   --dir <caminho>       Diretório contendo o acervo Calibre ou arquivos PDF (Obrigatório)
 *   --url <url>           URL do Lumi (Padrão: https://lumi.renovada.app.br)
 *   --key <chave>         Chave de Administração (ou via ADMIN_API_KEY no .env)
 *   --dry-run             Analisa os livros e exibe relatório sem fazer uploads
 *   --force               Importa mesmo se já existir livro com título idêntico
 *   --delay <ms>          Intervalo entre envios em milissegundos (Padrão: 3000ms)
 *   --limit <num>         Limita a quantidade de livros importados nesta execução
 *   --help, -h            Exibe esta mensagem de ajuda
 */

import fs from 'node:fs';
import path from 'node:path';

interface CliArgs {
  dir?: string;
  url: string;
  key?: string;
  dryRun: boolean;
  force: boolean;
  delayMs: number;
  limit?: number;
  help: boolean;
}

interface ParsedBookMeta {
  pdfPath: string;
  filename: string;
  sizeBytes: number;
  title: string;
  subtitle: string;
  author: string;
  publisher: string;
  originalYear: number;
  description: string;
  coverColor: string;
  hasOpf: boolean;
}

const COVER_COLORS = ['amber', 'indigo', 'emerald', 'blue', 'rose', 'purple', 'teal'];

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    url: process.env.LUMI_URL?.trim() || 'https://lumi.renovada.app.br',
    key: process.env.ADMIN_API_KEY?.trim() || undefined,
    dryRun: false,
    force: false,
    delayMs: 3000,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--dry-run') {
      result.dryRun = true;
    } else if (arg === '--force') {
      result.force = true;
    } else if (arg === '--dir') {
      result.dir = args[++i];
    } else if (arg.startsWith('--dir=')) {
      result.dir = arg.split('=')[1];
    } else if (arg === '--url') {
      result.url = args[++i];
    } else if (arg.startsWith('--url=')) {
      result.url = arg.split('=')[1];
    } else if (arg === '--key') {
      result.key = args[++i];
    } else if (arg.startsWith('--key=')) {
      result.key = arg.split('=')[1];
    } else if (arg === '--delay') {
      result.delayMs = parseInt(args[++i], 10) || 3000;
    } else if (arg.startsWith('--delay=')) {
      result.delayMs = parseInt(arg.split('=')[1], 10) || 3000;
    } else if (arg === '--limit') {
      result.limit = parseInt(args[++i], 10);
    } else if (arg.startsWith('--limit=')) {
      result.limit = parseInt(arg.split('=')[1], 10);
    }
  }

  // Fallback to process.env.BOOKS_DIR
  if (!result.dir && process.env.BOOKS_DIR) {
    result.dir = process.env.BOOKS_DIR;
  }

  // Remove trailing slash from URL
  result.url = result.url.replace(/\/+$/, '');

  return result;
}

function showHelp() {
  console.log(`
===============================================================================
📖 Lumi Renovada - Importador de Acervo Calibre / PDF
===============================================================================

Este script varre uma biblioteca do Calibre (ou qualquer pasta com arquivos PDF),
extrai os metadados oficiais (metadata.opf), checa duplicidades e envia cada livro
para conversão no Lumi com sua Chave de Administração.

COMO OBTER OS LIVROS DO GOOGLE DRIVE:
  1. No Google Drive, acesse a pasta "Calibre":
     https://drive.google.com/drive/folders/1wv6-SRAlYly2FXPuzJ1J6jOylkQ9SHZp
  2. Clique com botão direito no nome da pasta e selecione "Fazer download"
  3. O Google Drive baixará um arquivo compactado (ex: Calibre.zip)
  4. Descompacte o arquivo no seu computador:
     unzip Calibre.zip -d ~/Downloads/Calibre
  5. Execute este script apontando para a pasta descompactada!

EXEMPLOS DE USO:
  # 1. Simulação (Dry Run) para testar e listar livros sem enviar:
  npm run import:books -- --dir ~/Downloads/Calibre --key lumi_abc123 --dry-run

  # 2. Importação real de todos os livros:
  npm run import:books -- --dir ~/Downloads/Calibre --key lumi_abc123

  # 3. Importação para ambiente local:
  npm run import:books -- --dir ./meus-livros --url http://localhost:3000 --key lumi_abc123

  # 4. Importar apenas os primeiros 3 livros com intervalo de 5 segundos:
  npm run import:books -- --dir ~/Downloads/Calibre --key lumi_abc123 --limit 3 --delay 5000

PARÂMETROS:
  --dir <caminho>       Caminho para o diretório do Calibre ou pasta com PDFs (Obrigatório)
  --key <chave>         Chave de Administração (ou variável ADMIN_API_KEY)
  --url <url>           URL do servidor Lumi (Padrão: https://lumi.renovada.app.br)
  --dry-run             Modo de simulação: apenas analisa metadados e checa duplicidades
  --force               Força o envio mesmo se já existir livro cadastrado com mesmo título
  --delay <ms>          Pausa entre uploads em milissegundos (Padrão: 3000ms)
  --limit <num>         Quantidade máxima de livros a importar nesta execução
  --help, -h            Exibe esta ajuda
===============================================================================
`);
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
}

function parseOpfMetadata(opfContent: string) {
  // Title
  const titleMatch = opfContent.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
  let title = titleMatch ? decodeXmlEntities(titleMatch[1].trim()) : '';

  // Creator / Author
  const creatorMatch = opfContent.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/i);
  const author = creatorMatch ? decodeXmlEntities(creatorMatch[1].trim()) : '';

  // Publisher
  const publisherMatch = opfContent.match(/<dc:publisher[^>]*>([\s\S]*?)<\/dc:publisher>/i);
  const publisher = publisherMatch ? decodeXmlEntities(publisherMatch[1].trim()) : '';

  // Date / Year
  const dateMatch = opfContent.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i);
  let year = new Date().getFullYear();
  if (dateMatch) {
    const yearMatch = dateMatch[1].match(/\b(19\d\d|20\d\d)\b/);
    if (yearMatch) {
      year = parseInt(yearMatch[1], 10);
    }
  }

  // Description / Synopsis
  const descMatch = opfContent.match(/<dc:description[^>]*>([\s\S]*?)<\/dc:description>/i);
  let description = '';
  if (descMatch) {
    description = decodeXmlEntities(descMatch[1])
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Subtitle detection from title: "Title: Subtitle" or "Title - Subtitle"
  let subtitle = '';
  if (title.includes(': ')) {
    const parts = title.split(': ');
    title = parts[0].trim();
    subtitle = parts.slice(1).join(': ').trim();
  }

  return { title, subtitle, author, publisher, originalYear: year, description };
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function findPdfsRecursively(dir: string, collected: string[] = []): string[] {
  if (!fs.existsSync(dir)) return collected;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findPdfsRecursively(fullPath, collected);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
      collected.push(fullPath);
    }
  }
  return collected;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  console.log(`\n📚 Lumi Renovada - Importador de Acervo Calibre / PDF`);
  console.log(`─────────────────────────────────────────────────────────────`);
  console.log(`🌐 Servidor de Destino : ${args.url}`);
  console.log(`📁 Diretório de Origem : ${args.dir || '(Não informado)'}`);
  console.log(`⚙️  Modo de Execução   : ${args.dryRun ? '🔍 SIMULAÇÃO (Dry Run)' : '🚀 IMPORTAÇÃO REAL'}`);
  console.log(`⏱️  Intervalo de Envio : ${args.delayMs}ms`);
  if (args.limit) console.log(`🔢 Limite de Livros    : ${args.limit}`);
  console.log(`─────────────────────────────────────────────────────────────\n`);

  if (!args.dir) {
    console.error(`❌ Erro: Diretório de origem não foi informado.`);
    console.error(`Passe o parâmetro --dir /caminho/para/pasta ou use --help para instruções.`);
    process.exit(1);
  }

  if (!fs.existsSync(args.dir)) {
    console.error(`❌ Erro: O diretório "${args.dir}" não existe.`);
    process.exit(1);
  }

  if (!args.dryRun && !args.key) {
    console.error(`❌ Erro: Chave de Administração não informada.`);
    console.error(`Passe o parâmetro --key <SUA_CHAVE> ou configure a variável ADMIN_API_KEY.`);
    console.error(`Dica: A chave pode ser visualizada ou copiada no Painel de Administração do Lumi (Aba 'Chaves de API').\n`);
    process.exit(1);
  }

  // 1. Validar conectividade e obter livros já existentes
  console.log(`📡 Conectando ao servidor ${args.url}...`);
  const existingBooksMap = new Map<string, { id: string; title: string; author: string }>();

  try {
    const listRes = await fetch(`${args.url}/api/books`);
    if (!listRes.ok) {
      throw new Error(`Servidor retornou status HTTP ${listRes.status}`);
    }
    const listData = (await listRes.json()) as { books: Array<{ id: string; titlePt: string; author: string }> };
    if (Array.isArray(listData.books)) {
      for (const b of listData.books) {
        existingBooksMap.set(normalizeTitle(b.titlePt), {
          id: b.id,
          title: b.titlePt,
          author: b.author,
        });
      }
    }
    console.log(`✅ Conexão bem-sucedida! Livros já cadastrados na plataforma: ${existingBooksMap.size}\n`);
  } catch (err: any) {
    console.error(`❌ Falha ao conectar ao servidor ${args.url}: ${err?.message || err}`);
    process.exit(1);
  }

  // 2. Buscar arquivos PDF recursivamente
  console.log(`🔎 Escaneando arquivos PDF em: ${args.dir}...`);
  const pdfFiles = findPdfsRecursively(args.dir);
  console.log(`📄 Arquivos PDF encontrados: ${pdfFiles.length}\n`);

  if (pdfFiles.length === 0) {
    console.log(`⚠️  Nenhum arquivo PDF encontrado no diretório especificado.`);
    process.exit(0);
  }

  // 3. Montar metadados de cada livro
  const bookList: ParsedBookMeta[] = [];

  for (let i = 0; i < pdfFiles.length; i++) {
    const pdfPath = pdfFiles[i];
    const stat = fs.statSync(pdfPath);
    const dir = path.dirname(pdfPath);
    const opfPath = path.join(dir, 'metadata.opf');
    const hasOpf = fs.existsSync(opfPath);

    let title = '';
    let subtitle = '';
    let author = '';
    let publisher = 'Edição Digital';
    let originalYear = new Date().getFullYear();
    let description = '';

    if (hasOpf) {
      try {
        const opfContent = fs.readFileSync(opfPath, 'utf-8');
        const parsed = parseOpfMetadata(opfContent);
        title = parsed.title;
        subtitle = parsed.subtitle;
        author = parsed.author;
        if (parsed.publisher) publisher = parsed.publisher;
        if (parsed.originalYear) originalYear = parsed.originalYear;
        description = parsed.description;
      } catch (err) {
        console.warn(`⚠️ Aviso ao ler ${opfPath}:`, err);
      }
    }

    // Se o título não veio do OPF, extrair do nome do arquivo ou da pasta
    if (!title) {
      const parentDirName = path.basename(dir);
      const cleanDirName = parentDirName.replace(/\s*\(\d+\)$/, '').trim();
      const filenameNoExt = path.basename(pdfPath, path.extname(pdfPath));

      if (cleanDirName && cleanDirName !== '.' && cleanDirName !== 'Calibre') {
        title = cleanDirName;
      } else {
        title = filenameNoExt.replace(/[_-]+/g, ' ').trim();
      }
    }

    // Se o autor não veio do OPF, tentar obter da pasta pai superior
    if (!author) {
      const grandparentDirName = path.basename(path.dirname(dir));
      if (grandparentDirName && grandparentDirName !== '.' && grandparentDirName !== 'Calibre') {
        author = grandparentDirName;
      } else {
        author = 'Autor Desconhecido';
      }
    }

    const coverColor = COVER_COLORS[i % COVER_COLORS.length];

    bookList.push({
      pdfPath,
      filename: path.basename(pdfPath),
      sizeBytes: stat.size,
      title,
      subtitle,
      author,
      publisher,
      originalYear,
      description,
      coverColor,
      hasOpf,
    });
  }

  // Limitar se solicitado
  const targetBooks = args.limit ? bookList.slice(0, args.limit) : bookList;

  // 4. Exibir planejamento / Executar uploads
  console.log(`📋 Lista de Livros Identificados (${targetBooks.length}):`);
  console.log(`─────────────────────────────────────────────────────────────`);

  let countToUpload = 0;
  let countSkipped = 0;
  let countSuccess = 0;
  let countFailed = 0;

  for (let i = 0; i < targetBooks.length; i++) {
    const book = targetBooks[i];
    const norm = normalizeTitle(book.title);
    const existing = existingBooksMap.get(norm);
    const isDuplicate = Boolean(existing && !args.force);

    const prefix = `[${i + 1}/${targetBooks.length}]`;
    const sizeStr = formatBytes(book.sizeBytes);
    const metaSource = book.hasOpf ? 'Calibre OPF' : 'Nome do Arquivo';

    if (isDuplicate) {
      countSkipped++;
      console.log(`${prefix} ⏭️  PULADO (Já existe): "${book.title}" - ${book.author} (ID: ${existing?.id})`);
      continue;
    }

    countToUpload++;
    console.log(`${prefix} 📖 "${book.title}"`);
    console.log(`       Autor: ${book.author} | Ano: ${book.originalYear} | Editora: ${book.publisher}`);
    console.log(`       Tamanho: ${sizeStr} | Fonte dos Metadados: ${metaSource}`);

    if (args.dryRun) {
      console.log(`       🔍 [Simulação] Seria enviado para ${args.url}/api/books/upload\n`);
      continue;
    }

    // Upload real
    try {
      console.log(`       ⏳ Enviando PDF para processamento...`);

      const fileBuffer = fs.readFileSync(book.pdfPath);
      const blob = new Blob([fileBuffer], { type: 'application/pdf' });
      const formData = new FormData();

      formData.append('pdf', blob, book.filename);
      formData.append('titlePt', book.title);
      if (book.subtitle) {
        formData.append('subtitlePt', book.subtitle);
      }
      formData.append('author', book.author);
      formData.append('originalYear', String(book.originalYear));
      formData.append('publisher', book.publisher);
      formData.append('coverColor', book.coverColor);

      const startTime = Date.now();
      const uploadRes = await fetch(`${args.url}/api/books/upload`, {
        method: 'POST',
        headers: {
          'X-Admin-Api-Key': args.key!,
        },
        body: formData,
      });

      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        let errMsg = errorText;
        try {
          const errJson = JSON.parse(errorText);
          errMsg = errJson.error || errorText;
        } catch {
          // keep text
        }
        throw new Error(`HTTP ${uploadRes.status}: ${errMsg}`);
      }

      const resData = (await uploadRes.json()) as { book?: { id: string } };
      const bookId = resData.book?.id || 'ID desconhecido';
      countSuccess++;

      console.log(`       ✅ Sucesso! Livro criado com ID: ${bookId} (${elapsedSec}s)`);
      console.log(`       🚀 Conversão inteligente iniciada em segundo plano no servidor.\n`);

      // Marcar no mapa local para evitar duplicidade caso haja repetições no mesmo lote
      existingBooksMap.set(norm, { id: bookId, title: book.title, author: book.author });

      // Aguardar delay antes do próximo livro
      if (i < targetBooks.length - 1 && args.delayMs > 0) {
        await sleep(args.delayMs);
      }
    } catch (err: any) {
      countFailed++;
      console.error(`       ❌ Falha ao enviar "${book.title}": ${err?.message || err}\n`);
    }
  }

  // 5. Relatório Final
  console.log(`─────────────────────────────────────────────────────────────`);
  console.log(`📊 RELATÓRIO FINAL DA IMPORTAÇÃO`);
  console.log(`─────────────────────────────────────────────────────────────`);
  console.log(`Total de PDFs escaneados      : ${targetBooks.length}`);
  console.log(`Livros já cadastrados (pulados): ${countSkipped}`);
  if (args.dryRun) {
    console.log(`Livros aptos para envio       : ${countToUpload}`);
    console.log(`Modo de Simulação finalizado sem alterações.`);
  } else {
    console.log(`Livros enviados com sucesso    : ${countSuccess}`);
    console.log(`Livros com falha no envio      : ${countFailed}`);
  }
  console.log(`─────────────────────────────────────────────────────────────\n`);
}

main().catch((err) => {
  console.error('\n❌ Erro fatal durante a execução do script:', err);
  process.exit(1);
});
