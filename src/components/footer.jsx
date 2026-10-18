import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES } from '../configs/role.config.js';

export default function Footer() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = isAuthenticated && user?.role === ROLES.ADMIN;
  const isModerator = isAuthenticated && (user?.role === ROLES.MODERATOR || user?.role === 'moderator');
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
            <p className="text-[#717971] leading-relaxed">
              Cổng điều hành và quản trị tập trung dành riêng cho Nhân viên Kho (Moderator) và Quản trị viên (Admin) nền tảng ReHome.
            </p>
          </div>

          {/* Actor Quick Links */}
          <div>
            <h4 className="font-bold text-[#191C19] mb-3 uppercase tracking-wider">
              Cổng Điều Hành Web
            </h4>
            <ul className="space-y-2 text-[#717971]">
              {isModerator && <>
                <li><Link to="/moderator/counter" className="hover:text-[#006B2C] transition-colors">Quầy Kho & Kiểm định (Moderator)</Link></li>
                <li><Link to="/moderator/queue" className="hover:text-[#006B2C] transition-colors">Hàng đợi duyệt form online</Link></li>
              </>}
              {isAdmin && <>
                <li><Link to="/admin" className="hover:text-[#006B2C] transition-colors">Quản trị & Quỹ nền tảng (Admin)</Link></li>
                <li><Link to="/admin/configs" className="hover:text-[#006B2C] transition-colors">Cấu hình tham số Mục 11</Link></li>
              </>}
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="font-bold text-[#191C19] mb-3 uppercase tracking-wider">
              Chính Sách & Vận Hành
            </h4>
            <ul className="space-y-2 text-[#717971]">
              <li><span className="text-[#414942]">Hoa hồng 3 kỳ: 10% - 15% - 20%</span></li>
              <li><span className="text-[#414942]">Giá sàn bảo vệ người bán (50% giá chốt)</span></li>
              <li><span className="text-[#414942]">Cửa sổ rút hàng miễn phí 7 ngày</span></li>
              <li><span className="text-[#414942]">Kiểm định kho & Tem nhãn SKU dán áo</span></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-[#191C19] mb-3 uppercase tracking-wider">
              Chi Nhánh Kho ReHome
            </h4>
            <p className="text-[#717971] mb-1">Kho Q7: Số 12 Nguyễn Thị Thập, P. Tân Phú, Q. 7, TP.HCM</p>
            <p className="text-[#717971] mb-1">Hotline: 1900 xxxx (8:00 - 18:00)</p>
            <p className="text-[#717971]">Email hỗ trợ: support@rehome.vn</p>
          </div>
        </div>

        <div className="border-t border-[#DDE5D9] pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#717971]">
          <p>© {new Date().getFullYear()} ReHome Platform. Vận hành theo tài liệu nghiệp vụ Review 1.</p>
          <div className="flex space-x-4 mt-2 sm:mt-0">
            <span>Sổ kép đối ứng</span>
            <span>•</span>
            <span>Sandbox MoMo & GHN</span>
            <span>•</span>
            <span>Admin & Moderator Web</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
