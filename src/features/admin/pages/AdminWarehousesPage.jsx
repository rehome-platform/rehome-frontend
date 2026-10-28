import React from 'react';
import { useOutletContext } from 'react-router-dom';
import AdminWarehousesView from '../components/AdminWarehousesView.jsx';

/**
 * Trang Quản lý Điểm kí gửi ReHome (/admin/warehouses)
 * Sử dụng chung Shared AdminLayout qua Router Outlet
 */
export default function AdminWarehousesPage() {
  const { onLogAction } = useOutletContext() || {};
  return <AdminWarehousesView onLogAction={onLogAction} />;
}
