import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_HOME_ROUTES } from '../configs/role.config.js';

/**
 * PrivateRoute component for Role-Based Access Control (RBAC)
 */
export default function PrivateRoute({ children, roles }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0) {
    const userRole = user?.role;
    if (!userRole || !roles.includes(userRole)) {
      // Redirect unauthorized user to their role home page or main page
      const redirectPath = ROLE_HOME_ROUTES[userRole] || '/';
      return <Navigate to={redirectPath} replace />;
    }
  }

  return children;
}
