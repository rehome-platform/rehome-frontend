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
    getRevenueTrend: vi.fn(),
    getRevenueTrendTotal: vi.fn(),
    getFundLedger: vi.fn(),
    getFundReconciliation: vi.fn(),
    getAccountGrowth: vi.fn(),
    getAccountGrowthTotal: vi.fn(),
  },
}));

const dashboard = {
  revenue: 1000000,
  platformRevenue: 125000,
  commissionRevenue: 100000,
  withdrawalFeeRevenue: 25000,
  compensationExpense: 15000,
  walletBalanceHeld: 2000000,
  fundBalance: -2000000,
  heldOrderAmount: 4500000,
  heldOrderCount: 7,
  ordersCount: 15,
  inventoryCount: 24,
  stockByStatus: {
    ON_SALE: 15,
    RESERVED: 2,
    WAREHOUSE: 3,
    UNCLAIMED: 1,
    RETURNED: 2,
    PLATFORM_OWNED: 1,
  },
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

const tab = (name) => screen.getByRole('tab', { name });

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
  adminApi.getWarehouses.mockResolvedValue([{ id: 'wh-1' }, { id: 'wh-2' }]);
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
  adminApi.getRevenueTrend.mockResolvedValue({
    granularity: 'day',
    from: '2026-11-01',
    to: '2026-11-11',
    total: 125000,
    points: [
      { label: '2026-11-10', periodStart: '2026-11-10', periodEnd: '2026-11-10', amount: 50000 },
      { label: '2026-11-11', periodStart: '2026-11-11', periodEnd: '2026-11-11', amount: 75000 },
    ],
  });
  // Mặc định: chưa có số liệu kỳ trước để so sánh % (các test riêng cho tính năng này tự đặt lại)
  adminApi.getRevenueTrendTotal.mockResolvedValue(0);
  adminApi.getAccountGrowthTotal.mockResolvedValue(0);
  adminApi.getFundReconciliation.mockResolvedValue({ status: 'BALANCED' });
  adminApi.getFundLedger.mockResolvedValue({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });
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

describe('Admin dashboard structure', () => {
  it('has three tabs - Doanh thu, Người dùng, Kho - and opens on Doanh thu', async () => {
    mountDashboard();

    expect(screen.getAllByRole('tab').map((t) => t.textContent.trim())).toEqual([
      'payments' + 'Doanh thu',
      'group' + 'Người dùng',
      'warehouse' + 'Kho',
    ]);
    expect(tab(/Doanh thu/)).toHaveAttribute('aria-selected', 'true');
    expect(tab(/Người dùng/)).toHaveAttribute('aria-selected', 'false');
    expect(tab(/Kho/)).toHaveAttribute('aria-selected', 'false');
    await screen.findByText('Tiền đang giữ hộ');
  });
});

describe('Admin dashboard - tab Doanh thu', () => {
  it('shows exactly two summary cards: platform revenue and held-order money', async () => {
    mountDashboard();

    const revenueCard = (await screen.findByText('Doanh thu nền tảng')).closest('div.rounded-2xl');
    expect(within(revenueCard).getByText(/125\.000/)).toBeInTheDocument();
    expect(within(revenueCard).getByText('Hoa hồng và phí rút hàng đã thu, chưa trừ chi đền bù')).toBeVisible();
    const heldCard = screen.getByText('Tiền đang giữ hộ').closest('div.rounded-2xl');
    expect(within(heldCard).getByText(/4\.500\.000/)).toBeInTheDocument();
  });

  it('shows no explanatory sentence, revenue-ratio line or order-count line around the cards', async () => {
    mountDashboard();
    await screen.findByText('Tiền đang giữ hộ');
    await screen.findByText('Bàn gỗ');

    expect(screen.queryByText(/được lọc theo khoảng thời gian đang chọn/)).not.toBeInTheDocument();
    expect(screen.queryByText(/luôn là số hiện tại/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tỷ lệ doanh thu nền tảng/)).not.toBeInTheDocument();
    expect(screen.queryByText(/đơn đang xử lý/)).not.toBeInTheDocument();
    // Hai thẻ không còn dòng chân thẻ (đường kẻ + biểu tượng + số liệu phụ)
    for (const label of ['Doanh thu nền tảng', 'Tiền đang giữ hộ']) {
      const card = screen.getByText(label).closest('div.rounded-2xl');
      expect(card.querySelector('.border-t')).toBeNull();
    }
  });

  it('no longer shows revenue breakdown, fund balance, orders-paid card, or the ledger here', async () => {
    mountDashboard();
    await screen.findByText('Tiền đang giữ hộ');
    await screen.findByText('Bàn gỗ');

    expect(screen.queryByText('Cơ Cấu Doanh Thu Nền Tảng')).not.toBeInTheDocument();
    expect(screen.queryByText('Số dư quỹ nền tảng')).not.toBeInTheDocument();
    expect(screen.queryByText('Tổng đơn đã thanh toán')).not.toBeInTheDocument();
    expect(screen.queryByText(/Nhật Ký Ghi Sổ Kép/)).not.toBeInTheDocument();
    expect(screen.queryByText('Đối soát: Khớp')).not.toBeInTheDocument();
    expect(screen.queryByText('Tồn Kho Trong Kho Hàng')).not.toBeInTheDocument();
    // Bảng món đã bán chỉ còn bảng, không còn 3 thẻ tóm tắt theo kỳ
    expect(screen.queryByText('Báo Cáo Doanh Thu Nền Tảng Theo Kỳ Kí Gửi')).not.toBeInTheDocument();
    expect(screen.queryByText('Kỳ 1 (1–30 ngày · 10%)')).not.toBeInTheDocument();
    expect(adminApi.getFundLedger).not.toHaveBeenCalled();
    expect(adminApi.getFundReconciliation).not.toHaveBeenCalled();
  });

  it('renders the revenue trend chart and the sold-items table', async () => {
    mountDashboard();

    expect(await screen.findByText('Doanh thu nền tảng theo thời gian')).toBeInTheDocument();
    expect(await screen.findByText('Danh Sách Món Đã Bán Theo Kỳ')).toBeInTheDocument();
    expect(await screen.findByText('Bàn gỗ')).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: /2026-11-11: 75\.000/ })).toBeInTheDocument();
    expect(adminApi.getRevenueTrend).toHaveBeenLastCalledWith({
      from: '2026-11-01',
      to: '2026-11-11',
      granularity: 'day',
    });
  });

  it('top filter drives the cards, the sold-items table and Excel export', async () => {
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
    await waitFor(() =>
      expect(adminApi.getRevenueItems).toHaveBeenLastCalledWith({
        from: '2026-11-09',
        to: '2026-11-11',
        term: undefined,
        page: 0,
        size: 20,
      })
    );

    fireEvent.click(screen.getByRole('button', { name: /Xuất báo cáo Excel/ }));
    await waitFor(() =>
      expect(adminApi.exportDashboard).toHaveBeenLastCalledWith('2026-11-09', '2026-11-11')
    );

    // "Toàn thời gian": không gửi from/to
    fireEvent.change(period, { target: { value: 'ALL' } });
    await waitFor(() =>
      expect(adminApi.getDashboard).toHaveBeenLastCalledWith({ from: undefined, to: undefined })
    );
    fireEvent.click(screen.getByRole('button', { name: /Xuất báo cáo Excel/ }));
    await waitFor(() =>
      expect(adminApi.exportDashboard).toHaveBeenLastCalledWith('1970-01-01', '2026-11-11')
    );

    // Một năm cụ thể (2025) cũng đi cùng một đường: thẻ, bảng và xuất Excel
    fireEvent.change(period, { target: { value: 'YEAR_PICK' } });
    fireEvent.change(screen.getByLabelText('Chọn năm'), { target: { value: '2025' } });
    await waitFor(() =>
      expect(adminApi.getDashboard).toHaveBeenLastCalledWith({ from: '2025-01-01', to: '2025-12-31' })
    );
    fireEvent.click(screen.getByRole('button', { name: /Xuất báo cáo Excel/ }));
    await waitFor(() =>
      expect(adminApi.exportDashboard).toHaveBeenLastCalledWith('2025-01-01', '2025-12-31')
    );
  });

  it('keeps the chart filter separate from the top filter', async () => {
    mountDashboard();
    const top = screen.getByRole('combobox', { name: 'Khoảng thời gian' });
    const chart = await screen.findByRole('combobox', { name: 'Khoảng thời gian biểu đồ' });
    await screen.findByRole('img', { name: /2026-11-11: 75\.000/ });
    const chartCalls = adminApi.getRevenueTrend.mock.calls.length;
    const dashboardCalls = adminApi.getDashboard.mock.calls.length;

    // Đổi bộ lọc ở đầu trang: thẻ + bảng đổi, biểu đồ KHÔNG gọi lại
    fireEvent.change(top, { target: { value: 'WEEK' } });
    await waitFor(() => expect(adminApi.getDashboard).toHaveBeenCalledTimes(dashboardCalls + 1));
    expect(adminApi.getRevenueTrend).toHaveBeenCalledTimes(chartCalls);
    expect(chart).toHaveValue('MONTH');

    // Đổi bộ lọc của biểu đồ: biểu đồ đổi, thẻ + bảng KHÔNG gọi lại
    const itemCalls = adminApi.getRevenueItems.mock.calls.length;
    fireEvent.change(chart, { target: { value: 'YEAR' } });
    await waitFor(() =>
      expect(adminApi.getRevenueTrend).toHaveBeenLastCalledWith({
        from: '2026-01-01',
        to: '2026-11-11',
        granularity: 'month',
      })
    );
    expect(adminApi.getDashboard).toHaveBeenCalledTimes(dashboardCalls + 1);
    expect(adminApi.getRevenueItems).toHaveBeenCalledTimes(itemCalls);
    expect(top).toHaveValue('WEEK');
  });

  it('keeps the chosen period when switching to another tab and back', async () => {
    mountDashboard();
    fireEvent.change(screen.getByRole('combobox', { name: 'Khoảng thời gian' }), {
      target: { value: 'WEEK' },
    });

    fireEvent.click(tab(/Người dùng/));
    // Bộ lọc thời gian và nút xuất chỉ thuộc tab Doanh thu
    expect(screen.queryByRole('combobox', { name: 'Khoảng thời gian' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Xuất báo cáo Excel/ })).not.toBeInTheDocument();

    fireEvent.click(tab(/Doanh thu/));
    expect(screen.getByRole('combobox', { name: 'Khoảng thời gian' })).toHaveValue('WEEK');
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
    await screen.findByText('Bàn gỗ');

    fireEvent.change(screen.getByRole('combobox', { name: 'Khoảng thời gian' }), {
      target: { value: 'CUSTOM' },
    });

    const fromInput = screen.getByLabelText('Từ ngày');
    const toInput = screen.getByLabelText('Đến ngày');
    const trendCalls = adminApi.getRevenueTrend.mock.calls.length;
    const itemCalls = adminApi.getRevenueItems.mock.calls.length;
    fireEvent.change(fromInput, { target: { value: '2026-11-15' } });
    fireEvent.change(toInput, { target: { value: '2026-11-10' } });

    expect(await screen.findByText(/Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc/)).toBeInTheDocument();
    expect(adminApi.getDashboard).toHaveBeenCalledTimes(1);
    expect(adminApi.getRevenueTrend).toHaveBeenCalledTimes(trendCalls);
    expect(adminApi.getRevenueItems).toHaveBeenCalledTimes(itemCalls);

    fireEvent.click(screen.getByRole('button', { name: /Xuất báo cáo Excel/ }));
    expect(adminApi.exportDashboard).not.toHaveBeenCalled();

    fireEvent.change(fromInput, { target: { value: '2026-11-05' } });
    await waitFor(() =>
      expect(adminApi.getDashboard).toHaveBeenLastCalledWith({
        from: '2026-11-05',
        to: '2026-11-10',
      })
    );
    await waitFor(() =>
      expect(adminApi.getRevenueItems).toHaveBeenLastCalledWith({
        from: '2026-11-05',
        to: '2026-11-10',
        term: undefined,
        page: 0,
        size: 20,
      })
    );
  });

  describe('comparison with the previous period (platform revenue card only)', () => {
    it('shows the % badge on "Doanh thu nền tảng" but never on "Tiền đang giữ hộ"', async () => {
      adminApi.getRevenueTrendTotal.mockResolvedValue(100000);
      mountDashboard();

      const revenueCard = (await screen.findByText('Doanh thu nền tảng')).closest('div.rounded-2xl');
      // Doanh thu tháng này = 125.000, kỳ trước (tháng 10, cùng đến ngày 11) = 100.000 -> +25%
      expect(adminApi.getRevenueTrendTotal).toHaveBeenCalledWith({ from: '2026-10-01', to: '2026-10-11' });
      expect(await within(revenueCard).findByText('+25.0% so với tháng trước')).toBeInTheDocument();

      const heldCard = screen.getByText('Tiền đang giữ hộ').closest('div.rounded-2xl');
      expect(within(heldCard).queryByText(/so với/)).not.toBeInTheDocument();
    });

    it('follows the top filter, not the chart\'s own filter', async () => {
      adminApi.getRevenueTrendTotal.mockResolvedValue(100000);
      mountDashboard();
      const top = screen.getByRole('combobox', { name: 'Khoảng thời gian' });
      const revenueCard = (await screen.findByText('Doanh thu nền tảng')).closest('div.rounded-2xl');
      await within(revenueCard).findByText('+25.0% so với tháng trước');

      fireEvent.change(top, { target: { value: 'YEAR' } });
      // "Năm nay" -> kỳ trước là năm 2025, cùng tháng-ngày (bộ lọc của biểu đồ bên dưới vẫn không đổi)
      await waitFor(() =>
        expect(adminApi.getRevenueTrendTotal).toHaveBeenLastCalledWith({ from: '2025-01-01', to: '2025-11-11' })
      );
      expect(await within(revenueCard).findByText('+25.0% so với năm trước')).toBeInTheDocument();
    });
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
});

