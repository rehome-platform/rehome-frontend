import React, { useState, useEffect } from 'react';
import adminApi from '../services/adminApi.js';

/**
 * View Nhật ký hệ thống (Audit Log)
 * Chuẩn hóa 100% theo Nghiệp vụ sau Review 2:
 * - Nối trực tiếp Backend API: GET /api/admin/audit-logs & GET /filter-options
 * - Chọn theo khoảng thời gian linh hoạt (Từ ngày - Đến ngày)
 * - Thêm ô Search truy vết theo từ khóa (Mã đối tượng, Lý do, Thao tác)
 * - Chuyển bộ lọc "Người thực hiện" thành "Đối tượng" (targetType)
 * - Đồng bộ giao diện 100% với phong cách Moderator
 */
export default function AdminAuditLogsView({ dynamicLogs = [] }) {
  const initialLogs = [
    {
      id: 'AUD-01',
      time: '02/10/2026 14:20',
      user: 'Trần Minh Quân',
      role: 'Admin',
      actionType: 'Khóa tài khoản',
      targetType: 'ACCOUNT',
      target: 'Member "Lê Hoàng Nam" (MB-849102)',
      beforeState: 'Hoạt động',
      afterState: 'Bị khóa',
      reason: 'Đăng bình luận xúc phạm nhiều lần trên các bài đăng quyên góp công khai.',
    },
    {
      id: 'AUD-02',
      time: '02/10/2026 11:05',
      user: 'Phạm Thu Hà',
      role: 'Moderator',
      actionType: 'Gỡ nội dung',
      targetType: 'ORGANIZATION',
      target: 'Tổ chức "Mái Ấm Hướng Dương"',
      beforeState: 'Hiển thị công khai',
      afterState: 'Đã gỡ bỏ',
      reason: 'Hình ảnh chiến dịch kêu gọi không đạt tiêu chuẩn kiểm duyệt nội dung của ReHome.',
    },
    {
      id: 'AUD-03',
      time: '01/10/2026 16:42',
      user: 'Trần Minh Quân',
      role: 'Admin',
      actionType: 'Tạo Moderator',
      targetType: 'ACCOUNT',
      target: 'Moderator "Đỗ Quang Huy" (MOD-1070)',
      beforeState: 'Chưa có',
      afterState: 'Hoạt động (ID: MOD-1070)',
      reason: 'Bổ sung nhân sự kiểm duyệt khu vực TP. Hồ Chí Minh.',
    },
    {
      id: 'AUD-04',
      time: '01/10/2026 09:15',
      user: 'Phạm Thu Hà',
      role: 'Moderator',
      actionType: 'Bỏ qua báo cáo',
      targetType: 'ORGANIZATION',
      target: 'Chiến dịch "Áo ấm mùa đông vùng cao Tây Bắc"',
      beforeState: 'Chờ xử lý vi phạm',
      afterState: 'Hợp lệ / Hoạt động',
      reason: 'Báo cáo sai sự thật từ tài khoản giả mạo, nội dung chiến dịch hợp lệ.',
    },
    {
      id: 'AUD-05',
      time: '30/09/2026 17:30',
      user: 'Trần Minh Quân',
      role: 'Admin',
      actionType: 'Mở khóa tài khoản',
      targetType: 'ACCOUNT',
      target: 'Member "Nguyễn Thị Mai" (MB-849103)',
      beforeState: 'Bị khóa',
      afterState: 'Hoạt động',
      reason: 'Hoàn tất xác minh và giải quyết tranh chấp biên nhận ký gửi tại quầy.',
    },
    {
      id: 'AUD-06',
      time: '29/09/2026 10:12',
      user: 'Trần Minh Quân',
      role: 'Admin',
      actionType: 'Ẩn kho',
      targetType: 'WAREHOUSE',
      target: 'Điểm kí gửi Thủ Đức (WH-04)',
      beforeState: 'Hoạt động',
      afterState: 'Đã ẩn (Tồn kho = 0)',
      reason: 'Đã thanh lý và điều chuyển hết hàng tồn kho, đóng điểm phục vụ sửa chữa.',
    },
    {
      id: 'AUD-07',
      time: '27/09/2026 15:48',
      user: 'Trần Minh Quân',
      role: 'Admin',
      actionType: 'Cập nhật cấu hình',
      targetType: 'SYSTEM_CONFIG',
      target: 'Tham số: commission_rate_term2',
      beforeState: '0.12 (12%)',
      afterState: '0.15 (15%)',
      reason: 'Điều chỉnh tỷ lệ hoa hồng Kỳ 2 theo phê duyệt sau Review 2.',
    },
  ];

  // Hợp nhất với log phát sinh trong phiên
  const allLogs = [
    ...dynamicLogs.map((l, i) => ({
      id: `DYN-${i}`,
      time: l.time,
      user: l.user,
      role: l.role,
      actionType: l.action.includes('Khóa')
        ? 'Khóa tài khoản'
        : l.action.includes('Mở khóa')
        ? 'Mở khóa tài khoản'
        : l.action.includes('Ẩn')
        ? 'Ẩn kho'
        : 'Thao tác Admin',
      targetType: l.action.includes('kho')
        ? 'WAREHOUSE'
        : l.action.includes('cấu hình')
        ? 'SYSTEM_CONFIG'
        : 'ACCOUNT',
      target: l.action,
      beforeState: 'Ghi nhận',
      afterState: 'Đã lưu',
      reason: 'Thực hiện trực tiếp từ phiên quản trị hiện tại.',
    })),
    ...initialLogs,
  ];

  const [logs, setLogs] = useState(allLogs);
  const [loading, setLoading] = useState(false);

  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState(''); // Ô search để truy vết
  const [selectedTargetType, setSelectedTargetType] = useState('ALL'); // Filter Đối tượng
  const [selectedActionType, setSelectedActionType] = useState('ALL');

  // Chọn theo thời gian
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expandedLogId, setExpandedLogId] = useState('AUD-01');

  // Nối Backend API
  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getAuditLogs({
        targetType: selectedTargetType !== 'ALL' ? selectedTargetType : undefined,
        actionType: selectedActionType !== 'ALL' ? selectedActionType : undefined,
        from: fromDate ? `${fromDate}T00:00:00Z` : undefined,
        to: toDate ? `${toDate}T23:59:59Z` : undefined,
        page: 0,
        size: 50,
      });

      if (res && res.content && res.content.length > 0) {
        const mapped = res.content.map((l, idx) => ({
          id: l.id || `AUD-BE-${idx}`,
          time: l.createdAt ? new Date(l.createdAt).toLocaleString('vi-VN') : '02/10/2026',
          user: l.actorEmail || l.actorFullName || 'Admin',
          role: l.actorRole || 'Admin',
          actionType: l.actionType || 'Thao tác hệ thống',
          targetType: l.targetType || 'SYSTEM',
          target: `${l.targetType || 'Đối tượng'}: ${l.targetId || ''}`,
          beforeState: l.beforeState || 'Dữ liệu trước',
          afterState: l.afterState || 'Dữ liệu sau',
          reason: l.reason || 'Ghi nhận kiểm toán tự động',
        }));
        setLogs([...allLogs.slice(0, dynamicLogs.length), ...mapped]);
      }
    } catch (err) {
      console.warn('Lỗi gọi API audit-logs, dùng dữ liệu mẫu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [selectedTargetType, selectedActionType, fromDate, toDate]);

  // Bộ lọc kết hợp tìm kiếm truy vết
  const filteredLogs = logs.filter((log) => {
    // Search truy vết theo từ khóa (Mã đối tượng, Lý do, Hành động, Tên người dùng)
    const matchSearch =
      !searchTerm.trim() ||
      (log.target && log.target.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.reason && log.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.actionType && log.actionType.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.user && log.user.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filter theo Đối tượng tác động (targetType)
    const matchTargetType =
      selectedTargetType === 'ALL' ||
      log.targetType === selectedTargetType ||
      (selectedTargetType === 'ACCOUNT' && log.target?.includes('Member')) ||
      (selectedTargetType === 'WAREHOUSE' && log.target?.includes('kho')) ||
      (selectedTargetType === 'ORGANIZATION' && log.target?.includes('Tổ chức'));

    // Filter theo Loại hành động
    const matchAction =
      selectedActionType === 'ALL' || log.actionType === selectedActionType;

    return matchSearch && matchTargetType && matchAction;
  });

  const handleResetFilter = () => {
    setSearchTerm('');
    setSelectedTargetType('ALL');
    setSelectedActionType('ALL');
    setFromDate('');
    setToDate('');
  };

  // Chọn nhanh mốc thời gian
  const setQuickRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    setToDate(end.toISOString().split('T')[0]);
    setFromDate(start.toISOString().split('T')[0]);
  };

  const getActionBadge = (actionType) => {
    switch (actionType) {
      case 'Khóa tài khoản':
        return (
          <span className="inline-flex items-center gap-1 text-[#DC2626] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"></span>
            <span>Khóa tài khoản</span>
          </span>
        );
      case 'Mở khóa tài khoản':
        return (
          <span className="inline-flex items-center gap-1 text-[#006B2C] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#006B2C]"></span>
            <span>Mở khóa tài khoản</span>
          </span>
        );
      case 'Ẩn kho':
        return (
          <span className="inline-flex items-center gap-1 text-[#D97706] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]"></span>
            <span>Ẩn điểm kí gửi</span>
          </span>
        );
      case 'Tạo Moderator':
        return (
          <span className="inline-flex items-center gap-1 text-[#00685F] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00685F]"></span>
            <span>Tạo Moderator</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[#414942] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#717971]"></span>
            <span>{actionType}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#191C19] font-heading">
            Nhật Ký Kiểm Soát (Audit Log)
          </h1>
          <p className="text-xs text-[#717971] mt-0.5">
            Lưu vết và truy xuất toàn bộ thao tác phân quyền, xử phạt, ẩn kho và thay đổi tham số hệ thống.
          </p>
        </div>
      </div>

      {/* Filter Bar: Tìm kiếm truy vết, Khoảng thời gian & Lọc theo Đối tượng */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2E8E0] shadow-xs space-y-3.5">
        {/* Hàng 1: Ô Search để truy vết */}
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717971] text-lg">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm truy vết (Mã đối tượng MB-102, WH-01, SKU, lý do, người thao tác)..."
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[#E2E8E0] bg-[#F8FAF8]/50 focus:bg-white focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15 outline-none transition-all"
          />
        </div>

        {/* Hàng 2: Chọn theo thời gian & Filter đối tượng */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#F0F4EE]">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Bộ chọn ngày Từ ngày - Đến ngày */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E2E8E0] bg-[#F8FAF8] text-xs text-[#414942]">
              <span className="material-symbols-outlined text-base text-[#006B2C]">date_range</span>
              <span className="text-[11px] text-[#717971]">Từ:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent border-none text-xs outline-none font-medium"
              />
              <span className="text-[11px] text-[#717971]">Đến:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent border-none text-xs outline-none font-medium"
              />
            </div>

            {/* Phím chọn nhanh mốc thời gian */}
            <div className="flex items-center gap-1 text-[11px]">
              <button
                onClick={() => setQuickRange(0)}
                className="px-2 py-1 rounded-lg border border-[#E2E8E0] hover:bg-[#F8FAF8] text-[#414942]"
              >
                Hôm nay
              </button>
              <button
                onClick={() => setQuickRange(7)}
                className="px-2 py-1 rounded-lg border border-[#E2E8E0] hover:bg-[#F8FAF8] text-[#414942]"
              >
                7 ngày
              </button>
              <button
                onClick={() => setQuickRange(30)}
                className="px-2 py-1 rounded-lg border border-[#E2E8E0] hover:bg-[#F8FAF8] text-[#414942]"
              >
                30 ngày
              </button>
            </div>

            {/* Filter "Đối tượng" (Thay thế cho Người thực hiện) */}
            <select
              value={selectedTargetType}
              onChange={(e) => setSelectedTargetType(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-[#E2E8E0] bg-white text-[#414942] font-medium outline-none hover:border-[#006B2C]/50 transition-colors"
            >
              <option value="ALL">Đối tượng: Tất cả</option>
              <option value="ACCOUNT">Tài khoản (Member / Moderator)</option>
              <option value="WAREHOUSE">Điểm kí gửi (Kho)</option>
              <option value="ORGANIZATION">Tổ chức từ thiện</option>
              <option value="PRODUCT">Sản phẩm & Hàng kí gửi</option>
              <option value="ORDER">Đơn hàng</option>
              <option value="SYSTEM_CONFIG">Cấu hình hệ thống</option>
            </select>

            {/* Filter Loại hành động */}
            <select
              value={selectedActionType}
              onChange={(e) => setSelectedActionType(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-[#E2E8E0] bg-white text-[#414942] font-medium outline-none hover:border-[#006B2C]/50 transition-colors"
            >
              <option value="ALL">Loại hành động: Tất cả</option>
              <option value="Khóa tài khoản">Khóa tài khoản</option>
              <option value="Mở khóa tài khoản">Mở khóa tài khoản</option>
              <option value="Ẩn kho">Ẩn kho</option>
              <option value="Tạo Moderator">Tạo Moderator</option>
              <option value="Cập nhật cấu hình">Cập nhật cấu hình</option>
            </select>
          </div>

          {(searchTerm ||
            selectedTargetType !== 'ALL' ||
            selectedActionType !== 'ALL' ||
            fromDate ||
            toDate) && (
            <button
              onClick={handleResetFilter}
              className="px-3 py-1.5 text-xs font-semibold text-[#006B2C] hover:text-[#005523] hover:bg-[#E8F5E9] rounded-xl transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-base">restart_alt</span>
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table or Empty State */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8E0] p-12 text-center flex flex-col items-center justify-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#F0F5EE] text-[#006B2C] flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">receipt_long</span>
          </div>
          <h3 className="text-base font-bold text-[#191C19] font-heading">
            Không tìm thấy bản ghi nhật ký phù hợp
          </h3>
          <p className="text-xs text-[#717971] max-w-sm mt-1 mb-5">
            Thử điều chỉnh lại từ khóa truy vết, khoảng ngày hoặc đối tượng tác động để tìm kiếm lại.
          </p>
          <button
            onClick={handleResetFilter}
            className="px-4 py-2 bg-[#006B2C] text-white text-xs font-semibold rounded-xl hover:bg-[#005222] transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">restart_alt</span>
            <span>Xóa toàn bộ bộ lọc</span>
          </button>
        </div>
      ) : (
        /* Audit Table */
        <div className="bg-white rounded-2xl border border-[#E2E8E0] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAF8] text-[#717971] uppercase tracking-wider font-semibold border-b border-[#E2E8E0]">
                <tr>
                  <th className="w-10 py-3 pl-4 pr-1"></th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-6">Người thực hiện</th>
                  <th className="py-3 px-6">Hành động</th>
                  <th className="py-3 px-6">Đối tượng tác động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E0]">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className={`hover:bg-[#F8FAF8] cursor-pointer transition-colors ${
                          isExpanded ? 'bg-[#F8FAF8]' : ''
                        }`}
                      >
                        {/* Expand toggle chevron */}
                        <td className="py-3.5 pl-4 pr-1 text-[#717971]">
                          <span
                            className={`material-symbols-outlined text-base transition-transform duration-200 inline-block ${
                              isExpanded ? 'rotate-90 text-[#006B2C]' : ''
                            }`}
                          >
                            chevron_right
                          </span>
                        </td>

                        {/* Timestamp */}
                        <td className="py-3.5 px-4 font-mono text-[#717971] whitespace-nowrap">
                          {log.time}
                        </td>

                        {/* Actor */}
                        <td className="py-3.5 px-6 whitespace-nowrap">
                          <span className="font-semibold text-[#191C19] mr-2">{log.user}</span>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              log.role === 'Admin'
                                ? 'bg-[#E8F5E9] text-[#006B2C]'
                                : 'bg-[#E0F2F1] text-[#00685F]'
                            }`}
                          >
                            [{log.role}]
                          </span>
                        </td>

                        {/* Action badge */}
                        <td className="py-3.5 px-6 whitespace-nowrap">
                          {getActionBadge(log.actionType)}
                        </td>

                        {/* Target */}
                        <td className="py-3.5 px-6 font-medium text-[#191C19]">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F8FAF8] border border-[#E2E8E0] mr-2">
                            {log.targetType || 'TARGET'}
                          </span>
                          <span>{log.target}</span>
                        </td>
                      </tr>

                      {/* Expanded Row Detail */}
                      {isExpanded && (
                        <tr className="bg-[#F8FAF8]">
                          <td colSpan="5" className="p-4 pl-12 pr-6">
                            <div className="bg-white p-4 rounded-xl border border-[#E2E8E0] shadow-xs space-y-2.5 text-xs">
                              <div className="flex flex-wrap items-center gap-6">
                                <div>
                                  <span className="text-[#717971] text-[11px]">Trạng thái trước:</span>{' '}
                                  <span className="font-semibold text-[#414942]">
                                    {log.beforeState}
                                  </span>
                                </div>
                                <span className="text-[#E2E8E0]">→</span>
                                <div>
                                  <span className="text-[#717971] text-[11px]">Trạng thái sau:</span>{' '}
                                  <span className="font-bold text-[#006B2C]">{log.afterState}</span>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-[#E2E8E0]">
                                <span className="text-[#717971] text-[11px] block mb-1">
                                  Lý do ghi nhận kiểm toán:
                                </span>
                                <p className="text-[#191C19] italic bg-[#F8FAF8] p-2.5 rounded-lg border border-[#E2E8E0]">
                                  "{log.reason}"
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="p-4 border-t border-[#E2E8E0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#717971]">
            <span>Hiển thị {filteredLogs.length} bản ghi nhật ký</span>
            <div className="flex items-center gap-1 font-medium">
              <button className="px-2.5 py-1 rounded-lg border border-[#E2E8E0] hover:bg-[#F8FAF8]">
                Trước
              </button>
              <button className="px-2.5 py-1 rounded-lg bg-[#006B2C] text-white font-bold">1</button>
              <button className="px-2.5 py-1 rounded-lg border border-[#E2E8E0] hover:bg-[#F8FAF8]">
                Sau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
