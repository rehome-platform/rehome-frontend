import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AdminRevenueReportView from '../../src/features/admin/components/AdminRevenueReportView.jsx';
import adminApi from '../../src/features/admin/services/adminApi.js';

vi.mock('../../src/features/admin/services/adminApi.js', () => ({
  default: {
    getRevenueItems: vi.fn(),
  },
}));

describe('AdminRevenueReportView', () => {
  const dashboardData = {
    term1SalesRevenue: 2000000,
    term1Commission: 200000,
    term2SalesRevenue: 1500000,
    term2Commission: 225000,
    term3SalesRevenue: 500000,
    term3Commission: 100000,
    totalSoldItemsCount: 4,
    netProfitMarginPercent: 13.13,
  };

  const pageOne = {
    content: [
      {
        orderItemId: 'oi-1',
        productId: 'PRD-001',
        productName: 'Ghế gỗ sồi',
        orderId: 'ord-1',
        orderNo: 'ORD-101',
        price: 1500000,
        termApplied: 2,
        commissionRate: 0.15,
        commissionAmount: 225000,
        completedAt: '2026-11-10T10:30:00Z',
      },
      {
        orderItemId: 'oi-2',
        productId: 'PRD-002',
        productName: 'Đèn bàn cổ điển',
        orderId: 'ord-2',
        orderNo: 'ORD-102',
        price: 500000,
        termApplied: null,
        commissionRate: 0.1,
        commissionAmount: 50000,
        completedAt: '2026-11-09T08:00:00Z',
      },
    ],
    page: 0,
    size: 20,
    totalElements: 25,
    totalPages: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.getRevenueItems.mockResolvedValue(pageOne);
  });

  it('renders term summary cards and sold items table with null term fallback', async () => {
    render(<AdminRevenueReportView from="2026-11-01" to="2026-11-11" dashboardData={dashboardData} />);

    expect(screen.getByText('Báo Cáo Doanh Thu Nền Tảng Theo Kỳ Kí Gửi')).toBeInTheDocument();
    expect(screen.getByText(/13\.13%|13,13%/)).toBeInTheDocument();
    expect(await screen.findByText('Ghế gỗ sồi')).toBeInTheDocument();
    const firstRow = screen.getByText('Ghế gỗ sồi').closest('tr');
    expect(within(firstRow).getByText('PRD-001')).toBeInTheDocument();
    expect(within(firstRow).getByText('ORD-101')).toBeInTheDocument();
    expect(within(firstRow).getByText('(15%)')).toBeInTheDocument();
    expect(screen.getByText('Đèn bàn cổ điển')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();

    expect(adminApi.getRevenueItems).toHaveBeenCalledWith({
      from: '2026-11-01',
      to: '2026-11-11',
      term: undefined,
      page: 0,
      size: 20,
    });
  });

  it('filters by term, paginates, resets page on date change, and handles API errors with retry', async () => {
    adminApi.getRevenueItems
      .mockResolvedValueOnce(pageOne)
      .mockResolvedValueOnce({
        ...pageOne,
        page: 1,
        content: [
          {
            orderItemId: 'oi-3',
            productId: 'PRD-003',
            productName: 'Bàn trà tròn',
            orderId: 'ord-3',
            orderNo: 'ORD-103',
            price: 800000,
            termApplied: 1,
            commissionRate: 0.1,
            commissionAmount: 80000,
            completedAt: '2026-11-08T12:00:00Z',
          },
        ],
      })
      .mockResolvedValueOnce({ ...pageOne, page: 0, totalElements: 1, totalPages: 1 })
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(pageOne);

    const { rerender } = render(
      <AdminRevenueReportView from="2026-11-01" to="2026-11-11" dashboardData={dashboardData} />
    );

    await screen.findByText('Ghế gỗ sồi');

    fireEvent.click(screen.getByRole('button', { name: 'Sau' }));
    expect(await screen.findByText('Bàn trà tròn')).toBeInTheDocument();
    expect(adminApi.getRevenueItems).toHaveBeenLastCalledWith({
      from: '2026-11-01',
      to: '2026-11-11',
      term: undefined,
      page: 1,
      size: 20,
    });

    fireEvent.change(screen.getByLabelText('Lọc theo kỳ ký gửi'), { target: { value: '2' } });
    await waitFor(() =>
      expect(adminApi.getRevenueItems).toHaveBeenLastCalledWith({
        from: '2026-11-01',
        to: '2026-11-11',
        term: 2,
        page: 0,
        size: 20,
      })
    );

    rerender(<AdminRevenueReportView from="2026-11-09" to="2026-11-11" dashboardData={dashboardData} />);
    expect(await screen.findByText(/Không thể tải danh sách món đã bán/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Ghế gỗ sồi')).toBeInTheDocument();
  });
});
