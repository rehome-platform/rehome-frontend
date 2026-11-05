import React from 'react';
import { useOutletContext } from 'react-router-dom';
import AdminViolationWordsView from '../components/AdminViolationWordsView.jsx';

/**
 * Trang Thư Viện Từ Vựng Vi Phạm (/admin/violation-words)
 * Sử dụng chung Shared AdminLayout qua Router Outlet
 */
export default function AdminViolationWordsPage() {
  const { onLogAction } = useOutletContext() || {};
  return <AdminViolationWordsView onLogAction={onLogAction} />;
}

