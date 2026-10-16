import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';

/**
 * Header thanh điều khiển Quản trị hệ thống
 * Thiết kế chính xác theo Google Stitch:
 * Hiển thị Profile: Trần Minh Quân - Quản trị viên
 */
export default function AdminHeader({ activeTitle, onOpenMobile }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user?.fullName || user?.name || user?.email || 'Quản trị viên';
  const displayEmail = user?.email || '';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(-2)
    .join('')
    .toUpperCase() || 'AD';

  return (
    <header className="h-20 bg-white border-b border-[#DDE5D9] px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl text-[#414942] hover:bg-[#F6F9F4] hover:text-[#006B2C] transition-colors"
          title="Mở thanh điều hướng"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#717971] uppercase tracking-wider hidden sm:inline">
            Hệ thống
          </span>
          <span className="text-xs text-[#DDE5D9] hidden sm:inline">/</span>
          <h2 className="text-base sm:text-lg font-bold text-[#191C19] font-heading">
            {activeTitle}
          </h2>
        </div>
      </div>

      {/* Right: Admin Profile */}
      <div className="relative">
        <div
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-3 p-1.5 pl-3 rounded-2xl hover:bg-[#F6F9F4] cursor-pointer transition-colors border border-transparent hover:border-[#DDE5D9]"
        >
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-[#191C19] leading-tight">
              {displayName}
            </p>
            <p className="text-[11px] text-[#717971] font-medium leading-tight mt-0.5">
              Quản trị viên (Admin)
            </p>
          </div>

          <div className="w-10 h-10 rounded-xl bg-[#006B2C] text-white flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden">
            {user?.avatarUrl || user?.avatar ? (
              <img src={user.avatarUrl || user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          <span className="material-symbols-outlined text-[#717971] text-lg">
            expand_more
          </span>
        </div>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div
            className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-[#DDE5D9] shadow-lg py-2 z-40 animate-fadeIn"
            onMouseLeave={() => setShowDropdown(false)}
          >
            <div className="px-4 py-2.5 border-b border-[#DDE5D9]/60">
              <p className="text-xs font-bold text-[#191C19] truncate">{displayName}</p>
              <p className="text-[11px] text-[#717971] truncate">{displayEmail}</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold bg-[#E8F5E9] text-[#006B2C] rounded-md font-mono">
                {user?.authorities || 'ROLE_ADMIN'}
              </span>
            </div>

            <button
              onClick={() => {
                setShowDropdown(false);
                navigate('/profile');
              }}
              className="w-full px-4 py-2 text-left text-xs text-[#414942] hover:bg-[#F6F9F4] flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">manage_accounts</span>
              <span>Hồ sơ cá nhân & Đổi mật khẩu</span>
            </button>

            <button
              onClick={() => {
                setShowDropdown(false);
                navigate('/login');
              }}
              className="w-full px-4 py-2 text-left text-xs text-[#414942] hover:bg-[#F6F9F4] flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">switch_account</span>
              <span>Đổi tài khoản đăng nhập</span>
            </button>

            <button
              onClick={() => {
                setShowDropdown(false);
                navigate('/');
              }}
              className="w-full px-4 py-2 text-left text-xs text-[#414942] hover:bg-[#F6F9F4] flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">home</span>
              <span>Về cổng thông tin chung</span>
            </button>

            <div className="border-t border-[#DDE5D9]/60 my-1"></div>

            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-xs text-[#DC2626] hover:bg-[#FEE2E2]/40 flex items-center gap-2 font-medium"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span>Đăng xuất</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
