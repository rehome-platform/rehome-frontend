import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext.jsx';
import baseApi from '../services/baseApi.js';
import { API_ENDPOINTS, API_BASE_URL, getSockJsUrl } from '../configs/api.config.js';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transportAvailable, setTransportAvailable] = useState(null);
  const stompClientRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await baseApi.get(API_ENDPOINTS.NOTIFICATIONS.LIST);
      const payload = res.data;
      let rawList = [];
      if (Array.isArray(payload)) {
        rawList = payload;
      } else if (payload && Array.isArray(payload.result?.content)) {
        rawList = payload.result.content;
      } else if (payload && Array.isArray(payload.content)) {
        rawList = payload.content;
      } else if (payload && Array.isArray(payload.result)) {
        rawList = payload.result;
      } else if (payload && Array.isArray(payload.data)) {
        rawList = payload.data;
      } else if (payload && Array.isArray(payload.items)) {
        rawList = payload.items;
      }

      const list = rawList.map((item) => {
        const isRead = item.isRead !== undefined ? Boolean(item.isRead) : Boolean(item.read);
        return {
          ...item,
          isRead,
          read: isRead,
        };
      });

      setNotifications(list);
      setUnreadCount(list.filter((item) => !item.isRead).length);
      setError(null);
    } catch (err) {
      const status = err.response?.status;
      const errorMsg =
        status === 404
          ? 'Dịch vụ thông báo chưa được hỗ trợ trên hệ thống máy chủ'
          : err.response?.data?.message || err.message || 'Lỗi tải thông báo';
      console.warn(`[NotificationContext] Không thể tải thông báo (${status || 'Network Error'}):`, errorMsg);
      setError({
        status: status || 0,
        message: errorMsg,
      });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const markAsRead = async (id) => {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.isRead || target.read) return;

    try {
      await baseApi.put(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Failed to mark notification read:', err?.message || err);
      // P6-N02: failed read preserves unread count - không trừ count khi lỗi
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      return;
    }

    fetchNotifications();

    if (!user?.id) return;

    // SockJS yêu cầu scheme http: hoặc https:, tuyệt đối không truyền ws: hoặc wss:
    const sockJsUrl = getSockJsUrl(API_BASE_URL);
    if (!sockJsUrl) {
      setTransportAvailable(false);
      return;
    }

    let isCancelled = false;
    let client = null;

    try {
      client = new Client({
        webSocketFactory: () => new SockJS(sockJsUrl),
        reconnectDelay: 0,
        heartbeatIncoming: 0,
        heartbeatOutgoing: 0,
        onConnect: () => {
          if (isCancelled) {
            client.deactivate();
            return;
          }
          setTransportAvailable(true);
          client.subscribe(`/user/${user.id}/queue/notifications`, (message) => {
            if (message.body) {
              try {
                const raw = JSON.parse(message.body);
                const isRead = raw.isRead !== undefined ? Boolean(raw.isRead) : Boolean(raw.read);
                const newNotification = {
                  ...raw,
                  isRead,
                  read: isRead,
                };
                setNotifications((prev) => {
                  if (prev.some((n) => n.id === newNotification.id)) {
                    return prev;
                  }
                  if (!isRead) {
                    setUnreadCount((cnt) => cnt + 1);
                  }
                  return [newNotification, ...prev];
                });
              } catch (e) {
                console.warn('[NotificationContext] Could not parse socket message:', e);
              }
            }
          });
        },
        onStompError: (frame) => {
          console.warn('[NotificationContext] STOMP transport error:', frame?.headers?.message || frame);
          setTransportAvailable(false);
        },
        onWebSocketError: (event) => {
          console.warn('[NotificationContext] WebSocket transport unavailable:', event?.message || 'Connection failed');
          setTransportAvailable(false);
        },
        onWebSocketClose: () => {
          setTransportAvailable(false);
        },
      });

      client.activate();
      stompClientRef.current = client;
    } catch (err) {
      console.warn('[NotificationContext] Failed to initialize WebSocket client:', err?.message || err);
      setTransportAvailable(false);
    }

    return () => {
      isCancelled = true;
      if (client) {
        try {
          if (client.active) {
            client.deactivate();
          }
        } catch {
          // Cleanup an toàn
        }
      }
      stompClientRef.current = null;
    };
  }, [isAuthenticated, user?.id, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        transportAvailable,
        markAsRead,
        refreshNotifications: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);

export default NotificationContext;
