import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';

/**
 * Header Quản trị hệ thống ReHome (Admin Unified Header)
 * Đồng bộ chuẩn 100% với Moderator Header:
 * - Chiều cao chuẩn h-16 (64px), nền Surface #FFFFFF, viền Neutral #E2E8E0
 * - Breadcrumb / Tiêu đề trang cập nhật tự động theo route
 * - Badge vai trò Quản trị viên (Admin) chuẩn Design tokens
 * - User Profile menu với avatar, thông tin và chức năng đăng xuất
 */
export default function AdminHeader({ activeTitle, onOpenMobile }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    setShowDropdown(false);
    if (logout) await logout();
  };

  const displayName = user?.fullName || user?.name || user?.email || 'Quản trị viên';
  const displayEmail = user?.email || 'admin@rehome.vn';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase() || 'AD';

  // Xác định tiêu đề trang tự động dựa trên URL nếu không truyền prop activeTitle
  const getAutoTitle = () => {
    if (activeTitle) return activeTitle;
    const path = location.pathname;
    if (path.startsWith('/admin/users')) return 'Quản lý Tài khoản (Member & Tổ chức)';
    if (path.startsWith('/admin/moderators')) return 'Quản lý Nhân sự Moderator';
    if (path.startsWith('/admin/warehouses')) return 'Quản lý Điểm kí gửi ReHome';
    if (path.startsWith('/admin/violation-words')) return 'Thư viện Từ vựng Vi phạm';
    if (path.startsWith('/admin/configs')) return 'Cấu hình Tham số Hệ thống';
    if (path.startsWith('/admin/audit-logs')) return 'Nhật ký kiểm toán hệ thống (Audit Log)';
    return 'Tổng quan điều hành & Quỹ nền tảng';
  };

  const currentTitle = getAutoTitle();

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header
      id="admin-header"
      className="h-16 bg-white border-b border-[#E2E8E0] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs"
    >
      {/* Trái: Nút mở Mobile Drawer & Breadcrumb / Tiêu đề */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-1.5 rounded-lg text-[#191C19] hover:bg-[#F0F5EE] hover:text-[#006B2C] transition-colors"
          title="Mở thanh điều hướng"
          aria-label="Mở menu"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-semibold text-[#717971] uppercase tracking-wider hidden sm:inline shrink-0">
            Hệ thống
          </span>
          <span className="text-xs text-[#E2E8E0] hidden sm:inline shrink-0">/</span>
          <h1 className="text-sm sm:text-base font-bold text-[#191C19] font-heading truncate">
            {currentTitle}
          </h1>
        </div>
      </div>

      {/* Phải: Badge Role & Admin Profile Dropdown */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Pill Badge vai trò Quản trị viên */}
        <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F5E9] text-[#006B2C] border border-[#C8E6C9] select-none">
          <span className="w-2 h-2 rounded-full bg-[#006B2C]"></span>
          <span>Quản trị viên (Admin)</span>
        </div>

        {/* User Profile trigger & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <div
            onClick={() => setShowDropdown((prev) => !prev)}
            className="flex items-center gap-2.5 p-1 pl-2.5 rounded-xl hover:bg-[#F8FAF8] cursor-pointer transition-colors border border-transparent hover:border-[#E2E8E0] select-none"
            role="button"
            aria-expanded={showDropdown}
            aria-controls="admin-account-dropdown"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowDropdown((prev) => !prev);
              }
            }}
          >
            <div className="w-8 h-8 rounded-full bg-[#E8F5E9] text-[#006B2C] font-bold text-xs flex items-center justify-center shrink-0 border border-[#C8E6C9]">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-[#191C19] leading-tight truncate max-w-[130px]">
                {displayName}
              </p>
              <p className="text-[10px] text-[#717971] leading-tight truncate max-w-[130px]">
                {displayEmail}
              </p>
            </div>
            <span className="material-symbols-outlined text-[18px] text-[#717971]">
              arrow_drop_down
            </span>
          </div>

          {showDropdown && (
            <div
              id="admin-account-dropdown"
              className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-[#E2E8E0] py-1 z-50 animate-fadeIn"
            >
              <div className="px-4 py-2.5 border-b border-[#E2E8E0]">
                <p className="text-xs font-bold text-[#191C19] truncate">{displayName}</p>
                <p className="text-[11px] text-[#717971] truncate">{displayEmail}</p>
                <div className="mt-1.5">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8F5E9] text-[#006B2C] border border-[#A5D6A7]">
                    ROLE_ADMIN
                  </span>
                </div>
              </div>

              <div className="py-1">
                <Link
                  to="/profile"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs text-[#191C19] hover:bg-[#F0F5EE] hover:text-[#006B2C]"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#717971]">manage_accounts</span>
                  <span>Hồ sơ cá nhân & Đổi mật khẩu</span>
                </Link>
              </div>

              <div className="border-t border-[#E2E8E0] my-1"></div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#BA1A1A] hover:bg-[#FEE4E2] transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span>Đăng xuất</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
