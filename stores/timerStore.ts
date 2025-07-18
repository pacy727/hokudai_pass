"use client"

import { create } from 'zustand';
import { Subject } from '@/types/study';

interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  elapsedTime: number;
  subject: Subject | null;
  sessionId: string | null;
  startTime: number | null; // timestamp
  pausedTime: number;
  totalPausedTime: number; // 累積一時停止時間
  
  // Actions
  startTimer: (subject: Subject, sessionId: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  updateElapsedTime: (time: number) => void;
  resetTimer: () => void;
  setStartTime: (time: number) => void;
  addPausedTime: (time: number) => void;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  isRunning: false,
  isPaused: false,
  elapsedTime: 0,
  subject: null,
  sessionId: null,
  startTime: null,
  pausedTime: 0,
  totalPausedTime: 0,
  
  startTimer: (subject, sessionId) => set({
    isRunning: true,
    isPaused: false,
    subject,
    sessionId,
    elapsedTime: 0,
    pausedTime: 0,
    totalPausedTime: 0
  }),
  
  pauseTimer: () => set((state) => ({
    isPaused: true,
    isRunning: false
  })),
  
  resumeTimer: () => set({
    isPaused: false,
    isRunning: true
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
    pausedTime: 0,
    totalPausedTime: 0
  }),

  setStartTime: (time) => set({ startTime: time }),
  
  addPausedTime: (time) => set((state) => ({ 
    totalPausedTime: state.totalPausedTime + time 
  }))
}));