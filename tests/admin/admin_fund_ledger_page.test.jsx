import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminFundLedgerPage from '../../src/features/admin/pages/AdminFundLedgerPage.jsx';
import AdminSidebar from '../../src/features/admin/components/AdminSidebar.jsx';
import AdminHeader from '../../src/features/admin/components/AdminHeader.jsx';
import adminApi from '../../src/features/admin/services/adminApi.js';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    loading: false,
    user: { fullName: 'Quản trị viên', email: 'admin@rehome.vn', role: 'admin' },
    logout: vi.fn(),
  }),
}));

vi.mock('../../src/features/admin/services/adminApi.js', () => ({
  default: {
    getFundLedger: vi.fn(),
    getFundReconciliation: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-11T12:00:00Z'));
  adminApi.getFundReconciliation.mockResolvedValue({
    status: 'BALANCED',
    difference: 0,
    fundBalance: -1753500,
    memberWalletBalance: 1753500,
    memberDifference: 0,
    ledgerNetTotal: 0,
    unmatchedEntries: 0,
    unbalancedPairs: 0,
    checkedAt: '2026-11-11T10:00:00Z',
  });
  adminApi.getFundLedger.mockResolvedValue({
    content: [
      {
        id: 'tx-1',
        transactionNo: 'FTX-500',
        type: 'COMMISSION_REVENUE',
        amount: 100000,
        balanceAfter: 3000000,
        status: 'SUCCESS',
        note: 'Thu hoa hồng',
        createdAt: '2026-11-11T09:00:00Z',
        relatedAccount: null,
        referenceTransaction: null,
      },
    ],
    page: 0,
    size: 10,
    totalElements: 1,
    totalPages: 1,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AdminFundLedgerPage', () => {
  it('shows the double-entry ledger and reconciliation on its own page', async () => {
    render(<AdminFundLedgerPage />);

    expect(screen.getByRole('heading', { name: 'Sổ quỹ & Đối soát' })).toBeInTheDocument();
    expect(await screen.findByText('Đối soát: Khớp')).toBeInTheDocument();
    expect(await screen.findByText('FTX-500')).toBeInTheDocument();
  });

  it('filters the ledger by the page period (default: this month in Vietnam time)', async () => {
    render(<AdminFundLedgerPage />);
    const period = screen.getByRole('combobox', { name: 'Khoảng thời gian' });
    expect(period).toHaveValue('MONTH');

    await waitFor(() =>
      expect(adminApi.getFundLedger).toHaveBeenLastCalledWith({
        from: '2026-11-01',
        to: '2026-11-11',
        type: undefined,
        page: 0,
        size: 10,
      })
    );

    fireEvent.change(period, { target: { value: 'ALL' } });
    await waitFor(() =>
      expect(adminApi.getFundLedger).toHaveBeenLastCalledWith({
        from: undefined,
        to: undefined,
        type: undefined,
        page: 0,
        size: 10,
      })
    );
    // Đối soát luôn là số hiện tại: đổi khoảng thời gian không gọi lại
    expect(adminApi.getFundReconciliation).toHaveBeenCalledTimes(1);
  });

  it('rejects a reversed custom range without calling the ledger API again', async () => {
    render(<AdminFundLedgerPage />);
    await screen.findByText('FTX-500');

    fireEvent.change(screen.getByRole('combobox', { name: 'Khoảng thời gian' }), {
      target: { value: 'CUSTOM' },
    });
    const callsBefore = adminApi.getFundLedger.mock.calls.length;
    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-11-15' } });
    fireEvent.change(screen.getByLabelText('Đến ngày'), { target: { value: '2026-11-10' } });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc'
    );
    expect(adminApi.getFundLedger).toHaveBeenCalledTimes(callsBefore);
  });
});

describe('Admin navigation for Tổng quan and Sổ quỹ & Đối soát', () => {
  it('lists Tổng quan then Sổ quỹ & Đối soát at the top of the sidebar', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AdminSidebar />
      </MemoryRouter>
    );

    const links = screen.getAllByRole('link');
    const labels = links.map((a) => a.textContent.trim());
    const overviewIdx = labels.findIndex((t) => t.includes('Tổng quan'));
    const ledgerIdx = labels.findIndex((t) => t.includes('Sổ quỹ & Đối soát'));
    expect(links[overviewIdx]).toHaveAttribute('href', '/admin');
    expect(links[ledgerIdx]).toHaveAttribute('href', '/admin/fund-ledger');
    expect(ledgerIdx).toBe(overviewIdx + 1);
    // Tên cũ gộp cả quỹ vào tổng quan đã bỏ
    expect(labels.some((t) => t.includes('Tổng quan & Quỹ nền tảng'))).toBe(false);
  });

  it('highlights only the current page link', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/admin/fund-ledger']}>
        <AdminSidebar />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /Sổ quỹ & Đối soát/ }).className).toContain('bg-[#006B2C]');
    expect(screen.getByRole('link', { name: /Tổng quan/ }).className).not.toContain('bg-[#006B2C]');

    rerender(
      <MemoryRouter initialEntries={['/admin']} key="overview">
        <AdminSidebar />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /Tổng quan/ }).className).toContain('bg-[#006B2C]');
    expect(screen.getByRole('link', { name: /Sổ quỹ & Đối soát/ }).className).not.toContain('bg-[#006B2C]');
  });

  it.each([
    ['/admin', 'Tổng quan điều hành'],
    ['/admin/fund-ledger', 'Sổ quỹ & Đối soát quỹ nền tảng'],
  ])('shows header title for %s', (route, title) => {
    render(
      <MemoryRouter initialEntries={[route]}>
        <AdminHeader />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
  });
});
