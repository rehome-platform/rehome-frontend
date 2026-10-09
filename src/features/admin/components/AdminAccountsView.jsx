import React, { useState } from 'react';

/**
 * View Quản lý Tài khoản ReHome
 * Thiết kế chính xác theo Google Stitch (Figma) Prototype:
 * - Bảng danh sách tài khoản chuẩn xác (Member, Organizer, Moderator)
 * - Bộ lọc tìm kiếm theo tên, email, sđt, vai trò, trạng thái
 * - Màn hình Empty State khi tìm kiếm không ra kết quả
 * - Side Drawer trượt "Chi tiết tài khoản" với dòng thời gian lịch sử khóa/mở khóa
 * - Modal "Khóa tài khoản này?" với đếm ký tự (0/300) và xác thực lý do
 */
export default function AdminAccountsView({ onLogAction }) {
  // Dữ liệu người dùng mẫu chuẩn từ Stitch
  const initialAccounts = [
    {
      id: 'USR-101',
      code: '849102',
      name: 'Lê Hoàng Nam',
      initials: 'LN',
      email: 'nam.le@gmail.com',
      phone: '0903 112 458',
      role: 'Member',
      createdAt: '12/06/2026',
      status: 'LOCKED', // Bị khóa
      history: [
        {
          date: '02/10/2026 14:20',
          action: 'Khóa',
          actor: 'Trần Minh Quân',
          reason: 'Đăng bình luận xúc phạm nhiều lần trên các bài đăng quyên góp.',
        },
        {
          date: '18/08/2026 09:10',
          action: 'Mở khóa',
          actor: 'Trần Minh Quân',
          reason: 'Người dùng đã cam kết không tái phạm quy định cộng đồng.',
        },
      ],
    },
    {
      id: 'USR-102',
      code: '849103',
      name: 'Nguyễn Thị Mai',
      initials: 'NM',
      email: 'mai.nguyen@gmail.com',
      phone: '0918 245 771',
      role: 'Member',
      createdAt: '03/05/2026',
      status: 'ACTIVE',
      history: [
        {
          date: '30/09/2026 17:30',
          action: 'Mở khóa',
          actor: 'Trần Minh Quân',
          reason: 'Hoàn tất xác minh khiếu nại biên nhận ký gửi.',
        },
      ],
    },
    {
      id: 'USR-103',
      code: '849104',
      name: 'Quỹ Hy Vọng Xanh',
      initials: 'HX',
      email: 'lienhe@hyvongxanh.org.vn',
      phone: '028 3822 6858',
      role: 'Organizer',
      createdAt: '20/04/2026',
      status: 'ACTIVE',
      history: [],
    },
    {
      id: 'USR-104',
      code: '849105',
      name: 'Mái Ấm Hướng Dương',
      initials: 'HD',
      email: 'contact@huongduong.org.vn',
      phone: '028 3844 1200',
      role: 'Organizer',
      createdAt: '02/07/2026',
      status: 'ACTIVE',
      history: [],
    },
    {
      id: 'USR-105',
      code: 'MOD-1042',
      name: 'Phạm Thu Hà',
      initials: 'TH',
      email: 'ha.pham@rehome.vn',
      phone: '0977 340 126',
      role: 'Moderator',
      createdAt: '15/03/2026',
      status: 'ACTIVE',
      history: [],
    },
    {
      id: 'USR-106',
      code: 'MOD-1070',
      name: 'Đỗ Quang Huy',
      initials: 'QH',
      email: 'huy.do@rehome.vn',
      phone: '0986 554 902',
      role: 'Moderator',
      createdAt: '01/10/2026',
      status: 'ACTIVE',
      history: [],
    },
    {
      id: 'USR-107',
      code: '849108',
      name: 'Trần Bảo Ngọc',
      initials: 'BN',
      email: 'ngoc.tran@gmail.com',
      phone: '0935 778 214',
      role: 'Member',
      createdAt: '28/09/2026',
      status: 'ACTIVE',
      history: [],
    },
    {
      id: 'USR-108',
      code: '849109',
      name: 'Võ Minh Khang',
      initials: 'MK',
      email: 'khang.vo@gmail.com',
      phone: '0909 661 337',
      role: 'Member',
      createdAt: '25/09/2026',
      status: 'ACTIVE',
      history: [],
    },
  ];

  const [accounts, setAccounts] = useState(initialAccounts);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Drawer chi tiết & Modal khóa
  const [drawerAccount, setDrawerAccount] = useState(null);
  const [lockModalAccount, setLockModalAccount] = useState(null);
  const [lockReason, setLockReason] = useState('');
  const [lockError, setLockError] = useState('');
  const [openActionMenuId, setOpenActionMenuId] = useState(null);

  // Bộ lọc dữ liệu
  const filteredAccounts = accounts.filter((acc) => {
    const matchSearch =
      acc.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      acc.email.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      acc.phone.includes(searchKeyword);

    const matchRole =
      selectedRole === 'ALL' || acc.role.toLowerCase() === selectedRole.toLowerCase();

    const matchStatus =
      selectedStatus === 'ALL' || acc.status === selectedStatus;

    return matchSearch && matchRole && matchStatus;
  });

  const handleResetFilter = () => {
    setSearchKeyword('');
    setSelectedRole('ALL');
    setSelectedStatus('ALL');
  };

  // Xác nhận khóa tài khoản
  const handleConfirmLock = () => {
    if (!lockReason.trim()) {
      setLockError('Vui lòng nhập lý do khóa');
      return;
    }

    const updated = accounts.map((acc) => {
      if (acc.id === lockModalAccount.id) {
        const newHistory = [
          {
            date: '09/10/2026 14:00',
            action: 'Khóa',
            actor: 'Trần Minh Quân',
            reason: lockReason.trim(),
          },
          ...acc.history,
        ];
        return { ...acc, status: 'LOCKED', history: newHistory };
      }
      return acc;
    });

    setAccounts(updated);

    if (drawerAccount && drawerAccount.id === lockModalAccount.id) {
      setDrawerAccount({
        ...drawerAccount,
        status: 'LOCKED',
        history: [
          {
            date: '09/10/2026 14:00',
            action: 'Khóa',
            actor: 'Trần Minh Quân',
            reason: lockReason.trim(),
          },
          ...drawerAccount.history,
        ],
      });
    }

    if (onLogAction) {
      onLogAction({
        time: '09/10/2026 14:00',
        user: 'Trần Minh Quân',
        role: 'Admin',
        action: `Khóa tài khoản ${lockModalAccount.role} "${lockModalAccount.name}"`,
      });
    }

    setLockModalAccount(null);
    setLockReason('');
    setLockError('');
  };

  // Mở khóa tài khoản
  const handleUnlockAccount = (account) => {
    const reason = 'Mở khóa theo yêu cầu sau khi rà soát tuân thủ.';
    const updated = accounts.map((acc) => {
      if (acc.id === account.id) {
        const newHistory = [
          {
            date: '09/10/2026 14:05',
            action: 'Mở khóa',
            actor: 'Trần Minh Quân',
            reason,
          },
          ...acc.history,
        ];
        return { ...acc, status: 'ACTIVE', history: newHistory };
      }
      return acc;
    });

    setAccounts(updated);

    if (drawerAccount && drawerAccount.id === account.id) {
      setDrawerAccount({
        ...drawerAccount,
        status: 'ACTIVE',
        history: [
          {
            date: '09/10/2026 14:05',
            action: 'Mở khóa',
            actor: 'Trần Minh Quân',
            reason,
          },
          ...drawerAccount.history,
        ],
      });
    }

    if (onLogAction) {
      onLogAction({
        time: '09/10/2026 14:05',
        user: 'Trần Minh Quân',
        role: 'Admin',
        action: `Mở khóa tài khoản ${account.role} "${account.name}"`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#191C19] font-heading">
            Tài khoản
          </h1>
          <p className="text-xs text-[#717971] mt-0.5">
            Xem và khóa, mở khóa tài khoản người dùng trên ReHome.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#DDE5D9] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
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

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2.5 text-xs rounded-xl border border-[#DDE5D9] bg-white text-[#414942] font-medium outline-none hover:border-[#006B2C]/50 transition-colors"
          >
            <option value="ALL">Vai trò: Tất cả</option>
            <option value="member">Member</option>
            <option value="organizer">Organizer</option>
            <option value="moderator">Moderator</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2.5 text-xs rounded-xl border border-[#DDE5D9] bg-white text-[#414942] font-medium outline-none hover:border-[#006B2C]/50 transition-colors"
          >
            <option value="ALL">Trạng thái: Tất cả</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="LOCKED">Bị khóa</option>
          </select>

          {(searchKeyword || selectedRole !== 'ALL' || selectedStatus !== 'ALL') && (
            <button
              onClick={handleResetFilter}
              className="px-3 py-2.5 text-xs font-semibold text-[#006B2C] hover:text-[#005523] hover:bg-[#E8F5E9] rounded-xl transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-base">restart_alt</span>
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table or Empty State */}
      {filteredAccounts.length === 0 ? (
        /* Empty State Matching Stitch Specification */
        <div className="bg-white rounded-2xl border border-[#DDE5D9] p-12 text-center flex flex-col items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
          <div className="w-16 h-16 rounded-2xl bg-[#E8F5E9] text-[#006B2C] flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl">search_off</span>
          </div>
          <h3 className="text-base font-bold text-[#191C19] font-heading">
            Không tìm thấy tài khoản phù hợp
          </h3>
          <p className="text-xs text-[#717971] max-w-sm mt-1 mb-5">
            Vui lòng kiểm tra lại từ khóa tìm kiếm hoặc điều chỉnh bộ lọc để xem kết quả.
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
        /* Accounts Table */
        <div className="bg-white rounded-2xl border border-[#DDE5D9] shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F6F9F4] text-[#717971] uppercase tracking-wider font-semibold border-b border-[#DDE5D9]">
                <tr>
                  <th className="py-3 px-6">Tài khoản</th>
                  <th className="py-3 px-6">Email</th>
                  <th className="py-3 px-6">Số điện thoại</th>
                  <th className="py-3 px-6">Vai trò</th>
                  <th className="py-3 px-6">Ngày tạo</th>
                  <th className="py-3 px-6">Trạng thái</th>
                  <th className="py-3 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDE5D9]">
                {filteredAccounts.map((acc) => (
                  <tr
                    key={acc.id}
                    className="hover:bg-[#F6F9F4]/70 transition-colors"
                  >
                    {/* Name & Avatar */}
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            acc.role === 'Member'
                              ? 'bg-[#E8F5E9] text-[#006B2C]'
                              : acc.role === 'Organizer'
                              ? 'bg-[#FFF3E0] text-[#FEA619]'
                              : 'bg-[#E0F2F1] text-[#00685F]'
                          }`}
                        >
                          {acc.initials}
                        </div>
                        <div>
                          <p className="font-bold text-[#191C19]">{acc.name}</p>
                          <p className="text-[10px] text-[#717971]">#{acc.code}</p>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-6 font-mono text-[#414942] whitespace-nowrap">
                      {acc.email}
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-6 font-mono text-[#717971] whitespace-nowrap">
                      {acc.phone}
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          acc.role === 'Member'
                            ? 'bg-[#E8F5E9] text-[#006B2C]'
                            : acc.role === 'Organizer'
                            ? 'bg-[#FFF3E0] text-[#FEA619]'
                            : 'bg-[#E0F2F1] text-[#00685F]'
                        }`}
                      >
                        {acc.role}
                      </span>
                    </td>

                    {/* Created Date */}
                    <td className="py-3.5 px-6 text-[#717971] whitespace-nowrap font-mono">
                      {acc.createdAt}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-6 whitespace-nowrap">
                      {acc.status === 'ACTIVE' ? (
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
                            setOpenActionMenuId(
                              openActionMenuId === acc.id ? null : acc.id
                            )
                          }
                          className="p-1 rounded-lg text-[#717971] hover:text-[#191C19] hover:bg-[#E9F0E5] transition-colors"
                          title="Tùy chọn"
                        >
                          <span className="material-symbols-outlined text-lg">
                            more_vert
                          </span>
                        </button>

                        {openActionMenuId === acc.id && (
                          <div
                            className="absolute right-0 mt-1 w-36 bg-white rounded-xl border border-[#DDE5D9] shadow-lg py-1.5 z-30 text-left animate-fadeIn"
                            onMouseLeave={() => setOpenActionMenuId(null)}
                          >
                            <button
                              onClick={() => {
                                setDrawerAccount(acc);
                                setOpenActionMenuId(null);
                              }}
                              className="w-full px-3 py-1.5 text-xs text-[#414942] hover:bg-[#F6F9F4] flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-base">
                                visibility
                              </span>
                              <span>Xem chi tiết</span>
                            </button>

                            {acc.status === 'ACTIVE' ? (
                              <button
                                onClick={() => {
                                  setLockModalAccount(acc);
                                  setLockReason('');
                                  setLockError('');
                                  setOpenActionMenuId(null);
                                }}
                                className="w-full px-3 py-1.5 text-xs text-[#DC2626] hover:bg-[#FEE2E2]/50 flex items-center gap-2 font-medium"
                              >
                                <span className="material-symbols-outlined text-base">
                                  lock
                                </span>
                                <span>Khóa tài khoản</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  handleUnlockAccount(acc);
                                  setOpenActionMenuId(null);
                                }}
                                className="w-full px-3 py-1.5 text-xs text-[#006B2C] hover:bg-[#E8F5E9] flex items-center gap-2 font-medium"
                              >
                                <span className="material-symbols-outlined text-base">
                                  lock_open
                                </span>
                                <span>Mở khóa</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination bar matching Stitch */}
          <div className="p-4 border-t border-[#DDE5D9] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#717971]">
            <span>
              Hiển thị 1 - {filteredAccounts.length} trong tổng số 2.498 tài khoản
            </span>
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
                313
              </button>
              <button className="px-2.5 py-1 rounded-lg border border-[#DDE5D9] hover:bg-[#F6F9F4]">
                Sau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Side Drawer: Chi tiết tài khoản (Trượt từ phải sang) */}
      {drawerAccount && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            onClick={() => setDrawerAccount(null)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between border-l border-[#DDE5D9] animate-slideLeft">
              {/* Drawer Header */}
              <div className="p-6 border-b border-[#DDE5D9] flex items-center justify-between">
                <h3 className="text-base font-bold text-[#191C19] font-heading">
                  Chi tiết tài khoản
                </h3>
                <button
                  onClick={() => setDrawerAccount(null)}
                  className="p-1.5 rounded-lg text-[#717971] hover:text-[#191C19] hover:bg-[#F6F9F4]"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Profile Card */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#F6F9F4] border border-[#DDE5D9]">
                  <div className="w-14 h-14 rounded-2xl bg-[#006B2C] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    {drawerAccount.initials}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[#191C19]">
                      {drawerAccount.name}
                    </h4>
                    <p className="text-xs text-[#717971]">#{drawerAccount.code}</p>
                    <span
                      className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        drawerAccount.status === 'ACTIVE'
                          ? 'bg-[#E8F5E9] text-[#006B2C]'
                          : 'bg-[#FEE2E2] text-[#DC2626]'
                      }`}
                    >
                      {drawerAccount.status === 'ACTIVE' ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </div>
                </div>

                {/* Thông tin liên hệ */}
                <div className="space-y-3">
                  <p className="text-[11px] font-bold text-[#717971] uppercase tracking-wider">
                    Thông tin liên hệ
                  </p>
                  <div className="bg-white rounded-xl border border-[#DDE5D9] p-3.5 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#717971]">Email:</span>
                      <span className="font-mono font-medium text-[#191C19]">
                        {drawerAccount.email}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#717971]">Số điện thoại:</span>
                      <span className="font-mono font-medium text-[#191C19]">
                        {drawerAccount.phone}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Thông tin tài khoản */}
                <div className="space-y-3">
                  <p className="text-[11px] font-bold text-[#717971] uppercase tracking-wider">
                    Thông tin tài khoản
                  </p>
                  <div className="bg-white rounded-xl border border-[#DDE5D9] p-3.5 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#717971]">Vai trò:</span>
                      <span className="font-bold text-[#006B2C]">
                        {drawerAccount.role}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#717971]">Ngày tạo:</span>
                      <span className="font-mono text-[#191C19]">
                        {drawerAccount.createdAt}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lịch sử khóa / mở khóa (Timeline) */}
                <div className="space-y-3">
                  <p className="text-[11px] font-bold text-[#717971] uppercase tracking-wider">
                    Lịch sử Khóa / Mở khóa
                  </p>
                  {drawerAccount.history.length === 0 ? (
                    <div className="p-4 bg-[#F6F9F4] rounded-xl text-center text-xs text-[#717971]">
                      Chưa ghi nhận lịch sử xử phạt nào.
                    </div>
                  ) : (
                    <div className="border-l-2 border-[#DDE5D9] ml-2 pl-4 space-y-4">
                      {drawerAccount.history.map((hist, idx) => (
                        <div key={idx} className="relative text-xs">
                          <span
                            className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full ${
                              hist.action === 'Khóa' ? 'bg-[#DC2626]' : 'bg-[#006B2C]'
                            }`}
                          />
                          <p className="text-[11px] font-mono text-[#717971]">
                            {hist.date} -{' '}
                            <span
                              className={`font-bold ${
                                hist.action === 'Khóa'
                                  ? 'text-[#DC2626]'
                                  : 'text-[#006B2C]'
                              }`}
                            >
                              {hist.action}
                            </span>{' '}
                            bởi {hist.actor}
                          </p>
                          <p className="mt-1 text-[#414942] italic bg-[#F6F9F4] p-2 rounded-lg border border-[#DDE5D9]">
                            Lý do: {hist.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-6 border-t border-[#DDE5D9] bg-[#F6F9F4]">
                {drawerAccount.status === 'ACTIVE' ? (
                  <button
                    onClick={() => {
                      setLockModalAccount(drawerAccount);
                      setLockReason('');
                      setLockError('');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#DC2626] text-white hover:bg-[#B91C1C] transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-base">lock</span>
                    <span>Khóa tài khoản này</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleUnlockAccount(drawerAccount)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#006B2C] text-white hover:bg-[#005523] transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-base">lock_open</span>
                    <span>Mở khóa tài khoản</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Khóa tài khoản này? (Pixel Perfect theo Stitch) */}
      {lockModalAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-[#DDE5D9] shadow-2xl p-6 sm:p-7 space-y-4">
            {/* Modal Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">
                  shield_lock
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-[#191C19] font-heading">
                  Khóa tài khoản này?
                </h3>
                <p className="text-xs text-[#717971] mt-1 leading-relaxed">
                  Tài khoản{' '}
                  <span className="font-semibold text-[#191C19]">
                    {lockModalAccount.name}
                  </span>{' '}
                  sẽ không thể đăng nhập vào hệ thống quầy và cổng quyên góp cho
                  đến khi được ban quản trị mở khóa thủ công.
                </p>
              </div>
            </div>

            {/* Target Account Info Badge */}
            <div className="p-3 bg-[#F6F9F4] rounded-xl border border-[#DDE5D9] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#E9F0E5] text-[#191C19] flex items-center justify-center font-bold text-xs">
                  {lockModalAccount.initials}
                </div>
                <div>
                  <p className="font-bold text-[#191C19]">{lockModalAccount.name}</p>
                  <p className="text-[11px] text-[#717971]">{lockModalAccount.email}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#E8F5E9] text-[#006B2C]">
                {lockModalAccount.role}
              </span>
            </div>

            {/* Textarea Reason */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-semibold text-[#191C19]">
                  Lý do khóa <span className="text-[#DC2626]">*</span>
                </label>
                <span className="text-[11px] text-[#717971]">
                  {lockReason.length} / 300
                </span>
              </div>
              <textarea
                rows="4"
                maxLength={300}
                value={lockReason}
                onChange={(e) => {
                  setLockReason(e.target.value);
                  if (lockError) setLockError('');
                }}
                placeholder="Nhập lý do chi tiết (ví dụ: Vi phạm quy chuẩn tiếp nhận hiện vật quyên góp nhiều lần)..."
                className={`w-full p-3 text-xs rounded-xl border outline-none transition-all ${
                  lockError
                    ? 'border-[#DC2626] bg-[#FFF5F5] focus:ring-2 focus:ring-[#DC2626]/20'
                    : 'border-[#DDE5D9] bg-white hover:border-[#006B2C]/50 focus:border-[#006B2C] focus:ring-2 focus:ring-[#006B2C]/15'
                }`}
              />
              {lockError && (
                <p className="text-xs text-[#DC2626] mt-1 flex items-center gap-1 font-medium">
                  <span className="material-symbols-outlined text-sm">error</span>
                  <span>{lockError}</span>
                </p>
              )}
            </div>

            {/* Notice Footer */}
            <div className="p-3 bg-[#FFF3E0] border border-[#FFE0B2] text-[#855300] rounded-xl text-[11px] flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-[#FEA619] shrink-0">
                info
              </span>
              <span>
                Thông tin này sẽ được lưu vào nhật ký kiểm toán hệ thống.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setLockModalAccount(null)}
                className="px-4 py-2 text-xs font-semibold text-[#414942] hover:bg-[#F6F9F4] rounded-xl transition-colors border border-[#DDE5D9]"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmLock}
                className="px-4 py-2 text-xs font-semibold bg-[#DC2626] text-white hover:bg-[#B91C1C] rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-base">lock</span>
                <span>Xác nhận khóa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
