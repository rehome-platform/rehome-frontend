import baseApi from '../../../services/baseApi.js';
import { API_ENDPOINTS } from '../../../configs/api.config.js';

/**
 * Trích xuất dữ liệu trả về từ Spring Boot ApiResponse:
 * Backend Spring Boot chuẩn hoá cấu trúc envelope: { result: T, isSuccess: boolean, message: String }
 */
function unwrap(res) {
  if (!res) return null;
  return res.data?.result ?? res.data?.data ?? res.data;
}

/**
 * Dịch vụ API chuyên biệt cho phân hệ Quản trị ReHome (Admin)
 * Kết nối trực tiếp với backend Spring Boot theo hợp đồng API sau Review 2
 */
export const adminApi = {
  // 1. Dashboard & Báo cáo
  async getDashboard() {
    const res = await baseApi.get(API_ENDPOINTS.ADMIN.DASHBOARD);
    return unwrap(res);
  },

  async exportDashboard(from, to) {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const res = await baseApi.get(API_ENDPOINTS.ADMIN.EXPORT_EXCEL, {
      params,
      responseType: 'blob',
    });
    return res.data;
  },

  // 2. Quản lý Tài khoản (Member, Moderator, Organization)
  async getAccounts({ search, role, status, page = 0, size = 20 } = {}) {
    const params = { page, size };
    if (search && search.trim()) params.search = search.trim();
    if (role && role !== 'ALL') params.role = role;
    if (status && status !== 'ALL') params.status = status;

    const res = await baseApi.get(API_ENDPOINTS.ADMIN.ACCOUNTS, { params });
    return unwrap(res);
  },

  async banAccount(accountId, reason) {
    const res = await baseApi.post(API_ENDPOINTS.ADMIN.BAN_ACCOUNT(accountId), { reason });
    return unwrap(res);
  },

  async unbanAccount(accountId) {
    const res = await baseApi.post(API_ENDPOINTS.ADMIN.UNBAN_ACCOUNT(accountId));
    return unwrap(res);
  },

  // 3. Quản lý Điểm kí gửi (Kho)
  async getWarehouses(status) {
    const params = {};
    if (status && status !== 'ALL') params.status = status;
    const res = await baseApi.get(API_ENDPOINTS.ADMIN.WAREHOUSES, { params });
    return unwrap(res);
  },

  async createWarehouse(data) {
    const res = await baseApi.post(API_ENDPOINTS.ADMIN.CREATE_WAREHOUSE, data);
    return unwrap(res);
  },

  async updateWarehouse(id, data) {
    const res = await baseApi.put(API_ENDPOINTS.ADMIN.UPDATE_WAREHOUSE(id), data);
    return unwrap(res);
  },

  async hideWarehouse(id) {
    const res = await baseApi.post(API_ENDPOINTS.ADMIN.HIDE_WAREHOUSE(id));
    return unwrap(res);
  },

  // Đơn vị hành chính GHN 2 cấp
  async getProvinces() {
    const res = await baseApi.get(API_ENDPOINTS.ADDRESS_UNITS.PROVINCES);
    return unwrap(res);
  },

  async getWards(provinceId) {
    const res = await baseApi.get(API_ENDPOINTS.ADDRESS_UNITS.WARDS, {
      params: { provinceId },
    });
    return unwrap(res);
  },

  // 4. Quản lý Nhân sự Moderator
  async getModerators({ warehouseId, search, status, page = 0, size = 50 } = {}) {
    const params = { page, size };
    if (warehouseId) params.warehouseId = warehouseId;
    if (search && search.trim()) params.search = search.trim();
    if (status && status !== 'ALL') params.status = status;
    const res = await baseApi.get(API_ENDPOINTS.ADMIN.MODERATORS, { params });
    return unwrap(res);
  },

  async createModerator(data) {
    const res = await baseApi.post(API_ENDPOINTS.ADMIN.CREATE_MODERATOR, data);
    return unwrap(res);
  },

  async updateModerator(id, data) {
    const res = await baseApi.put(API_ENDPOINTS.ADMIN.UPDATE_MODERATOR(id), data);
    return unwrap(res);
  },

  async assignWarehouse(moderatorId, warehouseId) {
    const res = await baseApi.patch(API_ENDPOINTS.ADMIN.CHANGE_WAREHOUSE(moderatorId), { warehouseId });
    return unwrap(res);
  },

  // 5. Nhật ký kiểm soát (Audit Log)
  async getAuditLogs({ actorAccountId, search, actionType, actionTypes, targetType, targetId, from, to, page = 0, size = 20 } = {}) {
    const params = { page, size };
    if (actorAccountId) params.actorAccountId = actorAccountId;
    if (search && search.trim()) params.search = search.trim();
    if (actionType && actionType !== 'ALL') params.actionType = actionType;
    if (actionTypes) {
      params.actionTypes = Array.isArray(actionTypes) ? actionTypes.join(',') : actionTypes;
    }
    if (targetType && targetType !== 'ALL') params.targetType = targetType;
    if (targetId && targetId.trim()) params.targetId = targetId.trim();
    if (from) params.from = from;
    if (to) params.to = to;

    const res = await baseApi.get(API_ENDPOINTS.ADMIN.AUDIT_LOGS, { params });
    return unwrap(res);
  },

  async getAuditLogFilterOptions() {
    const res = await baseApi.get(API_ENDPOINTS.ADMIN.AUDIT_LOG_FILTER_OPTIONS);
    return unwrap(res);
  },

  // 6. Cấu hình đang áp dụng và cập nhật từng tham số.
  async getConfigs() {
    const res = await baseApi.get(API_ENDPOINTS.ADMIN.CONFIGS);
    return unwrap(res);
  },

  async updateConfig(key, value) {
    const res = await baseApi.put(API_ENDPOINTS.ADMIN.UPDATE_CONFIG(key), { value: String(value) });
    return unwrap(res);
  },

  // 7. Tiếp nhận & Xử lý Đề xuất khóa tài khoản từ Moderator (PROPOSE_BAN)
  async getBanProposals({ page = 0, size = 50 } = {}) {
    return adminApi.getAuditLogs({
      actionType: 'VIOLATION_RESOLVE_PROPOSE_BAN',
      page,
      size,
    });
  },

  async getOrganizationViolationAuditLogs(targetId) {
    if (!targetId) return [];
    const res = await adminApi.getAuditLogs({
      targetId: String(targetId),
      actionTypes: [
        'VIOLATION_RESOLVE_REMOVE_POST',
        'VIOLATION_RESOLVE_HIDE_CAMPAIGN',
        'VIOLATION_RESOLVE_WARN_ORG',
        'VIOLATION_RESOLVE_PROPOSE_BAN',
      ],
      page: 0,
      size: 50,
    });
    return Array.isArray(res) ? res : res?.content || [];
  },

  async getViolationReportDetail(reportId) {
    if (!reportId) return null;
    try {
      const res = await baseApi.get(API_ENDPOINTS.MODERATOR.VIOLATION_REPORT_DETAIL(reportId));
      return unwrap(res);
    } catch {
      return null;
    }
  },

  getDismissedProposals() {
    try {
      const raw = localStorage.getItem('rehome_admin_dismissed_ban_proposals');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  dismissBanProposal(proposalId) {
    try {
      const current = adminApi.getDismissedProposals();
      if (!current.includes(String(proposalId))) {
        const updated = [...current, String(proposalId)];
        localStorage.setItem('rehome_admin_dismissed_ban_proposals', JSON.stringify(updated));
        return updated;
      }
      return current;
    } catch {
      return [];
    }
  },
};

export default adminApi;

