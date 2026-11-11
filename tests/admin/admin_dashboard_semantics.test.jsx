import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboardPage from '../../src/features/admin/pages/AdminDashboardPage.jsx';
import adminApi from '../../src/features/admin/services/adminApi.js';
import ToastContext, { ToastProvider } from '../../src/context/ToastContext.jsx';

vi.mock('../../src/features/admin/services/adminApi.js', () => ({
  default: {
    getDashboard: vi.fn(),
    exportDashboard: vi.fn(),
    getAccounts: vi.fn(),
    getModerators: vi.fn(),
    getWarehouses: vi.fn(),
    getAuditLogs: vi.fn(),
    getRevenueItems: vi.fn(),
    getFundLedger: vi.fn(),
    getFundReconciliation: vi.fn(),
    getAccountGrowth: vi.fn(),
  },
}));

const dashboard = {
  revenue: 1000000,
  platformRevenue: 125000,
  commissionRevenue: 100000,
  withdrawalFeeRevenue: 25000,
  compensationExpense: 15000,
  walletBalanceHeld: 2000000,
  fundBalance: 3000000,
  ordersCount: 15,
  inventoryCount: 24,
  avgServiceRating: 5,
  overdueTaskCount: 1,
  term1SalesRevenue: 600000,
  term1Commission: 60000,
  term2SalesRevenue: 200000,
  term2Commission: 30000,
  term3SalesRevenue: 50000,
  term3Commission: 10000,
  term1StockCount: 12,
  term2StockCount: 8,
  term3StockCount: 4,
  totalSoldItemsCount: 6,
  netProfitMarginPercent: 14.71,
};

