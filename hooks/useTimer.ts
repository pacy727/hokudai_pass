import { useEffect, useRef } from 'react';
import { useTimerStore } from '@/stores/timerStore';
import { RealtimeService } from '@/lib/db/realtime';
import { useAuthStore } from '@/stores/authStore';
import { Subject } from '@/types/study';

export const useTimer = () => {
  const timerStore = useTimerStore();
  const { user } = useAuthStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // タイマー開始
  const startTimer = async (subject: Subject) => {
    if (!user) return;
    
    const sessionId = `${user.uid}_${Date.now()}`;
    timerStore.startTimer(subject, sessionId);
    
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
  
  // タイマー停止
  const stopTimer = async () => {
    if (!user) return;
    
    timerStore.stopTimer();
    
    // リアルタイム状況クリア
    await RealtimeService.clearStudyStatus(user.uid);
    
    // アクティブタイマーをクリア
    await RealtimeService.clearActiveTimer(user.uid);
    
    // 記録ページへのデータ準備
    const { elapsedTime, subject, startTime } = timerStore.getState();
    const studyHours = Math.round((elapsedTime / 3600) * 100) / 100;
    const endTime = new Date();
    
    return {
      subject,
      studyHours,
      startTime: startTime?.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      endTime: endTime.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      studyDate: new Date().toISOString().split('T')[0]
    };
  };

  // タイマー復元
  const restoreTimer = async () => {
    if (!user) return;
    
    try {
      const activeTimer = await RealtimeService.getActiveTimer(user.uid);
      if (activeTimer) {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - activeTimer.startTime.getTime()) / 1000);
        
        timerStore.startTimer(activeTimer.subject, activeTimer.sessionId);
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
  
  // タイマー更新
  useEffect(() => {
    if (timerStore.isRunning && !timerStore.isPaused) {
      intervalRef.current = setInterval(() => {
        const elapsed = timerStore.startTime 
          ? Math.floor((Date.now() - timerStore.startTime.getTime()) / 1000) - timerStore.pausedTime
          : 0;
        timerStore.updateElapsedTime(elapsed);
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
      }
    };
  }, [timerStore.isRunning, timerStore.isPaused, timerStore.startTime, timerStore.pausedTime]);

  // 初回ロード時にタイマー復元
  useEffect(() => {
    if (user && !timerStore.isRunning && !timerStore.isPaused) {
      restoreTimer();
    }
  }, [user]);
  
  return {
    ...timerStore,
    startTimer,
    stopTimer,
    restoreTimer,
    formatTime: (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };
};
