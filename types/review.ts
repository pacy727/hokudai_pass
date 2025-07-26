import { Subject } from './study';

// 拡張されたStudyRecord型（既存のStudyRecord型を拡張）
export interface StudyRecord {
  id: string;
  userId: string;
  studyDate: string; // YYYY-MM-DD
  subject: Subject;
  studyHours: number;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  content: string;
  details?: string;
  memo?: string;
  createdAt: Date;
  sessionId?: string; // タイマー連携用
  shouldReview?: boolean; // 復習リスト登録フラグ（新規追加）
  requestReviewQuestions?: boolean; // 復習問題リクエストフラグ（新規追加）
}

// 復習問題リクエスト（新規追加）
export interface ReviewQuestionRequest {
  id: string;
  userId: string;
  userName: string;
  studyRecordId: string;
  subject: Subject;
  unit: string; // 単元名
  content: string; // 学習内容
  details?: string; // 詳細
  memo?: string; // メモ
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
  adminResponse?: string; // 管理者からの応答メッセージ
  assignedQuestions?: ReviewQuestionAssignment[]; // 割り当てられた問題
}

// 復習問題割り当て（新規追加）
export interface ReviewQuestionAssignment {
  stage: ReviewStage; // 復習段階（1-5）
  questionId: string;
  question: ReviewQuestion;
  createdAt: Date;
}

// 復習段階
export type ReviewStage = 1 | 2 | 3 | 4 | 5;

// 復習進捗
export interface ReviewProgress {
  stage: ReviewStage;
  scheduledDate: Date;
  completedDate?: Date;
  understanding?: number; // 0-100
  isCompleted: boolean;
  isOverdue: boolean;
}

// 復習アイテム（簡素化版）
export type ReviewItem = {
    id: string;
    userId: string;
    subject: string;
    unit: string;
    content: string;
    studyRecordId: string;
    progress: any[]; // 必要に応じて型を詳細化
    currentStage: number;
    isCompleted: boolean;
    reviewDate: Date; // ← これを追加
    createdAt: Date;
    updatedAt: Date;
    nextReviewDate: Date;      // ← 追加
    lastReviewDate?: Date;     // ← 追加（任意なら ? を付ける）
    // 他の必要なプロパティ
  };

// 復習問題
export interface ReviewQuestion {
  id: string;
  reviewItemId?: string; // 復習アイテムID（リクエストから作成された場合は空の場合もある）
  reviewQuestionRequestId?: string; // 復習問題リクエストID（新規追加）
  teacherId: string; // 登録した教員ID
  teacherName: string; // 教員名
  subject: Subject;
  unit: string;
  title: string; // 問題タイトル
  content: string; // 問題内容
  type: 'multiple_choice' | 'text' | 'calculation' | 'essay'; // 問題タイプ
  options?: string[]; // 選択肢（選択問題の場合）
  answer?: string; // 正解（参考用）
  explanation?: string; // 解説
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: number; // 推定解答時間（分）
  targetStage: ReviewStage; // 対象復習段階（新規追加）
  createdAt: Date;
  updatedAt: Date;
}

// 復習結果
export interface ReviewResult {
  id: string;
  userId: string;
  reviewItemId: string;
  questionId: string;
  result: 'success' | 'failure'; // できた/できなかった
  timeSpent: number; // 所要時間（秒）
  feedback?: string; // 学習者のフィードバック
  createdAt: Date;
  stage: ReviewStage; // ← これを追加
  understanding: number; // ← これを追加
}

// 学習ログ
export interface StudyLog {
  id: string;
  userId: string;
  subject: Subject;
  unit: string; // 単元
  content: string; // 内容
  studyType: 'lecture' | 'practice' | 'review' | 'test'; // 学習タイプ
  duration: number; // 学習時間（分）
  understanding: 'excellent' | 'good' | 'fair' | 'poor'; // 理解度
  notes?: string; // メモ
  studyDate: Date; // 学習日
  createdAt: Date;
}

// 復習スケジュール設定
export interface ReviewSchedule {
  intervals: number[]; // 復習間隔（日数）例: [1, 3, 7, 14, 30]
  maxReviews: number; // 最大復習回数
  priorityWeights: {
    high: number;
    medium: number;
    low: number;
  };
  stages: {
    stage: ReviewStage;
    days: number;
    name: string;
  }[];
}

// 学習進捗サマリー
export interface StudyProgress {
  subject: Subject;
  totalUnits: number; // 総単元数
  completedUnits: number; // 完了単元数
  pendingReviews: number; // 未完了復習数
  overdueReviews: number; // 期限切れ復習数
  averageUnderstanding: number; // 平均理解度
  totalStudyTime: number; // 総学習時間
  lastStudyDate?: Date; // 最終学習日
}

// 本日のタスク
export interface TodayTask {
  reviewItem: ReviewItem;
  stage: ReviewStage;
  scheduledDate: Date;
  isOverdue: boolean;
  daysPastDue?: number;
}