import { beforeEach, expect, it } from 'vitest';
import { fixtureRequest, resetFixtures } from '../../src/features/moderator/fixtures/warehouseFixtures.js';
const scope = { userId: 'mod-1', warehouseId: 'warehouse-a' };
beforeEach(resetFixtures);
it('uses distinct decision and receipt IDs, then reflects the new consignment lifecycle', async () => {
  const pending = await fixtureRequest('endTermPendingPricing', { scope });
  const request = pending.find(row => row.productId === 'RH-M4T19B');
  expect(request.decisionId).not.toBe(request.productId);
  const result = await fixtureRequest('endTermReconsignTerms', { scope, ids: { decisionId: request.decisionId }, data: { agreedPrice: 300000 } });
  expect(result.newReceiptId).toBeTruthy();
  expect(result.newReceiptId).not.toMatch(/^KG-/);
  expect(await fixtureRequest('endTermPendingPricing', { scope })).not.toEqual(expect.arrayContaining([expect.objectContaining({ productId: 'RH-M4T19B' })]));
  await fixtureRequest('endTermConfirmReceipt', { scope, ids: { receiptId: result.newReceiptId } });
  const product = await fixtureRequest('productRead', { scope, ids: { sku: 'RH-M4T19B' } });
  expect(product).toMatchObject({ status: 'ON_SALE', currentTerm: 1, currentPrice: 300000, receiptId: result.newReceiptId, decisionId: null });
  expect(Date.parse(product.endOfTermDeadline) - Date.parse(product.termStartedAt)).toBe(90 * 86400000);
  expect(product.allowedActions).not.toContain('RE_CONSIGN');
});
