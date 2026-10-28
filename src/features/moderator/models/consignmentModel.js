export function validMoney(value) {
  return /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
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
  const rawPhotos = data.photos || data.photoUrls || [];
  return Array.isArray(rawPhotos)
    ? rawPhotos.map((p) => (typeof p === 'string' ? { url: p } : p))
    : [];

}

function formIdentity(data) {
  return {
    id: data.id || data.formId,
    formId: data.formId || data.id,
    name: data.name || data.productName || 'Sản phẩm ký gửi',
    productName: data.productName || data.name || 'Sản phẩm ký gửi',
  };
}

function formTerms(data) {
  return {
    desiredPrice: Number(data.desiredPrice || 0),
    bringDeadline: data.bringInDeadline || data.bringDeadline || null,
    rejectReason: data.rejectReason || null,
    receiptId: data.receiptId || null,
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
    claimedBy: data.claimedBy ?? currentUserId ?? null,
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
