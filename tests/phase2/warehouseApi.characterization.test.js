import { beforeEach, describe, expect, it, vi } from 'vitest';
import baseApi from '../../src/services/baseApi.js';
import * as api from '../../src/features/moderator/services/warehouseApi.js';
import { fixtureRequest } from '../../src/features/moderator/fixtures/warehouseFixtures.js';
import { phase2Contract } from '../../src/features/moderator/config/warehouseContract.js';

const mode = vi.hoisted(() => ({ fixture: false }));
vi.mock('../../src/services/baseApi.js', () => ({ default: { request: vi.fn(), get: vi.fn() } }));
vi.mock('../../src/features/moderator/fixtures/warehouseFixtures.js', () => ({ fixtureRequest: vi.fn() }));
vi.mock('../../src/features/moderator/config/warehouseContract.js', async (original) => ({
  ...await original(), get isFixtureMode() { return mode.fixture; },
}));

const { queueService: queue, counterService: counter, consignmentService: form,
  inventoryService: inventory, catalogService: catalog, endTermService: endTerm } = api;
const options = { signal: new AbortController().signal, scope: { userId: 'mod', warehouseId: 'wh' } };
const failure = (status) => ({ response: { status, data: { message: 'server', code: 'FAILED' } } });
// Literal URLs/payloads characterize the existing contract independently of endpoint helpers.
const writes = [
  ['claim', () => queue.claim('q', options), '/queues/q/claim', 'post', undefined, 'queueClaim'],
  ['release', () => queue.release('q', options), '/queues/q/release', 'post', undefined, 'queueRelease'],
  ['approve', () => form.approve('f', options), '/consignment-forms/f/approve', 'post', undefined, 'formApprove'],
  ['reject', () => form.reject('f', 'reason', options), '/consignment-forms/f/reject', 'post', { reason: 'reason' }, 'formReject'],
  ['start', () => form.start('f', { identityToken: 'proof' }, options), '/consignment-forms/f/inspection/start', 'post', undefined, 'inspectionStart'],
  ['complete', () => form.complete('f', { price: '12', condition: 'ok', termLengthDays: '30' }, options), '/consignment-forms/f/inspection/complete', 'post', { result: 'PASS', conditionNote: 'ok', agreedPrice: 12, termLengthDays: 30 }, 'inspectionComplete'],
  ['return', () => form.returnOnsite('f', { reason: 'reason' }, options), '/consignment-forms/f/return-onsite', 'post', { reason: 'reason' }, 'returnOnsite'],
  ['create', () => inventory.create({ receiptId: 'r', name: 'shirt' }, options), '/products', 'post', { receiptId: 'r', name: 'shirt', size: null, shelfLocation: null, photoUrls: [] }, 'productCreate'],
  ['shelf', () => inventory.shelf('sku', 'A1', options), '/products/sku/shelf-location', 'patch', { shelfLocation: 'A1' }, 'shelfUpdate'],
  ['category create', () => catalog.save('category', null, { name: 'shirt', slot: 'TOP' }, options), '/categories', 'post', { name: 'shirt', tryonSlot: 'TOP' }, 'categoryCreate'],
  ['brand update', () => catalog.save('brand', 'b', { name: 'brand', status: 'HIDDEN' }, options), '/brands/b', 'put', { name: 'brand', status: 'HIDDEN' }, 'brandUpdate'],
  ['category hide', () => catalog.hide('category', 'c', options), '/categories/c/hide', 'patch', undefined, 'categoryHide'],
  ['brand hide', () => catalog.hide('brand', 'b', options), '/brands/b/hide', 'patch', undefined, 'brandHide'],
  ['transfer', () => endTerm.transfer('sku', 'partner', options), '/products/sku/unclaimed/confirm-transfer', 'post', { partnerOrganizationName: 'partner', partnerName: 'partner' }, 'unclaimedTransfer'],
];

beforeEach(() => {
  mode.fixture = false;
  vi.clearAllMocks();
  baseApi.request.mockResolvedValue({ status: 200, data: { data: { saved: true } } });
  fixtureRequest.mockResolvedValue({ fixture: true });
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});

