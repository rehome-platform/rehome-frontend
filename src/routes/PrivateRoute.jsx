import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_HOME_ROUTES } from '../configs/role.config.js';

/**
 * PrivateRoute component for Role-Based Access Control (RBAC)
 * Bảo vệ các route nội bộ (Admin & Moderator), khôi phục trạng thái và điều hướng theo role
 */
export default function PrivateRoute({ children, roles }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F6F9F4] text-[#191C19]">
        <div className="w-10 h-10 border-4 border-[#006B2C] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-[#717971]">Đang đồng bộ phiên bảo mật ReHome...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0) {
    const userRole = user?.role;
    const isAllowed = roles.some((r) => {
      if (r === userRole) return true;
      if (r === 'staff' && (userRole === 'staff' || userRole === 'moderator')) return true;
      if (r === 'moderator' && (userRole === 'staff' || userRole === 'moderator')) return true;
      if (r === 'admin' && userRole === 'admin') return true;
      return false;
    });

    if (!userRole || !isAllowed) {
      // Điều hướng người dùng không đủ quyền về trang chủ theo vai trò thực tế của họ
      const redirectPath = ROLE_HOME_ROUTES[userRole] || '/';
      return <Navigate to={redirectPath} replace />;
    }
  }

  return children;
}
