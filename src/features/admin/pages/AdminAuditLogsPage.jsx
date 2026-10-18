import React from 'react';
import { useOutletContext } from 'react-router-dom';
import AdminAuditLogsView from '../components/AdminAuditLogsView.jsx';

/**
 * Trang Nhật ký Kiểm toán Hệ thống ReHome (/admin/audit-logs)
 * Sử dụng chung Shared AdminLayout qua Router Outlet
 */
export default function AdminAuditLogsPage() {
  const { dynamicLogs } = useOutletContext() || {};
  return <AdminAuditLogsView dynamicLogs={dynamicLogs || []} />;
}
