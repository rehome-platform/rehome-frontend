import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../src/context/ToastContext.jsx';
import VoucherTemplatesPage from '../../src/features/admin/membership/VoucherTemplatesPage.jsx';
import MembershipSubscriptionsPage from '../../src/features/admin/membership/MembershipSubscriptionsPage.jsx';
import MembershipPlansPage from '../../src/features/admin/membership/MembershipPlansPage.jsx';
import membershipAdminApiDefault, {
  membershipAdminApi,
} from '../../src/features/admin/services/membershipAdminApi.js';

function wrap(ui, initialEntries = ['/admin']) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>{ui}</ToastProvider>
    </MemoryRouter>
  );
}

describe('Admin UI layout synchronization: Vouchers, Membership Subscriptions, Membership Plans', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('VoucherTemplatesPage: renders compact unified toolbar, right-aligned action cluster, and updates filtered count', async () => {
    vi.spyOn(membershipAdminApi, 'getVoucherTemplates').mockResolvedValue([
      {
        id: 'v-1',
        name: 'Miễn phí vận chuyển',
        type: 'SHIPPING',
        discountKind: 'FIXED',
        discountValue: 15000,
        minOrderAmount: 100000,
        validDays: 30,
        active: true,
        tierRules: [{ tier: 'SILVER', quantityPerMonth: 1 }],
      },
      {
        id: 'v-2',
        name: 'Giảm giá đơn hàng',
        type: 'ORDER_DISCOUNT',
        discountKind: 'PERCENT',
        discountValue: 0.1,
        maxDiscountAmount: 50000,
        minOrderAmount: 200000,
        validDays: 30,
        active: false,
        tierRules: [{ tier: 'GOLD', quantityPerMonth: 2 }],
      },
    ]);

    render(wrap(<VoucherTemplatesPage />, ['/admin/voucher-templates']));

    expect(await screen.findByText('Miễn phí vận chuyển')).toBeInTheDocument();
    expect(screen.getByText('2/2 mẫu')).toBeInTheDocument();

    const createBtn = screen.getByRole('button', { name: /Tạo mẫu voucher/i });
    const statusFilter = screen.getByLabelText('Lọc theo trạng thái');
    const toolbar = createBtn.closest('div').parentElement;
    expect(within(toolbar).getByText('Thiết lập mẫu voucher định kỳ phát cho các hạng thành viên.')).toBeInTheDocument();
    expect(within(toolbar).getByLabelText('Lọc theo trạng thái')).toBe(statusFilter);

    const actionsHeader = screen.getByRole('columnheader', { name: 'Thao tác' });
    expect(actionsHeader.className).toContain('text-right');

    const row1 = screen.getByText('Miễn phí vận chuyển').closest('tr');
    expect(within(row1).getByRole('button', { name: /Xem chi tiết/i })).toBeInTheDocument();
    expect(within(row1).getByRole('button', { name: /Sửa/i })).toBeInTheDocument();

    fireEvent.change(statusFilter, { target: { value: 'ACTIVE' } });
    expect(screen.getByText('1/2 mẫu')).toBeInTheDocument();
    expect(screen.queryByText('Giảm giá đơn hàng')).not.toBeInTheDocument();
  });

  it('MembershipSubscriptionsPage: merges CTA into filter card and unifies Còn lại column across CANCELLED, ACTIVE, EXPIRED', async () => {
    vi.spyOn(membershipAdminApiDefault, 'getSubscriptions').mockResolvedValue({
      content: [
        {
          id: 'sub-cancelled',
          memberEmail: 'member4@rehome.com',
          tier: 'GOLD',
          status: 'CANCELLED',
          billingCycle: 'MONTHLY',
          pricePaid: 59000,
          daysRemaining: null,
        },
        {
          id: 'sub-active-normal',
          memberEmail: 'member2@rehome.com',
          tier: 'SILVER',
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          pricePaid: 29000,
          daysRemaining: 25,
        },
        {
          id: 'sub-active-urgent',
          memberEmail: 'member3@rehome.com',
          tier: 'DIAMOND',
          status: 'ACTIVE',
          billingCycle: 'YEARLY',
          pricePaid: 990000,
          daysRemaining: 2,
        },
        {
          id: 'sub-expired',
          memberEmail: 'member5@rehome.com',
          tier: 'SILVER',
          status: 'EXPIRED',
          billingCycle: 'MONTHLY',
          pricePaid: 29000,
          daysRemaining: 0,
        },
      ],
      totalElements: 4,
      totalPages: 1,
    });

    render(wrap(<MembershipSubscriptionsPage />, ['/admin/membership-subscriptions']));

    expect(await screen.findByText('member4@rehome.com')).toBeInTheDocument();
    expect(screen.getByText('4 gói')).toBeInTheDocument();
    expect(screen.getByText('(4 bản ghi)')).toBeInTheDocument();

    // Grant CTA button shares the same bordered white card as the search filter input
    const grantBtn = screen.getByRole('button', { name: /Tặng \/ gia hạn gói/i });
    const searchInput = screen.getByPlaceholderText(/Tên, email hoặc mã thành viên/i);
    const topCard = grantBtn.closest('.bg-white');
    expect(topCard).toBeInTheDocument();
    expect(within(topCard).getByPlaceholderText(/Tên, email hoặc mã thành viên/i)).toBe(searchInput);

    // CANCELLED -> "—"
    const cancelledRow = screen.getByText('member4@rehome.com').closest('tr');
    expect(within(cancelledRow).getByText('—')).toBeInTheDocument();

    // EXPIRED with daysRemaining=0 -> "—" (no alarming "0 ngày" badge)
    const expiredRow = screen.getByText('member5@rehome.com').closest('tr');
    expect(within(expiredRow).getByText('—')).toBeInTheDocument();
    expect(within(expiredRow).queryByText('0 ngày')).not.toBeInTheDocument();

    // ACTIVE (> 3 days) -> clean plain text "25 ngày"
    const normalActiveRow = screen.getByText('member2@rehome.com').closest('tr');
    expect(within(normalActiveRow).getByText('25 ngày')).toBeInTheDocument();

    // ACTIVE (<= 3 days) -> warning badge "2 ngày"
    const urgentActiveRow = screen.getByText('member3@rehome.com').closest('tr');
    const urgentText = within(urgentActiveRow).getByText('2 ngày');
    expect(urgentText.className).toContain('text-[#B54708]');
  });

  it('MembershipPlansPage: uses neutral count styling in Đang dùng and renders prominent note callout', async () => {
    vi.spyOn(membershipAdminApi, 'getPlans').mockResolvedValue([
      {
        id: 'plan-free',
        tier: 'FREE',
        name: 'Thành viên thường',
        pricePerMonth: 0,
        pricePerYear: null,
        active: true,
        activeSubscriberCount: 0,
      },
      {
        id: 'plan-gold',
        tier: 'GOLD',
        name: 'Thành viên Vàng',
        pricePerMonth: 59000,
        pricePerYear: 590000,
        active: true,
        activeSubscriberCount: 3,
      },
    ]);

    render(wrap(<MembershipPlansPage />, ['/admin/membership-plans']));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: '3' })).toBeInTheDocument();
    });

    const goldCountLink = screen.getByRole('link', { name: '3' });
    expect(goldCountLink).toHaveAttribute('href', '/admin/membership-subscriptions?tier=GOLD');
    expect(goldCountLink.className.split(/\s+/)).not.toContain('text-[#006B2C]');
    expect(goldCountLink.className.split(/\s+/)).toContain('text-[#1F2A37]');

    const freeCountLink = screen.getByRole('link', { name: '0' });
    expect(freeCountLink.className.split(/\s+/)).toContain('text-[#5B6776]');

    const actionsHeader = screen.getByRole('columnheader', { name: 'Thao tác' });
    expect(actionsHeader.className).toContain('text-right');

    const noteCallout = screen.getByRole('note');
    expect(noteCallout).toHaveTextContent(/Lưu ý hiển thị trên sàn:/i);
    expect(noteCallout).toHaveTextContent(/hạng cao hơn được xếp trên/i);
  });
});
