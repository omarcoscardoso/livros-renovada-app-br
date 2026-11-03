import { Router, Request, Response } from 'express';
import { ITrainingRepository } from '../repositories/trainingRepository';

interface AuthMiddlewareMap {
  requireAuth: (req: Request, res: Response, next: () => void) => void;
  requireAdmin: (req: Request, res: Response, next: () => void) => void;
}

export function createTrainingRouter(
  repo: ITrainingRepository,
  auth: AuthMiddlewareMap
): Router {
  const router = Router();

  // 1. List all trainings (public or personalized if user logged in; drafts visible only to admin if requested)
  router.get('/', (req: any, res) => {
    try {
      const userId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const includeDrafts = isAdmin && (req.query.includeDrafts === 'true' || req.query.adminView === 'true');

      const trainings = repo.getAllTrainings(userId, category, search, includeDrafts);
      res.json({ success: true, trainings });
    } catch (err: any) {
      console.error('[Trainings] Erro ao listar:', err);
      res.status(500).json({ error: 'Falha ao buscar treinamentos.' });
    }
  });

  // 1b. Categories: List all categories
  router.get('/categories', (_req, res) => {
    try {
      const categories = repo.getCategories();
      res.json({ success: true, categories });
    } catch (err: any) {
      console.error('[Trainings] Erro ao listar categorias:', err);
      res.status(500).json({ error: 'Falha ao buscar categorias de ministério.' });
    }
  });

  // 1c. Admin: Create Category
  router.post('/categories', auth.requireAdmin, (req, res) => {
    try {
      const category = repo.createCategory(req.body);
      res.status(201).json({ success: true, category });
    } catch (err: any) {
      console.error('[Trainings Admin] Erro ao criar categoria:', err);
      res.status(400).json({ error: err.message || 'Falha ao criar categoria.' });
    }
  });

  // 1d. Admin: Update Category
  router.put('/categories/:id', auth.requireAdmin, (req, res) => {
    try {
      const updated = repo.updateCategory(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Categoria não encontrada.' });
      }
      res.json({ success: true, category: updated });
    } catch (err: any) {
      console.error('[Trainings Admin] Erro ao atualizar categoria:', err);
      res.status(400).json({ error: err.message || 'Falha ao atualizar categoria.' });
    }
  });

  // 1e. Admin: Delete Category
  router.delete('/categories/:id', auth.requireAdmin, (req, res) => {
    try {
      const result = repo.deleteCategory(req.params.id);
      if (!result.success) {
        return res.status(400).json({ error: result.error || 'Falha ao excluir categoria.' });
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error('[Trainings Admin] Erro ao excluir categoria:', err);
      res.status(500).json({ error: 'Falha ao excluir categoria.' });
    }
  });

  // 1f. Student: Get enrolled trainings, learning metrics and certificates for logged in user
  router.get('/my-learning', auth.requireAuth, (req: any, res) => {
    try {
      const userId = req.user.id;
      const allTrainings = repo.getAllTrainings(userId, undefined, undefined, false);
      const enrolledTrainings = allTrainings.filter(
        (t) =>
          Boolean(t.isCompleted) ||
          (t.completedLessonsCount !== undefined && t.completedLessonsCount > 0) ||
          (t.progressPercent !== undefined && t.progressPercent > 0)
      );
      const certificates = repo.getUserCertificates(userId);

      const completedTrainings = allTrainings.filter((t) => Boolean(t.isCompleted));
      const totalLessonsCompleted = enrolledTrainings.reduce(
        (acc, t) => acc + (t.completedLessonsCount || 0),
        0
      );
      const totalHoursCompleted = completedTrainings.reduce(
        (acc, t) => acc + (t.workloadHours || 0),
        0
      );
      const averageProgress =
        enrolledTrainings.length > 0
          ? Math.round(
              enrolledTrainings.reduce((acc, t) => acc + (t.progressPercent || 0), 0) /
                enrolledTrainings.length
            )
          : 0;

      res.json({
        success: true,
        enrolledTrainings,
        allTrainings,
        certificates,
        metrics: {
          enrolledCount: enrolledTrainings.length,
          completedCount: completedTrainings.length,
          totalLessonsCompleted,
          totalHoursCompleted,
          certificatesCount: certificates.length,
          averageProgress,
        },
      });
    } catch (err: any) {
      console.error('[Trainings] Erro ao obter dados de aprendizado do aluno:', err);
      res.status(500).json({ error: 'Falha ao buscar dados de aprendizado.' });
    }
  });

  // 2. Get training details by ID (including lessons and progress - Requires authenticated student; drafts visible only to admin)
  router.get('/:id', auth.requireAuth, (req: any, res) => {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.role === 'admin';
      const training = repo.getTrainingById(req.params.id, userId, isAdmin);
      if (!training) {
        return res.status(404).json({ error: 'Treinamento não encontrado ou ainda em desenvolvimento.' });
      }
      res.json({ success: true, training });
    } catch (err: any) {
      console.error('[Trainings] Erro ao buscar detalhes:', err);
      res.status(500).json({ error: 'Falha ao buscar treinamento.' });
    }
  });

  // 2b. Get lessons for a training (Public or Admin view)
  router.get('/:id/lessons', (req: any, res) => {
    try {
      const userId = req.user?.id || (req.query?.userId as string);
      const isAdmin = req.user?.role === 'admin';
      const training = repo.getTrainingById(req.params.id, userId, isAdmin);
      if (!training) {
        return res.status(404).json({ error: 'Treinamento não encontrado ou ainda em desenvolvimento.' });
      }
      const lessons = repo.getLessons(req.params.id, userId);
      res.json({ success: true, lessons });
    } catch (err: any) {
      console.error('[Trainings] Erro ao buscar aulas:', err);
      res.status(500).json({ error: 'Falha ao buscar aulas.' });
    }
  });

  // 3. Toggle lesson progress (Complete / Incomplete with audit)
  router.post('/:id/lessons/:lessonId/toggle', auth.requireAuth, (req: any, res) => {
    try {
      // Previne IDOR: aluno só altera seu próprio progresso; apenas admin pode enviar userId de outro aluno
      const userId = (req.user?.role === 'admin' && req.body?.userId) ? req.body.userId : req.user?.id;
      const userName = (req.user?.role === 'admin' && req.body?.userName) ? req.body.userName : (req.user?.name || 'Aluno Renovada');
      if (!userId) {
        return res.status(401).json({ error: 'Usuário não identificado.' });
      }

      const { id: trainingId, lessonId } = req.params;
      const audit = req.body?.audit;

      const result = repo.toggleLessonProgress(userId, trainingId, lessonId, userName, audit);
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('[Trainings] Erro ao alternar progresso:', err);
      res.status(500).json({ error: 'Falha ao registrar progresso.' });
    }
  });

  // 4. Bookmark toggle
  router.post('/:id/bookmark', auth.requireAuth, (req: any, res) => {
    try {
      const userId = req.user.id;
      const isBookmarked = repo.toggleBookmark(userId, req.params.id);
      res.json({ success: true, isBookmarked });
    } catch (err: any) {
      console.error('[Trainings] Erro ao favoritar:', err);
      res.status(500).json({ error: 'Falha ao alternar favorito.' });
    }
  });

  // 5. Admin: Create Training
  router.post('/', auth.requireAdmin, (req, res) => {
    try {
      const training = repo.createTraining(req.body);
      res.status(201).json({ success: true, training });
    } catch (err: any) {
      console.error('[Trainings Admin] Erro ao criar:', err);
      res.status(400).json({ error: err.message || 'Falha ao criar treinamento.' });
    }
  });

  // 6. Admin: Update Training
  router.put('/:id', auth.requireAdmin, (req, res) => {
    try {
      const updated = repo.updateTraining(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Treinamento não encontrado.' });
      }
      res.json({ success: true, training: updated });
    } catch (err: any) {
      console.error('[Trainings Admin] Erro ao atualizar:', err);
      res.status(400).json({ error: err.message || 'Falha ao atualizar treinamento.' });
    }
  });

  // 7. Admin: Delete Training
  router.delete('/:id', auth.requireAdmin, (req, res) => {
    try {
      const success = repo.deleteTraining(req.params.id);
      if (!success) {
        return res.status(404).json({ error: 'Treinamento não encontrado.' });
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error('[Trainings Admin] Erro ao excluir:', err);
      res.status(500).json({ error: 'Falha ao excluir treinamento.' });
    }
  });

  // 7b. Admin: Toggle or Set Training Publication
  router.patch('/:id/publish', auth.requireAdmin, (req: any, res) => {
    try {
      const isPublished = typeof req.body?.isPublished === 'boolean' ? req.body.isPublished : undefined;
      const result = repo.setTrainingPublication(req.params.id, isPublished);
      if (!result) {
        return res.status(404).json({ error: 'Treinamento não encontrado.' });
      }
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('[Trainings Admin] Erro ao alterar status de publicação:', err);
      res.status(500).json({ error: 'Falha ao alterar status de publicação.' });
    }
  });

  // 8. Admin: Add Lesson / Video
  router.post('/:id/lessons', auth.requireAdmin, (req, res) => {
    try {
      const lesson = repo.addLesson(req.params.id, req.body);
      res.status(201).json({ success: true, lesson });
    } catch (err: any) {
      console.error('[Trainings Admin] Erro ao adicionar aula:', err);
      res.status(500).json({ error: 'Falha ao adicionar aula.' });
    }
  });

  // 9. Admin: Update Lesson / Video
  router.put('/:id/lessons/:lessonId', auth.requireAdmin, (req, res) => {
    try {
      const updated = repo.updateLesson(req.params.id, req.params.lessonId, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Aula não encontrada.' });
      }
      res.json({ success: true, lesson: updated });
    } catch (err: any) {
      console.error('[Trainings Admin] Erro ao atualizar aula:', err);
      res.status(500).json({ error: 'Falha ao atualizar aula.' });
    }
  });

  // 10. Admin: Delete Lesson / Video
  router.delete('/:id/lessons/:lessonId', auth.requireAdmin, (req, res) => {
    try {
      const success = repo.deleteLesson(req.params.id, req.params.lessonId);
      if (!success) {
        return res.status(404).json({ error: 'Aula não encontrada.' });
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error('[Trainings Admin] Erro ao excluir aula:', err);
      res.status(500).json({ error: 'Falha ao excluir aula.' });
    }
  });

  // 11. Admin: Gerenciar Alunos (Listar Alunos Inscritos/Em Andamento)
  router.get('/admin/students', auth.requireAdmin, (req: any, res) => {
    try {
      const trainingId = typeof req.query.trainingId === 'string' ? req.query.trainingId : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const students = repo.getAdminStudentEnrollments(trainingId, search);
      res.json({ success: true, students, enrollments: students });
    } catch (err: any) {
      console.error('[Trainings Admin] Erro ao listar alunos:', err);
      res.status(500).json({ error: 'Falha ao buscar alunos inscritos.' });
    }
  });

  // 12. Admin: Concluir / Aprovar Aluno Manualmente (Emite Certificado)
  router.post('/admin/students/:userId/trainings/:trainingId/complete', auth.requireAdmin, (req: any, res) => {
    try {
      const { userId, trainingId } = req.params;
      const result = repo.completeStudentTrainingManually(userId, trainingId, req.user?.name);
      if (!result.success) {
        return res.status(404).json({ error: 'Treinamento não encontrado.' });
      }
      res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('[Trainings Admin] Erro ao aprovar aluno:', err);
      res.status(500).json({ error: 'Falha ao registrar aprovação do aluno.' });
    }
  });

  // 13. Admin: Resetar Progresso do Aluno
  router.delete('/admin/students/:userId/trainings/:trainingId/progress', auth.requireAdmin, (req: any, res) => {
    try {
      const { userId, trainingId } = req.params;
      const success = repo.resetStudentProgress(userId, trainingId);
      res.json({ success });
    } catch (err: any) {
      console.error('[Trainings Admin] Erro ao resetar progresso:', err);
      res.status(500).json({ error: 'Falha ao resetar progresso do aluno.' });
    }
  });

  // 14. Admin: Inscrever Aluno em Treinamento
  router.post('/admin/students/enroll', auth.requireAdmin, (req: any, res) => {
    try {
      const { userId, trainingId } = req.body;
      if (!userId || !trainingId) {
        return res.status(400).json({ error: 'Informe userId e trainingId.' });
      }
      const success = repo.enrollStudent(userId, trainingId);
      res.json({ success });
    } catch (err: any) {
      console.error('[Trainings Admin] Erro ao inscrever aluno:', err);
      res.status(500).json({ error: 'Falha ao inscrever aluno.' });
    }
  });

  // 15. Admin: Relatório e Métricas Gerais do LMS
  router.get('/admin/report', auth.requireAdmin, (_req: any, res) => {
    try {
      const summary = repo.getAdminReportSummary();
      res.json({ success: true, report: summary });
    } catch (err: any) {
      console.error('[Trainings Admin] Erro ao obter relatório:', err);
      res.status(500).json({ error: 'Falha ao gerar relatório.' });
    }
  });

  // 16. Admin: Listar todos os certificados emitidos na plataforma
  router.get('/admin/certificates', auth.requireAdmin, (req: any, res) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const trainingId = typeof req.query.trainingId === 'string' ? req.query.trainingId : undefined;
      const certificates = repo.getAllCertificates(search, trainingId);
      res.json({ success: true, certificates });
    } catch (err: any) {
      console.error('[Trainings Admin] Erro ao listar certificados:', err);
      res.status(500).json({ error: 'Falha ao buscar certificados.' });
    }
  });

  // 17. Admin: Emitir / Fornecer Certificado Manualmente
  router.post('/admin/certificates', auth.requireAdmin, (req: any, res) => {
    try {
      const { userId, trainingId, userName, trainingTitle, workloadHours } = req.body;
      if (!userId || !trainingId) {
        return res.status(400).json({ error: 'Informe userId e trainingId para emitir o certificado.' });
      }
      const result = repo.issueCertificateManually({
        userId,
        trainingId,
        userName,
        trainingTitle,
        workloadHours: workloadHours ? Number(workloadHours) : undefined,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error || 'Falha ao emitir certificado.' });
      }

      res.status(201).json({ success: true, certificate: result.certificate });
    } catch (err: any) {
      console.error('[Trainings Admin] Erro ao emitir certificado:', err);
      res.status(500).json({ error: 'Falha interna ao emitir certificado.' });
    }
  });

  // 18. Admin: Revogar / Excluir Certificado Emitido Equivocadamente
  router.delete('/admin/certificates/:id', auth.requireAdmin, (req: any, res) => {
    try {
      const { id } = req.params;
      const resetProgress = req.query.resetProgress !== 'false';
      const result = repo.deleteCertificate(id, resetProgress);

      if (!result.success) {
        return res.status(404).json({ error: result.error || 'Certificado não encontrado.' });
      }

      res.json({ success: true, message: 'Certificado revogado com sucesso.' });
    } catch (err: any) {
      console.error('[Trainings Admin] Erro ao revogar certificado:', err);
      res.status(500).json({ error: 'Falha interna ao revogar certificado.' });
    }
  });

  // 19. Admin: Listar usuários cadastrados para seleção em emissão de certificados
  router.get('/admin/users', auth.requireAdmin, (_req: any, res) => {
    try {
      const users = repo.getRegisteredUsersForCertificates();
      res.json({ success: true, users });
    } catch (err: any) {
      console.error('[Trainings Admin] Erro ao listar usuários:', err);
      res.status(500).json({ error: 'Falha ao listar usuários.' });
    }
  });

  return router;
}

