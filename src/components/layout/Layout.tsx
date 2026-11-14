// Authenticated app shell: sidebar + navbar + routed content.
import { Suspense, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../ui/LoadingSpinner';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function Layout() {
  const { isAuthenticated, user } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileNavOpen}
        onNavigate={() => setMobileNavOpen(false)}
      />

      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          aria-hidden="true"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <div
        className={`flex-1 flex flex-col min-h-screen min-w-0 transition-[margin] duration-300 ${
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-[260px]'
        }`}
      >
        <Navbar onMenuClick={() => setMobileNavOpen(true)} />
        <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 page-enter focus:outline-none">
          <Suspense fallback={<LoadingSpinner message="Loading..." />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
