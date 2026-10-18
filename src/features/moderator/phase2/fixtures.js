/** Explicit dev/test view-model fixtures. They are NOT approved BE wire contracts. */
import { Phase2Error } from './model.js';

export const fixtureOptions = {
  inspectionReturnReasons: [
    'FAIL',
    'SUSPECTED_COUNTERFEIT',
    'SUSPECTED_ILLEGAL',
    'PRICE_DISAGREEMENT',
  ],
  categorySlots: ['TOP', 'BOTTOM'],
  inventoryStatuses: ['ON_SALE', 'WAITING_END_OF_TERM', 'UNCLAIMED', 'DONATED'],
  termLengthDays: [30],
};
const clone = (value) => JSON.parse(JSON.stringify(value));
let db;
export function resetFixtures() {
  db = {
    members: [
      { memberId: 'member-1', memberCode: 'MB-001', fullName: 'Nguyễn An', phone: '0900000001' },
      { memberId: 'member-2', memberCode: 'MB-002', fullName: 'Trần Bình', phone: '0900000001' },
    ],
    queues: [
      {
        queueId: 'queue-review',
        formId: 'form-review',
        type: 'FORM_REVIEW',
        status: 'PENDING',
        claimedBy: null,
        warehouseId: 'warehouse-a',
      },
      {
        queueId: 'queue-inspect',
        formId: 'form-inspect',
        type: 'INSPECTION',
        status: 'APPROVED',
        claimedBy: null,
        warehouseId: 'warehouse-a',
      },
    ],
    forms: [
      {
        formId: 'form-review',
        queueId: 'queue-review',
        memberId: 'member-1',
        name: 'Áo khoác',
        description: 'Kiểm tra đường may và tình trạng thực tế.',
        desiredPrice: 350000,
        status: 'PENDING',
        warehouseId: 'warehouse-a',
        photos: [],
        allowedActions: ['APPROVE', 'REJECT'],
      },
      {
        formId: 'form-inspect',
        queueId: 'queue-inspect',
        memberId: 'member-1',
        name: 'Quần jeans',
        description: 'Form đã được duyệt.',
        desiredPrice: 250000,
        status: 'APPROVED',
        warehouseId: 'warehouse-a',
        photos: [],
        allowedActions: ['START_INSPECTION'],
      },
    ],
    receipts: [],
    identities: [],
    products: [],
    movements: [],
    catalog: {
      categories: [
        { id: 'cat-1', name: 'Áo', slot: 'TOP', hidden: false },
        { id: 'cat-2', name: 'Quần', slot: 'BOTTOM', hidden: false },
        { id: 'cat-old', name: 'Danh mục cũ', slot: 'TOP', hidden: true },
      ],
      brands: [
        { id: 'brand-1', name: 'ReHome', hidden: false },
        { id: 'brand-old', name: 'Thương hiệu cũ', hidden: true },
      ],
    },
  };
  seedEndTermProducts();
}
function seedEndTermProducts() {
  for (const [index, decision] of ['TAKE_BACK', 'RE_CONSIGN', 'UNCLAIMED'].entries()) {
    const sku = `TEST-SKU-${index + 1}`;
    db.products.push({
      sku,
      warehouseId: 'warehouse-a',
      memberId: 'member-1',
      receiptId: `old-${index}`,
      name: `Sản phẩm cuối kỳ ${index + 1}`,
      size: 'M',
      shelfLocation: 'A1',
      status: decision === 'UNCLAIMED' ? 'UNCLAIMED' : 'WAITING_END_OF_TERM',
      decision,
      agreedPrice: 200000,
      photos: [],
      deadline: '2026-10-30T10:00:00Z',
      allowedActions: [
        decision === 'TAKE_BACK'
          ? 'HANDOVER'
          : decision === 'RE_CONSIGN'
            ? 'RE_CONSIGN'
            : 'TRANSFER',
      ],
    });
  }
}
resetFixtures();
const fail = (message, status = 409) => {
  throw new Phase2Error(message, status);
};
function find(items, key, value, scope) {
  const item = items.find((row) => row[key] === value);
  if (!item) fail('Không tìm thấy dữ liệu.', 404);
  if (item.warehouseId && item.warehouseId !== scope.warehouseId) fail('Sai kho.', 403);
  return item;
}
function page(items, params = {}) {
  const number = Math.max(0, Number(params.page) || 0),
    size = 10;
  return {
    items: items.slice(number * size, (number + 1) * size),
    totalPages: Math.ceil(items.length / size),
    totalElements: items.length,
  };
}
function queueFor(formId, scope) {
  return find(db.queues, 'formId', formId, scope);
}
function requireClaim(formId, scope) {
  const queue = queueFor(formId, scope);
  if (queue.claimedBy !== scope.userId) fail('Công việc không còn do bạn nhận.');
  return queue;
}
function requireIdentity(memberId, data, scope) {
  const identity = db.identities.find(
    (row) =>
      row.memberId === memberId &&
      row.identityToken === data?.identityToken &&
      row.userId === scope.userId &&
      row.warehouseId === scope.warehouseId,
  );
  if (!identity) fail('Hãy xác nhận lại danh tính Member tại quầy.', 403);
}
function formView(form, scope) {
  const queue = queueFor(form.formId, scope);
  return {
    ...clone(form),
    member: clone(find(db.members, 'memberId', form.memberId, scope)),
    claimedBy: queue.claimedBy,
  };
}
function listQueue({ params, scope }) {
  return page(
    db.queues.filter(
      (row) =>
        row.warehouseId === scope.warehouseId &&
        ['PENDING', 'APPROVED', 'INSPECTING'].includes(row.status) &&
        (!params.type || row.type === params.type) &&
        (params.claim !== 'mine' || row.claimedBy === scope.userId) &&
        (params.claim !== 'unclaimed' || !row.claimedBy),
    ),
    params,
  );
}

