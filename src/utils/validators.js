/**
 * ReHome - Form Validation Utilities
 * Chuẩn hóa theo Tài liệu tổng quan hệ thống ReHome (sau Review 1)
 */

/** Validates email address */
export function validateEmail(value) {
  if (!value || !value.trim()) return "Vui lòng nhập email";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value.trim())) return "Email không hợp lệ";
  return null;
}

/** Validates a Vietnamese phone number */
export function validatePhone(value) {
  if (!value || !value.trim()) return "Vui lòng nhập số điện thoại";
  const digitsOnly = value.replace(/\D/g, "");
  if (digitsOnly.length < 10) return "Số điện thoại phải có ít nhất 10 chữ số";
  if (digitsOnly.length > 11) return "Số điện thoại không hợp lệ";
  return null;
}

/** Validates password (min 6 chars) */
export function validatePassword(value) {
  if (!value || !value.trim()) return "Vui lòng nhập mật khẩu";
  if (value.length < 6) return "Mật khẩu tối thiểu 6 ký tự";
  return null;
}

/** Validates confirm password */
export function validateConfirmPassword(value, original) {
  if (!value || !value.trim()) return "Vui lòng xác nhận mật khẩu";
  if (value !== original) return "Mật khẩu xác nhận không khớp";
  return null;
}

/** Validates a full name or organization name */
export function validateFullName(value) {
  if (!value || !value.trim()) return "Vui lòng nhập tên đầy đủ";
  if (value.trim().length < 2) return "Tên quá ngắn";
  return null;
}

/** Validates Vietnamese CCCD (12 digits) */
export function validateCCCD(value) {
  if (!value || !value.trim()) return "Vui lòng nhập số CCCD người đại diện";
  const digitsOnly = value.replace(/\D/g, "");
  if (digitsOnly.length !== 12) return "Số CCCD phải có đúng 12 chữ số";
  return null;
}

/** Validates Tax code if present (10 or 13 digits) */
export function validateTaxCode(value) {
  if (!value) return null; // Mã số thuế không bắt buộc với mọi tổ chức
  const cleaned = value.replace(/\s/g, "");
  if (!/^\d{10}(-\d{3})?$/.test(cleaned) && !/^\d{13}$/.test(cleaned)) {
    return "Mã số thuế không đúng định dạng (10 hoặc 13 chữ số)";
  }
  return null;
}

/**
 * Validate giá bán mới so với giá sàn (F-025, F-026, UC-18)
 * Không được thấp hơn giá sàn và không được cao hơn giá niêm yết ban đầu
 */
export function validatePriceFloor(newPrice, floorPrice, agreedPrice) {
  const num = Number(newPrice);
  if (isNaN(num) || num <= 0) return "Giá bán phải là số tiền hợp lệ";
  if (floorPrice && num < floorPrice) {
    return `Giá mới không được thấp hơn giá sàn ${floorPrice.toLocaleString('vi-VN')} đ`;
  }
  if (agreedPrice && num > agreedPrice) {
    return `Giá mới không được vượt quá giá niêm yết ban đầu ${agreedPrice.toLocaleString('vi-VN')} đ`;
  }
  return null;
}

/** Validate giá chốt tại quầy kiểm định */
export function validateAgreedPrice(price) {
  const num = Number(price);
  if (isNaN(num) || num <= 0) return "Giá bán niêm yết phải lớn hơn 0 đ";
  if (num < 20000) return "Giá bán tối thiểu 20.000 đ";
  return null;
}