describe('Admin dashboard - tab Người dùng', () => {
  it('shows the role donut with the total in the middle and a per-role legend', async () => {
    mountDashboard();
    fireEvent.click(tab(/Người dùng/));

    await screen.findByRole('button', { name: /2026-11-11: 3 tài khoản/ });
    const heading = screen.getByRole('heading', { name: 'Tài khoản theo vai trò' });
    const card = heading.closest('.lg\\:col-span-5');
    // Tổng = 12 Member + 3 tổ chức + 2 Moderator (không gồm Admin)
    expect(within(card).getByRole('img', { name: 'Biểu đồ tài khoản theo vai trò' })).toBeInTheDocument();
    expect(within(card).getByText('17')).toBeInTheDocument();
    expect(within(card).getByText('Tổng tài khoản')).toBeInTheDocument();
    // Chú giải: tên nhóm, số lượng và tỷ lệ (12/17 = 71%, 3/17 = 18%, 2/17 = 12%)
    expect(within(card).getByText('Member').parentElement.parentElement).toHaveTextContent('1271%');
    expect(within(card).getByText('Tổ chức').parentElement.parentElement).toHaveTextContent('318%');
    expect(within(card).getByText('Moderator').parentElement.parentElement).toHaveTextContent('212%');
  });

  it('no longer repeats the "Member, tổ chức và Moderator" captions around the charts', async () => {
    mountDashboard();
    fireEvent.click(tab(/Người dùng/));
    await screen.findByRole('button', { name: /2026-11-11: 3 tài khoản/ });

    // Dòng mô tả của biểu đồ tăng trưởng và của bảng hoạt động cũng không còn
    expect(screen.queryByText(/tài khoản mới từ/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ghi nhận các thao tác kiểm duyệt/)).not.toBeInTheDocument();
    expect(screen.getByText('Hoạt động gần đây')).toBeInTheDocument();
    expect(screen.queryByText('Member, tổ chức và Moderator')).not.toBeInTheDocument();
    expect(screen.queryByText('Phân bổ ba nhóm Member, tổ chức và Moderator')).not.toBeInTheDocument();
    expect(screen.queryByText(/Tổng số gồm Member, tổ chức và Moderator/)).not.toBeInTheDocument();
    expect(screen.queryByText(/thuộc ba nhóm Member, tổ chức và Moderator/)).not.toBeInTheDocument();
  });

  it('gives the growth chart the same kind of filter as the revenue tab, with its own state', async () => {
    mountDashboard();
    fireEvent.click(tab(/Người dùng/));

    const growth = await screen.findByRole('combobox', { name: 'Khoảng thời gian tăng trưởng' });
    expect(growth).toHaveValue('LAST30');
    expect(screen.getByLabelText('Lọc vai trò tăng trưởng')).toBeInTheDocument();
    // Cùng bộ lựa chọn với khối doanh thu (trừ "Toàn thời gian" vì API tăng trưởng chỉ có tối đa 366 kỳ)
    expect([...growth.querySelectorAll('option')].map((o) => o.value)).toEqual([
      'TODAY', 'WEEK', 'MONTH', 'LAST30', 'YEAR', 'DAY', 'WEEK_PICK', 'MONTH_PICK', 'YEAR_PICK', 'CUSTOM',
    ]);

    fireEvent.change(growth, { target: { value: 'MONTH_PICK' } });
    fireEvent.change(screen.getByLabelText('Chọn tháng tăng trưởng'), { target: { value: '2026-09' } });
    await waitFor(() =>
      expect(adminApi.getAccountGrowth).toHaveBeenLastCalledWith({
        from: '2026-09-01',
        to: '2026-09-30',
        granularity: 'day',
        role: undefined,
      })
    );
    // Bộ lọc của tab Doanh thu không bị đổi
    fireEvent.click(tab(/Doanh thu/));
    expect(screen.getByRole('combobox', { name: 'Khoảng thời gian' })).toHaveValue('MONTH');
  });

  it('shows three account cards and leaves the warehouse count to the Kho tab', async () => {
    mountDashboard();
    fireEvent.click(tab(/Người dùng/));

    expect(await screen.findByText('Tổng số Member')).toBeInTheDocument();
    expect(screen.getByText('Tổ chức đối tác')).toBeInTheDocument();
    expect(screen.getByText('Nhân viên Moderator')).toBeInTheDocument();
    expect(screen.queryByText('Điểm kho ký gửi')).not.toBeInTheDocument();
    expect(adminApi.getWarehouses).not.toHaveBeenCalled();
  });
});

