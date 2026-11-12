import { describe, it, expect, vi, beforeEach } from 'vitest';
import { API_ENDPOINTS } from '../../src/configs/api.config.js';
import baseApi from '../../src/services/baseApi.js';
import { adminApi } from '../../src/features/admin/services/adminApi.js';
import {
  getVietnamToday,
  getPeriodDateRange,
  getDefaultGrowthRange,
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
});

describe('adminApi new report endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    baseApi.get.mockResolvedValue({ data: { result: {}, isSuccess: true } });
  });

  it('defines ADMIN endpoints for revenue items, fund ledger, reconciliation, and account growth', () => {
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

