/**
 * ReHome - Organization Verification Domain API Service
 * Wireframe: TC-01, TC-02, TC-03, TC-04, TC-05, TC-06
 * Specialization: Xác minh hồ sơ tổ chức từ thiện & Duyệt thay đổi pháp lý
 */
import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { isFixtureMode } from '../config/warehouseContract.js';
import { callBackend } from './warehouseTransport.js';
import { orgVerificationMockApi } from './moderatorMockData.js';

function parseListResponse(res, errorMessage = 'Dữ liệu trả về không hợp lệ.') {
  if (res && Array.isArray(res.content)) {
    return { data: res.content, total: res.totalElements ?? res.content.length };
  }
  if (res && Array.isArray(res.data)) {
    return { data: res.data, total: res.total ?? res.data.length };
  }
  if (Array.isArray(res)) {
    return { data: res, total: res.length };
  }
  if (res && Array.isArray(res.items)) {
    return { data: res.items, total: res.total ?? res.items.length };
  }
  throw new Error(errorMessage);
}

export const orgVerificationService = {
  /**
   * API 127 / F-111: Lấy hàng đợi hồ sơ tổ chức chờ xác minh
   */
  getQueue: async (params = {}, options = {}) => {
    if (isFixtureMode) return orgVerificationMockApi.getQueue(params);

    const res = await callBackend(
      {
        method: 'get',
        url: API_ENDPOINTS.MODERATOR.VERIFICATION_QUEUE,
        params,
      },
      { signal: options?.signal }
    );

    return parseListResponse(res, 'Dữ liệu hàng đợi tổ chức không hợp lệ.');
  },

  /**
   * API 131 / F-140: Lấy danh sách yêu cầu thay đổi thông tin pháp lý
   */
  getLegalChanges: async (params = {}, options = {}) => {
    if (isFixtureMode) return orgVerificationMockApi.getLegalChanges(params);

    const res = await callBackend(
      {
        method: 'get',
        url: API_ENDPOINTS.MODERATOR.LEGAL_CHANGES,
        params,
      },
      { signal: options?.signal }
    );

    return parseListResponse(res, 'Dữ liệu yêu cầu thay đổi pháp lý không hợp lệ.');
  },

  /**
   * API 131 / F-140: Lấy chi tiết 1 yêu cầu thay đổi thông tin pháp lý
   */
  getLegalChangeDetail: async (changeId, options = {}) => {
    if (isFixtureMode) return orgVerificationMockApi.getLegalChangeDetail?.(changeId);

    const res = await callBackend(
      {
        method: 'get',
        url: API_ENDPOINTS.MODERATOR.LEGAL_CHANGE_DETAIL(changeId),
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },

  /**
   * API 128 / F-137: Lấy chi tiết hồ sơ xác minh của tổ chức
   */
  getOrgDetail: async (orgId, options = {}) => {
    if (isFixtureMode) return orgVerificationMockApi.getOrgDetail(orgId);

    const res = await callBackend(
      {
        method: 'get',
        url: API_ENDPOINTS.MODERATOR.ORG_VERIFICATION_DETAIL(orgId),
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },

  /**
   * API 129 / F-138: Xác thực hồ sơ tổ chức thành công
   */
  approveOrg: async (orgId, note, options = {}) => {
    if (isFixtureMode) return orgVerificationMockApi.approveOrg(orgId, note);

    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.APPROVE_ORG(orgId),
        data: { note, auditNote: note },
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },

  /**
   * API 130 / F-138: Từ chối hồ sơ tổ chức kèm lý do
   */
  rejectOrg: async (orgId, reason, options = {}) => {
    if (isFixtureMode) return orgVerificationMockApi.rejectOrg(orgId, reason);

    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.REJECT_ORG(orgId),
        data: { reason },
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },

  /**
   * API 131 / F-140: Duyệt yêu cầu thay đổi thông tin pháp lý
   */
  approveLegalChange: async (changeId, options = {}) => {
    if (isFixtureMode) return orgVerificationMockApi.approveLegalChange(changeId);

    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.APPROVE_LEGAL_CHANGE(changeId),
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },

  /**
   * API 131 / F-140: Từ chối yêu cầu thay đổi thông tin pháp lý
   */
  rejectLegalChange: async (changeId, reason, options = {}) => {
    if (isFixtureMode) return orgVerificationMockApi.rejectLegalChange(changeId, reason);

    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.REJECT_LEGAL_CHANGE(changeId),
        data: { reason },
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },
};

export default orgVerificationService;
