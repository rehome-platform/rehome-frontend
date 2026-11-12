import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE_URL } from '../../src/configs/api.config.js';
import { inventoryService } from '../../src/features/moderator/services/inventoryApi.js';
import { endTermService } from '../../src/features/moderator/services/endTermApi.js';
import { rememberProposal, readProposals } from '../../src/features/moderator/services/reconsignProposalStore.js';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => { server.resetHandlers(); sessionStorage.clear(); });
afterAll(() => server.close());
it('includes expired WAREHOUSE items and pending pricing across pages, but excludes ordinary storage', async () => {
  const options = { scope: { userId: 'mod-1', warehouseId: 'warehouse-1' } };
  rememberProposal({ productId: 'sent', decisionId: 'sent-decision', receiptId: 'new-receipt' }, options);
  server.use(
    http.get(`${API_BASE_URL}/inventory`, ({ request }) => {
      const url = new URL(request.url);
      const status = url.searchParams.get('status');
      const page = Number(url.searchParams.get('page'));
      const content = status === 'WAREHOUSE' ? (page === 0 ? [{ id: 'ordinary' }, { id: 'expired' }, { id: 'sent' }, { id: 'changed' }] : [{ id: 'pricing' }]) : [];
      return HttpResponse.json({ content, totalPages: status === 'WAREHOUSE' ? 2 : 0 });
    }),
    http.get(`${API_BASE_URL}/products/:id`, ({ params }) => HttpResponse.json({ id: params.id, status: params.id === 'changed' ? 'ON_SALE' : 'WAREHOUSE', decisionId: params.id === 'expired' ? 'waiting-choice' : null, degradedCaseId: null })),
    http.get(`${API_BASE_URL}/end-of-term-decisions/pending-pricing`, () => HttpResponse.json([{ decisionId: 'pricing-decision', productId: 'pricing', productName: 'Pricing item', currentPrice: 150000, previousAgreedPrice: 300000 }])),
  );
  const result = await inventoryService.list({ status: 'WAITING_END_OF_TERM', page: 0, size: 20 }, options);
  expect(result.items.map(row => row.sku)).toEqual(['expired', 'sent', 'pricing']);
  expect(result.items[2]).toMatchObject({ decisionId: 'pricing-decision', decision: 'RE_CONSIGN', allowedActions: expect.arrayContaining(['RE_CONSIGN']) });
  expect(result.items[1]).toMatchObject({ reConsignStatus: 'PROPOSAL_SENT', newReceiptId: 'new-receipt' });
  expect(result.items[0].allowedActions).not.toContain('RE_CONSIGN');
  expect(result.totalElements).toBe(3);
  expect(readProposals({ scope: { userId: 'other-user', warehouseId: 'warehouse-1' } })).toEqual([]);
});
it('preserves detail IDs, including nulls, and posts terms only using the decision UUID', async () => {
  let target;
  server.use(
    http.get(`${API_BASE_URL}/products/SKU-A`, () => HttpResponse.json({ id: 'SKU-A', status: 'WAREHOUSE', decisionId: null, degradedCaseId: 'case-uuid' })),
    http.post(`${API_BASE_URL}/end-of-term-decisions/:id/re-consign-terms`, async ({ params, request }) => {
      target = { id: params.id, body: await request.json() };
      return HttpResponse.json({ decisionId: params.id, newReceiptId: 'receipt-uuid' });
    }),
  );
  expect(await inventoryService.read('SKU-A')).toMatchObject({ decisionId: null, degradedCaseId: 'case-uuid' });
  await endTermService.proposeReConsignPrice('decision-uuid', { agreedPrice: 350000, floorPrice: 175000 });
  expect(target).toMatchObject({ id: 'decision-uuid', body: { agreedPrice: 350000, floorPrice: 175000, termLengthDays: 30 } });
  await expect(endTermService.proposeReConsignPrice(null, { agreedPrice: 350000 })).rejects.toThrow(/quyết định/i);
});
