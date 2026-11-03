import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import { getDatabase } from '../db/database';
import {
  Training,
  TrainingLesson,
  TrainingCategory,
  UserCertificate,
  TrainingReportSummary,
  TrainingCategoryStats,
  StudentEnrollment,
  VerificationMethod,
  LessonWatchAudit,
} from '../../types/training';

export interface ITrainingRepository {
  getAllTrainings(userId?: string, category?: string, search?: string, includeDrafts?: boolean): Training[];
  getTrainingById(id: string, userId?: string, isAdmin?: boolean): Training | null;
  createTraining(data: Partial<Training>): Training;
  updateTraining(id: string, data: Partial<Training>): Training | null;
  deleteTraining(id: string): boolean;
  setTrainingPublication(id: string, isPublished?: boolean): { isPublished: boolean } | null;

  getCategories(): TrainingCategory[];
  createCategory(data: { name: string; description?: string; prerequisiteCategoryId?: string | null }): TrainingCategory;
  updateCategory(id: string, data: { name?: string; description?: string; prerequisiteCategoryId?: string | null }): TrainingCategory | null;
  deleteCategory(id: string): { success: boolean; error?: string };
  seedDefaultCategoriesIfNeeded(): void;

  getLessons(trainingId: string, userId?: string): TrainingLesson[];
  addLesson(trainingId: string, data: Partial<TrainingLesson>): TrainingLesson;
  updateLesson(trainingId: string, lessonId: string, data: Partial<TrainingLesson>): TrainingLesson | null;
  deleteLesson(trainingId: string, lessonId: string): boolean;

  toggleLessonProgress(
    userId: string,
    trainingId: string,
    lessonId: string,
    userName?: string,
    audit?: {
      secondsWatched?: number;
      durationSeconds?: number;
      watchPercent?: number;
      verifiedVia?: VerificationMethod;
    }
  ): {
    isCompleted: boolean;
    isCompletedAll: boolean;
    progressPercent: number;
    completedLessons: string[];
    certificate?: UserCertificate | null;
    audit?: LessonWatchAudit | null;
  };

  getUserCertificates(userId: string): UserCertificate[];
  getCertificateById(certificateId: string): UserCertificate | null;

  // Gestão e Controle de Certificados (Admin)
  getAllCertificates(search?: string, trainingId?: string): (UserCertificate & { userEmail?: string })[];
  deleteCertificate(certificateId: string, resetProgress?: boolean): { success: boolean; error?: string };
  issueCertificateManually(data: {
    userId: string;
    trainingId: string;
    userName?: string;
    trainingTitle?: string;
    workloadHours?: number;
  }): { success: boolean; certificate?: UserCertificate; error?: string };
  getRegisteredUsersForCertificates(): { id: string; name: string; email: string }[];

  toggleBookmark(userId: string, trainingId: string): boolean;
  getUserBookmarks(userId: string): string[];
  isTrainingBookmarked(userId: string, trainingId: string): boolean;

  // Gestão de Alunos (Admin)
  getAdminStudentEnrollments(trainingId?: string, search?: string): StudentEnrollment[];
  resetStudentProgress(userId: string, trainingId: string): boolean;
  completeStudentTrainingManually(
    userId: string,
    trainingId: string,
    adminName?: string
  ): { success: boolean; certificate?: UserCertificate | null };
  enrollStudent(userId: string, trainingId: string): boolean;

  getAdminReportSummary(): TrainingReportSummary;
  seedDefaultTrainingsIfNeeded(): void;
}

export class SqliteTrainingRepository implements ITrainingRepository {
  private db: DatabaseSync;

  constructor(customDbOrPath?: DatabaseSync | string) {
    if (typeof customDbOrPath === 'string') {
      this.db = getDatabase(customDbOrPath);
    } else if (customDbOrPath) {
      this.db = customDbOrPath;
    } else {
      this.db = getDatabase();
    }
    this.seedDefaultCategoriesIfNeeded();
  }

