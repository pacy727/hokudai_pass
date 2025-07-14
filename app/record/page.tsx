'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { StudyRecordService } from '@/lib/db/studyRecords';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Subject } from '@/types/study';
import { Clock, BookOpen, Target, MessageCircle } from 'lucide-react';

export default function RecordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // タイマーからの自動入力データ
  const [timerData, setTimerData] = useState<any>(null);
  const [isFromTimer, setIsFromTimer] = useState(false);
  
  // フォーム状態
  const [content, setContent] = useState('');
  const [details, setDetails] = useState('');
  const [memo, setMemo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const dataParam = searchParams.get('data');
    if (dataParam) {
      try {
        const data = JSON.parse(decodeURIComponent(dataParam));
        setTimerData(data);
        setIsFromTimer(true);
      } catch (error) {
        console.error('Failed to parse timer data:', error);
      }
    }
  }, [searchParams, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast({
        title: "エラー",
        description: "学習した単元を入力してください",
        variant: "destructive"
      });
      return;
    }

    if (!user) return;

    setIsSubmitting(true);
    
    try {
      const recordData = {
        userId: user.uid,
        studyDate: timerData?.studyDate || new Date().toISOString().split('T')[0],
        subject: (timerData?.subject || '数学') as Subject,
        studyHours: timerData?.studyHours || 1,
        startTime: timerData?.startTime || '00:00',
        endTime: timerData?.endTime || '01:00',
        content: content.trim(),
        details: details.trim() || undefined,
        memo: memo.trim() || undefined
      };

      await StudyRecordService.createRecord(recordData);
      
      toast({
        title: "記録完了！",
        description: "勉強記録を保存しました。お疲れ様でした！",
      });

      router.push('/');
    } catch (error) {
      console.error('Failed to save record:', error);
      toast({
        title: "エラー",
        description: "記録の保存に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            {isFromTimer ? "✏️ 勉強お疲れ様！記録を完成させよう！" : "✏️ 学習記録入力"}
          </CardTitle>
          <p className="text-center text-muted-foreground text-sm">
            {isFromTimer ? "タイマーで計測した時間を記録に残します" : "手動で学習記録を入力します"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* タイマー連携時の自動入力表示 */}
            {isFromTimer && timerData && (
              <div className="space-y-3 bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-800 flex items-center gap-2">
                  ✅ タイマーで自動記録済み
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-green-600" />
                    <Badge variant="secondary">科目</Badge>
                    <span className="font-medium">{timerData.subject}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-600" />
                    <Badge variant="secondary">勉強時間</Badge>
                    <span className="font-medium">{timerData.studyHours}時間</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-600" />
                    <Badge variant="secondary">時間</Badge>
                    <span className="font-medium">{timerData.startTime} 〜 {timerData.endTime}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 学習内容入力（必須） */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-base">
                📖 今日学習した単元は？
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="例: 二次関数とグラフの応用"
                required
                className="text-base h-12"
              />
              {isFromTimer && (
                <p className="text-sm text-muted-foreground">
                  ↑ここだけは必須入力してください
                </p>
              )}
            </div>

            {/* 学習詳細（任意） */}
            <div className="space-y-2">
              <Label htmlFor="details" className="text-base">
                📝 どんな勉強をしましたか？（任意）
              </Label>
              <Textarea
                id="details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="例: 基本問題→応用問題の順で進めた。判別式の理解が深まった。"
                rows={3}
                className="text-base"
              />
            </div>

            {/* 感想メモ（任意） */}
            <div className="space-y-2">
              <Label htmlFor="memo" className="text-base flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                今日の勉強はどうでしたか？（任意）
              </Label>
              <Textarea
                id="memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="例: とても集中できた！明日も頑張る！"
                rows={2}
                className="text-base"
              />
            </div>

            {/* 送信ボタン */}
            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                className="w-full h-14 text-base"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    保存中...
                  </>
                ) : (
                  "💾 記録完了してホームに戻る"
                )}
              </Button>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/')}
                  className="flex-1 h-12"
                >
                  🏠 記録せずに戻る
                </Button>
                {isFromTimer && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/timer')}
                    className="flex-1 h-12"
                  >
                    🔄 タイマーに戻る
                  </Button>
                )}
              </div>
            </div>
          </form>

          {/* ヒント */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">💡 記録のコツ</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 単元名は具体的に（例：二次関数の最大値・最小値）</li>
              <li>• 詳細には解いた問題数や理解度を記録</li>
              <li>• 感想には次回への改善点も書いてみよう</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
