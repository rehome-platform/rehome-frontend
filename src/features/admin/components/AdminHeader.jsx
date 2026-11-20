import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import UserAccountDropdown from '../../../components/common/UserAccountDropdown.jsx';
import { getRoleLabel } from '../../../constants/roleLabels.js';

/**
 * Header Quản trị hệ thống ReHome (Admin Unified Header)
 * Đồng bộ 100% với ModeratorLayout:
 * - Chiều cao h-16 (64px), nền bg-surface/95 backdrop-blur-sm, viền border-neutral/80
 * - Breadcrumb / Tiêu đề trang cập nhật tự động theo route
 * - Badge vai trò Quản trị viên chuẩn tiếng Việt & Design Tokens
 * - Menu tài khoản dùng chung UserAccountDropdown
 */
export default function AdminHeader({ activeTitle, onOpenMobile }) {
  const location = useLocation();
  const { user, logout, loggingOut } = useAuth();

  const getAutoTitle = () => {
    if (activeTitle) return activeTitle;
    const path = location.pathname;
    if (path.startsWith('/admin/fund-ledger')) return 'Giao dịch';
    if (path.startsWith('/admin/users')) return 'Quản lý tài khoản';
    if (path.startsWith('/admin/moderators')) return 'Quản lý nhân sự';
    if (path.startsWith('/admin/ban-proposals')) return 'Đề xuất khóa tài khoản';
    if (path.startsWith('/admin/warehouses')) return 'Quản lý điểm kí gửi ReHome';
    if (path.startsWith('/admin/configs')) return 'Cấu hình tham số hệ thống';
    if (path.startsWith('/admin/audit-logs')) return 'Nhật ký hệ thống';
    if (path.startsWith('/admin/violation-words')) return 'Quản lý từ ngữ vi phạm';
    if (path.startsWith('/admin/membership-plans')) return 'Cấu hình gói thành viên';
    if (/^\/admin\/membership-subscriptions\/.+/.test(path)) return 'Chi tiết gói thành viên';
    if (path.startsWith('/admin/membership-subscriptions')) return 'Danh sách thành viên';
    if (path.startsWith('/admin/voucher-templates')) return 'Quản lý voucher';
    if (path.startsWith('/admin/receipt-clause-templates')) return 'Điều khoản biên nhận';
    return 'Tổng quan điều hành';
  };

  const currentTitle = getAutoTitle();
  const roleLabel = getRoleLabel(user?.role || 'ADMIN');

  return (
    <header
      id="admin-header"
      className="h-16 bg-surface/95 backdrop-blur-sm border-b border-neutral/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
    >
      {/* Trái: Nút mở Mobile Drawer & Breadcrumb / Tiêu đề */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl border border-neutral text-text hover:bg-[#F6F9F4] hover:text-[#006B2C] transition-colors"
          title="Mở thanh điều hướng"
          aria-label="Mở menu"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-xl leading-none block">
            menu
          </span>
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-semibold text-textSecondary tracking-wider hidden sm:inline shrink-0">
            Hệ thống
          </span>
          <span className="text-xs text-neutral hidden sm:inline shrink-0">/</span>
          <h1 className="text-sm sm:text-base font-bold text-text font-heading truncate">
            {currentTitle}
          </h1>
        </div>
      </div>

      {/* Phải: Badge vai trò & Menu tài khoản dùng chung */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#ECFDF3] text-[#006B2C] border border-[#ABEFC6] select-none">
          <span className="w-2 h-2 rounded-full bg-[#006B2C]"></span>
          <span>{roleLabel}</span>
        </div>

        <UserAccountDropdown
          user={user}
          logout={logout}
          loggingOut={loggingOut}
          roleLabel={roleLabel}
          subtitle={user?.email || 'admin@rehome.vn'}
          dropdownId="admin-account-dropdown"
        />
      </div>
    </header>
  );
}
