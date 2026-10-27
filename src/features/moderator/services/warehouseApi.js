import baseApi from '../../../services/baseApi.js';
import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { phase2Contract, isFixtureMode } from '../config/warehouseContract.js';
import {
  formatStockMovement,
  normalizeConsignmentForm,
  normalizeError,
  Phase2Error,
  unwrap,
} from '../models/warehouseModel.js';

/** Contract adapter for operations with a verified backend endpoint. */
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
  if (!config || config.supported === false) {
    throw new Phase2Error(config?.reason || 'Backend chưa hỗ trợ thao tác này.', 501, 'OPERATION_UNSUPPORTED');
  }
  if (!config || !phase2Contract.revision || !phase2Contract.gates[config.gate] || !config.path) {
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
      params: config.params ? { ...config.params, ...params } : params,
      data,
      signal,
      ...(config.responseType ? { responseType: config.responseType } : {}),
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
    // Fixture data is selected only before a request in explicit development mode.
    // A failed real request must always remain a failure, including reads and 404s.
    throw normalizeError(error);
  }
}

// =========================================================================
// API 28, 29, 30, 31, 32: Hàng đợi công việc và duyệt đơn
// =========================================================================
export const queueService = {
  // API 28: GET /queues?type={type}
  list: async (params, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('queueList', { params, ...options });
    };

    const typeQuery = params?.type && params.type !== 'ALL' ? params.type : undefined;
    const result = await callBackend(
      {
        method: 'get',
        url: API_ENDPOINTS.MODERATOR.QUEUES,
        params: typeQuery ? { type: typeQuery } : undefined,
      },
      { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
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
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('queueClaim', { ids: { queueId }, ...options });
    };

    return callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.CLAIM_QUEUE(queueId),
      },
      { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
    );
  },

  // API 30: POST /queues/{id}/release
  release: async (queueId, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('queueRelease', { ids: { queueId }, ...options });
    };

    return callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.RELEASE_QUEUE(queueId),
      },
      { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
    );
  },

  // API 31: POST /consignment-forms/{id}/approve
  approve: async (formId, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('formApprove', { ids: { formId }, ...options });
    };

    return callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.APPROVE_FORM(formId),
      },
      { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
    );
  },

  // API 32: POST /consignment-forms/{id}/reject
  reject: async (formId, reason, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('formReject', { ids: { formId }, data: { reason }, ...options });
    };

    return callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.REJECT_FORM(formId),
        data: { reason },
      },
      { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
    );
  },
};

// =========================================================================
// API 25, 26, 27: Quầy tiếp nhận & Tra cứu Member
// =========================================================================
export const counterService = {
  // API 25: POST /counter/lookup
  lookup: async (params, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      const res = await fixtureRequest('memberLookup', { params, ...options });
      return (Array.isArray(res) ? res : [res]).map((item) => ({ ...item, isMock: true }));
    };

    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (isFixtureMode) return fallback();
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
    const confirmedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    return {
      memberId,
      accountId: memberId,
      identityToken: `proof-${memberId}-${Date.now()}`,
      confirmedAt,
      expiresAt,
    };
  },

  // API 27: GET /counter/members/{accountId}/tasks
  tasks: async (memberId, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      const res = await fixtureRequest('memberTasks', { ids: { memberId }, ...options });
      return { ...res, isMock: true };
    };

    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (isFixtureMode) return fallback();
    const res = await callBackend(
      {
        method: 'get',
        url: API_ENDPOINTS.MODERATOR.COUNTER_TASKS(memberId),
      },
      { signal: options?.signal }
    );
    return { ...res, isMock: false };
  },

  // API 72: POST /counter/handover (Context: ITEM_WITHDRAWAL / END_OF_TERM_TAKE_BACK)
  handover: async ({ accountId, refId, context }, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('endTermHandover', { data: { accountId, refId, context }, ...options });
    };

    return callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.COUNTER_HANDOVER,
        data: { accountId, refId, context },
      },
      { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
    );
  },
};

