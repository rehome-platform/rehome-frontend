import React from 'react';
import { useOutletContext } from 'react-router-dom';
import AdminAccountsView from '../components/AdminAccountsView.jsx';

/**
 * Trang Quản lý Tài khoản Admin (/admin/users)
 * Sử dụng chung Shared AdminLayout qua Router Outlet
 */
export default function AdminAccountsPage() {
  const { onLogAction } = useOutletContext() || {};
  return <AdminAccountsView onLogAction={onLogAction} />;
}
