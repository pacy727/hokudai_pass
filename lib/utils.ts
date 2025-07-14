import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 時間フォーマット関数
export const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const formatHours = (hours: number): string => {
  if (hours < 1) {
    return `${Math.round(hours * 60)}分`;
  }
  return `${hours.toFixed(1)}時間`;
};

export const calculateStudyTime = (startTime: string, endTime: string): number => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  let diffMinutes = endMinutes - startMinutes;
  if (diffMinutes < 0) {
    diffMinutes += 24 * 60; // 日をまたぐ場合
  }
  
  return Math.round((diffMinutes / 60) * 100) / 100;
};

// 日付関連ユーティリティ
export const getDateRange = (days: number): string[] => {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  return dates;
};

export const getWeekDates = (): string[] => {
  return getDateRange(7);
};

export const getMonthCalendar = (year: number, month: number): Date[][] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstDayOfWeek = firstDay.getDay();
  
  const calendar: Date[][] = [];
  let week: Date[] = [];
  
  // 前月の日付で埋める
  for (let i = 0; i < firstDayOfWeek; i++) {
    week.push(new Date(year, month, -firstDayOfWeek + i + 1));
  }
  
  // 当月の日付
  for (let day = 1; day <= lastDay.getDate(); day++) {
    if (week.length === 7) {
      calendar.push(week);
      week = [];
    }
    week.push(new Date(year, month, day));
  }
  
  // 次月の日付で埋める
  while (week.length < 7) {
    week.push(new Date(year, month + 1, week.length - firstDayOfWeek + 1));
  }
  calendar.push(week);
  
  return calendar;
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const formatDateJapanese = (date: Date): string => {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};
