/**
 * ReHome - Organization Verification Domain API Service
 * Wireframe: TC-01, TC-02, TC-03, TC-04, TC-05, TC-06
 * Specialization: Xác minh hồ sơ tổ chức từ thiện & Duyệt thay đổi pháp lý
 */
import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { isFixtureMode } from '../config/warehouseContract.js';
import { callBackend } from './warehouseTransport.js';
import { orgVerificationMockApi } from './moderatorMockData.js';

export const orgVerificationService = {
  /**
   * API 127 / F-111: Lấy hàng đợi hồ sơ tổ chức chờ xác minh
   */
  getQueue: async (params = {}, options = {}) => {
    const fallback = () => orgVerificationMockApi.getQueue(params);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.VERIFICATION_QUEUE,
          params,
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
   * API 131 / F-140: Lấy danh sách yêu cầu thay đổi thông tin pháp lý
   */
  getLegalChanges: async (params = {}, options = {}) => {
    const fallback = () => orgVerificationMockApi.getLegalChanges(params);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.LEGAL_CHANGES,
          params,
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
   * API 128 / F-137: Lấy chi tiết hồ sơ xác minh của tổ chức
   */
  getOrgDetail: async (orgId, options = {}) => {
    const fallback = () => orgVerificationMockApi.getOrgDetail(orgId);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.ORG_VERIFICATION_DETAIL(orgId),
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
   * API 129 / F-138: Xác thực hồ sơ tổ chức thành công
   */
  approveOrg: async (orgId, note, options = {}) => {
    const fallback = () => orgVerificationMockApi.approveOrg(orgId, note);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.APPROVE_ORG(orgId),
          data: { note, auditNote: note },
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
   * API 130 / F-138: Từ chối hồ sơ tổ chức kèm lý do
   */
  rejectOrg: async (orgId, reason, options = {}) => {
    const fallback = () => orgVerificationMockApi.rejectOrg(orgId, reason);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.REJECT_ORG(orgId),
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
   * API 131 / F-140: Duyệt yêu cầu thay đổi thông tin pháp lý
   */
  approveLegalChange: async (changeId, options = {}) => {
    const fallback = () => orgVerificationMockApi.approveLegalChange(changeId);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.APPROVE_LEGAL_CHANGE(changeId),
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
   * API 131 / F-140: Từ chối yêu cầu thay đổi thông tin pháp lý
   */
  rejectLegalChange: async (changeId, reason, options = {}) => {
    const fallback = () => orgVerificationMockApi.rejectLegalChange(changeId, reason);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.REJECT_LEGAL_CHANGE(changeId),
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
};

export default orgVerificationService;
