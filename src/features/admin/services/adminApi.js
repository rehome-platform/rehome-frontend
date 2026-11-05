import baseApi from '../../../services/baseApi.js';
import { API_ENDPOINTS } from '../../../configs/api.config.js';

/**
 * Dịch vụ API chuyên biệt cho phân hệ Quản trị ReHome (Admin)
 * Kết nối trực tiếp với backend Spring Boot theo hợp đồng API sau Review 2
 */
export const adminApi = {
  // 1. Dashboard & Báo cáo
  async getDashboard() {
    const res = await baseApi.get(API_ENDPOINTS.ADMIN.DASHBOARD);
    return res.data?.data || res.data;
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
    return res.data?.data || res.data;
  },

  async banAccount(accountId, reason) {
    const res = await baseApi.post(API_ENDPOINTS.ADMIN.BAN_ACCOUNT(accountId), { reason });
    return res.data?.data || res.data;
  },

  async unbanAccount(accountId) {
    const res = await baseApi.post(API_ENDPOINTS.ADMIN.UNBAN_ACCOUNT(accountId));
    return res.data?.data || res.data;
  },

  // 3. Quản lý Điểm kí gửi (Kho)
  async getWarehouses(status) {
    const params = {};
    if (status && status !== 'ALL') params.status = status;
    const res = await baseApi.get(API_ENDPOINTS.ADMIN.WAREHOUSES, { params });
    return res.data?.data || res.data;
  },

  async createWarehouse(data) {
    const res = await baseApi.post(API_ENDPOINTS.ADMIN.CREATE_WAREHOUSE, data);
    return res.data?.data || res.data;
  },

  async updateWarehouse(id, data) {
    const res = await baseApi.put(API_ENDPOINTS.ADMIN.UPDATE_WAREHOUSE(id), data);
    return res.data?.data || res.data;
  },

  async hideWarehouse(id) {
    const res = await baseApi.post(API_ENDPOINTS.ADMIN.HIDE_WAREHOUSE(id));
    return res.data?.data || res.data;
  },

  // 4. Quản lý Nhân sự Moderator
  async getModerators({ warehouseId, search, status, page = 0, size = 50 } = {}) {
    const params = { page, size };
    if (warehouseId) params.warehouseId = warehouseId;
    if (search && search.trim()) params.search = search.trim();
    if (status && status !== 'ALL') params.status = status;
    const res = await baseApi.get(API_ENDPOINTS.ADMIN.MODERATORS, { params });
    return res.data?.data || res.data;
  },

  async createModerator(data) {
    const res = await baseApi.post(API_ENDPOINTS.ADMIN.CREATE_MODERATOR, data);
    return res.data?.data || res.data;
  },

  async updateModerator(id, data) {
    const res = await baseApi.put(API_ENDPOINTS.ADMIN.UPDATE_MODERATOR(id), data);
    return res.data?.data || res.data;
  },

  async assignWarehouse(moderatorId, warehouseId) {
    const res = await baseApi.patch(API_ENDPOINTS.ADMIN.CHANGE_WAREHOUSE(moderatorId), { warehouseId });
    return res.data?.data || res.data;
  },

  // 5. Nhật ký kiểm soát (Audit Log)
  async getAuditLogs({ actorAccountId, actionType, targetType, targetId, from, to, page = 0, size = 20 } = {}) {
    const params = { page, size };
    if (actorAccountId) params.actorAccountId = actorAccountId;
    if (actionType && actionType !== 'ALL') params.actionType = actionType;
    if (targetType && targetType !== 'ALL') params.targetType = targetType;
    if (targetId && targetId.trim()) params.targetId = targetId.trim();
    if (from) params.from = from;
    if (to) params.to = to;

    const res = await baseApi.get(API_ENDPOINTS.ADMIN.AUDIT_LOGS, { params });
    return res.data?.data || res.data;
  },

  async getAuditLogFilterOptions() {
    const res = await baseApi.get(API_ENDPOINTS.ADMIN.AUDIT_LOG_FILTER_OPTIONS);
    return res.data?.data || res.data;
  },

  // 6. Cấu hình Tham số Hệ thống
  async getConfigs() {
    try {
      const res = await baseApi.get(API_ENDPOINTS.ADMIN.CONFIGS);
      return res.data?.data || res.data;
    } catch {
      return null;
    }
  },

  async updateConfig(key, value) {
    const res = await baseApi.put(API_ENDPOINTS.ADMIN.UPDATE_CONFIG(key), { value: String(value) });
    return res.data?.data || res.data;
  },

  // 7. Thư viện Từ vựng Vi phạm (Hỗ trợ API backend hoặc Local Storage Adapter)
  async getViolationWords() {
    try {
      const res = await baseApi.get(API_ENDPOINTS.ADMIN.VIOLATION_WORDS);
      return res.data?.data || res.data;
    } catch {
      // Local fallback nếu backend endpoint chưa triển khai
      const raw = localStorage.getItem('rehome_admin_violation_words');
      if (raw) return JSON.parse(raw);
      const defaultWords = [
        {
          id: 'VW-001',
          word: 'hàng giả',
          category: 'FRAUD',
          categoryLabel: 'Gian lận & Hàng giả',
          severity: 'BLOCKED',
          action: 'Chặn tự động',
          isActive: true,
          reason: 'Cấm kinh doanh hàng nhái, hàng vi phạm sở hữu trí tuệ',
          updatedAt: '2026-10-15T09:30:00Z',
        },
        {
          id: 'VW-002',
          word: 'lừa đảo',
          category: 'PROFANITY',
          categoryLabel: 'Lừa đảo & Chiếm đoạt',
          severity: 'BLOCKED',
          action: 'Chặn tự động',
          isActive: true,
          reason: 'Từ ngữ liên quan hành vi lừa đảo',
          updatedAt: '2026-10-18T14:20:00Z',
        },
        {
          id: 'VW-003',
          word: 'chuyển khoản ngoài',
          category: 'FRAUD',
          categoryLabel: 'Giao dịch ngoài sàn',
          severity: 'WARNING',
          action: 'Cảnh báo & Đưa vào hàng đợi',
          isActive: true,
          reason: 'Hành vi né phí nền tảng và tiềm ẩn rủi ro cho người mua',
          updatedAt: '2026-10-20T11:00:00Z',
        },
        {
          id: 'VW-004',
          word: 'tục tĩu',
          category: 'INAPPROPRIATE',
          categoryLabel: 'Ngôn từ không phù hợp',
          severity: 'BLOCKED',
          action: 'Chặn tự động',
          isActive: true,
          reason: 'Vi phạm chuẩn mực văn hóa ứng xử cộng đồng ReHome',
          updatedAt: '2026-10-25T16:45:00Z',
        },
        {
          id: 'VW-005',
          word: 'vũ khí',
          category: 'ILLEGAL',
          categoryLabel: 'Hàng cấm pháp luật',
          severity: 'BLOCKED',
          action: 'Chặn & Khóa tài khoản',
          isActive: true,
          reason: 'Hàng hóa cấm lưu hành theo luật định',
          updatedAt: '2026-11-01T08:15:00Z',
        },
      ];
      localStorage.setItem('rehome_admin_violation_words', JSON.stringify(defaultWords));
      return defaultWords;
    }
  },

  async saveViolationWords(words) {
    localStorage.setItem('rehome_admin_violation_words', JSON.stringify(words));
    try {
      await baseApi.post(API_ENDPOINTS.ADMIN.VIOLATION_WORDS, words);
    } catch {}
    return words;
  },
};

export default adminApi;

