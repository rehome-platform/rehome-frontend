// Mapping Enum targetType từ Backend (AuditLogger.logWarehouse*) sang nhãn tiếng Việt.
// Chỉ dùng ở tầng hiển thị (presentation layer); không thay đổi giá trị Enum gửi API / routing.

export const HISTORY_OBJECT_LABELS = {
  PRODUCT: 'Sản phẩm',
  CONSIGNMENT_FORM: 'Phiếu ký gửi',
  CONSIGNMENT_RECEIPT: 'Biên nhận ký gửi',
  ORDER: 'Đơn hàng',
  DEGRADED_ITEM_CASE: 'Hồ sơ hàng xuống cấp',
  END_OF_TERM_DECISION: 'Quyết định cuối kỳ',
  RETURN_REQUEST: 'Yêu cầu trả hàng',
};
