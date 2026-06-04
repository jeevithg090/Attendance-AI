// ═══════════════════════════════════════════════════════════
// AttendAI — Layout Component
// ═══════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout() {
  const { isAuthenticated, user } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      {/* Main Content */}
      <div
        className="flex-1 flex flex-col min-h-screen"
        style={{
          marginLeft: sidebarCollapsed ? '64px' : '260px',
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Navbar />
        <main className="flex-1 p-6 page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
