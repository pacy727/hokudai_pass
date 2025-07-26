'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ReviewQuestionRequestService } from '@/lib/db/reviewQuestionRequestService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { ReviewQuestionRequest, ReviewStage, ReviewQuestion } from '@/types/review';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  User, 
  BookOpen, 
  MessageSquare,
  Plus,
  ArrowLeft,
  X,
  Shield
} from 'lucide-react';
import { QuestionAssignmentModal } from '@/components/admin/QuestionAssignmentModal';

export default function AdminReviewRequestsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [requests, setRequests] = useState<ReviewQuestionRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ReviewQuestionRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('pending');
  
  // 問題確認モーダル用の state
  const [selectedQuestionForView, setSelectedQuestionForView] = useState<ReviewQuestion | null>(null);
  const [isQuestionViewModalOpen, setIsQuestionViewModalOpen] = useState(false);

  // 管理者権限チェック
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/');
      return;
    }
  }, [user, isLoading, router]);

  // データ読み込み
  useEffect(() => {
    if (user && user.role === 'admin') {
      loadRequests();
    }
  }, [user]);

  const loadRequests = async () => {
    setIsDataLoading(true);
    try {
      const allRequests = await ReviewQuestionRequestService.getAllRequests();
      setRequests(allRequests);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast({
        title: "エラー",
        description: "復習問題リクエストの読み込みに失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsDataLoading(false);
    }
  };

  // ステータス更新
  const handleStatusUpdate = async (
    requestId: string, 
    newStatus: ReviewQuestionRequest['status'],
    adminResponse?: string
  ) => {
    try {
      await ReviewQuestionRequestService.updateRequestStatus(requestId, newStatus, adminResponse);
      await loadRequests(); // データを再読み込み
      
      toast({
        title: "ステータス更新完了",
        description: `リクエストのステータスを「${getStatusLabel(newStatus)}」に更新しました`
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "エラー",
        description: "ステータスの更新に失敗しました",
        variant: "destructive"
      });
    }
  };

  // 問題割り当てモーダルを開く
  const handleAssignQuestions = (request: ReviewQuestionRequest) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  // ステータスラベル取得
  const getStatusLabel = (status: ReviewQuestionRequest['status']) => {
    switch (status) {
      case 'pending': return '受付中';
      case 'in_progress': return '作業中';
      case 'completed': return '完了';
      case 'rejected': return '却下';
      default: return status;
    }
  };

  // ステータス色取得
  const getStatusColor = (status: ReviewQuestionRequest['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // ステータス別フィルタリング
  const getFilteredRequests = (status?: string) => {
    if (!status || status === 'all') return requests;
    return requests.filter(request => request.status === status);
  };

  // 統計計算
  const getStats = () => {
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      inProgress: requests.filter(r => r.status === 'in_progress').length,
      completed: requests.filter(r => r.status === 'completed').length,
      rejected: requests.filter(r => r.status === 'rejected').length
    };
  };

  if (isLoading || isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  const stats = getStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => router.push('/')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                戻る
              </Button>
              <h1 className="text-3xl font-bold text-gray-900">復習問題リクエスト管理</h1>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              <Shield className="w-4 h-4 mr-1" />
              管理者モード
            </Badge>
          </div>
          
          {/* 統計サマリー */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600">総リクエスト</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                <div className="text-sm text-gray-600">受付中</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
                <div className="text-sm text-gray-600">作業中</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-sm text-gray-600">完了</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                <div className="text-sm text-gray-600">却下</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* タブ付きリクエスト一覧 */}
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 h-12">
            <TabsTrigger value="pending" className="text-sm">
              受付中 ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="text-sm">
              作業中 ({stats.inProgress})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-sm">
              完了 ({stats.completed})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="text-sm">
              却下 ({stats.rejected})
            </TabsTrigger>
            <TabsTrigger value="all" className="text-sm">
              全て ({stats.total})
            </TabsTrigger>
          </TabsList>

          {/* 各タブのコンテンツ */}
          {['pending', 'in_progress', 'completed', 'rejected', 'all'].map((tabValue) => (
            <TabsContent key={tabValue} value={tabValue} className="space-y-4 mt-6">
              {getFilteredRequests(tabValue).length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      {tabValue === 'all' ? 'リクエストがありません' : `${getStatusLabel(tabValue as any)}のリクエストがありません`}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                getFilteredRequests(tabValue).map((request) => {
                  const stageName = getStageName(request.stage);
                  
                  return (
                    <Card key={request.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Badge variant="outline">
                              {request.subject}
                            </Badge>
                            <Badge className={getStatusColor(request.status)}>
                              {getStatusLabel(request.status)}
                            </Badge>
                            <div className="flex items-center space-x-1 text-sm text-gray-500">
                              <User className="h-3 w-3" />
                              <span>{request.userName}</span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.createdAt.toLocaleDateString('ja-JP')}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* 学習内容 */}
                          <div>
                            <h4 className="font-semibold text-lg mb-1">{request.unit}</h4>
                            <p className="text-gray-700 leading-relaxed">{request.content}</p>
                            {request.details && (
                              <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                                <strong>詳細:</strong> {request.details}
                              </p>
                            )}
                            {request.memo && (
                              <p className="text-sm text-gray-600 mt-2 bg-blue-50 p-2 rounded">
                                <strong>メモ:</strong> {request.memo}
                              </p>
                            )}
                          </div>

                          {/* 管理者応答 */}
                          {request.adminResponse && (
                            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                              <div className="flex items-center gap-2 mb-1">
                                <MessageSquare className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-800">管理者からの応答</span>
                              </div>
                              <p className="text-sm text-green-700">{request.adminResponse}</p>
                            </div>
                          )}

                          {/* 割り当て済み問題表示（修正版） */}
                          {request.assignedQuestions && request.assignedQuestions.length > 0 && (
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <div className="flex items-center gap-2 mb-2">
                                <BookOpen className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-800">
                                  割り当て済み問題 ({request.assignedQuestions.length}/5)
                                </span>
                              </div>
                              <div className="grid grid-cols-5 gap-2">
                                {[1, 2, 3, 4, 5].map((stage) => {
                                  const hasQuestion = request.assignedQuestions?.some(q => q.stage === stage);
                                  const assignedQuestion = request.assignedQuestions?.find(q => q.stage === stage);
                                  
                                  return (
                                    <Button
                                      key={stage}
                                      variant={hasQuestion ? "default" : "outline"}
                                      size="sm"
                                      className={`text-center py-3 px-2 rounded text-xs transition-all ${
                                        hasQuestion 
                                          ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
                                          : 'bg-gray-200 text-gray-600 cursor-not-allowed'
                                      }`}
                                      disabled={!hasQuestion}
                                      onClick={() => {
                                        if (hasQuestion && assignedQuestion) {
                                          // 問題確認モーダルを開く
                                          setSelectedQuestionForView(assignedQuestion.question);
                                          setIsQuestionViewModalOpen(true);
                                        }
                                      }}
                                    >
                                      <div className="flex flex-col items-center gap-1">
                                        <span className="font-semibold">第{stage}回</span>
                                        <div className="text-xs opacity-80">
                                          {stage === 1 && '1日後'}
                                          {stage === 2 && '3日後'}
                                          {stage === 3 && '1週間後'}
                                          {stage === 4 && '2週間後'}
                                          {stage === 5 && '1か月後'}
                                        </div>
                                        {hasQuestion && <CheckCircle className="h-3 w-3" />}
                                      </div>
                                    </Button>
                                  );
                                })}
                              </div>
                              {/* 全て完了している場合の表示 */}
                              {request.assignedQuestions.length >= 5 && (
                                <div className="mt-2 text-center">
                                  <Badge variant="default" className="bg-green-600 text-white">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    全段階完了
                                  </Badge>
                                </div>
                              )}
                            </div>
                          )}

                          {/* アクションボタン */}
                          <div className="flex items-center justify-between pt-4 border-t">
                            <div className="flex items-center space-x-2">
                              {request.status === 'pending' && (
                                <>
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleStatusUpdate(request.id, 'in_progress', '復習問題の作成を開始します。')}
                                  >
                                    <Clock className="h-4 w-4 mr-1" />
                                    作業開始
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => handleStatusUpdate(request.id, 'rejected', 'リクエストを却下しました。')}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    却下
                                  </Button>
                                </>
                              )}
                              
                              {(request.status === 'pending' || request.status === 'in_progress') && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleAssignQuestions(request)}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  問題を割り当て
                                </Button>
                              )}
                            </div>

                            <div className="text-xs text-gray-500">
                              ID: {request.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* 問題割り当てモーダル */}
      {selectedRequest && (
        <QuestionAssignmentModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedRequest(null);
          }}
          request={selectedRequest}
          onAssignmentComplete={() => {
            loadRequests();
            setIsModalOpen(false);
            setSelectedRequest(null);
          }}
        />
      )}

      {/* 問題確認モーダル（改良版） */}
      {selectedQuestionForView && isQuestionViewModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-bold">復習問題の内容確認</h3>
                <Badge variant="outline" className="bg-blue-50">
                  {selectedQuestionForView.subject} - {selectedQuestionForView.unit}
                </Badge>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setIsQuestionViewModalOpen(false);
                  setSelectedQuestionForView(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* 問題メタ情報 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <User className="h-4 w-4" />
                    <span>問題情報</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <strong>作成者:</strong> {selectedQuestionForView.teacherName}
                    </div>
                    <div>
                      <strong>作成日:</strong> {selectedQuestionForView.createdAt?.toLocaleDateString('ja-JP')}
                    </div>
                    <div>
                      <strong>対象段階:</strong> 第{selectedQuestionForView.targetStage}回復習
                    </div>
                  </div>
                  {selectedQuestionForView.title && (
                    <div className="mt-2">
                      <strong>タイトル:</strong> {selectedQuestionForView.title}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 問題内容 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-base">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    <span>問題</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                      {selectedQuestionForView.content}
                    </pre>
                  </div>
                </CardContent>
              </Card>

              {/* 解答 */}
              {selectedQuestionForView.answer && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-base">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>解答・解説</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                        {selectedQuestionForView.answer}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 問題編集ボタン */}
              <div className="flex justify-center pt-4 border-t">
                <Button
                  onClick={() => {
                    // 編集モーダルを開く処理
                    // まず現在のモーダルを閉じる
                    setIsQuestionViewModalOpen(false);
                    setSelectedQuestionForView(null);
                    
                    // 該当するリクエストを見つけて編集モーダルを開く
                    const parentRequest = requests.find(req => 
                      req.assignedQuestions?.some(aq => aq.question.id === selectedQuestionForView.id)
                    );
                    
                    if (parentRequest) {
                      setSelectedRequest(parentRequest);
                      setIsModalOpen(true);
                    }
                  }}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>この問題を編集</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper function (この関数が存在しない場合は追加)
  function getStageName(stage: any) {
    return `第${stage}回`;
  }
}