// ═══════════════════════════════════════════════════════════
// AttendAI — Notifications Page (Shared)
// ═══════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Bell, BellRing, AlertTriangle, Info, CheckCircle, Clock } from 'lucide-react';
import api from '../../api/client';
import { format, parseISO } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/notifications${filter === 'unread' ? '?unreadOnly=true' : ''}`);
      setNotifications(data.data.notifications);
    } catch {
      // Error handled by global interceptor if severe
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    } catch { /* ignore */ }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch { /* ignore */ }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'absent_alert': return <AlertTriangle className="text-amber-500" />;
      case 'proxy_detected': return <AlertTriangle className="text-rose-500" />;
      case 'low_attendance': return <Clock className="text-rose-400" />;
      case 'system': return <Info className="text-indigo-400" />;
      default: return <BellRing className="text-[var(--text-muted)]" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-[var(--radius-md)] bg-indigo-500/15 text-indigo-400">
            <Bell size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">Alerts, updates, and system messages.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            className="input w-auto text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
          >
            <option value="all">All Notifications</option>
            <option value="unread">Unread Only</option>
          </select>
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            Mark All Read
          </Button>
        </div>
      </div>

      <Card padding="none" className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-[var(--text-muted)]">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center mb-4">
              <CheckCircle className="text-emerald-500" size={32} />
            </div>
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-1">All caught up!</h3>
            <p className="text-sm text-[var(--text-muted)]">You have no new notifications right now.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-4 md:p-5 flex gap-4 transition-colors ${
                  notif.read ? 'bg-[var(--bg-surface)] opacity-70' : 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated-2)]'
                }`}
              >
                <div className="mt-1 flex-shrink-0">
                  {getIcon(notif.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className={`font-medium text-sm md:text-base ${notif.read ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
                      {notif.title}
                    </h4>
                    <span className="text-xs text-[var(--text-muted)] whitespace-nowrap flex-shrink-0">
                      {format(parseISO(notif.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-2">
                    {notif.message}
                  </p>
                  
                  {!notif.read && (
                    <button 
                      onClick={() => markAsRead(notif.id)}
                      className="text-xs font-medium text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] transition-colors"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
                
                {!notif.read && (
                  <div className="flex-shrink-0 flex items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-primary)] animate-pulse-dot" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
