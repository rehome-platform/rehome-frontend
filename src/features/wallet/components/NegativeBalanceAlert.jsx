import React from 'react';
import Button from '../../../components/common/Button.jsx';
import { formatCurrencyVND } from '../../../utils/formatters.js';

export default function NegativeBalanceAlert({ balance, onTopUp }) {
  if (balance >= 0) return null;

  return (
    <div className="p-4 bg-red-50 border border-red-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
      <div className="flex items-center space-x-3 text-red-900">
        <span className="material-symbols-outlined text-3xl text-red-600">warning</span>
        <div>
          <h4 className="text-sm font-bold">Cảnh Báo: Ví Cửa Hàng Đang Bị Âm Số Dư ({formatCurrencyVND(balance)})</h4>
          <p className="text-xs text-red-700 mt-0.5">
            Vui lòng nạp bù PayOS trong vòng 48 giờ để tránh bị hệ thống tạm khóa quyền lập biên nhận và đăng bán đồ mới.
          </p>
        </div>
      </div>
      <Button variant="danger" size="sm" onClick={onTopUp}>
        Nạp bù PayOS ngay
      </Button>
    </div>
  );
}
