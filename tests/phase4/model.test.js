import { describe, expect, it } from 'vitest';
import { canPack, canShip, handoverPayload } from '../../src/features/moderator/phase4/model.js';
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
    order.scannedProductIds = ['sku-a', 'sku-a']; order.scannedCount = 2;
    expect(canShip(order, scope)).toBeFalsy();
    order.scannedProductIds = ['sku-a', 'SKU-B'];
    expect(canShip(order, scope)).toBeTruthy();
    expect(canShip({ ...order, allowedActions: ['CREATE_SHIPMENT'] }, scope)).toBeTruthy();
    expect(canShip({ ...order, shipmentOutcome: 'UNKNOWN' }, scope)).toBeFalsy();
    expect(canShip({ ...order, ghnTrackingCode: 'GHN-REAL' }, scope)).toBeFalsy();
  });
});
describe('handover identity', () => {
  const task = { accountId: 'account-1', refId: 'request-9', warehouseId: scope.warehouseId,
    context: 'END_OF_TERM_TAKE_BACK', allowedActions: ['HANDOVER'] };
  const identity = { accountId: task.accountId, warehouseId: scope.warehouseId,
    identityToken: 'proof', expiresAt: '2099-01-01T00:00:00Z' };
  it('keeps accountId/refId independent and passes the proof', () => {
    expect(handoverPayload(task, identity, scope)).toMatchObject({ accountId: 'account-1', refId: 'request-9', identityToken: 'proof' });
  });
  it('blocks wrong identity, warehouse, expiry and phase 5', () => {
    for (const proof of [{ ...identity, accountId: 'other' }, { ...identity, warehouseId: 'other' },
      { ...identity, expiresAt: '2000-01-01' }, { ...identity, expiresAt: undefined }])
      expect(handoverPayload(task, proof, scope)).toBeNull();
    expect(handoverPayload({ ...task, context: 'ITEM_WITHDRAWAL' }, identity, scope)).toBeNull();
    expect(handoverPayload({ ...task, refId: null }, identity, scope)).toBeNull();
  });
});
