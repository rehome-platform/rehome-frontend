import React, { useState, useEffect } from 'react';
import AdminPeriodFilter from './AdminPeriodFilter.jsx';
import { Button, Spinner, TableActionButton } from '../../../components/common/index.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import adminApi from '../services/adminApi.js';

/**
 * View Quản lý Tài khoản ReHome
 * Thiết kế chính xác theo Google Stitch (Figma) Prototype:
 * - Bảng danh sách tài khoản chuẩn xác (Member, Organizer, Moderator)
 * - Bộ lọc tìm kiếm theo tên, email, sđt, vai trò, trạng thái
 * - Màn hình Empty State khi tìm kiếm không ra kết quả
 * - Side Drawer trượt "Chi tiết tài khoản" với dòng thời gian lịch sử khóa/mở khóa
 * - Modal "Khóa tài khoản này?" với đếm ký tự (0/300) và xác thực lý do
 * - 100% Real Live API data - hoàn toàn không sử dụng mock data
 */

export default function AdminAccountsView({
  onLogAction,
  remoteAccounts,
  onBanAccount,
  onUnbanAccount,
  page = 0,
  onPageChange,
  totalElements,
  totalPages = 1,
  accountsLoading = false,
  dateFilter,
  dateError,
}) {
  const { user: currentUser } = useAuth();

  const [accounts, setAccounts] = useState(
    Array.isArray(remoteAccounts) ? remoteAccounts : []
  );

  if (typeof React.useEffect === 'function') {
    React.useEffect(() => {
      if (Array.isArray(remoteAccounts)) {
        setAccounts(remoteAccounts);
      }
    }, [remoteAccounts]);
  }

  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Drawer chi tiết & Modal khóa
  const [drawerAccount, setDrawerAccount] = useState(null);
  const [lockModalAccount, setLockModalAccount] = useState(null);
  const [lockReason, setLockReason] = useState('');
  const [lockError, setLockError] = useState('');

  // Loading mutation states chống spam click
  const [isLocking, setIsLocking] = useState(false);
  const [unlockingId, setUnlockingId] = useState(null);

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
    dateFilter?.setPeriod('ALL');
  };

  const updateAccountStatus = (account, status, historyEntry) => {
    const updated = accounts.map((acc) =>
      acc.id === account.id ? withAccountStatus(acc, status, historyEntry) : acc
    );
    setAccounts(updated);

    if (drawerAccount && drawerAccount.id === account.id) {
      setDrawerAccount(withAccountStatus(drawerAccount, status, historyEntry));
    }

    if (onLogAction) {
      onLogAction({
        time: historyEntry.date,
        user: historyEntry.actor,
        role: 'Admin',
        action: `${historyEntry.action} tài khoản ${account.role} "${account.name}"`,
      });
    }
  };

  // Xác nhận khóa tài khoản với cờ loading chống spam
  const handleConfirmLock = async () => {
    if (!lockReason.trim()) {
      setLockError('Vui lòng nhập lý do khóa');
      return;
    }
    if (isLocking) return;

    const actor = currentUser?.fullName || currentUser?.name || 'Admin';
    const nowStr = new Date().toLocaleString('vi-VN');

    try {
      setIsLocking(true);
      if (onBanAccount && lockModalAccount) {
        await onBanAccount(lockModalAccount.id, lockReason.trim());
      }

      updateAccountStatus(lockModalAccount, 'LOCKED', {
        date: nowStr,
        action: 'Khóa',
        actor,
        reason: lockReason.trim(),
      });

      setLockModalAccount(null);
      setLockReason('');
      setLockError('');
    } catch (err) {
      console.warn('Lỗi khi khóa tài khoản trong view:', err);
      if (err?.response?.data?.message) {
        setLockError(err.response.data.message);
      }
    } finally {
      setIsLocking(false);
    }
  };

  // Mở khóa tài khoản với cờ loading chống spam
  const handleUnlockAccount = async (account) => {
    if (!account || unlockingId === account.id) return;
    const actor = currentUser?.fullName || currentUser?.name || 'Admin';
    const nowStr = new Date().toLocaleString('vi-VN');

    try {
      setUnlockingId(account.id);
      if (onUnbanAccount) {
        await onUnbanAccount(account.id);
      }

      updateAccountStatus(account, 'ACTIVE', {
        date: nowStr,
        action: 'Mở khóa',
        actor,
        reason: 'Mở khóa theo yêu cầu sau khi rà soát tuân thủ.',
      });
    } catch (err) {
      console.warn('Lỗi khi mở khóa tài khoản trong view:', err);
    } finally {
      setUnlockingId(null);
    }
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

      {/* Filter Bar */}
      <AccountsFilters
        searchKeyword={searchKeyword} setSearchKeyword={setSearchKeyword}
        selectedRole={selectedRole} setSelectedRole={setSelectedRole}
        selectedStatus={selectedStatus} setSelectedStatus={setSelectedStatus} handleResetFilter={handleResetFilter}
        dateFilter={dateFilter}
      />

      {/* Main Table or Empty State */}
      {filteredAccounts.length === 0 ? (
        /* Empty State Matching Stitch Specification */
        <AccountsEmptyState handleResetFilter={handleResetFilter} />
      ) : (
        /* Accounts Table */
        <AccountsTable
          filteredAccounts={filteredAccounts}
          setDrawerAccount={setDrawerAccount} setLockModalAccount={setLockModalAccount}
          setLockReason={setLockReason} setLockError={setLockError} handleUnlockAccount={handleUnlockAccount}
          unlockingId={unlockingId}
          page={page} onPageChange={onPageChange}
          totalElements={totalElements ?? accounts.length} totalPages={totalPages}
          accountsLoading={accountsLoading}
        />
      )}

      {/* Side Drawer: Chi tiết tài khoản (Trượt từ phải sang) */}
      {drawerAccount && (
        <AccountDetailsDrawer
          drawerAccount={drawerAccount}
          setDrawerAccount={setDrawerAccount}
          setLockModalAccount={setLockModalAccount}
          setLockReason={setLockReason}
          setLockError={setLockError}
          handleUnlockAccount={handleUnlockAccount}
          unlockingId={unlockingId}
        />
      )}

      {/* Modal: Khóa tài khoản này? (Pixel Perfect theo Stitch) */}
      {lockModalAccount && (
        <LockAccountModal
          lockModalAccount={lockModalAccount}
          lockReason={lockReason}
          lockError={lockError}
          isLocking={isLocking}
          setLockModalAccount={setLockModalAccount}
          setLockReason={setLockReason}
          setLockError={setLockError}
          handleConfirmLock={handleConfirmLock}
        />
      )}
    </div>
  );
}

