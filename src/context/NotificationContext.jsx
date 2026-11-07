import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useNotificationQueue, useWebSocket } from '../hooks/useWebSocket.js';
import baseApi from '../services/baseApi.js';
import { API_ENDPOINTS } from '../configs/api.config.js';

const NotificationContext = createContext();

export const normalizeNotification = (item) => {
  if (!item) return item;
  const isRead = item.isRead !== undefined ? Boolean(item.isRead) : Boolean(item.read);
  return {
    ...item,
    isRead,
    read: isRead,
  };
};

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { isConnected } = useWebSocket();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeToasts, setActiveToasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const [error, setError] = useState(null);

  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await baseApi.get(API_ENDPOINTS.NOTIFICATIONS.LIST, {
        params: { page: 0, size: 20 },
      });
      const payload = res.data;
      let rawList = [];
      let totalPages = 1;

      if (Array.isArray(payload)) {
        rawList = payload;
      } else if (payload && Array.isArray(payload.result?.content)) {
        rawList = payload.result.content;
        totalPages = payload.result.totalPages ?? 1;
      } else if (payload && Array.isArray(payload.content)) {
        rawList = payload.content;
        totalPages = payload.totalPages ?? 1;
      } else if (payload && Array.isArray(payload.result)) {
        rawList = payload.result;
      } else if (payload && Array.isArray(payload.data)) {
        rawList = payload.data;
      } else if (payload && Array.isArray(payload.items)) {
        rawList = payload.items;
      }

      const list = rawList.map(normalizeNotification);
      setNotifications(list);
      setPage(0);
      setHasMore(totalPages > 1 || rawList.length === 20);
      setError(null);

      // Fetch unread count from server
      try {
        const countRes = await baseApi.get(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
        const countPayload = countRes.data;
        let count = 0;
        if (typeof countPayload === 'number') {
          count = countPayload;
        } else if (typeof countPayload?.result?.count === 'number') {
          count = countPayload.result.count;
        } else if (typeof countPayload?.result === 'number') {
          count = countPayload.result;
        } else if (typeof countPayload?.count === 'number') {
          count = countPayload.count;
        } else {
          count = list.filter((item) => !item.isRead).length;
        }
        setUnreadCount(Math.max(0, count));
      } catch {
        // Fallback to local list unread count
        const fallbackCount = list.filter((item) => !item.isRead).length;
        setUnreadCount(Math.max(0, fallbackCount));
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 403) {
        // User (e.g. Admin or unauthorized) lacks notification access - handle gracefully
        setNotifications([]);
        setUnreadCount(0);
        setError(null);
        setHasMore(false);
      } else {
        const errorMsg =
          status === 404
            ? 'Dịch vụ thông báo chưa được hỗ trợ trên hệ thống máy chủ'
            : err.response?.data?.message || err.message || 'Lỗi tải thông báo';
        console.warn(`[NotificationContext] Không thể tải thông báo (${status || 'Network Error'}):`, errorMsg);
        setNotifications([]);
        setUnreadCount(0);
        setHasMore(false);
        setError({
          status: status || 0,
          message: errorMsg,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadMoreNotifications = useCallback(async () => {
    if (loadingMore || !hasMore || !isAuthenticated) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await baseApi.get(API_ENDPOINTS.NOTIFICATIONS.LIST, {
        params: { page: nextPage, size: 20 },
      });
      const payload = res.data;
      let rawList = [];
      let totalPages = nextPage + 1;

      if (Array.isArray(payload)) {
        rawList = payload;
      } else if (payload && Array.isArray(payload.result?.content)) {
        rawList = payload.result.content;
        totalPages = payload.result.totalPages ?? (nextPage + 1);
      } else if (payload && Array.isArray(payload.content)) {
        rawList = payload.content;
        totalPages = payload.totalPages ?? (nextPage + 1);
      } else if (payload && Array.isArray(payload.result)) {
        rawList = payload.result;
      } else if (payload && Array.isArray(payload.data)) {
        rawList = payload.data;
      } else if (payload && Array.isArray(payload.items)) {
        rawList = payload.items;
      }

      const normalized = rawList.map(normalizeNotification);
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((n) => String(n.id)));
        const newItems = normalized.filter((n) => !existingIds.has(String(n.id)));
        return [...prev, ...newItems];
      });
      setPage(nextPage);
      setHasMore(nextPage + 1 < totalPages && rawList.length > 0);
    } catch (err) {
      console.warn('Failed to load more notifications:', err?.message || err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, isAuthenticated, page]);

  const markAsRead = useCallback(async (id) => {
    const target = notificationsRef.current.find((n) => String(n.id) === String(id));
    if (target && target.isRead) return;

    try {
      try {
        await baseApi.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
      } catch (reqErr) {
        if (reqErr?.response?.status === 405 || !baseApi.patch) {
          try {
            await baseApi.post(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
          } catch {
            await baseApi.put(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
          }
        } else {
          throw reqErr;
        }
      }

      setNotifications((prev) =>
        prev.map((n) => (String(n.id) === String(id) ? { ...n, read: true, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Failed to mark notification read:', err?.message || err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      try {
        await baseApi.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
      } catch (reqErr) {
        if (reqErr?.response?.status === 405 || !baseApi.patch) {
          try {
            await baseApi.post(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
          } catch {
            await baseApi.put(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
          }
        } else {
          throw reqErr;
        }
      }

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, isRead: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all notifications read:', err?.message || err);
    }
  }, []);

  const dismissToast = useCallback((toastId) => {
    setActiveToasts((prev) => prev.filter((t) => String(t.id) !== String(toastId)));
  }, []);

  const handleRealtimeNotification = useCallback((rawPayload) => {
    if (!rawPayload) return;
    let item;
    try {
      item = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
    } catch {
      return;
    }

    const normalized = normalizeNotification(item);
    const notifId = normalized.id;

    const alreadyExists = notificationsRef.current.some((n) => String(n.id) === String(notifId));
    if (alreadyExists) {
      return;
    }

    setNotifications((prev) => {
      if (prev.some((n) => String(n.id) === String(notifId))) {
        return prev;
      }
      return [normalized, ...prev];
    });

    if (!normalized.isRead) {
      setUnreadCount((cnt) => Math.max(0, cnt + 1));
    }

    const toast = {
      ...normalized,
      id: notifId || normalized.id || `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: normalized.title || '',
      message: normalized.message || '',
      targetType: normalized.targetType || null,
      targetId: normalized.targetId || null,
      createdAt: normalized.createdAt || new Date().toISOString(),
      type: normalized.type || null,
    };

    setActiveToasts((prev) => {
      if (prev.some((t) => String(t.id) === String(toast.id))) {
        return prev;
      }
      return [...prev, toast];
    });
  }, []);

  // Real-time subscription via hook
  useNotificationQueue(handleRealtimeNotification);

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setActiveToasts([]);
      setError(null);
      setPage(0);
      setHasMore(false);
      return;
    }

    fetchNotifications();
  }, [isAuthenticated, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        activeToasts,
        loading,
        loadingMore,
        hasMore,
        error,
        transportAvailable: isConnected,
        markAsRead,
        markAllAsRead,
        dismissToast,
        loadMoreNotifications,
        refreshNotifications: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);

export default NotificationContext;
