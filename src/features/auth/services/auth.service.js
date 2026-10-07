/**
 * ReHome - Authentication Service
 */
import baseApi from '../../../services/baseApi.js';
import { API_ENDPOINTS } from '../../../configs/api.config.js';

export const authService = {
  login: async (credentials) => {
    const res = await baseApi.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
    return res.data;
  },

  registerShop: async (shopData) => {
    const res = await baseApi.post(API_ENDPOINTS.AUTH.REGISTER, {
      ...shopData,
      role: 'shop',
    });
    return res.data;
  },

  registerOrg: async (orgData) => {
    const res = await baseApi.post(API_ENDPOINTS.AUTH.REGISTER_ORG, orgData);
    return res.data;
  },

  forgotPassword: async (email) => {
    const res = await baseApi.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
    return res.data;
  },

  getCurrentUser: async () => {
    const res = await baseApi.get(API_ENDPOINTS.AUTH.ME);
    return res.data;
  },
};

export default authService;
