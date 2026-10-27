/**
 * ReHome - Warehouse Inbox Domain API Service
 * Wireframe: MC-01, MC-02
 * Specialization: Hộp thư kho & Phòng chat trực tiếp với Member
 */
import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { isFixtureMode } from '../config/warehouseContract.js';
import { callBackend } from './warehouseTransport.js';
import { warehouseInboxMockApi } from './moderatorMockData.js';

export const warehouseInboxService = {
  /**
   * API 110 / UC-48 / F-091: Lấy danh sách hội thoại chung trong kho
   */
  getConversations: async (params = {}, options = {}) => {
    const fallback = () => warehouseInboxMockApi.getConversations(params);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.WAREHOUSE_INBOX,
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
   * Lấy chi tiết một hội thoại
   */
  getConversationDetail: async (convId, options = {}) => {
    const fallback = () => warehouseInboxMockApi.getConversationDetail(convId);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.WAREHOUSE_INBOX_DETAIL(convId),
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
   * API 110 / F-091: Gửi tin nhắn trả lời Member
   */
  sendMessage: async (convId, text, moderatorName = 'Nguyễn Văn A', options = {}) => {
    const fallback = () => warehouseInboxMockApi.sendMessage(convId, text, moderatorName);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.SEND_INBOX_MESSAGE(convId),
          data: {
            text,
            senderName: `Moderator ${moderatorName}`,
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
   * Đánh dấu hoàn tất hội thoại
   */
  markAsDone: async (convId, options = {}) => {
    const fallback = () => warehouseInboxMockApi.markAsDone(convId);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.MARK_INBOX_DONE(convId),
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

export default warehouseInboxService;
