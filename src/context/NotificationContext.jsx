import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';
import baseApi from '../services/baseApi.js';
import { API_ENDPOINTS, WS_BASE_URL } from '../configs/api.config.js';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stompClient, setStompClient] = useState(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await baseApi.get(API_ENDPOINTS.NOTIFICATIONS.LIST);
      const items = res.data?.data || res.data || [];
      setNotifications(items);
      setUnreadCount(items.filter((item) => !item.read).length);
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
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
      console.error('Failed to mark notification read:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (!isAuthenticated || !user?.id) return;

    // WebSocket STOMP setup
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_BASE_URL),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        client.subscribe(`/user/${user.id}/queue/notifications`, (message) => {
          if (message.body) {
            try {
              const newNotification = JSON.parse(message.body);
              setNotifications((prev) => [newNotification, ...prev]);
              setUnreadCount((prev) => prev + 1);
            } catch (e) {
              console.warn('Could not parse socket notification message', e);
            }
          }
        });
      },
    });

    client.activate();
    setStompClient(client);

    return () => {
      if (client.active) {
        client.deactivate();
      }
    };
  }, [isAuthenticated, user?.id, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
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
