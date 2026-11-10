import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE_URL as base } from '../../src/configs/api.config.js';
import { inventoryService } from '../../src/features/moderator/services/inventoryApi.js';
import { consignmentService } from '../../src/features/moderator/services/consignmentApi.js';

const server = setupServer();
const json = result => HttpResponse.json({ result });
const page = content => ({ content, totalElements: 41, totalPages: 3, page: 1 });
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('inventory visible-row detail enrichment', () => {
  it('fills sparse rows from current product detail without changing list identity, status or pagination', async () => {
    server.use(
      http.get(`${base}/inventory`, () => json(page([{ id: 'sku-1', name: 'List name', status: 'RESERVED' }]))),
      http.get(`${base}/products/sku-1`, () => json({ id: 'other', name: 'Detail name', status: 'SOLD', currentTerm: 2, daysIntoTerm: 8, currentPrice: 125000 })),
    );
    const result = await inventoryService.list({ page: 1, status: 'RESERVED' }, { enrichDetails: true });
    expect(result).toMatchObject({ totalElements: 41, totalPages: 3, page: 1, items: [
      { id: 'sku-1', sku: 'sku-1', name: 'List name', status: 'RESERVED', currentTerm: 2, daysIntoTerm: 8, currentPrice: 125000 },
    ] });
    expect(result.content).toEqual(result.items);
  });

  it('preserves a row with unavailable detail while enriching the other rows', async () => {
    server.use(
      http.get(`${base}/inventory`, () => json(page([{ id: 'bad', name: 'Unavailable', status: 'ON_SALE' }, { id: 'good', name: 'Available', status: 'ON_SALE' }]))),
      http.get(`${base}/products/bad`, () => new HttpResponse(null, { status: 500 })),
      http.get(`${base}/products/good`, () => json({ currentTerm: 1, daysIntoTerm: 3, currentPrice: 90000 })),
    );
    const result = await inventoryService.list({}, { enrichDetails: true });
    expect(result.items[0]).toMatchObject({ id: 'bad', name: 'Unavailable', status: 'ON_SALE' });
    expect(result.items[0].currentPrice).toBeUndefined();
    expect(result.items[1]).toMatchObject({ currentTerm: 1, daysIntoTerm: 3, currentPrice: 90000 });
  });

  it('does not fetch details for sparse dashboard counts', async () => {
    let detailRequests = 0;
    server.use(
      http.get(`${base}/inventory`, () => json(page([{ id: 'sku-1', name: 'Sparse', status: 'ON_SALE' }]))),
      http.get(`${base}/products/:sku`, () => { detailRequests++; return json({ currentPrice: 999 }); }),
    );
    const result = await inventoryService.list({});
    expect(result.totalElements).toBe(41);
    expect(result.items[0].currentPrice).toBeUndefined();
    expect(detailRequests).toBe(0);
  });

  it('skips already complete rows, including zero price', async () => {
    let detailRequests = 0;
    server.use(
      http.get(`${base}/inventory`, () => json(page([{ id: 'sku-1', name: 'Complete', status: 'ON_SALE', currentTerm: 1, daysIntoTerm: 1, currentPrice: 0 }]))),
      http.get(`${base}/products/:sku`, () => { detailRequests++; return json({ currentPrice: 999 }); }),
    );
    const visible = await inventoryService.list({}, { enrichDetails: true });
    expect(detailRequests).toBe(0);
    expect(visible.items[0].currentPrice).toBe(0);
  });

  it('fetches fresh prices on each list load and retains fields already present on the list row', async () => {
    let currentPrice = 100000;
    server.use(
      http.get(`${base}/inventory`, () => json(page([{ id: 'sku-1', name: 'Item', status: 'ON_SALE', currentTerm: 1 }]))),
      http.get(`${base}/products/sku-1`, () => json({ currentTerm: 3, daysIntoTerm: 2, currentPrice })),
    );
    const first = await inventoryService.list({}, { enrichDetails: true });
    currentPrice = 80000;
    const next = await inventoryService.list({}, { enrichDetails: true });
    expect(first.items[0]).toMatchObject({ currentTerm: 1, currentPrice: 100000 });
    expect(next.items[0]).toMatchObject({ currentTerm: 1, currentPrice: 80000 });
  });

  it('propagates cancellation during product enrichment', async () => {
    const controller = new AbortController();
    server.use(
      http.get(`${base}/inventory`, () => json(page([{ id: 'sku-1', name: 'Item', status: 'ON_SALE' }]))),
      http.get(`${base}/products/sku-1`, () => { controller.abort(); return json({ currentPrice: 12 }); }),
    );
    await expect(inventoryService.list({}, { enrichDetails: true, signal: controller.signal })).rejects.toMatchObject({ code: 'ERR_CANCELED' });
  });

  it('limits product detail requests to four at a time and preserves list ordering', async () => {
    let active = 0;
    let maximum = 0;
    const rows = Array.from({ length: 9 }, (_, index) => ({ id: `sku-${index}`, name: `Item ${index}`, status: 'ON_SALE' }));
    server.use(
      http.get(`${base}/inventory`, () => json(page(rows))),
      http.get(`${base}/products/:sku`, async ({ params }) => {
        active++; maximum = Math.max(maximum, active);
        await new Promise(resolve => setTimeout(resolve, 10));
        active--;
        return json({ currentTerm: 1, daysIntoTerm: 2, currentPrice: Number(params.sku.slice(4)) + 100 });
      }),
    );
    const result = await inventoryService.list({}, { enrichDetails: true });
    expect(result.items.map(item => item.currentPrice)).toEqual([100, 101, 102, 103, 104, 105, 106, 107, 108]);
    expect(maximum).toBeLessThanOrEqual(4);
    expect(maximum).toBeGreaterThan(1);
  });
});

