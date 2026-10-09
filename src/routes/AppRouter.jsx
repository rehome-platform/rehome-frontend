import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import PrivateRoute from './PrivateRoute.jsx';
import Header from '../components/header.jsx';
import Footer from '../components/footer.jsx';
import Chat from '../components/chat.jsx';

// Auth Pages
import {
  LoginPage,
  RegisterShop,
  RegisterOrg,
  ForgotPassword,
} from '../features/auth/pages/index.js';

// Shop Pages
import {
  CreateReceiptPage,
  ConsignmentsPage,
  DualLabelListingPage,
  ReturnGoodsPage,
} from '../features/shop/pages/index.js';

// Organizer Pages
import {
  CampaignManagementPage,
  DonationCheckInPage,
} from '../features/organizer/pages/index.js';

// Moderator Pages
import {
  LegalVerificationPage,
  DisputeResolutionPage,
  ReportsPage,
} from '../features/moderator/pages/index.js';

// Admin Pages
import {
  AdminSystemPage,
  RevenueDashboardPage,
  ConfigPage,
  AccountLockPage,
} from '../features/admin/pages/index.js';

// Order Components
import { PackagingModal, TrackingModal } from '../features/orders/components/index.js';
import { BalanceHistoryTable, NegativeBalanceAlert } from '../features/wallet/components/index.js';

// Home Portal Page
function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary uppercase tracking-wider">
            ReHome Platform v1.0
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold font-heading text-on-surface tracking-tight">
            Nền Tảng Ký Gửi & Tuần Hoàn Thời Trang Bền Vững
          </h1>
          <p className="max-w-2xl mx-auto text-base text-outline leading-relaxed">
            Hệ thống quản trị và vận hành tập trung cho Cửa hàng ký gửi, Tổ chức từ thiện, Kiểm duyệt viên và Quản trị viên.
          </p>
        </div>

        {/* Portal 4 Actors */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link
            to="/shop"
            className="group p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant hover:border-primary shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-2xl">storefront</span>
              </div>
              <h3 className="font-bold text-lg text-on-surface mb-2">Cửa hàng Ký gửi</h3>
              <p className="text-xs text-outline leading-relaxed">
                Lập biên nhận tại quầy, kiểm tra tiêu chí 4 mức độ, đăng bán 2 nhãn và tất toán PayOS.
              </p>
            </div>
            <span className="text-xs font-semibold text-primary mt-4 inline-flex items-center">
              Truy cập Quầy →
            </span>
          </Link>

          <Link
            to="/organizer"
            className="group p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant hover:border-primary shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-2xl">volunteer_activism</span>
              </div>
              <h3 className="font-bold text-lg text-on-surface mb-2">Tổ chức Từ thiện</h3>
              <p className="text-xs text-outline leading-relaxed">
                Tạo chiến dịch tiếp nhận quần áo, quét mã QR check-in quyên góp của Member.
              </p>
            </div>
            <span className="text-xs font-semibold text-rose-600 mt-4 inline-flex items-center">
              Quản lý Chiến dịch →
            </span>
          </Link>

          <Link
            to="/moderator"
            className="group p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant hover:border-primary shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-2xl">gavel</span>
              </div>
              <h3 className="font-bold text-lg text-on-surface mb-2">Kiểm duyệt viên</h3>
              <p className="text-xs text-outline leading-relaxed">
                Đối chiếu MST/pháp lý đối tác và phân xử khiếu nại tranh chấp 2 tầng minh bạch.
              </p>
            </div>
            <span className="text-xs font-semibold text-amber-700 mt-4 inline-flex items-center">
              Cổng Kiểm duyệt →
            </span>
          </Link>

          <Link
            to="/admin"
            className="group p-6 rounded-2xl bg-surface-container-lowest border border-outline-variant hover:border-primary shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
              </div>
              <h3 className="font-bold text-lg text-on-surface mb-2">Quản trị viên</h3>
              <p className="text-xs text-outline leading-relaxed">
                Dashboard doanh thu toàn sàn, trần giá 2 triệu, kỳ rút tiền 1 & 16 và khóa tài khoản.
              </p>
            </div>
            <span className="text-xs font-semibold text-purple-700 mt-4 inline-flex items-center">
              Hệ thống Quản trị →
            </span>
          </Link>
        </div>
      </main>
      <Footer />
      <Chat />
    </div>
  );
}

