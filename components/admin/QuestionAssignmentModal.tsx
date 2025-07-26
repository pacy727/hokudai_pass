'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ReviewQuestionRequestService } from '@/lib/db/reviewQuestionRequestService';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ReviewQuestionRequest, ReviewStage, ReviewQuestion } from '@/types/review';
import { X, Plus, CheckCircle, BookOpen, Save, Clock, User, Edit, Target, Award } from 'lucide-react';

interface QuestionAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ReviewQuestionRequest;
  onAssignmentComplete: () => void;
}

export function QuestionAssignmentModal({
  isOpen,
  onClose,
  request,
  onAssignmentComplete
}: QuestionAssignmentModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedStage, setSelectedStage] = useState<ReviewStage>(1);
  const [questionData, setQuestionData] = useState({
    question: '',
    answer: ''
  });
  const [assignedQuestions, setAssignedQuestions] = useState<ReviewQuestion[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ReviewQuestion | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // 既存の割り当て済み問題を読み込み
  useEffect(() => {
    if (isOpen && request) {
      loadAssignedQuestions();
    }
  }, [isOpen, request]);

  const loadAssignedQuestions = async () => {
    setIsLoadingQuestions(true);
    try {
      const questions = await ReviewQuestionRequestService.getAssignedQuestions(request.id);
      setAssignedQuestions(questions);
      
      // まだ割り当てられていない最初の段階を選択（フォームクリア時のみ）
      if (questionData.question === '' && questionData.answer === '') {
        const assignedStages = questions.map(q => q.targetStage);
        const nextStage = [1, 2, 3, 4, 5].find(stage => !assignedStages.includes(stage as ReviewStage)) as ReviewStage || 1;
        setSelectedStage(nextStage);
      }
    } catch (error) {
      console.error('Error loading assigned questions:', error);
      setAssignedQuestions([]);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!questionData.question.trim() || !questionData.answer.trim()) {
      toast({
        title: "入力エラー",
        description: "問題と解答は両方とも必須です",
        variant: "destructive"
      });
      return;
    }

    if (!user) return;

    setIsSubmitting(true);
    
    try {
      const cleanQuestionData: any = {
        reviewQuestionRequestId: request.id,
        teacherId: user.uid,
        teacherName: user.displayName,
        subject: request.subject,
        unit: request.unit,
        title: `${request.unit} - 第${selectedStage}回復習`,
        content: questionData.question.trim(),
        answer: questionData.answer.trim(),
        targetStage: selectedStage
      };

      console.log('📝 Creating simplified question data:', cleanQuestionData);

      await ReviewQuestionRequestService.assignQuestionToRequest(request.id, selectedStage, cleanQuestionData);
      
      // 割り当て済み問題を再読み込み
      await loadAssignedQuestions();

      toast({
        title: "問題割り当て完了",
        description: `第${selectedStage}回復習用の問題を割り当てました`
      });

      // 正確な完了判定：全ての段階（1-5）に問題が割り当てられているかチェック
      const updatedQuestions = await ReviewQuestionRequestService.getAssignedQuestions(request.id);
      const allStagesAssigned = [1, 2, 3, 4, 5].every(stage => 
        updatedQuestions.some(q => q.targetStage === stage)
      );
      
      if (allStagesAssigned) {
        await ReviewQuestionRequestService.completeRequest(request.id);
        toast({
          title: "リクエスト完了",
          description: "全ての復習段階の問題が割り当てられ、リクエストが完了しました"
        });
        onAssignmentComplete();
      }

    } catch (error) {
      console.error('Error assigning question:', error);
      toast({
        title: "エラー",
        description: "問題の割り当てに失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingQuestion || !questionData.question.trim() || !questionData.answer.trim()) {
      toast({
        title: "入力エラー",
        description: "問題と解答は両方とも必須です",
        variant: "destructive"
      });
      return;
    }

    setIsUpdating(true);
    
    try {
      await ReviewQuestionRequestService.updateQuestion(editingQuestion.id, {
        content: questionData.question.trim(),
        answer: questionData.answer.trim(),
        updatedAt: new Date()
      });
      
      // 割り当て済み問題を再読み込み
      await loadAssignedQuestions();
      
      // 編集モードを終了
      setEditingQuestion(null);
      
      toast({
        title: "問題更新完了",
        description: "問題内容を更新しました"
      });

    } catch (error) {
      console.error('Error updating question:', error);
      toast({
        title: "エラー",
        description: "問題の更新に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const isStageAssigned = (stage: ReviewStage) => {
    return assignedQuestions.some(q => q.targetStage === stage);
  };

  const getStageSchedule = (stage: ReviewStage) => {
    const schedules = {
      1: '1日後',
      2: '3日後', 
      3: '1週間後',
      4: '2週間後',
      5: '1か月後'
    };
    return schedules[stage] || `第${stage}回`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-y-auto">
        {/* ヘッダー - 1列にまとめて表示 */}
        <div className="sticky top-0 bg-white border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold">復習問題の割り当て</h2>
              <Badge variant="outline">
                {request.subject} - {request.unit}
              </Badge>
            </div>
            
            {/* 段階選択 + 進捗状況 + 閉じるボタン */}
            <div className="flex items-center space-x-6">
              {/* 復習段階選択 */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">段階:</span>
                {[1, 2, 3, 4, 5].map((stage) => {
                  const assigned = isStageAssigned(stage as ReviewStage);
                  const assignedQuestion = assignedQuestions.find(q => q.targetStage === stage);
                  const isSelected = selectedStage === stage;
                  
                  return (
                    <Button
                      key={stage}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className={`h-8 w-12 text-xs transition-all ${
                        assigned 
                          ? isSelected
                            ? 'bg-green-600 hover:bg-green-700 text-white border-green-600'
                            : 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200'
                          : isSelected
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        setSelectedStage(stage as ReviewStage);
                        if (assigned && assignedQuestion) {
                          setEditingQuestion(null);
                          setQuestionData({
                            question: assignedQuestion.content || '',
                            answer: assignedQuestion.answer || ''
                          });
                        } else {
                          setEditingQuestion(null);
                          setQuestionData({ question: '', answer: '' });
                        }
                      }}
                      title={`第${stage}回復習 (${getStageSchedule(stage as ReviewStage)}) ${assigned ? '- 作成済み' : '- 未作成'}`}
                    >
                      {stage}
                      {assigned && <CheckCircle className="h-2 w-2 ml-0.5" />}
                    </Button>
                  );
                })}
              </div>
              
              {/* 進捗状況 */}
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">進捗:</span>
                  <span className="text-lg font-bold text-blue-600">{assignedQuestions.length}/5</span>
                  <span className="text-sm text-gray-500">({Math.round((assignedQuestions.length / 5) * 100)}%)</span>
                  {assignedQuestions.length === 5 && (
                    <Badge variant="default" className="bg-green-600 text-white text-xs">
                      完了
                    </Badge>
                  )}
                </div>
                <div className="flex items-center space-x-1 mt-1">
                  {[1, 2, 3, 4, 5].map((stage) => (
                    <div 
                      key={stage}
                      className={`w-4 h-4 rounded-full text-xs flex items-center justify-center ${
                        isStageAssigned(stage as ReviewStage)
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}
                      title={`第${stage}回復習 (${getStageSchedule(stage as ReviewStage)})`}
                    >
                      {stage}
                    </div>
                  ))}
                </div>
              </div>
              
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* リクエスト情報（コンパクト） */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-6">
                {/* 左側：基本情報 */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span><strong>学習者:</strong> {request.userName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span><strong>リクエスト日:</strong> {request.createdAt.toLocaleDateString('ja-JP')}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div><strong>単元:</strong> {request.unit}</div>
                    <div className="text-sm text-gray-700">{request.content}</div>
                    {request.details && (
                      <div className="text-sm bg-gray-50 p-2 rounded">
                        <strong>詳細:</strong> {request.details}
                      </div>
                    )}
                    {request.memo && (
                      <div className="text-sm bg-blue-50 p-2 rounded">
                        <strong>メモ:</strong> {request.memo}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>



          {/* 問題作成・編集・確認フォーム */}
          {(selectedStage && (!isStageAssigned(selectedStage) || editingQuestion || (isStageAssigned(selectedStage) && !editingQuestion))) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {editingQuestion ? (
                    <>
                      <Edit className="h-5 w-5" />
                      <span>第{selectedStage}回復習用問題の編集</span>
                    </>
                  ) : isStageAssigned(selectedStage) ? (
                    <>
                      <BookOpen className="h-5 w-5" />
                      <span>第{selectedStage}回復習用問題の確認</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      <span>第{selectedStage}回復習用問題の作成</span>
                    </>
                  )}
                  <Badge variant="outline" className="bg-blue-50">
                    {getStageSchedule(selectedStage)}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  {editingQuestion 
                    ? `学習から${getStageSchedule(selectedStage)}に復習する問題を編集します`
                    : isStageAssigned(selectedStage)
                    ? `学習から${getStageSchedule(selectedStage)}に復習する問題の内容です`
                    : `学習から${getStageSchedule(selectedStage)}に復習する問題を作成します`
                  }
                </p>
              </CardHeader>
              <CardContent>
                {!editingQuestion && isStageAssigned(selectedStage) ? (
                  // 確認モード：読み取り専用表示
                  <div className="space-y-6">
                    {(() => {
                      const assignedQuestion = assignedQuestions.find(q => q.targetStage === selectedStage);
                      if (!assignedQuestion) return null;
                      
                      return (
                        <>
                          {/* 問題情報 */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <strong>作成者:</strong>
                              <span>{assignedQuestion.teacherName}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <strong>作成日:</strong>
                              <span>{assignedQuestion.createdAt.toLocaleDateString('ja-JP')}</span>
                            </div>
                          </div>

                          {/* 問題内容（全文表示） */}
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                                <BookOpen className="h-4 w-4 mr-2" />
                                問題
                              </h4>
                              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                                  {assignedQuestion.content}
                                </pre>
                              </div>
                            </div>

                            {assignedQuestion.answer && (
                              <div>
                                <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  解答
                                </h4>
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                                    {assignedQuestion.answer}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 編集ボタン */}
                          <div className="flex justify-center pt-4 border-t">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setEditingQuestion(assignedQuestion);
                                setQuestionData({
                                  question: assignedQuestion.content || '',
                                  answer: assignedQuestion.answer || ''
                                });
                              }}
                              className="flex items-center space-x-2"
                            >
                              <Edit className="h-4 w-4" />
                              <span>内容を編集</span>
                            </Button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  // 編集・作成モード：フォーム表示
                  <form onSubmit={editingQuestion ? handleUpdateQuestion : handleSubmit} className="space-y-6">
                    {/* 問題 */}
                    <div className="space-y-2">
                      <Label htmlFor="question">問題 *</Label>
                      <Textarea
                        id="question"
                        value={questionData.question}
                        onChange={(e) => setQuestionData(prev => ({ ...prev, question: e.target.value }))}
                        placeholder="復習問題を入力してください&#10;&#10;例：&#10;次の関数の最大値・最小値を求めよ。&#10;f(x) = x² - 4x + 3 (0 ≤ x ≤ 3)"
                        rows={8}
                        required
                        className="text-sm"
                      />
                    </div>

                    {/* 解答 */}
                    <div className="space-y-2">
                      <Label htmlFor="answer">解答 *</Label>
                      <Textarea
                        id="answer"
                        value={questionData.answer}
                        onChange={(e) => setQuestionData(prev => ({ ...prev, answer: e.target.value }))}
                        placeholder="模範解答または解説を入力してください&#10;&#10;例：&#10;f(x) = x² - 4x + 3 = (x - 2)² - 1&#10;0 ≤ x ≤ 3 における最小値は x = 2 のとき -1&#10;最大値は x = 3 のとき 0"
                        rows={6}
                        required
                        className="text-sm"
                      />
                    </div>

                    {/* 送信ボタン */}
                    <div className="flex justify-end space-x-3 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => {
                        setEditingQuestion(null);
                        if (isStageAssigned(selectedStage)) {
                          // 割り当て済みの場合は確認モードに戻る
                          const assignedQuestion = assignedQuestions.find(q => q.targetStage === selectedStage);
                          setQuestionData({
                            question: assignedQuestion?.content || '',
                            answer: assignedQuestion?.answer || ''
                          });
                        } else {
                          // 未割り当ての場合はクリア
                          setQuestionData({ question: '', answer: '' });
                        }
                      }}>
                        キャンセル
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={editingQuestion ? isUpdating : isSubmitting} 
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {editingQuestion ? (
                          isUpdating ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              更新中...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              内容を更新
                            </>
                          )
                        ) : (
                          isSubmitting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              割り当て中...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              第{selectedStage}回に割り当て
                            </>
                          )
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}