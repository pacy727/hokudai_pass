'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { signOut } from 'firebase/auth';
import { auth, db, collections } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { UserSettings } from '@/types/auth';
import { Subject } from '@/types/study';
import { Settings, User, Target, BookOpen, Save, ArrowLeft, Plus, Minus, LogOut, GraduationCap } from 'lucide-react';

export default function SettingsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<UserSettings>({
    displayName: '',
    grade: 'その他',
    course: 'science',
    weeklyTarget: 56,
    customSubjects: {},
    subjectSelection: {}
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      setSettings({
        displayName: user.displayName,
        grade: user.grade || 'その他',
        course: user.course || 'science',
        weeklyTarget: user.weeklyTarget || 56,
        customSubjects: user.customSubjects || {},
        subjectSelection: user.subjectSelection || {}
      });
    }
  }, [user, isLoading, router]);

  const handleLogout = async () => {
    if (confirm('ログアウトしてもよろしいですか？')) {
      try {
        await signOut(auth);
        toast({
          title: "ログアウト完了",
          description: "お疲れ様でした！"
        });
        router.push('/login');
      } catch (error) {
        console.error('Logout error:', error);
        toast({
          title: "エラー",
          description: "ログアウトに失敗しました",
          variant: "destructive"
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    if (!settings.displayName.trim()) {
      toast({
        title: "エラー",
        description: "名前を入力してください",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const updateData = {
        displayName: settings.displayName.trim(),
        grade: settings.grade,
        course: settings.course,
        weeklyTarget: settings.weeklyTarget,
        customSubjects: settings.customSubjects,
        subjectSelection: settings.subjectSelection
      };

      await updateDoc(doc(db, collections.users, user.uid), updateData);
      
      // 設定保存後、useAuthStore の状態を即座に更新
      const updatedUser = {
        ...user,
        ...updateData
      };
      
      // AuthStore を直接更新（即座に反映）
      const { setUser } = useAuthStore.getState();
      setUser(updatedUser);
      
      toast({
        title: "設定保存完了！",
        description: "設定が正常に保存されました"
      });

      // 少し待ってからホームに戻る
      setTimeout(() => {
        router.push('/');
      }, 1000);
      
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast({
        title: "エラー",
        description: "設定の保存に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateCustomSubject = (key: keyof typeof settings.customSubjects, value: string) => {
    setSettings(prev => ({
      ...prev,
      customSubjects: {
        ...prev.customSubjects,
        [key]: value.trim() || undefined
      }
    }));
  };

  const toggleSubjectSelection = (key: keyof typeof settings.subjectSelection) => {
    setSettings(prev => ({
      ...prev,
      subjectSelection: {
        ...prev.subjectSelection,
        [key]: !prev.subjectSelection[key]
      }
    }));
  };

  // 利用可能科目の取得
  const getAvailableSubjects = (): Subject[] => {
    const common: Subject[] = ['英語', '数学', '国語', '情報'];
    
    if (settings.course === 'liberal') {
      // 文系: 社会1, 社会2, 理科 + 理科2(選択可能)
      const subjects: Subject[] = [...common, '社会1', '社会2', '理科'];
      if (settings.subjectSelection.enableSecondScience) {
        subjects.push('理科2');
      }
      return subjects;
    } else {
      // 理系: 理科1, 理科2, 社会 + 社会2(選択可能)
      const subjects: Subject[] = [...common, '理科1', '理科2', '社会'];
      if (settings.subjectSelection.enableSecondSocial) {
        subjects.push('社会2');
      }
      return subjects;
    }
  };

  const getSubjectDisplayName = (subject: Subject) => {
    const customName = settings.customSubjects[subject as keyof typeof settings.customSubjects];
    return customName || subject;
  };

  const getGradeDisplayName = (grade: string) => {
    const gradeMap = {
      '1学年': '1学年',
      '2学年': '2学年', 
      '3学年': '3学年',
      'その他': 'その他'
    };
    return gradeMap[grade as keyof typeof gradeMap] || grade;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const availableSubjects = getAvailableSubjects();

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-6 h-6" />
              個人設定
            </CardTitle>
            <Button variant="outline" onClick={() => router.push('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              戻る
            </Button>
          </div>
          <p className="text-muted-foreground">
            あなたの学習環境をカスタマイズしましょう
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本情報 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="w-5 h-5" />
                基本情報
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="displayName">表示名</Label>
                <Input
                  id="displayName"
                  value={settings.displayName}
                  onChange={(e) => setSettings(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="山田太郎"
                  className="h-12"
                  required
                />
              </div>

              {/* 学年選択 */}
              <div className="space-y-2">
                <Label htmlFor="grade" className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  学年
                </Label>
                <Select 
                  value={settings.grade} 
                  onValueChange={(value) => setSettings(prev => ({ ...prev, grade: value as any }))}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="学年を選択">
                      {getGradeDisplayName(settings.grade)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1学年">1学年</SelectItem>
                    <SelectItem value="2学年">2学年</SelectItem>
                    <SelectItem value="3学年">3学年</SelectItem>
                    <SelectItem value="その他">その他</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  学年設定により、ランキングやチャートで同学年との比較ができます
                </p>
              </div>
            </div>

            {/* 学習目標 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Target className="w-5 h-5" />
                学習目標
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="weeklyTarget">週間勉強時間目標（時間）</Label>
                <Input
                  id="weeklyTarget"
                  type="number"
                  min="1"
                  max="100"
                  value={settings.weeklyTarget}
                  onChange={(e) => setSettings(prev => ({ ...prev, weeklyTarget: parseInt(e.target.value) || 56 }))}
                  className="h-12"
                />
                <p className="text-sm text-muted-foreground">
                  月曜日〜日曜日で計算されます（1日平均: {(settings.weeklyTarget / 7).toFixed(1)}時間）
                </p>
              </div>
            </div>

            {/* 文系/理系選択 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                専攻コース
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={settings.course === 'liberal' ? 'default' : 'outline'}
                  onClick={() => setSettings(prev => ({ ...prev, course: 'liberal' }))}
                  className="h-16 flex flex-col gap-1"
                >
                  <span className="text-lg">📚</span>
                  <span>文系</span>
                </Button>
                <Button
                  type="button"
                  variant={settings.course === 'science' ? 'default' : 'outline'}
                  onClick={() => setSettings(prev => ({ ...prev, course: 'science' }))}
                  className="h-16 flex flex-col gap-1"
                >
                  <span className="text-lg">🔬</span>
                  <span>理系</span>
                </Button>
              </div>
            </div>

            {/* 科目選択オプション */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">科目選択オプション</h3>
              
              {settings.course === 'liberal' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label className="font-medium">理科を2科目選択</Label>
                      <p className="text-sm text-muted-foreground">
                        理科と理科2の両方を学習科目に追加
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={settings.subjectSelection.enableSecondScience ? "default" : "outline"}
                      onClick={() => toggleSubjectSelection('enableSecondScience')}
                      className="h-10"
                    >
                      {settings.subjectSelection.enableSecondScience ? (
                        <>
                          <Minus className="w-4 h-4 mr-1" />
                          無効
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-1" />
                          有効
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label className="font-medium">社会を2科目選択</Label>
                      <p className="text-sm text-muted-foreground">
                        社会と社会2の両方を学習科目に追加
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={settings.subjectSelection.enableSecondSocial ? "default" : "outline"}
                      onClick={() => toggleSubjectSelection('enableSecondSocial')}
                      className="h-10"
                    >
                      {settings.subjectSelection.enableSecondSocial ? (
                        <>
                          <Minus className="w-4 h-4 mr-1" />
                          無効
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-1" />
                          有効
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* 科目一覧プレビュー */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">学習科目一覧</h3>
              <div className="grid grid-cols-3 gap-2">
                {availableSubjects.map((subject) => (
                  <Badge key={subject} variant="outline" className="justify-center py-2">
                    {getSubjectDisplayName(subject)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* 科目名カスタマイズ */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">科目名カスタマイズ</h3>
              <p className="text-sm text-muted-foreground">
                科目名を変更できます（空欄の場合はデフォルト名を使用）
              </p>
              
              <div className="space-y-3">
                {settings.course === 'liberal' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="social1">社会1の科目名</Label>
                      <Input
                        id="social1"
                        value={settings.customSubjects.社会1 || ''}
                        onChange={(e) => updateCustomSubject('社会1', e.target.value)}
                        placeholder="例: 日本史、世界史、政治経済など"
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="social2">社会2の科目名</Label>
                      <Input
                        id="social2"
                        value={settings.customSubjects.社会2 || ''}
                        onChange={(e) => updateCustomSubject('社会2', e.target.value)}
                        placeholder="例: 地理、倫理、現代社会など"
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="science">理科の科目名</Label>
                      <Input
                        id="science"
                        value={settings.customSubjects.理科 || ''}
                        onChange={(e) => updateCustomSubject('理科', e.target.value)}
                        placeholder="例: 化学基礎、生物基礎、地学基礎など"
                        className="h-12"
                      />
                    </div>
                    {settings.subjectSelection.enableSecondScience && (
                      <div className="space-y-2">
                        <Label htmlFor="science2">理科2の科目名</Label>
                        <Input
                          id="science2"
                          value={settings.customSubjects.理科2 || ''}
                          onChange={(e) => updateCustomSubject('理科2', e.target.value)}
                          placeholder="例: 物理基礎、化学、生物など"
                          className="h-12"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="science1">理科1の科目名</Label>
                      <Input
                        id="science1"
                        value={settings.customSubjects.理科1 || ''}
                        onChange={(e) => updateCustomSubject('理科1', e.target.value)}
                        placeholder="例: 物理、化学、生物など"
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="science2">理科2の科目名</Label>
                      <Input
                        id="science2"
                        value={settings.customSubjects.理科2 || ''}
                        onChange={(e) => updateCustomSubject('理科2', e.target.value)}
                        placeholder="例: 地学、化学基礎、生物基礎など"
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="social">社会の科目名</Label>
                      <Input
                        id="social"
                        value={settings.customSubjects.社会1 || ''}
                        onChange={(e) => updateCustomSubject('社会1', e.target.value)}
                        placeholder="例: 日本史、世界史、地理など"
                        className="h-12"
                      />
                    </div>
                    {settings.subjectSelection.enableSecondSocial && (
                      <div className="space-y-2">
                        <Label htmlFor="social2">社会2の科目名</Label>
                        <Input
                          id="social2"
                          value={settings.customSubjects.社会2 || ''}
                          onChange={(e) => updateCustomSubject('社会2', e.target.value)}
                          placeholder="例: 政治経済、倫理、現代社会など"
                          className="h-12"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* 保存・ログアウトボタン */}
            <div className="space-y-3 pt-4">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/')}
                  className="flex-1 h-12"
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-12"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      設定を保存
                    </>
                  )}
                </Button>
              </div>
              
              {/* ログアウトボタン */}
              <Button
                type="button"
                variant="destructive"
                onClick={handleLogout}
                className="w-full h-12"
              >
                <LogOut className="w-4 h-4 mr-2" />
                ログアウト
              </Button>
            </div>
          </form>

          {/* 使用方法ヒント */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">💡 設定のヒント</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 学年設定により、同学年とのランキング比較ができます</li>
              <li>• 文系は社会2科目+理科1科目が基本、理系は理科2科目+社会1科目が基本</li>
              <li>• 必要に応じて追加科目を有効にできます</li>
              <li>• 科目名は入試で使用する正式名称に変更推奨</li>
              <li>• 設定はいつでも変更可能です</li>
            </ul>
          </div>

          {/* アカウント情報 */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-2">👤 アカウント情報</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>メールアドレス:</strong> {user.email}</div>
              <div><strong>学年:</strong> {getGradeDisplayName(user.grade || 'その他')}</div>
              <div><strong>コース:</strong> {user.course === 'liberal' ? '文系' : '理系'}</div>
              <div><strong>ユーザーID:</strong> {user.uid.slice(0, 8)}...</div>
              <div><strong>登録日:</strong> {user.createdAt.toLocaleDateString('ja-JP')}</div>
              {user.reviewStats && (
                <div className="mt-2 pt-2 border-t">
                  <strong>復習統計:</strong>
                  <div className="ml-2 text-xs">
                    <div>完了復習数: {user.reviewStats.totalReviewsCompleted}回</div>
                    <div>平均理解度: {user.reviewStats.averageUnderstanding.toFixed(1)}点</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}