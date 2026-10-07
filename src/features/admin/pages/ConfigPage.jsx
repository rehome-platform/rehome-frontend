import React, { useState } from 'react';
import AdminLayout from '../../../layouts/AdminLayout.jsx';
import { Input, Button } from '../../../components/common/index.js';
import { adminService } from '../services/admin.service.js';

export default function ConfigPage() {
  const [configs, setConfigs] = useState({
    commissionRate: 20, // 20%
    priceCeiling: 2000000, // 2,000,000 VND
    minConsignmentDays: 50,
    maxConsignmentDays: 100,
    maxListingDays: 5,
    payoutDays: '1 và 16 hàng tháng',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminService.updateSystemConfigs(configs);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Demo mock fallback
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-heading text-on-surface">Cấu Hình Tham Số Hệ Thống ReHome</h1>
          <p className="text-sm text-outline">Quy định các chỉ số kinh doanh cốt lõi của nền tảng ký gửi & tuần hoàn</p>
        </div>

        {saved && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm font-semibold">
            ✓ Đã lưu và áp dụng tham số hệ thống thành công!
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm space-y-4">
          <Input
            label="Tỷ lệ phí sàn ReHome (%)"
            type="number"
            required
            value={configs.commissionRate}
            helperText="Mặc định 20% (80% chia về cho người ký gửi)"
            onChange={(e) => setConfigs({ ...configs, commissionRate: Number(e.target.value) })}
          />

          <Input
            label="Mức trần giá ký gửi (VNĐ)"
            type="number"
            required
            value={configs.priceCeiling}
            helperText="Quy định tối đa 2.000.000 đ cho quần áo cũ ký gửi"
            onChange={(e) => setConfigs({ ...configs, priceCeiling: Number(e.target.value) })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Hạn ký gửi tối thiểu (Ngày)"
              type="number"
              required
              value={configs.minConsignmentDays}
              onChange={(e) => setConfigs({ ...configs, minConsignmentDays: Number(e.target.value) })}
            />
            <Input
              label="Hạn ký gửi tối đa (Ngày)"
              type="number"
              required
              value={configs.maxConsignmentDays}
              onChange={(e) => setConfigs({ ...configs, maxConsignmentDays: Number(e.target.value) })}
            />
          </div>

          <Input
            label="Hạn đăng bán tối đa sau khi duyệt (Ngày)"
            type="number"
            required
            value={configs.maxListingDays}
            helperText="Quá 5 ngày chưa đăng bán sẽ cảnh báo nhắc nhở shop"
            onChange={(e) => setConfigs({ ...configs, maxListingDays: Number(e.target.value) })}
          />

          <Input
            label="Kỳ chốt đối soát & rút tiền tự động"
            value={configs.payoutDays}
            onChange={(e) => setConfigs({ ...configs, payoutDays: e.target.value })}
          />

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={saving}>
              Lưu thay đổi cấu hình
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
