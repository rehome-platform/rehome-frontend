import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  queueService,
  counterService,
  consignmentService,
  inventoryService,
  catalogService,
  endTermService,
} from '../../src/features/moderator/services/warehouseApi.js';
import { API_BASE_URL, API_ENDPOINTS } from '../../src/configs/api.config.js';
import { fixtureRequest } from '../../src/features/moderator/fixtures/warehouseFixtures.js';

vi.mock('../../src/features/moderator/fixtures/warehouseFixtures.js', () => ({
  fixtureRequest: vi.fn(async () => [{ id: 'fixture-data', isMock: true }]),
}));

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  server.resetHandlers();
  localStorage.clear();
  window.history.replaceState({}, '', '/');
  vi.clearAllMocks();
});
afterEach(() => expect(fixtureRequest).not.toHaveBeenCalled());
afterAll(() => server.close());

describe('API 25-48 Integration & Safety Resilience Tests', () => {
  // 1. Success case: API 28 list queue items
  it('API 28: fetches queue items successfully with type query', async () => {
    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.QUEUES}`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('type')).toBe('FORM_REVIEW');
        return HttpResponse.json([
          { id: 'q-101', type: 'FORM_REVIEW', status: 'PENDING', refId: 'form-1' },
        ]);
      }),
    );

    const result = await queueService.list({ type: 'FORM_REVIEW' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('q-101');
    expect(result[0].status).toBe('PENDING');
  });

  // 2. Empty response: Does NOT replace empty list with fake mock data
  it('API 28: preserves legitimate empty queue response without injecting mock fixtures', async () => {
    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.QUEUES}`, () => {
        return HttpResponse.json([]);
      }),
    );

    const result = await queueService.list({ type: 'INSPECTION' });
    expect(result).toEqual([]);
  });

  // 3. Empty response for inventory: preserves 0 totalElements and empty items
  it('API 40: preserves legitimate empty inventory response without injecting mock fixtures', async () => {
    server.use(
      http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.INVENTORY}`, () => {
        return HttpResponse.json({
          content: [],
          totalElements: 0,
          totalPages: 0,
        });
      }),
    );

    const result = await inventoryService.list({ status: 'ON_SALE' });
    expect(result.items).toEqual([]);
    expect(result.totalElements).toBe(0);
  });

  // 4. Mutation failure: Never reports fake success on write failures (409 Conflict)
  it('API 29: throws error on claim conflict and does NOT fallback to mock', async () => {
    server.use(
      http.post(`${API_BASE_URL}/queues/q-locked/claim`, () => {
        return HttpResponse.json(
          { code: 'QUEUE_ITEM_ALREADY_CLAIMED', message: 'Công việc đã được nhận bởi người khác' },
          { status: 409 },
        );
      }),
    );

    await expect(queueService.claim('q-locked')).rejects.toMatchObject({
      status: 409,
      code: 'QUEUE_ITEM_ALREADY_CLAIMED',
    });
  });

  // 5. 403 Forbidden: Missing warehouse permission or unauthorized warehouse
  it('API 42: throws 403 when updating shelf for product in another warehouse', async () => {
    server.use(
      http.patch(`${API_BASE_URL}/products/Q7-AK-000001/shelf-location`, () => {
        return HttpResponse.json(
          { code: 'PRODUCT_NOT_IN_YOUR_WAREHOUSE', message: 'Sản phẩm không thuộc kho của bạn' },
          { status: 403 },
        );
      }),
    );

    await expect(inventoryService.shelf('Q7-AK-000001', 'B2-01')).rejects.toMatchObject({
      status: 403,
      code: 'PRODUCT_NOT_IN_YOUR_WAREHOUSE',
    });
  });

  // 6. 500 Server Error on mutation: Throws normalized error without fake success
  it('API 31: throws 500 when approve form fails on server without fake success', async () => {
    server.use(
      http.post(`${API_BASE_URL}/consignment-forms/form-err/approve`, () => {
        return HttpResponse.json(
          { code: 'INTERNAL_SERVER_ERROR', message: 'Lỗi máy chủ nội bộ' },
          { status: 500 },
        );
      }),
    );

    await expect(consignmentService.approve('form-err')).rejects.toMatchObject({
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
    });
  });

  it('API 25: preserves not-found errors without returning a fixture member', async () => {
    server.use(
      http.post(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.COUNTER_LOOKUP}`, () => {
        return new HttpResponse(null, { status: 404 });
      }),
    );

    await expect(counterService.lookup(
      { phone: '0900000001' },
      { scope: { userId: 'mod-1', warehouseId: 'warehouse-a' } },
    )).rejects.toMatchObject({ status: 404 });
  });

  // 8. 401 Unauthorized: Session expiration
  it('API 41: throws normalized 401 on expired session', async () => {
    window.history.replaceState({}, '', '/login');
    server.use(
      http.get(`${API_BASE_URL}/products/CG-AK-000011`, () => {
        return HttpResponse.json({ code: 'UNAUTHORIZED', message: 'Phiên đăng nhập hết hạn' }, { status: 401 });
      }),
    );

    await expect(inventoryService.read('CG-AK-000011')).rejects.toMatchObject({
      status: 401,
      code: 'UNAUTHORIZED',
    });
  });

  // 9. Timeout / Cancellation: AbortController aborts before request completes
  it('honors cancellation and throws AbortError', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      queueService.list({ type: 'ALL' }, { signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('real API mode never substitutes warehouse fixtures', () => {
  const reads = [
    ['member lookup', 'post', '/counter/lookup', options => counterService.lookup({ phone: '0900000001' }, options)],
    ['member tasks', 'get', '/counter/members/member-a/tasks', options => counterService.tasks('member-a', options)],
    ['consignment form', 'get', '/consignment-forms/form-a', options => consignmentService.read('form-a', options)],
    ['consignment receipt', 'get', '/consignment-receipts/receipt-a', options => consignmentService.receipt('receipt-a', options)],
  ];

  it.each(reads)('%s propagates 403 and 404 errors', async (_, method, path, read) => {
    for (const status of [403, 404]) {
      server.use(http[method](`${API_BASE_URL}${path}`, () =>
        HttpResponse.json({ code: 'BACKEND_ERROR' }, { status })));
      await expect(read()).rejects.toMatchObject({ status, code: 'BACKEND_ERROR' });
    }
  });

  it.each(reads)('%s propagates network errors', async (_, method, path, read) => {
    server.use(http[method](`${API_BASE_URL}${path}`, () => HttpResponse.error()));
    await expect(read()).rejects.toMatchObject({ status: 0 });
  });

  it.each(reads)('%s honors cancellation before network access', async (_, method, path, read) => {
    const network = vi.fn(() => HttpResponse.json({ result: [] }));
    server.use(http[method](`${API_BASE_URL}${path}`, network));
    const controller = new AbortController();
    controller.abort();
    await expect(read({ signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(network).not.toHaveBeenCalled();
  });

  it('preserves cancellation of an in-flight form read without falling back to fixtures', async () => {
    let finishResponse;
    let notifyStarted;
    const started = new Promise(resolve => { notifyStarted = resolve; });
    server.use(http.get(`${API_BASE_URL}/consignment-forms/form-a`, async () => {
      await new Promise(resolve => {
        finishResponse = resolve;
        notifyStarted();
      });
      return HttpResponse.json({ result: { id: 'form-a' } });
    }));
    const controller = new AbortController();
    const pending = consignmentService.read('form-a', { signal: controller.signal });
    await started;
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    finishResponse();
  });

  it('unwraps backend result envelopes and sends the exact lookup body', async () => {
    server.use(http.post(`${API_BASE_URL}/counter/lookup`, async ({ request }) => {
      expect(await request.json()).toEqual({ memberCode: 'MB-000001' });
      return HttpResponse.json({ result: [{ accountId: 'member-a', memberCode: 'MB-000001', fullName: 'Nguyễn An' }] });
    }));
    await expect(counterService.lookup({ memberCode: 'MB-000001' })).resolves.toMatchObject([
      { memberId: 'member-a', memberCode: 'MB-000001', fullName: 'Nguyễn An', isMock: false },
    ]);
  });

  it('preserves an empty lookup and all three empty task groups', async () => {
    const groups = { pendingForms: [], pendingWithdrawals: [], pendingEndOfTerm: [] };
    server.use(
      http.post(`${API_BASE_URL}/counter/lookup`, () => HttpResponse.json({ result: [] })),
      http.get(`${API_BASE_URL}/counter/members/member-a/tasks`, () => HttpResponse.json({ result: groups })),
    );
    await expect(counterService.lookup({ phone: '0900000001' })).resolves.toEqual([]);
    await expect(counterService.tasks('member-a')).resolves.toMatchObject(groups);
  });

  it.each([
    ['form', '/consignment-forms/form-a', () => consignmentService.read('form-a')],
    ['receipt', '/consignment-receipts/receipt-a', () => consignmentService.receipt('receipt-a')],
  ])('preserves an empty %s result', async (_, path, read) => {
    server.use(http.get(`${API_BASE_URL}${path}`, () => HttpResponse.json({ result: null })));
    await expect(read()).resolves.toBeNull();
  });

  it('accepts 204 queue release without fabricating a response', async () => {
    server.use(http.post(`${API_BASE_URL}/queues/queue-a/release`, () => new HttpResponse(null, { status: 204 })));
    await expect(queueService.release('queue-a')).resolves.toBeNull();
  });

  it('loads end-of-term products from inventory with the supported unclaimed status', async () => {
    server.use(http.get(`${API_BASE_URL}/inventory`, ({ request }) => {
      const params = new URL(request.url).searchParams;
      expect(params.get('status')).toBe('UNCLAIMED');
      expect(params.get('page')).toBe('1');
      return HttpResponse.json({ result: { content: [{ id: 'sku-a', name: 'Áo', status: 'UNCLAIMED' }], totalElements: 21, totalPages: 2 } });
    }));
    await expect(endTermService.list({ page: 1 })).resolves.toMatchObject({
      items: [{ sku: 'sku-a', status: 'UNCLAIMED' }], totalElements: 21,
    });
  });

  it('reads end-of-term product details through the moderator product endpoint', async () => {
    server.use(http.get(`${API_BASE_URL}/products/sku-a`, () =>
      HttpResponse.json({ result: { id: 'sku-a', name: 'Áo', status: 'UNCLAIMED' } })));
    await expect(endTermService.read('sku-a')).resolves.toMatchObject({ sku: 'sku-a', status: 'UNCLAIMED' });
  });

  it('hands over end-of-term products using only the backend request fields', async () => {
    server.use(http.post(`${API_BASE_URL}/counter/handover`, async ({ request }) => {
      expect(await request.json()).toEqual({ accountId: 'member-a', refId: 'decision-a', context: 'END_OF_TERM_TAKE_BACK' });
      return new HttpResponse(null, { status: 204 });
    }));
    await expect(endTermService.handover('sku-a', {
      accountId: 'member-a', refId: 'decision-a', identityToken: 'frontend-proof',
    })).resolves.toBeNull();
  });

  it('hands over counter tasks using counterService.handover with exact payload', async () => {
    server.use(http.post(`${API_BASE_URL}/counter/handover`, async ({ request }) => {
      expect(await request.json()).toEqual({ accountId: 'member-a', refId: 'withdrawal-1', context: 'ITEM_WITHDRAWAL' });
      return new HttpResponse(null, { status: 204 });
    }));
    await expect(counterService.handover({
      accountId: 'member-a', refId: 'withdrawal-1', context: 'ITEM_WITHDRAWAL',
    })).resolves.toBeNull();
  });

  it.each([
    ['adding product photos', () => inventoryService.addPhotos('sku-a', ['https://example.com/photo.jpg'])],
    ['finding a product by receipt', () => inventoryService.byReceipt('receipt-a')],
    ['reconsigning at the counter', () => endTermService.reconsign('sku-a', {})],
  ])('reports %s as unsupported when no backend API exists', async (_, invoke) => {
    await expect(invoke()).rejects.toMatchObject({ code: 'OPERATION_UNSUPPORTED' });
  });
});
