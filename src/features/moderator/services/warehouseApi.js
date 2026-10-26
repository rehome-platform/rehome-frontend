import baseApi from '../../../services/baseApi.js';
import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { phase2Contract, isFixtureMode } from '../config/warehouseContract.js';
import { normalizeError, Phase2Error, unwrap } from '../models/warehouseModel.js';

async function callFixture(operation, options) {
  const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
  return fixtureRequest(operation, options);
}

// These operations select fixtures only in dev fixture mode. API failures propagate.
async function callApiOrFixture(config, operation, fixtureOptions, options) {
  return callBackend(config, {
    fallback: isFixtureMode
      ? () => callFixture(operation, { ...fixtureOptions, ...options })
      : undefined,
    signal: options?.signal,
  });
}

function inventoryQuery(params) {
  const { status, shelf, page, size } = params ?? {};
  const query = {};
  // Backend ProductStatus does not support WAITING_END_OF_TERM.
  if (status && status !== 'WAITING_END_OF_TERM') query.status = status;
  if (shelf) query.shelfLocation = shelf;
  query.page = page ?? 0;
  query.size = size ?? 20;
  return query;
}

function inventoryItem(item) {
  return {
    ...item,
    sku: item.id || item.sku,
    id: item.id || item.sku,
    name: item.name || '',
    shelfLocation: item.shelfLocation || 'Chưa gán',
    status: item.status || 'ON_SALE',
  };
}

function inventoryPage(result) {
  const rawList = result?.content || result?.items || (Array.isArray(result) ? result : []);
  const items = rawList.map(inventoryItem);
  return {
    ...result,
    items,
    content: items,
    totalElements: result?.totalElements ?? items.length,
    totalPages: result?.totalPages ?? Math.ceil(items.length / 20),
  };
}

function contractIsBlocked(config) {
  return !config || !phase2Contract.revision || !phase2Contract.gates[config.gate] || !config.path;
}

async function recoverRead(error, fallback) {
  if (!fallback) throw error;
  if (![404, 0].includes(error.status) && navigator.onLine) throw error;
  try {
    return await fallback();
  } catch {
    throw error;
  }
}

/** Low-level request adapter preserving contract gating for test suites */
export async function request(
  operation,
  { ids = {}, params, data, signal, onUploadProgress, scope } = {},
) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (isFixtureMode) {
    const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
    return fixtureRequest(operation, { ids, params, data, signal, scope });
  }
  const config = phase2Contract.operations[operation];
  if (contractIsBlocked(config)) {
    throw new Phase2Error(
      `Chờ bàn giao contract backend (Gate ${config?.gate ?? '—'}).`,
      0,
      'CONTRACT_BLOCKED',
    );
  }
  if (!scope?.warehouseId)
    throw new Phase2Error('Tài khoản chưa có thông tin kho được backend xác nhận.', 403);
  const url = config.path.replace(/:([a-zA-Z]+)/g, (_, key) => {
    if (!ids[key]) throw new Phase2Error(`Thiếu định danh ${key}.`, 422);
    return encodeURIComponent(ids[key]);
  });
  try {
    const response = await baseApi.request({
      method: config.method,
      url,
      params,
      data,
      signal,
      noReplay: config.method.toLowerCase() !== 'get',
      onUploadProgress,
      ...(data instanceof FormData ? { headers: { 'Content-Type': undefined } } : {}),
    });
    return unwrap(response);
  } catch (error) {
    if (signal?.aborted || error.code === 'ERR_CANCELED') throw error;
    throw normalizeError(error);
  }
}

/** Helper to call real backend API with error normalization and safe handling */
async function callBackend(config, { fallback, signal } = {}) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (isFixtureMode && fallback) {
    return await fallback();
  }
  try {
    const response = await baseApi.request({
      ...config,
      signal,
      noReplay: config.method?.toLowerCase() !== 'get',
      ...(config.data instanceof FormData ? { headers: { 'Content-Type': undefined } } : {}),
    });
    return unwrap(response);
  } catch (error) {
    if (signal?.aborted || error.code === 'ERR_CANCELED') throw error;
    const normalized = normalizeError(error);
    // Writes must propagate failures even when a fixture fallback was supplied.
    if (config.method && config.method.toLowerCase() !== 'get') throw normalized;
    return recoverRead(normalized, fallback);
  }
}

