import React, { useState } from 'react';

/**
 * View Nhật ký hệ thống (Audit Log)
 * Thiết kế chính xác theo Google Stitch (Figma) Prototype:
 * - Read-only nghiêm ngặt: không có nút xóa/sửa/xuất
 * - Bộ lọc ngày (25/09/2026 - 02/10/2026), Người thực hiện, Loại hành động
 * - Mở rộng chi tiết từng dòng (Row expansion) xem trạng thái trước/sau và lý do
 * - Màn hình Empty State khi tìm kiếm không thấy bản ghi
 */
export default function AdminAuditLogsView({ dynamicLogs = [] }) {
  const initialLogs = [
    {
      id: 'AUD-01',
      time: '02/10/2026 14:20',
      user: 'Trần Minh Quân',
      role: 'Admin',
      actionType: 'Khóa tài khoản',
      actionText: 'Khóa tài khoản',
      target: 'Member "Lê Hoàng Nam"',
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
      actionText: 'Gỡ bài viết vi phạm',
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
      actionText: 'Tạo Moderator',
      target: 'Moderator "Đỗ Quang Huy"',
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
      actionText: 'Bỏ qua báo cáo',
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
      actionText: 'Mở khóa tài khoản',
      target: 'Member "Nguyễn Thị Mai"',
      beforeState: 'Bị khóa',
      afterState: 'Hoạt động',
      reason: 'Hoàn tất xác minh và giải quyết tranh chấp biên nhận ký gửi tại quầy.',
    },
    {
      id: 'AUD-06',
      time: '29/09/2026 10:12',
      user: 'Trần Minh Quân',
      role: 'Admin',
      actionType: 'Sửa Moderator',
      actionText: 'Sửa phân quyền Moderator',
      target: 'Moderator "Hoàng Anh Thư"',
      beforeState: 'Kiểm duyệt bài đăng',
      afterState: 'Kiểm duyệt bài đăng + Phân xử khiếu nại',
      reason: 'Phân công mở rộng phụ trách nhánh giải quyết tranh chấp.',
    },
    {
      id: 'AUD-07',
      time: '27/09/2026 15:48',
      user: 'Trần Minh Quân',
      role: 'Admin',
      actionType: 'Đặt lại mật khẩu',
      actionText: 'Đặt lại mật khẩu',
      target: 'Moderator "Lý Gia Bảo"',
      beforeState: 'Bình thường',
      afterState: 'Yêu cầu đổi mật khẩu ở lần đăng nhập tới',
      reason: 'Hỗ trợ cấp lại mã truy cập sau sự cố quên thông tin.',
    },
    {
      id: 'AUD-08',
      time: '25/09/2026 08:30',
      user: 'Trần Minh Quân',
      role: 'Admin',
      actionType: 'Khóa tài khoản',
      actionText: 'Khóa tài khoản',
      target: 'Moderator "Bùi Đức Thịnh"',
      beforeState: 'Hoạt động',
      afterState: 'Bị khóa',
      reason: 'Tạm đình chỉ nhiệm vụ do vi phạm quy chế bảo mật thông tin đối tác.',
    },
  ];

  // Hợp nhất với các hành động vừa thực hiện trong phiên
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
        : 'Tạo Moderator',
      actionText: l.action,
      target: 'Tài khoản người dùng',
      beforeState: 'Thay đổi',
      afterState: 'Áp dụng ngay',
      reason: 'Thực hiện trực tiếp từ giao diện điều hành.',
    })),
    ...initialLogs,
  ];

  const [dateRange, setDateRange] = useState('25/09/2026 - 02/10/2026');
  const [selectedActor, setSelectedActor] = useState('ALL');
  const [selectedActionType, setSelectedActionType] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState('AUD-01'); // Mặc định mở dòng đầu tiên như Stitch

  const filteredLogs = allLogs.filter((log) => {
    const matchActor =
      selectedActor === 'ALL' || log.user.toLowerCase().includes(selectedActor.toLowerCase());
    const matchType =
      selectedActionType === 'ALL' || log.actionType === selectedActionType;
    return matchActor && matchType;
  });

  const handleResetFilter = () => {
    setSelectedActor('ALL');
    setSelectedActionType('ALL');
    setDateRange('25/09/2026 - 02/10/2026');
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
            Nhật ký hệ thống
          </h1>
          <p className="text-xs text-[#717971] mt-0.5">
            Ghi lại các thao tác của Admin và Moderator. Chỉ xem, không thể chỉnh sửa.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#DDE5D9] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker Button */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#DDE5D9] bg-[#F6F9F4] text-xs font-medium text-[#414942]">
            <span className="material-symbols-outlined text-base text-[#006B2C]">
              date_range
            </span>
            <span>{dateRange}</span>
          </div>

          {/* Actor Select */}
          <select
            value={selectedActor}
            onChange={(e) => setSelectedActor(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-[#DDE5D9] bg-white text-[#414942] font-medium outline-none hover:border-[#006B2C]/50 transition-colors"
          >
            <option value="ALL">Người thực hiện: Tất cả</option>
            <option value="Trần Minh Quân">Trần Minh Quân (Admin)</option>
            <option value="Phạm Thu Hà">Phạm Thu Hà (Moderator)</option>
          </select>

          {/* Action Type Select */}
          <select
            value={selectedActionType}
            onChange={(e) => setSelectedActionType(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-[#DDE5D9] bg-white text-[#414942] font-medium outline-none hover:border-[#006B2C]/50 transition-colors"
          >
            <option value="ALL">Loại hành động: Tất cả</option>
            <option value="Khóa tài khoản">Khóa tài khoản</option>
            <option value="Mở khóa tài khoản">Mở khóa tài khoản</option>
            <option value="Tạo Moderator">Tạo Moderator</option>
            <option value="Sửa Moderator">Sửa Moderator</option>
            <option value="Đặt lại mật khẩu">Đặt lại mật khẩu</option>
            <option value="Gỡ nội dung">Gỡ nội dung</option>
            <option value="Bỏ qua báo cáo">Bỏ qua báo cáo</option>
          </select>
        </div>

        {(selectedActor !== 'ALL' || selectedActionType !== 'ALL') && (
          <button
            onClick={handleResetFilter}
            className="px-3 py-2 text-xs font-semibold text-[#006B2C] hover:text-[#005523] hover:bg-[#E8F5E9] rounded-xl transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-base">restart_alt</span>
            <span>Xóa bộ lọc</span>
          </button>
        )}
      </div>

      {/* Main Table or Empty State */}
      {filteredLogs.length === 0 ? (
        /* Empty State Matching Stitch Specification */
        <div className="bg-white rounded-2xl border border-[#DDE5D9] p-12 text-center flex flex-col items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <div className="w-16 h-16 rounded-2xl bg-[#E8F5E9] text-[#006B2C] flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">receipt_long</span>
          </div>
          <h3 className="text-base font-bold text-[#191C19] font-heading">
            Không có bản ghi nào trong khoảng thời gian này
          </h3>
          <p className="text-xs text-[#717971] max-w-sm mt-1 mb-5">
            Thử điều chỉnh lại khoảng ngày hoặc chọn lại loại hành động để tìm kiếm nhật ký.
          </p>
          <button
            onClick={handleResetFilter}
            className="px-4 py-2 bg-[#006B2C] text-white text-xs font-semibold rounded-xl hover:bg-[#005523] transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">filter_alt_off</span>
            <span>Xóa bộ lọc</span>
          </button>
        </div>
      ) : (
        /* Audit Table */
        <div className="bg-white rounded-2xl border border-[#DDE5D9] shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F9F4] text-[#717971] uppercase tracking-wider font-semibold border-b border-[#DDE5D9]">
                <tr>
                  <th className="w-10 py-3 pl-4 pr-1"></th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-6">Người thực hiện</th>
                  <th className="py-3 px-6">Hành động</th>
                  <th className="py-3 px-6">Đối tượng tác động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE5D9]">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() =>
                          setExpandedLogId(isExpanded ? null : log.id)
                        }
                        className={`hover:bg-[#F6F9F4]/70 cursor-pointer transition-colors ${
                          isExpanded ? 'bg-[#F6F9F4]/50' : ''
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
                          <span className="font-semibold text-[#191C19] mr-2">
                            {log.user}
                          </span>
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
                          {log.target}
                        </td>
                      </tr>

                      {/* Expanded Row Detail */}
                      {isExpanded && (
                        <tr className="bg-[#F6F9F4]/70">
                          <td colSpan="5" className="p-4 pl-12 pr-6">
                            <div className="bg-white p-4 rounded-xl border border-[#DDE5D9] shadow-xs space-y-2.5 text-xs">
                              <div className="flex flex-wrap items-center gap-6">
                                <div>
                                  <span className="text-[#717971] text-[11px]">
                                    Trạng thái trước:
                                  </span>{' '}
                                  <span className="font-semibold text-[#414942]">
                                    {log.beforeState}
                                  </span>
                                </div>
                                <span className="text-[#DDE5D9]">→</span>
                                <div>
                                  <span className="text-[#717971] text-[11px]">
                                    Trạng thái sau:
                                  </span>{' '}
                                  <span className="font-bold text-[#006B2C]">
                                    {log.afterState}
                                  </span>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-[#DDE5D9]/60">
                                <span className="text-[#717971] text-[11px] block mb-1">
                                  Lý do ghi nhận kiểm toán:
                                </span>
                                <p className="text-[#191C19] italic bg-[#F6F9F4] p-2.5 rounded-lg border border-[#DDE5D9]/50">
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

          {/* Pagination bar matching Stitch */}
          <div className="p-4 border-t border-[#DDE5D9] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#717971]">
            <span>Hiển thị 1 - {filteredLogs.length} trong tổng số 126 bản ghi</span>
            <div className="flex items-center gap-1 font-medium">
              <button className="px-2.5 py-1 rounded-lg border border-[#DDE5D9] hover:bg-[#F6F9F4]">
                Trước
              </button>
              <button className="px-2.5 py-1 rounded-lg bg-[#006B2C] text-white font-bold">
                1
              </button>
              <button className="px-2.5 py-1 rounded-lg border border-[#DDE5D9] hover:bg-[#F6F9F4]">
                2
              </button>
              <button className="px-2.5 py-1 rounded-lg border border-[#DDE5D9] hover:bg-[#F6F9F4]">
                3
              </button>
              <span className="px-1 text-[#717971]">...</span>
              <button className="px-2.5 py-1 rounded-lg border border-[#DDE5D9] hover:bg-[#F6F9F4]">
                16
              </button>
              <button className="px-2.5 py-1 rounded-lg border border-[#DDE5D9] hover:bg-[#F6F9F4]">
                Sau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
