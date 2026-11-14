// ═══════════════════════════════════════════════════════════
// AttendAI — Manage Subjects (Teacher/Admin)
// ═══════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import api, { getErrorMessage } from '../../api/client';
import { BookMarked, Plus, Users, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Subject, User } from '../../types';

export default function ManageSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);

  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const [newSubject, setNewSubject] = useState({
    name: '',
    code: '',
    department: 'Computer Science',
    semester: 1,
  });

  const [enrollStudentIds, setEnrollStudentIds] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSubjects = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/subjects/my-subjects');
      setSubjects(data.data);
    } catch {
      toast.error('Failed to load subjects');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/subjects', newSubject);
      toast.success('Subject created successfully');
      setIsAddModalOpen(false);
      fetchSubjects();
      setNewSubject({ name: '', code: '', department: 'Computer Science', semester: 1 });
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to create subject'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnrollStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) return;

    setIsSubmitting(true);
    try {
      // Match the typed USNs / emails against the student directory.
      const { data: usersData } = await api.get('/users?role=student&limit=200');
      const allStudents: User[] = usersData.data.items;

      const inputIds = enrollStudentIds
        .split(/[,\n]/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      if (inputIds.length === 0) {
        toast.error('Enter at least one USN or email');
        return;
      }

      const matches = allStudents.filter(
        (s) =>
          inputIds.includes((s.enrollmentId ?? '').toLowerCase()) || inputIds.includes(s.email.toLowerCase()),
      );
      const matchedKeys = new Set(
        matches.flatMap((s) => [(s.enrollmentId ?? '').toLowerCase(), s.email.toLowerCase()]),
      );
      const unmatched = inputIds.filter((id) => !matchedKeys.has(id));

      if (matches.length === 0) {
        toast.error('No students found with those USNs or emails');
        return;
      }

      await api.post(`/subjects/${selectedSubject.id}/enroll`, { studentIds: matches.map((s) => s.id) });
      toast.success(`Enrolled ${matches.length} student${matches.length === 1 ? '' : 's'}`);
      if (unmatched.length > 0) toast.error(`Not found: ${unmatched.join(', ')}`, { duration: 6000 });
      setIsEnrollModalOpen(false);
      setEnrollStudentIds('');
      fetchSubjects();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to enroll students'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Subject Name',
      render: (s: Subject) => <span className="font-medium">{s.name}</span>,
    },
    {
      key: 'code',
      header: 'Code',
      render: (s: Subject) => <span className="font-mono text-sm">{s.code}</span>,
    },
    {
      key: 'semester',
      header: 'Semester',
      render: (s: Subject) => <span>Sem {s.semester}</span>,
    },
    {
      key: 'enrolled',
      header: 'Enrolled Students',
      render: (s: Subject) => <span className="font-mono">{s.enrolledCount || 0}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '120px',
      render: (s: Subject) => (
        <Button
          variant="outline"
          size="sm"
          icon={<Users size={14} aria-hidden="true" />}
          aria-label={`Enrol students in ${s.name}`}
          onClick={() => {
            setSelectedSubject(s);
            setIsEnrollModalOpen(true);
          }}
        >
          Enroll
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BookMarked size={24} />}
        title="Manage Subjects"
        description="Create subjects and enrol students in them."
        actions={
          <Button icon={<Plus size={18} aria-hidden="true" />} onClick={() => setIsAddModalOpen(true)}>
            Add subject
          </Button>
        }
      />

      <Card padding="none">
        <Table
          columns={columns}
          data={subjects}
          keyExtractor={(s) => s.id}
          isLoading={isLoading}
          caption="Your subjects"
          emptyMessage="No subjects yet"
          emptyDescription="Create a subject, then enrol students to start taking attendance."
        />
      </Card>

      {/* Add Subject Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Subject">
        <form onSubmit={handleAddSubject} className="space-y-4">
          <div>
            <label
              htmlFor="manage-subjects-subject-name"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
            >
              Subject Name
            </label>
            <input
              id="manage-subjects-subject-name"
              type="text"
              required
              className="input"
              placeholder="e.g. Design and Thinking"
              value={newSubject.name}
              onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
            />
          </div>

          <div>
            <label
              htmlFor="manage-subjects-subject-code"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
            >
              Subject Code
            </label>
            <input
              id="manage-subjects-subject-code"
              type="text"
              required
              className="input"
              placeholder="e.g. 25ME2AEIDT"
              value={newSubject.code}
              onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="manage-subjects-department"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
              >
                Department
              </label>
              <select
                id="manage-subjects-department"
                className="input"
                value={newSubject.department}
                onChange={(e) => setNewSubject({ ...newSubject, department: e.target.value })}
              >
                <option value="Computer Science">Computer Science</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Common">Common (All Branches)</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="manage-subjects-semester"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
              >
                Semester
              </label>
              <input
                id="manage-subjects-semester"
                type="number"
                min="1"
                max="8"
                required
                className="input"
                value={newSubject.semester}
                onChange={(e) => setNewSubject({ ...newSubject, semester: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-[var(--border)]">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} icon={<Save size={16} />}>
              Create Subject
            </Button>
          </div>
        </form>
      </Modal>

      {/* Enroll Students Modal */}
      <Modal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        title={`Enrol students in ${selectedSubject?.name ?? 'subject'}`}
      >
        <form onSubmit={handleEnrollStudents} className="space-y-4">
          <div>
            <label
              htmlFor="enrol-identifiers"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
            >
              Student USNs or emails
            </label>
            <textarea
              id="enrol-identifiers"
              className="input min-h-[100px] resize-y font-mono text-sm"
              placeholder="1BM25CS001, 1BM25CS002, student3@bmsce.ac.in"
              aria-describedby="enrol-identifiers-hint"
              value={enrollStudentIds}
              onChange={(e) => setEnrollStudentIds(e.target.value)}
              required
            />
            <p id="enrol-identifiers-hint" className="field-hint">
              Separate entries with commas or new lines. Example:{' '}
              <code className="bg-[var(--bg-elevated)] px-1 py-0.5 rounded text-[var(--text-primary)]">
                student1@bmsce.ac.in
              </code>
            </p>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-[var(--border)]">
            <Button type="button" variant="ghost" onClick={() => setIsEnrollModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Enrol students
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
