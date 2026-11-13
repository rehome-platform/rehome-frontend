import { API_ENDPOINTS } from '../../../configs/api.config.js';
import { isFixtureMode } from '../config/warehouseContract.js';
import { Phase2Error } from '../models/warehouseModel.js';
import { callBackend } from './warehouseTransport.js';

export const CAMPAIGN_STATUS_LABELS = {
  OPEN: 'Đang diễn ra',
  ACTIVE: 'Đang diễn ra',
  CLOSED: 'Đã đóng',
  EXPIRED: 'Đã hết hạn',
  LOCKED: 'Đã khóa',
  BANNED: 'Đã bị cấm',
  HIDDEN: 'Đã ẩn',
};

const INACTIVE_CAMPAIGN_STATUSES = new Set([
  'CLOSED',
  'EXPIRED',
  'LOCKED',
  'BANNED',
  'HIDDEN',
  'CANCELLED',
  'ENDED',
  'INACTIVE',
]);
const LOCKED_ORG_STATUSES = new Set(['LOCKED', 'BANNED', 'SUSPENDED']);

export function isCampaignActive(campaign, now = Date.now()) {
  if (!campaign) return false;
  if (campaign.organizationLocked) return false;
  const orgStatus = String(campaign.organizationStatus || '').toUpperCase();
  if (orgStatus && LOCKED_ORG_STATUSES.has(orgStatus)) return false;
  const status = String(campaign.status || 'OPEN').toUpperCase();
  if (INACTIVE_CAMPAIGN_STATUSES.has(status)) return false;
  if (campaign.endTime) {
    const endMs = new Date(campaign.endTime).getTime();
    if (!Number.isNaN(endMs) && endMs <= now) return false;
  }
  return true;
}

function normalizeCampaign(c) {
  if (!c) return null;
  const orgStatus = c.organization?.status || c.organizationStatus || null;
  const organizationLocked = Boolean(
    c.organization?.locked ||
    c.organizationLocked ||
    LOCKED_ORG_STATUSES.has(String(orgStatus || '').toUpperCase()),
  );
  const normalized = {
    ...c,
    id: c.id,
    title: c.title || 'Chiến dịch quyên góp',
    status: String(c.status || 'OPEN').toUpperCase(),
    endTime: c.endTime || null,
    preferredItemTypes: Array.isArray(c.preferredItemTypes) ? c.preferredItemTypes : [],
    organizationId: c.organization?.id || c.organization?.accountId || c.organizationId || null,
    organizationName: c.organization?.displayName || c.organizationName || 'Tổ chức',
    organizationStatus: orgStatus,
    organizationLocked,
    pendingCount: c.pendingCount ?? c.waitingCount ?? null,
    handedOverCount: c.handedOverCount ?? null,
    warehouses: Array.isArray(c.warehouses) ? c.warehouses : [],
  };
  normalized.isActive = isCampaignActive(normalized);
  return normalized;
}

function formatCampaignPage(rawRes, { view = 'ACTIVE', q = '', page = 0, size = 20 } = {}) {
  const isArray = Array.isArray(rawRes);
  const rawList = isArray ? rawRes : (rawRes?.content || rawRes?.items || []);
  let list = rawList.map(normalizeCampaign).filter(Boolean);

  // Enforce view filtering as fallback if backend ignores view=ACTIVE/HISTORY or returns locked orgs
  list = list.filter((c) => (view === 'HISTORY' ? !isCampaignActive(c) : isCampaignActive(c)));

  const trimmedQ = String(q || '').trim().toLowerCase();
  if (isArray && trimmedQ) {
    list = list.filter(
      (c) =>
        c.title.toLowerCase().includes(trimmedQ) ||
        c.organizationName.toLowerCase().includes(trimmedQ) ||
        c.preferredItemTypes.some((t) => String(t).toLowerCase().includes(trimmedQ)),
    );
  }

  if (isArray) {
    const totalElements = list.length;
    const totalPages = Math.ceil(totalElements / size);
    const items = list.slice(page * size, (page + 1) * size);
    return { items, page, size, totalElements, totalPages };
  }

  const totalElements = rawRes?.totalElements ?? list.length;
  const totalPages = rawRes?.totalPages ?? (list.length > 0 ? 1 : 0);
  return {
    items: list,
    page: rawRes?.number ?? rawRes?.page ?? page,
    size: rawRes?.size ?? size,
    totalElements,
    totalPages,
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

  warehouseCampaigns: async (warehouseId, paramsOrOptions = {}, maybeOptions = {}) => {
    const isLegacyOptions =
      paramsOrOptions &&
      typeof paramsOrOptions === 'object' &&
      'signal' in paramsOrOptions &&
      !('view' in paramsOrOptions) &&
      !('q' in paramsOrOptions) &&
      !('page' in paramsOrOptions);
    const params = isLegacyOptions ? {} : (paramsOrOptions || {});
    const options = isLegacyOptions ? paramsOrOptions : (maybeOptions || {});
    const view = params.view || 'ACTIVE';
    const q = params.q || '';
    const page = Number.isFinite(Number(params.page)) ? Number(params.page) : 0;
    const size = Number.isFinite(Number(params.size)) && Number(params.size) > 0 ? Number(params.size) : 20;

    if (!warehouseId) return { items: [], page, size, totalElements: 0, totalPages: 0 };
    if (isFixtureMode) return { items: [], page, size, totalElements: 0, totalPages: 0 };

    const trimmedQ = String(q || '').trim();
    const requestParams = {
      view,
      page,
      size,
      ...(trimmedQ ? { q: trimmedQ } : {}),
    };

    try {
      const res = await callBackend(
        {
          method: 'get',
          url: API_ENDPOINTS.MODERATOR.WAREHOUSE_CAMPAIGNS(warehouseId),
          params: requestParams,
        },
        { signal: options?.signal },
      );
      return formatCampaignPage(res, { view, q: trimmedQ, page, size });
    } catch (err) {
      if (err?.status === 404 || err?.status === 405) {
        const res = await callBackend(
          {
            method: 'get',
            url: API_ENDPOINTS.MODERATOR.PUBLIC_CAMPAIGNS,
            params: {
              status: view === 'HISTORY' ? 'CLOSED' : 'OPEN',
              page,
              size,
              ...(trimmedQ ? { q: trimmedQ } : {}),
            },
          },
          { signal: options?.signal },
        );
        const rawList = res?.content || res?.items || (Array.isArray(res) ? res : []);
        const warehouseFiltered = rawList.filter(
          (c) => c && Array.isArray(c.warehouses) && c.warehouses.some((w) => String(w.id) === String(warehouseId)),
        );
        return formatCampaignPage(warehouseFiltered, { view, q: trimmedQ, page, size });
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

