// ═══════════════════════════════════════════════════════════
// AttendAI — Sidebar Component
// ═══════════════════════════════════════════════════════════

import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard,
  ScanFace,
  ClipboardCheck,
  UserCog,
  FileBarChart,
  Settings,
  Bell,
  ChevronLeft,
  ChevronRight,
  X,
  GraduationCap,
  UserCircle,
  CalendarCheck,
  BookMarked,
  Shield,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  /** Whether the off-canvas sidebar is open on small screens. */
  mobileOpen?: boolean;
  /** Called after a navigation link is clicked (closes the mobile drawer). */
  onNavigate?: () => void;
  /** True when the sidebar is an off-canvas drawer (below the lg breakpoint). */
  isDrawer?: boolean;
}

const menuItems = {
  student: [
    { path: '/student', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/student/mark-attendance', icon: ScanFace, label: 'Mark Attendance' },
    { path: '/student/my-attendance', icon: CalendarCheck, label: 'My Attendance' },
    { path: '/notifications', icon: Bell, label: 'Notifications' },
    { path: '/profile', icon: UserCircle, label: 'Profile' },
  ],
  teacher: [
    { path: '/teacher', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/teacher/take-attendance', icon: ClipboardCheck, label: 'Take Attendance' },
    { path: '/teacher/class-attendance', icon: FileBarChart, label: 'Class Attendance' },
    { path: '/teacher/manage-subjects', icon: BookMarked, label: 'Manage Subjects' },
    { path: '/notifications', icon: Bell, label: 'Notifications' },
    { path: '/profile', icon: UserCircle, label: 'Profile' },
  ],
  admin: [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/manage-students', icon: GraduationCap, label: 'Manage Students' },
    { path: '/admin/manage-teachers', icon: UserCog, label: 'Manage Teachers' },
    { path: '/admin/attendance-reports', icon: FileBarChart, label: 'Reports' },
    { path: '/admin/system-settings', icon: Settings, label: 'Settings' },
    { path: '/notifications', icon: Bell, label: 'Notifications' },
    { path: '/profile', icon: UserCircle, label: 'Profile' },
  ],
};

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen = false,
  onNavigate,
  isDrawer = false,
}: SidebarProps) {
  const { user } = useAuthStore();

  if (!user) return null;

  const items = menuItems[user.role] || [];
  // The collapsed (icon-only) rail only exists on desktop; the mobile drawer is always full width.
  const isCollapsed = collapsed && !isDrawer;

  return (
    <aside
      id="app-sidebar"
      aria-label="Main navigation"
      inert={isDrawer && !mobileOpen}
      className={`sidebar fixed top-0 left-0 h-screen flex flex-col z-40 w-[260px] ${
        isCollapsed ? 'lg:w-16' : 'lg:w-[260px]'
      } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      style={{
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Shield size={18} className="text-white" aria-hidden="true" />
        </div>
        {!isCollapsed && (
          <div className="animate-fade-in">
            <p className="text-base font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              AttendAI
            </p>
            <p className="text-xs text-[var(--text-muted)] -mt-0.5">BMSCE</p>
          </div>
        )}
        {isDrawer && (
          <button
            type="button"
            onClick={onNavigate}
            className="ml-auto inline-flex items-center justify-center w-10 h-10 rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
            aria-label="Close navigation menu"
          >
            <X size={20} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/student' || item.path === '/teacher' || item.path === '/admin'}
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            title={isCollapsed ? item.label : undefined}
            aria-label={isCollapsed ? item.label : undefined}
            onClick={onNavigate}
          >
            <item.icon size={20} className="flex-shrink-0" aria-hidden="true" />
            {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="hidden lg:block px-3 py-3 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={onToggle}
          className="sidebar-item w-full justify-center"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight size={18} aria-hidden="true" />
          ) : (
            <ChevronLeft size={18} aria-hidden="true" />
          )}
          {!collapsed && <span className="text-sm">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
