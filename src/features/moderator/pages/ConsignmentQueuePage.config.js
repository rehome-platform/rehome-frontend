export const OVERDUE_THRESHOLD_HOURS = 48;

export const WORK_TYPES = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'FORM_REVIEW', label: 'Duyệt form' },
  { key: 'INSPECTION', label: 'Kiểm định' },
  { key: 'PACKING', label: 'Đóng gói' },
  { key: 'RETURNS', label: 'Trả hàng', directUrl: '/moderator/returns' },
  { key: 'VERIFICATION', label: 'Xác minh tổ chức', directUrl: '/moderator/verifications' },
  { key: 'VIOLATION', label: 'Vi phạm', directUrl: '/moderator/reports' },
];
