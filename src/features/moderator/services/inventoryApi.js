import { skuLabelError } from './skuLabelError.js';
import { fixtureFallback } from './fixtureTransport.js';
import { inventoryQuery, inventoryResult, inventoryDetail, productPayload, createdProduct, uploadedPhoto } from '../models/inventoryApiModel.js';
import baseApi from '../../../services/baseApi.js';
import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { isFixtureMode } from "../config/warehouseContract.js";
import { formatStockMovement, Phase2Error } from "../models/warehouseModel.js";
import { callBackend } from './warehouseTransport.js';
import { enrichListRows } from './listDetailEnrichment.js';

export const inventoryService = {
  // API 40: GET /inventory
  list: async (params, options) => {
    const fallback = fixtureFallback('inventoryList', { params, ...options });

    try {
      if (params?.status === 'WAITING_END_OF_TERM') {
        if (isFixtureMode && fallback) return fallback();

        const queryWithdrawn = inventoryQuery({ ...params, status: 'WITHDRAWN' });
        const queryUnclaimed = inventoryQuery({ ...params, status: 'UNCLAIMED' });

        const [resWithdrawn, resUnclaimed] = await Promise.all([
          callBackend(
            {
              method: 'get',
              url: API_ENDPOINTS.MODERATOR.INVENTORY,
              params: queryWithdrawn,
            },
            { fallback, signal: options?.signal }
          ),
          callBackend(
            {
              method: 'get',
              url: API_ENDPOINTS.MODERATOR.INVENTORY,
              params: queryUnclaimed,
            },
            { fallback, signal: options?.signal }
          ),
        ]);

        const itemsWithdrawn = resWithdrawn?.content || resWithdrawn?.items || (Array.isArray(resWithdrawn) ? resWithdrawn : []);
        const itemsUnclaimed = resUnclaimed?.content || resUnclaimed?.items || (Array.isArray(resUnclaimed) ? resUnclaimed : []);
        const combined = [...itemsWithdrawn, ...itemsUnclaimed];
        const totalElements = (resWithdrawn?.totalElements ?? itemsWithdrawn.length) + (resUnclaimed?.totalElements ?? itemsUnclaimed.length);

        return enrichInventoryResult(inventoryResult(
          {
            ...resWithdrawn,
            content: combined,
            items: combined,
            totalElements,
            totalPages: Math.ceil(totalElements / (params?.size ?? 20)),
          },
          params
        ), options);
      }

      // Backend ProductStatus enum does not support WAITING_END_OF_TERM
      const queryParams = inventoryQuery(params);

      const result = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.INVENTORY,
          params: queryParams,
        },
        { fallback, signal: options?.signal }
      );

      return enrichInventoryResult(inventoryResult(result, params), options);
    } catch (err) {
      if (isFixtureMode && fallback) return fallback();
      throw err;
    }
  },

  // TH-04..TH-07: Ca hàng xuống cấp thuộc kho của Moderator
  degradedCases: async (params = {}, options = {}) => {
    const fallback = fixtureFallback('inventoryList', { params, ...options });
    try {
      const res = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.WAREHOUSE_DEGRADED_CASES,
          params: {
            ...(params?.status ? { status: params.status } : {}),
          },
        },
        { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
      );
      const raw = res?.data || res;
      return Array.isArray(raw) ? raw : (raw?.content || []);
    } catch (err) {
      if (isFixtureMode && fallback) return fallback();
      throw err;
    }
  },

  // API 41: GET /products/{sku}
  read: async (sku, options) => {
    const fallback = fixtureFallback('productRead', { ids: { sku }, ...options });

    try {
      const res = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.PRODUCT_BY_SKU(sku),
        },
        { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
      );
      return inventoryDetail(res, sku);
    } catch (err) {
      if (isFixtureMode && fallback) return fallback();
      throw err;
    }
  },

  byReceipt: async (receiptId, options) => {
    const fallback = fixtureFallback('productByReceipt', { ids: { receiptId }, ...options });

    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (isFixtureMode) return fallback();
    throw new Phase2Error('Backend chưa hỗ trợ tra cứu sản phẩm theo biên nhận.', 501, 'OPERATION_UNSUPPORTED');
  },

  // API 37: POST /products
  create: async (data, options) => {
    const fallback = fixtureFallback('productCreate', { data, ...options });

    const payload = productPayload(data);

    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.CREATE_PRODUCT,
        data: payload,
      },
      { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
    );

    return createdProduct(res, payload);
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

    return uploadedPhoto(res);
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
    const fallback = fixtureFallback('shelfUpdate', { ids: { sku }, data: { shelfLocation }, ...options });

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
      return movementResult(res);
    };

    try {
      const res = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.STOCK_MOVEMENTS(sku),
        },
        { fallback: isFixtureMode ? fallback : undefined, signal: options?.signal }
      );
      return movementResult(res);
    } catch (err) {
      if (isFixtureMode && fallback) return fallback();
      throw err;
    }
  },

  // API 39: GET /products/{id}/sku-label
  label: async (sku, options) => {
    const fallback = fixtureFallback('skuLabel', { ids: { sku }, ...options });

    if (isFixtureMode) return fallback();

    try {
      const response = await baseApi.get(API_ENDPOINTS.MODERATOR.PRODUCT_SKU_LABEL(sku), {
        responseType: 'blob',
        signal: options?.signal,
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      return { labelPdfUrl: URL.createObjectURL(blob), blob };
    } catch (err) {
      throw await skuLabelError(err);
    }
  },
};

const INVENTORY_DETAIL_FIELDS = ['currentTerm', 'daysIntoTerm', 'currentPrice'];

async function enrichInventoryResult(result, options) {
  if (!options?.enrichDetails) return result;
  const items = await enrichListRows(
    result.items,
    item => INVENTORY_DETAIL_FIELDS.some(field => item[field] == null),
    async item => {
      const detail = await inventoryService.read(item.sku, options);
      const fields = {};
      for (const field of INVENTORY_DETAIL_FIELDS) {
        if (item[field] == null && detail[field] != null) fields[field] = detail[field];
      }
      return { ...item, ...fields };
    },
    options,
  );
  return { ...result, items, content: items };
}

function movementResult(res) {
  const raw = Array.isArray(res) ? res : [];
  return raw.map(formatStockMovement).filter(Boolean);
}