function claimQueue({ ids, scope }) {
  const item = find(db.queues, 'queueId', ids.queueId, scope);
  if (item.claimedBy && item.claimedBy !== scope.userId)
    fail('Công việc đã được người khác nhận.');
  item.claimedBy = scope.userId;
  return item;
}

function releaseQueue({ ids, scope }) {
  const item = find(db.queues, 'queueId', ids.queueId, scope);
  if (item.claimedBy !== scope.userId) fail('Bạn không sở hữu claim này.');
  item.claimedBy = null;
  return null;
}

function readForm({ ids, scope }) {
  return formView(find(db.forms, 'formId', ids.formId, scope), scope);
}

function reviewForm(operation, { ids, data, scope }) {
  const form = find(db.forms, 'formId', ids.formId, scope);
  const queue = requireClaim(form.formId, scope);
  if (form.status !== 'PENDING') fail('Form không còn chờ duyệt.');
  if (operation === 'formReject' && !data.reason?.trim()) fail('Cần lý do từ chối.', 422);
  form.status = operation === 'formApprove' ? 'APPROVED' : 'REJECTED';
  form.allowedActions = form.status === 'APPROVED' ? ['START_INSPECTION'] : [];
  queue.status = form.status;
  queue.type = form.status === 'APPROVED' ? 'INSPECTION' : 'FORM_REVIEW';
  queue.claimedBy = null;
  form.bringDeadline = '2026-10-25T10:00:00Z';
  return formView(form, scope);
}

function lookupMembers({ params }) {
  const keys = Object.keys(params);
  if (keys.length !== 1) fail('Chỉ dùng một thông tin tra cứu.', 422);
  const key = keys[0] === 'qrPayload' ? 'memberCode' : keys[0];
  return db.members.filter((row) => row[key] === params[keys[0]]);
}

function confirmIdentity({ data, scope }) {
  find(db.members, 'memberId', data.memberId, scope);
  const identity = {
    memberId: data.memberId,
    identityToken: `fixture-identity-${db.identities.length + 1}`,
    userId: scope.userId,
    warehouseId: scope.warehouseId,
  };
  db.identities.push(identity);
  return identity;
}

function memberTasks({ ids, scope }) {
  return db.forms
    .filter(
      (form) =>
        form.memberId === ids.memberId &&
        form.warehouseId === scope.warehouseId &&
        form.status !== 'REJECTED',
    )
    .map((form) => formView(form, scope));
}

