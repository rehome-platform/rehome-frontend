import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import AppRouter from './routes/AppRouter.jsx';
import { Phase2Provider } from './features/moderator/hooks/warehouseHooks.jsx';

/**
 * Root Component - Configures Context Providers and Router
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Phase2Provider><AppRouter /></Phase2Provider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
