import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminLayout({ children }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    { path: '/admin', label: 'Tổng quan & Quỹ nền tảng', icon: 'dashboard' },
    { path: '/admin/users', label: 'Quản lý tài khoản', icon: 'manage_accounts' },
    { path: '/admin/moderators', label: 'Quản lý Moderator', icon: 'badge' },
    { path: '/admin/warehouses', label: 'Quản lý chi nhánh kho', icon: 'warehouse' },
    { path: '/admin/configs', label: 'Cấu hình tham số hệ thống', icon: 'tune' },
    { path: '/admin/audit-logs', label: 'Nhật ký kiểm toán (Audit)', icon: 'history' },
  ];

  return (
    <div className="min-h-screen flex bg-[#F6F9F4] text-[#191C19] font-sans antialiased">
      {/* Sidebar for Admin */}
      <aside className="w-64 bg-white border-r border-[#DDE5D9] flex flex-col fixed inset-y-0 z-30 shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
        <div className="h-16 flex items-center px-6 border-b border-[#DDE5D9]">
          <Link to="/admin" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#006B2C] text-white flex items-center justify-center font-bold font-heading text-lg shadow-sm">
              R
            </div>
            <div>
              <span className="text-base font-extrabold font-heading text-[#006B2C] tracking-tight block leading-tight">
                ReHome Admin
              </span>
              <span className="text-[10px] font-medium text-[#717971] block leading-tight">
                Hệ Thống Quản Trị Tối Cao
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-[#006B2C] text-white shadow-sm'
                    : 'text-[#414942] hover:bg-[#F0F5EE] hover:text-[#006B2C]'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-white' : 'text-[#717971]'}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#DDE5D9] bg-[#FAFCF9]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#006B2C]/10 text-[#006B2C] flex items-center justify-center text-xs font-bold border border-[#006B2C]/20">
                {user?.name?.[0] || 'A'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-[#191C19] truncate">{user?.name || 'Trần Minh Quân'}</p>
                <p className="text-[10px] text-[#717971]">Quản trị viên cấp cao</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-[#717971] hover:text-[#BA1A1A] hover:bg-white rounded-lg border border-transparent hover:border-[#DDE5D9] transition-colors"
              title="Đăng xuất"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="pl-64 flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-[#DDE5D9] px-8 flex items-center justify-between sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <h2 className="text-sm font-bold text-[#191C19] flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#006B2C]"></span>
            <span>Cổng Điều Hành Nền Tảng ReHome</span>
          </h2>
          <div className="flex items-center space-x-4">
            <Link to="/moderator/counter" className="text-xs font-medium text-[#717971] hover:text-[#006B2C]">
              Xem Cổng Moderator Kho →
            </Link>
            <Link to="/" className="text-xs font-semibold text-[#006B2C] hover:underline">
              Về Trang chủ →
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
