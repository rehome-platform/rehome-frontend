import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AuthContext } from './AuthContext.jsx';

const defaultWebSocketValue = {
  service: null,
  status: 'DISCONNECTED',
  isConnected: false,
  isConnecting: false,
  error: null,
  reconnect: () => {},
  disconnect: () => {},
};

export const WebSocketContext = createContext(defaultWebSocketValue);

export const WebSocketProvider = ({
  children,
  service: customService = null,
  autoConnect = true,
}) => {
  // Lấy AuthContext nếu có (an toàn khi chạy test độc lập ngoài AuthProvider)
  const auth = useContext(AuthContext);
  const isAuthenticated = auth?.isAuthenticated;
  const isInitializing = auth?.isInitializing;

  const [status, setStatus] = useState(() =>
    customService ? customService.getStatus() : 'DISCONNECTED'
  );
  const [error, setError] = useState(null);
  const [serviceState, setServiceState] = useState(() => customService || null);

  const serviceRef = useRef(customService || null);
  const serviceLoaderRef = useRef(null);
  const mountedRef = useRef(true);

  if (customService && serviceRef.current !== customService) {
    serviceRef.current = customService;
  }

  const ensureService = useCallback(async () => {
    if (customService) return customService;
    if (serviceRef.current) return serviceRef.current;
    if (!serviceLoaderRef.current) {
      serviceLoaderRef.current = import('../services/stompClientService.js')
        .then(({ StompClientService }) => {
          const instance = new StompClientService({
            onStatusChange: (newStatus) => {
              if (!mountedRef.current) return;
              setStatus(newStatus);
              if (newStatus === 'CONNECTED') {
                setError(null);
              }
            },
            onError: (err) => {
              if (!mountedRef.current) return;
              setError(err);
            },
          });
          if (!mountedRef.current) {
            instance.destroy();
            return null;
          }
          serviceRef.current = instance;
          setServiceState(instance);
          return instance;
        })
        .catch((err) => {
          serviceLoaderRef.current = null;
          throw err;
        });
    }
    return serviceLoaderRef.current;
  }, [customService]);

  // Lắng nghe thay đổi trạng thái nếu dùng customService
  useEffect(() => {
    if (customService) {
      serviceRef.current = customService;
      setServiceState(customService);
      if (typeof customService.onStatusChange === 'undefined') {
        setStatus(customService.getStatus?.() || 'DISCONNECTED');
      }
    }
  }, [customService]);

  // Vòng đời kết nối theo trạng thái Authentication
  useEffect(() => {
    if (!autoConnect || isInitializing) return;
    let cancelled = false;

    if (isAuthenticated) {
      ensureService()
        .then((svc) => {
          if (!cancelled && svc) svc.connect();
        })
        .catch((err) => {
          if (!cancelled) setError(err);
        });
    } else if (isAuthenticated === false) {
      serviceRef.current?.disconnect();
    }

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isInitializing, autoConnect, ensureService]);

  // Dọn dẹp khi unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      serviceLoaderRef.current = null;
      if (!customService && serviceRef.current) {
        serviceRef.current.destroy();
        serviceRef.current = null;
      }
    };
  }, [customService]);

  const activeService = customService || serviceState;

  const value = {
    service: activeService,
    status,
    isConnected: status === 'CONNECTED',
    isConnecting: status === 'CONNECTING',
    error,
    reconnect: () => {
      if (serviceRef.current) {
        serviceRef.current.connect();
      } else {
        ensureService()
          .then((svc) => svc?.connect())
          .catch((err) => {
            if (mountedRef.current) setError(err);
          });
      }
    },
    disconnect: () => serviceRef.current?.disconnect(),
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  return context || defaultWebSocketValue;
};

export default WebSocketContext;

