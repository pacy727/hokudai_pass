"use client"

import { useEffect, useState } from 'react';
import { RealtimeService } from '@/lib/db/realtime';
import { RealtimeStudyStatus, StudyDeclaration } from '@/types/realtime';
import { Subject } from '@/types/study';
import { useAuthStore } from '@/stores/authStore';

export const useRealtimeStudyStatus = () => {
  const [statuses, setStatuses] = useState<RealtimeStudyStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const unsubscribe = RealtimeService.subscribeToStudyStatuses((newStatuses) => {
      setStatuses(newStatuses);
      setIsLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  return { statuses, isLoading };
};

export const useDeclarations = () => {
  const [declarations, setDeclarations] = useState<StudyDeclaration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();
  
  useEffect(() => {
    const loadDeclarations = async () => {
      try {
        const todayDeclarations = await RealtimeService.getTodayDeclarations();
        setDeclarations(todayDeclarations);
      } catch (error) {
        console.error('Failed to load declarations:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDeclarations();
    
    // 5分ごとに更新
    const interval = setInterval(loadDeclarations, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  const postDeclaration = async (declaration: string) => {
    try {
      if (!user) throw new Error('User not authenticated');
      
      const id = await RealtimeService.postDeclaration({
        userId: user.uid,
        userName: user.displayName,
        declaration,
        plannedSubject: '数学', // ダミー値（使用されない）
        plannedHours: 0, // ダミー値（使用されない）
        plannedStartTime: '', // ダミー値（使用されない）
        completed: false, // ダミー値（使用されない）
        actualHours: 0, // ダミー値（使用されない）
        reactions: {} // ダミー値（使用されない）
      });
      
      // 即座に更新
      const newDeclaration: StudyDeclaration = {
        id,
        userId: user.uid,
        userName: user.displayName,
        declaration,
        plannedSubject: '数学', // ダミー値
        plannedHours: 0, // ダミー値
        plannedStartTime: '', // ダミー値
        completed: false, // ダミー値
        actualHours: 0, // ダミー値
        reactions: {}, // ダミー値
        createdAt: new Date()
      };
      
      setDeclarations(prev => [newDeclaration, ...prev]);
      return id;
    } catch (error) {
      console.error('Failed to post declaration:', error);
      throw error;
    }
  };
  
  return { 
    declarations, 
    isLoading, 
    postDeclaration
  };
};