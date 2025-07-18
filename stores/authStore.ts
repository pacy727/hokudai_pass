"use client"

import { create } from 'zustand';
import { User } from '@/types/auth';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true, // 初期値はtrue
  error: null,
  
  setUser: (user) => {
    console.log('🔄 authStore.setUser called with:', user ? 'user data' : 'null');
    set({ user });
    console.log('✅ authStore.setUser completed');
  },
  
  setLoading: (isLoading) => {
    console.log('🔄 authStore.setLoading called with:', isLoading);
    set({ isLoading });
    console.log('✅ authStore.setLoading completed, new state:', get().isLoading);
  },
  
  setError: (error) => {
    console.log('🔄 authStore.setError called with:', error);
    set({ error });
    console.log('✅ authStore.setError completed');
  },
  
  logout: () => {
    console.log('🔄 authStore.logout called');
    set({ user: null, error: null, isLoading: false });
    console.log('✅ authStore.logout completed');
  }
}));