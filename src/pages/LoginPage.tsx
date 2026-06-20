import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { HeadphonesIcon } from 'lucide-react';
import { getDashboardPath, useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    if (!user.passwordChanged) return <Navigate to="/change-password" replace />;
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const err = await login(employeeId, password);
    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }

    const session = JSON.parse(localStorage.getItem('ldpl-helpdesk-session') || '{}');
    if (session.passwordChanged) {
      navigate(getDashboardPath(session.role), { replace: true });
    } else {
      navigate('/change-password', { replace: true });
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-card__icon">
          <HeadphonesIcon size={36} strokeWidth={1.75} />
        </div>
        <h1 className="auth-card__title">LDPL IT Helpdesk</h1>
        <p className="auth-card__subtitle">
          Liberty Daharki Powers Ltd — IT Service Desk
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Employee ID</span>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g. 632"
              required
              autoComplete="username"
            />
          </label>

          <label className="form-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary auth-form__submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
