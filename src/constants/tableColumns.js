// Bộ từ vựng chuẩn (glossary) cho tên cột bảng trên giao diện Moderator.
// Dùng chung giữa Trang chủ điểm ký gửi, Quản lý sản phẩm, các Tab lịch sử và các hàng đợi.

export const TABLE_COLUMN_LABELS = {
  TIME: 'Thời gian',
  TARGET: 'Đối tượng',
  ACTIONS: 'Thao tác',
  ACTOR: 'Người thực hiện',
  RESULT: 'Kết quả',
  STATUS: 'Trạng thái',
  WAITED: 'Đã chờ',
};

export const HISTORY_TABLE_COLUMNS = [
  TABLE_COLUMN_LABELS.TIME,
  TABLE_COLUMN_LABELS.TARGET,
  TABLE_COLUMN_LABELS.ACTIONS,
  TABLE_COLUMN_LABELS.ACTOR,
  TABLE_COLUMN_LABELS.RESULT,
];
