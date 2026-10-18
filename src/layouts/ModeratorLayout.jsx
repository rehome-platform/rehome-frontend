import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Layout chuyên biệt dành cho Nhân viên Kho / Kiểm duyệt viên (Moderator)
 * Thao tác nghiệp vụ tại kho tập trung ReHome
 */
export default function ModeratorLayout({ children }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const warehouseName = user?.warehouseName || user?.warehouse?.name || 'Chưa có thông tin kho';

  const navSections = [
    {
      group: 'Vận hành tại kho',
      items: [
        { path: '/moderator/counter', label: 'Quầy tiếp nhận & Kiểm định', icon: 'storefront', badge: null },
        { path: '/moderator/queue', label: 'Hàng đợi ký gửi', icon: 'pending_actions', badge: null },
        { path: '/moderator/inventory', label: 'Quản lý kho & Tồn kho', icon: 'inventory_2', badge: null },
        { path: '/moderator/end-of-term', label: 'Xử lý cuối kỳ', icon: 'event_repeat', badge: null },
        { path: '/moderator/packing', label: 'Đóng gói & Tạo vận đơn GHN', icon: 'package_2', badge: '5' },
        { path: '/moderator/returns', label: 'Xử lý hàng trả & Nghi giả', icon: 'assignment_return', badge: '2' },
      ],
    },
    {
      group: 'Kiểm duyệt & Đối tác',
      items: [
        { path: '/moderator/verifications', label: 'Xác minh hồ sơ tổ chức', icon: 'verified_user', badge: '3' },
        { path: '/moderator/reports', label: 'Báo cáo vi phạm cộng đồng', icon: 'flag', badge: '4' },
        { path: '/moderator/categories', label: 'Danh mục & Thương hiệu', icon: 'category', badge: null },
        { path: '/moderator/inbox', label: 'Hộp thư hỗ trợ kho', icon: 'chat', badge: null },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex bg-[#F8FAF8] text-[#191C19] font-sans antialiased">
      {/* Sidebar Desktop */}
      {isMobileMenuOpen && <button aria-label="Đóng menu" className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
      <aside className={`${isMobileMenuOpen ? 'flex' : 'hidden'} lg:flex w-72 bg-white border-r border-[#E2E8E0] flex-col fixed inset-y-0 z-30 shadow-sm`}>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#E2E8E0] bg-white">
          <Link to="/moderator/counter" className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#006B2C] text-white flex items-center justify-center font-bold font-heading text-lg shadow-sm">
              R
            </div>
            <div>
              <span className="text-base font-extrabold font-heading text-[#006B2C] tracking-tight block leading-tight">
                ReHome Kho
              </span>
              <span className="text-[10px] font-medium text-[#717971] block leading-tight">
                Cổng Vận Hành Moderator
              </span>
            </div>
          </Link>
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#E8F5E9] text-[#006B2C] border border-[#C8E6C9]">
            {warehouseName}
          </span>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
          {navSections.map((sec, idx) => (
            <div key={idx} className="space-y-1.5">
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#717971]">
                {sec.group}
              </p>
              {sec.items.map((item) => {
                const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-[#006B2C] text-white shadow-sm'
                        : 'text-[#414942] hover:bg-[#F0F5EE] hover:text-[#006B2C]'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span aria-hidden="true" className={`material-symbols-outlined text-[20px] ${isActive ? 'text-white' : 'text-[#717971]'}`}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-[#FFF3E0] text-[#D97706] border border-[#FED7AA]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Current Moderator profile & Branch */}
        <div className="p-4 border-t border-[#E2E8E0] bg-[#FAFCF9]">
          <div className="flex items-center justify-between">
            <Link to="/profile" className="flex items-center space-x-3 truncate hover:opacity-85 transition-opacity">
              <div className="w-9 h-9 rounded-xl bg-[#006B2C]/10 text-[#006B2C] font-bold flex items-center justify-center text-sm border border-[#006B2C]/20 shrink-0 overflow-hidden">
                {user?.avatarUrl || user?.avatar ? (
                  <img src={user.avatarUrl || user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{(user?.fullName || user?.name || user?.email || 'M')[0].toUpperCase()}</span>
                )}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-[#191C19] truncate">{user?.fullName || user?.name || 'Nhân viên Kho'}</p>
                <p className="text-[10px] text-[#717971] truncate">
                  {user?.memberCode ? `${user.memberCode} • ` : ''}{user?.email || 'Moderator ReHome'}
                </p>
              </div>
            </Link>
            <button
              onClick={logout}
              aria-label="Đăng xuất"
              className="p-1.5 text-[#717971] hover:text-[#BA1A1A] hover:bg-white rounded-lg border border-transparent hover:border-[#E2E8E0] transition-colors ml-1 shrink-0"
              title="Đăng xuất"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-72 flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-[#E2E8E0] px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center space-x-3 min-w-0">
            <button className="lg:hidden p-2 rounded-xl border border-neutral" aria-label="Mở menu" aria-expanded={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(value => !value)}>☰</button>
            <div className="flex items-center space-x-2 text-xs text-[#717971]">
              <span className="truncate">{warehouseName}</span>
              <span>•</span>
              <span className="inline-flex items-center text-[#006B2C] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#006B2C] mr-1.5 animate-pulse"></span>
                Moderator
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/moderator/inbox"
              className="p-2 text-[#717971] hover:text-[#006B2C] hover:bg-[#F0F5EE] rounded-xl transition-colors relative"
              title="Hộp thư hỗ trợ kho"
            >
              <span className="material-symbols-outlined text-[20px]">chat</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#D97706] rounded-full"></span>
            </Link>
            <Link
              to="/"
              className="text-xs font-semibold text-[#006B2C] hover:underline"
            >
              Trang giới thiệu →
            </Link>
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          <nav aria-label="Đường dẫn" className="mb-4 flex flex-wrap gap-2 text-xs text-textSecondary"><Link to="/moderator/counter" className="hover:underline">Vận hành kho</Link><span>/</span><span>{navSections.flatMap(section => section.items).find(item => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`))?.label || 'Chi tiết ký gửi'}</span></nav>
          {children}
        </main>
      </div>
    </div>
  );
}
