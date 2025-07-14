import { Subject } from './study';

export interface RealtimeStudyStatus {
  userId: string;
  userName: string;
  isStudying: boolean;
  currentSubject: Subject;
  currentContent: string;
  startTime: Date;
  lastActivity: Date;
  studySessionId: string;
}

export interface StudyDeclaration {
  id: string;
  userId: string;
  userName: string;
  declaration: string;
  plannedSubject: Subject;
  plannedHours: number;
  plannedStartTime: string;
  createdAt: Date;
  completed: boolean;
  actualHours: number;
  reactions: Record<string, string>; // userId -> emoji
}

export interface GroupAlert {
  id: string;
  type: 'member_support' | 'achievement' | 'warning';
  targetUserId: string;
  targetUserName: string;
  message: string;
  priority: 1 | 2 | 3 | 4 | 5;
  createdAt: Date;
  responses: AlertResponse[];
}

export interface AlertResponse {
  userId: string;
  userName: string;
  message: string;
  createdAt: Date;
}
