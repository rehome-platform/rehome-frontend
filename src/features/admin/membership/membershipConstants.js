export const TIER_ORDER = ['FREE', 'SILVER', 'GOLD', 'DIAMOND'];

export const PAID_TIERS = ['SILVER', 'GOLD', 'DIAMOND'];

export const TIER_LABELS = {
  FREE: 'Thành viên thường',
  SILVER: 'Thành viên Bạc',
  GOLD: 'Thành viên Vàng',
  DIAMOND: 'Thành viên Kim cương',
};

export const SUBSCRIPTION_STATUS_LABELS = {
  ACTIVE: 'Đang hoạt động',
  EXPIRED: 'Đã hết hạn',
  CANCELLED: 'Đã hủy',
  PENDING_PAYMENT: 'Chờ thanh toán',
};

export const PAYMENT_METHOD_LABELS = {
  WALLET: 'Ví ReHome',
  MOMO: 'MoMo',
  VNPAY: 'VNPay',
  ADMIN_GRANT: 'Admin tặng',
};

export const VOUCHER_TYPE_LABELS = {
  SHIPPING: 'Miễn phí vận chuyển',
  ORDER_DISCOUNT: 'Giảm giá đơn hàng',
};

/**
 * Format membership quota values, treating null/undefined as unlimited while preserving 0.
 */
export function formatQuotaValue(val) {
  if (val === null || val === undefined) {
    return 'Không giới hạn';
  }
  return String(val);
}

