import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  getDoc,
  getDocs, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy,
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db, collections } from '../firebase';
import { RealtimeStudyStatus, StudyDeclaration } from '@/types/realtime';

export class RealtimeService {
  // 宣言にリアクション追加
  static async addReactionToDeclaration(
    declarationId: string, 
    userId: string, 
    emoji: string
  ): Promise<void> {
    const docRef = doc(db, collections.declarations, declarationId);
    await updateDoc(docRef, {
      [`reactions.${userId}`]: emoji,
      updatedAt: Timestamp.now()
    });
  }

  // 宣言完了更新
  static async completeDeclaration(
    declarationId: string, 
    actualHours: number
  ): Promise<void> {
    const docRef = doc(db, collections.declarations, declarationId);
    await updateDoc(docRef, {
      completed: true,
      actualHours,
      updatedAt: Timestamp.now()
    });
  }

  // アクティブなタイマー保存
  static async saveActiveTimer(
    userId: string, 
    timerData: {
      sessionId: string;
      subject: string;
      startTime: Date;
      elapsedTime: number;
    }
  ): Promise<void> {
    const docRef = doc(db, collections.activeTimers, userId);
    await setDoc(docRef, {
      ...timerData,
      startTime: Timestamp.fromDate(timerData.startTime),
      lastUpdated: Timestamp.now()
    });
  }

  // アクティブなタイマー取得
  static async getActiveTimer(userId: string): Promise<any | null> {
    const docRef = doc(db, collections.activeTimers, userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        ...data,
        startTime: data.startTime.toDate(),
        lastUpdated: data.lastUpdated.toDate()
      };
    }
    return null;
  }

  // アクティブなタイマー削除
  static async clearActiveTimer(userId: string): Promise<void> {
    const docRef = doc(db, collections.activeTimers, userId);
    await deleteDoc(docRef);
  }
} 学習状況更新
  static async updateStudyStatus(
    userId: string, 
    userName: string, 
    status: Partial<RealtimeStudyStatus>
  ): Promise<void> {
    const docRef = doc(db, collections.realtimeStatus, userId);
    await setDoc(docRef, {
      userId,
      userName,
      lastActivity: Timestamp.now(),
      ...status
    }, { merge: true });
  }

  // 学習状況クリア
  static async clearStudyStatus(userId: string): Promise<void> {
    const docRef = doc(db, collections.realtimeStatus, userId);
    await updateDoc(docRef, {
      isStudying: false,
      currentSubject: '',
      currentContent: '',
      lastActivity: Timestamp.now()
    });
  }

  // リアルタイム学習状況監視
  static subscribeToStudyStatuses(
    callback: (statuses: RealtimeStudyStatus[]) => void
  ): () => void {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const q = query(
      collection(db, collections.realtimeStatus),
      where('lastActivity', '>', Timestamp.fromDate(fiveMinutesAgo))
    );
    
    return onSnapshot(q, (snapshot) => {
      const statuses = snapshot.docs.map(doc => ({
        ...doc.data(),
        startTime: doc.data().startTime?.toDate(),
        lastActivity: doc.data().lastActivity.toDate()
      })) as RealtimeStudyStatus[];
      
      callback(statuses);
    });
  }

  // 学習宣言投稿
  static async postDeclaration(declaration: Omit<StudyDeclaration, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, collections.declarations), {
      ...declaration,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  }

  // 今日の宣言取得
  static async getTodayDeclarations(): Promise<StudyDeclaration[]> {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const q = query(
      collection(db, collections.declarations),
      where('createdAt', '>=', Timestamp.fromDate(todayStart)),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    })) as StudyDeclaration[];
  }

  //
