export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  role: 'student' | 'teacher' | 'admin';
  grade?: string;
  targetUniversity: string;
  studyGoal: {
    totalHours: number;
    dailyHours: number;
    subjects: Record<string, number>;
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
  grade?: string;
}
