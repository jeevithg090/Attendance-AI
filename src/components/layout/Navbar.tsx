// ═══════════════════════════════════════════════════════════
// AttendAI — Navbar Component
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Bell, LogOut, User, ChevronDown, Menu } from 'lucide-react';
import api from '../../api/client';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get('/notifications?unreadOnly=true');
        setUnreadCount(data.data.unreadCount || 0);
      } catch { /* ignore */ }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = {
    student: 'Student',
    teacher: 'Teacher',
    admin: 'Administrator',
  };

  return (
    <header className="navbar sticky top-0 z-30 flex items-center justify-between px-6">
      {/* Breadcrumb / Title */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-medium text-[var(--text-secondary)]">
          {roleLabel[user?.role || 'student']} Portal
        </h2>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Session Active Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />
          <span className="text-xs text-[var(--text-secondary)]">Online</span>
        </div>

        {/* Notifications */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-[var(--radius-md)] hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Notifications"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-[var(--accent-danger)] text-white text-[10px] font-bold flex items-center justify-center animate-scale-in">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
              {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-[var(--text-primary)] leading-tight">
                {user?.displayName}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">{user?.email}</p>
            </div>
            <ChevronDown size={14} className="text-[var(--text-muted)] hidden sm:block" />
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] z-50 animate-fade-in-down overflow-hidden">
                <button
                  onClick={() => { navigate('/profile'); setShowDropdown(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <User size={16} />
                  Profile
                </button>
                <div className="border-t border-[var(--border)]" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--accent-danger)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
