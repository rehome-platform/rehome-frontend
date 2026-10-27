/**
 * ReHome - Violation Report Domain API Service
 * Wireframe: VP-01, VP-02
 * Specialization: Xử lý báo cáo vi phạm & Kiểm duyệt nội dung
 */
import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { isFixtureMode } from '../config/warehouseContract.js';
import { callBackend } from './warehouseTransport.js';
import { violationReportMockApi } from './moderatorMockData.js';

export const violationReportService = {
  /**
   * API 132 / F-141: Lấy danh sách hàng đợi báo cáo vi phạm
   */
  list: async (params = {}, options = {}) => {
    const fallback = () => violationReportMockApi.list(params);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.VIOLATION_REPORTS,
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
   * API 132 / F-141: Lấy chi tiết một báo cáo vi phạm
   */
  getDetail: async (reportId, options = {}) => {
    const fallback = () => violationReportMockApi.getDetail(reportId);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.VIOLATION_REPORT_DETAIL(reportId),
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
   * API 133 & API 134 / F-141: Xử lý vi phạm (Gỡ nội dung, Ẩn chiến dịch, Bác bỏ báo cáo, Khóa tài khoản)
   */
  resolveViolation: async (reportId, action, reason, options = {}) => {
    const fallback = () => violationReportMockApi.resolveViolation(reportId, action, reason);
    if (isFixtureMode) return fallback();

    const isDismiss =
      action === 'Bác bỏ báo cáo — nội dung không vi phạm' ||
      action === 'DISMISS' ||
      String(action).toUpperCase().includes('DISMISS');

    const endpoint = isDismiss
      ? API_ENDPOINTS.MODERATOR.DISMISS_REPORT(reportId)
      : API_ENDPOINTS.MODERATOR.RESOLVE_REPORT(reportId);

    try {
      const res = await callBackend(
        {
          method: 'post',
          url: endpoint,
          data: { action, reason },
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
   * API 134 / F-141: Bác bỏ báo cáo vi phạm
   */
  dismissViolation: async (reportId, reason, options = {}) => {
    const fallback = () => violationReportMockApi.dismissViolation(reportId, reason);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.DISMISS_REPORT(reportId),
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

export default violationReportService;
