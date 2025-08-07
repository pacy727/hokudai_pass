'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, collections } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true); // true=ログイン, false=新規登録
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [grade, setGrade] = useState<'1学年' | '2学年' | '3学年' | 'その他'>('3学年');
  const [course, setCourse] = useState<'liberal' | 'science'>('science');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // フォームリセット
  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
    setGrade('3学年');
    setCourse('science');
  };

  // モード切り替え
  const toggleMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "入力エラー",
        description: "メールアドレスとパスワードを入力してください",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      toast({
        title: "ログイン成功！",
        description: `ようこそ、${userCredential.user.email}さん！`
      });
      
      router.push('/');
    } catch (error: any) {
      let errorMessage = "ログインに失敗しました";
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = "このメールアドレスは登録されていません";
          break;
        case 'auth/wrong-password':
          errorMessage = "パスワードが間違っています";
          break;
        case 'auth/invalid-email':
          errorMessage = "無効なメールアドレスです";
          break;
        case 'auth/too-many-requests':
          errorMessage = "試行回数が多すぎます。しばらく時間をおいてお試しください";
          break;
        default:
          errorMessage = `${error.code}: ${error.message}`;
      }
      
      toast({
        title: "ログインエラー",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 新規登録処理
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !displayName || !confirmPassword || !grade) {
      toast({
        title: "入力エラー",
        description: "すべての項目を入力してください",
        variant: "destructive"
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "パスワードエラー",
        description: "パスワードが一致しません",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "パスワードエラー",
        description: "パスワードは6文字以上で入力してください",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Firebase Authでアカウント作成
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Firestoreにユーザー情報を保存
      await setDoc(doc(db, collections.users, userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: displayName,
        role: 'student',
        grade: grade, // 学年を追加
        targetUniversity: '北海道大学',
        course: course, // コースを追加
        weeklyTarget: 56,
        customSubjects: {},
        subjectSelection: {},
        studyGoal: {
          totalHours: 1500,
          dailyHours: 8,
          subjects: {
            数学: 400,
            英語: 350,
            国語: 300,
            理科: 350,
            社会: 250
          }
        },
        // 復習統計の初期化
        reviewStats: {
          totalReviewsCompleted: 0,
          totalUnderstandingScore: 0,
          averageUnderstanding: 0,
          lastCalculatedAt: new Date()
        },
        createdAt: new Date()
      });
      
      toast({
        title: "アカウント作成成功！",
        description: `ようこそ、${displayName}さん！学習を始めましょう！`
      });
      
      router.push('/');
    } catch (error: any) {
      let errorMessage = "アカウント作成に失敗しました";
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = "このメールアドレスは既に使用されています";
          break;
        case 'auth/invalid-email':
          errorMessage = "無効なメールアドレスです";
          break;
        case 'auth/weak-password':
          errorMessage = "パスワードが弱すぎます（6文字以上必要）";
          break;
        case 'auth/network-request-failed':
          errorMessage = "ネットワークエラーです";
          break;
        default:
          errorMessage = `エラー: ${error.message}`;
      }
      
      toast({
        title: "アカウント作成エラー",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // デモアカウント設定
  const setDemoAccount = () => {
    setEmail('demo@hokudai-tracker.com');
    setPassword('demo123456');
    setIsLogin(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            🎯 北大専科
          </CardTitle>
          <p className="text-muted-foreground">
            {isLogin ? 'ログイン' : '新規アカウント作成'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
            {/* 表示名（新規登録時のみ） */}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="displayName">
                  表示名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="山田太郎"
                  required={!isLogin}
                  className="h-12"
                />
              </div>
            )}

            {/* 学年選択（新規登録時のみ） */}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="grade">
                  学年 <span className="text-red-500">*</span>
                </Label>
                <Select value={grade} onValueChange={(value) => setGrade(value as any)}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="学年を選択">
                      {grade}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1学年">1学年</SelectItem>
                    <SelectItem value="2学年">2学年</SelectItem>
                    <SelectItem value="3学年">3学年</SelectItem>
                    <SelectItem value="その他">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 文系/理系選択（新規登録時のみ） */}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="course">
                  専攻コース <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={course === 'liberal' ? 'default' : 'outline'}
                    onClick={() => setCourse('liberal')}
                    className="h-12 flex flex-col gap-1"
                  >
                    <span className="text-lg">📚</span>
                    <span>文系</span>
                  </Button>
                  <Button
                    type="button"
                    variant={course === 'science' ? 'default' : 'outline'}
                    onClick={() => setCourse('science')}
                    className="h-12 flex flex-col gap-1"
                  >
                    <span className="text-lg">🔬</span>
                    <span>理系</span>
                  </Button>
                </div>
              </div>
            )}

            {/* メールアドレス */}
            <div className="space-y-2">
              <Label htmlFor="email">
                メールアドレス <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                className="h-12"
              />
            </div>
            
            {/* パスワード */}
            <div className="space-y-2">
              <Label htmlFor="password">
                パスワード <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isLogin ? "パスワードを入力" : "6文字以上で入力"}
                  required
                  className="h-12 pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2 h-8 w-8 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* パスワード確認（新規登録時のみ） */}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  パスワード確認 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="パスワードを再入力"
                  required={!isLogin}
                  className="h-12"
                />
                {!isLogin && password && confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-red-500">パスワードが一致しません</p>
                )}
              </div>
            )}

            {/* 送信ボタン */}
            <Button
              type="submit"
              disabled={isLoading || (!isLogin && password !== confirmPassword)}
              className="w-full h-12 text-base"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isLogin ? 'ログイン中...' : 'アカウント作成中...'}
                </>
              ) : (
                <>
                  {isLogin ? (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      ログイン
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      アカウント作成
                    </>
                  )}
                </>
              )}
            </Button>
          </form>

          {/* モード切り替え */}
          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              onClick={toggleMode}
              disabled={isLoading}
              className="text-sm"
            >
              {isLogin ? '新規アカウント作成はこちら' : 'ログインはこちら'}
            </Button>
          </div>

          {/* デモアカウント（ログイン時のみ） */}
          {isLogin && (
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={setDemoAccount}
                className="w-full"
                disabled={isLoading}
              >
                🎮 デモアカウント情報を入力
              </Button>
            </div>
          )}

          {/* 機能説明 */}
          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            <h4 className="font-semibold text-foreground">🚀 システムの特徴</h4>
            <ul className="space-y-1">
              <li>• ⏱️ タイマー機能で正確な学習時間記録</li>
              <li>• 📊 詳細な学習分析とレポート</li>
              <li>• 👥 メンバーとの学習状況共有</li>
              <li>• 🎯 偏差値50→65確実達成サポート</li>
              <li>• 🏫 学年別ランキングとチャート</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}