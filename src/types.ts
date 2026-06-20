export type UserRole = 'admin' | 'it_staff' | 'employee';

export type TicketCategory =
  | 'Hardware'
  | 'Software'
  | 'Network'
  | 'Account'
  | 'Email'
  | 'CCTV'
  | 'Other';

export type TicketPriority = 'Urgent' | 'High' | 'Medium' | 'Low';

export type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export interface User {
  id: string;
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  role: UserRole;
  passwordChanged: boolean;
  createdAt: string;
}

export interface Ticket {
  id: string;
  /** Auto-generated as IT-2026-XXXX */
  ticketNumber: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  raisedBy: string;
  assignedTo?: string;
  attachmentUrl?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  comment: string;
  createdAt: string;
}
