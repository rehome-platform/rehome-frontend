import React, { useState, useEffect, useCallback, useRef } from 'react';
import adminApi from '../services/adminApi';
import { Button, Spinner, Modal, TableActionButton } from '../../../components/common/index.js';
import { useToast } from '../../../context/ToastContext.jsx';
import { formatWarehouseDisplayName } from '../../../utils/formatters.js';
import { useDebouncedSearch } from '../../../hooks/useDebouncedSearch.js';
import {
  DEFAULT_STALE_TIME_MS,
  STATIC_STALE_TIME_MS,
  useAdminCache,
  useAdminCacheActions,
} from '../hooks/useAdminQuery.jsx';

/**
 * View Quản lý Nhân sự ReHome
 * Kết nối Real Data với backend Spring Boot:
 * - GET /api/admin/moderators: Danh sách Moderator (phân trang, lọc theo kho, tìm kiếm, status)
 * - POST /api/admin/moderators: Tạo mới Moderator gán kho
 * - PATCH /api/admin/moderators/{id}/warehouse: Đổi kho công tác
 * - PATCH /api/admin/accounts/{id}/ban & unban: Khóa/Mở khóa tài khoản Moderator
 */
const WAREHOUSE_OPTIONS_CACHE_KEY = 'admin:warehouses:options';

