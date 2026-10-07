/**
 * ReHome - Admin Service
 * System configurations, platform analytics, account moderation
 */
import baseApi from '../../../services/baseApi.js';
import { API_ENDPOINTS } from '../../../configs/api.config.js';

export const adminService = {
  getDashboardStats: async () => {
    const res = await baseApi.get(API_ENDPOINTS.ADMIN.DASHBOARD);
    return res.data;
  },

  getSystemConfigs: async () => {
    const res = await baseApi.get(API_ENDPOINTS.ADMIN.CONFIGS);
    return res.data;
  },

  updateSystemConfigs: async (configs) => {
    const res = await baseApi.post(API_ENDPOINTS.ADMIN.UPDATE_CONFIG, configs);
    return res.data;
  },

  getUsers: async (params = {}) => {
    const res = await baseApi.get(API_ENDPOINTS.ADMIN.USERS, { params });
    return res.data;
  },

  lockUser: async (userId, reason) => {
    const res = await baseApi.post(`${API_ENDPOINTS.ADMIN.LOCK_USER}/${userId}`, { reason });
    return res.data;
  },

  unlockUser: async (userId) => {
    const res = await baseApi.post(`${API_ENDPOINTS.ADMIN.UNLOCK_USER}/${userId}`);
    return res.data;
  },
};

export default adminService;
