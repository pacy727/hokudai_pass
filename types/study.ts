export type Subject = '数学' | '英語' | '国語' | '理科' | '社会';

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
