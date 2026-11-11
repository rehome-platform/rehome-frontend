import { beforeEach, expect, it } from 'vitest';
import { fixtureRequest, resetFixtures } from '../../src/features/moderator/fixtures/warehouseFixtures.js';
const scope = { userId: 'mod-1', warehouseId: 'warehouse-degraded' };
beforeEach(resetFixtures);
it('persists the case evidence and deadline and hides a fixture product after opening', async () => {
  const created = await fixtureRequest('degradedCaseCreate', { scope, data: { productId: 'RH-DG-ONSALE', notes: 'Damage note', photos: ['https://photos.test/damage'] } });
  expect(created.productId).toBe('RH-DG-ONSALE');
  expect(created.id).not.toBe(created.productId);
  expect(created.photos).toEqual(['https://photos.test/damage']);
  expect(created.moderatorNote).toBe('Damage note');
  expect(Date.parse(created.decisionDeadline) - Date.parse(created.receivedAt)).toBe(30 * 86400000);
  expect(created.pickupDeadline).toBeNull();
  expect((await fixtureRequest('productRead', { scope, ids: { sku: created.productId } })).status).toBe('WAREHOUSE');
  expect((await fixtureRequest('degradedCaseRead', { scope, ids: { id: created.id } })).id).toBe(created.id);
  expect(await fixtureRequest('degradedCaseList', { scope })).toEqual(expect.arrayContaining([created]));
  await expect(fixtureRequest('degradedCaseCreate', { scope, data: { productId: created.productId } })).rejects.toThrow();
});
