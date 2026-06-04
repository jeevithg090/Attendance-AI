// ═══════════════════════════════════════════════════════════
// AttendAI — Take Attendance (Teacher)
// ═══════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useAttendanceStore } from '../../store/attendanceStore';
import { useSSE } from '../../hooks/useSSE';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import api from '../../api/client';
import type { AttendanceRecord } from '../../types';
import { Play, Square, Users, CheckCircle2, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TakeAttendance() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionIdParam = searchParams.get('sessionId');
  
  const { user } = useAuthStore();
  const { 
    currentSession, 
    setCurrentSession, 
    createSession, 
    closeSession, 
    sessionRecords, 
    fetchSessionRecords,
    overrideAttendance
  } = useAttendanceStore();
  
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideRecord, setOverrideRecord] = useState<AttendanceRecord | null>(null);
  const [overrideStatus, setOverrideStatus] = useState('present');
  const [overrideReason, setOverrideReason] = useState('');
  const [isOverriding, setIsOverriding] = useState(false);

  // SSE for live updates
  const { lastEvent } = useSSE({
    url: currentSession ? `${import.meta.env.VITE_API_URL || '/api'}/sse/session/${currentSession.id}` : '',
    enabled: !!currentSession && currentSession.status === 'active',
  });

  // Handle SSE new record
  useEffect(() => {
    if (lastEvent && lastEvent.type === 'new_record' && currentSession) {
      fetchSessionRecords(currentSession.id);
      // Optional: show toast for flags
      if (lastEvent.data?.flagged) {
        toast.error(`Flagged attendance: ${lastEvent.data.studentName}`, { id: 'flagged-alert' });
      }
    }
  }, [lastEvent]);

  // Load initial data
  useEffect(() => {
    const init = async () => {
      // Fetch teacher's subjects
      try {
        const { data } = await api.get('/subjects/my-subjects');
        setSubjects(data.data);
      } catch { /* ignore */ }

      // If sessionId in URL, fetch it
      if (sessionIdParam) {
        try {
          const { data } = await api.get(`/sessions/${sessionIdParam}`);
          setCurrentSession(data.data);
          fetchSessionRecords(sessionIdParam);
        } catch {
          toast.error('Failed to load session');
          setSearchParams({});
        }
      } else {
        // Clear session if URL param removed
        setCurrentSession(null);
      }
    };
    init();
    
    return () => setCurrentSession(null); // Cleanup
  }, [sessionIdParam]);

  const handleCreateSession = async () => {
    if (!selectedSubject) {
      toast.error('Please select a subject');
      return;
    }
    
    setIsCreating(true);
    try {
      const session = await createSession(selectedSubject);
      setSearchParams({ sessionId: session.id });
      toast.success('Session started successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to start session');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCloseSession = async () => {
    if (!currentSession) return;
    
    if (window.confirm('Are you sure you want to close this session? Any student who hasn\'t marked attendance will be marked absent.')) {
      try {
        await closeSession(currentSession.id);
        toast.success('Session closed successfully');
        // Refresh session data
        const { data } = await api.get(`/sessions/${currentSession.id}`);
        setCurrentSession(data.data);
        fetchSessionRecords(currentSession.id);
      } catch (error: any) {
        toast.error(error.message || 'Failed to close session');
      }
    }
  };

  const openOverrideModal = (record: AttendanceRecord) => {
    setOverrideRecord(record);
    setOverrideStatus(record.status);
    setOverrideReason('');
    setIsOverrideModalOpen(true);
  };

  const handleOverrideSubmit = async () => {
    if (!overrideRecord || !overrideReason.trim()) {
      toast.error('Reason is required');
      return;
    }
    
    setIsOverriding(true);
    try {
      await overrideAttendance(overrideRecord.id, overrideStatus, overrideReason);
      toast.success('Attendance overridden successfully');
      setIsOverrideModalOpen(false);
    } catch (error: any) {
      toast.error('Failed to override attendance');
    } finally {
      setIsOverriding(false);
    }
  };

  const columns = [
    {
      key: 'student',
      header: 'Student',
      render: (r: AttendanceRecord) => (
        <div>
          <p className="font-medium text-[var(--text-primary)]">{r.studentName}</p>
          <p className="text-xs text-[var(--text-muted)] font-mono">{r.enrollmentId}</p>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: AttendanceRecord) => {
        let variant: any = 'default';
        if (r.status === 'present') variant = 'present';
        else if (r.status === 'absent') variant = 'absent';
        else if (r.status === 'late') variant = 'late';
        else if (r.status === 'proxy_detected') variant = 'proxy';
        
        return <Badge variant={variant} className="uppercase">{r.status.replace('_', ' ')}</Badge>;
      }
    },
    {
      key: 'time',
      header: 'Marked At',
      render: (r: AttendanceRecord) => (
        <span className="text-sm">{r.markedAt ? new Date(r.markedAt).toLocaleTimeString() : '-'}</span>
      )
    },
    {
      key: 'flags',
      header: 'Flags',
      render: (r: AttendanceRecord) => (
        r.flagged ? (
          <div className="flex items-center gap-1.5 text-rose-400 text-xs font-medium" title={r.flagReason || ''}>
            <AlertTriangle size={14} />
            <span className="truncate max-w-[150px]">{r.flagReason}</span>
          </div>
        ) : (
          <span className="text-[var(--text-muted)] text-xs">-</span>
        )
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '100px',
      render: (r: AttendanceRecord) => (
        <Button variant="ghost" size="sm" onClick={() => openOverrideModal(r)}>
          Override
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      
      {!currentSession ? (
        // Start Session View
        <div className="max-w-2xl mx-auto space-y-6 mt-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
              <Play size={32} />
            </div>
            <h1 className="text-2xl font-bold mb-2">Start Attendance Session</h1>
            <p className="text-[var(--text-muted)]">Select a subject to begin taking live attendance via face recognition.</p>
          </div>

          <Card>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Select Subject
                </label>
                <select 
                  className="input"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                >
                  <option value="">-- Choose Subject --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
              
              <Button 
                className="w-full" 
                size="lg" 
                onClick={handleCreateSession}
                isLoading={isCreating}
                disabled={!selectedSubject}
              >
                Start Session Now
              </Button>
            </div>
          </Card>
        </div>
      ) : (
        // Active Session View
        <>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">{currentSession.subjectName}</h1>
                <Badge variant={currentSession.status === 'active' ? 'present' : 'default'} dot={currentSession.status === 'active'}>
                  {currentSession.status === 'active' ? 'LIVE' : 'CLOSED'}
                </Badge>
              </div>
              <p className="text-[var(--text-muted)] text-sm">
                Session Code: <span className="font-mono">{currentSession.subjectCode}</span>
                <span className="mx-2">•</span>
                Started: {new Date(currentSession.startTime).toLocaleTimeString()}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => fetchSessionRecords(currentSession.id)} icon={<RefreshCw size={16} />}>
                Refresh
              </Button>
              {currentSession.status === 'active' && (
                <Button variant="danger" onClick={handleCloseSession} icon={<Square size={16} fill="currentColor" />}>
                  End Session
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card padding="sm" className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500/15 text-indigo-400 rounded-[var(--radius-md)]">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)] font-medium">Total Enrolled</p>
                <p className="text-2xl font-bold font-mono">{currentSession.totalEnrolled}</p>
              </div>
            </Card>
            
            <Card padding="sm" className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-[var(--radius-md)]">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)] font-medium">Present</p>
                <p className="text-2xl font-bold font-mono">{currentSession.totalPresent}</p>
              </div>
            </Card>

            <Card padding="sm" className="flex items-center gap-4">
              <div className="p-3 bg-rose-500/15 text-rose-400 rounded-[var(--radius-md)]">
                <AlertTriangle size={24} />
              </div>
              <div>
                <p className="text-sm text-[var(--text-muted)] font-medium">Flagged Issues</p>
                <p className="text-2xl font-bold font-mono">
                  {sessionRecords.filter(r => r.flagged).length}
                </p>
              </div>
            </Card>
          </div>

          <Card padding="none">
            <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-elevated)] rounded-t-[var(--radius-xl)] flex justify-between items-center">
              <h3 className="font-semibold">Live Attendance Log</h3>
              {currentSession.status === 'active' && (
                <span className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot" />
                  Waiting for students...
                </span>
              )}
            </div>
            
            <Table 
              columns={columns}
              data={sessionRecords}
              keyExtractor={r => r.id}
              emptyMessage={currentSession.status === 'active' ? "No students have marked attendance yet." : "No records found."}
              rowClassName={(r) => r.flagged ? 'row-proxy' : r.status === 'absent' ? 'row-absent' : ''}
            />
          </Card>
        </>
      )}

      {/* Override Modal */}
      <Modal isOpen={isOverrideModalOpen} onClose={() => setIsOverrideModalOpen(false)} title="Override Attendance">
        {overrideRecord && (
          <div className="space-y-4">
            <div className="bg-[var(--bg-elevated)] p-3 rounded-lg border border-[var(--border-light)] mb-4">
              <p className="text-sm text-[var(--text-muted)] mb-1">Student</p>
              <p className="font-semibold">{overrideRecord.studentName} ({overrideRecord.enrollmentId})</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                New Status
              </label>
              <select 
                className="input"
                value={overrideStatus}
                onChange={(e) => setOverrideStatus(e.target.value)}
              >
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Reason for Override
              </label>
              <textarea 
                className="input min-h-[100px] resize-none"
                placeholder="e.g. Device issue, manual verification..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                required
              />
            </div>
            
            <div className="pt-4 flex justify-end gap-3 border-t border-[var(--border)]">
              <Button variant="ghost" onClick={() => setIsOverrideModalOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleOverrideSubmit} isLoading={isOverriding}>
                Confirm Override
              </Button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
