import baseApi from '../../../services/baseApi.js';
import { phase2Contract, isFixtureMode } from './contract.js';
import { normalizeError, Phase2Error, unwrap } from './model.js';

/** No implicit fallback, no network retry. Unknown contracts fail before making a request. */
export async function request(
  operation,
  { ids = {}, params, data, signal, onUploadProgress, scope } = {},
) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (isFixtureMode) {
    const { fixtureRequest } = await import('./fixtures.js');
    return fixtureRequest(operation, { ids, params, data, signal, scope });
  }
  const config = phase2Contract.operations[operation];
  if (!config || !phase2Contract.revision || !phase2Contract.gates[config.gate] || !config.path) {
    throw new Phase2Error(
      `Chờ bàn giao contract backend (Gate ${config?.gate ?? '—'}).`,
      0,
      'CONTRACT_BLOCKED',
    );
  }
  if (!scope?.warehouseId)
    throw new Phase2Error('Tài khoản chưa có thông tin kho được backend xác nhận.', 403);
  const url = config.path.replace(/:([a-zA-Z]+)/g, (_, key) => {
    if (!ids[key]) throw new Phase2Error(`Thiếu định danh ${key}.`, 422);
    return encodeURIComponent(ids[key]);
  });
  try {
    const response = await baseApi.request({
      method: config.method,
      url,
      params,
      data,
      signal,
      noReplay: config.method.toLowerCase() !== 'get',
      onUploadProgress,
      ...(data instanceof FormData ? { headers: { 'Content-Type': undefined } } : {}),
    });
    return unwrap(response);
  } catch (error) {
    if (signal?.aborted || error.code === 'ERR_CANCELED') throw error;
    throw normalizeError(error);
  }
}

export const queueService = {
  list: (params, options) => request('queueList', { ...options, params }),
  claim: (queueId, options) => request('queueClaim', { ...options, ids: { queueId } }),
  release: (queueId, options) => request('queueRelease', { ...options, ids: { queueId } }),
  approve: (formId, options) => request('formApprove', { ...options, ids: { formId } }),
  reject: (formId, reason, options) =>
    request('formReject', { ...options, ids: { formId }, data: { reason } }),
};
export const counterService = {
  lookup: (params, options) => request('memberLookup', { ...options, params }),
  confirm: (memberId, options) => request('identityConfirm', { ...options, data: { memberId } }),
  tasks: (memberId, options) => request('memberTasks', { ...options, ids: { memberId } }),
};
export const consignmentService = {
  read: (formId, options) => request('formRead', { ...options, ids: { formId } }),
  start: (formId, data, options) =>
    request('inspectionStart', { ...options, ids: { formId }, data }),
  complete: (formId, data, options) =>
    request('inspectionComplete', { ...options, ids: { formId }, data }),
  returnOnsite: (formId, data, options) =>
    request('returnOnsite', { ...options, ids: { formId }, data }),
  receipt: (receiptId, options) => request('receiptRead', { ...options, ids: { receiptId } }),
};
export const inventoryService = {
  list: (params, options) => request('inventoryList', { ...options, params }),
  read: (sku, options) => request('productRead', { ...options, ids: { sku } }),
  byReceipt: (receiptId, options) =>
    request('productByReceipt', { ...options, ids: { receiptId } }),
  create: (data, options) => request('productCreate', { ...options, data }),
  upload: (file, options) => {
    const data = new FormData();
    data.append('file', file);
    return request('photoUpload', { ...options, data });
  },
  addPhotos: (sku, photoUrls, options) =>
    request('productPhotos', { ...options, ids: { sku }, data: { photoUrls } }),
  shelf: (sku, shelfLocation, options) =>
    request('shelfUpdate', { ...options, ids: { sku }, data: { shelfLocation } }),
  movements: (sku, options) => request('stockMovements', { ...options, ids: { sku } }),
  label: (sku, options) => request('skuLabel', { ...options, ids: { sku } }),
};
export const catalogService = {
  list: (options) => request('catalogList', options),
  save: (kind, id, data, options) =>
    request(`${kind}${id ? 'Update' : 'Create'}`, { ...options, ids: { id }, data }),
  hide: (kind, id, options) => request(`${kind}Hide`, { ...options, ids: { id } }),
};
export const endTermService = {
  list: (params, options) => request('endTermList', { ...options, params }),
  read: (sku, options) => request('endTermRead', { ...options, ids: { sku } }),
  handover: (sku, data, options) =>
    request('endTermHandover', {
      ...options,
      ids: { sku },
      data: { ...data, context: 'END_OF_TERM_TAKE_BACK' },
    }),
  reconsign: (sku, data, options) =>
    request('endTermReconsign', { ...options, ids: { sku }, data }),
  transfer: (sku, partnerName, options) =>
    request('unclaimedTransfer', { ...options, ids: { sku }, data: { partnerName } }),
};
