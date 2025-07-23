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
  // 学習状況更新
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

  // 学習宣言投稿（簡素化 + TTL設定）
  static async postDeclaration(declaration: Omit<StudyDeclaration, 'id' | 'createdAt'>): Promise<string> {
    const now = Timestamp.now();
    // 1か月後の日時を計算（TTL用）
    const oneMonthLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    const docRef = await addDoc(collection(db, collections.declarations), {
      ...declaration,
      createdAt: now,
      // TTL: 1か月後に自動削除（Firestoreの機能を利用）
      ttl: Timestamp.fromDate(oneMonthLater)
    });
    return docRef.id;
  }

  // 今日の宣言取得（1か月以内のもののみ）
  static async getTodayDeclarations(): Promise<StudyDeclaration[]> {
    // 1か月前の日時を計算
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const q = query(
      collection(db, collections.declarations),
      where('createdAt', '>=', Timestamp.fromDate(oneMonthAgo)),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    })) as StudyDeclaration[];
  }

  // 期限切れ宣言の手動削除（バックアップ機能）
  static async cleanupExpiredDeclarations(): Promise<void> {
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const q = query(
      collection(db, collections.declarations),
      where('createdAt', '<', Timestamp.fromDate(oneMonthAgo))
    );
    
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    
    await Promise.all(deletePromises);
    console.log(`Deleted ${snapshot.docs.length} expired declarations`);
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
}