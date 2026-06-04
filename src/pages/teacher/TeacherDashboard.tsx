// ═══════════════════════════════════════════════════════════
// AttendAI — Teacher Dashboard
// ═══════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAttendanceStore } from '../../store/attendanceStore';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { LayoutDashboard, Users, BookMarked, Play, Activity, Clock, CheckCircle2 } from 'lucide-react';
import api from '../../api/client';
import { format, parseISO } from 'date-fns';

export default function TeacherDashboard() {
  const { user } = useAuthStore();
  const { fetchTeacherSessions, activeSessions, isLoading } = useAttendanceStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchTeacherSessions(user.id);
      
      // Fetch some teacher specific stats
      const fetchStats = async () => {
        try {
          const { data } = await api.get('/subjects/my-subjects');
          const subjects = data.data;
          
          let totalStudents = 0;
          subjects.forEach((s: any) => totalStudents += (s.enrolledCount || 0));
          
          setStats({
            totalSubjects: subjects.length,
            totalStudents,
            subjects: subjects.slice(0, 3) // Top 3
          });
        } catch { /* ignore */ }
      };
      
      fetchStats();
    }
  }, [user, fetchTeacherSessions]);

  if (isLoading || !stats) {
    return <LoadingSpinner variant="skeleton" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Manage your classes and monitor attendance.</p>
        </div>
        <Button 
          variant="primary" 
          icon={<Play size={18} />} 
          onClick={() => navigate('/teacher/take-attendance')}
          className="animate-pulse-glow hidden sm:flex"
        >
          Start Session
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Sessions"
          value={activeSessions.length}
          icon={<Activity size={20} />}
          variant="success"
        />
        <StatCard
          title="My Subjects"
          value={stats.totalSubjects}
          icon={<BookMarked size={20} />}
          variant="primary"
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={<Users size={20} />}
          variant="info"
        />
        <StatCard
          title="Classes Today"
          value={0} // Demo static
          icon={<LayoutDashboard size={20} />}
          variant="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Active Attendance Sessions</h2>
              <Button variant="ghost" size="sm" onClick={() => fetchTeacherSessions(user!.id)}>
                Refresh
              </Button>
            </div>
            
            {activeSessions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mx-auto mb-4">
                  <Clock size={32} className="text-[var(--text-muted)]" />
                </div>
                <p className="text-[var(--text-primary)] font-medium mb-1">No active sessions</p>
                <p className="text-sm text-[var(--text-muted)] mb-6">Start a new attendance session for your class.</p>
                <Button 
                  onClick={() => navigate('/teacher/take-attendance')}
                  icon={<Play size={18} />}
                >
                  Start New Session
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeSessions.map((session) => (
                  <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[var(--border-light)] bg-[var(--bg-elevated)] relative overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot" />
                        <h3 className="font-bold text-[var(--text-primary)]">{session.subjectName}</h3>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                        <span>{session.subjectCode}</span>
                        <span>•</span>
                        <span>Started: {format(parseISO(session.startTime), 'h:mm a')}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {session.totalPresent} / {session.totalEnrolled}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">Present</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => navigate(`/teacher/take-attendance?sessionId=${session.id}`)}
                      >
                        Manage Session
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <Card className="h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">My Subjects</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/manage-subjects')}>
                View All
              </Button>
            </div>
            
            {stats.subjects.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-4">No subjects assigned yet.</p>
            ) : (
              <div className="space-y-4">
                {stats.subjects.map((subject: any) => (
                  <div key={subject.id} className="p-3 rounded-lg border border-[var(--border-light)] hover:border-[var(--border)] transition-colors">
                    <h3 className="font-medium text-[var(--text-primary)]">{subject.name}</h3>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs font-mono text-[var(--text-muted)]">{subject.code}</span>
                      <span className="text-xs px-2 py-1 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
                        {subject.enrolledCount} Students
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
