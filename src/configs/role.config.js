/**
 * ReHome User Roles and Permissions Configuration
 * Dựa trên Mục 2: "Actor và nền tảng" trong Tài liệu tổng quan hệ thống ReHome (sau Review 1)
 *
 * Phân định Nền tảng:
 * - WEB APP: Dành riêng cho 2 tác nhân nội bộ:
 *     1. ADMIN: Quản trị viên nền tảng
 *     2. MODERATOR: Nhân viên kiểm định và vận hành tại các chi nhánh kho
 *
 * - MOBILE APP: Dành riêng cho 2 tác nhân người dùng ngoại bộ:
 *     1. MEMBER: Người mua, người ký gửi, người quyên góp
 *     2. ORGANIZATION: Tổ chức từ thiện (tạo chiến dịch, đăng bài, chat với Member)
 */

export const ROLES = {
  ADMIN: "admin",
  MODERATOR: "staff",
  // Các đối tượng tài khoản được quản lý trong hệ thống Admin/Moderator:
  ORGANIZER: "organization",
  MEMBER: "member",
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: "Quản trị viên (Admin)",
  [ROLES.MODERATOR]: "Nhân viên Điểm kí gửi / Kiểm duyệt (Moderator)",
  [ROLES.ORGANIZER]: "Tổ chức từ thiện (Mobile)",
  [ROLES.MEMBER]: "Thành viên (Mobile)",
};

export const ROLE_HOME_ROUTES = {
  [ROLES.ADMIN]: "/admin",
  [ROLES.MODERATOR]: "/moderator/counter",
};
