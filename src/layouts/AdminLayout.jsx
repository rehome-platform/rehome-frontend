import React, { useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import AdminSidebar from '../features/admin/components/AdminSidebar.jsx';
import AdminHeader from '../features/admin/components/AdminHeader.jsx';
import '../features/moderator/styles/apiColors.css';

if (typeof gsap?.registerPlugin === 'function' && typeof useGSAP === 'function') {
  gsap.registerPlugin(useGSAP);
}
const useSafeGSAP = typeof useGSAP === 'function' ? useGSAP : () => {};

const SIDEBAR_STORAGE_KEY = 'admin_sidebar_collapsed';

function readInitialSidebarState() {
  try {
    return typeof window !== 'undefined' && window.localStorage?.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Shared Admin Layout (Khung bố cục chung toàn bộ Admin Dashboard)
 * Đồng bộ 100% với ModeratorLayout:
 * - Bảng màu Design Tokens (.moderator-api-colors, bg-background #F6F9F4, text-text #1F2A37)
 * - Sidebar thu gọn/mở rộng mượt bằng GSAP (288px ↔ 80px) lưu trạng thái localStorage
 * - Chiều cao Header: h-16 (64px) | Phông chữ: Be Vietnam Pro | Bo góc: 12px (rounded-xl)
 */
export default function AdminLayout({ children, title }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(readInitialSidebarState);

  const containerRef = useRef(null);
  const sidebarRef = useRef(null);
  const mainWrapperRef = useRef(null);
  const toggleIconRef = useRef(null);
  const hasMountedRef = useRef(false);

  // Lưu trữ log hoạt động phát sinh trong phiên làm việc
  const [dynamicLogs, setDynamicLogs] = useState(() => {
    try {
      const saved = sessionStorage.getItem('rehome_admin_dynamic_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleLogAction = (logEntry) => {
    setDynamicLogs((prev) => {
      const updated = [logEntry, ...prev];
      try {
        sessionStorage.setItem('rehome_admin_dynamic_logs', JSON.stringify(updated.slice(0, 50)));
      } catch {}
      return updated;
    });
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage?.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // Bỏ qua lỗi storage ở môi trường bị giới hạn
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

  return (
    <div
      ref={containerRef}
      className="moderator-api-colors min-h-screen flex bg-background text-text font-sans antialiased"
    >
      {/* Sidebar đồng bộ thiết kế Moderator */}
      <AdminSidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        sidebarRef={sidebarRef}
        toggleIconRef={toggleIconRef}
      />

      {/* Main Container Wrapper */}
      <div
        ref={mainWrapperRef}
        className={`${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'} flex-1 flex flex-col min-w-0`}
      >
        {/* Header thống nhất cho Admin */}
        <AdminHeader
          activeTitle={title}
          onOpenMobile={() => setIsMobileSidebarOpen(true)}
        />

        {/* Dynamic Main Body Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="w-full max-w-7xl mx-auto space-y-6 animate-fadeIn">
            {children || <Outlet context={{ dynamicLogs, onLogAction: handleLogAction }} />}
          </div>
        </main>
      </div>
    </div>
  );
}
