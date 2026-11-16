import React from 'react';
import AdminFundLedgerSection from '../components/AdminFundLedgerSection.jsx';
import AdminPeriodFilter from '../components/AdminPeriodFilter.jsx';
import useAdminPeriod from '../hooks/useAdminPeriod.js';

/**
 * Trang Giao dịch (Admin): danh sách giao dịch giữa Quỹ nền tảng và Ví Member. Tách khỏi trang Tổng quan;
 * có bộ lọc thời gian riêng. Tiêu đề trang đã hiện ở thanh header (AdminHeader) nên không lặp lại ở đây.
 */
export default function AdminFundLedgerPage() {
  const filter = useAdminPeriod('MONTH');
  const { activeRange, dateError } = filter;

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-end justify-end gap-4 border-b border-[#E2E8E0] pb-4">
        <AdminPeriodFilter filter={filter} />
      </div>

      {dateError && (
        <div
          role="alert"
          className="px-4 py-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#B91C1C]"
        >
          {dateError}
        </div>
      )}

      <AdminFundLedgerSection from={activeRange.apiFrom} to={activeRange.apiTo} />
    </div>
  );
}
