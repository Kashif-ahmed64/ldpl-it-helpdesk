import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import AdminLayoutPage from './pages/admin/AdminLayoutPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import EmployeeLayoutPage from './pages/employee/EmployeeLayoutPage';
import EmployeeHomePage from './pages/employee/EmployeeHomePage';
import RaiseTicketPage from './pages/employee/RaiseTicketPage';
import MyTicketsPage from './pages/employee/MyTicketsPage';
import ITLayoutPage from './pages/it/ITLayoutPage';
import TicketDashboardPage from './pages/it/TicketDashboardPage';
import AllTicketsPage from './pages/it/AllTicketsPage';
import MyAssignedTicketsPage from './pages/it/MyAssignedTicketsPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ChangePasswordPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminLayoutPage />}>
            <Route index element={<TicketDashboardPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="tickets" element={<AllTicketsPage />} />
            <Route path="assigned" element={<MyAssignedTicketsPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['it_staff']} />}>
          <Route path="/it" element={<ITLayoutPage />}>
            <Route index element={<TicketDashboardPage />} />
            <Route path="tickets" element={<AllTicketsPage />} />
            <Route path="assigned" element={<MyAssignedTicketsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
          <Route path="/employee" element={<EmployeeLayoutPage />}>
            <Route index element={<EmployeeHomePage />} />
            <Route path="raise" element={<RaiseTicketPage />} />
            <Route path="tickets" element={<MyTicketsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
