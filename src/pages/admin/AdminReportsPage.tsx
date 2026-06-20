import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../config/supabase';
import type { DbTicket, DbUser, Ticket, User } from '../../types';
import { mapTicket, mapUser } from '../../utils/db';
import { formatDate, hoursBetween } from '../../utils/format';

interface StaffResolvedRow {
  name: string;
  resolved: number;
  avgHours: number;
}

interface BreakdownRow {
  name: string;
  count: number;
}

export default function AdminReportsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

    const [ticketRes, userRes] = await Promise.all([
      supabase.from('tickets').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('*'),
    ]);

    if (ticketRes.data) setTickets(ticketRes.data.map((r) => mapTicket(r as DbTicket)));
    if (userRes.data) setUsers(userRes.data.map((r) => mapUser(r as DbUser)));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const created = new Date(t.createdAt);
      const matchFrom = !dateFrom || created >= new Date(dateFrom);
      const matchTo = !dateTo || created <= new Date(`${dateTo}T23:59:59`);
      return matchFrom && matchTo;
    });
  }, [tickets, dateFrom, dateTo]);

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const staffResolved = useMemo((): StaffResolvedRow[] => {
    const itStaff = users.filter((u) => u.role === 'it_staff' || u.role === 'admin');
    return itStaff.map((staff) => {
      const resolved = filtered.filter(
        (t) =>
          t.assignedTo === staff.id &&
          t.resolvedAt &&
          (t.status === 'Resolved' || t.status === 'Closed'),
      );
      const avgHours =
        resolved.length > 0
          ? resolved.reduce((sum, t) => sum + hoursBetween(t.createdAt, t.resolvedAt!), 0) /
            resolved.length
          : 0;
      return { name: staff.name, resolved: resolved.length, avgHours };
    }).sort((a, b) => b.resolved - a.resolved);
  }, [filtered, users]);

  const categoryBreakdown = useMemo((): BreakdownRow[] => {
    const counts = new Map<string, number>();
    filtered.forEach((t) => counts.set(t.category, (counts.get(t.category) ?? 0) + 1));
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const departmentBreakdown = useMemo((): BreakdownRow[] => {
    const counts = new Map<string, number>();
    filtered.forEach((t) => {
      const dept = userMap.get(t.raisedBy)?.department ?? 'Unknown';
      counts.set(dept, (counts.get(dept) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filtered, userMap]);

  const exportReport = () => {
    const wb = XLSX.utils.book_new();

    const staffSheet = XLSX.utils.json_to_sheet(
      staffResolved.map((r) => ({
        'IT Staff': r.name,
        'Tickets Resolved': r.resolved,
        'Avg Resolution Time (hours)': r.avgHours.toFixed(2),
      })),
    );
    XLSX.utils.book_append_sheet(wb, staffSheet, 'Staff Performance');

    const categorySheet = XLSX.utils.json_to_sheet(
      categoryBreakdown.map((r) => ({ Category: r.name, 'Ticket Count': r.count })),
    );
    XLSX.utils.book_append_sheet(wb, categorySheet, 'By Category');

    const deptSheet = XLSX.utils.json_to_sheet(
      departmentBreakdown.map((r) => ({ Department: r.name, 'Ticket Count': r.count })),
    );
    XLSX.utils.book_append_sheet(wb, deptSheet, 'By Department');

    const allSheet = XLSX.utils.json_to_sheet(
      filtered.map((t) => ({
        'Ticket Number': t.ticketNumber,
        Title: t.title,
        Category: t.category,
        Priority: t.priority,
        Status: t.status,
        'Raised By': userMap.get(t.raisedBy)?.name ?? '',
        Department: userMap.get(t.raisedBy)?.department ?? '',
        'Assigned To': t.assignedTo ? userMap.get(t.assignedTo)?.name ?? '' : '',
        Created: formatDate(t.createdAt),
        Resolved: t.resolvedAt ? formatDate(t.resolvedAt) : '',
      })),
    );
    XLSX.utils.book_append_sheet(wb, allSheet, 'All Tickets');

    XLSX.writeFile(wb, `ldpl-helpdesk-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Reports</h1>
        <button type="button" className="btn-primary" onClick={exportReport}>
          <Download size={18} />
          Export Full Report to Excel
        </button>
      </div>

      <div className="filters card">
        <label className="form-field">
          <span>From</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label className="form-field">
          <span>To</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
      </div>

      {loading ? (
        <p className="table-empty">Loading report data...</p>
      ) : (
        <div className="reports-grid">
          <div className="card report-section">
            <h2>Resolved per IT Staff</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>IT Staff</th>
                    <th>Tickets Resolved</th>
                    <th>Avg Resolution Time</th>
                  </tr>
                </thead>
                <tbody>
                  {staffResolved.map((r) => (
                    <tr key={r.name}>
                      <td>{r.name}</td>
                      <td>{r.resolved}</td>
                      <td>{r.avgHours.toFixed(1)}h</td>
                    </tr>
                  ))}
                  {staffResolved.length === 0 && (
                    <tr><td colSpan={3} className="table-empty">No data in range.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card report-section">
            <h2>Category Breakdown</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Ticket Count</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryBreakdown.map((r) => (
                    <tr key={r.name}>
                      <td>{r.name}</td>
                      <td>{r.count}</td>
                    </tr>
                  ))}
                  {categoryBreakdown.length === 0 && (
                    <tr><td colSpan={2} className="table-empty">No data in range.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card report-section">
            <h2>Department Breakdown</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Tickets Raised</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentBreakdown.map((r) => (
                    <tr key={r.name}>
                      <td>{r.name}</td>
                      <td>{r.count}</td>
                    </tr>
                  ))}
                  {departmentBreakdown.length === 0 && (
                    <tr><td colSpan={2} className="table-empty">No data in range.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