describe('Admin dashboard - tab Kho', () => {
  async function openWarehouseTab() {
    mountDashboard();
    fireEvent.click(tab(/Kho/));
    await screen.findByText('Tồn kho theo trạng thái');
  }

  it('loads current (unfiltered) numbers, not the revenue period', async () => {
    await openWarehouseTab();
    await waitFor(() => expect(screen.getByTestId('stock-status-ON_SALE')).toBeInTheDocument());
    expect(screen.queryByText(/không đổi theo bộ lọc thời gian/)).not.toBeInTheDocument();

    expect(adminApi.getDashboard).toHaveBeenLastCalledWith();
    expect(adminApi.getWarehouses).toHaveBeenCalled();
    // Không có bộ lọc thời gian ở tab này
    expect(screen.queryByRole('combobox', { name: 'Khoảng thời gian' })).not.toBeInTheDocument();
  });

  it('shows stock by every status in two groups with counts and percentages', async () => {
    await openWarehouseTab();
    await waitFor(() => expect(screen.getByTestId('stock-status-ON_SALE')).toBeInTheDocument());

    expect(screen.getByText('Đang kinh doanh')).toBeInTheDocument();
    expect(screen.getByText('Cần xử lý')).toBeInTheDocument();

    const expected = {
      ON_SALE: ['Đang bán', '15 món', '63%'],
      RESERVED: ['Đang giữ chỗ', '2 món', '8%'],
      WAREHOUSE: ['Chờ Member quyết định', '3 món', '13%'],
      UNCLAIMED: ['Không ai nhận', '1 món', '4%'],
      RETURNED: ['Hàng trả về', '2 món', '8%'],
      PLATFORM_OWNED: ['Thuộc nền tảng', '1 món', '4%'],
    };
    for (const [code, [label, count, pct]] of Object.entries(expected)) {
      const row = screen.getByTestId(`stock-status-${code}`);
      expect(within(row).getByText(label)).toBeInTheDocument();
      expect(row.textContent).toContain(count);
      expect(row.textContent).toContain(pct);
    }

    // Tổng từng nhóm: 15 + 2 = 17 và 3 + 1 + 2 + 1 = 7
    const trading = screen.getByText('Đang kinh doanh').closest('div.space-y-3');
    expect(within(trading).getByText('17 món')).toBeInTheDocument();
    const attention = screen.getByText('Cần xử lý').closest('div.space-y-3');
    expect(within(attention).getByText('7 món')).toBeInTheDocument();
  });

  it('draws a donut of stock by status whose legend dots match the list', async () => {
    await openWarehouseTab();
    await waitFor(() => expect(screen.getByTestId('stock-status-ON_SALE')).toBeInTheDocument());

    const donut = screen.getByRole('img', { name: 'Biểu đồ tồn kho theo trạng thái' });
    expect(within(donut.parentElement).getByText('24')).toBeInTheDocument();
    expect(within(donut.parentElement).getByText('món trong kho')).toBeInTheDocument();
    // Một lát cho mỗi trạng thái đang có hàng, cùng màu với chấm ở danh sách
    const slices = donut.querySelectorAll('circle[stroke]:not([stroke="#E9F0E5"])');
    expect([...slices].map((c) => c.querySelector('title').textContent)).toEqual([
      'Đang bán: 15',
      'Đang giữ chỗ: 2',
      'Chờ Member quyết định: 3',
      'Không ai nhận: 1',
      'Hàng trả về: 2',
      'Thuộc nền tảng: 1',
    ]);
    const dot = screen.getByTestId('stock-status-ON_SALE').querySelector('span.rounded-full');
    expect(dot.style.backgroundColor).toBe('rgb(0, 107, 44)');
    expect(slices[0].getAttribute('stroke')).toBe('#006B2C');
  });

  it('draws a column chart of stock by consignment term', async () => {
    await openWarehouseTab();

    const columns = await screen.findByRole('img', { name: 'Biểu đồ tồn kho theo kỳ ký gửi' });
    expect(within(columns.parentElement).getByText('12')).toBeInTheDocument();
    expect(columns.querySelectorAll('rect.chart-bar')).toHaveLength(3);
  });

  it('shows warehouse count, overdue tasks, service rating, and stock by term', async () => {
    await openWarehouseTab();

    expect(await screen.findByText('Điểm kho ký gửi')).toBeInTheDocument();
    const warehouseCard = screen.getByText('Điểm kho ký gửi').closest('div.flex');
    await waitFor(() => expect(within(warehouseCard).getByText('2')).toBeInTheDocument());
    expect(screen.getByText('1 việc')).toBeInTheDocument();
    expect(screen.getByText('5 ★')).toBeInTheDocument();
    expect(screen.getByText(/Kỳ 1: 12 món/)).toBeInTheDocument();
    expect(screen.getByText(/Kỳ 2: 8 món/)).toBeInTheDocument();
    expect(screen.getByText(/Kỳ 3: 4 món/)).toBeInTheDocument();
    // Dòng chữ cứng cũ về quy tắc 90 ngày không còn
    expect(screen.queryByText(/Gỡ khỏi sàn & gửi thông báo/)).not.toBeInTheDocument();
  });

  it('lists an unknown stock status under "Cần xử lý" instead of dropping it', async () => {
    adminApi.getDashboard.mockResolvedValue({
      ...dashboard,
      inventoryCount: 26,
      stockByStatus: { ...dashboard.stockByStatus, NEW_STATE: 2 },
    });
    await openWarehouseTab();

    const row = await screen.findByTestId('stock-status-NEW_STATE');
    expect(row.textContent).toContain('NEW_STATE');
    expect(row.textContent).toContain('2 món');
  });

  it('explains when the server has no per-status numbers yet', async () => {
    const { stockByStatus: _omit, ...withoutStatus } = dashboard;
    adminApi.getDashboard.mockResolvedValue(withoutStatus);
    mountDashboard();
    fireEvent.click(tab(/Kho/));

    expect(
      await screen.findByText('Máy chủ chưa trả số liệu tồn kho theo trạng thái.')
    ).toBeInTheDocument();
  });

  it('shows an empty state when the warehouse holds nothing', async () => {
    adminApi.getDashboard.mockResolvedValue({
      ...dashboard,
      inventoryCount: 0,
      stockByStatus: { ON_SALE: 0, RESERVED: 0, WAREHOUSE: 0, UNCLAIMED: 0, RETURNED: 0, PLATFORM_OWNED: 0 },
      term1StockCount: 0,
      term2StockCount: 0,
      term3StockCount: 0,
    });
    mountDashboard();
    fireEvent.click(tab(/Kho/));

    expect(await screen.findByText('Kho hàng hiện chưa có sản phẩm tồn')).toBeInTheDocument();
  });

  it('shows an error with retry when the dashboard request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    adminApi.getDashboard
      .mockResolvedValueOnce(dashboard) // lần mở trang (tab Doanh thu)
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(dashboard);
    mountDashboard();
    fireEvent.click(tab(/Kho/));

    expect(await screen.findByText('Không thể tải số liệu kho hàng.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByTestId('stock-status-ON_SALE')).toBeInTheDocument();
  });
});
