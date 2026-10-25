import { beforeEach, describe, expect, it } from 'vitest';
import {
  confirmFixtureReceipt,
  fixtureRequest,
  resetFixtures,
} from '../../src/features/moderator/fixtures/warehouseFixtures.js';
const scope = { userId: 'moderator-a', warehouseId: 'warehouse-a' };
const call = (operation, options = {}) => fixtureRequest(operation, { scope, ...options });
beforeEach(resetFixtures);
describe('view-model workflow fixtures (not live backend evidence)', () => {
  it('requires explicit selection for a shared phone number', async () => {
    const members = await call('memberLookup', { params: { phone: '0900000001' } });
    expect(members).toHaveLength(2);
    expect(members[0].memberId).not.toBe(members[1].memberId);
  });
  it('allows only one owner to claim a queue ID', async () => {
    await call('queueClaim', { ids: { queueId: 'queue-review' } });
    await expect(
      call('queueClaim', {
        ids: { queueId: 'queue-review' },
        scope: { ...scope, userId: 'other' },
      }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      call('formApprove', { ids: { formId: 'form-review' }, scope: { ...scope, userId: 'other' } }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it('rejects resources from another warehouse', async () => {
    await expect(
      call('formRead', {
        ids: { formId: 'form-review' },
        scope: { ...scope, warehouseId: 'warehouse-b' },
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('requires rejection reason and identity before inspection', async () => {
    await call('queueClaim', { ids: { queueId: 'queue-review' } });
    await expect(
      call('formReject', { ids: { formId: 'form-review' }, data: { reason: ' ' } }),
    ).rejects.toMatchObject({ status: 422 });
    await call('queueClaim', { ids: { queueId: 'queue-inspect' } });
    await expect(
      call('inspectionStart', { ids: { formId: 'form-inspect' } }),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('gates stock-in on mobile confirmation and prevents a second SKU', async () => {
    const proof = await call('identityConfirm', { data: { memberId: 'member-1' } });
    await call('queueClaim', { ids: { queueId: 'queue-inspect' } });
    await call('inspectionStart', { ids: { formId: 'form-inspect' }, data: proof });
    const { receiptId } = await call('inspectionComplete', {
      ids: { formId: 'form-inspect' },
      data: { ...proof, agreedPrice: 250000, conditionNote: 'Tốt', termLengthDays: 30 },
    });
    const data = { receiptId, name: 'Quần', size: 'M', shelfLocation: 'A2', photoUrls: [] };
    await expect(call('productCreate', { data })).rejects.toMatchObject({ status: 409 });
    confirmFixtureReceipt(receiptId);
    const product = await call('productCreate', { data });
    expect(product.status).toBe('ON_SALE');
    await expect(call('productCreate', { data })).rejects.toMatchObject({ status: 409 });
    const recovered = await call('productByReceipt', { ids: { receiptId } });
    expect(recovered.sku).toBe(product.sku);
    await call('shelfUpdate', { ids: { sku: product.sku }, data: { shelfLocation: 'B2' } });
    expect(await call('stockMovements', { ids: { sku: product.sku } })).toHaveLength(2);
  });
  it('keeps history references when catalog is hidden and rejects duplicate names', async () => {
    await call('brandHide', { ids: { id: 'brand-1' } });
    const catalog = await call('catalogList');
    expect(catalog.brands.find((item) => item.id === 'brand-1').hidden).toBe(true);
    await expect(call('brandCreate', { data: { name: 'rehome' } })).rejects.toMatchObject({
      status: 409,
    });
  });
  it('supports all three end-of-term branches without creating another SKU', async () => {
    const proof = await call('identityConfirm', { data: { memberId: 'member-1' } });
    await call('endTermHandover', {
      ids: { sku: 'TEST-SKU-1' },
      data: { ...proof, context: 'END_OF_TERM_TAKE_BACK' },
    });
    const { receiptId } = await call('endTermReconsign', {
      ids: { sku: 'TEST-SKU-2' },
      data: { agreedPrice: 180000, termLengthDays: 30 },
    });
    expect((await call('receiptRead', { ids: { receiptId } })).sku).toBe('TEST-SKU-2');
    confirmFixtureReceipt(receiptId);
    expect((await call('productRead', { ids: { sku: 'TEST-SKU-2' } })).status).toBe('ON_SALE');
    await call('unclaimedTransfer', {
      ids: { sku: 'TEST-SKU-3' },
      data: { partnerName: 'Đối tác thử' },
    });
    await expect(
      call('unclaimedTransfer', {
        ids: { sku: 'TEST-SKU-3' },
        data: { partnerName: 'Đối tác thử' },
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect((await call('inventoryList')).totalElements).toBe(3);
    expect((await call('productRead', { ids: { sku: 'TEST-SKU-3' } })).status).toBe('DONATED');
  });
});
