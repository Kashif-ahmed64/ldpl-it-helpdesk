import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!user.passwordChanged && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (user.passwordChanged && location.pathname === '/change-password') {
    const dash =
      user.role === 'admin' ? '/admin' : user.role === 'it_staff' ? '/it' : '/employee';
    return <Navigate to={dash} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const dash =
      user.role === 'admin' ? '/admin' : user.role === 'it_staff' ? '/it' : '/employee';
    return <Navigate to={dash} replace />;
  }

  return <Outlet />;
}
