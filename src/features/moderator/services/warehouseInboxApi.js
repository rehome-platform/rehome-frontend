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
  if (res && res.result && Array.isArray(res.result.content)) {
    return { data: res.result.content, total: res.result.totalElements ?? res.result.content.length };
  }
  if (res && Array.isArray(res.result)) {
    return { data: res.result, total: res.result.length };
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
   * API 112: Lịch sử tin nhắn của một cuộc hội thoại
   */
  getMessages: async (convId, params = { page: 0, size: 50 }, options = {}) => {
    if (isFixtureMode) return warehouseInboxMockApi.getMessages(convId, params);

    const res = await callBackend(
      {
        method: 'get',
        url: API_ENDPOINTS.MODERATOR.WAREHOUSE_INBOX_MESSAGES(convId),
        params,
      },
      { signal: options?.signal }
    );

    return parseListResponse(res, 'Dữ liệu tin nhắn không hợp lệ.');
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
    return res?.result || res?.data || res;
  },

  /**
   * API 113 / F-091: Gửi tin nhắn trả lời Member
   * Backend Contract: SendMessageRequest { content: string, imageUrls?: string[] }
   */
  sendMessage: async (convId, payload, moderatorName = 'Nguyễn Văn A', options = {}) => {
    const isObj = payload && typeof payload === 'object' && !Array.isArray(payload);
    const content = isObj ? (payload.content ?? '') : (payload ?? '');
    const imageUrls = isObj && Array.isArray(payload.imageUrls) ? payload.imageUrls : [];

    if (isFixtureMode) {
      return warehouseInboxMockApi.sendMessage(convId, { content, imageUrls }, moderatorName);
    }

    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.SEND_INBOX_MESSAGE(convId),
        data: {
          content,
          imageUrls,
        },
      },
      { signal: options?.signal }
    );
    return res?.result || res?.data || res;
  },

  /**
   * Upload ảnh đính kèm chat lên Cloudinary qua POST /uploads?folder=CHAT_IMAGES
   */
  uploadImage: async (file, options = {}) => {
    if (isFixtureMode) {
      return { url: URL.createObjectURL(file) };
    }

    const formData = new FormData();
    formData.append('file', file);

    const res = await callBackend(
      {
        method: 'post',
        url: `${API_ENDPOINTS.MODERATOR.UPLOADS}?folder=CHAT_IMAGES`,
        data: formData,
        onUploadProgress: options?.onUploadProgress,
      },
      { signal: options?.signal }
    );

    const url = res?.url || res?.fileUrl || (typeof res === 'string' ? res : '');
    return { url, ...res };
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
    return res?.result || res?.data || res;
  },
};

export default warehouseInboxService;
