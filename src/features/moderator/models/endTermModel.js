export function validatePartnerName(partnerName) {
  if (typeof partnerName !== 'string') {
    return { valid: false, message: 'Tên tổ chức từ thiện phải là chuỗi ký tự.' };
  }
  const trimmed = partnerName.trim();
  if (!trimmed) {
    return { valid: false, message: 'Vui lòng nhập tên tổ chức từ thiện tiếp nhận.' };
  }
  if (trimmed.length > 255) {
    return { valid: false, message: 'Tên tổ chức không được vượt quá 255 ký tự.' };
  }
  return { valid: true, value: trimmed };
}

export function canTransferUnclaimed(product) {
  if (!product) return false;
  const statusMatch = product.status === 'UNCLAIMED';
  const actionAllowed = !product.allowedActions || product.allowedActions.includes('TRANSFER');
  return Boolean(statusMatch && actionAllowed);
}

export function normalizeUnclaimedItem(item) {
  if (!item) return null;
  const sku = item.id || item.sku || '';
  const status = item.status || 'UNCLAIMED';
  return {
    ...item,
    id: sku,
    sku,
    name: item.name || 'Sản phẩm chưa đặt tên',
    shelfLocation: item.shelfLocation || 'Chưa gán vị trí',
    status,
    decision: item.decision || 'UNCLAIMED',
    deadline: item.deadline || null,
    allowedActions: item.allowedActions || (status === 'UNCLAIMED' ? ['TRANSFER'] : []),
  };
}

export function filterUnclaimedItems(items = [], keyword = '') {
  if (!keyword || !keyword.trim()) return items;
  const term = keyword.trim().toLowerCase();
  return items.filter((it) => {
    const sku = String(it.sku || it.id || '').toLowerCase();
    const name = String(it.name || '').toLowerCase();
    const shelf = String(it.shelfLocation || '').toLowerCase();
    return sku.includes(term) || name.includes(term) || shelf.includes(term);
  });
}

export function hasNoEndTermActions(data, { showTransfer, isDonated, receiptId }) {
  if (showTransfer || isDonated || receiptId || data.newReceiptId) return false;
  return !['HANDOVER', 'RE_CONSIGN'].some(action => data.allowedActions?.includes(action));
}
