// ═══════════════════════════════════════════════════════════
// AttendAI — Register User (Admin Only)
// ═══════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import api, { getErrorMessage } from '../../api/client';
import toast from 'react-hot-toast';
import { UserPlus, User, RefreshCw, ArrowLeft } from 'lucide-react';

/** A random 14-character temporary password (letters, digits and symbols). */
function generatePassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = crypto.getRandomValues(new Uint32Array(14));
  return Array.from(bytes, (n) => alphabet[n % alphabet.length]).join('');
}

const emptyForm = () => ({
  email: '',
  password: generatePassword(),
  displayName: '',
  role: 'student',
  department: 'Computer Science',
  enrollmentId: '',
  employeeId: '',
  phone: '',
});

export default function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [lastCreated, setLastCreated] = useState<{ email: string; password: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Only send the ID that matches the selected role.
      const payload = {
        ...formData,
        enrollmentId: formData.role === 'student' ? formData.enrollmentId : undefined,
        employeeId: formData.role === 'teacher' ? formData.employeeId : undefined,
        phone: formData.phone || undefined,
      };
      await api.post('/auth/register', payload);
      toast.success(`Account created for ${formData.displayName}`);
      setLastCreated({ email: formData.email.trim().toLowerCase(), password: formData.password });
      setFormData(emptyForm());
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to register user'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Back to dashboard
      </Link>

      <PageHeader
        icon={<UserPlus size={24} />}
        title="Register New User"
        description="Create accounts for students, teachers or administrators."
      />

      {lastCreated && (
        <div
          role="status"
          className="p-4 rounded-[var(--radius-md)] border border-emerald-500/30 bg-emerald-500/10 text-sm text-[var(--text-primary)]"
        >
          <p className="font-medium">Account created.</p>
          <p className="mt-1 text-[var(--text-secondary)]">
            Share these sign-in details with the user privately:{' '}
            <span className="font-mono break-all">{lastCreated.email}</span> /{' '}
            <span className="font-mono break-all">{lastCreated.password}</span>
          </p>
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="register-full-name"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
              >
                Full Name
              </label>
              <input
                id="register-full-name"
                type="text"
                name="displayName"
                required
                value={formData.displayName}
                onChange={handleChange}
                className="input"
                placeholder="e.g. Priya Sharma"
              />
            </div>

            <div>
              <label
                htmlFor="register-email-address"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
              >
                Email Address
              </label>
              <input
                id="register-email-address"
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="name@bmsce.ac.in"
                autoComplete="off"
              />
            </div>

            <div>
              <label
                htmlFor="register-role"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
              >
                Role
              </label>
              <select
                id="register-role"
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
              <label
                htmlFor="register-department"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
              >
                Department
              </label>
              <select
                id="register-department"
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
                <label
                  htmlFor="register-enrollment-id-usn"
                  className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
                >
                  Enrollment ID / USN
                </label>
                <input
                  id="register-enrollment-id-usn"
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
                <label
                  htmlFor="register-employee-id"
                  className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
                >
                  Employee ID
                </label>
                <input
                  id="register-employee-id"
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
              <label
                htmlFor="register-phone-number-optional"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
              >
                Phone Number (Optional)
              </label>
              <input
                id="register-phone-number-optional"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="input"
                placeholder="+91..."
              />
            </div>

            <div>
              <label
                htmlFor="register-temporary-password"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
              >
                Temporary Password
              </label>
              <div className="flex gap-2">
                <input
                  id="register-temporary-password"
                  type="text"
                  name="password"
                  required
                  minLength={8}
                  autoComplete="off"
                  spellCheck={false}
                  value={formData.password}
                  onChange={handleChange}
                  className="input font-mono"
                  aria-describedby="register-password-hint"
                />
                <Button
                  variant="secondary"
                  onClick={() => setFormData({ ...formData, password: generatePassword() })}
                  aria-label="Generate a new password"
                  title="Generate a new password"
                >
                  <RefreshCw size={16} aria-hidden="true" />
                </Button>
              </div>
              <p id="register-password-hint" className="field-hint">
                At least 8 characters. A random one is generated for you.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border)] flex justify-end">
            <Button type="submit" isLoading={isLoading} icon={<User size={18} aria-hidden="true" />}>
              Create account
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
