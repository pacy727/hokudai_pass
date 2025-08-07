"use client"

import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, collections } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';
import { User } from '@/types/auth';
import { ReviewStatsService } from '@/lib/db/reviewStatsService';

// グローバル変数で初期化を管理（React Strict Mode 対応）
let authInitialized = false;
let authUnsubscribe: (() => void) | null = null;

export const useAuth = () => {
  const store = useAuthStore();
  
  useEffect(() => {
    // 既に初期化済みなら何もしない
    if (authInitialized) {
      console.log('🔄 Auth already initialized, skipping');
      return;
    }
    
    console.log('🚀 useAuth: GLOBAL initialization');
    authInitialized = true;
    
    // 5秒後のタイムアウト設定
    const timeout = setTimeout(() => {
      console.log('⏰ Auth timeout - forcing loading false');
      store.setLoading(false);
    }, 5000);
    
    store.setLoading(true);
    
    authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔍 onAuthStateChanged triggered, user exists:', !!firebaseUser);
      clearTimeout(timeout); // タイムアウトをクリア
      
      if (firebaseUser) {
        console.log('✅ User found, fetching user data from Firestore');
        
        try {
          // Firestoreからユーザー設定を取得
          const userDoc = await getDoc(doc(db, collections.users, firebaseUser.uid));
          
          let basicUser: User;
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('📄 User data from Firestore:', userData);
            
            // 復習統計の更新（バックグラウンドで実行）
            ReviewStatsService.updateUserReviewStats(firebaseUser.uid).catch(error => {
              console.warn('⚠️ Failed to update review stats:', error);
            });
            
            // Firestoreのデータを使用
            basicUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: userData.displayName || firebaseUser.displayName || 'ユーザー',
              photoURL: firebaseUser.photoURL || undefined,
              createdAt: userData.createdAt?.toDate() || new Date(),
              role: userData.role || 'student',
              grade: userData.grade || 'その他', // 学年をデフォルト値で設定
              targetUniversity: userData.targetUniversity || '北海道大学',
              studyGoal: userData.studyGoal || {
                totalHours: 1500,
                dailyHours: 8,
                subjects: {
                  英語: 350,
                  数学: 400,
                  国語: 300,
                  情報: 200,
                  理科: 350
                }
              },
              // 設定項目（デフォルト値付き）
              course: userData.course || 'science',
              weeklyTarget: userData.weeklyTarget || 56,
              customSubjects: userData.customSubjects || {},
              subjectSelection: userData.subjectSelection || {},
              // 復習統計（新規追加）
              reviewStats: userData.reviewStats ? {
                totalReviewsCompleted: userData.reviewStats.totalReviewsCompleted || 0,
                totalUnderstandingScore: userData.reviewStats.totalUnderstandingScore || 0,
                averageUnderstanding: userData.reviewStats.averageUnderstanding || 0,
                lastCalculatedAt: userData.reviewStats.lastCalculatedAt?.toDate() || new Date()
              } : {
                totalReviewsCompleted: 0,
                totalUnderstandingScore: 0,
                averageUnderstanding: 0,
                lastCalculatedAt: new Date()
              }
            };
          } else {
            console.log('⚠️ No user document found, creating default user');
            // 新規ユーザーの場合のデフォルト
            basicUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName || 'ユーザー',
              photoURL: firebaseUser.photoURL || undefined,
              createdAt: new Date(),
              role: 'student',
              grade: 'その他', // デフォルト学年
              targetUniversity: '北海道大学',
              studyGoal: {
                totalHours: 1500,
                dailyHours: 8,
                subjects: {
                  英語: 350,
                  数学: 400,
                  国語: 300,
                  情報: 200,
                  理科: 350
                }
              },
              course: 'science',
              weeklyTarget: 56,
              customSubjects: {},
              subjectSelection: {},
              // 復習統計の初期化
              reviewStats: {
                totalReviewsCompleted: 0,
                totalUnderstandingScore: 0,
                averageUnderstanding: 0,
                lastCalculatedAt: new Date()
              }
            };
          }
          
          console.log('✅ Final user data:', basicUser);
          store.setUser(basicUser);
          store.setError(null);
          
        } catch (error) {
          console.error('❌ Error fetching user data:', error);
          store.setError('ユーザー情報の取得に失敗しました');
          store.setUser(null);
        }
      } else {
        console.log('❌ No user found - user not logged in');
        store.setUser(null);
        store.setError(null);
      }
      
      store.setLoading(false);
      console.log('✅ Auth check completed');
    });
    
    console.log('🎯 Auth listener set up');
    
    return () => {
      // クリーンアップは何もしない（グローバル管理のため）
      console.log('🧹 useAuth cleanup (no-op)');
    };
  }, []); // 依存関係なし
  
  console.log('📊 useAuth state:', { 
    hasUser: !!store.user, 
    isLoading: store.isLoading,
    hasError: !!store.error 
  });
  
  return {
    user: store.user,
    isLoading: store.isLoading,
    error: store.error
  };
};