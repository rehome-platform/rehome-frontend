/**
 * ReHome - Organizer Feature Service
 * Charity campaigns and donation check-ins
 */
import baseApi from '../../../services/baseApi.js';
import { API_ENDPOINTS } from '../../../configs/api.config.js';

export const orgService = {
  getCampaigns: async (params = {}) => {
    const res = await baseApi.get(API_ENDPOINTS.ORGANIZER.CAMPAIGNS, { params });
    return res.data;
  },

  createCampaign: async (campaignData) => {
    const res = await baseApi.post(API_ENDPOINTS.ORGANIZER.CAMPAIGNS, campaignData);
    return res.data;
  },

  verifyDonationCode: async (code) => {
    const res = await baseApi.post(API_ENDPOINTS.ORGANIZER.VERIFY_CODE, { code });
    return res.data;
  },

  checkInDonation: async (payload) => {
    const res = await baseApi.post(API_ENDPOINTS.ORGANIZER.CHECKIN, payload);
    return res.data;
  },

  getStats: async () => {
    const res = await baseApi.get(API_ENDPOINTS.ORGANIZER.STATS);
    return res.data;
  },
};

export default orgService;