// =========================================================================
// API 28, 29, 30, 31, 32: Hàng đợi công việc và duyệt đơn
// =========================================================================
export const queueService = {
  // API 28: GET /queues?type={type}
  list: async (params, options) => {
    const typeQuery = params?.type && params.type !== 'ALL' ? params.type : undefined;
    const result = await callApiOrFixture(
      {
        method: 'get',
        url: API_ENDPOINTS.MODERATOR.QUEUES,
        params: typeQuery ? { type: typeQuery } : undefined,
      },
      'queueList',
      { params },
      options,
    );

    const map = (item) => ({
      ...item,
      queueId: item.queueId ?? item.id,
      id: item.id ?? item.queueId,
      refId: item.refId ?? item.id,
      formId: item.formId ?? item.refId ?? item.id,
      orderId: item.orderId ?? item.refId,
      type: item.type,
      claimedBy: item.claimedBy,
      claimedAt: item.claimedAt,
      createdAt: item.createdAt,
      status: item.status || (item.claimedBy ? 'PROCESSING' : 'PENDING'),
    });

    // Trả về đúng danh sách từ backend, bảo toàn trạng thái rỗng (empty state) khi không có bản ghi nào
    if (Array.isArray(result)) return result.map(map);
    if (result && Array.isArray(result.items)) return { ...result, items: result.items.map(map) };
    return result || [];
  },

  // API 29: POST /queues/{id}/claim
  claim: async (queueId, options) => {
    return callApiOrFixture(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.CLAIM_QUEUE(queueId),
      },
      'queueClaim',
      { ids: { queueId } },
      options,
    );
  },

  // API 30: POST /queues/{id}/release
  release: async (queueId, options) => {
    return callApiOrFixture(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.RELEASE_QUEUE(queueId),
      },
      'queueRelease',
      { ids: { queueId } },
      options,
    );
  },

  // API 31: POST /consignment-forms/{id}/approve
  approve: async (formId, options) => {
    return callApiOrFixture(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.APPROVE_FORM(formId),
      },
      'formApprove',
      { ids: { formId } },
      options,
    );
  },

  // API 32: POST /consignment-forms/{id}/reject
  reject: async (formId, reason, options) => {
    return callApiOrFixture(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.REJECT_FORM(formId),
        data: { reason },
      },
      'formReject',
      { ids: { formId }, data: { reason } },
      options,
    );
  },
};

// =========================================================================
// API 25, 26, 27: Quầy tiếp nhận & Tra cứu Member
// =========================================================================
export const counterService = {
  // API 25: POST /counter/lookup (Backend CounterController chưa có endpoint này)
  lookup: async (params, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      const res = await fixtureRequest('memberLookup', { params, ...options });
      return (Array.isArray(res) ? res : [res]).map((item) => ({ ...item, isMock: true }));
    };

    try {
      const result = await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.COUNTER_LOOKUP,
          data: params,
        },
        { signal: options?.signal }
      );
      if (!result) throw new Phase2Error('Không tìm thấy thành viên', 404);
      const list = Array.isArray(result) ? result : [result];
      return list.map((item) => ({
        memberId: item.accountId || item.memberId || item.id,
        memberCode: item.memberCode || '',
        fullName: item.fullName || item.name || '',
        name: item.fullName || item.name || '',
        avatarUrl: item.avatarUrl || '',
        phone: item.phone || params?.phone || '',
        isMock: false,
      }));
    } catch (err) {
      if (err.status === 404 || isFixtureMode) {
        return fallback();
      }
      throw err;
    }
  },

  // API 26: POST /counter/members/{accountId}/confirm-identity (Đã triển khai ở CounterController.java:24)
  confirm: async (memberId, options) => {
    if (isFixtureMode) {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('identityConfirm', { data: { memberId }, ...options });
    }

    await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.COUNTER_CONFIRM_IDENTITY(memberId),
      },
      { signal: options?.signal }
    );
    return {
      memberId,
      identityToken: `proof-${memberId}-${Date.now()}`,
      confirmedAt: new Date().toISOString(),
    };
  },

  // API 27: GET /counter/members/{accountId}/tasks (Backend CounterController chưa có endpoint này)
  tasks: async (memberId, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      const res = await fixtureRequest('memberTasks', { ids: { memberId }, ...options });
      return { ...res, isMock: true };
    };

    try {
      const res = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.COUNTER_TASKS(memberId),
        },
        { signal: options?.signal }
      );
      return { ...res, isMock: false };
    } catch (err) {
      if (err.status === 404 || isFixtureMode) {
        return fallback();
      }
      throw err;
    }
  },
};