function startInspection({ ids, data, scope }) {
  const form = find(db.forms, 'formId', ids.formId, scope);
  requireClaim(form.formId, scope);
  requireIdentity(form.memberId, data, scope);
  if (form.status !== 'APPROVED') fail('Form không đủ điều kiện bắt đầu.');
  form.status = 'INSPECTING';
  queueFor(form.formId, scope).status = form.status;
  form.allowedActions = ['COMPLETE_INSPECTION', 'RETURN_ONSITE'];
  return formView(form, scope);
}

function validInspection(data) {
  return (
    Number.isSafeInteger(data.agreedPrice) &&
    data.agreedPrice > 0 &&
    fixtureOptions.termLengthDays.includes(data.termLengthDays) &&
    data.conditionNote?.trim()
  );
}

function completeInspection({ ids, data, scope }) {
  const form = find(db.forms, 'formId', ids.formId, scope);
  requireClaim(form.formId, scope);
  requireIdentity(form.memberId, data, scope);
  if (form.status !== 'INSPECTING') fail('Form không còn kiểm định.');
  if (!validInspection(data)) fail('Thông tin kiểm định chưa hợp lệ.', 422);
  const receiptId = `receipt-${db.receipts.length + 1}`;
  const receipt = {
    receiptId,
    formId: form.formId,
    confirmedAt: null,
    productSku: null,
    snapshot: {
      agreedPrice: data.agreedPrice,
      floorPrice: Math.round(data.agreedPrice * 0.5),
      commissionRate: 0.1,
      termLengthDays: data.termLengthDays,
      terms: 'Điều khoản thử nghiệm, không phải hợp đồng thực.',
    },
  };
  db.receipts.push(receipt);
  form.receiptId = receiptId;
  form.status = 'WAITING_CONFIRMATION';
  queueFor(form.formId, scope).status = form.status;
  form.allowedActions = [];
  return { receiptId };
}

function returnOnsite({ ids, data, scope }) {
  const form = find(db.forms, 'formId', ids.formId, scope);
  requireClaim(form.formId, scope);
  requireIdentity(form.memberId, data, scope);
  if (form.status !== 'INSPECTING') fail('Trạng thái không hợp lệ.');
  if (!fixtureOptions.inspectionReturnReasons.includes(data.reason) || !data.note?.trim())
    fail('Cần lý do và ghi chú.', 422);
  form.status = 'RETURNED_ONSITE';
  queueFor(form.formId, scope).status = form.status;
  form.allowedActions = [];
  return null;
}

function readReceipt({ ids, scope }) {
  const receipt = find(db.receipts, 'receiptId', ids.receiptId, scope);
  if (receipt.formId) find(db.forms, 'formId', receipt.formId, scope);
  if (receipt.sku) find(db.products, 'sku', receipt.sku, scope);
  return receipt;
}

function uploadPhoto({ data }) {
  return { url: URL.createObjectURL(data.get('file')), status: 'ORIGINAL' };
}

function productByReceipt({ ids, scope }) {
  return (
    db.products.find(
      (row) => row.receiptId === ids.receiptId && row.warehouseId === scope.warehouseId,
    ) ?? null
  );
}

function receiptBlocksStockIn(receipt, receiptId) {
  return (
    !receipt.confirmedAt || receipt.productSku ||
    db.products.some((row) => row.receiptId === receiptId)
  );
}

function createProduct({ data, scope }) {
  const receipt = find(db.receipts, 'receiptId', data.receiptId, scope);
  const form = find(db.forms, 'formId', receipt.formId, scope);
  if (receiptBlocksStockIn(receipt, data.receiptId))
    fail('Biên nhận chưa xác nhận hoặc đã nhập kho.');
  const product = {
    ...data,
    sku: `TEST-SKU-${db.products.length + 1}`,
    memberId: form.memberId,
    warehouseId: scope.warehouseId,
    status: 'ON_SALE',
    agreedPrice: receipt.snapshot.agreedPrice,
    photos: data.photoUrls.map((url) => ({ url, status: 'PROCESSING' })),
    allowedActions: ['CHANGE_SHELF', 'ADD_PHOTOS'],
  };
  db.products.push(product);
  receipt.productSku = product.sku;
  form.status = 'STOCKED';
  db.movements.push({
    sku: product.sku,
    type: 'STOCK_IN',
    shelfLocation: product.shelfLocation,
    createdAt: new Date().toISOString(),
  });
  return product;
}

