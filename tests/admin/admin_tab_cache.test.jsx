import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminLayout from '../../src/layouts/AdminLayout.jsx';
import AdminDashboardPage from '../../src/features/admin/pages/AdminDashboardPage.jsx';
import AdminAccountsPage from '../../src/features/admin/pages/AdminAccountsPage.jsx';
import AdminFundLedgerPage from '../../src/features/admin/pages/AdminFundLedgerPage.jsx';
import ConfigPage from '../../src/features/admin/pages/ConfigPage.jsx';
import AdminAuditLogsPage from '../../src/features/admin/pages/AdminAuditLogsPage.jsx';
import AdminBanProposalsPage from '../../src/features/admin/pages/AdminBanProposalsPage.jsx';
import { ToastProvider } from '../../src/context/ToastContext.jsx';
import adminApi from '../../src/features/admin/services/adminApi.js';
import membershipAdminApi from '../../src/features/admin/services/membershipAdminApi.js';

const authState = vi.hoisted(() => ({
  isAuthenticated: true,
  loggingOut: false,
  logout: vi.fn(),
  user: {
    id: 'admin-1',
    accountId: 'admin-1',
    role: 'admin',
    fullName: 'Quản trị viên A',
    email: 'admin1@rehome.vn',
  },
}));

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: () => authState,
}));

vi.mock('../../src/components/notification/index.js', () => ({
  NotificationBell: () => null,
}));

vi.mock('../../src/features/admin/services/adminApi.js', () => ({
  default: {
    getDashboard: vi.fn(),
    getRevenueTrend: vi.fn(),
    getRevenueTrendTotal: vi.fn(),
    getRevenueItems: vi.fn(),
    getAccountGrowth: vi.fn(),
    getAccountGrowthTotal: vi.fn(),
    getAccounts: vi.fn(),
    getWarehouses: vi.fn(),
    getModerators: vi.fn(),
    getFundLedger: vi.fn(),
    getAuditLogs: vi.fn(),
    getAuditLogFilterOptions: vi.fn(),
    getBanProposals: vi.fn(),
    getDismissedProposals: vi.fn(() => []),
    dismissBanProposal: vi.fn(),
    banAccount: vi.fn(),
    unbanAccount: vi.fn(),
    getBanPreview: vi.fn(),
    getConfigs: vi.fn(),
    updateConfig: vi.fn(),
  },
}));

vi.mock('../../src/features/admin/services/membershipAdminApi.js', () => {
  const api = {
    getMembershipStats: vi.fn(),
    getPlans: vi.fn(),
  };
  return {
    membershipAdminApi: api,
    default: api,
  };
});

let fakeNow = 1_700_000_000_000;

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderAdminApp(initialEntry = '/admin') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ToastProvider>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="users" element={<AdminAccountsPage />} />
            <Route path="fund-ledger" element={<AdminFundLedgerPage />} />
            <Route path="configs" element={<ConfigPage />} />
            <Route path="audit-logs" element={<AdminAuditLogsPage />} />
            <Route path="ban-proposals" element={<AdminBanProposalsPage />} />
          </Route>
        </Routes>
      </ToastProvider>
    </MemoryRouter>
  );
}

