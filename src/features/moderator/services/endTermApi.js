import { fixtureFallback } from './fixtureTransport.js';

import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { isFixtureMode } from "../config/warehouseContract.js";
import { Phase2Error } from "../models/warehouseModel.js";
import { callBackend } from './warehouseTransport.js';
import { inventoryService } from './inventoryApi.js';

export const endTermService = {
  list: async (params, options) => {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (isFixtureMode) {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('endTermList', { ...options, params });
    }
    return inventoryService.list({ ...params, status: 'UNCLAIMED' }, options);
  },

  read: async (sku, options) => {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (isFixtureMode) {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('endTermRead', { ...options, ids: { sku } });
    }
    const item = await inventoryService.read(sku, options);
    const isUnclaimed = item?.status === 'UNCLAIMED';
    return {
      ...item,
      allowedActions: item?.allowedActions?.length
        ? item.allowedActions
        : (isUnclaimed ? ['TRANSFER'] : []),
    };
  },

  handover: async (sku, data, options) => {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (isFixtureMode) {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('endTermHandover', {
        ...options,
        ids: { sku },
        data: { ...data, context: 'END_OF_TERM_TAKE_BACK' },
      });
    }
    // accountId and refId come from a counter task, not from the product SKU.
    if (!data?.accountId || !data?.refId) {
      throw new Phase2Error('Thiếu tài khoản hoặc mã yêu cầu bàn giao tại quầy.', 422);
    }
    return callBackend({
      method: 'post',
      url: API_ENDPOINTS.MODERATOR.COUNTER_HANDOVER,
      data: { accountId: data.accountId, refId: data.refId, context: 'END_OF_TERM_TAKE_BACK' },
    }, { signal: options?.signal });
  },

  reconsign: async (sku, data, options) => {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (isFixtureMode) {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('endTermReconsign', { ...options, ids: { sku }, data });
    }
    throw new Phase2Error('Backend chưa hỗ trợ Moderator chốt ký gửi lại.', 501, 'OPERATION_UNSUPPORTED');
  },

  // API 36: POST /products/{id}/unclaimed/confirm-transfer
  transfer: async (sku, partnerName, options) => {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const partner = typeof partnerName === 'string' ? partnerName.trim() : '';
    if (!partner) {
      throw new Phase2Error('Tên tổ chức từ thiện tiếp nhận không được để trống.', 422);
    }
    const fallback = fixtureFallback('unclaimedTransfer', { ids: { sku }, data: { partnerName: partner }, ...options });

    return callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.CONFIRM_UNCLAIMED_TRANSFER(sku),
        data: { partnerOrganizationName: partner },
      },
      { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
    );
  },
};
