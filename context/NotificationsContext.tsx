import { API_ENDPOINTS } from '@/constants/api';
import type { AlertType } from '@/constants/theme';
import apiClient from '@/services/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type NotifCategory = 'emergency' | 'assigned' | 'verification' | 'dispatch' | 'status';

export interface NotificationItem {
  id: string;
  category: NotifCategory;
  alertType: AlertType;
  title: string;
  description: string;
  timestamp: string;
  status: string;
  unread: boolean;
}

interface NotificationsContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  personnelId: string | null;
  refresh: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [personnelId, setPersonnelId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const pid = personnelId ?? (await AsyncStorage.getItem('user_id'));
    if (!pid) {
      console.warn('⚠️ Walang user_id sa AsyncStorage — hindi makakakuha ng notifications.');
      return;
    }
    if (!personnelId) setPersonnelId(pid);

    setLoading(true);
    try {
      const { data } = await apiClient.get(`${API_ENDPOINTS.bfpNotificationsList}?personnel_id=${pid}`);
      if (!data.success) throw new Error(data.message || 'Request failed');
      setNotifications(data.data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [personnelId]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      // optimistic update — kaagad makikita sa LAHAT ng screens na naka-subscribe dito
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, unread: false } : n))
      );
      try {
        await apiClient.post(API_ENDPOINTS.bfpNotificationsMarkRead, {
          notification_id: notificationId,
          personnel_id: personnelId,
        });
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    },
    [personnelId]
  );

  useEffect(() => {
    refresh();
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => n.unread).length, [notifications]);

  const value: NotificationsContextValue = {
    notifications,
    unreadCount,
    loading,
    personnelId,
    refresh,
    markAsRead,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return ctx;
}