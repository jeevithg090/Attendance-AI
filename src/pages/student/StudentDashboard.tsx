// ═══════════════════════════════════════════════════════════
// AttendAI — Student Dashboard
// ═══════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAttendance } from '../../hooks/useAttendance';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import type { StudentDashboardData, Subject, AttendanceRecord } from '../../types';
import { Calendar, Clock, CheckCircle2, AlertCircle, TrendingUp, BookOpen, ScanFace } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const { getStudentStats, isLoading } = useAttendance();
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      const stats = await getStudentStats();
      if (stats) setData(stats);
    };
    fetchStats();
  }, [getStudentStats]);

  if (isLoading || !data) {
    return <LoadingSpinner variant="skeleton" />;
  }

  // Calculate overall attendance
  const totalClassesAttended = data.subjectAttendance.reduce((acc, curr) => acc + curr.attended, 0);
  const totalClassesHeld = data.subjectAttendance.reduce((acc, curr) => acc + curr.totalClasses, 0);
  const overallPercentage = totalClassesHeld === 0 ? 100 : Math.round((totalClassesAttended / totalClassesHeld) * 100);

  // Check if there are active sessions
  const hasActiveSessions = data.todaySchedule?.some(s => s.sessionActive);

  return (
    <div className="space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-[var(--bg-surface)] p-6 rounded-[var(--radius-xl)] border border-[var(--border)] relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500 rounded-full mix-blend-screen filter blur-[80px] opacity-20" />
        
        <div className="relative z-10">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-[var(--text-muted)] bg-clip-text text-transparent mb-1">
            Welcome back, {user?.displayName.split(' ')[0]} 👋
          </h1>
          <p className="text-[var(--text-secondary)]">
            Enrollment ID: <span className="font-mono text-[var(--text-primary)]">{user?.enrollmentId}</span>
            <span className="mx-2">•</span>
            {user?.department}
          </p>
        </div>
        
        <div className="relative z-10 shrink-0">
          <div className="flex items-center gap-4 bg-[var(--bg-elevated)] p-4 rounded-[var(--radius-lg)] border border-[var(--border-light)]">
            <div>
              <p className="text-sm text-[var(--text-muted)] font-medium mb-0.5">Overall Attendance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tracking-tight text-[var(--text-primary)]">
                  {overallPercentage}%
                </span>
                <Badge 
                  variant={overallPercentage >= 75 ? 'present' : overallPercentage >= 65 ? 'warning' : 'absent'} 
                  size="sm"
                >
                  {overallPercentage >= 75 ? 'Good' : 'Needs attention'}
                </Badge>
              </div>
            </div>
            
            {/* Circular progress */}
            <div className="relative w-14 h-14">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-[var(--border)]" />
                <circle 
                  cx="28" cy="28" r="24" 
                  stroke="currentColor" 
                  strokeWidth="4" 
                  fill="transparent" 
                  strokeDasharray={2 * Math.PI * 24}
                  strokeDashoffset={2 * Math.PI * 24 * (1 - overallPercentage / 100)}
                  className={`transition-all duration-1000 ${
                    overallPercentage >= 75 ? 'text-emerald-500' : 
                    overallPercentage >= 65 ? 'text-amber-500' : 'text-rose-500'
                  }`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Schedule & Quick Action */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Action Card (Conditional) */}
          {hasActiveSessions ? (
            <Card gradient padding="lg" className="relative overflow-hidden group">
               <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
               <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div>
                   <div className="flex items-center gap-2 mb-2">
                     <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse-dot" />
                     <h2 className="text-lg font-bold text-white">Active Session Available!</h2>
                   </div>
                   <p className="text-[var(--text-secondary)] text-sm">A teacher has opened an attendance session.</p>
                 </div>
                 <Button 
                   size="lg" 
                   icon={<ScanFace size={20} />} 
                   className="shrink-0 animate-pulse-glow"
                   onClick={() => navigate('/student/mark-attendance')}
                 >
                   Mark Attendance Now
                 </Button>
               </div>
            </Card>
          ) : (
            <Card padding="lg" className="border-dashed border-2 bg-transparent text-center">
               <div className="w-12 h-12 rounded-full bg-[var(--bg-elevated)] mx-auto flex items-center justify-center mb-3">
                 <Clock className="text-[var(--text-muted)]" size={24} />
               </div>
               <h3 className="text-[var(--text-primary)] font-medium mb-1">No Active Sessions</h3>
               <p className="text-sm text-[var(--text-muted)]">Check back when your class starts.</p>
            </Card>
          )}

          {/* Subject Attendance Breakdown */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <BookOpen className="text-indigo-400" size={20} />
                Subject Attendance
              </h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/student/my-attendance')}>
                View Details
              </Button>
            </div>
            
            <div className="space-y-5">
              {data.subjectAttendance.length === 0 ? (
                <p className="text-[var(--text-muted)] text-sm text-center py-4">No subjects enrolled yet.</p>
              ) : (
                data.subjectAttendance.map((subject) => {
                  const isLow = subject.percentage < 75;
                  const isCritical = subject.percentage < 65;
                  
                  return (
                    <div key={subject.subjectId} className="group">
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <p className="font-medium text-[var(--text-primary)] group-hover:text-indigo-400 transition-colors">
                            {subject.subjectName}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] font-mono">{subject.subjectCode}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-lg font-bold font-mono ${
                            isCritical ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {subject.percentage}%
                          </span>
                          <p className="text-xs text-[var(--text-muted)]">
                            {subject.attended} / {subject.totalClasses} classes
                          </p>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="h-2 w-full bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            isCritical ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(subject.percentage, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right Column - Recent Activity */}
        <div className="space-y-6">
          <Card className="h-full">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
              <TrendingUp className="text-purple-400" size={20} />
              Recent Activity
            </h2>
            
            <div className="space-y-4">
              {data.recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 mx-auto bg-[var(--bg-elevated)] rounded-full flex items-center justify-center mb-3">
                    <Calendar className="text-[var(--text-muted)]" size={20} />
                  </div>
                  <p className="text-[var(--text-muted)] text-sm">No recent attendance records.</p>
                </div>
              ) : (
                data.recentActivity.slice(0, 5).map((record) => {
                  // Find subject name from subjectAttendance data
                  const subjectName = data.subjectAttendance.find(s => s.subjectId === record.subjectId)?.subjectName || 'Unknown Subject';
                  
                  return (
                    <div key={record.id} className="flex gap-4 p-3 rounded-[var(--radius-md)] bg-[var(--bg-elevated)] border border-[var(--border-light)] hover:border-[var(--border)] transition-colors">
                      <div className="mt-0.5 shrink-0">
                        {record.status === 'present' ? (
                          <CheckCircle2 className="text-emerald-500" size={18} />
                        ) : record.status === 'absent' ? (
                          <AlertCircle className="text-rose-500" size={18} />
                        ) : (
                          <AlertCircle className="text-amber-500" size={18} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate" title={subjectName}>
                          {subjectName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-[var(--text-muted)]">
                            {format(parseISO(record.date), 'MMM d, yyyy')}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)]">•</span>
                          <span className={`text-[10px] font-medium uppercase tracking-wider ${
                            record.status === 'present' ? 'text-emerald-400' :
                            record.status === 'absent' ? 'text-rose-400' : 'text-amber-400'
                          }`}>
                            {record.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {data.recentActivity.length > 5 && (
              <Button 
                variant="ghost" 
                className="w-full mt-4" 
                onClick={() => navigate('/student/my-attendance')}
              >
                View All History
              </Button>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
