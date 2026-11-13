import { describe, it, expect, vi, beforeEach } from 'vitest';
import baseApi from '../../src/services/baseApi.js';
import membershipAdminApiDefault, {
  membershipAdminApi,
} from '../../src/features/admin/services/membershipAdminApi.js';
import {
  TIER_ORDER,
  PAID_TIERS,
  TIER_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  VOUCHER_TYPE_LABELS,
  formatQuotaValue,
} from '../../src/features/admin/membership/membershipConstants.js';

vi.mock('../../src/services/baseApi.js', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('membershipConstants', () => {
  it('exports expected tier order, paid tiers, and Vietnamese label maps', () => {
    expect(TIER_ORDER).toEqual(['FREE', 'SILVER', 'GOLD', 'DIAMOND']);
    expect(PAID_TIERS).toEqual(['SILVER', 'GOLD', 'DIAMOND']);

    expect(TIER_LABELS).toEqual({
      FREE: 'Thành viên thường',
      SILVER: 'Thành viên Bạc',
      GOLD: 'Thành viên Vàng',
      DIAMOND: 'Thành viên Kim cương',
    });

    expect(SUBSCRIPTION_STATUS_LABELS).toEqual({
      ACTIVE: 'Đang hoạt động',
      EXPIRED: 'Đã hết hạn',
      CANCELLED: 'Đã hủy',
      PENDING_PAYMENT: 'Chờ thanh toán',
    });

    expect(PAYMENT_METHOD_LABELS).toEqual({
      WALLET: 'Ví ReHome',
      MOMO: 'MoMo',
      VNPAY: 'VNPay',
      ADMIN_GRANT: 'Admin tặng',
    });

    expect(VOUCHER_TYPE_LABELS).toEqual({
      SHIPPING: 'Miễn phí vận chuyển',
      ORDER_DISCOUNT: 'Giảm giá đơn hàng',
    });
  });

  it('formatQuotaValue returns Không giới hạn only for null or undefined, and String(val) for 0 or numbers', () => {
    expect(formatQuotaValue(null)).toBe('Không giới hạn');
    expect(formatQuotaValue(undefined)).toBe('Không giới hạn');
    expect(formatQuotaValue(0)).toBe('0');
    expect(formatQuotaValue(5)).toBe('5');
    expect(formatQuotaValue(100)).toBe('100');
  });
});

describe('membershipAdminApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports both named and default membershipAdminApi', () => {
    expect(membershipAdminApi).toBeDefined();
    expect(membershipAdminApiDefault).toBe(membershipAdminApi);
  });

  it('unwraps Spring Boot ApiResponse result, data, or raw data', async () => {
    baseApi.get.mockResolvedValueOnce({ data: { result: [{ id: 1 }], isSuccess: true } });
    expect(await membershipAdminApi.getPlans()).toEqual([{ id: 1 }]);

    baseApi.get.mockResolvedValueOnce({ data: { data: { id: 2 } } });
    expect(await membershipAdminApi.getPlanById(2)).toEqual({ id: 2 });

    baseApi.get.mockResolvedValueOnce({ data: [{ id: 3 }] });
    expect(await membershipAdminApi.getVoucherTemplates()).toEqual([{ id: 3 }]);
  });

  it('calls plan endpoints correctly', async () => {
    baseApi.get.mockResolvedValue({ data: { result: [] } });
    baseApi.put.mockResolvedValue({ data: { result: { id: 1, price: 99000 } } });

    await membershipAdminApi.getPlans();
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/membership-plans');

    await membershipAdminApi.getPlanById(10);
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/membership-plans/10');

    const payload = { monthlyPrice: 99000, maxActiveListings: null };
    const updated = await membershipAdminApi.updatePlan(10, payload);
    expect(baseApi.put).toHaveBeenLastCalledWith('/api/admin/membership-plans/10', payload);
    expect(updated).toEqual({ id: 1, price: 99000 });
  });

  it('calls subscription endpoints and strips empty/undefined params in getSubscriptions', async () => {
    baseApi.get.mockResolvedValue({ data: { result: { content: [] } } });
    baseApi.post.mockResolvedValue({ data: { result: { id: 55 } } });

    await membershipAdminApi.getSubscriptions({
      tier: 'GOLD',
      status: '',
      search: undefined,
      accountId: null,
      page: 0,
      size: 20,
    });
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/membership-subscriptions', {
      params: { tier: 'GOLD', page: 0, size: 20 },
    });

    await membershipAdminApi.getSubscriptions();
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/membership-subscriptions', {
      params: {},
    });

    await membershipAdminApi.getSubscriptionById(55);
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/membership-subscriptions/55');

    const grantPayload = { accountId: 12, tier: 'DIAMOND', durationMonths: 3, note: 'VIP' };
    await membershipAdminApi.grantSubscription(grantPayload);
    expect(baseApi.post).toHaveBeenLastCalledWith(
      '/api/admin/membership-subscriptions/grant',
      grantPayload
    );

    await membershipAdminApi.cancelSubscription(55, 'Vi phạm chính sách');
    expect(baseApi.post).toHaveBeenLastCalledWith(
      '/api/admin/membership-subscriptions/55/cancel',
      { reason: 'Vi phạm chính sách' }
    );
  });

  it('calls voucher template endpoints correctly', async () => {
    baseApi.get.mockResolvedValue({ data: { result: [] } });
    baseApi.post.mockResolvedValue({ data: { result: { id: 7 } } });
    baseApi.put.mockResolvedValue({ data: { result: { id: 7 } } });

    await membershipAdminApi.getVoucherTemplates();
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/voucher-templates');

    const createPayload = { code: 'FREESHIP', type: 'SHIPPING' };
    await membershipAdminApi.createVoucherTemplate(createPayload);
    expect(baseApi.post).toHaveBeenLastCalledWith('/api/admin/voucher-templates', createPayload);

    const updatePayload = { title: 'Miễn phí ship tối đa 30k' };
    await membershipAdminApi.updateVoucherTemplate(7, updatePayload);
    expect(baseApi.put).toHaveBeenLastCalledWith('/api/admin/voucher-templates/7', updatePayload);

    await membershipAdminApi.deactivateVoucherTemplate(7);
    expect(baseApi.post).toHaveBeenLastCalledWith('/api/admin/voucher-templates/7/deactivate');
  });

  it('calls stats and payment endpoints with stripped params', async () => {
    baseApi.get.mockResolvedValue({ data: { result: {} } });

    await membershipAdminApi.getMembershipStats({ from: '2026-11-01', to: '' });
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/membership-stats', {
      params: { from: '2026-11-01' },
    });

    await membershipAdminApi.getMembershipStats();
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/membership-stats', {
      params: {},
    });

    await membershipAdminApi.getVoucherStats({ from: undefined, to: '2026-11-13' });
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/voucher-stats', {
      params: { to: '2026-11-13' },
    });

    await membershipAdminApi.getPayments({
      from: '2026-11-01',
      to: undefined,
      tier: 'SILVER',
      method: '',
      page: 0,
      size: 15,
    });
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/membership-payments', {
      params: { from: '2026-11-01', tier: 'SILVER', page: 0, size: 15 },
    });

    await membershipAdminApi.getPayments();
    expect(baseApi.get).toHaveBeenLastCalledWith('/api/admin/membership-payments', {
      params: {},
    });
  });
});

