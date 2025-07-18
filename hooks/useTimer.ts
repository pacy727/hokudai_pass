'use client';

import { useEffect, useRef } from 'react';
import { useTimerStore } from '@/stores/timerStore';
import { RealtimeService } from '@/lib/db/realtime';
import { useAuthStore } from '@/stores/authStore';
import { Subject } from '@/types/study';

export const useTimer = () => {
  const timerStore = useTimerStore();
  const { user } = useAuthStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pauseStartTimeRef = useRef<number | null>(null);
  
  // タイマー開始
  const startTimer = async (subject: Subject) => {
    if (!user) return;
    
    const sessionId = `${user.uid}_${Date.now()}`;
    const startTime = Date.now();
    
    timerStore.startTimer(subject, sessionId);
    timerStore.setStartTime(startTime);
    
    // リアルタイム状況更新
    await RealtimeService.updateStudyStatus(user.uid, user.displayName, {
      isStudying: true,
      currentSubject: subject,
      currentContent: '',
      startTime: new Date(),
      studySessionId: sessionId
    });

    // アクティブタイマーを保存
    await RealtimeService.saveActiveTimer(user.uid, {
      sessionId,
      subject,
      startTime: new Date(),
      elapsedTime: 0
    });
  };
  
  // 一時停止
  const pauseTimer = () => {
    if (!timerStore.isRunning) return;
    
    pauseStartTimeRef.current = Date.now();
    timerStore.pauseTimer();
  };
  
  // 再開
  const resumeTimer = () => {
    if (!timerStore.isPaused) return;
    
    // 一時停止していた時間を累積
    if (pauseStartTimeRef.current) {
      const pauseDuration = Date.now() - pauseStartTimeRef.current;
      timerStore.addPausedTime(pauseDuration);
      pauseStartTimeRef.current = null;
    }
    
    timerStore.resumeTimer();
  };
  
  // タイマー停止
  const stopTimer = async () => {
    if (!user) return;
    
    // 最終的な経過時間を計算
    const finalElapsedTime = timerStore.elapsedTime;
    
    timerStore.stopTimer();
    
    // リアルタイム状況クリア
    await RealtimeService.clearStudyStatus(user.uid);
    
    // アクティブタイマーをクリア
    await RealtimeService.clearActiveTimer(user.uid);
    
    // 記録ページへのデータ準備
    const studyHours = Math.round((finalElapsedTime / 3600) * 100) / 100;
    const now = new Date();
    const startTime = new Date(now.getTime() - finalElapsedTime * 1000);
    
    return {
      subject: timerStore.subject,
      studyHours,
      startTime: startTime.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      endTime: now.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      studyDate: now.toISOString().split('T')[0]
    };
  };

  // タイマー復元
  const restoreTimer = async () => {
    if (!user) return;
    
    try {
      const activeTimer = await RealtimeService.getActiveTimer(user.uid);
      if (activeTimer) {
        const now = Date.now();
        const elapsed = Math.floor((now - activeTimer.startTime.getTime()) / 1000);
        
        timerStore.startTimer(activeTimer.subject, activeTimer.sessionId);
        timerStore.setStartTime(activeTimer.startTime.getTime());
        timerStore.updateElapsedTime(elapsed);
        
        // リアルタイム状況更新
        await RealtimeService.updateStudyStatus(user.uid, user.displayName, {
          isStudying: true,
          currentSubject: activeTimer.subject,
          currentContent: '',
          startTime: activeTimer.startTime,
          studySessionId: activeTimer.sessionId
        });
      }
    } catch (error) {
      console.error('Failed to restore timer:', error);
    }
  };
  
  // タイマー更新処理
  useEffect(() => {
    if (timerStore.isRunning && !timerStore.isPaused) {
      intervalRef.current = setInterval(() => {
        if (timerStore.startTime) {
          const now = Date.now();
          const rawElapsed = Math.floor((now - timerStore.startTime) / 1000);
          const adjustedElapsed = Math.max(0, rawElapsed - Math.floor(timerStore.totalPausedTime / 1000));
          timerStore.updateElapsedTime(adjustedElapsed);
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerStore.isRunning, timerStore.isPaused, timerStore.startTime, timerStore.totalPausedTime]);

  // 初回ロード時にタイマー復元
  useEffect(() => {
    if (user && !timerStore.isRunning && !timerStore.isPaused && timerStore.elapsedTime === 0) {
      restoreTimer();
    }
  }, [user]);
  
  return {
    ...timerStore,
    startTimer,
    stopTimer,
    pauseTimer,
    resumeTimer,
    restoreTimer,
    formatTime: (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };
};