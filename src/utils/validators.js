/**
 * ReHome - Form Validation Utilities
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
  if (!value || !value.trim()) return "Vui lòng nhập họ và tên hoặc tên tổ chức";
  if (value.trim().length < 2) return "Tên quá ngắn";
  return null;
}

/** Validates a 6-digit OTP or receipt code */
export function validateCode(value, length = 6) {
  if (!value || !value.trim()) return `Vui lòng nhập mã ${length} số`;
  const digitsOnly = value.replace(/\D/g, "");
  if (digitsOnly.length !== length) return `Mã phải có đúng ${length} chữ số`;
  return null;
}

/** Validates price range against ReHome price ceiling (trần giá 2,000,000đ) */
export function validateConsignmentPrice(price, maxPrice = 2000000) {
  const num = Number(price);
  if (isNaN(num) || num <= 0) return "Giá bán phải lớn hơn 0đ";
  if (num > maxPrice) return `Giá bán không được vượt quá trần giá ${maxPrice.toLocaleString('vi-VN')} đ`;
  return null;
}
