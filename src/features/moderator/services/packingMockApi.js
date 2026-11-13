/**
 * ReHome - Packing & Shipment Mock API Service (Phase 4 / APIs 68-72)
 *
 * Cung cấp Mock API chuẩn RESTful cho các endpoint Moderator đóng gói và tạo vận đơn:
 * - API 68: GET /queues?type=PACKING (Lấy hàng đợi đóng gói tại kho)
 * - API 29: POST /queues/{id}/claim (Nhận việc đóng gói)
 * - API 30: POST /queues/{id}/release (Nhả việc đóng gói)
 * - API 69: POST /orders/{id}/pack/scan (Quét mã SKU đối chiếu)
 * - API 70: POST /orders/{id}/shipment (Tạo vận đơn GHN, dequeue khỏi hàng đợi)
 * - API 72: POST /counter/handover (Bàn giao tại quầy cho Member)
 */

const delay = (ms = 40) =>
  typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
    ? Promise.resolve()
    : new Promise((resolve) => setTimeout(resolve, ms));

// Dữ liệu hàng đợi đóng gói mẫu ban đầu (Dynamic Store)
const INITIAL_PACKING_QUEUE = [
  {
    id: 'queue-pk-01',
    queueId: 'queue-pk-01',
    refId: 'DH-00244',
    orderId: 'DH-00244',
    orderNo: 'DH-00244',
    type: 'PACKING',
    typeLabel: 'Đóng gói đơn hàng',
    status: 'PAID',
    buyerName: 'Ngô Hải F',
    name: 'Ngô Hải F',
    itemCount: 2,
    claimedBy: null,
    claimedAt: null,
    warehouseId: 'warehouse-a',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    hours: 3,
  },
  {
    id: 'queue-pk-02',
    queueId: 'queue-pk-02',
    refId: 'DH-00239',
    orderId: 'DH-00239',
    orderNo: 'DH-00239',
    type: 'PACKING',
    typeLabel: 'Đóng gói đơn hàng',
    status: 'PAID',
    buyerName: 'Vũ Thanh H',
    name: 'Vũ Thanh H',
    itemCount: 3,
    claimedBy: null,
    claimedAt: null,
    warehouseId: 'warehouse-a',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    hours: 5,
  },
  {
    id: 'queue-pk-03',
    queueId: 'queue-pk-03',
    refId: 'DH-00251',
    orderId: 'DH-00251',
    orderNo: 'DH-00251',
    type: 'PACKING',
    typeLabel: 'Đóng gói đơn hàng',
    status: 'PAID',
    buyerName: 'Trần Minh K',
    name: 'Trần Minh K',
    itemCount: 1,
    claimedBy: null,
    claimedAt: null,
    warehouseId: 'warehouse-a',
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    hours: 1,
  },
];

// Chi tiết đơn hàng đóng gói trong session
const INITIAL_PACKING_ORDERS = {
  'DH-00244': {
    id: 'DH-00244',
    orderId: 'DH-00244',
    orderNo: 'DH-00244',
    status: 'PAID',
    warehouseId: 'warehouse-a',
    warehouseName: 'Kho Quận 7',
    claimedBy: 'mod-a',
    claimExpiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    recipientName: 'Ngô Hải F',
    recipientPhone: '0912 456 142',
    shippingAddress: '142 Nguyễn Thị Thập, P. Tân Phú, Quận 7, TP.HCM',
    buyerNote: 'Giao giờ hành chính, gọi trước khi tới.',
    packageWeight: 820,
    packageDimensions: '30 x 22 x 10 cm',
    shipperNote: 'Giao giờ hành chính, gọi trước khi tới.',
    subtotal: 425000,
    shippingFee: 32000,
    totalAmount: 457000,
    ghnTrackingCode: null,
    expectedDeliveryDate: null,
    shipmentOutcome: 'NOT_CREATED',
    allowedActions: ['SCAN', 'CREATE_SHIPMENT'],
    items: [
      {
        productId: 'RH-A7F31K',
        name: 'Áo sơ mi linen',
        brand: 'Uniqlo',
        size: 'M',
        condition: 'Tốt',
        priceAtOrder: 185000,
        photoUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300',
        scanned: false,
      },
      {
        productId: 'RH-C2M08P',
        name: 'Quần jeans ống đứng',
        brand: "Levi's",
        size: '29',
        condition: 'Khá',
        priceAtOrder: 240000,
        photoUrl: 'https://images.unsplash.com/photo-1542272604-780c96856592?w=300',
        scanned: false,
      },
    ],
    scannedProductIds: [],
    scannedCount: 0,
    totalCount: 2,
  },
  'DH-00239': {
    id: 'DH-00239',
    orderId: 'DH-00239',
    orderNo: 'DH-00239',
    status: 'PAID',
    warehouseId: 'warehouse-a',
    warehouseName: 'Kho Quận 7',
    claimedBy: null,
    claimExpiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    recipientName: 'Vũ Thanh H',
    recipientPhone: '0988 123 456',
    shippingAddress: '45 Lê Văn Lương, P. Tân Hưng, Quận 7, TP.HCM',
    buyerNote: 'Hàng dễ vỡ, bọc xốp cẩn thận giúp mình.',
    packageWeight: 1200,
    packageDimensions: '35 x 25 x 15 cm',
    shipperNote: 'Hàng dễ vỡ, bọc xốp cẩn thận.',
    subtotal: 610000,
    shippingFee: 35000,
    totalAmount: 645000,
    ghnTrackingCode: null,
    expectedDeliveryDate: null,
    shipmentOutcome: 'NOT_CREATED',
    allowedActions: ['SCAN', 'CREATE_SHIPMENT'],
    items: [
      {
        productId: 'RH-K9B47T',
        name: 'Áo khoác denim',
        brand: 'Zara',
        size: 'L',
        condition: 'Tốt',
        priceAtOrder: 290000,
        photoUrl: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=300',
        scanned: false,
      },
      {
        productId: 'RH-E4N12W',
        name: 'Đầm hoa nhí vintage',
        brand: 'Mango',
        size: 'S',
        condition: 'Mới 99%',
        priceAtOrder: 320000,
        photoUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=300',
        scanned: false,
      },
    ],
    scannedProductIds: [],
    scannedCount: 0,
    totalCount: 2,
  },
};

