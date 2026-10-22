function ownsActiveClaim(order, scope, now) {
  return !!order && order.warehouseId === scope.warehouseId && !!scope.userId &&
    order.claimedBy === scope.userId && Date.parse(order.claimExpiresAt) > now &&
    !order.ghnTrackingCode && order.shipmentOutcome === 'NOT_CREATED';
}
export function canPack(order, scope, now = Date.now()) {
  return ownsActiveClaim(order, scope, now) && order.allowedActions?.includes('SCAN');
}
export function canShip(order, scope, now = Date.now()) {
  const ids = order?.items?.map(item => item.productId) || [];
  const scanned = new Set(order?.scannedProductIds || []);
  return ownsActiveClaim(order, scope, now) && order.allowedActions?.includes('CREATE_SHIPMENT') &&
    ids.length > 0 && new Set(ids).size === ids.length && ids.every(id => scanned.has(id)) &&
    order.scannedCount === ids.length && order.totalCount === ids.length &&
    order.shipmentOutcome === 'NOT_CREATED';
}
export function handoverPayload(task, identity, scope, now = Date.now()) {
  if (task?.context !== 'END_OF_TERM_TAKE_BACK' || !task.refId || !task.accountId ||
      !task.allowedActions?.includes('HANDOVER') || task.warehouseId !== scope.warehouseId ||
      identity?.accountId !== task.accountId || identity?.warehouseId !== scope.warehouseId ||
      !identity?.identityToken || !(Date.parse(identity.expiresAt) > now)) return null;
  return { accountId: task.accountId, context: task.context, refId: task.refId,
    identityToken: identity.identityToken };
}
