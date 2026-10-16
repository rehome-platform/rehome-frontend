import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Logo from '../../../components/common/Logo.jsx';

/**
 * Sidebar Quản trị hệ thống ReHome (Admin Unified Sidebar)
 * Tuân thủ ReHome Design Tokens:
 * - Nền: Surface #FFFFFF | Viền: Neutral #DDE5D9 | Nền trang: #F6F9F4
 * - Trạng thái đang chọn (Active): Primary #006B2C với chữ trắng
 * - Trạng thái bình thường: TextSecondary #5B6776 hover #006B2C
 * - Phông chữ: Be Vietnam Pro | Bo góc: 12px (rounded-xl)
 */
export default function AdminSidebar({
  activeTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile,
}) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const displayName = user?.fullName || user?.name || user?.email || 'Quản trị viên';
  const displayEmail = user?.email || 'admin@rehome.vn';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase() || 'AD';

  const menuItems = [
    {
      id: 'overview',
      path: '/admin',
      label: 'Tổng quan & Quỹ nền tảng',
      icon: 'dashboard',
      exact: true,
    },
    {
      id: 'accounts',
      path: '/admin/users',
      label: 'Quản lý tài khoản',
      icon: 'manage_accounts',
    },
    {
      id: 'moderators',
      path: '/admin/moderators',
      label: 'Quản lý Moderator',
      icon: 'badge',
    },
    {
      id: 'warehouses',
      path: '/admin/warehouses',
      label: 'Quản lý chi nhánh kho',
      icon: 'warehouse',
    },
    {
      id: 'configs',
      path: '/admin/configs',
      label: 'Cấu hình tham số hệ thống',
      icon: 'tune',
    },
    {
      id: 'audit',
      path: '/admin/audit-logs',
      label: 'Nhật ký kiểm toán (Audit)',
      icon: 'history',
    },
  ];

  const isItemActive = (item) => {
    if (activeTab) {
      if (activeTab === item.id) return true;
    }
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <>
      {/* Overlay backdrop cho Mobile Drawer */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Unified Sidebar */}
      <aside
        id="admin-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-[#DDE5D9] flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } shadow-[1px_0_10px_rgba(0,0,0,0.02)] select-none`}
      >
        {/* Top: Logo & Branding */}
        <div>
          <div className="h-20 px-6 flex items-center justify-between border-b border-[#DDE5D9]">
            <Logo
              size="md"
              showText={true}
              to="/admin"
              subtitle="QUẢN TRỊ HỆ THỐNG"
            />

            {/* Nút đóng drawer trên Mobile */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-xl text-[#5B6776] hover:text-[#1F2A37] hover:bg-[#F6F9F4] transition-colors"
              title="Đóng thanh điều hướng"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 overflow-y-auto">
            {menuItems.map((item) => {
              const active = isItemActive(item);
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => {
                    if (onSelectTab) onSelectTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-normal transition-all duration-150 ${
                    active
                      ? 'bg-[#006B2C] text-white shadow-xs'
                      : 'text-[#5B6776] hover:bg-[#F0F5EE] hover:text-[#006B2C]'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] transition-colors ${
                      active ? 'text-white' : 'text-[#717971] group-hover:text-[#006B2C]'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Admin User Profile Card */}
        <div className="p-3 m-3 rounded-2xl bg-[#F6F9F4] border border-[#DDE5D9]">
          <div className="flex items-center justify-between gap-2">
            <Link
              to="/profile"
              onClick={onCloseMobile}
              className="flex items-center gap-2.5 truncate hover:opacity-85 transition-opacity min-w-0"
              title="Xem và chỉnh sửa hồ sơ"
            >
              <div className="w-9 h-9 rounded-xl bg-[#006B2C] text-white font-bold flex items-center justify-center text-xs shadow-xs overflow-hidden shrink-0">
                {user?.avatarUrl || user?.avatar ? (
                  <img
                    src={user.avatarUrl || user.avatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold truncate text-[#1F2A37] leading-tight">
                  {displayName}
                </span>
                <span className="text-[10px] text-[#5B6776] font-medium leading-tight truncate">
                  {displayEmail}
                </span>
              </div>
            </Link>

            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-[#717971] hover:text-[#D92D20] hover:bg-[#FFF5F5] transition-colors shrink-0"
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
