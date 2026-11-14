// ═══════════════════════════════════════════════════════════
// AttendAI — Teacher Dashboard
// ═══════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAttendanceStore } from '../../store/attendanceStore';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import PageHeader from '../../components/ui/PageHeader';
import { CalendarCheck, Users, BookMarked, Play, Activity, Clock, RefreshCw } from 'lucide-react';
import api, { getErrorMessage } from '../../api/client';
import { format, isToday, parseISO } from 'date-fns';
import type { AttendanceSession, Subject } from '../../types';

export default function TeacherDashboard() {
  const { user } = useAuthStore();
  const { fetchTeacherSessions, activeSessions, isLoading } = useAttendanceStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<{
    totalSubjects: number;
    totalStudents: number;
    sessionsToday: number;
    subjects: Subject[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setError(null);
    try {
      const [subjectsRes, sessionsRes] = await Promise.all([
        api.get('/subjects/my-subjects'),
        api.get('/sessions', { params: { limit: 100 } }),
      ]);
      const subjects: Subject[] = subjectsRes.data.data;
      const sessions: AttendanceSession[] = sessionsRes.data.data;

      setStats({
        totalSubjects: subjects.length,
        totalStudents: subjects.reduce((sum, s) => sum + (s.enrolledCount || 0), 0),
        sessionsToday: sessions.filter((s) => isToday(parseISO(s.startTime))).length,
        subjects: subjects.slice(0, 3),
      });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load your dashboard'));
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchTeacherSessions(user.id);
    fetchStats();
  }, [user, fetchTeacherSessions, fetchStats]);

  const header = (
    <PageHeader
      title="Teacher Dashboard"
      description="Manage your classes and monitor attendance."
      actions={
        <Button
          variant="primary"
          icon={<Play size={18} aria-hidden="true" />}
          onClick={() => navigate('/teacher/take-attendance')}
        >
          Start session
        </Button>
      }
    />
  );

  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorState message={error} onRetry={fetchStats} />
      </div>
    );
  }

  if (!stats) {
    return <LoadingSpinner variant="skeleton" />;
  }

  return (
    <div className="space-y-6">
      {header}

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
          title="Total Enrolments"
          value={stats.totalStudents}
          icon={<Users size={20} />}
          variant="info"
        />
        <StatCard
          title="Sessions Today"
          value={stats.sessionsToday}
          icon={<CalendarCheck size={20} />}
          variant="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Active Attendance Sessions</h2>
              <Button
                variant="ghost"
                size="sm"
                icon={<RefreshCw size={14} aria-hidden="true" className={isLoading ? 'animate-spin' : ''} />}
                onClick={() => fetchTeacherSessions(user!.id)}
                disabled={isLoading}
              >
                Refresh
              </Button>
            </div>

            {activeSessions.length === 0 ? (
              <EmptyState
                icon={<Clock size={26} />}
                title="No active sessions"
                description="Start a new attendance session when your class begins."
                action={
                  <Button
                    onClick={() => navigate('/teacher/take-attendance')}
                    icon={<Play size={18} aria-hidden="true" />}
                  >
                    Start new session
                  </Button>
                }
              />
            ) : (
              <div className="space-y-4">
                {activeSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[var(--border-light)] bg-[var(--bg-elevated)] relative overflow-hidden group"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" aria-hidden="true" />

                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot"
                          aria-hidden="true"
                        />
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
              <EmptyState
                icon={<BookMarked size={24} />}
                title="No subjects yet"
                description="Create a subject and enrol students to start taking attendance."
                className="py-6"
              />
            ) : (
              <div className="space-y-4">
                {stats.subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="p-3 rounded-lg border border-[var(--border-light)] hover:border-[var(--border)] transition-colors"
                  >
                    <h3 className="font-medium text-[var(--text-primary)]">{subject.name}</h3>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs font-mono text-[var(--text-muted)]">{subject.code}</span>
                      <span className="text-xs px-2 py-1 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
                        {subject.enrolledCount} {subject.enrolledCount === 1 ? 'student' : 'students'}
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
