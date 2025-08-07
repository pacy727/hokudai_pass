export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  role: 'student' | 'teacher' | 'admin';
  grade: '1学年' | '2学年' | '3学年' | 'その他'; // 学年を必須に変更し、選択肢を明確化
  targetUniversity: string;
  studyGoal: {
    totalHours: number;
    dailyHours: number;
    subjects: Record<string, number>;
  };
  // 新規追加項目
  course: 'liberal' | 'science'; // 文系/理系
  weeklyTarget: number; // 週間目標時間
  customSubjects: {
    社会1?: string;
    社会2?: string;
    理科?: string;  // 文系用
    理科1?: string; // 理系用
    理科2?: string; // 理系用・文系追加用
  };
  // 科目選択設定
  subjectSelection: {
    enableSecondScience?: boolean; // 文系で理科2科目選択
    enableSecondSocial?: boolean;  // 理系で社会2科目選択
  };
  // 復習問題の理解度統計（新規追加）
  reviewStats?: {
    totalReviewsCompleted: number; // 完了した復習回数
    totalUnderstandingScore: number; // 理解度スコア合計
    averageUnderstanding: number; // 平均理解度
    lastCalculatedAt: Date; // 最終計算日時
  };
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
  targetUniversity: string;
  grade: '1学年' | '2学年' | '3学年' | 'その他'; // 学年を必須に
  course?: 'liberal' | 'science';
}

export interface UserSettings {
  displayName: string;
  grade: '1学年' | '2学年' | '3学年' | 'その他'; // 学年設定を追加
  course: 'liberal' | 'science';
  weeklyTarget: number;
  customSubjects: {
    社会1?: string;
    社会2?: string;
    理科?: string;  // 文系用
    理科1?: string; // 理系用
    理科2?: string; // 理系用・文系追加用
  };
  subjectSelection: {
    enableSecondScience?: boolean; // 文系で理科2科目選択
    enableSecondSocial?: boolean;  // 理系で社会2科目選択
  };
}