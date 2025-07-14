import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  Timestamp 
} from 'firebase/firestore';
import { db, collections } from '../firebase';
import { StudyRecord, Subject, ChartData, StudyStats } from '@/types/study';

export class StudyRecordService {
  // 記録作成
  static async createRecord(record: Omit<StudyRecord, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, collections.studyRecords), {
      ...record,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  }

  // ユーザーの記録取得
  static async getRecordsByUser(userId: string, limitCount?: number): Promise<StudyRecord[]> {
    const constraints = [
      where('userId', '==', userId),
      orderBy('studyDate', 'desc'),
      orderBy('createdAt', 'desc')
    ];
    
    if (limitCount) {
      constraints.push(firestoreLimit(limitCount));
    }
    
    const q = query(collection(db, collections.studyRecords), ...constraints);
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    })) as StudyRecord[];
  }

  // 日別記録取得
  static async getRecordsByDate(userId: string, date: string): Promise<StudyRecord[]> {
    const q = query(
      collection(db, collections.studyRecords),
      where('userId', '==', userId),
      where('studyDate', '==', date),
      orderBy('startTime', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    })) as StudyRecord[];
  }

  // 統計データ取得
  static async getStudyStats(userId: string): Promise<StudyStats> {
    const records = await this.getRecordsByUser(userId);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const totalHours = records.reduce((sum, record) => sum + record.studyHours, 0);
    const weeklyRecords = records.filter(record => new Date(record.studyDate) >= weekAgo);
    const weeklyHours = weeklyRecords.reduce((sum, record) => sum + record.studyHours, 0);
    
    const subjectHours = records.reduce((acc, record) => {
      acc[record.subject] = (acc[record.subject] || 0) + record.studyHours;
      return acc;
    }, {} as Record<Subject, number>);
    
    // 過去7日分のデータ
    const recentDays: ChartData[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayRecords = records.filter(record => record.studyDate === dateStr);
      const dayHours = dayRecords.reduce((sum, record) => sum + record.studyHours, 0);
      
      recentDays.push({
        date: dateStr,
        hours: dayHours
      });
    }
    
    return {
      totalHours,
      weeklyHours,
      subjectHours,
      recentDays
    };
  }

  // 月間記録取得
  static async getRecordsByMonth(userId: string, year: number, month: number): Promise<StudyRecord[]> {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const q = query(
      collection(db, collections.studyRecords),
      where('userId', '==', userId),
      where('studyDate', '>=', startDateStr),
      where('studyDate', '<=', endDateStr),
      orderBy('studyDate', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    })) as StudyRecord[];
  }
}
