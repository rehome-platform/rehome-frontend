import { fixtureFallback } from './fixtureTransport.js';

import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { isFixtureMode } from "../config/warehouseContract.js";
import { Phase2Error } from "../models/warehouseModel.js";
import { callBackend } from './warehouseTransport.js';

export const counterService = {
  // API 25: POST /counter/lookup
  lookup: async (params, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      const res = await fixtureRequest('memberLookup', { params, ...options });
      return (Array.isArray(res) ? res : [res]).map((item) => ({ ...item, isMock: true }));
    };

    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (isFixtureMode) return fallback();
    const result = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.COUNTER_LOOKUP,
        data: params,
      },
      { signal: options?.signal }
    );
    if (!result) throw new Phase2Error('Không tìm thấy thành viên', 404);
    const list = Array.isArray(result) ? result : [result];
    return list.map((item) => ({
      memberId: item.accountId || item.memberId || item.id,
      memberCode: item.memberCode || '',
      fullName: item.fullName || item.name || '',
      name: item.fullName || item.name || '',
      avatarUrl: item.avatarUrl || '',
      phone: item.phone || params?.phone || '',
      isMock: false,
    }));
  },

  // API 26: POST /counter/members/{accountId}/confirm-identity (Đã triển khai ở CounterController.java:24)
  confirm: async (memberId, options) => {
    if (isFixtureMode) {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('identityConfirm', { data: { memberId }, ...options });
    }

    await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.COUNTER_CONFIRM_IDENTITY(memberId),
      },
      { signal: options?.signal }
    );
    const confirmedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    return {
      memberId,
      accountId: memberId,
      identityToken: `proof-${memberId}-${Date.now()}`,
      confirmedAt,
      expiresAt,
    };
  },

  // API 27: GET /counter/members/{accountId}/tasks
  tasks: async (memberId, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      const res = await fixtureRequest('memberTasks', { ids: { memberId }, ...options });
      return { ...res, isMock: true };
    };

    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (isFixtureMode) return fallback();
    const res = await callBackend(
      {
        method: 'get',
        url: API_ENDPOINTS.MODERATOR.COUNTER_TASKS(memberId),
      },
      { signal: options?.signal }
    );
    return { ...res, isMock: false };
  },

  // API 72: POST /counter/handover (Context: ITEM_WITHDRAWAL / END_OF_TERM_TAKE_BACK)
  handover: async ({ accountId, refId, context }, options) => {
    const fallback = fixtureFallback('endTermHandover', { data: { accountId, refId, context }, ...options });

    return callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.COUNTER_HANDOVER,
        data: { accountId, refId, context },
      },
      { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
    );
  },
};
