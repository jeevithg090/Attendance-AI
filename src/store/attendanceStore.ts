// ═══════════════════════════════════════════════════════════
// AttendAI — Attendance Store (Zustand)
// ═══════════════════════════════════════════════════════════

import { create } from 'zustand';
import api from '../api/client';
import type { AttendanceSession, AttendanceRecord } from '../types';

interface AttendanceState {
  activeSessions: AttendanceSession[];
  currentSession: AttendanceSession | null;
  sessionRecords: AttendanceRecord[];
  isLoading: boolean;

  fetchActiveSessions: () => Promise<void>;
  fetchTeacherSessions: (teacherId: string) => Promise<void>;
  fetchSessionRecords: (sessionId: string) => Promise<void>;
  createSession: (subjectId: string) => Promise<AttendanceSession>;
  closeSession: (sessionId: string) => Promise<void>;
  markAttendance: (data: {
    sessionId: string;
    faceMatchScore: number;
    latitude?: number;
    longitude?: number;
    deviceInfo?: string;
  }) => Promise<AttendanceRecord>;
  overrideAttendance: (recordId: string, status: string, reason: string) => Promise<void>;
  setCurrentSession: (session: AttendanceSession | null) => void;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  activeSessions: [],
  currentSession: null,
  sessionRecords: [],
  isLoading: false,

  fetchActiveSessions: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/sessions/active');
      set({ activeSessions: data.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchTeacherSessions: async (teacherId) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/sessions', { params: { teacherId, limit: 20 } });
      set({ activeSessions: data.data, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchSessionRecords: async (sessionId) => {
    try {
      const { data } = await api.get(`/attendance/session/${sessionId}`);
      set({ sessionRecords: data.data });
    } catch {
      console.error('Failed to fetch session records');
    }
  },

  createSession: async (subjectId) => {
    const { data } = await api.post('/sessions', { subjectId });
    const session = data.data;
    set({ currentSession: session });
    return session;
  },

  closeSession: async (sessionId) => {
    await api.post(`/sessions/${sessionId}/close`);
    set({ currentSession: null });
  },

  markAttendance: async (markData) => {
    const { data } = await api.post('/attendance/mark', markData);
    return data.data;
  },

  overrideAttendance: async (recordId, status, reason) => {
    await api.post('/attendance/override', { recordId, status, reason });
    // Refresh records
    const session = get().currentSession;
    if (session) {
      await get().fetchSessionRecords(session.id);
    }
  },

  setCurrentSession: (session) => set({ currentSession: session }),
}));
