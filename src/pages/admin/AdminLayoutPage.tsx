import { NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3,
  HeadphonesIcon,
  LayoutDashboard,
  LogOut,
  Ticket,
  UserCheck,
  Users,
} from 'lucide-react';
import Topbar from '../../components/Topbar';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/tickets', label: 'All Tickets', icon: Ticket },
  { to: '/admin/assigned', label: 'My Assigned', icon: UserCheck },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
];

export default function AdminLayoutPage() {
  const { user, logout } = useAuth();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <HeadphonesIcon size={24} />
          <div>
            <p className="sidebar__org">LDPL IT Helpdesk</p>
            <p className="sidebar__role">System Admin</p>
          </div>
        </div>

        <nav className="sidebar__nav">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <button type="button" className="sidebar__logout" onClick={logout}>
          <LogOut size={18} />
          Logout
        </button>
      </aside>

      <div className="layout__main">
        <Topbar name={user?.name} meta={user?.designation} notificationMode="it" />
        <main className="layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
