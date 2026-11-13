import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import MembershipSubscriptionsPage from '../../src/features/admin/membership/MembershipSubscriptionsPage.jsx';
import MembershipSubscriptionDetailPage from '../../src/features/admin/membership/MembershipSubscriptionDetailPage.jsx';
import GrantMembershipModal from '../../src/features/admin/membership/GrantMembershipModal.jsx';
import CancelMembershipModal from '../../src/features/admin/membership/CancelMembershipModal.jsx';
import membershipAdminApi from '../../src/features/admin/services/membershipAdminApi.js';
import adminApi from '../../src/features/admin/services/adminApi.js';

vi.mock('../../src/features/admin/services/membershipAdminApi.js', () => ({
  default: {
    getSubscriptions: vi.fn(),
    getSubscriptionById: vi.fn(),
    grantSubscription: vi.fn(),
    cancelSubscription: vi.fn(),
  },
}));

vi.mock('../../src/features/admin/services/adminApi.js', () => ({
  default: {
    getAccounts: vi.fn(),
  },
}));

function LocationDisplay() {
  const loc = useLocation();
  return <div data-testid="location-display">{loc.pathname + loc.search}</div>;
}

const sampleSubscriptionsPage = {
  content: [
    {
      id: 'sub-1',
      memberId: 'mem-1',
      memberName: 'Nguyễn Văn A',
      memberEmail: 'a@rehome.vn',
      memberCode: 'MEM-001',
      tier: 'GOLD',
      tierName: 'Thành viên Vàng',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      pricePaid: 199000,
      startedAt: '2026-11-01T00:00:00Z',
      expiresAt: '2026-12-01T00:00:00Z',
      daysRemaining: 2,
      grantedByAdmin: true,
    },
    {
      id: 'sub-2',
      memberId: 'mem-2',
      memberName: 'Trần Thị B',
      memberEmail: 'b@rehome.vn',
      memberCode: 'MEM-002',
      tier: 'SILVER',
      status: 'EXPIRED',
      billingCycle: 'YEARLY',
      pricePaid: 990000,
      startedAt: '2025-11-01T00:00:00Z',
      expiresAt: '2026-11-01T00:00:00Z',
      daysRemaining: 15,
      grantedByAdmin: false,
    },
  ],
  page: 0,
  size: 20,
  totalElements: 25,
  totalPages: 2,
};

const sampleDetail = {
  id: 'sub-1',
  memberId: 'mem-1',
  memberName: 'Nguyễn Văn A',
  memberEmail: 'a@rehome.vn',
  memberCode: 'MEM-001',
  tier: 'GOLD',
  tierName: 'Thành viên Vàng',
  status: 'ACTIVE',
  billingCycle: 'MONTHLY',
  pricePaid: 199000,
  startedAt: '2026-11-01T00:00:00Z',
  expiresAt: '2026-12-01T00:00:00Z',
  daysRemaining: 2,
  grantedByAdmin: true,
  reason: 'Tri ân khách hàng thân thiết',
  effectiveLimits: {
    maxActiveListings: 20,
    liveTryonDailyLimit: null,
    aiTryonDailyLimit: 0,
    commissionDiscountPercent: 15,
  },
  quotaUsage: {
    liveTryonUsedToday: 3,
    liveTryonUsedThisMonth: 18,
    aiTryonUsedToday: 0,
    aiTryonUsedThisMonth: 4,
    featuredListing: true,
    featuredProductCount: 2,
    pendingConsignmentForms: 1,
  },
  payments: [
    {
      id: 'pay-1',
      transactionNo: 'MPAY-001',
      method: 'ADMIN_GRANT',
      amount: 0,
      status: 'SUCCESS',
      paidAt: '2026-11-01T00:05:00Z',
    },
  ],
  vouchers: [
    {
      id: 'v-1',
      code: 'GOLD-FREESHIP',
      name: 'Miễn phí vận chuyển Gold',
      status: 'USED',
      usedOrderNos: ['ORD-101', 'ORD-102'],
    },
  ],
};

