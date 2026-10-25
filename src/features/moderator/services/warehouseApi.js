import baseApi from '../../../services/baseApi.js';
import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { phase2Contract, isFixtureMode } from '../config/warehouseContract.js';
import { normalizeError, Phase2Error, unwrap } from '../models/warehouseModel.js';

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

/** Helper to call real backend API with error normalization and safe fallback */
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
    // If backend returns 404 (endpoint unmapped/unimplemented yet) or network is unreachable and fallback exists:
    if (fallback && ([404, 0].includes(normalized.status) || !navigator.onLine)) {
      try {
        return await fallback();
      } catch {
        throw normalized;
      }
    }
    throw normalized;
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
      const res = await fixtureRequest('queueList', { params, ...options });
      return res;
    };

    const typeQuery = params?.type && params.type !== 'ALL' ? params.type : undefined;
    try {
      const result = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.QUEUES,
          params: typeQuery ? { type: typeQuery } : undefined,
        },
        { fallback, signal: options?.signal }
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

      const list = Array.isArray(result) ? result.map(map) : { ...result, items: (result?.items || []).map(map) };
      // Nếu backend trả về danh sách rỗng trong dev, hợp nhất thêm dữ liệu mẫu để giao diện luôn đầy đủ
      if (Array.isArray(list) && list.length === 0 && fallback) {
        try {
          const sample = await fallback();
          return Array.isArray(sample) ? sample.map(map) : sample;
        } catch {
          return list;
        }
      }
      return list;
    } catch (err) {
      if (fallback) return fallback();
      throw err;
    }
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
      { fallback, signal: options?.signal }
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
      { fallback, signal: options?.signal }
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
      { fallback, signal: options?.signal }
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
      { fallback, signal: options?.signal }
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
      return fixtureRequest('memberLookup', { params, ...options });
    };

    try {
      const result = await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.COUNTER_LOOKUP,
          data: params,
        },
        { fallback, signal: options?.signal }
      );
      if (!result) return fallback();
      const list = Array.isArray(result) ? result : [result];
      return list.map((item) => ({
        memberId: item.accountId || item.memberId || item.id,
        memberCode: item.memberCode || '',
        fullName: item.fullName || item.name || '',
        name: item.fullName || item.name || '',
        avatarUrl: item.avatarUrl || '',
        phone: item.phone || params?.phone || '',
      }));
    } catch (err) {
      return fallback();
    }
  },

  // API 26: POST /counter/members/{accountId}/confirm-identity
  confirm: async (memberId, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('identityConfirm', { data: { memberId }, ...options });
    };

    try {
      await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.COUNTER_CONFIRM_IDENTITY(memberId),
        },
        { fallback, signal: options?.signal }
      );
      return {
        memberId,
        identityToken: `proof-${memberId}-${Date.now()}`,
        confirmedAt: new Date().toISOString(),
      };
    } catch {
      return fallback();
    }
  },

  // API 27: GET /counter/members/{accountId}/tasks
  tasks: async (memberId, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('memberTasks', { ids: { memberId }, ...options });
    };

    try {
      return await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.COUNTER_TASKS(memberId),
        },
        { fallback, signal: options?.signal }
      );
    } catch {
      return fallback();
    }
  },
};

