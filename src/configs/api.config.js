/**
 * ReHome API Configuration
 * Base URL and centralized API Endpoints theo Tài liệu tổng quan hệ thống (sau Review 1)
 * Dành cho hệ thống Web App (Admin & Moderator kho)
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://re-backend-9a98.onrender.com";

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
    COUNTER_CONFIRM_IDENTITY: (accountId) => `/counter/members/${accountId}/confirm-identity`,
    COUNTER_TASKS: (accountId) => `/counter/members/${accountId}/tasks`,
    COUNTER_HANDOVER: "/counter/handover",

    // API 28, 29, 30: Hàng đợi công việc kho
    QUEUES: "/queues",
    CLAIM_QUEUE: (id) => `/queues/${id}/claim`,
    RELEASE_QUEUE: (id) => `/queues/${id}/release`,

    // API 31, 32, 33, 34, 35: Quy trình duyệt form & kiểm định ký gửi
    APPROVE_FORM: (id) => `/consignment-forms/${id}/approve`,
    REJECT_FORM: (id) => `/consignment-forms/${id}/reject`,
    START_INSPECTION: (id) => `/consignment-forms/${id}/inspection/start`,
    COMPLETE_INSPECTION: (id) => `/consignment-forms/${id}/inspection/complete`,
    RETURN_ONSITE: (id) => `/consignment-forms/${id}/return-onsite`,
    CONSIGNMENT_FORM_DETAIL: (id) => `/consignment-forms/${id}`,
    RECEIPT_DETAIL: (id) => `/consignment-receipts/${id}`,
    RECEIPT_PDF: (id) => `/consignment-receipts/${id}/pdf`,

    // API 36, 37, 38, 39, 40, 41, 42, 43: Tồn kho & Sản phẩm
    CREATE_PRODUCT: "/products",
    CONFIRM_UNCLAIMED_TRANSFER: (id) => `/products/${id}/unclaimed/confirm-transfer`,
    PRODUCT_PHOTOS: (id) => `/products/${id}/photos`,
    PRODUCT_SKU_LABEL: (id) => `/products/${id}/sku-label`,
    INVENTORY: "/inventory",
    PRODUCT_BY_SKU: (sku) => `/products/${sku}`,
    UPDATE_SHELF_LOCATION: (id) => `/products/${id}/shelf-location`,
    STOCK_MOVEMENTS: (id) => `/products/${id}/stock-movements`,

    // API 44, 45, 46, 47, 48: Danh mục & Thương hiệu
    CATEGORIES: "/categories",
    CATEGORY_DETAIL: (id) => `/categories/${id}`,
    HIDE_CATEGORY: (id) => `/categories/${id}/hide`,
    BRANDS: "/brands",
    BRAND_DETAIL: (id) => `/brands/${id}`,
    HIDE_BRAND: (id) => `/brands/${id}/hide`,

    // File Upload
    UPLOADS: "/uploads",

    // Đóng gói & GHN
    ORDERS_PACKING: "/orders/packing",
    CREATE_GHN_SHIPMENT: (orderId) => `/orders/${orderId}/shipment`,

    // Xử lý hàng trả
    RETURNS: "/return-requests",
    INSPECT_RETURN: (id) => `/return-requests/${id}/inspect`,
    REPORT_COUNTERFEIT: (id) => `/return-requests/${id}/flag-counterfeit`,

    // Xác minh tổ chức & Duyệt đổi pháp lý
    VERIFICATION_QUEUE: "/organizations/verifications",
    APPROVE_ORG: (id) => `/organizations/${id}/verify`,
    REJECT_ORG: (id) => `/organizations/${id}/reject`,
    LEGAL_CHANGES: "/organizations/legal-change-requests",
    APPROVE_LEGAL_CHANGE: (id) => `/organizations/legal-change-requests/${id}/approve`,

    // Báo cáo vi phạm nội dung
    VIOLATION_REPORTS: "/violation-reports",
    RESOLVE_REPORT: (id) => `/violation-reports/${id}/resolve`,

    // Hộp thư hỗ trợ kho
    WAREHOUSE_INBOX: "/conversations",
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
};
