import NotificationBell from './NotificationBell';
import { useTicketNotifications } from '../hooks/useTicketNotifications';

interface TopbarProps {
  name?: string;
  meta?: string;
  notificationMode: 'employee' | 'it';
}

export default function Topbar({ name, meta, notificationMode }: TopbarProps) {
  const { notifications, unreadCount, toast, markAllRead, markRead, dismissToast } =
    useTicketNotifications(notificationMode);

  return (
    <header className="topbar">
      <div>
        <p className="topbar__name">{name}</p>
        {meta && <p className="topbar__meta">{meta}</p>}
      </div>
      <NotificationBell
        notifications={notifications}
        unreadCount={unreadCount}
        toast={toast}
        onMarkAllRead={markAllRead}
        onMarkRead={markRead}
        onDismissToast={dismissToast}
      />
    </header>
  );
}
