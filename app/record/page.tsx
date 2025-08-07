'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { StudyRecordService } from '@/lib/db/studyRecords';
import { ReviewQuestionRequestService } from '@/lib/db/reviewQuestionRequestService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Subject } from '@/types/study';
import { Clock, BookOpen, Target, MessageCircle, RefreshCw, Calculator, Calendar } from 'lucide-react';

export default function RecordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // タイマーからの自動入力データ
  const [timerData, setTimerData] = useState<any>(null);
  const [isFromTimer, setIsFromTimer] = useState(false);
  
  // フォーム状態
  const [subject, setSubject] = useState<Subject>('数学');
  const [studyDate, setStudyDate] = useState(''); // 新規追加：日付選択
  const [studyMinutes, setStudyMinutes] = useState<number>(60);
  const [startTime, setStartTime] = useState('');
  const [content, setContent] = useState('');
  const [details, setDetails] = useState('');
  const [memo, setMemo] = useState('');
  const [shouldReview, setShouldReview] = useState(false);
  const [requestReviewQuestions, setRequestReviewQuestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // 本日の日付をデフォルト値として設定
    const today = new Date().toISOString().split('T')[0];
    setStudyDate(today);

    const dataParam = searchParams.get('data');
    if (dataParam) {
      try {
        const data = JSON.parse(decodeURIComponent(dataParam));
        setTimerData(data);
        setIsFromTimer(true);
        
        // タイマーデータで自動入力
        if (data.subject) setSubject(data.subject);
        if (data.studyHours) setStudyMinutes(Math.round(data.studyHours * 60));
        if (data.startTime) setStartTime(data.startTime);
        if (data.studyDate) setStudyDate(data.studyDate); // タイマーから日付も取得
      } catch (error) {
        console.error('Failed to parse timer data:', error);
      }
    } else {
      // 手動記録の場合のデフォルト値設定
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneHourAgoTime = oneHourAgo.toTimeString().slice(0, 5);
      
      setStartTime(oneHourAgoTime);
      setStudyMinutes(60); // デフォルト60分
    }
  }, [searchParams, user, router]);

  // 利用可能科目の取得
  const getAvailableSubjects = (): Subject[] => {
    if (!user) return ['数学', '英語', '国語', '情報'];
    
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

  // 時間計算（開始時間と勉強分数から終了時間を算出）
  const calculateEndTime = (start: string, minutes: number): string => {
    if (!start || minutes <= 0) return '';
    
    const [startHour, startMin] = start.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = startMinutes + minutes;
    
    const endHour = Math.floor(endMinutes / 60) % 24;
    const endMin = Math.floor(endMinutes % 60);
    
    return `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`;
  };

  // 開始時間・勉強分数変更時の終了時間自動計算
  const endTime = calculateEndTime(startTime, studyMinutes);

  // 成功メッセージの取得
  const getSuccessMessage = () => {
    if (shouldReview && requestReviewQuestions) {
      return "勉強記録を保存し、復習リストに追加、復習問題をリクエストしました！";
    } else if (shouldReview) {
      return "勉強記録を保存し、復習リストに追加しました！";
    } else {
      return "勉強記録を保存しました。お疲れ様でした！";
    }
  };

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

    if (!subject) {
      toast({
        title: "エラー",
        description: "科目を選択してください",
        variant: "destructive"
      });
      return;
    }

    if (studyMinutes <= 0) {
      toast({
        title: "エラー",
        description: "勉強時間は0より大きい値を入力してください",
        variant: "destructive"
      });
      return;
    }

    if (!studyDate) {
      toast({
        title: "エラー",
        description: "日付を選択してください",
        variant: "destructive"
      });
      return;
    }

    if (!user) return;

    setIsSubmitting(true);
    
    try {
      const recordData: any = {
        userId: user.uid,
        studyDate: studyDate, // 選択された日付を使用
        subject: subject,
        studyMinutes: studyMinutes, // 分単位で直接保存
        startTime: startTime,
        endTime: endTime,
        content: content.trim(),
        shouldReview: shouldReview,
        requestReviewQuestions: requestReviewQuestions
      };

      // 空でない場合のみ追加
      if (details.trim()) {
        recordData.details = details.trim();
      }
      
      if (memo.trim()) {
        recordData.memo = memo.trim();
      }

      if (timerData?.sessionId) {
        recordData.sessionId = timerData.sessionId;
      }

      console.log('Saving record data:', recordData);

      const recordId = await StudyRecordService.createRecord(recordData);
      
      // 復習問題リクエストの作成
      if (shouldReview && requestReviewQuestions) {
        try {
          console.log('Creating review question request...');
          await ReviewQuestionRequestService.createRequest({
            userId: user.uid,
            userName: user.displayName,
            studyRecordId: recordId,
            subject: subject,
            unit: content.trim(),
            content: details.trim() || content.trim(),
            details: details.trim(),
            memo: memo.trim()
          });
          console.log('Review question request created successfully');
        } catch (error) {
          console.error('Error creating review question request:', error);
          // リクエスト作成に失敗しても、学習記録の保存は成功とする
        }
      }
      
      toast({
        title: "記録完了！",
        description: getSuccessMessage(),
      });

      router.push('/');
    } catch (error) {
      console.error('Failed to save record:', error);
      toast({
        title: "エラー",
        description: `記録の保存に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  const availableSubjects = getAvailableSubjects();

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
                    <span className="font-medium">{getSubjectDisplayName(timerData.subject)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-600" />
                    <Badge variant="secondary">勉強時間</Badge>
                    <span className="font-medium">{Math.round(timerData.studyHours * 60)}分</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-600" />
                    <Badge variant="secondary">時間</Badge>
                    <span className="font-medium">{timerData.startTime} 〜 {calculateEndTime(timerData.startTime, Math.round(timerData.studyHours * 60))}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <Badge variant="secondary">日付</Badge>
                    <span className="font-medium">{studyDate}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 手動記録時の入力フィールド */}
            {!isFromTimer && (
              <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                  📝 学習情報を入力
                </h3>
                
                {/* 科目選択 */}
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-base">
                    📚 科目
                    <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Select value={subject} onValueChange={(value) => setSubject(value as Subject)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="科目を選択">
                        {getSubjectDisplayName(subject)}
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

                {/* 日付・時間設定を横並びに */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 学習日 */}
                  <div className="space-y-2">
                    <Label htmlFor="studyDate" className="text-base">
                      📅 学習日
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      id="studyDate"
                      type="date"
                      value={studyDate}
                      onChange={(e) => setStudyDate(e.target.value)}
                      className="h-12"
                      required
                    />
                  </div>

                  {/* 開始時間 */}
                  <div className="space-y-2">
                    <Label htmlFor="startTime" className="text-base">
                      🕒 開始時間
                      <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="h-12"
                      required
                    />
                  </div>

                  {/* 勉強時間（分） */}
                  <div className="space-y-2">
                    <Label htmlFor="studyMinutes" className="text-base">
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
                        value={studyMinutes}
                        onChange={(e) => setStudyMinutes(Number(e.target.value))}
                        className="h-12 pr-12"
                        required
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                        分
                      </span>
                    </div>
                  </div>
                </div>

                {/* 終了時間表示（自動計算） */}
                {startTime && studyMinutes > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-700">
                        <strong>終了予定時間:</strong> {endTime}
                      </span>
                      <span className="text-gray-500">
                        ({Math.floor(studyMinutes / 60)}時間{studyMinutes % 60}分)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* タイマー使用時も日付を表示・編集可能にする */}
            {isFromTimer && (
              <div className="space-y-2">
                <Label htmlFor="studyDateTimer" className="text-base">
                  📅 学習日
                  <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="studyDateTimer"
                  type="date"
                  value={studyDate}
                  onChange={(e) => setStudyDate(e.target.value)}
                  className="h-12"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  必要に応じて日付を変更できます
                </p>
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
                今日の勉強の感想（任意）
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

            {/* 復習リスト登録チェックボックス */}
            <div className="space-y-2">
              <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <input
                  type="checkbox"
                  id="shouldReview"
                  checked={shouldReview}
                  onChange={(e) => {
                    setShouldReview(e.target.checked);
                    if (!e.target.checked) {
                      setRequestReviewQuestions(false); // 復習リストのチェックを外したら復習問題リクエストも外す
                    }
                  }}
                  className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <Label htmlFor="shouldReview" className="text-base flex items-center gap-2 cursor-pointer">
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                  復習リストに登録する
                </Label>
              </div>
              <p className="text-sm text-muted-foreground ml-8">
                チェックすると、この学習内容が復習リストに追加され、後日復習の通知を受け取れます
              </p>

              {/* 復習問題リクエストチェックボックス（条件付き表示） */}
              {shouldReview && (
                <div className="ml-8 mt-3">
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <input
                      type="checkbox"
                      id="requestReviewQuestions"
                      checked={requestReviewQuestions}
                      onChange={(e) => setRequestReviewQuestions(e.target.checked)}
                      className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                    />
                    <Label htmlFor="requestReviewQuestions" className="text-sm flex items-center gap-2 cursor-pointer">
                      <MessageCircle className="w-4 h-4 text-green-600" />
                      復習問題をリクエストする
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    チェックすると、管理者に復習問題の作成をリクエストします
                  </p>
                </div>
              )}
            </div>

            {/* 送信ボタン */}
            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={isSubmitting || !content.trim() || !subject || studyMinutes <= 0 || !studyDate}
                className="w-full h-14 text-base"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    保存中...
                  </>
                ) : (
                  <>
                    💾 記録完了してホームに戻る
                    {shouldReview && requestReviewQuestions && <span className="ml-2">（復習リスト登録・問題リクエスト済み）</span>}
                    {shouldReview && !requestReviewQuestions && <span className="ml-2">（復習リスト登録済み）</span>}
                  </>
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
              <li>• 日付は実際に学習した日を選択してください</li>
              <li>• 単元名は具体的に（例：二次関数の最大値・最小値）</li>
              <li>• 詳細には解いた問題数や理解度を記録</li>
              <li>• 感想には次回への改善点も書いてみよう</li>
              <li>• 復習したい内容は「復習リスト登録」をチェック</li>
              <li>• 復習問題が欲しい場合は「復習問題をリクエスト」もチェック</li>
              {!isFromTimer && (
                <>
                  <li>• 開始時間・勉強時間を入力すると終了時間が自動表示されます</li>
                  <li>• 勉強時間は分単位で入力してください（例：90分 = 1時間30分）</li>
                </>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}