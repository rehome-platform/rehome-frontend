import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full bg-surface-container-low border-t border-outline-variant py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Col */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold">R</span>
              <span className="text-xl font-bold font-heading text-primary">ReHome</span>
            </div>
            <p className="text-sm text-outline leading-relaxed">
              Nền tảng ký gửi thời trang tuần hoàn, kết nối cửa hàng và tổ chức từ thiện vì môi trường bền vững.
            </p>
          </div>

          {/* Actor Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-on-surface mb-3">Dành cho Đối tác</h4>
            <ul className="space-y-2 text-sm text-outline">
              <li><Link to="/shop" className="hover:text-primary transition-colors">Cửa hàng Ký gửi</Link></li>
              <li><Link to="/organizer" className="hover:text-primary transition-colors">Tổ chức Từ thiện</Link></li>
              <li><Link to="/moderator" className="hover:text-primary transition-colors">Cổng Kiểm duyệt</Link></li>
              <li><Link to="/admin" className="hover:text-primary transition-colors">Quản trị Hệ thống</Link></li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="text-sm font-semibold text-on-surface mb-3">Chính sách & Quy chuẩn</h4>
            <ul className="space-y-2 text-sm text-outline">
              <li><a href="#" className="hover:text-primary transition-colors">Tiêu chuẩn kiểm hàng 4 mức độ</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Chính sách tất toán PayOS</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Phân xử khiếu nại 2 tầng</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Quy định trần giá 2.000.000 đ</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-on-surface mb-3">Hỗ trợ & Liên hệ</h4>
            <p className="text-sm text-outline mb-2">Hotline: 1900 8888</p>
            <p className="text-sm text-outline mb-2">Email: contact@rehome.vn</p>
            <p className="text-sm text-outline">Thời gian hỗ trợ: 8:00 - 21:00 hàng ngày</p>
          </div>
        </div>

        <div className="border-t border-outline-variant pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-outline">
          <p>© {new Date().getFullYear()} ReHome Platform. Tất cả các quyền được bảo lưu.</p>
          <div className="flex space-x-4 mt-4 sm:mt-0">
            <a href="#" className="hover:text-primary transition-colors">Điều khoản dịch vụ</a>
            <a href="#" className="hover:text-primary transition-colors">Chính sách bảo mật</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
