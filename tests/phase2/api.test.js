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
  it('blocks unknown contracts before network access', async () => {
    await expect(request('queueClaim', { ids: { queueId: 'q1' }, scope })).rejects.toMatchObject({
      code: 'CONTRACT_BLOCKED',
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
