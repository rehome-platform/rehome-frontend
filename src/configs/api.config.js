/**
 * ReHome API Configuration
 * Base URL and centralized API Endpoints theo Tài liệu tổng quan hệ thống (sau Review 1)
 * Dành cho hệ thống Web App (Admin & Moderator kho)
 */

export function normalizeApiBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL) ||
  "https://rehome-a4gae8cqhvf7cmd8.eastasia-01.azurewebsites.net";

const moderatorId = (value) => encodeURIComponent(value);

/**
 * Tạo URL hợp lệ cho SockJS client.
 * SockJS yêu cầu bắt buộc giao thức http: hoặc https:. Tuyệt đối không dùng ws: hoặc wss:.
 */
export function getSockJsUrl(baseUrl = API_BASE_URL) {
  if (!baseUrl) return "";
  const httpUrl = String(baseUrl)
    .replace(/^ws:\/\//i, "http://")
    .replace(/^wss:\/\//i, "https://");
  const cleanBase = httpUrl.replace(/\/+$/, "");
  return `${cleanBase}/ws`;
}

export const WS_BASE_URL = getSockJsUrl(API_BASE_URL);

export const API_ENDPOINTS = {
  // 1. Auth & Session Security (Web: Admin & Moderator)
  AUTH: {
    LOGIN: "/api/auth/login",
    REFRESH: "/api/auth/refresh",
    LOGOUT: "/api/auth/logout",
    ME: "/api/account/me",
    REGISTER: "/api/auth/register",
    VERIFY_OTP: "/api/auth/verify-otp",
    RESEND_OTP: "/api/auth/resend-otp",
    FORGOT_PASSWORD: "/api/auth/password/forgot",
    RESET_PASSWORD: "/api/auth/password/reset",
    CHANGE_PASSWORD: "/api/auth/password/change",
    GOOGLE: "/api/auth/google",
  },

  // Member Profile Endpoints
  MEMBER: {
    ME: "/members/me",
    CODE: "/members/me/code",
  },

  // 2. Moderator (Nhân viên vận hành kho & Kiểm duyệt viên tại chi nhánh kho) - API 25 -> 48
  MODERATOR: {
    // API 25, 26, 27: Quầy tiếp nhận & Tra cứu Member
    COUNTER_LOOKUP: "/counter/lookup",
    COUNTER_CONFIRM_IDENTITY: (accountId) => `/counter/members/${moderatorId(accountId)}/confirm-identity`,
    COUNTER_TASKS: (accountId) => `/counter/members/${moderatorId(accountId)}/tasks`,
    COUNTER_HANDOVER: "/counter/handover",

    // API 28, 29, 30: Hàng đợi công việc kho
    QUEUES: "/queues",
    CLAIM_QUEUE: (id) => `/queues/${moderatorId(id)}/claim`,
    RELEASE_QUEUE: (id) => `/queues/${moderatorId(id)}/release`,

    // API 31, 32, 33, 34, 35: Quy trình duyệt form & kiểm định ký gửi
    APPROVE_FORM: (id) => `/consignment-forms/${moderatorId(id)}/approve`,
    REJECT_FORM: (id) => `/consignment-forms/${moderatorId(id)}/reject`,
    START_INSPECTION: (id) => `/consignment-forms/${moderatorId(id)}/inspection/start`,
    COMPLETE_INSPECTION: (id) => `/consignment-forms/${moderatorId(id)}/inspection/complete`,
    RETURN_ONSITE: (id) => `/consignment-forms/${moderatorId(id)}/return-onsite`,
    CONSIGNMENT_FORM_DETAIL: (id) => `/consignment-forms/${moderatorId(id)}`,
    RECEIPT_DETAIL: (id) => `/consignment-receipts/${moderatorId(id)}`,
    RECEIPT_PDF: (id) => `/consignment-receipts/${moderatorId(id)}/pdf`,

    // API 36, 37, 38, 39, 40, 41, 42, 43: Tồn kho & Sản phẩm
    CREATE_PRODUCT: "/products",
    CONFIRM_UNCLAIMED_TRANSFER: (id) => `/products/${moderatorId(id)}/unclaimed/confirm-transfer`,
    PRODUCT_SKU_LABEL: (id) => `/products/${moderatorId(id)}/sku-label`,
    INVENTORY: "/inventory",
    PRODUCT_BY_SKU: (sku) => `/products/${moderatorId(sku)}`,
    UPDATE_SHELF_LOCATION: (id) => `/products/${moderatorId(id)}/shelf-location`,
    STOCK_MOVEMENTS: (id) => `/products/${moderatorId(id)}/stock-movements`,

    // API 44, 45, 46, 47, 48: Danh mục & Thương hiệu
    CATEGORIES: "/categories",
    CATEGORY_DETAIL: (id) => `/categories/${moderatorId(id)}`,
    HIDE_CATEGORY: (id) => `/categories/${moderatorId(id)}/hide`,
    BRANDS: "/brands",
    BRAND_DETAIL: (id) => `/brands/${moderatorId(id)}`,
    HIDE_BRAND: (id) => `/brands/${moderatorId(id)}/hide`,

    // File Upload
    UPLOADS: "/uploads",

    // Đóng gói & GHN
    // Packing work is listed through QUEUES with params: { type: 'PACKING' }.
    SCAN_PACKING_PRODUCT: (orderId) => `/orders/${moderatorId(orderId)}/pack/scan`,
    CREATE_GHN_SHIPMENT: (orderId) => `/orders/${moderatorId(orderId)}/shipment`,

    // Xử lý hàng trả
    RETURNS: "/return-requests",
    RETURN_QUEUE: "/return-requests/queue",
    RETURN_DETAIL: (id) => `/return-requests/${moderatorId(id)}/detail`,
    APPROVE_RETURN: (id) => `/return-requests/${moderatorId(id)}/approve`,
    REJECT_RETURN: (id) => `/return-requests/${moderatorId(id)}/reject`,
    INSPECT_RETURN: (id) => `/return-requests/${moderatorId(id)}/inspect`,
    RESOLVE_RETURN: (id) => `/return-requests/${moderatorId(id)}/resolve`,
    REPORT_COUNTERFEIT: (id) => `/return-requests/${moderatorId(id)}/flag-counterfeit`,

    // Xác minh tổ chức & Duyệt đổi pháp lý
    VERIFICATION_QUEUE: "/organizations/verifications",
    ORG_VERIFICATION_DETAIL: (id) => `/organizations/${moderatorId(id)}/verification`,
    APPROVE_ORG: (id) => `/organizations/${moderatorId(id)}/verify`,
    REJECT_ORG: (id) => `/organizations/${moderatorId(id)}/reject`,
    LEGAL_CHANGES: "/organizations/legal-change-requests",
    APPROVE_LEGAL_CHANGE: (id) => `/organizations/legal-change-requests/${moderatorId(id)}/approve`,
    REJECT_LEGAL_CHANGE: (id) => `/organizations/legal-change-requests/${moderatorId(id)}/reject`,

    // Báo cáo vi phạm nội dung
    VIOLATION_REPORTS: "/violation-reports",
    VIOLATION_REPORT_DETAIL: (id) => `/violation-reports/${moderatorId(id)}`,
    RESOLVE_REPORT: (id) => `/violation-reports/${moderatorId(id)}/resolve`,
    DISMISS_REPORT: (id) => `/violation-reports/${moderatorId(id)}/dismiss`,

    // Hộp thư hỗ trợ kho
    WAREHOUSE_INBOX: "/conversations",
    WAREHOUSE_INBOX_DETAIL: (id) => `/conversations/${moderatorId(id)}`,
    SEND_INBOX_MESSAGE: (id) => `/conversations/${moderatorId(id)}/messages`,
    MARK_INBOX_DONE: (id) => `/conversations/${moderatorId(id)}/done`,
  },

  // 3. Admin (Quản trị viên nền tảng ReHome)
  ADMIN: {
    DASHBOARD: "/api/admin/dashboard",
    DASHBOARD_STATS: "/api/admin/dashboard/stats",
    DASHBOARD_FUND: "/api/admin/dashboard/fund",
    EXPORT_EXCEL: "/api/admin/dashboard/export-excel",

    USERS: "/api/admin/users",
    LOCK_USER: (id) => `/api/admin/users/${id}/lock`,
    UNLOCK_USER: (id) => `/api/admin/users/${id}/unlock`,

    MODERATORS: "/api/admin/moderators",
    CREATE_MODERATOR: "/api/admin/moderators",
    UPDATE_MODERATOR: (id) => `/api/admin/moderators/${id}`,
    ASSIGN_WAREHOUSE: (id) => `/api/admin/moderators/${id}/assign-warehouse`,

    WAREHOUSES: "/api/admin/warehouses",
    CREATE_WAREHOUSE: "/api/admin/warehouses",
    UPDATE_WAREHOUSE: (id) => `/api/admin/warehouses/${id}`,
    HIDE_WAREHOUSE: (id) => `/api/admin/warehouses/${id}/hide`,

    CONFIGS: "/api/admin/configs",
    UPDATE_CONFIGS: "/api/admin/configs/update",

    AUDIT_LOGS: "/api/admin/audit-logs",
  },

  // 4. Notifications (API 114)
  NOTIFICATIONS: {
    LIST: "/notifications",
    MARK_READ: (id) => `/notifications/${id}/read`,
  },

  // 5. Thanh toán MoMo - trang hiển thị kết quả sau khi được redirect về
  MOMO: {
    RETURN_INFO: "/api/momo/return-info",
  },

  // 6. Thanh toán VNPay - trang hiển thị kết quả sau khi được redirect về
  VNPAY: {
    RETURN_INFO: "/api/vnpay/return-info",
  },
};