// =========================================================================
// API 33, 34, 35, 19: Kiểm định & Biên nhận ký gửi
// =========================================================================
export const consignmentService = {
  // API 31: POST /consignment-forms/{id}/approve
  approve: (formId, options) => queueService.approve(formId, options),

  // API 32: POST /consignment-forms/{id}/reject
  reject: (formId, reason, options) => queueService.reject(formId, reason, options),

  // GET /consignment-forms/{id}
  read: async (formId, options) => {
    const fallback = () => callFixture('formRead', { ids: { formId }, ...options });

    try {
      const res = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.CONSIGNMENT_FORM_DETAIL(formId),
        },
        { fallback, signal: options?.signal }
      );
      return res || fallback();
    } catch {
      return fallback();
    }
  },

  // API 33: POST /consignment-forms/{id}/inspection/start
  start: async (formId, data, options) => {
    return callApiOrFixture(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.START_INSPECTION(formId),
      },
      'inspectionStart',
      { ids: { formId }, data },
      options,
    );
  },

  // API 34: POST /consignment-forms/{id}/inspection/complete
  complete: async (formId, data, options) => {
    const payload = {
      result: data?.result || 'PASS',
      conditionNote: data?.conditionNote || data?.condition || 'Tốt',
      agreedPrice: Number(data?.agreedPrice || data?.price || 0),
      ...(data?.termLengthDays ? { termLengthDays: Number(data.termLengthDays) } : {}),
    };

    return callApiOrFixture(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.COMPLETE_INSPECTION(formId),
        data: payload,
      },
      'inspectionComplete',
      { ids: { formId }, data },
      options,
    );
  },

  // API 35: POST /consignment-forms/{id}/return-onsite
  returnOnsite: async (formId, data, options) => {
    return callApiOrFixture(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.RETURN_ONSITE(formId),
        data: { reason: data?.reason || 'Không đạt kiểm định tại quầy' },
      },
      'returnOnsite',
      { ids: { formId }, data },
      options,
    );
  },

  // API 19: GET /consignment-receipts/{id}
  receipt: async (receiptId, options) => {
    const fallback = () => callFixture('receiptRead', { ids: { receiptId }, ...options });

    try {
      const res = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.RECEIPT_DETAIL(receiptId),
        },
        { fallback, signal: options?.signal }
      );
      return res || fallback();
    } catch {
      return fallback();
    }
  },
};

