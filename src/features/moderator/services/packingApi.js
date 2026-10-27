import baseApi from '../../../services/baseApi.js';
import { normalizeError, Phase2Error, unwrap } from '../models/warehouseModel.js';
import { phase4Contract } from '../config/packingContract.js';
import { handoverPayload } from '../models/packingModel.js';

export async function request(operation, { orderId, data, signal, scope } = {}) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const config = operationConfig(operation);
  validateScope(scope);
  requireOrderId(config, orderId);
  try {
    const result = unwrap(await baseApi.request({ method: config.method,
      url: config.path.replace(':orderId', encodeURIComponent(orderId)), data, signal,
      noReplay: config.method !== 'get' }));
    if (operation === 'read') validateOrder(result, orderId, scope);
    return result;
  } catch (error) {
    if (signal?.aborted || error.code === 'ERR_CANCELED') throw error;
    throw normalizeError(error);
  }
}

function operationConfig(operation) {
  const config = phase4Contract.operations[operation];
  if (!config || config.supported === false) {
    throw new Phase2Error(config?.reason || 'Backend chưa hỗ trợ thao tác này.', 501, 'OPERATION_UNSUPPORTED');
  }
  if (!contractReady(config, operation))
    throw new Phase2Error('Chờ contract backend Phase 4 được xác minh.', 0, 'CONTRACT_BLOCKED');
  return config;
}

function contractReady(config, operation) {
  return phase4Contract.revision && phase4Contract.gates[operation] && config.path;
}

function requireOrderId(config, orderId) {
  if (config.path.includes(':orderId') && !orderId) throw new Phase2Error('Thiếu mã đơn.', 422);
}

function validateScope(scope) {
  if (!scope?.warehouseId || !scope.userId) throw new Phase2Error('Chưa xác định phiên và kho.', 403);
}

function validateOrder(result, orderId, scope) {
      if (result?.warehouseId !== scope.warehouseId)
        throw new Phase2Error('Dữ liệu không thuộc kho hiện tại.', 403);
      if (result.orderId !== orderId || !hasOrderCollections(result))
        throw new Phase2Error('Dữ liệu đóng gói không đúng contract đã bàn giao.', 422, 'INVALID_CONTRACT');
}

function hasOrderCollections(result) {
  return Array.isArray(result.items) && Array.isArray(result.scannedProductIds) && Array.isArray(result.allowedActions);
}
export const packingService = {
  read: (orderId, options) => request('read', { ...options, orderId }),
  scan: (orderId, productId, options) =>
    request('scan', { ...options, orderId, data: { productId: String(productId || '').trim() } }),
  shipment: (orderId, options) => request('shipment', { ...options, orderId }),
  handover: (task, identity, options = {}) => {
    const data = handoverPayload(task, identity, options.scope || {});
    if (!data) throw new Phase2Error('Yêu cầu hoặc xác nhận danh tính không còn hợp lệ.', 409);
    return request('handover', { ...options, data });
  },
};
