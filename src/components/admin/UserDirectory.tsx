// Searchable, filterable list of users of one role, shared by the admin
// "Manage Students" and "Manage Teachers" pages.
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Filter, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../api/client';
import { downloadCsv, toCsv, todayStamp } from '../../lib/csv';
import type { User } from '../../types';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ErrorState from '../ui/ErrorState';
import PageHeader from '../ui/PageHeader';
import Table from '../ui/Table';

const DEPARTMENTS = ['Computer Science', 'Information Science', 'Mechanical Engineering'];
const PAGE_SIZE = 200;

interface UserDirectoryProps {
  role: 'student' | 'teacher';
  title: string;
  description: string;
  icon: ReactNode;
}

export default function UserDirectory({ role, title, description, icon }: UserDirectoryProps) {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [department, setDepartment] = useState('');

  const isStudent = role === 'student';
  const noun = isStudent ? 'student' : 'teacher';

  // Wait for the user to stop typing before hitting the API.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ role, limit: String(PAGE_SIZE) });
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (department) params.append('department', department);
      const { data } = await api.get(`/users?${params.toString()}`);
      setUsers(data.data.items);
      setTotal(data.data.total ?? data.data.items.length);
    } catch (err) {
      setError(getErrorMessage(err, `Failed to load ${noun}s`));
    } finally {
      setIsLoading(false);
    }
  }, [role, noun, debouncedSearch, department]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleExport = () => {
    const header = isStudent
      ? ['Name', 'Enrollment ID', 'Email', 'Phone', 'Department', 'Status', 'Face data']
      : ['Name', 'Employee ID', 'Email', 'Phone', 'Department', 'Status'];
    const rows = users.map((u) => {
      const base = [
        u.displayName,
        (isStudent ? u.enrollmentId : u.employeeId) ?? '',
        u.email,
        u.phone ?? '',
        u.department,
        u.isActive ? 'Active' : 'Deactivated',
      ];
      return isStudent ? [...base, u.faceEnrolled ? 'Enrolled' : 'Pending'] : base;
    });
    downloadCsv(`${noun}s_${todayStamp()}.csv`, toCsv(header, rows));
    toast.success(`Exported ${rows.length} ${noun}${rows.length === 1 ? '' : 's'}`);
  };

  const columns = [
    {
      key: 'name',
      header: isStudent ? 'Student' : 'Teacher',
      render: (u: User) => (
        <div>
          <p className="font-medium text-[var(--text-primary)]">{u.displayName}</p>
          <p className="text-xs text-[var(--text-muted)] font-mono">
            {(isStudent ? u.enrollmentId : u.employeeId) || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (u: User) => (
        <div>
          <p className="text-sm">{u.email}</p>
          {u.phone && <p className="text-xs text-[var(--text-muted)]">{u.phone}</p>}
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (u: User) => <span className="text-sm">{u.department}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (u: User) => (
        <Badge variant={u.isActive ? 'present' : 'absent'}>{u.isActive ? 'Active' : 'Deactivated'}</Badge>
      ),
    },
    ...(isStudent
      ? [
          {
            key: 'faceEnrolled',
            header: 'Face data',
            render: (u: User) => (
              <Badge variant={u.faceEnrolled ? 'present' : 'warning'}>
                {u.faceEnrolled ? 'Enrolled' : 'Pending'}
              </Badge>
            ),
          },
        ]
      : []),
  ];

  const filtersActive = Boolean(debouncedSearch || department);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={icon}
        title={title}
        description={description}
        actions={
          <>
            <Button
              variant="outline"
              icon={<Download size={16} aria-hidden="true" />}
              onClick={handleExport}
              disabled={isLoading || users.length === 0}
            >
              Export CSV
            </Button>
            <Button
              icon={<Plus size={16} aria-hidden="true" />}
              onClick={() => navigate('/admin/register-user')}
            >
              Add {noun}
            </Button>
          </>
        }
      />

      <Card padding="none">
        <div className="toolbar justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              className="input pl-10"
              placeholder={
                isStudent ? 'Search by name, USN or email' : 'Search by name, employee ID or email'
              }
              aria-label={`Search ${noun}s`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={16} className="text-[var(--text-muted)] shrink-0" aria-hidden="true" />
            <select
              className="input sm:w-auto"
              aria-label="Filter by department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">All departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={fetchUsers} className="border-0 rounded-none" />
        ) : (
          <>
            <Table
              caption={`${title} list`}
              columns={columns}
              data={users}
              keyExtractor={(u) => u.id}
              isLoading={isLoading}
              emptyMessage={filtersActive ? `No ${noun}s match your filters` : `No ${noun}s yet`}
              emptyDescription={
                filtersActive
                  ? 'Try a different search term or department.'
                  : `Add the first ${noun} to get started.`
              }
              rowClassName={(u) => (!u.isActive ? 'opacity-60' : '')}
            />
            {!isLoading && users.length > 0 && (
              <p
                className="px-4 py-3 text-xs text-[var(--text-muted)] border-t border-[var(--border)]"
                aria-live="polite"
              >
                Showing {users.length} of {total} {noun}
                {total === 1 ? '' : 's'}
              </p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
