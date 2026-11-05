import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../features/admin/components/AdminSidebar.jsx';
import AdminHeader from '../features/admin/components/AdminHeader.jsx';

/**
 * Shared Admin Layout (Khung bố cục chung toàn bộ Admin Dashboard)
 * Đồng bộ 100% với Moderator Portal:
 * - Nền toàn trang: Surface #F8FAF8 | Màu chữ chính: #191C19
 * - Header & Sidebar: Surface #FFFFFF | Viền: Neutral #E2E8E0
 * - Độ rộng Sidebar: w-72 (288px) | Chiều cao Header: h-16 (64px)
 * - Phông chữ: Be Vietnam Pro | Bo góc: 12px (rounded-xl)
 */
export default function AdminLayout({ children, title }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#F8FAF8] text-[#191C19] font-sans antialiased flex flex-col">
      {/* Sidebar thống nhất cho Admin */}
      <AdminSidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Container Wrapper */}
      <div className="lg:pl-72 flex-1 flex flex-col min-w-0">
        {/* Header thống nhất cho Admin */}
        <AdminHeader
          activeTitle={title}
          onOpenMobile={() => setIsMobileSidebarOpen(true)}
        />

        {/* Dynamic Main Body Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fadeIn">
          {children || <Outlet context={{ dynamicLogs, onLogAction: handleLogAction }} />}
        </main>
      </div>
    </div>
  );
}
