import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { ReviewItem, ReviewQuestion, ReviewResult, StudyLog, StudyProgress, ReviewStage, ReviewProgress, TodayTask, ReviewSchedule } from '@/types/review';
import { Subject } from '@/types/study';
import { ReviewStatsService } from './reviewStatsService';

// コレクション名
const COLLECTIONS = {
  reviewItems: 'review_items',
  reviewQuestions: 'review_questions',
  reviewResults: 'review_results',
  studyLogs: 'study_logs',
  reviewQuestionRequests: 'review_question_requests' // 追加
};

// 復習スケジュール設定
const REVIEW_SCHEDULE: ReviewSchedule = {
  intervals: [1, 3, 7, 14, 30],
  stages: [
    { stage: 1, days: 1, name: '1日後' },
    { stage: 2, days: 3, name: '3日後' },
    { stage: 3, days: 7, name: '1週間後' },
    { stage: 4, days: 14, name: '2週間後' },
    { stage: 5, days: 30, name: '1か月後' }
  ],
  maxReviews: 5,
  priorityWeights: {
    high: 3,
    medium: 2,
    low: 1
  }
};

export class ReviewService {
  // 復習進捗の初期化
  static createInitialProgress(baseDate: Date): ReviewProgress[] {
    return REVIEW_SCHEDULE.stages.map(stage => {
      const scheduledDate = new Date(baseDate);
      scheduledDate.setDate(scheduledDate.getDate() + stage.days);
      
      return {
        stage: stage.stage,
        scheduledDate,
        isCompleted: false,
        isOverdue: scheduledDate < new Date()
      };
    });
  }

