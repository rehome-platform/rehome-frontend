import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboardPage from '../../src/features/admin/pages/AdminDashboardPage.jsx';
import adminApi from '../../src/features/admin/services/adminApi.js';
import ToastContext, { ToastProvider } from '../../src/context/ToastContext.jsx';

vi.mock('../../src/features/admin/services/adminApi.js', () => ({
  default: {
    getDashboard: vi.fn(), exportDashboard: vi.fn(), getAccounts: vi.fn(),
    getModerators: vi.fn(), getWarehouses: vi.fn(), getAuditLogs: vi.fn(),
  },
}));

const dashboard = {
  revenue: 1000000, platformRevenue: 125000, walletBalanceHeld: 2000000,
  fundBalance: 3000000, ordersCount: 15, inventoryCount: 24,
  avgServiceRating: 5, overdueTaskCount: 1,
};

function mountDashboard() {
  return render(<MemoryRouter><ToastProvider><AdminDashboardPage /></ToastProvider></MemoryRouter>);
}

beforeEach(() => {
  vi.clearAllMocks();
  // Fake only the clock: async rendering and waitFor keep real timers.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-11T12:00:00Z'));
  adminApi.getDashboard.mockResolvedValue(dashboard);
  adminApi.exportDashboard.mockResolvedValue(new Blob(['xlsx']));
  adminApi.getAccounts.mockImplementation(({ role }) => Promise.resolve({ totalElements: role === 'MEMBER' ? 12 : 3 }));
  adminApi.getModerators.mockResolvedValue({ totalElements: 2 });
  adminApi.getWarehouses.mockResolvedValue([]);
  adminApi.getAuditLogs.mockResolvedValue({ content: [] });
  vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:dashboard'), revokeObjectURL: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Admin dashboard API semantics', () => {
  it.each([[1000000, '12.5%'], [0, '0.0%']])('shows the revenue ratio for completed-order amount %s', async (revenue, ratio) => {
    adminApi.getDashboard.mockResolvedValue({ ...dashboard, revenue });
    mountDashboard();
    expect(await screen.findByText(`${ratio} Tỷ lệ doanh thu nền tảng / tổng tiền đơn hoàn thành`)).toBeInTheDocument();
    expect(screen.getByText('Hoa hồng và phí rút hàng đã thu, chưa trừ chi đền bù')).toBeVisible();
  });

  it('exports the selected range independently of the active tab', async () => {
    mountDashboard();
    const period = screen.getByRole('combobox', { name: 'Khoảng thời gian xuất Excel' });
    expect(period).toHaveValue('MONTH');
    fireEvent.click(screen.getByRole('button', { name: /Xuất báo cáo Excel/ }));
    await waitFor(() => expect(adminApi.exportDashboard).toHaveBeenLastCalledWith('2026-11-01', '2026-11-11'));
    fireEvent.change(period, { target: { value: 'WEEK' } });
    fireEvent.click(screen.getByRole('button', { name: /Báo cáo doanh thu theo kỳ/ }));
    expect(screen.getByRole('combobox', { name: 'Khoảng thời gian xuất Excel' })).toHaveValue('WEEK');
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /Xuất báo cáo Excel/ }));
    await waitFor(() => expect(adminApi.exportDashboard).toHaveBeenLastCalledWith('2026-11-09', '2026-11-11'));
    fireEvent.click(screen.getByRole('button', { name: /Hoạt động & Tăng trưởng/ }));
    fireEvent.change(period, { target: { value: 'ALL' } });
    fireEvent.click(screen.getByRole('button', { name: /Xuất báo cáo Excel/ }));
    await waitFor(() => expect(adminApi.exportDashboard).toHaveBeenLastCalledWith('1970-01-01', '2026-11-11'));
    expect(adminApi.getDashboard).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['2026-11-01T16:59:59Z', 'WEEK', '2026-10-26', '2026-11-01'],
    ['2026-11-01T17:00:00Z', 'WEEK', '2026-11-02', '2026-11-02'],
    ['2026-11-30T16:59:59Z', 'MONTH', '2026-11-01', '2026-11-30'],
    ['2026-11-30T17:00:00Z', 'MONTH', '2026-12-01', '2026-12-01'],
    ['2026-12-31T17:00:00Z', 'ALL', '1970-01-01', '2027-01-01'],
  ])('uses Vietnamese calendar dates at %s for %s export', async (now, period, from, to) => {
    vi.setSystemTime(new Date(now));
    mountDashboard();
    fireEvent.change(screen.getByRole('combobox', { name: 'Khoảng thời gian xuất Excel' }), { target: { value: period } });
    let downloadedName;
    HTMLAnchorElement.prototype.click.mockImplementation(function () { downloadedName = this.download; });
    fireEvent.click(screen.getByRole('button', { name: /Xuất báo cáo Excel/ }));
    await waitFor(() => expect(adminApi.exportDashboard).toHaveBeenCalledWith(from, to));
    await waitFor(() => expect(downloadedName).toBe(`dashboard_report_${from}_${to}.xlsx`));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:dashboard');
  });

  it('prevents duplicate exports while pending and reports failures', async () => {
    let rejectExport;
    adminApi.exportDashboard.mockReturnValue(new Promise((_, reject) => { rejectExport = reject; }));
    const error = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<MemoryRouter><ToastContext.Provider value={{ toast: { error } }}><AdminDashboardPage /></ToastContext.Provider></MemoryRouter>);
    const button = screen.getByRole('button', { name: /Xuất báo cáo Excel/ });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    rejectExport(new Error('Network error'));
    await waitFor(() => expect(error).toHaveBeenCalledWith(expect.stringContaining('Không thể kết nối API xuất báo cáo Excel')));
    expect(button).toBeEnabled();
  });

  it('totals only the three displayed account roles', async () => {
    mountDashboard();
    fireEvent.click(screen.getByRole('button', { name: /Hoạt động & Tăng trưởng/ }));
    expect(await screen.findByText('Tổng cộng 17 tài khoản thuộc ba nhóm Member, tổ chức và Moderator.')).toBeInTheDocument();
    const heading = screen.getByRole('heading', { name: 'Tài khoản theo vai trò' });
    const chart = heading.closest('.lg\\:col-span-5');
    expect(within(chart).getByText('17')).toBeInTheDocument();
    expect(within(chart).getByText('Member, tổ chức và Moderator')).toBeInTheDocument();
  });
});