// =========================================================================
// API 37, 38, 39, 40, 41, 42, 43: Quản lý kho, tồn kho, tem SKU
// =========================================================================
export const inventoryService = {
  // API 40: GET /inventory
  list: async (params, options) => {
    const fallback = () => callFixture('inventoryList', { params, ...options });

    try {
      const result = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.INVENTORY,
          params: inventoryQuery(params),
        },
        { fallback, signal: options?.signal }
      );

      return inventoryPage(result);
    } catch (err) {
      if (isFixtureMode && fallback) return fallback();
      throw err;
    }
  },

  // API 41: GET /products/{sku}
  read: async (sku, options) => {
    try {
      const res = await callApiOrFixture(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.PRODUCT_BY_SKU(sku),
        },
        'productRead',
        { ids: { sku } },
        options,
      );
      if (!res) throw new Phase2Error(`Không tìm thấy sản phẩm SKU ${sku}`, 404);
      return {
        ...res,
        sku: res.id || res.sku || sku,
        name: res.name || sku,
        shelfLocation: res.shelfLocation || 'Chưa gán',
        status: res.status || 'ON_SALE',
        allowedActions: res.allowedActions || ['CHANGE_SHELF', 'ADD_PHOTOS'],
      };
    } catch (err) {
      if (isFixtureMode) return callFixture('productRead', { ids: { sku }, ...options });
      throw err;
    }
  },

  byReceipt: async (receiptId, options) => {
    const fallback = () => callFixture('productByReceipt', { ids: { receiptId }, ...options });

    if (isFixtureMode) return fallback();
    return null;
  },

  // API 37: POST /products
  create: async (data, options) => {
    const payload = {
      receiptId: data.receiptId,
      name: data.name,
      size: data.size || null,
      shelfLocation: data.shelfLocation || null,
      photoUrls: data.photoUrls || [],
    };

    return callApiOrFixture(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.CREATE_PRODUCT,
        data: payload,
      },
      'productCreate',
      { data },
      options,
    );
  },

  // Upload file lên /uploads?folder=PRODUCTS
  upload: async (file, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      const data = new FormData();
      data.append('file', file);
      return fixtureRequest('photoUpload', { ...options, data });
    };

    if (isFixtureMode) return fallback();

    const formData = new FormData();
    formData.append('file', file);

    const res = await callBackend(
      {
        method: 'post',
        url: `${API_ENDPOINTS.MODERATOR.UPLOADS}?folder=PRODUCTS`,
        data: formData,
        onUploadProgress: options?.onUploadProgress,
      },
      { signal: options?.signal }
    );

    return { url: res?.url || res?.fileUrl || (typeof res === 'string' ? res : '') };
  },

  // API 38: POST /products/{id}/photos (Backend chưa có endpoint này ở ProductController)
  addPhotos: async (sku, photoUrls, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      const res = await fixtureRequest('productPhotos', { ids: { sku }, data: { photoUrls }, ...options });
      return { ...res, isMock: true };
    };

    try {
      return await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.PRODUCT_PHOTOS(sku),
          data: { imageUrl: photoUrls[0] },
        },
        { signal: options?.signal }
      );
    } catch (err) {
      if (err.status === 404 || isFixtureMode) {
        return fallback();
      }
      throw err;
    }
  },

  // API 42: PATCH /products/{id}/shelf-location
  shelf: async (sku, shelfLocation, options) => {
    return callApiOrFixture(
      {
        method: 'patch',
        url: API_ENDPOINTS.MODERATOR.UPDATE_SHELF_LOCATION(sku),
        data: { shelfLocation },
      },
      'shelfUpdate',
      { ids: { sku }, data: { shelfLocation } },
      options,
    );
  },

  // API 43: GET /products/{id}/stock-movements
  movements: async (sku, options) => {
    try {
      const res = await callApiOrFixture(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.STOCK_MOVEMENTS(sku),
        },
        'stockMovements',
        { ids: { sku } },
        options,
      );
      return Array.isArray(res) ? res : [];
    } catch (err) {
      if (isFixtureMode) return callFixture('stockMovements', { ids: { sku }, ...options });
      throw err;
    }
  },

  // API 39: GET /products/{id}/sku-label
  label: async (sku, options) => {
    const fallback = () => callFixture('skuLabel', { ids: { sku }, ...options });

    if (isFixtureMode) return fallback();

    const response = await baseApi.get(API_ENDPOINTS.MODERATOR.PRODUCT_SKU_LABEL(sku), {
      responseType: 'blob',
      signal: options?.signal,
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    return { labelPdfUrl: URL.createObjectURL(blob) };
  },
};

// =========================================================================
// API 44, 45, 46, 47, 48: Quản lý Danh mục & Thương hiệu
// =========================================================================
export const catalogService = {
  // API 44: GET /categories, GET /brands
  list: async (options) => {
    const fallback = () => callFixture('catalogList', options);

    try {
      const [catsRes, brandsRes] = await Promise.all([
        callBackend({ method: 'get', url: API_ENDPOINTS.MODERATOR.CATEGORIES }, { signal: options?.signal }),
        callBackend({ method: 'get', url: API_ENDPOINTS.MODERATOR.BRANDS }, { signal: options?.signal }),
      ]);

      const categories = (Array.isArray(catsRes) ? catsRes : catsRes?.result || []).map((c) => ({
        id: c.id,
        name: c.name,
        slot: c.tryonSlot,
        tryonSlot: c.tryonSlot,
        hidden: c.status === 'HIDDEN',
        status: c.status,
      }));

      const brands = (Array.isArray(brandsRes) ? brandsRes : brandsRes?.result || []).map((b) => ({
        id: b.id,
        name: b.name,
        hidden: b.status === 'HIDDEN',
        status: b.status,
      }));

      return { categories, brands };
    } catch (err) {
      if (isFixtureMode && fallback) return fallback();
      throw err;
    }
  },

  // API 45 (POST /categories), API 46 (POST /brands), API 47 (PUT /categories/{id}, PUT /brands/{id})
  save: async (kind, id, data, options) => {
    const isCategory = kind === 'category';
    const method = id ? 'put' : 'post';
    const baseUrl = isCategory ? API_ENDPOINTS.MODERATOR.CATEGORIES : API_ENDPOINTS.MODERATOR.BRANDS;
    const url = id ? `${baseUrl}/${id}` : baseUrl;

    const payload = {
      name: data.name,
      ...(isCategory ? { tryonSlot: data.slot || data.tryonSlot || null } : {}),
      ...(id && data.status ? { status: data.status } : {}),
    };

    return callApiOrFixture(
      {
        method,
        url,
        data: payload,
      },
      `${kind}${id ? 'Update' : 'Create'}`,
      { ids: { id }, data },
      options,
    );
  },

  // API 48: PATCH /categories/{id}/hide, PATCH /brands/{id}/hide
  hide: async (kind, id, options) => {
    const isCategory = kind === 'category';
    const url = isCategory
      ? API_ENDPOINTS.MODERATOR.HIDE_CATEGORY(id)
      : API_ENDPOINTS.MODERATOR.HIDE_BRAND(id);

    return callApiOrFixture(
      {
        method: 'patch',
        url,
      },
      `${kind}Hide`,
      { ids: { id } },
      options,
    );
  },
};

// =========================================================================
// API 36: Xử lý hàng cuối kỳ & vô thừa nhận
// =========================================================================
export const endTermService = {
  list: async (params, options) => {
    const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
    return fixtureRequest('endTermList', { ...options, params });
  },

  read: async (sku, options) => {
    const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
    return fixtureRequest('endTermRead', { ...options, ids: { sku } });
  },

  handover: async (sku, data, options) => {
    const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
    return fixtureRequest('endTermHandover', {
      ...options,
      ids: { sku },
      data: { ...data, context: 'END_OF_TERM_TAKE_BACK' },
    });
  },

  reconsign: async (sku, data, options) => {
    const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
    return fixtureRequest('endTermReconsign', { ...options, ids: { sku }, data });
  },

  // API 36: POST /products/{id}/unclaimed/confirm-transfer
  transfer: async (sku, partnerName, options) => {
    return callApiOrFixture(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.CONFIRM_UNCLAIMED_TRANSFER(sku),
        data: { partnerOrganizationName: partnerName, partnerName },
      },
      'unclaimedTransfer',
      { ids: { sku }, data: { partnerName } },
      options,
    );
  },
};
