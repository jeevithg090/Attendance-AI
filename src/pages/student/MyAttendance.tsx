// ═══════════════════════════════════════════════════════════
// AttendAI — My Attendance (Student History)
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useAttendance } from '../../hooks/useAttendance';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import type { AttendanceRecord } from '../../types';
import { format, parseISO } from 'date-fns';
import { CalendarDays, Filter } from 'lucide-react';
import type { BadgeVariant } from '../../components/ui/Badge';
import ErrorState from '../../components/ui/ErrorState';
import PageHeader from '../../components/ui/PageHeader';

export default function MyAttendance() {
  const { user } = useAuthStore();
  const { getStudentRecords, getStudentStats, isLoading, error } = useAttendance();
  const [reloadKey, setReloadKey] = useState(0);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [filterSubject, setFilterSubject] = useState<string>('');

  useEffect(() => {
    if (!user) return;

    // Fetch stats to get subjects list
    const fetchSubjects = async () => {
      const stats = await getStudentStats();
      if (stats?.subjectAttendance) {
        setSubjects(
          stats.subjectAttendance.map((s: { subjectId: string; subjectName: string }) => ({
            id: s.subjectId,
            name: s.subjectName,
          })),
        );
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
  }, [user, filterSubject, getStudentRecords, reloadKey]);

  const columns = [
    {
      key: 'date',
      header: 'Date',
      render: (record: AttendanceRecord) => (
        <span className="font-medium">{format(parseISO(record.date), 'MMM d, yyyy')}</span>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (record: AttendanceRecord) => {
        const subject = subjects.find((s) => s.id === record.subjectId);
        return subject ? subject.name : 'Unknown';
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (record: AttendanceRecord) => {
        let variant: BadgeVariant = 'default';
        let label: string = record.status;

        if (record.status === 'present') variant = 'present';
        else if (record.status === 'absent') variant = 'absent';
        else if (record.status === 'late') variant = 'late';
        else if (record.status === 'proxy_detected') {
          variant = 'proxy';
          label = 'Proxy Detected';
        }

        return (
          <Badge variant={variant} className="uppercase tracking-wider">
            {label}
          </Badge>
        );
      },
    },
    {
      key: 'method',
      header: 'Verification',
      render: (record: AttendanceRecord) => (
        <span className="text-xs text-[var(--text-muted)] capitalize">
          {record.verificationMethod.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      render: (record: AttendanceRecord) =>
        record.flagged ? (
          <span className="text-xs text-rose-400" title={record.flagReason || ''}>
            Flagged Issue
          </span>
        ) : record.faceMatchScore ? (
          <span className="text-xs text-emerald-400">Match: {(record.faceMatchScore * 100).toFixed(1)}%</span>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">-</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<CalendarDays size={24} />}
        title="Attendance History"
        description="Every class you were marked in, newest first."
      />

      <Card padding="none">
        {/* Filters */}
        <div className="toolbar">
          <label
            htmlFor="history-subject"
            className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]"
          >
            <Filter size={16} aria-hidden="true" />
            Subject
          </label>
          <select
            id="history-subject"
            className="input sm:w-auto sm:min-w-[220px]"
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
          >
            <option value="">All subjects</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        {error && records.length === 0 && !isLoading ? (
          <ErrorState
            message={error}
            onRetry={() => setReloadKey((k) => k + 1)}
            className="border-0 rounded-none"
          />
        ) : (
          <Table
            caption="Attendance history"
            columns={columns}
            data={records}
            keyExtractor={(r) => r.id}
            isLoading={isLoading}
            emptyMessage={filterSubject ? 'No records for this subject yet' : 'No attendance records yet'}
            emptyDescription="Records appear here after you mark attendance or a session closes."
            rowClassName={(r) => (r.status === 'absent' ? 'row-absent' : '')}
          />
        )}
      </Card>
    </div>
  );
}
