import React from 'react';
import AdminLayout from '../../../layouts/AdminLayout.jsx';
import { formatCurrencyVND } from '../../../utils/formatters.js';

export default function RevenueDashboardPage() {
  const stats = [
    { label: 'Tổng giá trị ký gửi trên sàn', value: formatCurrencyVND(245000000), icon: 'inventory_2', color: 'bg-green-500' },
    { label: 'Doanh thu phí sàn ReHome (20%)', value: formatCurrencyVND(49000000), icon: 'account_balance', color: 'bg-emerald-600' },
    { label: 'Số dư ví giữ hộ của Shop', value: formatCurrencyVND(196000000), icon: 'account_balance_wallet', color: 'bg-amber-500' },
    { label: 'Món đồ đã quyên góp thành công', value: '4,280 món', icon: 'volunteer_activism', color: 'bg-rose-500' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-on-surface">Tổng Quan Doanh Thu & Hệ Thống</h1>
          <p className="text-sm text-outline">Báo cáo số liệu tài chính, tiền giữ hộ và hoạt động tuần hoàn ReHome</p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, idx) => (
            <div key={idx} className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-xl text-white flex items-center justify-center ${s.color}`}>
                <span className="material-symbols-outlined text-2xl">{s.icon}</span>
              </div>
              <div>
                <p className="text-xs text-outline">{s.label}</p>
                <p className="text-lg font-bold text-on-surface mt-0.5">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts & System Alerts simulation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm">
            <h3 className="text-base font-semibold text-on-surface mb-4">Biểu Đồ Tăng Trưởng Ký Gửi & Bán Ra (30 Ngày)</h3>
            <div className="h-64 flex items-end justify-between gap-2 pt-8 pb-2 px-2 border-b border-outline-variant">
              {[40, 55, 60, 48, 70, 85, 92, 78, 88, 95, 110, 125].map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-primary/20 hover:bg-primary transition-colors rounded-t" style={{ height: `${val * 1.8}px` }}></div>
                  <span className="text-[10px] text-outline">T{i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-on-surface">Cảnh Báo Cần Xử Lý</h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800">
                <p className="font-bold">⚠️ Có 2 shop đang bị ví âm quá 48h</p>
                <p className="mt-0.5 text-red-600">Cần gửi thông báo nạp bù PayOS trước khi khóa quyền đăng bán.</p>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
                <p className="font-bold">⚠️ 5 biên nhận sắp hết hạn 100 ngày</p>
                <p className="mt-0.5 text-amber-600">Nhắc nhở Member đến lấy đồ hoặc chuyển sang quyên góp.</p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800">
                <p className="font-bold">ℹ️ Kỳ rút tiền ngày 16 sắp diễn ra</p>
                <p className="mt-0.5 text-blue-600">Đối soát danh sách tài khoản hợp lệ tự động.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