describe('MembershipSubscriptionsPage (W-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    membershipAdminApi.getSubscriptions.mockResolvedValue(sampleSubscriptionsPage);
  });

  it('renders subscription rows, daysRemaining danger badge when <= 3, source labels, and pagination', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/membership-subscriptions']}>
        <MembershipSubscriptionsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Nguyễn Văn A')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText('a@rehome.vn')).toBeInTheDocument();
    expect(within(table).getByText('MEM-001')).toBeInTheDocument();
    expect(within(table).getByText('Thành viên Vàng')).toBeInTheDocument();
    expect(within(table).getByText('Đang hoạt động')).toBeInTheDocument();
    expect(within(table).getByText('Admin tặng')).toBeInTheDocument();
    expect(within(table).getByText('Tự mua')).toBeInTheDocument();

    const urgentBadge = screen.getByText('2 ngày');
    expect(urgentBadge.className).toContain('text-[#D92D20]');

    const normalBadge = screen.getByText('15 ngày');
    expect(normalBadge.className).not.toContain('text-[#D92D20]');

    expect(screen.getByText(/Trang 1 \/ 2/)).toBeInTheDocument();
  });

  it('syncs filters (tier, status, q, expiringInDays, page) with URL useSearchParams', async () => {
    render(
      <MemoryRouter
        initialEntries={['/admin/membership-subscriptions?tier=GOLD&status=ACTIVE&q=nguyen&expiringInDays=7&page=1']}
      >
        <LocationDisplay />
        <MembershipSubscriptionsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(membershipAdminApi.getSubscriptions).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: 'GOLD',
          status: 'ACTIVE',
          search: 'nguyen',
          expiringInDays: 7,
          page: 1,
        })
      );
    });

    const tierSelect = screen.getByLabelText('Lọc theo hạng');
    fireEvent.change(tierSelect, { target: { value: 'DIAMOND' } });

    await waitFor(() => {
      expect(screen.getByTestId('location-display').textContent).toContain('tier=DIAMOND');
      expect(membershipAdminApi.getSubscriptions).toHaveBeenLastCalledWith(
        expect.objectContaining({
          tier: 'DIAMOND',
          page: 0,
        })
      );
    });
  });

  it('guards against out-of-order async responses using sequence ref', async () => {
    let resolveFirst;
    let resolveSecond;
    membershipAdminApi.getSubscriptions
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          })
      );

    render(
      <MemoryRouter initialEntries={['/admin/membership-subscriptions']}>
        <MembershipSubscriptionsPage />
      </MemoryRouter>
    );

    // Trigger second request before first resolves
    const tierSelect = screen.getByLabelText('Lọc theo hạng');
    fireEvent.change(tierSelect, { target: { value: 'SILVER' } });

    // Second request resolves first with fresh data
    resolveSecond({
      content: [
        {
          id: 'sub-fresh',
          memberName: 'Fresh Member',
          memberEmail: 'fresh@rehome.vn',
          memberCode: 'MEM-NEW',
          tier: 'SILVER',
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          pricePaid: 99000,
          startedAt: '2026-11-10T00:00:00Z',
          expiresAt: '2026-12-10T00:00:00Z',
          daysRemaining: 20,
          grantedByAdmin: false,
        },
      ],
      page: 0,
      totalPages: 1,
      totalElements: 1,
    });

    expect(await screen.findByText('Fresh Member')).toBeInTheDocument();

    // First request resolves later with stale data — must be ignored
    resolveFirst({
      content: [
        {
          id: 'sub-stale',
          memberName: 'Stale Member',
          memberEmail: 'stale@rehome.vn',
          memberCode: 'MEM-OLD',
          tier: 'GOLD',
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          pricePaid: 199000,
          startedAt: '2026-11-01T00:00:00Z',
          expiresAt: '2026-12-01T00:00:00Z',
          daysRemaining: 10,
          grantedByAdmin: false,
        },
      ],
      page: 0,
      totalPages: 1,
      totalElements: 1,
    });

    await waitFor(() => {
      expect(screen.getByText('Fresh Member')).toBeInTheDocument();
      expect(screen.queryByText('Stale Member')).not.toBeInTheDocument();
    });
  });

  it('navigates to detail page when clicking a row and opens GrantMembershipModal on button click', async () => {
    render(
      <MemoryRouter initialEntries={['/admin/membership-subscriptions']}>
        <Routes>
          <Route path="/admin/membership-subscriptions" element={<MembershipSubscriptionsPage />} />
          <Route path="/admin/membership-subscriptions/:id" element={<div data-testid="detail-route">Detail</div>} />
        </Routes>
      </MemoryRouter>
    );

    const memberCell = await screen.findByText('Nguyễn Văn A');
    fireEvent.click(screen.getByRole('button', { name: /Tặng \/ gia hạn gói/i }));
    expect(screen.getByRole('heading', { name: /Tặng \/ gia hạn gói thành viên/i })).toBeInTheDocument();

    // Close modal and click row
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    fireEvent.click(memberCell.closest('tr'));
    expect(await screen.findByTestId('detail-route')).toBeInTheDocument();
  });
});

