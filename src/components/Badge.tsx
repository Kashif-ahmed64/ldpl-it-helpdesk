import type { TicketPriority, TicketStatus } from '../types';
import { PRIORITY_STYLES, STATUS_STYLES } from '../utils/badges';

interface BadgeProps {
  label: string;
  variant?: 'priority' | 'status' | 'default' | 'success' | 'danger' | 'muted';
  priority?: TicketPriority;
  status?: TicketStatus;
}

export default function Badge({ label, variant = 'default', priority, status }: BadgeProps) {
  let style: React.CSSProperties = {};

  if (priority) {
    const s = PRIORITY_STYLES[priority];
    style = { background: s.bg, color: s.color };
  } else if (status) {
    const s = STATUS_STYLES[status];
    style = { background: s.bg, color: s.color };
  }

  return (
    <span className={`badge badge--${variant}`} style={Object.keys(style).length ? style : undefined}>
      {label}
    </span>
  );
}
