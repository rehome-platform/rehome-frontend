import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '../../../layouts/AdminLayout.jsx';
import AdminOverviewView from '../components/AdminOverviewView.jsx';
import AdminAccountsView from '../components/AdminAccountsView.jsx';
import AdminModeratorsView from '../components/AdminModeratorsView.jsx';
import AdminWarehousesView from '../components/AdminWarehousesView.jsx';
import AdminAuditLogsView from '../components/AdminAuditLogsView.jsx';

/**
 * Trang Quản Trị Hệ Thống ReHome (Admin Management System)
 * Tương thích ngược với các đường dẫn /admin/system
 * Đồng bộ sử dụng chung AdminLayout chuẩn Design tokens
 */
export default function AdminSystemPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Xác định tab hiện tại từ URL
  const getTabFromPath = (pathname) => {
    if (pathname.includes('/users')) return 'accounts';
    if (pathname.includes('/moderators')) return 'moderators';
    if (pathname.includes('/warehouses')) return 'warehouses';
    if (pathname.includes('/audit')) return 'audit';
    return 'accounts';
  };

  const [activeTab, setActiveTab] = useState(getTabFromPath(location.pathname));
  const [dynamicLogs, setDynamicLogs] = useState(() => {
    try {
      const saved = sessionStorage.getItem('rehome_admin_dynamic_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname));
  }, [location.pathname]);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'overview') navigate('/admin');
    else if (tabId === 'accounts') navigate('/admin/users');
    else if (tabId === 'moderators') navigate('/admin/moderators');
    else if (tabId === 'warehouses') navigate('/admin/warehouses');
    else if (tabId === 'audit') navigate('/admin/audit-logs');
  };

  const handleLogAction = (logEntry) => {
    setDynamicLogs((prev) => {
      const updated = [logEntry, ...prev];
      try {
        sessionStorage.setItem('rehome_admin_dynamic_logs', JSON.stringify(updated.slice(0, 50)));
      } catch {}
      return updated;
    });
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'accounts':
        return 'Quản lý Tài khoản (Member & Tổ chức)';
      case 'moderators':
        return 'Quản lý Nhân sự Moderator';
      case 'warehouses':
        return 'Quản lý Chi nhánh Kho ReHome';
      case 'audit':
        return 'Nhật ký kiểm toán hệ thống (Audit Log)';
      default:
        return 'Quản lý Tài khoản (Member & Tổ chức)';
    }
  };

  return (
    <AdminLayout title={getPageTitle()}>
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

      {activeTab === 'warehouses' && (
        <AdminWarehousesView onLogAction={handleLogAction} />
      )}

      {activeTab === 'audit' && (
        <AdminAuditLogsView dynamicLogs={dynamicLogs} />
      )}
    </AdminLayout>
  );
}
