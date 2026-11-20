import React, { useState, useEffect } from 'react';
import adminApi from '../services/adminApi.js';
import AdminPeriodFilter from './AdminPeriodFilter.jsx';
import useAdminPeriod from '../hooks/useAdminPeriod.js';
import { Spinner } from '../../../components/common/index.js';

// Nhãn gọn cho Đối tượng tác động hiển thị trên bảng (chi tiết đầy đủ nằm ở hàng xổ xuống)
const TARGET_TYPE_LABEL = {
  SYSTEM: 'Hệ thống',
  ACCOUNT: 'Tài khoản',
  ORGANIZATION_ACCOUNT: 'Hồ sơ tổ chức',
  POST: 'Bài viết',
  CAMPAIGN: 'Chiến dịch',
  WAREHOUSE: 'Địa điểm ký gửi',
  ORGANIZATION: 'Tổ chức',
  PRODUCT: 'Sản phẩm',
  ORDER: 'Đơn hàng',
  SYSTEM_CONFIG: 'Cấu hình hệ thống',
  MEMBERSHIP_PLAN: 'Gói thành viên',
  MEMBER_SUBSCRIPTION: 'Đăng ký thành viên',
  VOUCHER_TEMPLATE: 'Voucher',
  RECEIPT_CLAUSE_TEMPLATE: 'Điều khoản biên nhận',
  VIOLATION_WORD: 'Từ ngữ vi phạm',
  CONTENT_REVIEW: 'Nội dung bị gắn cờ',
};

// Mốc lọc nhanh theo phút gần nhất (độ chính xác phút, nằm ngoài phạm vi ngày của AdminPeriodFilter)
const QUICK_MINUTES_OPTIONS = [
  { value: 5, label: '5 phút trước' },
  { value: 10, label: '10 phút trước' },
  { value: 30, label: '30 phút trước' },
];

/**
 * View Audit Log
 * Chuẩn hóa 100% theo Nghiệp vụ sau Review 2:
 * - Nối trực tiếp Backend API: GET /api/admin/audit-logs & GET /api/admin/audit-logs/filter-options
 * - Chọn theo khoảng thời gian dùng chung bộ lọc Admin (xem useAdminPeriod/AdminPeriodFilter),
 *   có thêm lọc theo giờ:phút, hoặc lọc nhanh N phút gần nhất
 * - Chuyển bộ lọc "Người thực hiện" thành "Đối tượng" (targetType)
 * - Đồng bộ giao diện 100% với phong cách Moderator
 */