// Wallet Overview Page
function WalletPage() {
  const [balance, setBalance] = React.useState(-250000); // Sample negative balance for alert testing
  const transactions = [
    { id: 'TX-1001', createdAt: new Date().toISOString(), description: 'Tất toán biên nhận bán ngoài sàn #REC-108294', amount: -256000, postBalance: -250000, status: 'SUCCESS' },
    { id: 'TX-1002', createdAt: new Date().toISOString(), description: 'Doanh thu đơn hàng đã giao #ORD-9912 (80%)', amount: 280000, postBalance: 6000, status: 'SUCCESS' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-on-surface">Ví & Biến Động Số Dư</h1>
          <p className="text-sm text-outline">Quản lý dòng tiền bán hàng, chia sẻ doanh thu và nạp bù qua PayOS</p>
        </div>

        <NegativeBalanceAlert balance={balance} onTopUp={() => { alert('Đang mở cổng PayOS nạp bù...'); setBalance(500000); }} />

        <div className="p-6 bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs text-outline">Số dư khả dụng hiện tại</p>
            <p className={`text-2xl font-bold ${balance < 0 ? 'text-error' : 'text-primary'}`}>
              {balance.toLocaleString('vi-VN')} đ
            </p>
          </div>
          <button
            onClick={() => alert('Yêu cầu rút tiền đã được ghi nhận cho kỳ rút tiền ngày 16.')}
            className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-container"
          >
            Đăng ký rút tiền kỳ tới
          </button>
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-semibold text-on-surface">Lịch sử giao dịch ví</h3>
          <BalanceHistoryTable transactions={transactions} />
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Orders Page
function OrdersPage() {
  const [selectedOrder, setSelectedOrder] = React.useState(null);
  const [trackingOrder, setTrackingOrder] = React.useState(null);

  const orders = [
    { id: 'ORD-9912', code: 'ORD-9912', item: 'Áo blazer tweed Zara', buyer: 'Lê Thu Trang', status: 'PENDING_PACKAGING', trackingCode: 'GHN-89212' },
    { id: 'ORD-9884', code: 'ORD-9884', item: 'Quần jean Levi\'s', buyer: 'Phạm Hoàng', status: 'SHIPPED', trackingCode: 'VNPOST-99102' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-on-surface">Quản Lý Đơn Hàng & Vận Chuyển</h1>
          <p className="text-sm text-outline">Quy trình đóng gói, chụp ảnh chứng nhận và theo dõi bưu tá giao hàng</p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-4 divide-y divide-outline-variant">
          {orders.map((o) => (
            <div key={o.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-on-surface">#{o.code} - {o.item}</p>
                <p className="text-xs text-outline">Người nhận: {o.buyer} | Vận đơn: {o.trackingCode}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setSelectedOrder(o)}
                  className="px-3 py-1.5 text-xs font-medium border border-outline-variant rounded-lg hover:bg-surface-container"
                >
                  Tải ảnh đóng gói
                </button>
                <button
                  onClick={() => setTrackingOrder(o)}
                  className="px-3 py-1.5 text-xs font-medium bg-primary text-white rounded-lg hover:bg-primary-container"
                >
                  Theo dõi vận chuyển
                </button>
              </div>
            </div>
          ))}
        </div>

        <PackagingModal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder}
          onConfirm={() => alert('Đã cập nhật ảnh đóng gói thành công!')}
        />

        <TrackingModal
          isOpen={!!trackingOrder}
          onClose={() => setTrackingOrder(null)}
          order={trackingOrder}
        />
      </main>
      <Footer />
    </div>
  );
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterShop />} />
      <Route path="/register-shop" element={<RegisterShop />} />
      <Route path="/register-org" element={<RegisterOrg />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/orders" element={<OrdersPage />} />
      <Route path="/wallet" element={<WalletPage />} />

      {/* Shop Routes */}
      <Route path="/shop" element={<CreateReceiptPage />} />
      <Route path="/shop/consignments" element={<ConsignmentsPage />} />
      <Route path="/shop/listing" element={<DualLabelListingPage />} />
      <Route path="/shop/returns" element={<ReturnGoodsPage />} />

      {/* Organizer Routes */}
      <Route path="/organizer" element={<CampaignManagementPage />} />
      <Route path="/organizer/check-in" element={<DonationCheckInPage />} />

      {/* Moderator Routes */}
      <Route path="/moderator" element={<LegalVerificationPage />} />
      <Route path="/moderator/verifications" element={<LegalVerificationPage />} />
      <Route path="/moderator/disputes" element={<DisputeResolutionPage />} />
      <Route path="/moderator/reports" element={<ReportsPage />} />

      {/* Admin Stitch Routes */}
      <Route path="/admin" element={<AdminSystemPage />} />
      <Route path="/admin/users" element={<AdminSystemPage />} />
      <Route path="/admin/moderators" element={<AdminSystemPage />} />
      <Route path="/admin/audit-logs" element={<AdminSystemPage />} />
      <Route path="/admin/configs" element={<ConfigPage />} />
      <Route path="/admin/legacy-revenue" element={<RevenueDashboardPage />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
