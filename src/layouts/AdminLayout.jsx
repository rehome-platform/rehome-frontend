import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../features/admin/components/AdminSidebar.jsx';
import AdminHeader from '../features/admin/components/AdminHeader.jsx';

/**
 * Shared Admin Layout (Khung bố cục chung toàn bộ Admin Dashboard)
 * Thống nhất 100% trên toàn bộ 6 trang Admin:
 * 1. Tổng quan & Quỹ nền tảng (/admin)
 * 2. Quản lý tài khoản (/admin/users)
 * 3. Quản lý Moderator (/admin/moderators)
 * 4. Quản lý chi nhánh kho (/admin/warehouses)
 * 5. Cấu hình tham số hệ thống (/admin/configs)
 * 6. Nhật ký kiểm toán (Audit) (/admin/audit-logs)
 *
 * Tuân thủ ReHome Design Tokens:
 * - Nền toàn trang: Background #F6F9F4
 * - Header & Sidebar: Surface #FFFFFF | Viền: Neutral #DDE5D9
 * - Phông chữ: Be Vietnam Pro | Khoảng cách: 4, 8, 12, 16, 24, 32px
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
    <div className="min-h-screen bg-[#F6F9F4] text-[#1F2A37] font-sans antialiased flex flex-col">
      {/* Sidebar thống nhất cho Admin */}
      <AdminSidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Container Wrapper */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
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
