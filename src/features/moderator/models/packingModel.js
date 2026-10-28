/**
 * Packing and Shipment Model for Moderator (Phase 4)
 */

export function ownsActiveClaim(order, scope, now = Date.now()) {
  return (
    claimMatchesScope(order, scope) &&
    Date.parse(order.claimExpiresAt) > now &&
    !order.ghnTrackingCode &&
    order.shipmentOutcome === 'NOT_CREATED'
  );
}

function claimMatchesScope(order, scope) {
  return !!order && order.warehouseId === scope?.warehouseId && !!scope?.userId && order.claimedBy === scope.userId;
}

export function canPack(order, scope, now = Date.now()) {
  return ownsActiveClaim(order, scope, now) && Boolean(order.allowedActions?.includes('SCAN'));
}

function hasCompleteScan(order) {
  const ids = order.items?.map((item) => item.productId) || [];
  const scanned = new Set(order.scannedProductIds || []);
  return (
    ids.length > 0 &&
    new Set(ids).size === ids.length &&
    ids.every((id) => scanned.has(id)) &&
    scanCountsMatch(order, ids.length)
  );
}

function scanCountsMatch(order, count) {
  return order.scannedCount === count && order.totalCount === count;
}

export function canShip(order, scope, now = Date.now()) {
  return ownsActiveClaim(order, scope, now) &&
    Boolean(order.allowedActions?.includes('CREATE_SHIPMENT')) && hasCompleteScan(order);
}

function isHandoverTask(task, scope) {
  return !(
    task?.context !== 'END_OF_TERM_TAKE_BACK' ||
    !task.refId ||
    !task.accountId ||
    !task.allowedActions?.includes('HANDOVER') ||
    task.warehouseId !== scope?.warehouseId
  );
}

function matchesHandoverIdentity(task, identity, scope, now) {
  return !(
    identity?.accountId !== task.accountId ||
    identity?.warehouseId !== scope?.warehouseId ||
    !identity?.identityToken ||
    !(Date.parse(identity.expiresAt) > now)
  );
}

export function handoverPayload(task, identity, scope, now = Date.now()) {
  if (!isHandoverTask(task, scope)) return null;
  if (!matchesHandoverIdentity(task, identity, scope, now)) return null;
  return {
    accountId: task.accountId,
    context: task.context,
    refId: task.refId,
    identityToken: identity.identityToken,
  };
}

/**
 * Trạng thái hiển thị đơn hàng tiếng Việt
 */
export const ORDER_STATUS_LABELS = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  PACKING: 'Đang đóng gói',
  SHIPPING: 'Đang vận chuyển',
  DELIVERED: 'Đã giao hàng',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
};

export function formatOrderStatus(status) {
  return ORDER_STATUS_LABELS[status] || status || 'Không xác định';
}

/**
 * Kiểm tra xem đơn hàng đã quét đủ 100% SKU chưa
 */
export function isOrderFullyScanned(order) {
  if (!order || !order.items?.length) return false;
  const items = order.items;
  const scanned = new Set(order.scannedProductIds || []);
  return (
    items.length > 0 &&
    items.every((item) => scanned.has(item.productId)) &&
    order.scannedCount === items.length
  );
}

/**
 * Kiểm tra và chuẩn hóa mã SKU trước khi gửi scan
 */
export function validateSkuInput(code) {
  const trimmed = String(code || '').trim();
  if (!trimmed) {
    return { valid: false, message: 'Vui lòng nhập hoặc quét mã SKU trên tem sản phẩm.' };
  }
  return { valid: true, value: trimmed };
}

/**
 * Chuẩn hóa đối tượng đơn hàng đóng gói từ backend hoặc queue context
 */
function packingItemIdentity(item) {
  return {
    productId: item.productId || item.id,
    name: item.name || item.productName || 'Sản phẩm ReHome',
    size: item.size || 'M',
    shelfLocation: item.shelfLocation || item.shelf || 'Chưa xếp kệ',
  };
}

function normalizePackingItem(item) {
  return {
    ...packingItemIdentity(item),
    photoUrl: item.photoUrl || item.thumbnailUrl || null,
    brand: item.brand || item.brandName || 'ReHome',
    condition: item.condition || 'Tốt',
    priceAtOrder: item.priceAtOrder || item.price || 0,
    scanned: Boolean(item.scanned),
  };
}

function scanProgress(raw, items) {
  const totalCount = raw.totalCount ?? items.length;
  const scannedProductIds =
    raw.scannedProductIds || items.filter((i) => i.scanned).map((i) => i.productId);
  const scannedCount = raw.scannedCount ?? scannedProductIds.length;
  return { totalCount, scannedProductIds, scannedCount };
}

function packingActions(raw, { scannedCount, totalCount }) {
  let allowedActions = raw.allowedActions;
  if (!allowedActions) {
    allowedActions = [];
    if (scannedCount < totalCount) allowedActions.push('SCAN');
    if (scannedCount === totalCount && totalCount > 0 && !raw.ghnTrackingCode) {
      allowedActions.push('CREATE_SHIPMENT');
    }
  }
  return allowedActions;
}

function packingShipment(raw, scope) {
  return {
    warehouseId: raw.warehouseId || scope.warehouseId,
    claimedBy: raw.claimedBy || scope.userId,
    claimExpiresAt: raw.claimExpiresAt || new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    ghnTrackingCode: raw.ghnTrackingCode || null,
    shipmentOutcome: raw.shipmentOutcome || (raw.ghnTrackingCode ? 'CREATED' : 'NOT_CREATED'),
  };
}

function packingRecipient(raw) {
  return {
    recipientName: raw.shippingRecipientName || raw.recipientName || 'Người mua ReHome',
    recipientPhone: raw.shippingPhone || raw.recipientPhone || '',
    shippingAddress: raw.shippingAddressDetail || raw.shippingAddress || '',
    buyerNote: raw.buyerNote || 'Giao giờ hành chính, gọi trước khi tới.',
  };
}

function packingTotals(raw) {
  return {
    subtotal: raw.subtotal || 0,
    shippingFee: raw.shippingFee || 0,
    totalAmount: raw.totalAmount || 0,
  };
}

export function normalizePackingOrder(raw, scope = {}) {
  if (!raw) return null;
  const orderId = raw.id || raw.orderId || raw.refId;
  const items = (raw.items || []).map(normalizePackingItem);
  const progress = scanProgress(raw, items);
  return {
    ...raw,
    id: orderId,
    orderId,
    orderNo: raw.orderNo || `OD-${orderId?.substring(0, 8)}`,
    status: raw.status || 'PAID',
    items,
    ...progress,
    allowedActions: packingActions(raw, progress),
    ...packingShipment(raw, scope),
    ...packingRecipient(raw),
    ...packingTotals(raw),
  };
}