export default function AdminModeratorsView({ onLogAction }) {
  const toast = useToast();
  const cache = useAdminCache();
  const cacheActions = useAdminCacheActions();

  const [searchKeyword, setSearchKeyword] = useState('');
  const {
    debouncedQuery: debouncedSearch,
    isTooShort: isSearchTooShort,
    hint: searchHint,
  } = useDebouncedSearch(searchKeyword);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');

  const initialWarehouses = cache?.read(WAREHOUSE_OPTIONS_CACHE_KEY)?.data || null;
  const modCacheKey = `admin:moderators:list:${debouncedSearch || ''}:${statusFilter}:${warehouseFilter}`;
  const initialMods = cache?.read(modCacheKey)?.data || null;

  const [moderators, setModerators] = useState(() => initialMods ?? []);
  const [warehouses, setWarehouses] = useState(() => initialWarehouses ?? []);
  const [isLoading, setIsLoading] = useState(() => !initialMods);
  const [error, setError] = useState(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [changeWarehouseTarget, setChangeWarehouseTarget] = useState(null);
  const [selectedNewWarehouseId, setSelectedNewWarehouseId] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [detailTarget, setDetailTarget] = useState(null);
  const [toggleStatusTarget, setToggleStatusTarget] = useState(null);
  const [toggleStatusReason, setToggleStatusReason] = useState('');
  const [togglingStatus, setTogglingStatus] = useState(false);

  // Create Form State
  const [formData, setFormData] = useState(() => ({
    fullName: '',
    email: '',
    phone: '',
    warehouseId: initialWarehouses?.[0]?.id || '',
  }));
  const [formErrors, setFormErrors] = useState({});

  const modSeqRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadWarehouses = useCallback(async () => {
    const cached = cache?.read(WAREHOUSE_OPTIONS_CACHE_KEY) || null;
    if (cached && cache.isFresh(cached, STATIC_STALE_TIME_MS)) {
      const list = cached.data || [];
      setWarehouses(list);
      if (list.length > 0) {
        setFormData((prev) => (prev.warehouseId ? prev : { ...prev, warehouseId: list[0].id }));
      }
      return;
    }

    try {
      const data = await adminApi.getWarehouses();
      if (!mountedRef.current) return;
      const list = Array.isArray(data) ? data : data?.content || data?.result || [];
      cache?.write(WAREHOUSE_OPTIONS_CACHE_KEY, list);
      setWarehouses(list);
      if (list.length > 0) {
        setFormData((prev) => (prev.warehouseId ? prev : { ...prev, warehouseId: list[0].id }));
      }
    } catch (err) {
      console.error('Lỗi tải danh sách kho:', err);
    }
  }, [cache]);

  const loadModerators = useCallback(async ({ force = false } = {}) => {
    const cachedEntry = cache?.read(modCacheKey) || null;
    if (!force && cachedEntry && cache.isFresh(cachedEntry, DEFAULT_STALE_TIME_MS)) {
      setModerators(cachedEntry.data ?? []);
      setError(null);
      setIsLoading(false);
      return;
    }

    const reqId = ++modSeqRef.current;
    const hasCached = Boolean(cachedEntry?.data);
    if (hasCached) {
      setModerators(cachedEntry.data);
      setError(null);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      setError(null);
    }

    try {
      const params = {
        search: debouncedSearch || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        warehouseId: warehouseFilter !== 'ALL' ? warehouseFilter : undefined,
      };
      const res = await adminApi.getModerators(params);
      if (!mountedRef.current || reqId !== modSeqRef.current) return;
      const list = Array.isArray(res) ? res : res?.content || res?.result?.content || res?.result || [];
      cache?.write(modCacheKey, list);
      setModerators(list);
    } catch (err) {
      if (!mountedRef.current || reqId !== modSeqRef.current) return;
      console.error('Lỗi tải danh sách Moderator:', err);
      if (!hasCached || force) {
        setError('Không thể tải danh sách Moderator. Vui lòng thử lại sau.');
      }
    } finally {
      if (mountedRef.current && reqId === modSeqRef.current) {
        setIsLoading(false);
      }
    }
  }, [cache, modCacheKey, debouncedSearch, statusFilter, warehouseFilter]);

  // Fetch initial warehouses
  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  // Fetch moderators when filters change (debounce 400ms & tối thiểu 2 ký tự qua useDebouncedSearch)
  useEffect(() => {
    loadModerators();
  }, [loadModerators]);

  const showNotification = (msg) => {
    setActionSuccessMsg(msg);
    toast.success(msg);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.fullName.trim()) errors.fullName = 'Vui lòng nhập họ và tên';

    if (!formData.email.trim()) {
      errors.email = 'Vui lòng nhập email';
    } else if (!formData.email.includes('@')) {
      errors.email = 'Email không hợp lệ';
    }

    if (formData.phone && !/^[0-9]{9,11}$/.test(formData.phone.replace(/\s+/g, ''))) {
      errors.phone = 'Số điện thoại không hợp lệ (9-11 số)';
    }

    if (!formData.warehouseId) {
      errors.warehouseId = 'Vui lòng chọn địa điểm ký gửi trực thuộc';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      setFormErrors({});

      await adminApi.createModerator({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        warehouseId: formData.warehouseId,
      });

      showNotification(`Đã tạo tài khoản Moderator cho ${formData.fullName.trim()} thành công.`);
      setIsCreateModalOpen(false);
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        warehouseId: warehouses[0]?.id || '',
      });

      if (onLogAction) {
        onLogAction({
          time: new Date().toLocaleString('vi-VN'),
          user: 'Admin',
          role: 'Admin',
          action: `Tạo tài khoản Moderator "${formData.fullName.trim()}"`,
        });
      }

      cacheActions?.invalidate(['admin:moderators:', 'admin:warehouses:', 'admin:accounts:', 'admin:audit-logs:', 'admin:dashboard:']);
      await loadModerators({ force: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Không thể tạo tài khoản Moderator';
      setFormErrors({ general: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = (mod) => {
    if (!mod || togglingStatus) return;
    setToggleStatusTarget(mod);
    setToggleStatusReason(
      mod.status === 'ACTIVE' ? 'Admin tạm khóa tài khoản nhân viên kiểm duyệt' : ''
    );
  };

  const handleConfirmToggleStatus = async () => {
    const mod = toggleStatusTarget;
    if (!mod || togglingStatus) return;
    const isCurrentlyActive = mod.status === 'ACTIVE';
    const actionLabel = isCurrentlyActive ? 'khóa' : 'mở khóa';
    if (isCurrentlyActive && !toggleStatusReason.trim()) {
      toast.warn('Vui lòng nhập lý do khóa tài khoản.');
      return;
    }

    setTogglingStatus(true);
    try {
      const accountId = mod.accountId || mod.id;
      if (isCurrentlyActive) {
        await adminApi.banAccount(accountId, toggleStatusReason.trim());
      } else {
        await adminApi.unbanAccount(accountId);
      }

      showNotification(`Đã ${actionLabel} tài khoản Moderator thành công.`);

      if (onLogAction) {
        onLogAction({
          time: new Date().toLocaleString('vi-VN'),
          user: 'Admin',
          role: 'Admin',
          action: `${isCurrentlyActive ? 'Khóa' : 'Mở khóa'} tài khoản Moderator "${mod.fullName || mod.name}"`,
        });
      }

      setToggleStatusTarget(null);
      setToggleStatusReason('');
      setDetailTarget(null);
      cacheActions?.invalidate(['admin:moderators:', 'admin:warehouses:', 'admin:accounts:', 'admin:audit-logs:', 'admin:dashboard:']);
      await loadModerators({ force: true });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || `Lỗi khi ${actionLabel} tài khoản`);
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleChangeWarehouseSubmit = async (e) => {
    e.preventDefault();
    if (!changeWarehouseTarget || !selectedNewWarehouseId) return;

    try {
      setIsSubmitting(true);
      const modId = changeWarehouseTarget.accountId || changeWarehouseTarget.id;
      await adminApi.assignWarehouse(modId, selectedNewWarehouseId);

      const targetWarehouse = warehouses.find((w) => w.id === selectedNewWarehouseId);
      const targetWarehouseName = formatWarehouseDisplayName(targetWarehouse?.name);
      showNotification(`Đã điều chuyển ${changeWarehouseTarget.fullName || changeWarehouseTarget.name} sang địa điểm ký gửi ${targetWarehouseName || ''}`);
      setChangeWarehouseTarget(null);
      setSelectedNewWarehouseId('');

      if (onLogAction) {
        onLogAction({
          time: new Date().toLocaleString('vi-VN'),
          user: 'Admin',
          role: 'Admin',
          action: `Chuyển địa điểm công tác cho Moderator "${changeWarehouseTarget.fullName || changeWarehouseTarget.name}" sang ${targetWarehouseName || ''}`,
        });
      }

      cacheActions?.invalidate(['admin:moderators:', 'admin:warehouses:', 'admin:accounts:', 'admin:audit-logs:', 'admin:dashboard:']);
      await loadModerators({ force: true });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Không thể chuyển địa điểm công tác cho Moderator');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'MD';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4">
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={() => {
            setFormErrors({});
            setIsCreateModalOpen(true);
          }}
          className="gap-1.5 shrink-0"
        >
          <span className="material-symbols-outlined text-base">person_add</span>
          <span>Tạo tài khoản nhân viên</span>
        </Button>
      </div>

      {/* Action Toast */}
      {actionSuccessMsg && (
        <div className="p-3 bg-[#E8F5E9] border border-[#C8E6C9] text-[#006B2C] rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-sm">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#DDE5D9] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex-1">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6776] text-lg">
              search
            </span>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Tìm theo tên, email hoặc số điện thoại..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[#DDE5D9] bg-[#F6F9F4]/50 focus:bg-white focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15 outline-none transition-all"
            />
          </div>
          {isSearchTooShort && (
            <p className="mt-1 text-[11px] text-[#5f5f5f]">{searchHint}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Warehouse Filter */}
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="px-3 py-2.5 text-xs rounded-xl border border-[#DDE5D9] bg-white text-[#5B6776] font-medium outline-none hover:border-[#006B2C]/50 transition-colors"
          >
            <option value="ALL">Địa điểm ký gửi: Tất cả</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {formatWarehouseDisplayName(w.name)}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-xs rounded-xl border border-[#DDE5D9] bg-white text-[#5B6776] font-medium outline-none hover:border-[#006B2C]/50 transition-colors"
          >
            <option value="ALL">Trạng thái: Tất cả</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="BANNED">Bị khóa</option>
          </select>
        </div>
      </div>

      {/* Main Table or Loading / Error / Empty State */}
      {isLoading && moderators.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#DDE5D9] p-16 text-center flex flex-col items-center justify-center gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-[#5B6776]">Đang đồng bộ dữ liệu nhân viên từ hệ thống...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-[#DC2626]/20 p-12 text-center flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-[#DC2626] mb-2">
            error
          </span>
          <p className="text-xs font-semibold text-[#DC2626]">{error}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => loadModerators({ force: true })}
            className="mt-4"
          >
            Thử lại
          </Button>
        </div>
      ) : moderators.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#DDE5D9] p-12 text-center flex flex-col items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <div className="w-16 h-16 rounded-2xl bg-[#E0F2F1] text-[#00685F] flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl font-light">
              verified_user
            </span>
          </div>
          <h3 className="text-base font-bold text-[#1F2A37] font-heading">
            Chưa có nhân viên nào phù hợp
          </h3>
          <p className="text-xs text-[#5B6776] max-w-sm mt-1 mb-5">
            {searchKeyword || statusFilter !== 'ALL' || warehouseFilter !== 'ALL'
              ? 'Không tìm thấy kết quả phù hợp với bộ lọc hiện tại.'
              : 'Tạo tài khoản đầu tiên để bắt đầu phân công xử lý các tác vụ kiểm duyệt.'}
          </p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              setSearchKeyword('');
              setStatusFilter('ALL');
              setWarehouseFilter('ALL');
              setIsCreateModalOpen(true);
            }}
            className="gap-1.5"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-sm">add</span>
            <span>Tạo tài khoản nhân viên</span>
          </Button>
        </div>
      ) : (
        <div
          className={`bg-white rounded-2xl border border-[#DDE5D9] shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden transition-opacity duration-150 ${
            isLoading ? 'opacity-60 pointer-events-none' : ''
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-xs">
              <thead className="bg-[#F6F9F4] text-[#5B6776] tracking-wider font-semibold border-b border-[#DDE5D9]">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap w-[13%]">Mã nhân viên</th>
                  <th className="py-3 px-4 whitespace-nowrap w-[18%]">Họ tên</th>
                  <th className="py-3 px-4 whitespace-nowrap w-[20%]">Email</th>
                  <th className="py-3 px-4 whitespace-nowrap w-[17%]">Địa điểm phụ trách</th>
                  <th className="py-3 px-4 whitespace-nowrap w-[10%]">Ngày tạo</th>
                  <th className="py-3 px-4 whitespace-nowrap w-[9%]">Trạng thái</th>
                  <th className="py-3 pl-4 pr-8 whitespace-nowrap text-center w-[13%]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE5D9]">
                {moderators.map((mod) => {
                  const modId = mod.accountId || mod.id;
                  const modName = mod.fullName || mod.name || 'Moderator';
                  const modCode = mod.moderatorCode || (modId ? `MOD-${modId.substring(0, 8).toUpperCase()}` : 'MOD-N/A');
                  const isLocked = mod.status === 'BANNED' || mod.status === 'LOCKED';

                  return (
                    <tr
                      key={modId}
                      className="hover:bg-[#F6F9F4]/70 transition-colors"
                    >
                      {/* Code */}
                      <td className="py-3.5 px-4 font-mono text-[#5B6776] whitespace-nowrap overflow-hidden text-ellipsis" title={modCode}>
                        {modCode}
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-4 font-bold text-[#1F2A37] whitespace-nowrap overflow-hidden text-ellipsis" title={modName}>
                        {modName}
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 font-mono text-[#5B6776] whitespace-nowrap overflow-hidden text-ellipsis" title={mod.email}>
                        {mod.email}
                      </td>

                      {/* Warehouse */}
                      <td className="py-3.5 px-4 whitespace-nowrap overflow-hidden" title={formatWarehouseDisplayName(mod.warehouseName) || "Chưa gán địa điểm"}>
                        <span className="inline-flex items-center gap-1.5 max-w-full px-2.5 py-1 rounded-lg text-xs font-medium bg-[#F6F9F4] text-[#5B6776] border border-[#DDE5D9]">
                          <span className="material-symbols-outlined text-sm text-[#006B2C] shrink-0">
                            warehouse
                          </span>
                          <span className="truncate">{formatWarehouseDisplayName(mod.warehouseName) || 'Chưa gán địa điểm'}</span>
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-[#5B6776] font-mono whitespace-nowrap">
                        {mod.createdAt
                          ? new Date(mod.createdAt).toLocaleDateString('vi-VN')
                          : '---'}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {!isLocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#E8F5E9] text-[#006B2C]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#006B2C]"></span>
                            <span>Hoạt động</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FEE2E2] text-[#DC2626]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"></span>
                            <span>Bị khóa</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pl-4 pr-8 text-right align-middle whitespace-nowrap">
                        <TableActionButton
                          action="view"
                          onClick={() => setDetailTarget(mod)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-[#DDE5D9] text-xs text-[#5B6776]">
            <span>Hiển thị {moderators.length} nhân viên điểm kí gửi trong toàn hệ thống</span>
          </div>
        </div>
      )}

      {/* Modal Chi tiết tài khoản Moderator */}
      {detailTarget && (() => {
        const dId = detailTarget.accountId || detailTarget.id;
        const dName = detailTarget.fullName || detailTarget.name || 'Moderator';
        const dCode = detailTarget.moderatorCode || (dId ? `MOD-${dId.substring(0, 8).toUpperCase()}` : 'MOD-N/A');
        const dLocked = detailTarget.status === 'BANNED' || detailTarget.status === 'LOCKED';
        const rows = [
          { label: 'Mã nhân viên', value: dCode, mono: true },
          { label: 'Họ và tên', value: dName },
          { label: 'Email', value: detailTarget.email || '---', mono: true },
          { label: 'Số điện thoại', value: detailTarget.phone || 'Chưa cập nhật', mono: true },
          { label: 'Địa điểm phụ trách', value: formatWarehouseDisplayName(detailTarget.warehouseName) || 'Chưa gán địa điểm' },
          {
            label: 'Ngày tạo',
            value: detailTarget.createdAt ? new Date(detailTarget.createdAt).toLocaleString('vi-VN') : '---',
            mono: true,
          },
          { label: 'ID tài khoản', value: dId || '---', mono: true },
        ];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
            <div className="w-full max-w-2xl bg-white rounded-2xl border border-[#DDE5D9] shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#DDE5D9] pb-3">
                <h3 className="text-base font-bold text-[#1F2A37] font-heading">
                  Chi tiết tài khoản nhân viên
                </h3>
                <button
                  type="button"
                  onClick={() => setDetailTarget(null)}
                  className="p-1 rounded-lg text-[#5B6776] hover:text-[#1F2A37] hover:bg-[#F6F9F4]"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#E0F2F1] text-[#00685F] flex items-center justify-center font-bold text-sm shrink-0">
                  {getInitials(dName)}
                </div>
                <div>
                  <p className="font-bold text-[#1F2A37] text-sm">{dName}</p>
                  {!dLocked ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5E9] text-[#006B2C]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#006B2C]"></span>
                      <span>Hoạt động</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEE2E2] text-[#DC2626]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]"></span>
                      <span>Bị khóa</span>
                    </span>
                  )}
                </div>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {rows.map((r) => (
                  <div key={r.label} className="px-3.5 py-2.5 rounded-xl border border-[#DDE5D9] bg-[#F6F9F4]/40">
                    <dt className="text-[10px] uppercase tracking-wide text-[#5B6776] font-semibold mb-0.5">{r.label}</dt>
                    <dd className={`text-[#1F2A37] break-all ${r.mono ? 'font-mono' : 'font-semibold'}`}>
                      {r.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-[#DDE5D9]">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setChangeWarehouseTarget(detailTarget);
                      setSelectedNewWarehouseId(detailTarget.warehouseId || warehouses[0]?.id || "");
                      setDetailTarget(null);
                    }}
                    className="gap-1.5 border-[#00685F]/40 text-[#00685F] hover:bg-[#E0F2F1] hover:border-[#00685F] hover:text-[#00685F]"
                  >
                    <span aria-hidden="true" className="material-symbols-outlined text-base">sync_alt</span>
                    <span>Chuyển địa điểm công tác</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={!dLocked ? "danger-outline" : "outline"}
                    onClick={() => handleToggleStatus(detailTarget)}
                    className={!dLocked ? "gap-1.5" : "gap-1.5 border-[#ABEFC6] text-[#006B2C] hover:bg-[#ECFDF3] hover:border-[#006B2C] hover:text-[#006B2C]"}
                  >
                    <span className="material-symbols-outlined text-base" aria-hidden="true">{!dLocked ? "lock" : "lock_open"}</span>
                    <span>{!dLocked ? "Khóa tài khoản" : "Mở khóa tài khoản"}</span>
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailTarget(null)}
                >
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Chuyển kho công tác */}
      {changeWarehouseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#DDE5D9] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDE5D9] pb-3">
              <h3 className="text-base font-bold text-[#1F2A37] font-heading">
                Chuyển địa điểm công tác
              </h3>
              <button
                onClick={() => setChangeWarehouseTarget(null)}
                className="p-1 rounded-lg text-[#5B6776] hover:text-[#1F2A37]"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <p className="text-xs text-[#5B6776]">
              Điều chuyển nhân sự <strong className="text-[#1F2A37]">{changeWarehouseTarget.fullName || changeWarehouseTarget.name}</strong> sang địa điểm ký gửi mới.
            </p>

            <form onSubmit={handleChangeWarehouseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1F2A37] mb-1">
                  Chọn địa điểm ký gửi mới <span className="text-[#DC2626]">*</span>
                </label>
                <select
                  required
                  value={selectedNewWarehouseId}
                  onChange={(e) => setSelectedNewWarehouseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DDE5D9] bg-white outline-none focus:border-[#006B2C]"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {formatWarehouseDisplayName(w.name)} - {w.address}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#DDE5D9]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => setChangeWarehouseTarget(null)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  Xác nhận chuyển địa điểm
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tạo tài khoản Moderator */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#DDE5D9] shadow-2xl p-6 sm:p-7 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#DDE5D9] pb-3">
              <h3 className="text-base font-bold text-[#1F2A37] font-heading">
                Tạo tài khoản nhân viên
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-[#5B6776] hover:text-[#1F2A37] hover:bg-[#F6F9F4]"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {formErrors.general && (
              <div className="p-3 bg-[#FFF5F5] border border-[#DC2626]/20 text-[#DC2626] rounded-xl text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-base shrink-0">error</span>
                <span>{formErrors.general}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              {/* Họ và tên */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2A37] mb-1">
                  Họ và tên <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => {
                    setFormData({ ...formData, fullName: e.target.value });
                    if (formErrors.fullName) setFormErrors({ ...formErrors, fullName: '' });
                  }}
                  placeholder="Ví dụ: Đỗ Quang Huy"
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border outline-none transition-all ${
                    formErrors.fullName
                      ? 'border-[#DC2626] bg-[#FFF5F5]'
                      : 'border-[#DDE5D9] bg-white hover:border-[#006B2C]/50 focus:border-[#006B2C]'
                  }`}
                />
                {formErrors.fullName && (
                  <p className="text-[11px] text-[#DC2626] mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">error</span>
                    <span>{formErrors.fullName}</span>
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2A37] mb-1">
                  Email đăng nhập <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                  }}
                  placeholder="huy.do@rehome.vn"
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border outline-none transition-all ${
                    formErrors.email
                      ? 'border-[#DC2626] bg-[#FFF5F5]'
                      : 'border-[#DDE5D9] bg-white hover:border-[#006B2C]/50 focus:border-[#006B2C]'
                  }`}
                />
                <p className="text-[10px] text-[#5B6776] mt-0.5">
                  Email chính thức của kiểm duyệt viên để nhận thông báo và tài khoản.
                </p>
                {formErrors.email && (
                  <p className="text-[11px] text-[#DC2626] mt-1 flex items-center gap-1 font-medium">
                    <span className="material-symbols-outlined text-xs">error</span>
                    <span>{formErrors.email}</span>
                  </p>
                )}
              </div>

              {/* Số điện thoại */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2A37] mb-1">
                  Số điện thoại
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({ ...formData, phone: e.target.value });
                    if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
                  }}
                  placeholder="0986 554 902"
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border outline-none transition-all ${
                    formErrors.phone
                      ? 'border-[#DC2626] bg-[#FFF5F5]'
                      : 'border-[#DDE5D9] bg-white hover:border-[#006B2C]/50 focus:border-[#006B2C]'
                  }`}
                />
                {formErrors.phone && (
                  <p className="text-[11px] text-[#DC2626] mt-1 flex items-center gap-1 font-medium">
                    <span className="material-symbols-outlined text-xs">error</span>
                    <span>{formErrors.phone}</span>
                  </p>
                )}
              </div>

              {/* Điểm kho phụ trách */}
              <div>
                <label className="block text-xs font-semibold text-[#1F2A37] mb-1">
                  Địa điểm ký gửi phụ trách <span className="text-[#DC2626]">*</span>
                </label>
                <select
                  required
                  value={formData.warehouseId}
                  onChange={(e) => {
                    setFormData({ ...formData, warehouseId: e.target.value });
                    if (formErrors.warehouseId) setFormErrors({ ...formErrors, warehouseId: '' });
                  }}
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border outline-none transition-all ${
                    formErrors.warehouseId
                      ? 'border-[#DC2626] bg-[#FFF5F5]'
                      : 'border-[#DDE5D9] bg-white hover:border-[#006B2C]/50 focus:border-[#006B2C]'
                  }`}
                >
                  <option value="">-- Chọn địa điểm ký gửi --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {formatWarehouseDisplayName(w.name)} - {w.address}
                    </option>
                  ))}
                </select>
                {formErrors.warehouseId && (
                  <p className="text-[11px] text-[#DC2626] mt-1 flex items-center gap-1 font-medium">
                    <span className="material-symbols-outlined text-xs">error</span>
                    <span>{formErrors.warehouseId}</span>
                  </p>
                )}
              </div>

              {/* Info banner */}
              <div className="p-3 bg-[#E8F8F5] border border-[#B2DFDB] text-[#00685F] rounded-xl text-[11px] flex items-center gap-2">
                <span className="material-symbols-outlined text-base shrink-0">
                  info
                </span>
                <span>
                  Hệ thống tự động sinh Mã nhân viên & gửi mật khẩu đăng nhập tạm thời qua email cho nhân viên.
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#DDE5D9]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  Tạo tài khoản
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Khóa / Mở khóa Moderator */}
      <Modal
        isOpen={Boolean(toggleStatusTarget)}
        onClose={() => { if (!togglingStatus) setToggleStatusTarget(null); }}
        title={toggleStatusTarget?.status === 'ACTIVE' ? 'Xác nhận khóa tài khoản nhân viên' : 'Xác nhận mở khóa tài khoản nhân viên'}
      >
        <div className="space-y-4 text-xs font-sans">
          <p className="text-[#5B6776] leading-relaxed">
            Bạn có chắc muốn{' '}
            <strong className={toggleStatusTarget?.status === 'ACTIVE' ? 'text-[#D92D20]' : 'text-[#006B2C]'}>
              {toggleStatusTarget?.status === 'ACTIVE' ? 'khóa' : 'mở khóa'}
            </strong>{' '}
            tài khoản nhân viên{' '}
            <strong className="text-[#1F2A37]">{toggleStatusTarget?.fullName || toggleStatusTarget?.name}</strong>?
          </p>
          {toggleStatusTarget?.status === 'ACTIVE' && (
            <div>
              <label htmlFor="mod-toggle-reason" className="block font-bold text-[#1F2A37] mb-1">
                Lý do khóa tài khoản <span className="text-[#D92D20]">*</span>
              </label>
              <textarea
                id="mod-toggle-reason"
                rows={3}
                disabled={togglingStatus}
                value={toggleStatusReason}
                onChange={(e) => setToggleStatusReason(e.target.value)}
                className="w-full p-2.5 border border-[#DDE5D9] rounded-xl text-[#1F2A37] focus:outline-none focus:border-[#006B2C]"
              />
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2 border-t border-[#DDE5D9]">
            <Button
              size="sm"
              variant="outline"
              disabled={togglingStatus}
              onClick={() => setToggleStatusTarget(null)}
            >
              Hủy
            </Button>
            <Button
              size="sm"
              variant={toggleStatusTarget?.status === 'ACTIVE' ? 'danger' : 'primary'}
              loading={togglingStatus}
              disabled={togglingStatus || (toggleStatusTarget?.status === 'ACTIVE' && !toggleStatusReason.trim())}
              onClick={handleConfirmToggleStatus}
            >
              {toggleStatusTarget?.status === 'ACTIVE' ? 'Xác nhận khóa' : 'Xác nhận mở khóa'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
