/**
 * ReHome User Roles and Permissions Configuration
 */

export const ROLES = {
  ADMIN: "admin",
  MODERATOR: "staff",
  SHOP: "shop",
  ORGANIZER: "organization",
  MEMBER: "member",
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: "Quản trị viên (Admin)",
  [ROLES.MODERATOR]: "Kiểm duyệt viên (Moderator)",
  [ROLES.SHOP]: "Cửa hàng ký gửi (Shop)",
  [ROLES.ORGANIZER]: "Tổ chức từ thiện (Org)",
  [ROLES.MEMBER]: "Thành viên (Member)",
};

export const ROLE_HOME_ROUTES = {
  [ROLES.ADMIN]: "/admin",
  [ROLES.MODERATOR]: "/moderator",
  [ROLES.SHOP]: "/shop",
  [ROLES.ORGANIZER]: "/organizer",
  [ROLES.MEMBER]: "/",
};
