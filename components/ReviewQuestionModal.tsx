"use client"

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Clock, User, BookOpen, CheckCircle, XCircle } from 'lucide-react';
import { ReviewQuestion, ReviewItem } from '@/types/review';
import { ReviewService } from '@/lib/db/reviewService';

interface ReviewQuestionModalProps {
  reviewItem: ReviewItem;
  isOpen: boolean;
  onClose: () => void;
  onResult: (success: boolean) => void;
}

export function ReviewQuestionModal({ reviewItem, isOpen, onClose, onResult }: ReviewQuestionModalProps) {
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadQuestions();
      setStartTime(new Date());
    }
  }, [isOpen, reviewItem.id]);

  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      const questionList = await ReviewService.getReviewQuestions(reviewItem.id);
      setQuestions(questionList);
      setCurrentIndex(0);
      setShowExplanation(false);
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResult = async (success: boolean) => {
    if (!startTime || questions.length === 0) return;

    const currentQuestion = questions[currentIndex];
    const timeSpent = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

    try {
      // 復習結果を保存
      await ReviewService.saveReviewResult({
        userId: reviewItem.userId,
        reviewItemId: reviewItem.id,
        questionId: currentQuestion.id,
        result: success ? 'success' : 'failure',
        timeSpent
      });

      // 復習スケジュールを更新
      await ReviewService.updateReviewSchedule(reviewItem.id, success);

      // 結果を親コンポーネントに通知
      onResult(success);
      
      // モーダルを閉じる
      onClose();
    } catch (error) {
      console.error('Error saving review result:', error);
    }
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowExplanation(false);
      setStartTime(new Date());
    }
  };

  const previousQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowExplanation(false);
      setStartTime(new Date());
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}分`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}時間${mins}分`;
  };

  if (!isOpen) return null;

  const currentQuestion = questions[currentIndex];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold">復習問題</h2>
            <Badge variant="outline" className={getDifficultyColor(reviewItem.difficulty)}>
              {reviewItem.difficulty === 'easy' ? '易' : reviewItem.difficulty === 'medium' ? '中' : '難'}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
          {/* 復習アイテム情報 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>{reviewItem.subject} - {reviewItem.unit}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">{reviewItem.content}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>復習期日: {reviewItem.reviewDate.toLocaleDateString()}</span>
                </div>
                <div>
                  完了回数: {reviewItem.completedCount}回
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 問題表示 */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : questions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">この復習項目に問題が登録されていません</p>
                <p className="text-sm text-gray-400 mt-2">教員に問題の登録を依頼してください</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <CardTitle>{currentQuestion.title}</CardTitle>
                    <Badge variant="outline" className={getDifficultyColor(currentQuestion.difficulty)}>
                      {currentQuestion.difficulty === 'easy' ? '易' : currentQuestion.difficulty === 'medium' ? '中' : '難'}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>目安時間: {formatTime(currentQuestion.estimatedTime)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User className="h-4 w-4" />
                      <span>{currentQuestion.teacherName}</span>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  問題 {currentIndex + 1} / {questions.length}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 問題内容 */}
                  <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {currentQuestion.content}
                  </div>

                  {/* 選択肢（選択問題の場合） */}
                  {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                    <div className="space-y-2">
                      {currentQuestion.options.map((option, index) => (
                        <div key={index} className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                          {option}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 解説表示 */}
                  {showExplanation && currentQuestion.explanation && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-2">解説</h4>
                      <div className="text-blue-700 whitespace-pre-wrap">
                        {currentQuestion.explanation}
                      </div>
                      {currentQuestion.answer && (
                        <div className="mt-2 text-sm text-blue-600">
                          <strong>参考答案:</strong> {currentQuestion.answer}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 問題ナビゲーション */}
                  {questions.length > 1 && (
                    <div className="flex justify-between items-center pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={previousQuestion}
                        disabled={currentIndex === 0}
                      >
                        前の問題
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowExplanation(!showExplanation)}
                      >
                        {showExplanation ? '解説を隠す' : '解説を見る'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={nextQuestion}
                        disabled={currentIndex === questions.length - 1}
                      >
                        次の問題
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 結果ボタン */}
          {questions.length > 0 && (
            <div className="flex justify-center space-x-4 mt-6">
              <Button
                onClick={() => handleResult(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-2"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                できた！
              </Button>
              <Button
                onClick={() => handleResult(false)}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-2"
              >
                <XCircle className="h-4 w-4 mr-2" />
                できなかった…
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}