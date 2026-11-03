import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { SqliteTrainingRepository } from '../src/server/repositories/trainingRepository';
import { createTrainingRouter } from '../src/server/routes/trainingRoutes';
import { getEmbedVideoUrl, detectVideoType } from '../src/utils/videoEmbed';
import { Training } from '../src/types/training';

describe('Plataforma de Treinamento Cristão (LMS - Lumi Play)', () => {
  let testDbPath: string;
  let repo: SqliteTrainingRepository;

  beforeEach(() => {
    testDbPath = path.join(process.cwd(), `test-lms-${Date.now()}-${Math.random().toString(36).substring(7)}.db`);
    repo = new SqliteTrainingRepository(testDbPath);
  });

  afterEach(() => {
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
      if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
    } catch {
      // ignore
    }
  });

  describe('Embed e Detecção de Vídeos (YouTube & Google Drive)', () => {
    it('deve identificar e converter links do YouTube corretamente', () => {
      const urlStandard = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      const urlShort = 'https://youtu.be/dQw4w9WgXcQ';
      const urlShorts = 'https://www.youtube.com/shorts/dQw4w9WgXcQ';

      expect(detectVideoType(urlStandard)).toBe('youtube');
      expect(detectVideoType(urlShort)).toBe('youtube');
      expect(detectVideoType(urlShorts)).toBe('youtube');

      expect(getEmbedVideoUrl(urlStandard, 'youtube')).toContain('/embed/dQw4w9WgXcQ');
      expect(getEmbedVideoUrl(urlShort, 'youtube')).toContain('/embed/dQw4w9WgXcQ');
      expect(getEmbedVideoUrl(urlShorts, 'youtube')).toContain('/embed/dQw4w9WgXcQ');
    });

    it('deve identificar e converter links do Google Drive para modo preview embed', () => {
      const urlDrive1 = 'https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9/view?usp=sharing';
      const urlDrive2 = 'https://drive.google.com/open?id=1a2b3c4d5e6f7g8h9';

      expect(detectVideoType(urlDrive1)).toBe('google_drive');
      expect(detectVideoType(urlDrive2)).toBe('google_drive');

      expect(getEmbedVideoUrl(urlDrive1, 'google_drive')).toBe('https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9/preview');
      expect(getEmbedVideoUrl(urlDrive2, 'google_drive')).toBe('https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9/preview');
    });
  });

  describe('Inicialização & Seed de Treinamentos Padrão', () => {
    it('deve semear os 5 treinamentos ministeriais cristãos da Igreja Renovada', () => {
      repo.seedDefaultTrainingsIfNeeded();
      const trainings = repo.getAllTrainings();

      expect(trainings.length).toBeGreaterThanOrEqual(5);

      const cellLeadership = trainings.find((t) => t.category === 'Liderança');
      expect(cellLeadership).toBeDefined();
      expect(cellLeadership?.complementaryBookId).toBe('cell-church-larry-stockstill');

      const kidsTraining = trainings.find((t) => t.category === 'Infantil');
      expect(kidsTraining).toBeDefined();

      const louvorTraining = trainings.find((t) => t.category === 'Louvor');
      expect(louvorTraining).toBeDefined();

      const diaconiaTraining = trainings.find((t) => t.category === 'Diaconia');
      expect(diaconiaTraining).toBeDefined();

      const institucionalTraining = trainings.find((t) => t.category === 'Institucionais');
      expect(institucionalTraining).toBeDefined();
    });

    it('cada treinamento padrão deve possuir aulas com vídeos do YouTube ou Google Drive', () => {
      repo.seedDefaultTrainingsIfNeeded();
      const trainings = repo.getAllTrainings();

      for (const t of trainings) {
        const fullTraining = repo.getTrainingById(t.id);
        expect(fullTraining?.lessons).toBeDefined();
        expect(fullTraining!.lessons!.length).toBeGreaterThan(0);

        for (const lesson of fullTraining!.lessons!) {
          expect(['youtube', 'google_drive']).toContain(lesson.videoType);
          expect(lesson.videoUrl.length).toBeGreaterThan(5);
          expect(lesson.durationMinutes).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('CRUD de Treinamentos & Aulas', () => {
    it('deve criar, buscar, atualizar e deletar um treinamento customizado', () => {
      const newTraining: Training = {
        id: 'curso-discipulado-1a1',
        title: 'Discipulado Um a Um',
        description: 'Capacitação prática para acompanhar novos convertidos.',
        category: 'Discipulado',
        targetAudience: 'Discipuladores & Facilitadores',
        coverImageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&q=80',
        isRequired: true,
        isFeatured: true,
        workloadHours: 4,
        complementaryBookId: 'cell-church-larry-stockstill',
        orderIndex: 10,
        isPublished: true,
        lessonsCount: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lessons: [
          {
            id: 'aula-1-fundamentos',
            trainingId: 'curso-discipulado-1a1',
            title: 'Aula 1: O Coração do Discipulador',
            videoType: 'youtube',
            videoUrl: 'https://www.youtube.com/watch?v=example1',
            durationMinutes: 18,
            orderIndex: 1,
          },
          {
            id: 'aula-2-pratica',
            trainingId: 'curso-discipulado-1a1',
            title: 'Aula 2: As Primeiras 4 Semanas',
            videoType: 'google_drive',
            videoUrl: 'https://drive.google.com/file/d/testdriveid/view',
            durationMinutes: 24,
            orderIndex: 2,
          },
        ],
      };

      repo.createTraining(newTraining);

      const saved = repo.getTrainingById('curso-discipulado-1a1');
      expect(saved).toBeDefined();
      expect(saved?.title).toBe('Discipulado Um a Um');
      expect(saved?.lessons?.length).toBe(2);

      // Atualização
      repo.updateTraining('curso-discipulado-1a1', {
        title: 'Discipulado Um a Um - Edição 2027',
        workloadHours: 6,
      });

      const updated = repo.getTrainingById('curso-discipulado-1a1');
      expect(updated?.title).toBe('Discipulado Um a Um - Edição 2027');
      expect(updated?.workloadHours).toBe(6);

      // Deleção
      const deleted = repo.deleteTraining('curso-discipulado-1a1');
      expect(deleted).toBe(true);
      expect(repo.getTrainingById('curso-discipulado-1a1')).toBeNull();
    });
  });

  describe('Acompanhamento de Progresso e Emissão Automática de Certificados', () => {
    it('deve marcar aula como concluída, recalcular percentual e emitir certificado ao atingir 100%', () => {
      repo.seedDefaultTrainingsIfNeeded();
      const allTrainings = repo.getAllTrainings();
      const training = repo.getTrainingById(allTrainings[0].id)!;
      const userId = 'user-membro-123';
      const userName = 'Gabriel Cardoso';

      const lessons = training.lessons!;
      expect(lessons.length).toBeGreaterThan(1);

      // Conclui a primeira aula
      const res1 = repo.toggleLessonProgress(userId, training.id, lessons[0].id, userName);
      expect(res1.isCompleted).toBe(true);
      expect(res1.progressPercent).toBeGreaterThan(0);
      expect(res1.progressPercent).toBeLessThan(100);
      expect(res1.certificate).toBeFalsy();

      // Conclui as demais aulas até atingir 100%
      let lastRes;
      for (let i = 1; i < lessons.length; i++) {
        lastRes = repo.toggleLessonProgress(userId, training.id, lessons[i].id, userName);
      }

      expect(lastRes?.isCompleted).toBe(true);
      expect(lastRes?.progressPercent).toBe(100);
      expect(lastRes?.isCompletedAll).toBe(true);
      expect(lastRes?.certificate).toBeDefined();
      expect(lastRes?.certificate?.trainingTitle).toBe(training.title);
      expect(lastRes?.certificate?.validationCode).toMatch(/^LUMI-\d{4}-[A-Z0-9]+$/);

      // O certificado agora deve constar na listagem do usuário
      const certs = repo.getUserCertificates(userId);
      expect(certs.length).toBe(1);
      expect(certs[0].id).toBe(lastRes?.certificate?.id);

      // A busca pública pelo ID do certificado deve funcionar
      const publicCert = repo.getCertificateById(certs[0].id);
      expect(publicCert).toBeDefined();
      expect(publicCert?.userName).toBe('Gabriel Cardoso');
    });

    it('deve permitir desmarcar uma aula e reverter status para incompleto', () => {
      repo.seedDefaultTrainingsIfNeeded();
      const allTrainings = repo.getAllTrainings();
      const training = repo.getTrainingById(allTrainings[0].id)!;
      const userId = 'user-teste-revert';
      const lessonId = training.lessons![0].id;

      // Marca como lido
      const res1 = repo.toggleLessonProgress(userId, training.id, lessonId, 'Membro Teste');
      expect(res1.isCompleted).toBe(true);

      // Desmarca
      const res2 = repo.toggleLessonProgress(userId, training.id, lessonId, 'Membro Teste');
      expect(res2.isCompleted).toBe(false);
      expect(res2.progressPercent).toBe(0);
    });
  });

  describe('Sistema de Favoritos', () => {
    it('deve favoritar e desfavoritar treinamentos para o usuário', () => {
      repo.seedDefaultTrainingsIfNeeded();
      const allTrainings = repo.getAllTrainings();
      const trainingId = allTrainings[0].id;
      const userId = 'user-fav-test';

      expect(repo.isTrainingBookmarked(userId, trainingId)).toBe(false);

      const added = repo.toggleBookmark(userId, trainingId);
      expect(added).toBe(true);
      expect(repo.isTrainingBookmarked(userId, trainingId)).toBe(true);

      const userBookmarks = repo.getUserBookmarks(userId);
      expect(userBookmarks).toContain(trainingId);

      const removed = repo.toggleBookmark(userId, trainingId);
      expect(removed).toBe(false);
      expect(repo.isTrainingBookmarked(userId, trainingId)).toBe(false);
    });
  });

  describe('Relatórios Gerenciais e Métricas para Admin', () => {
    it('deve agregar estatísticas de treinamentos por categoria e progresso dos alunos', () => {
      repo.seedDefaultTrainingsIfNeeded();
      const allTrainings = repo.getAllTrainings();
      const t1 = repo.getTrainingById(allTrainings[0].id)!;

      // Simula 2 conclusões completas
      for (const lesson of t1.lessons!) {
        repo.toggleLessonProgress('user-aluno-1', t1.id, lesson.id, 'Aluno Um');
        repo.toggleLessonProgress('user-aluno-2', t1.id, lesson.id, 'Aluno Dois');
      }

      const report = repo.getAdminReportSummary();
      expect(report.totalTrainings).toBeGreaterThanOrEqual(5);
      expect(report.totalLessons).toBeGreaterThan(0);
      expect(report.totalCompletions).toBe(2);
      expect(report.totalCertificates).toBe(2);
      expect(report.categoryStats.length).toBeGreaterThan(0);

      const catStats = report.categoryStats.find((c) => c.category === t1.category);
      expect(catStats).toBeDefined();
      expect(catStats?.completedTrainings).toBe(2);
    });
  });

  describe('Sistema de Publicação e Rascunho de Cursos (Em Desenvolvimento)', () => {
    it('deve ocultar cursos em desenvolvimento (isPublished: false) na listagem de alunos', () => {
      repo.seedDefaultTrainingsIfNeeded();
      const defaultPublished = repo.getAllTrainings();

      // Cria curso em rascunho
      const draftTraining = repo.createTraining({
        id: 'curso-em-desenvolvimento-teologia',
        title: 'Teologia Sistemática Reformada',
        description: 'Gravando aulas e preparando material apostilado.',
        category: 'Teologia',
        targetAudience: 'Obreiros',
        coverImageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800',
        isPublished: false,
        isRequired: false,
        isFeatured: false,
      });

      expect(draftTraining.isPublished).toBe(false);

      // Alunos normais não devem ver o curso em rascunho
      const studentTrainings = repo.getAllTrainings('aluno-123', undefined, undefined, false);
      expect(studentTrainings.find((t) => t.id === 'curso-em-desenvolvimento-teologia')).toBeUndefined();
      expect(studentTrainings.length).toBe(defaultPublished.length);

      // Administrador com includeDrafts=true deve visualizar o curso em rascunho
      const adminTrainings = repo.getAllTrainings('admin-cardoso', undefined, undefined, true);
      const foundInAdmin = adminTrainings.find((t) => t.id === 'curso-em-desenvolvimento-teologia');
      expect(foundInAdmin).toBeDefined();
      expect(foundInAdmin?.isPublished).toBe(false);
    });

    it('não deve permitir que aluno acesse diretamente curso em rascunho por ID, mas deve permitir ao administrador', () => {
      repo.createTraining({
        id: 'curso-privado-rascunho',
        title: 'Curso Secreto em Elaboração',
        description: 'Em fase de pré-produção',
        category: 'Liderança',
        targetAudience: 'Pastores',
        coverImageUrl: 'https://example.com/cover.jpg',
        isPublished: false,
      });

      // Aluno normal tenta acessar por ID: deve retornar null
      const studentAccess = repo.getTrainingById('curso-privado-rascunho', 'user-aluno-1', false);
      expect(studentAccess).toBeNull();

      // Administrador acessa por ID: deve retornar os detalhes e permitir gerenciar
      const adminAccess = repo.getTrainingById('curso-privado-rascunho', 'usr_admin_cardoso', true);
      expect(adminAccess).toBeDefined();
      expect(adminAccess?.title).toBe('Curso Secreto em Elaboração');
      expect(adminAccess?.isPublished).toBe(false);
    });

    it('administrador pode adicionar aulas a um curso em rascunho antes de publicá-lo', () => {
      repo.createTraining({
        id: 'curso-com-aulas-preparadas',
        title: 'Gestão Financeira Bíblica',
        description: 'Curso gravado em estúdio',
        category: 'Institucionais',
        targetAudience: 'Tesouraria',
        coverImageUrl: 'https://example.com/cover.jpg',
        isPublished: false,
      });

      repo.addLesson('curso-com-aulas-preparadas', {
        title: 'Aula 1: Mordomia e Transparência',
        videoType: 'youtube',
        videoUrl: 'https://www.youtube.com/watch?v=finance1',
        durationMinutes: 25,
      });

      const trainingInAdmin = repo.getTrainingById('curso-com-aulas-preparadas', undefined, true);
      expect(trainingInAdmin?.lessons?.length).toBe(1);
      expect(trainingInAdmin?.lessons?.[0].title).toBe('Aula 1: Mordomia e Transparência');

      // Aluno ainda não enxerga o curso
      expect(repo.getTrainingById('curso-com-aulas-preparadas', 'aluno-1', false)).toBeNull();
    });

    it('deve permitir publicar e despublicar com 1 clique alterando o status', () => {
      repo.createTraining({
        id: 'curso-toggle-publish',
        title: 'Curso para Testar Publicação',
        description: 'Teste',
        category: 'Liderança',
        targetAudience: 'Líderes',
        coverImageUrl: 'https://example.com/cover.jpg',
        isPublished: false,
      });

      // Publica o curso
      const pubResult = repo.setTrainingPublication('curso-toggle-publish', true);
      expect(pubResult?.isPublished).toBe(true);

      // Agora o aluno comum consegue visualizar e acessar
      const studentAccess = repo.getTrainingById('curso-toggle-publish', 'aluno-qualquer', false);
      expect(studentAccess).toBeDefined();
      expect(studentAccess?.isPublished).toBe(true);

      // Despublica (volta a ser rascunho)
      const unpubResult = repo.setTrainingPublication('curso-toggle-publish', false);
      expect(unpubResult?.isPublished).toBe(false);

      // Aluno não tem mais acesso
      expect(repo.getTrainingById('curso-toggle-publish', 'aluno-qualquer', false)).toBeNull();
    });

    it('deve contabilizar cursos publicados vs rascunhos no resumo de relatórios', () => {
      repo.createTraining({
        id: 'curso-pub-1',
        title: 'Curso Publicado 1',
        description: 'Desc',
        category: 'Liderança',
        targetAudience: 'Todos',
        coverImageUrl: 'https://example.com/cover.jpg',
        isPublished: true,
      });

      repo.createTraining({
        id: 'curso-rasc-1',
        title: 'Curso Rascunho 1',
        description: 'Desc',
        category: 'Liderança',
        targetAudience: 'Todos',
        coverImageUrl: 'https://example.com/cover.jpg',
        isPublished: false,
      });

      const report = repo.getAdminReportSummary();
      expect(report.totalTrainings).toBe(2);
      expect(report.totalPublished).toBe(1);
      expect(report.totalDrafts).toBe(1);
    });
  });

  describe('Gerenciamento de Alunos Inscritos e em Andamento (Admin)', () => {
    it('deve listar alunos que iniciaram cursos, detalhando progresso e status de conclusão', () => {
      repo.seedDefaultTrainingsIfNeeded();
      const allTrainings = repo.getAllTrainings();
      const t1 = allTrainings[0];

      // Inscreve e avança 1 aula
      repo.enrollStudent('user_aluno_maria', t1.id);
      repo.toggleLessonProgress('user_aluno_maria', t1.id, t1.lessons![0].id, 'Maria Silva');

      const enrollments = repo.getAdminStudentEnrollments(t1.id);
      expect(enrollments.length).toBeGreaterThanOrEqual(1);

      const maria = enrollments.find((e) => e.userId === 'user_aluno_maria');
      expect(maria).toBeDefined();
      expect(maria?.trainingTitle).toBe(t1.title);
      expect(maria?.completedLessonsCount).toBe(1);
      expect(maria?.isCompleted).toBe(false);
      expect(maria?.progressPercent).toBeGreaterThan(0);
    });

    it('deve permitir que o administrador conclua manualmente o curso de um aluno e emita certificado', () => {
      repo.seedDefaultTrainingsIfNeeded();
      const allTrainings = repo.getAllTrainings();
      const t1 = allTrainings[0];

      const res = repo.completeStudentTrainingManually('user_aluno_joao', t1.id, 'Pastor Administrador');
      expect(res.success).toBe(true);
      expect(res.certificate).toBeDefined();
      expect(res.certificate?.validationCode).toContain('LUMI-');

      const enrollments = repo.getAdminStudentEnrollments(t1.id);
      const joao = enrollments.find((e) => e.userId === 'user_aluno_joao');
      expect(joao?.isCompleted).toBe(true);
      expect(joao?.progressPercent).toBe(100);
      expect(joao?.certificateCode).toBe(res.certificate?.validationCode);
    });

    it('deve permitir resetar o progresso do aluno para reinício de curso', () => {
      repo.seedDefaultTrainingsIfNeeded();
      const allTrainings = repo.getAllTrainings();
      const t1 = allTrainings[0];

      repo.completeStudentTrainingManually('user_aluno_reset', t1.id);
      expect(repo.getAdminStudentEnrollments(t1.id).some((e) => e.userId === 'user_aluno_reset')).toBe(true);

      const resetOk = repo.resetStudentProgress('user_aluno_reset', t1.id);
      expect(resetOk).toBe(true);

      const enrollmentsAfter = repo.getAdminStudentEnrollments(t1.id);
      expect(enrollmentsAfter.some((e) => e.userId === 'user_aluno_reset')).toBe(false);
    });

    it('deve listar aulas de um treinamento via rota GET /:id/lessons', async () => {
      repo.seedDefaultTrainingsIfNeeded();
      const app = express();
      app.use(express.json());
      app.use('/api/trainings', createTrainingRouter(repo, {
        requireAuth: (_req, _res, next) => next(),
        requireAdmin: (_req, _res, next) => next(),
      }));

      const server = app.listen(0);
      const address = server.address() as any;
      const port = address.port;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/trainings/trn-onboarding-renovada/lessons`);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.lessons.length).toBeGreaterThan(0);
        expect(data.lessons[0].title).toContain('Nossa História');
      } finally {
        server.close();
      }
    });

    it('deve retornar resumo executivo na rota GET /api/trainings/admin/report', async () => {
      repo.seedDefaultTrainingsIfNeeded();
      const app = express();
      app.use(express.json());
      app.use('/api/trainings', createTrainingRouter(repo, {
        requireAuth: (_req, _res, next) => next(),
        requireAdmin: (_req, _res, next) => next(),
      }));

      const server = app.listen(0);
      const address = server.address() as any;
      const port = address.port;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/trainings/admin/report`);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(data.report).toBeDefined();
        expect(data.report.totalTrainings).toBeGreaterThan(0);
      } finally {
        server.close();
      }
    });
  });

  describe('Cadastro & Gestão de Categorias de Ministério (Admin)', () => {
    it('deve semear e listar as categorias padrão da igreja', () => {
      const categories = repo.getCategories();
      expect(categories.length).toBeGreaterThanOrEqual(9);
      expect(categories.some((c) => c.name === 'Liderança')).toBe(true);
      expect(categories.some((c) => c.name === 'Diaconia')).toBe(true);
      expect(categories.some((c) => c.name === 'Células')).toBe(true);
    });

    it('deve cadastrar nova categoria de ministério e validar duplicidades', () => {
      const cat = repo.createCategory({
        name: 'Missões Urbanas',
        description: 'Evangelismo de rua, casas de recuperação e impacto local.',
      });

      expect(cat.id).toBeDefined();
      expect(cat.name).toBe('Missões Urbanas');
      expect(cat.description).toContain('Evangelismo de rua');

      // Tentar cadastrar duplicada deve lançar erro
      expect(() => {
        repo.createCategory({ name: 'Missões Urbanas' });
      }).toThrow(/já existe/i);

      // Nome vazio deve lançar erro
      expect(() => {
        repo.createCategory({ name: '   ' });
      }).toThrow(/obrigatório/i);
    });

    it('deve atualizar categoria e refletir o novo nome nos cursos associados', () => {
      repo.seedDefaultTrainingsIfNeeded();
      const categories = repo.getCategories();
      const lideranca = categories.find((c) => c.name === 'Liderança')!;

      const updated = repo.updateCategory(lideranca.id, {
        name: 'Liderança & Governança',
        description: 'Capacitação executiva e pastoral.',
      });

      expect(updated?.name).toBe('Liderança & Governança');

      // Verifica se os treinamentos que usavam 'Liderança' foram migrados
      const allTrainings = repo.getAllTrainings();
      expect(allTrainings.some((t) => t.category === 'Liderança & Governança')).toBe(true);
    });

    it('deve impedir exclusão de categoria com cursos vinculados e permitir exclusão de categoria vazia', () => {
      repo.seedDefaultTrainingsIfNeeded();
      const categories = repo.getCategories();
      const diaconia = categories.find((c) => c.name === 'Diaconia')!;

      // Diaconia tem curso vinculado no seed, não pode excluir
      const deleteFail = repo.deleteCategory(diaconia.id);
      expect(deleteFail.success).toBe(false);
      expect(deleteFail.error).toContain('vinculado');

      // Criar categoria sem curso e excluir com sucesso
      const newCat = repo.createCategory({ name: 'Casais & Noivos' });
      const deleteOk = repo.deleteCategory(newCat.id);
      expect(deleteOk.success).toBe(true);
    });

    it('deve permitir gerenciar categorias via rotas HTTP REST da API', async () => {
      const app = express();
      app.use(express.json());
      app.use('/api/trainings', createTrainingRouter(repo, {
        requireAuth: (_req, _res, next) => next(),
        requireAdmin: (_req, _res, next) => next(),
      }));

      const server = app.listen(0);
      const address = server.address() as any;
      const port = address.port;

      try {
        // 1. GET /categories
        const listRes = await fetch(`http://127.0.0.1:${port}/api/trainings/categories`);
        expect(listRes.status).toBe(200);
        const listData = await listRes.json();
        expect(listData.categories.length).toBeGreaterThan(0);

        // 2. POST /categories
        const createRes = await fetch(`http://127.0.0.1:${port}/api/trainings/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Ação Social Renovada', description: 'Atendimento à comunidade' }),
        });
        expect(createRes.status).toBe(201);
        const created = await createRes.json();
        expect(created.category.name).toBe('Ação Social Renovada');

        // 3. PUT /categories/:id
        const updateRes = await fetch(`http://127.0.0.1:${port}/api/trainings/categories/${created.category.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Ação Social & Comunidade' }),
        });
        expect(updateRes.status).toBe(200);
        const updated = await updateRes.json();
        expect(updated.category.name).toBe('Ação Social & Comunidade');

        // 4. DELETE /categories/:id
        const deleteRes = await fetch(`http://127.0.0.1:${port}/api/trainings/categories/${created.category.id}`, {
          method: 'DELETE',
        });
        expect(deleteRes.status).toBe(200);
      } finally {
        server.close();
      }
    });
  });

  describe('Auditoria e Validação de Visualização Obrigatória de Aulas', () => {
    it('deve persistir e recuperar os metadados de auditoria ao concluir aula (YouTube API & Presença Ativa)', () => {
      repo.seedDefaultTrainingsIfNeeded();
      const trainings = repo.getAllTrainings();
      const targetTraining = trainings[0];
      const lessons = repo.getLessons(targetTraining.id);
      expect(lessons.length).toBeGreaterThan(0);
      const targetLesson = lessons[0];

      const userId = 'aluno-auditoria-123';

      // 1. Concluir aula com auditoria do YouTube (anti-scrubbing)
      const res = repo.toggleLessonProgress(
        userId,
        targetTraining.id,
        targetLesson.id,
        'Aluno Auditoria',
        {
          secondsWatched: 320,
          durationSeconds: 360,
          watchPercent: 88,
          verifiedVia: 'youtube_api',
        }
      );
      expect(res.isCompleted).toBe(true);

      // 2. Verificar se getLessons retorna o auditInfo
      const lessonsAfter = repo.getLessons(targetTraining.id, userId);
      const auditedLesson = lessonsAfter.find((l) => l.id === targetLesson.id);
      expect(auditedLesson).toBeDefined();
      expect(auditedLesson?.isCompleted).toBe(true);
      expect(auditedLesson?.auditInfo).toBeDefined();
      expect(auditedLesson?.auditInfo?.verifiedVia).toBe('youtube_api');
      expect(auditedLesson?.auditInfo?.watchPercent).toBe(88);
      expect(auditedLesson?.auditInfo?.secondsWatched).toBe(320);
      expect(auditedLesson?.auditInfo?.completedAt).toBeDefined();

      // 3. Ao alternar para falso, remove auditoria
      const resToggleOff = repo.toggleLessonProgress(userId, targetTraining.id, targetLesson.id, 'Aluno Auditoria');
      expect(resToggleOff.isCompleted).toBe(false);

      const lessonsAfterToggleOff = repo.getLessons(targetTraining.id, userId);
      const uncompletedLesson = lessonsAfterToggleOff.find((l) => l.id === targetLesson.id);
      expect(uncompletedLesson?.isCompleted).toBe(false);
      expect(uncompletedLesson?.auditInfo).toBeUndefined();
    });

    it('deve aceitar payload de auditoria via API HTTP e validar persistência', async () => {
      repo.seedDefaultTrainingsIfNeeded();
      const trainings = repo.getAllTrainings();
      const targetTraining = trainings[0];
      const lessons = repo.getLessons(targetTraining.id);
      const targetLesson = lessons[0];

      const app = express();
      app.use(express.json());
      app.use('/api/trainings', createTrainingRouter(repo, {
        requireAuth: (req: any, res: any, next: any) => {
          req.user = req.user || { id: 'user-http-audit', name: 'Aluno Teste' };
          next();
        },
        requireAdmin: (req: any, res: any, next: any) => next(),
      }));

      const server = await new Promise<any>((resolve) => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
      });
      const port = server.address().port;

      try {
        const response = await fetch(
          `http://127.0.0.1:${port}/api/trainings/${targetTraining.id}/lessons/${targetLesson.id}/toggle`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: 'user-http-audit',
              audit: {
                secondsWatched: 400,
                durationSeconds: 400,
                watchPercent: 100,
                verifiedVia: 'active_dwell_timer',
              },
            }),
          }
        );

        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.isCompleted).toBe(true);

        // Buscar aulas pelo endpoint GET e conferir auditInfo
        const getLessonsRes = await fetch(
          `http://127.0.0.1:${port}/api/trainings/${targetTraining.id}/lessons?userId=user-http-audit`
        );
        expect(getLessonsRes.status).toBe(200);
        const getLessonsData = await getLessonsRes.json();
        const found = getLessonsData.lessons.find((l: any) => l.id === targetLesson.id);
        expect(found.isCompleted).toBe(true);
        expect(found.auditInfo.verifiedVia).toBe('active_dwell_timer');
        expect(found.auditInfo.watchPercent).toBe(100);
      } finally {
        server.close();
      }
    });
  });

  describe('Controle e Gestão de Certificados pelo Painel Admin', () => {
    it('deve emitir certificado manualmente e registrar conclusão para o aluno', () => {
      repo.seedDefaultTrainingsIfNeeded();
      const trainings = repo.getAllTrainings();
      const targetTraining = trainings[0];

      const userId = 'aluno_cert_teste_1';
      const userName = 'Pr. André Silva';

      // 1. Emitir certificado manualmente
      const result = repo.issueCertificateManually({
        userId,
        trainingId: targetTraining.id,
        userName,
        workloadHours: 12,
      });

      expect(result.success).toBe(true);
      expect(result.certificate).toBeDefined();
      expect(result.certificate?.userName).toBe('Pr. André Silva');
      expect(result.certificate?.trainingId).toBe(targetTraining.id);
      expect(result.certificate?.workloadHours).toBe(12);
      expect(result.certificate?.validationCode).toMatch(/^LUMI-\d{4}-[A-Z0-9]{8}$/);

      // 2. Verificar se o certificado é listado em getAllCertificates
      const allCerts = repo.getAllCertificates();
      expect(allCerts.some((c) => c.id === result.certificate?.id)).toBe(true);

      // 3. Verificar filtro por search e trainingId
      const searchCerts = repo.getAllCertificates('André');
      expect(searchCerts.length).toBe(1);
      expect(searchCerts[0].userName).toBe('Pr. André Silva');

      // 4. Impedir emissão duplicada para o mesmo curso
      const duplicateRes = repo.issueCertificateManually({
        userId,
        trainingId: targetTraining.id,
      });
      expect(duplicateRes.success).toBe(false);
      expect(duplicateRes.error).toContain('já possui');
    });

    it('deve revogar certificado emitido equivocadamente e reverter o status do aluno', () => {
      repo.seedDefaultTrainingsIfNeeded();
      const trainings = repo.getAllTrainings();
      const targetTraining = trainings[0];
      const userId = 'aluno_equivocado_2';

      // 1. Emitir certificado
      const issueRes = repo.issueCertificateManually({
        userId,
        trainingId: targetTraining.id,
        userName: 'Membro com Certificado Equivocado',
      });
      expect(issueRes.success).toBe(true);
      const certId = issueRes.certificate!.id;

      // 2. Revogar o certificado com resetProgress = true
      const revokeRes = repo.deleteCertificate(certId, true);
      expect(revokeRes.success).toBe(true);

      // 3. Confirmar que o certificado não existe mais
      const certAfter = repo.getCertificateById(certId);
      expect(certAfter).toBeNull();

      // 4. Confirmar que o curso não consta mais como 100% completo
      const enrollments = repo.getAdminStudentEnrollments(targetTraining.id);
      const student = enrollments.find((e) => e.userId === userId);
      expect(student?.isCompleted).toBe(false);
      expect(student?.certificateId).toBeFalsy();
    });

    it('deve permitir gerenciar certificados via API HTTP (Listar, Emitir e Revogar)', async () => {
      repo.seedDefaultTrainingsIfNeeded();
      const trainings = repo.getAllTrainings();
      const targetTraining = trainings[0];

      const app = express();
      app.use(express.json());
      app.use(
        '/api/trainings',
        createTrainingRouter(repo, {
          requireAuth: (req: any, _res: any, next: any) => {
            req.user = req.user || { id: 'admin_test_id', role: 'admin', name: 'Administrador' };
            next();
          },
          requireAdmin: (req: any, _res: any, next: any) => {
            req.user = req.user || { id: 'admin_test_id', role: 'admin', name: 'Administrador' };
            next();
          },
        })
      );

      const server = await new Promise<any>((resolve) => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
      });
      const port = server.address().port;

      try {
        // 1. POST /api/trainings/admin/certificates (Emitir)
        const issueResponse = await fetch(`http://127.0.0.1:${port}/api/trainings/admin/certificates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'aluno_via_api',
            trainingId: targetTraining.id,
            userName: 'Aluno API Teste',
            workloadHours: 8,
          }),
        });

        expect(issueResponse.status).toBe(201);
        const issueData = await issueResponse.json();
        expect(issueData.success).toBe(true);
        expect(issueData.certificate.userName).toBe('Aluno API Teste');
        const createdCertId = issueData.certificate.id;

        // 2. GET /api/trainings/admin/certificates (Listar)
        const listResponse = await fetch(
          `http://127.0.0.1:${port}/api/trainings/admin/certificates?search=Aluno+API`
        );
        expect(listResponse.status).toBe(200);
        const listData = await listResponse.json();
        expect(listData.certificates.length).toBeGreaterThan(0);
        expect(listData.certificates[0].id).toBe(createdCertId);

        // 3. GET /api/trainings/admin/users (Buscar usuários registrados)
        const usersResponse = await fetch(`http://127.0.0.1:${port}/api/trainings/admin/users`);
        expect(usersResponse.status).toBe(200);
        const usersData = await usersResponse.json();
        expect(Array.isArray(usersData.users)).toBe(true);

        // 4. DELETE /api/trainings/admin/certificates/:id (Revogar)
        const deleteResponse = await fetch(
          `http://127.0.0.1:${port}/api/trainings/admin/certificates/${createdCertId}?resetProgress=true`,
          { method: 'DELETE' }
        );
        expect(deleteResponse.status).toBe(200);
        const deleteData = await deleteResponse.json();
        expect(deleteData.success).toBe(true);

        // Confirmar que foi removido
        const listAfterDelete = await fetch(
          `http://127.0.0.1:${port}/api/trainings/admin/certificates?search=Aluno+API`
        );
        const listAfterData = await listAfterDelete.json();
        expect(listAfterData.certificates.length).toBe(0);
      } finally {
        server.close();
      }
    });
  });

  describe('Hierarquia de Dependência entre Categorias (Pré-requisitos)', () => {
    it('deve permitir configurar dependência hierárquica entre categorias', () => {
      // 1. Cadastra categoria base (ex: Liderança)
      const catLideranca = repo.createCategory({ name: 'Liderança Pastoral', description: 'Treinamentos para líderes' });
      expect(catLideranca.id).toBeDefined();

      // 2. Cadastra categoria dependente (ex: Diaconia) que requer Liderança
      const catDiaconia = repo.createCategory({
        name: 'Diaconia e Serviço',
        description: 'Serviço da igreja',
        prerequisiteCategoryId: catLideranca.id,
      });
      expect(catDiaconia.prerequisiteCategoryId).toBe(catLideranca.id);

      // 3. Ao listar categorias, deve retornar os nomes dos pré-requisitos via JOIN
      const allCategories = repo.getCategories();
      const diaconiaListed = allCategories.find((c) => c.id === catDiaconia.id);
      expect(diaconiaListed).toBeDefined();
      expect(diaconiaListed?.prerequisiteCategoryId).toBe(catLideranca.id);
      expect(diaconiaListed?.prerequisiteCategoryName).toBe('Liderança Pastoral');
    });

    it('deve impedir autorreferência e ciclos de dependência entre categorias', () => {
      const catA = repo.createCategory({ name: 'Nível 1 - Básico' });
      const catB = repo.createCategory({ name: 'Nível 2 - Intermediário', prerequisiteCategoryId: catA.id });
      const catC = repo.createCategory({ name: 'Nível 3 - Avançado', prerequisiteCategoryId: catB.id });

      // Não pode apontar para si mesma
      expect(() => {
        repo.updateCategory(catA.id, { name: 'Nível 1 - Básico', prerequisiteCategoryId: catA.id });
      }).toThrow(/não pode ter ela mesma como pré-requisito/i);

      // Não pode fechar ciclo (C requer B, B requer A -> A não pode requerer C)
      expect(() => {
        repo.updateCategory(catA.id, { name: 'Nível 1 - Básico', prerequisiteCategoryId: catC.id });
      }).toThrow(/dependência circular/i);
    });

    it('deve impedir exclusão de uma categoria se outra depender dela', () => {
      const parent = repo.createCategory({ name: 'Categoria Pai' });
      repo.createCategory({ name: 'Categoria Filha', prerequisiteCategoryId: parent.id });

      const res = repo.deleteCategory(parent.id);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/outra\(s\) categoria\(s\) dependem dela/i);
    });

    it('deve bloquear curso quando os treinamentos da categoria pré-requisito não forem concluídos pelo aluno', () => {
      const studentId = 'aluno_teste_prereq_1';

      // Categoria A: Fundamentos
      const catA = repo.createCategory({ name: 'Fundamentos' });
      // Categoria B: Ministério Prático (requer Fundamentos)
      const catB = repo.createCategory({ name: 'Ministério Prático', prerequisiteCategoryId: catA.id });

      // Curso 1 na Categoria A
      const courseA = repo.createTraining({
        title: 'Curso Fundamentos Essenciais',
        description: 'Curso introdutório',
        category: catA.name,
        targetAudience: 'Novos membros',
        workloadHours: 4,
        isPublished: true,
      });
      const lessonA = repo.addLesson(courseA.id, {
        title: 'Aula Única A',
        videoUrl: 'https://youtube.com/watch?v=sampleA',
        videoType: 'youtube',
        durationMinutes: 10,
        orderIndex: 1,
      });

      // Curso 2 na Categoria B
      const courseB = repo.createTraining({
        title: 'Curso Ministério na Prática',
        description: 'Curso avançado',
        category: catB.name,
        targetAudience: 'Obreiros',
        workloadHours: 6,
        isPublished: true,
      });
      repo.addLesson(courseB.id, {
        title: 'Aula Única B',
        videoUrl: 'https://youtube.com/watch?v=sampleB',
        videoType: 'youtube',
        durationMinutes: 15,
        orderIndex: 1,
      });

      // 1. Aluno ainda não concluiu o Curso A: Curso B deve estar BLOQUEADO
      const trainingsBefore = repo.getAllTrainings(studentId);
      const trainingBBefore = trainingsBefore.find((t) => t.id === courseB.id);
      expect(trainingBBefore?.isLockedByPrerequisite).toBe(true);
      expect(trainingBBefore?.prerequisiteCategoryName).toBe(catA.name);

      const singleBBefore = repo.getTrainingById(courseB.id, studentId);
      expect(singleBBefore?.isLockedByPrerequisite).toBe(true);
      expect(singleBBefore?.prerequisiteCategoryName).toBe(catA.name);

      // 2. Aluno conclui a aula do Curso A
      repo.toggleLessonProgress(studentId, courseA.id, lessonA.id, 'Aluno Teste');

      // 3. Agora com Curso A concluído, Curso B deve estar DESBLOQUEADO
      const trainingsAfter = repo.getAllTrainings(studentId);
      const trainingBAfter = trainingsAfter.find((t) => t.id === courseB.id);
      expect(trainingBAfter?.isLockedByPrerequisite).toBe(false);

      const singleBAfter = repo.getTrainingById(courseB.id, studentId);
      expect(singleBAfter?.isLockedByPrerequisite).toBe(false);
    });
  });

  describe('Cursos Obrigatórios e Gestão de Pendências', () => {
    it('deve identificar corretamente cursos pendentes (obrigatórios não concluídos ou em andamento)', () => {
      // Simulação da regra de filtragem de pendências do LMS:
      // (t.isRequired && !t.isCompleted) || ((t.progressPercent || 0) > 0 && !t.isCompleted)

      const mockTrainings: Partial<Training>[] = [
        {
          id: 't1',
          title: 'Curso Obrigatório Novo (Nunca Iniciado)',
          isRequired: true,
          isCompleted: false,
          progressPercent: 0,
        },
        {
          id: 't2',
          title: 'Curso Opcional Em Andamento',
          isRequired: false,
          isCompleted: false,
          progressPercent: 40,
        },
        {
          id: 't3',
          title: 'Curso Obrigatório Concluído',
          isRequired: true,
          isCompleted: true,
          progressPercent: 100,
        },
        {
          id: 't4',
          title: 'Curso Opcional Nunca Iniciado',
          isRequired: false,
          isCompleted: false,
          progressPercent: 0,
        },
      ];

      const pendingTrainings = mockTrainings.filter(
        (t) => (t.isRequired && !t.isCompleted) || ((t.progressPercent || 0) > 0 && !t.isCompleted)
      );

      // Deve incluir t1 (obrigatório não feito) e t2 (em andamento)
      expect(pendingTrainings.map((t) => t.id)).toEqual(['t1', 't2']);

      // t3 (já concluído) e t4 (opcional não iniciado) NÃO devem estar em pendências
      expect(pendingTrainings.some((t) => t.id === 't3')).toBe(false);
      expect(pendingTrainings.some((t) => t.id === 't4')).toBe(false);

      // Quando o aluno conclui t1:
      const updatedT1 = { ...mockTrainings[0], isCompleted: true, progressPercent: 100 };
      const newTrainings = [updatedT1, mockTrainings[1], mockTrainings[2], mockTrainings[3]];

      const newPending = newTrainings.filter(
        (t) => (t.isRequired && !t.isCompleted) || ((t.progressPercent || 0) > 0 && !t.isCompleted)
      );

      // t1 sai de pendências assim que concluído
      expect(newPending.map((t) => t.id)).toEqual(['t2']);
    });
  });

  describe('Hierarquia de Dependência entre Cursos (Pré-requisitos dentro da Categoria)', () => {
    it('deve permitir configurar dependência hierárquica entre cursos de uma mesma categoria', () => {
      // 1. Curso 1: Liderança Nível 1
      const course1 = repo.createTraining({
        title: 'Liderança de Células: Nível 1 (Fundamentos)',
        description: 'Fundamentos básicos da liderança',
        category: 'Liderança',
        targetAudience: 'Novos Líderes',
        workloadHours: 4,
        isPublished: true,
      });

      // 2. Curso 2: Liderança Nível 2 (requer Nível 1)
      const course2 = repo.createTraining({
        title: 'Liderança de Células: Nível 2 (Multiplicação)',
        description: 'Estratégias avançadas de multiplicação de células',
        category: 'Liderança',
        targetAudience: 'Líderes Ativos',
        workloadHours: 6,
        isPublished: true,
        prerequisiteTrainingId: course1.id,
      });

      expect(course2.prerequisiteTrainingId).toBe(course1.id);
      expect(course2.prerequisiteTrainingTitle).toBe('Liderança de Células: Nível 1 (Fundamentos)');

      // Ao buscar todos os treinamentos, o título do pré-requisito deve ser mapeado
      const all = repo.getAllTrainings();
      const listedCourse2 = all.find((t) => t.id === course2.id);
      expect(listedCourse2?.prerequisiteTrainingId).toBe(course1.id);
      expect(listedCourse2?.prerequisiteTrainingTitle).toBe(course1.title);
    });

    it('deve impedir autorreferência e ciclo circular entre cursos', () => {
      const cA = repo.createTraining({ title: 'Curso A', category: 'Diaconia' });
      const cB = repo.createTraining({ title: 'Curso B', category: 'Diaconia', prerequisiteTrainingId: cA.id });
      const cC = repo.createTraining({ title: 'Curso C', category: 'Diaconia', prerequisiteTrainingId: cB.id });

      // Autorreferência
      expect(() => {
        repo.updateTraining(cA.id, { prerequisiteTrainingId: cA.id });
      }).toThrow(/não pode ter a si mesmo como pré-requisito/i);

      // Ciclo direto ou indireto (C requer B, B requer A -> A não pode requerer C)
      expect(() => {
        repo.updateTraining(cA.id, { prerequisiteTrainingId: cC.id });
      }).toThrow(/dependência circular/i);
    });

    it('deve bloquear curso quando o aluno não tiver concluído o curso pré-requisito da mesma categoria', () => {
      const studentId = 'aluno_curso_prereq_test';

      const basicCourse = repo.createTraining({
        title: 'Diaconia 101: O Serviço Cristão',
        category: 'Diaconia',
        workloadHours: 3,
        isPublished: true,
      });
      const lesson = repo.addLesson(basicCourse.id, {
        title: 'Aula de Recepção e Hospitalidade',
        videoUrl: 'https://youtube.com/watch?v=sampleDiaconia',
        videoType: 'youtube',
        durationMinutes: 20,
        orderIndex: 1,
      });

      const advancedCourse = repo.createTraining({
        title: 'Diaconia 201: Coordenação e Culto',
        category: 'Diaconia',
        workloadHours: 5,
        isPublished: true,
        prerequisiteTrainingId: basicCourse.id,
      });
      repo.addLesson(advancedCourse.id, {
        title: 'Aula Prática de Coordenação',
        videoUrl: 'https://youtube.com/watch?v=sampleCoord',
        videoType: 'youtube',
        durationMinutes: 30,
        orderIndex: 1,
      });

      // 1. Antes de o aluno concluir o curso básico:
      // O curso avançado DEVE estar bloqueado com o nome do curso pré-requisito
      const trainingsBefore = repo.getAllTrainings(studentId);
      const advBefore = trainingsBefore.find((t) => t.id === advancedCourse.id);
      expect(advBefore?.isLockedByPrerequisite).toBe(true);
      expect(advBefore?.prerequisiteTrainingId).toBe(basicCourse.id);
      expect(advBefore?.prerequisiteTrainingTitle).toBe(basicCourse.title);
      expect(advBefore?.prerequisiteReason).toBe('course');

      const singleBefore = repo.getTrainingById(advancedCourse.id, studentId);
      expect(singleBefore?.isLockedByPrerequisite).toBe(true);
      expect(singleBefore?.prerequisiteTrainingTitle).toBe(basicCourse.title);

      // 2. Aluno conclui a aula do curso básico
      repo.toggleLessonProgress(studentId, basicCourse.id, lesson.id, 'Aluno Diaconia');

      // 3. Após concluir o curso básico:
      // O curso avançado DEVE ser desbloqueado para o aluno
      const trainingsAfter = repo.getAllTrainings(studentId);
      const advAfter = trainingsAfter.find((t) => t.id === advancedCourse.id);
      expect(advAfter?.isLockedByPrerequisite).toBe(false);

      const singleAfter = repo.getTrainingById(advancedCourse.id, studentId);
      expect(singleAfter?.isLockedByPrerequisite).toBe(false);
    });

    it('deve desvincular o pré-requisito com segurança se o curso pai for excluído', () => {
      const parentCourse = repo.createTraining({
        title: 'Curso Pai para Teste Exclusão',
        category: 'Infantil',
      });
      const childCourse = repo.createTraining({
        title: 'Curso Filho Dependente',
        category: 'Infantil',
        prerequisiteTrainingId: parentCourse.id,
      });

      expect(childCourse.prerequisiteTrainingId).toBe(parentCourse.id);

      // Exclui o curso pai
      const deleted = repo.deleteTraining(parentCourse.id);
      expect(deleted).toBe(true);

      // O curso filho deve agora ter prerequisiteTrainingId null sem quebrar
      const childAfter = repo.getTrainingById(childCourse.id);
      expect(childAfter?.prerequisiteTrainingId).toBeNull();
      expect(childAfter?.prerequisiteTrainingTitle).toBeNull();
    });

    it('deve retornar métricas de aprendizado, cursos matriculados e certificados do aluno via GET /my-learning', () => {
      const studentId = 'user-student-learning-test';
      const trainingRouter = createTrainingRouter(repo, {
        requireAuth: (req: any, _res: any, next: any) => {
          req.user = { id: studentId, name: 'Aluno Estudioso', role: 'user' };
          next();
        },
        requireAdmin: (_req: any, _res: any, next: any) => next(),
      });

      // 1. Criar um treinamento com 2 aulas
      const course = repo.createTraining({
        title: 'Curso de Crescimento Espiritual',
        category: 'Discipulado',
        workloadHours: 3,
      });
      const l1 = repo.addLesson(course.id, { title: 'Aula 1', durationMinutes: 20 });
      const l2 = repo.addLesson(course.id, { title: 'Aula 2', durationMinutes: 25 });

      // 2. Aluno assiste apenas à Aula 1 (50% de progresso)
      repo.toggleLessonProgress(studentId, course.id, l1.id, 'Aluno Estudioso');

      // 3. Buscar camada da rota /my-learning
      const myLearningLayer = trainingRouter.stack.find(
        (layer: any) => layer.route?.path === '/my-learning' && layer.route?.methods?.get
      );
      expect(myLearningLayer).toBeDefined();

      let resCode = 200;
      let resData: any = null;
      const mockReq: any = { user: { id: studentId, name: 'Aluno Estudioso', role: 'user' } };
      const mockRes: any = {
        status: (c: number) => { resCode = c; return mockRes; },
        json: (d: any) => { resData = d; return d; },
      };

      const noop = () => {};
      myLearningLayer.route.stack[myLearningLayer.route.stack.length - 1].handle(mockReq, mockRes, noop);
      expect(resCode).toBe(200);
      expect(resData.success).toBe(true);

      // Métricas com 1 curso em andamento
      expect(resData.metrics.enrolledCount).toBe(1);
      expect(resData.metrics.completedCount).toBe(0);
      expect(resData.metrics.totalLessonsCompleted).toBe(1);
      expect(resData.metrics.averageProgress).toBe(50);
      expect(resData.enrolledTrainings.length).toBe(1);
      expect(resData.enrolledTrainings[0].id).toBe(course.id);
      expect(resData.certificates.length).toBe(0);

      // 4. Conclui a Aula 2 (100% de progresso -> Certificado emitido)
      repo.toggleLessonProgress(studentId, course.id, l2.id, 'Aluno Estudioso');

      myLearningLayer.route.stack[myLearningLayer.route.stack.length - 1].handle(mockReq, mockRes, noop);
      expect(resData.metrics.completedCount).toBe(1);
      expect(resData.metrics.totalLessonsCompleted).toBe(2);
      expect(resData.metrics.totalHoursCompleted).toBe(3);
      expect(resData.metrics.certificatesCount).toBe(1);
      expect(resData.certificates.length).toBe(1);
      expect(resData.certificates[0].trainingTitle).toBe('Curso de Crescimento Espiritual');
    });

    it('deve persistir, atualizar e listar links de referência e materiais externos em uma aula', () => {
      const course = repo.createTraining({
        title: 'Curso com Materiais de Apoio Externos',
        category: 'Teologia',
        workloadHours: 4,
      });

      const lesson = repo.addLesson(course.id, {
        title: 'Aula 1: Hermenêutica Bíblica',
        description: 'Princípios de interpretação das Escrituras.',
        videoType: 'youtube',
        videoUrl: 'https://www.youtube.com/watch?v=hermeneutica1',
        durationMinutes: 30,
        referenceLinks: [
          {
            title: 'Apostila em PDF no Google Drive',
            url: 'https://drive.google.com/drive/folders/abc123xyz',
            description: 'Pasta compartilhada com slides e exercícios',
          },
          {
            title: 'Artigo Teológico Complementar',
            url: 'iprviamao.com.br/artigos/hermeneutica',
            description: 'Referência bibliográfica cap. 2',
          },
        ],
      });

      expect(lesson.referenceLinks).toBeDefined();
      expect(lesson.referenceLinks?.length).toBe(2);
      expect(lesson.referenceLinks?.[0].title).toBe('Apostila em PDF no Google Drive');
      // Deve normalizar URL sem protocolo adicionando https://
      expect(lesson.referenceLinks?.[1].url).toBe('https://iprviamao.com.br/artigos/hermeneutica');

      // Buscar pelo repositório
      const fetchedLessons = repo.getLessons(course.id);
      expect(fetchedLessons.length).toBe(1);
      expect(fetchedLessons[0].referenceLinks?.length).toBe(2);
      expect(fetchedLessons[0].referenceLinks?.[0].description).toBe('Pasta compartilhada com slides e exercícios');

      // Atualizar links da aula
      const updated = repo.updateLesson(course.id, lesson.id, {
        referenceLinks: [
          {
            title: 'Novo Link de Outra Igreja Parceira',
            url: 'https://outraigreja.org.br/estudo',
          },
        ],
      });

      expect(updated?.referenceLinks?.length).toBe(1);
      expect(updated?.referenceLinks?.[0].title).toBe('Novo Link de Outra Igreja Parceira');

      const fetchedAfterUpdate = repo.getLessons(course.id);
      expect(fetchedAfterUpdate[0].referenceLinks?.length).toBe(1);
      expect(fetchedAfterUpdate[0].referenceLinks?.[0].url).toBe('https://outraigreja.org.br/estudo');
    });
  });
});
