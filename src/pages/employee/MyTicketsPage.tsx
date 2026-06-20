import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../config/supabase';
import Badge from '../../components/Badge';
import Modal from '../../components/Modal';
import { useAuth } from '../../context/AuthContext';
import type { DbTicket, DbTicketStatusHistory, Ticket, TicketStatusHistory } from '../../types';
import { mapStatusHistory, mapTicket } from '../../utils/db';
import { formatDate, formatDateTime } from '../../utils/format';

export default function MyTicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [timeline, setTimeline] = useState<TicketStatusHistory[]>([]);

  const fetchTickets = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .eq('raised_by', user.id)
      .order('created_at', { ascending: false });

    if (data) setTickets(data.map((r) => mapTicket(r as DbTicket)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const openDetail = async (ticket: Ticket) => {
    setSelected(ticket);
    if (!supabase) return;
    const { data } = await supabase
      .from('ticket_status_history')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('changed_at', { ascending: true });

    if (data) setTimeline(data.map((r) => mapStatusHistory(r as DbTicketStatusHistory)));
  };

  return (
    <div className="page">
      <h1 className="page__title">My Tickets</h1>

      {loading ? (
        <p className="table-empty">Loading tickets...</p>
      ) : tickets.length === 0 ? (
        <div className="card placeholder-card"><p>You have not raised any tickets yet.</p></div>
      ) : (
        <div className="ticket-cards">
          {tickets.map((t) => (
            <button
              key={t.id}
              type="button"
              className="card ticket-card"
              onClick={() => openDetail(t)}
            >
              <div className="ticket-card__header">
                <span className="ticket-card__number">{t.ticketNumber}</span>
                <Badge label={t.status} status={t.status} />
              </div>
              <h3>{t.title}</h3>
              <div className="ticket-card__meta">
                <Badge label={t.category} variant="default" />
                <Badge label={t.priority} priority={t.priority} />
                <span>{formatDate(t.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.ticketNumber ?? ''} wide>
        {selected && (
          <div className="ticket-detail">
            <div className="ticket-detail__badges">
              <Badge label={selected.category} variant="default" />
              <Badge label={selected.priority} priority={selected.priority} />
              <Badge label={selected.status} status={selected.status} />
            </div>
            <h3>{selected.title}</h3>
            <p className="ticket-detail__desc">{selected.description}</p>
            {selected.attachmentUrl && (
              <img src={selected.attachmentUrl} alt="Attachment" className="ticket-detail__img" />
            )}
            <h4>Status Timeline</h4>
            <ul className="timeline">
              {timeline.map((entry) => (
                <li key={entry.id}>
                  <Badge label={entry.status} status={entry.status} />
                  <span>{formatDateTime(entry.changedAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </div>
  );
}
