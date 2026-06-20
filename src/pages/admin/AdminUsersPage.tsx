import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { supabase } from '../../config/supabase';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import type { DbUser, User } from '../../types';
import { hashPassword } from '../../utils/auth';
import { DEPARTMENTS, roleFromDb, roleToDb, ROLE_LABELS } from '../../utils/badges';
import { mapUser } from '../../utils/db';

interface UserForm {
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  role: string;
}

const emptyForm: UserForm = {
  employeeId: '',
  name: '',
  designation: '',
  department: 'Operations',
  role: 'Employee',
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [selected, setSelected] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (!err && data) setUsers(data.map((r) => mapUser(r as DbUser)));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        u.employeeId.includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.department.toLowerCase().includes(q);
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && u.isActive) ||
        (statusFilter === 'inactive' && !u.isActive);
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setSubmitting(true);
    setError('');

    const empId = form.employeeId.trim();
    const passwordHash = await hashPassword(empId);

    const { error: err } = await supabase.from('users').insert({
      employee_id: empId,
      name: form.name.trim(),
      designation: form.designation.trim(),
      department: form.department,
      role: roleToDb(form.role),
      password_hash: passwordHash,
      password_changed: false,
      is_active: true,
    });

    setSubmitting(false);
    if (err) {
      setError(err.message.includes('duplicate') ? 'Employee ID already exists.' : err.message);
      return;
    }

    setCreateOpen(false);
    setForm(emptyForm);
    setSuccessMsg(
      `User created — Employee ID: ${empId} — Temporary Password: ${empId} — they will be asked to change it on first login.`,
    );
    fetchUsers();
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !selected) return;
    setSubmitting(true);
    setError('');

    const { error: err } = await supabase
      .from('users')
      .update({
        name: form.name.trim(),
        designation: form.designation.trim(),
        department: form.department,
        role: roleToDb(form.role),
      })
      .eq('id', selected.id);

    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }

    setEditOpen(false);
    setSelected(null);
    fetchUsers();
  };

  const handleDeactivate = async () => {
    if (!supabase || !selected) return;
    setSubmitting(true);
    await supabase
      .from('users')
      .update({ is_active: !selected.isActive })
      .eq('id', selected.id);
    setSubmitting(false);
    setDeactivateOpen(false);
    setSelected(null);
    fetchUsers();
  };

  const handleResetPassword = async () => {
    if (!supabase || !selected) return;
    setSubmitting(true);
    const passwordHash = await hashPassword(selected.employeeId);
    await supabase
      .from('users')
      .update({ password_hash: passwordHash, password_changed: false })
      .eq('id', selected.id);
    setSubmitting(false);
    setResetOpen(false);
    setSuccessMsg(
      `Password reset — Employee ID: ${selected.employeeId} — Temporary Password: ${selected.employeeId}`,
    );
    setSelected(null);
    fetchUsers();
  };

  const openEdit = (u: User) => {
    setSelected(u);
    setForm({
      employeeId: u.employeeId,
      name: u.name,
      designation: u.designation,
      department: u.department,
      role: roleFromDb(u.role),
    });
    setError('');
    setEditOpen(true);
  };

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">User Management</h1>
        <button type="button" className="btn-primary" onClick={() => { setForm(emptyForm); setError(''); setCreateOpen(true); }}>
          <Plus size={18} />
          Create New User
        </button>
      </div>

      {successMsg && (
        <div className="alert alert--success">
          {successMsg}
          <button type="button" onClick={() => setSuccessMsg('')}>Dismiss</button>
        </div>
      )}

      <div className="filters card">
        <div className="filters__search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by ID, name, department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="admin">System Admin</option>
          <option value="it_staff">IT Staff</option>
          <option value="employee">Employee</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="card table-wrap">
        {loading ? (
          <p className="table-empty">Loading users...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Designation</th>
                <th>Department</th>
                <th>Role</th>
                <th>Status</th>
                <th>Password Changed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>{u.employeeId}</td>
                  <td>{u.name}</td>
                  <td>{u.designation}</td>
                  <td>{u.department}</td>
                  <td>{roleFromDb(u.role)}</td>
                  <td>
                    <Badge
                      label={u.isActive ? 'Active' : 'Inactive'}
                      variant={u.isActive ? 'success' : 'danger'}
                    />
                  </td>
                  <td>
                    <Badge
                      label={u.passwordChanged ? 'Yes' : 'No'}
                      variant={u.passwordChanged ? 'success' : 'muted'}
                    />
                  </td>
                  <td className="actions-cell">
                    <button type="button" className="btn-link" onClick={() => openEdit(u)}>Edit</button>
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => { setSelected(u); setDeactivateOpen(true); }}
                    >
                      {u.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => { setSelected(u); setResetOpen(true); }}
                    >
                      Reset Password
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="table-empty">No users found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New User">
        <UserFormFields form={form} setForm={setForm} isCreate error={error} />
        <div className="modal__actions">
          <button type="button" className="btn-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
          <button type="button" className="btn-primary" disabled={submitting} onClick={handleCreate}>
            {submitting ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit User">
        <UserFormFields form={form} setForm={setForm} error={error} />
        <div className="modal__actions">
          <button type="button" className="btn-secondary" onClick={() => setEditOpen(false)}>Cancel</button>
          <button type="button" className="btn-primary" disabled={submitting} onClick={handleEdit}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Modal>

      <Modal open={deactivateOpen} onClose={() => setDeactivateOpen(false)} title={selected?.isActive ? 'Deactivate User' : 'Reactivate User'}>
        <p>
          {selected?.isActive
            ? `Deactivate ${selected.name} (${selected.employeeId})? They will not be able to log in.`
            : `Reactivate ${selected?.name} (${selected?.employeeId})?`}
        </p>
        <div className="modal__actions">
          <button type="button" className="btn-secondary" onClick={() => setDeactivateOpen(false)}>Cancel</button>
          <button type="button" className="btn-primary" disabled={submitting} onClick={handleDeactivate}>
            Confirm
          </button>
        </div>
      </Modal>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset Password">
        <p>
          Reset password for {selected?.name} to their Employee ID ({selected?.employeeId})?
          They will be required to change it on next login.
        </p>
        <div className="modal__actions">
          <button type="button" className="btn-secondary" onClick={() => setResetOpen(false)}>Cancel</button>
          <button type="button" className="btn-primary" disabled={submitting} onClick={handleResetPassword}>
            Reset Password
          </button>
        </div>
      </Modal>
    </div>
  );
}

function UserFormFields({
  form,
  setForm,
  isCreate,
  error,
}: {
  form: UserForm;
  setForm: (f: UserForm) => void;
  isCreate?: boolean;
  error?: string;
}) {
  return (
    <form className="form-grid" onSubmit={(e) => e.preventDefault()}>
      {isCreate && (
        <label className="form-field">
          <span>Employee ID</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]+"
            value={form.employeeId}
            onChange={(e) => setForm({ ...form, employeeId: e.target.value.replace(/\D/g, '') })}
            placeholder="e.g. 632"
            required
          />
        </label>
      )}
      <label className="form-field">
        <span>Full Name</span>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </label>
      <label className="form-field">
        <span>Designation</span>
        <input
          type="text"
          value={form.designation}
          onChange={(e) => setForm({ ...form, designation: e.target.value })}
          required
        />
      </label>
      <label className="form-field">
        <span>Department</span>
        <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span>Role</span>
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {Object.values(ROLE_LABELS).map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </label>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}
