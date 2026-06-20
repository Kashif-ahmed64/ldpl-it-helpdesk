import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../config/supabase';
import type { DbUser, User, UserRole } from '../types';
import { hashPassword, verifyPassword } from '../utils/auth';
import { mapUser } from '../utils/db';

const SESSION_KEY = 'ldpl-helpdesk-session';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (employeeId: string, password: string) => Promise<string | null>;
  logout: () => void;
  changePassword: (newPassword: string) => Promise<string | null>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function saveSession(user: User) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function loadSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'it_staff':
      return '/it';
    default:
      return '/employee';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const session = loadSession();
    if (!session || !supabase) {
      setUser(null);
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.id)
      .single<DbUser>();

    if (error || !data || !data.is_active) {
      clearSession();
      setUser(null);
      return;
    }

    const mapped = mapUser(data);
    setUser(mapped);
    saveSession(mapped);
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (employeeId: string, password: string) => {
    if (!supabase) return 'Supabase is not configured.';

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('employee_id', employeeId.trim())
      .single<DbUser>();

    if (error || !data) return 'Invalid Employee ID or password.';
    if (!data.is_active) return 'This account has been deactivated. Contact IT Admin.';

    const valid = await verifyPassword(password, data.password_hash);
    if (!valid) return 'Invalid Employee ID or password.';

    const mapped = mapUser(data);
    setUser(mapped);
    saveSession(mapped);
    return null;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const changePassword = useCallback(
    async (newPassword: string) => {
      if (!supabase || !user) return 'Not authenticated.';

      const passwordHash = await hashPassword(newPassword);
      const { error } = await supabase
        .from('users')
        .update({ password_hash: passwordHash, password_changed: true })
        .eq('id', user.id);

      if (error) return error.message;

      const updated = { ...user, passwordChanged: true };
      setUser(updated);
      saveSession(updated);
      return null;
    },
    [user],
  );

  const value = useMemo(
    () => ({ user, loading, login, logout, changePassword, refreshUser }),
    [user, loading, login, logout, changePassword, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
