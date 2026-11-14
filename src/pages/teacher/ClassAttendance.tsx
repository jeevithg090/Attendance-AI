// ═══════════════════════════════════════════════════════════
// AttendAI — Class Attendance (Teacher)
// ═══════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ErrorState from '../../components/ui/ErrorState';
import PageHeader from '../../components/ui/PageHeader';
import api, { getErrorMessage } from '../../api/client';
import { downloadCsv, slugify, todayStamp, toCsv } from '../../lib/csv';
import { FileBarChart, Filter, Download } from 'lucide-react';
import type { StudentAttendanceStat, Subject } from '../../types';
import type { BadgeVariant } from '../../components/ui/Badge';

export default function ClassAttendance() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [stats, setStats] = useState<StudentAttendanceStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/subjects/my-subjects');
      setSubjects(data.data);
      if (data.data.length > 0) setSelectedSubject((current) => current || data.data[0].id);
      else setIsLoading(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load your subjects'));
      setIsLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    if (!selectedSubject) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/attendance/subject/${selectedSubject}/stats`);
      setStats(data.data);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load class statistics'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubject]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleExportCSV = () => {
    if (stats.length === 0) return;
    const subjectName = subjects.find((s) => s.id === selectedSubject)?.name || 'subject';
    const csv = toCsv(
      ['Student Name', 'Enrollment ID', 'Classes Attended', 'Total Classes', 'Percentage'],
      stats.map((s) => [s.displayName, s.enrollmentId, s.totalPresent, s.totalClasses, `${s.percentage}%`]),
    );
    downloadCsv(`attendance_${slugify(subjectName)}_${todayStamp()}.csv`, csv);
  };

  const columns = [
    {
      key: 'student',
      header: 'Student',
      render: (s: StudentAttendanceStat) => (
        <div>
          <p className="font-medium text-[var(--text-primary)]">{s.displayName}</p>
          <p className="text-xs text-[var(--text-muted)] font-mono">{s.enrollmentId}</p>
        </div>
      ),
    },
    {
      key: 'present',
      header: 'Classes Attended',
      render: (s: StudentAttendanceStat) => (
        <span className="font-medium">
          {s.totalPresent} / {s.totalClasses}
        </span>
      ),
    },
    {
      key: 'percentage',
      header: 'Percentage',
      render: (s: StudentAttendanceStat) => (
        <span
          className={`font-bold font-mono ${
            s.percentage < 65 ? 'text-rose-400' : s.percentage < 75 ? 'text-amber-400' : 'text-emerald-400'
          }`}
        >
          {s.percentage}%
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s: StudentAttendanceStat) => {
        let variant: BadgeVariant = 'present';
        let label = 'Good';
        if (s.percentage < 65) {
          variant = 'absent';
          label = 'Critical';
        } else if (s.percentage < 75) {
          variant = 'warning';
          label = 'Warning';
        }
        return <Badge variant={variant}>{label}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FileBarChart size={24} />}
        title="Class Attendance"
        description="Attendance percentage per student for each of your subjects."
        actions={
          <Button
            variant="outline"
            icon={<Download size={16} aria-hidden="true" />}
            onClick={handleExportCSV}
            disabled={stats.length === 0 || isLoading}
          >
            Export CSV
          </Button>
        }
      />

      <Card padding="none">
        <div className="toolbar">
          <label
            htmlFor="class-subject"
            className="flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]"
          >
            <Filter size={16} aria-hidden="true" />
            Subject
          </label>
          <select
            id="class-subject"
            className="input sm:w-auto sm:min-w-[260px]"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            disabled={subjects.length === 0}
          >
            {subjects.length === 0 && <option value="">No subjects assigned</option>}
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <ErrorState
            message={error}
            onRetry={selectedSubject ? fetchStats : fetchSubjects}
            className="border-0 rounded-none"
          />
        ) : (
          <Table
            columns={columns}
            data={stats}
            keyExtractor={(s) => s.studentId}
            isLoading={isLoading}
            emptyMessage="No students enrolled in this subject yet."
            rowClassName={(s) => (s.percentage < 65 ? 'row-absent' : '')}
            caption="Student attendance for the selected subject"
            emptyDescription={
              subjects.length === 0
                ? 'Create a subject under Manage Subjects first.'
                : 'Enrol students from Manage Subjects.'
            }
          />
        )}
      </Card>
    </div>
  );
}
