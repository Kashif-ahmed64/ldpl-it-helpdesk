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

export type Department =
  | 'Operations'
  | 'Maintenance'
  | 'HR'
  | 'Finance'
  | 'IT'
  | 'Stores'
  | 'Security'
  | 'Admin';

export interface User {
  id: string;
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  role: UserRole;
  passwordChanged: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Ticket {
  id: string;
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
  isInternal: boolean;
  createdAt: string;
}

export interface TicketStatusHistory {
  id: string;
  ticketId: string;
  status: TicketStatus;
  changedAt: string;
}

export interface DbUser {
  id: string;
  employee_id: string;
  name: string;
  designation: string;
  department: string;
  role: UserRole;
  password_hash: string;
  password_changed: boolean;
  is_active: boolean;
  created_at: string;
}

export interface DbTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  raised_by: string;
  assigned_to: string | null;
  attachment_url: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface DbTicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  comment: string;
  is_internal: boolean;
  created_at: string;
}

export interface DbTicketStatusHistory {
  id: string;
  ticket_id: string;
  status: TicketStatus;
  changed_at: string;
}

export interface TicketWithRaisedBy extends Ticket {
  raisedByUser?: User;
  assignedToUser?: User;
}
