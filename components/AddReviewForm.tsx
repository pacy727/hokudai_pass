"use client"

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus } from 'lucide-react';
import { Subject } from '@/types/study';
import { ReviewItem } from '@/types/review';
import { ReviewService } from '@/lib/db/reviewService';
import { useToast } from '@/components/ui/use-toast';

interface AddReviewFormProps {
  userId: string;
  availableSubjects: Subject[];
  getSubjectDisplayName: (subject: Subject) => string;
  onSuccess: () => void;
  onClose: () => void;
}

export function AddReviewForm({ 
  userId, 
  availableSubjects, 
  getSubjectDisplayName, 
  onSuccess, 
  onClose 
}: AddReviewFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: '' as Subject,
    unit: '',
    content: '',
    reviewDate: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.unit || !formData.content || !formData.reviewDate) {
      toast({
        title: "入力エラー",
        description: "すべての必須項目を入力してください",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const reviewDate = new Date(formData.reviewDate);
      const nextReviewDate = new Date(reviewDate);
      
      const reviewItem: Omit<ReviewItem, 'id' | 'createdAt' | 'updatedAt'> = {
        userId,
        subject: formData.subject,
        unit: formData.unit,
        content: formData.content,
        reviewDate,
        priority: formData.priority,
        difficulty: formData.difficulty,
        completedCount: 0,
        totalAttempts: 0,
        nextReviewDate,
        status: 'pending',
        studyRecordId: '' // ここを追加
      };

      await ReviewService.createReviewItem(reviewItem);
      
      toast({
        title: "復習項目を追加しました",
        description: "新しい復習項目が正常に追加されました",
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating review item:', error);
      toast({
        title: "エラー",
        description: "復習項目の追加に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>復習項目追加</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 教科選択 */}
              <div className="space-y-2">
                <Label htmlFor="subject">教科 *</Label>
                <Select value={formData.subject} onValueChange={(value) => handleInputChange('subject', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="教科を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubjects.map(subject => (
                      <SelectItem key={subject} value={subject}>
                        {getSubjectDisplayName(subject)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 復習期日 */}
              <div className="space-y-2">
                <Label htmlFor="reviewDate">復習期日 *</Label>
                <Input
                  id="reviewDate"
                  type="date"
                  value={formData.reviewDate}
                  onChange={(e) => handleInputChange('reviewDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {/* 単元 */}
            <div className="space-y-2">
              <Label htmlFor="unit">単元 *</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) => handleInputChange('unit', e.target.value)}
                placeholder="例: 二次関数、関係代名詞、明治維新"
              />
            </div>

            {/* 内容 */}
            <div className="space-y-2">
              <Label htmlFor="content">内容 *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                placeholder="復習する具体的な内容を記入してください"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 優先度 */}
              <div className="space-y-2">
                <Label htmlFor="priority">優先度</Label>
                <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="low">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 難易度 */}
              <div className="space-y-2">
                <Label htmlFor="difficulty">難易度</Label>
                <Select value={formData.difficulty} onValueChange={(value) => handleInputChange('difficulty', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">易</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="hard">難</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    追加中...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    追加
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}