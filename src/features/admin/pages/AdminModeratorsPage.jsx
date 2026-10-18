import React from 'react';
import { useOutletContext } from 'react-router-dom';
import AdminModeratorsView from '../components/AdminModeratorsView.jsx';

/**
 * Trang Quản lý Nhân sự Moderator (/admin/moderators)
 * Sử dụng chung Shared AdminLayout qua Router Outlet
 */
export default function AdminModeratorsPage() {
  const { onLogAction } = useOutletContext() || {};
  return <AdminModeratorsView onLogAction={onLogAction} />;
}