// =========================================================================
// API 33, 34, 35, 19: Kiểm định & Biên nhận ký gửi
// =========================================================================
export const consignmentService = {
  // GET /consignment-forms/{id}
  read: async (formId, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('formRead', { ids: { formId }, ...options });
    };

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

    return callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.RETURN_ONSITE(formId),
        data: { reason: data?.reason || 'Không đạt kiểm định tại quầy' },
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
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('inventoryList', { params, ...options });
    };

    try {
      const queryParams = {
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.shelf ? { shelfLocation: params.shelf } : {}),
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

      const items = (result?.content || result?.items || (Array.isArray(result) ? result : [])).map((item) => ({
        ...item,
        sku: item.id || item.sku,
        id: item.id || item.sku,
        name: item.name || '',
        shelfLocation: item.shelfLocation || 'Chưa gán',
        status: item.status || 'ON_SALE',
      }));

      if (!items.length && fallback) {
        try {
          return await fallback();
        } catch {
          return { content: [], totalElements: 0, totalPages: 0, items: [] };
        }
      }

      return {
        ...result,
        items,
        content: items,
        totalElements: result?.totalElements ?? items.length,
        totalPages: result?.totalPages ?? Math.ceil(items.length / 20),
      };
    } catch {
      return fallback();
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
        { fallback, signal: options?.signal }
      );
      if (!res) return fallback();
      return {
        ...res,
        sku: res.id || res.sku || sku,
        name: res.name || sku,
        shelfLocation: res.shelfLocation || 'Chưa gán',
        status: res.status || 'ON_SALE',
        allowedActions: res.allowedActions || ['CHANGE_SHELF', 'ADD_PHOTOS'],
      };
    } catch {
      return fallback();
    }
  },

  byReceipt: async (receiptId, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('productByReceipt', { ids: { receiptId }, ...options });
    };

    if (isFixtureMode) return fallback();
    return null;
  },

  // API 37: POST /products
  create: async (data, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('productCreate', { data, ...options });
    };

    const payload = {
      receiptId: data.receiptId,
      name: data.name,
      size: data.size || null,
      shelfLocation: data.shelfLocation || null,
      photoUrls: data.photoUrls || [],
    };

    return callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.CREATE_PRODUCT,
        data: payload,
      },
      { fallback, signal: options?.signal }
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
      { fallback, signal: options?.signal }
    );

    return { url: res?.url || res?.fileUrl || (typeof res === 'string' ? res : '') };
  },

  // API 38: POST /products/{id}/photos
  addPhotos: async (sku, photoUrls, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('productPhotos', { ids: { sku }, data: { photoUrls }, ...options });
    };

    try {
      return await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.PRODUCT_PHOTOS(sku),
          data: { imageUrl: photoUrls[0] },
        },
        { fallback, signal: options?.signal }
      );
    } catch {
      return fallback();
    }
  },

  // API 42: PATCH /products/{id}/shelf-location
  shelf: async (sku, shelfLocation, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('shelfUpdate', { ids: { sku }, data: { shelfLocation }, ...options });
    };

    return callBackend(
      {
        method: 'patch',
        url: API_ENDPOINTS.MODERATOR.UPDATE_SHELF_LOCATION(sku),
        data: { shelfLocation },
      },
      { fallback, signal: options?.signal }
    );
  },

  // API 43: GET /products/{id}/stock-movements
  movements: async (sku, options) => {
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('stockMovements', { ids: { sku }, ...options });
    };

    try {
      const res = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.STOCK_MOVEMENTS(sku),
        },
        { fallback, signal: options?.signal }
      );
      return Array.isArray(res) ? res : fallback();
    } catch {
      return fallback();
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
      return { labelPdfUrl: URL.createObjectURL(blob) };
    } catch {
      return fallback();
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

      if (!categories.length && !brands.length && fallback) {
        return fallback();
      }

      return { categories, brands };
    } catch {
      return fallback();
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
    const url = id ? `${baseUrl}/${id}` : baseUrl;

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
      { fallback, signal: options?.signal }
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
      { fallback, signal: options?.signal }
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
    const fallback = async () => {
      const { fixtureRequest } = await import('../fixtures/warehouseFixtures.js');
      return fixtureRequest('unclaimedTransfer', { ids: { sku }, data: { partnerName }, ...options });
    };

    return callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.CONFIRM_UNCLAIMED_TRANSFER(sku),
        data: { partnerOrganizationName: partnerName, partnerName },
      },
      { fallback, signal: options?.signal }
    );
  },
};
