// ═══════════════════════════════════════════════════════════
// AttendAI — Register User (Admin Only)
// ═══════════════════════════════════════════════════════════

import React, { useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { UserPlus, User } from 'lucide-react';

export default function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: 'DefaultPassword123!',
    displayName: '',
    role: 'student',
    department: 'Computer Science',
    enrollmentId: '',
    employeeId: '',
    phone: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await api.post('/auth/register', formData);
      toast.success('User registered successfully');
      // Reset form
      setFormData({
        email: '',
        password: 'DefaultPassword123!',
        displayName: '',
        role: 'student',
        department: 'Computer Science',
        enrollmentId: '',
        employeeId: '',
        phone: '',
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to register user');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-[var(--radius-md)] bg-indigo-500/15 text-indigo-400">
          <UserPlus size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Register New User</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Create accounts for students, teachers, or admins.</p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                name="displayName"
                required
                value={formData.displayName}
                onChange={handleChange}
                className="input"
                placeholder="e.g. John Doe"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="john@bmsce.ac.in"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="input"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Department
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="input"
              >
                <option value="Computer Science">Computer Science</option>
                <option value="Information Science">Information Science</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Electronics & Communication">Electronics & Communication</option>
              </select>
            </div>

            {formData.role === 'student' && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Enrollment ID / USN
                </label>
                <input
                  type="text"
                  name="enrollmentId"
                  required
                  value={formData.enrollmentId}
                  onChange={handleChange}
                  className="input"
                  placeholder="e.g. 1BM25CS001"
                />
              </div>
            )}

            {formData.role === 'teacher' && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Employee ID
                </label>
                <input
                  type="text"
                  name="employeeId"
                  required
                  value={formData.employeeId}
                  onChange={handleChange}
                  className="input"
                  placeholder="e.g. EMP12345"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input"
                placeholder="+91..."
              />
            </div>
            
             <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Temporary Password
              </label>
              <input
                type="text"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="input"
              />
               <p className="text-xs text-[var(--text-muted)] mt-1">User should change this upon first login.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border)] flex justify-end">
             <Button type="submit" isLoading={isLoading} icon={<User size={18} />}>
                Register User
             </Button>
          </div>

        </form>
      </Card>
    </div>
  );
}
