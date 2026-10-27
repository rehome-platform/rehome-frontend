/**
 * ReHome - Return Processing Domain API Service
 * Wireframe: TH-01, TH-02, TH-03, TH-04, TH-08
 * Specialization: Yêu cầu trả hàng & Kiểm tra hàng về kho
 */
import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { isFixtureMode } from '../config/warehouseContract.js';
import { callBackend } from './warehouseTransport.js';
import { returnMockApi } from './moderatorMockData.js';

export const returnService = {
  /**
   * API 80 / F-131: Lấy danh sách hàng đợi yêu cầu trả hàng
   */
  list: async (params = {}, options = {}) => {
    const fallback = () => returnMockApi.list(params);
    if (isFixtureMode) return fallback();

    try {
      const status = params?.status && params.status !== 'ALL' ? params.status : undefined;
      const res = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.RETURNS,
          params: {
            ...(status ? { status } : {}),
            ...(params?.page !== undefined ? { page: params.page } : {}),
            ...(params?.size !== undefined ? { size: params.size } : {}),
          },
        },
        { fallback, signal: options?.signal }
      );

      if (res && Array.isArray(res.data)) return res;
      if (Array.isArray(res)) return { data: res, total: res.length };
      if (res && Array.isArray(res.items)) return { data: res.items, total: res.total || res.items.length };
      return fallback();
    } catch (err) {
      if (fallback) return fallback();
      throw err;
    }
  },

  /**
   * API 80: Lấy chi tiết một yêu cầu trả hàng
   */
  detail: async (retId, options = {}) => {
    const fallback = () => returnMockApi.detail(retId);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.RETURN_DETAIL(retId),
        },
        { fallback, signal: options?.signal }
      );
      return res?.data || res || fallback();
    } catch (err) {
      if (fallback) return fallback();
      throw err;
    }
  },

  /**
   * API 83 / F-131: Duyệt yêu cầu trả hàng & Tạo vận đơn thu hồi GHN
   */
  approveReturnAndCreateWaybill: async (retId, options = {}) => {
    const fallback = () => returnMockApi.approveReturnAndCreateWaybill(retId);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.APPROVE_RETURN(retId),
        },
        { fallback, signal: options?.signal }
      );
      return res?.data || res || fallback();
    } catch (err) {
      if (fallback) return fallback();
      throw err;
    }
  },

  /**
   * API 84 / F-131: Từ chối yêu cầu trả hàng kèm lý do
   */
  rejectReturn: async (retId, reason, options = {}) => {
    const fallback = () => returnMockApi.rejectReturn(retId, reason);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.REJECT_RETURN(retId),
          data: { reason },
        },
        { fallback, signal: options?.signal }
      );
      return res?.data || res || fallback();
    } catch (err) {
      if (fallback) return fallback();
      throw err;
    }
  },

  /**
   * API 88 / F-133: Chốt xử lý hợp lệ (Hoàn tiền + Chọn Relist hoặc Return Seller)
   */
  resolveValid: async (retId, outcome, options = {}) => {
    const fallback = () => returnMockApi.resolveValid(retId, outcome);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.RESOLVE_RETURN(retId),
          data: {
            resolution: 'VALID',
            action: outcome,
            resolutionNote: 'Hàng đúng tình trạng, duyệt hoàn tiền',
          },
        },
        { fallback, signal: options?.signal }
      );
      return res?.data || res || fallback();
    } catch (err) {
      if (fallback) return fallback();
      throw err;
    }
  },

  /**
   * API 88 / F-133: Chốt xử lý không hợp lệ (Lưu kho 7 ngày chờ khách nhận lại)
   */
  resolveInvalid: async (retId, reason, options = {}) => {
    const fallback = () => returnMockApi.resolveInvalid(retId, reason);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.RESOLVE_RETURN(retId),
          data: {
            resolution: 'INVALID',
            action: 'DISCARD',
            resolutionNote: reason,
          },
        },
        { fallback, signal: options?.signal }
      );
      return res?.data || res || fallback();
    } catch (err) {
      if (fallback) return fallback();
      throw err;
    }
  },
};

export default returnService;
