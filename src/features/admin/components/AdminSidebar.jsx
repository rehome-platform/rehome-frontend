import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';

/**
 * Sidebar Quản trị hệ thống ReHome (Admin Unified Sidebar)
 * Đồng bộ chuẩn 100% với Moderator Sidebar:
 * - Độ rộng chuẩn: w-72 (288px) | Nền: Surface #FFFFFF | Viền: Neutral #E2E8E0
 * - Trạng thái đang chọn (Active): Primary #006B2C với chữ trắng và shadow-sm
 * - Trạng thái bình thường: Text #414942 hover bg-[#F0F5EE] text-[#006B2C]
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
      id: 'ban-proposals',
      path: '/admin/ban-proposals',
      label: 'Đề xuất khóa tài khoản',
      icon: 'gavel',
    },
    {
      id: 'warehouses',
      path: '/admin/warehouses',
      label: 'Quản lý điểm kí gửi',
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

  const membershipMenuItems = [
    {
      id: 'membership-plans',
      path: '/admin/membership-plans',
      label: 'Cấu hình gói VIP',
      icon: 'workspace_premium',
    },
    {
      id: 'membership-subscriptions',
      path: '/admin/membership-subscriptions',
      label: 'Thành viên VIP',
      icon: 'card_membership',
    },
    {
      id: 'voucher-templates',
      path: '/admin/voucher-templates',
      label: 'Mẫu voucher',
      icon: 'confirmation_number',
    },
    {
      id: 'membership-stats',
      path: '/admin/membership-stats',
      label: 'Thống kê VIP & Voucher',
      icon: 'analytics',
    },
    {
      id: 'membership-payments',
      path: '/admin/membership-payments',
      label: 'Lịch sử thanh toán gói',
      icon: 'receipt_long',
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

  const renderMenuItem = (item) => {
    const active = isItemActive(item);
    return (
      <Link
        key={item.id}
        to={item.path}
        onClick={() => {
          if (onSelectTab) onSelectTab(item.id);
          if (onCloseMobile) onCloseMobile();
        }}
        className={`flex items-center px-3.5 py-2.5 text-xs rounded-xl font-semibold transition-all duration-150 ${
          active
            ? 'bg-[#006B2C] text-white shadow-sm'
            : 'text-[#414942] hover:bg-[#F0F5EE] hover:text-[#006B2C]'
        }`}
      >
        <span
          className={`material-symbols-outlined text-[20px] mr-3 ${
            active ? 'text-white' : 'text-[#717971]'
          }`}
        >
          {item.icon}
        </span>
        <span>{item.label}</span>
      </Link>
    );
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
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-[#E2E8E0] flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } shadow-sm select-none`}
      >
        {/* Top: Brand Header đồng bộ Moderator */}
        <div>
          <div className="h-16 flex items-center justify-between px-6 border-b border-[#E2E8E0] bg-white">
            <Link to="/admin" className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#006B2C] text-white flex items-center justify-center font-bold font-heading text-lg shadow-sm">
                R
              </div>
              <div>
                <span className="text-base font-extrabold font-heading text-[#006B2C] tracking-tight block leading-tight">
                  ReHome
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-[#717971] block leading-tight">
                  Cổng Quản Trị Hệ Thống
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Items List */}
          <nav aria-label="Điều hướng quản trị" className="p-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-160px)]">
            {menuItems.map(renderMenuItem)}

            <div className="pt-3 mt-3 border-t border-[#E2E8E0]">
              <p className="px-3.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#717971]">
                Gói VIP &amp; Voucher
              </p>
              <div className="space-y-1.5">
                {membershipMenuItems.map(renderMenuItem)}
              </div>
            </div>
          </nav>
        </div>

        {/* Bottom: Profile & Logout */}
        <div className="p-4 border-t border-[#E2E8E0] bg-white">
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#F8FAF8] border border-[#E2E8E0]">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#E8F5E9] text-[#006B2C] font-bold text-xs flex items-center justify-center shrink-0 border border-[#C8E6C9]">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#191C19] truncate">{displayName}</p>
                <p className="text-[10px] text-[#717971] truncate">{displayEmail}</p>
              </div>
            </div>
            <button
              onClick={() => logout && logout()}
              title="Đăng xuất"
              className="p-1.5 text-[#717971] hover:text-[#BA1A1A] hover:bg-white rounded-lg transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
