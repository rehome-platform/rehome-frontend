/**
 * Phase 2 routes verified against the Spring controllers in re-backend.
 * A path does not grant access: form/receipt reads still enforce backend ownership.
 * Composite or unavailable operations are explicit so adapters never invent routes.
 */
export const phase2Contract = {
  revision: '1.0',
  gates: { A: true, B: true, C: true, D: true },
  operations: {
    queueList: { gate: 'A', method: 'get', path: '/queues' },
    queueClaim: { gate: 'A', method: 'post', path: '/queues/:queueId/claim' },
    queueRelease: { gate: 'A', method: 'post', path: '/queues/:queueId/release' },
    formRead: {
      gate: 'A', method: 'get', path: '/consignment-forms/:formId',
      limitation: 'Backend currently restricts this read to the owning Member.',
    },
    formApprove: { gate: 'A', method: 'post', path: '/consignment-forms/:formId/approve' },
    formReject: { gate: 'A', method: 'post', path: '/consignment-forms/:formId/reject' },
    memberLookup: { gate: 'A', method: 'post', path: '/counter/lookup' },
    // memberId is the accountId accepted by CounterController.
    identityConfirm: { gate: 'A', method: 'post', path: '/counter/members/:memberId/confirm-identity' },
    memberTasks: { gate: 'A', method: 'get', path: '/counter/members/:memberId/tasks' },
    inspectionStart: { gate: 'B', method: 'post', path: '/consignment-forms/:formId/inspection/start' },
    inspectionComplete: { gate: 'B', method: 'post', path: '/consignment-forms/:formId/inspection/complete' },
    returnOnsite: { gate: 'B', method: 'post', path: '/consignment-forms/:formId/return-onsite' },
    receiptRead: {
      gate: 'B', method: 'get', path: '/consignment-receipts/:receiptId',
      limitation: 'Backend currently restricts this read to the owning Member.',
    },
    receiptPdf: { gate: 'B', method: 'get', path: '/consignment-receipts/:receiptId/pdf', responseType: 'blob' },
    productCreate: { gate: 'C', method: 'post', path: '/products' },
    productByReceipt: {
      gate: 'C', method: 'get', path: null, supported: false,
      reason: 'Backend chưa hỗ trợ tra cứu sản phẩm theo biên nhận.',
    },
    inventoryList: { gate: 'C', method: 'get', path: '/inventory' },
    productRead: { gate: 'C', method: 'get', path: '/products/:sku' },
    productPhotos: {
      gate: 'C', method: 'post', path: null, supported: false,
      reason: 'Backend chưa hỗ trợ thêm ảnh vào sản phẩm đã nhập kho.',
    },
    photoUpload: { gate: 'C', method: 'post', path: '/uploads', params: { folder: 'PRODUCTS' } },
    shelfUpdate: { gate: 'C', method: 'patch', path: '/products/:sku/shelf-location' },
    stockMovements: { gate: 'C', method: 'get', path: '/products/:sku/stock-movements' },
    skuLabel: { gate: 'C', method: 'get', path: '/products/:sku/sku-label', responseType: 'blob' },
    catalogList: {
      gate: 'D', method: 'get', path: null, supported: false,
      reason: 'Dùng catalogService.list để tổng hợp /categories và /brands.',
    },
    categoryList: { gate: 'D', method: 'get', path: '/categories' },
    brandList: { gate: 'D', method: 'get', path: '/brands' },
    categoryCreate: { gate: 'D', method: 'post', path: '/categories' },
    categoryUpdate: { gate: 'D', method: 'put', path: '/categories/:id' },
    categoryHide: { gate: 'D', method: 'patch', path: '/categories/:id/hide' },
    brandCreate: { gate: 'D', method: 'post', path: '/brands' },
    brandUpdate: { gate: 'D', method: 'put', path: '/brands/:id' },
    brandHide: { gate: 'D', method: 'patch', path: '/brands/:id/hide' },
    endTermList: { gate: 'D', method: 'get', path: '/inventory', params: { status: 'UNCLAIMED' } },
    endTermRead: { gate: 'D', method: 'get', path: '/products/:sku' },
    endTermHandover: { gate: 'D', method: 'post', path: '/counter/handover' },
    endTermReconsign: {
      gate: 'D', method: 'post', path: null, supported: false,
      reason: 'Backend chưa hỗ trợ tái ký gửi tại quầy.',
    },
    unclaimedTransfer: {
      gate: 'D',
      method: 'post',
      path: '/products/:sku/unclaimed/confirm-transfer',
    },
  },
  // Free-form return reasons and configurable term lengths stay empty until integrated.
  options: {
    inspectionReturnReasons: [],
    categorySlots: ['TOP', 'BOTTOM', 'DRESS'],
    inventoryStatuses: [
      'ON_SALE',
      'RESERVED',
      'SOLD',
      'WITHDRAWN',
      'UNCLAIMED',
      'DONATED',
      'DESTROYED',
    ],
    termLengthDays: [],
  },
};

// Explicit opt-in for local fixture development; API mode never falls back to fixtures.
export const isFixtureMode = import.meta.env.DEV && import.meta.env.VITE_PHASE2_MOCK === 'true';
