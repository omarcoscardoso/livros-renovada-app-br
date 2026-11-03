export type VideoType = 'youtube' | 'google_drive';
export type VerificationMethod = 'youtube_api' | 'active_dwell_timer' | 'admin_manual';

export interface LessonWatchAudit {
  id: string;
  userId: string;
  trainingId: string;
  lessonId: string;
  secondsWatched: number;
  durationSeconds: number;
  watchPercent: number;
  verifiedVia: VerificationMethod;
  completedAt: string;
}

export interface TrainingCategory {
  id: string;
  name: string;
  description?: string;
  orderIndex?: number;
  prerequisiteCategoryId?: string | null;
  prerequisiteCategoryName?: string | null;
  trainingsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TrainingLesson {
  id: string;
  trainingId: string;
  title: string;
  description?: string;
  videoType: VideoType;
  videoUrl: string;
  durationMinutes: number;
  orderIndex: number;
  isCompleted?: boolean;
  auditInfo?: {
    secondsWatched?: number;
    watchPercent?: number;
    verifiedVia?: VerificationMethod;
    completedAt?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Training {
  id: string;
  title: string;
  description: string;
  category: string;
  targetAudience: string;
  coverImageUrl: string;
  bannerImageUrl?: string;
  isRequired: boolean;
  isFeatured: boolean;
  workloadHours: number;
  complementaryBookId?: string | null;
  orderIndex: number;
  isPublished: boolean;
  lessonsCount: number;
  completedLessonsCount?: number;
  progressPercent?: number;
  isCompleted?: boolean;
  isLockedByPrerequisite?: boolean;
  prerequisiteCategoryId?: string | null;
  prerequisiteCategoryName?: string | null;
  prerequisiteTrainingId?: string | null;
  prerequisiteTrainingTitle?: string | null;
  prerequisiteReason?: 'category' | 'course' | null;
  lessons?: TrainingLesson[];
  createdAt: string;
  updatedAt: string;
}

export interface UserCertificate {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  trainingId: string;
  trainingTitle: string;
  workloadHours: number;
  issuedAt: string;
  validationCode: string;
}

export interface StudentEnrollment {
  userId: string;
  userName: string;
  userEmail: string;
  userPicture?: string | null;
  trainingId: string;
  trainingTitle: string;
  trainingCategory: string;
  completedLessons: string[];
  completedLessonsCount: number;
  totalLessonsCount: number;
  progressPercent: number;
  isCompleted: boolean;
  completedAt?: string | null;
  certificateId?: string | null;
  certificateCode?: string | null;
  updatedAt: string;
}

export interface TrainingProgressRecord {
  userId: string;
  trainingId: string;
  completedLessons: string[];
  isCompleted: boolean;
  completedAt?: string | null;
  updatedAt: string;
}

export interface TrainingCategoryStats {
  category: string;
  totalTrainings: number;
  completedTrainings: number;
  completionRatePercent: number;
}

export interface TrainingReportSummary {
  totalTrainings: number;
  totalPublished: number;
  totalDrafts: number;
  totalLessons: number;
  totalUsers: number;
  totalCompletions: number;
  totalCertificates: number;
  categoryStats: TrainingCategoryStats[];
  recentCompletions: {
    userId: string;
    userName: string;
    trainingTitle: string;
    completedAt: string;
  }[];
}
