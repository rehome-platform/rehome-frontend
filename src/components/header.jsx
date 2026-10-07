import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
import Dropdown from './common/Dropdown.jsx';
import Badge from './common/Badge.jsx';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useNotification();
  const navigate = useNavigate();

  const userMenuItems = [
    { label: 'Hồ sơ cá nhân', onClick: () => navigate('/profile') },
    { label: 'Ví & Tài chính', onClick: () => navigate('/wallet') },
    { label: 'Đăng xuất', onClick: logout },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-surface-container-lowest/95 backdrop-blur border-b border-outline-variant">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-6">
          <Link to="/" className="flex items-center space-x-2">
            <span className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg shadow-sm">
              R
            </span>
            <span className="text-xl font-bold font-heading text-primary">ReHome</span>
          </Link>
          <nav className="hidden md:flex space-x-6 text-sm font-medium text-on-surface-variant">
            <Link to="/shop" className="hover:text-primary transition-colors">Cửa hàng ký gửi</Link>
            <Link to="/organizer" className="hover:text-primary transition-colors">Tổ chức từ thiện</Link>
            <Link to="/orders" className="hover:text-primary transition-colors">Đơn hàng</Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              {/* Notification icon */}
              <button
                className="relative p-2 text-outline hover:text-on-surface hover:bg-surface-container rounded-full transition-colors"
                aria-label="Thông báo"
                onClick={() => navigate('/notifications')}
              >
                <span className="material-symbols-outlined text-2xl">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* User Dropdown */}
              <Dropdown
                trigger={
                  <button className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-surface-container transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center font-semibold text-xs">
                      {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden sm:inline text-sm font-medium text-on-surface">
                      {user?.name || user?.email || 'Tài khoản'}
                    </span>
                  </button>
                }
                items={userMenuItems}
              />
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-primary hover:bg-surface-container rounded-lg transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-container rounded-lg shadow-sm transition-colors"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
