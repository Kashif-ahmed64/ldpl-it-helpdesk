import { supabase } from '../config/supabase';
import type { TicketStatus } from '../types';

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
  currentStatus?: TicketStatus,
): Promise<string | null> {
  if (!supabase) return 'Supabase not configured';

  const updates: Record<string, unknown> = { status };
  if (status === 'Resolved' || status === 'Closed') {
    updates.resolved_at = new Date().toISOString();
  } else {
    updates.resolved_at = null;
  }

  const { error } = await supabase.from('tickets').update(updates).eq('id', ticketId);
  if (error) return error.message;

  if (currentStatus !== status) {
    await supabase.from('ticket_status_history').insert({
      ticket_id: ticketId,
      status,
    });
  }

  return null;
}

export async function assignTicket(ticketId: string, assignedTo: string | null): Promise<string | null> {
  if (!supabase) return 'Supabase not configured';
  const { error } = await supabase
    .from('tickets')
    .update({ assigned_to: assignedTo })
    .eq('id', ticketId);
  return error?.message ?? null;
}

export async function addInternalComment(
  ticketId: string,
  userId: string,
  comment: string,
): Promise<string | null> {
  if (!supabase) return 'Supabase not configured';
  const { error } = await supabase.from('ticket_comments').insert({
    ticket_id: ticketId,
    user_id: userId,
    comment: comment.trim(),
    is_internal: true,
  });
  return error?.message ?? null;
}
