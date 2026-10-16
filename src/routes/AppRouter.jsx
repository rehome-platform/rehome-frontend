import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import Header from '../components/header.jsx';
import Footer from '../components/footer.jsx';

// Auth Pages (Chỉ dành cho Admin & Moderator)
import {
  LoginPage,
  ForgotPassword,
  ProfilePage,
} from '../features/auth/pages/index.js';
import PrivateRoute from './PrivateRoute.jsx';

// Moderator Pages (Cổng Vận Hành Kho & Kiểm Duyệt)
import {
  CounterPage,
  ConsignmentQueuePage,
  WarehouseInventoryPage,
  PackingOrdersPage,
  ReturnProcessingPage,
  OrgVerificationPage,
  ViolationReportsPage,
  CategoryBrandPage,
  WarehouseInboxPage,
} from '../features/moderator/pages/index.js';

// Admin Pages (Cổng Quản Trị Hệ Thống)
import {
  AdminSystemPage,
  AdminDashboardPage,
  ConfigPage,
} from '../features/admin/pages/index.js';

/**
 * ReHome Web Operations Portal
 * Trung tâm điều hành web dành cho 2 tác nhân nội bộ: Moderator (Kho) và Admin (Quản trị)
 * (Member & Organization thực thi độc quyền trên Mobile App theo Mục 2 tài liệu Review 1)
 */