describe('MembershipSubscriptionDetailPage (W-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 3 blocks: package info, effectiveLimits + quotaUsage, and payments + vouchers', async () => {
    membershipAdminApi.getSubscriptionById.mockResolvedValue(sampleDetail);

    render(
      <MemoryRouter initialEntries={['/admin/membership-subscriptions/sub-1']}>
        <Routes>
          <Route path="/admin/membership-subscriptions/:id" element={<MembershipSubscriptionDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Nguyễn Văn A')).toBeInTheDocument();
    expect(screen.getByText('Tri ân khách hàng thân thiết')).toBeInTheDocument();

    // Block 2: effectiveLimits with formatQuotaValue (null -> Không giới hạn, 0 -> 0)
    expect(screen.getByText('Không giới hạn')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();

    // Mobile quotaUsage
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('GOLD-FREESHIP')).toBeInTheDocument();
    expect(screen.getByText(/ORD-101, ORD-102/)).toBeInTheDocument();
    expect(screen.getByText('MPAY-001')).toBeInTheDocument();
  });

  it('shows clear fallback note when effectiveLimits is absent from backend response', async () => {
    membershipAdminApi.getSubscriptionById.mockResolvedValue({
      ...sampleDetail,
      effectiveLimits: null,
    });

    render(
      <MemoryRouter initialEntries={['/admin/membership-subscriptions/sub-1']}>
        <Routes>
          <Route path="/admin/membership-subscriptions/:id" element={<MembershipSubscriptionDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      await screen.findByText('Chưa có dữ liệu snapshot hạn mức từ backend')
    ).toBeInTheDocument();
  });

  it('disables Hủy gói button when status is CANCELLED or EXPIRED', async () => {
    membershipAdminApi.getSubscriptionById.mockResolvedValue({
      ...sampleDetail,
      status: 'CANCELLED',
    });

    render(
      <MemoryRouter initialEntries={['/admin/membership-subscriptions/sub-1']}>
        <Routes>
          <Route path="/admin/membership-subscriptions/:id" element={<MembershipSubscriptionDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    const cancelBtn = await screen.findByRole('button', { name: 'Hủy gói' });
    expect(cancelBtn).toBeDisabled();
  });

  it('reloads detail after GrantMembershipModal or CancelMembershipModal succeeds', async () => {
    membershipAdminApi.getSubscriptionById.mockResolvedValue(sampleDetail);
    membershipAdminApi.cancelSubscription.mockResolvedValue({ ...sampleDetail, status: 'CANCELLED' });

    render(
      <MemoryRouter initialEntries={['/admin/membership-subscriptions/sub-1']}>
        <Routes>
          <Route path="/admin/membership-subscriptions/:id" element={<MembershipSubscriptionDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    const cancelBtn = await screen.findByRole('button', { name: 'Hủy gói' });
    fireEvent.click(cancelBtn);

    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/Lý do hủy gói/i), {
      target: { value: 'Yêu cầu từ thành viên' },
    });
    fireEvent.click(
      within(dialog).getByLabelText(
        'Xác nhận hủy gói: không tự hoàn tiền; các voucher đã cấp vẫn giữ hiệu lực.'
      )
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận hủy gói' }));

    await waitFor(() => {
      expect(membershipAdminApi.cancelSubscription).toHaveBeenCalledWith(
        'sub-1',
        'Yêu cầu từ thành viên'
      );
      expect(membershipAdminApi.getSubscriptionById).toHaveBeenCalledTimes(2);
    });
  });
});

describe('GrantMembershipModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('searches MEMBER accounts, excludes FREE tier, validates months 1-24 and reason, and prevents duplicate submit', async () => {
    adminApi.getAccounts.mockResolvedValue({
      content: [
        { id: 'acc-10', fullName: 'Lê Minh C', email: 'c@rehome.vn', memberCode: 'MEM-010' },
      ],
    });

    let resolveGrant;
    membershipAdminApi.grantSubscription.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGrant = resolve;
        })
    );

    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(<GrantMembershipModal isOpen={true} onClose={onClose} onSuccess={onSuccess} />);

    // Only PAID_TIERS (never FREE)
    const tierSelect = screen.getByLabelText(/Hạng gói/i);
    const options = within(tierSelect)
      .getAllByRole('option')
      .map((opt) => opt.value);
    expect(options).toEqual(['SILVER', 'GOLD', 'DIAMOND']);
    expect(options).not.toContain('FREE');

    // Search member
    const searchInput = screen.getByPlaceholderText(/Tìm theo tên, email/i);
    fireEvent.change(searchInput, { target: { value: 'Minh' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tìm' }));

    await waitFor(() => {
      expect(adminApi.getAccounts).toHaveBeenCalledWith({
        search: 'Minh',
        role: 'MEMBER',
        size: 10,
      });
    });

    fireEvent.click(await screen.findByText('Lê Minh C'));

    fireEvent.change(tierSelect, { target: { value: 'DIAMOND' } });
    fireEvent.change(screen.getByLabelText(/Số tháng/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/Lý do/i), { target: { value: 'Thưởng sự kiện' } });

    const submitBtn = screen.getByRole('button', { name: 'Xác nhận tặng / gia hạn' });
    fireEvent.click(submitBtn);

    expect(submitBtn).toBeDisabled();
    expect(membershipAdminApi.grantSubscription).toHaveBeenCalledTimes(1);
    expect(membershipAdminApi.grantSubscription).toHaveBeenCalledWith({
      accountId: 'acc-10',
      tier: 'DIAMOND',
      durationMonths: 3,
      reason: 'Thưởng sự kiện',
    });

    resolveGrant({ id: 'sub-99' });
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('handles 403, 404, 409 API errors cleanly', async () => {
    membershipAdminApi.grantSubscription.mockRejectedValueOnce({
      response: { status: 409, data: { message: 'Member đã có gói cao hơn' } },
    });

    render(
      <GrantMembershipModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        initialMember={{ id: 'acc-1', fullName: 'Nguyễn Văn A', email: 'a@rehome.vn' }}
      />
    );

    fireEvent.change(screen.getByLabelText(/Lý do/i), { target: { value: 'Gia hạn' } });
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận tặng / gia hạn' }));

    expect(await screen.findByText(/Member đã có gói cao hơn/i)).toBeInTheDocument();
  });
});

describe('CancelMembershipModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires non-empty reason and confirmation checkbox before enabling submit', async () => {
    membershipAdminApi.cancelSubscription.mockResolvedValue({ id: 'sub-1', status: 'CANCELLED' });
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <CancelMembershipModal
        isOpen={true}
        onClose={onClose}
        onSuccess={onSuccess}
        subscription={{ id: 'sub-1', memberName: 'Nguyễn Văn A', tier: 'GOLD' }}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Xác nhận hủy gói' });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Lý do hủy gói/i), { target: { value: 'Vi phạm' } });
    expect(submitBtn).toBeDisabled();

    fireEvent.click(
      screen.getByLabelText(
        'Xác nhận hủy gói: không tự hoàn tiền; các voucher đã cấp vẫn giữ hiệu lực.'
      )
    );
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(membershipAdminApi.cancelSubscription).toHaveBeenCalledWith('sub-1', 'Vi phạm');
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
