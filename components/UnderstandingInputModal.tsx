"use client"

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, CheckCircle, Brain, BookOpen, Clock, AlertTriangle, MessageSquare } from 'lucide-react';
import { ReviewItem, ReviewStage, ReviewQuestion, ReviewQuestionRequest } from '@/types/review';
import { ReviewService } from '@/lib/db/reviewService';
import { ReviewQuestionRequestService } from '@/lib/db/reviewQuestionRequestService';

interface UnderstandingInputModalProps {
  reviewItem: ReviewItem;
  stage: ReviewStage;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (understanding: number) => void;
}

// 個別問題コンポーネント（シンプル版）
function QuestionItem({ question, index }: { 
  question: ReviewQuestion, 
  index: number
}) {
  const [showAnswer, setShowAnswer] = useState(false);
  
  return (
    <div className="space-y-4">
      {/* 問題 */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-3">
          📝 問題 {index + 1}
        </h4>
        <div className="text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
          {question.content}
        </div>
        
        {/* 選択肢（選択問題の場合） */}
        {question.type === 'multiple_choice' && question.options && (
          <div className="mt-4 space-y-2">
            {question.options.map((option, optionIndex) => (
              <div key={optionIndex} className="text-gray-700 p-2 bg-white rounded border">
                {String.fromCharCode(65 + optionIndex)}. {option}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* 解答・解説表示ボタン */}
      {(question.answer || question.explanation) && (
        <div className="text-center">
          <Button
            variant={showAnswer ? "secondary" : "default"}
            onClick={() => setShowAnswer(!showAnswer)}
            className="px-6"
          >
            {showAnswer ? (
              <>
                <X className="h-4 w-4 mr-2" />
                解答を隠す
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                解答を見る
              </>
            )}
          </Button>
        </div>
      )}
      
      {/* 解答・解説 */}
      {showAnswer && (
        <div className="animate-in fade-in-0 slide-in-from-top-2 duration-300">
          {question.answer && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h5 className="font-medium text-green-800 mb-3 flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                解答・解説
              </h5>
              <div className="text-green-700 whitespace-pre-wrap font-sans leading-relaxed">
                {question.answer}
              </div>
            </div>
          )}
          
          {question.explanation && question.explanation !== question.answer && (
            <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h5 className="font-medium text-amber-800 mb-3 flex items-center">
                <BookOpen className="h-4 w-4 mr-1" />
                詳細解説
              </h5>
              <div className="text-amber-700 whitespace-pre-wrap font-sans leading-relaxed">
                {question.explanation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function UnderstandingInputModal({ 
  reviewItem, 
  stage, 
  isOpen, 
  onClose, 
  onSubmit 
}: UnderstandingInputModalProps) {
  // 該当ステージの復習進捗を取得
  const stageProgress = reviewItem.progress.find(p => p.stage === stage);
  const isCompletedStage = stageProgress?.isCompleted || false;
  
  const [understanding, setUnderstanding] = useState<number>(
    stageProgress?.understanding || 70
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewQuestions, setReviewQuestions] = useState<ReviewQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [reviewQuestionRequest, setReviewQuestionRequest] = useState<ReviewQuestionRequest | null>(null);
  const [isLoadingRequest, setIsLoadingRequest] = useState(true);

  const handleSubmit = async () => {
    if (understanding < 0 || understanding > 100) return;
    if (isCompletedStage) {
      onClose();
      return;
    }
    
    setIsSubmitting(true);
    try {
      await ReviewService.completeReviewStage(reviewItem.id, stage, understanding);
      onSubmit(understanding);
      onClose();
    } catch (error) {
      console.error('Error submitting understanding:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUnderstandingLevel = (score: number) => {
    if (score >= 90) return { label: '完璧', color: 'text-green-600', emoji: '🎉' };
    if (score >= 80) return { label: 'よく理解', color: 'text-blue-600', emoji: '😊' };
    if (score >= 70) return { label: '理解', color: 'text-green-500', emoji: '👍' };
    if (score >= 60) return { label: 'まあまあ', color: 'text-yellow-600', emoji: '🤔' };
    if (score >= 50) return { label: '少し理解', color: 'text-orange-600', emoji: '😐' };
    return { label: '理解不足', color: 'text-red-600', emoji: '😅' };
  };

  // 復習問題を取得（特定の段階の問題のみ）
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        setIsLoadingQuestions(true);
        setIsLoadingRequest(true);
        
        console.log('🔍 [UnderstandingInputModal] Loading data for reviewItem:', {
          reviewItemId: reviewItem.id,
          studyRecordId: reviewItem.studyRecordId,
          userId: reviewItem.userId,
          stage: stage
        });
        
        try {
          // 復習問題を取得
          const questions = await ReviewService.getReviewQuestionsForStage(reviewItem.id, stage);
          console.log('📚 [UnderstandingInputModal] Questions found:', questions.length);
          setReviewQuestions(questions);
          
          // 復習問題リクエストの状態を取得
          try {
            const userRequests = await ReviewQuestionRequestService.getUserRequests(reviewItem.userId);
            console.log('📋 [UnderstandingInputModal] User requests found:', userRequests.length);
            console.log('📋 [UnderstandingInputModal] All user requests:', userRequests.map(req => ({
              id: req.id,
              studyRecordId: req.studyRecordId,
              status: req.status,
              adminResponse: req.adminResponse
            })));
            
            // studyRecordId で該当するリクエストを探す
            const relatedRequest = userRequests.find(req => {
              console.log('🔍 [UnderstandingInputModal] Comparing:', {
                requestStudyRecordId: req.studyRecordId,
                reviewItemStudyRecordId: reviewItem.studyRecordId,
                match: req.studyRecordId === reviewItem.studyRecordId
              });
              return req.studyRecordId === reviewItem.studyRecordId;
            });
            
            console.log('✅ [UnderstandingInputModal] Related request found:', relatedRequest ? {
              id: relatedRequest.id,
              status: relatedRequest.status,
              adminResponse: relatedRequest.adminResponse
            } : 'None');
            
            setReviewQuestionRequest(relatedRequest || null);
          } catch (error) {
            console.error('❌ [UnderstandingInputModal] Error loading review question request:', error);
            setReviewQuestionRequest(null);
          }
        } catch (error) {
          console.error('❌ [UnderstandingInputModal] Error loading review questions:', error);
          setReviewQuestions([]);
          setReviewQuestionRequest(null);
        } finally {
          setIsLoadingQuestions(false);
          setIsLoadingRequest(false);
        }
      };
      loadData();
    }
  }, [isOpen, reviewItem.id, stage, reviewItem.studyRecordId, reviewItem.userId]);

  const schedule = ReviewService.getReviewSchedule();
  const stageName = schedule.stages.find(s => s.stage === stage)?.name || `第${stage}回`;
  const currentLevel = getUnderstandingLevel(understanding);
  
  // 段階別の日付表示を取得
  const getStageDisplayName = (stage: ReviewStage) => {
    switch (stage) {
      case 1: return '第1回目（学習1日後）';
      case 2: return '第2回目（学習3日後）';
      case 3: return '第3回目（学習1週間後）';
      case 4: return '第4回目（学習2週間後）';
      case 5: return '第5回目（学習1か月後）';
      default: return `第${stage}回目`;
    }
  };
  
  // unitとcontentが同じ場合はunitを優先表示
  const displayText = reviewItem.unit && reviewItem.unit.trim() 
    ? reviewItem.unit 
    : reviewItem.content;

  // 復習問題の状態を判定
  const getQuestionStatus = () => {
    console.log('🎯 [UnderstandingInputModal] getQuestionStatus called:', {
      isLoadingQuestions,
      isLoadingRequest,
      questionsLength: reviewQuestions.length,
      reviewQuestionRequest: reviewQuestionRequest ? {
        id: reviewQuestionRequest.id,
        status: reviewQuestionRequest.status,
        adminResponse: reviewQuestionRequest.adminResponse
      } : null
    });
    
    if (isLoadingQuestions || isLoadingRequest) {
      console.log('📊 [UnderstandingInputModal] Status: loading');
      return 'loading';
    }
    
    if (reviewQuestions.length > 0) {
      console.log('📊 [UnderstandingInputModal] Status: available');
      return 'available';
    }
    
    if (reviewQuestionRequest) {
      console.log('📊 [UnderstandingInputModal] Status based on request:', reviewQuestionRequest.status);
      switch (reviewQuestionRequest.status) {
        case 'rejected':
          return 'rejected';
        case 'pending':
          return 'pending';
        case 'in_progress':
          return 'in_progress';
        case 'completed':
          return 'completed_no_questions'; // 完了しているが問題がない場合
        default:
          return 'no_questions';
      }
    }
    
    console.log('📊 [UnderstandingInputModal] Status: no_questions (default)');
    return 'no_questions';
  };

  const questionStatus = getQuestionStatus();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー（シンプル版） */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold">{displayText}</h2>
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              {getStageDisplayName(stage)}
            </Badge>
            {isCompletedStage && (
              <Badge variant="default" className="bg-green-600">
                完了済み
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* 復習問題セクション */}
          <div>
            {questionStatus === 'loading' ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-gray-600">問題を読み込み中...</span>
              </div>
            ) : questionStatus === 'available' ? (
              <div className="space-y-6">
                {reviewQuestions.map((question, index) => (
                  <QuestionItem key={question.id} question={question} index={index} />
                ))}
              </div>
            ) : questionStatus === 'rejected' ? (
              /* 却下された場合の表示 */
              <div className="text-center py-8 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-4xl mb-4">❌</div>
                <h3 className="text-lg font-bold text-red-800 mb-4">
                  復習問題リクエストが却下されました
                </h3>
                {reviewQuestionRequest?.adminResponse && (
                  <div className="bg-red-100 border border-red-300 rounded p-4 mb-4 text-left">
                    <div className="flex items-start space-x-2">
                      <MessageSquare className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-red-800 mb-2">管理者からのメッセージ:</p>
                        <p className="text-red-700 whitespace-pre-wrap">
                          {reviewQuestionRequest.adminResponse}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="text-sm text-red-600 bg-red-100 rounded p-3 inline-block">
                  💡 教科書やノートを使って自分で復習を進めてください
                </div>
              </div>
            ) : questionStatus === 'pending' ? (
              /* リクエスト受付中の場合 */
              <div className="text-center py-8 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-4xl mb-4">⏳</div>
                <h3 className="text-lg font-bold text-yellow-800 mb-2">
                  復習問題を準備中です
                </h3>
                <p className="text-yellow-700 mb-4">
                  復習問題のリクエストを受け付けました。<br />
                  管理者が問題を作成中です。しばらくお待ちください。
                </p>
                <div className="text-sm text-yellow-600 bg-yellow-100 rounded p-3 inline-block">
                  💡 問題が準備されるまで、教科書やノートで復習を進めましょう
                </div>
              </div>
            ) : questionStatus === 'in_progress' ? (
              /* 作業中の場合 */
              <div className="text-center py-8 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-4xl mb-4">🔨</div>
                <h3 className="text-lg font-bold text-blue-800 mb-2">
                  復習問題を作成中です
                </h3>
                <p className="text-blue-700 mb-4">
                  管理者が復習問題を作成中です。<br />
                  もう少しでお待たせします。
                </p>
                <div className="text-sm text-blue-600 bg-blue-100 rounded p-3 inline-block">
                  💡 問題が完成するまで、教科書やノートで復習を進めましょう
                </div>
              </div>
            ) : (
              /* 問題がない場合（デフォルト） */
              <div className="text-center py-8 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-lg font-bold text-orange-800 mb-2">
                  自分で復習しよう！
                </h3>
                <p className="text-orange-700 mb-4">
                  復習問題はまだ用意されていません。<br />
                  教科書やノートを使って自分で復習を進めてください。
                </p>
                <div className="text-sm text-orange-600 bg-orange-100 rounded p-3 inline-block">
                  💡 復習のポイント：重要な部分を再確認し、理解度を評価してみましょう
                </div>
              </div>
            )}
          </div>

          {/* 理解度評価セクション */}
          <Card className="border-2 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  <span>理解度を評価してください</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{currentLevel.emoji}</span>
                  <span className={`text-xl font-bold ${currentLevel.color}`}>
                    {understanding}点
                  </span>
                  <span className={`text-sm ${currentLevel.color}`}>
                    ({currentLevel.label})
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 理解度スライダー */}
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={understanding}
                    onChange={(e) => setUnderstanding(Number(e.target.value))}
                    disabled={isCompletedStage}
                    className={`w-full h-3 bg-gray-200 rounded-lg appearance-none slider ${
                      isCompletedStage ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                    }`}
                    style={{
                      background: `linear-gradient(to right, #ef4444 0%, #f97316 20%, #eab308 40%, #84cc16 60%, #22c55e 80%, #06b6d4 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>0</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                </div>
                
                {isCompletedStage && (
                  <p className="text-sm text-gray-500 text-center">
                    この復習は完了済みです
                  </p>
                )}
              </div>

              {/* ボタン */}
              <div className="flex justify-end space-x-3 pt-4">
                <Button variant="outline" onClick={onClose} size="lg">
                  キャンセル
                </Button>
                {!isCompletedStage && (
                  <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700 px-8"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        送信中...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        復習完了
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}