export default function AdminAuditLogsView({ dynamicLogs = [] }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableActionTypes, setAvailableActionTypes] = useState([]);

  // Bộ lọc
  const [actorSearch, setActorSearch] = useState(''); // Filter Người thực hiện (tên/email, khớp ở backend)
  const [selectedActorRole, setSelectedActorRole] = useState('ALL'); // Filter vai trò người thực hiện
  const [selectedTargetType, setSelectedTargetType] = useState('ALL'); // Filter Đối tượng tác động
  const [selectedActionType, setSelectedActionType] = useState('ALL');

  // Chọn theo thời gian (dùng chung bộ lọc Admin) + lọc thêm theo giờ:phút trong khoảng ngày,
  // hoặc chọn nhanh "N phút gần nhất" (ghi đè khoảng ngày khi đang bật)
  const dateFilter = useAdminPeriod('ALL');
  const { activeRange, dateError } = dateFilter;
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');
  const [quickMinutes, setQuickMinutes] = useState(null);
  const hasDateRange = Boolean(activeRange.apiFrom || activeRange.apiTo);

  const [expandedLogId, setExpandedLogId] = useState(null);

  // Tải danh sách filter options từ backend
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const options = await adminApi.getAuditLogFilterOptions();
        if (options && options.actionTypes) {
          setAvailableActionTypes(options.actionTypes);
        }
      } catch (err) {
        console.warn('Lỗi tải filter-options audit-logs:', err);
      }
    };
    loadFilterOptions();
  }, []);

  // Format nhãn hành động sang tiếng Việt thân thiện
  const formatActionLabel = (actionType) => {
    switch (actionType) {
      case 'BAN_ACCOUNT':
      case 'Khóa tài khoản':
        return 'Khóa tài khoản';
      case 'UNBAN_ACCOUNT':
      case 'Mở khóa tài khoản':
        return 'Mở khóa tài khoản';
      case 'HIDE_WAREHOUSE':
      case 'Ẩn kho':
        return 'Ẩn địa điểm ký gửi';
      case 'UNHIDE_WAREHOUSE':
        return 'Mở hoạt động lại địa điểm ký gửi';
      case 'CREATE_WAREHOUSE':
      case 'Tạo kho':
        return 'Tạo địa điểm ký gửi';
      case 'UPDATE_WAREHOUSE':
        return 'Cập nhật điểm ký gửi';
      case 'CREATE_MODERATOR':
      case 'Tạo Moderator':
        return 'Tạo Moderator';
      case 'UPDATE_MODERATOR':
        return 'Cập nhật Moderator';
      case 'CHANGE_WAREHOUSE':
      case 'ASSIGN_WAREHOUSE':
      case 'CHANGE_MODERATOR_WAREHOUSE':
        return 'Phân công địa điểm ký gửi';
      case 'CREATE_RECEIPT_CLAUSE_TEMPLATE':
        return 'Thêm điều khoản biên nhận';
      case 'UPDATE_RECEIPT_CLAUSE_TEMPLATE':
        return 'Cập nhật điều khoản biên nhận';
      case 'DELETE_RECEIPT_CLAUSE_TEMPLATE':
        return 'Xóa điều khoản biên nhận';
      case 'TOGGLE_RECEIPT_CLAUSE_TEMPLATE':
        return 'Bật/tắt điều khoản biên nhận';
      case 'CREATE_VIOLATION_WORD':
        return 'Thêm từ ngữ vi phạm';
      case 'UPDATE_VIOLATION_WORD':
        return 'Cập nhật từ ngữ vi phạm';
      case 'DELETE_VIOLATION_WORD':
        return 'Xóa từ ngữ vi phạm';
      case 'TOGGLE_VIOLATION_WORD':
        return 'Bật/tắt từ ngữ vi phạm';
      case 'UPDATE_CONFIG':
      case 'Cập nhật cấu hình':
        return 'Cập nhật cấu hình';
      case 'RESOLVE_VIOLATION':
        return 'Xử lý vi phạm';
      case 'VIOLATION_RESOLVE_REMOVE_POST':
        return 'Gỡ bài viết vi phạm';
      case 'VIOLATION_RESOLVE_HIDE_CAMPAIGN':
        return 'Ẩn chiến dịch vi phạm';
      case 'VIOLATION_RESOLVE_WARN_ORG':
        return 'Cảnh cáo tổ chức';
      case 'VIOLATION_RESOLVE_PROPOSE_BAN':
        return 'Đề xuất khóa tổ chức (Moderator)';
      case 'VIOLATION_DISMISS':
        return 'Bác bỏ báo cáo vi phạm';
      case 'UPDATE_MEMBERSHIP_PLAN':
        return 'Cập nhật gói thành viên';
      case 'GRANT_MEMBERSHIP':
        return 'Tặng gói thành viên';
      case 'CANCEL_MEMBERSHIP':
        return 'Hủy gói thành viên';
      case 'UPDATE_VOUCHER_TEMPLATE':
        return 'Cập nhật mẫu voucher';
      case 'DEACTIVATE_VOUCHER_TEMPLATE':
        return 'Ngưng kích hoạt mẫu voucher';
      case 'CONTENT_REVIEW_APPROVED':
        return 'Duyệt nội dung cộng đồng';
      case 'CONTENT_REVIEW_REJECTED':
        return 'Từ chối nội dung cộng đồng';
      case 'CONTENT_AUTO_FLAG':
        return 'Tự động gắn cờ nội dung vi phạm';
      case 'CONTENT_NOTIFY_ADMIN':
        return 'Thông báo Admin về nội dung nghi vi phạm';
      case 'DONATE_CONSIGNED_ITEM':
        return 'Quyên góp hàng ký gửi';
      // Giá trị cũ còn lưu trong DB từ trước khi đổi tên hành động, không còn được code hiện tại sinh ra
      // nhưng vẫn phải dịch để không lộ tiếng Anh với log cũ
      case 'CREATE_ORDER':
        return 'Tạo đơn hàng';
      case 'REMOVE_POST':
        return 'Gỡ bài viết vi phạm';
      default:
        if (typeof actionType === 'string' && actionType.startsWith('CONTENT_REVIEW_')) {
          return 'Duyệt nội dung cộng đồng';
        }
        return actionType || 'Thao tác hệ thống';
    }
  };

  // Tách chuỗi thời gian đã định dạng sẵn (log phiên hiện tại) thành phần ngày / giờ để hiển thị 2 dòng gọn
  const splitTimeLabel = (formatted) => {
    if (!formatted) return { dateStr: '—', timeStr: '' };
    const parts = String(formatted).split(/,\s*|\s+/).filter(Boolean);
    return { dateStr: parts[0] || formatted, timeStr: parts.slice(1).join(' ') };
  };

  // Ghép khoảng ngày (useAdminPeriod) với giờ:phút chọn thêm thành mốc ISO gửi API;
  // "N phút gần nhất" (quickMinutes) ghi đè hoàn toàn khoảng ngày/giờ phía trên khi đang bật.
  const buildRequestRange = () => {
    if (quickMinutes) {
      const now = new Date();
      const from = new Date(now.getTime() - quickMinutes * 60000);
      return { from: from.toISOString(), to: now.toISOString() };
    }
    const toIsoLocal = (dateStr, timeStr, seconds) => {
      if (!dateStr) return undefined;
      const d = new Date(`${dateStr}T${timeStr}:${seconds}`);
      return Number.isNaN(d.getTime()) ? `${dateStr}T${timeStr}:${seconds}Z` : d.toISOString();
    };
    const from = toIsoLocal(activeRange.apiFrom, fromTime || '00:00', '00');
    const to = toIsoLocal(activeRange.apiTo, toTime || '23:59', '59');
    return { from, to };
  };

  // Nối Backend API lấy real data
  const fetchAuditLogs = async () => {
    if (dateError) return;
    try {
      setLoading(true);
      const params = {
        page: 0,
        size: 50,
      };
      if (actorSearch.trim()) params.search = actorSearch.trim();
      if (selectedActorRole !== 'ALL') params.actorRole = selectedActorRole;
      if (selectedTargetType !== 'ALL') params.targetType = selectedTargetType;
      if (selectedActionType !== 'ALL') params.actionType = selectedActionType;
      const { from, to } = buildRequestRange();
      if (from) params.from = from;
      if (to) params.to = to;

      const res = await adminApi.getAuditLogs(params);
      const rawList = Array.isArray(res) ? res : res?.content || [];

      const mapped = rawList.map((l, idx) => {
        let beforeState = '—';
        let afterState = '—';
        let reason = 'Ghi nhận kiểm toán tự động';

        if (l.detail) {
          if (typeof l.detail === 'object') {
            beforeState = l.detail.beforeStatus || l.detail.beforeState || l.detail.oldValue || '—';
            afterState = l.detail.afterStatus || l.detail.afterState || l.detail.newValue || '—';
            if (typeof l.actionType === 'string' && l.actionType.startsWith('VIOLATION_')) {
              const count = l.detail.closedReportCount ?? 1;
              if (beforeState === '—') beforeState = 'PENDING';
              if (afterState === '—') {
                afterState =
                  l.actionType === 'VIOLATION_DISMISS'
                    ? `DISMISSED (${count} báo cáo)`
                    : `RESOLVED (${count} báo cáo)`;
              }
            }
            reason = l.detail.reason || l.detail.note || l.detail.message || JSON.stringify(l.detail);
          } else {
            reason = String(l.detail);
          }
        }

        const createdAt = l.createdAt ? new Date(l.createdAt) : null;

        return {
          id: l.id || `AUD-BE-${idx}`,
          time: createdAt ? createdAt.toLocaleString('vi-VN') : '—',
          dateStr: createdAt ? createdAt.toLocaleDateString('vi-VN') : '—',
          timeStr: createdAt ? createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '',
          user: l.actorName || l.actorEmail || (l.actorRole ? `Tài khoản ${l.actorRole}` : 'Quản trị viên'),
          role: l.actorRole || 'ADMIN',
          actionType: formatActionLabel(l.actionType),
          rawActionType: l.actionType,
          targetType: l.targetType || 'SYSTEM',
          target: l.targetId ? `${l.targetType || 'Đối tượng'}: ${l.targetId}` : (l.targetType || 'Hệ thống'),
          beforeState,
          afterState,
          reason,
        };
      });

      // Hợp nhất với các dynamic logs phát sinh trong phiên làm việc hiện tại
      const sessionLogs = dynamicLogs.map((l, i) => {
        const formattedTime = l.time || new Date().toLocaleString('vi-VN');
        return {
          id: `DYN-${i}`,
          time: formattedTime,
          ...splitTimeLabel(formattedTime),
          user: l.user || 'Admin',
          role: l.role || 'ADMIN',
          actionType: formatActionLabel(l.action || 'Thao tác Admin'),
          rawActionType: l.action,
          targetType: /kho|ký gửi|kí gửi|WAREHOUSE/i.test(l.action || '')
            ? 'WAREHOUSE'
            : l.action?.includes('cấu hình')
              ? 'SYSTEM_CONFIG'
              : 'ACCOUNT',
          target: l.action,
          beforeState: '—',
          afterState: '—',
          reason: 'Thực hiện trực tiếp từ phiên quản trị hiện tại.',
        };
      });

      const combined = [...sessionLogs, ...mapped];
      setLogs(combined);
    } catch (err) {
      console.warn('Lỗi gọi API audit-logs:', err);
      // Giữ lại các log động trong phiên nếu backend tạm thời lỗi
      const sessionLogs = dynamicLogs.map((l, i) => {
        const formattedTime = l.time || new Date().toLocaleString('vi-VN');
        return {
          id: `DYN-${i}`,
          time: formattedTime,
          ...splitTimeLabel(formattedTime),
          user: l.user || 'Admin',
          role: l.role || 'ADMIN',
          actionType: formatActionLabel(l.action || 'Thao tác Admin'),
          rawActionType: l.action,
          targetType: 'SYSTEM',
          target: l.action,
          beforeState: '—',
          afterState: '—',
          reason: 'Thực hiện trực tiếp từ phiên quản trị hiện tại.',
        };
      });
      setLogs(sessionLogs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Gõ "Người thực hiện" mới cần chờ gõ xong rồi mới gọi API; các bộ lọc khác (select/ngày) áp dụng ngay
    const timer = setTimeout(fetchAuditLogs, actorSearch ? 400 : 0);
    return () => clearTimeout(timer);
  }, [
    actorSearch,
    selectedActorRole,
    selectedTargetType,
    selectedActionType,
    activeRange.apiFrom,
    activeRange.apiTo,
    fromTime,
    toTime,
    quickMinutes,
    dynamicLogs.length,
    dateError,
  ]);

  // Bộ lọc theo Vai trò / Đối tượng / Loại hành động (thời gian đã lọc ở phía API)
  const filteredLogs = logs.filter((log) => {
    const matchActorRole = selectedActorRole === 'ALL' || log.role === selectedActorRole;

    // Filter theo Đối tượng tác động (targetType)
    const matchTargetType =
      selectedTargetType === 'ALL' ||
      log.targetType === selectedTargetType ||
      (selectedTargetType === 'ACCOUNT' && log.target?.includes('Member')) ||
      (selectedTargetType === 'WAREHOUSE' && /kho|ký gửi|kí gửi/i.test(log.target || '')) ||
      (selectedTargetType === 'ORGANIZATION' && log.target?.includes('Tổ chức'));

    // Filter theo Loại hành động
    const matchAction =
      selectedActionType === 'ALL' ||
      log.actionType === selectedActionType ||
      log.rawActionType === selectedActionType;

    return matchActorRole && matchTargetType && matchAction;
  });

  // Phân trang thực tế
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedActorRole, selectedTargetType, selectedActionType, activeRange.apiFrom, activeRange.apiTo, fromTime, toTime, quickMinutes]);

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleResetFilter = () => {
    setActorSearch('');
    setSelectedActorRole('ALL');
    setSelectedTargetType('ALL');
    setSelectedActionType('ALL');
    dateFilter.setPeriod('ALL');
    setFromTime('');
    setToTime('');
    setQuickMinutes(null);
  };

  // Chọn (hoặc bỏ chọn nếu bấm lại) một mốc lọc nhanh N phút gần nhất; tắt thì quay lại bộ lọc ngày/giờ phía trên
  const toggleQuickMinutes = (value) => {
    setQuickMinutes((prev) => (prev === value ? null : value));
  };

  const getActionBadge = (actionType) => {
    if (actionType.includes('Khóa tài khoản')) {
      return (
        <span className="inline-flex items-center gap-1 text-[#DC2626] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] shrink-0"></span>
          <span className="truncate">Khóa tài khoản</span>
        </span>
      );
    }
    if (actionType.includes('Mở khóa tài khoản')) {
      return (
        <span className="inline-flex items-center gap-1 text-[#006B2C] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#006B2C] shrink-0"></span>
          <span className="truncate">Mở khóa tài khoản</span>
        </span>
      );
    }
    if (actionType.includes('Ẩn địa điểm') || actionType.includes('Ẩn kho')) {
      return (
        <span className="inline-flex items-center gap-1 text-[#D97706] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] shrink-0"></span>
          <span className="truncate">Ẩn điểm kí gửi</span>
        </span>
      );
    }
    if (actionType.includes('Tạo Moderator') || actionType.includes('Tạo địa điểm') || actionType.includes('Tạo kho')) {
      return (
        <span className="inline-flex items-center gap-1 text-[#00685F] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00685F] shrink-0"></span>
          <span className="truncate">{actionType}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[#414942] font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-[#717971] shrink-0"></span>
        <span className="truncate">{actionType}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {dateError && (
        <div
          role="alert"
          className="px-4 py-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-xs font-semibold text-[#B91C1C]"
        >
          {dateError}
        </div>
      )}

      {/* Filter Bar: Khoảng thời gian & Lọc theo Đối tượng */}
      <div className="bg-white p-5 rounded-2xl border border-[#E2E8E0] shadow-xs space-y-3.5">
        {/* Hàng 1: Khoảng thời gian (dùng chung) + Từ giờ/Đến giờ + lọc nhanh N phút gần nhất, cùng một hàng */}
        <AdminPeriodFilter filter={dateFilter} name="audit log" label="Khoảng thời gian">
          <label className={`flex items-center gap-2 text-xs text-[#414942] ${!hasDateRange || quickMinutes ? 'opacity-40' : ''}`}>
            <span className="shrink-0">Từ giờ</span>
            <input
              type="time"
              aria-label="Từ giờ audit log"
              value={fromTime}
              onChange={(e) => {
                setFromTime(e.target.value);
                setQuickMinutes(null);
              }}
              disabled={!hasDateRange || Boolean(quickMinutes)}
              className="rounded-xl border border-[#E2E8E0] bg-white px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#006B2C]/30 disabled:opacity-50"
            />
          </label>
          <label className={`flex items-center gap-2 text-xs text-[#414942] ${!hasDateRange || quickMinutes ? 'opacity-40' : ''}`}>
            <span className="shrink-0">Đến giờ</span>
            <input
              type="time"
              aria-label="Đến giờ audit log"
              value={toTime}
              onChange={(e) => {
                setToTime(e.target.value);
                setQuickMinutes(null);
              }}
              disabled={!hasDateRange || Boolean(quickMinutes)}
              className="rounded-xl border border-[#E2E8E0] bg-white px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#006B2C]/30 disabled:opacity-50"
            />
          </label>

          <div className="flex items-end gap-1.5">
            {QUICK_MINUTES_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleQuickMinutes(opt.value)}
                className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold border transition-colors ${quickMinutes === opt.value
                    ? 'bg-[#006B2C] text-white border-[#006B2C]'
                    : 'bg-white text-[#414942] border-[#E2E8E0] hover:border-[#006B2C]/50'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </AdminPeriodFilter>

        {/* Hàng 2: Lọc Đối tượng / Loại hành động & hành động phụ */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#F0F4EE]">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter "Người thực hiện": tìm theo tên hoặc email, backend tự khớp cả tên tổ chức */}
            <input
              type="text"
              value={actorSearch}
              onChange={(e) => setActorSearch(e.target.value)}
              placeholder="Người thực hiện (tên hoặc email)"
              aria-label="Lọc theo người thực hiện"
              className="px-3 py-2 text-xs rounded-xl border border-[#E2E8E0] bg-white text-[#414942] font-medium outline-none hover:border-[#006B2C]/50 transition-colors w-56"
            />

            {/* Filter vai trò của người thực hiện */}
            <select
              value={selectedActorRole}
              onChange={(e) => setSelectedActorRole(e.target.value)}
              aria-label="Lọc theo vai trò người thực hiện"
              className="px-3 py-2 text-xs rounded-xl border border-[#E2E8E0] bg-white text-[#414942] font-medium outline-none hover:border-[#006B2C]/50 transition-colors"
            >
              <option value="ALL">Vai trò: Tất cả</option>
              <option value="MEMBER">Member</option>
              <option value="MODERATOR">Moderator</option>
              <option value="ADMIN">Admin</option>
            </select>

            {/* Filter "Đối tượng tác động" */}
            <select
              value={selectedTargetType}
              onChange={(e) => setSelectedTargetType(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-[#E2E8E0] bg-white text-[#414942] font-medium outline-none hover:border-[#006B2C]/50 transition-colors"
            >
              <option value="ALL">Đối tượng tác động: Tất cả</option>
              {Object.entries(TARGET_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            {/* Filter Loại hành động */}
            <select
              value={selectedActionType}
              onChange={(e) => setSelectedActionType(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-[#E2E8E0] bg-white text-[#414942] font-medium outline-none hover:border-[#006B2C]/50 transition-colors"
            >
              <option value="ALL">Loại hành động: Tất cả</option>
              {availableActionTypes.map((act) => (
                <option key={act} value={act}>
                  {formatActionLabel(act)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAuditLogs}
              disabled={loading}
              className="px-3 py-1.5 text-xs font-semibold text-[#006B2C] hover:bg-[#E8F5E9] rounded-xl transition-colors flex items-center gap-1 border border-[#006B2C]/30"
              title="Làm mới nhật ký"
            >
              <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>
                refresh
              </span>
              <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
            </button>

            {(actorSearch ||
              selectedActorRole !== 'ALL' ||
              selectedTargetType !== 'ALL' ||
              selectedActionType !== 'ALL' ||
              dateFilter.period !== 'ALL' ||
              fromTime ||
              toTime ||
              quickMinutes) && (
                <button
                  onClick={handleResetFilter}
                  className="px-3 py-1.5 text-xs font-semibold text-[#717971] hover:text-[#191C19] hover:bg-[#F0F4EE] rounded-xl transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-base">restart_alt</span>
                  <span>Xóa bộ lọc</span>
                </button>
              )}
          </div>
        </div>
      </div>

      {/* Main Table or Empty State */}
      {loading && logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8E0] p-12 text-center flex flex-col items-center justify-center shadow-xs gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-[#717971]">Đang tải dữ liệu Audit Log từ hệ thống...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E2E8E0] p-12 text-center flex flex-col items-center justify-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#F0F5EE] text-[#006B2C] flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">receipt_long</span>
          </div>
          <h3 className="text-base font-bold text-[#191C19] font-heading">
            Không tìm thấy bản ghi nhật ký phù hợp
          </h3>
          <p className="text-xs text-[#717971] max-w-sm mt-1 mb-5">
            Thử điều chỉnh lại khoảng thời gian hoặc đối tượng tác động để tìm kiếm lại.
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
        /* Audit Table - gọn, mỗi ô một dòng, chi tiết đầy đủ nằm trong hàng mở rộng */
        <div
          className={`bg-white rounded-2xl border border-[#E2E8E0] shadow-xs overflow-hidden transition-opacity duration-150 ${loading ? 'opacity-60 pointer-events-none' : ''
            }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-xs">
              <thead className="bg-[#F8FAF8] text-[#5B6776] tracking-wider font-semibold border-b border-[#E2E8E0]">
                <tr>
                  <th className="w-[4%] py-2.5 pl-4 pr-1"></th>
                  <th className="w-[12%] py-2.5 px-3 whitespace-nowrap">Thời gian</th>
                  <th className="w-[20%] py-2.5 px-3 whitespace-nowrap">Người thực hiện</th>
                  <th className="w-[16%] py-2.5 px-3 whitespace-nowrap">Đối tượng tác động</th>
                  <th className="w-[48%] py-2.5 px-3 whitespace-nowrap">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E0]">
                {paginatedLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className={`hover:bg-[#F8FAF8] cursor-pointer transition-colors ${isExpanded ? 'bg-[#F8FAF8]' : ''
                          }`}
                      >
                        {/* Expand toggle chevron (hỗ trợ bàn phím Enter/Space) */}
                        <td className="py-2.5 pl-4 pr-1 text-[#5B6776] align-middle">
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? 'Thu gọn chi tiết nhật ký' : 'Xem chi tiết nhật ký'}
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedLogId(isExpanded ? null : log.id);
                            }}
                            className="inline-flex items-center justify-center rounded-md p-0.5 hover:bg-[#EBF1E8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006B2C]/40"
                          >
                            <span
                              aria-hidden="true"
                              className={`material-symbols-outlined text-base transition-transform duration-200 inline-block ${isExpanded ? 'rotate-90 text-[#006B2C]' : ''
                                }`}
                            >
                              chevron_right
                            </span>
                          </button>
                        </td>

                        {/* Timestamp: tách 2 dòng ngày/giờ để luôn hiện đủ, không bị cắt */}
                        <td className="py-2.5 px-3 font-mono align-middle leading-tight">
                          <div className="text-[11px] font-semibold text-[#191C19]">{log.dateStr}</div>
                          <div className="text-[10px] text-[#717971]">{log.timeStr}</div>
                        </td>

                        {/* Actor */}
                        <td className="py-2.5 px-3 whitespace-nowrap overflow-hidden text-ellipsis align-middle" title={log.user}>
                          <span className="font-semibold text-[#191C19]">{log.user}</span>
                          <span
                            className={`ml-1.5 inline-block px-1.5 py-0.5 rounded-md text-[9px] font-bold ${String(log.role || '').toUpperCase() === 'ADMIN'
                                ? 'bg-[#E8F5E9] text-[#006B2C]'
                                : 'bg-[#E0F2F1] text-[#00685F]'
                              }`}
                          >
                            {log.role}
                          </span>
                        </td>

                        {/* Target: chỉ hiện nhãn loại đối tượng gọn (vd: Hệ thống, Tài khoản...); nội dung đầy đủ ở hàng xổ xuống bên dưới */}
                        <td className="py-2.5 px-3 align-middle">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F8FAF8] border border-[#E2E8E0] text-[#414942] whitespace-nowrap">
                            {TARGET_TYPE_LABEL[log.targetType] || log.targetType || 'Khác'}
                          </span>
                        </td>

                        {/* Action badge */}
                        <td className="py-2.5 px-3 whitespace-nowrap overflow-hidden align-middle">
                          {getActionBadge(log.actionType)}
                        </td>
                      </tr>

                      {/* Expanded Row Detail */}
                      {isExpanded && (
                        <tr className="bg-[#F8FAF8]">
                          <td colSpan="5" className="p-3.5 pl-12 pr-6">
                            <div className="bg-white p-3.5 rounded-xl border border-[#E2E8E0] shadow-xs space-y-2 text-xs">
                              <div>
                                <span className="text-[#717971] text-[11px] block mb-1">
                                  Đối tượng tác động (đầy đủ):
                                </span>
                                <p className="text-[#191C19] font-medium bg-[#F8FAF8] p-2.5 rounded-lg border border-[#E2E8E0] break-words">
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-white border border-[#E2E8E0] mr-1.5 align-middle">
                                    {TARGET_TYPE_LABEL[log.targetType] || log.targetType || 'Khác'}
                                  </span>
                                  <span className="align-middle">{log.target}</span>
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-[#E2E8E0]">
                                <div>
                                  <span className="text-[#717971] text-[11px]">Thời gian đầy đủ:</span>{' '}
                                  <span className="font-semibold text-[#414942] font-mono">{log.time}</span>
                                </div>
                                {log.afterState && log.afterState !== '—' && (
                                  <div>
                                    <span className="text-[#717971] text-[11px]">Kết quả xử lý:</span>{' '}
                                    <span className="font-bold text-[#006B2C]">{log.afterState}</span>
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-[#E2E8E0]">
                                <span className="text-[#717971] text-[11px] block mb-1">
                                  Lý do ghi nhận kiểm toán:
                                </span>
                                <p className="text-[#191C19] italic bg-[#F8FAF8] p-2.5 rounded-lg border border-[#E2E8E0] break-words">
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

          {/* Pagination bar với bộ điều khiển phân trang thực tế */}
          <div className="p-4 border-t border-[#E2E8E0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#717971]">
            <span>
              Hiển thị {filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredLogs.length)} trong tổng số {filteredLogs.length} bản ghi nhật ký
            </span>
            <div className="flex items-center gap-1 font-medium">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className={`px-2.5 py-1 rounded-xl border border-[#E2E8E0] transition-colors ${currentPage <= 1
                    ? 'opacity-40 cursor-not-allowed bg-gray-50'
                    : 'hover:bg-[#F8FAF8]'
                  }`}
              >
                Trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`px-2.5 py-1 rounded-xl text-xs transition-colors ${currentPage === p
                      ? 'bg-[#006B2C] text-white font-bold'
                      : 'border border-[#E2E8E0] hover:bg-[#F8FAF8] text-[#414942]'
                    }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className={`px-2.5 py-1 rounded-xl border border-[#E2E8E0] transition-colors ${currentPage >= totalPages
                    ? 'opacity-40 cursor-not-allowed bg-gray-50'
                    : 'hover:bg-[#F8FAF8]'
                  }`}
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