describe('warehouse public compatibility', () => {
  it('retains the public export and method surface', () => {
    expect(Object.keys(api).sort()).toEqual(['catalogService', 'consignmentService', 'counterService', 'endTermService', 'inventoryService', 'queueService', 'request']);
    expect(Object.keys(queue)).toEqual(['list', 'claim', 'release', 'approve', 'reject']);
    expect(Object.keys(counter)).toEqual(['lookup', 'confirm', 'tasks']);
    expect(Object.keys(form)).toEqual(['approve', 'reject', 'read', 'start', 'complete', 'returnOnsite', 'receipt']);
    expect(Object.keys(inventory)).toEqual(['list', 'read', 'byReceipt', 'create', 'upload', 'addPhotos', 'shelf', 'movements', 'label']);
    expect(Object.keys(catalog)).toEqual(['list', 'save', 'hide']);
    expect(Object.keys(endTerm)).toEqual(['list', 'read', 'handover', 'reconsign', 'transfer']);
  });

  it.each(writes)('%s sends the existing request and unwraps success', async (_, invoke, url, method, data) => {
    await expect(invoke()).resolves.toEqual({ saved: true });
    expect(baseApi.request).toHaveBeenCalledExactlyOnceWith({ url, method, ...(data === undefined ? {} : { data }), signal: options.signal, noReplay: true });
    expect(fixtureRequest).not.toHaveBeenCalled();
  });

  it.each(writes)('%s selects its fixture only in fixture mode', async (_, invoke, _url, _method, _data, operation) => {
    mode.fixture = true;
    await expect(invoke()).resolves.toEqual({ fixture: true });
    expect(baseApi.request).not.toHaveBeenCalled();
    expect(fixtureRequest).toHaveBeenCalledWith(operation, expect.objectContaining(options));
  });

  for (const status of [401, 403, 404, 409, 500, 0]) {
    it.each(writes)(`%s propagates ${status} without retry or fixture success`, async (_, invoke) => {
      baseApi.request.mockRejectedValue(status ? failure(status) : new Error('network'));
      await expect(invoke()).rejects.toMatchObject({ name: 'Phase2Error', status });
      expect(baseApi.request).toHaveBeenCalledOnce();
      expect(fixtureRequest).not.toHaveBeenCalled();
    });
  }

  it('keeps fixture option precedence and original inspection data', async () => {
    mode.fixture = true;
    const data = { price: '12', identityToken: 'proof' };
    await form.complete('f', data, { ...options, ids: { formId: 'override' } });
    expect(fixtureRequest).toHaveBeenCalledWith('inspectionComplete', { ...options, ids: { formId: 'override' }, data });
  });

  it('keeps fixture-only end-term operations and API byReceipt null', async () => {
    await expect(inventory.byReceipt('r', options)).resolves.toBeNull();
    await endTerm.list({ page: 2 }, options);
    await endTerm.read('sku', options);
    await endTerm.handover('sku', { identityToken: 'proof' }, options);
    await endTerm.reconsign('sku', { price: 12 }, options);
    expect(fixtureRequest.mock.calls).toEqual([
      ['endTermList', { ...options, params: { page: 2 } }],
      ['endTermRead', { ...options, ids: { sku: 'sku' } }],
      ['endTermHandover', { ...options, ids: { sku: 'sku' }, data: { identityToken: 'proof', context: 'END_OF_TERM_TAKE_BACK' } }],
      ['endTermReconsign', { ...options, ids: { sku: 'sku' }, data: { price: 12 } }],
    ]);
    expect(baseApi.request).not.toHaveBeenCalled();
  });

  it('keeps identity confirmation metadata and its fixture path', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(123);
    await expect(counter.confirm('m', options)).resolves.toMatchObject({ memberId: 'm', identityToken: 'proof-m-123', confirmedAt: expect.any(String) });
    expect(baseApi.request).toHaveBeenLastCalledWith({ method: 'post', url: '/counter/members/m/confirm-identity', signal: options.signal, noReplay: true });
    baseApi.request.mockRejectedValue(failure(404));
    await expect(counter.confirm('m', options)).rejects.toMatchObject({ status: 404 });
    mode.fixture = true;
    await expect(counter.confirm('m', options)).resolves.toEqual({ fixture: true });
    expect(fixtureRequest).toHaveBeenCalledWith('identityConfirm', { data: { memberId: 'm' }, ...options });
  });

  it('keeps label blob transport separate from JSON requests', async () => {
    const createUrl = vi.fn(() => 'blob:label');
    vi.stubGlobal('URL', class extends URL { static createObjectURL = createUrl; });
    try {
      baseApi.get.mockResolvedValue({ data: 'pdf' });
      await expect(inventory.label('sku', options)).resolves.toEqual({ labelPdfUrl: 'blob:label' });
      expect(baseApi.get).toHaveBeenCalledWith('/products/sku/sku-label', { responseType: 'blob', signal: options.signal });
      expect(createUrl.mock.calls[0][0].type).toBe('application/pdf');
      mode.fixture = true;
      await inventory.label('sku', options);
      expect(fixtureRequest).toHaveBeenCalledWith('skuLabel', { ids: { sku: 'sku' }, ...options });
    } finally { vi.unstubAllGlobals(); }
  });
});

