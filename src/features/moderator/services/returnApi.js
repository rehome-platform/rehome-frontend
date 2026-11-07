/**
 * ReHome - Return Processing Domain API Service
 * Wireframe: TH-01, TH-02, TH-03, TH-04, TH-07, TH-08
 * Specialization: Yêu cầu trả hàng & Kiểm tra hàng về kho
 */
import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { isFixtureMode } from '../config/warehouseContract.js';
import { callBackend } from './warehouseTransport.js';
import { returnMockApi } from './moderatorMockData.js';

/**
 * Chuẩn hóa một bản ghi yêu cầu trả hàng từ Backend thành model hiển thị cho UI
 */
export function mapReturnItem(raw) {
  if (!raw) return null;
  const id = raw.id || raw.returnId;
  const shortId = id ? String(id).substring(0, 5).toUpperCase() : '00000';
  const code = raw.code || (raw.returnCode ? raw.returnCode : `YC-${shortId}`);

  // Mapping status: Backend uses PENDING, APPROVED, SHIPPED_BACK, INSPECTING, VALID, INVALID, LOST, CANCELLED
  // Frontend tabs: PENDING_APPROVAL, WAITING_BUYER_DISPATCH, RETURNING, RECEIVED_INSPECT, RESOLVED
  let status = raw.status || 'PENDING_APPROVAL';
  if (status === 'PENDING') status = 'PENDING_APPROVAL';
  else if (status === 'APPROVED') status = 'WAITING_BUYER_DISPATCH';
  else if (status === 'SHIPPED_BACK') status = 'RETURNING';
  else if (status === 'INSPECTING') status = 'RECEIVED_INSPECT';
  else if (['VALID', 'INVALID', 'LOST', 'CANCELLED'].includes(status)) status = 'RESOLVED';

  const buyerPhotos = Array.isArray(raw.buyerPhotos)
    ? raw.buyerPhotos
    : (Array.isArray(raw.photoUrls) ? raw.photoUrls : []);

  const stockInPhotos = Array.isArray(raw.stockInPhotos)
    ? raw.stockInPhotos
    : (Array.isArray(raw.initialConsignmentPhotoUrls) ? raw.initialConsignmentPhotoUrls : []);

  const compensationAmount = raw.compensationAmount ?? null;
  const halfCompensationAmount = raw.halfCompensationAmount ?? (compensationAmount ? Math.round(compensationAmount * 0.5) : null);
  const amount = raw.amount ?? raw.itemPrice ?? raw.priceAtOrder ?? raw.consignPrice ?? compensationAmount ?? raw.refundAmount ?? 0;

  const prevHistory = Array.isArray(raw.returnHistory) ? raw.returnHistory : [];
  const senderCode = raw.senderCode || raw.consignorCode || (raw.sellerName ? `MB-${String(raw.sellerName).substring(0, 6).toUpperCase()}` : 'MB-002190');
  const submittedAt = raw.submittedAt || (raw.createdAt ? new Date(raw.createdAt).toLocaleDateString('vi-VN') : 'Gần đây');

  return {
    id,
    code,
    rawOrderId: raw.orderId || null,
    orderId: raw.orderNo || raw.orderId || null,
    orderNo: raw.orderNo || raw.orderId || null,
    sku: raw.sku || raw.productId || null,
    itemName: raw.productName || raw.itemName || 'Sản phẩm ký gửi',
    itemDetails: raw.itemDetails || [raw.brandName || raw.brand, raw.size, raw.condition].filter(Boolean).join(' · ') || 'Chưa có thông tin chi tiết',
    brand: raw.brandName || raw.brand || null,
    category: raw.categoryName || raw.category || null,
    size: raw.size || null,
    condition: raw.condition || null,
    consignPrice: raw.consignPrice ?? raw.originalPrice ?? null,
    amount,
    refundAmount: raw.refundAmount ?? raw.amount ?? null,
    shippingFee: raw.shippingFee ?? null,
    buyerName: raw.buyerName || null,
    buyerPhone: raw.buyerPhone || null,
    buyerAddress: raw.buyerAddress || 'Kho ReHome nhận hàng trả tại bưu cục GHN',
    buyerNote: raw.buyerNote || raw.conditionNote || raw.reason || 'Sản phẩm không đúng như mô tả trên đơn',
    consignorName: raw.sellerName || raw.consignorName || null,
    consignorCode: raw.consignorCode || senderCode,
    senderCode,
    sellerName: raw.sellerName || raw.consignorName || null,
    prevReturns: prevHistory.length > 0 ? `${prevHistory.length} lần` : 'Chưa có vi phạm',
    payoutStatus: raw.payoutStatus || 'Chưa chia (chờ hết hạn trả hàng)',
    submittedAt,
    initialConsignmentPhotoUrls: stockInPhotos,
    stockInPhotos,
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
      status === 'PENDING_APPROVAL' ? 'Chờ duyệt · Còn 9 giờ' :
      status === 'WAITING_BUYER_DISPATCH' ? 'Đã duyệt · Chờ người mua bàn giao GHN' :
      status === 'RETURNING' ? 'Đang chuyển về kho qua GHN' :
      status === 'RECEIVED_INSPECT' ? 'Hàng đã về kho · Chờ kiểm tra' :
      'Đã hoàn tất xử lý'
    ),
    counterfeitSuspected: Boolean(raw.counterfeitSuspected),
    counterfeitConclusion: raw.counterfeitConclusion || null,
    degraded: Boolean(raw.degraded),
    matchesOriginal: raw.matchesOriginal !== false,
    ghnReturnTrackingCode: raw.ghnReturnTrackingCode || '',
    handoverDeadline: raw.handoverDeadline || null,
    pickupDeadline: raw.pickupDeadline || null,
    outcome: raw.itemAction || raw.outcome || (raw.status === 'VALID' ? 'RELIST' : null),
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
            mapped.itemName = (mapped.itemName === 'Sản phẩm ký gửi' && firstItem.name) ? firstItem.name : mapped.itemName;
            mapped.brand = firstItem.brandName || mapped.brand;
            mapped.size = firstItem.size || mapped.size;
            mapped.condition = firstItem.condition || mapped.condition;
            mapped.amount = firstItem.priceAtOrder || firstItem.price || mapped.amount;
            mapped.itemDetails = [firstItem.name, firstItem.brandName, firstItem.size].filter(Boolean).join(' · ');
          }
          const fullAddress = [order.shippingAddressDetail, order.shippingWardName, order.shippingProvinceName]
            .filter(Boolean)
            .join(', ');
          if (fullAddress) mapped.buyerAddress = fullAddress;
          if (order.shippingPhone) mapped.buyerPhone = order.shippingPhone;
          if (order.shippingRecipientName) mapped.buyerName = order.shippingRecipientName;
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
          conditionNote: inspectionData.conditionNote || 'Đã kiểm tra hàng về kho',
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
   * API 88 / F-133: Chốt xử lý hợp lệ (Hoàn tiền + Chọn Relist hoặc Return Seller)
   */
  resolveValid: async (retId, outcome, options = {}) => {
    const fallback = () => returnMockApi.resolveValid(retId, outcome);
    if (isFixtureMode) return fallback();

    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.RESOLVE_RETURN(retId),
        data: {
          resolution: 'VALID',
          action: outcome,
          resolutionNote: 'Hàng đúng tình trạng, duyệt hoàn tiền',
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
          action: 'DISCARD',
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
        data: { note: note || 'GHN làm thất lạc trên đường vận chuyển về kho' },
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
};

export default returnService;
