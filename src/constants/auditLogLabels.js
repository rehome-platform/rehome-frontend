// Từ điển tiếng Việt dùng chung cho Nhật ký hệ thống (Audit Log) & Hoạt động gần đây.
// Kế thừa HISTORY_OBJECT_LABELS, HISTORY_ACTION_LABELS, HISTORY_RESULT_LABELS của Moderator
// và bổ sung toàn bộ mã actionType / targetType / status từ Backend Spring Boot.

import { HISTORY_OBJECT_LABELS } from './historyObjectType.js';
import { HISTORY_ACTION_LABELS, HISTORY_RESULT_LABELS } from './historyStatus.js';

export const AUDIT_TARGET_TYPE_LABELS = {
  ...HISTORY_OBJECT_LABELS,
  SYSTEM: 'Hệ thống',
  ACCOUNT: 'Tài khoản',
  ORGANIZATION_ACCOUNT: 'Hồ sơ tổ chức',
  ORGANIZATION_LEGAL_CHANGE: 'Hồ sơ pháp lý tổ chức',
  POST: 'Bài viết',
  COMMENT: 'Bình luận',
  CAMPAIGN: 'Chiến dịch',
  WAREHOUSE: 'Địa điểm ký gửi',
  ORGANIZATION: 'Tổ chức',
  PRODUCT: 'Sản phẩm',
  ORDER: 'Đơn hàng',
  DONATION: 'Quyên góp',
  WITHDRAWAL: 'Yêu cầu rút hàng',
  BRAND: 'Thương hiệu',
  CATEGORY: 'Danh mục',
  SYSTEM_CONFIG: 'Cấu hình hệ thống',
  MEMBERSHIP_PLAN: 'Gói thành viên',
  MEMBER_SUBSCRIPTION: 'Đăng ký thành viên',
  VOUCHER_TEMPLATE: 'Voucher',
  RECEIPT_CLAUSE_TEMPLATE: 'Điều khoản biên nhận',
  VIOLATION_WORD: 'Từ ngữ vi phạm',
  CONTENT_REVIEW: 'Nội dung bị gắn cờ',
};

