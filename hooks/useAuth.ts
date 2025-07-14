import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, collections } from '@/lib/firebase';
import { useAuthStore } from '@/stores/authStore';
import { User } from '@/types/auth';

export const useAuth = () => {
  const { user, isLoading, error, setUser, setLoading, setError } = useAuthStore();
  
  useEffect(() => {
    setLoading(true);
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // ユーザー情報をFirestoreから取得
          const userDoc = await getDoc(doc(db, collections.users, firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName || userData.displayName,
              photoURL: firebaseUser.photoURL,
              createdAt: userData.createdAt?.toDate() || new Date(),
              role: userData.role || 'student',
              grade: userData.grade,
              targetUniversity: userData.targetUniversity || '',
              studyGoal: userData.studyGoal || {
                totalHours: 1500,
                dailyHours: 8,
                subjects: {
                  数学: 400,
                  英語: 350,
                  国語: 300,
                  理科: 350,
                  社会: 250
                }
              }
            } as User);
          } else {
            // 新規ユーザーの場合、基本情報のみ設定
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName || 'ユーザー',
              photoURL: firebaseUser.photoURL,
              createdAt: new Date(),
              role: 'student',
              targetUniversity: '',
              studyGoal: {
                totalHours: 1500,
                dailyHours: 8,
                subjects: {
                  数学: 400,
                  英語: 350,
                  国語: 300,
                  理科: 350,
                  社会: 250
                }
              }
            } as User);
          }
        } else {
          setUser(null);
        }
        setError(null);
      } catch (err) {
        console.error('Auth error:', err);
        setError(err instanceof Error ? err.message : 'Authentication error');
      } finally {
        setLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, [setUser, setLoading, setError]);
  
  return { user, isLoading, error };
};