function listInventory({ params, scope }) {
  return page(
    db.products.filter(
      (row) =>
        row.warehouseId === scope.warehouseId &&
        (!params.status || row.status === params.status) &&
        (!params.shelf || row.shelfLocation.includes(params.shelf)) &&
        (!params.sku || row.sku.includes(params.sku)),
    ),
    params,
  );
}

function readProduct({ ids, scope }) {
  return find(db.products, 'sku', ids.sku, scope);
}

function updateShelf({ ids, data, scope }) {
  const product = find(db.products, 'sku', ids.sku, scope);
  if (!data.shelfLocation?.trim()) fail('Cần vị trí kệ.', 422);
  product.shelfLocation = data.shelfLocation;
  db.movements.push({
    sku: product.sku,
    type: 'SHELF_CHANGED',
    shelfLocation: product.shelfLocation,
    createdAt: new Date().toISOString(),
  });
  return null;
}

function stockMovements({ ids, scope }) {
  find(db.products, 'sku', ids.sku, scope);
  return db.movements.filter((row) => row.sku === ids.sku);
}

function skuLabel({ ids, scope }) {
  find(db.products, 'sku', ids.sku, scope);
  return { labelPdfUrl: null };
}

function addProductPhotos({ ids, data, scope }) {
  const product = find(db.products, 'sku', ids.sku, scope);
  product.photos.push(...data.photoUrls.map((url) => ({ url, status: 'PROCESSING' })));
  return product;
}

function listCatalog() {
  return db.catalog;
}

function validateCatalogItem(items, operation, request) {
  const { ids, data } = request;
  if (!data.name?.trim()) fail('Cần nhập tên.', 422);
  if (
    items.some(
      (row) => row.id !== ids.id && row.name.toLowerCase() === data.name.trim().toLowerCase(),
    )
  )
    fail('Tên đã tồn tại.');
  if (operation.startsWith('category') && !fixtureOptions.categorySlots.includes(data.slot))
    fail('Slot không hợp lệ.', 422);
}

function saveCatalogItem(operation, request) {
  const { ids, data, scope } = request;
  const items = operation.startsWith('category') ? db.catalog.categories : db.catalog.brands;
  validateCatalogItem(items, operation, request);
  if (ids.id) {
    const item = find(items, 'id', ids.id, scope);
    Object.assign(item, data);
    return item;
  }
  const result = { ...data, id: `fixture-${operation}-${items.length + 1}`, hidden: false };
  items.push(result);
  return result;
}

function hideCatalogItem(operation, { ids, scope }) {
  const items = operation.startsWith('category') ? db.catalog.categories : db.catalog.brands;
  find(items, 'id', ids.id, scope).hidden = true;
  return null;
}

function listEndTerm({ params, scope }) {
  return page(
    db.products.filter(
      (row) =>
        row.warehouseId === scope.warehouseId && row.decision && row.allowedActions.length,
    ),
    params,
  );
}

function readEndTerm({ ids, scope }) {
  const product = find(db.products, 'sku', ids.sku, scope);
  return { ...product, member: find(db.members, 'memberId', product.memberId, scope) };
}

function handoverEndTerm({ ids, data, scope }) {
  const product = find(db.products, 'sku', ids.sku, scope);
  requireIdentity(product.memberId, data, scope);
  if (!product.allowedActions.includes('HANDOVER') || data.context !== 'END_OF_TERM_TAKE_BACK')
    fail('Không được bàn giao.');
  product.status = 'RETURNED';
  product.allowedActions = [];
  return null;
}

function canReconsign(product, data) {
  return (
    product.allowedActions.includes('RE_CONSIGN') &&
    Number.isSafeInteger(data.agreedPrice) && data.agreedPrice > 0
  );
}

