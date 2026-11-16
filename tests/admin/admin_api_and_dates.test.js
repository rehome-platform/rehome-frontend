import { describe, it, expect, vi, beforeEach } from 'vitest';
import { API_ENDPOINTS } from '../../src/configs/api.config.js';
import baseApi from '../../src/services/baseApi.js';
import { adminApi } from '../../src/features/admin/services/adminApi.js';
import {
  getVietnamToday,
  getPeriodDateRange,
  getDefaultGrowthRange,
  getIsoWeekRange,
  getMonthRange,
  getPreviousPeriodLabel,
  getPreviousPeriodRange,
  getVietnamIsoWeek,
  getYearRange,
  pickTrendGranularity,
  resolvePeriodRange,
  validateDateRange,
} from '../../src/features/admin/utils/adminDateUtils.js';

vi.mock('../../src/services/baseApi.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('adminDateUtils', () => {
  it('computes VN calendar dates across UTC midnight boundaries', () => {
    expect(getVietnamToday(new Date('2026-11-01T16:59:59Z'))).toBe('2026-11-01');
    expect(getVietnamToday(new Date('2026-11-01T17:00:00Z'))).toBe('2026-11-02');
  });

  it('returns api and export date ranges for TODAY, WEEK, MONTH, and ALL', () => {
    const nov1Evening = new Date('2026-11-01T16:59:59Z'); // Sun 2026-11-01 VN
    const nov2Morning = new Date('2026-11-01T17:00:00Z'); // Mon 2026-11-02 VN

    expect(getPeriodDateRange('TODAY', nov2Morning)).toEqual({
      apiFrom: '2026-11-02',
      apiTo: '2026-11-02',
      exportFrom: '2026-11-02',
      exportTo: '2026-11-02',
    });

    expect(getPeriodDateRange('WEEK', nov1Evening)).toEqual({
      apiFrom: '2026-10-26',
      apiTo: '2026-11-01',
      exportFrom: '2026-10-26',
      exportTo: '2026-11-01',
    });

    expect(getPeriodDateRange('MONTH', nov2Morning)).toEqual({
      apiFrom: '2026-11-01',
      apiTo: '2026-11-02',
      exportFrom: '2026-11-01',
      exportTo: '2026-11-02',
    });

    expect(getPeriodDateRange('ALL', nov2Morning)).toEqual({
      apiFrom: undefined,
      apiTo: undefined,
      exportFrom: '1970-01-01',
      exportTo: '2026-11-02',
    });
  });

  it('computes default N-day growth range ending today in VN time', () => {
    expect(getDefaultGrowthRange(30, new Date('2026-11-11T12:00:00Z'))).toEqual({
      from: '2026-10-13',
      to: '2026-11-11',
    });
  });

  it('validates custom date ranges', () => {
    expect(validateDateRange('2026-11-12', '2026-11-10')).toBeTruthy();
    expect(validateDateRange('2026-11-10', '2026-11-10')).toBeNull();
    expect(validateDateRange('2026-11-01', '2026-11-12')).toBeNull();
    expect(validateDateRange('', '')).toBeNull();
  });

  it('picks a chart granularity that keeps the bar count small', () => {
    const now = new Date('2026-11-11T12:00:00Z');
    // hôm nay / tuần / tháng / đúng 92 ngày (12/08 -> 11/11, tính cả hai đầu) -> theo ngày
    expect(pickTrendGranularity('2026-11-11', '2026-11-11', now)).toBe('day');
    expect(pickTrendGranularity('2026-11-02', '2026-11-11', now)).toBe('day');
    expect(pickTrendGranularity('2026-08-12', '2026-11-11', now)).toBe('day');
    // 93 - 183 ngày -> theo tuần
    expect(pickTrendGranularity('2026-08-11', '2026-11-11', now)).toBe('week');
    expect(pickTrendGranularity('2026-05-13', '2026-11-11', now)).toBe('week'); // đúng 183 ngày
    expect(pickTrendGranularity('2026-05-12', '2026-11-11', now)).toBe('month'); // 184 ngày
    // cả một năm trở lên hoặc toàn thời gian (không có from) -> theo tháng
    expect(pickTrendGranularity('2026-01-01', '2026-11-11', now)).toBe('month');
    expect(pickTrendGranularity('2025-01-01', '2025-12-31', now)).toBe('month');
    expect(pickTrendGranularity('2020-01-01', '2026-11-11', now)).toBe('month');
    expect(pickTrendGranularity(undefined, undefined, now)).toBe('month');
    // thiếu to -> tính tới hôm nay (giờ VN)
    expect(pickTrendGranularity('2026-11-01', undefined, now)).toBe('day');
  });

  it('adds the YEAR (Jan 1 to today) and LAST30 (30 days incl. today) quick periods', () => {
    const now = new Date('2026-11-11T12:00:00Z');
    expect(getPeriodDateRange('YEAR', now)).toEqual({
      apiFrom: '2026-01-01',
      apiTo: '2026-11-11',
      exportFrom: '2026-01-01',
      exportTo: '2026-11-11',
    });
    expect(getPeriodDateRange('LAST30', now)).toEqual({
      apiFrom: '2026-10-13',
      apiTo: '2026-11-11',
      exportFrom: '2026-10-13',
      exportTo: '2026-11-11',
    });
  });

  it('turns an ISO week, month and year into inclusive date ranges', () => {
    // Tuần ISO bắt đầu thứ Hai; 2026-W46 = 09/11 - 15/11
    expect(getIsoWeekRange('2026-W46')).toEqual({ from: '2026-11-09', to: '2026-11-15' });
    // Tuần 1 của 2026 bắt đầu thứ Hai 29/12/2025 (tuần chứa ngày 04/01)
    expect(getIsoWeekRange('2026-W01')).toEqual({ from: '2025-12-29', to: '2026-01-04' });
    expect(getIsoWeekRange('2026-W54')).toBeNull();
    expect(getIsoWeekRange('2026-46')).toBeNull();
    expect(getIsoWeekRange('')).toBeNull();

    expect(getMonthRange('2026-11')).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(getMonthRange('2024-02')).toEqual({ from: '2024-02-01', to: '2024-02-29' }); // năm nhuận
    expect(getMonthRange('2026-13')).toBeNull();

    expect(getYearRange('2025')).toEqual({ from: '2025-01-01', to: '2025-12-31' });
    expect(getYearRange('25')).toBeNull();
  });

  it('computes the current ISO week in Vietnam time', () => {
    expect(getVietnamIsoWeek(new Date('2026-11-11T12:00:00Z'))).toBe('2026-W46');
    // 31/12/2026 (thứ Năm) vẫn thuộc tuần 53 của 2026
    expect(getVietnamIsoWeek(new Date('2026-12-31T05:00:00Z'))).toBe('2026-W53');
    // 03/01/2027 là Chủ nhật, vẫn thuộc tuần 53 của 2026
    expect(getVietnamIsoWeek(new Date('2027-01-03T05:00:00Z'))).toBe('2026-W53');
    // 16:59Z ngày 01/11 còn là Chủ nhật 01/11 giờ VN; 17:00Z đã sang thứ Hai 02/11 -> tuần mới
    expect(getVietnamIsoWeek(new Date('2026-11-01T16:59:59Z'))).toBe('2026-W44');
    expect(getVietnamIsoWeek(new Date('2026-11-01T17:00:00Z'))).toBe('2026-W45');
  });

  describe('resolvePeriodRange', () => {
    const now = new Date('2026-11-11T12:00:00Z'); // thứ Tư 11/11/2026 (VN)
    const base = {
      period: 'MONTH',
      customFrom: '2026-11-01',
      customTo: '2026-11-11',
      pickedDay: '2026-11-11',
      pickedWeek: '2026-W46',
      pickedMonth: '2026-11',
      pickedYear: '2026',
    };
    const resolve = (over) => resolvePeriodRange({ ...base, ...over }, now);

    it('keeps the quick periods unchanged', () => {
      expect(resolve({ period: 'MONTH' })).toEqual({
        error: null,
        range: getPeriodDateRange('MONTH', now),
      });
      expect(resolve({ period: 'ALL' }).range.apiFrom).toBeUndefined();
    });

    it('uses one exact day', () => {
      expect(resolve({ period: 'DAY', pickedDay: '2026-10-05' })).toEqual({
        error: null,
        range: { apiFrom: '2026-10-05', apiTo: '2026-10-05', exportFrom: '2026-10-05', exportTo: '2026-10-05' },
      });
      expect(resolve({ period: 'DAY', pickedDay: '' }).error).toBe('Vui lòng chọn ngày.');
    });

    it('uses a full past week, month, year and clips the running one at today', () => {
      expect(resolve({ period: 'WEEK_PICK', pickedWeek: '2026-W44' }).range).toMatchObject({
        apiFrom: '2026-10-26',
        apiTo: '2026-11-01',
      });
      // Tuần hiện tại 09/11 - 15/11 bị cắt tại hôm nay 11/11
      expect(resolve({ period: 'WEEK_PICK', pickedWeek: '2026-W46' }).range).toMatchObject({
        apiFrom: '2026-11-09',
        apiTo: '2026-11-11',
      });
      expect(resolve({ period: 'MONTH_PICK', pickedMonth: '2026-10' }).range).toMatchObject({
        apiFrom: '2026-10-01',
        apiTo: '2026-10-31',
      });
      expect(resolve({ period: 'MONTH_PICK', pickedMonth: '2026-11' }).range).toMatchObject({
        apiFrom: '2026-11-01',
        apiTo: '2026-11-11',
      });
      expect(resolve({ period: 'YEAR_PICK', pickedYear: '2025' }).range).toMatchObject({
        apiFrom: '2025-01-01',
        apiTo: '2025-12-31',
        exportFrom: '2025-01-01',
        exportTo: '2025-12-31',
      });
      expect(resolve({ period: 'YEAR_PICK', pickedYear: '2026' }).range).toMatchObject({
        apiFrom: '2026-01-01',
        apiTo: '2026-11-11',
      });
    });

    it('rejects a missing pick and a pick that has not started yet', () => {
      expect(resolve({ period: 'WEEK_PICK', pickedWeek: '' }).error).toBe('Vui lòng chọn tuần.');
      expect(resolve({ period: 'MONTH_PICK', pickedMonth: '' }).error).toBe('Vui lòng chọn tháng.');
      expect(resolve({ period: 'YEAR_PICK', pickedYear: '' }).error).toBe('Vui lòng chọn năm.');
      expect(resolve({ period: 'DAY', pickedDay: '2026-11-12' }).error).toBe('Không thể chọn thời gian ở tương lai.');
      expect(resolve({ period: 'MONTH_PICK', pickedMonth: '2026-12' }).error).toBe('Không thể chọn thời gian ở tương lai.');
      expect(resolve({ period: 'YEAR_PICK', pickedYear: '2027' }).error).toBe('Không thể chọn thời gian ở tương lai.');
      // Có lỗi thì không có khoảng để gọi API
      expect(resolve({ period: 'DAY', pickedDay: '2026-11-12' }).range.apiFrom).toBeUndefined();
    });

    it('validates a custom from-to range like before', () => {
      expect(resolve({ period: 'CUSTOM', customFrom: '2026-11-15', customTo: '2026-11-10' }).error).toMatch(
        /Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc/
      );
      expect(resolve({ period: 'CUSTOM' })).toEqual({
        error: null,
        range: { apiFrom: '2026-11-01', apiTo: '2026-11-11', exportFrom: '2026-11-01', exportTo: '2026-11-11' },
      });
    });
  });

  describe('getPreviousPeriodLabel', () => {
    it('names the previous period for every filter choice, and has none for "Toàn thời gian"', () => {
      expect(getPreviousPeriodLabel('TODAY')).toBe('hôm qua');
      expect(getPreviousPeriodLabel('DAY')).toBe('ngày liền trước');
      expect(getPreviousPeriodLabel('WEEK')).toBe('tuần trước');
      expect(getPreviousPeriodLabel('WEEK_PICK')).toBe('tuần liền trước');
      expect(getPreviousPeriodLabel('MONTH')).toBe('tháng trước');
      expect(getPreviousPeriodLabel('MONTH_PICK')).toBe('tháng liền trước');
      expect(getPreviousPeriodLabel('YEAR')).toBe('năm trước');
      expect(getPreviousPeriodLabel('YEAR_PICK')).toBe('năm liền trước');
      expect(getPreviousPeriodLabel('LAST30')).toBe('30 ngày trước đó');
      expect(getPreviousPeriodLabel('CUSTOM')).toBe('kỳ liền trước');
      expect(getPreviousPeriodLabel('ALL')).toBeNull();
      expect(getPreviousPeriodLabel('UNKNOWN')).toBeNull();
    });
  });

  describe('getPreviousPeriodRange', () => {
    // 2026-11-11 là thứ Tư (VN)
    const now = new Date('2026-11-11T12:00:00Z');
    const base = {
      period: 'MONTH',
      customFrom: '2026-05-01',
      customTo: '2026-05-10',
      pickedDay: '2026-09-15',
      pickedWeek: '2026-W44',
      pickedMonth: '2026-11',
      pickedYear: '2024',
    };
    const previous = (over) => getPreviousPeriodRange({ ...base, ...over }, now);

    it('has no previous period for "Toàn thời gian"', () => {
      expect(previous({ period: 'ALL' })).toBeNull();
    });

    it('has no previous period when the filter itself is invalid or incomplete', () => {
      expect(previous({ period: 'DAY', pickedDay: '' })).toBeNull();
      expect(previous({ period: 'CUSTOM', customFrom: '2026-11-15', customTo: '2026-11-10' })).toBeNull();
    });

    it('uses yesterday for "Hôm nay" and the day before the picked day for "Một ngày"', () => {
      expect(previous({ period: 'TODAY' })).toEqual({ apiFrom: '2026-11-10', apiTo: '2026-11-10' });
      expect(previous({ period: 'DAY', pickedDay: '2026-09-15' })).toEqual({
        apiFrom: '2026-09-14',
        apiTo: '2026-09-14',
      });
    });

    it('shifts a week back by exactly 7 days, so a running week compares the same weekdays', () => {
      // "Tuần này" mới chạy tới thứ Tư (09/11 - 11/11, 3 ngày) -> tuần trước cũng đúng 3 ngày (02/11 - 04/11)
      expect(previous({ period: 'WEEK' })).toEqual({ apiFrom: '2026-11-02', apiTo: '2026-11-04' });
      // Một tuần trọn đã chọn (W44 = 26/10 - 01/11) -> tuần liền trước là W43 (19/10 - 25/10)
      expect(previous({ period: 'WEEK_PICK', pickedWeek: '2026-W44' })).toEqual({
        apiFrom: '2026-10-19',
        apiTo: '2026-10-25',
      });
    });

    it('keeps the same day-of-month for the previous month, clipped to that month\'s length', () => {
      // "Tháng này" mới tới ngày 11 -> tháng trước cũng chỉ lấy đến ngày 11
      expect(previous({ period: 'MONTH' })).toEqual({ apiFrom: '2026-10-01', apiTo: '2026-10-11' });
      // Một tháng trọn đã chọn, tháng 01 -> tháng 12 năm trước (lùi qua năm)
      expect(previous({ period: 'MONTH_PICK', pickedMonth: '2026-01' })).toEqual({
        apiFrom: '2025-12-01',
        apiTo: '2025-12-31',
      });
      // Tháng 03 (31 ngày) -> tháng 02/2026 chỉ có 28 ngày (không nhuận) nên bị cắt còn 28
      expect(previous({ period: 'MONTH_PICK', pickedMonth: '2026-03' })).toEqual({
        apiFrom: '2026-02-01',
        apiTo: '2026-02-28',
      });
    });

    it('keeps the same month-day for the previous year, clipping 29/02 when that year is not a leap year', () => {
      // "Năm nay" mới tới 11/11 -> năm trước cũng chỉ lấy đến 11/11
      expect(previous({ period: 'YEAR' })).toEqual({ apiFrom: '2025-01-01', apiTo: '2025-11-11' });
      // Một năm trọn đã chọn (2024) -> năm liền trước 2023, trọn năm
      expect(previous({ period: 'YEAR_PICK', pickedYear: '2024' })).toEqual({
        apiFrom: '2023-01-01',
        apiTo: '2023-12-31',
      });
      // 29/02 của một năm nhuận đang chạy -> năm trước không nhuận, cắt còn 28/02
      expect(getPreviousPeriodRange({ ...base, period: 'YEAR' }, new Date('2028-02-29T12:00:00Z'))).toEqual({
        apiFrom: '2027-01-01',
        apiTo: '2027-02-28',
      });
    });

    it('takes the same number of days immediately before when there is no calendar unit to align to', () => {
      // "30 ngày gần nhất" (13/10 - 11/11) -> đúng 30 ngày liền trước đó
      expect(previous({ period: 'LAST30' })).toEqual({ apiFrom: '2026-09-13', apiTo: '2026-10-12' });
      // Khoảng tuỳ chọn 10 ngày (01/05 - 10/05) -> đúng 10 ngày liền trước đó
      expect(previous({ period: 'CUSTOM', customFrom: '2026-05-01', customTo: '2026-05-10' })).toEqual({
        apiFrom: '2026-04-21',
        apiTo: '2026-04-30',
      });
    });
  });
});

