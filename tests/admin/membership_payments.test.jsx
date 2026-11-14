import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MembershipPaymentsPage from '../../src/features/admin/membership/MembershipPaymentsPage.jsx';
import membershipAdminApi from '../../src/features/admin/services/membershipAdminApi.js';
import { validateDateRange } from '../../src/features/admin/utils/adminDateUtils.js';

vi.mock('../../src/features/admin/services/membershipAdminApi.js', () => ({
  default: {
    getPayments: vi.fn(),
  },
}));

describe('MembershipPaymentsPage (Requirement R1 Comprehensive Suite)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates date formats and ranges via validateDateRange', () => {
    expect(validateDateRange('invalid-date', '2026-11-10')).toBe(
      'Ngày bắt đầu không đúng định dạng YYYY-MM-DD.'
    );
    expect(validateDateRange('2026-11-10', 'not-a-date')).toBe(
      'Ngày kết thúc không đúng định dạng YYYY-MM-DD.'
    );
    expect(validateDateRange('2026-11-20', '2026-11-10')).toBe(
      'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.'
    );
    expect(validateDateRange('2026-11-01', '2026-11-10')).toBeNull();
    expect(validateDateRange('', '')).toBeNull();

    // Strict calendar date validation (leap year rollover & non-existent dates)
    expect(validateDateRange('2025-02-29', '2025-03-01')).toBe(
      'Ngày bắt đầu không đúng định dạng YYYY-MM-DD.'
    );
    expect(validateDateRange('2024-02-29', '2024-03-01')).toBeNull();
    expect(validateDateRange('2026-04-01', '2026-04-31')).toBe(
      'Ngày kết thúc không đúng định dạng YYYY-MM-DD.'
    );
  });

  it('renders payment method filter containing only WALLET, MOMO, VNPAY and excludes ADMIN_GRANT', async () => {
    membershipAdminApi.getPayments.mockResolvedValue({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    });

    render(
      <MemoryRouter>
        <MembershipPaymentsPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(membershipAdminApi.getPayments).toHaveBeenCalledTimes(1));

    const methodSelect = screen.getByLabelText(/Phương thức/i);
    const options = Array.from(methodSelect.querySelectorAll('option')).map((o) => o.value);

    expect(options).toEqual(['', 'WALLET', 'MOMO', 'VNPAY']);
    expect(options).not.toContain('ADMIN_GRANT');
  });

  it('displays transaction count badge in header from totalElements', async () => {
    membershipAdminApi.getPayments.mockResolvedValue({
      content: [
        {
          id: 'p-1',
          subscriptionId: 'sub-1',
          memberName: 'Trần Văn B',
          memberEmail: 'b@example.com',
          tier: 'SILVER',
          amount: 99000,
          method: 'WALLET',
          status: 'PAID',
          createdAt: '2026-11-10T08:00:00Z',
          paidAt: '2026-11-10T08:01:00Z',
        },
      ],
      page: 0,
      size: 20,
      totalElements: 42,
      totalPages: 3,
    });

    render(
      <MemoryRouter>
        <MembershipPaymentsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('42 giao dịch')).toBeInTheDocument();
    expect(screen.getByText('(42 bản ghi)')).toBeInTheDocument();
  });

  it('handles inverted date range (from > to) by showing error and clearing stale items', async () => {
    membershipAdminApi.getPayments.mockResolvedValue({
      content: [
        {
          id: 'p-initial',
          subscriptionId: 'sub-init',
          memberName: 'Người dùng cũ',
          memberEmail: 'old@example.com',
          tier: 'SILVER',
          amount: 50000,
          method: 'WALLET',
          status: 'PAID',
          createdAt: '2026-11-01T00:00:00Z',
          paidAt: '2026-11-01T00:05:00Z',
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

    expect(await screen.findByText('Người dùng cũ')).toBeInTheDocument();
    expect(membershipAdminApi.getPayments).toHaveBeenCalledTimes(1);

    const fromInput = screen.getByLabelText(/Từ ngày/i);
    const toInput = screen.getByLabelText(/Đến ngày/i);

    fireEvent.change(toInput, { target: { value: '2026-11-10' } });
    fireEvent.change(fromInput, { target: { value: '2026-11-20' } });

    expect(
      await screen.findByText('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.')
    ).toBeInTheDocument();

    // Stale item must be cleared
    expect(screen.queryByText('Người dùng cũ')).not.toBeInTheDocument();
  });

  it('prevents in-flight responses from overwriting cleared items when date error occurs (race condition check)', async () => {
    let resolveInFlight;
    const delayedPromise = new Promise((resolve) => {
      resolveInFlight = resolve;
    });

    membershipAdminApi.getPayments
      .mockResolvedValueOnce({
        content: [
          {
            id: 'p-initial',
            subscriptionId: 'sub-init',
            memberName: 'Người dùng ban đầu',
            memberEmail: 'init@example.com',
            tier: 'SILVER',
            amount: 50000,
            method: 'WALLET',
            status: 'PAID',
            createdAt: '2026-11-01T00:00:00Z',
            paidAt: '2026-11-01T00:05:00Z',
          },
        ],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      })
      .mockImplementationOnce(() => delayedPromise);

    render(
      <MemoryRouter>
        <MembershipPaymentsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Người dùng ban đầu')).toBeInTheDocument();

    const fromInput = screen.getByLabelText(/Từ ngày/i);
    const toInput = screen.getByLabelText(/Đến ngày/i);

    // Trigger in-flight call (valid date triggers second call)
    fireEvent.change(toInput, { target: { value: '2026-11-10' } });

    // Immediately trigger invalid date range before in-flight call resolves
    fireEvent.change(fromInput, { target: { value: '2026-11-20' } });

    expect(
      await screen.findByText('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Người dùng ban đầu')).not.toBeInTheDocument();

    // Now resolve the in-flight request with new data
    resolveInFlight({
      content: [
        {
          id: 'p-stale',
          subscriptionId: 'sub-stale',
          memberName: 'Người dùng in-flight cũ',
          memberEmail: 'stale@example.com',
          tier: 'GOLD',
          amount: 100000,
          method: 'WALLET',
          status: 'PAID',
          createdAt: '2026-11-10T00:00:00Z',
          paidAt: '2026-11-10T00:05:00Z',
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    });

    // Allow microtasks to execute
    await new Promise((resolve) => setTimeout(resolve, 50));

    // In-flight response must NOT overwrite cleared table
    expect(screen.queryByText('Người dùng in-flight cũ')).not.toBeInTheDocument();
    expect(screen.queryByText('Người dùng ban đầu')).not.toBeInTheDocument();
    expect(
      screen.getByText('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc.')
    ).toBeInTheDocument();
  });

  it('renders contextual fallback for nullable paidAt field across statuses', async () => {
    membershipAdminApi.getPayments.mockResolvedValue({
      content: [
        {
          id: 'p-pending',
          subscriptionId: 'sub-pending',
          memberName: 'Chờ Thanh Toán',
          memberEmail: 'pending@example.com',
          tier: 'GOLD',
          amount: 199000,
          method: 'MOMO',
          status: 'PENDING',
          createdAt: '2026-11-12T10:00:00Z',
          paidAt: null,
        },
        {
          id: 'p-failed',
          subscriptionId: 'sub-failed',
          memberName: 'Thanh Toán Lỗi',
          memberEmail: 'failed@example.com',
          tier: 'DIAMOND',
          amount: 499000,
          method: 'VNPAY',
          status: 'FAILED',
          createdAt: '2026-11-11T10:00:00Z',
          paidAt: null,
        },
        {
          id: 'p-cancelled',
          subscriptionId: 'sub-cancelled',
          memberName: 'Đã Hủy Đơn',
          memberEmail: 'cancelled@example.com',
          tier: 'SILVER',
          amount: 99000,
          method: 'WALLET',
          status: 'CANCELLED',
          createdAt: '2026-11-10T10:00:00Z',
          paidAt: null,
        },
      ],
      page: 0,
      size: 20,
      totalElements: 3,
      totalPages: 1,
    });

    render(
      <MemoryRouter>
        <MembershipPaymentsPage />
      </MemoryRouter>
    );

    // Both badge and paidAt column have 'Chờ thanh toán'
    await waitFor(() => {
      const pendingElements = screen.getAllByText('Chờ thanh toán');
      expect(pendingElements.length).toBeGreaterThanOrEqual(2);
    });

    const noPaidAtBadges = screen.getAllByText('Chưa có');
    expect(noPaidAtBadges.length).toBeGreaterThanOrEqual(2);
  });

  it('shows error banner with retry button on server error and recovers on retry', async () => {
    membershipAdminApi.getPayments
      .mockRejectedValueOnce(new Error('Mạng bị gián đoạn, không thể tải dữ liệu'))
      .mockResolvedValueOnce({
        content: [
          {
            id: 'p-recovered',
            subscriptionId: 'sub-rec',
            memberName: 'Phục Hồi Thành Công',
            memberEmail: 'rec@example.com',
            tier: 'GOLD',
            amount: 199000,
            method: 'WALLET',
            status: 'PAID',
            createdAt: '2026-11-14T09:00:00Z',
            paidAt: '2026-11-14T09:01:00Z',
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

    expect(
      await screen.findByText('Mạng bị gián đoạn, không thể tải dữ liệu')
    ).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: 'Thử lại' });
    fireEvent.click(retryButton);

    expect(await screen.findByText('Phục Hồi Thành Công')).toBeInTheDocument();
    expect(
      screen.queryByText('Mạng bị gián đoạn, không thể tải dữ liệu')
    ).not.toBeInTheDocument();
  });

  it('displays empty state with icon and quick reset button when no items match filters', async () => {
    membershipAdminApi.getPayments.mockResolvedValue({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    });

    render(
      <MemoryRouter>
        <MembershipPaymentsPage />
      </MemoryRouter>
    );

    expect(
      await screen.findByText('Chưa có giao dịch thanh toán nào phù hợp')
    ).toBeInTheDocument();

    // When a filter is set
    fireEvent.change(screen.getByLabelText(/Hạng gói/i), { target: { value: 'DIAMOND' } });

    const resetBtn = await screen.findByRole('button', { name: 'Xóa bộ lọc' });
    expect(resetBtn).toBeInTheDocument();

    fireEvent.click(resetBtn);
    expect(screen.getByLabelText(/Hạng gói/i)).toHaveValue('');
  });

  it('safely handles array response fallback without breaking pagination controls', async () => {
    membershipAdminApi.getPayments.mockResolvedValue([
      {
        id: 'p-array-1',
        subscriptionId: 'sub-arr',
        memberName: 'Dạng Mảng Fallback',
        memberEmail: 'arr@example.com',
        tier: 'GOLD',
        amount: 250000,
        method: 'WALLET',
        status: 'PAID',
        createdAt: '2026-11-14T08:00:00Z',
        paidAt: '2026-11-14T08:02:00Z',
      },
    ]);

    render(
      <MemoryRouter>
        <MembershipPaymentsPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('Dạng Mảng Fallback')).toBeInTheDocument();
    expect(screen.getByText('Trang 1 / 1')).toBeInTheDocument();
  });
});
