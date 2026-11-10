import { fixtureFallback } from './fixtureTransport.js';

import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { isFixtureMode } from "../config/warehouseContract.js";
import { Phase2Error } from "../models/warehouseModel.js";
import { callBackend } from './warehouseTransport.js';
import { inventoryService } from './inventoryApi.js';
import { getUser } from '../../../services/baseApi.js';

function resolveScope(options) {
  if (options?.scope?.userId && options?.scope?.warehouseId) {
    return options.scope;
  }
  const u = getUser() || {};
  return {
    userId: options?.scope?.userId || u.accountId || u.id || 'mod-qa',
    warehouseId: options?.scope?.warehouseId || u.warehouseId || 'warehouse-a',
    ...options?.scope,
  };
}

export const endTermService = {
  pendingPricing: async (options) => {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (isFixtureMode) {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('endTermPendingPricing', { ...options, scope: resolveScope(options) });
    }
    return callBackend({
      method: 'get',
      url: API_ENDPOINTS.MODERATOR.PENDING_PRICING,
    }, { signal: options?.signal });
  },

  list: async (params, options) => {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (isFixtureMode) {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('endTermList', { ...options, scope: resolveScope(options), params });
    }
    return inventoryService.list({ ...params, status: 'UNCLAIMED' }, options);
  },

  read: async (sku, options) => {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (isFixtureMode) {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('endTermRead', { ...options, scope: resolveScope(options), ids: { sku } });
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
        scope: resolveScope(options),
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
      return fixtureRequest('endTermReconsign', { ...options, scope: resolveScope(options), ids: { sku }, data });
    }
    throw new Phase2Error('Backend chưa hỗ trợ Moderator chốt ký gửi lại.', 501, 'OPERATION_UNSUPPORTED');
  },

  // KD-11: Moderator đề xuất giá và điều khoản ký gửi lại
  proposeReConsignPrice: async (decisionIdOrSku, data, options) => {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (isFixtureMode) {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('endTermReconsignTerms', {
        ...options,
        scope: resolveScope(options),
        ids: { sku: decisionIdOrSku, decisionId: decisionIdOrSku },
        data,
      });
    }
    return callBackend({
      method: 'post',
      url: API_ENDPOINTS.MODERATOR.RECONSIGN_TERMS(decisionIdOrSku),
      data: {
        agreedPrice: data.agreedPrice,
        floorPrice: data.floorPrice,
        conditionNote: data.conditionNote,
        moderatorNote: data.moderatorNote,
        termLengthDays: data.termLengthDays || 30,
      },
    }, { signal: options?.signal });
  },

  // KG-12: Member xác nhận giá mới / biên nhận mới
  confirmReConsignReceipt: async (receiptId, options) => {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (isFixtureMode) {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('endTermConfirmReceipt', { ...options, scope: resolveScope(options), ids: { receiptId } });
    }
    return callBackend({
      method: 'post',
      url: API_ENDPOINTS.MODERATOR.CONFIRM_RECEIPT(receiptId),
    }, { signal: options?.signal });
  },

  // API 36: POST /products/{id}/unclaimed/confirm-transfer
  transfer: async (sku, partnerName, options) => {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const partner = typeof partnerName === 'string' ? partnerName.trim() : '';
    if (!partner) {
      throw new Phase2Error('Tên tổ chức từ thiện tiếp nhận không được để trống.', 422);
    }
    const fallback = fixtureFallback('unclaimedTransfer', { ids: { sku }, data: { partnerName: partner }, scope: resolveScope(options), ...options });

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
