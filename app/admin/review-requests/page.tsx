'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ReviewQuestionRequestService } from '@/lib/db/reviewQuestionRequestService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Shield,
  RotateCcw,
  PlayCircle
} from 'lucide-react';
import { QuestionAssignmentModal } from '@/components/admin/QuestionAssignmentModal';
import { RejectionModal } from '@/components/admin/RejectionModal';

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

  // 却下モーダル用の state
  const [selectedRequestForRejection, setSelectedRequestForRejection] = useState<ReviewQuestionRequest | null>(null);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);

  // ステータス変更モーダル用の state（新規追加）
  const [selectedRequestForStatusChange, setSelectedRequestForStatusChange] = useState<ReviewQuestionRequest | null>(null);
  const [isStatusChangeModalOpen, setIsStatusChangeModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ReviewQuestionRequest['status']>('pending');

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

  // 却下処理関数
  const handleRejectRequest = async (requestId: string, reason: string) => {
    try {
      await ReviewQuestionRequestService.updateRequestStatus(requestId, 'rejected', reason);
      await loadRequests(); // データを再読み込み
      
      toast({
        title: "リクエスト却下完了",
        description: "復習問題リクエストを却下しました"
      });
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "エラー",
        description: "却下処理に失敗しました",
        variant: "destructive"
      });
    }
  };

  // ステータス変更処理（新規追加）
  const handleStatusChange = async (requestId: string, newStatus: ReviewQuestionRequest['status']) => {
    try {
      const statusMessages = {
        pending: 'リクエストを受付中に戻しました。',
        in_progress: '復習問題の作成を開始します。',
        completed: 'リクエストを完了済みに変更しました。',
        rejected: 'リクエストを却下しました。'
      };

      await ReviewQuestionRequestService.updateRequestStatus(requestId, newStatus, statusMessages[newStatus]);
      await loadRequests();
      
      toast({
        title: "ステータス変更完了",
        description: `リクエストのステータスを「${getStatusLabel(newStatus)}」に変更しました`
      });
    } catch (error) {
      console.error('Error changing status:', error);
      toast({
        title: "エラー",
        description: "ステータスの変更に失敗しました",
        variant: "destructive"
      });
    }
  };

  // 却下ボタンのクリックハンドラー
  const handleRejectButtonClick = (request: ReviewQuestionRequest) => {
    setSelectedRequestForRejection(request);
    setIsRejectionModalOpen(true);
  };

  // ステータス変更ボタンのクリックハンドラー（新規追加）
  const handleStatusChangeButtonClick = (request: ReviewQuestionRequest) => {
    setSelectedRequestForStatusChange(request);
    setNewStatus(request.status); // 現在のステータスを初期値に
    setIsStatusChangeModalOpen(true);
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

  // 日付フォーマット関数（安全な変換）
  const formatDate = (date: any): string => {
    if (!date) return '不明';
    
    // すでにDateオブジェクトの場合
    if (date instanceof Date) {
      return date.toLocaleDateString('ja-JP');
    }
    
    // Firestore Timestampの場合
    if (date && typeof date.toDate === 'function') {
      return date.toDate().toLocaleDateString('ja-JP');
    }
    
    // 文字列の場合
    if (typeof date === 'string') {
      return new Date(date).toLocaleDateString('ja-JP');
    }
    
    return '不明';
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
                getFilteredRequests(tabValue).map((request) => (
                  <Card key={request.id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                    {/* 1行目：基本情報と割り当て状況 */}
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        {/* 左側：基本情報 */}
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <Badge variant="outline" className="text-xs px-1 py-0">
                            {request.subject}
                          </Badge>
                          <Badge className={`${getStatusColor(request.status)} text-xs px-1 py-0`}>
                            {getStatusLabel(request.status)}
                          </Badge>
                          <span className="text-xs text-gray-500 truncate">
                            {request.userName} | {formatDate(request.createdAt)}
                          </span>
                        </div>
                        
                        {/* 右側：割り当て済み問題 */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {request.assignedQuestions && request.assignedQuestions.length > 0 ? (
                            <>
                              {[1, 2, 3, 4, 5].map((stage) => {
                                const hasQuestion = request.assignedQuestions?.some(q => q.stage === stage);
                                const assignedQuestion = request.assignedQuestions?.find(q => q.stage === stage);
                                
                                return (
                                  <Button
                                    key={stage}
                                    variant="ghost"
                                    size="sm"
                                    className={`h-6 px-2 text-xs font-medium ${
                                      hasQuestion 
                                        ? 'text-green-700 bg-green-50 hover:bg-green-100' 
                                        : 'text-gray-400 bg-gray-50 cursor-not-allowed'
                                    }`}
                                    disabled={!hasQuestion}
                                    onClick={() => {
                                      if (hasQuestion && assignedQuestion) {
                                        setSelectedQuestionForView(assignedQuestion.question);
                                        setIsQuestionViewModalOpen(true);
                                      }
                                    }}
                                  >
                                    第{stage}回{hasQuestion ? '✓' : ''}
                                  </Button>
                                );
                              })}
                              {request.assignedQuestions.length >= 5 && (
                                <Badge variant="default" className="bg-green-600 text-white text-xs px-1 py-0 ml-1">
                                  完了
                                </Badge>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">問題未割り当て</span>
                          )}
                        </div>
                      </div>
                      
                      {/* 2行目：学習内容とアクション */}
                      <div className="flex items-center justify-between">
                        {/* 学習内容 */}
                        <div className="flex-1 min-w-0 mr-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm truncate">{request.unit}</span>
                            <span className="text-xs text-gray-500 truncate">
                              {request.content}
                            </span>
                          </div>
                          {(request.details || request.memo || request.adminResponse) && (
                            <div className="text-xs text-gray-400 truncate mt-1">
                              {request.details && `詳細: ${request.details}`}
                              {request.details && request.memo && ' | '}
                              {request.memo && `メモ: ${request.memo}`}
                              {request.adminResponse && (
                                <div className={`mt-1 ${request.status === 'rejected' ? 'text-red-500' : 'text-blue-500'}`}>
                                  {request.status === 'rejected' ? '却下理由' : '管理者メモ'}: {request.adminResponse}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* アクションボタン */}
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          {request.status === 'pending' && (
                            <>
                              <Button 
                                size="sm" 
                                onClick={() => handleStatusUpdate(request.id, 'in_progress', '復習問題の作成を開始します。')}
                                className="h-6 px-2 text-xs"
                              >
                                <PlayCircle className="w-3 h-3 mr-1" />
                                開始
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleRejectButtonClick(request)}
                                className="h-6 px-2 text-xs"
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                却下
                              </Button>
                            </>
                          )}
                          
                          {(request.status === 'pending' || request.status === 'in_progress') && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleAssignQuestions(request)}
                              className="h-6 px-2 text-xs"
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              問題作成
                            </Button>
                          )}

                          {/* ステータス変更ボタン（新規追加） */}
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleStatusChangeButtonClick(request)}
                            className="h-6 px-2 text-xs"
                            title="ステータス変更"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            変更
                          </Button>
                          
                          <span className="text-xs text-gray-300 ml-2">
                            {request.id.slice(0, 4)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
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

      {/* 却下モーダル */}
      {selectedRequestForRejection && (
        <RejectionModal
          isOpen={isRejectionModalOpen}
          onClose={() => {
            setIsRejectionModalOpen(false);
            setSelectedRequestForRejection(null);
          }}
          request={selectedRequestForRejection}
          onReject={handleRejectRequest}
        />
      )}

      {/* ステータス変更モーダル（新規追加） */}
      {selectedRequestForStatusChange && isStatusChangeModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <RotateCcw className="h-5 w-5" />
                  <span>ステータス変更</span>
                </CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsStatusChangeModalOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-4">
                {/* リクエスト情報 */}
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div><strong>学習者:</strong> {selectedRequestForStatusChange.userName}</div>
                  <div><strong>科目:</strong> {selectedRequestForStatusChange.subject}</div>
                  <div><strong>単元:</strong> {selectedRequestForStatusChange.unit}</div>
                  <div><strong>現在のステータス:</strong> 
                    <Badge className={`ml-2 ${getStatusColor(selectedRequestForStatusChange.status)}`}>
                      {getStatusLabel(selectedRequestForStatusChange.status)}
                    </Badge>
                  </div>
                </div>

                {/* ステータス選択 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">新しいステータス</label>
                  <Select value={newStatus} onValueChange={(value) => setNewStatus(value as ReviewQuestionRequest['status'])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          <span>受付中</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="in_progress">
                        <div className="flex items-center space-x-2">
                          <PlayCircle className="h-4 w-4 text-blue-600" />
                          <span>作業中</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="completed">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>完了</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="rejected">
                        <div className="flex items-center space-x-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span>却下</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 注意事項 */}
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong>注意:</strong> ステータスを「却下」に変更する場合は、却下モーダルから理由を入力してください。
                    </div>
                  </div>
                </div>

                {/* ボタン */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsStatusChangeModalOpen(false)}
                  >
                    キャンセル
                  </Button>
                  <Button 
                    onClick={() => {
                      if (newStatus === 'rejected') {
                        // 却下の場合は専用モーダルを開く
                        setIsStatusChangeModalOpen(false);
                        setSelectedRequestForRejection(selectedRequestForStatusChange);
                        setIsRejectionModalOpen(true);
                      } else {
                        handleStatusChange(selectedRequestForStatusChange.id, newStatus);
                        setIsStatusChangeModalOpen(false);
                      }
                    }}
                    disabled={newStatus === selectedRequestForStatusChange.status}
                  >
                    変更実行
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 問題確認モーダル */}
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
                      <strong>作成日:</strong> {formatDate(selectedQuestionForView.createdAt)}
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
                    setIsQuestionViewModalOpen(false);
                    setSelectedQuestionForView(null);
                    
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
}