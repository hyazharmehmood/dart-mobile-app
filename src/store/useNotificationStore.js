import { create } from "zustand";

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../services/notificationService";

function normalizeList(data) {
  return {
    notifications: data?.notifications || data?.items || [],
    unreadCount: Number(data?.unreadCount) || 0,
    nextCursor: data?.nextCursor || null
  };
}

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  nextCursor: null,
  isLoading: false,
  error: null,
  loadNotifications: async (params = {}) => {
    set({ isLoading: true, error: null });

    try {
      const data = await listNotifications({ limit: 20, unreadOnly: false, ...params });
      const next = normalizeList(data);

      set({
        notifications: params.cursor ? [...get().notifications, ...next.notifications] : next.notifications,
        unreadCount: next.unreadCount,
        nextCursor: next.nextCursor,
        isLoading: false
      });

      return next;
    } catch (error) {
      set({
        isLoading: false,
        error: error?.response?.data?.error || error?.message || "Unable to load notifications"
      });
      throw error;
    }
  },
  markRead: async (notificationId) => {
    if (!notificationId) {
      return null;
    }

    const data = await markNotificationRead(notificationId);
    const readAt = data?.notification?.readAt || new Date().toISOString();

    set({
      notifications: get().notifications.map((notification) =>
        notification.id === notificationId ? { ...notification, readAt } : notification
      ),
      unreadCount: Math.max(0, get().unreadCount - 1)
    });

    return data;
  },
  markAllRead: async () => {
    const data = await markAllNotificationsRead();
    const readAt = data?.readAt || new Date().toISOString();

    set({
      notifications: get().notifications.map((notification) => ({ ...notification, readAt: notification.readAt || readAt })),
      unreadCount: 0
    });

    return data;
  },
  receiveNotification: (notification) => {
    if (!notification?.id) {
      return;
    }

    const exists = get().notifications.some((item) => item.id === notification.id);

    set({
      notifications: exists
        ? get().notifications.map((item) => (item.id === notification.id ? { ...item, ...notification } : item))
        : [notification, ...get().notifications],
      unreadCount: notification.readAt || exists ? get().unreadCount : get().unreadCount + 1
    });
  },
  receiveRead: ({ id, readAt }) => {
    if (!id) {
      return;
    }

    const target = get().notifications.find((notification) => notification.id === id);

    set({
      notifications: get().notifications.map((notification) =>
        notification.id === id ? { ...notification, readAt: readAt || notification.readAt || new Date().toISOString() } : notification
      ),
      unreadCount: target && !target.readAt ? Math.max(0, get().unreadCount - 1) : get().unreadCount
    });
  },
  receiveReadAll: ({ readAt } = {}) => {
    const nextReadAt = readAt || new Date().toISOString();

    set({
      notifications: get().notifications.map((notification) => ({ ...notification, readAt: notification.readAt || nextReadAt })),
      unreadCount: 0
    });
  },
  resetNotifications: () =>
    set({
      notifications: [],
      unreadCount: 0,
      nextCursor: null,
      isLoading: false,
      error: null
    })
}));

export default useNotificationStore;
