import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { supabase } from '../../config/supabase';
import type { DbTicket, Ticket, TicketCategory, TicketPriority } from '../../types';
import { mapTicket } from '../../utils/db';
import { hoursBetween } from '../../utils/format';
import { PRIORITY_STYLES } from '../../utils/badges';

const CATEGORY_COLORS = ['#8b0000', '#c0392b', '#1e3a5f', '#2563eb', '#d4a017', '#64748b', '#475569'];
const PRIORITY_COLORS = Object.values(PRIORITY_STYLES).map((s) => s.color);

export default function TicketDashboardPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const fetchTickets = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from('tickets').select('*').order('created_at', { ascending: false });
    if (data) setTickets(data.map((r) => mapTicket(r as DbTicket)));
  }, []);

  useEffect(() => {
    fetchTickets();
    if (!supabase) return;

    const channel = supabase
      .channel('dashboard-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        fetchTickets();
      })
      .subscribe();

    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [fetchTickets]);

  const kpis = useMemo(() => {
    const open = tickets.filter((t) => t.status === 'Open').length;
    const inProgress = tickets.filter((t) => t.status === 'In Progress').length;
    const urgent = tickets.filter((t) => t.priority === 'Urgent' && t.status !== 'Closed').length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resolvedToday = tickets.filter((t) => {
      if (!t.resolvedAt) return false;
      return new Date(t.resolvedAt) >= today;
    }).length;

    const closed = tickets.filter((t) => t.resolvedAt && (t.status === 'Resolved' || t.status === 'Closed'));
    const avgHours =
      closed.length > 0
        ? closed.reduce((sum, t) => sum + hoursBetween(t.createdAt, t.resolvedAt!), 0) / closed.length
        : 0;

    return { open, inProgress, urgent, resolvedToday, avgHours };
  }, [tickets]);

  const byCategory = useMemo(() => {
    const counts: Record<TicketCategory, number> = {
      Hardware: 0, Software: 0, Network: 0, Account: 0, Email: 0, CCTV: 0, Other: 0,
    };
    tickets.forEach((t) => { counts[t.category]++; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [tickets]);

  const byPriority = useMemo(() => {
    const counts: Record<TicketPriority, number> = { Urgent: 0, High: 0, Medium: 0, Low: 0 };
    tickets.forEach((t) => { counts[t.priority]++; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [tickets]);

  return (
    <div className="page">
      <h1 className="page__title">Dashboard</h1>

      <div className="kpi-grid">
        <div className="card kpi-card">
          <p className="kpi-card__label">Open Tickets</p>
          <p className="kpi-card__value">{kpis.open}</p>
        </div>
        <div className="card kpi-card">
          <p className="kpi-card__label">In Progress</p>
          <p className="kpi-card__value">{kpis.inProgress}</p>
        </div>
        <div className={`card kpi-card${kpis.urgent > 0 ? ' kpi-card--urgent' : ''}`}>
          <p className="kpi-card__label">Urgent Priority</p>
          <p className="kpi-card__value">{kpis.urgent}</p>
        </div>
        <div className="card kpi-card">
          <p className="kpi-card__label">Resolved Today</p>
          <p className="kpi-card__value">{kpis.resolvedToday}</p>
        </div>
        <div className="card kpi-card">
          <p className="kpi-card__label">Avg Resolution Time</p>
          <p className="kpi-card__value">{kpis.avgHours.toFixed(1)}h</p>
        </div>
      </div>

      <div className="chart-grid">
        <div className="card chart-card">
          <h2>Tickets by Category</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byCategory}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h2>Tickets by Priority</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={byPriority} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {byPriority.map((_, i) => (
                  <Cell key={i} fill={PRIORITY_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
