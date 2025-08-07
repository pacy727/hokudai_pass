'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ReviewQuestionRequest } from '@/types/review';
import { X, XCircle, AlertTriangle } from 'lucide-react';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ReviewQuestionRequest;
  onReject: (requestId: string, reason: string) => Promise<void>;
}

export function RejectionModal({
  isOpen,
  onClose,
  request,
  onReject
}: RejectionModalProps) {
  const { toast } = useToast();
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rejectionReason.trim()) {
      toast({
        title: "入力エラー",
        description: "却下理由を入力してください",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onReject(request.id, rejectionReason.trim());
      
      toast({
        title: "リクエスト却下完了",
        description: "復習問題リクエストを却下しました"
      });
      
      setRejectionReason('');
      onClose();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "エラー",
        description: "却下処理に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-red-700">
              <XCircle className="h-5 w-5" />
              <span>復習問題リクエストの却下</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* リクエスト情報 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <h4 className="font-semibold mb-2">却下対象のリクエスト</h4>
            <div className="space-y-2 text-sm">
              <div><strong>学習者:</strong> {request.userName}</div>
              <div><strong>科目:</strong> {request.subject}</div>
              <div><strong>単元:</strong> {request.unit}</div>
              <div><strong>内容:</strong> {request.content}</div>
              {request.details && (
                <div><strong>詳細:</strong> {request.details}</div>
              )}
              <div><strong>リクエスト日:</strong> {request.createdAt.toLocaleDateString('ja-JP')}</div>
            </div>
          </div>

          {/* 警告メッセージ */}
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-700">
                <strong>注意:</strong> このリクエストを却下すると、学習者に却下理由が通知されます。
                適切な理由を入力してください。
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 却下理由入力 */}
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">
                却下理由 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="例: 内容が不明確なため、詳細を追加して再度リクエストしてください。"
                rows={4}
                required
                className="text-sm"
              />
              <p className="text-xs text-gray-500">
                学習者が理解できるよう、具体的で建設的な理由を記入してください。
              </p>
            </div>

            {/* 送信ボタン */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                キャンセル
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !rejectionReason.trim()}
                variant="destructive"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    却下処理中...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    リクエストを却下
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