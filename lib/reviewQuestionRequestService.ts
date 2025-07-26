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
    getDoc
  } from 'firebase/firestore';
  import { db, collections } from './firebase';
  import { ReviewQuestionRequest, ReviewQuestion, ReviewStage, ReviewQuestionAssignment } from '@/types/review';
  
  export class ReviewQuestionRequestService {
    // 復習問題リクエスト作成
    static async createRequest(request: Omit<ReviewQuestionRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<string> {
      console.log('Creating review question request:', request);
      
      const requestData = {
        ...request,
        status: 'pending' as const,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
  
      const docRef = await addDoc(collection(db, collections.reviewQuestionRequests), requestData);
      console.log('Review question request created with ID:', docRef.id);
      
      return docRef.id;
    }
  
    // 管理者用：全ての復習問題リクエスト取得
    static async getAllRequests(): Promise<ReviewQuestionRequest[]> {
      try {
        console.log('🔍 Fetching all review question requests');
        
        const q = query(
          collection(db, collections.reviewQuestionRequests),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        console.log('📄 Raw requests count:', snapshot.docs.length);
        
        const requests = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          };
        }) as ReviewQuestionRequest[];
  
        console.log('✅ Review question requests loaded:', requests.length);
        return requests;
      } catch (error) {
        console.error('❌ Error fetching review question requests:', error);
        return [];
      }
    }
  
    // ステータス別リクエスト取得
    static async getRequestsByStatus(status: ReviewQuestionRequest['status']): Promise<ReviewQuestionRequest[]> {
      try {
        console.log('🔍 Fetching requests with status:', status);
        
        const q = query(
          collection(db, collections.reviewQuestionRequests),
          where('status', '==', status),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        
        const requests = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          };
        }) as ReviewQuestionRequest[];
  
        console.log(`✅ Requests with status ${status}:`, requests.length);
        return requests;
      } catch (error) {
        console.error('❌ Error fetching requests by status:', error);
        return [];
      }
    }
  
    // ユーザーの復習問題リクエスト取得
    static async getUserRequests(userId: string): Promise<ReviewQuestionRequest[]> {
      try {
        console.log('🔍 Fetching requests for user:', userId);
        
        const q = query(
          collection(db, collections.reviewQuestionRequests),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        
        const requests = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          };
        }) as ReviewQuestionRequest[];
  
        console.log('✅ User requests loaded:', requests.length);
        return requests;
      } catch (error) {
        console.error('❌ Error fetching user requests:', error);
        return [];
      }
    }
  
    // リクエストステータス更新
    static async updateRequestStatus(
      requestId: string, 
      status: ReviewQuestionRequest['status'],
      adminResponse?: string
    ): Promise<void> {
      try {
        const updates: any = {
          status,
          updatedAt: Timestamp.now()
        };
  
        if (adminResponse) {
          updates.adminResponse = adminResponse;
        }
  
        await updateDoc(doc(db, collections.reviewQuestionRequests, requestId), updates);
        console.log('✅ Request status updated:', requestId, status);
      } catch (error) {
        console.error('❌ Error updating request status:', error);
        throw error;
      }
    }
  
    // 復習問題を復習問題リクエストに割り当て
    static async assignQuestionToRequest(
      requestId: string,
      stage: ReviewStage,
      question: Omit<ReviewQuestion, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<string> {
      try {
        console.log('Assigning question to request:', requestId, 'stage:', stage);
  
        // 復習問題を作成
        const questionData = {
          ...question,
          reviewQuestionRequestId: requestId,
          targetStage: stage,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
  
        const questionRef = await addDoc(collection(db, collections.reviewQuestions), questionData);
        console.log('Question created with ID:', questionRef.id);
  
        // リクエストの割り当て済み問題を更新
        const requestDoc = await getDoc(doc(db, collections.reviewQuestionRequests, requestId));
        if (requestDoc.exists()) {
          const currentData = requestDoc.data();
          const currentAssignments = currentData.assignedQuestions || [];
          
          const newAssignment: ReviewQuestionAssignment = {
            stage,
            questionId: questionRef.id,
            question: {
              id: questionRef.id,
              ...questionData,
              createdAt: new Date(),
              updatedAt: new Date()
            } as ReviewQuestion,
            createdAt: new Date()
          };
  
          const updatedAssignments = [...currentAssignments, newAssignment];
  
          await updateDoc(doc(db, collections.reviewQuestionRequests, requestId), {
            assignedQuestions: updatedAssignments,
            updatedAt: Timestamp.now()
          });
  
          console.log('✅ Question assigned to request successfully');
        }
  
        return questionRef.id;
      } catch (error) {
        console.error('❌ Error assigning question to request:', error);
        throw error;
      }
    }
  
    // リクエストの割り当て済み問題を取得
    static async getAssignedQuestions(requestId: string): Promise<ReviewQuestion[]> {
      try {
        const q = query(
          collection(db, collections.reviewQuestions),
          where('reviewQuestionRequestId', '==', requestId),
          orderBy('targetStage', 'asc')
        );
  
        const snapshot = await getDocs(q);
        
        const questions = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          };
        }) as ReviewQuestion[];
  
        console.log('✅ Assigned questions loaded:', questions.length);
        return questions;
      } catch (error) {
        console.error('❌ Error fetching assigned questions:', error);
        return [];
      }
    }
  
    // リクエストを完了状態に更新（全ての段階に問題が割り当てられた場合）
    static async completeRequest(requestId: string): Promise<void> {
      try {
        await this.updateRequestStatus(requestId, 'completed', '復習問題の割り当てが完了しました。');
        console.log('✅ Request completed:', requestId);
      } catch (error) {
        console.error('❌ Error completing request:', error);
        throw error;
      }
    }
  
    // 統計情報取得
    static async getRequestStats() {
      try {
        const allRequests = await this.getAllRequests();
        
        const stats = {
          total: allRequests.length,
          pending: allRequests.filter(r => r.status === 'pending').length,
          inProgress: allRequests.filter(r => r.status === 'in_progress').length,
          completed: allRequests.filter(r => r.status === 'completed').length,
          rejected: allRequests.filter(r => r.status === 'rejected').length
        };
  
        return stats;
      } catch (error) {
        console.error('❌ Error getting request stats:', error);
        return {
          total: 0,
          pending: 0,
          inProgress: 0,
          completed: 0,
          rejected: 0
        };
      }
    }
  }