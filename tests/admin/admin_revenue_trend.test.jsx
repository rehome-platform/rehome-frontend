import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AdminRevenueTrendChart from '../../src/features/admin/components/AdminRevenueTrendChart.jsx';
import adminApi from '../../src/features/admin/services/adminApi.js';

vi.mock('../../src/features/admin/services/adminApi.js', () => ({
  default: {
    getRevenueTrend: vi.fn(),
    getRevenueTrendTotal: vi.fn(),
  },
}));

const trend = {
  granularity: 'day',
  from: '2026-11-09',
  to: '2026-11-11',
  total: 1250000,
  points: [
    { label: '2026-11-09', periodStart: '2026-11-09', periodEnd: '2026-11-09', amount: 0 },
    { label: '2026-11-10', periodStart: '2026-11-10', periodEnd: '2026-11-10', amount: 500000 },
    { label: '2026-11-11', periodStart: '2026-11-11', periodEnd: '2026-11-11', amount: 750000 },
  ],
};

const periodSelect = () => screen.getByRole('combobox', { name: 'Khoảng thời gian biểu đồ' });
const chartSvg = (container) =>
  container.querySelector('svg[aria-label="Biểu đồ doanh thu nền tảng theo thời gian"]');

describe('AdminRevenueTrendChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-11T12:00:00Z'));
    adminApi.getRevenueTrend.mockResolvedValue(trend);
    // Mặc định: chưa có số liệu kỳ trước (các test so sánh % tự đặt lại khi cần)
    adminApi.getRevenueTrendTotal.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('has its own filter, starts on this month, and shows one accessible column per period', async () => {
    render(<AdminRevenueTrendChart />);

    expect(await screen.findByText('Doanh thu nền tảng theo thời gian')).toBeInTheDocument();
    expect(periodSelect()).toHaveValue('MONTH');
    expect(await screen.findByRole('img', { name: /2026-11-10: 500\.000/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /2026-11-11: 750\.000/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /2026-11-09: 0/ })).toBeInTheDocument();
    expect(adminApi.getRevenueTrend).toHaveBeenCalledWith({
      from: '2026-11-01',
      to: '2026-11-11',
      granularity: 'day',
    });
  });

  it('no longer has the day/week/month buttons - the granularity follows the chosen range', async () => {
    render(<AdminRevenueTrendChart />);
    await screen.findByRole('img', { name: /2026-11-10: 500\.000/ });

    expect(screen.queryByRole('button', { name: 'Ngày' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tuần' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tháng' })).not.toBeInTheDocument();
  });

  it('filters by quick period and by an exact day, week, month, year or from-to range', async () => {
    render(<AdminRevenueTrendChart />);
    await screen.findByRole('img', { name: /2026-11-10: 500\.000/ });
    const lastCall = () => adminApi.getRevenueTrend.mock.calls.at(-1)[0];

    fireEvent.change(periodSelect(), { target: { value: 'YEAR' } });
    await waitFor(() => expect(lastCall()).toEqual({ from: '2026-01-01', to: '2026-11-11', granularity: 'month' }));

    fireEvent.change(periodSelect(), { target: { value: 'ALL' } });
    await waitFor(() => expect(lastCall()).toEqual({ from: undefined, to: undefined, granularity: 'month' }));

    fireEvent.change(periodSelect(), { target: { value: 'DAY' } });
    fireEvent.change(screen.getByLabelText('Chọn ngày biểu đồ'), { target: { value: '2026-10-20' } });
    await waitFor(() => expect(lastCall()).toEqual({ from: '2026-10-20', to: '2026-10-20', granularity: 'day' }));

    fireEvent.change(periodSelect(), { target: { value: 'WEEK_PICK' } });
    fireEvent.change(screen.getByLabelText('Chọn tuần biểu đồ'), { target: { value: '2026-W43' } });
    await waitFor(() => expect(lastCall()).toEqual({ from: '2026-10-19', to: '2026-10-25', granularity: 'day' }));

    fireEvent.change(periodSelect(), { target: { value: 'MONTH_PICK' } });
    fireEvent.change(screen.getByLabelText('Chọn tháng biểu đồ'), { target: { value: '2026-09' } });
    await waitFor(() => expect(lastCall()).toEqual({ from: '2026-09-01', to: '2026-09-30', granularity: 'day' }));

    fireEvent.change(periodSelect(), { target: { value: 'YEAR_PICK' } });
    fireEvent.change(screen.getByLabelText('Chọn năm biểu đồ'), { target: { value: '2025' } });
    await waitFor(() => expect(lastCall()).toEqual({ from: '2025-01-01', to: '2025-12-31', granularity: 'month' }));

    fireEvent.change(periodSelect(), { target: { value: 'CUSTOM' } });
    fireEvent.change(screen.getByLabelText('Từ ngày biểu đồ'), { target: { value: '2026-05-01' } });
    fireEvent.change(screen.getByLabelText('Đến ngày biểu đồ'), { target: { value: '2026-09-30' } });
    // 153 ngày -> gom theo tuần
    await waitFor(() => expect(lastCall()).toEqual({ from: '2026-05-01', to: '2026-09-30', granularity: 'week' }));
  });

  it('offers a year picker that ends at the current year', async () => {
    render(<AdminRevenueTrendChart />);
    await screen.findByRole('img', { name: /2026-11-10: 500\.000/ });

    fireEvent.change(periodSelect(), { target: { value: 'YEAR_PICK' } });
    const years = [...screen.getByLabelText('Chọn năm biểu đồ').querySelectorAll('option')].map((o) => o.value);
    expect(years).toEqual(['2026', '2025', '2024', '2023', '2022', '2021']);
  });

  it('shows the error and skips the API when the pick is missing or in the future', async () => {
    render(<AdminRevenueTrendChart />);
    await screen.findByRole('img', { name: /2026-11-10: 500\.000/ });
    const calls = adminApi.getRevenueTrend.mock.calls.length;

    fireEvent.change(periodSelect(), { target: { value: 'DAY' } });
    await waitFor(() => expect(adminApi.getRevenueTrend).toHaveBeenCalledTimes(calls + 1));
    fireEvent.change(screen.getByLabelText('Chọn ngày biểu đồ'), { target: { value: '' } });
    expect(await screen.findByText('Vui lòng chọn ngày.')).toBeInTheDocument();
    // Không còn vẽ biểu đồ cũ khi bộ lọc đang sai
    expect(screen.queryByRole('img', { name: /2026-11-10: 500\.000/ })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Chọn ngày biểu đồ'), { target: { value: '2026-11-20' } });
    expect(await screen.findByText('Không thể chọn thời gian ở tương lai.')).toBeInTheDocument();
    expect(adminApi.getRevenueTrend).toHaveBeenCalledTimes(calls + 1);
  });

  it('rejects a reversed from-to range without calling the API', async () => {
    render(<AdminRevenueTrendChart />);
    await screen.findByRole('img', { name: /2026-11-10: 500\.000/ });

    fireEvent.change(periodSelect(), { target: { value: 'CUSTOM' } });
    const calls = adminApi.getRevenueTrend.mock.calls.length;
    fireEvent.change(screen.getByLabelText('Từ ngày biểu đồ'), { target: { value: '2026-11-15' } });
    fireEvent.change(screen.getByLabelText('Đến ngày biểu đồ'), { target: { value: '2026-11-10' } });

    expect(await screen.findByText(/Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc/)).toBeInTheDocument();
    expect(adminApi.getRevenueTrend).toHaveBeenCalledTimes(calls);
  });

  it('explains the numbers up front: total, average per period, and the best period', async () => {
    render(<AdminRevenueTrendChart />);

    const total = (await screen.findByText('Tổng doanh thu')).parentElement;
    expect(total).toHaveTextContent(/1\.250\.000/);
    // 1.250.000 / 3 ngày = 416.667 đ
    const average = screen.getByText('Trung bình mỗi ngày').parentElement;
    expect(average).toHaveTextContent(/416\.667/);
    const best = screen.getByText(/Cao nhất \(ngày\)/).parentElement;
    expect(best).toHaveTextContent(/750\.000/);
    expect(best).toHaveTextContent('Ngày 11/11/2026');
  });

  it('labels the axis with short dates, writes amounts on the bars, and marks the best bar', async () => {
    const { container } = render(<AdminRevenueTrendChart />);

    await screen.findByRole('img', { name: /2026-11-10: 500\.000/ });
    const texts = [...chartSvg(container).querySelectorAll('text')].map((t) => t.textContent);
    // Nhãn trục hoành dạng dd/MM, không phải 2026-11-10
    expect(texts).toEqual(expect.arrayContaining(['09/11', '10/11', '11/11']));
    // Số tiền ghi trên đầu cột (chỉ cột có doanh thu)
    expect(texts).toEqual(expect.arrayContaining(['500k', '750k']));
    // Đỉnh 750.000 được làm tròn lên 1.000.000 nên trục chia 0 - 250k - 500k - 750k - 1 tr
    expect(texts).toEqual(expect.arrayContaining(['0', '250k', '500k', '750k', '1 tr']));
    // Cột cao nhất tô cam, các cột còn lại xanh; cột 0 đồng không vẽ
    const fills = [...chartSvg(container).querySelectorAll('rect.chart-bar')].map((r) => r.getAttribute('fill'));
    expect(fills).toEqual(['#006B2C', '#FEA619']);
  });

  it('shows a hint by default and the hovered period with its full name and amount', async () => {
    render(<AdminRevenueTrendChart />);

    const column = await screen.findByRole('img', { name: /2026-11-10: 500\.000/ });
    expect(screen.getByText(/Rê chuột \(hoặc nhấn Tab\) vào từng cột/)).toBeInTheDocument();
    fireEvent.mouseEnter(column);
    expect(screen.getByText(/Ngày 10\/11\/2026:/).parentElement).toHaveTextContent(/500\.000/);
    expect(screen.queryByText(/Rê chuột \(hoặc nhấn Tab\)/)).not.toBeInTheDocument();
    fireEvent.mouseLeave(column);
    expect(screen.queryByText(/Ngày 10\/11\/2026:/)).not.toBeInTheDocument();
    expect(screen.getByText(/Rê chuột \(hoặc nhấn Tab\)/)).toBeInTheDocument();
  });

  it('names a month and a week in full and uses mm/yyyy labels for months', async () => {
    adminApi.getRevenueTrend.mockResolvedValue({
      granularity: 'month',
      from: '2026-09-01',
      to: '2026-11-30',
      total: 17000,
      points: [
        { label: '2026-09', periodStart: '2026-09-01', periodEnd: '2026-09-30', amount: 8000 },
        { label: '2026-10', periodStart: '2026-10-01', periodEnd: '2026-10-31', amount: 0 },
        { label: '2026-11', periodStart: '2026-11-01', periodEnd: '2026-11-30', amount: 9000 },
      ],
    });
    const { container } = render(<AdminRevenueTrendChart />);

    const column = await screen.findByRole('img', { name: /2026-11: 9\.000/ });
    const texts = [...container.querySelectorAll('svg text')].map((t) => t.textContent);
    expect(texts).toEqual(expect.arrayContaining(['09/2026', '10/2026', '11/2026']));
    expect(screen.getByText(/Trung bình mỗi tháng/)).toBeInTheDocument();
    fireEvent.mouseEnter(column);
    expect(screen.getByText(/Tháng 11\/2026:/)).toBeInTheDocument();

    adminApi.getRevenueTrend.mockResolvedValue({
      granularity: 'week',
      from: '2026-05-01',
      to: '2026-09-30',
      total: 3000,
      points: [{ label: '2026-W45', periodStart: '2026-11-04', periodEnd: '2026-11-08', amount: 3000 }],
    });
    fireEvent.change(periodSelect(), { target: { value: 'LAST30' } });
    const week = await screen.findByRole('img', { name: /2026-W45: 3\.000/ });
    fireEvent.mouseEnter(week);
    expect(screen.getByText(/Tuần 04\/11\/2026 → 08\/11\/2026:/)).toBeInTheDocument();
  });

  it('only writes amounts on bars when there are few enough bars to stay readable', async () => {
    const points = Array.from({ length: 30 }, (_, i) => {
      const day = String(i + 1).padStart(2, '0');
      return { label: `2026-11-${day}`, periodStart: `2026-11-${day}`, periodEnd: `2026-11-${day}`, amount: 1000 * (i + 1) };
    });
    adminApi.getRevenueTrend.mockResolvedValue({ granularity: 'day', from: '2026-11-01', to: '2026-11-30', total: 465000, points });
    const { container } = render(<AdminRevenueTrendChart />);

    await screen.findByRole('img', { name: /2026-11-30: 30\.000/ });
    const svg = chartSvg(container);
    expect(svg.querySelectorAll('text.chart-fade-in')).toHaveLength(0);
    // Nhãn trục hoành thưa ra, không dồn 30 nhãn
    const xLabels = [...svg.querySelectorAll('text')].map((t) => t.textContent).filter((t) => /^\d\d\/\d\d$/.test(t));
    expect(xLabels.length).toBeGreaterThan(2);
    expect(xLabels.length).toBeLessThanOrEqual(9);
  });

  it('shows an empty state when the period has no platform revenue', async () => {
    adminApi.getRevenueTrend.mockResolvedValue({
      ...trend,
      total: 0,
      points: trend.points.map((p) => ({ ...p, amount: 0 })),
    });
    render(<AdminRevenueTrendChart />);

    expect(
      await screen.findByText('Chưa phát sinh doanh thu nền tảng trong khoảng thời gian đã chọn.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    // Bộ lọc vẫn còn để chọn lại
    expect(periodSelect()).toBeInTheDocument();
  });

  it('explains a too-long range and retries after a generic failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    adminApi.getRevenueTrend
      .mockRejectedValueOnce({ response: { data: { code: 'INVALID_DATE_RANGE' } } })
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(trend);
    render(<AdminRevenueTrendChart />);

    expect(await screen.findByText(/vượt quá 366 kỳ dữ liệu/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Không thể tải biểu đồ doanh thu nền tảng.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByRole('img', { name: /2026-11-10: 500\.000/ })).toBeInTheDocument();
  });

  it('ignores a slow response from an earlier range', async () => {
    let resolveFirst;
    adminApi.getRevenueTrend
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ ...trend, total: 999000, points: [{ ...trend.points[1], label: 'moi', amount: 999000 }] });
    render(<AdminRevenueTrendChart />);
    fireEvent.change(periodSelect(), { target: { value: 'LAST30' } });

    expect(await screen.findByRole('img', { name: /moi: 999\.000/ })).toBeInTheDocument();
    resolveFirst(trend);
    await Promise.resolve();
    expect(screen.queryByRole('img', { name: /2026-11-10: 500\.000/ })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /moi: 999\.000/ })).toBeInTheDocument();
  });

  describe('comparison with the previous period', () => {
    const totalTile = () => screen.getByText('Tổng doanh thu').parentElement;

    it('asks only for the total of the previous period (separate, lightweight call), matching the filter', async () => {
      adminApi.getRevenueTrendTotal.mockResolvedValue(1000000);
      render(<AdminRevenueTrendChart />);
      await screen.findByRole('img', { name: /2026-11-10: 500\.000/ });

      // "Tháng này" (01/11 - 11/11) -> kỳ trước là tháng 10, cùng số ngày (01/10 - 11/10)
      expect(adminApi.getRevenueTrendTotal).toHaveBeenCalledWith({ from: '2026-10-01', to: '2026-10-11' });
      expect(await within(totalTile()).findByText(/\+25\.0% so với tháng trước/)).toBeInTheDocument();
    });

    it('shows "Mới" when the previous period had no revenue at all', async () => {
      adminApi.getRevenueTrendTotal.mockResolvedValue(0);
      render(<AdminRevenueTrendChart />);
      await screen.findByRole('img', { name: /2026-11-10: 500\.000/ });

      expect(await within(totalTile()).findByText('Mới so với tháng trước')).toBeInTheDocument();
    });

    it('hides the badge entirely on "Toàn thời gian" and stops calling the previous-total API', async () => {
      render(<AdminRevenueTrendChart />);
      await screen.findByRole('img', { name: /2026-11-10: 500\.000/ });
      // Mặc định là "Tháng này" nên đã gọi 1 lần lúc mở trang; "Toàn thời gian" không được gọi thêm
      const callsOnMonth = adminApi.getRevenueTrendTotal.mock.calls.length;
      expect(callsOnMonth).toBeGreaterThan(0);

      fireEvent.change(periodSelect(), { target: { value: 'ALL' } });
      await screen.findByRole('img', { name: /2026-11-10: 500\.000/ });
      expect(within(totalTile()).queryByText(/so với/)).not.toBeInTheDocument();
      expect(adminApi.getRevenueTrendTotal).toHaveBeenCalledTimes(callsOnMonth);
    });

    it('re-asks for the previous total whenever the filter changes to a different period', async () => {
      adminApi.getRevenueTrendTotal.mockResolvedValue(500000);
      render(<AdminRevenueTrendChart />);
      await screen.findByRole('img', { name: /2026-11-10: 500\.000/ });

      fireEvent.change(periodSelect(), { target: { value: 'YEAR' } });
      // "Năm nay" (01/01 - 11/11) -> kỳ trước là năm 2025, cùng tháng-ngày (01/01/2025 - 11/11/2025)
      await waitFor(() =>
        expect(adminApi.getRevenueTrendTotal).toHaveBeenLastCalledWith({ from: '2025-01-01', to: '2025-11-11' })
      );
    });

    it('does not fetch a previous total again while the error banner from an invalid pick is shown', async () => {
      render(<AdminRevenueTrendChart />);
      await screen.findByRole('img', { name: /2026-11-10: 500\.000/ });

      fireEvent.change(periodSelect(), { target: { value: 'DAY' } });
      await waitFor(() => expect(adminApi.getRevenueTrendTotal).toHaveBeenCalled());
      const calls = adminApi.getRevenueTrendTotal.mock.calls.length;

      fireEvent.change(screen.getByLabelText('Chọn ngày biểu đồ'), { target: { value: '' } });
      await screen.findByText('Vui lòng chọn ngày.');
      expect(adminApi.getRevenueTrendTotal).toHaveBeenCalledTimes(calls);
    });
  });
});