describe('operation-specific read and fallback policies', () => {
  it('omits falsey inventory filters and preserves nullish pagination defaults', async () => {
    baseApi.request.mockResolvedValue({ data: [] });
    await inventory.list({ status: '', shelf: '', page: null, size: null }, options);
    expect(baseApi.request).toHaveBeenLastCalledWith({ method: 'get', url: '/inventory', params: { page: 0, size: 20 }, signal: options.signal, noReplay: false });
    await inventory.list({ status: 'ON_SALE', shelf: 'A1', page: 2, size: 5 }, options);
    expect(baseApi.request).toHaveBeenLastCalledWith({ method: 'get', url: '/inventory', params: { status: 'ON_SALE', shelfLocation: 'A1', page: 2, size: 5 }, signal: options.signal, noReplay: false });
  });

  it('retains the second fixture attempt after a fixture read fails', async () => {
    mode.fixture = true;
    fixtureRequest.mockRejectedValueOnce(new Error('first fixture failed')).mockResolvedValueOnce({ sku: 'recovered' });
    await expect(inventory.read('sku', options)).resolves.toEqual({ sku: 'recovered' });
    expect(fixtureRequest).toHaveBeenCalledTimes(2);
    expect(baseApi.request).not.toHaveBeenCalled();
  });

  it('keeps fixture option overrides for queue and inventory reads', async () => {
    mode.fixture = true;
    const override = { ...options, params: { type: 'OVERRIDE' } };
    await queue.list({ type: 'ALL' }, override);
    expect(fixtureRequest).toHaveBeenCalledWith('queueList', { ...override });
    await inventory.read('sku', { ...options, ids: { sku: 'override' } });
    expect(fixtureRequest).toHaveBeenCalledWith('productRead', { ...options, ids: { sku: 'override' } });
  });

  it.each([401, 403, 404, 409, 500, 0])('keeps broad form/receipt fallback on %s', async (status) => {
    baseApi.request.mockRejectedValue(status ? failure(status) : new Error('network'));
    await expect(form.read('f', options)).resolves.toEqual({ fixture: true });
    await expect(form.receipt('r', options)).resolves.toEqual({ fixture: true });
  });

  it.each([404, 0])('inventory list falls back on %s and normalizes the fixture', async (status) => {
    baseApi.request.mockRejectedValue(status ? failure(status) : new Error('network'));
    fixtureRequest.mockResolvedValue({ items: [{ sku: 'sku' }] });
    await expect(inventory.list({}, options)).resolves.toMatchObject({ items: [{ id: 'sku', sku: 'sku', status: 'ON_SALE' }] });
  });

  it.each([401, 403, 409, 500])('inventory list propagates online %s', async (status) => {
    baseApi.request.mockRejectedValue(failure(status));
    await expect(inventory.list({}, options)).rejects.toMatchObject({ status });
    expect(fixtureRequest).not.toHaveBeenCalled();
  });

  it('keeps offline GET fallback and the original error when fallback fails', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    baseApi.request.mockRejectedValue(failure(403));
    await expect(inventory.list({}, options)).resolves.toMatchObject({ items: [] });
    fixtureRequest.mockRejectedValue(new Error('fixture failed'));
    await expect(inventory.list({}, options)).rejects.toMatchObject({ status: 403 });
  });

  it.each([401, 403, 404, 409, 500, 0])('queue/product/movements/catalog have no API-mode fallback on %s', async (status) => {
    baseApi.request.mockRejectedValue(status ? failure(status) : new Error('network'));
    for (const invoke of [() => queue.list({}, options), () => inventory.read('sku', options), () => inventory.movements('sku', options), () => catalog.list(options)]) {
      await expect(invoke()).rejects.toMatchObject({ status });
    }
    expect(fixtureRequest).not.toHaveBeenCalled();
  });

  it.each([401, 403, 404, 409, 500, 0])('counter and photo adapters retain their own %s policy', async (status) => {
    baseApi.request.mockRejectedValue(status ? failure(status) : new Error('network'));
    for (const invoke of [() => counter.lookup({}, options), () => counter.tasks('m', options), () => inventory.addPhotos('sku', ['one', 'two'], options)]) {
      if (status === 404) await expect(invoke()).resolves.toBeDefined();
      else await expect(invoke()).rejects.toMatchObject({ status });
    }
    expect(fixtureRequest).toHaveBeenCalledTimes(status === 404 ? 3 : 0);
  });

  it('normalizes queue envelopes and preserves empty and malformed results', async () => {
    baseApi.request.mockResolvedValue({ data: { items: [{ id: 'q', claimedBy: 'mod' }], total: 1 } });
    await expect(queue.list({ type: 'ALL', page: 5 }, options)).resolves.toMatchObject({ total: 1, items: [{ queueId: 'q', refId: 'q', formId: 'q', status: 'PROCESSING' }] });
    expect(baseApi.request).toHaveBeenLastCalledWith({ method: 'get', url: '/queues', params: undefined, signal: options.signal, noReplay: false });
    for (const [data, expected] of [[[], []], ['', []], [null, []], ['malformed', 'malformed']]) {
      baseApi.request.mockResolvedValue({ data });
      await expect(queue.list()).resolves.toEqual(expected);
    }
  });

  it('keeps inventory query defaults, aliases, pagination, and malformed-list errors', async () => {
    baseApi.request.mockResolvedValue({ data: { content: [{ id: 'id', sku: 'old' }], totalElements: 0, totalPages: 0 } });
    await expect(inventory.list({ status: 'WAITING_END_OF_TERM', shelf: 'A1', page: 0, size: 0 }, options)).resolves.toMatchObject({ items: [{ sku: 'id', id: 'id' }], totalElements: 0, totalPages: 0 });
    expect(baseApi.request).toHaveBeenLastCalledWith({ method: 'get', url: '/inventory', params: { shelfLocation: 'A1', page: 0, size: 0 }, signal: options.signal, noReplay: false });
    baseApi.request.mockResolvedValue({ data: { content: {} } });
    await expect(inventory.list()).rejects.toBeInstanceOf(TypeError);
    baseApi.request.mockResolvedValue({ status: 204, data: '' });
    await expect(inventory.read('sku')).rejects.toMatchObject({ status: 404 });
    await expect(inventory.movements('sku')).resolves.toEqual([]);
    await expect(form.read('f', options)).resolves.toEqual({ fixture: true });
  });

  it('maps member aliases and catalog DTOs', async () => {
    baseApi.request.mockResolvedValueOnce({ data: { accountId: 'm', name: 'Name' } });
    await expect(counter.lookup({ phone: '123' }, options)).resolves.toEqual([{ memberId: 'm', memberCode: '', fullName: 'Name', name: 'Name', avatarUrl: '', phone: '123', isMock: false }]);
    baseApi.request.mockResolvedValueOnce({ data: [{ id: 'c', name: 'Category', tryonSlot: 'TOP', status: 'HIDDEN' }] })
      .mockResolvedValueOnce({ data: [{ id: 'b', name: 'Brand', status: 'ACTIVE' }] });
    await expect(catalog.list(options)).resolves.toEqual({ categories: [{ id: 'c', name: 'Category', slot: 'TOP', tryonSlot: 'TOP', hidden: true, status: 'HIDDEN' }], brands: [{ id: 'b', name: 'Brand', hidden: false, status: 'ACTIVE' }] });
  });

  it('keeps reads and backend-first fixture-mode adapters distinct', async () => {
    mode.fixture = true;
    fixtureRequest.mockResolvedValue([]);
    await queue.list({}, options);
    await inventory.list({}, options);
    await inventory.read('sku', options);
    await inventory.movements('sku', options);
    await inventory.byReceipt('r', options);
    expect(baseApi.request).not.toHaveBeenCalled();
    await counter.lookup({}, options);
    await counter.tasks('m', options);
    await inventory.addPhotos('sku', ['one', 'two'], options);
    await catalog.list(options);
    expect(baseApi.request).toHaveBeenCalledTimes(5);
    expect(baseApi.request).toHaveBeenCalledWith({ method: 'post', url: '/products/sku/photos', data: { imageUrl: 'one' }, signal: options.signal, noReplay: true });
    baseApi.request.mockRejectedValue(failure(500));
    await expect(counter.tasks('m', options)).resolves.toEqual({ isMock: true });
    await expect(inventory.addPhotos('sku', ['one'], options)).resolves.toEqual({ isMock: true });
    await expect(catalog.list(options)).resolves.toEqual([]);
  });
});

