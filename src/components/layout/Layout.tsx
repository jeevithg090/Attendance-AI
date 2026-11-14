// Authenticated app shell: sidebar + navbar + routed content.
import { Suspense, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../ui/LoadingSpinner';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function Layout() {
  const { isAuthenticated, user } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const { pathname } = useLocation();

  // Close the drawer on Escape.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && setMobileNavOpen(false);
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileNavOpen]);

  // Scroll to top on navigation so a new page never opens half-way down.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

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
        isDrawer={!isDesktop}
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
        <main
          id="main-content"
          tabIndex={-1}
          key={pathname}
          className="flex-1 w-full max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 page-enter focus:outline-none"
        >
          <Suspense fallback={<LoadingSpinner message="Loading..." />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
