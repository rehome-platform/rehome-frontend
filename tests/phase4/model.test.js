import { describe, expect, it } from 'vitest';
import {
  canPack,
  canShip,
  handoverPayload,
  formatOrderStatus,
  validateSkuInput,
  isOrderFullyScanned,
  normalizePackingOrder,
} from '../../src/features/moderator/models/packingModel.js';
import { orderFixture, scope } from './fixtures.js';

describe('packing eligibility', () => {
  it('requires owner, warehouse and an unexpired claim', () => {
    const order = orderFixture();
    expect(canPack(order, scope)).toBeTruthy();
    expect(canPack(order, { ...scope, userId: 'other' })).toBeFalsy();
    expect(canPack(order, { ...scope, warehouseId: 'other' })).toBeFalsy();
    expect(canPack({ ...order, claimExpiresAt: 'invalid' }, scope)).toBeFalsy();
    expect(canPack(order, scope, Date.parse(order.claimExpiresAt))).toBeFalsy();
  });
  it('requires all distinct SKU and explicit safe creation outcome', () => {
    const order = orderFixture();
    expect(canShip(order, scope)).toBeFalsy();
    order.scannedProductIds = ['sku-a', 'sku-a'];
    order.scannedCount = 2;
    expect(canShip(order, scope)).toBeFalsy();
    order.scannedProductIds = ['sku-a', 'SKU-B'];
    expect(canShip(order, scope)).toBeTruthy();
    expect(canShip({ ...order, allowedActions: ['CREATE_SHIPMENT'] }, scope)).toBeTruthy();
    expect(canShip({ ...order, shipmentOutcome: 'UNKNOWN' }, scope)).toBeFalsy();
    expect(canShip({ ...order, ghnTrackingCode: 'GHN-REAL' }, scope)).toBeFalsy();
  });
});

describe('handover identity', () => {
  const task = {
    accountId: 'account-1',
    refId: 'request-9',
    warehouseId: scope.warehouseId,
    context: 'END_OF_TERM_TAKE_BACK',
    allowedActions: ['HANDOVER'],
  };
  const identity = {
    accountId: task.accountId,
    warehouseId: scope.warehouseId,
    identityToken: 'proof',
    expiresAt: '2099-01-01T00:00:00Z',
  };
  it('keeps accountId/refId independent and passes the proof', () => {
    expect(handoverPayload(task, identity, scope)).toMatchObject({
      accountId: 'account-1',
      refId: 'request-9',
      identityToken: 'proof',
    });
  });
  it('blocks wrong identity, warehouse, expiry and phase 5', () => {
    for (const proof of [
      { ...identity, accountId: 'other' },
      { ...identity, warehouseId: 'other' },
      { ...identity, expiresAt: '2000-01-01' },
      { ...identity, expiresAt: undefined },
    ])
      expect(handoverPayload(task, proof, scope)).toBeNull();
    expect(handoverPayload({ ...task, context: 'ITEM_WITHDRAWAL' }, identity, scope)).toBeNull();
    expect(handoverPayload({ ...task, refId: null }, identity, scope)).toBeNull();
  });
});

describe('order normalization and validation', () => {
  it('formats order status with Vietnamese labels and fallback', () => {
    expect(formatOrderStatus('PAID')).toBe('Đã thanh toán');
    expect(formatOrderStatus('PACKING')).toBe('Đang đóng gói');
    expect(formatOrderStatus('SHIPPING')).toBe('Đang vận chuyển');
    expect(formatOrderStatus('DELIVERED')).toBe('Đã giao hàng');
    expect(formatOrderStatus('COMPLETED')).toBe('Hoàn tất');
    expect(formatOrderStatus('CANCELLED')).toBe('Đã hủy');
    expect(formatOrderStatus('CUSTOM_STATUS')).toBe('CUSTOM_STATUS');
    expect(formatOrderStatus(null)).toBe('Không xác định');
  });

  it('validates SKU input trimming and empty checks', () => {
    expect(validateSkuInput('')).toEqual({
      valid: false,
      message: 'Vui lòng nhập hoặc quét mã SKU trên tem sản phẩm.',
    });
    expect(validateSkuInput('   ')).toEqual({
      valid: false,
      message: 'Vui lòng nhập hoặc quét mã SKU trên tem sản phẩm.',
    });
    expect(validateSkuInput('  Q7-AT-000002  ')).toEqual({
      valid: true,
      value: 'Q7-AT-000002',
    });
  });

  it('checks if order is fully scanned correctly', () => {
    expect(isOrderFullyScanned(null)).toBe(false);
    expect(isOrderFullyScanned({ items: [] })).toBe(false);
    const order = {
      items: [{ productId: 'sku-1' }, { productId: 'sku-2' }],
      scannedProductIds: ['sku-1'],
      scannedCount: 1,
    };
    expect(isOrderFullyScanned(order)).toBe(false);
    order.scannedProductIds = ['sku-1', 'sku-2'];
    order.scannedCount = 2;
    expect(isOrderFullyScanned(order)).toBe(true);
  });

  it('normalizes raw backend order into complete packing order structure', () => {
    const raw = {
      id: 'ord-123',
      orderNo: 'OD-2026-SEED02',
      status: 'PAID',
      items: [
        { productId: 'Q7-AT-000002', name: 'Áo thun nam', size: 'L', shelfLocation: 'A1-02' },
      ],
      shippingRecipientName: 'Nguyễn Văn Buyer 1',
      shippingPhone: '0911111101',
      shippingAddressDetail: '12 Nguyễn Huệ, Phường Sài Gòn, TP.HCM',
    };

    const normalized = normalizePackingOrder(raw, scope);
    expect(normalized.orderId).toBe('ord-123');
    expect(normalized.orderNo).toBe('OD-2026-SEED02');
    expect(normalized.status).toBe('PAID');
    expect(normalized.totalCount).toBe(1);
    expect(normalized.scannedCount).toBe(0);
    expect(normalized.allowedActions).toContain('SCAN');
    expect(normalized.recipientName).toBe('Nguyễn Văn Buyer 1');
    expect(normalized.recipientPhone).toBe('0911111101');
    expect(normalized.shippingAddress).toBe('12 Nguyễn Huệ, Phường Sài Gòn, TP.HCM');
  });
});