function mountDashboard() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AdminDashboardPage />
      </ToastProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-11T12:00:00Z'));

  adminApi.getDashboard.mockResolvedValue(dashboard);
  adminApi.exportDashboard.mockResolvedValue(new Blob(['xlsx']));
  adminApi.getAccounts.mockImplementation(({ role }) =>
    Promise.resolve({ totalElements: role === 'MEMBER' ? 12 : 3 })
  );
  adminApi.getModerators.mockResolvedValue({ totalElements: 2 });
  adminApi.getWarehouses.mockResolvedValue([]);
  adminApi.getAuditLogs.mockResolvedValue({ content: [] });
  adminApi.getRevenueItems.mockResolvedValue({
    content: [
      {
        orderItemId: 'oi-1',
        productId: 'PRD-1',
        productName: 'Bàn gỗ',
        orderNo: 'ORD-01',
        price: 500000,
        termApplied: 1,
        commissionRate: 0.1,
        commissionAmount: 50000,
        completedAt: '2026-11-10T10:00:00Z',
      },
    ],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
  });
  adminApi.getFundReconciliation.mockResolvedValue({
    status: 'BALANCED',
    difference: 0,
    fundBalance: 3000000,
    ledgerBalance: 3000000,
    memberWalletBalance: 2000000,
    memberLedgerBalance: 2000000,
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
  adminApi.getAccountGrowth.mockResolvedValue({
    granularity: 'day',
    from: '2026-10-13',
    to: '2026-11-11',
    total: 5,
    points: [
      { label: '2026-11-10', periodStart: '2026-11-10', periodEnd: '2026-11-10', count: 2 },
      { label: '2026-11-11', periodStart: '2026-11-11', periodEnd: '2026-11-11', count: 3 },
    ],
  });

  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:dashboard'), revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Admin dashboard API semantics', () => {
  it.each([
    [1000000, '12.5%'],
    [0, '0.0%'],
  ])('shows the revenue ratio for completed-order amount %s', async (revenue, ratio) => {
    adminApi.getDashboard.mockResolvedValue({ ...dashboard, revenue });
    mountDashboard();
    expect(
      await screen.findByText(`${ratio} Tỷ lệ doanh thu nền tảng / tổng tiền đơn hoàn thành`)
    ).toBeInTheDocument();
    expect(screen.getByText('Hoa hồng và phí rút hàng đã thu, chưa trừ chi đền bù')).toBeVisible();
  });

  it('syncs unified period filter across dashboard API, tabs, and Excel export', async () => {
    mountDashboard();
    const period = screen.getByRole('combobox', { name: 'Khoảng thời gian' });
    expect(period).toHaveValue('MONTH');

    await waitFor(() =>
      expect(adminApi.getDashboard).toHaveBeenLastCalledWith({
        from: '2026-11-01',
        to: '2026-11-11',
      })
    );

    fireEvent.click(screen.getByRole('button', { name: /Xuất báo cáo Excel/ }));
    await waitFor(() =>
      expect(adminApi.exportDashboard).toHaveBeenLastCalledWith('2026-11-01', '2026-11-11')
    );

    fireEvent.change(period, { target: { value: 'WEEK' } });
    await waitFor(() =>
      expect(adminApi.getDashboard).toHaveBeenLastCalledWith({
        from: '2026-11-09',
        to: '2026-11-11',
      })
    );

    fireEvent.click(screen.getByRole('button', { name: /Báo cáo doanh thu theo kỳ/ }));
    expect(await screen.findByText('Bàn gỗ')).toBeInTheDocument();
    expect(adminApi.getRevenueItems).toHaveBeenLastCalledWith({
      from: '2026-11-09',
      to: '2026-11-11',
      term: undefined,
      page: 0,
      size: 20,
    });
    expect(screen.getByRole('combobox', { name: 'Khoảng thời gian' })).toHaveValue('WEEK');

    fireEvent.click(screen.getByRole('button', { name: /Xuất báo cáo Excel/ }));
    await waitFor(() =>
      expect(adminApi.exportDashboard).toHaveBeenLastCalledWith('2026-11-09', '2026-11-11')
    );

    fireEvent.click(screen.getByRole('button', { name: /Hoạt động & Tăng trưởng/ }));
    fireEvent.change(period, { target: { value: 'ALL' } });
    await waitFor(() =>
      expect(adminApi.getDashboard).toHaveBeenLastCalledWith({
        from: undefined,
        to: undefined,
      })
    );
    fireEvent.click(screen.getByRole('button', { name: /Xuất báo cáo Excel/ }));
    await waitFor(() =>
      expect(adminApi.exportDashboard).toHaveBeenLastCalledWith('1970-01-01', '2026-11-11')
    );
  });

  it.each([
    ['2026-11-01T16:59:59Z', 'TODAY', '2026-11-01', '2026-11-01'],
    ['2026-11-01T16:59:59Z', 'WEEK', '2026-10-26', '2026-11-01'],
    ['2026-11-01T17:00:00Z', 'WEEK', '2026-11-02', '2026-11-02'],
    ['2026-11-30T16:59:59Z', 'MONTH', '2026-11-01', '2026-11-30'],
    ['2026-11-30T17:00:00Z', 'MONTH', '2026-12-01', '2026-12-01'],
    ['2026-12-31T17:00:00Z', 'ALL', '1970-01-01', '2027-01-01'],
  ])('uses Vietnamese calendar dates at %s for %s export', async (now, period, from, to) => {
    vi.setSystemTime(new Date(now));
    mountDashboard();
    fireEvent.change(screen.getByRole('combobox', { name: 'Khoảng thời gian' }), {
      target: { value: period },
    });
    let downloadedName;
    HTMLAnchorElement.prototype.click.mockImplementation(function () {
      downloadedName = this.download;
    });
    fireEvent.click(screen.getByRole('button', { name: /Xuất báo cáo Excel/ }));
    await waitFor(() => expect(adminApi.exportDashboard).toHaveBeenCalledWith(from, to));
    await waitFor(() => expect(downloadedName).toBe(`dashboard_report_${from}_${to}.xlsx`));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:dashboard');
  });

  it('validates custom date range from > to and prevents invalid API calls', async () => {
    mountDashboard();
    await waitFor(() => expect(adminApi.getDashboard).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByRole('combobox', { name: 'Khoảng thời gian' }), {
      target: { value: 'CUSTOM' },
    });

    const fromInput = screen.getByLabelText('Từ ngày');
    const toInput = screen.getByLabelText('Đến ngày');
    fireEvent.change(fromInput, { target: { value: '2026-11-15' } });
    fireEvent.change(toInput, { target: { value: '2026-11-10' } });

    expect(await screen.findByText(/Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc/)).toBeInTheDocument();
    expect(adminApi.getDashboard).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Xuất báo cáo Excel/ }));
    expect(adminApi.exportDashboard).not.toHaveBeenCalled();

    fireEvent.change(fromInput, { target: { value: '2026-11-05' } });
    await waitFor(() =>
      expect(adminApi.getDashboard).toHaveBeenLastCalledWith({
        from: '2026-11-05',
        to: '2026-11-10',
      })
    );
  });

  it('prevents duplicate exports while pending and reports failures', async () => {
    let rejectExport;
    adminApi.exportDashboard.mockReturnValue(
      new Promise((_, reject) => {
        rejectExport = reject;
      })
    );
    const error = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <MemoryRouter>
        <ToastContext.Provider value={{ toast: { error } }}>
          <AdminDashboardPage />
        </ToastContext.Provider>
      </MemoryRouter>
    );
    const button = screen.getByRole('button', { name: /Xuất báo cáo Excel/ });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    rejectExport(new Error('Network error'));
    await waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('Không thể kết nối API xuất báo cáo Excel')
      )
    );
    expect(button).toBeEnabled();
  });

  it('renders revenue breakdown, stock by term, and double-entry ledger on fund tab', async () => {
    mountDashboard();

    expect(await screen.findByText('Cơ Cấu Doanh Thu Nền Tảng')).toBeInTheDocument();
    expect(screen.getByText(/Chi đền bù hàng xuống cấp/)).toBeInTheDocument();
    expect(screen.getByText(/Kỳ 1: 12 món/)).toBeInTheDocument();
    expect(screen.getByText(/Kỳ 2: 8 món/)).toBeInTheDocument();
    expect(screen.getByText(/Kỳ 3: 4 món/)).toBeInTheDocument();
    expect(await screen.findByText('Đối soát: Khớp')).toBeInTheDocument();
    expect(screen.getByText('FTX-500')).toBeInTheDocument();
  });

  it('totals only the three displayed account roles and loads growth chart on activities tab', async () => {
    mountDashboard();
    fireEvent.click(screen.getByRole('button', { name: /Hoạt động & Tăng trưởng/ }));
    expect(
      await screen.findByText('Tổng cộng 17 tài khoản thuộc ba nhóm Member, tổ chức và Moderator.')
    ).toBeInTheDocument();
    expect(await screen.findByText(/5 tài khoản mới/)).toBeInTheDocument();
    const heading = screen.getByRole('heading', { name: 'Tài khoản theo vai trò' });
    const chart = heading.closest('.lg\\:col-span-5');
    expect(within(chart).getByText('17')).toBeInTheDocument();
    expect(within(chart).getByText('Member, tổ chức và Moderator')).toBeInTheDocument();
  });
});
