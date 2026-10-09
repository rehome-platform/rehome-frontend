import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/AdminSidebar.jsx';
import AdminHeader from '../components/AdminHeader.jsx';
import AdminOverviewView from '../components/AdminOverviewView.jsx';
import AdminAccountsView from '../components/AdminAccountsView.jsx';
import AdminModeratorsView from '../components/AdminModeratorsView.jsx';
import AdminAuditLogsView from '../components/AdminAuditLogsView.jsx';

/**
 * Trang Quản Trị Hệ Thống ReHome (Admin Management System)
 * Tái hiện toàn diện thiết kế Google Stitch (Figma) Prototype:
 * - Tông màu chủ đạo: #006B2C | Màu nền: #F6F9F4 | Viền: #DDE5D9
 * - Phông chữ: Be Vietnam Pro
 * - Gồm 4 phân hệ cốt lõi: Tổng quan, Tài khoản, Moderator, Nhật ký hệ thống
 */
export default function AdminSystemPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Xác định tab hiện tại từ URL
  const getTabFromPath = (pathname) => {
    if (pathname.includes('/users')) return 'accounts';
    if (pathname.includes('/moderator')) return 'moderators';
    if (pathname.includes('/audit')) return 'audit';
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState(getTabFromPath(location.pathname));
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [dynamicLogs, setDynamicLogs] = useState([]);

  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname));
  }, [location.pathname]);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'overview') navigate('/admin');
    else if (tabId === 'accounts') navigate('/admin/users');
    else if (tabId === 'moderators') navigate('/admin/moderators');
    else if (tabId === 'audit') navigate('/admin/audit-logs');
  };

  const handleLogAction = (logEntry) => {
    setDynamicLogs((prev) => [logEntry, ...prev]);
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'accounts':
        return 'Quản lý Tài khoản';
      case 'moderators':
        return 'Quản lý Moderator';
      case 'audit':
        return 'Nhật ký kiểm toán hệ thống';
      default:
        return 'Tổng quan điều hành';
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9F4] flex flex-col antialiased">
      {/* Sidebar cố định */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Wrapper (lùi sang phải 64 = 256px trên màn hình lớn) */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <AdminHeader
          activeTitle={getPageTitle()}
          onOpenMobile={() => setIsMobileSidebarOpen(true)}
        />

        {/* Dynamic Main Body Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fadeIn">
          {activeTab === 'overview' && (
            <AdminOverviewView
              onNavigateToAudit={() => handleSelectTab('audit')}
            />
          )}

          {activeTab === 'accounts' && (
            <AdminAccountsView onLogAction={handleLogAction} />
          )}

          {activeTab === 'moderators' && (
            <AdminModeratorsView onLogAction={handleLogAction} />
          )}

          {activeTab === 'audit' && (
            <AdminAuditLogsView dynamicLogs={dynamicLogs} />
          )}
        </main>
      </div>
    </div>
  );
}