function reconsignEndTerm({ ids, data, scope }) {
  const product = find(db.products, 'sku', ids.sku, scope);
  if (!canReconsign(product, data)) fail('Không thể ký gửi lại.');
  const receiptId = `receipt-${db.receipts.length + 1}`;
  db.receipts.push({
    receiptId,
    sku: product.sku,
    confirmedAt: null,
    snapshot: { agreedPrice: data.agreedPrice, termLengthDays: data.termLengthDays },
  });
  product.newReceiptId = receiptId;
  product.allowedActions = [];
  return { receiptId };
}

function canTransferUnclaimed(product, data) {
  return (
    product.allowedActions.includes('TRANSFER') &&
    product.status === 'UNCLAIMED' && data.partnerName?.trim()
  );
}

function transferUnclaimed({ ids, data, scope }) {
  const product = find(db.products, 'sku', ids.sku, scope);
  if (!canTransferUnclaimed(product, data)) fail('Không đủ điều kiện chuyển giao.');
  product.status = 'DONATED';
  product.allowedActions = [];
  db.movements.push({
    sku: product.sku,
    type: 'DONATED',
    partnerName: data.partnerName,
    createdAt: new Date().toISOString(),
  });
  return null;
}

const fixtureHandlers = {
  queueList: listQueue,
  queueClaim: claimQueue,
  queueRelease: releaseQueue,
  formRead: readForm,
  formApprove: (request) => reviewForm('formApprove', request),
  formReject: (request) => reviewForm('formReject', request),
  memberLookup: lookupMembers,
  identityConfirm: confirmIdentity,
  memberTasks,
  inspectionStart: startInspection,
  inspectionComplete: completeInspection,
  returnOnsite,
  receiptRead: readReceipt,
  photoUpload: uploadPhoto,
  productByReceipt,
  productCreate: createProduct,
  inventoryList: listInventory,
  productRead: readProduct,
  shelfUpdate: updateShelf,
  stockMovements,
  skuLabel,
  productPhotos: addProductPhotos,
  catalogList: listCatalog,
  categoryCreate: (request) => saveCatalogItem('categoryCreate', request),
  categoryUpdate: (request) => saveCatalogItem('categoryUpdate', request),
  brandCreate: (request) => saveCatalogItem('brandCreate', request),
  brandUpdate: (request) => saveCatalogItem('brandUpdate', request),
  categoryHide: (request) => hideCatalogItem('categoryHide', request),
  brandHide: (request) => hideCatalogItem('brandHide', request),
  endTermList: listEndTerm,
  endTermRead: readEndTerm,
  endTermHandover: handoverEndTerm,
  endTermReconsign: reconsignEndTerm,
  unclaimedTransfer: transferUnclaimed,
};

export async function fixtureRequest(operation, options = {}) {
  const { signal, scope = {} } = options;
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (!scope.userId || !scope.warehouseId) fail('Thiếu phiên làm việc.', 403);
  if (!Object.hasOwn(fixtureHandlers, operation))
    throw new Phase2Error('Fixture chưa hỗ trợ thao tác.', 0, 'CONTRACT_BLOCKED');
  const { ids = {}, params = {}, data = {} } = options;
  return clone(fixtureHandlers[operation]({ ids, params, data, scope }));
}

// Test-only helper, deliberately not exposed as a Moderator UI action.
export function confirmFixtureReceipt(receiptId) {
  const receipt = db.receipts.find((row) => row.receiptId === receiptId);
  if (!receipt) fail('Không tìm thấy receipt.', 404);
  receipt.confirmedAt = new Date().toISOString();
  if (receipt.sku) {
    const product = db.products.find((row) => row.sku === receipt.sku);
    Object.assign(product, {
      receiptId,
      agreedPrice: receipt.snapshot.agreedPrice,
      status: 'ON_SALE',
      decision: null,
      allowedActions: ['CHANGE_SHELF', 'ADD_PHOTOS'],
    });
    db.movements.push({ sku: product.sku, type: 'RE_CONSIGNED', createdAt: receipt.confirmedAt });
  }
}
