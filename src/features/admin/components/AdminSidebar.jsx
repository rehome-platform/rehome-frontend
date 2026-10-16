import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';

/**
 * Sidebar Quản trị hệ thống ReHome
 * Thiết kế chính xác theo Google Stitch:
 * Nền: #006B2C | Chữ trắng/xanh nhạt | Phông: Be Vietnam Pro
 */
export default function AdminSidebar({ activeTab, onSelectTab, isMobileOpen, onCloseMobile }) {
  const { user, logout } = useAuth();
  const displayName = user?.fullName || user?.name || user?.email || 'Quản trị viên';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase() || 'AD';
  const menuItems = [
    { id: 'overview', path: '/admin', label: 'Tổng quan & Quỹ', icon: 'grid_view' },
    { id: 'accounts', path: '/admin/users', label: 'Tài khoản', icon: 'group' },
    { id: 'moderators', path: '/admin/moderators', label: 'Nhân sự Moderator', icon: 'badge' },
    { id: 'warehouses', path: '/admin/warehouses', label: 'Chi nhánh kho', icon: 'warehouse' },
    { id: 'configs', path: '/admin/configs', label: 'Cấu hình tham số', icon: 'tune' },
    { id: 'audit', path: '/admin/audit-logs', label: 'Nhật ký hệ thống', icon: 'receipt_long' },
  ];

  return (
    <>
      {/* Overlay cho Mobile */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#006B2C] text-white flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } shadow-xl lg:shadow-none select-none`}
      >
        {/* Top: Logo & Branding */}
        <div>
          <div className="h-20 px-6 flex items-center justify-between border-b border-white/10">
            <Link
              to="/admin"
              onClick={() => onSelectTab('overview')}
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white backdrop-blur-sm group-hover:bg-white/25 transition-colors">
                <span className="material-symbols-outlined text-2xl font-light">eco</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight font-heading leading-tight">
                  ReHome
                </span>
                <span className="text-[10px] font-semibold tracking-[0.14em] text-white/75 uppercase">
                  QUẢN TRỊ HỆ THỐNG
                </span>
              </div>
            </Link>

            {/* Close button for mobile */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => {
                    onSelectTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 ${
                    isActive
                      ? 'bg-white text-[#006B2C] shadow-md shadow-black/10'
                      : 'text-white/85 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] transition-transform duration-150 ${
                      isActive ? 'text-[#006B2C]' : 'text-white/70'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile */}
        <div className="p-4 m-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
          <div className="flex items-center justify-between">
            <Link to="/profile" className="flex items-center gap-3 truncate hover:opacity-90 transition-opacity">
              <div className="w-9 h-9 rounded-xl bg-white text-[#006B2C] font-bold flex items-center justify-center text-xs shadow-sm overflow-hidden shrink-0">
                {user?.avatarUrl || user?.avatar ? (
                  <img src={user.avatarUrl || user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-bold truncate text-white leading-tight">
                  {displayName}
                </span>
                <span className="text-[10px] text-white/70 font-medium leading-tight truncate">
                  {user?.email || 'Quản trị viên (Admin)'}
                </span>
              </div>
            </Link>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors ml-1 shrink-0"
              title="Đăng xuất"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
