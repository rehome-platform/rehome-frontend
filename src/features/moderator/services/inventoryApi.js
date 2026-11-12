import { pendingPricing, pricingForProduct } from './endTermPricingApi.js';
import { readProposals, proposalForProduct } from './reconsignProposalStore.js';
import { skuLabelError } from './skuLabelError.js';
import { fixtureFallback } from './fixtureTransport.js';
import { inventoryQuery, inventoryResult, inventoryDetail, productPayload, createdProduct, uploadedPhoto } from '../models/inventoryApiModel.js';
import baseApi from '../../../services/baseApi.js';
import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { isFixtureMode } from "../config/warehouseContract.js";
import { Phase2Error } from "../models/warehouseModel.js";
import { callBackend } from './warehouseTransport.js';
import { enrichListRows } from './listDetailEnrichment.js';

export const inventoryService = {
  // API 40: GET /inventory
  list: async (params, options) => {
    const fallback = fixtureFallback('inventoryList', { params, ...options });

    try {
      if (params?.status === 'WAITING_END_OF_TERM') {
        if (isFixtureMode && fallback) return fallback();

        // This UI queue is not a backend ProductStatus. Filter before pagination.
        const [stored, withdrawn, unclaimed, pricing] = await Promise.all([
          allInventory('WAREHOUSE', options), allInventory('WITHDRAWN', options),
          allInventory('UNCLAIMED', options), pendingPricing(options),
        ]);
        const storedDetails = await enrichListRows(stored, () => true, async item => ({
          ...item, ...await inventoryService.read(item.id || item.sku, options),
        }), options);
        const proposals = readProposals(options);
        const rows = [...storedDetails, ...withdrawn, ...unclaimed].map(item => {
          const request = item.status === 'WAREHOUSE' && pricingForProduct(pricing, item.id || item.sku);
          const proposal = item.status === 'WAREHOUSE' && proposalForProduct(proposals, item, request);
          return inventoryDetail({
            ...item,
            ...(proposal ? { reConsignStatus: 'PROPOSAL_SENT', newReceiptId: proposal.receiptId } : {}),
            ...(request ? {
              decisionId: request.decisionId, decision: 'RE_CONSIGN', pricingEligible: true,
              name: item.name || request.productName, currentPrice: request.currentPrice,
              previousAgreedPrice: request.previousAgreedPrice
            } : {}),
          }, item.id || item.sku);
        }).filter(item => ['WITHDRAWN', 'UNCLAIMED'].includes(item.status) || (item.status === 'WAREHOUSE' && (item.decisionId || item.pricingEligible || item.reConsignStatus === 'PROPOSAL_SENT')));
        const filtered = inventoryResult(rows, params).items;
        const size = params?.size ?? 20;
        const page = params?.page ?? 0;
        const items = filtered.slice(page * size, (page + 1) * size);
        return { items, content: items, totalElements: filtered.length, totalPages: Math.ceil(filtered.length / size) };
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

      let normalized = inventoryResult(result, params);
      if (normalized.items.some(item => item.status === 'WAREHOUSE')) {
        const [details, pricing] = await Promise.all([
          enrichListRows(normalized.items,
            item => item.status === 'WAREHOUSE' && item.decisionId === undefined,
            async item => ({ ...item, ...await inventoryService.read(item.sku, options) }), options),
          pendingPricing(options),
        ]);
        const items = details.map(item => {
          const request = item.status === 'WAREHOUSE' && pricingForProduct(pricing, item.sku);
          const proposal = item.status === 'WAREHOUSE' && proposalForProduct(readProposals(options), item, request);
          return inventoryDetail({
            ...item,
            ...(proposal ? { reConsignStatus: 'PROPOSAL_SENT', newReceiptId: proposal.receiptId } : {}), ...(request ? {
              decisionId: request.decisionId, pricingEligible: true, decision: 'RE_CONSIGN',
              previousAgreedPrice: request.previousAgreedPrice,
            } : {})
          }, item.sku);
        });
        normalized = { ...normalized, items, content: items };
      }
      return enrichInventoryResult(normalized, options);
    } catch (err) {
      if (isFixtureMode && fallback) return fallback();
      throw err;
    }
  },

  // TH-04..TH-07: Ca hàng xuống cấp thuộc kho của Moderator
  degradedCases: async (params = {}, options = {}) => {
    const fallback = fixtureFallback('degradedCaseList', { params, ...options });
    if (isFixtureMode) return fallback();
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

  update: async (sku, data, options) => {
    const payload = {
      name: String(data?.name || '').trim(),
      size: data?.size ? String(data.size).trim() : null,
      conditionNote: String(data?.conditionNote || '').trim(),
      photoUrls: Array.isArray(data?.photoUrls) ? data.photoUrls : [],
    };

    const res = await callBackend(
      {
        method: 'put',
        url: API_ENDPOINTS.MODERATOR.UPDATE_PRODUCT(sku),
        data: payload,
      },
      { signal: options?.signal }
    );

    return inventoryDetail(res, sku);
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


async function allInventory(status, options) {
  const rows = [];
  let page = 0, totalPages = 1;
  while (page < totalPages) {
    if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const result = await callBackend({
      method: 'get', url: API_ENDPOINTS.MODERATOR.INVENTORY,
      params: { status, page, size: 50 },
    }, { signal: options?.signal });
    rows.push(...(result?.content || result?.items || (Array.isArray(result) ? result : [])));
    totalPages = result?.totalPages ?? 1;
    page++;
  }
  return rows;
}
