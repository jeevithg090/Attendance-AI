// ═══════════════════════════════════════════════════════════
// AttendAI — Auth Store (Zustand)
// ═══════════════════════════════════════════════════════════

import { create } from 'zustand';
import api from '../api/client';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: JSON.parse(localStorage.getItem('attendai_user') || 'null'),
  token: localStorage.getItem('attendai_token'),
  isLoading: false,
  isAuthenticated: !!localStorage.getItem('attendai_token'),

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      const { token, user } = data.data;

      localStorage.setItem('attendai_token', token);
      localStorage.setItem('attendai_user', JSON.stringify(user));

      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  },

  logout: () => {
    localStorage.removeItem('attendai_token');
    localStorage.removeItem('attendai_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  loadUser: async () => {
    const token = localStorage.getItem('attendai_token');
    if (!token) return;

    try {
      const { data } = await api.get('/auth/me');
      const user = data.data;
      localStorage.setItem('attendai_user', JSON.stringify(user));
      set({ user, isAuthenticated: true });
    } catch {
      localStorage.removeItem('attendai_token');
      localStorage.removeItem('attendai_user');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  updateProfile: async (profileData) => {
    const { data } = await api.put('/auth/profile', profileData);
    const user = data.data;
    localStorage.setItem('attendai_user', JSON.stringify(user));
    set({ user });
  },
}));
