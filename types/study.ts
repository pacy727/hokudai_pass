export type Subject = '数学' | '英語' | '国語' | '情報' | '理科' | '理科1' | '理科2' | '社会' | '社会1' | '社会2';

export interface StudyRecord {
  id: string;
  userId: string;
  studyDate: string; // YYYY-MM-DD
  subject: Subject;
  studyMinutes: number; // 分単位で保存
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  content: string;
  details?: string;
  memo?: string;
  createdAt: Date;
  sessionId?: string; // タイマー連携用
  shouldReview?: boolean; // 復習リスト登録フラグ
  requestReviewQuestions?: boolean; // 復習問題リクエストフラグ（新規追加）
}

export interface StudyGoal {
  userId: string;
  totalHours: number;
  subjects: Record<Subject, number>;
  weeklyTarget: number;
  dailyTarget: number;
  updatedAt: Date;
}

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  elapsedTime: number; // seconds
  subject: Subject | null;
  sessionId: string | null;
  startTime: Date | null;
  pausedTime: number;
}

export interface ChartData {
  date: string;
  hours: number;
  subject?: Subject;
}

export interface SubjectProgress {
  subject: Subject;
  currentHours: number;
  targetHours: number;
  percentage: number;
  isOnTrack: boolean;
  weeklyHours: number;
}

export interface StudyStats {
  totalHours: number;
  weeklyHours: number;
  subjectHours: Record<Subject, number>;
  recentDays: ChartData[];
}

// 学習記録の検索条件（新規追加）
export interface StudyRecordSearchParams {
  userId: string;
  query?: string;
  subject?: Subject;
  startDate?: string;
  endDate?: string;
  shouldReview?: boolean;
  requestReviewQuestions?: boolean;
}

// 学習記録の統計情報（新規追加）
export interface StudyRecordStats {
  totalRecords: number;
  totalStudyTime: number; // 分
  averageStudyTime: number; // 分
  subjectDistribution: Record<Subject, number>;
  reviewRequests: number;
  questionRequests: number;
  studyStreak: number; // 連続学習日数
}

// 月別学習データ（新規追加）
export interface MonthlyStudyData {
  year: number;
  month: number;
  totalHours: number;
  totalDays: number;
  subjectHours: Record<Subject, number>;
  averageDailyHours: number;
}

// 週別学習データ（新規追加）
export interface WeeklyStudyData {
  weekStartDate: string; // YYYY-MM-DD (月曜日)
  weekEndDate: string; // YYYY-MM-DD (日曜日)
  totalHours: number;
  dailyHours: number[]; // 月曜日から日曜日まで7日分
  subjectHours: Record<Subject, number>;
  targetHours: number;
  achievementRate: number; // 達成率（%）
}

// 学習セッション情報（新規追加）
export interface StudySession {
  id: string;
  userId: string;
  subject: Subject;
  startTime: Date;
  endTime?: Date;
  duration?: number; // 分
  isActive: boolean;
  sessionType: 'timer' | 'manual';
  content?: string;
  notes?: string;
}

// 学習目標設定（新規追加）
export interface StudyTarget {
  id: string;
  userId: string;
  targetType: 'daily' | 'weekly' | 'monthly' | 'total';
  subject?: Subject; // 全体目標の場合はundefined
  targetValue: number; // 時間（分）
  currentValue: number; // 現在の達成値（分）
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 学習レポート（新規追加）
export interface StudyReport {
  userId: string;
  reportType: 'daily' | 'weekly' | 'monthly';
  date: string; // YYYY-MM-DD または YYYY-MM または YYYY-W##
  totalStudyTime: number; // 分
  subjectBreakdown: Record<Subject, number>;
  targetAchievement: number; // 達成率（%）
  studyStreak: number;
  topSubject: Subject;
  recommendations: string[];
  generatedAt: Date;
}