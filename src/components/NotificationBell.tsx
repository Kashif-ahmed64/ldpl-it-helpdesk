import { useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { formatDateTime } from '../utils/format';
import type { AppNotification } from '../hooks/useTicketNotifications';

interface NotificationBellProps {
  notifications: AppNotification[];
  unreadCount: number;
  toast: string | null;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onDismissToast: () => void;
}

export default function NotificationBell({
  notifications,
  unreadCount,
  toast,
  onMarkAllRead,
  onMarkRead,
  onDismissToast,
}: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleOpen = () => {
    setOpen((v) => {
      if (!v) onMarkAllRead();
      return !v;
    });
  };

  return (
    <>
      {toast && (
        <div className="toast-banner" role="status">
          <span>{toast}</span>
          <button type="button" onClick={onDismissToast} aria-label="Dismiss">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="notification-bell" ref={ref}>
        <button
          type="button"
          className="notification-bell__btn"
          onClick={toggleOpen}
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="notification-bell__badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>

        {open && (
          <div className="notification-bell__dropdown card">
            <div className="notification-bell__header">
              <strong>Notifications</strong>
            </div>
            <ul className="notification-bell__list">
              {notifications.length === 0 ? (
                <li className="notification-bell__empty">No notifications yet.</li>
              ) : (
                notifications.slice(0, 15).map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`notification-bell__item${n.read ? '' : ' notification-bell__item--unread'}`}
                      onClick={() => onMarkRead(n.id)}
                    >
                      <span>{n.message}</span>
                      <time>{formatDateTime(n.createdAt)}</time>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