export function createCertificateRouter(repo: ITrainingRepository): Router {
  const router = Router();

  // List certificates for logged in user
  router.get('/', (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }
      const certificates = repo.getUserCertificates(req.user.id);
      res.json({ success: true, certificates });
    } catch (err: any) {
      console.error('[Certificates] Erro ao listar:', err);
      res.status(500).json({ error: 'Falha ao buscar certificados.' });
    }
  });

  // Get specific certificate by ID or validationCode (public verification)
  router.get('/:id', (req, res) => {
    try {
      const certificate = repo.getCertificateById(req.params.id);
      if (!certificate) {
        return res.status(404).json({ error: 'Certificado não encontrado ou inválido.' });
      }
      res.json({ success: true, certificate });
    } catch (err: any) {
      console.error('[Certificates] Erro ao buscar certificado:', err);
      res.status(500).json({ error: 'Falha ao validar certificado.' });
    }
  });

  return router;
}

export function createBookmarkRouter(repo: ITrainingRepository): Router {
  const router = Router();

  router.get('/', (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }
      const bookmarks = repo.getUserBookmarks(req.user.id);
      res.json({ success: true, bookmarks });
    } catch (err: any) {
      console.error('[Bookmarks] Erro ao buscar favoritos:', err);
      res.status(500).json({ error: 'Falha ao buscar favoritos.' });
    }
  });

  return router;
}

export function createLmsReportRouter(
  repo: ITrainingRepository,
  requireAdmin: (req: Request, res: Response, next: () => void) => void
): Router {
  const router = Router();

  router.get('/reports', requireAdmin, (_req, res) => {
    try {
      const summary = repo.getAdminReportSummary();
      res.json({ success: true, report: summary });
    } catch (err: any) {
      console.error('[LMS Reports] Erro ao gerar relatórios:', err);
      res.status(500).json({ error: 'Falha ao gerar relatórios.' });
    }
  });

  return router;
}
