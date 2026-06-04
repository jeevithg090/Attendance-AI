// ═══════════════════════════════════════════════════════════
// AttendAI — Manage Teachers (Admin)
// ═══════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import api from '../../api/client';
import { UserCog, Search, Plus, Filter, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManageTeachers() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const navigate = useNavigate();

  const fetchTeachers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ role: 'teacher' });
      if (search) params.append('search', search);
      if (deptFilter) params.append('department', deptFilter);
      
      const { data } = await api.get(`/users?${params.toString()}`);
      setTeachers(data.data.items);
    } catch {
      toast.error('Failed to load teachers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, [search, deptFilter]);

  const columns = [
    {
      key: 'name',
      header: 'Teacher Name',
      render: (t: any) => (
        <div>
          <p className="font-medium text-[var(--text-primary)]">{t.displayName}</p>
          <p className="text-xs text-[var(--text-muted)] font-mono">{t.employeeId}</p>
        </div>
      )
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (t: any) => (
        <div>
          <p className="text-sm">{t.email}</p>
          {t.phone && <p className="text-xs text-[var(--text-muted)]">{t.phone}</p>}
        </div>
      )
    },
    {
      key: 'department',
      header: 'Department',
      render: (t: any) => <span className="text-sm">{t.department}</span>
    },
    {
      key: 'status',
      header: 'Status',
      render: (t: any) => (
        <Badge variant={t.isActive ? 'present' : 'absent'}>
          {t.isActive ? 'Active' : 'Deactivated'}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-[var(--radius-md)] bg-indigo-500/15 text-indigo-400">
            <UserCog size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Manage Teachers</h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">View and manage faculty accounts.</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" icon={<Download size={16} />}>
            Export
          </Button>
          <Button icon={<Plus size={16} />} onClick={() => navigate('/admin/register-user')}>
            Add Teacher
          </Button>
        </div>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-elevated)] rounded-t-[var(--radius-xl)] flex flex-wrap gap-4 items-center justify-between">
          
          <div className="flex items-center gap-2 relative max-w-sm w-full">
            <Search size={18} className="absolute left-3 text-[var(--text-muted)]" />
            <input 
              type="text" 
              className="input pl-10 w-full"
              placeholder="Search by name, Employee ID, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[var(--text-muted)]" />
            <select 
              className="input w-auto"
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Information Science">Information Science</option>
              <option value="Mechanical Engineering">Mechanical Engineering</option>
            </select>
          </div>

        </div>

        <Table 
          columns={columns}
          data={teachers}
          keyExtractor={t => t.id}
          isLoading={isLoading}
          emptyMessage="No teachers found."
          rowClassName={t => !t.isActive ? 'opacity-60' : ''}
        />
      </Card>
    </div>
  );
}
