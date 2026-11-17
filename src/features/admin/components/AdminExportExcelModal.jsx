import React, { useState } from 'react';
import { Modal, Button } from '../../../components/common/index.js';
import { useToast } from '../../../context/ToastContext.jsx';
import adminApi from '../services/adminApi.js';
import AdminPeriodFilter from './AdminPeriodFilter.jsx';
import useAdminPeriod from '../hooks/useAdminPeriod.js';

const SECTION_OPTIONS = [
  { key: 'revenue', value: 'REVENUE', label: 'Doanh thu', hint: 'Doanh thu nền tảng, hoa hồng và tiền đang giữ hộ theo kỳ' },
  { key: 'users', value: 'USERS', label: 'Người dùng', hint: 'Số tài khoản theo vai trò và tài khoản mới' },
  { key: 'warehouse', value: 'WAREHOUSE', label: 'Địa điểm ký gửi', hint: 'Hàng ký gửi theo trạng thái/kỳ, đánh giá dịch vụ, việc quá hạn' },
];

/**
 * Hộp thoại Xuất báo cáo Excel (tab Doanh thu): bộ lọc thời gian RIÊNG (độc lập với bộ lọc trên trang,
 * giống các biểu đồ khác) + tick chọn khối cần xuất. Bảng "Món đã bán" luôn có trong file, không có ô tick.
 */
export default function AdminExportExcelModal({ isOpen, onClose }) {
  const toast = useToast();
  const filter = useAdminPeriod('MONTH');
  const { activeRange, dateError } = filter;

  const [sections, setSections] = useState({ revenue: true, users: true, warehouse: true });
  const [exporting, setExporting] = useState(false);

  const toggleSection = (key) => setSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleExport = async () => {
    if (dateError) {
      toast.error(dateError);
      return;
    }
    try {
      setExporting(true);
      const { exportFrom, exportTo } = activeRange;
      const selected = SECTION_OPTIONS.filter((opt) => sections[opt.key]).map((opt) => opt.value);
      const blob = await adminApi.exportDashboard(exportFrom, exportTo, selected);

      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dashboard_report_${exportFrom}_${exportTo}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Đã xuất báo cáo Excel.');
      onClose?.();
    } catch (err) {
      console.error('Lỗi xuất báo cáo Excel:', err);
      toast.error('Không thể kết nối API xuất báo cáo Excel. Vui lòng kiểm tra lại quyền Admin hoặc kết nối mạng.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={exporting ? undefined : onClose} title="Xuất báo cáo Excel" size="md">
      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-[#1F2A37] mb-2">Khoảng thời gian</p>
          <AdminPeriodFilter filter={filter} name="xuất Excel" disabled={exporting} />
          {dateError && (
            <p role="alert" className="mt-2 text-xs font-semibold text-[#B91C1C]">
              {dateError}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-[#1F2A37] mb-2">Khối dữ liệu cần xuất</p>
          <div className="space-y-2">
            {SECTION_OPTIONS.map((opt) => (
              <label
                key={opt.key}
                className="flex items-start gap-2.5 p-2.5 rounded-xl border border-[#DDE5D9] bg-[#F6F9F4] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={sections[opt.key]}
                  onChange={() => toggleSection(opt.key)}
                  disabled={exporting}
                  className="mt-0.5 w-4 h-4 shrink-0"
                />
                <span>
                  <span className="block text-xs font-bold text-[#1F2A37]">{opt.label}</span>
                  <span className="block text-[11px] text-[#5B6776]">{opt.hint}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[#5B6776]">
            Danh sách món đã bán trong khoảng đã chọn luôn có trong file (sheet riêng).
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#DDE5D9]">
          <Button variant="ghost" onClick={onClose} disabled={exporting}>
            Hủy
          </Button>
          <Button onClick={handleExport} loading={exporting} disabled={Boolean(dateError)}>
            <span className="material-symbols-outlined text-[18px] mr-1.5">file_download</span>
            Xuất Excel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
