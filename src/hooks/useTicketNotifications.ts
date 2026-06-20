import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import type { DbTicket, DbUser, TicketStatus } from '../types';
import { mapUser } from '../utils/db';

export interface AppNotification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
}

type NotificationMode = 'employee' | 'it';

const storageKey = (userId: string) => `ldpl-notifications-${userId}`;

function loadNotifications(userId: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

function saveNotifications(userId: string, items: AppNotification[]) {
  localStorage.setItem(storageKey(userId), JSON.stringify(items.slice(0, 50)));
}

function pushNotification(userId: string, message: string): AppNotification[] {
  const existing = loadNotifications(userId);
  const item: AppNotification = {
    id: crypto.randomUUID(),
    message,
    read: false,
    createdAt: new Date().toISOString(),
  };
  const next = [item, ...existing].slice(0, 50);
  saveNotifications(userId, next);
  return next;
}

export function useTicketNotifications(mode: NotificationMode) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (user) setNotifications(loadNotifications(user.id));
  }, [user]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!supabase || !user) return;

    const channelName = `notifications-${mode}-${user.id}`;
    const channel = supabase.channel(channelName);

    if (mode === 'employee') {
      channel.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'tickets' },
        (payload) => {
          const row = payload.new as DbTicket;
          if (row.raised_by !== user.id) return;

          const oldRow = payload.old as Partial<DbTicket> | undefined;
          const oldStatus = oldRow?.status;
          const newStatus = row.status as TicketStatus;
          if (!newStatus || oldStatus === newStatus) return;

          const message = `Your ticket ${row.ticket_number} status changed to ${newStatus}`;
          const next = pushNotification(user.id, message);
          setNotifications(next);
          showToast(message);
        },
      );
    } else {
      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tickets' },
        async (payload) => {
          const row = payload.new as DbTicket;
          let employeeName = 'Unknown';

          if (supabase) {
            const { data } = await supabase
              .from('users')
              .select('*')
              .eq('id', row.raised_by)
              .single<DbUser>();

            if (data) employeeName = mapUser(data).name;
          }

          const prefix = row.priority === 'Urgent' ? 'New Urgent Ticket' : 'New Ticket';
          const message = `${prefix}: ${row.ticket_number} from ${employeeName}`;
          const next = pushNotification(user.id, message);
          setNotifications(next);
          showToast(message);
        },
      );
    }

    channel.subscribe();

    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [user, mode, showToast]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    if (!user) return;
    const next = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(next);
    saveNotifications(user.id, next);
  }, [user, notifications]);

  const markRead = useCallback(
    (id: string) => {
      if (!user) return;
      const next = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      setNotifications(next);
      saveNotifications(user.id, next);
    },
    [user, notifications],
  );

  const dismissToast = useCallback(() => setToast(null), []);

  return { notifications, unreadCount, toast, markAllRead, markRead, dismissToast };
}
