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
  
  const postDeclaration = async (
    declaration: string, 
    subject: Subject, 
    hours: number, 
    startTime: string
  ) => {
    try {
      if (!user) throw new Error('User not authenticated');
      
      const id = await RealtimeService.postDeclaration({
        userId: user.uid,
        userName: user.displayName,
        declaration,
        plannedSubject: subject,
        plannedHours: hours,
        plannedStartTime: startTime,
        completed: false,
        actualHours: 0,
        reactions: {}
      });
      
      // 即座に更新
      const newDeclaration: StudyDeclaration = {
        id,
        userId: user.uid,
        userName: user.displayName,
        declaration,
        plannedSubject: subject,
        plannedHours: hours,
        plannedStartTime: startTime,
        completed: false,
        actualHours: 0,
        reactions: {},
        createdAt: new Date()
      };
      
      setDeclarations(prev => [newDeclaration, ...prev]);
      return id;
    } catch (error) {
      console.error('Failed to post declaration:', error);
      throw error;
    }
  };

  const addReaction = async (declarationId: string, emoji: string) => {
    try {
      if (!user) throw new Error('User not authenticated');
      
      await RealtimeService.addReactionToDeclaration(declarationId, user.uid, emoji);
      
      // ローカル状態を更新
      setDeclarations(prev => 
        prev.map(declaration =>
          declaration.id === declarationId
            ? {
                ...declaration,
                reactions: {
                  ...declaration.reactions,
                  [user.uid]: emoji
                }
              }
            : declaration
        )
      );
    } catch (error) {
      console.error('Failed to add reaction:', error);
      throw error;
    }
  };

  const completeDeclaration = async (declarationId: string, actualHours: number) => {
    try {
      await RealtimeService.completeDeclaration(declarationId, actualHours);
      
      // ローカル状態を更新
      setDeclarations(prev =>
        prev.map(declaration =>
          declaration.id === declarationId
            ? {
                ...declaration,
                completed: true,
                actualHours
              }
            : declaration
        )
      );
    } catch (error) {
      console.error('Failed to complete declaration:', error);
      throw error;
    }
  };
  
  return { 
    declarations, 
    isLoading, 
    postDeclaration, 
    addReaction,
    completeDeclaration 
  };
};
