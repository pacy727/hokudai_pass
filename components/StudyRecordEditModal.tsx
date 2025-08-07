'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { StudyRecordService } from '@/lib/db/studyRecords';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { StudyRecord, Subject } from '@/types/study';
import { Clock, BookOpen, Save, X, Calendar, AlertTriangle, Trash2 } from 'lucide-react';

interface StudyRecordEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: StudyRecord;
  onUpdate: (updatedRecord: StudyRecord) => void;
  onDelete: (recordId: string) => void;
}

export function StudyRecordEditModal({
  isOpen,
  onClose,
  record,
  onUpdate,
  onDelete
}: StudyRecordEditModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // フォーム状態
  const [formData, setFormData] = useState({
    studyDate: '',
    subject: '' as Subject,
    studyMinutes: 0,
    startTime: '',
    endTime: '',
    content: '',
    details: '',
    memo: '',
    shouldReview: false,
    requestReviewQuestions: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 記録データからフォームデータを初期化
  useEffect(() => {
    if (isOpen && record) {
      setFormData({
        studyDate: record.studyDate,
        subject: record.subject,
        studyMinutes: record.studyMinutes,
        startTime: record.startTime,
        endTime: record.endTime,
        content: record.content,
        details: record.details || '',
        memo: record.memo || '',
        shouldReview: record.shouldReview || false,
        requestReviewQuestions: record.requestReviewQuestions || false
      });
    }
  }, [isOpen, record]);

  // 利用可能科目の取得
  const getAvailableSubjects = (): Subject[] => {
    if (!user) return ['英語', '数学', '国語', '情報'];
    
    const common: Subject[] = ['英語', '数学', '国語', '情報'];
    
    if (user.course === 'liberal') {
      const subjects: Subject[] = [...common, '社会1', '社会2', '理科'];
      if (user.subjectSelection?.enableSecondScience) {
        subjects.push('理科2');
      }
      return subjects;
    } else {
      const subjects: Subject[] = [...common, '理科1', '理科2', '社会'];
      if (user.subjectSelection?.enableSecondSocial) {
        subjects.push('社会2');
      }
      return subjects;
    }
  };

  // カスタム科目名の取得
  const getSubjectDisplayName = (subjectKey: Subject): string => {
    if (!user?.customSubjects) return subjectKey;
    const customName = user.customSubjects[subjectKey as keyof typeof user.customSubjects];
    return customName || subjectKey;
  };

  // 終了時間の自動計算
  const calculateEndTime = (startTime: string, minutes: number): string => {
    if (!startTime || minutes <= 0) return '';
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = startMinutes + minutes;
    
    const endHour = Math.floor(endMinutes / 60) % 24;
    const endMin = Math.floor(endMinutes % 60);
    
    return `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
  };

  // フォームデータ更新
  const updateFormData = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // 開始時間または勉強時間が変更された場合、終了時間を自動計算
      if (field === 'startTime' || field === 'studyMinutes') {
        updated.endTime = calculateEndTime(
          field === 'startTime' ? value : updated.startTime,
          field === 'studyMinutes' ? value : updated.studyMinutes
        );
      }
      
      return updated;
    });
  };

  // 更新処理
  const handleUpdate = async () => {
    if (!formData.content.trim()) {
      toast({
        title: "入力エラー",
        description: "学習した単元を入力してください",
        variant: "destructive"
      });
      return;
    }

    if (formData.studyMinutes <= 0) {
      toast({
        title: "入力エラー",
        description: "勉強時間は0より大きい値を入力してください",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 更新データを準備
      const updates: Partial<StudyRecord> = {
        studyDate: formData.studyDate,
        subject: formData.subject,
        studyMinutes: formData.studyMinutes,
        startTime: formData.startTime,
        endTime: formData.endTime,
        content: formData.content.trim(),
        details: formData.details.trim(),
        memo: formData.memo.trim(),
        shouldReview: formData.shouldReview,
        requestReviewQuestions: formData.requestReviewQuestions
      };

      await StudyRecordService.updateRecord(record.id, updates);
      
      // 更新された記録を作成
      const updatedRecord: StudyRecord = {
        ...record,
        ...updates
      };

      onUpdate(updatedRecord);
      
      toast({
        title: "更新完了！",
        description: "学習記録を更新しました"
      });

      onClose();
    } catch (error) {
      console.error('Failed to update record:', error);
      toast({
        title: "エラー",
        description: "記録の更新に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 削除処理
  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      await StudyRecordService.deleteRecord(record.id);
      
      onDelete(record.id);
      
      toast({
        title: "削除完了",
        description: "学習記録を削除しました"
      });

      onClose();
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete record:', error);
      toast({
        title: "エラー",
        description: "記録の削除に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  const availableSubjects = getAvailableSubjects();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              学習記録の編集
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 基本情報 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 学習日 */}
            <div className="space-y-2">
              <Label htmlFor="studyDate">
                📅 学習日
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="studyDate"
                type="date"
                value={formData.studyDate}
                onChange={(e) => updateFormData('studyDate', e.target.value)}
                className="h-12"
                required
              />
            </div>

            {/* 科目 */}
            <div className="space-y-2">
              <Label htmlFor="subject">
                📚 科目
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Select value={formData.subject} onValueChange={(value) => updateFormData('subject', value)}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="科目を選択">
                    {getSubjectDisplayName(formData.subject)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableSubjects.map((subjectOption) => (
                    <SelectItem key={subjectOption} value={subjectOption}>
                      {getSubjectDisplayName(subjectOption)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 勉強時間（分） */}
            <div className="space-y-2">
              <Label htmlFor="studyMinutes">
                ⏱️ 勉強時間
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="studyMinutes"
                  type="number"
                  step="1"
                  min="1"
                  max="1440"
                  value={formData.studyMinutes}
                  onChange={(e) => updateFormData('studyMinutes', Number(e.target.value))}
                  className="h-12 pr-12"
                  required
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                  分
                </span>
              </div>
            </div>
          </div>

          {/* 時間設定 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 開始時間 */}
            <div className="space-y-2">
              <Label htmlFor="startTime">
                🕒 開始時間
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => updateFormData('startTime', e.target.value)}
                className="h-12"
                required
              />
            </div>

            {/* 終了時間（自動計算） */}
            <div className="space-y-2">
              <Label htmlFor="endTime">🕐 終了時間（自動計算）</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                className="h-12 bg-gray-50"
                readOnly
              />
            </div>
          </div>

          {/* 学習内容 */}
          <div className="space-y-2">
            <Label htmlFor="content">
              📖 学習した単元
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="content"
              value={formData.content}
              onChange={(e) => updateFormData('content', e.target.value)}
              placeholder="例: 二次関数とグラフの応用"
              required
              className="text-base h-12"
            />
          </div>

          {/* 学習詳細 */}
          <div className="space-y-2">
            <Label htmlFor="details">📝 学習の詳細（任意）</Label>
            <Textarea
              id="details"
              value={formData.details}
              onChange={(e) => updateFormData('details', e.target.value)}
              placeholder="例: 基本問題→応用問題の順で進めた。判別式の理解が深まった。"
              rows={3}
              className="text-base"
            />
          </div>

          {/* 感想メモ */}
          <div className="space-y-2">
            <Label htmlFor="memo">💭 感想・メモ（任意）</Label>
            <Textarea
              id="memo"
              value={formData.memo}
              onChange={(e) => updateFormData('memo', e.target.value)}
              placeholder="例: とても集中できた！明日も頑張る！"
              rows={2}
              className="text-base"
            />
          </div>

          {/* 復習設定 */}
          <div className="space-y-3">
            {/* 復習リスト登録 */}
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <input
                type="checkbox"
                id="shouldReview"
                checked={formData.shouldReview}
                onChange={(e) => {
                  updateFormData('shouldReview', e.target.checked);
                  if (!e.target.checked) {
                    updateFormData('requestReviewQuestions', false);
                  }
                }}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <Label htmlFor="shouldReview" className="text-sm flex items-center gap-2 cursor-pointer">
                <Clock className="w-4 h-4 text-blue-600" />
                復習リストに登録
              </Label>
            </div>

            {/* 復習問題リクエスト */}
            {formData.shouldReview && (
              <div className="ml-6">
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <input
                    type="checkbox"
                    id="requestReviewQuestions"
                    checked={formData.requestReviewQuestions}
                    onChange={(e) => updateFormData('requestReviewQuestions', e.target.checked)}
                    className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                  />
                  <Label htmlFor="requestReviewQuestions" className="text-sm flex items-center gap-2 cursor-pointer">
                    <BookOpen className="w-4 h-4 text-green-600" />
                    復習問題をリクエスト
                  </Label>
                </div>
              </div>
            )}
          </div>

          {/* 削除確認 */}
          {showDeleteConfirm && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-medium text-red-800">記録を削除しますか？</h4>
                  <p className="text-sm text-red-700 mt-1">
                    この操作は取り消せません。この学習記録は完全に削除されます。
                  </p>
                  <div className="flex gap-3 mt-3">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                          削除中...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3 h-3 mr-1" />
                          削除実行
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex flex-col gap-3 pt-4 border-t">
            {/* メインアクション */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 h-12"
              >
                キャンセル
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={isSubmitting || !formData.content.trim() || formData.studyMinutes <= 0}
                className="flex-1 h-12"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    更新中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    更新
                  </>
                )}
              </Button>
            </div>

            {/* 削除ボタン */}
            {!showDeleteConfirm && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full h-10"
                disabled={isSubmitting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                この記録を削除
              </Button>
            )}
          </div>

          {/* 記録情報 */}
          <div className="mt-6 p-3 bg-gray-50 rounded-lg text-sm">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Calendar className="w-3 h-3" />
              <span>記録ID: {record.id.slice(0, 8)}...</span>
            </div>
            <div className="text-gray-500 text-xs">
              作成日: {record.createdAt.toLocaleString('ja-JP')}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}