export const AUDIT_ACTION_LABELS = {
  ...HISTORY_ACTION_LABELS,

  // Tài khoản & Nhân sự
  BAN_ACCOUNT: 'Khóa tài khoản',
  'Khóa tài khoản': 'Khóa tài khoản',
  UNBAN_ACCOUNT: 'Mở khóa tài khoản',
  'Mở khóa tài khoản': 'Mở khóa tài khoản',
  CREATE_MODERATOR: 'Tạo tài khoản nhân viên',
  'Tạo Moderator': 'Tạo tài khoản nhân viên',
  UPDATE_MODERATOR: 'Cập nhật nhân viên',
  CHANGE_WAREHOUSE: 'Phân công địa điểm ký gửi',
  ASSIGN_WAREHOUSE: 'Phân công địa điểm ký gửi',
  CHANGE_MODERATOR_WAREHOUSE: 'Chuyển điểm kí gửi công tác',

  // Điểm ký gửi (Kho)
  CREATE_WAREHOUSE: 'Tạo địa điểm ký gửi',
  'Tạo kho': 'Tạo địa điểm ký gửi',
  UPDATE_WAREHOUSE: 'Cập nhật điểm ký gửi',
  HIDE_WAREHOUSE: 'Ẩn địa điểm ký gửi',
  'Ẩn kho': 'Ẩn địa điểm ký gửi',
  UNHIDE_WAREHOUSE: 'Mở hoạt động lại địa điểm ký gửi',

  // Quyên góp
  RECORD_DONATION: 'Ghi nhận quyên góp',
  HANDOVER_DONATION: 'Bàn giao quyên góp',
  REASSIGN_DONATION: 'Chuyển chiến dịch quyên góp',
  DONATE_CONSIGNED_ITEM: 'Quyên góp hàng ký gửi',

  // Đơn hàng & Thanh toán
  CREATE_ORDER: 'Tạo đơn hàng',
  CANCEL_ORDER: 'Hủy đơn hàng',
  AUTO_CANCEL_ORDER: 'Tự động hủy đơn hàng',
  PAY_ORDER_WALLET: 'Thanh toán đơn bằng ví',
  CONFIRM_ORDER_PAYMENT: 'Xác nhận thanh toán đơn hàng',
  REFUND_LATE_ORDER_PAYMENT: 'Hoàn tiền thanh toán trễ',
  CANCEL_ORDER_CARRIER_FAILURE: 'Hủy đơn do lỗi vận chuyển',
  REFUND_RETURN_ORDER: 'Hoàn tiền đơn trả hàng',

  // Rút hàng & Biên nhận
  CREATE_WITHDRAWAL: 'Tạo yêu cầu rút hàng',
  APPROVE_WITHDRAWAL: 'Duyệt yêu cầu rút hàng',
  REJECT_WITHDRAWAL: 'Từ chối yêu cầu rút hàng',
  HANDOVER_WITHDRAWAL: 'Bàn giao rút hàng',
  UPDATE_RECEIPT: 'Cập nhật biên nhận',
  VOID_RECEIPT: 'Hủy biên nhận',

  // Trả hàng
  CREATE_RETURN: 'Tạo yêu cầu trả hàng',
  APPROVE_RETURN: 'Duyệt yêu cầu trả hàng',
  REJECT_RETURN: 'Từ chối yêu cầu trả hàng',
  START_RETURN_INSPECTION: 'Bắt đầu kiểm định trả hàng',
  RESOLVE_RETURN: 'Xử lý yêu cầu trả hàng',
  MARK_RETURN_LOST: 'Đánh dấu hàng hoàn thất lạc',

  // Danh mục & Thương hiệu
  CREATE_BRAND: 'Tạo thương hiệu',
  UPDATE_BRAND: 'Cập nhật thương hiệu',
  HIDE_BRAND: 'Ẩn thương hiệu',
  DELETE_BRAND: 'Xóa thương hiệu',
  CREATE_CATEGORY: 'Tạo danh mục',
  UPDATE_CATEGORY: 'Cập nhật danh mục',
  HIDE_CATEGORY: 'Ẩn danh mục',
  DELETE_CATEGORY: 'Xóa danh mục',

  // Tổ chức & Chiến dịch
  VERIFY_ORGANIZATION: 'Xác minh tổ chức',
  REJECT_ORGANIZATION: 'Từ chối hồ sơ tổ chức',
  APPROVE_ORGANIZATION_LEGAL_CHANGE: 'Duyệt thay đổi pháp lý tổ chức',
  REJECT_ORGANIZATION_LEGAL_CHANGE: 'Từ chối thay đổi pháp lý tổ chức',
  CREATE_CAMPAIGN: 'Tạo chiến dịch',
  UPDATE_CAMPAIGN: 'Cập nhật chiến dịch',
  UNHIDE_CAMPAIGN: 'Hiển thị lại chiến dịch',
  CLOSE_CAMPAIGN: 'Đóng chiến dịch',
  AUTO_CLOSE_CAMPAIGN: 'Tự động đóng chiến dịch',

  // Vi phạm & Kiểm duyệt nội dung
  RESOLVE_VIOLATION: 'Xử lý vi phạm',
  VIOLATION_RESOLVE_REMOVE_POST: 'Gỡ bài viết vi phạm',
  VIOLATION_RESOLVE_HIDE_CAMPAIGN: 'Ẩn chiến dịch vi phạm',
  VIOLATION_RESOLVE_WARN_ORG: 'Cảnh cáo tổ chức',
  VIOLATION_RESOLVE_PROPOSE_BAN: 'Đề xuất khóa tổ chức',
  VIOLATION_DISMISS: 'Bác bỏ báo cáo vi phạm',
  CONTENT_REVIEW_APPROVED: 'Duyệt nội dung cộng đồng',
  CONTENT_REVIEW_REJECTED: 'Từ chối nội dung cộng đồng',
  CONTENT_AUTO_FLAG: 'Tự động gắn cờ nội dung vi phạm',
  CONTENT_NOTIFY_ADMIN: 'Thông báo quản trị viên về nội dung nghi vi phạm',
  CONTENT_CHAT_MASKED: 'Tự động che từ nhạy cảm trong tin nhắn',
  REMOVE_POST: 'Gỡ bài viết vi phạm',

  // Điều khoản biên nhận, Từ ngữ vi phạm, Cấu hình, Gói thành viên & Voucher
  CREATE_RECEIPT_CLAUSE_TEMPLATE: 'Thêm điều khoản biên nhận',
  UPDATE_RECEIPT_CLAUSE_TEMPLATE: 'Cập nhật điều khoản biên nhận',
  DELETE_RECEIPT_CLAUSE_TEMPLATE: 'Xóa điều khoản biên nhận',
  TOGGLE_RECEIPT_CLAUSE_TEMPLATE: 'Bật/tắt điều khoản biên nhận',
  CREATE_VIOLATION_WORD: 'Thêm từ ngữ vi phạm',
  UPDATE_VIOLATION_WORD: 'Cập nhật từ ngữ vi phạm',
  DELETE_VIOLATION_WORD: 'Xóa từ ngữ vi phạm',
  TOGGLE_VIOLATION_WORD: 'Bật/tắt từ ngữ vi phạm',
  UPDATE_CONFIG: 'Cập nhật cấu hình',
  'Cập nhật cấu hình': 'Cập nhật cấu hình',
  UPDATE_MEMBERSHIP_PLAN: 'Cập nhật gói thành viên',
  GRANT_MEMBERSHIP: 'Tặng gói thành viên',
  CANCEL_MEMBERSHIP: 'Hủy gói thành viên',
  UPDATE_VOUCHER_TEMPLATE: 'Cập nhật mẫu voucher',
  DEACTIVATE_VOUCHER_TEMPLATE: 'Ngưng kích hoạt mẫu voucher',
};

export const AUDIT_STATUS_LABELS = {
  ...HISTORY_RESULT_LABELS,
  PENDING: 'Chờ xử lý',
  RESOLVED: 'Đã xử lý',
  DISMISSED: 'Đã bác bỏ',
  CANCELLED: 'Đã hủy',
  PAID: 'Đã thanh toán',
  REFUNDED: 'Đã hoàn tiền',
  COMPLETED: 'Hoàn tất',
  CLOSED: 'Đã đóng',
  LOST: 'Thất lạc',
  VERIFIED: 'Đã xác minh',
  PENDING_PICKUP: 'Chờ bàn giao',
  ACTIVE: 'Đang hoạt động',
  BANNED: 'Đã khóa',
};

export function formatAuditActionLabel(actionType) {
  if (!actionType) return 'Thao tác hệ thống';
  if (AUDIT_ACTION_LABELS[actionType]) return AUDIT_ACTION_LABELS[actionType];
  if (typeof actionType === 'string' && actionType.startsWith('CONTENT_REVIEW_')) {
    return 'Duyệt nội dung cộng đồng';
  }
  return String(actionType);
}

export function formatAuditTargetTypeLabel(targetType) {
  if (!targetType) return 'Khác';
  return AUDIT_TARGET_TYPE_LABELS[targetType] || String(targetType);
}

export function formatAuditStatusLabel(status) {
  if (!status || status === '—') return '—';
  const key = String(status).trim().toUpperCase();
  return AUDIT_STATUS_LABELS[key] || String(status);
}