function withAccountStatus(account, status, historyEntry) {
  return { ...account, status, history: [historyEntry, ...account.history] };
}

function AccountActions({
  acc, setDrawerAccount, setLockModalAccount, setLockReason, setLockError,
  handleUnlockAccount, unlockingId,
}) {
  return (
    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
      <TableActionButton
        action="view"
        onClick={() => setDrawerAccount(acc)}
      />
      {acc.status === 'ACTIVE' ? (
        <TableActionButton
          action="view"
          icon="lock"
          label="Khóa tài khoản"
          variant="danger-outline"
          onClick={() => {
            setLockModalAccount(acc);
            setLockReason('');
            setLockError('');
          }}
        />
      ) : (
        <TableActionButton
          action="view"
          icon="lock_open"
          label={unlockingId === acc.id ? 'Đang mở...' : 'Mở khóa'}
          disabled={unlockingId === acc.id}
          className="border-[#ABEFC6] text-[#006B2C] hover:bg-[#ECFDF3] hover:border-[#006B2C] hover:text-[#006B2C]"
          onClick={() => handleUnlockAccount(acc)}
        />
      )}
    </div>
  );
}

function AccountRow({
  acc, setDrawerAccount,
  setLockModalAccount, setLockReason, setLockError, handleUnlockAccount,
  unlockingId,
}) {
  return (
    <tr
      key={acc.id}
      className="hover:bg-[#F6F9F4]/70 transition-colors"
    >
      {/* Name */}
      <td className="py-3.5 px-6 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
              acc.role === 'Member'
                ? 'bg-[#E8F5E9] text-[#006B2C]'
                : acc.role === 'Organizer'
                ? 'bg-[#FFF3E0] text-[#B45309]'
                : 'bg-[#E0F2F1] text-[#00685F]'
            }`}
          >
            {acc.initials}
          </div>
          <p className="font-bold text-[#1F2A37]">{acc.name}</p>
        </div>
      </td>

      {/* Email */}
      <td className="py-3.5 px-6 font-mono text-[#5B6776] whitespace-nowrap">
        {acc.email}
      </td>

      {/* Phone */}
      <td className="py-3.5 px-6 font-mono text-[#5B6776] whitespace-nowrap">
        {acc.phone}
      </td>

      {/* Role */}
      <td className="py-3.5 px-6 whitespace-nowrap">
        <span
          className={`inline-block px-2.5 py-1 rounded-xl text-[10px] font-bold ${
            acc.role === 'Member'
              ? 'bg-[#E8F5E9] text-[#006B2C]'
              : acc.role === 'Organizer'
              ? 'bg-[#FFF3E0] text-[#B45309]'
              : 'bg-[#E0F2F1] text-[#00685F]'
          }`}
        >
          {acc.role}
        </span>
      </td>

      {/* Created Date */}
      <td className="py-3.5 px-6 text-[#5B6776] whitespace-nowrap font-mono">
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

      {/* Actions */}
      <td className="py-3.5 px-6 text-right whitespace-nowrap">
        <AccountActions
          acc={acc}
          setDrawerAccount={setDrawerAccount} setLockModalAccount={setLockModalAccount}
          setLockReason={setLockReason} setLockError={setLockError} handleUnlockAccount={handleUnlockAccount}
          unlockingId={unlockingId}
        />
      </td>
    </tr>
  );
}

function AccountsPagination({ count, page, onPageChange, totalElements, totalPages }) {
  const currentPage = page ?? 0;
  return (
    <div className="p-4 border-t border-[#DDE5D9] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#5B6776]">
      <span>
        Trang <strong className="text-[#1F2A37]">{currentPage + 1}</strong> / {Math.max(totalPages || 1, 1)}
        {' · '}
        Tổng số <strong className="text-[#1F2A37]">{(totalElements ?? count).toLocaleString('vi-VN')}</strong> tài khoản
      </span>
      <div className="flex items-center gap-1 font-medium">
        <button
          type="button"
          onClick={() => onPageChange?.(Math.max(0, currentPage - 1))}
          disabled={currentPage <= 0}
          className="px-2.5 py-1 rounded-lg border border-[#DDE5D9] hover:bg-[#F6F9F4] disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Trước
        </button>
        <button
          type="button"
          onClick={() => onPageChange?.(currentPage + 1)}
          disabled={currentPage + 1 >= (totalPages || 1)}
          className="px-2.5 py-1 rounded-lg border border-[#DDE5D9] hover:bg-[#F6F9F4] disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Sau
        </button>
      </div>
    </div>
  );
}

function AccountsEmptyState({ handleResetFilter }) {
  return (
    <div className="bg-white rounded-2xl border border-[#DDE5D9] p-12 text-center flex flex-col items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
      <div className="w-16 h-16 rounded-2xl bg-[#E8F5E9] text-[#006B2C] flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-3xl">search_off</span>
      </div>
      <h3 className="text-base font-bold text-[#1F2A37] font-heading">
        Không tìm thấy tài khoản phù hợp
      </h3>
      <p className="text-xs text-[#5B6776] max-w-sm mt-1 mb-5">
        Vui lòng kiểm tra lại từ khóa tìm kiếm hoặc điều chỉnh bộ lọc để xem kết quả.
      </p>
      <Button
        type="button"
        variant="primary"
        size="sm"
        onClick={handleResetFilter}
        className="gap-1.5"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-sm">filter_alt_off</span>
        <span>Xóa bộ lọc</span>
      </Button>
    </div>
  );
}

function AccountsTable({
  filteredAccounts,
  setDrawerAccount,
  setLockModalAccount, setLockReason, setLockError, handleUnlockAccount, unlockingId,
  page, onPageChange, totalElements, totalPages, accountsLoading,
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#DDE5D9] shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F6F9F4] text-[#5B6776] tracking-wider font-semibold border-b border-[#DDE5D9]">
            <tr>
              <th className="py-3 px-6 whitespace-nowrap">Họ tên</th>
              <th className="py-3 px-6 whitespace-nowrap">Email</th>
              <th className="py-3 px-6 whitespace-nowrap">Số điện thoại</th>
              <th className="py-3 px-6 whitespace-nowrap">Vai trò</th>
              <th className="py-3 px-6 whitespace-nowrap">Ngày tạo</th>
              <th className="py-3 px-6 whitespace-nowrap">Trạng thái</th>
              <th className="py-3 px-6 text-right whitespace-nowrap">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DDE5D9]">
            {filteredAccounts.map((acc) => (
              <AccountRow
                key={acc.id}
                acc={acc}
                setDrawerAccount={setDrawerAccount}
                setLockModalAccount={setLockModalAccount}
                setLockReason={setLockReason}
                setLockError={setLockError}
                handleUnlockAccount={handleUnlockAccount}
                unlockingId={unlockingId}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Phân trang thật theo API 135: Trước/Sau tải đúng trang đó từ server; số liệu không viết cứng */}
      <AccountsPagination
        count={filteredAccounts.length}
        page={page}
        onPageChange={onPageChange}
        totalElements={totalElements}
        totalPages={totalPages}
      />
      {accountsLoading && (
        <div className="px-4 pb-3 flex items-center gap-2 text-[11px] text-[#5B6776]">
          <Spinner size="xs" />
          <span>Đang tải trang kế tiếp...</span>
        </div>
      )}
    </div>
  );
}

function AccountsFilters({
  searchKeyword, setSearchKeyword, selectedRole, setSelectedRole,
  selectedStatus, setSelectedStatus, handleResetFilter, dateFilter,
}) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-[#DDE5D9] shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
      {/* Search Input */}
      <div className="relative flex-1">
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

      {/* Dropdowns */}
      <div className="flex flex-wrap items-center gap-2.5">
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="px-3 py-2.5 text-xs rounded-xl border border-[#DDE5D9] bg-white text-[#5B6776] font-medium outline-none hover:border-[#006B2C]/50 transition-colors"
        >
          <option value="ALL">Vai trò: Tất cả</option>
          <option value="member">Thành viên</option>
          <option value="organizer">Tổ chức từ thiện</option>
          <option value="moderator">Nhân viên điểm kí gửi</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2.5 text-xs rounded-xl border border-[#DDE5D9] bg-white text-[#5B6776] font-medium outline-none hover:border-[#006B2C]/50 transition-colors"
        >
          <option value="ALL">Trạng thái: Tất cả</option>
          <option value="ACTIVE">Hoạt động</option>
          <option value="LOCKED">Bị khóa</option>
        </select>

        {/* Lọc theo ngày tạo tài khoản */}
        {dateFilter && <AdminPeriodFilter filter={dateFilter} name="tài khoản" label="Ngày tạo" />}

        {(searchKeyword || selectedRole !== 'ALL' || selectedStatus !== 'ALL' || (dateFilter && dateFilter.period !== 'ALL')) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetFilter}
            className="gap-1 text-[#006B2C] hover:bg-[#E8F5E9]"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-base">restart_alt</span>
            <span>Xóa bộ lọc</span>
          </Button>
        )}
      </div>
    </div>
  );
}

function AccountInformation({ drawerAccount }) {
  return (
    <>
      <div className="space-y-3">
        <p className="text-[11px] font-bold text-[#5B6776] uppercase tracking-wider">
          Thông tin liên hệ
        </p>
        <div className="bg-white rounded-xl border border-[#DDE5D9] p-3.5 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-[#5B6776]">Email:</span>
            <span className="font-mono font-medium text-[#1F2A37]">
              {drawerAccount.email}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5B6776]">Số điện thoại:</span>
            <span className="font-mono font-medium text-[#1F2A37]">
              {drawerAccount.phone}
            </span>
          </div>
        </div>
      </div>

      {/* Thông tin tài khoản */}
      <div className="space-y-3">
        <p className="text-[11px] font-bold text-[#5B6776] uppercase tracking-wider">
          Thông tin tài khoản
        </p>
        <div className="bg-white rounded-xl border border-[#DDE5D9] p-3.5 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-[#5B6776]">Vai trò:</span>
            <span className="font-bold text-[#006B2C]">
              {drawerAccount.role}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#5B6776]">Ngày tạo:</span>
            <span className="font-mono text-[#1F2A37]">
              {drawerAccount.createdAt}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

function AccountHistory({ history }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold text-[#5B6776] uppercase tracking-wider">
        Lịch sử Khóa / Mở khóa
      </p>
      {history.length === 0 ? (
        <div className="p-4 bg-[#F6F9F4] rounded-xl text-center text-xs text-[#5B6776]">
          Chưa ghi nhận lịch sử xử phạt nào.
        </div>
      ) : (
        <div className="border-l-2 border-[#DDE5D9] ml-2 pl-4 space-y-4">
          {history.map((hist, idx) => (
            <div key={idx} className="relative text-xs">
              <span
                className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full ${
                  hist.action === 'Khóa' ? 'bg-[#DC2626]' : 'bg-[#006B2C]'
                }`}
              />
              <p className="text-[11px] font-mono text-[#5B6776]">
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
              <p className="mt-1 text-[#5B6776] italic bg-[#F6F9F4] p-2 rounded-lg border border-[#DDE5D9]">
                Lý do: {hist.reason}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AccountDetailsDrawer({
  drawerAccount, setDrawerAccount, setLockModalAccount,
  setLockReason, setLockError, handleUnlockAccount, unlockingId,
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        onClick={() => setDrawerAccount(null)}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
      />
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between border-l border-[#DDE5D9] animate-slideLeft">
          {/* Drawer Header */}
          <div className="p-6 border-b border-[#DDE5D9] flex items-center justify-between">
            <h3 className="text-base font-bold text-[#1F2A37] font-heading">
              Chi tiết tài khoản
            </h3>
            <button
              onClick={() => setDrawerAccount(null)}
              className="p-1.5 rounded-xl text-[#5B6776] hover:text-[#1F2A37] hover:bg-[#F6F9F4]"
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
                <h4 className="text-base font-bold text-[#1F2A37]">
                  {drawerAccount.name}
                </h4>
                <p className="text-xs text-[#5B6776]">#{drawerAccount.code}</p>
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
            <AccountInformation drawerAccount={drawerAccount} />

            {/* Lịch sử khóa / mở khóa (Timeline) */}
            <AccountHistory history={drawerAccount.history} />
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-6 border-t border-[#DDE5D9] bg-[#F6F9F4]">
            {drawerAccount.status === 'ACTIVE' ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => {
                  setLockModalAccount(drawerAccount);
                  setLockReason('');
                  setLockError('');
                }}
                className="w-full py-2.5 gap-2"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-base">lock</span>
                <span>Khóa tài khoản này</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                loading={unlockingId === drawerAccount.id}
                onClick={() => handleUnlockAccount(drawerAccount)}
                disabled={unlockingId === drawerAccount.id}
                className="w-full py-2.5 gap-2"
              >
                {unlockingId !== drawerAccount.id && (
                  <span aria-hidden="true" className="material-symbols-outlined text-base">lock_open</span>
                )}
                <span>{unlockingId === drawerAccount.id ? 'Đang mở khóa...' : 'Mở khóa tài khoản'}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LockAccountModal({
  lockModalAccount, lockReason, lockError, isLocking,
  setLockModalAccount, setLockReason, setLockError, handleConfirmLock,
}) {
  const roleStr = String(lockModalAccount?.role || '').toUpperCase();
  const isOrgAccount =
    roleStr.includes('ORG') || String(lockModalAccount?.role || '').toLowerCase().includes('tổ chức');
  const [banPreview, setBanPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!lockModalAccount?.id || !isOrgAccount) {
      setBanPreview(null);
      return undefined;
    }
    let cancelled = false;
    setPreviewLoading(true);
    adminApi
      .getBanPreview(lockModalAccount.id)
      .then((res) => {
        if (!cancelled) setBanPreview(res);
      })
      .catch(() => {
        if (!cancelled) setBanPreview(null);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lockModalAccount?.id, isOrgAccount]);

  return (
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
            <h3 className="text-base font-bold text-[#1F2A37] font-heading">
              Khóa tài khoản này?
            </h3>
            <p className="text-xs text-[#5B6776] mt-1 leading-relaxed">
              Tài khoản{' '}
              <span className="font-semibold text-[#1F2A37]">
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
            <div className="w-8 h-8 rounded-lg bg-[#E9F0E5] text-[#1F2A37] flex items-center justify-center font-bold text-xs">
              {lockModalAccount.initials}
            </div>
            <div>
              <p className="font-bold text-[#1F2A37]">{lockModalAccount.name}</p>
              <p className="text-[11px] text-[#5B6776]">{lockModalAccount.email}</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#E8F5E9] text-[#006B2C]">
            {lockModalAccount.role}
          </span>
        </div>

        {isOrgAccount && (
          <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] leading-relaxed">
            {previewLoading ? (
              <span>Đang kiểm tra báo cáo và lượt quyên góp liên quan...</span>
            ) : banPreview ? (
              <span>
                Sẽ tự đóng <strong>{banPreview.pendingReportCount}</strong> báo cáo đang chờ và tạm giữ{' '}
                <strong>{banPreview.pendingPickupDonationCount}</strong> lượt quyên góp chờ lấy.
              </span>
            ) : (
              <span>
                Các báo cáo đang chờ liên quan đến tổ chức sẽ được đóng tự động và các lượt quyên góp chờ lấy sẽ chuyển sang trạng thái tạm giữ.
              </span>
            )}
          </div>
        )}

        {/* Textarea Reason */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <label className="font-semibold text-[#1F2A37]">
              Lý do khóa <span className="text-[#DC2626]">*</span>
            </label>
            <span className="text-[11px] text-[#5B6776]">
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLockModalAccount(null)}
            disabled={isLocking}
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            loading={isLocking}
            onClick={handleConfirmLock}
            disabled={isLocking}
            className="gap-1.5"
          >
            {isLocking ? (
              <span>Đang khóa...</span>
            ) : (
              <>
                <span aria-hidden="true" className="material-symbols-outlined text-base">lock</span>
                <span>Xác nhận khóa</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
