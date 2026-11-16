import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AdminAccountGrowthChart from '../../src/features/admin/components/AdminAccountGrowthChart.jsx';
import adminApi from '../../src/features/admin/services/adminApi.js';

vi.mock('../../src/features/admin/services/adminApi.js', () => ({
  default: {
    getAccountGrowth: vi.fn(),
    getAccountGrowthTotal: vi.fn(),
  },
}));

const periodSelect = () => screen.getByRole('combobox', { name: 'Khoảng thời gian tăng trưởng' });

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
    // Mặc định: chưa có số liệu kỳ trước (các test so sánh % tự đặt lại khi cần)
    adminApi.getAccountGrowthTotal.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads the last 30 days by default, renders SVG points, and shows a point tooltip', async () => {
    render(<AdminAccountGrowthChart />);

    const thirdPoint = await screen.findByRole('button', { name: /2026-11-10: 7 tài khoản/ });
    expect(adminApi.getAccountGrowth).toHaveBeenCalledWith({
      from: '2026-10-13',
      to: '2026-11-11',
      granularity: 'day',
      role: undefined,
    });
    expect(periodSelect()).toHaveValue('LAST30');

    fireEvent.mouseEnter(thirdPoint);
    expect(screen.getByText(/2026-11-10 \(2026-11-10 → 2026-11-10\): 7 đăng ký/)).toBeInTheDocument();
  });

  it('no longer prints the "Ghi nhận ... tài khoản mới" line or the day/week/month buttons', async () => {
    render(<AdminAccountGrowthChart />);
    await screen.findByRole('button', { name: /2026-11-10: 7 tài khoản/ });

    expect(screen.queryByText(/tài khoản mới từ/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ngày' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tuần' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tháng' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '12 tháng' })).not.toBeInTheDocument();
  });

  it('puts the period filter and role filter together, without "Toàn thời gian"', async () => {
    render(<AdminAccountGrowthChart />);
    await screen.findByRole('button', { name: /2026-11-10: 7 tài khoản/ });

    const options = within(periodSelect()).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual([
      'Hôm nay',
      'Tuần này',
      'Tháng này',
      '30 ngày gần nhất',
      'Năm nay',
      'Một ngày',
      'Một tuần',
      'Một tháng',
      'Một năm',
      'Từ ngày - đến ngày',
    ]);
    expect(screen.getByLabelText('Lọc vai trò tăng trưởng')).toBeInTheDocument();
  });

  it('filters by role and by quick period, choosing the granularity from the range length', async () => {
    render(<AdminAccountGrowthChart />);
    await screen.findByRole('button', { name: /2026-11-10: 7 tài khoản/ });

    fireEvent.change(screen.getByLabelText('Lọc vai trò tăng trưởng'), {
      target: { value: 'MEMBER' },
    });
    await waitFor(() =>
      expect(adminApi.getAccountGrowth).toHaveBeenLastCalledWith({
        from: '2026-10-13',
        to: '2026-11-11',
        granularity: 'day',
        role: 'MEMBER',
      })
    );

    // Năm nay (01/01 - 11/11) -> gom theo tháng
    fireEvent.change(periodSelect(), { target: { value: 'YEAR' } });
    await waitFor(() =>
      expect(adminApi.getAccountGrowth).toHaveBeenLastCalledWith({
        from: '2026-01-01',
        to: '2026-11-11',
        granularity: 'month',
        role: 'MEMBER',
      })
    );
  });

  it('can pick one day, one week, one month or one year', async () => {
    render(<AdminAccountGrowthChart />);
    await screen.findByRole('button', { name: /2026-11-10: 7 tài khoản/ });

    fireEvent.change(periodSelect(), { target: { value: 'DAY' } });
    fireEvent.change(screen.getByLabelText('Chọn ngày tăng trưởng'), { target: { value: '2026-10-20' } });
    await waitFor(() =>
      expect(adminApi.getAccountGrowth).toHaveBeenLastCalledWith({
        from: '2026-10-20',
        to: '2026-10-20',
        granularity: 'day',
        role: undefined,
      })
    );

    fireEvent.change(periodSelect(), { target: { value: 'WEEK_PICK' } });
    fireEvent.change(screen.getByLabelText('Chọn tuần tăng trưởng'), { target: { value: '2026-W43' } });
    await waitFor(() =>
      expect(adminApi.getAccountGrowth).toHaveBeenLastCalledWith({
        from: '2026-10-19',
        to: '2026-10-25',
        granularity: 'day',
        role: undefined,
      })
    );

    fireEvent.change(periodSelect(), { target: { value: 'MONTH_PICK' } });
    fireEvent.change(screen.getByLabelText('Chọn tháng tăng trưởng'), { target: { value: '2026-09' } });
    await waitFor(() =>
      expect(adminApi.getAccountGrowth).toHaveBeenLastCalledWith({
        from: '2026-09-01',
        to: '2026-09-30',
        granularity: 'day',
        role: undefined,
      })
    );

    fireEvent.change(periodSelect(), { target: { value: 'YEAR_PICK' } });
    fireEvent.change(screen.getByLabelText('Chọn năm tăng trưởng'), { target: { value: '2025' } });
    await waitFor(() =>
      expect(adminApi.getAccountGrowth).toHaveBeenLastCalledWith({
        from: '2025-01-01',
        to: '2025-12-31',
        granularity: 'month',
        role: undefined,
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
    await screen.findByRole('button', { name: /2026-11-10: 7 tài khoản/ });

    fireEvent.change(periodSelect(), { target: { value: 'CUSTOM' } });
    // Khoảng mặc định (01/11 - 11/11) khác "30 ngày gần nhất" nên gọi lại API một lần
    await waitFor(() => expect(adminApi.getAccountGrowth).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/vượt quá 366 kỳ dữ liệu/)).toBeInTheDocument();

    const callsBefore = adminApi.getAccountGrowth.mock.calls.length;
    fireEvent.change(screen.getByLabelText('Từ ngày tăng trưởng'), { target: { value: '2026-11-12' } });
    expect(await screen.findByText(/Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc/)).toBeInTheDocument();
    expect(adminApi.getAccountGrowth).toHaveBeenCalledTimes(callsBefore);
  });

  it('asks for a pick instead of querying when the day input is cleared', async () => {
    render(<AdminAccountGrowthChart />);
    await screen.findByRole('button', { name: /2026-11-10: 7 tài khoản/ });

    fireEvent.change(periodSelect(), { target: { value: 'DAY' } });
    await waitFor(() => expect(adminApi.getAccountGrowth).toHaveBeenCalledTimes(2));
    fireEvent.change(screen.getByLabelText('Chọn ngày tăng trưởng'), { target: { value: '' } });

    expect(await screen.findByText('Vui lòng chọn ngày.')).toBeInTheDocument();
    expect(adminApi.getAccountGrowth).toHaveBeenCalledTimes(2);
  });

  it('shows the total number of new accounts next to the period filter', async () => {
    render(<AdminAccountGrowthChart />);
    expect(await screen.findByText('14 tài khoản mới')).toBeInTheDocument();
  });

  describe('comparison with the previous period', () => {
    it('asks only for the total of the previous period, matching the filter and the role', async () => {
      adminApi.getAccountGrowthTotal.mockResolvedValue(10);
      render(<AdminAccountGrowthChart />);
      await screen.findByText('14 tài khoản mới');

      // "30 ngày gần nhất" (13/10 - 11/11) -> kỳ trước là đúng 30 ngày liền trước (13/09 - 12/10)
      expect(adminApi.getAccountGrowthTotal).toHaveBeenCalledWith({
        from: '2026-09-13',
        to: '2026-10-12',
        role: undefined,
      });
      // (14 - 10) / 10 = +40%
      expect(await screen.findByText('+40.0% so với 30 ngày trước đó')).toBeInTheDocument();
    });

    it('re-asks with the chosen role when the role filter changes', async () => {
      adminApi.getAccountGrowthTotal.mockResolvedValue(10);
      render(<AdminAccountGrowthChart />);
      await screen.findByText('14 tài khoản mới');

      fireEvent.change(screen.getByLabelText('Lọc vai trò tăng trưởng'), { target: { value: 'MEMBER' } });
      await waitFor(() =>
        expect(adminApi.getAccountGrowthTotal).toHaveBeenLastCalledWith({
          from: '2026-09-13',
          to: '2026-10-12',
          role: 'MEMBER',
        })
      );
    });

    it('shows "Mới" when there were no new accounts in the previous period', async () => {
      adminApi.getAccountGrowthTotal.mockResolvedValue(0);
      render(<AdminAccountGrowthChart />);
      await screen.findByText('14 tài khoản mới');

      expect(await screen.findByText('Mới so với 30 ngày trước đó')).toBeInTheDocument();
    });

    it('hides the total line and badge while the main data is still loading or errored', async () => {
      let resolveGrowth;
      adminApi.getAccountGrowth.mockReturnValue(new Promise((resolve) => { resolveGrowth = resolve; }));
      render(<AdminAccountGrowthChart />);

      expect(screen.queryByText(/tài khoản mới$/)).not.toBeInTheDocument();
      resolveGrowth(sampleGrowth);
      expect(await screen.findByText('14 tài khoản mới')).toBeInTheDocument();
    });
  });
});
