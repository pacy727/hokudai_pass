"use client"

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, CheckCircle, BookOpen, Brain, Clock } from 'lucide-react';
import { ReviewItem, ReviewStage, ReviewQuestion } from '@/types/review';
import { ReviewService } from '@/lib/db/reviewService';

interface UnderstandingInputModalProps {
  reviewItem: ReviewItem;
  stage: ReviewStage;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (understanding: number) => void;
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

  const handleSubmit = async () => {
    if (understanding < 0 || understanding > 100) return;
    if (isCompletedStage) {
      // 完了済みの場合は理解度更新のみ
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

  // 復習問題を取得
  useEffect(() => {
    if (isOpen) {
      const loadQuestions = async () => {
        setIsLoadingQuestions(true);
        try {
          const questions = await ReviewService.getReviewQuestions(reviewItem.id);
          setReviewQuestions(questions);
        } catch (error) {
          console.error('Error loading review questions:', error);
        } finally {
          setIsLoadingQuestions(false);
        }
      };
      loadQuestions();
    }
  }, [isOpen, reviewItem.id]);

  const schedule = ReviewService.getReviewSchedule();
  const stageName = schedule.stages.find(s => s.stage === stage)?.name || `第${stage}回`;
  const currentLevel = getUnderstandingLevel(understanding);
  
  // unitとcontentが同じ場合はunitを優先表示
  const displayText = reviewItem.unit && reviewItem.unit.trim() 
    ? reviewItem.unit 
    : reviewItem.content;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-bold">
              {isCompletedStage ? '復習確認' : '復習'}
            </h2>
            <Badge variant="outline">
              {reviewItem.subject}
            </Badge>
            <Badge variant="outline" className="bg-blue-50">
              {stageName}
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

        <div className="p-4">
          {/* 復習項目情報（コンパクト） */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-base">{displayText}</h3>
          </div>

          {/* 復習問題セクション */}
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-base">
                <BookOpen className="h-4 w-4" />
                <span>復習問題</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingQuestions ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm text-gray-600">問題を読み込み中...</span>
                </div>
              ) : reviewQuestions.length === 0 ? (
                <div className="text-center py-6">
                  <Clock className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium mb-1">もう少し待ってください！</p>
                  <p className="text-sm text-gray-500">
                    教員がまだ復習問題を割り当てていません。<br />
                    しばらくお待ちください。
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviewQuestions.map((question, index) => (
                    <div key={question.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">
                          問題 {index + 1}: {question.title}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {question.estimatedTime}分
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-700 mb-3">
                        {question.content}
                      </div>
                      
                      {/* 選択肢（選択問題の場合） */}
                      {question.type === 'multiple_choice' && question.options && (
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="text-sm text-gray-600">
                              {String.fromCharCode(65 + optionIndex)}. {option}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* 解説（あれば） */}
                      {question.explanation && (
                        <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                          <strong>解説:</strong> {question.explanation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 理解度入力（コンパクト） */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center space-x-2">
                  <Brain className="h-4 w-4" />
                  <span>理解度評価</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{currentLevel.emoji}</span>
                  <span className={`font-bold ${currentLevel.color}`}>
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
                    className={`w-full h-2 bg-gray-200 rounded-lg appearance-none slider ${
                      isCompletedStage ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                    }`}
                    style={{
                      background: `linear-gradient(to right, #ef4444 0%, #f97316 20%, #eab308 40%, #84cc16 60%, #22c55e 80%, #06b6d4 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0</span>
                    <span>25</span>
                    <span>50</span>
                    <span>75</span>
                    <span>100</span>
                  </div>
                </div>
                {isCompletedStage && (
                  <p className="text-sm text-gray-500">
                    この復習は完了済みです。問題と理解度を確認できます。
                  </p>
                )}
              </div>

              {/* 送信ボタン */}
              <div className="flex justify-end space-x-2 pt-2">
                <Button variant="outline" onClick={onClose}>
                  {isCompletedStage ? '閉じる' : 'キャンセル'}
                </Button>
                {!isCompletedStage && (
                  <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || understanding < 0 || understanding > 100}
                    className="bg-green-600 hover:bg-green-700"
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
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .slider::-moz-range-thumb {
          height: 18px;
          width: 18px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}