export const TIER_ORDER = ['FREE', 'SILVER', 'GOLD', 'DIAMOND'];

export const PAID_TIERS = ['SILVER', 'GOLD', 'DIAMOND'];

export const TIER_LABELS = {
  FREE: 'Thành viên thường',
  SILVER: 'Thành viên Bạc',
  GOLD: 'Thành viên Vàng',
  DIAMOND: 'Thành viên Kim cương',
};

// Tên ngắn gọn dùng trên badge màu của từng hạng
export const TIER_SHORT_LABELS = {
  FREE: 'Thường',
  SILVER: 'Bạc',
  GOLD: 'Vàng',
  DIAMOND: 'Kim cương',
};

// Màu & icon riêng cho từng hạng thành viên (Bạc, Vàng, Kim cương) để hiển thị đẹp, dễ phân biệt
export const TIER_BADGE_STYLES = {
  FREE: { classes: 'bg-[#F1F5F4] text-[#5B6776] border-[#E2E8E0]', icon: 'person' },
  SILVER: { classes: 'bg-gradient-to-r from-[#E6EAEE] to-[#CBD5E1] text-[#3F4A5A] border-[#AEB9C7]', icon: 'military_tech' },
  GOLD: { classes: 'bg-gradient-to-r from-[#FDE68A] to-[#F6C945] text-[#7A4A05] border-[#E3A712]', icon: 'workspace_premium' },
  DIAMOND: { classes: 'bg-gradient-to-r from-[#CFFAFE] to-[#A5E9F0] text-[#0E6477] border-[#67D7E8]', icon: 'diamond' },
};

// Màu đặc (dùng cho thanh biểu đồ, chấm trạng thái...) cùng tông với TIER_BADGE_STYLES ở trên
export const TIER_SOLID_COLOR_CLASS = {
  FREE: 'bg-[#9CA3AF]',
  SILVER: 'bg-[#94A3B8]',
  GOLD: 'bg-[#E3A712]',
  DIAMOND: 'bg-[#22B8CF]',
};

// Mã màu hex cùng tông, dùng cho biểu đồ SVG (AdminDonutChart...) vốn không nhận class Tailwind
export const TIER_HEX_COLOR = {
  FREE: '#9CA3AF',
  SILVER: '#94A3B8',
  GOLD: '#E3A712',
  DIAMOND: '#22B8CF',
};

export const SUBSCRIPTION_STATUS_LABELS = {
  ACTIVE: 'Đang hoạt động',
  EXPIRED: 'Đã hết hạn',
  CANCELLED: 'Đã hủy',
  PENDING_PAYMENT: 'Chờ thanh toán',
};

export const MEMBERSHIP_PAYMENT_METHODS = ['WALLET', 'VNPAY'];
export const VALID_PAYMENT_METHODS = ['WALLET', 'VNPAY'];

export const PAYMENT_METHOD_LABELS = {
  WALLET: 'Ví ReHome',
  VNPAY: 'VNPay',
  ADMIN_GRANT: 'Admin tặng',
};

export const MEMBERSHIP_PAYMENT_METHOD_LABELS = {
  WALLET: 'Ví ReHome',
  VNPAY: 'VNPay',
};

export const VOUCHER_TYPE_LABELS = {
  SHIPPING: 'Giảm phí vận chuyển',
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

