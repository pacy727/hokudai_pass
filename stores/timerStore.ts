import { create } from 'zustand';
import { Subject } from '@/types/study';

interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  elapsedTime: number;
  subject: Subject | null;
  sessionId: string | null;
  startTime: Date | null;
  pausedTime: number;
  
  // Actions
  startTimer: (subject: Subject, sessionId: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  updateElapsedTime: (time: number) => void;
  resetTimer: () => void;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  isRunning: false,
  isPaused: false,
  elapsedTime: 0,
  subject: null,
  sessionId: null,
  startTime: null,
  pausedTime: 0,
  
  startTimer: (subject, sessionId) => set({
    isRunning: true,
    isPaused: false,
    subject,
    sessionId,
    startTime: new Date(),
    elapsedTime: 0,
    pausedTime: 0
  }),
  
  pauseTimer: () => set((state) => ({
    isPaused: true,
    isRunning: false,
    pausedTime: state.pausedTime + (Date.now() - (state.startTime?.getTime() || 0)) / 1000
  })),
  
  resumeTimer: () => set({
    isPaused: false,
    isRunning: true,
    startTime: new Date()
  }),
  
  stopTimer: () => set({
    isRunning: false,
    isPaused: false
  }),
  
  updateElapsedTime: (time) => set({ elapsedTime: time }),
  
  resetTimer: () => set({
    isRunning: false,
    isPaused: false,
    elapsedTime: 0,
    subject: null,
    sessionId: null,
    startTime: null,
    pausedTime: 0
  })
}));
