/**
 * ReHome - Return Processing Domain API Service
 * Wireframe: TH-01, TH-02, TH-03, TH-04, TH-07, TH-08
 * Specialization: Yêu cầu trả hàng & Kiểm tra hàng về kho
 */
import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { isFixtureMode } from '../config/warehouseContract.js';
import { callBackend } from './warehouseTransport.js';
import { returnMockApi } from './moderatorMockData.js';
import { inventoryService } from './inventoryApi.js';
import { latestDegradedCase } from '../models/degradedCaseModel.js';
import { Phase2Error } from '../models/warehouseModel.js';
import { formatDeadlineWithCountdown } from '../components/WarehouseUi.jsx';

export function needsItemAction(item) {
  return Boolean(
    item &&
    item.rawStatus === 'VALID' &&
    !item.itemAction &&
    !item.degraded
  );
}

/**
 * Dựng yêu cầu trả hàng tối thiểu từ pendingReturnRequestId của Tồn kho (GET /inventory, GET /products/{id})
 * để mở modal chọn phương án xử lý mà không phải gọi chéo return-requests.
 */
export function pendingReturnFromInventory(item) {
  const id = item?.pendingReturnRequestId;
  if (!id) return null;
  return {
    id,
    code: `YC-${String(id).replace(/-/g, '').substring(0, 8).toUpperCase()}`,
    rawStatus: 'VALID',
    status: 'RESOLVED',
    itemAction: null,
    degraded: false,
    sku: item.sku || item.id || null,
    productId: item.productId || item.id || item.sku || null,
    itemName: item.name || item.itemName || 'Sản phẩm ký gửi',
    brand: item.brandName || item.brand || null,
    size: item.size || null,
  };
}

/**
 * Chuẩn hóa một bản ghi yêu cầu trả hàng từ Backend thành model hiển thị cho UI
 */
