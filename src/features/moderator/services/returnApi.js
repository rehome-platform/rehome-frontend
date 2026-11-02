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

  return {
    id,
    code,
    orderId: raw.orderNo || raw.orderId || 'ORD-2026',
    sku: raw.sku || raw.productId || 'RH-C2M08P',
    itemName: raw.productName || raw.itemName || 'Sản phẩm ký gửi',
    brand: raw.brandName || raw.brand || 'ReHome',
    category: raw.categoryName || raw.category || 'Thời trang',
    size: raw.size || 'M',
    condition: raw.condition || 'Mới 90%',
    consignPrice: raw.consignPrice || raw.originalPrice || 350000,
    amount: raw.refundAmount || raw.amount || 320000,
    shippingFee: raw.shippingFee || 22000,
    buyerName: raw.buyerName || 'Người mua ReHome',
    buyerPhone: raw.buyerPhone || '0903 ••• 882',
    consignorName: raw.consignorName || 'Người ký gửi',
    consignorCode: raw.consignorCode || 'MB-001294',
    reason: raw.reason || '',
    conditionNote: raw.conditionNote || '',
    photoUrls: Array.isArray(raw.photoUrls) ? raw.photoUrls : [],
    photos: Array.isArray(raw.photos) ? raw.photos : (Array.isArray(raw.photoUrls) ? raw.photoUrls : []),
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

    try {
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
        { fallback, signal: options?.signal }
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
          total: res.total || res.data.length,
        };
      }
      if (Array.isArray(res)) {
        return { data: res.map(mapReturnItem), total: res.length };
      }
      if (res && Array.isArray(res.items)) {
        return {
          data: res.items.map(mapReturnItem),
          total: res.total || res.items.length,
        };
      }
      return fallback();
    } catch (err) {
      if (fallback) return fallback();
      throw err;
    }
  },

  /**
   * API 80: Lấy chi tiết một yêu cầu trả hàng
   */
  detail: async (retId, options = {}) => {
    const fallback = () => returnMockApi.detail(retId);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.RETURN_DETAIL(retId),
        },
        { fallback, signal: options?.signal }
      );
      const raw = res?.data || res || (await fallback());
      return mapReturnItem(raw);
    } catch (err) {
      if (fallback) return fallback();
      throw err;
    }
  },

  /**
   * API 83 / F-131: Duyệt yêu cầu trả hàng & Tạo vận đơn thu hồi GHN
   */
  approveReturnAndCreateWaybill: async (retId, options = {}) => {
    const fallback = () => returnMockApi.approveReturnAndCreateWaybill(retId);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.APPROVE_RETURN(retId),
        },
        { fallback, signal: options?.signal }
      );
      return res?.data || res || fallback();
    } catch (err) {
      if (fallback) return fallback();
      throw err;
    }
  },

  /**
   * API 84 / F-131: Từ chối yêu cầu trả hàng kèm lý do
   */
  rejectReturn: async (retId, reason, options = {}) => {
    const fallback = () => returnMockApi.rejectReturn(retId, reason);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.REJECT_RETURN(retId),
          data: { reason },
        },
        { fallback, signal: options?.signal }
      );
      return res?.data || res || fallback();
    } catch (err) {
      if (fallback) return fallback();
      throw err;
    }
  },

  /**
   * API 85 / F-132: Kiểm tra hàng về kho (Đối chiếu SKU, tình trạng hàng)
   */
  inspect: async (retId, inspectionData = {}, options = {}) => {
    const fallback = () => returnMockApi.inspect(retId, inspectionData);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.INSPECT_RETURN(retId),
          data: {
            matchesOriginal: inspectionData.matchesOriginal ?? true,
            degraded: inspectionData.degraded ?? false,
            counterfeitSuspected: inspectionData.counterfeitSuspected ?? false,
            conditionNote: inspectionData.conditionNote || 'Đã kiểm tra hàng về kho',
          },
        },
        { fallback, signal: options?.signal }
      );
      return res?.data || res || fallback();
    } catch (err) {
      if (fallback) return fallback();
      throw err;
    }
  },

  /**
   * API 86 / F-134: Đánh dấu nghi vấn hàng giả (Gắn cờ yêu cầu Moderator 2 kiểm định chéo)
   */
  flagCounterfeit: async (retId, options = {}) => {
    const fallback = () => returnMockApi.flagCounterfeit(retId);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.FLAG_COUNTERFEIT(retId),
        },
        { fallback, signal: options?.signal }
      );
      return res?.data || res || fallback();
    } catch (err) {
      if (fallback) return fallback();
      throw err;
    }
  },

  /**
   * API 87 / F-135: Moderator thứ hai kết luận cuối cùng về nghi vấn hàng giả
   */
  counterfeitConclusion: async (retId, conclusionData = {}, options = {}) => {
    const fallback = () => returnMockApi.counterfeitConclusion(retId, conclusionData);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.COUNTERFEIT_CONCLUSION(retId),
          data: {
            conclusion: conclusionData.conclusion || 'CONFIRMED',
            note: conclusionData.note || '',
            secondModerator: conclusionData.secondModerator || '',
          },
        },
        { fallback, signal: options?.signal }
      );
      return res?.data || res || fallback();
    } catch (err) {
      if (fallback) return fallback();
      throw err;
    }
  },

  /**
   * API 88 / F-133: Chốt xử lý hợp lệ (Hoàn tiền + Chọn Relist hoặc Return Seller)
   */
  resolveValid: async (retId, outcome, options = {}) => {
    const fallback = () => returnMockApi.resolveValid(retId, outcome);
    if (isFixtureMode) return fallback();

    try {
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
        { fallback, signal: options?.signal }
      );
      return res?.data || res || fallback();
    } catch (err) {
      if (fallback) return fallback();
      throw err;
    }
  },

  /**
   * API 88 / F-133: Chốt xử lý không hợp lệ (Lưu kho 7 ngày chờ khách nhận lại)
   */
  resolveInvalid: async (retId, reason, options = {}) => {
    const fallback = () => returnMockApi.resolveInvalid(retId, reason);
    if (isFixtureMode) return fallback();

    try {
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
        { fallback, signal: options?.signal }
      );
      return res?.data || res || fallback();
    } catch (err) {
      if (fallback) return fallback();
      throw err;
    }
  },

  /**
   * API 89 / F-136: Đánh dấu hàng trả thất lạc do vận chuyển (TH-08) & Hoàn tiền người mua
   */
  markLost: async (retId, note, options = {}) => {
    const fallback = () => returnMockApi.markLost(retId, note);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.MARK_LOST(retId),
          data: { note: note || 'GHN làm thất lạc trên đường vận chuyển về kho' },
        },
        { fallback, signal: options?.signal }
      );
      return res?.data || res || fallback();
    } catch (err) {
      if (fallback) return fallback();
      throw err;
    }
  },

  /**
   * API 93: Moderator mở ca hàng xuống cấp đề xuất đền (TH-04-XuongCap)
   */
  createDegradedCase: async (payload = {}, options = {}) => {
    const fallback = () => returnMockApi.createDegradedCase(payload);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'post',
          url: API_ENDPOINTS.MODERATOR.CREATE_DEGRADED_CASE,
          data: payload,
        },
        { fallback, signal: options?.signal }
      );
      return res?.data || res || fallback();
    } catch (err) {
      if (fallback) return fallback();
      throw err;
    }
  },

  /**
   * API 94: Xem chi tiết một ca hàng xuống cấp
   */
  getDegradedCase: async (id, options = {}) => {
    const fallback = () => returnMockApi.getDegradedCase(id);
    if (isFixtureMode) return fallback();

    try {
      const res = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.DEGRADED_CASE_DETAIL(id),
        },
        { fallback, signal: options?.signal }
      );
      return res?.data || res || fallback();
    } catch (err) {
      if (fallback) return fallback();
      throw err;
    }
  },
};

export default returnService;
