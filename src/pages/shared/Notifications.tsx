// ═══════════════════════════════════════════════════════════
// AttendAI — Notifications Page (Shared)
// ═══════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import PageHeader from '../../components/ui/PageHeader';
import { Bell, BellRing, AlertTriangle, Info, CheckCircle, Clock, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../api/client';
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
  const [error, setError] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/notifications${filter === 'unread' ? '?unreadOnly=true' : ''}`);
      setNotifications(data.data.notifications);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load notifications'));
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update the notification'));
    }
  };

  const markAllAsRead = async () => {
    setIsMarkingAll(true);
    try {
      await api.put('/notifications/read-all');
      setNotifications((list) => list.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not mark notifications as read'));
    } finally {
      setIsMarkingAll(false);
    }
  };

  const unread = notifications.filter((n) => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'absent_alert':
        return <AlertTriangle className="text-amber-400" aria-hidden="true" />;
      case 'proxy_detected':
        return <AlertTriangle className="text-rose-400" aria-hidden="true" />;
      case 'low_attendance':
        return <Clock className="text-rose-400" aria-hidden="true" />;
      case 'system':
        return <Info className="text-indigo-400" aria-hidden="true" />;
      default:
        return <BellRing className="text-[var(--text-muted)]" aria-hidden="true" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        icon={<Bell size={24} />}
        title="Notifications"
        description={
          !isLoading && !error && unread > 0
            ? `${unread} unread · alerts, updates and system messages`
            : 'Alerts, updates and system messages.'
        }
        actions={
          <>
            <select
              className="input w-auto"
              aria-label="Show"
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
            >
              <option value="all">All notifications</option>
              <option value="unread">Unread only</option>
            </select>
            <Button
              variant="outline"
              icon={<CheckCheck size={16} aria-hidden="true" />}
              onClick={markAllAsRead}
              isLoading={isMarkingAll}
              disabled={unread === 0}
            >
              Mark all read
            </Button>
          </>
        }
      />

      <Card padding="none" className="overflow-hidden">
        {isLoading ? (
          <div
            className="divide-y divide-[var(--border)]"
            aria-busy="true"
            aria-label="Loading notifications"
          >
            {[0, 1, 2].map((i) => (
              <div key={i} className="p-5 flex gap-4">
                <div className="skeleton w-6 h-6 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchNotifications} className="border-0 rounded-none" />
        ) : notifications.length === 0 ? (
          <EmptyState
            tone="success"
            icon={<CheckCircle size={28} />}
            title="All caught up!"
            description={
              filter === 'unread' ? 'You have no unread notifications.' : 'You have no notifications yet.'
            }
            className="py-14"
          />
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {notifications.map((notif) => (
              <article
                key={notif.id}
                aria-label={`${notif.read ? '' : 'Unread: '}${notif.title}`}
                className={`p-4 md:p-5 flex gap-4 transition-colors ${
                  notif.read ? 'bg-[var(--bg-surface)]' : 'bg-[var(--accent-primary-soft)]'
                }`}
              >
                <div className="mt-1 flex-shrink-0">{getIcon(notif.type)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 mb-1">
                    <h2
                      className={`font-medium text-sm md:text-base ${notif.read ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}
                    >
                      {notif.title}
                    </h2>
                    <time
                      dateTime={notif.createdAt}
                      className="text-xs text-[var(--text-muted)] whitespace-nowrap flex-shrink-0"
                    >
                      {format(parseISO(notif.createdAt), 'MMM d, h:mm a')}
                    </time>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] mb-2">{notif.message}</p>

                  {!notif.read && (
                    <button
                      type="button"
                      onClick={() => markAsRead(notif.id)}
                      className="py-1 text-xs font-medium text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] transition-colors"
                    >
                      Mark as read
                    </button>
                  )}
                </div>

                {!notif.read && (
                  <div className="flex-shrink-0 flex items-center" aria-hidden="true">
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent-primary)]" />
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
