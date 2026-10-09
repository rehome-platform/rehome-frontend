import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Sidebar Quản trị hệ thống ReHome
 * Thiết kế chính xác theo Google Stitch:
 * Nền: #006B2C | Chữ trắng/xanh nhạt | Phông: Be Vietnam Pro | Phiên bản v2.4.0
 */
export default function AdminSidebar({ activeTab, onSelectTab, isMobileOpen, onCloseMobile }) {
  const menuItems = [
    { id: 'overview', path: '/admin', label: 'Tổng quan', icon: 'grid_view' },
    { id: 'accounts', path: '/admin/users', label: 'Tài khoản', icon: 'group' },
    { id: 'moderators', path: '/admin/moderators', label: 'Moderator', icon: 'verified_user' },
    { id: 'audit', path: '/admin/audit-logs', label: 'Nhật ký hệ thống', icon: 'receipt_long' },
  ];

  return (
    <>
      {/* Overlay cho Mobile */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#006B2C] text-white flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } shadow-xl lg:shadow-none select-none`}
      >
        {/* Top: Logo & Branding */}
        <div>
          <div className="h-20 px-6 flex items-center justify-between border-b border-white/10">
            <Link
              to="/admin"
              onClick={() => onSelectTab('overview')}
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white backdrop-blur-sm group-hover:bg-white/25 transition-colors">
                <span className="material-symbols-outlined text-2xl font-light">eco</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight font-heading leading-tight">
                  ReHome
                </span>
                <span className="text-[10px] font-semibold tracking-[0.14em] text-white/75 uppercase">
                  QUẢN TRỊ HỆ THỐNG
                </span>
              </div>
            </Link>

            {/* Close button for mobile */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* Nav List */}
          <nav className="p-4 space-y-1.5 mt-2">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`sidebar-nav-${item.id}`}
                  onClick={() => {
                    onSelectTab(item.id);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 text-left ${
                    isActive
                      ? 'bg-white/20 text-white font-semibold shadow-inner'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className={`material-symbols-outlined text-xl ${isActive ? 'text-white' : 'text-white/70'}`}>
                    {item.icon}
                  </span>
                  <span className="tracking-wide">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom: Version info */}
        <div className="p-5 border-t border-white/10">
          <div className="flex items-center justify-between text-xs text-white/60">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Phiên bản v2.4.0</span>
            </span>
            <Link
              to="/"
              className="text-white/70 hover:text-white hover:underline text-[11px]"
              title="Về cổng chính ReHome"
            >
              Cổng chính ↗
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
