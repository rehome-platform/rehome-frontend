// Chuẩn hóa và ánh xạ vai trò hệ thống sang nhãn tiếng Việt nhất quán trên toàn bộ Web App.
// Chỉ dùng ở tầng hiển thị; không thay đổi giá trị Enum gửi API / routing.

const ROLE_CANONICAL_MAP = {
  ADMIN: 'ADMIN',
  MODERATOR: 'MODERATOR',
  STAFF: 'MODERATOR',
  MEMBER: 'MEMBER',
  ORGANIZATION: 'ORGANIZATION',
  ORGANIZER: 'ORGANIZATION',
  SYSTEM: 'SYSTEM',
};

export const ROLE_DISPLAY_LABELS = {
  ADMIN: 'Quản trị viên',
  MODERATOR: 'Nhân viên điểm kí gửi',
  MEMBER: 'Thành viên',
  ORGANIZATION: 'Tổ chức',
  SYSTEM: 'Hệ thống',
};

export const ROLE_BADGE_STYLES = {
  ADMIN: 'bg-[#ECFDF3] text-[#006B2C] border border-[#ABEFC6]',
  MODERATOR: 'bg-[#E0F2F1] text-[#00685F] border border-[#99D5CF]',
  ORGANIZATION: 'bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]',
  MEMBER: 'bg-[#F6F9F4] text-[#5B6776] border border-[#DDE5D9]',
  SYSTEM: 'bg-[#F6F9F4] text-[#5B6776] border border-[#DDE5D9]',
};

/**
 * Chuẩn hóa mọi biến thể chuỗi/mảng vai trò (vd: "[ROLE_MODERATOR]", "ROLE_ADMIN", "staff", ["ROLE_ADMIN"])
 * thành key viết hoa chuẩn: "ADMIN" | "MODERATOR" | "MEMBER" | "ORGANIZATION" | "SYSTEM" | "".
 */
export function normalizeRoleKey(raw) {
  if (raw == null) return '';
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value == null) return '';

  const cleaned = String(value)
    .trim()
    .replace(/^\[|\]$/g, '')
    .split(',')[0]
    .trim()
    .replace(/^ROLE_/i, '')
    .toUpperCase();

  return ROLE_CANONICAL_MAP[cleaned] || cleaned;
}

/**
 * Trả về nhãn vai trò tiếng Việt thuần, không kèm hậu tố tiếng Anh hay ngoặc vuông.
 */
export function getRoleLabel(raw, fallback = 'Người dùng') {
  const key = normalizeRoleKey(raw);
  if (!key) return fallback;
  return ROLE_DISPLAY_LABELS[key] || fallback;
}

/**
 * Trả về bộ class Tailwind pastel theo Design Tokens cho pill badge vai trò.
 */
export function getRoleBadgeStyle(raw) {
  const key = normalizeRoleKey(raw);
  return ROLE_BADGE_STYLES[key] || ROLE_BADGE_STYLES.MEMBER;
}
