// ═══════════════════════════════════════════════════════════
// AttendAI — Attendance Reports (Admin)
// ═══════════════════════════════════════════════════════════

import React from 'react';
import Card from '../../components/ui/Card';
import { FileBarChart, Construction } from 'lucide-react';

export default function AttendanceReports() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-[var(--radius-md)] bg-indigo-500/15 text-indigo-400">
          <FileBarChart size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">System Reports</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Generate and export campus-wide attendance analytics.</p>
        </div>
      </div>

      <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed border-2 bg-transparent">
        <div className="w-20 h-20 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-6">
          <Construction size={40} className="text-[var(--text-muted)] animate-pulse" />
        </div>
        <h2 className="text-xl font-bold mb-2">Reports Module Under Construction</h2>
        <p className="text-[var(--text-muted)] max-w-md mx-auto">
          We're currently building advanced analytics including department-wise trends, proxy attempt heatmaps, and automated PDF report generation. Check back in the next update!
        </p>
      </Card>
    </div>
  );
}
