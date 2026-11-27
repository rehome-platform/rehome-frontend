// Mapping Enum thao tác & kết quả/trạng thái cho các Tab lịch sử kho.
// Tái sử dụng PRODUCT_STATUS_LABELS từ productStatus.js cho trạng thái sản phẩm;
// các nghiệp vụ khác (đơn hàng, ký gửi, kiểm định, hoàn trả, cuối kỳ...) có mapping riêng.

import { PRODUCT_STATUS_LABELS } from './productStatus.js';

export const HISTORY_ACTION_LABELS = {
  // PACKING
  CLAIM_TASK: 'Nhận việc',
  RELEASE_TASK: 'Nhả việc',
  SCAN_SKU: 'Đối chiếu Mã hàng hóa',
  UPDATE_PACKING_PHOTOS: 'Cập nhật ảnh đóng gói',
  CREATE_SHIPMENT: 'Tạo vận đơn GHN',
  HANDOVER_ORDER: 'Bàn giao đơn vận chuyển',

  // INSPECTION
  APPROVE_FORM: 'Duyệt phiếu ký gửi',
  REJECT_FORM: 'Từ chối phiếu ký gửi',
  START_INSPECTION: 'Bắt đầu kiểm định',
  COMPLETE_INSPECTION: 'Hoàn tất kiểm định',
  RETURN_ONSITE: 'Trả hàng tại chỗ',
  CONFIRM_RECEIPT: 'Xác nhận biên nhận',
  STOCK_IN: 'Nhập kho',
  STOCK_PRODUCT: 'Nhập kho sản phẩm',

  // INVENTORY
  CONFIRM_RECONSIGN: 'Xác nhận ký gửi lại',
  OPEN_DEGRADED_CASE: 'Mở hồ sơ hàng xuống cấp',
  RESOLVE_DEGRADED_CASE: 'Xử lý hàng xuống cấp',
  DECIDE_DEGRADED_CASE: 'Xử lý hàng xuống cấp',
  END_OF_TERM_DECISION: 'Quyết định cuối kỳ',
  DECIDE_END_OF_TERM: 'Quyết định cuối kỳ',
  PROPOSE_RECONSIGN_TERMS: 'Đề xuất điều khoản ký gửi lại',
  RECONSIGN_TERMS: 'Đề xuất điều khoản ký gửi lại',
  HANDOVER_END_OF_TERM: 'Bàn giao hàng cuối kỳ',
  HANDOVER_DEGRADED_ITEM: 'Bàn giao hàng xuống cấp',
  HANDOVER_ITEM: 'Bàn giao nhận lại',
  CONFIRM_UNCLAIMED_TRANSFER: 'Chuyển giao hàng quá hạn nhận lại',
  APPLY_RETURN_ITEM_ACTION: 'Xử lý món hàng hoàn trả',
  HANDOVER_INVALID_RETURN: 'Bàn giao hàng trả không hợp lệ',
  SHIP_BACK_RETURN: 'Tạo vận đơn gửi lại hàng trả',
  UPDATE_PRICE: 'Cập nhật giá',
  UPDATE_PRODUCT: 'Cập nhật sản phẩm',
};

export const HISTORY_NON_PRODUCT_RESULT_LABELS = {
  // Kết quả thao tác chung
  SUCCESS: 'Thành công',
  PASS: 'Đạt',
  PASSED: 'Đạt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Đã từ chối',
  STARTED: 'Đã bắt đầu',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Đã hoàn tất',
  RESOLVED: 'Đã hoàn tất',
  HANDED_OVER: 'Đã bàn giao',
  OPENED: 'Đã mở hồ sơ',
  PROPOSED: 'Đã đề xuất',
  TRANSFERRED: 'Đã chuyển giao',
  WAITING_CONFIRMATION: 'Chờ xác nhận',
  PENDING_DECISION: 'Chờ quyết định',

  // Kiểm định / Ký gửi
  INSPECTING: 'Đang kiểm định',

  // Đơn hàng
  SHIPPING: 'Đang giao hàng',

  // Quyết định cuối kỳ & Hàng xuống cấp
  TAKE_BACK: 'Nhận lại',
  RE_CONSIGN: 'Ký gửi lại',
  DONATE: 'Quyên góp',
  PICKED_UP: 'Đã nhận lại',
  FULL_COMPENSATION: 'Đền bù toàn bộ',
  PARTIAL_WITH_ITEM_BACK: 'Đền bù và nhận lại hàng',

  // Xử lý món hàng hoàn trả (ReturnedItemAction)
  RELIST: 'Đăng bán lại',
  RETURN_TO_SELLER: 'Trả lại người bán',
  DISCARD: 'Loại bỏ',
};

// Gộp trạng thái sản phẩm (nguồn duy nhất từ productStatus.js) với kết quả các nghiệp vụ khác.
export const HISTORY_RESULT_LABELS = {
  ...PRODUCT_STATUS_LABELS,
  ...HISTORY_NON_PRODUCT_RESULT_LABELS,
};

// Override theo ngữ cảnh khi cùng 1 Enum mang nghĩa khác nhau giữa các nghiệp vụ.
export const HISTORY_CONTEXT_RESULT_LABELS = {
  CONSIGNMENT_FORM: {
    RETURNED: 'Đã trả tại quầy',
  },
  RETURN_ONSITE: {
    RETURNED: 'Đã trả tại quầy',
  },
};
