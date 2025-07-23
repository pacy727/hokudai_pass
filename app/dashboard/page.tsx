'use client';

import { useState, useEffect } from 'react';
import { useRealtimeStudyStatus, useDeclarations } from '@/hooks/useRealtime';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Users, MessageSquare, TrendingUp, Heart, Trophy, Medal, Award, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Subject } from '@/types/study';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ダミーデータ（実際の実装では StudyRecordService から取得）
const mockRankingData = {
  total: [
    { rank: 1, name: '佐藤花子', hours: 1425, percentage: 95, icon: '🥇' },
    { rank: 2, name: '田中太郎', hours: 1298, percentage: 86, icon: '🥈' },
    { rank: 3, name: '鈴木美咲', hours: 1156, percentage: 77, icon: '🥉' },
    { rank: 4, name: '高橋理恵', hours: 945, percentage: 63, icon: '4位' },
    { rank: 5, name: '山田次郎', hours: 756, percentage: 50, icon: '5位' }
  ],
  subjects: {
    '英語': [
      { rank: 1, name: '佐藤花子', hours: 385, icon: '🥇' },
      { rank: 2, name: '田中太郎', hours: 342, icon: '🥈' },
      { rank: 3, name: '鈴木美咲', hours: 298, icon: '🥉' },
      { rank: 4, name: '高橋理恵', hours: 256, icon: '4位' },
      { rank: 5, name: '山田次郎', hours: 203, icon: '5位' }
    ],
    '数学': [
      { rank: 1, name: '田中太郎', hours: 425, icon: '🥇' },
      { rank: 2, name: '佐藤花子', hours: 402, icon: '🥈' },
      { rank: 3, name: '山田次郎', hours: 356, icon: '🥉' },
      { rank: 4, name: '鈴木美咲', hours: 298, icon: '4位' },
      { rank: 5, name: '高橋理恵', hours: 245, icon: '5位' }
    ],
    '国語': [
      { rank: 1, name: '鈴木美咲', hours: 324, icon: '🥇' },
      { rank: 2, name: '佐藤花子', hours: 298, icon: '🥈' },
      { rank: 3, name: '高橋理恵', hours: 276, icon: '🥉' },
      { rank: 4, name: '田中太郎', hours: 234, icon: '4位' },
      { rank: 5, name: '山田次郎', hours: 198, icon: '5位' }
    ],
    '情報': [
      { rank: 1, name: '田中太郎', hours: 234, icon: '🥇' },
      { rank: 2, name: '山田次郎', hours: 198, icon: '🥈' },
      { rank: 3, name: '佐藤花子', hours: 176, icon: '🥉' },
      { rank: 4, name: '鈴木美咲', hours: 145, icon: '4位' },
      { rank: 5, name: '高橋理恵', hours: 123, icon: '5位' }
    ],
    '理科': [
      { rank: 1, name: '佐藤花子', hours: 298, icon: '🥇' },
      { rank: 2, name: '田中太郎', hours: 276, icon: '🥈' },
      { rank: 3, name: '高橋理恵', hours: 234, icon: '🥉' },
      { rank: 4, name: '鈴木美咲', hours: 198, icon: '4位' },
      { rank: 5, name: '山田次郎', hours: 156, icon: '5位' }
    ],
    '社会': [
      { rank: 1, name: '高橋理恵', hours: 287, icon: '🥇' },
      { rank: 2, name: '鈴木美咲', hours: 256, icon: '🥈' },
      { rank: 3, name: '佐藤花子', hours: 234, icon: '🥉' },
      { rank: 4, name: '田中太郎', hours: 198, icon: '4位' },
      { rank: 5, name: '山田次郎', hours: 176, icon: '5位' }
    ]
  }
};

// 直近7日間の学習時間データ（ダミー）
const mockChartData = [
  { date: '7/17', minutes: 420, dateLabel: '7/17(木)' },
  { date: '7/18', minutes: 380, dateLabel: '7/18(金)' },
  { date: '7/19', minutes: 240, dateLabel: '7/19(土)' },
  { date: '7/20', minutes: 480, dateLabel: '7/20(日)' },
  { date: '7/21', minutes: 360, dateLabel: '7/21(月)' },
  { date: '7/22', minutes: 450, dateLabel: '7/22(火)' },
  { date: '7/23', minutes: 390, dateLabel: '7/23(水)' }
];