// =========================================================================
// =========================================================================
// API 31, 32, 33, 34, 35, 19: Thẩm định & Kiểm định & Biên nhận ký gửi
// =========================================================================
export const consignmentService = {
  // API 31: POST /consignment-forms/{id}/approve
  approve: (formId, options) => queueService.approve(formId, options),

  // API 32: POST /consignment-forms/{id}/reject
  reject: (formId, reason, options) => queueService.reject(formId, reason, options),

  // API 17: GET /consignment-forms/{id}
  read: async (formId, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      const res = await fixtureRequest('formRead', { ids: { formId }, ...options });
      return normalizeConsignmentForm(res, options?.scope?.userId);
    };

    const res = await callBackend(
      {
        method: 'get',
        url: API_ENDPOINTS.MODERATOR.CONSIGNMENT_FORM_DETAIL(formId),
      },
      { fallback, signal: options?.signal }
    );
    return normalizeConsignmentForm(res, options?.scope?.userId);
  },

  // API 33: POST /consignment-forms/{id}/inspection/start
  start: async (formId, data, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('inspectionStart', { ids: { formId }, data, ...options });
    };

    return callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.START_INSPECTION(formId),
      },
      { fallback, signal: options?.signal }
    );
  },

  // API 34: POST /consignment-forms/{id}/inspection/complete
  complete: async (formId, data, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('inspectionComplete', { ids: { formId }, data, ...options });
    };

    const payload = {
      result: data?.result || 'PASS',
      conditionNote: data?.conditionNote || data?.condition || 'Tốt',
      agreedPrice: Number(data?.agreedPrice || data?.price || 0),
      ...(data?.termLengthDays ? { termLengthDays: Number(data.termLengthDays) } : {}),
    };

    return callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.COMPLETE_INSPECTION(formId),
        data: payload,
      },
      { fallback, signal: options?.signal }
    );
  },

  // API 35: POST /consignment-forms/{id}/return-onsite
  returnOnsite: async (formId, data, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('returnOnsite', { ids: { formId }, data, ...options });
    };

    const reason = data?.note?.trim()
      ? (data?.reason ? `${data.reason}: ${data.note.trim()}` : data.note.trim())
      : (data?.reason || 'Không đạt kiểm định tại quầy');

    const payload = {
      result: data?.result || 'FAIL',
      reason,
    };

    return callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.RETURN_ONSITE(formId),
        data: payload,
      },
      { fallback, signal: options?.signal }
    );
  },

  // API 19: GET /consignment-receipts/{id}
  receipt: async (receiptId, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('receiptRead', { ids: { receiptId }, ...options });
    };

    return callBackend(
      {
        method: 'get',
        url: API_ENDPOINTS.MODERATOR.RECEIPT_DETAIL(receiptId),
      },
      { fallback, signal: options?.signal }
    );
  },

  // API 19 (F-023): GET /consignment-receipts/{id}/pdf
  pdf: async (receiptId, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('receiptPdf', { ids: { receiptId }, ...options });
    };

    if (isFixtureMode) return fallback();

    const response = await baseApi.get(API_ENDPOINTS.MODERATOR.RECEIPT_PDF(receiptId), {
      responseType: 'blob',
      signal: options?.signal,
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    return { pdfUrl: URL.createObjectURL(blob) };
  },
};

