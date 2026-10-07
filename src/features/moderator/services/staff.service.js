/**
 * ReHome - Moderator / Staff Service
 * Legal verification and dispute resolution
 */
import baseApi from '../../../services/baseApi.js';
import { API_ENDPOINTS } from '../../../configs/api.config.js';

export const staffService = {
  getVerificationQueue: async (params = {}) => {
    const res = await baseApi.get(API_ENDPOINTS.MODERATOR.VERIFICATION_QUEUE, { params });
    return res.data;
  },

  approveOrganization: async (id, notes) => {
    const res = await baseApi.post(`${API_ENDPOINTS.MODERATOR.APPROVE_ORG}/${id}`, { notes });
    return res.data;
  },

  rejectOrganization: async (id, reason) => {
    const res = await baseApi.post(`${API_ENDPOINTS.MODERATOR.REJECT_ORG}/${id}`, { reason });
    return res.data;
  },

  getDisputes: async (params = {}) => {
    const res = await baseApi.get(API_ENDPOINTS.MODERATOR.DISPUTES, { params });
    return res.data;
  },

  resolveDispute: async (id, resolution) => {
    const res = await baseApi.post(`${API_ENDPOINTS.MODERATOR.RESOLVE_DISPUTE}/${id}`, resolution);
    return res.data;
  },
};

export default staffService;
