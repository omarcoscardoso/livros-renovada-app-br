# Biblioteca Digital & Leitor de Livros — IPR Viamão

Aplicação web para armazenamento, leitura estruturada e conversão inteligente de livros em PDF para o formato editorial de estudo e liderança.

## Funcionalidades Principais

- **Leitor Editorial Completo**:
  - Modos de leitura **Sépia (Pergaminho)**, **Escuro** e **Claro**, além de controle de tipografia (`A-`, `A`, `A+`).
  - Sumário navegável por capítulos, marcação de capítulos concluídos, cópia rápida de texto e modo bilíngue (PT-BR / Original) quando disponível.
  - Resumo executivo, seções organizadas e perguntas para reflexão da liderança em cada capítulo.
  - **Busca Instantânea (`Ctrl+K`)** em todo o conteúdo do livro ativo.
  - **Exportação**: Download do livro diagramado em **PDF (`.pdf`)** via `jsPDF` ou como **Aplicativo Offline em Arquivo Único HTML (`.html`)**, além de visualização e download do **PDF Original**.
- **Acervo & Estante Digital Multi-Livros**:
  - Armazenamento de capas (`covers/`) e arquivos PDF (`pdfs/`), além de sincronização de banco de dados SQLite (`db/library.sqlite`), integrado ao **Google Cloud Storage (`gs://livros-renovada-app-br`)** com cache e fallback local.
  - Pré-carregado com a tradução integral de *"A Igreja em Células"* (*The Cell Church* — Larry Stockstill, 1998).
- **Upload e Conversão Automática de PDF**:
  - Área dedicada para envio de novos livros em `.pdf`.
  - Extração de páginas e conversão automática em capítulos, seções, resumos e perguntas de reflexão utilizando **Gemini AI (`gemini-3.8-flash`)** com fallback automático para estruturação local.
  - Editor embutido para revisar e ajustar metadados, capítulos, parágrafos e perguntas de estudo.
- **Mentor de Estudo IA & Gerador de Roteiro de Célula (90 min)**:
  - Assistente integrado em cada capítulo para responder dúvidas e gerar roteiros completos de reunião de célula.

## Como Executar Localmente

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Configure o arquivo `.env` (opcional, a chave também pode ser informada diretamente na interface web):
   ```env
   GEMINI_API_KEY="sua_chave_gemini_aqui"
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   Acesse em `http://localhost:3000`.

## Deploy no Google Cloud Run

O projeto conta com `Dockerfile` multi-stage otimizado e integração nativa com o bucket `gs://livros-renovada-app-br` no projeto `renovada-app-br`:

```bash
gcloud run deploy livros-renovada-app-br \
  --source . \
  --project=renovada-app-br \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=renovada-app-br,GCS_BUCKET=livros-renovada-app-br"
```