// =========================================================================
// API 37, 38, 39, 40, 41, 42, 43: Quản lý kho, tồn kho, tem SKU
// =========================================================================
export const inventoryService = {
  // API 40: GET /inventory
  list: async (params, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('inventoryList', { params, ...options });
    };

    try {
      // Backend ProductStatus enum does not support WAITING_END_OF_TERM
      const validStatus =
        params?.status && params.status !== 'WAITING_END_OF_TERM' ? params.status : undefined;
      const queryParams = {
        ...(validStatus ? { status: validStatus } : {}),
        ...((params?.shelfLocation || params?.shelf) ? { shelfLocation: params.shelfLocation || params.shelf } : {}),
        page: params?.page ?? 0,
        size: params?.size ?? 20,
      };

      const result = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.INVENTORY,
          params: queryParams,
        },
        { fallback, signal: options?.signal }
      );

      const rawList = result?.content || result?.items || (Array.isArray(result) ? result : []);
      let items = rawList.map((item) => ({
        ...item,
        sku: item.id || item.sku,
        id: item.id || item.sku,
        name: item.name || '',
        shelfLocation: item.shelfLocation || 'Chưa gán',
        status: item.status || 'ON_SALE',
      }));

      if (params?.sku && String(params.sku).trim()) {
        const filterSku = String(params.sku).trim().toLowerCase();
        items = items.filter(
          (it) => it.sku?.toLowerCase().includes(filterSku) || it.name?.toLowerCase().includes(filterSku),
        );
      }

      return {
        ...result,
        items,
        content: items,
        totalElements: result?.totalElements ?? items.length,
        totalPages: result?.totalPages ?? Math.ceil(items.length / 20),
      };
    } catch (err) {
      if (isFixtureMode && fallback) return fallback();
      throw err;
    }
  },

  // API 41: GET /products/{sku}
  read: async (sku, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('productRead', { ids: { sku }, ...options });
    };

    try {
      const res = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.PRODUCT_BY_SKU(sku),
        },
        { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
      );
      if (!res) throw new Phase2Error(`Không tìm thấy sản phẩm SKU ${sku}`, 404);
      return {
        ...res,
        sku: res.id || res.sku || sku,
        name: res.name || sku,
        shelfLocation: res.shelfLocation || 'Chưa gán',
        status: res.status || 'ON_SALE',
        allowedActions: res.allowedActions || ['CHANGE_SHELF'],
      };
    } catch (err) {
      if (isFixtureMode && fallback) return fallback();
      throw err;
    }
  },

  byReceipt: async (receiptId, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('productByReceipt', { ids: { receiptId }, ...options });
    };

    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (isFixtureMode) return fallback();
    throw new Phase2Error('Backend chưa hỗ trợ tra cứu sản phẩm theo biên nhận.', 501, 'OPERATION_UNSUPPORTED');
  },

  // API 37: POST /products
  create: async (data, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('productCreate', { data, ...options });
    };

    const receiptId = data?.receiptId || data?.id;
    if (!receiptId) {
      throw new Phase2Error('receiptId là bắt buộc.', 400);
    }

    const payload = {
      receiptId,
      name: String(data?.name || '').trim(),
      size: data?.size ? String(data.size).trim() : null,
      shelfLocation: data?.shelfLocation ? String(data.shelfLocation).trim() : null,
      photoUrls: Array.isArray(data?.photoUrls) ? data.photoUrls : [],
    };

    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.CREATE_PRODUCT,
        data: payload,
      },
      { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
    );

    return {
      ...res,
      sku: res?.id || res?.sku,
      id: res?.id || res?.sku,
      name: res?.name || payload.name,
      status: res?.status || 'ON_SALE',
    };
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

    const url = res?.url || res?.fileUrl || (typeof res === 'string' ? res : '');
    return { url, ...res };
  },

  // Additional product photos have no backend endpoint; upload at creation is supported.
  addPhotos: async (sku, photoUrls, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      const res = await fixtureRequest('productPhotos', { ids: { sku }, data: { photoUrls }, ...options });
      return { ...res, isMock: true };
    };

    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (isFixtureMode) return fallback();
    throw new Phase2Error('Backend chưa hỗ trợ thêm ảnh cho sản phẩm đã nhập kho.', 501, 'OPERATION_UNSUPPORTED');
  },

  // API 42: PATCH /products/{id}/shelf-location
  shelf: async (sku, shelfLocation, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('shelfUpdate', { ids: { sku }, data: { shelfLocation }, ...options });
    };

    const trimmed = String(shelfLocation || '').trim();
    if (!trimmed) {
      throw new Phase2Error('Vui lòng nhập vị trí kệ mới.', 400);
    }

    return callBackend(
      {
        method: 'patch',
        url: API_ENDPOINTS.MODERATOR.UPDATE_SHELF_LOCATION(sku),
        data: { shelfLocation: trimmed },
      },
      { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
    );
  },

  // API 43: GET /products/{id}/stock-movements
  movements: async (sku, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      const res = await fixtureRequest('stockMovements', { ids: { sku }, ...options });
      return Array.isArray(res) ? res.map(formatStockMovement).filter(Boolean) : [];
    };

    try {
      const res = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.STOCK_MOVEMENTS(sku),
        },
        { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
      );
      const raw = Array.isArray(res) ? res : [];
      return raw.map(formatStockMovement).filter(Boolean);
    } catch (err) {
      if (isFixtureMode && fallback) return fallback();
      throw err;
    }
  },

  // API 39: GET /products/{id}/sku-label
  label: async (sku, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('skuLabel', { ids: { sku }, ...options });
    };

    if (isFixtureMode) return fallback();

    try {
      const response = await baseApi.get(API_ENDPOINTS.MODERATOR.PRODUCT_SKU_LABEL(sku), {
        responseType: 'blob',
        signal: options?.signal,
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      return { labelPdfUrl: URL.createObjectURL(blob), blob };
    } catch (err) {
      if (err.response?.data) {
        let body = err.response.data;
        if (typeof Blob !== 'undefined' && body instanceof Blob) {
          try {
            if (typeof body.text === 'function') {
              const text = await body.text();
              body = JSON.parse(text);
            } else if (typeof FileReader !== 'undefined') {
              const text = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsText(body);
              });
              body = JSON.parse(text);
            }
          } catch {}
        } else if (typeof body === 'string') {
          try {
            body = JSON.parse(body);
          } catch {}
        }
        if (body && typeof body === 'object' && (body.code || body.message)) {
          throw new Phase2Error(body.message || 'Lỗi in tem SKU', err.response.status, body.code || '');
        }
      }
      throw normalizeError(err);
    }
  },
};

