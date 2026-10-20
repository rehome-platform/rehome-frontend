import baseApi from '../../../services/baseApi.js';
import { normalizeError, Phase2Error, unwrap } from '../phase2/model.js';
import { phase4Contract } from './contract.js';
import { handoverPayload } from './model.js';

export async function request(operation, { orderId, data, signal, scope } = {}) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const config = phase4Contract.operations[operation];
  if (!phase4Contract.revision || !phase4Contract.gates[operation] || !config?.path)
    throw new Phase2Error('Chờ contract backend Phase 4 được xác minh.', 0, 'CONTRACT_BLOCKED');
  if (!scope?.warehouseId || !scope.userId) throw new Phase2Error('Chưa xác định phiên và kho.', 403);
  if (config.path.includes(':orderId') && !orderId) throw new Phase2Error('Thiếu mã đơn.', 422);
  try {
    const result = unwrap(await baseApi.request({ method: config.method,
      url: config.path.replace(':orderId', encodeURIComponent(orderId)), data, signal,
      noReplay: config.method !== 'get' }));
    if (operation === 'read') {
      if (result?.warehouseId !== scope.warehouseId)
        throw new Phase2Error('Dữ liệu không thuộc kho hiện tại.', 403);
      if (result.orderId !== orderId || !Array.isArray(result.items) ||
          !Array.isArray(result.scannedProductIds) || !Array.isArray(result.allowedActions))
        throw new Phase2Error('Dữ liệu đóng gói không đúng contract đã bàn giao.', 422, 'INVALID_CONTRACT');
    }
    return result;
  } catch (error) {
    if (signal?.aborted || error.code === 'ERR_CANCELED') throw error;
    throw normalizeError(error);
  }
}
export const packingService = {
  read: (orderId, options) => request('read', { ...options, orderId }),
  scan: (orderId, productId, options) => request('scan', { ...options, orderId, data: { productId } }),
  shipment: (orderId, options) => request('shipment', { ...options, orderId }),
  handover: (task, identity, options) => {
    const data = handoverPayload(task, identity, options.scope);
    if (!data) throw new Phase2Error('Yêu cầu hoặc xác nhận danh tính không còn hợp lệ.', 409);
    return request('handover', { ...options, data });
  },
};
