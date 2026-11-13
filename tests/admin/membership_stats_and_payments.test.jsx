import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MembershipStatsPage from '../../src/features/admin/membership/MembershipStatsPage.jsx';
import MembershipPaymentsPage from '../../src/features/admin/membership/MembershipPaymentsPage.jsx';
import AdminAuditLogsView from '../../src/features/admin/components/AdminAuditLogsView.jsx';
import AdminFundLedgerSection from '../../src/features/admin/components/AdminFundLedgerSection.jsx';
import membershipAdminApi from '../../src/features/admin/services/membershipAdminApi.js';
import adminApi from '../../src/features/admin/services/adminApi.js';

vi.mock('../../src/features/admin/services/membershipAdminApi.js', () => ({
  default: {
    getMembershipStats: vi.fn(),
    getVoucherStats: vi.fn(),
    getPayments: vi.fn(),
  },
}));

vi.mock('../../src/features/admin/services/adminApi.js', () => ({
  default: {
    getAuditLogFilterOptions: vi.fn(),
    getAuditLogs: vi.fn(),
    getFundReconciliation: vi.fn(),
    getFundLedger: vi.fn(),
  },
}));

const sampleMembershipStats = {
  activeVipCount: 42,
  newPurchases: 15,
  nonRenewals: 4,
  totalRevenue: 5000000,
  revenueByTier: [
    { tier: 'SILVER', revenue: 1500000, count: 10 },
    { tier: 'GOLD', revenue: 2500000, count: 4 },
    { tier: 'DIAMOND', revenue: 1000000, count: 1 },
  ],
  revenueByMonth: [
    { month: '2026-10', revenue: 2000000 },
    { month: '2026-11', revenue: 3000000 },
  ],
};

