/**
 * ReHome - Audit & Compliance Service
 */
import baseApi from '../../../services/baseApi.js';
import { API_ENDPOINTS } from '../../../configs/api.config.js';

export const auditService = {
  getAuditLogs: async (params = {}) => {
    const res = await baseApi.get(API_ENDPOINTS.MODERATOR.AUDIT_LOGS, { params });
    return res.data;
  },
};

export default auditService;
