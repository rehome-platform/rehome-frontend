import React, { useState } from 'react';
import { Button, Input } from '../../../components/common/index.js';
import { formatCurrencyVND } from '../../../utils/formatters.js';

export default function PayOSForm({ receipt, onSubmit, onCancel, loading }) {
  const [bankInfo, setBankInfo] = useState({
    accountNumber: '',
    bankCode: 'MB',
    accountName: '',
  });

  const settlementAmount = receipt ? receipt.sellingPrice * 0.8 : 0; // 80% to consigner, 20% commission

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({
        receiptId: receipt?.id,
        amount: settlementAmount,
        ...bankInfo,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-surface-container p-4 rounded-xl space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-outline">Mã biên nhận:</span>
          <span className="font-semibold text-on-surface">#{receipt?.code || receipt?.id}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-outline">Giá bán được xác nhận:</span>
          <span className="font-medium text-on-surface">{formatCurrencyVND(receipt?.sellingPrice || 0)}</span>
        </div>
        <div className="flex justify-between text-base font-bold pt-2 border-t border-outline-variant">
          <span className="text-primary">Số tiền tất toán PayOS (80%):</span>
          <span className="text-primary">{formatCurrencyVND(settlementAmount)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-on-surface mb-1">Ngân hàng</label>
          <select
            value={bankInfo.bankCode}
            onChange={(e) => setBankInfo({ ...bankInfo, bankCode: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-surface-container-lowest border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="MB">MB Bank (Quân Đội)</option>
            <option value="VCB">Vietcombank</option>
            <option value="TCB">Techcombank</option>
            <option value="ACB">ACB</option>
            <option value="VPB">VPBank</option>
          </select>
        </div>
        <Input
          label="Số tài khoản thụ hưởng"
          required
          value={bankInfo.accountNumber}
          onChange={(e) => setBankInfo({ ...bankInfo, accountNumber: e.target.value })}
        />
      </div>

      <Input
        label="Tên chủ tài khoản (In hoa không dấu)"
        required
        value={bankInfo.accountName}
        onChange={(e) => setBankInfo({ ...bankInfo, accountName: e.target.value.toUpperCase() })}
      />

      <div className="flex justify-end space-x-3 pt-3">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel}>
            Hủy bỏ
          </Button>
        )}
        <Button type="submit" loading={loading}>
          Tạo lệnh tất toán PayOS
        </Button>
      </div>
    </form>
  );
}
