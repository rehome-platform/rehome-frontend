import { Phase2Error } from './warehouseTransportModel.js';

function supportedStatus(params) {
  return params?.status && params.status !== 'WAITING_END_OF_TERM' ? params.status : undefined;
}

export function inventoryQuery(params) {
  const status = supportedStatus(params);
  const shelfLocation = params?.shelfLocation || params?.shelf;
  return {
    ...(status ? { status } : {}),
    ...(shelfLocation ? { shelfLocation } : {}),
    page: params?.page ?? 0,
    size: params?.size ?? 20,
  };
}

function inventoryItem(item) {
  const sku = item.id || item.sku;
  return {
    ...item, sku, id: sku,
    name: item.name || '',
    shelfLocation: item.shelfLocation || 'Chưa gán',
    status: item.status || 'ON_SALE',
  };
}

function filterInventory(items, params) {
  if (!params?.sku || !String(params.sku).trim()) return items;
  const term = String(params.sku).trim().toLowerCase();
  return items.filter(item =>
    item.sku?.toLowerCase().includes(term) || item.name?.toLowerCase().includes(term));
}

export function inventoryResult(result, params) {
  const raw = result?.content || result?.items || (Array.isArray(result) ? result : []);
  const items = filterInventory(raw.map(inventoryItem), params);
  return {
    ...result, items, content: items,
    totalElements: result?.totalElements ?? items.length,
    totalPages: result?.totalPages ?? Math.ceil(items.length / 20),
  };
}

function inventoryActions(res) {
  const actions = Array.isArray(res?.allowedActions) ? [...res.allowedActions] : [];
  if (res?.decision === 'RE_CONSIGN' || res?.reConsignStatus === 'PROPOSAL_SENT' || res?.status === 'WAITING_END_OF_TERM' || res?.status === 'WITHDRAWN') {
    if (!actions.includes('RE_CONSIGN')) actions.push('RE_CONSIGN');
  }
  if (!actions.includes('CHANGE_SHELF')) actions.push('CHANGE_SHELF');
  if (res?.status === 'UNCLAIMED' && !actions.includes('TRANSFER')) actions.push('TRANSFER');
  return actions;
}

export function inventoryDetail(res, sku) {
  if (!res) throw new Phase2Error(`Không tìm thấy sản phẩm SKU ${sku}`, 404);
  return {
    ...res,
    sku: res.id || res.sku || sku,
    name: res.name || sku,
    shelfLocation: res.shelfLocation || 'Chưa gán',
    status: res.status || 'ON_SALE',
    allowedActions: inventoryActions(res),
  };
}

function optionalText(value) {
  return value ? String(value).trim() : null;
}

function requireReceipt(data) {
  const receiptId = data?.receiptId || data?.id;
  if (!receiptId) throw new Phase2Error('receiptId là bắt buộc.', 400);
  return receiptId;
}

export function productPayload(data) {
  const receiptId = requireReceipt(data);
  return {
    receiptId,
    name: String(data?.name || '').trim(),
    size: optionalText(data?.size),
    shelfLocation: optionalText(data?.shelfLocation),
    photoUrls: Array.isArray(data?.photoUrls) ? data.photoUrls : [],
      ...(data?.categoryId ? { categoryId: data.categoryId } : {}),
      ...(data?.brandId ? { brandId: data.brandId } : {}),
      ...(data?.color ? { color: optionalText(data.color) } : {}),
      ...(data?.description ? { description: optionalText(data.description) } : {}),
  };
}

export function createdProduct(res, payload) {
  const sku = res?.id || res?.sku;
  return { ...res, sku, id: sku, name: res?.name || payload.name, status: res?.status || 'ON_SALE' };
}

export function uploadedPhoto(res) {
  const url = res?.url || res?.fileUrl || (typeof res === 'string' ? res : '');
  return { url, ...res };
}
