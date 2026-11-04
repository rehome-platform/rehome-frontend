import baseApi from '../../../services/baseApi.js';
import { normalizeError, Phase2Error, unwrap } from '../models/warehouseModel.js';
import { phase4Contract, operationReady } from '../config/packingContract.js';
import { isFixtureMode } from '../config/warehouseContract.js';
import { handoverPayload } from '../models/packingModel.js';
import { packingMockApi } from './packingMockApi.js';

function normalizeOrderResult(result, orderId, scope) {
  if (!result) return result;
  const id = result.orderId || result.id || orderId;
  const items = Array.isArray(result.items) ? result.items : (Array.isArray(result.orderItems) ? result.orderItems : []);
  const scannedProductIds = Array.isArray(result.scannedProductIds) ? result.scannedProductIds : [];
  const allowedActions = Array.isArray(result.allowedActions)
    ? result.allowedActions
    : (['PAID', 'PACKING'].includes(result.status) ? ['SCAN', 'CREATE_SHIPMENT'] : []);

  return {
    ...result,
    orderId: id,
    id,
    items,
    scannedProductIds,
    scannedCount: result.scannedCount ?? scannedProductIds.length,
    totalCount: result.totalCount ?? items.length,
    allowedActions,
    claimedBy: result.claimedBy || scope?.userId,
    claimExpiresAt: result.claimExpiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    shipmentOutcome: result.shipmentOutcome || (result.ghnTrackingCode ? 'CREATED' : 'NOT_CREATED'),
  };
}

export async function request(operation, { orderId, data, signal, scope } = {}) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  // Chế độ Mock API CHỈ KHI bật isFixtureMode (VITE_PHASE2_MOCK === 'true')
  if (isFixtureMode) {
    validateScope(scope);
    if (operation === 'read') return packingMockApi.getOrderDetail(orderId, scope);
    if (operation === 'scan') return packingMockApi.scanSku(orderId, data?.productId);
    if (operation === 'shipment') return packingMockApi.createShipment(orderId, data);
    if (operation === 'handover') return packingMockApi.handover(data);
  }

  const config = operationConfig(operation);
  validateScope(scope);
  requireOrderId(config, orderId);

  try {
    let result = unwrap(
      await baseApi.request({
        method: config.method,
        url: config.path.replace(':orderId', encodeURIComponent(orderId)),
        data,
        signal,
        noReplay: config.method !== 'get',
      })
    );
    if (operation === 'read') {
      result = normalizeOrderResult(result, orderId, scope);
      validateOrder(result, orderId, scope);
    }
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
  if (!scope?.warehouseId || !scope.userId) throw new Phase2Error('Chưa xác định phiên và điểm kí gửi.', 403);
}

function validateOrder(result, orderId, scope) {
  if (scope?.warehouseId && result?.warehouseId && result.warehouseId !== scope.warehouseId) {
    throw new Phase2Error('Dữ liệu không thuộc điểm kí gửi hiện tại.', 403);
  }
  if ((result.orderId !== orderId && result.id !== orderId) || !Array.isArray(result.items)) {
    throw new Phase2Error('Dữ liệu đóng gói không đúng contract đã bàn giao.', 422, 'INVALID_CONTRACT');
  }
}

function hasOrderCollections(result) {
  return Array.isArray(result.items) && Array.isArray(result.scannedProductIds) && Array.isArray(result.allowedActions);
}

export const packingService = {
  read: (orderId, options) => {
    if (isFixtureMode && typeof orderId === 'string' && orderId.startsWith('DH-')) {
      return Promise.resolve(packingMockApi.getOrderDetail(orderId, options?.scope));
    }
    return request('read', { ...options, orderId });
  },
  scan: (orderId, productId, options) =>
    request('scan', { ...options, orderId, data: { productId: String(productId || '').trim() } }),
  shipment: (orderId, options) => request('shipment', { ...options, orderId, data: options?.data }),
  handover: (task, identity, options = {}) => {
    const data = handoverPayload(task, identity, options.scope || {});
    if (!data) throw new Phase2Error('Yêu cầu hoặc xác nhận danh tính không còn hợp lệ.', 409);
    return request('handover', { ...options, data });
  },
};
