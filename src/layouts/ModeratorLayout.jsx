import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Layout chuyên biệt dành cho Nhân viên Kho / Kiểm duyệt viên (Moderator)
 * Thao tác nghiệp vụ tại kho tập trung ReHome
 */
export default function ModeratorLayout({ children, apiColors = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [skuQuery, setSkuQuery] = useState('');
  const warehouseName = user?.warehouseName || user?.warehouse?.name || 'Chưa có thông tin kho';
  const searchParams = typeof URLSearchParams !== 'undefined' ? new URLSearchParams(location.search || '') : null;
  const queueType = searchParams ? searchParams.get('type') : null;
  const onPath = (...prefixes) =>
    prefixes.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`));

  // Điều hướng phẳng theo wireframe "Bảng điều khiển kho" (MA-04 / HQ-01).
  const navItems = [
    { to: '/moderator', label: 'Trang chủ kho', icon: 'dashboard', active: location.pathname === '/moderator' },
    {
      to: '/moderator/queue',
      label: 'Hàng đợi công việc',
      icon: 'pending_actions',
      active: onPath('/moderator/queue') && queueType !== 'INSPECTION',
    },
    { to: '/moderator/counter', label: 'Quầy tiếp nhận', icon: 'storefront', active: onPath('/moderator/counter') },
    {
      to: '/moderator/queue?type=INSPECTION',
      label: 'Kiểm định & nhập kho',
      icon: 'fact_check',
      active: (onPath('/moderator/queue') && queueType === 'INSPECTION') || onPath('/moderator/consignments'),
    },
    { to: '/moderator/inventory', label: 'Tồn kho', icon: 'inventory_2', active: onPath('/moderator/inventory', '/moderator/end-of-term') },
    { to: '/moderator/packing', label: 'Đóng gói đơn hàng', icon: 'package_2', active: onPath('/moderator/packing') },
    { to: '/moderator/returns', label: 'Yêu cầu trả hàng', icon: 'assignment_return', active: onPath('/moderator/returns') },
    { to: '/moderator/verifications', label: 'Hồ sơ tổ chức', icon: 'verified_user', active: onPath('/moderator/verifications') },
    { to: '/moderator/reports', label: 'Báo cáo vi phạm', icon: 'flag', active: onPath('/moderator/reports') },
    { to: '/moderator/categories', label: 'Danh mục & thương hiệu', icon: 'category', active: onPath('/moderator/categories') },
    { to: '/moderator/inbox', label: 'Hộp thư kho', icon: 'chat', active: onPath('/moderator/inbox') },
  ];
  const currentLabel = navItems.find((item) => item.active)?.label || 'Bảng điều khiển kho';
  const submitSearch = (event) => {
    event.preventDefault();
    const value = skuQuery.trim();
    if (value) navigate(`/moderator/inventory?sku=${encodeURIComponent(value)}`);
  };

  return (
    <div className={`${apiColors ? 'moderator-api-colors ' : ''}min-h-screen flex bg-[#F8FAF8] text-[#191C19] font-sans antialiased`}>
      {/* Sidebar Desktop */}
      {isMobileMenuOpen && <button aria-label="Đóng menu" className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />}
      <aside className={`${isMobileMenuOpen ? 'flex' : 'hidden'} lg:flex w-72 bg-white border-r border-[#E2E8E0] flex-col fixed inset-y-0 z-30 shadow-sm`}>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-[#E2E8E0] bg-white">
          <Link to="/moderator" className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#006B2C] text-white flex items-center justify-center font-bold font-heading text-lg shadow-sm">
              R
            </div>
            <div>
              <span className="text-base font-extrabold font-heading text-[#006B2C] tracking-tight block leading-tight">
                ReHome
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#717971] block leading-tight">
                Bảng điều khiển kho
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation list */}
        <nav aria-label="Điều hướng kho" className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={item.active ? 'page' : undefined}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                item.active
                  ? 'bg-[#006B2C] text-white shadow-sm'
                  : 'text-[#414942] hover:bg-[#F0F5EE] hover:text-[#006B2C]'
              }`}
            >
              <span aria-hidden="true" className={`material-symbols-outlined text-[20px] mr-3 ${item.active ? 'text-white' : 'text-[#717971]'}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Chân sidebar: Cài đặt · Đăng xuất (theo wireframe) */}
        <div className="px-4 py-3.5 border-t border-[#E2E8E0] bg-[#FAFCF9] flex items-center gap-2 text-[11px] text-[#5B6776]">
          <Link to="/profile" className="hover:text-[#006B2C] hover:underline">Cài đặt</Link>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={logout} className="hover:text-[#BA1A1A] hover:underline">Đăng xuất</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-72 flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-[#E2E8E0] px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center space-x-3 min-w-0">
            <button className="lg:hidden p-2 rounded-xl border border-neutral" aria-label="Mở menu" aria-expanded={isMobileMenuOpen} onClick={() => setIsMobileMenuOpen(value => !value)}>☰</button>
            <span className="text-sm font-semibold text-[#191C19] truncate">{warehouseName}</span>
            <span className="hidden sm:inline text-[11px] text-[#5B6776] truncate">{currentLabel}</span>
          </div>

          <div className="flex items-center space-x-3">
            <form onSubmit={submitSearch} role="search" className="hidden md:block">
              <input
                type="search"
                value={skuQuery}
                onChange={(event) => setSkuQuery(event.target.value)}
                aria-label="Tìm SKU trong kho"
                placeholder="Tìm SKU trong kho…"
                className="w-60 rounded-lg border border-[#E2E8E0] px-3 py-1.5 text-[11px] focus:border-[#006B2C] focus:outline-none focus:ring-2 focus:ring-[#006B2C]/20"
              />
            </form>
            <Link to="/profile" className="flex items-center space-x-2.5 hover:opacity-85 transition-opacity">
              <div className="w-[30px] h-[30px] rounded-full bg-[#006B2C]/10 text-[#006B2C] font-bold flex items-center justify-center text-xs border border-[#006B2C]/20 shrink-0 overflow-hidden">
                {user?.avatarUrl || user?.avatar ? (
                  <img src={user.avatarUrl || user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{(user?.fullName || user?.name || user?.email || 'M')[0].toUpperCase()}</span>
                )}
              </div>
              <div className="hidden sm:block leading-tight">
                <p className="text-[11px] font-semibold text-[#191C19]">{user?.fullName || user?.name || 'Nhân viên Kho'}</p>
                <p className="text-[10px] text-[#717971]">{user?.memberCode || user?.email || 'Moderator ReHome'}</p>
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
