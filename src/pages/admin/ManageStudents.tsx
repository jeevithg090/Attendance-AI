// AttendAI — Manage Students (Admin)
import { GraduationCap } from 'lucide-react';
import UserDirectory from '../../components/admin/UserDirectory';

export default function ManageStudents() {
  return (
    <UserDirectory
      role="student"
      title="Manage Students"
      description="View, search and export student accounts."
      icon={<GraduationCap size={24} />}
    />
  );
}
