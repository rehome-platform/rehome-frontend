import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Auth Pages (Chỉ dành cho Admin & Moderator)
import {
  LoginPage,
  ForgotPassword,
  ProfilePage,
} from '../features/auth/pages/index.js';
import PrivateRoute from './PrivateRoute.jsx';
import ResetPassword from '../features/auth/pages/ResetPassword.jsx';
import MomoReturnPage from '../features/payment/pages/MomoReturnPage.jsx';
import VnpayReturnPage from '../features/payment/pages/VnpayReturnPage.jsx';

// Moderator Pages (Cổng Vận Hành Điểm Kí Gửi & Kiểm Duyệt)
import {
  CounterPage,
  ConsignmentListPage,
  ConsignmentDetailPage,
  ConsignmentPrintQueuePage,
  InventoryDetailPage,
  EndOfTermPage,
  ConsignmentQueuePage,
  WarehouseInventoryPage,
  PackingOrdersPage,
  ReturnProcessingPage,
  OrgVerificationPage,
  ViolationReportsPage,
  CategoryBrandPage,
  WarehouseInboxPage,
  WarehouseHomePage,
  ReConsignNegotiationPage,
} from '../features/moderator/pages/index.js';

// Admin Pages & Shared Layout (Cổng Quản Trị Hệ Thống)
import AdminLayout from '../layouts/AdminLayout.jsx';
import {
  AdminDashboardPage,
  AdminAccountsPage,
  AdminModeratorsPage,
  AdminWarehousesPage,
  AdminViolationWordsPage,
  ConfigPage,
  AdminAuditLogsPage,
} from '../features/admin/pages/index.js';

/**
 * Root Redirect Handler (Điều hướng gốc /)
 * Requirement A:
 * - Người dùng chưa đăng nhập truy cập / được chuyển trực tiếp đến trang Login.
 * - Không hiển thị Landing Page hoặc màn hình chọn vai trò trước khi đăng nhập.
 * - Nếu đã có session hợp lệ, chuyển thẳng tới dashboard theo vai trò:
 *     ADMIN -> /admin
 *     STAFF / MODERATOR -> /moderator/counter
 */
function RootRedirect() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAF8] text-[#191C19]">
        <div className="w-10 h-10 border-4 border-[#006B2C] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold text-[#717971]">Đang kiểm tra phiên đăng nhập ReHome...</p>
      </div>
    );
  }

  if (isAuthenticated && user) {
    const role = user.role;
    if (role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    if (role === 'staff' || role === 'moderator') {
      return <Navigate to="/moderator/counter" replace />;
    }
  }

  return <Navigate to="/login" replace />;
}

export default function AppRouter() {
  const location = useLocation();
  return (
    <Routes>
      {/* 1. Public & Auth Routes (Chỉ cho Admin & Moderator) */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/payment/momo-return" element={<MomoReturnPage />} />
      <Route path="/payment/vnpay-return" element={<VnpayReturnPage />} />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <ProfilePage />
          </PrivateRoute>
        }
      />

      {/* 2. Moderator Routes (Điểm kí gửi & Kiểm duyệt) */}
      <Route
        path="/moderator"
        element={
          <PrivateRoute roles={['moderator', 'staff']}>
            <WarehouseHomePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/moderator/counter"
        element={
          <PrivateRoute roles={['moderator', 'staff']}>
            <CounterPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/moderator/queue"
        element={
          <PrivateRoute roles={['moderator', 'staff']}>
            <ConsignmentQueuePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/moderator/consignments"
        element={
          <PrivateRoute roles={['moderator', 'staff']}>
            <ConsignmentListPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/moderator/consignments/print-queue"
        element={
          <PrivateRoute roles={['moderator', 'staff']}>
            <ConsignmentPrintQueuePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/moderator/print-queue"
        element={
          <PrivateRoute roles={['moderator', 'staff']}>
            <ConsignmentPrintQueuePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/moderator/inventory"
        element={
          <PrivateRoute roles={['moderator', 'staff']}>
            <WarehouseInventoryPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/moderator/packing"
        element={
          <PrivateRoute roles={['moderator', 'staff']}>
            <PackingOrdersPage />
          </PrivateRoute>
        }
      />
      <Route path="/moderator/consignments/:formId" element={<PrivateRoute roles={['moderator', 'staff']}><ConsignmentDetailPage key={location.pathname} /></PrivateRoute>} />
      <Route path="/moderator/inventory/:sku" element={<PrivateRoute roles={['moderator', 'staff']}><InventoryDetailPage key={location.pathname} /></PrivateRoute>} />
      <Route path="/moderator/inventory/:sku/re-consign" element={<PrivateRoute roles={['moderator', 'staff']}><ReConsignNegotiationPage key={location.pathname} /></PrivateRoute>} />
      <Route path="/moderator/consignments/re-consign/:sku" element={<PrivateRoute roles={['moderator', 'staff']}><ReConsignNegotiationPage key={location.pathname} /></PrivateRoute>} />
      <Route path="/moderator/end-of-term" element={<PrivateRoute roles={['moderator', 'staff']}><EndOfTermPage /></PrivateRoute>} />
      <Route
        path="/moderator/returns"
        element={
          <PrivateRoute roles={['moderator', 'staff']}>
            <ReturnProcessingPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/moderator/verifications"
        element={
          <PrivateRoute roles={['moderator', 'staff']}>
            <OrgVerificationPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/moderator/reports"
        element={
          <PrivateRoute roles={['moderator', 'staff']}>
            <ViolationReportsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/moderator/categories"
        element={
          <PrivateRoute roles={['moderator', 'staff']}>
            <CategoryBrandPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/moderator/inbox"
        element={
          <PrivateRoute roles={['moderator', 'staff']}>
            <WarehouseInboxPage />
          </PrivateRoute>
        }
      />

      {/* 3. Admin Routes (Quản trị hệ thống - Dùng chung MỘT Shared AdminLayout) */}
      <Route
        path="/admin"
        element={
          <PrivateRoute roles={['admin']}>
            <AdminLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminAccountsPage />} />
        <Route path="moderators" element={<AdminModeratorsPage />} />
        <Route path="warehouses" element={<AdminWarehousesPage />} />
        <Route path="violation-words" element={<AdminViolationWordsPage />} />
        <Route path="configs" element={<ConfigPage />} />
        <Route path="audit-logs" element={<AdminAuditLogsPage />} />
        <Route path="system" element={<Navigate to="/admin/users" replace />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
