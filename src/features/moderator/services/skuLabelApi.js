import baseApi from '../../../services/baseApi.js';
import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { normalizeError, Phase2Error } from '../models/warehouseModel.js';
import { callBackend } from './warehouseTransport.js';

// Backend không có API hàng đợi in tem riêng. Hàng đợi được dựng từ API có sẵn:
// - GET /moderator/consignment-forms?stage=STOCKED_TODAY: món nhập kho hôm nay
// - GET /moderator/consignment-forms/{id}: chi tiết danh mục, thương hiệu, size, thời điểm nhập kho
// - GET /products/detail/{sku}: tra cứu SKU được mở trực tiếp từ URL (?sku=)
// - GET /products/{sku}/sku-label: PDF tem SKU
// Backend không lưu trạng thái "đã in", nên món đã tải tem được ghi nhớ trên trình duyệt.
const PRINTED_KEY = 'rehome_printed_sku_labels';
const QUEUE_SIZE = 50;

function readPrinted() {
  try {
    const value = JSON.parse(globalThis.localStorage?.getItem(PRINTED_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writePrinted(skus) {
  try {
    globalThis.localStorage?.setItem(PRINTED_KEY, JSON.stringify(skus.slice(-500)));
  } catch {
    // localStorage không khả dụng: bỏ qua, hàng đợi vẫn hoạt động trong phiên hiện tại
  }
}

function pageItems(result) {
  if (Array.isArray(result)) return result;
  return result?.content || result?.items || [];
}

function fromForm(form, detail) {
  const source = detail || form;
  const sku = source.productSku || source.product?.sku || form.productSku;
  return {
    sku,
    formId: form.id,
    name: source.product?.name || source.productName || form.productName,
    categoryName: source.categoryName || null,
    brandName: source.brandName || null,
    size: source.size || null,
    conditionNote: source.receipt?.conditionNote || source.condition || null,
    warehouseName: source.warehouseName || source.warehouse?.name || null,
    stockedAt: source.product?.createdAt || source.confirmedAt || null,
    moderatorName: source.moderator?.fullName || source.moderator?.moderatorCode || null,
  };
}

function fromProduct(product, sku) {
  return {
    sku: product.id || sku,
    name: product.name,
    categoryName: product.categoryName || null,
    brandName: product.brandName || null,
    size: product.size || null,
    conditionNote: product.condition || null,
    warehouseName: product.warehouseName || null,
    stockedAt: product.inspectionDate || null,
    moderatorName: null,
  };
}

async function listQueue(options = {}) {
  const { signal, sku: focusedSku } = options;
  const printed = new Set(readPrinted());
  const result = await callBackend({
    method: 'get',
    url: API_ENDPOINTS.MODERATOR.CONSIGNMENT_FORMS,
    params: { stage: 'STOCKED_TODAY', page: 0, size: QUEUE_SIZE },
  }, { signal });

  const forms = pageItems(result).filter(form => form?.productSku && !printed.has(form.productSku));
  const items = await Promise.all(forms.map(async form => {
    try {
      const detail = await callBackend({
        method: 'get', url: API_ENDPOINTS.MODERATOR.CONSIGNMENT_FORM_DETAIL(form.id),
      }, { signal });
      return fromForm(form, detail);
    } catch (error) {
      if (signal?.aborted) throw error;
      return fromForm(form);
    }
  }));

  // SKU mở từ bước nhập kho (có thể đã nhập từ ngày trước) vẫn phải xuất hiện để in
  if (focusedSku && !printed.has(focusedSku) && !items.some(item => item.sku === focusedSku)) {
    try {
      const product = await callBackend({
        method: 'get', url: API_ENDPOINTS.MODERATOR.PRODUCT_DETAIL(focusedSku),
      }, { signal });
      if (product) items.unshift(fromProduct(product, focusedSku));
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }
  return items;
}

async function labelPdf(sku, signal) {
  try {
    const response = await baseApi.get(API_ENDPOINTS.MODERATOR.PRODUCT_SKU_LABEL(sku), {
      responseType: 'blob', signal,
    });
    const blob = response.data;
    if (!blob?.size || (blob.type && !blob.type.includes('pdf'))) {
      throw new Phase2Error(`Máy chủ không trả về file PDF hợp lệ cho ${sku}.`, 502);
    }
    return blob.type ? blob : new Blob([blob], { type: 'application/pdf' });
  } catch (error) {
    if (signal?.aborted || error?.code === 'ERR_CANCELED') throw error;
    throw normalizeError(error);
  }
}

export const skuLabelService = {
  list: listQueue,
  // Trả về Blob khi tải 1 tem, mảng { sku, blob } khi tải nhiều tem
  pdf: async (skus, options = {}) => {
    const files = [];
    for (const sku of skus) {
      files.push({ sku, blob: await labelPdf(sku, options.signal) });
    }
    return files.length === 1 ? files[0].blob : files;
  },
  markPrinted: async (skus, options = {}) => {
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    writePrinted([...new Set([...readPrinted(), ...skus])]);
    return null;
  },
};

function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  try { link.click(); }
  finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function downloadLabelPdf(file) {
  if (Array.isArray(file)) {
    file.forEach(({ sku, blob }) => saveBlob(blob, `rehome-tem-${sku}.pdf`));
    return;
  }
  saveBlob(file, 'rehome-tem-sku.pdf');
}
