import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { supabase } from '../../config/supabase';
import Badge from '../../components/Badge';
import { useAuth } from '../../context/AuthContext';
import type { DbTicket, TicketStatus } from '../../types';
import { mapTicket } from '../../utils/db';

const STATUSES: TicketStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed'];

function computeCounts(data: DbTicket[]) {
  const tickets = data.map((r) => mapTicket(r));
  const next = { Open: 0, 'In Progress': 0, Resolved: 0, Closed: 0 };
  tickets.forEach((t) => { next[t.status]++; });
  return next;
}

export default function EmployeeHomePage() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<TicketStatus, number>>({
    Open: 0,
    'In Progress': 0,
    Resolved: 0,
    Closed: 0,
  });

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .eq('raised_by', user.id);

    if (data) setCounts(computeCounts(data as DbTicket[]));
  }, [user]);

  useEffect(() => {
    load();
    if (!supabase || !user) return;

    const channel = supabase
      .channel(`employee-home-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        (payload) => {
          const row = (payload.new ?? payload.old) as DbTicket | undefined;
          if (row?.raised_by === user.id) load();
        },
      )
      .subscribe();

    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [user, load]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="page">
      <h1 className="page__title">Welcome, {user?.name?.split(' ')[0]}</h1>
      <p className="page__subtitle">Need IT support? Raise a ticket and our team will assist you.</p>

      <Link to="/employee/raise" className="cta-card card">
        <PlusCircle size={32} />
        <div>
          <h2>Raise a Ticket</h2>
          <p>Report hardware, software, network, or account issues</p>
        </div>
      </Link>

      <div className="summary-grid">
        <div className="card summary-card">
          <p className="summary-card__label">Total Tickets</p>
          <p className="summary-card__value">{total}</p>
        </div>
        {STATUSES.map((status) => (
          <div key={status} className="card summary-card">
            <Badge label={status} status={status} />
            <p className="summary-card__value">{counts[status]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
