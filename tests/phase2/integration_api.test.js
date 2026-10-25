import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  queueService,
  counterService,
  consignmentService,
  inventoryService,
  catalogService,
} from '../../src/features/moderator/services/warehouseApi.js';
import { API_BASE_URL, API_ENDPOINTS } from '../../src/configs/api.config.js';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => server.resetHandlers());
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

  // 7. Missing Backend Endpoint (404): API 25 lookup falls back to mock with isMock: true
  it('API 25: falls back to fixture with isMock: true when backend endpoint is not implemented (404)', async () => {
    server.use(
      http.post(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.COUNTER_LOOKUP}`, () => {
        return new HttpResponse(null, { status: 404 });
      }),
    );

    const members = await counterService.lookup(
      { phone: '0900000001' },
      { scope: { userId: 'mod-1', warehouseId: 'warehouse-a' } },
    );
    expect(members).toBeDefined();
    expect(members.length).toBeGreaterThan(0);
    expect(members[0].isMock).toBe(true);
  });

  // 8. 401 Unauthorized: Session expiration
  it('API 41: throws normalized 401 on expired session', async () => {
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
