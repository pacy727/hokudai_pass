import {
    collection,
    getDocs,
    doc,
    updateDoc,
    query,
    where,
    Timestamp
  } from 'firebase/firestore';
  import { db, collections } from '../firebase';
  
  export interface ReviewStats {
    totalReviewsCompleted: number;
    totalUnderstandingScore: number;
    averageUnderstanding: number;
    lastCalculatedAt: Date;
  }
  
  export class ReviewStatsService {
    // ユーザーの復習統計を計算
    static async calculateUserReviewStats(userId: string): Promise<ReviewStats> {
      console.log('🧮 Calculating review stats for user:', userId);
      
      try {
        // 復習結果を取得
        const reviewResultsQuery = query(
          collection(db, 'review_results'),
          where('userId', '==', userId)
        );
        
        const reviewResultsSnapshot = await getDocs(reviewResultsQuery);
        console.log('📊 Review results found:', reviewResultsSnapshot.docs.length);
  
        let totalReviewsCompleted = 0;
        let totalUnderstandingScore = 0;
  
        reviewResultsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          
          // 理解度スコアがある場合のみカウント
          if (data.understanding !== undefined && data.understanding !== null) {
            totalReviewsCompleted++;
            totalUnderstandingScore += data.understanding;
          }
        });
  
        // 平均理解度を計算
        const averageUnderstanding = totalReviewsCompleted > 0 
          ? totalUnderstandingScore / totalReviewsCompleted 
          : 0;
  
        const stats: ReviewStats = {
          totalReviewsCompleted,
          totalUnderstandingScore,
          averageUnderstanding,
          lastCalculatedAt: new Date()
        };
  
        console.log('✅ Review stats calculated:', stats);
        return stats;
      } catch (error) {
        console.error('❌ Error calculating review stats:', error);
        
        // エラー時はデフォルト値を返す
        return {
          totalReviewsCompleted: 0,
          totalUnderstandingScore: 0,
          averageUnderstanding: 0,
          lastCalculatedAt: new Date()
        };
      }
    }
  
    // ユーザーの復習統計をFirestoreに保存
    static async updateUserReviewStats(userId: string): Promise<void> {
      try {
        console.log('💾 Updating review stats for user:', userId);
        
        const stats = await this.calculateUserReviewStats(userId);
        
        await updateDoc(doc(db, collections.users, userId), {
          reviewStats: {
            ...stats,
            lastCalculatedAt: Timestamp.fromDate(stats.lastCalculatedAt)
          }
        });
  
        console.log('✅ Review stats updated in Firestore');
      } catch (error) {
        console.error('❌ Error updating review stats:', error);
        throw error;
      }
    }
  
    // 全ユーザーの復習統計を一括更新（管理者用）
    static async updateAllUsersReviewStats(): Promise<void> {
      try {
        console.log('🔄 Starting batch update of all users review stats');
        
        // 全ユーザーを取得
        const usersSnapshot = await getDocs(collection(db, collections.users));
        console.log('👥 Total users found:', usersSnapshot.docs.length);
  
        const updatePromises = usersSnapshot.docs.map(async (userDoc) => {
          const userId = userDoc.id;
          
          try {
            await this.updateUserReviewStats(userId);
            console.log(`✅ Updated stats for user: ${userId}`);
          } catch (error) {
            console.error(`❌ Failed to update stats for user ${userId}:`, error);
          }
        });
  
        await Promise.all(updatePromises);
        console.log('🎉 Batch update completed');
      } catch (error) {
        console.error('❌ Error in batch update:', error);
        throw error;
      }
    }
  
    // 学年別の復習統計を取得
    static async getReviewStatsByGrade(): Promise<Record<string, ReviewStats>> {
      try {
        console.log('📊 Calculating review stats by grade');
        
        const usersSnapshot = await getDocs(collection(db, collections.users));
        const statsByGrade: Record<string, {
          totalUsers: number;
          totalReviews: number;
          totalUnderstanding: number;
          userStats: ReviewStats[];
        }> = {};
  
        // 学年ごとにデータを集計
        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();
          const grade = userData.grade || 'その他';
          const userId = userDoc.id;
  
          if (!statsByGrade[grade]) {
            statsByGrade[grade] = {
              totalUsers: 0,
              totalReviews: 0,
              totalUnderstanding: 0,
              userStats: []
            };
          }
  
          // ユーザーの復習統計を計算
          const userStats = await this.calculateUserReviewStats(userId);
          
          statsByGrade[grade].totalUsers++;
          statsByGrade[grade].totalReviews += userStats.totalReviewsCompleted;
          statsByGrade[grade].totalUnderstanding += userStats.totalUnderstandingScore;
          statsByGrade[grade].userStats.push(userStats);
        }
  
        // 学年別の平均統計を計算
        const result: Record<string, ReviewStats> = {};
        
        Object.keys(statsByGrade).forEach(grade => {
          const gradeData = statsByGrade[grade];
          
          result[grade] = {
            totalReviewsCompleted: gradeData.totalReviews,
            totalUnderstandingScore: gradeData.totalUnderstanding,
            averageUnderstanding: gradeData.totalReviews > 0 
              ? gradeData.totalUnderstanding / gradeData.totalReviews 
              : 0,
            lastCalculatedAt: new Date()
          };
        });
  
        console.log('✅ Grade stats calculated:', result);
        return result;
      } catch (error) {
        console.error('❌ Error calculating grade stats:', error);
        return {};
      }
    }
  
    // 復習完了時に統計を更新
    static async onReviewCompleted(userId: string, understanding: number): Promise<void> {
      try {
        console.log('🎯 Review completed, updating stats for user:', userId, 'understanding:', understanding);
        
        // ユーザーの統計を再計算して更新
        await this.updateUserReviewStats(userId);
        
        console.log('✅ Stats updated after review completion');
      } catch (error) {
        console.error('❌ Error updating stats after review:', error);
        // エラーでも復習完了処理は継続する
      }
    }
  
    // 学年ランキング用のデータを取得
    static async getGradeRankings(): Promise<Record<string, Array<{
      userId: string;
      userName: string;
      averageUnderstanding: number;
      totalReviews: number;
    }>>> {
      try {
        console.log('🏆 Calculating grade rankings');
        
        const usersSnapshot = await getDocs(collection(db, collections.users));
        const rankings: Record<string, Array<{
          userId: string;
          userName: string;
          averageUnderstanding: number;
          totalReviews: number;
        }>> = {};
  
        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();
          const grade = userData.grade || 'その他';
          const userId = userDoc.id;
          const userName = userData.displayName || 'ユーザー';
  
          if (!rankings[grade]) {
            rankings[grade] = [];
          }
  
          // ユーザーの復習統計を取得
          const stats = await this.calculateUserReviewStats(userId);
          
          if (stats.totalReviewsCompleted > 0) {
            rankings[grade].push({
              userId,
              userName,
              averageUnderstanding: stats.averageUnderstanding,
              totalReviews: stats.totalReviewsCompleted
            });
          }
        }
  
        // 各学年内で平均理解度順にソート
        Object.keys(rankings).forEach(grade => {
          rankings[grade].sort((a, b) => b.averageUnderstanding - a.averageUnderstanding);
        });
  
        console.log('✅ Grade rankings calculated');
        return rankings;
      } catch (error) {
        console.error('❌ Error calculating grade rankings:', error);
        return {};
      }
    }
  }