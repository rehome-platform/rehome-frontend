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

  it('API 29: claims queue item successfully and maps response', async () => {
    server.use(
      http.post(`${API_BASE_URL}/queues/q-101/claim`, () => {
        return HttpResponse.json({
          data: {
            id: 'q-101',
            claimedBy: 'a0000000-0000-0000-0000-000000000001',
            claimedAt: '2026-10-26T16:00:00Z',
          },
          success: true,
          statusCode: 200,
        });
      }),
    );
    const res = await queueService.claim('q-101');
    expect(res).toMatchObject({
      id: 'q-101',
      claimedBy: 'a0000000-0000-0000-0000-000000000001',
    });
  });

  it('accepts 204 queue release without fabricating a response', async () => {
    server.use(http.post(`${API_BASE_URL}/queues/queue-a/release`, () => new HttpResponse(null, { status: 204 })));
    await expect(queueService.release('queue-a')).resolves.toBeNull();
  });

  it('API 30: throws 403 when releasing a queue item claimed by another moderator', async () => {
    server.use(
      http.post(`${API_BASE_URL}/queues/q-other/release`, () => {
        return HttpResponse.json(
          {
            code: 'QUEUE_ITEM_NOT_CLAIMED_BY_YOU',
            message: 'Bạn không phải người đang nhận việc này.',
          },
          { status: 403 },
        );
      }),
    );
    await expect(queueService.release('q-other')).rejects.toMatchObject({
      status: 403,
      code: 'QUEUE_ITEM_NOT_CLAIMED_BY_YOU',
    });
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
    const res = await endTermService.read('sku-a');
    expect(res).toMatchObject({
      sku: 'sku-a',
      status: 'UNCLAIMED',
    });
    expect(res.allowedActions).toContain('TRANSFER');
  });

  it('API 36: transfers unclaimed product to charity partner organization with exact payload and updates status to DONATED', async () => {
    server.use(
      http.post(`${API_BASE_URL}/products/sku-unclaimed-1/unclaimed/confirm-transfer`, async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual({ partnerOrganizationName: 'Quỹ Tình Thương TP.HCM' });
        return HttpResponse.json({
          result: { id: 'sku-unclaimed-1', status: 'DONATED' },
          statusCode: 200,
        });
      }),
    );

    const res = await endTermService.transfer('sku-unclaimed-1', '  Quỹ Tình Thương TP.HCM  ');
    expect(res).toMatchObject({ id: 'sku-unclaimed-1', status: 'DONATED' });
  });

  it('API 36: rejects transfer when charity partner name is empty or whitespace', async () => {
    await expect(endTermService.transfer('sku-unclaimed-1', '   ')).rejects.toMatchObject({
      status: 422,
    });
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

  it('API 31: approves consignment form with exact endpoint', async () => {
    server.use(
      http.post(`${API_BASE_URL}/consignment-forms/form-101/approve`, () => {
        return HttpResponse.json({
          result: { id: 'form-101', status: 'APPROVED', bringInDeadline: '2026-11-03' },
          statusCode: 200,
        });
      }),
    );
    const res = await consignmentService.approve('form-101');
    expect(res).toMatchObject({ id: 'form-101', status: 'APPROVED' });
  });

  it('API 32: rejects consignment form with reason payload', async () => {
    server.use(
      http.post(`${API_BASE_URL}/consignment-forms/form-102/reject`, async ({ request }) => {
        expect(await request.json()).toEqual({ reason: 'Ảnh mờ không rõ tem' });
        return HttpResponse.json({
          result: { id: 'form-102', status: 'REJECTED' },
          statusCode: 200,
        });
      }),
    );
    const res = await consignmentService.reject('form-102', 'Ảnh mờ không rõ tem');
    expect(res).toMatchObject({ id: 'form-102', status: 'REJECTED' });
  });

  it('API 33: starts inspection on consignment form', async () => {
    server.use(
      http.post(`${API_BASE_URL}/consignment-forms/form-103/inspection/start`, () => {
        return new HttpResponse(null, { status: 200 });
      }),
    );
    await expect(consignmentService.start('form-103')).resolves.toBeNull();
  });

  it('API 34: completes inspection and creates consignment receipt', async () => {
    server.use(
      http.post(`${API_BASE_URL}/consignment-forms/form-104/inspection/complete`, async ({ request }) => {
        expect(await request.json()).toEqual({
          result: 'PASS',
          conditionNote: 'Tình trạng tốt 95%',
          agreedPrice: 850000,
          termLengthDays: 30,
        });
        return HttpResponse.json({
          result: { receiptId: 'rcpt-uuid-104' },
          statusCode: 200,
        });
      }),
    );
    const res = await consignmentService.complete('form-104', {
      conditionNote: 'Tình trạng tốt 95%',
      agreedPrice: 850000,
      termLengthDays: 30,
    });
    expect(res).toMatchObject({ receiptId: 'rcpt-uuid-104' });
  });

  it('API 35: returns item onsite with structured payload and reason', async () => {
    server.use(
      http.post(`${API_BASE_URL}/consignment-forms/form-105/return-onsite`, async ({ request }) => {
        expect(await request.json()).toEqual({
          result: 'FAIL',
          reason: 'Hỏng khóa: Khóa kéo bị kẹt',
        });
        return HttpResponse.json({
          result: { id: 'form-105', status: 'REJECTED' },
          statusCode: 200,
        });
      }),
    );
    const res = await consignmentService.returnOnsite('form-105', {
      reason: 'Hỏng khóa',
      note: 'Khóa kéo bị kẹt',
    });
    expect(res).toMatchObject({ id: 'form-105', status: 'REJECTED' });
  });

  it('API 19: downloads receipt PDF as blob and produces object url', async () => {
    server.use(
      http.get(`${API_BASE_URL}/consignment-receipts/rcpt-101/pdf`, () => {
        return new HttpResponse(new Uint8Array([37, 80, 68, 70]), {
          headers: { 'Content-Type': 'application/pdf' },
        });
      }),
    );
    const res = await consignmentService.pdf('rcpt-101');
    expect(res).toHaveProperty('pdfUrl');
    expect(typeof res.pdfUrl).toBe('string');
  });

  // ==================== TASK 5: NHẬP KHO & TEM SKU ====================
  it('API 37: creates product successfully and returns generated SKU and status', async () => {
    server.use(
      http.post(`${API_BASE_URL}/products`, async ({ request }) => {
        const body = await request.json();
        expect(body).toEqual({
          receiptId: 'rcpt-uuid-201',
          name: 'Áo lụa cao cấp',
          size: 'M',
          shelfLocation: 'A1-02',
          photoUrls: ['https://example.test/photo1.jpg'],
        });
        return HttpResponse.json(
          {
            result: {
              id: 'Q7-AO-000001',
              name: 'Áo lụa cao cấp',
              status: 'ON_SALE',
            },
            statusCode: 201,
            message: 'Đã nhập kho',
          },
          { status: 201 },
        );
      }),
    );

    const res = await inventoryService.create({
      receiptId: 'rcpt-uuid-201',
      name: 'Áo lụa cao cấp',
      size: 'M',
      shelfLocation: 'A1-02',
      photoUrls: ['https://example.test/photo1.jpg'],
    });

    expect(res).toMatchObject({
      sku: 'Q7-AO-000001',
      id: 'Q7-AO-000001',
      name: 'Áo lụa cao cấp',
      status: 'ON_SALE',
    });
  });

  it('API 37: throws 409 RECEIPT_NOT_CONFIRMED when member has not confirmed receipt', async () => {
    server.use(
      http.post(`${API_BASE_URL}/products`, () => {
        return HttpResponse.json(
          { code: 'RECEIPT_NOT_CONFIRMED', message: 'Phiếu ký gửi chưa được Member xác nhận.' },
          { status: 409 },
        );
      }),
    );

    await expect(
      inventoryService.create({
        receiptId: 'rcpt-uuid-unconfirmed',
        name: 'Váy dạ hội',
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'RECEIPT_NOT_CONFIRMED',
    });
  });

  it('API 37: throws 409 RECEIPT_ALREADY_HAS_PRODUCT when receipt is already stocked', async () => {
    server.use(
      http.post(`${API_BASE_URL}/products`, () => {
        return HttpResponse.json(
          { code: 'RECEIPT_ALREADY_HAS_PRODUCT', message: 'Phiếu ký gửi này đã được nhập kho.' },
          { status: 409 },
        );
      }),
    );

    await expect(
      inventoryService.create({
        receiptId: 'rcpt-uuid-already-has-prod',
        name: 'Áo len',
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'RECEIPT_ALREADY_HAS_PRODUCT',
    });
  });

  it('API 37: throws 404 RECEIPT_NOT_FOUND when receipt does not exist', async () => {
    server.use(
      http.post(`${API_BASE_URL}/products`, () => {
        return HttpResponse.json(
          { code: 'RECEIPT_NOT_FOUND', message: 'Không tìm thấy phiếu ký gửi.' },
          { status: 404 },
        );
      }),
    );

    await expect(
      inventoryService.create({
        receiptId: 'rcpt-uuid-nonexistent',
        name: 'Quần jeans',
      }),
    ).rejects.toMatchObject({
      status: 404,
      code: 'RECEIPT_NOT_FOUND',
    });
  });

  it('Upload API: uploads photo to /uploads?folder=PRODUCTS and returns public url', async () => {
    server.use(
      http.post(`${API_BASE_URL}/uploads`, async ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get('folder')).toBe('PRODUCTS');
        const formData = await request.formData();
        const file = formData.get('file');
        expect(file).toBeTruthy();
        return HttpResponse.json({
          result: {
            url: 'https://cdn.rehome.test/products/item-001.jpg',
            originalFileName: 'item-001.jpg',
            contentType: 'image/jpeg',
            sizeBytes: 1024,
          },
          statusCode: 200,
        });
      }),
    );

    const dummyFile = new File(['dummy-bytes'], 'item-001.jpg', { type: 'image/jpeg' });
    const res = await inventoryService.upload(dummyFile);
    expect(res).toMatchObject({
      url: 'https://cdn.rehome.test/products/item-001.jpg',
    });
  });

  it('Upload API: throws 413 FILE_TOO_LARGE when file exceeds size limit', async () => {
    server.use(
      http.post(`${API_BASE_URL}/uploads`, () => {
        return HttpResponse.json(
          { code: 'FILE_TOO_LARGE', message: 'File vượt quá kích thước cho phép.' },
          { status: 413 },
        );
      }),
    );

    const largeFile = new File(['x'.repeat(100)], 'huge.jpg', { type: 'image/jpeg' });
    await expect(inventoryService.upload(largeFile)).rejects.toMatchObject({
      status: 413,
      code: 'FILE_TOO_LARGE',
    });
  });

  it('API 39: downloads SKU barcode label PDF and produces object url', async () => {
    server.use(
      http.get(`${API_BASE_URL}/products/Q7-AO-000001/sku-label`, () => {
        return new HttpResponse(new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52]), {
          headers: { 'Content-Type': 'application/pdf' },
        });
      }),
    );

    const res = await inventoryService.label('Q7-AO-000001');
    expect(res).toHaveProperty('labelPdfUrl');
    expect(typeof res.labelPdfUrl).toBe('string');
    expect(res).toHaveProperty('blob');
    expect(res.blob.type).toBe('application/pdf');
  });

  it('API 39: throws 403 PRODUCT_NOT_IN_YOUR_WAREHOUSE when product belongs to another warehouse', async () => {
    server.use(
      http.get(`${API_BASE_URL}/products/Q1-AO-000999/sku-label`, () => {
        return HttpResponse.json(
          { code: 'PRODUCT_NOT_IN_YOUR_WAREHOUSE', message: 'Sản phẩm không thuộc kho bạn quản lý.' },
          { status: 403 },
        );
      }),
    );

    await expect(inventoryService.label('Q1-AO-000999')).rejects.toMatchObject({
      status: 403,
      code: 'PRODUCT_NOT_IN_YOUR_WAREHOUSE',
    });
  });

  describe('Task 6: Inventory management, SKU lookup and stock movements integration', () => {
    it('API 40: loads paginated inventory with status and shelfLocation params', async () => {
      server.use(
        http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.INVENTORY}`, ({ request }) => {
          const url = new URL(request.url);
          expect(url.searchParams.get('status')).toBe('ON_SALE');
          expect(url.searchParams.get('shelfLocation')).toBe('A1-02');
          expect(url.searchParams.get('page')).toBe('0');
          expect(url.searchParams.get('size')).toBe('20');

          return HttpResponse.json({
            content: [
              {
                id: 'Q7-AK-000845',
                name: 'Áo khoác dạ',
                shelfLocation: 'A1-02',
                status: 'ON_SALE',
              },
            ],
            totalElements: 1,
            totalPages: 1,
          });
        }),
      );

      const res = await inventoryService.list({
        status: 'ON_SALE',
        shelfLocation: 'A1-02',
        page: 0,
        size: 20,
      });

      expect(res.items).toHaveLength(1);
      expect(res.items[0].sku).toBe('Q7-AK-000845');
      expect(res.items[0].shelfLocation).toBe('A1-02');
      expect(res.items[0].status).toBe('ON_SALE');
    });

    it('API 41: reads product details by SKU with normalized allowedActions', async () => {
      server.use(
        http.get(`${API_BASE_URL}/products/Q7-AK-000845`, () => {
          return HttpResponse.json({
            id: 'Q7-AK-000845',
            name: 'Áo khoác dạ Zara',
            shelfLocation: 'A1-02',
            status: 'ON_SALE',
          });
        }),
      );

      const res = await inventoryService.read('Q7-AK-000845');
      expect(res.sku).toBe('Q7-AK-000845');
      expect(res.name).toBe('Áo khoác dạ Zara');
      expect(res.shelfLocation).toBe('A1-02');
      expect(res.status).toBe('ON_SALE');
      expect(res.allowedActions).toContain('CHANGE_SHELF');
    });

    it('API 41: throws 404 PRODUCT_NOT_FOUND when SKU does not exist', async () => {
      server.use(
        http.get(`${API_BASE_URL}/products/SKU-NOT-FOUND`, () => {
          return HttpResponse.json(
            { code: 'PRODUCT_NOT_FOUND', message: 'Không tìm thấy sản phẩm.' },
            { status: 404 },
          );
        }),
      );

      await expect(inventoryService.read('SKU-NOT-FOUND')).rejects.toMatchObject({
        status: 404,
        code: 'PRODUCT_NOT_FOUND',
      });
    });

    it('API 42: updates shelf location and returns new location', async () => {
      server.use(
        http.patch(`${API_BASE_URL}/products/Q7-AK-000845/shelf-location`, async ({ request }) => {
          const body = await request.json();
          expect(body.shelfLocation).toBe('B2-10');
          return HttpResponse.json({
            id: 'Q7-AK-000845',
            shelfLocation: 'B2-10',
          });
        }),
      );

      const res = await inventoryService.shelf('Q7-AK-000845', '  B2-10  ');
      expect(res.shelfLocation).toBe('B2-10');
    });

    it('API 42: rejects empty shelf location on client without calling backend', async () => {
      await expect(inventoryService.shelf('Q7-AK-000845', '   ')).rejects.toMatchObject({
        status: 400,
        message: 'Vui lòng nhập vị trí kệ mới.',
      });
    });

    it('API 43: loads stock movements and maps them through formatStockMovement', async () => {
      server.use(
        http.get(`${API_BASE_URL}/products/Q7-AK-000845/stock-movements`, () => {
          return HttpResponse.json([
            {
              id: 'log-move-1',
              type: 'SHELF_MOVE',
              fromLocation: 'A1-02',
              toLocation: 'B2-10',
              note: 'Điều chuyển khu áo ấm',
              createdAt: '2026-10-27T09:30:00Z',
            },
            {
              id: 'log-stock-2',
              type: 'STOCK_IN',
              fromLocation: null,
              toLocation: 'A1-02',
              note: 'Nhập kho',
              createdAt: '2026-10-26T15:00:00Z',
            },
          ]);
        }),
      );

      const res = await inventoryService.movements('Q7-AK-000845');
      expect(res).toHaveLength(2);

      expect(res[0].type).toBe('SHELF_MOVE');
      expect(res[0].label).toBe('Điều chuyển kệ');
      expect(res[0].locationText).toBe('A1-02 → B2-10');
      expect(res[0].note).toBe('Điều chuyển khu áo ấm');

      expect(res[1].type).toBe('STOCK_IN');
      expect(res[1].label).toBe('Nhập kho ban đầu');
      expect(res[1].locationText).toBe('Kệ A1-02');
    });
  });

  describe('Task 7: Categories & Brands management integration (API 44, 45, 46, 47, 48)', () => {
    it('API 44: lists categories and brands by querying both ACTIVE and HIDDEN statuses', async () => {
      server.use(
        http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.CATEGORIES}`, ({ request }) => {
          const url = new URL(request.url);
          const status = url.searchParams.get('status');
          if (status === 'HIDDEN') {
            return HttpResponse.json([
              { id: 'cat-old', name: 'Áo cổ trang', tryonSlot: 'TOP', status: 'HIDDEN' },
            ]);
          }
          return HttpResponse.json([
            { id: 'cat-1', name: 'Áo sơ mi', tryonSlot: 'TOP', status: 'ACTIVE' },
            { id: 'cat-2', name: 'Quần jeans', tryonSlot: 'BOTTOM', status: 'ACTIVE' },
          ]);
        }),
        http.get(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.BRANDS}`, ({ request }) => {
          const url = new URL(request.url);
          const status = url.searchParams.get('status');
          if (status === 'HIDDEN') {
            return HttpResponse.json([
              { id: 'brand-old', name: 'Old Brand', status: 'HIDDEN' },
            ]);
          }
          return HttpResponse.json([
            { id: 'brand-1', name: 'Uniqlo', status: 'ACTIVE' },
            { id: 'brand-2', name: 'Zara', status: 'ACTIVE' },
          ]);
        }),
      );

      const res = await catalogService.list();
      expect(res.categories).toHaveLength(3);
      expect(res.brands).toHaveLength(3);

      const hiddenCat = res.categories.find((c) => c.id === 'cat-old');
      expect(hiddenCat).toBeDefined();
      expect(hiddenCat.hidden).toBe(true);
      expect(hiddenCat.status).toBe('HIDDEN');
      expect(hiddenCat.slot).toBe('TOP');

      const activeCat = res.categories.find((c) => c.id === 'cat-1');
      expect(activeCat.hidden).toBe(false);
      expect(activeCat.status).toBe('ACTIVE');

      const hiddenBrand = res.brands.find((b) => b.id === 'brand-old');
      expect(hiddenBrand.hidden).toBe(true);
      expect(hiddenBrand.status).toBe('HIDDEN');
    });

    it('API 45: creates new category with name and tryonSlot', async () => {
      server.use(
        http.post(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.CATEGORIES}`, async ({ request }) => {
          const body = await request.json();
          expect(body.name).toBe('Áo khoác dạ');
          expect(body.tryonSlot).toBe('TOP');
          return HttpResponse.json(
            {
              id: 'cat-new-uuid',
              name: 'Áo khoác dạ',
              tryonSlot: 'TOP',
              status: 'ACTIVE',
            },
            { status: 201 },
          );
        }),
      );

      const res = await catalogService.save('category', null, {
        name: '  Áo  khoác   dạ  ',
        tryonSlot: 'TOP',
      });
      expect(res.id).toBe('cat-new-uuid');
      expect(res.name).toBe('Áo khoác dạ');
      expect(res.tryonSlot).toBe('TOP');
    });

    it('API 45: throws 409 CATEGORY_NAME_ALREADY_EXISTS when category name is duplicate', async () => {
      server.use(
        http.post(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.CATEGORIES}`, () => {
          return HttpResponse.json(
            { code: 'CATEGORY_NAME_ALREADY_EXISTS', message: 'Tên danh mục đã tồn tại.' },
            { status: 409 },
          );
        }),
      );

      await expect(
        catalogService.save('category', null, { name: 'Áo sơ mi', tryonSlot: 'TOP' }),
      ).rejects.toMatchObject({
        status: 409,
        code: 'CATEGORY_NAME_ALREADY_EXISTS',
      });
    });

    it('API 46: creates new brand with name', async () => {
      server.use(
        http.post(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.BRANDS}`, async ({ request }) => {
          const body = await request.json();
          expect(body.name).toBe('H&M');
          return HttpResponse.json(
            { id: 'brand-hm-uuid', name: 'H&M', status: 'ACTIVE' },
            { status: 201 },
          );
        }),
      );

      const res = await catalogService.save('brand', null, { name: '  H&M  ' });
      expect(res.id).toBe('brand-hm-uuid');
      expect(res.name).toBe('H&M');
    });

    it('API 46: throws 409 BRAND_NAME_ALREADY_EXISTS when brand name is duplicate', async () => {
      server.use(
        http.post(`${API_BASE_URL}${API_ENDPOINTS.MODERATOR.BRANDS}`, () => {
          return HttpResponse.json(
            { code: 'BRAND_NAME_ALREADY_EXISTS', message: 'Tên thương hiệu đã tồn tại.' },
            { status: 409 },
          );
        }),
      );

      await expect(catalogService.save('brand', null, { name: 'Zara' })).rejects.toMatchObject({
        status: 409,
        code: 'BRAND_NAME_ALREADY_EXISTS',
      });
    });

    it('API 47: updates category and unhides by sending status ACTIVE', async () => {
      server.use(
        http.put(`${API_BASE_URL}/categories/cat-1`, async ({ request }) => {
          const body = await request.json();
          expect(body.name).toBe('Áo sơ mi lụa');
          expect(body.tryonSlot).toBe('TOP');
          expect(body.status).toBe('ACTIVE');
          return HttpResponse.json({
            id: 'cat-1',
            name: 'Áo sơ mi lụa',
            tryonSlot: 'TOP',
            status: 'ACTIVE',
          });
        }),
      );

      const res = await catalogService.save('category', 'cat-1', {
        name: 'Áo sơ mi lụa',
        slot: 'TOP',
        hidden: false,
      });
      expect(res.name).toBe('Áo sơ mi lụa');
      expect(res.status).toBe('ACTIVE');
    });

    it('API 47: updates brand name', async () => {
      server.use(
        http.put(`${API_BASE_URL}/brands/brand-1`, async ({ request }) => {
          const body = await request.json();
          expect(body.name).toBe('Zara Vietnam');
          return HttpResponse.json({
            id: 'brand-1',
            name: 'Zara Vietnam',
            status: 'ACTIVE',
          });
        }),
      );

      const res = await catalogService.save('brand', 'brand-1', {
        name: 'Zara Vietnam',
      });
      expect(res.name).toBe('Zara Vietnam');
    });

    it('API 48: hides category by calling PATCH /categories/{id}/hide', async () => {
      server.use(
        http.patch(`${API_BASE_URL}/categories/cat-1/hide`, () => {
          return HttpResponse.json({ status: 'HIDDEN' });
        }),
      );

      const res = await catalogService.hide('category', 'cat-1');
      expect(res.status).toBe('HIDDEN');
    });

    it('API 48: hides brand by calling PATCH /brands/{id}/hide', async () => {
      server.use(
        http.patch(`${API_BASE_URL}/brands/brand-1/hide`, () => {
          return HttpResponse.json({ status: 'HIDDEN' });
        }),
      );

      const res = await catalogService.hide('brand', 'brand-1');
      expect(res.status).toBe('HIDDEN');
    });
  });
});


