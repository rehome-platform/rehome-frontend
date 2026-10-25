/** Explicit dev/test view-model fixtures. They are NOT approved BE wire contracts. */
import { Phase2Error } from '../models/warehouseModel.js';

export const fixtureOptions = {
  inspectionReturnReasons: [
    'FAIL',
    'SUSPECTED_COUNTERFEIT',
    'SUSPECTED_ILLEGAL',
    'PRICE_DISAGREEMENT',
  ],
  categorySlots: ['TOP', 'BOTTOM'],
  inventoryStatuses: [
    'ON_SALE',
    'RESERVED',
    'SOLD',
    'WITHDRAWN',
    'UNCLAIMED',
    'DONATED',
    'DESTROYED',
  ],
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
export async function fixtureRequest(
  operation,
  { ids = {}, params = {}, data = {}, signal, scope = {} } = {},
) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (!scope.userId || !scope.warehouseId) fail('Thiếu phiên làm việc.', 403);
  let result;
  switch (operation) {
    case 'queueList':
      result = page(
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
      break;
    case 'queueClaim': {
      const item = find(db.queues, 'queueId', ids.queueId, scope);
      if (item.claimedBy && item.claimedBy !== scope.userId)
        fail('Công việc đã được người khác nhận.');
      item.claimedBy = scope.userId;
      result = item;
      break;
    }
    case 'queueRelease': {
      const item = find(db.queues, 'queueId', ids.queueId, scope);
      if (item.claimedBy !== scope.userId) fail('Bạn không sở hữu claim này.');
      item.claimedBy = null;
      result = null;
      break;
    }
    case 'formRead':
      result = formView(find(db.forms, 'formId', ids.formId, scope), scope);
      break;
    case 'formApprove':
    case 'formReject': {
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
      result = formView(form, scope);
      break;
    }
    case 'memberLookup': {
      const keys = Object.keys(params);
      if (keys.length !== 1) fail('Chỉ dùng một thông tin tra cứu.', 422);
      const key = keys[0] === 'qrPayload' ? 'memberCode' : keys[0];
      result = db.members.filter((row) => row[key] === params[keys[0]]);
      break;
    }
    case 'identityConfirm': {
      find(db.members, 'memberId', data.memberId, scope);
      result = {
        memberId: data.memberId,
        identityToken: `fixture-identity-${db.identities.length + 1}`,
        userId: scope.userId,
        warehouseId: scope.warehouseId,
      };
      db.identities.push(result);
      break;
    }
    case 'memberTasks':
      result = db.forms
        .filter(
          (form) =>
            form.memberId === ids.memberId &&
            form.warehouseId === scope.warehouseId &&
            form.status !== 'REJECTED',
        )
        .map((form) => formView(form, scope));
      break;
    case 'inspectionStart': {
      const form = find(db.forms, 'formId', ids.formId, scope);
      requireClaim(form.formId, scope);
      requireIdentity(form.memberId, data, scope);
      if (form.status !== 'APPROVED') fail('Form không đủ điều kiện bắt đầu.');
      form.status = 'INSPECTING';
      queueFor(form.formId, scope).status = form.status;
      form.allowedActions = ['COMPLETE_INSPECTION', 'RETURN_ONSITE'];
      result = formView(form, scope);
      break;
    }
    case 'inspectionComplete': {
      const form = find(db.forms, 'formId', ids.formId, scope);
      requireClaim(form.formId, scope);
      requireIdentity(form.memberId, data, scope);
      if (form.status !== 'INSPECTING') fail('Form không còn kiểm định.');
      if (
        !Number.isSafeInteger(data.agreedPrice) ||
        data.agreedPrice <= 0 ||
        !fixtureOptions.termLengthDays.includes(data.termLengthDays) ||
        !data.conditionNote?.trim()
      )
        fail('Thông tin kiểm định chưa hợp lệ.', 422);
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
      result = { receiptId };
      break;
    }
    case 'returnOnsite': {
      const form = find(db.forms, 'formId', ids.formId, scope);
      requireClaim(form.formId, scope);
      requireIdentity(form.memberId, data, scope);
      if (form.status !== 'INSPECTING') fail('Trạng thái không hợp lệ.');
      if (!fixtureOptions.inspectionReturnReasons.includes(data.reason) || !data.note?.trim())
        fail('Cần lý do và ghi chú.', 422);
      form.status = 'RETURNED_ONSITE';
      queueFor(form.formId, scope).status = form.status;
      form.allowedActions = [];
      result = null;
      break;
    }
    case 'receiptRead': {
      const receipt = find(db.receipts, 'receiptId', ids.receiptId, scope);
      if (receipt.formId) find(db.forms, 'formId', receipt.formId, scope);
      if (receipt.sku) find(db.products, 'sku', receipt.sku, scope);
      result = receipt;
      break;
    }
    case 'photoUpload':
      result = { url: URL.createObjectURL(data.get('file')), status: 'ORIGINAL' };
      break;
    case 'productByReceipt':
      result =
        db.products.find(
          (row) => row.receiptId === ids.receiptId && row.warehouseId === scope.warehouseId,
        ) ?? null;
      break;
    case 'productCreate': {
      const receipt = find(db.receipts, 'receiptId', data.receiptId, scope);
      const form = find(db.forms, 'formId', receipt.formId, scope);
      if (
        !receipt.confirmedAt ||
        receipt.productSku ||
        db.products.some((row) => row.receiptId === data.receiptId)
      )
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
      result = product;
      break;
    }
    case 'inventoryList':
      result = page(
        db.products.filter(
          (row) =>
            row.warehouseId === scope.warehouseId &&
            (!params.status || row.status === params.status) &&
            (!params.shelf || row.shelfLocation.includes(params.shelf)) &&
            (!params.sku || row.sku.includes(params.sku)),
        ),
        params,
      );
      break;
    case 'productRead':
      result = find(db.products, 'sku', ids.sku, scope);
      break;
    case 'shelfUpdate': {
      const product = find(db.products, 'sku', ids.sku, scope);
      if (!data.shelfLocation?.trim()) fail('Cần vị trí kệ.', 422);
      product.shelfLocation = data.shelfLocation;
      db.movements.push({
        sku: product.sku,
        type: 'SHELF_CHANGED',
        shelfLocation: product.shelfLocation,
        createdAt: new Date().toISOString(),
      });
      result = null;
      break;
    }
    case 'stockMovements':
      find(db.products, 'sku', ids.sku, scope);
      result = db.movements.filter((row) => row.sku === ids.sku);
      break;
    case 'skuLabel':
      find(db.products, 'sku', ids.sku, scope);
      result = { labelPdfUrl: null };
      break;
    case 'productPhotos': {
      const product = find(db.products, 'sku', ids.sku, scope);
      product.photos.push(...data.photoUrls.map((url) => ({ url, status: 'PROCESSING' })));
      result = product;
      break;
    }
    case 'catalogList':
      result = db.catalog;
      break;
    case 'categoryCreate':
    case 'categoryUpdate':
    case 'brandCreate':
    case 'brandUpdate': {
      const items = operation.startsWith('category') ? db.catalog.categories : db.catalog.brands;
      if (!data.name?.trim()) fail('Cần nhập tên.', 422);
      if (
        items.some(
          (row) => row.id !== ids.id && row.name.toLowerCase() === data.name.trim().toLowerCase(),
        )
      )
        fail('Tên đã tồn tại.');
      if (operation.startsWith('category') && !fixtureOptions.categorySlots.includes(data.slot))
        fail('Slot không hợp lệ.', 422);
      if (ids.id) {
        const item = find(items, 'id', ids.id, scope);
        Object.assign(item, data);
        result = item;
      } else {
        result = { ...data, id: `fixture-${operation}-${items.length + 1}`, hidden: false };
        items.push(result);
      }
      break;
    }
    case 'categoryHide':
    case 'brandHide': {
      const items = operation.startsWith('category') ? db.catalog.categories : db.catalog.brands;
      find(items, 'id', ids.id, scope).hidden = true;
      result = null;
      break;
    }
    case 'endTermList':
      result = page(
        db.products.filter(
          (row) =>
            row.warehouseId === scope.warehouseId && row.decision && row.allowedActions.length,
        ),
        params,
      );
      break;
    case 'endTermRead': {
      const product = find(db.products, 'sku', ids.sku, scope);
      result = { ...product, member: find(db.members, 'memberId', product.memberId, scope) };
      break;
    }
    case 'endTermHandover': {
      const product = find(db.products, 'sku', ids.sku, scope);
      requireIdentity(product.memberId, data, scope);
      if (!product.allowedActions.includes('HANDOVER') || data.context !== 'END_OF_TERM_TAKE_BACK')
        fail('Không được bàn giao.');
      product.status = 'RETURNED';
      product.allowedActions = [];
      result = null;
      break;
    }
    case 'endTermReconsign': {
      const product = find(db.products, 'sku', ids.sku, scope);
      if (
        !product.allowedActions.includes('RE_CONSIGN') ||
        !Number.isSafeInteger(data.agreedPrice) ||
        data.agreedPrice <= 0
      )
        fail('Không thể ký gửi lại.');
      const receiptId = `receipt-${db.receipts.length + 1}`;
      db.receipts.push({
        receiptId,
        sku: product.sku,
        confirmedAt: null,
        snapshot: { agreedPrice: data.agreedPrice, termLengthDays: data.termLengthDays },
      });
      product.newReceiptId = receiptId;
      product.allowedActions = [];
      result = { receiptId };
      break;
    }
    case 'unclaimedTransfer': {
      const product = find(db.products, 'sku', ids.sku, scope);
      if (
        !product.allowedActions.includes('TRANSFER') ||
        product.status !== 'UNCLAIMED' ||
        !data.partnerName?.trim()
      )
        fail('Không đủ điều kiện chuyển giao.');
      product.status = 'DONATED';
      product.allowedActions = [];
      db.movements.push({
        sku: product.sku,
        type: 'DONATED',
        partnerName: data.partnerName,
        createdAt: new Date().toISOString(),
      });
      result = null;
      break;
    }
    default:
      throw new Phase2Error('Fixture chưa hỗ trợ thao tác.', 0, 'CONTRACT_BLOCKED');
  }
  return clone(result);
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
