// ═══════════════════════════════════════════════════════════
// AttendAI — Manage Subjects (Teacher/Admin)
// ═══════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import api from '../../api/client';
import { BookMarked, Plus, Users, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManageSubjects() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  
  const [newSubject, setNewSubject] = useState({
    name: '',
    code: '',
    department: 'Computer Science',
    semester: 1
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
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnrollStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) return;
    
    setIsSubmitting(true);
    try {
      // For demo, we assume the user is inputting UUIDs comma separated, 
      // but in a real app this would be a multi-select dropdown or search.
      // To make it easy to test, we'll fetch all students and match by USN/Email
      
      const { data: usersData } = await api.get('/users?role=student&limit=100');
      const allStudents = usersData.data.items;
      
      const inputIds = enrollStudentIds.split(',').map(s => s.trim().toLowerCase());
      
      const matchedIds = allStudents
        .filter((s: any) => inputIds.includes(s.enrollmentId.toLowerCase()) || inputIds.includes(s.email.toLowerCase()))
        .map((s: any) => s.id);
        
      if (matchedIds.length === 0) {
        toast.error('No valid students found matching those IDs/Emails');
        setIsSubmitting(false);
        return;
      }

      await api.post(`/subjects/${selectedSubject.id}/enroll`, { studentIds: matchedIds });
      toast.success(`Successfully enrolled ${matchedIds.length} students`);
      setIsEnrollModalOpen(false);
      setEnrollStudentIds('');
      fetchSubjects();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to enroll students');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Subject Name',
      render: (s: any) => <span className="font-medium">{s.name}</span>
    },
    {
      key: 'code',
      header: 'Code',
      render: (s: any) => <span className="font-mono text-sm">{s.code}</span>
    },
    {
      key: 'semester',
      header: 'Semester',
      render: (s: any) => <span>Sem {s.semester}</span>
    },
    {
      key: 'enrolled',
      header: 'Enrolled Students',
      render: (s: any) => <span className="font-mono">{s.enrolledCount || 0}</span>
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '120px',
      render: (s: any) => (
        <Button 
          variant="outline" 
          size="sm" 
          icon={<Users size={14} />}
          onClick={() => {
            setSelectedSubject(s);
            setIsEnrollModalOpen(true);
          }}
        >
          Enroll
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-[var(--radius-md)] bg-indigo-500/15 text-indigo-400">
            <BookMarked size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Manage Subjects</h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">Create subjects and enroll students.</p>
          </div>
        </div>
        
        <Button icon={<Plus size={18} />} onClick={() => setIsAddModalOpen(true)}>
          Add Subject
        </Button>
      </div>

      <Card padding="none">
        <Table 
          columns={columns}
          data={subjects}
          keyExtractor={s => s.id}
          isLoading={isLoading}
          emptyMessage="No subjects found. Create one to get started."
        />
      </Card>

      {/* Add Subject Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Subject">
        <form onSubmit={handleAddSubject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Subject Name</label>
            <input 
              type="text" required className="input" placeholder="e.g. Design and Thinking"
              value={newSubject.name} onChange={e => setNewSubject({...newSubject, name: e.target.value})}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Subject Code</label>
            <input 
              type="text" required className="input" placeholder="e.g. 25ME2AEIDT"
              value={newSubject.code} onChange={e => setNewSubject({...newSubject, code: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Department</label>
              <select className="input" value={newSubject.department} onChange={e => setNewSubject({...newSubject, department: e.target.value})}>
                <option value="Computer Science">Computer Science</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Common">Common (All Branches)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Semester</label>
              <input 
                type="number" min="1" max="8" required className="input"
                value={newSubject.semester} onChange={e => setNewSubject({...newSubject, semester: parseInt(e.target.value)})}
              />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-[var(--border)]">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} icon={<Save size={16} />}>Create Subject</Button>
          </div>
        </form>
      </Modal>

      {/* Enroll Students Modal */}
      <Modal isOpen={isEnrollModalOpen} onClose={() => setIsEnrollModalOpen(false)} title={`Enroll in ${selectedSubject?.name}`}>
        <form onSubmit={handleEnrollStudents} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Enter Student USNs or Emails (comma separated)
            </label>
            <textarea 
              className="input min-h-[100px] resize-none font-mono text-sm"
              placeholder="1BM25CS001, 1BM25CS002, student3@bmsce.ac.in..."
              value={enrollStudentIds}
              onChange={e => setEnrollStudentIds(e.target.value)}
              required
            />
            <p className="text-xs text-[var(--text-muted)] mt-2">
              For demo purposes, you can enroll the demo student by typing: <code className="bg-[var(--bg-elevated)] px-1 py-0.5 rounded text-[var(--text-primary)]">student1@bmsce.ac.in</code>
            </p>
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-[var(--border)]">
            <Button type="button" variant="ghost" onClick={() => setIsEnrollModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>Enroll Students</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
