import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminRevenueBreakdownCard from '../../src/features/admin/components/AdminRevenueBreakdownCard.jsx';

describe('AdminRevenueBreakdownCard', () => {
  const sampleData = {
    platformRevenue: 4540000,
    commissionRevenue: 4040000,
    withdrawalFeeRevenue: 500000,
    compensationExpense: 300000,
    term1SalesRevenue: 20000000,
    term1Commission: 2000000,
    term2SalesRevenue: 8000000,
    term2Commission: 1200000,
    term3SalesRevenue: 4200000,
    term3Commission: 840000,
    totalSoldItemsCount: 18,
    netProfitMarginPercent: 14.1,
  };

  it('renders revenue breakdown, term commissions, withdrawal fee, and separate compensation expense', () => {
    const onViewDetail = vi.fn();
    render(<AdminRevenueBreakdownCard dashboardData={sampleData} onViewDetail={onViewDetail} />);

    expect(screen.getByText('Cơ Cấu Doanh Thu Nền Tảng')).toBeInTheDocument();
    expect(screen.getByText(/4\.540\.000/)).toBeInTheDocument();
    expect(screen.getByText(/4\.040\.000/)).toBeInTheDocument();
    expect(screen.getAllByText(/500\.000/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/2\.000\.000/)).toBeInTheDocument();
    expect(screen.getByText(/1\.200\.000/)).toBeInTheDocument();
    expect(screen.getByText(/840\.000/)).toBeInTheDocument();
    expect(screen.getByText(/18 món đã bán/)).toBeInTheDocument();
    expect(screen.getByText(/14\.1%|14,1%/)).toBeInTheDocument();

    expect(screen.getByText(/Chi đền bù hàng xuống cấp/)).toBeInTheDocument();
    expect(screen.getByText(/không trừ vào doanh thu nền tảng/i)).toBeInTheDocument();
    expect(screen.getByText(/300\.000/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Xem chi tiết báo cáo/i }));
    expect(onViewDetail).toHaveBeenCalledTimes(1);
  });

  it('renders cleanly when all revenue and compensation values are zero', () => {
    render(
      <AdminRevenueBreakdownCard
        dashboardData={{
          platformRevenue: 0,
          commissionRevenue: 0,
          withdrawalFeeRevenue: 0,
          compensationExpense: 0,
          term1SalesRevenue: 0,
          term1Commission: 0,
          term2SalesRevenue: 0,
          term2Commission: 0,
          term3SalesRevenue: 0,
          term3Commission: 0,
          totalSoldItemsCount: 0,
          netProfitMarginPercent: 0,
        }}
        onViewDetail={vi.fn()}
      />
    );

    expect(screen.getByText('Cơ Cấu Doanh Thu Nền Tảng')).toBeInTheDocument();
    expect(screen.getByText(/0 món đã bán/)).toBeInTheDocument();
    expect(screen.getByText(/Chưa phát sinh doanh thu nền tảng trong khoảng thời gian này/)).toBeInTheDocument();
  });
});
