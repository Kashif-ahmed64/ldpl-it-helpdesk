import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { getDashboardPath, useAuth } from '../context/AuthContext';

export default function ChangePasswordPage() {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!user) return <Navigate to="/login" replace />;
  if (user.passwordChanged) return <Navigate to={getDashboardPath(user.role)} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const err = await changePassword(newPassword);
    setSubmitting(false);

    if (err) {
      setError(err);
      return;
    }

    navigate(getDashboardPath(user.role), { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-card__icon">
          <LockKeyhole size={36} strokeWidth={1.75} />
        </div>
        <h1 className="auth-card__title">Change Your Password</h1>
        <p className="auth-card__subtitle">
          You must set a new password before accessing the system.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>New Password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>

          <label className="form-field">
            <span>Confirm Password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              autoComplete="new-password"
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary auth-form__submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
