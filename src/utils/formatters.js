/**
 * ReHome - Formatting Utilities (Currency, Dates, Numbers)
 */

/**
 * Format currency into VND (e.g. 2.000.000 đ)
 * @param {number|string} amount
 * @returns {string}
 */
export function formatCurrencyVND(amount) {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return "0 đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(Number(amount)).replace("₫", "đ");
}

/**
 * Format date time to Vietnamese locale
 * @param {string|Date} dateStr
 * @returns {string}
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return String(dateStr);
  }
}

/**
 * Format date only (DD/MM/YYYY)
 * @param {string|Date} dateStr
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return String(dateStr);
  }
}

/**
 * Chuẩn hóa tên cơ sở hiển thị trên UI ("Kho ..." -> "Điểm kí gửi ...")
 * mà không làm thay đổi dữ liệu/payload gửi API.
 * @param {string} name
 * @returns {string}
 */
export function formatWarehouseDisplayName(name) {
  if (!name || typeof name !== 'string') return name || '';
  const trimmed = name.trim();
  if (!trimmed) return '';
  if (/^(?:địa\s+)?điểm\s+k[iíý]\s+gửi(?=\s|$|[-–—·:,./()])/iu.test(trimmed)) {
    return trimmed;
  }
  return trimmed.replace(/^kho(?=\s|$|[-–—·:,./()])/iu, 'Điểm kí gửi');
}