describe('transport boundaries', () => {
  it('checks cancellation before fixture dispatch for writes and queue reads', async () => {
    mode.fixture = true;
    const controller = new AbortController(); controller.abort();
    const canceledOptions = { ...options, signal: controller.signal };
    await expect(queue.claim('q', canceledOptions)).rejects.toMatchObject({ name: 'AbortError' });
    await expect(queue.list({}, canceledOptions)).rejects.toMatchObject({ name: 'AbortError' });
    expect(fixtureRequest).not.toHaveBeenCalled();
    expect(baseApi.request).not.toHaveBeenCalled();
  });

  it('never applies offline read recovery to writes', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    baseApi.request.mockRejectedValue(failure(404));
    await expect(form.start('f', {}, options)).rejects.toMatchObject({ status: 404 });
    expect(fixtureRequest).not.toHaveBeenCalled();
  });

  it('preserves preflight and in-flight cancellation without normalizing it', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(queue.claim('q', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(baseApi.request).not.toHaveBeenCalled();
    const canceled = Object.assign(new Error('cancel'), { code: 'ERR_CANCELED' });
    baseApi.request.mockRejectedValue(canceled);
    await expect(queue.claim('q', options)).rejects.toBe(canceled);
    await expect(inventory.list({}, options)).rejects.toBe(canceled);
    // Existing broad read fallback also catches cancellation; retain this behavior.
    await expect(form.read('f', options)).resolves.toEqual({ fixture: true });
  });

  it('normalizes timeout errors and keeps upload multipart and progress options', async () => {
    baseApi.request.mockRejectedValueOnce(Object.assign(new Error('timeout'), { code: 'ECONNABORTED' }));
    await expect(queue.claim('q', options)).rejects.toMatchObject({ status: 0, code: '' });
    baseApi.request.mockResolvedValue({ data: { fileUrl: 'photo' } });
    const file = new File(['photo'], 'photo.png');
    const progress = vi.fn();
    await expect(inventory.upload(file, { ...options, onUploadProgress: progress })).resolves.toEqual({ url: 'photo' });
    const config = baseApi.request.mock.calls.at(-1)[0];
    expect(config).toMatchObject({ method: 'post', url: '/uploads?folder=PRODUCTS', signal: options.signal, noReplay: true, headers: { 'Content-Type': undefined }, onUploadProgress: progress });
    expect(config.data.get('file')).toBe(file);
  });

  it('keeps contract-gated request encoding, payload, and multipart headers', async () => {
    const original = structuredClone(phase2Contract);
    try {
      phase2Contract.revision = 'test'; phase2Contract.gates.A = true;
      phase2Contract.operations.test = { gate: 'A', method: 'post', path: '/test/:id' };
      const data = new FormData(); const progress = vi.fn();
      await api.request('test', { ...options, ids: { id: 'a/b' }, params: { x: 1 }, data, onUploadProgress: progress });
      expect(baseApi.request).toHaveBeenCalledExactlyOnceWith({ method: 'post', url: '/test/a%2Fb', params: { x: 1 }, data, signal: options.signal, noReplay: true, onUploadProgress: progress, headers: { 'Content-Type': undefined } });
    } finally { Object.assign(phase2Contract, original); }
  });
});
