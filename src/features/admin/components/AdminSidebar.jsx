import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import Logo from '../../../components/common/Logo.jsx';

/**
 * Sidebar Quản trị hệ thống ReHome (Admin Unified Sidebar)
 * Đồng bộ 100% thiết kế với ModeratorLayout:
 * - Logo ReHome chuẩn (<Logo />) hỗ trợ chế độ thu gọn
 * - Nút thu gọn/mở rộng tròn nổi (chevron_left) đồng bộ GSAP
 * - 3 nhóm điều hướng rõ ràng, active #006B2C chữ trắng, hover bg-[#F6F9F4] text-[#006B2C]
 * - Chân sidebar: Cài đặt · Đăng xuất trên nền #F6F9F4
 */
export default function AdminSidebar({
  activeTab,
  onSelectTab,
  isMobileOpen = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
  sidebarRef,
  toggleIconRef,
}) {
  const location = useLocation();
  const { logout, loggingOut } = useAuth();

  const navGroups = [
    {
      label: 'Tổng quan & Tài chính',
      items: [
        {
          id: 'overview',
          path: '/admin',
          label: 'Tổng quan',
          icon: 'dashboard',
          exact: true,
        },
        {
          id: 'fund-ledger',
          path: '/admin/fund-ledger',
          label: 'Giao dịch',
          icon: 'account_balance_wallet',
        },
      ],
    },
    {
      label: 'Người dùng & Vận hành',
      items: [
        {
          id: 'accounts',
          path: '/admin/users',
          label: 'Quản lý tài khoản',
          icon: 'manage_accounts',
        },
        {
          id: 'moderators',
          path: '/admin/moderators',
          label: 'Quản lý nhân sự',
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
          id: 'violation-words',
          path: '/admin/violation-words',
          label: 'Quản lý từ ngữ vi phạm',
          icon: 'block',
        },
        {
          id: 'content-reviews',
          path: '/admin/content-reviews',
          label: 'Kiểm duyệt nội dung',
          icon: 'fact_check',
        },
      ],
    },
    {
      label: 'Gói thành viên & Hệ thống',
      items: [
        {
          id: 'membership-plans',
          path: '/admin/membership-plans',
          label: 'Cấu hình gói thành viên',
          icon: 'workspace_premium',
        },
        {
          id: 'membership-subscriptions',
          path: '/admin/membership-subscriptions',
          label: 'Danh sách thành viên',
          icon: 'card_membership',
        },
        {
          id: 'voucher-templates',
          path: '/admin/voucher-templates',
          label: 'Quản lý voucher',
          icon: 'confirmation_number',
        },
        {
          id: 'receipt-clause-templates',
          path: '/admin/receipt-clause-templates',
          label: 'Điều khoản biên nhận',
          icon: 'description',
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
          label: 'Nhật ký hệ thống',
          icon: 'history',
        },
      ],
    },
  ];

  const isItemActive = (item) => {
    if (activeTab && activeTab === item.id) return true;
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  return (
    <>
      {/* Overlay backdrop cho Mobile Drawer */}
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] lg:hidden"
        />
      )}

      {/* Main Unified Sidebar */}
      <aside
        id="admin-sidebar"
        ref={sidebarRef}
        className={`${isMobileOpen ? 'flex' : 'hidden'} lg:flex w-72 ${
          isCollapsed ? 'lg:w-20' : 'lg:w-72'
        } bg-surface border-r border-neutral flex-col fixed inset-y-0 left-0 z-40 shadow-sm select-none`}
      >
        {/* Nút thu gọn / mở rộng sidebar (Desktop) */}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            aria-expanded={!isCollapsed}
            title={isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
            className="hidden lg:flex absolute -right-3.5 top-5 w-7 h-7 rounded-full bg-surface border border-neutral shadow-sm items-center justify-center text-textSecondary hover:text-[#006B2C] hover:border-[#006B2C]/40 hover:bg-[#F6F9F4] transition-colors z-40 focus:outline-none focus:ring-2 focus:ring-[#006B2C]/30"
          >
            <span
              ref={toggleIconRef}
              aria-hidden="true"
              className="material-symbols-outlined text-[16px] leading-none"
            >
              chevron_left
            </span>
          </button>
        )}

        {/* Brand Header đồng bộ Moderator */}
        <div
          className={`h-16 flex items-center ${
            isCollapsed ? 'px-5 lg:justify-center lg:px-3' : 'justify-between px-5'
          } border-b border-neutral bg-surface shrink-0 overflow-hidden`}
        >
          <div className={isCollapsed ? 'lg:hidden' : ''}>
            <Logo size="sm" to="/admin" subtitle="Cổng quản trị hệ thống" />
          </div>
          {isCollapsed && (
            <div className="hidden lg:flex items-center justify-center">
              <Logo size="sm" showText={false} to="/admin" />
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav
          aria-label="Điều hướng quản trị"
          className={`flex-1 ${
            isCollapsed ? 'p-4 lg:px-2.5 lg:py-4' : 'p-4'
          } space-y-4 overflow-y-auto overflow-x-hidden`}
        >
          {navGroups.map((group, groupIndex) => (
            <div
              key={group.label}
              className={
                groupIndex > 0 && isCollapsed
                  ? 'lg:pt-3 lg:border-t lg:border-neutral/70 space-y-1'
                  : 'space-y-1'
              }
            >
              <p
                data-sidebar-label
                className={`px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-textSecondary/80 ${
                  isCollapsed ? 'lg:hidden' : ''
                }`}
              >
                {group.label}
              </p>
              {group.items.map((item) => {
                const active = isItemActive(item);
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    aria-current={active ? 'page' : undefined}
                    title={item.label}
                    onClick={() => {
                      if (onSelectTab) onSelectTab(item.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`group flex items-center min-h-[38px] ${
                      isCollapsed
                        ? 'lg:justify-center lg:px-0 px-3.5 py-2 text-xs'
                        : 'px-3.5 py-2 text-xs'
                    } rounded-xl font-semibold transition-all duration-150 ${
                      active
                        ? 'bg-[#006B2C] text-white shadow-sm'
                        : 'text-text hover:bg-[#F6F9F4] hover:text-[#006B2C]'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`material-symbols-outlined shrink-0 ${
                        isCollapsed ? 'text-[20px] mr-3 lg:mr-0' : 'text-[19px] mr-3'
                      } ${active ? 'text-white' : 'text-textSecondary group-hover:text-[#006B2C]'}`}
                    >
                      {item.icon}
                    </span>
                    <span
                      data-sidebar-label
                      className={`truncate ${isCollapsed ? 'lg:hidden' : ''}`}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Chân sidebar đồng bộ Moderator: Cài đặt · Đăng xuất */}
        <div
          className={`px-4 py-3.5 border-t border-neutral bg-[#F6F9F4] flex items-center ${
            isCollapsed ? 'lg:flex-col lg:gap-2.5 lg:px-2 gap-2' : 'gap-2'
          } text-[11px] text-textSecondary shrink-0`}
        >
          <Link
            to="/profile"
            title="Cài đặt"
            aria-label="Cài đặt"
            className="inline-flex items-center gap-1.5 hover:text-[#006B2C] hover:underline transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
              settings
            </span>
            <span data-sidebar-label className={isCollapsed ? 'lg:hidden' : ''}>
              Cài đặt
            </span>
          </Link>
          <span aria-hidden="true" className={isCollapsed ? 'lg:hidden' : ''}>
            ·
          </span>
          <button
            type="button"
            onClick={() => logout && logout()}
            disabled={loggingOut}
            title="Đăng xuất"
            aria-label="Đăng xuất"
            className="inline-flex items-center gap-1.5 hover:text-error hover:underline transition-colors disabled:opacity-50"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
              logout
            </span>
            <span data-sidebar-label className={isCollapsed ? 'lg:hidden' : ''}>
              {loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
