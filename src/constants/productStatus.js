// Nguồn duy nhất cho nhãn tiếng Việt của Product Status (Backend enum ProductStatus).
// Không hardcode tên trạng thái ở component; dùng các helper bên dưới.

export const PRODUCT_STATUS_LABELS = {
  ON_SALE: 'Đang bán',
  RESERVED: 'Đang giữ giỏ',
  SOLD: 'Đã bán',
  RETURNED: 'Chờ phân loại hoàn',
  WITHDRAWN: 'Đã hoàn trả người bán',
  UNCLAIMED: 'Quá hạn nhận lại',
  PLATFORM_OWNED: 'Tài sản nền tảng',
  DONATED: 'Đã quyên góp',
  DESTROYED: 'Đã tiêu hủy',
};

export const PRODUCT_STATUS_FALLBACK = 'Không xác định';

// WAREHOUSE dùng cho nhiều nghiệp vụ (F-036, F-029, đàm phán, rút hàng) nên không có nhãn cứng duy nhất.
export const WAREHOUSE_REASON = {
  DEGRADED: 'DEGRADED',
  TERM_EXPIRED: 'TERM_EXPIRED',
  NEGOTIATING: 'NEGOTIATING',
  WITHDRAWAL_PENDING_APPROVAL: 'WITHDRAWAL_PENDING_APPROVAL',
  WITHDRAWAL_PENDING_PICKUP: 'WITHDRAWAL_PENDING_PICKUP',
};

export const WAREHOUSE_REASON_LABELS = {
  DEGRADED: 'Hàng xuống cấp',
  TERM_EXPIRED: 'Hết hạn ký gửi',
  NEGOTIATING: 'Đang thương lượng',
  WITHDRAWAL_PENDING_APPROVAL: 'Chờ duyệt rút hàng',
  WITHDRAWAL_PENDING_PICKUP: 'Chờ nhận lại',
};

// Chưa xác định được nghiệp vụ của WAREHOUSE từ dữ liệu Backend: không đoán.
export const WAREHOUSE_UNCLASSIFIED_LABEL = 'Lưu kho (chưa phân loại)';

// Nhãn dành cho các trạng thái giao diện không thuộc Backend enum.
export const PRODUCT_STATUS_UI_LABELS = {
  DEGRADED: WAREHOUSE_REASON_LABELS.DEGRADED,
  WAITING_END_OF_TERM: 'Chờ xử lý cuối kỳ',
};

export const PLATFORM_FINAL_STATUSES = ['PLATFORM_OWNED', 'DONATED', 'DESTROYED'];

// 9 tab theo thứ tự hiển thị. `value` là tham số ?status= của trang (giữ tương thích link cũ).
// `source` cho biết cách lấy dữ liệu trong inventoryService.list.
export const PRODUCT_TABS = [
  { value: 'ON_SALE', label: PRODUCT_STATUS_LABELS.ON_SALE, source: 'single' },
  { value: 'RESERVED', label: PRODUCT_STATUS_LABELS.RESERVED, source: 'single' },
  { value: 'SOLD', label: PRODUCT_STATUS_LABELS.SOLD, source: 'single' },
  { value: 'RETURNED', label: PRODUCT_STATUS_LABELS.RETURNED, source: 'single' },
  { value: 'DEGRADED', label: WAREHOUSE_REASON_LABELS.DEGRADED, source: 'degraded' },
  { value: 'TERM_EXPIRED', label: WAREHOUSE_REASON_LABELS.TERM_EXPIRED, source: 'termExpired' },
  { value: 'WITHDRAWN', label: PRODUCT_STATUS_LABELS.WITHDRAWN, source: 'single' },
  { value: 'UNCLAIMED', label: PRODUCT_STATUS_LABELS.UNCLAIMED, source: 'single' },
  { value: 'PLATFORM_FINAL', label: 'Tài sản nền tảng / Đã xử lý', source: 'concat' },
];

const norm = (value) => (typeof value === 'string' ? value.trim().toUpperCase() : '');

// Khóa tra cứu theme/nhãn cho một sản phẩm (WAREHOUSE phân nhánh theo nghiệp vụ).
export function productStatusKey(item) {
  const status = norm(item?.status);
  const withdrawalStatus = norm(item?.activeWithdrawalStatus || item?.withdrawalStatus);
  if (status === 'WAREHOUSE' || status === 'WITHDRAWN') {
    if (withdrawalStatus === 'PENDING_APPROVAL') return 'WAREHOUSE_WITHDRAWAL_PENDING_APPROVAL';
    if (withdrawalStatus === 'PENDING_PICKUP') return 'WAREHOUSE_WITHDRAWAL_PENDING_PICKUP';
  }
  if (status !== 'WAREHOUSE') return status;
  const reason = norm(item?.warehouseReason) || warehouseReasonOf(item);
  return reason && WAREHOUSE_REASON[reason] ? `WAREHOUSE_${reason}` : 'WAREHOUSE';
}

// Nhãn tiếng Việt cho một khóa trạng thái; không bao giờ trả Enum thô/null/undefined.
export function productStatusLabelByKey(key) {
  const k = norm(key);
  if (PRODUCT_STATUS_LABELS[k]) return PRODUCT_STATUS_LABELS[k];
  if (PRODUCT_STATUS_UI_LABELS[k]) return PRODUCT_STATUS_UI_LABELS[k];
  if (k === 'WAREHOUSE') return WAREHOUSE_UNCLASSIFIED_LABEL;
  if (k.startsWith('WAREHOUSE_') && WAREHOUSE_REASON_LABELS[k.slice(10)]) {
    return WAREHOUSE_REASON_LABELS[k.slice(10)];
  }
  return PRODUCT_STATUS_FALLBACK;
}

export function resolveProductStatusLabel(item) {
  return productStatusLabelByKey(productStatusKey(item));
}

// Xác định lý do của WAREHOUSE từ dữ liệu Backend đã có (không đoán).
// activeWithdrawalStatus đến từ ItemWithdrawalRequest còn sống;
// decisionId/pricingEligible/reConsignStatus đến từ EndOfTermDecision + pending-pricing.
export function warehouseReasonOf(item) {
  if (norm(item?.status) !== 'WAREHOUSE') return undefined;
  const withdrawalStatus = norm(item?.activeWithdrawalStatus || item?.withdrawalStatus);
  if (withdrawalStatus === 'PENDING_APPROVAL') return WAREHOUSE_REASON.WITHDRAWAL_PENDING_APPROVAL;
  if (withdrawalStatus === 'PENDING_PICKUP') return WAREHOUSE_REASON.WITHDRAWAL_PENDING_PICKUP;
  if (item.pricingEligible || item.reConsignStatus === 'PROPOSAL_SENT') return WAREHOUSE_REASON.NEGOTIATING;
  if (item.decisionId) return WAREHOUSE_REASON.TERM_EXPIRED;
  return undefined;
}
