import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { request } from '../../src/features/moderator/services/warehouseApi.js';
import { phase2Contract } from '../../src/features/moderator/config/warehouseContract.js';
import { API_BASE_URL } from '../../src/configs/api.config.js';

const server = setupServer();
const scope = { userId: 'mod-a', warehouseId: 'warehouse-a' };
const original = structuredClone(phase2Contract);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  Object.assign(phase2Contract, structuredClone(original));
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => {
  Object.assign(phase2Contract, original);
  server.close();
});
function enable(operation, method = 'get') {
  phase2Contract.revision = 'test-only';
  phase2Contract.gates.A = true;
  phase2Contract.operations[operation] = { method, path: '/phase2-test/:queueId', gate: 'A' };
}
describe('reviewed contract adapter', () => {
  it('uses the enabled queue contract with PACKING query and bearer token', async () => {
    localStorage.setItem('rehome_token', 'moderator-token');
    server.use(http.get(`${API_BASE_URL}/queues`, ({ request }) => {
      expect(new URL(request.url).searchParams.get('type')).toBe('PACKING');
      expect(request.headers.get('authorization')).toBe('Bearer moderator-token');
      return HttpResponse.json({ result: [{ id: 'packing-a', type: 'PACKING' }] });
    }));
    await expect(request('queueList', { params: { type: 'PACKING' }, scope })).resolves.toEqual([
      { id: 'packing-a', type: 'PACKING' },
    ]);
  });
  it('uploads multipart data with the contract folder and a browser boundary', async () => {
    const data = new FormData();
    data.append('file', new File(['product image'], 'product.jpg', { type: 'image/jpeg' }), 'product.jpg');
    server.use(http.post(`${API_BASE_URL}/uploads`, async ({ request }) => {
      expect(new URL(request.url).searchParams.get('folder')).toBe('PRODUCTS');
      expect(request.headers.get('content-type')).toMatch(/^multipart\/form-data; boundary=/);
      const body = await request.formData();
      expect(body.get('file').type).toBe('image/jpeg');
      expect(await body.get('file').text()).toBe('product image');
      return HttpResponse.json({ result: { url: 'https://example.test/product.jpg' } });
    }));
    await expect(request('photoUpload', { data, scope })).resolves.toEqual({
      url: 'https://example.test/product.jpg',
    });
  });
  it('returns PDF bytes as a Blob for the enabled SKU label contract', async () => {
    const pdf = '%PDF-1.4\nSKU label\n%%EOF';
    server.use(http.get(`${API_BASE_URL}/products/sku-a/sku-label`, () =>
      new HttpResponse(pdf, { headers: { 'Content-Type': 'application/pdf' } })));
    const blob = await request('skuLabel', { ids: { sku: 'sku-a' }, scope });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
    const contents = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
    expect(contents).toBe(pdf);
  });
  it('blocks explicitly disabled contracts before network access', async () => {
    phase2Contract.gates.A = false;
    await expect(request('queueClaim', { ids: { queueId: 'q1' }, scope })).rejects.toMatchObject({
      code: 'CONTRACT_BLOCKED',
    });
  });
  it('reports operations without a backend API as unsupported', async () => {
    await expect(request('productPhotos', { ids: { sku: 'sku-a' }, scope })).rejects.toMatchObject({
      code: 'OPERATION_UNSUPPORTED',
    });
  });
  it('requires server warehouse identity even for an enabled operation', async () => {
    enable('queueClaim');
    await expect(
      request('queueClaim', { ids: { queueId: 'q1' }, scope: {} }),
    ).rejects.toMatchObject({ status: 403 });
  });
  it('supports 204 with no body', async () => {
    enable('queueRelease', 'post');
    server.use(
      http.post(`${API_BASE_URL}/phase2-test/q1`, () => new HttpResponse(null, { status: 204 })),
    );
    await expect(request('queueRelease', { ids: { queueId: 'q1' }, scope })).resolves.toBeNull();
  });
  it('does not retry conflict or 403 mutations', async () => {
    enable('queueClaim', 'post');
    let calls = 0;
    server.use(
      http.post(`${API_BASE_URL}/phase2-test/q1`, () => {
        calls++;
        return HttpResponse.json({ code: 'CLAIM_TAKEN' }, { status: 409 });
      }),
    );
    await expect(request('queueClaim', { ids: { queueId: 'q1' }, scope })).rejects.toMatchObject({
      status: 409,
      code: 'CLAIM_TAKEN',
    });
    expect(calls).toBe(1);
    server.use(
      http.post(`${API_BASE_URL}/phase2-test/q1`, () => new HttpResponse(null, { status: 403 })),
    );
    await expect(request('queueClaim', { ids: { queueId: 'q1' }, scope })).rejects.toMatchObject({
      status: 403,
    });
  });
  it('honors cancellation before sending any operation', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(request('queueClaim', { signal: controller.signal, scope })).rejects.toMatchObject(
      { name: 'AbortError' },
    );
  });
});
