// AttendAI — Manage Teachers (Admin)
import { UserCog } from 'lucide-react';
import UserDirectory from '../../components/admin/UserDirectory';

export default function ManageTeachers() {
  return (
    <UserDirectory
      role="teacher"
      title="Manage Teachers"
      description="View, search and export faculty accounts."
      icon={<UserCog size={24} />}
    />
  );
}
