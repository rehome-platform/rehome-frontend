import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { isFixtureMode } from '../config/warehouseContract.js';
import { Phase2Error } from '../models/warehouseModel.js';
import { callBackend } from './warehouseTransport.js';

function normalizeCampaign(c) {
  if (!c) return null;
  return {
    ...c,
    id: c.id,
    title: c.title || 'Chiến dịch quyên góp',
    endTime: c.endTime || null,
    preferredItemTypes: Array.isArray(c.preferredItemTypes) ? c.preferredItemTypes : [],
    organizationId: c.organization?.id || c.organization?.accountId || c.organizationId || null,
    organizationName: c.organization?.displayName || c.organizationName || 'Tổ chức',
    warehouses: Array.isArray(c.warehouses) ? c.warehouses : [],
  };
}

function extractSkuFromNote(note) {
  const match = typeof note === 'string' ? note.match(/SKU\s+([A-Za-z0-9-]+)/i) : null;
  return match ? match[1] : null;
}

function normalizeDonation(d) {
  if (!d) return null;
  const productObj = d.product && typeof d.product === 'object' ? d.product : null;
  const sku = productObj?.sku || productObj?.id || d.productId || d.sku || extractSkuFromNote(d.note);
  const productName = productObj?.name || d.productName || null;
  const productPhotoUrl = productObj?.photoUrl || productObj?.imageUrl || d.productPhotoUrl || d.photoUrl || null;
  const source =
    d.source ||
    (sku || (typeof d.note === 'string' && d.note.startsWith('Món ký gửi:')) ? 'CONSIGNED_ITEM' : 'DIRECT');
  return {
    ...d,
    id: d.id,
    sku,
    productName,
    productPhotoUrl,
    source,
    isConsignedItem: source === 'CONSIGNED_ITEM',
    recordedBy: d.recordedBy || d.moderatorCode || d.recordedByName || null,
    handedOverToOrganizationName: d.handedOverToOrganizationName || d.organizationName || null,
    status: d.status || 'PENDING_PICKUP',
  };
}

export const donationService = {
  myWarehouses: async (options = {}) => {
    if (isFixtureMode) {
      return [{ id: 'wh-1', name: 'Điểm ký gửi - TPHCM' }];
    }
    const res = await callBackend(
      { method: 'get', url: API_ENDPOINTS.MODERATOR.MY_WAREHOUSES },
      { signal: options?.signal },
    );
    return Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : []);
  },

  warehouseCampaigns: async (warehouseId, options = {}) => {
    if (!warehouseId) return [];
    if (isFixtureMode) return [];
    try {
      const res = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.WAREHOUSE_CAMPAIGNS(warehouseId),
          params: { page: 0, size: 50 },
        },
        { signal: options?.signal },
      );
      const list = res?.content || res?.items || (Array.isArray(res) ? res : []);
      return list.map(normalizeCampaign).filter(Boolean);
    } catch (err) {
      if (err?.status === 404 || err?.status === 405) {
        const res = await callBackend(
          {
            method: 'get',
            url: API_ENDPOINTS.MODERATOR.PUBLIC_CAMPAIGNS,
            params: { status: 'OPEN', page: 0, size: 50 },
          },
          { signal: options?.signal },
        );
        const list = res?.content || res?.items || (Array.isArray(res) ? res : []);
        return list
          .map(normalizeCampaign)
          .filter((c) => c && c.warehouses.some((w) => String(w.id) === String(warehouseId)));
      }
      throw err;
    }
  },

  listDonations: async (warehouseId, { campaignId, status } = {}, options = {}) => {
    if (!warehouseId) return [];
    if (isFixtureMode) return [];
    const res = await callBackend(
      {
        method: 'get',
        url: API_ENDPOINTS.MODERATOR.WAREHOUSE_DONATIONS(warehouseId),
        params: {
          ...(campaignId ? { campaignId } : {}),
          ...(status ? { status } : {}),
        },
      },
      { signal: options?.signal },
    );
    const list = Array.isArray(res) ? res : (res?.content || res?.items || []);
    return list.map(normalizeDonation).filter(Boolean);
  },

  recordDonation: async (warehouseId, { campaignId, donorName, isAnonymous, note } = {}, options = {}) => {
    if (!warehouseId) throw new Phase2Error('Chưa xác định được điểm ký gửi.', 400);
    if (!campaignId) throw new Phase2Error('Vui lòng chọn chiến dịch.', 400);
    const anonymous = Boolean(isAnonymous);
    const trimmedName = String(donorName || '').trim();
    if (!anonymous && !trimmedName) {
      throw new Phase2Error('Vui lòng nhập tên người quyên góp hoặc chọn ẩn danh.', 400);
    }
    const res = await callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.WAREHOUSE_DONATIONS(warehouseId),
        data: {
          campaignId,
          donorName: anonymous ? null : trimmedName,
          isAnonymous: anonymous,
          note: String(note || '').trim(),
        },
      },
      { signal: options?.signal },
    );
    return normalizeDonation(res);
  },

  handoverDonations: async (warehouseId, { donationIds, organizationId, campaignId } = {}, options = {}) => {
    if (!warehouseId) throw new Phase2Error('Chưa xác định được điểm ký gửi.', 400);
    if (!Array.isArray(donationIds) || !donationIds.length) {
      throw new Phase2Error('Vui lòng chọn ít nhất một lượt quyên góp để bàn giao.', 400);
    }
    if (!organizationId || !campaignId) {
      throw new Phase2Error('Thiếu thông tin tổ chức hoặc chiến dịch tiếp nhận.', 400);
    }
    return callBackend(
      {
        method: 'post',
        url: API_ENDPOINTS.MODERATOR.HANDOVER_DONATIONS(warehouseId),
        data: { donationIds, organizationId, campaignId },
      },
      { signal: options?.signal },
    );
  },
};

