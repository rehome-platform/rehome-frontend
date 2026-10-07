import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminLayout({ children }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    { path: '/admin', label: 'Dashboard & Tài chính', icon: 'dashboard' },
    { path: '/admin/configs', label: 'Cấu hình tham số', icon: 'settings' },
    { path: '/admin/users', label: 'Quản lý tài khoản', icon: 'manage_accounts' },
    { path: '/moderator/verifications', label: 'Đối chiếu pháp lý', icon: 'verified_user' },
    { path: '/moderator/disputes', label: 'Phân xử khiếu nại', icon: 'gavel' },
  ];

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Sidebar for Admin and Moderator */}
      <aside className="w-64 bg-surface-container-lowest border-r border-outline-variant flex flex-col fixed inset-y-0 z-30">
        <div className="h-16 flex items-center px-6 border-b border-outline-variant">
          <Link to="/" className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold">R</span>
            <span className="text-xl font-bold font-heading text-primary">ReHome Admin</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-outline-variant">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center text-xs font-bold">
                {user?.name?.[0] || 'A'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-on-surface truncate">{user?.name || 'Administrator'}</p>
                <p className="text-[10px] text-outline capitalize">{user?.role || 'Admin'}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-outline hover:text-error rounded-md transition-colors"
              title="Đăng xuất"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="pl-64 flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-surface-container-lowest border-b border-outline-variant px-8 flex items-center justify-between sticky top-0 z-20">
          <h2 className="text-lg font-semibold text-on-surface">Cổng Điều Hành ReHome</h2>
          <div className="flex items-center space-x-3">
            <Link to="/" className="text-xs text-primary hover:underline">
              Về trang chủ ReHome →
            </Link>
          </div>
        </header>
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
