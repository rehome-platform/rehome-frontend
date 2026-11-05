import React, { useState, useEffect } from 'react';
import adminApi from '../services/adminApi';

/**
 * View Quản lý Nhân sự Moderator ReHome
 * Kết nối Real Data với backend Spring Boot:
 * - GET /api/admin/moderators: Danh sách Moderator (phân trang, lọc theo kho, tìm kiếm, status)
 * - POST /api/admin/moderators: Tạo mới Moderator gán kho
 * - PATCH /api/admin/moderators/{id}/warehouse: Đổi kho công tác
 * - PATCH /api/admin/accounts/{id}/ban & unban: Khóa/Mở khóa tài khoản Moderator
 */
export default function AdminModeratorsView({ onLogAction }) {
  const [moderators, setModerators] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [openActionId, setOpenActionId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [changeWarehouseTarget, setChangeWarehouseTarget] = useState(null);
  const [selectedNewWarehouseId, setSelectedNewWarehouseId] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Create Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    warehouseId: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Fetch initial warehouses
  useEffect(() => {
    loadWarehouses();
  }, []);

  // Fetch moderators when filters change
  useEffect(() => {
    loadModerators();
  }, [searchKeyword, statusFilter, warehouseFilter]);

  const loadWarehouses = async () => {
    try {
      const data = await adminApi.getWarehouses();
      const list = Array.isArray(data) ? data : data?.content || data?.result || [];
      setWarehouses(list);
      if (list.length > 0 && !formData.warehouseId) {
        setFormData((prev) => ({ ...prev, warehouseId: list[0].id }));
      }
    } catch (err) {
      console.error('Lỗi tải danh sách kho:', err);
    }
  };

  const loadModerators = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = {
        search: searchKeyword.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        warehouseId: warehouseFilter !== 'ALL' ? warehouseFilter : undefined,
      };
      const res = await adminApi.getModerators(params);
      const list = Array.isArray(res) ? res : res?.content || res?.result?.content || res?.result || [];
      setModerators(list);
    } catch (err) {
      console.error('Lỗi tải danh sách Moderator:', err);
      setError('Không thể tải danh sách Moderator. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (msg) => {
    setActionSuccessMsg(msg);
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
      errors.warehouseId = 'Vui lòng chọn điểm kho ký gửi trực thuộc';
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

      await loadModerators();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Không thể tạo tài khoản Moderator';
      setFormErrors({ general: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (mod) => {
    const isCurrentlyActive = mod.status === 'ACTIVE';
    const actionLabel = isCurrentlyActive ? 'khóa' : 'mở khóa';
    if (!window.confirm(`Bạn có chắc muốn ${actionLabel} tài khoản Moderator ${mod.fullName || mod.name}?`)) {
      return;
    }

    try {
      const accountId = mod.accountId || mod.id;
      if (isCurrentlyActive) {
        await adminApi.banAccount(accountId, 'Admin tạm khóa tài khoản nhân viên kiểm duyệt');
      } else {
        await adminApi.unbanAccount(accountId);
      }

      showNotification(`Đã ${actionLabel} tài khoản Moderator thành công.`);
      setOpenActionId(null);

      if (onLogAction) {
        onLogAction({
          time: new Date().toLocaleString('vi-VN'),
          user: 'Admin',
          role: 'Admin',
          action: `${isCurrentlyActive ? 'Khóa' : 'Mở khóa'} tài khoản Moderator "${mod.fullName || mod.name}"`,
        });
      }

      await loadModerators();
    } catch (err) {
      alert(err.response?.data?.message || err.message || `Lỗi khi ${actionLabel} tài khoản`);
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
      showNotification(`Đã điều chuyển ${changeWarehouseTarget.fullName || changeWarehouseTarget.name} sang kho ${targetWarehouse?.name || ''}`);
      setChangeWarehouseTarget(null);
      setSelectedNewWarehouseId('');

      if (onLogAction) {
        onLogAction({
          time: new Date().toLocaleString('vi-VN'),
          user: 'Admin',
          role: 'Admin',
          action: `Chuyển kho công tác cho Moderator "${changeWarehouseTarget.fullName || changeWarehouseTarget.name}" sang ${targetWarehouse?.name || ''}`,
        });
      }

      await loadModerators();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Không thể điều chuyển kho cho Moderator');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#191C19] font-heading">
            Quản lý Nhân sự Moderator
          </h1>
          <p className="text-xs text-[#717971] mt-0.5">
            Quản lý danh sách nhân viên kiểm duyệt, phân công chi nhánh kho và kiểm soát trạng thái hoạt động.
          </p>
        </div>

        <button
          onClick={() => {
            setFormErrors({});
            setIsCreateModalOpen(true);
          }}
          className="px-4 py-2.5 bg-[#006B2C] hover:bg-[#005523] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm shrink-0"
        >
          <span className="material-symbols-outlined text-base">person_add</span>
          <span>Tạo tài khoản Moderator</span>
        </button>
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
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717971] text-lg">
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

        <div className="flex items-center gap-2">
          {/* Warehouse Filter */}
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="px-3 py-2.5 text-xs rounded-xl border border-[#DDE5D9] bg-white text-[#414942] font-medium outline-none hover:border-[#006B2C]/50 transition-colors"
          >
            <option value="ALL">Chi nhánh kho: Tất cả</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-xs rounded-xl border border-[#DDE5D9] bg-white text-[#414942] font-medium outline-none hover:border-[#006B2C]/50 transition-colors"
          >
            <option value="ALL">Trạng thái: Tất cả</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="BANNED">Bị khóa</option>
          </select>
        </div>
      </div>

      {/* Main Table or Loading / Error / Empty State */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-[#DDE5D9] p-16 text-center flex flex-col items-center justify-center">
          <span className="material-symbols-outlined animate-spin text-3xl text-[#006B2C] mb-3">
            progress_activity
          </span>
          <p className="text-xs text-[#717971]">Đang đồng bộ dữ liệu Moderator từ hệ thống...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-[#DC2626]/20 p-12 text-center flex flex-col items-center justify-center">
          <span className="material-symbols-outlined text-3xl text-[#DC2626] mb-2">
            error
          </span>
          <p className="text-xs font-semibold text-[#DC2626]">{error}</p>
          <button
            onClick={loadModerators}
            className="mt-4 px-4 py-2 bg-[#F6F9F4] border border-[#DDE5D9] text-xs font-medium rounded-xl hover:bg-[#E9F0E5]"
          >
            Thử lại
          </button>
        </div>
      ) : moderators.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#DDE5D9] p-12 text-center flex flex-col items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <div className="w-16 h-16 rounded-2xl bg-[#E0F2F1] text-[#00685F] flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl font-light">
              verified_user
            </span>
          </div>
          <h3 className="text-base font-bold text-[#191C19] font-heading">
            Chưa có Moderator nào phù hợp
          </h3>
          <p className="text-xs text-[#717971] max-w-sm mt-1 mb-5">
            {searchKeyword || statusFilter !== 'ALL' || warehouseFilter !== 'ALL'
              ? 'Không tìm thấy kết quả phù hợp với bộ lọc hiện tại.'
              : 'Tạo tài khoản đầu tiên để bắt đầu phân công xử lý các tác vụ kiểm duyệt.'}
          </p>
          <button
            onClick={() => {
              setSearchKeyword('');
              setStatusFilter('ALL');
              setWarehouseFilter('ALL');
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 bg-[#006B2C] text-white text-xs font-semibold rounded-xl hover:bg-[#005523] transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>Tạo tài khoản Moderator</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#DDE5D9] shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F9F4] text-[#717971] uppercase tracking-wider font-semibold border-b border-[#DDE5D9]">
                <tr>
                  <th className="py-3 px-6">Họ tên & Mã nhân viên</th>
                  <th className="py-3 px-6">Email</th>
                  <th className="py-3 px-6">Số điện thoại</th>
                  <th className="py-3 px-6">Kho phụ trách</th>
                  <th className="py-3 px-6">Ngày tạo</th>
                  <th className="py-3 px-6">Trạng thái</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE5D9]">
                {moderators.map((mod) => {
                  const modId = mod.accountId || mod.id;
                  const modName = mod.fullName || mod.name || 'Moderator';
                  const modCode = mod.moderatorCode || (modId ? `MOD-${modId.substring(0, 8).toUpperCase()}` : 'MOD-N/A');
                  const initials = getInitials(modName);
                  const isLocked = mod.status === 'BANNED' || mod.status === 'LOCKED';

                  return (
                    <tr
                      key={modId}
                      className="hover:bg-[#F6F9F4]/70 transition-colors"
                    >
                      {/* Name with initials & Code */}
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#E0F2F1] text-[#00685F] flex items-center justify-center font-bold text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-[#191C19]">{modName}</p>
                            <p className="text-[10px] text-[#717971] font-mono">
                              Mã: {modCode}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-6 font-mono text-[#414942] whitespace-nowrap">
                        {mod.email}
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-6 font-mono text-[#717971] whitespace-nowrap">
                        {mod.phone || 'Chưa cập nhật'}
                      </td>

                      {/* Warehouse */}
                      <td className="py-3.5 px-6 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#F6F9F4] text-[#414942] border border-[#DDE5D9]">
                          <span className="material-symbols-outlined text-sm text-[#006B2C]">
                            warehouse
                          </span>
                          <span>{mod.warehouseName || 'Chưa gán kho'}</span>
                        </span>
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-6 text-[#717971] whitespace-nowrap font-mono">
                        {mod.createdAt
                          ? new Date(mod.createdAt).toLocaleDateString('vi-VN')
                          : '---'}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-6 whitespace-nowrap">
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

                      {/* Actions Menu */}
                      <td className="py-3.5 px-4 text-center relative whitespace-nowrap">
                        <div className="inline-block relative">
                          <button
                            onClick={() =>
                              setOpenActionId(openActionId === modId ? null : modId)
                            }
                            className="p-1 rounded-lg text-[#717971] hover:text-[#191C19] hover:bg-[#E9F0E5] transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">
                              more_vert
                            </span>
                          </button>

                          {openActionId === modId && (
                            <div
                              className="absolute right-0 mt-1 w-44 bg-white rounded-xl border border-[#DDE5D9] shadow-lg py-1.5 z-30 text-left animate-fadeIn"
                              onMouseLeave={() => setOpenActionId(null)}
                            >
                              <button
                                onClick={() => {
                                  setChangeWarehouseTarget(mod);
                                  setSelectedNewWarehouseId(mod.warehouseId || warehouses[0]?.id || '');
                                  setOpenActionId(null);
                                }}
                                className="w-full px-3 py-1.5 text-xs text-[#414942] hover:bg-[#F6F9F4] flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined text-base text-[#00685F]">
                                  sync_alt
                                </span>
                                <span>Chuyển kho công tác</span>
                              </button>

                              <button
                                onClick={() => handleToggleStatus(mod)}
                                className={`w-full px-3 py-1.5 text-xs flex items-center gap-2 font-medium ${
                                  !isLocked
                                    ? 'text-[#DC2626] hover:bg-[#FEE2E2]/50'
                                    : 'text-[#006B2C] hover:bg-[#E8F5E9]'
                                }`}
                              >
                                <span className="material-symbols-outlined text-base">
                                  {!isLocked ? 'lock' : 'lock_open'}
                                </span>
                                <span>
                                  {!isLocked ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-[#DDE5D9] text-xs text-[#717971] flex items-center justify-between">
            <span>Hiển thị {moderators.length} Moderator trong toàn hệ thống</span>
            <span className="text-[11px] text-[#717971]">
              Dữ liệu được cập nhật từ máy chủ ReHome.
            </span>
          </div>
        </div>
      )}

      {/* Modal Chuyển kho công tác */}
      {changeWarehouseTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl border border-[#DDE5D9] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDE5D9] pb-3">
              <h3 className="text-base font-bold text-[#191C19] font-heading">
                Chuyển kho cho Moderator
              </h3>
              <button
                onClick={() => setChangeWarehouseTarget(null)}
                className="p-1 rounded-lg text-[#717971] hover:text-[#191C19]"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <p className="text-xs text-[#414942]">
              Điều chuyển nhân sự <strong className="text-[#191C19]">{changeWarehouseTarget.fullName || changeWarehouseTarget.name}</strong> sang kho ký gửi mới.
            </p>

            <form onSubmit={handleChangeWarehouseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#191C19] mb-1">
                  Chọn chi nhánh kho mới <span className="text-[#DC2626]">*</span>
                </label>
                <select
                  required
                  value={selectedNewWarehouseId}
                  onChange={(e) => setSelectedNewWarehouseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#DDE5D9] bg-white outline-none focus:border-[#006B2C]"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} - {w.address}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#DDE5D9]">
                <button
                  type="button"
                  onClick={() => setChangeWarehouseTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#414942] hover:bg-[#F6F9F4] rounded-xl border border-[#DDE5D9]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-[#006B2C] text-white hover:bg-[#005523] rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting && (
                    <span className="material-symbols-outlined animate-spin text-sm">
                      progress_activity
                    </span>
                  )}
                  <span>Xác nhận chuyển kho</span>
                </button>
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
              <h3 className="text-base font-bold text-[#191C19] font-heading">
                Tạo tài khoản Moderator
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-[#717971] hover:text-[#191C19] hover:bg-[#F6F9F4]"
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
                <label className="block text-xs font-semibold text-[#191C19] mb-1">
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
                <label className="block text-xs font-semibold text-[#191C19] mb-1">
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
                <p className="text-[10px] text-[#717971] mt-0.5">
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
                <label className="block text-xs font-semibold text-[#191C19] mb-1">
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
                <label className="block text-xs font-semibold text-[#191C19] mb-1">
                  Kho ký gửi phụ trách <span className="text-[#DC2626]">*</span>
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
                  <option value="">-- Chọn điểm kho ký gửi --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} - {w.address}
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
                  Hệ thống tự động sinh Mã nhân viên & gửi mật khẩu đăng nhập tạm thời qua email cho Moderator.
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#DDE5D9]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#414942] hover:bg-[#F6F9F4] rounded-xl transition-colors border border-[#DDE5D9]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold bg-[#006B2C] text-white hover:bg-[#005523] rounded-xl transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {isSubmitting && (
                    <span className="material-symbols-outlined animate-spin text-sm">
                      progress_activity
                    </span>
                  )}
                  <span>Tạo tài khoản</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