export function mapReturnItem(raw) {
  if (!raw) return null;
  const id = raw.id || raw.returnId;
  const shortId = id ? String(id).replace(/-/g, '').substring(0, 8).toUpperCase() : '00000';
  const code = raw.code || (raw.returnCode ? raw.returnCode : `YC-${shortId}`);

  // Mapping status: Backend uses PENDING, APPROVED, SHIPPED_BACK, INSPECTING, VALID, INVALID, LOST, CANCELLED
  // Frontend tabs: PENDING_APPROVAL, WAITING_BUYER_DISPATCH, RETURNING, RECEIVED_INSPECT, RESOLVED
  let status = raw.status || 'PENDING_APPROVAL';
  if (status === 'PENDING') status = 'PENDING_APPROVAL';
  else if (status === 'APPROVED') status = 'WAITING_BUYER_DISPATCH';
  else if (status === 'SHIPPED_BACK') status = 'RETURNING';
  else if (status === 'INSPECTING') status = 'RECEIVED_INSPECT';
  else if (['VALID', 'INVALID', 'LOST', 'CANCELLED', 'REJECTED', 'COMPLETED', 'RESOLVED'].includes(status)) status = 'RESOLVED';

  const buyerPhotos = Array.isArray(raw.buyerPhotos)
    ? raw.buyerPhotos
    : (Array.isArray(raw.photoUrls) ? raw.photoUrls : []);

  const stockInPhotos = Array.isArray(raw.stockInPhotos)
    ? raw.stockInPhotos
    : (Array.isArray(raw.initialConsignmentPhotoUrls) ? raw.initialConsignmentPhotoUrls : []);

  const packingPhotoUrls = Array.isArray(raw.packingPhotoUrls) ? raw.packingPhotoUrls : [];

  const compensationAmount = raw.compensationAmount ?? null;
  const halfCompensationAmount = raw.halfCompensationAmount ?? (
    compensationAmount != null && raw.degradedCompensationRate != null
      ? Number(compensationAmount) * Number(raw.degradedCompensationRate) : null);
  const amount = raw.amount ?? raw.itemPrice ?? raw.priceAtOrder ?? raw.consignPrice ?? compensationAmount ?? raw.refundAmount ?? 0;

  const prevHistory = Array.isArray(raw.returnHistory) ? raw.returnHistory : [];
  const sellerCode = raw.sellerCode || raw.senderCode || raw.consignorCode || null;
  const senderCode = sellerCode || (raw.sellerName ? `MB-${String(raw.sellerName).substring(0, 6).toUpperCase()}` : null);
  const submittedAt = raw.submittedAt || (raw.createdAt ? new Date(raw.createdAt).toLocaleDateString('vi-VN') : 'Gần đây');

  const shipBackFeeDeadline = raw.shipBackFeeDeadline || raw.shipBackFeePaymentDeadline || null;
  const shipBackPaidAt = raw.shipBackPaidAt || raw.shipBackFeePaidAt || null;
  const shipBackShipDeadline = raw.shipBackShipDeadline || raw.shipBackDeadline || null;
  const shipBackFailedAt = raw.shipBackFailedAt || raw.shipBackDeliveryFailedAt || null;
  const composedShipBackAddress = [
    raw.shipBackAddressDetail,
    raw.shipBackWardName,
    raw.shipBackProvinceName,
  ].filter(Boolean).join(', ');
  const shipBackAddress = raw.shipBackAddress || composedShipBackAddress || null;
  const shipBackStatus = raw.shipBackStatus || null;

  return {
    id,
    code,
    rawOrderId: raw.orderId || null,
    orderId: raw.orderNo || raw.orderId || null,
    orderNo: raw.orderNo || raw.orderId || null,
    sku: raw.sku || raw.productId || null,
    productId: raw.productId || null,
    resolvedAt: raw.resolvedAt || null,
    createdAt: raw.createdAt || null,
    itemName: raw.productName || raw.itemName || 'Sản phẩm ký gửi',
    itemDetails: raw.itemDetails || [raw.brandName || raw.brand, raw.size, raw.condition].filter(Boolean).join(' · ') || 'Chưa có thông tin chi tiết',
    brand: raw.brandName || raw.brand || null,
    category: raw.categoryName || raw.category || null,
    size: raw.size || null,
    condition: raw.condition || null,
    consignPrice: raw.consignPrice ?? raw.originalPrice ?? null,
    amount,
    refundAmount: raw.refundAmount ?? null,
    discountAmount: raw.discountAmount ?? raw.voucherDiscount ?? null,
    shippingFee: raw.shippingFee ?? null,
    buyerName: raw.buyerName || null,
    buyerPhone: raw.buyerPhone || null,
    buyerAddress: raw.buyerAddress || 'Điểm kí gửi ReHome nhận hàng trả tại bưu cục GHN',
    buyerNote: raw.buyerNote || raw.conditionNote || '',
    consignorName: raw.sellerName || raw.consignorName || null,
    consignorCode: sellerCode || raw.consignorCode || senderCode,
    sellerCode,
    senderCode,
    sellerName: raw.sellerName || raw.consignorName || null,
    currentTerm: raw.currentTerm ?? raw.term ?? null,
    daysIntoTerm: raw.daysIntoTerm ?? raw.daysInTerm ?? null,
    termLengthDays: raw.termLengthDays ?? null,
    commissionRate: raw.commissionRate ?? null,
    degradedCompensationRate: raw.degradedCompensationRate ?? null,
    prevReturns: prevHistory.length > 0 ? `${prevHistory.length} lần` : 'Chưa có vi phạm',
    payoutStatus: raw.payoutStatus || 'Chưa chia (chờ hết hạn trả hàng)',
    submittedAt,
    initialConsignmentPhotoUrls: stockInPhotos,
    stockInPhotos,
    packingPhotoUrls,
    returnHistory: prevHistory,
    compensationAmount,
    halfCompensationAmount,
    reason: raw.reason || 'Không đúng mô tả hoặc ảnh',
    conditionNote: raw.conditionNote || '',
    photoUrls: buyerPhotos,
    photos: buyerPhotos,
    buyerPhotos,
    status,
    rawStatus: raw.status,
    carrierStatus: raw.carrierStatus || (
      status === 'PENDING_APPROVAL' ? 'Chờ duyệt' :
      status === 'WAITING_BUYER_DISPATCH' ? (
        raw.handoverDeadline
          ? `Đã duyệt${raw.ghnFallbackUsed ? ' (mã thu hồi nội bộ)' : ''} · Hạn bàn giao GHN: ${formatDeadlineWithCountdown(raw.handoverDeadline)}`
          : (raw.ghnFallbackUsed ? 'Đã duyệt · Mã thu hồi nội bộ (GHN fallback)' : 'Đã duyệt · Chờ người mua bàn giao GHN')
      ) :
      status === 'RETURNING' ? 'Đang chuyển về điểm kí gửi qua GHN' :
      status === 'RECEIVED_INSPECT' ? 'Hàng đã về điểm kí gửi · Chờ kiểm tra' :
      raw.status === 'VALID' && !raw.itemAction && !raw.degraded
        ? 'Đã hoàn tiền · Chờ chọn phương án xử lý' :
      raw.status === 'INVALID' ? (
        raw.pickedUpAt
          ? 'Hàng không hợp lệ · Đã bàn giao tại quầy'
          : shipBackStatus === 'FAILED' || shipBackFailedAt
            ? 'Hàng không hợp lệ · Giao thất bại, chờ nhận tại quầy'
            : shipBackStatus === 'DELIVERED' || raw.shipBackDeliveredAt
              ? 'Hàng không hợp lệ · Đã giao lại cho người mua'
              : shipBackStatus === 'SHIPPING' || raw.shipBackTrackingCode
                ? 'Hàng không hợp lệ · Đang gửi lại qua GHN'
                : shipBackStatus === 'PAID' || shipBackPaidAt
                  ? 'Hàng không hợp lệ · Đã trả phí gửi lại, chờ tạo vận đơn'
                  : shipBackStatus === 'AWAITING_PAYMENT' || shipBackFeeDeadline
                    ? 'Hàng không hợp lệ · Chờ người mua trả phí gửi lại'
                    : raw.pickupDeadline
                      ? `Hàng không hợp lệ · Hạn nhận lại: ${formatDeadlineWithCountdown(raw.pickupDeadline)}`
                      : 'Hàng không hợp lệ · Chờ khách nhận lại'
      ) :
      'Đã hoàn tất xử lý'
    ),
    counterfeitSuspected: Boolean(raw.counterfeitSuspected),
    counterfeitConclusion: raw.counterfeitConclusion || null,
    degraded: Boolean(raw.degraded),
    matchesOriginal: raw.matchesOriginal !== false,
    ghnReturnTrackingCode: raw.ghnReturnTrackingCode || '',
    ghnFallbackUsed: Boolean(raw.ghnFallbackUsed),
    handoverDeadline: raw.handoverDeadline || null,
    pickupDeadline: raw.pickupDeadline || null,
    pickedUpAt: raw.pickedUpAt || null,
    invalidReturnChoice: raw.invalidReturnChoice || null,
    shipBackFee: raw.shipBackFee ?? null,
    shipBackPaymentMethod: raw.shipBackPaymentMethod || null,
    shipBackFeeDeadline,
    shipBackFeePaymentDeadline: shipBackFeeDeadline,
    shipBackPaidAt,
    shipBackFeePaidAt: shipBackPaidAt,
    shipBackShipDeadline,
    shipBackDeadline: shipBackShipDeadline,
    shipBackTrackingCode: raw.shipBackTrackingCode || '',
    shipBackShippedAt: raw.shipBackShippedAt || null,
    shipBackDeliveredAt: raw.shipBackDeliveredAt || null,
    shipBackFailedAt,
    shipBackDeliveryFailedAt: shipBackFailedAt,
    shipBackDeliveryFailReason: raw.shipBackDeliveryFailReason || '',
    shipBackStatus,
    shipBackAddressId: raw.shipBackAddressId || null,
    shipBackRecipientName: raw.shipBackRecipientName || null,
    shipBackPhone: raw.shipBackPhone || null,
    shipBackAddressDetail: raw.shipBackAddressDetail || null,
    shipBackWardName: raw.shipBackWardName || null,
    shipBackAddress,
    shipBackProvinceName: raw.shipBackProvinceName || null,
    shipBackPrintUrl: raw.shipBackPrintUrl || null,
    returnDeadline: raw.returnDeadline || null,
    autoCompleteDeadline: raw.autoCompleteDeadline || null,
    paymentDeadline: raw.paymentDeadline || null,
    deliveredAt: raw.deliveredAt || null,
    itemAction: raw.itemAction || null,
    outcome: raw.itemAction || raw.outcome || null,
    rejectReason: raw.rejectReason || null,
    firstModNote: raw.firstModNote || raw.conditionNote || '',
  };
}

