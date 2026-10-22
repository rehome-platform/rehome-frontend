// Test-only frontend DTO. Not evidence of a deployed backend contract.
export const scope = { userId: 'mod-a', warehouseId: 'warehouse-a' };
export function orderFixture() {
  return {
    orderId: 'o1', queueId: 'q1', warehouseId: scope.warehouseId, claimedBy: scope.userId,
    claimExpiresAt: new Date(Date.now() + 3600000).toISOString(),
    allowedActions: ['SCAN', 'CREATE_SHIPMENT'], items: [
      { productId: 'sku-a', name: 'Áo', shelfLocation: 'A1' },
      { productId: 'SKU-B', name: 'Quần', shelfLocation: 'B2' },
    ], scannedProductIds: [], scannedCount: 0, totalCount: 2,
    shipmentOutcome: 'NOT_CREATED', ghnTrackingCode: null,
  };
}