describe('adminApi new report endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    baseApi.get.mockResolvedValue({ data: { result: {}, isSuccess: true } });
  });

  it('defines ADMIN endpoints for revenue items, revenue trend, fund ledger, reconciliation, and account growth', () => {
    expect(API_ENDPOINTS.ADMIN.REVENUE_TREND).toBe('/api/admin/dashboard/revenue-trend');
    expect(API_ENDPOINTS.ADMIN.REVENUE_ITEMS).toBe('/api/admin/revenue/items');
    expect(API_ENDPOINTS.ADMIN.FUND_LEDGER).toBe('/api/admin/fund/ledger');
    expect(API_ENDPOINTS.ADMIN.FUND_RECONCILIATION).toBe('/api/admin/fund/reconciliation');
    expect(API_ENDPOINTS.ADMIN.ACCOUNTS_GROWTH).toBe('/api/admin/accounts/growth');
  });

  it('passes optional from/to to getDashboard', async () => {
    await adminApi.getDashboard();
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/dashboard', { params: {} });

    await adminApi.getDashboard({ from: '2026-11-01', to: '2026-11-11' });
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/dashboard', {
      params: { from: '2026-11-01', to: '2026-11-11' },
    });
  });

  it('calls getRevenueTrend with granularity and optional dates', async () => {
    await adminApi.getRevenueTrend({ from: '2026-11-01', to: '2026-11-11', granularity: 'week' });
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/dashboard/revenue-trend', {
      params: { from: '2026-11-01', to: '2026-11-11', granularity: 'week' },
    });

    await adminApi.getRevenueTrend();
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/dashboard/revenue-trend', {
      params: { granularity: 'day' },
    });
  });

  it('calls getRevenueTrendTotal with a fixed granularity and returns just the total', async () => {
    baseApi.get.mockResolvedValue({ data: { result: { total: 450000, points: [] } } });
    const total = await adminApi.getRevenueTrendTotal({ from: '2026-10-01', to: '2026-10-11' });
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/dashboard/revenue-trend', {
      params: { from: '2026-10-01', to: '2026-10-11', granularity: 'month' },
    });
    expect(total).toBe(450000);

    baseApi.get.mockResolvedValue({ data: { result: {} } });
    expect(await adminApi.getRevenueTrendTotal()).toBe(0);
  });

  it('calls getAccountGrowthTotal with a fixed granularity, optional role, and returns just the total', async () => {
    baseApi.get.mockResolvedValue({ data: { result: { total: 9, points: [] } } });
    const total = await adminApi.getAccountGrowthTotal({ from: '2026-09-01', to: '2026-09-30', role: 'MEMBER' });
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/accounts/growth', {
      params: { from: '2026-09-01', to: '2026-09-30', granularity: 'month', role: 'MEMBER' },
    });
    expect(total).toBe(9);

    baseApi.get.mockResolvedValue({ data: { result: {} } });
    expect(await adminApi.getAccountGrowthTotal({ role: 'ALL' })).toBe(0);
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/accounts/growth', { params: { granularity: 'month' } });
  });

  it('calls getRevenueItems with optional filters and pagination', async () => {
    await adminApi.getRevenueItems({ from: '2026-11-01', to: '2026-11-11', term: 2, page: 1, size: 20 });
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/revenue/items', {
      params: { from: '2026-11-01', to: '2026-11-11', term: 2, page: 1, size: 20 },
    });

    await adminApi.getRevenueItems({ term: 'ALL' });
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/revenue/items', {
      params: { page: 0, size: 20 },
    });
  });

  it('calls getFundLedger and getFundReconciliation with expected params', async () => {
    await adminApi.getFundLedger({ from: '2026-11-01', to: '2026-11-11', type: 'ORDER_PAYOUT', page: 0, size: 10 });
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/fund/ledger', {
      params: { from: '2026-11-01', to: '2026-11-11', type: 'ORDER_PAYOUT', page: 0, size: 10 },
    });

    await adminApi.getFundLedger({ type: 'ALL' });
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/fund/ledger', {
      params: { page: 0, size: 20 },
    });

    await adminApi.getFundReconciliation();
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/fund/reconciliation');
  });

  it('calls getAccountGrowth with granularity, optional dates and role', async () => {
    await adminApi.getAccountGrowth({ from: '2026-10-13', to: '2026-11-11', granularity: 'week', role: 'MEMBER' });
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/accounts/growth', {
      params: { from: '2026-10-13', to: '2026-11-11', granularity: 'week', role: 'MEMBER' },
    });

    await adminApi.getAccountGrowth({ granularity: 'month', role: 'ALL' });
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/accounts/growth', {
      params: { granularity: 'month' },
    });
  });
});