describe('consignment list brand enrichment', () => {
  it('fills missing brand from detail and keeps list status, name and pagination authoritative', async () => {
    server.use(
      http.get(`${base}/moderator/consignment-forms`, () => json(page([{ id: 'form-1', productName: 'List item', status: 'PENDING' }]))),
      http.get(`${base}/moderator/consignment-forms/form-1`, () => json({ id: 'stale-id', productName: 'Detail item', status: 'REJECTED', brandName: 'Zara' })),
    );
    const result = await consignmentService.listForms({ page: 1 }, {});
    expect(result).toMatchObject({ totalElements: 41, totalPages: 3, page: 1, items: [
      { id: 'form-1', formId: 'form-1', name: 'List item', status: 'PENDING', brand: 'Zara', brandName: 'Zara' },
    ] });
    expect(result.content).toEqual(result.items);
  });

  it('keeps unavailable brands empty and still enriches successful rows', async () => {
    server.use(
      http.get(`${base}/moderator/consignment-forms`, () => json([{ id: 'bad', status: 'PENDING' }, { id: 'good', status: 'PENDING' }])),
      http.get(`${base}/moderator/consignment-forms/bad`, () => new HttpResponse(null, { status: 500 })),
      http.get(`${base}/moderator/consignment-forms/good`, () => json({ brandName: 'Adidas' })),
    );
    const result = await consignmentService.listForms({}, {});
    expect(result[0]).toMatchObject({ id: 'bad', status: 'PENDING', brand: '', brandName: '' });
    expect(result[1]).toMatchObject({ id: 'good', brand: 'Adidas', brandName: 'Adidas' });
  });

  it('skips complete brands and details for rows excluded by the requested status', async () => {
    let detailRequests = 0;
    server.use(
      http.get(`${base}/moderator/consignment-forms`, () => json(page([{ id: 'complete', status: 'REJECTED', brandName: 'Uniqlo' }, { id: 'excluded', status: 'PENDING' }]))),
      http.get(`${base}/moderator/consignment-forms/:id`, () => { detailRequests++; return json({ brandName: 'Wrong' }); }),
    );
    const result = await consignmentService.listForms({ status: 'REJECTED' }, {});
    expect(result.items).toHaveLength(1);
    expect(result.items[0].brand).toBe('Uniqlo');
    expect(detailRequests).toBe(0);
  });

  it('propagates cancellation during brand enrichment', async () => {
    const controller = new AbortController();
    server.use(
      http.get(`${base}/moderator/consignment-forms`, () => json([{ id: 'form-1', status: 'PENDING' }])),
      http.get(`${base}/moderator/consignment-forms/form-1`, () => { controller.abort(); return json({ brandName: 'Zara' }); }),
    );
    await expect(consignmentService.listForms({}, { signal: controller.signal })).rejects.toMatchObject({ code: 'ERR_CANCELED' });
  });
});
