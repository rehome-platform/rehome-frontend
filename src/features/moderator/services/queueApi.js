import { fixtureFallback } from './fixtureTransport.js';

import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { isFixtureMode } from "../config/warehouseContract.js";

import { callBackend } from './warehouseTransport.js';

export const queueService = {
  // API 28 / API 68: GET /queues?type={type}
  list: async (params, options) => {
    const fallback = async () => {
      if (params?.type === 'PACKING') {
        const { packingMockApi } = await import('./packingMockApi.js');
        return packingMockApi.listQueue(params);
      }
      return fixtureFallback('queueList', { params, ...options });
    };

    const typeQuery = params?.type && params.type !== 'ALL' ? params.type : undefined;
    let result;
    try {
      result = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.QUEUES,
          params: typeQuery ? { type: typeQuery } : undefined,
        },
        { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
      );
    } catch (err) {
      if (options?.signal?.aborted || err.code === 'ERR_CANCELED') throw err;
      if (isFixtureMode && fallback) {
        result = await fallback();
      } else {
        throw err;
      }
    }

    const map = (item) => ({
      ...item,
      queueId: item.queueId ?? item.id,
      id: item.id ?? item.queueId,
      refId: item.refId ?? item.id,
      // RETURN refId points to the return request; claim/release uses queueId.
      ...(item.type === 'RETURN' ? { returnId: item.returnId ?? item.refId } : {}),
      formId: item.formId ?? item.refId ?? item.id,
      orderId: item.orderId ?? item.refId,
      type: item.type,
      claimedBy: item.claimedBy,
      claimedAt: item.claimedAt,
      createdAt: item.createdAt,
      name: item.targetName ?? item.name ?? item.productName ?? item.orderNo ?? item.orgName,
      memberName: item.subjectSubtitle ?? item.memberName ?? item.recipientName,
      status: item.status || (item.claimedBy ? 'PROCESSING' : 'PENDING'),
    });

    // Trả về đúng danh sách từ backend, bảo toàn trạng thái rỗng (empty state) khi không có bản ghi nào
    if (Array.isArray(result)) return result.map(map);
    if (result && Array.isArray(result.items)) return { ...result, items: result.items.map(map) };
    return result || [];
  },

  // API 29: POST /queues/{id}/claim
  claim: async (queueId, options) => {
    const fallback = async () => {
      try {
        const { packingMockApi } = await import('./packingMockApi.js');
        return await packingMockApi.claimQueue(queueId, options?.scope?.userId);
      } catch (e) {
        const fn = fixtureFallback('queueClaim', { ids: { queueId }, ...options }); return fn ? fn() : undefined;
      }
    };

    try {
      return await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.CLAIM_QUEUE(queueId),
        },
        { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
      );
    } catch (err) {
      if (options?.signal?.aborted || err.code === 'ERR_CANCELED') throw err;
      if (isFixtureMode && fallback) return fallback();
      throw err;
    }
  },

  // API 30: POST /queues/{id}/release
  release: async (queueId, options) => {
    const fallback = async () => {
      try {
        const { packingMockApi } = await import('./packingMockApi.js');
        return await packingMockApi.releaseQueue(queueId, options?.scope?.userId);
      } catch (e) {
        const fn = fixtureFallback('queueRelease', { ids: { queueId }, ...options }); return fn ? fn() : undefined;
      }
    };

    try {
      return await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.RELEASE_QUEUE(queueId),
        },
        { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
      );
    } catch (err) {
      if (options?.signal?.aborted || err.code === 'ERR_CANCELED') throw err;
      if (isFixtureMode && fallback) return fallback();
      throw err;
    }
  },

  // API 31: POST /consignment-forms/{id}/approve
  approve: async (formId, options) => {
    const fallback = fixtureFallback('formApprove', { ids: { formId }, ...options });

    return callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.APPROVE_FORM(formId),
      },
      { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
    );
  },

  // API 32: POST /consignment-forms/{id}/reject
  reject: async (formId, reason, options) => {
    const fallback = fixtureFallback('formReject', { ids: { formId }, data: { reason }, ...options });

    return callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.REJECT_FORM(formId),
        data: { reason },
      },
      { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
    );
  },
};