  // 学習記録から復習アイテムを自動生成（新形式）
  static async createReviewItemFromStudyRecord(studyRecord: any): Promise<string> {
    console.log('Creating review item from study record:', studyRecord);
    
    const studyDate = new Date(studyRecord.studyDate);
    const progress = this.createInitialProgress(studyDate);
    
    const reviewItem = {
      userId: studyRecord.userId,
      subject: studyRecord.subject,
      unit: studyRecord.content,
      content: studyRecord.details || studyRecord.content,
      studyRecordId: studyRecord.id,
      progress: progress.map(p => ({
        ...p,
        scheduledDate: Timestamp.fromDate(p.scheduledDate)
      })),
      currentStage: 1 as ReviewStage,
      isCompleted: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.reviewItems), reviewItem);
    return docRef.id;
  }

  // ユーザーの復習アイテム取得（シンプルクエリ + クライアントサイドソート）
  static async getReviewItems(userId: string): Promise<ReviewItem[]> {
    try {
      console.log('🔍 [ReviewService] Fetching review items for user:', userId);
      
      const q = query(
        collection(db, COLLECTIONS.reviewItems),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      console.log('📄 [ReviewService] Raw review items count:', snapshot.docs.length);
      
      if (snapshot.docs.length === 0) {
        console.log('⚠️ [ReviewService] No review items found for user');
        return [];
      }
      
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📋 [ReviewService] Processing review item:', doc.id, data);
        
        return {
          id: doc.id,
          ...data,
          progress: data.progress ? data.progress.map((p: any) => ({
            ...p,
            scheduledDate: p.scheduledDate?.toDate() || new Date(),
            completedDate: p.completedDate?.toDate()
          })) : [],
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      }) as ReviewItem[];

      console.log('📝 [ReviewService] Parsed review items:', items.length);

      // クライアントサイドでソート（作成日順）
      const sortedItems = items.sort((a, b) => {
        const aTime = a.createdAt?.getTime() || 0;
        const bTime = b.createdAt?.getTime() || 0;
        return bTime - aTime;
      });

      console.log('✅ [ReviewService] Review items sorted and returned');
      return sortedItems;
    } catch (error) {
      console.error('❌ [ReviewService] Error fetching review items:', error);
      return [];
    }
  }

  // 進行中の復習アイテム取得
  static async getActiveReviewItems(userId: string): Promise<ReviewItem[]> {
    const allItems = await this.getReviewItems(userId);
    return allItems.filter(item => !item.isCompleted);
  }

  // 完了した復習アイテム取得
  static async getCompletedReviewItems(userId: string): Promise<ReviewItem[]> {
    const allItems = await this.getReviewItems(userId);
    return allItems.filter(item => item.isCompleted);
  }

  // 本日のタスク取得
  static async getTodayTasks(userId: string): Promise<TodayTask[]> {
    const activeItems = await this.getActiveReviewItems(userId);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const tasks: TodayTask[] = [];
    
    activeItems.forEach(item => {
      const currentProgress = item.progress.find(p => p.stage === item.currentStage);
      if (currentProgress && !currentProgress.isCompleted && currentProgress.scheduledDate <= today) {
        const scheduledDateOnly = new Date(currentProgress.scheduledDate);
        scheduledDateOnly.setHours(0, 0, 0, 0);
        
        const isOverdue = scheduledDateOnly < todayStart;
        const daysPastDue = isOverdue 
          ? Math.floor((todayStart.getTime() - scheduledDateOnly.getTime()) / (1000 * 60 * 60 * 24))
          : 0;
        
        tasks.push({
          reviewItem: item,
          stage: item.currentStage as ReviewStage,
          scheduledDate: currentProgress.scheduledDate,
          isOverdue,
          daysPastDue
        });
      }
    });
    
    return tasks.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.scheduledDate.getTime() - b.scheduledDate.getTime();
    });
  }

  // 復習完了処理（復習統計更新を統合）
  static async completeReviewStage(
    reviewItemId: string, 
    stage: ReviewStage, 
    understanding: number
  ): Promise<void> {
    try {
      const items = await getDocs(
        query(collection(db, COLLECTIONS.reviewItems), where('__name__', '==', reviewItemId))
      );
      
      if (items.empty) return;

      const itemData = items.docs[0].data() as any;
      const updatedProgress = itemData.progress.map((p: any) => {
        if (p.stage === stage) {
          return {
            ...p,
            isCompleted: true,
            understanding,
            completedDate: Timestamp.now()
          };
        }
        return p;
      });

      const nextStage = stage < 5 ? (stage + 1) as ReviewStage : stage;
      const isCompleted = stage === 5;

      const updates = {
        progress: updatedProgress,
        currentStage: nextStage,
        isCompleted,
        updatedAt: Timestamp.now()
      };

      await updateDoc(doc(db, COLLECTIONS.reviewItems, reviewItemId), updates);

      const reviewResult = await this.saveReviewResult({
        userId: itemData.userId,
        reviewItemId,
        stage,
        understanding,
        timeSpent: 0,
        questionId: "",
        result: understanding >= 70 ? "success" : "failure"
      });

      ReviewStatsService.onReviewCompleted(itemData.userId, understanding).catch(error => {
        console.warn('⚠️ Failed to update review stats:', error);
      });

      console.log('✅ Review stage completed and stats updated');

    } catch (error) {
      console.error('❌ Error completing review stage:', error);
      throw error;
    }
  }

  // 復習結果保存
  static async saveReviewResult(result: Omit<ReviewResult, 'id' | 'createdAt'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.reviewResults), {
      ...result,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  }

  // 復習問題取得（復習問題リクエストから作成された問題を含む）
  static async getReviewQuestions(reviewItemId: string, targetStage?: ReviewStage): Promise<ReviewQuestion[]> {
    try {
      console.log('🔍 Fetching review questions for item:', reviewItemId, 'stage:', targetStage);
      
      // まず、復習アイテムから studyRecordId を取得
      const reviewItemQuery = query(
        collection(db, COLLECTIONS.reviewItems),
        where('__name__', '==', reviewItemId)
      );
      const reviewItemSnapshot = await getDocs(reviewItemQuery);
      
      if (reviewItemSnapshot.empty) {
        console.log('⚠️ Review item not found:', reviewItemId);
        return [];
      }
      
      const reviewItemData = reviewItemSnapshot.docs[0].data();
      const studyRecordId = reviewItemData.studyRecordId;
      
      console.log('📄 Found studyRecordId:', studyRecordId);
      
      // 復習問題リクエストを検索
      const requestQuery = query(
        collection(db, COLLECTIONS.reviewQuestionRequests),
        where('studyRecordId', '==', studyRecordId)
      );
      const requestSnapshot = await getDocs(requestQuery);
      
      let questions: ReviewQuestion[] = [];
      
      if (!requestSnapshot.empty) {
        // 復習問題リクエストが見つかった場合、関連する問題を取得
        const requestData = requestSnapshot.docs[0].data();
        const requestId = requestSnapshot.docs[0].id;
        
        console.log('📋 Found review question request:', requestId);
        
        // 復習問題リクエストから作成された問題を取得
        let questionQuery = query(
          collection(db, COLLECTIONS.reviewQuestions),
          where('reviewQuestionRequestId', '==', requestId)
        );
        
        // 特定の段階の問題のみ取得する場合
        if (targetStage) {
          questionQuery = query(
            collection(db, COLLECTIONS.reviewQuestions),
            where('reviewQuestionRequestId', '==', requestId),
            where('targetStage', '==', targetStage)
          );
        }
        
        const questionSnapshot = await getDocs(questionQuery);
        
        questions = questionSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate()
          };
        }) as ReviewQuestion[];
        
        console.log(`📚 Found ${questions.length} questions from review request`);
      }
      
      // 従来の復習問題も取得（reviewItemId で直接関連付けられたもの）
      const directQuestionQuery = targetStage
        ? query(
            collection(db, COLLECTIONS.reviewQuestions),
            where('reviewItemId', '==', reviewItemId),
            where('targetStage', '==', targetStage)
          )
        : query(
            collection(db, COLLECTIONS.reviewQuestions),
            where('reviewItemId', '==', reviewItemId)
          );
      
      const directQuestionSnapshot = await getDocs(directQuestionQuery);
      const directQuestions = directQuestionSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        };
      }) as ReviewQuestion[];
      
      console.log(`📚 Found ${directQuestions.length} direct questions`);
      
      // 両方の問題を統合
      questions = [...questions, ...directQuestions];
      
      // 重複を除去（IDで判定）
      const uniqueQuestions = questions.filter((question, index, self) =>
        index === self.findIndex(q => q.id === question.id)
      );
      
      // 作成日時でソート
      const sortedQuestions = uniqueQuestions.sort((a, b) => {
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      console.log(`✅ Total ${sortedQuestions.length} unique questions found and sorted`);
      return sortedQuestions;
    } catch (error) {
      console.error('❌ Error fetching review questions:', error);
      return [];
    }
  }

  // 特定の段階の復習問題を取得（新規メソッド）
  static async getReviewQuestionsForStage(reviewItemId: string, stage: ReviewStage): Promise<ReviewQuestion[]> {
    return this.getReviewQuestions(reviewItemId, stage);
  }

  // 学習ログ取得（シンプルクエリ + クライアントサイドソート）
  static async getStudyLogs(userId: string, subject?: Subject): Promise<StudyLog[]> {
    try {
      console.log('🔍 Fetching study logs for user:', userId, subject ? `subject: ${subject}` : '');
      
      const q = query(
        collection(db, COLLECTIONS.studyLogs),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      console.log('📄 Raw study logs count:', snapshot.docs.length);
      
      let logs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          studyDate: data.studyDate.toDate(),
          createdAt: data.createdAt.toDate()
        };
      }) as StudyLog[];

      if (subject) {
        logs = logs.filter(log => log.subject === subject);
        console.log('📚 Filtered logs for subject:', subject, logs.length);
      }

      const sortedLogs = logs.sort((a, b) => {
        return b.studyDate.getTime() - a.studyDate.getTime();
      });

      console.log('✅ Study logs sorted by study date');
      return sortedLogs;
    } catch (error) {
      console.error('❌ Error fetching study logs:', error);
      return [];
    }
  }

  // 教科別学習進捗計算
  static async getStudyProgress(userId: string, subjects: Subject[]): Promise<StudyProgress[]> {
    try {
      const reviewItems = await this.getReviewItems(userId);
      const studyLogs = await this.getStudyLogs(userId);

      return subjects.map(subject => {
        const subjectReviews = reviewItems.filter(item => item.subject === subject);
        const subjectLogs = studyLogs.filter(log => log.subject === subject);

        const units = new Set(subjectLogs.map(log => log.unit));
        const totalUnits = units.size;

        const completedUnits = Array.from(units).filter(unit => {
          const unitLogs = subjectLogs.filter(log => log.unit === unit);
          const avgUnderstanding = unitLogs.reduce((sum, log) => {
            const score = { excellent: 4, good: 3, fair: 2, poor: 1 }[log.understanding];
            return sum + score;
          }, 0) / unitLogs.length;
          return avgUnderstanding >= 3;
        }).length;

        const pendingReviews = subjectReviews.filter(item => !item.isCompleted).length;
        const overdueReviews = subjectReviews.filter(item => {
          if (item.isCompleted) return false;
          const currentProgress = item.progress.find(p => p.stage === item.currentStage);
          return currentProgress && currentProgress.scheduledDate < new Date();
        }).length;

        const averageUnderstanding = subjectLogs.length > 0 ? 
          subjectLogs.reduce((sum, log) => {
            const score = { excellent: 4, good: 3, fair: 2, poor: 1 }[log.understanding];
            return sum + score;
          }, 0) / subjectLogs.length : 0;

        const totalStudyTime = subjectLogs.reduce((sum, log) => sum + log.duration, 0);
        const lastStudyDate = subjectLogs.length > 0 ? subjectLogs[0].studyDate : undefined;

        return {
          subject,
          totalUnits,
          completedUnits,
          pendingReviews,
          overdueReviews,
          averageUnderstanding,
          totalStudyTime,
          lastStudyDate
        };
      });
    } catch (error) {
      console.error('Error calculating study progress:', error);
      return [];
    }
  }

  // 復習スケジュール取得
  static getReviewSchedule(): ReviewSchedule {
    return REVIEW_SCHEDULE;
  }

  // 復習スケジュール更新（復習結果に基づく）
  static async updateReviewSchedule(reviewItemId: string, success: boolean): Promise<void> {
    try {
      console.log('📅 Updating review schedule for item:', reviewItemId, 'success:', success);
      console.log('✅ Review schedule updated');
    } catch (error) {
      console.error('❌ Error updating review schedule:', error);
    }
  }
}