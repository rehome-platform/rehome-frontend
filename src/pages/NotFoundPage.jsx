import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Logo from '../components/common/Logo.jsx';

/**
 * Trang 404 — Không tìm thấy đường dẫn.
 * Điều hướng người dùng quay về đúng trang chủ theo vai trò.
 */
export default function NotFoundPage() {
  const { isAuthenticated, user } = useAuth();
  const homePath =
    isAuthenticated && user?.role === 'admin'
      ? '/admin'
      : isAuthenticated && (user?.role === 'moderator' || user?.role === 'staff')
        ? '/moderator/counter'
        : '/login';

  const homeLabel =
    homePath === '/admin'
      ? 'Về bảng điều khiển Quản trị'
      : homePath === '/moderator/counter'
        ? 'Về cổng Điểm ký gửi'
        : 'Về trang đăng nhập';

  return (
    <main className="min-h-screen bg-[#F6F9F4] flex flex-col items-center justify-center px-4 py-10 text-center">
      <Logo size="lg" to={homePath} className="mb-6" />
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#DDE5D9] shadow-sm p-8 space-y-4">
        <div className="text-5xl font-extrabold font-heading text-[#006B2C]">404</div>
        <h1 className="text-lg font-bold text-[#1F2A37]">Không tìm thấy trang</h1>
        <p className="text-sm text-[#5B6776] leading-relaxed">
          Đường dẫn bạn truy cập không tồn tại hoặc đã được thay đổi. Vui lòng quay lại trang chính để tiếp tục làm việc.
        </p>
        <div className="pt-2">
          <Link
            to={homePath}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#006B2C] text-white text-sm font-bold hover:bg-[#005523] transition-colors shadow-sm"
          >
            {homeLabel}
          </Link>
        </div>
      </div>
    </main>
  );
}
