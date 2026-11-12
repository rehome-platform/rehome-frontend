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
export function getSockJsUrl(baseUrl = API_BASE_URL, endpoint = "/ws") {
  if (!baseUrl) return "";
  const httpUrl = String(baseUrl)
    .replace(/^ws:\/\//i, "http://")
    .replace(/^wss:\/\//i, "https://");
  const cleanBase = httpUrl.replace(/\/+$/, "");
  const cleanEndpoint = String(endpoint).startsWith("/") ? endpoint : `/${endpoint}`;
  return `${cleanBase}${cleanEndpoint}`;
}

export function getWsSockJsUrl(baseUrl = API_BASE_URL) {
  return getSockJsUrl(baseUrl, "/ws-sockjs");
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
    MY_PRODUCTS: "/products/mine",
    DECIDE_END_OF_TERM: (id) => `/end-of-term-decisions/${id}/decide`,
    CONFIRM_RECEIPT: (id) => `/consignment-receipts/${id}/confirm`,
  },

  // 2. Moderator (Nhân viên vận hành kho & Kiểm duyệt viên tại chi nhánh kho) - API 25 -> 48
  MODERATOR: {
    // Ký gửi lại & Xử lý cuối kỳ (KD-11)
    RECONSIGN_TERMS: (decisionId) => `/end-of-term-decisions/${moderatorId(decisionId)}/re-consign-terms`,
    PENDING_PRICING: "/end-of-term-decisions/pending-pricing",
    CONFIRM_RECEIPT: (id) => `/consignment-receipts/${moderatorId(id)}/confirm`,
    // API 25, 26, 27: Quầy tiếp nhận & Tra cứu Member
    COUNTER_LOOKUP: "/counter/lookup",
    MY_WAREHOUSES: "/warehouses/moderator",
    WAREHOUSE_CAMPAIGNS: (warehouseId) => `/warehouses/${moderatorId(warehouseId)}/campaigns`,
    PUBLIC_CAMPAIGNS: "/campaigns",
    WAREHOUSE_DONATIONS: (warehouseId) => `/warehouses/${moderatorId(warehouseId)}/donations`,
    HANDOVER_DONATIONS: (warehouseId) => `/warehouses/${moderatorId(warehouseId)}/donations/handover`,
    COUNTER_CONFIRM_IDENTITY: (accountId) => `/counter/members/${moderatorId(accountId)}/confirm-identity`,
    COUNTER_TASKS: (accountId) => `/counter/members/${moderatorId(accountId)}/tasks`,
    COUNTER_HANDOVER: "/counter/handover",

    // API 28, 29, 30: Hàng đợi công việc kho
    QUEUES: "/queues",
    CLAIM_QUEUE: (id) => `/queues/${moderatorId(id)}/claim`,
    RELEASE_QUEUE: (id) => `/queues/${moderatorId(id)}/release`,
    APPROVE_WITHDRAWAL: (id) => `/item-withdrawal-requests/${moderatorId(id)}/approve`,
    REJECT_WITHDRAWAL: (id) => `/item-withdrawal-requests/${moderatorId(id)}/reject`,

    // API 31, 32, 33, 34, 35: Quy trình duyệt form & kiểm định ký gửi
    APPROVE_FORM: (id) => `/consignment-forms/${moderatorId(id)}/approve`,
    REJECT_FORM: (id) => `/consignment-forms/${moderatorId(id)}/reject`,
    START_INSPECTION: (id) => `/consignment-forms/${moderatorId(id)}/inspection/start`,
    COMPLETE_INSPECTION: (id) => `/consignment-forms/${moderatorId(id)}/inspection/complete`,
    RETURN_ONSITE: (id) => `/consignment-forms/${moderatorId(id)}/return-onsite`,
    CONSIGNMENT_FORMS: "/moderator/consignment-forms",
    CONSIGNMENT_FORM_DETAIL: (id) => `/moderator/consignment-forms/${moderatorId(id)}`,
    RECEIPT_DETAIL: (id) => `/consignment-receipts/${moderatorId(id)}`,
    RECEIPT_PDF: (id) => `/consignment-receipts/${moderatorId(id)}/pdf`,

    // API 36, 37, 38, 39, 40, 41, 42, 43: Tồn kho & Sản phẩm
    CREATE_PRODUCT: "/products",
    CONFIRM_UNCLAIMED_TRANSFER: (id) => `/products/${moderatorId(id)}/unclaimed/confirm-transfer`,
    PRODUCT_SKU_LABEL: (id) => `/products/${moderatorId(id)}/sku-label`,
    PRODUCT_DETAIL: (id) => `/products/detail/${moderatorId(id)}`,
    INVENTORY: "/inventory",
    PRODUCT_BY_SKU: (sku) => `/products/${moderatorId(sku)}`,

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
    RETURNS: "/return-requests/queue",
    RETURN_QUEUE: "/return-requests/queue",
    RETURN_DETAIL: (id) => `/return-requests/${moderatorId(id)}/detail`,
    APPROVE_RETURN: (id) => `/return-requests/${moderatorId(id)}/approve`,
    REJECT_RETURN: (id) => `/return-requests/${moderatorId(id)}/reject`,
    INSPECT_RETURN: (id) => `/return-requests/${moderatorId(id)}/inspect`,
    RESOLVE_RETURN: (id) => `/return-requests/${moderatorId(id)}/resolve`,
    REPORT_COUNTERFEIT: (id) => `/return-requests/${moderatorId(id)}/flag-counterfeit`,
    FLAG_COUNTERFEIT: (id) => `/return-requests/${moderatorId(id)}/flag-counterfeit`,
    COUNTERFEIT_CONCLUSION: (id) => `/return-requests/${moderatorId(id)}/counterfeit-conclusion`,
    MARK_LOST: (id) => `/return-requests/${moderatorId(id)}/mark-lost`,
    DEGRADED_CASES: "/degraded-item-cases",
    WAREHOUSE_DEGRADED_CASES: "/degraded-item-cases/warehouse",
    CREATE_DEGRADED_CASE: "/degraded-item-cases",
    DEGRADED_CASE_DETAIL: (id) => `/degraded-item-cases/${moderatorId(id)}`,

    // Xác minh tổ chức & Duyệt đổi pháp lý
    VERIFICATION_QUEUE: "/queues?type=ORG_VERIFICATION",
    ORG_VERIFICATION_DETAIL: (id) => `/api/organizations/${moderatorId(id)}/verification`,
    APPROVE_ORG: (id) => `/api/organizations/${moderatorId(id)}/verify`,
    REJECT_ORG: (id) => `/api/organizations/${moderatorId(id)}/reject`,
    LEGAL_CHANGES: "/queues?type=LEGAL_CHANGE",
    LEGAL_CHANGE_DETAIL: (id) => `/api/organizations/legal-change-requests/${moderatorId(id)}`,
    APPROVE_LEGAL_CHANGE: (id) => `/api/organizations/legal-change-requests/${moderatorId(id)}/approve`,
    REJECT_LEGAL_CHANGE: (id) => `/api/organizations/legal-change-requests/${moderatorId(id)}/reject`,
    ORGANIZATIONS: "/api/organizations",
    ORGANIZATION_PUBLIC_DETAIL: (id) => `/api/organizations/${moderatorId(id)}`,

    // Báo cáo vi phạm nội dung
    VIOLATION_REPORTS: "/violation-reports",
    VIOLATION_REPORT_DETAIL: (id) => `/violation-reports/${moderatorId(id)}`,
    RESOLVE_REPORT: (id) => `/violation-reports/${moderatorId(id)}/resolve`,
    DISMISS_REPORT: (id) => `/violation-reports/${moderatorId(id)}/dismiss`,

    // Hộp thư hỗ trợ kho
    WAREHOUSE_INBOX: "/conversations",
    WAREHOUSE_INBOX_DETAIL: (id) => `/conversations/${moderatorId(id)}`,
    WAREHOUSE_INBOX_MESSAGES: (id) => `/conversations/${moderatorId(id)}/messages`,
    SEND_INBOX_MESSAGE: (id) => `/conversations/${moderatorId(id)}/messages`,
    MARK_INBOX_DONE: (id) => `/conversations/${moderatorId(id)}/done`,
  },

  // 3. Admin (Quản trị viên nền tảng ReHome)
  ADMIN: {
    DASHBOARD: "/api/admin/dashboard",
    DASHBOARD_STATS: "/api/admin/dashboard/stats",
    DASHBOARD_FUND: "/api/admin/dashboard/fund",
    EXPORT_EXCEL: "/api/admin/dashboard/export",
    REVENUE_ITEMS: "/api/admin/revenue/items",
    FUND_LEDGER: "/api/admin/fund/ledger",
    FUND_RECONCILIATION: "/api/admin/fund/reconciliation",
    ACCOUNTS_GROWTH: "/api/admin/accounts/growth",

    ACCOUNTS: "/api/admin/accounts",
    USERS: "/api/admin/accounts",
    BAN_ACCOUNT: (id) => `/api/admin/accounts/${id}/ban`,
    UNBAN_ACCOUNT: (id) => `/api/admin/accounts/${id}/unban`,
    LOCK_USER: (id) => `/api/admin/accounts/${id}/ban`,
    UNLOCK_USER: (id) => `/api/admin/accounts/${id}/unban`,

    MODERATORS: "/api/admin/moderators",
    CREATE_MODERATOR: "/api/admin/moderators",
    UPDATE_MODERATOR: (id) => `/api/admin/moderators/${id}`,
    CHANGE_WAREHOUSE: (id) => `/api/admin/moderators/${id}/warehouse`,
    ASSIGN_WAREHOUSE: (id) => `/api/admin/moderators/${id}/warehouse`,

    WAREHOUSES: "/api/admin/warehouses",
    CREATE_WAREHOUSE: "/warehouses",
    UPDATE_WAREHOUSE: (id) => `/warehouses/${encodeURIComponent(id)}`,
    HIDE_WAREHOUSE: (id) => `/api/admin/warehouses/${id}/hide`,

    CONFIGS: "/api/admin/config",
    UPDATE_CONFIG: (key) => `/api/admin/config/${key}`,
    UPDATE_CONFIGS: "/api/admin/config",

    AUDIT_LOGS: "/api/admin/audit-logs",
    AUDIT_LOG_FILTER_OPTIONS: "/api/admin/audit-logs/filter-options",
  },

  // 4. Notifications (API 114)
  NOTIFICATIONS: {
    LIST: "/notifications",
    MARK_READ: (id) => `/notifications/${id}/read`,
    UNREAD_COUNT: "/notifications/unread-count",
    MARK_ALL_READ: "/notifications/read-all",
  },

  // 5. Thanh toán MoMo - trang hiển thị kết quả sau khi được redirect về
  MOMO: {
    RETURN_INFO: "/api/momo/return-info",
  },

  // 6. Thanh toán VNPay - trang hiển thị kết quả sau khi được redirect về
  VNPAY: {
    RETURN_INFO: "/api/vnpay/return-info",
  },

  // 7. Đơn vị hành chính GHN 2 cấp (Tỉnh/Thành -> Phường/Xã)
  ADDRESS_UNITS: {
    PROVINCES: "/address-units/provinces",
    WARDS: "/address-units/wards",
  },
};
