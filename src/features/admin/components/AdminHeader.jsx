import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';

/**
 * Header Quản trị hệ thống ReHome (Admin Unified Header)
 * Đồng nhất trên toàn bộ 6 trang Admin:
 * - Chiều cao chuẩn h-20, nền Surface #FFFFFF, viền Neutral #DDE5D9
 * - Breadcrumb / Tiêu đề trang cập nhật theo route
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
    await logout();
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
      className="h-20 bg-white border-b border-[#DDE5D9] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
    >
      {/* Trái: Nút mở Mobile Drawer & Breadcrumb / Tiêu đề */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl text-[#1F2A37] hover:bg-[#F6F9F4] hover:text-[#006B2C] transition-colors"
          title="Mở thanh điều hướng"
          aria-label="Mở menu"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-[#5B6776] uppercase tracking-wider hidden sm:inline shrink-0">
            Hệ thống
          </span>
          <span className="text-xs text-[#DDE5D9] hidden sm:inline shrink-0">/</span>
          <h1 className="text-base sm:text-lg font-bold text-[#1F2A37] font-heading truncate">
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
            className="flex items-center gap-2.5 sm:gap-3 p-1.5 pl-2.5 sm:pl-3 rounded-2xl hover:bg-[#F6F9F4] cursor-pointer transition-colors border border-transparent hover:border-[#DDE5D9] select-none"
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
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-[#1F2A37] leading-tight max-w-[140px] truncate">
                {displayName}
              </p>
              <p className="text-[11px] text-[#5B6776] font-medium leading-tight mt-0.5">
                Quản trị viên
              </p>
            </div>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#006B2C] text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs overflow-hidden shrink-0">
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

            <span
              className={`material-symbols-outlined text-[#5B6776] text-lg transition-transform duration-200 ${
                showDropdown ? 'rotate-180' : ''
              }`}
            >
              expand_more
            </span>
          </div>

          {/* Profile Dropdown Menu */}
          {showDropdown && (
            <div id="admin-account-dropdown" className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-[#DDE5D9] shadow-xl py-2 z-40 animate-fadeIn">
              <div className="px-4 py-2.5 border-b border-[#DDE5D9]/60">
                <p className="text-xs font-bold text-[#1F2A37] truncate">{displayName}</p>
                <p className="text-[11px] text-[#5B6776] truncate">{displayEmail}</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold bg-[#E8F5E9] text-[#006B2C] rounded-md font-mono">
                  {user?.authorities || 'ROLE_ADMIN'}
                </span>
              </div>

              <div className="py-1">
                <Link
                  to="/profile"
                  onClick={() => setShowDropdown(false)}
                  className="w-full px-4 py-2 text-left text-xs text-[#1F2A37] hover:bg-[#F6F9F4] hover:text-[#006B2C] flex items-center gap-2.5 transition-colors font-medium"
                >
                  <span className="material-symbols-outlined text-base text-[#5B6776]">manage_accounts</span>
                  <span>Hồ sơ cá nhân & Đổi mật khẩu</span>
                </Link>

              </div>

              <div className="border-t border-[#DDE5D9]/60 my-1"></div>

              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left text-xs text-[#D92D20] hover:bg-[#FFF5F5] flex items-center gap-2.5 font-semibold transition-colors"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                <span>Đăng xuất phiên làm việc</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
