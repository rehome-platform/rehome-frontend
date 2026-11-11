import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminAccountGrowthChart from '../../src/features/admin/components/AdminAccountGrowthChart.jsx';
import adminApi from '../../src/features/admin/services/adminApi.js';

vi.mock('../../src/features/admin/services/adminApi.js', () => ({
  default: {
    getAccountGrowth: vi.fn(),
  },
}));

describe('AdminAccountGrowthChart', () => {
  const sampleGrowth = {
    granularity: 'day',
    from: '2026-10-13',
    to: '2026-11-11',
    total: 14,
    points: [
      { label: '2026-10-13', periodStart: '2026-10-13', periodEnd: '2026-10-13', count: 2 },
      { label: '2026-10-14', periodStart: '2026-10-14', periodEnd: '2026-10-14', count: 0 },
      { label: '2026-11-10', periodStart: '2026-11-10', periodEnd: '2026-11-10', count: 7 },
      { label: '2026-11-11', periodStart: '2026-11-11', periodEnd: '2026-11-11', count: 5 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-11T12:00:00Z'));
    adminApi.getAccountGrowth.mockResolvedValue(sampleGrowth);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads default 30-day growth series, renders dynamic SVG points, and shows interactive point tooltip', async () => {
    render(<AdminAccountGrowthChart />);

    expect(await screen.findByText(/14 tài khoản mới/)).toBeInTheDocument();
    expect(adminApi.getAccountGrowth).toHaveBeenCalledWith({
      from: '2026-10-13',
      to: '2026-11-11',
      granularity: 'day',
      role: undefined,
    });

    const thirdPoint = screen.getByRole('button', { name: /2026-11-10: 7 tài khoản/ });
    fireEvent.mouseEnter(thirdPoint);
    expect(screen.getByText(/2026-11-10 \(2026-11-10 → 2026-11-10\): 7 đăng ký/)).toBeInTheDocument();
  });

  it('switches granularity, role filter, and 12-month preset', async () => {
    render(<AdminAccountGrowthChart />);
    await screen.findByText(/14 tài khoản mới/);

    fireEvent.click(screen.getByRole('button', { name: 'Tuần' }));
    await waitFor(() =>
      expect(adminApi.getAccountGrowth).toHaveBeenLastCalledWith({
        from: '2026-10-13',
        to: '2026-11-11',
        granularity: 'week',
        role: undefined,
      })
    );

    fireEvent.change(screen.getByLabelText('Lọc vai trò tăng trưởng'), {
      target: { value: 'MEMBER' },
    });
    await waitFor(() =>
      expect(adminApi.getAccountGrowth).toHaveBeenLastCalledWith({
        from: '2026-10-13',
        to: '2026-11-11',
        granularity: 'week',
        role: 'MEMBER',
      })
    );

    fireEvent.click(screen.getByRole('button', { name: '12 tháng' }));
    await waitFor(() =>
      expect(adminApi.getAccountGrowth).toHaveBeenLastCalledWith({
        from: '2025-12-01',
        to: '2026-11-11',
        granularity: 'month',
        role: 'MEMBER',
      })
    );
  });

  it('validates custom from > to locally and handles backend INVALID_DATE_RANGE errors', async () => {
    adminApi.getAccountGrowth
      .mockResolvedValueOnce(sampleGrowth)
      .mockRejectedValueOnce({
        response: { data: { code: 'INVALID_DATE_RANGE', message: 'Khoảng thời gian vượt quá 366 kỳ' } },
      });

    render(<AdminAccountGrowthChart />);
    await screen.findByText(/14 tài khoản mới/);

    const fromInput = screen.getByLabelText('Từ ngày tăng trưởng');
    const toInput = screen.getByLabelText('Đến ngày tăng trưởng');

    fireEvent.change(fromInput, { target: { value: '2026-11-12' } });
    expect(await screen.findByText(/Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc/)).toBeInTheDocument();
    expect(adminApi.getAccountGrowth).toHaveBeenCalledTimes(1);

    fireEvent.change(fromInput, { target: { value: '2024-01-01' } });
    fireEvent.change(toInput, { target: { value: '2026-11-11' } });
    expect(await screen.findByText(/chuyển sang chế độ Tuần hoặc Tháng/i)).toBeInTheDocument();
  });
});
