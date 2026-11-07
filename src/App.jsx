import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { WebSocketProvider } from './context/WebSocketContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { NotificationToastContainer } from './components/notification/index.js';
import { ToastProvider } from './context/ToastContext.jsx';
import ToastContainer from './components/common/ToastContainer.jsx';
import AppRouter from './routes/AppRouter.jsx';
import { Phase2Provider } from './features/moderator/hooks/warehouseHooks.jsx';

/**
 * Root Component - Configures Context Providers and Router
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          <NotificationProvider>
            <ToastProvider>
              <NotificationToastContainer />
              <ToastContainer />
              <Phase2Provider><AppRouter /></Phase2Provider>
            </ToastProvider>
          </NotificationProvider>
        </WebSocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
