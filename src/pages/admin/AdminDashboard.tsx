// ═══════════════════════════════════════════════════════════
// AttendAI — Admin Dashboard
// ═══════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomStatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import PageHeader from '../../components/ui/PageHeader';
import { Users, BookMarked, Activity, ShieldAlert, GraduationCap, UserCog } from 'lucide-react';
import api, { getErrorMessage } from '../../api/client';
import type { AdminDashboardStats } from '../../types';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/attendance/dashboard/stats');
      setStats(data.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load dashboard statistics'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const header = (
    <PageHeader title="Admin Dashboard" description="System overview and campus-wide metrics." />
  );

  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorState message={error} onRetry={fetchStats} />
      </div>
    );
  }

  if (isLoading || !stats) {
    return <LoadingSpinner variant="skeleton" />;
  }

  return (
    <div className="space-y-6">
      {header}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CustomStatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={<GraduationCap size={20} />}
          variant="primary"
        />
        <CustomStatCard
          title="Total Teachers"
          value={stats.totalTeachers}
          icon={<UserCog size={20} />}
          variant="info"
        />
        <CustomStatCard
          title="Today's Attendance"
          value={stats.todayAttendancePercent}
          suffix="%"
          icon={<Activity size={20} />}
          variant={stats.todayAttendancePercent > 75 ? 'success' : 'warning'}
        />
        <CustomStatCard
          title="Proxy Attempts (Today)"
          value={stats.proxyAttemptsToday}
          icon={<ShieldAlert size={20} />}
          variant="danger"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center mb-4">
            <Users size={32} aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold mb-2">User Management</h2>
          <p className="text-sm text-[var(--text-muted)] mb-6 max-w-sm">
            Register students and teachers, search the directory and export account lists.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:px-4">
            <Button variant="secondary" className="flex-1" onClick={() => navigate('/admin/manage-students')}>
              Manage Students
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => navigate('/admin/manage-teachers')}>
              Manage Teachers
            </Button>
          </div>
        </Card>

        <Card className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-4">
            <BookMarked size={32} aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold mb-2">System Operations</h2>
          <p className="text-sm text-[var(--text-muted)] mb-6 max-w-sm">
            Configure geofencing, update face match thresholds, and view campus-wide reports.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:px-4">
            <Button variant="secondary" className="flex-1" onClick={() => navigate('/admin/system-settings')}>
              System Settings
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => navigate('/admin/attendance-reports')}
            >
              View Reports
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
