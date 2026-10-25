import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
import Dropdown from './common/Dropdown.jsx';
import Logo from './common/Logo.jsx';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useNotification();
  const navigate = useNavigate();

  const isAdmin = user?.role === 'admin';

  const userMenuItems = [
    {
      label: 'Há»“ sÆ¡ cÃ¡ nhÃ¢n & TÃ i khoáº£n',
      icon: 'person',
      onClick: () => navigate('/profile'),
    },
    {
      label: 'Äá»•i máº­t kháº©u',
      icon: 'lock_reset',
      onClick: () => navigate('/profile'),
    },
    { divider: true },
    ...(isAdmin
      ? [
          {
            label: 'Cá»•ng Quáº£n trá»‹ Admin',
            icon: 'admin_panel_settings',
            onClick: () => navigate('/admin'),
          },
        ]
      : [
          {
            label: 'Cá»•ng Váº­n hÃ nh Kho (Moderator)',
            icon: 'warehouse',
            onClick: () => navigate('/moderator/counter'),
          },
        ]),
    { divider: true },
    {
      label: 'ÄÄƒng xuáº¥t',
      icon: 'logout',
      danger: true,
      onClick: logout,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-[#DDE5D9] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo theo Design tokens */}
        <div className="flex items-center space-x-8">
          <Logo size="md" showText={true} to="/" />
          
          <nav className="hidden md:flex items-center space-x-6 text-xs font-semibold text-[#5B6776]">
            {(!isAuthenticated || !isAdmin) && (
              <Link
                to="/moderator/counter"
                className="hover:text-[#006B2C] transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">warehouse</span>
                <span>Kho & Kiá»ƒm Ä‘á»‹nh</span>
              </Link>
            )}
            {(!isAuthenticated || isAdmin) && (
              <Link
                to="/admin"
                className="hover:text-[#006B2C] transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">monitoring</span>
                <span>Quáº£n trá»‹ & Quá»¹</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {isAuthenticated ? (
            <>
              {/* Role badge */}
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-[#DDE5D9] bg-[#F6F9F4]">
                {isAdmin ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#00685F]"></span>
                    <span className="text-[#00685F]">Quáº£n trá»‹ viÃªn (Admin)</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-[#006B2C]"></span>
                    <span className="text-[#006B2C]">
                      {user?.memberCode ? `${user.memberCode} â€¢ Moderator` : 'NhÃ¢n viÃªn Kho (Mod)'}
                    </span>
                  </>
                )}
              </div>

              {/* Notification icon */}
              <button
                className="relative p-2 text-[#5B6776] hover:text-[#006B2C] hover:bg-[#F6F9F4] rounded-xl transition-colors"
                aria-label="ThÃ´ng bÃ¡o"
                onClick={() => navigate('/notifications')}
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#D92D20] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* User Dropdown */}
              <Dropdown
                trigger={
                  <button className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-[#F6F9F4] transition-colors border border-transparent hover:border-[#DDE5D9]">
                    <img
                      src={user?.avatarUrl || user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                      alt="Avatar"
                      className="w-8 h-8 rounded-lg object-cover border border-[#006B2C]/20"
                    />
                    <div className="text-left hidden sm:block">
                      <div className="text-xs font-bold text-[#1F2A37] max-w-[120px] truncate leading-tight">
                        {user?.fullName || user?.name || user?.email || 'NhÃ¢n sá»±'}
                      </div>
                      <div className="text-[10px] text-[#5B6776] leading-tight">
                        {isAdmin ? 'Quáº£n trá»‹ viÃªn' : 'NhÃ¢n viÃªn kho'}
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-sm text-[#5B6776]">expand_more</span>
                  </button>
                }
                items={userMenuItems}
              />
            </>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 text-xs font-bold rounded-xl bg-[#006B2C] text-white hover:bg-[#005523] shadow-sm transition-all"
            >
              ÄÄƒng nháº­p nhÃ¢n sá»±
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
