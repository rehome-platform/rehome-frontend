import { beforeEach, describe, expect, it } from 'vitest';
import {
  confirmFixtureReceipt,
  fixtureRequest,
  resetFixtures,
} from '../../src/features/moderator/phase2/fixtures.js';
const scope = { userId: 'moderator-a', warehouseId: 'warehouse-a' };
const call = (operation, options = {}) => fixtureRequest(operation, { scope, ...options });
beforeEach(resetFixtures);
describe('view-model workflow fixtures (not live backend evidence)', () => {
  it('preserves initial IDs, ordering, filters, copies and reset isolation', async () => {
    const queue = await call('queueList');
    expect(queue.items.map((row) => row.queueId)).toEqual(['queue-review', 'queue-inspect']);
    queue.items[0].status = 'CHANGED';
    expect((await call('queueList')).items[0].status).toBe('PENDING');
    expect((await call('queueList', { params: { type: 'INSPECTION' } })).items)
      .toMatchObject([{ queueId: 'queue-inspect' }]);
    await call('queueClaim', { ids: { queueId: 'queue-review' } });
    expect((await call('queueList', { params: { claim: 'mine' } })).totalElements).toBe(1);
    expect((await call('queueList', { params: { claim: 'unclaimed' } })).totalElements).toBe(1);
    expect(await call('queueRelease', { ids: { queueId: 'queue-review' } })).toBeNull();
    expect((await call('endTermList')).items.map((row) => [row.sku, row.decision])).toEqual([
      ['TEST-SKU-1', 'TAKE_BACK'], ['TEST-SKU-2', 'RE_CONSIGN'], ['TEST-SKU-3', 'UNCLAIMED'],
    ]);
    expect((await call('inventoryList', { params: { sku: 'SKU-3', shelf: 'A', status: 'UNCLAIMED' } }))
      .items).toMatchObject([{ sku: 'TEST-SKU-3' }]);
    expect((await call('inventoryList', { params: { page: 1 } })).items).toEqual([]);
    expect(await call('skuLabel', { ids: { sku: 'TEST-SKU-1' } })).toEqual({ labelPdfUrl: null });
    expect(await call('productByReceipt', { ids: { receiptId: 'missing' } })).toBeNull();
    resetFixtures();
    expect((await call('queueList', { params: { claim: 'unclaimed' } })).totalElements).toBe(2);
  });
  it('preserves session, cancellation, unknown-operation and identity-scope guards', async () => {
    await expect(fixtureRequest('catalogList')).rejects.toMatchObject({ status: 403 });
    const controller = new AbortController();
    controller.abort();
    await expect(call('catalogList', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    for (const operation of ['unknown', 'toString', '__proto__'])
      await expect(call(operation)).rejects.toMatchObject({ code: 'CONTRACT_BLOCKED', status: 0 });
    await expect(call('memberLookup', { params: {} })).rejects.toMatchObject({ status: 422 });
    expect(await call('memberLookup', { params: { qrPayload: 'MB-001' } }))
      .toMatchObject([{ memberId: 'member-1' }]);
    const proof = await call('identityConfirm', { data: { memberId: 'member-1' } });
    await call('queueClaim', { ids: { queueId: 'queue-inspect' } });
    await call('queueRelease', { ids: { queueId: 'queue-inspect' } });
    const other = { ...scope, userId: 'other' };
    await call('queueClaim', { ids: { queueId: 'queue-inspect' }, scope: other });
    await expect(call('inspectionStart', { ids: { formId: 'form-inspect' }, data: proof, scope: other }))
      .rejects.toMatchObject({ status: 403 });
  });
  it('preserves approval, rejection, return validation and receipt snapshot values', async () => {
    await call('queueClaim', { ids: { queueId: 'queue-review' } });
    const approved = await call('formApprove', { ids: { formId: 'form-review' } });
    expect(approved).toMatchObject({ status: 'APPROVED', claimedBy: null,
      allowedActions: ['START_INSPECTION'], bringDeadline: '2026-10-25T10:00:00Z' });
    resetFixtures();
    await call('queueClaim', { ids: { queueId: 'queue-review' } });
    expect(await call('formReject', { ids: { formId: 'form-review' }, data: { reason: 'Reason' } }))
      .toMatchObject({ status: 'REJECTED', allowedActions: [], claimedBy: null });
    expect(await call('memberTasks', { ids: { memberId: 'member-1' } }))
      .toMatchObject([{ formId: 'form-inspect' }]);
    const proof = await call('identityConfirm', { data: { memberId: 'member-1' } });
    await call('queueClaim', { ids: { queueId: 'queue-inspect' } });
    await call('inspectionStart', { ids: { formId: 'form-inspect' }, data: proof });
    for (const invalid of [{ agreedPrice: 0 }, { agreedPrice: 1.5 }, { termLengthDays: 60 }, { conditionNote: ' ' }])
      await expect(call('inspectionComplete', { ids: { formId: 'form-inspect' },
        data: { ...proof, agreedPrice: 250001, termLengthDays: 30, conditionNote: 'Good', ...invalid } }))
        .rejects.toMatchObject({ status: 422 });
    const { receiptId } = await call('inspectionComplete', { ids: { formId: 'form-inspect' },
      data: { ...proof, agreedPrice: 250001, termLengthDays: 30, conditionNote: 'Good' } });
    expect(await call('receiptRead', { ids: { receiptId } })).toMatchObject({
      receiptId: 'receipt-1', confirmedAt: null, productSku: null,
      snapshot: { agreedPrice: 250001, floorPrice: 125001, commissionRate: 0.1, termLengthDays: 30 },
    });
    resetFixtures();
    const freshProof = await call('identityConfirm', { data: { memberId: 'member-1' } });
    await call('queueClaim', { ids: { queueId: 'queue-inspect' } });
    await call('inspectionStart', { ids: { formId: 'form-inspect' }, data: freshProof });
    await expect(call('returnOnsite', { ids: { formId: 'form-inspect' },
      data: { ...freshProof, reason: 'OTHER', note: 'Note' } })).rejects.toMatchObject({ status: 422 });
    expect(await call('returnOnsite', { ids: { formId: 'form-inspect' },
      data: { ...freshProof, reason: 'FAIL', note: 'Note' } })).toBeNull();
    expect(await call('formRead', { ids: { formId: 'form-inspect' } }))
      .toMatchObject({ status: 'RETURNED_ONSITE', allowedActions: [] });
  });
  it('preserves catalog create/update IDs, visibility and slot validation', async () => {
    const category = await call('categoryCreate', { data: { name: 'New', slot: 'BOTTOM' } });
    expect(category).toEqual({ id: 'fixture-categoryCreate-4', name: 'New', slot: 'BOTTOM', hidden: false });
    expect(await call('categoryUpdate', { ids: { id: category.id }, data: { name: 'Edited', slot: 'TOP' } }))
      .toMatchObject({ id: category.id, name: 'Edited', slot: 'TOP' });
    await expect(call('categoryUpdate', { ids: { id: category.id }, data: { name: 'Edited', slot: 'OTHER' } }))
      .rejects.toMatchObject({ status: 422 });
    await call('categoryHide', { ids: { id: category.id } });
    const brand = await call('brandCreate', { data: { name: 'New brand' } });
    expect(brand.id).toBe('fixture-brandCreate-3');
    expect(await call('brandUpdate', { ids: { id: brand.id }, data: { name: 'Edited brand' } }))
      .toMatchObject({ id: brand.id, name: 'Edited brand' });
    const catalog = await call('catalogList');
    expect(catalog.categories.find((row) => row.id === category.id).hidden).toBe(true);
    expect(await call('productPhotos', { ids: { sku: 'TEST-SKU-1' }, data: { photoUrls: ['https://example.test/photo'] } }))
      .toMatchObject({ photos: [{ url: 'https://example.test/photo', status: 'PROCESSING' }] });
  });
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
