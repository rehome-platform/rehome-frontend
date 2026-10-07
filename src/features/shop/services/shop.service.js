/**
 * ReHome - Shop Feature Service
 * Consignment receipts, pricing, PayOS settlement, and returns
 */
import baseApi from '../../../services/baseApi.js';
import { API_ENDPOINTS } from '../../../configs/api.config.js';

export const shopService = {
  getReceipts: async (params = {}) => {
    const res = await baseApi.get(API_ENDPOINTS.SHOP.RECEIPTS, { params });
    return res.data;
  },

  createReceipt: async (receiptData) => {
    const res = await baseApi.post(API_ENDPOINTS.SHOP.CREATE_RECEIPT, receiptData);
    return res.data;
  },

  getConsignments: async (params = {}) => {
    const res = await baseApi.get(API_ENDPOINTS.SHOP.CONSIGNMENTS, { params });
    return res.data;
  },

  updatePrice: async (consignmentId, newPrice) => {
    const res = await baseApi.put(API_ENDPOINTS.SHOP.UPDATE_PRICE, {
      consignmentId,
      newPrice,
    });
    return res.data;
  },

  createPayOSSettlement: async (payload) => {
    const res = await baseApi.post(API_ENDPOINTS.SHOP.SETTLEMENT, payload);
    return res.data;
  },

  returnConsignment: async (payload) => {
    const res = await baseApi.post(API_ENDPOINTS.SHOP.RETURN_ITEM, payload);
    return res.data;
  },

  createDualLabelProduct: async (productData) => {
    const res = await baseApi.post(API_ENDPOINTS.SHOP.PRODUCTS, productData);
    return res.data;
  },
};

export default shopService;
