// ═══════════════════════════════════════════════════════════
// AttendAI — Admin Dashboard
// ═══════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StatCard from '../../components/ui/Card'; // Actually use the custom StatCard we built
import CustomStatCard from '../../components/ui/StatCard';
import Card from '../../components/ui/Card';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import { LayoutDashboard, Users, BookMarked, Activity, ShieldAlert, GraduationCap, UserCog } from 'lucide-react';
import api from '../../api/client';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/attendance/dashboard/stats');
        setStats(data.data);
      } catch { /* ignore */ } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  if (isLoading || !stats) {
    return <LoadingSpinner variant="skeleton" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">System overview and campus-wide metrics.</p>
        </div>
      </div>

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
        <Card className="flex flex-col items-center justify-center py-12 text-center">
           <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center mb-4">
              <Users size={32} />
           </div>
           <h3 className="text-lg font-bold mb-2">User Management</h3>
           <p className="text-sm text-[var(--text-muted)] mb-6 max-w-sm">
             Add new students and teachers, reset passwords, and manage enrollments.
           </p>
           <div className="flex gap-4 w-full px-8">
             <Button variant="secondary" className="flex-1" onClick={() => navigate('/admin/manage-students')}>
               Manage Students
             </Button>
             <Button variant="secondary" className="flex-1" onClick={() => navigate('/admin/manage-teachers')}>
               Manage Teachers
             </Button>
           </div>
        </Card>
        
        <Card className="flex flex-col items-center justify-center py-12 text-center">
           <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-4">
              <BookMarked size={32} />
           </div>
           <h3 className="text-lg font-bold mb-2">System Operations</h3>
           <p className="text-sm text-[var(--text-muted)] mb-6 max-w-sm">
             Configure geofencing, update face match thresholds, and view campus-wide reports.
           </p>
           <div className="flex gap-4 w-full px-8">
             <Button variant="secondary" className="flex-1" onClick={() => navigate('/admin/system-settings')}>
               System Settings
             </Button>
             <Button variant="secondary" className="flex-1" onClick={() => navigate('/admin/attendance-reports')}>
               View Reports
             </Button>
           </div>
        </Card>
      </div>
    </div>
  );
}