const sampleVoucherStats = {
  totalSpent: 800000,
  byTemplate: [
    {
      templateId: 'vt-1',
      name: 'Freeship VIP 30K',
      issued: 50,
      used: 20,
      expired: 5,
      usageRate: 40,
      spent: 600000,
    },
    {
      templateId: 'vt-2',
      name: 'Giảm 50K đơn hàng',
      issued: 20,
      used: 4,
      expired: 2,
      usageRate: 20,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  membershipAdminApi.getMembershipStats.mockResolvedValue(sampleMembershipStats);
  membershipAdminApi.getVoucherStats.mockResolvedValue(sampleVoucherStats);
  membershipAdminApi.getPayments.mockResolvedValue({
    content: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
  });
  adminApi.getAuditLogFilterOptions.mockResolvedValue({ actionTypes: [] });
  adminApi.getAuditLogs.mockResolvedValue([]);
  adminApi.getFundReconciliation.mockResolvedValue({ status: 'BALANCED', platformBalance: 10000000 });
  adminApi.getFundLedger.mockResolvedValue({
    content: [],
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0,
  });
});

describe('MembershipStatsPage (W-05)', () => {
  it('displays KPI metrics, revenue by month & tier, and voucher stats with spent fallback', async () => {
    render(<MembershipStatsPage />);

    await waitFor(() => {
      expect(membershipAdminApi.getMembershipStats).toHaveBeenCalledTimes(1);
      expect(membershipAdminApi.getVoucherStats).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText('Freeship VIP 30K')).toBeInTheDocument();
    expect(screen.getByText('Giảm 50K đơn hàng')).toBeInTheDocument();
    expect(screen.getByText(/600\.000/)).toBeInTheDocument();
    expect(screen.getByText(/800\.000/)).toBeInTheDocument();
    expect(screen.getByText('2026-10')).toBeInTheDocument();
    expect(screen.getByText('2026-11')).toBeInTheDocument();
  });

  it('shows "Chưa đủ dữ liệu tính" when estimated AI cost is blank and calculates when entered (including 0)', async () => {
    render(<MembershipStatsPage />);
    await waitFor(() => expect(screen.getByText('42')).toBeInTheDocument());

    expect(screen.getByText(/Chưa đủ dữ liệu tính/)).toBeInTheDocument();

    const aiInput = screen.getByLabelText(/Chi phí AI ước tính/i);
    fireEvent.change(aiInput, { target: { value: '500000' } });

    expect(localStorage.getItem('rehome_admin_estimated_ai_cost')).toBe('500000');
    expect(screen.queryByText(/Chưa đủ dữ liệu tính/)).not.toBeInTheDocument();
    // 5,000,000 - (800,000 + 500,000) = 3,700,000
    expect(screen.getByText(/3\.700\.000/)).toBeInTheDocument();

    // Explicit 0 should still calculate
    fireEvent.change(aiInput, { target: { value: '0' } });
    expect(localStorage.getItem('rehome_admin_estimated_ai_cost')).toBe('0');
    expect(screen.queryByText(/Chưa đủ dữ liệu tính/)).not.toBeInTheDocument();
    // 5,000,000 - (800,000 + 0) = 4,200,000
    expect(screen.getByText(/4\.200\.000/)).toBeInTheDocument();

    // Clearing reverts to "Chưa đủ dữ liệu tính"
    fireEvent.change(aiInput, { target: { value: '' } });
    expect(localStorage.getItem('rehome_admin_estimated_ai_cost')).toBeNull();
    expect(screen.getByText(/Chưa đủ dữ liệu tính/)).toBeInTheDocument();
  });

  it('validates date range and blocks API call when from > to', async () => {
    render(<MembershipStatsPage />);
    await waitFor(() => expect(membershipAdminApi.getMembershipStats).toHaveBeenCalledTimes(1));

    const fromInput = screen.getByLabelText(/Từ ngày/i);
    const toInput = screen.getByLabelText(/Đến ngày/i);
    fireEvent.change(fromInput, { target: { value: '2026-11-20' } });
    fireEvent.change(toInput, { target: { value: '2026-11-10' } });

    expect(await screen.findByText(/Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc/)).toBeInTheDocument();
    expect(membershipAdminApi.getMembershipStats).toHaveBeenCalledTimes(1);
  });
});

describe('MembershipPaymentsPage', () => {
  it('fetches and renders payment rows with subscription link and filters', async () => {
    membershipAdminApi.getPayments.mockResolvedValue({
      content: [
        {
          id: 'pay-1',
          subscriptionId: 'sub-99',
          memberName: 'Nguyễn Văn A',
          memberEmail: 'a@example.com',
          tier: 'GOLD',
          amount: 199000,
          method: 'MOMO',
          status: 'PAID',
          createdAt: '2026-11-01T10:00:00Z',
          paidAt: '2026-11-01T10:02:00Z',
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <MembershipPaymentsPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(membershipAdminApi.getPayments).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('a@example.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sub-99/i })).toHaveAttribute(
      'href',
      '/admin/membership-subscriptions/sub-99'
    );
    expect(screen.getByText(/199\.000/)).toBeInTheDocument();
    expect(screen.getAllByText('MoMo').length).toBeGreaterThanOrEqual(2);

    fireEvent.change(screen.getByLabelText(/Hạng gói/i), { target: { value: 'GOLD' } });
    await waitFor(() =>
      expect(membershipAdminApi.getPayments).toHaveBeenLastCalledWith(
        expect.objectContaining({ tier: 'GOLD', page: 0, size: 20 })
      )
    );
  });

  it('shows non-crashing pending integration notice when backend returns 404 or 501', async () => {
    membershipAdminApi.getPayments.mockRejectedValueOnce({
      response: { status: 404, data: { message: 'Not Found' } },
    });

    render(
      <MemoryRouter>
        <MembershipPaymentsPage />
      </MemoryRouter>
    );

    expect(
      await screen.findByText(/\/api\/admin\/membership-payments/)
    ).toBeInTheDocument();
  });
});

describe('AdminAuditLogsView membership & voucher labels', () => {
  it('renders Vietnamese labels for membership and voucher actions and target options', async () => {
    adminApi.getAuditLogs.mockResolvedValue([
      { id: '1', actionType: 'UPDATE_MEMBERSHIP_PLAN', targetType: 'MEMBERSHIP_PLAN' },
      { id: '2', actionType: 'GRANT_MEMBERSHIP', targetType: 'MEMBER_SUBSCRIPTION' },
      { id: '3', actionType: 'CANCEL_MEMBERSHIP', targetType: 'MEMBER_SUBSCRIPTION' },
      { id: '4', actionType: 'UPDATE_VOUCHER_TEMPLATE', targetType: 'VOUCHER_TEMPLATE' },
      { id: '5', actionType: 'DEACTIVATE_VOUCHER_TEMPLATE', targetType: 'VOUCHER_TEMPLATE' },
    ]);

    render(<AdminAuditLogsView />);

    await waitFor(() => expect(adminApi.getAuditLogs).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Cập nhật gói thành viên')).toBeInTheDocument();
    expect(screen.getByText('Tặng gói thành viên')).toBeInTheDocument();
    expect(screen.getByText('Hủy gói thành viên')).toBeInTheDocument();
    expect(screen.getByText('Cập nhật mẫu voucher')).toBeInTheDocument();
    expect(screen.getByText('Ngưng kích hoạt mẫu voucher')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /MEMBERSHIP_PLAN/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /MEMBER_SUBSCRIPTION/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /VOUCHER_TEMPLATE/ })).toBeInTheDocument();
  });
});

describe('AdminFundLedgerSection membership & voucher labels', () => {
  it('renders Vietnamese labels for membership payment and voucher cost ledger entries', async () => {
    adminApi.getFundLedger.mockResolvedValue({
      content: [
        {
          id: 'l-1',
          transactionNo: 'TX-1',
          type: 'MEMBERSHIP_PAYMENT',
          amount: 199000,
          balanceAfter: 10199000,
          createdAt: '2026-11-01T10:00:00Z',
        },
        {
          id: 'l-2',
          transactionNo: 'TX-2',
          type: 'VOUCHER_COST',
          amount: -30000,
          balanceAfter: 10169000,
          createdAt: '2026-11-01T11:00:00Z',
        },
      ],
      page: 0,
      size: 10,
      totalElements: 2,
      totalPages: 1,
    });

    render(<AdminFundLedgerSection from="2026-11-01" to="2026-11-30" />);

    await waitFor(() => expect(adminApi.getFundLedger).toHaveBeenCalledTimes(1));
    expect(screen.getAllByText('Thanh toán gói VIP').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Chi phí voucher nền tảng').length).toBeGreaterThanOrEqual(1);
  });
});
