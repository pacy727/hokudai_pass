'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ReviewQuestionRequestService } from '@/lib/db/reviewQuestionRequestService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { ReviewQuestionRequest, ReviewStage, ReviewQuestion } from '@/types/review';
import { X, Plus, CheckCircle, BookOpen, Save, Clock, User } from 'lucide-react';

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
    title: '',
    content: '',
    type: 'text' as ReviewQuestion['type'],
    options: ['', '', '', ''],
    answer: '',
    explanation: '',
    difficulty: 'medium' as ReviewQuestion['difficulty'],
    estimatedTime: 15
  });
  const [assignedQuestions, setAssignedQuestions] = useState<ReviewQuestion[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

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
      
      // まだ割り当てられていない最初の段階を選択
      const assignedStages = questions.map(q => q.targetStage);
      const nextStage = [1, 2, 3, 4, 5].find(stage => !assignedStages.includes(stage as ReviewStage)) as ReviewStage || 1;
      setSelectedStage(nextStage);
    } catch (error) {
      console.error('Error loading assigned questions:', error);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setQuestionData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    setQuestionData(prev => ({
      ...prev,
      options: prev.options.map((option, i) => i === index ? value : option)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!questionData.title.trim() || !questionData.content.trim()) {
      toast({
        title: "入力エラー",
        description: "問題タイトルと内容は必須です",
        variant: "destructive"
      });
      return;
    }

    if (!user) return;

    setIsSubmitting(true);
    
    try {
      // undefinedフィールドを除去してクリーンなデータを作成
      const cleanQuestionData: any = {
        reviewQuestionRequestId: request.id,
        teacherId: user.uid,
        teacherName: user.displayName,
        subject: request.subject,
        unit: request.unit,
        title: questionData.title.trim(),
        content: questionData.content.trim(),
        type: questionData.type,
        difficulty: questionData.difficulty,
        estimatedTime: questionData.estimatedTime,
        targetStage: selectedStage
      };

      // 選択問題の場合のみoptionsを追加
      if (questionData.type === 'multiple_choice') {
        const validOptions = questionData.options.filter(opt => opt.trim());
        if (validOptions.length >= 2) {
          cleanQuestionData.options = validOptions;
        }
      }

      // 正解が入力されている場合のみ追加
      if (questionData.answer.trim()) {
        cleanQuestionData.answer = questionData.answer.trim();
      }

      // 解説が入力されている場合のみ追加
      if (questionData.explanation.trim()) {
        cleanQuestionData.explanation = questionData.explanation.trim();
      }

      console.log('📝 Clean question data:', cleanQuestionData);

      await ReviewQuestionRequestService.assignQuestionToRequest(request.id, selectedStage, cleanQuestionData);
      
      // フォームをリセット
      setQuestionData({
        title: '',
        content: '',
        type: 'text',
        options: ['', '', '', ''],
        answer: '',
        explanation: '',
        difficulty: 'medium',
        estimatedTime: 15
      });

      // 割り当て済み問題を再読み込み
      await loadAssignedQuestions();

      toast({
        title: "問題割り当て完了",
        description: `第${selectedStage}回復習用の問題を割り当てました`
      });

      // 全ての段階に問題が割り当てられた場合はリクエストを完了状態に更新
      const updatedQuestions = await ReviewQuestionRequestService.getAssignedQuestions(request.id);
      if (updatedQuestions.length >= 5) {
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

  const isStageAssigned = (stage: ReviewStage) => {
    return assignedQuestions.some(q => q.targetStage === stage);
  };

  const getDifficultyLabel = (difficulty: ReviewQuestion['difficulty']) => {
    switch (difficulty) {
      case 'easy': return '簡単';
      case 'medium': return '普通';
      case 'hard': return '難しい';
      default: return difficulty;
    }
  };

  const getTypeLabel = (type: ReviewQuestion['type']) => {
    switch (type) {
      case 'multiple_choice': return '選択問題';
      case 'text': return '記述問題';
      case 'calculation': return '計算問題';
      case 'essay': return '論述問題';
      default: return type;
    }
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
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold">復習問題の割り当て</h2>
            <Badge variant="outline">
              {request.subject} - {request.unit}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
          {/* リクエスト情報 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>リクエスト内容</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <strong>学習者:</strong>
                    <span>{request.userName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <strong>リクエスト日:</strong>
                    <span>{request.createdAt.toLocaleDateString('ja-JP')}</span>
                  </div>
                </div>
                <div><strong>単元:</strong> {request.unit}</div>
                <div><strong>学習内容:</strong> {request.content}</div>
                {request.details && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <strong>詳細:</strong> {request.details}
                  </div>
                )}
                {request.memo && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <strong>学習者のメモ:</strong> {request.memo}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 割り当て状況 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>復習問題割り当て状況 ({assignedQuestions.length}/5)</CardTitle>
              <p className="text-sm text-gray-600">
                エビングハウスの忘却曲線に基づく5段階復習システム
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingQuestions ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                  <span>読み込み中...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5].map((stage) => {
                    const assigned = isStageAssigned(stage as ReviewStage);
                    const assignedQuestion = assignedQuestions.find(q => q.targetStage === stage);
                    const isSelected = selectedStage === stage;
                    
                    return (
                      <div
                        key={stage}
                        className={`p-3 rounded-lg border text-center cursor-pointer transition-all hover:shadow-sm ${
                          assigned 
                            ? 'bg-green-100 border-green-300 shadow-sm' 
                            : isSelected
                            ? 'bg-blue-100 border-blue-300 shadow-sm ring-2 ring-blue-200'
                            : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
                        }`}
                        onClick={() => !assigned && setSelectedStage(stage as ReviewStage)}
                      >
                        <div className="font-semibold text-sm">第{stage}回</div>
                        <div className="text-xs text-gray-600 mt-1 mb-2">
                          {getStageSchedule(stage as ReviewStage)}
                        </div>
                        <div className="text-xs">
                          {assigned ? (
                            <div className="flex items-center justify-center">
                              <CheckCircle className="h-3 w-3 text-green-600 mr-1" />
                              <span className="text-green-800 font-medium">完了</span>
                            </div>
                          ) : isSelected ? (
                            <span className="text-blue-800 font-medium">選択中</span>
                          ) : (
                            <span className="text-gray-500">未作成</span>
                          )}
                        </div>
                        {assignedQuestion && (
                          <div className="text-xs text-gray-600 mt-2 p-1 bg-white rounded border truncate">
                            {assignedQuestion.title}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* 進捗バー */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">進捗</span>
                  <span className="text-sm text-gray-600">{assignedQuestions.length}/5 完了</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(assignedQuestions.length / 5) * 100}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 問題作成フォーム */}
          {!isStageAssigned(selectedStage) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>第{selectedStage}回復習用問題の作成</span>
                  <Badge variant="outline" className="bg-blue-50">
                    {getStageSchedule(selectedStage)}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-gray-600">
                  学習から{getStageSchedule(selectedStage)}に復習する問題を作成します
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 問題タイトル */}
                    <div className="space-y-2">
                      <Label htmlFor="title">問題タイトル *</Label>
                      <Input
                        id="title"
                        value={questionData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        placeholder="例: 二次関数の最大値・最小値"
                        required
                        className="h-12"
                      />
                    </div>

                    {/* 問題タイプ */}
                    <div className="space-y-2">
                      <Label htmlFor="type">問題タイプ</Label>
                      <Select value={questionData.type} onValueChange={(value) => handleInputChange('type', value)}>
                        <SelectTrigger className="h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">記述問題</SelectItem>
                          <SelectItem value="multiple_choice">選択問題</SelectItem>
                          <SelectItem value="calculation">計算問題</SelectItem>
                          <SelectItem value="essay">論述問題</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* 問題内容 */}
                  <div className="space-y-2">
                    <Label htmlFor="content">問題内容 *</Label>
                    <Textarea
                      id="content"
                      value={questionData.content}
                      onChange={(e) => handleInputChange('content', e.target.value)}
                      placeholder="問題文を入力してください"
                      rows={5}
                      required
                      className="text-sm"
                    />
                  </div>

                  {/* 選択肢（選択問題の場合のみ） */}
                  {questionData.type === 'multiple_choice' && (
                    <div className="space-y-3">
                      <Label>選択肢</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {questionData.options.map((option, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
                              {String.fromCharCode(65 + index)}
                            </span>
                            <Input
                              value={option}
                              onChange={(e) => handleOptionChange(index, e.target.value)}
                              placeholder={`選択肢${String.fromCharCode(65 + index)}`}
                              className="h-10"
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500">
                        選択問題の場合は最低2つの選択肢を入力してください
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 正解・参考答案 */}
                    <div className="space-y-2">
                      <Label htmlFor="answer">正解・参考答案</Label>
                      <Input
                        id="answer"
                        value={questionData.answer}
                        onChange={(e) => handleInputChange('answer', e.target.value)}
                        placeholder="正解や参考答案"
                        className="h-10"
                      />
                    </div>

                    {/* 難易度 */}
                    <div className="space-y-2">
                      <Label htmlFor="difficulty">難易度</Label>
                      <Select value={questionData.difficulty} onValueChange={(value) => handleInputChange('difficulty', value)}>
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">簡単</SelectItem>
                          <SelectItem value="medium">普通</SelectItem>
                          <SelectItem value="hard">難しい</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 推定時間 */}
                    <div className="space-y-2">
                      <Label htmlFor="estimatedTime">推定時間（分）</Label>
                      <Input
                        id="estimatedTime"
                        type="number"
                        min="1"
                        max="120"
                        value={questionData.estimatedTime}
                        onChange={(e) => handleInputChange('estimatedTime', parseInt(e.target.value) || 15)}
                        className="h-10"
                      />
                    </div>
                  </div>

                  {/* 解説 */}
                  <div className="space-y-2">
                    <Label htmlFor="explanation">解説（任意）</Label>
                    <Textarea
                      id="explanation"
                      value={questionData.explanation}
                      onChange={(e) => handleInputChange('explanation', e.target.value)}
                      placeholder="解説や解答のポイント、学習者へのアドバイスを入力"
                      rows={4}
                      className="text-sm"
                    />
                  </div>

                  {/* 送信ボタン */}
                  <div className="flex justify-end space-x-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onClose}>
                      キャンセル
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          割り当て中...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          第{selectedStage}回に割り当て
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* 既に割り当て済みの段階の場合 */}
          {isStageAssigned(selectedStage) && (
            <Card>
              <CardContent className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-800 mb-2">
                  第{selectedStage}回復習用問題は既に割り当て済みです
                </h3>
                <p className="text-green-600 mb-6">
                  他の段階を選択して問題を作成してください
                </p>
                
                {/* 割り当て済み問題の詳細表示 */}
                {(() => {
                  const assignedQuestion = assignedQuestions.find(q => q.targetStage === selectedStage);
                  if (!assignedQuestion) return null;
                  
                  return (
                    <div className="bg-green-50 p-6 rounded-lg border border-green-200 text-left max-w-md mx-auto">
                      <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                        <BookOpen className="h-4 w-4 mr-2" />
                        割り当て済み問題
                      </h4>
                      <div className="space-y-2 text-sm text-green-700">
                        <div><strong>タイトル:</strong> {assignedQuestion.title}</div>
                        <div><strong>タイプ:</strong> {getTypeLabel(assignedQuestion.type)}</div>
                        <div><strong>難易度:</strong> {getDifficultyLabel(assignedQuestion.difficulty)}</div>
                        <div><strong>推定時間:</strong> {assignedQuestion.estimatedTime}分</div>
                        <div><strong>作成者:</strong> {assignedQuestion.teacherName}</div>
                        <div><strong>作成日:</strong> {assignedQuestion.createdAt.toLocaleDateString('ja-JP')}</div>
                      </div>
                      
                      {assignedQuestion.content && (
                        <div className="mt-3 p-3 bg-white rounded border">
                          <div className="text-xs text-gray-600 mb-1">問題内容（抜粋）:</div>
                          <div className="text-xs text-gray-800 line-clamp-3">
                            {assignedQuestion.content.length > 100 
                              ? `${assignedQuestion.content.substring(0, 100)}...` 
                              : assignedQuestion.content
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}