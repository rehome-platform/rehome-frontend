export const MIN_CONSIGNMENT_PRICE = 1000;

export const CONDITION_LABELS = {
  NEW_TAG: 'Mới, còn tem (100%)',
  LIKE_NEW: 'Như mới (99%)',
  GOOD: 'Tốt, có dấu hiệu dùng (90-95%)',
  FLAW: 'Có lỗi nhỏ (80-85%)',
};

export function normalizeConditionLevel(value) {
  if (!value) return 'LIKE_NEW';
  const raw = String(value).trim();
  if (!raw) return 'LIKE_NEW';
  const upper = raw.toUpperCase();
  if (CONDITION_LABELS[upper]) return upper;
  const lower = raw.toLowerCase();
  if (lower.includes('còn tem') || lower.includes('100%')) return 'NEW_TAG';
  if (lower.includes('như mới') || lower.includes('99%')) return 'LIKE_NEW';
  if (lower.includes('lỗi nhỏ') || lower.includes('80-85%')) return 'FLAW';
  if (lower.includes('tốt') || lower.includes('dấu hiệu') || lower.includes('90-95%')) return 'GOOD';
  return 'LIKE_NEW';
}

export function formatConditionLabel(value) {
  if (value == null) return 'Chưa khai báo';
  const raw = String(value).trim();
  if (!raw) return 'Chưa khai báo';
  const upper = raw.toUpperCase();
  return CONDITION_LABELS[upper] || raw;
}

export function validMoney(value) {
  return /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) >= MIN_CONSIGNMENT_PRICE;
}

export function extractReceiptId(receipt) {
  if (!receipt) return null;
  return receipt.receiptId || receipt.id || null;
}

export function canStockIn(receipt) {
  return !!receipt?.confirmedAt && !receipt?.productSku && !receipt?.sku;
}

function defaultActions(status) {
  const actions = {
    PENDING: ['APPROVE', 'REJECT'],
    APPROVED: ['START_INSPECTION'],
    INSPECTING: ['COMPLETE_INSPECTION', 'RETURN_ONSITE'],
  };
  return actions[status] || [];
}

function normalizePhotos(data) {
  const rawPhotos = data.photos || data.photoUrls || (data.thumbnailUrl ? [data.thumbnailUrl] : []);
  return Array.isArray(rawPhotos)
    ? rawPhotos.map((p) => (typeof p === 'string' ? { url: p } : p))
    : [];
}

function formIdentity(data) {
  return {
    id: data.id || data.formId,
    formId: data.formId || data.id,
    formNo: data.formNo || data.id || data.formId,
    name: data.name || data.productName || 'Sản phẩm ký gửi',
    productName: data.productName || data.name || 'Sản phẩm ký gửi',
  };
}

function normalizeRatePercent(value) {
  if (value == null || value === '') return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num <= 1 ? Number((num * 100).toPrecision(15)) : num;
}

function normalizeConsignmentConfig(data) {
  const cfg = data?.consignmentConfig || {};
  const receipt = data?.receipt || {};
  const termLengthDays = cfg.termLengthDays ?? data?.termLengthDays ?? receipt.termLengthDays ?? null;
  const maxRenewals = cfg.maxRenewals ?? data?.maxRenewals ?? receipt.maxRenewals ?? null;
  const freeWithdrawalWindowDays =
    cfg.freeWithdrawalWindowDays ?? data?.freeWithdrawalWindowDays ?? receipt.freeWithdrawalWindowDays ?? null;
  const floorPricePercent = normalizeRatePercent(
    cfg.floorPriceRatio ?? data?.floorPriceRatio ?? cfg.floorPricePercent ?? data?.floorPricePercent,
  );
  const commissionTerm1 = normalizeRatePercent(
    cfg.commissionRateTerm1 ?? data?.commissionRateTerm1 ?? receipt.commissionRateTerm1 ?? cfg.commissionTerm1,
  );
  const commissionTerm2 = normalizeRatePercent(
    cfg.commissionRateTerm2 ?? data?.commissionRateTerm2 ?? receipt.commissionRateTerm2 ?? cfg.commissionTerm2,
  );
  const commissionTerm3 = normalizeRatePercent(
    cfg.commissionRateTerm3 ?? data?.commissionRateTerm3 ?? receipt.commissionRateTerm3 ?? cfg.commissionTerm3,
  );

  if (
    termLengthDays == null &&
    maxRenewals == null &&
    freeWithdrawalWindowDays == null &&
    floorPricePercent == null &&
    commissionTerm1 == null &&
    commissionTerm2 == null &&
    commissionTerm3 == null
  ) {
    return null;
  }

  return {
    ...(termLengthDays != null ? { termLengthDays: Number(termLengthDays) } : {}),
    ...(maxRenewals != null ? { maxRenewals: Number(maxRenewals) } : {}),
    ...(freeWithdrawalWindowDays != null ? { freeWithdrawalWindowDays: Number(freeWithdrawalWindowDays) } : {}),
    ...(floorPricePercent != null ? { floorPricePercent } : {}),
    ...(commissionTerm1 != null ? { commissionTerm1 } : {}),
    ...(commissionTerm2 != null ? { commissionTerm2 } : {}),
    ...(commissionTerm3 != null ? { commissionTerm3 } : {}),
  };
}

function formTerms(data) {
  const receiptObj = data.receipt || null;
  const isReceiptVoided =
    (receiptObj?.status === 'VOIDED' || Boolean(receiptObj?.voidedAt)) &&
    !receiptObj?.replacedByReceiptId;
  const activeReceiptId = isReceiptVoided
    ? receiptObj?.replacedByReceiptId || null
    : data.receiptId || receiptObj?.id || null;
  return {
    desiredPrice: Number(data.desiredPrice || 0),
    bringDeadline: data.bringInDeadline || data.bringDeadline || null,
    rejectReason: data.rejectReason || null,
    receiptId: activeReceiptId,
    receiptConfirmed: Boolean(!isReceiptVoided && (data.receiptConfirmed || data.confirmedAt || receiptObj?.confirmedAt)),
    category: data.category?.name || data.category || data.categoryName || '',
    categoryName: data.categoryName || data.category?.name || data.category || '',
    brand: data.brand?.name || data.brand || data.brandName || '',
    brandName: data.brandName || data.brand?.name || data.brand || '',
    size: data.size || '',
    condition: data.condition || data.itemCondition || '',
    memberId: data.memberId || data.member?.id || data.member?.accountId || data.member?.memberId || null,
    member: data.member || null,
    consignmentConfig: normalizeConsignmentConfig(data),
  };
}

export function normalizeConsignmentForm(data, currentUserId) {
  if (!data) return null;
  const status = data.status || 'PENDING';
  return {
    ...data,
    ...formIdentity(data),
    status,
    allowedActions: data.allowedActions || defaultActions(status),
    // Backend trả người phụ trách trong moderator (claim hàng đợi hoặc moderator trên biên nhận)
    claimedBy: data.claimedBy ?? data.moderator?.id ?? null,
    productSku: data.productSku || data.product?.sku || data.sku || null,
    photos: normalizePhotos(data),
    ...formTerms(data),
  };
}

export function canCompleteInspection({ checklist: checklistObj, totalRequired, price, term, conditionNote }) {
  const checkedCount = Object.values(checklistObj || {}).filter(Boolean).length;
  return (
    checkedCount === totalRequired &&
    validMoney(price) &&
    Boolean(term) &&
    Boolean(conditionNote && String(conditionNote).trim())
  );
}
