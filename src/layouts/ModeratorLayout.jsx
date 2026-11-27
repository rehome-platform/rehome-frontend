import React, { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useAuth } from '../context/AuthContext.jsx';
import { NotificationBell } from '../components/notification/index.js';
import Logo from '../components/common/Logo.jsx';
import UserAccountDropdown from '../components/common/UserAccountDropdown.jsx';
import { getRoleLabel } from '../constants/roleLabels.js';
import { formatWarehouseDisplayName } from '../utils/formatters.js';

if (typeof gsap?.registerPlugin === 'function' && typeof useGSAP === 'function') {
  gsap.registerPlugin(useGSAP);
}
const useSafeGSAP = typeof useGSAP === 'function' ? useGSAP : () => {};

const SIDEBAR_STORAGE_KEY = 'moderator_sidebar_collapsed';

function readInitialSidebarState() {
  try {
    return typeof window !== 'undefined' && window.localStorage?.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Layout chuyên biệt dành cho Nhân viên Điểm kí gửi / Kiểm duyệt viên (Moderator)
 * Thao tác nghiệp vụ tại điểm kí gửi tập trung ReHome
 */
export default function ModeratorLayout({ children, apiColors = true }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, loggingOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(readInitialSidebarState);
  const [skuQuery, setSkuQuery] = useState('');

  const containerRef = useRef(null);
  const sidebarRef = useRef(null);
  const mainWrapperRef = useRef(null);
  const toggleIconRef = useRef(null);
  const hasMountedRef = useRef(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage?.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage errors in restricted environments
      }
      return next;
    });
  };

  useSafeGSAP(
    () => {
      const sidebarEl = sidebarRef.current;
      const mainEl = mainWrapperRef.current;
      const iconEl = toggleIconRef.current;
      if (!sidebarEl || !mainEl) return;

      const hasMatchMedia = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
      const targetWidth = isSidebarCollapsed ? 80 : 288;
      const initialMount = !hasMountedRef.current;
      hasMountedRef.current = true;

      if (!hasMatchMedia) {
        gsap.set(sidebarEl, { width: targetWidth });
        gsap.set(mainEl, { paddingLeft: targetWidth });
        return;
      }

      const mm = gsap.matchMedia();
      mm.add(
        {
          isDesktop: '(min-width: 1024px)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { isDesktop, reduceMotion } = context.conditions;
          const duration = initialMount || reduceMotion ? 0 : 0.32;

          if (isDesktop) {
            gsap.to(sidebarEl, {
              width: targetWidth,
              duration,
              ease: 'power3.out',
              overwrite: 'auto',
            });
            gsap.to(mainEl, {
              paddingLeft: targetWidth,
              duration,
              ease: 'power3.out',
              overwrite: 'auto',
            });
          } else {
            gsap.set(sidebarEl, { clearProps: 'width' });
            gsap.set(mainEl, { clearProps: 'paddingLeft' });
          }

          if (iconEl) {
            gsap.to(iconEl, {
              rotation: isSidebarCollapsed ? 180 : 0,
              duration: reduceMotion ? 0 : 0.25,
              ease: 'power2.out',
              overwrite: 'auto',
            });
          }

          const labelEls = sidebarEl.querySelectorAll('[data-sidebar-label]');
          if (labelEls.length > 0 && (!isDesktop || !isSidebarCollapsed)) {
            gsap.fromTo(
              labelEls,
              { autoAlpha: 0, x: -6 },
              {
                autoAlpha: 1,
                x: 0,
                duration: duration === 0 ? 0 : 0.22,
                delay: duration === 0 ? 0 : 0.06,
                ease: 'power2.out',
                overwrite: 'auto',
              }
            );
          }
        }
      );
    },
    { scope: containerRef, dependencies: [isSidebarCollapsed] }
  );
  const warehouseName = formatWarehouseDisplayName(user?.warehouseName || user?.warehouse?.name) || 'Chưa có thông tin điểm kí gửi';
  const onPath = (...prefixes) =>
    prefixes.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`));

  const navGroups = [
    {
      label: 'Vận hành điểm kí gửi',
      items: [
        { to: '/moderator', label: 'Trang chủ điểm kí gửi', icon: 'dashboard', active: location.pathname === '/moderator' },
        {
          to: '/moderator/queue',
          label: 'Hàng đợi công việc',
          icon: 'pending_actions',
          active: onPath('/moderator/queue'),
        },
        { to: '/moderator/counter', label: 'Quầy tiếp nhận', icon: 'storefront', active: onPath('/moderator/counter') },
        {
          to: '/moderator/consignments',
          label: 'Kiểm định & nhập kho',
          icon: 'fact_check',
          active: location.pathname === '/moderator/consignments' || (location.pathname.startsWith('/moderator/consignments/') && !location.pathname.includes('print-queue')),
        },
        {
          to: '/moderator/consignments/print-queue',
          label: 'Hàng đợi in tem',
          icon: 'print',
          subItem: true,
          active: onPath('/moderator/consignments/print-queue', '/moderator/print-queue'),
        },
        { to: '/moderator/inventory', label: 'Quản lý sản phẩm', icon: 'inventory_2', active: onPath('/moderator/inventory', '/moderator/end-of-term') },
      ],
    },
    {
      label: 'Đơn hàng & Hậu mãi',
      items: [
        { to: '/moderator/packing', label: 'Đóng gói đơn hàng', icon: 'package_2', active: onPath('/moderator/packing') },
        { to: '/moderator/returns', label: 'Yêu cầu trả hàng', icon: 'assignment_return', active: onPath('/moderator/returns') },
      ],
    },
    {
      label: 'Cộng đồng & Danh mục',
      items: [
        { to: '/moderator/donations', label: 'Quyên góp', icon: 'volunteer_activism', active: onPath('/moderator/donations') },
        { to: '/moderator/verifications', label: 'Hồ sơ tổ chức', icon: 'verified_user', active: onPath('/moderator/verifications') },
        { to: '/moderator/reports', label: 'Báo cáo vi phạm', icon: 'flag', active: onPath('/moderator/reports') },
        { to: '/moderator/categories', label: 'Danh mục & thương hiệu', icon: 'category', active: onPath('/moderator/categories') },
        { to: '/moderator/inbox', label: 'Hộp thư điểm kí gửi', icon: 'chat', active: onPath('/moderator/inbox') },
      ],
    },
  ];
  const navItems = navGroups.flatMap((group) => group.items);
  const currentLabel = navItems.find((item) => item.active)?.label || 'Bảng điều khiển điểm kí gửi';
  const submitSearch = (event) => {
    event.preventDefault();
    const value = skuQuery.trim();
    if (value) navigate(`/moderator/inventory?sku=${encodeURIComponent(value)}`);
  };

  return (
    <div ref={containerRef} className={`${apiColors ? 'moderator-api-colors ' : ''}min-h-screen flex bg-background text-text font-sans antialiased`}>
      {/* Sidebar Desktop & Mobile Drawer */}
      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        className={`${isMobileMenuOpen ? 'flex' : 'hidden'} lg:flex w-72 ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-72'} bg-surface border-r border-neutral flex-col fixed inset-y-0 z-40 shadow-sm`}
      >
        {/* Nút thu gọn / mở rộng sidebar (Desktop) */}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={isSidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          aria-expanded={!isSidebarCollapsed}
          title={isSidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          className="hidden lg:flex absolute -right-3.5 top-5 w-7 h-7 rounded-full bg-surface border border-neutral shadow-sm items-center justify-center text-textSecondary hover:text-[#006B2C] hover:border-[#006B2C]/40 hover:bg-[#F6F9F4] transition-colors z-40 focus:outline-none focus:ring-2 focus:ring-[#006B2C]/30"
        >
          <span ref={toggleIconRef} aria-hidden="true" className="material-symbols-outlined text-[16px] leading-none">
            chevron_left
          </span>
        </button>

        {/* Brand Header */}
        <div className={`h-16 flex items-center ${isSidebarCollapsed ? 'px-5 lg:justify-center lg:px-3' : 'justify-between px-5'} border-b border-neutral bg-surface shrink-0 overflow-hidden`}>
          <div className={isSidebarCollapsed ? 'lg:hidden' : ''}>
            <Logo size="sm" to="/moderator" subtitle="Bảng điều khiển điểm kí gửi" />
          </div>
          {isSidebarCollapsed && (
            <div className="hidden lg:flex items-center justify-center">
              <Logo size="sm" showText={false} to="/moderator" />
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav aria-label="Điều hướng điểm kí gửi" className={`flex-1 ${isSidebarCollapsed ? 'p-4 lg:px-2.5 lg:py-4' : 'p-4'} space-y-4 overflow-y-auto overflow-x-hidden`}>
          {navGroups.map((group, groupIndex) => (
            <div key={group.label} className={groupIndex > 0 && isSidebarCollapsed ? 'lg:pt-3 lg:border-t lg:border-neutral/70 space-y-1' : 'space-y-1'}>
              <p
                data-sidebar-label
                className={`px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-textSecondary/80 ${isSidebarCollapsed ? 'lg:hidden' : ''}`}
              >
                {group.label}
              </p>
              {group.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={item.active ? 'page' : undefined}
                  title={item.label}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`group flex items-center min-h-[38px] ${
                    isSidebarCollapsed
                      ? 'lg:justify-center lg:px-0 px-3.5 py-2 text-xs'
                      : item.subItem
                        ? 'pl-7 pr-3 py-1.5 text-[11px]'
                        : 'px-3.5 py-2 text-xs'
                  } rounded-xl font-semibold transition-all duration-150 ${
                    item.active
                      ? 'bg-[#006B2C] text-white shadow-sm'
                      : 'text-text hover:bg-[#F6F9F4] hover:text-[#006B2C]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`material-symbols-outlined shrink-0 ${
                      isSidebarCollapsed
                        ? 'text-[20px] mr-3 lg:mr-0'
                        : item.subItem
                          ? 'text-[17px] mr-2.5'
                          : 'text-[19px] mr-3'
                    } ${item.active ? 'text-white' : 'text-textSecondary group-hover:text-[#006B2C]'}`}
                  >
                    {item.icon}
                  </span>
                  <span
                    data-sidebar-label
                    className={`truncate ${isSidebarCollapsed ? 'lg:hidden' : ''}`}
                  >
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        {/* Chân sidebar: Cài đặt · Đăng xuất */}
        <div
          className={`px-4 py-3.5 border-t border-neutral bg-[#F6F9F4] flex items-center ${
            isSidebarCollapsed ? 'lg:flex-col lg:gap-2.5 lg:px-2 gap-2' : 'gap-2'
          } text-[11px] text-textSecondary shrink-0`}
        >
          <Link
            to="/profile"
            title="Cài đặt"
            aria-label="Cài đặt"
            className="inline-flex items-center gap-1.5 hover:text-[#006B2C] hover:underline transition-colors"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">settings</span>
            <span data-sidebar-label className={isSidebarCollapsed ? 'lg:hidden' : ''}>Cài đặt</span>
          </Link>
          <span aria-hidden="true" className={isSidebarCollapsed ? 'lg:hidden' : ''}>·</span>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            title="Đăng xuất"
            aria-label="Đăng xuất"
            className="inline-flex items-center gap-1.5 hover:text-error hover:underline transition-colors disabled:opacity-50"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">logout</span>
            <span data-sidebar-label className={isSidebarCollapsed ? 'lg:hidden' : ''}>
              {loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        ref={mainWrapperRef}
        className={`${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'} flex-1 flex flex-col min-w-0`}
      >
        <header className="h-16 bg-surface/95 backdrop-blur-sm border-b border-neutral/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center space-x-3 min-w-0">
            <button
              className="lg:hidden p-2 rounded-xl border border-neutral hover:bg-[#F6F9F4] transition-colors"
              aria-label="Mở menu"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((value) => !value)}
            >
              ☰
            </button>
            <div className="min-w-0">
              <span className="text-sm font-semibold text-text truncate block">{warehouseName}</span>
              <span className="hidden sm:block text-[11px] text-textSecondary truncate">{currentLabel}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <form onSubmit={submitSearch} role="search" className="hidden md:block relative">
              <span
                aria-hidden="true"
                className="material-symbols-outlined text-[16px] text-textSecondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              >
                search
              </span>
              <input
                type="search"
                value={skuQuery}
                onChange={(event) => setSkuQuery(event.target.value)}
                aria-label="Tìm Mã hàng hóa tại điểm kí gửi"
                placeholder="Tìm Mã hàng hóa tại điểm kí gửi…"
                className="w-60 rounded-xl border border-neutral bg-background/50 pl-8 pr-3 py-1.5 text-xs text-text placeholder:text-textSecondary focus:bg-surface focus:border-[#006B2C] focus:outline-none focus:ring-2 focus:ring-[#006B2C]/20 transition-colors"
              />
            </form>
            <NotificationBell userRole={user?.role} />
            <UserAccountDropdown
              user={user}
              logout={logout}
              loggingOut={loggingOut}
              roleLabel={getRoleLabel(user?.role || 'MODERATOR')}
              subtitle={user?.memberCode || user?.email || 'Nhân viên điểm kí gửi'}
              dropdownId="moderator-account-dropdown"
            />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="w-full max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
