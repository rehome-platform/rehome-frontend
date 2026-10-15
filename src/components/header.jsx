import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
import Dropdown from './common/Dropdown.jsx';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useNotification();
  const navigate = useNavigate();

  const userMenuItems = [
    {
      label: 'Cổng Quản trị Admin',
      onClick: () => navigate('/admin'),
    },
    {
      label: 'Cổng Vận hành Kho (Moderator)',
      onClick: () => navigate('/moderator/counter'),
    },
    { label: 'Đăng xuất', onClick: logout },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-sm border-b border-[#DDE5D9] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-8">
          <Link to="/" className="flex items-center space-x-2.5">
            <span className="w-9 h-9 rounded-xl bg-[#006B2C] flex items-center justify-center text-white font-bold font-heading text-lg shadow-sm">
              R
            </span>
            <span className="text-xl font-black font-heading text-[#006B2C] tracking-tight">ReHome</span>
          </Link>
          <nav className="hidden md:flex space-x-6 text-xs font-semibold text-[#414942]">
            <Link to="/moderator/counter" className="hover:text-[#006B2C] transition-colors">
              Kho & Kiểm định (Moderator)
            </Link>
            <Link to="/admin" className="hover:text-[#006B2C] transition-colors">
              Quản trị & Quỹ nền tảng (Admin)
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              {/* Notification icon */}
              <button
                className="relative p-2 text-[#717971] hover:text-[#006B2C] hover:bg-[#F0F5EE] rounded-xl transition-colors"
                aria-label="Thông báo"
                onClick={() => navigate('/notifications')}
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-[#BA1A1A] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* User Dropdown */}
              <Dropdown
                trigger={
                  <button className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-[#F0F5EE] transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[#006B2C] text-white flex items-center justify-center font-bold text-xs">
                      {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'A'}
                    </div>
                    <span className="text-xs font-bold text-[#191C19] hidden sm:inline-block">
                      {user?.name || user?.email || 'Nhân sự ReHome'}
                    </span>
                    <span className="material-symbols-outlined text-sm text-[#717971]">expand_more</span>
                  </button>
                }
                items={userMenuItems}
              />
            </>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[#006B2C] text-white hover:bg-[#005221] shadow-xs transition-colors"
            >
              Đăng nhập nhân sự
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