function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF8] text-[#191C19] font-sans antialiased">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-10">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8">
          <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#E8F5E9] text-[#006B2C] border border-[#C8E6C9] tracking-wide uppercase">
            Hệ Thống Vận Hành ReHome • Review 1
          </span>
          <h1 className="text-3xl sm:text-5xl font-black font-heading text-[#191C19] tracking-tight">
            Cổng Điều Hành & Vận Hành Tập Trung ReHome
          </h1>
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-[#414942] leading-relaxed">
            Hệ thống chuyên biệt trên Web dành riêng cho <strong>Nhân viên Kho (Moderator)</strong> và <strong>Quản trị viên (Admin)</strong>.
          </p>

          <div className="p-4 max-w-3xl mx-auto bg-[#E8F0FE] border border-[#BFDBFE] text-xs text-[#1E40AF] rounded-2xl flex items-center justify-center space-x-2.5">
            <span className="material-symbols-outlined text-xl shrink-0">phone_iphone</span>
            <span className="text-left leading-relaxed">
              <strong>Phân định nền tảng (Mục 2):</strong> Tác nhân <strong>Member</strong> (mua sắm, ký gửi, ví tiền, thử đồ AI) và tác nhân <strong>Tổ chức từ thiện (Organization)</strong> (tạo chiến dịch, đăng bài cộng đồng) được thực thi độc quyền trên <strong>Ứng dụng Di động (Mobile App)</strong>.
            </span>
          </div>
        </div>

        {/* 2 Cổng tác nhân thực thi trên Web */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* 1. Moderator Portal */}
          <Link
            to="/moderator/counter"
            className="group p-8 rounded-2xl bg-white border border-[#DDE5D9] hover:border-[#006B2C] shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#E8F5E9] text-[#006B2C] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-3xl">warehouse</span>
              </div>
              <div className="flex items-center space-x-2.5 mb-2.5">
                <h3 className="font-extrabold text-xl text-[#191C19]">Nhân Viên Kho (Moderator)</h3>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-[#F0F5EE] text-[#006B2C]">Web App</span>
              </div>
              <p className="text-xs text-[#717971] leading-relaxed">
                Tra cứu Member tại quầy bằng mã/SĐT, kiểm định hàng thật/giả, chốt giá niêm yết, in tem SKU dán áo, nhập kho, đóng gói tạo đơn GHN, xử lý hàng trả & hàng nghi giả 2 moderator, xác minh hồ sơ tổ chức theo 8 bước kiểm chứng.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-[#F0F4EE] flex items-center justify-between text-xs font-bold text-[#006B2C]">
              <span>Vào Cổng Vận Hành Kho Chi Nhánh</span>
              <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
          </Link>

          {/* 2. Admin Portal */}
          <Link
            to="/admin"
            className="group p-8 rounded-2xl bg-white border border-[#DDE5D9] hover:border-[#006B2C] shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#E0F2F1] text-[#00685F] flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
              </div>
              <div className="flex items-center space-x-2.5 mb-2.5">
                <h3 className="font-extrabold text-xl text-[#191C19]">Quản Trị Viên (Admin)</h3>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-[#E0F2F1] text-[#00685F]">Web App</span>
              </div>
              <p className="text-xs text-[#717971] leading-relaxed">
                Dashboard Quỹ nền tảng theo nguyên tắc ghi sổ kép (Mục 7 & 8), quản lý tài khoản (Member & Tổ chức) - khóa/mở khóa, phân bổ Moderator theo kho, quản lý mạng lưới chi nhánh kho, cấu hình 5 nhóm tham số Mục 11 và xem Audit Log.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-[#F0F4EE] flex items-center justify-between text-xs font-bold text-[#00685F]">
              <span>Vào Cổng Quản Trị Hệ Thống</span>
              <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function AppRouter() {
  return (
    <Routes>
      {/* 1. Public & Auth Routes (Chỉ cho Admin & Moderator) */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route
        path="/profile"
        element={
          <PrivateRoute>
            <ProfilePage />
          </PrivateRoute>
        }
      />

      {/* 2. Moderator Routes (Chi nhánh kho & Kiểm duyệt) */}
      <Route
        path="/moderator"
        element={
          <PrivateRoute roles={['staff', 'admin']}>
            <Navigate to="/moderator/counter" replace />
          </PrivateRoute>
        }
      />
      <Route
        path="/moderator/counter"
        element={
          <PrivateRoute roles={['staff', 'admin']}>
            <CounterPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/moderator/queue"
        element={
          <PrivateRoute roles={['staff', 'admin']}>
            <ConsignmentQueuePage />
          </PrivateRoute>
        }
      />
      <Route
        path="/moderator/inventory"
        element={
          <PrivateRoute roles={['staff', 'admin']}>
            <WarehouseInventoryPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/moderator/packing"
        element={
          <PrivateRoute roles={['staff', 'admin']}>
            <PackingOrdersPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/moderator/returns"
        element={
          <PrivateRoute roles={['staff', 'admin']}>
            <ReturnProcessingPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/moderator/verifications"
        element={
          <PrivateRoute roles={['staff', 'admin']}>
            <OrgVerificationPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/moderator/reports"
        element={
          <PrivateRoute roles={['staff', 'admin']}>
            <ViolationReportsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/moderator/categories"
        element={
          <PrivateRoute roles={['staff', 'admin']}>
            <CategoryBrandPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/moderator/inbox"
        element={
          <PrivateRoute roles={['staff', 'admin']}>
            <WarehouseInboxPage />
          </PrivateRoute>
        }
      />

      {/* 3. Admin Routes (Quản trị hệ thống - Chỉ dành cho role Admin) */}
      <Route
        path="/admin"
        element={
          <PrivateRoute roles={['admin']}>
            <AdminDashboardPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/system"
        element={
          <PrivateRoute roles={['admin']}>
            <AdminSystemPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <PrivateRoute roles={['admin']}>
            <AdminSystemPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/moderators"
        element={
          <PrivateRoute roles={['admin']}>
            <AdminSystemPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/warehouses"
        element={
          <PrivateRoute roles={['admin']}>
            <AdminSystemPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/audit-logs"
        element={
          <PrivateRoute roles={['admin']}>
            <AdminSystemPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/configs"
        element={
          <PrivateRoute roles={['admin']}>
            <ConfigPage />
          </PrivateRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
