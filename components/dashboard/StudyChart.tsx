'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// 型定義を追加
interface ChartDataPoint {
  date: string;
  dateLabel: string;
  [userName: string]: string | number; // ユーザー名をキーとする動的プロパティ
}

interface StudyChartProps {
  chartData: any[];
  allStudyRecords: any[];
  userNamesMap: Map<string, string>;
}

// ユーザーごとに色を割り当てるための色配列
const USER_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
  '#14b8a6', '#eab308', '#dc2626', '#059669', '#7c3aed'
];

export function StudyChart({ chartData, allStudyRecords, userNamesMap }: StudyChartProps) {
  const [chartType, setChartType] = useState<'individual' | 'stacked'>('individual');

  // ユーザーごとの学習データを生成
  const generateUserChartData = (): ChartDataPoint[] => {
    const today = new Date();
    const userIds = Array.from(userNamesMap.keys());
    
    // 日付ごと、ユーザーごとの学習時間を集計
    const dataByDateAndUser: Record<string, Record<string, number>> = {};
    
    // 直近10日間の日付を準備
    const dates = [];
    for (let i = 9; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      const dayOfWeek = dayNames[date.getDay()];
      const shortDate = `${date.getMonth() + 1}/${date.getDate()}`;
      
      dates.push({
        dateStr,
        shortDate,
        dateLabel: `${shortDate}(${dayOfWeek})`
      });
      
      dataByDateAndUser[dateStr] = {};
      userIds.forEach(userId => {
        dataByDateAndUser[dateStr][userId] = 0;
      });
    }
    
    // 学習記録を集計
    allStudyRecords.forEach(record => {
      const date = record.studyDate;
      const userId = record.userId;
      if (dataByDateAndUser[date] && userIds.includes(userId)) {
        dataByDateAndUser[date][userId] += record.studyMinutes || 0;
      }
    });
    
    // チャート用データに変換
    return dates.map(({ dateStr, shortDate, dateLabel }) => {
      const dayData: ChartDataPoint = {
        date: shortDate,
        dateLabel: dateLabel
      };
      
      userIds.forEach(userId => {
        const userName = userNamesMap.get(userId) || 'ユーザー';
        dayData[userName] = dataByDateAndUser[dateStr][userId];
      });
      
      return dayData;
    });
  };

  // 累積学習時間データを生成（積み上げグラフ用）
  const generateCumulativeData = (): ChartDataPoint[] => {
    const today = new Date();
    const userIds = Array.from(userNamesMap.keys());
    
    // 各ユーザーの累積学習時間を追跡
    const userCumulativeMinutes: Record<string, number> = {};
    userIds.forEach(userId => {
      userCumulativeMinutes[userId] = 0;
    });
    
    // 直近10日間の日付を準備
    const dates = [];
    for (let i = 9; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      const dayOfWeek = dayNames[date.getDay()];
      const shortDate = `${date.getMonth() + 1}/${date.getDate()}`;
      
      dates.push({
        dateStr,
        shortDate,
        dateLabel: `${shortDate}(${dayOfWeek})`
      });
    };
    
    // 日付ごとの学習時間を集計
    const dailyStudyMinutes: Record<string, Record<string, number>> = {};
    dates.forEach(({ dateStr }) => {
      dailyStudyMinutes[dateStr] = {};
      userIds.forEach(userId => {
        dailyStudyMinutes[dateStr][userId] = 0;
      });
    });
    
    // 学習記録を日付ごとに集計
    allStudyRecords.forEach(record => {
      const date = record.studyDate;
      const userId = record.userId;
      if (dailyStudyMinutes[date] && userIds.includes(userId)) {
        dailyStudyMinutes[date][userId] += record.studyMinutes || 0;
      }
    });
    
    // 累積データを計算してチャート用データに変換
    return dates.map(({ dateStr, shortDate, dateLabel }) => {
      const dayData: ChartDataPoint = {
        date: shortDate,
        dateLabel: dateLabel
      };
      
      // 各ユーザーの累積時間を更新
      userIds.forEach(userId => {
        const userName = userNamesMap.get(userId) || 'ユーザー';
        userCumulativeMinutes[userId] += dailyStudyMinutes[dateStr][userId];
        dayData[userName] = userCumulativeMinutes[userId];
      });
      
      return dayData;
    });
  };

  const userChartData = generateUserChartData();
  const cumulativeData = generateCumulativeData();
  const userNames = Array.from(userNamesMap.values());

  // 個別折れ線グラフ用のツールチップフォーマット
  const formatIndividualTooltip = (value: number, name: string) => {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    const timeString = hours > 0 ? `${hours}時間${minutes}分` : `${minutes}分`;
    return [timeString, name];
  };

  // 積み上げグラフ用のツールチップフォーマット
  const formatCumulativeTooltip = (value: number, name: string) => {
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    const timeString = hours > 0 ? `${hours}時間${minutes}分` : `${minutes}分`;
    return [timeString, `${name}の累積時間`];
  };

  // 統計計算
  const calculateStats = () => {
    if (chartType === 'individual') {
      if (userChartData.length === 0) return { totalMinutes: 0, avgMinutes: 0, maxMinutes: 0 };
      
      let totalMinutes = 0;
      let maxMinutes = 0;
      
      userChartData.forEach(dayData => {
        let dayTotal = 0;
        userNames.forEach(userName => {
          const minutes = (dayData[userName] as number) || 0;
          dayTotal += minutes;
        });
        totalMinutes += dayTotal;
        maxMinutes = Math.max(maxMinutes, dayTotal);
      });
      
      const avgMinutes = Math.round(totalMinutes / userChartData.length);
      return { totalMinutes, avgMinutes, maxMinutes };
    } else {
      // 累積表示の場合
      if (cumulativeData.length === 0) return { totalMinutes: 0, avgMinutes: 0, maxMinutes: 0 };
      
      // 最終日（10日目）時点での各ユーザーの累積時間を取得
      const lastDayData = cumulativeData[cumulativeData.length - 1];
      let totalMinutes = 0;
      let maxUserMinutes = 0;
      
      userNames.forEach(userName => {
        const userMinutes = (lastDayData[userName] as number) || 0;
        totalMinutes += userMinutes;
        maxUserMinutes = Math.max(maxUserMinutes, userMinutes);
      });
      
      const avgMinutes = userNames.length > 0 ? Math.round(totalMinutes / userNames.length) : 0;
      return { totalMinutes, avgMinutes: avgMinutes, maxMinutes: maxUserMinutes };
    }
  };

  const stats = calculateStats();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>📊 ユーザー別学習時間チャート</CardTitle>
            <Badge variant="default" className="bg-indigo-500">
              直近10日
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              variant={chartType === 'individual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('individual')}
            >
              個別表示
            </Button>
            <Button
              variant={chartType === 'stacked' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('stacked')}
            >
              累積表示
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {(chartType === 'individual' ? userChartData.length === 0 : cumulativeData.length === 0) || userNames.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            チャートデータがありません
          </div>
        ) : (
          <>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'individual' ? (
                  <LineChart
                    data={userChartData}
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
                      label={{ value: '分', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={formatIndividualTooltip}
                      labelFormatter={(label) => {
                        const data = userChartData.find(d => d.date === label);
                        return data ? data.dateLabel : label;
                      }}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '6px'
                      }}
                    />
                    {userNames.map((userName, index) => (
                      <Line
                        key={userName}
                        type="monotone"
                        dataKey={userName}
                        stroke={USER_COLORS[index % USER_COLORS.length]}
                        strokeWidth={2}
                        dot={{ fill: USER_COLORS[index % USER_COLORS.length], strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                ) : (
                  <LineChart
                    data={cumulativeData}
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
                      label={{ value: '累積分', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      formatter={formatCumulativeTooltip}
                      labelFormatter={(label) => {
                        const data = cumulativeData.find(d => d.date === label);
                        return data ? `${data.dateLabel} までの累積` : label;
                      }}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #ccc',
                        borderRadius: '6px'
                      }}
                    />
                    {userNames.map((userName, index) => (
                      <Line
                        key={userName}
                        type="monotone"
                        dataKey={userName}
                        stroke={USER_COLORS[index % USER_COLORS.length]}
                        strokeWidth={3}
                        dot={{ fill: USER_COLORS[index % USER_COLORS.length], strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* ユーザー凡例 */}
            <div className="border-t pt-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">ユーザー凡例:</h4>
              <div className="flex flex-wrap gap-2">
                {userNames.map((userName, index) => (
                  <div key={userName} className="flex items-center gap-1">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: USER_COLORS[index % USER_COLORS.length] }}
                    />
                    <span className="text-xs text-gray-600">{userName}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 統計情報 */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {Math.round(stats.totalMinutes / 60)}h
                </div>
                <div className="text-xs text-muted-foreground">
                  {chartType === 'individual' ? '全ユーザー10日合計' : '10日目時点の合計'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {stats.avgMinutes}分
                </div>
                <div className="text-xs text-muted-foreground">
                  {chartType === 'individual' ? '1日平均' : '10日目平均'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">
                  {stats.maxMinutes}分
                </div>
                <div className="text-xs text-muted-foreground">
                  {chartType === 'individual' ? '最高記録日' : '10日目最高'}
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}