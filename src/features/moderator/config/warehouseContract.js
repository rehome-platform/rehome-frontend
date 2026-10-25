/**
 * Integration hand-off, NOT an assertion that the backend implements these APIs.
 * Replace null paths with reviewed contracts and record approval before enabling a gate.
 * Auth/Admin endpoints are intentionally independent of this manifest.
 */
export const phase2Contract = {
  revision: null,
  gates: { A: false, B: false, C: false, D: false },
  operations: {
    queueList: { gate: 'A', method: 'get', path: '/api/v1/queues' },
    queueClaim: { gate: 'A', method: 'post', path: null },
    queueRelease: { gate: 'A', method: 'post', path: null },
    formRead: { gate: 'A', method: 'get', path: null },
    formApprove: { gate: 'A', method: 'post', path: null },
    formReject: { gate: 'A', method: 'post', path: null },
    memberLookup: { gate: 'A', method: 'get', path: null },
    identityConfirm: { gate: 'A', method: 'post', path: null },
    memberTasks: { gate: 'A', method: 'get', path: null },
    inspectionStart: { gate: 'B', method: 'post', path: null },
    inspectionComplete: { gate: 'B', method: 'post', path: null },
    returnOnsite: { gate: 'B', method: 'post', path: null },
    receiptRead: { gate: 'B', method: 'get', path: null },
    productCreate: { gate: 'C', method: 'post', path: '/api/v1/products' },
    productByReceipt: { gate: 'C', method: 'get', path: null },
    inventoryList: { gate: 'C', method: 'get', path: null },
    productRead: { gate: 'C', method: 'get', path: null },
    productPhotos: { gate: 'C', method: 'post', path: null },
    photoUpload: { gate: 'C', method: 'post', path: null },
    shelfUpdate: { gate: 'C', method: 'patch', path: null },
    stockMovements: { gate: 'C', method: 'get', path: '/api/v1/products/:sku/stock-movements' },
    skuLabel: { gate: 'C', method: 'get', path: '/api/v1/products/:sku/sku-label' },
    catalogList: { gate: 'D', method: 'get', path: null },
    categoryCreate: { gate: 'D', method: 'post', path: null },
    categoryUpdate: { gate: 'D', method: 'patch', path: null },
    categoryHide: { gate: 'D', method: 'post', path: null },
    brandCreate: { gate: 'D', method: 'post', path: null },
    brandUpdate: { gate: 'D', method: 'patch', path: null },
    brandHide: { gate: 'D', method: 'post', path: null },
    endTermList: { gate: 'D', method: 'get', path: null },
    endTermRead: { gate: 'D', method: 'get', path: null },
    endTermHandover: { gate: 'D', method: 'post', path: null },
    endTermReconsign: { gate: 'D', method: 'post', path: null },
    unclaimedTransfer: {
      gate: 'D',
      method: 'post',
      path: '/api/v1/products/:sku/unclaimed/confirm-transfer',
    },
  },
  // These are populated ONLY from reviewed BE configuration/enums.
  options: {
    inspectionReturnReasons: [],
    categorySlots: [],
    inventoryStatuses: [],
    termLengthDays: [],
  },
};

export const isFixtureMode = import.meta.env.DEV && import.meta.env.VITE_PHASE2_MOCK === 'true';
