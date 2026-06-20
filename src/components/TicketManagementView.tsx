import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../config/supabase';
import Badge from './Badge';
import Modal from './Modal';
import { useAuth } from '../context/AuthContext';
import type {
  DbTicket,
  DbTicketComment,
  DbUser,
  TicketCategory,
  TicketComment,
  TicketPriority,
  TicketStatus,
  TicketWithRaisedBy,
  User,
} from '../types';
import { DEPARTMENTS } from '../utils/badges';
import { mapComment, mapTicket, mapUser } from '../utils/db';
import { formatDate, formatDateTime } from '../utils/format';
import { addInternalComment, assignTicket, updateTicketStatus } from '../utils/tickets';

const STATUSES: TicketStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed'];
const PRIORITIES: TicketPriority[] = ['Urgent', 'High', 'Medium', 'Low'];
const CATEGORIES: TicketCategory[] = [
  'Hardware', 'Software', 'Network', 'Account', 'Email', 'CCTV', 'Other',
];

interface Props {
  assignedOnly?: boolean;
  showExport?: boolean;
  title?: string;
}

export default function TicketManagementView({
  assignedOnly = false,
  showExport = true,
  title = 'All Tickets',
}: Props) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketWithRaisedBy[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [itStaff, setItStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [selected, setSelected] = useState<TicketWithRaisedBy | null>(null);
  const [comments, setComments] = useState<(TicketComment & { userName?: string })[]>([]);
  const [newComment, setNewComment] = useState('');
  const [actionError, setActionError] = useState('');

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const fetchData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

    let ticketQuery = supabase.from('tickets').select('*').order('created_at', { ascending: false });
    if (assignedOnly && user) ticketQuery = ticketQuery.eq('assigned_to', user.id);

    const [ticketRes, userRes] = await Promise.all([
      ticketQuery,
      supabase.from('users').select('*'),
    ]);

    const allUsers = (userRes.data ?? []).map((r) => mapUser(r as DbUser));
    setUsers(allUsers);
    setItStaff(allUsers.filter((u) => u.role === 'it_staff' || u.role === 'admin'));

    if (ticketRes.data) {
      setTickets(
        ticketRes.data.map((r) => {
          const t = mapTicket(r as DbTicket);
          return {
            ...t,
            raisedByUser: allUsers.find((u) => u.id === t.raisedBy),
            assignedToUser: t.assignedTo ? allUsers.find((u) => u.id === t.assignedTo) : undefined,
          };
        }),
      );
    }
    setLoading(false);
  }, [assignedOnly, user]);

  useEffect(() => {
    fetchData();
    if (!supabase) return;

    const channel = supabase
      .channel(`ticket-mgmt-${assignedOnly ? 'assigned' : 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [fetchData, assignedOnly]);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q || t.ticketNumber.toLowerCase().includes(q) || t.title.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
      const matchCategory = categoryFilter === 'all' || t.category === categoryFilter;
      const matchDept =
        departmentFilter === 'all' || t.raisedByUser?.department === departmentFilter;
      const created = new Date(t.createdAt);
      const matchFrom = !dateFrom || created >= new Date(dateFrom);
      const matchTo = !dateTo || created <= new Date(`${dateTo}T23:59:59`);
      return matchSearch && matchStatus && matchPriority && matchCategory && matchDept && matchFrom && matchTo;
    });
  }, [tickets, search, statusFilter, priorityFilter, categoryFilter, departmentFilter, dateFrom, dateTo]);

  const openDetail = async (ticket: TicketWithRaisedBy) => {
    setSelected(ticket);
    setActionError('');
    setNewComment('');
    if (!supabase) return;

    const { data } = await supabase
      .from('ticket_comments')
      .select('*')
      .eq('ticket_id', ticket.id)
      .eq('is_internal', true)
      .order('created_at', { ascending: true });

    if (data) {
      setComments(
        data.map((r) => {
          const c = mapComment(r as DbTicketComment);
          return { ...c, userName: userMap.get(c.userId)?.name ?? 'Unknown' };
        }),
      );
    }
  };

  const handleStatusChange = async (status: TicketStatus) => {
    if (!selected) return;
    const err = await updateTicketStatus(selected.id, status, selected.status);
    if (err) { setActionError(err); return; }
    const updated = { ...selected, status };
    if (status === 'Resolved' || status === 'Closed') {
      updated.resolvedAt = new Date().toISOString();
    }
    setSelected(updated);
    fetchData();
  };

  const handleAssign = async (assignedTo: string) => {
    if (!selected) return;
    const id = assignedTo || null;
    const err = await assignTicket(selected.id, id);
    if (err) { setActionError(err); return; }
    const assignee = id ? userMap.get(id) : undefined;
    setSelected({ ...selected, assignedTo: id ?? undefined, assignedToUser: assignee });
    fetchData();
  };

  const handleAddComment = async () => {
    if (!selected || !user || !newComment.trim()) return;
    const err = await addInternalComment(selected.id, user.id, newComment);
    if (err) { setActionError(err); return; }
    setComments([
      ...comments,
      {
        id: crypto.randomUUID(),
        ticketId: selected.id,
        userId: user.id,
        comment: newComment.trim(),
        isInternal: true,
        createdAt: new Date().toISOString(),
        userName: user.name,
      },
    ]);
    setNewComment('');
  };

  const exportExcel = () => {
    const rows = filtered.map((t) => ({
      'Ticket Number': t.ticketNumber,
      Title: t.title,
      'Raised By': t.raisedByUser?.name ?? '',
      Department: t.raisedByUser?.department ?? '',
      Category: t.category,
      Priority: t.priority,
      Status: t.status,
      'Assigned To': t.assignedToUser?.name ?? '',
      'Created Date': formatDateTime(t.createdAt),
      'Resolved At': t.resolvedAt ? formatDateTime(t.resolvedAt) : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tickets');
    XLSX.writeFile(wb, `ldpl-tickets-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">{title}</h1>
        {showExport && (
          <button type="button" className="btn-secondary" onClick={exportExcel}>
            <Download size={18} /> Export to Excel
          </button>
        )}
      </div>

      <div className="filters card filters--wrap">
        <div className="filters__search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search ticket number or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="all">All Priority</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
          <option value="all">All Departments</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      <div className="card table-wrap">
        {loading ? (
          <p className="table-empty">Loading tickets...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket Number</th>
                <th>Title</th>
                <th>Raised By</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td>{t.ticketNumber}</td>
                  <td>{t.title}</td>
                  <td>{t.raisedByUser?.name ?? '—'}</td>
                  <td>{t.category}</td>
                  <td><Badge label={t.priority} priority={t.priority} /></td>
                  <td><Badge label={t.status} status={t.status} /></td>
                  <td>{t.assignedToUser?.name ?? '—'}</td>
                  <td>{formatDate(t.createdAt)}</td>
                  <td>
                    <button type="button" className="btn-link" onClick={() => openDetail(t)}>View</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="table-empty">No tickets found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.ticketNumber ?? ''} wide>
        {selected && (
          <div className="ticket-detail ticket-detail--manage">
            <div className="ticket-detail__badges">
              <Badge label={selected.category} variant="default" />
              <Badge label={selected.priority} priority={selected.priority} />
              <Badge label={selected.status} status={selected.status} />
            </div>
            <h3>{selected.title}</h3>
            <p className="ticket-detail__desc">{selected.description}</p>

            {selected.raisedByUser && (
              <p className="ticket-detail__meta">
                Raised by <strong>{selected.raisedByUser.name}</strong> —{' '}
                {selected.raisedByUser.designation}, {selected.raisedByUser.department}
              </p>
            )}

            {selected.attachmentUrl && (
              <img src={selected.attachmentUrl} alt="Attachment" className="ticket-detail__img" />
            )}

            {actionError && <p className="form-error">{actionError}</p>}

            <div className="ticket-actions">
              <label className="form-field">
                <span>Assign To</span>
                <select
                  value={selected.assignedTo ?? ''}
                  onChange={(e) => handleAssign(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {user && (
                    <option value={user.id}>Assign to Me ({user.name})</option>
                  )}
                  {itStaff.filter((s) => s.id !== user?.id).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </label>

              <label className="form-field">
                <span>Status</span>
                <select
                  value={selected.status}
                  onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            </div>

            <div className="comments-section">
              <h4>Internal Notes</h4>
              <ul className="comments-list">
                {comments.map((c) => (
                  <li key={c.id} className="comment-item">
                    <p>{c.comment}</p>
                    <span>{c.userName} · {formatDateTime(c.createdAt)}</span>
                  </li>
                ))}
                {comments.length === 0 && <li className="comment-item comment-item--empty">No internal notes yet.</li>}
              </ul>
              <div className="comment-form">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add an internal note..."
                  rows={3}
                />
                <button type="button" className="btn-primary" onClick={handleAddComment}>Add Note</button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
