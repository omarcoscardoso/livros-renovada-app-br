# Lumi — Plataforma de Treinamentos (LMS) & Biblioteca Digital

Aplicação web integrada para capacitação ministerial, treinamentos em vídeo auditados, certificação e biblioteca digital com leitor editorial inteligente.

---

## 🌟 Principais Funcionalidades

### 1. Plataforma de Treinamentos & Cursos (LMS)
- **Catálogo de Cursos & Trilhas**: Cursos divididos por categorias e ministérios (Liderança, Diaconia, Louvor, Ensino, etc.).
- **Hierarquia de Pré-requisitos**:
  - **Entre Categorias**: Exigência de conclusão de categorias fundamentais antes de iniciar ministérios específicos (ex: Liderança como pré-requisito para Diaconia).
  - **Entre Cursos**: Trilha de progressão onde cursos avançados exigem a conclusão de cursos básicos.
- **Player de Videoaulas com Auditoria de Presença**:
  - Suporte a vídeos do **YouTube** e **Google Drive**.
  - Auditoria de tempo assistido/lido que impede que o aluno avance ou conclua sem consumir o conteúdo obrigatório.
- **Gestão & Emissão de Certificados**:
  - Emissão automatizada ao concluir 100% das aulas.
  - Certificados com código único de validação e verificação de autenticidade (`LUMI-YYYY-XXXX`).
  - Painel administrativo com controle para emissão manual ou revogação de certificados.
- **Painel Administrativo Modularizado (SRP)**:
  - Gestão de cursos, módulos, videoaulas e ministérios.
  - **Gestão de Alunos & Permissões**: Lista todos os membros cadastrados na plataforma e permite promover qualquer usuário a **Administrador** ou revogar permissões.
  - Métricas e KPIs em tempo real (alunos cadastrados, matrículas, taxas de conclusão, certificados).

### 2. Biblioteca Digital & Leitor Editorial
- **Leitor Editorial Completo**:
  - Modos de leitura **Sépia (Pergaminho)**, **Escuro** e **Claro**, além de controle tipográfico (`A-`, `A`, `A+`).
  - Sumário navegável por capítulos, marcação de leitura concluída e modo bilíngue (PT-BR / Original em Inglês).
  - Resumo executivo e perguntas para reflexão da liderança em cada capítulo.
  - **Busca Instantânea (`Ctrl+K`)** em todo o acervo.
  - **Exportação Multi-formato**: Download em **PDF** diagramado via `jsPDF` ou como **Aplicativo Offline em Arquivo Único HTML (`.html`)**.
- **Upload e Conversão de PDF via IA**:
  - Extração de páginas em memória e conversão automatizada em capítulos via **Gemini AI (`gemini-3.8-flash`)**.
  - Editor visual embutido para revisão editorial.
- **Mentor de Estudo IA & Gerador de Roteiro de Célula (90 min)**:
  - Assistente teológico pastoral para esclarecimento de dúvidas e geração de roteiros de reunião de célula.

### 3. Segurança & Autenticação
- **Autenticação Dupla**: Google OAuth2 (Google Sign-In) e cadastro/login direto com e-mail e senha.
- **Criptografia Forte**: Senhas protegidas com PBKDF2-SHA-512 (10.000 iterações com salt criptográfico de 16 bytes).
- **Proteção contra Força Bruta**: Rate limiting em todos os endpoints de autenticação (`/api/auth/*`).
- **Sessões Seguras**: Cookies `httpOnly`, `SameSite=Lax` e `Secure`.
- **Prevenção de Vazamento**: Histórico e repositório blindados contra credenciais e arquivos sensíveis.

---

## 📚 Documentação Técnica Detalhada

- [Catálogo Completo de Componentes e Funcionalidades](file:///home/cardoso/projetos/lumi-renovada-app-br/docs/CATALOGO_COMPONENTES_E_FUNCIONALIDADES.md)
- [Menus, Níveis de Acesso, RBAC e Endpoints da API](file:///home/cardoso/projetos/lumi-renovada-app-br/docs/PLATAFORMA_MENUS_ACESSOS_FUNCIONALIDADES.md)
- [Pipeline de Conversão de Livros e Extração de PDFs](file:///home/cardoso/projetos/lumi-renovada-app-br/docs/CONVERSAO_LIVROS_HTML.md)

---

## 🚀 Como Executar Localmente

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Configure o arquivo `.env` a partir do modelo (as chaves também podem ser informadas diretamente na interface web):
   ```bash
   cp .env.example .env
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   Acesse a aplicação em `http://localhost:3000`.

---

## 🧪 Testes Automatizados e Validação

```bash
# Executar suíte completa de testes (Vitest)
npm run test

# Verificação estática de tipos TypeScript
npx tsc --noEmit

# Compilação de produção (Vite)
npm run build
```

---

## ☁️ Deploy no Google Cloud Run

O projeto conta com `Dockerfile` multi-stage otimizado e integração nativa com o bucket `gs://livros-renovada-app-br`:

```bash
gcloud run deploy livros-renovada-app-br \
  --source . \
  --project=renovada-app-br \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=renovada-app-br,GCS_BUCKET=livros-renovada-app-br"
```
