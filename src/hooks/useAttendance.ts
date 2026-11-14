// ═══════════════════════════════════════════════════════════
// AttendAI — useAttendance Hook
// ═══════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import api, { getErrorMessage } from '../api/client';
import type { AttendanceRecord } from '../types';

export function useAttendance() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStudentStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/attendance/my-stats');
      setIsLoading(false);
      return data.data;
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch stats'));
      setIsLoading(false);
      return null;
    }
  }, []);

  const getSubjectStats = useCallback(async (subjectId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/attendance/subject/${subjectId}/stats`);
      setIsLoading(false);
      return data.data;
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch subject stats'));
      setIsLoading(false);
      return null;
    }
  }, []);

  const getStudentRecords = useCallback(async (studentId: string, subjectId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = subjectId ? { subjectId } : {};
      const { data } = await api.get(`/attendance/student/${studentId}`, { params });
      setIsLoading(false);
      return data.data as AttendanceRecord[];
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch records'));
      setIsLoading(false);
      return [];
    }
  }, []);

  return { isLoading, error, getStudentStats, getSubjectStats, getStudentRecords };
}
