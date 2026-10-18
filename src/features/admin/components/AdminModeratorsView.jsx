import React, { useState } from 'react';

/**
 * View Quản lý Nhân sự Moderator ReHome
 * Thiết kế chính xác theo Google Stitch (Figma) Prototype:
 * - Bảng danh sách nhân sự kiểm duyệt viên với ID MOD-XXXX
 * - Bộ lọc tìm kiếm và trạng thái
 * - Modal "Tạo tài khoản Moderator" với tính năng sinh mật khẩu ngẫu nhiên
 * - Hỗ trợ đầy đủ các trạng thái validate lỗi (email trùng, SĐT không hợp lệ)
 */
export default function AdminModeratorsView({ onLogAction }) {
  const initialModerators = [
    {
      id: 'MOD-1042',
      name: 'Phạm Thu Hà',
      initials: 'TH',
      email: 'ha.pham@rehome.vn',
      phone: '0977 340 126',
      createdAt: '15/03/2026',
      status: 'ACTIVE',
    },
    {
      id: 'MOD-1043',
      name: 'Lý Gia Bảo',
      initials: 'GB',
      email: 'bao.ly@rehome.vn',
      phone: '0912 480 355',
      createdAt: '15/03/2026',
      status: 'ACTIVE',
    },
    {
      id: 'MOD-1048',
      name: 'Hoàng Anh Thư',
      initials: 'AT',
      email: 'thu.hoang@rehome.vn',
      phone: '0938 226 719',
      createdAt: '02/05/2026',
      status: 'ACTIVE',
    },
    {
      id: 'MOD-1051',
      name: 'Bùi Đức Thịnh',
      initials: 'ĐT',
      email: 'thinh.bui@rehome.vn',
      phone: '0967 108 842',
      createdAt: '20/06/2026',
      status: 'LOCKED',
    },
    {
      id: 'MOD-1065',
      name: 'Ngô Khánh Linh',
      initials: 'KL',
      email: 'linh.ngo@rehome.vn',
      phone: '0945 913 067',
      createdAt: '11/08/2026',
      status: 'ACTIVE',
    },
    {
      id: 'MOD-1070',
      name: 'Đỗ Quang Huy',
      initials: 'QH',
      email: 'huy.do@rehome.vn',
      phone: '0986 554 902',
      createdAt: '01/10/2026',
      status: 'ACTIVE',
    },
  ];

  const [moderators, setModerators] = useState(initialModerators);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [openActionId, setOpenActionId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    tempPassword: 'Rh#' + Math.random().toString(36).substring(2, 8) + 'Xp',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const filteredModerators = moderators.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      m.email.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      m.phone.includes(searchKeyword);
    const matchStatus =
      statusFilter === 'ALL' || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = 'Rh#';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    res += 'Xp';
    setFormData((prev) => ({ ...prev, tempPassword: res }));
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const errors = {};

    if (!formData.name.trim()) errors.name = 'Vui lòng nhập họ và tên';

    if (!formData.email.trim()) {
      errors.email = 'Vui lòng nhập email';
    } else if (!formData.email.includes('@')) {
      errors.email = 'Email không hợp lệ';
    } else if (moderators.some((m) => m.email.toLowerCase() === formData.email.toLowerCase())) {
      errors.email = 'Email này đã được sử dụng';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^[0-9]{9,11}$/.test(formData.phone.replace(/\s+/g, ''))) {
      errors.phone = 'Số điện thoại không hợp lệ';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const initials = formData.name
      .trim()
      .split(' ')
      .map((w) => w[0])
      .slice(-2)
      .join('')
      .toUpperCase();

    const newMod = {
      id: `MOD-${Math.floor(1000 + Math.random() * 9000)}`,
      name: formData.name.trim(),
      initials,
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      createdAt: '09/10/2026',
      status: 'ACTIVE',
    };

    setModerators([newMod, ...moderators]);

    if (onLogAction) {
      onLogAction({
        time: '09/10/2026 14:15',
        user: 'Trần Minh Quân',
        role: 'Admin',
        action: `Tạo tài khoản Moderator "${newMod.name}"`,
      });
    }

    setIsCreateModalOpen(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      tempPassword: 'Rh#' + Math.random().toString(36).substring(2, 8) + 'Xp',
    });
    setFormErrors({});
  };

  const handleToggleStatus = (mod) => {
    const newStatus = mod.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
    setModerators(
      moderators.map((m) => (m.id === mod.id ? { ...m, status: newStatus } : m))
    );

    if (onLogAction) {
      onLogAction({
        time: '09/10/2026 14:20',
        user: 'Trần Minh Quân',
        role: 'Admin',
        action: `${newStatus === 'LOCKED' ? 'Khóa' : 'Mở khóa'} tài khoản Moderator "${mod.name}"`,
      });
    }
    setOpenActionId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#191C19] font-heading">
            Moderator
          </h1>
          <p className="text-xs text-[#717971] mt-0.5">
            Tạo và quản lý tài khoản Moderator của ReHome.
          </p>
        </div>

        <button
          onClick={() => {
            handleGeneratePassword();
            setIsCreateModalOpen(true);
          }}
          className="px-4 py-2.5 bg-[#006B2C] hover:bg-[#005523] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm shrink-0"
        >
          <span className="material-symbols-outlined text-base">person_add</span>
          <span>Tạo tài khoản Moderator</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#DDE5D9] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#717971] text-lg">
            search
          </span>
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Tìm theo tên hoặc email..."
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[#DDE5D9] bg-[#F6F9F4]/50 focus:bg-white focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15 outline-none transition-all"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 text-xs rounded-xl border border-[#DDE5D9] bg-white text-[#414942] font-medium outline-none hover:border-[#006B2C]/50 transition-colors"
        >
          <option value="ALL">Trạng thái: Tất cả</option>
          <option value="ACTIVE">Hoạt động</option>
          <option value="LOCKED">Bị khóa</option>
        </select>
      </div>

      {/* Main Table or Empty State */}
      {filteredModerators.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#DDE5D9] p-12 text-center flex flex-col items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <div className="w-16 h-16 rounded-2xl bg-[#E0F2F1] text-[#00685F] flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl font-light">
              verified_user
            </span>
          </div>
          <h3 className="text-base font-bold text-[#191C19] font-heading">
            Chưa có Moderator nào
          </h3>
          <p className="text-xs text-[#717971] max-w-sm mt-1 mb-5">
            Tạo tài khoản đầu tiên để bắt đầu phân công xử lý các tác vụ kiểm duyệt.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
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
                  <th className="py-3 px-6">Họ tên</th>
                  <th className="py-3 px-6">Email</th>
                  <th className="py-3 px-6">Số điện thoại</th>
                  <th className="py-3 px-6">Ngày tạo</th>
                  <th className="py-3 px-6">Trạng thái</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE5D9]">
                {filteredModerators.map((mod) => (
                  <tr
                    key={mod.id}
                    className="hover:bg-[#F6F9F4]/70 transition-colors"
                  >
                    {/* Name with initials & ID */}
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#E0F2F1] text-[#00685F] flex items-center justify-center font-bold text-xs">
                          {mod.initials}
                        </div>
                        <div>
                          <p className="font-bold text-[#191C19]">{mod.name}</p>
                          <p className="text-[10px] text-[#717971] font-mono">
                            ID: {mod.id}
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
                      {mod.phone}
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-6 text-[#717971] whitespace-nowrap font-mono">
                      {mod.createdAt}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      {mod.status === 'ACTIVE' ? (
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
                            setOpenActionId(openActionId === mod.id ? null : mod.id)
                          }
                          className="p-1 rounded-lg text-[#717971] hover:text-[#191C19] hover:bg-[#E9F0E5] transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">
                            more_vert
                          </span>
                        </button>

                        {openActionId === mod.id && (
                          <div
                            className="absolute right-0 mt-1 w-36 bg-white rounded-xl border border-[#DDE5D9] shadow-lg py-1.5 z-30 text-left animate-fadeIn"
                            onMouseLeave={() => setOpenActionId(null)}
                          >
                            <button
                              onClick={() => {
                                alert(`Chỉnh sửa quyền cho Moderator: ${mod.name}`);
                                setOpenActionId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-[#414942] hover:bg-[#F6F9F4] flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-base">
                                edit
                              </span>
                              <span>Chỉnh sửa</span>
                            </button>

                            <button
                              onClick={() => {
                                alert(`Đã gửi liên kết đặt lại mật khẩu đến: ${mod.email}`);
                                setOpenActionId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-[#414942] hover:bg-[#F6F9F4] flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-base">
                                lock_reset
                              </span>
                              <span>Đặt lại mật khẩu</span>
                            </button>

                            <button
                              onClick={() => handleToggleStatus(mod)}
                              className={`w-full px-3 py-1.5 text-xs flex items-center gap-2 font-medium ${
                                mod.status === 'ACTIVE'
                                  ? 'text-[#DC2626] hover:bg-[#FEE2E2]/50'
                                  : 'text-[#006B2C] hover:bg-[#E8F5E9]'
                              }`}
                            >
                              <span className="material-symbols-outlined text-base">
                                {mod.status === 'ACTIVE' ? 'lock' : 'lock_open'}
                              </span>
                              <span>
                                {mod.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa'}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-[#DDE5D9] text-xs text-[#717971] flex items-center justify-between">
            <span>Hiển thị 1 - {filteredModerators.length} trong tổng số 6 Moderator</span>
            <span className="text-[11px] text-[#717971]">
              Tất cả dữ liệu được đồng bộ realtime.
            </span>
          </div>
        </div>
      )}

      {/* Modal Tạo tài khoản Moderator (Pixel Perfect theo Stitch) */}
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
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                  }}
                  placeholder="Đỗ Quang Huy"
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border outline-none transition-all ${
                    formErrors.name
                      ? 'border-[#DC2626] bg-[#FFF5F5]'
                      : 'border-[#DDE5D9] bg-white hover:border-[#006B2C]/50 focus:border-[#006B2C]'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-[11px] text-[#DC2626] mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">error</span>
                    <span>{formErrors.name}</span>
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-[#191C19] mb-1">
                  Email <span className="text-[#DC2626]">*</span>
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
                  Email dùng để đăng nhập.
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
                  Số điện thoại <span className="text-[#DC2626]">*</span>
                </label>
                <input
                  type="tel"
                  required
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

              {/* Mật khẩu tạm thời */}
              <div>
                <label className="block text-xs font-semibold text-[#191C19] mb-1">
                  Mật khẩu tạm thời <span className="text-[#DC2626]">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      readOnly
                      value={formData.tempPassword}
                      className="w-full px-3.5 py-2.5 pr-9 text-xs rounded-xl border border-[#DDE5D9] bg-[#F6F9F4] font-mono text-[#191C19]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#717971] hover:text-[#191C19]"
                    >
                      <span className="material-symbols-outlined text-base">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="px-3 py-2 text-xs font-semibold text-[#006B2C] bg-[#E8F5E9] hover:bg-[#D4EDDA] rounded-xl flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">cached</span>
                    <span>Tạo ngẫu nhiên</span>
                  </button>
                </div>
              </div>

              {/* Info banner */}
              <div className="p-3 bg-[#E8F8F5] border border-[#B2DFDB] text-[#00685F] rounded-xl text-[11px] flex items-center gap-2">
                <span className="material-symbols-outlined text-base shrink-0">
                  info
                </span>
                <span>
                  Moderator sẽ được yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên.
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
                  className="px-4 py-2 text-xs font-semibold bg-[#006B2C] text-white hover:bg-[#005523] rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-base">person_add</span>
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
