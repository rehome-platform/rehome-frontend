import React from 'react';
import { useOutletContext } from 'react-router-dom';
import AdminWarehousesView from '../components/AdminWarehousesView.jsx';

/**
 * Trang Quản lý Chi nhánh Kho ReHome (/admin/warehouses)
 * Sử dụng chung Shared AdminLayout qua Router Outlet
 */
export default function AdminWarehousesPage() {
  const { onLogAction } = useOutletContext() || {};
  return <AdminWarehousesView onLogAction={onLogAction} />;
}
