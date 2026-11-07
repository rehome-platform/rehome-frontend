import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { StompClientService } from '../services/stompClientService.js';
import { AuthContext } from './AuthContext.jsx';

export const WebSocketContext = createContext(null);

export const WebSocketProvider = ({
  children,
  service: customService = null,
  autoConnect = true,
}) => {
  // Lấy AuthContext nếu có (an toàn khi chạy test độc lập ngoài AuthProvider)
  const auth = useContext(AuthContext);
  const isAuthenticated = auth?.isAuthenticated;

  const [status, setStatus] = useState(() =>
    customService ? customService.getStatus() : 'DISCONNECTED'
  );
  const [error, setError] = useState(null);

  const serviceRef = useRef(null);

  if (!serviceRef.current) {
    if (customService) {
      serviceRef.current = customService;
    } else {
      serviceRef.current = new StompClientService({
        onStatusChange: (newStatus) => {
          setStatus(newStatus);
          if (newStatus === 'CONNECTED') {
            setError(null);
          }
        },
        onError: (err) => {
          setError(err);
        },
      });
    }
  }

  const service = serviceRef.current;

  // Lắng nghe thay đổi trạng thái nếu dùng customService
  useEffect(() => {
    if (customService && typeof customService.onStatusChange === 'undefined') {
      setStatus(customService.getStatus?.() || 'DISCONNECTED');
    }
  }, [customService]);

  // Vòng đời kết nối theo trạng thái Authentication
  useEffect(() => {
    if (!autoConnect || !service) return;

    if (isAuthenticated) {
      service.connect();
    } else if (isAuthenticated === false) {
      service.disconnect();
    }
  }, [isAuthenticated, autoConnect, service]);

  // Dọn dẹp khi unmount
  useEffect(() => {
    return () => {
      if (!customService && service) {
        service.destroy();
      }
    };
  }, [customService, service]);

  const value = {
    service,
    status,
    isConnected: status === 'CONNECTED',
    isConnecting: status === 'CONNECTING',
    error,
    reconnect: () => service?.connect(),
    disconnect: () => service?.disconnect(),
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketContext;
