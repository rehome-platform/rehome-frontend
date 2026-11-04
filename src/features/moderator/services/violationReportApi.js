/**
 * ReHome - Violation Report Domain API Service
 * Wireframe: VP-01, VP-02
 * Specialization: Xử lý báo cáo vi phạm & Kiểm duyệt nội dung
 */
import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { isFixtureMode } from '../config/warehouseContract.js';
import { callBackend } from './warehouseTransport.js';
import { violationReportMockApi } from './moderatorMockData.js';

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
   */
  list: async (params = {}, options = {}) => {
    if (isFixtureMode) return violationReportMockApi.list(params);

    const res = await callBackend(
      {
        method: 'get',
        url: API_ENDPOINTS.MODERATOR.VIOLATION_REPORTS,
        params,
      },
      { signal: options?.signal }
    );

    return parseListResponse(res, 'Dữ liệu báo cáo vi phạm không hợp lệ.');
  },

  /**
   * API 132 / F-141: Lấy chi tiết một báo cáo vi phạm
   */
  getDetail: async (reportId, options = {}) => {
    if (isFixtureMode) return violationReportMockApi.getDetail(reportId);

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
   * API 133 & API 134 / F-141: Xử lý vi phạm (Gỡ nội dung, Ẩn chiến dịch, Bác bỏ báo cáo, Khóa tài khoản)
   */
  resolveViolation: async (reportId, action, reason, options = {}) => {
    if (isFixtureMode) return violationReportMockApi.resolveViolation(reportId, action, reason);

    const isDismiss =
      action === 'Bác bỏ báo cáo — nội dung không vi phạm' ||
      action === 'DISMISS' ||
      String(action).toUpperCase().includes('DISMISS');

    const endpoint = isDismiss
      ? API_ENDPOINTS.MODERATOR.DISMISS_REPORT(reportId)
      : API_ENDPOINTS.MODERATOR.RESOLVE_REPORT(reportId);

    const res = await callBackend(
      {
        method: 'post',
        url: endpoint,
        data: { action, reason },
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },

  /**
   * API 134 / F-141: Bác bỏ báo cáo vi phạm
   */
  dismissViolation: async (reportId, reason, options = {}) => {
    if (isFixtureMode) return violationReportMockApi.dismissViolation(reportId, reason);

    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.DISMISS_REPORT(reportId),
        data: { reason },
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },
};

export default violationReportService;