// =========================================================================
// API 44, 45, 46, 47, 48: Quản lý Danh mục & Thương hiệu
// =========================================================================
export const catalogService = {
  // API 44: GET /categories, GET /brands
  list: async (options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('catalogList', options);
    };

    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (isFixtureMode) return fallback();
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
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest(`${kind}${id ? 'Update' : 'Create'}`, { ids: { id }, data, ...options });
    };

    const method = id ? 'put' : 'post';
    const baseUrl = isCategory ? API_ENDPOINTS.MODERATOR.CATEGORIES : API_ENDPOINTS.MODERATOR.BRANDS;
    const url = id
      ? (isCategory ? API_ENDPOINTS.MODERATOR.CATEGORY_DETAIL(id) : API_ENDPOINTS.MODERATOR.BRAND_DETAIL(id))
      : baseUrl;

    const payload = isCategory
      ? {
          name: data.name,
          tryonSlot: data.slot || data.tryonSlot || null,
          ...(id && data.status ? { status: data.status } : {}),
        }
      : {
          name: data.name,
          ...(id && data.status ? { status: data.status } : {}),
        };

    return callBackend(
      {
        method,
        url,
        data: payload,
      },
      { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
    );
  },

  // API 48: PATCH /categories/{id}/hide, PATCH /brands/{id}/hide
  hide: async (kind, id, options) => {
    const isCategory = kind === 'category';
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest(`${kind}Hide`, { ids: { id }, ...options });
    };

    const url = isCategory
      ? API_ENDPOINTS.MODERATOR.HIDE_CATEGORY(id)
      : API_ENDPOINTS.MODERATOR.HIDE_BRAND(id);

    return callBackend(
      {
        method: 'patch',
        url,
      },
      { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
    );
  },
};

// =========================================================================
// API 36: Xử lý hàng cuối kỳ & vô thừa nhận
// =========================================================================
export const endTermService = {
  list: async (params, options) => {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (isFixtureMode) {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('endTermList', { ...options, params });
    }
    return inventoryService.list({ ...params, status: 'UNCLAIMED' }, options);
  },

  read: async (sku, options) => {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (isFixtureMode) {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('endTermRead', { ...options, ids: { sku } });
    }
    return inventoryService.read(sku, options);
  },

  handover: async (sku, data, options) => {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (isFixtureMode) {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('endTermHandover', {
        ...options,
        ids: { sku },
        data: { ...data, context: 'END_OF_TERM_TAKE_BACK' },
      });
    }
    // accountId and refId come from a counter task, not from the product SKU.
    if (!data?.accountId || !data?.refId) {
      throw new Phase2Error('Thiếu tài khoản hoặc mã yêu cầu bàn giao tại quầy.', 422);
    }
    return callBackend({
      method: 'post',
      url: API_ENDPOINTS.MODERATOR.COUNTER_HANDOVER,
      data: { accountId: data.accountId, refId: data.refId, context: 'END_OF_TERM_TAKE_BACK' },
    }, { signal: options?.signal });
  },

  reconsign: async (sku, data, options) => {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (isFixtureMode) {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('endTermReconsign', { ...options, ids: { sku }, data });
    }
    throw new Phase2Error('Backend chưa hỗ trợ Moderator chốt ký gửi lại.', 501, 'OPERATION_UNSUPPORTED');
  },

  // API 36: POST /products/{id}/unclaimed/confirm-transfer
  transfer: async (sku, partnerName, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('unclaimedTransfer', { ids: { sku }, data: { partnerName }, ...options });
    };

    return callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.CONFIRM_UNCLAIMED_TRANSFER(sku),
        data: { partnerOrganizationName: partnerName },
      },
      { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
    );
  },
};
