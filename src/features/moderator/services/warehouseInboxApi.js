/**
 * ReHome - Warehouse Inbox Domain API Service
 * Wireframe: MC-01, MC-02
 * Specialization: Hộp thư kho & Phòng chat trực tiếp với Member
 */
import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { isFixtureMode } from '../config/warehouseContract.js';
import { callBackend } from './warehouseTransport.js';
import { warehouseInboxMockApi } from './moderatorMockData.js';

function parseListResponse(res, errorMessage = 'Dữ liệu trả về không hợp lệ.') {
  if (Array.isArray(res)) {
    return { data: res, total: res.length };
  }
  if (res && Array.isArray(res.content)) {
    return { data: res.content, total: res.totalElements ?? res.content.length };
  }
  if (res && Array.isArray(res.data)) {
    return { data: res.data, total: res.total ?? res.data.length };
  }
  if (res && Array.isArray(res.items)) {
    return { data: res.items, total: res.total ?? res.items.length };
  }
  throw new Error(errorMessage);
}

export const warehouseInboxService = {
  /**
   * API 110 / UC-48 / F-091: Lấy danh sách hội thoại chung trong kho
   */
  getConversations: async (params = {}, options = {}) => {
    if (isFixtureMode) return warehouseInboxMockApi.getConversations(params);

    const res = await callBackend(
      {
        method: 'get',
        url: API_ENDPOINTS.MODERATOR.WAREHOUSE_INBOX,
        params,
      },
      { signal: options?.signal }
    );

    return parseListResponse(res, 'Dữ liệu hộp thư không hợp lệ.');
  },

  /**
   * Lấy chi tiết một hội thoại
   */
  getConversationDetail: async (convId, options = {}) => {
    if (isFixtureMode) return warehouseInboxMockApi.getConversationDetail(convId);

    const res = await callBackend(
      {
        method: 'get',
        url: API_ENDPOINTS.MODERATOR.WAREHOUSE_INBOX_DETAIL(convId),
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },

  /**
   * API 110 / F-091: Gửi tin nhắn trả lời Member
   * Backend Contract: SendMessageRequest { content: string }
   */
  sendMessage: async (convId, text, moderatorName = 'Nguyễn Văn A', options = {}) => {
    if (isFixtureMode) return warehouseInboxMockApi.sendMessage(convId, text, moderatorName);

    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.SEND_INBOX_MESSAGE(convId),
        data: {
          content: text,
        },
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },

  /**
   * Đánh dấu hoàn tất hội thoại
   */
  markAsDone: async (convId, options = {}) => {
    if (isFixtureMode) return warehouseInboxMockApi.markAsDone(convId);

    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.MARK_INBOX_DONE(convId),
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },
};

export default warehouseInboxService;
