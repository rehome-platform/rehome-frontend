/**
 * ReHome API Configuration
 * Base URL and centralized API Endpoints theo Tài liệu tổng quan hệ thống (sau Review 1)
 * Dành cho hệ thống Web App (Admin & Moderator kho)
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://re-backend-9a98.onrender.com";
export const WS_BASE_URL = `${API_BASE_URL.replace(/^http/, 'ws')}/ws`;

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

  // 2. Moderator (Nhân viên vận hành kho & Kiểm duyệt viên tại chi nhánh kho)
  MODERATOR: {
    // Quầy tiếp nhận & Tra cứu Member
    COUNTER_LOOKUP: (query) => `/api/moderator/counter/lookup?q=${encodeURIComponent(query)}`,
    COUNTER_INSPECT: "/api/moderator/counter/inspect",
    COUNTER_HANDOVER: "/api/moderator/counter/handover",
    RECEIPT_DETAIL: (code) => `/api/moderator/receipts/${code}`,

    // Hàng đợi duyệt form online
    QUEUE_FORMS: "/api/moderator/queue/forms",
    CLAIM_FORM: (id) => `/api/moderator/queue/forms/${id}/claim`,
    APPROVE_FORM: (id) => `/api/moderator/queue/forms/${id}/approve`,
    REJECT_FORM: (id) => `/api/moderator/queue/forms/${id}/reject`,

    // Kho chi nhánh & Tồn kho
    INVENTORY: "/api/moderator/inventory",
    INVENTORY_UPDATE_SHELF: "/api/moderator/inventory/shelf",
    UNCLAIMED_ITEMS: "/api/moderator/inventory/unclaimed",
    CLEAR_UNCLAIMED: (id) => `/api/moderator/inventory/unclaimed/${id}/clear`,

    // Đóng gói & GHN
    ORDERS_PACKING: "/api/moderator/orders/packing",
    CREATE_GHN_SHIPMENT: (orderId) => `/api/moderator/orders/${orderId}/ghn-shipment`,

    // Xử lý hàng trả & Thẩm định 2 Mod nghi giả
    RETURNS: "/api/moderator/returns",
    INSPECT_RETURN: (id) => `/api/moderator/returns/${id}/inspect`,
    REPORT_COUNTERFEIT: (id) => `/api/moderator/returns/${id}/counterfeit`,

    // Xác minh tổ chức & Duyệt đổi pháp lý
    VERIFICATION_QUEUE: "/api/moderator/organizations/verifications",
    APPROVE_ORG: (id) => `/api/moderator/organizations/${id}/approve`,
    REJECT_ORG: (id) => `/api/moderator/organizations/${id}/reject`,
    LEGAL_CHANGES: "/api/moderator/organizations/legal-changes",
    APPROVE_LEGAL_CHANGE: (id) => `/api/moderator/organizations/legal-changes/${id}/approve`,

    // Báo cáo vi phạm nội dung
    VIOLATION_REPORTS: "/api/moderator/reports",
    RESOLVE_REPORT: (id) => `/api/moderator/reports/${id}/resolve`,

    // Quản lý Danh mục & Thương hiệu
    CATEGORIES: "/api/moderator/categories",
    BRANDS: "/api/moderator/brands",

    // Hộp thư hỗ trợ kho
    WAREHOUSE_INBOX: "/api/moderator/inbox",
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

  // 4. Notifications
  NOTIFICATIONS: {
    LIST: "/api/notifications",
    MARK_READ: (id) => `/api/notifications/${id}/read`,
  },

  // 5. Thanh toán MoMo - trang hiển thị kết quả sau khi được redirect về
  MOMO: {
    RETURN_INFO: "/api/momo/return-info",
  },
};
