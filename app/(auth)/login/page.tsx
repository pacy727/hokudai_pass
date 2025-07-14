'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "エラー",
        description: "メールアドレスとパスワードを入力してください",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "ログイン成功！",
        description: "北大専科学習管理システムへようこそ！"
      });
      router.push('/');
    } catch (error: any) {
      console.error('Login error:', error);
      
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

  // デモ用クイックログイン
  const handleDemoLogin = async () => {
    setEmail('demo@hokudai-tracker.com');
    setPassword('demo123456');
    
    // フォームの状態を更新した後、少し待ってからログイン処理を実行
    setTimeout(() => {
      handleLogin(new Event('submit') as any);
    }, 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            🎯 北大専科ログイン
          </CardTitle>
          <p className="text-muted-foreground">
            偏差値50→65確実達成システム
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
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
            
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="パスワードを入力"
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

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-base"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ログイン中...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  ログイン
                </>
              )}
            </Button>
          </form>

          {/* デモログイン */}
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={handleDemoLogin}
              className="w-full h-10"
              disabled={isLoading}
            >
              🎮 デモアカウントでログイン
            </Button>
          </div>

          {/* 新規登録リンク */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              アカウントをお持ちでない方は
            </p>
            <Link href="/register" className="text-blue-600 hover:underline">
              新規登録はこちら
            </Link>
          </div>

          {/* 特徴説明 */}
          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            <h4 className="font-semibold text-foreground">🚀 システムの特徴</h4>
            <ul className="space-y-1">
              <li>• タイマー機能で正確な学習時間記録</li>
              <li>• リアルタイムでメンバーの学習状況を共有</li>
              <li>• 詳細な学習分析とカルテ機能</li>
              <li>• グループでモチベーション維持</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
