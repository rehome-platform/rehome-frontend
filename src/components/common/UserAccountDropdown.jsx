import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getRoleLabel, getRoleBadgeStyle } from '../../constants/roleLabels.js';

/**
 * Nút thông tin tài khoản & menu xổ xuống dùng chung cho AdminHeader và ModeratorLayout.
 * Đồng bộ chuẩn Design Tokens ReHome (#F6F9F4, #DDE5D9, #1F2A37, #5B6776, #006B2C, #D92D20).
 */
export default function UserAccountDropdown({
  user,
  logout,
  loggingOut = false,
  roleLabel,
  subtitle,
  dropdownId = 'account-dropdown',
  profilePath = '/profile',
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const resolvedRoleLabel = roleLabel || getRoleLabel(user?.role || user?.authorities);
  const displayName = user?.fullName || user?.name || user?.email || resolvedRoleLabel;
  const displaySubtitle = subtitle || user?.email || resolvedRoleLabel;
  const displayEmail = user?.email || displaySubtitle;
  const avatarSrc = user?.avatarUrl || user?.avatar;
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .slice(-2)
      .join('')
      .toUpperCase() || 'RH';

  const badgeStyle = getRoleBadgeStyle(user?.role || user?.authorities);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;
    setShowDropdown(false);
    if (logout) await logout();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => setShowDropdown((prev) => !prev)}
        className="flex items-center gap-2.5 p-1 pl-2.5 rounded-xl hover:bg-[#F6F9F4] cursor-pointer transition-colors border border-transparent hover:border-[#DDE5D9] select-none"
        role="button"
        aria-expanded={showDropdown}
        aria-controls={dropdownId}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShowDropdown((prev) => !prev);
          }
        }}
      >
        <div className="w-8 h-8 rounded-full bg-[#ECFDF3] text-[#006B2C] font-bold text-xs flex items-center justify-center shrink-0 border border-[#ABEFC6] overflow-hidden">
          {avatarSrc ? (
            <img src={avatarSrc} alt="Ảnh đại diện" className="w-full h-full object-cover" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-bold text-[#1F2A37] leading-tight truncate max-w-[140px]">
            {displayName}
          </p>
          <p className="text-[10px] text-[#5B6776] leading-tight truncate max-w-[140px]">
            {displaySubtitle}
          </p>
        </div>
        <span
          aria-hidden="true"
          className={`material-symbols-outlined text-[18px] text-[#5B6776] transition-transform duration-150 ${
            showDropdown ? 'rotate-180' : ''
          }`}
        >
          arrow_drop_down
        </span>
      </div>

      {showDropdown && (
        <div
          id={dropdownId}
          className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-elevated border border-[#DDE5D9] py-1 z-50 animate-fadeIn"
        >
          <div className="px-4 py-2.5 border-b border-[#DDE5D9]">
            <p className="text-xs font-bold text-[#1F2A37] truncate">{displayName}</p>
            <p className="text-[11px] text-[#5B6776] truncate">{displayEmail}</p>
            <div className="mt-1.5">
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeStyle}`}>
                {resolvedRoleLabel}
              </span>
            </div>
          </div>

          <div className="py-1">
            <Link
              to={profilePath}
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#1F2A37] hover:bg-[#F6F9F4] hover:text-[#006B2C] transition-colors"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-[#5B6776]">
                manage_accounts
              </span>
              <span>Hồ sơ cá nhân & Đổi mật khẩu</span>
            </Link>
          </div>

          <div className="border-t border-[#DDE5D9] my-1"></div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-[#D92D20] hover:bg-[#FEF3F2] transition-colors disabled:opacity-50"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              logout
            </span>
            <span>{loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
