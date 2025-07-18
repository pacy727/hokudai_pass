"use client"

import { create } from 'zustand';
import { StudyRecord } from '@/types/study';

interface RecordState {
  records: StudyRecord[];
  isLoading: boolean;
  error: string | null;
  
  // Timer連携データ
  pendingRecord: Partial<StudyRecord> | null;
  
  // Actions
  setRecords: (records: StudyRecord[]) => void;
  addRecord: (record: StudyRecord) => void;
  updateRecord: (id: string, updates: Partial<StudyRecord>) => void;
  deleteRecord: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPendingRecord: (record: Partial<StudyRecord> | null) => void;
  clearPendingRecord: () => void;
}

export const useRecordStore = create<RecordState>((set, get) => ({
  records: [],
  isLoading: false,
  error: null,
  pendingRecord: null,
  
  setRecords: (records) => set({ records }),
  
  addRecord: (record) => set((state) => ({
    records: [record, ...state.records]
  })),
  
  updateRecord: (id, updates) => set((state) => ({
    records: state.records.map(record =>
      record.id === id ? { ...record, ...updates } : record
    )
  })),
  
  deleteRecord: (id) => set((state) => ({
    records: state.records.filter(record => record.id !== id)
  })),
  
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setPendingRecord: (pendingRecord) => set({ pendingRecord }),
  clearPendingRecord: () => set({ pendingRecord: null })
}));
