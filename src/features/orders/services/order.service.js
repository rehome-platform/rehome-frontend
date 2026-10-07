/**
 * ReHome - Orders & Delivery Service
 */
import baseApi from '../../../services/baseApi.js';
import { API_ENDPOINTS } from '../../../configs/api.config.js';

export const orderService = {
  getOrders: async (params = {}) => {
    const res = await baseApi.get(API_ENDPOINTS.ORDERS.LIST, { params });
    return res.data;
  },

  getOrderDetail: async (id) => {
    const res = await baseApi.get(API_ENDPOINTS.ORDERS.DETAIL(id));
    return res.data;
  },

  confirmPackaging: async (id, photoUrl) => {
    const res = await baseApi.post(API_ENDPOINTS.ORDERS.CONFIRM_PACKAGING(id), { photoUrl });
    return res.data;
  },

  getTrackingInfo: async (id) => {
    const res = await baseApi.get(API_ENDPOINTS.ORDERS.TRACKING(id));
    return res.data;
  },
};

export default orderService;
