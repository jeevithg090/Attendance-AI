// ═══════════════════════════════════════════════════════════
// AttendAI — Navbar Component
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Bell, LogOut, User, ChevronDown, Menu } from 'lucide-react';
import api from '../../api/client';
import ThemeToggle from '../common/ThemeToggle';

interface NavbarProps {
  onMenuClick?: () => void;
}

const ROLE_LABEL = {
  student: 'Student',
  teacher: 'Teacher',
  admin: 'Administrator',
} as const;

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get('/notifications?unreadOnly=true');
        setUnreadCount(data.data.unreadCount || 0);
      } catch {
        /* the badge is non-essential; keep the last known count */
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close the account menu on outside click or Escape.
  useEffect(() => {
    if (!showDropdown) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setShowDropdown(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDropdown(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showDropdown]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const notificationsLabel =
    unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications, none unread';

  return (
    <header className="navbar sticky top-0 z-30 flex items-center justify-between gap-2 px-3 sm:px-6">
      {/* Breadcrumb / Title */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-[var(--radius-md)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
          aria-label="Open navigation menu"
          aria-controls="app-sidebar"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <p className="text-sm font-medium text-[var(--text-secondary)] truncate">
          {ROLE_LABEL[user?.role || 'student']} Portal
        </p>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1 sm:gap-2">
        <ThemeToggle />

        {/* Notifications */}
        <Link
          to="/notifications"
          className="relative inline-flex items-center justify-center w-10 h-10 rounded-[var(--radius-md)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          aria-label={notificationsLabel}
        >
          <Bell size={20} aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              className="absolute top-0.5 right-0.5 min-w-5 h-5 px-1 rounded-full bg-[var(--accent-danger-solid)] text-white text-[10px] font-bold flex items-center justify-center animate-scale-in"
              aria-hidden="true"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setShowDropdown((open) => !open)}
            className="flex items-center gap-2 px-1.5 sm:px-3 py-1.5 rounded-[var(--radius-md)] hover:bg-[var(--bg-elevated)] transition-colors"
            aria-haspopup="menu"
            aria-expanded={showDropdown}
            aria-controls="account-menu"
            aria-label={`Account menu for ${user?.displayName ?? 'user'}`}
          >
            <div
              className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold"
              aria-hidden="true"
            >
              {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-[var(--text-primary)] leading-tight">
                {user?.displayName}
              </p>
              <p className="text-xs text-[var(--text-muted)]">{user?.email}</p>
            </div>
            <ChevronDown
              size={14}
              className={`text-[var(--text-muted)] hidden md:block transition-transform ${showDropdown ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>

          {showDropdown && (
            <div
              id="account-menu"
              role="menu"
              className="absolute right-0 top-full mt-2 w-56 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] z-50 animate-fade-in-down overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[var(--border)] md:hidden">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user?.displayName}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setShowDropdown(false);
                  navigate('/profile');
                }}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
              >
                <User size={16} aria-hidden="true" />
                Profile
              </button>
              <div className="border-t border-[var(--border)]" />
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[var(--accent-danger)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <LogOut size={16} aria-hidden="true" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
