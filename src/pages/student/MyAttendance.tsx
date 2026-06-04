// ═══════════════════════════════════════════════════════════
// AttendAI — My Attendance (Student History)
// ═══════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useAttendance } from '../../hooks/useAttendance';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import type { AttendanceRecord } from '../../types';
import { format, parseISO } from 'date-fns';
import { CalendarDays, Filter } from 'lucide-react';

export default function MyAttendance() {
  const { user } = useAuthStore();
  const { getStudentRecords, getStudentStats, isLoading } = useAttendance();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [subjects, setSubjects] = useState<{id: string, name: string}[]>([]);
  const [filterSubject, setFilterSubject] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    
    // Fetch stats to get subjects list
    const fetchSubjects = async () => {
      const stats = await getStudentStats();
      if (stats?.subjectAttendance) {
        setSubjects(stats.subjectAttendance.map(s => ({
          id: s.subjectId,
          name: s.subjectName
        })));
      }
    };
    fetchSubjects();
  }, [user, getStudentStats]);

  useEffect(() => {
    if (!user) return;
    
    const fetchRecords = async () => {
      const data = await getStudentRecords(user.id, filterSubject || undefined);
      setRecords(data);
    };
    fetchRecords();
  }, [user, filterSubject, getStudentRecords]);

  const columns = [
    {
      key: 'date',
      header: 'Date',
      render: (record: AttendanceRecord) => (
        <span className="font-medium">{format(parseISO(record.date), 'MMM d, yyyy')}</span>
      )
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (record: AttendanceRecord) => {
        const subject = subjects.find(s => s.id === record.subjectId);
        return subject ? subject.name : 'Unknown';
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (record: AttendanceRecord) => {
        let variant: 'present' | 'absent' | 'late' | 'proxy' = 'default' as any;
        let label: string = record.status;
        
        if (record.status === 'present') variant = 'present';
        else if (record.status === 'absent') variant = 'absent';
        else if (record.status === 'late') variant = 'late';
        else if (record.status === 'proxy_detected') {
          variant = 'proxy';
          label = 'Proxy Detected';
        }

        return <Badge variant={variant} className="uppercase tracking-wider">{label}</Badge>;
      }
    },
    {
      key: 'method',
      header: 'Verification',
      render: (record: AttendanceRecord) => (
        <span className="text-xs text-[var(--text-muted)] capitalize">
          {record.verificationMethod.replace('_', ' ')}
        </span>
      )
    },
    {
      key: 'details',
      header: 'Details',
      render: (record: AttendanceRecord) => (
        record.flagged ? (
          <span className="text-xs text-rose-400" title={record.flagReason || ''}>
            Flagged Issue
          </span>
        ) : record.faceMatchScore ? (
          <span className="text-xs text-emerald-400">
            Match: {(record.faceMatchScore * 100).toFixed(1)}%
          </span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">-</span>
        )
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-[var(--radius-md)] bg-indigo-500/15 text-indigo-400">
            <CalendarDays size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Attendance History</h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">View your complete attendance records.</p>
          </div>
        </div>
      </div>

      <Card padding="none">
        {/* Filters */}
        <div className="p-4 border-b border-[var(--border)] flex flex-wrap gap-4 items-center bg-[var(--bg-elevated)] rounded-t-[var(--radius-xl)]">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Filter size={16} />
            <span className="text-sm font-medium">Filter by Subject:</span>
          </div>
          
          <select 
            className="input w-auto min-w-[200px]"
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
          >
            <option value="">All Subjects</option>
            {subjects.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.name}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <Table 
          columns={columns} 
          data={records} 
          keyExtractor={(r) => r.id}
          isLoading={isLoading}
          emptyMessage="No attendance records found."
          rowClassName={(r) => r.status === 'absent' ? 'row-absent' : ''}
        />
      </Card>
    </div>
  );
}
