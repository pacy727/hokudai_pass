'use client';

import { useState, useEffect } from 'react';
import { useRealtimeStudyStatus, useDeclarations } from '@/hooks/useRealtime';
import { useAuth } from '@/hooks/useAuth';
import { StudyRecordService } from '@/lib/db/studyRecords';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Trophy, 
  Medal, 
  Award, 
  BarChart3, 
  ChevronDown, 
  ChevronUp,
  Clock,
  BookOpen,
  User,
  Calendar
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Subject, StudyRecord } from '@/types/study';
import { StudyDeclaration } from '@/types/realtime';
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

// 簡素化された学習宣言ダミーデータ
const mockSimpleDeclarations = [
  { id: '1', userName: '佐藤花子', declaration: '19:00から数学3時間頑張る！', createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  { id: '2', userName: '田中太郎', declaration: '今日は英語の長文読解を2時間集中してやります', createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) },
  { id: '3', userName: '鈴木美咲', declaration: '国語の古文単語暗記がんばる〜', createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) },
  { id: '4', userName: '高橋理恵', declaration: '物理の力学問題を徹底的に解く！', createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000) },
  { id: '5', userName: '山田次郎', declaration: '世界史の近現代史まとめ作業', createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000) },
  { id: '6', userName: '佐藤花子', declaration: '英語のリスニング練習1時間', createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  { id: '7', userName: '田中太郎', declaration: '数学の微積分基礎固め', createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000) },
  { id: '8', userName: '鈴木美咲', declaration: '化学の有機化学復習', createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
  { id: '9', userName: '高橋理恵', declaration: '現代文の読解演習', createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
  { id: '10', userName: '山田次郎', declaration: '情報のプログラミング基礎', createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
  { id: '11', userName: '佐藤花子', declaration: '今日は早起きして勉強するぞ！', createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  { id: '12', userName: '田中太郎', declaration: '模試の復習をしっかりやります', createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
  { id: '13', userName: '鈴木美咲', declaration: '明日のテスト対策頑張る', createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
  { id: '14', userName: '高橋理恵', declaration: '図書館で集中して勉強してきます', createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
  { id: '15', userName: '山田次郎', declaration: '夏休みの勉強計画を立てました', createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) }
];

// タイムラインアイテムの型定義
interface TimelineItem {
  id: string;
  type: 'study_record' | 'declaration';
  userName: string;
  timestamp: Date;
  subject?: Subject;
  content: string;
  details?: string;
  studyTime?: number; // 分
  icon: string;
  color: string;
}

// 全体タイムライン用のダミーデータ生成
const generateTimelineData = (): TimelineItem[] => {
  const timelineItems: TimelineItem[] = [];
  
  // 学習宣言をタイムラインアイテムに変換
  mockSimpleDeclarations.forEach(declaration => {
    timelineItems.push({
      id: `decl_${declaration.id}`,
      type: 'declaration',
      userName: declaration.userName,
      timestamp: declaration.createdAt,
      content: declaration.declaration,
      icon: '📢',
      color: 'bg-blue-100 border-blue-300 text-blue-800'
    });
  });
  
  // 学習記録のダミーデータを追加
  const studyRecords = [
    { userName: '佐藤花子', subject: '数学' as Subject, content: '二次関数の応用問題', studyTime: 120, time: new Date(Date.now() - 1 * 60 * 60 * 1000) },
    { userName: '田中太郎', subject: '英語' as Subject, content: '長文読解演習', studyTime: 90, time: new Date(Date.now() - 3 * 60 * 60 * 1000) },
    { userName: '鈴木美咲', subject: '国語' as Subject, content: '古文の文法確認', studyTime: 75, time: new Date(Date.now() - 5 * 60 * 60 * 1000) },
    { userName: '高橋理恵', subject: '理科' as Subject, content: '物理の力学基礎', studyTime: 105, time: new Date(Date.now() - 7 * 60 * 60 * 1000) },
    { userName: '山田次郎', subject: '社会' as Subject, content: '世界史近現代', studyTime: 80, time: new Date(Date.now() - 9 * 60 * 60 * 1000) },
    { userName: '佐藤花子', subject: '英語' as Subject, content: '単語暗記', studyTime: 60, time: new Date(Date.now() - 11 * 60 * 60 * 1000) },
    { userName: '田中太郎', subject: '数学' as Subject, content: '微積分基礎', studyTime: 110, time: new Date(Date.now() - 13 * 60 * 60 * 1000) },
    { userName: '鈴木美咲', subject: '理科' as Subject, content: '化学の有機化学', studyTime: 95, time: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    { userName: '高橋理恵', subject: '国語' as Subject, content: '現代文読解', studyTime: 85, time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    { userName: '山田次郎', subject: '情報' as Subject, content: 'プログラミング基礎', studyTime: 120, time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) }
  ];
  
  studyRecords.forEach((record, index) => {
    timelineItems.push({
      id: `study_${index}`,
      type: 'study_record',
      userName: record.userName,
      timestamp: record.time,
      subject: record.subject,
      content: record.content,
      studyTime: record.studyTime,
      icon: '📚',
      color: 'bg-green-100 border-green-300 text-green-800'
    });
  });
  
  // 時系列順にソート（新しい順）
  return timelineItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { statuses, isLoading: statusLoading } = useRealtimeStudyStatus();
  const { declarations, isLoading: declarationLoading, postDeclaration } = useDeclarations();
  const { toast } = useToast();
  
  const [newDeclaration, setNewDeclaration] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('合計');
  const [showAllDeclarations, setShowAllDeclarations] = useState(false);
  const [timelineData, setTimelineData] = useState<TimelineItem[]>([]);
  const [showAllTimeline, setShowAllTimeline] = useState(false);

  // useEffect でリダイレクト処理（レンダリング中の状態更新を回避）
  useEffect(() => {
    if (!isLoading && !user) {
      console.log('🔄 Redirecting to login from dashboard');
      router.push('/login');
    }
  }, [isLoading, user, router]);

  // タイムラインデータの初期化
  useEffect(() => {
    const data = generateTimelineData();
    setTimelineData(data);
  }, []);

  const handlePostDeclaration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeclaration.trim() || !user) return;

    setIsPosting(true);
    try {
      // 簡素化された宣言投稿（教科・時間情報は不要）
      await postDeclaration(newDeclaration.trim());
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

  // 1か月以内の宣言のみフィルタリング
  const filterRecentDeclarations = (declarations: any[]) => {
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return declarations.filter(declaration => declaration.createdAt > oneMonthAgo);
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

  // 表示する宣言を取得（1か月以内 + 表示制限）
  const getDisplayDeclarations = () => {
    const recentDeclarations = filterRecentDeclarations(mockSimpleDeclarations);
    return showAllDeclarations ? recentDeclarations : recentDeclarations.slice(0, 15);
  };

  // タイムライン表示制限
  const getDisplayTimelineItems = () => {
    return showAllTimeline ? timelineData : timelineData.slice(0, 20);
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

  // タイムラインアイテムコンポーネント
  const TimelineItemComponent = ({ item }: { item: TimelineItem }) => (
    <div className="flex items-start space-x-4 p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
      <div className="flex-shrink-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.color}`}>
          <span className="text-lg">{item.icon}</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-1">
          <span className="font-medium text-sm">{item.userName}</span>
          {item.type === 'study_record' && item.subject && (
            <Badge variant="outline" className="text-xs">
              {getSubjectDisplayName(item.subject)}
            </Badge>
          )}
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(item.timestamp, { locale: ja })}前
          </span>
        </div>
        <div className="text-sm text-gray-800 mb-1">
          {item.type === 'study_record' ? (
            <div className="flex items-center space-x-2">
              <BookOpen className="h-3 w-3 text-gray-500" />
              <span>{item.content}</span>
              {item.studyTime && (
                <span className="text-xs text-gray-500">
                  ({Math.floor(item.studyTime / 60) > 0 
                    ? `${Math.floor(item.studyTime / 60)}時間${item.studyTime % 60}分` 
                    : `${item.studyTime}分`})
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-3 w-3 text-gray-500" />
              <span>{item.content}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

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
        <TabsList className="grid w-full grid-cols-5 h-12">
          <TabsTrigger value="studying" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            学習中のメンバー
          </TabsTrigger>
          <TabsTrigger value="declarations" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            学習宣言
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            タイムライン
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
                        <Badge variant="outline">{getSubjectDisplayName(status.currentSubject)}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(status.startTime, { locale: ja })}継続中
                      </p>
                    </div>
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
                📢 学習宣言
                <Badge variant="default" className="bg-purple-500">
                  {declarations.length}件
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Input
                  placeholder="学習宣言を投稿"
                  value={newDeclaration}
                  onChange={(e) => setNewDeclaration(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isPosting) {
                      handlePostDeclaration(e);
                    }
                  }}
                  className="flex-1"
                />
                <Button onClick={handlePostDeclaration} disabled={!newDeclaration.trim() || isPosting}>
                  {isPosting ? '投稿中...' : '投稿'}
                </Button>
              </div>
              <div className="space-y-3">
                {getDisplayDeclarations().map((declaration) => (
                  <div key={declaration.id} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{declaration.userName}</span>
                        <Badge variant="outline" className="text-xs">
                          {formatDistanceToNow(declaration.createdAt, { locale: ja })}前
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-800">{declaration.declaration}</p>
                    </div>
                  </div>
                ))}
                {declarations.length > 15 && (
                  <Button
                    variant="outline"
                    onClick={() => setShowAllDeclarations(!showAllDeclarations)}
                    className="w-full"
                  >
                    {showAllDeclarations ? '宣言を閉じる' : '宣言をすべて表示'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* タイムラインタブ */}
        <TabsContent value="timeline" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📅 タイムライン
                <Badge variant="default" className="bg-yellow-500">
                  {timelineData.length}件
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Select onValueChange={(value) => setSelectedSubject(value)} value={selectedSubject}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="科目を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => setShowAllTimeline(!showAllTimeline)} className="flex-shrink-0">
                  {showAllTimeline ? 'タイムラインを閉じる' : 'タイムラインをすべて表示'}
                </Button>
              </div>
              <div className="space-y-3">
                {getDisplayTimelineItems().map((item) => (
                  <TimelineItemComponent key={item.id} item={item} />
                ))}
                {timelineData.length > 20 && (
                  <Button
                    variant="outline"
                    onClick={() => setShowAllTimeline(!showAllTimeline)}
                    className="w-full"
                  >
                    {showAllTimeline ? 'タイムラインを閉じる' : 'タイムラインをすべて表示'}
                  </Button>
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
                🏆 ランキング
                <Badge variant="default" className="bg-red-500">
                  {selectedSubject === '合計' ? mockRankingData.total.length : getCurrentRankingData().length}位
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Select onValueChange={(value) => setSelectedSubject(value)} value={selectedSubject}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="科目を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => setShowAllDeclarations(!showAllDeclarations)} className="flex-shrink-0">
                  {showAllDeclarations ? 'ランキングを閉じる' : 'ランキングをすべて表示'}
                </Button>
              </div>
              <div className="space-y-3">
                <RankingList data={getCurrentRankingData()} />
                {selectedSubject !== '合計' && (
                  <Button
                    variant="outline"
                    onClick={() => setShowAllDeclarations(!showAllDeclarations)}
                    className="w-full"
                  >
                    {showAllDeclarations ? 'ランキングを閉じる' : 'ランキングをすべて表示'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* チャートタブ */}
        <TabsContent value="chart" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📊 チャート
                <Badge variant="default" className="bg-indigo-500">
                  7日間
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Select onValueChange={(value) => setSelectedSubject(value)} value={selectedSubject}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="科目を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => setShowAllDeclarations(!showAllDeclarations)} className="flex-shrink-0">
                  {showAllDeclarations ? 'チャートを閉じる' : 'チャートをすべて表示'}
                </Button>
              </div>
              <div className="space-y-3">
                <LineChart width={600} height={300} data={mockChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dateLabel" />
                  <YAxis />
                  <Tooltip formatter={formatTooltip} />
                  <Line type="monotone" dataKey="minutes" stroke="#8884d8" />
                </LineChart>
                {selectedSubject !== '合計' && (
                  <Button
                    variant="outline"
                    onClick={() => setShowAllDeclarations(!showAllDeclarations)}
                    className="w-full"
                  >
                    {showAllDeclarations ? 'チャートを閉じる' : 'チャートをすべて表示'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}