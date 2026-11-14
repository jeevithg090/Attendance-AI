// ═══════════════════════════════════════════════════════════
// AttendAI — Attendance Reports (Admin)
// Campus-wide reporting is not built yet; point admins at what exists today.
// ═══════════════════════════════════════════════════════════

import { Link } from 'react-router-dom';
import { Construction, FileBarChart } from 'lucide-react';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import PageHeader from '../../components/ui/PageHeader';

export default function AttendanceReports() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FileBarChart size={24} />}
        title="System Reports"
        description="Campus-wide attendance analytics."
      />

      <Card className="border-dashed border-2">
        <EmptyState
          icon={<Construction size={28} />}
          title="Campus-wide reports are not available yet"
          description={
            <>
              Department trends and scheduled report exports are planned. Today, the{' '}
              <Link
                to="/admin"
                className="font-medium text-[var(--accent-primary)] underline-offset-2 hover:underline"
              >
                dashboard
              </Link>{' '}
              shows live campus metrics, teachers can export per-subject attendance as CSV, and the student
              and teacher directories can be exported from their pages.
            </>
          }
          className="py-16"
        />
      </Card>
    </div>
  );
}