function setupDefaultMocks() {
  adminApi.getDashboard.mockResolvedValue({
    platformRevenue: 1500000,
    heldOrderAmount: 250000,
    inventoryCount: 42,
    stockByStatus: { ON_SALE: 42 },
    term1StockCount: 42,
    term2StockCount: 0,
    term3StockCount: 0,
    overdueTaskCount: 1,
    avgServiceRating: 4.8,
  });
  adminApi.getRevenueTrend.mockResolvedValue({ total: 980000, granularity: 'day', points: [] });
  adminApi.getRevenueTrendTotal.mockResolvedValue(1200000);
  adminApi.getRevenueItems.mockResolvedValue({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  adminApi.getAccountGrowth.mockResolvedValue({ total: 15, granularity: 'day', points: [] });
  adminApi.getAccountGrowthTotal.mockResolvedValue(10);
  adminApi.getAccounts.mockImplementation(async (params = {}) => {
    if (params.role === 'MEMBER') return { content: [], totalElements: 120 };
    if (params.role === 'ORGANIZATION') return { content: [], totalElements: 18 };
    return {
      content: [
        {
          accountId: 'acc-1',
          fullName: 'Nguyễn Văn Cache',
          email: 'cache@rehome.vn',
          phone: '0901234567',
          role: 'ORGANIZATION',
          status: 'ACTIVE',
          createdAt: '2026-11-01T00:00:00Z',
        },
      ],
      totalElements: 1,
      totalPages: 1,
    };
  });
  adminApi.getWarehouses.mockResolvedValue([{ id: 'wh-1', name: 'Kho Q1' }]);
  adminApi.getModerators.mockResolvedValue({ content: [], totalElements: 6 });
  adminApi.getFundLedger.mockResolvedValue({
    content: [
      {
        id: 'tx-1',
        transactionNo: 'GD-CACHE-001',
        createdAt: '2026-11-10T09:00:00Z',
        type: 'COMMISSION_REVENUE',
        note: 'Hoa hồng đơn test',
        amount: 320000,
      },
    ],
    page: 0,
    size: 10,
    totalElements: 1,
    totalPages: 1,
  });
  adminApi.getAuditLogs.mockResolvedValue({
    content: [
      {
        id: 'aud-1',
        actionType: 'VIOLATION_RESOLVE_PROPOSE_BAN',
        targetType: 'ORGANIZATION_ACCOUNT',
        targetId: 'acc-1',
        actorName: 'Mod A',
        detail: { reason: 'Vi phạm cộng đồng', closedReportCount: 2 },
        createdAt: '2026-11-15T10:00:00Z',
      },
    ],
    totalElements: 1,
  });
  adminApi.getAuditLogFilterOptions.mockResolvedValue({
    actionTypes: ['BAN_ACCOUNT', 'VIOLATION_RESOLVE_PROPOSE_BAN'],
  });
  adminApi.getBanProposals.mockResolvedValue({
    content: [
      {
        id: 'prop-1',
        actionType: 'VIOLATION_RESOLVE_PROPOSE_BAN',
        targetType: 'ORGANIZATION_ACCOUNT',
        targetId: 'acc-1',
        actorName: 'Mod A',
        detail: { reason: 'Vi phạm cộng đồng', closedReportCount: 2 },
        createdAt: '2026-11-15T10:00:00Z',
      },
    ],
  });
  adminApi.getDismissedProposals.mockReturnValue([]);
  adminApi.banAccount.mockResolvedValue({});
  adminApi.getConfigs.mockResolvedValue([
    { key: 'term_length_days', value: '45', defaultValue: '30', usingDefault: false, type: 'INT', min: 1, max: 365 },
  ]);
  adminApi.updateConfig.mockResolvedValue({});
  membershipAdminApi.getMembershipStats.mockResolvedValue({ totalRevenue: 500000 });
  membershipAdminApi.getPlans.mockResolvedValue([
    { id: 'plan-silver', tier: 'SILVER', activeSubscriberCount: 12 },
  ]);
}

beforeEach(() => {
  fakeNow = 1_700_000_000_000;
  vi.spyOn(Date, 'now').mockImplementation(() => fakeNow);
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  authState.user = {
    id: 'admin-1',
    accountId: 'admin-1',
    role: 'admin',
    fullName: 'Quản trị viên A',
    email: 'admin1@rehome.vn',
  };
  setupDefaultMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Admin sidebar & dashboard tab caching (SWR)', () => {
  it('renders cached data immediately with 0 redundant fetches when switching Admin sidebar tabs within staleTime', async () => {
    renderAdminApp('/admin');

    expect(await screen.findByText(/1\.500\.000/)).toBeInTheDocument();
    expect(adminApi.getDashboard).toHaveBeenCalledTimes(1);

    // Switch to Quản lý tài khoản
    fireEvent.click(screen.getByRole('link', { name: /Quản lý tài khoản/i }));
    expect(await screen.findByText('Nguyễn Văn Cache')).toBeInTheDocument();
    expect(adminApi.getAccounts).toHaveBeenCalledTimes(1);

    // Switch to Giao dịch
    fireEvent.click(screen.getByRole('link', { name: /^Giao dịch$/i }));
    expect(await screen.findByText('GD-CACHE-001')).toBeInTheDocument();
    expect(adminApi.getFundLedger).toHaveBeenCalledTimes(1);

    // Switch back to Tổng quan -> instant render, no loading & no refetch
    fireEvent.click(screen.getByRole('link', { name: /^Tổng quan$/i }));
    expect(screen.getByText(/1\.500\.000/)).toBeInTheDocument();
    expect(adminApi.getDashboard).toHaveBeenCalledTimes(1);

    // Switch back to Giao dịch -> instant render, no spinner, no refetch
    fireEvent.click(screen.getByRole('link', { name: /^Giao dịch$/i }));
    expect(screen.getByText('GD-CACHE-001')).toBeInTheDocument();
    expect(screen.queryByText('Đang tải danh sách giao dịch...')).not.toBeInTheDocument();
    expect(adminApi.getFundLedger).toHaveBeenCalledTimes(1);
  });

  it('caches the 3 inner Dashboard tabs and preserves activeTab across sidebar navigation', async () => {
    renderAdminApp('/admin');

    expect(await screen.findByText(/1\.500\.000/)).toBeInTheDocument();

    // Switch inner tab: Người dùng
    fireEvent.click(screen.getByRole('tab', { name: /Người dùng/i }));
    expect((await screen.findAllByText('120')).length).toBeGreaterThanOrEqual(1);

    // Switch inner tab: Địa điểm ký gửi
    fireEvent.click(screen.getByRole('tab', { name: /Địa điểm ký gửi/i }));
    expect((await screen.findAllByText('42 món')).length).toBeGreaterThanOrEqual(1);

    // Switch inner tab back to Người dùng -> instant render, no extra overview calls
    const overviewAccountCalls = adminApi.getAccounts.mock.calls.length;
    fireEvent.click(screen.getByRole('tab', { name: /Người dùng/i }));
    expect(screen.getAllByText('120').length).toBeGreaterThanOrEqual(1);
    expect(adminApi.getAccounts).toHaveBeenCalledTimes(overviewAccountCalls);

    // Navigate away to Cấu hình and return -> preserves activeTab = 'users' and renders cached data immediately
    fireEvent.click(screen.getByRole('link', { name: /Cấu hình tham số hệ thống/i }));
    expect(await screen.findByRole('spinbutton', { name: /Độ dài một kỳ/ })).toHaveValue(45);

    fireEvent.click(screen.getByRole('link', { name: /^Tổng quan$/i }));
    expect(screen.getByRole('tab', { name: /Người dùng/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByText('120').length).toBeGreaterThanOrEqual(1);
    expect(adminApi.getAccounts).toHaveBeenCalledTimes(overviewAccountCalls);

    // Also switch back to Địa điểm ký gửi -> instant render with 0 extra dashboard/warehouse calls
    const dashCallsBeforeWhReturn = adminApi.getDashboard.mock.calls.length;
    const whCallsBeforeWhReturn = adminApi.getWarehouses.mock.calls.length;
    fireEvent.click(screen.getByRole('tab', { name: /Địa điểm ký gửi/i }));
    expect(screen.getAllByText('42 món').length).toBeGreaterThanOrEqual(1);
    expect(adminApi.getDashboard).toHaveBeenCalledTimes(dashCallsBeforeWhReturn);
    expect(adminApi.getWarehouses).toHaveBeenCalledTimes(whCallsBeforeWhReturn);
  });

  it('performs background SWR after staleTime expires and keeps cached data on transient 500 error', async () => {
    renderAdminApp('/admin/fund-ledger');

    expect(await screen.findByText('GD-CACHE-001')).toBeInTheDocument();
    expect(adminApi.getFundLedger).toHaveBeenCalledTimes(1);

    // Leave tab and advance beyond DEFAULT_STALE_TIME_MS (30s)
    fireEvent.click(screen.getByRole('link', { name: /Nhật ký hệ thống/i }));
    expect(await screen.findByText('Mod A')).toBeInTheDocument();
    fakeNow += 35_000;

    // Return with deferred v2 response -> old row renders synchronously while background refetch runs
    const deferredV2 = createDeferred();
    adminApi.getFundLedger.mockReturnValueOnce(deferredV2.promise);

    fireEvent.click(screen.getByRole('link', { name: /^Giao dịch$/i }));
    expect(screen.getByText('GD-CACHE-001')).toBeInTheDocument();
    expect(screen.queryByText('Đang tải danh sách giao dịch...')).not.toBeInTheDocument();

    await act(async () => {
      deferredV2.resolve({
        content: [
          {
            id: 'tx-2',
            transactionNo: 'GD-CACHE-002',
            createdAt: '2026-11-11T09:00:00Z',
            type: 'COMMISSION_REVENUE',
            note: 'Hoa hồng bản v2',
            amount: 550000,
          },
        ],
        page: 0,
        size: 10,
        totalElements: 1,
        totalPages: 1,
      });
    });

    expect(await screen.findByText('GD-CACHE-002')).toBeInTheDocument();

    // Advance staleTime again and return when API throws transient 500 -> keep cached GD-CACHE-002
    fireEvent.click(screen.getByRole('link', { name: /Nhật ký hệ thống/i }));
    fakeNow += 35_000;
    adminApi.getFundLedger.mockRejectedValueOnce(new Error('500 Internal Server Error'));

    fireEvent.click(screen.getByRole('link', { name: /^Giao dịch$/i }));
    await waitFor(() => expect(adminApi.getFundLedger).toHaveBeenCalledTimes(3));
    expect(screen.getByText('GD-CACHE-002')).toBeInTheDocument();
    expect(screen.queryByText('Không thể tải danh sách giao dịch.')).not.toBeInTheDocument();
  });

  it('invalidates cross-tab caches on ban mutation and preserves dirty drafts in ConfigPage during SWR', async () => {
    renderAdminApp('/admin/ban-proposals');
    expect(await screen.findByText('Nguyễn Văn Cache')).toBeInTheDocument();
    expect(adminApi.getBanProposals).toHaveBeenCalledTimes(1);

    // Visit Audit logs & Accounts to prime their caches
    fireEvent.click(screen.getByRole('link', { name: /Nhật ký hệ thống/i }));
    expect(await screen.findByText('Mod A')).toBeInTheDocument();
    expect(adminApi.getAuditLogs).toHaveBeenCalledTimes(1);

    // Approve ban proposal on Quản lý tài khoản -> invalidates ban-proposals, audit-logs, accounts
    fireEvent.click(screen.getByRole('link', { name: /Quản lý tài khoản/i }));
    expect(await screen.findByRole('button', { name: /Khóa theo đề xuất/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Khóa theo đề xuất/i }));
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận khóa tài khoản/i }));

    await waitFor(() => expect(adminApi.banAccount).toHaveBeenCalledTimes(1));

    // Navigating back to Đề xuất khóa & Nhật ký hệ thống must trigger silent background refetch (even within 30s!)
    const logsCountBeforeReturn = adminApi.getAuditLogs.mock.calls.length;
    fireEvent.click(screen.getByRole('link', { name: /Nhật ký hệ thống/i }));
    expect(screen.getByText('Mod A')).toBeInTheDocument();
    await waitFor(() => expect(adminApi.getAuditLogs.mock.calls.length).toBeGreaterThan(logsCountBeforeReturn));

    fireEvent.click(screen.getByRole('link', { name: /Đề xuất khóa tài khoản/i }));
    await waitFor(() => expect(adminApi.getBanProposals).toHaveBeenCalledTimes(2));

    // ConfigPage: dirty draft is NOT overwritten by in-flight SWR response
    fireEvent.click(screen.getByRole('link', { name: /Cấu hình tham số hệ thống/i }));
    expect(await screen.findByRole('spinbutton', { name: /Độ dài một kỳ/ })).toHaveValue(45);

    fireEvent.click(screen.getByRole('link', { name: /^Giao dịch$/i }));
    fakeNow += 5 * 60_000 + 1_000;

    const deferredConfig = createDeferred();
    adminApi.getConfigs.mockReturnValueOnce(deferredConfig.promise);

    fireEvent.click(screen.getByRole('link', { name: /Cấu hình tham số hệ thống/i }));
    const termInput = screen.getByRole('spinbutton', { name: /Độ dài một kỳ/ });
    expect(termInput).toHaveValue(45);

    // User immediately edits before SWR finishes
    fireEvent.click(screen.getByRole('button', { name: /Sửa: Độ dài một kỳ/i }));
    fireEvent.change(termInput, { target: { value: '90' } });
    expect(termInput).toHaveValue(90);

    await act(async () => {
      deferredConfig.resolve([
        { key: 'term_length_days', value: '60', defaultValue: '30', usingDefault: false, type: 'INT', min: 1, max: 365 },
      ]);
    });

    // Draft '90' remains intact while server baseline updates to 60
    expect(screen.getByRole('spinbutton', { name: /Độ dài một kỳ/ })).toHaveValue(90);
    expect(screen.getByText(/Đang áp dụng: 60/)).toBeInTheDocument();
  });

  it('clears Admin cache on auth:logout and when switching user scope', async () => {
    const appUi = (
      <MemoryRouter initialEntries={['/admin/fund-ledger']}>
        <ToastProvider>
          <Routes>
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="fund-ledger" element={<AdminFundLedgerPage />} />
              <Route path="configs" element={<ConfigPage />} />
            </Route>
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    );
    const view = render(appUi);

    expect(await screen.findByText('GD-CACHE-001')).toBeInTheDocument();
    expect(adminApi.getFundLedger).toHaveBeenCalledTimes(1);

    // Logout event clears cache
    act(() => {
      window.dispatchEvent(new Event('auth:logout'));
    });

    fireEvent.click(screen.getByRole('link', { name: /Cấu hình tham số hệ thống/i }));
    expect(await screen.findByRole('spinbutton', { name: /Độ dài một kỳ/ })).toHaveValue(45);

    // Return to fund-ledger -> must fetch fresh again
    fireEvent.click(screen.getByRole('link', { name: /^Giao dịch$/i }));
    await waitFor(() => expect(adminApi.getFundLedger).toHaveBeenCalledTimes(2));

    // User switch clears cache too (simulate AuthContext updating user)
    authState.user = {
      id: 'admin-2',
      accountId: 'admin-2',
      role: 'admin',
      fullName: 'Quản trị viên B',
      email: 'admin2@rehome.vn',
    };
    view.rerender(
      <MemoryRouter initialEntries={['/admin/fund-ledger']}>
        <ToastProvider>
          <Routes>
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="fund-ledger" element={<AdminFundLedgerPage />} />
              <Route path="configs" element={<ConfigPage />} />
            </Route>
          </Routes>
        </ToastProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('link', { name: /Cấu hình tham số hệ thống/i }));
    await waitFor(() => expect(adminApi.getConfigs).toHaveBeenCalledTimes(2));
    view.unmount();
  });
});
