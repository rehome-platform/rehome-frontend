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
    'WAREHOUSE',
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
      {
        queueId: 'queue-return-1',
        refId: 'ret-1',
        returnId: 'ret-1',
        type: 'RETURN',
        status: 'PENDING',
        claimedBy: null,
        warehouseId: 'warehouse-a',
        targetName: 'Yêu cầu trả hàng #RET-001 (Áo sơ mi linen)',
        subjectSubtitle: 'Lý do: Không vừa size · Người mua: Lê Thu',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
      {
        queueId: 'queue-org-1',
        refId: 'org-1',
        type: 'ORG_VERIFICATION',
        status: 'PENDING',
        claimedBy: null,
        warehouseId: 'warehouse-a',
        targetName: 'Quỹ Trẻ Em Hy Vọng',
        subjectSubtitle: 'Tổ chức từ thiện · MST: 0312345678',
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
      {
        queueId: 'queue-report-1',
        refId: 'rep-1',
        type: 'VIOLATION_REPORT',
        status: 'PENDING',
        claimedBy: null,
        warehouseId: 'warehouse-a',
        targetName: 'Chiến dịch gây quỹ Mùa Đông Ấm',
        subjectSubtitle: '5 báo cáo vi phạm nội dung nghi ngờ gian lận',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
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

  // Wireframe products for L-02 & TK-01..TK-04
  db.products.push(
    {
      sku: 'RH-M4T19B',
      id: 'RH-M4T19B',
      warehouseId: 'warehouse-a',
      memberId: 'member-1',
      receiptId: 'KG-2026-000189',
      name: 'Áo khoác bomber',
      brand: 'Adidas',
      brandName: 'Adidas',
      size: 'L',
      shelfLocation: 'C2-11',
      status: 'WAITING_END_OF_TERM',
      decision: 'RE_CONSIGN',
      agreedPrice: 850000,
      currentPrice: 520000,
      floorPrice: 425000,
      marketMinPrice: 520000,
      marketMaxPrice: 700000,
      currentTerm: 3,
      daysIntoTerm: 90,
      photos: [],
      deadline: '2026-11-15T00:00:00Z',
      allowedActions: ['RE_CONSIGN', 'CHANGE_SHELF'],
    },
    {
      sku: 'RH-AL-000298',
      id: 'RH-AL-000298',
      warehouseId: 'warehouse-a',
      memberId: 'member-2',
      receiptId: 'KG-2026-000140',
      name: 'Áo len cổ lọ',
      brand: 'Muji',
      brandName: 'Muji',
      size: 'L',
      shelfLocation: 'A2-09',
      status: 'WAITING_END_OF_TERM',
      decision: 'TAKE_BACK',
      agreedPrice: 850000,
      currentPrice: 550000,
      floorPrice: 275000,
      currentTerm: 3,
      daysIntoTerm: 90,
      photos: [],
      deadline: '2026-11-07T00:00:00Z',
      takeBackDeadline: '2026-10-18T00:00:00Z',
      allowedActions: ['HANDOVER', 'CHANGE_SHELF'],
    },
    {
      sku: 'RH-K9B47T',
      id: 'RH-K9B47T',
      warehouseId: 'warehouse-a',
      memberId: 'member-1',
      name: 'Áo khoác denim',
      brand: 'Zara',
      brandName: 'Zara',
      size: 'L',
      shelfLocation: 'A3-07',
      status: 'RESERVED',
      currentTerm: 2,
      daysIntoTerm: 41,
      agreedPrice: 350000,
      currentPrice: 350000,
      photos: [],
      allowedActions: ['CHANGE_SHELF'],
    },
    {
      sku: 'RH-C2M08P',
      id: 'RH-C2M08P',
      warehouseId: 'warehouse-a',
      memberId: 'member-2',
      name: 'Quần jeans ống rộng',
      brand: "Levi's",
      brandName: "Levi's",
      size: '29',
      shelfLocation: 'B1-22',
      status: 'SOLD',
      currentTerm: 2,
      daysIntoTerm: 46,
      agreedPrice: 420000,
      currentPrice: 420000,
      floorPrice: 210000,
      photos: [],
      allowedActions: ['CHANGE_SHELF'],
    },
    {
      sku: 'RH-T3N77F',
      id: 'RH-T3N77F',
      warehouseId: 'warehouse-a',
      memberId: 'member-2',
      name: 'Áo len cổ lọ',
      brand: 'Muji',
      brandName: 'Muji',
      size: 'L',
      shelfLocation: 'A2-09',
      status: 'UNCLAIMED',
      agreedPrice: 550000,
      currentPrice: 550000,
      photos: [],
      allowedActions: ['TRANSFER', 'CHANGE_SHELF'],
    },
    {
      sku: 'RH-D6P23L',
      id: 'RH-D6P23L',
      warehouseId: 'warehouse-b',
      warehouseName: 'Kho Thủ Đức',
      memberId: 'member-1',
      name: 'Áo khoác gió',
      brand: 'Uniqlo',
      brandName: 'Uniqlo',
      size: 'M',
      shelfLocation: 'D1-01',
      status: 'ON_SALE',
      currentPrice: 320000,
      photos: [],
      allowedActions: [],
    },
    {
      sku: 'RH-DG-000101',
      id: 'RH-DG-000101',
      warehouseId: 'warehouse-a',
      memberId: 'member-1',
      memberName: 'Lê Văn An',
      name: 'Áo sơ mi lụa tơ tằm',
      brand: 'Uniqlo',
      brandName: 'Uniqlo',
      size: 'M',
      shelfLocation: 'C1-04',
      status: 'DEGRADED',
      degradedDate: '2026-11-04T10:00:00Z',
      degradedReason: 'Ố vàng vùng cổ và rách chỉ đường may nách khi hoàn về từ người mua',
      decisionStatus: 'PENDING_DECISION',
      decisionStatusLabel: 'Chờ Member chọn',
      compensationAmount: 320000,
      halfCompensationAmount: 160000,
      stockInPhotos: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300'],
      returnPhotos: ['https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=300'],
      allowedActions: [],
    },
    {
      sku: 'RH-DG-000102',
      id: 'RH-DG-000102',
      warehouseId: 'warehouse-a',
      memberId: 'member-2',
      memberName: 'Trần Thị Bình',
      name: 'Váy dạ hội đuôi cá',
      brand: 'Zara',
      brandName: 'Zara',
      size: 'S',
      shelfLocation: 'C1-05',
      status: 'DEGRADED',
      degradedDate: '2026-11-03T14:30:00Z',
      degradedReason: 'Trầy xước bề mặt vải, dính vết son môi không giặt được',
      decisionStatus: 'FULL_COMPENSATION',
      decisionStatusLabel: 'Đã đền 100% (Tài sản nền tảng)',
      compensationAmount: 650000,
      halfCompensationAmount: 325000,
      stockInPhotos: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300'],
      returnPhotos: ['https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=300'],
      allowedActions: [],
    }
  );

  db.degradedCases = db.products.filter(product => product.status === 'DEGRADED').map((product, index) => {
    const receivedAt = product.degradedDate;
    const decision = product.decisionStatus === 'FULL_COMPENSATION' ? 'FULL_COMPENSATION' : null;
    product.status = decision ? 'PLATFORM_OWNED' : 'WAREHOUSE';
    return {
      id: `fixture-case-${index + 1}`, productId: product.id, productName: product.name,
      warehouseId: product.warehouseId, photos: product.returnPhotos || [],
      moderatorNote: product.degradedReason, reason: null,
      compensationAmount: product.compensationAmount, degradedCompensationRate: 0.5,
      paidAmount: decision ? product.compensationAmount : null,
      receivedAt, decisionDeadline: new Date(Date.parse(receivedAt) + 30 * 86400000).toISOString(),
      pickupDeadline: null, autoDecided: false, decision,
      status: decision ? 'DECIDED' : 'PENDING_DECISION', decidedAt: decision ? receivedAt : null,
    };
  });
  db.products.push({ id: 'RH-DG-ONSALE', sku: 'RH-DG-ONSALE', name: 'Áo sơ mi kiểm kho', warehouseId: 'warehouse-degraded', status: 'ON_SALE', currentPrice: 200000, currentTerm: 1, photos: [], allowedActions: [] });

  db.endTermDecisions = db.products.filter(product => product.decision).map((product, index) => {
    if (product.status === 'WAITING_END_OF_TERM') product.status = product.decision === 'TAKE_BACK' ? 'WITHDRAWN' : 'WAREHOUSE';
    product.decisionId = null;
    product.pricingEligible = product.decision === 'RE_CONSIGN';
    return { id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      productId: product.id || product.sku, decision: product.decision, newReceiptId: null,
      decidedAt: '2026-10-18T14:20:00Z' };
  });
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
    case 'formList': {
      const status = params?.status;
      const items = db.forms
        .filter((row) => row.warehouseId === scope.warehouseId && (!status || row.status === status))
        .map((row) => formView(row, scope));
      result = page(items, params);
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
    case 'receiptPdf': {
      find(db.receipts, 'receiptId', ids.receiptId, scope);
      result = { pdfUrl: null };
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
      result = product;
      break;
    }
    case 'degradedCaseList':
      result = db.degradedCases.filter(item => item.warehouseId === scope.warehouseId && (!params.status || item.status === params.status));
      break;
    case 'degradedCaseRead':
      result = find(db.degradedCases, 'id', ids.id, scope);
      break;
    case 'degradedCaseCreate':
    case 'degradedCaseCreateFromReturn': {
      const fromReturn = operation === 'degradedCaseCreateFromReturn';
      const product = db.products.find(row => row.id === data.productId && row.warehouseId === scope.warehouseId);
      if (!fromReturn && !product) fail('Không tìm thấy sản phẩm trong kho.', 404);
      if (!fromReturn && product.status !== 'ON_SALE') fail('Chỉ mở ca cho sản phẩm đang bán.', 409);
      if (db.degradedCases.some(row => row.productId === data.productId && !row.decision)) fail('Sản phẩm đã có ca đang chờ quyết định.', 409);
      const receivedAt = new Date().toISOString();
      result = {
        id: `fixture-case-${crypto.randomUUID()}`, productId: data.productId,
        productName: product?.name || data.productName, warehouseId: scope.warehouseId,
        photos: data.photos || [], moderatorNote: data.notes || '', reason: data.reason || null,
        compensationAmount: data.compensationAmount ?? (product ? Math.round(product.currentPrice * (1 - (product.currentTerm === 3 ? 0.2 : product.currentTerm === 2 ? 0.15 : 0.1))) : null),
        degradedCompensationRate: data.degradedCompensationRate ?? 0.5,
        paidAmount: null, receivedAt,
        decisionDeadline: new Date(Date.parse(receivedAt) + 30 * 86400000).toISOString(),
        pickupDeadline: null, autoDecided: false, decision: null, decidedAt: null, status: 'PENDING_DECISION',
      };
      db.degradedCases.push(result);
      if (product) product.status = 'WAREHOUSE';
      break;
    }
    case 'inventoryList':
      result = page(
        db.products.filter(
          (row) =>
            row.warehouseId === scope.warehouseId &&
            (!params.status || (params.status === 'WAITING_END_OF_TERM' ? ((row.status === 'WAREHOUSE' && (row.decisionId || row.decision)) || row.status === 'WITHDRAWN' || row.status === 'UNCLAIMED') : params.status === 'DEGRADED' ? (row.status === 'DEGRADED' || row.status === 'PLATFORM_OWNED') : row.status === params.status)) &&
            (!params.shelf || row.shelfLocation.includes(params.shelf)) &&
            (!params.sku || row.sku.includes(params.sku)),
        ),
        params,
      );
      break;
    case 'productRead': {
      const product = find(db.products, 'sku', ids.sku, scope);
      const decision = db.endTermDecisions.find(row => row.productId === (product.id || product.sku) && row.decision === null);
      const degraded = db.degradedCases.find(row => row.productId === (product.id || product.sku) && !row.decision);
      result = { ...product, decisionId: decision?.id || null, degradedCaseId: degraded?.id || null };
      break;
    }
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
            row.warehouseId === scope.warehouseId && ['WAREHOUSE', 'WITHDRAWN', 'UNCLAIMED'].includes(row.status) && (row.decision || row.decisionId),
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
    case 'endTermPendingPricing':
      result = db.endTermDecisions.filter(decision => decision.decision === 'RE_CONSIGN' && !decision.newReceiptId)
        .flatMap(decision => {
          const product = db.products.find(row => (row.id || row.sku) === decision.productId && row.warehouseId === scope.warehouseId && row.status === 'WAREHOUSE');
          return product ? [{ decisionId: decision.id, productId: decision.productId, productName: product.name,
            currentPrice: product.currentPrice, previousAgreedPrice: product.agreedPrice, decidedAt: decision.decidedAt }] : [];
        });
      break;
    case 'endTermReconsignTerms': {
      const decision = db.endTermDecisions.find(row => row.id === ids.decisionId);
      if (!decision) fail('Không tìm thấy quyết định.', 404);
      const product = find(db.products, 'sku', decision.productId, scope);
      if (decision.decision !== 'RE_CONSIGN' || decision.newReceiptId || product.status !== 'WAREHOUSE') fail('Không thể gửi đề xuất.', 409);
      const agreedPrice = Number(data.agreedPrice);
      if (!Number.isSafeInteger(agreedPrice) || agreedPrice <= 0) {
        fail('Giá bán đề xuất không hợp lệ.', 400);
      }
      const receiptId = crypto.randomUUID();
      const receiptNo = `KG-2026-${String(db.receipts.length + 214).padStart(6, '0')}`;
      const receipt = {
        id: receiptId,
        receiptId,
        receiptNo,
        sku: product.sku,
        formId: product.formId || 'form-qa',
        productName: product.name,
        size: product.size,
        agreedPrice,
        floorPrice: data.floorPrice || Math.round(agreedPrice * 0.5),
        conditionNote: data.conditionNote || product.conditionNote,
        moderatorNote: data.moderatorNote || 'Món hàng còn tốt, đề xuất mức giá mới dễ bán hơn.',
        commissionRateTerm1: 0.1,
        commissionRateTerm2: 0.15,
        commissionRateTerm3: 0.2,
        termLengthDays: 30,
        confirmedAt: null,
      };
      db.receipts.push(receipt);
      decision.newReceiptId = receiptId;
      product.newReceiptId = receiptId;
      product.pricingEligible = false;
      product.proposedPrice = agreedPrice;
      product.moderatorNote = data.moderatorNote;
      product.reConsignStatus = 'PROPOSAL_SENT';
      result = { decisionId: decision.id, newReceiptId: receiptId };
      break;
    }
    case 'endTermConfirmReceipt': {
      const receipt = db.receipts.find(r => r.receiptId === ids.receiptId || r.id === ids.receiptId);
      const product = db.products.find(p => p.newReceiptId === ids.receiptId && p.warehouseId === scope.warehouseId);
      if (!product) fail('Không tìm thấy sản phẩm.', 404);
      if (receipt) receipt.confirmedAt = new Date().toISOString();
      product.status = 'ON_SALE';
      product.currentTerm = 1;
      product.receiptId = ids.receiptId;
      product.termStartedAt = new Date().toISOString();
      product.endOfTermDeadline = new Date(Date.parse(product.termStartedAt) + 90 * 86400000).toISOString();
      product.daysIntoTerm = 1;
      product.currentPrice = product.proposedPrice || product.agreedPrice;
      product.agreedPrice = product.proposedPrice || product.agreedPrice;
      product.decision = null;
      product.decisionId = null;
      product.allowedActions = ['CHANGE_SHELF'];
      product.reConsignStatus = 'CONFIRMED';
      result = { success: true, receiptId: ids.receiptId, product };
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
  }
}
