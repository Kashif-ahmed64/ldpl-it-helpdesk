import type { TicketPriority, TicketStatus } from '../types';

export const PRIORITY_STYLES: Record<TicketPriority, { bg: string; color: string }> = {
  Urgent: { bg: '#fee2e2', color: '#b91c1c' },
  High: { bg: '#ffedd5', color: '#c2410c' },
  Medium: { bg: '#fef9c3', color: '#a16207' },
  Low: { bg: '#dcfce7', color: '#15803d' },
};

export const STATUS_STYLES: Record<TicketStatus, { bg: string; color: string }> = {
  Open: { bg: '#dbeafe', color: '#1d4ed8' },
  'In Progress': { bg: '#fef3c7', color: '#b45309' },
  Resolved: { bg: '#dcfce7', color: '#15803d' },
  Closed: { bg: '#f1f5f9', color: '#475569' },
};

export const ROLE_LABELS = {
  admin: 'System Admin',
  it_staff: 'IT Staff',
  employee: 'Employee',
} as const;

export const DEPARTMENTS = [
  'Operations',
  'Maintenance',
  'HR',
  'Finance',
  'IT',
  'Stores',
  'Security',
  'Admin',
] as const;

export function roleToDb(role: string): 'admin' | 'it_staff' | 'employee' {
  if (role === 'System Admin') return 'admin';
  if (role === 'IT Staff') return 'it_staff';
  return 'employee';
}

export function roleFromDb(role: 'admin' | 'it_staff' | 'employee'): string {
  return ROLE_LABELS[role];
}
