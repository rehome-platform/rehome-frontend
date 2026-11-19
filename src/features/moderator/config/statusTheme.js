/**
 * Bảng màu trạng thái ngữ nghĩa (Semantic Status Palette) dùng chung cho toàn bộ module Moderator.
 * Đảm bảo độ tương phản WCAG AA, đồng bộ với thiết kế ReHome (#006B2C primary, #F6F9F4 background).
 */

export const STATUS_TONES = {
  success: {
    badgeClass: 'bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]',
    dotClass: 'bg-[#12B76A]',
  },
  warning: {
    badgeClass: 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]',
    dotClass: 'bg-[#F79009]',
  },
  info: {
    badgeClass: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]',
    dotClass: 'bg-[#2E90FA]',
  },
  danger: {
    badgeClass: 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]',
    dotClass: 'bg-[#F04438]',
  },
  purple: {
    badgeClass: 'bg-[#F4F3FF] text-[#5925DC] border-[#D9D6FE]',
    dotClass: 'bg-[#7A5AF8]',
  },
  neutral: {
    badgeClass: 'bg-[#F2F4F7] text-[#344054] border-[#D0D5DD]',
    dotClass: 'bg-[#667085]',
  },
};

export const STATUS_META = {
  // Consignment & inspection flow
  PENDING: { label: 'Chờ duyệt', tone: 'warning' },
  PENDING_APPROVAL: { label: 'Chờ duyệt', tone: 'warning' },
  REVIEW_FORM: { label: 'Chờ duyệt', tone: 'warning' },
  APPROVED: { label: 'Đã duyệt', tone: 'success' },
  START_INSPECTION: { label: 'Đã duyệt', tone: 'info' },
  INSPECTING: { label: 'Đang kiểm định', tone: 'info' },
  INSPECTION: { label: 'Đang kiểm định', tone: 'info' },
  WAITING_CONFIRMATION: { label: 'Chờ Member xác nhận', tone: 'warning' },
  AWAIT_MEMBER_CONFIRM: { label: 'Chờ Member xác nhận', tone: 'warning' },
  WAITING_STOCK_IN: { label: 'Chờ nhập kho', tone: 'warning' },
  STOCK_IN: { label: 'Chờ nhập kho', tone: 'warning' },
  STOCKED: { label: 'Đã nhập kho', tone: 'success' },

  // Inventory & lifecycle
  ON_SALE: { label: 'Đang bán', tone: 'success' },
  WAREHOUSE: { label: 'Lưu kho, tạm ngừng bán', tone: 'info' },
  RESERVED: { label: 'Đang giữ hàng', tone: 'warning' },
  SOLD: { label: 'Đã bán', tone: 'success' },
  WITHDRAWN: { label: 'Đã rút hàng', tone: 'neutral' },
  DESTROYED: { label: 'Đã tiêu huỷ', tone: 'danger' },
  WAITING_END_OF_TERM: { label: 'Chờ xử lý cuối kỳ', tone: 'warning' },
  UNCLAIMED: { label: 'Vô thừa nhận', tone: 'neutral' },
  DONATED: { label: 'Đã quyên góp', tone: 'purple' },
  RETURNED: { label: 'Đã bàn giao', tone: 'neutral' },
  RETURNED_ONSITE: { label: 'Đã trả tại chỗ', tone: 'neutral' },
  PLATFORM_OWNED: { label: 'Tài sản nền tảng', tone: 'purple' },
  DEGRADED: { label: 'Hàng xuống cấp', tone: 'danger' },

  // Packing, returns, donations, moderation
  PACKING: { label: 'Đang đóng gói', tone: 'info' },
  PACKED: { label: 'Đã đóng gói', tone: 'success' },
  SHIPPING: { label: 'Đang giao hàng', tone: 'info' },
  RETURN_SHIPPING: { label: 'Đang hoàn hàng', tone: 'info' },
  HANDED_OVER: { label: 'Đã bàn giao', tone: 'success' },
  COMPLETED: { label: 'Hoàn tất', tone: 'success' },
  VERIFIED: { label: 'Đã xác minh', tone: 'success' },
  RESOLVED: { label: 'Đã xử lý', tone: 'success' },
  DONE: { label: 'Hoàn tất', tone: 'success' },
  PROCESSING: { label: 'Đang xử lý', tone: 'warning' },
  ON_HOLD: { label: 'Đang tạm giữ', tone: 'warning' },
  REJECTED: { label: 'Đã từ chối', tone: 'danger' },
  EXPIRED: { label: 'Đã hết hạn', tone: 'neutral' },
  CANCELLED: { label: 'Đã huỷ', tone: 'neutral' },
  DISMISSED: { label: 'Đã bỏ qua', tone: 'neutral' },
  FAILED: { label: 'Thất bại', tone: 'danger' },
  LOST: { label: 'Thất lạc', tone: 'danger' },
  OVERDUE: { label: 'Quá hạn', tone: 'danger' },
  VIOLATION: { label: 'Vi phạm', tone: 'danger' },
  POST: { label: 'Bài viết', tone: 'info' },
  CAMPAIGN: { label: 'Chiến dịch', tone: 'purple' },
};

export function getStatusMeta(status, fallbackLabel) {
  const key = typeof status === 'string' ? status.trim().toUpperCase() : '';
  const entry = STATUS_META[key];
  const toneKey = entry?.tone || 'neutral';
  const tone = STATUS_TONES[toneKey] || STATUS_TONES.neutral;

  return {
    label: entry?.label || fallbackLabel || (typeof status === 'string' && status) || '—',
    tone: toneKey,
    badgeClass: tone.badgeClass,
    dotClass: tone.dotClass,
  };
}
