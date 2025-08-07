import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, collections } from '../firebase';
import { StudyRecord, Subject, ChartData, StudyStats } from '@/types/study';
import { ReviewService } from './reviewService';

export class StudyRecordService {
  // 記録作成（分単位で保存）
  static async createRecord(record: Omit<StudyRecord, 'id' | 'createdAt'>): Promise<string> {
    // undefined除去処理
    const cleanRecord: any = {
      userId: record.userId,
      studyDate: record.studyDate,
      subject: record.subject,
      studyMinutes: record.studyMinutes, // 分単位で保存
      startTime: record.startTime,
      endTime: record.endTime,
      content: record.content,
      createdAt: Timestamp.now()
    };

    // 空でない場合のみ追加
    if (record.details && record.details.trim()) {
      cleanRecord.details = record.details.trim();
    }
    if (record.memo && record.memo.trim()) {
      cleanRecord.memo = record.memo.trim();
    }
    if (record.sessionId) {
      cleanRecord.sessionId = record.sessionId;
    }
    
    // 復習リスト登録フラグを保存
    if (record.shouldReview !== undefined) {
      cleanRecord.shouldReview = record.shouldReview;
    }

    // 復習問題リクエストフラグを保存（新規追加）
    if (record.requestReviewQuestions !== undefined) {
      cleanRecord.requestReviewQuestions = record.requestReviewQuestions;
    }

    console.log('Creating study record:', cleanRecord);

    const docRef = await addDoc(collection(db, collections.studyRecords), cleanRecord);
    
    // 復習リスト登録フラグがtrueの場合、復習アイテムを自動生成
    if (record.shouldReview) {
      try {
        const studyRecordWithId = {
          ...cleanRecord,
          id: docRef.id,
          createdAt: new Date()
        };
        
        console.log('Creating review item from study record...');
        await ReviewService.createReviewItemFromStudyRecord(studyRecordWithId);
        console.log('Review item created successfully');
      } catch (error) {
        console.error('Error creating review item:', error);
        // 復習アイテム作成に失敗しても、学習記録の保存は成功とする
      }
    }
    
    return docRef.id;
  }

  // 🆕 記録更新
  static async updateRecord(recordId: string, updates: Partial<StudyRecord>): Promise<void> {
    try {
      console.log('🔄 Updating study record:', recordId, updates);

      // undefined除去処理
      const cleanUpdates: any = {
        updatedAt: Timestamp.now()
      };

      // 定義されている値のみ追加
      if (updates.studyDate !== undefined) cleanUpdates.studyDate = updates.studyDate;
      if (updates.subject !== undefined) cleanUpdates.subject = updates.subject;
      if (updates.studyMinutes !== undefined) cleanUpdates.studyMinutes = updates.studyMinutes;
      if (updates.startTime !== undefined) cleanUpdates.startTime = updates.startTime;
      if (updates.endTime !== undefined) cleanUpdates.endTime = updates.endTime;
      if (updates.content !== undefined) cleanUpdates.content = updates.content.trim();
      
      // 空文字列の場合は削除、値がある場合は更新
      if (updates.details !== undefined) {
        if (updates.details.trim()) {
          cleanUpdates.details = updates.details.trim();
        } else {
          cleanUpdates.details = null; // Firestoreでフィールドを削除
        }
      }
      
      if (updates.memo !== undefined) {
        if (updates.memo.trim()) {
          cleanUpdates.memo = updates.memo.trim();
        } else {
          cleanUpdates.memo = null; // Firestoreでフィールドを削除
        }
      }

      if (updates.shouldReview !== undefined) cleanUpdates.shouldReview = updates.shouldReview;
      if (updates.requestReviewQuestions !== undefined) cleanUpdates.requestReviewQuestions = updates.requestReviewQuestions;

      const docRef = doc(db, collections.studyRecords, recordId);
      await updateDoc(docRef, cleanUpdates);
      
      console.log('✅ Study record updated successfully');
    } catch (error) {
      console.error('❌ Error updating study record:', error);
      throw error;
    }
  }