// Cơ sở dữ liệu sản phẩm trong kho phục vụ kiểm tra sai món (DG-03-SaiMon)
const INVENTORY_CATALOG = {
  'RH-K9B47T': {
    productId: 'RH-K9B47T',
    name: 'Áo khoác denim',
    brand: 'Zara',
    size: 'L',
    targetOrderId: 'DH-00239',
  },
  'RH-E4N12W': {
    productId: 'RH-E4N12W',
    name: 'Đầm hoa nhí vintage',
    brand: 'Mango',
    size: 'S',
    targetOrderId: 'DH-00239',
  },
  'RH-M1P88X': {
    productId: 'RH-M1P88X',
    name: 'Chân váy xếp ly',
    brand: 'Uniqlo',
    size: 'M',
    targetOrderId: 'DH-00251',
  },
};

// In-Memory Dynamic Store
let queueStore = structuredClone(INITIAL_PACKING_QUEUE);
let ordersStore = structuredClone(INITIAL_PACKING_ORDERS);

export function resetSessionStore() {
  queueStore = structuredClone(INITIAL_PACKING_QUEUE);
  ordersStore = structuredClone(INITIAL_PACKING_ORDERS);
}

export const resetPackingSessionStore = resetSessionStore;

export const packingMockApi = {
  /**
   * API 68: GET /queues?type=PACKING
   */
  listQueue: async (params = {}) => {
    await delay();
    let result = [...queueStore];
    if (params.claim === 'mine' && params.userId) {
      result = result.filter((item) => item.claimedBy === params.userId);
    } else if (params.claim === 'unclaimed') {
      result = result.filter((item) => !item.claimedBy);
    }
    return result;
  },

  /**
   * API 29: POST /queues/{id}/claim
   */
  claimQueue: async (queueId, userId = 'mod-a') => {
    await delay();
    const item = queueStore.find((q) => q.queueId === queueId || q.id === queueId || q.refId === queueId);
    if (!item) throw { status: 404, message: 'Công việc không tồn tại.' };
    if (item.claimedBy && item.claimedBy !== userId) {
      throw { status: 409, code: 'QUEUE_ITEM_ALREADY_CLAIMED', message: 'Công việc đã được người khác nhận.' };
    }
    item.claimedBy = userId;
    item.claimedAt = new Date().toISOString();
    return { id: item.id, claimedBy: userId, claimedAt: item.claimedAt };
  },

  /**
   * API 30: POST /queues/{id}/release
   */
  releaseQueue: async (queueId, userId = 'mod-a') => {
    await delay();
    const item = queueStore.find((q) => q.queueId === queueId || q.id === queueId || q.refId === queueId);
    if (!item) throw { status: 404, message: 'Công việc không tồn tại.' };
    if (item.claimedBy && item.claimedBy !== userId) {
      throw { status: 403, code: 'QUEUE_ITEM_NOT_CLAIMED_BY_YOU', message: 'Bạn không có quyền nhả việc này.' };
    }
    item.claimedBy = null;
    item.claimedAt = null;
    return { id: item.id, status: 204 };
  },

  /**
   * Đọc chi tiết đơn đóng gói (Fallback cho GET /orders/:id)
   */
  getOrderDetail: async (orderId, scope = {}) => {
    await delay();
    const id = String(orderId || '').trim();
    if (ordersStore[id]) {
      if (scope?.warehouseId) ordersStore[id].warehouseId = scope.warehouseId;
      if (scope?.userId) ordersStore[id].claimedBy = scope.userId;
      return structuredClone(ordersStore[id]);
    }
    // Tạo đơn động nếu orderId mới
    const dynamicOrder = {
      id,
      orderId: id,
      orderNo: id.startsWith('DH-') ? id : `DH-${id.slice(0, 5)}`,
      status: 'PAID',
      warehouseId: scope?.warehouseId || 'warehouse-a',
      warehouseName: 'Kho Quận 7',
      claimedBy: scope?.userId || 'mod-a',
      claimExpiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      recipientName: 'Người mua ReHome',
      recipientPhone: '0912 345 678',
      shippingAddress: '123 Nguyễn Văn Linh, P. Tân Phong, Quận 7, TP.HCM',
      buyerNote: 'Giao giờ hành chính, gọi trước khi tới.',
      packageWeight: 800,
      packageDimensions: '30 x 20 x 10 cm',
      shipperNote: 'Giao giờ hành chính, gọi trước khi tới.',
      subtotal: 350000,
      shippingFee: 30000,
      totalAmount: 380000,
      ghnTrackingCode: null,
      expectedDeliveryDate: null,
      shipmentOutcome: 'NOT_CREATED',
      allowedActions: ['SCAN', 'CREATE_SHIPMENT'],
      items: [
        {
          productId: `RH-${id.slice(0, 4)}A`,
          name: 'Sản phẩm thời trang ký gửi',
          brand: 'Zara',
          size: 'M',
          condition: 'Tốt',
          priceAtOrder: 350000,
          photoUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300',
          scanned: false,
        },
      ],
      scannedProductIds: [],
      scannedCount: 0,
      totalCount: 1,
    };
    ordersStore[id] = dynamicOrder;
    return structuredClone(dynamicOrder);
  },

  /**
   * API 69: POST /orders/{id}/pack/scan
   */
  scanSku: async (orderId, productId) => {
    await delay();
    const order = ordersStore[orderId] || (await packingMockApi.getOrderDetail(orderId));
    const cleanSku = String(productId || '').trim();

    const matchedItem = order.items.find(
      (item) => item.productId.toLowerCase() === cleanSku.toLowerCase()
    );

    if (matchedItem) {
      if (!matchedItem.scanned) {
        matchedItem.scanned = true;
        if (!order.scannedProductIds.includes(matchedItem.productId)) {
          order.scannedProductIds.push(matchedItem.productId);
        }
      }
      order.scannedCount = order.scannedProductIds.length;
      return {
        matched: true,
        productId: matchedItem.productId,
        scannedCount: order.scannedCount,
        totalCount: order.totalCount,
        items: order.items,
      };
    }

    return {
      matched: false,
      productId: cleanSku,
      scannedCount: order.scannedCount,
      totalCount: order.totalCount,
      wrongItem: INVENTORY_CATALOG[cleanSku] || null,
    };
  },

  /**
   * API 70: POST /orders/{id}/shipment
   */
  createShipment: async (orderId, payload = {}) => {
    await delay();
    const order = ordersStore[orderId] || (await packingMockApi.getOrderDetail(orderId));

    const trackingCode =
      payload?.trackingCode ||
      (orderId === 'DH-00244'
        ? 'GHN5LK9P2XQ'
        : `GHN${Math.random().toString(36).substring(2, 9).toUpperCase()}`);
    const deliveryDate = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

    order.ghnTrackingCode = trackingCode;
    order.expectedDeliveryDate = deliveryDate;
    order.status = 'SHIPPING';
    order.shipmentOutcome = 'CREATED';
    order.allowedActions = [];
    if (payload.weightGrams) order.packageWeight = payload.weightGrams;
    if (payload.dimensions) order.packageDimensions = payload.dimensions;
    if (payload.shipperNote) order.shipperNote = payload.shipperNote;

    // Tự động dequeue đơn này khỏi hàng đợi PACKING (API 68)
    queueStore = queueStore.filter((q) => q.refId !== orderId && q.orderId !== orderId);

    return {
      id: orderId,
      orderId,
      status: 'SHIPPING',
      ghnTrackingCode: trackingCode,
      expectedDeliveryDate: deliveryDate,
    };
  },

  /**
   * API 72: POST /counter/handover
   */
  handover: async (data = {}) => {
    await delay();
    if (!data.accountId || !data.refId || !data.context) {
      throw { status: 400, message: 'Dữ liệu bàn giao tại quầy không hợp lệ.' };
    }
    return { success: true, message: 'Đã bàn giao' };
  },

  /**
   * Tra cứu thông tin món sai để hiển thị modal cảnh báo (DG-03-SaiMon)
   */
  findWrongItemInfo: (sku) => {
    const cleanSku = String(sku || '').trim();
    return (
      INVENTORY_CATALOG[cleanSku] || {
        productId: cleanSku,
        name: 'Món hàng không xác định',
        brand: 'Khác',
        size: '—',
        targetOrderId: 'Không rõ đơn',
      }
    );
  },
};
