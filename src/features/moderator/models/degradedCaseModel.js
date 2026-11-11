export const DEGRADED_DECISION_POLICY = 'Hạn chọn 30 ngày. Nhắc mỗi 7 ngày trong thời hạn chọn phương án. Quá hạn chưa chọn, hệ thống chuyển hàng sang vô thừa nhận, không phát sinh bồi thường.';

export function degradedCaseLabel(item) {
  switch (item?.decision) {
    case 'UNCLAIMED': return 'Vô thừa nhận';
    case 'FULL_COMPENSATION': return 'Đã chọn nhận đền đủ';
    case 'PARTIAL_WITH_ITEM_BACK': return 'Đã chọn đền một phần + nhận lại';
    default: return item?.status === 'DECIDED' ? 'Chưa có kết quả quyết định' : 'Chờ Member chọn';
  }
}

export function partialCompensation(item) {
  if (item?.compensationAmount != null && item?.degradedCompensationRate != null) {
    return Number(item.compensationAmount) * Number(item.degradedCompensationRate);
  }
  return item?.halfCompensationAmount ?? null;
}

// A return resolution opens its case in the same transaction. Allow timestamp precision
// differences of at most one second; never reuse an older case for the same product.
export function latestDegradedCase(cases, productId, notBefore) {
  if (!productId) return null;
  const cutoff = notBefore ? Date.parse(notBefore) - 1000 : -Infinity;
  if (Number.isNaN(cutoff)) return null;
  return (cases || [])
    .filter(item => item.productId === productId &&
      (!notBefore || Date.parse(item.receivedAt || item.createdAt) >= cutoff))
    .sort((a, b) => (Date.parse(b.receivedAt || b.createdAt) || 0) - (Date.parse(a.receivedAt || a.createdAt) || 0))[0] || null;
}

export function degradedInventoryItem(item) {
  return {
    ...item,
    id: item.id,
    caseId: item.id,
    sku: item.productId,
    name: item.productName || 'Sản phẩm ký gửi',
    degradedDate: item.receivedAt,
    degradedReason: item.moderatorNote || item.reason || 'Chưa có mô tả hư hỏng',
    decisionStatus: item.decision || 'PENDING_DECISION',
    decisionStatusLabel: degradedCaseLabel(item),
  };
}