// 拡張された学習宣言ダミーデータ
const mockExtendedDeclarations = [
  { id: '1', userName: '佐藤花子', declaration: '19:00から数学3時間頑張る！', plannedSubject: '数学', plannedHours: 3, completed: true, actualHours: 3, reactions: { 'user1': '👍', 'user2': '🔥' }, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  { id: '2', userName: '田中太郎', declaration: '今日は英語の長文読解を2時間集中してやります', plannedSubject: '英語', plannedHours: 2, completed: false, actualHours: 0, reactions: { 'user3': '💪' }, createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) },
  { id: '3', userName: '鈴木美咲', declaration: '国語の古文単語暗記がんばる〜', plannedSubject: '国語', plannedHours: 1, completed: true, actualHours: 1.5, reactions: {}, createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) },
  { id: '4', userName: '高橋理恵', declaration: '物理の力学問題を徹底的に解く！', plannedSubject: '理科', plannedHours: 2, completed: false, actualHours: 0, reactions: { 'user1': '👍' }, createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000) },
  { id: '5', userName: '山田次郎', declaration: '世界史の近現代史まとめ作業', plannedSubject: '社会', plannedHours: 2, completed: true, actualHours: 2, reactions: { 'user2': '📚', 'user4': '👍' }, createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) },
  { id: '6', userName: '佐藤花子', declaration: '英語のリスニング練習1時間', plannedSubject: '英語', plannedHours: 1, completed: true, actualHours: 1, reactions: {}, createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  { id: '7', userName: '田中太郎', declaration: '数学の微積分基礎固め', plannedSubject: '数学', plannedHours: 3, completed: true, actualHours: 2.5, reactions: { 'user1': '🔥' }, createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000) },
  { id: '8', userName: '鈴木美咲', declaration: '化学の有機化学復習', plannedSubject: '理科', plannedHours: 2, completed: false, actualHours: 0, reactions: {}, createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000) },
  { id: '9', userName: '高橋理恵', declaration: '現代文の読解演習', plannedSubject: '国語', plannedHours: 1, completed: true, actualHours: 1, reactions: { 'user3': '💪' }, createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000) },
  { id: '10', userName: '山田次郎', declaration: '情報のプログラミング基礎', plannedSubject: '情報', plannedHours: 2, completed: true, actualHours: 2, reactions: { 'user1': '👍', 'user2': '🔥' }, createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000) }
];

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { statuses, isLoading: statusLoading } = useRealtimeStudyStatus();
  const { declarations, isLoading: declarationLoading, postDeclaration, addReaction } = useDeclarations();
  const { toast } = useToast();
  
  const [newDeclaration, setNewDeclaration] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('合計');
  const [showAllDeclarations, setShowAllDeclarations] = useState(false);

  // useEffect でリダイレクト処理（レンダリング中の状態更新を回避）
  useEffect(() => {
    if (!isLoading && !user) {
      console.log('🔄 Redirecting to login from dashboard');
      router.push('/login');
    }
  }, [isLoading, user, router]);

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
  const getSubjectDisplayName = (subject: string): string => {
    try {
      const customName = (user?.customSubjects as Record<string, string | undefined>)?.[subject];
      return customName || subject;
    } catch (error) {
      console.error('Error getting display name for', subject, error);
      return subject;
    }
  };

  // ランキングデータ取得
  const getCurrentRankingData = () => {
    if (selectedSubject === '合計') {
      return mockRankingData.total;
    }
    
    // カスタム科目名から実際の科目キーを取得
    const availableSubjects = getAvailableSubjects();
    const actualSubject = availableSubjects.find(s => getSubjectDisplayName(s) === selectedSubject);
    
    if (actualSubject) {
      const subjectKey = actualSubject === '社会1' ? '社会' : 
                        actualSubject === '理科1' ? '理科' : actualSubject;
      return (mockRankingData.subjects as Record<string, typeof mockRankingData.subjects['英語']>)[subjectKey] || mockRankingData.subjects['英語'];
    }
    
    return (mockRankingData.subjects as Record<string, typeof mockRankingData.subjects['英語']>)[selectedSubject] || mockRankingData.subjects['英語'];
  };

  // 表示する宣言を取得
  const getDisplayDeclarations = () => {
    const allDeclarations = mockExtendedDeclarations; // 実際の実装では API から取得
    return showAllDeclarations ? allDeclarations : allDeclarations.slice(0, 20);
  };

  // ランキング表示コンポーネント
  const RankingList = ({ data, showPercentage = false }: { data: any[], showPercentage?: boolean }) => (
    <div className="space-y-3">
      {data.map((member) => (
        <div key={member.rank} className={`flex items-center justify-between p-3 rounded-lg ${
          member.name === user?.displayName ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
        }`}>
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg">{member.icon}</span>
            <div>
              <span className={`font-medium ${member.name === user?.displayName ? 'text-blue-700' : ''}`}>
                {member.name}
                {member.name === user?.displayName && (
                  <Badge variant="outline" className="ml-2">あなた</Badge>
                )}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-bold">{member.hours}時間</div>
            {showPercentage && member.percentage && (
              <div className="text-sm text-muted-foreground">
                ({member.percentage}%)
                {member.percentage < 60 && <span className="text-yellow-600"> ⚠️</span>}
                {member.percentage >= 90 && <span className="text-green-600"> 🎉</span>}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // チャートのツールチップフォーマット
  const formatTooltip = (value: number, name: string) => {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    const timeString = hours > 0 ? `${hours}時間${minutes}分` : `${minutes}分`;
    return [timeString, '学習時間'];
  };

  // ローディング中
  if (isLoading || statusLoading || declarationLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  // ユーザー未ログイン（リダイレクト処理中）
  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p>リダイレクト中...</p>
        </div>
      </div>
    );
  }

  const studyingMembers = statuses.filter(status => status.isStudying);
  const notStudyingMembers = statuses.filter(status => !status.isStudying);
  const availableSubjects = getAvailableSubjects();

  // ドロップダウン用の選択肢
  const subjectOptions = ['合計', ...availableSubjects.map(s => getSubjectDisplayName(s))];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-4xl">
      <Tabs defaultValue="studying" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="studying" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            学習中のメンバー
          </TabsTrigger>
          <TabsTrigger value="declarations" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            学習宣言
          </TabsTrigger>
          <TabsTrigger value="ranking" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            ランキング
          </TabsTrigger>
          <TabsTrigger value="chart" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            チャート
          </TabsTrigger>
        </TabsList>

        {/* 学習中のメンバータブ */}
        <TabsContent value="studying" className="space-y-4 mt-6">
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
        </TabsContent>

        {/* 学習宣言タブ */}
        <TabsContent value="declarations" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                学習宣言
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
              <div className="space-y-2">
                {getDisplayDeclarations().map((declaration) => (
                  <div key={declaration.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{declaration.userName}</span>
                        <Badge variant="outline" className="text-xs">{declaration.plannedSubject}</Badge>
                        <Badge variant="outline" className="text-xs">{declaration.plannedHours}h</Badge>
                        {declaration.completed && (
                          <Badge className="bg-green-500 text-xs">完了</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(declaration.createdAt, { locale: ja })}前
                      </div>
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
                            className="h-6 w-6 p-0 text-xs"
                          >
                            {emoji}
                          </Button>
                        ))}
                      </div>
                      
                      {/* リアクション表示 */}
                      {Object.keys(declaration.reactions).length > 0 && (
                        <div className="flex gap-1">
                          {Object.entries(declaration.reactions).map(([userId, emoji]) => (
                            <span key={userId} className="text-xs bg-white px-1 py-0.5 rounded">
                              {emoji}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* もっと見るボタン */}
                {!showAllDeclarations && mockExtendedDeclarations.length > 20 && (
                  <div className="text-center pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAllDeclarations(true)}
                      className="flex items-center gap-2"
                    >
                      <ChevronDown className="w-4 h-4" />
                      もっと見る ({mockExtendedDeclarations.length - 20}件)
                    </Button>
                  </div>
                )}
                
                {/* 折りたたみボタン */}
                {showAllDeclarations && (
                  <div className="text-center pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowAllDeclarations(false)}
                      className="flex items-center gap-2"
                    >
                      <ChevronUp className="w-4 h-4" />
                      折りたたむ
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ランキングタブ */}
        <TabsContent value="ranking" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                勉強時間ランキング
              </CardTitle>
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  メンバーの学習時間を確認できます
                </p>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">科目:</label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectOptions.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject === '合計' ? (
                            <div className="flex items-center gap-1">
                              <Trophy className="w-3 h-3" />
                              <span>合計</span>
                            </div>
                          ) : (
                            subject
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                {selectedSubject === '合計' ? (
                  <>
                    <Medal className="w-4 h-4 text-yellow-600" />
                    <span className="font-medium">総合学習時間ランキング</span>
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">{selectedSubject} 学習時間ランキング</span>
                  </>
                )}
              </div>
              
              <RankingList 
                data={getCurrentRankingData()} 
                showPercentage={selectedSubject === '合計'}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* チャートタブ */}
        <TabsContent value="chart" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                この1週間の頑張り
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                直近7日間の勉強時間推移を確認できます
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={mockChartData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      label={{ value: '学習時間（分）', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={formatTooltip}
                      labelFormatter={(label) => {
                        const data = mockChartData.find(d => d.date === label);
                        return data ? data.dateLabel : label;
                      }}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '6px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="minutes" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, fill: '#1d4ed8' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between text-xs text-blue-600 mt-1">
                <span>現在: {Math.round(mockChartData.reduce((sum, day) => sum + day.minutes, 0) / 60)}時間</span>
                <span>目標: {user?.weeklyTarget || 56}時間</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}