  // 🆕 記録削除
  static async deleteRecord(recordId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting study record:', recordId);
      
      const docRef = doc(db, collections.studyRecords, recordId);
      await deleteDoc(docRef);
      
      console.log('✅ Study record deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting study record:', error);
      throw error;
    }
  }

  // 🆕 単一記録取得
  static async getRecordById(recordId: string): Promise<StudyRecord | null> {
    try {
      console.log('🔍 Fetching record by ID:', recordId);
      
      const q = query(
        collection(db, collections.studyRecords),
        where('__name__', '==', recordId)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('⚠️ Record not found');
        return null;
      }
      
      const doc = snapshot.docs[0];
      const data = doc.data();
      
      const record = {
        id: doc.id,
        ...data,
        studyMinutes: data.studyMinutes || (data.studyHours ? data.studyHours * 60 : 0),
        createdAt: data.createdAt?.toDate() || new Date()
      } as StudyRecord;
      
      console.log('✅ Record found:', record);
      return record;
    } catch (error) {
      console.error('❌ Error fetching record by ID:', error);
      return null;
    }
  }

  // ユーザーの記録取得（シンプルクエリ）
  static async getRecordsByUser(userId: string, limitCount?: number): Promise<StudyRecord[]> {
    try {
      console.log('🔍 Fetching records for user:', userId);
      
      // シンプルなクエリでインデックス不要
      const q = query(
        collection(db, collections.studyRecords),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      console.log('📄 Raw documents count:', snapshot.docs.length);
      
      const records = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // データベースの値を使用（分単位）
          studyMinutes: data.studyMinutes || (data.studyHours ? data.studyHours * 60 : 0), // 互換性のため
          createdAt: data.createdAt?.toDate() || new Date()
        };
      }) as StudyRecord[];

      console.log('📝 Parsed records:', records.length);

      // クライアントサイドでソート
      const sortedRecords = records.sort((a, b) => {
        if (a.studyDate !== b.studyDate) {
          return b.studyDate.localeCompare(a.studyDate);
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      if (limitCount && limitCount > 0) {
        return sortedRecords.slice(0, limitCount);
      }

      return sortedRecords;
    } catch (error) {
      console.error('❌ Error fetching records:', error);
      return [];
    }
  }

  // 復習リスト対象の記録取得
  static async getReviewRecords(userId: string): Promise<StudyRecord[]> {
    try {
      console.log('🔍 Fetching review records for user:', userId);
      
      const q = query(
        collection(db, collections.studyRecords),
        where('userId', '==', userId),
        where('shouldReview', '==', true)
      );
      
      const snapshot = await getDocs(q);
      console.log('📄 Review records count:', snapshot.docs.length);
      
      const records = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // データベースの値を使用（分単位）
          studyMinutes: data.studyMinutes || (data.studyHours ? data.studyHours * 60 : 0), // 互換性のため
          createdAt: data.createdAt?.toDate() || new Date()
        };
      }) as StudyRecord[];

      // 新しい順にソート
      return records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('❌ Error fetching review records:', error);
      return [];
    }
  }

  // 復習問題リクエスト対象の記録取得（新規追加）
  static async getRequestReviewQuestionRecords(userId: string): Promise<StudyRecord[]> {
    try {
      console.log('🔍 Fetching request review question records for user:', userId);
      
      const q = query(
        collection(db, collections.studyRecords),
        where('userId', '==', userId),
        where('requestReviewQuestions', '==', true)
      );
      
      const snapshot = await getDocs(q);
      console.log('📄 Request review question records count:', snapshot.docs.length);
      
      const records = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          studyMinutes: data.studyMinutes || (data.studyHours ? data.studyHours * 60 : 0),
          createdAt: data.createdAt?.toDate() || new Date()
        };
      }) as StudyRecord[];

      // 新しい順にソート
      return records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('❌ Error fetching request review question records:', error);
      return [];
    }
  }

  // 統計データ取得（月曜日開始週計算）
  static async getStudyStats(userId: string): Promise<StudyStats> {
    try {
      console.log('📊 Starting stats calculation for user:', userId);
      
      const records = await this.getRecordsByUser(userId);
      console.log('📈 Total records for stats:', records.length);
      
      if (records.length === 0) {
        console.log('⚠️ No records found, returning empty stats');
        return {
          totalHours: 0,
          weeklyHours: 0,
          subjectHours: {
            英語: 0,
            数学: 0,
            国語: 0,
            情報: 0,
            理科: 0,
            理科1: 0,
            理科2: 0,
            社会: 0,
            社会1: 0,
            社会2: 0
          },
          recentDays: []
        };
      }

      const now = new Date();
      
      // 今週の月曜日を計算（月曜日開始）
      const currentDay = now.getDay(); // 0=日曜日, 1=月曜日, ...
      const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
      const weekStartDate = new Date(now.getTime() - daysFromMonday * 24 * 60 * 60 * 1000);
      weekStartDate.setHours(0, 0, 0, 0);
      
      console.log('📅 Week start date (Monday):', weekStartDate.toISOString().split('T')[0]);

      // 総学習時間（分→時間に変換）
      const totalHours = records.reduce((sum, record) => {
        const minutes = record.studyMinutes || 0;
        const hours = minutes / 60;
        console.log(`Adding ${minutes}min (${hours.toFixed(2)}h) from ${record.studyDate} (${record.subject})`);
        return sum + hours;
      }, 0);
      
      console.log('⏰ Total hours calculated:', totalHours);

      // 今週の学習時間（月曜日〜日曜日）
      const weeklyRecords = records.filter(record => {
        const recordDate = new Date(record.studyDate + 'T00:00:00');
        const isThisWeek = recordDate >= weekStartDate;
        if (isThisWeek) {
          const hours = (record.studyMinutes || 0) / 60;
          console.log(`📅 Week record: ${record.studyDate} - ${record.studyMinutes}min (${hours.toFixed(2)}h)`);
        }
        return isThisWeek;
      });
      
      const weeklyHours = weeklyRecords.reduce((sum, record) => {
        const hours = (record.studyMinutes || 0) / 60;
        return sum + hours;
      }, 0);
      console.log('📅 Weekly hours:', weeklyHours, 'from', weeklyRecords.length, 'records');

      // 教科別学習時間（分→時間に変換）
      const subjectHours = records.reduce((acc, record) => {
        if (record.subject) {
          const hours = (record.studyMinutes || 0) / 60;
          acc[record.subject] = (acc[record.subject] || 0) + hours;
        }
        return acc;
      }, {} as Record<Subject, number>);
      
      console.log('📚 Subject hours:', subjectHours);

      // 過去7日分のデータ（分→時間に変換）
      const recentDays: ChartData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const dayRecords = records.filter(record => record.studyDate === dateStr);
        const dayMinutes = dayRecords.reduce((sum, record) => sum + (record.studyMinutes || 0), 0);
        const dayHours = dayMinutes / 60;
        
        recentDays.push({
          date: dateStr,
          hours: dayHours
        });
      }

      const result = {
        totalHours,
        weeklyHours,
        subjectHours,
        recentDays
      };

      console.log('✅ Final stats result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error calculating stats:', error);
      return {
        totalHours: 0,
        weeklyHours: 0,
        subjectHours: {
          英語: 0,
          数学: 0,
          国語: 0,
          情報: 0,
          理科: 0,
          理科1: 0,
          理科2: 0,
          社会: 0,
          社会1: 0,
          社会2: 0
        },
        recentDays: []
      };
    }
  }

  // 学習記録の検索（新規追加）
  static async searchRecords(userId: string, searchQuery: string): Promise<StudyRecord[]> {
    try {
      const allRecords = await this.getRecordsByUser(userId);
      
      if (!searchQuery.trim()) {
        return allRecords;
      }

      const query = searchQuery.toLowerCase().trim();
      
      return allRecords.filter(record => 
        record.content.toLowerCase().includes(query) ||
        (record.details && record.details.toLowerCase().includes(query)) ||
        record.subject.toLowerCase().includes(query) ||
        (record.memo && record.memo.toLowerCase().includes(query))
      );
    } catch (error) {
      console.error('❌ Error searching records:', error);
      return [];
    }
  }

  // 期間別記録取得（新規追加）
  static async getRecordsByDateRange(
    userId: string, 
    startDate: string, 
    endDate: string
  ): Promise<StudyRecord[]> {
    try {
      const allRecords = await this.getRecordsByUser(userId);
      
      return allRecords.filter(record => 
        record.studyDate >= startDate && record.studyDate <= endDate
      );
    } catch (error) {
      console.error('❌ Error fetching records by date range:', error);
      return [];
    }
  }

  // 教科別記録取得（新規追加）
  static async getRecordsBySubject(userId: string, subject: Subject): Promise<StudyRecord[]> {
    try {
      const allRecords = await this.getRecordsByUser(userId);
      
      return allRecords.filter(record => record.subject === subject);
    } catch (error) {
      console.error('❌ Error fetching records by subject:', error);
      return [];
    }
  }
}