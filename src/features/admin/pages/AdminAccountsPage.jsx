import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import AdminAccountsView from '../components/AdminAccountsView.jsx';
import adminApi from '../services/adminApi.js';

/**
 * Trang Quản lý Tài khoản Admin (/admin/users)
 * Kết nối Real Data với Backend Azure (API 135: GET /api/admin/accounts)
 * Tự động đồng bộ tài khoản thật: Member, Organizer, Moderator trong hệ thống
 */
export default function AdminAccountsPage() {
  const { onLogAction } = useOutletContext() || {};
  const [remoteAccounts, setRemoteAccounts] = useState([]);

  const fetchAccounts = async () => {
    try {
      const res = await adminApi.getAccounts({ page: 0, size: 50 });
      const rawList = Array.isArray(res) ? res : res?.content || res?.result?.content || [];

      if (rawList && rawList.length > 0) {
        const mapped = rawList.map((acc, idx) => {
          const roleStr = String(acc.role || '').toUpperCase();
          let roleLabel = 'Member';
          if (roleStr.includes('MODERATOR') || roleStr.includes('STAFF')) {
            roleLabel = 'Moderator';
          } else if (roleStr.includes('ORG')) {
            roleLabel = 'Organizer';
          } else if (roleStr.includes('ADMIN')) {
            roleLabel = 'Admin';
          }

          const name = acc.fullName || (acc.email ? acc.email.split('@')[0] : `User-${idx + 1}`);
          const initials = name
            .split(' ')
            .filter(Boolean)
            .map((w) => w[0])
            .slice(-2)
            .join('')
            .toUpperCase() || 'US';

          const isBanned = acc.status === 'BANNED' || acc.status === 'LOCKED';

          return {
            id: acc.accountId || `USR-${idx + 101}`,
            code: acc.code || (acc.accountId ? String(acc.accountId).slice(0, 6) : String(849100 + idx)),
            name,
            initials,
            email: acc.email || '',
            phone: acc.phone || '—',
            role: roleLabel,
            createdAt: acc.createdAt ? new Date(acc.createdAt).toLocaleDateString('vi-VN') : '—',
            status: isBanned ? 'LOCKED' : 'ACTIVE',
            history: acc.banReason
              ? [
                  {
                    date: new Date().toLocaleDateString('vi-VN'),
                    action: 'Khóa',
                    actor: 'Hệ thống / Admin',
                    reason: acc.banReason,
                  },
                ]
              : [],
          };
        });
        setRemoteAccounts(mapped);
      }
    } catch (err) {
      console.warn('Lỗi gọi API accounts:', err);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleBanAccount = async (accountId, reason) => {
    try {
      await adminApi.banAccount(accountId, reason);
      await fetchAccounts();
    } catch (err) {
      console.warn('Lỗi khi khóa tài khoản:', err);
    }
  };

  const handleUnbanAccount = async (accountId) => {
    try {
      await adminApi.unbanAccount(accountId);
      await fetchAccounts();
    } catch (err) {
      console.warn('Lỗi khi mở khóa tài khoản:', err);
    }
  };

  return (
    <AdminAccountsView
      onLogAction={onLogAction}
      remoteAccounts={remoteAccounts}
      onBanAccount={handleBanAccount}
      onUnbanAccount={handleUnbanAccount}
    />
  );
}
