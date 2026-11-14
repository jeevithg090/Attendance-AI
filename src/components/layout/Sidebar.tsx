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

export default function Sidebar({ collapsed, onToggle, mobileOpen = false, onNavigate }: SidebarProps) {
  const { user } = useAuthStore();

  if (!user) return null;

  const items = menuItems[user.role] || [];

  return (
    <aside
      id="app-sidebar"
      aria-label="Main navigation"
      className={`sidebar fixed top-0 left-0 h-screen flex flex-col z-40 w-[260px] ${
        collapsed ? 'lg:w-16' : 'lg:w-[260px]'
      } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      style={{
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Shield size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <p className="text-base font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              AttendAI
            </p>
            <p className="text-[10px] text-[var(--text-muted)] -mt-0.5">BMSCE</p>
          </div>
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
            title={collapsed ? item.label : undefined}
            aria-label={collapsed ? item.label : undefined}
            onClick={onNavigate}
          >
            <item.icon size={20} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="hidden lg:block px-3 py-3 border-t border-[var(--border)]">
        <button
          onClick={onToggle}
          className="sidebar-item w-full justify-center"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span className="text-sm">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
