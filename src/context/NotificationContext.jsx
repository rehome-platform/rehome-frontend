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
      const items = res.data?.data || res.data || [];
      const list = Array.isArray(items) ? items : [];
      setNotifications(list);
      setUnreadCount(list.filter((item) => !item.read).length);
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
      // Bảo toàn trạng thái: không chế tạo dữ liệu ảo (không fake notification)
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const markAsRead = async (id) => {
    try {
      await baseApi.put(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Failed to mark notification read:', err?.message || err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (!isAuthenticated || !user?.id) return;

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
        // reconnectDelay = 0 để tránh vòng lặp reconnect liên tục khi backend chưa triển khai WebSocket/STOMP
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
                const newNotification = JSON.parse(message.body);
                setNotifications((prev) => [newNotification, ...prev]);
                setUnreadCount((prev) => prev + 1);
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
