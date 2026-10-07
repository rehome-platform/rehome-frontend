/**
 * ReHome - Wallet & Finance Service
 */
import baseApi from '../../../services/baseApi.js';
import { API_ENDPOINTS } from '../../../configs/api.config.js';

export const walletService = {
  getBalance: async () => {
    const res = await baseApi.get(API_ENDPOINTS.WALLET.BALANCE);
    return res.data;
  },

  getHistory: async (params = {}) => {
    const res = await baseApi.get(API_ENDPOINTS.WALLET.HISTORY, { params });
    return res.data;
  },

  createPayOSTopUp: async (amount) => {
    const res = await baseApi.post(API_ENDPOINTS.WALLET.TOPUP_PAYOS, { amount });
    return res.data;
  },

  requestWithdrawal: async (payload) => {
    const res = await baseApi.post(API_ENDPOINTS.WALLET.WITHDRAWAL, payload);
    return res.data;
  },
};

export default walletService;
