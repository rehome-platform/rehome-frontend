import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE_URL } from '../../src/configs/api.config.js';
import { request, packingService } from '../../src/features/moderator/services/packingApi.js';
import { phase4Contract } from '../../src/features/moderator/config/packingContract.js';
import { scope, orderFixture } from './fixtures.js';
const server = setupServer();
const original = structuredClone(phase4Contract);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => { Object.assign(phase4Contract, structuredClone(original)); server.resetHandlers(); });
afterAll(() => { Object.assign(phase4Contract, original); server.close(); });
function enable(op) { phase4Contract.revision = 'test-only'; phase4Contract.gates[op] = true; }
it('blocks unreviewed contracts, missing scope and cancelled calls', async () => {
  phase4Contract.gates.shipment = false;
  await expect(request('shipment', { orderId: 'o1', scope })).rejects.toMatchObject({ code: 'CONTRACT_BLOCKED' });
  enable('shipment');
  await expect(request('shipment', { orderId: 'o1', scope: {} })).rejects.toMatchObject({ status: 403 });
  const controller = new AbortController(); controller.abort();
  await expect(request('shipment', { scope, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
});
it('reports unsupported moderator order reads before network access', async () => {
  await expect(packingService.read('o1', { scope })).rejects.toMatchObject({ code: 'OPERATION_UNSUPPORTED' });
});
it('sends exact SKU casing to order id and unwraps the server result', async () => {
  enable('scan');
  server.use(http.post(`${API_BASE_URL}/orders/o1/pack/scan`, async ({ request }) => {
    expect(await request.json()).toEqual({ productId: 'sku-a' });
    return HttpResponse.json({ result: { matched: true, scannedCount: 1, totalCount: 2 } });
  }));
  await expect(packingService.scan('o1', 'sku-a', { scope })).resolves.toMatchObject({ scannedCount: 1 });
});
it('does not retry 502 shipment and supports no-content', async () => {
  enable('shipment'); let calls = 0;
  server.use(http.post(`${API_BASE_URL}/orders/o1/shipment`, () => {
    calls++; return HttpResponse.json({ code: 'GHN_ERROR' }, { status: 502 });
  }));
  await expect(packingService.shipment('o1', { scope })).rejects.toMatchObject({ status: 502 });
  expect(calls).toBe(1);
  server.use(http.post(`${API_BASE_URL}/orders/o1/shipment`, () => new HttpResponse(null, { status: 204 })));
  await expect(packingService.shipment('o1', { scope })).resolves.toBeNull();
});
it('never replays a mutation after 401 and expires the session', async () => {
  enable('shipment'); let calls = 0; const expired = vi.fn();
  window.addEventListener('auth:expired', expired);
  server.use(http.post(`${API_BASE_URL}/orders/o1/shipment`, () => { calls++; return new HttpResponse(null, { status: 401 }); }));
  await expect(packingService.shipment('o1', { scope })).rejects.toMatchObject({ status: 401 });
  expect(calls).toBe(1); expect(expired).toHaveBeenCalledOnce();
  window.removeEventListener('auth:expired', expired);
});
it('rejects cross-warehouse and mismatched detail DTOs', async () => {
  enable('read'); phase4Contract.operations.read.path = '/packing-test/:orderId';
  phase4Contract.operations.read.supported = true;
  const order = orderFixture();
  server.use(http.get(`${API_BASE_URL}/packing-test/o1`, () => HttpResponse.json({ result: { ...order, warehouseId: 'other' } })));
  await expect(packingService.read('o1', { scope })).rejects.toMatchObject({ status: 403 });
  server.use(http.get(`${API_BASE_URL}/packing-test/o1`, () => HttpResponse.json({ result: { ...order, orderId: 'q1' } })));
  await expect(packingService.read('o1', { scope })).rejects.toMatchObject({ code: 'INVALID_CONTRACT' });
});
it.each([403, 404, 409])('returns %s once without retrying scan', async status => {
  enable('scan'); let calls = 0;
  server.use(http.post(`${API_BASE_URL}/orders/o1/pack/scan`, () => { calls++; return new HttpResponse(null, { status }); }));
  await expect(packingService.scan('o1', 'sku-a', { scope })).rejects.toMatchObject({ status });
  expect(calls).toBe(1);
});
