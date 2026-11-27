import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminAccountsView from '../../src/features/admin/components/AdminAccountsView.jsx';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { id: 'admin-1', fullName: 'Admin Test', role: 'ADMIN' },
  }),
}));

vi.mock('../../src/features/admin/services/adminApi.js', () => ({
  default: {
    getBanPreview: vi.fn().mockResolvedValue({
      pendingReportCount: 0,
      pendingPickupDonationCount: 0,
    }),
  },
}));

describe('AdminAccountsView action column alignment', () => {
  const sampleAccounts = [
    {
      id: 'acc-active',
      code: 'ACC001',
      name: 'Nguyễn Văn Active',
      initials: 'NA',
      email: 'active@example.com',
      phone: '0901111222',
      role: 'Member',
      createdAt: '01/11/2026',
      status: 'ACTIVE',
      history: [],
    },
    {
      id: 'acc-locked',
      code: 'ACC002',
      name: 'Trần Thị Locked',
      initials: 'TL',
      email: 'locked@example.com',
      phone: '0903333444',
      role: 'Organizer',
      createdAt: '02/11/2026',
      status: 'LOCKED',
      history: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses fixed second grid track for lock/unlock buttons so Xem chi tiết stays aligned across rows', async () => {
    const onUnbanAccount = vi.fn().mockResolvedValue(undefined);

    render(
      <AdminAccountsView
        remoteAccounts={sampleAccounts}
        onBanAccount={vi.fn()}
        onUnbanAccount={onUnbanAccount}
      />,
    );

    const actionCells = screen.getAllByTestId('account-actions-cell');
    expect(actionCells).toHaveLength(2);
    actionCells.forEach((cell) => {
      expect(cell.className).toContain('inline-grid');
      expect(cell.className).toContain('grid-cols-[auto_144px]');
    });

    const lockBtn = screen.getByRole('button', { name: /Khóa tài khoản/i });
    const unlockBtn = screen.getByRole('button', { name: /Mở khóa/i });
    expect(lockBtn.className).toContain('w-full');
    expect(unlockBtn.className).toContain('w-full');

    const viewBtns = screen.getAllByRole('button', { name: /Xem chi tiết/i });
    expect(viewBtns).toHaveLength(2);
    fireEvent.click(viewBtns[0]);
    expect(screen.getByText('Chi tiết tài khoản')).toBeInTheDocument();

    fireEvent.click(unlockBtn);
    await waitFor(() => {
      expect(onUnbanAccount).toHaveBeenCalledWith('acc-locked');
    });
  });
});
