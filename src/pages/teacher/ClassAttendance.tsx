// ═══════════════════════════════════════════════════════════
// AttendAI — Class Attendance (Teacher)
// ═══════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/client';
import { FileBarChart, Filter, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClassAttendance() {
  const { user } = useAuthStore();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [stats, setStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const { data } = await api.get('/subjects/my-subjects');
        setSubjects(data.data);
        if (data.data.length > 0) {
          setSelectedSubject(data.data[0].id);
        }
      } catch { /* ignore */ }
    };
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (!selectedSubject) return;
    
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get(`/attendance/subject/${selectedSubject}/stats`);
        setStats(data.data);
      } catch {
        toast.error('Failed to load class statistics');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, [selectedSubject]);

  const handleExportCSV = () => {
    if (stats.length === 0) return;
    
    const subjectName = subjects.find(s => s.id === selectedSubject)?.name || 'subject';
    const csvContent = [
      ['Student Name', 'Enrollment ID', 'Total Present', 'Total Classes', 'Percentage'],
      ...stats.map(s => [
        s.displayName,
        s.enrollmentId,
        s.totalPresent,
        s.totalClasses,
        `${s.percentage}%`
      ])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_${subjectName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    {
      key: 'student',
      header: 'Student',
      render: (s: any) => (
        <div>
          <p className="font-medium text-[var(--text-primary)]">{s.displayName}</p>
          <p className="text-xs text-[var(--text-muted)] font-mono">{s.enrollmentId}</p>
        </div>
      )
    },
    {
      key: 'present',
      header: 'Classes Attended',
      render: (s: any) => (
        <span className="font-medium">{s.totalPresent} / {s.totalClasses}</span>
      )
    },
    {
      key: 'percentage',
      header: 'Percentage',
      render: (s: any) => (
        <span className={`font-bold font-mono ${
          s.percentage < 65 ? 'text-rose-400' : s.percentage < 75 ? 'text-amber-400' : 'text-emerald-400'
        }`}>
          {s.percentage}%
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (s: any) => {
        let variant: any = 'present';
        let label = 'Good';
        if (s.percentage < 65) { variant = 'absent'; label = 'Critical'; }
        else if (s.percentage < 75) { variant = 'warning'; label = 'Warning'; }
        return <Badge variant={variant}>{label}</Badge>;
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-[var(--radius-md)] bg-indigo-500/15 text-indigo-400">
            <FileBarChart size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Class Attendance</h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">View overall attendance stats for your subjects.</p>
          </div>
        </div>
        
        <button
          onClick={handleExportCSV}
          disabled={stats.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-light)] hover:border-[var(--border)] rounded-[var(--radius-md)] text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-[var(--border)] flex flex-wrap gap-4 items-center bg-[var(--bg-elevated)] rounded-t-[var(--radius-xl)]">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Filter size={16} />
            <span className="text-sm font-medium">Select Subject:</span>
          </div>
          
          <select 
            className="input w-auto min-w-[250px]"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            {subjects.length === 0 && <option value="">No subjects assigned</option>}
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>

        <Table 
          columns={columns}
          data={stats}
          keyExtractor={(s) => s.studentId}
          isLoading={isLoading}
          emptyMessage="No students enrolled in this subject yet."
          rowClassName={(s) => s.percentage < 65 ? 'row-absent' : ''}
        />
      </Card>
    </div>
  );
}