  seedDefaultTrainingsIfNeeded(): void {
    const countRow = this.db.prepare('SELECT COUNT(*) as cnt FROM trainings').get() as {
      cnt: number;
    };
    if (countRow && countRow.cnt > 0) return;

    const now = new Date().toISOString();

    const initialTrainings = [
      {
        id: 'trn-lideranca-celulas',
        title: 'Formação de Líderes de Célula 2027',
        description:
          'Capacitação essencial para novos e experientes líderes de célula da Igreja Presbiteriana Renovada. Aprenda a dinâmica de reunião, pastoreio prático e multiplicação saudável.',
        category: 'Liderança',
        targetAudience: 'Líderes de Célula & Auxiliares',
        coverImageUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80',
        bannerImageUrl: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1400&q=80',
        isRequired: 1,
        isFeatured: 1,
        workloadHours: 4,
        complementaryBookId: 'cell-church-larry-stockstill',
        orderIndex: 1,
        lessons: [
          {
            id: 'lsn-cel-01',
            title: '1. O Coração Pastoral e a Visão de Células',
            description: 'Fundamentos bíblicos da Igreja nos Lares e a identidade de liderança servidora.',
            videoType: 'youtube',
            videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
            durationMinutes: 25,
            orderIndex: 1,
          },
          {
            id: 'lsn-cel-02',
            title: '2. A Dinâmica da Reunião de 4 Momentos',
            description: 'Quebra-gelo, Louvor, Compartilhamento da Palavra e Oração de Alvos.',
            videoType: 'youtube',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            durationMinutes: 30,
            orderIndex: 2,
          },
          {
            id: 'lsn-cel-03',
            title: '3. Discipulado Pessoal e Formação de Sucessores',
            description: 'Como gerar novos líderes, acolher visitantes e planejar a multiplicação.',
            videoType: 'google_drive',
            videoUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view',
            durationMinutes: 35,
            orderIndex: 3,
          },
        ],
      },
      {
        id: 'trn-kids-protecao',
        title: 'Ministério Infantil: Proteção, Segurança & Acolhimento',
        description:
          'Protocolos de segurança, primeiros socorros preventivos e abordagem pedagógica cristã para voluntários e professores do Ministério Kids.',
        category: 'Infantil',
        targetAudience: 'Equipe Kids & Voluntários',
        coverImageUrl: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=800&q=80',
        bannerImageUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1400&q=80',
        isRequired: 1,
        isFeatured: 1,
        workloadHours: 3,
        complementaryBookId: null,
        orderIndex: 2,
        lessons: [
          {
            id: 'lsn-kids-01',
            title: '1. Diretrizes de Proteção e Check-in Seguro',
            description: 'Regras de entrada, saída com pulseiras e condutas éticas no cuidado das crianças.',
            videoType: 'youtube',
            videoUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
            durationMinutes: 20,
            orderIndex: 1,
          },
          {
            id: 'lsn-kids-02',
            title: '2. Contação Bíblica Criativa e Gestão de Sala',
            description: 'Como engajar diferentes faixas etárias mantendo o ambiente ordeiro e acolhedor.',
            videoType: 'youtube',
            videoUrl: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
            durationMinutes: 25,
            orderIndex: 2,
          },
        ],
      },
      {
        id: 'trn-louvor-excelencia',
        title: 'Louvor & Adoração: Espiritualidade e Excelência',
        description:
          'Princípios bíblicos do altar, preparação técnica, pontualidade e sincronia ministerial para músicos, cantores e operadores de áudio.',
        category: 'Louvor',
        targetAudience: 'Ministério de Louvor & Áudio',
        coverImageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80',
        bannerImageUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=1400&q=80',
        isRequired: 0,
        isFeatured: 0,
        workloadHours: 2.5,
        complementaryBookId: null,
        orderIndex: 3,
        lessons: [
          {
            id: 'lsn-lv-01',
            title: '1. O Coração do Adorador e Alinhamento com a Igreja',
            description: 'A adoração como estilo de vida e não apenas momento do culto.',
            videoType: 'youtube',
            videoUrl: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
            durationMinutes: 20,
            orderIndex: 1,
          },
          {
            id: 'lsn-lv-02',
            title: '2. Ensaio Produtivo, Dinâmica e Equalização no Altar',
            description: 'Como conduzir passagens de som rápidas e manter o equilíbrio harmônico.',
            videoType: 'youtube',
            videoUrl: 'https://www.youtube.com/watch?v=3JZ_D3ELwOQ',
            durationMinutes: 30,
            orderIndex: 2,
          },
        ],
      },
      {
        id: 'trn-diaconia-acolhimento',
        title: 'Diaconia & Boas-Vindas: A Arte de Servir e Conectar',
        description:
          'A primeira impressão da igreja. Aprenda sobre recepção humanizada, gestão do templo, segurança e condução atenta de cultos públicos.',
        category: 'Diaconia',
        targetAudience: 'Diáconos, Obreiros & Recepção',
        coverImageUrl: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=800&q=80',
        bannerImageUrl: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1400&q=80',
        isRequired: 1,
        isFeatured: 0,
        workloadHours: 2,
        complementaryBookId: null,
        orderIndex: 4,
        lessons: [
          {
            id: 'lsn-diac-01',
            title: '1. Acolhimento Estratégico: O Sorriso que Edifica',
            description: 'Boas práticas na porta de entrada, entrega de materiais e auxílio a idosos.',
            videoType: 'youtube',
            videoUrl: 'https://www.youtube.com/watch?v=L_LUpnjgPso',
            durationMinutes: 20,
            orderIndex: 1,
          },
          {
            id: 'lsn-diac-02',
            title: '2. Resolução de Situações Delicadas e Organização do Espaço',
            description: 'Postura pastoral e eficiente em imprevistos e emergências.',
            videoType: 'youtube',
            videoUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
            durationMinutes: 20,
            orderIndex: 2,
          },
        ],
      },
      {
        id: 'trn-onboarding-renovada',
        title: 'Institucional: Cultura, Visão & DNA Renovada',
        description:
          'Entenda nossa história, declaração de fé, estrutura pastoral e os pilares de expansão da nossa comunidade.',
        category: 'Institucionais',
        targetAudience: 'Todos os Membros & Novos Voluntários',
        coverImageUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
        bannerImageUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=1400&q=80',
        isRequired: 1,
        isFeatured: 1,
        workloadHours: 2,
        complementaryBookId: null,
        orderIndex: 5,
        lessons: [
          {
            id: 'lsn-onb-01',
            title: '1. Nossa História e os Pilares da Fé Cristã',
            description: 'Como a igreja nasceu e para onde Deus está nos conduzindo.',
            videoType: 'youtube',
            videoUrl: 'https://www.youtube.com/watch?v=V-_O7nl0Ii0',
            durationMinutes: 25,
            orderIndex: 1,
          },
          {
            id: 'lsn-onb-02',
            title: '2. Engajamento, Ministérios e Caminho do Voluntário',
            description: 'Descobrindo seus dons e atuando com propósito no corpo de Cristo.',
            videoType: 'youtube',
            videoUrl: 'https://www.youtube.com/watch?v=C0DPdy98e4c',
            durationMinutes: 25,
            orderIndex: 2,
          },
        ],
      },
    ];

    const insertTrainingStmt = this.db.prepare(`
      INSERT INTO trainings (
        id, title, description, category, target_audience, cover_image_url,
        banner_image_url, is_required, is_featured, is_published, workload_hours,
        complementary_book_id, order_index, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertLessonStmt = this.db.prepare(`
      INSERT INTO training_lessons (
        id, training_id, title, description, video_type, video_url,
        duration_minutes, order_index, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const t of initialTrainings) {
      insertTrainingStmt.run(
        t.id,
        t.title,
        t.description,
        t.category,
        t.targetAudience,
        t.coverImageUrl,
        t.bannerImageUrl,
        t.isRequired,
        t.isFeatured,
        1,
        t.workloadHours,
        t.complementaryBookId,
        t.orderIndex,
        now,
        now
      );

      for (const l of t.lessons) {
        insertLessonStmt.run(
          l.id,
          t.id,
          l.title,
          l.description,
          l.videoType,
          l.videoUrl,
          l.durationMinutes,
          l.orderIndex,
          now,
          now
        );
      }
    }
  }

  getAllTrainings(userId?: string, category?: string, search?: string, includeDrafts: boolean = false): Training[] {
    let sql = 'SELECT * FROM trainings WHERE 1=1';
    const params: any[] = [];

    if (!includeDrafts) {
      sql += ' AND is_published = 1';
    }

    if (category && category !== 'Todos') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (search && search.trim()) {
      sql += ' AND (title LIKE ? OR description LIKE ? OR target_audience LIKE ?)';
      const query = `%${search.trim()}%`;
      params.push(query, query, query);
    }

    sql += ' ORDER BY order_index ASC, created_at DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];

    // Fetch user progress map if userId is provided
    let userProgressMap: Record<string, { completedLessons: string[]; isCompleted: boolean }> = {};
    if (userId) {
      const progressRows = this.db
        .prepare('SELECT training_id, completed_lessons_json, is_completed FROM user_training_progress WHERE user_id = ?')
        .all(userId) as any[];

      for (const p of progressRows) {
        try {
          userProgressMap[p.training_id] = {
            completedLessons: JSON.parse(p.completed_lessons_json || '[]'),
            isCompleted: Boolean(p.is_completed),
          };
        } catch {
          userProgressMap[p.training_id] = { completedLessons: [], isCompleted: false };
        }
      }
    }

    // Load category hierarchy dependencies
    let catPrereqMap = new Map<string, { prereqId: string | null; prereqName: string | null }>();
    try {
      const catRows = this.db
        .prepare(`
          SELECT tc.id, tc.name, tc.prerequisite_category_id, p.name as prerequisite_name
          FROM training_categories tc
          LEFT JOIN training_categories p ON tc.prerequisite_category_id = p.id
        `)
        .all() as { id: string; name: string; prerequisite_category_id: string | null; prerequisite_name: string | null }[];

      for (const c of catRows) {
        catPrereqMap.set(c.name.toLowerCase(), {
          prereqId: c.prerequisite_category_id,
          prereqName: c.prerequisite_name,
        });
      }
    } catch {
      // ignore
    }

    const categoryCompletionMap = new Map<string, boolean>();
    const isCategoryCompletedByUser = (catName: string): boolean => {
      const lower = catName.toLowerCase();
      if (categoryCompletionMap.has(lower)) {
        return categoryCompletionMap.get(lower)!;
      }
      const prereqTrainings = this.db
        .prepare('SELECT id FROM trainings WHERE LOWER(category) = LOWER(?) AND is_published = 1')
        .all(catName) as { id: string }[];

      if (prereqTrainings.length === 0) {
        categoryCompletionMap.set(lower, true);
        return true;
      }

      if (!userId) {
        categoryCompletionMap.set(lower, false);
        return false;
      }

      const allDone = prereqTrainings.every((pt) => {
        const prog = userProgressMap[pt.id];
        return prog && prog.isCompleted;
      });

      categoryCompletionMap.set(lower, allDone);
      return allDone;
    };

    // Count lessons per training
    const lessonCounts = this.db
      .prepare('SELECT training_id, COUNT(*) as cnt FROM training_lessons GROUP BY training_id')
      .all() as { training_id: string; cnt: number }[];
    const countsMap = new Map(lessonCounts.map((c) => [c.training_id, c.cnt]));

    // Query titles of all trainings for course prerequisite resolution
    const allTrainingsRows = this.db
      .prepare('SELECT id, title FROM trainings')
      .all() as { id: string; title: string }[];
    const trainingTitlesMap = new Map(allTrainingsRows.map((t) => [t.id, t.title]));

    return rows.map((r) => {
      const lessons = this.getLessons(r.id, userId);
      const totalLessons = lessons.length || countsMap.get(r.id) || 0;
      const progress = userProgressMap[r.id];
      const completedCount = progress
        ? progress.completedLessons.length
        : lessons.filter((l) => l.isCompleted).length;
      const progressPercent = totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;
      const isCompleted = progress ? progress.isCompleted : (totalLessons > 0 && completedCount === totalLessons);

      const catInfo = catPrereqMap.get(r.category.toLowerCase());
      let isLockedByPrerequisite = false;
      let prerequisiteReason: 'category' | 'course' | null = null;
      const prerequisiteCategoryId = catInfo?.prereqId || null;
      const prerequisiteCategoryName = catInfo?.prereqName || null;

      const prerequisiteTrainingId = r.prerequisite_training_id || null;
      const prerequisiteTrainingTitle = prerequisiteTrainingId
        ? trainingTitlesMap.get(prerequisiteTrainingId) || null
        : null;

      // Check course-level prerequisite
      if (prerequisiteTrainingId) {
        const prereqProg = userProgressMap[prerequisiteTrainingId];
        const isPrereqCourseDone = Boolean(userId && prereqProg && prereqProg.isCompleted);
        if (!isPrereqCourseDone) {
          isLockedByPrerequisite = true;
          prerequisiteReason = 'course';
        }
      }

      // Check category-level prerequisite
      if (prerequisiteCategoryName) {
        const isPrereqDone = isCategoryCompletedByUser(prerequisiteCategoryName);
        if (!isPrereqDone) {
          isLockedByPrerequisite = true;
          if (!prerequisiteReason) {
            prerequisiteReason = 'category';
          }
        }
      }

      return {
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        targetAudience: r.target_audience,
        coverImageUrl: r.cover_image_url,
        bannerImageUrl: r.banner_image_url,
        isRequired: Boolean(r.is_required),
        isFeatured: Boolean(r.is_featured),
        isPublished: Boolean(r.is_published ?? 1),
        workloadHours: Number(r.workload_hours || 1),
        complementaryBookId: r.complementary_book_id,
        orderIndex: Number(r.order_index || 0),
        lessonsCount: totalLessons,
        completedLessonsCount: completedCount,
        progressPercent,
        isCompleted,
        isLockedByPrerequisite,
        prerequisiteCategoryId,
        prerequisiteCategoryName,
        prerequisiteTrainingId,
        prerequisiteTrainingTitle,
        prerequisiteReason,
        lessons,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });
  }

  getTrainingById(id: string, userId?: string, isAdmin: boolean = false): Training | null {
    const r = this.db.prepare('SELECT * FROM trainings WHERE id = ?').get(id) as any;
    if (!r) return null;

    const isPublished = Boolean(r.is_published ?? 1);
    if (!isAdmin && !isPublished) {
      return null;
    }

    const lessons = this.getLessons(id, userId);
    const totalLessons = lessons.length;
    const completedCount = lessons.filter((l) => l.isCompleted).length;
    const progressPercent = totalLessons > 0 ? Math.min(100, Math.round((completedCount / totalLessons) * 100)) : 0;

    let isCompleted = false;
    if (userId) {
      const prog = this.db
        .prepare('SELECT is_completed FROM user_training_progress WHERE user_id = ? AND training_id = ?')
        .get(userId, id) as { is_completed: number } | undefined;
      isCompleted = Boolean(prog?.is_completed);
    }

    // Evaluate prerequisite hierarchy for this training's category & course
    let isLockedByPrerequisite = false;
    let prerequisiteReason: 'category' | 'course' | null = null;
    let prerequisiteCategoryId: string | null = null;
    let prerequisiteCategoryName: string | null = null;
    let prerequisiteTrainingId: string | null = r.prerequisite_training_id || null;
    let prerequisiteTrainingTitle: string | null = null;

    if (prerequisiteTrainingId) {
      const prereqCourse = this.db
        .prepare('SELECT id, title FROM trainings WHERE id = ?')
        .get(prerequisiteTrainingId) as { id: string; title: string } | undefined;
      if (prereqCourse) {
        prerequisiteTrainingTitle = prereqCourse.title;
        let isPrereqCourseDone = false;
        if (userId) {
          const prog = this.db
            .prepare('SELECT is_completed FROM user_training_progress WHERE user_id = ? AND training_id = ?')
            .get(userId, prerequisiteTrainingId) as { is_completed: number } | undefined;
          isPrereqCourseDone = Boolean(prog?.is_completed);
        }
        if (!isPrereqCourseDone) {
          isLockedByPrerequisite = true;
          prerequisiteReason = 'course';
        }
      }
    }

    try {
      const catRow = this.db
        .prepare(`
          SELECT tc.id, tc.name, tc.prerequisite_category_id, p.name as prerequisite_name
          FROM training_categories tc
          LEFT JOIN training_categories p ON tc.prerequisite_category_id = p.id
          WHERE LOWER(tc.name) = LOWER(?)
        `)
        .get(r.category) as { id: string; name: string; prerequisite_category_id: string | null; prerequisite_name: string | null } | undefined;

      if (catRow?.prerequisite_category_id) {
        prerequisiteCategoryId = catRow.prerequisite_category_id;
        prerequisiteCategoryName = catRow.prerequisite_name || null;

        if (prerequisiteCategoryName) {
          const prereqTrainings = this.db
            .prepare('SELECT id FROM trainings WHERE LOWER(category) = LOWER(?) AND is_published = 1')
            .all(prerequisiteCategoryName) as { id: string }[];

          if (prereqTrainings.length > 0) {
            if (!userId) {
              isLockedByPrerequisite = true;
              if (!prerequisiteReason) prerequisiteReason = 'category';
            } else {
              const completedPrereqs = this.db
                .prepare(`
                  SELECT COUNT(*) as cnt
                  FROM user_training_progress
                  WHERE user_id = ? AND is_completed = 1 AND training_id IN (${prereqTrainings.map(() => '?').join(',')})
                `)
                .get(userId, ...prereqTrainings.map((t) => t.id)) as { cnt: number };

              if ((completedPrereqs?.cnt || 0) < prereqTrainings.length) {
                isLockedByPrerequisite = true;
                if (!prerequisiteReason) prerequisiteReason = 'category';
              }
            }
          }
        }
      }
    } catch {
      // ignore
    }

    return {
      id: r.id,
      title: r.title,
      description: r.description,
      category: r.category,
      targetAudience: r.target_audience,
      coverImageUrl: r.cover_image_url,
      bannerImageUrl: r.banner_image_url,
      isRequired: Boolean(r.is_required),
      isFeatured: Boolean(r.is_featured),
      isPublished,
      workloadHours: Number(r.workload_hours || 1),
      complementaryBookId: r.complementary_book_id,
      orderIndex: Number(r.order_index || 0),
      lessonsCount: totalLessons,
      completedLessonsCount: completedCount,
      progressPercent,
      isCompleted,
      isLockedByPrerequisite,
      prerequisiteCategoryId,
      prerequisiteCategoryName,
      prerequisiteTrainingId,
      prerequisiteTrainingTitle,
      prerequisiteReason,
      lessons,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  createTraining(data: Partial<Training>): Training {
    const id = data.id || `trn_${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();
    const isPublished = data.isPublished !== undefined ? (data.isPublished ? 1 : 0) : 1;

    let prereqTrainingId = data.prerequisiteTrainingId && data.prerequisiteTrainingId.trim() !== ''
      ? data.prerequisiteTrainingId.trim()
      : null;

    if (prereqTrainingId) {
      if (prereqTrainingId === id) {
        throw new Error('Um treinamento não pode ter a si mesmo como pré-requisito.');
      }
      const prereq = this.db.prepare('SELECT id FROM trainings WHERE id = ?').get(prereqTrainingId);
      if (!prereq) {
        throw new Error('Treinamento pré-requisito não encontrado.');
      }
    }

    this.db.prepare(`
      INSERT INTO trainings (
        id, title, description, category, target_audience, cover_image_url,
        banner_image_url, is_required, is_featured, is_published, workload_hours,
        complementary_book_id, order_index, prerequisite_training_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.title || 'Novo Treinamento',
      data.description || '',
      data.category || 'Geral',
      data.targetAudience || 'Todos',
      data.coverImageUrl || 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800',
      data.bannerImageUrl || null,
      data.isRequired ? 1 : 0,
      data.isFeatured ? 1 : 0,
      isPublished,
      Number(data.workloadHours || 1),
      data.complementaryBookId || null,
      Number(data.orderIndex || 0),
      prereqTrainingId,
      now,
      now
    );

    if (Array.isArray(data.lessons) && data.lessons.length > 0) {
      for (const l of data.lessons) {
        this.addLesson(id, l);
      }
    }

    return this.getTrainingById(id, undefined, true)!;
  }

  updateTraining(id: string, data: Partial<Training>): Training | null {
    const existing = this.getTrainingById(id, undefined, true);
    if (!existing) return null;

    let prereqTrainingId = existing.prerequisiteTrainingId ?? null;
    if (data.prerequisiteTrainingId !== undefined) {
      const trimmed = data.prerequisiteTrainingId?.trim();
      prereqTrainingId = trimmed && trimmed !== '' ? trimmed : null;
    }

    if (prereqTrainingId) {
      if (prereqTrainingId === id) {
        throw new Error('Um treinamento não pode ter a si mesmo como pré-requisito.');
      }
      const prereq = this.db
        .prepare('SELECT id, prerequisite_training_id FROM trainings WHERE id = ?')
        .get(prereqTrainingId) as any;
      if (!prereq) {
        throw new Error('Treinamento pré-requisito não encontrado.');
      }

      // Prevenir ciclo de dependência direta e transitiva (A -> B -> A ou A -> B -> C -> A)
      let curr = prereq.prerequisite_training_id;
      const visited = new Set<string>([id, prereqTrainingId]);
      while (curr) {
        if (curr === id) {
          throw new Error('Dependência circular detectada entre os treinamentos selecionados.');
        }
        if (visited.has(curr)) break;
        visited.add(curr);
        const parent = this.db
          .prepare('SELECT prerequisite_training_id FROM trainings WHERE id = ?')
          .get(curr) as any;
        curr = parent?.prerequisite_training_id || null;
      }
    }

    const now = new Date().toISOString();
    this.db.prepare(`
      UPDATE trainings SET
        title = ?,
        description = ?,
        category = ?,
        target_audience = ?,
        cover_image_url = ?,
        banner_image_url = ?,
        is_required = ?,
        is_featured = ?,
        is_published = ?,
        workload_hours = ?,
        complementary_book_id = ?,
        order_index = ?,
        prerequisite_training_id = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      data.title ?? existing.title,
      data.description ?? existing.description,
      data.category ?? existing.category,
      data.targetAudience ?? existing.targetAudience,
      data.coverImageUrl ?? existing.coverImageUrl,
      data.bannerImageUrl ?? existing.bannerImageUrl,
      data.isRequired !== undefined ? (data.isRequired ? 1 : 0) : (existing.isRequired ? 1 : 0),
      data.isFeatured !== undefined ? (data.isFeatured ? 1 : 0) : (existing.isFeatured ? 1 : 0),
      data.isPublished !== undefined ? (data.isPublished ? 1 : 0) : (existing.isPublished ? 1 : 0),
      data.workloadHours !== undefined ? Number(data.workloadHours) : existing.workloadHours,
      data.complementaryBookId !== undefined ? data.complementaryBookId : existing.complementaryBookId,
      data.orderIndex !== undefined ? Number(data.orderIndex) : existing.orderIndex,
      prereqTrainingId,
      now,
      id
    );

    return this.getTrainingById(id, undefined, true);
  }

  setTrainingPublication(id: string, isPublished?: boolean): { isPublished: boolean } | null {
    const existing = this.getTrainingById(id, undefined, true);
    if (!existing) return null;

    const now = new Date().toISOString();
    const newStatus = isPublished !== undefined ? (isPublished ? 1 : 0) : (existing.isPublished ? 0 : 1);

    this.db.prepare(`
      UPDATE trainings SET
        is_published = ?,
        updated_at = ?
      WHERE id = ?
    `).run(newStatus, now, id);

    return { isPublished: Boolean(newStatus) };
  }

  deleteTraining(id: string): boolean {
    // Desvincular treinamentos que dependem deste como pré-requisito
    this.db.prepare('UPDATE trainings SET prerequisite_training_id = NULL WHERE prerequisite_training_id = ?').run(id);

    const res = this.db.prepare('DELETE FROM trainings WHERE id = ?').run(id);
    if (res.changes > 0) {
      this.db.prepare('DELETE FROM training_lessons WHERE training_id = ?').run(id);
      this.db.prepare('DELETE FROM user_training_progress WHERE training_id = ?').run(id);
      this.db.prepare('DELETE FROM training_bookmarks WHERE training_id = ?').run(id);
      return true;
    }
    return false;
  }

  getLessons(trainingId: string, userId?: string): TrainingLesson[] {
    const rows = this.db
      .prepare('SELECT * FROM training_lessons WHERE training_id = ? ORDER BY order_index ASC, created_at ASC')
      .all(trainingId) as any[];

    let completedSet = new Set<string>();
    const auditMap = new Map<string, { secondsWatched: number; watchPercent: number; verifiedVia: VerificationMethod; completedAt: string }>();

    if (userId) {
      const prog = this.db
        .prepare('SELECT completed_lessons_json FROM user_training_progress WHERE user_id = ? AND training_id = ?')
        .get(userId, trainingId) as { completed_lessons_json: string } | undefined;
      if (prog) {
        try {
          const arr = JSON.parse(prog.completed_lessons_json || '[]');
          completedSet = new Set(arr);
        } catch {
          // ignore
        }
      }

      try {
        const auditRows = this.db
          .prepare('SELECT lesson_id, seconds_watched, watch_percent, verified_via, completed_at FROM user_lesson_audit WHERE user_id = ? AND training_id = ?')
          .all(userId, trainingId) as any[];
        for (const a of auditRows) {
          auditMap.set(a.lesson_id, {
            secondsWatched: Number(a.seconds_watched || 0),
            watchPercent: Number(a.watch_percent || 0),
            verifiedVia: a.verified_via as VerificationMethod,
            completedAt: a.completed_at,
          });
        }
      } catch {
        // ignore
      }
    }

    return rows.map((r) => ({
      id: r.id,
      trainingId: r.training_id,
      title: r.title,
      description: r.description,
      videoType: r.video_type,
      videoUrl: r.video_url,
      durationMinutes: Number(r.duration_minutes || 15),
      orderIndex: Number(r.order_index || 0),
      isCompleted: completedSet.has(r.id),
      auditInfo: auditMap.get(r.id),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  addLesson(trainingId: string, data: Partial<TrainingLesson>): TrainingLesson {
    const id = data.id || `lsn_${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();

    const maxOrder = this.db
      .prepare('SELECT MAX(order_index) as m FROM training_lessons WHERE training_id = ?')
      .get(trainingId) as { m: number | null };
    const nextOrder = (maxOrder?.m ?? 0) + 1;

    this.db.prepare(`
      INSERT INTO training_lessons (
        id, training_id, title, description, video_type, video_url,
        duration_minutes, order_index, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      trainingId,
      data.title || 'Nova Aula',
      data.description || null,
      data.videoType || 'youtube',
      data.videoUrl || '',
      Number(data.durationMinutes || 15),
      data.orderIndex ?? nextOrder,
      now,
      now
    );

    return {
      id,
      trainingId,
      title: data.title || 'Nova Aula',
      description: data.description,
      videoType: data.videoType || 'youtube',
      videoUrl: data.videoUrl || '',
      durationMinutes: Number(data.durationMinutes || 15),
      orderIndex: data.orderIndex ?? nextOrder,
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  updateLesson(trainingId: string, lessonId: string, data: Partial<TrainingLesson>): TrainingLesson | null {
    const now = new Date().toISOString();
    const existing = this.db
      .prepare('SELECT * FROM training_lessons WHERE id = ? AND training_id = ?')
      .get(lessonId, trainingId) as any;
    if (!existing) return null;

    this.db.prepare(`
      UPDATE training_lessons SET
        title = ?,
        description = ?,
        video_type = ?,
        video_url = ?,
        duration_minutes = ?,
        order_index = ?,
        updated_at = ?
      WHERE id = ? AND training_id = ?
    `).run(
      data.title ?? existing.title,
      data.description ?? existing.description,
      data.videoType ?? existing.video_type,
      data.videoUrl ?? existing.video_url,
      data.durationMinutes !== undefined ? Number(data.durationMinutes) : existing.duration_minutes,
      data.orderIndex !== undefined ? Number(data.orderIndex) : existing.order_index,
      now,
      lessonId,
      trainingId
    );

    return {
      id: lessonId,
      trainingId,
      title: data.title ?? existing.title,
      description: data.description ?? existing.description,
      videoType: data.videoType ?? existing.video_type,
      videoUrl: data.videoUrl ?? existing.video_url,
      durationMinutes: data.durationMinutes !== undefined ? Number(data.durationMinutes) : existing.duration_minutes,
      orderIndex: data.orderIndex !== undefined ? Number(data.orderIndex) : existing.order_index,
      updatedAt: now,
    };
  }

  deleteLesson(trainingId: string, lessonId: string): boolean {
    const res = this.db
      .prepare('DELETE FROM training_lessons WHERE id = ? AND training_id = ?')
      .run(lessonId, trainingId);
    return res.changes > 0;
  }

  toggleLessonProgress(
    userId: string,
    trainingId: string,
    lessonId: string,
    userName: string = 'Aluno Renovada',
    audit?: {
      secondsWatched?: number;
      durationSeconds?: number;
      watchPercent?: number;
      verifiedVia?: VerificationMethod;
    }
  ): {
    isCompleted: boolean;
    isCompletedAll: boolean;
    progressPercent: number;
    completedLessons: string[];
    certificate?: UserCertificate | null;
    audit?: LessonWatchAudit | null;
  } {
    const now = new Date().toISOString();

    const prog = this.db
      .prepare('SELECT completed_lessons_json, is_completed FROM user_training_progress WHERE user_id = ? AND training_id = ?')
      .get(userId, trainingId) as { completed_lessons_json: string; is_completed: number } | undefined;

    let currentCompleted: string[] = [];
    if (prog) {
      try {
        currentCompleted = JSON.parse(prog.completed_lessons_json || '[]');
      } catch {
        currentCompleted = [];
      }
    }

    if (currentCompleted.includes(lessonId)) {
      currentCompleted = currentCompleted.filter((id) => id !== lessonId);
    } else {
      currentCompleted.push(lessonId);
    }

    // Check if training is now 100% completed
    const allLessons = this.db
      .prepare('SELECT id FROM training_lessons WHERE training_id = ?')
      .all(trainingId) as { id: string }[];
    const allLessonIds = allLessons.map((l) => l.id);
    const isCompleted =
      allLessonIds.length > 0 && allLessonIds.every((id) => currentCompleted.includes(id));

    this.db.prepare(`
      INSERT INTO user_training_progress (user_id, training_id, completed_lessons_json, is_completed, completed_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, training_id) DO UPDATE SET
        completed_lessons_json = excluded.completed_lessons_json,
        is_completed = excluded.is_completed,
        completed_at = CASE WHEN excluded.is_completed = 1 AND user_training_progress.is_completed = 0 THEN excluded.completed_at ELSE user_training_progress.completed_at END,
        updated_at = excluded.updated_at
    `).run(
      userId,
      trainingId,
      JSON.stringify(currentCompleted),
      isCompleted ? 1 : 0,
      isCompleted ? now : null,
      now
    );

    const isLessonCompleted = currentCompleted.includes(lessonId);
    let auditRecord: LessonWatchAudit | null = null;

    if (isLessonCompleted) {
      const auditId = `aud_${crypto.randomBytes(8).toString('hex')}`;
      const secondsWatched = Math.round(audit?.secondsWatched || 0);
      const durationSeconds = Math.round(audit?.durationSeconds || 0);
      const watchPercent = audit?.watchPercent ?? (durationSeconds > 0 ? Math.min(100, Math.round((secondsWatched / durationSeconds) * 100)) : 100);
      const verifiedVia = audit?.verifiedVia || 'active_dwell_timer';

      this.db.prepare(`
        INSERT INTO user_lesson_audit (id, user_id, training_id, lesson_id, seconds_watched, duration_seconds, watch_percent, verified_via, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, training_id, lesson_id) DO UPDATE SET
          seconds_watched = excluded.seconds_watched,
          duration_seconds = excluded.duration_seconds,
          watch_percent = excluded.watch_percent,
          verified_via = excluded.verified_via,
          completed_at = excluded.completed_at
      `).run(auditId, userId, trainingId, lessonId, secondsWatched, durationSeconds, watchPercent, verifiedVia, now);

      auditRecord = {
        id: auditId,
        userId,
        trainingId,
        lessonId,
        secondsWatched,
        durationSeconds,
        watchPercent,
        verifiedVia,
        completedAt: now,
      };
    } else {
      this.db.prepare(`
        DELETE FROM user_lesson_audit WHERE user_id = ? AND training_id = ? AND lesson_id = ?
      `).run(userId, trainingId, lessonId);
    }

    let certificate: UserCertificate | null = null;
    if (isCompleted) {
      certificate = this.issueCertificate(userId, userName, trainingId);
    }

    const progressPercent =
      allLessonIds.length > 0
        ? Math.round((currentCompleted.length / allLessonIds.length) * 100)
        : 0;

    return {
      isCompleted: isLessonCompleted,
      isCompletedAll: isCompleted,
      progressPercent,
      completedLessons: currentCompleted,
      certificate,
      audit: auditRecord,
    };
  }

  private issueCertificate(userId: string, userName: string, trainingId: string): UserCertificate {
    // Check if certificate already exists
    const existing = this.db
      .prepare('SELECT * FROM user_certificates WHERE user_id = ? AND training_id = ?')
      .get(userId, trainingId) as any;
    if (existing) {
      return {
        id: existing.id,
        userId: existing.user_id,
        userName: existing.user_name,
        trainingId: existing.training_id,
        trainingTitle: existing.training_title,
        workloadHours: Number(existing.workload_hours),
        issuedAt: existing.issued_at,
        validationCode: existing.validation_code,
      };
    }

    const training = this.getTrainingById(trainingId);
    const trainingTitle = training?.title || 'Treinamento Renovada';
    const workloadHours = training?.workloadHours || 1;
    const certId = `cert_${crypto.randomBytes(8).toString('hex')}`;
    const code = `LUMI-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO user_certificates (id, user_id, user_name, training_id, training_title, workload_hours, issued_at, validation_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(certId, userId, userName, trainingId, trainingTitle, workloadHours, now, code);

    return {
      id: certId,
      userId,
      userName,
      trainingId,
      trainingTitle,
      workloadHours,
      issuedAt: now,
      validationCode: code,
    };
  }

  getUserCertificates(userId: string): UserCertificate[] {
    const rows = this.db
      .prepare('SELECT * FROM user_certificates WHERE user_id = ? ORDER BY issued_at DESC')
      .all(userId) as any[];

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      trainingId: r.training_id,
      trainingTitle: r.training_title,
      workloadHours: Number(r.workload_hours),
      issuedAt: r.issued_at,
      validationCode: r.validation_code,
    }));
  }

  getCertificateById(certificateId: string): UserCertificate | null {
    const r = this.db
      .prepare('SELECT * FROM user_certificates WHERE id = ? OR validation_code = ?')
      .get(certificateId, certificateId) as any;
    if (!r) return null;

    return {
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      trainingId: r.training_id,
      trainingTitle: r.training_title,
      workloadHours: Number(r.workload_hours),
      issuedAt: r.issued_at,
      validationCode: r.validation_code,
    };
  }

  getAllCertificates(search?: string, trainingId?: string): (UserCertificate & { userEmail?: string })[] {
    let sql = `
      SELECT
        uc.id,
        uc.user_id,
        uc.user_name,
        u.email as user_email,
        uc.training_id,
        uc.training_title,
        uc.workload_hours,
        uc.issued_at,
        uc.validation_code
      FROM user_certificates uc
      LEFT JOIN users u ON uc.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (trainingId && trainingId !== 'all' && trainingId !== 'Todos') {
      sql += ' AND uc.training_id = ?';
      params.push(trainingId);
    }

    if (search && search.trim()) {
      sql += ' AND (uc.user_name LIKE ? OR uc.training_title LIKE ? OR uc.validation_code LIKE ? OR u.email LIKE ?)';
      const q = `%${search.trim()}%`;
      params.push(q, q, q, q);
    }

    sql += ' ORDER BY uc.issued_at DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      userEmail: r.user_email || '',
      trainingId: r.training_id,
      trainingTitle: r.training_title,
      workloadHours: Number(r.workload_hours || 0),
      issuedAt: r.issued_at,
      validationCode: r.validation_code,
    }));
  }

  deleteCertificate(certificateId: string, resetProgress: boolean = true): { success: boolean; error?: string } {
    const cert = this.db
      .prepare('SELECT * FROM user_certificates WHERE id = ?')
      .get(certificateId) as any;

    if (!cert) {
      return { success: false, error: 'Certificado não encontrado.' };
    }

    if (resetProgress) {
      const now = new Date().toISOString();
      this.db.prepare(`
        UPDATE user_training_progress
        SET completed_lessons_json = '[]', is_completed = 0, completed_at = NULL, updated_at = ?
        WHERE user_id = ? AND training_id = ?
      `).run(now, cert.user_id, cert.training_id);

      try {
        this.db.prepare(`
          DELETE FROM user_lesson_audit
          WHERE user_id = ? AND training_id = ?
        `).run(cert.user_id, cert.training_id);
      } catch {
        // ignore
      }
    }

    const res = this.db.prepare('DELETE FROM user_certificates WHERE id = ?').run(certificateId);
    return { success: res.changes > 0 };
  }

  issueCertificateManually(data: {
    userId: string;
    trainingId: string;
    userName?: string;
    trainingTitle?: string;
    workloadHours?: number;
  }): { success: boolean; certificate?: UserCertificate; error?: string } {
    const { userId, trainingId } = data;
    if (!userId || !trainingId) {
      return { success: false, error: 'Aluno e Treinamento são obrigatórios.' };
    }

    const training = this.getTrainingById(trainingId, undefined, true);
    if (!training) {
      return { success: false, error: 'Treinamento não encontrado.' };
    }

    // Se já existir certificado para esse aluno e treinamento, verificar
    const existing = this.db
      .prepare('SELECT * FROM user_certificates WHERE user_id = ? AND training_id = ?')
      .get(userId, trainingId) as any;

    if (existing) {
      return {
        success: false,
        error: `Este aluno já possui o certificado ${existing.validation_code} para este curso. Revogue o certificado anterior caso deseje substituí-lo.`,
      };
    }

    let userName = data.userName?.trim();
    if (!userName) {
      const user = this.db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
      userName = user?.name || 'Aluno Renovada';
    }

    const trainingTitle = data.trainingTitle?.trim() || training.title;
    const workloadHours = data.workloadHours || training.workloadHours || 1;
    const certId = `cert_${crypto.randomBytes(6).toString('hex')}`;
    const validationCode = `LUMI-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const now = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO user_certificates (id, user_id, user_name, training_id, training_title, workload_hours, issued_at, validation_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      certId,
      userId,
      userName,
      trainingId,
      trainingTitle,
      workloadHours,
      now,
      validationCode
    );

    // Garantir que todas as aulas constem como concluídas no progresso
    const lessons = this.getLessons(trainingId);
    const allLessonIds = lessons.map((l) => l.id);
    this.db.prepare(`
      INSERT INTO user_training_progress (user_id, training_id, completed_lessons_json, is_completed, completed_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)
      ON CONFLICT(user_id, training_id) DO UPDATE SET
        completed_lessons_json = excluded.completed_lessons_json,
        is_completed = 1,
        completed_at = COALESCE(user_training_progress.completed_at, excluded.completed_at),
        updated_at = excluded.updated_at
    `).run(userId, trainingId, JSON.stringify(allLessonIds), now, now);

    const cert = this.getCertificateById(certId);
    return { success: true, certificate: cert || undefined };
  }

  getRegisteredUsersForCertificates(): { id: string; name: string; email: string }[] {
    try {
      const rows = this.db
        .prepare('SELECT id, name, email FROM users ORDER BY name ASC')
        .all() as any[];
      return rows.map((r) => ({
        id: r.id,
        name: r.name || 'Sem nome',
        email: r.email || '',
      }));
    } catch {
      return [];
    }
  }

  toggleBookmark(userId: string, trainingId: string): boolean {
    const existing = this.db
      .prepare('SELECT * FROM training_bookmarks WHERE user_id = ? AND training_id = ?')
      .get(userId, trainingId);

    if (existing) {
      this.db.prepare('DELETE FROM training_bookmarks WHERE user_id = ? AND training_id = ?').run(userId, trainingId);
      return false; // Removed
    } else {
      const now = new Date().toISOString();
      this.db.prepare('INSERT INTO training_bookmarks (user_id, training_id, created_at) VALUES (?, ?, ?)').run(
        userId,
        trainingId,
        now
      );
      return true; // Added
    }
  }

  getUserBookmarks(userId: string): string[] {
    const rows = this.db
      .prepare('SELECT training_id FROM training_bookmarks WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as { training_id: string }[];
    return rows.map((r) => r.training_id);
  }

  isTrainingBookmarked(userId: string, trainingId: string): boolean {
    const existing = this.db
      .prepare('SELECT 1 FROM training_bookmarks WHERE user_id = ? AND training_id = ?')
      .get(userId, trainingId);
    return Boolean(existing);
  }

  getAdminStudentEnrollments(trainingId?: string, search?: string): StudentEnrollment[] {
    let sql = `
      SELECT
        utp.user_id,
        u.name as user_name,
        u.email as user_email,
        u.picture as user_picture,
        utp.training_id,
        t.title as training_title,
        t.category as training_category,
        utp.completed_lessons_json,
        utp.is_completed,
        utp.completed_at,
        utp.updated_at,
        uc.id as certificate_id,
        uc.validation_code as certificate_code
      FROM user_training_progress utp
      LEFT JOIN users u ON utp.user_id = u.id
      JOIN trainings t ON utp.training_id = t.id
      LEFT JOIN user_certificates uc ON utp.user_id = uc.user_id AND utp.training_id = uc.training_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (trainingId && trainingId !== 'Todos') {
      sql += ' AND utp.training_id = ?';
      params.push(trainingId);
    }

    if (search && search.trim()) {
      sql += ' AND (u.name LIKE ? OR u.email LIKE ? OR t.title LIKE ?)';
      const q = `%${search.trim()}%`;
      params.push(q, q, q);
    }

    sql += ' ORDER BY utp.updated_at DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];

    // Map lesson counts per training
    const lessonCounts = this.db
      .prepare('SELECT training_id, COUNT(*) as cnt FROM training_lessons GROUP BY training_id')
      .all() as { training_id: string; cnt: number }[];
    const countsMap = new Map(lessonCounts.map((c) => [c.training_id, c.cnt]));

    return rows.map((r) => {
      let completedLessons: string[] = [];
      try {
        completedLessons = JSON.parse(r.completed_lessons_json || '[]');
      } catch {
        completedLessons = [];
      }

      const totalLessonsCount = countsMap.get(r.training_id) || 0;
      const completedLessonsCount = completedLessons.length;
      const isCompleted =
        Boolean(r.is_completed) ||
        (totalLessonsCount > 0 && completedLessonsCount >= totalLessonsCount);
      const progressPercent =
        totalLessonsCount > 0
          ? Math.min(100, Math.round((completedLessonsCount / totalLessonsCount) * 100))
          : isCompleted
          ? 100
          : 0;

      return {
        userId: r.user_id,
        userName: r.user_name || 'Aluno',
        userEmail: r.user_email || '',
        userPicture: r.user_picture || null,
        trainingId: r.training_id,
        trainingTitle: r.training_title,
        trainingCategory: r.training_category,
        completedLessons,
        completedLessonsCount,
        totalLessonsCount,
        progressPercent,
        isCompleted,
        completedAt: r.completed_at || null,
        certificateId: r.certificate_id || null,
        certificateCode: r.certificate_code || null,
        updatedAt: r.updated_at,
      };
    });
  }

  resetStudentProgress(userId: string, trainingId: string): boolean {
    const res = this.db
      .prepare('DELETE FROM user_training_progress WHERE user_id = ? AND training_id = ?')
      .run(userId, trainingId);

    this.db
      .prepare('DELETE FROM user_certificates WHERE user_id = ? AND training_id = ?')
      .run(userId, trainingId);

    return res.changes > 0;
  }

  completeStudentTrainingManually(
    userId: string,
    trainingId: string,
    _adminName?: string
  ): { success: boolean; certificate?: UserCertificate | null } {
    const training = this.getTrainingById(trainingId, undefined, true);
    if (!training) {
      return { success: false };
    }

    const lessons = this.getLessons(trainingId);
    const allLessonIds = lessons.map((l) => l.id);
    const now = new Date().toISOString();

    // Upsert full progress
    this.db.prepare(`
      INSERT INTO user_training_progress (user_id, training_id, completed_lessons_json, is_completed, completed_at, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)
      ON CONFLICT(user_id, training_id) DO UPDATE SET
        completed_lessons_json = excluded.completed_lessons_json,
        is_completed = 1,
        completed_at = COALESCE(user_training_progress.completed_at, excluded.completed_at),
        updated_at = excluded.updated_at
    `).run(userId, trainingId, JSON.stringify(allLessonIds), now, now);

    // Issue certificate if not already issued
    let cert = this.db
      .prepare('SELECT * FROM user_certificates WHERE user_id = ? AND training_id = ?')
      .get(userId, trainingId) as any;

    if (!cert) {
      const certId = `cert_${crypto.randomBytes(6).toString('hex')}`;
      const validationCode = `LUMI-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const user = this.db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as any;
      const userName = user?.name || 'Aluno Renovada';

      this.db.prepare(`
        INSERT INTO user_certificates (id, user_id, user_name, training_id, training_title, workload_hours, issued_at, validation_code)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        certId,
        userId,
        userName,
        trainingId,
        training.title,
        training.workloadHours,
        now,
        validationCode
      );

      cert = this.getCertificateById(certId);
    } else {
      cert = this.getCertificateById(cert.id);
    }

    return { success: true, certificate: cert };
  }

  enrollStudent(userId: string, trainingId: string): boolean {
    const now = new Date().toISOString();
    const existing = this.db
      .prepare('SELECT 1 FROM user_training_progress WHERE user_id = ? AND training_id = ?')
      .get(userId, trainingId);

    if (existing) return true;

    this.db.prepare(`
      INSERT INTO user_training_progress (user_id, training_id, completed_lessons_json, is_completed, completed_at, updated_at)
      VALUES (?, ?, '[]', 0, NULL, ?)
    `).run(userId, trainingId, now);

    return true;
  }

  getAdminReportSummary(): TrainingReportSummary {
    const totalTrainings = (
      this.db.prepare('SELECT COUNT(*) as cnt FROM trainings').get() as { cnt: number }
    ).cnt;
    const totalPublished = (
      this.db.prepare('SELECT COUNT(*) as cnt FROM trainings WHERE is_published = 1').get() as { cnt: number }
    ).cnt;
    const totalDrafts = (
      this.db.prepare('SELECT COUNT(*) as cnt FROM trainings WHERE is_published = 0').get() as { cnt: number }
    ).cnt;
    const totalLessons = (
      this.db.prepare('SELECT COUNT(*) as cnt FROM training_lessons').get() as { cnt: number }
    ).cnt;
    const totalUsers = (
      this.db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }
    ).cnt;
    const totalCompletions = (
      this.db
        .prepare('SELECT COUNT(*) as cnt FROM user_training_progress WHERE is_completed = 1')
        .get() as { cnt: number }
    ).cnt;
    const totalCertificates = (
      this.db.prepare('SELECT COUNT(*) as cnt FROM user_certificates').get() as { cnt: number }
    ).cnt;

    // Categories Breakdown
    const categories = this.db
      .prepare('SELECT DISTINCT category FROM trainings')
      .all() as { category: string }[];

    const categoryStats: TrainingCategoryStats[] = categories.map((c) => {
      const tInCat = (
        this.db
          .prepare('SELECT COUNT(*) as cnt FROM trainings WHERE category = ?')
          .get(c.category) as { cnt: number }
      ).cnt;

      const compInCat = (
        this.db
          .prepare(`
            SELECT COUNT(*) as cnt FROM user_training_progress utp
            JOIN trainings t ON utp.training_id = t.id
            WHERE t.category = ? AND utp.is_completed = 1
          `)
          .get(c.category) as { cnt: number }
      ).cnt;

      const rate = tInCat > 0 ? Math.min(100, Math.round((compInCat / tInCat) * 100)) : 0;

      return {
        category: c.category,
        totalTrainings: tInCat,
        completedTrainings: compInCat,
        completionRatePercent: rate,
      };
    });

    // Recent completions
    const recent = this.db
      .prepare(`
        SELECT u.id as user_id, u.name as user_name, t.title as training_title, utp.completed_at
        FROM user_training_progress utp
        JOIN users u ON utp.user_id = u.id
        JOIN trainings t ON utp.training_id = t.id
        WHERE utp.is_completed = 1 AND utp.completed_at IS NOT NULL
        ORDER BY utp.completed_at DESC
        LIMIT 10
      `)
      .all() as any[];

    return {
      totalTrainings,
      totalPublished,
      totalDrafts,
      totalLessons,
      totalUsers,
      totalCompletions,
      totalCertificates,
      categoryStats,
      recentCompletions: recent.map((r) => ({
        userId: r.user_id,
        userName: r.user_name,
        trainingTitle: r.training_title,
        completedAt: r.completed_at,
      })),
    };
  }

  seedDefaultCategoriesIfNeeded(): void {
    const defaultCategories = [
      { name: 'Liderança', description: 'Formação de líderes, supervisores e mentores ministeriais.' },
      { name: 'Diaconia', description: 'Recepção, serviço prático, hospitalidade e acolhimento.' },
      { name: 'Células', description: 'Dinâmica de pequenos grupos, pastoreio prático e multiplicação.' },
      { name: 'Teologia', description: 'Fundamentos bíblicos, doutrina cristã e estudos aprofundados.' },
      { name: 'Louvor & Adoração', description: 'Música, técnica vocal, instrumentos e espiritualidade no louvor.' },
      { name: 'Família', description: 'Casais, criação de filhos, aconselhamento e lares cristãos.' },
      { name: 'Discipulado', description: 'Consolidação, acompanhamento 1 a 1 e fundamentos da fé.' },
      { name: 'Infantil', description: 'Ministério com crianças, pedagogia cristã e evangelismo infantil.' },
      { name: 'Institucionais', description: 'Visão, história, declaração de fé e cultura da Igreja Renovada.' },
    ];

    const now = new Date().toISOString();
    const insertStmt = this.db.prepare(`
      INSERT OR IGNORE INTO training_categories (id, name, description, order_index, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    defaultCategories.forEach((cat, index) => {
      const id = `cat-${cat.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-')}`;
      insertStmt.run(id, cat.name, cat.description, index + 1, now, now);
    });

    // Sincroniza também qualquer categoria já existente nos treinamentos
    try {
      const existingCategories = this.db
        .prepare("SELECT DISTINCT category FROM trainings WHERE category IS NOT NULL AND category != ''")
        .all() as { category: string }[];
      for (const row of existingCategories) {
        if (!row.category) continue;
        const id = `cat-${row.category.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-')}`;
        insertStmt.run(id, row.category, `Cursos e capacitações de ${row.category}`, 99, now, now);
      }
    } catch {
      // ignore
    }
  }

  getCategories(): TrainingCategory[] {
    this.seedDefaultCategoriesIfNeeded();

    const counts = this.db
      .prepare('SELECT category, COUNT(*) as cnt FROM trainings GROUP BY category')
      .all() as { category: string; cnt: number }[];
    const countsMap = new Map(counts.map((c) => [c.category, c.cnt]));

    const rows = this.db
      .prepare(`
        SELECT tc.*, p.name as prerequisite_name
        FROM training_categories tc
        LEFT JOIN training_categories p ON tc.prerequisite_category_id = p.id
        ORDER BY tc.order_index ASC, tc.name ASC
      `)
      .all() as any[];

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      orderIndex: Number(r.order_index || 0),
      prerequisiteCategoryId: r.prerequisite_category_id || null,
      prerequisiteCategoryName: r.prerequisite_name || null,
      trainingsCount: countsMap.get(r.name) || 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  createCategory(data: { name: string; description?: string; prerequisiteCategoryId?: string | null }): TrainingCategory {
    const trimmedName = data.name?.trim();
    if (!trimmedName) {
      throw new Error('O nome da categoria é obrigatório.');
    }

    const existing = this.db
      .prepare('SELECT id FROM training_categories WHERE LOWER(name) = LOWER(?)')
      .get(trimmedName) as { id: string } | undefined;
    if (existing) {
      throw new Error(`A categoria "${trimmedName}" já existe.`);
    }

    const prereqId = data.prerequisiteCategoryId && data.prerequisiteCategoryId.trim() !== ''
      ? data.prerequisiteCategoryId.trim()
      : null;

    let prereqName: string | null = null;
    if (prereqId) {
      const prereq = this.db.prepare('SELECT id, name FROM training_categories WHERE id = ?').get(prereqId) as any;
      if (!prereq) {
        throw new Error('Categoria pré-requisito não encontrada.');
      }
      prereqName = prereq.name;
    }

    const baseSlug = trimmedName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-');
    const id = `cat-${baseSlug}-${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const maxOrder = this.db
      .prepare('SELECT MAX(order_index) as m FROM training_categories')
      .get() as { m: number | null };
    const nextOrder = (maxOrder?.m ?? 0) + 1;

    this.db
      .prepare(`
        INSERT INTO training_categories (id, name, description, order_index, prerequisite_category_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(id, trimmedName, data.description?.trim() || null, nextOrder, prereqId, now, now);

    return {
      id,
      name: trimmedName,
      description: data.description?.trim() || '',
      orderIndex: nextOrder,
      prerequisiteCategoryId: prereqId,
      prerequisiteCategoryName: prereqName,
      trainingsCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  updateCategory(id: string, data: { name?: string; description?: string; prerequisiteCategoryId?: string | null }): TrainingCategory | null {
    const existing = this.db
      .prepare('SELECT * FROM training_categories WHERE id = ?')
      .get(id) as any;
    if (!existing) return null;

    const oldName = existing.name;
    const newName = data.name ? data.name.trim() : oldName;
    const newDesc = data.description !== undefined ? data.description.trim() : existing.description;
    const now = new Date().toISOString();

    if (newName !== oldName) {
      const duplicate = this.db
        .prepare('SELECT id FROM training_categories WHERE LOWER(name) = LOWER(?) AND id != ?')
        .get(newName, id);
      if (duplicate) {
        throw new Error(`Já existe outra categoria com o nome "${newName}".`);
      }
    }

    let prereqId: string | null = existing.prerequisite_category_id || null;
    if (data.prerequisiteCategoryId !== undefined) {
      prereqId = data.prerequisiteCategoryId && data.prerequisiteCategoryId.trim() !== ''
        ? data.prerequisiteCategoryId.trim()
        : null;
    }

    let prereqName: string | null = null;
    if (prereqId) {
      if (prereqId === id) {
        throw new Error('Uma categoria não pode ter ela mesma como pré-requisito.');
      }
      const prereq = this.db
        .prepare('SELECT id, name, prerequisite_category_id FROM training_categories WHERE id = ?')
        .get(prereqId) as any;
      if (!prereq) {
        throw new Error('Categoria pré-requisito não encontrada.');
      }
      prereqName = prereq.name;

      // Prevenir ciclo de dependência direta e transitiva (A -> B -> A ou A -> B -> C -> A)
      let curr = prereq.prerequisite_category_id;
      const visited = new Set<string>([id, prereqId]);
      while (curr) {
        if (curr === id) {
          throw new Error('Dependência circular detectada entre as categorias selecionadas.');
        }
        if (visited.has(curr)) break;
        visited.add(curr);
        const parent = this.db
          .prepare('SELECT prerequisite_category_id FROM training_categories WHERE id = ?')
          .get(curr) as any;
        curr = parent?.prerequisite_category_id || null;
      }
    }

    this.db
      .prepare(`
        UPDATE training_categories
        SET name = ?, description = ?, prerequisite_category_id = ?, updated_at = ?
        WHERE id = ?
      `)
      .run(newName, newDesc, prereqId, now, id);

    // Se o nome foi alterado, sincroniza os cursos existentes que usavam o nome antigo
    if (newName !== oldName) {
      this.db
        .prepare(`
          UPDATE trainings
          SET category = ?, updated_at = ?
          WHERE category = ?
        `)
        .run(newName, now, oldName);
    }

    const countRow = this.db
      .prepare('SELECT COUNT(*) as cnt FROM trainings WHERE category = ?')
      .get(newName) as { cnt: number };

    return {
      id,
      name: newName,
      description: newDesc,
      orderIndex: Number(existing.order_index || 0),
      prerequisiteCategoryId: prereqId,
      prerequisiteCategoryName: prereqName,
      trainingsCount: countRow?.cnt || 0,
      createdAt: existing.created_at,
      updatedAt: now,
    };
  }

  deleteCategory(id: string): { success: boolean; error?: string } {
    const category = this.db
      .prepare('SELECT * FROM training_categories WHERE id = ?')
      .get(id) as any;
    if (!category) {
      return { success: false, error: 'Categoria não encontrada.' };
    }

    const count = this.db
      .prepare('SELECT COUNT(*) as cnt FROM trainings WHERE category = ?')
      .get(category.name) as { cnt: number };

    if (count && count.cnt > 0) {
      return {
        success: false,
        error: `Não é possível excluir a categoria "${category.name}" porque há ${count.cnt} curso(s) vinculado(s) a ela.`,
      };
    }

    const depCount = this.db
      .prepare('SELECT COUNT(*) as cnt FROM training_categories WHERE prerequisite_category_id = ?')
      .get(id) as { cnt: number };

    if (depCount && depCount.cnt > 0) {
      return {
        success: false,
        error: `Não é possível excluir esta categoria porque outra(s) categoria(s) dependem dela como pré-requisito.`,
      };
    }

    this.db.prepare('DELETE FROM training_categories WHERE id = ?').run(id);
    return { success: true };
  }
}
