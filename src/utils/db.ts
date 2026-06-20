import type {
  DbTicket,
  DbTicketComment,
  DbTicketStatusHistory,
  DbUser,
  Ticket,
  TicketComment,
  TicketStatusHistory,
  User,
} from '../types';

export function mapUser(row: DbUser): User {
  return {
    id: row.id,
    employeeId: row.employee_id,
    name: row.name,
    designation: row.designation,
    department: row.department,
    role: row.role,
    passwordChanged: row.password_changed,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export function mapTicket(row: DbTicket): Ticket {
  return {
    id: row.id,
    ticketNumber: row.ticket_number,
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    raisedBy: row.raised_by,
    assignedTo: row.assigned_to ?? undefined,
    attachmentUrl: row.attachment_url ?? undefined,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
  };
}

export function mapComment(row: DbTicketComment): TicketComment {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    userId: row.user_id,
    comment: row.comment,
    isInternal: row.is_internal,
    createdAt: row.created_at,
  };
}

export function mapStatusHistory(row: DbTicketStatusHistory): TicketStatusHistory {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    status: row.status,
    changedAt: row.changed_at,
  };
}
