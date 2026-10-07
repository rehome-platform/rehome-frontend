/**
 * ReHome - Global API Utility Wrapper & Error Formatter
 * Provides apiFetch wrapper around Axios baseApi and clean Vietnamese error messages
 */
import baseApi, { getToken, removeTokens } from "../services/baseApi.js";
import { API_BASE_URL } from "../configs/api.config.js";

export const BASE_URL = API_BASE_URL;

/**
 * Get Vietnamese fallback message based on HTTP status code
 */
function getFallbackForStatus(status, action = "thực hiện thao tác") {
  switch (status) {
    case 400:
      return `Dữ liệu yêu cầu không hợp lệ khi ${action}. Vui lòng kiểm tra lại thông tin gửi đi (HTTP 400).`;
    case 401:
      return `Phiên đăng nhập đã hết hạn hoặc chưa xác thực. Vui lòng đăng nhập lại (HTTP 401).`;
    case 403:
      return `Bạn không có quyền hoặc không đủ quyền hạn để ${action} (HTTP 403).`;
    case 404:
      return `Không tìm thấy dữ liệu, chiến dịch hoặc yêu cầu này trên hệ thống (HTTP 404).`;
    case 408:
      return `Yêu cầu kết nối quá hạn (Timeout). Vui lòng thử lại sau (HTTP 408).`;
    case 409:
      return `Trạng thái dữ liệu đang bị xung đột hoặc đã được thao tác trước đó (HTTP 409).`;
    case 413:
      return `File đính kèm hoặc ảnh upload vượt quá dung lượng cho phép (Tối đa 5MB) (HTTP 413).`;
    case 422:
      return `Dữ liệu gửi đi không thể xử lý do sai định dạng nghiệp vụ (HTTP 422).`;
    case 500:
    case 502:
    case 503:
    case 504:
      return `Hệ thống máy chủ tạm thời gặp sự cố khi ${action}. Vui lòng thử lại sau ít phút (HTTP ${status}).`;
    default:
      return `Đã xảy ra lỗi không mong đợi khi ${action} (HTTP ${status}).`;
  }
}

/**
 * Global API Error Formatter:
 * Transforms errors, network timeouts, and JSON error objects into clear, friendly Vietnamese text.
 */
export function formatApiError(err, action = "thực hiện thao tác") {
  if (!err) return getFallbackForStatus(500, action);

  if (err.name === "TypeError" && (err.message?.includes("fetch") || err.message?.includes("network") || err.message?.includes("Failed to fetch"))) {
    return `Không thể kết nối đến máy chủ khi ${action}. Vui lòng kiểm tra lại kết nối mạng của bạn.`;
  }

  const status = Number(err.response?.status || err.status) || 0;
  const data = err.response?.data;
  const rawMsg = data?.message || data?.error || err.message || "";

  if (rawMsg.includes("MaxUploadSizeExceededException") || rawMsg.includes("vượt quá dung lượng")) {
    return `File minh chứng upload vượt quá giới hạn dung lượng (Tối đa 5MB). Vui lòng chọn ảnh nhỏ hơn.`;
  }

  if (rawMsg.includes("MissingServletRequestPartException")) {
    return `Vui lòng đính kèm đầy đủ file ảnh minh chứng trước khi xác nhận!`;
  }

  if (status > 0) {
    if (!rawMsg || rawMsg.includes("java.") || rawMsg.includes(".Exception") || rawMsg.includes("<!DOCTYPE") || rawMsg.includes("<html")) {
      return getFallbackForStatus(status, action);
    }
    return rawMsg;
  }

  return rawMsg && !rawMsg.includes("[object Object]") && !rawMsg.includes("java.") ? rawMsg : getFallbackForStatus(500, action);
}

/**
 * apiFetch wrapper for custom requests
 */
export async function apiFetch(path, options = {}) {
  const method = (options.method || "GET").toLowerCase();
  const headers = { ...options.headers };

  try {
    const res = await baseApi({
      url: path,
      method,
      data: options.body || options.data,
      params: options.params,
      headers,
    });
    return res.data;
  } catch (error) {
    const message = formatApiError(error);
    const customError = new Error(message);
    customError.response = error.response;
    customError.status = error.response?.status || 500;
    throw customError;
  }
}
