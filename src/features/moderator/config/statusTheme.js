/**
 * Bảng màu trạng thái ngữ nghĩa (Semantic Status Palette) dùng chung cho toàn bộ module Moderator.
 * Đảm bảo độ tương phản WCAG AA, đồng bộ với thiết kế ReHome (#006B2C primary, #F6F9F4 background).
 */

import { PRODUCT_STATUS_FALLBACK, productStatusLabelByKey } from '../../../constants/productStatus.js';

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
  ON_SALE: { label: productStatusLabelByKey('ON_SALE'), tone: 'success' },
  WAREHOUSE: { label: productStatusLabelByKey('WAREHOUSE'), tone: 'info' },
  WAREHOUSE_DEGRADED: { label: productStatusLabelByKey('WAREHOUSE_DEGRADED'), tone: 'danger' },
  WAREHOUSE_TERM_EXPIRED: { label: productStatusLabelByKey('WAREHOUSE_TERM_EXPIRED'), tone: 'warning' },
  WAREHOUSE_NEGOTIATING: { label: productStatusLabelByKey('WAREHOUSE_NEGOTIATING'), tone: 'info' },
  RESERVED: { label: productStatusLabelByKey('RESERVED'), tone: 'warning' },
  SOLD: { label: productStatusLabelByKey('SOLD'), tone: 'success' },
  WITHDRAWN: { label: productStatusLabelByKey('WITHDRAWN'), tone: 'neutral' },
  DESTROYED: { label: productStatusLabelByKey('DESTROYED'), tone: 'danger' },
  WAITING_END_OF_TERM: { label: productStatusLabelByKey('WAITING_END_OF_TERM'), tone: 'warning' },
  UNCLAIMED: { label: productStatusLabelByKey('UNCLAIMED'), tone: 'neutral' },
  DONATED: { label: productStatusLabelByKey('DONATED'), tone: 'purple' },
  RETURNED: { label: productStatusLabelByKey('RETURNED'), tone: 'neutral' },
  RETURNED_ONSITE: { label: 'Đã trả tại chỗ', tone: 'neutral' },
  PLATFORM_OWNED: { label: productStatusLabelByKey('PLATFORM_OWNED'), tone: 'purple' },
  DEGRADED: { label: productStatusLabelByKey('DEGRADED'), tone: 'danger' },

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
    label: entry?.label || fallbackLabel || (/^[A-Z0-9_]+$/.test(key) ? PRODUCT_STATUS_FALLBACK : (typeof status === 'string' && status.trim()) || PRODUCT_STATUS_FALLBACK),
    tone: toneKey,
    badgeClass: tone.badgeClass,
    dotClass: tone.dotClass,
  };
}
