/**
 * ReHome API Configuration
 * Base URL and centralized API Endpoints
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://prm393.up.railway.app";
export const WS_BASE_URL = `${API_BASE_URL.replace(/^http/, 'ws')}/ws`;

export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    REGISTER_ORG: "/api/auth/register-org",
    REFRESH: "/api/auth/refresh",
    LOGOUT: "/api/auth/logout",
    ME: "/api/auth/me",
    FORGOT_PASSWORD: "/api/auth/forgot-password",
  },
  // Shop Consignment & Inventory
  SHOP: {
    RECEIPTS: "/api/shop/receipts",
    CONSIGNMENTS: "/api/shop/consignments",
    CREATE_RECEIPT: "/api/shop/receipts/create",
    UPDATE_PRICE: "/api/shop/receipts/price",
    SETTLEMENT: "/api/shop/settlement/payos",
    RETURN_ITEM: "/api/shop/consignments/return",
    PRODUCTS: "/api/shop/products",
  },
  // Charity & Organization
  ORGANIZER: {
    CAMPAIGNS: "/api/org/campaigns",
    CHECKIN: "/api/org/donations/check-in",
    VERIFY_CODE: "/api/org/donations/verify",
    STATS: "/api/org/stats",
  },
  // Staff & Moderator
  MODERATOR: {
    VERIFICATION_QUEUE: "/api/staff/verifications",
    APPROVE_ORG: "/api/staff/organizations/approve",
    REJECT_ORG: "/api/staff/organizations/reject",
    DISPUTES: "/api/staff/disputes",
    RESOLVE_DISPUTE: "/api/staff/disputes/resolve",
    AUDIT_LOGS: "/api/audit/logs",
    CATEGORIES: "/api/staff/categories",
  },
  // Admin System Management
  ADMIN: {
    DASHBOARD: "/api/admin/dashboard",
    CONFIGS: "/api/admin/configs",
    UPDATE_CONFIG: "/api/admin/configs/update",
    USERS: "/api/admin/users",
    LOCK_USER: "/api/admin/users/lock",
    UNLOCK_USER: "/api/admin/users/unlock",
  },
  // Orders & Delivery
  ORDERS: {
    LIST: "/api/orders",
    DETAIL: (id) => `/api/orders/${id}`,
    CONFIRM_PACKAGING: (id) => `/api/orders/${id}/packaging`,
    TRACKING: (id) => `/api/orders/${id}/tracking`,
  },
  // Wallet & Settlement
  WALLET: {
    BALANCE: "/api/wallet/balance",
    HISTORY: "/api/wallet/history",
    TOPUP_PAYOS: "/api/wallet/topup",
    WITHDRAWAL: "/api/wallet/withdraw",
  },
  // Notifications & Realtime
  NOTIFICATIONS: {
    LIST: "/api/notifications",
    MARK_READ: (id) => `/api/notifications/${id}/read`,
  },
};
