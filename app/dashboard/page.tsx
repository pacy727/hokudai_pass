'use client';

import { useState } from 'react';
import { useRealtimeStudyStatus, useDeclarations } from '@/hooks/useRealtime';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Users, MessageSquare, TrendingUp, Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { statuses, isLoading: statusLoading } = useRealtimeStudyStatus();
  const { declarations, isLoading: declarationLoading, postDeclaration, addReaction } = useDeclarations();
  const { toast } = useToast();
  
  const [newDeclaration, setNewDeclaration] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handlePostDeclaration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeclaration.trim() || !user) return;

    setIsPosting(true);
    try {
      await postDeclaration(
        newDeclaration.trim(),
        '数学', // デフォルト科目
        2, // デフォルト時間
        '19:00' // デフォルト開始時刻
      );
      setNewDeclaration('');
      toast({
        title: "宣言完了！",
        description: "学習宣言を投稿しました。頑張って！"
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "宣言の投稿に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleReaction = async (declarationId: string, emoji: string) => {
    try {
      await addReaction(declarationId, emoji);
      toast({
        title: "リアクション送信！",
        description: "応援の気持ちを送りました 👍"
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "リアクションの送信に失敗しました",
        variant: "destructive"
      });
    }
  };

  if (!user) {
    router.push('/login');
    return null;
  }

  if (statusLoading || declarationLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  const studyingMembers = statuses.filter(status => status.isStudying);
  const notStudyingMembers = statuses.filter(status => !status.isStudying);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
      {/* ヘッダー */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <Users className="w-6 h-6" />
            北大専科メンバー リアルタイム
          </CardTitle>
          <div className="flex justify-center">
            <Button variant="outline" onClick={() => router.push('/')}>
              🏠 ホームに戻る
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* 現在学習中のメンバー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📍 現在学習中のメンバー
            <Badge variant="default" className="bg-green-500">
              {studyingMembers.length}人
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {studyingMembers.length > 0 ? (
            studyingMembers.map((status) => (
              <div key={status.userId} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{status.userName}</span>
                    <Badge variant="outline">{status.currentSubject}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(status.startTime, { locale: ja })}継続中
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReaction(status.studySessionId, '👍')}
                >
                  <Heart className="w-4 h-4 mr-1" />
                  応援
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-2">現在学習中のメンバーはいません</p>
              <p className="text-sm text-muted-foreground">あなたが最初に勉強を始めませんか？</p>
            </div>
          )}
          
          {notStudyingMembers.length > 0 && (
            <div className="border-t pt-3 mt-3">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">オフラインメンバー</h4>
              <div className="grid grid-cols-2 gap-2">
                {notStudyingMembers.map((status) => (
                  <div key={status.userId} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-sm">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span>{status.userName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground text-right">
            最終更新: {formatDistanceToNow(new Date(), { locale: ja })}前
          </div>
        </CardContent>
      </Card>

      {/* 今日の学習宣言 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            今日の学習宣言
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 宣言投稿フォーム */}
          <form onSubmit={handlePostDeclaration} className="space-y-3">
            <Input
              value={newDeclaration}
              onChange={(e) => setNewDeclaration(e.target.value)}
              placeholder="例: 19:00から数学3時間頑張る！"
              disabled={isPosting}
              className="text-base"
            />
            <Button 
              type="submit" 
              disabled={isPosting || !newDeclaration.trim()}
              className="w-full"
            >
              {isPosting ? "投稿中..." : "📝 宣言する"}
            </Button>
          </form>

          {/* 宣言一覧 */}
          <div className="space-y-3">
            {declarations.length > 0 ? (
              declarations.map((declaration) => (
                <div key={declaration.id} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{declaration.userName}</span>
                    <Badge variant="outline">{declaration.plannedSubject}</Badge>
                    <Badge variant="outline">{declaration.plannedHours}時間</Badge>
                    {declaration.completed && (
                      <Badge className="bg-green-500">完了</Badge>
                    )}
                  </div>
                  <p className="text-sm mb-2">{declaration.declaration}</p>
                  
                  {/* リアクション */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {['👍', '🔥', '💪', '📚'].map((emoji) => (
                        <Button
                          key={emoji}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReaction(declaration.id, emoji)}
                          className="h-8 w-8 p-0"
                        >
                          {emoji}
                        </Button>
                      ))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(declaration.createdAt, { locale: ja })}前
                    </div>
                  </div>
                  
                  {/* リアクション表示 */}
                  {Object.keys(declaration.reactions).length > 0 && (
                    <div className="mt-2 flex gap-1">
                      {Object.entries(declaration.reactions).map(([userId, emoji]) => (
                        <span key={userId} className="text-sm bg-white px-2 py-1 rounded">
                          {emoji}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">今日の宣言はまだありません</p>
                <p className="text-sm text-muted-foreground mt-1">最初に宣言してみませんか？</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* メンバーランキング */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            メンバー累計ランキング
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { rank: 1, name: '佐藤花子', hours: 1425, percentage: 95, icon: '🥇' },
              { rank: 2, name: '田中太郎', hours: 1298, percentage: 86, icon: '🥈' },
              { rank: 3, name: '鈴木美咲', hours: 1156, percentage: 77, icon: '🥉' },
              { rank: 4, name: '高橋理恵', hours: 945, percentage: 63, icon: '4位' },
              { rank: 5, name: user.displayName, hours: 756, percentage: 50, icon: '5位' }
            ].map((member) => (
              <div key={member.rank} className={`flex items-center justify-between p-3 rounded-lg ${
                member.name === user.displayName ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg">{member.icon}</span>
                  <div>
                    <span className={`font-medium ${member.name === user.displayName ? 'text-blue-700' : ''}`}>
                      {member.name}
                      {member.name === user.displayName && (
                        <Badge variant="outline" className="ml-2">あなた</Badge>
                      )}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{member.hours}時間</div>
                  <div className="text-sm text-muted-foreground">
                    ({member.percentage}%)
                    {member.percentage < 60 && <span className="text-yellow-600"> ⚠️</span>}
                    {member.percentage >= 90 && <span className="text-green-600"> 🎉</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={() => router.push('/profile')}>
              📊 詳細なカルテを見る
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