export const returnService = {
  /**
   * API 80 / F-131: Lấy danh sách hàng đợi yêu cầu trả hàng
   */
  list: async (params = {}, options = {}) => {
    const fallback = () => returnMockApi.list(params);
    if (isFixtureMode) return fallback();

    const status = params?.status && params.status !== 'ALL' ? params.status : undefined;
    const res = await callBackend(
      {
        method: 'get',
        url: API_ENDPOINTS.MODERATOR.RETURNS,
        params: {
          ...(status ? { status } : {}),
          ...(params?.page !== undefined ? { page: params.page } : {}),
          ...(params?.size !== undefined ? { size: params.size } : {}),
        },
      },
      { signal: options?.signal }
    );

    if (res && Array.isArray(res.content)) {
      return {
        data: res.content.map(mapReturnItem),
        total: res.totalElements ?? res.content.length,
        page: res.page ?? 0,
        totalPages: res.totalPages ?? 1,
      };
    }
    if (res && Array.isArray(res.data)) {
      return {
        data: res.data.map(mapReturnItem),
        total: res.total ?? res.data.length,
        page: res.page ?? 0,
        totalPages: res.totalPages ?? 1,
      };
    }
    if (Array.isArray(res)) {
      return { data: res.map(mapReturnItem), total: res.length, page: 0, totalPages: 1 };
    }
    if (res && Array.isArray(res.items)) {
      return {
        data: res.items.map(mapReturnItem),
        total: res.total ?? res.items.length,
        page: res.page ?? 0,
        totalPages: res.totalPages ?? 1,
      };
    }
    throw new Error('Invalid response structure from return queue');
  },

  /**
   * Tải toàn bộ các trang của hàng đợi theo một trạng thái (hoặc hàng đợi mở mặc định khi bỏ trống status)
   */
  listAllByStatus: async (status, options = {}) => {
    const collected = [];
    let page = 0;
    let totalPages = 1;
    const maxPages = 10;

    while (page < Math.min(totalPages, maxPages)) {
      if (options?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const res = await returnService.list(
        { ...(status ? { status } : {}), page, size: 100 },
        options
      );
      const rows = Array.isArray(res?.data) ? res.data : [];
      collected.push(...rows);
      totalPages = Number(res?.totalPages) || 1;
      if (rows.length === 0 || page + 1 >= totalPages) break;
      page += 1;
    }
    return collected;
  },

  /**
   * Danh sách yêu cầu đã hoàn tiền (VALID) nhưng chưa chọn phương án xử lý món (itemAction == null, !degraded)
   */
  listPendingDispositions: async (options = {}) => {
    const validRows = await returnService.listAllByStatus('VALID', options);
    return validRows.filter(needsItemAction);
  },

  /**
   * Tìm yêu cầu trả hàng đang chờ chọn phương án xử lý theo SKU sản phẩm
   */
  findPendingDispositionBySku: async (sku, options = {}) => {
    const targetSku = String(sku || '').trim().toUpperCase();
    if (!targetSku) return null;
    const pending = await returnService.listPendingDispositions(options);
    return (
      pending.find(
        (item) => String(item?.sku || item?.productId || '').trim().toUpperCase() === targetSku
      ) || null
    );
  },

  /**
   * Tải tổng hợp cho workspace Moderator: hàng đợi mở + các đơn VALID (bao gồm đơn chờ xử lý món) + lịch sử
   */
  listForWorkspace: async (options = {}) => {
    if (isFixtureMode) {
      return returnService.list({}, options);
    }

    const [openRows, validRows] = await Promise.all([
      returnService.listAllByStatus(undefined, options),
      returnService.listAllByStatus('VALID', options).catch(() => []),
    ]);

    const historySettled = await Promise.allSettled(
      ['INVALID', 'LOST', 'CANCELLED'].map((st) => returnService.listAllByStatus(st, options))
    );
    const historyRows = historySettled.flatMap((entry) =>
      entry.status === 'fulfilled' && Array.isArray(entry.value) ? entry.value : []
    );

    const mergedMap = new Map();
    for (const item of [...openRows, ...validRows, ...historyRows]) {
      if (!item?.id) continue;
      const key = String(item.id);
      const existing = mergedMap.get(key);
      mergedMap.set(key, existing ? { ...existing, ...item } : item);
    }
    const merged = Array.from(mergedMap.values());
    return { data: merged, total: merged.length, page: 0, totalPages: 1 };
  },

  /**
   * API 80: Lấy chi tiết một yêu cầu trả hàng
   */
  detail: async (retId, options = {}) => {
    const fallback = () => returnMockApi.detail(retId);
    if (isFixtureMode) return fallback();

    const res = await callBackend(
      {
        method: 'get',
        url: API_ENDPOINTS.MODERATOR.RETURN_DETAIL(retId),
      },
      { signal: options?.signal }
    );
    const raw = res?.data || res;
    const mapped = mapReturnItem(raw);

    const orderIdToFetch = raw?.orderId;
    if (mapped && orderIdToFetch) {
      try {
        const orderRes = await callBackend(
          {
            method: 'get',
            url: `/orders/${encodeURIComponent(orderIdToFetch)}`,
          },
          { signal: options?.signal }
        );
        const order = orderRes?.data || orderRes;
        if (order) {
          const firstItem = Array.isArray(order.items) && order.items.length > 0 ? order.items[0] : null;
          if (firstItem) {
            mapped.sku = firstItem.productId || firstItem.sku || mapped.sku;
            mapped.productId = firstItem.productId || mapped.productId;
            mapped.itemName = (mapped.itemName === 'Sản phẩm ký gửi' && firstItem.name) ? firstItem.name : mapped.itemName;
            mapped.brand = firstItem.brandName || mapped.brand;
            mapped.size = firstItem.size || mapped.size;
            mapped.condition = firstItem.condition || mapped.condition;
            mapped.amount = firstItem.priceAtOrder ?? firstItem.price ?? mapped.amount;
            mapped.itemDetails = [firstItem.brandName, firstItem.size].filter(Boolean).join(' · ');
          }
          const fullAddress = [order.shippingAddressDetail, order.shippingWardName, order.shippingProvinceName]
            .filter(Boolean)
            .join(', ');
          if (fullAddress) mapped.buyerAddress = fullAddress;
          if (order.shippingPhone) mapped.buyerPhone = order.shippingPhone;
          if (order.shippingRecipientName) mapped.buyerName = order.shippingRecipientName;
          if (order.returnDeadline) mapped.returnDeadline = order.returnDeadline;
          if (order.autoCompleteDeadline) mapped.autoCompleteDeadline = order.autoCompleteDeadline;
          if (order.paymentDeadline) mapped.paymentDeadline = order.paymentDeadline;
          if (order.deliveredAt) mapped.deliveredAt = order.deliveredAt;
          if (mapped.discountAmount == null && (order.discountAmount != null || order.voucherDiscount != null)) {
            mapped.discountAmount = order.discountAmount ?? order.voucherDiscount;
          }
          if (mapped.shippingFee == null && order.shippingFee != null) {
            mapped.shippingFee = order.shippingFee;
          }
          if (mapped.refundAmount == null && order.refundAmount != null) {
            mapped.refundAmount = order.refundAmount;
          }
          if ((!mapped.packingPhotoUrls || mapped.packingPhotoUrls.length === 0) && Array.isArray(order.packingPhotoUrls) && order.packingPhotoUrls.length > 0) {
            mapped.packingPhotoUrls = order.packingPhotoUrls;
          }
        }
      } catch (err) {
        // Fallback gracefully without breaking return detail
      }
    }
    return mapped;
  },

  /**
   * API 83 / F-131: Duyệt yêu cầu trả hàng & Tạo vận đơn thu hồi GHN
   */
  approveReturnAndCreateWaybill: async (retId, options = {}) => {
    const fallback = () => returnMockApi.approveReturnAndCreateWaybill(retId);
    if (isFixtureMode) return fallback();

    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.APPROVE_RETURN(retId),
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },

  /**
   * API 84 / F-131: Từ chối yêu cầu trả hàng kèm lý do
   */
  rejectReturn: async (retId, reason, options = {}) => {
    const fallback = () => returnMockApi.rejectReturn(retId, reason);
    if (isFixtureMode) return fallback();

    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.REJECT_RETURN(retId),
        data: { reason },
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },

  /**
   * API 85 / F-132: Kiểm tra hàng về kho (Đối chiếu SKU, tình trạng hàng)
   */
  inspect: async (retId, inspectionData = {}, options = {}) => {
    const evidenceImageUrls = inspectionData.evidenceImageUrls;
    if (!Array.isArray(evidenceImageUrls) || evidenceImageUrls.length < 2 || evidenceImageUrls.length > 5 ||
        evidenceImageUrls.some(url => typeof url !== 'string' || !/^https?:\/\//i.test(url))) {
      throw new Error('Cần tải lên từ 2 đến 5 ảnh bằng chứng kiểm hàng.');
    }
    const fallback = () => returnMockApi.inspect(retId, inspectionData);
    if (isFixtureMode) return fallback();

    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.INSPECT_RETURN(retId),
        data: {
          matchesOriginal: inspectionData.matchesOriginal ?? true,
          degraded: inspectionData.degraded ?? false,
          counterfeitSuspected: inspectionData.counterfeitSuspected ?? false,
          conditionNote: inspectionData.conditionNote || 'Đã kiểm tra hàng về điểm kí gửi',
          evidenceImageUrls,
        },
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },

  /**
   * API 86 / F-134: Đánh dấu nghi vấn hàng giả (Gắn cờ yêu cầu Moderator 2 kiểm định chéo)
   */
  flagCounterfeit: async (retId, options = {}) => {
    const fallback = () => returnMockApi.flagCounterfeit(retId);
    if (isFixtureMode) return fallback();

    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.FLAG_COUNTERFEIT(retId),
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },

  /**
   * API 87 / F-135: Moderator thứ hai kết luận cuối cùng về nghi vấn hàng giả
   */
  counterfeitConclusion: async (retId, conclusionData = {}, options = {}) => {
    const fallback = () => returnMockApi.counterfeitConclusion(retId, conclusionData);
    if (isFixtureMode) return fallback();

    const conclusion = conclusionData.verdict || conclusionData.conclusion || 'CONFIRMED';
    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.COUNTERFEIT_CONCLUSION(retId),
        data: {
          conclusion,
          verdict: conclusion,
          note: conclusionData.note || '',
          secondModerator: conclusionData.secondModerator || '',
        },
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },

  /**
   * API 88 / F-133: Chốt xử lý hợp lệ (Bước 1: Hoàn tiền người mua; hoặc 1 bước nếu truyền outcome)
   */
  resolveValid: async (retId, outcome, options = {}) => {
    const fallback = () => returnMockApi.resolveValid(retId, outcome);
    if (isFixtureMode) return fallback();

    const payload = {
      resolution: 'VALID',
      resolutionNote:
        options?.resolutionNote ||
        (outcome === 'DISCARD' ? (options?.discardReason || 'Tiêu huỷ hàng hỏng/giả') : 'Hàng đúng tình trạng, duyệt hoàn tiền'),
    };
    if (outcome) {
      payload.action = outcome;
    }

    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.RESOLVE_RETURN(retId),
        data: payload,
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },

  /**
   * Bước 2 (TH-04): Chọn phương án xử lý món hàng sau khi đã hoàn tiền cho người mua
   */
  applyItemAction: async (retId, outcome, options = {}) => {
    const fallback = () => returnMockApi.resolveValid(retId, outcome);
    if (isFixtureMode) return fallback();

    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.RETURN_ITEM_ACTION(retId),
        data: {
          action: outcome,
        },
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },

  /**
   * API 88 / F-133: Chốt xử lý không hợp lệ (Lưu kho 7 ngày chờ khách nhận lại)
   */
  resolveInvalid: async (retId, reason, options = {}) => {
    const fallback = () => returnMockApi.resolveInvalid(retId, reason);
    if (isFixtureMode) return fallback();

    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.RESOLVE_RETURN(retId),
        data: {
          resolution: 'INVALID',
          resolutionNote: reason,
        },
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },

  /**
   * API 89 / F-136: Đánh dấu hàng trả thất lạc do vận chuyển (TH-08) & Hoàn tiền người mua
   */
  markLost: async (retId, note, options = {}) => {
    const fallback = () => returnMockApi.markLost(retId, note);
    if (isFixtureMode) return fallback();

    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.MARK_LOST(retId),
        data: { note: note || 'GHN làm thất lạc trên đường vận chuyển về điểm kí gửi' },
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },

  /**
   * API 93: Moderator mở ca hàng xuống cấp đề xuất đền (TH-04-XuongCap)
   */
  createDegradedCase: async (payload = {}, options = {}) => {
    const fallback = () => returnMockApi.createDegradedCase(payload);
    if (isFixtureMode) return fallback();

    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.CREATE_DEGRADED_CASE,
        data: payload,
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },

  /**
   * API 94: Xem chi tiết một ca hàng xuống cấp
   */
  getDegradedCase: async (id, options = {}) => {
    const fallback = () => returnMockApi.getDegradedCase(id);
    if (isFixtureMode) return fallback();

    const res = await callBackend(
      {
        method: 'get',
        url: API_ENDPOINTS.MODERATOR.DEGRADED_CASE_DETAIL(id),
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },

  findDegradedCase: async (productId, options = {}) => {
    if (!productId) throw new Phase2Error('Chưa xác định được sản phẩm để tra cứu biên bản hàng xuống cấp. Vui lòng tải lại chi tiết yêu cầu trả hàng.', 404);
    const cases = await inventoryService.degradedCases({}, options);
    const item = latestDegradedCase(cases, productId, options.notBefore);
    if (!item) throw new Phase2Error('Chưa tải được biên bản hàng xuống cấp. Vui lòng thử lại để tải biên bản; không cần chốt hoàn tiền lại.', 404);
    return returnService.getDegradedCase(item.id, options);
  },

  /**
   * Tạo vận đơn GHN gửi lại hàng trả không hợp lệ cho người mua (QueueType.RETURN_SHIP_BACK)
   * POST /return-requests/{id}/ship-back/ship
   */
  shipBack: async (retId, options = {}) => {
    if (isFixtureMode) {
      return {
        id: retId,
        shipBackTrackingCode: `GHN-SB-${String(retId).slice(0, 6).toUpperCase()}`,
        shipBackShippedAt: new Date().toISOString(),
        shipBackPrintUrl: '',
      };
    }

    try {
      const res = await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.SHIP_BACK_RETURN(retId),
        },
        { signal: options?.signal }
      );
      const raw = res?.data || res;
      return mapReturnItem(raw) || raw;
    } catch (err) {
      if (err?.status === 502 || /GHN/i.test(String(err?.code || ''))) {
        throw new Phase2Error('GHN chưa tạo được vận đơn, thử lại', 502, err?.code || 'GHN_ERROR');
      }
      throw err;
    }
  },

  /**
   * Lấy link in nhãn GHN cho vận đơn gửi lại hàng trả không hợp lệ
   * GET /return-requests/{id}/ship-back/label?size=A5
   */
  shipBackLabel: async (retId, size = 'A5', options = {}) => {
    if (isFixtureMode) {
      return { id: retId, ghnTrackingCode: `GHN-SB-${String(retId).slice(0, 6).toUpperCase()}`, size, printUrl: '' };
    }

    const res = await callBackend(
      {
        method: 'get',
        url: API_ENDPOINTS.MODERATOR.SHIP_BACK_LABEL(retId),
        params: { size },
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },

  /**
   * Nhả / chuyển ca kiểm tra yêu cầu trả hàng cho Moderator khác
   * POST /return-requests/{id}/release
   */
  release: async (retId, options = {}) => {
    if (isFixtureMode) return { id: retId, released: true };

    const res = await callBackend(
      {
        method: 'post',
        url: `/return-requests/${encodeURIComponent(retId)}/release`,
      },
      { signal: options?.signal }
    );
    return res?.data || res;
  },
};

export default returnService;
