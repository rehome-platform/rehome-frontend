/**
 * ReHome - Violation Report Domain API Service
 * Wireframe: VP-01, VP-02
 * Specialization: Xử lý báo cáo vi phạm & Kiểm duyệt nội dung
 * Nối trực tiếp API Backend Spring Boot (Tắt hoàn toàn mock data)
 */
import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { callBackend } from './warehouseTransport.js';

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

export const violationReportService = {
  /**
   * API 132 / F-141: Lấy danh sách hàng đợi báo cáo vi phạm
   * @param {Object} params - { status: 'PENDING'|'RESOLVED'|'DISMISSED', type: 'POST'|'CAMPAIGN'|'ORGANIZATION_ACCOUNT' }
   */
  list: async (params = {}, options = {}) => {
    // Chỉ gửi params nếu có giá trị khác rỗng/ALL
    const queryParams = {};
    if (params.status && params.status !== 'ALL') {
      queryParams.status = params.status;
    }
    if (params.type && params.type !== 'ALL') {
      queryParams.type = params.type;
    }

    const res = await callBackend(
      {
        method: 'get',
        url: API_ENDPOINTS.MODERATOR.VIOLATION_REPORTS,
        params: queryParams,
      },
      { signal: options?.signal }
    );

    return parseListResponse(res, 'Dữ liệu báo cáo vi phạm không hợp lệ.');
  },

  /**
   * API 132 / F-141: Lấy chi tiết một báo cáo vi phạm
   */
  getDetail: async (reportId, options = {}) => {
    const res = await callBackend(
      {
        method: 'get',
        url: API_ENDPOINTS.MODERATOR.VIOLATION_REPORT_DETAIL(reportId),
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },

  /**
   * API 133 / F-141: Xử lý vi phạm (REMOVE_POST, HIDE_CAMPAIGN, WARN_ORG, PROPOSE_BAN)
   * @param {string} reportId - ID của báo cáo
   * @param {string} action - 'REMOVE_POST' | 'HIDE_CAMPAIGN' | 'WARN_ORG' | 'PROPOSE_BAN' | 'DISMISS'
   * @param {string} reason - Lý do xử lý
   */
  resolveViolation: async (reportId, action, reason, options = {}) => {
    const isDismiss =
      action === 'DISMISS' ||
      action === 'Bác bỏ báo cáo — nội dung không vi phạm' ||
      String(action).toUpperCase().includes('DISMISS');

    if (isDismiss) {
      return violationReportService.dismissViolation(reportId, reason, options);
    }

    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.RESOLVE_REPORT(reportId),
        data: {
          action: String(action).trim(),
          reason: String(reason || '').trim(),
        },
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },

  /**
   * API 134 / F-141: Bác bỏ báo cáo vi phạm
   * @param {string} reportId - ID của báo cáo
   * @param {string} reason - Lý do bác bỏ (nếu không nhập sẽ dùng giá trị mặc định chuẩn để thỏa mãn validation Backend)
   */
  dismissViolation: async (reportId, reason, options = {}) => {
    const safeReason = reason?.trim() || 'Nội dung không vi phạm quy định cộng đồng.';
    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.DISMISS_REPORT(reportId),
        data: { reason: safeReason },
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },
};

export default violationReportService;
