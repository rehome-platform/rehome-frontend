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
import { PLATFORM_FINAL_STATUSES, warehouseReasonOf } from '../../../constants/productStatus.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const inventoryService = {
  // API 40: GET /inventory
  list: async (params, options) => {
    const fallback = fixtureFallback('inventoryList', { params, ...options });

    try {
      if (params?.status === 'WAITING_END_OF_TERM') {
        if (isFixtureMode && fallback) return fallback();

        // This UI queue is not a backend ProductStatus. Filter before pagination.
        return paginateClient(await termExpiredRows(options, true), params);
      }

      // Tab "Hết hạn ký gửi": tái sử dụng logic "Chờ xử lý cuối kỳ", chỉ nhánh WAREHOUSE
      // (WITHDRAWN/UNCLAIMED đã có tab riêng).
      if (params?.status === 'TERM_EXPIRED') {
        if (isFixtureMode && fallback) {
          const legacy = await fixtureFallback('inventoryList', { params: { ...params, status: 'WAITING_END_OF_TERM' }, ...options })();
          const rows = (legacy?.content || legacy?.items || []).filter(item => item.status === 'WAREHOUSE');
          return paginateClient(rows.map(item => inventoryItemWithReason(item)), params, false);
        }
        return paginateClient(await termExpiredRows(options, false), params);
      }

      // Tab "Tài sản nền tảng / Đã xử lý": backend chỉ lọc 1 status mỗi lần,
      // ghép nối PLATFORM_OWNED -> DONATED -> DESTROYED và phân trang theo offset phía server.
      if (params?.status === 'PLATFORM_FINAL') {
        if (isFixtureMode && fallback) return fallback();
        return platformFinalPage(params, options);
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
        const needsEndOfTermEnrichment = normalized.items.some(
          item => item.status === 'WAREHOUSE' && !item.activeWithdrawalStatus,
        );
        const [details, pricing] = needsEndOfTermEnrichment
          ? await Promise.all([
              enrichListRows(normalized.items,
                item => item.status === 'WAREHOUSE' && !item.activeWithdrawalStatus && item.decisionId === undefined,
                async item => ({ ...item, ...await inventoryService.read(item.sku, options) }), options),
              pendingPricing(options),
            ])
          : [normalized.items, []];
        const items = details.map(item => {
          const isActiveWithdrawal = Boolean(item.activeWithdrawalStatus);
          const request = item.status === 'WAREHOUSE' && !isActiveWithdrawal && pricingForProduct(pricing, item.sku);
          const proposal = item.status === 'WAREHOUSE' && !isActiveWithdrawal && proposalForProduct(readProposals(options), item, request);
          return inventoryItemWithReason(inventoryDetail({
            ...item,
            ...(proposal ? { reConsignStatus: 'PROPOSAL_SENT', newReceiptId: proposal.receiptId } : {}), ...(request ? {
              decisionId: request.decisionId, pricingEligible: true, decision: 'RE_CONSIGN',
              previousAgreedPrice: request.previousAgreedPrice,
              ...(request.reConsignStatus ? { reConsignStatus: request.reConsignStatus } : {}),
              ...(request.newReceiptId ? { newReceiptId: request.newReceiptId } : {}),
              ...(request.memberCounterPrice != null ? { memberCounterPrice: request.memberCounterPrice } : {}),
              ...(request.counteredAt || request.counterOfferedAt ? { counteredAt: request.counteredAt || request.counterOfferedAt } : {}),
              ...(request.decidedAt ? { decidedAt: request.decidedAt } : {}),
              ...(request.proposalDeadline ? { proposalDeadline: request.proposalDeadline } : {}),
              ...(Array.isArray(request.negotiationHistory) ? { negotiationHistory: request.negotiationHistory } : {}),
            } : {})
          }, item.sku));
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
      const rawKey = String(sku || '').trim();
      const shouldResolveUuid =
        rawKey &&
        UUID_RE.test(rawKey) &&
        (err?.status === 400 || err?.status === 404) &&
        !options?.signal?.aborted;
      if (shouldResolveUuid) {
        try {
          const listRes = await callBackend(
            {
              method: 'get',
              url: API_ENDPOINTS.MODERATOR.INVENTORY,
              params: { page: 0, size: 100 },
            },
            { signal: options?.signal }
          );
          const rows = Array.isArray(listRes)
            ? listRes
            : (listRes?.content || listRes?.items || []);
          const match = rows.find((item) => String(item?.id || '').toLowerCase() === rawKey.toLowerCase());
          if (match?.sku) {
            const detailRes = await callBackend(
              {
                method: 'get',
                url: API_ENDPOINTS.MODERATOR.PRODUCT_BY_SKU(match.sku),
              },
              { signal: options?.signal }
            );
            return inventoryDetail(detailRes, match.sku);
          }
        } catch {
          // Fall through to rethrow original error
        }
      }
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
      photoUrls: Array.isArray(data?.photoUrls) ? data.photoUrls : [],
      ...(data?.categoryId ? { categoryId: data.categoryId } : {}),
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

  // Upload file lên /uploads?folder={folder} (mặc định PRODUCTS, vd ORDER_PACKING)
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
    const folder = encodeURIComponent(options?.folder || 'PRODUCTS');

    const res = await callBackend(
      {
        method: 'post',
        url: `${API_ENDPOINTS.MODERATOR.UPLOADS}?folder=${folder}`,
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
      if (!item.thumbnailUrl && detail.thumbnailUrl) fields.thumbnailUrl = detail.thumbnailUrl;
      if ((!Array.isArray(item.photos) || !item.photos.length) && Array.isArray(detail.photos) && detail.photos.length) {
        fields.photos = detail.photos;
      }
      return { ...item, ...fields };
    },
    options,
  );
  return { ...result, items, content: items };
}


function inventoryItemWithReason(item) {
  const reason = warehouseReasonOf(item);
  return reason ? { ...item, warehouseReason: reason } : item;
}

function paginateClient(rows, params, normalize = true) {
  const filtered = normalize ? inventoryResult(rows, params).items : rows;
  const size = params?.size ?? 20;
  const page = params?.page ?? 0;
  const items = filtered.slice(page * size, (page + 1) * size);
  return { items, content: items, totalElements: filtered.length, totalPages: Math.ceil(filtered.length / size) };
}

// Logic "Chờ xử lý cuối kỳ" dùng chung: WAREHOUSE có EndOfTermDecision (decisionId),
// yêu cầu ký gửi lại (pricingEligible) hoặc proposal đã gửi. includeTerminal thêm WITHDRAWN/UNCLAIMED.
async function termExpiredRows(options, includeTerminal) {
  const [stored, withdrawn, unclaimed, pricing] = await Promise.all([
    allInventory('WAREHOUSE', options),
    includeTerminal ? allInventory('WITHDRAWN', options) : [],
    includeTerminal ? allInventory('UNCLAIMED', options) : [],
    pendingPricing(options),
  ]);
  const storedCandidates = stored.filter(item => !item.activeWithdrawalStatus);
  const storedDetails = await enrichListRows(storedCandidates, () => true, async item => ({
    ...item, ...await inventoryService.read(item.id || item.sku, options),
  }), options);
  const proposals = readProposals(options);
  return [...storedDetails, ...withdrawn, ...unclaimed].map(item => {
    const request = item.status === 'WAREHOUSE' && pricingForProduct(pricing, item.id || item.sku);
    const proposal = item.status === 'WAREHOUSE' && proposalForProduct(proposals, item, request);
    return inventoryItemWithReason(inventoryDetail({
      ...item,
      ...(proposal ? { reConsignStatus: 'PROPOSAL_SENT', newReceiptId: proposal.receiptId } : {}),
      ...(request ? {
        decisionId: request.decisionId, decision: 'RE_CONSIGN', pricingEligible: true,
        name: item.name || request.productName, currentPrice: request.currentPrice,
        previousAgreedPrice: request.previousAgreedPrice,
        ...(request.reConsignStatus ? { reConsignStatus: request.reConsignStatus } : {}),
        ...(request.newReceiptId ? { newReceiptId: request.newReceiptId } : {}),
        ...(request.memberCounterPrice != null ? { memberCounterPrice: request.memberCounterPrice } : {}),
        ...(request.counteredAt || request.counterOfferedAt ? { counteredAt: request.counteredAt || request.counterOfferedAt } : {}),
        ...(request.decidedAt ? { decidedAt: request.decidedAt } : {}),
        ...(request.proposalDeadline ? { proposalDeadline: request.proposalDeadline } : {}),
        ...(Array.isArray(request.negotiationHistory) ? { negotiationHistory: request.negotiationHistory } : {}),
      } : {}),
    }, item.id || item.sku));
  }).filter(item => !item.activeWithdrawalStatus && (['WITHDRAWN', 'UNCLAIMED'].includes(item.status) || (item.status === 'WAREHOUSE' && (item.decisionId || item.pricingEligible || ['AWAITING_PRICE', 'PROPOSED', 'PROPOSAL_SENT', 'COUNTER_OFFERED'].includes(item.reConsignStatus)))));
}

const rowsOf = result => result?.content || result?.items || (Array.isArray(result) ? result : []);

async function inventoryPage(status, page, size, options) {
  if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  return callBackend({
    method: 'get', url: API_ENDPOINTS.MODERATOR.INVENTORY, params: { status, page, size },
  }, { signal: options?.signal });
}

// Lấy các phần tử [from, to) của một status (offset cục bộ), tối đa 2 request.
async function inventoryRange(status, from, to, size, options) {
  const firstPage = Math.floor(from / size);
  const lastPage = Math.floor((to - 1) / size);
  const rows = [];
  for (let page = firstPage; page <= lastPage; page++) {
    rows.push(...rowsOf(await inventoryPage(status, page, size, options)));
  }
  return rows.slice(from - firstPage * size, to - firstPage * size);
}

async function platformFinalPage(params, options) {
  const size = Math.min(Math.max(params?.size ?? 20, 1), 50);
  const page = Math.max(params?.page ?? 0, 0);
  const totals = await Promise.all(PLATFORM_FINAL_STATUSES.map(async status => {
    const result = await inventoryPage(status, 0, 1, options);
    return result?.totalElements ?? rowsOf(result).length;
  }));
  const totalElements = totals.reduce((sum, value) => sum + value, 0);
  const offset = page * size;
  const end = Math.min(offset + size, totalElements);
  const rows = [];
  let start = 0;
  for (let index = 0; index < PLATFORM_FINAL_STATUSES.length; index++) {
    const segEnd = start + totals[index];
    const from = Math.max(offset, start);
    const to = Math.min(end, segEnd);
    if (from < to) {
      rows.push(...await inventoryRange(PLATFORM_FINAL_STATUSES[index], from - start, to - start, size, options));
    }
    start = segEnd;
  }
  const items = inventoryResult(rows, params).items;
  return { items, content: items, totalElements, totalPages: Math.ceil(totalElements / size) };
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
