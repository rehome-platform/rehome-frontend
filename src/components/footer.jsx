import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES } from '../configs/role.config.js';

export default function Footer() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = isAuthenticated && user?.role === ROLES.ADMIN;
  const isModerator = isAuthenticated && (user?.role === ROLES.MODERATOR || user?.role === 'moderator' || user?.role === 'staff');
  return (
    <footer className="w-full bg-white border-t border-[#DDE5D9] py-8 mt-auto text-[#191C19]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-xs">
          {/* Brand Col */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="w-7 h-7 rounded-lg bg-[#006B2C] flex items-center justify-center text-white font-bold text-sm">
                R
              </span>
              <span className="text-lg font-black font-heading text-[#006B2C]">ReHome Web</span>
            </div>
            <p className="text-[#5B6776] leading-relaxed">
              Cổng điều hành và quản trị tập trung dành riêng cho Nhân viên Điểm ký gửi (Moderator) và Quản trị viên (Admin) nền tảng ReHome.
            </p>
          </div>

          {/* Actor Quick Links */}
          <div>
            <h4 className="font-bold text-[#191C19] mb-3 uppercase tracking-wider">
              Cổng Điều Hành Web
            </h4>
            <ul className="space-y-2 text-[#5B6776]">
              {isModerator && <>
                <li><Link to="/moderator/counter" className="hover:text-[#006B2C] transition-colors">Quầy Điểm ký gửi & Kiểm định</Link></li>
                <li><Link to="/moderator/queue" className="hover:text-[#006B2C] transition-colors">Hàng đợi duyệt phiếu ký gửi</Link></li>
              </>}
              {isAdmin && <>
                <li><Link to="/admin" className="hover:text-[#006B2C] transition-colors">Quản trị & Quỹ nền tảng</Link></li>
                <li><Link to="/admin/configs" className="hover:text-[#006B2C] transition-colors">Cấu hình tham số hệ thống</Link></li>
              </>}
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="font-bold text-[#191C19] mb-3 uppercase tracking-wider">
              Chính Sách & Vận Hành
            </h4>
            <ul className="space-y-2 text-[#5B6776]">
              <li><span className="text-[#414942]">Hoa hồng 3 kỳ: 10% - 15% - 20%</span></li>
              <li><span className="text-[#414942]">Giá sàn bảo vệ người bán (50% giá chốt)</span></li>
              <li><span className="text-[#414942]">Cửa sổ rút hàng miễn phí 7 ngày</span></li>
              <li><span className="text-[#414942]">Kiểm định điểm ký gửi & Tem nhãn Mã hàng hóa</span></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-[#191C19] mb-3 uppercase tracking-wider">
              Chi Nhánh Điểm Ký Gửi ReHome
            </h4>
            <p className="text-[#5B6776] mb-1">Điểm ký gửi Q7: Số 12 Nguyễn Thị Thập, P. Tân Phú, Q. 7, TP.HCM</p>
            <p className="text-[#5B6776] mb-1">Giờ làm việc: 8:00 - 18:00 (Thứ 2 - Chủ Nhật)</p>
            <p className="text-[#5B6776]">Email hỗ trợ: support@rehome.vn</p>
          </div>
        </div>

        <div className="border-t border-[#DDE5D9] pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#5B6776]">
          <p>© {new Date().getFullYear()} ReHome Platform. Hệ thống quản trị & vận hành nội bộ.</p>
          <div className="flex space-x-4 mt-2 sm:mt-0">
            <span>Sổ kép đối ứng</span>
            <span>•</span>
            <span>Thanh toán VNPay & Vận chuyển GHN</span>
            <span>•</span>
            <span>ReHome Web Portal</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
